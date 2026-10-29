-- VISAX AI CRM · esquema inicial
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated, service_role;

-- ---------- Utilidades de normalización (duplicados y búsqueda) ----------
create or replace function privado.normalizar(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select nullif(btrim(regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, ''))),
    '[^a-z0-9]+', ' ', 'g')), '')
$$;

create or replace function privado.normalizar_tel(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select nullif(right(regexp_replace(coalesce(t, ''), '\D', '', 'g'), 9), '')
$$;

-- ---------- Socios (las únicas cuentas con acceso) ----------
create table public.socios (
  id uuid primary key references auth.users(id) on delete cascade,
  usuario text not null unique check (usuario ~ '^[a-z0-9._-]{2,30}$'),
  nombre text not null check (length(btrim(nombre)) between 1 and 60),
  color text not null default '#7C5CFF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  creado_en timestamptz not null default now()
);

create or replace function privado.es_socio() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.socios where id = (select auth.uid()))
$$;
revoke execute on function privado.es_socio() from public, anon;
grant execute on function privado.es_socio() to authenticated;
grant execute on function privado.normalizar(text), privado.normalizar_tel(text) to authenticated;

-- ---------- Catálogos ampliables ----------
create table public.estados (
  codigo text primary key,
  nombre text not null,
  descripcion text not null,
  orden int not null unique,
  color text not null,
  grupo text not null check (grupo in ('inicio', 'seguimiento', 'oportunidad', 'ganado', 'cerrado'))
);
insert into public.estados (codigo, nombre, descripcion, orden, color, grupo) values
  ('pendiente_contactar', 'Pendiente de contactar', 'Registrado, todavía sin primer contacto.', 1, '#8A90A6', 'inicio'),
  ('primer_contacto', 'Primer contacto realizado', 'Contacto iniciado, sin oportunidad definida todavía.', 2, '#33C6F4', 'inicio'),
  ('pendiente_localizar', 'Pendiente de localizar al responsable', 'Hay que hablar con el dueño o encargado.', 3, '#F5A524', 'seguimiento'),
  ('seguimiento_pendiente', 'Seguimiento pendiente', 'Hay que volver a contactar.', 4, '#3F7DFB', 'seguimiento'),
  ('interesado', 'Interesado', 'Hay interés en alguno de nuestros servicios.', 5, '#7C5CFF', 'oportunidad'),
  ('preparando_propuesta', 'Preparando propuesta', 'Estamos preparando solución o presupuesto.', 6, '#A78BFA', 'oportunidad'),
  ('propuesta_enviada', 'Propuesta enviada', 'Ya ha recibido nuestra propuesta.', 7, '#EC4899', 'oportunidad'),
  ('decision_pendiente', 'Decisión pendiente', 'Esperando respuesta o negociando.', 8, '#F97316', 'oportunidad'),
  ('cliente_ganado', 'Cliente ganado', 'Ha aceptado contratar nuestros servicios.', 9, '#22C55E', 'ganado'),
  ('no_interesado', 'No interesado', 'No quiere continuar por ahora (no es un rechazo definitivo).', 10, '#F25F5C', 'cerrado'),
  ('descartado', 'Descartado', 'No vamos a seguir trabajando esta oportunidad.', 11, '#6B7280', 'cerrado');

create table public.servicios (
  codigo text primary key,
  nombre text not null,
  orden int not null unique,
  activo boolean not null default true
);
insert into public.servicios (codigo, nombre, orden) values
  ('automatizaciones', 'Automatizaciones con IA', 1),
  ('software', 'Desarrollo de software', 2),
  ('web', 'Página web', 3),
  ('varios', 'Varios servicios', 4),
  ('por_identificar', 'Necesidad por identificar', 5);

create table public.tipos_interaccion (
  codigo text primary key,
  nombre text not null,
  orden int not null unique,
  activo boolean not null default true
);
insert into public.tipos_interaccion (codigo, nombre, orden) values
  ('visita', 'Visita presencial', 1),
  ('llamada', 'Llamada telefónica', 2),
  ('whatsapp', 'WhatsApp', 3),
  ('email', 'Correo electrónico', 4),
  ('reunion', 'Reunión', 5),
  ('otro', 'Otro contacto', 6);

