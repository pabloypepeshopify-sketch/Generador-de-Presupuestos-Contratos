'use client';

import { Star, Quote } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';

/**
 * TESTIMONIOS PLACEHOLDER — sustitúyelos por reseñas reales.
 * Edita este array en components/Testimonials.tsx.
 */
const testimonials = [
  {
    quote:
      'Ahora las citas se agendan solas por email. Hemos dejado de perder clientes por no contestar a tiempo.',
    name: 'Clínica dental (ejemplo)',
    role: 'Recepción · Madrid',
  },
  {
    quote:
      'El agente de voz coge todas las llamadas fuera de horario. Es como tener recepción 24 horas.',
    name: 'Centro de estética (ejemplo)',
    role: 'Gerencia · Valencia',
  },
  {
    quote:
      'Los presupuestos que antes tardaban días ahora salen en minutos y con una imagen impecable.',
    name: 'Empresa de reformas (ejemplo)',
    role: 'Dirección · Sevilla',
  },
  {
    quote:
      'El cobrador de impagos recuperó facturas que dábamos por perdidas, y sin incomodar a nadie.',
    name: 'Despacho de abogados (ejemplo)',
    role: 'Administración · Bilbao',
  },
  {
    quote:
      'Las reseñas en Google han subido solas gracias al radar de reputación. Un antes y un después.',
    name: 'Fisioterapia (ejemplo)',
    role: 'Propietario · Málaga',
  },
];

function Card({ t }: { t: (typeof testimonials)[number] }) {
  return (
    <figure className="glass mx-3 flex w-[340px] shrink-0 flex-col gap-4 rounded-[var(--radius)] p-7 sm:w-[400px]">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 text-brand-cyan">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-current" />
          ))}
        </div>
        <Quote className="h-7 w-7 text-ink-line" />
      </div>
      <blockquote className="text-[15px] leading-relaxed text-ink">“{t.quote}”</blockquote>
      <figcaption className="mt-auto flex items-center gap-3 pt-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
          {t.name.charAt(0)}
        </span>
        <span>
          <span className="block text-sm font-semibold">{t.name}</span>
          <span className="block text-xs text-ink-faint">{t.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  const row = [...testimonials, ...testimonials];
  return (
    <section id="testimonios" className="section overflow-hidden">
      <div className="container-x">
        <SectionHeading
          eyebrow="Testimonios"
          align="center"
          title={
            <>
              Lo que dirán <span className="text-gradient italic">de trabajar contigo</span>
            </>
          }
          intro="Ejemplos ilustrativos del impacto de automatizar. Se sustituirán por testimonios reales de clientes."
          className="mx-auto items-center"
        />
      </div>

      <div className="marquee-paused relative mt-14">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-bg to-transparent sm:w-40" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-bg to-transparent sm:w-40" />
        <div className="marquee-track" style={{ ['--marquee-duration' as string]: '55s' }}>
          {row.map((t, i) => (
            <Card key={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
