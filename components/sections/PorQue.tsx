import { MapPin } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { razones } from '@/content/home';
import { site } from '@/lib/site.config';

/** Por qué VISAX AI + quiénes somos (fundadores reales) + dónde trabajamos. */
export function PorQue() {
  return (
    <section id="por-que" aria-labelledby="por-que-title" className="section">
      <div className="container-x">
        <SectionHeading
          id="por-que-title"
          eyebrow="Por qué VISAX AI"
          title={
            <>
              Un socio cercano,
              <br />
              <span className="text-gradient">no un proveedor más.</span>
            </>
          }
        />

        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {razones.map((r) => (
            <RevealItem key={r.title}>
              <article className="flex h-full gap-4 rounded-card border border-ink-line bg-bg-soft/60 p-6">
                <r.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <div>
                  <h3 className="text-lg tracking-tight">{r.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{r.text}</p>
                </div>
              </article>
            </RevealItem>
          ))}

          {/* Quiénes somos */}
          <RevealItem className="sm:col-span-2 lg:col-span-2">
            <article
              id="nosotros"
              className="border-gradient flex h-full flex-col gap-6 rounded-card bg-bg-soft/80 p-6 sm:p-7 md:flex-row md:items-center"
            >
              <div className="flex shrink-0 -space-x-3" aria-hidden="true">
                {site.founders.map((f) => (
                  <span
                    key={f.name}
                    className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-bg bg-brand text-lg font-semibold text-white"
                  >
                    {f.initials}
                  </span>
                ))}
              </div>
              <div>
                <h3 className="text-xl tracking-tight">Quiénes somos</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  VISAX AI la fundamos{' '}
                  <strong className="font-semibold text-ink">{site.founders.map((f) => f.name).join(' y ')}</strong>. Somos
                  un equipo pequeño y local, y eso juega a tu favor: hablas siempre con nosotros, conocemos tu negocio de
                  primera mano y podemos ir a verte cuando haga falta.
                </p>
              </div>
            </article>
          </RevealItem>
        </RevealGroup>

        {/* Dónde trabajamos */}
        <div id="zona" className="mt-4 rounded-card border border-ink-line bg-bg-soft/60 p-6 sm:p-7">
          <p className="flex items-start gap-2 text-lg font-semibold tracking-tight">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            Desde {site.zona.base}, en toda la provincia de Cádiz y Sevilla
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {site.zona.provincias.map((p) => (
              <div key={p.nombre}>
                <p className="eyebrow">Provincia de {p.nombre}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {p.pueblos.map((pueblo) => (
                    <li key={pueblo} className="rounded-full border border-ink-line px-3 py-1 text-xs text-ink-soft">
                      {pueblo}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
