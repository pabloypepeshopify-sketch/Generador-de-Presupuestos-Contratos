'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Mail, Sheet, Sparkles } from 'lucide-react';

/* Mini visuales animados de cada capacidad. Decorativos (aria-hidden). */

/** Procesos: los datos viajan solos de una herramienta a otra. */
export function FlowVisual() {
  const path = 'M60 60 C 130 10, 170 110, 240 60 S 350 10, 420 60';
  const nodes = [
    { x: '12.5%', icon: Mail, label: 'Llega un correo' },
    { x: '50%', icon: Sheet, label: 'Se registra' },
    { x: '87.5%', icon: CheckCircle2, label: 'Se avisa' },
  ];
  return (
    <div className="relative h-full w-full" aria-hidden="true">
      <svg viewBox="0 0 480 120" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="fv-g" x1="0" x2="1">
            <stop offset="0" stopColor="rgb(51 198 244)" />
            <stop offset="1" stopColor="rgb(124 92 255)" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke="url(#fv-g)" strokeOpacity=".45" strokeWidth="1.5" strokeDasharray="4 6" />
        {[0, 1.1, 2.2].map((d) => (
          <circle key={d} r="4.5" fill="white" className="travel-dot">
            <animateMotion dur="3.3s" begin={`${d}s`} repeatCount="indefinite" path={path} />
          </circle>
        ))}
      </svg>
      {nodes.map((n) => (
        <div key={n.label} className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2" style={{ left: n.x }}>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-bg-raise shadow-glow">
            <n.icon className="h-5 w-5 text-accent" />
          </span>
          <span className="whitespace-nowrap text-[11px] text-ink-faint">{n.label}</span>
        </div>
      ))}
    </div>
  );
}

/** IA: una petición y la respuesta escribiéndose. */
export function ChatVisual() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2.5 px-1" aria-hidden="true">
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/[0.07] px-3.5 py-2 text-[12px] text-ink-soft">
        Resume este correo y prepara la respuesta
      </div>
      <div className="flex items-end gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </span>
        <div className="rounded-2xl rounded-bl-md border border-brand-violet/30 bg-brand-gradient-soft px-3.5 py-2.5">
          <div className="typing flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Modernización: web y móvil conectados. */
export function DevicesVisual() {
  return (
    <div className="relative h-full w-full" aria-hidden="true">
      <div className="absolute inset-y-2 left-0 right-10 overflow-hidden rounded-xl border border-white/10 bg-bg-raise">
        <div className="flex items-center gap-1 border-b border-white/5 px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
        </div>
        <div className="space-y-2 p-3">
          <span className="block h-10 rounded-lg bg-brand opacity-70" />
          <span className="shine block h-2 w-3/4 rounded" />
          <span className="shine block h-2 w-1/2 rounded" />
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <span className="shine h-6 rounded" />
            <span className="shine h-6 rounded" />
            <span className="shine h-6 rounded" />
          </div>
        </div>
      </div>
      <div className="float-y absolute bottom-0 right-0 h-[88%] w-[34%] overflow-hidden rounded-2xl border border-white/15 bg-bg-soft shadow-card">
        <span className="mx-auto mt-1.5 block h-1 w-6 rounded-full bg-white/20" />
        <div className="space-y-1.5 p-2">
          <span className="block h-6 rounded-md bg-brand opacity-60" />
          <span className="shine block h-1.5 rounded" />
          <span className="shine block h-1.5 w-2/3 rounded" />
          <span className="shine block h-5 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Mejora continua: una curva que se dibuja al entrar en pantalla. */
export function GrowthVisual() {
  const curva = 'M0 100 C 60 95, 90 80, 140 72 S 230 60, 280 42 S 380 20, 460 10';
  return (
    <svg viewBox="0 0 460 120" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="gv-s" x1="0" x2="1">
          <stop offset="0" stopColor="rgb(51 198 244)" />
          <stop offset="1" stopColor="rgb(124 92 255)" />
        </linearGradient>
        <linearGradient id="gv-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(63 125 251)" stopOpacity=".28" />
          <stop offset="1" stopColor="rgb(63 125 251)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[30, 60, 90].map((y) => (
        <line key={y} x1="0" x2="460" y1={y} y2={y} stroke="white" strokeOpacity=".05" />
      ))}
      <motion.path
        d={`${curva} L460 120 L0 120 Z`}
        fill="url(#gv-a)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.8 }}
      />
      <motion.path
        d={curva}
        fill="none"
        stroke="url(#gv-s)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
      />
      {[
        [140, 72],
        [280, 42],
        [460, 10],
      ].map(([x, y], i) => (
        <motion.circle
          key={x}
          cx={x}
          cy={y}
          r="5"
          fill="white"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 + i * 0.5, type: 'spring', stiffness: 260, damping: 16 }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      ))}
    </svg>
  );
}
