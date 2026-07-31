'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';

const faqs = [
  {
    q: '¿Cuánto tarda en estar funcionando?',
    a: 'Depende de la automatización, pero la mayoría de proyectos están operativos en 1 a 3 semanas desde el diagnóstico. Los flujos más sencillos, en pocos días.',
  },
  {
    q: '¿Se integra con las herramientas que ya uso?',
    a: 'Sí. Trabajamos sobre tus herramientas actuales: Gmail, Google Calendar, Google Sheets, Slack, tu teléfono, tu CRM… No tienes que cambiar tu forma de trabajar.',
  },
  {
    q: '¿Qué coste tiene?',
    a: 'Cada automatización se presupuesta según su alcance. Empezamos con un diagnóstico gratuito y te damos un precio cerrado antes de nada, sin sorpresas.',
  },
  {
    q: '¿Es seguro? ¿Qué pasa con mis datos?',
    a: 'Sí. Usamos conexiones oficiales y seguras de cada plataforma, y tus datos permanecen en tus propias cuentas (tu Google, tu CRM). Nada sale de tu control.',
  },
  {
    q: '¿Necesito conocimientos técnicos?',
    a: 'Ninguno. Nosotros lo diseñamos, lo montamos y lo mantenemos. Tú solo recibes los resultados y, si quieres, un panel para verlo todo.',
  },
  {
    q: '¿Y si mi caso es diferente?',
    a: 'Casi todo lo repetitivo se puede automatizar. Cuéntanos tu proceso y te decimos con honestidad si tiene sentido automatizarlo y cómo.',
  },
];

function Item({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="border-b border-ink-line"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-6 py-6 text-left"
        aria-expanded={open}
      >
        <span className="font-display text-xl sm:text-2xl">{q}</span>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-line transition-all duration-300 ${
            open ? 'rotate-45 bg-brand text-white' : 'text-ink-soft'
          }`}
        >
          <Plus className="h-4 w-4" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-6 leading-relaxed text-ink-soft">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQ() {
  return (
    <section id="faq" className="section">
      <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading
          eyebrow="FAQ"
          title={
            <>
              Preguntas
              <br />
              <span className="text-gradient italic">frecuentes</span>
            </>
          }
          intro="¿Te queda alguna duda? Llámanos y te la resolvemos sin compromiso."
        />
        <div>
          {faqs.map((f, i) => (
            <Item key={f.q} q={f.q} a={f.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
