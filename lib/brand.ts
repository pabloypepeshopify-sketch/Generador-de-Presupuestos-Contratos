/**
 * ─────────────────────────────────────────────────────────────
 *  LOGOTIPO VISAX AI — geometría vectorial única
 *  Vectorizado a mano a partir del logotipo oficial (PNG 1254px).
 *  Todo el que pinta el logo (header, footer, preloader, OG,
 *  favicons) sale de aquí para que nunca haya dos versiones.
 * ─────────────────────────────────────────────────────────────
 */

const WHITE = '#F6F7FB';
const SHADE = '#AEB4C6';
const CYAN = '#33C6F4';
const BLUE = '#3F7DFB';
const VIOLET = '#7C5CFF';
const DEEP = '#6D28D9';

/** Isotipo "V/K" (coordenadas en caja 526 × 358). */
const MARK = {
  w: 526,
  h: 358,
  whiteArm: 'M320 130H436L317 298H208Z',
  kLeg: 'M425 202L526 356H408L363 290Z',
  vArm: 'M0.4 1H107Q121.5 1 128.8 13L314 292C320 303 288 357 253 357C238 357 226 352 219.9 343Z',
  topBar: 'M300 98L361 11Q368 1 380 1H525L458 98Z',
};

/** Wordmark "VISAX AI" (coordenadas en caja 921 × 105, altura de mayúscula 105). */
const WORD = {
  w: 921,
  h: 105,
  white: [
    'M0 0H24L62 78.2L100 0H124L72.5 105H51.5Z', // V
    'M181 0H202V105H181Z', // I
    'M419 105H442.5L481.25 25.3L520 105H544L493 0H469.5Z', // Λ
    'M591 0H619L708 105H681Z', // X
    'M680 0H707L617 105H590Z', // X
  ],
  // La S es un trazo (no un relleno) para mantener el grosor constante.
  s: 'M365 10.5H295.5A21 21 0 0 0 295.5 52.5H337.5A21 21 0 0 1 337.5 94.5H264.5',
  ai: [
    'M770 98H787L815.5 39L843.5 98H860L824 19H807Z', // A
    'M812 63H838L845 79H806Z', // barra de la A
    'M906 19H921V98H906Z', // I
  ],
};

function markDefs(id: string) {
  return (
    `<linearGradient id="${id}v" x1="0" y1="0" x2="253" y2="357" gradientUnits="userSpaceOnUse">` +
    `<stop stop-color="${CYAN}"/><stop offset=".45" stop-color="${BLUE}"/>` +
    `<stop offset=".82" stop-color="${VIOLET}"/><stop offset="1" stop-color="${DEEP}"/></linearGradient>` +
    `<linearGradient id="${id}t" x1="300" y1="98" x2="525" y2="1" gradientUnits="userSpaceOnUse">` +
    `<stop stop-color="${BLUE}"/><stop offset="1" stop-color="${VIOLET}"/></linearGradient>` +
    `<linearGradient id="${id}w" x1="436" y1="130" x2="262" y2="298" gradientUnits="userSpaceOnUse">` +
    `<stop stop-color="${WHITE}"/><stop offset=".55" stop-color="${WHITE}"/><stop offset="1" stop-color="${SHADE}"/></linearGradient>` +
    `<linearGradient id="${id}k" x1="363" y1="290" x2="400" y2="306" gradientUnits="userSpaceOnUse">` +
    `<stop stop-color="${SHADE}"/><stop offset="1" stop-color="${WHITE}"/></linearGradient>`
  );
}

function wordDefs(id: string) {
  return (
    `<linearGradient id="${id}a" x1="770" y1="19" x2="921" y2="98" gradientUnits="userSpaceOnUse">` +
    `<stop stop-color="${CYAN}"/><stop offset=".35" stop-color="${BLUE}"/>` +
    `<stop offset=".75" stop-color="${VIOLET}"/><stop offset="1" stop-color="${DEEP}"/></linearGradient>`
  );
}

function markBody(id: string) {
  return (
    `<path d="${MARK.whiteArm}" fill="url(#${id}w)"/>` +
    `<path d="${MARK.kLeg}" fill="url(#${id}k)"/>` +
    `<path d="${MARK.vArm}" fill="url(#${id}v)"/>` +
    `<path d="${MARK.topBar}" fill="url(#${id}t)"/>`
  );
}

function wordBody(id: string, mono = false) {
  const white = mono ? 'currentColor' : WHITE;
  const ai = mono ? 'currentColor' : `url(#${id}a)`;
  return (
    WORD.white.map((d) => `<path d="${d}" fill="${white}"/>`).join('') +
    `<path d="${WORD.s}" fill="none" stroke="${white}" stroke-width="21"/>` +
    WORD.ai.map((d) => `<path d="${d}" fill="${ai}"/>`).join('')
  );
}

/** Trazados del isotipo (caja 526 × 358) para extruirlo en 3D. */
export const MARK_SHAPES = {
  w: MARK.w,
  h: MARK.h,
  silver: [MARK.whiteArm, MARK.kLeg],
  colored: [MARK.vArm, MARK.topBar],
};

export type LogoVariant = 'mark' | 'lockup' | 'stacked' | 'word';

/** Proporciones de cada variante (ancho / alto) para reservar hueco sin saltos. */
export const LOGO_VIEWBOX: Record<LogoVariant, [number, number]> = {
  mark: [MARK.w, MARK.h],
  lockup: [2110, MARK.h],
  stacked: [WORD.w, 523],
  word: [WORD.w, WORD.h],
};

/**
 * Devuelve el SVG del logo como cadena.
 *  - mark:    solo isotipo (preloader, favicon)
 *  - lockup:  isotipo + wordmark en horizontal (header, footer)
 *  - stacked: isotipo sobre wordmark, como el original (imagen OG)
 *  - word:    solo wordmark, monocromo (currentColor) — marca de agua del footer
 * `id` evita colisiones de degradados cuando hay varios logos en la página.
 */
export function logoSvg(variant: LogoVariant, id = 'vx', attrs = ''): string {
  const [w, h] = LOGO_VIEWBOX[variant];
  let defs = markDefs(id);
  let body: string;

  if (variant === 'word') {
    defs = '';
    body = wordBody(id, true);
  } else if (variant === 'mark') {
    body = markBody(id);
  } else if (variant === 'lockup') {
    // Wordmark a 168 de altura de mayúscula (≈ 47 % del isotipo), centrado en vertical.
    defs += wordDefs(id);
    body = markBody(id) + `<g transform="translate(636 95) scale(1.6)">${wordBody(id)}</g>`;
  } else {
    defs += wordDefs(id);
    body = `<g transform="translate(183 0)">${markBody(id)}</g><g transform="translate(0 418)">${wordBody(id)}</g>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="none" ${attrs}>` +
    `<defs>${defs}</defs>${body}</svg>`
  );
}
