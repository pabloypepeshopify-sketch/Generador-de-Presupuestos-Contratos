-- =============================================================================
-- 008 · Mis clientes y cobros (pack "Solo pedidos"): control de la cuota mensual de cada bar.
-- Solo control: no hay pasarela de pago. Pablo marca "Pagado" cuando le pagan (Bizum, transferencia…).
-- Idempotente y sin drop. No toca las tablas ni funciones existentes.
--
--   carta.cuotas        cuota de cada restaurante (importe, desde cuándo se cobra, notas)
--   carta.cuota_pagos   un registro por mes pagado
--   public.carta_cuotas(clave plataforma, accion, datos)
--       listar | fijar (cuota/inicio/notas/sin_cuota) | pagar (el mes indicado o el más antiguo pendiente)
--       | deshacer (quita el último pago, si se marcó por error)
--
-- Cada bar se cobra cada mes el mismo día que su "inicio" (si el mes es más corto, el último día).
-- Un mes está "pendiente" desde ese día hasta que se marca pagado.
-- =============================================================================

create table if not exists carta.cuotas (
  restaurante_id uuid primary key references carta.restaurantes(id) on delete cascade,
  importe        numeric(10,2) not null default 29 check (importe >= 0 and importe < 10000),
  inicio         date not null,                      -- primer cobro
  sin_cuota      boolean not null default false,     -- demo, pruebas, regalo…
  notas          text check (length(notas) <= 500),
  actualizado    timestamptz not null default now()
);

create table if not exists carta.cuota_pagos (
  id             bigint generated always as identity primary key,
  restaurante_id uuid not null references carta.restaurantes(id) on delete cascade,
  periodo        date not null,                      -- día de cobro de ese mes
  importe        numeric(10,2) not null check (importe >= 0),
  pagado_el      date not null default current_date,
  forma          text check (forma in ('bizum','transferencia','efectivo','tarjeta','otro')),
  nota           text check (length(nota) <= 200),
  creado         timestamptz not null default now(),
  unique (restaurante_id, periodo)
);

alter table carta.cuotas      enable row level security;
alter table carta.cuota_pagos enable row level security;

-- Días de cobro desde el inicio hasta p_hasta (incluido): inicio, inicio + 1 mes, … (máx. 20 años)
-- Siempre se suma al inicio (no al mes anterior): un 31 cobra el 28/29 de febrero y vuelve al 31 en marzo.
create or replace function carta._cuota_periodos(p_inicio date, p_hasta date)
returns setof date
language sql immutable set search_path = '' as $$
  select f from (select (p_inicio + make_interval(months => n))::date f from generate_series(0, 240) n) x
   where f <= p_hasta
$$;

-- Primer día de cobro posterior a p_hoy.
create or replace function carta._cuota_proximo(p_inicio date, p_hoy date)
returns date
language sql immutable set search_path = '' as $$
  select min(f) from (select (p_inicio + make_interval(months => n))::date f from generate_series(0, 241) n) x
   where f > p_hoy
$$;

-- Estado de la cuota de un restaurante a fecha p_hoy.
create or replace function carta._cuota_estado(r carta.restaurantes, p_hoy date)
returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  c          carta.cuotas;
  v_inicio   date;
  v_pend     jsonb;
  v_proximo  date;
  v_ultimo   jsonb;
begin
  select * into c from carta.cuotas where restaurante_id = r.id;
  v_inicio := coalesce(c.inicio, (r.creado at time zone r.zona_horaria)::date);
  select coalesce(jsonb_agg(p order by p), '[]'::jsonb) into v_pend
    from carta._cuota_periodos(v_inicio, p_hoy) p
   where not coalesce(c.sin_cuota, false)
     and not exists (select 1 from carta.cuota_pagos x where x.restaurante_id = r.id and x.periodo = p);
  v_proximo := carta._cuota_proximo(v_inicio, p_hoy);
  select jsonb_build_object('periodo', x.periodo, 'pagado_el', x.pagado_el, 'importe', x.importe, 'forma', x.forma)
    into v_ultimo from carta.cuota_pagos x where x.restaurante_id = r.id order by x.periodo desc limit 1;
  return jsonb_build_object(
    'importe', coalesce(c.importe, 29), 'inicio', v_inicio, 'sin_cuota', coalesce(c.sin_cuota, false),
    'notas', c.notas, 'configurada', c.restaurante_id is not null,
    'pendientes', v_pend, 'debe', coalesce(c.importe, 29) * jsonb_array_length(v_pend),
    'al_dia', jsonb_array_length(v_pend) = 0,
    'dias_retraso', case when jsonb_array_length(v_pend) > 0 then p_hoy - (v_pend->>0)::date else 0 end,
    'proximo', case when coalesce(c.sin_cuota, false) then null else v_proximo end,
    'ultimo_pago', v_ultimo);
end $$;

