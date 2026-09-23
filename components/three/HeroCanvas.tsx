'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Campo de partículas del hero. Decorativo: acompaña, nunca protagoniza.
 *  - ~2800 puntos de 1–2 px en una nube esférica amplia, densidad baja.
 *  - 70 % blanco, 20 % violeta, 10 % cian. Opacidad máx. 0,45.
 *  - Una vuelta completa cada 120 s.
 *  - El cursor aparta las partículas en un radio corto y vuelven con easing.
 *  - Al montarse, la nube nace del centro (donde estaba el logo del preloader).
 *  - Render a 60 fps como máximo y en pausa si no se ve o la pestaña no está activa.
 */

const COUNT = 2800;
const RADIUS = 9;
const TURN_SECONDS = 120;
const INTRO_SECONDS = 1;
const FRAME_MS = 1000 / 60;

// Colores en sRGB directo (el shader no aplica gestión de color).
const PALETTE: Array<[number, [number, number, number]]> = [
  [0.7, [0xf6 / 255, 0xf7 / 255, 0xfb / 255]], // blanco  #F6F7FB
  [0.2, [0x7c / 255, 0x5c / 255, 0xff / 255]], // violeta #7C5CFF
  [0.1, [0x33 / 255, 0xc6 / 255, 0xf4 / 255]], // cian    #33C6F4
];

const vertexShader = /* glsl */ `
  uniform float uIntro;
  uniform float uPixelRatio;
  uniform vec2 uMouse;      // NDC, suavizado en JS
  uniform float uHover;     // 0..1, entra/sale con easing
  uniform float uAspect;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Nacimiento desde el centro
    float grow = mix(0.06, 1.0, uIntro);
    vec4 mv = modelViewMatrix * vec4(position * grow, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w;

    // Repulsión suave en radio corto (espacio de pantalla, corregido por aspecto)
    vec2 d = (ndc - uMouse) * vec2(uAspect, 1.0);
    float dist = length(d);
    float push = (1.0 - smoothstep(0.0, 0.22, dist)) * uHover;
    vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);
    mv.xy += dir * push * 0.045 * -mv.z;

    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio;

    // Menos densidad justo detrás del titular: el texto respira
    float center = smoothstep(0.1, 0.7, length(ndc * vec2(uAspect * 0.6, 1.0)));
    vColor = aColor;
    vAlpha = aAlpha * mix(0.55, 1.0, center) * uIntro;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = vAlpha * (1.0 - smoothstep(0.35, 0.5, length(c)));
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

function pickColor(r: number) {
  let acc = 0;
  for (const [w, c] of PALETTE) {
    acc += w;
    if (r < acc) return c;
  }
  return PALETTE[0][1];
}

function Particles() {
  const points = useRef<THREE.Points>(null);
  const { size, viewport, gl } = useThree();
  const mouse = useRef({ x: 0, y: 0, tx: 0, ty: 0, hover: 0, thover: 0 });
  const born = useRef<number | null>(null);

  const geometry = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const sz = new Float32Array(COUNT);
    const al = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // Nube esférica amplia con el núcleo algo más vacío
      const r = RADIUS * (0.25 + 0.75 * Math.cbrt(Math.random()));
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      col.set(pickColor(Math.random()), i * 3);
      sz[i] = 1 + Math.random(); // 1–2 px
      al[i] = 0.22 + Math.random() * 0.23; // 0,22–0,45
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));
    return g;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uIntro: { value: 0 },
          uPixelRatio: { value: 1 },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uHover: { value: 0 },
          uAspect: { value: 1 },
        },
      }),
    [],
  );

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  // Puntero global: el contenido del hero tapa el canvas, así que escuchamos en window
  // y convertimos a coordenadas del propio canvas (sigue bien aunque haya scroll).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const m = mouse.current;
      const inside =
        e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      m.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      m.ty = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      m.thover = inside ? 1 : 0;
      if (m.hover < 0.01) {
        m.x = m.tx;
        m.y = m.ty;
      }
    };
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) mouse.current.thover = 0;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('mouseout', onOut);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('mouseout', onOut);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const p = points.current;
    if (!p) return;
    const dt = Math.min(delta, 1 / 30);
    const now = state.clock.elapsedTime;
    if (born.current === null) born.current = now;

    // Rotación lenta y constante
    p.rotation.y += dt * ((Math.PI * 2) / TURN_SECONDS);

    // Easing del puntero (repulsión y vuelta suaves)
    const m = mouse.current;
    const k = 1 - Math.pow(0.001, dt); // ~ exponencial, independiente del fps
    m.x += (m.tx - m.x) * k * 0.9;
    m.y += (m.ty - m.y) * k * 0.9;
    m.hover += (m.thover - m.hover) * k * 0.5;

    const t = Math.min(1, (now - born.current) / INTRO_SECONDS);
    const u = material.uniforms;
    u.uIntro.value = 1 - Math.pow(1 - t, 3);
    u.uMouse.value.set(m.x, m.y);
    u.uHover.value = m.hover;
    u.uAspect.value = size.width / Math.max(1, size.height);
    u.uPixelRatio.value = viewport.dpr;
  });

  return <points ref={points} geometry={geometry} material={material} rotation={[0.22, 0, 0]} />;
}

/**
 * Bucle propio (frameloop "demand"): tope de 60 fps aunque el monitor vaya a 120 Hz,
 * y pausa total fuera de viewport o con la pestaña oculta.
 */
function FrameLimiter() {
  const { invalidate, gl } = useThree();
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let inView = true;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < FRAME_MS - 1) return;
      last = now;
      invalidate();
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      if (inView && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      sync();
    });
    io.observe(gl.domElement);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [gl, invalidate]);
  return null;
}

export default function HeroCanvas() {
  return (
    <Canvas
      aria-hidden="true"
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 14], fov: 50 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      style={{ pointerEvents: 'none' }}
    >
      <Particles />
      <FrameLimiter />
    </Canvas>
  );
}
