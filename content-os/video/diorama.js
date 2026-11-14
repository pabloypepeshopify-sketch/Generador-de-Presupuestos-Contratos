// Maqueta isométrica de un bar (dos copias: sin NFC y con NFC) para vídeos de comparación en pantalla partida.
import * as THREE from 'three';
import { muneco, caja, mat, cana, bravas, plato } from './juguete.js';

const en = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const sombra = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
const cil = (rt, rb, h, c, seg = 28) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c));
function texSuelo() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#e9dcc4' : '#c8b08c'; x.fillRect(i * 64, j * 64, 64, 64); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.4, 1.9); return t;
}
function mesa() { const g = new THREE.Group(); g.add(en(cil(0.62, 0.66, 0.16, '#fbf6ee', 40), 0, 0.68, 0)); g.add(en(cil(0.6, 0.6, 0.03, '#ffffff', 40), 0, 0.775, 0)); g.add(en(cil(0.06, 0.06, 0.6, '#6b3a22', 10), 0, 0.3, 0)); g.add(en(cil(0.26, 0.3, 0.04, '#6b3a22', 20), 0, 0.02, 0)); return sombra(g); }
function silla(r = 0) { const g = new THREE.Group(); g.add(en(caja(0.46, 0.07, 0.46, '#8a4b2b', 0.025), 0, 0.45, 0)); g.add(en(caja(0.42, 0.05, 0.42, '#b8323a', 0.025), 0, 0.5, 0)); g.add(en(caja(0.46, 0.5, 0.06, '#8a4b2b', 0.03), 0, 0.75, -0.21)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(en(cil(0.025, 0.02, 0.45, '#8a4b2b', 8), a * 0.19, 0.225, b * 0.19))); g.rotation.y = r; return sombra(g); }

const ROPA = [
  { camisa: '#3d7fd6', pantalon: '#2b2f3a', pelo: '#2a1a12', peinado: 'corto', piel: '#f0c29a' },
  { camisa: '#e0a826', pantalon: '#4a3b6b', pelo: '#7a3d1d', peinado: 'largo', piel: '#e9b48c' },
  { camisa: '#5aa55e', pantalon: '#2f3a56', pelo: '#111111', peinado: 'mono', piel: '#c98d63' },
  { camisa: '#d6567a', pantalon: '#24324a', pelo: '#d9a441', peinado: 'largo', piel: '#f5cfac' },
  { camisa: '#7a5ad6', pantalon: '#3a3a3a', pelo: '#4a2c1a', peinado: 'corto', piel: '#ab7450' },
  { camisa: '#e86a3a', pantalon: '#1f2a44', pelo: '#2a1a12', peinado: 'calvo', piel: '#f0c29a' },
];
// posiciones (coordenadas locales de la maqueta)
export const P = { B: [-2.5, -1.95], K: [2.9, -1.75], T1: [-2.7, 0.0], T2: [0.2, -0.3], T3: [-2.7, 2.4], T4: [2.9, 1.7], T5: [0.2, 2.5], C: [0.6, 0.9] };

