-- =============================================================================
-- Carta NFC · Facturación — FASE 1: tickets (facturas simplificadas) y registro
-- VERI*FACTU encadenado. Todavía NO se envía nada a la AEAT (eso es la Fase 2).
-- -----------------------------------------------------------------------------
-- Ver docs/brief-facturacion.md. Idempotente: se puede ejecutar varias veces.
--
--   fiscal_config     clave cocina/admin  ¿facturación activa? (lo usa el panel)
--   fiscal_cobrar     clave cocina/admin  cobra pedidos -> ticket F2 (o F1 con NIF),
--                                          cobros, registro SIF con huella y QR,
--                                          y cierra los pedidos. Todo en 1 transacción.
--   fiscal_documento  público (token)     ticket para verlo/imprimirlo
--   fiscal_tickets    público (tokens)    ticket asociado a los pedidos del cliente
--   fiscal_admin      clave admin         datos del titular, IVA por categoría,
--                                          últimos documentos y estado del SIF
--
-- Reglas legales que quedan configurables / pendientes de revisar con la gestoría:
--   TODO(gestoría) IVA 0 % / exenciones: no admitido en la Fase 1.
--   TODO(gestoría) propinas: hoy fuera de la base imponible y fuera del ticket.
--   TODO(VISAX)    datos del productor del SIF (fiscal.sistema) para la declaración responsable.
-- =============================================================================

create schema if not exists fiscal;
revoke all on schema fiscal from public;

-- IVA por categoría o producto (null = hereda: producto -> categoría -> titular).
alter table carta.categorias add column if not exists iva numeric(5,2) check (iva in (4, 10, 21));
alter table carta.productos  add column if not exists iva numeric(5,2) check (iva in (4, 10, 21));

-- ------------------------------------------------------------- utilidades ----

create or replace function fiscal._nif_norm(p text) returns text
language sql immutable set search_path = '' as $$
  select upper(regexp_replace(coalesce(p, ''), '[\s.-]', '', 'g'))
$$;

