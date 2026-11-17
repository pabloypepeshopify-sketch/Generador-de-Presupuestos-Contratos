// Mundo "juguete": restaurante y muñecos redondeados hechos con primitivas (sin modelos externos).
// Pensado para vídeos en primera persona: manos del protagonista pegadas a la cámara.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const M = new Map();
export const mat = (c, r = 0.7, extra = {}) => { const k = c + r + JSON.stringify(extra); if (!M.has(k)) M.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra })); return M.get(k); };
const sombra = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
export function caja(w, h, d, c, r = 0.04, rough = 0.7) {
  const rad = Math.max(0.001, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rad), mat(c, rough));
}
const cil = (rt, rb, h, c, seg = 32) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c));
const esf = (r, c, rough = 0.6) => new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat(c, rough));
const cap = (r, l, c) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 8, 16), mat(c));
const en = (o, x, y, z) => { o.position.set(x, y, z); return o; };

function lienzoTex(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

// ---------- muñeco ----------
export function muneco(o = {}) {
  const { piel = '#f2c49b', camisa = '#e85d4a', pantalon = '#2f3a56', pelo = '#3a2418', peinado = 'corto', chaleco = null, delantal = null, pajarita = null, gorro = null, zapato = '#2a1d17' } = o;
  const g = new THREE.Group(); const raiz = new THREE.Group(); g.add(raiz);
  const pierna = (lado) => {
    const cadera = en(new THREE.Group(), 0.11 * lado, 0.8, 0); const muslo = en(cap(0.09, 0.26, pantalon), 0, -0.2, 0); cadera.add(muslo);
    const rodilla = en(new THREE.Group(), 0, -0.4, 0); cadera.add(rodilla); rodilla.add(en(cap(0.085, 0.24, pantalon), 0, -0.19, 0));
    const pie = en(caja(0.15, 0.09, 0.24, zapato, 0.04), 0, -0.39, 0.04); rodilla.add(pie); raiz.add(cadera); return { cadera, rodilla };
  };
  const pI = pierna(-1), pD = pierna(1);
  const torso = en(cap(0.21, 0.3, chaleco || camisa), 0, 1.08, 0); torso.scale.set(1.12, 1, 0.82); raiz.add(torso);
  if (chaleco) { const pecho = en(caja(0.16, 0.3, 0.05, camisa, 0.02), 0, 1.22, 0.16); raiz.add(pecho); }
  if (pajarita) { const pj = new THREE.Group(); pj.position.set(0, 1.36, 0.19); [-1, 1].forEach(s => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.08, 12), mat(pajarita)); c.rotation.z = s * Math.PI / 2; c.position.x = s * 0.035; pj.add(c); }); pj.add(esf(0.022, pajarita)); raiz.add(pj); }
  if (delantal) { const d = en(caja(0.36, 0.42, 0.04, delantal, 0.02), 0, 0.72, 0.17); raiz.add(d); }
  const cuello = en(cil(0.07, 0.08, 0.1, piel), 0, 1.42, 0); raiz.add(cuello);
  const cabeza = en(new THREE.Group(), 0, 1.62, 0); raiz.add(cabeza);
  const craneo = esf(0.21, piel, 0.55); craneo.scale.set(1, 1.04, 0.98); cabeza.add(craneo);
  [-1, 1].forEach(s => { cabeza.add(en(esf(0.03, '#141018', 0.2), 0.075 * s, 0.03, 0.19)); cabeza.add(en(esf(0.009, '#ffffff', 0.2), 0.075 * s + 0.01, 0.042, 0.215));
    const mej = en(esf(0.04, '#f19a8a', 0.8), 0.125 * s, -0.045, 0.155); mej.scale.z = 0.4; cabeza.add(mej); cabeza.add(en(esf(0.035, piel, 0.6), 0.205 * s, 0, 0)); });
  cabeza.add(en(esf(0.032, piel, 0.5), 0, -0.005, 0.21));
  const boca = en(esf(0.04, '#5a1f22', 0.6), 0, -0.085, 0.185); boca.scale.set(1.1, 0.25, 0.5); cabeza.add(boca);
  const cejas = [-1, 1].map(s => { const c = en(caja(0.07, 0.016, 0.02, pelo, 0.007), 0.075 * s, 0.1, 0.19); cabeza.add(c); return c; });
  if (peinado !== 'calvo') {
    const casco = en(esf(0.222, pelo, 0.8), 0, 0.045, -0.025); casco.scale.set(1.02, 0.82, 1.02); cabeza.add(casco);
    const flequillo = en(caja(0.3, 0.07, 0.1, pelo, 0.035), 0, 0.15, 0.13); flequillo.rotation.x = -0.35; cabeza.add(flequillo);
    if (peinado === 'largo') { const l = en(caja(0.38, 0.36, 0.14, pelo, 0.06), 0, -0.08, -0.12); cabeza.add(l); }
    if (peinado === 'mono') cabeza.add(en(esf(0.1, pelo, 0.8), 0, 0.2, -0.14));
  }
  if (gorro === 'chef') { cabeza.add(en(cil(0.17, 0.17, 0.16, '#ffffff'), 0, 0.22, 0)); const p = en(esf(0.2, '#ffffff', 0.9), 0, 0.36, 0); p.scale.y = 0.7; cabeza.add(p); }
  const brazo = (lado) => {
    const hombro = en(new THREE.Group(), 0.27 * lado, 1.36, 0); hombro.add(en(cap(0.072, 0.2, camisa), 0, -0.14, 0));
    const codo = en(new THREE.Group(), 0, -0.28, 0); hombro.add(codo); codo.add(en(cap(0.066, 0.17, camisa), 0, -0.11, 0));
    const mano = en(esf(0.075, piel, 0.6), 0, -0.27, 0); codo.add(mano); raiz.add(hombro); return { hombro, codo, mano };
  };
  const bI = brazo(-1), bD = brazo(1);
  sombra(g);
  const api = {
    g, raiz, cabeza, boca, cejas, bI, bD, pI, pD, sentado: false,
    reset() { [bI, bD].forEach((b, i) => { b.hombro.rotation.set(0, 0, (i ? -1 : 1) * 0.08); b.codo.rotation.set(-0.15, 0, 0); });
      [pI, pD].forEach(p => { p.cadera.rotation.set(0, 0, 0); p.rodilla.rotation.set(0, 0, 0); }); raiz.position.set(0, 0, 0); raiz.rotation.set(0, 0, 0); cabeza.rotation.set(0, 0, 0); boca.scale.y = 0.25; },
    sentar() { api.sentado = true; },
    // fase en vueltas; vel 0..1 (andar..correr)
    andar(fase, amp = 1) { const s = Math.sin(fase * Math.PI * 2), c = Math.cos(fase * Math.PI * 2);
      pI.cadera.rotation.x = 0.55 * s * amp; pD.cadera.rotation.x = -0.55 * s * amp; pI.rodilla.rotation.x = Math.max(0, -s) * 0.7 * amp; pD.rodilla.rotation.x = Math.max(0, s) * 0.7 * amp;
      bI.hombro.rotation.x = -0.5 * s * amp; bD.hombro.rotation.x = 0.5 * s * amp; bI.codo.rotation.x = -0.4 * amp; bD.codo.rotation.x = -0.4 * amp;
      raiz.position.y = Math.abs(c) * 0.05 * amp; raiz.rotation.z = 0.03 * s * amp; },
    hablar(t, k = 1) { boca.scale.y = 0.25 + k * (0.55 + 0.45 * Math.sin(t * 23) * Math.sin(t * 7.3)) * 0.9; },
    respirar(t, d = 0) { if (api.sentado) { pI.cadera.rotation.x = pD.cadera.rotation.x = -Math.PI / 2; pI.rodilla.rotation.x = pD.rodilla.rotation.x = Math.PI / 2; raiz.position.y = -0.33; }
      raiz.position.y += Math.sin(t * 2.1 + d) * 0.008; cabeza.rotation.y = Math.sin(t * 0.7 + d) * 0.25; cabeza.rotation.x = Math.sin(t * 1.1 + d * 2) * 0.05; },
  };
  api.reset(); return api;
}

