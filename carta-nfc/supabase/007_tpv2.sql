-- Carta NFC · TPV, segunda parte (idempotente). Requiere 001, 003, 004, 005 y 006.
--   · Caja: apertura con fondo, entradas/salidas de efectivo, arqueo y cierre con descuadre (turnos inmutables).
--   · Corregir un pedido abierto: quitar una unidad, quitar la línea o invitar.
--   · Descuento al cobrar (% o importe), repartido por tipo de IVA en líneas negativas del ticket.
--   · "Varios": líneas libres desde el comandero (lo que no está en la carta), con su IVA.
--   · Factura de un ticket ya cobrado: factura completa F3 que sustituye al ticket F2 (sin volver a cobrar).
--   · Mesa toda invitada: se cierra sin ticket (no hay venta que documentar).
-- Solo añade columnas opcionales, tablas nuevas y funciones; los contratos de las RPC existentes se mantienen.
-- TODO(gestoría): confirmar F3 (con FacturasSustituidas) para "hazme factura de este ticket", que F3 comparta
-- la serie de facturas y que el descuento como líneas negativas por tipo de IVA es aceptable.

-- ------------------------------------------------------------ columnas ----
alter table carta.pedido_lineas add column if not exists iva numeric(5,2) check (iva in (4, 10, 21));
create index if not exists registros_sif_rest_idx on fiscal.registros_sif (restaurante_id, id);
create index if not exists documentos_sustituye_idx on fiscal.documentos using gin (sustituye_ids) where sustituye_ids is not null;

-- ------------------------------------------------------ líneas a cobrar ----
-- IVA vigente: el de la línea ("Varios") -> producto -> categoría -> titular.
create or replace function fiscal._lineas_cobro(p_pedidos uuid[], p_iva_defecto numeric)
returns table (orden bigint, nombre text, precio numeric, cantidad bigint, iva numeric)
language sql stable security definer set search_path = '' as $$
  select min(pl.id), pl.nombre, pl.precio, sum(pl.cantidad), coalesce(pl.iva, pr.iva, c.iva, p_iva_defecto)
    from carta.pedido_lineas pl
    left join carta.productos pr on pr.id = pl.producto_id
    left join carta.categorias c on c.id = pr.categoria_id
   where pl.pedido_id = any(p_pedidos)
   group by pl.nombre, pl.precio, coalesce(pl.iva, pr.iva, c.iva, p_iva_defecto)
   order by 1
$$;

-- Pedido con el id de cada línea (para corregirla) y su categoría (para filtrar por puesto: cocina, barra…).
create or replace function carta._pedido_json(p carta.pedidos) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'tipo', p.tipo, 'estado', p.estado,
    'mesa_id', p.mesa_id, 'mesa', p.mesa_nombre, 'nota', p.nota, 'total', p.total,
    'cerrado', p.cerrado, 'creado', p.creado, 'actualizado', p.actualizado,
    'lineas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'nombre', l.nombre, 'precio', l.precio, 'cantidad', l.cantidad, 'nota', l.nota,
               'categoria_id', pr.categoria_id)
             order by l.id)
        from carta.pedido_lineas l left join carta.productos pr on pr.id = l.producto_id
       where l.pedido_id = p.id), '[]'::jsonb))
$$;

-- Lo pendiente descuenta también las partes cobradas que luego se pasaron a factura (F3).
create or replace function fiscal._pendiente(p_rest uuid, p_pedidos uuid[], p_iva_defecto numeric)
returns table (k text, orden bigint, nombre text, precio numeric, iva numeric, cantidad bigint)
language sql stable security definer set search_path = '' as $$
  with base as (
    select * from fiscal._lineas_cobro(p_pedidos, p_iva_defecto)
  ), cobrado as (
    select l.nombre, l.precio, l.iva, sum(l.cantidad) as cantidad
      from fiscal.documentos dc join fiscal.documento_lineas l on l.documento_id = dc.id
     where dc.restaurante_id = p_rest and dc.parcial and dc.estado = 'emitido'
       and dc.tipo in ('F1', 'F2', 'F3') and dc.pedido_ids && p_pedidos
     group by 1, 2, 3
  )
  select fiscal._clave_linea(b.nombre, b.precio, b.iva), b.orden, b.nombre, b.precio, b.iva,
         b.cantidad - coalesce(c.cantidad, 0)
    from base b left join cobrado c on c.nombre = b.nombre and c.precio = b.precio and c.iva = b.iva
   order by b.orden
$$;

