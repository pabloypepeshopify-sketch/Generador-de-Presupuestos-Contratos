'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Menu, ShoppingBag, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useCart } from '@/components/cart/CartProvider';
import { site } from '@/lib/site.config';
import { cn } from '@/lib/utils';

const nav = [
  { label: 'Inicio', href: '/#inicio' },
  { label: 'Productos', href: '/#productos' },
  { label: 'Cómo funciona', href: '/#como-funciona' },
  { label: 'Preguntas', href: '/#preguntas' },
];

function CartButton({ className }: { className?: string }) {
  const { count, setOpen } = useCart();
  return (
    <button
      onClick={() => setOpen(true)}
      className={cn(
        'relative flex h-10 w-10 items-center justify-center rounded-full border border-ink-line text-white transition hover:border-brand-violet/60',
        className,
      )}
      aria-label={`Abrir carrito (${count} ${count === 1 ? 'producto' : 'productos'})`}
    >
      <ShoppingBag className="h-[18px] w-[18px]" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gradient px-1 text-[11px] font-bold tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}

/** Cabecera fija translúcida con enlace a VISAX AI y carrito. */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  return (
    <>
      <header className={cn('fixed inset-x-0 top-0 z-[9990] transition-all duration-500', scrolled ? 'py-2' : 'py-4')}>
        <div className="container-x">
          <div
            className={cn(
              'flex items-center justify-between gap-4 rounded-full px-4 transition-all duration-500 sm:px-6',
              scrolled ? 'glass py-2.5 shadow-card' : 'py-2',
            )}
          >
            <Link href="/" aria-label="VISAX NFC — inicio">
              <Logo />
            </Link>

            <nav className="hidden items-center gap-7 lg:flex" aria-label="Principal">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="group relative text-sm font-medium text-ink-soft transition-colors hover:text-white"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-brand-cyan to-brand-violet transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
              <a
                href={site.aiUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 rounded-full border border-brand-violet/40 px-3.5 py-1.5 text-sm font-medium text-white transition hover:border-brand-violet hover:bg-brand-violet/10"
              >
                Automatizaciones IA <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <CartButton />
              <button
                onClick={() => setOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-ink lg:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-bg/95 backdrop-blur-xl lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
          >
            <div className="container-x flex items-center justify-between py-6">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full"
                aria-label="Cerrar menú"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="container-x mt-8 flex flex-col gap-1" aria-label="Principal">
              {nav.map((item, i) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i }}
                  className="border-b border-ink-line py-5 font-display text-3xl"
                >
                  {item.label}
                </motion.a>
              ))}
              <motion.a
                href={site.aiUrl}
                target="_blank"
                rel="noopener"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.06 * nav.length }}
                className="flex items-center gap-2 py-5 font-display text-3xl text-gradient"
              >
                Automatizaciones IA <ArrowUpRight className="h-6 w-6 text-brand-violet" />
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
