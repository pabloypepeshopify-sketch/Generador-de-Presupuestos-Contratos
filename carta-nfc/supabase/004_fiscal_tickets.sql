-- Carta NFC · Facturación: listado completo de tickets y facturas (idempotente).
-- Requiere 003_fiscal.sql. Solo añade una función y un índice; no cambia tablas ni RPC existentes.
--
-- fiscal_documentos(slug, clave de cocina o admin, filtro) → página de documentos + totales del periodo.
--   filtro: { desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD', q: texto, tipo: 'ticket'|'factura',
--             limite: 1..500 (50), saltar: n (0) }
--   q busca en número, mesa y NIF/nombre del cliente. Las fechas son la fecha de expedición (hora local).

-- El estado de envío y el orden de emisión salen del registro SIF de cada documento.
create index if not exists registros_sif_doc_idx on fiscal.registros_sif (documento_id, id);

create or replace function public.fiscal_documentos(p_slug text, p_clave text, p_filtro jsonb default '{}')
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r       carta.restaurantes;
  f       jsonb := coalesce(p_filtro, '{}'::jsonb);
  v_desde date;
  v_hasta date;
  v_q     text := lower(left(trim(coalesce(f->>'q', '')), 60));
  v_tipo  text := nullif(f->>'tipo', '');
  v_lim   int;
  v_salto int;
  v_res   jsonb;
begin
  r := carta._auth(p_slug, p_clave, 'cocina');
  if coalesce(f->>'desde', '') !~ '^([0-9]{4}-[0-9]{2}-[0-9]{2})?$' or coalesce(f->>'hasta', '') !~ '^([0-9]{4}-[0-9]{2}-[0-9]{2})?$'
     or coalesce(f->>'limite', '') !~ '^[0-9]{0,3}$' or coalesce(f->>'saltar', '') !~ '^[0-9]{0,7}$'
     or coalesce(v_tipo, 'ticket') not in ('ticket', 'factura') then
    raise exception 'filtro_no_valido';
  end if;
  begin
    v_desde := nullif(f->>'desde', '')::date;
    v_hasta := nullif(f->>'hasta', '')::date;
  exception when others then
    raise exception 'filtro_no_valido';
  end;
  v_lim   := least(greatest(coalesce(nullif(f->>'limite', '')::int, 50), 1), 500);
  v_salto := coalesce(nullif(f->>'saltar', '')::int, 0);

  with sel as (
    select d.*, ra.id as orden, ru.estado_envio as envio
      from fiscal.documentos d
      left join lateral (select x.id from fiscal.registros_sif x where x.documento_id = d.id order by x.id limit 1) ra on true
      left join lateral (select x.estado_envio from fiscal.registros_sif x where x.documento_id = d.id order by x.id desc limit 1) ru on true
     where d.restaurante_id = r.id
       and (v_desde is null or d.fecha_expedicion >= v_desde)
       and (v_hasta is null or d.fecha_expedicion <= v_hasta)
       and (v_tipo is null or (v_tipo = 'factura') = (d.tipo in ('F1', 'R1', 'R2', 'R3', 'R4')))
       and (v_q = '' or position(v_q in lower(d.num_serie)) > 0
                     or position(v_q in lower(coalesce(d.mesa_nombre, ''))) > 0
                     or position(v_q in lower(coalesce(d.cliente->>'nif', ''))) > 0
                     or position(v_q in lower(coalesce(d.cliente->>'nombre', ''))) > 0)
  ), pagina as (
    select * from sel order by expedido desc, orden desc nulls last limit v_lim offset v_salto
  )
  select jsonb_build_object(
    'hoy', (now() at time zone r.zona_horaria)::date,
    'documentos', coalesce((select jsonb_agg(jsonb_build_object(
        'token', p.token, 'tipo', p.tipo, 'num_serie', p.num_serie, 'estado', p.estado,
        'fecha', p.fecha_expedicion, 'expedido', p.expedido, 'mesa', p.mesa_nombre,
        'cliente', p.cliente, 'desglose', p.desglose,
        'base_total', p.base_total, 'cuota_total', p.cuota_total, 'total', p.total, 'propina', p.propina,
        'formas', (select coalesce(jsonb_agg(distinct x->>'forma'), '[]'::jsonb) from jsonb_array_elements(p.pagos) x),
        'entorno', p.sif_entorno,
        'envio', p.envio)
      order by p.expedido desc, p.orden desc nulls last) from pagina p), '[]'::jsonb),
    'cuantos', (select count(*) from sel),
    'hay_mas', (select count(*) from sel) > v_salto + v_lim,
    'resumen', (select jsonb_build_object(
        'total', coalesce(sum(s.total), 0), 'base', coalesce(sum(s.base_total), 0),
        'cuota', coalesce(sum(s.cuota_total), 0), 'propinas', coalesce(sum(s.propina), 0))
      from sel s where s.estado <> 'anulado'),
    'por_forma', (select coalesce(jsonb_object_agg(z.forma, z.importe), '{}'::jsonb)
                    from (select x->>'forma' as forma, sum((x->>'importe')::numeric) as importe
                            from sel s, jsonb_array_elements(s.pagos) x
                           where s.estado <> 'anulado' group by 1) z)
  ) into v_res;
  return v_res;
end $$;

revoke all on function public.fiscal_documentos(text, text, jsonb) from public;
grant execute on function public.fiscal_documentos(text, text, jsonb) to anon, authenticated;
