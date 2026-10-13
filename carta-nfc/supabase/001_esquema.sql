-- =============================================================================
-- Carta NFC — pedidos desde la mesa
-- -----------------------------------------------------------------------------
-- Las tablas viven en el schema privado `carta` (NO expuesto por la API).
-- El navegador solo puede llamar a las funciones public.carta_* (SECURITY DEFINER),
-- que validan todo en el servidor: precios, mesa, claves de cocina/admin.
--
--   carta_menu        público   carta del restaurante (+ mesa si viene del NFC)
--   carta_pedir       público   crea un pedido para la mesa del NFC
--   carta_avisar      público   "llamar camarero" / "pedir la cuenta"
--   carta_estado      público   estado de los pedidos del cliente (por token)
--   carta_cocina      clave cocina o admin   panel de comandas
--   carta_admin       clave admin            carta, mesas, NFC, ajustes
--   carta_plataforma  clave plataforma       alta de restaurantes (tú, el vendedor)
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

create schema if not exists carta;
revoke all on schema carta from public;

-- ---------------------------------------------------------------- tablas ----

create table if not exists carta.plataforma (
  id          int primary key default 1 check (id = 1),
  clave_hash  text not null
);

create table if not exists carta.restaurantes (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  nombre           text not null check (length(nombre) between 1 and 80),
  mensaje          text check (length(mensaje) <= 280),
  color            text not null default '#c2410c' check (color ~ '^#[0-9a-fA-F]{6}$'),
  moneda           text not null default 'EUR' check (moneda ~ '^[A-Z]{3}$'),
  zona_horaria     text not null default 'Europe/Madrid',
  activo           boolean not null default true,
  pedidos_abiertos boolean not null default true,
  mesa_libre       boolean not null default true,  -- sin NFC de mesa, el cliente elige la mesa
  admin_hash       text not null,
  cocina_hash      text not null,
  creado           timestamptz not null default now()
);

create table if not exists carta.mesas (
  id              uuid primary key default gen_random_uuid(),
  restaurante_id  uuid not null references carta.restaurantes(id) on delete cascade,
  nombre          text not null check (length(nombre) between 1 and 40),
  codigo          text not null unique default encode(extensions.gen_random_bytes(5), 'hex'),
  orden           int not null default 0,
  activa          boolean not null default true,
  unique (restaurante_id, nombre)
);
create index if not exists mesas_restaurante_idx on carta.mesas (restaurante_id);

create table if not exists carta.categorias (
  id              uuid primary key default gen_random_uuid(),
  restaurante_id  uuid not null references carta.restaurantes(id) on delete cascade,
  nombre          text not null check (length(nombre) between 1 and 60),
  orden           int not null default 0,
  activa          boolean not null default true
);
create index if not exists categorias_restaurante_idx on carta.categorias (restaurante_id);

-- 14 alérgenos de declaración obligatoria (Reglamento UE 1169/2011)
create table if not exists carta.productos (
  id              uuid primary key default gen_random_uuid(),
  restaurante_id  uuid not null references carta.restaurantes(id) on delete cascade,
  categoria_id    uuid references carta.categorias(id) on delete set null,
  nombre          text not null check (length(nombre) between 1 and 80),
  descripcion     text check (length(descripcion) <= 300),
  precio          numeric(10,2) not null check (precio >= 0 and precio < 100000),
  alergenos       text[] not null default '{}' check (alergenos <@ array[
                    'gluten','crustaceos','huevo','pescado','cacahuete','soja','lacteos',
                    'frutos_cascara','apio','mostaza','sesamo','sulfitos','altramuces','moluscos']),
  imagen_url      text check (imagen_url ~ '^https://'),
  disponible      boolean not null default true,
  orden           int not null default 0
);
create index if not exists productos_restaurante_idx on carta.productos (restaurante_id);
create index if not exists productos_categoria_idx on carta.productos (categoria_id);

