/** Une clases condicionales sin dependencias externas. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Detecta preferencia de movimiento reducido (SSR-safe). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Detecta dispositivos táctiles / móviles para degradar animaciones pesadas. */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window;
}

/**
 * ¿Merece la pena el WebGL decorativo? Solo escritorio con ratón (≥1024 px),
 * ≥4 núcleos, sin movimiento reducido y con WebGL disponible.
 * En móvil / tablet táctil / equipos modestos se usa el respaldo estático.
 */
export function canUseWebGL(): boolean {
  if (typeof window === 'undefined' || prefersReducedMotion()) return false;
  if (!window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches) return false;
  if ((navigator.hardwareConcurrency ?? 4) < 4) return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}
