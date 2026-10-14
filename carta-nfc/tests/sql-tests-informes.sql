-- Pruebas de los informes de ventas (005_informes.sql). Requiere 001 y 003 aplicados (bash db-local.sh).
\set ON_ERROR_STOP 1

select carta._alta('Bar Informes', 'bar-inf', 6, 'admin-i', 'cocina-i');
select carta._alta('Otro Bar', 'otro-bar', 1, 'admin-o', 'cocina-o');

do $$
declare
  v jsonb; inf jsonb; cat_t uuid; cat_b uuid; p_cro uuid; p_cana uuid; p_flan uuid; m text[];
  t1 text; t3 text; t4 text; av text; id1 uuid; id3 uuid; id_av uuid; hoy text; ok boolean; n int;
  lin2 jsonb := '[]';
begin
  -- Carta: Tapas (croquetas 3,00 · flan 4,00) y Bebidas (caña 2,00)
  v := public.carta_admin('bar-inf', 'admin-i', 'categoria', '{"nombre":"Tapas"}');   cat_t := (v->>'id')::uuid;
  v := public.carta_admin('bar-inf', 'admin-i', 'categoria', '{"nombre":"Bebidas"}'); cat_b := (v->>'id')::uuid;
  v := public.carta_admin('bar-inf', 'admin-i', 'producto', jsonb_build_object('nombre', 'Croquetas', 'precio', '3', 'categoria_id', cat_t)); p_cro := (v->>'id')::uuid;
  v := public.carta_admin('bar-inf', 'admin-i', 'producto', jsonb_build_object('nombre', 'Flan', 'precio', '4', 'categoria_id', cat_t));      p_flan := (v->>'id')::uuid;
  v := public.carta_admin('bar-inf', 'admin-i', 'producto', jsonb_build_object('nombre', 'Caña', 'precio', '2', 'categoria_id', cat_b));      p_cana := (v->>'id')::uuid;
  m := array(select x->>'codigo' from jsonb_array_elements(v->'mesas') x order by x->>'nombre');

  -- Hoy: Mesa 1 (2 croquetas + 2 cañas = 10), Mesa 2 (1 croqueta = 3), Mesa 3 (3 cañas = 6, se cancela)
  t1 := public.carta_pedir(m[1], jsonb_build_array(jsonb_build_object('producto_id', p_cro, 'cantidad', 2),
                                                   jsonb_build_object('producto_id', p_cana, 'cantidad', 2)))->>'token';
  perform public.carta_pedir(m[2], jsonb_build_array(jsonb_build_object('producto_id', p_cro, 'cantidad', 1)));
  t3 := public.carta_pedir(m[3], jsonb_build_array(jsonb_build_object('producto_id', p_cana, 'cantidad', 3)))->>'token';
  perform public.carta_avisar(m[1], 'camarero');
  -- Ayer: Mesa 4 (2 croquetas = 6)
  t4 := public.carta_pedir(m[4], jsonb_build_array(jsonb_build_object('producto_id', p_cro, 'cantidad', 2)))->>'token';
  update carta.pedidos set creado = creado - interval '1 day' where token = t4;

  select id into id1 from carta.pedidos where token = t1;
  select id into id3 from carta.pedidos where token = t3;
  select id into id_av from carta.pedidos where restaurante_id = (select id from carta.restaurantes where slug = 'bar-inf') and tipo = 'camarero';

  -- Cocina: Mesa 1 lista y servida; Mesa 3 cancelada; aviso atendido
  perform public.carta_cocina('bar-inf', 'cocina-i', 'estado', jsonb_build_object('id', id1, 'estado', 'preparando'));
  perform public.carta_cocina('bar-inf', 'cocina-i', 'estado', jsonb_build_object('id', id1, 'estado', 'listo'));
  perform public.carta_cocina('bar-inf', 'cocina-i', 'estado', jsonb_build_object('id', id1, 'estado', 'servido'));
  perform public.carta_cocina('bar-inf', 'cocina-i', 'estado', jsonb_build_object('id', id3, 'estado', 'cancelado'));
  perform public.carta_cocina('bar-inf', 'cocina-i', 'estado', jsonb_build_object('id', id_av, 'estado', 'servido'));
  select count(*) into n from carta.pedido_eventos where pedido_id = id1;
  assert n = 3, 'trigger: preparando, listo y servido registrados (' || n || ')';
  perform public.carta_cocina('bar-inf', 'cocina-i', 'cerrar', jsonb_build_object('ids', jsonb_build_array(id1)));
  assert exists (select 1 from carta.pedido_eventos where pedido_id = id1 and estado = 'cerrado'), 'trigger: mesa cobrada';
  -- Tiempos conocidos: listo a los 15 min, servido a los 18, aviso atendido a los 2
  update carta.pedido_eventos e set en = p.creado + interval '15 minutes' from carta.pedidos p where p.id = e.pedido_id and e.pedido_id = id1 and e.estado = 'listo';
  update carta.pedido_eventos e set en = p.creado + interval '18 minutes' from carta.pedidos p where p.id = e.pedido_id and e.pedido_id = id1 and e.estado = 'servido';
  update carta.pedido_eventos e set en = p.creado + interval '2 minutes'  from carta.pedidos p where p.id = e.pedido_id and e.pedido_id = id_av and e.estado = 'servido';

  hoy := (select (creado at time zone 'Europe/Madrid')::date::text from carta.pedidos where id = id1);
  inf := public.carta_informe('bar-inf', 'cocina-i', jsonb_build_object('desde', hoy, 'hasta', hoy));
  assert (inf->'kpis'->>'ventas')::numeric = 13, 'ventas 13 (sin el cancelado): ' || (inf->'kpis'->>'ventas');
  assert (inf->'kpis'->>'pedidos')::int = 2 and (inf->'kpis'->>'unidades')::int = 5 and (inf->'kpis'->>'mesas')::int = 2, 'pedidos 2 · unidades 5 · mesas 2';
  assert (inf->'kpis'->>'cancelados')::int = 1 and (inf->'kpis'->>'cancelado_importe')::numeric = 6, 'cancelados: 1 de 6,00';
  assert (inf->'kpis'->>'avisos_camarero')::int = 1 and (inf->'kpis'->>'avisos_cuenta')::int = 0, 'avisos';
  assert (inf->'kpis'->>'min_preparacion')::numeric = 15 and (inf->'kpis'->>'min_servicio')::numeric = 18, 'tiempos de cocina y servicio';
  assert (inf->'kpis'->>'min_respuesta')::numeric = 2, 'tiempo de respuesta al camarero';
  assert (inf->'anterior'->>'ventas')::numeric = 6 and (inf->'anterior'->>'pedidos')::int = 1 and (inf->'anterior'->>'unidades')::int = 2, 'periodo anterior (ayer)';
  assert inf->'productos'->0->>'nombre' = 'Croquetas' and (inf->'productos'->0->>'unidades')::int = 3 and (inf->'productos'->0->>'importe')::numeric = 9,
         'lo más vendido: croquetas 3 uds · 9,00';
  assert inf->'productos'->1->>'nombre' = 'Caña' and inf->'productos'->1->>'categoria' = 'Bebidas' and jsonb_array_length(inf->'productos') = 2, 'caña 2 uds';
  assert inf->'categorias'->0->>'nombre' = 'Tapas' and (inf->'categorias'->0->>'importe')::numeric = 9, 'categorías';
  assert jsonb_array_length(inf->'sin_ventas') = 1 and inf->'sin_ventas'->0->>'nombre' = 'Flan', 'sin ventas: el flan';
  assert inf->'mesas'->0->>'nombre' = 'Mesa 1' and (inf->'mesas'->0->>'ventas')::numeric = 10, 'ranking de mesas';
  assert (select sum((x->>'ventas')::numeric) from jsonb_array_elements(inf->'por_hora') x) = 13, 'por hora suma 13';
  assert jsonb_array_length(inf->'por_dia') = 1 and (inf->'por_dia'->0->>'ventas')::numeric = 13, 'por día';
  assert (select sum((x->>'pedidos')::int) from jsonb_array_elements(inf->'por_dia_semana') x) = 2, 'por día de la semana';
  assert not (inf ? 'cobros'), 'sin facturación no hay bloque de cobros';

  -- Dos días: ayer + hoy
  inf := public.carta_informe('bar-inf', 'admin-i', jsonb_build_object('desde', (hoy::date - 1)::text, 'hasta', hoy));
  assert (inf->'kpis'->>'ventas')::numeric = 19 and jsonb_array_length(inf->'por_dia') = 2 and (inf->'periodo'->>'dias')::int = 2, 'dos días: 19 (clave admin vale)';
  assert (inf->'periodo'->>'anterior_hasta') = (hoy::date - 2)::text, 'periodo anterior de la misma duración';

  -- Con facturación: bloque de cobros
  perform public.fiscal_admin('bar-inf', 'admin-i', 'titular', '{"nif":"00000000T","razon_social":"DEMO","domicilio":"Calle 1","tipo_persona":"juridica"}');
  perform public.fiscal_cobrar('bar-inf', 'cocina-i', jsonb_build_object(
    'pedido_ids', (select jsonb_agg(id) from carta.pedidos where mesa_nombre = 'Mesa 2' and restaurante_id = (select id from carta.restaurantes where slug = 'bar-inf')),
    'pagos', '[{"forma":"efectivo","importe":"3.50","entregado":"5"}]'::jsonb, 'propina', '0.50'));
  inf := public.carta_informe('bar-inf', 'cocina-i', '{}');
  assert (inf->'cobros'->>'tickets')::int = 1 and (inf->'cobros'->>'facturado')::numeric = 3 and (inf->'cobros'->>'propinas')::numeric = 0.5, 'cobros: 1 ticket de 3,00 + 0,50 de propina';
  assert (inf->'cobros'->'por_forma'->>'efectivo')::numeric = 3.5 and (inf->'cobros'->'iva'->0->>'iva')::numeric = 10, 'cobros por forma de pago e IVA';
  assert inf->'cobros'->>'primero' = inf->'cobros'->>'ultimo', 'primer y último ticket del día';

  -- Validaciones y aislamiento
  begin perform public.carta_informe('bar-inf', 'cocina-i', '{"desde":"2026-02-30"}'); ok := false;
  exception when others then ok := sqlerrm = 'filtro_no_valido'; end;
  assert ok, 'fecha imposible';
  begin perform public.carta_informe('bar-inf', 'cocina-i', '{"desde":"2026-05-02","hasta":"2026-05-01"}'); ok := false;
  exception when others then ok := sqlerrm = 'filtro_no_valido'; end;
  assert ok, 'hasta antes que desde';
  begin perform public.carta_informe('bar-inf', 'cocina-i', '{"desde":"2020-01-01","hasta":"2026-01-01"}'); ok := false;
  exception when others then ok := sqlerrm = 'filtro_no_valido'; end;
  assert ok, 'periodo de más de 2 años';
  begin perform public.carta_informe('bar-inf', 'cocina-o', '{}'); ok := false;
  exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'la clave de otro bar no abre el informe';
  inf := public.carta_informe('otro-bar', 'cocina-o', '{}');
  assert (inf->'kpis'->>'ventas')::numeric = 0 and jsonb_array_length(inf->'productos') = 0, 'otro bar no ve ventas ajenas';
  raise notice 'informes OK';
end $$;

-- Como anon (lo que llama el navegador)
set role anon;
do $$
declare ok boolean;
begin
  perform public.carta_informe('bar-inf', 'cocina-i', '{}');
  begin perform count(*) from carta.pedido_eventos; ok := false; exception when insufficient_privilege then ok := true; end;
  assert ok, 'anon no lee carta.pedido_eventos';
  raise notice 'TODAS LAS PRUEBAS DE INFORMES OK';
end $$;
reset role;
