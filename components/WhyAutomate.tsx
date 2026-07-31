'use client';

import { motion } from 'framer-motion';
import { Clock, ShieldCheck, Headphones, TrendingUp, Wallet, Sparkle, X, Check } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';

const benefits = [
  { icon: Clock, title: 'Ahorra horas cada día', text: 'Las tareas repetitivas dejan de comerse tu tiempo y el de tu equipo.' },
  { icon: ShieldCheck, title: 'Cero errores humanos', text: 'La IA no se despista, no olvida y sigue tus reglas al pie de la letra.' },
  { icon: Headphones, title: 'Atención 24/7', text: 'Responde, agenda y confirma incluso mientras duermes o estás de vacaciones.' },
  { icon: TrendingUp, title: 'Más citas cerradas', text: 'Ninguna oportunidad se enfría: cada lead recibe respuesta al instante.' },
  { icon: Wallet, title: 'Menos costes de personal', text: 'Automatizas lo que hoy exige contratar, sin nóminas ni bajas.' },
  { icon: Sparkle, title: 'Imagen profesional', text: 'Documentos, respuestas y seguimiento impecables que transmiten confianza.' },
];

const before = [
  'Respondes emails y llamadas a deshoras',
  'Se te escapan clientes por tardar en contestar',
  'Presupuestos y facturas a mano, propensos a errores',
  'Persigues impagos incómodamente',
  'Sin tiempo para hacer crecer el negocio',
];

const after = [
  'La IA responde, agenda y confirma sola, 24/7',
  'Cada lead recibe respuesta en segundos',
  'Documentos profesionales generados en un clic',
  'Los recordatorios de cobro se envían solos',
  'Te dedicas a lo que de verdad mueve tu negocio',
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

        {/* Beneficios */}
        <RevealGroup className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <RevealItem key={b.title}>
              <div className="group h-full rounded-2xl border border-ink-line bg-bg-soft/40 p-6 transition-colors hover:border-brand-blue/40">
                <b.icon className="h-7 w-7 text-brand-cyan transition-transform duration-300 group-hover:scale-110" />
                <h3 className="mt-4 font-display text-xl">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b.text}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* Antes vs Después */}
        <div className="mt-16 grid gap-4 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
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
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="border-gradient relative overflow-hidden rounded-[var(--radius)] bg-brand-gradient-soft p-8 glow-blue"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-blue/20 blur-3xl" />
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
