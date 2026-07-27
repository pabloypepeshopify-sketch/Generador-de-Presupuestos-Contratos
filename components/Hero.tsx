'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, Sparkles } from 'lucide-react';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { isMobileDevice, prefersReducedMotion } from '@/lib/utils';

const HeroCanvas = dynamic(() => import('@/components/three/HeroCanvas'), {
  ssr: false,
});

const TITLE_LINE_1 = 'Tu negocio,';
const TITLE_LINE_2 = 'en piloto automático';

const letter = {
  hidden: { y: '110%', opacity: 0 },
  show: (i: number) => ({
    y: '0%',
    opacity: 1,
    transition: { duration: 0.8, delay: 0.15 + i * 0.03, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function AnimatedLine({ text, base = 0 }: { text: string; base?: number }) {
  return (
    <span className="block overflow-hidden">
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          custom={base + i}
          variants={letter}
          initial="hidden"
          animate="show"
          className="inline-block"
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

export function Hero() {
  const [mode, setMode] = useState<'high' | 'low' | 'off'>('off');
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.25], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  useEffect(() => {
    if (prefersReducedMotion()) setMode('off');
    else if (isMobileDevice()) setMode('low');
    else setMode('high');
  }, []);

  return (
    <section
      id="inicio"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden"
    >
      {/* Fondo WebGL o degradado de respaldo */}
      <div className="absolute inset-0 -z-10">
        {mode !== 'off' ? (
          <HeroCanvas quality={mode === 'low' ? 'low' : 'high'} />
        ) : (
          <div className="absolute inset-0 bg-radial-glow" />
        )}
        {/* Glows de marca */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-blue/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-[40vh] w-[40vh] rounded-full bg-brand-violet/20 blur-[120px]" />
        {/* Degradado inferior para fundir con la siguiente sección */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <motion.div
        style={{ y, opacity }}
        className="container-x flex flex-col items-center text-center"
      >
        {/* Badge de confianza */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="glass mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-ink-soft"
        >
          <Sparkles className="h-3.5 w-3.5 text-brand-cyan" />
          Automatizaciones con IA a medida
        </motion.div>

        <h1 className="font-display text-[clamp(2.6rem,8vw,6.5rem)] font-medium leading-[0.98] tracking-tightest">
          <AnimatedLine text={TITLE_LINE_1} base={0} />
          <span className="block overflow-hidden">
            <motion.span
              custom={TITLE_LINE_1.length}
              variants={letter}
              initial="hidden"
              animate="show"
              className="text-gradient-animate inline-block italic"
            >
              {TITLE_LINE_2}
            </motion.span>
          </span>
          <AnimatedLine text="con IA" base={TITLE_LINE_1.length + TITLE_LINE_2.length} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="mt-8 max-w-xl text-base text-ink-soft sm:text-lg"
        >
          Recepcionistas virtuales, agentes de voz, cobros, facturas y contratos. Convertimos tus
          tareas repetitivas en procesos inteligentes que trabajan por ti, 24/7.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <MagneticButton href="#reservar" variant="primary" cursorLabel="Reservar">
            Reservar reunión
          </MagneticButton>
          <MagneticButton href="#servicios" variant="secondary" cursorLabel="Ver">
            Ver servicios
          </MagneticButton>
        </motion.div>
      </motion.div>

      {/* Indicador de scroll */}
      <motion.a
        href="#tecnologias"
        aria-label="Desplázate hacia abajo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-ink-faint"
      >
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <ArrowDown className="h-4 w-4" />
        </motion.span>
      </motion.a>
    </section>
  );
}
