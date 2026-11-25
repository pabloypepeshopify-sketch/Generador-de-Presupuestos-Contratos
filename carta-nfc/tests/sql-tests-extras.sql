-- Pruebas de los extras (010_extras.sql): WiFi, opciones por plato, valoraciones y datos del resumen. Requiere bash db-local.sh.
\set ON_ERROR_STOP 1

select carta._alta('Bar Extras', 'bar-extras', 2, 'admin-e', 'cocina-e');
set role anon;
do $$
declare
  v jsonb; cat uuid; burger uuid; mesa1 text; ok boolean;
begin
  cat := (public.carta_admin('bar-extras', 'admin-e', 'categoria', '{"nombre":"Burgers"}'::jsonb)->>'id')::uuid;
  burger := (public.carta_admin('bar-extras', 'admin-e', 'producto',
               jsonb_build_object('nombre', 'Burger', 'precio', '10', 'categoria_id', cat))->>'id')::uuid;
  mesa1 := (select x->>'codigo' from jsonb_array_elements(public.carta_admin('bar-extras', 'admin-e')->'mesas') x where x->>'nombre' = 'Mesa 1');

  -- por defecto nada
  v := public.carta_info('bar-extras', mesa1);
  assert v->>'wifi_red' is null and v->>'resena_url' is null and v->'opciones' = '{}'::jsonb, 'sin extras por defecto';

  -- WiFi y reseña: solo el dueño
  begin perform public.carta_panel('bar-extras', 'cocina-e', 'extras', '{"wifi_red":"x"}'::jsonb); ok := false;
  exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'extras: la clave de cocina no los cambia';
  begin perform public.carta_panel('bar-extras', 'admin-e', 'extras', '{"resena_url":"http://mal"}'::jsonb); ok := false;
  exception when others then ok := sqlerrm = 'web_no_valida'; end;
  assert ok, 'reseña: solo https';
  v := public.carta_panel('bar-extras', 'admin-e', 'extras',
         '{"wifi_red":"BarExtras","wifi_clave":"cañas2026","resena_url":"https://g.page/r/ejemplo/review"}'::jsonb);
  assert v->>'wifi_red' = 'BarExtras' and v->>'resena_url' like 'https://g.page/%', 'extras guardados';
  assert public.carta_panel('bar-extras', 'cocina-e')->>'wifi_clave' is null, 'el panel de cocina no ve los ajustes del dueño';
  v := public.carta_info('bar-extras', mesa1);
  assert v->>'wifi_clave' = 'cañas2026', 'la mesa ve la WiFi';
  assert public.carta_info('bar-extras')->>'wifi_red' is null and public.carta_info('bar-extras')->>'resena_url' is not null,
         'sin mesa no se ve la WiFi (la reseña sí)';

  -- opciones por plato
  begin perform public.carta_panel('bar-extras', 'admin-e', 'opciones',
                  jsonb_build_object('id', burger, 'opciones', '[{"nombre":"Punto","valores":["Solo uno"]}]'::jsonb)); ok := false;
  exception when others then ok := sqlerrm = 'opciones_no_validas'; end;
  assert ok, 'opciones: al menos 2 valores';
  perform public.carta_panel('bar-extras', 'admin-e', 'opciones', jsonb_build_object('id', burger,
            'opciones', '[{"nombre":" Punto ","valores":["Poco hecho","Al punto","Hecho"]},{"nombre":"Picante","valores":["1","2","3"]}]'::jsonb));
  v := public.carta_info('bar-extras', mesa1)->'opciones'->(burger::text);
  assert jsonb_array_length(v) = 2 and v->0->>'nombre' = 'Punto', 'opciones guardadas y limpias';
  perform public.carta_panel('bar-extras', 'admin-e', 'opciones', jsonb_build_object('id', burger, 'opciones', '[]'::jsonb));
  assert public.carta_info('bar-extras', mesa1)->'opciones' = '{}'::jsonb, 'opciones borradas';

  -- valoraciones
  begin perform public.carta_valorar(mesa1, 6); ok := false; exception when others then ok := sqlerrm = 'valoracion_no_valida'; end;
  assert ok, 'valoración: de 1 a 5';
  v := public.carta_valorar(mesa1, 5, 'Todo genial');
  assert (v->>'ok')::boolean and v->>'resena_url' like 'https://%', 'valoración guardada y devuelve la reseña';
  perform public.carta_valorar(mesa1, 3, 'Tardó un poco');
  v := public.carta_panel('bar-extras', 'admin-e')->'valoracion';
  assert (v->>'media')::numeric = 4.0 and (v->>'n')::int = 2, 'media de los últimos 30 días';
  begin perform public.carta_panel('bar-extras', 'cocina-e', 'opiniones'); ok := false;
  exception when others then ok := sqlerrm = 'clave_incorrecta'; end;
  assert ok, 'opiniones: solo el dueño';
  v := public.carta_panel('bar-extras', 'admin-e', 'opiniones')->'opiniones';
  assert jsonb_array_length(v) = 2 and v->0->>'comentario' = 'Tardó un poco', 'opiniones con su comentario';

  -- mesas activas
  perform public.carta_pedir(mesa1, jsonb_build_array(jsonb_build_object('producto_id', burger, 'cantidad', 1)));
  assert (public.carta_panel('bar-extras', 'cocina-e')->>'mesas_activas')::int = 1, 'una mesa activa';
  -- trivial: apagado por defecto, solo el nombre, corrige el servidor
  begin perform public.carta_trivia(mesa1, 'ranking'); ok := false;
  exception when others then ok := sqlerrm = 'trivia_no_disponible'; end;
  assert ok, 'trivial apagado por defecto';
  perform public.carta_panel('bar-extras', 'admin-e', 'extras', '{"trivia":true}'::jsonb);
  assert (public.carta_info('bar-extras', mesa1)->>'trivia')::boolean, 'trivial activado';
  assert public.carta_panel('bar-extras', 'admin-e')->>'wifi_red' = 'BarExtras', 'activar el trivial no borra la WiFi';
  begin perform public.carta_trivia(mesa1, 'empezar', '{"nombre":"   "}'::jsonb); ok := false;
  exception when others then ok := sqlerrm = 'nombre_no_valido'; end;
  assert ok, 'trivial: hace falta un nombre';
  begin perform public.carta_trivia(mesa1, 'empezar', '{"nombre":"<b>x</b>"}'::jsonb); ok := false;
  exception when others then ok := sqlerrm = 'nombre_no_valido'; end;
  assert ok, 'trivial: nombre sin etiquetas';
  raise notice 'extras (anon) ok';
