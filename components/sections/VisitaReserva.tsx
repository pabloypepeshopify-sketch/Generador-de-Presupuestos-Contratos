'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { Honeypot, PrivacyCheck, SelectField, TextArea, TextField } from '@/components/ui/Field';
import { SECTOR_OPTIONS, limpiarVisita, validarVisita, type Errors, type Visita } from '@/lib/forms';
import { site } from '@/lib/site.config';
import { cn } from '@/lib/utils';

type Hueco = { hora: string; libre: boolean };

// Mismos límites que el flujo de n8n (antelación mínima y plazo máximo).
const MAX_DIAS = 60;
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** «lunes 23 de noviembre» */
const bonita = (fecha: string) =>
  new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const VACIO: Omit<Visita, 'fecha' | 'hora'> = {
  nombre: '',
  empresa: '',
  sector: '',
  email: '',
  telefono: '',
  direccion: '',
  localidad: '',
  mensaje: '',
  privacidad: false,
};

/** Calendario de visitas: huecos reales de Google Calendar (vía /api → n8n) y reserva. */
export function VisitaReserva() {
  // El calendario depende de la fecha de hoy: solo se pinta en el navegador (sin desajustes de hidratación).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const limite = useMemo(() => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + MAX_DIAS), [hoy]);

  const [vista, setVista] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [fecha, setFecha] = useState<string | null>(null);
  const [huecos, setHuecos] = useState<Hueco[]>([]);
  const [estadoHuecos, setEstadoHuecos] = useState<'idle' | 'cargando' | 'error' | 'ok'>('idle');
  const [hora, setHora] = useState<string | null>(null);

  const [d, setD] = useState(VACIO);
  const [errors, setErrors] = useState<Errors<Visita>>({});
  const [envio, setEnvio] = useState<'idle' | 'enviando' | 'ok' | 'error' | 'ocupado'>('idle');
  const [trampa, setTrampa] = useState('');
  const pintado = useRef(0);
  const aviso = useRef<HTMLDivElement>(null);
  useEffect(() => {
    pintado.current = Date.now();
  }, []);

  async function cargarHuecos(f: string) {
    setEstadoHuecos('cargando');
    setHora(null);
    try {
      const res = await fetch('/api/visitas/disponibilidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: f }),
      });
      const body = await res.json();
      if (!res.ok || !Array.isArray(body.huecos)) throw new Error('sin huecos');
      setHuecos(body.huecos);
      setEstadoHuecos('ok');
    } catch {
      setHuecos([]);
      setEstadoHuecos('error');
    }
  }

  function elegirDia(f: string) {
    setFecha(f);
    setEnvio('idle');
    cargarHuecos(f);
    setTimeout(() => document.getElementById('visita-horas')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  }

  const set = <K extends keyof typeof VACIO>(k: K, v: (typeof VACIO)[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const limpio = limpiarVisita({ ...d, fecha: fecha ?? '', hora: hora ?? '' });
    const errs = validarVisita(limpio);
    setErrors(errs);
    const primero = Object.keys(errs)[0];
    if (primero) {
      (document.getElementById(`f-v-${primero}`) ?? document.getElementById('visita-horas'))?.focus();
      return;
    }
    setEnvio('enviando');
    try {
      const res = await fetch('/api/visitas/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...limpio, web: trampa, t: Date.now() - pintado.current }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) setEnvio('ok');
      else if (res.status === 409 || body.error === 'hueco') {
        setEnvio('ocupado');
        if (fecha) cargarHuecos(fecha);
      } else setEnvio('error');
    } catch {
      setEnvio('error');
    }
    setTimeout(() => aviso.current?.focus(), 50);
  }

  /* ── Celdas del mes ── */
  const y = vista.getFullYear();
  const m = vista.getMonth();
  const primerDia = (new Date(y, m, 1).getDay() + 6) % 7;
  const diasMes = new Date(y, m + 1, 0).getDate();
  const puedeAtras = new Date(y, m, 1) > new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const puedeAdelante = new Date(y, m + 1, 1) <= limite;
  const celdas: Array<{ dia: number; fecha: string; off: boolean } | null> = [];
  for (let i = 0; i < primerDia; i++) celdas.push(null);
  for (let dia = 1; dia <= diasMes; dia++) {
    const fecha = new Date(y, m, dia);
    const finde = (fecha.getDay() + 6) % 7 >= 5;
    celdas.push({ dia, fecha: iso(fecha), off: finde || fecha <= hoy || fecha > limite });
  }

  if (envio === 'ok' && fecha && hora) {
    return (
      <div ref={aviso} tabIndex={-1} role="status" className="glass flex flex-col items-center gap-5 rounded-card-lg p-8 text-center outline-none sm:p-12">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-glow"
        >
          <Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" />
        </motion.span>
        <h3 className="text-2xl tracking-tight">¡Visita solicitada!</h3>
        <p className="max-w-md text-ink-soft">
          Te la hemos apuntado para el <strong className="text-ink">{bonita(fecha)}</strong> a las{' '}
          <strong className="text-ink">{hora}</strong>. Te llamamos para confirmarla.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      {/* Paso 1 y 2: día y hora */}
      <div className="glass rounded-card-lg p-5 sm:p-7">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-accent" aria-hidden="true" />
          <h3 className="text-lg tracking-tight">1 · Elige el día</h3>
        </div>
        <p className="mt-1 text-sm text-ink-soft">De lunes a viernes, a partir de mañana.</p>

        <div className="mt-4 rounded-2xl border border-ink-line bg-bg/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => puedeAtras && setVista(new Date(y, m - 1, 1))}
              disabled={!mounted || !puedeAtras}
              aria-label="Mes anterior"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-line text-ink-soft transition enabled:hover:text-ink disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold capitalize" aria-live="polite">
              {mounted ? `${MESES[m]} ${y}` : ' '}
            </span>
            <button
              type="button"
              onClick={() => puedeAdelante && setVista(new Date(y, m + 1, 1))}
              disabled={!mounted || !puedeAdelante}
              aria-label="Mes siguiente"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-line text-ink-soft transition enabled:hover:text-ink disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center" aria-hidden="true">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1 text-[11px] font-semibold text-ink-faint">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {!mounted && Array.from({ length: 35 }, (_, i) => <span key={i} className="aspect-square rounded-lg bg-white/[0.03]" />)}
            {mounted &&
              celdas.map((c, i) => {
                if (!c) return <span key={`v${i}`} />;
                const sel = c.fecha === fecha;
                return (
                  <button
                    key={c.fecha}
                    type="button"
                    disabled={c.off}
                    onClick={() => elegirDia(c.fecha)}
                    aria-label={bonita(c.fecha)}
                    aria-pressed={sel}
                    className={cn(
                      'aspect-square rounded-lg text-sm font-medium transition',
                      c.off
                        ? 'cursor-not-allowed text-ink-faint/40'
                        : sel
                          ? 'bg-white text-[#06060B] shadow-glow'
                          : 'text-ink hover:bg-white/[0.07] hover:ring-1 hover:ring-brand-blue/40',
                    )}
                  >
                    {c.dia}
                  </button>
                );
              })}
          </div>
        </div>

        <div id="visita-horas" tabIndex={-1} className="mt-6 outline-none">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" aria-hidden="true" />
              <h3 className="text-lg tracking-tight">2 · Elige la hora</h3>
            </div>
            {fecha && estadoHuecos === 'ok' && (
              <button
                type="button"
                onClick={() => cargarHuecos(fecha)}
                className="flex items-center gap-1.5 text-xs text-ink-faint transition hover:text-ink"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Actualizar
              </button>
            )}
          </div>
          <div className="mt-3" aria-live="polite">
            {!fecha && <p className="text-sm text-ink-soft">Primero elige un día en el calendario.</p>}
            {fecha && estadoHuecos === 'cargando' && (
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" /> Mirando huecos libres…
              </p>
            )}
            {fecha && estadoHuecos === 'error' && (
              <p className="text-sm text-ink-soft">
                Ahora mismo no podemos consultar el calendario. Llámanos al{' '}
                <a href={`tel:${site.phoneRaw}`} className="whitespace-nowrap font-semibold text-ink underline">
                  {site.phone}
                </a>{' '}
                y la cerramos por teléfono.
              </p>
            )}
            {fecha && estadoHuecos === 'ok' && (
              <>
                <p className="mb-3 text-sm text-ink-soft">{mayuscula(bonita(fecha))}</p>
                {huecos.some((h) => h.libre) ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {huecos.map((h) => (
                      <button
                        key={h.hora}
                        type="button"
                        disabled={!h.libre}
                        onClick={() => {
                          setHora(h.hora);
                          setErrors((p) => ({ ...p, hora: undefined }));
                          setEnvio('idle');
                        }}
                        aria-pressed={hora === h.hora}
                        aria-label={h.libre ? `${h.hora}, libre` : `${h.hora}, ocupada`}
                        className={cn(
                          'rounded-xl border py-2.5 text-sm font-medium transition',
                          !h.libre
                            ? 'cursor-not-allowed border-transparent text-ink-faint/50 line-through'
                            : hora === h.hora
                              ? 'border-transparent bg-white text-[#06060B]'
                              : 'border-ink-line text-ink hover:border-brand-blue/50',
                        )}
                      >
                        {h.hora}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">Este día ya no quedan horas libres. Prueba con otro.</p>
                )}
              </>
            )}
            {errors.hora && (
              <p role="alert" className="mt-2 text-xs font-medium text-red-300">
                {errors.hora}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Paso 3: datos */}
      <form noValidate onSubmit={onSubmit} aria-labelledby="visita-form-title" className="glass relative flex flex-col gap-4 rounded-card-lg p-5 sm:p-7">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-accent" aria-hidden="true" />
          <h3 id="visita-form-title" className="text-lg tracking-tight">
            3 · ¿A dónde vamos?
          </h3>
        </div>
        <p className="-mt-2 text-sm text-ink-soft">
          {fecha && hora ? (
            <>
              Visita el <strong className="text-ink">{bonita(fecha)}</strong> a las <strong className="text-ink">{hora}</strong>.
            </>
          ) : (
            'Elige día y hora y completa tus datos.'
          )}
        </p>
        <Honeypot value={trampa} onChange={setTrampa} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Nombre" name="v-nombre" autoComplete="name" value={d.nombre} onChange={(e) => set('nombre', e.target.value)} error={errors.nombre} />
          <TextField label="Empresa" name="v-empresa" autoComplete="organization" value={d.empresa} onChange={(e) => set('empresa', e.target.value)} error={errors.empresa} />
          <TextField label="Teléfono" name="v-telefono" type="tel" autoComplete="tel" inputMode="tel" value={d.telefono} onChange={(e) => set('telefono', e.target.value)} error={errors.telefono} />
          <TextField label="Email" name="v-email" type="email" autoComplete="email" inputMode="email" value={d.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
          <TextField label="Dirección del negocio" name="v-direccion" autoComplete="street-address" value={d.direccion} onChange={(e) => set('direccion', e.target.value)} error={errors.direccion} />
          <TextField label="Localidad" name="v-localidad" autoComplete="address-level2" value={d.localidad} onChange={(e) => set('localidad', e.target.value)} error={errors.localidad} />
        </div>
        <SelectField label="Sector" name="v-sector" optional options={SECTOR_OPTIONS} value={d.sector} onChange={(e) => set('sector', e.target.value)} />
        <TextArea label="¿Algo que debamos saber?" name="v-mensaje" optional rows={3} value={d.mensaje} onChange={(e) => set('mensaje', e.target.value)} />
        <PrivacyCheck name="v-privacidad" checked={d.privacidad} onChange={(v) => set('privacidad', v)} error={errors.privacidad} />

        <AnimatePresence>
          {(envio === 'error' || envio === 'ocupado') && (
            <motion.div
              ref={aviso}
              tabIndex={-1}
              role="alert"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm outline-none"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" aria-hidden="true" />
              {envio === 'ocupado' ? (
                <span>Esa hora se acaba de ocupar. Elige otra y vuelve a enviarlo.</span>
              ) : (
                <span>
                  No hemos podido apuntar la visita. Inténtalo de nuevo o llámanos al{' '}
                  <a href={`tel:${site.phoneRaw}`} className="whitespace-nowrap font-semibold underline">
                    {site.phone}
                  </a>
                  .
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={envio === 'enviando'}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#06060B] shadow-glow transition hover:bg-brand-silver disabled:opacity-70"
        >
          {envio === 'enviando' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Enviando…
            </>
          ) : (
            'Solicitar la visita'
          )}
        </button>
      </form>
    </div>
  );
}
