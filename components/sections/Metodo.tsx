'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SpotlightGroup } from '@/components/ui/Spotlight';
import { Button } from '@/components/ui/Button';
import { ChatVisual, DevicesVisual, FlowVisual, GrowthVisual } from '@/components/visuals/Capacidades';
import { PhaseRing } from '@/components/visuals/PhaseRing';
import { capacidades, diagnostico, fases } from '@/content/home';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

// Bento: visual y tamaño de cada capacidad (orden de content/home.ts)
const BENTO = [
  { visual: FlowVisual, span: 'lg:col-span-4' },
  { visual: ChatVisual, span: 'lg:col-span-2' },
  { visual: DevicesVisual, span: 'lg:col-span-2' },
  { visual: GrowthVisual, span: 'lg:col-span-4' },
];

const PASOS = [{ ...diagnostico, icon: ClipboardCheck }, ...fases];

/** Qué hacemos (bento animado) y cómo trabajamos (método guiado por el scroll), juntos. */
export function Metodo() {
  const [activo, setActivo] = useState(0);
  const pasosRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: pasosRef, offset: ['start 70%', 'end 60%'] });
  const linea = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  // El paso activo es el que cruza el centro de la pantalla
  useEffect(() => {
    const items = pasosRef.current?.querySelectorAll<HTMLElement>('[data-paso]');
    if (!items?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActivo(Number((e.target as HTMLElement).dataset.paso));
        });
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="que-hacemos" aria-labelledby="que-hacemos-title" className="section">
      <div className="container-x">
        {/* ── Qué hacemos ── */}
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <SectionHeading
            id="que-hacemos-title"
            eyebrow="Qué hacemos y cómo trabajamos"
            title="Cuatro áreas de trabajo."
            accent="Un objetivo: que tu empresa funcione mejor."
          />
          <p className="max-w-md text-base leading-relaxed text-ink-soft lg:pb-3">
            No eliges nada de un catálogo: analizamos tu negocio y combinamos lo que necesita en cada momento.
          </p>
        </div>

        <SpotlightGroup className="mt-12 grid gap-4 lg:grid-cols-6">
          {capacidades.map((c, i) => {
            const B = BENTO[i];
            return (
              <motion.article
                key={c.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, ease: EASE, delay: (i % 2) * 0.1 }}
                className={cn('spot group relative flex flex-col overflow-hidden rounded-card-lg border border-ink-line bg-bg-soft/70 p-6 sm:p-7', B.span)}
              >
                <div className="relative h-36 sm:h-40">
                  <B.visual />
                </div>
                <div className="mt-6 flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient-soft text-accent">
                    <c.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-xl tracking-tight sm:text-2xl">{c.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft sm:text-[15px]">{c.text}</p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </SpotlightGroup>

        {/* ── Cómo trabajamos ── */}
        <div id="como-trabajamos" className="scroll-mt-24 pt-28 sm:pt-36">
          <SectionHeading
            eyebrow="Cómo trabajamos"
            title="Un método claro."
            accent="Una mejora que no se detiene."
            intro="Empezamos conociendo tu empresa y, a partir de ahí, trabajamos en un ciclo que se repite cada mes."
            size="md"
          />

          <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="hidden lg:block">
              <div className="sticky top-28">
                <PhaseRing active={activo} />
              </div>
            </div>

            <ol ref={pasosRef} className="relative flex flex-col gap-5 lg:gap-0">
              {/* Línea de progreso (se llena con el scroll) */}
              <span className="absolute bottom-6 left-[23px] top-6 w-px bg-white/10 lg:left-[27px]" aria-hidden="true" />
              <motion.span
                style={{ scaleY: linea }}
                className="absolute bottom-6 left-[23px] top-6 w-px origin-top bg-gradient-to-b from-brand-cyan via-brand-blue to-brand-violet lg:left-[27px]"
                aria-hidden="true"
              />
              {PASOS.map((p, i) => {
                const on = activo === i;
                return (
                  <li key={p.title} data-paso={i} className="relative flex gap-5 lg:min-h-[42vh] lg:items-center">
                    <span
                      className={cn(
                        'relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-all duration-500 lg:h-14 lg:w-14',
                        on ? 'border-transparent bg-brand text-white shadow-[0_0_30px_2px_rgba(63,125,251,0.55)]' : 'border-white/10 bg-bg-raise text-ink-faint',
                      )}
                    >
                      <p.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className={cn('pb-2 transition-opacity duration-500 lg:opacity-40', on && 'lg:opacity-100')}>
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
                        {i === 0 ? 'Paso 0 · La puerta de entrada' : `Fase ${i}`}
                      </p>
                      <h3 className="mt-1.5 text-2xl tracking-tight sm:text-3xl">{p.title}</h3>
                      <p className="mt-2 max-w-md leading-relaxed text-ink-soft">{p.text}</p>
                      {i === 0 && (
                        <Button href="/#diagnostico" variant="secondary" size="sm" className="mt-5">
                          Solicitar el diagnóstico <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
