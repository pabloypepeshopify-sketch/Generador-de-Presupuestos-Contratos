import { Quote } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { flags } from '@/config/flags';
import { testimonios } from '@/content/testimonios';

/** Preparada pero oculta: no se pinta hasta activar el flag Y tener testimonios reales. */
export function Testimonios() {
  if (!flags.testimonials || testimonios.length === 0) return null;
  return (
    <section id="testimonios" aria-labelledby="testimonios-title" className="section">
      <div className="container-x">
        <SectionHeading id="testimonios-title" eyebrow="Clientes" title="Lo que dicen de trabajar con nosotros" />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {testimonios.map((t) => (
            <figure key={t.name} className="flex h-full flex-col rounded-card border border-ink-line bg-bg-soft/60 p-6">
              <Quote className="h-6 w-6 text-accent" aria-hidden="true" />
              <blockquote className="mt-4 flex-1 leading-relaxed">{t.quote}</blockquote>
              <figcaption className="mt-5 text-sm text-ink-soft">
                <strong className="text-ink">{t.name}</strong> · {t.company}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
