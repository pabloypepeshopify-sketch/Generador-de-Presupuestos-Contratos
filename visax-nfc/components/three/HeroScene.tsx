'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createEnvironment } from './env';
import { createScreen } from './phoneScreen';

/*
 * Portada 3D de VISAX NFC: el expositor de reseñas (cara = réplica exacta del
 * producto) y un móvil que se acerca, hace "tap" → onda de partículas violeta/cian
 * y en la pantalla se rellenan las 5 estrellas. En bucle, a 60 fps como máximo y
 * en pausa cuando no se ve.
 */

type Quality = 'full' | 'lite';

const FACE_W = 2.4;
const FACE_H = 3.2;
const TILT = -0.2; // el expositor se inclina hacia atrás
const LOOP = 7.6;
const FRAME_MS = 1000 / 60;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const damp = (dt: number, l: number) => 1 - Math.exp(-l * dt);

const lin = (hex: string) => new THREE.Color(hex);
const PALETTE = [lin('#F6F7FB'), lin('#7C5CFF'), lin('#33C6F4'), lin('#3F7DFB')];

function pointsMaterial(vertex: string) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uT: { value: 0 },
      uOrigin: { value: new THREE.Vector3() },
      uBasis: { value: new THREE.Matrix3() },
      uPixelRatio: { value: 1 },
      uMouse: { value: new THREE.Vector2(9, 9) },
      uAspect: { value: 1 },
      uSize: { value: 1 },
    },
    vertexShader: vertex,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float a = exp(-dot(c, c) * 18.0) * vAlpha;
        if (a < 0.004) discard;
        gl_FragColor = vec4(vColor * a, a);
        #include <colorspace_fragment>
      }
    `,
  });
}

/** Nube de ambiente alrededor del expositor, con repulsión del cursor. */
function Ambient({ count }: { count: number }) {
  const { size, viewport } = useThree();
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = 2.6 + Math.pow(Math.random(), 0.8) * 5.5;
      const s = Math.sqrt(1 - u * u);
      pos.set([s * Math.cos(th) * r * 1.3, u * r * 0.75, s * Math.sin(th) * r - 1.5], i * 3);
      const c = PALETTE[Math.random() < 0.45 ? 0 : Math.random() < 0.6 ? 1 : Math.random() < 0.7 ? 2 : 3];
      col.set([c.r, c.g, c.b], i * 3);
      rnd[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
    return g;
  }, [count]);
  const mat = useMemo(
    () =>
      pointsMaterial(/* glsl */ `
        uniform float uTime, uPixelRatio, uAspect, uSize;
        uniform vec2 uMouse;
        attribute vec3 aColor;
        attribute float aRand;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float a = uTime * (0.03 + aRand * 0.02);
          vec3 p = vec3(cos(a) * position.x + sin(a) * position.z, position.y + sin(uTime * 0.5 + aRand * 20.0) * 0.08, -sin(a) * position.x + cos(a) * position.z);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vec4 clip = projectionMatrix * mv;
          vec2 d = (clip.xy / clip.w - uMouse) * vec2(uAspect, 1.0);
          float dist = length(d);
          mv.xy += (dist > 0.0001 ? d / dist : vec2(0.0)) * (1.0 - smoothstep(0.0, 0.25, dist)) * 0.06 * -mv.z;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(uSize * (0.6 + aRand * 1.4) * uPixelRatio * (22.0 / max(0.1, -mv.z)), 1.0, 9.0 * uPixelRatio);
          vColor = aColor;
          vAlpha = 0.25 + aRand * 0.55;
        }
      `),
    [],
  );
  const mouse = useRef({ x: 9, y: 9, tx: 9, ty: 9 });

  useEffect(() => {
    const el = document.getElementById('hero-3d');
    const onMove = (e: PointerEvent) => {
      if (!el || e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      mouse.current.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.current.ty = -((e.clientY - r.top) / r.height) * 2 + 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);

  useFrame((state, delta) => {
    const m = mouse.current;
    const k = damp(Math.min(delta, 0.05), 5);
    m.x += (m.tx - m.x) * k;
    m.y += (m.ty - m.y) * k;
    const u = mat.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uMouse.value.set(m.x, m.y);
    u.uAspect.value = size.width / Math.max(1, size.height);
    u.uPixelRatio.value = viewport.dpr;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

function Scene({ quality, onReady }: { quality: Quality; onReady: () => void }) {
  const { gl, camera, size, viewport } = useThree();
  const env = useMemo(() => createEnvironment(gl), [gl]);
  const faceTex = useLoader(THREE.TextureLoader, '/textures/stand-face.png');
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.anisotropy = 8;
  const screen = useMemo(() => createScreen(), []);

  const standRef = useRef<THREE.Group>(null);
  const faceRef = useRef<THREE.Group>(null);
  const phoneRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const screenState = useRef({ mode: 'idle' as 'idle' | 'review' | 'thanks', stars: 0 });
  const tmp = useMemo(
    () => ({
      icon: new THREE.Vector3(),
      normal: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      target: new THREE.Vector3(),
      m4: new THREE.Matrix4(),
    }),
    [],
  );
  const mouse = useRef({ x: 0, y: 0 });

  const materials = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({ color: '#1B1B1D', metalness: 0.7, roughness: 0.32, clearcoat: 0.6, envMap: env, envMapIntensity: 1.1 }),
      edge: new THREE.MeshPhysicalMaterial({ color: '#C9CDD6', metalness: 1, roughness: 0.25, envMap: env, envMapIntensity: 1.2 }),
      phone: new THREE.MeshPhysicalMaterial({ color: '#0B0C14', metalness: 0.6, roughness: 0.22, clearcoat: 1, envMap: env, envMapIntensity: 1.4 }),
    }),
    [env],
  );

  // Onda de partículas del "tap"
  const burst = useMemo(() => {
    const n = quality === 'full' ? 900 : 450;
    const dir = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const rnd = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const z = (Math.random() - 0.3) * 0.7;
      dir.set([Math.cos(a), Math.sin(a), z], i * 3);
      const c = PALETTE[1 + (i % 3)];
      col.set([c.r, c.g, c.b], i * 3);
      rnd[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(dir, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
    const m = pointsMaterial(/* glsl */ `
      uniform float uT, uPixelRatio, uSize;
      uniform vec3 uOrigin;
      uniform mat3 uBasis; // orientación de la cara del expositor
      attribute vec3 aColor;
      attribute float aRand;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float e = 1.0 - pow(1.0 - uT, 3.0);
        vec3 p = uOrigin + uBasis * position * e * (0.6 + aRand * 2.4);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uSize * (1.0 + aRand * 2.0) * uPixelRatio * (24.0 / max(0.1, -mv.z)), 1.0, 12.0 * uPixelRatio);
        vColor = aColor * 1.6;
        vAlpha = step(0.001, uT) * pow(1.0 - uT, 1.4);
      }
    `);
    return new THREE.Points(g, m);
  }, [quality]);

  const ready = useRef(false);

  useEffect(
    () => () => {
      env.dispose();
      screen.texture.dispose();
      Object.values(materials).forEach((m) => m.dispose());
      burst.geometry.dispose();
      (burst.material as THREE.Material).dispose();
    },
    [env, screen, materials, burst],
  );

  useEffect(() => {
    const el = document.getElementById('hero-3d');
    const onMove = (e: PointerEvent) => {
      if (!el || e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      mouse.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.current.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((state, delta) => {
    if (!ready.current) {
      ready.current = true;
      requestAnimationFrame(onReady);
    }
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const lt = t % LOOP;
    const stand = standRef.current!;
    const face = faceRef.current!;
    const phone = phoneRef.current!;

    // Encaje de cámara según la proporción del hueco (en vertical se aleja)
    const aspect = size.width / Math.max(1, size.height);
    const dist = aspect >= 1 ? 7.4 : 7.4 / Math.max(0.62, aspect);
    camera.position.x += (0.75 + mouse.current.x * 0.35 - camera.position.x) * damp(dt, 3);
    camera.position.y += (0.9 + mouse.current.y * 0.25 - camera.position.y) * damp(dt, 3);
    camera.position.z = dist;
    camera.lookAt(0.55, 0.35, 0);

    stand.rotation.y = -0.38 + Math.sin(t * 0.35) * 0.1;
    stand.position.y = Math.sin(t * 0.8) * 0.04;

    // Punto del icono NFC en el expositor y normal de su cara
    face.updateWorldMatrix(true, false);
    tmp.icon.set(0.03, FACE_H / 2 + (0.5 - 272 / 800) * FACE_H, 0.05);
    face.localToWorld(tmp.icon);
    face.getWorldQuaternion(tmp.q);
    tmp.normal.set(0, 0, 1).applyQuaternion(tmp.q);

    // ── Línea de tiempo del móvil ──
    const idleX = aspect >= 1 ? 2.35 : 1.7;
    const idle = new THREE.Vector3(idleX, 0.55 + Math.sin(t * 1.1) * 0.06, 1.2);
    const show = new THREE.Vector3(idleX - 0.3, 0.35, 1.9);
    const touch = tmp.target.copy(tmp.icon).addScaledVector(tmp.normal, 0.2);
    const go = ease((lt - 1.2) / 1.0); // se acerca
    const back = ease((lt - 3.5) / 1.0); // se retira
    const home = ease((lt - 6.6) / 0.9); // vuelve a reposo
    const p = idle.clone().lerp(touch, go).lerp(show, back).lerp(idle, home);
    phone.position.copy(p);
    const qIdle = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, -0.45, 0.08));
    const qTouch = tmp.q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.12)));
    const qShow = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.2, 0.02));
    phone.quaternion.copy(qIdle).slerp(qTouch, go).slerp(qShow, back).slerp(qIdle, home);
    const pulse = lt > 2.2 && lt < 2.6 ? Math.sin(((lt - 2.2) / 0.4) * Math.PI) * 0.05 : 0;
    phone.position.addScaledVector(tmp.normal, -pulse);

    // Pantalla: reposo → estrellas → gracias
    const ss = screenState.current;
    let mode: typeof ss.mode = 'idle';
    let stars = 0;
    if (lt >= 2.2 && lt < 7.1) {
      mode = lt >= 4.6 ? 'thanks' : 'review';
      stars = Math.min(5, Math.max(0, Math.floor((lt - 2.45) / 0.2) + 1));
    }
    if (mode !== ss.mode || stars !== ss.stars) {
      ss.mode = mode;
      ss.stars = stars;
      screen.draw(ss);
    }

    // Onda: partículas + anillos + brillo del aro del expositor
    const tap = (lt - 2.2) / 1.6;
    const bu = (burst.material as THREE.ShaderMaterial).uniforms;
    bu.uT.value = tap > 0 && tap < 1 ? tap : 0;
    bu.uOrigin.value.copy(tmp.icon).addScaledVector(tmp.normal, 0.1);
    bu.uPixelRatio.value = viewport.dpr;
    // las partículas salen en el plano de la cara del expositor
    (bu.uBasis.value as THREE.Matrix3).setFromMatrix4(tmp.m4.makeRotationFromQuaternion(tmp.q));

    const rings = ringsRef.current!;
    rings.position.copy(tmp.icon).addScaledVector(tmp.normal, 0.06);
    rings.quaternion.copy(tmp.q);
    rings.children.forEach((r, k) => {
      const rt = (lt - 2.2 - k * 0.18) / 1.1;
      const on = rt > 0 && rt < 1;
      r.visible = on;
      if (!on) return;
      r.scale.setScalar(0.15 + ease(rt) * (1.3 + k * 0.45));
      ((r as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - rt) * 0.9;
    });
    const gt = (lt - 2.2) / 1.4;
    const glowMat = glowRef.current!.material as THREE.MeshBasicMaterial;
    glowMat.opacity = gt > 0 && gt < 1 ? Math.sin(gt * Math.PI) * 0.8 : 0;
  });

  const faceGeo = useMemo(
    () => new RoundedBoxGeometry(FACE_W, FACE_H, 0.06, 4, 0.05).translate(0, FACE_H / 2, 0),
    [],
  );
  const baseGeo = useMemo(() => new RoundedBoxGeometry(FACE_W, 0.05, 1.25, 3, 0.02), []);
  const phoneGeo = useMemo(() => new RoundedBoxGeometry(1.05, 2.12, 0.1, 6, 0.13), []);
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.82, 0.9, 64), []);
  const ringCenterY = FACE_H / 2 + (0.5 - 395 / 800) * FACE_H;

  return (
    <>
      <group ref={standRef}>
        <group ref={faceRef} position={[0, -1.7, 0]} rotation={[TILT, 0, 0]}>
          <mesh geometry={faceGeo} material={materials.body} />
          <mesh position={[0, FACE_H / 2, 0.032]}>
            <planeGeometry args={[FACE_W - 0.02, FACE_H - 0.02]} />
            <meshBasicMaterial map={faceTex} transparent toneMapped={false} />
          </mesh>
          {/* brillo del aro de colores al hacer tap */}
          <mesh ref={glowRef} position={[0.0, ringCenterY, 0.04]}>
            <ringGeometry args={[0.66, 0.84, 64]} />
            <meshBasicMaterial color="#B9A8FF" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
        <mesh geometry={baseGeo} material={materials.edge} position={[0, -1.72, -0.58]} />
      </group>

      <group ref={phoneRef}>
        <mesh geometry={phoneGeo} material={materials.phone} />
        <mesh position={[0, 0, 0.052]}>
          <planeGeometry args={[0.96, 2.0]} />
          <meshBasicMaterial map={screen.texture} transparent toneMapped={false} />
        </mesh>
      </group>

      <group ref={ringsRef}>
        {[0, 1, 2].map((k) => (
          <mesh key={k} geometry={ringGeo} visible={false}>
            <meshBasicMaterial
              color={k === 1 ? '#33C6F4' : '#7C5CFF'}
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      <primitive object={burst} frustumCulled={false} />
      <Ambient count={quality === 'full' ? 6000 : 2500} />
    </>
  );
}

/** Tope de 60 fps y pausa cuando el hero no se ve o la pestaña está oculta. */
function FrameLimiter() {
  const { invalidate, gl } = useThree();
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let inView = true;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!inView || document.hidden || now - last < FRAME_MS - 1) return;
      last = now;
      invalidate();
    };
    const io = new IntersectionObserver(([e]) => (inView = e.isIntersecting));
    io.observe(gl.domElement);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [gl, invalidate]);
  return null;
}

export default function HeroScene({ quality, onReady }: { quality: Quality; onReady: () => void }) {
  return (
    <Canvas
      aria-hidden="true"
      frameloop="demand"
      dpr={quality === 'full' ? [1, 1.5] : [1, 1.25]}
      camera={{ position: [0.75, 0.9, 7.4], fov: 42, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ pointerEvents: 'none' }}
    >
      <Suspense fallback={null}>
        <Scene quality={quality} onReady={onReady} />
      </Suspense>
      <FrameLimiter />
    </Canvas>
  );
}
