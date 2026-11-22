'use client';

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { BrainCircuit, MonitorSmartphone, RefreshCw, Workflow } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const CHIPS = [
  { icon: Workflow, label: 'Procesos', pos: 'left-[2%] top-[22%]', delay: '0s' },
  { icon: BrainCircuit, label: 'Inteligencia artificial', pos: 'right-[0%] top-[12%]', delay: '1.2s' },
  { icon: MonitorSmartphone, label: 'Webs y sistemas', pos: 'left-[6%] bottom-[14%]', delay: '2.1s' },
  { icon: RefreshCw, label: 'Mejora continua', pos: 'right-[4%] bottom-[22%]', delay: '0.6s' },
];

/**
 * Orbe del hero: anillos en 3D, partículas en órbita y el isotipo en el centro.
 * Todo en CSS; el ratón inclina el conjunto (solo con puntero fino y sin movimiento reducido).
 */
export function HeroOrb() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [10, -10]), { stiffness: 80, damping: 20 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-12, 12]), { stiffness: 80, damping: 20 });

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [mx, my]);

  return (
    <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[560px]" aria-hidden="true">
      {/* Halo */}
      <div className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle,rgba(63,125,251,0.35),rgba(124,92,255,0.16)_40%,transparent_70%)]" />

      <motion.div style={{ rotateX: rx, rotateY: ry }} className="orb absolute inset-0 [transform-style:preserve-3d]">
        <div className="orb-ring r1" />
        <div className="orb-ring r2" />
        <div className="orb-ring r3" />

        {/* Partículas en órbita */}
        {[
          { d: '16s', delay: '0s', size: 'h-2.5 w-2.5', inset: 'inset-[4%]', color: 'bg-brand-cyan' },
          { d: '22s', delay: '-6s', size: 'h-2 w-2', inset: 'inset-[14%]', color: 'bg-brand-violet' },
          { d: '28s', delay: '-12s', size: 'h-1.5 w-1.5', inset: 'inset-[24%]', color: 'bg-white' },
          { d: '19s', delay: '-9s', size: 'h-1.5 w-1.5', inset: 'inset-[9%]', color: 'bg-brand-blue' },
        ].map((p, i) => (
          <div key={i} className={`absolute ${p.inset}`}>
            <div className="orbit" style={{ '--orbit-duration': p.d, '--orbit-delay': p.delay } as React.CSSProperties}>
              <span className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full ${p.size} ${p.color} shadow-[0_0_14px_3px_rgba(63,125,251,0.7)]`} />
            </div>
          </div>
        ))}

      </motion.div>

        {/* Núcleo */}
      <div className="absolute left-1/2 top-1/2 flex h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.14),rgba(16,16,27,0.9)_60%)] shadow-[0_0_80px_-10px_rgba(63,125,251,0.8),inset_0_0_40px_rgba(124,92,255,0.25)]">
        <Logo variant="mark" className="h-[34%] drop-shadow-[0_0_18px_rgba(63,125,251,0.8)]" />
      </div>

      {/* Etiquetas flotantes */}
      {CHIPS.map((c) => (
        <div key={c.label} className={`absolute ${c.pos}`}>
          <div
            className="float-y flex items-center gap-2 rounded-full border border-white/10 bg-bg-raise/70 py-1.5 pl-1.5 pr-3.5 text-[clamp(0.68rem,1.4vw,0.85rem)] font-medium shadow-card backdrop-blur-md"
            style={{ '--delay': c.delay } as React.CSSProperties}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white">
              <c.icon className="h-3.5 w-3.5" />
            </span>
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
