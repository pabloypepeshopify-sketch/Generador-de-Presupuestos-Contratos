'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { MotionConfig } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/lib/utils';
import { chromaOnScroll, startChroma } from '@/lib/chroma';

/**
 * Scroll suave de lujo (Lenis) sincronizado con GSAP ScrollTrigger.
 * Respeta prefers-reduced-motion: si el usuario lo pide, no activa
 * la inercia y deja el scroll nativo.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (prefersReducedMotion()) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
      wheelMultiplier: 1,
    });

    // Exponer para que otros componentes puedan hacer scrollTo
    (window as unknown as { lenis?: Lenis }).lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    // Efecto 3 (aberración cromática en titulares): solo escritorio con ratón.
    const stopChroma = window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches
      ? startChroma()
      : () => {};
    lenis.on('scroll', (l: Lenis) => chromaOnScroll(l.velocity, l.direction));

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Enlaces de ancla -> scroll suave con Lenis
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a[href^="#"]');
      if (!target) return;
      const id = target.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (el) {
        e.preventDefault();
        lenis.scrollTo(el as HTMLElement, { offset: -80 });
      }
    };
    document.addEventListener('click', onClick);

    return () => {
      stopChroma();
      document.removeEventListener('click', onClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
      (window as unknown as { lenis?: Lenis }).lenis = undefined;
    };
  }, []);

  // reducedMotion="user": con prefers-reduced-motion, framer-motion no anima transformaciones.
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
