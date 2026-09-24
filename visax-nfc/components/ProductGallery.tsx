'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/products';
import { cn } from '@/lib/utils';

/** Galería: foto real del producto + diseño frontal en alta resolución. */
export function ProductGallery({ product }: { product: Product }) {
  const views = [
    { src: product.image, alt: product.name, label: 'Producto' },
    { src: product.face, alt: `Diseño frontal de ${product.name}`, label: 'Diseño' },
  ];
  const [i, setI] = useState(0);
  return (
    <div>
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius)] border border-ink-line bg-[radial-gradient(60%_60%_at_50%_45%,rgba(124,92,255,0.3),transparent_70%)]">
        <div className="relative h-[82%] w-[70%]">
          <Image
            key={views[i].src}
            src={views[i].src}
            alt={views[i].alt}
            fill
            priority
            sizes="(min-width: 1024px) 520px, 90vw"
            className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
          />
        </div>
      </div>
      <div className="mt-4 flex gap-3" role="tablist" aria-label="Imágenes del producto">
        {views.map((v, k) => (
          <button
            key={v.src}
            role="tab"
            aria-selected={k === i}
            onClick={() => setI(k)}
            className={cn(
              'relative h-20 w-20 overflow-hidden rounded-2xl border bg-bg-soft transition',
              k === i ? 'border-brand-violet' : 'border-ink-line hover:border-brand-violet/50',
            )}
          >
            <Image src={v.src} alt="" fill sizes="80px" className="object-contain p-2" />
            <span className="sr-only">{v.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
