'use client';

import { useEffect, useState } from 'react';
import { hasHardwareWebGL, prefersReducedMotion } from '@/lib/webgl';

export type Mode3D = 'static' | 'full' | 'lite';

/**
 * Decide si se muestra la escena 3D: completa en escritorio, ligera en móvil
 * (cuando el navegador está libre) y nada sin GPU real o con movimiento reducido.
 */
export function use3D(enabled = true): Mode3D {
  const [mode, setMode] = useState<Mode3D>('static');
  useEffect(() => {
    if (!enabled) return;
    if (prefersReducedMotion() || (navigator.hardwareConcurrency ?? 4) < 4 || !hasHardwareWebGL()) return;
    const desktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
    if (desktop) return setMode('full');
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    const id = ric(() => setMode('lite'), { timeout: 1500 });
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id);
  }, [enabled]);
  return mode;
}
