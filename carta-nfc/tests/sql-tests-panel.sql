-- Pruebas del panel del bar (009_panel_bar.sql): mapa/agotados, cuenta de la mesa y código de mesa. Requiere bash db-local.sh.
\set ON_ERROR_STOP 1

select carta._alta('Bar Panel', 'bar-panel', 3, 'admin-p', 'cocina-p');
select carta._alta('Otro Bar', 'otro-bar', 1, 'admin-o', 'cocina-o');
set role anon;
do $$
declare
  v jsonb; cat uuid; caña uuid; mesa1 text; mesa1_id uuid; ok boolean; cod text; otro text;
begin
  cat := (public.carta_admin('bar-panel', 'admin-p', 'categoria', '{"nombre":"Bebidas"}'::jsonb)->>'id')::uuid;
  caña := (public.carta_admin('bar-panel', 'admin-p', 'producto',
             jsonb_build_object('nombre', 'Caña', 'precio', '2.20', 'categoria_id', cat))->>'id')::uuid;
  mesa1 := (select x->>'codigo' from jsonb_array_elements(public.carta_admin('bar-panel', 'admin-p')->'mesas') x where x->>'nombre' = 'Mesa 1');
  otro := (select x->>'codigo' from jsonb_array_elements(public.carta_admin('otro-bar', 'admin-o')->'mesas') x limit 1);

  -- panel: datos con la clave de cocina (mesas y carta), nada sin clave
  v := public.carta_panel('bar-panel', 'cocina-p');
  assert jsonb_array_length(v->'mesas') = 3 and not (v->>'codigo_mesa')::boolean, 'datos: 3 mesas, código apagado';
  assert v->'categorias'->0->'productos'->0->>'nombre' = 'Caña', 'datos: la carta';
  mesa1_id := (select (x->>'id')::uuid from jsonb_array_elements(v->'mesas') x where x->>'nombre' = 'Mesa 1');
  begin perform public.carta_panel('bar-panel', 'mala'); ok := false; exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'panel: clave obligatoria';

  -- agotado desde el panel
  v := public.carta_panel('bar-panel', 'cocina-p', 'disponible', jsonb_build_object('id', caña, 'disponible', false));
  assert not (v->'categorias'->0->'productos'->0->>'disponible')::boolean, 'agotado en un toque';
  begin perform public.carta_pedir(mesa1, jsonb_build_array(jsonb_build_object('producto_id', caña, 'cantidad', 1))); ok := false;
  exception when others then ok := sqlerrm like 'producto_agotado%'; end;
  assert ok, 'agotado: el cliente ya no puede pedirlo';
  perform public.carta_panel('bar-panel', 'cocina-p', 'disponible', jsonb_build_object('id', caña, 'disponible', true));
  begin perform public.carta_panel('otro-bar', 'cocina-o', 'disponible', jsonb_build_object('id', caña, 'disponible', false)); ok := false;
  exception when others then ok := sqlerrm = 'no_encontrado'; end;
  assert ok, 'agotado: no se toca la carta de otro bar';

  -- sin código de mesa: pedir como siempre y ver la cuenta de la mesa
  perform public.carta_pedir(mesa1, jsonb_build_array(jsonb_build_object('producto_id', caña, 'cantidad', 2)));
  perform public.carta_pedir_mesa(mesa1, null, jsonb_build_array(jsonb_build_object('producto_id', caña, 'cantidad', 1)));
  v := public.carta_mesa(mesa1);
  assert (v->>'total')::numeric = 6.60 and v->'lineas'->0->>'cantidad' = '3', 'cuenta de la mesa: 3 cañas, 6,60 €';
  assert (public.carta_mesa(otro)->>'total')::numeric = 0, 'cuenta: cada mesa la suya';

  -- código de mesa: solo el dueño lo activa
  begin perform public.carta_panel('bar-panel', 'cocina-p', 'ajuste_codigo', '{"activo":true}'::jsonb); ok := false;
  exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'código: la clave de cocina no lo activa';
  v := public.carta_panel('bar-panel', 'admin-p', 'ajuste_codigo', '{"activo":true}'::jsonb);
  assert (v->>'codigo_mesa')::boolean, 'código: activado por el dueño';

  -- con código activo y la mesa sin abrir: no se puede pedir (ni saltándose carta_pedir_mesa)
  begin perform public.carta_pedir(mesa1, jsonb_build_array(jsonb_build_object('producto_id', caña, 'cantidad', 1))); ok := false;
  exception when others then ok := sqlerrm = 'codigo_mesa'; end;
  assert ok, 'código: carta_pedir sin código no pide';
  v := public.carta_mesa(mesa1);
  assert not (v->>'valido')::boolean and (v->>'total')::numeric = 0, 'código: la cuenta no se ve sin código';

  -- el camarero abre la mesa: código de 4 cifras
  cod := public.carta_panel('bar-panel', 'cocina-p', 'abrir', jsonb_build_object('mesa_id', mesa1_id))->>'codigo';
  assert cod ~ '^[0-9]{4}$', 'abrir: código de 4 cifras';
  begin perform public.carta_pedir_mesa(mesa1, case when cod = '0000' then '1111' else '0000' end,
                                       jsonb_build_array(jsonb_build_object('producto_id', caña, 'cantidad', 1))); ok := false;
  exception when others then ok := sqlerrm = 'codigo_mesa'; end;
  assert ok, 'código equivocado: no pide';
  v := public.carta_pedir_mesa(mesa1, cod, jsonb_build_array(jsonb_build_object('producto_id', caña, 'cantidad', 1)));
  assert (v->>'total')::numeric = 2.20, 'código correcto: pide';
  assert (public.carta_mesa(mesa1, cod)->>'total')::numeric = 8.80, 'código correcto: ve la cuenta';
  assert (select x->>'clave' from jsonb_array_elements(public.carta_panel('bar-panel', 'cocina-p')->'mesas') x where x->>'nombre' = 'Mesa 1') = cod,
         'el panel ve el código de la mesa abierta';

  -- liberar la mesa: el código deja de valer
  perform public.carta_panel('bar-panel', 'cocina-p', 'cerrar_mesa', jsonb_build_object('mesa_id', mesa1_id));
  begin perform public.carta_pedir_mesa(mesa1, cod, jsonb_build_array(jsonb_build_object('producto_id', caña, 'cantidad', 1))); ok := false;
  exception when others then ok := sqlerrm = 'codigo_mesa'; end;
  assert ok, 'mesa liberada: el código ya no vale';

  -- otro bar sin código: sigue igual
  v := public.carta_menu(null, otro);
  assert v->'mesa' is not null, 'otros bares: sin cambios';
  raise notice 'TODAS LAS PRUEBAS DEL PANEL OK';
end $$;
reset role;
