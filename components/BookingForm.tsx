'use client';

import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Send, AlertCircle } from 'lucide-react';
import { site } from '@/lib/site.config';
import { services } from '@/lib/services';

type Status = 'idle' | 'loading' | 'success' | 'error';

type Fields = {
  nombre: string;
  email: string;
  telefono: string;
  servicio: string;
  fecha: string;
  hora: string;
  mensaje: string;
};

const EMPTY: Fields = {
  nombre: '',
  email: '',
  telefono: '',
  servicio: services[0].title,
  fecha: '',
  hora: '',
  mensaje: '',
};

const inputClass =
  'w-full rounded-xl border border-ink-line bg-bg-soft/60 px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-brand-blue/60 focus:ring-2 focus:ring-brand-blue/20';

export function BookingForm() {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});

  const set = (k: keyof Fields, v: string) => {
    setFields((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof Fields, string>> = {};
    if (!fields.nombre.trim()) e.nombre = 'Dinos tu nombre';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) e.email = 'Email no válido';
    if (!fields.telefono.trim() || fields.telefono.replace(/\D/g, '').length < 9)
      e.telefono = 'Teléfono no válido';
    if (!fields.fecha) e.fecha = 'Elige una fecha';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setStatus('loading');

    const payload = {
      ...fields,
      origen: 'web-visax-ai',
      enviadoEn: new Date().toISOString(),
    };

    try {
      // ── ENVÍO AL WEBHOOK DE MAKE ────────────────────────────────
      // El escenario de Make crea el evento en Google Calendar y envía
      // el email de confirmación. Los webhooks de Make no devuelven
      // cabeceras CORS, por eso usamos `no-cors` (respuesta opaca) y
      // asumimos éxito si la petición no lanza error de red.
      //
      // Si aún NO tienes el webhook activo, comenta el bloque `await`
      // siguiente y la web seguirá mostrando la animación de éxito.
      if (site.makeWebhook) {
        await fetch(site.makeWebhook, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setStatus('success');
      setFields(EMPTY);
    } catch (err) {
      console.error('Error enviando la reserva:', err);
      setStatus('error');
    }
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-5 rounded-[var(--radius)] border border-brand-blue/30 bg-brand-gradient-soft px-8 py-16 text-center"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-brand shadow-glow"
            >
              <Check className="h-10 w-10 text-white" strokeWidth={3} />
            </motion.span>
            <h3 className="font-display text-3xl">¡Cita solicitada!</h3>
            <p className="max-w-sm text-ink-soft">
              Hemos recibido tu solicitud. Te confirmaremos por email en breve. Si tienes prisa,
              llámanos al{' '}
              <a href={`tel:${site.phoneRaw}`} className="text-gradient font-semibold">
                {site.phone}
              </a>
              .
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-2 rounded-full border border-ink-line px-5 py-2.5 text-sm font-medium text-ink-soft transition hover:text-white"
            >
              Enviar otra solicitud
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={onSubmit}
            noValidate
            className="glass rounded-[var(--radius)] p-6 sm:p-8"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" error={errors.nombre}>
                <input
                  className={inputClass}
                  placeholder="Tu nombre"
                  value={fields.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                  autoComplete="name"
                />
              </Field>
              <Field label="Email" error={errors.email}>
                <input
                  className={inputClass}
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={fields.email}
                  onChange={(e) => set('email', e.target.value)}
                  autoComplete="email"
                />
              </Field>
              <Field label="Teléfono" error={errors.telefono}>
                <input
                  className={inputClass}
                  type="tel"
                  placeholder="+34 600 000 000"
                  value={fields.telefono}
                  onChange={(e) => set('telefono', e.target.value)}
                  autoComplete="tel"
                />
              </Field>
              <Field label="Servicio de interés">
                <select
                  className={inputClass}
                  value={fields.servicio}
                  onChange={(e) => set('servicio', e.target.value)}
                >
                  {services.map((s) => (
                    <option key={s.slug} value={s.title} className="bg-bg-soft">
                      {s.title}
                    </option>
                  ))}
                  <option value="Automatización a medida" className="bg-bg-soft">
                    Automatización a medida
                  </option>
                </select>
              </Field>
              <Field label="Fecha preferida" error={errors.fecha}>
                <input
                  className={inputClass}
                  type="date"
                  value={fields.fecha}
                  onChange={(e) => set('fecha', e.target.value)}
                />
              </Field>
              <Field label="Hora preferida">
                <input
                  className={inputClass}
                  type="time"
                  value={fields.hora}
                  onChange={(e) => set('hora', e.target.value)}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Mensaje (opcional)">
                <textarea
                  className={inputClass}
                  rows={3}
                  placeholder="Cuéntanos brevemente qué te gustaría automatizar…"
                  value={fields.mensaje}
                  onChange={(e) => set('mensaje', e.target.value)}
                />
              </Field>
            </div>

            {status === 'error' && (
              <p className="mt-4 flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                Ha ocurrido un error. Inténtalo de nuevo o llámanos al {site.phone}.
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              data-cursor="Enviar"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-7 py-4 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-70"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  Solicitar cita <Send className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs text-ink-faint">
              Al enviar aceptas nuestra política de privacidad. Sin spam, lo prometemos.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">{label}</span>
      {children}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  );
}
