'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Cabecera de sección: antetítulo + titular + entradilla, que suben al aparecer. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'left',
  className,
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  /** id del titular, para aria-labelledby de la sección */
  id?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={cn('flex flex-col gap-4', align === 'center' && 'items-center text-center', className)}
    >
      {eyebrow && (
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-gradient-to-r from-brand-cyan to-brand-violet" aria-hidden="true" />
          <span className="eyebrow">{eyebrow}</span>
        </div>
      )}
      <h2 id={id} className="max-w-3xl text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.05]">
        {title}
      </h2>
      {intro && (
        <p className={cn('max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg', align === 'center' && 'mx-auto')}>
          {intro}
        </p>
      )}
    </motion.div>
  );
}
