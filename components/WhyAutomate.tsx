'use client';

import { motion } from 'framer-motion';
import { Clock, ShieldCheck, Headphones, TrendingUp, Wallet, Sparkle, X, Check } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';

const benefits = [
  { icon: Clock, title: 'Ahorra horas cada día' },
  { icon: ShieldCheck, title: 'Cero errores humanos' },
  { icon: Headphones, title: 'Atención 24/7' },
  { icon: TrendingUp, title: 'Más citas cerradas' },
  { icon: Wallet, title: 'Menos costes de personal' },
  { icon: Sparkle, title: 'Imagen profesional' },
];

const before = [
  'Respondes emails y llamadas a deshoras',
  'Se te escapan clientes por tardar en contestar',
  'Presupuestos y facturas a mano, propensos a errores',
  'Persigues impagos incómodamente',
  'Programas que no encajan y una web que no trae clientes',
];

const after = [
  'La IA responde, agenda y confirma sola, 24/7',
  'Cada lead recibe respuesta en segundos',
  'Documentos profesionales generados en un clic',
  'Los recordatorios de cobro se envían solos',
  'Software y web hechos a tu medida, que trabajan para ti',
];

export function WhyAutomate() {
  return (
    <section id="por-que" className="section relative">
      <div className="container-x">
        <SectionHeading
          eyebrow="Por qué automatizar con IA"
          title={
            <>
              Deja de trabajar <span className="text-gradient italic">para</span> tu negocio.
              <br />
              Que trabaje <span className="text-gradient italic">por</span> ti.
            </>
          }
          intro="Cada hora que dedicas a tareas repetitivas es una hora que no dedicas a crecer. La IA se encarga de lo tedioso; tú, de lo importante."
        />

        {/* Beneficios: solo icono y titular, para leerlos de un vistazo */}
        <RevealGroup className="mt-12 grid grid-cols-2 gap-3 lg:grid-cols-3" stagger={0.06}>
          {benefits.map((b) => (
            <RevealItem key={b.title}>
              <div className="flex h-full items-center gap-3 rounded-2xl border border-ink-line bg-bg-soft/50 p-4 sm:p-5">
                <b.icon className="h-5 w-5 shrink-0 text-brand-cyan sm:h-6 sm:w-6" />
                <h3 className="font-sans text-sm font-semibold leading-snug tracking-normal sm:text-base">{b.title}</h3>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* Antes vs Después */}
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-[var(--radius)] border border-ink-line bg-bg-soft/30 p-8"
          >
            <p className="eyebrow text-ink-faint">Antes</p>
            <h3 className="mt-2 font-display text-2xl text-ink-soft">Sin automatizar</h3>
            <ul className="mt-6 space-y-4">
              {before.map((item) => (
                <li key={item} className="flex items-start gap-3 text-ink-soft">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                    <X className="h-3 w-3" />
                  </span>
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="border-gradient relative overflow-hidden rounded-[var(--radius)] bg-brand-gradient-soft p-8 glow-blue"
          >
            <p className="eyebrow text-brand-cyan">Después</p>
            <h3 className="mt-2 font-display text-2xl">Con VISAX AI</h3>
            <ul className="mt-6 space-y-4">
              {after.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-cyan/20 text-brand-cyan">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-sm text-ink">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
