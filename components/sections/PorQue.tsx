'use client';

import { motion } from 'framer-motion';
import { CalendarDays, MapPin } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SpotlightGroup } from '@/components/ui/Spotlight';
import { ZonaMap } from '@/components/visuals/ZonaMap';
import { razones } from '@/content/home';
import { site } from '@/lib/site.config';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;
const aparece = (i: number) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.7, ease: EASE, delay: (i % 4) * 0.08 },
});

/** Por qué VISAX AI: mapa de la zona, fundadores y razones en un bento. */
export function PorQue() {
  return (
    <section id="por-que" aria-labelledby="por-que-title" className="section">
      <div className="container-x">
        <SectionHeading id="por-que-title" eyebrow="Por qué VISAX AI" title="Un socio cercano," accent="no un proveedor más." />

        <SpotlightGroup className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Mapa */}
          <motion.article
            {...aparece(0)}
            id="zona"
            className="spot relative flex flex-col overflow-hidden rounded-card-lg border border-ink-line bg-bg-soft/70 md:col-span-2 lg:row-span-2"
          >
            <div className="relative h-72 sm:h-80 lg:h-auto lg:flex-1">
              <ZonaMap />
            </div>
            <div className="border-t border-ink-line p-6">
              <p className="flex items-start gap-2 text-xl font-semibold tracking-tight">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                Desde {site.zona.base}, en toda la provincia de Cádiz y Sevilla
              </p>
              <a href="/#visita" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
                <CalendarDays className="h-4 w-4" aria-hidden="true" /> Vamos a tu negocio: reserva una visita
              </a>
            </div>
          </motion.article>

          {/* Quiénes somos */}
          <motion.article
            {...aparece(1)}
            id="nosotros"
            className="spot ring-brand relative flex flex-col justify-between gap-6 overflow-hidden rounded-card-lg bg-[linear-gradient(135deg,rgba(51,198,244,0.1),rgba(124,92,255,0.12))] p-6 sm:p-7 md:col-span-2"
          >
            <div className="flex -space-x-3" aria-hidden="true">
              {site.founders.map((f) => (
                <span key={f.name} className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-bg bg-brand text-lg font-semibold text-white shadow-glow">
                  {f.initials}
                </span>
              ))}
            </div>
            <div>
              <h3 className="text-2xl tracking-tight">Quiénes somos</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-[15px]">
                VISAX AI la fundamos <strong className="font-semibold text-ink">{site.founders.map((f) => f.name).join(' y ')}</strong>.
                Un equipo pequeño y local: hablas siempre con nosotros y podemos ir a verte cuando haga falta.
              </p>
            </div>
          </motion.article>

          {/* Razones */}
          {razones.map((r, i) => (
            <motion.article
              key={r.title}
              {...aparece(i + 2)}
              className={cn('spot relative flex flex-col gap-4 overflow-hidden rounded-card-lg border border-ink-line bg-bg-soft/70 p-6')}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient-soft text-accent">
                <r.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg leading-snug tracking-tight">{r.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{r.text}</p>
              </div>
            </motion.article>
          ))}
        </SpotlightGroup>
      </div>
    </section>
  );
}
