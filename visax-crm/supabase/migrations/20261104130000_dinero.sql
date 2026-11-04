-- VISAX AI CRM · Dinero: servicios contratados, cobros, facturas en PDF y gastos.
-- Importes en euros. Las ganancias se cuentan sin IVA; el IRPF retenido no es un gasto.

-- ---------- Servicios contratados (lo que paga cada cliente) ----------
create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  concepto text not null check (length(btrim(concepto)) between 1 and 160),
  servicio text references public.servicios(codigo) on update cascade,
  periodicidad text not null check (periodicidad in ('unico', 'mensual', 'trimestral', 'anual')),
  importe_base numeric(12, 2) not null check (importe_base > 0),
  iva_pct numeric(5, 2) not null default 21 check (iva_pct between 0 and 30),
  irpf_pct numeric(5, 2) not null default 7 check (irpf_pct between 0 and 30),
  fecha_inicio date not null,
  fecha_fin date,
  notas text,
  creado_por uuid references public.socios(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (fecha_fin is null or (periodicidad <> 'unico' and fecha_fin >= fecha_inicio))
);

-- ---------- Cobros: previstos (cuotas o pagos únicos) y cobrados ----------
create table public.cobros (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  contrato_id uuid references public.contratos(id) on delete set null,
  concepto text not null check (length(btrim(concepto)) between 1 and 200),
  fecha_prevista date not null,
  importe_base numeric(12, 2) not null check (importe_base > 0),
  iva_pct numeric(5, 2) not null default 21 check (iva_pct between 0 and 30),
  irpf_pct numeric(5, 2) not null default 7 check (irpf_pct between 0 and 30),
  importe_iva numeric(12, 2) generated always as (round(importe_base * iva_pct / 100, 2)) stored,
  importe_irpf numeric(12, 2) generated always as (round(importe_base * irpf_pct / 100, 2)) stored,
  importe_total numeric(12, 2) generated always as
    (importe_base + round(importe_base * iva_pct / 100, 2) - round(importe_base * irpf_pct / 100, 2)) stored,
  -- anulado: una cuota que no se va a cobrar (se conserva para que no se vuelva a generar)
  estado text not null default 'pendiente' check (estado in ('pendiente', 'cobrado', 'anulado')),
  fecha_cobro date,
  metodo text check (metodo in ('transferencia', 'bizum', 'tarjeta', 'efectivo', 'domiciliacion', 'otro')),
  cobrado_por uuid references public.socios(id) on delete set null,
  notas text,
  creado_por uuid references public.socios(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (contrato_id, fecha_prevista),
  check ((estado = 'cobrado') = (fecha_cobro is not null))
);

-- ---------- Facturas en PDF (solo para tenerlas ordenadas) ----------
create table public.facturas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  cobro_id uuid references public.cobros(id) on delete set null,
  numero text check (numero is null or length(btrim(numero)) between 1 and 40),
  fecha date not null,
  importe_total numeric(12, 2) check (importe_total >= 0),
  archivo_path text not null unique check (archivo_path ~ '^facturas/[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$'),
  archivo_nombre text not null check (length(archivo_nombre) between 1 and 200),
  archivo_bytes int check (archivo_bytes between 1 and 10485760),
  notas text,
  creado_por uuid references public.socios(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now()
);
create unique index facturas_numero_unico on public.facturas (lower(btrim(numero))) where numero is not null;

-- ---------- Gastos: generales (sin negocio) o de un cliente ----------
create table public.gastos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references public.negocios(id) on delete set null,
  concepto text not null check (length(btrim(concepto)) between 1 and 160),
  categoria text not null check (categoria in ('hosting', 'herramientas', 'ia_apis', 'publicidad', 'material', 'gestoria', 'desplazamientos', 'formacion', 'otros')),
  fecha date not null,
  importe_base numeric(12, 2) not null check (importe_base > 0),
  iva_pct numeric(5, 2) not null default 21 check (iva_pct between 0 and 30),
  importe_iva numeric(12, 2) generated always as (round(importe_base * iva_pct / 100, 2)) stored,
  importe_total numeric(12, 2) generated always as (importe_base + round(importe_base * iva_pct / 100, 2)) stored,
  justificante_path text unique check (justificante_path is null or justificante_path ~ '^gastos/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$'),
  justificante_nombre text check (justificante_nombre is null or length(justificante_nombre) between 1 and 200),
  notas text,
  creado_por uuid references public.socios(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- ---------- Índices ----------
create index contratos_negocio_idx on public.contratos (negocio_id);
create index contratos_servicio_idx on public.contratos (servicio);
create index contratos_creado_por_idx on public.contratos (creado_por);
create index cobros_negocio_idx on public.cobros (negocio_id, fecha_prevista);
create index cobros_pendientes_idx on public.cobros (fecha_prevista) where estado = 'pendiente';
create index cobros_cobrados_idx on public.cobros (fecha_cobro) where estado = 'cobrado';
create index cobros_cobrado_por_idx on public.cobros (cobrado_por);
create index cobros_creado_por_idx on public.cobros (creado_por);
create index facturas_negocio_idx on public.facturas (negocio_id, fecha desc);
create index facturas_cobro_idx on public.facturas (cobro_id);
create index facturas_fecha_idx on public.facturas (fecha desc);
create index facturas_creado_por_idx on public.facturas (creado_por);
create index gastos_fecha_idx on public.gastos (fecha desc);
create index gastos_negocio_idx on public.gastos (negocio_id);
create index gastos_creado_por_idx on public.gastos (creado_por);

-- ---------- Disparadores ----------
create trigger contratos_actualizado before update on public.contratos
  for each row execute function privado.tocar_actualizado();
create trigger cobros_actualizado before update on public.cobros
  for each row execute function privado.tocar_actualizado();
create trigger gastos_actualizado before update on public.gastos
  for each row execute function privado.tocar_actualizado();

-- Quién marcó el cobro; al deshacerlo se limpian sus datos de cobro
create or replace function privado.preparar_cobro() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.estado = 'cobrado' then
    if tg_op = 'INSERT' or old.estado <> 'cobrado' then
      new.cobrado_por := coalesce(auth.uid(), new.cobrado_por);
    end if;
  else
    new.fecha_cobro := null;
    new.metodo := null;
    new.cobrado_por := null;
  end if;
  return new;
end $$;

create trigger cobros_preparar before insert or update on public.cobros
  for each row execute function privado.preparar_cobro();

-- ---------- Cuotas: se generan solas hasta un mes vista (sin procesos programados) ----------
create or replace function privado.paso(p_periodicidad text) returns interval
language sql immutable parallel safe set search_path = '' as $$
  select case p_periodicidad
    when 'mensual' then interval '1 month'
    when 'trimestral' then interval '3 months'
    when 'anual' then interval '1 year'
    else interval '0'
  end
$$;

create or replace function privado.concepto_cuota(p_concepto text, p_periodicidad text, p_fecha date) returns text
language sql immutable parallel safe set search_path = '' as $$
  select case p_periodicidad
    when 'unico' then p_concepto
    when 'anual' then p_concepto || ' · ' || extract(year from p_fecha)::int
    else p_concepto || ' · ' ||
      (array['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'])[extract(month from p_fecha)::int]
      || ' ' || extract(year from p_fecha)::int
  end
$$;

-- Crea las cuotas que falten (todas hasta hoy + 31 días). Idempotente: se puede llamar siempre que se abra el apartado.
create or replace function public.generar_cobros(p_contrato uuid default null)
returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_hasta date := (now() at time zone 'Europe/Madrid')::date + 31;
  v_n int;
begin
  if not privado.es_socio() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  insert into public.cobros (negocio_id, contrato_id, concepto, fecha_prevista, importe_base, iva_pct, irpf_pct)
  select c.negocio_id, c.id, privado.concepto_cuota(c.concepto, c.periodicidad, f.fecha), f.fecha, c.importe_base, c.iva_pct, c.irpf_pct
  from public.contratos c
  cross join lateral (
    select (c.fecha_inicio + n * privado.paso(c.periodicidad))::date as fecha
    from generate_series(0, case when c.periodicidad = 'unico' then 0 else 1200 end) n
  ) f
  where (p_contrato is null or c.id = p_contrato)
    and (c.periodicidad = 'unico' or f.fecha <= least(coalesce(c.fecha_fin, v_hasta), v_hasta))
  on conflict (contrato_id, fecha_prevista) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Alta o edición de un servicio contratado. Al editar, las cuotas pendientes sin factura se rehacen
-- con los datos nuevos; las cobradas, anuladas o ya facturadas no se tocan.
create or replace function public.guardar_contrato(
  p_id uuid,
  p_negocio uuid,
  p_concepto text,
  p_servicio text,
  p_periodicidad text,
  p_importe numeric,
  p_iva numeric,
  p_irpf numeric,
  p_inicio date,
  p_fin date default null,
  p_notas text default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_fin date := case when p_periodicidad = 'unico' then null else p_fin end;
begin
  if not privado.es_socio() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_id is null then
    insert into public.contratos (negocio_id, concepto, servicio, periodicidad, importe_base, iva_pct, irpf_pct, fecha_inicio, fecha_fin, notas)
    values (p_negocio, btrim(p_concepto), p_servicio, p_periodicidad, p_importe, p_iva, p_irpf, p_inicio, v_fin, nullif(btrim(p_notas), ''))
    returning id into v_id;
  else
    update public.contratos
    set concepto = btrim(p_concepto), servicio = p_servicio, periodicidad = p_periodicidad, importe_base = p_importe,
        iva_pct = p_iva, irpf_pct = p_irpf, fecha_inicio = p_inicio, fecha_fin = v_fin, notas = nullif(btrim(p_notas), '')
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Ese servicio ya no existe' using errcode = 'P0002';
    end if;
    delete from public.cobros c
    where c.contrato_id = v_id and c.estado = 'pendiente'
      and not exists (select 1 from public.facturas f where f.cobro_id = c.id);
  end if;
  perform public.generar_cobros(v_id);
  return v_id;
end $$;

-- Quita un servicio contratado: se van sus cuotas pendientes y anuladas; lo cobrado y lo facturado se queda.
create or replace function public.borrar_contrato(p_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not privado.es_socio() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  delete from public.cobros c
  where c.contrato_id = p_id and c.estado in ('pendiente', 'anulado')
    and not exists (select 1 from public.facturas f where f.cobro_id = c.id);
  delete from public.contratos where id = p_id;
end $$;

-- ---------- Resumen de dinero de un periodo (criterio de caja: lo cobrado en esas fechas) ----------
create or replace function public.dinero_resumen(p_desde date, p_hasta date)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  with
  hoy as (select (now() at time zone 'Europe/Madrid')::date as d),
  c as (select * from public.cobros where estado = 'cobrado' and fecha_cobro between p_desde and p_hasta),
  g as (select * from public.gastos where fecha between p_desde and p_hasta),
  p as (select public.cobros.* from public.cobros, hoy where estado = 'pendiente' and fecha_prevista <= hoy.d)
  select jsonb_build_object(
    'ingresos', (select coalesce(sum(importe_base), 0) from c),
    'iva_cobrado', (select coalesce(sum(importe_iva), 0) from c),
    'irpf_retenido', (select coalesce(sum(importe_irpf), 0) from c),
    'entrado', (select coalesce(sum(importe_total), 0) from c),
    'num_cobros', (select count(*) from c),
    'gastos', (select coalesce(sum(importe_base), 0) from g),
    'gastos_iva', (select coalesce(sum(importe_iva), 0) from g),
    'num_gastos', (select count(*) from g),
    'pendiente_vencido', (select coalesce(sum(importe_total), 0) from p),
    'num_pendientes_vencidos', (select count(*) from p),
    'num_atrasados', (select count(*) from p, hoy where p.fecha_prevista < hoy.d)
  )
$$;

-- ---------- Seguridad: solo los socios ----------
alter table public.contratos enable row level security;
alter table public.cobros enable row level security;
alter table public.facturas enable row level security;
alter table public.gastos enable row level security;

revoke all on public.contratos, public.cobros, public.facturas, public.gastos from anon;

create policy contratos_socios on public.contratos for all to authenticated
  using ((select privado.es_socio())) with check ((select privado.es_socio()));
create policy cobros_socios on public.cobros for all to authenticated
  using ((select privado.es_socio())) with check ((select privado.es_socio()));
create policy facturas_socios on public.facturas for all to authenticated
  using ((select privado.es_socio())) with check ((select privado.es_socio()));
create policy gastos_socios on public.gastos for all to authenticated
  using ((select privado.es_socio())) with check ((select privado.es_socio()));

revoke execute on function public.generar_cobros(uuid), public.guardar_contrato(uuid, uuid, text, text, text, numeric, numeric, numeric, date, date, text),
  public.borrar_contrato(uuid), public.dinero_resumen(date, date) from public, anon;
grant execute on function public.generar_cobros(uuid), public.guardar_contrato(uuid, uuid, text, text, text, numeric, numeric, numeric, date, date, text),
  public.borrar_contrato(uuid), public.dinero_resumen(date, date) to authenticated;

-- ---------- Almacén privado de documentos (facturas y justificantes) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy crm_documentos_ver on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and (select privado.es_socio()));
create policy crm_documentos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and (select privado.es_socio()));
create policy crm_documentos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and (select privado.es_socio()));
