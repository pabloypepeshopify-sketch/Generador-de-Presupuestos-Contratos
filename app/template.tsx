'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

// Primera carga: sin fundido. El HTML del servidor se ve desde el primer pintado
// (LCP en móvil, y la página no queda en blanco sin JS). Navegaciones: fundido.
let firstLoad = true;

/**
 * Transición de entrada entre páginas (se remonta en cada navegación).
 * Nunca hay cortes bruscos: fundido + leve desplazamiento.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const initial = firstLoad ? false : { opacity: 0, y: 12 };
  useEffect(() => {
    firstLoad = false;
  }, []);

  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
