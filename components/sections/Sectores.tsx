'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { Info, Zap } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { sectores, SECTORES_AVISO } from '@/content/sectores';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;
const DURACION = 7000; // ms que se muestra cada sector cuando avanza solo

/**
 * Problemas que resolvemos, por sector. Pestañas accesibles (flechas, Inicio, Fin)
 * que avanzan solas como «historias» hasta que la persona toca una.
 */
export function Sectores() {
  const [activo, setActivo] = useState(0);
  const [auto, setAuto] = useState(true);
  const [pausa, setPausa] = useState(false);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const caja = useRef<HTMLDivElement>(null);
  const visible = useInView(caja, { amount: 0.4 });
  const s = sectores[activo];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setAuto(false);
  }, []);

  useEffect(() => {
    if (!auto || pausa || !visible) return;
    const t = setTimeout(() => setActivo((a) => (a + 1) % sectores.length), DURACION);
    return () => clearTimeout(t);
  }, [activo, auto, pausa, visible]);

  const elegir = (i: number) => {
    setAuto(false);
    setActivo(i);
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = sectores.length - 1;
    const next =
      e.key === 'ArrowDown' || e.key === 'ArrowRight' ? (activo === last ? 0 : activo + 1)
      : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? (activo === 0 ? last : activo - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    elegir(next);
    tabs.current[next]?.focus();
  };

  return (
    <section id="sectores" aria-labelledby="sectores-title" className="section relative overflow-hidden">
      <div
        className="pointer-events-none absolute -left-40 top-1/3 -z-10 h-[50vh] w-[50vh] rounded-full bg-[radial-gradient(closest-side,rgba(51,198,244,0.14),transparent)]"
        aria-hidden="true"
      />
      <div className="container-x">
        <SectionHeading
          id="sectores-title"
          eyebrow="Sectores"
          title="Seguro que alguno"
          accent="te suena."
          intro="Ejemplos de lo que se puede hacer en cada sector. En tu empresa partiremos de cómo trabajáis vosotros."
        />

        <div
          ref={caja}
          onMouseEnter={() => setPausa(true)}
          onMouseLeave={() => setPausa(false)}
          onFocusCapture={() => setPausa(true)}
          onBlurCapture={() => setPausa(false)}
          className="mt-12 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]"
        >
          {/* Pestañas */}
          <div role="tablist" aria-label="Sectores" aria-orientation="vertical" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
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
                  onClick={() => elegir(i)}
                  onKeyDown={onKey}
                  className={cn(
                    'relative flex shrink-0 items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-left transition lg:px-5 lg:py-4',
                    sel ? 'border-white/15 bg-white/[0.06]' : 'border-transparent text-ink-soft hover:bg-white/[0.03] hover:text-ink',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition',
                      sel ? 'bg-brand text-white shadow-glow' : 'bg-white/[0.05]',
                    )}
                  >
                    <sec.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="whitespace-nowrap text-sm font-semibold sm:text-base">{sec.name}</span>
                  <span className="ml-auto hidden font-mono text-xs text-ink-faint lg:inline">0{i + 1}</span>
                  {/* Barra de tiempo del avance automático */}
                  {sel && auto && (
                    <motion.span
                      key={`bar-${activo}-${pausa}`}
                      className="absolute bottom-0 left-0 h-[2px] bg-brand"
                      initial={{ width: '0%' }}
                      animate={{ width: pausa || !visible ? '0%' : '100%' }}
                      transition={{ duration: pausa || !visible ? 0 : DURACION / 1000, ease: 'linear' }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Panel */}
          <div className="relative min-h-[420px] overflow-hidden rounded-card-lg border border-ink-line bg-bg-soft/70 sm:min-h-[380px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={s.id}
                role="tabpanel"
                id={`panel-${s.id}`}
                aria-labelledby={`tab-${s.id}`}
                tabIndex={0}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="relative flex h-full flex-col p-6 outline-none sm:p-8"
              >
                <s.icon className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 text-white/[0.03]" aria-hidden="true" />
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="eyebrow"
                >
                  {s.name}
                </motion.p>
                <motion.h3
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
                  className="mt-3 max-w-lg text-2xl leading-snug tracking-tight sm:text-3xl"
                >
                  {s.pain}
                </motion.h3>
                <ul className="mt-7 flex flex-col gap-3">
                  {s.examples.map((ex, i) => (
                    <motion.li
                      key={ex}
                      initial={{ opacity: 0, x: 24, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 0.6, ease: EASE, delay: 0.25 + i * 0.18 }}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient-soft text-accent">
                        <Zap className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="text-[15px] leading-relaxed">{ex}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <p className="mt-5 flex items-start gap-2 text-sm text-ink-faint">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {SECTORES_AVISO}
        </p>
      </div>
    </section>
  );
}
