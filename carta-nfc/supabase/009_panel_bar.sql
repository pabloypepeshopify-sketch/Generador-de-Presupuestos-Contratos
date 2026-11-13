-- =============================================================================
-- 009 · Panel del bar (versión "Solo pedidos"): mapa de mesas, agotados desde el panel,
-- la cuenta de la mesa en el móvil del cliente y el "código de mesa" opcional que da el camarero.
-- Idempotente y sin drop. Todo lo nuevo viene apagado: un bar que ya existe sigue exactamente igual.
--
--   carta.restaurantes.codigo_mesa   si está activo, para pedir hace falta el código de la mesa
--   carta.mesas.clave_sesion         código de 4 cifras de la mesa abierta (null = sin abrir)
--   public.carta_panel(slug, clave de cocina o admin, accion, datos)
--       datos | disponible (agotado) | abrir (nuevo código) | cerrar_mesa | ajuste_codigo (solo admin)
--   public.carta_mesa(mesa, codigo)                  lo que lleva pedido la mesa (para el cliente)
--   public.carta_pedir_mesa(mesa, codigo, lineas, nota)   carta_pedir con el código de la mesa
--   public.carta_pedir                               la de 001 + la comprobación del código
-- =============================================================================

alter table carta.restaurantes add column if not exists codigo_mesa boolean not null default false;
alter table carta.mesas add column if not exists clave_sesion text check (clave_sesion ~ '^[0-9]{4}$');
alter table carta.mesas add column if not exists abierta_en timestamptz;

-- carta_pedir: idéntica a 001_esquema.sql salvo el bloque "009 · Código de mesa".
create or replace function public.carta_pedir(p_mesa text, p_lineas jsonb, p_nota text default null)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r      carta.restaurantes;
  m      carta.mesas;
  v      carta.pedidos;
  prod   carta.productos;
  l      jsonb;
  v_cant int;
  v_tot  numeric(10,2) := 0;
  v_n    int;
begin
  select * into m from carta.mesas where codigo = lower(trim(coalesce(p_mesa, ''))) and activa;
  if not found then raise exception 'mesa_no_valida'; end if;
  select * into r from carta.restaurantes where id = m.restaurante_id;
  if not r.activo then raise exception 'restaurante_no_encontrado'; end if;
  if not r.pedidos_abiertos then raise exception 'pedidos_cerrados'; end if;

  -- 009 · Código de mesa: si el bar lo tiene activo, solo pide quien tiene el código que dio el camarero
  -- (lo pasa carta_pedir_mesa). Un código vale 12 horas o hasta que se libera la mesa.
  if r.codigo_mesa and (m.clave_sesion is null or m.abierta_en is null or m.abierta_en < now() - interval '12 hours'
       or coalesce(current_setting('carta.codigo_mesa', true), '') <> m.clave_sesion) then
    raise exception 'codigo_mesa';
  end if;

  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'pedido_vacio';
  end if;
  if jsonb_array_length(p_lineas) > 40 then raise exception 'pedido_demasiado_grande'; end if;
  if length(coalesce(p_nota, '')) > 300 then raise exception 'nota_demasiado_larga'; end if;

  -- Anti-broma: máx. 6 pedidos por mesa y minuto.
  select count(*) into v_n from carta.pedidos
   where mesa_id = m.id and tipo = 'pedido' and creado > now() - interval '1 minute';
  if v_n >= 6 then raise exception 'demasiados_pedidos'; end if;

  v := carta._nuevo_pedido(r, m, 'pedido', p_nota);

  for l in select value from jsonb_array_elements(p_lineas) loop
    if jsonb_typeof(l) <> 'object' or coalesce(l->>'cantidad', '') !~ '^[0-9]{1,2}$' then
      raise exception 'cantidad_no_valida';
    end if;
    v_cant := (l->>'cantidad')::int;
    if v_cant not between 1 and 20 then raise exception 'cantidad_no_valida'; end if;
    if length(coalesce(l->>'nota', '')) > 140 then raise exception 'nota_demasiado_larga'; end if;

    select x.* into prod
      from carta.productos x
      left join carta.categorias c on c.id = x.categoria_id
     where x.id = carta._uuid(l->>'producto_id') and x.restaurante_id = r.id
       and (x.categoria_id is null or c.activa);
    if not found then raise exception 'producto_no_valido'; end if;
    if not prod.disponible then raise exception 'producto_agotado:%', prod.nombre; end if;

    insert into carta.pedido_lineas (pedido_id, producto_id, nombre, precio, cantidad, nota)
    values (v.id, prod.id, prod.nombre, prod.precio, v_cant, nullif(trim(l->>'nota'), ''));
    v_tot := v_tot + prod.precio * v_cant;
  end loop;

  update carta.pedidos set total = v_tot where id = v.id returning * into v;
  return jsonb_build_object('numero', v.numero, 'token', v.token, 'total', v.total,
                            'mesa', v.mesa_nombre, 'estado', v.estado, 'creado', v.creado);
end $$;


create or replace function public.carta_pedir_mesa(p_mesa text, p_codigo text, p_lineas jsonb, p_nota text default null)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform set_config('carta.codigo_mesa', coalesce(trim(p_codigo), ''), true);  -- solo para esta transacción
  return public.carta_pedir(p_mesa, p_lineas, p_nota);
