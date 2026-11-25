-- =============================================================================
-- 010 · Extras de la carta (versión "Solo pedidos"): WiFi del bar, opciones por plato (punto, picante…),
-- valoraciones al final con enlace a la reseña de Google, trivial con ranking del día y datos para el resumen "Hoy".
-- Idempotente y sin drop. Todo vacío por defecto: un bar que ya existe sigue exactamente igual.
--
--   carta.restaurantes.wifi_red / wifi_clave / resena_url
--   carta.productos.opciones   [{ "nombre": "Punto", "valores": ["Poco hecho", "Al punto", "Hecho"] }, …]
--                              Son informativas: van en la nota de la línea y no cambian el precio.
--   carta.valoraciones         estrellas (1-5) y comentario privado para el dueño
--   carta.restaurantes.trivia  trivial activado (apagado por defecto)
--   carta.trivia_preguntas     preguntas comunes a todos los bares (las respuestas nunca salen al navegador)
--   carta.trivia_partidas      nombre (solo el nombre, sin email ni teléfono), mesa, aciertos y segundos
--   public.carta_info(slug, mesa)                       WiFi (solo con mesa), reseña, trivial y opciones de la carta
--   public.carta_valorar(mesa, estrellas, comentario)   valoración del cliente
--   public.carta_trivia(mesa, accion, datos)            empezar / terminar (corrige el servidor) / ranking de hoy
--   public.carta_panel                                  la de 009 + extras, opciones, opiniones, mesas activas y trivial
-- =============================================================================

alter table carta.restaurantes add column if not exists wifi_red text check (length(wifi_red) <= 60);
alter table carta.restaurantes add column if not exists wifi_clave text check (length(wifi_clave) <= 80);
alter table carta.restaurantes add column if not exists resena_url text check (resena_url ~ '^https://[^\s]+$');
alter table carta.productos add column if not exists opciones jsonb check (opciones is null or jsonb_typeof(opciones) = 'array');
alter table carta.restaurantes add column if not exists trivia boolean not null default false;

create table if not exists carta.valoraciones (
  id             bigint generated always as identity primary key,
  restaurante_id uuid not null references carta.restaurantes(id) on delete cascade,
  mesa_id        uuid references carta.mesas(id) on delete set null,
  mesa_nombre    text not null,
  estrellas      int not null check (estrellas between 1 and 5),
  comentario     text check (length(comentario) <= 500),
  creado         timestamptz not null default now()
);
create index if not exists valoraciones_restaurante_idx on carta.valoraciones (restaurante_id, creado desc);
alter table carta.valoraciones enable row level security;
revoke all on carta.valoraciones from public, anon, authenticated;

-- ------------------------------------------------------------------ trivial ----
create table if not exists carta.trivia_preguntas (
  id        int primary key,
  pregunta  text not null,
  opciones  jsonb not null check (jsonb_typeof(opciones) = 'array' and jsonb_array_length(opciones) = 4),
  correcta  int not null check (correcta between 0 and 3)
);
alter table carta.trivia_preguntas enable row level security;
revoke all on carta.trivia_preguntas from public, anon, authenticated;

create table if not exists carta.trivia_partidas (
  id             uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references carta.restaurantes(id) on delete cascade,
  mesa_id        uuid references carta.mesas(id) on delete set null,
  mesa_nombre    text not null,
  nombre         text not null check (length(nombre) between 1 and 20),
  preguntas      int[] not null,
  puntos         int check (puntos between 0 and 10),
  segundos       int,
  creado         timestamptz not null default now(),
  terminado      timestamptz
);
create index if not exists trivia_partidas_idx on carta.trivia_partidas (restaurante_id, terminado desc);
create index if not exists trivia_partidas_mesa_idx on carta.trivia_partidas (mesa_id, creado desc);
alter table carta.trivia_partidas enable row level security;
revoke all on carta.trivia_partidas from public, anon, authenticated;

