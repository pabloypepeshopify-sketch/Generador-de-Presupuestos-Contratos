import { MessageCircle, ShieldCheck } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { site } from '@/lib/site.config';

/** Quiénes somos: los fundadores, para que el cliente sepa con quién habla. */
export function Founders() {
  return (
    <section id="nosotros" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Quiénes somos"
          title={
            <>
              Detrás de VISAX
              <br />
              <span className="text-gradient italic">hay personas</span>
            </>
          }
          intro={`VISAX la fundamos ${site.founders.map((f) => f.name).join(' y ')}. Desde el primer mensaje hablas con nosotros: escuchamos cómo trabaja tu negocio, diseñamos la automatización y la ponemos en marcha contigo.`}
        />
        <RevealGroup className="mt-14 grid gap-5 md:grid-cols-2" stagger={0.08}>
          {site.founders.map((f) => (
            <RevealItem key={f.name}>
              <div className="card-fx flex h-full items-center gap-6 rounded-[var(--radius)] border border-ink-line bg-bg-soft/60 p-7">
                <span
                  aria-hidden="true"
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-gradient font-display text-2xl font-semibold text-white shadow-glow"
                >
                  {f.initials}
                </span>
                <div>
                  <h3 className="font-display text-2xl leading-tight">{f.name}</h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {f.role} de {site.name}
                  </p>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
        <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <ShieldCheck className="h-4 w-4 shrink-0 text-brand-cyan" />
            Trato directo, sin intermediarios ni centralitas.
          </p>
          {site.whatsapp && (
            <MagneticButton href={`https://wa.me/${site.whatsapp}`} variant="secondary" cursorLabel="Hablar">
              <MessageCircle className="h-4 w-4" /> Háblanos por WhatsApp
            </MagneticButton>
          )}
        </div>
      </div>
    </section>
  );
}
