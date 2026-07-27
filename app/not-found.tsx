'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, CalendarClock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-blue/15 blur-[130px]" />
      <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative flex flex-col items-center gap-8"
      >
        <Logo />
        <motion.h1
          className="text-gradient-animate font-display text-[28vw] font-semibold leading-none sm:text-[18rem]"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          404
        </motion.h1>
        <p className="max-w-md text-lg text-ink-soft">
          Esta página se ha automatizado tanto… que ha desaparecido. Volvamos a lo importante.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-105"
          >
            <Home className="h-4 w-4" /> Volver al inicio
          </Link>
          <Link
            href="/#reservar"
            className="inline-flex items-center gap-2 rounded-full border border-ink-line px-7 py-3.5 text-sm font-semibold text-ink-soft transition hover:text-white"
          >
            <CalendarClock className="h-4 w-4" /> Reservar reunión
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
