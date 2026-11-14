// Estilos visuales: el mismo bar 3D con looks muy distintos para que cada vídeo de la cuenta cambie.
// bar (realista cálido) · holograma (rayos X azul) · neon (noche, bordes de neón) · comic (dibujo con contorno) · maqueta (miniatura tilt-shift)
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
const geoCont = new Map();
function geoContorno(g) { if (!geoCont.has(g)) { let c = g.clone(); for (const k of Object.keys(c.attributes)) if (!['position', 'skinIndex', 'skinWeight'].includes(k)) c.deleteAttribute(k); c = mergeVertices(c, 1e-3); c.computeVertexNormals(); geoCont.set(g, c); } return geoCont.get(g); }

const cacheMat = new Map();
const esLienzo = m => m && m.map && m.map.isCanvasTexture;
const intocable = m => !m || m.transparent || m.isMeshBasicMaterial || esLienzo(m) || m.isLineBasicMaterial || m.isSpriteMaterial;

function fondoDegradado(cols, puntos = false) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 512; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 512); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); x.fillStyle = g; x.fillRect(0, 0, 64, 512);
  if (puntos) { x.fillStyle = 'rgba(0,0,0,0.05)'; for (let y = 4; y < 512; y += 9) for (let k = (y / 9) % 2 ? 4 : 0; k < 64; k += 9) { x.beginPath(); x.arc(k, y, 1.6, 0, 7); x.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// recorre la escena y cambia materiales de todo lo que no sea efecto, pantalla o tarjeta protagonista
function recorrer(raiz, saltar, fn) {
  const pila = [raiz];
  while (pila.length) { const o = pila.pop(); if (saltar.has(o)) continue; if (o.isMesh && !o.userData.esEstilo) fn(o); for (const h of o.children) pila.push(h); }
}
function cambiarMat(o, conv) {
  const una = m => { if (intocable(m)) return m; const k = m.uuid + conv.clave; if (!cacheMat.has(k)) cacheMat.set(k, conv(m, o)); return cacheMat.get(k); };
  o.material = Array.isArray(o.material) ? o.material.map(una) : una(o.material);
}
const algunoTocable = o => (Array.isArray(o.material) ? o.material : [o.material]).some(m => !intocable(m));
function bordes(o, color, opacidad = 0.85, angulo = 28) {
  if (o.isSkinnedMesh || !algunoTocable(o)) return;
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, angulo), new THREE.LineBasicMaterial({ color, transparent: true, opacity: opacidad, toneMapped: false, depthWrite: false }));
  l.userData.esEstilo = true; o.add(l);
}
function luces(scene, fn) { scene.traverse(o => { if (o.isLight) fn(o); }); }