insert into carta.trivia_preguntas (id, pregunta, opciones, correcta) values
  (1,  '¿Qué río pasa por Sevilla?', '["Guadalquivir","Ebro","Tajo","Duero"]', 0),
  (2,  '¿En qué año fue la Exposición Universal de Sevilla?', '["1982","1992","2002","1988"]', 1),
  (3,  '¿Cómo se llama la torre de la catedral de Sevilla?', '["Torre del Oro","La Giralda","Torre Sevilla","Torre de Hércules"]', 1),
  (4,  '¿Cuántos jugadores tiene un equipo de fútbol en el campo?', '["9","10","11","12"]', 2),
  (5,  '¿Cuál es el planeta más grande del sistema solar?', '["Saturno","Júpiter","Neptuno","La Tierra"]', 1),
  (6,  '¿Cuántos días tiene un año bisiesto?', '["364","365","366","367"]', 2),
  (7,  '¿Quién pintó "Las Meninas"?', '["Goya","Velázquez","Murillo","Picasso"]', 1),
  (8,  '¿Cuál es la capital de Portugal?', '["Oporto","Lisboa","Coímbra","Faro"]', 1),
  (9,  '¿Qué ingrediente NO lleva el salmorejo tradicional?', '["Tomate","Pan","Aceite","Pepino"]', 3),
  (10, '¿De qué país es típico el sushi?', '["China","Japón","Corea","Tailandia"]', 1),
  (11, '¿Cuántos lados tiene un hexágono?', '["5","6","7","8"]', 1),
  (12, '¿Cuál es el océano más grande?', '["Atlántico","Índico","Pacífico","Ártico"]', 2),
  (13, '¿Quién escribió "Don Quijote de la Mancha"?', '["Lope de Vega","Cervantes","Quevedo","Góngora"]', 1),
  (14, '¿En qué ciudad está la Alhambra?', '["Córdoba","Sevilla","Granada","Málaga"]', 2),
  (15, '¿Cuál es el animal terrestre más rápido?', '["León","Guepardo","Caballo","Gacela"]', 1),
  (16, '¿Cuántos minutos son hora y media?', '["60","80","90","120"]', 2),
  (17, '¿De qué color es una esmeralda?', '["Roja","Azul","Verde","Amarilla"]', 2),
  (18, '¿Cómo se llama la fiesta sevillana de casetas, farolillos y sevillanas?', '["Feria de Abril","Fallas","San Fermín","Carnaval"]', 0),
  (19, '¿Qué metal tiene el símbolo químico Au?', '["Plata","Oro","Cobre","Aluminio"]', 1),
  (20, '¿Cuántas patas tiene una araña?', '["6","8","10","12"]', 1),
  (21, '¿Qué instrumento tiene teclas blancas y negras?', '["Guitarra","Piano","Violín","Flauta"]', 1),
  (22, '¿Cuál es la capital de Italia?', '["Milán","Roma","Venecia","Nápoles"]', 1),
  (23, '¿Qué selección ganó el Mundial de fútbol de 2010?', '["Alemania","Países Bajos","España","Brasil"]', 2),
  (24, '¿Qué tapa sevillana lleva espinacas?', '["Espinacas con garbanzos","Pringá","Serranito","Carrillada"]', 0),
  (25, '¿Qué lleva un serranito?', '["Lomo o pollo, jamón y pimiento","Atún y huevo","Gambas y alioli","Queso y membrillo"]', 0),
  (26, '¿Cuántos segundos tiene un minuto?', '["30","60","100","120"]', 1),
  (27, '¿Cuál es el país más grande del mundo?', '["China","Canadá","Rusia","Estados Unidos"]', 2),
  (28, '¿Qué vitamina nos da sobre todo el sol?', '["Vitamina A","Vitamina C","Vitamina D","Vitamina K"]', 2),
  (29, '¿Quién fue el primer hombre en pisar la Luna?', '["Yuri Gagarin","Neil Armstrong","Buzz Aldrin","Michael Collins"]', 1),
  (30, '¿En qué año llegó Colón a América?', '["1492","1512","1453","1500"]', 0),
  (31, '¿Cuál es el hueso más largo del cuerpo humano?', '["Fémur","Húmero","Tibia","Radio"]', 0),
  (32, '¿Qué equipo juega en el estadio Benito Villamarín?', '["Sevilla FC","Real Betis","Cádiz CF","Málaga CF"]', 1),
  (33, '¿Qué equipo juega en el Ramón Sánchez-Pizjuán?', '["Real Betis","Sevilla FC","Granada CF","Córdoba CF"]', 1),
  (34, '¿Cuál es la moneda del Reino Unido?', '["Euro","Dólar","Libra esterlina","Franco"]', 2),
  (35, '¿Qué bebida sale de fermentar la uva?', '["Cerveza","Vino","Sidra","Whisky"]', 1),
  (36, '¿Con qué cereal se hace sobre todo la cerveza?', '["Cebada","Arroz","Maíz","Avena"]', 0),
  (37, '¿Qué idioma tiene más hablantes nativos del mundo?', '["Inglés","Español","Chino mandarín","Hindi"]', 2),
  (38, '¿Cuántos colores se cuentan en el arcoíris?', '["5","6","7","8"]', 2),
  (39, '¿Qué monumento sevillano se hizo para la Exposición de 1929?', '["Plaza de España","La Giralda","Torre del Oro","Real Alcázar"]', 0),
  (40, '¿Cuál es la montaña más alta del mundo?', '["K2","Everest","Mont Blanc","Aconcagua"]', 1),
  (41, '¿Cuál es el desierto cálido más grande del mundo?', '["Sáhara","Gobi","Atacama","Kalahari"]', 0),
  (42, '¿Qué órgano bombea la sangre?', '["Pulmón","Hígado","Corazón","Riñón"]', 2),
  (43, '¿Qué planeta es conocido como el planeta rojo?', '["Venus","Marte","Mercurio","Júpiter"]', 1),
  (44, '¿Qué gas sueltan las plantas al hacer la fotosíntesis?', '["Oxígeno","Helio","Metano","Butano"]', 0)
