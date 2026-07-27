'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie } from 'lucide-react';

const KEY = 'visax-cookie-consent';

/** Banner de cookies minimalista y elegante. */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (!stored) {
      const t = setTimeout(() => setVisible(true), 2600);
      return () => clearTimeout(t);
    }
  }, []);

  const decide = (value: 'accepted' | 'rejected') => {
    localStorage.setItem(KEY, value);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-3 z-[9996] mx-auto max-w-xl md:inset-x-auto md:left-6 md:bottom-6"
          role="dialog"
          aria-label="Aviso de cookies"
        >
          <div className="glass flex flex-col gap-4 rounded-2xl p-5 shadow-card sm:flex-row sm:items-center">
            <Cookie className="hidden h-6 w-6 shrink-0 text-brand-cyan sm:block" />
            <p className="text-sm text-ink-soft">
              Usamos cookies para mejorar tu experiencia. Puedes aceptarlas o rechazar las no
              esenciales.
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => decide('rejected')}
                className="rounded-full px-4 py-2 text-xs font-semibold text-ink-soft transition hover:text-white"
              >
                Rechazar
              </button>
              <button
                onClick={() => decide('accepted')}
                className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-glow"
              >
                Aceptar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
