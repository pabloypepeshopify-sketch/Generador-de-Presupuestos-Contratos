-- Restaurante de demostración "Bar La Demo" (slug: demo) para enseñar el producto.
-- Clave de cocina pública: "demo-cocina" (es una demo). La clave de admin se genera
-- aleatoria (sale en un NOTICE): guárdala. Re-ejecutable: solo rellena si la carta está vacía.
do $$
declare
  v      jsonb;
  r_id   uuid;
  c_tap  uuid; c_rac uuid; c_beb uuid; c_pos uuid;
begin
  if not exists (select 1 from carta.restaurantes where slug = 'demo') then
    v := carta._alta('Bar La Demo', 'demo', 8, null, 'demo-cocina');
    raise notice 'DEMO creado. clave_admin=%', v->>'clave_admin';
  end if;
  select id into r_id from carta.restaurantes where slug = 'demo';
  if exists (select 1 from carta.categorias where restaurante_id = r_id) then
    raise notice 'demo ya tiene carta';
    return;
  end if;

  update carta.restaurantes
     set mensaje = '¡Bienvenido! Pide desde el móvil y te lo llevamos a la mesa.', color = '#b45309'
   where id = r_id;
  insert into carta.mesas (restaurante_id, nombre, orden)
  select r_id, 'Terraza ' || i, 100 + i from generate_series(1, 4) i
  on conflict (restaurante_id, nombre) do nothing;

  insert into carta.categorias (restaurante_id, nombre, orden) values (r_id, 'Tapas', 1)    returning id into c_tap;
  insert into carta.categorias (restaurante_id, nombre, orden) values (r_id, 'Raciones', 2) returning id into c_rac;
  insert into carta.categorias (restaurante_id, nombre, orden) values (r_id, 'Bebidas', 3)  returning id into c_beb;
  insert into carta.categorias (restaurante_id, nombre, orden) values (r_id, 'Postres', 4)  returning id into c_pos;

  insert into carta.productos (restaurante_id, categoria_id, nombre, descripcion, precio, alergenos, orden) values
    (r_id, c_tap, 'Tapa de croquetas', '2 croquetas caseras de jamón ibérico', 3.00, '{gluten,lacteos,huevo}', 1),
    (r_id, c_tap, 'Pincho de tortilla', 'Tortilla de patatas jugosa, con o sin cebolla', 2.80, '{huevo}', 2),
    (r_id, c_tap, 'Tapa de ensaladilla', 'Ensaladilla rusa con ventresca', 3.20, '{huevo,pescado}', 3),
    (r_id, c_tap, 'Montadito de lomo', 'Lomo a la plancha con pimiento verde', 3.50, '{gluten}', 4),
    (r_id, c_rac, 'Ración de croquetas', '8 croquetas caseras de jamón ibérico', 9.50, '{gluten,lacteos,huevo}', 1),
    (r_id, c_rac, 'Patatas bravas', 'Con salsa brava de la casa y alioli', 6.50, '{huevo}', 2),
    (r_id, c_rac, 'Calamares a la romana', 'Con limón y alioli', 11.00, '{gluten,moluscos,huevo}', 3),
    (r_id, c_rac, 'Pimientos de Padrón', 'Unos pican y otros no', 7.00, '{}', 4),
    (r_id, c_rac, 'Gambas al ajillo', 'En cazuela de barro', 13.50, '{crustaceos}', 5),
    (r_id, c_beb, 'Caña', 'Cerveza de barril', 2.20, '{gluten}', 1),
    (r_id, c_beb, 'Tinto de verano', null, 3.00, '{sulfitos}', 2),
    (r_id, c_beb, 'Copa de vino tinto', 'Rioja crianza', 3.50, '{sulfitos}', 3),
    (r_id, c_beb, 'Refresco', 'Cola, naranja o limón', 2.50, '{}', 4),
    (r_id, c_beb, 'Agua mineral', '50 cl', 1.80, '{}', 5),
    (r_id, c_beb, 'Café', 'Solo, cortado o con leche', 1.60, '{lacteos}', 6),
    (r_id, c_pos, 'Tarta de queso', 'Casera, al horno', 5.00, '{lacteos,huevo,gluten}', 1),
    (r_id, c_pos, 'Flan de huevo', 'Con nata', 4.00, '{lacteos,huevo}', 2);
end $$;