// ---------- mobiliario ----------
function silla(c = '#8a4b2b', cojin = '#b8323a') {
  const g = new THREE.Group();
  g.add(en(caja(0.46, 0.07, 0.46, c, 0.025), 0, 0.45, 0)); g.add(en(caja(0.42, 0.05, 0.42, cojin, 0.025), 0, 0.5, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => g.add(en(cil(0.025, 0.02, 0.45, c, 10), x * 0.19, 0.225, z * 0.19)));
  g.add(en(caja(0.46, 0.5, 0.06, c, 0.03), 0, 0.75, -0.21));
  return sombra(g);
}
function mesaRedonda() {
  const g = new THREE.Group();
  const mantel = cil(0.62, 0.66, 0.2, '#fbf6ee', 48); mantel.position.y = 0.66; g.add(mantel);
  g.add(en(cil(0.6, 0.6, 0.03, '#ffffff', 48), 0, 0.775, 0));
  g.add(en(cil(0.06, 0.06, 0.6, '#6b3a22', 12), 0, 0.3, 0)); g.add(en(cil(0.28, 0.32, 0.04, '#6b3a22', 24), 0, 0.02, 0));
  return sombra(g);
}
export function plato(c = '#ffffff') { const g = new THREE.Group(); g.add(en(cil(0.15, 0.11, 0.025, c, 32), 0, 0.012, 0)); g.add(en(cil(0.1, 0.1, 0.01, '#f1ebe0', 32), 0, 0.026, 0)); return sombra(g); }
export function cana() {
  const g = new THREE.Group(); g.add(en(cil(0.045, 0.035, 0.16, '#f2b233', 20), 0, 0.08, 0)); const esp = en(cil(0.047, 0.045, 0.04, '#fff8e8', 20), 0, 0.175, 0); g.add(esp);
  g.children[0].material = new THREE.MeshStandardMaterial({ color: '#f2a91f', roughness: 0.15, emissive: '#5a3200', emissiveIntensity: 0.4 }); return sombra(g);
}
export function bravas() { const g = plato(); for (let i = 0; i < 9; i++) { const c = caja(0.045, 0.04, 0.045, i % 3 ? '#e7a64a' : '#d88a2e', 0.012); c.position.set(Math.cos(i * 2.3) * 0.06, 0.05 + (i % 2) * 0.02, Math.sin(i * 2.3) * 0.06); c.rotation.y = i; g.add(c); } g.add(en(esf(0.03, '#c9361f'), 0, 0.09, 0)); return sombra(g); }
function botella(c, h = 0.3) { const g = new THREE.Group(); g.add(en(cil(0.045, 0.045, h, c, 14), 0, h / 2, 0)); g.add(en(cil(0.015, 0.03, 0.09, c, 10), 0, h + 0.045, 0)); return g; }
function lampara(x, z, y = 3.0) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  g.add(en(cil(0.006, 0.006, 3.4 - y, '#2a2420', 6), 0, (3.4 + y) / 2, 0));
  const pant = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#f0c46a', roughness: 0.5, side: THREE.DoubleSide, emissive: '#5a3a08', emissiveIntensity: 0.6 })); pant.position.y = y; g.add(pant);
  const bombilla = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff3c4', toneMapped: false })); bombilla.position.y = y - 0.08; g.add(bombilla);
  const luz = new THREE.PointLight('#ffcf8a', 5, 6, 1.6); luz.position.y = y - 0.15; g.add(luz);
  return g;
}
function letrero(txt, w = 1.1, h = 0.28, fondo = '#1d1b22', color = '#ffffff') {
  const t = lienzoTex(512, Math.round(512 * h / w), (x, W, H) => { x.fillStyle = fondo; x.fillRect(0, 0, W, H); x.fillStyle = color; x.font = `900 ${Math.round(H * 0.56)}px Inter, Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, W / 2, H / 2 + 2); });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
}

// ---------- restaurante ----------
export function construirRestaurante(scene, { pantalla3D, tpv, movil, tarjetaMenu, placaCuadrada, tema = 'clasico' }) {
  const mundo = new THREE.Group(); scene.add(mundo);
  const TB = tema === 'taberna'; // taberna andaluza: cal, azulejo, barro, vigas oscuras, jamones y barriles
  const COL = TB ? { fondo: '#f7f1e4', lado: '#f3ecdc', techo: '#efe6d2', viga: '#3b2414' } : { fondo: '#f1dcb6', lado: '#ecd3a8', techo: '#e6c99a', viga: '#6b3a20' };
  const suelo = TB ? lienzoTex(1024, 1024, (x, w, h) => { x.fillStyle = '#7a3a22'; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const k = (i * 5 + j * 3) % 7; x.fillStyle = `rgb(${178 + k * 6},${88 + k * 4},${52 + k * 3})`; x.fillRect(j * 128 + 3, i * 128 + 3, 122, 122); if ((i + j) % 2 === 0) { x.fillStyle = '#e9d9b0'; x.fillRect(j * 128 - 14, i * 128 - 14, 28, 28); x.fillStyle = '#2f6aa8'; x.fillRect(j * 128 - 8, i * 128 - 8, 16, 16); } } }) : lienzoTex(1024, 1024, (x, w, h) => { for (let i = 0; i < 16; i++) { const y = i * 64; for (let j = 0; j < 4; j++) { const off = (i % 2) * 128 + j * 256; const tono = 150 + ((i * 7 + j * 13) % 5) * 9; x.fillStyle = `rgb(${tono + 40},${tono - 10},${tono - 60})`; x.fillRect(off, y, 254, 62); x.fillRect(off - 1024, y, 254, 62); } } });
  suelo.wrapS = suelo.wrapT = THREE.RepeatWrapping; suelo.repeat.set(5, 5);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(14, 16), new THREE.MeshStandardMaterial({ map: suelo, roughness: 0.6 })); piso.rotation.x = -Math.PI / 2; piso.position.z = -2; piso.receiveShadow = true; mundo.add(piso);
  const alfombra = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), mat('#a8323a', 0.95)); alfombra.rotation.x = -Math.PI / 2; alfombra.position.set(0, 0.004, -1.5); alfombra.receiveShadow = true; if (!TB) mundo.add(alfombra);
  const pared = (w, h, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(c, 0.95)); m.receiveShadow = true; return m; };
  const texAzulejo = TB ? (() => { const t = lienzoTex(256, 256, (x, w, h) => { x.fillStyle = '#f4ecd6'; x.fillRect(0, 0, w, h); x.fillStyle = '#1f4f9a'; x.beginPath(); x.moveTo(w / 2, 18); x.lineTo(w - 18, h / 2); x.lineTo(w / 2, h - 18); x.lineTo(18, h / 2); x.closePath(); x.fill();
    x.fillStyle = '#e8a91c'; x.beginPath(); x.arc(w / 2, h / 2, 46, 0, 7); x.fill(); x.fillStyle = '#1f4f9a'; x.beginPath(); x.arc(w / 2, h / 2, 18, 0, 7); x.fill();
    x.fillStyle = '#e8a91c'; [[0, 0], [w, 0], [0, h], [w, h]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 34, 0, 7); x.fill(); }); x.strokeStyle = '#cbbf9f'; x.lineWidth = 4; x.strokeRect(0, 0, w, h); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })() : null;
  const zocalo = TB ? (w) => { const g = new THREE.Group(); const tx = texAzulejo.clone(); tx.needsUpdate = true; tx.repeat.set(w / 0.3, 1.2 / 0.3);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.2), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.3 })); m.position.set(0, 0.6, 0.012); g.add(m);
    g.add(en(caja(w, 0.07, 0.07, '#e8a91c', 0.02, 0.3), 0, 1.22, 0.03)); return sombra(g); } : (w) => { const g = new THREE.Group(); g.add(en(caja(w, 1.05, 0.08, '#7a3f22', 0.02), 0, 0.525, 0)); for (let x = -w / 2 + 0.4; x < w / 2; x += 0.8) g.add(en(caja(0.6, 0.7, 0.03, '#8d4b29', 0.02), x, 0.53, 0.05)); g.add(en(caja(w, 0.06, 0.12, '#5e2f18', 0.02), 0, 1.07, 0.02)); return sombra(g); };
  // pared del fondo con ventana de cocina (x 1.4..4.2, y 1.0..2.1)
  const Z = -6.5;
  const fondo1 = en(pared(7.4, 3.4, COL.fondo), -2.3, 1.7, Z); mundo.add(fondo1);
  mundo.add(en(pared(1.8, 3.4, COL.fondo), 5.1, 1.7, Z)); mundo.add(en(pared(2.8, 1.0, COL.fondo), 2.8, 0.5, Z)); mundo.add(en(pared(2.8, 1.3, COL.fondo), 2.8, 2.75, Z));
  const zf = en(zocalo(7.4), -2.3, 0, Z + 0.04); mundo.add(zf); mundo.add(en(zocalo(1.8), 5.1, 0, Z + 0.04));
  const izq = en(pared(16, 3.4, COL.lado), -6, 1.7, -2); izq.rotation.y = Math.PI / 2; mundo.add(izq);
  const der = en(pared(16, 3.4, COL.lado), 6, 1.7, -2); der.rotation.y = -Math.PI / 2; mundo.add(der);
  const zi = en(zocalo(16), -5.96, 0, -2); zi.rotation.y = Math.PI / 2; mundo.add(zi); const zd = en(zocalo(16), 5.96, 0, -2); zd.rotation.y = -Math.PI / 2; mundo.add(zd);
  const atras = en(pared(12, 3.4, COL.lado), 0, 1.7, 4); atras.rotation.y = Math.PI; mundo.add(atras);
  const techo = en(pared(12, 12, COL.techo), 0, 3.4, -2); techo.rotation.x = Math.PI / 2; mundo.add(techo);
  for (let z = -6; z <= 3; z += 1.5) mundo.add(sombra(en(caja(12, 0.2, 0.24, COL.viga, 0.03), 0, 3.3, z)));
  // ventanas con noche (pared izquierda) y cuadros
  [-4.5, -1.5].forEach(z => { const v = new THREE.Group(); v.position.set(-5.97, 1.85, z); v.rotation.y = Math.PI / 2;
    const noche = lienzoTex(256, 320, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0d1638'); g.addColorStop(1, '#27346b'); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,230,${0.4 + (i % 3) * 0.2})`; x.fillRect((i * 97) % w, (i * 53) % (h * 0.7), 2, 2); } x.fillStyle = '#f5f1d0'; x.beginPath(); x.arc(w * 0.7, h * 0.22, 18, 0, 7); x.fill(); });
    v.add(new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.25), new THREE.MeshBasicMaterial({ map: noche, toneMapped: false })));
    v.add(en(caja(1.12, 0.07, 0.06, '#5e2f18'), 0, 0.63, 0.02)); v.add(en(caja(1.12, 0.07, 0.06, '#5e2f18'), 0, -0.63, 0.02)); v.add(en(caja(0.07, 1.3, 0.06, '#5e2f18'), -0.53, 0, 0.02)); v.add(en(caja(0.07, 1.3, 0.06, '#5e2f18'), 0.53, 0, 0.02)); v.add(en(caja(0.04, 1.25, 0.04, '#5e2f18'), 0, 0, 0.02));
    const cortina = en(caja(0.3, 1.5, 0.05, '#b1262f', 0.04), 0.7, 0, 0.05); v.add(cortina); const c2 = cortina.clone(); c2.position.x = -0.7; v.add(c2); mundo.add(v); });
  if (TB) {
    // platos de cerámica en las paredes
    const texPlato = (c1, c2) => lienzoTex(256, 256, (x, w, h) => { x.fillStyle = '#f6efdc'; x.beginPath(); x.arc(w / 2, h / 2, 126, 0, 7); x.fill(); x.strokeStyle = c1; x.lineWidth = 14; x.beginPath(); x.arc(w / 2, h / 2, 104, 0, 7); x.stroke();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.fillStyle = i % 2 ? c1 : c2; x.beginPath(); x.ellipse(w / 2 + Math.cos(a) * 62, h / 2 + Math.sin(a) * 62, 22, 12, a, 0, 7); x.fill(); } x.fillStyle = c2; x.beginPath(); x.arc(w / 2, h / 2, 28, 0, 7); x.fill(); });
    [[5.97, 2.2, -3.9, '#1f4f9a', '#e8a91c'], [5.97, 2.0, -3.1, '#2f8a4a', '#1f4f9a'], [5.97, 2.25, -0.5, '#c8402a', '#e8a91c'], [-5.97, 2.1, 1.3, '#1f4f9a', '#c8402a'], [-5.97, 2.4, 2.1, '#e8a91c', '#2f8a4a']].forEach(([x, y, z, c1, c2]) => {
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.28, 40), new THREE.MeshStandardMaterial({ map: texPlato(c1, c2), roughness: 0.25 })); p.position.set(x + (x > 0 ? -0.02 : 0.02), y, z); p.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2; mundo.add(p); });
    // macetas de geranios colgadas
    [[5.9, 2.7, -2.0], [5.9, 2.7, 1.2], [-5.9, 2.75, -3.0], [-5.9, 2.75, -0.1]].forEach(([x, y, z]) => { const m = new THREE.Group(); m.position.set(x, y, z);
      m.add(en(cil(0.13, 0.09, 0.2, '#1f4f9a', 16), 0, 0, 0)); for (let i = 0; i < 6; i++) m.add(en(esf(0.07, '#3b8a4a', 0.8), Math.cos(i) * 0.09, 0.13, Math.sin(i * 1.7) * 0.09)); for (let i = 0; i < 5; i++) m.add(en(esf(0.045, '#e0263a', 0.6), Math.cos(i * 1.3) * 0.1, 0.2 + (i % 2) * 0.04, Math.sin(i * 2.1) * 0.1)); mundo.add(sombra(m)); });
    // barriles de vino como mesas altas
    [[-5.2, -5.6], [5.2, -4.6]].forEach(([x, z]) => { const b = new THREE.Group(); b.position.set(x, 0, z); const cuerpo = cil(0.36, 0.36, 1.0, '#7a4423', 24); cuerpo.position.y = 0.5; cuerpo.scale.set(1, 1, 1); b.add(cuerpo);
      [0.12, 0.5, 0.88].forEach(y => b.add(en(cil(0.375, 0.375, 0.05, '#2a2420', 24), 0, y, 0))); b.add(en(cil(0.36, 0.36, 0.02, '#8d5a33', 24), 0, 1.0, 0)); mundo.add(sombra(b)); });
  } else [[5.97, 1.9, -3.5, '#2f5d8a'], [5.97, 1.9, -0.5, '#3b7a4a'], [-5.97, 1.9, 1.3, '#8a5a2f']].forEach(([x, y, z, c], i) => { const q = new THREE.Group(); q.position.set(x, y, z); q.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    q.add(caja(0.75, 0.6, 0.04, '#5e2f18', 0.01)); const t = lienzoTex(256, 200, (cx, w, h) => { cx.fillStyle = c; cx.fillRect(0, 0, w, h); cx.fillStyle = '#f6e7c1'; cx.beginPath(); cx.arc(w * (0.3 + 0.2 * i), h * 0.45, 40, 0, 7); cx.fill(); cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.fillRect(0, h * 0.72, w, h); });
    q.add(en(new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.48), new THREE.MeshBasicMaterial({ map: t })), 0, 0, 0.025)); mundo.add(q); });
  // barra (izquierda del fondo)
  const barra = new THREE.Group(); barra.position.set(-3.2, 0, -5.4); mundo.add(barra);
  barra.add(en(caja(4.2, 1.05, 0.7, '#7a3f22', 0.05), 0, 0.525, 0)); barra.add(en(caja(4.4, 0.08, 0.86, '#c98a52', 0.03, 0.35), 0, 1.09, 0));
  for (let x = -1.8; x <= 1.8; x += 0.6) barra.add(en(caja(0.45, 0.7, 0.03, '#8d4b29', 0.02), x, 0.52, 0.36));
  const balda = (y) => { barra.add(en(caja(3.8, 0.05, 0.3, '#6b3a20', 0.015), 0, y, -0.85)); for (let i = 0; i < 16; i++) { const b = botella(['#2e7d4f', '#7a1f2b', '#c88a1a', '#3a4f8a', '#e5e0d0'][i % 5], 0.22 + (i % 3) * 0.05); b.position.set(-1.75 + i * 0.235, y + 0.025, -0.85); barra.add(b); } };
  balda(1.55); balda(2.15);
  for (let i = 0; i < 3; i++) barra.add(en(cil(0.025, 0.025, 0.3, '#c9ccd2', 10), -1.2 + i * 0.18, 1.28, 0.05));
  [-1.4, -0.6, 0.6, 1.4].forEach(x => { const t = new THREE.Group(); t.position.set(x, 0, 0.75); t.add(en(cil(0.18, 0.18, 0.06, '#b8323a', 20), 0, 0.78, 0)); t.add(en(cil(0.03, 0.03, 0.75, '#2a2420', 10), 0, 0.38, 0)); t.add(en(cil(0.2, 0.22, 0.03, '#2a2420', 20), 0, 0.015, 0)); barra.add(sombra(t)); });
  if (TB) { barra.add(en(caja(4.2, 0.05, 0.05, '#3b2414', 0.01), 0, 2.85, 0.15));
    for (let i = 0; i < 6; i++) { const j = new THREE.Group(); j.position.set(-1.7 + i * 0.68, 2.82, 0.15); j.add(en(cil(0.006, 0.006, 0.22, '#e9dcc0', 6), 0, -0.11, 0));
      const pata = en(cap(0.1, 0.42, '#8a2f22'), 0, -0.52, 0); pata.scale.set(1.15, 1, 0.9); j.add(pata); j.add(en(cil(0.03, 0.045, 0.14, '#e8d6b2', 10), 0, -0.24, 0)); j.add(en(esf(0.05, '#c99a6a', 0.7), 0, -0.84, 0.0)); j.rotation.z = (i % 2 ? 1 : -1) * 0.05; barra.add(j); } }
  sombra(barra);
  const pantBarra = pantalla3D(0.9, 0.56); pantBarra.position.set(-4.7, 1.65, -5.25); pantBarra.rotation.x = -0.15; mundo.add(pantBarra);
  mundo.add(sombra(en(cil(0.03, 0.03, 0.35, '#2a2420', 8), -4.7, 1.3, -5.3)));
  const caja_ = tpv(); caja_.position.set(-2.4, 1.13, -5.35); caja_.scale.setScalar(0.9); mundo.add(caja_);
  const movCam = movil('#1d1f27'); movCam.scale.setScalar(0.32); movCam.position.set(-1.85, 1.3, -5.2); movCam.rotation.x = -0.35; mundo.add(movCam);
  mundo.add(sombra(en(caja(0.18, 0.04, 0.14, '#2a2420', 0.01), -1.85, 1.15, -5.25)));
  const rotBarra = letrero('BARRA', 1.0, 0.26); rotBarra.position.set(-3.2, 2.85, -6.47); mundo.add(rotBarra);
  // cocina tras la ventana
  const coc = new THREE.Group(); coc.position.set(2.8, 0, -6.5); mundo.add(coc);
  const azulejo = lienzoTex(256, 256, (x, w, h) => { x.fillStyle = '#e9eef0'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c3cdd2'; x.lineWidth = 4; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke(); } });
  azulejo.wrapS = azulejo.wrapT = THREE.RepeatWrapping; azulejo.repeat.set(4, 3);
  const fc = new THREE.Mesh(new THREE.PlaneGeometry(4, 3.4), new THREE.MeshStandardMaterial({ map: azulejo, roughness: 0.4 })); fc.position.set(0, 1.7, -2.2); coc.add(fc);
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4), mat('#cfd6da', 0.6)); sc.rotation.x = -Math.PI / 2; sc.position.set(0, 0.01, -1.1); coc.add(sc);
  coc.add(en(caja(2.9, 0.08, 0.5, '#d9dde2', 0.02, 0.3), 0, 1.0, 0.05));
  coc.add(sombra(en(caja(1.4, 0.9, 0.6, '#b9c0c7', 0.03, 0.35), -0.6, 0.45, -1.7))); coc.add(sombra(en(caja(1.4, 0.04, 0.6, '#2b2e33', 0.01), -0.6, 0.92, -1.7)));
  coc.add(sombra(en(cil(0.18, 0.16, 0.22, '#9aa3ab', 20), -0.9, 1.05, -1.7))); coc.add(sombra(en(cil(0.2, 0.2, 0.06, '#3a3d42', 20), -0.3, 0.97, -1.7)));
  coc.add(sombra(en(caja(1.1, 1.9, 0.6, '#dfe4e8', 0.04, 0.3), 1.2, 0.95, -1.8)));
  const luzCoc = new THREE.PointLight('#e8f4ff', 6, 6, 1.5); luzCoc.position.set(0, 2.6, -1.2); coc.add(luzCoc);
  const pantCoc = pantalla3D(1.0, 0.62); pantCoc.position.set(2.8, 2.55, -6.45); mundo.add(pantCoc);
  const rotCoc = letrero('COCINA', 1.0, 0.26); rotCoc.position.set(2.8, 3.05, -6.47); rotCoc.scale.setScalar(0.85); mundo.add(rotCoc);
  [0.85, 1.45].forEach(x => { const p = plato(); p.position.set(x + 2.0, 1.05, -6.4); mundo.add(p); });
  // mesas: la nuestra en el origen; otras con gente
  const mesas = [];
  const ponMesa = (x, z, gente) => { const m = mesaRedonda(); m.position.set(x, 0, z); mundo.add(m); const s1 = silla(); s1.position.set(x, 0, z - 0.78); mundo.add(s1); const s2 = silla(); s2.position.set(x, 0, z + 0.78); s2.rotation.y = Math.PI; mundo.add(s2);
    const p1 = plato(); p1.position.set(x, 0.79, z - 0.32); mundo.add(p1); const p2 = plato(); p2.position.set(x, 0.79, z + 0.32); mundo.add(p2); mesas.push({ m, x, z, gente }); return m; };
  ponMesa(0, -0.35, []);
  ponMesa(-2.6, -2.9, [0, 1]); ponMesa(2.4, -3.2, [0, 1]); ponMesa(-3.6, 0.2, [0, 1]); ponMesa(3.4, -0.2, [0, 1]); ponMesa(0.2, -4.2, [1]);
  [[-4.6, -1.3], [4.6, -1.8], [-0.8, -6.2], [5.5, -5.8], [-5.5, 2.5]].forEach(([x, z]) => { const p = new THREE.Group(); p.position.set(x, 0, z); p.add(en(cil(0.2, 0.15, 0.4, '#b8693a', 16), 0, 0.2, 0)); for (let i = 0; i < 7; i++) { const h = en(esf(0.18, ['#3b8a4a', '#2f7a3f', '#4c9a55'][i % 3], 0.8), Math.cos(i) * 0.12, 0.55 + (i % 3) * 0.12, Math.sin(i * 1.7) * 0.12); h.scale.y = 1.4; p.add(h); } mundo.add(sombra(p)); });
  [[-2.6, -2.9], [2.4, -3.2], [-3.6, 0.2], [3.4, -0.2], [0, -0.35], [0.2, -4.2], [-3.2, -4.4], [2.8, -5.2]].forEach(([x, z]) => mundo.add(lampara(x, z)));
  // nuestra mesa: tarjeta MENÚ y placa camarero
  const tj = tarjetaMenu(); tj.scale.setScalar(0.3); tj.position.set(-0.16, 0.79, -0.42); tj.rotation.y = 0.28; mundo.add(tj);
  const placa = placaCuadrada('campana'); placa.scale.setScalar(0.24); placa.position.set(0.24, 0.79, -0.5); placa.rotation.y = -0.3; mundo.add(placa);
  return { mundo, mesas, pantBarra, pantCoc, movCam, tj, placa, barra };
}

