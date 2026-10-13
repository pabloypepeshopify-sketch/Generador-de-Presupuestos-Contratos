-- Pruebas de la API SQL ejecutadas como rol anon (lo mismo que hace el navegador).
\set ON_ERROR_STOP 1
select carta._alta('Bar Test', 'bar-test', 3, 'admin-key-test', 'cocina-key-test');
select carta._alta('Otro Bar', 'otro-bar', 1, 'otro-admin', 'otro-cocina');
select carta.fijar_clave_plataforma('plataforma-clave-test');

set role anon;

do $$
declare
  v jsonb; pd jsonb; m1 text; m2 text; cat uuid; p_croq uuid; p_cana uuid; p_otro uuid; ok boolean; t text; e text;
begin
  -- 1. Sin acceso directo a tablas
  begin
    perform count(*) from carta.pedidos; ok := false;
  exception when insufficient_privilege then ok := true; end;
  assert ok, 'anon no debe leer carta.pedidos';

  -- 2. Admin crea carta
  v := public.carta_admin('bar-test', 'admin-key-test', 'categoria', '{"nombre":"Tapas"}');
  cat := (v->>'id')::uuid;
  v := public.carta_admin('bar-test', 'admin-key-test', 'producto',
        jsonb_build_object('nombre','Tapa de croquetas','precio','3.00','categoria_id',cat,'alergenos','["gluten","lacteos"]'::jsonb));
  p_croq := (v->>'id')::uuid;
  v := public.carta_admin('bar-test', 'admin-key-test', 'producto',
        jsonb_build_object('nombre','Caña','precio','2.2','categoria_id',cat));
  p_cana := (v->>'id')::uuid;
  assert jsonb_array_length(v->'productos') = 2, 'deben existir 2 productos';
  assert jsonb_array_length(v->'mesas') = 3, 'deben existir 3 mesas';
  m1 := v->'mesas'->0->>'codigo';
  m2 := v->'mesas'->1->>'codigo';

  -- alérgeno inventado rechazado
  begin
    perform public.carta_admin('bar-test','admin-key-test','producto',
      jsonb_build_object('nombre','X','precio','1','alergenos','["veneno"]'::jsonb)); ok := false;
  exception when check_violation then ok := true; end;
  assert ok, 'alérgeno no válido debe fallar';

  -- clave cocina no sirve para admin
  begin
    perform public.carta_admin('bar-test', 'cocina-key-test', 'datos'); ok := false;
  exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'clave cocina no debe abrir admin';

  -- 3. Menú por slug y por mesa
  v := public.carta_menu('bar-test', null);
  assert v->'mesa' = 'null'::jsonb, 'sin mesa';
  assert jsonb_array_length(v->'mesas') = 3, 'mesa_libre lista mesas';
  assert v->'categorias'->0->>'nombre' = 'Tapas', 'categoría Tapas';
  v := public.carta_menu(null, m2);
  assert v->'mesa'->>'nombre' = 'Mesa 2', 'menú por código de mesa';
  assert v->'restaurante'->>'slug' = 'bar-test', 'restaurante por mesa';

  -- 4. Pedido: total calculado en servidor, precio del cliente ignorado
  v := public.carta_pedir(m2, jsonb_build_array(
         jsonb_build_object('producto_id', p_croq, 'cantidad', 2, 'precio', 0.01, 'nota', 'sin sal'),
         jsonb_build_object('producto_id', p_cana, 'cantidad', '3')), 'Rápido porfa');
  assert (v->>'total')::numeric = 12.60, 'total 2*3 + 3*2.2 = 12.60, got ' || (v->>'total');
  assert (v->>'numero')::int = 1, 'primer pedido del día = 1';
  assert v->>'mesa' = 'Mesa 2', 'mesa del pedido';
  t := v->>'token';
  v := public.carta_pedir(m1, jsonb_build_array(jsonb_build_object('producto_id', p_croq, 'cantidad', 1)));
  assert (v->>'numero')::int = 2, 'segundo pedido = 2';

  -- 5. Validaciones
  foreach e in array array[
    'pedido_vacio|[]', 'cantidad_no_valida|[{"producto_id":"' || p_croq || '","cantidad":0}]',
    'cantidad_no_valida|[{"producto_id":"' || p_croq || '","cantidad":21}]',
    'cantidad_no_valida|[{"producto_id":"' || p_croq || '","cantidad":-1}]',
    'producto_no_valido|[{"producto_id":"00000000-0000-0000-0000-000000000000","cantidad":1}]',
    'id_no_valido|[{"producto_id":"x; drop table","cantidad":1}]'] loop
    begin
      perform public.carta_pedir(m1, split_part(e, '|', 2)::jsonb); ok := false;
    exception when others then ok := sqlerrm = split_part(e, '|', 1);
      if not ok then raise notice 'esperado % obtenido %', split_part(e, '|', 1), sqlerrm; end if;
    end;
    assert ok, 'validación ' || split_part(e, '|', 1);
  end loop;

  begin perform public.carta_pedir('nomesa', '[]'); ok := false;
  exception when others then ok := sqlerrm = 'mesa_no_valida'; end;
  assert ok, 'mesa no válida';

  -- 6. Agotado
  perform public.carta_admin('bar-test','admin-key-test','disponible', jsonb_build_object('id',p_cana,'disponible',false));
  begin
    perform public.carta_pedir(m1, jsonb_build_array(jsonb_build_object('producto_id', p_cana, 'cantidad', 1))); ok := false;
  exception when others then ok := sqlerrm = 'producto_agotado:Caña'; end;
  assert ok, 'producto agotado';

  -- 7. Producto de otro restaurante no se puede pedir en esta mesa
  v := public.carta_admin('otro-bar','otro-admin','producto','{"nombre":"Ajeno","precio":"1"}');
  p_otro := (v->>'id')::uuid;
  begin
    perform public.carta_pedir(m1, jsonb_build_array(jsonb_build_object('producto_id', p_otro, 'cantidad', 1))); ok := false;
  exception when others then ok := sqlerrm = 'producto_no_valido'; end;
  assert ok, 'producto ajeno';

  -- 8. Avisos (sin duplicados)
  v := public.carta_avisar(m2, 'cuenta');
  assert (v->>'repetido')::boolean = false, 'primer aviso';
  v := public.carta_avisar(m2, 'cuenta');
  assert (v->>'repetido')::boolean = true, 'aviso repetido';
  begin perform public.carta_avisar(m2, 'propina'); ok := false;
  exception when others then ok := sqlerrm = 'aviso_no_valido'; end;
  assert ok, 'tipo aviso';

  -- 9. Estado para el cliente
  v := public.carta_estado(array[t]);
  assert v->0->>'estado' = 'nuevo', 'estado inicial';

  -- 10. Cocina
  begin perform public.carta_cocina('bar-test', 'mala', 'listar'); ok := false;
  exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'cocina clave mala';
  v := public.carta_cocina('bar-test', 'cocina-key-test');
  assert jsonb_array_length(v->'pedidos') = 3, '2 pedidos + 1 aviso, got ' || jsonb_array_length(v->'pedidos');
  assert (v->>'es_admin')::boolean = false, 'cocina no es admin';
  pd := (select x from jsonb_array_elements(v->'pedidos') x where (x->>'numero')::int = 1);
  assert pd->'lineas'->0->>'nota' = 'sin sal', 'nota de línea';
  assert pd->>'nota' = 'Rápido porfa', 'nota de pedido';
  v := public.carta_cocina('bar-test', 'cocina-key-test', 'estado',
        jsonb_build_object('id', pd->>'id', 'estado', 'preparando'));
  pd := (select x from jsonb_array_elements(v->'pedidos') x where (x->>'numero')::int = 1);
  assert pd->>'estado' = 'preparando', 'estado cambiado';
  v := public.carta_estado(array[t]);
  assert v->0->>'estado' = 'preparando', 'cliente ve preparando';

  -- otra cocina no puede tocar pedidos ajenos
  begin
    perform public.carta_cocina('otro-bar', 'otro-cocina', 'estado',
      jsonb_build_object('id', pd->>'id', 'estado', 'cancelado'));
    ok := false;
  exception when others then ok := sqlerrm = 'pedido_no_encontrado'; end;
  assert ok, 'aislamiento entre restaurantes';

  -- pausa
  v := public.carta_cocina('bar-test', 'cocina-key-test', 'pausa', '{"abiertos":false}');
  assert (v->'restaurante'->>'pedidos_abiertos')::boolean = false, 'pausado';
  begin
    perform public.carta_pedir(m1, jsonb_build_array(jsonb_build_object('producto_id', p_croq, 'cantidad', 1))); ok := false;
  exception when others then ok := sqlerrm = 'pedidos_cerrados'; end;
  assert ok, 'pedidos cerrados';
  perform public.carta_cocina('bar-test', 'cocina-key-test', 'pausa', '{"abiertos":true}');

  -- cerrar mesa 2 (cobrada)
  v := public.carta_cocina('bar-test', 'cocina-key-test');
  v := public.carta_cocina('bar-test', 'cocina-key-test', 'cerrar', jsonb_build_object('ids',
         (select jsonb_agg(x->'id') from jsonb_array_elements(v->'pedidos') x where x->>'mesa' = 'Mesa 2')));
  assert jsonb_array_length(v->'pedidos') = 1, 'solo queda el pedido de Mesa 1';

  -- 11. Admin: mesas, claves, resumen
  v := public.carta_admin('bar-test','admin-key-test','crear_mesas','{"desde":1,"hasta":5,"prefijo":"Terraza"}');
  assert jsonb_array_length(v->'mesas') = 8, '3 + 5 mesas';
  v := public.carta_admin('bar-test','admin-key-test','crear_mesas','{"desde":1,"hasta":5,"prefijo":"Terraza"}');
  assert jsonb_array_length(v->'mesas') = 8, 'sin duplicar';
  begin perform public.carta_admin('bar-test','admin-key-test','mesa','{"nombre":"Mesa 1"}'); ok := false;
  exception when others then ok := sqlerrm = 'mesa_repetida'; end;
  assert ok, 'mesa repetida';
  assert (v->'hoy'->>'pedidos')::int = 2, 'resumen hoy 2 pedidos';
  assert (v->'hoy'->>'total')::numeric = 15.60, 'resumen total';
  assert v->'top'->0->>'nombre' = 'Caña' or v->'top'->0->>'nombre' = 'Tapa de croquetas', 'top productos';
  v := public.carta_admin('bar-test','admin-key-test','regenerar_clave','{"tipo":"cocina"}');
  begin perform public.carta_cocina('bar-test', 'cocina-key-test'); ok := false;
  exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'clave cocina antigua invalidada';
  perform public.carta_cocina('bar-test', v->>'clave');
  v := public.carta_admin('bar-test','admin-key-test','regenerar_mesa', jsonb_build_object('id',
         (select id from (select (x->>'id')::uuid id, x->>'codigo' c from jsonb_array_elements(v->'mesas') x) z where c = m1)));
  begin perform public.carta_pedir(m1, jsonb_build_array(jsonb_build_object('producto_id', p_croq, 'cantidad', 1))); ok := false;
  exception when others then ok := sqlerrm = 'mesa_no_valida'; end;
  assert ok, 'código de mesa regenerado invalida el NFC antiguo';

  -- 12. Plataforma
  begin perform public.carta_plataforma('mala'); ok := false;
  exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'plataforma clave mala';
  v := public.carta_plataforma('plataforma-clave-test', 'alta', '{"nombre":"Casa Pepe","slug":"casa-pepe","mesas":10}');
  assert v->>'slug' = 'casa-pepe' and length(v->>'clave_admin') = 24, 'alta';
  perform public.carta_admin('casa-pepe', v->>'clave_admin', 'datos');
  begin perform public.carta_plataforma('plataforma-clave-test', 'alta', '{"nombre":"X","slug":"casa-pepe"}'); ok := false;
  exception when others then ok := sqlerrm = 'slug_ocupado'; end;
  assert ok, 'slug ocupado';
  begin perform public.carta_plataforma('plataforma-clave-test', 'alta', '{"nombre":"X","slug":"Mal Slug!"}'); ok := false;
  exception when others then ok := sqlerrm = 'slug_no_valido'; end;
  assert ok, 'slug no válido';
  v := public.carta_plataforma('plataforma-clave-test', 'activo', '{"slug":"casa-pepe","activo":false}');
  begin perform public.carta_menu('casa-pepe'); ok := false;
  exception when others then ok := sqlerrm = 'restaurante_no_encontrado'; end;
  assert ok, 'restaurante desactivado';
  assert jsonb_array_length(v->'restaurantes') = 4, 'listar 4 restaurantes';

  -- 13. Funciones internas no accesibles
  begin perform carta._alta('X','hack-bar',1); ok := false;
  exception when insufficient_privilege then ok := true; end;
  assert ok, 'carta._alta no accesible a anon';

  raise notice 'TODAS LAS PRUEBAS SQL OK';
end $$;
reset role;
