'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { hasHardwareWebGL, prefersReducedMotion } from '@/lib/webgl';
import { cn } from '@/lib/utils';

// Three.js solo se descarga si hay GPU y movimiento permitido.
const HeroScene = dynamic(() => import('@/components/three/HeroScene'), { ssr: false });

type Mode = 'static' | 'full' | 'lite';

/**
 * Visual del hero: composición con las fotos reales (siempre, también sin JS)
 * y encima la escena 3D, que aparece con un fundido cuando ya está pintando.
 */
export function HeroVisual() {
  const [mode, setMode] = useState<Mode>('static');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion() || (navigator.hardwareConcurrency ?? 4) < 4 || !hasHardwareWebGL()) return;
    const desktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
    if (desktop) return setMode('full');
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    const id = ric(() => setMode('lite'), { timeout: 1500 });
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id);
  }, []);

  return (
    <div id="hero-3d" className="relative mx-auto aspect-square w-full max-w-[620px]">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-violet/25 blur-[90px]" />
      <div className="pointer-events-none absolute bottom-[10%] right-[8%] h-[40%] w-[40%] rounded-full bg-brand-cyan/15 blur-[80px]" />

      {/* Composición estática con las fotos reales */}
      <div
        className={cn('absolute inset-0 transition-opacity duration-700', ready && 'opacity-0')}
        aria-hidden={ready}
      >
        <div className="hero-float absolute left-[12%] top-[10%] w-[52%]">
          <Image
            src="/products/expositor-resenas-google.png"
            alt="Expositor NFC de reseñas de Google"
            width={338}
            height={450}
            priority
            sizes="(min-width: 1024px) 320px, 52vw"
            className="h-auto w-full drop-shadow-[0_30px_60px_rgba(124,92,255,0.35)]"
          />
        </div>
        <div className="hero-float-slow absolute bottom-[8%] right-[10%] w-[30%] rotate-[8deg]">
          <Image
            src="/products/tarjeta-nfc-menu.png"
            alt="Tarjeta NFC para ver la carta"
            width={197}
            height={307}
            sizes="(min-width: 1024px) 190px, 30vw"
            className="h-auto w-full drop-shadow-[0_25px_50px_rgba(51,198,244,0.3)]"
          />
        </div>
      </div>

      {mode !== 'static' && (
        <div className={cn('absolute inset-0 opacity-0 transition-opacity duration-700', ready && 'opacity-100')}>
          <HeroScene quality={mode} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
