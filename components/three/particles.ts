import * as THREE from 'three';
import { CARD_COUNT, CARD_GAP, CARD_Z0, CAM_END } from '@/lib/experience';

/*
 * Un único sistema de partículas que se transforma en la GPU:
 *   remolino alrededor del logo → explosión → nube del hero → "corales" de servicios.
 * Cada partícula lleva sus posiciones objetivo como atributos; los uniforms
 * uBurst / uSettle / uCluster mezclan entre ellas. Coste en CPU: cero por frame.
 */

// Paleta VISAX en espacio lineal (el shader convierte a sRGB al pintar).
const lin = (hex: string): [number, number, number] => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
};
const WHITE = lin('#F6F7FB');
const VIOLET = lin('#7C5CFF');
const CYAN = lin('#33C6F4');
const BLUE = lin('#3F7DFB');

function pick(r: number): [number, number, number] {
  if (r < 0.42) return WHITE;
  if (r < 0.74) return VIOLET;
  if (r < 0.9) return CYAN;
  return BLUE;
}

function randDir(): THREE.Vector3 {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return new THREE.Vector3(s * Math.cos(t), u, s * Math.sin(t));
}

function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

/** Centros de los "corales": a los lados del pasillo de tarjetas y al fondo. */
function clusterCenters() {
  const out: { c: THREE.Vector3; lumps: THREE.Vector3[]; size: number }[] = [];
  const zStart = CARD_Z0 + 6;
  const zEnd = CARD_Z0 - CARD_GAP * (CARD_COUNT - 1) - 12;
  const n = 18;
  for (let k = 0; k < n; k++) {
    const z = zStart + ((zEnd - zStart) * k) / (n - 1) + (Math.random() - 0.5) * 3;
    const side = k % 2 === 0 ? -1 : 1;
    const c = new THREE.Vector3(side * (4.6 + Math.random() * 3), (Math.random() - 0.5) * 4.5, z);
    const lumps = Array.from({ length: 5 }, () =>
      c.clone().add(new THREE.Vector3(gauss() * 1.4, gauss() * 1.8, gauss() * 1.4)),
    );
    out.push({ c, lumps, size: 0.5 + Math.random() * 0.8 });
  }
  return out;
}