-- DNI, NIE, NIF especiales (K/L/M) y CIF con su dígito/letra de control.
create or replace function fiscal._nif_valido(p text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  s      text := fiscal._nif_norm(p);
  letras constant text := 'TRWAGMYFPDXBNJZSQVHLCKE';
  suma   int := 0;
  d      int;
  ctrl   int;
begin
  if s ~ '^[0-9]{8}[A-Z]$' then
    return substr(letras, (substr(s, 1, 8)::bigint % 23)::int + 1, 1) = substr(s, 9, 1);
  elsif s ~ '^[XYZ][0-9]{7}[A-Z]$' then
    return substr(letras, ((translate(substr(s, 1, 1), 'XYZ', '012') || substr(s, 2, 7))::bigint % 23)::int + 1, 1) = substr(s, 9, 1);
  elsif s ~ '^[KLM][0-9]{7}[A-Z]$' then
    return substr(letras, (substr(s, 2, 7)::bigint % 23)::int + 1, 1) = substr(s, 9, 1);
  elsif s ~ '^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$' then
    for i in 1..7 loop
      d := substr(s, i + 1, 1)::int;
      if i % 2 = 1 then d := d * 2; suma := suma + d / 10 + d % 10; else suma := suma + d; end if;
    end loop;
    ctrl := (10 - suma % 10) % 10;
    if substr(s, 1, 1) in ('N', 'P', 'Q', 'R', 'S', 'W') then
      return substr(s, 9, 1) = substr('JABCDEFGHI', ctrl + 1, 1);
    elsif substr(s, 1, 1) in ('A', 'B', 'E', 'H') then
      return substr(s, 9, 1) = ctrl::text;
    end if;
    return substr(s, 9, 1) in (ctrl::text, substr('JABCDEFGHI', ctrl + 1, 1));
  end if;
  return false;
end $$;

-- Formatos de los campos VERI*FACTU (iguales a los usados en la huella y en el XML).
create or replace function fiscal._importe(p numeric) returns text
language sql immutable set search_path = '' as $$ select to_char(p, 'FM999999999990.00') $$;

create or replace function fiscal._fecha(p date) returns text
language sql immutable set search_path = '' as $$ select to_char(p, 'DD-MM-YYYY') $$;

create or replace function fiscal._fecha_huso(p timestamptz, p_tz text) returns text
language sql stable set search_path = '' as $$
  select to_char(p at time zone p_tz, 'YYYY-MM-DD"T"HH24:MI:SS')
      || case when (p at time zone p_tz) < (p at time zone 'UTC')
              then '-' || to_char((p at time zone 'UTC') - (p at time zone p_tz), 'HH24:MI')
              else '+' || to_char((p at time zone p_tz) - (p at time zone 'UTC'), 'HH24:MI') end
$$;

-- Huella del registro de alta (SHA-256, hex en mayúsculas). Comprobada con el ejemplo
-- oficial de la AEAT (ver tests/sql-tests-fiscal.sql).
create or replace function fiscal._huella_alta(p_nif text, p_num_serie text, p_fecha text, p_tipo text,
                                               p_cuota text, p_importe text, p_anterior text, p_fecha_huso text)
returns text language sql immutable set search_path = '' as $$
  select upper(encode(sha256(convert_to(
       'IDEmisorFactura=' || trim(p_nif)
    || '&NumSerieFactura=' || trim(p_num_serie)
    || '&FechaExpedicionFactura=' || trim(p_fecha)
    || '&TipoFactura=' || trim(p_tipo)
    || '&CuotaTotal=' || trim(p_cuota)
    || '&ImporteTotal=' || trim(p_importe)
    || '&Huella=' || trim(coalesce(p_anterior, ''))
    || '&FechaHoraHusoGenRegistro=' || trim(p_fecha_huso), 'UTF8')), 'hex'))
$$;

-- URL de cotejo del QR (AEAT). Pruebas: prewww2.aeat.es · Producción: www2.agenciatributaria.gob.es
create or replace function fiscal._qr_url(p_entorno text, p_modo text, p_nif text, p_num_serie text, p_fecha text, p_importe text)
returns text language sql immutable set search_path = '' as $$
  select case when p_entorno = 'produccion' then 'https://www2.agenciatributaria.gob.es' else 'https://prewww2.aeat.es' end
      || '/wlpl/TIKE-CONT/' || case when p_modo = 'verifactu' then 'ValidarQR' else 'ValidarQRNoVerifactu' end
      || '?nif=' || p_nif
      || '&numserie=' || replace(replace(replace(replace(replace(replace(p_num_serie,
           '%', '%25'), '&', '%26'), '/', '%2F'), ' ', '%20'), '+', '%2B'), '#', '%23')
      || '&fecha=' || p_fecha
      || '&importe=' || p_importe
$$;

-- --------------------------------------------------------------- tablas ----

-- Datos del sistema informático (productor del SIF). TODO(VISAX): completar NIF del productor.
create table if not exists fiscal.sistema (
  id                 int primary key default 1 check (id = 1),
  productor_nombre   text not null default 'VISAX AI',
  productor_nif      text,
  nombre_sistema     text not null default 'Carta NFC',
  id_sistema         text not null default 'CN',
  version            text not null default '1.0.0',
  numero_instalacion text not null default '1'
);
insert into fiscal.sistema (id) values (1) on conflict (id) do nothing;

create table if not exists fiscal.titulares (
  restaurante_id      uuid primary key references carta.restaurantes(id) on delete restrict,
  nif                 text not null check (fiscal._nif_valido(nif)),
  razon_social        text not null check (length(razon_social) between 1 and 120),
  nombre_comercial    text check (length(nombre_comercial) <= 120),
  domicilio           text not null check (length(domicilio) between 1 and 200),
  codigo_postal       text check (codigo_postal ~ '^[0-9]{5}$'),
  municipio           text check (length(municipio) <= 80),
  provincia           text check (length(provincia) <= 80),
  tipo_persona        text not null check (tipo_persona in ('fisica', 'juridica')),
  regimen_iva         text not null default 'general' check (regimen_iva in ('general', 'simplificado')),
  regimen_renta       text check (regimen_renta in ('estimacion_directa', 'modulos', 'sociedades')),
  modo_sif            text not null default 'verifactu' check (modo_sif in ('verifactu', 'no_verifactu', 'desactivado')),
  entorno_aeat        text not null default 'pruebas' check (entorno_aeat in ('pruebas', 'produccion')),
  certificado_ref     text,  -- nombre del secreto en Supabase Vault; nunca el certificado
  iva_defecto         numeric(5,2) not null default 10 check (iva_defecto in (4, 10, 21)),
  limite_simplificada numeric(10,2) not null default 3000 check (limite_simplificada between 1 and 3000),
  serie_tickets       text not null default 'T' check (serie_tickets ~ '^[A-Z]{1,3}$'),
  serie_facturas      text not null default 'F' check (serie_facturas ~ '^[A-Z]{1,3}$'),
  pie_ticket          text check (length(pie_ticket) <= 200),
  actualizado         timestamptz not null default now()
);

-- Numeración correlativa sin huecos: se bloquea la fila de la serie dentro de la transacción.
create table if not exists fiscal.series (
  restaurante_id uuid not null references carta.restaurantes(id) on delete restrict,
  codigo         text not null,
  anio           int  not null,
  ultimo         int  not null default 0,
  bloqueada      boolean not null default false,
  primary key (restaurante_id, codigo, anio)
);

create table if not exists fiscal.documentos (
  id               uuid primary key default gen_random_uuid(),
  restaurante_id   uuid not null references carta.restaurantes(id) on delete restrict,
  tipo             text not null check (tipo in ('F1', 'F2', 'F3', 'R1', 'R2', 'R3', 'R4', 'R5')),
  serie            text not null,
  anio             int  not null,
  numero           int  not null,
  num_serie        text not null,
  fecha_expedicion date not null,
  fecha_operacion  date,
  expedido         timestamptz not null,
  mesa_id          uuid,
  mesa_nombre      text,
  pedido_ids       uuid[] not null default '{}',
  emisor           jsonb not null,
  cliente          jsonb,
  desglose         jsonb not null,
  base_total       numeric(12,2) not null,
  cuota_total      numeric(12,2) not null,
  total            numeric(12,2) not null,
  propina          numeric(12,2) not null default 0,
  pagos            jsonb not null default '[]',
  rectifica_id     uuid references fiscal.documentos(id),
  sustituye_ids    uuid[],
  estado           text not null default 'emitido' check (estado in ('emitido', 'anulado', 'rectificado', 'sustituido')),
  token            text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  sif_modo         text not null,
  sif_entorno      text not null,
  huella           text,
  qr_url           text,
  unique (restaurante_id, serie, anio, numero),
  unique (restaurante_id, num_serie)
);
create index if not exists documentos_restaurante_idx on fiscal.documentos (restaurante_id, expedido desc);
create index if not exists documentos_pedidos_idx on fiscal.documentos using gin (pedido_ids);

create table if not exists fiscal.documento_lineas (
  id           bigint generated always as identity primary key,
  documento_id uuid not null references fiscal.documentos(id) on delete restrict,
  orden        int  not null,
  nombre       text not null,
  cantidad     int  not null,
  precio       numeric(10,2) not null,   -- unitario, IVA incluido
  importe      numeric(12,2) not null,   -- cantidad × precio, IVA incluido
  iva          numeric(5,2)  not null,
  base         numeric(12,2) not null,   -- informativo por línea; el desglose del documento manda
  cuota        numeric(12,2) not null
);
create index if not exists documento_lineas_doc_idx on fiscal.documento_lineas (documento_id);

create table if not exists fiscal.cobros (
  id             bigint generated always as identity primary key,
  restaurante_id uuid not null references carta.restaurantes(id) on delete restrict,
  documento_id   uuid not null references fiscal.documentos(id) on delete restrict,
  forma          text not null check (forma in ('efectivo', 'tarjeta', 'bizum', 'otro')),
  importe        numeric(12,2) not null check (importe > 0),
  entregado      numeric(12,2),
  cambio         numeric(12,2),
  dispositivo    text check (length(dispositivo) <= 80),
  creado         timestamptz not null default now()
);
create index if not exists cobros_doc_idx on fiscal.cobros (documento_id);

-- Registros del SIF (alta / anulación), encadenados por NIF del emisor y entorno.
create table if not exists fiscal.registros_sif (
  id               bigint generated always as identity primary key,
  restaurante_id   uuid not null references carta.restaurantes(id) on delete restrict,
  documento_id     uuid not null references fiscal.documentos(id) on delete restrict,
  tipo_registro    text not null check (tipo_registro in ('alta', 'anulacion')),
  nif_emisor       text not null,
  entorno          text not null check (entorno in ('pruebas', 'produccion')),
  num_serie        text not null,
  fecha_expedicion date not null,
  tipo_factura     text not null,
  cuota_total      numeric(12,2) not null,
  importe_total    numeric(12,2) not null,
  fecha_hora_huso  text not null,
  huella_anterior  text,
  huella           text not null,
  anterior_id      bigint references fiscal.registros_sif(id),
  contenido        jsonb not null,
  estado_envio     text not null default 'pendiente'
                     check (estado_envio in ('no_aplica', 'pendiente', 'enviado', 'correcto', 'aceptado_con_errores', 'incorrecto')),
  respuesta        jsonb,
  reintentos       int not null default 0,
  enviado          timestamptz,
  creado           timestamptz not null default now()
);
create index if not exists registros_sif_cadena_idx on fiscal.registros_sif (nif_emisor, entorno, id desc);
create index if not exists registros_sif_envio_idx on fiscal.registros_sif (estado_envio) where estado_envio = 'pendiente';

create table if not exists fiscal.eventos_sif (
  id             bigint generated always as identity primary key,
  restaurante_id uuid references carta.restaurantes(id) on delete restrict,
  tipo           text not null,
  detalle        jsonb not null default '{}',
  creado         timestamptz not null default now()
);

-- -------------------------------------------- inmutabilidad (en la base de datos) ----
-- Los documentos emitidos no se borran ni se editan: solo cambian los campos indicados
-- como argumentos del trigger (estado del documento, estado de envío del registro…).
create or replace function fiscal._inmutable() returns trigger
language plpgsql set search_path = '' as $$
declare
  libres text[] := coalesce(tg_argv::text[], '{}');
begin
  if tg_op in ('DELETE', 'TRUNCATE') then
    raise exception 'documento_inmutable';
  end if;
  if (to_jsonb(new) - libres) is distinct from (to_jsonb(old) - libres) then
    raise exception 'documento_inmutable';
  end if;
  return new;
end $$;

do $$
declare
  t record;
begin
  for t in select * from (values
      ('documentos',       '''estado'''),
      ('documento_lineas', ''),
      ('cobros',           ''),
      ('registros_sif',    '''estado_envio'', ''respuesta'', ''reintentos'', ''enviado''')
    ) v(tabla, libres) loop
    execute format('create or replace trigger inmutable_fila before update or delete on fiscal.%I for each row execute function fiscal._inmutable(%s)', t.tabla, t.libres);
    execute format('create or replace trigger inmutable_truncate before truncate on fiscal.%I for each statement execute function fiscal._inmutable()', t.tabla);
  end loop;
end $$;

alter table fiscal.sistema          enable row level security;
alter table fiscal.titulares        enable row level security;
alter table fiscal.series           enable row level security;
alter table fiscal.documentos       enable row level security;
alter table fiscal.documento_lineas enable row level security;
alter table fiscal.cobros           enable row level security;
alter table fiscal.registros_sif    enable row level security;
alter table fiscal.eventos_sif      enable row level security;
revoke all on all tables in schema fiscal from public, anon, authenticated;

-- ------------------------------------------------------- cálculo del ticket ----

-- Líneas a cobrar agrupadas (mismo nombre, precio e IVA) con el IVA vigente:
-- producto -> categoría -> titular.
create or replace function fiscal._lineas_cobro(p_pedidos uuid[], p_iva_defecto numeric)
returns table (orden bigint, nombre text, precio numeric, cantidad bigint, iva numeric)
language sql stable security definer set search_path = '' as $$
  select min(pl.id), pl.nombre, pl.precio, sum(pl.cantidad), coalesce(pr.iva, c.iva, p_iva_defecto)
    from carta.pedido_lineas pl
    left join carta.productos pr on pr.id = pl.producto_id
    left join carta.categorias c on c.id = pr.categoria_id
   where pl.pedido_id = any(p_pedidos)
   group by pl.nombre, pl.precio, coalesce(pr.iva, c.iva, p_iva_defecto)
   order by 1
$$;

create or replace function fiscal._documento_json(p fiscal.documentos) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'token', p.token, 'tipo', p.tipo, 'num_serie', p.num_serie, 'estado', p.estado,
    'fecha_expedicion', p.fecha_expedicion, 'expedido', p.expedido,
    'mesa', p.mesa_nombre, 'emisor', p.emisor, 'cliente', p.cliente,
    'lineas', coalesce((select jsonb_agg(jsonb_build_object(
                 'nombre', l.nombre, 'cantidad', l.cantidad, 'precio', l.precio, 'importe', l.importe, 'iva', l.iva)
               order by l.orden) from fiscal.documento_lineas l where l.documento_id = p.id), '[]'::jsonb),
    'desglose', p.desglose, 'base_total', p.base_total, 'cuota_total', p.cuota_total, 'total', p.total,
    'propina', p.propina, 'pagos', p.pagos,
    'sif', jsonb_build_object('modo', p.sif_modo, 'entorno', p.sif_entorno, 'huella', p.huella, 'qr_url', p.qr_url,
                              'leyenda', case when p.sif_modo = 'verifactu' then 'VERI*FACTU' end),
    'pie', (select t.pie_ticket from fiscal.titulares t where t.restaurante_id = p.restaurante_id))
