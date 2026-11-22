import { Plus } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Pending } from '@/components/ui/Pending';
import { faqs } from '@/content/faq';
import { flags } from '@/config/flags';
import { site } from '@/lib/site.config';

/**
 * Preguntas frecuentes con <details>: accesibles y sin JavaScript.
 * Las preguntas sin respuesta confirmada solo salen fuera de producción.
 */
export function FAQ() {
  const visibles = faqs.filter((f) => f.a || flags.showPending);

  // Datos estructurados FAQPage solo con respuestas confirmadas
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs
      .filter((f) => f.a)
      .map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <section id="faq" aria-labelledby="faq-title" className="section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading
          id="faq-title"
          eyebrow="Preguntas frecuentes"
          title={
            <>
              Lo que nos
              <br />
              <span className="text-gradient">suelen preguntar.</span>
            </>
          }
          intro={
            <>
              ¿Otra duda? Llámanos al{' '}
              <a href={`tel:${site.phoneRaw}`} className="whitespace-nowrap text-ink underline-offset-4 hover:underline">
                {site.phone}
              </a>{' '}
              o al{' '}
              <a href={`tel:${site.callPhoneRaw}`} className="whitespace-nowrap text-ink underline-offset-4 hover:underline">
                {site.callPhone}
              </a>
              .
            </>
          }
        />
        <div className="border-t border-ink-line">
          {visibles.map((f) => (
            <details key={f.q} className="group border-b border-ink-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                <h3 className="text-lg font-semibold tracking-tight sm:text-xl">{f.q}</h3>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-line text-ink-soft transition duration-300 group-open:rotate-45 group-open:border-transparent group-open:bg-brand group-open:text-white">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </span>
              </summary>
              <div className="max-w-2xl pb-6 leading-relaxed text-ink-soft">
                {f.a && <p>{f.a}</p>}
                {f.pending && <Pending>{f.pending}</Pending>}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