// ---------- gente ----------
const ROPA = [
  { camisa: '#3d7fd6', pantalon: '#2b2f3a', pelo: '#2a1a12', peinado: 'corto', piel: '#f0c29a' },
  { camisa: '#e0a826', pantalon: '#4a3b6b', pelo: '#7a3d1d', peinado: 'largo', piel: '#e9b48c' },
  { camisa: '#5aa55e', pantalon: '#2f3a56', pelo: '#111111', peinado: 'mono', piel: '#c98d63' },
  { camisa: '#d6567a', pantalon: '#24324a', pelo: '#d9a441', peinado: 'largo', piel: '#f5cfac' },
  { camisa: '#7a5ad6', pantalon: '#3a3a3a', pelo: '#4a2c1a', peinado: 'corto', piel: '#ab7450' },
  { camisa: '#e86a3a', pantalon: '#1f2a44', pelo: '#2a1a12', peinado: 'calvo', piel: '#f0c29a' },
];
export function poblar(mundo, mesas) {
  const gente = []; let k = 0;
  for (const { x, z, gente: asientos } of mesas) for (const a of asientos) {
    const p = muneco(ROPA[k++ % ROPA.length]); p.sentar(); p.g.position.set(x, 0, z + (a ? 0.72 : -0.72)); p.g.rotation.y = a ? Math.PI : 0; mundo.add(p.g); gente.push(p);
  }
  const camarero = muneco({ camisa: '#ffffff', chaleco: '#1d1b22', pantalon: '#1d1b22', delantal: '#1d1b22', pajarita: '#c0263a', pelo: '#3a2418', peinado: 'corto', piel: '#eab48a' });
  mundo.add(camarero.g);
  const bandeja = new THREE.Group(); bandeja.add(en(cil(0.24, 0.22, 0.025, '#c9ccd2', 32), 0, 0, 0)); const c1 = cana(); c1.position.set(-0.08, 0.012, 0.02); const c2 = cana(); c2.position.set(0.08, 0.012, -0.03); bandeja.add(c1, c2);
  bandeja.position.set(0, -0.3, 0.12); camarero.bI.codo.add(bandeja); camarero.bandeja = bandeja;
  const cocinero = muneco({ camisa: '#ffffff', pantalon: '#3a3d48', gorro: 'chef', pelo: '#2a1a12', peinado: 'calvo', piel: '#d9a07a' });
  cocinero.g.position.set(2.6, 0, -7.6); cocinero.g.rotation.y = 0; mundo.add(cocinero.g);
  return { gente, camarero, cocinero };
}

