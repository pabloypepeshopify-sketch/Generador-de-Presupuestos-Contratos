/**
 * Catálogo de VISAX NFC. Precios en céntimos, IVA incluido.
 * Lo usan la web y el servidor de pago (que recalcula siempre el precio).
 */

export type LinkKind = 'review' | 'menu';

export type Product = {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  price: number; // céntimos, IVA incluido
  image: string; // foto real del producto (sin fondo)
  face: string; // diseño frontal en alta resolución
  linkKind: LinkKind;
  bullets: string[];
  includes: string[];
};

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
];

export const productBySlug = (slug: string) => products.find((p) => p.slug === slug);
