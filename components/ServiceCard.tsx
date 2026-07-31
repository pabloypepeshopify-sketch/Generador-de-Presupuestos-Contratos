'use client';

import { useRef, useState, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Service } from '@/lib/services';
import { prefersReducedMotion } from '@/lib/utils';

/** Tarjeta de servicio con tilt 3D y brillo que sigue al cursor. */
export function ServiceCard({
  service,
  index,
  onOpen,
}: {
  service: Service;
  index: number;
  onOpen: (s: Service) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const onMove = (e: MouseEvent) => {
    if (prefersReducedMotion() || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setGlow({ x: px * 100, y: py * 100 });
    setTilt({ ry: (px - 0.5) * 12, rx: -(py - 0.5) * 12 });
  };

  const onLeave = () => setTilt({ rx: 0, ry: 0 });

  const Icon = service.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1000 }}
    >
      <button
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={() => onOpen(service)}
        data-cursor="Ver +"
        className="group relative flex h-full w-full flex-col items-start gap-5 overflow-hidden rounded-[var(--radius)] border border-ink-line bg-bg-soft/60 p-7 text-left transition-transform duration-300 will-change-transform"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Brillo que sigue al cursor */}
        <span
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(340px circle at ${glow.x}% ${glow.y}%, rgba(63,125,251,0.18), transparent 60%)`,
          }}
        />
        {/* Borde luminoso al hover */}
        <span className="pointer-events-none absolute inset-0 rounded-[var(--radius)] opacity-0 ring-1 ring-inset ring-brand-blue/40 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="flex w-full items-start justify-between" style={{ transform: 'translateZ(40px)' }}>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-line bg-gradient-to-br from-white/[0.08] to-transparent text-brand-cyan transition-colors group-hover:text-white">
            <Icon className="h-6 w-6" />
          </span>
          <ArrowUpRight className="h-5 w-5 text-ink-faint transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white" />
        </div>

        <div className="flex flex-col gap-2" style={{ transform: 'translateZ(30px)' }}>
          <h3 className="font-display text-2xl leading-tight">{service.title}</h3>
          <p className="text-sm leading-relaxed text-ink-soft">{service.description}</p>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-2" style={{ transform: 'translateZ(20px)' }}>
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand-cyan to-brand-violet" />
          <span className="text-sm font-semibold text-gradient">{service.result}</span>
        </div>
      </button>
    </motion.div>
  );
}
