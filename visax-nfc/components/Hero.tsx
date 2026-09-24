import { BatteryFull, Smartphone, Truck } from 'lucide-react';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { HeroVisual } from '@/components/HeroVisual';
import { site } from '@/lib/site.config';

type Delay = React.CSSProperties & { '--delay'?: string };
const delay = (sec: number): Delay => ({ '--delay': `${sec}s` });

/** Portada: titular + CTA a la izquierda, animación 3D del expositor a la derecha. */
export function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden pb-16 pt-28 sm:pt-32 lg:pb-24">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-glow opacity-70" aria-hidden="true" />
      <div className="container-x grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div className="relative z-10 flex flex-col items-start">
          <p
            style={delay(0.05)}
            className="hero-in glass mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-ink-soft"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
            Te llega programado con tu enlace · Envío {site.shipping.eta}
          </p>
          <h1 className="font-display text-[clamp(2.5rem,6.4vw,5.4rem)] font-medium leading-[0.98] tracking-tightest">
            <span style={delay(0.12)} className="hero-in block">
              Un toque con el móvil.
            </span>
            <span style={delay(0.26)} className="hero-in block">
              <span className="text-gradient-animate italic">Una reseña más.</span>
            </span>
          </h1>
          <p className="hero-in hero-slide mt-7 max-w-lg text-base text-ink-soft sm:text-lg">
            Expositores NFC de reseñas de Google y tarjetas para ver la carta. Los pones en la mesa y funcionan: sin app,
            sin batería y sin QR que enfocar.
          </p>
          <div style={delay(0.45)} className="hero-in mt-9 flex flex-col gap-3 sm:flex-row">
            <MagneticButton href="#productos" variant="primary" cursorLabel="Ver">
              Ver productos
            </MagneticButton>
            <MagneticButton href="#como-funciona" variant="secondary" cursorLabel="Ver">
              Cómo funciona
            </MagneticButton>
          </div>
          <ul style={delay(0.6)} className="hero-in mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-soft">
            <li className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-brand-cyan" /> iPhone y Android
            </li>
            <li className="flex items-center gap-2">
              <BatteryFull className="h-4 w-4 text-brand-cyan" /> Sin batería ni app
            </li>
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-brand-cyan" /> Envío gratis desde 50 €
            </li>
          </ul>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}