on conflict (id) do update set pregunta = excluded.pregunta, opciones = excluded.opciones, correcta = excluded.correcta;

-- Ranking de hoy (hora del bar): la mejor partida de cada nombre, más aciertos y, a igualdad, menos segundos.
create or replace function carta._trivia_ranking(p_restaurante uuid, p_tz text, p_n int) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('nombre', x.nombre, 'mesa', x.mesa_nombre, 'puntos', x.puntos, 'segundos', x.segundos)
                            order by x.puntos desc, x.segundos, x.terminado), '[]'::jsonb)
    from (select * from (
            select distinct on (lower(t.nombre)) t.*
              from carta.trivia_partidas t
             where t.restaurante_id = p_restaurante and t.terminado is not null
               and t.terminado >= ((now() at time zone p_tz)::date)::timestamp at time zone p_tz
             order by lower(t.nombre), t.puntos desc, t.segundos, t.terminado) y
          order by y.puntos desc, y.segundos, y.terminado limit p_n) x;
$$;

-- Trivial: el cliente solo da un nombre. Las preguntas salen sin la respuesta y corrige el servidor.
create or replace function public.carta_trivia(p_mesa text, p_accion text default 'ranking', p_datos jsonb default '{}')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r        carta.restaurantes;
  m        carta.mesas;
  d        jsonb := coalesce(p_datos, '{}'::jsonb);
  pt       carta.trivia_partidas;
  v_q      carta.trivia_preguntas;
  v_nombre text;
  v_ids    int[];
  v_n      int;
  v_resp   jsonb;
  v_puntos int := 0;
  v_ok     jsonb := '[]'::jsonb;
  v_extra  jsonb := '{}'::jsonb;
