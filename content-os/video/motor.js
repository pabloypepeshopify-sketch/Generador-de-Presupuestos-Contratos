// Motor 3D de los vídeos VISAX NFC: escena de bar, tarjetas, móvil, ondas NFC, antena, cocina y personajes.
// Se renderiza fotograma a fotograma (window.frame(t)) desde render.mjs. 1080×1920, vertical.
import * as THREE from 'three';

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
scene.add(new THREE.HemisphereLight('#9fb2ff', '#3a2414', 0.9));
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
  g.userData.pantalla = (nueva, pulso) => ui.pintar(`${nueva}|${Math.round(pulso * 10)}`, (x, w, h) => {
    x.fillStyle = '#0f1424'; x.fillRect(0, 0, w, h); texto(x, 'PEDIDOS', 30, 40, 32, '#9aa4c7', 800, 'left');
    const tickets = [['Mesa 2', '1× Calamares'], ['Mesa 9', '2× Caña']]; if (nueva) tickets.unshift(['MESA 4', '2× Bravas · 1× Croquetas']);
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
    if (/[.,?!…:]$/.test(p.p) || a.length >= 3 || !sig || sig.t - p.fin > 0.35) { trozos.push(a); a = []; }
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

// ---------- API para render.mjs ----------
let actual = null;
window.init = (id, pal, dur) => {
  palabras = pal || []; duracion = dur || 0; efectos = [];
  cue = (p, n = 1) => { const q = norm(p); let k = 0; for (const w of palabras) if (norm(w.p) === q && ++k === n) return w.t; console.warn('cue no encontrado', p, n); return 9999; };
  prepararSubtitulos(palabras); actual = V[id]; actual.montar();
  return { duracion, efectos };
};
window.medir = (t) => { const a = performance.now(); actual.actualizar(t); renderer.render(scene, cam); renderer.getContext().finish(); const b = performance.now();
  C.drawImage(renderer.domElement, 0, 0, W, H); vineta(); actual.capa(t); subtitulos(t); const c = performance.now(); salida.toDataURL('image/jpeg', 0.92); return { render3d: b - a, capa2d: c - b, jpeg: performance.now() - c }; };
window.frame = (t) => {
  actual.actualizar(t); renderer.render(scene, cam);
  C.clearRect(0, 0, W, H); C.drawImage(renderer.domElement, 0, 0, W, H); vineta();
  actual.capa(t); subtitulos(t); marcaAgua();
  return salida.toDataURL('image/jpeg', 0.92);
};
window.listo = true;
