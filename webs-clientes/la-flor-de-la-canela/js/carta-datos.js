/*
  CARTA DE LA FLOR DE LA CANELA
  ─────────────────────────────
  Este es el único sitio donde se tocan platos y precios.

  Cada plato:
    n   nombre en español (es lo que se ve siempre)
    d   descripción en español
    en  descripción en inglés (la de la carta impresa cuando existe)
    t   precio tapa (null si no hay)
    r   precio ración (null si no hay)
    u   precio único (montaditos, burger…) — se pinta en lugar de tapa/ración
    a   alérgenos con la numeración de la carta (1…14). [] = la carta no
        declara ninguno. Sin la clave "a" = la carta no da datos → "consultar".
    foto  nombre de la foto en img/ (opcional)
    top   true = sale marcado como "de la casa"
    nota  texto corto extra (p. ej. "Bajo pedido")

  Transcrita de la carta impresa del local (noviembre 2026).
*/

window.ALERGENOS = {
  1:  { es: 'Gluten',            en: 'Gluten',      color: '#a08468' },
  2:  { es: 'Crustáceos',        en: 'Crustaceans', color: '#7a2e3b' },
  3:  { es: 'Huevo',             en: 'Egg',         color: '#8f8f8f' },
  4:  { es: 'Pescado',           en: 'Fish',        color: '#1e6fb0' },
  5:  { es: 'Cacahuetes',        en: 'Peanuts',     color: '#9c9184' },
  6:  { es: 'Soja',              en: 'Soy',         color: '#1f5b46' },
  7:  { es: 'Lácteos',           en: 'Dairy',       color: '#3f87d4' },
  8:  { es: 'Frutos de cáscara', en: 'Tree nuts',   color: '#5b5b5b' },
  9:  { es: 'Apio',              en: 'Celery',      color: '#7d9a3f' },
  10: { es: 'Mostaza',           en: 'Mustard',     color: '#5f9a3a' },
  11: { es: 'Sésamo',            en: 'Sesame',      color: '#253244' },
  12: { es: 'Sulfitos',          en: 'Sulphites',   color: '#1c3a5e' },
  13: { es: 'Altramuces',        en: 'Lupin',       color: '#7b2b3a' },
  14: { es: 'Moluscos',          en: 'Molluscs',    color: '#4f8f7c' }
};

