-- Avisos al móvil con la app ntfy (gratis, Android e iOS).
-- Cada persona tiene su canal privado y se suscribe a él en ntfy. Llega aviso:
--   · al apuntar o cambiar una cita (a quien va) y una rellamada (a quien llamó);
--   · 1 hora antes de cada cita (a quien va).
-- Los socios reciben además los avisos de todo el equipo.

-- ---------- Canales ----------
create table public.avisos_canales (
  perfil_id uuid primary key references public.perfiles(id) on delete cascade,
  canal text not null unique default ('visax-' || replace(gen_random_uuid()::text, '-', '')),
  creado_en timestamptz not null default now()
);

alter table public.avisos_canales enable row level security;
revoke all on public.avisos_canales from anon, authenticated;
grant select on public.avisos_canales to authenticated;
-- Cada uno solo ve su canal: quien conozca un canal puede leer sus avisos.
create policy "avisos_canal_propio" on public.avisos_canales for select to authenticated
  using (perfil_id = (select auth.uid()) and (select privado.es_miembro()));

insert into public.avisos_canales (perfil_id) select id from public.perfiles on conflict do nothing;

create or replace function privado.crear_canal_aviso() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.avisos_canales (perfil_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger perfiles_canal_aviso after insert on public.perfiles
  for each row execute function privado.crear_canal_aviso();

-- ---------- Utilidades de texto ----------
-- "hoy 10:30", "mañana 10:30", "jue 13 nov 10:30" (hora de Madrid)
create or replace function privado.cuando_es(f date, h time) returns text
language sql stable set search_path = '' as $$
  select case
      when f is null then 'sin fecha'
      when f = (now() at time zone 'Europe/Madrid')::date then 'hoy'
      when f = (now() at time zone 'Europe/Madrid')::date + 1 then 'mañana'
      else (array['dom','lun','mar','mié','jue','vie','sáb'])[extract(dow from f)::int + 1] || ' ' ||
           extract(day from f)::int || ' ' ||
           (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from f)::int]
    end || coalesce(' ' || to_char(h, 'HH24:MI'), '')
$$;

