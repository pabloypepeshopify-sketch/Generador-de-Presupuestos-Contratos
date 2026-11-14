// Bar 3D realista con modelos CC0: KayKit Restaurant Bits + Furniture Bits (Kay Lousberg) y
// Quaternius Ultimate Modular Men/Women. Unidades KayKit: mesa = 1 de alto, pared = 4×4.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const cargador = new GLTFLoader();
const cache = new Map();
async function gltf(url) { if (!cache.has(url)) cache.set(url, cargador.loadAsync(url)); return cache.get(url); }
const R = n => `./modelos/restaurante/${n}.gltf`, M = n => `./modelos/muebles/${n}.gltf`, P = n => `./modelos/personas/${n}.glb`;

async function pieza(url, x, y, z, ry = 0, s = 1) {
  const g = (await gltf(url)).scene.clone(true);
  g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// Persona animada. Altura objetivo en unidades KayKit (~2.2 = 1,70 m si la mesa es 0,75 m).
const ALTURA = 2.25;
export async function persona(nombre, { sentada = false, anim = 'Idle', desfase = 0 } = {}) {
  const base = await gltf(P(nombre));
  const g = SkeletonUtils.clone(base.scene);
  g.traverse(o => { if (o.isMesh || o.isSkinnedMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; } });
  const huesos = {}; g.traverse(o => { if (o.isBone) huesos[o.name] = o; });
  // altura real a partir de la cabeza en pose de reposo
  const holder = new THREE.Group(); holder.add(g); g.updateMatrixWorld(true);
  const cab = huesos.Head ? huesos.Head.getWorldPosition(new THREE.Vector3()).y : 0.45;
  const esc = ALTURA / (cab * 1.1); g.scale.multiplyScalar(esc); g.updateMatrixWorld(true);
  const caderas = huesos.Hips ? huesos.Hips.getWorldPosition(new THREE.Vector3()).y : 1.0;
  const mixer = new THREE.AnimationMixer(g); const clips = {};
  for (const c of base.animations) clips[c.name] = c;
  let accion = null;
  const persona = {
    holder, huesos, sentada,
    animar(nombreClip) { if (accion && accion._clip.name === nombreClip) return; if (accion) accion.stop(); accion = mixer.clipAction(clips[nombreClip] || clips.Idle); accion.play(); },
    actualizar(t, extra) {
      mixer.setTime(t + desfase);
      if (persona.sentada) {
        // dobla cadera y rodillas alrededor del eje izquierda-derecha de la persona (en coordenadas del mundo)
        holder.updateMatrixWorld(true);
        const ry = holder.rotation.y, eje = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry));
        const doblar = (hueso, ang) => {
          if (!hueso) return; hueso.parent.updateMatrixWorld(true);
          const qp = hueso.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
          const ejeLocal = eje.clone().applyQuaternion(qp).normalize();
          hueso.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(ejeLocal, ang)); hueso.updateMatrixWorld(true);
        };
        for (const l of ['L', 'R']) doblar(huesos['UpperLeg' + l], -Math.PI / 2 * 0.92);
        for (const l of ['L', 'R']) doblar(huesos['LowerLeg' + l], Math.PI / 2 * 0.92);
      }
      if (extra) extra(huesos);
    },
    sentar(x, z, ry, asiento = 0.62) { persona.sentada = true; holder.position.set(x, asiento - caderas, z); holder.rotation.y = ry; },
  };
  persona.animar(anim);
  return persona;
}

