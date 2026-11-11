import { Check, Sparkles } from 'lucide-react';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { HeroDemo } from '@/components/HeroDemo';

// Lo que automatizamos: rota en el titular (solo CSS, ver .word-rotator en globals.css).
const WORDS = ['tus citas', 'tus llamadas', 'tus presupuestos', 'tus facturas', 'tus cobros'];

const promises = [
  'Llamada gratis y sin compromiso',
  'Precio cerrado antes de empezar',
  'Trato directo con los fundadores',
  'En toda la provincia de Cádiz y Sevilla',
];

type Delay = React.CSSProperties & { '--delay'?: string };
const delay = (sec: number): Delay => ({ '--delay': `${sec}s` });

/*
 * Entrada del hero en CSS (clase hero-in en globals.css): arranca con el primer
 * pintado, sin esperar a que React hidrate, y solo anima transform/opacity.
 */
export function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden pb-16 pt-32 sm:pt-40 lg:pb-24">
      {/* Fondo: degradados de marca que se desplazan despacio + rejilla. Sin blur ni canvas. */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="hero-aurora" />
        <div className="hero-grid absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <div className="container-x grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col items-start">
          <div
            style={delay(0)}
            className="hero-in mb-7 inline-flex items-center gap-2 rounded-full border border-ink-line bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-ink-soft"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand-cyan" />
            Automatizaciones con IA · Software · Páginas web
          </div>

          <h1 className="font-display text-[clamp(2.5rem,7vw,5.2rem)] font-medium leading-[1.02] tracking-tightest">
            <span style={delay(0.05)} className="hero-in block">
              Automatizamos
            </span>
            <span style={delay(0.15)} className="hero-in block">
              <span className="sr-only">{WORDS.join(', ')}</span>
              <span className="word-rotator italic" aria-hidden="true">
                {WORDS.map((w, i) => (
                  <span key={w} style={{ '--i': i } as React.CSSProperties}>
                    {/* El degradado va dentro: en Chrome, background-clip:text no pinta sobre la capa animada */}
                    <span className="text-gradient pr-[0.08em]">{w}</span>
                  </span>
                ))}
              </span>
            </span>
            <span style={delay(0.25)} className="hero-in block">
              con IA
            </span>
          </h1>

          {/* Visible desde el primer pintado (solo sube): es el LCP en móvil */}
          <p className="hero-in hero-slide mt-7 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Atendemos tus emails y llamadas, hacemos tus presupuestos, facturas y cobros, y creamos el software y la
            página web que tu negocio necesita. <span className="text-ink">Tú te dedicas a lo importante.</span>
          </p>

          <div style={delay(0.35)} className="hero-in mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <MagneticButton href="/#reservar" variant="primary">
              Reserva una llamada gratis
            </MagneticButton>
            <MagneticButton href="/#servicios" variant="secondary">
              Ver servicios
            </MagneticButton>
          </div>

          <ul style={delay(0.45)} className="hero-in mt-8 flex flex-col gap-2 text-sm text-ink-soft sm:flex-row sm:flex-wrap sm:gap-x-6">
            {promises.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-brand-cyan" /> {p}
              </li>
            ))}
          </ul>
        </div>

        <div style={delay(0.3)} className="hero-in w-full">
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}
