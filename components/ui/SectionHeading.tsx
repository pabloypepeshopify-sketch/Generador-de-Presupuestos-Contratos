'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Cabecera de sección: eyebrow con línea + titular y entradilla que suben al aparecer. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={cn('flex flex-col gap-5', align === 'center' && 'items-center text-center', className)}
    >
      {eyebrow && (
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-gradient-to-r from-brand-cyan to-brand-violet" />
          <span className="eyebrow">{eyebrow}</span>
        </div>
      )}
      <h2 className="max-w-4xl font-display text-4xl leading-[1.05] sm:text-5xl md:text-6xl">{title}</h2>
      {intro && (
        <p
          className={cn(
            'max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg',
            align === 'center' && 'mx-auto',
          )}
        >
          {intro}
        </p>
      )}
    </motion.div>
  );
}
