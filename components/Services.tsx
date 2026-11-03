'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, Nfc } from 'lucide-react';
import { categories, servicesIn, type CategoryId, type Service } from '@/lib/services';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { ServiceCard } from '@/components/ServiceCard';
import { cn } from '@/lib/utils';

/** Servicios agrupados por categoría, con barra de categorías fija al hacer scroll. */
export function Services() {
  const [active, setActive] = useState<Service | null>(null);
  const [current, setCurrent] = useState<CategoryId>(categories[0].id);
  const bar = useRef<HTMLDivElement>(null);

  // Marca en la barra la categoría que se está viendo.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setCurrent(hit.target.id as CategoryId);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    categories.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  // En móvil la barra se desliza sola para que la categoría activa quede a la vista.
  useEffect(() => {
    const el = bar.current;
    const chip = el?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!el || !chip) return;
    el.scrollTo({ left: chip.offsetLeft - (el.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' });
  }, [current]);

  // Escape cierra el detalle
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActive(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  return (
    <section id="servicios" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Servicios"
          title={
            <>
              Todo lo que hacemos
              <br />
              <span className="text-gradient italic">por tu negocio</span>
            </>
          }
          intro="Elige lo que te quita más tiempo. Pulsa cualquier servicio para ver cómo funciona y con qué herramientas trabaja."
        />

        {/* Barra de categorías: se queda fija debajo del menú mientras recorres los servicios */}
        <nav
          aria-label="Categorías de servicios"
          className="sticky top-[72px] z-30 -mx-[clamp(1.25rem,5vw,3rem)] mt-10 border-b border-ink-line bg-bg/95 px-[clamp(1.25rem,5vw,3rem)] py-3 sm:top-[80px]"
        >
          <div ref={bar} className="no-scrollbar relative flex gap-2 overflow-x-auto">
            {categories.map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                aria-current={current === c.id ? 'true' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  current === c.id
                    ? 'border-brand-violet/60 bg-brand-violet/15 text-white'
                    : 'border-ink-line text-ink-soft hover:text-white',
                )}
              >
                <c.icon className="h-4 w-4" /> {c.chip}
              </a>
            ))}
            <a
              href="#nfc"
              className="flex shrink-0 items-center gap-2 rounded-full border border-ink-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-white"
            >
              <Nfc className="h-4 w-4" /> Bares y restaurantes
            </a>
          </div>
        </nav>

        <div className="mt-6 flex flex-col">
          {categories.map((c) => {
            const list = servicesIn(c.id);
            return (
              <div key={c.id} id={c.id} className="scroll-mt-40 pt-12">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand-cyan">
                      <c.icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-2xl sm:text-3xl">{c.title}</h3>
                  </div>
                  <p className="max-w-md text-sm text-ink-soft sm:text-right">{c.intro}</p>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((service, i) => (
                    <ServiceCard key={service.slug} service={service} index={i} onOpen={setActive} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-5 rounded-[var(--radius)] border border-brand-violet/30 bg-brand-gradient-soft p-7 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-2xl">¿No sabes cuál necesitas?</p>
            <p className="mt-1 text-sm text-ink-soft">
              Cuéntanos cómo trabajas y te decimos qué te ahorra más tiempo. La llamada es gratis.
            </p>
          </div>
          <MagneticButton href="/#reservar" variant="primary" className="shrink-0">
            Reservar llamada <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </div>
      </div>

      {/* Detalle del servicio */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/75 p-4 sm:items-center"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius)] border border-ink-line bg-bg-raise p-7 shadow-card sm:p-8"
            >
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
              <p className="eyebrow mt-5">{categories.find((c) => c.id === active.category)?.title}</p>
              <h3 className="mt-2 font-display text-3xl">{active.title}</h3>
              <p className="mt-3 leading-relaxed text-ink-soft">{active.description}</p>

              <div className="mt-5 flex items-center gap-2 rounded-xl border border-brand-violet/20 bg-brand-gradient-soft px-4 py-3">
                <Check className="h-4 w-4 text-brand-cyan" />
                <span className="text-sm font-semibold">{active.result}</span>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs uppercase tracking-widest text-ink-faint">Trabaja con</p>
                <div className="flex flex-wrap gap-2">
                  {active.tools.map((t) => (
                    <span key={t} className="rounded-full border border-ink-line px-3 py-1 text-xs text-ink-soft">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <MagneticButton href="/#reservar" variant="primary" className="flex-1" onClick={() => setActive(null)}>
                  Lo quiero
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
