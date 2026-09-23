'use client';

import { Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { services } from '@/lib/services';
import {
  XP,
  XP_EVENTS,
  CAM_HERO,
  CAM_START,
  CARD_GAP,
  CARD_Z0,
  FOCUS_DIST,
  activeForCamZ,
  camZForServices,
  emit,
  smoothstep,
} from '@/lib/experience';
import { onIntroDone } from '@/lib/intro';
import { createParticleGeometry, createParticleMaterial } from './particles';
import { createEnvironment, createLogo } from './logo';
import { CARD_H, CARD_W, cardTransform, createCardMaterial, drawCardTexture } from './cards';

// Bloom solo en escritorio: su código ni se descarga en la versión ligera.
const Effects = lazy(() => import('./Effects'));

type Quality = 'full' | 'lite';

/* Línea de tiempo de la intro (segundos desde que arranca). */
const GATHER = 0.95; // el remolino se forma alrededor del logo
const BURST = 0.6; // explosión
const SETTLE = 1.5; // las partículas se asientan en la nube del hero
const FRAME_MS = 1000 / 60;
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(25)); // fov 50

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutQuart = (x: number) => 1 - Math.pow(1 - clamp01(x), 4);
const easeInOutCubic = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const damp = (dt: number, lambda: number) => 1 - Math.exp(-lambda * dt);

/** Puntero global (el canvas está detrás del contenido y no recibe eventos). */
const pointer = { x: 0, y: 0, mouse: false, overUI: true, moved: false };
const UI_SELECTOR = 'a, button, input, textarea, select, label, nav, header, [role="dialog"]';