create or replace function public.carta_cuotas(p_clave text, p_accion text default 'listar',
                                               p_datos jsonb default '{}')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  d      jsonb := coalesce(p_datos, '{}'::jsonb);
  r      carta.restaurantes;
  v_hoy  date := (now() at time zone 'Europe/Madrid')::date;
  v_est  jsonb;
  v_per  date;
begin
  if coalesce(p_clave, '') = '' or not exists (
       select 1 from carta.plataforma where clave_hash = carta._hash(p_clave)) then
    raise exception 'clave_incorrecta';
  end if;
  if coalesce(p_accion, 'listar') <> 'listar' then
    select * into r from carta.restaurantes where slug = lower(trim(coalesce(d->>'slug', '')));
    if not found then raise exception 'restaurante_no_encontrado'; end if;
  end if;

  case coalesce(p_accion, 'listar')
    when 'listar' then
      null;
    when 'fijar' then
      if d ? 'importe' and (d->>'importe') !~ '^\d{1,4}([.,]\d{1,2})?$' then raise exception 'importe_no_valido'; end if;
      if d ? 'inicio' and (d->>'inicio') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'fecha_no_valida'; end if;
      insert into carta.cuotas (restaurante_id, importe, inicio, sin_cuota, notas)
      values (r.id, coalesce(replace(d->>'importe', ',', '.')::numeric, 29),
              coalesce((d->>'inicio')::date, (r.creado at time zone r.zona_horaria)::date),
              coalesce((d->>'sin_cuota')::boolean, false), nullif(trim(d->>'notas'), ''))
      on conflict (restaurante_id) do update set
        importe   = case when d ? 'importe' then replace(d->>'importe', ',', '.')::numeric else carta.cuotas.importe end,
        inicio    = case when d ? 'inicio' then (d->>'inicio')::date else carta.cuotas.inicio end,
        sin_cuota = case when d ? 'sin_cuota' then (d->>'sin_cuota')::boolean else carta.cuotas.sin_cuota end,
        notas     = case when d ? 'notas' then nullif(trim(d->>'notas'), '') else carta.cuotas.notas end,
        actualizado = now();
    when 'pagar' then
      v_est := carta._cuota_estado(r, v_hoy);
      v_per := coalesce((d->>'periodo')::date, (v_est->'pendientes'->>0)::date);
      if v_per is null then raise exception 'nada_pendiente'; end if;
      if d ? 'forma' and coalesce(d->>'forma', '') not in ('bizum','transferencia','efectivo','tarjeta','otro') then
        raise exception 'forma_no_valida';
      end if;
      insert into carta.cuota_pagos (restaurante_id, periodo, importe, forma, nota)
      values (r.id, v_per, (v_est->>'importe')::numeric, nullif(d->>'forma', ''), nullif(trim(d->>'nota'), ''))
      on conflict (restaurante_id, periodo) do nothing;
    when 'deshacer' then
      delete from carta.cuota_pagos
       where id = (select id from carta.cuota_pagos where restaurante_id = r.id
                    and (d->>'periodo' is null or periodo = (d->>'periodo')::date)
                    order by periodo desc limit 1);
      if not found then raise exception 'nada_que_deshacer'; end if;
    else
      raise exception 'accion_no_valida';
  end case;

  return jsonb_build_object('hoy', v_hoy, 'clientes', coalesce((
    select jsonb_agg(jsonb_build_object(
             'slug', x.slug, 'nombre', x.nombre, 'activo', x.activo, 'alta', (x.creado at time zone x.zona_horaria)::date,
             'pedidos_30d', (select count(*) from carta.pedidos p where p.restaurante_id = x.id and p.tipo = 'pedido'
                               and p.creado > now() - interval '30 days'),
             'ultimo_pedido', (select max(p.creado) from carta.pedidos p where p.restaurante_id = x.id and p.tipo = 'pedido'),
             'cuota', carta._cuota_estado(x, v_hoy),
             'pagos', coalesce((select jsonb_agg(jsonb_build_object('periodo', q.periodo, 'pagado_el', q.pagado_el,
                                                   'importe', q.importe, 'forma', q.forma) order by q.periodo desc)
                                  from (select * from carta.cuota_pagos y where y.restaurante_id = x.id
                                         order by y.periodo desc limit 12) q), '[]'::jsonb))
           order by x.creado)
      from carta.restaurantes x), '[]'::jsonb));
end $$;

revoke all on function public.carta_cuotas(text, text, jsonb) from public;
grant execute on function public.carta_cuotas(text, text, jsonb) to anon, authenticated;
revoke all on function carta._cuota_periodos(date, date) from public;
revoke all on function carta._cuota_proximo(date, date) from public;
revoke all on function carta._cuota_estado(carta.restaurantes, date) from public;

-- La demo no paga cuota.
insert into carta.cuotas (restaurante_id, inicio, sin_cuota, notas)
select id, (creado at time zone zona_horaria)::date, true, 'Demo para enseñar'
  from carta.restaurantes where slug = 'demo'
on conflict (restaurante_id) do nothing;