create table public.tipos_tarea (
  codigo text primary key,
  nombre text not null,
  orden int not null unique,
  activo boolean not null default true
);
insert into public.tipos_tarea (codigo, nombre, orden) values
  ('volver_visitar', 'Volver a visitar', 1),
  ('llamar', 'Llamar', 2),
  ('enviar_info', 'Enviar información', 3),
  ('preparar_presupuesto', 'Preparar presupuesto', 4),
  ('hacer_demo', 'Hacer demostración', 5),
  ('recontactar', 'Volver a contactar', 6),
  ('otra', 'Otra acción', 7);

-- Resultados de una interacción, con el siguiente paso que la app sugiere (nunca se aplica solo)
create table public.resultados (
  codigo text primary key,
  nombre text not null,
  grupo text not null check (grupo in ('localizar', 'sin_interes', 'interes', 'decision', 'otro')),
  orden int not null unique,
  sugerencia_estado text references public.estados(codigo) on update cascade,
  sugerencia_tarea text references public.tipos_tarea(codigo) on update cascade,
  sugerencia_dias int check (sugerencia_dias >= 0),
  pide_hora boolean not null default false,
  activo boolean not null default true
);
insert into public.resultados (codigo, nombre, grupo, orden, sugerencia_estado, sugerencia_tarea, sugerencia_dias, pide_hora) values
  ('no_estaba', 'El dueño o encargado no estaba', 'localizar', 1, 'pendiente_localizar', 'volver_visitar', 1, true),
  ('cerrado', 'El negocio estaba cerrado', 'localizar', 2, null, 'volver_visitar', 1, false),
  ('nadie_disponible', 'No había nadie disponible', 'localizar', 3, 'pendiente_localizar', 'recontactar', 1, false),
  ('ocupado', 'El responsable estaba ocupado', 'localizar', 4, 'seguimiento_pendiente', 'recontactar', 1, true),
  ('volver_mas_tarde', 'Nos han dicho que volvamos más tarde', 'localizar', 5, 'seguimiento_pendiente', 'volver_visitar', 0, true),
  ('hora_concreta', 'Nos han dado una hora concreta para volver', 'localizar', 6, 'seguimiento_pendiente', 'volver_visitar', 0, true),
  ('no_interesado', 'Hemos hablado con el responsable y no está interesado', 'sin_interes', 7, 'no_interesado', null, null, false),
  ('poco_interes', 'Ha mostrado poco interés', 'sin_interes', 8, 'seguimiento_pendiente', 'recontactar', 30, false),
  ('necesita_info', 'Está interesado, pero necesita más información', 'interes', 9, 'interesado', 'enviar_info', 1, false),
  ('quiere_detalle', 'Quiere conocer nuestros servicios con más detalle', 'interes', 10, 'interesado', 'recontactar', 2, false),
  ('quiere_demo', 'Quiere una demostración', 'interes', 11, 'interesado', 'hacer_demo', 3, false),
  ('pide_presupuesto', 'Ha solicitado un presupuesto', 'interes', 12, 'preparando_propuesta', 'preparar_presupuesto', 2, false),
  ('propuesta_enviada', 'Le hemos enviado la propuesta o presupuesto', 'decision', 13, 'propuesta_enviada', 'recontactar', 3, false),
  ('esperando_decision', 'Estamos esperando su decisión', 'decision', 14, 'decision_pendiente', 'recontactar', 3, false),
  ('aceptado', 'Ha aceptado nuestra propuesta', 'decision', 15, 'cliente_ganado', null, null, false),
  ('rechazado', 'Ha rechazado definitivamente la propuesta', 'decision', 16, 'descartado', null, null, false),
  ('otro', 'Otro resultado', 'otro', 17, null, null, null, false);

