import { ArrowDown, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HeroCycle } from '@/components/sections/HeroCycle';
import { mensajes } from '@/content/home';
import { site } from '@/lib/site.config';

type Delay = React.CSSProperties & { '--delay'?: string };
const delay = (sec: number): Delay => ({ '--delay': `${sec}s` });

const confianza = [`Equipo local en ${site.zona.base}`, 'Visitas presenciales', 'Un único socio para todo'];

/**
 * Hero. Entrada en CSS (.hero-in): arranca con el primer pintado, sin esperar
 * a que React hidrate, y solo anima transform/opacity.
 */
export function Hero() {
  return (
    <section id="inicio" aria-labelledby="hero-title" className="relative overflow-hidden pb-16 pt-32 sm:pt-40 lg:pb-28">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="hero-aurora" />
        <div className="hero-grid absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <div className="container-x grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col items-start">
          <p
            style={delay(0)}
            className="hero-in mb-7 inline-flex items-center gap-2 rounded-full border border-ink-line bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-ink-soft"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Socio tecnológico para empresas · Cádiz y Sevilla
          </p>

          <h1 id="hero-title" className="text-[clamp(2.4rem,5.6vw,4.5rem)] leading-[1.02] tracking-tightest">
            <span style={delay(0.05)} className="hero-in block">
              {mensajes.heroTitle}
            </span>
            <span style={delay(0.15)} className="hero-in block text-gradient pb-[0.06em]">
              {mensajes.heroTitleAccent}
            </span>
          </h1>

          {/* Visible desde el primer pintado: es el LCP en móvil */}
          <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">{mensajes.heroSubtitle}</p>

          <div style={delay(0.3)} className="hero-in mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button href="/#diagnostico" variant="primary">
              {mensajes.ctaPrincipal}
            </Button>
            <Button href="/#como-trabajamos" variant="secondary">
              {mensajes.ctaSecundario} <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <ul style={delay(0.4)} className="hero-in mt-8 flex flex-col gap-2 text-sm text-ink-soft sm:flex-row sm:flex-wrap sm:gap-x-6">
            {confianza.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div style={delay(0.25)} className="hero-in mx-auto w-full max-w-[460px] lg:max-w-none">
          <HeroCycle />
        </div>
      </div>
    </section>
  );
}
