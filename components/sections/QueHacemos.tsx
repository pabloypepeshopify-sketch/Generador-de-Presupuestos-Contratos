import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { capacidades } from '@/content/home';

/** Qué hacemos: cuatro capacidades que combinamos, no productos para elegir. */
export function QueHacemos() {
  return (
    <section id="que-hacemos" aria-labelledby="que-hacemos-title" className="section">
      <div className="container-x">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <SectionHeading
            id="que-hacemos-title"
            eyebrow="Qué hacemos"
            title={
              <>
                Cuatro áreas de trabajo.
                <br />
                <span className="text-gradient">Un objetivo: que tu empresa funcione mejor.</span>
              </>
            }
          />
          <p className="max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg lg:pb-2">
            No tienes que elegir nada de un catálogo. Analizamos tu negocio y combinamos lo que necesita en cada momento: tú
            solo nos cuentas qué te gustaría mejorar.
          </p>
        </div>

        <RevealGroup className="mt-12 grid gap-4 md:grid-cols-2" stagger={0.08}>
          {capacidades.map((c, i) => (
            <RevealItem key={c.title}>
              <article className="card-fx group relative flex h-full flex-col overflow-hidden rounded-card-lg border border-ink-line bg-bg-soft/60 p-7 sm:p-8">
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.18),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden="true"
                />
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient-soft text-accent">
                    <c.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-xs text-ink-faint">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-2xl tracking-tight">{c.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">{c.text}</p>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
