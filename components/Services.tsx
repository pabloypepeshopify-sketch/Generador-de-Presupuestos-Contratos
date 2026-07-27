'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles } from 'lucide-react';
import { services, customService, type Service } from '@/lib/services';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { ServiceCard } from '@/components/ServiceCard';

export function Services() {
  const [active, setActive] = useState<Service | null>(null);

  return (
    <section id="servicios" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Servicios"
          title={
            <>
              Automatizaciones que
              <br />
              <span className="text-gradient italic">trabajan por ti</span>
            </>
          }
          intro="Cada tarjeta es un proceso real que ya hemos puesto en piloto automático para negocios como el tuyo. Pásalos por encima y descúbrelos."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <ServiceCard key={service.slug} service={service} index={i} onOpen={setActive} />
          ))}

          {/* Tarjeta a medida */}
          <motion.a
            href="#contacto"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            data-cursor="Hablar"
            className="group relative flex flex-col items-start justify-between gap-8 overflow-hidden rounded-[var(--radius)] border border-brand-violet/30 bg-brand-gradient-soft p-7"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-2xl leading-tight">{customService.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{customService.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
                {customService.short} →
              </span>
            </div>
          </motion.a>
        </div>
      </div>

      {/* Modal de detalle */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="glass relative w-full max-w-lg overflow-hidden rounded-[var(--radius)] p-8 shadow-card"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-brand-blue/20 blur-3xl" />
              <button
                onClick={() => setActive(null)}
                className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-ink-line text-ink-soft transition hover:text-white"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>

              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-line bg-white/[0.05] text-brand-cyan">
                <active.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 font-display text-3xl">{active.title}</h3>
              <p className="mt-3 leading-relaxed text-ink-soft">{active.description}</p>

              <div className="mt-5 flex items-center gap-2 rounded-xl border border-brand-violet/20 bg-brand-gradient-soft px-4 py-3">
                <Check className="h-4 w-4 text-brand-cyan" />
                <span className="text-sm font-semibold">{active.result}</span>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs uppercase tracking-widest text-ink-faint">Integra con</p>
                <div className="flex flex-wrap gap-2">
                  {active.tools.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-ink-line px-3 py-1 text-xs text-ink-soft"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-7 flex gap-3">
                <MagneticButton href="#reservar" variant="primary" className="flex-1">
                  Quiero esto
                </MagneticButton>
                <MagneticButton href="/servicios" variant="secondary" className="flex-1">
                  Ver todos
                </MagneticButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