-- ---------- Negocios ----------
create table public.negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(btrim(nombre)) between 1 and 160),
  razon_social text,
  sector text,
  direccion text,
  localidad text,
  telefono text,
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  web text,
  redes text,
  responsable_id uuid references public.socios(id) on delete set null,
  creado_por uuid references public.socios(id) on delete set null default auth.uid(),
  estado text not null default 'pendiente_contactar' references public.estados(codigo) on update cascade,
  potencial text check (potencial in ('bajo', 'medio', 'alto')),
  presupuesto_estimado numeric(12, 2) check (presupuesto_estimado >= 0),
  necesidades text,
  problemas text,
  objeciones text,
  horario_contacto text,
  notas text,
  nombre_norm text generated always as (privado.normalizar(nombre)) stored,
  telefono_norm text generated always as (privado.normalizar_tel(telefono)) stored,
  direccion_norm text generated always as (privado.normalizar(coalesce(direccion, '') || ' ' || coalesce(localidad, ''))) stored,
  ultima_interaccion_en timestamptz,
  estado_cambiado_en timestamptz not null default now(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.contactos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) between 1 and 120),
  cargo text,
  telefono text,
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  es_principal boolean not null default false,
  notas text,
  creado_en timestamptz not null default now()
);
create unique index contactos_un_principal on public.contactos (negocio_id) where es_principal;

create table public.negocio_servicios (
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  servicio text not null references public.servicios(codigo) on update cascade,
  nivel text not null default 'por_valorar' check (nivel in ('alto', 'medio', 'bajo', 'por_valorar', 'no')),
  notas text,
  actualizado_en timestamptz not null default now(),
  primary key (negocio_id, servicio)
);

-- ---------- Interacciones, tareas e historial de estados ----------
create table public.interacciones (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  tipo text not null references public.tipos_interaccion(codigo) on update cascade,
  fecha timestamptz not null default now(),
  socio_id uuid not null references public.socios(id),
  registrada_por uuid not null references public.socios(id) default auth.uid(),
  persona text,
  resultado text not null references public.resultados(codigo) on update cascade,
  servicios text[] not null default '{}',
  notas text,
  proxima_accion text,
  proxima_fecha date,
  proxima_hora time,
  creado_en timestamptz not null default now(),
  check (fecha <= creado_en + interval '10 minutes')
);

create table public.tareas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  tipo text not null references public.tipos_tarea(codigo) on update cascade,
  descripcion text not null check (length(btrim(descripcion)) between 1 and 300),
  responsable_id uuid references public.socios(id) on delete set null,
  vence_fecha date,
  vence_hora time,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'completada')),
  notas text,
  origen_interaccion_id uuid references public.interacciones(id) on delete set null,
  cierre_interaccion_id uuid references public.interacciones(id) on delete set null,
  completada_en timestamptz,
  completada_por uuid references public.socios(id) on delete set null,
  creado_por uuid references public.socios(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check ((estado = 'completada') = (completada_en is not null)),
  check (vence_hora is null or vence_fecha is not null)
);

create table public.cambios_estado (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  estado_anterior text references public.estados(codigo) on update cascade,
  estado_nuevo text not null references public.estados(codigo) on update cascade,
  socio_id uuid references public.socios(id) on delete set null,
  interaccion_id uuid references public.interacciones(id) on delete set null,
  creado_en timestamptz not null default now()
);

-- ---------- Índices ----------
create index negocios_estado_idx on public.negocios (estado);
create index negocios_responsable_idx on public.negocios (responsable_id);
create index negocios_creado_por_idx on public.negocios (creado_por);
create index negocios_nombre_trgm on public.negocios using gin (nombre_norm extensions.gin_trgm_ops);
create index negocios_direccion_trgm on public.negocios using gin (direccion_norm extensions.gin_trgm_ops);
create index negocios_telefono_idx on public.negocios (telefono_norm);
create index contactos_negocio_idx on public.contactos (negocio_id);
create index negocio_servicios_servicio_idx on public.negocio_servicios (servicio);
create index interacciones_negocio_idx on public.interacciones (negocio_id, fecha desc);
create index interacciones_fecha_idx on public.interacciones (fecha desc);
create index interacciones_socio_idx on public.interacciones (socio_id);
create index interacciones_registrada_idx on public.interacciones (registrada_por);
create index interacciones_tipo_idx on public.interacciones (tipo);
create index interacciones_resultado_idx on public.interacciones (resultado);
create index tareas_negocio_idx on public.tareas (negocio_id, estado);
create index tareas_pendientes_idx on public.tareas (vence_fecha, vence_hora) where estado = 'pendiente';
create index tareas_responsable_idx on public.tareas (responsable_id);
create index tareas_tipo_idx on public.tareas (tipo);
create index tareas_origen_idx on public.tareas (origen_interaccion_id);
create index tareas_cierre_idx on public.tareas (cierre_interaccion_id);
create index tareas_completada_por_idx on public.tareas (completada_por);
create index tareas_creado_por_idx on public.tareas (creado_por);
create index cambios_estado_negocio_idx on public.cambios_estado (negocio_id, creado_en desc);
create index cambios_estado_nuevo_idx on public.cambios_estado (estado_nuevo, creado_en);
create index cambios_estado_anterior_idx on public.cambios_estado (estado_anterior);
create index cambios_estado_socio_idx on public.cambios_estado (socio_id);
create index cambios_estado_interaccion_idx on public.cambios_estado (interaccion_id);
create index resultados_estado_idx on public.resultados (sugerencia_estado);
create index resultados_tarea_idx on public.resultados (sugerencia_tarea);

