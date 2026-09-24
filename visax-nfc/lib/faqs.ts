import { TIERS, eur } from './pricing';
import { site } from './site.config';

/** Preguntas frecuentes (web + datos estructurados FAQPage). */
export const faqs = [
  {
    q: '¿Funciona con iPhone?',
    a: 'Sí. Los iPhone a partir del XS leen NFC sin abrir ninguna app: basta con acercar la parte de arriba del móvil. En Android funciona con el NFC activado, que en la mayoría viene activado de serie.',
  },
  {
    q: '¿Necesita batería, wifi o alguna app?',
    a: 'No. El chip se alimenta del propio móvil al acercarlo. Solo el móvil de tu cliente necesita conexión para abrir la página.',
  },
  {
    q: '¿Qué enlace grabáis en el NFC?',
    a: 'El que nos digas al pagar: tu página de reseñas de Google en el expositor y la dirección de tu carta digital en la tarjeta. Si no lo tienes a mano, déjalo en blanco: lo buscamos nosotros y te lo confirmamos antes de enviar.',
  },
  {
    q: 'Si cambio mi carta, ¿tengo que comprar otra tarjeta?',
    a: 'No, si tu carta digital sigue en la misma dirección web: la tarjeta abrirá siempre la versión actual. Si cambias de dirección, escríbenos.',
  },
  {
    q: '¿Cuánto tarda en llegar?',
    a: `Lo preparamos y programamos en ${site.shipping.prep} y el envío tarda ${site.shipping.eta} (${site.shipping.zone}). El envío cuesta ${eur(site.shipping.cost)} y es gratis a partir de ${eur(site.shipping.freeFrom)}.`,
  },
  {
    q: '¿Hay descuento si compro varios?',
    a: `Sí, automático por unidades del mismo producto: ${[...TIERS]
      .reverse()
      .map((t) => `${t.min} o más, −${Math.round(t.off * 100)} %`)
      .join('; ')}. Para pedidos más grandes o varios locales, escríbenos.`,
  },
  {
    q: '¿Puedo pedir factura?',
    a: 'Sí. Al pagar puedes añadir el NIF/CIF de tu empresa y te enviamos la factura.',
  },
  {
    q: '¿Y si llega mal o no funciona?',
    a: 'Lo probamos antes de enviarlo. Si aun así llega dañado o no funciona, escríbenos y lo solucionamos; además tienes la garantía legal de conformidad.',
  },
];
