/**
 * Coordinación entre el preloader y el hero WebGL.
 * El preloader avisa al terminar; el hero no carga Three.js hasta entonces,
 * así la intro nunca compite con la descarga del canvas.
 */
export const INTRO_DONE_EVENT = 'visax:intro-done';

type IntroWindow = Window & { __vxIntroDone?: boolean };

export function markIntroDone() {
  (window as IntroWindow).__vxIntroDone = true;
  window.dispatchEvent(new Event(INTRO_DONE_EVENT));
}

/** Ejecuta `cb` en cuanto la intro haya terminado (o ya, si no hubo intro). */
export function onIntroDone(cb: () => void): () => void {
  if ((window as IntroWindow).__vxIntroDone) {
    cb();
    return () => {};
  }
  window.addEventListener(INTRO_DONE_EVENT, cb, { once: true });
  return () => window.removeEventListener(INTRO_DONE_EVENT, cb);
}

/**
 * Script en línea (se ejecuta antes de pintar el body): decide si la intro
 * se reproduce. Solo escritorio con ratón, sin movimiento reducido y una
 * vez por sesión. Así el overlay nunca parpadea en móvil ni en visitas repetidas.
 */
export const introScript = `(function(){try{var d=document.documentElement,m=window.matchMedia;var play=!m('(prefers-reduced-motion: reduce)').matches&&m('(min-width: 1024px) and (pointer: fine)').matches&&!sessionStorage.getItem('vx-intro');d.setAttribute('data-intro',play?'play':'skip');}catch(e){document.documentElement.setAttribute('data-intro','skip');}})();`;
