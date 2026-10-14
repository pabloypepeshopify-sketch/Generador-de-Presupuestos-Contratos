-- Pruebas de la Fase 1 de facturación (003_fiscal.sql). Requiere 001 aplicado.
\set ON_ERROR_STOP 1

-- 0. Utilidades (como propietario)
do $$
begin
  -- Ejemplo oficial de la AEAT para la huella de un registro de alta
  assert fiscal._huella_alta('89890001K', '12345678/G33', '01-01-2024', 'F1', '12.35', '123.45', null,
                             '2024-01-01T19:20:30+01:00')
         = '3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60', 'huella ejemplo AEAT';
  assert fiscal._nif_valido('00000000T') and fiscal._nif_valido('12345678Z') and not fiscal._nif_valido('12345678A'), 'DNI';
  assert fiscal._nif_valido('X1234567L') and not fiscal._nif_valido('X1234567T'), 'NIE';
  assert fiscal._nif_valido('B12345674') and not fiscal._nif_valido('B12345675'), 'CIF';
  assert fiscal._nif_valido(' 12.345.678-z '), 'NIF con espacios/puntos/guion';
  assert fiscal._importe(28) = '28.00' and fiscal._importe(2.5) = '2.50', 'formato importe';
  assert fiscal._fecha('2026-10-14') = '14-10-2026', 'formato fecha';
  assert fiscal._fecha_huso('2026-07-01 10:00:00+00', 'Europe/Madrid') = '2026-07-01T12:00:00+02:00', 'huso verano';
  assert fiscal._fecha_huso('2026-01-15 10:00:00+00', 'Europe/Madrid') = '2026-01-15T11:00:00+01:00', 'huso invierno';
  assert fiscal._fecha_huso('2026-01-15 10:00:00+00', 'America/Mexico_City') = '2026-01-15T04:00:00-06:00', 'huso negativo';
  raise notice 'utilidades OK';
end $$;

select carta._alta('Bar Fiscal', 'bar-fiscal', 4, 'admin-f', 'cocina-f');

set role anon;

do $$
declare
  v jsonb; doc jsonb; m2 text; m3 text; m4 text; cat_tap uuid; cat_beb uuid; p_cec uuid; p_mct uuid; p_cana uuid;
  ids jsonb; ok boolean; anio text := to_char(now() at time zone 'Europe/Madrid', 'YYYY'); tok text; pedtok text;
  titular jsonb := '{"nif":"00000000T","razon_social":"DEMO SIN VALIDEZ FISCAL","nombre_comercial":"Bar Fiscal",
                    "domicilio":"Plaza Mayor 1","codigo_postal":"11540","municipio":"Sanlúcar","provincia":"Cádiz",
                    "tipo_persona":"fisica","regimen_renta":"estimacion_directa","modo_sif":"verifactu","pie_ticket":"¡Gracias!"}';
