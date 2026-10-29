-- Captación automática: el radar busca locales en Google Maps cada día, cada local tiene su
-- informe personal (enlace, QR o pegatina NFC) y un agente con IA atiende a quien escribe
-- desde el informe o por WhatsApp. Todo lo que pasa queda en la ficha del local.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Código corto y difícil de adivinar para el enlace del informe: visaxnfc.es/para/<codigo>
create or replace function privado.codigo_informe() returns text
language sql volatile set search_path = '' as $$
  select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', (get_byte(b, i) % 31) + 1, 1), '')
  from (select decode(replace(gen_random_uuid()::text, '-', ''), 'hex') as b) x,
       unnest(array[0, 1, 2, 3, 4, 5, 10, 11]) as i
$$;

grant usage on schema privado to service_role;
revoke execute on function privado.codigo_informe() from public;
grant execute on function privado.codigo_informe() to authenticated, service_role;

-- Zonas que barre el radar (una búsqueda de Google Maps por zona)
create table public.zonas (
  id uuid primary key default gen_random_uuid(),
  consulta text not null unique check (length(consulta) between 3 and 120),
  zona text not null check (length(zona) between 2 and 80),
  activa boolean not null default true,
  cada_dias int not null default 30 check (cada_dias between 1 and 365),
  ultima_busqueda_en timestamptz,
  ultimo_resultado text,
  creado_por uuid references public.perfiles(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now()
);

-- Cada pasada del radar con las cifras de la zona (para comparar a cada local con sus vecinos)
create table public.busquedas (
  id uuid primary key default gen_random_uuid(),
  zona_id uuid references public.zonas(id) on delete set null,
  consulta text not null,
  zona text,
  resultados int not null default 0,
  nuevos int not null default 0,
  media_nota numeric(2,1),
  mediana_resenas int,
  top jsonb not null default '[]',
  creado_por uuid references public.perfiles(id) on delete set null,
  creado_en timestamptz not null default now()
);

alter table public.locales
  add column origen text not null default 'manual' check (origen in ('manual','radar','web','whatsapp')),
  add column google_id text unique,
  add column google_nota numeric(2,1),
  add column google_resenas int,
  add column web text,
  add column maps_url text,
  add column oportunidad smallint check (oportunidad between 1 and 3),
  add column busqueda_id uuid references public.busquedas(id) on delete set null,
  add column codigo text not null unique default privado.codigo_informe(),
  add column informe_visto_en timestamptz,
  add column informe_visitas int not null default 0,
  add column pidio_contacto_en timestamptz,
  add column ultimo_mensaje_en timestamptz,
  add column agente_pausado boolean not null default false,
  add column carta_enviada_en timestamptz;

create index locales_busqueda_idx on public.locales (busqueda_id);
create index locales_calientes_idx on public.locales (greatest(informe_visto_en, ultimo_mensaje_en, pidio_contacto_en) desc);
create index busquedas_zona_idx on public.busquedas (zona_id, creado_en desc);
create index zonas_creado_por_idx on public.zonas (creado_por);
create index busquedas_creado_por_idx on public.busquedas (creado_por);

-- Lo que hace cada local con su informe (abrirlo, pulsar WhatsApp, ir a la tienda, pedir contacto…)
create table public.eventos (
  id bigint generated always as identity primary key,
  local_id uuid not null references public.locales(id) on delete cascade,
  tipo text not null check (tipo in ('visto','whatsapp','tienda','contacto','analizado','chat')),
  detalle text,
  creado_en timestamptz not null default now()
);
create index eventos_local_idx on public.eventos (local_id, creado_en desc);

-- Conversaciones del agente (web del informe o WhatsApp). El contexto se congela al empezar
-- para que la conversación sea siempre coherente aunque cambien precios o datos después.
create table public.conversaciones (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locales(id) on delete cascade,
  canal text not null check (canal in ('web','whatsapp')),
  wa_id text,
  contexto text not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create unique index conversaciones_wa_idx on public.conversaciones (wa_id) where canal = 'whatsapp';
create index conversaciones_local_idx on public.conversaciones (local_id, actualizado_en desc);

-- Mensajes tal cual se envían a la API (contenido en json para no reordenar nada) y en texto
-- legible para la app. autor: cliente, agente, equipo (respuesta a mano) o herramienta.
create table public.mensajes (
  id bigint generated always as identity primary key,
  conversacion_id uuid not null references public.conversaciones(id) on delete cascade,
  rol text not null check (rol in ('user','assistant')),
  autor text not null check (autor in ('cliente','agente','equipo','herramienta')),
  contenido json not null,
  texto text,
  wa_msg_id text unique,
  creado_en timestamptz not null default now()
);
create index mensajes_conversacion_idx on public.mensajes (conversacion_id, id);

-- Límite de peticiones de las páginas públicas (por IP cifrada y por acción)
create table public.limites_web (
  id bigint generated always as identity primary key,
  clave text not null,
  creado_en timestamptz not null default now()
);
create index limites_web_idx on public.limites_web (clave, creado_en desc);

-- RLS: el equipo ve todo; escribir lo hacen las funciones con la service role
alter table public.zonas enable row level security;
alter table public.busquedas enable row level security;
alter table public.eventos enable row level security;
alter table public.conversaciones enable row level security;
alter table public.mensajes enable row level security;
alter table public.limites_web enable row level security;

revoke all on public.zonas, public.busquedas, public.eventos, public.conversaciones, public.mensajes, public.limites_web from anon;
revoke all on public.busquedas, public.eventos, public.conversaciones, public.mensajes, public.limites_web from authenticated;
grant select on public.busquedas, public.eventos, public.conversaciones, public.mensajes to authenticated;

create policy "zonas_ver" on public.zonas for select to authenticated
  using ((select privado.es_miembro()));
create policy "zonas_crear" on public.zonas for insert to authenticated
  with check ((select privado.es_socio()));
create policy "zonas_editar" on public.zonas for update to authenticated
  using ((select privado.es_socio())) with check ((select privado.es_socio()));
create policy "zonas_borrar" on public.zonas for delete to authenticated
  using ((select privado.es_socio()));

create policy "busquedas_ver" on public.busquedas for select to authenticated
  using ((select privado.es_miembro()));
create policy "eventos_ver" on public.eventos for select to authenticated
  using ((select privado.es_miembro()));
create policy "conversaciones_ver" on public.conversaciones for select to authenticated
  using ((select privado.es_miembro()));
create policy "mensajes_ver" on public.mensajes for select to authenticated
  using ((select privado.es_miembro()));

alter publication supabase_realtime add table public.zonas, public.mensajes;

-- Secreto para que el cron llame al radar. Se genera aquí y no sale de la base de datos.
select vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'radar_cron', 'Secreto del cron del radar');

create or replace function public.radar_cron_ok(secreto text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'radar_cron' and decrypted_secret = secreto)
$$;
revoke execute on function public.radar_cron_ok(text) from public, anon, authenticated;
grant execute on function public.radar_cron_ok(text) to service_role;

-- Cada mañana el radar barre las zonas que tocan; cada noche se limpian los límites viejos.
select cron.schedule('radar-diario', '17 7 * * *', $$
  select net.http_post(
    url := 'https://jwissdakpdzfdrohsnzk.supabase.co/functions/v1/radar',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-radar-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'radar_cron')),
    body := '{"accion":"automatico"}'::jsonb,
    timeout_milliseconds := 120000)
$$);

select cron.schedule('limpiar-limites-web', '43 3 * * *', $$
  delete from public.limites_web where creado_en < now() - interval '2 days'
$$);
