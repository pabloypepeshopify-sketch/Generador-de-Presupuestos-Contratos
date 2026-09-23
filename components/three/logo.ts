import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { MARK_SHAPES } from '@/lib/brand';

/*
 * Isotipo VISAX en 3D: los mismos trazados del logo oficial (lib/brand.ts)
 * extruidos, con metal pulido que refleja un entorno pintado con la paleta.
 */

const V_STOPS: Array<[number, string]> = [
  [0, '#33C6F4'],
  [0.45, '#3F7DFB'],
  [0.82, '#7C5CFF'],
  [1, '#6D28D9'],
];
const BAR_STOPS: Array<[number, string]> = [
  [0, '#3F7DFB'],
  [1, '#7C5CFF'],
];

function colorAt(stops: Array<[number, string]>, t: number, out: THREE.Color) {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      return out.copy(new THREE.Color(c0)).lerp(new THREE.Color(c1), (x - t0) / (t1 - t0));
    }
  }
  return out.set(stops[stops.length - 1][1]);
}

function shapes(d: string) {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  return data.paths.flatMap((p) => SVGLoader.createShapes(p));
}

/** Degradado a lo largo de un vector (en coordenadas del SVG) como colores de vértice. */
function paint(geo: THREE.BufferGeometry, from: [number, number], to: [number, number], stops: Array<[number, string]>) {
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len2 = dx * dx + dy * dy;
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = ((pos.getX(i) - from[0]) * dx + (pos.getY(i) - from[1]) * dy) / len2;
    colorAt(stops, t, c);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

export function createLogo(envMap: THREE.Texture, quality: 'full' | 'lite') {
  const ext: THREE.ExtrudeGeometryOptions = {
    depth: 44,
    bevelEnabled: true,
    bevelThickness: 7,
    bevelSize: 4.5,
    bevelSegments: quality === 'full' ? 5 : 2,
    curveSegments: quality === 'full' ? 28 : 12,
  };
  const colored = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    metalness: 0.85,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMap,
    envMapIntensity: 1.7,
    transparent: true,
  });
  const silver = new THREE.MeshPhysicalMaterial({
    color: '#F6F7FB',
    metalness: 1,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMap,
    envMapIntensity: 1.5,
    transparent: true,
  });

  const inner = new THREE.Group();
  MARK_SHAPES.silver.forEach((d) => inner.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shapes(d), ext), silver)));
  const [vArm, topBar] = MARK_SHAPES.colored;
  const vGeo = new THREE.ExtrudeGeometry(shapes(vArm), ext);
  paint(vGeo, [0, 0], [253, 357], V_STOPS);
  const barGeo = new THREE.ExtrudeGeometry(shapes(topBar), ext);
  paint(barGeo, [300, 98], [525, 1], BAR_STOPS);
  inner.add(new THREE.Mesh(vGeo, colored), new THREE.Mesh(barGeo, colored));

  // Centrado y a escala de mundo (≈3,6 de ancho); Y invertida porque el SVG va hacia abajo.
  inner.children.forEach((m) => (m as THREE.Mesh).geometry.translate(-MARK_SHAPES.w / 2, -MARK_SHAPES.h / 2, -22));
  const s = 3.6 / MARK_SHAPES.w;
  inner.scale.set(s, -s, s);

  const group = new THREE.Group();
  group.add(inner);
  return { group, materials: [colored, silver] };
}

/** Entorno de reflejos pintado con la paleta: bandas blanca, violeta y cian sobre casi negro. */
export function createEnvironment(gl: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = vec3(0.012, 0.012, 0.025);
        col += vec3(1.0) * smoothstep(0.1, 0.0, abs(d.y - 0.42)) * 3.0;                           // banda blanca
        col += vec3(0.201, 0.107, 1.0) * smoothstep(0.35, 0.0, abs(d.y + 0.18)) * (1.2 + d.x) * 1.6;  // violeta
        col += vec3(0.033, 0.565, 0.905) * smoothstep(0.5, 0.0, length(d.xz - vec2(-0.85, 0.3))) * 3.0; // cian
        col += vec3(0.05, 0.205, 0.965) * smoothstep(0.6, 0.0, length(d.xz - vec2(0.8, -0.4))) * 1.4;   // azul
        col += vec3(1.0) * smoothstep(0.25, 0.0, length(d - vec3(0.0, 0.9, 0.4))) * 2.0;             // cenital
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), mat));
  const pmrem = new THREE.PMREMGenerator(gl);
  const rt = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  mat.dispose();
  return rt.texture;
}
