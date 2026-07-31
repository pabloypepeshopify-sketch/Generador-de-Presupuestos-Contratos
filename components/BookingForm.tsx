'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Loader2,
  Send,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { site } from '@/lib/site.config';

/* ───────────────────────── Tipos y utilidades ───────────────────────── */

type Availability = {
  inicio?: string;
  fin?: string;
  duracion?: string | number;
  ocupadas_inicio?: string | string[];
  ocupadas_fin?: string | string[];
};

type Slot = { min: number; label: string; reserved: boolean };

const pad = (n: number) => String(n).padStart(2, '0');
const fmtMin = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/**
 * Convierte una hora a minutos del día EN LA ZONA HORARIA DEL NEGOCIO.
 *  - "09:00" / "09:00:00"  → hora local del negocio, se usa tal cual.
 *  - ISO con zona ("...T10:00:00Z" o "+01:00") → se convierte a la zona
 *    del negocio (el calendario devuelve las ocupadas en UTC).
 *  - ISO sin zona ("...T09:00") → se toma la hora de pared directamente.
 */
function toMinutes(value?: string): number | null {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;

  const hasTime = /T\d{2}:\d{2}/.test(v);
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(v);

  // ISO absoluto (con Z u offset): convertir a la zona del negocio
  if (hasTime && hasZone) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: site.businessTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d);
      const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
      const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
      return hh * 60 + mm;
    }
  }
  // ISO sin zona: la hora de pared ya es la del negocio
  const iso = v.match(/T(\d{2}):(\d{2})/);
  if (iso) return +iso[1] * 60 + +iso[2];
  // Hora simple "HH:mm"
  const hm = v.match(/^(\d{1,2}):(\d{2})/);
  if (hm) return +hm[1] * 60 + +hm[2];
  return null;
}

