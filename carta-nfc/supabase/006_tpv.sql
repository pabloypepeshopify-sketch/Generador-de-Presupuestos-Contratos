-- Carta NFC · Modo TPV (idempotente). Requiere 001, 003, 004 y 005.
--   · Cuentas separadas: cobrar una mesa por partes (cada parte, su ticket).
--   · Devoluciones: factura rectificativa (R5 de un ticket, R1 de una factura) por diferencias, serie propia.
--   · Stock por producto: se descuenta al pedir, se agota solo a 0 y se repone si se cancela.
--   · Comandero (pedidos del camarero, también "Barra"), plano de mesas y mover consumo entre mesas.
-- Solo añade columnas opcionales y funciones; fiscal_cobrar mantiene su contrato (ahora admite "lineas").
-- TODO(gestoría): confirmar R1 para devoluciones de facturas completas (R4 si es otro motivo) y
-- que una sola serie "R" para todas las rectificativas es aceptable.

-- ------------------------------------------------------------ columnas ----
alter table fiscal.titulares  add column if not exists serie_rectificativas text not null default 'R'
  check (serie_rectificativas ~ '^[A-Z]{1,3}$');
alter table fiscal.documentos add column if not exists parcial boolean not null default false;
alter table fiscal.documentos add column if not exists motivo text check (length(motivo) <= 200);
create index if not exists documentos_rectifica_idx on fiscal.documentos (rectifica_id) where rectifica_id is not null;
alter table carta.productos   add column if not exists stock int check (stock >= 0);
alter table carta.productos   add column if not exists stock_alerta int check (stock_alerta >= 0);

-- ------------------------------------------------------ líneas a cobrar ----
-- Identificador estable de una línea agrupada (nombre + precio + IVA) para elegir qué se cobra o devuelve.
create or replace function fiscal._clave_linea(p_nombre text, p_precio numeric, p_iva numeric) returns text
language sql immutable set search_path = '' as $$
  select left(md5(p_nombre || '|' || to_char(p_precio, 'FM9999999990.00') || '|' || to_char(p_iva, 'FM990.00')), 12)
$$;

-- Lo que queda por cobrar de unos pedidos: lo consumido menos lo ya cobrado en tickets parciales vigentes.
create or replace function fiscal._pendiente(p_rest uuid, p_pedidos uuid[], p_iva_defecto numeric)
returns table (k text, orden bigint, nombre text, precio numeric, iva numeric, cantidad bigint)
language sql stable security definer set search_path = '' as $$
  with base as (
    select * from fiscal._lineas_cobro(p_pedidos, p_iva_defecto)
  ), cobrado as (
    select l.nombre, l.precio, l.iva, sum(l.cantidad) as cantidad
      from fiscal.documentos dc join fiscal.documento_lineas l on l.documento_id = dc.id
     where dc.restaurante_id = p_rest and dc.parcial and dc.estado = 'emitido'
       and dc.tipo in ('F1', 'F2') and dc.pedido_ids && p_pedidos
     group by 1, 2, 3
  )
  select fiscal._clave_linea(b.nombre, b.precio, b.iva), b.orden, b.nombre, b.precio, b.iva,
         b.cantidad - coalesce(c.cantidad, 0)
    from base b left join cobrado c on c.nombre = b.nombre and c.precio = b.precio and c.iva = b.iva
   order by b.orden
$$;

-- --------------------------------------------------- emisión (común) ----
-- Numera, encadena la huella, guarda documento + líneas + cobros + registro SIF + evento.
-- p_lineas: [{nombre, precio, cantidad, iva}] (cantidades negativas en rectificativas).
create or replace function fiscal._emitir(
  r carta.restaurantes, t fiscal.titulares, p_tipo text, p_serie text, p_mesa_id uuid, p_mesa text,
  p_pedidos uuid[], p_cliente jsonb, p_lineas jsonb, p_pagos jsonb, p_propina numeric, p_dispositivo text,
  p_parcial boolean, p_rectifica fiscal.documentos, p_motivo text)
returns fiscal.documentos
language plpgsql volatile security definer set search_path = '' as $$
declare
  s          fiscal.sistema;
  v_ahora    timestamptz := date_trunc('second', clock_timestamp());
  v_fecha    date;
  v_anio     int;
  v_num      int;
  v_bloq     boolean;
  v_numserie text;
  v_total    numeric(12,2);
  v_base     numeric(12,2);
  v_cuota    numeric(12,2);
  v_desglose jsonb;
  v_prev     fiscal.registros_sif;
  v_fh       text;
  v_huella   text;
  v_qr       text;
  v_doc      fiscal.documentos;
  v_emisor   jsonb;
  v_rect     boolean := p_tipo like 'R%';
