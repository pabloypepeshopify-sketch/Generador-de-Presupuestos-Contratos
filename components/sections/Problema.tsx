'use client';

import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { mensajes, problemas } from '@/content/home';

const EASE = [0.22, 1, 0.36, 1] as const;

/** El problema: las tarjetas aparecen desenfocadas y se aclaran al pasar el «escáner». */
export function Problema() {
  return (
    <section id="problema" aria-labelledby="problema-title" className="section">
      <div className="container-x grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div className="lg:sticky lg:top-32">
          <SectionHeading id="problema-title" eyebrow="El día a día" title="Lo que frena a tu empresa" accent="no siempre se ve." size="md" />
          <div className="mt-8 flex items-start gap-4 rounded-card border border-ink-line bg-white/[0.03] p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white">
              <Lightbulb className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-[15px] font-medium leading-snug">{mensajes.sinSaber}</p>
          </div>
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="relative grid gap-3 overflow-hidden rounded-card-lg sm:grid-cols-2"
        >
          {/* Escáner que recorre las tarjetas */}
          <div className="scan pointer-events-none absolute inset-0 z-10" aria-hidden="true">
            <div className="h-full w-24 bg-gradient-to-r from-transparent via-brand-cyan/20 to-transparent" />
          </div>
          {problemas.map((p, i) => (
            <motion.article
              key={p.title}
              variants={{
                hidden: { opacity: 0.25, filter: 'blur(8px)', y: 12 },
                show: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.9, ease: EASE, delay: 0.25 + i * 0.18 } },
              }}
              className="flex flex-col rounded-card border border-ink-line bg-bg-soft/70 p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-line bg-white/[0.04]">
                <p.icon className="h-5 w-5 text-ink-soft" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg tracking-tight">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.text}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
