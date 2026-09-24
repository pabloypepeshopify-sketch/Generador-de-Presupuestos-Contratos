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

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