-- Pedidos y avisos (llamar camarero / pedir cuenta) comparten tabla y panel.
create table if not exists carta.pedidos (
  id              uuid primary key default gen_random_uuid(),
  restaurante_id  uuid not null references carta.restaurantes(id) on delete cascade,
  mesa_id         uuid references carta.mesas(id) on delete set null,
  mesa_nombre     text not null,
  numero          int not null default 0,  -- nº de comanda del día; 0 en avisos
  tipo            text not null default 'pedido' check (tipo in ('pedido','camarero','cuenta')),
  estado          text not null default 'nuevo'
                    check (estado in ('nuevo','preparando','listo','servido','cancelado')),
  nota            text check (length(nota) <= 300),
  total           numeric(10,2) not null default 0,
  token           text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  cerrado         boolean not null default false,  -- mesa cobrada
  creado          timestamptz not null default now(),
  actualizado     timestamptz not null default now()
);
create index if not exists pedidos_panel_idx on carta.pedidos (restaurante_id, cerrado, creado desc);
create index if not exists pedidos_mesa_idx on carta.pedidos (mesa_id, creado desc);

create table if not exists carta.pedido_lineas (
  id           bigint generated always as identity primary key,
  pedido_id    uuid not null references carta.pedidos(id) on delete cascade,
  producto_id  uuid references carta.productos(id) on delete set null,
  nombre       text not null,
  precio       numeric(10,2) not null,
  cantidad     int not null check (cantidad between 1 and 20),
  nota         text check (length(nota) <= 140)
);
create index if not exists pedido_lineas_pedido_idx on carta.pedido_lineas (pedido_id);

-- Defensa en profundidad: aunque el schema no está expuesto, RLS sin políticas.
alter table carta.plataforma    enable row level security;
alter table carta.restaurantes  enable row level security;
alter table carta.mesas         enable row level security;
alter table carta.categorias    enable row level security;
alter table carta.productos     enable row level security;
alter table carta.pedidos       enable row level security;
alter table carta.pedido_lineas enable row level security;
revoke all on all tables in schema carta from public, anon, authenticated;

-- ------------------------------------------------------- utilidades internas ----

create or replace function carta._hash(p text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(coalesce(p, ''), 'sha256'), 'hex')
$$;

create or replace function carta._clave() returns text
language sql volatile set search_path = '' as $$
  select encode(extensions.gen_random_bytes(12), 'hex')
$$;

create or replace function carta._uuid(p text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  if p is null then return null; end if;
  if lower(p) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'id_no_valido';
  end if;
  return p::uuid;
end $$;

create or replace function carta._alergenos(p jsonb) returns text[]
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p) = 'array'
              then coalesce(array(select jsonb_array_elements_text(p)), '{}')
              else '{}'::text[] end
$$;

create or replace function carta._inicio_dia(r carta.restaurantes) returns timestamptz
language sql stable set search_path = '' as $$
  select date_trunc('day', now() at time zone r.zona_horaria) at time zone r.zona_horaria
$$;

-- Devuelve el restaurante si la clave es la de admin, o la de cocina cuando p_nivel = 'cocina'.
create or replace function carta._auth(p_slug text, p_clave text, p_nivel text)
returns carta.restaurantes
language plpgsql stable security definer set search_path = '' as $$
declare
  r carta.restaurantes;
begin
  select * into r from carta.restaurantes where slug = lower(trim(coalesce(p_slug, '')));
  if not found or coalesce(p_clave, '') = '' or not (
       r.admin_hash = carta._hash(p_clave)
       or (p_nivel = 'cocina' and r.cocina_hash = carta._hash(p_clave))) then
    raise exception 'clave_incorrecta';
  end if;
  return r;
end $$;

create or replace function carta._nuevo_pedido(r carta.restaurantes, m carta.mesas, p_tipo text, p_nota text)
returns carta.pedidos
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_num int := 0;
  v carta.pedidos;
begin
  if p_tipo = 'pedido' then
    perform pg_advisory_xact_lock(hashtext('carta.pedidos:' || r.id::text));
    select coalesce(max(numero), 0) + 1 into v_num
      from carta.pedidos
     where restaurante_id = r.id and creado >= carta._inicio_dia(r);
  end if;
  insert into carta.pedidos (restaurante_id, mesa_id, mesa_nombre, numero, tipo, nota)
  values (r.id, m.id, m.nombre, v_num, p_tipo, nullif(trim(p_nota), ''))
  returning * into v;
  return v;
end $$;

