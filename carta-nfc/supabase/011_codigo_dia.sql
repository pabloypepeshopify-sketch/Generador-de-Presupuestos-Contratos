-- =============================================================================
-- 011 · Código del día (versión "Solo pedidos"): 4 cifras que cambian solas cada día a las 5:00 (hora del bar),
-- se ven en el panel del bar y hacen falta para pedir. Así nadie pide desde casa con el enlace de otro día.
-- Si alguien lo filtra, "↻" en el panel lo cambia al momento. Es una alternativa al código de mesa (009):
-- el bar elige en Gestión → Ajustes: sin código, código del día o código por mesa.
-- Idempotente y sin drop. Viene apagado: un bar que ya existe sigue exactamente igual.
--
--   carta.restaurantes.codigo_dia     si está activo, para pedir hace falta el código de hoy
--   carta.restaurantes.clave_dia_sal  secreto del bar (nunca sale): el código de cada día se calcula con él
--   carta._clave_dia(restaurante)     código de hoy (cambia a las 5:00 para no cortar la noche)
--   public.carta_pedir                la de 009 + la comprobación del código del día
--   public.carta_mesa                 la de 009 + el código del día
--   public.carta_panel                la de 010 + modo de código, código de hoy y ↻
-- =============================================================================

alter table carta.restaurantes add column if not exists codigo_dia boolean not null default false;
alter table carta.restaurantes add column if not exists clave_dia_sal text not null default md5(random()::text || clock_timestamp()::text);

-- Código de hoy: md5 del secreto del bar y la fecha (el día empieza a las 5:00, hora del bar), 4 cifras.
create or replace function carta._clave_dia(r carta.restaurantes) returns text
language sql stable set search_path = '' as $$
  select lpad(((('x' || substr(md5(r.clave_dia_sal || ':'
           || ((now() at time zone r.zona_horaria) - interval '5 hours')::date::text), 1, 7))::bit(28)::int) % 10000)::text, 4, '0');
$$;

-- carta_pedir: idéntica a la de 009 salvo el bloque "011 · Código del día".
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
  -- 011 · Código del día: si el bar lo tiene activo, hace falta el código de hoy (lo pasa carta_pedir_mesa).
  if r.codigo_dia and coalesce(current_setting('carta.codigo_mesa', true), '') <> carta._clave_dia(r) then
    raise exception 'codigo_dia';
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

