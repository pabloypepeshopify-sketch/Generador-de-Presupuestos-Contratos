'use client';

import { useEffect, useRef, useState } from 'react';
import type Lenis from 'lenis';
import { ArrowRight } from 'lucide-react';
import { services, customService, type Service } from '@/lib/services';
import { XP_EVENTS, sForCard } from '@/lib/experience';
import { cn } from '@/lib/utils';

/**
 * Recorrido 3D de servicios: una pista alta con una capa fija (sticky).
 * Al hacer scroll la cámara vuela entre las 9 tarjetas de cristal
 * (<Experience />); aquí va la interfaz HTML accesible: índice de servicios
 * (como el menú del vídeo de referencia), "Ver detalle" de la tarjeta enfocada
 * y el acceso a la automatización a medida.
 */
export function ServicesTrack({ onOpen }: { onOpen: (s: Service) => void }) {
  const [active, setActive] = useState(-1);
  const chips = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const on = (e: Event) => setActive((e as CustomEvent<number>).detail);
    window.addEventListener(XP_EVENTS.ACTIVE_CARD, on);
    return () => window.removeEventListener(XP_EVENTS.ACTIVE_CARD, on);
  }, []);

  // Móvil: la píldora activa se centra en su fila (sin mover la página)
  useEffect(() => {
    const row = chips.current;
    const el = active >= 0 ? (row?.children[active] as HTMLElement | undefined) : undefined;
    if (row && el) row.scrollTo({ left: el.offsetLeft - row.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [active]);

  const goTo = (i: number) => {
    const track = document.getElementById('servicios-track');
    if (!track) return;
    const start = track.getBoundingClientRect().top + window.scrollY;
    const end = start + track.offsetHeight - window.innerHeight;
    const y = start + sForCard(i) * (end - start);
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    if (lenis) lenis.scrollTo(y, { duration: 1.3 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const current = active >= 0 ? services[active] : null;

  return (
    <div
      id="servicios-track"
      className="services-3d relative"
      style={{ height: `calc(100svh + ${services.length} * 55svh)` }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col justify-end pb-6 pt-24 sm:pb-10">
        {/* Degradado para que la interfaz se lea sobre las partículas */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-bg via-bg/70 to-transparent" />

        <div className="container-x relative flex items-end justify-between gap-10">
          <nav aria-label="Servicios" className="hidden max-w-sm lg:block">
            <p className="eyebrow mb-4">¿Qué quieres automatizar?</p>
            <ul className="flex flex-col gap-1">
              {services.map((s, i) => (
                <li key={s.slug}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === active ? 'true' : undefined}
                    className={cn(
                      'flex items-center gap-3 py-1 text-left text-[13px] font-medium uppercase tracking-[0.14em] transition-colors duration-300',
                      i === active ? 'text-white' : 'text-ink-soft hover:text-white',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'transition-transform duration-300',
                        i === active ? 'translate-x-1 text-brand-cyan' : 'text-ink-faint',
                      )}
                    >
                      →
                    </span>
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-1 flex-col items-center gap-4 lg:flex-none lg:items-end">
            <div aria-live="polite" className="flex min-h-[48px] items-center">
              {current ? (
                <button
                  type="button"
                  onClick={() => onOpen(current)}
                  className="glass inline-flex items-center gap-2 rounded-full border border-brand-violet/40 px-6 py-3 text-sm font-semibold text-white shadow-glow-violet transition hover:border-brand-violet"
                >
                  Ver detalle: {current.title}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <p className="text-xs uppercase tracking-[0.3em] text-ink-soft">Sigue bajando ↓</p>
              )}
            </div>
            <a href="#contacto" className="text-sm text-ink-soft transition hover:text-white">
              {customService.title} <span className="text-white">{customService.short} →</span>
            </a>
          </div>
        </div>

        {/* Móvil / tablet: índice como fila de píldoras */}
        <nav aria-label="Servicios" className="relative mt-5 lg:hidden">
          <ul ref={chips} className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {services.map((s, i) => (
              <li key={s.slug} className="shrink-0">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === active ? 'true' : undefined}
                  className={cn(
                    'rounded-full border px-4 py-2 text-xs font-medium transition-colors duration-300',
                    i === active
                      ? 'border-brand-violet/60 bg-brand-violet/20 text-white'
                      : 'border-ink-line bg-bg/60 text-ink-soft',
                  )}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Contenido completo para lectores de pantalla */}
      <ul className="sr-only">
        {services.map((s) => (
          <li key={s.slug}>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
            <p>{s.result}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
