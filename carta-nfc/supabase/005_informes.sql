-- Carta NFC · Informes de ventas tipo TPV (idempotente). Requiere 001; usa 003 (cobros) si está.
-- Solo añade: el registro de cambios de estado de cada pedido (trigger), un índice y carta_informe.
-- No cambia ninguna RPC ni tabla existente.

-- ------------------------------------------------- registro de eventos ----
-- Cuándo pasa cada pedido a preparando / listo / servido / cancelado / cerrado (mesa cobrada).
-- Sirve para medir tiempos de cocina, de servicio y de respuesta a avisos.
create table if not exists carta.pedido_eventos (
  id             bigint generated always as identity primary key,
  pedido_id      uuid not null references carta.pedidos(id) on delete cascade,
  restaurante_id uuid not null,
  estado         text not null,
  en             timestamptz not null default now()
);
create index if not exists pedido_eventos_pedido_idx on carta.pedido_eventos (pedido_id, estado);
alter table carta.pedido_eventos enable row level security;
revoke all on carta.pedido_eventos from public, anon, authenticated;

create or replace function carta._evento_pedido() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if new.estado is distinct from old.estado then
      insert into carta.pedido_eventos (pedido_id, restaurante_id, estado) values (new.id, new.restaurante_id, new.estado);
    end if;
    if new.cerrado and not old.cerrado then
      insert into carta.pedido_eventos (pedido_id, restaurante_id, estado) values (new.id, new.restaurante_id, 'cerrado');
    end if;
  exception when others then
    null;  -- el registro es para informes: nunca debe impedir atender un pedido
  end;
  return null;
end $$;
revoke all on function carta._evento_pedido() from public, anon, authenticated;

create or replace trigger pedidos_eventos
  after update of estado, cerrado on carta.pedidos
  for each row execute function carta._evento_pedido();

create index if not exists pedidos_informe_idx on carta.pedidos (restaurante_id, creado);

-- ------------------------------------------------------------ informe ----
-- carta_informe(slug, clave de cocina o admin, { desde, hasta: 'YYYY-MM-DD' }) → todo lo de un periodo
-- (por defecto hoy) y los totales del periodo anterior de la misma duración para comparar.
-- Ventas = consumo de pedidos no cancelados (IVA incluido). Si el bar factura, añade los cobros reales.
create or replace function public.carta_informe(p_slug text, p_clave text, p_filtro jsonb default '{}')
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r       carta.restaurantes;
  f       jsonb := coalesce(p_filtro, '{}'::jsonb);
  tz      text;
  v_hoy   date;
  v_desde date;
  v_hasta date;
  v_dias  int;
  t0      timestamptz;
  t1      timestamptz;
  a0      timestamptz;
  v_res   jsonb;
  v_cobro jsonb;
