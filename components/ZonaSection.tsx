import { MapPin } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { site } from '@/lib/site.config';

/** Dónde trabajamos: toda la provincia de Cádiz y de Sevilla. */
export function ZonaSection() {
  return (
    <section id="zona" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Dónde trabajamos"
          title={
            <>
              Trabajamos en toda
              <br />
              <span className="text-gradient italic">Cádiz y Sevilla</span>
            </>
          }
          intro={`Somos de ${site.zona.base} y trabajamos con negocios de toda la provincia de Cádiz y de Sevilla.`}
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {site.zona.provincias.map((p) => (
            <div key={p.nombre} className="card-fx rounded-[var(--radius)] border border-ink-line bg-bg-soft/70 p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient-soft text-brand-cyan">
                  <MapPin className="h-6 w-6" />
                </span>
                <div>
                  <p className="eyebrow">Provincia de</p>
                  <h3 className="font-display text-3xl">{p.nombre}</h3>
                </div>
              </div>
              <ul className="mt-6 flex flex-wrap gap-2">
                {p.pueblos.map((pueblo) => (
                  <li key={pueblo} className="rounded-full border border-ink-line px-3 py-1.5 text-sm text-ink-soft">
                    {pueblo}
                  </li>
                ))}
                <li className="rounded-full px-1 py-1.5 text-sm text-ink-faint">…y el resto de la provincia</li>
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