create or replace function carta._pedido_json(p carta.pedidos) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'tipo', p.tipo, 'estado', p.estado,
    'mesa_id', p.mesa_id, 'mesa', p.mesa_nombre, 'nota', p.nota, 'total', p.total,
    'cerrado', p.cerrado, 'creado', p.creado, 'actualizado', p.actualizado,
    'lineas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'nombre', l.nombre, 'precio', l.precio, 'cantidad', l.cantidad, 'nota', l.nota)
             order by l.id)
        from carta.pedido_lineas l where l.pedido_id = p.id), '[]'::jsonb))
$$;

-- Crea restaurante + N mesas. Claves null => se generan. Devuelve las claves en claro (única vez).
create or replace function carta._alta(p_nombre text, p_slug text, p_mesas int,
                                       p_clave_admin text default null, p_clave_cocina text default null)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_admin  text := coalesce(nullif(p_clave_admin, ''), carta._clave());
  v_cocina text := coalesce(nullif(p_clave_cocina, ''), carta._clave());
  v_id     uuid;
  v_slug   text := lower(trim(coalesce(p_slug, '')));
begin
  if coalesce(p_mesas, 0) not between 0 and 200 then raise exception 'mesas_no_valido'; end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then raise exception 'slug_no_valido'; end if;
  if length(trim(coalesce(p_nombre, ''))) = 0 then raise exception 'nombre_obligatorio'; end if;
  begin
    insert into carta.restaurantes (slug, nombre, admin_hash, cocina_hash)
    values (v_slug, trim(p_nombre), carta._hash(v_admin), carta._hash(v_cocina))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'slug_ocupado';
  end;
  insert into carta.mesas (restaurante_id, nombre, orden)
  select v_id, 'Mesa ' || i, i from generate_series(1, coalesce(p_mesas, 0)) i;
  return jsonb_build_object('slug', v_slug, 'clave_admin', v_admin, 'clave_cocina', v_cocina);
end $$;

-- Para ejecutar en el SQL Editor de Supabase: fija/cambia tu clave de plataforma.
create or replace function carta.fijar_clave_plataforma(p_clave text) returns text
language plpgsql volatile security definer set search_path = '' as $$
begin
  if length(coalesce(p_clave, '')) < 12 then raise exception 'La clave debe tener al menos 12 caracteres'; end if;
  insert into carta.plataforma (id, clave_hash) values (1, carta._hash(p_clave))
  on conflict (id) do update set clave_hash = excluded.clave_hash;
  return 'ok';
end $$;

revoke all on all functions in schema carta from public, anon, authenticated;

-- ----------------------------------------------------- API pública (cliente) ----

create or replace function public.carta_menu(p_slug text default null, p_mesa text default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r carta.restaurantes;
  m carta.mesas;
begin
  if nullif(trim(coalesce(p_mesa, '')), '') is not null then
    select * into m from carta.mesas where codigo = lower(trim(p_mesa)) and activa;
    if found then
      select * into r from carta.restaurantes where id = m.restaurante_id;
    end if;
  end if;
  if r.id is null then
    select * into r from carta.restaurantes where slug = lower(trim(coalesce(p_slug, '')));
  end if;
  if r.id is null or not r.activo then
    raise exception 'restaurante_no_encontrado';
  end if;

  return jsonb_build_object(
    'restaurante', jsonb_build_object(
      'slug', r.slug, 'nombre', r.nombre, 'mensaje', r.mensaje, 'color', r.color,
      'moneda', r.moneda, 'pedidos_abiertos', r.pedidos_abiertos, 'mesa_libre', r.mesa_libre),
    'mesa', case when m.id is not null
                 then jsonb_build_object('codigo', m.codigo, 'nombre', m.nombre) end,
    'mesas', case when r.mesa_libre then coalesce((
               select jsonb_agg(jsonb_build_object('codigo', x.codigo, 'nombre', x.nombre)
                                order by x.orden, x.nombre)
                 from carta.mesas x where x.restaurante_id = r.id and x.activa), '[]'::jsonb)
             else '[]'::jsonb end,
    'categorias',
      coalesce((
        select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'productos', p.lista)
                         order by c.orden, c.nombre)
          from carta.categorias c
          cross join lateral (
            select jsonb_agg(jsonb_build_object(
                     'id', x.id, 'nombre', x.nombre, 'descripcion', x.descripcion,
                     'precio', x.precio, 'alergenos', to_jsonb(x.alergenos),
                     'imagen_url', x.imagen_url, 'disponible', x.disponible)
                   order by x.orden, x.nombre) as lista
              from carta.productos x where x.categoria_id = c.id) p
         where c.restaurante_id = r.id and c.activa and p.lista is not null), '[]'::jsonb)
      ||
      coalesce((
        select jsonb_build_array(jsonb_build_object('id', null, 'nombre', 'Otros', 'productos',
                 jsonb_agg(jsonb_build_object(
                   'id', x.id, 'nombre', x.nombre, 'descripcion', x.descripcion,
                   'precio', x.precio, 'alergenos', to_jsonb(x.alergenos),
                   'imagen_url', x.imagen_url, 'disponible', x.disponible)
                 order by x.orden, x.nombre)))
          from carta.productos x
         where x.restaurante_id = r.id and x.categoria_id is null
        having count(*) > 0), '[]'::jsonb)
  );
