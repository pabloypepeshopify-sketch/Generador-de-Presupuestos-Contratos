import type { Product } from '@/lib/products';
import { eur, tiersOf } from '@/lib/pricing';
import { cn } from '@/lib/utils';

/** Tabla de precio por unidad según la cantidad (resalta el tramo actual). */
export function TierTable({ product, qty }: { product: Product; qty?: number }) {
  const rows = tiersOf(product);
  if (rows.length < 2) return null;
  return (
    <div
      className="grid overflow-hidden rounded-2xl border border-ink-line text-center text-sm"
      style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}
    >
      {rows.map((r, i) => {
        const next = rows[i + 1];
        const active = qty !== undefined && qty >= r.min && (!next || qty < next.min);
        const off = Math.round((1 - r.price / product.price) * 100);
        return (
          <div
            key={r.min}
            className={cn('border-ink-line px-2 py-3', i > 0 && 'border-l', active && 'bg-brand-violet/20')}
          >
            <p className="text-xs text-ink-soft">{next ? (next.min - 1 === r.min ? `${r.min} ud` : `${r.min}–${next.min - 1} ud`) : `${r.min}+ ud`}</p>
            <p className="mt-1 font-semibold tabular-nums">{eur(r.price)}</p>
            <p className="text-[11px] text-brand-cyan">{off ? `−${off} %` : '\u00A0'}</p>
          </div>
        );
      })}
    </div>
  );
}
