'use client';

import { motion, useScroll, useSpring } from 'framer-motion';

/** Barra de progreso de scroll con degradado de marca. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-[9997] h-[3px] origin-left bg-brand"
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
}
