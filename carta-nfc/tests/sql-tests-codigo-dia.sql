-- Pruebas del código del día (011_codigo_dia.sql). Requiere bash db-local.sh.
\set ON_ERROR_STOP 1

select carta._alta('Bar Codigo', 'bar-codigo', 2, 'admin-c', 'cocina-c');
set role anon;
do $$
declare
  v jsonb; cat uuid; caña uuid; mesa1 text; ok boolean; cod text; cod2 text;
  lin jsonb;
begin
  cat := (public.carta_admin('bar-codigo', 'admin-c', 'categoria', '{"nombre":"Bebidas"}'::jsonb)->>'id')::uuid;
  caña := (public.carta_admin('bar-codigo', 'admin-c', 'producto',
             jsonb_build_object('nombre', 'Caña', 'precio', '1.5', 'categoria_id', cat))->>'id')::uuid;
  mesa1 := (select x->>'codigo' from jsonb_array_elements(public.carta_admin('bar-codigo', 'admin-c')->'mesas') x where x->>'nombre' = 'Mesa 1');
  lin := jsonb_build_array(jsonb_build_object('producto_id', caña, 'cantidad', 1));

  -- apagado por defecto: se pide sin código y el panel no enseña código
  v := public.carta_panel('bar-codigo', 'cocina-c');
  assert not (v->>'codigo_dia')::boolean and v->>'clave_dia' is null, 'código del día apagado por defecto';
  perform public.carta_pedir(mesa1, lin);

  -- solo el dueño elige el modo
  begin perform public.carta_panel('bar-codigo', 'cocina-c', 'ajuste_codigo', '{"modo":"dia"}'::jsonb); ok := false;
  exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'el modo de código solo lo cambia el dueño';
  v := public.carta_panel('bar-codigo', 'admin-c', 'ajuste_codigo', '{"modo":"dia"}'::jsonb);
  cod := v->>'clave_dia';
  assert (v->>'codigo_dia')::boolean and not (v->>'codigo_mesa')::boolean and cod ~ '^[0-9]{4}$', 'modo "del día": código de 4 cifras';
  assert public.carta_panel('bar-codigo', 'cocina-c')->>'clave_dia' = cod, 'el panel del camarero ve el código de hoy';

  -- sin código (o con uno malo) no se pide, ni directo ni con carta_pedir_mesa
  begin perform public.carta_pedir(mesa1, lin); ok := false; exception when others then ok := sqlerrm = 'codigo_dia'; end;
  assert ok, 'carta_pedir sin código: codigo_dia';
  begin perform public.carta_pedir_mesa(mesa1, case when cod = '0000' then '1111' else '0000' end, lin); ok := false;
  exception when others then ok := sqlerrm = 'codigo_dia'; end;
  assert ok, 'código equivocado: codigo_dia';
  v := public.carta_mesa(mesa1, null);
  assert (v->>'codigo_dia')::boolean and not (v->>'valido')::boolean and jsonb_array_length(v->'lineas') = 0, 'sin código no se ve la cuenta';
  perform public.carta_pedir_mesa(mesa1, cod, lin);
  v := public.carta_mesa(mesa1, cod);
  assert (v->>'valido')::boolean and (v->>'total')::numeric = 3, 'con el código de hoy se pide y se ve la cuenta';

  -- ↻ lo cambia al momento (cualquier clave del panel)
  cod2 := public.carta_panel('bar-codigo', 'cocina-c', 'nueva_clave_dia')->>'clave_dia';
  assert cod2 ~ '^[0-9]{4}$', '↻: código nuevo';
  if cod2 <> cod then
    begin perform public.carta_pedir_mesa(mesa1, cod, lin); ok := false; exception when others then ok := sqlerrm = 'codigo_dia'; end;
    assert ok, 'tras ↻ el código anterior ya no vale';
  end if;
  perform public.carta_pedir_mesa(mesa1, cod2, lin);

  -- modo mesa apaga el del día; ninguno apaga los dos; { activo } de 009 sigue valiendo
  v := public.carta_panel('bar-codigo', 'admin-c', 'ajuste_codigo', '{"modo":"mesa"}'::jsonb);
  assert (v->>'codigo_mesa')::boolean and not (v->>'codigo_dia')::boolean and v->>'clave_dia' is null, 'modo mesa';
  v := public.carta_panel('bar-codigo', 'admin-c', 'ajuste_codigo', '{"modo":"ninguno"}'::jsonb);
  assert not (v->>'codigo_mesa')::boolean and not (v->>'codigo_dia')::boolean, 'modo ninguno';
  perform public.carta_pedir(mesa1, lin);
  v := public.carta_panel('bar-codigo', 'admin-c', 'ajuste_codigo', '{"activo":true}'::jsonb);
  assert (v->>'codigo_mesa')::boolean, '{ activo } de 009 enciende el código de mesa';
  begin perform public.carta_panel('bar-codigo', 'admin-c', 'ajuste_codigo', '{"modo":"raro"}'::jsonb); ok := false;
  exception when others then ok := sqlerrm = 'accion_no_valida'; end;
  assert ok, 'modo desconocido: error';
  raise notice 'TODAS LAS PRUEBAS DEL CÓDIGO DEL DÍA OK';
end $$;
reset role;

-- El código depende del día (a las 5:00 hora del bar) y del secreto del bar, y nunca sale el secreto.
do $$
declare r carta.restaurantes;
begin
  select * into r from carta.restaurantes where slug = 'bar-codigo';
  assert carta._clave_dia(r) ~ '^[0-9]{4}$', 'código de 4 cifras';
  assert not exists (select 1 from information_schema.routine_privileges
                      where routine_name = '_clave_dia' and grantee in ('anon', 'authenticated')), '_clave_dia no se puede llamar desde fuera';
  assert public.carta_panel('bar-codigo', 'admin-c')::text not like '%' || r.clave_dia_sal || '%', 'el secreto no sale en el panel';
end $$;