-- --------------------------------------------------- emisión (común) ----
-- Como fiscal._emitir (006) y además: p_sustituye = ticket F2 al que sustituye una factura F3.
create or replace function fiscal._emitir_doc(
  r carta.restaurantes, t fiscal.titulares, p_tipo text, p_serie text, p_mesa_id uuid, p_mesa text,
  p_pedidos uuid[], p_cliente jsonb, p_lineas jsonb, p_pagos jsonb, p_propina numeric, p_dispositivo text,
  p_parcial boolean, p_rectifica fiscal.documentos, p_motivo text, p_sustituye fiscal.documentos)
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
  insert into fiscal.documentos (restaurante_id, tipo, serie, anio, numero, num_serie, fecha_expedicion, fecha_operacion, expedido,
                                 mesa_id, mesa_nombre, pedido_ids, emisor, cliente, desglose, base_total, cuota_total,
                                 total, propina, pagos, rectifica_id, sustituye_ids, sif_modo, sif_entorno, huella, qr_url, parcial, motivo)
  values (r.id, p_tipo, p_serie, v_anio, v_num, v_numserie, v_fecha,
          case when p_sustituye.fecha_expedicion <> v_fecha then p_sustituye.fecha_expedicion end, v_ahora,
          p_mesa_id, p_mesa, coalesce(p_pedidos, '{}'), v_emisor, p_cliente, v_desglose, v_base, v_cuota,
          v_total, coalesce(p_propina, 0), p_pagos, p_rectifica.id,
          case when p_sustituye.id is not null then array[p_sustituye.id] end, t.modo_sif, t.entorno_aeat, v_huella, v_qr,
          coalesce(p_parcial, false), nullif(left(trim(coalesce(p_motivo, '')), 200), ''))
  returning * into v_doc;

  insert into fiscal.documento_lineas (documento_id, orden, nombre, cantidad, precio, importe, iva, base, cuota)
  select v_doc.id, o.n, o.l->>'nombre', (o.l->>'cantidad')::int, (o.l->>'precio')::numeric,
         (o.l->>'precio')::numeric * (o.l->>'cantidad')::int, (o.l->>'iva')::numeric,
         round((o.l->>'precio')::numeric * (o.l->>'cantidad')::int / (1 + (o.l->>'iva')::numeric / 100), 2),
         (o.l->>'precio')::numeric * (o.l->>'cantidad')::int
           - round((o.l->>'precio')::numeric * (o.l->>'cantidad')::int / (1 + (o.l->>'iva')::numeric / 100), 2)
    from jsonb_array_elements(p_lineas) with ordinality o(l, n);

  -- Caja: cobros (las devoluciones quedan en los pagos del documento rectificativo, en negativo;
  -- una factura que sustituye a un ticket no mueve dinero: el cobro ya se hizo con el ticket).
  insert into fiscal.cobros (restaurante_id, documento_id, forma, importe, entregado, cambio, dispositivo)
  select r.id, v_doc.id, x->>'forma', (x->>'importe')::numeric, (x->>'entregado')::numeric, (x->>'cambio')::numeric,
         left(p_dispositivo, 80)
    from jsonb_array_elements(p_pagos) x where (x->>'importe')::numeric > 0 and p_tipo <> 'F3';

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
            'FechaOperacion', case when p_sustituye.fecha_expedicion <> v_fecha then fiscal._fecha(p_sustituye.fecha_expedicion) end,
            'TipoRectificativa', case when v_rect then 'I' end,
            'FacturasRectificadas', case when v_rect then jsonb_build_array(jsonb_build_object(
                                      'IDEmisorFactura', t.nif, 'NumSerieFactura', p_rectifica.num_serie,
                                      'FechaExpedicionFactura', fiscal._fecha(p_rectifica.fecha_expedicion))) end,
            'DescripcionOperacion', case when v_rect then left('Rectificación: ' || coalesce(nullif(trim(p_motivo), ''), 'devolución'), 500)
                                         else 'Servicio de restauración' end,
            'FacturasSustituidas', case when p_sustituye.id is not null then jsonb_build_array(jsonb_build_object(
                                     'IDEmisorFactura', t.nif, 'NumSerieFactura', p_sustituye.num_serie,
                                     'FechaExpedicionFactura', fiscal._fecha(p_sustituye.fecha_expedicion))) end,
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
            'parcial', nullif(p_parcial, false), 'rectifica', p_rectifica.num_serie, 'sustituye', p_sustituye.num_serie, 'motivo', p_motivo,
            'dispositivo', left(p_dispositivo, 80))));
  return v_doc;
end $$;

-- Se mantiene la firma de 006 para quien la use.
create or replace function fiscal._emitir(
  r carta.restaurantes, t fiscal.titulares, p_tipo text, p_serie text, p_mesa_id uuid, p_mesa text,
  p_pedidos uuid[], p_cliente jsonb, p_lineas jsonb, p_pagos jsonb, p_propina numeric, p_dispositivo text,
  p_parcial boolean, p_rectifica fiscal.documentos, p_motivo text)
