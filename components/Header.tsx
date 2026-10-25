'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Menu, X, Phone } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { site } from '@/lib/site.config';
import { cn } from '@/lib/utils';

const nav = [
  { label: 'Servicios', href: '#servicios' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Resultados', href: '#resultados' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contacto', href: '#contacto' },
];

// En el menú del móvil también aparece "Nosotros" (en escritorio no cabe).
const navMobile = [...nav.slice(0, 3), { label: 'Nosotros', href: '#nosotros' }, ...nav.slice(3)];

/** Header fijo translúcido que se compacta al hacer scroll. */
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
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed inset-x-0 top-0 z-[9990] transition-all duration-500',
          scrolled ? 'py-2' : 'py-4',
        )}
      >
        <div className="container-x">
          <div
            className={cn(
              'flex items-center justify-between rounded-full px-4 transition-all duration-500 sm:px-6',
              scrolled ? 'glass py-2.5 shadow-card' : 'py-2',
            )}
          >
            <Link href="/" aria-label="VISAX AI — inicio" data-cursor="Inicio">
              <Logo />
            </Link>

            <nav className="hidden items-center gap-8 lg:flex">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="group relative whitespace-nowrap text-sm font-medium text-ink-soft transition-colors hover:text-white"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-brand-cyan to-brand-violet transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
              <a
                href={site.nfcUrl}
                target="_blank"
                rel="noopener"
                className="hidden items-center gap-1 whitespace-nowrap rounded-full border border-brand-violet/40 px-3.5 py-1.5 text-sm font-medium text-white transition hover:border-brand-violet xl:inline-flex"
              >
                Tienda NFC <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${site.phoneRaw}`}
                className="hidden items-center gap-2 whitespace-nowrap text-sm font-medium text-ink-soft transition-colors hover:text-white md:flex xl:hidden"
                aria-label="Llamar ahora"
              >
                <Phone className="h-4 w-4" />
                {site.phone}
              </a>
              <div className="hidden sm:block">
                <MagneticButton href="#reservar" variant="primary" cursorLabel="Reservar" className="whitespace-nowrap px-5 py-2.5">
                  Reservar reunión
                </MagneticButton>
              </div>
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
      </motion.header>

      {/* Menú móvil */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-bg/95 backdrop-blur-xl lg:hidden"
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
            <nav className="container-x mt-10 flex flex-col gap-2">
              {navMobile.map((item, i) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * i }}
                  className="border-b border-ink-line py-5 font-display text-3xl"
                >
                  {item.label}
                </motion.a>
              ))}
              <motion.a
                href={site.nfcUrl}
                target="_blank"
                rel="noopener"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * navMobile.length }}
                className="flex items-center gap-2 border-b border-ink-line py-5 font-display text-3xl"
              >
                Tienda NFC <ArrowUpRight className="h-6 w-6 text-brand-cyan" />
              </motion.a>
            </nav>
            <div className="container-x mt-10 flex flex-col gap-4">
              <a href={`tel:${site.phoneRaw}`} className="flex items-center gap-3 text-lg text-ink-soft">
                <Phone className="h-5 w-5 text-brand-cyan" /> {site.phone}
              </a>
              <MagneticButton href="#reservar" variant="primary" className="w-full">
                Reservar reunión
              </MagneticButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
