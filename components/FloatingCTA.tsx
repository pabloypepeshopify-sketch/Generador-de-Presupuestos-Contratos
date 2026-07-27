'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, MessageCircle } from 'lucide-react';
import { site } from '@/lib/site.config';

/**
 * Botones flotantes siempre accesibles (sobre todo en móvil):
 * reservar reunión + WhatsApp.
 */
export function FloatingCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 20 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-5 right-4 z-[9995] flex flex-col items-end gap-3"
        >
          {site.whatsapp && (
            <a
              href={`https://wa.me/${site.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Escríbenos por WhatsApp"
              data-cursor="WhatsApp"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] p-3.5 text-white shadow-lg transition-transform hover:scale-110"
            >
              <MessageCircle className="h-6 w-6" />
            </a>
          )}
          <a
            href="#reservar"
            aria-label="Reservar reunión"
            data-cursor="Reservar"
            className="flex items-center gap-2 rounded-full bg-brand px-5 py-3.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-105"
          >
            <CalendarClock className="h-5 w-5" />
            <span className="hidden sm:inline">Reservar reunión</span>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