returns fiscal.documentos
language sql volatile security definer set search_path = '' as $$
  select fiscal._emitir_doc(r, t, p_tipo, p_serie, p_mesa_id, p_mesa, p_pedidos, p_cliente, p_lineas, p_pagos,
                            p_propina, p_dispositivo, p_parcial, p_rectifica, p_motivo, null::fiscal.documentos)
$$;

-- Documento con rectificaciones, sustituciones (F3 ↔ F2) y si es una parte de la cuenta.
create or replace function fiscal._documento_json(p fiscal.documentos) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'token', p.token, 'tipo', p.tipo, 'num_serie', p.num_serie, 'estado', p.estado,
    'fecha_expedicion', p.fecha_expedicion, 'fecha_operacion', p.fecha_operacion, 'expedido', p.expedido,
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
    'sustituye', (select jsonb_agg(jsonb_build_object('num_serie', x.num_serie, 'fecha_expedicion', x.fecha_expedicion) order by x.expedido)
                    from fiscal.documentos x where p.sustituye_ids is not null and x.id = any(p.sustituye_ids)),
    'sustituido_por', case when p.estado = 'sustituido' then
                        (select jsonb_build_object('num_serie', x.num_serie, 'fecha_expedicion', x.fecha_expedicion)
                           from fiscal.documentos x
                          where x.restaurante_id = p.restaurante_id and x.sustituye_ids @> array[p.id] limit 1) end,
    'sif', jsonb_build_object('modo', p.sif_modo, 'entorno', p.sif_entorno, 'huella', p.huella, 'qr_url', p.qr_url,
                              'leyenda', case when p.sif_modo = 'verifactu' then 'VERI*FACTU' end),
    'pie', (select t.pie_ticket from fiscal.titulares t where t.restaurante_id = p.restaurante_id))
$$;

revoke all on all functions in schema fiscal from public, anon, authenticated;

-- ----------------------------------------------------------------- API ----

-- Cobrar una mesa (como en 006) y además: "descuento" {tipo: 'pct' | 'importe', valor}.
-- Si todo lo pendiente está invitado (importe 0), la mesa se cierra sin ticket.
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
  v_desc     numeric(12,2);
  v_acum     numeric(12,2) := 0;
  v_dlin     jsonb := '[]'::jsonb;
  g          record;
  v_n_iva    int;
  v_i        int := 0;
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
  if v_total = 0 and not (d ? 'lineas' and d->'lineas' <> 'null'::jsonb) then
    -- Todo invitado: no hay venta que documentar; la mesa se cierra sin ticket.
    update carta.pedidos set cerrado = true, actualizado = now() where id = any(v_ids);
    return jsonb_build_object('sin_ticket', true, 'pendiente', 0);
  end if;
  if v_total <= 0 then raise exception 'importe_no_valido'; end if;

  -- 2b. Descuento opcional ({tipo: 'pct' | 'importe', valor}): una línea negativa por tipo de IVA,
  --     repartida en proporción a lo cobrado en cada tipo (el último tipo absorbe el redondeo).
  if jsonb_typeof(d->'descuento') = 'object' then
    if coalesce(d->'descuento'->>'tipo', '') not in ('pct', 'importe')
       or coalesce(d->'descuento'->>'valor', '') !~ '^[0-9]{1,6}([.][0-9]{1,2})?$' or (d->'descuento'->>'valor')::numeric <= 0
       or (d->'descuento'->>'tipo' = 'pct' and (d->'descuento'->>'valor')::numeric > 100) then
      raise exception 'descuento_no_valido';
    end if;
    v_desc := case when d->'descuento'->>'tipo' = 'pct'
                   then round(v_total * (d->'descuento'->>'valor')::numeric / 100, 2)
                   else (d->'descuento'->>'valor')::numeric end;
    if v_desc >= v_total then raise exception 'descuento_no_valido'; end if;
    select count(distinct (l->>'iva')::numeric) into v_n_iva from jsonb_array_elements(v_lineas) l;
    for g in select (l->>'iva')::numeric as iva, sum((l->>'precio')::numeric * (l->>'cantidad')::int) as tot
               from jsonb_array_elements(v_lineas) l group by 1 order by 1 loop
      v_i := v_i + 1;
      v_n := case when v_i = v_n_iva then (v_desc - v_acum) * 100 else round(v_desc * g.tot / v_total, 2) * 100 end;
      v_acum := v_acum + v_n / 100.0;
      if v_n > 0 then
        v_dlin := v_dlin || jsonb_build_object(
          'nombre', 'Descuento' || case when d->'descuento'->>'tipo' = 'pct'
                                        then ' ' || replace(d->'descuento'->>'valor', '.', ',') || ' %' else '' end,
          'precio', -(v_n / 100.0), 'cantidad', 1, 'iva', g.iva);
      end if;
    end loop;
    v_lineas := v_lineas || v_dlin;
    v_total := v_total - v_desc;
  end if;

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

  v_doc := fiscal._emitir_doc(r, t, v_tipo, v_serie, v_mesa_id, v_mesa, v_fact, v_cliente, v_lineas,
                              fiscal._pagos(d->'pagos', v_total + v_propina), v_propina, d->>'dispositivo',
                              v_parcial, null::fiscal.documentos, null, null::fiscal.documentos);

  -- 5. La mesa queda cobrada y libre cuando ya no queda nada pendiente.
  select coalesce(sum(p.precio * p.cantidad), 0) into v_queda
    from fiscal._pendiente(r.id, v_fact, t.iva_defecto) p where p.cantidad > 0;
  if not v_parcial then v_queda := 0; end if;
  if v_queda = 0 then
    update carta.pedidos set cerrado = true, actualizado = now() where id = any(v_ids);
  end if;
  return fiscal._documento_json(v_doc) || jsonb_build_object('pendiente', v_queda);