-- ---------- Disparadores ----------
create or replace function privado.tocar_actualizado() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger negocios_actualizado before update on public.negocios
  for each row execute function privado.tocar_actualizado();
create trigger tareas_actualizado before update on public.tareas
  for each row execute function privado.tocar_actualizado();

-- Historial de estados: lo escribe la base de datos, no se puede falsear desde la app.
create or replace function privado.registrar_cambio_estado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.cambios_estado (negocio_id, estado_anterior, estado_nuevo, socio_id)
    values (new.id, null, new.estado, auth.uid());
  elsif new.estado is distinct from old.estado then
    insert into public.cambios_estado (negocio_id, estado_anterior, estado_nuevo, socio_id, interaccion_id)
    values (new.id, old.estado, new.estado, auth.uid(),
            nullif(current_setting('crm.interaccion_id', true), '')::uuid);
  end if;
  return null;
end $$;

create or replace function privado.marcar_cambio_estado() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.estado is distinct from old.estado then
    new.estado_cambiado_en := now();
  end if;
  return new;
end $$;

create trigger negocios_estado_fecha before update of estado on public.negocios
  for each row execute function privado.marcar_cambio_estado();
create trigger negocios_historial_estado after insert or update of estado on public.negocios
  for each row execute function privado.registrar_cambio_estado();

-- Interacciones: quien la registra es siempre la sesión; servicios válidos; fecha del último contacto.
create or replace function privado.preparar_interaccion() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.registrada_por := auth.uid();
  end if;
  if exists (select 1 from unnest(new.servicios) s where s not in (select codigo from public.servicios)) then
    raise exception 'Servicio no válido' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger interacciones_preparar before insert or update on public.interacciones
  for each row execute function privado.preparar_interaccion();

create or replace function privado.actualizar_ultimo_contacto() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_negocio uuid := coalesce(new.negocio_id, old.negocio_id);
begin
  update public.negocios n
  set ultima_interaccion_en = (select max(fecha) from public.interacciones where negocio_id = v_negocio)
  where n.id = v_negocio;
  return null;
end $$;

create trigger interacciones_ultimo_contacto after insert or update of fecha or delete on public.interacciones
  for each row execute function privado.actualizar_ultimo_contacto();

-- Tareas: quién y cuándo se completó
create or replace function privado.preparar_tarea() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.estado = 'completada' and (tg_op = 'INSERT' or old.estado <> 'completada') then
    new.completada_en := coalesce(new.completada_en, now());
    new.completada_por := coalesce(auth.uid(), new.completada_por);
  elsif new.estado = 'pendiente' then
    new.completada_en := null;
    new.completada_por := null;
    new.cierre_interaccion_id := null;
  end if;
  return new;
end $$;

create trigger tareas_preparar before insert or update on public.tareas
  for each row execute function privado.preparar_tarea();

-- ---------- Vista de la tabla de negocios (respeta RLS) ----------
create view public.negocios_vista with (security_invoker = true) as
select
  n.*,
  e.nombre as estado_nombre, e.orden as estado_orden, e.color as estado_color, e.grupo as estado_grupo,
  c.nombre as contacto_nombre, c.cargo as contacto_cargo,
  coalesce(n.telefono, c.telefono) as telefono_contacto,
  coalesce(s.servicios, '{}') as servicios_interes,
  ui.tipo as ultima_tipo, ui.resultado as ultima_resultado, ui.socio_id as ultima_socio_id,
  coalesce(ti.tipos, '{}') as tipos_contacto,
  t.id as proxima_tarea_id, t.descripcion as proxima_accion, t.tipo as proxima_tipo,
  t.vence_fecha as proxima_fecha, t.vence_hora as proxima_hora, t.responsable_id as proxima_responsable_id,
  coalesce(tp.pendientes, 0)::int as tareas_pendientes,
  concat_ws(' ', n.nombre_norm, privado.normalizar(n.razon_social), privado.normalizar(c.nombre), privado.normalizar(n.localidad)) as busqueda,
  concat_ws(' ', n.telefono_norm, privado.normalizar_tel(c.telefono)) as busqueda_tel
