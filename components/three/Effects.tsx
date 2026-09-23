'use client';

import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

/** Postprocesado de escritorio: bloom (el brillo de la explosión y los corales) y viñeta. */
export default function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={1.3} luminanceThreshold={0.16} luminanceSmoothing={0.3} radius={0.8} />
      <Vignette offset={0.22} darkness={0.72} />
    </EffectComposer>
  );
}
