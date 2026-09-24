'use client';

import { useId, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { useCart } from '@/components/cart/CartProvider';

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
        <span className="font-display text-2xl tabular-nums">
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

/** Calculadora orientativa de reseñas nuevas al mes con el expositor. */
export function Calculator() {
  const [clients, setClients] = useState(80);
  const [days, setDays] = useState(26);
  const [rate, setRate] = useState(3);
  const { add } = useCart();
  const perMonth = Math.round((clients * days * rate) / 100);

  return (
    <section id="calculadora" className="section">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <SectionHeading
          eyebrow="Calculadora"
          title={
            <>
              ¿Cuántas reseñas
              <br />
              <span className="text-gradient italic">te estás perdiendo?</span>
            </>
          }
          intro="Mueve los valores con los datos de tu negocio. Es una estimación: depende de tu clientela y de si tu equipo lo recuerda al cobrar."
        />
        <div className="glass rounded-[var(--radius)] p-7 shadow-card sm:p-9">
          <div className="space-y-7">
            <Slider label="Clientes al día" value={clients} min={5} max={500} step={5} onChange={setClients} />
            <Slider label="Días abiertos al mes" value={days} min={8} max={31} onChange={setDays} />
            <Slider
              label="De cada 100 clientes, cuántos dejarían reseña si se lo pones fácil"
              value={rate}
              min={1}
              max={10}
              onChange={setRate}
            />
          </div>
          <div className="mt-8 rounded-2xl border border-brand-violet/30 bg-brand-gradient-soft p-6 text-center" aria-live="polite">
            <p className="text-sm text-ink-soft">Reseñas nuevas estimadas</p>
            <p className="mt-1 font-display text-6xl tabular-nums text-gradient">≈ {perMonth}</p>
            <p className="mt-1 text-sm text-ink-soft">
              al mes · ≈ {perMonth * 12} al año
            </p>
          </div>
          <button
            onClick={() => add('expositor-resenas-google')}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3.5 font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            <ShoppingBag className="h-4 w-4" /> Quiero el expositor
          </button>
        </div>
      </div>
    </section>
  );
}
