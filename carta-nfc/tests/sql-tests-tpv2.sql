-- Pruebas del TPV, segunda parte (007_tpv2.sql): corregir pedidos, "Varios", descuentos, factura de un ticket (F3)
-- y caja (apertura, movimientos, arqueo y cierre). Requiere 001-007 aplicados (bash db-local.sh).
\set ON_ERROR_STOP 1

select carta._alta('Bar Caja', 'bar-caja', 4, 'admin-c', 'cocina-c');

do $$
declare
  v jsonb; doc jsonb; d2 jsonb; f3 jsonb; r jsonb; caja jsonb; cierre jsonb; ok boolean;
  ct uuid; cb uuid; cro uuid; cana uuid; m1 uuid; m2 uuid; m3 uuid; m4 uuid;
  p jsonb; ids jsonb; lin_cro bigint; lin_cana bigint; anio text := to_char(now() at time zone 'Europe/Madrid', 'YYYY');
  st int;
begin
  v := public.carta_admin('bar-caja', 'admin-c', 'categoria', '{"nombre":"Tapas"}');   ct := (v->>'id')::uuid;
  v := public.carta_admin('bar-caja', 'admin-c', 'categoria', '{"nombre":"Bebidas"}'); cb := (v->>'id')::uuid;
  v := public.carta_admin('bar-caja', 'admin-c', 'producto', jsonb_build_object('nombre', 'Croquetas', 'precio', '3', 'categoria_id', ct)); cro := (v->>'id')::uuid;
  v := public.carta_admin('bar-caja', 'admin-c', 'producto', jsonb_build_object('nombre', 'Caña', 'precio', '2', 'categoria_id', cb));      cana := (v->>'id')::uuid;
  perform public.fiscal_admin('bar-caja', 'admin-c', 'titular', '{"nif":"00000000T","razon_social":"DEMO","domicilio":"Calle 1","tipo_persona":"juridica"}');
  v := public.carta_tpv('bar-caja', 'cocina-c', 'stock', jsonb_build_object('id', cro, 'stock', '10'));
  v := public.carta_tpv('bar-caja', 'cocina-c', 'datos', '{}');
  m1 := (v->'mesas'->0->>'id')::uuid; m2 := (v->'mesas'->1->>'id')::uuid; m3 := (v->'mesas'->2->>'id')::uuid; m4 := (v->'mesas'->3->>'id')::uuid;

  -- 1. Caja: abrir con 100 de fondo; no se abre dos veces; entrada y salida
  caja := public.fiscal_caja('bar-caja', 'cocina-c', 'estado', '{}');
  assert caja->'turno' = 'null'::jsonb or caja->>'turno' is null, 'sin caja abierta';
  begin perform public.fiscal_caja('bar-caja', 'cocina-c', 'movimiento', '{"tipo":"salida","importe":"5","concepto":"x"}'); ok := false;
  exception when others then ok := sqlerrm = 'caja_cerrada'; end;
  assert ok, 'sin caja no hay movimientos';
  caja := public.fiscal_caja('bar-caja', 'cocina-c', 'abrir', '{"fondo":"100"}');
  assert (caja->'turno'->>'fondo')::numeric = 100 and (caja->'turno'->'resumen'->>'esperado')::numeric = 100, 'caja abierta con 100';
  begin perform public.fiscal_caja('bar-caja', 'cocina-c', 'abrir', '{"fondo":"50"}'); ok := false;
  exception when others then ok := sqlerrm = 'caja_abierta'; end;
  assert ok, 'no se abre dos veces';
  begin perform public.fiscal_caja('bar-caja', 'cocina-c', 'abrir', '{"fondo":"-1"}'); ok := false;
  exception when others then ok := sqlerrm in ('importe_no_valido', 'caja_abierta'); end;
  assert ok, 'fondo no válido';
  caja := public.fiscal_caja('bar-caja', 'cocina-c', 'movimiento', '{"tipo":"salida","importe":"12.50","concepto":"Hielo"}');
  caja := public.fiscal_caja('bar-caja', 'cocina-c', 'movimiento', '{"tipo":"entrada","importe":"20","concepto":"Cambio del banco"}');
  assert (caja->'turno'->'resumen'->>'esperado')::numeric = 107.50 and jsonb_array_length(caja->'turno'->'movimientos') = 2, 'esperado 100 - 12,50 + 20';
  begin perform public.fiscal_caja('bar-caja', 'cocina-c', 'movimiento', '{"tipo":"salida","importe":"5","concepto":""}'); ok := false;
  exception when others then ok := sqlerrm = 'concepto_no_valido'; end;
  assert ok, 'movimiento sin concepto';

  -- 2. Comandero con "Varios" (IVA propio) y corrección de líneas
  v := public.carta_tpv('bar-caja', 'cocina-c', 'comandar', jsonb_build_object('mesa_id', m1, 'lineas', jsonb_build_array(
         jsonb_build_object('producto_id', cro, 'cantidad', 3),
         jsonb_build_object('producto_id', cana, 'cantidad', 4),
         jsonb_build_object('nombre', 'Tabaco', 'precio', '5.50', 'cantidad', 1, 'iva', '21'),
         jsonb_build_object('nombre', 'Pan extra', 'precio', '1', 'cantidad', 2))));
  p := v->'pedido';
  assert (p->>'total')::numeric = 24.50 and jsonb_array_length(p->'lineas') = 4, 'pedido de 24,50 con 2 "Varios"';
  assert p->'lineas'->0 ? 'id' and (p->'lineas'->0->>'categoria_id')::uuid = ct and p->'lineas'->2->>'categoria_id' is null, 'líneas con id y categoría';
  assert (select stock from carta.productos where id = cro) = 7, 'stock 10 - 3';
  lin_cro := (p->'lineas'->0->>'id')::bigint; lin_cana := (p->'lineas'->1->>'id')::bigint;
  foreach v in array array['{"nombre":"","precio":"1","cantidad":1}', '{"nombre":"X","precio":"0","cantidad":1}',
                           '{"nombre":"X","precio":"1","cantidad":1,"iva":"7"}']::jsonb[] loop
    begin perform public.carta_tpv('bar-caja', 'cocina-c', 'comandar', jsonb_build_object('mesa_id', m1, 'lineas', jsonb_build_array(v))); ok := false;
    exception when others then ok := sqlerrm = 'varios_no_valido'; end;
    assert ok, 'varios no válido: ' || v::text;
  end loop;
  begin perform public.carta_tpv('bar-caja', 'cocina-c', 'comandar', jsonb_build_object('mesa_id', m1, 'lineas',
          jsonb_build_array(jsonb_build_object('producto_id', cana, 'cantidad', 25)))); ok := false;
  exception when others then ok := sqlerrm = 'cantidad_no_valida'; end;
  assert ok, 'cantidad máxima 20';

  -- menos: 3 → 2 croquetas (vuelve 1 al stock); invitar 4 cañas; no se invita dos veces
  v := public.carta_tpv('bar-caja', 'cocina-c', 'linea', jsonb_build_object('id', lin_cro, 'accion', 'menos'));
  assert (v->'pedido'->>'total')::numeric = 21.50 and (select stock from carta.productos where id = cro) = 8, 'menos: 21,50 y stock 8';
  v := public.carta_tpv('bar-caja', 'cocina-c', 'linea', jsonb_build_object('id', lin_cana, 'accion', 'invitar'));
  assert (v->'pedido'->>'total')::numeric = 13.50 and (select nombre from carta.pedido_lineas where id = lin_cana) = 'Caña (invitación)', 'invitación: 13,50';
  begin perform public.carta_tpv('bar-caja', 'cocina-c', 'linea', jsonb_build_object('id', lin_cana, 'accion', 'invitar')); ok := false;
  exception when others then ok := sqlerrm = 'ya_invitado'; end;
  assert ok, 'ya invitado';
  assert exists (select 1 from carta.pedido_eventos where estado = 'editado:invitar'), 'queda registro de la corrección';
  begin perform public.carta_tpv('bar-caja', 'cocina-c', 'linea', jsonb_build_object('id', lin_cro, 'accion', 'borrar')); ok := false;
  exception when others then ok := sqlerrm = 'accion_no_valida'; end;
  assert ok, 'acción de línea no válida';
  begin perform public.carta_tpv('bar-caja', 'cocina-c', 'linea', jsonb_build_object('id', 999999, 'accion', 'menos')); ok := false;
  exception when others then ok := sqlerrm = 'pedido_no_encontrado'; end;
  assert ok, 'línea inexistente';

  -- 3. Cobro con 10 % de descuento: 2 croquetas (6, 10 %) + caña invitada (0) + tabaco (5,50, 21 %) + 2 panes (2, 10 %) = 13,50
  ids := jsonb_build_array(p->>'id');
  v := public.fiscal_pendiente('bar-caja', 'cocina-c', ids);
  assert (v->>'pendiente')::numeric = 13.50, 'pendiente 13,50';
  begin perform public.fiscal_cobrar('bar-caja', 'cocina-c', jsonb_build_object('pedido_ids', ids, 'descuento', '{"tipo":"pct","valor":"150"}'::jsonb,
          'pagos', '[{"forma":"efectivo","importe":"1"}]'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'descuento_no_valido'; end;
  assert ok, 'descuento > 100 %';
  begin perform public.fiscal_cobrar('bar-caja', 'cocina-c', jsonb_build_object('pedido_ids', ids, 'descuento', '{"tipo":"importe","valor":"13.50"}'::jsonb,
          'pagos', '[{"forma":"efectivo","importe":"1"}]'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'descuento_no_valido'; end;
  assert ok, 'descuento por todo el importe';
  -- 10 % de 13,50 = 1,35 → 12,15; por IVA: 10 % sobre 8,00 → 0,80; 21 % sobre 5,50 → 0,55
  doc := public.fiscal_cobrar('bar-caja', 'cocina-c', jsonb_build_object('pedido_ids', ids, 'descuento', '{"tipo":"pct","valor":"10"}'::jsonb,
          'pagos', '[{"forma":"efectivo","importe":"12.15","entregado":"20"}]'::jsonb));
  assert (doc->>'total')::numeric = 12.15 and doc->>'tipo' = 'F2', 'ticket con descuento: 12,15';
  assert (select count(*) from jsonb_array_elements(doc->'lineas') l where (l->>'precio')::numeric < 0) = 2
     and (select sum((l->>'importe')::numeric) from jsonb_array_elements(doc->'lineas') l where l->>'nombre' like 'Descuento%') = -1.35
     and (select (l->>'importe')::numeric from jsonb_array_elements(doc->'lineas') l where l->>'nombre' like 'Descuento%' and (l->>'iva')::numeric = 21) = -0.55,
         'descuento en 2 líneas negativas (10 % y 21 %)';
  assert (select sum((x->>'total')::numeric) from jsonb_array_elements(doc->'desglose') x) = 12.15
     and (select (x->>'total')::numeric from jsonb_array_elements(doc->'desglose') x where (x->>'iva')::numeric = 21) = 4.95, 'desglose: 21 % = 4,95';
  assert exists (select 1 from jsonb_array_elements(doc->'lineas') l where l->>'nombre' = 'Tabaco' and (l->>'iva')::numeric = 21)
     and exists (select 1 from jsonb_array_elements(doc->'lineas') l where l->>'nombre' = 'Pan extra' and (l->>'iva')::numeric = 10), 'IVA de "Varios"';
  begin perform public.fiscal_rectificar('bar-caja', 'cocina-c', jsonb_build_object('token', doc->>'token',
          'lineas', jsonb_build_array(jsonb_build_object('k', doc->'lineas'->0->>'k', 'cantidad', 1)))); ok := false;
  exception when others then ok := sqlerrm = 'descuento_solo_total'; end;
  assert ok, 'con descuento no se devuelve una parte';

  -- 4. Factura de un ticket ya cobrado (F3 sustituye al F2)
  v := public.carta_tpv('bar-caja', 'cocina-c', 'comandar', jsonb_build_object('mesa_id', m2, 'lineas', jsonb_build_array(
         jsonb_build_object('producto_id', cana, 'cantidad', 5))));
  d2 := public.fiscal_cobrar('bar-caja', 'cocina-c', jsonb_build_object('pedido_ids', jsonb_build_array(v->'pedido'->>'id'),
          'propina', '1', 'pagos', '[{"forma":"tarjeta","importe":"11"}]'::jsonb));
  begin perform public.fiscal_facturar('bar-caja', 'cocina-c', jsonb_build_object('token', d2->>'token',
          'cliente', '{"nif":"12345678A","nombre":"ACME SL","domicilio":"Calle 2"}'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'nif_cliente_no_valido'; end;
  assert ok, 'NIF no válido';
  begin perform public.fiscal_facturar('bar-caja', 'cocina-c', jsonb_build_object('token', d2->>'token',
          'cliente', '{"nif":"00000000T","nombre":"","domicilio":"Calle 2"}'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'cliente_incompleto'; end;
  assert ok, 'cliente incompleto';
end $$;

do $$
declare
  v jsonb; d2 jsonb; f3 jsonb; r jsonb; caja jsonb; cierre jsonb; ok boolean; inf jsonb;
  anio text := to_char(now() at time zone 'Europe/Madrid', 'YYYY');
begin
  select fiscal._documento_json(dc) into d2 from fiscal.documentos dc
   where dc.restaurante_id = (select id from carta.restaurantes where slug = 'bar-caja') and dc.mesa_nombre = 'Mesa 2';
  f3 := public.fiscal_facturar('bar-caja', 'cocina-c', jsonb_build_object('token', d2->>'token',
          'cliente', '{"nif":"00000000T","nombre":"ACME SL","domicilio":"Calle 2, Madrid"}'::jsonb));
  assert f3->>'tipo' = 'F3' and f3->>'num_serie' = 'F' || anio || '-000001' and (f3->>'total')::numeric = 10 and (f3->>'propina')::numeric = 1
     and f3->'cliente'->>'nif' = '00000000T' and f3->'sustituye'->0->>'num_serie' = d2->>'num_serie', 'F3 F…-000001 de 10,00 que sustituye al ticket';
  assert (select estado from fiscal.documentos where token = d2->>'token') = 'sustituido', 'el ticket queda sustituido';
  assert (fiscal._documento_json((select dc from fiscal.documentos dc where token = d2->>'token'))->'sustituido_por'->>'num_serie') = f3->>'num_serie',
         'el ticket dice qué factura lo sustituye';
  assert (select contenido->'FacturasSustituidas'->0->>'NumSerieFactura' from fiscal.registros_sif rs join fiscal.documentos dc on dc.id = rs.documento_id
           where dc.token = f3->>'token') = d2->>'num_serie'
     and (select contenido->>'TipoFactura' from fiscal.registros_sif rs join fiscal.documentos dc on dc.id = rs.documento_id where dc.token = f3->>'token') = 'F3',
         'registro SIF F3 con FacturasSustituidas';
  assert not exists (select 1 from fiscal.cobros c join fiscal.documentos dc on dc.id = c.documento_id where dc.token = f3->>'token'), 'la F3 no mueve caja';
  begin perform public.fiscal_facturar('bar-caja', 'cocina-c', jsonb_build_object('token', d2->>'token',
          'cliente', '{"nif":"00000000T","nombre":"ACME SL","domicilio":"Calle 2"}'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'no_facturable'; end;
  assert ok, 'un ticket sustituido no se factura otra vez';
  begin perform public.fiscal_facturar('bar-caja', 'cocina-c', jsonb_build_object('token', f3->>'token',
          'cliente', '{"nif":"00000000T","nombre":"ACME SL","domicilio":"Calle 2"}'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'no_facturable'; end;
  assert ok, 'una factura no se factura';
  begin perform public.fiscal_rectificar('bar-caja', 'cocina-c', jsonb_build_object('token', d2->>'token')); ok := false;
  exception when others then ok := sqlerrm = 'no_rectificable'; end;
  assert ok, 'el ticket sustituido no se rectifica (se rectifica la factura)';
  r := public.fiscal_rectificar('bar-caja', 'cocina-c', jsonb_build_object('token', f3->>'token',
         'lineas', jsonb_build_array(jsonb_build_object('k', f3->'lineas'->0->>'k', 'cantidad', 1)), 'forma', 'efectivo'));
  assert r->>'tipo' = 'R1' and (r->>'total')::numeric = -2, 'devolución de la F3: R1 de -2,00';

  -- 5. Mesa toda invitada: se cierra sin ticket
  v := public.carta_tpv('bar-caja', 'cocina-c', 'comandar', jsonb_build_object('mesa_id', (select id from carta.mesas where nombre = 'Mesa 3'
         and restaurante_id = (select id from carta.restaurantes where slug = 'bar-caja')), 'lineas', jsonb_build_array(
         jsonb_build_object('producto_id', (select id from carta.productos where nombre = 'Caña'
                                             and restaurante_id = (select id from carta.restaurantes where slug = 'bar-caja')), 'cantidad', 2))));
  perform public.carta_tpv('bar-caja', 'cocina-c', 'linea', jsonb_build_object('id', v->'pedido'->'lineas'->0->>'id', 'accion', 'invitar'));
  r := public.fiscal_cobrar('bar-caja', 'cocina-c', jsonb_build_object('pedido_ids', jsonb_build_array(v->'pedido'->>'id'),
         'pagos', '[{"forma":"efectivo","importe":"1"}]'::jsonb));
  assert (r->>'sin_ticket')::boolean and (select cerrado from carta.pedidos where id = (v->'pedido'->>'id')::uuid), 'mesa invitada cerrada sin ticket';

  -- quitar la única línea cancela el pedido
  v := public.carta_tpv('bar-caja', 'cocina-c', 'comandar', jsonb_build_object('mesa_id', (select id from carta.mesas where nombre = 'Mesa 4'
         and restaurante_id = (select id from carta.restaurantes where slug = 'bar-caja')), 'lineas', jsonb_build_array(
         jsonb_build_object('producto_id', (select id from carta.productos where nombre = 'Croquetas'
                                             and restaurante_id = (select id from carta.restaurantes where slug = 'bar-caja')), 'cantidad', 2))));
  assert (select stock from carta.productos where nombre = 'Croquetas' and restaurante_id = (select id from carta.restaurantes where slug = 'bar-caja')) = 6, 'stock 8 - 2';
  r := public.carta_tpv('bar-caja', 'cocina-c', 'linea', jsonb_build_object('id', v->'pedido'->'lineas'->0->>'id', 'accion', 'quitar'));
  assert r->'pedido'->>'estado' = 'cancelado' and (r->'pedido'->>'total')::numeric = 0
     and (select stock from carta.productos where nombre = 'Croquetas' and restaurante_id = (select id from carta.restaurantes where slug = 'bar-caja')) = 8,
         'sin líneas el pedido se cancela y el stock vuelve una sola vez';

  -- 6. Totales: la F3 no duplica la venta del ticket
  inf := public.carta_informe('bar-caja', 'cocina-c', '{}');
  -- 12,15 (descuento) + 10 (ticket sustituido) - 2 (R1) = 20,15
  assert (inf->'cobros'->>'facturado')::numeric = 20.15 and (inf->'cobros'->>'facturas')::int = 1 and (inf->'cobros'->>'tickets')::int = 2,
         'informe: 20,15, 2 tickets y 1 factura';
  v := public.fiscal_documentos('bar-caja', 'cocina-c', '{}');
  assert (v->'resumen'->>'total')::numeric = 20.15 and (v->>'cuantos')::int = 4, 'lista: 4 documentos, neto 20,15';
  v := public.fiscal_documentos('bar-caja', 'cocina-c', '{"tipo":"factura"}');
  assert (v->>'cuantos')::int = 2 and (v->'resumen'->>'total')::numeric = 8, 'facturas: F3 y su R1 (10 - 2 = 8)';

  -- 7. Cierre de caja: 107,50 + 12,15 (efectivo) - 2 (devolución en efectivo) = 117,65; contamos 117 → descuadre -0,65
  caja := public.fiscal_caja('bar-caja', 'cocina-c', 'estado', '{}');
  assert (caja->'turno'->'resumen'->>'esperado')::numeric = 117.65 and (caja->'turno'->'resumen'->'por_forma'->>'tarjeta')::numeric = 11
     and (caja->'turno'->'resumen'->>'propinas')::numeric = 1, 'esperado 117,65; tarjeta 11 (con propina)';
  begin perform public.fiscal_caja('bar-caja', 'cocina-c', 'cerrar', '{"contado":"abc"}'); ok := false;
  exception when others then ok := sqlerrm = 'importe_no_valido'; end;
  assert ok, 'contado no válido';
  caja := public.fiscal_caja('bar-caja', 'cocina-c', 'cerrar', '{"contado":"117","billetes":{"50":2,"10":1,"5":1,"1":2,"0.5":0},"nota":"Faltan 65 céntimos"}');
  cierre := caja->'cerrado';
  assert caja->>'turno' is null and (cierre->>'descuadre')::numeric = -0.65 and (cierre->>'esperado')::numeric = 117.65
     and cierre->'billetes' = '{"50":2,"10":1,"5":1,"1":2}'::jsonb and (caja->'ultimo'->>'descuadre')::numeric = -0.65, 'cierre con descuadre -0,65';
  begin update fiscal.caja_turnos set contado = 117.65 where id = (cierre->>'id')::uuid; ok := false;
  exception when others then ok := sqlerrm = 'documento_inmutable'; end;
  assert ok, 'un cierre no se puede cambiar';
  begin delete from fiscal.caja_movimientos; ok := false;
  exception when others then ok := sqlerrm = 'documento_inmutable'; end;
  assert ok, 'los movimientos no se borran';
  begin perform public.fiscal_caja('bar-caja', 'cocina-c', 'cerrar', '{"contado":"1"}'); ok := false;
  exception when others then ok := sqlerrm = 'caja_cerrada'; end;
  assert ok, 'no se cierra dos veces';
  caja := public.fiscal_caja('bar-caja', 'cocina-c', 'historial', '{}');
  assert jsonb_array_length(caja->'historial') = 1 and (caja->'historial'->0->>'ventas')::numeric = 20.15, 'historial de cierres';
  caja := public.fiscal_caja('bar-caja', 'cocina-c', 'ver', jsonb_build_object('id', cierre->>'id'));
  assert jsonb_array_length(caja->'turno_visto'->'movimientos') = 2 and (caja->'turno_visto'->>'contado')::numeric = 117, 'reimprimir un cierre';
  caja := public.fiscal_caja('bar-caja', 'cocina-c', 'abrir', '{"fondo":"117"}');
  assert (caja->'turno'->'resumen'->>'ventas')::numeric = 0 and (caja->'turno'->'resumen'->>'esperado')::numeric = 117, 'turno nuevo desde cero';
  begin perform public.fiscal_caja('otro', 'cocina-c', 'estado', '{}'); ok := false;
  exception when others then ok := true; end;
  assert ok, 'caja exige restaurante y clave';
  raise notice 'TPV2 OK';
end $$;

-- 8. Cadena de huellas con descuentos, F3 y rectificativa
do $$
declare
  r record; prev text := null; n int := 0;
begin
  for r in select rs.* from fiscal.registros_sif rs order by id loop
    n := n + 1;
    assert r.huella_anterior is not distinct from prev, 'encadenamiento registro ' || n;
    assert r.huella = fiscal._huella_alta(r.nif_emisor, r.num_serie, fiscal._fecha(r.fecha_expedicion), r.tipo_factura,
                                          fiscal._importe(r.cuota_total), fiscal._importe(r.importe_total),
                                          r.huella_anterior, r.fecha_hora_huso), 'huella recalculable ' || n;
    prev := r.huella;
  end loop;
  assert n = 4, '4 registros (F2 con descuento, F2, F3, R1)';
  raise notice 'cadena TPV2 OK';
end $$;

set role anon;
do $$
begin
  perform public.fiscal_caja('bar-caja', 'cocina-c', 'estado', '{}');
  begin
    perform 1 from fiscal.caja_turnos;
    raise exception 'anon no debería leer la caja';
  exception when insufficient_privilege then null;
  end;
  raise notice 'TODAS LAS PRUEBAS TPV2 OK';
end $$;