end $$;

-- Devolución (como en 006): también de facturas F3; con descuento, solo del documento entero.
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
  if o.tipo not in ('F1', 'F2', 'F3') or o.estado not in ('emitido', 'rectificado') then raise exception 'no_rectificable'; end if;
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
    -- Con descuento, la devolución es del documento entero (el descuento no se puede repartir por líneas).
    if exists (select 1 from fiscal.documento_lineas l where l.documento_id = o.id and l.precio < 0) then
      raise exception 'descuento_solo_total';
    end if;
    v_lineas := fiscal._seleccion(d->'lineas', v_disp, -1);
  else
    select jsonb_agg(jsonb_set(x - 'k' - 'orden', '{cantidad}', to_jsonb(-(x->>'cantidad')::int))) into v_lineas
      from jsonb_array_elements(v_disp) x;
  end if;
  select sum((l->>'precio')::numeric * (l->>'cantidad')::int) into v_total from jsonb_array_elements(v_lineas) l;
  if v_total >= 0 then raise exception 'nada_que_rectificar'; end if;

  v_forma := coalesce(nullif(d->>'forma', ''), o.pagos->0->>'forma', 'efectivo');
  if v_forma not in ('efectivo', 'tarjeta', 'bizum', 'otro') then raise exception 'pagos_no_validos'; end if;
  v_tipo := case o.tipo when 'F2' then 'R5' else 'R1' end;

  v_doc := fiscal._emitir_doc(r, t, v_tipo, t.serie_rectificativas, o.mesa_id, o.mesa_nombre, o.pedido_ids, o.cliente,
                              v_lineas, jsonb_build_array(jsonb_build_object('forma', v_forma, 'importe', v_total)), 0,
                              d->>'dispositivo', false, o, coalesce(nullif(trim(d->>'motivo'), ''), 'Devolución'),
                              null::fiscal.documentos);
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

