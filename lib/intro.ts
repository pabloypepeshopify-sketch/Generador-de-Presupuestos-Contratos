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
 * Script en línea (se ejecuta antes de pintar el body). Decide:
 *  - data-intro: si la intro (preloader) se reproduce. Solo escritorio con ratón,
 *    sin movimiento reducido y una vez por sesión.
 *  - data-3d: modo de la experiencia 3D. "full" en escritorio, "lite" en móvil /
 *    tablet, "off" con movimiento reducido o equipos modestos (<4 núcleos, <2 GB).
 * Con 3D, el titular del hero espera a la explosión de la intro (data-hero="in");
 * si el 3D no llega a arrancar, a los 6 s entra igualmente.
 */
export const introScript = `(function(){var d=document.documentElement;try{var m=window.matchMedia;var rm=m('(prefers-reduced-motion: reduce)').matches;var desk=m('(min-width: 1024px) and (pointer: fine)').matches;var n=navigator,low=(n.hardwareConcurrency||4)<4||(n.deviceMemory&&n.deviceMemory<2);var mode=rm||low?'off':desk?'full':'lite';d.setAttribute('data-3d',mode);var play=!rm&&desk&&!sessionStorage.getItem('vx-intro');d.setAttribute('data-intro',play?'play':'skip');if(mode!=='off'){setTimeout(function(){if(!d.getAttribute('data-hero'))d.setAttribute('data-hero','in');},6000);}}catch(e){d.setAttribute('data-intro','skip');d.setAttribute('data-3d','off');}})();`;
