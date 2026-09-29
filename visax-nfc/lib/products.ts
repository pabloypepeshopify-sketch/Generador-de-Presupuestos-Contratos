/**
 * Catálogo de VISAX NFC. Precios en céntimos, IVA incluido.
 * Lo usan la web y el servidor de pago (que recalcula siempre el precio).
 */

export type LinkKind = 'review' | 'menu' | 'order' | 'social' | 'waiter' | 'wifi';

/** Icono que se muestra mientras un producto no tiene foto real. */
export type ProductIcon = 'order' | 'social' | 'waiter' | 'wifi';

export type Product = {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  price: number; // céntimos, IVA incluido
  image?: string; // foto real del producto (sin fondo)
  face?: string; // diseño frontal en alta resolución
  icon?: ProductIcon;
  linkKind: LinkKind;
  bullets: string[];
  includes: string[];
  /** Aviso destacado en la ficha (servicio aparte, compatibilidad…). */
  notice?: { title: string; text: string; quote?: string };
};

/**
 * Dato que pedimos al pagar para programar cada tipo de NFC. Los tipos sin
 * campo (pedido en mesa, camarero, WiFi) los configuramos contigo después.
 */
export const LINK_FIELDS: Partial<Record<LinkKind, { key: string; label: string; ask: string }>> = {
  review: {
    key: 'enlace_resenas',
    label: 'Enlace de reseñas de Google (opcional)',
    ask: 'Enlace de reseñas de Google (si no lo tengo, buscadlo vosotros)',
  },
  menu: { key: 'enlace_carta', label: 'Enlace de tu carta digital (opcional)', ask: 'Enlace de mi carta' },
  social: { key: 'enlace_redes', label: 'Enlace de tus redes o de tus enlaces (opcional)', ask: 'Enlace de mis redes sociales' },
};
export const SETUP_LATER: LinkKind[] = ['order', 'waiter', 'wifi'];

