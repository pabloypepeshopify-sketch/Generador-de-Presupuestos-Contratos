import { technologies } from '@/lib/services';

// Alto de los logos: los que llevan nombre (ratio > 1) un poco más bajos que los símbolos,
// para que se vean del mismo "peso".
const WORD_H = 26;
const ICON_H = 32;

/** Cinta infinita con los logos de las herramientas que integramos (solo CSS). */
export function Marquee() {
  const items = [...technologies, ...technologies];
  return (
    <section
      id="tecnologias"
      className="relative overflow-hidden border-y border-ink-line py-8"
      aria-label="Herramientas que integramos"
    >
      <p className="container-x mb-7 text-center text-xs uppercase tracking-[0.3em] text-ink-faint">
        Integramos las herramientas que ya usas
      </p>
      <div className="marquee-paused relative">
        {/* Máscaras laterales */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bg to-transparent sm:w-40" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg to-transparent sm:w-40" />
        <ul className="marquee-track items-center" style={{ ['--marquee-duration' as string]: '36s' }}>
          {items.map((t, i) => {
            const h = t.ratio > 1 ? WORD_H : ICON_H;
            // La segunda vuelta es solo visual: los lectores de pantalla la saltan.
            const copy = i >= technologies.length;
            return (
              <li key={i} aria-hidden={copy || undefined} className="flex shrink-0 items-center pr-12 sm:pr-16">
                {/* <img> normal: logos pequeños ya en blanco, sin optimizar (next/image añade JS) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.logo}
                  alt={copy ? '' : t.name}
                  title={t.name}
                  width={Math.round(h * t.ratio)}
                  height={h}
                  loading="lazy"
                  decoding="async"
                  className="opacity-60 transition-opacity duration-300 hover:opacity-100"
                />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
