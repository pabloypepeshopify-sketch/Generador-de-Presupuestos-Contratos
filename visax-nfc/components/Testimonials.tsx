import { Quote } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { site } from '@/lib/site.config';

/** Opiniones de clientes. Se oculta sola mientras `site.testimonials` esté vacío. */
export function Testimonials() {
  if (!site.testimonials.length) return null;
  return (
    <section id="opiniones" className="section">
      <div className="container-x">
        <SectionHeading eyebrow="Opiniones" title={<>Lo que dicen <span className="text-gradient italic">quienes ya lo usan</span></>} />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {site.testimonials.map((t) => (
            <figure key={t.name + t.business} className="rounded-[var(--radius)] border border-ink-line bg-bg-soft/60 p-7">
              <Quote className="h-6 w-6 text-brand-violet" />
              <blockquote className="mt-4 text-sm leading-relaxed">{t.text}</blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-semibold">{t.name}</span>
                <span className="block text-ink-soft">{t.business}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