end $$;

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

create or replace function public.carta_avisar(p_mesa text, p_tipo text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r carta.restaurantes;
  m carta.mesas;
begin
  if p_tipo not in ('camarero', 'cuenta') then raise exception 'aviso_no_valido'; end if;
  select * into m from carta.mesas where codigo = lower(trim(coalesce(p_mesa, ''))) and activa;
  if not found then raise exception 'mesa_no_valida'; end if;
  select * into r from carta.restaurantes where id = m.restaurante_id;
  if not r.activo then raise exception 'restaurante_no_encontrado'; end if;

  -- Si ya hay un aviso igual sin atender, no se duplica.
  if exists (select 1 from carta.pedidos
              where mesa_id = m.id and tipo = p_tipo and estado = 'nuevo' and not cerrado
                and creado > now() - interval '30 minutes') then
    return jsonb_build_object('ok', true, 'repetido', true);
  end if;
  perform carta._nuevo_pedido(r, m, p_tipo, null);
  return jsonb_build_object('ok', true, 'repetido', false);
end $$;

create or replace function public.carta_estado(p_tokens text[])
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(array_length(p_tokens, 1), 0) = 0 then return '[]'::jsonb; end if;
  if array_length(p_tokens, 1) > 30 then raise exception 'demasiados_tokens'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'token', p.token, 'numero', p.numero, 'estado', p.estado, 'total', p.total,
             'mesa', p.mesa_nombre, 'creado', p.creado) order by p.creado desc)
      from carta.pedidos p where p.token = any(p_tokens) and p.tipo = 'pedido'), '[]'::jsonb);
end $$;

-- --------------------------------------------------------- panel de cocina ----

create or replace function public.carta_cocina(p_slug text, p_clave text,
                                               p_accion text default 'listar', p_datos jsonb default '{}')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r carta.restaurantes;
  d jsonb := coalesce(p_datos, '{}'::jsonb);
begin
  r := carta._auth(p_slug, p_clave, 'cocina');

  case coalesce(p_accion, 'listar')
    when 'listar' then
      null;
    when 'estado' then
      if coalesce(d->>'estado', '') not in ('nuevo','preparando','listo','servido','cancelado') then
        raise exception 'estado_no_valido';
      end if;
      update carta.pedidos set estado = d->>'estado', actualizado = now()
       where id = carta._uuid(d->>'id') and restaurante_id = r.id;
      if not found then raise exception 'pedido_no_encontrado'; end if;
    when 'cerrar' then  -- mesa cobrada: se archivan sus pedidos
      if coalesce(jsonb_typeof(d->'ids'), '') <> 'array' then raise exception 'ids_no_validos'; end if;
      update carta.pedidos set cerrado = true, actualizado = now()
       where restaurante_id = r.id
         and id in (select carta._uuid(x) from jsonb_array_elements_text(d->'ids') x);
    when 'pausa' then
      update carta.restaurantes set pedidos_abiertos = coalesce((d->>'abiertos')::boolean, true)
       where id = r.id returning * into r;
    else
      raise exception 'accion_no_valida';
  end case;

  return jsonb_build_object(
    'restaurante', jsonb_build_object('slug', r.slug, 'nombre', r.nombre, 'color', r.color,
                                      'moneda', r.moneda, 'pedidos_abiertos', r.pedidos_abiertos),
    'es_admin', r.admin_hash = carta._hash(p_clave),
    'ahora', now(),
    'pedidos', coalesce((
      select jsonb_agg(carta._pedido_json(p) order by p.creado, p.numero)
        from carta.pedidos p
       where p.restaurante_id = r.id and not p.cerrado and p.creado > now() - interval '18 hours'),
      '[]'::jsonb));
