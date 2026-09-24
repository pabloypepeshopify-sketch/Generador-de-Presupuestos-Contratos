'use client';

import { useEffect, useRef, useState } from 'react';
import { isMobileDevice, prefersReducedMotion } from '@/lib/utils';

/**
 * Cursor personalizado con seguimiento suave e interpolado.
 * Cambia de estado (crece / muestra etiqueta) sobre elementos interactivos.
 * Se desactiva en táctil y con movimiento reducido.
 */
export function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (isMobileDevice() || prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) {
      return;
    }
    setEnabled(true);
    document.body.classList.add('has-custom-cursor');

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...mouse };
    let raf = 0;
    let hovering = false;

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (dot.current) {
        dot.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    };

    const loop = () => {
      ringPos.x += (mouse.x - ringPos.x) * 0.16;
      ringPos.y += (mouse.y - ringPos.y) * 0.16;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%) scale(${hovering ? 1.9 : 1})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest(
        'a, button, [data-cursor], input, textarea, select, [role="button"]',
      ) as HTMLElement | null;
      hovering = !!el;
      setLabel(el?.getAttribute('data-cursor') ?? '');
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      document.body.classList.remove('has-custom-cursor');
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dot}
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white mix-blend-difference"
        aria-hidden="true"
      />
      <div
        ref={ring}
        className="pointer-events-none fixed left-0 top-0 z-[9999] flex h-10 w-10 items-center justify-center rounded-full border border-white/60 mix-blend-difference transition-[width,height] duration-200"
        aria-hidden="true"
      >
        {label && (
          <span className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-widest text-white">
            {label}
          </span>
        )}
      </div>
    </>
  );
}
