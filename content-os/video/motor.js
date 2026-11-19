// Motor 3D de los vídeos VISAX NFC: escena de bar, tarjetas, móvil, ondas NFC, antena, cocina y personajes.
// Se renderiza fotograma a fotograma (window.frame(t)) desde render.mjs. 1080×1920, vertical.
import * as THREE from 'three';
import { construirBar, persona as personaGL } from './bar.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { aplicarEstilo, dibujar3D } from './estilos.js';
import { construirRestaurante, poblar, manosPOV, cana, bravas, caja, muneco, mat as matJ } from './juguete.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { construirMaqueta, recorrido, distanciaRecorrida, P } from './diorama.js';
let ESTILO = null;

const W = 1080, H = 1920;
const FUENTE = 'Inter, "Inter Display", "DejaVu Sans", Arial, sans-serif';
const VX = { cian: '#33C6F4', azul: '#3F7DFB', violeta: '#7C5CFF', morado: '#6D28D9', amarillo: '#FFD400', naranja: '#FF7A1A' };

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const prog = (t, a, b) => ease(clamp((t - a) / (b - a)));
const lerp = (a, b, k) => a + (b - a) * k;
const entre = (t, a, b) => t >= a && t < b;
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');

function rr(x, X, Y, w, h, r) {
  x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r);
  x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
}
function grad(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
const DEGRADADO = [VX.cian, VX.azul, VX.violeta, VX.morado];

function lienzo(w, h, dibujar) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); if (dibujar) dibujar(x, w, h);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { tex, c, x, w, h, clave: null, pintar(clave, fn) { if (clave === this.clave) return; this.clave = clave; x.clearRect(0, 0, w, h); fn(x, w, h); tex.needsUpdate = true; } };
}

// Logo VISAX (paths del marca.svg) escalado a (X,Y,ancho)
function logoVisax(x, X, Y, ancho) {
  const s = ancho / 526; x.save(); x.translate(X, Y); x.scale(s, s);
  const g2 = grad(x, 0, 0, 253, 357, DEGRADADO);
  x.fillStyle = '#F6F7FB'; x.fill(new Path2D('M320 130H436L317 298H208Z')); x.fill(new Path2D('M425 202L526 356H408L363 290Z'));
  x.fillStyle = g2; x.fill(new Path2D('M0.4 1H107Q121.5 1 128.8 13L314 292C320 303 288 357 253 357C238 357 226 352 219.9 343Z'));
  x.fillStyle = grad(x, 300, 98, 525, 1, [VX.azul, VX.violeta]); x.fill(new Path2D('M300 98L361 11Q368 1 380 1H525L458 98Z'));
  x.restore();
}
function iconoNFC(x, cx, cy, s, color) {
  x.save(); x.strokeStyle = color; x.lineWidth = s * 0.09; x.lineCap = 'round';
  for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(cx - s * 0.35, cy, s * (0.18 + i * 0.17), -0.75, 0.75); x.stroke(); }
  x.restore();
}
function estrellas(x, cx, cy, s, n, llenas, color = '#FFC300') {
  for (let i = 0; i < n; i++) {
    const X = cx + (i - (n - 1) / 2) * s * 1.15; x.beginPath();
    for (let k = 0; k < 10; k++) { const r = k % 2 ? s * 0.22 : s * 0.5, a = -Math.PI / 2 + k * Math.PI / 5; x.lineTo(X + r * Math.cos(a), cy + r * Math.sin(a)); }
    x.closePath(); x.fillStyle = i < llenas ? color : 'rgba(255,255,255,0.25)'; x.fill();
  }
}
function texto(x, t, X, Y, tam, color, peso = 800, al = 'center') { x.font = `${peso} ${tam}px ${FUENTE}`; x.fillStyle = color; x.textAlign = al; x.textBaseline = 'middle'; x.fillText(t, X, Y); }

// ---------- renderer y escena base ----------
const Q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: Q.get('aa') !== '0', preserveDrawingBuffer: true });
const ESC = Number(Q.get('escala') || 0.667);
renderer.setPixelRatio(1); renderer.setSize(Math.round(W * ESC), Math.round(H * ESC), false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = Q.get('sombras') !== '0'; renderer.shadowMap.type = THREE.PCFShadowMap;
const salida = document.createElement('canvas'); salida.width = W; salida.height = H;
const C = salida.getContext('2d');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a0f1f'); scene.fog = new THREE.Fog('#0a0f1f', 7, 20);
const cam = new THREE.PerspectiveCamera(32, W / H, 0.01, 60);
const hemi = new THREE.HemisphereLight('#9fb2ff', '#3a2414', 0.9); scene.add(hemi);
const foco = new THREE.SpotLight('#ffd9a8', 140, 18, 0.55, 0.7, 1.4);
foco.position.set(1.6, 5.5, 3.2); foco.castShadow = true; foco.shadow.mapSize.set(1024, 1024); foco.shadow.bias = -0.0004;
scene.add(foco, foco.target);
const relleno = new THREE.PointLight(VX.azul, 14, 12, 1.6); relleno.position.set(-3, 1.8, 2.2); scene.add(relleno);
const lampara = new THREE.PointLight('#ffb35c', 18, 10, 1.5); lampara.position.set(1.8, 2.4, -2); scene.add(lampara);
const contra = new THREE.PointLight(VX.violeta, 10, 10, 1.6); contra.position.set(-1.5, 1.5, -2.5); scene.add(contra);

// pared del fondo con luces desenfocadas (bokeh) de bar
const texBokeh = lienzo(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
const bokeh = new THREE.Group(); scene.add(bokeh);
{
  let s = 7; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const cols = ['#ffb35c', '#ffd28a', '#ff8f4a', VX.cian, VX.violeta, '#ffe3b0'];
  for (let i = 0; i < 46; i++) {
    const m = new THREE.SpriteMaterial({ map: texBokeh.tex, color: cols[i % cols.length], transparent: true, opacity: 0.25 + rnd() * 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const sp = new THREE.Sprite(m); const k = 0.3 + rnd() * 1.1; sp.scale.set(k, k, 1);
    sp.position.set((rnd() - 0.5) * 16, 0.2 + rnd() * 5, -6 - rnd() * 6); bokeh.add(sp);
  }
}
const pared = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshStandardMaterial({ color: '#141a2e', roughness: 1 }));
pared.position.set(0, 4, -12.5); scene.add(pared);
const suelo = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: '#2a1d16', roughness: 0.9 }));
suelo.rotation.x = -Math.PI / 2; suelo.position.y = -0.78; suelo.receiveShadow = true; scene.add(suelo);

const texMadera = lienzo(1024, 512, (x, w, h) => {
  x.fillStyle = '#7a4a2a'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { x.strokeStyle = `rgba(${40 + (i * 37) % 50},${20 + (i * 13) % 25},10,${0.12 + (i % 5) * 0.04})`; x.lineWidth = 1 + (i % 4); x.beginPath(); const y = (i * 53) % h; x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + 8, w * 0.6, y - 8, w, y + 3); x.stroke(); }
});
const matMadera = new THREE.MeshStandardMaterial({ map: texMadera.tex, roughness: 0.55, metalness: 0.05 });

function mesaGrande() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 3), matMadera); top.position.y = -0.05; top.receiveShadow = true; g.add(top);
  return g;
}
function mesaRedonda(num) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 48), matMadera); top.position.y = -0.03; top.receiveShadow = true; top.castShadow = true; g.add(top);
  const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 12), new THREE.MeshStandardMaterial({ color: '#222', metalness: 0.7, roughness: 0.3 })); pata.position.y = -0.4; g.add(pata);
  const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.03, 32), pata.material); pie.position.y = -0.76; g.add(pie);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.66, 0.74, 64), new THREE.MeshBasicMaterial({ color: VX.cian, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.005; g.add(halo); g.userData.halo = halo; g.userData.num = num;
  return g;
}

// ---------- tarjeta NFC VISAX ----------
const TIPOS = {
  carta: { titulo: 'La carta', sub: 'Toca con tu móvil', dibujo: (x, w) => iconoNFC(x, w / 2 + 30, 470, 210, '#fff') },
  resenas: { titulo: '¿Qué tal todo?', sub: 'Toca y déjanos tu reseña', dibujo: (x, w) => estrellas(x, w / 2, 470, 92, 5, 5) },
  redes: { titulo: 'Síguenos', sub: 'Instagram · TikTok · Facebook', dibujo: (x, w) => { for (let i = 0; i < 3; i++) { rr(x, w / 2 - 190 + i * 135, 400, 110, 110, 30); x.lineWidth = 9; x.strokeStyle = '#fff'; x.stroke(); x.beginPath(); x.arc(w / 2 - 135 + i * 135, 455, 26, 0, 7); x.stroke(); } } },
  camarero: { titulo: 'Llamar al camarero', sub: 'Pedir · La cuenta', dibujo: (x, w) => { x.fillStyle = '#fff'; x.beginPath(); x.arc(w / 2, 500, 120, Math.PI, 0); x.lineTo(w / 2 + 140, 520); x.lineTo(w / 2 - 140, 520); x.fill(); x.fillRect(w / 2 - 18, 345, 36, 40); x.beginPath(); x.arc(w / 2, 540, 22, 0, 7); x.fill(); } },
};
function tarjeta(tipo = 'carta', mesa = 4) {
  const g = new THREE.Group();
  const cara = lienzo(620, 920, (x, w, h) => {
    x.fillStyle = grad(x, 0, 0, w, h, ['#0d1430', '#1a1f4a', '#2a1a5e']); rr(x, 0, 0, w, h, 40); x.fill();
    x.strokeStyle = grad(x, 0, 0, w, h, DEGRADADO); x.lineWidth = 14; rr(x, 7, 7, w - 14, h - 14, 34); x.stroke();
    logoVisax(x, w / 2 - 55, 60, 110);
    const T = TIPOS[tipo]; texto(x, T.titulo, w / 2, 250, T.titulo.length > 14 ? 50 : 64, '#fff', 900);
    T.dibujo(x, w);
    texto(x, T.sub, w / 2, 690, 36, 'rgba(255,255,255,0.85)', 600);
    if (mesa) { x.fillStyle = grad(x, 150, 0, 470, 0, [VX.cian, VX.violeta]); rr(x, 160, 760, 300, 96, 48); x.fill(); texto(x, `MESA ${mesa}`, w / 2, 810, 50, '#fff', 900); }
  });
  const lado = new THREE.MeshStandardMaterial({ color: '#dfe3f2', roughness: 0.3, transparent: true });
  const frente = new THREE.MeshStandardMaterial({ map: cara.tex, roughness: 0.35, transparent: true });
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.92, 0.02), [lado, lado, lado, lado, frente, lado]);
  card.castShadow = true; card.position.y = 0.53; card.rotation.x = -0.1; g.add(card);
  const peana = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.07, 0.26), new THREE.MeshStandardMaterial({ color: '#cfe8ff', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.55 }));
  peana.position.y = 0.035; peana.castShadow = true; g.add(peana);

  // interior: antena en espiral + chip (se ve en rayos X)
  const pts = []; let w2 = 0.25, h2 = 0.38; const vueltas = 6;
  for (let v = 0; v < vueltas; v++) { const d = v * 0.028; pts.push(new THREE.Vector3(-w2 + d, h2 - d, 0), new THREE.Vector3(w2 - d, h2 - d, 0), new THREE.Vector3(w2 - d, -h2 + d, 0), new THREE.Vector3(-w2 + d + 0.028, -h2 + d, 0)); }
  const curva = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.02);
  const geoAnt = new THREE.TubeGeometry(curva, 900, 0.0045, 6, false);
  const matAnt = new THREE.MeshStandardMaterial({ color: '#d98a3a', emissive: '#ff9a3c', emissiveIntensity: 0, metalness: 0.9, roughness: 0.25, transparent: true, opacity: 0 });
  const antena = new THREE.Mesh(geoAnt, matAnt); antena.position.set(0, 0, 0.004); card.add(antena);
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.012), new THREE.MeshStandardMaterial({ color: '#111', emissive: VX.cian, emissiveIntensity: 0, metalness: 0.5, roughness: 0.3, transparent: true, opacity: 0 }));
  chip.position.set(0, -0.12, 0.006); card.add(chip);
  const brillo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBokeh.tex, color: VX.cian, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  brillo.scale.set(0.45, 0.45, 1); chip.add(brillo);
  const nIdx = geoAnt.index.count;
  g.userData = {
    card, chip, antena,
    rayosX(k, dibujo = 1, glowChip = 0) {
      lado.opacity = 1 - 0.85 * k; frente.opacity = 1 - 0.82 * k; lado.depthWrite = frente.depthWrite = k < 0.5;
      matAnt.opacity = k; matAnt.emissiveIntensity = 0.4 + 2.2 * glowChip; geoAnt.setDrawRange(0, Math.floor(nIdx * dibujo / 6) * 6);
      chip.material.opacity = k; chip.material.emissiveIntensity = 3 * glowChip; brillo.material.opacity = 0.9 * glowChip * k;
    },
    centro() { return card.localToWorld(new THREE.Vector3(0, 0, 0.02)); },
    chipMundo() { return chip.getWorldPosition(new THREE.Vector3()); },
  };
  g.userData.rayosX(0);
  return g;
}

// ---------- móvil con pantallas ----------
const PANT = {
  negro: (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); },
  bloqueo: (x, w, h, s) => {
    x.fillStyle = grad(x, 0, 0, w, h, ['#1b2a6b', '#4a2a8a', '#12122e']); x.fillRect(0, 0, w, h);
    texto(x, s.dia || 'sábado, 14 de noviembre', w / 2, 190, 26, 'rgba(255,255,255,0.85)', 600);
    texto(x, s.hora || '21:30', w / 2, 290, 140, '#fff', 300);
  },
  carta: (x, w, h, s) => {
    x.fillStyle = '#f6f4ef'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1a1f4a'; x.fillRect(0, 0, w, 210); texto(x, 'Bar La Esquina', 40, 105, 40, '#fff', 900, 'left');
    x.fillStyle = VX.naranja; rr(x, w - 190, 70, 160, 70, 35); x.fill(); texto(x, `Mesa ${s.mesa || 4}`, w - 110, 106, 32, '#fff', 900);
    const platos = [['Patatas bravas', '6,50 €', '#e0a24a'], ['Croquetas caseras', '8,00 €', '#c9864a'], ['Calamares', '9,50 €', '#e8c27a'], ['Caña', '2,50 €', '#f2c94c'], ['Tarta de queso', '5,50 €', '#f3e2b8']];
    platos.forEach(([n, p, c], i) => {
      const y = 250 + i * 150; x.fillStyle = '#fff'; rr(x, 24, y, w - 48, 130, 22); x.fill();
      x.fillStyle = c; rr(x, 40, y + 15, 100, 100, 18); x.fill();
      texto(x, n, 160, y + 48, 30, '#1a1a1a', 800, 'left'); texto(x, p, 160, y + 92, 26, '#777', 600, 'left');
      const sel = (s.sel || 0) > i && i < 2; x.fillStyle = sel ? VX.azul : '#e8e8ee'; x.beginPath(); x.arc(w - 80, y + 65, 32, 0, 7); x.fill(); texto(x, sel ? '✓' : '+', w - 80, y + 66, 38, sel ? '#fff' : '#333', 900);
    });
    if (s.sel) { x.fillStyle = VX.azul; rr(x, 30, h - 140, w - 60, 100, 50); x.fill(); texto(x, `Pedir (${Math.min(2, s.sel)})`, w / 2, h - 90, 38, '#fff', 900); }
  },
  pedido: (x, w, h) => {
    x.fillStyle = '#f6f4ef'; x.fillRect(0, 0, w, h); x.fillStyle = '#22c55e'; x.beginPath(); x.arc(w / 2, 430, 120, 0, 7); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 22; x.lineCap = 'round'; x.beginPath(); x.moveTo(w / 2 - 55, 430); x.lineTo(w / 2 - 10, 475); x.lineTo(w / 2 + 60, 385); x.stroke();
    texto(x, '¡Pedido enviado!', w / 2, 640, 46, '#1a1a1a', 900); texto(x, 'Mesa 4 · ya está en cocina', w / 2, 710, 30, '#555', 600);
  },
  cuenta: (x, w, h) => {
    x.fillStyle = '#f6f4ef'; x.fillRect(0, 0, w, h); texto(x, 'Mesa 4', w / 2, 260, 44, '#1a1a1a', 900);
    x.fillStyle = '#fff'; rr(x, 40, 340, w - 80, 380, 26); x.fill();
    [['2× Patatas bravas', '13,00 €'], ['1× Croquetas', '8,00 €'], ['3× Caña', '7,50 €']].forEach(([a, b], i) => { texto(x, a, 70, 400 + i * 80, 30, '#333', 600, 'left'); texto(x, b, w - 70, 400 + i * 80, 30, '#333', 700, 'right'); });
    texto(x, 'Total', 70, 660, 36, '#111', 900, 'left'); texto(x, '28,50 €', w - 70, 660, 36, '#111', 900, 'right');
    x.fillStyle = VX.azul; rr(x, 30, h - 160, w - 60, 100, 50); x.fill(); texto(x, 'Cuenta pedida ✓', w / 2, h - 110, 36, '#fff', 900);
  },
  resena: (x, w, h, s) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); texto(x, 'Bar La Esquina', w / 2, 220, 42, '#111', 900); texto(x, 'Valora tu visita', w / 2, 290, 30, '#666', 600);
    estrellas(x, w / 2, 420, 78, 5, s.llenas ?? 5);
    x.strokeStyle = '#ccc'; x.lineWidth = 3; rr(x, 40, 540, w - 80, 260, 20); x.stroke(); texto(x, 'Escribe tu reseña…', 70, 590, 28, '#999', 500, 'left');
    x.fillStyle = '#1a73e8'; rr(x, w - 250, 850, 210, 80, 40); x.fill(); texto(x, 'Publicar', w - 145, 890, 30, '#fff', 800);
  },
  instagram: (x, w, h, s) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); texto(x, 'barlaesquina', 40, 110, 36, '#111', 900, 'left');
    x.fillStyle = grad(x, 40, 160, 190, 310, ['#feda75', '#d62976', '#4f5bd5']); x.beginPath(); x.arc(115, 235, 78, 0, 7); x.fill();
    x.fillStyle = '#7a4a2a'; x.beginPath(); x.arc(115, 235, 66, 0, 7); x.fill(); texto(x, 'LE', 115, 237, 44, '#fff', 900);
    [['312', 'posts'], [s.siguiendo ? '2.481' : '2.480', 'seguidores'], ['180', 'seguidos']].forEach(([a, b], i) => { texto(x, a, 270 + i * 110, 215, 32, '#111', 900); texto(x, b, 270 + i * 110, 255, 20, '#555', 500); });
    x.fillStyle = s.siguiendo ? '#efefef' : '#0095f6'; rr(x, 40, 350, w - 80, 76, 16); x.fill(); texto(x, s.siguiendo ? 'Siguiendo ✓' : 'Seguir', w / 2, 389, 32, s.siguiendo ? '#111' : '#fff', 800);
    if (s.onda) { x.fillStyle = `rgba(255,255,255,${0.5 * (1 - s.onda)})`; x.beginPath(); x.arc(w / 2, 389, 40 + s.onda * 240, 0, 7); x.fill(); }
    const cols = ['#e0a24a', '#8d5a3b', '#f2c94c', '#c0392b', '#e8c27a', '#6b8e23', '#d35400', '#f3e2b8', '#a0522d'];
    cols.forEach((c, i) => { x.fillStyle = c; x.fillRect(4 + (i % 3) * 178, 470 + Math.floor(i / 3) * 178, 174, 174); });
  },
  panel: (x, w, h, s) => {
    x.fillStyle = '#10131c'; x.fillRect(0, 0, w, h); texto(x, '21:30', 40, 90, 44, '#fff', 300, 'left');
    const tiles = ['Wi-Fi', 'Bluetooth', 'Linterna', 'Avión', 'Datos', 'NFC', 'Ubicación', 'Rotación', 'Ahorro', 'No molestar', 'Modo oscuro', 'Hotspot'];
    tiles.forEach((n, i) => {
      const X = 30 + (i % 3) * 165, Y = 180 + Math.floor(i / 3) * 200, on = n === 'NFC' ? s.nfc !== false : i % 4 === 0;
      x.fillStyle = on ? VX.azul : '#2a2f3c'; rr(x, X, Y, 150, 150, 40); x.fill();
      if (n === 'NFC') { texto(x, 'N', X + 75, Y + 66, 70, '#fff', 900); } else { x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.arc(X + 75, Y + 66, 26, 0, 7); x.fill(); }
      texto(x, n, X + 75, Y + 128, 22, '#fff', 600);
      if (n === 'NFC' && s.marca) { x.strokeStyle = '#ff2b2b'; x.lineWidth = 12; x.beginPath(); x.ellipse(X + 75, Y + 75, 110 * s.marca, 105 * s.marca, -0.1, 0, Math.PI * 2 * s.marca); x.stroke(); }
    });
  },
  pago: (x, w, h) => {
    x.fillStyle = '#0f172a'; x.fillRect(0, 0, w, h); x.fillStyle = grad(x, 60, 200, w - 60, 520, ['#1f2a44', '#3b4a7a']); rr(x, 60, 200, w - 120, 300, 30); x.fill();
    texto(x, '•••• 4821', 100, 450, 34, '#fff', 700, 'left'); x.fillStyle = '#22c55e'; x.beginPath(); x.arc(w / 2, 700, 90, 0, 7); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 18; x.lineCap = 'round'; x.beginPath(); x.moveTo(w / 2 - 40, 700); x.lineTo(w / 2 - 8, 734); x.lineTo(w / 2 + 45, 668); x.stroke(); texto(x, 'Pago completado', w / 2, 860, 40, '#fff', 800);
  },
  aviso: (x, w, h, s) => {
    PANT.bloqueo(x, w, h, { hora: '21:47' });
    if (s.k) { const y = 430 - 40 * (1 - s.k); x.globalAlpha = s.k; x.fillStyle = 'rgba(255,255,255,0.95)'; rr(x, 24, y, w - 48, 200, 34); x.fill();
      x.fillStyle = grad(x, 50, y + 40, 150, y + 140, [VX.cian, VX.violeta]); rr(x, 50, y + 40, 100, 100, 24); x.fill(); texto(x, '🔔', 100, y + 92, 50, '#fff', 400);
      texto(x, 'VISAX · ahora', 175, y + 62, 24, '#666', 600, 'left'); texto(x, 'Mesa 7 te llama', 175, y + 112, 40, '#111', 900, 'left'); texto(x, 'Quieren pedir', 175, y + 158, 26, '#444', 500, 'left'); x.globalAlpha = 1; }
  },
};
function movil(color = '#16181f') {
  const g = new THREE.Group();
  const matCuerpo = new THREE.MeshStandardMaterial({ color, metalness: 0.65, roughness: 0.3, transparent: true });
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.94, 0.05), matCuerpo); cuerpo.castShadow = true; g.add(cuerpo);
  const ui = lienzo(540, 1144);
  const matPant = new THREE.MeshBasicMaterial({ map: ui.tex, transparent: true, toneMapped: false });
  const pant = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.89), matPant); pant.position.z = 0.0255; g.add(pant);
  const camara = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.012), new THREE.MeshStandardMaterial({ color: '#0b0c10', metalness: 0.8, roughness: 0.2, transparent: true }));
  camara.position.set(-0.13, 0.35, -0.03); g.add(camara);
  g.userData = {
    pantalla(nombre, est = {}) { ui.pintar(nombre + JSON.stringify(est), (x, w, h) => { PANT[nombre](x, w, h, est); }); },
    opacidad(k) { matCuerpo.opacity = k; matPant.opacity = k; camara.material.opacity = k; matCuerpo.depthWrite = k > 0.5; },
    detras() { return g.localToWorld(new THREE.Vector3(0, 0.1, -0.03)); },
  };
  g.userData.pantalla('bloqueo'); return g;
}

// ---------- ondas NFC y paquete de datos ----------
function ondas() {
  const g = new THREE.Group(); const aros = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.006, 8, 64), new THREE.MeshBasicMaterial({ color: VX.cian, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    g.add(m); aros.push(m);
  }
  g.userData.actualizar = (t, activo, desde, hasta) => {
    aros.forEach((a, i) => {
      const f = (t * 1.3 + i / 4) % 1; a.position.lerpVectors(desde, hasta, f); a.lookAt(hasta.clone().add(hasta.clone().sub(desde)));
      const k = 0.6 + f * 1.4; a.scale.set(k, k, k); a.material.opacity = Math.sin(Math.PI * f) * 0.9 * activo;
    });
  };
  scene.add(g); return g;
}
function etiqueta3D(txt, color = VX.cian) {
  const l = lienzo(512, 128, (x, w, h) => { x.fillStyle = 'rgba(10,15,31,0.85)'; rr(x, 4, 4, w - 8, h - 8, 60); x.fill(); x.strokeStyle = color; x.lineWidth = 6; rr(x, 4, 4, w - 8, h - 8, 60); x.stroke(); texto(x, txt, w / 2, h / 2 + 2, 46, '#fff', 800); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: l.tex, transparent: true, depthTest: false, toneMapped: false })); s.scale.set(0.34, 0.085, 1); s.renderOrder = 10; return s;
}
function paquete(txt) {
  const g = new THREE.Group();
  const bola = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 24), new THREE.MeshBasicMaterial({ color: '#fff', toneMapped: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBokeh.tex, color: VX.cian, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(0.35, 0.35, 1);
  const et = etiqueta3D(txt); et.position.y = 0.14; g.add(bola, halo, et); g.visible = false; scene.add(g);
  g.userData.mover = (k, desde, hasta, alto = 0.25) => { g.visible = k > 0 && k < 1; const p = new THREE.Vector3().lerpVectors(desde, hasta, k); p.y += Math.sin(Math.PI * k) * alto; g.position.copy(p); };
  return g;
}

// ---------- cocina ----------
function cocina() {
  const g = new THREE.Group();
  const muro = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 0.2), new THREE.MeshStandardMaterial({ color: '#1c2238', roughness: 0.9 })); muro.position.set(0, 0.4, 0); g.add(muro);
  const ui = lienzo(800, 500);
  const pant = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.8), new THREE.MeshBasicMaterial({ map: ui.tex, toneMapped: false })); pant.position.set(0, 0.75, 0.11); g.add(pant);
  const marco = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.88, 0.04), new THREE.MeshStandardMaterial({ color: '#0b0c10', metalness: 0.6 })); marco.position.set(0, 0.75, 0.09); g.add(marco);
  texto; // (nada)
  const cartel = lienzo(600, 140, (x, w, h) => { texto(x, 'COCINA', w / 2, h / 2, 80, '#ffb35c', 900); });
  const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.21), new THREE.MeshBasicMaterial({ map: cartel.tex, transparent: true, toneMapped: false })); c2.position.set(0, 1.4, 0.11); g.add(c2);
  g.userData.pantalla = (nueva, pulso, mesa = 'MESA 4', det = '2× Bravas · 1× Croquetas') => ui.pintar(`${nueva}|${Math.round(pulso * 10)}|${mesa}`, (x, w, h) => {
    x.fillStyle = '#0f1424'; x.fillRect(0, 0, w, h); texto(x, 'PEDIDOS', 30, 40, 32, '#9aa4c7', 800, 'left');
    const tickets = [['Mesa 2', '1× Calamares'], ['Mesa 9', '2× Caña']]; if (nueva) tickets.unshift([mesa, det]);
    tickets.forEach(([m, d], i) => { const y = 80 + i * 135; const nv = nueva && i === 0;
      x.fillStyle = nv ? `rgba(63,125,251,${0.75 + 0.25 * pulso})` : '#1d2440'; rr(x, 24, y, w - 48, 115, 18); x.fill();
      texto(x, m, 50, y + 40, nv ? 46 : 38, '#fff', 900, 'left'); texto(x, d, 50, y + 86, 28, nv ? '#fff' : '#9aa4c7', 600, 'left');
      if (nv) texto(x, 'NUEVO', w - 60, y + 40, 28, VX.amarillo, 900, 'right'); });
  });
  g.userData.pantalla(false, 0); return g;
}

// ---------- personaje low-poly ----------
function persona(camiseta = '#3F7DFB', piel = '#e0ac69', delantal = false) {
  const g = new THREE.Group(); const m = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 6, 16), m(camiseta)); torso.position.y = 1.05; torso.castShadow = true; g.add(torso);
  if (delantal) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.02), m('#111')); d.position.set(0, 0.92, 0.17); g.add(d); }
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 24), m(piel)); cabeza.position.y = 1.52; cabeza.castShadow = true; g.add(cabeza);
  const pelo = new THREE.Mesh(new THREE.SphereGeometry(0.155, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.1), m('#2b1d14')); pelo.position.y = 1.54; g.add(pelo);
  const ojoM = new THREE.MeshBasicMaterial({ color: '#111' }); for (const lx of [-0.05, 0.05]) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), ojoM); o.position.set(lx, 1.54, 0.138); g.add(o); }
  const brazo = (lado) => { const piv = new THREE.Group(); piv.position.set(0.22 * lado, 1.3, 0); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.38, 4, 10), m(camiseta)); b.position.y = -0.22; b.castShadow = true; piv.add(b); const mano = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), m(piel)); mano.position.y = -0.46; piv.add(mano); g.add(piv); return piv; };
  const pierna = (lado) => { const piv = new THREE.Group(); piv.position.set(0.09 * lado, 0.72, 0); const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.5, 4, 10), m('#1d2333')); p.position.y = -0.33; p.castShadow = true; piv.add(p); g.add(piv); return piv; };
  const bI = brazo(-1), bD = brazo(1), pI = pierna(-1), pD = pierna(1);
  g.userData.pose = ({ brazoD = 0, brazoI = 0, paso = null, sentado = false } = {}) => {
    bD.rotation.z = brazoD; bI.rotation.z = -brazoI;
    if (paso !== null) { const a = Math.sin(paso) * 0.5; pI.rotation.x = a; pD.rotation.x = -a; bI.rotation.x = -a * 0.6; bD.rotation.x = a * 0.6; }
    if (sentado) { pI.rotation.x = pD.rotation.x = -Math.PI / 2; }
  };
  return g;
}

// ---------- capa 2D: títulos, subtítulos, etiquetas ----------
function contorno(t, X, Y, tam, relleno, peso = 900, borde = 12) {
  C.font = `${peso} ${tam}px ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle';
  C.lineJoin = 'round'; C.lineWidth = borde; C.strokeStyle = 'rgba(0,0,0,0.85)'; C.strokeText(t, X, Y); C.fillStyle = relleno; C.fillText(t, X, Y);
}
function partir(t, max, tam, peso = 900) {
  C.font = `${peso} ${tam}px ${FUENTE}`; const pal = t.split(' '); const l = []; let a = '';
  for (const p of pal) { const prueba = a ? a + ' ' + p : p; if (C.measureText(prueba).width > max && a) { l.push(a); a = p; } else a = prueba; }
  if (a) l.push(a); return l;
}
function titulo(t, k = 1, estilo = 'normal') {
  if (k <= 0) return; C.save(); C.globalAlpha = k; const tam = 78;
  const lineas = partir(t, 940, tam);
  lineas.forEach((l, i) => {
    const Y = 250 + i * (tam * 1.18) - (1 - k) * 30;
    if (estilo === 'pegatina') {
      C.font = `900 ${tam}px ${FUENTE}`; const w = C.measureText(l).width + 50; const cols = ['#ff3b5c', VX.azul, '#22c55e'];
      C.save(); C.translate(W / 2, Y); C.rotate((i % 2 ? 1 : -1) * 0.025); C.fillStyle = cols[i % 3]; rr(C, -w / 2, -tam * 0.62, w, tam * 1.2, 18); C.fill();
      C.fillStyle = '#fff'; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(l, 0, 4); C.restore();
    } else contorno(l, W / 2, Y, tam, '#fff', 900, 14);
  });
  C.restore();
}
function etiqueta(t, k, color = VX.azul, Y = 560) {
  if (k <= 0) return; C.save(); C.globalAlpha = clamp(k * 1.5);
  const tam = 54; C.font = `900 ${tam}px ${FUENTE}`; const w = Math.min(1000, C.measureText(t).width + 80);
  const s = 0.85 + 0.15 * ease(clamp(k)); C.translate(W / 2, Y); C.scale(s, s);
  C.fillStyle = color === 'degradado' ? grad(C, -w / 2, 0, w / 2, 0, [VX.cian, VX.azul, VX.violeta]) : color;
  C.shadowColor = 'rgba(0,0,0,0.5)'; C.shadowBlur = 30; rr(C, -w / 2, -48, w, 96, 48); C.fill(); C.shadowBlur = 0;
  C.fillStyle = '#fff'; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(t, 0, 3); C.restore();
}
function reloj(txt) {
  C.save(); C.font = `800 44px ${FUENTE}`; const w = C.measureText(txt).width + 60; C.fillStyle = 'rgba(10,15,31,0.8)'; rr(C, W - w - 50, 110, w, 76, 38); C.fill();
  C.strokeStyle = VX.naranja; C.lineWidth = 4; rr(C, W - w - 50, 110, w, 76, 38); C.stroke(); C.fillStyle = '#fff'; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(txt, W - w / 2 - 50, 150); C.restore();
}
function burbuja(usuario, t, k) {
  if (k <= 0) return; C.save(); C.globalAlpha = k; const Y = 300 - (1 - k) * 40; C.fillStyle = '#fff'; C.shadowColor = 'rgba(0,0,0,0.4)'; C.shadowBlur = 30;
  rr(C, 90, Y, W - 180, 230, 40); C.fill(); C.shadowBlur = 0;
  C.fillStyle = grad(C, 120, Y + 30, 220, Y + 130, [VX.naranja, '#ff3b5c']); C.beginPath(); C.arc(170, Y + 85, 50, 0, 7); C.fill();
  C.font = `600 32px ${FUENTE}`; C.fillStyle = '#666'; C.textAlign = 'left'; C.textBaseline = 'middle'; C.fillText(`Responder a ${usuario}`, 245, Y + 62);
  C.font = `900 54px ${FUENTE}`; C.fillStyle = '#111'; C.fillText(t, 245, Y + 130); C.restore();
}
function marcaAgua() { C.save(); C.globalAlpha = 0.7; logoVisax(C, W / 2 - 150, 1792, 52); C.font = `800 34px ${FUENTE}`; C.fillStyle = '#fff'; C.textAlign = 'left'; C.textBaseline = 'middle'; C.fillText('visaxnfc.es', W / 2 - 80, 1812); C.restore(); }
function vineta() { const g = C.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); C.fillStyle = g; C.fillRect(0, 0, W, H); }

let trozos = [];
function prepararSubtitulos(palabras) {
  trozos = []; let a = [];
  palabras.forEach((p, i) => {
    a.push(p); const sig = palabras[i + 1];
    if (/[.,?!…:]$/.test(p.p) || a.length >= 3 || !sig || sig.t - p.fin > 0.35 || sig.q !== p.q) { trozos.push(a); a = []; }
  });
}
function subtitulos(t) {
  const i = trozos.findIndex((tr, k) => t >= tr[0].t - 0.05 && t < (trozos[k + 1] ? trozos[k + 1][0].t - 0.05 : tr[tr.length - 1].fin + 0.6));
  if (i < 0) return; const tr = trozos[i]; const tam = 92; C.font = `900 ${tam}px ${FUENTE}`;
  const limpias = tr.map(p => p.p.replace(/[,.…:]$/, '').toUpperCase());
  const anchos = limpias.map(s => C.measureText(s + ' ').width); const total = anchos.reduce((a, b) => a + b, 0);
  let X = W / 2 - total / 2; const Y = 1430; const pop = prog(t, tr[0].t - 0.05, tr[0].t + 0.1);
  C.save(); C.translate(W / 2, Y); C.scale(0.9 + 0.1 * pop, 0.9 + 0.1 * pop); C.translate(-W / 2, -Y);
  limpias.forEach((s, k) => {
    const activa = t >= tr[k].t - 0.03; const color = activa && (k === limpias.length - 1 || t < tr[k + 1].t) ? VX.amarillo : '#fff';
    C.textAlign = 'left'; C.textBaseline = 'middle'; C.lineJoin = 'round'; C.lineWidth = 16; C.strokeStyle = 'rgba(0,0,0,0.9)'; C.strokeText(s, X, Y); C.fillStyle = activa ? color : 'rgba(255,255,255,0.55)'; C.fillText(s, X, Y); X += anchos[k];
  });
  C.restore();
}

// ---------- cámara ----------
function camara(t, tomas) {
  let T = tomas[0]; for (const x of tomas) if (t >= x.a) T = x;
  const k = T.b ? prog(t, T.a, T.b) : 0; const de = T.de, a = T.a2 || T.de;
  const p = new THREE.Vector3(lerp(de[0], a[0], k), lerp(de[1], a[1], k), lerp(de[2], a[2], k));
  const l = new THREE.Vector3(lerp(de[3], a[3], k), lerp(de[4], a[4], k), lerp(de[5], a[5], k));
  // los planos cercanos se alejan para que quepan móvil y tarjeta en el vertical
  const d = p.distanceTo(l); const nd = d < 3 ? d * 1.8 : d + 2.4;
  p.sub(l).setLength(nd).add(l);
  cam.position.copy(p); cam.lookAt(l);
  if (T.fov) { cam.fov = T.fov; cam.updateProjectionMatrix(); } else if (cam.fov !== 32) { cam.fov = 32; cam.updateProjectionMatrix(); }
}

// ---------- vídeos ----------
const V = {};
let palabras = [], cue = () => 0, duracion = 0, efectos = [];
const mundo = new THREE.Group(); scene.add(mundo);

V['que-pasa'] = {
  montar() {
    mundo.add(mesaGrande()); this.tj = tarjeta('carta', 4); mundo.add(this.tj); this.mv = movil(); mundo.add(this.mv);
    this.on = ondas(); this.pk = paquete('carta · mesa 4');
    const c = this.c = { tu: cue('tu'), esp: cue('espiral'), chip: cue('chip'), pilas: cue('pilas'), dir: cue('direccion'), carta: cue('carta'), todo: cue('todo'), alejas: cue('alejas'), com: cue('comenta') };
    efectos = [['tap', c.tu + 0.35], ['whoosh', c.esp - 0.2], ['ding', c.chip], ['whoosh', c.dir], ['pop', c.carta], ['whoosh', c.alejas]];
    this.tomas = [
      { a: 0, b: c.tu, de: [1.05, 0.85, 1.75, 0.02, 0.52, 0.05], a2: [0.9, 0.78, 1.45, 0.02, 0.52, 0.05] },
      { a: c.tu, b: c.esp, de: [0.9, 0.78, 1.45, 0.02, 0.52, 0.05], a2: [0.75, 0.7, 1.15, 0, 0.5, 0.05] },
      { a: c.esp - 0.2, b: c.esp + 0.8, de: [0.75, 0.7, 1.15, 0, 0.5, 0.05], a2: [0.22, 0.48, 0.78, 0, 0.42, 0] },
      { a: c.pilas, b: c.dir, de: [0.22, 0.48, 0.78, 0, 0.42, 0], a2: [0.3, 0.52, 0.86, 0, 0.45, 0] },
      { a: c.dir, b: c.carta, de: [0.55, 0.62, 0.95, 0, 0.5, 0.05], a2: [0.45, 0.7, 1.05, 0, 0.6, 0.06] },
      { a: c.carta - 0.15, b: c.alejas, de: [0.12, 0.62, 1.25, 0, 0.56, 0.06], a2: [0.08, 0.6, 1.05, 0, 0.56, 0.06] },
      { a: c.alejas, b: c.alejas + 0.8, de: [0.08, 0.6, 1.05, 0, 0.56, 0.06], a2: [0.9, 0.95, 2.1, 0, 0.6, 0.1] },
    ];
  },
  actualizar(t) {
    const c = this.c, mv = this.mv, tj = this.tj;
    const z = t < c.tu ? 0.13 : t < c.alejas ? lerp(0.13, 0.065, prog(t, c.tu, c.tu + 0.35)) : lerp(0.065, 0.75, prog(t, c.alejas, c.alejas + 0.7));
    const al = t >= c.alejas ? prog(t, c.alejas, c.alejas + 0.7) : 0;
    mv.position.set(0.2 + 0.25 * al, 0.66 + 0.45 * al, t >= c.alejas ? 0.065 + 0.25 * al : z); mv.rotation.set(-0.1, -0.15, -0.08);
    const xr = prog(t, c.esp - 0.2, c.esp + 0.5) * (1 - prog(t, c.carta - 0.4, c.carta));
    tj.userData.rayosX(xr, prog(t, c.esp, c.chip + 0.2), t > c.chip ? 0.6 + 0.4 * Math.sin((t - c.chip) * 9) : 0);
    mv.userData.opacidad(1 - 0.8 * xr);
    mv.userData.pantalla(t >= c.carta && t < c.alejas ? 'carta' : 'bloqueo');
    const activo = t > c.tu + 0.2 && t < c.alejas ? 1 : 0;
    this.on.userData.actualizar(t, activo * (1 - 0.5 * xr), mv.userData.detras(), tj.userData.centro());
    this.pk.userData.mover(clamp((t - c.dir) / 1.1), tj.userData.chipMundo(), mv.localToWorld(new THREE.Vector3(0, 0, 0.03)), 0.12);
    camara(t, this.tomas);
  },
  capa(t) {
    const c = this.c;
    titulo('¿Qué pasa en este segundo?', 1 - prog(t, c.tu - 0.2, c.tu + 0.1));
    if (entre(t, c.tu, c.esp)) etiqueta('① tu móvil crea un campo', prog(t, c.tu, c.tu + 0.3));
    if (entre(t, c.esp, c.pilas)) etiqueta('② la espiral lo recoge', prog(t, c.esp, c.esp + 0.3));
    if (entre(t, c.pilas, c.dir)) etiqueta('SIN PILAS 🔋✕', prog(t, c.pilas, c.pilas + 0.25), '#ff3b5c');
    if (entre(t, c.dir, c.carta)) etiqueta('③ le dice: carta + MESA 4', prog(t, c.dir, c.dir + 0.3));
    if (entre(t, c.carta, c.todo)) etiqueta('y se abre la carta', prog(t, c.carta, c.carta + 0.3), 'degradado');
    if (entre(t, c.todo, c.alejas)) etiqueta('menos de 1 segundo ⚡', prog(t, c.todo, c.todo + 0.3), 'degradado');
    if (entre(t, c.alejas, c.com)) etiqueta('a 10 cm… nada', prog(t, c.alejas, c.alejas + 0.3), '#444b66');
    if (t >= c.com) etiqueta('Comenta MESA 👇', prog(t, c.com, c.com + 0.3), 'degradado', 360);
  },
};

V['mesa4'] = {
  montar() {
    this.mesas = {}; const pos = { 1: [-1.6, -1.4], 2: [1.6, -1.4], 3: [-1.6, 1.3], 4: [1.6, 1.3] };
    for (const n of [1, 2, 3, 4]) { const m = mesaRedonda(n); m.position.set(pos[n][0], 0, pos[n][1]); const tj = tarjeta('carta', n); tj.scale.setScalar(0.42); m.add(tj); m.userData.tj = tj; mundo.add(m); this.mesas[n] = m; }
    this.coc = cocina(); this.coc.position.set(0, 0, -3.6); mundo.add(this.coc);
    this.mv = movil(); mundo.add(this.mv); this.on = ondas(); this.pk = paquete('MESA 4 · pedido');
    const c = this.c = { toca: cue('toca'), carta: cue('carta'), sabe: cue('sabe'), piden: cue('piden'), cocina: cue('cocina'), nadie: cue('nadie'), cuando: cue('cuando'), cuenta: cue('cuenta'), todo: cue('todo'), cuantas: cue('cuantas') };
    efectos = [['tap', c.toca + 0.3], ['pop', c.carta], ['tap', c.piden + 0.3], ['whoosh', c.piden + 0.7], ['ding', c.cocina + 0.6], ['tap', c.cuenta], ['ding', c.todo + 0.3]];
    const m4 = [1.6, 0, 1.3];
    this.tomas = [
      { a: 0, b: c.toca, de: [0.2, 5.2, 6.4, 0.2, 0, -0.4], a2: [1.2, 2.2, 4.2, 1.5, 0.2, 1.2] },
      { a: c.toca - 0.2, b: c.carta, de: [1.2, 2.2, 4.2, 1.5, 0.2, 1.2], a2: [2.05, 0.62, 2.35, m4[0], 0.3, m4[2]] },
      { a: c.carta, b: c.piden, de: [1.85, 0.5, 2.05, 1.6, 0.36, 1.48], a2: [1.75, 0.45, 1.95, 1.6, 0.36, 1.48] },
      { a: c.piden + 0.6, b: c.cocina + 0.6, de: [2.4, 1.6, 3.4, 1.0, 0.6, -0.5], a2: [0.25, 1.05, -1.2, 0, 0.75, -3.5] },
      { a: c.cuando, b: c.cuenta + 0.3, de: [2.05, 0.62, 2.35, m4[0], 0.3, m4[2]], a2: [1.8, 0.48, 1.98, 1.6, 0.36, 1.48] },
      { a: c.todo - 0.3, b: c.todo + 1.6, de: [1.2, 2.2, 4.2, 1.0, 0.2, 0.5], a2: [0, 5.6, 6.6, 0, 0, -0.6] },
    ];
  },
  actualizar(t) {
    const c = this.c, mv = this.mv, m4 = this.mesas[4], tj = m4.userData.tj;
    const base = new THREE.Vector3(1.6, 0.37, 1.3 + 0.09);
    const toque = t < c.toca ? 0.4 : lerp(0.4, 0.035, prog(t, c.toca, c.toca + 0.35));
    const lejos = t > c.cocina ? prog(t, c.cocina, c.cocina + 0.3) * (1 - prog(t, c.cuando, c.cuando + 0.3)) : 0;
    mv.position.set(base.x, base.y + 0.05 + lejos * 0.1, base.z + toque + lejos * 0.12); mv.rotation.set(-0.15, 0, 0); mv.scale.setScalar(0.62);
    mv.visible = t > c.toca - 1.2;
    const sel = t > c.piden ? Math.min(3, 1 + Math.floor((t - c.piden) / 0.35)) : 0;
    mv.userData.pantalla(t < c.carta ? 'bloqueo' : t < c.cocina ? 'carta' : t < c.cuenta ? 'pedido' : 'cuenta', { sel, hora: '21:30' });
    this.on.userData.actualizar(t, t > c.toca + 0.2 && t < c.carta + 0.6 ? 1 : 0, mv.userData.detras(), tj.userData.centro());
    const pantCoc = this.coc.localToWorld(new THREE.Vector3(0, 0.75, 0.15));
    this.pk.userData.mover(clamp((t - c.piden - 0.6) / 1.4), mv.getWorldPosition(new THREE.Vector3()), pantCoc, 1.2);
    this.coc.userData.pantalla(t > c.piden + 2.0, t > c.piden + 2.0 ? 0.5 + 0.5 * Math.sin(t * 8) : 0);
    for (const n of [1, 2, 3, 4]) { const h = this.mesas[n].userData.halo; const k0 = c.todo + (n - 1) * 0.3; h.material.opacity = n === 4 && t < c.todo ? 0.9 * prog(t, 0.3, 1.0) : 0.9 * prog(t, k0, k0 + 0.3); }
    camara(t, this.tomas);
  },
  capa(t) {
    const c = this.c;
    reloj(t < c.piden ? 'SÁB 21:30' : t < c.cuando ? 'SÁB 21:32' : 'SÁB 22:38');
    titulo('Sábado 21:30. La mesa 4 toca la tarjeta.', 1 - prog(t, c.carta - 0.3, c.carta));
    if (entre(t, c.carta, c.piden)) etiqueta('① la carta ya sabe qué mesa es', prog(t, c.carta, c.carta + 0.3));
    if (entre(t, c.piden, c.nadie)) etiqueta('② llega a cocina: MESA 4', prog(t, c.piden, c.piden + 0.3));
    if (entre(t, c.nadie, c.cuando)) etiqueta('nadie lo apuntó ✍️✕', prog(t, c.nadie, c.nadie + 0.3), '#ff3b5c');
    if (entre(t, c.cuenta, c.todo)) etiqueta('③ la cuenta, igual', prog(t, c.cuenta, c.cuenta + 0.3));
    if (entre(t, c.todo, c.cuantas)) etiqueta('un toque en cada mesa', prog(t, c.todo, c.todo + 0.3), 'degradado');
    if (t >= c.cuantas) etiqueta('¿y en tu bar? 👇', prog(t, c.cuantas, c.cuantas + 0.3), 'degradado', 360);
  },
};

V['boton'] = {
  montar() {
    mundo.add(mesaGrande());
    this.tjs = { carta: tarjeta('carta', 4), resenas: tarjeta('resenas', 0), redes: tarjeta('redes', 0) };
    this.tjs.carta.position.x = -0.85; this.tjs.redes.position.x = 0.85; Object.values(this.tjs).forEach(x => mundo.add(x));
    this.datafono = new THREE.Group(); { const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.62), new THREE.MeshStandardMaterial({ color: '#e9ecf3', roughness: 0.4 })); b.position.y = 0.06; b.castShadow = true;
      const p = lienzo(256, 160, (x, w, h) => { x.fillStyle = '#0f172a'; x.fillRect(0, 0, w, h); texto(x, '12,40 €', w / 2, 60, 40, '#fff', 800); iconoNFC(x, w / 2 + 12, 120, 50, VX.cian); });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), new THREE.MeshBasicMaterial({ map: p.tex, toneMapped: false })); s.rotation.x = -Math.PI / 2 + 0.25; s.position.set(0, 0.125, -0.12); this.datafono.add(b, s); }
    this.datafono.position.set(1.75, 0, 0.7); mundo.add(this.datafono);
    this.mv = movil(); mundo.add(this.mv); this.ip = movil('#e8e6e1'); mundo.add(this.ip); this.on = ondas();
    const c = this.c = { lo: cue('lo'), pagas: cue('pagas'), si: cue('si'), iphone: cue('iphone'), sirve2: cue('sirve', 2), esto: cue('esto'), carta: cue('carta'), toque: cue('toque'), resenas: cue('resenas'), otro2: cue('otro', 2), insta: cue('instagram'), que: cue('que', 3) };
    efectos = [['pop', 0.3], ['tap', c.pagas + 0.2], ['ding', c.pagas + 0.5], ['whoosh', c.si], ['tap', c.esto + 0.3], ['tap', c.toque], ['tap', c.otro2], ['whoosh', c.que]];
    this.tomas = [
      { a: 0, b: c.lo, de: [0.25, 0.85, 1.55, 0, 0.7, 0.3], a2: [0.15, 0.8, 1.35, 0, 0.7, 0.3] },
      { a: c.lo, b: c.pagas + 0.3, de: [1.0, 1.0, 1.9, 1.5, 0.3, 0.6], a2: [2.3, 0.75, 1.8, 1.75, 0.2, 0.7] },
      { a: c.si, b: c.sirve2, de: [-0.25, 0.85, 1.55, 0, 0.7, 0.3], a2: [-0.15, 0.8, 1.35, 0, 0.7, 0.3] },
      { a: c.sirve2 + 0.2, b: c.esto + 0.6, de: [0.2, 1.2, 2.6, 0, 0.4, 0], a2: [-0.4, 0.78, 1.5, -0.85, 0.5, 0.1] },
      { a: c.toque - 0.25, b: c.toque + 0.4, de: [-0.4, 0.78, 1.5, -0.85, 0.5, 0.1], a2: [0.3, 0.78, 1.5, 0, 0.5, 0.1] },
      { a: c.otro2 - 0.25, b: c.otro2 + 0.4, de: [0.3, 0.78, 1.5, 0, 0.5, 0.1], a2: [1.1, 0.78, 1.5, 0.85, 0.5, 0.1] },
      { a: c.que - 0.1, b: c.que + 0.6, de: [0.25, 0.85, 1.55, 0, 0.7, 0.3], a2: [0.15, 0.8, 1.35, 0, 0.7, 0.3] },
    ];
  },
  actualizar(t) {
    const c = this.c, mv = this.mv, ip = this.ip; let objetivo = null;
    ip.visible = entre(t, c.si, c.sirve2 + 0.2); ip.position.set(0, 0.7, 0.3 + 0.0 * t); ip.userData.pantalla('bloqueo', { hora: '21:31' });
    if (t < c.lo || (t >= c.que - 0.1)) { mv.position.set(0, 0.7, 0.3); mv.rotation.set(0, 0, 0); mv.userData.pantalla('panel', { marca: prog(t < c.lo ? t : t - c.que + 0.6, 0.4, 1.2) }); }
    else if (t < c.si) { const k = prog(t, c.lo, c.pagas); const d = this.datafono.position; mv.position.set(lerp(0.6, d.x, k), lerp(0.7, 0.19, k), lerp(0.9, d.z - 0.05, k)); mv.rotation.set(-Math.PI / 2 * k, 0, 0); mv.userData.pantalla(t > c.pagas + 0.4 ? 'pago' : 'bloqueo'); objetivo = t > c.pagas ? this.datafono.localToWorld(new THREE.Vector3(0, 0.15, 0)) : null; }
    else if (t < c.sirve2 + 0.2) { mv.position.set(5, 0, 0); }
    else {
      const paso = t < c.toque ? ['carta', 'carta', -0.85] : t < c.otro2 ? ['resenas', 'resena', 0] : ['redes', 'instagram', 0.85];
      const ini = t < c.toque ? c.esto : t < c.otro2 ? c.toque : c.otro2; const k = prog(t, ini - 0.1, ini + 0.35);
      mv.position.set(paso[2], 0.56, lerp(0.45, 0.075, k)); mv.rotation.set(-0.1, 0, 0);
      mv.userData.pantalla(k > 0.8 ? paso[1] : 'bloqueo', { llenas: 5 }); objetivo = k > 0.6 ? this.tjs[paso[0]].userData.centro() : null;
    }
    this.on.userData.actualizar(t, objetivo ? 1 : 0, mv.userData.detras(), objetivo || new THREE.Vector3());
    camara(t, this.tomas);
  },
  capa(t) {
    const c = this.c;
    titulo('¿Sabes para qué sirve este BOTÓN?', 1 - prog(t, c.lo - 0.2, c.lo + 0.1), 'pegatina');
    if (entre(t, c.lo, c.si)) etiqueta('ya lo usas para PAGAR 💳', prog(t, c.lo, c.lo + 0.3));
    if (entre(t, c.si, c.sirve2)) etiqueta('iPhone: siempre activado', prog(t, c.si, c.si + 0.3), '#444b66');
    if (entre(t, c.sirve2, c.carta)) etiqueta('y sirve para ESTO 👇', prog(t, c.sirve2, c.sirve2 + 0.3), 'degradado');
    if (entre(t, c.carta, c.toque)) etiqueta('① la carta del bar', prog(t, c.carta, c.carta + 0.3));
    if (entre(t, c.toque, c.otro2)) etiqueta('② las reseñas ⭐', prog(t, c.toque, c.toque + 0.3));
    if (entre(t, c.otro2, c.que)) etiqueta('③ el Instagram del bar', prog(t, c.otro2, c.otro2 + 0.3));
    if (t >= c.que) etiqueta('¿Qué móvil tienes? 👇', prog(t, c.que, c.que + 0.3), 'degradado', 360);
  },
};

V['redes'] = {
  montar() {
    duracion = 10; mundo.add(mesaGrande()); this.tj = tarjeta('redes', 0); mundo.add(this.tj); this.mv = movil(); mundo.add(this.mv); this.on = ondas();
    efectos = [['tap', 0.15], ['pop', 0.5], ['tap', 3.2], ['ding', 3.3], ['whoosh', 6.2], ['tap', 9.85]];
    this.tomas = [{ a: 0, b: 10, de: [0.55, 0.85, 1.75, 0.1, 0.62, 0.06], a2: [0.4, 0.8, 1.55, 0.1, 0.62, 0.06] }];
  },
  actualizar(t) {
    const mv = this.mv; const fuera = prog(t, 6.0, 6.9) * (1 - prog(t, 8.8, 9.85));
    mv.position.set(0.2 + 0.25 * fuera, 0.66 + 0.45 * fuera, 0.065 + 0.25 * fuera); mv.rotation.set(-0.1, -0.15, -0.08);
    const sig = t > 3.2 && t < 9.0;
    mv.userData.pantalla(t > 0.4 && t < 6.6 ? 'instagram' : 'bloqueo', { siguiendo: sig, onda: entre(t, 3.2, 3.8) ? Math.round(prog(t, 3.2, 3.8) * 10) / 10 : 0 });
    this.on.userData.actualizar(t, fuera < 0.2 ? 1 : 0, mv.userData.detras(), this.tj.userData.centro());
    camara(t, this.tomas);
  },
  capa(t) {
    titulo('Así se ve cuando tocas la tarjeta de este bar', 1);
    if (entre(t, 3.2, 6.2)) etiqueta('1 toque = 1 seguidor', prog(t, 3.2, 3.5), 'degradado', 1430);
    if (entre(t, 6.2, 9.6)) etiqueta('sin buscar el nombre del bar', prog(t, 6.2, 6.5), VX.azul, 1430);
  },
};

V['camarero'] = {
  montar() {
    const m7 = mesaRedonda(7); mundo.add(m7); this.m7 = m7; const tj = tarjeta('camarero', 7); tj.scale.setScalar(0.42); tj.position.set(0, 0, 0.2); m7.add(tj); this.tj = tj;
    const m2 = mesaRedonda(2); m2.position.set(-2.4, 0, -2); mundo.add(m2);
    this.cli = persona('#ff7a59', '#e0ac69'); this.cli.position.set(0, -0.78, 0.95); this.cli.rotation.y = Math.PI; mundo.add(this.cli);
    this.cam = persona('#1d2333', '#c68642', true); mundo.add(this.cam);
    this.mv = movil(); mundo.add(this.mv); this.mvc = movil(); mundo.add(this.mvc); this.on = ondas();
    const c = this.c = { en: cue('en'), tocas: cue('tocas'), aviso: cue('aviso'), sin: cue('sin'), para: cue('para'), en2: cue('en', 2) };
    efectos = [['tap', c.tocas + 0.4], ['ding', c.aviso], ['whoosh', c.sin], ['pop', c.para]];
    this.tomas = [
      { a: 0, b: c.en, de: [1.6, 1.4, 3.6, -0.3, 0.6, -0.5], a2: [1.4, 1.3, 3.2, -0.3, 0.6, -0.5] },
      { a: c.en, b: c.tocas + 0.3, de: [1.4, 1.3, 3.2, -0.3, 0.6, -0.5], a2: [0.95, 0.62, 0.75, 0, 0.3, 0.2] },
      { a: c.aviso - 0.1, b: c.sin, de: [-1.55, 1.55, -0.7, -1.9, 1.2, -1.9], a2: [-1.65, 1.42, -1.15, -1.9, 1.2, -1.9] },
      { a: c.sin, b: c.para, de: [1.8, 1.6, 3.8, -0.6, 0.7, -0.6], a2: [1.5, 1.4, 3.2, -0.2, 0.6, 0] },
      { a: c.para, b: c.en2, de: [0.72, 0.45, 0.62, 0, 0.27, 0.2], a2: [0.6, 0.42, 0.55, 0, 0.27, 0.2] },
      { a: c.en2, b: c.en2 + 1.5, de: [1.4, 1.3, 3.2, -0.3, 0.6, -0.5], a2: [2.2, 2.4, 5, -0.3, 0.4, -0.5] },
    ];
  },
  actualizar(t) {
    const c = this.c;
    const mano = t < c.en ? 2.9 : lerp(2.9, 0.3, prog(t, c.en, c.en + 0.6));
    this.cli.userData.pose({ brazoD: mano, sentado: true });
    // camarero: de espaldas paseando al fondo; tras «sin» se gira y va a la mesa 7
    let px, pz, ry, paso = null;
    if (t < c.sin) { px = -1.9 + Math.sin(t * 0.5) * 0.6; pz = -1.9; ry = Math.PI; paso = t * 7; }
    else { const k = prog(t, c.sin, c.para + 0.6); px = lerp(-1.9, -0.75, k); pz = lerp(-1.9, 0.2, k); ry = lerp(Math.PI, Math.PI * 1.75, prog(t, c.sin, c.sin + 0.4)); paso = k < 1 ? t * 9 : null; }
    this.cam.position.set(px, -0.78, pz); this.cam.rotation.y = ry; this.cam.userData.pose({ brazoD: 0.15, brazoI: 0.15, paso });
    // móvil del cliente
    const k = prog(t, c.tocas - 0.2, c.tocas + 0.35); const cen = this.tj.userData.centro();
    this.mv.visible = t > c.tocas - 0.6 && t < c.sin; this.mv.scale.setScalar(0.6);
    this.mv.position.set(cen.x, cen.y + 0.02, cen.z + lerp(0.3, 0.035, k)); this.mv.rotation.set(-0.1, 0, 0);
    this.on.userData.actualizar(t, entre(t, c.tocas + 0.2, c.aviso) ? 1 : 0, this.mv.userData.detras(), cen);
    // móvil del camarero (aviso)
    this.mvc.visible = entre(t, c.aviso - 0.2, c.sin); this.mvc.position.set(-1.9, 1.2, -1.75); this.mvc.rotation.set(0, Math.PI * 0.08, 0); this.mvc.scale.setScalar(0.7);
    this.mvc.userData.pantalla('aviso', { k: Math.round(prog(t, c.aviso, c.aviso + 0.4) * 10) / 10 });
    camara(t, this.tomas);
  },
  capa(t) {
    const c = this.c;
    titulo('Nadie levanta la mano en este bar', 1 - prog(t, c.tocas - 0.3, c.tocas));
    if (entre(t, c.tocas, c.aviso)) etiqueta('① toca la tarjeta', prog(t, c.tocas, c.tocas + 0.3));
    if (entre(t, c.aviso, c.sin)) etiqueta('② aviso: MESA 7 🔔', prog(t, c.aviso, c.aviso + 0.3));
    if (entre(t, c.sin, c.para)) etiqueta('③ va directo', prog(t, c.sin, c.sin + 0.3));
    if (entre(t, c.para, c.en2)) etiqueta('pedir · la cuenta', prog(t, c.para, c.para + 0.3), 'degradado');
    if (t >= c.en2) etiqueta('¿Cuánto tardan en verte? 👇', prog(t, c.en2, c.en2 + 0.3), 'degradado', 360);
  },
};

V['pilas'] = {
  montar() {
    mundo.add(mesaGrande()); this.tj = tarjeta('carta', 4); mundo.add(this.tj); this.mv = movil(); mundo.add(this.mv); this.on = ondas();
    const c = this.c = { mira: cue('mira'), espiral: cue('espiral'), chip: cue('chip'), energia: cue('energia'), como: cue('como'), abrir: cue('abrir'), cargarla: cue('cargarla'), otra: cue('otra') };
    efectos = [['pop', 0.2], ['whoosh', c.mira], ['ding', c.chip], ['tap', c.energia + 0.5], ['pop', c.abrir + 0.3], ['whoosh', c.otra]];
    this.tomas = [
      { a: 0, b: c.mira, de: [0.9, 0.9, 1.9, 0, 0.55, 0], a2: [0.6, 0.75, 1.5, 0, 0.55, 0] },
      { a: c.mira, b: c.espiral + 0.5, de: [0.6, 0.75, 1.5, 0, 0.55, 0], a2: [0.15, 0.5, 0.8, 0, 0.45, 0] },
      { a: c.energia, b: c.abrir, de: [0.7, 0.68, 1.15, 0, 0.5, 0.05], a2: [0.55, 0.64, 1.0, 0, 0.5, 0.05] },
      { a: c.abrir, b: c.cargarla, de: [0.12, 0.62, 1.2, 0, 0.56, 0.06], a2: [0.08, 0.6, 1.02, 0, 0.56, 0.06] },
      { a: c.cargarla, b: c.otra + 1, de: [0.9, 0.95, 2.0, 0, 0.5, 0], a2: [1.2, 1.2, 2.6, 0, 0.45, 0] },
    ];
  },
  actualizar(t) {
    const c = this.c, tj = this.tj, mv = this.mv;
    tj.rotation.y = t < c.mira ? Math.sin(t * 1.4) * 0.35 : lerp(Math.sin(c.mira * 1.4) * 0.35, 0, prog(t, c.mira, c.mira + 0.5));
    const xr = prog(t, c.mira, c.mira + 0.5) * (1 - prog(t, c.abrir - 0.3, c.abrir + 0.1));
    const pulso = t > c.energia + 0.4 ? 0.7 + 0.3 * Math.sin(t * 10) : t > c.chip ? 0.6 : 0;
    tj.userData.rayosX(xr, prog(t, c.espiral - 0.2, c.chip), pulso);
    const vis = t > c.energia - 0.2; mv.visible = vis;
    const al = t >= c.cargarla ? prog(t, c.cargarla, c.cargarla + 0.6) : 0; mv.position.set(0.2 + 0.25 * al, 0.66 + 0.45 * al, t < c.cargarla ? lerp(0.6, 0.065, prog(t, c.energia, c.energia + 0.5)) : 0.065 + 0.25 * al); mv.rotation.set(-0.1, -0.15, -0.08);
    mv.userData.opacidad(1 - 0.75 * xr); mv.userData.pantalla(t > c.abrir && t < c.cargarla + 0.3 ? 'carta' : 'bloqueo');
    this.on.userData.actualizar(t, entre(t, c.energia + 0.3, c.cargarla) ? 1 : 0, mv.userData.detras(), tj.userData.centro());
    camara(t, this.tomas);
  },
  capa(t) {
    const c = this.c;
    burbuja('@dueño_de_bar', '¿Y eso no lleva pilas?', 1 - prog(t, c.mira - 0.3, c.mira));
    if (entre(t, c.espiral, c.chip)) etiqueta('una ESPIRAL (antena)', prog(t, c.espiral, c.espiral + 0.3));
    if (entre(t, c.chip, c.energia)) etiqueta('y un CHIP', prog(t, c.chip, c.chip + 0.3));
    if (entre(t, c.energia, c.como)) etiqueta('la enciende TU MÓVIL ⚡', prog(t, c.energia, c.energia + 0.3), 'degradado');
    if (entre(t, c.como, c.abrir)) etiqueta('como carga inalámbrica (mínima)', prog(t, c.como, c.como + 0.3), '#444b66');
    if (entre(t, c.abrir, c.cargarla)) etiqueta('y abre la carta', prog(t, c.abrir, c.abrir + 0.3), 'degradado');
    if (entre(t, c.cargarla, c.otra)) etiqueta('nada que cargar 🔋✕', prog(t, c.cargarla, c.cargarla + 0.3), '#ff3b5c');
    if (t >= c.otra) etiqueta('¿Otra pregunta? Déjala 👇', prog(t, c.otra, c.otra + 0.3), 'degradado', 360);
  },
};

// =====================================================================
// ESTILO 2 («más dopamina»): bar lleno, cámara siempre en movimiento, barridos con desenfoque,
// móvil 2D que entra deslizando, pastillas, contadores, capítulos arriba y subtítulos con palabra clave.
// =====================================================================

// carta con botones de mesa (pedir, camarero, cuenta)
PANT.carta2 = (x, w, h, s) => {
  x.fillStyle = '#f6f4ef'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#1a1f4a'; x.fillRect(0, 0, w, 190); texto(x, 'Bar La Esquina', 36, 95, 38, '#fff', 900, 'left');
  x.fillStyle = VX.naranja; rr(x, w - 180, 58, 150, 70, 35); x.fill(); texto(x, `Mesa ${s.mesa || 7}`, w - 105, 94, 32, '#fff', 900);
  const platos = [['Caña', '2,50 €', '#f2c94c'], ['Patatas bravas', '6,50 €', '#e0a24a'], ['Croquetas', '8,00 €', '#c9864a'], ['Calamares', '9,50 €', '#e8c27a']];
  platos.forEach(([n, p, c], i) => {
    const y = 220 + i * 140; x.fillStyle = '#fff'; rr(x, 22, y, w - 44, 120, 22); x.fill();
    x.fillStyle = c; rr(x, 38, y + 14, 92, 92, 18); x.fill();
    texto(x, n, 150, y + 44, 30, '#1a1a1a', 800, 'left'); texto(x, p, 150, y + 86, 26, '#777', 600, 'left');
    const sel = (s.sel || 0) > i && i < 3; x.fillStyle = sel ? VX.azul : '#e8e8ee'; x.beginPath(); x.arc(w - 76, y + 60, 32, 0, 7); x.fill(); texto(x, sel ? '✓' : '+', w - 76, y + 61, 38, sel ? '#fff' : '#333', 900);
  });
  const by = 800;
  [['🔔  Llamar al camarero', 'camarero', VX.naranja], ['Pedir la cuenta', 'cuenta', '#1a1f4a']].forEach(([l, k, col], i) => {
    const y = by + i * 112; const on = s.pulsado === k;
    x.fillStyle = on ? '#22c55e' : col; rr(x, 30, y, w - 60, 92, 46); x.fill(); texto(x, on ? (k === 'camarero' ? '✓ Avisado: viene ya' : '✓ Cuenta pedida') : l, w / 2, y + 47, 32, '#fff', 900);
  });
  if (s.sel) { x.fillStyle = VX.azul; rr(x, 30, h - 120, w - 60, 90, 45); x.fill(); texto(x, s.enviado ? '✓ Pedido en cocina' : `Pedir · ${s.total || ''}`, w / 2, h - 75, 34, '#fff', 900); }
};

// móvil plano 2D (encima del 3D), con su propia pantalla
const pantalla2D = lienzo(540, 1144);
function movil2D(cx, cy, esc, rot, nombre, est = {}, alfa = 1) {
  if (alfa <= 0) return;
  pantalla2D.pintar(nombre + JSON.stringify(est), (x, w, h) => PANT[nombre](x, w, h, est));
  const w = 540 * esc, h = 1144 * esc, b = 22 * esc;
  C.save(); C.globalAlpha = alfa; C.translate(cx, cy); C.rotate(rot);
  C.shadowColor = 'rgba(0,0,0,0.6)'; C.shadowBlur = 60; C.shadowOffsetY = 20;
  C.fillStyle = '#0d0f14'; rr(C, -w / 2 - b, -h / 2 - b, w + 2 * b, h + 2 * b, 70 * esc); C.fill(); C.shadowBlur = 0; C.shadowOffsetY = 0;
  C.save(); rr(C, -w / 2, -h / 2, w, h, 52 * esc); C.clip(); C.drawImage(pantalla2D.c, -w / 2, -h / 2, w, h); C.restore();
  C.fillStyle = '#0d0f14'; rr(C, -60 * esc, -h / 2 + 14 * esc, 120 * esc, 34 * esc, 17 * esc); C.fill();
  C.restore();
}
const rebote = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const entra = (t, a, d = 0.45) => rebote(clamp((t - a) / d));

function pastilla(t, X, Y, k, color = VX.azul, tam = 40) {
  if (k <= 0) return; C.save(); C.font = `900 ${tam}px ${FUENTE}`; const w = C.measureText(t).width + tam * 1.2;
  C.translate(X, Y); C.scale(k, k); C.fillStyle = color === 'degradado' ? grad(C, -w / 2, 0, w / 2, 0, [VX.cian, VX.azul, VX.violeta]) : color;
  C.shadowColor = 'rgba(0,0,0,0.45)'; C.shadowBlur = 24; rr(C, -w / 2, -tam * 0.85, w, tam * 1.7, tam * 0.85); C.fill(); C.shadowBlur = 0;
  C.fillStyle = '#fff'; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(t, 0, 2); C.restore();
}
function contador(icono, valor, X, Y, color = '#fff', borde = VX.naranja) {
  C.save(); C.font = `900 44px ${FUENTE}`; const txt = `${icono} ${valor}`; const w = C.measureText(txt).width + 56;
  C.fillStyle = 'rgba(8,10,22,0.82)'; rr(C, X - w, Y, w, 78, 39); C.fill(); C.strokeStyle = borde; C.lineWidth = 4; rr(C, X - w, Y, w, 78, 39); C.stroke();
  C.fillStyle = color; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(txt, X - w / 2, Y + 41); C.restore();
}
function capitulos(nombres, actual) {
  const Y = 96, total = 960, x0 = (W - total) / 2, seg = total / nombres.length;
  nombres.forEach((n, i) => {
    const X = x0 + i * seg; const on = i === actual, hecho = i < actual;
    C.fillStyle = on ? grad(C, X, 0, X + seg, 0, [VX.cian, VX.violeta]) : hecho ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)';
    rr(C, X + 4, Y, seg - 8, 10, 5); C.fill();
    C.font = `800 26px ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.55)'; C.fillText(n, X + seg / 2, Y + 40);
  });
}
function golpe(t, X, Y, k, tam = 150, color = '#fff') {
  if (k <= 0) return; const s = k < 1 ? lerp(2.2, 1, ease(k)) : 1; C.save(); C.globalAlpha = clamp(k * 3);
  C.translate(X, Y); C.scale(s, s); contorno(t, 0, 0, tam, color, 900, 22); C.restore();
}
const CLAVES = new Set(['mano', 'camarero', 'carta', 'cocina', 'mesa', 'cero', 'toque', 'cuenta', 'problema', 'movil', 'lleno', 'solo', 'vibra', 'descargar', 'siete', '7', '10', 'nada', 'barra', 'pedido', 'confirma', 'caja', 'comida', 'bebidas']);
function subtitulosArriba(t) {
  const i = trozos.findIndex((tr, k) => t >= tr[0].t - 0.05 && t < (trozos[k + 1] ? trozos[k + 1][0].t - 0.05 : tr[tr.length - 1].fin + 0.6));
  if (i < 0) return; const tr = trozos[i]; const tam = 70; C.font = `900 ${tam}px ${FUENTE}`;
  const pal = tr.map(p => p.p.replace(/[,.…:]$/, ''));
  const anchos = pal.map(s => C.measureText(s + ' ').width); const total = anchos.reduce((a, b) => a + b, 0);
  let X = W / 2 - total / 2; const Y = S.y || 300;
  pal.forEach((s, k) => {
    const dicha = t >= tr[k].t - 0.03; const pop = prog(t, tr[k].t - 0.05, tr[k].t + 0.12);
    const clave = CLAVES.has(norm(s)); const w = C.measureText(s).width;
    C.save(); C.translate(X + w / 2, Y); const sc = dicha ? 0.85 + 0.15 * pop : 0.85; C.scale(sc, sc);
    if (clave && dicha) { C.fillStyle = grad(C, -w / 2, 0, w / 2, 0, [VX.cian, VX.azul, VX.violeta]); rr(C, -w / 2 - 14, -tam * 0.62, w + 28, tam * 1.22, 16); C.fill(); }
    C.textAlign = 'center'; C.textBaseline = 'middle'; C.lineJoin = 'round';
    if (!(clave && dicha)) { C.lineWidth = 14; C.strokeStyle = 'rgba(0,0,0,0.85)'; C.strokeText(s, 0, 2); }
    C.fillStyle = dicha ? '#fff' : 'rgba(255,255,255,0.45)'; C.fillText(s, 0, 2); C.restore(); X += anchos[k];
  });
}
function cajaComentario(texto, k, cursor) {
  const Y = 1500; C.save(); C.globalAlpha = k; C.fillStyle = 'rgba(255,255,255,0.12)'; rr(C, 80, Y, W - 160, 110, 55); C.fill();
  C.strokeStyle = 'rgba(255,255,255,0.35)'; C.lineWidth = 3; rr(C, 80, Y, W - 160, 110, 55); C.stroke();
  C.font = `700 44px ${FUENTE}`; C.textAlign = 'left'; C.textBaseline = 'middle'; C.fillStyle = texto ? '#fff' : 'rgba(255,255,255,0.5)';
  C.fillText(texto || 'Añade un comentario…', 130, Y + 57); if (cursor && texto) { const w = C.measureText(texto).width; C.fillRect(134 + w, Y + 30, 4, 54); }
  C.fillStyle = grad(C, W - 190, 0, W - 100, 0, [VX.cian, VX.violeta]); C.beginPath(); C.arc(W - 140, Y + 55, 38, 0, 7); C.fill();
  C.fillStyle = '#fff'; C.beginPath(); C.moveTo(W - 156, Y + 38); C.lineTo(W - 120, Y + 55); C.lineTo(W - 156, Y + 72); C.closePath(); C.fill(); C.restore();
}

// cámara con vuelo continuo, barridos rápidos (desenfoque) y temblor
function camara2(t, tomas) {
  let i = 0; for (let k = 0; k < tomas.length; k++) if (t >= tomas[k].a) i = k;
  const T = tomas[i], fin = tomas[i + 1] ? tomas[i + 1].a : T.a + 4;
  const barrido = T.barrido ?? 0.28; // primeros segundos de la toma: viene volando desde la anterior
  const k = clamp((t - T.a) / Math.max(0.01, fin - T.a));
  let p = new THREE.Vector3().fromArray(T.de).lerp(new THREE.Vector3().fromArray(T.a2 || T.de), ease(k));
  let l = new THREE.Vector3().fromArray(T.mira).lerp(new THREE.Vector3().fromArray(T.mira2 || T.mira), ease(k));
  let desenfoque = 0;
  if (i > 0 && t - T.a < barrido) {
    const P = tomas[i - 1]; const kb = ease(clamp((t - T.a) / barrido));
    const pp = new THREE.Vector3().fromArray(P.a2 || P.de), lp = new THREE.Vector3().fromArray(P.mira2 || P.mira);
    p = pp.lerp(p, kb); l = lp.lerp(l, kb); desenfoque = Math.sin(Math.PI * kb) * 14;
  }
  let fov = T.fov || 38; const tele = ESTILO?.tele || 1;
  if (tele !== 1) { p = l.clone().add(p.clone().sub(l).multiplyScalar(tele)); fov = 2 * Math.atan(Math.tan(fov * Math.PI / 360) / tele) * 180 / Math.PI; }
  cam.up.fromArray(T.up || [0, 1, 0]); cam.position.copy(p); cam.lookAt(l);
  if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  return desenfoque;
}

// ---------- estilo iOS: iconos vectoriales, pastillas de cristal, subtítulos limpios ----------
function icono(n, x, y, s, color = '#fff') {
  C.save(); C.translate(x, y); C.scale(s / 24, s / 24); C.strokeStyle = color; C.fillStyle = color; C.lineWidth = 2.2; C.lineCap = 'round'; C.lineJoin = 'round';
  const P = d => C.stroke(new Path2D(d)), F = d => C.fill(new Path2D(d));
  switch (n) {
    case 'reloj': C.beginPath(); C.arc(0, 0, 10, 0, 7); C.stroke(); P('M0 -6 L0 0 L4.5 3'); break;
    case 'crono': C.beginPath(); C.arc(0, 2, 9, 0, 7); C.stroke(); P('M0 2 L0 -3 M-3 -10 L3 -10 M7 -5 L9 -7'); break;
    case 'recibo': P('M-7 -10 L7 -10 L7 10 L4.5 8 L2 10 L-0.5 8 L-3 10 L-5 8 L-7 10 Z M-3.5 -5 L3.5 -5 M-3.5 -1 L3.5 -1 M-3.5 3 L1 3'); break;
    case 'mano': P('M-4 9 Q-8 6 -8 0 L-8 -3 Q-8 -5 -6 -5 Q-4 -5 -4 -3 L-4 -9 Q-4 -11 -2 -11 Q0 -11 0 -9 L0 -10 Q0 -12 2 -12 Q4 -12 4 -10 L4 -8 Q4 -10 6 -10 Q8 -10 8 -8 L8 2 Q8 9 1 10 Z'); break;
    case 'campana': P('M-7 5 L-7 -1 Q-7 -8 0 -8 Q7 -8 7 -1 L7 5 L9 7 L-9 7 Z M-2 10 Q0 12 2 10 M0 -8 L0 -10'); break;
    case 'vibra': C.beginPath(); rr(C, -5, -9, 10, 18, 2.5); C.stroke(); P('M-9 -4 L-11 -2 L-9 0 L-11 2 L-9 4 M9 -4 L11 -2 L9 0 L11 2 L9 4'); break;
    case 'check': P('M-7 0 L-2 5 L8 -6'); break;
    case 'cocina': P('M-7 4 L7 4 L7 9 L-7 9 Z M-7 4 Q-11 -2 -6 -5 Q-4 -11 0 -9 Q4 -11 6 -5 Q11 -2 7 4'); break;
    case 'nfc': for (let i = 0; i < 3; i++) { C.beginPath(); C.arc(-4, 0, 4 + i * 4, -0.8, 0.8); C.stroke(); } break;
    case 'usuario': C.beginPath(); C.arc(0, -4, 4.5, 0, 7); C.stroke(); P('M-8 10 Q-8 2 0 2 Q8 2 8 10'); break;
  }
  C.restore();
}
const TONOS = { oscuro: ['rgba(16,18,30,0.78)', 'rgba(255,255,255,0.16)'], rojo: ['rgba(214,40,57,0.92)', 'rgba(255,255,255,0.25)'], verde: ['rgba(22,163,74,0.92)', 'rgba(255,255,255,0.25)'], azul: ['rgba(63,125,251,0.92)', 'rgba(255,255,255,0.25)'], marca: ['marca', 'rgba(255,255,255,0.3)'], claro: ['rgba(255,255,255,0.92)', 'rgba(0,0,0,0.06)'] };
function pildora(txt, X, Y, k, { icono: ic = null, tono = 'oscuro', tam = 42 } = {}) {
  if (k <= 0) return; const [fondo, borde] = TONOS[tono]; const tx = tono === 'claro' ? '#111' : '#fff';
  C.save(); C.font = `700 ${tam}px Inter, ${FUENTE}`; const tw = C.measureText(txt).width; const pad = tam * 0.62, isz = ic ? tam * 0.95 : 0, gap = ic ? tam * 0.35 : 0;
  const w = tw + pad * 2 + isz + gap, h = tam * 1.75;
  C.translate(X, Y); C.scale(k, k); C.globalAlpha = clamp(k * 1.4);
  C.shadowColor = 'rgba(0,0,0,0.35)'; C.shadowBlur = 30; C.shadowOffsetY = 8;
  C.fillStyle = fondo === 'marca' ? grad(C, -w / 2, 0, w / 2, 0, [VX.cian, VX.azul, VX.violeta]) : fondo; rr(C, -w / 2, -h / 2, w, h, h / 2); C.fill();
  C.shadowBlur = 0; C.shadowOffsetY = 0; C.strokeStyle = borde; C.lineWidth = 2; rr(C, -w / 2, -h / 2, w, h, h / 2); C.stroke();
  let x0 = -w / 2 + pad; if (ic) { icono(ic, x0 + isz / 2, 0, isz, tx); x0 += isz + gap; }
  C.fillStyle = tx; C.textAlign = 'left'; C.textBaseline = 'middle'; C.fillText(txt, x0, 2); C.restore();
}
function contadorIOS(ic, txt, Xder, Y, tono = 'oscuro') { C.save(); C.font = `700 40px Inter, ${FUENTE}`; const w = C.measureText(txt).width + 40 * 0.62 * 2 + 38 + 14; C.restore(); pildora(txt, Xder - w / 2, Y, 1, { icono: ic, tono, tam: 40 }); }
function golpeIOS(t, X, Y, k, tam = 140, marca = false) {
  if (k <= 0) return; const s = k < 1 ? lerp(1.9, 1, ease(k)) : 1; C.save(); C.globalAlpha = clamp(k * 3); C.translate(X, Y); C.scale(s, s);
  C.font = `900 ${tam}px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle'; const w = C.measureText(t).width;
  C.shadowColor = 'rgba(0,0,0,0.55)'; C.shadowBlur = 40; C.shadowOffsetY = 10;
  C.fillStyle = marca ? grad(C, -w / 2, 0, w / 2, 0, [VX.cian, VX.azul, VX.violeta]) : '#fff'; C.fillText(t, 0, 0); C.restore();
}
function subtitulosIOS(t) {
  const i = trozos.findIndex((tr, k) => t >= tr[0].t - 0.05 && t < (trozos[k + 1] ? trozos[k + 1][0].t - 0.05 : tr[tr.length - 1].fin + 0.6));
  if (i < 0) return; const tr = trozos[i];
  const S = Object.assign({ voces: { k: '#FFD84D' }, tam: 66, fuente: (tam) => `800 ${tam}px Inter, ${FUENTE}`, pill: [VX.cian, VX.azul, VX.violeta], texto: '#fff', textoClave: '#fff', sombra: 'rgba(0,0,0,0.75)', borde: 0, mayus: false, giro: 0 }, ESTILO?.subs || {});
  const tam = S.tam; C.font = S.fuente(tam);
  const pal = tr.map(p => { const x = p.p.replace(/[,.…:]$/, ''); return S.mayus ? x.toUpperCase() : x; });
  const esp = C.measureText(' ').width; const anchos = pal.map(s => C.measureText(s).width); const total = anchos.reduce((a, b) => a + b, 0) + esp * (pal.length - 1) + 30;
  let X = W / 2 - total / 2; const Y = S.y || 300;
  pal.forEach((s, k) => {
    const dicha = t >= tr[k].t - 0.03; const pop = prog(t, tr[k].t - 0.05, tr[k].t + 0.12); const clave = CLAVES.has(norm(s)) && dicha; const w = anchos[k];
    C.save(); C.translate(X + w / 2, Y); const sc = dicha ? 0.9 + 0.1 * pop : 0.9; C.scale(sc, sc); if (clave && S.giro) C.rotate(S.giro);
    if (clave) { C.shadowColor = S.brilloPill || 'rgba(0,0,0,0.35)'; C.shadowBlur = 24; C.fillStyle = grad(C, -w / 2, 0, w / 2, 0, S.pill); rr(C, -w / 2 - 16, -tam * 0.66, w + 32, tam * 1.3, S.radio ?? tam * 0.65); C.fill(); C.shadowBlur = 0;
      if (S.bordePill) { C.lineWidth = S.bordePill; C.strokeStyle = S.colorBorde || '#111'; rr(C, -w / 2 - 16, -tam * 0.66, w + 32, tam * 1.3, S.radio ?? tam * 0.65); C.stroke(); } }
    C.textAlign = 'center'; C.textBaseline = 'middle';
    if (!clave) { C.shadowColor = S.sombra; C.shadowBlur = 22; C.shadowOffsetY = 4; }
    if (S.borde) { C.save(); C.shadowBlur = 0; C.lineJoin = 'round'; C.lineWidth = S.borde; C.strokeStyle = '#111'; C.strokeText(s, 0, 3); C.restore(); }
    C.fillStyle = clave ? S.textoClave : dicha ? ((S.voces || {})[tr[k].q] || S.texto) : (S.textoApagado || 'rgba(255,255,255,0.55)'); C.fillText(s, 0, 3); C.restore(); X += w + esp + (clave ? 10 : 0);
  });
}
function capitulosIOS(nombres, actual) {
  const Y = 104, total = 940, x0 = (W - total) / 2, seg = total / nombres.length;
  C.save(); C.shadowColor = 'rgba(0,0,0,0.5)'; C.shadowBlur = 12;
  nombres.forEach((n, i) => { const X = x0 + i * seg; const on = i === actual, hecho = i < actual;
    C.fillStyle = on ? grad(C, X, 0, X + seg, 0, [VX.cian, VX.violeta]) : hecho ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)'; rr(C, X + 5, Y, seg - 10, 8, 4); C.fill();
    C.font = `${on ? 800 : 600} 25px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.7)'; C.fillText(n, X + seg / 2, Y + 36); });
  C.restore();
}
const proyectar = v => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z < 1]; };
function etiquetaPlano(txt, v, k, tono = 'oscuro', ic = null) { const [x, y, vis] = proyectar(v); if (vis) pildora(txt, x, y, k, { tono, tam: 34, icono: ic }); }
function rutaPlano(puntos, k, color = VX.cian) {
  if (k <= 0) return; const pts = puntos.map(proyectar); let largo = 0; const tramos = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); tramos.push(d); largo += d; }
  let resta = largo * k; C.save(); C.lineCap = 'round'; C.lineJoin = 'round';
  for (const [ancho, alfa] of [[26, 0.25], [10, 1]]) {
    C.strokeStyle = color; C.globalAlpha = alfa; C.lineWidth = ancho; C.setLineDash(ancho > 20 ? [] : [26, 16]); C.lineDashOffset = -k * 200;
    C.beginPath(); C.moveTo(pts[0][0], pts[0][1]); let r = resta; let fin = pts[0];
    for (let i = 1; i < pts.length && r > 0; i++) { const f = Math.min(1, r / tramos[i - 1]); fin = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; C.lineTo(fin[0], fin[1]); r -= tramos[i - 1]; }
    C.stroke(); if (ancho < 20) { C.setLineDash([]); C.globalAlpha = 1; C.fillStyle = '#fff'; C.beginPath(); C.arc(fin[0], fin[1], 16, 0, 7); C.fill(); C.fillStyle = color; C.beginPath(); C.arc(fin[0], fin[1], 9, 0, 7); C.fill(); }
  }
  C.restore();
}
function ticketCocina(k, t) {
  if (k <= 0) return; const s = rebote(clamp(k)); C.save(); C.translate(W / 2, 1080); C.scale(s, s); C.globalAlpha = clamp(k * 2);
  const w = 760, h = 380; C.shadowColor = 'rgba(0,0,0,0.45)'; C.shadowBlur = 50; C.shadowOffsetY = 16; C.fillStyle = 'rgba(255,255,255,0.97)'; rr(C, -w / 2, -h / 2, w, h, 44); C.fill(); C.shadowBlur = 0; C.shadowOffsetY = 0;
  C.fillStyle = '#111'; C.textAlign = 'left'; C.textBaseline = 'middle'; icono('cocina', -w / 2 + 70, -h / 2 + 70, 52, '#111');
  C.font = `800 40px Inter, ${FUENTE}`; C.fillText('Cocina', -w / 2 + 120, -h / 2 + 72);
  C.fillStyle = VX.naranja; rr(C, w / 2 - 230, -h / 2 + 40, 190, 64, 32); C.fill(); C.fillStyle = '#fff'; C.font = `900 34px Inter, ${FUENTE}`; C.textAlign = 'center'; C.fillText('MESA 7', w / 2 - 135, -h / 2 + 74);
  C.textAlign = 'left'; C.font = `600 36px Inter, ${FUENTE}`; C.fillStyle = '#333';
  ['1 × Patatas bravas', '1 × Croquetas'].forEach((l, i) => { const a = clamp((t - i * 0.15) * 3); C.globalAlpha = a; C.fillText(l, -w / 2 + 70, -h / 2 + 160 + i * 62); });
  C.globalAlpha = 1; C.restore();
}

// ---------- diseño VISAX NFC real: tarjeta «Toca para ver MENÚ» y pantallas del sistema de pedidos ----------
const SERIF = 'Fraunces, Georgia, serif', SANS = `Inter, ${FUENTE}`;
function cubiertos(x, cx, cy, r, fondo = '#fff', trazo = '#1b1714') {
  x.save(); x.fillStyle = fondo; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.fillStyle = trazo;
  const s = r / 100;
  // tenedor
  x.fillRect(cx - 42 * s, cy - 55 * s, 7 * s, 40 * s); x.fillRect(cx - 30 * s, cy - 55 * s, 7 * s, 40 * s); x.fillRect(cx - 18 * s, cy - 55 * s, 7 * s, 40 * s);
  rr(x, cx - 44 * s, cy - 20 * s, 35 * s, 16 * s, 8 * s); x.fill(); rr(x, cx - 31 * s, cy - 8 * s, 10 * s, 70 * s, 5 * s); x.fill();
  // cuchillo
  x.beginPath(); x.moveTo(cx + 22 * s, cy - 58 * s); x.quadraticCurveTo(cx + 48 * s, cy - 40 * s, cx + 42 * s, cy + 2 * s); x.lineTo(cx + 22 * s, cy + 2 * s); x.closePath(); x.fill();
  rr(x, cx + 22 * s, cy - 2 * s, 12 * s, 64 * s, 6 * s); x.fill(); x.restore();
}
function manoMovil(x, cx, cy, s, color = '#fff') {
  x.save(); x.translate(cx, cy); x.rotate(-0.35); x.strokeStyle = color; x.lineWidth = 6 * s; x.lineJoin = 'round'; x.lineCap = 'round';
  rr(x, -22 * s, -40 * s, 44 * s, 76 * s, 9 * s); x.stroke(); x.font = `800 ${13 * s}px ${SANS}`; x.fillStyle = color; x.textAlign = 'center'; x.fillText('NFC', 0, 0);
  x.beginPath(); x.moveTo(-22 * s, 18 * s); x.quadraticCurveTo(-46 * s, 30 * s, -30 * s, 58 * s); x.lineTo(30 * s, 58 * s); x.stroke(); x.restore();
  x.save(); x.strokeStyle = color; x.lineWidth = 5 * s; x.lineCap = 'round';
  for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(cx - 70 * s, cy - 18 * s, (14 + i * 13) * s, Math.PI * 0.75, Math.PI * 1.25); x.stroke(); }
  x.restore();
}
function tarjetaMenu() {
  const g = new THREE.Group();
  const cara = lienzo(620, 920, (x, w, h) => {
    x.fillStyle = '#1d1916'; rr(x, 0, 0, w, h, 26); x.fill();
    const v = x.createRadialGradient(w / 2, h * 0.35, 40, w / 2, h / 2, h * 0.7); v.addColorStop(0, 'rgba(255,255,255,0.06)'); v.addColorStop(1, 'rgba(0,0,0,0.25)'); x.fillStyle = v; rr(x, 0, 0, w, h, 26); x.fill();
    cubiertos(x, w / 2, 230, 118);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `800 40px ${SANS}`; x.letterSpacing = '4px'; x.fillText('TOCA PARA VER', w / 2, 440);
    x.font = `900 150px ${SANS}`; x.letterSpacing = '8px'; x.fillText('MENÚ', w / 2, 560); x.letterSpacing = '0px';
    manoMovil(x, w / 2 + 30, 760, 1.25);
  });
  const lado = new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.5 });
  const frente = new THREE.MeshStandardMaterial({ map: cara.tex, roughness: 0.4 });
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.92, 0.02), [lado, lado, lado, lado, frente, lado]);
  card.castShadow = true; card.position.y = 0.53; card.rotation.x = -0.1; g.add(card);
  const peana = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.07, 0.26), new THREE.MeshStandardMaterial({ color: '#d7ecff', roughness: 0.1, transparent: true, opacity: 0.55 }));
  peana.position.y = 0.035; g.add(peana);
  g.userData = { card, centro() { return card.localToWorld(new THREE.Vector3(0, 0, 0.02)); }, rayosX() {} };
  return g;
}

// pantallas (lienzo 540×1144 del móvil; 1024×640 de tablet/monitor)
const PLATOS = [['Caña', '2,50 €', 'bebida', ['#f6c453', '#e09a2b']], ['Patatas bravas', '6,50 €', 'comida', ['#e8873a', '#b9481f']], ['Croquetas', '8,00 €', 'comida', ['#d9a066', '#9c5b2e']], ['Tinto de verano', '3,00 €', 'bebida', ['#c2304a', '#7d1630']]];
function check(x, cx, cy, s, color = '#fff') { x.save(); x.strokeStyle = color; x.lineWidth = 6 * s; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(cx - 10 * s, cy); x.lineTo(cx - 3 * s, cy + 8 * s); x.lineTo(cx + 12 * s, cy - 9 * s); x.stroke(); x.restore(); }
PANT.cartaV = (x, w, h, s) => {
  x.fillStyle = '#0a0c16'; x.fillRect(0, 0, w, h);
  const gl = x.createRadialGradient(w * 0.2, 60, 10, w * 0.2, 60, 420); gl.addColorStop(0, 'rgba(63,125,251,0.35)'); gl.addColorStop(1, 'rgba(63,125,251,0)'); x.fillStyle = gl; x.fillRect(0, 0, w, 500);
  x.fillStyle = '#fff'; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.font = `600 46px ${SERIF}`; x.fillText('Bar La Esquina', 34, 120);
  x.font = `italic 600 30px ${SERIF}`; x.fillStyle = '#7fb2ff'; x.fillText('nuestra carta', 34, 162);
  x.fillStyle = grad(x, w - 190, 0, w - 34, 0, [VX.cian, VX.violeta]); rr(x, w - 190, 86, 156, 58, 29); x.fill(); x.fillStyle = '#fff'; x.font = `800 28px ${SANS}`; x.textAlign = 'center'; x.fillText(`Mesa ${s.mesa || 7}`, w - 112, 125);
  ['Bebidas', 'Para picar', 'Raciones'].forEach((t, i) => { const X = 34 + i * 165; x.fillStyle = i === 0 ? '#fff' : 'rgba(255,255,255,0.08)'; rr(x, X, 200, 150, 56, 28); x.fill(); x.fillStyle = i === 0 ? '#0a0c16' : 'rgba(255,255,255,0.75)'; x.font = `700 24px ${SANS}`; x.fillText(t, X + 75, 236); });
  const sel = s.sel || 0;
  PLATOS.slice(0, 4).forEach(([n, p, , cols], i) => {
    const y = 290 + i * 150; x.fillStyle = 'rgba(255,255,255,0.05)'; rr(x, 24, y, w - 48, 134, 26); x.fill(); x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = 2; rr(x, 24, y, w - 48, 134, 26); x.stroke();
    x.fillStyle = grad(x, 40, y + 16, 140, y + 116, cols); rr(x, 40, y + 16, 102, 102, 20); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.25)'; x.beginPath(); x.arc(76, y + 50, 18, 0, 7); x.fill();
    x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = `700 30px ${SANS}`; x.fillText(n, 164, y + 58); x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = `500 26px ${SANS}`; x.fillText(p, 164, y + 98);
    const on = sel > i && i < 3; x.fillStyle = on ? grad(x, w - 110, 0, w - 46, 0, [VX.cian, VX.violeta]) : 'rgba(255,255,255,0.12)'; x.beginPath(); x.arc(w - 78, y + 67, 32, 0, 7); x.fill();
    if (on) check(x, w - 78, y + 67, 1.3); else { x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.moveTo(w - 92, y + 67); x.lineTo(w - 64, y + 67); x.moveTo(w - 78, y + 53); x.lineTo(w - 78, y + 81); x.stroke(); }
  });
  if (sel) {
    const env = s.enviado; x.fillStyle = env ? '#16a34a' : grad(x, 30, 0, w - 30, 0, [VX.cian, VX.azul, VX.violeta]); rr(x, 30, h - 150, w - 60, 104, 52); x.fill();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `800 32px ${SANS}`;
    if (env) { check(x, w / 2 - 150, h - 98, 1.4); x.fillText('Pedido enviado', w / 2 + 20, h - 87); } else x.fillText(`Pedir · ${Math.min(sel, 3)} · ${['', '2,50', '9,00', '17,00'][Math.min(sel, 3)]} €`, w / 2, h - 87);
    if (s.onda) { x.fillStyle = `rgba(255,255,255,${0.45 * (1 - s.onda)})`; x.beginPath(); x.arc(w / 2, h - 98, 40 + s.onda * 260, 0, 7); x.fill(); }
  }
};
function lineasPedido(x, X, Y, w, filtro, tam = 30, paso = 66, conEtiqueta = true) {
  PLATOS.slice(0, 3).filter(p => !filtro || p[2] === filtro).forEach(([n, , tipo], i) => {
    const y = Y + i * paso; x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = `700 ${tam}px ${SANS}`; x.fillText(`1 × ${n}`, X, y);
    if (conEtiqueta) { const et = tipo === 'bebida' ? 'Barra' : 'Cocina'; x.font = `800 ${tam * 0.72}px ${SANS}`; const ew = x.measureText(et).width + 28;
      x.fillStyle = tipo === 'bebida' ? 'rgba(51,198,244,0.2)' : 'rgba(255,122,26,0.22)'; rr(x, X + w - ew, y - tam * 0.85, ew, tam * 1.2, tam * 0.6); x.fill();
      x.fillStyle = tipo === 'bebida' ? '#7fdcff' : '#ffb27a'; x.textAlign = 'center'; x.fillText(et, X + w - ew / 2, y - tam * 0.12); }
  });
}
PANT.pedidoCamarero = (x, w, h, s) => {
  x.fillStyle = '#0a0c16'; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(255,255,255,0.55)'; x.font = `600 24px ${SANS}`; x.textAlign = 'left'; x.fillText('VISAX · Pedidos', 34, 70);
  x.fillStyle = '#fff'; x.font = `600 50px ${SERIF}`; x.fillText(s.confirmado ? 'Pedido confirmado' : 'Nuevo pedido', 34, 150);
  x.fillStyle = grad(x, 34, 0, 300, 0, [VX.cian, VX.violeta]); rr(x, 34, 190, 230, 90, 26); x.fill(); x.fillStyle = '#fff'; x.font = `900 48px ${SANS}`; x.textAlign = 'center'; x.fillText(`Mesa ${s.mesa || 7}`, 149, 252);
  x.textAlign = 'left'; x.fillStyle = 'rgba(255,255,255,0.55)'; x.font = `600 24px ${SANS}`; x.fillText(s.resumen || 'hace 5 s · 3 productos · 17,00 €', 34, 330);
  x.fillStyle = 'rgba(255,255,255,0.05)'; rr(x, 24, 370, w - 48, 260, 26); x.fill(); if (s.lineas) s.lineas.forEach(([n, tipo], i) => { const y = 440 + i * 72; x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = `700 30px ${SANS}`; x.fillText(n, 50, y); const et = tipo === 'bebida' ? 'Barra' : 'Cocina'; x.font = `800 22px ${SANS}`; const ew = x.measureText(et).width + 28; x.fillStyle = tipo === 'bebida' ? 'rgba(51,198,244,0.2)' : 'rgba(255,122,26,0.22)'; rr(x, w - 50 - ew, y - 26, ew, 36, 18); x.fill(); x.fillStyle = tipo === 'bebida' ? '#7fdcff' : '#ffb27a'; x.textAlign = 'center'; x.fillText(et, w - 50 - ew / 2, y - 4); }); else lineasPedido(x, 50, 440, w - 100, null, 30, 72);
  const on = s.confirmado; x.fillStyle = on ? '#16a34a' : grad(x, 30, 0, w - 30, 0, [VX.cian, VX.azul, VX.violeta]); rr(x, 30, h - 170, w - 60, 112, 56); x.fill();
  x.fillStyle = '#fff'; x.font = `800 36px ${SANS}`; x.textAlign = 'center'; if (on) { check(x, w / 2 - 110, h - 114, 1.5); x.fillText('Confirmado', w / 2 + 20, h - 101); } else x.fillText('Confirmar', w / 2, h - 101);
  if (s.onda) { x.fillStyle = `rgba(255,255,255,${0.45 * (1 - s.onda)})`; x.beginPath(); x.arc(w / 2, h - 114, 40 + s.onda * 260, 0, 7); x.fill(); }
};
function pantallaLocal(titulo, colorTitulo) {
  return (x, w, h, s) => {
    x.fillStyle = '#0a0c16'; x.fillRect(0, 0, w, h); x.fillStyle = colorTitulo; x.font = `900 46px ${SANS}`; x.textAlign = 'left'; x.fillText(titulo, 40, 74);
    x.fillStyle = 'rgba(255,255,255,0.45)'; x.font = `600 26px ${SANS}`; x.textAlign = 'right'; x.fillText('VISAX · pedidos', w - 40, 72);
    const viejos = titulo === 'COCINA' ? [['Mesa 2', '1 × Calamares'], ['Mesa 5', '2 × Hamburguesa']] : [['Mesa 3', '2 × Caña'], [s.mesa === 8 ? 'Mesa 1' : 'Mesa 8', '1 × Agua']];
    const lista = s.nuevo ? [[`MESA ${s.mesa || 7}`, s.detalle]].concat(viejos) : viejos;
    lista.forEach(([m, d], i) => { const y = 120 + i * 168; const nv = s.nuevo && i === 0;
      x.fillStyle = nv ? `rgba(63,125,251,${0.75 + 0.25 * (s.pulso || 0)})` : 'rgba(255,255,255,0.06)'; rr(x, 30, y, w - 60, 146, 22); x.fill();
      x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = `900 ${nv ? 50 : 40}px ${SANS}`; x.fillText(m, 60, y + 62); x.font = `600 30px ${SANS}`; x.fillStyle = nv ? '#fff' : 'rgba(255,255,255,0.6)'; x.fillText(d, 60, y + 112);
      if (nv) { x.textAlign = 'right'; x.font = `900 30px ${SANS}`; x.fillStyle = VX.amarillo; x.fillText(s.estado || 'NUEVO', w - 60, y + 60); } });
  };
}
PANT.barra = pantallaLocal('BARRA', '#7fdcff');
PANT.cocina = pantallaLocal('COCINA', '#ffb27a');
function pantalla3D(ancho, alto, marco = 0.05) {
  const g = new THREE.Group(); const ui = lienzo(1024, 640);
  const caja = new THREE.Mesh(new THREE.BoxGeometry(ancho + marco * 2, alto + marco * 2, 0.06), new THREE.MeshStandardMaterial({ color: '#111318', roughness: 0.4, metalness: 0.4 })); caja.castShadow = true; g.add(caja);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({ map: ui.tex, toneMapped: false })); p.position.z = 0.031; g.add(p);
  g.userData.pintar = (nombre, est) => ui.pintar(nombre + JSON.stringify(est), (x, w, h) => PANT[nombre](x, w, h, est)); return g;
}
function tpv() {
  const g = new THREE.Group(); const m = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.2 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.4), m('#e9ebf0')); base.position.y = 0.06; base.castShadow = true;
  const pie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), m('#cfd3dc')); pie.position.set(0, 0.28, -0.05);
  const pant = pantalla3D(0.62, 0.4, 0.03); pant.position.set(0, 0.55, 0); pant.rotation.x = -0.3;
  const ui = lienzo(1024, 640, (x, w, h) => { x.fillStyle = '#f3f4f7'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1f4a'; x.fillRect(0, 0, w, 90); x.fillStyle = '#fff'; x.font = `800 44px ${SANS}`; x.fillText('Caja', 30, 60);
    for (let i = 0; i < 12; i++) { x.fillStyle = ['#ffd27a', '#ffb27a', '#9ad7ff', '#c8b6ff'][i % 4]; rr(x, 30 + (i % 4) * 240, 120 + Math.floor(i / 4) * 170, 220, 150, 18); x.fill(); } });
  pant.children[1].material.map = ui.tex;
  g.add(base, pie, pant); return g;
}

// ---------- vídeo: el sistema VISAX como funciona de verdad ----------
V['mesa7'] = {
  arriba: true,
  async montar() {
    duracion = duracion || 28;
    for (const [f, peso, estilo] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-ExtraBold.ttf', '800', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) {
      const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: estilo }); await ff.load(); document.fonts.add(ff);
    }
    scene.background = new THREE.Color('#2b2118'); scene.fog = null; pared.visible = suelo.visible = bokeh.visible = false;
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0;
    hemi.color.set('#fff3e3'); hemi.groundColor.set('#9c7b5c'); hemi.intensity = 1.55;
    const sol = new THREE.DirectionalLight('#ffe0b5', 2.3); sol.position.set(-7, 15, 10); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 45 }); sol.shadow.bias = -0.0006; scene.add(sol);
    const calida = new THREE.PointLight('#ffb36b', 25, 14, 1.6); calida.position.set(-5, 4.2, 3.5); scene.add(calida);
    renderer.toneMappingExposure = 1.1;

    const { mesas } = await construirBar(mundo, () => tarjetaMenu()); this.mesas = mesas;
    const ropa = ['Male_Casual_2', 'Female_Casual', 'Female_Formal', 'Male_Beach', 'Female_Casual', 'Male_Casual_2', 'Female_Formal'];
    this.gente = []; let k = 0;
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) for (const [j, silla] of mesas[n].sillas.entries()) {
      if (n === 7 && j === 1) continue;
      const p = await personaGL(n === 7 ? 'Male_Casual_Hoodie' : ropa[k++ % ropa.length], { sentada: true, anim: n === 7 ? 'Wave' : 'Idle', desfase: k * 0.41 });
      const wp = silla.getWorldPosition(new THREE.Vector3()); p.sentar(wp.x, wp.z + (j === 0 ? -0.15 : 0.15), j === 0 ? Math.PI : 0);
      mundo.add(p.holder); this.gente.push(p); if (n === 7) this.cliente = p;
    }
    for (const [x, nom] of [[-5.0, 'Female_Formal'], [-3.4, 'Male_Casual_2']]) { const p = await personaGL(nom, { sentada: true, desfase: x }); p.sentar(x, -2.75, Math.PI, 0.5); mundo.add(p.holder); this.gente.push(p); }
    this.camarero = await personaGL('Male_Suit', { anim: 'Run' }); mundo.add(this.camarero.holder);
    this.cocinero = await personaGL('Female_Casual', { anim: 'Interact' }); this.cocinero.holder.position.set(3, 0, -3.85); this.cocinero.holder.rotation.y = Math.PI; mundo.add(this.cocinero.holder);
    this.barman = await personaGL('Male_Casual_2', { anim: 'Idle', desfase: 1.3 }); this.barman.holder.position.set(-5.2, 0, -5.4); mundo.add(this.barman.holder);
    this.gente.push(this.cocinero, this.barman);

    // sistema: tablet de barra + caja (TPV) en el extremo de la barra, pantalla de cocina en la pared
    this.tablet = pantalla3D(0.9, 0.56); this.tablet.position.set(-3.0, 1.55, -4.15); this.tablet.rotation.x = -0.35; mundo.add(this.tablet);
    const soporte = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), new THREE.MeshStandardMaterial({ color: '#cfd3dc' })); soporte.position.set(-3.0, 1.2, -4.25); mundo.add(soporte);
    this.caja = tpv(); this.caja.position.set(-1.9, 1.0, -4.15); mundo.add(this.caja);
    this.pantCocina = pantalla3D(1.6, 1.0); this.pantCocina.position.set(5.6, 2.75, -5.55); mundo.add(this.pantCocina);

    this.mv = movil(); this.mv.scale.setScalar(0.38); mundo.add(this.mv); this.on = ondas();
    this.anillo = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.42, 64), new THREE.MeshBasicMaterial({ color: '#ff3b5c', transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
    this.anillo.rotation.x = -Math.PI / 2; this.anillo.position.set(-5, 0.03, 3.3); mundo.add(this.anillo);
    this.halos = [1, 2, 3, 4, 5, 6, 7, 8].map(n => { const h = this.anillo.clone(); h.material = this.anillo.material.clone(); h.material.color.set(VX.cian); const p = mesas[n].g.position; h.position.set(p.x, 0.03, p.z); mundo.add(h); return h; });

    const c = this.c = {
      lleno: cue('lleno'), mesa: cue('mesa'), problema: cue('problema'), mano: cue('mano', 2), ahora: cue('ahora'), tocan: cue('tocan'), carta: cue('carta'), piden: cue('piden'),
      pedido: cue('pedido'), caja: cue('caja'), revisa: cue('revisa'), confirma: cue('confirma'), bebidas: cue('bebidas'), comida: cue('comida'), mismo: cue('mismo'), cero: cue('cero'), comenta: cue('comenta'),
    };
    efectos = [['whoosh', 0.05], ['whoosh', c.lleno - 0.1], ['whoosh', c.mesa - 0.1], ['hit', c.problema], ['pop', c.mano], ['whoosh', c.ahora - 0.1], ['tap', c.tocan + 0.3], ['whoosh', c.carta - 0.15],
      ['tick', c.carta + 0.4], ['tick', c.carta + 0.75], ['tap', c.piden + 0.5], ['whoosh', c.pedido - 0.1], ['ding', c.pedido + 0.4], ['buzz', c.caja - 0.6], ['tap', c.confirma + 0.15], ['ding', c.confirma + 0.4],
      ['pop', c.bebidas + 0.1], ['whoosh', c.comida - 0.15], ['ding', c.comida + 0.6], ['riser', c.mismo - 1.0], ['whoosh', c.mismo], ['hit', c.cero], ['whoosh', c.comenta - 0.1], ['pop', c.comenta + 0.5]];
    this.musica = 'guitarra_bar'; this.volMusica = 0.42;
    const tj = mesas[7].tj.userData.centro().toArray();
    this.tomas = [
      { a: 0, de: [0.3, 30, 0.01], a2: [9, 13, 14], mira: [0, 0, 0], mira2: [-0.5, 0, 0.6], fov: 40 },
      { a: c.lleno - 0.1, de: [7.5, 4.2, 6.8], a2: [6.0, 3.8, 6.2], mira: [2.0, 1.3, 1.5], mira2: [0.5, 1.3, 1.5], fov: 40 },
      { a: c.mesa - 0.1, de: [-2.4, 3.4, 0.4], a2: [-3.2, 2.9, 1.1], mira: [-5, 1.5, 3.9], mira2: [-5, 1.6, 4.0] },
      { a: c.problema, de: [-3.6, 2.4, 1.9], a2: [-3.9, 2.2, 2.3], mira: [-5, 2.0, 4.2], mira2: [-5, 2.05, 4.2], fov: 36 },
      { a: c.ahora - 0.1, de: [tj[0] + 0.9, tj[1] + 1.1, tj[2] + 1.9], a2: [tj[0] + 0.55, tj[1] + 0.75, tj[2] + 1.35], mira: tj, mira2: tj, fov: 34 },
      { a: c.piden + 0.4, de: [0, 36, 0.01], a2: [0, 33, 0.01], mira: [0, 0, 0], mira2: [0, 0, 0], up: [1, 0, 0], fov: 38, barrido: 0.35 },
      { a: c.pedido + 0.5, de: [0.6, 3.0, -0.6], a2: [-0.2, 2.7, -1.3], mira: [-2.5, 1.5, -4.2], mira2: [-2.5, 1.5, -4.2], fov: 36 },
      { a: c.bebidas - 0.1, de: [-1.8, 2.3, -2.4], a2: [-2.2, 2.1, -2.8], mira: [-3.0, 1.55, -4.15], mira2: [-3.0, 1.55, -4.15], fov: 34 },
      { a: c.comida - 0.1, de: [7.7, 3.95, -2.4], a2: [7.5, 3.8, -2.7], mira: [4.3, 1.7, -4.9], mira2: [4.4, 1.7, -5.0], fov: 52 },
      { a: c.mismo, de: [10, 11, 13], a2: [11.5, 15, 15.5], mira: [0, 0, 0], mira2: [0, 0, 0], fov: 38 },
    ];
  },
  actualizar(t) {
    const c = this.c;
    this.cliente.animar(t < c.ahora + 0.2 ? 'Wave' : 'Idle');
    // camarero: corre entre mesas; cuando salta el pedido va a la caja (extremo de la barra) y lo confirma
    const f0 = (t * 0.22) % 2, ida = f0 < 1 ? f0 : 2 - f0;
    if (t < c.pedido) { this.camarero.holder.position.set(lerp(5.5, -0.5, ease(ida)), 0, 1.55); this.camarero.holder.rotation.y = f0 < 1 ? -Math.PI / 2 : Math.PI / 2; this.camarero.animar('Run'); }
    else { const tp = c.pedido, fp = (tp * 0.22) % 2, xp = lerp(5.5, -0.5, ease(fp < 1 ? fp : 2 - fp)); const k = prog(t, tp, tp + 1.3);
      this.camarero.holder.position.set(lerp(xp, -1.9, k), 0, lerp(1.55, -3.35, k)); this.camarero.holder.rotation.y = k < 1 ? Math.atan2(-1.9 - xp, -4.9) : Math.PI; this.camarero.animar(k < 1 ? 'Walk' : 'Interact'); }
    for (const p of this.gente) p.actualizar(t); this.camarero.actualizar(t); this.cliente.actualizar(t);
    const cen = this.mesas[7].tj.userData.centro(); const k = prog(t, c.tocan - 0.1, c.tocan + 0.3);
    this.mv.visible = entre(t, c.ahora, c.carta + 0.25);
    this.mv.position.set(cen.x + 0.03, cen.y + 0.03, cen.z + lerp(0.45, 0.06, k)); this.mv.rotation.set(-0.1, 0.35, 0); this.mv.userData.pantalla(t > c.tocan + 0.3 ? 'cartaV' : 'bloqueo', {});
    this.on.userData.actualizar(t, entre(t, c.tocan + 0.15, c.carta + 0.2) ? 1 : 0, this.mv.userData.detras(), cen);
    const pulso = Math.round((0.5 + 0.5 * Math.sin(t * 8)) * 4) / 4;
    const confirmado = t > c.confirma + 0.2;
    this.tablet.userData.pintar('barra', t > c.pedido + 0.3 ? { nuevo: true, detalle: confirmado ? '1 × Caña' : '1 × Caña · 1 × Bravas · 1 × Croquetas', estado: confirmado ? 'A SERVIR' : 'NUEVO', pulso } : { nuevo: false });
    this.pantCocina.userData.pintar('cocina', t > c.comida + 0.3 ? { nuevo: true, detalle: '1 × Patatas bravas · 1 × Croquetas', estado: 'EN MARCHA', pulso } : { nuevo: false });
    this.anillo.material.opacity = t < c.ahora ? (0.55 + 0.45 * Math.sin(t * 8)) * prog(t, c.mesa - 0.2, c.mesa + 0.3) : 0;
    this.halos.forEach((h, i) => { h.material.opacity = t > c.mismo ? 0.85 * prog(t, c.mismo + i * 0.1, c.mismo + i * 0.1 + 0.25) : 0; });
    this.desenfoque = camara2(t, this.tomas);
  },
  fx(t) {
    const c = this.c; let temblor = 0, flash = 0;
    for (const g of [c.problema, c.cero]) { const d = t - g; if (d >= 0 && d < 0.45) { temblor = Math.max(temblor, (1 - d / 0.45) * 18); flash = Math.max(flash, 1 - d / 0.25); } }
    if (entre(t, c.caja - 0.6, c.caja + 0.4)) temblor = Math.max(temblor, 4);
    return { desenfoque: this.desenfoque, temblor, flash: clamp(flash) * 0.3 };
  },
  capa(t) {
    const c = this.c;
    const g1 = C.createLinearGradient(0, 0, 0, 520); g1.addColorStop(0, 'rgba(0,0,0,0.55)'); g1.addColorStop(1, 'rgba(0,0,0,0)'); C.fillStyle = g1; C.fillRect(0, 0, W, 520);
    const g2 = C.createLinearGradient(0, H - 560, 0, H); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.5)'); C.fillStyle = g2; C.fillRect(0, H - 560, W, 560);
    if (entre(t, 0.2, c.mesa)) contadorIOS('reloj', 'Vie · 22:00', W - 50, 1620);
    if (entre(t, c.mesa, c.ahora)) { const s = Math.floor(lerp(9 * 60 + 52, 10 * 60 + 4, prog(t, c.mesa, c.ahora))); contadorIOS('crono', `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} esperando`, W - 50, 1620, 'rojo'); }
    if (entre(t, c.mismo, c.comenta)) contadorIOS('mano', `Manos levantadas: ${t < c.cero ? 1 : 0}`, W - 50, 1620, t < c.cero ? 'oscuro' : 'verde');
    if (entre(t, c.lleno, c.mesa)) pildora('Un solo camarero', W / 2, 1460, entra(t, c.lleno + 0.15), { icono: 'usuario', tono: 'rojo' });
    if (entre(t, c.problema, c.ahora)) golpeIOS('¿El problema?', W / 2, 1180, prog(t, c.problema, c.problema + 0.18), 118);
    if (entre(t, c.mano, c.ahora)) pildora('La mano', W / 2, 1380, entra(t, c.mano), { icono: 'mano', tono: 'rojo', tam: 60 });
    if (entre(t, c.ahora, c.tocan)) pildora('En cada mesa', W / 2, 1460, entra(t, c.ahora), { icono: 'nfc', tono: 'marca', tam: 48 });
    // carta del cliente (2D) mientras elige y pide
    if (entre(t, c.carta - 0.1, c.piden + 0.6)) {
      const kin = entra(t, c.carta - 0.1, 0.5), kout = prog(t, c.piden + 0.3, c.piden + 0.6);
      const sel = t > c.carta + 0.35 ? Math.min(3, 1 + Math.floor((t - c.carta - 0.35) / 0.35)) : 0;
      movil2D(lerp(W + 400, 730, kin) + kout * 700, 1040, 0.6, lerp(0.22, 0.05, clamp(kin)), 'cartaV', { sel, enviado: t > c.piden + 0.5, onda: entre(t, c.piden + 0.4, c.piden + 0.8) ? Math.round(prog(t, c.piden + 0.4, c.piden + 0.8) * 8) / 8 : 0 });
      if (t > c.carta + 0.2) pildora('Sin app · sin descargar nada', W / 2 - 120, 1660, entra(t, c.carta + 0.2), { icono: 'check', tono: 'azul', tam: 36 });
    }
    // plano: el pedido viaja de la mesa 7 a la barra
    if (entre(t, c.piden + 0.4, c.pedido + 0.5)) {
      const k = prog(t, c.piden + 0.5, c.piden + 0.8);
      etiquetaPlano('Cocina', new THREE.Vector3(5, 1, -4), k, 'claro', 'cocina'); etiquetaPlano('Barra', new THREE.Vector3(-4.5, 1.5, -3.6), k, 'claro');
      etiquetaPlano('Sala', new THREE.Vector3(0, 1, 5.3), k, 'claro'); etiquetaPlano('Mesa 7', new THREE.Vector3(-5, 2.2, 3.3), k, 'marca');
      rutaPlano([[-5, 1.2, 3.3], [-3.2, 1.2, 1.55], [-2.2, 1.2, -1.2], [-2.6, 1.2, -3.6]].map(a => new THREE.Vector3(...a)), prog(t, c.piden + 0.6, c.pedido + 0.4));
    }
    if (entre(t, c.pedido + 0.5, c.bebidas - 0.1)) pildora('Pantalla de barra + móvil del camarero', W / 2, 1460, entra(t, c.pedido + 0.6), { icono: 'vibra', tono: 'marca', tam: 38 });
    // móvil del camarero junto a la caja: nuevo pedido → confirmar
    if (entre(t, c.caja - 0.7, c.bebidas)) {
      const kin = entra(t, c.caja - 0.7, 0.45), kout = prog(t, c.bebidas - 0.3, c.bebidas), vib = entre(t, c.caja - 0.6, c.caja + 0.4) ? Math.sin(t * 90) * 0.03 : 0;
      movil2D(lerp(-400, 330, kin) - kout * 700, 1040, 0.6, -0.06 + vib, 'pedidoCamarero', { confirmado: t > c.confirma + 0.2, onda: entre(t, c.confirma + 0.1, c.confirma + 0.5) ? Math.round(prog(t, c.confirma + 0.1, c.confirma + 0.5) * 8) / 8 : 0 });
    }
    // reparto: bebidas → barra, comida → cocina
    if (entre(t, c.bebidas, c.comida)) pildora('Bebidas → barra', W / 2, 1460, entra(t, c.bebidas), { icono: 'check', tono: 'azul', tam: 50 });
    if (entre(t, c.comida, c.mismo)) { pildora('Comida → cocina', W / 2, 1460, entra(t, c.comida), { icono: 'cocina', tono: 'marca', tam: 50 }); ticketCocina(prog(t, c.comida + 0.5, c.comida + 0.85), t - c.comida - 0.5); }
    if (t >= c.cero && t < c.comenta) golpeIOS('CERO', W / 2, 1180, prog(t, c.cero, c.cero + 0.18), 200, true);
    if (t >= c.comenta) {
      const k = prog(t, c.comenta - 0.2, c.comenta + 0.3); C.fillStyle = `rgba(8,10,20,${0.88 * k})`; C.fillRect(0, 0, W, H);
      logoVisax(C, W / 2 - 70, 540, 140);
      C.save(); C.globalAlpha = k; C.fillStyle = '#fff'; C.textAlign = 'center'; C.font = `600 92px ${SERIF}`; C.fillText('Comenta', W / 2, 880); C.restore();
      if (t > c.comenta + 0.25) { C.save(); const s = rebote(clamp((t - c.comenta - 0.25) / 0.4)); C.translate(W / 2, 1030); C.scale(s, s);
        C.font = `900 150px ${SANS}`; const w = C.measureText('MESA').width + 90; C.shadowColor = 'rgba(0,0,0,0.4)'; C.shadowBlur = 40;
        C.fillStyle = grad(C, -w / 2, 0, w / 2, 0, [VX.cian, VX.azul, VX.violeta]); rr(C, -w / 2, -100, w, 200, 100); C.fill(); C.shadowBlur = 0;
        C.fillStyle = '#fff'; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText('MESA', 0, 8); C.restore(); }
      C.save(); C.font = `italic 600 50px ${SERIF}`; C.fillStyle = '#7fb2ff'; C.textAlign = 'center'; C.globalAlpha = k; C.fillText('y te lo enseñamos en tu bar', W / 2, 1240); C.restore();
      const letras = Math.floor(clamp((t - c.comenta - 0.6) / 0.6) * 4);
      cajaComentario('MESA'.slice(0, letras), prog(t, c.comenta + 0.3, c.comenta + 0.6), Math.floor(t * 3) % 2 === 0);
    }
  },
  subtitulos: subtitulosIOS,
};

// =====================================================================
// BASE COMÚN para los vídeos del bar (mismo bar, gente, sistema y cierre)
// =====================================================================
function placaCuadrada(icono) {
  const g = new THREE.Group();
  const cara = lienzo(620, 620, (x, w, h) => {
    x.fillStyle = grad(x, 0, 0, w, h, ['#24356a', '#2c2a6e', '#3a2f86']); rr(x, 0, 0, w, h, 120); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 6; rr(x, 6, 6, w - 12, h - 12, 116); x.stroke();
    x.strokeStyle = '#5fd6ff'; x.lineCap = 'round'; x.lineWidth = 26;
    if (icono === 'wifi') { for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(w / 2, h * 0.66, 60 + i * 70, Math.PI * 1.22, Math.PI * 1.78); x.stroke(); } x.fillStyle = '#5fd6ff'; x.beginPath(); x.arc(w / 2, h * 0.66, 20, 0, 7); x.fill(); }
    else { x.lineWidth = 22; x.beginPath(); x.moveTo(w / 2 - 120, h * 0.66); x.lineTo(w / 2 - 120, h * 0.42); x.quadraticCurveTo(w / 2 - 120, h * 0.22, w / 2, h * 0.22); x.quadraticCurveTo(w / 2 + 120, h * 0.22, w / 2 + 120, h * 0.42); x.lineTo(w / 2 + 120, h * 0.66); x.lineTo(w / 2 + 150, h * 0.72); x.lineTo(w / 2 - 150, h * 0.72); x.closePath(); x.stroke();
      x.beginPath(); x.arc(w / 2, h * 0.8, 26, 0, Math.PI); x.stroke(); x.beginPath(); x.arc(w / 2 - 175, h * 0.36, 60, Math.PI * 0.85, Math.PI * 1.25); x.stroke(); x.beginPath(); x.arc(w / 2 + 175, h * 0.36, 60, -Math.PI * 0.25, Math.PI * 0.15); x.stroke(); }
    x.lineWidth = 10; x.strokeStyle = '#8fd8ff'; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(w - 150, 130, 22 + i * 22, -0.75, 0.75); x.stroke(); }
  });
  const lado = new THREE.MeshStandardMaterial({ color: '#1e2552', roughness: 0.4 });
  const frente = new THREE.MeshStandardMaterial({ map: cara.tex, roughness: 0.35 });
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.025), [lado, lado, lado, lado, frente, lado]); card.position.y = 0.38; card.rotation.x = -0.12; card.castShadow = true; g.add(card);
  const peana = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.26), new THREE.MeshStandardMaterial({ color: '#d7ecff', roughness: 0.1, transparent: true, opacity: 0.55 })); peana.position.y = 0.035; g.add(peana);
  g.userData = { card, centro() { return card.localToWorld(new THREE.Vector3(0, 0, 0.02)); }, rayosX() {} }; return g;
}
function expositorL(tipo) {
  const g = new THREE.Group();
  const cara = lienzo(620, 920, (x, w, h) => {
    if (tipo === 'instagram') {
      x.fillStyle = grad(x, 0, 0, w * 0.4, h, ['#6a2cc0', '#c1357e', '#e8483f', '#f57b2c']); rr(x, 0, 0, w, h, 34); x.fill();
      x.strokeStyle = '#fff'; x.lineWidth = 30; rr(x, w / 2 - 125, 120, 250, 250, 72); x.stroke(); x.beginPath(); x.arc(w / 2, 245, 62, 0, 7); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.arc(w / 2 + 80, 170, 17, 0, 7); x.fill();
      x.textAlign = 'center'; x.font = `600 52px ${SANS}`; x.fillText('Follow us on', w / 2, 500); x.font = `italic 800 92px ${SERIF}`; x.fillText('Instagram', w / 2, 610);
      manoMovil(x, w / 2 + 30, 770, 1.0);
    } else {
      x.fillStyle = '#1b1d22'; rr(x, 0, 0, w, h, 34); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `700 62px ${SANS}`; x.fillText('Review Us On', w / 2, 120);
      const cols = ['#4285F4', '#EA4335', '#FBBC05', '#34A853']; for (let i = 0; i < 4; i++) { x.strokeStyle = cols[i]; x.lineWidth = 18; x.beginPath(); x.arc(w / 2, 380, 190, i * Math.PI / 2 - 0.2, (i + 1) * Math.PI / 2 - 0.25); x.stroke(); }
      manoMovil(x, w / 2 + 20, 330, 0.9); x.font = `800 34px ${SANS}`; x.fillStyle = '#fff'; x.fillText('TAP HERE', w / 2, 420);
      const letras = 'Google'.split(''), cl = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335']; x.font = `700 84px ${SANS}`; let tw = x.measureText('Google').width, xx = w / 2 - tw / 2;
      letras.forEach((l, i) => { x.fillStyle = cl[i]; x.textAlign = 'left'; x.fillText(l, xx, 520); xx += x.measureText(l).width; });
      estrellas(x, w / 2, 700, 92, 5, 5, '#FBBC05'); for (let i = 0; i < 4; i++) { x.fillStyle = cols[i]; x.fillRect(60 + i * (w - 120) / 4, 820, (w - 120) / 4, 14); }
    }
  });
  const lado = new THREE.MeshStandardMaterial({ color: tipo === 'instagram' ? '#d84a3a' : '#16181d', roughness: 0.3 });
  const frente = new THREE.MeshStandardMaterial({ map: cara.tex, roughness: 0.3 });
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.92, 0.02), [lado, lado, lado, lado, frente, lado]); card.position.set(0, 0.47, -0.04); card.rotation.x = -0.18; card.castShadow = true; g.add(card);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.32), lado); base.position.set(0, 0.01, 0.06); g.add(base);
  g.userData = { card, centro() { return card.localToWorld(new THREE.Vector3(0, 0, 0.02)); }, rayosX() {} }; return g;
}
// pantallas nuevas
PANT.wifiAndroid = (x, w, h, s) => {
  x.fillStyle = '#101317'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = `500 44px ${SANS}`; x.textAlign = 'left'; x.fillText('Wi-Fi', 40, 130);
  [['BarLaEsquina_WiFi', s.conectado ? 'Conectado' : 'Conectando…', true], ['MOVISTAR_8A21', 'Guardada', false], ['vodafone4F2C', '', false]].forEach(([n, e, top], i) => {
    const y = 200 + i * 130; x.fillStyle = top ? 'rgba(77,163,255,0.16)' : 'rgba(255,255,255,0.04)'; rr(x, 24, y, w - 48, 112, 24); x.fill();
    x.strokeStyle = top ? '#4da3ff' : '#9aa0a6'; x.lineWidth = 6; x.lineCap = 'round'; for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(78, y + 76, 10 + k * 13, Math.PI * 1.25, Math.PI * 1.75); x.stroke(); }
    x.fillStyle = '#fff'; x.font = `600 30px ${SANS}`; x.fillText(n, 130, y + 52); x.fillStyle = top ? '#4da3ff' : '#9aa0a6'; x.font = `500 24px ${SANS}`; x.fillText(e, 130, y + 88);
  });
  if (s.conectado) { x.fillStyle = '#2b2f36'; rr(x, 40, h - 200, w - 80, 110, 55); x.fill(); check(x, 100, h - 145, 1.4, '#4ade80'); x.fillStyle = '#fff'; x.font = `600 28px ${SANS}`; x.fillText('Conectado a BarLaEsquina_WiFi', 140, h - 134); }
};
PANT.wifiIphone = (x, w, h, s) => {
  x.fillStyle = '#0a0c16'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.textAlign = 'left'; x.font = `600 46px ${SERIF}`; x.fillText('WiFi de', 40, 150); x.fillText('Bar La Esquina', 40, 206);
  x.fillStyle = 'rgba(255,255,255,0.06)'; rr(x, 30, 260, w - 60, 230, 26); x.fill(); x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = `600 24px ${SANS}`; x.fillText('Red', 60, 310); x.fillText('Contraseña', 60, 410);
  x.fillStyle = '#fff'; x.font = `700 32px ${SANS}`; x.fillText('BarLaEsquina_WiFi', 60, 352); x.fillText('••••••••••', 60, 452);
  const ok = s.copiada; x.fillStyle = ok ? '#16a34a' : grad(x, 30, 0, w - 30, 0, [VX.cian, VX.azul, VX.violeta]); rr(x, 30, 540, w - 60, 104, 52); x.fill(); x.fillStyle = '#fff'; x.font = `800 32px ${SANS}`; x.textAlign = 'center';
  if (ok) { check(x, w / 2 - 120, 592, 1.4); x.fillText('Contraseña copiada', w / 2 + 20, 603); } else x.fillText('Copiar contraseña', w / 2, 603);
  x.fillStyle = 'rgba(255,255,255,0.5)'; x.font = `500 24px ${SANS}`; x.fillText('Pégala en Ajustes › Wi-Fi', w / 2, 700);
};
PANT.avisos = (x, w, h, s) => {
  x.fillStyle = '#0a0c16'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffb27a'; x.font = `900 46px ${SANS}`; x.textAlign = 'left'; x.fillText('AVISOS', 40, 74);
  x.fillStyle = 'rgba(255,255,255,0.45)'; x.font = `600 26px ${SANS}`; x.textAlign = 'right'; x.fillText('VISAX · sala', w - 40, 72);
  if (s.mesa) { x.fillStyle = `rgba(255,122,26,${0.8 + 0.2 * (s.pulso || 0)})`; rr(x, 30, 120, w - 60, 300, 30); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `900 120px ${SANS}`; x.fillText(`Mesa ${s.mesa}`, w / 2, 280); x.font = `800 56px ${SANS}`; x.fillText('LLAMA', w / 2, 370); }
  else { x.fillStyle = 'rgba(255,255,255,0.35)'; x.textAlign = 'center'; x.font = `600 40px ${SANS}`; x.fillText('Sin avisos', w / 2, 300); }
  x.fillStyle = 'rgba(255,255,255,0.06)'; rr(x, 30, 450, w - 60, 150, 24); x.fill(); x.fillStyle = 'rgba(255,255,255,0.6)'; x.textAlign = 'left'; x.font = `600 32px ${SANS}`; x.fillText('Mesa 2 · atendida', 60, 540);
};
PANT.resenaG = (x, w, h, s) => {
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); const cl = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335']; let xx = 40; x.font = `700 36px ${SANS}`; x.textAlign = 'left';
  'Google'.split('').forEach((l, i) => { x.fillStyle = cl[i]; x.fillText(l, xx, 100); xx += x.measureText(l).width; });
  x.fillStyle = '#111'; x.font = `700 40px ${SANS}`; x.fillText('Bar La Esquina', 40, 200); x.fillStyle = '#5f6368'; x.font = `500 26px ${SANS}`; x.fillText('Publicar con tu cuenta', 40, 244);
  estrellas(x, w / 2, 360, 82, 5, s.llenas ?? 0, '#FBBC05'); x.strokeStyle = '#dadce0'; x.lineWidth = 3; rr(x, 40, 460, w - 80, 240, 20); x.stroke();
  x.fillStyle = s.texto ? '#111' : '#80868b'; x.font = `500 28px ${SANS}`; x.fillText(s.texto || 'Comparte detalles de tu experiencia', 70, 510);
  x.fillStyle = '#1a73e8'; rr(x, w - 250, 760, 210, 84, 42); x.fill(); x.fillStyle = '#fff'; x.font = `700 30px ${SANS}`; x.textAlign = 'center'; x.fillText('Publicar', w - 145, 812);
};
PANT.buscarIG = (x, w, h, s) => {
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#efefef'; rr(x, 30, 90, w - 60, 76, 18); x.fill(); x.fillStyle = '#111'; x.font = `500 32px ${SANS}`; x.textAlign = 'left'; x.fillText((s.txt || '') + '|', 70, 140);
  x.fillStyle = '#8e8e8e'; x.font = `500 28px ${SANS}`; x.fillText('Sin resultados', 40, 260); x.fillText('Prueba con otro nombre', 40, 304);
};
PANT.cartaCafe = (x, w, h, s) => {
  x.fillStyle = '#0a0c16'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.textAlign = 'left'; x.font = `600 46px ${SERIF}`; x.fillText('Bar La Esquina', 34, 120); x.font = `italic 600 30px ${SERIF}`; x.fillStyle = '#7fb2ff'; x.fillText('desayunos', 34, 162);
  [['Café con leche', s.precio || '1,30 €', ['#c89b6d', '#7a4b2a'], 'Lactosa'], ['Tostada con tomate', '2,50 €', ['#e0a24a', '#b9481f'], 'Gluten'], ['Zumo de naranja', '3,00 €', ['#ffb347', '#f57b2c'], ''], ['Croissant', '1,80 €', ['#e8c27a', '#b9822e'], 'Gluten · Huevo']].forEach(([n, p, cols, al], i) => {
    const y = 210 + i * 170; x.fillStyle = 'rgba(255,255,255,0.05)'; rr(x, 24, y, w - 48, 150, 26); x.fill(); x.fillStyle = grad(x, 40, y + 18, 150, y + 128, cols); rr(x, 40, y + 18, 112, 112, 20); x.fill();
    x.fillStyle = '#fff'; x.font = `700 30px ${SANS}`; x.fillText(n, 172, y + 56); const nuevo = i === 0 && s.nuevo; x.fillStyle = nuevo ? '#7fdcff' : 'rgba(255,255,255,0.7)'; x.font = `${nuevo ? 800 : 500} 28px ${SANS}`; x.fillText(p, 172, y + 96);
    if (al) { x.fillStyle = 'rgba(255,255,255,0.4)'; x.font = `500 22px ${SANS}`; x.fillText(`Alérgenos: ${al}`, 172, y + 130); }
  });
};

async function montarBarBase(v, { mesaCliente = 7, ropaCliente = 'Male_Casual_Hoodie', tarjeta = () => tarjetaMenu(), extraMesa = null } = {}) {
  for (const [f, peso, estilo] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-ExtraBold.ttf', '800', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) {
    const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: estilo }); await ff.load(); document.fonts.add(ff);
  }
  scene.background = new THREE.Color('#2b2118'); scene.fog = null; pared.visible = suelo.visible = bokeh.visible = false;
  foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0;
  hemi.color.set('#fff3e3'); hemi.groundColor.set('#9c7b5c'); hemi.intensity = 1.55;
  const sol = new THREE.DirectionalLight('#ffe0b5', 2.3); sol.position.set(-7, 15, 10); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 45 }); sol.shadow.bias = -0.0006; scene.add(sol);
  const calida = new THREE.PointLight('#ffb36b', 25, 14, 1.6); calida.position.set(-1, 4.2, 2.5); scene.add(calida);
  renderer.toneMappingExposure = 1.1;
  const { mesas } = await construirBar(mundo, n => (extraMesa && extraMesa(n)) || tarjeta(n)); v.mesas = mesas;
  const ropa = ['Male_Casual_2', 'Female_Casual', 'Female_Formal', 'Male_Beach', 'Female_Casual', 'Male_Casual_2', 'Female_Formal'];
  v.gente = []; let k = 0;
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) for (const [j, silla] of mesas[n].sillas.entries()) {
    if (n === mesaCliente && j === 1) continue;
    const p = await personaGL(n === mesaCliente ? ropaCliente : ropa[k++ % ropa.length], { sentada: true, anim: 'Idle', desfase: k * 0.41 });
    const wp = silla.getWorldPosition(new THREE.Vector3()); p.sentar(wp.x, wp.z + (j === 0 ? -0.15 : 0.15), j === 0 ? Math.PI : 0);
    mundo.add(p.holder); v.gente.push(p); if (n === mesaCliente) v.cliente = p;
  }
  for (const [x, nom] of [[-5.0, 'Female_Formal'], [-3.4, 'Male_Casual_2']]) { const p = await personaGL(nom, { sentada: true, desfase: x }); p.sentar(x, -2.75, Math.PI, 0.5); mundo.add(p.holder); v.gente.push(p); }
  v.camarero = await personaGL('Male_Suit', { anim: 'Run' }); mundo.add(v.camarero.holder);
  v.cocinero = await personaGL('Female_Casual', { anim: 'Interact' }); v.cocinero.holder.position.set(3, 0, -3.85); v.cocinero.holder.rotation.y = Math.PI; mundo.add(v.cocinero.holder);
  v.barman = await personaGL('Male_Casual_2', { anim: 'Idle', desfase: 1.3 }); v.barman.holder.position.set(-5.2, 0, -5.4); mundo.add(v.barman.holder);
  v.gente.push(v.cocinero, v.barman);
  v.tablet = pantalla3D(0.9, 0.56); v.tablet.position.set(-3.0, 1.55, -4.15); v.tablet.rotation.x = -0.35; mundo.add(v.tablet);
  const soporte = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), new THREE.MeshStandardMaterial({ color: '#cfd3dc' })); soporte.position.set(-3.0, 1.2, -4.25); mundo.add(soporte);
  v.caja = tpv(); v.caja.position.set(-1.9, 1.0, -4.15); mundo.add(v.caja);
  v.pantCocina = pantalla3D(1.6, 1.0); v.pantCocina.position.set(5.6, 2.75, -5.55); mundo.add(v.pantCocina);
  v.mv = movil(); v.mv.scale.setScalar(0.38); mundo.add(v.mv); v.on = ondas();
  const pc = mesas[mesaCliente].g.position;
  v.anillo = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.42, 64), new THREE.MeshBasicMaterial({ color: '#ff3b5c', transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
  v.anillo.rotation.x = -Math.PI / 2; v.anillo.position.set(pc.x, 0.03, pc.z); mundo.add(v.anillo);
  v.halos = [1, 2, 3, 4, 5, 6, 7, 8].map(n => { const h = v.anillo.clone(); h.material = v.anillo.material.clone(); h.material.color.set(VX.cian); const p = mesas[n].g.position; h.position.set(p.x, 0.03, p.z); mundo.add(h); return h; });
  v.tablet.userData.pintar('barra', { nuevo: false }); v.pantCocina.userData.pintar('cocina', { nuevo: false });
  v.musica = 'beat';
}
// el camarero corre de un lado a otro por el pasillo central
function camareroCorre(v, t) { const f = (t * 0.22) % 2, ida = f < 1 ? f : 2 - f; v.camarero.holder.position.set(lerp(5.5, -0.5, ease(ida)), 0, 1.55); v.camarero.holder.rotation.y = f < 1 ? -Math.PI / 2 : Math.PI / 2; v.camarero.animar('Run'); return v.camarero.holder.position.x; }
function camareroVa(v, t, t0, dur, destino, rotFinal = Math.PI, animFinal = 'Idle') {
  const f = (t0 * 0.22) % 2, x0 = lerp(5.5, -0.5, ease(f < 1 ? f : 2 - f)); const k = prog(t, t0, t0 + dur);
  v.camarero.holder.position.set(lerp(x0, destino[0], k), 0, lerp(1.55, destino[1], k)); v.camarero.holder.rotation.y = k < 1 ? Math.atan2(destino[0] - x0, destino[1] - 1.55) : rotFinal; v.camarero.animar(k < 1 ? 'Walk' : animFinal);
}
function actualizarGente(v, t) { for (const p of v.gente) p.actualizar(t); v.camarero.actualizar(t); }
function movilEnTarjeta(v, t, tj, tToque, visibleDesde, visibleHasta, pantallaAntes, pantallaDespues, est = {}) {
  const cen = tj.userData.centro(); const k = prog(t, tToque - 0.1, tToque + 0.3);
  v.mv.visible = entre(t, visibleDesde, visibleHasta);
  v.mv.position.set(cen.x + 0.03, cen.y + 0.03, cen.z + lerp(0.45, 0.06, k)); v.mv.rotation.set(-0.1, 0.35, 0); v.mv.userData.pantalla(t > tToque + 0.3 ? pantallaDespues : pantallaAntes, est);
  v.on.userData.actualizar(t, entre(t, tToque + 0.15, visibleHasta) ? 1 : 0, v.mv.userData.detras(), cen);
}
function fxBase(v, t, golpes, vibra = []) {
  let temblor = 0, flash = 0;
  for (const g of golpes) { const d = t - g; if (d >= 0 && d < 0.45) { temblor = Math.max(temblor, (1 - d / 0.45) * 18); flash = Math.max(flash, 1 - d / 0.25); } }
  for (const [a, b] of vibra) if (entre(t, a, b)) temblor = Math.max(temblor, 4);
  return { desenfoque: v.desenfoque, temblor, flash: clamp(flash) * 0.3 };
}
function velos() {
  const g1 = C.createLinearGradient(0, 0, 0, 520); g1.addColorStop(0, 'rgba(0,0,0,0.55)'); g1.addColorStop(1, 'rgba(0,0,0,0)'); C.fillStyle = g1; C.fillRect(0, 0, W, 520);
  const g2 = C.createLinearGradient(0, H - 560, 0, H); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.5)'); C.fillStyle = g2; C.fillRect(0, H - 560, W, 560);
}
function cierreComenta(t, t0, palabra, sub = 'y te lo enseñamos en tu bar') {
  if (t < t0) return;
  const k = prog(t, t0 - 0.2, t0 + 0.3); C.fillStyle = `rgba(8,10,20,${0.88 * k})`; C.fillRect(0, 0, W, H);
  logoVisax(C, W / 2 - 70, 540, 140);
  C.save(); C.globalAlpha = k; C.fillStyle = '#fff'; C.textAlign = 'center'; C.font = `600 92px ${SERIF}`; C.fillText('Comenta', W / 2, 880); C.restore();
  if (t > t0 + 0.25) { C.save(); const s = rebote(clamp((t - t0 - 0.25) / 0.4)); C.translate(W / 2, 1030); C.scale(s, s);
    const tam = palabra.length > 7 ? 104 : 140; C.font = `900 ${tam}px ${SANS}`; const w = C.measureText(palabra).width + 90; C.shadowColor = 'rgba(0,0,0,0.4)'; C.shadowBlur = 40;
    C.fillStyle = grad(C, -w / 2, 0, w / 2, 0, [VX.cian, VX.azul, VX.violeta]); rr(C, -w / 2, -100, w, 200, 100); C.fill(); C.shadowBlur = 0;
    C.fillStyle = '#fff'; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(palabra, 0, 8); C.restore(); }
  C.save(); C.font = `italic 600 50px ${SERIF}`; C.fillStyle = '#7fb2ff'; C.textAlign = 'center'; C.globalAlpha = k; C.fillText(sub, W / 2, 1240); C.restore();
  const letras = Math.floor(clamp((t - t0 - 0.6) / 0.7) * palabra.length);
  cajaComentario(palabra.slice(0, letras), prog(t, t0 + 0.3, t0 + 0.6), Math.floor(t * 3) % 2 === 0);
}
function bocadillo(txt, X, Y, k, cola = 'abajo') {
  if (k <= 0) return; const s = rebote(clamp(k)); C.save(); C.translate(X, Y); C.scale(s, s); C.font = `700 40px ${SANS}`;
  const w = C.measureText(txt).width + 70, h = 96; C.shadowColor = 'rgba(0,0,0,0.35)'; C.shadowBlur = 28; C.fillStyle = '#fff'; rr(C, -w / 2, -h / 2, w, h, 48); C.fill();
  C.beginPath(); C.moveTo(-20, h / 2 - 4); C.lineTo(0, h / 2 + 26); C.lineTo(20, h / 2 - 4); C.fill(); C.shadowBlur = 0;
  C.fillStyle = '#111'; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(txt, 0, 2); C.restore();
}

// =====================================================================
// 5 VÍDEOS MÁS en el mismo bar: camarero, WiFi, reseñas, redes y carta
// =====================================================================
PANT.avisoEnviado = (x, w, h) => {
  x.fillStyle = '#0a0c16'; x.fillRect(0, 0, w, h); x.fillStyle = grad(x, w / 2 - 110, 300, w / 2 + 110, 520, [VX.cian, VX.violeta]); x.beginPath(); x.arc(w / 2, 420, 110, 0, 7); x.fill(); check(x, w / 2, 420, 4);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `600 48px ${SERIF}`; x.fillText('Aviso enviado', w / 2, 640); x.font = `500 30px ${SANS}`; x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillText('El camarero viene a tu mesa', w / 2, 700);
};
PANT.fotoPlato = (x, w, h, s) => {
  x.fillStyle = '#111'; x.fillRect(0, 0, w, h); x.fillStyle = '#6b4a35'; x.fillRect(0, 140, w, 760);
  x.fillStyle = '#f4f1ea'; x.beginPath(); x.arc(w / 2, 520, 230, 0, 7); x.fill(); x.fillStyle = '#e09a2b'; for (let i = 0; i < 9; i++) { x.beginPath(); x.ellipse(w / 2 - 110 + (i % 3) * 110, 440 + Math.floor(i / 3) * 80, 48, 30, i, 0, 7); x.fill(); }
  x.fillStyle = '#c0392b'; x.beginPath(); x.arc(w / 2 + 40, 470, 26, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.arc(w / 2, h - 120, 52, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 6; x.beginPath(); x.arc(w / 2, h - 120, 64, 0, 7); x.stroke();
  if (s.flash) { x.fillStyle = `rgba(255,255,255,${s.flash})`; x.fillRect(0, 0, w, h); }
};
PANT.editor = (x, w, h, s) => {
  x.fillStyle = '#0a0c16'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,255,255,0.55)'; x.font = `600 24px ${SANS}`; x.textAlign = 'left'; x.fillText('Carta digital · editar', 34, 80);
  x.fillStyle = '#fff'; x.font = `600 48px ${SERIF}`; x.fillText('Café con leche', 34, 170);
  x.fillStyle = 'rgba(255,255,255,0.06)'; rr(x, 30, 220, w - 60, 140, 24); x.fill(); x.fillStyle = 'rgba(255,255,255,0.55)'; x.font = `600 24px ${SANS}`; x.fillText('Precio', 60, 266);
  x.fillStyle = '#fff'; x.font = `800 52px ${SANS}`; x.fillText(s.precio || '1,30 €', 60, 330);
  const ok = s.guardado; x.fillStyle = ok ? '#16a34a' : grad(x, 30, 0, w - 30, 0, [VX.cian, VX.azul, VX.violeta]); rr(x, 30, 420, w - 60, 104, 52); x.fill(); x.fillStyle = '#fff'; x.font = `800 32px ${SANS}`; x.textAlign = 'center';
  if (ok) { check(x, w / 2 - 170, 472, 1.4); x.fillText('Guardado en todas las mesas', w / 2 + 20, 483); } else x.fillText('Guardar', w / 2, 483);
};
function pasos(lista, t, tiempos, X = W / 2, Y = 1000) {
  const k0 = prog(t, tiempos[0] - 0.2, tiempos[0] + 0.1); if (k0 <= 0) return; C.save(); C.globalAlpha = k0;
  const w = 820, h = 120 + lista.length * 110; C.shadowColor = 'rgba(0,0,0,0.45)'; C.shadowBlur = 50; C.fillStyle = 'rgba(255,255,255,0.97)'; rr(C, X - w / 2, Y - h / 2, w, h, 44); C.fill(); C.shadowBlur = 0;
  lista.forEach((l, i) => { const k = prog(t, tiempos[i], tiempos[i] + 0.15); if (k <= 0) return; const y = Y - h / 2 + 100 + i * 110; C.globalAlpha = k * k0;
    C.fillStyle = '#ff3b5c'; C.beginPath(); C.arc(X - w / 2 + 80, y, 34, 0, 7); C.fill(); C.fillStyle = '#fff'; C.font = `900 34px ${SANS}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(String(i + 1), X - w / 2 + 80, y + 2);
    C.fillStyle = '#111'; C.textAlign = 'left'; C.font = `700 44px ${SANS}`; C.fillText(l, X - w / 2 + 140, y + 2); });
  C.restore();
}
function cartaPapel(X, Y, rot, k, { precioViejo = '1,30 €', precioNuevo = null, manchas = 0 } = {}) {
  if (k <= 0) return; C.save(); C.translate(X, Y); C.rotate(rot); C.scale(lerp(0.6, 1, ease(clamp(k))), lerp(0.6, 1, ease(clamp(k)))); C.globalAlpha = clamp(k * 2);
  const w = 420, h = 600; C.shadowColor = 'rgba(0,0,0,0.4)'; C.shadowBlur = 30; C.fillStyle = '#f7f1e3'; C.fillRect(-w / 2, -h / 2, w, h); C.shadowBlur = 0;
  C.fillStyle = '#2b2118'; C.textAlign = 'center'; C.font = `600 50px ${SERIF}`; C.fillText('Carta', 0, -h / 2 + 80);
  [['Café con leche', precioViejo], ['Tostada', '2,50 €'], ['Zumo', '3,00 €'], ['Croissant', '1,80 €']].forEach(([n, p], i) => { const y = -h / 2 + 170 + i * 90; C.textAlign = 'left'; C.font = `500 30px ${SERIF}`; C.fillText(n, -w / 2 + 40, y); C.textAlign = 'right'; C.fillText(p, w / 2 - 40, y);
    if (i === 0 && precioNuevo) { C.strokeStyle = '#d6283a'; C.lineWidth = 5; C.beginPath(); C.moveTo(w / 2 - 140, y - 10); C.lineTo(w / 2 - 34, y - 10); C.stroke(); C.fillStyle = '#d6283a'; C.font = `italic 600 36px ${SERIF}`; C.fillText(precioNuevo, w / 2 - 30, y + 44); C.fillStyle = '#2b2118'; } });
  for (let i = 0; i < manchas; i++) { C.fillStyle = 'rgba(176,124,32,0.35)'; C.beginPath(); C.ellipse(-80 + i * 90, 120 - i * 60, 70 - i * 10, 50 - i * 6, i, 0, 7); C.fill(); }
  C.restore();
}
function enMesa(v, n) { const p = v.mesas[n].g.position; return { x: p.x, z: p.z, tj: v.mesas[n].tj }; }
function tomaTarjeta(tj, a) { const c = tj.userData.centro().toArray(); return { a, de: [c[0] + 1.3, c[1] + 1.2, c[2] + 1.9], a2: [c[0] + 1.0, c[1] + 0.9, c[2] + 1.45], mira: c, mira2: c, fov: 34 }; }
function tomaCara(m, a) { return { a, de: [m.x + 1.6, 3.4, m.z - 3.1], a2: [m.x + 0.9, 2.9, m.z - 2.3], mira: [m.x, 1.5, m.z + 0.9], mira2: [m.x, 1.6, m.z + 1.0] }; }
function tomaCaraCerca(m, a) { return { a, de: [m.x + 1.0, 2.4, m.z - 1.4], a2: [m.x + 0.7, 2.25, m.z - 1.0], mira: [m.x, 2.0, m.z + 0.9], mira2: [m.x, 2.05, m.z + 0.9], fov: 36 }; }
const APERTURA = { a: 0, de: [0.3, 30, 0.01], a2: [9, 13, 14], mira: [0, 0, 0], mira2: [-0.5, 0, 0.6], fov: 40 };
const FINAL_ANCHO = a => ({ a, de: [10, 11, 13], a2: [11.5, 15, 15.5], mira: [0, 0, 0], mira2: [0, 0, 0], fov: 38 });
const TOMA_BARRA = a => ({ a, de: [-1.8, 2.3, -2.4], a2: [-2.2, 2.1, -2.8], mira: [-3.0, 1.55, -4.15], mira2: [-3.0, 1.55, -4.15], fov: 34 });
const halosEn = (v, t, t0) => v.halos.forEach((h, i) => { h.material.opacity = t > t0 ? 0.85 * prog(t, t0 + i * 0.1, t0 + i * 0.1 + 0.25) : 0; });
const comunCapa = { arriba: true, subtitulos: subtitulosIOS };

// ---------- 1. Llamar al camarero ----------
V['camarero2'] = { ...comunCapa,
  async montar() {
    await montarBarBase(this, { mesaCliente: 8, ropaCliente: 'Male_Casual_Hoodie', tarjeta: () => placaCuadrada('campana') });
    const c = this.c = { mesa: cue('mesa'), espaldas: cue('espaldas'), brazo: cue('brazo'), problema: cue('problema'), ve: cue('ve'), ahora: cue('ahora'), toque: cue('toque'), tablet: cue('tablet'), llama: cue('llama'),
      ve2: cue('ve', 2), directo: cue('directo'), sin: cue('sin'), mismo: cue('mismo'), cero: cue('cero'), comenta: cue('comenta') };
    this.m = enMesa(this, 8);
    efectos = [['whoosh', 0.05], ['whoosh', c.espaldas - 0.6], ['whoosh', c.brazo - 0.1], ['tick', c.brazo + 0.8], ['tick', c.brazo + 1.6], ['hit', c.problema], ['pop', c.ve], ['whoosh', c.ahora - 0.1], ['tap', c.toque + 0.3],
      ['whoosh', c.tablet - 0.2], ['ding', c.llama], ['ding', c.llama + 0.35], ['whoosh', c.ve2 - 0.1], ['pop', c.sin], ['riser', c.mismo - 1.0], ['whoosh', c.mismo], ['hit', c.cero], ['whoosh', c.comenta - 0.1], ['pop', c.comenta + 0.5]];
    this.tomas = [APERTURA, { a: c.espaldas - 0.6, de: [1.6, 3.4, -1.2], a2: [2.4, 3.1, -0.6], mira: [5.2, 1.4, 3.6], mira2: [5.0, 1.4, 3.4] }, tomaCara(this.m, c.brazo - 0.1), tomaCaraCerca(this.m, c.problema),
      tomaTarjeta(this.m.tj, c.ahora - 0.1), TOMA_BARRA(c.tablet - 0.2), { a: c.ve2 - 0.1, de: [1.0, 4.8, -2.0], a2: [2.2, 4.3, -1.2], mira: [4.4, 1.2, 2.6], mira2: [4.6, 1.2, 2.8] }, FINAL_ANCHO(c.mismo)];
  },
  actualizar(t) {
    const c = this.c; this.cliente.animar(t > c.mesa - 0.3 && t < c.ahora + 0.2 ? 'Wave' : 'Idle');
    if (t < c.llama + 0.2) camareroCorre(this, t); else camareroVa(this, t, c.llama + 0.2, 1.8, [4.2, 2.6], Math.PI / 2, 'Idle');
    actualizarGente(this, t);
    movilEnTarjeta(this, t, this.m.tj, c.toque, c.ahora, c.tablet - 0.2, 'bloqueo', 'avisoEnviado');
    this.tablet.userData.pintar('avisos', t > c.llama - 0.3 && t < c.mismo ? { mesa: 4, pulso: Math.round((0.5 + 0.5 * Math.sin(t * 9)) * 4) / 4 } : {});
    this.anillo.material.opacity = t < c.ahora ? (0.55 + 0.45 * Math.sin(t * 8)) * prog(t, c.brazo - 0.2, c.brazo + 0.3) : 0;
    halosEn(this, t, c.mismo); this.desenfoque = camara2(t, this.tomas);
  },
  fx(t) { return fxBase(this, t, [this.c.problema, this.c.cero], [[this.c.llama, this.c.llama + 0.8]]); },
  capa(t) {
    const c = this.c; velos();
    if (entre(t, 0.2, c.brazo)) contadorIOS('reloj', 'Vie · 23:00', W - 50, 1620);
    if (entre(t, c.brazo, c.ahora)) { const s = Math.floor(lerp(60, 300, prog(t, c.brazo, c.ahora))); contadorIOS('crono', `0${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} con la mano arriba`, W - 50, 1620, 'rojo'); }
    if (entre(t, c.espaldas, c.brazo)) pildora('De espaldas', W / 2, 1460, entra(t, c.espaldas), { icono: 'usuario', tono: 'rojo' });
    if (entre(t, c.problema, c.ahora)) golpeIOS('¿El problema?', W / 2, 1180, prog(t, c.problema, c.problema + 0.18), 118);
    if (entre(t, c.ve, c.ahora)) pildora('No te ve', W / 2, 1380, entra(t, c.ve), { icono: 'mano', tono: 'rojo', tam: 60 });
    if (entre(t, c.ahora, c.tablet - 0.2)) pildora('En cada mesa', W / 2, 1460, entra(t, c.ahora), { icono: 'campana', tono: 'marca', tam: 48 });
    if (entre(t, c.llama, c.ve2)) pildora('Mesa 4 llama', W / 2, 1460, entra(t, c.llama), { icono: 'campana', tono: 'marca', tam: 56 });
    if (entre(t, c.ve2, c.sin)) pildora('Va directo', W / 2, 1460, entra(t, c.ve2), { icono: 'check', tono: 'verde', tam: 52 });
    if (entre(t, c.sin, c.mismo)) pildora('Sin levantar la mano', W / 2, 1460, entra(t, c.sin), { icono: 'mano', tono: 'azul', tam: 46 });
    if (entre(t, c.mismo, c.comenta)) contadorIOS('mano', `Manos en el aire: ${t < c.cero ? 1 : 0}`, W - 50, 1620, t < c.cero ? 'oscuro' : 'verde');
    if (t >= c.cero && t < c.comenta) golpeIOS('CERO', W / 2, 1180, prog(t, c.cero, c.cero + 0.18), 200, true);
    cierreComenta(t, c.comenta, 'CAMARERO');
  },
};

// ---------- 2. WiFi ----------
V['wifi'] = { ...comunCapa,
  async montar() {
    await montarBarBase(this, { mesaCliente: 2, ropaCliente: 'Female_Casual', tarjeta: () => placaCuadrada('wifi') });
    const c = this.c = { lleno: cue('lleno'), cual: cue('cual'), otra: cue('otra'), otra2: cue('otra', 2), problema: cue('problema'), contrasena: cue('contrasena', 2), ahora: cue('ahora'), acercan: cue('acercan'),
      android: cue('android'), iphone: cue('iphone'), copiar: cue('copiar'), nadie: cue('nadie'), nadie2: cue('nadie', 2), mismo: cue('mismo'), cero: cue('cero'), comenta: cue('comenta') };
    this.m = enMesa(this, 2); this.m6 = enMesa(this, 6); this.m1 = enMesa(this, 1);
    efectos = [['whoosh', 0.05], ['whoosh', c.lleno - 0.1], ['whoosh', c.cual - 0.1], ['pop', c.cual + 0.2], ['whoosh', c.otra - 0.1], ['pop', c.otra + 0.1], ['whoosh', c.otra2 - 0.1], ['pop', c.otra2 + 0.05], ['hit', c.problema], ['pop', c.contrasena],
      ['whoosh', c.ahora - 0.1], ['tap', c.acercan + 0.3], ['whoosh', c.android - 0.1], ['ding', c.android + 0.6], ['whoosh', c.iphone - 0.1], ['tap', c.copiar + 0.3], ['ding', c.copiar + 0.4], ['pop', c.nadie], ['pop', c.nadie2], ['riser', c.mismo - 1.0], ['whoosh', c.mismo], ['hit', c.cero], ['whoosh', c.comenta - 0.1], ['pop', c.comenta + 0.5]];
    this.tomas = [APERTURA, { a: c.lleno - 0.1, de: [3, 5.5, 9], a2: [2, 5, 8], mira: [0, 1, 1], mira2: [-0.4, 1, 1], fov: 40 }, tomaCara(this.m, c.cual - 0.1),
      { a: c.otra - 0.1, de: [3.2, 3.2, 0.2], a2: [2.6, 2.9, 0.9], mira: [1.8, 1.6, 4.5], mira2: [1.8, 1.6, 4.5] }, tomaCara(this.m1, c.otra2 - 0.05), tomaCaraCerca(this.m, c.problema),
      tomaTarjeta(this.m.tj, c.ahora - 0.1), { a: c.nadie - 0.1, de: [6, 4.5, 6], a2: [4, 4, 6], mira: [0, 1, 1], mira2: [0, 1, 1] }, FINAL_ANCHO(c.mismo)];
  },
  actualizar(t) {
    const c = this.c; camareroCorre(this, t); actualizarGente(this, t);
    movilEnTarjeta(this, t, this.m.tj, c.acercan, c.ahora, c.nadie - 0.1, 'bloqueo', 'wifiAndroid', { conectado: t > c.acercan + 0.6 });
    halosEn(this, t, c.mismo); this.desenfoque = camara2(t, this.tomas);
  },
  fx(t) { return fxBase(this, t, [this.c.problema, this.c.cero]); },
  capa(t) {
    const c = this.c; velos();
    if (entre(t, 0.2, c.cual)) contadorIOS('reloj', 'Sáb · 14:00', W - 50, 1620);
    if (entre(t, c.cual, c.ahora)) contadorIOS('usuario', `Veces preguntada: ${t < c.otra ? 1 : t < c.otra2 ? 2 : 3}`, W - 50, 1620, 'rojo');
    const bur = (n, t0) => { const p = proyectar(new THREE.Vector3(n.x, 3.0, n.z + 0.9)); bocadillo('¿Contraseña del WiFi?', clamp(p[0], 300, W - 300), clamp(p[1], 600, 1250), entra(t, t0)); };
    if (entre(t, c.cual, c.otra - 0.1)) bur(this.m, c.cual + 0.15);
    if (entre(t, c.otra, c.otra2 - 0.05)) { const p = proyectar(new THREE.Vector3(1.8, 3.0, 4.2)); bocadillo('¿Y la del WiFi?', clamp(p[0], 300, W - 300), clamp(p[1], 600, 1250), entra(t, c.otra + 0.05)); }
    if (entre(t, c.otra2, c.problema)) bur(this.m1, c.otra2 + 0.05);
    if (entre(t, c.problema, c.ahora)) golpeIOS('¿El problema?', W / 2, 1180, prog(t, c.problema, c.problema + 0.18), 118);
    if (entre(t, c.contrasena, c.ahora)) pildora('La contraseña', W / 2, 1380, entra(t, c.contrasena), { icono: 'usuario', tono: 'rojo', tam: 58 });
    if (entre(t, c.ahora, c.acercan)) pildora('En cada mesa', W / 2, 1460, entra(t, c.ahora), { icono: 'nfc', tono: 'marca', tam: 48 });
    if (entre(t, c.android - 0.1, c.nadie)) {
      const kin = entra(t, c.android - 0.1, 0.45);
      movil2D(lerp(-400, 300, kin), 1020, 0.5, -0.07, 'wifiAndroid', { conectado: t > c.android + 0.5 });
      pildora('Android: se conecta solo', 300, 1440, entra(t, c.android + 0.3), { icono: 'check', tono: 'verde', tam: 32 });
      if (t > c.iphone - 0.1) { const k2 = entra(t, c.iphone - 0.1, 0.45); movil2D(lerp(W + 400, 780, k2), 1020, 0.5, 0.07, 'wifiIphone', { copiada: t > c.copiar + 0.35 });
        pildora('iPhone: botón para copiar', 780, 1440, entra(t, c.iphone + 0.3), { icono: 'check', tono: 'azul', tam: 32 }); }
    }
    if (entre(t, c.nadie, c.nadie2)) pildora('Nadie pregunta', W / 2, 1460, entra(t, c.nadie), { icono: 'check', tono: 'verde', tam: 52 });
    if (entre(t, c.nadie2, c.mismo)) pildora('Nadie teclea', W / 2, 1460, entra(t, c.nadie2), { icono: 'check', tono: 'verde', tam: 52 });
    if (entre(t, c.mismo, c.comenta)) contadorIOS('usuario', `Veces preguntada: ${t < c.cero ? 3 : 0}`, W - 50, 1620, t < c.cero ? 'oscuro' : 'verde');
    if (t >= c.cero && t < c.comenta) golpeIOS('CERO', W / 2, 1180, prog(t, c.cero, c.cero + 0.18), 200, true);
    cierreComenta(t, c.comenta, 'WIFI', 'y te lo dejamos listo');
  },
};

// ---------- 3. Reseñas de Google ----------
V['resenas'] = { ...comunCapa,
  async montar() {
    await montarBarBase(this, { mesaCliente: 2, ropaCliente: 'Female_Formal' });
    // la pareja de la mesa 2 se levanta y se va; comida en la mesa
    this.pareja = [this.cliente]; const silla2 = this.mesas[2].sillas[1].getWorldPosition(new THREE.Vector3());
    const otro = await personaGL('Male_Casual_2', { sentada: true, desfase: 0.7 }); otro.sentar(silla2.x, silla2.z + 0.15, 0); mundo.add(otro.holder); this.pareja.push(otro);
    this.mesas[2].g.add(await (async () => { const g = new THREE.Group(); const f = (await new GLTFLoader().loadAsync('./modelos/restaurante/food_dinner.gltf')).scene.clone(true); f.scale.setScalar(0.45); f.position.set(-0.25, 1.0, -0.2); g.add(f); return g; })());
    this.expo = expositorL('google'); this.expo.scale.setScalar(0.5); this.expo.position.set(-1.25, 1.0, -3.95); mundo.add(this.expo);
    this.pagadora = await personaGL('Female_Casual', { anim: 'Idle', desfase: 2 }); this.pagadora.holder.position.set(-1.25, 0, -2.95); this.pagadora.holder.rotation.y = Math.PI; mundo.add(this.pagadora.holder);
    const c = this.c = { comido: cue('comido'), van: cue('van'), resena: cue('resena'), problema: cue('problema'), cuesta: cue('cuesta'), abrir: cue('abrir'), buscar: cue('buscar'), bajar: cue('bajar'), encontrar: cue('encontrar'),
      calle: cue('calle'), ahora: cue('ahora'), toque: cue('toque'), ficha: cue('ficha'), valorar: cue('valorar'), sin: cue('sin', 2), sin2: cue('sin', 3), mismo: cue('mismo'), toque2: cue('toque', 2), comenta: cue('comenta') };
    this.m = enMesa(this, 2);
    efectos = [['pop', 0.3], ['whoosh', c.van - 0.1], ['hit', c.problema], ['tick', c.abrir], ['tick', c.buscar], ['tick', c.bajar], ['tick', c.encontrar], ['whoosh', c.calle - 0.1], ['whoosh', c.ahora - 0.1], ['tap', c.toque + 0.3],
      ['whoosh', c.ficha - 0.1], ['tick', c.valorar + 0.1], ['tick', c.valorar + 0.25], ['tick', c.valorar + 0.4], ['tick', c.valorar + 0.55], ['ding', c.valorar + 0.7], ['pop', c.sin], ['pop', c.sin2], ['riser', c.mismo - 1.0], ['whoosh', c.mismo], ['hit', c.toque2], ['whoosh', c.comenta - 0.1], ['pop', c.comenta + 0.5]];
    this.tomas = [{ a: 0, de: [0.2, 3.2, -3.0], a2: [-0.6, 2.7, -2.3], mira: [-1.6, 1.2, 0.2], mira2: [-1.6, 1.2, 0.2] }, { a: c.van - 0.1, de: [-1.5, 4.2, 4.5], a2: [-3.0, 3.8, 4.2], mira: [-3.5, 1.4, 0.8], mira2: [-6.0, 1.4, 0.8] },
      { a: c.problema, de: [4, 7, 9], a2: [3.5, 6.5, 8.5], mira: [0, 1, 0], mira2: [0, 1, 0] }, { a: c.calle - 0.1, de: [-2.5, 3.6, 4.5], a2: [-3.2, 3.3, 3.8], mira: [-7, 1.4, 0.8], mira2: [-7.2, 1.4, 0.8] },
      { a: c.ahora - 0.1, de: [0.6, 2.7, -0.9], a2: [0.0, 2.4, -1.5], mira: [-1.3, 1.4, -4.0], mira2: [-1.3, 1.4, -4.0], fov: 36 }, FINAL_ANCHO(c.mismo)];
  },
  actualizar(t) {
    const c = this.c; camareroCorre(this, t);
    // la pareja: sentada hasta «van», luego anda hacia la puerta (x=-8, z=0.8)
    this.pareja.forEach((p, i) => { if (t < c.van) return; p.sentada = false; const k = prog(t, c.van + i * 0.2, c.calle);
      const x0 = -1.6, z0 = i ? -1.2 : 0.6; p.holder.position.set(lerp(x0, -7.6, k), 0, lerp(z0, 0.8 + i * 0.6, k)); p.holder.rotation.y = -Math.PI / 2; p.animar(k < 1 ? 'Walk' : 'Idle'); p.holder.visible = k < 1; });
    actualizarGente(this, t); this.pareja[1].actualizar(t); this.pagadora.actualizar(t);
    movilEnTarjeta(this, t, this.expo, c.toque, c.ahora, c.ficha - 0.1, 'bloqueo', 'resenaG', { llenas: 0 });
    halosEn(this, t, c.mismo); this.desenfoque = camara2(t, this.tomas);
  },
  fx(t) { return fxBase(this, t, [this.c.problema, this.c.toque2]); },
  capa(t) {
    const c = this.c; velos();
    if (entre(t, c.comido, c.van)) pildora('Han comido de lujo', W / 2, 1460, entra(t, c.comido), { icono: 'check', tono: 'verde', tam: 48 });
    if (entre(t, c.resena, c.problema)) pildora('Sin dejar reseña', W / 2, 1460, entra(t, c.resena), { icono: 'usuario', tono: 'rojo', tam: 50 });
    if (entre(t, c.problema, c.abrir)) golpeIOS('¿El problema?', W / 2, 1180, prog(t, c.problema, c.problema + 0.18), 118);
    if (entre(t, c.abrir - 0.2, c.ahora)) pasos(['Abrir Google', 'Buscar el bar', 'Bajar…', 'Encontrar el botón'], t, [c.abrir, c.buscar, c.bajar, c.encontrar], W / 2, 1060);
    if (entre(t, c.calle, c.ahora)) pildora('Y ya están en la calle', W / 2, 1560, entra(t, c.calle), { icono: 'usuario', tono: 'rojo', tam: 44 });
    if (entre(t, c.ahora, c.toque)) pildora('Junto a la caja', W / 2, 1460, entra(t, c.ahora), { icono: 'nfc', tono: 'marca', tam: 48 });
    if (entre(t, c.ficha - 0.1, c.mismo)) { const kin = entra(t, c.ficha - 0.1, 0.5); const ll = t > c.valorar ? Math.min(5, Math.floor((t - c.valorar) / 0.15) + 1) : 0;
      movil2D(lerp(W + 400, 700, kin), 1040, 0.6, lerp(0.2, 0.05, clamp(kin)), 'resenaG', { llenas: ll, texto: t > c.sin ? '¡Todo buenísimo!' : '' }); }
    if (entre(t, c.sin, c.sin2)) pildora('Sin buscar nada', 330, 1640, entra(t, c.sin), { icono: 'check', tono: 'azul', tam: 40 });
    if (entre(t, c.sin2, c.mismo)) { pildora('Sin buscar nada', 330, 1640, 1, { icono: 'check', tono: 'azul', tam: 40 }); pildora('Sin apps', 330, 1520, entra(t, c.sin2), { icono: 'check', tono: 'azul', tam: 40 }); }
    if (entre(t, c.mismo, c.comenta)) contadorIOS('check', `Pasos: ${t < c.toque2 ? 4 : 1}`, W - 50, 1620, t < c.toque2 ? 'oscuro' : 'verde');
    if (t >= c.toque2 && t < c.comenta) golpeIOS('A UN TOQUE', W / 2, 1180, prog(t, c.toque2, c.toque2 + 0.18), 130, true);
    cierreComenta(t, c.comenta, 'RESEÑAS');
  },
};

// ---------- 4. Redes sociales ----------
V['redes2'] = { ...comunCapa,
  async montar() {
    await montarBarBase(this, { mesaCliente: 5, ropaCliente: 'Female_Casual', tarjeta: () => expositorL('instagram') });
    const f = (await new GLTFLoader().loadAsync('./modelos/restaurante/food_dinner.gltf')).scene.clone(true); f.scale.setScalar(0.45); f.position.set(-0.25, 1.0, 0.35); this.mesas[5].g.add(f);
    const c = this.c = { foto: cue('foto'), suben: cue('suben'), etiquetan: cue('etiquetan'), buscar: cue('buscar'), letra: cue('letra'), problema: cue('problema'), encontraros: cue('encontraros'), ahora: cue('ahora'), toque: cue('toque'),
      perfil: cue('perfil'), seguir: cue('seguir'), listo: cue('listo'), instagram: cue('instagram', 2), mismo: cue('mismo'), seguiros: cue('seguiros'), comenta: cue('comenta') };
    this.m = enMesa(this, 5);
    efectos = [['tick', c.foto + 0.1], ['pop', c.suben], ['whoosh', c.etiquetan - 0.1], ['tick', c.buscar + 0.1], ['tick', c.buscar + 0.3], ['tick', c.buscar + 0.5], ['hit', c.problema], ['pop', c.encontraros], ['whoosh', c.ahora - 0.1], ['tap', c.toque + 0.3],
      ['whoosh', c.perfil - 0.1], ['tap', c.seguir + 0.1], ['ding', c.seguir + 0.2], ['pop', c.listo], ['pop', c.instagram], ['pop', c.instagram + 0.3], ['pop', c.instagram + 0.6], ['riser', c.mismo - 1.0], ['whoosh', c.mismo], ['hit', c.seguiros], ['whoosh', c.comenta - 0.1], ['pop', c.comenta + 0.5]];
    this.tomas = [{ a: 0, de: [-0.4, 3.2, 1.0], a2: [-0.9, 2.8, 1.6], mira: [-1.6, 1.1, 3.4], mira2: [-1.6, 1.1, 3.4] }, { a: c.etiquetan - 0.1, de: [-0.2, 3.2, 0.6], a2: [-0.8, 2.9, 1.2], mira: [-1.6, 1.6, 4.3], mira2: [-1.6, 1.6, 4.3] },
      { a: c.problema, de: [-0.6, 2.4, 1.9], a2: [-0.9, 2.25, 2.3], mira: [-1.6, 2.0, 4.2], mira2: [-1.6, 2.05, 4.2], fov: 36 }, tomaTarjeta(this.m.tj, c.ahora - 0.1), FINAL_ANCHO(c.mismo)];
  },
  actualizar(t) {
    const c = this.c; camareroCorre(this, t); actualizarGente(this, t);
    movilEnTarjeta(this, t, this.m.tj, c.toque, c.ahora, c.perfil - 0.1, 'bloqueo', 'instagram', {});
    halosEn(this, t, c.mismo); this.desenfoque = camara2(t, this.tomas);
  },
  fx(t) { const f = fxBase(this, t, [this.c.problema, this.c.seguiros]); const d = t - this.c.foto; if (d > 0 && d < 0.3) f.flash = Math.max(f.flash, 0.7 * (1 - d / 0.3)); return f; },
  capa(t) {
    const c = this.c; velos();
    if (t < c.etiquetan) { const kin = entra(t, 0, 0.4); movil2D(lerp(W + 400, 720, kin), 1050, 0.55, 0.06, 'fotoPlato', { flash: entre(t, c.foto, c.foto + 0.3) ? 0.8 : 0 }); }
    if (entre(t, c.suben, c.etiquetan)) pildora('Subida', 300, 1500, entra(t, c.suben), { icono: 'check', tono: 'verde', tam: 44 });
    if (entre(t, c.buscar - 0.2, c.problema)) { const kin = entra(t, c.buscar - 0.2, 0.4); const txt = 'bar la esq'.slice(0, Math.floor(clamp((t - c.buscar) / 0.9) * 10)); movil2D(lerp(W + 400, 720, kin), 1050, 0.55, 0.06, 'buscarIG', { txt }); }
    if (entre(t, c.letra, c.problema)) pildora('Letra a letra…', 330, 1500, entra(t, c.letra), { icono: 'usuario', tono: 'rojo', tam: 44 });
    if (entre(t, c.problema, c.ahora)) golpeIOS('¿El problema?', W / 2, 1180, prog(t, c.problema, c.problema + 0.18), 118);
    if (entre(t, c.encontraros, c.ahora)) pildora('Encontraros', W / 2, 1380, entra(t, c.encontraros), { icono: 'usuario', tono: 'rojo', tam: 58 });
    if (entre(t, c.ahora, c.toque)) pildora('En cada mesa', W / 2, 1460, entra(t, c.ahora), { icono: 'nfc', tono: 'marca', tam: 48 });
    if (entre(t, c.perfil - 0.1, c.mismo)) { const kin = entra(t, c.perfil - 0.1, 0.5); movil2D(lerp(W + 400, 700, kin), 1040, 0.6, lerp(0.2, 0.05, clamp(kin)), 'instagram', { siguiendo: t > c.seguir + 0.15, onda: entre(t, c.seguir, c.seguir + 0.5) ? Math.round(prog(t, c.seguir, c.seguir + 0.5) * 8) / 8 : 0 }); }
    if (entre(t, c.listo, c.instagram)) pildora('Listo', 280, 1500, entra(t, c.listo), { icono: 'check', tono: 'verde', tam: 54 });
    if (entre(t, c.instagram, c.mismo)) ['Instagram', 'TikTok', 'Facebook'].forEach((n, i) => pildora(n, 260, 760 + i * 140, entra(t, c.instagram + i * 0.3), { tono: 'marca', tam: 42 }));
    if (t >= c.seguiros && t < c.comenta) golpeIOS('A UN TOQUE', W / 2, 1180, prog(t, c.seguiros, c.seguiros + 0.18), 130, true);
    cierreComenta(t, c.comenta, 'REDES');
  },
};

// ---------- 5. Carta digital ----------
V['carta'] = { ...comunCapa, estilo: 'comic',
  async montar() {
    await montarBarBase(this, { mesaCliente: 7, ropaCliente: 'Male_Casual_Hoodie' });
    const c = this.c = { sube: cue('sube'), reimprimir: cue('reimprimir'), otra: cue('otra'), mesas: cue('mesas'), manchadas: cue('manchadas'), problema: cue('problema'), papel: cue('papel'), ahora: cue('ahora'), toque: cue('toque'),
      alergenos: cue('alergenos'), cambia: cue('cambia'), digital: cue('digital'), todas: cue('todas', 2), mismo: cue('mismo'), cero: cue('cero'), comenta: cue('comenta') };
    this.m = enMesa(this, 7);
    efectos = [['whoosh', 0.05], ['pop', c.sube + 0.2], ['pop', c.reimprimir], ['pop', c.reimprimir + 0.25], ['pop', c.reimprimir + 0.5], ['hit', c.otra], ['pop', c.manchadas], ['hit', c.problema], ['pop', c.papel], ['whoosh', c.ahora - 0.1], ['tap', c.toque + 0.3],
      ['whoosh', c.toque + 0.6], ['whoosh', c.cambia - 0.1], ['tick', c.cambia + 0.4], ['tap', c.digital], ['ding', c.digital + 0.2], ['whoosh', c.todas - 0.2], ['ding', c.todas + 0.4], ['riser', c.mismo - 1.0], ['whoosh', c.mismo], ['hit', c.cero], ['whoosh', c.comenta - 0.1], ['pop', c.comenta + 0.5]];
    this.tomas = [{ a: 0, de: [6, 5, 8], a2: [4.5, 4.4, 7], mira: [0, 1, 1], mira2: [-0.5, 1, 1], fov: 40 }, { a: c.mesas - 0.1, de: [-2.8, 3.4, 0.6], a2: [-3.4, 3.0, 1.2], mira: [-5, 1.2, 3.3], mira2: [-5, 1.2, 3.3] },
      tomaCaraCerca(this.m, c.problema), tomaTarjeta(this.m.tj, c.ahora - 0.1), TOMA_BARRA(c.cambia - 0.1),
      { a: c.todas - 0.25, de: [0, 36, 0.01], a2: [0, 33, 0.01], mira: [0, 0, 0], mira2: [0, 0, 0], up: [1, 0, 0], fov: 38, barrido: 0.35 }, FINAL_ANCHO(c.mismo)];
  },
  actualizar(t) {
    const c = this.c; camareroCorre(this, t); actualizarGente(this, t);
    movilEnTarjeta(this, t, this.m.tj, c.toque, c.ahora, c.cambia - 0.1, 'bloqueo', 'cartaCafe', {});
    this.halos.forEach((h, i) => { h.material.opacity = entre(t, c.todas, c.comenta) ? 0.85 * prog(t, c.todas + i * 0.08, c.todas + i * 0.08 + 0.2) : 0; });
    this.desenfoque = camara2(t, this.tomas);
  },
  fx(t) { return fxBase(this, t, [this.c.otra, this.c.problema, this.c.cero]); },
  capa(t) {
    const c = this.c; velos();
    if (entre(t, 0.1, c.sube)) contadorIOS('reloj', 'Lun · 08:30', W - 50, 1620);
    if (entre(t, c.sube, c.problema)) {
      cartaPapel(W / 2 - 120, 1000, -0.12, entra(t, c.reimprimir + 0.5, 0.4)); cartaPapel(W / 2 + 120, 990, 0.1, entra(t, c.reimprimir + 0.25, 0.4));
      cartaPapel(W / 2, 980, -0.02, entra(t, c.sube, 0.4), { precioNuevo: t > c.sube + 0.3 ? '1,50 €' : null, manchas: t > c.manchadas ? Math.min(3, 1 + Math.floor((t - c.manchadas) / 0.2)) : 0 });
    }
    if (entre(t, c.reimprimir, c.otra)) pildora('Reimprimir todas', W / 2, 1460, entra(t, c.reimprimir), { icono: 'recibo', tono: 'rojo', tam: 50 });
    if (entre(t, c.otra, c.manchadas)) golpeIOS('OTRA VEZ', W / 2, 1460, prog(t, c.otra, c.otra + 0.18), 120);
    if (entre(t, c.manchadas, c.problema)) pildora('Manchadas de aceite', W / 2, 1460, entra(t, c.manchadas), { icono: 'usuario', tono: 'rojo', tam: 46 });
    if (entre(t, c.problema, c.ahora)) golpeIOS('¿El problema?', W / 2, 1180, prog(t, c.problema, c.problema + 0.18), 118);
    if (entre(t, c.papel, c.ahora)) pildora('El papel', W / 2, 1380, entra(t, c.papel), { icono: 'recibo', tono: 'rojo', tam: 60 });
    if (entre(t, c.ahora, c.toque)) pildora('En cada mesa', W / 2, 1460, entra(t, c.ahora), { icono: 'nfc', tono: 'marca', tam: 48 });
    if (entre(t, c.toque + 0.4, c.cambia)) { const kin = entra(t, c.toque + 0.4, 0.5); movil2D(lerp(W + 400, 720, kin), 1040, 0.6, lerp(0.2, 0.05, clamp(kin)), 'cartaCafe', {});
      if (t > c.alergenos - 0.4) pildora('Con fotos y alérgenos', 330, 1660, entra(t, c.alergenos - 0.4), { icono: 'check', tono: 'azul', tam: 38 }); }
    if (entre(t, c.cambia - 0.1, c.todas - 0.2)) { const kin = entra(t, c.cambia - 0.1, 0.45); movil2D(lerp(-400, 340, kin), 1040, 0.6, -0.06, 'editor', { precio: t > c.cambia + 0.4 ? '1,50 €' : '1,30 €', guardado: t > c.digital + 0.1 }); }
    if (entre(t, c.todas, c.mismo)) { etiquetaPlano('Todas las mesas', new THREE.Vector3(0, 2, 1.5), entra(t, c.todas + 0.2), 'marca', 'check');
      movil2D(lerp(W + 400, 760, entra(t, c.todas + 0.3, 0.45)), 1150, 0.42, 0.06, 'cartaCafe', { precio: '1,50 €', nuevo: true }); }
    if (entre(t, c.mismo, c.comenta)) contadorIOS('recibo', `Reimpresiones: ${t < c.cero ? '…' : 0}`, W - 50, 1620, t < c.cero ? 'oscuro' : 'verde');
    if (t >= c.cero && t < c.comenta) golpeIOS('CERO', W / 2, 1180, prog(t, c.cero, c.cero + 0.18), 200, true);
    cierreComenta(t, c.comenta, 'CARTA', 'y te la hacemos');
  },
};

// ---------- 6. Una mesa, una noche, cinco toques (todo combinado) ----------
V['noche'] = { ...comunCapa, estilo: 'neon',
  async montar() {
    await montarBarBase(this, { mesaCliente: 7, ropaCliente: 'Male_Casual_Hoodie' });
    const g7 = this.mesas[7].g;
    const pon = (obj, x, z, ry, s) => { obj.scale.setScalar(s); obj.position.set(x, 1.0, z); obj.rotation.y = ry; g7.add(obj); return obj; };
    this.oWifi = pon(placaCuadrada('wifi'), -0.42, 0.28, -0.35, 0.26);
    this.oCamp = pon(placaCuadrada('campana'), 0.5, -0.3, 0.6, 0.26);
    this.oIG = pon(expositorL('instagram'), -0.45, -0.32, -0.5, 0.28);
    this.oMenu = this.mesas[7].tj;
    this.expo = expositorL('google'); this.expo.scale.setScalar(0.5); this.expo.position.set(-1.25, 1.0, -3.95); mundo.add(this.expo);
    const silla = this.mesas[7].sillas[1].getWorldPosition(new THREE.Vector3());
    this.otra = await personaGL('Female_Formal', { sentada: true, desfase: 0.9 }); this.otra.sentar(silla.x, silla.z + 0.15, 0); mundo.add(this.otra.holder);
    const f = (await new GLTFLoader().loadAsync('./modelos/restaurante/food_dinner.gltf')).scene.clone(true); f.scale.setScalar(0.4); f.position.set(0.1, 1.0, 0.35); f.visible = false; g7.add(f); this.comida = f;
    const c = this.c = { mesa: cue('mesa'), noche: cue('noche'), cinco: cue('cinco'), media: cue('media'), primer: cue('primer'), segundo: cue('segundo'), carta: cue('carta'), piden: cue('piden'), barra: cue('barra'), cocina: cue('cocina'),
      cuarto: cue('cuarto'), ronda: cue('ronda'), tercer: cue('tercer'), tablet: cue('tablet'), llama: cue('llama'), foto: cue('foto'), cuarto2: cue('cuarto', 2), instagram: cue('instagram'), irse: cue('irse'), caja: cue('caja'),
      quinto: cue('quinto'), resena: cue('resena'), toques: cue('toques', 2), cero: cue('cero'), comenta: cue('comenta') };
    const mesa = [-5, 1.1, 3.3];
    efectos = [['whoosh', 0.05], ['pop', c.mesa + 0.1], ['pop', c.noche], ['pop', c.cinco], ['whoosh', c.media - 0.2], ['tap', c.primer + 0.3], ['ding', c.primer + 0.7], ['tap', c.segundo + 0.3], ['whoosh', c.carta], ['tick', c.carta + 0.5], ['tick', c.carta + 0.8],
      ['whoosh', c.barra - 0.15], ['ding', c.barra + 0.2], ['whoosh', c.cocina - 0.15], ['ding', c.cocina + 0.3], ['whoosh', c.cuarto - 0.1], ['tap', c.tercer + 0.3], ['whoosh', c.tablet - 0.15], ['ding', c.llama], ['buzz', c.llama + 0.1],
      ['whoosh', c.foto - 0.1], ['tick', c.foto + 0.15], ['tap', c.cuarto2 + 0.3], ['ding', c.instagram + 0.2], ['whoosh', c.irse - 0.1], ['tap', c.quinto + 0.2], ['ding', c.resena + 0.3], ['riser', c.toques - 1.0], ['hit', c.toques], ['hit', c.cero], ['whoosh', c.comenta - 0.1], ['pop', c.comenta + 0.5]];
    const mesaToma = (a, dx = 0) => ({ a, de: [-3.7 + dx, 3.0, 5.6], a2: [-4.0 + dx, 2.6, 5.1], mira: mesa, mira2: mesa, fov: 38 });
    this.tomas = [APERTURA, tomaCara(enMesa(this, 7), c.media - 0.2), mesaToma(c.primer - 0.1), mesaToma(c.segundo - 0.1, 0.5), TOMA_BARRA(c.barra - 0.15),
      { a: c.cocina - 0.15, de: [7.7, 3.95, -2.4], a2: [7.5, 3.8, -2.7], mira: [4.3, 1.7, -4.9], mira2: [4.4, 1.7, -5.0], fov: 52 },
      tomaCara(enMesa(this, 7), c.cuarto - 0.1), mesaToma(c.tercer - 0.1, 0.8), TOMA_BARRA(c.tablet - 0.15), mesaToma(c.foto - 0.1, -0.4),
      { a: c.irse - 0.1, de: [0.6, 3.0, 0.5], a2: [0.0, 2.6, -1.2], mira: [-1.3, 1.3, -3.6], mira2: [-1.3, 1.3, -3.8], fov: 38 }, FINAL_ANCHO(c.toques)];
  },
  actualizar(t) {
    const c = this.c;
    // camarero: corre; tras «llama» va a la mesa 7
    if (t < c.llama + 0.2) camareroCorre(this, t); else camareroVa(this, t, c.llama + 0.2, 1.8, [-3.8, 2.6], -Math.PI / 2, 'Idle');
    this.cliente.animar('Idle');
    // la pareja se levanta y va a la caja al irse
    [this.cliente, this.otra].forEach((p, i) => { if (t < c.irse) return; p.sentada = false; const k = prog(t, c.irse + i * 0.15, c.quinto - 0.2);
      const x0 = -5, z0 = i ? 2.4 : 4.2; p.holder.position.set(lerp(x0, -1.6 + i * 0.7, k), 0, lerp(z0, -2.9, k)); p.holder.rotation.y = k < 1 ? Math.atan2(-1.6 + i * 0.7 - x0, -2.9 - z0) : Math.PI; p.animar(k < 1 ? 'Walk' : 'Idle'); });
    actualizarGente(this, t); this.otra.actualizar(t);
    this.comida.visible = t > c.ronda;
    // el móvil toca cada cosa por turnos
    const turnos = [[this.oWifi, c.primer, c.primer - 0.2, c.segundo - 0.15, 'wifiAndroid', { conectado: true }], [this.oMenu, c.segundo, c.segundo - 0.2, c.barra - 0.15, 'cartaV', {}],
      [this.oCamp, c.tercer, c.tercer - 0.2, c.tablet - 0.15, 'avisoEnviado', {}], [this.oIG, c.cuarto2, c.cuarto2 - 0.2, c.irse - 0.1, 'instagram', {}], [this.expo, c.quinto, c.quinto - 0.2, c.toques - 0.1, 'resenaG', { llenas: 0 }]];
    const turno = turnos.find(([, , d, h]) => entre(t, d, h));
    if (turno) movilEnTarjeta(this, t, turno[0], turno[1], turno[2], turno[3], 'bloqueo', turno[4], turno[5]); else { this.mv.visible = false; this.on.userData.actualizar(t, 0, new THREE.Vector3(), new THREE.Vector3()); }
    const pulso = Math.round((0.5 + 0.5 * Math.sin(t * 8)) * 4) / 4;
    if (t < c.cuarto) this.tablet.userData.pintar('barra', t > c.barra ? { nuevo: true, detalle: '2 × Caña', estado: 'A SERVIR', pulso } : { nuevo: false });
    else this.tablet.userData.pintar('avisos', t > c.llama - 0.3 && t < c.irse ? { mesa: 7, pulso } : {});
    this.pantCocina.userData.pintar('cocina', t > c.cocina ? { nuevo: true, detalle: '1 × Patatas bravas · 1 × Croquetas', estado: 'EN MARCHA', pulso } : { nuevo: false });
    halosEn(this, t, c.toques); this.desenfoque = camara2(t, this.tomas);
  },
  fx(t) { const f = fxBase(this, t, [this.c.toques, this.c.cero], [[this.c.llama, this.c.llama + 0.8]]); const d = t - this.c.foto - 0.15; if (d > 0 && d < 0.3) f.flash = Math.max(f.flash, 0.7 * (1 - d / 0.3)); return f; },
  capa(t) {
    const c = this.c; velos();
    // gancho: 1 mesa · 1 noche · 5 toques
    if (t < c.media) { pildora('1 mesa', W / 2, 1300, entra(t, c.mesa), { tono: 'oscuro', tam: 60 }); pildora('1 noche', W / 2, 1440, entra(t, c.noche), { tono: 'oscuro', tam: 60 }); pildora('5 toques', W / 2, 1580, entra(t, c.cinco), { icono: 'nfc', tono: 'marca', tam: 60 }); }
    // reloj y contador de toques
    const hora = t < c.cuarto ? '21:30' : t < c.foto ? '22:15' : t < c.irse ? '22:45' : '23:20';
    if (entre(t, c.media, c.toques)) contadorIOS('reloj', hora, 300, 1620);
    const n = [c.primer, c.segundo, c.tercer, c.cuarto2, c.quinto].filter(x => t > x + 0.3).length;
    if (entre(t, c.media, c.toques) && n > 0) contadorIOS('nfc', `Toques: ${n}`, W - 50, 1620, 'marca');
    const etiqueta1 = (txt, t0, t1, ic, tono = 'marca') => { if (entre(t, t0, t1)) pildora(txt, W / 2, 1460, entra(t, t0), { icono: ic, tono, tam: 50 }); };
    etiqueta1('1 · WiFi', c.primer + 0.3, c.segundo, 'check');
    etiqueta1('2 · Carta y pedido', c.segundo + 0.3, c.barra, 'check');
    etiqueta1('A barra', c.barra, c.cocina, 'check', 'azul'); etiqueta1('A cocina', c.cocina, c.cuarto, 'cocina', 'azul');
    etiqueta1('3 · Llamar al camarero', c.tercer + 0.3, c.foto, 'campana');
    etiqueta1('4 · Instagram', c.cuarto2 + 0.3, c.irse, 'check');
    etiqueta1('5 · Reseña', c.quinto + 0.3, c.toques, 'check');
    // móviles 2D de cada toque
    if (entre(t, c.primer + 0.3, c.segundo - 0.1)) movil2D(lerp(W + 400, 760, entra(t, c.primer + 0.3, 0.45)), 1000, 0.5, 0.06, 'wifiAndroid', { conectado: t > c.primer + 0.7 });
    if (entre(t, c.carta - 0.1, c.barra - 0.15)) { const sel = t > c.carta + 0.4 ? Math.min(2, 1 + Math.floor((t - c.carta - 0.4) / 0.35)) : 0; movil2D(lerp(W + 400, 760, entra(t, c.carta - 0.1, 0.45)), 1000, 0.5, 0.06, 'cartaV', { sel, enviado: t > c.piden + 0.3 }); }
    if (entre(t, c.foto, c.cuarto2)) movil2D(lerp(W + 400, 760, entra(t, c.foto - 0.1, 0.4)), 1000, 0.5, 0.06, 'fotoPlato', { flash: entre(t, c.foto + 0.15, c.foto + 0.4) ? 0.8 : 0 });
    if (entre(t, c.instagram - 0.2, c.irse - 0.1)) movil2D(lerp(W + 400, 760, entra(t, c.instagram - 0.2, 0.45)), 1000, 0.5, 0.06, 'instagram', { siguiendo: t > c.instagram + 0.3 });
    if (entre(t, c.resena - 0.2, c.toques - 0.1)) { const ll = t > c.resena ? Math.min(5, Math.floor((t - c.resena) / 0.12) + 1) : 0; movil2D(lerp(W + 400, 760, entra(t, c.resena - 0.2, 0.45)), 1000, 0.5, 0.06, 'resenaG', { llenas: ll }); }
    if (entre(t, c.toques, c.cero)) golpeIOS('5 TOQUES', W / 2, 1180, prog(t, c.toques, c.toques + 0.18), 150, true);
    if (entre(t, c.cero, c.comenta)) golpeIOS('CERO ESPERAS', W / 2, 1180, prog(t, c.cero, c.cero + 0.18), 118, true);
    cierreComenta(t, c.comenta, 'MESA', 'y te lo enseñamos todo en tu bar');
  },
};
// ---------- 7. ¿Qué pasa en el medio segundo que tocas la tarjeta MENÚ? ----------
function tarjetaMenuRayos() {
  const g = tarjetaMenu(); const card = g.userData.card;
  const pts = []; const w2 = 0.25, h2 = 0.38;
  for (let v = 0; v < 6; v++) { const d = v * 0.028; pts.push(new THREE.Vector3(-w2 + d, h2 - d, 0), new THREE.Vector3(w2 - d, h2 - d, 0), new THREE.Vector3(w2 - d, -h2 + d, 0), new THREE.Vector3(-w2 + d + 0.028, -h2 + d, 0)); }
  const curva = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.02); const geo = new THREE.TubeGeometry(curva, 900, 0.0045, 6, false);
  const mat = new THREE.MeshStandardMaterial({ color: '#d98a3a', emissive: '#ff9a3c', emissiveIntensity: 0, metalness: 0.9, roughness: 0.25, transparent: true, opacity: 0 });
  const antena = new THREE.Mesh(geo, mat); antena.position.z = 0.004; card.add(antena);
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.012), new THREE.MeshStandardMaterial({ color: '#111', emissive: VX.cian, emissiveIntensity: 0, transparent: true, opacity: 0 })); chip.position.set(0, -0.12, 0.006); card.add(chip);
  const brillo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBokeh.tex, color: VX.cian, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); brillo.scale.set(0.45, 0.45, 1); chip.add(brillo);
  const n = geo.index.count;
  g.userData.rayosX = (k, dibujo = 1, glow = 0) => {
    card.material.forEach((m, i) => { m.transparent = k > 0; m.opacity = 1 - (i === 4 ? 0.55 : 0.75) * k; m.depthWrite = k < 0.5; }); antena.visible = chip.visible = k > 0;
    mat.opacity = k; mat.emissiveIntensity = 0.4 + 2.2 * glow; geo.setDrawRange(0, Math.floor(n * dibujo / 6) * 6);
    chip.material.opacity = k; chip.material.emissiveIntensity = 3 * glow; brillo.material.opacity = 0.9 * glow * k;
  };
  g.userData.chipMundo = () => chip.getWorldPosition(new THREE.Vector3());
  // pulsos de corriente que recorren la espiral
  const pul = [0, 1, 2, 3, 4, 5].map(() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBokeh.tex, color: '#fff3c0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); sp.scale.set(0.07, 0.07, 1); card.add(sp); return sp; });
  g.userData.pulsos = (t, k) => pul.forEach((sp, i) => { const f = (t * 0.22 + i / pul.length) % 1; sp.position.copy(curva.getPointAt(f)); sp.position.z = 0.012; sp.material.opacity = k * 0.95; });
  return g;
}
V['menu'] = { ...comunCapa, estilo: 'holograma',
  async montar() {
    await montarBarBase(this, { mesaCliente: 7, ropaCliente: 'Male_Casual_Hoodie', extraMesa: n => (n === 7 ? tarjetaMenuRayos() : null) });
    const c = this.c = { medio: cue('medio'), congelar: cue('congelar'), campo: cue('campo'), antena: cue('antena'), energia: cue('energia'), chip: cue('chip'), pilas: cue('pilas'), direccion: cue('direccion'),
      mesa: cue('mesa'), carta: cue('carta'), siete: cue('siete'), segundo: cue('segundo', 2), pegatina: cue('pegatina'), comenta: cue('comenta') };
    this.m = enMesa(this, 7); this.pk = paquete('carta · mesa 7'); this.pk.scale.setScalar(0.6);
    const cc = this.m.tj.userData.centro().toArray();
    efectos = [['whoosh', 0.05], ['tap', c.medio + 0.5], ['riser', c.congelar - 0.6], ['hit', c.congelar + 0.2], ['whoosh', c.campo - 0.1], ['whoosh', c.antena - 0.15], ['tick', c.energia], ['ding', c.chip + 0.1], ['pop', c.pilas],
      ['whoosh', c.direccion - 0.1], ['pop', c.mesa], ['whoosh', c.carta - 0.1], ['ding', c.siete], ['hit', c.segundo], ['pop', c.pegatina], ['whoosh', c.comenta - 0.1], ['pop', c.comenta + 0.5]];
    this.tomas = [{ a: 0, de: [-2.0, 3.6, 0.6], a2: [-2.8, 3.0, 1.4], mira: [-5, 1.3, 3.6], mira2: [-5, 1.2, 3.5] }, tomaTarjeta(this.m.tj, c.medio + 0.2),
      { a: c.campo - 0.1, de: [cc[0] + 0.75, cc[1] + 0.35, cc[2] + 1.05], a2: [cc[0] + 0.55, cc[1] + 0.25, cc[2] + 0.85], mira: cc, mira2: cc, fov: 30 },
      { a: c.antena - 0.1, de: [cc[0] + 0.25, cc[1] + 0.1, cc[2] + 0.8], a2: [cc[0] + 0.12, cc[1] + 0.05, cc[2] + 0.62], mira: cc, mira2: cc, fov: 28 },
      { a: c.direccion - 0.1, de: [cc[0] + 0.9, cc[1] + 0.5, cc[2] + 1.3], a2: [cc[0] + 0.7, cc[1] + 0.4, cc[2] + 1.1], mira: [cc[0], cc[1] + 0.05, cc[2] + 0.1], mira2: [cc[0], cc[1] + 0.05, cc[2] + 0.1], fov: 32 },
      tomaTarjeta(this.m.tj, c.carta - 0.1), tomaCara(this.m, c.pegatina - 0.2)];
  },
  actualizar(t) {
    const c = this.c; camareroCorre(this, t); actualizarGente(this, t);
    const tj = this.m.tj, cen = tj.userData.centro();
    // el móvil se acerca y se queda «congelado» a 1 cm hasta que se abre la carta
    const k = ease(prog(t, c.medio + 0.4, c.congelar));
    const xr = prog(t, c.antena - 0.2, c.antena + 0.4) * (1 - prog(t, c.carta - 0.4, c.carta));
    this.mv.visible = t > c.medio + 0.4 && t < c.carta && xr < 0.6; this.mv.position.set(cen.x + lerp(0.1, -0.1, k), cen.y + lerp(0.3, 0.04, k), cen.z + lerp(0.7, 0.24, k)); this.mv.rotation.set(-0.1, 0.35, 0);
    tj.userData.rayosX(xr, prog(t, c.antena, c.energia + 0.3), t > c.chip ? 0.6 + 0.4 * Math.sin((t - c.chip) * 9) : 0);
    this.mv.userData.opacidad(1 - 0.85 * xr); this.mv.userData.pantalla('bloqueo', {});
    const lento = entre(t, c.congelar, c.carta) ? 0.25 : 1; // cámara lenta: las ondas van más despacio
    this.on.userData.actualizar(c.congelar + (t - c.congelar) * lento, entre(t, c.campo - 0.2, c.carta) ? 1 : 0, this.mv.userData.detras(), cen);
    this.pk.userData.mover(clamp((t - c.direccion) / 1.2), tj.userData.chipMundo(), this.mv.localToWorld(new THREE.Vector3(0, 0, 0.03)), 0.08);
    this.desenfoque = camara2(t, this.tomas);
  },
  fx(t) { return fxBase(this, t, [this.c.congelar + 0.2, this.c.segundo]); },
  capa(t) {
    const c = this.c; velos();
    // contador de tiempo congelado (arriba, como un cronómetro)
    const marcas = [[c.congelar, 0], [c.campo, 0.012], [c.antena, 0.05], [c.chip, 0.12], [c.direccion, 0.2], [c.carta, 0.48], [c.segundo, 0.5]];
    let s = 0; for (let i = 0; i < marcas.length - 1; i++) if (t >= marcas[i][0]) s = lerp(marcas[i][1], marcas[i + 1][1], clamp((t - marcas[i][0]) / (marcas[i + 1][0] - marcas[i][0])));
    if (entre(t, c.congelar, c.pegatina)) { C.save(); const kk = entra(t, c.congelar, 0.4); C.translate(W / 2, 470); C.scale(kk, kk); C.fillStyle = 'rgba(10,12,22,0.82)'; rr(C, -230, -70, 460, 140, 36); C.fill();
      C.strokeStyle = 'rgba(127,220,255,0.5)'; C.lineWidth = 3; rr(C, -230, -70, 460, 140, 36); C.stroke(); C.fillStyle = 'rgba(255,255,255,0.6)'; C.font = `700 22px ${SANS}`; C.textAlign = 'center'; C.fillText('TIEMPO CONGELADO', 0, -32);
      C.fillStyle = '#fff'; C.font = `900 74px ${SANS}`; C.fillText(`${s.toFixed(3).replace('.', ',')} s`, 0, 40); C.restore(); }
    if (entre(t, 0.3, c.congelar)) pildora('Toca para ver MENÚ', W / 2, 1460, entra(t, 0.3), { icono: 'nfc', tono: 'oscuro', tam: 46 });
    const paso = (txt, a, b, ic, tono = 'marca') => { if (entre(t, a, b)) pildora(txt, W / 2, 1480, entra(t, a), { icono: ic, tono, tam: 46 }); };
    paso('1 · Tu móvil crea un campo', c.campo, c.antena, 'nfc');
    paso('2 · Una antena en espiral', c.antena, c.chip, 'nfc');
    paso('3 · Enciende el chip', c.chip, c.pilas, 'check');
    paso('Sin pilas', c.pilas, c.direccion, 'check', 'rojo');
    paso('4 · Dirección + tu mesa', c.direccion, c.carta, 'recibo');
    if (entre(t, c.carta - 0.1, c.segundo)) { movil2D(lerp(W + 400, 730, entra(t, c.carta - 0.1, 0.5)) + lerp(0, 900, ease(prog(t, c.segundo - 0.35, c.segundo))), 1040, 0.6, 0.05, 'cartaV', {}); if (t > c.siete) pildora('Mesa 7', 330, 1500, entra(t, c.siete), { icono: 'check', tono: 'marca', tam: 56 }); }
    if (entre(t, c.segundo, c.pegatina)) golpeIOS('0,5 s', W / 2, 1420, prog(t, c.segundo, c.segundo + 0.18), 170, true);
    if (entre(t, c.pegatina, c.comenta)) golpeIOS('¿Una pegatina?', W / 2, 1180, prog(t, c.pegatina, c.pegatina + 0.18), 110);
    cierreComenta(t, c.comenta, 'MENÚ', 'y te la ponemos en tu bar');
  },
};
// ---------- 8. POV: eres el cliente (mundo juguete, primera persona, dos voces) ----------
PANT.chatBar = (x, w, h, s) => {
  x.fillStyle = '#0b141a'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#1f2c34'; x.fillRect(0, 0, w, 150); x.fillStyle = '#e0a826'; x.beginPath(); x.arc(70, 92, 34, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.font = `700 30px ${SANS}`; x.textAlign = 'left'; x.fillText('Manolo (Bar La Esquina)', 120, 86); x.fillStyle = 'rgba(255,255,255,0.55)'; x.font = `500 22px ${SANS}`; x.fillText('en línea', 120, 118);
  if (s.enviado) {
    const y0 = 420; x.fillStyle = '#005c4b'; rr(x, 130, y0, w - 160, 420, 22); x.fill();
    x.fillStyle = grad(x, 150, y0 + 20, w - 50, y0 + 300, ['#1b2a6b', '#4a2a8a']); rr(x, 150, y0 + 18, w - 200, 280, 16); x.fill();
    logoVisax(x, w / 2 - 20, y0 + 70, 90); x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.moveTo(w / 2 + 25, y0 + 190); x.lineTo(w / 2 + 25, y0 + 250); x.lineTo(w / 2 + 75, y0 + 220); x.fill();
    x.fillStyle = '#fff'; x.font = `600 28px ${SANS}`; x.fillText('Tío, mira esto', 156, y0 + 340); x.fillText('para el bar', 156, y0 + 378);
    x.fillStyle = '#53bdeb'; x.font = `700 22px ${SANS}`; x.textAlign = 'right'; x.fillText('22:41 ✓✓', w - 46, y0 + 404);
  }
  x.fillStyle = '#1f2c34'; rr(x, 20, h - 110, w - 40, 80, 40); x.fill(); x.fillStyle = 'rgba(255,255,255,0.4)'; x.font = `500 26px ${SANS}`; x.textAlign = 'left'; x.fillText('Mensaje', 60, h - 60);
};
PANT.comentaMesa = (x, w, h, s) => {
  x.fillStyle = grad(x, 0, 0, w, h, ['#0d1238', '#2a1460', '#0a0c16']); x.fillRect(0, 0, w, h);
  logoVisax(x, w / 2 - 60, 200, 120);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `600 64px ${SERIF}`; x.fillText('Comenta', w / 2, 470);
  const k = s.k ?? 1; x.save(); x.translate(w / 2, 590); x.scale(k, k); x.fillStyle = grad(x, -180, 0, 180, 0, [VX.cian, VX.azul, VX.violeta]); rr(x, -180, -75, 360, 150, 75); x.fill();
  x.fillStyle = '#fff'; x.font = `900 100px ${SANS}`; x.textBaseline = 'middle'; x.fillText('MESA', 0, 6); x.restore(); x.textBaseline = 'alphabetic';
  x.font = `italic 600 36px ${SERIF}`; x.fillStyle = '#7fb2ff'; x.fillText('y te lo enseñamos', w / 2, 760); x.fillText('en tu bar', w / 2, 806);
};
function relojMS(s) { s = Math.max(0, Math.floor(s)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function marcador(etiqueta, valor, color, k = 1) {
  C.save(); C.translate(W / 2, 168); C.scale(k, k); C.fillStyle = 'rgba(14,10,8,0.82)'; rr(C, -190, -64, 380, 128, 26); C.fill(); C.lineWidth = 5; C.strokeStyle = color; rr(C, -190, -64, 380, 128, 26); C.stroke();
  C.fillStyle = color; C.font = `800 24px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(etiqueta, 0, -32);
  C.fillStyle = '#fff'; C.font = `900 66px Inter, ${FUENTE}`; C.fillText(valor, 0, 20); C.restore();
}
V['pov'] = { ...comunCapa,
  async montar() {
    for (const [f, peso, estilo] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-ExtraBold.ttf', '800', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: estilo }); await ff.load(); document.fonts.add(ff); }
    scene.background = new THREE.Color('#1a120c'); scene.fog = null; pared.visible = suelo.visible = bokeh.visible = false;
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0;
    hemi.color.set('#fff1dc'); hemi.groundColor.set('#7a4a2a'); hemi.intensity = 1.25;
    const sol = new THREE.DirectionalLight('#ffe2b8', 1.5); sol.position.set(3, 9, 5); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 }); sol.shadow.bias = -0.0005; scene.add(sol);
    renderer.toneMappingExposure = 1.05; scene.add(cam); cam.rotation.order = 'YXZ';
    const r = construirRestaurante(scene, { pantalla3D, tpv, movil, tarjetaMenu, placaCuadrada }); Object.assign(this, r);
    const p = poblar(r.mundo, r.mesas); Object.assign(this, p);
    this.mv = movil('#20232c'); const h = manosPOV(cam, this.mv); this.D = h.D; this.I = h.I; this.colocarBrazo = h.colocarBrazo;
    this.on = ondas();
    this.canasMesa = [cana(), cana()]; this.canasMesa.forEach((c, i) => { c.position.set(-0.05 + i * 0.16, 0.79, -0.05 - i * 0.05); c.visible = false; r.mundo.add(c); });
    this.bravasMesa = bravas(); this.bravasMesa.position.set(0.05, 0.79, -0.6); this.bravasMesa.visible = false; r.mundo.add(this.bravasMesa);
    const c = this.c = { mano: cue('mano'), ahora: cue('ahora'), eso: cue('eso'), vale: cue('vale'), toco: cue('toco'), movil: cue('movil'), carta: cue('carta'), siete: cue('siete'), dos: cue('dos'),
      canas: cue('canas'), bravas: cue('bravas'), pedir: cue('pedir'), mesaK: cue('mesa', 3), marchando: cue('marchando'), llega: cue('llega'), caja: cue('caja'), confirma: cue('confirma'),
      canas2: cue('canas', 2), barra: cue('barra'), bravas2: cue('bravas', 2), cocina: cue('cocina'), quiero: cue('quiero'), toco2: cue('toco', 2), placa: cue('placa'), voy: cue('voy', 2),
      cero: cue('cero'), mandaselo: cue('mandaselo'), dueno: cue('dueno'), comenta: cue('comenta') };
    c.corte1 = c.pedir + 0.75; c.corte2 = c.quiero - 0.25;
    efectos = [['whoosh', 2.4], ['pop', c.ahora], ['whoosh', c.vale + 0.1], ['tap', c.movil + 0.1], ['ding', c.carta - 0.1], ['tick', c.canas], ['tick', c.bravas], ['pop', c.pedir + 0.1],
      ['whoosh', c.corte1 - 0.1], ['ding', c.corte1 + 0.15], ['buzz', c.corte1 + 0.2], ['tap', c.confirma + 0.1], ['ding', c.canas2], ['ding', c.bravas2 + 0.1], ['whoosh', c.cocina - 0.3],
      ['whoosh', c.corte2 - 0.1], ['tap', c.placa + 0.1], ['buzz', c.placa + 0.4], ['ding', c.placa + 0.4], ['whoosh', c.voy + 0.3], ['pop', c.cero + 0.3], ['whoosh', c.mandaselo - 0.2], ['pop', c.dueno + 0.3], ['hit', c.comenta]];
    this.ojo = new THREE.Vector3(0, 1.3, 0.42); this.musica = 'guitarra_bar'; this.volMusica = 0.42;
    this.tomasBarra = [
      { a: c.corte1, de: [-0.9, 1.85, -3.2], a2: [-1.3, 1.75, -3.7], mira: [-2.2, 1.35, -5.6], mira2: [-2.1, 1.35, -5.6], fov: 46, barrido: 0 },
      { a: c.llega - 0.1, de: [-1.55, 1.55, -4.45], a2: [-1.65, 1.5, -4.62], mira: [-1.85, 1.3, -5.2], mira2: [-1.85, 1.3, -5.2], fov: 40 },
      { a: c.canas2 - 0.2, de: [-3.9, 1.85, -4.05], a2: [-4.15, 1.8, -4.3], mira: [-4.7, 1.62, -5.25], mira2: [-4.7, 1.62, -5.25], fov: 44 },
      { a: c.bravas2 - 0.15, de: [1.9, 2.0, -4.2], a2: [2.2, 1.95, -4.6], mira: [2.8, 2.15, -6.6], mira2: [2.8, 2.1, -6.7], fov: 46 }];
  },
  moverCamarero(t) {
    const c = this.c, k = this.camarero; k.reset(); k.bandeja.visible = t < c.cero + 0.4; k.g.visible = true;
    const andarA = (de, a, t0, t1, vel = 1.6) => { const kk = clamp((t - t0) / (t1 - t0)); k.g.position.set(lerp(de[0], a[0], kk), 0, lerp(de[1], a[1], kk)); if (kk < 1 && kk > 0) { k.g.rotation.y = Math.atan2(a[0] - de[0], a[1] - de[1]); k.andar(t * vel, 1); } return kk; };
    if (t < c.eso + 0.9) { // cruza corriendo por delante
      andarA([4.8, -1.75], [-4.8, -1.75], 2.4, 6.9, 2.3); if (t < 2.4) k.g.visible = false;
      const mira = prog(t, c.ahora - 0.3, c.ahora) * (1 - prog(t, c.ahora + 0.9, c.ahora + 1.3)); k.cabeza.rotation.y = mira * 1.2;
      if (entre(t, c.ahora - 0.2, c.ahora + 1.0)) { k.bD.hombro.rotation.x = -2.6 * prog(t, c.ahora - 0.2, c.ahora + 0.1); k.bD.hombro.rotation.z = -0.3; k.hablar(t); }
    } else if (t < c.corte1 - 0.3) { k.g.visible = false;
    } else if (t < c.voy + 0.3) { // en la barra, detrás del mostrador
      k.g.position.set(-2.0, 0, -6.05); k.g.rotation.y = 0; k.respirar(t, 1);
      k.cabeza.rotation.x = entre(t, c.corte1, c.confirma + 0.6) ? 0.45 : 0; k.cabeza.rotation.y = entre(t, c.corte1, c.confirma + 0.6) ? -0.25 : 0;
      if (entre(t, c.mesaK, c.marchando + 0.8) || entre(t, c.voy - 0.05, c.voy + 0.9)) k.hablar(t);
      if (entre(t, c.confirma - 0.15, c.confirma + 0.5)) { k.bD.hombro.rotation.x = -1.2; k.bD.codo.rotation.x = -0.6; }
      if (t > c.placa + 0.4) { k.cabeza.rotation.y = 0.35; k.bD.hombro.rotation.x = -2.8 * prog(t, c.voy - 0.2, c.voy + 0.1); }
    } else { // va a nuestra mesa
      const k1 = andarA([-2.0, -6.05], [-0.75, -6.05], c.voy + 0.3, c.voy + 0.9, 1.8);
      if (k1 >= 1) andarA([-0.75, -6.05], [-0.42, -1.05], c.voy + 0.9, c.cero - 0.1, 1.8);
      if (t > c.cero - 0.1) { k.g.rotation.y = Math.atan2(this.ojo.x - k.g.position.x, this.ojo.z - k.g.position.z) - 0.2; k.respirar(t, 2);
        if (entre(t, c.cero - 0.1, c.cero + 0.5)) { k.bI.hombro.rotation.x = -1.1; k.bI.codo.rotation.x = -0.5; }
        if (t > c.cero + 0.6) { k.bD.hombro.rotation.x = -0.5; k.bD.hombro.rotation.z = -0.9; k.bD.codo.rotation.x = -1.3; k.hablar(t, 0.4); } }
      if (entre(t, c.voy, c.voy + 0.9)) k.hablar(t);
    }
    if (k.bandeja.visible) { k.bI.codo.rotation.x = Math.min(k.bI.codo.rotation.x, -1.45); k.bI.hombro.rotation.x = Math.min(k.bI.hombro.rotation.x, -0.15); }
  },
  actualizar(t) {
    const c = this.c;
    for (const p of this.gente) { p.reset(); p.respirar(t, p.g.position.x); if (Math.sin(t * 0.9 + p.g.position.x * 3) > 0.55) p.hablar(t + p.g.position.z); if (Math.sin(t * 0.5 + p.g.position.z) > 0.8) { p.bD.hombro.rotation.x = -1.0; p.bD.codo.rotation.x = -1.0; } }
    this.cocinero.reset(); this.cocinero.andar(t * 0.4, 0.3); this.cocinero.g.position.x = 2.6 + Math.sin(t * 0.6) * 0.9; this.cocinero.g.rotation.y = Math.sin(t * 0.6) > 0 ? 0.3 : -0.3;
    if (entre(t, c.bravas2, c.bravas2 + 2.5)) { this.cocinero.bD.hombro.rotation.x = -1.3; this.cocinero.bI.hombro.rotation.x = -1.3; }
    this.moverCamarero(t);
    this.canasMesa.forEach(x => (x.visible = t > c.cero + 0.4));
    // pantallas
    const pulso = Math.round((0.5 + 0.5 * Math.sin(t * 8)) * 4) / 4;
    this.pantBarra.userData.pintar('barra', t > c.canas2 - 0.3 ? { nuevo: true, detalle: '2 × Caña', estado: 'A SERVIR', pulso } : { nuevo: false });
    this.pantCoc.userData.pintar('cocina', t > c.bravas2 - 0.2 ? { nuevo: true, detalle: '1 × Patatas bravas', estado: 'EN MARCHA', pulso } : { nuevo: false });
    if (t > c.placa + 0.3 && t < c.cero) this.movCam.userData.pantalla('avisos', { mesa: 7, pulso });
    else if (t > c.corte1 - 0.2 && t < c.quiero) this.movCam.userData.pantalla('pedidoCamarero', { lineas: [['2 × Caña', 'bebida'], ['1 × Patatas bravas', 'comida']], resumen: 'hace 5 s · 3 productos · 11,50 €', confirmado: t > c.confirma + 0.25, onda: entre(t, c.confirma, c.confirma + 0.5) ? (t - c.confirma) / 0.5 : 0 });
    else this.movCam.userData.pantalla('bloqueo', { hora: '22:40' });
    const enBarra = entre(t, c.corte1, c.corte2);
    this.D.visible = this.I.visible = !enBarra; if (enBarra) this.colocarBrazo();
    if (enBarra) { this.desenfoque = camara2(t, this.tomasBarra); if (t - c.corte1 < 0.25) this.desenfoque = Math.max(this.desenfoque, 14 * (1 - (t - c.corte1) / 0.25)); this.on.userData.actualizar(t, 0, new THREE.Vector3(), new THREE.Vector3()); return; }
    // ---- primera persona: la cabeza mira a la sala / a la mesa / al camarero ----
    const kp = this.camarero.g.position; const yawCam = (x, z) => Math.atan2(-(x - this.ojo.x), -(z - this.ojo.z));
    let yaw, pitch;
    if (t < 2.6) { yaw = lerp(-0.1, -0.35, prog(t, 0, 2.6)); pitch = -0.06; }
    else if (t < c.vale) { yaw = lerp(-0.35, clamp(yawCam(kp.x, kp.z), -0.75, 0.75), prog(t, 2.6, 3.4)); pitch = -0.1; }
    else if (t < c.carta - 0.4) { const k = prog(t, c.vale, c.vale + 0.9); yaw = lerp(0.75, 0.05, k); pitch = lerp(-0.1, -0.62, k); }
    else if (t < c.corte1) { yaw = 0.05; pitch = lerp(-0.62, -0.42, prog(t, c.carta - 0.4, c.carta + 0.2)); }
    else if (t < c.placa + 0.35) { yaw = -0.08; pitch = -0.6; }
    else if (t < c.mandaselo - 0.3) { const tx = kp.x, tz = kp.z; const k = prog(t, c.placa + 0.35, c.placa + 1.0); yaw = lerp(-0.08, clamp(yawCam(tx, tz), -0.6, 0.6), k); pitch = lerp(-0.6, -0.1, k) + 0.16 * prog(t, c.cero - 0.6, c.cero); }
    else { const k = prog(t, c.mandaselo - 0.3, c.mandaselo + 0.4); yaw = lerp(this._yaw ?? 0.2, 0.0, k); pitch = lerp(0.06, -0.32, k); }
    if (t < c.mandaselo - 0.3) this._yaw = yaw;
    const temb = (a, b, c2) => Math.sin(t * a) * 0.006 + Math.sin(t * b + 1) * 0.004 + Math.sin(t * c2 + 2) * 0.003;
    cam.position.copy(this.ojo).add(new THREE.Vector3(temb(1.3, 2.1, 3.7), temb(1.7, 2.9, 4.1) + Math.sin(t * 1.9) * 0.008, 0));
    cam.rotation.set(pitch + temb(0.9, 1.6, 2.3), yaw + temb(0.7, 1.3, 2.9), 0); cam.up.set(0, 1, 0);
    if (cam.fov !== 64) { cam.fov = 64; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld(true);
    let desen = 0; if (t - c.corte2 < 0.25 && t > c.corte2) desen = 14 * (1 - (t - c.corte2) / 0.25); this.desenfoque = desen;
    // ---- mano izquierda levantada al principio ----
    const subeI = prog(t, 0.2, 0.9) * (1 - prog(t, c.eso + 0.3, c.eso + 1.0));
    this.I.position.set(-0.16, lerp(-0.75, 0.13, subeI), -0.72); this.I.rotation.set(0, 0, 0.12 + Math.sin(t * 7) * 0.18 * subeI);
    // ---- mano derecha con el móvil ----
    const oculto = new THREE.Vector3(0.24, -0.62, -0.42), vista = new THREE.Vector3(0.02, -0.06, -0.37);
    const local = o => cam.worldToLocal(o.clone());
    let pos = oculto.clone(), rot = new THREE.Euler(0, 0, 0), pantalla = 'bloqueo', est = { hora: '22:40' };
    const toque = (obj, t0, t1, t2) => { // t0 empieza a ir, t1 toca, t2 vuelve
      const cen = obj.userData.centro(); const dest = local(cen).add(new THREE.Vector3(0.03, 0.05, 0.06));
      const ida = prog(t, t0, t1), vuelta = prog(t, t2, t2 + 0.5); const p0 = vista.clone().lerp(dest, ida); return p0.lerp(vista, vuelta);
    };
    if (entre(t, c.vale, c.corte1)) {
      pos = oculto.clone().lerp(vista, prog(t, c.vale + 0.3, c.toco));
      if (t > c.toco - 0.05) pos = toque(this.tj, c.toco + 0.2, c.movil + 0.1, c.carta - 0.45);
      rot.x = -0.25 * prog(t, c.toco + 0.2, c.movil + 0.1) * (1 - prog(t, c.carta - 0.45, c.carta));
      if (t > c.carta - 0.3) { pantalla = 'cartaV'; est = { sel: t > c.bravas ? 2 : t > c.canas ? 1 : 0, enviado: t > c.pedir + 0.1 }; }
      pos.y += Math.sin(t * 2.3) * 0.004;
    } else if (entre(t, c.corte2, c.mandaselo - 0.3)) {
      pos = oculto.clone().lerp(vista, prog(t, c.corte2, c.toco2)); if (t > c.toco2 - 0.1) pos = toque(this.placa, c.toco2 + 0.1, c.placa + 0.1, c.placa + 0.9);
      if (t > c.placa + 1.2) pos = pos.lerp(oculto, prog(t, c.placa + 1.2, c.placa + 1.8));
      if (t > c.placa + 0.2) pantalla = 'avisoEnviado';
    } else if (t >= c.mandaselo - 0.3) {
      pos = oculto.clone().lerp(new THREE.Vector3(0.0, -0.03, -0.34), prog(t, c.mandaselo - 0.3, c.mandaselo + 0.3));
      pantalla = t > c.comenta - 0.15 ? 'comentaMesa' : 'chatBar'; est = pantalla === 'chatBar' ? { enviado: t > c.dueno + 0.3 } : { k: rebote(clamp((t - c.comenta) / 0.4)) };
    }
    this.D.position.copy(pos); this.D.rotation.copy(rot); this.D.updateMatrixWorld(true); this.colocarBrazo(); this.mv.userData.pantalla(pantalla, est);
    // ondas NFC al tocar
    const tocandoMenu = entre(t, c.movil, c.carta - 0.3), tocandoPlaca = entre(t, c.placa, c.placa + 0.8);
    const objetivo = tocandoMenu ? this.tj : tocandoPlaca ? this.placa : null;
    this.on.userData.actualizar(t, objetivo ? 1 : 0, this.mv.localToWorld(new THREE.Vector3(0, 0, -0.05)), objetivo ? objetivo.userData.centro() : new THREE.Vector3());
  },
  fx(t) { const c = this.c; let temblor = 0; for (const g of [c.ahora, c.pedir + 0.1, c.comenta]) { const d = t - g; if (d >= 0 && d < 0.35) temblor = Math.max(temblor, (1 - d / 0.35) * 12); } return { desenfoque: this.desenfoque, temblor }; },
  capa(t) {
    const c = this.c; velos();
    // marcador superior
    if (t < c.pedir + 0.2) marcador('ESPERANDO', relojMS(14 * 60 + 52 + t), '#ff4d5e');
    else if (t < c.corte2) marcador('PEDIDO ENVIADO', relojMS(t - c.pedir - 0.2), '#3ddc84', rebote(clamp((t - c.pedir - 0.2) / 0.35)));
    else if (t < c.cero) marcador('AVISO AL CAMARERO', t > c.placa + 0.2 ? relojMS(t - c.placa - 0.2) : '··', '#33C6F4');
    else marcador('MANOS LEVANTADAS', '0', '#3ddc84', rebote(clamp((t - c.cero) / 0.35)));
    if (t < c.ahora) { C.save(); C.globalAlpha = 1 - prog(t, c.ahora - 0.5, c.ahora); C.fillStyle = '#fff'; C.font = `800 30px Inter, ${FUENTE}`; C.textAlign = 'left'; C.fillText('SÁBADO · 22:40 · MESA 7', 48, 72); C.restore(); }
    const pill = (txt, a, b, ic, tono = 'marca', y = 1520) => { if (entre(t, a, b)) pildora(txt, W / 2, y, entra(t, a), { icono: ic, tono, tam: 48 }); };
    pill('Mesa 7', c.siete - 0.1, c.dos, 'check');
    pill('Pedido enviado', c.pedir + 0.15, c.corte1, 'check');
    pill('Móvil del camarero · junto a la caja', c.llega, c.canas2 - 0.2, 'nfc', 'oscuro', 1480);
    pill('Bebidas → barra', c.canas2, c.bravas2 - 0.15, 'check', 'azul', 1480);
    pill('Comida → cocina', c.bravas2, c.corte2, 'cocina', 'azul', 1480);
    pill('Llamar al camarero', c.placa + 0.15, c.voy, 'campana');
    // bocadillo sobre el camarero cuando le llega el aviso
    if (entre(t, c.placa + 0.5, c.voy + 0.9)) { const p = this.camarero.g.position.clone(); p.y = 2.2; p.project(cam); if (p.z < 1) { const X = (p.x * 0.5 + 0.5) * W, Y = (-p.y * 0.5 + 0.5) * H; pildora('Mesa 7 te llama', X, Y, entra(t, c.placa + 0.5), { icono: 'campana', tono: 'rojo', tam: 40 }); } }
    if (entre(t, c.comenta, 99)) pildora('Comenta MESA', W / 2, 1660, entra(t, c.comenta + 0.2), { icono: 'check', tono: 'marca', tam: 54 });
  },
};
// ---------- 9. ¿Qué pasa en el medio segundo que tarda tu móvil en abrir la carta? (estilo explicativo sobrio) ----------
const mat0 = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.3 });
const IA = { fondo: '#05070f', turq: '#3fe0cf', violeta: '#7c5cff', azul: '#3f7dfb', texto: '#e9edf5', gris: 'rgba(233,237,245,0.45)' };
const GROT = '"Space Grotesk", Inter, sans-serif', ISERIF = '"Instrument Serif", Georgia, serif';
function fondoIA(t, tono = 0) {
  C.fillStyle = IA.fondo; C.fillRect(0, 0, W, H);
  const glow = (x, y, r, c) => { const g = C.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); C.fillStyle = g; C.fillRect(0, 0, W, H); };
  glow(W * 0.15, H * 0.85, 900, 'rgba(110,60,220,0.28)'); glow(W * 0.9, H * 0.25, 800, tono ? 'rgba(63,224,207,0.14)' : 'rgba(63,125,251,0.16)');
  for (let i = 0; i < 40; i++) { const x = (i * 263.7 + t * 6 * ((i % 3) - 1)) % W, y = (i * 517.3 + t * 4) % H; C.fillStyle = `rgba(160,190,255,${0.05 + (i % 5) * 0.025})`; C.beginPath(); C.arc((x + W) % W, y, 2 + (i % 4) * 3, 0, 7); C.fill(); }
}
function vidrio(x, y, w, h, r = 28, borde = 'rgba(255,255,255,0.14)') {
  C.save(); C.shadowColor = 'rgba(0,0,0,0.5)'; C.shadowBlur = 50; C.shadowOffsetY = 18;
  C.fillStyle = grad(C, x, y, x, y + h, ['rgba(40,48,70,0.78)', 'rgba(18,22,36,0.82)']); rr(C, x, y, w, h, r); C.fill(); C.restore();
  C.save(); C.strokeStyle = borde; C.lineWidth = 2; rr(C, x, y, w, h, r); C.stroke(); C.restore();
}
function rotulo(txt, X, Y, color = IA.turq, tam = 24, alfa = 1) { C.save(); C.globalAlpha = alfa; C.fillStyle = color; C.font = `700 ${tam}px ${GROT}`; C.letterSpacing = `${Math.round(tam * 0.32)}px`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(txt.toUpperCase(), X, Y); C.restore(); }
function nota(txt, Y, alfa = 1) { C.save(); C.globalAlpha = alfa * 0.6; C.fillStyle = '#9aa6c4'; C.font = `500 24px ${GROT}`; C.textAlign = 'center'; C.fillText(txt, W / 2, Y); C.restore(); }
function numGrande(txt, X, Y, tam = 120, color = '#fff') { C.save(); C.fillStyle = color; C.font = `700 ${tam}px ${GROT}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.shadowColor = color === '#fff' ? 'rgba(255,255,255,0.25)' : color; C.shadowBlur = 30; C.fillText(txt, X, Y); C.restore(); }
function pastillaTiempo(seg, k = 1, color = '#e9edf5', titulo = null) {
  if (k <= 0) return; C.save(); C.globalAlpha = clamp(k); const Y = 470;
  if (titulo) rotulo(titulo, W / 2, Y - 52, IA.turq, 18);
  vidrio(W / 2 - 120, Y - 34, 240, 68, 34); C.fillStyle = color; C.font = `700 34px ${GROT}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(`${seg.toFixed(3).replace('.', ',')} s`, W / 2, Y + 1); C.restore();
}
const miles = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function cajaToken(txt, X, Y, k, { color = '#fff', borde = 'rgba(255,255,255,0.18)', tam = 64, sub = null } = {}) {
  if (k <= 0) return; C.save(); C.globalAlpha = clamp(k * 1.5); C.font = `700 ${tam}px ${GROT}`; const w = C.measureText(txt).width + tam * 0.9, h = tam * 1.7;
  C.translate(X, Y); const s = lerp(0.85, 1, rebote(clamp(k))); C.scale(s, s); vidrio(-w / 2, -h / 2, w, h, 20, borde);
  C.fillStyle = color; C.textAlign = 'center'; C.textBaseline = 'middle'; if (color !== '#fff') { C.shadowColor = color; C.shadowBlur = 24; } C.fillText(txt, 0, 3); C.shadowBlur = 0;
  if (sub) { C.fillStyle = 'rgba(160,180,210,0.75)'; C.font = `600 22px ${GROT}`; C.fillText(sub, 0, h / 2 + 34); }
  C.restore(); return w;
}
function ciudad(t, dir = 1, k = 1) { // skyline + fibra con pulsos de luz
  fondoIA(t, 1);
  C.save(); C.globalAlpha = k; const base = 820;
  for (let i = 0; i < 14; i++) { const w = 70 + (i * 37) % 60, h = 160 + (i * 97) % 300, x = i * 82 - 20; C.fillStyle = '#0d1428'; C.fillRect(x, base - h, w, h);
    for (let yy = base - h + 24; yy < base - 20; yy += 46) for (let xx = x + 14; xx < x + w - 16; xx += 30) { const on = ((xx * 7 + yy * 13 + i) % 5) < 2; if (on) { C.fillStyle = (xx + yy) % 3 ? 'rgba(255,214,140,0.75)' : 'rgba(127,220,255,0.55)'; C.fillRect(xx, yy, 12, 14); } } }
  C.fillStyle = 'rgba(70,90,140,0.5)'; C.fillRect(0, base, W, 3); C.fillStyle = 'rgba(10,14,28,0.95)'; C.fillRect(0, base + 3, W, H - base);
  const Y = 1160; C.fillStyle = 'rgba(63,125,251,0.10)'; C.fillRect(0, Y - 26, W, 52); C.strokeStyle = 'rgba(127,170,255,0.35)'; C.lineWidth = 2; C.beginPath(); C.moveTo(0, Y - 26); C.lineTo(W, Y - 26); C.moveTo(0, Y + 26); C.lineTo(W, Y + 26); C.stroke();
  for (let i = 0; i < 5; i++) { const f = ((t * 0.9 + i / 5) % 1); const x = dir > 0 ? f * (W + 400) - 200 : W + 200 - f * (W + 400); const g = C.createLinearGradient(x - dir * 220, 0, x, 0); g.addColorStop(0, 'rgba(124,92,255,0)'); g.addColorStop(1, 'rgba(63,224,207,0.95)');
    C.fillStyle = g; C.fillRect(Math.min(x, x - dir * 220), Y - 5, 220, 10); C.fillStyle = '#fff'; C.shadowColor = IA.turq; C.shadowBlur = 20; C.beginPath(); C.arc(x, Y, 9, 0, 7); C.fill(); C.shadowBlur = 0; }
  C.restore();
}
function chipMacro(X, Y, s, brillo = 0) {
  C.save(); C.translate(X, Y); C.scale(s, s);
  if (brillo > 0) { const g = C.createRadialGradient(0, 0, 0, 0, 0, 260); g.addColorStop(0, `rgba(63,224,207,${0.45 * brillo})`); g.addColorStop(1, 'rgba(63,224,207,0)'); C.fillStyle = g; C.fillRect(-300, -300, 600, 600); }
  C.strokeStyle = '#c8954a'; C.lineWidth = 6; for (let i = 0; i < 6; i++) { const a = -70 + i * 28; C.beginPath(); C.moveTo(-180, a); C.lineTo(-90, a * 0.6); C.stroke(); C.beginPath(); C.moveTo(180, a); C.lineTo(90, a * 0.6); C.stroke(); }
  C.fillStyle = '#10131c'; rr(C, -90, -90, 180, 180, 14); C.fill(); C.strokeStyle = 'rgba(255,255,255,0.15)'; C.lineWidth = 2; rr(C, -90, -90, 180, 180, 14); C.stroke();
  C.fillStyle = 'rgba(63,224,207,0.18)'; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) C.fillRect(-70 + i * 30, -70 + j * 30, 22, 22);
  C.restore();
}
function telefono2D(X, Y, s, contenido) { C.save(); C.translate(X, Y); C.scale(s, s); C.fillStyle = '#15171f'; rr(C, -60, -120, 120, 240, 22); C.fill(); C.strokeStyle = 'rgba(255,255,255,0.25)'; C.lineWidth = 3; rr(C, -60, -120, 120, 240, 22); C.stroke(); if (contenido) contenido(); C.restore(); }

V['nfc'] = { ...comunCapa, estilo: 'ia',
  async montar() {
    for (const [f, fam, peso, est] of [['SpaceGrotesk.woff2', 'Space Grotesk', '300 700', 'normal'], ['InstrumentSerif-Italic.woff2', 'Instrument Serif', '400', 'italic'], ['Fraunces-SemiBold.ttf', 'Fraunces', '600', 'normal'], ['Fraunces-SemiBoldItalic.ttf', 'Fraunces', '600', 'italic']]) { const ff = new FontFace(fam, `url(./fuentes/${f})`, { weight: peso, style: est }); await ff.load(); document.fonts.add(ff); }
    ['campo', 'antena', 'chip', 'pilas', 'bytes', 'direccion', 'servidor', 'mesa', 'siete', 'segundo', 'tiempo', 'corriente', 'arroz', 'centimetros', 'carta', 'internet', 'milisegundo', 'vuelve', 'despierta'].forEach(w => CLAVES.add(w)); CLAVES.delete('cuenta');
    scene.background = new THREE.Color(IA.fondo); scene.fog = new THREE.Fog(IA.fondo, 6, 30); pared.visible = suelo.visible = bokeh.visible = false;
    foco.intensity = 0; relleno.intensity = 6; lampara.intensity = 0; contra.intensity = 10; hemi.intensity = 0.5; hemi.color.set('#9fb2ff'); hemi.groundColor.set('#1a1030');
    const llave = new THREE.DirectionalLight('#dfe8ff', 1.6); llave.position.set(2, 3, 4); scene.add(llave);
    const rimT = new THREE.PointLight(IA.turq, 12, 6, 1.5); rimT.position.set(1.5, 0.8, -1); scene.add(rimT);
    renderer.shadowMap.enabled = false;
    const glow = (x, y, z, s, c, o) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBokeh.tex, color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sp.position.set(x, y, z); sp.scale.set(s, s, 1); scene.add(sp); return sp; };
    glow(-2.5, -1.8, -4, 9, IA.violeta, 0.35); glow(2.6, 2.2, -5, 8, IA.azul, 0.25);
    const n = 260, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 8; pos[i * 3 + 1] = (Math.random() - 0.5) * 6; pos[i * 3 + 2] = -Math.random() * 6 + 1; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.polvo = new THREE.Points(pg, new THREE.PointsMaterial({ map: texBokeh.tex, color: '#8fb0ff', size: 0.05, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(this.polvo);
    this.tj = tarjetaMenuRayos(); this.tj.position.set(0, -0.53, 0); mundo.add(this.tj);
    this.mv = movil(); this.mv.scale.setScalar(0.62); mundo.add(this.mv); this.on = ondas();
    // pasillo de servidores (lejos del resto)
    const srv = new THREE.Group(); srv.position.set(30, 0, 0); mundo.add(srv); this.srv = srv;
    const leds = lienzo(256, 512, (x, w, h) => { x.fillStyle = '#0a0f1c'; x.fillRect(0, 0, w, h); for (let yy = 12; yy < h; yy += 34) { x.fillStyle = '#121a2e'; x.fillRect(8, yy, w - 16, 26); for (let i = 0; i < 6; i++) { x.fillStyle = (i + yy) % 5 === 0 ? '#3ddc84' : (i * 7 + yy) % 3 === 0 ? '#3fe0cf' : 'rgba(63,224,207,0.25)'; x.fillRect(18 + i * 14, yy + 9, 7, 7); } } });
    for (let lado of [-1, 1]) for (let i = 0; i < 14; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.3, 0.9), [mat0('#0b1120'), mat0('#0b1120'), mat0('#0b1120'), mat0('#0b1120'), mat0('#0b1120'), mat0('#0b1120')]);
      const fr = new THREE.MeshStandardMaterial({ color: '#ffffff', map: leds.tex, emissiveMap: leds.tex, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.6 }); r.material[lado > 0 ? 1 : 0] = fr; r.position.set(lado * 1.1, 0, -i * 1.0); srv.add(r); }
    const sueloS = new THREE.Mesh(new THREE.PlaneGeometry(4, 20), new THREE.MeshStandardMaterial({ color: '#0a1020', roughness: 0.3, metalness: 0.4 })); sueloS.rotation.x = -Math.PI / 2; sueloS.position.set(0, -1.15, -7); srv.add(sueloS);
    const c = this.c = { medio: cue('medio'), tarda: cue('tarda'), abrir: cue('abrir'), bar: cue('bar'), vamos: cue('vamos'), congelar: cue('congelar'), tarjeta: cue('tarjeta'), mili: cue('milisegundo'), campo: cue('campo'),
      trece: cue('trece'), seg2: cue('segundo', 2), dentro: cue('dentro'), antena: cue('antena'), chip: cue('chip'), grano: cue('grano'), la2: cue('la', 3), pilas: cue('pilas'), propio: cue('propio'), corriente: cue('corriente'),
      despierta: cue('despierta'), responde: cue('responde'), bytes: cue('bytes'), direccion: cue('direccion'), todo: cue('todo'), cuatro: cue('cuatro'), abre: cue('abre'), viaja: cue('viaja'), servidor: cue('servidor'),
      vuelve: cue('vuelve'), carta2: cue('carta', 2), como: cue('como'), mesa: cue('mesa'), siete: cue('siete'), medio3: cue('medio', 3), pensando: cue('pensando'), pegatina: cue('pegatina'), sigueme: cue('sigueme'), tecno: cue('tecnologia'), vas: cue('nfc') };
    this.musica = 'ambient_b'; this.volMusica = 0.55;
    efectos = [['whoosh', 0.02], ['tick', c.medio], ['tick', c.tarda], ['tick', c.abrir], ['tick', c.bar], ['riser', c.congelar - 0.9], ['hit', c.congelar + 0.15], ['tick', c.mili], ['whoosh', c.campo - 0.1],
      ['whoosh', c.dentro - 0.1], ['pop', c.chip], ['pop', c.grano], ['whoosh', c.pilas - 0.2], ['ding', c.despierta + 0.2], ['whoosh', c.responde], ['pop', c.bytes], ['pop', c.direccion], ['tick', c.cuatro],
      ['whoosh', c.abre], ['whoosh', c.servidor - 0.1], ['whoosh', c.vuelve], ['ding', c.carta2], ['ding', c.siete], ['hit', c.medio3], ['pop', c.pegatina + 0.3], ['whoosh', c.sigueme - 0.25], ['pop', c.sigueme + 0.3], ['ding', c.vas + 0.2]];
    const cc = [0, 0, 0];
    this.tomas = [
      { a: 0, de: [1.3, 0.45, 2.7], a2: [1.1, 0.4, 2.4], mira: [0, 0, 0.15], mira2: [0, 0, 0.15], fov: 34, barrido: 0 },
      { a: c.tarda, de: [30, 0.1, 1.5], a2: [30, 0.1, 0.2], mira: [30, 0, -8], mira2: [30, 0, -8], fov: 50, barrido: 0 },
      { a: c.bar, de: [0, 0.02, 2.35], a2: [0, 0.02, 2.15], mira: [0, 0, 0.36], mira2: [0, 0, 0.36], fov: 34, barrido: 0 },
      { a: c.vamos, de: [1.55, 0.45, 2.95], a2: [1.35, 0.4, 2.65], mira: [0, 0, 0.18], mira2: [0, 0, 0.18], fov: 34, barrido: 0.25 },
      { a: c.campo - 0.1, de: [2.1, 0.4, 1.25], a2: [1.85, 0.35, 1.05], mira: [0, 0, 0.2], mira2: [0, 0, 0.2], fov: 34 },
      { a: c.dentro - 0.1, de: [0.25, 0.05, 2.4], a2: [0.12, 0.03, 2.05], mira: cc, mira2: cc, fov: 32 },
      { a: c.responde - 0.1, de: [1.9, 0.45, 1.45], a2: [1.7, 0.4, 1.3], mira: [0, 0, 0.2], mira2: [0, 0, 0.2], fov: 34 },
      { a: c.servidor - 0.15, de: [30, 0.1, 1.2], a2: [30, 0.1, -1.2], mira: [30, 0, -9], mira2: [30, 0, -9], fov: 50, barrido: 0 },
      { a: c.carta2 - 0.1, de: [0.05, 0.02, 2.35], a2: [0.0, 0.02, 2.1], mira: [0, 0, 0.36], mira2: [0, 0, 0.36], fov: 34, barrido: 0 },
    ];
  },
  // 2D a pantalla completa (tapan el 3D)
  plano2D(t) { const c = this.c; return entre(t, c.medio, c.tarda) || entre(t, c.abrir, c.bar) || entre(t, c.responde, c.servidor - 0.15) || entre(t, c.vuelve, c.carta2 - 0.1) || t >= c.medio3; },
  actualizar(t) {
    const c = this.c, cen = new THREE.Vector3(0, 0, 0.01);
    const congelado = entre(t, c.congelar, c.medio3);
    this.polvo.rotation.y = congelado ? 0.4 + (t - c.congelar) * 0.004 : t * 0.1;
    // móvil delante de la tarjeta, a unos centímetros
    const acerca = prog(t, 0, c.congelar); const enCarta = t > c.carta2 - 0.15;
    this.mv.visible = true; this.mv.position.set(lerp(0.1, -0.24, acerca), lerp(0.4, 0.1, acerca), lerp(0.95, 0.38, acerca)); this.mv.rotation.set(-0.08, 0.2 * (1 - acerca) + 0.35, 0.04);
    if (entre(t, c.bar, c.vamos) || enCarta) { this.mv.position.set(0, 0, 0.36); this.mv.rotation.set(0, 0, 0); }
    const xr = (entre(t, c.dentro - 0.2, c.responde + 0.2) ? prog(t, c.dentro - 0.2, c.dentro + 0.4) : 0);
    this.tj.userData.rayosX(xr, prog(t, c.antena - 0.1, c.antena + 1.2), t > c.despierta ? 0.7 + 0.3 * Math.sin((t - c.despierta) * 10) : t > c.chip ? 0.35 : 0);
    this.tj.userData.pulsos(t, entre(t, c.propio, c.responde + 0.2) ? prog(t, c.propio, c.corriente) : 0);
    this.mv.userData.opacidad(1 - 0.9 * xr); this.mv.visible = xr < 0.95;
    this.mv.userData.pantalla(enCarta || entre(t, c.bar, c.vamos) ? 'cartaV' : 'bloqueo', enCarta ? { sel: 0 } : { hora: '21:30' });
    const campoOn = entre(t, c.medio, c.tarda + 0.01) || entre(t, c.campo - 0.2, c.dentro) || entre(t, c.responde, c.servidor - 0.2);
    const tOnda = congelado ? c.congelar + (t - c.congelar) * 0.35 : t;
    this.on.userData.actualizar(tOnda, campoOn ? 1 : 0, this.mv.userData.detras(), cen);
    this.desenfoque = camara2(t, this.tomas);
  },
  fx(t) { const c = this.c; let flash = 0; for (const g of [c.congelar + 0.15, c.despierta + 0.2, c.medio3]) { const d = t - g; if (d >= 0 && d < 0.3) flash = Math.max(flash, 0.35 * (1 - d / 0.3)); } return { desenfoque: this.plano2D(t) ? 0 : this.desenfoque, flash }; },
  capa(t) {
    const c = this.c;
    // tiempo que marca el contador en cada momento
    const marcas = [[c.congelar, 0], [c.mili, 0.001], [c.campo, 0.001], [c.dentro, 0.002], [c.chip, 0.003], [c.pilas, 0.004], [c.despierta, 0.006], [c.responde, 0.008], [c.bytes, 0.012], [c.todo, 0.028],
      [c.abre, 0.035], [c.viaja, 0.06], [c.servidor, 0.24], [c.vuelve, 0.33], [c.carta2, 0.44], [c.mesa, 0.47], [c.medio3, 0.482]];
    let s = 0; for (let i = 0; i < marcas.length; i++) if (t >= marcas[i][0]) s = i < marcas.length - 1 ? lerp(marcas[i][1], marcas[i + 1][1], clamp((t - marcas[i][0]) / (marcas[i + 1][0] - marcas[i][0]))) : marcas[i][1];
    // ---- planos 2D ----
    if (entre(t, c.medio, c.tarda)) { ciudad(t); rotulo('Internet', W / 2, 1240, IA.turq, 22); }
    if (entre(t, c.abrir, c.bar)) { fondoIA(t); chipMacro(W / 2, 1000, 1.6, 0.8); rotulo('Chip NFC', W / 2, 1300, IA.turq, 22); }
    if (entre(t, c.responde, c.abre - 0.1)) this.planoBytes(t);
    if (entre(t, c.abre - 0.1, c.servidor - 0.15)) { ciudad(t); rotulo('Viaja por internet', W / 2, 1240, IA.turq, 22); }
    if (entre(t, c.vuelve, c.carta2 - 0.1)) { ciudad(t, -1); rotulo('De vuelta por internet', W / 2, 1240, IA.turq, 22); }
    if (t >= c.medio3) this.final(t);
    if (!this.plano2D(t)) { // velo suave arriba/abajo sobre el 3D
      const g1 = C.createLinearGradient(0, 0, 0, 640); g1.addColorStop(0, 'rgba(5,7,15,0.85)'); g1.addColorStop(1, 'rgba(5,7,15,0)'); C.fillStyle = g1; C.fillRect(0, 0, W, 640);
      const g2 = C.createLinearGradient(0, H - 700, 0, H); g2.addColorStop(0, 'rgba(5,7,15,0)'); g2.addColorStop(1, 'rgba(5,7,15,0.85)'); C.fillStyle = g2; C.fillRect(0, H - 700, W, 700);
    }
    // ---- contador ----
    if (t < c.vamos) pastillaTiempo(lerp(0.06, 0.5, clamp(t / c.vamos)), 1, t > c.bar ? '#3ddc84' : '#e9edf5', 'Qué pasa en');
    else if (entre(t, c.vamos, c.mili)) { const k = entra(t, c.congelar, 0.45); C.save(); C.globalAlpha = clamp(k); vidrio(W / 2 - 270, 640, 540, 210, 30); rotulo('Tiempo congelado', W / 2, 690, IA.turq, 20); numGrande('0,000 s', W / 2, 785, 110); C.restore(); }
    else if (t < c.medio3) pastillaTiempo(s, 1, s >= 0.44 ? '#3ddc84' : '#e9edf5');
    // ---- rótulos y datos de cada paso ----
    const ap = (a, b, f) => { if (entre(t, a, b)) { C.save(); C.globalAlpha = clamp((t - a) / 0.3) * clamp((b - t) / 0.25); f(); C.restore(); } };
    ap(c.mili, c.dentro - 0.1, () => { rotulo(t > c.campo ? 'Campo magnético · 13,56 MHz' : 'Milisegundo 1', W / 2, 1330, IA.turq, 22);
      if (t > c.trece - 0.2) { vidrio(W / 2 - 290, 1390, 580, 190, 26); numGrande(miles(13560000 * prog(t, c.trece - 0.2, c.seg2)), W / 2, 1468, 84); rotulo('Vibraciones por segundo', W / 2, 1540, 'rgba(233,237,245,0.7)', 18); }
      nota('El NFC trabaja a 13,56 MHz (norma ISO/IEC 14443)', 1650); });
    ap(c.dentro, c.pilas - 0.1, () => {
      rotulo(t > c.chip ? 'Antena + chip' : 'Antena en espiral', W / 2, 1330, IA.turq, 22);
      if (t > c.grano - 0.15) { vidrio(W / 2 - 300, 1390, 600, 230, 26); chipMacro(W / 2 - 140, 1490, 0.12, 0.6); rotulo('Chip', W / 2 - 140, 1580, 'rgba(233,237,245,0.7)', 16);
        C.save(); C.translate(W / 2 + 120, 1490); C.rotate(-0.4); C.fillStyle = '#efe6cf'; C.beginPath(); C.ellipse(0, 0, 70, 26, 0, 0, 7); C.fill(); C.restore(); rotulo('Grano de arroz', W / 2 + 120, 1580, 'rgba(233,237,245,0.7)', 16);
        nota('Tamaño aproximado del chip, sin contar la antena', 1670); } });
    ap(c.pilas - 0.1, c.responde, () => {
      if (t < c.despierta) { vidrio(W / 2 - 170, 1370, 340, 110, 24); C.save(); C.translate(W / 2 - 80, 1425); C.strokeStyle = '#fff'; C.lineWidth = 5; rr(C, -36, -20, 66, 40, 6); C.stroke(); C.fillStyle = '#fff'; C.fillRect(32, -8, 8, 16); C.strokeStyle = '#ff4d5e'; C.beginPath(); C.moveTo(-44, 26); C.lineTo(44, -26); C.stroke(); C.restore();
        C.save(); C.fillStyle = '#fff'; C.font = `700 40px ${GROT}`; C.textAlign = 'left'; C.textBaseline = 'middle'; C.fillText('Sin pilas', W / 2 - 20, 1426); C.restore(); }
      rotulo(t > c.despierta ? 'Chip despierto' : t > c.corriente - 0.3 ? 'Inducción: el campo crea corriente' : 'Energía del propio móvil', W / 2, 1560, t > c.despierta ? '#3ddc84' : IA.turq, 22);
      nota('Las etiquetas NFC pasivas se alimentan del campo del lector', 1650); });
    ap(c.carta2 - 0.1, c.medio3, () => { if (t > c.mesa - 0.2) { const w = cajaToken('/m/7', W / 2 - 150, 1520, prog(t, c.mesa - 0.2, c.mesa + 0.2), { tam: 56 }); C.save(); C.strokeStyle = IA.turq; C.lineWidth = 3; C.beginPath(); C.moveTo(W / 2 - 40, 1520); C.lineTo(W / 2 + 40, 1520); C.stroke(); C.restore();
      cajaToken('Mesa 7', W / 2 + 170, 1520, prog(t, c.siete - 0.3, c.siete + 0.1), { color: IA.turq, borde: 'rgba(63,224,207,0.6)', tam: 56 }); rotulo('La dirección lleva la mesa (ejemplo)', W / 2, 1640, 'rgba(233,237,245,0.6)', 16); } });
    if (entre(t, c.servidor - 0.15, c.vuelve)) { rotulo('Servidor', W / 2, 1330, IA.turq, 22); nota('Centro de datos (ilustración)', 1400); }
  },
  planoBytes(t) {
    const c = this.c; fondoIA(t, 1);
    if (t < c.cuatro - 0.1) {
      rotulo('El chip responde', W / 2, 640, IA.turq, 22);
      const k1 = prog(t, c.responde, c.responde + 0.4); cajaToken('0x04', W / 2 - 200, 820, k1, { tam: 60, sub: '1 BYTE' });
      if (t > c.responde + 0.6) { C.save(); C.strokeStyle = IA.turq; C.lineWidth = 3; C.beginPath(); C.moveTo(W / 2 - 90, 820); C.lineTo(W / 2 - 10, 820); C.stroke(); C.restore(); cajaToken('https://', W / 2 + 160, 820, prog(t, c.responde + 0.6, c.responde + 1.0), { color: IA.turq, borde: 'rgba(63,224,207,0.6)', tam: 60 }); }
      const trozos = [['https://', '1'], ['visaxnfc.es', '11'], ['/m/7', '4']]; let x = 170;
      if (t > c.bytes - 0.3) trozos.forEach(([tx, b], i) => { C.save(); C.font = `700 46px ${GROT}`; const w = C.measureText(tx).width + 40; C.restore(); cajaToken(tx, x + w / 2, 1120, prog(t, c.bytes - 0.3 + i * 0.25, c.bytes + i * 0.25), { tam: 46, sub: `${b} B` }); x += w + 36; });
      if (t > c.direccion - 0.2) { const k = prog(t, c.direccion - 0.2, c.direccion + 0.3); C.save(); C.globalAlpha = k; vidrio(140, 1300, W - 280, 120, 60); C.fillStyle = '#fff'; C.font = `600 44px ${GROT}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText('https://visaxnfc.es/m/7', W / 2, 1362); C.restore(); rotulo('Dirección web (ejemplo) · ≈ 20 bytes', W / 2, 1480, 'rgba(233,237,245,0.6)', 18, k); }
      nota('Formato NDEF: el byte 0x04 significa "https://"', 1650);
    } else {
      rotulo('Alcance', W / 2, 640, IA.turq, 22);
      const k = prog(t, c.cuatro - 0.1, c.cuatro + 0.4);
      telefono2D(W / 2 - 200, 1000, 1.6); C.save(); C.translate(W / 2 + 200, 1000); C.fillStyle = '#1d1916'; rr(C, -14, -170, 28, 340, 8); C.fill(); C.restore();
      for (let i = 0; i < 4; i++) { const f = ((t * 0.8 + i / 4) % 1); C.save(); C.strokeStyle = `rgba(63,224,207,${0.8 * (1 - f) * k})`; C.lineWidth = 4; C.beginPath(); C.ellipse(W / 2 - 100 + f * 280, 1000, 30 + f * 40, 120 + f * 70, 0, 0, 7); C.stroke(); C.restore(); }
      C.save(); C.globalAlpha = k; C.strokeStyle = '#fff'; C.lineWidth = 3; C.beginPath(); C.moveTo(W / 2 - 100, 1260); C.lineTo(W / 2 + 186, 1260); C.moveTo(W / 2 - 100, 1240); C.lineTo(W / 2 - 100, 1280); C.moveTo(W / 2 + 186, 1240); C.lineTo(W / 2 + 186, 1280); C.stroke(); C.restore();
      cajaToken('≤ 4 cm', W / 2 + 43, 1360, k, { tam: 56 });
      nota('Alcance típico de una etiqueta NFC: hasta unos 4 cm', 1650);
    }
  },
  final(t) {
    const c = this.c; fondoIA(t); const k = prog(t, c.medio3, c.medio3 + 0.4);
    C.save(); C.globalAlpha = k; C.fillStyle = '#3ddc84'; C.font = `700 40px ${GROT}`; C.textAlign = 'center'; C.fillText('0,482 s', W / 2, 820);
    C.font = `700 110px ${GROT}`; const a = 'Medio ', b = 'segundo.'; const wa = C.measureText(a).width; C.font = `italic 400 124px ${ISERIF}`; const wb = C.measureText(b).width; const x0 = W / 2 - (wa + wb) / 2;
    C.textAlign = 'left'; C.fillStyle = '#fff'; C.font = `700 110px ${GROT}`; C.fillText(a, x0, 960); C.fillStyle = IA.turq; C.font = `italic 400 124px ${ISERIF}`; C.shadowColor = IA.turq; C.shadowBlur = 24; C.fillText(b, x0 + wa, 960); C.restore();
    if (t > c.pensando - 0.3) { const k2 = prog(t, c.pensando - 0.3, c.pensando + 0.2); C.save(); C.globalAlpha = k2; C.fillStyle = 'rgba(233,237,245,0.85)'; C.font = `500 46px ${GROT}`; C.textAlign = 'center'; C.fillText('Y tú pensando que solo era', W / 2, 1080); C.fillStyle = '#fff'; C.font = `700 58px ${GROT}`; C.fillText('una pegatina.', W / 2, 1160); C.restore(); }
    if (t > c.sigueme - 0.35) { // tarjeta final: sígueme
      const k3 = prog(t, c.sigueme - 0.35, c.sigueme + 0.1); C.save(); C.globalAlpha = k3; fondoIA(t); C.restore();
      C.save(); C.globalAlpha = k3; logoVisax(C, W / 2 - 70, 560, 140); C.restore();
      const kb = rebote(clamp((t - c.sigueme) / 0.45)); if (kb > 0) { C.save(); C.translate(W / 2, 930); C.scale(kb, kb); C.shadowColor = 'rgba(63,224,207,0.6)'; C.shadowBlur = 40;
        C.fillStyle = grad(C, -250, 0, 250, 0, [IA.turq, IA.azul, IA.violeta]); rr(C, -250, -75, 500, 150, 75); C.fill(); C.shadowBlur = 0;
        C.fillStyle = '#fff'; C.font = `700 64px ${GROT}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText('Sígueme', 22, 4);
        C.strokeStyle = '#fff'; C.lineWidth = 7; C.lineCap = 'round'; C.beginPath(); C.moveTo(-178, 4); C.lineTo(-138, 4); C.moveTo(-158, -16); C.lineTo(-158, 24); C.stroke(); C.restore(); }
      const kt = prog(t, c.sigueme + 0.4, c.sigueme + 0.9); C.save(); C.globalAlpha = kt; C.textAlign = 'center'; C.fillStyle = 'rgba(233,237,245,0.85)'; C.font = `500 44px ${GROT}`; C.fillText('si quieres saber más sobre la', W / 2, 1110);
      C.fillStyle = IA.turq; C.font = `italic 400 84px ${ISERIF}`; C.shadowColor = IA.turq; C.shadowBlur = 20; C.fillText('tecnología NFC.', W / 2, 1195); C.shadowBlur = 0; C.restore();
      // cursor que pulsa el botón
      if (t > c.vas) { const kc = prog(t, c.vas, c.vas + 0.5); C.save(); C.translate(lerp(W / 2 + 330, W / 2 + 150, kc), lerp(1120, 960, kc)); C.scale(1 - 0.12 * clamp((t - c.vas - 0.5) / 0.1) * (1 - clamp((t - c.vas - 0.65) / 0.1)), 1); C.fillStyle = '#fff'; C.strokeStyle = '#111'; C.lineWidth = 3;
        C.beginPath(); C.moveTo(0, 0); C.lineTo(0, 64); C.lineTo(16, 50); C.lineTo(28, 76); C.lineTo(40, 70); C.lineTo(28, 46); C.lineTo(48, 44); C.closePath(); C.fill(); C.stroke(); C.restore(); }
    }
  },
};
// ---------- 10. Dos bares iguales: sin NFC (arriba) vs con NFC (abajo), maqueta isométrica en pantalla partida ----------
V['versus'] = { ...comunCapa, estilo: 'maquetaDoble',
  async montar() {
    for (const [f, peso, est] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-ExtraBold.ttf', '800', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: est }); await ff.load(); document.fonts.add(ff); }
    ['nfc', 'mano', 'espera', 'tarjeta', 'libreta', 'barra', 'cocina', 'placa', 'vibra', 'corriendo', 'atendiendo', 'trabajar', 'solo', 'pidiendo'].forEach(w => CLAVES.add(w));
    pared.visible = suelo.visible = bokeh.visible = false; foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0;
    hemi.color.set('#ffffff'); hemi.groundColor.set('#b98d66'); hemi.intensity = 1.5;
    this.A = construirMaqueta(scene, { nfc: false, x0: -20, tarjetaMenu, placaCuadrada, pantalla3D, movil });
    this.B = construirMaqueta(scene, { nfc: true, x0: 20, tarjetaMenu, placaCuadrada, pantalla3D, movil });
    for (const x0 of [-20, 20]) { const sol = new THREE.DirectionalLight('#fff2dc', 2.2); sol.position.set(x0 + 4, 10, 6); sol.target.position.set(x0, 0, 0); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
      Object.assign(sol.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); sol.shadow.bias = -0.0006; scene.add(sol, sol.target); }
    const asp = W / (H / 2), hf = 5.6;
    this.camA = new THREE.OrthographicCamera(-hf * asp, hf * asp, hf, -hf, 0.1, 100); this.camB = this.camA.clone();
    this.on = ondas();
    const c = this.c = { abajo1: cue('abajo'), nfc: cue('nfc'), cuatro: cue('cuatro'), arriba1: cue('arriba'), mano1: cue('mano'), espera: cue('espera'), abajo2: cue('abajo', 2), toca1: cue('toca'), tarjeta: cue('tarjeta'), pidiendo: cue('pidiendo'),
      arriba2: cue('arriba', 2), apunta: cue('apunta'), barra1: cue('barra'), cocina1: cue('cocina'), vuelve: cue('vuelve'), abajo3: cue('abajo', 3), llega: cue('llega'), bebidas: cue('bebidas'), comida: cue('comida'),
      otra: cue('otra'), arriba3: cue('arriba', 3), abajo4: cue('abajo', 4), placa: cue('placa'), vibra: cue('vibra'), mismo: cue('mismo', 2), corriendo: cue('corriendo'), atendiendo: cue('atendiendo'), cual: cue('cual'), sigueme: cue('sigueme') }; c.comenta = c.cual - 0.15;
    this.musica = 'guitarra_bar'; this.volMusica = 0.45;
    const S = (p) => [p[0] + 0.95, p[1]]; const { B: Bp, K, T1, T2, T3, T4, T5, C: Cc } = P;
    // camarero SIN NFC: va y viene toda la noche
    this.rutaA = [[0, ...S(T3)], [3.0, ...S(T3)], [5.0, ...Bp], [6.5, ...Bp], [8.5, ...S(T1)], [11.5, ...S(T1)], [12.8, ...S(T2)], [c.arriba2 - 0.9, ...S(T2)], [c.apunta - 0.3, 1.95, 1.7], [c.barra1 - 0.4, 1.95, 1.7],
      [c.barra1 + 0.6, ...Bp], [c.cocina1 + 0.4, ...K], [c.vuelve + 0.5, ...Cc], [c.vuelve + 2.2, ...S(T5)], [c.bebidas + 0.3, ...S(T5)], [c.comida + 1.0, ...Bp], [c.otra + 0.8, ...S(T1)], [c.arriba3 + 1.0, ...K],
      [c.abajo4 + 0.6, ...S(T3)], [c.vibra, ...Bp], [c.mismo, ...K], [c.mismo + 1.2, ...S(T1)], [c.mismo + 2.2, ...Bp], [c.corriendo + 0.4, ...K], [c.corriendo + 1.5, ...S(T5)], [c.atendiendo, ...S(T3)], [c.atendiendo + 1.0, ...Bp], [c.cual + 0.6, ...K]];
    // camarero CON NFC: atiende sin carreras
    this.rutaB = [[0, ...S(T3)], [8.6, ...S(T3)], [10.6, ...Bp], [c.pidiendo + 2.4, ...Bp], [c.pidiendo + 4.6, 1.95, 1.7], [c.vuelve + 1.0, 1.95, 1.7], [c.vuelve + 3.2, ...Bp], [c.placa + 0.6, ...Bp], [c.vibra + 1.4, 1.95, 1.7]];
    this.entregaB = c.pidiendo + 4.8; this.bravasB = c.vibra + 1.6;
    efectos = [['whoosh', 0.02], ['pop', c.abajo1 + 0.1], ['pop', c.cuatro], ['tick', c.mano1], ['tap', c.tarjeta], ['ding', c.pidiendo], ['tick', c.apunta + 0.2], ['whoosh', c.barra1], ['whoosh', c.cocina1],
      ['ding', c.bebidas], ['ding', c.comida], ['pop', this.entregaB], ['tick', c.arriba3 + 0.4], ['tap', c.placa], ['buzz', c.vibra], ['pop', c.corriendo], ['pop', c.atendiendo], ['hit', c.cual], ['pop', c.sigueme + 0.3]];
    // encuadres (centro local y zoom), iguales arriba y abajo
    this.planos = [[0, [0, 0.6, 0], 1.0], [c.cuatro - 0.3, [2.4, 0.8, 1.2], 1.75], [c.arriba2 - 0.2, [0, 0.8, 0], 1.12], [c.abajo3 - 0.2, [0.1, 1.0, -2.0], 1.55], [c.otra - 0.2, [2.4, 0.8, 1.2], 1.6], [c.mismo - 0.2, [0, 0.6, 0], 1.0], [c.cual - 0.2, [0, 0.6, 0], 0.95]];
  },
  plano(t) { let i = 0; for (let k = 0; k < this.planos.length; k++) if (t >= this.planos[k][0]) i = k; const P0 = this.planos[Math.max(0, i - 1)], P1 = this.planos[i]; const k = i ? ease(clamp((t - P1[0]) / 0.8)) : 1;
    return { c: new THREE.Vector3().fromArray(P0[1]).lerp(new THREE.Vector3().fromArray(P1[1]), k), z: lerp(P0[2], P1[2], k) }; },
  colocar(camO, x0, pl, t) { const dir = new THREE.Vector3(1.0, 1.2, 1.4).normalize(); const obj = pl.c.clone(); obj.x += x0; camO.position.copy(obj).addScaledVector(dir, 30); camO.lookAt(obj); camO.zoom = pl.z * (1 + 0.015 * Math.sin(t * 0.4)); camO.updateProjectionMatrix(); camO.updateMatrixWorld(); },
  mover(M, ruta, t, rapido) {
    const k = M.cam; k.reset(); const r = recorrido(ruta, t); k.g.position.set(r.x, 0, r.z);
    if (r.mueve) { k.g.rotation.y = r.dir; k.andar(t * (rapido ? 2.6 : 1.5), rapido ? 1.25 : 0.9); } else { k.g.rotation.y = r.x > 1.5 && r.z > 1 ? Math.PI / 2 : Math.atan2(P.C[0] - r.x, P.C[1] - r.z); k.respirar(t, 1); }
    return r;
  },
  actualizar(t) {
    const c = this.c, A = this.A, B = this.B;
    for (const M of [A, B]) { for (const p of M.gente) { p.reset(); p.respirar(t, p.g.position.x + (M.nfc ? 3 : 0)); if (Math.sin(t * 0.9 + p.g.position.x * 3) > 0.6) p.hablar(t + p.g.position.z); }
      M.coci.reset(); M.coci.andar(t * 0.4, 0.3); M.coci.g.position.x = 2.6 + Math.sin(t * 0.7) * 0.7; M.coci.g.rotation.y = Math.PI; }
    // SIN NFC
    const rA = this.mover(A, this.rutaA, t, true); const cliA = A.mesas.T4.pers[0];
    if (entre(t, c.arriba1, c.apunta) || t > c.arriba3) { cliA.bD.hombro.rotation.x = -2.9; cliA.bD.hombro.rotation.z = 0.15 * Math.sin(t * 9); }
    if (entre(t, c.apunta - 0.3, c.barra1 - 0.4)) { A.cam.bD.hombro.rotation.x = -1.0; A.cam.bD.codo.rotation.x = -1.2 + 0.15 * Math.sin(t * 14); A.cam.cabeza.rotation.x = 0.35; }
    A.libreta.visible = t > c.apunta - 0.4 && t < c.barra1;
    // CON NFC
    const rB = this.mover(B, this.rutaB, t, false); const cliB = B.mesas.T4.pers[0];
    const tocaT = entre(t, c.toca1 - 0.2, c.pidiendo), tocaP = entre(t, c.placa - 0.2, c.vibra + 0.3);
    if (tocaT || tocaP) { cliB.bD.hombro.rotation.x = -1.25; cliB.bD.codo.rotation.x = -0.2; cliB.bD.hombro.rotation.z = -0.25; }
    const obj = tocaT ? B.mesas.T4.tj : tocaP ? B.mesas.T4.placa : null;
    this.on.userData.actualizar(t, obj ? 1 : 0, cliB.bD.mano.getWorldPosition(new THREE.Vector3()), obj ? obj.userData.centro() : new THREE.Vector3());
    B.bandeja.visible = entre(t, c.pidiendo + 2.2, this.entregaB) || entre(t, c.vibra + 0.2, this.bravasB); if (B.bandeja.visible) { B.cam.bI.hombro.rotation.x = -0.2; B.cam.bI.codo.rotation.x = -1.45; }
    B.extras[0].visible = B.extras[1].visible = t > this.entregaB; B.extras[2].visible = t > this.bravasB;
    if (t > c.vibra + 1.4) { B.cam.bD.hombro.rotation.x = -0.4; B.cam.hablar(t, 0.6); }
    const pulso = Math.round((0.5 + 0.5 * Math.sin(t * 8)) * 4) / 4;
    B.pantB.userData.pintar('barra', t > c.pidiendo ? { nuevo: true, detalle: '2 × Caña', estado: 'A SERVIR', pulso } : { nuevo: false });
    B.pantK.userData.pintar('cocina', t > c.pidiendo ? { nuevo: true, detalle: '1 × Patatas bravas', estado: 'EN MARCHA', pulso } : { nuevo: false });
    B.movCam.userData.pantalla(entre(t, c.vibra - 0.1, c.vibra + 1.4) ? 'avisos' : entre(t, c.pidiendo, c.pidiendo + 2) ? 'pedidoCamarero' : 'bloqueo', entre(t, c.vibra - 0.1, c.vibra + 1.4) ? { mesa: 4, pulso } : {});
    if (entre(t, c.vibra - 0.1, c.vibra + 1.2)) B.cam.raiz.position.x += Math.sin(t * 90) * 0.012;
    this.distA = distanciaRecorrida(this.rutaA, t); this.distB = distanciaRecorrida(this.rutaB, t);
    const pl = this.plano(t); 
    this.colocar(this.camA, -20, pl, t); this.colocar(this.camB, 20, pl, t);
  },
  renderizar() {
    const w = renderer.domElement.width, h = renderer.domElement.height; renderer.setScissorTest(true); renderer.autoClear = true;
    renderer.setViewport(0, h / 2, w, h / 2); renderer.setScissor(0, h / 2, w, h / 2); renderer.render(scene, this.camA);
    renderer.setViewport(0, 0, w, h / 2); renderer.setScissor(0, 0, w, h / 2); renderer.render(scene, this.camB);
    renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h);
  },
  fx() { return {}; },
  proyectar(v, camO, abajo) { const p = v.clone().project(camO); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * (H / 2) + (abajo ? H / 2 : 0)]; },
  capa(t) {
    const c = this.c, A = this.A, B = this.B;
    // división y etiquetas
    C.save(); C.fillStyle = 'rgba(255,255,255,0.95)'; C.fillRect(0, H / 2 - 3, W, 6); C.restore();
    const etiqueta = (txt, y, color) => { C.save(); C.font = `900 46px Inter, ${FUENTE}`; const w = C.measureText(txt).width + 64; C.fillStyle = color; C.shadowColor = 'rgba(0,0,0,0.3)'; C.shadowBlur = 20; rr(C, 40, y - 38, w, 76, 38); C.fill(); C.shadowBlur = 0; C.fillStyle = '#fff'; C.textAlign = 'left'; C.textBaseline = 'middle'; C.fillText(txt, 72, y + 2); C.restore(); };
    etiqueta('SIN NFC', 90, '#e5484d'); etiqueta('CON NFC', H / 2 + 90, '#22a55b');
    // recorrido del camarero (de la propia animación)
    const metros = (d, y) => { C.save(); C.font = `700 32px Inter, ${FUENTE}`; C.textAlign = 'right'; C.fillStyle = 'rgba(20,20,30,0.75)'; const tx = `Camarero: ${Math.round(d * 1.6)} m`; const w = C.measureText(tx).width + 44; rr(C, W - 40 - w, y - 30, w, 60, 30); C.fill(); C.fillStyle = '#fff'; C.textBaseline = 'middle'; C.fillText(tx, W - 62, y + 2); C.restore(); };
    if (t > c.nfc) { metros(this.distA, 90); metros(this.distB, H / 2 + 90); }
    // globo de la mesa 4
    const globo = (txt, M, camO, abajo, color, k = 1) => { if (k <= 0) return; const v = new THREE.Vector3(P.T4[0] + M.g.position.x, 2.3, P.T4[1]); const [x, y] = this.proyectar(v, camO, abajo); pildora(txt, x, y, k, { tono: color, tam: 34 }); };
    if (entre(t, c.arriba1, c.apunta)) globo(`Esperando ${relojMS((t - c.arriba1) * 18)}`, A, this.camA, false, 'rojo', entra(t, c.arriba1));
    if (t > c.arriba3) globo(`Esperando ${relojMS((t - c.arriba3) * 18)}`, A, this.camA, false, 'rojo', entra(t, c.arriba3));
    if (entre(t, c.pidiendo, c.pidiendo + 3)) globo('Pedido enviado', B, this.camB, true, 'marca', entra(t, c.pidiendo));
    if (entre(t, c.vibra, c.vibra + 2.5)) { const v = B.cam.g.position.clone(); v.y = 2.6; const [x, y] = this.proyectar(v, this.camB, true); pildora('Mesa 4 te llama', x, y, entra(t, c.vibra), { icono: 'campana', tono: 'rojo', tam: 32 }); }
    if (entre(t, c.bebidas, c.otra)) { const v = new THREE.Vector3(-1.3 + 20, 2.4, -2.75); const [x, y] = this.proyectar(v, this.camB, true); pildora('Bebidas → barra', x, y, entra(t, c.bebidas), { tono: 'azul', tam: 30 }); }
    if (entre(t, c.comida, c.otra)) { const v = new THREE.Vector3(2.4 + 20, 2.4, -2.45); const [x, y] = this.proyectar(v, this.camB, true); pildora('Comida → cocina', x, y, entra(t, c.comida), { icono: 'cocina', tono: 'azul', tam: 30 }); }
    if (entre(t, c.apunta, c.barra1)) { const v = A.cam.g.position.clone(); v.y = 2.6; const [x, y] = this.proyectar(v, this.camA, false); pildora('Apuntando…', x, y, entra(t, c.apunta), { tono: 'oscuro', tam: 30 }); }
    // final
    if (t > c.cual - 0.1) { const k = prog(t, c.cual - 0.1, c.cual + 0.3); C.save(); C.fillStyle = `rgba(10,12,22,${0.55 * k})`; C.fillRect(0, 0, W, H); C.restore();
      if (t < c.sigueme) { C.save(); C.globalAlpha = k; C.fillStyle = '#fff'; C.textAlign = 'center'; C.font = `800 76px Fraunces, serif`; C.shadowColor = 'rgba(0,0,0,0.5)'; C.shadowBlur = 30; C.fillText('¿En cuál', W / 2, H / 2 - 30); C.fillText('preferirías trabajar?', W / 2, H / 2 + 60); C.restore(); }
      else { const kb = rebote(clamp((t - c.sigueme) / 0.45)); C.save(); C.fillStyle = `rgba(10,12,22,${0.35 * k})`; C.fillRect(0, 0, W, H); C.restore(); logoVisax(C, W / 2 - 70, 640, 140);
        C.save(); C.translate(W / 2, 960); C.scale(kb, kb); C.fillStyle = grad(C, -250, 0, 250, 0, [VX.cian, VX.azul, VX.violeta]); C.shadowColor = 'rgba(0,0,0,0.4)'; C.shadowBlur = 40; rr(C, -250, -75, 500, 150, 75); C.fill(); C.shadowBlur = 0;
        C.fillStyle = '#fff'; C.font = `900 64px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText('+ Sígueme', 0, 4); C.restore();
        C.save(); C.globalAlpha = prog(t, c.sigueme + 0.3, c.sigueme + 0.7); C.fillStyle = '#fff'; C.textAlign = 'center'; C.font = `italic 600 50px Fraunces, serif`; C.fillText('para ver más', W / 2, 1110); C.restore(); }
    }
    if (t < c.nfc + 0.2) { C.save(); C.globalAlpha = 1 - prog(t, c.nfc - 0.3, c.nfc + 0.2); C.fillStyle = '#fff'; C.font = `800 30px Inter, ${FUENTE}`; C.textAlign = 'right'; C.fillText('SÁBADO · 22:30', W - 50, 100); C.fillText('SÁBADO · 22:30', W - 50, H / 2 + 100); C.restore(); }
  },
};
// ---------- 11. Misma calle, dos bares: uno siempre lleno (noche isométrica, estilo "sistema") ----------
function edificiosNoche(scene) {
  const g = new THREE.Group(); scene.add(g);
  const ven = lienzo(128, 256, (x, w, h) => { x.fillStyle = '#0d111c'; x.fillRect(0, 0, w, h); for (let yy = 10; yy < h; yy += 22) for (let xx = 8; xx < w; xx += 20) { const on = ((xx * 13 + yy * 7) % 9) < 3; x.fillStyle = on ? ((xx + yy) % 3 ? 'rgba(255,200,120,0.9)' : 'rgba(150,200,255,0.75)') : 'rgba(30,38,58,1)'; x.fillRect(xx, yy, 9, 12); } });
  ven.tex.wrapS = ven.tex.wrapT = THREE.RepeatWrapping;
  const matV = new THREE.MeshStandardMaterial({ color: '#ffffff', map: ven.tex, emissiveMap: ven.tex, emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.8 });
  const techo = new THREE.MeshStandardMaterial({ color: '#141926', roughness: 0.9 });
  let s = 11; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const sitios = [];
  for (let x = -28; x <= 28; x += 7) for (const z of [-11, -18, -25]) sitios.push([x, z, 1]);            // detrás, altos
  for (const x of [-21, -28, 21, 28]) for (const z of [-4, 3]) sitios.push([x, z, 0.6]);                   // a los lados
  for (let x = -28; x <= 28; x += 7) for (const z of [17, 24]) sitios.push([x, z, 0.25]);                  // delante, bajos
  for (const [x, z, alto] of sitios) {
    const w = 4.5 + rnd() * 1.8, d = 4.5 + rnd() * 1.6, h = (2.2 + rnd() * 6) * alto + 0.8;
    const geo = new THREE.BoxGeometry(w, h, d); const m = new THREE.Mesh(geo, [matV, matV, techo, techo, matV, matV]); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; g.add(m);
  }
  const asfalto = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#0a0d14', roughness: 0.95 })); asfalto.rotation.x = -Math.PI / 2; asfalto.position.y = -0.52; asfalto.receiveShadow = true; g.add(asfalto);
  // calle entre los dos bares con líneas y farolas
  for (let z = -20; z < 20; z += 2.2) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.0), new THREE.MeshBasicMaterial({ color: '#4a5266' })); l.rotation.x = -Math.PI / 2; l.position.set(0, -0.5, z); g.add(l); }
  for (const z of [-6, 0, 6]) for (const x of [-1.3, 1.3]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 8), new THREE.MeshStandardMaterial({ color: '#2a2f3a' })); p.position.set(x, 1.1, z); g.add(p);
    const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBokeh.tex, color: '#ffd9a0', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); b.scale.set(1.3, 1.3, 1); b.position.set(x, 2.75, z); g.add(b); }
  return g;
}
function neonRect(g, w, d, color) {
  const pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [-w / 2, -d / 2]].map(([x, z]) => new THREE.Vector3(x, 0.02, z));
  const tubo = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), 64, 0.06, 6, false), new THREE.MeshBasicMaterial({ color, toneMapped: false })); g.add(tubo); return tubo;
}
function titular(l1, l2, clave, k, color = VX.cian, y = 230) {
  if (k <= 0) return; C.save(); C.textAlign = 'center'; C.textBaseline = 'middle'; const tam = 78; C.font = `900 ${tam}px Inter, ${FUENTE}`;
  const s = lerp(0.85, 1, rebote(clamp(k))); C.translate(W / 2, y); C.scale(s, s); C.globalAlpha = clamp(k * 2);
  const linea = (txt, yy) => { const ws = txt.split(' '); const anchos = ws.map(w => C.measureText(w).width); const esp = C.measureText(' ').width; const tot = anchos.reduce((a, b) => a + b, 0) + esp * (ws.length - 1); let x = -tot / 2;
    ws.forEach((w, i) => { const limpio = norm(w); const es = clave && clave.split(' ').map(norm).includes(limpio);
      if (es) { C.fillStyle = color; rr(C, x - 10, yy - tam * 0.55, anchos[i] + 20, tam * 1.1, 10); C.fill(); C.fillStyle = '#04120f'; } else { C.fillStyle = '#fff'; C.shadowColor = 'rgba(0,0,0,0.7)'; C.shadowBlur = 24; }
      C.fillText(w, x + anchos[i] / 2, yy + 3); C.shadowBlur = 0; x += anchos[i] + esp; }); };
  linea(l1, 0); if (l2) linea(l2, tam * 1.05); C.restore();
}
function pestanas(lista, activa, k = 1) { if (k <= 0) return; C.save(); C.globalAlpha = k; C.font = `800 22px Inter, ${FUENTE}`; C.textBaseline = 'middle'; C.letterSpacing = '5px'; const sep = '  ·  ';
  const tot = lista.map(t => C.measureText(t).width).reduce((a, b) => a + b, 0) + C.measureText(sep).width * (lista.length - 1); let x = W / 2 - tot / 2;
  lista.forEach((t, i) => { C.fillStyle = i === activa ? VX.cian : i < activa ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.28)'; C.textAlign = 'left'; C.fillText(t, x, 110); x += C.measureText(t).width; if (i < lista.length - 1) { C.fillStyle = 'rgba(255,255,255,0.3)'; C.fillText(sep, x, 110); x += C.measureText(sep).width; } }); C.restore(); }
function chip(txt, X, Y, k, color = VX.cian) { if (k <= 0) return; C.save(); C.globalAlpha = clamp(k * 2); C.font = `800 26px "DejaVu Sans Mono", monospace`; const w = C.measureText(txt).width + 54; C.fillStyle = 'rgba(8,12,20,0.85)'; rr(C, X - w / 2, Y - 24, w, 48, 10); C.fill(); C.strokeStyle = color; C.lineWidth = 2; rr(C, X - w / 2, Y - 24, w, 48, 10); C.stroke();
  C.fillStyle = color; C.beginPath(); C.arc(X - w / 2 + 20, Y, 6, 0, 7); C.fill(); C.fillStyle = '#e9f6ff'; C.textAlign = 'left'; C.textBaseline = 'middle'; C.fillText(txt, X - w / 2 + 36, Y + 1); C.restore(); }

V['calle'] = { ...comunCapa, subtitulos: () => {}, estilo: 'nocheIso',
  async montar() {
    for (const [f, peso, est] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: est }); await ff.load(); document.fonts.add(ff); }
    scene.background = new THREE.Color('#05070d'); scene.fog = new THREE.Fog('#05070d', 30, 70); pared.visible = suelo.visible = bokeh.visible = false;
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0; hemi.color.set('#5a6a9a'); hemi.groundColor.set('#0a0c14'); hemi.intensity = 0.45;
    const luna = new THREE.DirectionalLight('#8fa6ff', 0.55); luna.position.set(-10, 20, 12); luna.castShadow = true; luna.shadow.mapSize.set(2048, 2048); Object.assign(luna.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 }); scene.add(luna);
    edificiosNoche(scene);
    this.A = construirMaqueta(scene, { nfc: true, x0: -6, tarjetaMenu, placaCuadrada, pantalla3D, movil });
    this.B = construirMaqueta(scene, { nfc: false, x0: 6, tarjetaMenu, placaCuadrada, pantalla3D, movil });
    // el ganador: neón y luz cálida; el otro, en penumbra y medio vacío
    neonRect(this.A.g, 9.6, 7.8, '#33e6ff'); this.neon = neonRect(this.A.g, 9.9, 8.1, '#7c5cff');
    for (const [x, z] of [[-2.5, 0.5], [1.5, 0.5], [0, 2.5]]) { const l = new THREE.PointLight('#ffc37a', 7, 7, 1.4); l.position.set(x, 3, z); this.A.g.add(l); }
    const lb = new THREE.PointLight('#ffb36b', 1.2, 6, 1.6); lb.position.set(0, 3, 0); this.B.g.add(lb);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBokeh.tex, color: '#33e6ff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(16, 16, 1); halo.position.set(-6, 0.3, 0); scene.add(halo); this.halo = halo;
    this.B.gente.forEach((p, i) => { const t4 = this.B.mesas.T4.pers.includes(p), t1 = this.B.mesas.T1.pers.includes(p); if (!t4 && !t1 && p !== this.B.coci) p.g.visible = false; });
    this.on = ondas();
    const c = this.c = { calle: cue('calle'), dos: cue('dos'), mesas: cue('mesas'), precios: cue('precios'), lleno: cue('lleno'), sabes: cue('sabes'), sistema: cue('sistema'), piden: cue('piden'), tocan: cue('tocan'), carta: cue('carta'),
      descargar: cue('descargar'), pedido: cue('pedido'), bebidas: cue('bebidas'), comida: cue('comida'), cocina: cue('cocina'), necesitan: cue('necesitan'), placa: cue('placa'), vibra: cue('vibra'), irse: cue('irse'),
      resena: cue('resena'), toques: cue('toques'), mientras: cue('mientras'), enfrente: cue('enfrente'), libreta: cue('libreta'), levantada: cue('levantada'), comenta: cue('comenta') };
    this.musica = 'ambient_b'; this.volMusica = 0.6;
    efectos = [['whoosh', 0.02], ['pop', c.dos], ['pop', c.mesas], ['pop', c.precios], ['whoosh', c.lleno - 0.2], ['tick', c.sabes], ['riser', c.sistema - 0.8], ['hit', c.sistema], ['whoosh', c.piden - 0.1], ['tap', c.tocan + 0.2], ['ding', c.carta],
      ['pop', c.descargar], ['whoosh', c.pedido - 0.1], ['ding', c.bebidas + 0.2], ['ding', c.comida + 0.2], ['whoosh', c.necesitan - 0.1], ['tap', c.placa], ['buzz', c.vibra], ['whoosh', c.irse - 0.1], ['ding', c.resena + 0.3], ['pop', c.toques],
      ['whoosh', c.mientras - 0.15], ['tick', c.libreta], ['pop', c.levantada], ['whoosh', c.comenta - 0.4], ['pop', c.comenta + 0.5]];
    const T4A = [-6 + 2.9, 0.9, 1.7], T4B = [6 + 2.9, 0.9, 1.7];
    this.tomas = [
      { a: 0, de: [18, 24, 28], a2: [14, 19, 23], mira: [0, 0, 0], mira2: [0, 0, 0], fov: 38, barrido: 0 },
      { a: c.mesas - 0.2, de: [-16, 15, 20], a2: [-13, 13, 18], mira: [0, 0, 0], mira2: [0, 0, 0], fov: 38 },
      { a: c.lleno - 0.3, de: [2, 11, 13], a2: [0, 9, 11], mira: [-6, 0.5, 0], mira2: [-6, 0.5, 0], fov: 38 },
      { a: c.sistema - 0.1, de: [-2, 9, 11], a2: [-2.5, 8, 10], mira: [-6, 0.5, 0.3], mira2: [-6, 0.5, 0.3], fov: 40 },
      { a: c.piden - 0.1, de: [0.8, 3.4, 5.6], a2: [0.4, 3.0, 5.0], mira: T4A, mira2: T4A, fov: 36 },
      { a: c.pedido - 0.1, de: [-2.2, 4.6, 3.6], a2: [-2.6, 4.2, 3.2], mira: [-6.3, 1.2, -2.6], mira2: [-6.3, 1.2, -2.6], fov: 42 },
      { a: c.necesitan - 0.1, de: [0.2, 4.2, 6.4], a2: [-0.4, 3.8, 5.8], mira: [-4.3, 1.0, 0.4], mira2: [-4.3, 1.0, 0.8], fov: 40 },
      { a: c.irse - 0.1, de: [0.8, 3.4, 5.6], a2: [0.3, 3.1, 5.2], mira: T4A, mira2: T4A, fov: 36 },
      { a: c.mientras - 0.15, de: [12, 10, 12], a2: [11, 9, 11], mira: [6, 0.5, 0], mira2: [6, 0.5, 0], fov: 40 },
      { a: c.libreta - 0.2, de: [12.6, 4.2, 7.0], a2: [12.2, 3.9, 6.4], mira: [8.4, 1.9, 1.2], mira2: [8.5, 1.9, 1.3], fov: 40 },
    ];
    const S = p => [p[0] + 0.95, p[1]];
    this.rutaA = [[0, ...P.B], [c.vibra, ...P.B], [c.vibra + 1.6, 1.95, 1.7], [99, 1.95, 1.7]];
    this.rutaB = [[0, ...S(P.T1)], [c.mientras, ...S(P.T1)], [c.mientras + 1.2, ...P.B], [c.libreta - 0.6, ...S(P.T1)], [99, ...S(P.T1)]];
  },
  actualizar(t) {
    const c = this.c, A = this.A, B = this.B;
    for (const M of [A, B]) { for (const p of M.gente) { p.reset(); p.respirar(t, p.g.position.x); if (Math.sin(t * 1.1 + p.g.position.x * 3) > 0.4 && M === A) p.hablar(t + p.g.position.z); }
      M.coci.reset(); M.coci.andar(t * 0.4, 0.3); M.coci.g.position.x = 2.6 + Math.sin(t * 0.7) * 0.7; M.coci.g.rotation.y = Math.PI; }
    const mueve = (M, ruta, rapido) => { const k = M.cam; k.reset(); const r = recorrido(ruta, t); k.g.position.set(r.x, 0, r.z); if (r.mueve) { k.g.rotation.y = r.dir; k.andar(t * (rapido ? 2.5 : 1.5), rapido ? 1.2 : 0.9); } else { k.g.rotation.y = r.x > 1.5 && r.z > 1 ? Math.PI / 2 : Math.atan2(P.C[0] - r.x, P.C[1] - r.z); k.respirar(t, 1); } };
    mueve(A, this.rutaA, false); mueve(B, this.rutaB, true);
    // ganador: cliente toca tarjeta, luego placa; reseña al irse
    const cli = A.mesas.T4.pers[0]; const tocaT = entre(t, c.tocan - 0.1, c.descargar), tocaP = entre(t, c.placa - 0.2, c.vibra + 0.4), tocaR = entre(t, c.resena - 0.3, c.toques + 0.4);
    if (tocaT || tocaP || tocaR) { cli.bD.hombro.rotation.x = -1.25; cli.bD.codo.rotation.x = -0.2; cli.bD.hombro.rotation.z = -0.25; }
    const obj = tocaT ? A.mesas.T4.tj : tocaP ? A.mesas.T4.placa : null;
    this.on.userData.actualizar(t, obj ? 1 : 0, cli.bD.mano.getWorldPosition(new THREE.Vector3()), obj ? obj.userData.centro() : new THREE.Vector3());
    const pulso = Math.round((0.5 + 0.5 * Math.sin(t * 8)) * 4) / 4;
    A.pantB.userData.pintar('barra', t > c.bebidas - 0.2 ? { nuevo: true, detalle: '2 × Caña', estado: 'A SERVIR', pulso } : { nuevo: false });
    A.pantK.userData.pintar('cocina', t > c.comida - 0.2 ? { nuevo: true, detalle: '1 × Patatas bravas', estado: 'EN MARCHA', pulso } : { nuevo: false });
    A.movCam.userData.pantalla(entre(t, c.vibra - 0.1, c.vibra + 1.6) ? 'avisos' : 'bloqueo', entre(t, c.vibra - 0.1, c.vibra + 1.6) ? { mesa: 7, pulso } : {});
    if (entre(t, c.vibra - 0.1, c.vibra + 1.0)) A.cam.raiz.position.x += Math.sin(t * 90) * 0.015;
    A.extras[0].visible = A.extras[1].visible = t > c.necesitan; A.extras[2].visible = t > c.irse;
    // perdedor: mano levantada y camarero con libreta
    const cB = B.mesas.T4.pers[0]; if (t > c.mientras) { cB.bD.hombro.rotation.x = -2.9; cB.bD.hombro.rotation.z = 0.15 * Math.sin(t * 9); }
    B.libreta.visible = true; if (t > c.libreta - 0.6) { B.cam.bD.hombro.rotation.x = -1.0; B.cam.bD.codo.rotation.x = -1.2 + 0.15 * Math.sin(t * 14); B.cam.cabeza.rotation.x = 0.35; }
    this.halo.material.opacity = 0.25 + 0.15 * Math.sin(t * 2) + (t > c.sistema ? 0.15 : 0); this.neon.material.color.setHSL(0.72 + 0.05 * Math.sin(t * 1.5), 1, 0.6);
    this.desenfoque = camara2(t, this.tomas);
  },
  fx(t) { const c = this.c; let flash = 0, temblor = 0; for (const g of [c.sistema, c.mientras - 0.1]) { const d = t - g; if (d >= 0 && d < 0.3) { flash = Math.max(flash, 0.35 * (1 - d / 0.3)); temblor = Math.max(temblor, 10 * (1 - d / 0.3)); } } return { desenfoque: this.desenfoque, flash, temblor }; },
  proy(v) { const p = v.clone().project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z < 1]; },
  capa(t) {
    const c = this.c, A = this.A;
    const g1 = C.createLinearGradient(0, 0, 0, 520); g1.addColorStop(0, 'rgba(3,5,10,0.85)'); g1.addColorStop(1, 'rgba(3,5,10,0)'); C.fillStyle = g1; C.fillRect(0, 0, W, 520);
    // titulares de dos líneas (palabra clave resaltada)
    const T = (a, b, l1, l2, clave, color) => { if (entre(t, a, b)) titular(l1, l2, clave, prog(t, a - 0.05, a + 0.25), color); };
    T(0, c.mesas - 0.15, 'Misma calle.', t > c.dos - 0.1 ? 'Dos bares.' : '', 'bares');
    T(c.mesas - 0.15, c.lleno - 0.4, 'Mismas mesas.', t > c.precios - 0.1 ? 'Mismos precios.' : '', '');
    T(c.lleno - 0.4, c.sabes - 0.2, 'Pero uno siempre', 'está lleno.', 'lleno');
    T(c.sabes - 0.2, c.sistema - 0.1, '¿Por qué?', '', '');
    T(c.sistema - 0.1, c.piden - 0.2, 'Tiene un', 'sistema.', 'sistema');
    T(c.piden - 0.2, c.descargar - 0.2, 'Piden', 'solos.', 'solos');
    T(c.descargar - 0.2, c.pedido - 0.2, 'Sin descargar', 'nada.', 'nada');
    T(c.pedido - 0.2, c.necesitan - 0.2, t > c.comida - 0.2 ? 'Comida → cocina.' : 'Bebidas → barra.', '', t > c.comida - 0.2 ? 'cocina' : 'barra');
    T(c.necesitan - 0.2, c.irse - 0.2, '¿Necesitan algo?', t > c.vibra - 0.2 ? 'Le vibra el móvil.' : '', 'vibra móvil');
    T(c.irse - 0.2, c.mientras - 0.2, 'Reseña en Google', 'en dos toques.', 'dos toques');
    T(c.mientras - 0.2, c.libreta - 0.2, 'Mientras tanto,', 'enfrente…', 'enfrente', '#f5a524');
    if (t > c.libreta - 0.2) titular('Libreta', t > c.levantada - 0.3 ? 'y mano levantada.' : '', 'libreta', prog(t, c.libreta - 0.25, c.libreta + 0.05), '#f5a524');
    // pestañas del sistema
    if (entre(t, c.piden - 0.2, c.mientras - 0.2)) pestanas(['CARTA', 'PEDIDO', 'CAMARERO', 'RESEÑA'], t < c.pedido - 0.2 ? 0 : t < c.necesitan - 0.2 ? 1 : t < c.irse - 0.2 ? 2 : 3, prog(t, c.piden - 0.2, c.piden + 0.2));
    // etiquetas sobre el 3D
    if (entre(t, c.dos - 0.1, c.sistema)) { const [x1, y1] = this.proy(new THREE.Vector3(-6, 3.2, -3)); const [x2, y2] = this.proy(new THREE.Vector3(6, 3.2, -3)); chip('BAR 1', x1, y1, entra(t, c.dos)); chip('BAR 2', x2, y2, entra(t, c.dos + 0.2), '#f5a524');
      if (t > c.precios - 0.1) { const [a, b] = this.proy(new THREE.Vector3(-3, 0.5, 4)); const [d, e] = this.proy(new THREE.Vector3(9, 0.5, 4)); chip('CAÑA 2,50 €', a, b, entra(t, c.precios)); chip('CAÑA 2,50 €', d, e, entra(t, c.precios + 0.1), '#f5a524'); } }
    const T4A = new THREE.Vector3(-6 + 2.9, 2.6, 1.7);
    if (entre(t, c.tocan, c.pedido - 0.2)) { const [x, y, ok] = this.proy(T4A); if (ok) chip('MESA 7 · CARTA ABIERTA', x, y - 40, entra(t, c.tocan + 0.2)); }
    if (entre(t, c.pedido - 0.1, c.necesitan - 0.2)) { const [x, y] = this.proy(new THREE.Vector3(-6 - 1.3, 2.6, -2.75)); chip('BARRA · 2 × CAÑA', x, y, entra(t, c.bebidas)); if (t > c.comida - 0.2) { const [x2, y2] = this.proy(new THREE.Vector3(-6 + 2.4, 2.6, -2.45)); chip('COCINA · BRAVAS', x2, y2, entra(t, c.comida)); } }
    if (entre(t, c.vibra - 0.1, c.irse - 0.2)) { const v = A.cam.g.getWorldPosition(new THREE.Vector3()); v.y = 2.6; const [x, y] = this.proy(v); chip('MESA 7 TE LLAMA', x, y, entra(t, c.vibra), '#ff4d5e'); }
    // móvil 2D del cliente (carta y reseña)
    if (entre(t, c.tocan + 0.2, c.pedido - 0.2)) movil2D(lerp(W + 420, 800, entra(t, c.tocan + 0.2, 0.5)), 1300, 0.62, 0.06, 'cartaV', { sel: t > c.descargar ? 1 : 0 });
    if (entre(t, c.resena - 0.3, c.mientras - 0.2)) { const ll = t > c.toques - 0.2 ? Math.min(5, Math.floor((t - c.toques + 0.2) / 0.12) + 1) : 0; movil2D(lerp(W + 420, 800, entra(t, c.resena - 0.3, 0.5)), 1300, 0.62, 0.06, 'resenaG', { llenas: ll }); }
    // enfrente: el bar 2 a oscuras
    if (entre(t, c.mientras + 0.2, 99)) { const [x, y, ok] = this.proy(new THREE.Vector3(6 + 2.9, 2.6, 1.7)); if (ok && t > c.levantada - 0.4) chip(`MESA 4 · ESPERANDO ${relojMS(14 * 60 + (t - c.levantada) * 8)}`, x, Math.max(y - 20, 470), entra(t, c.levantada - 0.4), '#ff4d5e'); }
    cierreComenta(t, c.comenta - 0.3, 'SISTEMA', 'y te lo enseñamos en tu bar');
  },
};
// ---------- 12. "Llevas años usando NFC sin saberlo": 5 usos, estudio de producto con podio giratorio ----------
PANT.okVerde = (x, w, h, s) => {
  x.fillStyle = '#0b1410'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#22c55e'; x.beginPath(); x.arc(w / 2, 420, 120 * (s.k ?? 1), 0, 7); x.fill(); check(x, w / 2 - 10, 420, 5.5 * (s.k ?? 1));
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `800 52px ${SANS}`; x.fillText(s.titulo || 'Hecho', w / 2, 640);
  x.fillStyle = 'rgba(255,255,255,0.65)'; x.font = `600 32px ${SANS}`; x.fillText(s.sub || '', w / 2, 700);
};
function texCarta(dibujar, w = 512, h = 320) { return lienzo(w, h, dibujar).tex; }
function objetoPago() {
  const g = new THREE.Group();
  const cuerpo = caja(0.62, 1.05, 0.3, '#262a33', 0.08); cuerpo.position.y = 0.55; cuerpo.rotation.x = -0.18; g.add(cuerpo);
  const pant = lienzo(256, 200); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.36), new THREE.MeshBasicMaterial({ map: pant.tex, toneMapped: false })); p.position.set(0, 0.2, 0.152); cuerpo.add(p);
  for (let i = 0; i < 12; i++) { const k = caja(0.1, 0.07, 0.04, '#4a505e', 0.02); k.position.set(-0.13 + (i % 3) * 0.13, -0.12 - Math.floor(i / 3) * 0.1, 0.15); cuerpo.add(k); }
  g.userData.pintar = (ok, k) => pant.pintar('p' + ok + Math.round(k * 10), (x, w, h) => { x.fillStyle = ok ? '#0d3b22' : '#e9eef5'; x.fillRect(0, 0, w, h); x.textAlign = 'center';
    if (ok) { x.fillStyle = '#22c55e'; x.beginPath(); x.arc(w / 2, 80, 42 * k, 0, 7); x.fill(); check(x, w / 2 - 3, 80, 2 * k); x.fillStyle = '#fff'; x.font = `800 30px ${SANS}`; x.fillText('PAGADO', w / 2, 170); }
    else { x.fillStyle = '#1a1f2b'; x.font = `600 26px ${SANS}`; x.fillText('Total', w / 2, 60); x.font = `900 58px ${SANS}`; x.fillText('3,50 €', w / 2, 130); x.fillStyle = '#3f7dfb'; x.font = `700 22px ${SANS}`; x.fillText('Acerque la tarjeta', w / 2, 180); } });
  g.userData.punto = () => p.getWorldPosition(new THREE.Vector3());
  return g;
}
function objetoDNI() {
  const g = new THREE.Group();
  const tex = texCarta((x, w, h) => { const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#dff3ff'); gr.addColorStop(1, '#bfe0d6'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1d3b5c'; x.font = `900 54px ${SANS}`; x.textAlign = 'left'; x.fillText('DNI', 30, 70); x.font = `600 18px ${SANS}`; x.fillStyle = 'rgba(29,59,92,0.6)'; x.fillText('DOCUMENTO DE EJEMPLO', 150, 64);
    x.fillStyle = '#9fb3c8'; rr(x, 30, 100, 130, 170, 12); x.fill(); x.fillStyle = '#e8eef4'; x.beginPath(); x.arc(95, 160, 32, 0, 7); x.fill(); x.beginPath(); x.ellipse(95, 250, 52, 34, 0, Math.PI, 0); x.fill();
    x.fillStyle = 'rgba(29,59,92,0.35)'; for (let i = 0; i < 5; i++) rr(x, 190, 110 + i * 32, 200 - i * 18, 14, 7), x.fill();
    x.fillStyle = '#d9a441'; rr(x, 400, 190, 80, 64, 10); x.fill(); x.strokeStyle = '#a77a26'; x.lineWidth = 3; x.beginPath(); x.moveTo(440, 190); x.lineTo(440, 254); x.moveTo(400, 222); x.lineTo(480, 222); x.stroke(); });
  const carta = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.8, 0.03, 3, 0.012), [mat0('#e8eef4'), mat0('#e8eef4'), mat0('#e8eef4'), mat0('#e8eef4'), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }), mat0('#e8eef4')]);
  carta.position.y = 0.62; carta.rotation.x = -0.25; carta.castShadow = true; g.add(carta);
  const pie = caja(0.6, 0.16, 0.3, '#d6dbe3', 0.05); pie.position.y = 0.08; g.add(pie);
  g.userData.punto = () => carta.localToWorld(new THREE.Vector3(0.36, -0.07, 0.02));
  return g;
}
function objetoTorno() {
  const g = new THREE.Group();
  const poste = caja(0.42, 1.25, 0.42, '#d9dde2', 0.06); poste.position.y = 0.625; g.add(poste);
  const lector = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 32), new THREE.MeshStandardMaterial({ color: '#1d2230', emissive: '#22c55e', emissiveIntensity: 0 })); lector.rotation.x = Math.PI / 2 - 0.5; lector.position.set(0, 1.18, 0.12); g.add(lector);
  const brazos = new THREE.Group(); brazos.position.set(0.21, 0.85, 0); g.add(brazos);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 12), mat0('#9aa3ab')); b.rotation.z = Math.PI / 2; b.position.x = 0.35; const piv = new THREE.Group(); piv.rotation.x = i * Math.PI * 2 / 3; piv.add(b); brazos.add(piv); }
  const abono = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.35, 0.015, 3, 0.01), new THREE.MeshStandardMaterial({ map: texCarta((x, w, h) => { const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#ff7a1a'); gr.addColorStop(1, '#e8337a'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = `900 64px ${SANS}`; x.fillText('ABONO', 30, 120); x.font = `600 28px ${SANS}`; x.fillText('Transporte · ejemplo', 30, 175); }) }));
  g.add(abono);
  g.userData = { lector, brazos, abono, punto: () => lector.getWorldPosition(new THREE.Vector3()) };
  return g;
}
function objetoHotel() {
  const g = new THREE.Group();
  const marco = caja(1.25, 2.15, 0.12, '#e9dcc4', 0.03); marco.position.y = 1.07; g.add(marco);
  const bisagra = new THREE.Group(); bisagra.position.set(-0.55, 0, 0.08); g.add(bisagra);
  const puerta = caja(1.1, 2.0, 0.07, '#8a4b2b', 0.03); puerta.position.set(0.55, 1.02, 0); bisagra.add(puerta);
  const cerradura = caja(0.16, 0.36, 0.05, '#2b2f3a', 0.02); cerradura.position.set(0.95, 1.05, 0.06); bisagra.add(cerradura);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff3b3b', toneMapped: false })); led.position.set(0.95, 1.18, 0.09); bisagra.add(led);
  const llave = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.27, 0.012, 3, 0.01), new THREE.MeshStandardMaterial({ map: texCarta((x, w, h) => { x.fillStyle = '#1b2a4a'; x.fillRect(0, 0, w, h); x.fillStyle = '#d9b26a'; x.font = `800 60px Fraunces, serif`; x.fillText('HOTEL', 40, 130); x.font = `600 28px ${SANS}`; x.fillText('Habitación 207', 40, 190); }) }));
  g.add(llave);
  g.userData = { bisagra, led, llave, punto: () => cerradura.getWorldPosition(new THREE.Vector3()) };
  return g;
}
function objetoBar() {
  const g = new THREE.Group();
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 40), mat0('#fbf6ee')); tapa.position.y = 0.62; g.add(tapa);
  const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 12), mat0('#6b3a22')); pata.position.y = 0.3; g.add(pata);
  const tj = tarjetaMenu(); tj.scale.setScalar(0.62); tj.position.set(-0.1, 0.645, -0.15); g.add(tj);
  const cc = cana(); cc.scale.setScalar(1.6); cc.position.set(0.42, 0.645, 0.15); g.add(cc);
  g.userData = { tj, punto: () => tj.userData.centro() };
  return g;
}
const FONDOS = [['#1b1f3a', '#3b2a6b'], ['#d6f8e8', '#7fe0b8'], ['#d8ebff', '#8fbaff'], ['#ffe6d1', '#ffb48a'], ['#ece3ff', '#b9a3ff'], ['#fff3d1', '#ffc96b'], ['#14182e', '#2a1d55']];
V['usos'] = { ...comunCapa,
  async montar() {
    for (const [f, peso, est] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: est }); await ff.load(); document.fonts.add(ff); }
    ['nfc', 'chip', 'dni', 'abono', 'hotel', 'carta', 'centimetros', 'movil', 'super'].forEach(w => CLAVES.add(w));
    pared.visible = suelo.visible = bokeh.visible = false; scene.fog = null;
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0; hemi.color.set('#ffffff'); hemi.groundColor.set('#c8c0d8'); hemi.intensity = 1.5;
    const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(3, 6, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 20 }); key.shadow.radius = 4; scene.add(key);
    const rim = new THREE.DirectionalLight('#c9b8ff', 1.2); rim.position.set(-4, 3, -3); scene.add(rim);
    this.fondo = document.createElement('canvas'); this.fondo.width = 16; this.fondo.height = 256; this.texF = new THREE.CanvasTexture(this.fondo); this.texF.colorSpace = THREE.SRGBColorSpace; scene.background = this.texF;
    const podio = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.32, 64), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 })); podio.position.y = -0.16; podio.receiveShadow = true; podio.castShadow = true; mundo.add(podio); this.podio = podio;
    const aro = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.015, 8, 96), new THREE.MeshBasicMaterial({ color: VX.cian, toneMapped: false })); aro.rotation.x = Math.PI / 2; aro.position.y = 0.0; mundo.add(aro);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.18 })); sombra.rotation.x = -Math.PI / 2; sombra.position.y = -0.32; sombra.receiveShadow = true; mundo.add(sombra);
    this.objs = [objetoPago(), objetoDNI(), objetoTorno(), objetoHotel(), objetoBar()]; this.objs.forEach(o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); mundo.add(o); });
    this.mv = movil(); this.mv.scale.setScalar(0.55); mundo.add(this.mv); this.on = ondas();
    // chip NFC flotante del gancho
    this.chipG = new THREE.Group(); const chip = caja(0.5, 0.5, 0.08, '#15171f', 0.04); this.chipG.add(chip);
    for (let i = 0; i < 6; i++) { const p = caja(0.06, 0.18, 0.02, '#d9a441', 0.01); p.position.set(-0.32, -0.15 + i * 0.06, 0); p.rotation.z = Math.PI / 2; this.chipG.add(p); const p2 = p.clone(); p2.position.x = 0.32; this.chipG.add(p2); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBokeh.tex, color: VX.cian, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(2.2, 2.2, 1); this.chipG.add(glow); this.chipG.position.y = 0.9; mundo.add(this.chipG);
    const c = this.c = { chip: cue('chip'), sabe: cue('sabe'), nfc: cue('nfc'), uno: cue('uno'), eso: cue('eso'), dos: cue('dos'), dni: cue('dni'), leer: cue('leer'), tres: cue('tres'), abono: cue('abono'), tambien: cue('tambien'),
      cuatro: cue('cuatro'), llaves: cue('llaves'), cinco: cue('cinco'), tocas: cue('tocas'), carta: cue('carta'), todo: cue('todo'), centimetros: cue('centimetros'), sigueme: cue('sigueme') };
    this.seg = [c.uno - 0.25, c.dos - 0.25, c.tres - 0.25, c.cuatro - 0.25, c.cinco - 0.25, c.todo - 0.2];
    this.toques = [c.eso - 0.4, c.leer - 0.2, c.tambien - 0.4, c.llaves + 0.2, c.tocas + 0.1];
    this.musica = 'beat'; this.volMusica = 0.42;
    efectos = [['whoosh', 0.02], ['pop', c.chip], ['riser', c.nfc - 0.9], ['hit', c.nfc], ...this.seg.slice(0, 5).flatMap((t, i) => [['whoosh', t], ['pop', t + 0.45]]), ...this.toques.flatMap(t => [['tap', t], ['ding', t + 0.35]]),
      ['whoosh', c.todo - 0.2], ['pop', c.centimetros], ['whoosh', c.sigueme - 0.25], ['pop', c.sigueme + 0.3]];
  },
  idx(t) { let i = -1; for (let k = 0; k < this.seg.length; k++) if (t >= this.seg[k]) i = k; return i; },
  actualizar(t) {
    const c = this.c, i = this.idx(t), cen = new THREE.Vector3(0, 0, 0);
    // fondo degradado según el objeto
    const fi = i < 0 ? 0 : i >= 5 ? 6 : i + 1; const [a, b] = FONDOS[fi]; const x = this.fondo.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, a); gr.addColorStop(1, b); x.fillStyle = gr; x.fillRect(0, 0, 16, 256); this.texF.needsUpdate = true;
    // cámara: giro alrededor del podio, salto rápido entre objetos
    let ang = 0.5 + t * 0.32; for (const s of this.seg) ang += 1.4 * ease(clamp((t - s) / 0.3)); const r = i >= 0 && i < 5 ? 4.0 : 4.6; const alt = i === 3 ? 1.7 : 1.3;
    cam.position.set(Math.sin(ang) * r, alt + 0.4, Math.cos(ang) * r); cam.up.set(0, 1, 0); cam.lookAt(0, i === 3 ? 1.0 : 0.65, 0); if (cam.fov !== 36) { cam.fov = 36; cam.updateProjectionMatrix(); }
    this.desenfoque = 0; for (const s of this.seg) { const d = t - s; if (d >= 0 && d < 0.3) this.desenfoque = Math.max(this.desenfoque, 16 * Math.sin(Math.PI * d / 0.3)); }
    // objetos: cae el del tramo con rebote, el resto oculto
    this.objs.forEach((o, k) => { const t0 = this.seg[k]; const vis = i === k; o.visible = vis; if (!vis) return; const kk = clamp((t - t0) / 0.55);
      o.position.y = kk < 1 ? 3.2 * (1 - kk) * (1 - kk) - Math.sin(kk * Math.PI) * 0.12 * (kk > 0.6 ? 1 : 0) : 0; o.rotation.y = Math.atan2(cam.position.x, cam.position.z) + 0.35 + (1 - ease(kk)) * 2.5 + Math.sin(t * 0.6) * 0.06; o.updateMatrixWorld(true); });
    this.chipG.visible = i < 0 || i >= 5; this.chipG.rotation.y = t * 1.2; this.chipG.position.y = 0.9 + Math.sin(t * 2) * 0.06; this.chipG.scale.setScalar(i >= 5 ? 0.9 : rebote(clamp((t - c.chip + 0.2) / 0.5)) * 0.9);
    // el móvil (o la tarjeta) toca el objeto
    this.mv.visible = false; let toque = null;
    if (i >= 0 && i < 5) { const o = this.objs[i]; const tt = this.toques[i]; const p = o.userData.punto(); const camDir = cam.position.clone().sub(p).setY(0).normalize();
      const der = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), camDir).normalize(); const fuera = p.clone().add(camDir.clone().multiplyScalar(0.35)).add(der.clone().multiplyScalar(1.3)).add(new THREE.Vector3(0, 1.3, 0)); const cerca = p.clone().add(camDir.clone().multiplyScalar(0.16));
      const k = prog(t, tt - 0.6, tt), vuelta = prog(t, tt + 1.0, tt + 1.5); const pos = fuera.clone().lerp(cerca, k).lerp(fuera, vuelta);
      const portador = i === 2 ? o.userData.abono : i === 3 ? o.userData.llave : this.mv; portador.visible = t > this.seg[i] + 0.4;
      if (portador === this.mv) { this.mv.position.copy(pos); this.mv.lookAt(cam.position); } else { portador.parent.worldToLocal(pos); portador.position.copy(pos); portador.lookAt(cam.position); }
      const hecho = t > tt + 0.3; if (entre(t, tt, tt + 0.9)) toque = { desde: (portador === this.mv ? this.mv : portador).getWorldPosition(new THREE.Vector3()), hasta: p };
      const kOk = rebote(clamp((t - tt - 0.3) / 0.4));
      if (i === 0) { o.userData.pintar(hecho, kOk); this.mv.userData.pantalla(hecho ? 'okVerde' : 'bloqueo', hecho ? { titulo: 'Pagado', sub: '3,50 € · ejemplo', k: kOk } : {}); }
      if (i === 1) this.mv.userData.pantalla(hecho ? 'okVerde' : 'bloqueo', hecho ? { titulo: 'Chip leído', sub: 'DNI con NFC', k: kOk } : {});
      if (i === 2) { o.userData.lector.material.emissiveIntensity = hecho ? 2.5 : 0; o.userData.brazos.rotation.x = -ease(clamp((t - tt - 0.5) / 0.6)) * Math.PI * 2 / 3; }
      if (i === 3) { o.userData.led.material.color.set(hecho ? '#22c55e' : '#ff3b3b'); o.userData.bisagra.rotation.y = -ease(clamp((t - tt - 0.5) / 0.8)) * 0.9; }
      if (i === 4) this.mv.userData.pantalla(hecho ? 'cartaV' : 'bloqueo', {});
    }
    this.on.userData.actualizar(t, toque ? 1 : 0, toque ? toque.desde : cen, toque ? toque.hasta : cen);
  },
  fx(t) { const c = this.c; let temblor = 0, flash = 0; const d = t - c.nfc; if (d >= 0 && d < 0.35) { temblor = 14 * (1 - d / 0.35); flash = 0.4 * (1 - d / 0.35); } return { desenfoque: this.desenfoque, temblor, flash }; },
  capa(t) {
    const c = this.c, i = this.idx(t); velos();
    const TITULOS = ['Pagar con el móvil', 'El chip de tu DNI', 'El abono del transporte', 'Llaves de hotel', 'La carta del bar'];
    if (entre(t, c.nfc - 0.05, this.seg[0])) { const k = rebote(clamp((t - c.nfc) / 0.4)); C.save(); C.translate(W / 2, 1480); C.scale(k, k); C.font = `900 220px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillStyle = '#fff'; C.shadowColor = VX.cian; C.shadowBlur = 60; C.fillText('NFC', 0, 0); C.restore(); }
    if (i >= 0 && i < 5) { const k = entra(t, this.seg[i] + 0.35); C.save(); C.globalAlpha = clamp(k * 1.5); const X = W / 2, Y = 1500; C.font = `900 62px Inter, ${FUENTE}`; const tw = C.measureText(TITULOS[i]).width; const w = tw + 190;
      C.translate(X, Y); C.scale(lerp(0.85, 1, k), lerp(0.85, 1, k)); C.fillStyle = 'rgba(12,14,24,0.86)'; rr(C, -w / 2, -60, w, 120, 60); C.fill();
      C.fillStyle = grad(C, -w / 2, 0, -w / 2 + 100, 0, [VX.cian, VX.violeta]); C.beginPath(); C.arc(-w / 2 + 62, 0, 44, 0, 7); C.fill(); C.fillStyle = '#fff'; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(String(i + 1), -w / 2 + 62, 3);
      C.textAlign = 'left'; C.fillText(TITULOS[i], -w / 2 + 130, 3); C.restore();
      C.save(); C.font = `800 34px Inter, ${FUENTE}`; C.textAlign = 'right'; C.fillStyle = 'rgba(255,255,255,0.9)'; C.shadowColor = 'rgba(0,0,0,0.4)'; C.shadowBlur = 12; C.fillText(`${i + 1}/5`, W - 60, 120); C.restore();
      if (t > this.toques[i] + 0.3) pildora('NFC ✓', W / 2, 1650, entra(t, this.toques[i] + 0.3), { tono: 'verde', tam: 40 }); }
    if (entre(t, c.centimetros - 0.2, c.sigueme - 0.3)) golpeIOS('≤ 4 cm', W / 2, 1480, prog(t, c.centimetros - 0.2, c.centimetros + 0.1), 170, true);
    if (t > c.sigueme - 0.3) { const k = prog(t, c.sigueme - 0.3, c.sigueme + 0.1); C.save(); C.fillStyle = `rgba(10,12,24,${0.8 * k})`; C.fillRect(0, 0, W, H); C.restore();
      C.save(); C.globalAlpha = k; logoVisax(C, W / 2 - 70, 560, 140); C.restore();
      const kb = rebote(clamp((t - c.sigueme) / 0.45)); if (kb > 0) { C.save(); C.translate(W / 2, 930); C.scale(kb, kb); C.fillStyle = grad(C, -250, 0, 250, 0, [VX.cian, VX.azul, VX.violeta]); C.shadowColor = 'rgba(0,0,0,0.4)'; C.shadowBlur = 40; rr(C, -250, -75, 500, 150, 75); C.fill(); C.shadowBlur = 0; C.fillStyle = '#fff'; C.font = `900 64px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText('+ Sígueme', 0, 4); C.restore(); }
      C.save(); C.globalAlpha = prog(t, c.sigueme + 0.4, c.sigueme + 0.8); C.textAlign = 'center'; C.fillStyle = 'rgba(255,255,255,0.85)'; C.font = `600 44px Inter, ${FUENTE}`; C.fillText('si quieres saber más sobre la', W / 2, 1110); C.fillStyle = VX.cian; C.font = `italic 600 80px Fraunces, serif`; C.fillText('tecnología NFC.', W / 2, 1200); C.restore(); }
  },
};
// ---------- 13. Mismo NFC, cuatro locales: calle de casitas abiertas (low-poly), un muñeco que va de local en local ----------
const enP = (o, x, y, z) => { o.position.set(x, y, z); return o; };
function lp(c) { return new THREE.MeshLambertMaterial({ color: c, flatShading: true }); }
function cajaLP(w, h, d, c) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lp(c)); m.castShadow = m.receiveShadow = true; return m; }
function cilLP(r1, r2, h, c, s = 10) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s), lp(c)); m.castShadow = m.receiveShadow = true; return m; }
function rotuloLP(txt, color) { const t = lienzo(512, 128, (x, w, h) => { x.fillStyle = color; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = `900 66px Inter, ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, w / 2, h / 2 + 3); }).tex;
  const m = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.75, 0.15), [lp(color), lp(color), lp(color), lp(color), new THREE.MeshBasicMaterial({ map: t }), lp(color)]); m.castShadow = true; return m; }
function local(x0, nombre, color, pared, suelo) {
  const g = new THREE.Group(); g.position.x = x0;
  const base = cajaLP(6, 0.3, 5, suelo); base.position.set(0, -0.15, 0); g.add(base);
  const fondo = cajaLP(6, 3.4, 0.2, pared); fondo.position.set(0, 1.7, -2.4); g.add(fondo);
  [-1, 1].forEach(s => { const lado = cajaLP(0.2, 3.4, 5, pared); lado.position.set(s * 2.9, 1.7, 0); g.add(lado); });
  const techo = cajaLP(6.2, 0.25, 5.2, '#efe7da'); techo.position.set(0, 3.5, 0); g.add(techo);
  const tol = cajaLP(6.2, 0.15, 1.0, color); tol.position.set(0, 3.0, 2.9); tol.rotation.x = 0.35; g.add(tol);
  const rot = rotuloLP(nombre, color); rot.position.set(0.6, 3.95, 2.55); g.add(rot);
  return g;
}
V['locales'] = { ...comunCapa,
  async montar() {
    for (const [f, peso, est] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: est }); await ff.load(); document.fonts.add(ff); }
    ['peluqueria', 'gimnasio', 'tienda', 'cafeteria', 'resena', 'google', 'wifi', 'instagram', 'carta', 'nfc', 'local'].forEach(w => CLAVES.add(w));
    pared.visible = suelo.visible = bokeh.visible = false; scene.fog = null; scene.background = new THREE.Color('#bfe4ff');
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0; hemi.color.set('#ffffff'); hemi.groundColor.set('#d8c4a8'); hemi.intensity = 1.6;
    const sol = new THREE.DirectionalLight('#fff3dc', 2.3); sol.position.set(6, 12, 10); sol.target.position.set(10, 0, 0); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -20, right: 20, top: 12, bottom: -12, near: 1, far: 50 }); scene.add(sol, sol.target);
    // acera y calzada
    const acera = cajaLP(40, 0.2, 2.2, '#e3dccf'); acera.position.set(10.5, -0.1, 3.6); mundo.add(acera);
    const calz = cajaLP(40, 0.1, 6, '#5b6170'); calz.position.set(10.5, -0.25, 7.7); mundo.add(calz);
    for (let x = -8; x < 30; x += 2.5) { const l = cajaLP(1.2, 0.02, 0.15, '#f2f2f2'); l.position.set(x, -0.19, 7.7); mundo.add(l); }
    for (const x of [-4.2, 3.5, 10.5, 17.5, 25]) { const a = new THREE.Group(); a.position.set(x, 0, 4.3); a.add(enP(cilLP(0.08, 0.1, 1.2, '#7a4a2a', 6), 0, 0.6, 0)); const copa = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), lp('#5cb85c')); copa.position.y = 1.5; copa.castShadow = true; a.add(copa); mundo.add(a); }
    const X = this.X = [0, 7, 14, 21];
    const L = [local(X[0], 'PELUQUERÍA', '#e8558e', '#ffe3ee', '#f4d7a8'), local(X[1], 'GIMNASIO', '#3f7dfb', '#e3ecff', '#9aa3b5'), local(X[2], 'TIENDA', '#8b5cf6', '#efe7ff', '#e9dcc4'), local(X[3], 'CAFETERÍA', '#e07a2a', '#fff0dd', '#c98a52')];
    L.forEach(g => mundo.add(g));
    // peluquería: sillón, espejo, mostrador con expositor de Google
    const p = L[0]; const sillon = new THREE.Group(); sillon.add(enP(cilLP(0.35, 0.45, 0.4, '#333'), 0, 0.2, 0)); sillon.add(enP(cajaLP(0.8, 0.25, 0.8, '#1d1d1d'), 0, 0.55, 0)); sillon.add(enP(cajaLP(0.8, 0.9, 0.2, '#1d1d1d'), 0, 1.0, -0.35)); sillon.position.set(-1.2, 0, -1.2); p.add(sillon);
    const espejo = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.05), new THREE.MeshStandardMaterial({ color: '#cfe8ff', metalness: 0.8, roughness: 0.1 })); espejo.position.set(-1.2, 1.8, -2.25); p.add(espejo);
    p.add(enP(cajaLP(1.6, 1.0, 0.7, '#e8558e'), 1.6, 0.5, -0.6));
    // gimnasio: cinta, pesas, mostrador con placa WiFi
    const gm = L[1]; gm.add(enP(cajaLP(1.0, 0.25, 2.0, '#2b2f3a'), -1.5, 0.15, -1.0)); gm.add(enP(cajaLP(0.9, 1.2, 0.12, '#2b2f3a'), -1.5, 0.75, -1.95));
    for (let i = 0; i < 4; i++) { const d = cilLP(0.12, 0.12, 0.5, '#555', 8); d.rotation.z = Math.PI / 2; d.position.set(-0.6 + i * 0.35, 0.9, -2.1); gm.add(d); }
    gm.add(enP(cajaLP(1.6, 1.0, 0.7, '#3f7dfb'), 1.6, 0.5, -0.6));
    // tienda: burro con ropa, maniquí, mostrador con expositor Instagram
    const ti = L[2]; ti.add(enP(cajaLP(2.2, 0.06, 0.06, '#999'), -1.1, 1.7, -1.6));
    ['#e85d4a', '#3d7fd6', '#e0a826', '#5aa55e', '#d6567a'].forEach((c, i) => { const ropa = cajaLP(0.35, 0.9, 0.5, c); ropa.position.set(-2.0 + i * 0.45, 1.2, -1.6); ti.add(ropa); });
    ti.add(enP(cajaLP(1.6, 1.0, 0.7, '#8b5cf6'), 1.6, 0.5, -0.6));
    // cafetería: barra con cafetera y una mesa con la tarjeta MENÚ
    const cf = L[3]; cf.add(enP(cajaLP(2.6, 1.0, 0.7, '#7a3f22'), -1.0, 0.5, -1.7)); cf.add(enP(cajaLP(0.6, 0.6, 0.4, '#c9ccd2'), -1.6, 1.3, -1.8));
    const mesaC = new THREE.Group(); mesaC.add(enP(cilLP(0.7, 0.7, 0.06, '#fbf6ee', 16), 0, 0.78, 0)); mesaC.add(enP(cilLP(0.06, 0.06, 0.78, '#6b3a22', 6), 0, 0.39, 0)); mesaC.position.set(1.4, 0, 0.0); cf.add(mesaC);
    // los cuatro NFC
    const exG = expositorL('google'); exG.scale.setScalar(0.42); exG.position.set(1.6, 1.0, -0.5); exG.rotation.y = -0.25; p.add(exG);
    const plW = placaCuadrada('wifi'); plW.scale.setScalar(0.4); plW.position.set(1.6, 1.0, -0.5); plW.rotation.y = -0.25; gm.add(plW);
    const exI = expositorL('instagram'); exI.scale.setScalar(0.42); exI.position.set(1.6, 1.0, -0.5); exI.rotation.y = -0.25; ti.add(exI);
    const tjM = tarjetaMenu(); tjM.scale.setScalar(0.42); tjM.position.set(1.4, 0.81, -0.1); tjM.rotation.y = -0.2; cf.add(tjM);
    this.nfcs = [exG, plW, exI, tjM];
    this.halos = this.nfcs.map(o => { const h = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 40), new THREE.MeshBasicMaterial({ color: VX.cian, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false })); h.rotation.x = -Math.PI / 2; mundo.add(h); return h; });
    // dependientes en cada local
    this.gente = [];
    [['#2b2f3a', 'mono'], ['#3f7dfb', 'corto'], ['#8b5cf6', 'largo'], ['#7a3f22', 'corto']].forEach(([c, pe], i) => { const m = muneco({ camisa: c, pantalon: '#2f3a56', pelo: '#3a2418', peinado: pe, piel: ['#f0c29a', '#c98d63', '#f5cfac', '#ab7450'][i] }); m.g.position.set(X[i] + 1.6, 0, -1.4); mundo.add(m.g); this.gente.push(m); });
    // el protagonista con su móvil
    this.yo = muneco({ camisa: '#ffb020', pantalon: '#24324a', pelo: '#2a1a12', peinado: 'corto', piel: '#f0c29a' }); mundo.add(this.yo.g);
    this.mv = movil(); this.mv.scale.setScalar(0.22); mundo.add(this.mv); this.on = ondas();
    const c = this.c = { mismo: cue('mismo'), cuatro: cue('cuatro'), cada: cue('cada'), pelu: cue('peluqueria'), gym: cue('gimnasio'), tienda: cue('tienda'), cafe: cue('cafeteria'), toca: [1, 2, 3, 4].map(n => cue('tocas', n)),
      resena: cue('resena'), wifi: cue('wifi'), instagram: cue('instagram'), carta: cue('carta'), misma: cue('misma'), nfc: cue('nfc'), cambia: cue('cambia'), comenta: cue('comenta') };
    this.seg = [c.pelu - 0.3, c.gym - 0.3, c.tienda - 0.3, c.cafe - 0.3];
    this.musica = 'guitarra_bar'; this.volMusica = 0.45;
    efectos = [['whoosh', 0.02], ['pop', c.cuatro], ...this.seg.map(t => ['whoosh', t]), ...c.toca.flatMap(t => [['tap', t + 0.2], ['ding', t + 0.55]]), ['riser', c.nfc - 0.8], ['hit', c.nfc], ['whoosh', c.comenta - 0.4], ['pop', c.comenta + 0.5]];
  },
  idx(t) { let i = -1; for (let k = 0; k < 4; k++) if (t >= this.seg[k]) i = k; return t >= this.c.misma - 0.2 ? 4 : i; },
  actualizar(t) {
    const c = this.c, i = this.idx(t), X = this.X;
    this.gente.forEach((m, k) => { m.reset(); m.respirar(t, k); m.g.rotation.y = 0.3; if (k === i && entre(t, c.toca[k] + 0.4, c.toca[k] + 1.6)) m.hablar(t); });
    // protagonista: camina por la acera hasta cada local y entra hasta el mostrador
    const yo = this.yo; yo.reset(); const dentro = k => [X[k] + 0.4, 0.6], fuera = k => [X[k] + 0.4, 3.6];
    const pts = [[0, -4, 3.6]]; for (let k = 0; k < 4; k++) { const t0 = this.seg[k]; pts.push([t0 - 0.2, ...fuera(k)], [t0 + 0.9, ...dentro(k)], [c.toca[k] + 1.5, ...dentro(k)], [c.toca[k] + 2.1, ...fuera(k)]); }
    const r = recorrido(pts, t); yo.g.position.set(r.x, 0, r.z);
    if (r.mueve) { yo.g.rotation.y = r.dir; yo.andar(t * 1.7, 1); } else { yo.g.rotation.y = i >= 0 && i < 4 ? Math.PI * 0.75 : 0; yo.respirar(t, 3); }
    // móvil en la mano; al tocar, sube hacia el NFC
    const tocando = i >= 0 && i < 4 && entre(t, c.toca[i] - 0.1, c.toca[i] + 1.3);
    if (tocando) { yo.bD.hombro.rotation.x = -1.3; yo.bD.codo.rotation.x = -0.3; }
    yo.g.updateMatrixWorld(true); const mano = yo.bD.mano.getWorldPosition(new THREE.Vector3());
    this.mv.position.copy(mano).add(new THREE.Vector3(0, 0.12, 0.05)); this.mv.lookAt(cam.position);
    let objetivo = null; if (tocando) { objetivo = this.nfcs[i].userData.centro(); const k = prog(t, c.toca[i] - 0.1, c.toca[i] + 0.3); this.mv.position.lerp(objetivo.clone().add(new THREE.Vector3(-0.25, 0.05, 0.25)), k); }
    this.on.userData.actualizar(t, objetivo && t > c.toca[i] + 0.2 ? 1 : 0, this.mv.getWorldPosition(new THREE.Vector3()), objetivo || new THREE.Vector3());
    this.halos.forEach((h, k) => { const cen = this.nfcs[k].userData.centro(); h.position.set(cen.x, 1.02, cen.z); const on = (t < this.seg[0] && t > c.cuatro - 0.2) || i === 4 || (k === i && t < c.toca[k] + 0.2); h.material.opacity = on ? 0.5 + 0.4 * Math.sin(t * 6 + k) : 0; h.scale.setScalar(1 + 0.15 * Math.sin(t * 6 + k)); });
    // cámara: plano general al principio y al final; en cada local, se acerca y sigue al protagonista
    let fx, fz = 0.5, dist = 12.5, alt = 5.5;
    if (i < 0 || i === 4) { fx = 10.5; dist = 22; alt = 9; if (i < 0) { fx = lerp(8, 10.5, prog(t, 0, this.seg[0])); dist = lerp(24, 20, prog(t, 0, this.seg[0])); } }
    else { fx = lerp(X[i] + 0.6, X[i] + 0.6, 1); dist = 11; alt = 5; if (t - this.seg[i] < 0.9) { const prev = i ? X[i - 1] + 0.6 : 10.5; fx = lerp(prev, X[i] + 0.6, ease(clamp((t - this.seg[i]) / 0.9))); } }
    this.camX = this.camX ?? fx; this.camX = fx;
    cam.position.set(this.camX + 1.5, alt, fz + dist); cam.up.set(0, 1, 0); cam.lookAt(this.camX, i >= 0 && i < 4 ? 1.75 : 1.2, fz); if (cam.fov !== 32) { cam.fov = 32; cam.updateProjectionMatrix(); }
    this.desenfoque = 0; for (const s of this.seg) { const d = t - s; if (d >= 0 && d < 0.5) this.desenfoque = Math.max(this.desenfoque, 10 * Math.sin(Math.PI * d / 0.5)); }
  },
  fx(t) { const c = this.c; let temblor = 0, flash = 0; const d = t - c.nfc; if (d >= 0 && d < 0.35) { temblor = 12 * (1 - d / 0.35); flash = 0.35 * (1 - d / 0.35); } return { desenfoque: this.desenfoque, temblor, flash }; },
  capa(t) {
    const c = this.c, i = this.idx(t); velos();
    const NOMBRES = ['Peluquería', 'Gimnasio', 'Tienda de ropa', 'Cafetería'], RES = ['Reseña en Google', 'WiFi conectado', 'Su Instagram', 'Carta y pedido'], COL = ['#e8558e', '#3f7dfb', '#8b5cf6', '#e07a2a'];
    const PANTS = [['resenaG', s => ({ llenas: s })], ['wifiAndroid', s => ({ conectado: s > 0 })], ['instagram', s => ({ siguiendo: s > 2 })], ['cartaV', s => ({ sel: Math.min(2, s) })]];
    if (t < this.seg[0]) { if (t > c.mismo - 0.1) pildora('El mismo NFC', W / 2, 1420, entra(t, c.mismo), { icono: 'nfc', tono: 'oscuro', tam: 54 }); if (t > c.cuatro - 0.1) pildora('4 locales', W / 2, 1540, entra(t, c.cuatro), { tono: 'marca', tam: 54 }); }
    if (i >= 0 && i < 4) {
      const k = entra(t, this.seg[i] + 0.3); C.save(); C.globalAlpha = clamp(k * 1.5); C.font = `900 60px Inter, ${FUENTE}`; const tx = NOMBRES[i]; const w = C.measureText(tx).width + 170; C.translate(W / 2, 1460); C.scale(lerp(0.85, 1, k), lerp(0.85, 1, k));
      C.fillStyle = 'rgba(12,14,24,0.86)'; rr(C, -w / 2, -58, w, 116, 58); C.fill(); C.fillStyle = COL[i]; C.beginPath(); C.arc(-w / 2 + 58, 0, 42, 0, 7); C.fill(); C.fillStyle = '#fff'; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(String(i + 1), -w / 2 + 58, 3); C.textAlign = 'left'; C.fillText(tx, -w / 2 + 120, 3); C.restore();
      const tt = c.toca[i]; if (entre(t, tt + 0.35, (this.seg[i + 1] ?? c.misma) - 0.35)) { const s = Math.min(5, Math.floor((t - tt - 0.35) / 0.12)); const [pn, est] = PANTS[i]; movil2D(lerp(W + 400, 800, entra(t, tt + 0.35, 0.45)), 900, 0.52, 0.06, pn, est(s)); pildora(RES[i], W / 2 - 160, 1620, entra(t, tt + 0.5), { icono: 'check', tono: 'verde', tam: 40 }); }
    }
    if (entre(t, c.nfc - 0.05, c.comenta - 0.3)) { const k = rebote(clamp((t - c.nfc) / 0.4)); C.save(); C.translate(W / 2, 1400); C.scale(k, k); C.font = `900 200px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillStyle = '#fff'; C.shadowColor = VX.azul; C.shadowBlur = 50; C.fillText('NFC', 0, 0); C.restore();
      if (t > c.cambia - 0.2) pildora('Cambia lo que lleva dentro', W / 2, 1590, entra(t, c.cambia - 0.2), { tono: 'oscuro', tam: 44 }); }
    cierreComenta(t, c.comenta - 0.2, 'TU LOCAL', 'y te digo cuál te pondría');
  },
};

// ---------- 14. Hotel en corte (casa de muñecas de plastilina): un ascensor sube planta a planta, cada planta un NFC ----------
function clay(c, extra = {}) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, metalness: 0, ...extra }); }
function rbox(w, h, d, c, r = 0.08) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2) * 0.999), clay(c)); m.castShadow = m.receiveShadow = true; return m; }
function rcil(r1, r2, h, c, s = 24) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, s), clay(c)); m.castShadow = m.receiveShadow = true; return m; }
function bola(r, c) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), clay(c)); m.castShadow = m.receiveShadow = true; return m; }
const en3 = (o, x, y, z) => { o.position.set(x, y, z); return o; };
function cartelClay(txt, fondo, tinta, w = 2.4, h = 0.6) {
  const t = lienzo(768, 192, (x, cw, ch) => { x.fillStyle = fondo; rr(x, 0, 0, cw, ch, 90); x.fill(); x.fillStyle = tinta; x.font = `italic 600 110px Fraunces, serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, cw / 2, ch / 2 + 6); }).tex;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.9 })); return m;
}
const PISO_Y = [0, 3.4, 6.8, 10.2], XE = 3.55;
V['hotel'] = { ...comunCapa, estilo: 'plastilina',
  async montar() {
    for (const [f, peso, est] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: est }); await ff.load(); document.fonts.add(ff); }
    ['wifi', 'desayuno', 'carta', 'mesa', 'camarero', 'resena', 'google', 'nfc', 'pegatina', 'planta', 'recepcion', 'habitacion', 'restaurante', 'terraza', 'escondido'].forEach(w => CLAVES.add(w));
    pared.visible = suelo.visible = bokeh.visible = false; scene.fog = null;
    const cielo = document.createElement('canvas'); cielo.width = 8; cielo.height = 256; const cx = cielo.getContext('2d'); const gr = cx.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#9fd4ff'); gr.addColorStop(0.6, '#d9ecff'); gr.addColorStop(1, '#ffe0d0'); cx.fillStyle = gr; cx.fillRect(0, 0, 8, 256);
    const tc = new THREE.CanvasTexture(cielo); tc.colorSpace = THREE.SRGBColorSpace; scene.background = tc;
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0; hemi.color.set('#ffffff'); hemi.groundColor.set('#e8c9b0'); hemi.intensity = 1.5;
    const sol = new THREE.DirectionalLight('#fff1e0', 2.4); sol.position.set(8, 18, 14); sol.target.position.set(0, 5, 0); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.radius = 4; sol.shadow.bias = -0.0005; Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 16, bottom: -6, near: 1, far: 60 }); scene.add(sol, sol.target);
    const rel = new THREE.DirectionalLight('#ffd6f0', 0.7); rel.position.set(-10, 6, 8); scene.add(rel);
    // jardín, árboles y nubes de plastilina
    const cesped = rcil(26, 26, 0.3, '#b9e6a6', 64); cesped.position.set(0, -0.5, 0); mundo.add(cesped);
    const camino = rbox(2.2, 0.06, 10, '#f3e2c8', 0.03); camino.position.set(-3.2, -0.33, 7); mundo.add(camino);
    for (const [x, z, s] of [[-7, 1, 1], [7.2, -1, 1.2], [-6.5, 5, 0.8], [6.5, 4.5, 0.9], [-9, -3, 1.3], [9.5, -4, 1.1]]) { const a = new THREE.Group(); a.add(en3(rcil(0.14, 0.18, 1.4, '#a8744f', 10), 0, 0.7, 0)); a.add(en3(bola(0.8, '#7fcf7a'), 0, 1.8, 0)); a.add(en3(bola(0.55, '#92da8a'), 0.4, 2.3, 0.2)); a.scale.setScalar(s); a.position.set(x, -0.35, z); mundo.add(a); }
    this.nubes = [];
    for (const [x, y, z] of [[-9, 13, -10], [6, 16, -12], [10, 9, -9], [-12, 7, -11]]) { const n = new THREE.Group(); [[0, 0, 1.2], [1.2, -0.2, 0.9], [-1.1, -0.25, 0.8], [0.4, 0.5, 0.8]].forEach(([a, b, r]) => n.add(en3(bola(r, '#ffffff'), a, b, 0))); n.position.set(x, y, z); n.scale.set(1.3, 0.9, 0.9); mundo.add(n); this.nubes.push([n, x]); }
    // estructura del edificio: forjados, pared trasera, laterales y hueco del ascensor
    const PAREDES = ['#ffd9c7', '#cfe0ff', '#d6f5e3', '#ffe9b3'], SUELOS = ['#f6e6d2', '#f1e4d6', '#f3e7da', '#e7cfae'], TRIM = ['#ff8f7a', '#7aa7ff', '#5fcf9a', '#ffb547'];
    this.pisos = PISO_Y.map((y, i) => {
      const g = new THREE.Group(); g.position.y = y; mundo.add(g);
      g.add(en3(rbox(9.2, 0.36, 4.8, '#fff6ec', 0.12), 0, -0.18, 0)); g.add(en3(rbox(9.2, 0.03, 4.6, SUELOS[i], 0.01), 0, 0.01, -0.05));
      g.add(en3(rbox(9.4, 0.14, 0.14, TRIM[i], 0.06), 0, -0.2, 2.4));
      const alto = i === 3 ? 1.1 : 3.05;
      g.add(en3(rbox(9.2, alto, 0.25, PAREDES[i], 0.1), 0, alto / 2, -2.3));
      g.add(en3(rbox(0.3, alto, 4.8, PAREDES[i], 0.1), -4.45, alto / 2, 0));
      if (i < 3) { g.add(en3(rbox(0.3, alto, 4.8, '#ffffff', 0.1), 4.45, alto / 2, 0)); g.add(en3(rbox(0.22, alto, 1.7, PAREDES[i], 0.08), 2.75, alto / 2, -1.4)); }
      return g;
    });
    // terraza: tejado del ascensor y cartel del hotel
    const caseta = rbox(1.7, 2.6, 2.0, '#ffffff', 0.15); caseta.position.set(XE, PISO_Y[3] + 1.3, -1.2); mundo.add(caseta);
    const cartel = cartelClay('Hotel Brisa', '#ff7aa8', '#ffffff', 3.4, 0.85); cartel.position.set(-1.0, PISO_Y[3] + 1.75, -2.15); mundo.add(cartel);
    [-2.4, 0.4].forEach(x => mundo.add(en3(rcil(0.05, 0.05, 0.7, '#ffffff', 8), x, PISO_Y[3] + 1.2, -2.2)));
    const baranda = new THREE.Mesh(new RoundedBoxGeometry(9.0, 0.7, 0.06, 2, 0.02), new THREE.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.25, roughness: 0.1 })); baranda.position.set(0, PISO_Y[3] + 0.35, 2.3); mundo.add(baranda);
    // ascensor de cristal
    this.cabina = new THREE.Group(); mundo.add(this.cabina);
    const vidrio = new THREE.Mesh(new RoundedBoxGeometry(1.35, 2.5, 1.7, 3, 0.08), new THREE.MeshStandardMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.32, roughness: 0.05, depthWrite: false })); vidrio.position.y = 1.25; this.cabina.add(vidrio);
    this.cabina.add(en3(rbox(1.45, 0.12, 1.8, '#ffb547', 0.05), 0, 0.06, 0)); this.cabina.add(en3(rbox(1.45, 0.12, 1.8, '#ffb547', 0.05), 0, 2.5, 0));
    for (const [a, b] of [[-0.66, 0.84], [0.66, 0.84], [-0.66, -0.84], [0.66, -0.84]]) this.cabina.add(en3(rbox(0.07, 2.45, 0.07, '#ffb547', 0.03), a, 1.25, b));
    this.cabina.position.set(XE, 0, -0.1);
    for (const x of [XE - 0.8, XE + 0.8]) mundo.add(en3(rbox(0.1, PISO_Y[3] + 2.6, 0.1, '#ffffff', 0.04), x, (PISO_Y[3] + 2.6) / 2, -1.05));
    // planta 0: recepción
    const p0 = this.pisos[0];
    p0.add(en3(rbox(2.4, 1.05, 0.85, '#ff9f8a', 0.12), 0.2, 0.525, -0.6)); p0.add(en3(rbox(2.6, 0.09, 1.0, '#fff5ea', 0.04), 0.2, 1.09, -0.6));
    const rc = cartelClay('Recepción', '#ffffff', '#ff7a6a', 2.0, 0.5); rc.position.set(0.2, 2.35, -2.16); p0.add(rc);
    p0.add(en3(rbox(1.7, 0.42, 0.85, '#8fb8ff', 0.15), -2.7, 0.3, -1.3)); p0.add(en3(rbox(1.7, 0.75, 0.25, '#7aa7ff', 0.12), -2.7, 0.7, -1.75));
    p0.add(en3(rcil(0.28, 0.22, 0.5, '#e98a5f'), -1.3, 0.25, -1.75)); p0.add(en3(bola(0.45, '#7fcf7a'), -1.3, 0.85, -1.75));
    p0.add(en3(rbox(0.55, 1.0, 0.5, '#ffffff', 0.1), -3.3, 0.5, 0.9));
    const plW = placaCuadrada('wifi'); plW.scale.setScalar(0.42); plW.position.set(0.75, 1.13, -0.45); plW.rotation.y = 0.2; p0.add(plW);
    const exG = expositorL('google'); exG.scale.setScalar(0.42); exG.position.set(-3.3, 1.0, 0.95); exG.rotation.y = 0.5; p0.add(exG);
    // planta 1: habitación
    const p1 = this.pisos[1];
    p1.add(en3(rbox(2.1, 0.45, 2.7, '#ffffff', 0.15), -1.7, 0.25, -0.75)); p1.add(en3(rbox(2.15, 0.22, 1.9, '#ff9eb5', 0.1), -1.7, 0.56, -0.35));
    [-2.15, -1.25].forEach(x => p1.add(en3(rbox(0.75, 0.22, 0.45, '#ffffff', 0.1), x, 0.6, -1.7)));
    p1.add(en3(rbox(2.3, 1.1, 0.16, '#8fb8ff', 0.08), -1.7, 0.6, -2.08));
    p1.add(en3(rbox(0.7, 0.72, 0.55, '#ffd08a', 0.1), 0.1, 0.36, -1.55));
    p1.add(en3(rcil(0.05, 0.08, 0.35, '#ffffff', 10), -0.1, 0.9, -1.7)); p1.add(en3(rcil(0.12, 0.2, 0.22, '#fff1a8', 16), -0.1, 1.15, -1.7));
    p1.add(en3(rbox(1.3, 1.1, 0.06, '#e9f6ff', 0.05), 1.5, 1.8, -2.15)); p1.add(en3(rbox(1.45, 0.08, 0.12, '#ffffff', 0.03), 1.5, 1.22, -2.12));
    const tjH = tarjetaMenu(); tjH.scale.setScalar(0.42); tjH.position.set(0.25, 0.73, -1.45); tjH.rotation.y = 0.25; p1.add(tjH);
    // planta 2: restaurante
    const p2 = this.pisos[2];
    const mesa = (x, z) => { const m = new THREE.Group(); m.add(en3(rcil(0.65, 0.65, 0.08, '#fffaf2', 32), 0, 0.78, 0)); m.add(en3(rcil(0.07, 0.12, 0.78, '#c98a5f', 10), 0, 0.39, 0));
      [[-0.9, 0], [0, -0.9]].forEach(([a, b]) => { m.add(en3(rbox(0.5, 0.08, 0.5, '#ff9f8a', 0.04), a, 0.48, b)); m.add(en3(rbox(0.06, 0.48, 0.06, '#c98a5f', 0.02), a, 0.24, b)); });
      m.add(en3(rcil(0.2, 0.17, 0.03, '#ffffff'), -0.25, 0.835, 0.15)); m.position.set(x, 0, z); p2.add(m); return m; };
    mesa(-2.6, -0.8); mesa(0.4, -0.8);
    p2.add(en3(rbox(1.6, 0.9, 0.5, '#5fcf9a', 0.1), -1.1, 1.7, -2.15));
    const tjR = tarjetaMenu(); tjR.scale.setScalar(0.42); tjR.position.set(0.65, 0.83, -0.65); tjR.rotation.y = 0.25; p2.add(tjR);
    // planta 3: terraza con piscina y sombrilla
    const p3 = this.pisos[3];
    p3.add(en3(rbox(2.6, 0.32, 1.7, '#ffffff', 0.12), -2.4, 0.16, -1.0)); const agua = rbox(2.3, 0.05, 1.4, '#5fd0ff', 0.03); agua.material = clay('#5fd0ff', { roughness: 0.25 }); agua.position.set(-2.4, 0.31, -1.0); p3.add(agua);
    p3.add(en3(rcil(0.04, 0.04, 2.0, '#ffffff', 8), 0.4, 1.0, -1.15)); p3.add(en3(rcil(0.02, 1.2, 0.45, '#ff7aa8', 16), 0.4, 2.1, -1.15));
    p3.add(en3(rcil(0.45, 0.45, 0.07, '#fffaf2', 24), 0.4, 0.72, -1.0)); p3.add(en3(rcil(0.06, 0.1, 0.72, '#c98a5f', 10), 0.4, 0.36, -1.0));
    p3.add(en3(rbox(0.7, 0.25, 1.6, '#ffd08a', 0.1), 1.6, 0.25, -1.2));
    const plC = placaCuadrada('camarero'); plC.scale.setScalar(0.42); plC.position.set(0.55, 0.76, -0.85); plC.rotation.y = 0.2; p3.add(plC);
    this.nfcs = [plW, tjH, tjR, plC, exG];
    this.halos = this.nfcs.map(() => { const h = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.44, 40), new THREE.MeshBasicMaterial({ color: '#ff5fa2', transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false })); h.rotation.x = -Math.PI / 2; mundo.add(h); return h; });
    // personal del hotel
    this.recep = muneco({ camisa: '#ff7a6a', pantalon: '#2f3a56', pelo: '#3a2418', peinado: 'largo', piel: '#f5cfac' }); this.recep.g.position.set(0.2, 0, -1.55); p0.add(this.recep.g);
    this.cam2 = muneco({ camisa: '#ffffff', pantalon: '#1f2433', pelo: '#2a1a12', peinado: 'corto', piel: '#c98d63' }); this.cam2.g.position.set(-1.0, 0, -1.5); p2.add(this.cam2.g);
    this.cam3 = muneco({ camisa: '#ffffff', pantalon: '#1f2433', pelo: '#1a1a1a', peinado: 'mono', piel: '#ab7450' }); p3.add(this.cam3.g);
    this.yo = muneco({ camisa: '#ffb020', pantalon: '#24324a', pelo: '#2a1a12', peinado: 'corto', piel: '#f0c29a' }); mundo.add(this.yo.g);
    this.mv = movil(); this.mv.scale.setScalar(0.22); mundo.add(this.mv); this.on = ondas();
    const c = this.c = { sabias: cue('sabias'), baja: cue('baja'), movil: cue('movil'), primera: cue('primera'), tocas: cue('tocas'), segunda: cue('segunda'), ves: cue('ves'), arriba: cue('arriba'), toque: cue('toque'),
      irte: cue('irte'), resena: cue('resena'), todo: cue('todo', 2), pegatina: cue('pegatina'), sigueme: cue('sigueme') }; c.comenta = c.sigueme - 0.3;
    // segmentos: planta, punto donde se pone el huésped, NFC que toca y cuándo
    this.S = [
      { t0: c.baja - 0.35, piso: 0, sitio: [1.05, 0.15], nfc: 0, toca: c.movil, ascensor: false },
      { t0: c.primera - 0.3, piso: 1, sitio: [0.95, -0.75], nfc: 1, toca: c.tocas, ascensor: true },
      { t0: c.segunda - 0.3, piso: 2, sitio: [1.3, -0.1], nfc: 2, toca: c.ves, ascensor: true },
      { t0: c.arriba - 0.3, piso: 3, sitio: [1.35, -0.2], nfc: 3, toca: c.toque, ascensor: true },
      { t0: c.irte - 0.45, piso: 0, sitio: [-2.55, 1.25], nfc: 4, toca: c.resena + 0.05, ascensor: false },
    ];
    this.fin = c.todo - 0.25;
    this.musica = 'ambient_b'; this.volMusica = 0.5;
    efectos = [['whoosh', 0.02], ['pop', c.sabias + 0.9], ...this.S.map(s => ['whoosh', s.t0]), ...this.S.filter(s => s.ascensor).map(s => ['ding', s.t0 + 0.85]), ...this.S.flatMap(s => [['tap', s.toca + 0.2], ['pop', s.toca + 0.55]]),
      ['whoosh', this.fin], ['whoosh', c.sigueme - 0.25], ['pop', c.sigueme + 0.3]];
  },
  idx(t) { if (t >= this.fin) return 5; let i = -1; this.S.forEach((s, k) => { if (t >= s.t0) i = k; }); return i; },
  actualizar(t) {
    const c = this.c, i = this.idx(t), S = this.S, yo = this.yo;
    this.nubes.forEach(([n, x], k) => { n.position.x = x + Math.sin(t * 0.25 + k) * 0.8; });
    this.recep.reset(); this.recep.respirar(t, 0); if (i === 0 && entre(t, S[0].toca + 0.4, S[0].toca + 1.6)) this.recep.hablar(t);
    this.cam2.reset(); this.cam2.respirar(t, 1); this.cam2.g.rotation.y = 0.4;
    // camarero de la terraza: llega cuando lo llamas
    const s3 = S[3]; this.cam3.reset(); const w3 = recorrido([[0, -4.0, 0.6], [s3.toca + 0.2, -4.0, 0.6], [s3.toca + 1.3, 0.5, 0.6]], t);
    this.cam3.g.position.set(w3.x, 0, w3.z); if (w3.mueve) { this.cam3.g.rotation.y = w3.dir; this.cam3.andar(t * 1.8, 1); } else { this.cam3.g.rotation.y = t > s3.toca + 1 ? 1.2 : 0.6; this.cam3.respirar(t, 2); }
    // ascensor: sube entre plantas al empezar cada segmento
    let cabY = 0; if (i >= 0 && i < 5) { const s = S[i]; const prev = i ? S[i - 1].piso : 0; cabY = s.ascensor ? lerp(PISO_Y[prev], PISO_Y[s.piso], ease(prog(t, s.t0, s.t0 + 0.85))) : PISO_Y[s.piso === 0 && i === 4 ? 0 : s.piso]; if (i === 4) cabY = PISO_Y[3]; }
    if (i === 5) cabY = PISO_Y[0] + (PISO_Y[3] - PISO_Y[0]) * (0.5 + 0.5 * Math.sin(t * 0.8));
    this.cabina.position.y = cabY;
    // huésped
    yo.reset(); let px = XE, pz = 0.0, py = 0, mira = null;
    if (i < 0) { const r = recorrido([[0, -3.2, 4.5], [S[0].t0, -1.0, 1.6]], t); px = r.x; pz = r.z; if (r.mueve) { yo.g.rotation.y = r.dir; yo.andar(t * 1.7, 1); } }
    else if (i < 5) {
      const s = S[i], nx = S[i + 1]; py = PISO_Y[s.piso];
      let pts;
      if (s.ascensor) pts = [[s.t0 + 0.85, XE, 0.0], [s.t0 + 1.6, XE - 1.2, 0.3], [s.toca - 0.35, ...s.sitio]];
      else if (i === 0) pts = [[s.t0, -1.0, 1.6], [s.toca - 0.35, ...s.sitio]];
      else pts = [[s.t0, -1.2, 1.4], [s.toca - 0.35, ...s.sitio]];
      if (nx && nx.ascensor) pts.push([Math.max(s.toca + 1.35, nx.t0 - 0.9), ...s.sitio], [nx.t0 - 0.05, XE, 0.0]);
      if (s.ascensor && t < s.t0 + 0.85) py = this.cabina.position.y;
      const r = recorrido(pts, t); px = r.x; pz = r.z;
      if (r.mueve) { yo.g.rotation.y = r.dir; yo.andar(t * 1.7, 1); }
      else { const o = this.nfcs[s.nfc].userData.centro(); mira = Math.atan2(o.x - px, o.z - pz); yo.g.rotation.y = (t < s.t0 + 0.9 && s.ascensor) ? 0 : mira; yo.respirar(t, 3); }
    } else { px = -1.0; pz = 1.4; py = 0; yo.g.rotation.y = 0.3; yo.respirar(t, 3); }
    yo.g.position.set(px, py, pz);
    const s = i >= 0 && i < 5 ? S[i] : null;
    const tocando = s && entre(t, s.toca - 0.15, s.toca + 1.3);
    if (tocando) { yo.bD.hombro.rotation.x = -1.3; yo.bD.codo.rotation.x = -0.3; }
    yo.g.updateMatrixWorld(true); const mano = yo.bD.mano.getWorldPosition(new THREE.Vector3());
    this.mv.position.copy(mano).add(new THREE.Vector3(0, 0.12, 0.05)); this.mv.lookAt(cam.position); this.mv.visible = i < 5;
    let objetivo = null; if (tocando) { objetivo = this.nfcs[s.nfc].userData.centro(); const k = prog(t, s.toca - 0.15, s.toca + 0.25); this.mv.position.lerp(objetivo.clone().add(new THREE.Vector3(-0.2, 0.12, 0.28)), k); }
    this.on.userData.actualizar(t, objetivo && t > s.toca + 0.15 ? 1 : 0, this.mv.getWorldPosition(new THREE.Vector3()), objetivo || new THREE.Vector3());
    this.halos.forEach((h, k) => { const cen = this.nfcs[k].userData.centro(); h.position.set(cen.x, cen.y - 0.17, cen.z + 0.05); const on = i === 5 || (i < 0 && t > c.sabias + 0.8) || (s && s.nfc === k && t < s.toca + 0.2); h.material.opacity = on ? 0.55 + 0.35 * Math.sin(t * 6 + k) : 0; h.scale.setScalar(1 + 0.15 * Math.sin(t * 6 + k)); });
    // cámara: plano general del edificio; en cada planta, sigue al ascensor
    let tx, ty, dist, gx = 0;
    const objPiso = k => { const ss = S[k]; return [ss.sitio[0] + 1.1, PISO_Y[ss.piso] + 1.45, 15]; };
    if (i < 0) { const k = ease(prog(t, 0, S[0].t0)); tx = lerp(0.3, 0.2, k); ty = lerp(7.2, 6.4, k); dist = lerp(40, 34, k); gx = lerp(-6, 2, k); }
    else if (i === 5) { const k = ease(prog(t, this.fin, this.fin + 1.0)); const [ax, ay, ad] = objPiso(4); tx = lerp(ax, 0.2, k); ty = lerp(ay, 6.4, k); dist = lerp(ad, 34, k); gx = 3 * Math.sin((t - this.fin) * 0.4); }
    else { const [bx, by, bd] = objPiso(i); const d = t - S[i].t0, dur = S[i].ascensor ? 0.85 : 0.75;
      if (d < dur) { const [ax, ay, ad] = i ? objPiso(i - 1) : [0.2, 6.4, 34]; const k = ease(d / dur); tx = lerp(ax, bx, k); ty = lerp(ay, by, k); dist = lerp(ad, bd, k) + (i === 4 ? 6 * Math.sin(Math.PI * k) : 0); } else { tx = bx; ty = by; dist = bd; } gx = 2.2; }
    cam.position.set(tx + gx, ty + dist * 0.16, dist); cam.up.set(0, 1, 0); cam.lookAt(tx, ty, 0); if (cam.fov !== 30) { cam.fov = 30; cam.updateProjectionMatrix(); }
    this.desenfoque = 0; for (const t0 of [...S.map(x => x.t0), this.fin]) { const d = t - t0; if (d >= 0 && d < 0.5) this.desenfoque = Math.max(this.desenfoque, 3 * Math.sin(Math.PI * d / 0.5)); }
  },
  fx(t) { return { desenfoque: this.desenfoque }; },
  pantalla(v) { const p = v.clone().project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; },
  capa(t) {
    const c = this.c, i = this.idx(t), S = this.S; velos();
    // gancho: interrogantes sobre cada planta
    if (false) this.nfcs.slice(0, 4).forEach((o, k) => { const [x, y] = this.pantalla(o.userData.centro()); const kk = rebote(clamp((t - c.sabias - 0.6 - k * 0.18) / 0.4)); if (kk <= 0) return;
      C.save(); C.translate(x, y - 70); C.scale(kk, kk); C.fillStyle = '#ff5fa2'; C.shadowColor = 'rgba(120,30,70,0.45)'; C.shadowBlur = 20; C.beginPath(); C.arc(0, 0, 44, 0, 7); C.fill(); C.beginPath(); C.moveTo(-12, 36); C.lineTo(0, 62); C.lineTo(12, 36); C.fill();
      C.shadowBlur = 0; C.fillStyle = '#fff'; C.font = `900 58px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText('?', 0, 3); C.restore(); });
    const PLANTAS = ['0', '1', '2', '3', '↩'], NOMBRES = ['Recepción', 'Habitación', 'Restaurante', 'Terraza', 'Salida'], COL = ['#ff8f7a', '#7aa7ff', '#5fcf9a', '#ffb547', '#ff5fa2'];
    const RES = ['WiFi conectado', 'Desayuno pedido', 'Pedido desde la mesa', 'Camarero avisado', 'Reseña publicada'];
    const PANTS = [['wifiAndroid', k => ({ conectado: k > 0 })], ['cartaCafe', k => ({ nuevo: k > 1 })], ['cartaV', k => ({ sel: Math.min(2, k) })], ['avisoEnviado', () => ({})], ['resenaG', k => ({ llenas: k })]];
    if (i >= 0 && i < 5) {
      const k = entra(t, S[i].t0 + 0.3); C.save(); C.globalAlpha = clamp(k * 1.5); C.font = `800 56px Inter, ${FUENTE}`; const tx = NOMBRES[i]; const w = C.measureText(tx).width + 170; C.translate(W / 2, 1460); C.scale(lerp(0.85, 1, k), lerp(0.85, 1, k));
      C.fillStyle = 'rgba(255,255,255,0.94)'; C.shadowColor = 'rgba(90,40,70,0.3)'; C.shadowBlur = 24; rr(C, -w / 2, -58, w, 116, 58); C.fill(); C.shadowBlur = 0; C.fillStyle = COL[i]; C.beginPath(); C.arc(-w / 2 + 58, 0, 42, 0, 7); C.fill();
      C.fillStyle = '#fff'; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(PLANTAS[i], -w / 2 + 58, 3); C.fillStyle = '#3a2a4a'; C.textAlign = 'left'; C.fillText(tx, -w / 2 + 120, 3); C.restore();
      const s = S[i], fin = (S[i + 1] ? S[i + 1].t0 : this.fin) - 0.3;
      if (entre(t, s.toca + 0.35, fin)) { const st = Math.min(5, Math.floor((t - s.toca - 0.35) / 0.12)); const [pn, est] = PANTS[i]; movil2D(lerp(W + 400, 790, entra(t, s.toca + 0.35, 0.45)), 880, 0.5, 0.06, pn, est(st)); }
    }
    // final: todas las plantas, el mismo NFC
    if (false) {
      this.nfcs.forEach((o, k) => { const [x, y] = this.pantalla(o.userData.centro()); const kk = rebote(clamp((t - this.fin - 0.8 - k * 0.12) / 0.4)); if (kk <= 0) return;
        C.save(); C.translate(x, y - 64); C.scale(kk, kk); C.fillStyle = grad(C, -60, 0, 60, 0, [VX.cian, VX.azul]); C.shadowColor = 'rgba(30,60,140,0.4)'; C.shadowBlur = 18; rr(C, -62, -30, 124, 60, 30); C.fill(); C.shadowBlur = 0; C.fillStyle = '#fff'; C.font = `900 32px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText('NFC', 0, 2); C.restore(); });
      if (t > c.pegatina) { const kb = rebote(clamp((t - c.pegatina) / 0.4)); C.save(); C.translate(W / 2, 1640); C.scale(kb, kb); C.font = `italic 600 92px Fraunces, serif`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.lineWidth = 14; C.strokeStyle = '#3a2a4a'; C.lineJoin = 'round'; C.strokeText('1 pegatina · 5 usos', 0, 0); C.fillStyle = '#fff'; C.fillText('1 pegatina · 5 usos', 0, 0); C.restore(); }
    }
    if (t > c.sigueme - 0.3) { const k = prog(t, c.sigueme - 0.3, c.sigueme + 0.1); C.save(); C.fillStyle = `rgba(40,22,44,${0.78 * k})`; C.fillRect(0, 0, W, H); C.restore();
      C.save(); C.globalAlpha = k; logoVisax(C, W / 2 - 70, 560, 140); C.restore();
      const kb = rebote(clamp((t - c.sigueme) / 0.45)); if (kb > 0) { C.save(); C.translate(W / 2, 930); C.scale(kb, kb); C.fillStyle = grad(C, -250, 0, 250, 0, ['#ff7aa8', '#ff9a6b']); C.shadowColor = 'rgba(0,0,0,0.35)'; C.shadowBlur = 40; rr(C, -250, -75, 500, 150, 75); C.fill(); C.shadowBlur = 0; C.fillStyle = '#fff'; C.font = `900 64px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText('+ Sígueme', 0, 4); C.restore(); }
      C.save(); C.globalAlpha = prog(t, c.sigueme + 0.4, c.sigueme + 0.8); C.textAlign = 'center'; C.fillStyle = 'rgba(255,255,255,0.88)'; C.font = `600 44px Inter, ${FUENTE}`; C.fillText('si quieres saber más sobre la', W / 2, 1110); C.fillStyle = '#ffb3cf'; C.font = `italic 600 80px Fraunces, serif`; C.fillText('tecnología NFC.', W / 2, 1200); C.restore(); }
  },
};

// ---------- 15. La mano levantada: un cliente lleva "desde el martes" pidiendo; la mesa de al lado toca la pegatina y le sirven ----------
V['mano'] = { ...comunCapa,
  async montar() {
    for (const [f, peso, estilo] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: estilo }); await ff.load(); document.fonts.add(ff); }
    ['martes', 'barba', 'pegatina', 'barra', 'cocina', 'minuto', 'nfc', 'cana', 'canas', 'bravas'].forEach(w => CLAVES.add(w));
    scene.background = new THREE.Color('#1a120c'); scene.fog = null; pared.visible = suelo.visible = bokeh.visible = false;
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0;
    hemi.color.set('#fff1dc'); hemi.groundColor.set('#7a4a2a'); hemi.intensity = 1.25;
    const sol = new THREE.DirectionalLight('#ffe2b8', 1.5); sol.position.set(3, 9, 5); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 }); sol.shadow.bias = -0.0005; scene.add(sol);
    renderer.toneMappingExposure = 1.05;
    const r = construirRestaurante(scene, { pantalla3D, tpv, movil, tarjetaMenu, placaCuadrada }); Object.assign(this, r);
    const p = poblar(r.mundo, r.mesas); Object.assign(this, p);
    // el de la mano: solo en su mesa, mirando a cámara
    this.yo = this.gente[4]; this.gente[5].g.visible = false;
    const pelo = '#4a2c1a';
    this.barba = new THREE.Group(); const cono = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.6, 18), matJ(pelo, 0.9)); cono.rotation.x = Math.PI; cono.position.y = -0.25; cono.castShadow = true; this.barba.add(cono);
    const bigote = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), matJ(pelo, 0.9)); bigote.scale.set(1.15, 0.6, 0.7); this.barba.add(bigote);
    this.barba.position.set(0, -0.1, 0.13); this.yo.cabeza.add(this.barba);
    // araña colgando de la mano
    this.arana = new THREE.Group(); const hilo = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.4, 4), new THREE.MeshBasicMaterial({ color: '#e8e8e8' })); hilo.position.y = -0.2; this.arana.add(hilo);
    const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), matJ('#141018', 0.5)); cuerpo.position.y = -0.42; this.arana.add(cuerpo);
    for (let i = 0; i < 8; i++) { const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.09, 4), matJ('#141018', 0.5)); const s = i < 4 ? 1 : -1, k = i % 4; pata.position.set(0.05 * s, -0.42, (k - 1.5) * 0.02); pata.rotation.z = s * 1.0; pata.rotation.x = (k - 1.5) * 0.3; this.arana.add(pata); }
    r.mundo.add(this.arana);
    // reloj de pared que va a toda velocidad
    this.reloj = new THREE.Group(); this.reloj.position.set(-5.93, 2.45, -0.4); this.reloj.rotation.y = Math.PI / 2; r.mundo.add(this.reloj);
    this.reloj.add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 32).rotateX(Math.PI / 2), matJ('#2a2420', 0.5)));
    const esfera = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), matJ('#fbf6ea', 0.8)); esfera.position.z = 0.032; this.reloj.add(esfera);
    for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.01), matJ('#2a2420')); const a = i / 12 * Math.PI * 2; m.position.set(Math.sin(a) * 0.25, Math.cos(a) * 0.25, 0.04); m.rotation.z = -a; this.reloj.add(m); }
    const aguja = (l, w) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(w, l, 0.012), matJ('#141018')); m.position.y = l / 2; g.add(m); g.position.z = 0.045; this.reloj.add(g); return g; };
    this.horas = aguja(0.15, 0.03); this.minutos = aguja(0.24, 0.02);
    // la mesa de al lado (la nuestra del restaurante): dos clientes
    this.A = muneco({ camisa: '#3fb6a8', pantalon: '#2b2f3a', pelo: '#2a1a12', peinado: 'largo', piel: '#f2c49b' }); this.A.sentar(); this.A.g.position.set(0, 0, -1.07); r.mundo.add(this.A.g);
    this.B = muneco({ camisa: '#f2a33a', pantalon: '#24324a', pelo: '#111111', peinado: 'corto', piel: '#c98d63' }); this.B.sentar(); this.B.g.position.set(0.05, 0, 0.37); this.B.g.rotation.y = Math.PI; r.mundo.add(this.B.g);
    this.mv = movil('#20232c'); this.mv.scale.setScalar(0.25); r.mundo.add(this.mv); this.on = ondas();
    this.canasMesa = [cana(), cana()]; this.canasMesa.forEach((c, i) => { c.position.set(-0.38 + i * 0.72, 0.79, 0.0); c.visible = false; r.mundo.add(c); });
    this.bravasMesa = bravas(); this.bravasMesa.position.set(0.0, 0.79, 0.12); this.bravasMesa.visible = false; r.mundo.add(this.bravasMesa);
    this.halo = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 40), new THREE.MeshBasicMaterial({ color: VX.cian, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false })); this.halo.rotation.x = -Math.PI / 2; r.mundo.add(this.halo);
    const c = this.c = { martes: cue('martes'), pasa: cue('pasa'), pasa2: cue('pasa', 2), barba: cue('barba'), ya: cue('ya'), mientras: cue('mientras'), acerca: cue('acerca'), pegatina: cue('pegatina'), pide: cue('pide'),
      dos: cue('dos'), bravas: cue('bravas'), pedido: cue('pedido'), barra: cue('barra'), cocina: cue('cocina'), un: cue('un'), mesa3: cue('mesa', 3), mismo: cue('mismo'), mismo2: cue('mismo', 2), diferencia: cue('diferencia'), nfc: cue('nfc'), comenta: cue('comenta') };
    if (c.un > 9000) c.un = cue('minuto') - 0.2;
    // planos (cortes secos, cada uno con un empuje lento)
    const yoC = [-3.6, 1.35, -0.52];
    this.planos = [
      { t: 0, de: [-2.55, 1.75, 2.0], a: [-2.75, 1.7, 1.55], mira: [-3.6, 1.2, -0.52], fov: 44 },
      { t: c.martes - 0.05, de: [-3.3, 1.5, 0.85], a: [-3.35, 1.48, 0.7], mira: [-3.6, 1.36, -0.52], fov: 38 },
      { t: c.pasa - 0.2, de: [-0.9, 2.2, 3.7], a: [-1.1, 2.1, 3.5], mira: [-3.4, 1.25, -0.3], fov: 46 },
      { t: c.ya - 0.05, de: [-3.1, 1.5, 1.4], a: [-3.2, 1.48, 1.15], mira: [-3.6, 1.3, -0.52], fov: 40 },
      { t: c.mientras - 0.1, de: [1.9, 1.65, 0.75], a: [1.6, 1.6, 0.55], mira: [0, 1.0, -0.7], fov: 42 },
      { t: c.pide - 0.1, telefono: true, fov: 36 },
      { t: c.barra - 0.35, de: [-3.9, 1.85, -3.5], a: [-4.05, 1.8, -3.75], mira: [-4.7, 1.6, -5.25], fov: 42 },
      { t: c.cocina - 0.12, de: [2.2, 2.15, -4.1], a: [2.3, 2.2, -4.35], mira: [2.8, 2.35, -6.45], fov: 44 },
      { t: c.un - 0.1, de: [2.1, 1.85, 1.0], a: [1.85, 1.8, 0.8], mira: [0, 1.0, -0.45], fov: 44 },
      { t: c.mismo - 0.15, de: [2.9, 1.85, 1.05], a: [2.6, 1.8, 0.95], mira: [-3.0, 1.3, -0.45], fov: 36 },
      { t: c.diferencia - 0.1, de: [0.6, 1.3, 0.1], a: [0.45, 1.2, -0.02], mira: [0.0, 0.86, -0.46], fov: 40 },
      { t: c.comenta - 0.4, de: [2.6, 1.8, 0.95], a: [2.4, 1.78, 0.9], mira: [-3.4, 1.3, -0.45], fov: 44 },
    ];
    this.musica = 'guitarra_bar'; this.volMusica = 0.42;
    efectos = [['whoosh', c.pasa - 0.1], ['whoosh', c.pasa2 - 0.1], ['pop', c.barba], ['whoosh', c.mientras - 0.15], ['tap', c.pegatina + 0.05], ['tick', c.dos + 0.1], ['tick', c.bravas + 0.1], ['ding', c.barra], ['ding', c.cocina + 0.05], ['pop', c.mesa3 - 0.2], ['pop', c.mesa3 + 0.1], ['whoosh', c.mismo2], ['hit', c.comenta]];
  },
  plano(t) { let p = this.planos[0], fin = 1e9; this.planos.forEach((q, k) => { if (t >= q.t) { p = q; fin = this.planos[k + 1]?.t ?? (q.t + 3); } }); return [p, fin]; },
  actualizar(t) {
    const c = this.c, yo = this.yo;
    this.gente.forEach((g, k) => { g.reset(); g.respirar(t, k); if (k !== 4 && Math.sin(t * 1.3 + k * 2) > 0.3) g.hablar(t); });
    // el de la mano: brazo arriba siempre, se le cae un poco y lo vuelve a subir
    const canso = Math.max(0, Math.sin(t * 0.9)) * 0.25; yo.bD.hombro.rotation.x = -2.85 + canso; yo.bD.hombro.rotation.z = -0.15; yo.bD.codo.rotation.x = -0.1 - canso * 0.6;
    yo.cejas.forEach((ce, s) => { ce.rotation.z = (s ? -1 : 1) * 0.25; });
    // mira al camarero cuando pasa
    const k = this.camarero; let mirar = null;
    this.barba.scale.setScalar(Math.max(0.001, lerp(0, 1, ease(prog(t, c.barba - 0.5, c.barba + 0.4))) + lerp(0, 0.6, prog(t, c.mismo - 0.2, c.mismo + 2))));
    // reloj: a toda velocidad mientras espera
    const vel = t < c.mientras ? 1 : 0.15; const ang = t * 6 * vel + (t > c.mientras ? c.mientras * 6 * 0.85 : 0);
    this.minutos.rotation.z = -ang * 12; this.horas.rotation.z = -ang;
    // camarero
    k.reset(); k.g.visible = true; k.bandeja.visible = false;
    const pasar = (t0, t1, x0, x1, z, bandeja = false) => { if (!entre(t, t0, t1)) return false; const kk = (t - t0) / (t1 - t0); k.g.position.set(lerp(x0, x1, kk), 0, z); k.g.rotation.y = x1 > x0 ? Math.PI / 2 : -Math.PI / 2; k.andar(t * 2.2, 1); k.bandeja.visible = bandeja; mirar = k.g.position; return true; };
    const pt = [[c.pasa - 0.3, c.pasa + 1.0, -5.6, 0.8, 1.15, false], [c.pasa2 - 0.2, c.pasa2 + 1.1, 0.8, -5.6, 1.2, true], [c.mismo2 - 0.3, c.mismo2 + 1.2, 0.8, -5.6, 1.15, false]];
    let hecho = false; for (const a of pt) if (pasar(...a)) { hecho = true; break; }
    if (!hecho) {
      if (entre(t, c.pedido, c.mesa3 + 1.8)) { // le lleva el pedido a la mesa de al lado
        const pts = [[c.pedido, -2.0, -4.6], [c.un - 0.2, -0.6, -2.0], [c.mesa3 - 0.3, 0.75, -0.55], [c.mesa3 + 1.8, 0.75, -0.55]];
        const rr2 = recorrido(pts, t); k.g.position.set(rr2.x, 0, rr2.z); k.bandeja.visible = t < c.mesa3 - 0.2;
        if (rr2.mueve) { k.g.rotation.y = rr2.dir; k.andar(t * 1.8, 1); } else { k.g.rotation.y = -1.9; k.respirar(t, 2); if (t < c.mesa3 + 0.4) { k.bD.hombro.rotation.x = -1.0; } k.hablar(t); }
      } else k.g.visible = false;
    }
    yo.cabeza.rotation.set(0, 0, 0); if (mirar) yo.cabeza.rotation.y = clamp(Math.atan2(mirar.x - yo.g.position.x, mirar.z - yo.g.position.z), -1.2, 1.2) * 0.8; else { yo.cabeza.rotation.y = Math.sin(t * 0.6) * 0.15; yo.cabeza.rotation.x = 0.08; }
    // araña en la mano a partir del "mismo bar"
    yo.g.updateMatrixWorld(true); const mano = yo.bD.mano.getWorldPosition(new THREE.Vector3());
    this.arana.visible = t > c.mismo - 0.3; this.arana.position.copy(mano); this.arana.position.y += 0.02 - Math.max(0, 1 - prog(t, c.mismo - 0.3, c.mismo + 0.6)) * 0.4; this.arana.rotation.y = t * 0.8;
    // mesa de al lado
    const A = this.A, B = this.B; A.reset(); B.reset(); A.respirar(t, 7); B.respirar(t, 8);
    const brindis = t > c.mesa3 + 0.3; this.canasMesa.forEach(cc => cc.visible = t > c.mesa3 - 0.25); this.bravasMesa.visible = t > c.mesa3 + 0.05;
    const tj = this.tj.userData.centro();
    let pm = null;
    if (entre(t, c.acerca - 0.4, c.cocina + 0.6)) { A.bD.hombro.rotation.x = -1.15; A.bD.codo.rotation.x = -0.7; A.g.updateMatrixWorld(true); pm = A.bD.mano.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0.06));
      const kk = prog(t, c.acerca, c.pegatina + 0.1) * (1 - prog(t, c.pegatina + 0.6, c.pide)); pm.lerp(tj.clone().add(new THREE.Vector3(0.16, 0.14, 0.18)), kk); }
    this.mv.visible = !!pm; if (pm) { this.mv.position.copy(pm); this.mv.lookAt(cam.position); }
    const sel = t < c.dos ? 0 : t < c.bravas ? 1 : 2; this.mv.userData.pantalla(t < c.pide - 0.2 ? 'bloqueo' : 'cartaV', t < c.pide - 0.2 ? {} : { sel });
    this.on.userData.actualizar(t, pm && entre(t, c.pegatina - 0.1, c.pegatina + 0.7) ? 1 : 0, this.mv.getWorldPosition(new THREE.Vector3()), tj);
    if (brindis) { [A, B].forEach((m, i) => { m.bD.hombro.rotation.x = -1.6 - 0.3 * Math.max(0, Math.sin(t * 5 + i)); m.bD.codo.rotation.x = -0.6; m.hablar(t + i); }); }
    if (t > c.mismo - 0.2) { A.cabeza.rotation.y = 0.5; }
    // pantallas de barra y cocina
    const pulso = 0.5 + 0.5 * Math.sin(t * 8);
    this.pantBarra.userData.pintar('barra', t > c.barra - 0.3 ? { nuevo: true, detalle: '2 × Caña', estado: 'NUEVO', pulso } : { nuevo: false });
    this.pantCoc.userData.pintar('cocina', t > c.cocina - 0.1 ? { nuevo: true, detalle: '1 × Patatas bravas', estado: 'NUEVO', pulso } : { nuevo: false });
    this.cocinero.reset(); this.cocinero.respirar(t, 4);
    // halo de la pegatina
    const cen = tj; this.halo.position.set(cen.x, 0.8, cen.z + 0.02); this.halo.material.opacity = (entre(t, c.diferencia, c.comenta) || entre(t, c.acerca - 0.6, c.pegatina)) ? 0.55 + 0.35 * Math.sin(t * 6) : 0; this.halo.scale.setScalar(1 + 0.12 * Math.sin(t * 6));
    // cámara
    const [p, fin] = this.plano(t); let pos, mira;
    if (p.telefono) { const mp = this.mv.position.clone(); const dir = new THREE.Vector3(1.7, 1.6, 0.6).sub(mp).normalize(); this.mv.lookAt(mp.clone().add(dir)); const kk = prog(t, p.t, fin); pos = mp.clone().add(dir.multiplyScalar(lerp(0.62, 0.52, kk))); mira = mp; }
    else { const kk = ease(prog(t, p.t, fin)); pos = new THREE.Vector3(...p.de).lerp(new THREE.Vector3(...p.a), kk); mira = new THREE.Vector3(...p.mira); }
    cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(mira); if (cam.fov !== p.fov) { cam.fov = p.fov; cam.updateProjectionMatrix(); }
  },
  capa(t) { velos(); cierreComenta(t, this.c.comenta - 0.2, 'CAÑA', 'y te lo enseño en tu bar'); },
};

// ---------- 16. Chiringuito al atardecer: cómo funciona el sistema en 5 pasos, con cortes de plano constantes ----------
function sombrillaTex(c1, c2) { return lienzo(512, 64, (x, w, h) => { for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? c1 : c2; x.fillRect(i * w / 12, 0, w / 12 + 1, h); } }).tex; }
function mesaPlaya(x, z, c1, c2) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 32), matJ('#f3e2c3', 0.8)); tapa.position.y = 0.77; tapa.castShadow = tapa.receiveShadow = true; g.add(tapa);
  const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.76, 10), matJ('#8a5a32')); pata.position.y = 0.38; g.add(pata);
  const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 8), matJ('#e9e2d4')); palo.position.y = 1.25; g.add(palo);
  const tela = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.45, 12, 1, true), new THREE.MeshStandardMaterial({ map: sombrillaTex(c1, c2), roughness: 0.9, side: THREE.DoubleSide })); tela.position.y = 2.42; tela.castShadow = true; g.add(tela);
  [-1, 1].forEach(s => { const silla = new THREE.Group(); silla.add(Object.assign(caja(0.46, 0.06, 0.44, '#ffffff', 0.02), {})); silla.children[0].position.y = 0.45;
    const resp = caja(0.46, 0.5, 0.05, '#ffffff', 0.02); resp.position.set(0, 0.72, -0.2); silla.add(resp);
    for (const [a, b] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), matJ('#d8d8d8')); p.position.set(a, 0.225, b); silla.add(p); }
    silla.position.z = s * 0.74; silla.rotation.y = s > 0 ? Math.PI : 0; g.add(silla); });
  g.userData.tela = tela; return g;
}
function palmera(x, z, h = 4.5, giro = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = giro; let px = 0, py = 0;
  for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.13 - i * 0.008, 0.16 - i * 0.008, h / 7 + 0.05, 10), matJ(i % 2 ? '#9a6b3f' : '#8a5c34', 0.95)); px += 0.06 * i * 0.25; py += h / 7; s.position.set(px, py - h / 14, 0); s.rotation.z = -0.05 * i * 0.3; s.castShadow = true; g.add(s); }
  const copa = new THREE.Group(); copa.position.set(px, py, 0); g.add(copa);
  for (let i = 0; i < 7; i++) { const h2 = new THREE.Group(); h2.rotation.y = i / 7 * Math.PI * 2; const hoja = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6), matJ(i % 2 ? '#3f9a4a' : '#4fb35a', 0.85)); hoja.scale.set(0.95, 0.06, 0.28); hoja.position.x = 0.85; hoja.rotation.z = -0.45; hoja.castShadow = true; h2.add(hoja); copa.add(h2); }
  [0, 2, 4].forEach(i => { const coco = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), matJ('#5a3a1e')); coco.position.set(Math.cos(i) * 0.15, -0.12, Math.sin(i) * 0.15); copa.add(coco); });
  g.userData.copa = copa; return g;
}
V['chiringuito'] = { ...comunCapa, estilo: 'chiringuito',
  async montar() {
    for (const [f, peso, estilo] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: estilo }); await ff.load(); document.fonts.add(ff); }
    ['chiringuito', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'pegatina', 'carta', 'camarero', 'acepta', 'barra', 'cocina', 'mesa', 'resena', 'google'].forEach(w => CLAVES.add(w));
    pared.visible = suelo.visible = bokeh.visible = false;
    const cielo = document.createElement('canvas'); cielo.width = 8; cielo.height = 256; const cx = cielo.getContext('2d'); const gr = cx.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#5a6fd6'); gr.addColorStop(0.35, '#d97aa8'); gr.addColorStop(0.62, '#ff9a6b'); gr.addColorStop(0.8, '#ffc98a'); gr.addColorStop(1, '#ffe2b0'); cx.fillStyle = gr; cx.fillRect(0, 0, 8, 256);
    const tc = new THREE.CanvasTexture(cielo); tc.colorSpace = THREE.SRGBColorSpace; scene.background = tc; scene.fog = new THREE.Fog('#ffc98a', 35, 110);
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0; hemi.color.set('#ffe4c8'); hemi.groundColor.set('#c98a5a'); hemi.intensity = 1.3;
    const sol = new THREE.DirectionalLight('#ffc48a', 2.4); sol.position.set(-9, 8, 7); sol.target.position.set(0, 0, 0); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0005; Object.assign(sol.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 }); scene.add(sol, sol.target);
    const contraluz = new THREE.DirectionalLight('#ff8a5a', 1.2); contraluz.position.set(4, 5, -20); scene.add(contraluz);
    renderer.toneMappingExposure = 1.05;
    const M = this.M = new THREE.Group(); scene.add(M);
    // arena, mar con olas y sol
    const arena = caja(140, 0.2, 40, '#f1d39a', 0.05, 0.95); arena.position.set(0, -0.1, 12); arena.receiveShadow = true; M.add(arena);
    const marG = new THREE.PlaneGeometry(160, 70, 90, 36); this.mar = new THREE.Mesh(marG, new THREE.MeshStandardMaterial({ color: '#1f9fb8', roughness: 0.35, metalness: 0.1, flatShading: true })); this.mar.rotation.x = -Math.PI / 2; this.mar.position.set(0, -0.15, -42); M.add(this.mar); this.marBase = marG.attributes.position.array.slice();
    this.espuma = caja(140, 0.05, 0.35, '#ffffff', 0.02); this.espuma.position.set(0, -0.06, -7.2); M.add(this.espuma);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(5, 48), new THREE.MeshBasicMaterial({ color: '#fff0c4', fog: false, toneMapped: false })); sun.position.set(-8, 3.2, -95); M.add(sun);
    // tarima de madera
    const tarima = caja(13, 0.18, 6.2, '#b97a45', 0.03, 0.8); tarima.position.set(0.5, 0.09, -3.2); tarima.receiveShadow = true; M.add(tarima);
    for (let z = -6.1; z <= -0.2; z += 0.5) { const l = caja(13, 0.012, 0.03, '#8a5530', 0.005); l.position.set(0.5, 0.185, z); M.add(l); }
    // barra con techo de paja
    const barra = caja(6.4, 1.1, 0.9, '#7a4a2a', 0.05); barra.position.set(0, 0.73, -3.2); barra.castShadow = true; M.add(barra);
    for (let x = -3.0; x <= 3.0; x += 0.22) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.05, 8), matJ(Math.round(x * 5) % 2 ? '#c9a46a' : '#b8925a', 0.8)); b.position.set(x, 0.72, -2.72); M.add(b); }
    const tope = caja(6.8, 0.1, 1.15, '#f0d9a8', 0.03, 0.5); tope.position.set(0, 1.33, -3.2); M.add(tope);
    for (const [x, z] of [[-3.15, -2.6], [3.15, -2.6], [-3.15, -4.7], [3.15, -4.7]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.3, 10), matJ('#8a5a32')); p.position.set(x, 1.83, z); p.castShadow = true; M.add(p); }
    const techo = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 4.6, 1.5, 32), matJ('#d8b260', 1)); techo.scale.z = 0.62; techo.position.set(0, 4.15, -3.65); techo.castShadow = true; M.add(techo);
    const fleco = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.75, 0.3, 32, 1, true), matJ('#c9a050', 1)); fleco.material.side = THREE.DoubleSide; fleco.scale.z = 0.62; fleco.position.set(0, 3.3, -3.65); M.add(fleco);
    const cartel = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.7), new THREE.MeshStandardMaterial({ map: lienzo(768, 168, (x, w, h) => { x.fillStyle = '#6b3f22'; rr(x, 0, 0, w, h, 30); x.fill(); x.strokeStyle = '#f0d9a8'; x.lineWidth = 6; rr(x, 10, 10, w - 20, h - 20, 24); x.stroke(); x.fillStyle = '#ffe9c4'; x.font = `italic 600 92px Fraunces, serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Chiringuito La Ola', w / 2, h / 2 + 4); }).tex, roughness: 0.8 }));
    cartel.position.set(0, 2.85, -2.58); M.add(cartel);
    for (let i = 0; i < 18; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26 + (i % 3) * 0.05, 10), matJ(['#2e7d4f', '#7a1f2b', '#c88a1a', '#3a4f8a', '#e5e0d0'][i % 5], 0.3)); b.position.set(-2.4 + i * 0.28, 1.55 + (i % 3) * 0.02, -3.9); M.add(b); }
    const balda = caja(5.4, 0.05, 0.3, '#6b3a20', 0.01); balda.position.set(0, 1.4, -3.9); M.add(balda);
    // guirnalda de bombillas
    this.bombillas = [];
    for (let i = 0; i <= 22; i++) { const k = i / 22, x = lerp(-3.15, 3.15, k), y = 3.05 - Math.sin(k * Math.PI) * 0.35; const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe7a0', toneMapped: false })); b.position.set(x, y, -2.55); M.add(b); this.bombillas.push(b); }
    // pantallas: barra y cocina
    this.pantBarra = pantalla3D(0.9, 0.56); this.pantBarra.position.set(2.35, 2.15, -2.5); this.pantBarra.rotation.y = -0.25; M.add(this.pantBarra);
    // caseta cocina a la derecha
    const coc = new THREE.Group(); coc.position.set(5.6, 0, -3.4); M.add(coc);
    coc.add(Object.assign(caja(2.6, 2.6, 0.15, '#e9d3a8', 0.03), {})); coc.children[0].position.set(0, 1.3, -1.0);
    [-1, 1].forEach(s => { const l = caja(0.15, 2.6, 2.1, '#e9d3a8', 0.03); l.position.set(s * 1.25, 1.3, 0); coc.add(l); });
    const tejado = caja(3.0, 0.15, 2.6, '#c46a3a', 0.03); tejado.position.set(0, 2.7, 0.1); tejado.rotation.x = 0.12; coc.add(tejado);
    const mostr = caja(2.4, 1.0, 0.55, '#f0d9a8', 0.03); mostr.position.set(0, 0.5, 0.75); coc.add(mostr);
    const plancha = caja(1.0, 0.08, 0.5, '#2b2e33', 0.01); plancha.position.set(-0.3, 1.0, -0.6); coc.add(plancha); const mueble = caja(2.2, 0.95, 0.55, '#b9c0c7', 0.02); mueble.position.set(0, 0.475, -0.6); coc.add(mueble);
    this.pantCoc = pantalla3D(1.0, 0.62); this.pantCoc.position.set(5.6, 2.25, -2.6); M.add(this.pantCoc);
    const rotC = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: lienzo(400, 100, (x, w, h) => { x.fillStyle = '#c46a3a'; rr(x, 0, 0, w, h, 20); x.fill(); x.fillStyle = '#fff'; x.font = `900 58px Inter, ${FUENTE}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('COCINA', w / 2, h / 2 + 3); }).tex })); rotC.position.set(5.6, 2.75, -2.55); M.add(rotC);
    // mesas en la arena, palmeras
    this.mesas = [mesaPlaya(0.8, 2.2, '#ff6b6b', '#fff4e6'), mesaPlaya(-2.9, 3.0, '#2bb3c9', '#fff4e6'), mesaPlaya(4.0, 3.4, '#ffb547', '#fff4e6'), mesaPlaya(-5.6, 1.2, '#5fcf9a', '#fff4e6')]; this.mesas.forEach(m => M.add(m)); this.mesas[0].userData.tela.visible = false; this.mesas[0].children[2].visible = false;
    this.palmeras = [palmera(-7.2, -2.0, 5.2, 0.3), palmera(8.2, -1.0, 4.6, 2.2), palmera(-4.8, 6.5, 4.0, 1.0), palmera(9.5, 5.5, 5.0, 3.5)]; this.palmeras.forEach(p => M.add(p));
    // la pegatina de nuestra mesa
    this.tj = tarjetaMenu(); this.tj.scale.setScalar(0.3); this.tj.position.set(0.55, 0.795, 1.92); this.tj.rotation.y = 0.25; M.add(this.tj);
    this.halo = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 40), new THREE.MeshBasicMaterial({ color: VX.cian, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false })); this.halo.rotation.x = -Math.PI / 2; M.add(this.halo);
    this.aro = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.4, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false })); this.aro.rotation.x = -Math.PI / 2; this.aro.position.set(0.8, 0.02, 2.2); M.add(this.aro);
    // gente
    const ROPAS = [{ camisa: '#ff7a6a', pantalon: '#f1e3c8', pelo: '#2a1a12', peinado: 'largo', piel: '#f0c29a' }, { camisa: '#3d7fd6', pantalon: '#2f3a56', pelo: '#111', peinado: 'corto', piel: '#c98d63' },
      { camisa: '#e0a826', pantalon: '#4a3b6b', pelo: '#7a3d1d', peinado: 'mono', piel: '#e9b48c' }, { camisa: '#d6567a', pantalon: '#24324a', pelo: '#d9a441', peinado: 'largo', piel: '#f5cfac' },
      { camisa: '#7a5ad6', pantalon: '#3a3a3a', pelo: '#4a2c1a', peinado: 'corto', piel: '#ab7450' }, { camisa: '#5aa55e', pantalon: '#2f3a56', pelo: '#2a1a12', peinado: 'calvo', piel: '#f0c29a' }];
    this.gente = [];
    const sentar = (r, x, z, rot) => { const m = muneco(r); m.sentar(); m.g.position.set(x, 0, z); m.g.rotation.y = rot; M.add(m.g); this.gente.push(m); return m; };
    this.A = sentar({ camisa: '#ffb020', pantalon: '#24324a', pelo: '#2a1a12', peinado: 'corto', piel: '#f0c29a' }, 0.8, 1.48, 0);
    this.B = sentar({ camisa: '#3fb6a8', pantalon: '#2b2f3a', pelo: '#3a2418', peinado: 'largo', piel: '#f2c49b' }, 0.8, 2.92, Math.PI);
    sentar(ROPAS[0], -2.9, 2.26, 0); sentar(ROPAS[1], -2.9, 3.74, Math.PI); sentar(ROPAS[2], 4.0, 2.66, 0); sentar(ROPAS[3], 4.0, 4.14, Math.PI); sentar(ROPAS[4], -5.6, 0.46, 0); sentar(ROPAS[5], -5.6, 1.94, Math.PI);
    this.barman = muneco({ camisa: '#ffffff', pantalon: '#2f3a56', pelo: '#2a1a12', peinado: 'mono', piel: '#c98d63', delantal: '#2a9d8f' }); this.barman.g.position.set(-0.7, 0.18, -3.95); M.add(this.barman.g);
    this.cocinero = muneco({ camisa: '#ffffff', pantalon: '#3a3d48', gorro: 'chef', pelo: '#2a1a12', peinado: 'calvo', piel: '#d9a07a' }); this.cocinero.g.position.set(5.6, 0.18, -3.65); M.add(this.cocinero.g);
    this.cam1 = muneco({ camisa: '#2a9d8f', pantalon: '#f1e3c8', pelo: '#2a1a12', peinado: 'corto', piel: '#e9b48c', delantal: '#ffffff' }); M.add(this.cam1.g);
    const bandeja = new THREE.Group(); bandeja.add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.025, 32), matJ('#c9ccd2', 0.3)));
    const cb1 = cana(); cb1.position.set(-0.09, 0.012, 0.03); const cb2 = cana(); cb2.position.set(0.08, 0.012, -0.04); const bb = bravas(); bb.scale.setScalar(0.7); bb.position.set(0.02, 0.012, 0.13); bandeja.add(cb1, cb2, bb);
    bandeja.position.set(0, -0.3, 0.12); this.cam1.bI.codo.add(bandeja); this.bandeja = bandeja;
    // pedido en la barra y en la mesa
    this.canasBarra = [cana(), cana()]; this.canasBarra.forEach((c, i) => { c.position.set(1.2 + i * 0.22, 1.38, -2.95); M.add(c); });
    this.bravasBarra = bravas(); this.bravasBarra.position.set(1.75, 1.38, -2.95); M.add(this.bravasBarra);
    this.canasMesa = [cana(), cana()]; this.canasMesa.forEach((c, i) => { c.position.set(0.5 + i * 0.62, 0.795, 2.25 + i * 0.12); M.add(c); });
    this.bravasMesa = bravas(); this.bravasMesa.position.set(0.95, 0.795, 2.55); M.add(this.bravasMesa);
    // móviles
    this.mv = movil('#20232c'); this.mv.scale.setScalar(0.24); M.add(this.mv);
    this.mvC = movil('#1d1f27'); this.mvC.scale.setScalar(0.24); M.add(this.mvC);
    this.on = ondas();
    const c = this.c = { levanta: cue('levanta'), explico: cue('explico'), uno: cue('uno'), acercas: cue('acercas'), pegatina: cue('pegatina'), abre: cue('abre'), dos: cue('dos'), eliges: cue('eliges'), pides: cue('pides'),
      camarero: cue('camarero'), pedido: cue('pedido'), acepta: cue('acepta'), tres: cue('tres'), barra: cue('barra'), cocina: cue('cocina'), ponen: cue('ponen'), cuatro: cue('cuatro'), traen: cue('traen'), mesa2: cue('mesa', 2),
      sistema: cue('sistema'), cinco: cue('cinco'), antes: cue('antes'), misma: cue('misma'), resena: cue('resena'), si: cue('si'), comenta: cue('comenta') };
    this.pasos = [c.uno - 0.1, c.dos - 0.1, c.tres - 0.1, c.cuatro - 0.1, c.cinco - 0.25];
    const P = (t, de, a, mira, fov = 40) => ({ t, de, a, mira, fov });
    this.planos = [
      P(0, [6, 9, 14], [3.6, 5.2, 9.6], [0.5, 1.2, -1.5], 44),
      P(c.levanta - 0.1, [-1.4, 0.95, 5.4], [-1.0, 1.0, 4.8], [0.8, 1.05, 2.0], 40),
      P(c.explico - 0.3, [2.0, 1.55, 3.7], [1.5, 1.3, 3.0], [0.6, 0.85, 1.95], 38),
      P(c.uno - 0.1, [2.1, 1.2, 1.5], [1.85, 1.15, 1.65], [0.6, 0.9, 1.9], 34),
      { t: c.abre - 0.25, telefono: 'mv', fov: 36 },
      { t: c.dos - 0.1, telefono: 'mv', ref: [-0.2, 1.9, 1.0], fov: 36 },
      P(c.camarero - 0.15, [3.7, 1.6, 0.5], [3.4, 1.55, 0.15], [2.0, 1.3, -2.0], 38),
      { t: c.pedido - 0.1, telefono: 'mvC', fov: 36 },
      P(c.tres - 0.1, [0.9, 1.95, 0.6], [1.1, 1.95, 0.25], [2.05, 1.8, -2.6], 46),
      P(c.barra - 0.1, [-0.1, 1.75, -1.5], [-0.3, 1.7, -1.8], [-0.6, 1.4, -3.6], 38),
      P(c.cocina - 0.1, [4.2, 1.85, 0.9], [4.4, 1.85, 0.5], [5.6, 1.7, -3.0], 42),
      P(c.ponen - 0.2, [3.6, 2.0, 0.4], [3.3, 1.95, 0.1], [1.4, 1.25, -2.6], 40),
      { t: c.cuatro - 0.1, sigue: true, fov: 42 },
      P(c.mesa2 - 0.15, [-0.7, 1.65, 4.0], [-0.5, 1.6, 3.7], [0.9, 0.95, 2.1], 40),
      P(c.sistema - 0.2, [0.8, 7.6, 3.4], [0.8, 6.2, 3.0], [0.8, 0, 2.15], 46),
      P(c.cinco - 0.25, [2.5, 1.55, 2.75], [2.2, 1.45, 2.55], [0.6, 0.9, 1.95], 36),
      { t: c.misma - 0.1, telefono: 'mv', fov: 36 },
      P(c.si - 0.1, [2.5, 2.6, 7.5], [5.5, 8.5, 16], [0.5, 1.2, -1.5], 44),
    ];
    this.musica = 'guitarra_bar'; this.volMusica = 0.45;
    efectos = [['whoosh', 0.02], ...this.pasos.map(t => ['pop', t + 0.05]), ...this.planos.slice(1).map(p => ['whoosh', p.t]).filter((_, i) => i % 2 === 0),
      ['tap', c.pegatina + 0.05], ['ding', c.abre], ['tick', c.eliges + 0.1], ['tick', c.pides + 0.1], ['buzz', c.camarero + 0.2], ['tap', c.acepta + 0.05], ['ding', c.barra], ['ding', c.cocina + 0.05], ['pop', c.mesa2 + 0.2], ['tap', c.misma], ['ding', c.resena + 0.4], ['hit', c.comenta]];
  },
  plano(t) { let p = this.planos[0], fin = 1e9; this.planos.forEach((q, k) => { if (t >= q.t) { p = q; fin = this.planos[k + 1]?.t ?? (q.t + 3); } }); return [p, fin]; },
  actualizar(t) {
    const c = this.c;
    // mar, espuma, palmeras, sombrillas, bombillas
    const pos = this.mar.geometry.attributes.position, b = this.marBase; for (let i = 0; i < pos.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; pos.array[i * 3 + 2] = 0.18 * Math.sin(x * 0.25 + t * 1.3) + 0.12 * Math.sin(y * 0.45 + t * 0.9) + 0.06 * Math.sin((x + y) * 0.9 + t * 2.1); } pos.needsUpdate = true; this.mar.geometry.computeVertexNormals();
    this.espuma.position.z = -7.2 + Math.sin(t * 0.9) * 0.35; this.espuma.scale.z = 1 + 0.4 * Math.sin(t * 0.9 + 1);
    this.palmeras.forEach((p, k) => { p.userData.copa.rotation.z = Math.sin(t * 0.8 + k) * 0.05; p.userData.copa.rotation.x = Math.cos(t * 0.6 + k) * 0.04; });
    this.mesas.forEach((m, k) => { m.userData.tela.rotation.y = Math.sin(t * 1.5 + k) * 0.03; });
    this.bombillas.forEach((bb, k) => { bb.material.color.setHSL(0.13, 1, 0.75 + 0.12 * Math.sin(t * 3 + k)); });
    // gente sentada
    this.gente.forEach((g, k) => { g.reset(); g.respirar(t, k); if (k > 1 && Math.sin(t * 1.2 + k * 1.7) > 0.4) g.hablar(t + k); });
    const A = this.A, B = this.B;
    const servido = t > c.mesa2 + 0.15;
    if (servido && t < c.cinco - 0.3) { [A, B].forEach((m, i) => { if (Math.sin(t * 1.4 + i * 2) > 0) { m.bI.hombro.rotation.x = -1.3; m.bI.codo.rotation.x = -0.9; } m.hablar(t + i); }); }
    if (entre(t, c.explico - 0.3, c.uno)) B.hablar(t);
    // el móvil del cliente: se acerca a la pegatina, se lee la carta, y otra vez para la reseña
    const conMovil = entre(t, c.uno - 0.4, c.camarero - 0.15) || entre(t, c.cinco - 0.4, c.si);
    let pm = null; const tj = this.tj.userData.centro();
    if (conMovil) { A.bD.hombro.rotation.x = -1.15; A.bD.codo.rotation.x = -0.75; A.g.updateMatrixWorld(true); pm = A.bD.mano.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0.08));
      const k1 = prog(t, c.acercas, c.pegatina + 0.1) * (1 - prog(t, c.abre - 0.4, c.abre)); const k2 = prog(t, c.antes, c.misma - 0.05) * (1 - prog(t, c.misma + 0.4, c.misma + 0.8));
      pm.lerp(tj.clone().add(new THREE.Vector3(0.12, 0.13, 0.12)), Math.max(k1, k2)); }
    this.mv.visible = !!pm; if (pm) this.mv.position.copy(pm);
    const selA = t < c.eliges ? 0 : t < c.pides ? 1 : 2;
    if (t < c.pegatina + 0.15) this.mv.userData.pantalla('bloqueo');
    else if (t < c.camarero) this.mv.userData.pantalla('cartaV', { sel: selA });
    else if (t > c.misma + 0.15) { const st = Math.min(5, Math.floor((t - c.misma - 0.2) / 0.12)); this.mv.userData.pantalla('resenaG', { llenas: Math.max(0, st), texto: t > c.resena + 0.3 ? '¡Qué buen sitio! Pedí desde la mesa' : '' }); }
    else this.mv.userData.pantalla('bloqueo');
    const onda = pm && (entre(t, c.pegatina - 0.1, c.pegatina + 0.6) || entre(t, c.misma - 0.15, c.misma + 0.45));
    this.on.userData.actualizar(t, onda ? 1 : 0, this.mv.getWorldPosition(new THREE.Vector3()), tj);
    this.halo.position.set(tj.x, 0.8, tj.z); this.halo.material.opacity = entre(t, c.explico - 0.3, c.pegatina) || entre(t, c.cinco - 0.25, c.misma) ? 0.55 + 0.35 * Math.sin(t * 6) : 0; this.halo.scale.setScalar(1 + 0.12 * Math.sin(t * 6));
    this.aro.material.opacity = entre(t, c.sistema - 0.2, c.cinco - 0.3) ? 0.7 * (0.6 + 0.4 * Math.sin(t * 5)) : 0; this.aro.scale.setScalar(1 + 0.05 * Math.sin(t * 5));
    // camarero: recibe el pedido, lo acepta, recoge en barra y lo lleva a la mesa
    const k = this.cam1; k.reset(); this.bandeja.visible = entre(t, c.ponen + 0.5, c.mesa2 + 0.15);
    const pts = [[0, 2.2, -1.9], [c.acepta + 0.5, 2.2, -1.9], [c.tres + 0.6, 1.5, -2.25], [c.cuatro + 0.1, 1.5, -2.25], [c.mesa2 - 0.05, 1.75, 1.95], [c.cinco - 0.4, 1.75, 1.95], [c.cinco + 1.6, 3.0, -0.8]];
    const r = recorrido(pts, t); k.g.position.set(r.x, 0.18 * clamp((-r.z + 0.2) * 3), r.z);
    if (r.mueve) { k.g.rotation.y = r.dir; k.andar(t * 1.8, 1); } else { k.g.rotation.y = t < c.acepta + 0.5 ? 0.4 : t < c.cuatro ? Math.PI : -1.5; k.respirar(t, 5); }
    const conMovilC = entre(t, c.camarero - 0.3, c.acepta + 0.6);
    if (conMovilC) { k.bD.hombro.rotation.x = -1.15; k.bD.codo.rotation.x = -0.8; if (entre(t, c.acepta - 0.1, c.acepta + 0.3)) k.bI.hombro.rotation.x = -1.0; }
    if (this.bandeja.visible) { k.bI.codo.rotation.x = -1.45; k.bI.hombro.rotation.x = -0.15; }
    if (entre(t, c.mesa2 - 0.1, c.mesa2 + 0.6)) k.hablar(t);
    k.g.updateMatrixWorld(true);
    this.mvC.visible = conMovilC; if (conMovilC) { const vib = entre(t, c.camarero, c.camarero + 0.6) ? Math.sin(t * 90) * 0.012 : 0; this.mvC.position.copy(k.bD.mano.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(vib, 0.1, 0.06)); }
    this.mvC.userData.pantalla(t < c.camarero ? 'bloqueo' : 'pedidoCamarero', { lineas: [['2 × Caña', 'bebida'], ['1 × Patatas bravas', 'comida']], resumen: 'Mesa 7 · hace 2 s · 11,50 €', confirmado: t > c.acepta + 0.15, onda: entre(t, c.acepta, c.acepta + 0.4) ? Math.round(prog(t, c.acepta, c.acepta + 0.4) * 8) / 8 : 0 });
    // barra y cocina
    const pulso = 0.5 + 0.5 * Math.sin(t * 8);
    this.pantBarra.userData.pintar('barra', t > c.tres ? { nuevo: true, detalle: '2 × Caña', estado: t > c.ponen ? 'LISTO' : 'NUEVO', pulso } : { nuevo: false });
    this.pantCoc.userData.pintar('cocina', t > c.tres + 0.2 ? { nuevo: true, detalle: '1 × Patatas bravas', estado: t > c.ponen ? 'LISTO' : 'EN MARCHA', pulso } : { nuevo: false });
    const bm = this.barman; bm.reset(); bm.respirar(t, 6); if (entre(t, c.barra - 0.3, c.ponen + 0.3)) { bm.bD.hombro.rotation.x = -1.1 - 0.3 * Math.sin(t * 6); bm.bD.codo.rotation.x = -0.6; bm.cabeza.rotation.x = 0.3; }
    const ck = this.cocinero; ck.reset(); ck.respirar(t, 7); if (entre(t, c.cocina - 0.3, c.ponen + 0.4)) { ck.bD.hombro.rotation.x = -0.9 - 0.35 * Math.sin(t * 9); ck.bI.hombro.rotation.x = -0.8 - 0.3 * Math.cos(t * 7); ck.cabeza.rotation.x = 0.35; }
    this.canasBarra.forEach((cc, i) => cc.visible = entre(t, c.barra + 0.3 + i * 0.25, c.ponen + 0.5)); this.bravasBarra.visible = entre(t, c.ponen - 0.2, c.ponen + 0.5);
    this.canasMesa.forEach(cc => cc.visible = servido); this.bravasMesa.visible = t > c.mesa2 + 0.3;
    // cámara
    const [p, fin] = this.plano(t); let cpos, mira; const kk = ease(prog(t, p.t, fin));
    if (p.telefono) { const ob = this[p.telefono]; const mp = ob.position.clone(); const ref = p.ref ? new THREE.Vector3(...p.ref) : p.telefono === 'mv' ? new THREE.Vector3(1.5, 1.7, 0.6) : new THREE.Vector3(2.6, 1.55, 0.7); const dir = ref.sub(mp).normalize(); ob.lookAt(mp.clone().add(dir)); cpos = mp.clone().add(dir.multiplyScalar(lerp(0.6, 0.5, kk))); mira = mp; }
    else if (p.sigue) { const w = k.g.position; cpos = new THREE.Vector3(w.x + 2.6, 1.35, w.z + 2.4); mira = new THREE.Vector3(w.x, 1.0, w.z); }
    else { cpos = new THREE.Vector3(...p.de).lerp(new THREE.Vector3(...p.a), kk); mira = p.mira === 'mv' ? this.mv.position.clone() : new THREE.Vector3(...p.mira); }
    if (!p.telefono) { this.mv.lookAt(cpos); this.mvC.lookAt(cpos); }
    cam.position.copy(cpos); cam.up.set(0, 1, 0); cam.lookAt(mira); if (cam.fov !== p.fov) { cam.fov = p.fov; cam.updateProjectionMatrix(); }
  },
  capa(t) {
    const c = this.c; velos();
    // paso actual: número grande y etiqueta corta
    const NOM = ['Acercas el móvil', 'El camarero lo acepta', 'Barra y cocina', 'A tu mesa', 'Tu reseña'];
    let i = -1; this.pasos.forEach((p, k) => { if (t >= p) i = k; });
    if (i >= 0 && t < c.si - 0.1) {
      const k = rebote(clamp((t - this.pasos[i]) / 0.4)); C.save(); C.translate(W / 2, 1470); C.scale(k, k);
      C.font = `800 50px Inter, ${FUENTE}`; const w = C.measureText(NOM[i]).width + 170;
      C.fillStyle = 'rgba(255,255,255,0.95)'; C.shadowColor = 'rgba(90,40,20,0.35)'; C.shadowBlur = 24; rr(C, -w / 2, -54, w, 108, 54); C.fill(); C.shadowBlur = 0;
      C.fillStyle = grad(C, -w / 2, 0, -w / 2 + 100, 0, ['#ff8a3d', '#ff5e62']); C.beginPath(); C.arc(-w / 2 + 54, 0, 40, 0, 7); C.fill();
      C.fillStyle = '#fff'; C.font = `900 50px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(String(i + 1), -w / 2 + 54, 3);
      C.fillStyle = '#3a2416'; C.font = `800 50px Inter, ${FUENTE}`; C.textAlign = 'left'; C.fillText(NOM[i], -w / 2 + 112, 3); C.restore();
      // puntos de progreso
      for (let j = 0; j < 5; j++) { C.fillStyle = j <= i ? '#ffffff' : 'rgba(255,255,255,0.35)'; C.beginPath(); C.arc(W / 2 - 64 + j * 32, 1560, j === i ? 9 : 6, 0, 7); C.fill(); }
    }
    cierreComenta(t, c.comenta - 0.2, 'CHIRINGUITO', 'y te lo enseño en tu bar');
  },
};

// ---------- 17. Ahorro: el mapa de pasos del camarero (vista cenital), horas → euros, y con NFC la mitad ----------
function azar(semilla) { let a = semilla >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rastro(n, color) {
  const geo = new THREE.CircleGeometry(0.055, 10); geo.rotateX(-Math.PI / 2);
  const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }), n); m.count = 0; m.renderOrder = 2; m.frustumCulled = false; return m;
}
// puntos cada 0.11 m a lo largo de una lista de viajes [[x,z],...]
function muestrear(viajes) { const pts = []; for (const v of viajes) for (let i = 0; i < v.length - 1; i++) { const [x0, z0] = v[i], [x1, z1] = v[i + 1]; const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(d / 0.11)); for (let k = 0; k < n; k++) pts.push([lerp(x0, x1, k / n), lerp(z0, z1, k / n)]); } return pts; }
V['ahorro'] = { ...comunCapa, estilo: 'ahorro',
  async montar() {
    for (const [f, peso, estilo] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: estilo }); await ff.load(); document.fonts.add(ff); }
    ['camina', 'turno', 'apuntar', 'quince', 'sesenta', 'dos', 'horas', 'setecientos', 'euros', 'pegatina', 'nfc', 'solo', 'mitad', 'ahorro'].forEach(w => CLAVES.add(w));
    pared.visible = suelo.visible = bokeh.visible = false; scene.fog = null; scene.background = new THREE.Color('#14261f');
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0; hemi.color.set('#fff4e4'); hemi.groundColor.set('#6a5a48'); hemi.intensity = 1.5;
    const sol = new THREE.DirectionalLight('#fff0dc', 1.8); sol.position.set(4, 14, 6); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0005; Object.assign(sol.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); scene.add(sol);
    renderer.toneMappingExposure = 1.05;
    const M = this.M = new THREE.Group(); scene.add(M);
    // suelo de damero, paredes de azulejo verde
    const dam = lienzo(512, 512, (x, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#1d1d22' : '#efe6d4'; x.fillRect(i * 64, j * 64, 64, 64); } }).tex; dam.wrapS = dam.wrapT = THREE.RepeatWrapping; dam.repeat.set(4, 7.5);
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 13.5), new THREE.MeshStandardMaterial({ map: dam, roughness: 0.45 })); piso.rotation.x = -Math.PI / 2; piso.position.z = -0.25; piso.receiveShadow = true; M.add(piso);
    const azu = lienzo(256, 256, (x, w, h) => { x.fillStyle = '#2f8f6f'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e8f3ee'; x.lineWidth = 5; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke(); x.beginPath(); x.moveTo(i * 64 + (i % 2) * 0, 0); x.lineTo(i * 64, h); x.stroke(); } }).tex; azu.wrapS = azu.wrapT = THREE.RepeatWrapping;
    const muro = (w, h, d, x, z, rx = 1) => { const t = azu.clone(); t.needsUpdate = true; t.repeat.set(Math.max(w, d) * 1.5, h * 1.5); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: t, roughness: 0.3 })); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; M.add(m); };
    muro(7.4, 1.3, 0.2, 0, -7.1); muro(0.2, 1.3, 13.6, -3.7, -0.25); muro(0.2, 1.3, 13.6, 3.7, -0.25); muro(2.6, 1.3, 0.2, -2.3, 6.6); muro(2.6, 1.3, 0.2, 2.3, 6.6);
    // barra arriba
    const barra = caja(5.6, 1.05, 0.75, '#2f8f6f', 0.04, 0.4); barra.position.set(0, 0.525, -5.3); barra.castShadow = true; M.add(barra);
    const marmol = caja(5.9, 0.08, 0.95, '#f4f1ea', 0.03, 0.25); marmol.position.set(0, 1.09, -5.3); M.add(marmol);
    const tiradores = [-1.2, -0.9, -0.6].map(x => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), matJ('#c9a46a', 0.2, { metalness: 0.8 })); c.position.set(x, 1.28, -5.4); M.add(c); return c; });
    for (let i = 0; i < 16; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 10), matJ(['#2e7d4f', '#7a1f2b', '#c88a1a', '#3a4f8a', '#e5e0d0'][i % 5], 0.3)); b.position.set(-2.4 + i * 0.32, 1.45, -6.85); M.add(b); }
    const balda = caja(5.4, 0.05, 0.3, '#6b3a20', 0.01); balda.position.set(0, 1.28, -6.85); M.add(balda);
    this.pantBarra = pantalla3D(0.9, 0.56); this.pantBarra.position.set(1.8, 1.55, -5.05); this.pantBarra.rotation.x = -0.9; M.add(this.pantBarra);
    // 15 mesas de mármol con sillas de madera curvada
    this.mesas = []; const R = azar(7);
    const ROPA = [['#e85d4a', 'largo', '#2a1a12', '#f0c29a'], ['#3d7fd6', 'corto', '#111', '#c98d63'], ['#e0a826', 'mono', '#7a3d1d', '#e9b48c'], ['#d6567a', 'largo', '#d9a441', '#f5cfac'], ['#7a5ad6', 'corto', '#4a2c1a', '#ab7450'], ['#5aa55e', 'calvo', '#2a1a12', '#f0c29a']];
    this.gente = [];
    for (let fila = 0; fila < 5; fila++) for (let col = 0; col < 3; col++) {
      const x = (col - 1) * 2.15, z = -3.3 + fila * 1.85; const g = new THREE.Group(); g.position.set(x, 0, z); M.add(g);
      const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 28), matJ('#f4f1ea', 0.25)); tapa.position.y = 0.76; tapa.castShadow = tapa.receiveShadow = true; g.add(tapa);
      const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.2, 0.74, 12), matJ('#1d1d22', 0.4, { metalness: 0.5 })); pie.position.y = 0.37; g.add(pie);
      [-1, 1].forEach(s => { const silla = new THREE.Group(); const asiento = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 18), matJ('#6b3a20', 0.5)); asiento.position.y = 0.45; silla.add(asiento);
        const resp = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 16, Math.PI), matJ('#4a2614', 0.5)); resp.position.set(0, 0.72, -0.18 * 1); silla.add(resp); silla.position.x = s * 0.68; silla.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(silla); });
      const n = R() < 0.6 ? 2 : 1;
      for (let k = 0; k < n; k++) { const r = ROPA[Math.floor(R() * ROPA.length)]; const m = muneco({ camisa: r[0], peinado: r[1], pelo: r[2], piel: r[3], pantalon: '#2f3a56' }); m.sentar(); const s = k ? 1 : -1; m.g.position.set(x + s * 0.66, 0, z); m.g.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; M.add(m.g); this.gente.push(m); }
      const tj = tarjetaMenu(); tj.scale.setScalar(0.24); tj.position.set(x + 0.12, 0.785, z - 0.18); tj.rotation.y = 0.3; tj.visible = false; M.add(tj);
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 40), new THREE.MeshBasicMaterial({ color: VX.cian, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false })); halo.rotation.x = -Math.PI / 2; halo.position.set(x, 0.81, z); M.add(halo);
      this.mesas.push({ x, z, tj, halo, idx: this.mesas.length });
    }
    // el camarero con libreta y bandeja
    this.cam1 = muneco({ camisa: '#ffffff', pantalon: '#1d1b22', delantal: '#1d1b22', pajarita: '#c0263a', pelo: '#3a2418', peinado: 'corto', piel: '#eab48a' }); M.add(this.cam1.g);
    this.libreta = new THREE.Group(); const hoja = caja(0.12, 0.16, 0.02, '#ffffff', 0.005); this.libreta.add(hoja); this.libreta.position.set(0, -0.3, 0.05); this.cam1.bI.codo.add(this.libreta);
    this.bandeja = new THREE.Group(); this.bandeja.add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.025, 28), matJ('#c9ccd2', 0.3))); const cb = cana(); cb.position.set(-0.07, 0.012, 0); const cb2 = cana(); cb2.position.set(0.08, 0.012, 0.03); this.bandeja.add(cb, cb2);
    this.bandeja.position.set(0, -0.3, 0.12); this.cam1.bI.codo.add(this.bandeja);
    // recorridos: sin NFC 60 viajes (30 apuntar + 30 llevar), con NFC 30 (solo llevar)
    const viaje = (m, R2) => { const bx = lerp(-1.6, 1.6, R2()), lado = m.x > 0.1 ? -1 : m.x < -0.1 ? 1 : (R2() < 0.5 ? -1 : 1); const px = m.x + lado * 0.15, pz = m.z + 0.62 * (R2() < 0.5 ? 1 : -1);
      const pasillo = m.x + lado * 1.07; return [[bx, -4.55], [lerp(bx, pasillo, 0.6), -3.9 + R2() * 0.3], [pasillo, pz - 0.3], [px, pz], [pasillo, pz + 0.2], [lerp(bx, pasillo, 0.5) + 0.2, -3.85], [bx + 0.15, -4.55]]; };
    const RA = azar(11), RB = azar(23);
    const vA = []; for (let i = 0; i < 60; i++) vA.push(viaje(this.mesas[Math.floor(RA() * 15)], RA));
    const vB = []; for (let i = 0; i < 30; i++) vB.push(viaje(this.mesas[Math.floor(RB() * 15)], RB));
    this.ptsA = muestrear(vA); this.ptsB = muestrear(vB);
    this.trA = rastro(this.ptsA.length, '#ff8a3d'); this.trB = rastro(this.ptsB.length, '#3fe08a'); M.add(this.trA, this.trB);
    const mm = new THREE.Matrix4(); this.ptsA.forEach(([x, z], i) => { mm.makeTranslation(x, 0.012 + (i % 7) * 0.0004, z); this.trA.setMatrixAt(i, mm); }); this.ptsB.forEach(([x, z], i) => { mm.makeTranslation(x, 0.015 + (i % 7) * 0.0004, z); this.trB.setMatrixAt(i, mm); });
    // monedas
    this.monedas = []; const RC = azar(5);
    for (let i = 0; i < 70; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.028, 20), new THREE.MeshStandardMaterial({ color: '#f2c14e', metalness: 0.85, roughness: 0.25, emissive: '#5a3a00', emissiveIntensity: 0.3 })); m.castShadow = true;
      const pila = i % 5, nivel = Math.floor(i / 5); m.userData = { x: -0.9 + pila * 0.45 + (RC() - 0.5) * 0.04, z: -5.3 + (RC() - 0.5) * 0.15, y: 1.15 + nivel * 0.03, r: RC() * 6 }; m.visible = false; M.add(m); this.monedas.push(m); }
    // partículas pedido → barra
    this.chispas = this.mesas.map(() => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: VX.cian, toneMapped: false })); s.visible = false; M.add(s); return s; });
    const c = this.c = { camina: cue('camina'), ir: cue('ir'), apuntar: cue('apuntar', 2), volver: cue('volver'), en: cue('en', 2), quince: cue('quince'), sesenta: cue('sesenta'), dos: cue('dos'), horas: cue('horas'), al: cue('al', 2), mes: cue('mes'), y: cue('y'),
      setecientos: cue('setecientos'), ahora: cue('ahora'), pegatina: cue('pegatina'), pedido: cue('pedido'), camarero2: cue('camarero', 2), mismas: cue('mismas'), si: cue('si'), comenta: cue('comenta') };
    if (c.apuntar > 9000) c.apuntar = cue('apuntar');
    this.musica = 'beat'; this.volMusica = 0.35;
    efectos = [['whoosh', 0.02], ['whoosh', c.ir - 0.1], ['tick', c.apuntar], ['whoosh', c.volver - 0.1], ['whoosh', c.en - 0.1], ['pop', c.sesenta], ['pop', c.horas - 0.3], ['hit', c.mes + 0.3], ['riser', c.setecientos - 1.2], ['hit', c.setecientos + 0.4],
      ['whoosh', c.ahora], ...this.mesas.map((m, i) => ['tick', c.pegatina + i * 0.06]).filter((_, i) => i % 3 === 0), ['whoosh', c.pedido], ['ding', c.pedido + 1.1], ['pop', c.mismas], ['hit', c.comenta]];
  },
  // progreso del rastro naranja (sin NFC) y verde (con NFC)
  pA(t) { const c = this.c; return t < c.ir ? 0.22 * prog(t, 0.2, c.ir) : t < c.en ? 0.22 : 0.22 + 0.78 * ease(prog(t, c.en, c.horas + 0.6)); },
  pB(t) { const c = this.c; return ease(prog(t, c.camarero2 - 0.1, c.mismas + 0.3)); },
  actualizar(t) {
    const c = this.c;
    this.gente.forEach((g, k) => { g.reset(); g.respirar(t, k); if (Math.sin(t * 1.3 + k * 1.9) > 0.35) g.hablar(t + k); });
    // rastros
    const fadeA = t < c.ahora ? 1 : t < c.mismas - 0.1 ? 1 - prog(t, c.ahora, c.ahora + 0.8) : 0.22 * prog(t, c.mismas - 0.1, c.mismas + 0.4);
    this.trA.count = Math.floor(this.ptsA.length * this.pA(t)); this.trA.material.opacity = 0.62 * fadeA; this.trA.visible = fadeA > 0.01;
    this.trB.count = Math.floor(this.ptsB.length * this.pB(t)); this.trB.visible = t > c.camarero2 - 0.1;
    // camarero: en cámara rápida sobre el rastro, salvo el viaje "real" del principio
    const k = this.cam1; k.reset(); this.libreta.visible = t < c.ahora; this.bandeja.visible = t > c.camarero2 - 0.1;
    const enReal = entre(t, c.ir - 0.2, c.en - 0.05);
    let px, pz, dir = 0, rapido = false;
    if (enReal) { const pts = [[c.ir - 0.2, 1.3, -4.5], [c.ir + 0.85, 2.15, -2.6], [c.volver - 0.1, 2.15, -2.6], [c.en - 0.05, 1.2, -4.5]]; const r = recorrido(pts, t); px = r.x; pz = r.z; dir = r.dir;
      if (r.mueve) k.andar(t * 1.8, 1); else { dir = Math.PI; k.respirar(t, 3); if (entre(t, c.apuntar - 0.2, c.volver - 0.1)) { k.bI.hombro.rotation.x = -1.0; k.bI.codo.rotation.x = -0.9; k.bD.hombro.rotation.x = -0.9 + 0.08 * Math.sin(t * 22); k.bD.codo.rotation.x = -1.0; k.cabeza.rotation.x = 0.35; } } }
    else { const usaB = t > c.camarero2 - 0.1, pts = usaB ? this.ptsB : this.ptsA, p = usaB ? this.pB(t) : (t > c.ahora ? -1 : this.pA(t));
      if (p < 0 || (usaB && p >= 1)) { px = 2.6; pz = -4.5; dir = Math.PI; k.respirar(t, 3); }
      else { const i = Math.min(pts.length - 2, Math.floor(pts.length * p)); [px, pz] = pts[i]; const [qx, qz] = pts[i + 1]; dir = Math.atan2(qx - px, qz - pz); rapido = true; k.andar(t * 4.5, 1.2); } }
    k.g.position.set(px, 0, pz); k.g.rotation.y = dir;
    if (this.bandeja.visible) { k.bI.codo.rotation.x = -1.45; k.bI.hombro.rotation.x = -0.15; }
    // mesas: halos al contar, pegatinas al llegar el NFC
    this.mesas.forEach((m, i) => { const tq = c.quince + i * 0.05; const aQ = entre(t, tq, tq + 0.9) ? (1 - prog(t, tq, tq + 0.9)) : 0;
      const tp = c.pegatina - 0.1 + i * 0.06; m.tj.visible = t > tp; if (m.tj.visible) m.tj.scale.setScalar(0.24 * rebote(clamp((t - tp) / 0.35)));
      const aP = t > tp ? (t < c.mismas ? 0.35 + 0.25 * Math.sin(t * 5 + i) : 0.15) : 0;
      m.halo.material.color.set(aQ > 0 ? '#ffb02e' : VX.cian); m.halo.material.opacity = Math.max(aQ, aP); m.halo.scale.setScalar(1 + 0.1 * Math.sin(t * 6 + i));
      // pedido viaja de la mesa a la barra
      const s = this.chispas[i], t0 = c.pedido - 0.15 + (i % 5) * 0.08 + Math.floor(i / 5) * 0.05, kk = prog(t, t0, t0 + 0.9); s.visible = kk > 0 && kk < 1;
      if (s.visible) { const e = ease(kk); s.position.set(lerp(m.x, 1.8, e), 0.9 + Math.sin(Math.PI * e) * 1.4, lerp(m.z, -5.1, e)); } });
    const pulso = 0.5 + 0.5 * Math.sin(t * 8);
    this.pantBarra.userData.pintar('barra', t > c.pedido + 0.8 ? { nuevo: true, detalle: 'Mesa 9 · 2 × Caña', estado: 'NUEVO', pulso } : { nuevo: false });
    // monedas cayendo sobre la barra: 70 × 10 € = 700 €
    this.monedas.forEach((m, i) => { const u = m.userData, t0 = c.y + 0.4 + i * 0.03, d = t - t0; m.visible = d > 0 && t < c.ahora + 0.3; if (!m.visible) return;
      const caida = Math.max(0, 3.0 - 4.9 * 3 * d * d); m.position.set(u.x, u.y + caida, u.z); m.rotation.set(caida > 0 ? d * 9 + u.r : 0, u.r, caida > 0 ? d * 7 : 0); });
    // cámara
    let pos, mira, fov = 40;
    if (enReal) {
      if (t < c.apuntar - 0.15) { pos = new THREE.Vector3(3.4, 2.1, -0.6).lerp(new THREE.Vector3(3.2, 2.0, -0.9), prog(t, c.ir, c.apuntar)); mira = new THREE.Vector3(px, 1.0, pz); fov = 46; }
      else if (t < c.volver - 0.1) { pos = new THREE.Vector3(3.55, 2.05, -1.55).lerp(new THREE.Vector3(3.45, 2.0, -1.7), prog(t, c.apuntar, c.volver)); mira = new THREE.Vector3(2.1, 1.15, -2.95); fov = 50; }
      else { pos = new THREE.Vector3(3.0, 2.0, -0.9); mira = new THREE.Vector3(px, 1.0, pz - 0.6); fov = 46; }
    } else if (entre(t, c.y - 0.1, c.ahora)) { const kk = prog(t, c.y - 0.1, c.ahora); pos = new THREE.Vector3(2.6, 3.0, -1.4).lerp(new THREE.Vector3(2.0, 2.4, -2.4), ease(kk)); mira = new THREE.Vector3(0, 1.2, -5.3); fov = 42; }
    else {
      // cenital inclinada; sube en "al mes" y vuelve
      let alto = 14.6, atras = 5.2, giro = 0;
      if (t < c.ir) { const kk = ease(prog(t, 0, c.ir)); alto = lerp(17, 14.6, kk); atras = lerp(6, 5.2, kk); }
      if (entre(t, c.al - 0.1, c.y - 0.1)) { const kk = ease(prog(t, c.al - 0.1, c.al + 0.8)); alto = lerp(14.6, 17.2, kk); giro = 0.1 * kk; }
      if (t > c.si - 0.1) { alto = 14.6 + 1.5 * prog(t, c.si, c.si + 2); }
      pos = new THREE.Vector3(Math.sin(giro) * atras, alto, Math.cos(giro) * atras + 0.2); mira = new THREE.Vector3(0, 0, -0.4);
    }
    cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(mira); if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    this.desenfoque = 0; for (const t0 of [c.ir - 0.2, c.apuntar - 0.15, c.volver - 0.1, c.en - 0.05, c.y - 0.1, c.ahora]) { const d = t - t0; if (d >= 0 && d < 0.3) this.desenfoque = Math.max(this.desenfoque, 6 * Math.sin(Math.PI * d / 0.3)); }
  },
  fx(t) { return { desenfoque: this.desenfoque }; },
  capa(t) {
    const c = this.c; velos();
    const panel = (lineas, k, y = 1480) => { if (k <= 0) return; C.save(); C.translate(W / 2, y); const s = rebote(clamp(k)); C.scale(s, s);
      const alto = lineas.reduce((a, l) => a + l[1] * 1.15, 0) + 50; C.font = `900 ${lineas[0][1]}px Inter, ${FUENTE}`; const w = Math.max(...lineas.map(l => { C.font = `900 ${l[1]}px Inter, ${FUENTE}`; return C.measureText(l[0]).width; })) + 110;
      C.fillStyle = 'rgba(14,20,18,0.88)'; C.shadowColor = 'rgba(0,0,0,0.4)'; C.shadowBlur = 30; rr(C, -w / 2, -alto / 2, w, alto, 40); C.fill(); C.shadowBlur = 0;
      let yy = -alto / 2 + 25; C.textAlign = 'center'; C.textBaseline = 'top'; for (const [txt, tam, col] of lineas) { C.font = `900 ${tam}px Inter, ${FUENTE}`; C.fillStyle = col || '#fff'; C.fillText(txt, 0, yy); yy += tam * 1.15; } C.restore(); };
    // 1) cuenta de viajes, minutos y horas
    if (entre(t, c.sesenta - 0.1, c.al - 0.1)) {
      const n = Math.round(60 * ease(prog(t, c.sesenta, c.sesenta + 0.9)));
      const L = [[`${n} viajes al día`, 66, '#ffb07a']]; if (t > c.dos - 0.1) L.push(['× 2 min', 52, 'rgba(255,255,255,0.8)']); if (t > c.horas - 0.25) L.push(['= 2 h cada día', 80, '#ffffff']);
      panel(L, prog(t, c.sesenta - 0.1, c.sesenta + 0.25));
    }
    if (entre(t, c.al - 0.1, c.y - 0.1)) panel([['60 h', 150, '#ffffff'], ['al mes', 56, '#ffb07a']], prog(t, c.al - 0.1, c.al + 0.25), 1440);
    if (entre(t, c.y - 0.1, c.ahora)) { const e = Math.round(700 * prog(t, c.y + 0.4, c.y + 2.95) / 10) * 10;
      panel([[`${e} €`, 150, '#ffd25e'], ['al mes en paseos', 50, 'rgba(255,255,255,0.85)']], prog(t, c.y - 0.1, c.y + 0.25), 1440);
      C.save(); C.globalAlpha = 0.75; C.fillStyle = '#fff'; C.font = `500 30px Inter, ${FUENTE}`; C.textAlign = 'center'; C.fillText('Ejemplo: 15 mesas · 2 min por viaje · 12 €/h', W / 2, 1640); C.restore(); }
    // 2) comparación final
    if (entre(t, c.mismas - 0.1, c.si - 0.1)) { const k = prog(t, c.mismas - 0.1, c.mismas + 0.25); panel([['60  →  30 viajes', 72, '#ffffff'], ['−50 % de paseos', 60, '#3fe08a']], k, 1460); }
    cierreComenta(t, c.comenta - 0.2, 'AHORRO', 'y te hago la cuenta de tu bar');
  },
};

// ---------- POV del camarero liado: sábado, todas las mesas piden la cuenta; llega un chico y pone la carta NFC (taberna andaluza) ----------
function dibujarLibreta(x, w, h, n) {
  x.fillStyle = '#f7f2e6'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(70,110,200,0.35)'; x.lineWidth = 2; for (let y = 120; y < h; y += 62) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
  x.strokeStyle = 'rgba(220,60,60,0.5)'; x.beginPath(); x.moveTo(70, 0); x.lineTo(70, h); x.stroke();
  x.fillStyle = '#2b3550'; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(40 + i * 54, 22, 9, 0, 7); x.fill(); }
  x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  const fila = (txt, i, color = '#1c3d8f', tachar = false, tam = 40) => { const y = 106 + i * 62; x.fillStyle = color; x.font = `italic 600 ${tam}px Fraunces, Georgia, serif`; x.save(); x.translate(84, y); x.rotate(((i * 37) % 7 - 3) * 0.006); x.fillText(txt, 0, 0);
    if (tachar) { const tw = x.measureText(txt).width; x.strokeStyle = color; x.lineWidth = 4; x.beginPath(); x.moveTo(-6, -12); x.lineTo(tw + 6, -16); x.stroke(); } x.restore(); };
  fila('M2 · 2 cañas', 0, '#1c3d8f', true); fila('M4 · bravas, tinto', 1); fila('M7 · cuenta', 2, '#1c3d8f', true); fila('M6 · ¿croquetas?', 3); fila('M1 · 3 cañas + agua', 4, '#1c3d8f', true);
  if (n >= 1) fila('M3 · CUENTA', 5, '#b3122a'); if (n >= 2) fila('M5 · CUENTA', 6, '#b3122a'); if (n >= 3) fila('M8 · ', 7, '#b3122a');
  if (n >= 4) { x.fillStyle = '#b3122a'; x.font = `italic 800 92px Fraunces, Georgia, serif`; x.fillText('¿¿??', 220, 106 + 7 * 62 + 18);
    x.strokeStyle = '#b3122a'; x.lineWidth = 6; x.beginPath(); x.ellipse(310, 106 + 7 * 62 - 14, 175, 70, -0.08, 0, Math.PI * 1.95); x.stroke(); }
  for (let i = 0; i < 5; i++) { x.strokeStyle = 'rgba(28,61,143,0.55)'; x.lineWidth = 3; x.beginPath(); const y0 = 650 + i * 9; x.moveTo(380, y0); for (let k = 0; k < 8; k++) x.lineTo(380 + k * 14, y0 + (k % 2 ? -14 : 10)); x.stroke(); }
}
function gancho(lineas, k) {
  if (k <= 0) return; C.save(); C.globalAlpha = k; C.font = `900 84px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle';
  lineas.forEach((l, i) => { const y = 600 + i * 124, w = C.measureText(l).width + 56; C.fillStyle = 'rgba(11,18,32,0.82)'; C.fillRect(W / 2 - w / 2, y - 60, w, 120); C.fillStyle = '#fff'; C.fillText(l, W / 2, y + 4); });
  C.restore();
}
V['liado'] = { ...comunCapa, estilo: 'taberna',
  async montar() {
    for (const [f, peso, estilo] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-ExtraBold.ttf', '800', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: estilo }); await ff.load(); document.fonts.add(ff); }
    scene.background = new THREE.Color('#1a120c'); scene.fog = null; pared.visible = suelo.visible = bokeh.visible = false;
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0;
    hemi.color.set('#fff4e0'); hemi.groundColor.set('#8a4a2a'); hemi.intensity = 1.35;
    const sol = new THREE.DirectionalLight('#ffe2b8', 1.5); sol.position.set(3, 9, 5); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 }); sol.shadow.bias = -0.0005; scene.add(sol);
    renderer.toneMappingExposure = 1.05; scene.add(cam); cam.rotation.order = 'YXZ';
    const r = construirRestaurante(scene, { pantalla3D, tpv, movil, tarjetaMenu, placaCuadrada, tema: 'taberna' }); Object.assign(this, r);
    r.mesas[0].gente = [0, 1]; r.placa.visible = false; r.tj.visible = false;
    const p = poblar(r.mundo, r.mesas); Object.assign(this, p);
    const pers = (idx, a) => { const m = r.mesas[idx]; return this.gente.find(g => Math.abs(g.g.position.x - m.x) < 0.01 && (a ? g.g.position.z > m.z : g.g.position.z < m.z)); };
    this.gritaA = pers(3, 0); this.gritaB = pers(4, 0); this.cliente8 = pers(2, 1);
    // camarero (nosotros): libreta en la mano, sin bandeja
    const k = this.camarero; k.bandeja.visible = false; k.g.position.set(1.0, 0, 1.4); k.g.rotation.y = Math.PI;
    const libM = caja(0.15, 0.2, 0.014, '#f4efe2', 0.004); libM.position.set(0, -0.06, 0.05); libM.rotation.x = 0.5; k.bI.mano.add(libM);
    // el chico que instala la carta NFC
    const ch = this.chico = muneco({ camisa: '#3F7DFB', pantalon: '#22263a', pelo: '#1d140e', peinado: 'corto', piel: '#e3a87f', zapato: '#f2f2f2' });
    const gorra = new THREE.Mesh(new THREE.SphereGeometry(0.228, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), matJ('#1d2a55')); gorra.position.set(0, 0.1, -0.03); gorra.rotation.x = -0.3; gorra.scale.set(1, 0.8, 1); ch.cabeza.add(gorra);
    const visera = caja(0.24, 0.025, 0.17, '#1d2a55', 0.01); visera.position.set(0, 0.15, 0.2); visera.rotation.x = -0.15; ch.cabeza.add(visera);
    this.tcChico = tarjetaMenu(); this.tcChico.scale.setScalar(0.3); this.tcChico.position.set(0, -0.04, 0.03); ch.bD.mano.add(this.tcChico);
    const cajaCh = caja(0.28, 0.17, 0.22, '#2a2f44', 0.02); cajaCh.position.set(0, -0.1, 0.06); ch.bI.mano.add(cajaCh);
    ch.g.position.set(0.95, 0, -0.15); ch.g.rotation.y = 0; r.mundo.add(ch.g);
    // tarjetas MENÚ en cada mesa (aparecen al instalarlas)
    this.cartas = r.mesas.map((m, i) => { const tj = tarjetaMenu(); tj.position.set(m.x + 0.28, 0.79, m.z + 0.1); tj.rotation.y = 0.3; tj.scale.setScalar(0.3); r.mundo.add(tj); return tj; });
    r.mundo.updateMatrixWorld(true); this.cen = this.cartas.map(tj => tj.userData.centro().clone());
    // cañas y bravas servidas al final
    this.servido = [];
    [0, 1, 3, 4, 5].forEach(i => { const m = r.mesas[i]; for (let j = 0; j < 2; j++) { const c = cana(); c.position.set(m.x - 0.18 + j * 0.2, 0.79, m.z - 0.05 + j * 0.08); r.mundo.add(c); this.servido.push(c); } });
    this.bravas8 = bravas(); this.bravas8.position.set(r.mesas[2].x - 0.2, 0.79, r.mesas[2].z + 0.05); r.mundo.add(this.bravas8);
    // manos POV: derecha con el móvil (VISAX pedidos), izquierda con la libreta
    this.mv = movil('#20232c'); const h = manosPOV(cam, this.mv, { manga: '#ffffff', piel: '#eab48a' }); this.D = h.D; this.I = h.I; this.colocarBrazo = h.colocarBrazo; this.I.visible = false;
    this.lib = lienzo(512, 700);
    const L = this.L = new THREE.Group(); cam.add(L);
    const papel = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.205), new THREE.MeshBasicMaterial({ map: this.lib.tex, color: '#efe7d6', toneMapped: false })); L.add(papel);
    const tapa = caja(0.16, 0.215, 0.008, '#2b3550', 0.003); tapa.position.z = -0.006; L.add(tapa);
    const piel = matJ('#eab48a', 0.6);
    const palma = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.1, 0.03, 3, 0.012), piel); palma.position.set(-0.07, -0.08, -0.025); L.add(palma);
    const pulgar = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.04, 6, 10), piel); pulgar.position.set(-0.062, -0.05, 0.01); pulgar.rotation.z = -0.5; L.add(pulgar);
    const manga = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.32, 6, 12), matJ('#ffffff', 0.8)); manga.position.set(-0.15, -0.26, -0.06); manga.rotation.z = 0.55; L.add(manga);
    L.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });
    // móvil del cliente de la mesa 8 y ondas NFC
    this.mv2 = movil(); this.mv2.scale.setScalar(0.38); this.mv2.visible = false; r.mundo.add(this.mv2); this.on = ondas();
    const c = this.c = { oye: cue('oye'), sabado: cue('sabado'), ocho: cue('ocho'), yo: cue('yo'), jefe: cue('jefe'), ronda: cue('ronda'), m3: cue('mesa', 1), m5: cue('mesa', 2), m8: cue('mesa', 3), ocho3: cue('ocho', 3),
      tu: cue('tu'), once: cue('once'), cada2: cue('cada', 2), era2: cue('era', 2), encargado: cue('encargado'), pongo: cue('pongo'), tocan: cue('tocan'), movil: cue('movil'), carta: cue('carta'), piden: cue('piden'), llega: cue('llega'), canas: cue('canas'), bravas: cue('bravas'), pensar: cue('pensar'), asi: cue('asi') };
    duracion = palabras[palabras.length - 1].fin + 0.12; c.fin = duracion;
    // segmentos (corte de plano cada 1–3 s)
    c.B = c.sabado - 0.05; c.C = c.ocho - 0.05; c.D = c.jefe - 0.12; c.E = c.m3 - 0.1; c.F = c.ocho3 - 0.3; c.G = c.tu - 0.1; c.H = c.pongo - 0.06; c.I = c.tocan - 0.1; c.I2 = c.carta - 0.12; c.J = c.llega - 0.18; c.K = c.pensar - 0.12;
    c.B2 = c.once - 0.05; c.J2 = c.canas - 0.12; c.J3 = c.bravas - 0.1; c.K2 = c.cada2 - 0.05; c.K3 = c.era2 - 0.12;
    c.H2 = c.H + (c.I - c.H) / 3; c.H3 = c.H + 2 * (c.I - c.H) / 3;
    this.ojo = new THREE.Vector3(1.0, 1.62, 1.4);
    const ph = this.cen[2].clone().add(new THREE.Vector3(0.03, 0.03, 0.06));
    const tomaCarta = (v, a, barrido = 0, lado = 1) => ({ a, barrido, de: [v.x + 1.1 * lado, v.y + 0.6, v.z + 1.3], a2: [v.x + 0.85 * lado, v.y + 0.45, v.z + 1.0], mira: [v.x - 0.15 * lado, v.y - 0.05, v.z], mira2: [v.x - 0.15 * lado, v.y - 0.05, v.z], fov: 40 });
    this.tomas = {
      B: [{ a: c.B, barrido: 0, de: [3.5, 2.95, 3.4], a2: [3.0, 2.75, 2.8], mira: [-0.6, 0.7, -1.7], mira2: [-0.4, 0.8, -1.5], fov: 54 }],
      B2: [{ a: c.B2, barrido: 0, de: [2.45, 2.45, 3.4], a2: [2.3, 2.4, 3.15], mira: [-0.6, 1.05, -1.6], mira2: [-0.8, 1.05, -1.6], fov: 50 }],
      K2: [{ a: c.K2, barrido: 0, de: [-2.2, 2.6, 2.6], a2: [-1.85, 2.5, 2.25], mira: [1.4, 0.9, -1.3], mira2: [1.3, 0.9, -1.3], fov: 52 }],
      J2: [{ a: c.J2, barrido: 0, de: [-3.75, 2.1, -3.2], a2: [-3.95, 2.0, -3.5], mira: [-4.7, 1.62, -5.25], mira2: [-4.7, 1.62, -5.25], fov: 38 }],
      J3: [{ a: c.J3, barrido: 0, de: [2.0, 2.15, -4.2], a2: [2.2, 2.2, -4.5], mira: [2.8, 2.5, -6.45], mira2: [2.8, 2.5, -6.45], fov: 40 }],
      C: [{ a: c.C, barrido: 0, de: [2.3, 1.4, -0.1], a2: [2.0, 1.45, 0.15], mira: [1.0, 1.45, 1.4], mira2: [1.0, 1.5, 1.4], fov: 46 }],
      H: [tomaCarta(this.cen[3], c.H, 0, 1), (v => ({ a: c.H2, barrido: 0.14, de: [v.x + 1.25, v.y + 0.55, v.z + 0.55], a2: [v.x + 1.0, v.y + 0.42, v.z + 0.45], mira: [v.x - 0.1, v.y - 0.05, v.z], mira2: [v.x - 0.1, v.y - 0.05, v.z], fov: 40 }))(this.cen[4]), tomaCarta(this.cen[2], c.H3, 0.14, 0.4)],
      I: [{ a: c.I, barrido: 0, de: [3.15, 1.85, -1.75], a2: [3.0, 1.7, -2.05], mira: this.cen[2].toArray(), mira2: this.cen[2].toArray(), fov: 40 },
        { a: c.I2, barrido: 0.12, de: [ph.x + 0.2, ph.y + 0.14, ph.z + 0.74], a2: [ph.x + 0.14, ph.y + 0.1, ph.z + 0.6], mira: ph.toArray(), mira2: ph.toArray(), fov: 36 }],
    };
    const mesaY = i => new THREE.Vector3(r.mesas[i].x, 1.15, r.mesas[i].z);
    this.obj = { m3: new THREE.Vector3(-3.6, 1.15, -0.4), m5: new THREE.Vector3(3.4, 1.15, -0.7), m8: mesaY(2), sala: new THREE.Vector3(-0.6, 0.95, -2.6), chico: new THREE.Vector3(0.95, 1.38, -0.15) };
    this.etq = { m3: new THREE.Vector3(-3.6, 1.95, -0.4), m5: new THREE.Vector3(3.4, 1.95, -0.6), m8: new THREE.Vector3(2.4, 1.9, -2.9) };
    efectos = [['whoosh', c.B - 0.12], ['whoosh', c.C - 0.12], ['hit', c.yo], ['whoosh', c.D - 0.1], ['tick', c.jefe], ['whoosh', c.E - 0.08], ['tick', c.m3], ['whoosh', c.m5 - 0.12], ['tick', c.m5], ['whoosh', c.m8 - 0.12], ['tick', c.m8],
      ['whoosh', c.F - 0.08], ['whoosh', c.G - 0.1], ['pop', c.H + 0.05], ['pop', c.H2 + 0.05], ['pop', c.H3 + 0.05], ['whoosh', c.I - 0.1], ['tap', c.movil + 0.05], ['ding', c.carta - 0.05], ['tick', c.carta + 0.25], ['tick', c.carta + 0.5], ['pop', c.piden + 0.25],
      ['whoosh', c.B2 - 0.1], ['whoosh', c.J2 - 0.1], ['ding', c.J2 + 0.05], ['whoosh', c.J3 - 0.1], ['ding', c.J3 + 0.05], ['whoosh', c.K2 - 0.1], ['whoosh', c.K3 - 0.1], ['whoosh', c.J - 0.1], ['buzz', c.llega], ['ding', c.llega + 0.05], ['pop', c.llega + 0.35], ['whoosh', c.K - 0.05], ['whoosh', c.fin - 0.35]];
    this.musica = 'guitarra_bar'; this.volMusica = 0.42;
  },
  seg(t) { const c = this.c; return t < c.B ? 'A' : t < c.B2 ? 'B' : t < c.C ? 'B2' : t < c.D ? 'C' : t < c.E ? 'D' : t < c.F ? 'E' : t < c.G ? 'F' : t < c.H ? 'G' : t < c.I ? 'H' : t < c.J ? 'I' : t < c.J2 ? 'J' : t < c.J3 ? 'J2' : t < c.K ? 'J3' : t < c.K2 ? 'K' : t < c.K3 ? 'K2' : 'K3'; },
  mirar(v) { const E = this.ojo, dx = v.x - E.x, dy = v.y - E.y, dz = v.z - E.z; return [Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))]; },
  esperando(t) { const c = this.c; return t >= c.llega ? 0 : 4 + (t >= c.jefe) + (t >= c.m3) + (t >= c.m5) + (t >= c.m8); },
  actualizar(t) {
    const c = this.c, s = this.seg(t), caos = t < c.H;
    // ---- clientes ----
    this.gente.forEach((p, i) => {
      p.reset(); p.respirar(t, p.g.position.x); p.g.rotation.y = p.g.position.z > (this.mesas.find(m => Math.abs(m.x - p.g.position.x) < 0.01)?.z ?? 0) ? Math.PI : 0;
      const grita = (p === this.gritaA && t < c.B + 0.4) || (p === this.gritaB && entre(t, c.jefe - 0.3, c.m3 + 0.3));
      const arriba = caos && (grita || Math.sin(t * 1.6 + i * 1.9) > -0.35);
      if (arriba) { p.bD.hombro.rotation.x = -2.75; p.bD.hombro.rotation.z = -0.15 + Math.sin(t * (grita ? 11 : 7) + i) * (grita ? 0.35 : 0.2); p.bD.codo.rotation.x = -0.15; p.hablar(t + i, grita ? 1 : 0.5); }
      else if (Math.sin(t * 0.9 + i * 2.1) > 0.5) p.hablar(t + i, 0.5);
      if (grita) { p.g.rotation.y = Math.atan2(this.ojo.x - p.g.position.x, this.ojo.z - p.g.position.z); p.hablar(t * 1.3, 1); }
    });
    if (s === 'I') { const q = this.cliente8; q.cabeza.rotation.set(0.35, 0.15, 0); q.bD.hombro.rotation.set(-1.35, 0, -0.1); q.bD.codo.rotation.x = -0.3; }
    this.cocinero.reset(); this.cocinero.andar(t * 0.4, 0.3); this.cocinero.g.position.x = 2.6 + Math.sin(t * 0.6) * 0.9;
    this.servido.forEach(x => (x.visible = t > c.llega)); this.bravas8.visible = t > c.bravas;
    // ---- tarjetas ----
    const pops = [c.pongo, c.pongo, c.H3 + 0.05, c.H + 0.05, c.H2 + 0.05, c.pongo];
    this.cartas.forEach((tj, i) => { const k = t < pops[i] ? 0 : rebote(clamp((t - pops[i]) / 0.35)); tj.visible = k > 0.001; tj.scale.setScalar(0.3 * Math.max(0.001, k)); });
    // ---- camarero (3.ª persona) ----
    const k = this.camarero; k.g.visible = ['B', 'B2', 'C', 'H', 'I', 'K2'].includes(s); k.reset(); k.respirar(t, 3);
    if (caos) { k.cabeza.rotation.y = Math.sin(t * 4.2) * 0.65; k.bI.hombro.rotation.x = -1.0; k.bI.codo.rotation.x = -0.9; k.bD.hombro.rotation.x = -0.85; k.bD.hombro.rotation.z = 0.3; k.bD.codo.rotation.x = -1.0 + Math.sin(t * 16) * 0.12; }
    else { k.bD.hombro.rotation.x = -0.9; k.bD.codo.rotation.x = -0.8; k.cabeza.rotation.x = 0.25; }
    if (entre(t, c.sabado, c.yo + 0.4)) k.hablar(t);
    // ---- chico ----
    const ch = this.chico; ch.g.visible = s === 'G'; ch.reset(); ch.respirar(t, 5); ch.cabeza.rotation.y = 0;
    const kb = prog(t, c.encargado - 0.25, c.encargado + 0.15); ch.bD.hombro.rotation.x = -1.25 * kb; ch.bD.codo.rotation.x = -0.15 - 0.3 * kb; this.tcChico.rotation.x = -(ch.bD.hombro.rotation.x + ch.bD.codo.rotation.x);
    ch.bI.hombro.rotation.x = -0.45; ch.bI.codo.rotation.x = -0.9; if (entre(t, c.tu - 0.05, c.pongo + 1.3)) ch.hablar(t);
    // ---- pantallas ----
    const pulso = Math.round((0.5 + 0.5 * Math.sin(t * 8)) * 4) / 4;
    this.pantBarra.userData.pintar('barra', t > c.canas - 0.15 ? { nuevo: true, mesa: 8, detalle: '2 × Caña', estado: 'A SERVIR', pulso } : { nuevo: false });
    this.pantCoc.userData.pintar('cocina', t > c.bravas - 0.1 ? { nuevo: true, mesa: 8, detalle: '1 × Patatas bravas', estado: 'EN MARCHA', pulso } : { nuevo: false });
    const V0 = new THREE.Vector3();
    // ---- planos en 3.ª persona ----
    if (['B', 'B2', 'C', 'H', 'I', 'J2', 'J3', 'K2'].includes(s)) {
      this.D.visible = this.L.visible = false; this.colocarBrazo();
      this.desenfoque = camara2(t, this.tomas[s]); const a0 = this.tomas[s][0].a; if (t - a0 < 0.2) this.desenfoque = Math.max(this.desenfoque, 12 * (1 - (t - a0) / 0.2));
      if (s === 'I') movilEnTarjeta({ mv: this.mv2, on: this.on }, t, this.cartas[2], c.movil, c.I, c.J, 'bloqueo', 'cartaV', { hora: '23:04', mesa: 8, sel: t > c.carta + 0.5 ? 2 : t > c.carta + 0.25 ? 1 : 0, enviado: t > c.piden + 0.25 });
      else { this.mv2.visible = false; this.on.userData.actualizar(t, 0, V0, V0); }
      return;
    }
    this.mv2.visible = false; this.on.userData.actualizar(t, 0, V0, V0);
    // ---- primera persona ----
    const O = this.obj; let [yaw, pitch] = this.mirar(O.m3), desen = 0, s0 = 0;
    const de = (a, b, kk) => { const A = this.mirar(a), B = this.mirar(b); return [lerp(A[0], B[0], kk), lerp(A[1], B[1], kk)]; };
    if (s === 'A') { [yaw, pitch] = this.mirar(O.m3); yaw += 0.1 * (1 - prog(t, 0, 1.4)); }
    else if (s === 'D') { s0 = c.D; [yaw, pitch] = this.mirar(O.m5); yaw += 0.06 * (1 - prog(t, c.D, c.E)); }
    else if (s === 'E') { const L = [[c.E, O.m5, O.m3], [c.m5 - 0.12, O.m3, O.m5], [c.m8 - 0.12, O.m5, O.m8]]; let j = 0; L.forEach((x, n) => { if (t >= x[0]) j = n; });
      const kk = prog(t, L[j][0], L[j][0] + 0.2); [yaw, pitch] = de(L[j][1], L[j][2], kk); desen = Math.sin(Math.PI * clamp((t - L[j][0]) / 0.2)) * 14; }
    else if (s === 'F') { s0 = c.F; [yaw, pitch] = this.mirar(O.m8); pitch = lerp(pitch, -0.75, prog(t, c.F, c.F + 0.25)); }
    else if (s === 'G') { s0 = c.G; [yaw, pitch] = this.mirar(O.chico); pitch += 0.05 * Math.sin(t * 2); }
    else if (s === 'J') { s0 = c.J; [yaw, pitch] = this.mirar(O.sala); pitch -= 0.12; }
    else if (s === 'K') { s0 = c.K; [yaw, pitch] = this.mirar(O.sala); yaw += 0.12 * prog(t, c.K, c.K2); }
    else if (s === 'K3') { s0 = c.K3; const kk = prog(t, c.K3, c.fin - 0.15); [yaw, pitch] = de(O.sala, O.m3, kk); yaw = lerp(yaw, this.mirar(O.m3)[0] + 0.1, prog(t, c.fin - 0.35, c.fin)); desen = 14 * prog(t, c.fin - 0.3, c.fin); }
    if (s0 && t - s0 < 0.2) desen = Math.max(desen, 14 * (1 - (t - s0) / 0.2));
    const amp = caos ? 2.2 : 1;
    const temb = (a, b, c2) => (Math.sin(t * a) * 0.006 + Math.sin(t * b + 1) * 0.004 + Math.sin(t * c2 + 2) * 0.003) * amp;
    cam.position.copy(this.ojo).add(new THREE.Vector3(temb(1.3, 2.1, 3.7), temb(1.7, 2.9, 4.1) + Math.sin(t * 1.9) * 0.008, 0));
    cam.rotation.set(pitch + temb(0.9, 1.6, 2.3), yaw + temb(0.7, 1.3, 2.9), 0); cam.up.set(0, 1, 0);
    if (cam.fov !== 64) { cam.fov = 64; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld(true); this.desenfoque = desen;
    // libreta (mano izquierda)
    const n = t >= c.ocho3 - 0.05 ? 4 : t >= c.m8 ? 3 : t >= c.m5 ? 2 : t >= c.m3 ? 1 : 0; this.lib.pintar('l' + n, (x, w, h) => dibujarLibreta(x, w, h, n));
    this.L.visible = ['A', 'D', 'E', 'F'].includes(s);
    const bajo = [new THREE.Vector3(-0.15, -0.2, -0.42), new THREE.Euler(-0.6, 0.35, 0.2)], alto = [new THREE.Vector3(-0.004, -0.04, -0.3), new THREE.Euler(-0.08, 0.02, 0.03)];
    const kl = s === 'F' ? prog(t, c.F, c.F + 0.3) : 0;
    this.L.position.copy(bajo[0]).lerp(alto[0], kl); this.L.position.y += Math.sin(t * 2.6) * 0.004 * amp;
    this.L.rotation.set(lerp(bajo[1].x, alto[1].x, kl), lerp(bajo[1].y, alto[1].y, kl), lerp(bajo[1].z, alto[1].z, kl));
    // móvil (mano derecha)
    const oculto = new THREE.Vector3(0.24, -0.62, -0.42), vista = new THREE.Vector3(0.02, -0.055, -0.36);
    let pos = oculto.clone(), pantalla = 'bloqueo', est = { hora: '23:04' };
    if (s === 'J') { pos = oculto.clone().lerp(vista, prog(t, c.J, c.J + 0.3)); if (entre(t, c.llega, c.llega + 0.5)) pos.x += Math.sin(t * 90) * 0.003; }
    else if (s === 'K') pos = vista.clone().lerp(oculto, prog(t, c.K, c.K + 0.45));
    if (t > c.llega - 0.02) { pantalla = 'pedidoCamarero'; est = { mesa: 8, lineas: [['2 × Caña', 'bebida'], ['1 × Patatas bravas', 'comida']], resumen: 'ahora · 3 productos · 11,50 €', confirmado: t > c.bravas + 0.4, onda: entre(t, c.bravas + 0.3, c.bravas + 0.8) ? (t - c.bravas - 0.3) / 0.5 : 0 }; }
    pos.y += Math.sin(t * 2.3) * 0.004;
    this.D.visible = s === 'J' || s === 'K'; this.D.position.copy(pos); this.D.rotation.set(0, 0, 0); this.D.updateMatrixWorld(true); this.colocarBrazo(); this.mv.userData.pantalla(pantalla, est);
  },
  fx(t) { const c = this.c; let temblor = 0; for (const g of [c.oye, c.jefe, c.llega]) { const d = t - g; if (d >= 0 && d < 0.35) temblor = Math.max(temblor, (1 - d / 0.35) * 12); }
    const zoom = entre(t, c.yo, c.D) ? 1 + 0.1 * (1 - prog(t, c.yo, c.yo + 0.5)) + 0.04 : 1; return { desenfoque: this.desenfoque, temblor, zoom }; },
  capa(t) {
    const c = this.c; velos(); const s = this.seg(t);
    // marcador: mesas esperando
    const n = this.esperando(t), cambios = [0, c.jefe, c.m3, c.m5, c.m8]; const ult = cambios.filter(x => t >= x).pop() || 0;
    if (n > 0) marcador('MESAS ESPERANDO', String(n), '#ff4d5e', t - ult < 0.35 && ult > 0 ? rebote(clamp((t - ult) / 0.35)) : 1);
    else marcador('MESAS ESPERANDO', '0', '#3ddc84', rebote(clamp((t - c.llega) / 0.35)));
    gancho(['POV: ERES EL ÚNICO', 'CAMARERO UN SÁBADO'], 1 - prog(t, 2.35, 2.6));
    // etiquetas sobre las mesas al girar la cabeza
    if (s === 'E') { const L = [['Mesa 3 · cuenta', c.E, 'm3'], ['Mesa 5 · cuenta', c.m5 - 0.12, 'm5'], ['Mesa 8 · ¿?', c.m8 - 0.12, 'm8']]; let j = 0; L.forEach((x, k) => { if (t >= x[1]) j = k; });
      etiquetaPlano(L[j][0], this.etq[L[j][2]], entra(t, L[j][1] + 0.15), 'rojo', 'recibo'); }
    if (s === 'D') etiquetaPlano('Mesa 5 · otra ronda', this.etq.m5, entra(t, c.D + 0.15), 'rojo', 'mano');
    if (entre(t, c.tocan + 0.2, c.bravas + 0.6)) pildora('Comenta CARTA', W / 2, 1660, entra(t, c.tocan + 0.2), { icono: 'check', tono: 'marca', tam: 54 });
  },
};

// ---------- Cronómetro: cuánto tarda un bar en ponerte un café (cafetería de mañana, cámara rápida sin parar) ----------
PANT.cartaDesayuno = (x, w, h, s) => {
  x.fillStyle = '#0a0c16'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.font = `600 46px ${SERIF}`; x.fillText(s.titulo || 'Café La Plaza', 34, 120); x.font = `italic 600 30px ${SERIF}`; x.fillStyle = '#ffc98a'; x.fillText(s.sub || 'desayunos', 34, 162);
  x.fillStyle = grad(x, w - 190, 0, w - 34, 0, [VX.cian, VX.violeta]); rr(x, w - 190, 86, 156, 58, 29); x.fill(); x.fillStyle = '#fff'; x.font = `800 28px ${SANS}`; x.textAlign = 'center'; x.fillText(`Mesa ${s.mesa || 2}`, w - 112, 125);
  const sel = s.sel || 0;
  (s.items || [['Café con leche', '1,30 €', ['#c89b6d', '#7a4b2a']], ['Tostada con tomate', '2,50 €', ['#e0a24a', '#b9481f']], ['Zumo de naranja', '3,00 €', ['#ffb347', '#f57b2c']], ['Croissant', '1,80 €', ['#e8c27a', '#b9822e']]]).forEach(([n, p, cols], i) => {
    const y = 210 + i * 160; x.fillStyle = 'rgba(255,255,255,0.05)'; rr(x, 24, y, w - 48, 140, 26); x.fill(); x.fillStyle = grad(x, 40, y + 18, 140, y + 118, cols); rr(x, 40, y + 18, 104, 104, 20); x.fill();
    x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = `700 30px ${SANS}`; x.fillText(n, 166, y + 62); x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = `500 26px ${SANS}`; x.fillText(p, 166, y + 102);
    const on = sel > i && i < 2; x.fillStyle = on ? grad(x, w - 110, 0, w - 46, 0, [VX.cian, VX.violeta]) : 'rgba(255,255,255,0.12)'; x.beginPath(); x.arc(w - 78, y + 70, 32, 0, 7); x.fill();
    if (on) check(x, w - 78, y + 70, 1.3); else { x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.moveTo(w - 92, y + 70); x.lineTo(w - 64, y + 70); x.moveTo(w - 78, y + 56); x.lineTo(w - 78, y + 84); x.stroke(); }
  });
  if (sel) { const env = s.enviado; x.fillStyle = env ? '#16a34a' : grad(x, 30, 0, w - 30, 0, [VX.cian, VX.azul, VX.violeta]); rr(x, 30, h - 150, w - 60, 104, 52); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `800 32px ${SANS}`;
    if (env) { check(x, w / 2 - 150, h - 98, 1.4); x.fillText('Pedido enviado', w / 2 + 20, h - 87); } else x.fillText(`Pedir · ${Math.min(sel, 2)} · ${(s.totales || ['', '1,30', '3,80'])[Math.min(sel, 2)]} €`, w / 2, h - 87); }
};
function tazaCafe() {
  const g = new THREE.Group(); const blanco = matJ('#ffffff', 0.3);
  const plato = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.012, 28), blanco); plato.position.y = 0.006; g.add(plato);
  const taza = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.038, 0.08, 24, 1, true), matJ('#ffffff', 0.3, { side: THREE.DoubleSide })); taza.position.y = 0.052; g.add(taza);
  const asa = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 8, 16), blanco); asa.position.set(0.055, 0.055, 0); g.add(asa);
  const cafe = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.004, 24), matJ('#c08a5a', 0.4)); cafe.position.y = 0.09; g.add(cafe);
  const vapor = [0, 1, 2].map(i => { const v = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false })); g.add(v); return v; });
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  g.userData = { cafe, vapor, actualizar(t, nivel = 1) { cafe.position.y = 0.02 + 0.064 * nivel; cafe.visible = nivel > 0.02; vapor.forEach((v, i) => { const f = (t * 0.8 + i / 3) % 1; v.position.set(Math.sin(t * 3 + i) * 0.012, 0.1 + f * 0.14, 0); v.scale.setScalar(0.6 + f * 1.4); v.material.opacity = 0.35 * Math.sin(Math.PI * f) * (nivel > 0.6 ? 1 : 0); }); } };
  return g;
}
function tostadaTomate() {
  const g = new THREE.Group(); const plato = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.014, 28), matJ('#ffffff', 0.3)); plato.position.y = 0.007; g.add(plato);
  const pan = caja(0.17, 0.026, 0.1, '#e0b070', 0.01); pan.position.y = 0.028; g.add(pan); const tom = caja(0.155, 0.008, 0.088, '#d0452a', 0.004); tom.position.y = 0.044; g.add(tom);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g;
}
function cronoPanel(X, etiqueta, valor, color, k = 1, parado = false) {
  if (k <= 0) return; C.save(); C.translate(X, 170); C.scale(k, k);
  C.fillStyle = 'rgba(12,10,8,0.84)'; rr(C, -235, -70, 470, 140, 28); C.fill(); C.lineWidth = 6; C.strokeStyle = color; rr(C, -235, -70, 470, 140, 28); C.stroke();
  C.fillStyle = color; C.font = `800 26px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillText(etiqueta, 0, -40);
  C.fillStyle = '#fff'; C.font = `800 76px "DejaVu Sans Mono", monospace`; C.fillText(valor, parado ? -22 : 0, 18);
  if (parado) { C.fillStyle = color; C.beginPath(); C.arc(172, 18, 28, 0, 7); C.fill(); C.strokeStyle = '#fff'; C.lineWidth = 7; C.lineCap = 'round'; C.beginPath(); C.moveTo(158, 18); C.lineTo(168, 29); C.lineTo(186, 8); C.stroke(); }
  C.restore();
}
V['crono'] = { ...comunCapa, estilo: 'cafeteria',
  async montar() {
    for (const [f, peso, estilo] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: estilo }); await ff.load(); document.fonts.add(ff); }
    ['cafe', 'mano', 'camarero', 'tarjeta', 'movil', 'pedido', 'mesa', 'cuarenta', 'segundos', 'minutos', 'diez', 'cinco', 'momento'].forEach(w => CLAVES.add(w));
    scene.background = new THREE.Color('#dfe9f0'); scene.fog = null; pared.visible = suelo.visible = bokeh.visible = false;
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0;
    hemi.color.set('#ffffff'); hemi.groundColor.set('#b9a58a'); hemi.intensity = 1.75;
    const sol = this.sol = new THREE.DirectionalLight('#fff4e2', 2.3); sol.position.set(-6, 9, 4); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 34 }); sol.shadow.bias = -0.0005; scene.add(sol); scene.add(sol.target);
    renderer.toneMappingExposure = 1.12;
    const r = construirRestaurante(scene, { pantalla3D, tpv, movil, tarjetaMenu, placaCuadrada, tema: 'cafeteria' }); Object.assign(this, r);
    r.placa.visible = false; r.tj.visible = false;
    const p = poblar(r.mundo, r.mesas); Object.assign(this, p);
    const M1 = r.mesas[3], M2 = r.mesas[4];
    this.gente.filter(g => [M1, M2].some(m => Math.abs(g.g.position.x - m.x) < 0.01)).forEach(g => (g.g.visible = false));
    this.gente = this.gente.filter(g => g.g.visible);
    // mesa 1: el oficinista con la mano levantada
    const yo = this.yo = muneco({ camisa: '#ffffff', chaleco: '#34405e', pantalon: '#34405e', pelo: '#5a4a3a', peinado: 'corto', piel: '#f0c29a' }); yo.sentar(); yo.g.position.set(M1.x, 0, M1.z - 0.72); r.mundo.add(yo.g);
    const corbata = caja(0.06, 0.24, 0.02, '#c0263a', 0.01); corbata.position.set(0, 1.2, 0.19); yo.raiz.add(corbata);
    // mesa 2: la chica que pide con la tarjeta
    const ella = this.ella = muneco({ camisa: '#ff7aa8', pantalon: '#2b2f3a', pelo: '#7a3d1d', peinado: 'mono', piel: '#e9b48c' }); ella.sentar(); ella.g.position.set(M2.x, 0, M2.z - 0.72); r.mundo.add(ella.g);
    // tarjeta MENÚ en la mesa 2, mirando a la chica
    const tj = this.tj2 = tarjetaMenu(); tj.scale.setScalar(0.3); tj.position.set(M2.x + 0.24, 0.79, M2.z - 0.3); tj.rotation.y = Math.PI - 0.3; r.mundo.add(tj);
    r.mundo.updateMatrixWorld(true); this.cen = tj.userData.centro().clone(); this.nrm = new THREE.Vector3(Math.sin(Math.PI - 0.3), 0, Math.cos(Math.PI - 0.3));
    this.mv2 = movil(); this.mv2.scale.setScalar(0.38); r.mundo.add(this.mv2); this.on = ondas();
    this.ph = this.cen.clone().addScaledVector(this.nrm, 0.07).add(new THREE.Vector3(0, 0.02, 0));
    // café y tostada (barra → bandeja → mesa 2)
    this.tazaBarra = tazaCafe(); this.tazaBarra.position.set(-2.05, 1.13, -5.2); r.mundo.add(this.tazaBarra);
    this.tazaMesa = tazaCafe(); this.tazaMesa.position.set(M2.x - 0.05, 0.79, M2.z - 0.38); r.mundo.add(this.tazaMesa);
    this.tostMesa = tostadaTomate(); this.tostMesa.position.set(M2.x - 0.28, 0.79, M2.z - 0.2); r.mundo.add(this.tostMesa);
    const k = this.camarero; k.bandeja.children.slice(1).forEach(o => (o.visible = false));
    this.tazaBand = tazaCafe(); this.tazaBand.position.set(-0.07, 0.012, 0); k.bandeja.add(this.tazaBand); const tb = tostadaTomate(); tb.position.set(0.09, 0.012, 0.02); tb.scale.setScalar(0.8); k.bandeja.add(tb);
    this.mvK = movil('#20232c'); this.mvK.scale.setScalar(0.25); this.mvK.position.set(0, -0.06, 0.05); k.bD.mano.add(this.mvK);
    // chorro de la cafetera
    this.chorro = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), matJ('#6b3f22', 0.3)); this.chorro.position.set(-2.05, 1.27, -5.2); r.mundo.add(this.chorro);
    // reloj de pared (mesa 1, pared izquierda)
    this.reloj = new THREE.Group(); this.reloj.position.set(-5.93, 2.45, 0.2); this.reloj.rotation.y = Math.PI / 2; r.mundo.add(this.reloj);
    this.reloj.add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 32).rotateX(Math.PI / 2), matJ('#1f6b54', 0.5)));
    const esfera = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), matJ('#fbf6ea', 0.8)); esfera.position.z = 0.032; this.reloj.add(esfera);
    for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.01), matJ('#2a2420')); const a = i / 12 * Math.PI * 2; m.position.set(Math.sin(a) * 0.25, Math.cos(a) * 0.25, 0.04); m.rotation.z = -a; this.reloj.add(m); }
    const aguja = (l, w) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(w, l, 0.012), matJ('#141018')); m.position.y = l / 2; g.add(m); g.position.z = 0.045; this.reloj.add(g); return g; };
    this.horas = aguja(0.15, 0.03); this.minutos = aguja(0.24, 0.02);
    // araña colgando de la mano al final
    this.arana = new THREE.Group(); const hilo = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.4, 4), new THREE.MeshBasicMaterial({ color: '#d8d8d8' })); hilo.position.y = -0.2; this.arana.add(hilo);
    const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), matJ('#141018', 0.5)); cuerpo.position.y = -0.42; this.arana.add(cuerpo);
    for (let i = 0; i < 8; i++) { const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.09, 4), matJ('#141018', 0.5)); const s = i < 4 ? 1 : -1, kk = i % 4; pata.position.set(0.05 * s, -0.42, (kk - 1.5) * 0.02); pata.rotation.z = s * 1.0; pata.rotation.x = (kk - 1.5) * 0.3; this.arana.add(pata); }
    r.mundo.add(this.arana);
    // gente entrando y saliendo a cámara rápida
    this.paseantes = [{ camisa: '#3d7fd6', pelo: '#2a1a12' }, { camisa: '#e0a826', pelo: '#7a3d1d', peinado: 'largo' }, { camisa: '#7a5ad6', pelo: '#111111' }].map((o, i) => { const m = muneco({ pantalon: '#2b2f3a', piel: ['#f0c29a', '#e9b48c', '#c98d63'][i], ...o }); r.mundo.add(m.g); return m; });
    const c = this.c = { cafe: cue('cafe'), mesa1: cue('mesa'), levanta: cue('levanta'), pasa: cue('pasa'), pasa2: cue('pasa', 2), cinco: cue('cinco'), diez: cue('diez'), mesa2: cue('mesa', 2), toca: cue('toca'), movil: cue('movil'),
      cafe2: cue('cafe', 2), tostada: cue('tostada'), pedido: cue('pedido'), llega: cue('llega'), momento: cue('momento'), cuarenta: cue('cuarenta'), mesa3: cue('mesa', 3), cta: cue('comenta'), y: cue('y', 2), sigue: cue('sigue'), levantada: cue('levantada') };
    duracion = palabras[palabras.length - 1].fin + 0.12; c.fin = duracion;
    const P = this.ph, n = this.nrm, cen = this.cen;
    const fr = (v, d) => [v.x + d[0], v.y + d[1], v.z + d[2]];
    const yoP = [M1.x, 1.35, M1.z - 0.72], mano = [M1.x + 0.25, 1.75, M1.z - 0.62];
    // planos: todos con movimiento grande y barrido rápido entre ellos (la cámara no para)
    const T = (a, de, a2, mira, mira2, fov = 44, barrido = 0.18) => ({ a, de, a2, mira, mira2: mira2 || mira, fov, barrido });
    this.tomas = [
      T(0, [-1.0, 1.55, 2.6], [-2.6, 1.45, 1.3], [-3.6, 1.2, -0.6], [-3.6, 1.35, -0.6], 46, 0),
      T(c.cafe - 0.55, [2.6, 2.9, 3.2], [-0.6, 2.7, 3.4], [-0.5, 0.8, -2.0], [-2.2, 0.8, -1.5], 54),
      T(c.mesa1 - 0.1, [-2.7, 1.55, 1.0], [-3.1, 1.5, 0.55], yoP, [M1.x, 1.5, M1.z - 0.72], 40),
      T(c.levanta - 0.1, [-2.5, 1.1, 0.9], [-2.85, 1.3, 0.5], [M1.x + 0.2, 1.5, M1.z - 0.6], mano, 46),
      T(c.pasa - 0.12, [-5.3, 1.35, 3.0], [-2.0, 1.35, 3.0], [-5.0, 1.1, 1.25], [-1.8, 1.1, 1.25], 46),
      T(c.pasa2 - 0.12, [-1.8, 1.4, 3.0], [-5.0, 1.4, 3.0], [-1.9, 1.1, 1.25], [-5.0, 1.1, 1.25], 46),
      T(c.cinco - 0.1, [-4.6, 2.2, 0.9], [-5.3, 2.4, 0.35], [-5.93, 2.45, 0.2], [-5.93, 2.45, 0.2], 40),
      T(c.diez - 0.08, [-2.5, 1.9, 1.2], [-2.95, 1.65, 0.75], yoP, yoP, 40),
      T(c.mesa2 - 0.1, [1.2, 1.9, 1.4], [2.7, 1.5, 0.3], [3.4, 1.2, -0.9], [3.4, 1.25, -0.9], 46, 0.22),
      T(c.toca - 0.1, fr(cen, [0.75, 0.45, -0.95]), fr(cen, [0.45, 0.3, -0.7]), cen.toArray(), cen.toArray(), 42),
      T(c.cafe2 - 0.12, fr(P, [n.x * 0.62 + 0.15, 0.16, n.z * 0.62]), fr(P, [n.x * 0.5, 0.1, n.z * 0.5 - 0.08]), P.toArray(), P.toArray(), 38),
      T(c.tostada - 0.1, fr(P, [n.x * 0.55 - 0.25, 0.2, n.z * 0.55 + 0.05]), fr(P, [n.x * 0.45 - 0.12, 0.12, n.z * 0.45]), P.toArray(), P.toArray(), 38),
      T(c.llega - 0.12, [-3.6, 2.15, -3.1], [-3.95, 2.0, -3.5], [-4.7, 1.62, -5.25], [-4.7, 1.62, -5.25], 38),
      T(c.momento - 0.15, [-1.6, 1.55, -4.4], [-1.8, 1.42, -4.65], [-2.05, 1.25, -5.2], [-2.05, 1.22, -5.2], 34),
      T(c.cuarenta - 0.12, [0.4, 1.7, 1.2], [1.7, 1.55, 0.6], [1.6, 1.0, -1.2], [3.0, 1.0, -0.6], 46),
      T(c.mesa3 - 0.1, fr(this.tazaMesa.position, [0.2, 0.65, 0.95]), fr(this.tazaMesa.position, [0.1, 0.5, 0.74]), fr(this.tazaMesa.position, [-0.16, 0.02, 0.1]), fr(this.tazaMesa.position, [-0.16, 0.02, 0.1]), 44),
      T(c.cta - 0.08, [4.15, 1.6, 0.95], [3.9, 1.52, 0.55], [3.4, 1.3, -0.92], [3.4, 1.35, -0.92], 42, 0.15),
      T(c.y - 0.1, [-1.2, 1.7, 1.6], [-2.6, 1.55, 0.6], yoP, yoP, 44, 0.22),
      T(c.sigue - 0.1, [-2.4, 1.45, 1.3], [-2.9, 1.65, 0.75], yoP, [M1.x + 0.15, 1.75, M1.z - 0.65], 46),
    ];
    efectos = [['whoosh', c.cafe - 0.6], ['whoosh', c.mesa1 - 0.15], ['whoosh', c.levanta - 0.15], ['whoosh', c.pasa - 0.15], ['whoosh', c.pasa2 - 0.15], ['whoosh', c.cinco - 0.15], ['hit', c.cinco], ['whoosh', c.diez - 0.12], ['hit', c.diez],
      ['whoosh', c.mesa2 - 0.15], ['whoosh', c.toca - 0.15], ['tap', c.movil + 0.05], ['ding', c.cafe2 - 0.05], ['tick', c.cafe2 + 0.3], ['tick', c.tostada + 0.1], ['pop', c.pedido + 0.1], ['whoosh', c.llega - 0.15], ['buzz', c.llega], ['ding', c.llega + 0.05],
      ['whoosh', c.momento - 0.18], ['whoosh', c.cuarenta - 0.15], ['whoosh', c.mesa3 - 0.15], ['ding', c.mesa3], ['pop', c.mesa3 + 0.05], ['whoosh', c.cta - 0.12], ['pop', c.cta + 0.05], ['whoosh', c.y - 0.15], ['whoosh', c.sigue - 0.15], ['whoosh', c.fin - 0.3]];
    for (let s = 0.25; s < c.mesa2; s += 0.5) efectos.push(['tick', s]);
    this.musica = 'guitarra_bar'; this.volMusica = 0.4;
  },
  // segundos que marca cada cronómetro (cámara rápida)
  t1(t) { const c = this.c; return t < c.cinco ? t / c.cinco * 300 : t < c.diez ? lerp(300, 600, prog(t, c.cinco, c.diez)) : 600 + (t - c.diez) * 65; },
  t2(t) { const c = this.c; return clamp((t - c.mesa2) / (c.mesa3 - c.mesa2)) * 40; },
  actualizar(t) {
    const c = this.c, yo = this.yo, ella = this.ella, k = this.camarero, rapido = t < c.mesa2;
    // sombras que se mueven (pasa el tiempo)
    const a = 2.4 + this.t1(t) * 0.0012; this.sol.position.set(Math.cos(a) * 8, 9, Math.sin(a) * 8 + 2); this.sol.target.position.set(0, 0, -1);
    this.gente.forEach((g, i) => { g.reset(); g.respirar(t * (rapido ? 3 : 1), i); if (Math.sin(t * (rapido ? 4 : 1.2) + i * 2) > 0.3) g.hablar(t * (rapido ? 2 : 1) + i); });
    // oficinista: mano siempre arriba, mira el reloj de pulsera
    yo.reset(); yo.respirar(t, 1); const canso = Math.max(0, Math.sin(t * 1.1)) * 0.22; yo.bD.hombro.rotation.x = -2.85 + canso; yo.bD.hombro.rotation.z = -0.15; yo.bD.codo.rotation.x = -0.1 - canso * 0.6;
    yo.cejas.forEach((ce, s) => { ce.rotation.z = (s ? -1 : 1) * 0.25; });
    if (entre(t, c.diez - 0.1, c.mesa2)) { yo.bI.hombro.rotation.x = -1.3; yo.bI.codo.rotation.x = -1.4; yo.cabeza.rotation.x = 0.35; }
    let mira = null;
    // camarero
    k.reset(); k.g.visible = true; k.bandeja.visible = false; this.mvK.visible = false;
    const pasar = (t0, t1, x0, x1, z, band) => { if (!entre(t, t0, t1)) return false; const kk = (t - t0) / (t1 - t0); k.g.position.set(lerp(x0, x1, kk), 0, z); k.g.rotation.y = x1 > x0 ? Math.PI / 2 : -Math.PI / 2; k.andar(t * 2.6, 1); k.bandeja.visible = band; this.tazaBand.visible = false; mira = k.g.position; return true; };
    if (pasar(c.pasa - 0.15, c.pasa2 - 0.12, -5.6, -1.4, 1.25, false) || pasar(c.pasa2 - 0.12, c.cinco - 0.1, -1.6, -5.8, 1.25, true)) {}
    else if (entre(t, c.llega - 0.15, c.cuarenta - 0.12)) { k.g.position.set(-1.8, 0, -4.3); k.g.rotation.y = 0; k.respirar(t, 2); this.mvK.visible = false;
      k.bD.hombro.rotation.x = -1.25; k.bD.codo.rotation.x = -1.0; k.cabeza.rotation.x = 0.4; k.g.updateMatrixWorld(true); this.mvK.lookAt(k.cabeza.getWorldPosition(new THREE.Vector3()));
      this.mvK.userData.pantalla('pedidoCamarero', { mesa: 2, lineas: [['1 × Café con leche', 'bebida'], ['1 × Tostada con tomate', 'comida']], resumen: 'ahora · 2 productos · 3,80 €', confirmado: t > c.momento - 0.2 }); }
    else if (entre(t, c.cuarenta - 0.12, c.y - 0.1)) { const kk = prog(t, c.cuarenta - 0.12, c.mesa3 - 0.25); k.g.position.set(lerp(0.4, 2.65, kk), 0, lerp(-2.4, -0.62, kk)); k.bandeja.visible = t < c.mesa3 - 0.05; this.tazaBand.visible = true;
      if (kk < 1) { k.g.rotation.y = Math.atan2(2.25, 1.78); k.andar(t * 2.4, 1); } else { k.g.rotation.y = Math.PI / 2; k.respirar(t, 2); k.bD.hombro.rotation.x = -1.0; k.hablar(t, 0.5); } }
    else k.g.visible = false;
    this.tazaMesa.visible = this.tostMesa.visible = t > c.mesa3 - 0.05; this.tazaMesa.userData.actualizar(t, 1); this.tazaBand.userData.actualizar(t, 1);
    // cafetera llenando la taza
    const llenado = prog(t, c.momento - 0.2, c.cuarenta - 0.2); this.tazaBarra.visible = entre(t, c.llega, c.cuarenta); this.tazaBarra.userData.actualizar(t, llenado); this.chorro.visible = entre(t, c.momento - 0.2, c.cuarenta - 0.25);
    yo.cabeza.rotation.y = mira ? clamp(Math.atan2(mira.x - yo.g.position.x, mira.z - yo.g.position.z), -1.2, 1.2) * 0.8 : Math.sin(t * 0.6) * 0.15;
    // paseantes a cámara rápida (solo mientras espera)
    this.paseantes.forEach((m, i) => { m.reset(); m.g.visible = rapido; if (!rapido) return; const f = ((t * 0.55 + i * 0.37) % 1); const z = [1.9, -1.8, 2.6][i], dir = i % 2 ? -1 : 1;
      m.g.position.set(lerp(-5.5, 5.5, dir > 0 ? f : 1 - f), 0, z); m.g.rotation.y = dir * Math.PI / 2; m.andar(t * 3.2, 1); });
    // reloj de pared
    const ang = this.t1(t) / 60 * Math.PI * 2 / 12; this.minutos.rotation.z = -ang * 12; this.horas.rotation.z = -ang - 1.2;
    // araña
    yo.g.updateMatrixWorld(true); const pm = yo.bD.mano.getWorldPosition(new THREE.Vector3());
    this.arana.visible = t > c.y - 0.1; this.arana.position.copy(pm); this.arana.position.y += 0.02 - Math.max(0, 1 - prog(t, c.y - 0.1, c.sigue + 0.3)) * 0.4; this.arana.rotation.y = t * 0.8;
    // chica: toca la tarjeta y pide
    ella.reset(); ella.respirar(t, 3); ella.g.visible = !entre(t, c.cafe2 - 0.15, c.llega - 0.1); let movilVis = false;
    if (entre(t, c.toca - 0.3, c.llega)) { movilVis = true; ella.bD.hombro.rotation.x = -1.2; ella.bD.codo.rotation.x = -0.5; ella.cabeza.rotation.x = 0.3; }
    if (t > c.mesa3) { ella.hablar(t, 0.5); ella.bD.hombro.rotation.x = -1.0; ella.bD.codo.rotation.x = -1.0; ella.cabeza.rotation.x = -0.1; }
    this.mv2.visible = movilVis;
    if (movilVis) { const kk = prog(t, c.toca - 0.2, c.movil + 0.05); const lejos = this.ph.clone().addScaledVector(this.nrm, 0.4).add(new THREE.Vector3(0, -0.05, 0)); this.mv2.position.copy(lejos).lerp(this.ph, kk); this.mv2.lookAt(this.mv2.position.clone().add(this.nrm));
      const sel = t > c.tostada + 0.1 ? 2 : t > c.cafe2 + 0.3 ? 1 : 0; this.mv2.userData.pantalla(t > c.movil + 0.25 ? 'cartaDesayuno' : 'bloqueo', t > c.movil + 0.25 ? { mesa: 2, sel, enviado: t > c.pedido + 0.1 } : { hora: '08:47' }); }
    this.on.userData.actualizar(t, movilVis && entre(t, c.movil - 0.05, c.cafe2) ? 1 : 0, this.mv2.getWorldPosition(new THREE.Vector3()), this.cen);
    // pantallas barra/cocina
    const pulso = 0.5 + 0.5 * Math.sin(t * 8);
    this.pantBarra.userData.pintar('barra', t > c.llega ? { nuevo: true, mesa: 2, detalle: '1 × Café con leche', estado: 'NUEVO', pulso } : { nuevo: false });
    this.pantCoc.userData.pintar('cocina', t > c.llega ? { nuevo: true, mesa: 2, detalle: '1 × Tostada con tomate', estado: 'NUEVO', pulso } : { nuevo: false });
    this.cocinero.reset(); this.cocinero.respirar(t, 4);
    this.desenfoque = camara2(t, this.tomas); if (t > c.fin - 0.3) this.desenfoque = Math.max(this.desenfoque, 14 * prog(t, c.fin - 0.3, c.fin));
  },
  fx(t) { const c = this.c; let temblor = 0; for (const g of [c.cinco, c.diez, c.mesa3]) { const d = t - g; if (d >= 0 && d < 0.3) temblor = Math.max(temblor, (1 - d / 0.3) * 14); }
    let zoom = 1; for (const g of [c.cinco, c.diez]) { const d = t - g; if (d >= 0 && d < 0.4) zoom = Math.max(zoom, 1 + 0.08 * (1 - d / 0.4)); } return { desenfoque: this.desenfoque, temblor, zoom }; },
  capa(t) {
    const c = this.c; velos();
    const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const dos = t >= c.mesa2 - 0.1, X1 = dos ? lerp(W / 2, 278, prog(t, c.mesa2 - 0.1, c.mesa2 + 0.2)) : W / 2;
    const golpe = [c.cinco, c.diez].some(g => entre(t, g, g + 0.3)) ? 1.12 : 1;
    cronoPanel(X1, 'MESA 1 · ESPERANDO', mmss(this.t1(t)), '#ff4d5e', golpe * (dos ? lerp(1, 0.9, prog(t, c.mesa2 - 0.1, c.mesa2 + 0.2)) : 1));
    if (dos) { const parado = t >= c.mesa3; cronoPanel(W - 278, parado ? 'MESA 2 · SERVIDA' : 'MESA 2 · CON TARJETA', mmss(this.t2(t)), '#3ddc84', entra(t, c.mesa2 - 0.1) * 0.9 * (parado && t - c.mesa3 < 0.3 ? 1.12 : 1), parado); }
    gancho(['¿CUÁNTO TARDA UN BAR', 'EN PONERTE UN CAFÉ?'], 1 - prog(t, 2.2, 2.45));
    if (entre(t, c.toca, c.y - 0.1)) { const grande = t >= c.cta - 0.05; pildora('Comenta CAFÉ', W / 2, grande ? 1560 : 1660, grande ? entra(t, c.cta - 0.05) * 1.3 : entra(t, c.toca), { icono: 'check', tono: 'marca', tam: 54 }); }
  },
};

// ---------- El señor de la mano, parte 2: chiringuito en agosto a mediodía (mismo personaje que «crono») ----------
function tintoVerano() {
  const g = new THREE.Group(); const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.15, 18), new THREE.MeshStandardMaterial({ color: '#b8243a', roughness: 0.15, emissive: '#3a0410', emissiveIntensity: 0.4 })); vaso.position.y = 0.075; g.add(vaso);
  const limon = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.008, 16), matJ('#f5d83a', 0.5)); limon.position.set(0, 0.155, 0); limon.rotation.z = 0.3; g.add(limon);
  for (let i = 0; i < 3; i++) { const h = caja(0.03, 0.03, 0.03, '#e6f4ff', 0.006); h.position.set(Math.cos(i * 2) * 0.015, 0.14, Math.sin(i * 2) * 0.015); h.rotation.set(i, i * 2, 0); g.add(h); }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g;
}
function espetos() {
  const g = new THREE.Group(); const plato = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.014, 28), matJ('#ffffff', 0.3)); plato.position.y = 0.007; g.add(plato);
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.13, 6, 10), matJ('#8fa3b8', 0.35)); s.rotation.z = Math.PI / 2; s.scale.set(1, 1, 0.7); s.position.set(0, 0.035, -0.05 + i * 0.05); g.add(s);
    const lomo = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.12, 4, 8), matJ('#4a5a6e', 0.4)); lomo.rotation.z = Math.PI / 2; lomo.position.set(0, 0.052, -0.05 + i * 0.05); g.add(lomo); }
  const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.24, 6), matJ('#d9b77a', 0.8)); palo.rotation.x = Math.PI / 2; palo.position.set(0.03, 0.04, 0); g.add(palo);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g;
}
function gaviota() {
  const g = new THREE.Group(); const blanco = matJ('#ffffff', 0.6), gris = matJ('#9aa3ad', 0.6);
  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), blanco); cuerpo.scale.set(0.8, 0.8, 1.5); g.add(cuerpo);
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), blanco); cabeza.position.set(0, 0.07, 0.12); g.add(cabeza);
  const pico = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.06, 8), matJ('#f2b233', 0.5)); pico.rotation.x = Math.PI / 2; pico.position.set(0, 0.065, 0.19); g.add(pico);
  [-1, 1].forEach(s => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), matJ('#111111', 0.3)); o.position.set(0.035 * s, 0.085, 0.15); g.add(o); });
  const alas = [-1, 1].map(s => { const piv = new THREE.Group(); piv.position.set(0.05 * s, 0.03, 0); const a = caja(0.26, 0.015, 0.12, '#9aa3ad', 0.006); a.material = gris; a.position.x = 0.13 * s; piv.add(a); g.add(piv); return piv; });
  const cola = caja(0.08, 0.01, 0.08, '#2a2a2a', 0.004); cola.position.set(0, 0.02, -0.15); g.add(cola);
  g.userData.aletear = (t, k) => alas.forEach((p, i) => (p.rotation.z = (i ? -1 : 1) * (k ? Math.sin(t * 28) * 0.9 : -0.15)));
  g.traverse(m => { if (m.isMesh) m.castShadow = true; }); return g;
}
V['mano2'] = { ...comunCapa, estilo: 'mediodia',
  async montar() {
    await V['chiringuito'].montar.call(this);
    ['chiringuito', 'agosto', 'mano', 'cuarenta', 'grados', 'camarero', 'gamba', 'rojo', 'sombrilla', 'tarjeta', 'tintos', 'espetos', 'minuto', 'mesa'].forEach(w => CLAVES.add(w));
    // mediodía de agosto: cielo azul intenso, sol alto y blanco
    const cielo = document.createElement('canvas'); cielo.width = 8; cielo.height = 256; const cx = cielo.getContext('2d'); const gr = cx.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#1f6fd6'); gr.addColorStop(0.55, '#5fb0f0'); gr.addColorStop(1, '#d8f1ff'); cx.fillStyle = gr; cx.fillRect(0, 0, 8, 256);
    const tc = new THREE.CanvasTexture(cielo); tc.colorSpace = THREE.SRGBColorSpace; scene.background = tc; scene.fog = new THREE.Fog('#cfeaff', 40, 120);
    const dirs = []; scene.traverse(o => { if (o.isDirectionalLight) dirs.push(o); }); this.sol = dirs[0]; this.sol.color.set('#fff8ea'); this.sol.intensity = 3.1; dirs.slice(1).forEach(l => (l.intensity = 0.25));
    hemi.color.set('#ffffff'); hemi.groundColor.set('#e0c08a'); hemi.intensity = 1.6; renderer.toneMappingExposure = 1.08;
    this.M.traverse(o => { if (o.isMesh && o.geometry.type === 'CircleGeometry' && o.material.fog === false) o.visible = false; });
    this.bombillas.forEach(b => (b.visible = false));
    // fuera lo del vídeo anterior: pareja de la mesa 0, su pedido, su tarjeta y el móvil del camarero
    [this.A, this.B].forEach(m => (m.g.visible = false)); this.gente = this.gente.filter(m => m.g.visible);
    [...this.canasMesa, this.bravasMesa, ...this.canasBarra, this.bravasBarra, this.tj, this.mvC, this.halo, this.aro].forEach(o => (o.visible = false));
    // el señor de la mano (mismo que en «crono»), en la mesa sin sombrilla
    const yo = this.yo = muneco({ camisa: '#ffffff', chaleco: '#34405e', pantalon: '#34405e', pelo: '#5a4a3a', peinado: 'corto', piel: '#f0c29b' }); yo.sentar(); yo.g.position.set(0.8, 0, 1.48); this.M.add(yo.g);
    const corbata = caja(0.06, 0.24, 0.02, '#c0263a', 0.01); corbata.position.set(0, 1.2, 0.19); yo.raiz.add(corbata);
    this.pielYo = []; yo.g.traverse(o => { if (o.isMesh && o.material.color && o.material.color.getHexString() === 'f0c29b') this.pielYo.push(o.material); });
    // la de la sombrilla de al lado (mesa 2) con su tarjeta MENÚ
    const m2 = this.mesas[2].position; this.ella = this.gente.find(g => Math.abs(g.g.position.x - m2.x) < 0.01 && g.g.position.z < m2.z);
    const tj = this.tj2 = tarjetaMenu(); tj.scale.setScalar(0.3); tj.position.set(m2.x + 0.22, 0.795, m2.z - 0.28); tj.rotation.y = Math.PI - 0.3; this.M.add(tj);
    this.M.updateMatrixWorld(true); this.cen = tj.userData.centro().clone(); this.nrm = new THREE.Vector3(Math.sin(Math.PI - 0.3), 0, Math.cos(Math.PI - 0.3));
    this.ph = this.cen.clone().addScaledVector(this.nrm, 0.07).add(new THREE.Vector3(0, 0.02, 0)); this.mv.scale.setScalar(0.38);
    // pedido: tintos y espetos (bandeja, plancha y mesa)
    this.bandeja.children.slice(1).forEach(o => (o.visible = false));
    const t1 = tintoVerano(); t1.position.set(-0.09, 0.012, 0.03); const t2 = tintoVerano(); t2.position.set(0.08, 0.012, -0.04); const e1 = espetos(); e1.scale.setScalar(0.7); e1.position.set(0.02, 0.012, 0.12); this.bandeja.add(t1, t2, e1);
    this.pedMesa = [tintoVerano(), tintoVerano(), espetos()]; [[m2.x - 0.2, m2.z - 0.12], [m2.x + 0.05, m2.z + 0.1], [m2.x - 0.05, m2.z + 0.2]].forEach(([x, z], i) => { this.pedMesa[i].position.set(x, 0.795, z); this.M.add(this.pedMesa[i]); });
    this.espPlancha = espetos(); this.espPlancha.scale.setScalar(1.3); this.espPlancha.position.set(5.3, 1.04, -4.0); this.M.add(this.espPlancha);
    this.humo = [0, 1, 2, 3].map(() => { const v = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false })); this.M.add(v); return v; });
    this.gav = gaviota(); this.M.add(this.gav);
    // paseantes por la arena a cámara rápida
    this.paseantes = [{ camisa: '#ff5e7a', pelo: '#2a1a12' }, { camisa: '#2bb3c9', pelo: '#7a3d1d', peinado: 'largo' }, { camisa: '#ffd23a', pelo: '#111111' }].map((o, i) => { const m = muneco({ pantalon: '#2b2f3a', piel: ['#f0c29a', '#e9b48c', '#c98d63'][i], ...o }); this.M.add(m.g); return m; });
    const c = this.c = { parte: cue('parte'), chiringuito: cue('chiringuito'), agosto: cue('agosto'), levanta: cue('levanta'), cuarenta: cue('cuarenta'), pasa: cue('pasa'), rojo: cue('rojo'), gamba: cue('gamba'), sombrilla: cue('sombrilla'),
      toca: cue('toca'), tarjeta: cue('tarjeta'), tintos: cue('tintos'), espetos: cue('espetos'), minuto: cue('minuto'), mesa: cue('mesa'), y: cue('y', 3), sigue: cue('sigue'), levantada: cue('levantada') };
    duracion = palabras[palabras.length - 1].fin + 0.12; c.fin = duracion;
    const yoP = [0.8, 1.35, 1.48], mano = [1.05, 1.75, 1.55], P = this.ph, n = this.nrm, cen = this.cen, fr = (v, d) => [v.x + d[0], v.y + d[1], v.z + d[2]];
    const T = (a, de, a2, mira, mira2, fov = 44, barrido = 0.18) => ({ a, de, a2, mira, mira2: mira2 || mira, fov, barrido });
    this.tomas = [
      T(0, [2.6, 1.7, 5.2], [1.35, 1.5, 3.4], yoP, [0.85, 1.45, 1.48], 46, 0),
      T(c.chiringuito - 0.15, [-4.5, 7.0, 9.0], [3.5, 6.0, 8.0], [0.5, 0.8, -0.5], [0.8, 0.8, 0.5], 50),
      T(c.levanta - 0.1, [1.6, 0.95, 2.9], [1.3, 1.05, 2.55], [0.95, 1.5, 1.5], mano, 50),
      T(c.cuarenta - 0.1, [1.7, 1.5, 2.7], [-0.1, 1.5, 2.7], yoP, yoP, 40),
      T(c.pasa - 0.1, [-1.5, 1.4, 3.8], [2.8, 1.4, 3.8], [-1.8, 1.1, 0.6], [3.2, 1.1, 0.6], 46),
      T(c.rojo - 0.1, [1.5, 1.45, 3.0], [1.0, 1.38, 2.35], yoP, yoP, 38),
      T(c.sombrilla - 0.1, [5.8, 1.8, 5.6], [4.9, 1.5, 4.6], [4.0, 1.1, 3.0], [4.0, 1.15, 2.9], 46, 0.22),
      T(c.toca - 0.1, fr(cen, [0.75, 0.45, -0.95]), fr(cen, [0.45, 0.3, -0.7]), cen.toArray(), cen.toArray(), 42),
      T(c.tintos - 0.12, fr(P, [n.x * 0.62 + 0.15, 0.16, n.z * 0.62]), fr(P, [n.x * 0.5, 0.1, n.z * 0.5 - 0.08]), P.toArray(), P.toArray(), 38),
      T(c.espetos - 0.1, [5.0, 1.95, -1.5], [5.05, 1.78, -1.95], [5.3, 1.05, -4.0], [5.3, 1.05, -4.0], 40),
      T(c.minuto - 0.12, [6.2, 1.7, 1.0], [5.9, 1.6, 1.4], [4.3, 1.2, 2.2], [4.7, 1.1, 2.9], 48),
      T(c.mesa - 0.1, [2.6, 1.75, 3.9], [2.95, 1.55, 3.7], [4.0, 0.85, 3.3], [4.0, 0.85, 3.3], 40),
      T(c.y - 0.1, [-0.8, 1.7, 4.0], [0.3, 1.5, 3.0], yoP, yoP, 44, 0.22),
      T(c.sigue - 0.1, [1.7, 1.3, 2.9], [1.25, 1.5, 2.4], yoP, mano, 44),
    ];
    efectos = [['whoosh', c.chiringuito - 0.2], ['whoosh', c.levanta - 0.15], ['whoosh', c.cuarenta - 0.15], ['hit', c.cuarenta], ['whoosh', c.pasa - 0.15], ['whoosh', c.rojo - 0.15], ['pop', c.gamba],
      ['whoosh', c.sombrilla - 0.15], ['whoosh', c.toca - 0.15], ['tap', c.tarjeta + 0.05], ['ding', c.tarjeta + 0.3], ['whoosh', c.tintos - 0.15], ['tick', c.tintos + 0.2], ['tick', c.espetos], ['whoosh', c.espetos - 0.15], ['buzz', c.espetos + 0.1],
      ['whoosh', c.minuto - 0.15], ['whoosh', c.mesa - 0.15], ['ding', c.mesa], ['pop', c.mesa + 0.05], ['whoosh', c.y - 0.15], ['whoosh', c.sigue - 0.15], ['pop', c.sigue + 0.35], ['whoosh', c.fin - 0.3]];
    for (let s = 0.25; s < c.sombrilla; s += 0.5) efectos.push(['tick', s]);
    this.musica = 'guitarra_bar'; this.volMusica = 0.4;
  },
  t1(t) { return t * 150; },
  t2(t) { const c = this.c; return clamp((t - c.sombrilla) / (c.mesa - c.sombrilla)) * 60; },
  actualizar(t) {
    const c = this.c, yo = this.yo, k = this.cam1, rapido = t < c.sombrilla;
    // mar, sol que se mueve (pasa el tiempo)
    const pos = this.mar.geometry.attributes.position, b = this.marBase; for (let i = 0; i < pos.count; i++) { const x = b[i * 3], y = b[i * 3 + 1], tt = t * (rapido ? 3 : 1); pos.array[i * 3 + 2] = 0.18 * Math.sin(x * 0.25 + tt * 1.3) + 0.12 * Math.sin(y * 0.45 + tt * 0.9) + 0.06 * Math.sin((x + y) * 0.9 + tt * 2.1); } pos.needsUpdate = true;
    const a = 1.2 + this.t1(t) * 0.0008; this.sol.position.set(Math.cos(a) * 7, 12, Math.sin(a) * 7);
    this.gente.forEach((g, i) => { g.reset(); g.respirar(t * (rapido ? 3 : 1), i); if (Math.sin(t * (rapido ? 4 : 1.2) + i * 2) > 0.3) g.hablar(t * (rapido ? 2 : 1) + i); });
    this.barman.reset(); this.barman.respirar(t, 5); this.cocinero.reset(); this.cocinero.respirar(t, 6); this.cocinero.g.position.x = entre(t, c.espetos - 0.2, c.minuto) ? 6.25 : 5.6;
    // el señor: mano arriba siempre, cada vez más rojo
    yo.reset(); yo.respirar(t, 1); const canso = Math.max(0, Math.sin(t * 1.1)) * 0.22; yo.bD.hombro.rotation.x = -2.85 + canso; yo.bD.hombro.rotation.z = -0.15; yo.bD.codo.rotation.x = -0.1 - canso * 0.6;
    yo.cejas.forEach((ce, s) => { ce.rotation.z = (s ? -1 : 1) * 0.25; });
    const rojo = prog(t, c.levanta, c.gamba + 0.2); const col = new THREE.Color('#f0c29b').lerp(new THREE.Color('#ef5a43'), rojo); this.pielYo.forEach(m => m.color.copy(col));
    let mira = null;
    // camarero: pasa de largo y luego sirve la sombrilla 3
    k.reset(); k.g.visible = true; this.bandeja.visible = false;
    if (entre(t, c.pasa - 0.15, c.rojo - 0.1)) { const kk = (t - c.pasa + 0.15) / (c.rojo - c.pasa + 0.05); k.g.position.set(lerp(-3.0, 4.2, kk), 0.18, 0.6); k.g.rotation.y = Math.PI / 2; k.andar(t * 2.6, 1); this.bandeja.visible = true; mira = k.g.position; }
    else if (entre(t, c.minuto - 0.12, c.y - 0.1)) { const m2 = this.mesas[2].position; const kk = prog(t, c.minuto - 0.12, c.mesa - 0.25); k.g.position.set(lerp(3.7, m2.x + 0.75, kk), 0, lerp(1.5, m2.z - 0.5, kk)); this.bandeja.visible = t < c.mesa - 0.05;
      if (kk < 1) { k.g.rotation.y = Math.atan2(m2.x + 0.75 - 3.7, m2.z - 0.5 - 1.5); k.andar(t * 2.4, 1); } else { k.g.rotation.y = Math.atan2(-0.75, 0.5); k.respirar(t, 2); k.bD.hombro.rotation.x = -1.0; k.hablar(t, 0.5); } }
    else if (t < c.minuto) { k.g.position.set(-0.5, 0.18, -2.3); k.g.rotation.y = 0; k.respirar(t, 2); }
    else k.g.visible = false;
    if (this.bandeja.visible) { k.bI.codo.rotation.x = Math.min(k.bI.codo.rotation.x, -1.45); k.bI.hombro.rotation.x = Math.min(k.bI.hombro.rotation.x, -0.15); }
    this.pedMesa.forEach(o => (o.visible = t > c.mesa - 0.05));
    yo.cabeza.rotation.y = mira ? clamp(Math.atan2(mira.x - yo.g.position.x, mira.z - yo.g.position.z), -1.2, 1.2) * 0.8 : Math.sin(t * 0.6) * 0.15;
    // plancha con humo
    this.espPlancha.visible = entre(t, c.tintos, c.minuto + 0.5); this.humo.forEach((v, i) => { const f = (t * 0.7 + i / 4) % 1; v.visible = this.espPlancha.visible; v.position.set(5.3 + Math.sin(t * 2 + i) * 0.08, 1.1 + f * 0.6, -4.0 + (i - 1.5) * 0.06); v.scale.setScalar(0.6 + f * 1.5); v.material.opacity = 0.3 * Math.sin(Math.PI * f); });
    // paseantes por la orilla mientras espera
    this.paseantes.forEach((m, i) => { m.reset(); m.g.visible = rapido; if (!rapido) return; const f = ((t * 0.5 + i * 0.37) % 1); const z = [5.6, 6.6, -6.4][i], dir = i % 2 ? -1 : 1;
      m.g.position.set(lerp(-8, 9, dir > 0 ? f : 1 - f), 0, z); m.g.rotation.y = dir * Math.PI / 2; m.andar(t * 3.2, 1); });
    // gaviota que se le posa en la mano al final
    yo.g.updateMatrixWorld(true); const pm = yo.bD.mano.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.12, 0));
    const kg = prog(t, c.y - 0.1, c.sigue + 0.2); this.gav.visible = t > c.y - 0.1; this.gav.position.copy(new THREE.Vector3(-1.5, 4.2, -1.0).lerp(pm, kg)); this.gav.rotation.y = kg < 1 ? Math.atan2(pm.x + 1.5, pm.z + 1.0) : 0.6 + Math.sin(t * 2) * 0.2; this.gav.userData.aletear(t, kg < 1);
    // la de la sombrilla: toca la tarjeta y pide
    const ella = this.ella; let movilVis = false; ella.g.visible = !entre(t, c.tintos - 0.15, c.espetos - 0.1);
    if (entre(t, c.toca - 0.3, c.espetos)) { movilVis = true; ella.bD.hombro.rotation.x = -1.2; ella.bD.codo.rotation.x = -0.5; ella.cabeza.rotation.x = 0.3; }
    if (t > c.mesa) { ella.bD.hombro.rotation.x = -1.6 - 0.3 * Math.max(0, Math.sin(t * 5)); ella.bD.codo.rotation.x = -0.6; ella.hablar(t, 0.5); }
    this.mv.visible = movilVis;
    if (movilVis) { const kk = prog(t, c.toca - 0.2, c.tarjeta + 0.05); const lejos = this.ph.clone().addScaledVector(this.nrm, 0.4).add(new THREE.Vector3(0, -0.05, 0)); this.mv.position.copy(lejos).lerp(this.ph, kk); this.mv.lookAt(this.mv.position.clone().add(this.nrm));
      const sel = t > c.espetos + 0.05 ? 2 : t > c.tintos + 0.15 ? 1 : 0;
      this.mv.userData.pantalla(t > c.tarjeta + 0.25 ? 'cartaDesayuno' : 'bloqueo', t > c.tarjeta + 0.25 ? { mesa: 3, titulo: 'Chiringuito El Faro', sub: 'a pie de playa', sel, enviado: t > c.espetos + 0.45, totales: ['', '6,00', '15,50'],
        items: [['2 × Tinto de verano', '6,00 €', ['#c2304a', '#7d1630']], ['Espetos de sardinas', '9,50 €', ['#9fb3c8', '#4a5a6e']], ['Caña', '2,50 €', ['#f6c453', '#e09a2b']], ['Agua', '1,50 €', ['#bfe6ff', '#5fb0f0']]] } : { hora: '14:20' }); }
    this.on.userData.actualizar(t, movilVis && entre(t, c.tarjeta - 0.05, c.tintos) ? 1 : 0, this.mv.getWorldPosition(new THREE.Vector3()), this.cen);
    const pulso = 0.5 + 0.5 * Math.sin(t * 8);
    this.pantBarra.userData.pintar('barra', t > c.espetos + 0.1 ? { nuevo: true, mesa: 3, detalle: '2 × Tinto de verano', estado: 'NUEVO', pulso } : { nuevo: false });
    this.pantCoc.userData.pintar('cocina', t > c.espetos + 0.1 ? { nuevo: true, mesa: 3, detalle: '1 × Espetos', estado: 'EN MARCHA', pulso } : { nuevo: false });
    this.desenfoque = camara2(t, this.tomas); if (t > c.fin - 0.3) this.desenfoque = Math.max(this.desenfoque, 14 * prog(t, c.fin - 0.3, c.fin));
  },
  fx(t) { const c = this.c; let temblor = 0; for (const g of [c.cuarenta, c.gamba, c.mesa]) { const d = t - g; if (d >= 0 && d < 0.3) temblor = Math.max(temblor, (1 - d / 0.3) * 14); }
    let zoom = 1; { const d = t - c.cuarenta; if (d >= 0 && d < 0.4) zoom = 1 + 0.08 * (1 - d / 0.4); } return { desenfoque: this.desenfoque, temblor, zoom }; },
  capa(t) {
    const c = this.c; velos();
    const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    pildora('EL SEÑOR DE LA MANO · PARTE 2', W / 2, 62, 1, { tono: 'oscuro', tam: 26 });
    const dos = t >= c.sombrilla - 0.1, X1 = dos ? lerp(W / 2, 278, prog(t, c.sombrilla - 0.1, c.sombrilla + 0.2)) : W / 2;
    cronoPanel(X1, 'SEÑOR · ESPERANDO', mmss(this.t1(t)), '#ff4d5e', (entre(t, c.cuarenta, c.cuarenta + 0.3) ? 1.12 : 1) * (dos ? lerp(1, 0.9, prog(t, c.sombrilla - 0.1, c.sombrilla + 0.2)) : 1));
    if (dos) { const parado = t >= c.mesa; cronoPanel(W - 278, parado ? 'SOMBRILLA 3 · SERVIDA' : 'SOMBRILLA 3 · TARJETA', mmss(this.t2(t)), '#3ddc84', entra(t, c.sombrilla - 0.1) * 0.9 * (parado && t - c.mesa < 0.3 ? 1.12 : 1), parado); }
    gancho(['¿CUÁNTO TARDA UN', 'CHIRINGUITO EN AGOSTO?'], 1 - prog(t, 2.1, 2.35));
    if (entre(t, c.cuarenta, c.toca - 0.1)) pildora('¿Lo máximo que has esperado tú?', W / 2, 1640, entra(t, c.cuarenta), { icono: 'reloj', tono: 'marca', tam: 46 });
    if (entre(t, c.minuto, c.y - 0.1)) pildora('Etiqueta al que siempre levanta la mano', W / 2, 1640, entra(t, c.minuto), { icono: 'mano', tono: 'oscuro', tam: 40 });
  },
};

// ---------- POV del dueño: ve cómo las mesas se cansan de esperar y se van (bar de tapas moderno de noche) ----------
V['dueno'] = { ...comunCapa, estilo: 'moderno',
  async montar() {
    for (const [f, peso, estilo] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: estilo }); await ff.load(); document.fonts.add(ff); }
    ['dueno', 'sabado', 'cuatro', 'seis', 'sesenta', 'euros', 'puerta', 'tarjeta', 'mesa', 'mesas', 'cero', 'llega'].forEach(w => CLAVES.add(w));
    scene.background = new THREE.Color('#0d1114'); scene.fog = null; pared.visible = suelo.visible = bokeh.visible = false;
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0;
    hemi.color.set('#ffe9d0'); hemi.groundColor.set('#3a2a22'); hemi.intensity = 1.35;
    const sol = new THREE.DirectionalLight('#ffd7a8', 0.9); sol.position.set(3, 9, 5); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 }); sol.shadow.bias = -0.0005; scene.add(sol);
    renderer.toneMappingExposure = 1.22; scene.add(cam); const luzPuerta = new THREE.PointLight('#ffd7a8', 9, 7, 1.4); luzPuerta.position.set(1.6, 2.9, 2.6); scene.add(luzPuerta); cam.rotation.order = 'YXZ';
    const r = construirRestaurante(scene, { pantalla3D, tpv, movil, tarjetaMenu, placaCuadrada, tema: 'moderno' }); Object.assign(this, r);
    r.mesas[0].gente = [0, 1]; r.placa.visible = false; r.tj.visible = false; r.mundo.children.forEach(o => { if (o.position.distanceTo(new THREE.Vector3(-2.4, 1.13, -5.35)) < 0.05) o.visible = false; }); r.movCam.visible = false;
    const p = poblar(r.mundo, r.mesas); Object.assign(this, p);
    const pers = (idx, a) => { const m = r.mesas[idx]; return this.gente.find(g => Math.abs(g.g.position.x - m.x) < 0.01 && (a ? g.g.position.z > m.z : g.g.position.z < m.z)); };
    // las dos mesas que se van: mesa 4 (derecha) y mesa 6 (izquierda)
    this.se = [[pers(4, 0), pers(4, 1)], [pers(3, 0), pers(3, 1)]]; this.asiento = new Map(); this.se.flat().forEach(m => this.asiento.set(m, [m.g.position.x, m.g.position.z, m.g.rotation.y]));
    this.cliente2 = pers(2, 1);
    // tarjetas MENÚ en todas las mesas (aparecen al ponerlas)
    this.cartas = r.mesas.map(m => { const tj = tarjetaMenu(); tj.position.set(m.x + 0.28, 0.79, m.z + 0.1); tj.rotation.y = 0.3; tj.scale.setScalar(0.3); r.mundo.add(tj); return tj; });
    r.mundo.updateMatrixWorld(true); this.cen = this.cartas.map(tj => tj.userData.centro().clone());
    this.servido = []; [0, 1, 2, 3, 4, 5].forEach(i => { const m = r.mesas[i]; for (let j = 0; j < 2; j++) { const c = cana(); c.position.set(m.x - 0.18 + j * 0.2, 0.79, m.z - 0.05 + j * 0.08); r.mundo.add(c); this.servido.push(c); } });
    // manos del dueño: móvil (derecha) y tarjeta (izquierda)
    this.mv = movil('#20232c'); const h = manosPOV(cam, this.mv, { manga: '#2b2f3a', piel: '#e3a87f' }); this.D = h.D; this.I = h.I; this.colocarBrazo = h.colocarBrazo; this.I.visible = false;
    this.tjMano = tarjetaMenu(); this.tjMano.scale.setScalar(0.42); this.tjMano.traverse(m => { if (m.isMesh) m.castShadow = false; }); cam.add(this.tjMano);
    this.mv2 = movil(); this.mv2.scale.setScalar(0.38); this.mv2.visible = false; r.mundo.add(this.mv2); this.on = ondas();
    const c = this.c = { dueno: cue('dueno'), sabado: cue('sabado'), cuatro: cue('cuatro'), cansa: cue('cansa'), va: cue('va'), seis: cue('seis'), igual: cue('igual'), sesenta: cue('sesenta'), puerta: cue('puerta'),
      pongo: cue('pongo'), tarjeta: cue('tarjeta'), cada: cue('cada', 2), piden: cue('piden'), llega: cue('llega'), aqui: cue('aqui'), mesas: cue('mesas'), cero: cue('cero') };
    duracion = palabras[palabras.length - 1].fin + 0.15; c.fin = duracion;
    this.ojo = new THREE.Vector3(-3.45, 1.62, -6.0);
    const ph = this.cen[2].clone().add(new THREE.Vector3(0.03, 0.03, 0.06));
    const tc = (v, a, b = 0, lado = 1) => ({ a, barrido: b, de: [v.x + 1.0 * lado, v.y + 0.55, v.z + 1.2], a2: [v.x + 0.78 * lado, v.y + 0.42, v.z + 0.95], mira: [v.x - 0.12 * lado, v.y - 0.05, v.z], mira2: [v.x - 0.12 * lado, v.y - 0.05, v.z], fov: 40 });
    this.tomas = {
      B: [{ a: c.cuatro - 0.1, barrido: 0, de: [2.1, 1.55, 1.7], a2: [2.45, 1.5, 1.35], mira: [3.4, 1.25, -0.2], mira2: [3.4, 1.3, -0.2], fov: 44 }],
      C: [{ a: c.cansa - 0.05, barrido: 0, de: [3.7, 1.95, -1.9], a2: [3.0, 1.85, -0.7], mira: [3.0, 1.15, 1.0], mira2: [1.7, 1.2, 3.6], fov: 52 }],
      E: [{ a: c.sesenta - 0.1, barrido: 0, de: [-0.3, 1.6, 0.9], a2: [0.2, 1.5, 1.7], mira: [1.3, 1.2, 3.4], mira2: [1.6, 1.25, 3.9], fov: 50 }],
      G: [tc(this.cen[4], c.tarjeta - 0.08, 0, 1), (v => ({ a: c.cada - 0.08, barrido: 0.14, de: [v.x + 1.05, v.y + 0.5, v.z + 0.25], a2: [v.x + 0.8, v.y + 0.4, v.z + 0.2], mira: [v.x, v.y - 0.05, v.z], mira2: [v.x, v.y - 0.05, v.z], fov: 40 }))(this.cen[3])],
      H: [{ a: c.piden - 0.1, barrido: 0, de: [ph.x + 0.25, ph.y + 0.3, ph.z + 0.8], a2: [ph.x + 0.15, ph.y + 0.2, ph.z + 0.6], mira: ph.toArray(), mira2: ph.toArray(), fov: 38 }],
    };
    this.obj = { m4: new THREE.Vector3(3.4, 1.1, -0.2), m6: new THREE.Vector3(-3.6, 1.1, 0.2), puerta: new THREE.Vector3(1.6, 1.3, 3.8), sala: new THREE.Vector3(0.2, 0.95, 0.4) };
    efectos = [['whoosh', c.cuatro - 0.15], ['whoosh', c.va - 0.15], ['pop', c.va + 0.3], ['whoosh', c.seis - 0.15], ['pop', c.seis + 0.5], ['whoosh', c.sesenta - 0.15], ['hit', c.sesenta], ['whoosh', c.pongo - 0.15],
      ['whoosh', c.tarjeta - 0.12], ['pop', c.tarjeta], ['whoosh', c.cada - 0.12], ['pop', c.cada], ['whoosh', c.piden - 0.15], ['tap', c.piden + 0.15], ['whoosh', c.llega - 0.15], ['buzz', c.llega + 0.05], ['ding', c.llega + 0.1],
      ['whoosh', c.mesas - 0.15], ['hit', c.cero], ['whoosh', c.fin - 0.3]];
    this.musica = 'guitarra_bar'; this.volMusica = 0.4;
  },
  seg(t) { const c = this.c; return t < c.cuatro - 0.1 ? 'A' : t < c.cansa - 0.05 ? 'B' : t < c.seis - 0.1 ? 'C' : t < c.sesenta - 0.1 ? 'D' : t < c.pongo - 0.1 ? 'E' : t < c.tarjeta - 0.08 ? 'F' : t < c.piden - 0.1 ? 'G' : t < c.llega - 0.1 ? 'H' : t < c.mesas - 0.1 ? 'I' : 'J'; },
  mirar(v) { const E = this.ojo, dx = v.x - E.x, dy = v.y - E.y, dz = v.z - E.z; return [Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))]; },
  perdido(t) { const c = this.c; return t >= c.sesenta ? 60 : t >= c.seis + 0.5 ? 40 : t >= c.va + 0.3 ? 20 : 0; },
  actualizar(t) {
    const c = this.c, s = this.seg(t), caos = t < c.pongo;
    // gente
    this.gente.forEach((p, i) => { if (this.asiento.has(p)) return; p.reset(); p.respirar(t, p.g.position.x); if (Math.sin(t * 1.1 + i * 2) > 0.4) p.hablar(t + i, 0.5);
      if (caos && Math.sin(t * 1.6 + i * 1.9) > 0.2) { p.bD.hombro.rotation.x = -2.7; p.bD.hombro.rotation.z = -0.15 + Math.sin(t * 7 + i) * 0.2; }
      if (!caos && t > c.mesas - 0.2) { p.bD.hombro.rotation.x = -1.5 - 0.3 * Math.max(0, Math.sin(t * 5 + i)); p.bD.codo.rotation.x = -0.6; } });
    // las mesas que se van: se levantan, cruzan la sala y salen por la puerta; luego vuelven a estar ocupadas
    const salida = [[c.cansa - 0.1, c.seis + 0.2], [c.seis - 0.05, c.sesenta + 0.6]], puertaXZ = [1.6, 3.55];
    let abierta = 0;
    this.se.forEach((par, j) => par.forEach((m, k) => {
      const [x0, z0, r0] = this.asiento.get(m); const [a, b] = salida[j]; m.reset(); m.g.visible = true;
      if (t < a || t >= c.pongo) { m.sentar(); m.g.position.set(x0, 0, z0); m.g.rotation.y = r0; m.respirar(t, j * 2 + k); if (caos) { m.cejas.forEach((ce, q) => (ce.rotation.z = (q ? -1 : 1) * 0.3)); m.bI.hombro.rotation.x = -1.0; m.bI.codo.rotation.x = -1.3; } return; }
      m.sentado = false; const kk = clamp((t - a - k * 0.12) / (b - a)); const fuera = [puertaXZ[0] + (k - 0.5) * 0.3, 4.8];
      const pts = [[x0 + (k ? 0 : 0) , z0], [lerp(x0, puertaXZ[0], 0.5), 2.2], [puertaXZ[0] + (k - 0.5) * 0.3, puertaXZ[1]], fuera];
      const seg = Math.min(2, Math.floor(kk * 3)), f = kk * 3 - seg; const P0 = pts[seg], P1 = pts[seg + 1];
      m.g.position.set(lerp(P0[0], P1[0], f), 0, lerp(P0[1], P1[1], f)); m.g.rotation.y = Math.atan2(P1[0] - P0[0], P1[1] - P0[1]); m.andar(t * 2.2, 1); m.cejas.forEach((ce, q) => (ce.rotation.z = (q ? -1 : 1) * 0.3));
      if (m.g.position.z > 3.0) abierta = Math.max(abierta, 1); if (kk >= 1) m.g.visible = false; }));
    this._abre = lerp(this._abre ?? 0, abierta, 0.35); if (this.puerta) this.puerta.rotation.y = -1.25 * this._abre;
    // camarero corriendo en el caos, tranquilo después
    const k = this.camarero; k.reset(); k.g.visible = true; k.bandeja.visible = true;
    if (caos) { const f = (t * 0.33) % 1, ang = f * Math.PI * 2; k.g.position.set(Math.cos(ang) * 2.2 + 0.2, 0, Math.sin(ang) * 1.6 - 1.6); k.g.rotation.y = ang + Math.PI; k.andar(t * 2.6, 1); }
    else { k.g.position.set(1.0, 0, -1.4); k.g.rotation.y = -0.6; k.respirar(t, 2); k.hablar(t, 0.3); }
    k.bI.codo.rotation.x = Math.min(k.bI.codo.rotation.x, -1.45); k.bI.hombro.rotation.x = Math.min(k.bI.hombro.rotation.x, -0.15);
    this.cocinero.reset(); this.cocinero.andar(t * 0.4, 0.3);
    this.servido.forEach(x => (x.visible = t > c.llega));
    // tarjetas
    this.cartas.forEach((tj, i) => { const tp = i === 4 ? c.tarjeta : i === 3 ? c.cada : c.tarjeta - 0.1; const kk = t < tp ? 0 : rebote(clamp((t - tp) / 0.35)); tj.visible = kk > 0.001; tj.scale.setScalar(0.3 * Math.max(0.001, kk)); });
    const pulso = Math.round((0.5 + 0.5 * Math.sin(t * 8)) * 4) / 4;
    this.pantBarra.userData.pintar('barra', t > c.llega ? { nuevo: true, mesa: 4, detalle: '2 × Caña', estado: 'NUEVO', pulso } : { nuevo: false });
    this.pantCoc.userData.pintar('cocina', t > c.llega ? { nuevo: true, mesa: 4, detalle: '1 × Patatas bravas', estado: 'EN MARCHA', pulso } : { nuevo: false });
    const V0 = new THREE.Vector3();
    // ---- planos en 3.ª persona ----
    if (['B', 'C', 'E', 'G', 'H'].includes(s)) {
      this.D.visible = this.tjMano.visible = false; this.colocarBrazo();
      this.desenfoque = camara2(t, this.tomas[s]); const a0 = this.tomas[s][0].a; if (t - a0 < 0.18) this.desenfoque = Math.max(this.desenfoque, 12 * (1 - (t - a0) / 0.18));
      if (s === 'H') { const q = this.cliente2; q.bD.hombro.rotation.set(-1.35, 0, -0.1); q.bD.codo.rotation.x = -0.3;
        movilEnTarjeta({ mv: this.mv2, on: this.on }, t, this.cartas[2], c.piden + 0.15, c.piden - 0.1, c.llega, 'bloqueo', 'cartaV', { hora: '22:15', mesa: 2, sel: t > c.piden + 0.45 ? 2 : 1, enviado: t > c.piden + 0.7 }); }
      else { this.mv2.visible = false; this.on.userData.actualizar(t, 0, V0, V0); }
      return;
    }
    this.mv2.visible = false; this.on.userData.actualizar(t, 0, V0, V0);
    // ---- primera persona: el dueño detrás de la barra ----
    const O = this.obj; let [yaw, pitch] = this.mirar(O.m4), desen = 0, s0 = 0;
    if (s === 'A') { [yaw, pitch] = this.mirar(O.m4); yaw += 0.08 * (1 - prog(t, 0, 1.2)); }
    else if (s === 'D') { s0 = c.seis - 0.1; const kk = prog(t, c.seis - 0.1, c.seis + 0.15); const A = this.mirar(O.puerta), B = this.mirar(O.m6); [yaw, pitch] = [lerp(A[0], B[0], kk), lerp(A[1], B[1], kk)]; const B2 = this.mirar(O.puerta); yaw = lerp(yaw, B2[0], prog(t, c.igual, c.sesenta - 0.1) * 0.8); desen = Math.sin(Math.PI * kk) * 14; }
    else if (s === 'F') { s0 = c.pongo - 0.1; [yaw, pitch] = this.mirar(O.sala); pitch -= 0.1; }
    else if (s === 'I') { s0 = c.llega - 0.1; [yaw, pitch] = this.mirar(O.sala); pitch -= 0.15; }
    else if (s === 'J') { s0 = c.mesas - 0.1; const kk = prog(t, c.mesas, c.fin - 0.2); const A = this.mirar(O.sala), B = this.mirar(O.m4); [yaw, pitch] = [lerp(A[0], B[0], kk), lerp(A[1], B[1], kk)]; yaw += 0.08 * prog(t, c.fin - 0.3, c.fin); desen = 14 * prog(t, c.fin - 0.3, c.fin); }
    if (s0 && t - s0 < 0.18) desen = Math.max(desen, 14 * (1 - (t - s0) / 0.18));
    const amp = caos ? 2 : 1, temb = (a, b, c2) => (Math.sin(t * a) * 0.006 + Math.sin(t * b + 1) * 0.004 + Math.sin(t * c2 + 2) * 0.003) * amp;
    cam.position.copy(this.ojo).add(new THREE.Vector3(temb(1.3, 2.1, 3.7), temb(1.7, 2.9, 4.1), 0)); cam.rotation.set(pitch + temb(0.9, 1.6, 2.3), yaw + temb(0.7, 1.3, 2.9), 0); cam.up.set(0, 1, 0);
    if (cam.fov !== 62) { cam.fov = 62; cam.updateProjectionMatrix(); } cam.updateMatrixWorld(true); this.desenfoque = desen;
    // tarjeta en la mano (F)
    this.tjMano.visible = s === 'F'; const kt = prog(t, c.pongo - 0.1, c.pongo + 0.25); this.tjMano.position.set(lerp(-0.12, -0.04, kt), lerp(-0.6, -0.28, kt), -0.55); this.tjMano.rotation.set(-0.05, 0.15, 0.05);
    // móvil del dueño (I)
    const oculto = new THREE.Vector3(0.24, -0.62, -0.42), vista = new THREE.Vector3(0.02, -0.055, -0.36);
    let pos = oculto.clone(); if (s === 'I') { pos = oculto.clone().lerp(vista, prog(t, c.llega - 0.1, c.llega + 0.2)); if (entre(t, c.llega, c.llega + 0.5)) pos.x += Math.sin(t * 90) * 0.003; } else if (s === 'J') pos = vista.clone().lerp(oculto, prog(t, c.mesas - 0.1, c.mesas + 0.3));
    pos.y += Math.sin(t * 2.3) * 0.004; this.D.visible = s === 'I' || s === 'J'; this.D.position.copy(pos); this.D.rotation.set(0, 0, 0); this.D.updateMatrixWorld(true); this.colocarBrazo();
    this.mv.userData.pantalla(t > c.llega - 0.05 ? 'pedidoCamarero' : 'bloqueo', t > c.llega - 0.05 ? { mesa: 4, lineas: [['2 × Caña', 'bebida'], ['1 × Patatas bravas', 'comida']], resumen: 'ahora · 3 productos · 11,50 €', confirmado: t > c.aqui + 0.4 } : { hora: '22:15' });
  },
  fx(t) { const c = this.c; let temblor = 0; for (const g of [c.sesenta, c.cero]) { const d = t - g; if (d >= 0 && d < 0.35) temblor = Math.max(temblor, (1 - d / 0.35) * 14); }
    let zoom = 1; { const d = t - c.cero; if (d >= 0) zoom = 1 + 0.06 * (1 - clamp(d / 0.4)); } return { desenfoque: this.desenfoque, temblor, zoom }; },
  capa(t) {
    const c = this.c; velos(); const s = this.seg(t);
    if (t < c.cero) { const n = this.perdido(t), cambios = [c.va + 0.3, c.seis + 0.5, c.sesenta]; const ult = cambios.filter(x => t >= x).pop();
      marcador('PERDIDO ESTE SÁBADO', n ? `−${n} €` : '0 €', '#ff4d5e', ult && t - ult < 0.35 ? rebote(clamp((t - ult) / 0.35)) * 1.1 : 1); }
    else marcador('MESAS QUE SE VAN', '0', '#3ddc84', rebote(clamp((t - c.cero) / 0.35)));
    if (t < 2.35) { pildora('POV: ERES EL DUEÑO', W / 2, 470, 1 - prog(t, 2.1, 2.35), { tono: 'rojo', tam: 40 }); gancho(['¿CUÁNTO PIERDE UN BAR', 'CADA SÁBADO?'], 1 - prog(t, 2.1, 2.35)); }
    // −20 € sobre los que se van
    const etq = (txt, quien, a, b) => { if (!entre(t, a, b) || !quien.g.visible) return; const v = quien.g.position.clone(); v.y = 2.05; etiquetaPlano(txt, v, entra(t, a), 'rojo', 'recibo'); };
    if (['C', 'D'].includes(s)) { etq('−20 €', this.se[0][0], c.va + 0.3, c.seis + 0.2); etq('−20 €', this.se[1][0], c.seis + 0.5, c.sesenta); }
    if (entre(t, c.cansa, c.pongo - 0.1)) pildora('¿Te has ido de un bar por esperar?', W / 2, 1640, entra(t, c.cansa), { icono: 'reloj', tono: 'marca', tam: 44 });
    if (entre(t, c.piden, c.fin)) pildora('Mándaselo a un dueño de bar', W / 2, 1640, entra(t, c.piden), { icono: 'usuario', tono: 'oscuro', tam: 42 });
  },
};

// ---------- POV del dueño v2: historia en tres actos (sábado malo → el lunes → sábado siguiente) y la pareja vuelve ----------
PANT.pedidosLista = (x, w, h, s) => {
  x.fillStyle = '#0a0c16'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,255,255,0.55)'; x.font = `600 24px ${SANS}`; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText('VISAX · Pedidos', 34, 70);
  x.fillStyle = '#fff'; x.font = `600 50px ${SERIF}`; x.fillText(`${s.n || 0} pedidos nuevos`, 34, 150);
  const L = [['Mesa 4', '2 × Caña · 1 × Bravas'], ['Mesa 2', '2 × Caña'], ['Mesa 6', '1 × Patatas bravas'], ['Mesa 1', '2 × Tinto de verano'], ['Mesa 5', '1 × Croquetas']];
  for (let i = 0; i < Math.min(s.n || 0, 5); i++) { const k = (s.n || 0) - 1 - i; const [m, d] = L[k]; const y = 190 + i * 150, nuevo = i === 0;
    x.fillStyle = nuevo ? grad(x, 24, 0, w - 24, 0, [VX.cian, VX.azul, VX.violeta]) : 'rgba(255,255,255,0.07)'; rr(x, 24, y, w - 48, 130, 26); x.fill();
    x.fillStyle = '#fff'; x.font = `900 40px ${SANS}`; x.fillText(m, 52, y + 56); x.font = `600 28px ${SANS}`; x.fillStyle = nuevo ? '#fff' : 'rgba(255,255,255,0.65)'; x.fillText(d, 52, y + 100);
    x.textAlign = 'right'; x.font = `800 24px ${SANS}`; x.fillStyle = nuevo ? VX.amarillo : 'rgba(255,255,255,0.4)'; x.fillText(nuevo ? 'AHORA' : 'hace 1 min', w - 52, y + 56); x.textAlign = 'left'; }
};
V['dueno2'] = { ...V['dueno'],
  async montar() {
    await V['dueno'].montar.call(this);
    ['bar', 'lleno', 'veinte', 'lunes', 'siguiente', 'pareja', 'vuelto'].forEach(w => CLAVES.add(w));
    const r = this; r.cocineroBase = this.cocinero.g.position.clone();
    // el dueño como personaje (se ve en los planos de fuera)
    const d = this.duenoM = muneco({ camisa: '#2b2f3a', pantalon: '#1d1b22', pelo: '#3a2418', peinado: 'corto', piel: '#e3a87f' }); this.mundo.add(d.g);
    const c = this.c = { bar: cue('bar'), lleno: cue('lleno'), pero: cue('pero'), cuatro: cue('cuatro'), veinte: cue('veinte'), esperando: cue('esperando'), va: cue('va'), seis: cue('seis'), igual: cue('igual'), sesenta: cue('sesenta'), puerta: cue('puerta'), noche: cue('noche'),
      lunes: cue('lunes'), pongo: cue('pongo'), tarjeta: cue('tarjeta'), cada: cue('cada'), sab2: cue('sabado', 2), tocan: cue('tocan'), piden: cue('piden'), llega: cue('llega'), aqui: cue('aqui'), mesas: cue('mesas'), cero: cue('cero'), pareja: cue('pareja'), vuelto: cue('vuelto') };
    duracion = palabras[palabras.length - 1].fin + 0.35; c.fin = duracion;
    c.L = c.lunes - 0.12; c.S2 = c.sab2 - 0.12;
    const ph = this.cen[2].clone().add(new THREE.Vector3(0.03, 0.03, 0.06));
    const T = (a, de, a2, mira, mira2, fov = 46, barrido = 0) => ({ a, de, a2, mira, mira2: mira2 || mira, fov, barrido });
    this.tomas = {
      A2: [T(c.lleno - 0.12, [4.8, 3.0, 3.4], [2.2, 3.05, 3.6], [0.0, 0.7, -2.0], [-1.5, 0.7, -2.6], 56)],
      B: [T(c.pero - 0.1, [1.9, 1.6, 0.9], [4.6, 1.55, 1.1], [3.4, 1.2, -0.2], [3.4, 1.25, -0.2], 44)],
      B2: [T(c.veinte - 0.1, [4.45, 1.5, 0.3], [4.15, 1.42, 0.05], [3.4, 1.28, -0.55], [3.4, 1.3, -0.6], 40)],
      C: [T(c.va - 0.15, [3.7, 1.95, -1.9], [3.0, 1.85, -0.7], [3.0, 1.15, 1.0], [1.7, 1.2, 3.6], 52)],
      E: [T(c.sesenta - 0.1, [-0.3, 1.6, 0.9], [0.2, 1.5, 1.7], [1.3, 1.2, 3.4], [1.6, 1.25, 3.9], 50)],
      E2: [T(c.noche - 0.15, [-3.0, 1.75, -4.4], [-3.25, 1.65, -4.95], [-3.45, 1.4, -6.0], [-3.45, 1.4, -6.0], 42)],
      F: [T(c.L, [-4.2, 2.3, 1.6], [3.4, 2.3, 1.6], [-3.6, 0.9, -1.8], [3.8, 0.9, -1.8], 50)],
      F2: [T(c.cada - 0.1, [5.2, 3.0, 3.3], [3.0, 3.05, 3.6], [-0.5, 0.5, -2.0], [-0.8, 0.5, -2.2], 58)],
      G: [T(c.S2, [1.6, 2.2, 3.6], [0.2, 2.9, 1.6], [-1.0, 1.0, -2.5], [-1.6, 1.0, -3.0], 54)],
      H: [T(c.tocan - 0.1, [ph.x + 0.35, ph.y + 0.35, ph.z + 0.95], [ph.x + 0.15, ph.y + 0.22, ph.z + 0.65], ph.toArray(), ph.toArray(), 40)],
      H2: [T(c.piden - 0.1, [ph.x + 0.1, ph.y + 0.06, ph.z + 0.48], [ph.x + 0.04, ph.y + 0.04, ph.z + 0.38], ph.toArray(), ph.toArray(), 36)],
      K: [T(c.pareja - 0.12, [3.7, 1.85, -0.7], [3.25, 1.75, 0.15], [1.7, 1.3, 3.6], [2.2, 1.2, 2.0], 50)],
      K2: [T(c.vuelto - 0.15, [2.0, 1.7, 1.6], [4.7, 1.6, 1.3], [3.4, 1.2, -0.2], [3.4, 1.25, -0.2], 46)],
    };
    // tarjetas: el lunes aparecen al pasar el dueño (de izquierda a derecha)
    this.orden = this.mesas.map((m, i) => [m.x, i]).sort((a, b) => a[0] - b[0]);
    this.popT = []; this.orden.forEach(([x, i], k) => { this.popT[i] = lerp(c.L + 0.25, c.cada + 0.05, k / (this.orden.length - 1)); });
    efectos = [['whoosh', c.lleno - 0.15], ['whoosh', c.pero - 0.12], ['whoosh', c.veinte - 0.12], ['tick', c.veinte + 0.1], ['tick', c.veinte + 0.4], ['whoosh', c.va - 0.18], ['pop', c.va + 0.3], ['whoosh', c.seis - 0.15], ['pop', c.seis + 0.5],
      ['whoosh', c.sesenta - 0.15], ['hit', c.sesenta], ['whoosh', c.noche - 0.18], ['riser', c.L - 1.0], ['whoosh', c.L - 0.05], ...this.popT.map(t => ['pop', t]), ['whoosh', c.cada - 0.12], ['ding', c.cada + 0.3],
      ['whoosh', c.S2 - 0.05], ['whoosh', c.tocan - 0.12], ['tap', c.tocan + 0.2], ['whoosh', c.piden - 0.12], ['tick', c.piden + 0.15], ['pop', c.piden + 0.4], ['whoosh', c.llega - 0.18],
      ...[0, 1, 2, 3, 4].map(k => ['ding', c.llega + k * 0.22]), ['buzz', c.llega], ['whoosh', c.mesas - 0.12], ['hit', c.cero], ['whoosh', c.pareja - 0.15], ['whoosh', c.vuelto - 0.18], ['pop', c.vuelto + 0.3]];
  },
  seg(t) { const c = this.c; const L = [['A', 0], ['A2', c.lleno - 0.12], ['B', c.pero - 0.1], ['B2', c.veinte - 0.1], ['C', c.va - 0.15], ['D', c.seis - 0.1], ['E', c.sesenta - 0.1], ['E2', c.noche - 0.15], ['F', c.L], ['F2', c.cada - 0.1], ['G', c.S2], ['H', c.tocan - 0.1], ['H2', c.piden - 0.1], ['I', c.llega - 0.15], ['J', c.mesas - 0.1], ['K', c.pareja - 0.12], ['K2', c.vuelto - 0.15]];
    let s = 'A'; for (const [n, a] of L) if (t >= a) s = n; return s; },
  perdido(t) { const c = this.c; return t >= c.sesenta ? 60 : t >= c.seis + 0.5 ? 40 : t >= c.va + 0.3 ? 20 : 0; },
  actualizar(t) {
    const c = this.c, s = this.seg(t), fase = t < c.L ? 1 : t < c.S2 ? 2 : 3, caos = fase === 1;
    // gente: sábado 1 con manos arriba, lunes vacío, sábado 2 tranquilo
    this.gente.forEach((p, i) => { if (this.asiento.has(p)) return; p.g.visible = fase !== 2; p.reset(); p.respirar(t, p.g.position.x); if (Math.sin(t * 1.1 + i * 2) > 0.4) p.hablar(t + i, 0.5);
      if (caos && Math.sin(t * 1.6 + i * 1.9) > 0.2) { p.bD.hombro.rotation.x = -2.7; p.bD.hombro.rotation.z = -0.15 + Math.sin(t * 7 + i) * 0.2; }
      if (fase === 3 && t > c.llega) { p.bD.hombro.rotation.x = -1.5 - 0.3 * Math.max(0, Math.sin(t * 5 + i)); p.bD.codo.rotation.x = -0.6; } });
    // parejas: la 4 y la 6 se van el sábado 1; el sábado 2 la 6 está sentada y la 4 vuelve por la puerta
    const pz = [1.6, 3.55]; let abierta = 0;
    const camino = (m, k, x0, z0, kk, entrar) => { const pts = [[x0, z0], [lerp(x0, pz[0], 0.5), 2.2], [pz[0] + (k - 0.5) * 0.3, pz[1]], [pz[0] + (k - 0.5) * 0.3, 4.8]]; if (entrar) pts.reverse();
      const sg = Math.min(2, Math.floor(kk * 3)), f = kk * 3 - sg, P0 = pts[sg], P1 = pts[sg + 1]; m.sentado = false; m.g.position.set(lerp(P0[0], P1[0], f), 0, lerp(P0[1], P1[1], f)); m.g.rotation.y = Math.atan2(P1[0] - P0[0], P1[1] - P0[1]); m.andar(t * 2.2, 1);
      if (m.g.position.z > 3.0) abierta = 1; };
    const salida = [[c.va - 0.3, c.seis + 0.45], [c.seis - 0.05, c.sesenta + 0.6]];
    this.se.forEach((par, j) => par.forEach((m, k) => { const [x0, z0, r0] = this.asiento.get(m); m.reset(); m.g.visible = fase !== 2;
      const sentado = () => { m.sentar(); m.g.position.set(x0, 0, z0); m.g.rotation.y = r0; m.respirar(t, j * 2 + k); };
      if (fase === 1) { const [a, b] = salida[j]; if (t < a) { sentado(); m.cejas.forEach((ce, q) => (ce.rotation.z = (q ? -1 : 1) * 0.3)); m.bI.hombro.rotation.x = -1.0; m.bI.codo.rotation.x = -1.3; if (k === 0 && t > c.veinte - 0.2) { m.bI.hombro.rotation.x = -1.3; m.bI.codo.rotation.x = -1.5; m.cabeza.rotation.x = 0.35; } return; }
        const kk = clamp((t - a - k * 0.12) / (b - a)); camino(m, k, x0, z0, kk, false); m.cejas.forEach((ce, q) => (ce.rotation.z = (q ? -1 : 1) * 0.3)); if (kk >= 1) m.g.visible = false; return; }
      if (fase === 3) { if (j === 1 || t >= c.vuelto - 0.2) { sentado(); if (j === 0) { m.hablar(t + k, 0.6); m.bD.hombro.rotation.x = -2.4 - 0.3 * Math.sin(t * 9 + k); m.bD.hombro.rotation.z = -0.3; } return; }
        if (t < c.pareja - 0.35) { m.g.visible = false; return; } camino(m, k, x0, z0, clamp((t - c.pareja + 0.35 - k * 0.1) / (c.vuelto - c.pareja + 0.15)), true); m.hablar(t, 0.4); } }));
    this._abre = lerp(this._abre ?? 0, abierta, 0.35); if (this.puerta) this.puerta.rotation.y = -1.25 * this._abre;
    // camarero y cocinero
    const k = this.camarero; k.reset(); k.g.visible = fase !== 2; k.bandeja.visible = true;
    if (caos) { const f = (t * 0.33) % 1, ang = f * Math.PI * 2; k.g.position.set(Math.cos(ang) * 2.2 + 0.2, 0, Math.sin(ang) * 1.6 - 1.6); k.g.rotation.y = ang + Math.PI; k.andar(t * 2.6, 1); }
    else { k.g.position.set(1.0, 0, -1.4); k.g.rotation.y = -0.6; k.respirar(t, 2); k.hablar(t, 0.3); }
    k.bI.codo.rotation.x = Math.min(k.bI.codo.rotation.x, -1.45); k.bI.hombro.rotation.x = Math.min(k.bI.hombro.rotation.x, -0.15);
    this.cocinero.reset(); this.cocinero.andar(t * 0.4, 0.3); this.cocinero.g.visible = fase !== 2;
    this.servido.forEach(x => (x.visible = fase === 3 && t > c.llega));
    // el dueño: triste tras la barra, el lunes pone tarjetas, el sábado 2 sonríe
    const d = this.duenoM; d.reset(); d.g.visible = !['A', 'D', 'I', 'J'].includes(s);
    if (fase === 2) { const kx = prog(t, c.L, c.cada + 0.15); d.g.position.set(lerp(-4.3, 4.2, kx), 0, -1.75); d.g.rotation.y = Math.PI / 2; d.andar(t * 2.4, 1);
      if (this.popT.some(p => entre(t, p - 0.12, p + 0.12))) { d.bD.hombro.rotation.x = -1.2; d.bD.hombro.rotation.z = -0.4; } if (t > c.cada) { d.g.rotation.y = 0.2; d.respirar(t, 1); d.bD.hombro.rotation.x = -2.6; d.hablar(t, 0.4); } }
    else { d.g.position.set(-3.45, 0, -6.0); d.g.rotation.y = 0; d.respirar(t, 1);
      if (fase === 1 && t > c.sesenta) { d.cabeza.rotation.x = 0.45; d.bI.hombro.rotation.x = -2.2; d.bI.codo.rotation.x = -1.6; d.bI.hombro.rotation.z = 0.3; }
      if (fase === 3 && t > c.vuelto - 0.2) { d.bD.hombro.rotation.x = -2.6; d.bD.hombro.rotation.z = -0.2 + Math.sin(t * 9) * 0.25; d.hablar(t, 0.5); } }
    // tarjetas
    this.cartas.forEach((tj, i) => { const tp = this.popT[i]; const kk = fase === 1 ? 0 : t < tp ? 0 : rebote(clamp((t - tp) / 0.35)); tj.visible = kk > 0.001; tj.scale.setScalar(0.3 * Math.max(0.001, kk)); });
    const pulso = Math.round((0.5 + 0.5 * Math.sin(t * 8)) * 4) / 4;
    this.pantBarra.userData.pintar('barra', fase === 3 && t > c.llega ? { nuevo: true, mesa: 2, detalle: '2 × Caña', estado: 'NUEVO', pulso } : { nuevo: false });
    this.pantCoc.userData.pintar('cocina', fase === 3 && t > c.llega ? { nuevo: true, mesa: 6, detalle: '1 × Patatas bravas', estado: 'EN MARCHA', pulso } : { nuevo: false });
    const V0 = new THREE.Vector3();
    // ---- planos en 3.ª persona ----
    if (this.tomas[s]) {
      this.D.visible = this.tjMano.visible = false; this.colocarBrazo();
      this.desenfoque = camara2(t, this.tomas[s]); const a0 = this.tomas[s][0].a; if (t - a0 < 0.18) this.desenfoque = Math.max(this.desenfoque, 13 * (1 - (t - a0) / 0.18));
      if (s === 'H' || s === 'H2') { const q = this.cliente2; q.bD.hombro.rotation.set(-1.35, 0, -0.1); q.bD.codo.rotation.x = -0.3; q.g.visible = s === 'H';
        movilEnTarjeta({ mv: this.mv2, on: this.on }, t, this.cartas[2], c.tocan + 0.2, c.tocan - 0.1, c.llega, 'bloqueo', 'cartaV', { hora: '22:15', mesa: 2, sel: t > c.piden + 0.3 ? 2 : t > c.piden + 0.1 ? 1 : 0, enviado: t > c.piden + 0.4 }); }
      else { this.mv2.visible = false; this.on.userData.actualizar(t, 0, V0, V0); }
      return;
    }
    this.mv2.visible = false; this.on.userData.actualizar(t, 0, V0, V0);
    // ---- primera persona (dueño tras la barra) ----
    const O = this.obj; let [yaw, pitch] = this.mirar(O.sala), desen = 0, s0 = 0;
    if (s === 'A') { const kk = prog(t, 0, c.lleno - 0.12); [yaw, pitch] = this.mirar(O.m4); yaw += 0.18 * (1 - kk); pitch -= 0.04 * (1 - kk); }
    else if (s === 'D') { s0 = c.seis - 0.1; const kk = prog(t, c.seis - 0.1, c.seis + 0.15); const A = this.mirar(O.puerta), B = this.mirar(O.m6); [yaw, pitch] = [lerp(A[0], B[0], kk), lerp(A[1], B[1], kk)]; yaw = lerp(yaw, this.mirar(O.puerta)[0], prog(t, c.igual, c.sesenta - 0.1) * 0.8); desen = Math.sin(Math.PI * kk) * 14; }
    else if (s === 'I') { s0 = c.llega - 0.15; [yaw, pitch] = this.mirar(O.sala); pitch -= 0.15; yaw += 0.1 * Math.sin(t * 2); }
    else if (s === 'J') { s0 = c.mesas - 0.1; const kk = prog(t, c.mesas - 0.1, c.pareja - 0.12); const A = this.mirar(O.sala), B = this.mirar(O.m4); [yaw, pitch] = [lerp(A[0], B[0], kk), lerp(A[1], B[1], kk)]; }
    if (s0 && t - s0 < 0.18) desen = Math.max(desen, 14 * (1 - (t - s0) / 0.18));
    const amp = caos ? 2 : 1, temb = (a, b, c2) => (Math.sin(t * a) * 0.006 + Math.sin(t * b + 1) * 0.004 + Math.sin(t * c2 + 2) * 0.003) * amp;
    cam.position.copy(this.ojo).add(new THREE.Vector3(temb(1.3, 2.1, 3.7), temb(1.7, 2.9, 4.1), 0)); cam.rotation.set(pitch + temb(0.9, 1.6, 2.3), yaw + temb(0.7, 1.3, 2.9), 0); cam.up.set(0, 1, 0);
    if (cam.fov !== 62) { cam.fov = 62; cam.updateProjectionMatrix(); } cam.updateMatrixWorld(true); this.desenfoque = desen; this.tjMano.visible = false;
    const oculto = new THREE.Vector3(0.24, -0.62, -0.42), vista = new THREE.Vector3(0.02, -0.055, -0.36);
    let pos = oculto.clone(); if (s === 'I') { pos = oculto.clone().lerp(vista, prog(t, c.llega - 0.15, c.llega + 0.15)); if (entre(t, c.llega, c.llega + 1.1)) pos.x += Math.sin(t * 90) * 0.002; } else if (s === 'J') pos = vista.clone().lerp(oculto, prog(t, c.mesas - 0.1, c.mesas + 0.25));
    pos.y += Math.sin(t * 2.3) * 0.004; this.D.visible = s === 'I' || s === 'J'; this.D.position.copy(pos); this.D.rotation.set(0, 0, 0); this.D.updateMatrixWorld(true); this.colocarBrazo();
    this.mv.userData.pantalla('pedidosLista', { n: t < c.llega ? 0 : Math.min(5, 1 + Math.floor((t - c.llega) / 0.22)) });
  },
  fx(t) { const c = this.c; let temblor = 0; for (const g of [c.sesenta, c.cero]) { const d = t - g; if (d >= 0 && d < 0.35) temblor = Math.max(temblor, (1 - d / 0.35) * 14); }
    let zoom = 1; for (const g of [c.cero, c.L, c.S2]) { const d = t - g; if (d >= 0 && d < 0.45) zoom = Math.max(zoom, 1 + 0.07 * (1 - d / 0.45)); } return { desenfoque: this.desenfoque, temblor, zoom }; },
  capa(t) {
    const c = this.c; velos(); const s = this.seg(t);
    if (t < c.L) { const n = this.perdido(t), cambios = [c.va + 0.3, c.seis + 0.5, c.sesenta]; const ult = cambios.filter(x => t >= x).pop();
      marcador('PERDIDO ESTE SÁBADO', n ? `−${n} €` : '0 €', '#ff4d5e', ult && t - ult < 0.35 ? rebote(clamp((t - ult) / 0.35)) * 1.1 : 1); }
    else if (t >= c.mesas - 0.1) marcador('MESAS QUE SE VAN', t >= c.cero ? '0' : '…', '#3ddc84', t >= c.cero ? rebote(clamp((t - c.cero) / 0.35)) : 1);
    if (t < 2.35) { pildora('POV: ERES EL DUEÑO', W / 2, 470, 1 - prog(t, 2.1, 2.35), { tono: 'rojo', tam: 40 }); gancho(['¿CUÁNTO PIERDE UN BAR', 'CADA SÁBADO?'], 1 - prog(t, 2.1, 2.35)); }
    if (entre(t, c.L, c.L + 1.0)) gancho(['EL LUNES'], entra(t, c.L, 0.25) * (1 - prog(t, c.L + 0.8, c.L + 1.0)));
    if (entre(t, c.S2, c.S2 + 1.0)) gancho(['SÁBADO SIGUIENTE'], entra(t, c.S2, 0.25) * (1 - prog(t, c.S2 + 0.8, c.S2 + 1.0)));
    const etq = (txt, quien, a, b) => { if (!entre(t, a, b) || !quien.g.visible) return; const v = quien.g.position.clone(); v.y = 2.05; etiquetaPlano(txt, v, entra(t, a), 'rojo', 'recibo'); };
    if (['C', 'D'].includes(s)) { etq('−20 €', this.se[0][0], c.va + 0.3, c.seis + 0.3); etq('−20 €', this.se[1][0], c.seis + 0.5, c.sesenta); }
    if (s === 'B2') pildora('20 min esperando', W / 2, 1460, entra(t, c.veinte - 0.05), { icono: 'reloj', tono: 'rojo', tam: 46 });
    if (entre(t, c.pero, c.L - 0.1)) pildora('¿Te has ido de un bar por esperar?', W / 2, 1640, entra(t, c.pero), { icono: 'reloj', tono: 'marca', tam: 44 });
    if (entre(t, c.tocan, c.fin)) pildora('Mándaselo a un dueño de bar', W / 2, 1640, entra(t, c.tocan), { icono: 'usuario', tono: 'oscuro', tam: 42 });
  },
};

// ---------- Así viaja tu pedido: un solo plano continuo tipo dron FPV siguiendo el pedido (bar en miniatura) ----------
function catmull(p0, p1, p2, p3, u) { const u2 = u * u, u3 = u2 * u; return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3); }
function rutaKF(K, t, clave) { let i = 0; while (i < K.length - 2 && t >= K[i + 1].t) i++; const a = K[i], b = K[i + 1], u = ease(clamp((t - a.t) / Math.max(0.001, b.t - a.t)) * 0.5 + 0.25) * 0, uu = clamp((t - a.t) / Math.max(0.001, b.t - a.t));
  const p0 = (K[i - 1] || a)[clave], p3 = (K[i + 2] || b)[clave]; return new THREE.Vector3(...[0, 1, 2].map(j => catmull(p0[j], a[clave][j], b[clave][j], p3[j], uu))); }
function orbe(color = VX.cian) {
  const g = new THREE.Group(); const nucleo = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 16), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })); g.add(nucleo);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBokeh.tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); halo.scale.set(0.9, 0.9, 1); g.add(halo); nucleo.scale.setScalar(1.6);
  const luz = new THREE.PointLight(color, 6, 3, 1.6); g.add(luz); const estela = [];
  for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBokeh.tex, color, transparent: true, opacity: 0.5 * (1 - i / 10), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.scale.setScalar(0.32 * (1 - i / 12)); scene.add(s); estela.push(s); }
  scene.add(g); const hist = [];
  g.userData.poner = (p, vis = true) => { g.position.copy(p); g.visible = vis; hist.unshift(p.clone()); if (hist.length > 40) hist.pop(); estela.forEach((s, i) => { const h = hist[Math.min(hist.length - 1, i * 2 + 1)]; s.position.copy(h || p); s.visible = vis && hist.length > 2; }); };
  return g;
}
V['viaje'] = { ...comunCapa, estilo: 'miniatura',
  async montar() {
    for (const [f, peso, estilo] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-ExtraBold.ttf', '800', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: estilo }); await ff.load(); document.fonts.add(ff); }
    ['pedido', 'tarjeta', 'movil', 'bar', 'pantalla', 'barra', 'canas', 'bravas', 'cocina', 'freidora', 'plato', 'camarero', 'mesa'].forEach(w => CLAVES.add(w));
    scene.background = new THREE.Color('#1a120c'); scene.fog = null; pared.visible = suelo.visible = bokeh.visible = false;
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0; hemi.color.set('#fff1dc'); hemi.groundColor.set('#7a4a2a'); hemi.intensity = 1.35;
    const sol = new THREE.DirectionalLight('#ffe2b8', 1.5); sol.position.set(3, 9, 5); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 }); sol.shadow.bias = -0.0005; scene.add(sol);
    renderer.toneMappingExposure = 1.08;
    const r = construirRestaurante(scene, { pantalla3D, tpv, movil, tarjetaMenu, placaCuadrada }); Object.assign(this, r); r.placa.visible = false; r.mesas[0].gente = [0, 1];
    const p = poblar(r.mundo, r.mesas); Object.assign(this, p); this.cocinero.g.position.set(1.8, 0, -7.75);
    // freidora en la cocina
    const fr = new THREE.Group(); fr.position.set(3.25, 0, -8.15); r.mundo.add(fr);
    { const cuerpoF = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.92, 0.5), new THREE.MeshStandardMaterial({ color: '#b9c0c7', metalness: 0.6, roughness: 0.3 })); cuerpoF.position.y = 0.46; fr.add(cuerpoF); }
    const aceite = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 0.4), new THREE.MeshStandardMaterial({ color: '#e0a83a', roughness: 0.15, emissive: '#5a3200', emissiveIntensity: 0.5 })); aceite.position.y = 0.92; fr.add(aceite);
    this.cesta = new THREE.Group(); const malla = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.26), new THREE.MeshStandardMaterial({ color: '#7a7f86', metalness: 0.7, roughness: 0.4, wireframe: true })); this.cesta.add(malla);
    for (let i = 0; i < 10; i++) { const c = caja(0.045, 0.04, 0.045, i % 3 ? '#e7a64a' : '#d88a2e', 0.012); c.position.set((i % 4 - 1.5) * 0.06, -0.02 + Math.floor(i / 4) * 0.03, (i % 3 - 1) * 0.06); this.cesta.add(c); }
    const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), matJ('#2a2420')); mango.rotation.x = Math.PI / 2; mango.position.set(0, 0.06, 0.25); this.cesta.add(mango); fr.add(this.cesta);
    this.burbujas = [...Array(12)].map(() => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.8 })); fr.add(b); return b; });
    // pedido: cañas en la barra, bravas en el pase, y en la mesa
    this.canasBarra = [cana(), cana()]; this.canasBarra.forEach((c, i) => { c.position.set(-2.55 + i * 0.2, 1.13, -5.15); r.mundo.add(c); });
    this.platoPase = bravas(); this.platoPase.position.set(2.6, 1.05, -6.42); r.mundo.add(this.platoPase);
    this.canasMesa = [cana(), cana()]; this.canasMesa.forEach((c, i) => { c.position.set(-0.05 + i * 0.16, 0.79, -0.05 - i * 0.05); r.mundo.add(c); });
    this.bravasMesa = bravas(); this.bravasMesa.position.set(0.1, 0.79, -0.55); r.mundo.add(this.bravasMesa);
    const k = this.camarero; k.bandeja.children.slice(1).forEach(o => (o.visible = true)); this.bravasBand = bravas(); this.bravasBand.scale.setScalar(0.7); this.bravasBand.position.set(0, 0.012, 0.12); k.bandeja.add(this.bravasBand);
    // móvil del cliente y orbes
    this.mv = movil(); this.mv.scale.setScalar(0.38); r.mundo.add(this.mv); this.on = ondas();
    this.o1 = orbe(VX.cian); this.o2 = orbe('#ffb27a');
    const c = this.c = { tocas: cue('tocas'), mesa: cue('mesa'), sale: cue('sale'), cruza: cue('cruza'), volando: cue('volando'), aparece: cue('aparece'), barra: cue('barra'), dos: cue('dos'), bravas: cue('bravas'), cocina: cue('cocina'),
      freidora: cue('freidora'), plato: cue('plato'), camarero: cue('camarero'), mesa2: cue('mesa', 2), todo: cue('todo'), guardar: cue('guardar'), movil2: cue('movil', 2) };
    duracion = palabras[palabras.length - 1].fin + 0.25; c.fin = duracion;
    const tj = r.tj.userData.centro().clone(); this.tjC = tj; const pB = new THREE.Vector3(-4.7, 1.65, -5.2), pC = new THREE.Vector3(2.8, 2.55, -6.4);
    // keyframes de cámara (posición p, mira l, giro roll)
    const K = this.K = [
      { t: 0, p: [0.35, 1.08, 0.3], l: [tj.x, tj.y, tj.z] },
      { t: c.tocas + 0.4, p: [0.18, 1.0, -0.05], l: [tj.x, tj.y + 0.02, tj.z] },
      { t: c.sale + 0.2, p: [0.1, 1.25, -0.1], l: [tj.x, 1.6, tj.z - 0.3] },
      { t: c.cruza + 0.1, p: [-0.4, 2.3, -0.6], l: [-2.0, 1.9, -3.0], roll: 0.25 },
      { t: c.volando + 0.4, p: [-2.4, 2.25, -2.6], l: [-4.2, 1.7, -4.8], roll: -0.3 },
      { t: c.aparece + 0.3, p: [-4.25, 1.75, -4.15], l: [pB.x, pB.y, pB.z] },
      { t: c.dos - 0.05, p: [-4.15, 1.72, -4.35], l: [pB.x, pB.y - 0.05, pB.z] },
      { t: c.dos + 0.5, p: [-2.5, 1.55, -4.3], l: [-2.45, 1.2, -5.15] },
      { t: c.bravas + 0.2, p: [-1.2, 1.95, -4.4], l: [1.0, 1.8, -6.0], roll: 0.3 },
      { t: c.cocina + 0.25, p: [1.9, 1.7, -5.6], l: [2.8, 1.5, -6.6] },
      { t: c.freidora - 0.1, p: [2.75, 1.55, -7.0], l: [3.2, 1.0, -8.1], roll: -0.15 },
      { t: c.plato - 0.1, p: [3.0, 1.45, -7.55], l: [3.25, 0.95, -8.15] },
      { t: c.camarero - 0.15, p: [2.6, 1.45, -7.1], l: [2.6, 1.1, -6.4] },
      { t: c.camarero + 0.4, p: [3.4, 2.3, -4.5], l: [2.0, 1.0, -4.1], roll: 0.15 },
      { t: c.mesa2 - 0.05, p: [2.0, 2.2, 0.7], l: [0.6, 0.9, -0.4], roll: -0.1 },
      { t: c.todo + 0.1, p: [0.55, 1.2, 0.35], l: [0.0, 0.85, -0.35] },
      { t: c.fin, p: [0.38, 1.08, 0.32], l: [tj.x, tj.y, tj.z] },
    ];
    this.ruta = { pB, pC };
    efectos = [['tap', c.tocas + 0.1], ['ding', c.tocas + 0.3], ['whoosh', c.sale], ['whoosh', c.cruza], ['whoosh', c.volando + 0.3], ['ding', c.aparece + 0.25], ['pop', c.dos + 0.1], ['tick', c.dos + 0.35], ['whoosh', c.bravas], ['whoosh', c.cocina], ['ding', c.cocina + 0.25],
      ['buzz', c.freidora], ['pop', c.plato + 0.1], ['whoosh', c.camarero + 0.1], ['whoosh', c.mesa2 - 0.3], ['pop', c.mesa2 + 0.15], ['tap', c.guardar], ['whoosh', c.fin - 0.25]];
    this.musica = 'guitarra_bar'; this.volMusica = 0.42;
  },
  actualizar(t) {
    const c = this.c, r = this.ruta;
    this.gente.forEach((p, i) => { p.reset(); p.respirar(t, i); if (Math.sin(t * 1.2 + i * 2) > 0.4) p.hablar(t + i, 0.5); });
    this.cocinero.reset(); this.cocinero.respirar(t, 3); if (entre(t, c.freidora - 0.3, c.plato + 0.5)) { this.cocinero.bD.hombro.rotation.x = -1.2; this.cocinero.cabeza.rotation.x = 0.3; }
    // móvil del cliente: toca la tarjeta al principio y se guarda al final
    const tj = this.tjC; const lejos = tj.clone().add(new THREE.Vector3(0.12, -0.05, 0.42)), cerca = tj.clone().add(new THREE.Vector3(0.03, 0.03, 0.06));
    let k = 0; if (t < c.sale + 0.4) k = prog(t, 0.0, c.tocas + 0.1); else if (t > c.todo - 0.2) k = 1 - prog(t, c.guardar - 0.1, c.guardar + 0.5); else k = 0;
    const visMv = t < c.sale + 0.6 || t > c.todo - 0.2; this.mv.visible = visMv; this.mv.position.copy(lejos).lerp(cerca, k); if (t > c.guardar) this.mv.position.y -= prog(t, c.guardar, c.guardar + 0.6) * 0.5; this.mv.rotation.set(-0.1, 0.35, 0);
    this.mv.userData.pantalla(t > c.tocas + 0.3 && t < c.todo ? 'cartaV' : t >= c.todo ? 'cartaV' : 'bloqueo', { hora: '22:15', sel: 2, enviado: t > c.tocas + 0.5 });
    this.on.userData.actualizar(t, entre(t, c.tocas, c.sale) ? 1 : 0, this.mv.localToWorld(new THREE.Vector3(0, 0, -0.05)), tj);
    // orbe 1: del móvil a la pantalla de la barra
    const k1 = prog(t, c.sale, c.aparece + 0.3); const o1 = new THREE.CatmullRomCurve3([cerca.clone().add(new THREE.Vector3(0, 0.1, 0.05)), new THREE.Vector3(-0.3, 2.2, -1.0), new THREE.Vector3(-2.4, 2.1, -2.9), new THREE.Vector3(-3.9, 1.8, -4.6), r.pB.clone().add(new THREE.Vector3(0, 0, 0.08))]);
    this.o1.userData.poner(o1.getPoint(k1), entre(t, c.sale, c.aparece + 0.32));
    // orbe 2: de la barra a la cocina
    const k2 = prog(t, c.bravas, c.cocina + 0.3); const o2 = new THREE.CatmullRomCurve3([r.pB.clone().add(new THREE.Vector3(0.2, 0, 0.1)), new THREE.Vector3(-1.5, 2.2, -4.6), new THREE.Vector3(1.2, 2.0, -5.9), new THREE.Vector3(2.8, 1.6, -6.6), new THREE.Vector3(3.2, 1.2, -7.9)]);
    this.o2.userData.poner(o2.getPoint(k2), entre(t, c.bravas, c.cocina + 0.32));
    // pantallas
    const pulso = Math.round((0.5 + 0.5 * Math.sin(t * 8)) * 4) / 4;
    this.pantBarra.userData.pintar('barra', t > c.aparece + 0.25 ? { nuevo: true, detalle: '2 × Caña', estado: 'NUEVO', pulso } : { nuevo: false });
    this.pantCoc.userData.pintar('cocina', t > c.cocina + 0.2 ? { nuevo: true, detalle: '1 × Patatas bravas', estado: 'EN MARCHA', pulso } : { nuevo: false });
    this.canasBarra.forEach((x, i) => { const kk = t < c.dos + i * 0.12 ? 0 : rebote(clamp((t - c.dos - i * 0.12) / 0.3)); x.visible = kk > 0.01 && t < c.camarero; x.scale.setScalar(Math.max(0.01, kk)); });
    // freidora: burbujas y cesta que sube
    this.burbujas.forEach((b, i) => { const f = (t * 1.7 + i / 12) % 1; b.position.set(((i * 37) % 9 - 4) * 0.045, 0.93 + f * 0.04, ((i * 53) % 7 - 3) * 0.05); b.visible = t < c.plato + 0.3; });
    this.cesta.position.set(0, lerp(0.92, 1.15, prog(t, c.freidora + 0.1, c.plato - 0.05)), 0); this.cesta.rotation.x = -0.2 * prog(t, c.plato - 0.2, c.plato + 0.1);
    this.platoPase.visible = entre(t, c.plato, c.camarero + 0.2); if (this.platoPase.visible) this.platoPase.scale.setScalar(Math.max(0.01, rebote(clamp((t - c.plato) / 0.3))));
    // camarero: recoge en el pase y lleva a la mesa
    const kc = this.camarero; kc.reset(); kc.g.visible = t > c.camarero - 0.5 && t < c.todo + 0.8; kc.bandeja.visible = t < c.mesa2 + 0.1;
    const pts = [[2.6, -5.85], [1.3, -2.4], [0.75, -0.45]]; const kk = prog(t, c.camarero, c.mesa2 - 0.1); const sg = kk < 0.6 ? 0 : 1, f = sg ? (kk - 0.6) / 0.4 : kk / 0.6;
    kc.g.position.set(lerp(pts[sg][0], pts[sg + 1][0], f), 0, lerp(pts[sg][1], pts[sg + 1][1], f));
    if (kk > 0 && kk < 1) { kc.g.rotation.y = Math.atan2(pts[sg + 1][0] - pts[sg][0], pts[sg + 1][1] - pts[sg][1]); kc.andar(t * 2.4, 1); } else if (kk >= 1) { kc.g.rotation.y = -Math.PI / 2; kc.respirar(t, 2); kc.hablar(t, 0.5); } else kc.g.rotation.y = 0;
    kc.bI.codo.rotation.x = Math.min(kc.bI.codo.rotation.x, -1.45); kc.bI.hombro.rotation.x = Math.min(kc.bI.hombro.rotation.x, -0.15);
    this.canasMesa.forEach(x => (x.visible = t > c.mesa2 + 0.05)); this.bravasMesa.visible = t > c.mesa2 + 0.05;
    // cámara continua
    const pos = rutaKF(this.K, t, 'p'), mira = rutaKF(this.K, t, 'l'); let i = 0; while (i < this.K.length - 2 && t >= this.K[i + 1].t) i++;
    const roll = lerp(this.K[i].roll || 0, this.K[i + 1].roll || 0, ease(clamp((t - this.K[i].t) / (this.K[i + 1].t - this.K[i].t))));
    cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(mira); cam.rotateZ(roll); if (cam.fov !== 58) { cam.fov = 58; cam.updateProjectionMatrix(); }
    const vel = this._prev ? pos.distanceTo(this._prev) * 30 : 0; this._prev = pos.clone(); this.desenfoque = clamp((vel - 2.5) * 1.2, 0, 7);
  },
  fx(t) { return { desenfoque: this.desenfoque }; },
  capa(t) {
    const c = this.c; velos();
    gancho(['¿QUÉ PASA CUANDO', 'TOCAS LA TARJETA?'], 1 - prog(t, 2.1, 2.4));
    if (entre(t, c.freidora - 0.2, c.fin)) { const k = entra(t, c.freidora - 0.2); C.save(); C.globalAlpha = clamp(k); C.font = `800 44px Inter, ${FUENTE}`; C.textAlign = 'center'; C.textBaseline = 'middle';
      ['Sígueme si quieres saber más', 'sobre la tecnología NFC'].forEach((l, i) => { const y = 1590 + i * 70, w = C.measureText(l).width + 48; C.fillStyle = 'rgba(11,18,32,0.8)'; rr(C, W / 2 - w / 2, y - 32, w, 64, 18); C.fill(); C.fillStyle = '#fff'; C.fillText(l, W / 2, y + 2); }); C.restore(); }
  },
};

// ---------- Gran Premio del desayuno: el camarero narrado como una carrera de F1 (cafetería, rótulos de tele) ----------
const F1R = '#e10600';
function rotuloTV(txt, X, Y, k, { fondo = 'rgba(12,12,16,0.9)', color = '#fff', tam = 40, acento = F1R, al = 'center' } = {}) {
  if (k <= 0) return; C.save(); C.globalAlpha = clamp(k * 2); C.font = `italic 900 ${tam}px Inter, ${FUENTE}`; const w = C.measureText(txt).width + tam * 1.2, h = tam * 1.6;
  const x0 = al === 'center' ? X - w / 2 : X; C.translate(lerp(-60, 0, ease(clamp(k))), 0);
  C.fillStyle = fondo; C.beginPath(); C.moveTo(x0 + 14, Y - h / 2); C.lineTo(x0 + w, Y - h / 2); C.lineTo(x0 + w - 14, Y + h / 2); C.lineTo(x0, Y + h / 2); C.closePath(); C.fill();
  C.fillStyle = acento; C.fillRect(x0, Y + h / 2 - 6, w - 10, 6); C.fillStyle = color; C.textAlign = 'left'; C.textBaseline = 'middle'; C.fillText(txt, x0 + tam * 0.6, Y + 2); C.restore();
}
function torreF1(filas, k) {
  if (k <= 0) return; C.save(); C.globalAlpha = clamp(k * 2); const X = 26, Y = 400;
  C.fillStyle = 'rgba(12,12,16,0.88)'; rr(C, X, Y, 330, 56 + filas.length * 54, 14); C.fill(); C.fillStyle = F1R; rr(C, X, Y, 330, 50, 14); C.fill();
  C.fillStyle = '#fff'; C.font = `italic 900 26px Inter, ${FUENTE}`; C.textAlign = 'left'; C.textBaseline = 'middle'; C.fillText('CLASIFICACIÓN', X + 18, Y + 26);
  filas.forEach(([pos, nom, col, extra], i) => { const y = Y + 82 + i * 54; C.fillStyle = 'rgba(255,255,255,0.12)'; C.fillRect(X + 12, y - 22, 40, 44); C.fillStyle = '#fff'; C.font = `900 28px Inter, ${FUENTE}`; C.textAlign = 'center'; C.fillText(String(pos), X + 32, y + 1);
    C.fillStyle = col; C.fillRect(X + 60, y - 18, 6, 36); C.textAlign = 'left'; C.fillStyle = '#fff'; C.font = `800 26px Inter, ${FUENTE}`; C.fillText(nom, X + 76, y + 1); if (extra) { C.textAlign = 'right'; C.fillStyle = extra.startsWith('+') ? '#ffd23a' : '#b388ff'; C.fillText(extra, X + 318, y + 1); } });
  C.restore();
}
function semaforo(t, t0, t1) {
  if (t > t1 + 0.25) return; const n = clamp(Math.floor((t - t0) / ((t1 - t0) / 5)) + 1, 0, 5), fuera = t >= t1;
  C.save(); const X0 = W / 2 - 2 * 150, Y = 900; C.fillStyle = 'rgba(10,10,12,0.92)'; rr(C, X0 - 75, Y - 85, 750, 170, 24); C.fill();
  for (let i = 0; i < 5; i++) { C.fillStyle = !fuera && i < n ? F1R : '#2a2a30'; if (!fuera && i < n) { C.shadowColor = F1R; C.shadowBlur = 40; } C.beginPath(); C.arc(X0 + i * 150, Y, 52, 0, 7); C.fill(); C.shadowBlur = 0; }
  C.restore();
}
function banderaCuadros(k) {
  if (k <= 0) return; C.save(); C.globalAlpha = clamp(k * 1.5); const s = 60, ox = (k * 200) % (s * 2);
  for (let y = 0; y < 3; y++) for (let x = -2; x < W / s + 2; x++) { C.fillStyle = (x + y) % 2 ? '#111' : '#fff'; C.fillRect(x * s + ox - s, 1680 + y * s + Math.sin(x * 0.6 + k * 8) * 14, s, s); }
  C.restore();
}
V['f1'] = { ...comunCapa, estilo: 'tele',
  async montar() {
    for (const [f, peso, estilo] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: estilo }); await ff.load(); document.fonts.add(ff); }
    ['camarero', 'boxes', 'cafes', 'barra', 'tostadas', 'libreta', 'box', 'tarjeta', 'pedido', 'segundo', 'vuelta', 'rapida', 'cuatro', 'siete', 'nueve'].forEach(w => CLAVES.add(w));
    scene.background = new THREE.Color('#dfe9f0'); scene.fog = null; pared.visible = suelo.visible = bokeh.visible = false;
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0; hemi.color.set('#ffffff'); hemi.groundColor.set('#b9a58a'); hemi.intensity = 1.75;
    const sol = new THREE.DirectionalLight('#fff4e2', 2.3); sol.position.set(-6, 9, 4); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 34 }); sol.shadow.bias = -0.0005; scene.add(sol);
    renderer.toneMappingExposure = 1.12;
    const r = construirRestaurante(scene, { pantalla3D, tpv, movil, tarjetaMenu, placaCuadrada, tema: 'cafeteria' }); Object.assign(this, r); r.placa.visible = false; r.mesas[0].gente = [0, 1];
    const p = poblar(r.mundo, r.mesas); Object.assign(this, p);
    const pers = (idx, a) => { const m = r.mesas[idx]; return this.gente.find(g => Math.abs(g.g.position.x - m.x) < 0.01 && (a ? g.g.position.z > m.z : g.g.position.z < m.z)); };
    this.manos = [pers(4, 0), pers(1, 0), pers(3, 0)]; this.cliente2 = pers(0, 1);
    // camarero con bandeja de tres cafés y tostadas
    const k = this.camarero; k.bandeja.children.slice(1).forEach(o => (o.visible = false));
    [[-0.09, 0.03], [0.07, -0.05], [0.0, 0.1]].forEach(([x, z]) => { const tz = tazaCafe(); tz.position.set(x, 0.012, z); tz.scale.setScalar(0.85); k.bandeja.add(tz); });
    this.tostB = tostadaTomate(); this.tostB.scale.setScalar(0.6); this.tostB.position.set(0.12, 0.012, 0.06); k.bandeja.add(this.tostB);
    this.libreta = caja(0.14, 0.19, 0.02, '#f4efe2', 0.005); r.mundo.add(this.libreta);
    // rival lento (cliente que va al baño)
    this.rival = muneco({ camisa: '#ffd23a', pantalon: '#2b2f3a', pelo: '#7a3d1d', peinado: 'largo', piel: '#e9b48c' }); r.mundo.add(this.rival.g);
    this.mv = movil(); this.mv.scale.setScalar(0.38); r.mundo.add(this.mv); this.on = ondas();
    const c = this.c = { desayuno: cue('desayuno'), sale: cue('sale'), boxes: cue('boxes'), cafes: cue('cafes'), adelanta: cue('adelanta'), seis: cue('seis'), interior: cue('interior'), curva: cue('curva'), derrape: cue('derrape'), tostadas: cue('tostadas'),
      pero: cue('pero'), cuatro: cue('cuatro'), siete: cue('siete'), nueve: cue('nueve'), levantan: cue('levantan'), cae: cue('cae'), libreta: cue('libreta'), box: cue('box'), ultima: cue('ultima'), tarjeta: cue('tarjeta'), dos: cue('dos'), pedido: cue('pedido'), segundo: cue('segundo'), vuelta2: cue('vuelta', 2), rapida: cue('rapida') };
    duracion = palabras[palabras.length - 1].fin + 0.5; c.fin = duracion;
    // trazado del camarero (x, z) por tramos con tiempo
    this.tramos = [[c.sale - 0.1, c.adelanta, [[-1.7, -4.6], [-1.0, -1.7], [1.5, -1.6]]], [c.adelanta, c.curva, [[1.5, -1.6], [1.9, 1.3], [-1.2, 1.6]]], [c.curva, c.pero, [[-1.2, 1.6], [-1.6, -1.7], [-1.0, -2.0]]], [c.box, c.ultima, [[-0.6, -1.9], [-1.4, -3.4], [-1.7, -4.6]]]];
    const tj = r.tj.userData.centro().clone(); this.tjC = tj;
    const T = (a, de, a2, mira, mira2, fov = 46, barrido = 0.14) => ({ a, de, a2, mira, mira2: mira2 || mira, fov, barrido });
    this.tomas = [
      T(0, [0.0, 3.1, 3.4], [-0.6, 2.6, 1.2], [-1.6, 0.8, -4.4], [-1.7, 0.9, -4.5], 56, 0),
      T(c.sale - 0.1, [1.0, 1.0, -4.4], [1.8, 1.1, -3.2], [-1.6, 1.0, -4.0], [1.2, 1.0, -1.7], 54),
      T(c.adelanta - 0.1, [0.5, 1.6, -2.8], [0.6, 1.6, 0.9], [2.0, 1.0, -1.3], [2.0, 1.0, 1.5], 52),
      { a: c.curva - 0.1, onboard: true, barrido: 0.12, fov: 70, de: [-1.4, 2.1, -1.4], mira: [-1.7, 1.2, -3.2] },
      T(c.pero - 0.1, [0.2, 3.0, 3.2], [0.8, 2.8, 2.6], [0.0, 1.0, -1.4], [0.0, 1.0, -1.4], 60),
      T(c.cuatro - 0.1, [2.6, 1.7, 1.4], [2.8, 1.6, 1.0], [3.4, 1.6, -0.9], [3.4, 1.7, -0.9], 42),
      T(c.siete - 0.1, [-1.4, 1.7, -1.4], [-1.7, 1.6, -1.7], [-2.6, 1.6, -3.6], [-2.6, 1.7, -3.6], 42),
      T(c.nueve - 0.1, [-2.2, 1.7, 1.6], [-2.6, 1.6, 1.3], [-3.6, 1.6, -0.5], [-3.6, 1.7, -0.5], 42),
      T(c.levantan - 0.1, [1.2, 1.5, 0.4], [0.6, 1.4, 0.0], [-1.0, 1.4, -2.0], [-1.0, 1.4, -2.0], 46),
      { a: c.cae - 0.15, sigueLib: true, barrido: 0.12, fov: 44, de: [-0.2, 0.4, -0.9], mira: [-0.6, 0.1, -1.4] },
      T(c.box - 0.1, [-3.6, 1.6, -3.0], [-3.2, 1.6, -3.4], [-1.2, 1.1, -3.2], [-1.7, 1.1, -4.4], 50),
      T(c.ultima - 0.1, [0.9, 1.4, 1.4], [0.6, 1.25, 0.9], [tj.x, tj.y, tj.z], [tj.x, tj.y, tj.z], 44),
      T(c.tarjeta - 0.1, [tj.x + 0.35, tj.y + 0.25, tj.z + 0.75], [tj.x + 0.2, tj.y + 0.15, tj.z + 0.5], tj.toArray(), tj.toArray(), 40),
      T(c.vuelta2 - 0.15, [2.4, 2.9, 3.4], [-2.6, 2.9, 3.4], [0.0, 0.8, -1.2], [0.0, 0.8, -1.2], 58),
    ];
    efectos = [['tick', 0.05], ['tick', 0.27], ['tick', 0.49], ['tick', 0.71], ['tick', 0.93], ['hit', 1.15], ['whoosh', c.sale - 0.15], ['whoosh', c.adelanta - 0.15], ['whoosh', c.curva - 0.15], ['whoosh', c.derrape], ['whoosh', c.pero - 0.15],
      ['pop', c.cuatro], ['pop', c.siete], ['pop', c.nueve], ['whoosh', c.levantan - 0.15], ['whoosh', c.cae - 0.2], ['hit', c.libreta + 0.3], ['buzz', c.box], ['whoosh', c.ultima - 0.15], ['riser', c.tarjeta - 0.6], ['tap', c.pedido], ['ding', c.segundo],
      ['whoosh', c.vuelta2 - 0.2], ['hit', c.rapida], ['ding', c.rapida + 0.1]];
    this.musica = 'guitarra_bar'; this.volMusica = 0.38;
  },
  posCam(t) { for (const [a, b, P] of this.tramos) if (entre(t, a, b)) { const kk = clamp((t - a) / (b - a)), sg = kk < 0.5 ? 0 : 1, f = sg ? (kk - 0.5) * 2 : kk * 2; return [new THREE.Vector3(lerp(P[sg][0], P[sg + 1][0], f), 0, lerp(P[sg][1], P[sg + 1][1], f)), true]; }
    const c = this.c; if (t < c.sale - 0.1) return [new THREE.Vector3(-1.7, 0, -4.6), false]; if (t < c.box) return [new THREE.Vector3(-0.6, 0, -1.9), false]; return [new THREE.Vector3(-1.7, 0, -4.6), false]; },
  actualizar(t) {
    const c = this.c, k = this.camarero;
    this.gente.forEach((p, i) => { p.reset(); p.respirar(t, i); if (Math.sin(t * 1.2 + i * 2) > 0.4) p.hablar(t + i, 0.5); });
    this.manos.forEach((m, i) => { const t0 = [c.cuatro, c.siete, c.nueve][i]; if (entre(t, t0 - 0.05, c.ultima)) { m.bD.hombro.rotation.x = -2.8; m.bD.hombro.rotation.z = -0.15 + Math.sin(t * 9 + i) * 0.3; m.hablar(t, 1); } });
    // camarero
    k.reset(); k.g.visible = true; k.bandeja.visible = t < c.box + 0.2; const [P, corre] = this.posCam(t), [P2] = this.posCam(t + 0.08);
    k.g.position.copy(P); if (corre && P2.distanceTo(P) > 0.001) { k.g.rotation.y = Math.atan2(P2.x - P.x, P2.z - P.z); k.andar(t * 3.2, 1.2); k.raiz.rotation.x = 0.12; }
    else if (t < c.sale - 0.1) { k.g.rotation.y = 0.2; k.respirar(t, 2); k.raiz.position.y -= 0.05; }
    else if (t < c.box) { k.respirar(t, 2); const quien = t > c.nueve ? 2 : t > c.siete ? 1 : t > c.cuatro ? 0 : -1; if (quien >= 0) { const m = this.manos[quien].g.position; k.g.rotation.y = Math.atan2(m.x - P.x, m.z - P.z); } k.hablar(t, 0.6); }
    else { k.g.rotation.y = Math.PI; k.respirar(t, 2); k.cabeza.rotation.x = 0.4; }
    if (entre(t, c.derrape, c.tostadas + 0.5)) { k.raiz.rotation.z = 0.25 * Math.sin(Math.PI * prog(t, c.derrape, c.tostadas + 0.5)); this.tostB.position.x = 0.12 + 0.06 * Math.sin(t * 20); }
    if (k.bandeja.visible) { k.bI.codo.rotation.x = Math.min(k.bI.codo.rotation.x, -1.45); k.bI.hombro.rotation.x = Math.min(k.bI.hombro.rotation.x, -0.15); }
    // libreta: en la mano derecha hasta que se le cae (a cámara lenta)
    k.g.updateMatrixWorld(true); const pm = k.bD.mano.getWorldPosition(new THREE.Vector3());
    if (t < c.cae) { this.libreta.position.copy(pm).add(new THREE.Vector3(0, 0.05, 0.04)); this.libreta.rotation.set(-0.6, k.g.rotation.y, 0); this.libreta.visible = t > c.pero - 0.2; }
    else { const kk = prog(t, c.cae, c.libreta + 0.4); const p0 = this._pm || pm; if (!this._pm) this._pm = pm.clone(); this.libreta.position.set(p0.x - 0.2 * kk, lerp(p0.y, 0.012, kk * kk), p0.z + 0.45 * kk); this.libreta.rotation.set(-0.6 + kk * 2.2, k.g.rotation.y, kk * 3.5); this.libreta.visible = t < c.ultima; }
    // rival al que adelanta
    const rv = this.rival; rv.reset(); rv.g.visible = entre(t, c.sale, c.curva); const kr = prog(t, c.cafes, c.curva + 0.6); rv.g.position.set(lerp(2.25, 2.45, kr), 0, lerp(-1.6, 1.4, kr)); rv.g.rotation.y = 0.05; rv.andar(t * 1.2, 0.6);
    // tarjeta de la mesa dos
    movilEnTarjeta({ mv: this.mv, on: this.on }, t, this.tj, c.pedido, c.tarjeta - 0.15, c.vuelta2 - 0.15, 'bloqueo', 'cartaDesayuno', { hora: '08:47', mesa: 2, sel: 2, enviado: t > c.segundo, totales: ['', '1,30', '3,80'] });
    const q = this.cliente2; if (entre(t, c.tarjeta - 0.2, c.vuelta2)) { q.bD.hombro.rotation.set(-1.35, 0, -0.1); q.bD.codo.rotation.x = -0.3; }
    const pulso = 0.5 + 0.5 * Math.sin(t * 8);
    this.pantBarra.userData.pintar('barra', t > c.segundo ? { nuevo: true, mesa: 2, detalle: '1 × Café con leche', estado: 'NUEVO', pulso } : { nuevo: false });
    // cámara
    let i = 0; for (let n = 0; n < this.tomas.length; n++) if (t >= this.tomas[n].a) i = n; const T0 = this.tomas[i];
    if (T0.onboard) { const [A] = this.posCam(t), [B] = this.posCam(t + 0.25); const dir = B.clone().sub(A); if (dir.length() < 1e-3) dir.set(0, 0, -1); dir.normalize();
      cam.position.copy(A).add(new THREE.Vector3(0, 2.1, 0)).addScaledVector(dir, -0.55); cam.up.set(0, 1, 0); cam.lookAt(A.clone().addScaledVector(dir, 2.0).add(new THREE.Vector3(0, 1.15, 0))); cam.rotateZ(0.3 * Math.sin(Math.PI * prog(t, c.curva, c.pero)));
      if (cam.fov !== T0.fov) { cam.fov = T0.fov; cam.updateProjectionMatrix(); } this.desenfoque = t - T0.a < 0.15 ? 12 * (1 - (t - T0.a) / 0.15) : 1.5; }
    else if (T0.sigueLib) { const L = this.libreta.position; const kk = prog(t, T0.a, c.box); cam.position.set(L.x + 0.55 - 0.15 * kk, Math.max(0.25, L.y + 0.15), L.z + 0.75 - 0.1 * kk); cam.up.set(0, 1, 0); cam.lookAt(L); if (cam.fov !== T0.fov) { cam.fov = T0.fov; cam.updateProjectionMatrix(); } this.desenfoque = 0; }
    else this.desenfoque = camara2(t, this.tomas);
    if (t - T0.a < 0.12 && i > 0) this.desenfoque = Math.max(this.desenfoque, 12);
  },
  fx(t) { const c = this.c; let temblor = 0; for (const g of [1.15, c.libreta + 0.3, c.rapida]) { const d = t - g; if (d >= 0 && d < 0.35) temblor = Math.max(temblor, (1 - d / 0.35) * 14); }
    let zoom = 1; { const d = t - c.rapida; if (d >= 0) zoom = 1 + 0.06 * (1 - clamp(d / 0.5)); } return { desenfoque: this.desenfoque, temblor, zoom }; },
  capa(t) {
    const c = this.c; velos();
    // marcador de vueltas y cartel de salida
    rotuloTV(t >= c.ultima ? 'ÚLTIMA VUELTA' : `VUELTA ${t < c.sale ? 1 : t < c.pero ? 2 : 3}/50`, W - 330, 170, 1, { tam: 34, acento: t >= c.ultima ? '#ffffff' : F1R, al: 'left' });
    if (t < 2.0) { gancho(['GRAN PREMIO', 'DEL DESAYUNO'], 1 - prog(t, 1.8, 2.0)); semaforo(t, 0, 1.15); }
    const pos = t < c.segundo ? [[1, 'CAMARERO', F1R, ''], [2, 'MESA 6', '#3d7fd6', '+2,1'], [3, 'TARJETA NFC', '#7c5cff', '+0,0']] : [[1, 'TARJETA NFC', '#7c5cff', '0:01.0'], [2, 'CAMARERO', F1R, '+14:52']];
    if (entre(t, c.sale, c.pero) || t >= c.ultima) torreF1(pos, entra(t, t >= c.ultima ? c.ultima : c.sale));
    if (entre(t, c.sale + 0.2, c.adelanta)) rotuloTV(`${Math.round(18 + 16 * prog(t, c.sale, c.cafes))} km/h`, 40, 1500, entra(t, c.sale + 0.2), { tam: 54, al: 'left' });
    if (entre(t, c.seis, c.curva - 0.1)) rotuloTV('ADELANTAMIENTO', W / 2, 1500, entra(t, c.seis), { tam: 48 });
    if (entre(t, c.derrape, c.pero - 0.1)) rotuloTV('CÁMARA A BORDO', 40, 1500, entra(t, c.curva), { tam: 40, al: 'left', acento: '#ffd23a' });
    if (entre(t, c.cuatro, c.levantan + 0.3)) { const n = t > c.nueve ? 'MESA 9' : t > c.siete ? 'MESA 7' : 'MESA 4'; rotuloTV(`${n} · MANO ARRIBA`, W / 2, 1500, entra(t, t > c.nueve ? c.nueve : t > c.siete ? c.siete : c.cuatro, 0.2), { tam: 46, acento: '#ffd23a' }); }
    if (entre(t, c.cae - 0.15, c.box - 0.1)) { C.save(); C.fillStyle = 'rgba(0,0,0,0.25)'; C.fillRect(0, 0, W, H); C.restore(); rotuloTV('● REPETICIÓN', 40, 470, 1, { tam: 40, al: 'left' }); }
    if (entre(t, c.box, c.ultima)) rotuloTV('RADIO: “BOX, BOX, BOX”', W / 2, 1500, entra(t, c.box), { tam: 44, acento: '#3ddc84' });
    if (entre(t, c.segundo, c.fin)) rotuloTV('VUELTA RÁPIDA · 0:01.0', W / 2, 1500, entra(t, c.segundo), { tam: 50, fondo: 'rgba(124,92,255,0.95)', acento: '#ffffff' });
    if (t > c.vuelta2 - 0.15) banderaCuadros(prog(t, c.vuelta2 - 0.15, c.fin) * 3);
    if (entre(t, c.ultima, c.fin)) pildora('Etiqueta al camarero más rápido que conozcas', W / 2, 1620, entra(t, c.ultima), { icono: 'usuario', tono: 'oscuro', tam: 34 });
  },
};

// ---------- comunes: el señor de la mano en una mesa con su tarjeta ----------
function senorDeLaMano() { const yo = muneco({ camisa: '#ffffff', chaleco: '#34405e', pantalon: '#34405e', pelo: '#5a4a3a', peinado: 'corto', piel: '#f0c29a' }); yo.sentar(); const corbata = caja(0.06, 0.24, 0.02, '#c0263a', 0.01); corbata.position.set(0, 1.2, 0.19); yo.raiz.add(corbata); return yo; }
function montarMesaSenor(v, r, idx) {
  const m = r.mesas[idx]; v.gente.filter(g => Math.abs(g.g.position.x - m.x) < 0.01).forEach(g => (g.g.visible = false)); v.gente = v.gente.filter(g => g.g.visible);
  const yo = v.yo = senorDeLaMano(); yo.g.position.set(m.x, 0, m.z - 0.72); r.mundo.add(yo.g);
  const tj = v.tjS = tarjetaMenu(); tj.scale.setScalar(0.3); tj.position.set(m.x + 0.24, 0.79, m.z - 0.28); tj.rotation.y = Math.PI - 0.3; r.mundo.add(tj);
  r.mundo.updateMatrixWorld(true); v.cenS = tj.userData.centro().clone(); v.nrmS = new THREE.Vector3(Math.sin(Math.PI - 0.3), 0, Math.cos(Math.PI - 0.3));
  v.phS = v.cenS.clone().addScaledVector(v.nrmS, 0.07).add(new THREE.Vector3(0, 0.02, 0));
  v.mvS = movil(); v.mvS.scale.setScalar(0.38); v.mvS.visible = false; r.mundo.add(v.mvS); v.onS = ondas();
  v.canaS = cana(); v.canaS.position.set(m.x - 0.12, 0.79, m.z - 0.38); v.canaS.visible = false; r.mundo.add(v.canaS);
  v.yoP = [m.x, 1.35, m.z - 0.72]; v.manoP = [m.x + 0.25, 1.75, m.z - 0.62]; v.mS = m;
}
function senorAnim(v, t, manoArriba, cansancio = 1) { const yo = v.yo; yo.reset(); yo.respirar(t, 1); if (manoArriba) { const k = Math.max(0, Math.sin(t * 1.1)) * 0.22 * cansancio; yo.bD.hombro.rotation.x = -2.85 + k; yo.bD.hombro.rotation.z = -0.15; yo.bD.codo.rotation.x = -0.1 - k * 0.6; yo.cejas.forEach((ce, s) => (ce.rotation.z = (s ? -1 : 1) * 0.25)); } }
function movilSenor(v, t, t0, tToque, t1, despues, est) { const vis = entre(t, t0, t1); v.mvS.visible = vis; if (!vis) { v.onS.userData.actualizar(t, 0, new THREE.Vector3(), new THREE.Vector3()); return; }
  const kk = prog(t, t0, tToque); const lejos = v.phS.clone().addScaledVector(v.nrmS, 0.4).add(new THREE.Vector3(0, -0.05, 0)); v.mvS.position.copy(lejos).lerp(v.phS, kk); v.mvS.lookAt(v.mvS.position.clone().add(v.nrmS));
  v.mvS.userData.pantalla(t > tToque + 0.25 ? despues : 'bloqueo', t > tToque + 0.25 ? est : { hora: '22:15' }); v.onS.userData.actualizar(t, entre(t, tToque - 0.05, tToque + 0.7) ? 1 : 0, v.mvS.getWorldPosition(new THREE.Vector3()), v.cenS);
  v.yo.bD.hombro.rotation.set(-1.2, 0, -0.1); v.yo.bD.codo.rotation.x = -0.5; v.yo.cabeza.rotation.x = 0.3; }
function follaje(t, k = 1) { if (k <= 0) return; C.save(); C.globalAlpha = k; C.filter = 'blur(22px)';
  const hojas = [[-60, 260, 260, 140, 0.4], [80, 120, 200, 90, -0.3], [W + 40, 380, 280, 130, 2.6], [W - 60, 1500, 300, 160, 2.2], [-40, 1620, 320, 150, -0.6], [140, 1750, 220, 110, 0.5], [W - 160, 1800, 240, 120, 2.9]];
  hojas.forEach(([x, y, a, b, r], i) => { C.fillStyle = i % 2 ? 'rgba(28,58,22,0.92)' : 'rgba(40,82,30,0.9)'; C.beginPath(); C.ellipse(x + Math.sin(t * 0.8 + i) * 8, y + Math.cos(t * 0.6 + i) * 6, a, b, r, 0, 7); C.fill(); });
  C.restore(); C.filter = 'none'; }
function etiquetaEspecie(lat, sub, k) { if (k <= 0) return; C.save(); C.globalAlpha = clamp(k * 1.6); const X = 70, Y = 1430;
  C.fillStyle = 'rgba(0,0,0,0.35)'; C.fillRect(X - 20, Y - 70, 760, 140); C.fillStyle = '#f3e6c4'; C.fillRect(X, Y - 46, 4, 92);
  C.textAlign = 'left'; C.textBaseline = 'middle'; C.fillStyle = '#ffffff'; C.font = `italic 600 54px Fraunces, Georgia, serif`; C.fillText(lat, X + 26, Y - 12);
  C.fillStyle = 'rgba(243,230,196,0.9)'; C.font = `600 26px Inter, ${FUENTE}`; C.letterSpacing = '3px'; C.fillText(sub.toUpperCase(), X + 28, Y + 38); C.letterSpacing = '0px'; C.restore(); }

// ---------- Documental de naturaleza: «El cliente en su hábitat» (taberna, teleobjetivo, susurro) ----------
V['docu'] = { ...comunCapa, estilo: 'documental',
  async montar() {
    for (const [f, peso, estilo] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-SemiBoldItalic.ttf', '600', 'italic']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: estilo }); await ff.load(); document.fonts.add(ff); }
    ['cliente', 'habitat', 'bar', 'mano', 'camarero', 'especie', 'evolucionado', 'movil', 'tarjeta', 'cana', 'naturaleza'].forEach(w => CLAVES.add(w));
    scene.background = new THREE.Color('#1a120c'); scene.fog = null; pared.visible = suelo.visible = bokeh.visible = false;
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0; hemi.color.set('#fff1dc'); hemi.groundColor.set('#7a4a2a'); hemi.intensity = 1.3;
    const sol = new THREE.DirectionalLight('#ffd9a0', 1.7); sol.position.set(-4, 8, 6); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 }); sol.shadow.bias = -0.0005; scene.add(sol);
    renderer.toneMappingExposure = 1.05;
    const r = construirRestaurante(scene, { pantalla3D, tpv, movil, tarjetaMenu, placaCuadrada, tema: 'taberna' }); Object.assign(this, r); r.placa.visible = false; r.tj.visible = false;
    const p = poblar(r.mundo, r.mesas); Object.assign(this, p); montarMesaSenor(this, r, 3);
    const c = this.c = { cliente: cue('cliente'), habitat: cue('habitat'), bar: cue('bar'), sabado: cue('sabado'), lleva: cue('lleva'), doce: cue('doce'), el: cue('el'), camarero: cue('camarero'), pasa: cue('pasa'), sin: cue('sin'), pero: cue('pero'),
      acerca: cue('acerca'), tarjeta: cue('tarjeta'), pide: cue('pide'), treinta: cue('treinta'), despues: cue('despues'), cana: cue('cana'), la3: cue('naturaleza') - 0.1, naturaleza: cue('naturaleza'), sabia: cue('sabia') };
    duracion = palabras[palabras.length - 1].fin + 0.3; c.fin = duracion;
    const m = this.mS, yoP = this.yoP, mano = this.manoP, P = this.phS, n = this.nrmS, cen = this.cenS, fr = (v, d) => [v.x + d[0], v.y + d[1], v.z + d[2]];
    const T = (a, de, a2, mira, mira2, fov, barrido = 0) => ({ a, de, a2, mira, mira2: mira2 || mira, fov, barrido });
    this.tomas = [
      T(0, [0.6, 1.5, 4.6], [0.2, 1.48, 4.2], yoP, [m.x, 1.45, m.z - 0.72], 14),
      T(c.habitat - 0.3, [3.5, 3.0, 3.6], [2.0, 3.0, 3.6], [-1.0, 0.8, -2.0], [-1.8, 0.8, -2.2], 48),
      T(c.lleva - 0.2, [m.x + 0.9, 0.95, m.z + 1.4], [m.x + 0.75, 1.05, m.z + 1.2], [m.x + 0.2, 1.6, m.z - 0.6], mano, 28),
      T(c.el - 0.15, [1.5, 1.4, 5.0], [1.2, 1.4, 5.0], [-2.6, 1.2, 1.2], [-4.6, 1.2, 1.2], 20),
      T(c.pero - 0.2, [m.x + 0.5, 1.45, m.z + 2.0], [m.x + 0.25, 1.42, m.z + 1.1], yoP, yoP, 22),
      T(c.acerca - 0.15, fr(cen, [0.75, 0.45, -0.95]), fr(cen, [0.55, 0.32, -0.75]), cen.toArray(), cen.toArray(), 30),
      T(c.pide - 0.15, fr(P, [n.x * 0.62 + 0.12, 0.14, n.z * 0.62]), fr(P, [n.x * 0.5, 0.1, n.z * 0.5 - 0.06]), P.toArray(), P.toArray(), 32),
      T(c.treinta - 0.15, [0.4, 1.5, 4.2], [0.1, 1.48, 3.9], [m.x + 0.3, 1.1, m.z], [m.x, 1.1, m.z - 0.2], 16),
      T(c.cana - 0.2, [m.x + 0.55, 1.05, m.z + 0.6], [m.x + 0.4, 1.0, m.z + 0.45], [m.x - 0.12, 0.88, m.z - 0.38], [m.x - 0.12, 0.88, m.z - 0.38], 30),
      T(c.la3 - 0.05, [m.x + 1.2, 1.6, m.z + 2.0], [m.x + 2.2, 2.2, m.z + 3.4], yoP, yoP, 34),
    ];
    efectos = [['whoosh', c.habitat - 0.35], ['whoosh', c.el - 0.2], ['tap', c.tarjeta + 0.05], ['ding', c.tarjeta + 0.35], ['tick', c.pide + 0.3], ['pop', c.cana + 0.05], ['ding', c.cana + 0.15]];
    this.musica = 'ambient_b'; this.volMusica = 0.5;
  },
  actualizar(t) {
    const c = this.c, k = this.camarero;
    this.gente.forEach((g, i) => { g.reset(); g.respirar(t, i); if (Math.sin(t * 1.0 + i * 2) > 0.4) g.hablar(t + i, 0.4); });
    const arriba = t < c.pero + 0.6; senorAnim(this, t, arriba);
    if (!arriba) { this.yo.cabeza.rotation.x = 0.25; this.yo.cabeza.rotation.y = 0.2; }
    movilSenor(this, t, c.acerca - 0.2, c.tarjeta, c.treinta, 'cartaV', { mesa: 3, sel: t > c.pide + 0.3 ? 2 : 1, enviado: t > c.pide + 0.6 }); this.yo.g.visible = !entre(t, c.pide - 0.15, c.treinta - 0.15);
    if (t > c.cana) { this.yo.bD.hombro.rotation.x = -1.4 - 0.2 * prog(t, c.naturaleza, c.fin); this.yo.bD.codo.rotation.x = -0.9; this.yo.hablar(t, 0.15); }
    this.canaS.visible = t > c.cana - 0.1;
    // camarero: pasa sin mirar y luego trae la caña
    k.reset(); k.g.visible = true; k.bandeja.visible = false;
    if (entre(t, c.el - 0.2, c.pero - 0.2)) { const kk = prog(t, c.el - 0.2, c.pero - 0.2); k.g.position.set(lerp(-0.8, -6.0, kk), 0, 1.25); k.g.rotation.y = -Math.PI / 2; k.andar(t * 1.6, 1); k.cabeza.rotation.y = -0.9; }
    else if (entre(t, c.treinta - 0.2, c.la3)) { const m = this.mS; const kk = prog(t, c.treinta - 0.2, c.cana - 0.3); k.g.position.set(lerp(-1.2, m.x + 0.55, kk), 0, lerp(1.6, m.z - 0.6, kk)); k.bandeja.visible = t < c.cana - 0.1;
      if (kk < 1) { k.g.rotation.y = Math.atan2(m.x + 0.55 + 1.2, m.z - 0.6 - 1.6); k.andar(t * 1.6, 1); } else { k.g.rotation.y = -Math.PI / 2; k.respirar(t, 2); k.bD.hombro.rotation.x = -1.0; } }
    else k.g.visible = false;
    if (k.bandeja.visible) { k.bI.codo.rotation.x = Math.min(k.bI.codo.rotation.x, -1.45); k.bI.hombro.rotation.x = Math.min(k.bI.hombro.rotation.x, -0.15); }
    this.cocinero.reset(); this.cocinero.respirar(t, 4);
    this.desenfoque = camara2(t, this.tomas); const sh = Math.sin(t * 1.3) * 0.002; cam.position.y += sh;
  },
  fx(t) { return { desenfoque: this.desenfoque }; },
  capa(t) {
    const c = this.c;
    const tele = t < c.habitat - 0.3 || entre(t, c.el - 0.15, c.pero - 0.2) || entre(t, c.treinta - 0.15, c.cana - 0.2);
    follaje(t, tele ? 1 : 0);
    velos();
    gancho(['EL CLIENTE DE BAR', 'EN SU HÁBITAT NATURAL'], 1 - prog(t, 2.2, 2.5));
    if (entre(t, 0.5, c.lleva - 0.25)) etiquetaEspecie('Cliens sedientus', 'Cliente común · Hábitat: bar', prog(t, 0.5, 0.9));
    if (entre(t, c.doce, c.el - 0.2)) etiquetaEspecie('12 minutos', 'Récord de la especie: 47 min', prog(t, c.doce, c.doce + 0.4));
    if (entre(t, c.camarero, c.pero - 0.25)) etiquetaEspecie('Camarerus esquivus', 'Depredador · Visión selectiva', prog(t, c.camarero, c.camarero + 0.4));
    if (entre(t, c.pero, c.acerca - 0.2)) etiquetaEspecie('Cliens tecnologicus', 'Subespecie evolucionada', prog(t, c.pero + 0.3, c.pero + 0.7));
    if (entre(t, c.treinta, c.la3)) etiquetaEspecie('30 segundos', 'Tiempo de alimentación', prog(t, c.treinta, c.treinta + 0.4));
    if (entre(t, c.la3, c.fin)) pildora('Etiqueta a un «cliens sedientus»', W / 2, 1640, entra(t, c.la3), { icono: 'usuario', tono: 'oscuro', tam: 40 });
  },
};

// ---------- Tráiler de película: «LA MANO LEVANTADA» (bar moderno de noche, bandas de cine, rótulos) ----------
function cartelCine(lineas, k, { tam = 120, sub = null, brillo = false } = {}) {
  if (k <= 0) return; C.save(); C.fillStyle = `rgba(0,0,0,${clamp(k * 1.5)})`; C.fillRect(0, 0, W, H); C.globalAlpha = clamp(k * 1.5); const s = lerp(1.08, 1.0, ease(clamp(k)));
  C.translate(W / 2, H / 2); C.scale(s, s); C.textAlign = 'center'; C.textBaseline = 'middle'; C.font = `800 ${tam}px Fraunces, Georgia, serif`;
  if (brillo) { C.shadowColor = '#ffb46a'; C.shadowBlur = 50; }
  lineas.forEach((l, i) => { const y = (i - (lineas.length - 1) / 2) * tam * 1.12; const g = C.createLinearGradient(0, y - tam / 2, 0, y + tam / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(1, brillo ? '#f0c27a' : '#cfd6e0'); C.fillStyle = g; C.fillText(l, 0, y); });
  C.shadowBlur = 0; if (sub) { C.font = `600 34px Inter, ${FUENTE}`; C.letterSpacing = '8px'; C.fillStyle = 'rgba(255,255,255,0.75)'; C.fillText(sub, 0, lineas.length * tam * 0.62 + 40); C.letterSpacing = '0px'; }
  C.restore(); }
V['trailer'] = { ...comunCapa, estilo: 'cine',
  async montar() {
    for (const [f, peso, estilo] of [['Fraunces-SemiBold.ttf', '600', 'normal'], ['Fraunces-ExtraBold.ttf', '800', 'normal']]) { const ff = new FontFace('Fraunces', `url(./fuentes/${f})`, { weight: peso, style: estilo }); await ff.load(); document.fonts.add(ff); }
    scene.background = new THREE.Color('#06080b'); scene.fog = new THREE.Fog('#0a0d12', 6, 18); pared.visible = suelo.visible = bokeh.visible = false;
    foco.intensity = relleno.intensity = lampara.intensity = contra.intensity = 0; hemi.color.set('#9fb6d6'); hemi.groundColor.set('#2a2018'); hemi.intensity = 1.05;
    const sol = new THREE.DirectionalLight('#ffb070', 1.6); sol.position.set(-6, 5, -2); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 }); sol.shadow.bias = -0.0005; scene.add(sol);
    const contraluz = new THREE.SpotLight('#ffd9a8', 60, 14, 0.5, 0.6, 1.4); contraluz.position.set(-3.6, 3.2, -3.0); contraluz.target.position.set(-3.6, 0.8, 0.0); scene.add(contraluz, contraluz.target);
    renderer.toneMappingExposure = 1.3;
    const r = construirRestaurante(scene, { pantalla3D, tpv, movil, tarjetaMenu, placaCuadrada, tema: 'moderno' }); Object.assign(this, r); r.placa.visible = false; r.tj.visible = false;
    const p = poblar(r.mundo, r.mesas); Object.assign(this, p); montarMesaSenor(this, r, 3);
    this.halo = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 48), new THREE.MeshBasicMaterial({ color: '#ffd9a8', transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false })); r.mundo.add(this.halo);
    const c = this.c = { mundo: cue('mundo'), donde: cue('donde'), camareros: cue('camareros'), hombre: cue('hombre'), levanto: cue('levanto'), mano: cue('mano'), veinte: cue('veinte'), cuarenta: cue('cuarenta'), una: cue('una'), hora: cue('hora'), nadie: cue('nadie'),
      hasta: cue('hasta'), descubrio: cue('descubrio'), tarjeta: cue('tarjeta'), este: cue('este'), espera: cue('espera'), termina: cue('termina'), mano2: cue('mano', 2), levantada: cue('levantada'), proximamente: cue('proximamente'), bar: cue('bar') };
    duracion = palabras[palabras.length - 1].fin + 0.5; c.fin = duracion;
    const m = this.mS, yoP = this.yoP, mano = this.manoP, cen = this.cenS, P = this.phS, n = this.nrmS, fr = (v, d) => [v.x + d[0], v.y + d[1], v.z + d[2]];
    const T = (a, de, a2, mira, mira2, fov = 38, barrido = 0) => ({ a, de, a2, mira, mira2: mira2 || mira, fov, barrido });
    const mont = c.este - 0.1, paso = (c.mano2 - 0.25 - mont) / 6;
    this.tomas = [
      T(0, [0.5, 1.7, 3.2], [0.2, 1.65, 2.6], [-1.0, 1.2, -1.5], [-1.4, 1.2, -1.8], 40),
      T(c.donde - 0.1, [-1.0, 0.55, 2.2], [-0.4, 0.6, 2.0], [-2.0, 1.4, 0.9], [0.4, 1.4, 0.9], 34),
      T(c.hombre - 0.15, [m.x + 1.4, 1.35, m.z + 1.6], [m.x + 0.8, 1.35, m.z + 0.9], yoP, yoP, 30),
      T(c.levanto - 0.15, [m.x + 0.55, 0.7, m.z + 0.5], [m.x + 0.45, 0.8, m.z + 0.35], [m.x + 0.2, 1.4, m.z - 0.6], mano, 40),
      T(c.veinte + 0.35, [m.x + 0.6, 1.45, m.z + 0.5], [m.x + 0.5, 1.42, m.z + 0.35], yoP, yoP, 30),
      T(c.cuarenta + 0.35, [m.x - 1.2, 1.9, m.z + 1.8], [m.x - 1.0, 1.85, m.z + 1.5], yoP, yoP, 30),
      T(c.hora + 0.35, [m.x + 0.4, 1.6, m.z + 0.55], [m.x + 0.32, 1.58, m.z + 0.42], [m.x + 0.2, 1.65, m.z - 0.6], mano, 34),
      T(c.nadie - 0.1, [1.6, 1.1, 3.4], [1.6, 1.15, 2.6], [1.4, 1.0, -4.0], [1.4, 1.0, -4.0], 34),
      T(c.hasta - 0.15, fr(cen, [1.1, 0.45, -1.6]), fr(cen, [0.55, 0.25, -0.8]), cen.toArray(), cen.toArray(), 30),
      T(c.tarjeta - 0.1, fr(cen, [0.3, 0.1, -0.45]), fr(cen, [0.22, 0.06, -0.35]), cen.toArray(), cen.toArray(), 30),
      T(mont, fr(P, [n.x * 0.55 + 0.1, 0.12, n.z * 0.55]), fr(P, [n.x * 0.45, 0.08, n.z * 0.45]), P.toArray(), P.toArray(), 34),
      T(mont + paso, [-3.8, 2.1, -3.4], [-4.0, 2.0, -3.8], [-4.7, 1.62, -5.25], [-4.7, 1.62, -5.25], 36),
      T(mont + paso * 2, [-0.6, 0.6, -0.6], [-1.4, 0.6, -0.2], [-2.4, 1.1, 0.4], [-3.0, 1.1, 0.3], 44),
      T(mont + paso * 3, [m.x + 0.55, 1.05, m.z + 0.6], [m.x + 0.4, 1.0, m.z + 0.45], [m.x - 0.12, 0.88, m.z - 0.38], [m.x - 0.12, 0.88, m.z - 0.38], 32),
      T(mont + paso * 4, [m.x + 0.6, 1.45, m.z + 0.5], [m.x + 0.45, 1.42, m.z + 0.3], yoP, yoP, 30),
      T(mont + paso * 5, [3.0, 2.6, 3.4], [1.0, 3.0, 3.6], [-2.0, 0.8, -1.0], [-2.6, 0.8, -1.2], 46),
    ];
    this.mont = mont; this.paso = paso;
    efectos = [['riser', c.mundo - 0.2], ['hit', c.hombre], ['hit', c.mano + 0.1], ['hit', c.veinte], ['tick', c.veinte + 0.4], ['hit', c.cuarenta], ['tick', c.cuarenta + 0.4], ['hit', c.hora], ['whoosh', c.nadie - 0.15], ['riser', c.hasta],
      ['hit', c.tarjeta + 0.05], ['ding', c.tarjeta + 0.15], ...[0, 1, 2, 3, 4, 5].map(i => ['whoosh', mont + paso * i]), ['tap', mont + 0.1], ['hit', c.mano2 - 0.25], ['riser', c.levantada + 0.3], ['hit', c.proximamente - 0.05]];
    this.musica = 'ambient_b'; this.volMusica = 0.55;
  },
  actualizar(t) {
    const c = this.c, k = this.camarero, mont = this.mont, paso = this.paso;
    this.gente.forEach((g, i) => { g.reset(); g.respirar(t, i); });
    const resuelto = t > mont; senorAnim(this, t, !resuelto && t > c.levanto - 0.1, 1.6);
    if (entre(t, c.levanto - 0.1, c.mano + 0.2)) { const kk = prog(t, c.levanto - 0.1, c.mano + 0.2); this.yo.bD.hombro.rotation.x = lerp(-0.2, -2.85, kk); this.yo.bD.codo.rotation.x = lerp(-0.4, -0.1, kk); }
    if (resuelto) { this.yo.bD.hombro.rotation.x = -1.4; this.yo.bD.codo.rotation.x = -0.9; this.yo.hablar(t, 0.2); }
    movilSenor(this, t, mont - 0.2, mont + 0.15, mont + paso, 'cartaV', { mesa: 3, sel: 2, enviado: t > mont + 0.3 });
    this.canaS.visible = t > mont + paso * 3 - 0.05;
    // camarero: pasa a cámara lenta y luego corre con la caña
    k.reset(); k.g.visible = true; k.bandeja.visible = false;
    if (entre(t, c.donde - 0.2, c.hombre)) { const kk = prog(t, c.donde - 0.2, c.hombre); k.g.position.set(lerp(-2.4, 0.6, kk), 0, 0.9); k.g.rotation.y = Math.PI / 2; k.andar(t * 0.7, 0.8); k.cabeza.rotation.y = 0.6; }
    else if (entre(t, mont + paso * 2, mont + paso * 3)) { const kk = prog(t, mont + paso * 2, mont + paso * 3); k.g.position.set(lerp(-1.2, -3.0, kk), 0, lerp(0.6, 0.15, kk)); k.g.rotation.y = -1.8; k.andar(t * 3, 1.2); k.bandeja.visible = true; }
    else k.g.visible = false;
    if (k.bandeja.visible) { k.bI.codo.rotation.x = Math.min(k.bI.codo.rotation.x, -1.45); k.bI.hombro.rotation.x = Math.min(k.bI.hombro.rotation.x, -0.15); }
    // la tarjeta brilla al descubrirla
    this.halo.position.copy(this.cenS).addScaledVector(this.nrmS, 0.02); this.halo.lookAt(this.halo.position.clone().add(this.nrmS)); const kh = entre(t, c.hasta, mont) ? prog(t, c.hasta, c.tarjeta) : 0; this.halo.material.opacity = 0.8 * kh; this.halo.scale.setScalar(1 + 0.2 * Math.sin(t * 5));
    const pulso = 0.5 + 0.5 * Math.sin(t * 8); this.pantBarra.userData.pintar('barra', t > mont + paso ? { nuevo: true, mesa: 3, detalle: '1 × Caña', estado: 'NUEVO', pulso } : { nuevo: false });
    this.desenfoque = camara2(t, this.tomas) * 0.5; cam.position.x += Math.sin(t * 0.9) * 0.004; cam.position.y += Math.sin(t * 1.3) * 0.003;
  },
  fx(t) { const c = this.c; let temblor = 0; for (const g of [c.hombre, c.veinte, c.cuarenta, c.hora, c.tarjeta, c.mano2 - 0.25]) { const d = t - g; if (d >= 0 && d < 0.3) temblor = Math.max(temblor, (1 - d / 0.3) * 10); } return { desenfoque: this.desenfoque, temblor }; },
  capa(t) {
    const c = this.c;
    // etalonaje frío/cálido
    C.save(); C.globalCompositeOperation = 'soft-light'; const g = C.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(20,90,120,0.55)'); g.addColorStop(0.6, 'rgba(20,60,90,0.2)'); g.addColorStop(1, 'rgba(255,140,40,0.45)'); C.fillStyle = g; C.fillRect(0, 0, W, H); C.restore();
    vineta();
    // rótulos de tráiler
    const card = (a, b, lineas, op = {}) => { if (entre(t, a, b)) cartelCine(lineas, Math.min(prog(t, a, a + 0.15), 1 - prog(t, b - 0.12, b)), op); };
    card(0, c.donde - 0.1, ['EN UN', 'MUNDO…'], { tam: 130 });
    card(c.veinte - 0.05, c.veinte + 0.35, ['20 MIN'], { tam: 190 });
    card(c.cuarenta - 0.05, c.cuarenta + 0.35, ['40 MIN'], { tam: 190 });
    card(c.una - 0.05, c.hora + 0.35, ['1 HORA'], { tam: 190 });
    card(c.este - 0.35, c.este - 0.1, ['ESTE SÁBADO'], { tam: 110 });
    card(c.mano2 - 0.25, c.proximamente - 0.15, ['LA MANO', 'LEVANTADA'], { tam: 150, brillo: true, sub: 'BASADO EN HECHOS REALES' });
    card(c.proximamente - 0.15, c.fin, ['PRÓXIMAMENTE'], { tam: 104, sub: 'EN TU BAR' });
    // bandas de cine
    C.fillStyle = '#000'; C.fillRect(0, 0, W, 250); C.fillRect(0, H - 250, W, 250);
  },
};

// ---------- API para render.mjs ----------
let actual = null;
window.init = async (id, pal, dur) => {
  palabras = pal || []; duracion = dur || 0; efectos = [];
  cue = (p, n = 1) => { const q = norm(p); let k = 0; for (const w of palabras) if (norm(w.p) === q && ++k === n) return w.t; console.warn('cue no encontrado', p, n); return 9999; };
  prepararSubtitulos(palabras); actual = V[id]; await actual.montar();
  const saltar = new Set(); const mete = o => { if (o && o.isObject3D) saltar.add(o); };
  for (const v of Object.values(actual)) { if (Array.isArray(v)) v.forEach(mete); else mete(v); }
  for (const m of Object.values(actual.mesas || {})) mete(m.tj);
  ESTILO = aplicarEstilo(Q.get('estilo') || actual.estilo || 'bar', { scene, mundo, saltar, renderer });
  return { duracion, efectos, musica: actual.musica || null, ambiente: actual.ambiente || null, volMusica: actual.volMusica, volAmbiente: actual.volAmbiente };
};
function componer(t) {
  const fx = actual.fx ? actual.fx(t) : {};
  C.clearRect(0, 0, W, H); C.fillStyle = '#000'; C.fillRect(0, 0, W, H);
  const z = fx.zoom || 1, dx = fx.temblor ? Math.sin(t * 97) * fx.temblor : 0, dy = fx.temblor ? Math.cos(t * 83) * fx.temblor : 0;
  C.save(); C.translate(W / 2 + dx, H / 2 + dy); C.scale(z, z); dibujar3D(C, renderer.domElement, W, H, ESTILO, fx.desenfoque > 0.5 ? `blur(${fx.desenfoque.toFixed(1)}px)` : ''); C.restore(); C.filter = 'none';
  vineta();
  if (fx.flash) { C.fillStyle = `rgba(255,255,255,${fx.flash})`; C.fillRect(0, 0, W, H); }
  actual.capa(t);
  if (actual.arriba) { if (t < (actual.c?.comenta ?? 1e9)) (actual.subtitulos || subtitulosArriba)(t); } else subtitulos(t);
  // marcaAgua(); (quitada: se veía demasiado comercial)
}
window.frame = (t) => {
  actual.actualizar(t); if (actual.renderizar) actual.renderizar(); else renderer.render(scene, cam); componer(t);
  return salida.toDataURL('image/jpeg', 0.92);
};
window.listo = true;