begin
  -- Sin acceso directo
  begin perform count(*) from fiscal.documentos; ok := false; exception when insufficient_privilege then ok := true; end;
  assert ok, 'anon no lee fiscal.documentos';

  -- Carta del bar
  v := public.carta_admin('bar-fiscal','admin-f','categoria','{"nombre":"Tapas"}');      cat_tap := (v->>'id')::uuid;
  v := public.carta_admin('bar-fiscal','admin-f','categoria','{"nombre":"Bebidas"}');    cat_beb := (v->>'id')::uuid;
  v := public.carta_admin('bar-fiscal','admin-f','producto', jsonb_build_object('nombre','Cecina de León · Media','precio','9','categoria_id',cat_tap)); p_cec := (v->>'id')::uuid;
  v := public.carta_admin('bar-fiscal','admin-f','producto', jsonb_build_object('nombre','McTínez','precio','10','categoria_id',cat_tap));              p_mct := (v->>'id')::uuid;
  v := public.carta_admin('bar-fiscal','admin-f','producto', jsonb_build_object('nombre','Caña','precio','2.20','categoria_id',cat_beb));              p_cana := (v->>'id')::uuid;
  m2 := v->'mesas'->1->>'codigo'; m3 := v->'mesas'->2->>'codigo'; m4 := v->'mesas'->3->>'codigo';

  -- 1. Sin titular: facturación inactiva
  v := public.fiscal_config('bar-fiscal', 'cocina-f');
  assert (v->>'activo')::boolean = false, 'sin titular: inactivo';
  begin perform public.fiscal_cobrar('bar-fiscal','cocina-f','{"pedido_ids":["00000000-0000-0000-0000-000000000000"]}'); ok := false;
  exception when others then ok := sqlerrm = 'titular_sin_datos'; end;
  assert ok, 'titular_sin_datos';

  -- 2. Alta del titular (validaciones)
  begin perform public.fiscal_admin('bar-fiscal','admin-f','titular', titular || '{"nif":"12345678A"}'); ok := false;
  exception when others then ok := sqlerrm = 'nif_no_valido'; end;
  assert ok, 'NIF no válido rechazado';
  begin perform public.fiscal_admin('bar-fiscal','admin-f','titular', titular || '{"entorno_aeat":"produccion"}'); ok := false;
  exception when others then ok := sqlerrm = 'produccion_no_disponible'; end;
  assert ok, 'producción bloqueada en Fase 1';
  begin perform public.fiscal_admin('bar-fiscal','admin-f','titular', titular || '{"tipo_persona":"x"}'); ok := false;
  exception when others then ok := sqlerrm = 'titular_incompleto'; end;
  assert ok, 'titular incompleto';
  begin perform public.fiscal_admin('bar-fiscal','cocina-f','datos'); ok := false;
  exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'fiscal_admin exige clave admin';
  v := public.fiscal_admin('bar-fiscal','admin-f','titular', titular);
  assert v->'titular'->>'nif' = '00000000T' and v->'titular'->>'entorno_aeat' = 'pruebas', 'titular guardado en pruebas';
  assert not (v->'titular' ? 'certificado_ref'), 'no expone certificado_ref';
  v := public.fiscal_config('bar-fiscal', 'cocina-f');
  assert (v->>'activo')::boolean and v->>'modo_sif' = 'verifactu', 'facturación activa';

  -- 3. Ejemplo del brief: Mesa 2 · 2× Cecina Media (9) + McTínez (10) = 28,00 € con tarjeta
  v := public.carta_pedir(m2, jsonb_build_array(jsonb_build_object('producto_id', p_cec, 'cantidad', 1)));
  pedtok := v->>'token';
  assert public.fiscal_tickets(array[pedtok]) = '[]'::jsonb, 'sin ticket antes de cobrar';
  perform public.carta_pedir(m2, jsonb_build_array(jsonb_build_object('producto_id', p_cec, 'cantidad', 1),
                                                   jsonb_build_object('producto_id', p_mct, 'cantidad', 1)));
  perform public.carta_pedir(m2, jsonb_build_array(jsonb_build_object('producto_id', p_cana, 'cantidad', 1)));
  perform public.carta_avisar(m2, 'cuenta');
  v := public.carta_cocina('bar-fiscal', 'cocina-f');
  -- la caña se cancela (no se cobra)
  perform public.carta_cocina('bar-fiscal','cocina-f','estado', jsonb_build_object('id',
    (select x->>'id' from jsonb_array_elements(v->'pedidos') x where (x->'lineas'->0->>'nombre') = 'Caña'), 'estado', 'cancelado'));
  v := public.carta_cocina('bar-fiscal', 'cocina-f');
  ids := (select jsonb_agg(x->'id') from jsonb_array_elements(v->'pedidos') x where x->>'mesa' = 'Mesa 2');
  assert jsonb_array_length(ids) = 4, '3 pedidos + 1 aviso en Mesa 2';

  begin perform public.fiscal_cobrar('bar-fiscal','cocina-f', jsonb_build_object('pedido_ids', ids,
          'pagos', '[{"forma":"tarjeta","importe":"27"}]'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'pagos_no_cuadran'; end;
  assert ok, 'pagos que no cuadran';
  begin perform public.fiscal_cobrar('bar-fiscal','mala', jsonb_build_object('pedido_ids', ids, 'pagos', '[]'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'cobrar exige clave';

  doc := public.fiscal_cobrar('bar-fiscal','cocina-f', jsonb_build_object('pedido_ids', ids,
           'pagos', '[{"forma":"tarjeta","importe":"28"}]'::jsonb, 'dispositivo', 'tablet barra'));
  assert doc->>'tipo' = 'F2', 'ticket F2';
  assert doc->>'num_serie' = 'T' || anio || '-000001', 'numeración T' || anio || '-000001, got ' || (doc->>'num_serie');
  assert (doc->>'total')::numeric = 28.00 and (doc->>'base_total')::numeric = 25.45 and (doc->>'cuota_total')::numeric = 2.55,
         'base 25,45 + cuota 2,55 = 28,00';
  assert jsonb_array_length(doc->'desglose') = 1 and (doc->'desglose'->0->>'iva')::numeric = 10, 'IVA 10 %';
  assert jsonb_array_length(doc->'lineas') = 2, 'líneas agrupadas: Cecina ×2 y McTínez (la caña cancelada no entra)';
  assert (select (l->>'cantidad')::int from jsonb_array_elements(doc->'lineas') l where l->>'nombre' like 'Cecina%') = 2, 'Cecina ×2';
  assert doc->'sif'->>'leyenda' = 'VERI*FACTU', 'leyenda VERI*FACTU';
  assert doc->'sif'->>'qr_url' = 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=00000000T&numserie=T' || anio
         || '-000001&fecha=' || to_char(now() at time zone 'Europe/Madrid', 'DD-MM-YYYY') || '&importe=28.00', 'URL del QR (pruebas)';
  assert doc->'emisor'->>'nif' = '00000000T' and doc->>'mesa' = 'Mesa 2', 'emisor y mesa';
  assert (doc->'pagos'->0->>'forma') = 'tarjeta', 'forma de pago';
  tok := doc->>'token';

  -- la mesa queda libre (pedidos, aviso y cancelado cerrados)
  v := public.carta_cocina('bar-fiscal', 'cocina-f');
  assert not exists (select 1 from jsonb_array_elements(v->'pedidos') x where x->>'mesa' = 'Mesa 2'), 'Mesa 2 liberada';
  begin perform public.fiscal_cobrar('bar-fiscal','cocina-f', jsonb_build_object('pedido_ids', ids,
          'pagos', '[{"forma":"tarjeta","importe":"28"}]'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'pedidos_ya_cobrados'; end;
  assert ok, 'no se cobra dos veces';

  -- ticket público por token y enlace desde los pedidos del cliente
  v := public.fiscal_documento(tok);
  assert v->>'num_serie' = doc->>'num_serie' and v->>'pie' = '¡Gracias!', 'fiscal_documento';
  begin perform public.fiscal_documento('nope'); ok := false; exception when others then ok := sqlerrm = 'documento_no_encontrado'; end;
  assert ok, 'token no válido';
  v := public.fiscal_tickets(array[pedtok, 'token-inexistente']);
  assert jsonb_array_length(v) = 1 and v->0->>'ticket_token' = tok and v->0->>'num_serie' = doc->>'num_serie',
         'el cliente encuentra su ticket con el token de su pedido';

  -- 4. Segundo ticket en efectivo con cambio y propina: T…-000002
  perform public.carta_pedir(m3, jsonb_build_array(jsonb_build_object('producto_id', p_cana, 'cantidad', 2)));
  v := public.carta_cocina('bar-fiscal', 'cocina-f');
  ids := (select jsonb_agg(x->'id') from jsonb_array_elements(v->'pedidos') x where x->>'mesa' = 'Mesa 3');
  begin perform public.fiscal_cobrar('bar-fiscal','cocina-f', jsonb_build_object('pedido_ids', ids,
          'pagos', '[{"forma":"efectivo","importe":"5.40","entregado":"5"}]'::jsonb, 'propina', '1')); ok := false;
  exception when others then ok := sqlerrm = 'entregado_insuficiente'; end;
  assert ok, 'entregado menor que el importe';
  doc := public.fiscal_cobrar('bar-fiscal','cocina-f', jsonb_build_object('pedido_ids', ids,
           'pagos', '[{"forma":"efectivo","importe":"5.40","entregado":"10"}]'::jsonb, 'propina', '1'));
  assert doc->>'num_serie' = 'T' || anio || '-000002', 'correlativo 000002';
  assert (doc->>'total')::numeric = 4.40 and (doc->>'propina')::numeric = 1, 'propina fuera del total';
  assert (doc->'pagos'->0->>'cambio')::numeric = 4.60, 'cambio 4,60';

  -- 5. IVA por categoría: Bebidas al 21 %
  perform public.fiscal_admin('bar-fiscal','admin-f','iva_categoria', jsonb_build_object('id', cat_beb, 'iva', 21));
  perform public.carta_pedir(m4, jsonb_build_array(jsonb_build_object('producto_id', p_cana, 'cantidad', 1),
                                                   jsonb_build_object('producto_id', p_mct, 'cantidad', 1)));
  v := public.carta_cocina('bar-fiscal', 'cocina-f');
  ids := (select jsonb_agg(x->'id') from jsonb_array_elements(v->'pedidos') x where x->>'mesa' = 'Mesa 4');
  -- 6. Factura completa F1 con NIF del cliente
  begin perform public.fiscal_cobrar('bar-fiscal','cocina-f', jsonb_build_object('pedido_ids', ids,
          'pagos', '[{"forma":"tarjeta","importe":"12.20"}]'::jsonb, 'cliente', '{"nif":"B12345675","nombre":"X","domicilio":"Y"}'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'nif_cliente_no_valido'; end;
  assert ok, 'NIF cliente no válido';
  begin perform public.fiscal_cobrar('bar-fiscal','cocina-f', jsonb_build_object('pedido_ids', ids,
          'pagos', '[{"forma":"tarjeta","importe":"12.20"}]'::jsonb, 'cliente', '{"nif":"B12345674"}'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'cliente_incompleto'; end;
  assert ok, 'cliente incompleto';
  doc := public.fiscal_cobrar('bar-fiscal','cocina-f', jsonb_build_object('pedido_ids', ids,
           'pagos', '[{"forma":"tarjeta","importe":"7.20"},{"forma":"efectivo","importe":"5"}]'::jsonb,
           'cliente', '{"nif":"b-12345674","nombre":"Empresa Demo SL","domicilio":"Calle Falsa 1, Cádiz"}'::jsonb));
  assert doc->>'tipo' = 'F1' and doc->>'num_serie' = 'F' || anio || '-000001', 'factura F1 serie F';
  assert doc->'cliente'->>'nif' = 'B12345674', 'NIF cliente normalizado';
  assert jsonb_array_length(doc->'desglose') = 2, 'desglose 21 % y 10 %';
  assert (select (x->>'base')::numeric from jsonb_array_elements(doc->'desglose') x where (x->>'iva')::numeric = 21) = 1.82
     and (select (x->>'cuota')::numeric from jsonb_array_elements(doc->'desglose') x where (x->>'iva')::numeric = 21) = 0.38,
         'caña al 21 %: 1,82 + 0,38';
  assert (doc->>'base_total')::numeric + (doc->>'cuota_total')::numeric = 12.20, 'base + cuota = total';
  assert jsonb_array_length(doc->'pagos') = 2, 'pago mixto';

  -- 7. Límite de factura simplificada
  perform public.fiscal_admin('bar-fiscal','admin-f','titular', titular || '{"limite_simplificada":"5"}');
  perform public.carta_pedir(m2, jsonb_build_array(jsonb_build_object('producto_id', p_mct, 'cantidad', 1)));
  v := public.carta_cocina('bar-fiscal', 'cocina-f');
  ids := (select jsonb_agg(x->'id') from jsonb_array_elements(v->'pedidos') x where x->>'mesa' = 'Mesa 2');
  begin perform public.fiscal_cobrar('bar-fiscal','cocina-f', jsonb_build_object('pedido_ids', ids,
          'pagos', '[{"forma":"tarjeta","importe":"10"}]'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'importe_supera_limite_simplificada'; end;
  assert ok, 'límite simplificada';

  -- 8. Desactivada
  perform public.fiscal_admin('bar-fiscal','admin-f','titular', titular || '{"modo_sif":"desactivado"}');
  assert (public.fiscal_config('bar-fiscal','cocina-f')->>'activo')::boolean = false, 'desactivada';
  begin perform public.fiscal_cobrar('bar-fiscal','cocina-f', jsonb_build_object('pedido_ids', ids,
          'pagos', '[{"forma":"tarjeta","importe":"10"}]'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'facturacion_desactivada'; end;
  assert ok, 'cobrar con facturación desactivada';
  perform public.fiscal_admin('bar-fiscal','admin-f','titular', titular);

  v := public.fiscal_admin('bar-fiscal','admin-f','datos');
  assert jsonb_array_length(v->'documentos') = 3 and (v->'sif'->>'registros')::int = 3 and (v->'sif'->>'pendientes')::int = 3,
         'admin: 3 documentos y 3 registros pendientes de envío';

  -- 8. Listado completo de tickets (fiscal_documentos, 004)
  v := public.fiscal_documentos('bar-fiscal', 'cocina-f', '{}');
  assert (v->>'cuantos')::int = 3 and jsonb_array_length(v->'documentos') = 3 and not (v->>'hay_mas')::boolean, 'listado: 3 documentos';
  assert v->'documentos'->0->>'num_serie' = 'F' || anio || '-000001', 'el más reciente primero';
  assert (v->'resumen'->>'total')::numeric = 44.60 and (v->'resumen'->>'propinas')::numeric = 1, 'resumen: 44,60 + 1 de propina';
  assert (v->'por_forma'->>'tarjeta')::numeric = 35.20 and (v->'por_forma'->>'efectivo')::numeric = 10.40, 'cobrado por forma de pago';
  v := public.fiscal_documentos('bar-fiscal', 'admin-f', '{"limite":"2"}');
  assert jsonb_array_length(v->'documentos') = 2 and (v->>'hay_mas')::boolean, 'paginación: 2 y hay más (clave admin vale)';
  v := public.fiscal_documentos('bar-fiscal', 'cocina-f', '{"limite":"2","saltar":"2"}');
  assert jsonb_array_length(v->'documentos') = 1 and v->'documentos'->0->>'num_serie' = 'T' || anio || '-000001', 'página 2';
  v := public.fiscal_documentos('bar-fiscal', 'cocina-f', '{"tipo":"factura"}');
  assert (v->>'cuantos')::int = 1 and v->'documentos'->0->'cliente'->>'nif' = 'B12345674', 'filtro facturas';
  v := public.fiscal_documentos('bar-fiscal', 'cocina-f', '{"q":"empresa demo"}');
  assert (v->>'cuantos')::int = 1, 'búsqueda por cliente';
  v := public.fiscal_documentos('bar-fiscal', 'cocina-f', jsonb_build_object('q', 't' || anio || '-000002'));
  assert (v->>'cuantos')::int = 1 and (v->'documentos'->0->>'propina')::numeric = 1, 'búsqueda por número';
  v := public.fiscal_documentos('bar-fiscal', 'cocina-f', '{"q":"%"}');
  assert (v->>'cuantos')::int = 0, 'el % no es comodín';
  v := public.fiscal_documentos('bar-fiscal', 'cocina-f', jsonb_build_object('desde', v->>'hoy', 'hasta', v->>'hoy'));
  assert (v->>'cuantos')::int = 3, 'filtro de hoy';
  v := public.fiscal_documentos('bar-fiscal', 'cocina-f', '{"hasta":"2000-01-01"}');
  assert (v->>'cuantos')::int = 0 and (v->'resumen'->>'total')::numeric = 0, 'periodo vacío';
  begin perform public.fiscal_documentos('bar-fiscal', 'cocina-f', '{"desde":"2026-13-45"}'); ok := false;
  exception when others then ok := sqlerrm = 'filtro_no_valido'; end;
  assert ok, 'fecha no válida';
  begin perform public.fiscal_documentos('bar-fiscal', 'cocina-f', '{"limite":"9999"}'); ok := false;
  exception when others then ok := sqlerrm = 'filtro_no_valido'; end;
  assert ok, 'límite no válido';
  begin perform public.fiscal_documentos('sin-fiscal', 'cocina-f', '{}'); ok := false;
  exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'no ve tickets de otro bar';
  raise notice 'API fiscal OK';
end $$;

reset role;

-- 9. Cadena de huellas e inmutabilidad (como propietario)
do $$
declare
  r record; prev text := null; n int := 0; ok boolean;
begin
  for r in select rs.* from fiscal.registros_sif rs order by id loop
    n := n + 1;
    assert r.huella_anterior is not distinct from prev, 'encadenamiento registro ' || n;
    assert r.huella = fiscal._huella_alta(r.nif_emisor, r.num_serie, fiscal._fecha(r.fecha_expedicion), r.tipo_factura,
                                          fiscal._importe(r.cuota_total), fiscal._importe(r.importe_total),
                                          r.huella_anterior, r.fecha_hora_huso), 'huella recalculable ' || n;
    assert (r.contenido->>'Huella') = r.huella, 'contenido con huella ' || n;
    assert (n = 1) = (r.contenido->'Encadenamiento' ? 'PrimerRegistro'), 'PrimerRegistro solo en el primero';
    prev := r.huella;
  end loop;
  assert n = 3, '3 registros';

  begin update fiscal.documentos set total = 1; ok := false; exception when others then ok := sqlerrm = 'documento_inmutable'; end;
  assert ok, 'no se edita el total';
  begin delete from fiscal.documentos; ok := false; exception when others then ok := sqlerrm = 'documento_inmutable'; end;
  assert ok, 'no se borran documentos';
  begin delete from fiscal.documento_lineas; ok := false; exception when others then ok := sqlerrm = 'documento_inmutable'; end;
  assert ok, 'no se borran líneas';
  begin update fiscal.registros_sif set huella = 'X'; ok := false; exception when others then ok := sqlerrm = 'documento_inmutable'; end;
  assert ok, 'no se toca la huella';
  begin truncate fiscal.cobros; ok := false; exception when others then ok := sqlerrm = 'documento_inmutable'; end;
  assert ok, 'no se vacía cobros';
  update fiscal.registros_sif set estado_envio = 'pendiente', reintentos = reintentos;  -- campos de envío: sí
  update fiscal.documentos set estado = estado;                                       -- estado: sí
  assert (select count(*) from fiscal.series where ultimo > 0) = 2, 'series T y F';
  raise notice 'TODAS LAS PRUEBAS FISCALES OK';
end $$;
