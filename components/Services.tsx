'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { X, Check, Sparkles } from 'lucide-react';
import { services, customService, type Service } from '@/lib/services';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { ServiceCard } from '@/components/ServiceCard';

const PARALLAX_RATIO = 0.08; // laterales un 8 % más lentos que la columna central
const PARALLAX_MAX = 40; // px: tope para que las filas no se descuadren

export function Services() {
  const [active, setActive] = useState<Service | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Parallax solo con 3 columnas (≥1024 px) y sin movimiento reducido.
  useEffect(() => {
    if (!grid.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const sides = gsap.utils.toArray<HTMLElement>('[data-lateral]', grid.current);
      const setY = sides.map((el) => gsap.quickSetter(el, 'y', 'px'));
      gsap.set(sides, { willChange: 'transform' });
      ScrollTrigger.create({
        trigger: grid.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          // 0 cuando el grid está centrado en pantalla; se retrasa al alejarse.
          const mid = (self.start + self.end) / 2;
          const y = gsap.utils.clamp(
            -PARALLAX_MAX,
            PARALLAX_MAX,
            (self.scroll() - mid) * PARALLAX_RATIO,
          );
          setY.forEach((set) => set(y));
        },
      });
      return () => gsap.set(sides, { clearProps: 'transform,willChange' });
    });
    return () => mm.revert();
  }, []);

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

        <div ref={grid} className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <div key={service.slug} data-lateral={i % 3 !== 1 ? '' : undefined}>
              <ServiceCard service={service} index={i} onOpen={setActive} />
            </div>
          ))}

          {/* Tarjeta a medida */}
          <div data-lateral={services.length % 3 !== 1 ? '' : undefined}>
            <motion.a
              href="#contacto"
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.4,
                delay: (services.length % 3) * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              data-cursor="Hablar"
              className="card-fx group relative flex h-full flex-col items-start justify-between gap-8 overflow-hidden rounded-[var(--radius)] border border-brand-violet/30 bg-brand-gradient-soft p-7"
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
