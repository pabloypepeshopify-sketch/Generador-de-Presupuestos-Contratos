'use client';

import { motion } from 'framer-motion';
import { Clock, CalendarCheck, Zap } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { BookingForm } from '@/components/BookingForm';
import { site } from '@/lib/site.config';

const days = [
  { d: 'Lun', open: true },
  { d: 'Mar', open: true },
  { d: 'Mié', open: true },
  { d: 'Jue', open: true },
  { d: 'Vie', open: true },
  { d: 'Sáb', open: false },
  { d: 'Dom', open: false },
];

export function Schedule() {
  return (
    <section id="reservar" className="section relative overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-1/4 h-[50vh] w-[50vh] rounded-full bg-brand-blue/10 blur-[130px]" />
      <div className="container-x">
        <SectionHeading
          eyebrow="Agenda tu reunión"
          title={
            <>
              Reserva una <span className="text-gradient italic">llamada gratuita</span>
            </>
          }
          intro="Cuéntanos qué quieres automatizar y te enseñamos exactamente cómo lo haríamos en tu negocio. Sin compromiso."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Horario visual */}
          <div className="flex flex-col gap-6">
            <div className="glass rounded-[var(--radius)] p-7">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-brand-cyan" />
                <h3 className="font-display text-xl">Horario de atención</h3>
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                {site.schedule.weekdays} · {site.schedule.hours} · {site.schedule.timezone}
              </p>

              <div className="mt-6 grid grid-cols-7 gap-2">
                {days.map((day, i) => (
                  <motion.div
                    key={day.d}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center ${
                      day.open
                        ? 'border-brand-blue/30 bg-brand-gradient-soft'
                        : 'border-ink-line bg-bg-soft/30'
                    }`}
                  >
                    <span className="text-xs font-medium text-ink-soft">{day.d}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        day.open ? 'bg-brand-cyan shadow-glow' : 'bg-ink-faint/40'
                      }`}
                    />
                    <span className="text-[10px] text-ink-faint">{day.open ? '9–19' : '—'}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="glass flex items-start gap-4 rounded-[var(--radius)] p-7">
              <Zap className="h-6 w-6 shrink-0 text-brand-violet" />
              <div>
                <h4 className="font-display text-lg">Y tus automatizaciones…</h4>
                <p className="mt-1 text-sm text-ink-soft">{site.schedule.note}</p>
              </div>
            </div>

            <div className="glass flex items-start gap-4 rounded-[var(--radius)] p-7">
              <CalendarCheck className="h-6 w-6 shrink-0 text-brand-cyan" />
              <div>
                <h4 className="font-display text-lg">Confirmación automática</h4>
                <p className="mt-1 text-sm text-ink-soft">
                  Al reservar, nuestro propio sistema crea el evento en el calendario y te envía el
                  email de confirmación. Lo que vendemos, lo usamos.
                </p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <BookingForm />
        </div>
      </div>
    </section>
  );
}