const ESTILOS = {
  bar: { post: null },

  holograma: {
    aplicar(scene, mundo, saltar, renderer) {
      scene.background = new THREE.Color('#020a1c'); scene.fog = new THREE.Fog('#020a1c', 22, 60); renderer.shadowMap.enabled = false;
      const relleno = Object.assign((m) => new THREE.MeshBasicMaterial({ color: '#0a2a66', transparent: true, opacity: 0.32, depthWrite: true }), { clave: 'holo' });
      const piel = new THREE.MeshBasicMaterial({ color: '#4fd8ff', wireframe: true, transparent: true, opacity: 0.38, toneMapped: false });
      recorrer(mundo, saltar, o => {
        if (o.isSkinnedMesh) { if (algunoTocable(o)) o.material = piel; return; }
        if (!algunoTocable(o)) return; bordes(o, '#3fd2ff', 0.75); cambiarMat(o, relleno);
      });
      const rej = new THREE.GridHelper(40, 80, '#1f6fd1', '#0d3a7a'); rej.position.y = 0.012; rej.material.transparent = true; rej.material.opacity = 0.55; rej.userData.esEstilo = true; scene.add(rej);
      luces(scene, l => { if (l.isHemisphereLight) { l.color.set('#bfe6ff'); l.groundColor.set('#1b2c55'); } });
    },
    post: { brillo: 0.55, desenfoqueBrillo: 14, filtro: 'saturate(1.15) contrast(1.05)', lineas: true },
    subs: { tam: 56, fuente: tam => `700 ${tam}px "DejaVu Sans Mono", monospace`, mayus: true, pill: ['#00e5ff', '#1f6fd1'], texto: '#c8f6ff', textoClave: '#021024', sombra: 'rgba(0,200,255,0.9)', brilloPill: 'rgba(0,229,255,0.9)', radio: 6 },
  },

  neon: {
    aplicar(scene, mundo, saltar, renderer) {
      scene.background = new THREE.Color('#06020e'); scene.fog = new THREE.Fog('#06020e', 20, 55);
      const cols = ['#ff2bd6', '#33e6ff', '#8a5cff', '#ff2bd6', '#33e6ff'];
      let n = 0;
      const oscuro = Object.assign((m) => { const r = m.clone(); r.color = (m.color ? m.color.clone() : new THREE.Color('#fff')).multiplyScalar(0.28); r.roughness = 0.35; r.metalness = 0.2; return r; }, { clave: 'neon' });
      const piel = Object.assign((m) => { const r = m.clone(); r.color = (m.color ? m.color.clone() : new THREE.Color('#fff')).multiplyScalar(0.55); r.emissive = new THREE.Color('#2a0a4a'); return r; }, { clave: 'neonpiel' });
      recorrer(mundo, saltar, o => {
        if (o.isSkinnedMesh) { cambiarMat(o, piel); return; }
        if (!algunoTocable(o)) return; bordes(o, cols[n++ % cols.length], 0.9, 35); cambiarMat(o, oscuro);
      });
      luces(scene, l => {
        if (l.isHemisphereLight) { l.color.set('#6b4cff'); l.groundColor.set('#12051f'); l.intensity = 0.7; }
        else if (l.isDirectionalLight) { l.color.set('#7f6bff'); l.intensity = 0.6; }
        else if (l.isPointLight) { l.color.set('#ff3fd0'); }
      });
      const p1 = new THREE.PointLight('#ff2bd6', 30, 12, 1.5); p1.position.set(-5, 3.2, 1.5);
      const p2 = new THREE.PointLight('#22d8ff', 30, 12, 1.5); p2.position.set(4, 3.2, 2.5);
      const p3 = new THREE.PointLight('#8a5cff', 22, 10, 1.5); p3.position.set(-3, 2.6, -3.5); scene.add(p1, p2, p3);
      renderer.toneMappingExposure = 1.25;
    },
    post: { brillo: 0.65, desenfoqueBrillo: 18, filtro: 'saturate(1.35) contrast(1.12)' },
    subs: { tam: 70, fuente: tam => `italic 900 ${tam}px Inter, sans-serif`, pill: ['#ff2bd6', '#8a5cff'], sombra: 'rgba(255,43,214,0.95)', brilloPill: 'rgba(255,43,214,0.9)' },
  },

  comic: {
    aplicar(scene, mundo, saltar, renderer) {
      scene.background = fondoDegradado(['#fff1c9', '#ffd6a1'], true); scene.fog = null;
      const grad = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
      const toon = Object.assign((m) => new THREE.MeshToonMaterial({ color: m.color ? m.color.clone() : new THREE.Color('#fff'), map: m.map || null, gradientMap: grad, vertexColors: !!m.vertexColors }), { clave: 'toon' });
      const lineas = [];
      recorrer(mundo, saltar, o => {
        if (!algunoTocable(o)) return; cambiarMat(o, toon);
        const s = o.getWorldScale(new THREE.Vector3()).x || 1;
        const mat = new THREE.MeshBasicMaterial({ color: '#1a1022', side: THREE.BackSide });
        mat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <skinning_vertex>', `#include <skinning_vertex>\n transformed += normalize(normal) * ${(0.03 / s).toFixed(5)};`); };
        lineas.push([o, mat]);
      });
      for (const [o, mat] of lineas) {
        const c = o.isSkinnedMesh ? new THREE.SkinnedMesh(geoContorno(o.geometry), mat) : new THREE.Mesh(geoContorno(o.geometry), mat);
        if (o.isSkinnedMesh) c.bind(o.skeleton, o.bindMatrix);
        c.userData.esEstilo = true; c.position.copy(o.position); c.quaternion.copy(o.quaternion); c.scale.copy(o.scale); c.matrixAutoUpdate = o.matrixAutoUpdate; c.updateMatrix();
        o.parent.add(c); if (o.matrixAutoUpdate) c.onBeforeRender = () => { c.position.copy(o.position); c.quaternion.copy(o.quaternion); c.scale.copy(o.scale); };
      }
      luces(scene, l => { if (l.isHemisphereLight) { l.color.set('#ffffff'); l.groundColor.set('#c9a37c'); l.intensity = 1.9; } else if (l.isDirectionalLight) l.intensity = 2.6; });
      renderer.toneMapping = THREE.NoToneMapping;
    },
    post: { filtro: 'saturate(1.45) contrast(1.15)' },
    subs: { tam: 74, fuente: tam => `900 ${tam}px Inter, sans-serif`, mayus: true, texto: '#ffe14d', textoClave: '#fff', borde: 12, pill: ['#ff3b3b', '#ff3b3b'], bordePill: 7, radio: 14, giro: -0.06, sombra: 'rgba(0,0,0,0)' },
  },

  maqueta: {
    tele: 1.9,
    aplicar(scene, mundo, saltar, renderer) {
      scene.background = fondoDegradado(['#9fd3ff', '#e8f4ff']); scene.fog = null;
      luces(scene, l => { if (l.isHemisphereLight) { l.color.set('#ffffff'); l.groundColor.set('#b98d66'); l.intensity = 1.8; } else if (l.isDirectionalLight) { l.color.set('#fff2dc'); l.intensity = 3.0; } });
      renderer.toneMappingExposure = 1.2;
    },
    post: { filtro: 'saturate(1.55) contrast(1.12) brightness(1.04)', tiltShift: 9 },
    subs: { tam: 72, fuente: tam => `800 ${tam}px Fraunces, serif`, pill: ['#ffd84d', '#ff9f1c'], textoClave: '#2a1600', sombra: 'rgba(0,0,0,0.6)' },
  },
};

