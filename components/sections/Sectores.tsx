'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { sectores, SECTORES_AVISO } from '@/content/sectores';
import { cn } from '@/lib/utils';

/** Problemas que resolvemos, por sector. Sección clara para dar ritmo a la página. */
export function Sectores() {
  const [activo, setActivo] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const s = sectores[activo];

  // Flechas, Inicio y Fin para moverse entre pestañas (patrón WAI-ARIA de tabs)
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = sectores.length - 1;
    const next =
      e.key === 'ArrowRight' ? (activo === last ? 0 : activo + 1)
      : e.key === 'ArrowLeft' ? (activo === 0 ? last : activo - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setActivo(next);
    tabs.current[next]?.focus();
  };

  return (
    <section id="sectores" aria-labelledby="sectores-title" className="theme-light section">
      <div className="container-x">
        <SectionHeading
          id="sectores-title"
          eyebrow="Problemas que resolvemos"
          title={
            <>
              Seguro que alguno
              <br />
              <span className="text-gradient">te suena.</span>
            </>
          }
          intro="Algunos ejemplos de lo que se puede hacer según el sector. En tu empresa partiremos de cómo trabajáis vosotros."
        />

        <div
          role="tablist"
          aria-label="Sectores"
          className="no-scrollbar -mx-4 mt-10 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {sectores.map((sec, i) => {
            const sel = i === activo;
            return (
              <button
                key={sec.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                role="tab"
                id={`tab-${sec.id}`}
                aria-selected={sel}
                aria-controls={`panel-${sec.id}`}
                tabIndex={sel ? 0 : -1}
                onClick={() => setActivo(i)}
                onKeyDown={onKey}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition',
                  sel
                    ? 'border-transparent bg-ink text-bg shadow-card'
                    : 'border-ink-line bg-bg-soft text-ink-soft hover:border-ink-strong hover:text-ink',
                )}
              >
                <sec.icon className="h-4 w-4" aria-hidden="true" />
                {sec.name}
              </button>
            );
          })}
        </div>

        <div className="mt-6 min-h-[340px] sm:min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={s.id}
              role="tabpanel"
              id={`panel-${s.id}`}
              aria-labelledby={`tab-${s.id}`}
              tabIndex={0}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="grid gap-6 rounded-card-lg border border-ink-line bg-bg-soft p-6 shadow-card sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10"
            >
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient-soft text-accent">
                  <s.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-2xl tracking-tight sm:text-3xl">{s.name}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">{s.pain}</p>
              </div>
              <div>
                <p className="eyebrow">Lo que se puede hacer</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {s.examples.map((ex) => (
                    <li key={ex} className="flex items-start gap-3 rounded-card border border-ink-line bg-bg p-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                      <span className="leading-relaxed">{ex}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-5 flex items-start gap-2 text-sm text-ink-faint">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {SECTORES_AVISO} ¿Tu sector no aparece? El método es el mismo: partimos de cómo funciona tu empresa.
        </p>
      </div>
    </section>
  );
}
