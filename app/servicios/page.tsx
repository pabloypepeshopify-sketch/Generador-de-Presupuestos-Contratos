import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Check, Nfc } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { Reveal } from '@/components/ui/Reveal';
import { categories, servicesIn } from '@/lib/services';
import { site } from '@/lib/site.config';

export const metadata: Metadata = {
  title: 'Servicios: automatizaciones con IA, software y páginas web',
  description:
    'Todos los servicios de VISAX AI: recepcionista virtual, agente de voz, presupuestos y contratos, cobros, facturas, reputación, automatizaciones y software a medida y páginas web.',
};

export default function ServiciosPage() {
  return (
    <>
      <Header />
      <main className="pt-32">
        <section className="section pt-10">
          <div className="container-x">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Volver al inicio
            </Link>
            <h1 className="mt-8 max-w-4xl font-display text-5xl leading-[1.02] sm:text-7xl">
              Todos nuestros <span className="text-gradient italic">servicios</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-soft">
              Automatizaciones con IA, software y páginas web para negocios de servicios, despachos, clínicas, reformas,
              comercios y más. Elige lo que te quita más horas.
            </p>

            <nav aria-label="Categorías" className="mt-10 flex flex-wrap gap-2">
              {categories.map((c) => (
                <a
                  key={c.id}
                  href={`#${c.id}`}
                  className="flex items-center gap-2 rounded-full border border-ink-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-white"
                >
                  <c.icon className="h-4 w-4" /> {c.chip}
                </a>
              ))}
            </nav>

            {categories.map((c) => (
              <div key={c.id} id={c.id} className="scroll-mt-28 pt-16">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand-cyan">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <h2 className="font-display text-3xl sm:text-4xl">{c.title}</h2>
                </div>
                <p className="mt-3 max-w-2xl text-ink-soft">{c.intro}</p>

                <div className="mt-8 flex flex-col gap-4">
                  {servicesIn(c.id).map((service, i) => (
                    <Reveal key={service.slug} delay={i * 0.03} amount={0.15}>
                      <article
                        id={service.slug}
                        className="grid scroll-mt-28 gap-6 rounded-[var(--radius)] border border-ink-line bg-bg-soft/40 p-7 transition-colors hover:border-brand-blue/40 md:grid-cols-[auto_1fr_auto] md:items-center sm:p-8"
                      >
                        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-line bg-white/[0.05] text-brand-cyan">
                          <service.icon className="h-7 w-7" />
                        </span>
                        <div>
                          <h3 className="font-display text-2xl sm:text-3xl">{service.title}</h3>
                          <p className="mt-2 max-w-2xl text-ink-soft">{service.description}</p>
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-gradient">
                              <Check className="h-4 w-4 text-brand-cyan" /> {service.result}
                            </span>
                            <span className="hidden text-ink-faint sm:inline">·</span>
                            <div className="flex flex-wrap gap-2">
                              {service.tools.map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full border border-ink-line px-2.5 py-0.5 text-xs text-ink-faint"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="md:justify-self-end">
                          <MagneticButton href="/#reservar" variant="secondary">
                            Lo quiero
                          </MagneticButton>
                        </div>
                      </article>
                    </Reveal>
                  ))}
                </div>
              </div>
            ))}

            <a
              href={site.nfcUrl}
              target="_blank"
              rel="noopener"
              className="group mt-16 flex flex-col items-start justify-between gap-5 rounded-[var(--radius)] border border-ink-line bg-bg-soft/40 p-7 transition-colors hover:border-brand-violet/50 sm:flex-row sm:items-center sm:p-8"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient-soft text-brand-cyan">
                  <Nfc className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl">¿Tienes un bar o un restaurante?</h2>
                  <p className="mt-1 text-ink-soft">
                    Carta, pedidos en mesa, WiFi y reseñas con un toque del móvil, en nuestra tienda VISAX NFC.
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 font-semibold">
                Ir a la tienda NFC <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </a>

            <div className="mt-6 flex flex-col items-center gap-6 rounded-[var(--radius)] border border-brand-violet/30 bg-brand-gradient-soft p-10 text-center">
              <h2 className="font-display text-3xl sm:text-4xl">¿No ves lo tuyo?</h2>
              <p className="max-w-xl text-ink-soft">
                Casi cualquier tarea repetitiva se puede automatizar con IA. Cuéntanos tu caso y te diseñamos una solución a
                medida.
              </p>
              <MagneticButton href="/#reservar" variant="primary">
                Reserva una llamada gratis
              </MagneticButton>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
