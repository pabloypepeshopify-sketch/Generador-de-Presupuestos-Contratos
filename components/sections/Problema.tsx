import { Lightbulb } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { mensajes, problemas } from '@/content/home';

export function Problema() {
  return (
    <section id="problema" aria-labelledby="problema-title" className="section">
      <div className="container-x">
        <SectionHeading
          id="problema-title"
          eyebrow="El día a día"
          title={
            <>
              Lo que frena a tu empresa
              <br />
              <span className="text-ink-soft">no siempre se ve.</span>
            </>
          }
        />

        <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
          {problemas.map((p) => (
            <RevealItem key={p.title}>
              <article className="flex h-full flex-col rounded-card border border-ink-line bg-bg-soft/60 p-6">
                <p.icon className="h-6 w-6 text-ink-soft" aria-hidden="true" />
                <h3 className="mt-5 text-lg tracking-tight">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.text}</p>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>

        <div className="mt-6 flex items-start gap-4 rounded-card border border-brand-violet/30 bg-brand-gradient-soft p-6 sm:items-center sm:p-7">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <Lightbulb className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-base font-medium leading-snug sm:text-lg">{mensajes.sinSaber}</p>
        </div>
      </div>
    </section>
  );
}
