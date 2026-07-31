'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, type MotionValue } from 'framer-motion';
import { Search, PenTool, Plug, Rocket, type LucideIcon } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';

type Step = { icon: LucideIcon; title: string; text: string };

const steps: Step[] = [
  {
    icon: Search,
    title: 'Diagnóstico gratuito',
    text: 'Analizamos tu día a día y detectamos qué tareas repetitivas te roban horas y dinero.',
  },
  {
    icon: PenTool,
    title: 'Diseñamos tu automatización',
    text: 'Creamos el flujo con IA a tu medida: qué se automatiza, cómo y con qué reglas de negocio.',
  },
  {
    icon: Plug,
    title: 'Integramos con tus herramientas',
    text: 'Lo conectamos con tu email, calendario, hojas, teléfono y CRM. Sin cambiar tu forma de trabajar.',
  },
  {
    icon: Rocket,
    title: 'Tú te dedicas a tu negocio',
    text: 'La automatización trabaja 24/7. Tú recibes resultados y te centras en lo que importa.',
  },
];

function StepRow({
  step,
  index,
  progress,
}: {
  step: Step;
  index: number;
  progress: MotionValue<number>;
}) {
  const start = index / steps.length;
  const end = (index + 1) / steps.length;
  const opacity = useTransform(progress, [start - 0.12, start, end, end + 0.12], [0.25, 1, 1, 0.25]);
  const x = useTransform(progress, [start - 0.12, start], [40, 0]);
  const Icon = step.icon;

  return (
    <motion.div style={{ opacity, x }} className="flex gap-6 py-8">
      <div className="flex flex-col items-center">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-ink-line bg-bg-soft text-brand-cyan">
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <div>
        <span className="font-display text-sm text-brand-violet">
          0{index + 1}
        </span>
        <h3 className="mt-1 font-display text-3xl leading-tight sm:text-4xl">{step.title}</h3>
        <p className="mt-3 max-w-md leading-relaxed text-ink-soft">{step.text}</p>
      </div>
    </motion.div>
  );
}

/** Storytelling con recorrido: el índice avanza mientras haces scroll. */
export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const lineScale = useTransform(progress, [0, 1], [0, 1]);

  return (
    <section id="como-funciona" ref={ref} className="relative" style={{ height: '320vh' }}>
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden py-20">
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-[50vh] w-[50vh] -translate-x-1/2 rounded-full bg-brand-violet/10 blur-[130px]" />
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Cómo funciona"
              title={
                <>
                  De tu caos diario
                  <br />
                  <span className="text-gradient italic">al piloto automático</span>
                </>
              }
              intro="Cuatro pasos. Cero fricción. Nosotros construimos, tú recoges los resultados."
            />
            <div className="mt-8 flex items-center gap-4">
              <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-ink-line">
                <motion.div
                  className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-brand"
                  style={{ scaleX: lineScale }}
                />
              </div>
            </div>
          </div>

          <div className="relative">
            {/* Línea vertical de progreso */}
            <div className="absolute left-7 top-0 hidden h-full w-px bg-ink-line sm:block">
              <motion.div
                className="absolute inset-x-0 top-0 origin-top bg-gradient-to-b from-brand-cyan to-brand-violet"
                style={{ scaleY: lineScale, height: '100%' }}
              />
            </div>
            {steps.map((step, i) => (
              <StepRow key={i} step={step} index={i} progress={progress} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
