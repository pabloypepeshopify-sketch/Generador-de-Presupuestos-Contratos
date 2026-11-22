'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Palabras que suben una a una desde detrás de una máscara. */
function Words({ text, className, start = 0 }: { text: string; className?: string; start?: number }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className={cn('inline-block', className)}
            variants={{ hidden: { y: '105%' }, show: { y: '0%', transition: { duration: 0.8, ease: EASE, delay: (start + i) * 0.045 } } }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </>
  );
}

/**
 * Cabecera de sección: antetítulo, titular (palabra a palabra) con una segunda
 * línea en degradado, y entradilla.
 */
export function SectionHeading({
  eyebrow,
  title,
  accent,
  intro,
  align = 'left',
  size = 'lg',
  className,
  id,
}: {
  eyebrow?: string;
  title: string;
  /** Segunda línea en degradado de marca */
  accent?: string;
  intro?: ReactNode;
  align?: 'left' | 'center';
  size?: 'lg' | 'md';
  className?: string;
  /** id del titular, para aria-labelledby de la sección */
  id?: string;
}) {
  const offset = title.split(' ').length;
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.35 }}
      className={cn('flex flex-col gap-5', align === 'center' && 'items-center text-center [&>div:first-child]:self-center', className)}
    >
      {eyebrow && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
          className="inline-flex items-center gap-2 self-start rounded-full border border-ink-line bg-white/[0.03] px-3.5 py-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_2px_rgba(63,125,251,0.6)]" aria-hidden="true" />
          <span className="eyebrow">{eyebrow}</span>
        </motion.div>
      )}
      <h2
        id={id}
        className={cn(
          'max-w-4xl leading-[1.02] tracking-tightest',
          size === 'lg' ? 'text-[clamp(2.1rem,4.6vw,3.8rem)]' : 'text-[clamp(1.8rem,3.6vw,2.8rem)]',
        )}
      >
        <Words text={title} />
        {accent && (
          <>
            <br />
            <Words text={accent} className="text-shimmer" start={offset} />
          </>
        )}
      </h2>
      {intro && (
        <motion.p
          variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay: 0.25 } } }}
          className={cn('max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg', align === 'center' && 'mx-auto')}
        >
          {intro}
        </motion.p>
      )}
    </motion.div>
  );
}
