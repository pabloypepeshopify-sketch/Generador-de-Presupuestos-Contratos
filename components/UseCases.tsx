'use client';

import { ArrowUpRight, Briefcase, Hammer, Sparkles, Stethoscope, Store, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { site } from '@/lib/site.config';

type Sector = { icon: LucideIcon; name: string; text: string; tags: string[]; href?: string };

/** Ideas por sector: qué suele automatizar cada tipo de negocio. */
const sectors: Sector[] = [
  {
    icon: Stethoscope,
    name: 'Clínicas y centros de estética',
    text: 'Las citas por email y por teléfono se dan solas, y cada cliente contento deja su reseña.',
    tags: ['Recepcionista IA', 'Agente de voz', 'Reseñas'],
  },
  {
    icon: Hammer,
    name: 'Reformas y oficios',
    text: 'Presupuestos en minutos, facturas que se cobran solas y una web que trae trabajos.',
    tags: ['Presupuestos', 'Cobros', 'Página web'],
  },
  {
    icon: Briefcase,
    name: 'Despachos y asesorías',
    text: 'Contratos revisados, facturas pasadas a la hoja sin teclear y los clientes nuevos, atendidos primero.',
    tags: ['Auditor de contratos', 'Facturas', 'Leads'],
  },
  {
    icon: Store,
    name: 'Tiendas y comercios',
    text: 'Una web rápida, más reseñas en Google y una herramienta propia para tus pedidos o clientes.',
    tags: ['Página web', 'Reseñas', 'Software a medida'],
  },
  {
    icon: UtensilsCrossed,
    name: 'Bares y restaurantes',
    text: 'Carta y pedidos desde la mesa con NFC, el teléfono de reservas atendido y una web que llena mesas.',
    tags: ['VISAX NFC', 'Agente de voz', 'Página web'],
    href: site.nfcUrl,
  },
  {
    icon: Sparkles,
    name: '¿Otro sector?',
    text: 'Casi todo lo que se repite se puede automatizar. Cuéntanos tu caso y te decimos cómo.',
    tags: ['A tu medida'],
    href: '/#reservar',
  },
];

export function UseCases() {
  return (
    <section id="ejemplos" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Ideas por sector"
          title={
            <>
              ¿Qué puedo automatizar
              <br />
              <span className="text-gradient italic">en mi negocio?</span>
            </>
          }
          intro="Lo que suelen pedirnos según el tipo de negocio. Cada caso es distinto: te lo adaptamos."
        />
      </div>

      {/* Móvil: carrusel deslizable. Escritorio: rejilla */}
      <div className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[clamp(1.25rem,5vw,3rem)] pb-2 lg:container-x lg:grid lg:grid-cols-3 lg:overflow-visible">
        {sectors.map((s) => {
          const body = (
            <>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient-soft text-brand-cyan">
                  <s.icon className="h-5 w-5" />
                </span>
                {s.href && <ArrowUpRight className="h-5 w-5 text-ink-faint transition group-hover:text-white" />}
              </div>
              <h3 className="mt-5 font-display text-2xl leading-tight">{s.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.text}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                {s.tags.map((t) => (
                  <span key={t} className="rounded-full border border-ink-line px-3 py-1 text-xs text-ink-soft">
                    {t}
                  </span>
                ))}
              </div>
            </>
          );
          const cls =
            'card-fx group flex w-[82%] shrink-0 snap-start flex-col rounded-[var(--radius)] border border-ink-line bg-bg-soft/70 p-6 sm:w-[46%] lg:w-auto';
          return s.href ? (
            <a
              key={s.name}
              href={s.href}
              target={s.href.startsWith('http') ? '_blank' : undefined}
              rel={s.href.startsWith('http') ? 'noopener' : undefined}
              className={cls}
            >
              {body}
            </a>
          ) : (
            <div key={s.name} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
