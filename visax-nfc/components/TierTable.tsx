import { TIERS, eur, unitPrice } from '@/lib/pricing';
import { cn } from '@/lib/utils';

/** Tabla de precio por unidad según la cantidad (resalta el tramo actual). */
export function TierTable({ base, qty }: { base: number; qty?: number }) {
  const rows = [{ min: 1, off: 0 }, ...[...TIERS].reverse()];
  return (
    <div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-ink-line text-center text-sm">
      {rows.map((r, i) => {
        const next = rows[i + 1];
        const active = qty !== undefined && qty >= r.min && (!next || qty < next.min);
        return (
          <div
            key={r.min}
            className={cn('border-ink-line px-2 py-3', i > 0 && 'border-l', active && 'bg-brand-violet/20')}
          >
            <p className="text-xs text-ink-soft">{r.min === 1 ? '1–2 ud' : `${r.min}+ ud`}</p>
            <p className="mt-1 font-semibold tabular-nums">{eur(unitPrice(base, r.min))}</p>
            <p className="text-[11px] text-brand-cyan">{r.off ? `−${Math.round(r.off * 100)} %` : ' '}</p>
          </div>
        );
      })}
    </div>
  );
}