begin
  select * into s from fiscal.sistema where id = 1;

  -- Totales por tipo de IVA: base = total/(1+tipo) redondeada; cuota = total - base.
  select coalesce(jsonb_agg(jsonb_build_object('iva', x.iva, 'base', x.base, 'cuota', x.total - x.base, 'total', x.total)
                            order by x.iva desc), '[]'::jsonb),
         coalesce(sum(x.total), 0), coalesce(sum(x.base), 0)
    into v_desglose, v_total, v_base
    from (select (l->>'iva')::numeric as iva,
                 sum((l->>'precio')::numeric * (l->>'cantidad')::int)::numeric(12,2) as total,
                 round(sum((l->>'precio')::numeric * (l->>'cantidad')::int) / (1 + (l->>'iva')::numeric / 100), 2) as base
            from jsonb_array_elements(p_lineas) l group by 1) x;
  v_cuota := v_total - v_base;

  -- Numeración correlativa sin huecos (bloqueo de la serie).
  v_fecha := (v_ahora at time zone r.zona_horaria)::date;
  v_anio := extract(year from v_fecha)::int;
  insert into fiscal.series (restaurante_id, codigo, anio) values (r.id, p_serie, v_anio) on conflict do nothing;
  select ultimo + 1, bloqueada into v_num, v_bloq
    from fiscal.series where restaurante_id = r.id and codigo = p_serie and anio = v_anio for update;
  if v_bloq then raise exception 'serie_bloqueada'; end if;
  update fiscal.series set ultimo = v_num where restaurante_id = r.id and codigo = p_serie and anio = v_anio;
  v_numserie := p_serie || v_anio || '-' || lpad(v_num::text, 6, '0');

  -- Registro SIF: huella encadenada al último registro de este NIF y entorno.
  perform pg_advisory_xact_lock(hashtext('fiscal.sif:' || t.nif || ':' || t.entorno_aeat));
  select * into v_prev from fiscal.registros_sif
   where nif_emisor = t.nif and entorno = t.entorno_aeat order by id desc limit 1;
  v_fh := fiscal._fecha_huso(v_ahora, r.zona_horaria);
  v_huella := fiscal._huella_alta(t.nif, v_numserie, fiscal._fecha(v_fecha), p_tipo,
                                  fiscal._importe(v_cuota), fiscal._importe(v_total), v_prev.huella, v_fh);
  v_qr := fiscal._qr_url(t.entorno_aeat, t.modo_sif, t.nif, v_numserie, fiscal._fecha(v_fecha), fiscal._importe(v_total));

  v_emisor := jsonb_build_object('nif', t.nif, 'razon_social', t.razon_social, 'nombre_comercial', t.nombre_comercial,
                                 'domicilio', t.domicilio, 'codigo_postal', t.codigo_postal, 'municipio', t.municipio,
                                 'provincia', t.provincia);
  insert into fiscal.documentos (restaurante_id, tipo, serie, anio, numero, num_serie, fecha_expedicion, expedido,
                                 mesa_id, mesa_nombre, pedido_ids, emisor, cliente, desglose, base_total, cuota_total,
                                 total, propina, pagos, rectifica_id, sif_modo, sif_entorno, huella, qr_url, parcial, motivo)
  values (r.id, p_tipo, p_serie, v_anio, v_num, v_numserie, v_fecha, v_ahora,
          p_mesa_id, p_mesa, coalesce(p_pedidos, '{}'), v_emisor, p_cliente, v_desglose, v_base, v_cuota,
          v_total, coalesce(p_propina, 0), p_pagos, p_rectifica.id, t.modo_sif, t.entorno_aeat, v_huella, v_qr,
          coalesce(p_parcial, false), nullif(left(trim(coalesce(p_motivo, '')), 200), ''))
  returning * into v_doc;

  insert into fiscal.documento_lineas (documento_id, orden, nombre, cantidad, precio, importe, iva, base, cuota)
  select v_doc.id, o.n, o.l->>'nombre', (o.l->>'cantidad')::int, (o.l->>'precio')::numeric,
         (o.l->>'precio')::numeric * (o.l->>'cantidad')::int, (o.l->>'iva')::numeric,
         round((o.l->>'precio')::numeric * (o.l->>'cantidad')::int / (1 + (o.l->>'iva')::numeric / 100), 2),
         (o.l->>'precio')::numeric * (o.l->>'cantidad')::int
           - round((o.l->>'precio')::numeric * (o.l->>'cantidad')::int / (1 + (o.l->>'iva')::numeric / 100), 2)
    from jsonb_array_elements(p_lineas) with ordinality o(l, n);

  -- Caja: cobros (las devoluciones quedan en los pagos del documento rectificativo, en negativo).
  insert into fiscal.cobros (restaurante_id, documento_id, forma, importe, entregado, cambio, dispositivo)
  select r.id, v_doc.id, x->>'forma', (x->>'importe')::numeric, (x->>'entregado')::numeric, (x->>'cambio')::numeric,
         left(p_dispositivo, 80)
    from jsonb_array_elements(p_pagos) x where (x->>'importe')::numeric > 0;

  insert into fiscal.registros_sif (restaurante_id, documento_id, tipo_registro, nif_emisor, entorno, num_serie,
                                    fecha_expedicion, tipo_factura, cuota_total, importe_total, fecha_hora_huso,
                                    huella_anterior, huella, anterior_id, contenido, estado_envio)
  values (r.id, v_doc.id, 'alta', t.nif, t.entorno_aeat, v_numserie, v_fecha, p_tipo, v_cuota, v_total, v_fh,
          v_prev.huella, v_huella, v_prev.id,
          jsonb_strip_nulls(jsonb_build_object(
            'IDVersion', '1.0',
            'IDFactura', jsonb_build_object('IDEmisorFactura', t.nif, 'NumSerieFactura', v_numserie,
                                            'FechaExpedicionFactura', fiscal._fecha(v_fecha)),
            'NombreRazonEmisor', left(t.razon_social, 120),
            'TipoFactura', p_tipo,
            'TipoRectificativa', case when v_rect then 'I' end,
            'FacturasRectificadas', case when v_rect then jsonb_build_array(jsonb_build_object(
                                      'IDEmisorFactura', t.nif, 'NumSerieFactura', p_rectifica.num_serie,
                                      'FechaExpedicionFactura', fiscal._fecha(p_rectifica.fecha_expedicion))) end,
            'DescripcionOperacion', case when v_rect then left('Rectificación: ' || coalesce(nullif(trim(p_motivo), ''), 'devolución'), 500)
                                         else 'Servicio de restauración' end,
            'FacturaSinIdentifDestinatarioArt61d', case when p_tipo in ('F2', 'R5') then 'S' end,
            'Destinatarios', case when p_cliente is not null then jsonb_build_array(jsonb_build_object(
                               'NombreRazon', p_cliente->>'nombre', 'NIF', p_cliente->>'nif')) end,
            'Desglose', (select jsonb_agg(jsonb_build_object(
                           'Impuesto', '01', 'ClaveRegimen', '01', 'CalificacionOperacion', 'S1',
                           'TipoImpositivo', to_char((x->>'iva')::numeric, 'FM990.00'),
                           'BaseImponibleOimporteNoSujeto', fiscal._importe((x->>'base')::numeric),
                           'CuotaRepercutida', fiscal._importe((x->>'cuota')::numeric)))
                         from jsonb_array_elements(v_desglose) x),
            'CuotaTotal', fiscal._importe(v_cuota),
            'ImporteTotal', fiscal._importe(v_total),
            'Encadenamiento', case when v_prev.id is null then jsonb_build_object('PrimerRegistro', 'S')
                              else jsonb_build_object('RegistroAnterior', jsonb_build_object(
                                'IDEmisorFactura', v_prev.nif_emisor, 'NumSerieFactura', v_prev.num_serie,
                                'FechaExpedicionFactura', fiscal._fecha(v_prev.fecha_expedicion), 'Huella', v_prev.huella)) end,
            'SistemaInformatico', jsonb_build_object(
              'NombreRazon', s.productor_nombre, 'NIF', s.productor_nif, 'NombreSistemaInformatico', s.nombre_sistema,
              'IdSistemaInformatico', s.id_sistema, 'Version', s.version, 'NumeroInstalacion', s.numero_instalacion,
              'TipoUsoPosibleSoloVerifactu', 'S', 'TipoUsoPosibleMultiOT', 'S', 'IndicadorMultiplesOT', 'S'),
            'FechaHoraHusoGenRegistro', v_fh,
            'TipoHuella', '01',
            'Huella', v_huella)),
          case when t.modo_sif = 'verifactu' then 'pendiente' else 'no_aplica' end);

  insert into fiscal.eventos_sif (restaurante_id, tipo, detalle)
  values (r.id, 'alta_registro', jsonb_strip_nulls(jsonb_build_object(
            'num_serie', v_numserie, 'tipo', p_tipo, 'total', v_total, 'entorno', t.entorno_aeat,
            'parcial', nullif(p_parcial, false), 'rectifica', p_rectifica.num_serie, 'motivo', p_motivo,
            'dispositivo', left(p_dispositivo, 80))));
  return v_doc;
