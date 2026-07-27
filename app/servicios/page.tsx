import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { Reveal } from '@/components/ui/Reveal';
import { services } from '@/lib/services';

export const metadata: Metadata = {
  title: 'Servicios de automatización con IA',
  description:
    'Todas las automatizaciones con IA de VISAX AI: recepcionista virtual, agente de voz, presupuestos y contratos, cobros, facturas, reputación y más.',
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
              Nuestras <span className="text-gradient italic">automatizaciones</span> con IA
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-soft">
              Procesos reales que ponemos en piloto automático para negocios de servicios,
              despachos, clínicas, reformas y más. Elige el que te quita más horas.
            </p>

            <div className="mt-16 flex flex-col gap-4">
              {services.map((service, i) => (
                <Reveal key={service.slug} delay={i * 0.03}>
                  <article className="group grid gap-6 rounded-[var(--radius)] border border-ink-line bg-bg-soft/40 p-8 transition-colors hover:border-brand-blue/40 md:grid-cols-[auto_1fr_auto] md:items-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-line bg-white/[0.05] text-brand-cyan">
                      <service.icon className="h-7 w-7" />
                    </span>
                    <div>
                      <h2 className="font-display text-2xl sm:text-3xl">{service.title}</h2>
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

            <div className="mt-16 flex flex-col items-center gap-6 rounded-[var(--radius)] border border-brand-violet/30 bg-brand-gradient-soft p-10 text-center">
              <h2 className="font-display text-3xl sm:text-4xl">¿No ves lo tuyo?</h2>
              <p className="max-w-xl text-ink-soft">
                Casi cualquier tarea repetitiva se puede automatizar con IA. Cuéntanos tu caso y te
                diseñamos una solución a medida.
              </p>
              <MagneticButton href="/#reservar" variant="primary">
                Reservar diagnóstico gratuito
              </MagneticButton>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
