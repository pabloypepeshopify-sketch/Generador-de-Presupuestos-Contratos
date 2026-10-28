-- Equipo (3 comerciales + 2 socios). Los usuarios se crean desde la función "equipo".
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  usuario text not null unique,
  nombre text not null,
  rol text not null default 'comercial' check (rol in ('socio','comercial')),
  color text not null default '#7C5CFF',
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create or replace function public.es_miembro() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo)
$$;

create or replace function public.es_socio() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo and rol = 'socio')
$$;

revoke execute on function public.es_miembro() from public, anon;
revoke execute on function public.es_socio() from public, anon;
grant execute on function public.es_miembro() to authenticated;
grant execute on function public.es_socio() to authenticated;

-- Catálogo de productos
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio numeric(10,2),
  precio_volumen text,
  url text,
  orden int not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Locales (bares, restaurantes...) con el estado actual del contacto
create table public.locales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text,
  telefono text,
  direccion text,
  zona text,
  dueno_nombre text,
  dueno_telefono text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','no_contesta','rellamar','cita','no_interesa','cliente')),
  interes smallint check (interes between 1 and 3),
  hablado_con_dueno boolean not null default false,
  cita_fecha date,
  cita_hora time,
  cita_comercial_id uuid references public.perfiles(id) on delete set null,
  rellamar_fecha date,
  rellamar_hora time,
  productos uuid[] not null default '{}',
  importe_venta numeric(10,2),
  comercial_id uuid references public.perfiles(id) on delete set null,
  notas text,
  ultima_llamada_en timestamptz,
  ultimo_comercial_id uuid references public.perfiles(id) on delete set null,
  num_llamadas int not null default 0,
  creado_por uuid references public.perfiles(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Historial: cada llamada o visita
create table public.llamadas (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locales(id) on delete cascade,
  comercial_id uuid not null references public.perfiles(id) default auth.uid(),
  creado_en timestamptz not null default now(),
  tipo text not null default 'llamada' check (tipo in ('llamada','visita')),
  contacto text not null check (contacto in ('nadie','empleado','dueno')),
  resultado text not null check (resultado in ('no_contesta','rellamar','cita','no_interesa','vendido')),
  interes smallint check (interes between 1 and 3),
  empleado_nombre text,
  dueno_nombre text,
  cita_fecha date,
  cita_hora time,
  cita_comercial_id uuid references public.perfiles(id) on delete set null,
  rellamar_fecha date,
  rellamar_hora time,
  productos uuid[] not null default '{}',
  importe numeric(10,2),
  notas text,
  check ((contacto = 'nadie') = (resultado = 'no_contesta')),
  check (resultado <> 'cita' or cita_fecha is not null)
);

create index locales_estado_idx on public.locales (estado);
create index locales_cita_idx on public.locales (cita_fecha) where estado = 'cita';
create index locales_comercial_idx on public.locales (comercial_id);
create index locales_cita_comercial_idx on public.locales (cita_comercial_id);
create index locales_ultimo_comercial_idx on public.locales (ultimo_comercial_id);
create index locales_creado_por_idx on public.locales (creado_por);
create index llamadas_local_idx on public.llamadas (local_id, creado_en desc);
create index llamadas_fecha_idx on public.llamadas (creado_en desc);
create index llamadas_comercial_idx on public.llamadas (comercial_id);
create index llamadas_cita_comercial_idx on public.llamadas (cita_comercial_id);

-- Mantiene actualizado_en
create or replace function public.tocar_actualizado() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger locales_actualizado before update on public.locales
  for each row execute function public.tocar_actualizado();

-- Cada llamada actualiza la ficha del local (estado, cita, dueño...)
create or replace function public.aplicar_llamada() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.resultado = 'no_contesta' then
    update public.locales l set
      estado = case when l.estado in ('pendiente','no_contesta') then 'no_contesta' else l.estado end,
      ultima_llamada_en = new.creado_en,
      ultimo_comercial_id = new.comercial_id,
      num_llamadas = l.num_llamadas + 1,
      comercial_id = coalesce(l.comercial_id, new.comercial_id)
    where l.id = new.local_id;
  else
    update public.locales l set
      estado = case new.resultado when 'vendido' then 'cliente' else new.resultado end,
      interes = coalesce(new.interes, l.interes),
      dueno_nombre = coalesce(nullif(trim(new.dueno_nombre), ''), l.dueno_nombre),
      hablado_con_dueno = l.hablado_con_dueno or new.contacto = 'dueno',
      cita_fecha = case when new.resultado = 'cita' then new.cita_fecha end,
      cita_hora = case when new.resultado = 'cita' then new.cita_hora end,
      cita_comercial_id = case when new.resultado = 'cita' then coalesce(new.cita_comercial_id, new.comercial_id) end,
      rellamar_fecha = case when new.resultado = 'rellamar' then new.rellamar_fecha end,
      rellamar_hora = case when new.resultado = 'rellamar' then new.rellamar_hora end,
      productos = case when cardinality(new.productos) > 0 then new.productos else l.productos end,
      importe_venta = case when new.resultado = 'vendido' then coalesce(new.importe, l.importe_venta) else l.importe_venta end,
      ultima_llamada_en = new.creado_en,
      ultimo_comercial_id = new.comercial_id,
      num_llamadas = l.num_llamadas + case when new.tipo = 'llamada' then 1 else 0 end,
      comercial_id = coalesce(l.comercial_id, new.comercial_id)
    where l.id = new.local_id;
  end if;
  return new;
end $$;

create trigger llamadas_aplicar after insert on public.llamadas
  for each row execute function public.aplicar_llamada();

-- RLS: todo el equipo ve todo; borrar y tocar el catálogo, solo socios
alter table public.perfiles enable row level security;
alter table public.productos enable row level security;
alter table public.locales enable row level security;
alter table public.llamadas enable row level security;

revoke all on public.perfiles, public.productos, public.locales, public.llamadas from anon;
revoke insert, update, delete on public.perfiles from authenticated;
grant select on public.perfiles to authenticated;
grant update (nombre, color) on public.perfiles to authenticated;

create policy "perfiles_ver" on public.perfiles for select to authenticated
  using ((select public.es_miembro()));
create policy "perfiles_editar_propio" on public.perfiles for update to authenticated
  using (id = (select auth.uid()) and (select public.es_miembro()))
  with check (id = (select auth.uid()));

create policy "productos_ver" on public.productos for select to authenticated
  using ((select public.es_miembro()));
create policy "productos_crear" on public.productos for insert to authenticated
  with check ((select public.es_socio()));
create policy "productos_editar" on public.productos for update to authenticated
  using ((select public.es_socio())) with check ((select public.es_socio()));
create policy "productos_borrar" on public.productos for delete to authenticated
  using ((select public.es_socio()));

create policy "locales_ver" on public.locales for select to authenticated
  using ((select public.es_miembro()));
create policy "locales_crear" on public.locales for insert to authenticated
  with check ((select public.es_miembro()));
create policy "locales_editar" on public.locales for update to authenticated
  using ((select public.es_miembro())) with check ((select public.es_miembro()));
create policy "locales_borrar" on public.locales for delete to authenticated
  using ((select public.es_socio()));

create policy "llamadas_ver" on public.llamadas for select to authenticated
  using ((select public.es_miembro()));
create policy "llamadas_crear" on public.llamadas for insert to authenticated
  with check ((select public.es_miembro()) and comercial_id = (select auth.uid()));
create policy "llamadas_editar" on public.llamadas for update to authenticated
  using ((select public.es_socio()) or comercial_id = (select auth.uid()))
  with check ((select public.es_socio()) or comercial_id = (select auth.uid()));
create policy "llamadas_borrar" on public.llamadas for delete to authenticated
  using ((select public.es_socio()));

-- Tiempo real para que todos vean los cambios al momento
alter publication supabase_realtime add table public.locales, public.llamadas, public.perfiles, public.productos;

-- Catálogo inicial (precios de visaxnfc.es)
insert into public.productos (nombre, descripcion, precio, precio_volumen, url, orden) values
  ('Tarjeta NFC "Toca para ver menú"', 'Pégala en la mesa y tu carta se abre en el móvil del cliente con un toque.', 15.00, '12,50 €/ud desde 40 ud', 'https://visaxnfc.es/productos/tarjeta-nfc-menu', 1),
  ('Expositor NFC de reseñas Google', 'Un toque con el móvil y tu cliente está en tu ficha, listo para dejar la reseña.', 29.99, '10,00 €/ud desde 50 ud · 6,00 €/ud desde 100 ud', 'https://visaxnfc.es/productos/expositor-resenas-google', 2),
  ('NFC de WiFi', 'Tu cliente toca y se conecta a tu WiFi, sin pedir ni teclear la contraseña.', 25.00, '20,00 €/ud desde 3 ud', 'https://visaxnfc.es/productos/nfc-wifi', 3),
  ('NFC para llamar al camarero', 'Un toque en la mesa y en tu tablet salta «Mesa 4 llama».', 15.00, '12,50 €/ud desde 40 ud', 'https://visaxnfc.es/productos/nfc-llamar-camarero', 4),
  ('NFC de pedido en mesa', 'Tu cliente ve la carta y pide desde su móvil. El pedido llega directo a cocina.', 15.00, '12,50 €/ud desde 40 ud', 'https://visaxnfc.es/productos/nfc-pedido-en-mesa', 5),
  ('NFC de redes sociales', 'Un toque y tu cliente está en tu Instagram o tu Facebook, listo para seguirte.', 25.00, null, 'https://visaxnfc.es/productos/nfc-redes-sociales', 6);
