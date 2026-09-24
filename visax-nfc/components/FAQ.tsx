'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { site } from '@/lib/site.config';
import { cn } from '@/lib/utils';
import { faqs } from '@/lib/faqs';


export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="preguntas" className="section">
      <div className="container-x grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeading
          eyebrow="Preguntas"
          title={
            <>
              Lo que todo el mundo
              <br />
              <span className="text-gradient italic">pregunta antes de pedir</span>
            </>
          }
          intro={`¿Otra duda? Escríbenos al ${site.phone} por WhatsApp y te respondemos.`}
        />
        <div className="divide-y divide-ink-line border-y border-ink-line">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <h3>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left font-medium transition hover:text-white"
                  >
                    {f.q}
                    <Plus className={cn('h-5 w-5 shrink-0 text-brand-cyan transition-transform duration-300', isOpen && 'rotate-45')} />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-sm leading-relaxed text-ink-soft">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
