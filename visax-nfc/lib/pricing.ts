import { site } from './site.config';

/** Lo mínimo para calcular precios: precio base y tramos por cantidad (céntimos). */
export type Priced = { price: number; tiers?: { min: number; price: number }[] };

/** Máximo de unidades de un producto por pedido. */
export const MAX_QTY = 999;

/** Tramos ordenados de menos a más unidades, incluido el precio base (desde 1). */
export function tiersOf(p: Priced) {
  return [{ min: 1, price: p.price }, ...[...(p.tiers ?? [])].sort((a, b) => a.min - b.min)];
}

/** Precio por unidad en céntimos según la cantidad. */
export function unitPrice(p: Priced, qty: number) {
  return tiersOf(p).reduce((u, t) => (qty >= t.min ? t.price : u), p.price);
}

/** Descuento aplicado respecto al precio base (0–1). */
export function discountFor(p: Priced, qty: number) {
  return 1 - unitPrice(p, qty) / p.price;
}

export function lineTotal(p: Priced, qty: number) {
  return unitPrice(p, qty) * qty;
}

/** Siguiente tramo con mejor precio, si lo hay. */
export function nextTier(p: Priced, qty: number) {
  return tiersOf(p).find((t) => t.min > qty);
}

/** El mejor precio posible por unidad y desde cuántas unidades. */
export function bestTier(p: Priced) {
  const t = tiersOf(p);
  return t[t.length - 1];
}

export function shippingFor(subtotal: number) {
  return subtotal === 0 || subtotal >= site.shipping.freeFrom ? 0 : site.shipping.cost;
}

const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
export const eur = (cents: number) => fmt.format(cents / 100);

/** «12,50 €/ud desde 40 ud» para cada tramo con descuento. */
export function tierSummary(p: Priced) {
  return tiersOf(p)
    .slice(1)
    .map((t) => `${eur(t.price)}/ud desde ${t.min} ud`)
    .join(' · ');
}
