'use client';

import { motion } from 'framer-motion';
import { RevealText } from './RevealText';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Cabecera de sección: eyebrow con línea + titular con revelado por líneas. */
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
    <div
      className={cn(
        'flex flex-col gap-5',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3"
        >
          <span className="h-px w-8 bg-gradient-to-r from-brand-cyan to-brand-violet" />
          <span className="eyebrow">{eyebrow}</span>
        </motion.div>
      )}
      <RevealText
        as="h2"
        type="lines"
        className="max-w-4xl font-display text-4xl leading-[1.05] sm:text-5xl md:text-6xl"
      >
        {title}
      </RevealText>
      {intro && (
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className={cn(
            'max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg',
            align === 'center' && 'mx-auto',
          )}
        >
          {intro}
        </motion.p>
      )}
    </div>
  );
}