begin
  r := carta._auth(p_slug, p_clave, 'cocina');
  tz := r.zona_horaria;
  v_hoy := (now() at time zone tz)::date;
  if coalesce(f->>'desde', '') !~ '^([0-9]{4}-[0-9]{2}-[0-9]{2})?$' or coalesce(f->>'hasta', '') !~ '^([0-9]{4}-[0-9]{2}-[0-9]{2})?$' then
    raise exception 'filtro_no_valido';
  end if;
  begin
    v_desde := coalesce(nullif(f->>'desde', '')::date, v_hoy);
    v_hasta := coalesce(nullif(f->>'hasta', '')::date, greatest(v_desde, v_hoy));
  exception when others then
    raise exception 'filtro_no_valido';
  end;
  if v_hasta < v_desde or v_hasta - v_desde > 731 then raise exception 'filtro_no_valido'; end if;
  v_dias := v_hasta - v_desde + 1;
  t0 := v_desde::timestamp at time zone tz;
  t1 := (v_hasta + 1)::timestamp at time zone tz;
  a0 := (v_desde - v_dias)::timestamp at time zone tz;

  with ped as (
    select p.*, (p.creado at time zone tz) as loc
      from carta.pedidos p
     where p.restaurante_id = r.id and p.creado >= t0 and p.creado < t1
  ), ven as (
    select * from ped where tipo = 'pedido' and estado <> 'cancelado'
  ), lin as (
    select l.producto_id, l.nombre, l.precio, l.cantidad, l.pedido_id
      from carta.pedido_lineas l join ven v on v.id = l.pedido_id
  ), prod as (
    select coalesce(l.producto_id::text, 'n:' || l.nombre) as k,
           coalesce(max(pr.nombre), max(l.nombre)) as nombre,
           coalesce(max(c.nombre), 'Sin categoría') as categoria,
           sum(l.cantidad) as unidades, sum(l.cantidad * l.precio) as importe,
           count(distinct l.pedido_id) as pedidos
      from lin l
      left join carta.productos pr on pr.id = l.producto_id
      left join carta.categorias c on c.id = pr.categoria_id
     group by 1
  ), ev as (
    select e.pedido_id, e.estado, min(e.en) as en
      from carta.pedido_eventos e
     where e.pedido_id in (select id from ped)
     group by 1, 2
  ), ant as (
    select p.total from carta.pedidos p
     where p.restaurante_id = r.id and p.creado >= a0 and p.creado < t0 and p.tipo = 'pedido' and p.estado <> 'cancelado'
  )
  select jsonb_build_object(
    'restaurante', r.nombre,
    'periodo', jsonb_build_object('desde', v_desde, 'hasta', v_hasta, 'dias', v_dias, 'hoy', v_hoy,
                                  'anterior_desde', v_desde - v_dias, 'anterior_hasta', v_desde - 1),
    'kpis', jsonb_build_object(
      'ventas',    (select coalesce(sum(total), 0) from ven),
      'pedidos',   (select count(*) from ven),
      'unidades',  (select coalesce(sum(cantidad), 0) from lin),
      'mesas',     (select count(distinct mesa_nombre) from ven),
      'cancelados', (select count(*) from ped where tipo = 'pedido' and estado = 'cancelado'),
      'cancelado_importe', (select coalesce(sum(total), 0) from ped where tipo = 'pedido' and estado = 'cancelado'),
      'avisos_camarero', (select count(*) from ped where tipo = 'camarero'),
      'avisos_cuenta',   (select count(*) from ped where tipo = 'cuenta'),
      'primer_pedido', (select min(loc) from ven),
      'ultimo_pedido', (select max(loc) from ven),
      -- minutos medios (solo pedidos con el evento registrado)
      'min_preparacion', (select round(avg(extract(epoch from e.en - v.creado)) / 60, 1)
                            from ven v join ev e on e.pedido_id = v.id and e.estado = 'listo'),
      'min_servicio',    (select round(avg(extract(epoch from e.en - v.creado)) / 60, 1)
                            from ven v join ev e on e.pedido_id = v.id and e.estado = 'servido'),
      'min_respuesta',   (select round(avg(extract(epoch from e.en - p.creado)) / 60, 1)
                            from ped p join ev e on e.pedido_id = p.id and e.estado = 'servido'
                           where p.tipo in ('camarero', 'cuenta'))),
    'anterior', jsonb_build_object(
      'ventas',  (select coalesce(sum(total), 0) from ant),
      'pedidos', (select count(*) from ant),
      'unidades', (select coalesce(sum(l.cantidad), 0) from carta.pedido_lineas l join carta.pedidos p on p.id = l.pedido_id
                    where p.restaurante_id = r.id and p.creado >= a0 and p.creado < t0 and p.tipo = 'pedido' and p.estado <> 'cancelado')),
    'por_hora', coalesce((select jsonb_agg(jsonb_build_object('h', h, 'ventas', s, 'pedidos', n) order by h)
                            from (select extract(hour from loc)::int as h, sum(total) as s, count(*) as n from ven group by 1) x), '[]'::jsonb),
    'por_dia', (select jsonb_agg(jsonb_build_object('fecha', d::date, 'ventas', coalesce(x.s, 0), 'pedidos', coalesce(x.n, 0)) order by d)
                  from generate_series(v_desde::timestamp, v_hasta::timestamp, interval '1 day') d
                  left join (select loc::date as dia, sum(total) as s, count(*) as n from ven group by 1) x on x.dia = d::date),
    'por_dia_semana', coalesce((select jsonb_agg(jsonb_build_object('dow', dw, 'ventas', s, 'pedidos', n) order by dw)
                                  from (select extract(isodow from loc)::int as dw, sum(total) as s, count(*) as n from ven group by 1) x), '[]'::jsonb),
    'productos', coalesce((select jsonb_agg(jsonb_build_object('nombre', nombre, 'categoria', categoria, 'unidades', unidades,
                                                             'importe', importe, 'pedidos', pedidos) order by importe desc, unidades desc, nombre)
                             from (select * from prod order by importe desc, unidades desc limit 500) x), '[]'::jsonb),
    'categorias', coalesce((select jsonb_agg(jsonb_build_object('nombre', categoria, 'unidades', u, 'importe', i) order by i desc)
                              from (select categoria, sum(unidades) as u, sum(importe) as i from prod group by 1) x), '[]'::jsonb),
    'mesas', coalesce((select jsonb_agg(jsonb_build_object('nombre', mesa_nombre, 'pedidos', n, 'ventas', s) order by s desc)
                         from (select mesa_nombre, count(*) as n, sum(total) as s from ven group by 1) x), '[]'::jsonb),
    'sin_ventas', coalesce((select jsonb_agg(jsonb_build_object('nombre', pr.nombre, 'categoria', c.nombre, 'disponible', pr.disponible)
                                             order by c.orden, c.nombre, pr.orden, pr.nombre)
                              from carta.productos pr
                              left join carta.categorias c on c.id = pr.categoria_id
                             where pr.restaurante_id = r.id
                               and coalesce(c.activa, true)
                               and not exists (select 1 from lin l where l.producto_id = pr.id)), '[]'::jsonb)
  ) into v_res;

  -- Cobros reales (solo bares con facturación): tickets, formas de pago, propinas e IVA por tipo.
  if to_regclass('fiscal.titulares') is not null and exists (select 1 from fiscal.titulares t where t.restaurante_id = r.id) then
    with doc as (
      select d.* from fiscal.documentos d
       where d.restaurante_id = r.id and d.estado <> 'anulado' and d.tipo <> 'F3' and d.fecha_expedicion between v_desde and v_hasta
    )
    select jsonb_build_object(
      -- Las rectificativas (R…) restan: el original sigue contando y la devolución va en negativo.
      -- Las facturas F3 no suman: repiten la venta del ticket al que sustituyen (que ya cuenta).
      'tickets',   (select count(*) from doc where tipo not like 'R%'),
      'devoluciones', (select count(*) from doc where tipo like 'R%'),
      'devuelto',  (select coalesce(sum(total), 0) from doc where tipo like 'R%'),
      'facturas',  (select count(*) from doc where tipo = 'F1')
                 + (select count(*) from fiscal.documentos d where d.restaurante_id = r.id and d.estado <> 'anulado'
                       and d.tipo = 'F3' and d.fecha_expedicion between v_desde and v_hasta),
      'facturado', (select coalesce(sum(total), 0) from doc),
      'base',      (select coalesce(sum(base_total), 0) from doc),
      'cuota',     (select coalesce(sum(cuota_total), 0) from doc),
      'propinas',  (select coalesce(sum(propina), 0) from doc),
      'primero',   (select num_serie from doc where tipo not like 'R%' order by expedido, numero limit 1),
      'ultimo',    (select num_serie from doc where tipo not like 'R%' order by expedido desc, numero desc limit 1),
      'por_forma', (select coalesce(jsonb_object_agg(z.forma, z.importe), '{}'::jsonb)
                      from (select x->>'forma' as forma, sum((x->>'importe')::numeric) as importe
                              from doc, jsonb_array_elements(doc.pagos) x group by 1) z),
      'iva', coalesce((select jsonb_agg(jsonb_build_object('iva', z.iva, 'base', z.base, 'cuota', z.cuota, 'total', z.total) order by z.iva desc)
                         from (select (x->>'iva')::numeric as iva, sum((x->>'base')::numeric) as base,
                                      sum((x->>'cuota')::numeric) as cuota, sum((x->>'total')::numeric) as total
                                 from doc, jsonb_array_elements(doc.desglose) x group by 1) z), '[]'::jsonb),
      'anterior_facturado', (select coalesce(sum(d.total), 0) from fiscal.documentos d
                              where d.restaurante_id = r.id and d.estado <> 'anulado' and d.tipo <> 'F3'
                                and d.fecha_expedicion between v_desde - v_dias and v_desde - 1)
    ) into v_cobro;
    v_res := v_res || jsonb_build_object('cobros', v_cobro);
  end if;
  return v_res;
end $$;

revoke all on function public.carta_informe(text, text, jsonb) from public;
grant execute on function public.carta_informe(text, text, jsonb) to anon, authenticated;