end $$;

-- Pagos del cliente: [{forma, importe, entregado?}] → jsonb normalizado; la suma debe ser p_total.
create or replace function fiscal._pagos(p_pagos jsonb, p_total numeric) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  v_pagos jsonb := '[]'::jsonb;
  v_suma  numeric(12,2) := 0;
  pg      jsonb;
  v_imp   numeric(12,2);
  v_ent   numeric(12,2);
begin
  if coalesce(jsonb_typeof(p_pagos), '') <> 'array' or jsonb_array_length(p_pagos) = 0 or jsonb_array_length(p_pagos) > 4 then
    raise exception 'pagos_no_validos';
  end if;
  for pg in select value from jsonb_array_elements(p_pagos) loop
    if coalesce(pg->>'forma', '') not in ('efectivo', 'tarjeta', 'bizum', 'otro')
       or coalesce(pg->>'importe', '') !~ '^[0-9]{1,6}([.][0-9]{1,2})?$' or (pg->>'importe')::numeric <= 0 then
      raise exception 'pagos_no_validos';
    end if;
    v_imp := (pg->>'importe')::numeric;
    v_ent := null;
    if pg->>'forma' = 'efectivo' and nullif(pg->>'entregado', '') is not null then
      if pg->>'entregado' !~ '^[0-9]{1,6}([.][0-9]{1,2})?$' or (pg->>'entregado')::numeric < v_imp then
        raise exception 'entregado_insuficiente';
      end if;
      v_ent := (pg->>'entregado')::numeric;
    end if;
    v_suma := v_suma + v_imp;
    v_pagos := v_pagos || jsonb_build_object('forma', pg->>'forma', 'importe', v_imp, 'entregado', v_ent,
                                             'cambio', case when v_ent is not null then v_ent - v_imp end);
  end loop;
  if v_suma <> p_total then raise exception 'pagos_no_cuadran'; end if;
  return v_pagos;
end $$;