export function aplicarEstilo(nombre, { scene, mundo, saltar, renderer }) {
  const e = ESTILOS[nombre] || ESTILOS.bar;
  if (e.aplicar) e.aplicar(scene, mundo, saltar, renderer);
  return e;
}

// postproceso 2D: se dibuja la imagen 3D (src) en el lienzo C con el look del estilo
const aux = document.createElement('canvas'); const A = aux.getContext('2d');
export function dibujar3D(C, src, W, H, e, extraFiltro = '') {
  const p = (e && e.post) || {};
  C.filter = [p.filtro || '', extraFiltro].join(' ').trim() || 'none';
  C.drawImage(src, -W / 2, -H / 2, W, H); C.filter = 'none';
  if (p.tiltShift) {
    if (aux.width !== W) { aux.width = W; aux.height = H; }
    A.globalCompositeOperation = 'source-over'; A.clearRect(0, 0, W, H); A.filter = `blur(${p.tiltShift}px) ${p.filtro || ''}`; A.drawImage(src, 0, 0, W, H); A.filter = 'none';
    const g = A.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(0.62, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    A.globalCompositeOperation = 'destination-in'; A.fillStyle = g; A.fillRect(0, 0, W, H); A.globalCompositeOperation = 'source-over';
    C.drawImage(aux, -W / 2, -H / 2, W, H);
  }
  if (p.brillo) { C.save(); C.globalCompositeOperation = 'lighter'; C.globalAlpha = p.brillo; C.filter = `blur(${p.desenfoqueBrillo}px) brightness(0.9)`; C.drawImage(src, -W / 2, -H / 2, W, H); C.restore(); C.filter = 'none'; }
  if (p.lineas) { C.save(); C.globalAlpha = 0.07; C.fillStyle = '#9fe6ff'; for (let y = -H / 2; y < H / 2; y += 6) C.fillRect(-W / 2, y, W, 2); C.restore(); }
}
