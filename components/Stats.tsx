'use client';

import { motion } from 'framer-motion';
import { Counter } from '@/components/ui/Counter';
import { SectionHeading } from '@/components/ui/SectionHeading';

/**
 * Métricas grandes animadas. CIFRAS PLACEHOLDER: el dueño debe ajustarlas
 * con sus datos reales (ver README).
 */
const stats = [
  { value: 800, prefix: '+', suffix: '', label: 'Citas gestionadas por IA', decimals: 0 },
  { value: 90, prefix: '-', suffix: '%', label: 'Tiempo administrativo', decimals: 0 },
  { value: 24, prefix: '', suffix: '/7', label: 'Disponibilidad, sin descanso', decimals: 0 },
  { value: 1200, prefix: '+', suffix: 'h', label: 'Horas ahorradas al año', decimals: 0 },
];

export function Stats() {
  return (
    <section id="resultados" className="section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-60" />
      <div className="container-x relative">
        <SectionHeading
          eyebrow="Resultados"
          align="center"
          title={
            <>
              Números que <span className="text-gradient italic">cambian un negocio</span>
            </>
          }
          intro="Datos orientativos de lo que consigue automatizar con IA. Cifras de referencia — se ajustan a tu caso real."
          className="mx-auto items-center"
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="border-gradient group relative flex flex-col items-center rounded-[var(--radius)] bg-bg-soft/50 p-8 text-center"
            >
              <span className="font-display text-5xl tabular-nums text-gradient sm:text-6xl">
                <Counter
                  to={s.value}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  decimals={s.decimals}
                />
              </span>
              <span className="mt-3 text-sm text-ink-soft">{s.label}</span>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-ink-faint">
          * Cifras de referencia (placeholder). Personalízalas en{' '}
          <code className="text-ink-soft">components/Stats.tsx</code>.
        </p>
      </div>
    </section>
  );
}
