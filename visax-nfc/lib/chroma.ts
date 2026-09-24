/**
 * ─────────────────────────────────────────────────────────────
 *  EFECTO 3 — Aberración cromática de marca al hacer scroll
 *  Dos "fantasmas" del titular (violeta y cian) se separan en
 *  proporción a la velocidad del scroll: 0 px en reposo, 3 px como
 *  máximo, y vuelta a 0 en ~200 ms cuando el scroll para.
 *  Solo afecta al titular de la sección que ENTRA en pantalla.
 *  Es el efecto más prescindible: para quitarlo basta con no llamar
 *  a startChroma() en SmoothScroll.
 * ─────────────────────────────────────────────────────────────
 */

const MAX_PX = 3;
const GAIN = 0.06; // px de separación por px/frame de velocidad de Lenis
const DECAY_TAU_MS = 60; // e^(-200/60) ≈ 3 % → a 0 en ~200 ms
const IDLE_MS = 50; // sin eventos de scroll durante este tiempo = scroll parado

const headings = new Set<HTMLElement>();
const lower = new Set<Element>(); // titulares en la mitad inferior (entran bajando)
const upper = new Set<Element>(); // titulares en la mitad superior (entran subiendo)
let ioLower: IntersectionObserver | null = null;
let ioUpper: IntersectionObserver | null = null;

let running = false;
let current = 0;
let target = 0;
let lastEvent = 0;
let lastTime = 0;
let raf = 0;
let active: HTMLElement | null = null;

function track(set: Set<Element>) {
  return (entries: IntersectionObserverEntry[]) =>
    entries.forEach((e) => (e.isIntersecting ? set.add(e.target) : set.delete(e.target)));
}

function clear(el: HTMLElement | null) {
  if (!el) return;
  el.removeAttribute('data-chroma');
  el.style.removeProperty('--chroma');
}

function loop(now: number) {
  const dt = lastTime ? now - lastTime : 16;
  lastTime = now;
  if (now - lastEvent > IDLE_MS) target = 0;
  current = target > current ? target : current * Math.exp(-dt / DECAY_TAU_MS);
  if (current < 0.05) current = 0;

  if (active) {
    if (current === 0) clear(active);
    else {
      active.setAttribute('data-chroma', '');
      active.style.setProperty('--chroma', current.toFixed(2));
    }
  }

  if (current === 0) {
    raf = 0;
    lastTime = 0;
    return;
  }
  raf = requestAnimationFrame(loop);
}

/** Registra un titular de sección (lo hace SectionHeading). */
export function registerChroma(el: HTMLElement): () => void {
  headings.add(el);
  ioLower?.observe(el);
  ioUpper?.observe(el);
  return () => {
    headings.delete(el);
    ioLower?.unobserve(el);
    ioUpper?.unobserve(el);
    lower.delete(el);
    upper.delete(el);
    if (active === el) active = null;
    clear(el);
  };
}

/** Lo llama SmoothScroll en cada evento de scroll de Lenis. */
export function chromaOnScroll(velocity: number, direction: number) {
  if (!running) return;
  lastEvent = performance.now();
  target = Math.min(MAX_PX, Math.abs(velocity) * GAIN);

  const zone = direction < 0 ? upper : lower;
  const next = (zone.values().next().value as HTMLElement | undefined) ?? null;
  if (next !== active) {
    clear(active);
    active = next;
  }
  if (!raf) raf = requestAnimationFrame(loop);
}

/** Activa el efecto (solo escritorio; con reduced-motion no hay Lenis y no se llama). */
export function startChroma(): () => void {
  running = true;
  ioLower = new IntersectionObserver(track(lower), { rootMargin: '-55% 0px 0px 0px' });
  ioUpper = new IntersectionObserver(track(upper), { rootMargin: '0px 0px -55% 0px' });
  headings.forEach((el) => {
    ioLower?.observe(el);
    ioUpper?.observe(el);
  });
  return () => {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
    ioLower?.disconnect();
    ioUpper?.disconnect();
    ioLower = ioUpper = null;
    lower.clear();
    upper.clear();
    clear(active);
    active = null;
    current = target = 0;
  };
}
