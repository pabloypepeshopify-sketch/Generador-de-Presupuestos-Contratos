-- ---------- Alta rápida de negocio (todo o nada) ----------
create or replace function public.crear_negocio(
  p_nombre text,
  p_sector text default null,
  p_direccion text default null,
  p_localidad text default null,
  p_telefono text default null,
  p_responsable uuid default null,
  p_contacto_nombre text default null,
  p_contacto_cargo text default null,
  p_servicios text[] default '{}',
  p_nota text default null,
  p_tarea_tipo text default null,
  p_tarea_descripcion text default null,
  p_tarea_fecha date default null,
  p_tarea_hora time default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_responsable uuid := coalesce(p_responsable, auth.uid());
begin
  if not privado.es_socio() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  insert into public.negocios (nombre, sector, direccion, localidad, telefono, responsable_id, notas)
  values (btrim(p_nombre), nullif(btrim(p_sector), ''), nullif(btrim(p_direccion), ''), nullif(btrim(p_localidad), ''),
          nullif(btrim(p_telefono), ''), v_responsable, nullif(btrim(p_nota), ''))
  returning id into v_id;

  if nullif(btrim(p_contacto_nombre), '') is not null then
    insert into public.contactos (negocio_id, nombre, cargo, es_principal)
    values (v_id, btrim(p_contacto_nombre), nullif(btrim(p_contacto_cargo), ''), true);
  end if;

  insert into public.negocio_servicios (negocio_id, servicio)
  select v_id, s from unnest(coalesce(p_servicios, '{}')) s
  on conflict do nothing;

  if p_tarea_tipo is not null then
    insert into public.tareas (negocio_id, tipo, descripcion, responsable_id, vence_fecha, vence_hora)
    values (v_id, p_tarea_tipo,
            coalesce(nullif(btrim(p_tarea_descripcion), ''), (select nombre from public.tipos_tarea where codigo = p_tarea_tipo)),
            v_responsable, p_tarea_fecha, case when p_tarea_fecha is null then null else p_tarea_hora end);
  end if;
  return v_id;
end $$;

-- ---------- Registrar una interacción y su siguiente paso (todo o nada) ----------
-- p_servicios: {"automatizaciones": "alto", "web": "no", "software": null}; null = tratado sin valorar
create or replace function public.registrar_interaccion(
  p_negocio uuid,
  p_tipo text,
  p_resultado text,
  p_fecha_local text default null,
  p_socio uuid default null,
  p_persona text default null,
  p_servicios jsonb default '{}'::jsonb,
  p_notas text default null,
  p_crear_tarea boolean default false,
  p_tarea_tipo text default null,
  p_tarea_descripcion text default null,
  p_tarea_fecha date default null,
  p_tarea_hora time default null,
  p_tarea_responsable uuid default null,
  p_nuevo_estado text default null,
  p_horario_contacto text default null,
  p_completar_tarea uuid default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_fecha timestamptz;
  v_servicio text;
  v_nivel text;
  v_descripcion text;
begin
  if not privado.es_socio() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  v_fecha := case when nullif(btrim(p_fecha_local), '') is null then now()
                  else (p_fecha_local::timestamp at time zone 'Europe/Madrid') end;
  if v_fecha > now() + interval '10 minutes' then
    raise exception 'La fecha del contacto no puede ser futura' using errcode = '22023';
  end if;

  if p_crear_tarea then
    if p_tarea_tipo is null then
      raise exception 'Falta el tipo de la próxima acción' using errcode = '22023';
    end if;
    v_descripcion := coalesce(nullif(btrim(p_tarea_descripcion), ''), (select nombre from public.tipos_tarea where codigo = p_tarea_tipo));
  end if;

  insert into public.interacciones (negocio_id, tipo, fecha, socio_id, persona, resultado, servicios, notas,
                                    proxima_accion, proxima_fecha, proxima_hora)
  values (p_negocio, p_tipo, v_fecha, coalesce(p_socio, auth.uid()), nullif(btrim(p_persona), ''), p_resultado,
          coalesce((select array_agg(k) from jsonb_object_keys(coalesce(p_servicios, '{}'::jsonb)) k), '{}'),
          nullif(btrim(p_notas), ''),
          case when p_crear_tarea then v_descripcion end,
          case when p_crear_tarea then p_tarea_fecha end,
          case when p_crear_tarea and p_tarea_fecha is not null then p_tarea_hora end)
  returning id into v_id;

  -- Interés por servicio: se crea si no estaba y se actualiza el nivel si se indicó
  for v_servicio, v_nivel in select key, value #>> '{}' from jsonb_each(coalesce(p_servicios, '{}'::jsonb)) loop
    insert into public.negocio_servicios (negocio_id, servicio, nivel)
    values (p_negocio, v_servicio, coalesce(v_nivel, 'por_valorar'))
    on conflict (negocio_id, servicio) do update
      set nivel = coalesce(v_nivel, public.negocio_servicios.nivel), actualizado_en = now();
  end loop;

  if p_completar_tarea is not null then
    update public.tareas
    set estado = 'completada', cierre_interaccion_id = v_id
    where id = p_completar_tarea and negocio_id = p_negocio and estado = 'pendiente';
  end if;

  if p_crear_tarea then
    insert into public.tareas (negocio_id, tipo, descripcion, responsable_id, vence_fecha, vence_hora, origen_interaccion_id)
    values (p_negocio, p_tarea_tipo, v_descripcion,
            coalesce(p_tarea_responsable, (select responsable_id from public.negocios where id = p_negocio), auth.uid()),
            p_tarea_fecha, case when p_tarea_fecha is null then null else p_tarea_hora end, v_id);
  end if;

  if nullif(btrim(p_horario_contacto), '') is not null then
    update public.negocios set horario_contacto = btrim(p_horario_contacto) where id = p_negocio;
  end if;

  if p_nuevo_estado is not null then
    perform set_config('crm.interaccion_id', v_id::text, true);
    update public.negocios set estado = p_nuevo_estado where id = p_negocio and estado <> p_nuevo_estado;
    perform set_config('crm.interaccion_id', '', true);
  end if;

  return v_id;
end $$;

-- ---------- Posibles duplicados (nombre parecido, mismo teléfono o dirección parecida) ----------
create or replace function public.posibles_duplicados(
  p_nombre text,
  p_telefono text default null,
  p_direccion text default null,
  p_excluir uuid default null
) returns table (id uuid, nombre text, localidad text, estado text, responsable_id uuid, motivo text, parecido real)
language sql stable security invoker set search_path = '' as $$
  with q as (
    select privado.normalizar(p_nombre) as nombre,
           privado.normalizar_tel(p_telefono) as tel,
           privado.normalizar(p_direccion) as dir
  )
  select n.id, n.nombre, n.localidad, n.estado, n.responsable_id,
         case
           when q.tel is not null and length(q.tel) >= 9 and (n.telefono_norm = q.tel
                or exists (select 1 from public.contactos c where c.negocio_id = n.id and privado.normalizar_tel(c.telefono) = q.tel)) then 'telefono'
           when q.nombre is not null and extensions.similarity(n.nombre_norm, q.nombre) >= 0.45 then 'nombre'
           else 'direccion'
         end,
         greatest(coalesce(extensions.similarity(n.nombre_norm, q.nombre), 0),
                  case when q.tel is not null and n.telefono_norm = q.tel then 1 else 0 end)::real
  from public.negocios n, q
  where (p_excluir is null or n.id <> p_excluir)
    and (
      (q.tel is not null and length(q.tel) >= 9 and (n.telefono_norm = q.tel
        or exists (select 1 from public.contactos c where c.negocio_id = n.id and privado.normalizar_tel(c.telefono) = q.tel)))
      or (q.nombre is not null and length(q.nombre) >= 3 and extensions.similarity(n.nombre_norm, q.nombre) >= 0.45)
      or (q.dir is not null and length(q.dir) >= 8 and extensions.similarity(n.direccion_norm, q.dir) >= 0.6)
    )
  order by 7 desc
  limit 5
$$;

-- ---------- Indicadores del panel (hora de España) ----------
-- p_socio: null = los dos; si no, negocios de los que es responsable, contactos que hizo y tareas que tiene asignadas.
create or replace function public.panel_resumen(p_socio uuid default null)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  with
  hoy as (select (now() at time zone 'Europe/Madrid')::date as d),
  mes as (select date_trunc('month', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid' as inicio),
  semana as (select date_trunc('week', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid' as inicio),
  neg as (select n.*, e.grupo from public.negocios n join public.estados e on e.codigo = n.estado
          where p_socio is null or n.responsable_id = p_socio),
  inter as (select * from public.interacciones where p_socio is null or socio_id = p_socio),
  tar as (select * from public.tareas where estado = 'pendiente' and (p_socio is null or responsable_id = p_socio))
  select jsonb_build_object(
    'negocios', (select count(*) from neg),
    'nuevos_semana', (select count(*) from neg, semana where neg.creado_en >= semana.inicio),
    'contactos_hoy', (select count(*) from inter, hoy where (inter.fecha at time zone 'Europe/Madrid')::date = hoy.d),
    'contactos_semana', (select count(*) from inter, semana where inter.fecha >= semana.inicio),
    'negocios_contactados_semana', (select count(distinct negocio_id) from inter, semana where inter.fecha >= semana.inicio),
    'interesados', (select count(*) from neg where estado = 'interesado'),
    'oportunidades', (select count(*) from neg where grupo = 'oportunidad'),
    'propuestas_pendientes', (select count(*) from neg where estado in ('propuesta_enviada', 'decision_pendiente')),
    'clientes', (select count(*) from neg where estado = 'cliente_ganado'),
    'clientes_mes', (select count(distinct c.negocio_id) from public.cambios_estado c join neg on neg.id = c.negocio_id, mes
                     where c.estado_nuevo = 'cliente_ganado' and c.creado_en >= mes.inicio and neg.estado = 'cliente_ganado'),
    'por_localizar', (select count(*) from neg where estado = 'pendiente_localizar'),
    'sin_contactar', (select count(*) from neg where estado = 'pendiente_contactar'),
    'seguimientos_pendientes', (select count(*) from tar),
    'seguimientos_atrasados', (select count(*) from tar, hoy where tar.vence_fecha < hoy.d),
    'seguimientos_hoy', (select count(*) from tar, hoy where tar.vence_fecha = hoy.d),
    'seguimientos_sin_fecha', (select count(*) from tar where tar.vence_fecha is null)
  )
$$;

-- ---------- Acceso sin correo: códigos de un solo uso ----------
create table privado.codigos_acceso (
  id uuid primary key default gen_random_uuid(),
  usuario text not null,
  nombre text not null,
  codigo_hash text not null,
  expira_en timestamptz not null,
  usado_en timestamptz,
  intentos int not null default 0,
  creado_por uuid references public.socios(id) on delete set null,
  creado_en timestamptz not null default now()
);
create index codigos_acceso_usuario_idx on privado.codigos_acceso (usuario, creado_en desc);
create index codigos_acceso_creado_por_idx on privado.codigos_acceso (creado_por);
alter table privado.codigos_acceso enable row level security;
revoke all on privado.codigos_acceso from public, anon, authenticated;

create or replace function privado.nuevo_codigo(p_usuario text, p_nombre text, p_creado_por uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(12);
  v_codigo text := '';
begin
  for i in 0..11 loop
    v_codigo := v_codigo || substr(v_alfabeto, (get_byte(v_bytes, i) % 32) + 1, 1);
    if i in (3, 7) then v_codigo := v_codigo || '-'; end if;
  end loop;
  -- Un código nuevo anula los anteriores sin usar
  update privado.codigos_acceso set usado_en = now() where usuario = p_usuario and usado_en is null;
  insert into privado.codigos_acceso (usuario, nombre, codigo_hash, expira_en, creado_por)
  values (p_usuario, p_nombre, extensions.crypt(v_codigo, extensions.gen_salt('bf', 8)), now() + interval '48 hours', p_creado_por);
  return v_codigo;
end $$;
revoke execute on function privado.nuevo_codigo(text, text, uuid) from public, anon, authenticated;

-- Un socio genera un código para restablecer el acceso (suyo o del otro socio)
create or replace function public.generar_codigo_acceso(p_usuario text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_nombre text;
begin
  if not privado.es_socio() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select nombre into v_nombre from public.socios where usuario = p_usuario;
  if v_nombre is null then
    raise exception 'Ese usuario no existe' using errcode = '22023';
  end if;
  return privado.nuevo_codigo(p_usuario, v_nombre, auth.uid());
end $$;
revoke execute on function public.generar_codigo_acceso(text) from public, anon;
grant execute on function public.generar_codigo_acceso(text) to authenticated;

-- Solo la función Edge "acceso" (service role) canjea códigos y da de alta socios
create or replace function public.acceso_canjear(p_usuario text, p_codigo text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_codigo record;
begin
  select * into v_codigo from privado.codigos_acceso
  where usuario = lower(btrim(p_usuario)) and usado_en is null and expira_en > now() and intentos < 5
  order by creado_en desc limit 1;
  if not found then
    return jsonb_build_object('ok', false);
  end if;
  if v_codigo.codigo_hash <> extensions.crypt(upper(btrim(p_codigo)), v_codigo.codigo_hash) then
    update privado.codigos_acceso set intentos = intentos + 1 where id = v_codigo.id;
    return jsonb_build_object('ok', false);
  end if;
  update privado.codigos_acceso set usado_en = now() where id = v_codigo.id;
  return jsonb_build_object('ok', true, 'usuario', v_codigo.usuario, 'nombre', v_codigo.nombre,
                            'socio_id', (select id from public.socios where usuario = v_codigo.usuario));
end $$;

create or replace function public.acceso_alta_socio(p_id uuid, p_usuario text, p_nombre text)
returns void
language sql security definer set search_path = '' as $$
  insert into public.socios (id, usuario, nombre, color)
  values (p_id, p_usuario, p_nombre, case p_usuario when 'pepe' then '#33C6F4' else '#7C5CFF' end)
  on conflict (id) do nothing
$$;

revoke execute on function public.acceso_canjear(text, text) from public, anon, authenticated;
revoke execute on function public.acceso_alta_socio(uuid, text, text) from public, anon, authenticated;
grant execute on function public.acceso_canjear(text, text) to service_role;
grant execute on function public.acceso_alta_socio(uuid, text, text) to service_role;

revoke execute on function public.crear_negocio, public.registrar_interaccion, public.posibles_duplicados, public.panel_resumen from public, anon;
grant execute on function public.crear_negocio, public.registrar_interaccion, public.posibles_duplicados, public.panel_resumen to authenticated;
