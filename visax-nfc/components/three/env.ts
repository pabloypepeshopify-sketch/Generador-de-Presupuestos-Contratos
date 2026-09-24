import * as THREE from 'three';

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