-- "Hazme factura de este ticket": factura completa F3 con los datos del cliente que sustituye al ticket F2.
-- Mismas líneas, importes y pagos; no mueve caja (el cobro ya se hizo con el ticket). El ticket queda "sustituido".
create or replace function public.fiscal_facturar(p_slug text, p_clave text, p_datos jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r         carta.restaurantes;
  t         fiscal.titulares;
  d         jsonb := coalesce(p_datos, '{}'::jsonb);
  o         fiscal.documentos;
  v_cliente jsonb;
  v_lineas  jsonb;
  v_doc     fiscal.documentos;
begin
  r := carta._auth(p_slug, p_clave, 'cocina');
  select * into t from fiscal.titulares where restaurante_id = r.id;
  if not found then raise exception 'titular_sin_datos'; end if;
  if t.modo_sif = 'desactivado' then raise exception 'facturacion_desactivada'; end if;
  if coalesce(d->>'token', '') !~ '^[0-9a-f]{32}$' then raise exception 'documento_no_encontrado'; end if;
  select * into o from fiscal.documentos where token = d->>'token' and restaurante_id = r.id for update;
  if not found then raise exception 'documento_no_encontrado'; end if;
  if o.tipo <> 'F2' or o.estado <> 'emitido' or exists (select 1 from fiscal.documentos x where x.rectifica_id = o.id) then
    raise exception 'no_facturable';
  end if;

  if not coalesce(fiscal._nif_valido(d->'cliente'->>'nif'), false) then raise exception 'nif_cliente_no_valido'; end if;
  if length(trim(coalesce(d->'cliente'->>'nombre', ''))) = 0 or length(trim(coalesce(d->'cliente'->>'domicilio', ''))) = 0 then
    raise exception 'cliente_incompleto';
  end if;
  v_cliente := jsonb_build_object('nif', fiscal._nif_norm(d->'cliente'->>'nif'),
                                  'nombre', left(trim(d->'cliente'->>'nombre'), 120),
                                  'domicilio', left(trim(d->'cliente'->>'domicilio'), 200));

  select jsonb_agg(jsonb_build_object('nombre', l.nombre, 'precio', l.precio, 'cantidad', l.cantidad, 'iva', l.iva) order by l.orden)
    into v_lineas from fiscal.documento_lineas l where l.documento_id = o.id;

  v_doc := fiscal._emitir_doc(r, t, 'F3', t.serie_facturas, o.mesa_id, o.mesa_nombre, o.pedido_ids, v_cliente, v_lineas,
                              o.pagos, o.propina, d->>'dispositivo', o.parcial, null::fiscal.documentos, null, o);
  update fiscal.documentos set estado = 'sustituido' where id = o.id;
  return fiscal._documento_json(v_doc);
end $$;

-- carta_tpv (como en 006) y además:
--   comandar → líneas "Varios" sin producto_id: {nombre, precio, cantidad, iva?: 4|10|21}
--   linea    → {id: línea, accion: menos | quitar | invitar}  corregir un pedido abierto
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
  lin    carta.pedido_lineas;
  ped    carta.pedidos;
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
        if v_cant not between 1 and 20 then raise exception 'cantidad_no_valida'; end if;
        if length(coalesce(l->>'nota', '')) > 140 then raise exception 'nota_demasiado_larga'; end if;
        if nullif(l->>'producto_id', '') is null then
          -- "Varios": concepto e importe libres (lo que no está en la carta), con su IVA si se indica.
          if length(trim(coalesce(l->>'nombre', ''))) not between 1 and 60
             or coalesce(l->>'precio', '') !~ '^[0-9]{1,4}([.][0-9]{1,2})?$' or (l->>'precio')::numeric <= 0
             or coalesce(l->>'iva', '') !~ '^(4|10|21)?$' then
            raise exception 'varios_no_valido';
          end if;
          insert into carta.pedido_lineas (pedido_id, producto_id, nombre, precio, cantidad, nota, iva)
          values (v.id, null, trim(l->>'nombre'), (l->>'precio')::numeric, v_cant, nullif(trim(l->>'nota'), ''),
                  nullif(l->>'iva', '')::numeric);
          v_tot := v_tot + (l->>'precio')::numeric * v_cant;
          continue;
        end if;
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

    when 'linea' then
      -- Corregir un pedido abierto: quitar una unidad, quitar la línea o invitar (precio 0).
      if coalesce(d->>'id', '') !~ '^[0-9]{1,18}$' or coalesce(d->>'accion', '') not in ('menos', 'quitar', 'invitar') then
        raise exception 'accion_no_valida';
      end if;
      select p.* into ped from carta.pedidos p join carta.pedido_lineas l on l.pedido_id = p.id
       where l.id = (d->>'id')::bigint and p.restaurante_id = r.id and p.tipo = 'pedido' and not p.cerrado and p.estado <> 'cancelado'
       for update of p;
      if not found then raise exception 'pedido_no_encontrado'; end if;
      select * into lin from carta.pedido_lineas where id = (d->>'id')::bigint;
      if to_regclass('fiscal.documentos') is not null and exists (
           select 1 from fiscal.documentos dc where dc.restaurante_id = r.id and dc.parcial and dc.estado = 'emitido'
              and dc.pedido_ids && (select array_agg(x.id) from carta.pedidos x
                                     where x.restaurante_id = r.id and not x.cerrado
                                       and ((ped.mesa_id is not null and x.mesa_id = ped.mesa_id)
                                            or (ped.mesa_id is null and x.mesa_id is null and x.mesa_nombre = ped.mesa_nombre)))) then
        raise exception 'mesa_con_cobros_parciales';
      end if;
      if d->>'accion' = 'invitar' then
        if lin.precio = 0 then raise exception 'ya_invitado'; end if;
        update carta.pedido_lineas set precio = 0, nombre = left(nombre, 66) || ' (invitación)' where id = lin.id;
      else
        v_cant := case when d->>'accion' = 'menos' then 1 else lin.cantidad end;
        if v_cant >= lin.cantidad then delete from carta.pedido_lineas where id = lin.id;
        else update carta.pedido_lineas set cantidad = cantidad - v_cant where id = lin.id; end if;
        update carta.productos set stock = stock + v_cant, disponible = case when stock = 0 then true else disponible end
         where id = lin.producto_id and stock is not null;
      end if;
      select coalesce(sum(precio * cantidad), 0), count(*) into v_tot, v_n from carta.pedido_lineas where pedido_id = ped.id;
      update carta.pedidos set total = v_tot, actualizado = now(),
             estado = case when v_n = 0 then 'cancelado' else estado end
       where id = ped.id returning * into v;
      insert into carta.pedido_eventos (pedido_id, restaurante_id, estado) values (ped.id, r.id, 'editado:' || (d->>'accion'));
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

-- -------------------------------------------------------------- caja ----
-- Un turno de caja por restaurante a la vez: fondo inicial, entradas y salidas de efectivo y cierre con arqueo.
-- Efectivo esperado = fondo + cobros en efectivo (menos devoluciones en efectivo) + entradas − salidas.
-- Qué cobros entran en cada turno lo marca el registro SIF (correlativo): los posteriores al último del turno
-- anterior y, al cerrar, hasta el último emitido. Así no se pierde ni se repite ninguno entre turnos.
-- Una vez cerrado, el turno no se puede cambiar; los movimientos nunca.
create table if not exists fiscal.caja_turnos (
  id             uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references carta.restaurantes(id) on delete restrict,
  abierto        timestamptz not null,
  cerrado        timestamptz,
  fondo          numeric(10,2) not null check (fondo >= 0),
  desde_registro bigint not null default 0,
  hasta_registro bigint,
  contado        numeric(10,2) check (contado >= 0),
  esperado       numeric(10,2),
  descuadre      numeric(10,2),
  resumen        jsonb,
  billetes       jsonb,
  nota           text check (length(nota) <= 300),
  dispositivo    text check (length(dispositivo) <= 80),
  check ((cerrado is null) = (contado is null) and (cerrado is null) = (hasta_registro is null))
);
create unique index if not exists caja_turnos_abierto_idx on fiscal.caja_turnos (restaurante_id) where cerrado is null;
create index if not exists caja_turnos_rest_idx on fiscal.caja_turnos (restaurante_id, abierto desc);

create table if not exists fiscal.caja_movimientos (
  id       bigint generated always as identity primary key,
  turno_id uuid not null references fiscal.caja_turnos(id) on delete restrict,
  tipo     text not null check (tipo in ('entrada', 'salida')),
  importe  numeric(10,2) not null check (importe > 0),
  concepto text not null check (length(concepto) between 1 and 120),
  creado   timestamptz not null default now()
);
create index if not exists caja_movimientos_turno_idx on fiscal.caja_movimientos (turno_id, id);

-- Turno: solo se puede cerrar (una vez); la apertura y el fondo no cambian.
create or replace function fiscal._turno_inmutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op <> 'UPDATE' or old.cerrado is not null
     or new.id <> old.id or new.restaurante_id <> old.restaurante_id or new.abierto <> old.abierto or new.fondo <> old.fondo
     or new.desde_registro <> old.desde_registro
     or new.dispositivo is distinct from old.dispositivo then
    raise exception 'documento_inmutable';
  end if;
  return new;
end $$;
create or replace trigger inmutable_fila before update or delete on fiscal.caja_turnos
  for each row execute function fiscal._turno_inmutable();
create or replace trigger inmutable_truncate before truncate on fiscal.caja_turnos
  for each statement execute function fiscal._inmutable();
create or replace trigger inmutable_fila before update or delete on fiscal.caja_movimientos
  for each row execute function fiscal._inmutable();
create or replace trigger inmutable_truncate before truncate on fiscal.caja_movimientos
  for each statement execute function fiscal._inmutable();

alter table fiscal.caja_turnos      enable row level security;
alter table fiscal.caja_movimientos enable row level security;
revoke all on fiscal.caja_turnos, fiscal.caja_movimientos from public, anon, authenticated;

-- Cuentas del turno hasta el registro p_hasta (null = hasta ahora). Los tickets sustituidos por factura cuentan
-- (el dinero entró con ellos); las facturas F3 no (no mueven caja).
create or replace function fiscal._caja_resumen(p fiscal.caja_turnos, p_hasta bigint) returns jsonb
language sql stable security definer set search_path = '' as $$
  with doc as (
    select d.tipo, d.total, d.propina, d.pagos
      from fiscal.registros_sif rs join fiscal.documentos d on d.id = rs.documento_id
     where rs.restaurante_id = p.restaurante_id and rs.tipo_registro = 'alta'
       and rs.id > p.desde_registro and (p_hasta is null or rs.id <= p_hasta)
       and d.estado <> 'anulado' and d.tipo <> 'F3'
  ), pg as (
    select x->>'forma' as forma, (x->>'importe')::numeric as importe from doc, jsonb_array_elements(doc.pagos) x
  ), mov as (
    select m.tipo, m.importe from fiscal.caja_movimientos m where m.turno_id = p.id
  ), s as (
    select (select coalesce(sum(importe), 0) from pg where forma = 'efectivo') as efectivo,
           (select coalesce(sum(importe), 0) from mov where tipo = 'entrada') as entradas,
           (select coalesce(sum(importe), 0) from mov where tipo = 'salida') as salidas
  )
  select jsonb_build_object(
    'tickets', (select count(*) from doc where tipo not like 'R%'),
    'ventas', (select coalesce(sum(total), 0) from doc),
    'propinas', (select coalesce(sum(propina), 0) from doc),
    'devoluciones', (select count(*) from doc where tipo like 'R%'),
    'devuelto', (select coalesce(sum(total), 0) from doc where tipo like 'R%'),
    'por_forma', (select coalesce(jsonb_object_agg(z.forma, z.importe), '{}'::jsonb)
                    from (select forma, sum(importe) as importe from pg group by 1) z),
    'efectivo', s.efectivo, 'entradas', s.entradas, 'salidas', s.salidas,
    'esperado', p.fondo + s.efectivo + s.entradas - s.salidas)
  from s
$$;

create or replace function fiscal._caja_turno_json(p fiscal.caja_turnos) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'abierto', p.abierto, 'cerrado', p.cerrado, 'fondo', p.fondo, 'contado', p.contado,
    'esperado', p.esperado, 'descuadre', p.descuadre, 'nota', p.nota, 'billetes', p.billetes,
    'resumen', coalesce(p.resumen, fiscal._caja_resumen(p, null)),
    'movimientos', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'tipo', m.tipo, 'importe', m.importe,
                                                                 'concepto', m.concepto, 'creado', m.creado) order by m.id)
                               from fiscal.caja_movimientos m where m.turno_id = p.id), '[]'::jsonb))
