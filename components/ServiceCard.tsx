'use client';

import { useRef, type PointerEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Service } from '@/lib/services';

const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_TILT = 6; // grados

/**
 * Tarjeta de servicio: tilt 3D (≤6°) que sigue al cursor, escala 1,02 y
 * borde con glow violeta al hover/foco. El tilt se escribe en variables CSS
 * (sin re-renderizar React) y nunca se aplica con teclado: el foco queda nítido.
 */
export function ServiceCard({
  service,
  index,
  onOpen,
}: {
  service: Service;
  index: number;
  onOpen: (s: Service) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  const onMove = (e: PointerEvent) => {
    const el = ref.current;
    if (reduce || !el || e.pointerType !== 'mouse') return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty('--gx', `${px * 100}%`);
    el.style.setProperty('--gy', `${py * 100}%`);
    el.style.setProperty('--ry', `${(px - 0.5) * 2 * MAX_TILT}deg`);
    el.style.setProperty('--rx', `${-(py - 0.5) * 2 * MAX_TILT}deg`);
  };

  const onLeave = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };

  const Icon = service.icon;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.06, ease: EASE }}
      className="h-full"
      style={{ perspective: 1000 }}
    >
      <button
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onClick={() => onOpen(service)}
        data-cursor="Ver +"
        className="card-fx card-tilt group relative flex h-full w-full flex-col items-start gap-5 overflow-hidden rounded-[var(--radius)] border border-ink-line bg-bg-soft/60 p-7 text-left"
      >
        {/* Brillo que sigue al cursor */}
        <span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(340px circle at var(--gx, 50%) var(--gy, 50%), rgba(124,92,255,0.14), transparent 60%)',
          }}
        />

        <div className="flex w-full items-start justify-between" style={{ transform: 'translateZ(40px)' }}>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-line bg-gradient-to-br from-white/[0.08] to-transparent text-brand-cyan transition-colors group-hover:text-white">
            <Icon className="h-6 w-6" />
          </span>
          <ArrowUpRight className="h-5 w-5 text-ink-faint transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white" />
        </div>

        <div className="flex flex-col gap-2" style={{ transform: 'translateZ(30px)' }}>
          <h3 className="font-display text-2xl leading-tight">{service.title}</h3>
          <p className="text-sm leading-relaxed text-ink-soft">{service.description}</p>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-2" style={{ transform: 'translateZ(20px)' }}>
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand-cyan to-brand-violet" />
          <span className="text-sm font-semibold text-gradient">{service.result}</span>
        </div>
      </button>
    </motion.div>
  );
}