end $$;
reset role;

-- Partida completa (como superusuario solo para leer las respuestas buenas, que el navegador nunca ve).
do $$
declare
  v jsonb; mesa1 text; ok boolean;
begin
  mesa1 := (select x->>'codigo' from jsonb_array_elements(public.carta_admin('bar-extras', 'admin-e')->'mesas') x where x->>'nombre' = 'Mesa 1');
  v := public.carta_trivia(mesa1, 'empezar', '{"nombre":"  Paco   Pérez "}'::jsonb);
  assert jsonb_array_length(v->'preguntas') = 10 and v->'preguntas'->0->'correcta' is null
         and jsonb_array_length(v->'preguntas'->0->'opciones') = 4, '10 preguntas sin la respuesta';
  declare
    partida text := v->>'partida';
    resp jsonb;
  begin
    -- acierta todas: las respuestas buenas solo las sabe la base de datos
    select jsonb_agg(q.correcta order by o.n) into resp
      from carta.trivia_partidas t, unnest(t.preguntas) with ordinality o(pid, n) join carta.trivia_preguntas q on q.id = o.pid
     where t.id = partida::uuid;
    v := public.carta_trivia(mesa1, 'terminar', jsonb_build_object('partida', partida, 'respuestas', resp));
    assert (v->>'puntos')::int = 10 and jsonb_array_length(v->'correctas') = 10, 'el servidor corrige: 10/10';
    assert v->'ranking'->0->>'nombre' = 'Paco Pérez', 'sale en el ranking de hoy con el nombre limpio';
    begin perform public.carta_trivia(mesa1, 'terminar', jsonb_build_object('partida', partida, 'respuestas', resp)); ok := false;
    exception when others then ok := sqlerrm = 'partida_no_valida'; end;
    assert ok, 'una partida no se puede terminar dos veces';
  end;
  v := public.carta_trivia(mesa1, 'empezar', '{"nombre":"Ana"}'::jsonb);
  v := public.carta_trivia(mesa1, 'terminar', jsonb_build_object('partida', v->>'partida', 'respuestas', '[]'::jsonb));
  assert (v->>'puntos')::int = 0 and jsonb_array_length(v->'ranking') = 2 and v->'ranking'->1->>'nombre' = 'Ana', 'en blanco: 0 puntos, segunda';
  assert jsonb_array_length(public.carta_panel('bar-extras', 'cocina-e')->'trivia_top') = 2, 'el panel ve el top del día';
  raise notice 'TODAS LAS PRUEBAS DE EXTRAS OK';
end $$;