// ---------- manos en primera persona (hijas de la cámara) ----------
export function manosPOV(cam, movil, { piel = '#f0c29a', manga = '#4a6fa5' } = {}) {
  const D = new THREE.Group(); cam.add(D);
  const palma = en(caja(0.1, 0.13, 0.03, piel, 0.014, 0.6), 0.01, -0.06, -0.03); D.add(palma);
  const pulgar = en(cap(0.012, 0.035, piel), 0.074, -0.055, 0.004); pulgar.rotation.z = 0.5; D.add(pulgar);
  for (let i = 0; i < 4; i++) { const d = en(cap(0.0105, 0.018, piel), -0.074, 0.045 - i * 0.026, 0.006); d.rotation.z = Math.PI / 2; D.add(d); }
  const tel = movil; tel.scale.setScalar(0.3); D.add(tel);
  // antebrazo: va del hombro (abajo a la derecha, fuera de cuadro) a la muñeca, se recoloca cada fotograma
  const brazo = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.048, 1, 16), mat(manga)); cam.add(brazo);
  const hombro = new THREE.Vector3(0.3, -0.62, 0.05), Y = new THREE.Vector3(0, 1, 0);
  const colocarBrazo = () => { const m = D.position.clone().add(new THREE.Vector3(0.025, -0.12, -0.02)); const dir = m.clone().sub(hombro); const L = dir.length();
    brazo.position.copy(hombro).addScaledVector(dir, 0.5); brazo.quaternion.setFromUnitVectors(Y, dir.normalize()); brazo.scale.set(1, L, 1); brazo.visible = D.visible; };
  // mano izquierda levantada (pedir atención)
  const I = new THREE.Group(); cam.add(I);
  const antebrazo = en(cap(0.055, 0.42, manga), 0, -0.3, 0); I.add(antebrazo);
  const mano = new THREE.Group(); I.add(mano); mano.add(caja(0.11, 0.12, 0.035, piel, 0.016, 0.6));
  for (let i = 0; i < 4; i++) { const d = en(cap(0.015, 0.06, piel), -0.039 + i * 0.026, 0.09 + (i === 1 || i === 2 ? 0.008 : 0), 0); d.rotation.z = (i - 1.5) * 0.12; mano.add(d); }
  const pu = en(cap(0.017, 0.05, piel), 0.075, 0.0, 0.0); pu.rotation.z = -0.9; mano.add(pu);
  [D, I].forEach(g => g.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } }));
  return { D, I, tel, colocarBrazo };
}