-- Selección de líneas [{k, cantidad}] contra lo disponible → [{nombre, precio, iva, cantidad × signo}].
create or replace function fiscal._seleccion(p_sel jsonb, p_disp jsonb, p_signo int) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  it    jsonb;
  v_res jsonb;
begin
  if coalesce(jsonb_typeof(p_sel), '') <> 'array' or jsonb_array_length(p_sel) = 0 or jsonb_array_length(p_sel) > 80 then
    raise exception 'lineas_no_validas';
  end if;
  for it in select value from jsonb_array_elements(p_sel) loop
    if coalesce(it->>'k', '') !~ '^[0-9a-f]{12}$' or coalesce(it->>'cantidad', '') !~ '^[0-9]{1,3}$' or (it->>'cantidad')::int <= 0 then
      raise exception 'lineas_no_validas';
    end if;
  end loop;
  if exists (select 1 from (select x->>'k' as k, sum((x->>'cantidad')::int) as c from jsonb_array_elements(p_sel) x group by 1) s
              left join jsonb_array_elements(p_disp) d on d->>'k' = s.k
             where d is null or s.c > (d->>'cantidad')::int) then
    raise exception 'cantidad_supera_pendiente';
  end if;
  select jsonb_agg(jsonb_build_object('nombre', d->>'nombre', 'precio', (d->>'precio')::numeric, 'iva', (d->>'iva')::numeric,
                                      'cantidad', p_signo * s.c) order by (d->>'orden')::bigint)
    into v_res
    from (select x->>'k' as k, sum((x->>'cantidad')::int) as c from jsonb_array_elements(p_sel) x group by 1) s
    join jsonb_array_elements(p_disp) d on d->>'k' = s.k;
  return v_res;
end $$;

-- Documento con los datos de la rectificación y si es una parte de la cuenta.
create or replace function fiscal._documento_json(p fiscal.documentos) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'token', p.token, 'tipo', p.tipo, 'num_serie', p.num_serie, 'estado', p.estado,
    'fecha_expedicion', p.fecha_expedicion, 'expedido', p.expedido,
    'mesa', p.mesa_nombre, 'emisor', p.emisor, 'cliente', p.cliente,
    'lineas', coalesce((select jsonb_agg(jsonb_build_object(
                 'k', fiscal._clave_linea(l.nombre, l.precio, l.iva),
                 'nombre', l.nombre, 'cantidad', l.cantidad, 'precio', l.precio, 'importe', l.importe, 'iva', l.iva)
               order by l.orden) from fiscal.documento_lineas l where l.documento_id = p.id), '[]'::jsonb),
    'desglose', p.desglose, 'base_total', p.base_total, 'cuota_total', p.cuota_total, 'total', p.total,
    'propina', p.propina, 'pagos', p.pagos, 'parcial', p.parcial, 'motivo', p.motivo,
    'rectifica', (select jsonb_build_object('num_serie', o.num_serie, 'fecha_expedicion', o.fecha_expedicion)
                    from fiscal.documentos o where o.id = p.rectifica_id),
    'rectificaciones', (select jsonb_agg(jsonb_build_object('num_serie', x.num_serie, 'total', x.total, 'token', x.token) order by x.expedido)
                          from fiscal.documentos x where x.rectifica_id = p.id),
    'sif', jsonb_build_object('modo', p.sif_modo, 'entorno', p.sif_entorno, 'huella', p.huella, 'qr_url', p.qr_url,
                              'leyenda', case when p.sif_modo = 'verifactu' then 'VERI*FACTU' end),
    'pie', (select t.pie_ticket from fiscal.titulares t where t.restaurante_id = p.restaurante_id))
$$;

revoke all on all functions in schema fiscal from public, anon, authenticated;

-- ----------------------------------------------------------------- API ----

