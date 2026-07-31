'use client';

import { technologies } from '@/lib/services';

/** Cinta infinita con las tecnologías que dominamos. */
export function Marquee() {
  const items = [...technologies, ...technologies];
  return (
    <section
      id="tecnologias"
      className="relative overflow-hidden border-y border-ink-line py-8"
      aria-label="Tecnologías que integramos"
    >
      <p className="container-x mb-6 text-center text-xs uppercase tracking-[0.3em] text-ink-faint">
        Integramos las herramientas que ya usas
      </p>
      <div className="marquee-paused relative">
        {/* Máscaras laterales */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-bg to-transparent sm:w-40" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-bg to-transparent sm:w-40" />
        <div className="marquee-track gap-12" style={{ ['--marquee-duration' as string]: '38s' }}>
          {items.map((tech, i) => (
            <span
              key={i}
              className="flex shrink-0 items-center gap-3 whitespace-nowrap font-display text-2xl text-ink-soft transition-colors hover:text-white sm:text-3xl"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand-cyan to-brand-violet" />
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