begin
  select * into m from carta.mesas where codigo = lower(trim(coalesce(p_mesa, ''))) and activa;
  if not found then raise exception 'mesa_no_valida'; end if;
  select * into r from carta.restaurantes where id = m.restaurante_id;
  if not r.activo or not r.trivia then raise exception 'trivia_no_disponible'; end if;

  case coalesce(p_accion, 'ranking')
    when 'ranking' then
      null;
    when 'empezar' then
      v_nombre := regexp_replace(trim(coalesce(d->>'nombre', '')), '\s+', ' ', 'g');
      if length(v_nombre) not between 1 and 20 or v_nombre ~ '[[:cntrl:]<>]' then raise exception 'nombre_no_valido'; end if;
      -- Anti-broma: como mucho 8 partidas por mesa cada media hora.
      select count(*) into v_n from carta.trivia_partidas where mesa_id = m.id and creado > now() - interval '30 minutes';
      if v_n >= 8 then raise exception 'demasiados_pedidos'; end if;
      select array_agg(x.id) into v_ids from (select q.id from carta.trivia_preguntas q order by random() limit 10) x;
      insert into carta.trivia_partidas (restaurante_id, mesa_id, mesa_nombre, nombre, preguntas)
      values (r.id, m.id, m.nombre, v_nombre, v_ids) returning * into pt;
      return jsonb_build_object('partida', pt.id, 'preguntas', (
        select jsonb_agg(jsonb_build_object('pregunta', q.pregunta, 'opciones', q.opciones) order by o.n)
          from unnest(v_ids) with ordinality o(pid, n) join carta.trivia_preguntas q on q.id = o.pid));
    when 'terminar' then
      select * into pt from carta.trivia_partidas where id = carta._uuid(d->>'partida') and mesa_id = m.id for update;
      if not found or pt.terminado is not null or pt.creado < now() - interval '15 minutes'
         or coalesce(jsonb_typeof(d->'respuestas'), '') <> 'array' then
        raise exception 'partida_no_valida';
      end if;
      v_resp := d->'respuestas';
      for i in 1 .. coalesce(array_length(pt.preguntas, 1), 0) loop
        select * into v_q from carta.trivia_preguntas where id = pt.preguntas[i];
        v_ok := v_ok || to_jsonb(v_q.correcta);
        if v_resp->>(i - 1) = v_q.correcta::text then v_puntos := v_puntos + 1; end if;
      end loop;
      update carta.trivia_partidas set puntos = v_puntos, terminado = now(),
             segundos = greatest(1, extract(epoch from now() - creado)::int)
       where id = pt.id returning * into pt;
      v_extra := jsonb_build_object('puntos', v_puntos, 'total', coalesce(array_length(pt.preguntas, 1), 0),
                                    'segundos', pt.segundos, 'correctas', v_ok);
    else
      raise exception 'accion_no_valida';
  end case;

  return v_extra || jsonb_build_object('ranking', carta._trivia_ranking(r.id, r.zona_horaria, 10));
end $$;

