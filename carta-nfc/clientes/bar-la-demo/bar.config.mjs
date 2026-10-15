// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURACIÓN DE LA WEB DE UN BAR  ·  el único archivo que hay que tocar
// ─────────────────────────────────────────────────────────────────────────────
//  (Bar de ejemplo: usa el restaurante "demo". Las fotos son de relleno.)
//  2. Rellena este archivo y mete las fotos en  clientes/<slug>/img/
//  3. Genera la web:        node herramientas/web-bar.mjs clientes/<slug>
//     → crea clientes/<slug>/publicar/ (lo que se sube a Netlify)
//
//  NO pongas aquí claves de cocina/admin: la web no las necesita.
//  Las fotos pueden ser archivos de img/ ("img/terraza.jpg") o URLs https://.
// ─────────────────────────────────────────────────────────────────────────────

export default {
  // Identificador del bar en el sistema de pedidos (el mismo que en alta.html).
  slug: 'demo',

  // Dirección final de la web (la de Netlify o su dominio). Sin barra al final.
  url: 'https://bar-la-demo.netlify.app',

  nombre: 'Bar La Demo',
  // Una frase corta bajo el nombre, en la portada.
  lema: 'Tapas de la casa y manzanilla fría a dos pasos del río.',
  // Tipo de local para Google: Restaurant, BarOrPub, CafeOrCoffeeShop, Bakery…
  tipoGoogle: 'BarOrPub',
  cocina: ['Tapas', 'Andaluza', 'Pescado'],
  // € (barato) · €€ · €€€
  precio: '€€',

  logo: 'img/logo.svg',         // cuadrado; SVG o PNG. Vacío = sin logo
  portada: 'img/portada.jpg',   // foto grande de arriba (horizontal, la mejor que tengan)

  // ── Colores ── (la herramienta avisa si un color se lee mal sobre otro)
  colores: {
    fondo: '#F6F7F4',     // fondo general de la página
    texto: '#17201B',     // texto principal
    oscuro: '#1E4535',    // cabecera, pie y barra del pedido
    acento: '#E3A63B',    // botones y detalles
    textoAcento: '#17201B', // texto encima de los botones de acento
  },

  // ── Fuentes ── (nombres de Google Fonts). Deja google:false para usar las del sistema.
  fuentes: { titulos: 'Young Serif', texto: 'Figtree', google: true },

  // ── Textos ──
  sobre: [
    'Somos un bar de barrio con la cocina abierta desde 1987. Guisos de la abuela, pescado de la lonja de la mañana y la manzanilla siempre en su punto.',
    'Ven a la barra o siéntate en la terraza: aquí pides desde tu mesa con el móvil y te lo traemos enseguida.',
  ],
  fotos: [ // galería: entre 3 y 8, con una descripción corta (sirve a quien no ve la foto)
    { src: 'img/foto-1.jpg', alt: 'Barra del bar con tapas recién servidas' },
    { src: 'img/foto-2.jpg', alt: 'Terraza al atardecer' },
    { src: 'img/foto-3.jpg', alt: 'Plato de langostinos' },
  ],
  destacados: [ // "lo que más se pide" (opcional): 3 platos con foto
    { nombre: 'Tortilla de camarones', texto: 'Fina y crujiente, como se hace aquí.', foto: 'img/foto-3.jpg' },
    { nombre: 'Croquetas de puchero', texto: 'Cremosas, de la receta de siempre.', foto: 'img/foto-1.jpg' },
    { nombre: 'Manzanilla en rama', texto: 'Fría, de bodega de Sanlúcar.', foto: 'img/foto-2.jpg' },
  ],

  // ── Horario ── 'HH:MM-HH:MM'; varios tramos separados por coma; '' = cerrado.
  // Si cierra pasada la medianoche, pon la hora tal cual: '20:00-01:30'.
  horario: {
    lunes: '',
    martes: '12:30-16:30, 20:00-00:00',
    miercoles: '12:30-16:30, 20:00-00:00',
    jueves: '12:30-16:30, 20:00-00:00',
    viernes: '12:30-16:30, 20:00-01:30',
    sabado: '12:00-01:30',
    domingo: '12:00-17:00',
  },
  avisoHorario: 'Cerrado por descanso los lunes no festivos.', // opcional

  // ── Dónde estamos ──
  direccion: { calle: 'Calle Ejemplo, 1', cp: '11540', ciudad: 'Sanlúcar de Barrameda', provincia: 'Cádiz' },
  // Coordenadas (en Google Maps: botón derecho sobre el local → copiar). Mejoran el mapa y Google.
  geo: { lat: 36.7781, lng: -6.3557 },
  // Enlace de "Cómo llegar". Vacío = se crea solo con la dirección.
  mapaUrl: '',

  // ── Contacto ── (vacío = no se muestra)
  telefono: '+34 600 000 000',
  whatsapp: '+34 600 000 000',
  email: '',
  instagram: 'https://www.instagram.com/',
  facebook: '',

  // ── Reseñas ── copia 2-4 reseñas reales de Google (con el nombre como sale allí).
  resenas: {
    nota: 4.6, total: 312,
    url: 'https://www.google.com/maps', // enlace a sus reseñas en Google
    lista: [
      { autor: 'Lucía M.', texto: 'Las croquetas, de lo mejor de Sanlúcar. Pedir desde la mesa es comodísimo.' },
      { autor: 'Antonio R.', texto: 'Trato de diez y la manzanilla bien fría. Volveremos.' },
      { autor: 'Marta G.', texto: 'Terraza estupenda y te lo traen todo rapidísimo.' },
    ],
  },

  // ── Carta con pedidos (carta.html) ──
  carta: {
    // Pestañas opcionales: agrupan categorías. [] = una sola lista con todas.
    // Ejemplo: [{ nombre: 'Cocina', categorias: ['Tapas', 'Raciones'] }, { nombre: 'Bebidas', categorias: ['Vinos'] }]
    // (las categorías que no aparezcan van a la última pestaña)
    pestanas: [],
    // Foto encima de una categoría: { 'Nombre de la categoría': 'img/foto.jpg' }
    fotosCategorias: {},
    // Texto bajo el título de una categoría: { 'Burgers': '¿Carne extra? Pídelo en la nota del plato.' }
    notasCategorias: {},
    // Notas al final de la carta.
    notasFinales: [
      'Si tienes alguna alergia o intolerancia, díselo al camarero antes de pedir.',
      'Precios en euros, IVA incluido.',
    ],
    // Mostrar los alérgenos de cada plato (recomendado: es obligatorio informar de ellos).
    alergenos: true,
  },

  // ── Avisos legales ── TODO(gestoría): textos revisados por la gestoría.
  // El titular y su NIF NO van aquí (el repo es público): ponlos en
  //   clientes/<slug>/legal.local.mjs   (no se sube a git; ver legal.local.ejemplo.mjs)
  // Sin ese archivo, el aviso legal sale con "[pendiente]" y la herramienta avisa.
};
