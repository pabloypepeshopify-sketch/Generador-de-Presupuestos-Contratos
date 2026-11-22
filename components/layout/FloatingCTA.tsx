'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, MessageCircle } from 'lucide-react';
import { site } from '@/lib/site.config';

/**
 * Accesos flotantes (sobre todo para móvil): diagnóstico + WhatsApp.
 * Se esconden al llegar al formulario para no taparlo.
 */
export function FloatingCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const form = document.getElementById('diagnostico');
      const nearForm = form ? form.getBoundingClientRect().top < window.innerHeight * 0.9 : false;
      setShow(window.scrollY > 700 && !nearForm);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-5 right-4 z-[9995] flex flex-col items-end gap-3"
        >
          {site.whatsapp && (
            <a
              href={`https://wa.me/${site.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Escríbenos por WhatsApp"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
            >
              <MessageCircle className="h-6 w-6" />
            </a>
          )}
          <a
            href="/#diagnostico"
            aria-label="Solicita tu diagnóstico inicial"
            className="flex items-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-[#06060B] shadow-glow transition-transform hover:scale-[1.03]"
          >
            <ClipboardCheck className="h-5 w-5" />
            <span className="hidden sm:inline">Diagnóstico</span>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
