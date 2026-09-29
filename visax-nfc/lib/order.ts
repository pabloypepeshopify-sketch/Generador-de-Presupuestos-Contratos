import { LINK_FIELDS, productBySlug, setupLaterNames } from './products';
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
  const kinds = new Set(lines.map((l) => l.product.linkKind));
  const later = setupLaterNames(lines.map((l) => l.product));
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
    ...[...kinds].flatMap((k) => (LINK_FIELDS[k] ? [`${LINK_FIELDS[k]!.ask}: `] : [])),
    ...(later ? [`${later}: os paso los datos para configurarlo`] : []),
    'Dirección de envío: ',
  ].join('\n');
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}
