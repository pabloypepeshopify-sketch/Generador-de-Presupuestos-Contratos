import { ArrowRight, Check, MessagesSquare, Phone } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { Pending } from '@/components/ui/Pending';
import { plans, formatEuros, PRICE_FALLBACK, SETUP_FALLBACK, type Plan } from '@/config/plans';
import { site } from '@/lib/site.config';
import { cn } from '@/lib/utils';

const DETALLES: Array<{ key: keyof Plan['details']; label: string }> = [
  { key: 'accompaniment', label: 'Acompañamiento' },
  { key: 'implementation', label: 'Implementación' },
  { key: 'support', label: 'Seguimiento y atención' },
  { key: 'meetings', label: 'Reuniones' },
];

function Precio({ plan }: { plan: Plan }) {
  return (
    <div className="mt-6 border-y border-ink-line py-5">
      {plan.price === null ? (
        <p className="text-2xl font-semibold tracking-tight">{PRICE_FALLBACK}</p>
      ) : (
        <p className="flex items-baseline gap-1.5">
          <span className="text-4xl font-semibold tracking-tight">{formatEuros(plan.price)}</span>
          <span className="text-sm text-ink-soft">/mes</span>
        </p>
      )}
      {plan.priceNote && <p className="mt-1 text-xs text-ink-faint">{plan.priceNote}</p>}
      <p className="mt-1 text-sm text-ink-soft">
        Puesta en marcha: {plan.setupFee === null ? SETUP_FALLBACK : formatEuros(plan.setupFee)}
      </p>
    </div>
  );
}

/** Planes de suscripción: todo sale de config/plans.ts. */
export function Planes() {
  const sinPrecios = plans.some((p) => p.price === null);
  return (
    <section id="planes" aria-labelledby="planes-title" className="section">
      <div className="container-x">
        <SectionHeading
          id="planes-title"
          eyebrow="Planes"
          align="center"
          className="mx-auto"
          title={
            <>
              Una suscripción mensual.
              <br />
              <span className="text-gradient">Tú eliges cuánto te acompañamos.</span>
            </>
          }
          intro="Los planes se diferencian por el nivel de dedicación y acompañamiento, no por una lista de herramientas. En el diagnóstico te recomendamos el que encaja con tu empresa."
        />
        {sinPrecios && (
          <div className="mt-4 flex justify-center">
            <Pending>TODO: confirmar · precios y cuota de alta en config/plans.ts</Pending>
          </div>
        )}

        <RevealGroup className="mt-12 grid items-stretch gap-4 lg:grid-cols-3" stagger={0.08}>
          {plans.map((plan) => (
            <RevealItem key={plan.id} className="h-full">
              <article
                aria-labelledby={`plan-${plan.id}`}
                className={cn(
                  'flex h-full flex-col rounded-card-lg p-7',
                  plan.featured ? 'border-gradient bg-bg-raise shadow-glow-violet' : 'border border-ink-line bg-bg-soft/60',
                )}
              >
                <p className="eyebrow">{plan.tagline}</p>
                <h3 id={`plan-${plan.id}`} className="mt-2 text-3xl tracking-tight">
                  {plan.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{plan.forWho}</p>

                <Precio plan={plan} />

                <dl className="mt-5 grid gap-3">
                  {DETALLES.map((d) => (
                    <div key={d.key}>
                      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">{d.label}</dt>
                      <dd className="mt-0.5 text-sm">{plan.details[d.key]}</dd>
                    </div>
                  ))}
                </dl>

                <ul className="mt-6 flex flex-1 flex-col gap-2.5 border-t border-ink-line pt-6">
                  {plan.includes.map((inc) => (
                    <li key={inc} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      {inc}
                    </li>
                  ))}
                </ul>

                <Button
                  href="/#diagnostico"
                  variant={plan.featured ? 'primary' : 'secondary'}
                  className="mt-8 w-full"
                  ariaLabel={`Solicitar diagnóstico para el plan ${plan.name}`}
                >
                  Empezar con el diagnóstico <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* A medida */}
        <div className="mt-4 flex flex-col gap-6 rounded-card-lg border border-ink-line bg-bg-soft/60 p-7 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient-soft text-accent">
              <MessagesSquare className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-2xl tracking-tight">¿Necesitas algo a medida? Hablemos</h3>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-soft">
                Si tu empresa no encaja en ningún plan o tienes un proyecto concreto, lo vemos juntos y lo adaptamos a lo que
                necesitas.
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