end $$;

-- ---------------------------------------------------------- administración ----

create or replace function public.carta_admin(p_slug text, p_clave text,
                                              p_accion text default 'datos', p_datos jsonb default '{}')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r       carta.restaurantes;
  d       jsonb := coalesce(p_datos, '{}'::jsonb);
  v_id    uuid;
  v_extra jsonb := '{}'::jsonb;
  v_clave text;
  v_ini   timestamptz;
  v_desde int;
  v_hasta int;
  v_cat   uuid;
begin
  r := carta._auth(p_slug, p_clave, 'admin');
  v_id := carta._uuid(nullif(d->>'id', ''));

  case coalesce(p_accion, 'datos')
    when 'datos' then
      null;

    when 'ajustes' then
      if d ? 'color' and coalesce(d->>'color', '') !~ '^#[0-9a-fA-F]{6}$' then
        raise exception 'color_no_valido';
      end if;
      update carta.restaurantes set
        nombre           = coalesce(nullif(trim(d->>'nombre'), ''), nombre),
        mensaje          = case when d ? 'mensaje' then nullif(trim(d->>'mensaje'), '') else mensaje end,
        color            = coalesce(d->>'color', color),
        mesa_libre       = coalesce((d->>'mesa_libre')::boolean, mesa_libre),
        pedidos_abiertos = coalesce((d->>'pedidos_abiertos')::boolean, pedidos_abiertos)
       where id = r.id returning * into r;

    when 'categoria' then
      if length(trim(coalesce(d->>'nombre', ''))) = 0 then raise exception 'nombre_obligatorio'; end if;
      if v_id is null then
        insert into carta.categorias (restaurante_id, nombre, orden, activa)
        values (r.id, trim(d->>'nombre'),
                coalesce((d->>'orden')::int,
                         (select coalesce(max(orden), 0) + 1 from carta.categorias where restaurante_id = r.id)),
                coalesce((d->>'activa')::boolean, true))
        returning id into v_id;
      else
        update carta.categorias set
          nombre = trim(d->>'nombre'),
          orden  = coalesce((d->>'orden')::int, orden),
          activa = coalesce((d->>'activa')::boolean, activa)
         where id = v_id and restaurante_id = r.id;
        if not found then raise exception 'no_encontrado'; end if;
      end if;
      v_extra := jsonb_build_object('id', v_id);

    when 'borrar_categoria' then
      delete from carta.categorias where id = v_id and restaurante_id = r.id;

    when 'producto' then
      if length(trim(coalesce(d->>'nombre', ''))) = 0 then raise exception 'nombre_obligatorio'; end if;
      if coalesce(d->>'precio', '') !~ '^[0-9]{1,5}([.][0-9]{1,2})?$' then raise exception 'precio_no_valido'; end if;
      v_cat := carta._uuid(nullif(d->>'categoria_id', ''));
      if v_cat is not null and not exists (
           select 1 from carta.categorias where id = v_cat and restaurante_id = r.id) then
        raise exception 'categoria_no_valida';
      end if;
      if v_id is null then
        insert into carta.productos (restaurante_id, categoria_id, nombre, descripcion, precio,
                                     alergenos, imagen_url, disponible, orden)
        values (r.id, v_cat, trim(d->>'nombre'), nullif(trim(d->>'descripcion'), ''),
                (d->>'precio')::numeric,
                carta._alergenos(d->'alergenos'),
                nullif(trim(d->>'imagen_url'), ''),
                coalesce((d->>'disponible')::boolean, true),
                coalesce((d->>'orden')::int,
                         (select coalesce(max(orden), 0) + 1 from carta.productos where restaurante_id = r.id)))
        returning id into v_id;
      else
        update carta.productos set
          categoria_id = v_cat,
          nombre       = trim(d->>'nombre'),
          descripcion  = nullif(trim(d->>'descripcion'), ''),
          precio       = (d->>'precio')::numeric,
          alergenos    = carta._alergenos(d->'alergenos'),
          imagen_url   = nullif(trim(d->>'imagen_url'), ''),
          disponible   = coalesce((d->>'disponible')::boolean, disponible),
          orden        = coalesce((d->>'orden')::int, orden)
         where id = v_id and restaurante_id = r.id;
        if not found then raise exception 'no_encontrado'; end if;
      end if;
      v_extra := jsonb_build_object('id', v_id);

    when 'disponible' then  -- marcar agotado / disponible rápido
      update carta.productos set disponible = coalesce((d->>'disponible')::boolean, true)
       where id = v_id and restaurante_id = r.id;

    when 'borrar_producto' then
      delete from carta.productos where id = v_id and restaurante_id = r.id;

    when 'mesa' then
      if length(trim(coalesce(d->>'nombre', ''))) = 0 then raise exception 'nombre_obligatorio'; end if;
      begin
        if v_id is null then
          insert into carta.mesas (restaurante_id, nombre, orden, activa)
          values (r.id, trim(d->>'nombre'),
                  coalesce((d->>'orden')::int,
                           (select coalesce(max(orden), 0) + 1 from carta.mesas where restaurante_id = r.id)),
                  coalesce((d->>'activa')::boolean, true))
          returning id into v_id;
        else
          update carta.mesas set
            nombre = trim(d->>'nombre'),
            orden  = coalesce((d->>'orden')::int, orden),
            activa = coalesce((d->>'activa')::boolean, activa)
           where id = v_id and restaurante_id = r.id;
          if not found then raise exception 'no_encontrado'; end if;
        end if;
      exception when unique_violation then
        raise exception 'mesa_repetida';
      end;
      v_extra := jsonb_build_object('id', v_id);

    when 'crear_mesas' then
      v_desde := coalesce((d->>'desde')::int, 1);
      v_hasta := coalesce((d->>'hasta')::int, v_desde);
      if v_desde < 0 or v_hasta < v_desde or v_hasta - v_desde >= 200 then raise exception 'rango_no_valido'; end if;
      insert into carta.mesas (restaurante_id, nombre, orden)
      select r.id, coalesce(nullif(trim(d->>'prefijo'), ''), 'Mesa') || ' ' || i, i
        from generate_series(v_desde, v_hasta) i
      on conflict (restaurante_id, nombre) do nothing;

    when 'borrar_mesa' then
      delete from carta.mesas where id = v_id and restaurante_id = r.id;

    when 'regenerar_mesa' then  -- invalida el NFC/QR antiguo de esa mesa
      update carta.mesas set codigo = encode(extensions.gen_random_bytes(5), 'hex')
       where id = v_id and restaurante_id = r.id;

    when 'regenerar_clave' then
      v_clave := carta._clave();
      if d->>'tipo' = 'admin' then
        update carta.restaurantes set admin_hash = carta._hash(v_clave) where id = r.id;
      else
        update carta.restaurantes set cocina_hash = carta._hash(v_clave) where id = r.id;
      end if;
      v_extra := jsonb_build_object('clave', v_clave,
                                    'tipo', case when d->>'tipo' = 'admin' then 'admin' else 'cocina' end);

    else
      raise exception 'accion_no_valida';
  end case;

  v_ini := carta._inicio_dia(r);
  return jsonb_build_object(
    'restaurante', jsonb_build_object(
      'slug', r.slug, 'nombre', r.nombre, 'mensaje', r.mensaje, 'color', r.color,
      'moneda', r.moneda, 'pedidos_abiertos', r.pedidos_abiertos, 'mesa_libre', r.mesa_libre),
    'categorias', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'orden', c.orden, 'activa', c.activa)
                       order by c.orden, c.nombre)
        from carta.categorias c where c.restaurante_id = r.id), '[]'::jsonb),
    'productos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', x.id, 'categoria_id', x.categoria_id, 'nombre', x.nombre, 'descripcion', x.descripcion,
               'precio', x.precio, 'alergenos', to_jsonb(x.alergenos), 'imagen_url', x.imagen_url,
               'disponible', x.disponible, 'orden', x.orden) order by x.orden, x.nombre)
        from carta.productos x where x.restaurante_id = r.id), '[]'::jsonb),
    'mesas', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'nombre', m.nombre, 'codigo', m.codigo,
                                          'orden', m.orden, 'activa', m.activa) order by m.orden, m.nombre)
        from carta.mesas m where m.restaurante_id = r.id), '[]'::jsonb),
    'hoy', (
      select jsonb_build_object('pedidos', count(*), 'total', coalesce(sum(p.total), 0))
        from carta.pedidos p
       where p.restaurante_id = r.id and p.tipo = 'pedido' and p.estado <> 'cancelado' and p.creado >= v_ini),
    'top', coalesce((
      select jsonb_agg(t) from (
        select l.nombre, sum(l.cantidad) as cantidad, sum(l.cantidad * l.precio) as importe
          from carta.pedido_lineas l join carta.pedidos p on p.id = l.pedido_id
         where p.restaurante_id = r.id and p.estado <> 'cancelado' and p.creado >= v_ini
         group by l.nombre order by 2 desc, 1 limit 10) t), '[]'::jsonb)
  ) || v_extra;
