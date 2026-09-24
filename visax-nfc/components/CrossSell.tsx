import { ArrowUpRight, Sparkles } from 'lucide-react';
import { site } from '@/lib/site.config';

/** Venta cruzada con VISAX AI (automatizaciones). */
export function CrossSell() {
  return (
    <section id="automatizaciones" className="section">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[calc(var(--radius)*1.6)] border border-brand-violet/30 bg-brand-gradient-soft p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-violet/30 blur-[90px]" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="eyebrow flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-cyan" /> De los creadores de VISAX AI
              </p>
              <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
                Más reseñas… <span className="text-gradient italic">y que la IA haga el resto</span>
              </h2>
              <p className="mt-4 max-w-xl text-ink-soft">
                Con el <strong className="text-white">Radar de Reputación</strong> de VISAX AI, tras cada visita el cliente
                recibe una encuesta: a los contentos se les lleva a dejar reseña en Google y los descontentos se gestionan en
                privado, antes de que acaben en tu ficha. También automatizamos citas, llamadas, cobros y facturas.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <a
                href={`${site.aiUrl}/#servicios`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-[#06060B] transition hover:bg-brand-silver"
              >
                Ver automatizaciones <ArrowUpRight className="h-4 w-4" />
              </a>
              <p className="text-sm text-ink-soft">Diagnóstico gratuito, sin compromiso.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
