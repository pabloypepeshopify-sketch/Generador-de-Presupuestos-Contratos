'use client';

import type { PointerEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import type { Service } from '@/lib/services';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Tarjeta de servicio: qué es, qué hace y qué consigues, a la vista sin tocar
 * nada. Al pulsarla se abre el detalle. En escritorio, brillo que sigue al ratón
 * (variables CSS, sin re-renderizar React).
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
  const reduce = useReducedMotion();

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--gx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--gy', `${e.clientY - r.top}px`);
  };

  const Icon = service.icon;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: (index % 3) * 0.06, ease: EASE }}
      className="h-full"
    >
      <button
        onPointerMove={onMove}
        onClick={() => onOpen(service)}
        aria-haspopup="dialog"
        className="card-fx group relative flex h-full w-full flex-col items-start gap-4 overflow-hidden rounded-[var(--radius)] border border-ink-line bg-bg-soft/70 p-6 text-left"
      >
        <span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(320px circle at var(--gx, 50%) var(--gy, 50%), rgba(124,92,255,0.14), transparent 60%)',
          }}
        />
        <div className="flex w-full items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-ink-line bg-gradient-to-br from-white/[0.08] to-transparent text-brand-cyan transition-colors group-hover:text-white">
            <Icon className="h-5 w-5" />
          </span>
          <h4 className="font-display text-xl leading-tight sm:text-2xl">{service.title}</h4>
        </div>
        <p className="text-sm leading-relaxed text-ink-soft">{service.summary}</p>
        <div className="mt-auto flex w-full items-center justify-between gap-3 pt-1">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Check className="h-4 w-4 shrink-0 text-brand-cyan" />
            <span className="text-gradient">{service.result}</span>
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-line text-ink-soft transition group-hover:border-brand-violet/60 group-hover:text-white">
            <Plus className="h-4 w-4" />
            <span className="sr-only">Ver detalles de {service.title}</span>
          </span>
        </div>
      </button>
    </motion.div>
  );
}
