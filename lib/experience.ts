/**
 * ─────────────────────────────────────────────────────────────
 *  EXPERIENCIA 3D (hero + servicios) — estado compartido
 *  El scroll (GSAP ScrollTrigger) escribe aquí; la escena WebGL lo
 *  lee en cada frame. Sin estado de React: cero re-renders.
 * ─────────────────────────────────────────────────────────────
 */

export type XpMode = 'full' | 'lite' | 'off';

export const XP_EVENTS = {
  /** La escena 3D ya pinta (el preloader puede retirarse). */
  READY: 'visax:3d-ready',
  /** Fin de la explosión de la intro: entra el titular del hero. */
  HERO_IN: 'visax:hero-in',
  /** Abrir el detalle de un servicio (detail: slug). */
  OPEN_SERVICE: 'visax:open-service',
  /** Cambia la tarjeta enfocada por la cámara (detail: índice o -1). */
  ACTIVE_CARD: 'visax:active-card',
} as const;

/** Progresos de scroll 0..1 y visibilidad del canvas (los escribe <Experience />). */
export const XP = {
  hero: 0, // desde el hero arriba hasta que empieza el recorrido de servicios
  services: 0, // recorrido de la cámara entre las tarjetas
  fade: 1, // opacidad del canvas al salir de servicios (0 = pausado)
  active: -1, // tarjeta enfocada
};

/* Recorrido de cámara por el pasillo de tarjetas (unidades de mundo). */
export const CARD_COUNT = 9;
export const CARD_Z0 = -10; // z de la primera tarjeta
export const CARD_GAP = 7; // separación entre tarjetas
export const FOCUS_DIST = 6; // distancia cámara → tarjeta enfocada
export const CAM_HERO = 14; // cámara durante el hero
export const CAM_START = 4; // cámara al empezar el recorrido
export const CAM_END = CARD_Z0 - CARD_GAP * (CARD_COUNT - 1) + FOCUS_DIST; // enfocando la última

export const camZForServices = (s: number) => CAM_START + (CAM_END - CAM_START) * s;

/** Progreso de servicios (0..1) en el que la tarjeta i queda enfocada. */
export const sForCard = (i: number) =>
  (CAM_START - (CARD_Z0 - CARD_GAP * i + FOCUS_DIST)) / (CAM_START - CAM_END);

/** Tarjeta enfocada para una posición de cámara (o -1 antes de la primera). */
export function activeForCamZ(z: number) {
  const f = (CARD_Z0 + FOCUS_DIST - z) / CARD_GAP;
  if (f < -0.5) return -1;
  return Math.max(0, Math.min(CARD_COUNT - 1, Math.round(f)));
}

export function xpMode(): XpMode {
  if (typeof document === 'undefined') return 'off';
  const m = document.documentElement.getAttribute('data-3d');
  return m === 'full' || m === 'lite' ? m : 'off';
}

/**
 * ¿Hay WebGL con aceleración por GPU? Si el navegador dibuja WebGL por software
 * (SwiftShader, llvmpipe…: equipos sin GPU usable, máquinas virtuales, algunos
 * bots de medición) la escena iría a tirones, así que se usa la versión HTML.
 * `?xp3d` en la URL lo fuerza (solo para pruebas).
 */
export function hasHardwareWebGL(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has('xp3d')) return true;
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

export function emit(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Suaviza hacia 0/1 como smoothstep de GLSL. */
export function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
