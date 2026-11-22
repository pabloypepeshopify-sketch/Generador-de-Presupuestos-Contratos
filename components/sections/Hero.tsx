import { ArrowDown, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Marquee } from '@/components/ui/Marquee';
import { HeroOrb } from '@/components/visuals/HeroOrb';
import { mensajes } from '@/content/home';
import { site } from '@/lib/site.config';

type Delay = React.CSSProperties & { '--delay'?: string };
const delay = (sec: number): Delay => ({ '--delay': `${sec}s` });

const confianza = [`Equipo local en ${site.zona.base}`, 'Visitas presenciales', 'Un único socio para todo'];

const CINTA = [
  'Procesos inteligentes',
  'Inteligencia artificial',
  'Automatización',
  'Webs y sistemas',
  'Mejora continua',
  'Diagnóstico inicial',
  'Visitas presenciales',
  'Cádiz y Sevilla',
];

/** Hero a pantalla completa. Entrada en CSS (.hero-in): visible desde el primer pintado. */
export function Hero() {
  const [l1, l2] = [mensajes.heroTitle, mensajes.heroTitleAccent];
  return (
    <section id="inicio" aria-labelledby="hero-title" className="relative flex min-h-[100svh] flex-col overflow-hidden pt-28 sm:pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="hero-aurora" />
        <div className="hero-grid absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <div className="container-x grid flex-1 items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col items-start">
          <p
            style={delay(0)}
            className="hero-in mb-7 inline-flex items-center gap-2 rounded-full border border-ink-line bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-ink-soft backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Tu socio tecnológico · Cádiz y Sevilla
          </p>

          <h1 id="hero-title" className="text-[clamp(2.5rem,4.9vw,4.5rem)] font-semibold leading-[1] tracking-tightest">
            <span style={delay(0.05)} className="hero-in block">
              {l1}
            </span>
            <span style={delay(0.18)} className="hero-in block pb-[0.08em] text-shimmer">
              {l2}
            </span>
          </h1>

          <p className="hero-in mt-7 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg" style={delay(0.28)}>
            {mensajes.heroSubtitle}
          </p>

          <div style={delay(0.36)} className="hero-in mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button href="/#diagnostico" variant="primary">
              {mensajes.ctaPrincipal}
            </Button>
            <Button href="/#como-trabajamos" variant="secondary">
              {mensajes.ctaSecundario} <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <ul style={delay(0.44)} className="hero-in mt-8 flex flex-col gap-2 text-sm text-ink-soft sm:flex-row sm:flex-wrap sm:gap-x-6">
            {confianza.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div style={delay(0.2)} className="hero-in w-full pb-6 lg:pb-0">
          <HeroOrb />
        </div>
      </div>

      <div className="relative mt-6 border-y border-ink-line bg-white/[0.015]">
        <Marquee items={CINTA} duration={45} />
      </div>
    </section>
  );
}
