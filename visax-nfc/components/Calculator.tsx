'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm text-ink-soft">
          {label}
        </label>
        <span className="shrink-0 whitespace-nowrap font-display text-2xl tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-3 w-full"
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}

// useGrouping 'always': en español, sin esto «9984» sale sin el punto de los miles.
const agrupar = { useGrouping: 'always' } as unknown as Intl.NumberFormatOptions;
const horas = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, ...agrupar });
const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, ...agrupar });

/**
 * Calculadora orientativa del tiempo (y su coste) que tu equipo dedica a llevar
 * cartas, tomar nota, ir y volver y dar la contraseña del WiFi en cada mesa.
 */
export function Calculator() {
  const [mesas, setMesas] = useState(40);
  const [minutos, setMinutos] = useState(4);
  const [coste, setCoste] = useState(12);
  const [dias, setDias] = useState(26);
  const horasMes = (mesas * minutos * dias) / 60;
  const dineroMes = horasMes * coste;

  return (
    <section id="calculadora" className="section">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <SectionHeading
          eyebrow="Calculadora"
          title={
            <>
              ¿Cuánto tiempo y dinero
              <br />
              <span className="text-gradient italic">estás perdiendo?</span>
            </>
          }
          intro="Llevar la carta, tomar nota, ir y volver o dar la contraseña del WiFi: minutos en cada mesa que se suman. Mueve los valores con los datos de tu local. Es una estimación."
        />
        <div className="glass rounded-[var(--radius)] p-7 shadow-card sm:p-9">
          <div className="space-y-7">
            <Slider label="Mesas que atiendes al día" value={mesas} min={5} max={300} step={5} onChange={setMesas} />
            <Slider
              label="Minutos por mesa en cartas, tomar nota y el WiFi"
              value={minutos}
              min={1}
              max={10}
              suffix=" min"
              onChange={setMinutos}
            />
            <Slider label="Lo que te cuesta una hora de camarero" value={coste} min={8} max={25} suffix=" €" onChange={setCoste} />
            <Slider label="Días abiertos al mes" value={dias} min={8} max={31} onChange={setDias} />
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2" aria-live="polite">
            <div className="rounded-2xl border border-brand-violet/30 bg-brand-gradient-soft p-5 text-center">
              <p className="text-sm text-ink-soft">Tiempo perdido</p>
              <p className="mt-1 font-display text-5xl tabular-nums text-gradient">≈ {horas.format(horasMes)} h</p>
              <p className="mt-1 text-sm text-ink-soft">al mes · ≈ {horas.format(horasMes * 12)} h al año</p>
            </div>
            <div className="rounded-2xl border border-brand-violet/30 bg-brand-gradient-soft p-5 text-center">
              <p className="text-sm text-ink-soft">Dinero perdido</p>
              <p className="mt-1 font-display text-5xl tabular-nums text-gradient">≈ {euros.format(dineroMes)}</p>
              <p className="mt-1 text-sm text-ink-soft">al mes · ≈ {euros.format(dineroMes * 12)} al año</p>
            </div>
          </div>
          <Link
            href="/productos/nfc-pedido-en-mesa"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3.5 font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            Recupéralo con el pedido en mesa <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