$$;
revoke all on function fiscal._turno_inmutable() from public, anon, authenticated;
revoke all on function fiscal._caja_resumen(fiscal.caja_turnos, bigint) from public, anon, authenticated;
revoke all on function fiscal._caja_turno_json(fiscal.caja_turnos) from public, anon, authenticated;

-- fiscal_caja(slug, clave de cocina o admin, acción, datos):
--   estado     → turno abierto (o null), último cierre
--   abrir      → {fondo}
--   movimiento → {tipo: entrada|salida, importe, concepto}
--   cerrar     → {contado, billetes?: {"50": 2, "0.5": 3…}, nota?}  → devuelve el turno cerrado (para imprimir)
--   historial  → {limite?}  últimos cierres
--   ver        → {id}  un turno (para reimprimir su cierre)
create or replace function public.fiscal_caja(p_slug text, p_clave text, p_accion text default 'estado', p_datos jsonb default '{}')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r       carta.restaurantes;
  d       jsonb := coalesce(p_datos, '{}'::jsonb);
  tu      fiscal.caja_turnos;
  v_ahora timestamptz := date_trunc('second', clock_timestamp());
  v_res   jsonb;
  v_lim   int;
  v_bill  jsonb;
  v_hasta bigint;
  v_extra jsonb := '{}'::jsonb;
