import { ArrowRight, ClipboardCheck, RefreshCw } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { Button } from '@/components/ui/Button';
import { diagnostico, fases } from '@/content/home';

/** Paso 0 (diagnóstico) + las cuatro fases en línea de tiempo. */
export function ComoTrabajamos() {
  return (
    <section id="como-trabajamos" aria-labelledby="como-title" className="section">
      <div className="container-x">
        <SectionHeading
          id="como-title"
          eyebrow="Cómo trabajamos"
          title={
            <>
              Un método claro.
              <br />
              <span className="text-gradient">Una mejora que no se detiene.</span>
            </>
          }
          intro="Empezamos conociendo tu empresa y, a partir de ahí, trabajamos en un ciclo que se repite cada mes."
        />

        {/* Paso 0 */}
        <div className="border-gradient mt-12 flex flex-col gap-6 rounded-card-lg bg-bg-soft/80 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
              <ClipboardCheck className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Paso 0 · La puerta de entrada</p>
              <h3 className="mt-1 text-2xl tracking-tight">{diagnostico.title}</h3>
              <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">{diagnostico.text}</p>
            </div>
          </div>
          <Button href="/#diagnostico" variant="primary" className="shrink-0">
            Solicitarlo <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Fases */}
        <RevealGroup className="relative mt-6" stagger={0.1}>
          {/* Línea que une las fases (escritorio) */}
          <div
            className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[2.25rem] hidden h-px bg-gradient-to-r from-brand-cyan via-brand-blue to-brand-violet opacity-50 lg:block"
            aria-hidden="true"
          />
          <ol className="grid gap-4 lg:grid-cols-4">
            {fases.map((f, i) => (
              <RevealItem
                as="li"
                key={f.title}
                className="relative flex h-full gap-4 rounded-card border border-ink-line bg-bg-soft/60 p-6 lg:flex-col lg:items-center lg:text-center"
              >
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ink-line bg-bg-raise text-accent">
                    <f.icon className="h-5 w-5" aria-hidden="true" />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand font-mono text-[10px] font-semibold text-white">
                      {i + 1}
                    </span>
                  </span>
                  <div>
                    <h3 className="text-xl tracking-tight lg:mt-4">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.text}</p>
                  </div>
              </RevealItem>
            ))}
          </ol>
        </RevealGroup>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-ink-soft">
          <RefreshCw className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          Y vuelta a empezar: cada mes revisamos lo hecho y buscamos la siguiente mejora.
        </p>
      </div>
    </section>
  );
}