-- Cobrar una mesa: todo lo pendiente o, con "lineas" [{k, cantidad}], solo una parte (cuentas separadas).
-- La mesa se cierra cuando no queda nada por cobrar. Devuelve el documento y lo que queda pendiente.
create or replace function public.fiscal_cobrar(p_slug text, p_clave text, p_datos jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r          carta.restaurantes;
  t          fiscal.titulares;
  d          jsonb := coalesce(p_datos, '{}'::jsonb);
  v_ids      uuid[];
  v_fact     uuid[];
  v_n        int;
  v_mesa_id  uuid;
  v_mesa     text;
  v_cliente  jsonb;
  v_tipo     text;
  v_serie    text;
  v_total    numeric(12,2);
  v_propina  numeric(12,2);
  v_disp     jsonb;
  v_lineas   jsonb;
  v_parcial  boolean;
  v_doc      fiscal.documentos;
  v_queda    numeric(12,2);
begin
  r := carta._auth(p_slug, p_clave, 'cocina');
  select * into t from fiscal.titulares where restaurante_id = r.id;
  if not found then raise exception 'titular_sin_datos'; end if;
  if t.modo_sif = 'desactivado' then raise exception 'facturacion_desactivada'; end if;

  -- 1. Pedidos de la mesa: se bloquean para que nadie los cobre dos veces.
  if coalesce(jsonb_typeof(d->'pedido_ids'), '') <> 'array' or jsonb_array_length(d->'pedido_ids') = 0 then
    raise exception 'sin_pedidos';
  end if;
  select array_agg(distinct carta._uuid(x)) into v_ids from jsonb_array_elements_text(d->'pedido_ids') x;
  perform 1 from carta.pedidos where id = any(v_ids) for update;
  select count(*) into v_n from carta.pedidos where id = any(v_ids) and restaurante_id = r.id;
  if v_n <> cardinality(v_ids) then raise exception 'pedido_no_encontrado'; end if;
  if exists (select 1 from carta.pedidos where id = any(v_ids) and cerrado) then raise exception 'pedidos_ya_cobrados'; end if;
  select array_agg(id order by creado) into v_fact
    from carta.pedidos where id = any(v_ids) and tipo = 'pedido' and estado <> 'cancelado';
  if v_fact is null then raise exception 'nada_que_cobrar'; end if;
  select string_agg(distinct mesa_nombre, ', '),
         case when count(distinct mesa_id) = 1 then min(mesa_id::text)::uuid end
    into v_mesa, v_mesa_id
    from carta.pedidos where id = any(v_fact);

  -- 2. Qué se cobra: todo lo pendiente o la selección.
  select coalesce(jsonb_agg(jsonb_build_object('k', p.k, 'orden', p.orden, 'nombre', p.nombre, 'precio', p.precio,
                                               'iva', p.iva, 'cantidad', p.cantidad) order by p.orden), '[]'::jsonb)
    into v_disp from fiscal._pendiente(r.id, v_fact, t.iva_defecto) p where p.cantidad > 0;
  v_parcial := exists (select 1 from fiscal.documentos dc
                        where dc.restaurante_id = r.id and dc.parcial and dc.estado = 'emitido' and dc.pedido_ids && v_fact);
  if d ? 'lineas' and d->'lineas' <> 'null'::jsonb then
    v_lineas := fiscal._seleccion(d->'lineas', v_disp, 1);
    v_parcial := true;
  else
    select jsonb_agg(x - 'k' - 'orden') into v_lineas from jsonb_array_elements(v_disp) x;
  end if;
  if v_lineas is null then raise exception 'nada_que_cobrar'; end if;
  select coalesce(sum((l->>'precio')::numeric * (l->>'cantidad')::int), 0) into v_total from jsonb_array_elements(v_lineas) l;
  if v_total <= 0 then raise exception 'importe_no_valido'; end if;

  -- 3. Ticket (F2) o factura completa (F1) si el cliente da su NIF.
  if nullif(trim(coalesce(d->'cliente'->>'nif', '')), '') is not null then
    if not fiscal._nif_valido(d->'cliente'->>'nif') then raise exception 'nif_cliente_no_valido'; end if;
    if length(trim(coalesce(d->'cliente'->>'nombre', ''))) = 0 or length(trim(coalesce(d->'cliente'->>'domicilio', ''))) = 0 then
      raise exception 'cliente_incompleto';
    end if;
    v_cliente := jsonb_build_object('nif', fiscal._nif_norm(d->'cliente'->>'nif'),
                                    'nombre', left(trim(d->'cliente'->>'nombre'), 120),
                                    'domicilio', left(trim(d->'cliente'->>'domicilio'), 200));
    v_tipo := 'F1'; v_serie := t.serie_facturas;
  else
    if v_total > t.limite_simplificada then raise exception 'importe_supera_limite_simplificada'; end if;
    v_tipo := 'F2'; v_serie := t.serie_tickets;
  end if;

  -- 4. Cobros: la suma de pagos debe ser total + propina (la propina va fuera del ticket).
  if coalesce(d->>'propina', '0') !~ '^[0-9]{1,4}([.][0-9]{1,2})?$' then raise exception 'propina_no_valida'; end if;
  v_propina := coalesce((d->>'propina')::numeric, 0);

  v_doc := fiscal._emitir(r, t, v_tipo, v_serie, v_mesa_id, v_mesa, v_fact, v_cliente, v_lineas,
                          fiscal._pagos(d->'pagos', v_total + v_propina), v_propina, d->>'dispositivo',
                          v_parcial, null::fiscal.documentos, null);

  -- 5. La mesa queda cobrada y libre cuando ya no queda nada pendiente.
  select coalesce(sum(p.precio * p.cantidad), 0) into v_queda
    from fiscal._pendiente(r.id, v_fact, t.iva_defecto) p where p.cantidad > 0;
  if not v_parcial then v_queda := 0; end if;
  if v_queda = 0 then
    update carta.pedidos set cerrado = true, actualizado = now() where id = any(v_ids);
  end if;
  return fiscal._documento_json(v_doc) || jsonb_build_object('pendiente', v_queda);
end $$;

-- Lo que queda por cobrar de una mesa (para cuentas separadas) y las partes ya cobradas.
create or replace function public.fiscal_pendiente(p_slug text, p_clave text, p_pedido_ids jsonb)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r      carta.restaurantes;
  t      fiscal.titulares;
  v_fact uuid[];
begin
  r := carta._auth(p_slug, p_clave, 'cocina');
  select * into t from fiscal.titulares where restaurante_id = r.id;
  if not found then raise exception 'titular_sin_datos'; end if;
  if coalesce(jsonb_typeof(p_pedido_ids), '') <> 'array' or jsonb_array_length(p_pedido_ids) > 200 then
    raise exception 'sin_pedidos';
  end if;
  select array_agg(p.id order by p.creado) into v_fact
    from carta.pedidos p
   where p.restaurante_id = r.id and not p.cerrado and p.tipo = 'pedido' and p.estado <> 'cancelado'
     and p.id in (select carta._uuid(x) from jsonb_array_elements_text(p_pedido_ids) x);
  if v_fact is null then
    return jsonb_build_object('lineas', '[]'::jsonb, 'pendiente', 0, 'cobrado', 0, 'partes', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'lineas', coalesce((select jsonb_agg(jsonb_build_object('k', p.k, 'nombre', p.nombre, 'precio', p.precio, 'iva', p.iva,
                                                            'cantidad', p.cantidad) order by p.orden)
                          from fiscal._pendiente(r.id, v_fact, t.iva_defecto) p where p.cantidad > 0), '[]'::jsonb),
    'pendiente', (select coalesce(sum(p.precio * p.cantidad), 0) from fiscal._pendiente(r.id, v_fact, t.iva_defecto) p where p.cantidad > 0),
    'cobrado', (select coalesce(sum(dc.total), 0) from fiscal.documentos dc
                 where dc.restaurante_id = r.id and dc.parcial and dc.estado = 'emitido' and dc.pedido_ids && v_fact),
    'partes', coalesce((select jsonb_agg(jsonb_build_object('num_serie', dc.num_serie, 'total', dc.total, 'token', dc.token) order by dc.expedido)
                          from fiscal.documentos dc
                         where dc.restaurante_id = r.id and dc.parcial and dc.estado = 'emitido' and dc.pedido_ids && v_fact), '[]'::jsonb));
end $$;

-- Devolución / corrección: factura rectificativa por diferencias (importes en negativo) de todo o parte
-- de un ticket o factura. Con "reabrir", la mesa vuelve al panel para cobrarla de nuevo (solo si se rectifica todo).
create or replace function public.fiscal_rectificar(p_slug text, p_clave text, p_datos jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r        carta.restaurantes;
  t        fiscal.titulares;
  d        jsonb := coalesce(p_datos, '{}'::jsonb);
  o        fiscal.documentos;
  v_disp   jsonb;
  v_lineas jsonb;
  v_total  numeric(12,2);
  v_forma  text;
  v_tipo   text;
  v_doc    fiscal.documentos;
  v_resto  int;
begin
  r := carta._auth(p_slug, p_clave, 'cocina');
  select * into t from fiscal.titulares where restaurante_id = r.id;
  if not found then raise exception 'titular_sin_datos'; end if;
  if t.modo_sif = 'desactivado' then raise exception 'facturacion_desactivada'; end if;
  if coalesce(d->>'token', '') !~ '^[0-9a-f]{32}$' then raise exception 'documento_no_encontrado'; end if;
  select * into o from fiscal.documentos where token = d->>'token' and restaurante_id = r.id for update;
  if not found then raise exception 'documento_no_encontrado'; end if;
  if o.tipo not in ('F1', 'F2') or o.estado not in ('emitido', 'rectificado') then raise exception 'no_rectificable'; end if;
  if exists (select 1 from carta.pedidos where id = any(o.pedido_ids) and not cerrado) then raise exception 'mesa_sin_cerrar'; end if;
  if t.serie_rectificativas in (t.serie_tickets, t.serie_facturas) then raise exception 'serie_rectificativas_repetida'; end if;

  -- Lo que aún se puede devolver: líneas del original menos lo ya rectificado.
  select coalesce(jsonb_agg(jsonb_build_object('k', fiscal._clave_linea(l.nombre, l.precio, l.iva), 'orden', l.orden,
                                               'nombre', l.nombre, 'precio', l.precio, 'iva', l.iva,
                                               'cantidad', l.cantidad - coalesce(x.c, 0)) order by l.orden), '[]'::jsonb)
    into v_disp
    from fiscal.documento_lineas l
    left join (select rl.nombre, rl.precio, rl.iva, -sum(rl.cantidad) as c
                 from fiscal.documentos rd join fiscal.documento_lineas rl on rl.documento_id = rd.id
                where rd.rectifica_id = o.id and rd.estado <> 'anulado'
                group by 1, 2, 3) x on x.nombre = l.nombre and x.precio = l.precio and x.iva = l.iva
   where l.documento_id = o.id and l.cantidad - coalesce(x.c, 0) > 0;
  if jsonb_array_length(v_disp) = 0 then raise exception 'nada_que_rectificar'; end if;

  if d ? 'lineas' and d->'lineas' <> 'null'::jsonb then
    v_lineas := fiscal._seleccion(d->'lineas', v_disp, -1);
  else
    select jsonb_agg(jsonb_set(x - 'k' - 'orden', '{cantidad}', to_jsonb(-(x->>'cantidad')::int))) into v_lineas
      from jsonb_array_elements(v_disp) x;
  end if;
  select sum((l->>'precio')::numeric * (l->>'cantidad')::int) into v_total from jsonb_array_elements(v_lineas) l;

  v_forma := coalesce(nullif(d->>'forma', ''), o.pagos->0->>'forma', 'efectivo');
  if v_forma not in ('efectivo', 'tarjeta', 'bizum', 'otro') then raise exception 'pagos_no_validos'; end if;
  v_tipo := case o.tipo when 'F2' then 'R5' else 'R1' end;

  v_doc := fiscal._emitir(r, t, v_tipo, t.serie_rectificativas, o.mesa_id, o.mesa_nombre, o.pedido_ids, o.cliente,
                          v_lineas, jsonb_build_array(jsonb_build_object('forma', v_forma, 'importe', v_total)), 0,
                          d->>'dispositivo', false, o, coalesce(nullif(trim(d->>'motivo'), ''), 'Devolución'));
  update fiscal.documentos set estado = 'rectificado' where id = o.id;

  -- Reabrir la mesa (para volver a cobrarla bien): solo si ya no queda nada del original por devolver.
  if coalesce((d->>'reabrir')::boolean, false) then
    select coalesce(sum((x->>'cantidad')::int), 0) - coalesce((select sum(-(l->>'cantidad')::int) from jsonb_array_elements(v_lineas) l), 0)
      into v_resto from jsonb_array_elements(v_disp) x;
    if v_resto > 0 then raise exception 'reabrir_solo_total'; end if;
    update carta.pedidos set cerrado = false, actualizado = now()
     where id = any(o.pedido_ids) and restaurante_id = r.id and tipo = 'pedido' and estado <> 'cancelado';
  end if;
  return fiscal._documento_json(v_doc);
end $$;

-- ------------------------------------------------------------- stock ----
-- Al pedir: si el producto lleva stock, se descuenta; a 0 queda agotado; sin bastante stock, no se pide.
create or replace function carta._stock_pedido() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_ok     boolean;
  v_nombre text;
begin
  if new.producto_id is null then return new; end if;
  update carta.productos set stock = stock - new.cantidad, disponible = disponible and stock - new.cantidad > 0
   where id = new.producto_id and stock is not null and stock >= new.cantidad
  returning true into v_ok;
  if v_ok is null then
    select nombre into v_nombre from carta.productos where id = new.producto_id and stock is not null;
    if found then raise exception 'producto_agotado:%', v_nombre; end if;
  end if;
  return new;
end $$;

-- Pedido cancelado: se devuelve el stock (y vuelve a estar disponible si estaba a 0).
create or replace function carta._stock_cancelado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    update carta.productos p
       set stock = p.stock + x.c, disponible = case when p.stock = 0 then true else p.disponible end
      from (select producto_id, sum(cantidad) as c from carta.pedido_lineas
             where pedido_id = new.id and producto_id is not null group by 1) x
     where p.id = x.producto_id and p.stock is not null;
  exception when others then
    null;  -- reponer stock nunca debe impedir cancelar un pedido
  end;
  return null;
end $$;
revoke all on function carta._stock_pedido() from public, anon, authenticated;
revoke all on function carta._stock_cancelado() from public, anon, authenticated;

create or replace trigger pedido_lineas_stock
  before insert on carta.pedido_lineas
  for each row execute function carta._stock_pedido();
create or replace trigger pedidos_stock_cancelado
  after update of estado on carta.pedidos
  for each row when (new.estado = 'cancelado' and old.estado is distinct from 'cancelado')
  execute function carta._stock_cancelado();

-- ----------------------------------------------- comandero, mesas y stock ----
-- carta_tpv(slug, clave de cocina o admin, acción, datos):
--   datos    → mesas, carta (con stock) y productos con stock bajo
--   comandar → {mesa_id | null = Barra, lineas: [{producto_id, cantidad, nota}], nota, servido}
--   mover    → {ids: [pedidos], mesa_id}  (cambiar de mesa o juntar mesas)
--   stock    → {id, stock: n | null (sin control), alerta: n | null}
--   sumar    → {id, n}  (entrada de género o merma)
create or replace function public.carta_tpv(p_slug text, p_clave text, p_accion text default 'datos', p_datos jsonb default '{}')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r      carta.restaurantes;
  d      jsonb := coalesce(p_datos, '{}'::jsonb);
  m      carta.mesas;
  v      carta.pedidos;
  prod   carta.productos;
  l      jsonb;
  v_cant int;
  v_tot  numeric(10,2) := 0;
  v_n    int;
  v_extra jsonb := '{}'::jsonb;
begin
  r := carta._auth(p_slug, p_clave, 'cocina');

  case coalesce(p_accion, 'datos')
    when 'datos' then
      null;

    when 'comandar' then
      if nullif(d->>'mesa_id', '') is null then
        m.id := null; m.nombre := 'Barra';
      else
        select * into m from carta.mesas where id = carta._uuid(d->>'mesa_id') and restaurante_id = r.id and activa;
        if not found then raise exception 'mesa_no_valida'; end if;
      end if;
      if coalesce(jsonb_typeof(d->'lineas'), '') <> 'array' or jsonb_array_length(d->'lineas') = 0 then raise exception 'pedido_vacio'; end if;
      if jsonb_array_length(d->'lineas') > 60 then raise exception 'pedido_demasiado_grande'; end if;
      if length(coalesce(d->>'nota', '')) > 300 then raise exception 'nota_demasiado_larga'; end if;
      v := carta._nuevo_pedido(r, m, 'pedido', d->>'nota');
      for l in select value from jsonb_array_elements(d->'lineas') loop
        if jsonb_typeof(l) <> 'object' or coalesce(l->>'cantidad', '') !~ '^[0-9]{1,2}$' then raise exception 'cantidad_no_valida'; end if;
        v_cant := (l->>'cantidad')::int;
        if v_cant not between 1 and 50 then raise exception 'cantidad_no_valida'; end if;
        if length(coalesce(l->>'nota', '')) > 140 then raise exception 'nota_demasiado_larga'; end if;
        select x.* into prod from carta.productos x
         where x.id = carta._uuid(l->>'producto_id') and x.restaurante_id = r.id;
        if not found then raise exception 'producto_no_valido'; end if;
        if not prod.disponible then raise exception 'producto_agotado:%', prod.nombre; end if;
        insert into carta.pedido_lineas (pedido_id, producto_id, nombre, precio, cantidad, nota)
        values (v.id, prod.id, prod.nombre, prod.precio, v_cant, nullif(trim(l->>'nota'), ''));
        v_tot := v_tot + prod.precio * v_cant;
      end loop;
      update carta.pedidos set total = v_tot,
             estado = case when coalesce((d->>'servido')::boolean, false) then 'servido' else estado end
       where id = v.id returning * into v;
      v_extra := jsonb_build_object('pedido', carta._pedido_json(v));

    when 'mover' then
      select * into m from carta.mesas where id = carta._uuid(d->>'mesa_id') and restaurante_id = r.id and activa;
      if not found then raise exception 'mesa_no_valida'; end if;
      if coalesce(jsonb_typeof(d->'ids'), '') <> 'array' or jsonb_array_length(d->'ids') = 0 then raise exception 'ids_no_validos'; end if;
      update carta.pedidos set mesa_id = m.id, mesa_nombre = m.nombre, actualizado = now()
       where restaurante_id = r.id and not cerrado
         and id in (select carta._uuid(x) from jsonb_array_elements_text(d->'ids') x);
      get diagnostics v_n = row_count;
      if v_n = 0 then raise exception 'pedido_no_encontrado'; end if;
      v_extra := jsonb_build_object('movidos', v_n, 'mesa', m.nombre);

    when 'stock' then
      if coalesce(d->>'stock', '') !~ '^([0-9]{1,5})?$' or coalesce(d->>'alerta', '') !~ '^([0-9]{1,5})?$' then
        raise exception 'stock_no_valido';
      end if;
      update carta.productos
         set stock = nullif(d->>'stock', '')::int, stock_alerta = nullif(d->>'alerta', '')::int,
             disponible = case when nullif(d->>'stock', '') is null then disponible else nullif(d->>'stock', '')::int > 0 end
       where id = carta._uuid(d->>'id') and restaurante_id = r.id;
      if not found then raise exception 'no_encontrado'; end if;

    when 'sumar' then
      if coalesce(d->>'n', '') !~ '^-?[0-9]{1,4}$' then raise exception 'stock_no_valido'; end if;
      update carta.productos
         set stock = greatest(0, stock + (d->>'n')::int), disponible = greatest(0, stock + (d->>'n')::int) > 0
       where id = carta._uuid(d->>'id') and restaurante_id = r.id and stock is not null;
      if not found then raise exception 'no_encontrado'; end if;

    else
      raise exception 'accion_no_valida';
  end case;

  return jsonb_build_object(
    'mesas', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nombre', x.nombre) order by x.orden, x.nombre)
                         from carta.mesas x where x.restaurante_id = r.id and x.activa), '[]'::jsonb),
    'categorias', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'productos', c.lista) order by c.orden, c.nombre)
        from (select c.id, c.nombre, c.orden,
                     (select jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'precio', p.precio, 'disponible', p.disponible,
                                                          'stock', p.stock, 'alerta', p.stock_alerta) order by p.orden, p.nombre)
                        from carta.productos p where p.categoria_id = c.id) as lista
                from carta.categorias c where c.restaurante_id = r.id and c.activa) c
       where c.lista is not null), '[]'::jsonb)
      || coalesce((select jsonb_build_array(jsonb_build_object('id', null, 'nombre', 'Otros', 'productos',
                            jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'precio', p.precio, 'disponible', p.disponible,
                                                         'stock', p.stock, 'alerta', p.stock_alerta) order by p.orden, p.nombre)))
                     from carta.productos p where p.restaurante_id = r.id and p.categoria_id is null having count(*) > 0), '[]'::jsonb),
    'stock_bajo', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'stock', p.stock) order by p.stock, p.nombre)
                              from carta.productos p
                             where p.restaurante_id = r.id and p.stock is not null and p.stock <= coalesce(p.stock_alerta, 0)), '[]'::jsonb)
  ) || v_extra;
end $$;

revoke all on function public.fiscal_cobrar(text, text, jsonb)       from public;
revoke all on function public.fiscal_pendiente(text, text, jsonb)    from public;
revoke all on function public.fiscal_rectificar(text, text, jsonb)   from public;
revoke all on function public.carta_tpv(text, text, text, jsonb)     from public;
grant execute on function public.fiscal_cobrar(text, text, jsonb)     to anon, authenticated;
grant execute on function public.fiscal_pendiente(text, text, jsonb)  to anon, authenticated;
grant execute on function public.fiscal_rectificar(text, text, jsonb) to anon, authenticated;
grant execute on function public.carta_tpv(text, text, text, jsonb)   to anon, authenticated;
