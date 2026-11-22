import { Sparkle } from 'lucide-react';

/** Cinta infinita de palabras (solo CSS). Se duplica la lista para que el bucle no tenga corte. */
export function Marquee({ items, duration = 40 }: { items: string[]; duration?: number }) {
  const lista = [...items, ...items];
  return (
    <div className="mask-x overflow-hidden" aria-hidden="true">
      <div className="marquee gap-10 py-5" style={{ '--marquee-duration': `${duration}s` } as React.CSSProperties}>
        {lista.map((t, i) => (
          <span key={i} className="flex shrink-0 items-center gap-10 whitespace-nowrap text-lg font-medium tracking-tight text-ink-soft/80 sm:text-xl">
            {t}
            <Sparkle className="h-4 w-4 text-brand-violet" />
          </span>
        ))}
      </div>
    </div>
  );
}
