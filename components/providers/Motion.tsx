'use client';

import { MotionConfig } from 'framer-motion';

// reducedMotion="user": con prefers-reduced-motion, framer-motion no anima transformaciones.
export function Motion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
