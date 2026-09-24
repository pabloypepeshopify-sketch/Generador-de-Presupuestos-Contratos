'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import type { Product } from '@/lib/products';
import { MAX_QTY, discountFor, eur, lineTotal, unitPrice } from '@/lib/pricing';
import { useCart } from '@/components/cart/CartProvider';
import { TierTable } from '@/components/TierTable';

/** Selector de cantidad con precio en vivo + añadir al carrito. */
export function ProductBuy({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const { add } = useCart();
  const off = discountFor(qty);
  const set = (q: number) => setQty(Math.max(1, Math.min(MAX_QTY, q)));

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <p className="font-display text-5xl tabular-nums">{eur(unitPrice(product.price, qty))}</p>
        <p className="pb-2 text-sm text-ink-soft">
          /ud · IVA incl.
          {off > 0 && <span className="ml-2 rounded-full bg-brand-violet/20 px-2 py-0.5 font-semibold text-white">−{Math.round(off * 100)} %</span>}
        </p>
      </div>

      <TierTable base={product.price} qty={qty} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex items-center justify-between rounded-full border border-ink-line sm:justify-start">
          <button
            onClick={() => set(qty - 1)}
            disabled={qty <= 1}
            className="flex h-12 w-12 items-center justify-center text-ink-soft transition hover:text-white disabled:opacity-30"
            aria-label="Quitar una unidad"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_QTY}
            value={qty}
            onChange={(e) => set(Number(e.target.value) || 1)}
            className="w-14 bg-transparent text-center text-lg tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Cantidad"
          />
          <button
            onClick={() => set(qty + 1)}
            className="flex h-12 w-12 items-center justify-center text-ink-soft transition hover:text-white"
            aria-label="Añadir una unidad"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => add(product.slug, qty)}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3.5 font-semibold text-white shadow-glow transition hover:brightness-110"
        >
          <ShoppingBag className="h-4 w-4" /> Añadir {qty > 1 ? `${qty} uds · ${eur(lineTotal(product.price, qty))}` : 'al carrito'}
        </button>
      </div>
    </div>
  );
}
