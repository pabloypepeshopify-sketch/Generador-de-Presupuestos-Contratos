'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, Sparkles } from 'lucide-react';
import { MagneticButton } from '@/components/ui/MagneticButton';

const TITLE_LINE_1 = 'Tu negocio,';
const TITLE_LINE_2 = 'en piloto automático';

type Delay = React.CSSProperties & { '--delay'?: string };
const delay = (sec: number): Delay => ({ '--delay': `${sec.toFixed(3)}s` });

/*
 * Entrada del hero en CSS (clases hero-in / hero-letter en globals.css):
 * arranca con el primer pintado, sin esperar a que React hidrate, y solo usa
 * transform/opacity → la mueve el compositor, no el hilo principal (LCP y TBT).
 */
const LETTER_STEP = 0.025;
const LETTER_BASE = 0.1;

function AnimatedLine({ text, base = 0 }: { text: string; base?: number }) {
  return (
    <span className="block overflow-hidden">
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="hero-in hero-letter inline-block"
          style={{ ...delay(LETTER_BASE + (base + i) * LETTER_STEP), whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

export function Hero() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.25], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <section
      id="inicio"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden"
    >
      {/* Fondo estático (sin 3D o mientras carga). Con 3D, la escena de <Experience /> lo cubre. */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-radial-glow" />
        {/* Glows de marca */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-blue/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-[40vh] w-[40vh] rounded-full bg-brand-violet/20 blur-[120px]" />
        {/* Viñeta radial: bordes oscuros para que el texto respire */}
        <div className="hero-vignette pointer-events-none absolute inset-0" />
        {/* Degradado inferior para fundir con la siguiente sección */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <motion.div
        style={{ y, opacity }}
        className="container-x flex flex-col items-center text-center"
      >
        {/* Badge de confianza */}
        <div
          style={delay(0.05)}
          className="hero-in glass mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-ink-soft"
        >
          <Sparkles className="h-3.5 w-3.5 text-brand-cyan" />
          Automatizaciones con IA a medida
        </div>

        <h1 className="font-display text-[clamp(2.6rem,8vw,6.5rem)] font-medium leading-[0.98] tracking-tightest">
          <AnimatedLine text={TITLE_LINE_1} base={0} />
          <span className="block overflow-hidden">
            <span
              style={delay(LETTER_BASE + TITLE_LINE_1.length * LETTER_STEP)}
              className="hero-in hero-letter inline-block"
            >
              <span className="text-gradient-animate inline-block italic">{TITLE_LINE_2}</span>
            </span>
          </span>
          <AnimatedLine text="con IA" base={TITLE_LINE_1.length + TITLE_LINE_2.length} />
        </h1>

        {/* Visible desde el primer pintado (solo sube): es el LCP en móvil */}
        <p className="hero-in hero-slide mt-8 max-w-xl text-base text-ink-soft sm:text-lg">
          Recepcionistas virtuales, agentes de voz, cobros, facturas y contratos. Convertimos tus
          tareas repetitivas en procesos inteligentes que trabajan por ti, 24/7.
        </p>

        <div style={delay(0.7)} className="hero-in mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <MagneticButton href="#reservar" variant="primary" cursorLabel="Reservar">
            Reservar reunión
          </MagneticButton>
          <MagneticButton href="#servicios" variant="secondary" cursorLabel="Ver">
            Ver servicios
          </MagneticButton>
        </div>
      </motion.div>

      {/* Indicador de scroll */}
      <a
        href="#tecnologias"
        aria-label="Scroll: desplázate hacia abajo"
        style={delay(1.2)}
        className="hero-in hero-fade absolute bottom-8 left-1/2 -translate-x-1/2 text-ink-soft"
      >
        <span className="hero-bob flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <ArrowDown className="h-4 w-4" />
        </span>
      </a>
    </section>
  );
}