export function construirMaqueta(scene, { nfc, x0, tarjetaMenu, placaCuadrada, pantalla3D, movil }) {
  const g = new THREE.Group(); g.position.x = x0; scene.add(g);
  // losa con suelo y canto
  const losa = caja(9.4, 0.5, 7.6, '#6b3a20', 0.08); losa.position.y = -0.25; losa.receiveShadow = true; g.add(losa);
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 7.4), new THREE.MeshStandardMaterial({ map: texSuelo(), roughness: 0.7 })); suelo.rotation.x = -Math.PI / 2; suelo.position.y = 0.005; suelo.receiveShadow = true; g.add(suelo);
  // paredes bajas (fondo e izquierda)
  const pared = (w, d, x, z) => { const p = new THREE.Group(); p.add(en(caja(w, 2.4, d, '#f1dcb6', 0.04), 0, 1.2, 0)); p.add(en(caja(w + 0.02, 0.9, d + 0.04, '#8d4b29', 0.03), 0, 0.45, 0)); p.position.set(x, 0, z); g.add(sombra(p)); };
  pared(9.4, 0.18, 0, -3.72); pared(0.18, 7.6, -4.62, 0);
  const ventana = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), new THREE.MeshBasicMaterial({ color: '#2b3f7a' })); ventana.position.set(-4.52, 1.6, 0.8); ventana.rotation.y = Math.PI / 2; g.add(ventana);
  // barra
  const barra = new THREE.Group(); barra.position.set(-2.5, 0, -2.85); g.add(barra);
  barra.add(en(caja(3.4, 1.05, 0.7, '#7a3f22', 0.05), 0, 0.525, 0)); barra.add(en(caja(3.6, 0.08, 0.86, '#c98a52', 0.03), 0, 1.09, 0));
  for (let i = 0; i < 12; i++) { const b = new THREE.Group(); b.add(en(cil(0.05, 0.05, 0.28, ['#2e7d4f', '#7a1f2b', '#c88a1a', '#3a4f8a'][i % 4], 10), 0, 0.14, 0)); b.add(en(cil(0.018, 0.03, 0.1, ['#2e7d4f', '#7a1f2b', '#c88a1a', '#3a4f8a'][i % 4], 8), 0, 0.33, 0)); b.position.set(-1.5 + i * 0.27, 1.5, -0.7); barra.add(b); }
  barra.add(en(caja(3.4, 0.05, 0.3, '#6b3a20', 0.015), 0, 1.48, -0.7)); sombra(barra);
  // cocina (esquina del fondo derecha) con pasaplatos
  const coc = new THREE.Group(); coc.position.set(2.9, 0, -2.85); g.add(coc);
  coc.add(en(caja(2.8, 1.05, 0.6, '#d9dde2', 0.04), 0, 0.525, 0.35)); coc.add(en(caja(1.2, 0.9, 0.55, '#b9c0c7', 0.03), -0.6, 0.45, -0.55)); coc.add(en(caja(1.2, 0.04, 0.55, '#2b2e33', 0.01), -0.6, 0.92, -0.55));
  coc.add(en(cil(0.18, 0.16, 0.22, '#9aa3ab', 18), -0.85, 1.05, -0.55)); coc.add(en(caja(0.9, 1.7, 0.55, '#e8ecef', 0.04), 0.85, 0.85, -0.55)); sombra(coc);
  // mesas con gente
  const mesas = {}; const gente = []; let k = (nfc ? 2 : 0);
  for (const [n, [x, z]] of Object.entries({ T1: P.T1, T2: P.T2, T3: P.T3, T4: P.T4, T5: P.T5 })) {
    const m = mesa(); m.position.set(x, 0, z); g.add(m);
    const s1 = silla(0); s1.position.set(x, 0, z - 0.78); g.add(s1); const s2 = silla(Math.PI); s2.position.set(x, 0, z + 0.78); g.add(s2);
    const pl = plato(); pl.position.set(x - 0.15, 0.79, z); g.add(pl);
    const pers = [0, 1].map(a => { const p = muneco(ROPA[k++ % ROPA.length]); p.sentar(); p.g.position.set(x, 0, z + (a ? 0.72 : -0.72)); p.g.rotation.y = a ? Math.PI : 0; g.add(p.g); gente.push(p); return p; });
    let tj = null, placa = null;
    if (nfc) { tj = tarjetaMenu(); tj.scale.setScalar(0.3); tj.position.set(x + 0.2, 0.79, z + 0.05); tj.rotation.y = 0.6; g.add(tj);
      placa = placaCuadrada('campana'); placa.scale.setScalar(0.22); placa.position.set(x - 0.25, 0.79, z + 0.25); placa.rotation.y = 0.6; g.add(placa); }
    mesas[n] = { x, z, pers, tj, placa, m };
  }
  // cañas y bravas que aparecen en la mesa 4
  const extras = [cana(), cana(), bravas()]; extras[0].position.set(P.T4[0] + 0.15, 0.79, P.T4[1] - 0.2); extras[1].position.set(P.T4[0] - 0.05, 0.79, P.T4[1] + 0.25); extras[2].position.set(P.T4[0] - 0.2, 0.79, P.T4[1] - 0.1); extras.forEach(e => { e.visible = false; g.add(e); });
  // camarero y cocinero
  const cam = muneco({ camisa: '#ffffff', chaleco: '#1d1b22', pantalon: '#1d1b22', delantal: '#1d1b22', pajarita: '#c0263a', pelo: '#3a2418', peinado: 'corto', piel: '#eab48a' }); g.add(cam.g);
  const coci = muneco({ camisa: '#ffffff', pantalon: '#3a3d48', gorro: 'chef', pelo: '#2a1a12', peinado: 'calvo', piel: '#d9a07a' }); coci.g.position.set(2.6, 0, -3.35); g.add(coci.g);
  const libreta = en(caja(0.16, 0.2, 0.03, '#fafafa', 0.01), 0, -0.3, 0.1); cam.bD.codo.add(libreta); libreta.visible = !nfc;
  const bandeja = new THREE.Group(); bandeja.add(en(cil(0.24, 0.22, 0.025, '#c9ccd2', 28), 0, 0, 0)); const b1 = cana(); b1.position.set(-0.07, 0.012, 0.02); const b2 = cana(); b2.position.set(0.08, 0.012, -0.03); bandeja.add(b1, b2); bandeja.position.set(0, -0.3, 0.12); cam.bI.codo.add(bandeja); bandeja.visible = false;
  // con NFC: pantallas en barra y cocina y móvil del camarero
  let pantB = null, pantK = null, movCam = null;
  if (nfc) {
    pantB = pantalla3D(0.9, 0.56); pantB.position.set(-1.3, 1.75, -2.75); pantB.rotation.y = 0.25; g.add(pantB);
    pantK = pantalla3D(0.9, 0.56); pantK.position.set(2.4, 1.75, -2.45); pantK.rotation.y = -0.2; g.add(pantK);
    movCam = movil('#1d1f27'); movCam.scale.setScalar(0.22); movCam.position.set(0.12, -0.2, 0.08); movCam.rotation.x = -0.8; cam.bD.codo.add(movCam);
  }
  return { g, mesas, gente, cam, coci, libreta, bandeja, extras, pantB, pantK, movCam, nfc };
}

// recorrido: lista de [t, x, z]; devuelve posición, si se mueve y hacia dónde mira
export function recorrido(pts, t) {
  if (t <= pts[0][0]) return { x: pts[0][1], z: pts[0][2], mueve: false, dir: null };
  for (let i = 0; i < pts.length - 1; i++) {
    const [t0, x0, z0] = pts[i], [t1, x1, z1] = pts[i + 1];
    if (t < t1) { if (x0 === x1 && z0 === z1) return { x: x0, z: z0, mueve: false, dir: null }; const k = (t - t0) / (t1 - t0); return { x: x0 + (x1 - x0) * k, z: z0 + (z1 - z0) * k, mueve: true, dir: Math.atan2(x1 - x0, z1 - z0) }; }
  }
  const u = pts[pts.length - 1]; return { x: u[1], z: u[2], mueve: false, dir: null };
}
export function distanciaRecorrida(pts, t) {
  let d = 0; for (let i = 0; i < pts.length - 1; i++) { const [t0, x0, z0] = pts[i], [t1, x1, z1] = pts[i + 1]; if (t <= t0) break; const k = Math.min(1, (t - t0) / (t1 - t0)); d += Math.hypot(x1 - x0, z1 - z0) * k; } return d;
}