export const products: Product[] = [
  {
    slug: 'expositor-resenas-google',
    name: 'Expositor NFC de reseñas Google',
    shortName: 'Expositor reseñas Google',
    tagline: 'Un toque con el móvil y tu cliente está en tu ficha, listo para dejar la reseña.',
    description:
      'Colócalo en la barra, en la mesa o junto a la caja. Tu cliente acerca el móvil y se abre directamente tu página para valorar tu negocio en Google: sin buscarte, sin apps y sin QR que enfocar. Te lo enviamos ya programado con tu enlace.',
    price: 2999,
    image: '/products/expositor-resenas-google.png',
    face: '/textures/stand-face.png',
    linkKind: 'review',
    bullets: [
      'Abre tu página de reseñas de Google con un toque',
      'Sin app, sin batería y sin QR',
      'Funciona con iPhone y Android con NFC',
      'Te llega programado con tu enlace',
    ],
    includes: ['Expositor de mesa con chip NFC', 'Programación con el enlace de tu negocio'],
  },
  {
    slug: 'tarjeta-nfc-menu',
    name: 'Tarjeta NFC "Toca para ver menú"',
    shortName: 'Tarjeta NFC menú',
    tagline: 'Pégala en la mesa y tu carta se abre en el móvil del cliente con un toque.',
    description:
      'Tarjeta adhesiva para mesas, barra o pared. El cliente acerca el móvil y ve tu carta digital al momento: se acabaron las cartas manchadas y reimprimir cada vez que cambias un precio. Te la enviamos programada con el enlace de tu carta.',
    price: 1499,
    image: '/products/tarjeta-nfc-menu.png',
    face: '/textures/menu-face.png',
    linkKind: 'menu',
    bullets: [
      'Abre tu carta digital con un toque',
      'Adhesiva: se pega en mesa, barra o pared',
      'Sin app ni batería',
      'Te llega programada con el enlace de tu carta',
    ],
    includes: ['Tarjeta NFC adhesiva', 'Programación con el enlace de tu carta'],
  },
  {
    slug: 'nfc-pedido-en-mesa',
    name: 'NFC de pedido en mesa',
    shortName: 'NFC pedido en mesa',
    tagline: 'Tu cliente ve la carta y pide desde su móvil. El pedido llega directo a cocina.',
    description:
      'El cliente acerca el móvil al NFC de la mesa, ve la carta y hace el pedido desde su teléfono. El pedido llega directo a cocina: menos espera para tu cliente, menos trabajo para el camarero y más rotación de mesas. Te lo enviamos programado para tu local.',
    price: 1500,
    icon: 'order',
    linkKind: 'order',
    bullets: [
      'Carta y pedido desde el móvil del cliente',
      'El pedido llega directo a cocina',
      'Menos espera y más rotación de mesas',
      'Sin app ni batería',
    ],
    includes: ['Tarjeta NFC adhesiva para la mesa', 'Programación con tu sistema de pedidos'],
    notice: {
      title: 'El sistema de pedidos se contrata aparte',
      text: 'Este precio es el del NFC. El sistema que recibe los pedidos en cocina lo ponemos nosotros y se contrata aparte: te hacemos presupuesto para tu local.',
      quote: 'Hola, quiero presupuesto del sistema de pedido en mesa para mi local.',
    },
  },
  {
    slug: 'nfc-redes-sociales',
    name: 'NFC de redes sociales',
    shortName: 'NFC redes sociales',
    tagline: 'Un toque y tu cliente está en tu Instagram o tu TikTok, listo para seguirte.',
    description:
      'El cliente toca el NFC y va directo a las redes sociales de tu local (Instagram, TikTok) o a una página con todos tus enlaces. Consigues seguidores reales: gente que ya está en tu local. Te lo enviamos programado con tu enlace.',
    price: 2500,
    icon: 'social',
    linkKind: 'social',
    bullets: [
      'Abre tu Instagram, tu TikTok o tu página de enlaces',
      'Seguidores reales de gente que ya está en tu local',
      'Sin app, sin batería y sin QR',
      'Te llega programado con tu enlace',
    ],
    includes: ['NFC con chip programado', 'Programación con el enlace de tus redes'],
  },
  {
    slug: 'nfc-llamar-camarero',
    name: 'NFC para llamar al camarero',
    shortName: 'NFC llamar al camarero',
    tagline: 'Un toque en la mesa y en tu tablet salta «Mesa 4 llama».',
    description:
      'El cliente toca el NFC de su mesa y salta un aviso en la tablet o pantalla del local: «Mesa 4 llama». El camarero acude directo, sin que el cliente tenga que levantar la mano ni esperar. Te lo enviamos programado para cada mesa.',
    price: 1500,
    icon: 'waiter',
    linkKind: 'waiter',
    bullets: [
      'Aviso al momento en la tablet o pantalla del local',
      'Cada NFC sabe de qué mesa es',
      'Sin levantar la mano ni esperar',
      'Sin app ni batería',
    ],
    includes: ['NFC para la mesa', 'Programación con tu mesa y tu sistema de avisos'],
    notice: {
      title: 'El sistema de avisos se contrata aparte',
      text: 'Este precio es el del NFC. El sistema que muestra los avisos en tu tablet o pantalla lo ponemos nosotros y se contrata aparte: te hacemos presupuesto para tu local.',
      quote: 'Hola, quiero presupuesto del sistema para llamar al camarero en mi local.',
    },
  },
  {
    slug: 'nfc-wifi',
    name: 'NFC de WiFi',
    shortName: 'NFC WiFi',
    tagline: 'Tu cliente toca y se conecta a tu WiFi, sin pedir ni teclear la contraseña.',
    description:
      'El cliente acerca el móvil y se conecta al WiFi del local al instante: nadie tiene que preguntar la contraseña ni teclearla. Te lo enviamos programado con tu red.',
    price: 1500,
    icon: 'wifi',
    linkKind: 'wifi',
    bullets: [
      'Android: se conecta con un toque',
      'iPhone: abre tu red con botón para copiar la contraseña',
      'Sin pedir ni teclear la contraseña',
      'Te llega programado con tu red',
    ],
    includes: ['NFC con chip programado', 'Programación con el nombre y la contraseña de tu WiFi'],
    notice: {
      title: 'En iPhone, con un paso más',
      text: 'Apple no deja conectarse a un WiFi desde un NFC. En iPhone se abre una página con el nombre de tu red y un botón para copiar la contraseña; en Android se conecta solo.',
    },
  },
];

export const productBySlug = (slug: string) => products.find((p) => p.slug === slug);

/** «NFC WiFi y NFC llamar al camarero»: productos del pedido que configuramos después. */
export function setupLaterNames(list: Product[]) {
  const names = list.filter((p) => SETUP_LATER.includes(p.linkKind)).map((p) => p.shortName);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}` : names[0] ?? '';
}
