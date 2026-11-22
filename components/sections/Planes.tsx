'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CalendarClock, Check, Handshake, LifeBuoy, MessagesSquare, Phone, Wrench } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SpotlightGroup } from '@/components/ui/Spotlight';
import { Button } from '@/components/ui/Button';
import { plans, formatEuros, PRICE_FALLBACK, SETUP_FALLBACK, type Plan } from '@/config/plans';
import { site } from '@/lib/site.config';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

const DETALLES = [
  { key: 'accompaniment', label: 'Acompañamiento', icon: Handshake },
  { key: 'implementation', label: 'Implementación', icon: Wrench },
  { key: 'support', label: 'Seguimiento y atención', icon: LifeBuoy },
  { key: 'meetings', label: 'Reuniones', icon: CalendarClock },
] as const;

function Precio({ plan }: { plan: Plan }) {
  return (
    <div className="mt-6">
      {plan.price === null ? (
        <p className="text-3xl font-semibold tracking-tight">{PRICE_FALLBACK}</p>
      ) : (
        <p className="flex items-baseline gap-1.5">
          <span className="text-5xl font-semibold tracking-tightest">{formatEuros(plan.price)}</span>
          <span className="text-sm text-ink-soft">/mes</span>
        </p>
      )}
      {plan.priceNote && <p className="mt-1 text-xs text-ink-faint">{plan.priceNote}</p>}
      <p className="mt-1 text-sm text-ink-faint">
        Puesta en marcha: {plan.setupFee === null ? SETUP_FALLBACK : formatEuros(plan.setupFee)}
      </p>
    </div>
  );
}

/** Planes: todo sale de config/plans.ts. El plan destacado lleva un borde de luz que gira. */
export function Planes() {
  return (
    <section id="planes" aria-labelledby="planes-title" className="section relative overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-40 -z-10 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,92,255,0.16),transparent)]"
        aria-hidden="true"
      />
      <div className="container-x">
        <SectionHeading
          id="planes-title"
          eyebrow="Planes"
          align="center"
          title="Una suscripción mensual."
          accent="Tú eliges cuánto te acompañamos."
          intro="Los planes cambian según la dedicación y el acompañamiento. En el diagnóstico te recomendamos el tuyo."
        />

        <SpotlightGroup className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.article
              key={plan.id}
              aria-labelledby={`plan-${plan.id}`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.8, ease: EASE, delay: i * 0.12 }}
              className={cn(
                'spot relative flex flex-col rounded-card-lg p-7 sm:p-8',
                plan.featured
                  ? 'ring-spin bg-[linear-gradient(180deg,rgba(63,125,251,0.12),rgba(17,17,27,0.9)_40%)] shadow-[0_30px_100px_-30px_rgba(124,92,255,0.55)] lg:-my-4 lg:py-12'
                  : 'border border-ink-line bg-bg-soft/70',
              )}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white shadow-glow">
                  {plan.tagline}
                </span>
              )}
              {!plan.featured && <p className="eyebrow">{plan.tagline}</p>}
              <h3 id={`plan-${plan.id}`} className={cn('text-4xl tracking-tightest', !plan.featured && 'mt-2')}>
                {plan.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{plan.forWho}</p>

              <Precio plan={plan} />

              <dl className="mt-6 grid gap-3 border-t border-ink-line pt-6">
                {DETALLES.map((d) => (
                  <div key={d.key} className="flex items-start gap-3">
                    <d.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-ink-faint">{d.label}</dt>
                      <dd className="text-sm">{plan.details[d.key]}</dd>
                    </div>
                  </div>
                ))}
              </dl>

              <ul className="mt-6 flex flex-1 flex-col gap-2.5 border-t border-ink-line pt-6">
                {plan.includes.map((inc) => (
                  <li key={inc} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-gradient-soft">
                      <Check className="h-3 w-3 text-accent" aria-hidden="true" />
                    </span>
                    {inc}
                  </li>
                ))}
              </ul>

              <Button
                href="/#diagnostico"
                variant={plan.featured ? 'primary' : 'secondary'}
                className="mt-8 w-full"
                ariaLabel={`Empezar con el diagnóstico: plan ${plan.name}`}
              >
                Empezar con el diagnóstico <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </motion.article>
          ))}
        </SpotlightGroup>

        {/* A medida */}
        <div className="ring-brand mt-8 flex flex-col gap-6 overflow-hidden rounded-card-lg bg-[linear-gradient(120deg,rgba(51,198,244,0.08),rgba(124,92,255,0.1))] p-7 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
              <MessagesSquare className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-2xl tracking-tight">¿Necesitas algo a medida? Hablemos</h3>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-soft">
                Si tu empresa no encaja en ningún plan o tienes un proyecto concreto, lo adaptamos a lo que necesitas.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button href="/#diagnostico" variant="primary">
              Cuéntanos tu caso
            </Button>
            <Button href={`tel:${site.phoneRaw}`} variant="secondary">
              <Phone className="h-4 w-4" aria-hidden="true" /> {site.phone}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
