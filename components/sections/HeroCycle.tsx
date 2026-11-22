import { ClipboardCheck } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { fases } from '@/content/home';

// Posición de cada fase sobre la órbita. Las laterales se anclan al borde
// para que la etiqueta nunca se salga de la pantalla en móvil.
const POS = [
  { style: { left: '50%', top: '15%' }, cls: '-translate-x-1/2 -translate-y-1/2' },
  { style: { right: '0%', top: '50%' }, cls: '-translate-y-1/2' },
  { style: { left: '50%', top: '85%' }, cls: '-translate-x-1/2 -translate-y-1/2' },
  { style: { left: '0%', top: '50%' }, cls: '-translate-y-1/2' },
];

// Arcos entre fases (órbita de radio 140 centrada en 200,200), en sentido horario.
const ARCOS = [
  'M243.3 66.9 A140 140 0 0 1 333.1 156.7',
  'M333.1 243.3 A140 140 0 0 1 243.3 333.1',
  'M156.7 333.1 A140 140 0 0 1 66.9 243.3',
  'M66.9 156.7 A140 140 0 0 1 156.7 66.9',
];

/** Visual del hero: tu empresa en el centro de un ciclo de mejora continua. Solo SVG y CSS. */
export function HeroCycle() {
  return (
    <figure className="relative aspect-square w-full">
      <figcaption className="sr-only">
        Cómo trabajamos: un diagnóstico inicial y, después, un ciclo continuo en el que analizamos, detectamos,
        implementamos y seguimos mejorando tu empresa.
      </figcaption>

      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(63,125,251,0.16),transparent_65%)]" aria-hidden="true" />

      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="hc-g" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgb(51 198 244)" />
            <stop offset=".5" stopColor="rgb(63 125 251)" />
            <stop offset="1" stopColor="rgb(124 92 255)" />
          </linearGradient>
          <marker id="hc-a" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="rgb(124 92 255)" />
          </marker>
        </defs>
        <circle cx="200" cy="200" r="140" fill="none" stroke="rgba(255,255,255,0.07)" />
        <circle cx="200" cy="200" r="88" fill="none" stroke="rgba(255,255,255,0.05)" strokeDasharray="2 6" />
        {ARCOS.map((d) => (
          <path key={d} d={d} fill="none" stroke="url(#hc-g)" strokeWidth="1.6" markerEnd="url(#hc-a)" className="flow-dash" />
        ))}
        {/* Entrada: diagnóstico inicial → primera fase */}
        <path d="M44 40 C 110 34, 150 40, 186 54" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeDasharray="3 5" markerEnd="url(#hc-a)" />
      </svg>

      {/* Centro */}
      <div className="absolute left-1/2 top-1/2 flex h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-full border border-ink-line bg-bg-raise/80 shadow-glow backdrop-blur">
        <Logo variant="mark" className="h-[22%]" />
        <span className="text-[clamp(0.7rem,1.6vw,0.85rem)] font-semibold">Tu empresa</span>
      </div>

      {/* Fases */}
      {fases.map((f, i) => (
        <div
          key={f.title}
          style={POS[i].style}
          className={`absolute ${POS[i].cls}`}
        >
          <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-ink-line bg-bg-raise/90 py-1.5 pl-1.5 pr-3 text-[clamp(0.68rem,1.5vw,0.82rem)] font-medium shadow-card backdrop-blur">
            <span className="node-pulse flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white" style={{ '--delay': `${i * 0.8}s` } as React.CSSProperties}>
              <f.icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            {f.title}
          </div>
        </div>
      ))}

      {/* Paso 0 */}
      <div className="absolute left-0 top-[3%] flex items-center gap-2 rounded-full border border-dashed border-ink-strong bg-bg/80 px-3 py-1.5 text-[clamp(0.66rem,1.4vw,0.78rem)] text-ink-soft">
        <ClipboardCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
        Paso 0 · Diagnóstico
      </div>
    </figure>
  );
}
