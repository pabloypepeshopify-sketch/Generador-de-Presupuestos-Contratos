'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';

const CYAN = new THREE.Color('#33C6F4');
const BLUE = new THREE.Color('#3F7DFB');
const VIOLET = new THREE.Color('#7C5CFF');

/** Nube de partículas con degradado de marca que reacciona al ratón. */
function ParticleField({ count = 2600 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tmp = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Distribución esférica con algo de ruido radial
      const r = 4.2 * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions.set([x, y, z], i * 3);

      // Color según la altura (degradado cian -> azul -> violeta)
      const t = (y + 4.2) / 8.4;
      if (t < 0.5) tmp.copy(CYAN).lerp(BLUE, t * 2);
      else tmp.copy(BLUE).lerp(VIOLET, (t - 0.5) * 2);
      colors.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    return { positions, colors };
  }, [count]);

  useFrame((state, delta) => {
    if (!points.current) return;
    points.current.rotation.y += delta * 0.05;
    points.current.rotation.x += delta * 0.015;
    // Parallax suave hacia el puntero
    const { x, y } = state.pointer;
    points.current.rotation.y += (x * 0.35 - points.current.rotation.y * 0) * 0;
    points.current.position.x += (x * 0.4 - points.current.position.x) * 0.03;
    points.current.position.y += (y * 0.3 - points.current.position.y) * 0.03;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.028}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Malla wireframe luminosa que flota en el centro. */
function CoreMesh() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += delta * 0.12;
    mesh.current.rotation.z += delta * 0.05;
  });
  return (
    <Float speed={1.4} rotationIntensity={0.5} floatIntensity={0.9}>
      <Icosahedron ref={mesh} args={[1.5, 1]}>
        <meshBasicMaterial color="#5A5CF5" wireframe transparent opacity={0.28} />
      </Icosahedron>
    </Float>
  );
}

function Rig() {
  const { camera } = useThree();
  useFrame((state) => {
    camera.position.x += (state.pointer.x * 0.6 - camera.position.x) * 0.04;
    camera.position.y += (state.pointer.y * 0.4 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function HeroCanvas({ quality = 'high' }: { quality?: 'high' | 'low' }) {
  const count = quality === 'low' ? 1100 : 2600;
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 55 }}
      dpr={quality === 'low' ? 1 : [1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.6} />
      <ParticleField count={count} />
      <CoreMesh />
      <Rig />
    </Canvas>
  );
}