$$;

revoke all on all functions in schema fiscal from public, anon, authenticated;

-- ----------------------------------------------------------------- API ----

create or replace function public.fiscal_config(p_slug text, p_clave text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r carta.restaurantes;
  t fiscal.titulares;
begin
  r := carta._auth(p_slug, p_clave, 'cocina');
  select * into t from fiscal.titulares where restaurante_id = r.id;
  return jsonb_build_object(
    'activo', found and t.modo_sif <> 'desactivado',
    'modo_sif', t.modo_sif, 'entorno', t.entorno_aeat,
    'nombre', coalesce(t.nombre_comercial, t.razon_social, r.nombre),
    'limite_simplificada', t.limite_simplificada);
end $$;

create or replace function public.fiscal_cobrar(p_slug text, p_clave text, p_datos jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r          carta.restaurantes;
  t          fiscal.titulares;
  s          fiscal.sistema;
  d          jsonb := coalesce(p_datos, '{}'::jsonb);
  v_ids      uuid[];
  v_fact     uuid[];
  v_n        int;
  v_mesa_id  uuid;
  v_mesa     text;
  v_cliente  jsonb;
  v_tipo     text;
  v_serie    text;
  v_anio     int;
  v_num      int;
  v_bloq     boolean;
  v_numserie text;
  v_ahora    timestamptz := date_trunc('second', clock_timestamp());
  v_fecha    date;
  v_total    numeric(12,2);
  v_base     numeric(12,2);
  v_cuota    numeric(12,2);
  v_desglose jsonb;
  v_propina  numeric(12,2);
  v_pagos    jsonb := '[]'::jsonb;
  v_suma     numeric(12,2) := 0;
  pg         jsonb;
  v_imp      numeric(12,2);
  v_ent      numeric(12,2);
  v_prev     fiscal.registros_sif;
  v_fh       text;
  v_huella   text;
  v_qr       text;
  v_doc      fiscal.documentos;
  v_emisor   jsonb;
begin
  r := carta._auth(p_slug, p_clave, 'cocina');
  select * into t from fiscal.titulares where restaurante_id = r.id;
  if not found then raise exception 'titular_sin_datos'; end if;
  if t.modo_sif = 'desactivado' then raise exception 'facturacion_desactivada'; end if;
  select * into s from fiscal.sistema where id = 1;

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

  -- 2. Totales por tipo de IVA: base = total/(1+tipo) redondeada; cuota = total - base.
  select coalesce(jsonb_agg(jsonb_build_object('iva', x.iva, 'base', x.base, 'cuota', x.total - x.base, 'total', x.total)
                            order by x.iva desc), '[]'::jsonb),
         coalesce(sum(x.total), 0), coalesce(sum(x.base), 0)
    into v_desglose, v_total, v_base
    from (select l.iva, sum(l.precio * l.cantidad)::numeric(12,2) as total,
                 round(sum(l.precio * l.cantidad) / (1 + l.iva / 100), 2) as base
            from fiscal._lineas_cobro(v_fact, t.iva_defecto) l group by l.iva) x;
  v_cuota := v_total - v_base;
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
  if coalesce(jsonb_typeof(d->'pagos'), '') <> 'array' or jsonb_array_length(d->'pagos') = 0
     or jsonb_array_length(d->'pagos') > 4 then
    raise exception 'pagos_no_validos';
  end if;
  for pg in select value from jsonb_array_elements(d->'pagos') loop
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
  if v_suma <> v_total + v_propina then raise exception 'pagos_no_cuadran'; end if;

  -- 5. Numeración correlativa sin huecos (bloqueo de la serie).
  v_fecha := (v_ahora at time zone r.zona_horaria)::date;
  v_anio := extract(year from v_fecha)::int;
  insert into fiscal.series (restaurante_id, codigo, anio) values (r.id, v_serie, v_anio) on conflict do nothing;
  select ultimo + 1, bloqueada into v_num, v_bloq
    from fiscal.series where restaurante_id = r.id and codigo = v_serie and anio = v_anio for update;
  if v_bloq then raise exception 'serie_bloqueada'; end if;
  update fiscal.series set ultimo = v_num where restaurante_id = r.id and codigo = v_serie and anio = v_anio;
  v_numserie := v_serie || v_anio || '-' || lpad(v_num::text, 6, '0');

  -- 6. Registro SIF: huella encadenada al último registro de este NIF y entorno.
  perform pg_advisory_xact_lock(hashtext('fiscal.sif:' || t.nif || ':' || t.entorno_aeat));
  select * into v_prev from fiscal.registros_sif
   where nif_emisor = t.nif and entorno = t.entorno_aeat order by id desc limit 1;
  v_fh := fiscal._fecha_huso(v_ahora, r.zona_horaria);
  v_huella := fiscal._huella_alta(t.nif, v_numserie, fiscal._fecha(v_fecha), v_tipo,
                                  fiscal._importe(v_cuota), fiscal._importe(v_total), v_prev.huella, v_fh);
  v_qr := fiscal._qr_url(t.entorno_aeat, t.modo_sif, t.nif, v_numserie, fiscal._fecha(v_fecha), fiscal._importe(v_total));

  -- 7. Documento + líneas + cobros + registro, en esta misma transacción.
  v_emisor := jsonb_build_object('nif', t.nif, 'razon_social', t.razon_social, 'nombre_comercial', t.nombre_comercial,
                                 'domicilio', t.domicilio, 'codigo_postal', t.codigo_postal, 'municipio', t.municipio,
                                 'provincia', t.provincia);
  insert into fiscal.documentos (restaurante_id, tipo, serie, anio, numero, num_serie, fecha_expedicion, expedido,
                                 mesa_id, mesa_nombre, pedido_ids, emisor, cliente, desglose, base_total, cuota_total,
                                 total, propina, pagos, sif_modo, sif_entorno, huella, qr_url)
  values (r.id, v_tipo, v_serie, v_anio, v_num, v_numserie, v_fecha, v_ahora,
          v_mesa_id, v_mesa, v_fact, v_emisor, v_cliente, v_desglose, v_base, v_cuota,
          v_total, v_propina, v_pagos, t.modo_sif, t.entorno_aeat, v_huella, v_qr)
  returning * into v_doc;

  insert into fiscal.documento_lineas (documento_id, orden, nombre, cantidad, precio, importe, iva, base, cuota)
  select v_doc.id, row_number() over (order by l.orden), l.nombre, l.cantidad, l.precio,
         l.precio * l.cantidad, l.iva,
         round(l.precio * l.cantidad / (1 + l.iva / 100), 2),
         l.precio * l.cantidad - round(l.precio * l.cantidad / (1 + l.iva / 100), 2)
    from fiscal._lineas_cobro(v_fact, t.iva_defecto) l;

  insert into fiscal.cobros (restaurante_id, documento_id, forma, importe, entregado, cambio, dispositivo)
  select r.id, v_doc.id, x->>'forma', (x->>'importe')::numeric, (x->>'entregado')::numeric, (x->>'cambio')::numeric,
         left(d->>'dispositivo', 80)
    from jsonb_array_elements(v_pagos) x;

  insert into fiscal.registros_sif (restaurante_id, documento_id, tipo_registro, nif_emisor, entorno, num_serie,
                                    fecha_expedicion, tipo_factura, cuota_total, importe_total, fecha_hora_huso,
                                    huella_anterior, huella, anterior_id, contenido, estado_envio)
  values (r.id, v_doc.id, 'alta', t.nif, t.entorno_aeat, v_numserie, v_fecha, v_tipo, v_cuota, v_total, v_fh,
          v_prev.huella, v_huella, v_prev.id,
          jsonb_strip_nulls(jsonb_build_object(
            'IDVersion', '1.0',
            'IDFactura', jsonb_build_object('IDEmisorFactura', t.nif, 'NumSerieFactura', v_numserie,
                                            'FechaExpedicionFactura', fiscal._fecha(v_fecha)),
            'NombreRazonEmisor', left(t.razon_social, 120),
            'TipoFactura', v_tipo,
            'DescripcionOperacion', 'Servicio de restauración',
            'FacturaSinIdentifDestinatarioArt61d', case when v_tipo = 'F2' then 'S' end,
            'Destinatarios', case when v_cliente is not null then jsonb_build_array(jsonb_build_object(
                               'NombreRazon', v_cliente->>'nombre', 'NIF', v_cliente->>'nif')) end,
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
  values (r.id, 'alta_registro', jsonb_build_object('num_serie', v_numserie, 'tipo', v_tipo, 'total', v_total,
                                                   'entorno', t.entorno_aeat, 'dispositivo', left(d->>'dispositivo', 80)));

  -- 8. La mesa queda cobrada y libre (mismos pedidos que enseña el panel).
  update carta.pedidos set cerrado = true, actualizado = now() where id = any(v_ids);

  return fiscal._documento_json(v_doc);
end $$;

create or replace function public.fiscal_documento(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v fiscal.documentos;
begin
  if coalesce(p_token, '') !~ '^[0-9a-f]{32}$' then raise exception 'documento_no_encontrado'; end if;
  select * into v from fiscal.documentos where token = p_token;
  if not found then raise exception 'documento_no_encontrado'; end if;
  return fiscal._documento_json(v);
end $$;

-- Para la página del cliente: "Ver tu ticket" a partir de los tokens de sus pedidos.
create or replace function public.fiscal_tickets(p_tokens text[])
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(array_length(p_tokens, 1), 0) = 0 then return '[]'::jsonb; end if;
  if array_length(p_tokens, 1) > 30 then raise exception 'demasiados_tokens'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('pedido_token', p.token, 'ticket_token', dc.token,
                                        'num_serie', dc.num_serie, 'total', dc.total))
      from carta.pedidos p
      join fiscal.documentos dc on p.id = any(dc.pedido_ids) and dc.estado = 'emitido'
     where p.token = any(p_tokens)), '[]'::jsonb);
end $$;

create or replace function public.fiscal_admin(p_slug text, p_clave text, p_accion text default 'datos', p_datos jsonb default '{}')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r     carta.restaurantes;
  d     jsonb := coalesce(p_datos, '{}'::jsonb);
  t     fiscal.titulares;
  v_iva numeric;
begin
  r := carta._auth(p_slug, p_clave, 'admin');

  case coalesce(p_accion, 'datos')
    when 'datos' then
      null;

    when 'titular' then
      if not fiscal._nif_valido(d->>'nif') then raise exception 'nif_no_valido'; end if;
      if length(trim(coalesce(d->>'razon_social', ''))) = 0 or length(trim(coalesce(d->>'domicilio', ''))) = 0
         or coalesce(d->>'tipo_persona', '') not in ('fisica', 'juridica')
         or coalesce(d->>'modo_sif', 'verifactu') not in ('verifactu', 'no_verifactu', 'desactivado')
         or coalesce(d->>'iva_defecto', '10') not in ('4', '10', '21')
         or (nullif(d->>'codigo_postal', '') is not null and d->>'codigo_postal' !~ '^[0-9]{5}$')
         or coalesce(d->>'limite_simplificada', '3000') !~ '^[0-9]{1,4}([.][0-9]{1,2})?$'
         or upper(coalesce(nullif(trim(d->>'serie_tickets'), ''), 'T')) !~ '^[A-Z]{1,3}$'
         or upper(coalesce(nullif(trim(d->>'serie_facturas'), ''), 'F')) !~ '^[A-Z]{1,3}$'
         or upper(coalesce(nullif(trim(d->>'serie_tickets'), ''), 'T')) = upper(coalesce(nullif(trim(d->>'serie_facturas'), ''), 'F')) then
        raise exception 'titular_incompleto';
      end if;
      if coalesce(d->>'entorno_aeat', 'pruebas') = 'produccion' then
        raise exception 'produccion_no_disponible';  -- Fase 2: hace falta el envío a la AEAT
      end if;
      insert into fiscal.titulares as x (restaurante_id, nif, razon_social, nombre_comercial, domicilio, codigo_postal,
                                         municipio, provincia, tipo_persona, regimen_iva, regimen_renta, modo_sif,
                                         entorno_aeat, iva_defecto, limite_simplificada, serie_tickets, serie_facturas,
                                         pie_ticket, actualizado)
      values (r.id, fiscal._nif_norm(d->>'nif'), trim(d->>'razon_social'), nullif(trim(d->>'nombre_comercial'), ''),
              trim(d->>'domicilio'), nullif(trim(d->>'codigo_postal'), ''), nullif(trim(d->>'municipio'), ''),
              nullif(trim(d->>'provincia'), ''), d->>'tipo_persona', coalesce(d->>'regimen_iva', 'general'),
              nullif(d->>'regimen_renta', ''), coalesce(d->>'modo_sif', 'verifactu'), 'pruebas',
              coalesce((d->>'iva_defecto')::numeric, 10), coalesce((d->>'limite_simplificada')::numeric, 3000),
              upper(coalesce(nullif(trim(d->>'serie_tickets'), ''), 'T')), upper(coalesce(nullif(trim(d->>'serie_facturas'), ''), 'F')),
              nullif(trim(d->>'pie_ticket'), ''), now())
      on conflict (restaurante_id) do update set
        nif = excluded.nif, razon_social = excluded.razon_social, nombre_comercial = excluded.nombre_comercial,
        domicilio = excluded.domicilio, codigo_postal = excluded.codigo_postal, municipio = excluded.municipio,
        provincia = excluded.provincia, tipo_persona = excluded.tipo_persona, regimen_iva = excluded.regimen_iva,
        regimen_renta = excluded.regimen_renta, modo_sif = excluded.modo_sif, entorno_aeat = excluded.entorno_aeat,
        iva_defecto = excluded.iva_defecto, limite_simplificada = excluded.limite_simplificada,
        serie_tickets = excluded.serie_tickets, serie_facturas = excluded.serie_facturas,
        pie_ticket = excluded.pie_ticket, actualizado = now();
      insert into fiscal.eventos_sif (restaurante_id, tipo, detalle)
      values (r.id, 'titular_actualizado', jsonb_build_object('modo_sif', d->>'modo_sif'));

    when 'iva_categoria' then
      v_iva := nullif(d->>'iva', '')::numeric;
      update carta.categorias set iva = v_iva where id = carta._uuid(d->>'id') and restaurante_id = r.id;
      if not found then raise exception 'no_encontrado'; end if;

    when 'iva_producto' then
      v_iva := nullif(d->>'iva', '')::numeric;
      update carta.productos set iva = v_iva where id = carta._uuid(d->>'id') and restaurante_id = r.id;
      if not found then raise exception 'no_encontrado'; end if;

    else
      raise exception 'accion_no_valida';
  end case;

  select * into t from fiscal.titulares where restaurante_id = r.id;
  return jsonb_build_object(
    'titular', case when t.restaurante_id is not null then to_jsonb(t) - 'restaurante_id' - 'certificado_ref' end,
    'categorias', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'iva', c.iva)
                                             order by c.orden, c.nombre)
                              from carta.categorias c where c.restaurante_id = r.id), '[]'::jsonb),
    'documentos', coalesce((select jsonb_agg(jsonb_build_object(
                               'token', x.token, 'tipo', x.tipo, 'num_serie', x.num_serie, 'expedido', x.expedido,
                               'mesa', x.mesa_nombre, 'total', x.total, 'estado', x.estado, 'entorno', x.sif_entorno,
                               'envio', (select rs.estado_envio from fiscal.registros_sif rs
                                          where rs.documento_id = x.id order by rs.id desc limit 1))
                             order by x.expedido desc)
                              from (select * from fiscal.documentos where restaurante_id = r.id
                                    order by expedido desc limit 30) x), '[]'::jsonb),
    'sif', (select jsonb_build_object('registros', count(*),
                                      'pendientes', count(*) filter (where estado_envio = 'pendiente'),
                                      'ultima_huella', (array_agg(huella order by id desc))[1])
              from fiscal.registros_sif where restaurante_id = r.id),
    'sistema', (select to_jsonb(s) - 'id' from fiscal.sistema s where s.id = 1));
end $$;

-- ------------------------------------------------------------- permisos ----
revoke all on function public.fiscal_config(text, text)                    from public;
revoke all on function public.fiscal_cobrar(text, text, jsonb)             from public;
revoke all on function public.fiscal_documento(text)                       from public;
revoke all on function public.fiscal_tickets(text[])                       from public;
revoke all on function public.fiscal_admin(text, text, text, jsonb)        from public;
grant execute on function public.fiscal_config(text, text)                 to anon, authenticated;
grant execute on function public.fiscal_cobrar(text, text, jsonb)          to anon, authenticated;
grant execute on function public.fiscal_documento(text)                    to anon, authenticated;
grant execute on function public.fiscal_tickets(text[])                    to anon, authenticated;
grant execute on function public.fiscal_admin(text, text, text, jsonb)     to anon, authenticated;