function Scene({ quality }: { quality: Quality }) {
  const { gl, camera, size, viewport } = useThree();

  const env = useMemo(() => createEnvironment(gl), [gl]);
  const logo = useMemo(() => createLogo(env, quality), [env, quality]);
  const particleGeo = useMemo(() => createParticleGeometry(quality === 'full' ? 42000 : 12000), [quality]);
  const particleMat = useMemo(() => {
    const m = createParticleMaterial();
    m.uniforms.uSize.value = quality === 'full' ? 1 : 1.6;
    return m;
  }, [quality]);
  const cards = useMemo(
    () =>
      services.map((s, i) => {
        const mat = createCardMaterial(drawCardTexture(s, i));
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), mat);
        const t = cardTransform(i);
        mesh.position.copy(t.position);
        mesh.rotation.y = t.rotationY;
        mesh.userData = { i, slug: s.slug, baseY: t.position.y, active: 0, hover: 0 };
        mesh.visible = false;
        return mesh;
      }),
    [],
  );
  const flash = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uAmount: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uAmount; varying vec2 vUv;
        void main(){ float d = length(vUv - 0.5) * 2.0; float g = exp(-d * d * 5.0) * uAmount;
          vec3 c = mix(vec3(0.201, 0.107, 1.0), vec3(1.0), exp(-d * d * 14.0));
          gl_FragColor = vec4(c * g, g);
          #include <colorspace_fragment>
        }`,
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(30, 30), m);
  }, []);

  const timeline = useRef({ requested: false, start: -1, heroFired: false, ready: false });
  const hovered = useRef(-1);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const mouse = useRef({ x: 0, y: 0, hover: 0 });

  // Las fuentes pueden terminar de cargar después: redibuja las texturas con ellas.
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => {
      if (!alive) return;
      cards.forEach((mesh, i) => {
        const u = (mesh.material as THREE.ShaderMaterial).uniforms.uMap;
        const old = u.value as THREE.Texture;
        u.value = drawCardTexture(services[i], i);
        old.dispose();
      });
    });
    return () => {
      alive = false;
    };
  }, [cards]);

  // Arranque de la intro cuando el preloader se retira (o enseguida si no hay).
  useEffect(() => onIntroDone(() => (timeline.current.requested = true)), []);

  // Puntero y clic sobre las tarjetas 3D
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      pointer.mouse = e.pointerType === 'mouse';
      pointer.overUI = !!(e.target as Element | null)?.closest?.(UI_SELECTOR);
      pointer.moved = true;
    };
    const onClick = (e: MouseEvent) => {
      if (hovered.current < 0 || (e.target as Element | null)?.closest?.(UI_SELECTOR)) return;
      emit(XP_EVENTS.OPEN_SERVICE, services[hovered.current].slug);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('click', onClick);
      document.body.style.cursor = '';
    };
  }, []);

  useEffect(
    () => () => {
      particleGeo.dispose();
      particleMat.dispose();
      env.dispose();
      logo.materials.forEach((m) => m.dispose());
      cards.forEach((c) => {
        const m = c.material as THREE.ShaderMaterial;
        (m.uniforms.uMap.value as THREE.Texture).dispose();
        m.dispose();
        c.geometry.dispose();
      });
    },
    [particleGeo, particleMat, env, logo, cards],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 20);
    const tl = timeline.current;

    if (!tl.ready) {
      tl.ready = true;
      requestAnimationFrame(() => emit(XP_EVENTS.READY));
    }
    if (tl.requested && tl.start < 0) {
      // Si se recarga a media página, la intro se da por vista.
      tl.start = XP.hero > 0.2 || XP.services > 0 ? t - 10 : t;
    }

    // ── Intro: remolino → explosión → asentamiento ──
    let gather = 0;
    let burst = 0;
    let settle = 0;
    let flashAmt = 0;
    if (tl.start >= 0) {
      const it = t - tl.start;
      gather = smoothstep(0, 0.6, it);
      burst = easeOutQuart((it - GATHER) / BURST);
      settle = easeInOutCubic((it - GATHER - BURST * 0.5) / SETTLE);
      flashAmt = it > GATHER ? Math.exp(-(it - GATHER) * 4.5) * clamp01((it - GATHER) / 0.05) : 0;
      if (!tl.heroFired && it > GATHER + 0.3) {
        tl.heroFired = true;
        document.documentElement.setAttribute('data-hero', 'in');
        emit(XP_EVENTS.HERO_IN);
      }
    }

    // ── Scroll: hero → pasillo de servicios ──
    const heroP = XP.hero;
    const cluster = smoothstep(0.28, 0.95, heroP);
    // Encaje según la pantalla: en vertical (móvil) la cámara se aleja para que la
    // tarjeta quepa (~86 % del ancho); en horizontal la tarjeta queda a la derecha
    // del índice de servicios.
    const aspect = size.width / Math.max(1, size.height);
    const wide = aspect >= 1.1;
    const fitDist = (CARD_W * 0.5) / (TAN_HALF_FOV * aspect * 0.86);
    const extra = wide ? 0 : Math.max(0, fitDist - FOCUS_DIST);
    const targetZ =
      XP.services > 0
        ? camZForServices(XP.services) + extra
        : CAM_HERO - (CAM_HERO - (CAM_START + extra)) * smoothstep(0, 1, heroP);
    const k = damp(dt, 7);
    camera.position.z += (targetZ - camera.position.z) * k;
    const pathZ = camera.position.z - extra;

    const focus = (CARD_Z0 + FOCUS_DIST - pathZ) / CARD_GAP;
    const nearest = Math.max(0, Math.min(cards.length - 1, Math.round(focus)));
    const inCorridor = smoothstep(0.7, 1, heroP);
    const m = mouse.current;
    const camX = (cards[nearest].position.x - (wide ? 1.1 : 0)) * inCorridor;
    const camY = inCorridor * (wide ? -0.35 : -0.9);
    camera.position.x += (camX + m.x * 0.3 - camera.position.x) * damp(dt, 2.6);
    camera.position.y += (camY + m.y * 0.22 - camera.position.y) * damp(dt, 2.6);
    camera.lookAt(camera.position.x, camera.position.y * 0.3, camera.position.z - 10);

    // ── Puntero ──
    const hoverTarget = pointer.mouse && !pointer.overUI ? 1 : 0;
    m.x += ((pointer.mouse ? pointer.x : 0) - m.x) * damp(dt, 5);
    m.y += ((pointer.mouse ? pointer.y : 0) - m.y) * damp(dt, 5);
    m.hover += (hoverTarget - m.hover) * damp(dt, 4);

    // ── Partículas ──
    const u = particleMat.uniforms;
    u.uTime.value = t;
    u.uGather.value = gather;
    u.uBurst.value = burst;
    u.uSettle.value = settle;
    u.uCluster.value = cluster;
    u.uFlash.value = flashAmt;
    u.uMouse.value.set(m.x, m.y);
    u.uHover.value = m.hover * (1 - cluster * 0.6);
    u.uAspect.value = size.width / Math.max(1, size.height);
    u.uPixelRatio.value = viewport.dpr;

    // ── Logo: aparece, gira, se impulsa con la explosión, se retira detrás del
    //    titular (más oscuro, para no competir con el texto) y se va con el scroll ──
    const g = logo.group;
    const leave = smoothstep(0.1, 0.5, heroP);
    // En vertical, más pequeño y más arriba: detrás del titular, nunca del párrafo.
    const fit = wide ? 1 : Math.max(0.6, aspect * 1.45);
    const scale = (0.55 + 0.45 * gather) * (1 - leave) * (1 + settle * 0.25) * fit;
    g.visible = scale > 0.01;
    g.scale.setScalar(scale);
    g.position.set(0, 0.35 + settle * (wide ? 0.9 : 2.4) + leave * 3.5, -settle * 4.5 - leave * 6);
    g.rotation.y = t * 0.35 + Math.sin(t * 0.7) * 0.25 + burst * Math.PI * 2 * (1 - settle * 0.2);
    g.rotation.x = Math.sin(t * 0.5) * 0.12 + m.y * 0.2;
    logo.materials.forEach((mat) => {
      mat.opacity = gather;
      mat.envMapIntensity = 1.7 - settle * 0.95;
    });

    flash.visible = flashAmt > 0.001;
    (flash.material as THREE.ShaderMaterial).uniforms.uAmount.value = flashAmt * 1.6;
    flash.position.set(0, 0.35, 0.5);
    flash.quaternion.copy(camera.quaternion);

    // ── Tarjetas ──
    const cardsIn = smoothstep(0.62, 1, heroP);
    const active = heroP >= 0.99 || XP.services > 0 ? activeForCamZ(pathZ) : -1;
    if (active !== XP.active) {
      XP.active = active;
      emit(XP_EVENTS.ACTIVE_CARD, active);
    }

    // Hover por raycast (solo ratón, fuera de elementos de la interfaz)
    let hit = -1;
    if (pointer.mouse && !pointer.overUI && cardsIn > 0.5) {
      ndc.set(pointer.x, pointer.y);
      raycaster.setFromCamera(ndc, camera);
      const visible = cards.filter((c) => c.visible && (c.material as THREE.ShaderMaterial).uniforms.uOpacity.value > 0.4);
      const hits = raycaster.intersectObjects(visible, false);
      if (hits.length) hit = hits[0].object.userData.i as number;
    }
    if (hit !== hovered.current) {
      hovered.current = hit;
      document.body.style.cursor = hit >= 0 ? 'pointer' : '';
    }

    cards.forEach((c, i) => {
      const dz = camera.position.z - c.position.z; // > 0: por delante de la cámara
      const op = smoothstep(48, 26, dz) * smoothstep(1.8, 4.6, dz) * cardsIn;
      c.visible = op > 0.002;
      if (!c.visible) return;
      const ud = c.userData;
      ud.active += ((i === active ? 1 : 0) - ud.active) * damp(dt, 5);
      ud.hover += ((i === hit ? 1 : 0) - ud.hover) * damp(dt, 8);
      c.position.y = ud.baseY + Math.sin(t * 0.6 + i * 1.7) * 0.09;
      c.rotation.z = Math.sin(t * 0.4 + i) * 0.015;
      const cu = (c.material as THREE.ShaderMaterial).uniforms;
      cu.uTime.value = t;
      cu.uOpacity.value = op;
      cu.uActive.value = ud.active;
      cu.uHover.value = ud.hover;
    });
  });

  return (
    <>
      <points geometry={particleGeo} material={particleMat} frustumCulled={false} />
      <primitive object={logo.group} />
      <primitive object={flash} />
      {cards.map((c) => (
        <primitive key={c.uuid} object={c} />
      ))}
    </>
  );
}

/**
 * Bucle propio (frameloop "demand"): tope de 60 fps aunque el monitor vaya
 * a 120 Hz, y pausa con la pestaña oculta o con el canvas ya desvanecido.
 */
function FrameLimiter() {
  const { invalidate } = useThree();
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || XP.fade <= 0.001 || now - last < FRAME_MS - 1) return;
      last = now;
      invalidate();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [invalidate]);
  return null;
}

export default function ExperienceCanvas({ quality }: { quality: Quality }) {
  return (
    <Canvas
      aria-hidden="true"
      frameloop="demand"
      dpr={quality === 'full' ? [1, 1.5] : [1, 1.25]}
      camera={{ position: [0, 0, CAM_HERO], fov: 50, near: 0.1, far: 140 }}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor('#06060B')}
      style={{ pointerEvents: 'none' }}
    >
      <Scene quality={quality} />
      {quality === 'full' && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
      <FrameLimiter />
    </Canvas>
  );
}
