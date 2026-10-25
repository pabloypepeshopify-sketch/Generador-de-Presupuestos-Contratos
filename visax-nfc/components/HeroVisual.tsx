'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { use3D } from '@/components/use3D';
import { cn } from '@/lib/utils';

// Three.js solo se descarga si hay GPU y movimiento permitido.
const HeroScene = dynamic(() => import('@/components/three/HeroScene'), { ssr: false });

/**
 * Visual del hero: composición con las fotos reales (siempre, también sin JS)
 * y encima la escena 3D, que aparece con un fundido cuando ya está pintando.
 */
export function HeroVisual() {
  const mode = use3D();
  const [ready, setReady] = useState(false);

  return (
    <div id="hero-3d" className="relative mx-auto aspect-square w-full max-w-[620px]">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-violet/25 blur-[90px]" />
      <div className="pointer-events-none absolute bottom-[10%] right-[8%] h-[40%] w-[40%] rounded-full bg-brand-cyan/15 blur-[80px]" />

      {/* Composición estática con las fotos reales */}
      <div
        className={cn('absolute inset-0 transition-opacity duration-700', ready && 'opacity-0')}
        aria-hidden={ready}
      >
        <div className="hero-float absolute left-[16%] top-[8%] w-[40%]">
          <Image
            src="/products/tarjeta-nfc-menu.png"
            alt="Placa NFC «Toca para ver menú» para ver la carta y pedir desde la mesa"
            width={197}
            height={307}
            priority
            sizes="(min-width: 1024px) 250px, 40vw"
            className="h-auto w-full drop-shadow-[0_30px_60px_rgba(124,92,255,0.35)]"
          />
        </div>
        <div className="hero-float-slow absolute bottom-[8%] right-[8%] w-[38%] rotate-[6deg]">
          <Image
            src="/products/expositor-resenas-google.png"
            alt="Expositor NFC de reseñas de Google"
            width={338}
            height={450}
            sizes="(min-width: 1024px) 240px, 38vw"
            className="h-auto w-full drop-shadow-[0_25px_50px_rgba(51,198,244,0.3)]"
          />
        </div>
      </div>

      {mode !== 'static' && (
        <div className={cn('absolute inset-0 opacity-0 transition-opacity duration-700', ready && 'opacity-100')}>
          <HeroScene quality={mode} variant="order" onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