-- Opciones de un plato: como mucho 4 grupos de 8 valores, textos cortos.
create or replace function carta._opciones(p jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  g jsonb;
  v jsonb;
  res jsonb := '[]'::jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'array' or jsonb_array_length(p) = 0 then return null; end if;
  if jsonb_array_length(p) > 4 then raise exception 'opciones_no_validas'; end if;
  for g in select value from jsonb_array_elements(p) loop
    if jsonb_typeof(g) <> 'object' or length(trim(coalesce(g->>'nombre', ''))) not between 1 and 30
       or coalesce(jsonb_typeof(g->'valores'), '') <> 'array' or jsonb_array_length(g->'valores') not between 2 and 8 then
      raise exception 'opciones_no_validas';
    end if;
    for v in select value from jsonb_array_elements(g->'valores') loop
      if jsonb_typeof(v) <> 'string' or length(trim(v #>> '{}')) not between 1 and 30 then raise exception 'opciones_no_validas'; end if;
    end loop;
    res := res || jsonb_build_array(jsonb_build_object('nombre', trim(g->>'nombre'),
             'valores', (select jsonb_agg(trim(x)) from jsonb_array_elements_text(g->'valores') x)));
  end loop;
  return res;
end $$;

create or replace function public.carta_info(p_slug text, p_mesa text default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r carta.restaurantes;
  m carta.mesas;
begin
  select * into r from carta.restaurantes where slug = lower(trim(coalesce(p_slug, '')));
  if not found or not r.activo then raise exception 'restaurante_no_encontrado'; end if;
  select * into m from carta.mesas where codigo = lower(trim(coalesce(p_mesa, ''))) and restaurante_id = r.id and activa;
  return jsonb_build_object(
    -- La WiFi solo a quien está en una mesa del bar (NFC o mesa elegida).
    'wifi_red', case when m.id is not null then r.wifi_red end,
    'wifi_clave', case when m.id is not null then r.wifi_clave end,
    'resena_url', r.resena_url,
    'trivia', r.trivia,
    'opciones', coalesce((select jsonb_object_agg(p.id, p.opciones) from carta.productos p
                           where p.restaurante_id = r.id and p.opciones is not null), '{}'::jsonb));
end $$;

create or replace function public.carta_valorar(p_mesa text, p_estrellas int, p_comentario text default null)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r carta.restaurantes;
  m carta.mesas;
  v_n int;
begin
  select * into m from carta.mesas where codigo = lower(trim(coalesce(p_mesa, ''))) and activa;
  if not found then raise exception 'mesa_no_valida'; end if;
  select * into r from carta.restaurantes where id = m.restaurante_id;
  if not r.activo then raise exception 'restaurante_no_encontrado'; end if;
  if coalesce(p_estrellas, 0) not between 1 and 5 then raise exception 'valoracion_no_valida'; end if;
  if length(coalesce(p_comentario, '')) > 500 then raise exception 'nota_demasiado_larga'; end if;
  -- Anti-broma: como mucho 6 valoraciones por mesa cada media hora.
  select count(*) into v_n from carta.valoraciones where mesa_id = m.id and creado > now() - interval '30 minutes';
  if v_n >= 6 then raise exception 'demasiados_pedidos'; end if;
  insert into carta.valoraciones (restaurante_id, mesa_id, mesa_nombre, estrellas, comentario)
  values (r.id, m.id, m.nombre, p_estrellas, nullif(trim(p_comentario), ''));
  return jsonb_build_object('ok', true, 'resena_url', r.resena_url);
end $$;

-- carta_panel: la de 009 + 'extras', 'opciones', 'opiniones' (solo con la clave del dueño) y, en los datos,
-- mesas activas, valoración de los últimos 30 días, WiFi, reseña y opciones.
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
    when 'ajuste_codigo' then  -- activar/desactivar el código de mesa: solo con la clave del dueño
      if not v_admin then raise exception 'clave_incorrecta'; end if;
      update carta.restaurantes set codigo_mesa = coalesce((d->>'activo')::boolean, false)
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

revoke all on function carta._opciones(jsonb) from public, anon, authenticated;
revoke all on function carta._trivia_ranking(uuid, text, int) from public, anon, authenticated;
revoke all on function public.carta_trivia(text, text, jsonb) from public;
grant execute on function public.carta_trivia(text, text, jsonb) to anon, authenticated;
revoke all on function public.carta_info(text, text) from public;
revoke all on function public.carta_valorar(text, int, text) from public;
grant execute on function public.carta_info(text, text) to anon, authenticated;
grant execute on function public.carta_valorar(text, int, text) to anon, authenticated;
