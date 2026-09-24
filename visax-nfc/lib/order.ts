import { productBySlug } from './products';
import { discountFor, eur, lineTotal, shippingFor, unitPrice } from './pricing';
import { site } from './site.config';

export type CartItem = { slug: string; qty: number };

export function cartTotals(items: CartItem[]) {
  const lines = items
    .map((i) => {
      const p = productBySlug(i.slug);
      if (!p) return null;
      return {
        product: p,
        qty: i.qty,
        unit: unitPrice(p.price, i.qty),
        total: lineTotal(p.price, i.qty),
        off: discountFor(i.qty),
      };
    })
    .filter((l): l is NonNullable<typeof l> => !!l);
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const shipping = shippingFor(subtotal);
  return { lines, subtotal, shipping, total: subtotal + shipping };
}

/** Pedido por WhatsApp (mientras el pago con tarjeta no esté activo). */
export function whatsappOrderUrl(items: CartItem[]) {
  const { lines, subtotal, shipping, total } = cartTotals(items);
  const needsReview = lines.some((l) => l.product.linkKind === 'review');
  const needsMenu = lines.some((l) => l.product.linkKind === 'menu');
  const text = [
    'Hola, quiero hacer este pedido en VISAX NFC:',
    ...lines.map(
      (l) =>
        `• ${l.qty} × ${l.product.shortName} (${eur(l.unit)}/ud${l.off ? `, −${Math.round(l.off * 100)} %` : ''}) = ${eur(l.total)}`,
    ),
    `Subtotal: ${eur(subtotal)}`,
    `Envío: ${shipping ? eur(shipping) : 'gratis'}`,
    `Total: ${eur(total)}`,
    '',
    'Nombre del negocio: ',
    ...(needsReview ? ['Enlace de reseñas de Google (si no lo tengo, buscadlo vosotros): '] : []),
    ...(needsMenu ? ['Enlace de mi carta: '] : []),
    'Dirección de envío: ',
  ].join('\n');
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}