-- carta_mesa: la de 009 + el código del día. Con código (de mesa o del día), las líneas solo con el código bueno.
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
    return jsonb_build_object('codigo_mesa', true, 'codigo_dia', false, 'abierta', v_abierta, 'valido', false,
                              'lineas', '[]'::jsonb, 'total', 0);
  end if;
  if r.codigo_dia and coalesce(trim(p_codigo), '') <> carta._clave_dia(r) then
    return jsonb_build_object('codigo_mesa', false, 'codigo_dia', true, 'abierta', true, 'valido', false,
                              'lineas', '[]'::jsonb, 'total', 0);
  end if;
  return jsonb_build_object(
    'codigo_mesa', r.codigo_mesa, 'codigo_dia', r.codigo_dia, 'abierta', v_abierta, 'valido', true,
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

-- carta_panel: la de 010 + 'ajuste_codigo' con modo (ninguno / dia / mesa), 'nueva_clave_dia' (↻ en el panel)
-- y, en los datos, si hay código del día y cuál es hoy.
create or replace function public.carta_panel(p_slug text, p_clave text, p_accion text default 'datos', p_datos jsonb default '{}')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r       carta.restaurantes;
  d       jsonb := coalesce(p_datos, '{}'::jsonb);
  v_extra jsonb := '{}'::jsonb;
  v_cod   text;
  v_admin boolean;
begin
  r := carta._auth(p_slug, p_clave, 'cocina');
  v_admin := r.admin_hash = carta._hash(p_clave);

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
    when 'ajuste_codigo' then  -- código para pedir: ninguno, del día o por mesa (solo con la clave del dueño)
      if not v_admin then raise exception 'clave_incorrecta'; end if;
      if d ? 'modo' then
        if d->>'modo' not in ('ninguno', 'dia', 'mesa') then raise exception 'accion_no_valida'; end if;
        update carta.restaurantes set codigo_mesa = (d->>'modo' = 'mesa'), codigo_dia = (d->>'modo' = 'dia')
         where id = r.id returning * into r;
      else  -- como en 009: { activo } enciende o apaga el código de mesa
        update carta.restaurantes set codigo_mesa = coalesce((d->>'activo')::boolean, false),
               codigo_dia = case when coalesce((d->>'activo')::boolean, false) then false else codigo_dia end
         where id = r.id returning * into r;
      end if;
    when 'nueva_clave_dia' then  -- ↻ en el panel: el código de hoy cambia al momento (si alguien lo ha filtrado)
      update carta.restaurantes set clave_dia_sal = md5(random()::text || clock_timestamp()::text)
       where id = r.id returning * into r;
    when 'extras' then  -- WiFi, enlace de reseñas y trivial: solo el dueño
      if not v_admin then raise exception 'clave_incorrecta'; end if;
      if nullif(trim(coalesce(d->>'resena_url', '')), '') !~ '^https://[^\s]+$' then raise exception 'web_no_valida'; end if;
      update carta.restaurantes set
        wifi_red   = case when d ? 'wifi_red' then nullif(trim(d->>'wifi_red'), '') else wifi_red end,
        wifi_clave = case when d ? 'wifi_clave' then nullif(trim(d->>'wifi_clave'), '') else wifi_clave end,
        resena_url = case when d ? 'resena_url' then nullif(trim(d->>'resena_url'), '') else resena_url end,
        trivia     = case when d ? 'trivia' then coalesce((d->>'trivia')::boolean, false) else trivia end
       where id = r.id returning * into r;
    when 'opciones' then  -- opciones de un plato: solo el dueño
      if not v_admin then raise exception 'clave_incorrecta'; end if;
      update carta.productos set opciones = carta._opciones(d->'opciones')
       where id = carta._uuid(d->>'id') and restaurante_id = r.id;
      if not found then raise exception 'no_encontrado'; end if;
    when 'opiniones' then  -- últimas valoraciones con su comentario: solo el dueño
      if not v_admin then raise exception 'clave_incorrecta'; end if;
      v_extra := jsonb_build_object('opiniones', coalesce((
        select jsonb_agg(jsonb_build_object('estrellas', x.estrellas, 'comentario', x.comentario, 'mesa', x.mesa_nombre,
                                            'creado', x.creado) order by x.creado desc, x.id desc)
          from (select * from carta.valoraciones where restaurante_id = r.id order by creado desc, id desc limit 100) x), '[]'::jsonb));
    else
      raise exception 'accion_no_valida';
  end case;

  return jsonb_build_object(
    'codigo_mesa', r.codigo_mesa,
    'codigo_dia', r.codigo_dia,
    'clave_dia', case when r.codigo_dia then carta._clave_dia(r) end,
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
       where c.lista is not null), '[]'::jsonb),
    'mesas_activas', (select count(distinct p.mesa_id) from carta.pedidos p
                       where p.restaurante_id = r.id and not p.cerrado and p.tipo = 'pedido' and p.estado <> 'cancelado'
                         and p.creado > now() - interval '18 hours'),
    'valoracion', (select jsonb_build_object('media', round(avg(v.estrellas), 1), 'n', count(*))
                     from carta.valoraciones v where v.restaurante_id = r.id and v.creado > now() - interval '30 days'),
    'wifi_red', case when v_admin then r.wifi_red end,
    'wifi_clave', case when v_admin then r.wifi_clave end,
    'resena_url', case when v_admin then r.resena_url end,
    'trivia', r.trivia,
    'trivia_top', case when r.trivia then carta._trivia_ranking(r.id, r.zona_horaria, 3) end,
    'opciones', case when v_admin then coalesce((select jsonb_object_agg(p.id, p.opciones) from carta.productos p
                                                  where p.restaurante_id = r.id and p.opciones is not null), '{}'::jsonb) end
  ) || v_extra;
end $$;

revoke all on function carta._clave_dia(carta.restaurantes) from public, anon, authenticated;
