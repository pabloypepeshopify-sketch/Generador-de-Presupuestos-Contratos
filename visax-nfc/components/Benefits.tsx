import { BatteryFull, FileX2, Rocket, Smartphone, Star, Truck } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { eur } from '@/lib/pricing';
import { site } from '@/lib/site.config';

const items = [
  {
    icon: Star,
    title: 'Más reseñas, menos excusas',
    text: 'Dejar una reseña cuesta segundos si el cliente no tiene que buscarte. Ese es todo el truco.',
  },
  {
    icon: BatteryFull,
    title: 'Sin app ni batería',
    text: 'El chip funciona con la energía del propio móvil al acercarlo. Nada que cargar ni configurar.',
  },
  {
    icon: Smartphone,
    title: 'iPhone y Android',
    text: 'Funciona con los móviles con NFC: los iPhone recientes y la gran mayoría de Android.',
  },
  {
    icon: FileX2,
    title: 'Adiós a la carta de papel',
    text: 'Cambias precios en tu carta digital y la tarjeta sigue abriendo la versión nueva. Sin reimprimir.',
  },
  {
    icon: Rocket,
    title: 'Listo para usar',
    text: 'Te llega programado y probado con tu enlace. Lo pones en la mesa y ya está.',
  },
  {
    icon: Truck,
    title: `Envío en ${site.shipping.eta}`,
    text: `${site.shipping.zone}. Gratis a partir de ${eur(site.shipping.freeFrom)}.`,
  },
];

export function Benefits() {
  return (
    <section id="ventajas" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Ventajas"
          title={
            <>
              Pequeño, barato
              <br />
              <span className="text-gradient italic">y trabaja todo el día</span>
            </>
          }
        />
        <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {items.map((it) => (
            <RevealItem key={it.title}>
              <div className="card-fx h-full rounded-[var(--radius)] border border-ink-line bg-bg-soft/60 p-7">
                <it.icon className="h-6 w-6 text-brand-cyan" />
                <h3 className="mt-4 font-display text-xl">{it.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{it.text}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
