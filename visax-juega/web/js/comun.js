// VISAX Juega · configuración y estado compartidos por las tres páginas.
// Demo sin servidor: todo vive en este navegador (localStorage). La versión real
// guardaría jugadas, premios y canjes en Supabase y validaría cada toque NFC.

export const PIN_DEMO = '1234'; // PIN del camarero para canjear en la demo

export const TIPOS = {
  bar: {
    nombre: 'Bar',
    ejemplo: 'Bar La Plaza',
    premios: [
      { nombre: 'Caña gratis', peso: 30 },
      { nombre: 'Tapa gratis', peso: 25 },
      { nombre: 'Chupito de la casa', peso: 20 },
      { nombre: '2x1 en vermut', peso: 15 },
      { nombre: '10% en tu cuenta', peso: 10 },
    ],
    premioSellos: 'Ración gratis',
  },
  cafe: {
    nombre: 'Cafetería',
    ejemplo: 'Café Central',
    premios: [
      { nombre: 'Café gratis', peso: 30 },
      { nombre: 'Bollería gratis', peso: 25 },
      { nombre: 'Zumo natural gratis', peso: 20 },
      { nombre: '2x1 en tostadas', peso: 15 },
      { nombre: '10% en tu cuenta', peso: 10 },
    ],
    premioSellos: 'Desayuno completo gratis',
  },
  restaurante: {
    nombre: 'Restaurante',
    ejemplo: 'Restaurante El Puerto',
    premios: [
      { nombre: 'Postre gratis', peso: 30 },
      { nombre: 'Café gratis', peso: 25 },
      { nombre: 'Copa de vino', peso: 20 },
      { nombre: 'Entrante gratis', peso: 15 },
      { nombre: '10% en tu cuenta', peso: 10 },
    ],
    premioSellos: 'Menú del día gratis',
  },
};

export const COLORES = ['#E4572E', '#C2410C', '#B45309', '#15803D', '#0F766E', '#1D4ED8', '#7C3AED', '#BE185D', '#1F2937'];

const CLAVE_CFG = 'vj_cfg';
const CLAVE_CLIENTE = 'vj_cliente';

function leer(clave) {
  try { return JSON.parse(localStorage.getItem(clave)) || null; } catch { return null; }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* modo privado */ }
}

export function configPorDefecto(tipo = 'bar') {
  const t = TIPOS[tipo] || TIPOS.bar;
  return {
    nombre: t.ejemplo,
    tipo,
    color: COLORES[0],
    juego: 'rasca',
    premios: t.premios.map((p) => ({ ...p })),
    premioSellos: t.premioSellos,
    sellos: 5,
    wifi: { red: 'WiFi-Clientes', clave: 'bienvenido2026' },
    premiosPropios: false,
  };
}

function colorValido(c) {
  return /^#[0-9a-f]{6}$/i.test(c) ? c : null;
}

// Mezcla: por defecto ← guardado ← parámetros de la URL (n, t, c, j).
export function cargarConfig() {
  const url = new URLSearchParams(location.search);
  let cfg = { ...configPorDefecto(), ...(leer(CLAVE_CFG) || {}) };
  if ([...url.keys()].some((k) => ['n', 't', 'c', 'j'].includes(k))) {
    const tipo = TIPOS[url.get('t')] ? url.get('t') : cfg.tipo;
    if (tipo !== cfg.tipo && !cfg.premiosPropios) {
      cfg.premios = TIPOS[tipo].premios.map((p) => ({ ...p }));
      cfg.premioSellos = TIPOS[tipo].premioSellos;
    }
    cfg.tipo = tipo;
    if (url.get('n')) cfg.nombre = url.get('n').slice(0, 40);
    const c = colorValido('#' + (url.get('c') || '').replace('#', ''));
    if (c) cfg.color = c;
    if (['rasca', 'ruleta'].includes(url.get('j'))) cfg.juego = url.get('j');
    guardarConfig(cfg);
  }
  return cfg;
}

export function guardarConfig(cfg) { guardar(CLAVE_CFG, cfg); }

// Enlace a una página con la personalización en la URL (para QR y pegatinas NFC).
export function enlace(pagina, cfg, base = location.origin + location.pathname.replace(/[^/]*$/, '')) {
  const p = new URLSearchParams({ n: cfg.nombre, t: cfg.tipo, c: cfg.color.slice(1), j: cfg.juego });
  return `${base}${pagina}?${p.toString().replace(/\+/g, '%20')}`;
}

// ---------- Estado del cliente (este móvil) ----------
export function cargarCliente() {
  return { visitas: [], premios: [], jugadas: [], resenas: 0, ...(leer(CLAVE_CLIENTE) || {}) };
}
export function guardarCliente(est) { guardar(CLAVE_CLIENTE, est); }
export function reiniciarCliente() {
  try { localStorage.removeItem(CLAVE_CLIENTE); } catch { /* nada */ }
}

export function hoyISO(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

export function sumarDias(fechaISO, dias) {
  const d = new Date(fechaISO + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return hoyISO(d);
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function codigoPremio() {
  let s = '';
  const r = crypto.getRandomValues(new Uint8Array(4));
  for (const b of r) s += ALFABETO[b % ALFABETO.length];
  return 'VX-' + s;
}

// Sorteo ponderado: todos los premios tocan (sin "sigue intentándolo").
export function sortearPremio(premios) {
  const total = premios.reduce((s, p) => s + Math.max(0, Number(p.peso) || 0), 0) || 1;
  let r = Math.random() * total;
  for (let i = 0; i < premios.length; i++) {
    r -= Math.max(0, Number(premios[i].peso) || 0);
    if (r <= 0) return i;
  }
  return premios.length - 1;
}

export function fechaCorta(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function escapar(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Color de texto legible sobre el color del local
export function tintaSobre(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.4 ? '#14110F' : '#FFFFFF';
}

export function toast(texto) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = texto;
  el.classList.add('visible');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('visible'), 2600);
}