end $$;

-- ------------------------------------------------ plataforma (el vendedor) ----

create or replace function public.carta_plataforma(p_clave text, p_accion text default 'listar',
                                                   p_datos jsonb default '{}')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  d       jsonb := coalesce(p_datos, '{}'::jsonb);
  v_extra jsonb := '{}'::jsonb;
begin
  if coalesce(p_clave, '') = '' or not exists (
       select 1 from carta.plataforma where clave_hash = carta._hash(p_clave)) then
    raise exception 'clave_incorrecta';
  end if;

  case coalesce(p_accion, 'listar')
    when 'listar' then
      null;
    when 'alta' then
      v_extra := carta._alta(d->>'nombre', d->>'slug', coalesce((d->>'mesas')::int, 0));
    when 'activo' then
      update carta.restaurantes set activo = coalesce((d->>'activo')::boolean, true)
       where slug = lower(trim(coalesce(d->>'slug', '')));
      if not found then raise exception 'restaurante_no_encontrado'; end if;
    when 'clave_admin' then  -- el cliente perdió su clave de admin
      v_extra := jsonb_build_object('slug', lower(trim(d->>'slug')), 'clave_admin', carta._clave());
      update carta.restaurantes set admin_hash = carta._hash(v_extra->>'clave_admin')
       where slug = v_extra->>'slug';
      if not found then raise exception 'restaurante_no_encontrado'; end if;
    else
      raise exception 'accion_no_valida';
  end case;

  return jsonb_build_object('restaurantes', coalesce((
    select jsonb_agg(jsonb_build_object(
             'slug', r.slug, 'nombre', r.nombre, 'activo', r.activo, 'creado', r.creado,
             'mesas', (select count(*) from carta.mesas m where m.restaurante_id = r.id),
             'pedidos_7d', (select count(*) from carta.pedidos p
                             where p.restaurante_id = r.id and p.tipo = 'pedido'
                               and p.creado > now() - interval '7 days'))
           order by r.creado desc)
      from carta.restaurantes r), '[]'::jsonb)) || v_extra;
end $$;

-- ------------------------------------------------------------------ permisos ----

revoke all on function public.carta_menu(text, text)                    from public;
revoke all on function public.carta_pedir(text, jsonb, text)            from public;
revoke all on function public.carta_avisar(text, text)                  from public;
revoke all on function public.carta_estado(text[])                      from public;
revoke all on function public.carta_cocina(text, text, text, jsonb)     from public;
revoke all on function public.carta_admin(text, text, text, jsonb)      from public;
revoke all on function public.carta_plataforma(text, text, jsonb)       from public;

grant execute on function public.carta_menu(text, text)                to anon, authenticated;
grant execute on function public.carta_pedir(text, jsonb, text)        to anon, authenticated;
grant execute on function public.carta_avisar(text, text)              to anon, authenticated;
grant execute on function public.carta_estado(text[])                  to anon, authenticated;
grant execute on function public.carta_cocina(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.carta_admin(text, text, text, jsonb)  to anon, authenticated;
grant execute on function public.carta_plataforma(text, text, jsonb)   to anon, authenticated;
