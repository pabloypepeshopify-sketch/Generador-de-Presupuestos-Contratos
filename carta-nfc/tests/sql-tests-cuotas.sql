-- Pruebas de "Mis clientes y cobros" (008_cuotas.sql). Requiere bash db-local.sh.
\set ON_ERROR_STOP 1

select carta.fijar_clave_plataforma('plataforma-test');
select carta._alta('Bar Cuotas', 'bar-cuotas', 2, 'admin-c', 'cocina-c');
select carta._alta('Bar Gratis', 'bar-gratis', 1, 'admin-g', 'cocina-g');
select carta._alta('Bar Nuevo', 'bar-nuevo', 1, 'admin-n', 'cocina-n');
-- Bar Cuotas se dio de alta hace 75 días; el primer cobro fue el día del alta.
update carta.restaurantes set creado = now() - interval '75 days' where slug = 'bar-cuotas';

do $$ begin
  -- mes corto: inicio el 31 → 28/29 de febrero y vuelve al 31
  assert (select array_agg(f) from carta._cuota_periodos('2026-01-31', '2026-03-31') f) =
         array['2026-01-31','2026-02-28','2026-03-31']::date[], 'meses cortos';
  assert carta._cuota_proximo('2026-01-31', '2026-02-28') = '2026-03-31', 'próximo tras febrero';
end $$;
set role anon;
do $$
declare
  v jsonb; c jsonb; ok boolean; hoy date := (now() at time zone 'Europe/Madrid')::date; alta date := hoy - 75;
  f jsonb;
begin
  -- clave
  begin perform public.carta_cuotas('mala'); ok := false; exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'clave de plataforma obligatoria';

  -- sin configurar: 29 €, inicio = alta, meses pendientes desde el alta
  v := public.carta_cuotas('plataforma-test');
  c := (select x->'cuota' from jsonb_array_elements(v->'clientes') x where x->>'slug' = 'bar-cuotas');
  assert (c->>'importe')::numeric = 29, 'cuota por defecto 29 €';
  assert (c->>'inicio')::date = alta, 'inicio = fecha de alta';
  assert jsonb_array_length(c->'pendientes') = 3, 'pendientes: alta, +1 mes, +2 meses (' || (c->'pendientes')::text || ')';
  assert (c->>'debe')::numeric = 87, 'debe 3 × 29';
  assert not (c->>'al_dia')::boolean and (c->>'dias_retraso')::int = 75, 'retraso desde el primer mes sin pagar';
  assert (c->>'proximo')::date = (alta + interval '3 months')::date, 'próximo cobro';
  assert (select (x->>'alta')::date from jsonb_array_elements(v->'clientes') x where x->>'slug' = 'bar-cuotas') = alta, 'fecha de alta';

  -- pagar: el más antiguo primero
  v := public.carta_cuotas('plataforma-test', 'pagar', '{"slug":"bar-cuotas","forma":"bizum"}');
  c := (select x->'cuota' from jsonb_array_elements(v->'clientes') x where x->>'slug' = 'bar-cuotas');
  assert jsonb_array_length(c->'pendientes') = 2 and (c->'ultimo_pago'->>'periodo')::date = alta, 'paga el mes más antiguo';
  assert c->'ultimo_pago'->>'forma' = 'bizum', 'forma de pago';
  perform public.carta_cuotas('plataforma-test', 'pagar', '{"slug":"bar-cuotas"}');
  v := public.carta_cuotas('plataforma-test', 'pagar', '{"slug":"bar-cuotas"}');
  c := (select x->'cuota' from jsonb_array_elements(v->'clientes') x where x->>'slug' = 'bar-cuotas');
  assert (c->>'al_dia')::boolean and (c->>'debe')::numeric = 0, 'al día';
  begin perform public.carta_cuotas('plataforma-test', 'pagar', '{"slug":"bar-cuotas"}'); ok := false;
  exception when others then ok := sqlerrm = 'nada_pendiente'; end;
  assert ok, 'no se paga dos veces';

  -- deshacer el último
  v := public.carta_cuotas('plataforma-test', 'deshacer', '{"slug":"bar-cuotas"}');
  c := (select x->'cuota' from jsonb_array_elements(v->'clientes') x where x->>'slug' = 'bar-cuotas');
  assert jsonb_array_length(c->'pendientes') = 1, 'deshacer el último pago';

  -- fijar: importe, inicio, notas
  v := public.carta_cuotas('plataforma-test', 'fijar', jsonb_build_object('slug', 'bar-nuevo', 'importe', '35,50', 'inicio', (hoy + 10)::text, 'notas', 'Paga por Bizum'));
  c := (select x->'cuota' from jsonb_array_elements(v->'clientes') x where x->>'slug' = 'bar-nuevo');
  assert (c->>'importe')::numeric = 35.5 and c->>'notas' = 'Paga por Bizum', 'fijar importe y notas';
  assert (c->>'al_dia')::boolean and (c->>'proximo')::date = hoy + 10, 'aún no ha empezado a pagar';
  v := public.carta_cuotas('plataforma-test', 'fijar', '{"slug":"bar-nuevo","notas":"otra"}');
  c := (select x->'cuota' from jsonb_array_elements(v->'clientes') x where x->>'slug' = 'bar-nuevo');
  assert (c->>'importe')::numeric = 35.5 and (c->>'proximo')::date = hoy + 10, 'fijar solo notas no cambia lo demás';
  begin perform public.carta_cuotas('plataforma-test', 'fijar', '{"slug":"bar-nuevo","importe":"abc"}'); ok := false;
  exception when others then ok := sqlerrm = 'importe_no_valido'; end;
  assert ok, 'importe no válido';

  -- sin cuota
  v := public.carta_cuotas('plataforma-test', 'fijar', '{"slug":"bar-gratis","sin_cuota":true}');
  c := (select x->'cuota' from jsonb_array_elements(v->'clientes') x where x->>'slug' = 'bar-gratis');
  assert (c->>'al_dia')::boolean and c->>'proximo' is null, 'sin cuota: nunca debe';

  -- anon no lee las tablas
  begin perform count(*) from carta.cuota_pagos; ok := false; exception when insufficient_privilege then ok := true; end;
  assert ok, 'anon no lee carta.cuota_pagos';
  begin perform count(*) from carta.cuotas; ok := false; exception when insufficient_privilege then ok := true; end;
  assert ok, 'anon no lee carta.cuotas';
  -- desactivar por impago sigue siendo carta_plataforma
  perform public.carta_plataforma('plataforma-test', 'activo', '{"slug":"bar-cuotas","activo":false}');
  v := public.carta_cuotas('plataforma-test');
  assert not (select (x->>'activo')::boolean from jsonb_array_elements(v->'clientes') x where x->>'slug' = 'bar-cuotas'), 'desactivado';
  raise notice 'TODAS LAS PRUEBAS DE CUOTAS OK';
end $$;
reset role;
