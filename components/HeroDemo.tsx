'use client';

import { useEffect, useRef, useState } from 'react';
import { Banknote, CalendarCheck, CheckCircle2, FileSignature, Mail, PhoneCall, type LucideIcon } from 'lucide-react';
import { cn, prefersReducedMotion } from '@/lib/utils';

type Line = { from: 'client' | 'ai' | 'done'; text: string };
type Scene = { id: string; icon: LucideIcon; service: string; channel: string; lines: Line[] };

/** Ejemplos de lo que hace cada automatización, contados como una conversación. */
const scenes: Scene[] = [
  {
    id: 'citas',
    icon: Mail,
    service: 'Recepcionista Virtual IA',
    channel: 'Email',
    lines: [
      { from: 'client', text: 'Hola, ¿tenéis hueco el jueves por la tarde?' },
      { from: 'ai', text: '¡Hola! El jueves tengo libre a las 17:00 o a las 18:30. ¿Cuál prefieres?' },
      { from: 'client', text: 'A las 17:00, perfecto.' },
      { from: 'done', text: 'Cita creada en tu calendario · Jueves 17:00' },
    ],
  },
  {
    id: 'llamadas',
    icon: PhoneCall,
    service: 'Agente de Voz IA',
    channel: 'Llamada',
    lines: [
      { from: 'client', text: '¿Podría cambiar mi cita del lunes?' },
      { from: 'ai', text: 'Claro. Tengo el martes a las 10:00 o a las 12:00.' },
      { from: 'client', text: 'El martes a las 10, gracias.' },
      { from: 'done', text: 'Cita cambiada · Martes 10:00' },
    ],
  },
  {
    id: 'presupuestos',
    icon: FileSignature,
    service: 'Presupuestos con IA',
    channel: 'Formulario web',
    lines: [
      { from: 'client', text: 'Quiero presupuesto para reformar un baño de 6 m².' },
      { from: 'ai', text: 'Presupuesto preparado. Te lo dejo para que lo revises y lo apruebes.' },
      { from: 'client', text: 'Aprobado.' },
      { from: 'done', text: 'PDF enviado al cliente' },
    ],
  },
  {
    id: 'cobros',
    icon: Banknote,
    service: 'Cobrador de Impagos',
    channel: 'Email',
    lines: [
      { from: 'ai', text: 'Hola, te recordamos que la factura F-104 venció hace 5 días. Aquí tienes el enlace de pago.' },
      { from: 'client', text: 'Perdona el retraso, la pago hoy.' },
      { from: 'done', text: 'Factura F-104 cobrada' },
    ],
  },
];

const STEP_MS = 1500; // entre mensaje y mensaje
const HOLD_MS = 2600; // la conversación completa se queda a la vista

/**
 * Demostración del hero: una conversación que se escribe sola y va pasando por
 * varios servicios. Solo HTML y CSS (opacity/transform); se pausa fuera de
 * pantalla y, con movimiento reducido, muestra la conversación entera sin avanzar.
 */
export function HeroDemo() {
  const [scene, setScene] = useState(0);
  const [shown, setShown] = useState(0);
  const [auto, setAuto] = useState(true);
  const [visible, setVisible] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Solo avanza cuando se ve en pantalla.
  useEffect(() => {
    if (prefersReducedMotion()) {
      setAuto(false);
      setShown(99);
      return;
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);

  const lines = scenes[scene].lines;
  useEffect(() => {
    if (!auto || !visible) return;
    const done = shown >= lines.length;
    const t = setTimeout(
      () => {
        if (done) {
          setScene((s) => (s + 1) % scenes.length);
          setShown(0);
        } else setShown((n) => n + 1);
      },
      done ? HOLD_MS : shown === 0 ? 500 : STEP_MS,
    );
    return () => clearTimeout(t);
  }, [auto, visible, shown, lines.length]);

  const pick = (i: number) => {
    setAuto(false);
    setScene(i);
    setShown(99);
  };

  const { icon: Icon, service, channel } = scenes[scene];
  // "Escribiendo…" antes de cada respuesta de la IA
  const typing = auto && shown < lines.length && lines[shown]?.from !== 'client' && shown > 0;

  return (
    <div ref={box} className="relative mx-auto w-full max-w-md">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(124,92,255,0.28),transparent_70%)]" />
      <div className="overflow-hidden rounded-[calc(var(--radius)*1.4)] border border-ink-line bg-bg-soft/90 shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-ink-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand-cyan">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{service}</p>
              <p className="text-xs text-ink-faint">{channel}</p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <span className="demo-live h-1.5 w-1.5 rounded-full bg-emerald-400" /> En marcha
          </span>
        </div>

        {/* Alto fijo: la tarjeta no cambia de tamaño al escribir */}
        <div className="flex h-[300px] flex-col gap-3 p-5" aria-live="polite">
          {lines.map((l, i) => (
            <div
              key={`${scene}-${i}`}
              className={cn(
                'demo-line',
                i < shown && 'is-in',
                l.from === 'client' && 'max-w-[85%] self-start',
                l.from === 'ai' && 'max-w-[85%] self-end',
                l.from === 'done' && 'self-center',
              )}
            >
              {l.from === 'done' ? (
                <span className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2 text-xs font-semibold text-emerald-200">
                  {scenes[scene].id === 'citas' || scenes[scene].id === 'llamadas' ? (
                    <CalendarCheck className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {l.text}
                </span>
              ) : (
                <p
                  className={cn(
                    'rounded-2xl px-4 py-2.5 text-sm leading-snug',
                    l.from === 'client' ? 'rounded-bl-md bg-white/[0.07] text-ink' : 'rounded-br-md bg-brand text-white',
                  )}
                >
                  {l.from === 'ai' && <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-white/70">VISAX IA</span>}
                  {l.text}
                </p>
              )}
            </div>
          ))}
          <div className={cn('demo-typing self-end', typing && 'is-in')} aria-hidden="true">
            <span /> <span /> <span />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="Ver otro ejemplo">
        {scenes.map((s, i) => (
          <button
            key={s.id}
            onClick={() => pick(i)}
            aria-pressed={i === scene}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              i === scene ? 'border-brand-violet/60 bg-brand-violet/15 text-white' : 'border-ink-line text-ink-soft hover:text-white',
            )}
          >
            {s.service}
          </button>
        ))}
      </div>
    </div>
  );
}