window.CARTA = [
  {
    id: 'peru',
    es: 'Cocina peruana',
    en: 'Peruvian kitchen',
    lema: { es: 'Criolla y chifa, como en Lima', en: 'Creole & chifa, Lima-style' },
    secciones: [
      {
        id: 'pe-entradas', es: 'Entradas', en: 'Starters',
        platos: [
          { n: 'Papa a la huancaína', t: 5.90, r: null, a: [3, 7],
            d: 'Patata cocida bañada en crema de ají amarillo.',
            en: 'Boiled potato with creamy ají amarillo sauce.' },
          { n: 'Yuca frita', t: 5.50, r: 10.00, a: [],
            d: 'Bastones de yuca frita, crujientes por fuera y tiernos por dentro.',
            en: 'Deep-fried cassava sticks.' },
          { n: 'Causa limeña', t: 7.90, r: null, a: [3], foto: 'causa-limena', top: true,
            d: 'Capas de patata amarilla aliñada, rellenas de pollo, aguacate y mayonesa.',
            en: 'Seasoned potato layers filled with chicken, avocado and mayonnaise.' },
          { n: 'Papa rellena', t: 6.50, r: null, a: [1, 3],
            d: 'Puré de patata relleno de carne sazonada, huevo duro y especias.',
            en: 'Ground potato stuffed with seasoned meat, hard-boiled egg and spices.' },
          { n: 'Wantán frito', t: 7.50, r: 13.00, a: [1, 3, 6],
            d: 'Masa de trigo rellena de carne sazonada al estilo oriental.',
            en: 'Wheat wrappers filled with meat, seasoned Oriental-style.' },
          { n: 'Tequeños fritos', t: 7.50, r: 13.00, a: [1, 3, 7],
            d: 'Masa de trigo rellena de queso o de ají de gallina.',
            en: 'Wheat wrappers filled with cheese or ají de gallina.' }
        ]
      },
      {
        id: 'pe-frituras', es: 'Frituras', en: 'Fried',
        platos: [
          { n: 'Chicharrón de cerdo', t: 7.90, r: null, a: [],
            d: 'Trozos de cerdo frito con boniato frito y salsa criolla.',
            en: 'Fried pork chunks served with fried sweet potato and salsa criolla.' },
          { n: 'Brocheta de pollo', t: 7.50, r: null, a: [6, 12],
            d: 'Pollo marinado en ajíes peruanos.',
            en: 'Pieces of chicken marinated in Peruvian chili peppers.' },
          { n: 'Anticuchos de res', t: 7.90, r: null, a: [6, 12], top: true,
            d: 'Corazón de ternera marinado en salsa de anticucho.',
            en: 'Chunks of beef heart marinated in anticucho sauce.' },
          { n: 'Salchipapa', t: 6.00, r: null, a: [1],
            d: 'Salchicha y patatas fritas, el clásico callejero de Lima.',
            en: 'Sausage and fries, a Lima street classic.' }
        ]
      },
      {
        id: 'pe-guisos', es: 'Guisos', en: 'Stews',
        platos: [
          { n: 'Seco a la norteña', t: 8.90, r: 14.50, a: [12],
            d: 'Guiso de ternera servido con arroz y yuca.',
            en: 'Beef stew served with rice and cassava.' },
          { n: 'Pato en ají', t: 8.90, r: 14.50, a: [12],
            d: 'Pato guisado en crema de ají peruano, con arroz y guarnición.',
            en: 'Duck cooked in a Peruvian chili pepper cream sauce, served with rice and side dishes.' },
          { n: 'Ají de gallina', t: 8.50, r: 12.90, a: [1, 7, 12], top: true,
            d: 'Pollo deshilachado en crema de ají y queso, con arroz y patata cocida.',
            en: 'Shredded chicken in a creamy chili pepper and cheese sauce, served with rice and boiled potato.' }
        ]
      },
      {
        id: 'pe-wok', es: 'Al wok', en: 'From the wok',
        platos: [
          { n: 'Sopa García', t: 8.90, r: null, a: [1, 3, 6, 12],
            d: 'Caldo de pollo con trozos de carne, verduras, fideos y tiras de tortilla, con wantanes fritos.',
            en: 'Chicken broth with pieces of meat, vegetables, noodles and tortilla strips, served with fried wontons.' },
          { n: 'Arroz chaufa', t: 6.90, r: 13.50, a: [1, 3, 6],
            d: 'Arroz salteado chino-peruano con pollo o cerdo, huevo, cebolleta y soja.',
            en: 'Chinese-Peruvian style fried rice with chicken or pork, egg, scallions and soy sauce.' },
          { n: 'Lomo saltado', t: 6.90, r: 13.50, a: [1, 3, 6], foto: 'lomo-saltado', top: true,
            d: 'Solomillo salteado al wok con cebolla, tomate y ají, con patatas fritas.',
            en: 'Sautéed pieces of tenderloin with vegetables, served with french fries.' },
          { n: 'Tallarín saltado', t: 6.90, r: 13.50, a: [1, 3, 6],
            d: 'Tallarines salteados con carne, verduras y soja.',
            en: 'Stir-fried noodles with meat, vegetables and soy sauce.' },
          { n: 'Chancho con tamarindo', t: 8.90, r: 14.00, a: [1, 3, 6],
            d: 'Cerdo frito y salteado en salsa de tamarindo.',
            en: 'Pieces of pork fried and sautéed in tamarind sauce.' },
          { n: 'Tipakay', t: 8.90, r: 14.00, a: [1, 3, 6],
            d: 'Pollo frito y salteado en salsa de tamarindo.',
            en: 'Chicken pieces fried and sautéed in tamarind sauce.' },
          { n: 'Aeropuerto', t: null, r: 15.90, a: [1, 3, 6],
            d: 'Arroz chaufa y tallarín salteado en el mismo plato, al estilo oriental.',
            en: 'Chaufa rice and stir-fried noodles, Asian-style.' },
          { n: 'Lomo saltado con chaufa', t: null, r: 15.90, a: [1, 3, 6],
            d: 'Nuestro lomo saltado acompañado de arroz chaufa.',
            en: 'Our lomo saltado served with chaufa fried rice.' },
          { n: 'Chancho con tamarindo con chaufa', t: null, r: 15.90, a: [1, 3, 6],
            d: 'Cerdo en salsa de tamarindo acompañado de arroz chaufa.',
            en: 'Pork in tamarind sauce served with chaufa fried rice.' },
          { n: 'Tipakay con chaufa', t: null, r: 15.90, a: [1, 3, 6],
            d: 'Pollo en salsa de tamarindo acompañado de arroz chaufa.',
            en: 'Chicken in tamarind sauce served with chaufa fried rice.' }
        ]
      },
      {
        id: 'pe-mar', es: 'Del mar peruano', en: 'Peruvian seafood',
        platos: [
          { n: 'Ceviche', t: 7.50, r: 14.90, a: [4, 12], foto: 'ceviche', top: true,
            d: 'Pescado marinado en leche de tigre y lima, con cebolla morada, ají, cilantro, choclo y boniato.',
            en: 'Fish marinated in tiger’s milk and lime, served with red onion, chili pepper, cilantro, Andean corn and sweet potato.' },
          { n: 'Leche de tigre', t: null, r: 10.00, a: [4, 12],
            d: 'El jugo del ceviche, con chicharrón de pescado crujiente, yuca y trocitos de pescado.',
            en: 'Lime-infused ceviche broth, served with crispy fried fish, cassava and fish morsels.' },
          { n: 'Chicharrón de pescado', t: 6.90, r: 13.50, a: [1, 4], foto: 'ceviche-chicharron',
            d: 'Pescado marinado, empanizado y frito.',
            en: 'Pieces of marinated, breaded and fried fish.' },
          { n: 'Arroz con mariscos', t: null, r: 17.90, a: [1, 2, 4, 14], foto: 'arroz-mariscos',
            d: 'Arroz salteado con marisco fresco, ajíes y especias.',
            en: 'Stir-fried rice with fresh seafood, chili peppers and spices.' },
          { n: 'Parihuela', t: null, r: 23.50, a: [1, 2, 4, 12, 14],
            nota: { es: 'Bajo pedido', en: 'Upon request' },
            d: 'Caldo de pescado y marisco con ajíes, hierbas y especias; con marisco y un filete de dorada.',
            en: 'Fish and seafood broth with chili peppers, herbs and spices; served with seafood and a fillet of sea bream.' }
        ]
      }
    ]
  },
  {
    id: 'sevilla',
    es: 'Cocina española',
    en: 'Spanish kitchen',
    lema: { es: 'El tapeo sevillano de siempre', en: 'Classic Sevillian tapas' },
    secciones: [
      {
        id: 'es-entradas', es: 'Entradas', en: 'Starters',
        platos: [
          { n: 'Ensaladilla', t: 4.50, r: null,
            d: 'La ensaladilla de toda la vida.', en: 'Classic Spanish potato salad.' },
          { n: 'Pimientos asados con melva', t: 4.50, r: 11.50,
            d: 'Pimientos asados con melva.', en: 'Roasted peppers with melva (frigate tuna).' },
          { n: 'Berenjenas con miel de caña', t: 4.50, r: 11.50,
            d: 'Berenjena frita y crujiente con miel de caña.', en: 'Crispy fried aubergine with cane honey.' },
          { n: 'Tortillitas de camarones', t: 4.90, r: 11.50,
            d: 'Finas y crujientes, como en Cádiz.', en: 'Thin, crispy shrimp fritters, Cádiz-style.' },
          { n: 'Croquetas de rabo de toro', t: 4.50, r: 11.50,
            d: 'Croquetas cremosas de rabo de toro.', en: 'Creamy oxtail croquettes.' },
          { n: 'Huevos rotos con jamón', t: 4.90, r: 12.90,
            d: 'Patatas fritas, huevo y jamón.', en: 'Fried potatoes with broken eggs and cured ham.' },
          { n: 'Queso curado', t: 4.90, r: null,
            d: 'Queso curado en lascas.', en: 'Aged Spanish cheese.' },
          { n: 'Patatas con alioli', t: 4.50, r: 10.50,
            d: 'Patatas con alioli.', en: 'Potatoes with garlic aioli.' }
        ]
      },
      {
        id: 'es-carnes', es: 'Carnes', en: 'Meat',
        platos: [
          { n: 'Solomillo al whisky', t: 4.90, r: 13.90, top: true,
            d: 'El clásico sevillano: solomillo en salsa de ajo y whisky.', en: 'A Sevillian classic: tenderloin in garlic and whisky sauce.' },
          { n: 'Presa ibérica', t: 5.50, r: 13.90,
            d: 'Presa de cerdo ibérico a la plancha.', en: 'Grilled Iberian pork shoulder.' },
          { n: 'Secreto ibérico', t: 5.50, r: 13.90,
            d: 'Secreto de cerdo ibérico a la plancha.', en: 'Grilled Iberian pork “secreto”.' },
          { n: 'Lagrimitas de pollo', t: 4.90, r: 12.00,
            d: 'Tiras de pollo marinado y frito.', en: 'Marinated fried chicken strips.' },
          { n: 'Filete a la plancha', t: 4.50, r: null,
            d: 'Filete a la plancha.', en: 'Grilled fillet.' },
          { n: 'Hamburguesa de buey', t: 7.80, r: null,
            d: 'Hamburguesa de carne de buey.', en: 'Ox beef burger.' }
        ]
      },
      {
        id: 'es-mar', es: 'Del mar', en: 'From the sea',
        platos: [
          { n: 'Choco frito', t: 4.90, r: 12.90,
            d: 'Choco frito, como manda Andalucía.', en: 'Fried cuttlefish, Andalusian-style.' },
          { n: 'Cazón en adobo', t: 4.90, r: 12.90, top: true,
            d: 'Cazón adobado y frito.', en: 'Marinated fried dogfish.' },
          { n: 'Merluza a la romana', t: 4.90, r: 12.90,
            d: 'Merluza rebozada.', en: 'Battered hake.' }
        ]
      },
      {
        id: 'es-guisos', es: 'Guisos', en: 'Stews',
        platos: [
          { n: 'Cola de toro', t: 6.50, r: 13.00, top: true,
            d: 'Rabo de toro guisado a fuego lento.', en: 'Slow-braised oxtail stew.' },
          { n: 'Carrillada', t: 6.50, r: 13.00,
            d: 'Carrillada guisada, melosa.', en: 'Slow-cooked pork cheeks.' }
        ]
      },
      {
        id: 'es-montaditos', es: 'Montaditos', en: 'Montaditos',
        platos: [
          { n: 'Langostinos con alioli', u: 4.50,
            d: 'Langostinos con alioli en pan.', en: 'Prawns with aioli on bread.' },
          { n: 'Filete de pollo o cerdo', u: 4.50,
            d: 'Filete de pollo o de cerdo en pan.', en: 'Chicken or pork fillet on bread.' },
          { n: 'Serranito', u: 5.50, top: true,
            d: 'El montadito de Sevilla: filete, jamón serrano y pimiento frito.', en: 'Seville’s own sandwich: fillet, serrano ham and fried green pepper.' }
        ]
      }
    ]
  }
];
