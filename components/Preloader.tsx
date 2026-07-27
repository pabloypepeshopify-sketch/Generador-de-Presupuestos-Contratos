'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/ui/Logo';
import { prefersReducedMotion } from '@/lib/utils';

/**
 * Intro cinematográfica: el logo dibuja su trazo mientras un contador
 * sube a 100 y la web se revela con una cortina que se abre.
 */
export function Preloader() {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDone(true);
      return;
    }
    // Bloquea el scroll durante la intro
    document.documentElement.classList.add('lenis-stopped');
    document.body.style.overflow = 'hidden';

    const start = performance.now();
    const duration = 2000;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // easing suave
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setDone(true), 350);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (done) {
      document.documentElement.classList.remove('lenis-stopped');
      document.body.style.overflow = '';
    }
  }, [done]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-bg"
          exit={{ opacity: 1 }}
        >
          {/* Cortina que se abre (dos mitades) */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-bg"
            initial={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          />
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-bg"
            initial={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          />

          <motion.div
            className="relative flex flex-col items-center gap-6"
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.4 } }}
          >
            <div className="preloader-logo">
              <Logo showText={false} markClassName="h-20 w-20" animatable />
            </div>
            <div className="overflow-hidden">
              <motion.p
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="font-display text-2xl tracking-[0.3em]"
              >
                VISAX <span className="text-gradient">AI</span>
              </motion.p>
            </div>
          </motion.div>

          <div className="absolute bottom-10 right-8 font-display text-6xl tabular-nums text-ink-faint md:right-16 md:text-8xl">
            {count}
            <span className="text-2xl">%</span>
          </div>

          <style jsx global>{`
            .preloader-logo .logo-path {
              stroke-dasharray: 120;
              stroke-dashoffset: 120;
              animation: draw 1.6s ease forwards;
            }
            @keyframes draw {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
