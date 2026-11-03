'use client';

import { Search, PenTool, Plug, Rocket, type LucideIcon } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';

type Step = { icon: LucideIcon; title: string; text: string };

const steps: Step[] = [
  {
    icon: Search,
    title: 'Llamada gratis',
    text: 'Nos cuentas cómo trabajas y vemos qué tareas te roban más horas y dinero.',
  },
  {
    icon: PenTool,
    title: 'Te proponemos la solución',
    text: 'Qué se automatiza, qué software o web necesitas y con qué reglas. Con precio cerrado.',
  },
  {
    icon: Plug,
    title: 'Lo montamos y conectamos',
    text: 'Con tu email, calendario, teléfono y programas. Sin cambiar tu forma de trabajar.',
  },
  {
    icon: Rocket,
    title: 'Funciona solo',
    text: 'Tu negocio trabaja 24/7 y nosotros seguimos a tu lado para ajustar lo que haga falta.',
  },
];

const commitments = [
  { big: 'Gratis', text: 'La primera llamada y el estudio de tu caso.' },
  { big: 'Precio cerrado', text: 'Sabes lo que pagas antes de empezar.' },
  { big: '1–3 semanas', text: 'Lo normal para tenerlo funcionando.' },
  { big: '24/7', text: 'Tus automatizaciones no descansan.' },
];

/** Cómo trabajamos: cuatro pasos y nuestros compromisos. */
export function HowItWorks() {
  return (
    <section id="como-funciona" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Cómo trabajamos"
          title={
            <>
              De la primera llamada
              <br />
              <span className="text-gradient italic">a tu negocio funcionando solo</span>
            </>
          }
          intro="Cuatro pasos. Nosotros lo construimos; tú ves los resultados."
        />

        <RevealGroup className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
          {/* Línea que une los pasos (escritorio) */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-8 right-8 top-[3.25rem] hidden h-px bg-gradient-to-r from-brand-cyan via-brand-blue to-brand-violet opacity-40 lg:block"
          />
          {steps.map((s, i) => (
            <RevealItem key={s.title}>
              <div className="relative h-full rounded-[var(--radius)] border border-ink-line bg-bg-soft/70 p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-line bg-bg-raise text-brand-cyan">
                    <s.icon className="h-6 w-6" />
                  </span>
                  <span className="font-display text-4xl text-white/10">0{i + 1}</span>
                </div>
                <h3 className="mt-5 font-display text-2xl leading-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.text}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-ink-line bg-ink-line lg:grid-cols-4">
          {commitments.map((c) => (
            <div key={c.big} className="bg-bg-soft p-5 sm:p-6">
              <p className="font-display text-2xl text-gradient sm:text-3xl">{c.big}</p>
              <p className="mt-1 text-xs text-ink-soft sm:text-sm">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
