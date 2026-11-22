'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Menu, X, Phone, CalendarDays } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { site } from '@/lib/site.config';
import { nav } from '@/lib/nav';
import { cn } from '@/lib/utils';


/** Cabecera fija translúcida que se compacta al hacer scroll. */
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
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header className={cn('fixed inset-x-0 top-0 z-[9990] transition-all duration-500', scrolled ? 'py-2' : 'py-4')}>
        <div className="container-x">
          <div
            className={cn(
              'flex items-center justify-between gap-4 rounded-full px-4 transition-all duration-500 sm:px-5',
              scrolled ? 'glass py-2 shadow-card' : 'py-2',
            )}
          >
            <Link href="/" aria-label={`${site.name}: inicio`} className="shrink-0">
              <Logo className="h-6 md:h-7" />
            </Link>

            <nav aria-label="Principal" className="hidden items-center gap-6 lg:flex xl:gap-8">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="group relative whitespace-nowrap text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-brand-cyan to-brand-violet transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/acceso"
                className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-ink-line px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:border-ink-strong hover:text-ink md:inline-flex"
              >
                <LogIn className="h-4 w-4" />
                <span className="lg:hidden xl:inline">Acceso clientes</span>
                <span className="hidden lg:inline xl:hidden">Acceso</span>
              </Link>
              <div className="hidden sm:block">
                <Button href="/#diagnostico" variant="primary" size="sm" className="whitespace-nowrap">
                  Diagnóstico
                </Button>
              </div>
              <button
                onClick={() => setOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink lg:hidden"
                aria-label="Abrir menú"
                aria-expanded={open}
                aria-controls="menu-movil"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Menú móvil */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-movil"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] overflow-y-auto bg-bg lg:hidden"
          >
            <div className="container-x flex items-center justify-between py-5">
              <Logo className="h-6" />
              <button
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full"
                aria-label="Cerrar menú"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav aria-label="Menú móvil" className="container-x mt-2 flex flex-col">
              {[...nav, { label: 'Reservar una visita', href: '/#visita' }].map((item, i) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i }}
                  className="border-b border-ink-line py-4 text-2xl font-semibold tracking-tight"
                >
                  {item.label}
                </motion.a>
              ))}
            </nav>
            <div className="container-x mb-10 mt-8 flex flex-col gap-3">
              <Button href="/#diagnostico" variant="primary" className="w-full" onClick={() => setOpen(false)}>
                Solicita tu diagnóstico inicial
              </Button>
              <Link
                href="/acceso"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full border border-ink-line px-7 py-3.5 text-sm font-semibold text-ink"
              >
                <LogIn className="h-4 w-4" /> Acceso clientes
              </Link>
              <div className="mt-4 flex flex-col gap-3 text-ink-soft">
                <a href={`tel:${site.phoneRaw}`} className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-accent" /> {site.phone}
                </a>
                <a href={`tel:${site.callPhoneRaw}`} className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-accent" /> {site.callPhone}
                </a>
                <a href="/#visita" onClick={() => setOpen(false)} className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-accent" /> Reservar una visita
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