/** Normaliza listas separadas por comas (o arrays) en array de strings. */
function parseList(value?: string | string[]): string[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : String(value).split(',');
  return arr.map((s) => String(s).trim()).filter(Boolean);
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const inputClass =
  'w-full rounded-xl border border-ink-line bg-bg-soft/60 px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-brand-blue/60 focus:ring-2 focus:ring-brand-blue/20';

/* ───────────────────────────── Componente ───────────────────────────── */

export function BookingForm() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [availState, setAvailState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [errors, setErrors] = useState<{ nombre?: string; email?: string }>({});
  const [submit, setSubmit] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  /* ── Disponibilidad (paso 2) ── */
  async function loadAvailability(fecha: string) {
    setAvailState('loading');
    setSelectedSlot(null);
    try {
      const res = await fetch(site.availabilityWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha }),
      });
      const text = await res.text();
      let data: Availability;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Respuesta no válida');
      }
      setAvail(data);
      setAvailState('done');
    } catch (err) {
      console.error('Error cargando disponibilidad:', err);
      setAvailState('error');
    }
  }

  function pickDay(fecha: string) {
    setSelectedDate(fecha);
    setSubmit('idle');
    loadAvailability(fecha);
    // Scroll suave hasta las horas en móvil
    setTimeout(() => {
      document.getElementById('slots-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }

  /* ── Tramos calculados (paso 3) ── */
  const slots: Slot[] = useMemo(() => {
    if (!avail) return [];
    const startMin = toMinutes(avail.inicio) ?? 9 * 60;
    const endMin = toMinutes(avail.fin) ?? 18 * 60;
    const dur = Math.max(5, parseInt(String(avail.duracion), 10) || 45);

    const occStarts = parseList(avail.ocupadas_inicio).map(toMinutes);
    const occEnds = parseList(avail.ocupadas_fin).map(toMinutes);
    const occ: Array<[number, number]> = [];
    for (let i = 0; i < Math.min(occStarts.length, occEnds.length); i++) {
      const a = occStarts[i];
      const b = occEnds[i];
      if (a != null && b != null) occ.push([a, b]);
    }

    const out: Slot[] = [];
    for (let m = startMin; m + dur <= endMin; m += dur) {
      const reserved = occ.some(([os, oe]) => m < oe && m + dur > os);
      out.push({ min: m, label: fmtMin(m), reserved });
    }
    return out;
  }, [avail]);

  const freeCount = slots.filter((s) => !s.reserved).length;

  /* ── Envío de la reserva (paso 5) ── */
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: { nombre?: string; email?: string } = {};
    if (!nombre.trim()) errs.nombre = 'Dinos tu nombre';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Email no válido';
    setErrors(errs);
    if (Object.keys(errs).length || !selectedDate || !selectedSlot) return;

    setSubmit('loading');
    const payload = {
      nombre: nombre.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      fecha: selectedDate,
      hora: selectedSlot,
    };
    try {
      // Envío garantizado (no-cors): el escenario de Make crea el evento
      // y manda el email de confirmación. No necesitamos leer la respuesta.
      await fetch(site.makeWebhook, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSubmit('success');
      // Paso 6: refrescamos la disponibilidad para que la hora recién
      // reservada aparezca ya tachada (damos margen a que Make la cree).
      setTimeout(() => selectedDate && loadAvailability(selectedDate), 2200);
    } catch (err) {
      console.error('Error enviando la reserva:', err);
      setSubmit('error');
    }
  }

  function resetForNewBooking() {
    setSubmit('idle');
    setSelectedSlot(null);
    setNombre('');
    setEmail('');
    setTelefono('');
  }

  /* ── Calendario ── */
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const canGoPrev = new Date(year, month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);

  const cells: Array<{ day: number; fecha: string; disabled: boolean } | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const weekday = (date.getDay() + 6) % 7; // 5=sáb, 6=dom
    const isWeekend = weekday >= 5;
    const isPast = date < today;
    const fecha = `${year}-${pad(month + 1)}-${pad(d)}`;
    cells.push({ day: d, fecha, disabled: isWeekend || isPast });
  }

  const prettyDate = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '';

  /* ── Éxito ── */
  if (submit === 'success') {
    return (
      <div className="glass rounded-[var(--radius)] p-6 sm:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-5 py-8 text-center"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-brand shadow-glow"
          >
            <Check className="h-10 w-10 text-white" strokeWidth={3} />
          </motion.span>
          <h3 className="font-display text-3xl">¡Cita reservada!</h3>
          <p className="max-w-sm text-ink-soft">
            Tu cita del <strong className="text-ink">{prettyDate}</strong> a las{' '}
            <strong className="text-ink">{selectedSlot}</strong> está solicitada. Te enviamos la
            confirmación a <strong className="text-ink">{email}</strong>.
          </p>
          <button
            onClick={resetForNewBooking}
            className="mt-2 rounded-full border border-ink-line px-5 py-2.5 text-sm font-medium text-ink-soft transition hover:text-white"
          >
            Reservar otra cita
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="glass rounded-[var(--radius)] p-5 sm:p-7">
      {/* Paso 1: calendario */}
      <div className="mb-2 flex items-center gap-2 text-brand-cyan">
        <CalendarDays className="h-5 w-5" />
        <h3 className="font-display text-xl text-ink">1 · Elige el día</h3>
      </div>
      <p className="mb-4 text-sm text-ink-soft">
        Solo de lunes a viernes. Los fines de semana están cerrados.
      </p>

      <div className="rounded-2xl border border-ink-line bg-bg-soft/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => canGoPrev && setView(new Date(year, month - 1, 1))}
            disabled={!canGoPrev}
            aria-label="Mes anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-line text-ink-soft transition enabled:hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-display text-lg capitalize">
            {MONTHS[month]} {year}
          </span>
          <button
            type="button"
            onClick={() => setView(new Date(year, month + 1, 1))}
            aria-label="Mes siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-line text-ink-soft transition hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((d) => (
            <span key={d} className="py-1 text-[11px] font-semibold text-ink-faint">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <span key={`e${i}`} />;
            const isSelected = cell.fecha === selectedDate;
            return (
              <button
                key={cell.fecha}
                type="button"
                disabled={cell.disabled}
                onClick={() => pickDay(cell.fecha)}
                aria-label={cell.fecha}
                aria-pressed={isSelected}
                className={[
                  'aspect-square rounded-lg text-sm font-medium transition',
                  cell.disabled
                    ? 'cursor-not-allowed text-ink-faint/30 line-through decoration-1'
                    : isSelected
                      ? 'bg-brand text-white shadow-glow'
                      : 'text-ink hover:bg-white/[0.06] hover:ring-1 hover:ring-brand-blue/40',
                ].join(' ')}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>

      <span id="slots-anchor" />

      {/* Paso 2/3: horas */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-6"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-brand-cyan">
                <Clock className="h-5 w-5" />
                <h3 className="font-display text-xl capitalize text-ink">2 · {prettyDate}</h3>
              </div>
              {availState === 'done' && (
                <button
                  type="button"
                  onClick={() => loadAvailability(selectedDate)}
                  className="flex items-center gap-1.5 text-xs text-ink-faint transition hover:text-white"
                  aria-label="Actualizar disponibilidad"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Actualizar
                </button>
              )}
            </div>

            {availState === 'loading' && (
              <div className="flex items-center gap-3 rounded-2xl border border-ink-line bg-bg-soft/40 px-4 py-8 text-ink-soft">
                <Loader2 className="h-5 w-5 animate-spin text-brand-cyan" />
                Consultando disponibilidad…
              </div>
            )}

            {availState === 'error' && (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-5 text-sm">
                <span className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="h-4 w-4" /> No pudimos cargar las horas.
                </span>
                <span className="text-ink-soft">
                  Vuelve a intentarlo o llámanos al{' '}
                  <a href={`tel:${site.phoneRaw}`} className="text-gradient font-semibold">
                    {site.phone}
                  </a>
                  .
                </span>
                <button
                  type="button"
                  onClick={() => loadAvailability(selectedDate)}
                  className="rounded-full border border-ink-line px-4 py-2 text-xs font-medium text-ink-soft transition hover:text-white"
                >
                  Reintentar
                </button>
              </div>
            )}

            {availState === 'done' && slots.length === 0 && (
              <p className="rounded-2xl border border-ink-line bg-bg-soft/40 px-4 py-6 text-sm text-ink-soft">
                No hay horario configurado para este día. Prueba con otra fecha.
              </p>
            )}

            {availState === 'done' && slots.length > 0 && (
              <>
                {freeCount === 0 && (
                  <p className="mb-3 text-sm text-ink-soft">
                    Este día está completo. Elige otra fecha con horas libres.
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => {
                    if (slot.reserved) {
                      return (
                        <div
                          key={slot.min}
                          aria-disabled="true"
                          title="Reservado"
                          className="flex cursor-not-allowed flex-col items-center rounded-xl border border-ink-line bg-bg-soft/20 py-2.5 text-center"
                        >
                          <span className="text-sm text-ink-faint/60 line-through decoration-ink-faint/60">
                            {slot.label}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider text-ink-faint/50">
                            Reservado
                          </span>
                        </div>
                      );
                    }
                    const active = selectedSlot === slot.label;
                    return (
                      <button
                        key={slot.min}
                        type="button"
                        onClick={() => setSelectedSlot(slot.label)}
                        aria-pressed={active}
                        className={[
                          'rounded-xl border py-3 text-sm font-semibold transition',
                          active
                            ? 'border-transparent bg-brand text-white shadow-glow'
                            : 'border-brand-blue/30 bg-brand-gradient-soft text-ink hover:border-brand-blue/60 hover:text-white',
                        ].join(' ')}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paso 4/5: datos y envío */}
      <AnimatePresence>
        {selectedSlot && (
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onSubmit={onSubmit}
            noValidate
            className="mt-6 border-t border-ink-line pt-6"
          >
            <div className="mb-4 flex items-center gap-2 text-brand-cyan">
              <Send className="h-5 w-5" />
              <h3 className="font-display text-xl text-ink">3 · Tus datos</h3>
            </div>
            <p className="mb-4 text-sm text-ink-soft">
              Reservas el <strong className="text-ink capitalize">{prettyDate}</strong> a las{' '}
              <strong className="text-gradient">{selectedSlot}</strong>.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">Nombre</span>
                <input
                  className={inputClass}
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    if (errors.nombre) setErrors((x) => ({ ...x, nombre: undefined }));
                  }}
                  autoComplete="name"
                />
                {errors.nombre && <span className="text-xs text-red-400">{errors.nombre}</span>}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">Email</span>
                <input
                  className={inputClass}
                  type="email"
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((x) => ({ ...x, email: undefined }));
                  }}
                  autoComplete="email"
                />
                {errors.email && <span className="text-xs text-red-400">{errors.email}</span>}
              </label>
            </div>
            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                Teléfono <span className="text-ink-faint">(opcional)</span>
              </span>
              <input
                className={inputClass}
                type="tel"
                placeholder="+34 600 000 000"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                autoComplete="tel"
              />
            </label>

            {submit === 'error' && (
              <p className="mt-4 flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                No se pudo enviar. Inténtalo de nuevo o llámanos al {site.phone}.
              </p>
            )}

            <button
              type="submit"
              disabled={submit === 'loading'}
              data-cursor="Reservar"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-7 py-4 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-70"
            >
              {submit === 'loading' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Reservando…
                </>
              ) : (
                <>
                  Confirmar cita a las {selectedSlot} <Send className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs text-ink-faint">
              Al reservar aceptas nuestra política de privacidad. Sin spam.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
