'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { site } from '@/lib/site.config';

/** Botón flotante de WhatsApp + aviso "¿dudas? te ayudamos a elegir" (una vez por sesión). */
export function FloatingHelp() {
  const [hint, setHint] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = !!sessionStorage.getItem('vx-nfc-hint');
    } catch {
      /* ignorar */
    }
    if (seen) return;
    const t = setTimeout(() => setHint(true), 9000);
    return () => clearTimeout(t);
  }, []);

  const closeHint = () => {
    setHint(false);
    try {
      sessionStorage.setItem('vx-nfc-hint', '1');
    } catch {
      /* ignorar */
    }
  };

  const href = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent('Hola, tengo una duda sobre los productos NFC de VISAX.')}`;

  return (
    <div className="fixed bottom-5 right-5 z-[9980] flex flex-col items-end gap-3">
      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="glass relative max-w-[260px] rounded-2xl p-4 pr-9 text-sm shadow-card"
            role="status"
          >
            <p className="font-semibold">¿Dudas con tu pedido?</p>
            <p className="mt-1 text-ink-soft">Escríbenos y te ayudamos a elegir lo que mejor va a tu negocio.</p>
            <button onClick={closeHint} className="absolute right-3 top-3 text-ink-soft hover:text-white" aria-label="Cerrar aviso">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={closeHint}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-[#06060B] shadow-[0_10px_40px_-8px_rgba(37,211,102,0.6)] transition hover:scale-105"
        aria-label="Escríbenos por WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  );
}
