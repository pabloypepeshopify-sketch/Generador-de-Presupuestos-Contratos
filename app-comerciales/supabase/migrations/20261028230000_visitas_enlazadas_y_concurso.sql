-- Cada visita sabe de qué cita viene y quién consiguió esa cita (para el concurso).
alter table public.llamadas
  add column cita_origen_id uuid references public.llamadas(id) on delete set null,
  add column cita_conseguida_por uuid references public.perfiles(id) on delete set null;

create index llamadas_cita_origen_idx on public.llamadas (cita_origen_id);
create index llamadas_cita_conseguida_idx on public.llamadas (cita_conseguida_por);

-- Lo calcula siempre la base de datos: el móvil no puede elegir a qué cita se apunta una visita.
create or replace function public.enlazar_visita() returns trigger
language plpgsql set search_path = '' as $$
declare
  origen record;
begin
  new.cita_origen_id := null;
  new.cita_conseguida_por := null;
  if new.tipo = 'visita'
     and (select l.estado from public.locales l where l.id = new.local_id) = 'cita' then
    select o.id, o.tipo, o.contacto, o.comercial_id, o.cita_conseguida_por into origen
    from public.llamadas o
    where o.local_id = new.local_id and o.resultado = 'cita'
    order by o.creado_en desc
    limit 1;
    if found then
      new.cita_origen_id := origen.id;
      -- El punto es de quien consiguió la cita por teléfono. Si la cita venía de una visita
      -- en la que no estaba el dueño, el punto pendiente pasa a esta visita.
      new.cita_conseguida_por := case
        when origen.tipo = 'llamada' then origen.comercial_id
        when origen.contacto <> 'dueno' then origen.cita_conseguida_por
      end;
    end if;
  end if;
  return new;
end $$;

create trigger llamadas_enlazar before insert on public.llamadas
  for each row execute function public.enlazar_visita();

-- Una visita a puerta cerrada no suma llamadas
create or replace function public.aplicar_llamada() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.resultado = 'no_contesta' then
    update public.locales l set
      estado = case when l.estado in ('pendiente','no_contesta') then 'no_contesta' else l.estado end,
      ultima_llamada_en = new.creado_en,
      ultimo_comercial_id = new.comercial_id,
      num_llamadas = l.num_llamadas + case when new.tipo = 'llamada' then 1 else 0 end,
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

-- Para que los puntos sean de fiar: no se puede poner otra fecha ni tocar una llamada ya guardada
-- (salvo las notas). Los socios siguen pudiendo borrar.
revoke insert, update on public.llamadas from authenticated;
grant insert (local_id, comercial_id, tipo, contacto, resultado, interes, empleado_nombre, dueno_nombre,
  cita_fecha, cita_hora, cita_comercial_id, rellamar_fecha, rellamar_hora, productos, importe, notas)
  on public.llamadas to authenticated;
grant update (notas) on public.llamadas to authenticated;
