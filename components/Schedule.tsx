'use client';

import { motion } from 'framer-motion';
import { Clock, CalendarCheck, Zap, Phone, ArrowDown } from 'lucide-react';
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
          intro="Llámanos ahora o elige día y hora en el calendario. Te contamos exactamente cómo lo haríamos en tu negocio, sin compromiso."
        />

        {/* Dos formas de hablar: llamar ya o reservar en el calendario */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <a
            href={`tel:${site.callPhoneRaw}`}
            className="border-gradient group flex items-center gap-5 rounded-[var(--radius)] bg-bg-soft/60 p-6 transition-colors hover:bg-bg-soft"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-glow">
              <Phone className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs uppercase tracking-widest text-ink-faint">Llámanos ahora</span>
              <span className="block font-display text-3xl tabular-nums">{site.callPhone}</span>
              <span className="block text-sm text-ink-soft">
                {site.schedule.weekdays} · {site.schedule.hours}
              </span>
            </span>
          </a>
          <a
            href="#reservar-calendario"
            className="group flex items-center gap-5 rounded-[var(--radius)] border border-ink-line bg-bg-soft/40 p-6 transition-colors hover:border-brand-blue/40"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-ink-line bg-white/[0.05] text-brand-cyan">
              <CalendarCheck className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs uppercase tracking-widest text-ink-faint">O si lo prefieres</span>
              <span className="block font-display text-2xl">Reserva día y hora</span>
              <span className="block text-sm text-ink-soft">Elige un hueco en el calendario y te llamamos.</span>
            </span>
            <ArrowDown className="h-5 w-5 shrink-0 text-ink-faint transition group-hover:translate-y-0.5 group-hover:text-white" />
          </a>
        </div>

        <div id="reservar-calendario" className="mt-8 grid scroll-mt-24 gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Horario visual (en móvil, después del calendario: lo primero es reservar) */}
          <div className="order-last flex flex-col gap-6 lg:order-none">
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