begin
  r := carta._auth(p_slug, p_clave, 'cocina');
  select * into tu from fiscal.caja_turnos where restaurante_id = r.id and cerrado is null for update;

  case coalesce(p_accion, 'estado')
    when 'estado' then
      null;

    when 'abrir' then
      if tu.id is not null then raise exception 'caja_abierta'; end if;
      if coalesce(d->>'fondo', '') !~ '^[0-9]{1,5}([.][0-9]{1,2})?$' then raise exception 'importe_no_valido'; end if;
      begin
        insert into fiscal.caja_turnos (restaurante_id, abierto, fondo, desde_registro, dispositivo)
        values (r.id, v_ahora, (d->>'fondo')::numeric,
                coalesce((select x.hasta_registro from fiscal.caja_turnos x where x.restaurante_id = r.id and x.cerrado is not null
                           order by x.cerrado desc, x.abierto desc limit 1),
                         (select max(rs.id) from fiscal.registros_sif rs where rs.restaurante_id = r.id), 0),
                left(d->>'dispositivo', 80))
        returning * into tu;
      exception when unique_violation then
        raise exception 'caja_abierta';
      end;

    when 'movimiento' then
      if tu.id is null then raise exception 'caja_cerrada'; end if;
      if coalesce(d->>'tipo', '') not in ('entrada', 'salida')
         or coalesce(d->>'importe', '') !~ '^[0-9]{1,5}([.][0-9]{1,2})?$' or (d->>'importe')::numeric <= 0 then
        raise exception 'importe_no_valido';
      end if;
      if length(trim(coalesce(d->>'concepto', ''))) not between 1 and 120 then raise exception 'concepto_no_valido'; end if;
      insert into fiscal.caja_movimientos (turno_id, tipo, importe, concepto)
      values (tu.id, d->>'tipo', (d->>'importe')::numeric, trim(d->>'concepto'));

    when 'cerrar' then
      if tu.id is null then raise exception 'caja_cerrada'; end if;
      if coalesce(d->>'contado', '') !~ '^[0-9]{1,6}([.][0-9]{1,2})?$' then raise exception 'importe_no_valido'; end if;
      if length(coalesce(d->>'nota', '')) > 300 then raise exception 'nota_demasiado_larga'; end if;
      -- Recuento por billetes y monedas (opcional, solo informativo): {"valor": unidades}.
      if jsonb_typeof(d->'billetes') = 'object' then
        if (select count(*) from jsonb_each_text(d->'billetes')) > 20
           or exists (select 1 from jsonb_each_text(d->'billetes') b
                       where b.key !~ '^[0-9]{1,3}([.][0-9]{1,2})?$' or b.value !~ '^[0-9]{1,5}$') then
          raise exception 'importe_no_valido';
        end if;
        select jsonb_object_agg(b.key, b.value::int) into v_bill
          from jsonb_each_text(d->'billetes') b where b.value::int > 0;
      end if;
      v_hasta := coalesce((select max(rs.id) from fiscal.registros_sif rs where rs.restaurante_id = r.id), 0);
      v_res := fiscal._caja_resumen(tu, v_hasta);
      update fiscal.caja_turnos
         set cerrado = v_ahora, hasta_registro = v_hasta, contado = (d->>'contado')::numeric, esperado = (v_res->>'esperado')::numeric,
             descuadre = (d->>'contado')::numeric - (v_res->>'esperado')::numeric, resumen = v_res, billetes = v_bill,
             nota = nullif(trim(coalesce(d->>'nota', '')), '')
       where id = tu.id returning * into tu;
      v_extra := jsonb_build_object('cerrado', fiscal._caja_turno_json(tu));
      tu := null;

    when 'historial' then
      if coalesce(d->>'limite', '') !~ '^[0-9]{0,3}$' then raise exception 'filtro_no_valido'; end if;
      v_lim := least(greatest(coalesce(nullif(d->>'limite', '')::int, 30), 1), 200);
      v_extra := jsonb_build_object('historial', coalesce((
        select jsonb_agg(jsonb_build_object('id', x.id, 'abierto', x.abierto, 'cerrado', x.cerrado, 'fondo', x.fondo,
                                            'contado', x.contado, 'esperado', x.esperado, 'descuadre', x.descuadre,
                                            'ventas', x.resumen->'ventas', 'tickets', x.resumen->'tickets') order by x.abierto desc)
          from (select * from fiscal.caja_turnos where restaurante_id = r.id and cerrado is not null
                 order by abierto desc limit v_lim) x), '[]'::jsonb));

    when 'ver' then
      select jsonb_build_object('turno_visto', fiscal._caja_turno_json(x)) into v_extra
        from fiscal.caja_turnos x where x.id = carta._uuid(d->>'id') and x.restaurante_id = r.id;
      if v_extra is null then raise exception 'no_encontrado'; end if;

    else
      raise exception 'accion_no_valida';
  end case;

  return jsonb_build_object(
    'turno', case when tu.id is not null then fiscal._caja_turno_json(tu) end,
    'ultimo', (select jsonb_build_object('id', x.id, 'cerrado', x.cerrado, 'contado', x.contado, 'descuadre', x.descuadre)
                 from fiscal.caja_turnos x where x.restaurante_id = r.id and x.cerrado is not null
                order by x.cerrado desc limit 1)
  ) || v_extra;
end $$;

-- ------------------------------------------------------------ permisos ----
revoke all on function public.fiscal_cobrar(text, text, jsonb)          from public;
revoke all on function public.fiscal_rectificar(text, text, jsonb)      from public;
revoke all on function public.fiscal_facturar(text, text, jsonb)        from public;
revoke all on function public.fiscal_caja(text, text, text, jsonb)      from public;
revoke all on function public.carta_tpv(text, text, text, jsonb)        from public;
grant execute on function public.fiscal_cobrar(text, text, jsonb)        to anon, authenticated;
grant execute on function public.fiscal_rectificar(text, text, jsonb)    to anon, authenticated;
grant execute on function public.fiscal_facturar(text, text, jsonb)      to anon, authenticated;
grant execute on function public.fiscal_caja(text, text, text, jsonb)    to anon, authenticated;
grant execute on function public.carta_tpv(text, text, text, jsonb)      to anon, authenticated;