create or replace function privado.url_txt(t text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(string_agg(
    case when ch ~ '^[A-Za-z0-9._~-]$' then ch
         else regexp_replace(upper(encode(convert_to(ch, 'UTF8'), 'hex')), '(..)', '%\1', 'g') end, '' order by i), '')
  from unnest(regexp_split_to_array(t, '')) with ordinality as x(ch, i)
$$;

-- ---------- Envío ----------
-- Envía a los canales de `para` y, salvo `solo_para`, a los de todos los socios.
create or replace function privado.enviar_aviso(
  para uuid[], titulo text, mensaje text, local_id uuid default null,
  telefono text default null, direccion text default null, etiqueta text default 'bell', solo_para boolean default false
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c text;
  ficha text := case when local_id is not null then 'https://visax-equipo.vercel.app/#/local/' || local_id end;
  tel text := nullif(regexp_replace(coalesce(telefono, ''), '[^0-9+]', '', 'g'), '');
  acciones jsonb := '[]'::jsonb;
begin
  if ficha is not null then
    acciones := acciones || jsonb_build_object('action', 'view', 'label', 'Abrir ficha', 'url', ficha);
  end if;
  if tel is not null then
    acciones := acciones || jsonb_build_object('action', 'view', 'label', 'Llamar', 'url', 'tel:' || tel);
  end if;
  if nullif(trim(coalesce(direccion, '')), '') is not null then
    acciones := acciones || jsonb_build_object('action', 'view', 'label', 'Cómo llegar',
      'url', 'https://www.google.com/maps/search/?api=1&query=' || privado.url_txt(direccion));
  end if;

  for c in
    select distinct a.canal
    from public.avisos_canales a join public.perfiles p on p.id = a.perfil_id
    where p.activo and (p.id = any(para) or (not solo_para and p.rol = 'socio'))
  loop
    perform net.http_post(
      url := 'https://ntfy.sh',
      body := jsonb_strip_nulls(jsonb_build_object(
        'topic', c, 'title', titulo, 'message', mensaje, 'tags', jsonb_build_array(etiqueta),
        'priority', 4, 'click', ficha, 'actions', case when jsonb_array_length(acciones) > 0 then acciones end)),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end loop;
end $$;

-- ---------- Al apuntar o cambiar citas y rellamadas ----------
create or replace function privado.avisar_local() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  nuevo_cita boolean;
  nuevo_rellamar boolean;
  quien uuid;
  nombre_quien text;
  dueno text := concat_ws(' · ', nullif(trim(coalesce(new.dueno_nombre, '')), ''), nullif(trim(coalesce(new.dueno_telefono, '')), ''));
  tel text := coalesce(nullif(trim(coalesce(new.dueno_telefono, '')), ''), nullif(trim(coalesce(new.telefono, '')), ''));
begin
  nuevo_cita := new.estado = 'cita' and new.cita_fecha is not null and (
    tg_op = 'INSERT' or old.estado is distinct from 'cita'
    or (old.cita_fecha, old.cita_hora, old.cita_comercial_id) is distinct from (new.cita_fecha, new.cita_hora, new.cita_comercial_id));
  nuevo_rellamar := new.estado = 'rellamar' and (
    tg_op = 'INSERT' or old.estado is distinct from 'rellamar'
    or (old.rellamar_fecha, old.rellamar_hora) is distinct from (new.rellamar_fecha, new.rellamar_hora));

  if nuevo_cita then
    quien := new.cita_comercial_id;
    select nombre into nombre_quien from public.perfiles where id = quien;
    perform privado.enviar_aviso(
      array[quien],
      case when tg_op = 'UPDATE' and old.estado = 'cita' then 'Cita cambiada: ' else 'Nueva cita: ' end
        || new.nombre || ' · ' || privado.cuando_es(new.cita_fecha, new.cita_hora),
      concat_ws(E'\n', 'Va: ' || coalesce(nombre_quien, 'sin asignar'),
        nullif(trim(coalesce(new.direccion, '')), ''), nullif('Dueño: ' || dueno, 'Dueño: ')),
      new.id, tel, new.direccion, 'calendar');
  elsif nuevo_rellamar then
    quien := coalesce(new.ultimo_comercial_id, new.comercial_id);
    select nombre into nombre_quien from public.perfiles where id = quien;
    perform privado.enviar_aviso(
      array[quien],
      'Volver a llamar: ' || new.nombre || ' · ' || privado.cuando_es(new.rellamar_fecha, new.rellamar_hora),
      concat_ws(E'\n', 'Le toca a: ' || coalesce(nombre_quien, 'sin asignar'),
        'Tel: ' || tel, nullif('Dueño: ' || dueno, 'Dueño: ')),
      new.id, tel, null, 'telephone_receiver');
  end if;
  return null;
end $$;

create trigger locales_avisos
  after insert or update of estado, cita_fecha, cita_hora, cita_comercial_id, rellamar_fecha, rellamar_hora
  on public.locales for each row execute function privado.avisar_local();

-- ---------- Recordatorio 1 hora antes de cada cita ----------
-- Guarda para qué fecha y hora se avisó, así una cita cambiada vuelve a avisarse.
create table privado.avisos_recordatorios (
  local_id uuid primary key references public.locales(id) on delete cascade,
  cita_en timestamptz not null
);

create or replace function privado.recordar_citas() returns void
language plpgsql security definer set search_path = '' as $$
declare
  l record;
  cuando timestamptz;
  nombre_quien text;
begin
  for l in
    select * from public.locales
    where estado = 'cita' and cita_fecha is not null and cita_hora is not null
      and (cita_fecha + cita_hora) at time zone 'Europe/Madrid' between now() and now() + interval '60 minutes'
  loop
    cuando := (l.cita_fecha + l.cita_hora) at time zone 'Europe/Madrid';
    continue when exists (select 1 from privado.avisos_recordatorios r where r.local_id = l.id and r.cita_en = cuando);
    insert into privado.avisos_recordatorios (local_id, cita_en) values (l.id, cuando)
      on conflict (local_id) do update set cita_en = excluded.cita_en;
    select nombre into nombre_quien from public.perfiles where id = l.cita_comercial_id;
    perform privado.enviar_aviso(
      array[l.cita_comercial_id],
      'En ' || greatest(1, round(extract(epoch from cuando - now()) / 60))::int || ' min: cita en ' || l.nombre
        || ' a las ' || to_char(l.cita_hora, 'HH24:MI'),
      concat_ws(E'\n', 'Va: ' || coalesce(nombre_quien, 'sin asignar'),
        nullif(trim(coalesce(l.direccion, '')), ''),
        nullif('Dueño: ' || concat_ws(' · ', nullif(trim(coalesce(l.dueno_nombre, '')), ''), nullif(trim(coalesce(l.dueno_telefono, '')), '')), 'Dueño: ')),
      l.id, coalesce(nullif(trim(coalesce(l.dueno_telefono, '')), ''), nullif(trim(coalesce(l.telefono, '')), '')),
      l.direccion, 'alarm_clock');
  end loop;
end $$;

select cron.schedule('recordar-citas', '*/5 * * * *', 'select privado.recordar_citas()');

-- ---------- Aviso de prueba desde la app (solo a tu canal) ----------
create or replace function public.probar_aviso() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_miembro() then
    raise exception 'Sin acceso';
  end if;
  perform privado.enviar_aviso(array[auth.uid()], 'Avisos activados',
    'Así te llegarán las citas y las rellamadas. ¡A por ellas!', null, null, null, 'tada', true);
end $$;

revoke execute on function public.probar_aviso() from public, anon;
grant execute on function public.probar_aviso() to authenticated;
revoke execute on function privado.enviar_aviso(uuid[], text, text, uuid, text, text, text, boolean) from public, anon, authenticated;
revoke execute on function privado.recordar_citas() from public, anon, authenticated;
