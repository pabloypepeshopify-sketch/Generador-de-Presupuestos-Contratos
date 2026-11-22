'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ClipboardCheck } from 'lucide-react';
import { fases } from '@/content/home';
import { cn } from '@/lib/utils';

// Posición de cada fase en la órbita (en %, lienzo cuadrado).
const POS = [
  { left: '50%', top: '9%' },
  { left: '91%', top: '50%' },
  { left: '50%', top: '91%' },
  { left: '9%', top: '50%' },
];
const R = 41; // radio en % del lienzo
const CIRC = 2 * Math.PI * R;

/**
 * Anillo del método: el paso activo (0 = diagnóstico, 1-4 = fases) se ilumina
 * y el arco de progreso avanza. Lo controla el scroll desde Metodo.
 */
export function PhaseRing({ active }: { active: number }) {
  const progreso = Math.max(0, active) / fases.length;
  const paso = active === 0 ? { title: 'Diagnóstico inicial', icon: ClipboardCheck } : fases[active - 1];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]" aria-hidden="true">
      <div className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,rgba(63,125,251,0.22),transparent_65%)]" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
        <defs>
          <linearGradient id="pr-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgb(51 198 244)" />
            <stop offset="1" stopColor="rgb(124 92 255)" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={R} fill="none" stroke="white" strokeOpacity=".08" strokeWidth=".6" />
        <motion.circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="url(#pr-g)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          animate={{ strokeDashoffset: CIRC * (1 - progreso) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <circle cx="50" cy="50" r="28" fill="none" stroke="white" strokeOpacity=".05" strokeDasharray=".6 1.6" />
      </svg>

      {/* Centro: paso activo */}
      <div className="absolute left-1/2 top-1/2 flex h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/10 bg-bg-raise/80 text-center shadow-[0_0_80px_-20px_rgba(63,125,251,0.8)] backdrop-blur">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center gap-2 px-4"
          >
            <span className="font-mono text-xs text-accent">{active === 0 ? 'Paso 0' : `Fase ${active}`}</span>
            <paso.icon className="h-8 w-8 text-white" />
            <span className="text-lg font-semibold leading-tight">{paso.title}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nodos */}
      {fases.map((f, i) => {
        const on = active === i + 1;
        const hecho = active > i + 1;
        return (
          <div key={f.title} className="absolute -translate-x-1/2 -translate-y-1/2" style={POS[i]}>
            <span
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-500',
                on
                  ? 'scale-110 border-transparent bg-brand text-white shadow-[0_0_30px_4px_rgba(63,125,251,0.6)]'
                  : hecho
                    ? 'border-brand-blue/50 bg-bg-raise text-accent'
                    : 'border-white/10 bg-bg-raise text-ink-faint',
              )}
            >
              <f.icon className="h-5 w-5" />
            </span>
          </div>
        );
      })}
    </div>
  );
}
