'use client';

import { useRef, type PointerEvent } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, BookOpenText, Check, ShoppingBag } from 'lucide-react';
import type { Product } from '@/lib/products';
import { bestTier, eur } from '@/lib/pricing';
import { useCart } from '@/components/cart/CartProvider';
import { ProductArt } from '@/components/ProductArt';

const MAX_TILT = 5;

export function ProductCard({ product, index }: { product: Product; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { add } = useCart();
  const best = bestTier(product);

  const onMove = (e: PointerEvent) => {
    const el = ref.current;
    if (reduce || !el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(px - 0.5) * 2 * MAX_TILT}deg`);
    el.style.setProperty('--rx', `${-(py - 0.5) * 2 * MAX_TILT}deg`);
  };
  const onLeave = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1200 }}
    >
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="card-fx card-tilt relative flex h-full flex-col overflow-hidden rounded-[var(--radius)] border border-ink-line bg-bg-soft/70"
      >
        <Link
          href={`/productos/${product.slug}`}
          className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[radial-gradient(60%_60%_at_50%_45%,rgba(124,92,255,0.28),transparent_70%)]"
          aria-label={`Ver ${product.name}`}
        >
          {product.extra && (
            <span className="absolute left-4 top-4 z-10 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#06060B] shadow-glow">
              + Te hacemos la carta digital
            </span>
          )}
          <div className="relative h-[82%] w-[60%]" style={{ transform: 'translateZ(40px)' }}>
            <ProductArt
              product={product}
              sizes="(min-width: 1024px) 320px, 60vw"
              className="drop-shadow-[0_24px_40px_rgba(0,0,0,0.6)]"
            />
          </div>
        </Link>

        <div className="flex flex-1 flex-col gap-4 p-7" style={{ transform: 'translateZ(20px)' }}>
          <div>
            <h3 className="font-display text-2xl leading-tight">{product.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{product.tagline}</p>
          </div>
          {product.extra && (
            <Link
              href={`/productos/${product.slug}#carta-digital`}
              className="flex items-center gap-3 rounded-2xl border border-brand-cyan/40 bg-brand-gradient-soft px-4 py-3 text-sm transition hover:border-brand-cyan"
            >
              <BookOpenText className="h-5 w-5 shrink-0 text-brand-cyan" />
              <span className="flex-1">
                <strong className="block text-white">{product.extra.title}</strong>
                <span className="text-ink-soft">Nueva, o mejoramos la que ya tienes</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-soft" />
            </Link>
          )}
          <ul className="space-y-1.5 text-sm text-ink-soft">
            {product.bullets.slice(0, 3).map((b) => (
              <li key={b} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" /> {b}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-end justify-between gap-4 pt-2">
            <div>
              <p className="font-display text-3xl tabular-nums">{eur(product.price)}</p>
              <p className="text-xs text-ink-soft">
                IVA incl.
                {best.min > 1 && (
                  <>
                    {' '}· <span className="text-white">{eur(best.price)}</span>/ud desde {best.min} ud
                  </>
                )}
              </p>
              {product.priceNote && <p className="mt-1 text-xs text-brand-cyan">{product.priceNote}</p>}
            </div>
            <Link
              href={`/productos/${product.slug}`}
              className="inline-flex items-center gap-1 text-sm text-ink-soft transition hover:text-white"
            >
              Detalles <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <button
            onClick={() => add(product.slug)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient px-6 py-3.5 font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            <ShoppingBag className="h-4 w-4" /> Añadir al carrito
          </button>
        </div>
      </div>
    </motion.article>
  );
}
