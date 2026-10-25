'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import type { Product } from '@/lib/products';
import { ProductArt } from '@/components/ProductArt';
import { use3D } from '@/components/use3D';
import { cn } from '@/lib/utils';

// Three.js solo se descarga si el producto tiene animación y el equipo puede con ella.
const HeroScene = dynamic(() => import('@/components/three/HeroScene'), { ssr: false });

type Photo = { kind: 'photo'; src: string; alt: string; label: string };
type View = { kind: '3d'; label: string } | Photo;

/**
 * Galería: animación 3D "en acción" (si el producto la tiene y el dispositivo
 * puede), foto real del producto y diseño frontal en alta resolución.
 */
export function ProductGallery({ product }: { product: Product }) {
  const mode = use3D(!!product.scene);
  const [i, setI] = useState(0);
  const [ready, setReady] = useState(false);

  const photos: Photo[] = [
    product.image && { kind: 'photo' as const, src: product.image, alt: product.name, label: 'Producto' },
    product.face && { kind: 'photo' as const, src: product.face, alt: `Diseño frontal de ${product.name}`, label: 'Diseño' },
  ].filter((v): v is Photo => !!v);
  const has3D = !!product.scene && mode !== 'static';
  const views: View[] = has3D ? [{ kind: '3d', label: 'En acción' }, ...photos] : photos;
  const view = views[Math.min(i, views.length - 1)];
  // Mientras la animación carga se ve la primera foto debajo.
  const still: Photo | undefined = view?.kind === 'photo' ? view : photos[0];

  return (
    <div>
      <div
        id="product-3d"
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius)] border border-ink-line bg-[radial-gradient(60%_60%_at_50%_45%,rgba(124,92,255,0.3),transparent_70%)]"
      >
        <div
          className={cn(
            'relative h-[82%] w-[70%] transition-opacity duration-700',
            view?.kind === '3d' && ready && 'opacity-0',
          )}
        >
          {still ? (
            <Image
              key={still.src}
              src={still.src}
              alt={still.alt}
              fill
              priority
              sizes="(min-width: 1024px) 520px, 90vw"
              className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
            />
          ) : (
            <ProductArt product={product} sizes="(min-width: 1024px) 520px, 90vw" className="drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]" />
          )}
        </div>
        {has3D && view?.kind === '3d' && (
          <div className={cn('absolute inset-0 opacity-0 transition-opacity duration-700', ready && 'opacity-100')}>
            <HeroScene quality={mode} variant={product.scene} containerId="product-3d" onReady={() => setReady(true)} />
          </div>
        )}
      </div>
      {views.length > 1 && (
        <div className="mt-4 flex gap-3" role="tablist" aria-label="Imágenes del producto">
          {views.map((v, k) => (
            <button
              key={v.kind === '3d' ? '3d' : v.src}
              role="tab"
              aria-selected={k === i}
              onClick={() => {
                if (v.kind === '3d' && k !== i) setReady(false);
                setI(k);
              }}
              className={cn(
                'relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border bg-bg-soft transition',
                k === i ? 'border-brand-violet' : 'border-ink-line hover:border-brand-violet/50',
              )}
            >
              {v.kind === '3d' ? (
                <span className="flex flex-col items-center gap-1 text-[11px] font-medium text-ink-soft">
                  <Sparkles className="h-5 w-5 text-brand-cyan" />
                  En acción
                </span>
              ) : (
                <>
                  <Image src={v.src} alt="" fill sizes="80px" className="object-contain p-2" />
                  <span className="sr-only">{v.label}</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