// Construye el bar y devuelve referencias útiles para la coreografía
export async function construirBar(scene, tarjetaFn) {
  const bar = new THREE.Group(); scene.add(bar);
  const add = async (...a) => { const p = await pieza(...a); bar.add(p); return p; };
  const tareas = [];

  // suelo (4×3 baldosas de 4) y alfombra
  for (let ix = -2; ix < 2; ix++) for (let iz = -1; iz < 2; iz++) tareas.push(add(R('floor_kitchen'), ix * 4 + 2, -0.5, iz * 4, 0));
  // paredes: fondo (z=-6), izquierda (x=-8) y derecha (x=8)
  const fondo = ['wall_decorated', 'wall', 'wall_orderwindow_decorated', 'wall'];
  fondo.forEach((n, i) => tareas.push(add(R(n), -6 + i * 4, 0, -6, 0)));
  ['wall_window_open', 'wall_doorway', 'wall_window_open'].forEach((n, i) => tareas.push(add(R(n), -8, 0, -4 + i * 4, Math.PI / 2)));
  ['wall', 'wall_window_open', 'wall'].forEach((n, i) => tareas.push(add(R(n), 8, 0, -4 + i * 4, -Math.PI / 2)));
  tareas.push(add(R('door_A'), -8.2, 0, 0.8, Math.PI / 2));

  // COCINA: detrás de la pared de pedidos (x 2..8, z -6..-2), separada por un tabique con ventana
  ['wall_orderwindow_decorated', 'wall'].forEach((n, i) => tareas.push(add(R(n), 4 + i * 4, 0, -2, Math.PI)));
  tareas.push(add(R('kitchencounter_straight_A_backsplash'), 3, 0, -5, 0));
  tareas.push(add(R('stove_multi_countertop'), 3, 0.07, -5, 0));
  tareas.push(add(R('extractorhood'), 3, 0.2, -6.0, 0));
  tareas.push(add(R('oven'), 5, 0, -5, 0));
  tareas.push(add(R('kitchencounter_sink_backsplash'), 7, 0, -5, 0));
  tareas.push(add(R('fridge_A'), 7, 0, -3.1, -Math.PI / 2));
  tareas.push(add(R('pot_A_stew'), 2.7, 1.2, -5.1, 0, 0.6));
  tareas.push(add(R('kitchentable_A_large_decorated'), 5, 0, -3.4, 0, 0.7));

  // BARRA: a la izquierda del fondo (x -7..-1, z -4.2) con taburetes y estantería de botellas
  for (let i = 0; i < 3; i++) tareas.push(add(R(i === 1 ? 'kitchencounter_straight_decorated' : 'kitchencounter_straight_A'), -6 + i * 2, 0, -4.4, Math.PI));
  tareas.push(add(M('shelf_B_large_decorated'), -6, 2.3, -5.7, 0, 1.1));
  tareas.push(add(M('shelf_B_large_decorated'), -3, 2.3, -5.7, 0, 1.1));
  for (let i = 0; i < 4; i++) tareas.push(add(M('chair_stool_wood'), -6.6 + i * 1.6, 0, -2.9, 0));

  // decoración
  tareas.push(add(M('pictureframe_large_A'), -7.7, 2.4, 3.2, Math.PI / 2));
  tareas.push(add(M('pictureframe_medium'), 7.7, 2.3, 3.0, -Math.PI / 2));
  tareas.push(add(M('cactus_medium_A'), -7.2, 0, 5.2, 0, 1.2));
  tareas.push(add(M('cactus_medium_A'), 7.2, 0, -1.4, 0, 1.2));
  tareas.push(add(M('lamp_standing'), 7.1, 0, 5.2, 0));
  tareas.push(add(R('pillar_A'), 0.2, 0, -2.2, 0, 0.9));
  tareas.push(add(M('rug_rectangle_stripes_A'), 0, 0.01, 2.3, 0, 1.6));

  // SALA: 8 mesas redondas pequeñas con 2 sillas cada una (números 1..8; la 7 delante a la izquierda)
  const mesas = {}; const pos = [[-5, -0.3], [-1.6, -0.3], [1.8, -0.3], [5.2, -0.3], [-5, 3.3], [-1.6, 3.3], [1.8, 3.3], [5.2, 3.3]];
  const numeros = [1, 2, 3, 4, 7, 5, 6, 8];
  pos.forEach(([x, z], i) => tareas.push((async () => {
    const n = numeros[i]; const g = new THREE.Group(); g.position.set(x, 0, z); bar.add(g);
    g.add(await pieza(R('table_round_A_small'), 0, 0, 0, 0, 1));
    const s1 = await pieza(M('chair_A_wood'), 0, 0, 1.05, Math.PI, 1); const s2 = await pieza(M('chair_A_wood'), 0, 0, -1.05, 0, 1);
    g.add(s1, s2);
    const tj = tarjetaFn(n); tj.scale.setScalar(0.34); tj.position.set(0.25, 1.0, 0.1); tj.rotation.y = 0.35; g.add(tj);
    const plato = await pieza(R('plate'), -0.3, 1.0, 0.25, 0, 0.45); g.add(plato);
    mesas[n] = { g, tj, sillas: [s1, s2] };
  })()));
  await Promise.all(tareas);
  return { bar, mesas };
}
