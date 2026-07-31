'use client';

import { useEffect, useRef, createElement, type ReactNode } from 'react';
import SplitType from 'split-type';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn, prefersReducedMotion } from '@/lib/utils';

type Props = {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  /** Granularidad de la animación */
  type?: 'lines' | 'words' | 'chars';
  delay?: number;
  stagger?: number;
};

/**
 * Revelado de texto con máscara (línea a línea / palabra a palabra / letra a
 * letra) sincronizado con el scroll mediante SplitType + GSAP.
 */
export function RevealText({
  children,
  as = 'div',
  className,
  type = 'lines',
  delay = 0,
  stagger = 0.08,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) return;

    gsap.registerPlugin(ScrollTrigger);
    let split: SplitType | null = null;

    const ctx = gsap.context(() => {
      split = new SplitType(el, {
        types: type === 'chars' ? 'words,chars' : (type as 'lines' | 'words'),
        lineClass: 'st-line',
      });

      const targets =
        type === 'chars' ? split.chars : type === 'words' ? split.words : split.lines;
      if (!targets) return;

      // Envolver para efecto de máscara en líneas
      if (type === 'lines' && split.lines) {
        split.lines.forEach((line) => {
          const wrapper = document.createElement('span');
          wrapper.style.display = 'block';
          wrapper.style.overflow = 'hidden';
          line.parentNode?.insertBefore(wrapper, line);
          wrapper.appendChild(line);
        });
      }

      gsap.set(targets, { yPercent: 120, opacity: 0 });
      gsap.to(targets, {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        ease: 'power4.out',
        stagger,
        delay,
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
        },
      });
    }, el);

    return () => {
      ctx.revert();
      split?.revert();
    };
  }, [type, delay, stagger]);

  return createElement(as, { ref, className: cn(className) }, children);
}