export function createParticleGeometry(count: number) {
  const core = new Float32Array(count * 3);
  const home = new Float32Array(count * 3);
  const cluster = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  const rand = new Float32Array(count * 4);
  const clusters = clusterCenters();
  const v = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    // Remolino alrededor del logo: disco grueso, más denso cerca del borde del isotipo
    const d = randDir();
    d.y *= 0.55;
    const rc = 1.9 + Math.pow(Math.random(), 1.8) * 2.2;
    v.copy(d).normalize().multiplyScalar(rc);
    core.set([v.x, v.y, v.z], i * 3);

    // Nube del hero: cáscara amplia con el centro despejado (detrás del titular)
    const h = randDir();
    const rh = 4.5 + Math.pow(Math.random(), 0.7) * 12;
    home.set([h.x * rh * 1.35, h.y * rh * 0.8, h.z * rh], i * 3);

    // Servicios: 78 % en corales, 22 % como polvo a lo largo del pasillo
    if (Math.random() < 0.78) {
      const cl = clusters[(Math.random() * clusters.length) | 0];
      const lump = cl.lumps[(Math.random() * cl.lumps.length) | 0];
      const r = cl.size * Math.pow(Math.random(), 0.6);
      const dd = randDir().multiplyScalar(r);
      cluster.set([lump.x + dd.x, lump.y + dd.y * 1.3, lump.z + dd.z], i * 3);
    } else {
      cluster.set(
        [(Math.random() - 0.5) * 26, (Math.random() - 0.5) * 14, 10 + Math.random() * (CAM_END - 30)],
        i * 3,
      );
    }

    color.set(pick(Math.random()), i * 3);
    rand.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }

  const g = new THREE.BufferGeometry();
  // "position" = core: three.js la usa para el bounding sphere; desactivamos el culling abajo.
  g.setAttribute('position', new THREE.BufferAttribute(core, 3));
  g.setAttribute('aHome', new THREE.BufferAttribute(home, 3));
  g.setAttribute('aCluster', new THREE.BufferAttribute(cluster, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
  return g;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uGather;   // 0→1 aparición del remolino
  uniform float uBurst;    // 0→1 explosión
  uniform float uSettle;   // 0→1 asentamiento en la nube del hero
  uniform float uCluster;  // 0→1 transformación en corales (scroll)
  uniform float uFlash;    // destello de la explosión
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uAspect;
  uniform vec2 uMouse;
  uniform float uHover;
  attribute vec3 aHome;
  attribute vec3 aCluster;
  attribute vec3 aColor;
  attribute vec4 aRand;
  varying vec3 vColor;
  varying float vAlpha;

  vec3 rotY(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  void main() {
    // Remolino: más rápido cuanto más cerca del logo
    float r = length(position);
    vec3 core = rotY(position, uTime * (1.6 / (0.4 + r)) + aRand.y * 6.2831);
    core.y += sin(uTime * 1.7 + aRand.y * 30.0) * 0.05;

    // Explosión: sale disparada hacia fuera con algo de dispersión
    vec3 dir = normalize(position + (aRand.xyz - 0.5) * 0.9);
    vec3 burst = dir * (7.0 + aRand.w * 18.0);
    vec3 p = mix(core, burst, uBurst);

    // Nube del hero, con deriva lenta
    vec3 home = rotY(aHome, uTime * 0.035 + aRand.z * 0.2);
    home += vec3(sin(uTime * 0.4 + aRand.y * 40.0), cos(uTime * 0.33 + aRand.x * 40.0), 0.0) * 0.12;
    p = mix(p, home, uSettle);

    // Corales de servicios, "respirando"
    vec3 cl = aCluster + vec3(
      sin(uTime * 0.7 + aRand.y * 25.0),
      cos(uTime * 0.6 + aRand.x * 25.0),
      sin(uTime * 0.5 + aRand.z * 25.0)
    ) * 0.1;
    p = mix(p, cl, uCluster);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    // Repulsión suave del cursor (espacio de pantalla)
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w;
    vec2 d = (ndc - uMouse) * vec2(uAspect, 1.0);
    float dist = length(d);
    float push = (1.0 - smoothstep(0.0, 0.22, dist)) * uHover;
    mv.xy += (dist > 0.0001 ? d / dist : vec2(0.0)) * push * 0.07 * -mv.z;

    gl_Position = projectionMatrix * mv;
    float depth = max(0.1, -mv.z);
    float size = uSize * (0.5 + aRand.x * 1.3) * (1.0 + uFlash * 1.5);
    // ~1,5–4 px a la distancia del hero; cerca de la cámara, "bokeh" más grande (con tope)
    gl_PointSize = clamp(size * uPixelRatio * (26.0 / depth), 1.0, 11.0 * uPixelRatio);

    // Brillo: destello en la explosión; algo más tenue asentado en el hero (manda el titular)
    float heroDim = mix(1.0, 0.6, uSettle * (1.0 - uCluster));
    float near = smoothstep(0.4, 2.5, depth);
    vColor = aColor * (1.0 + uFlash * 2.2);
    vAlpha = uGather * near * heroDim * (0.3 + aRand.w * 0.7);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = exp(-dot(c, c) * 18.0) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor * a, a);
    #include <colorspace_fragment>
  }
`;

export function createParticleMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uGather: { value: 0 },
      uBurst: { value: 0 },
      uSettle: { value: 0 },
      uCluster: { value: 0 },
      uFlash: { value: 0 },
      uSize: { value: 1 },
      uPixelRatio: { value: 1 },
      uAspect: { value: 1 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uHover: { value: 0 },
    },
  });
}
