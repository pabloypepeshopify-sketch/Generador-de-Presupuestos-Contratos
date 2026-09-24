import { site } from './site.config';

/** Descuento por unidades del mismo producto (de mayor a menor). */
export const TIERS = [
  { min: 10, off: 0.2 },
  { min: 5, off: 0.15 },
  { min: 3, off: 0.1 },
] as const;

export const MAX_QTY = 99;

export function discountFor(qty: number) {
  return TIERS.find((t) => qty >= t.min)?.off ?? 0;
}

/** Precio por unidad en céntimos según la cantidad. */
export function unitPrice(base: number, qty: number) {
  return Math.round(base * (1 - discountFor(qty)));
}

export function lineTotal(base: number, qty: number) {
  return unitPrice(base, qty) * qty;
}

export function shippingFor(subtotal: number) {
  return subtotal === 0 || subtotal >= site.shipping.freeFrom ? 0 : site.shipping.cost;
}

const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
export const eur = (cents: number) => fmt.format(cents / 100);