from public.negocios n
join public.estados e on e.codigo = n.estado
left join lateral (
  select nombre, cargo, telefono from public.contactos where negocio_id = n.id order by es_principal desc, creado_en limit 1
) c on true
left join lateral (
  select array_agg(ns.servicio order by sv.orden) as servicios
  from public.negocio_servicios ns join public.servicios sv on sv.codigo = ns.servicio
  where ns.negocio_id = n.id and ns.nivel <> 'no'
) s on true
left join lateral (
  select tipo, resultado, socio_id from public.interacciones where negocio_id = n.id order by fecha desc limit 1
) ui on true
left join lateral (
  select array_agg(distinct tipo) as tipos from public.interacciones where negocio_id = n.id
) ti on true
left join lateral (
  select id, descripcion, tipo, vence_fecha, vence_hora, responsable_id from public.tareas
  where negocio_id = n.id and estado = 'pendiente'
  order by vence_fecha nulls last, vence_hora nulls last, creado_en limit 1
) t on true
left join lateral (
  select count(*) as pendientes from public.tareas where negocio_id = n.id and estado = 'pendiente'
) tp on true;

-- ---------- Seguridad: solo los socios ven y tocan datos ----------
alter table public.socios enable row level security;
alter table public.estados enable row level security;
alter table public.servicios enable row level security;
alter table public.tipos_interaccion enable row level security;
alter table public.tipos_tarea enable row level security;
alter table public.resultados enable row level security;
alter table public.negocios enable row level security;
alter table public.contactos enable row level security;
alter table public.negocio_servicios enable row level security;
alter table public.interacciones enable row level security;
alter table public.tareas enable row level security;
alter table public.cambios_estado enable row level security;

revoke all on all tables in schema public from anon;
revoke all on public.negocios_vista from anon;

-- Socios: se ven entre ellos; cada uno edita su nombre y color. El alta la hace la función de acceso.
revoke insert, update, delete on public.socios from authenticated;
grant update (nombre, color) on public.socios to authenticated;
create policy socios_ver on public.socios for select to authenticated using ((select privado.es_socio()));
create policy socios_editar_propio on public.socios for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Catálogos: solo lectura desde la app (se amplían con migraciones)
revoke insert, update, delete on public.estados, public.servicios, public.tipos_interaccion, public.tipos_tarea, public.resultados from authenticated;
create policy estados_ver on public.estados for select to authenticated using ((select privado.es_socio()));
create policy servicios_ver on public.servicios for select to authenticated using ((select privado.es_socio()));
create policy tipos_interaccion_ver on public.tipos_interaccion for select to authenticated using ((select privado.es_socio()));
create policy tipos_tarea_ver on public.tipos_tarea for select to authenticated using ((select privado.es_socio()));
create policy resultados_ver on public.resultados for select to authenticated using ((select privado.es_socio()));

-- Datos comerciales compartidos: los dos socios con los mismos permisos
create policy negocios_socios on public.negocios for all to authenticated
  using ((select privado.es_socio())) with check ((select privado.es_socio()));
create policy contactos_socios on public.contactos for all to authenticated
  using ((select privado.es_socio())) with check ((select privado.es_socio()));
create policy negocio_servicios_socios on public.negocio_servicios for all to authenticated
  using ((select privado.es_socio())) with check ((select privado.es_socio()));
create policy interacciones_socios on public.interacciones for all to authenticated
  using ((select privado.es_socio())) with check ((select privado.es_socio()));
create policy tareas_socios on public.tareas for all to authenticated
  using ((select privado.es_socio())) with check ((select privado.es_socio()));

-- Historial de estados: solo lectura (lo escribe el disparador)
revoke insert, update, delete on public.cambios_estado from authenticated;
create policy cambios_estado_ver on public.cambios_estado for select to authenticated using ((select privado.es_socio()));
