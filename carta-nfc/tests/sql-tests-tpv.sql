-- Pruebas del modo TPV (006_tpv.sql): comandero, stock, mover mesa, cuentas separadas y rectificativas.
-- Requiere 001-006 aplicados (bash db-local.sh).
\set ON_ERROR_STOP 1

select carta._alta('Bar TPV', 'bar-tpv', 6, 'admin-t', 'cocina-t');

do $$
declare
  v jsonb; inf jsonb; doc jsonb; d1 jsonb; d2 jsonb; d3 jsonb; r1 jsonb; r2 jsonb; ok boolean;
  ct uuid; cb uuid; cro uuid; cana uuid; tarta uuid; mesas jsonb; m1 uuid; m2 uuid; m3 uuid;
  p1 jsonb; pb jsonb; ptar jsonb; ids1 jsonb; k_cro text; k_cana text; anio text := to_char(now() at time zone 'Europe/Madrid', 'YYYY');
  n int; tk text;
begin
  v := public.carta_admin('bar-tpv', 'admin-t', 'categoria', '{"nombre":"Tapas"}');   ct := (v->>'id')::uuid;
  v := public.carta_admin('bar-tpv', 'admin-t', 'categoria', '{"nombre":"Bebidas"}'); cb := (v->>'id')::uuid;
  v := public.carta_admin('bar-tpv', 'admin-t', 'producto', jsonb_build_object('nombre', 'Croquetas', 'precio', '3', 'categoria_id', ct)); cro := (v->>'id')::uuid;
  v := public.carta_admin('bar-tpv', 'admin-t', 'producto', jsonb_build_object('nombre', 'Caña', 'precio', '2', 'categoria_id', cb));      cana := (v->>'id')::uuid;
  v := public.carta_admin('bar-tpv', 'admin-t', 'producto', jsonb_build_object('nombre', 'Tarta de queso', 'precio', '5.50', 'categoria_id', ct)); tarta := (v->>'id')::uuid;
  perform public.fiscal_admin('bar-tpv', 'admin-t', 'titular', '{"nif":"00000000T","razon_social":"DEMO","domicilio":"Calle 1","tipo_persona":"juridica"}');

  -- 1. Datos del TPV
  v := public.carta_tpv('bar-tpv', 'cocina-t', 'datos', '{}');
  assert jsonb_array_length(v->'mesas') = 6 and jsonb_array_length(v->'categorias') = 2, 'datos: 6 mesas y 2 categorías';
  mesas := v->'mesas'; m1 := (mesas->0->>'id')::uuid; m2 := (mesas->1->>'id')::uuid; m3 := (mesas->2->>'id')::uuid;

  -- 2. Comandero: Mesa 1 (2 croquetas + 3 cañas = 12) y Barra (1 caña ya servida)
  v := public.carta_tpv('bar-tpv', 'cocina-t', 'comandar', jsonb_build_object('mesa_id', m1, 'lineas', jsonb_build_array(
         jsonb_build_object('producto_id', cro, 'cantidad', 2), jsonb_build_object('producto_id', cana, 'cantidad', 3, 'nota', 'bien fría'))));
  p1 := v->'pedido';
  assert (p1->>'total')::numeric = 12 and p1->>'mesa' = 'Mesa 1' and p1->>'estado' = 'nuevo' and (p1->>'numero')::int = 1, 'comandero: pedido nº1 de 12,00 a cocina';
  v := public.carta_tpv('bar-tpv', 'cocina-t', 'comandar', jsonb_build_object('lineas', jsonb_build_array(jsonb_build_object('producto_id', cana, 'cantidad', 1)), 'servido', true));
  pb := v->'pedido';
  assert pb->>'mesa' = 'Barra' and pb->>'mesa_id' is null and pb->>'estado' = 'servido' and (pb->>'total')::numeric = 2, 'venta en barra ya servida';
  begin perform public.carta_tpv('bar-tpv', 'cocina-t', 'comandar', jsonb_build_object('mesa_id', m1, 'lineas', '[]'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'pedido_vacio'; end;
  assert ok, 'comandero: pedido vacío';
  begin perform public.carta_tpv('bar-tpv', 'mala', 'datos', '{}'); ok := false;
  exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'comandero exige clave';

  -- 3. Stock: 2 tartas, alerta en 1
  v := public.carta_tpv('bar-tpv', 'cocina-t', 'stock', jsonb_build_object('id', tarta, 'stock', '2', 'alerta', '1'));
  v := public.carta_tpv('bar-tpv', 'cocina-t', 'comandar', jsonb_build_object('mesa_id', m2, 'lineas', jsonb_build_array(jsonb_build_object('producto_id', tarta, 'cantidad', 2))));
  ptar := v->'pedido';
  assert (select stock from carta.productos where id = tarta) = 0 and not (select disponible from carta.productos where id = tarta), 'stock a 0 → agotado solo';
  assert v->'stock_bajo'->0->>'nombre' = 'Tarta de queso', 'aviso de stock bajo';
  begin perform public.carta_pedir((select codigo from carta.mesas where id = m3), jsonb_build_array(jsonb_build_object('producto_id', tarta, 'cantidad', 1))); ok := false;
  exception when others then ok := sqlerrm like 'producto_agotado%'; end;
  assert ok, 'el cliente ya no puede pedir tarta';
  perform public.carta_cocina('bar-tpv', 'cocina-t', 'estado', jsonb_build_object('id', ptar->>'id', 'estado', 'cancelado'));
  assert (select stock from carta.productos where id = tarta) = 2 and (select disponible from carta.productos where id = tarta), 'cancelar devuelve el stock y la tarta vuelve';
  v := public.carta_tpv('bar-tpv', 'cocina-t', 'sumar', jsonb_build_object('id', tarta, 'n', '-1'));
  assert (select stock from carta.productos where id = tarta) = 1, 'merma: -1';
  begin perform public.carta_pedir((select codigo from carta.mesas where id = m3), jsonb_build_array(jsonb_build_object('producto_id', tarta, 'cantidad', 2))); ok := false;
  exception when others then ok := sqlerrm like 'producto_agotado%'; end;
  assert ok and (select stock from carta.productos where id = tarta) = 1
         and not exists (select 1 from carta.pedidos where mesa_id = m3), 'sin stock suficiente no se crea el pedido';
  v := public.carta_tpv('bar-tpv', 'cocina-t', 'stock', jsonb_build_object('id', tarta, 'stock', ''));
  assert (select stock from carta.productos where id = tarta) is null, 'stock sin control';
  begin perform public.carta_tpv('bar-tpv', 'cocina-t', 'stock', jsonb_build_object('id', tarta, 'stock', '-3')); ok := false;
  exception when others then ok := sqlerrm = 'stock_no_valido'; end;
  assert ok, 'stock no válido';

  -- 4. Mover consumo de mesa
  v := public.carta_tpv('bar-tpv', 'cocina-t', 'comandar', jsonb_build_object('mesa_id', m2, 'lineas', jsonb_build_array(jsonb_build_object('producto_id', cro, 'cantidad', 1))));
  v := public.carta_tpv('bar-tpv', 'cocina-t', 'mover', jsonb_build_object('ids', jsonb_build_array(v->'pedido'->>'id'), 'mesa_id', m3));
  assert (v->>'movidos')::int = 1 and v->>'mesa' = 'Mesa 3', 'mover a Mesa 3';
  assert (select mesa_nombre from carta.pedidos where mesa_id = m3 and not cerrado limit 1) = 'Mesa 3', 'el pedido ya es de la Mesa 3';

  -- 5. Cuentas separadas en Mesa 1: primero las croquetas (6), luego el resto (6)
  ids1 := (select jsonb_agg(id) from carta.pedidos where mesa_id = m1 and not cerrado);
  v := public.fiscal_pendiente('bar-tpv', 'cocina-t', ids1);
  assert (v->>'pendiente')::numeric = 12 and jsonb_array_length(v->'lineas') = 2 and (v->>'cobrado')::numeric = 0, 'pendiente 12 en 2 líneas';
  k_cro := (select x->>'k' from jsonb_array_elements(v->'lineas') x where x->>'nombre' = 'Croquetas');
  k_cana := (select x->>'k' from jsonb_array_elements(v->'lineas') x where x->>'nombre' = 'Caña');
  d1 := public.fiscal_cobrar('bar-tpv', 'cocina-t', jsonb_build_object('pedido_ids', ids1,
          'lineas', jsonb_build_array(jsonb_build_object('k', k_cro, 'cantidad', 2)), 'pagos', '[{"forma":"tarjeta","importe":"6"}]'::jsonb));
  assert (d1->>'total')::numeric = 6 and (d1->>'parcial')::boolean and (d1->>'pendiente')::numeric = 6 and d1->>'num_serie' = 'T' || anio || '-000001',
         'primera parte: T…-000001 de 6,00 y quedan 6,00';
  assert not exists (select 1 from carta.pedidos where mesa_id = m1 and cerrado), 'la mesa sigue abierta';
  v := public.fiscal_pendiente('bar-tpv', 'cocina-t', ids1);
  assert (v->>'cobrado')::numeric = 6 and (v->>'pendiente')::numeric = 6 and jsonb_array_length(v->'partes') = 1, 'cobrado 6 · pendiente 6';
  begin perform public.fiscal_cobrar('bar-tpv', 'cocina-t', jsonb_build_object('pedido_ids', ids1,
          'lineas', jsonb_build_array(jsonb_build_object('k', k_cana, 'cantidad', 4)), 'pagos', '[{"forma":"tarjeta","importe":"8"}]'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'cantidad_supera_pendiente'; end;
  assert ok, 'no se cobran más cañas de las pedidas';
  begin perform public.fiscal_cobrar('bar-tpv', 'cocina-t', jsonb_build_object('pedido_ids', ids1,
          'lineas', jsonb_build_array(jsonb_build_object('k', k_cro, 'cantidad', 1)), 'pagos', '[{"forma":"tarjeta","importe":"3"}]'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'cantidad_supera_pendiente'; end;
  assert ok, 'las croquetas ya cobradas no se vuelven a cobrar';
  d2 := public.fiscal_cobrar('bar-tpv', 'cocina-t', jsonb_build_object('pedido_ids', ids1, 'pagos', '[{"forma":"efectivo","importe":"6","entregado":"10"}]'::jsonb));
  assert (d2->>'total')::numeric = 6 and (d2->>'pendiente')::numeric = 0 and jsonb_array_length(d2->'lineas') = 1, 'segunda parte: las 3 cañas';
  assert not exists (select 1 from carta.pedidos where mesa_id = m1 and not cerrado), 'mesa cerrada al cobrarlo todo';
  -- Barra
  d3 := public.fiscal_cobrar('bar-tpv', 'cocina-t', jsonb_build_object('pedido_ids', jsonb_build_array(pb->>'id'), 'pagos', '[{"forma":"bizum","importe":"2"}]'::jsonb));
  assert d3->>'mesa' = 'Barra' and not (d3->>'parcial')::boolean, 'cobro de barra';

  -- 6. Devoluciones (rectificativas R5 por diferencias)
  r1 := public.fiscal_rectificar('bar-tpv', 'cocina-t', jsonb_build_object('token', d2->>'token',
          'lineas', jsonb_build_array(jsonb_build_object('k', k_cana, 'cantidad', 1)), 'forma', 'efectivo', 'motivo', 'Caña derramada'));
  assert r1->>'tipo' = 'R5' and r1->>'num_serie' = 'R' || anio || '-000001' and (r1->>'total')::numeric = -2
         and (r1->>'cuota_total')::numeric = -0.18 and r1->'rectifica'->>'num_serie' = d2->>'num_serie' and r1->>'motivo' = 'Caña derramada',
         'R5 R…-000001 de -2,00 que rectifica la segunda parte';
  assert (select estado from fiscal.documentos where token = d2->>'token') = 'rectificado', 'el original queda rectificado';
  assert (select contenido->>'TipoRectificativa' from fiscal.registros_sif rs join fiscal.documentos dc on dc.id = rs.documento_id where dc.token = r1->>'token') = 'I'
     and (select contenido->'FacturasRectificadas'->0->>'NumSerieFactura' from fiscal.registros_sif rs join fiscal.documentos dc on dc.id = rs.documento_id where dc.token = r1->>'token') = d2->>'num_serie',
         'registro SIF de la rectificativa (diferencias, factura rectificada)';
  begin perform public.fiscal_rectificar('bar-tpv', 'cocina-t', jsonb_build_object('token', d3->>'token', 'lineas',
          jsonb_build_array(jsonb_build_object('k', (d3->'lineas'->0->>'k'), 'cantidad', 2)))); ok := false;
  exception when others then ok := sqlerrm = 'cantidad_supera_pendiente'; end;
  assert ok, 'no se devuelve más de lo cobrado';
  begin perform public.fiscal_rectificar('bar-tpv', 'cocina-t', jsonb_build_object('token', r1->>'token')); ok := false;
  exception when others then ok := sqlerrm = 'no_rectificable'; end;
  assert ok, 'una rectificativa no se rectifica';
  -- El resto (2 cañas) y se reabre la mesa para cobrarla bien
  r2 := public.fiscal_rectificar('bar-tpv', 'cocina-t', jsonb_build_object('token', d2->>'token', 'forma', 'tarjeta', 'reabrir', true));
  assert (r2->>'total')::numeric = -4 and r2->>'num_serie' = 'R' || anio || '-000002', 'R…-000002: las 2 cañas restantes';
  assert not exists (select 1 from carta.pedidos where mesa_id = m1 and cerrado and tipo = 'pedido'), 'mesa reabierta';
  begin perform public.fiscal_rectificar('bar-tpv', 'cocina-t', jsonb_build_object('token', d2->>'token')); ok := false;
  exception when others then ok := sqlerrm in ('nada_que_rectificar', 'mesa_sin_cerrar'); end;
  assert ok, 'ya no queda nada que devolver';
  begin perform public.fiscal_rectificar('bar-tpv', 'cocina-t', jsonb_build_object('token', d1->>'token')); ok := false;
  exception when others then ok := sqlerrm = 'mesa_sin_cerrar'; end;
  assert ok, 'con la mesa abierta no se rectifican sus tickets';
  v := public.fiscal_pendiente('bar-tpv', 'cocina-t', ids1);
  assert (v->>'pendiente')::numeric = 6 and jsonb_array_length(v->'lineas') = 1 and v->'lineas'->0->>'nombre' = 'Caña', 'pendiente de nuevo: 3 cañas';
  doc := public.fiscal_cobrar('bar-tpv', 'cocina-t', jsonb_build_object('pedido_ids', ids1, 'pagos', '[{"forma":"tarjeta","importe":"6"}]'::jsonb));
  assert (doc->>'pendiente')::numeric = 0 and not exists (select 1 from carta.pedidos where mesa_id = m1 and not cerrado), 'se cobra bien y la mesa se cierra';
  begin perform public.fiscal_rectificar('bar-tpv', 'cocina-t', jsonb_build_object('token', d3->>'token', 'lineas',
          jsonb_build_array(jsonb_build_object('k', (d3->'lineas'->0->>'k'), 'cantidad', 1)), 'reabrir', true)); ok := true;
  exception when others then ok := false; end;
  assert ok, 'devolución total de la barra con reapertura';

  -- 7. Totales netos (informes y lista de tickets)
  inf := public.carta_informe('bar-tpv', 'cocina-t', '{}');
  -- 6 + 6 (rectificado) - 2 - 4 + 6 + 2 (barra, rectificada) - 2 = 12
  assert (inf->'cobros'->>'facturado')::numeric = 12 and (inf->'cobros'->>'tickets')::int = 4 and (inf->'cobros'->>'devoluciones')::int = 3
         and (inf->'cobros'->>'devuelto')::numeric = -8, 'informe: neto 12 con 4 tickets y 3 devoluciones (-8)';
  v := public.fiscal_documentos('bar-tpv', 'cocina-t', '{}');
  assert (v->'resumen'->>'total')::numeric = 12 and (v->>'cuantos')::int = 7, 'lista de tickets: neto 12 en 7 documentos';
  assert (v->'por_forma'->>'efectivo')::numeric = 4, 'efectivo neto: 6 - 2';
  v := public.fiscal_documentos('bar-tpv', 'cocina-t', '{"tipo":"ticket"}');
  assert (v->>'cuantos')::int = 7, 'R5 cuenta como ticket simplificado';
  raise notice 'TPV OK';
end $$;

-- 8. Cadena de huellas con rectificativas (importes negativos) e inalterabilidad
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
  assert n = 7 and exists (select 1 from fiscal.registros_sif where importe_total < 0 and contenido->>'ImporteTotal' like '-%'), '7 registros, con negativos';
  raise notice 'cadena con rectificativas OK';
end $$;

set role anon;
do $$
begin
  perform public.carta_tpv('bar-tpv', 'cocina-t', 'datos', '{}');
  raise notice 'TODAS LAS PRUEBAS TPV OK';
end $$;
reset role;