end $$;

-- Lo que lleva pedido la mesa (sin cobrar): lo ve cualquiera sentado en ella. Con código de mesa, solo con el código.
create or replace function public.carta_mesa(p_mesa text, p_codigo text default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r carta.restaurantes;
  m carta.mesas;
  v_abierta boolean;
begin
  select * into m from carta.mesas where codigo = lower(trim(coalesce(p_mesa, ''))) and activa;
  if not found then raise exception 'mesa_no_valida'; end if;
  select * into r from carta.restaurantes where id = m.restaurante_id;
  if not r.activo then raise exception 'restaurante_no_encontrado'; end if;
  v_abierta := m.clave_sesion is not null and m.abierta_en > now() - interval '12 hours';
  if r.codigo_mesa and (not v_abierta or coalesce(trim(p_codigo), '') <> m.clave_sesion) then
    return jsonb_build_object('codigo_mesa', true, 'abierta', v_abierta, 'valido', false, 'lineas', '[]'::jsonb, 'total', 0);
  end if;
  return jsonb_build_object(
    'codigo_mesa', r.codigo_mesa, 'abierta', v_abierta, 'valido', true,
    'lineas', coalesce((
      select jsonb_agg(jsonb_build_object('nombre', x.nombre, 'cantidad', x.cantidad, 'importe', x.importe) order by x.primero)
        from (select l.nombre, sum(l.cantidad) as cantidad, sum(l.cantidad * l.precio) as importe, min(l.id) as primero
                from carta.pedido_lineas l join carta.pedidos p on p.id = l.pedido_id
               where p.mesa_id = m.id and p.tipo = 'pedido' and not p.cerrado and p.estado <> 'cancelado'
                 and p.creado > now() - interval '18 hours'
               group by l.nombre, l.precio) x), '[]'::jsonb),
    'total', coalesce((select sum(p.total) from carta.pedidos p
                        where p.mesa_id = m.id and p.tipo = 'pedido' and not p.cerrado and p.estado <> 'cancelado'
                          and p.creado > now() - interval '18 hours'), 0));
end $$;

create or replace function public.carta_panel(p_slug text, p_clave text, p_accion text default 'datos', p_datos jsonb default '{}')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r       carta.restaurantes;
  d       jsonb := coalesce(p_datos, '{}'::jsonb);
  v_extra jsonb := '{}'::jsonb;
  v_cod   text;
begin
  r := carta._auth(p_slug, p_clave, 'cocina');

  case coalesce(p_accion, 'datos')
    when 'datos' then
      null;
    when 'disponible' then  -- "Agotado" en un toque desde el panel o la pantalla de cocina
      update carta.productos set disponible = coalesce((d->>'disponible')::boolean, true)
       where id = carta._uuid(d->>'id') and restaurante_id = r.id;
      if not found then raise exception 'no_encontrado'; end if;
    when 'abrir' then  -- abre la mesa con un código nuevo de 4 cifras (el anterior deja de valer)
      v_cod := lpad(floor(random() * 10000)::int::text, 4, '0');
      update carta.mesas set clave_sesion = v_cod, abierta_en = now()
       where id = carta._uuid(d->>'mesa_id') and restaurante_id = r.id and activa;
      if not found then raise exception 'no_encontrado'; end if;
      v_extra := jsonb_build_object('codigo', v_cod);
    when 'cerrar_mesa' then
      update carta.mesas set clave_sesion = null, abierta_en = null
       where id = carta._uuid(d->>'mesa_id') and restaurante_id = r.id;
    when 'ajuste_codigo' then  -- activar/desactivar el código de mesa: solo con la clave del dueño
      if r.admin_hash <> carta._hash(p_clave) then raise exception 'clave_incorrecta'; end if;
      update carta.restaurantes set codigo_mesa = coalesce((d->>'activo')::boolean, false)
       where id = r.id returning * into r;
    else
      raise exception 'accion_no_valida';
  end case;

  return jsonb_build_object(
    'codigo_mesa', r.codigo_mesa,
    'mesas', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'nombre', x.nombre,
               'clave', case when x.abierta_en > now() - interval '12 hours' then x.clave_sesion end)
             order by x.orden, x.nombre)
        from carta.mesas x where x.restaurante_id = r.id and x.activa), '[]'::jsonb),
    'categorias', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'productos', c.lista) order by c.orden, c.nombre)
        from (select c.id, c.nombre, c.orden,
                     (select jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'disponible', p.disponible)
                                       order by p.orden, p.nombre)
                        from carta.productos p where p.categoria_id = c.id) as lista
                from carta.categorias c where c.restaurante_id = r.id and c.activa) c
       where c.lista is not null), '[]'::jsonb)
  ) || v_extra;
end $$;

revoke all on function public.carta_pedir_mesa(text, text, jsonb, text) from public;
revoke all on function public.carta_mesa(text, text) from public;
revoke all on function public.carta_panel(text, text, text, jsonb) from public;
grant execute on function public.carta_pedir_mesa(text, text, jsonb, text) to anon, authenticated;
grant execute on function public.carta_mesa(text, text) to anon, authenticated;
grant execute on function public.carta_panel(text, text, text, jsonb) to anon, authenticated;
