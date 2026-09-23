import * as THREE from 'three';
import type { Service } from '@/lib/services';
import { CARD_GAP, CARD_Z0 } from '@/lib/experience';

/*
 * Los 9 servicios como paneles de cristal flotando en el pasillo 3D.
 * El contenido se dibuja en un canvas 2D con las mismas fuentes de la web
 * (Fraunces / Inter vía next/font) y se usa como textura.
 */

export const CARD_W = 4.4;
export const CARD_H = 2.75;
const TEX_W = 1024;
const TEX_H = Math.round((TEX_W * CARD_H) / CARD_W);

export function cardTransform(i: number) {
  const side = i % 2 === 0 ? -1 : 1;
  return {
    position: new THREE.Vector3(side * 2.5, ((i % 3) - 1) * 0.35, CARD_Z0 - CARD_GAP * i),
    rotationY: -side * 0.3,
  };
}

function fontVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…');
  }
  return lines;
}

export function drawCardTexture(service: Service, i: number) {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d')!;
  const display = fontVar('--font-display', 'Georgia, serif');
  const sans = fontVar('--font-sans', 'system-ui, sans-serif');

  // Fondo de cristal oscuro
  const bg = ctx.createLinearGradient(0, 0, TEX_W, TEX_H);
  bg.addColorStop(0, 'rgba(22, 20, 44, 0.92)');
  bg.addColorStop(1, 'rgba(8, 8, 16, 0.95)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Arte generativo a la derecha: halos y líneas de flujo en la paleta
  const hue = i % 3;
  const glowA = ['124,92,255', '51,198,244', '63,125,251'][hue];
  const glowB = ['51,198,244', '124,92,255', '124,92,255'][hue];
  let g = ctx.createRadialGradient(TEX_W * 0.82, TEX_H * 0.3, 0, TEX_W * 0.82, TEX_H * 0.3, TEX_W * 0.45);
  g.addColorStop(0, `rgba(${glowA},0.55)`);
  g.addColorStop(1, `rgba(${glowA},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  g = ctx.createRadialGradient(TEX_W * 0.95, TEX_H * 0.95, 0, TEX_W * 0.95, TEX_H * 0.95, TEX_W * 0.4);
  g.addColorStop(0, `rgba(${glowB},0.4)`);
  g.addColorStop(1, `rgba(${glowB},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 26; k++) {
    ctx.beginPath();
    const y0 = TEX_H * (0.05 + k * 0.035);
    ctx.moveTo(TEX_W * 0.55, y0);
    for (let x = 0; x <= 1; x += 0.05) {
      const px = TEX_W * (0.55 + x * 0.45);
      const py = y0 + Math.sin(x * 6 + k * 0.5 + i) * 18 + x * x * 40;
      ctx.lineTo(px, py);
    }
    ctx.strokeStyle = `rgba(${k % 2 ? glowA : glowB},${0.05 + (k % 5) * 0.02})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  const pad = 64;
  // Número y etiqueta
  ctx.fillStyle = '#33C6F4';
  ctx.font = `600 26px ${sans}`;
  ctx.fillText(String(i + 1).padStart(2, '0'), pad, pad + 20);
  ctx.fillStyle = 'rgba(174,180,198,0.8)';
  ctx.font = `500 20px ${sans}`;
  ctx.fillText('S E R V I C I O', pad + 52, pad + 18);

  // Título
  ctx.fillStyle = '#F6F7FB';
  ctx.font = `500 62px ${display}`;
  const titleLines = wrap(ctx, service.title, TEX_W * 0.62, 2);
  titleLines.forEach((l, k) => ctx.fillText(l, pad, pad + 118 + k * 70));

  // Descripción
  ctx.fillStyle = '#AEB4C6';
  ctx.font = `400 25px ${sans}`;
  const y0 = pad + 118 + titleLines.length * 70 + 8;
  wrap(ctx, service.description, TEX_W * 0.6, 3).forEach((l, k) => ctx.fillText(l, pad, y0 + k * 36));

  // Resultado con degradado de marca
  const ry = TEX_H - pad;
  const rg = ctx.createLinearGradient(pad, 0, pad + 520, 0);
  rg.addColorStop(0, '#33C6F4');
  rg.addColorStop(1, '#7C5CFF');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(pad + 6, ry - 9, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `600 27px ${sans}`;
  ctx.fillText(service.result, pad + 24, ry);

  // Llamada a la acción
  ctx.fillStyle = 'rgba(246,247,251,0.85)';
  ctx.font = `600 22px ${sans}`;
  const cta = 'Ver detalle  →';
  ctx.fillText(cta, TEX_W - pad - ctx.measureText(cta).width, ry);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = -mv.xyz;
    vNormalV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uActive;
  uniform float uHover;
  uniform float uOpacity;
  uniform float uAspect;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewPos;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float d = sdRoundBox(p, vec2(uAspect, 1.0) * 0.5, 0.07);
    float mask = 1.0 - smoothstep(-0.003, 0.003, d);
    if (mask < 0.01) discard;

    vec3 tex = texture2D(uMap, vUv).rgb;
    // Borde luminoso violeta/cian (más intenso enfocada o con el ratón encima)
    float edge = smoothstep(-0.035, 0.0, d);
    vec3 edgeCol = mix(vec3(0.201, 0.107, 1.0), vec3(0.033, 0.565, 0.905), vUv.y); // violeta → cian (lineal)
    float glow = 0.35 + uActive * 0.9 + uHover * 0.6;
    // Reflejo que barre el cristal
    float band = fract(vUv.x * 0.7 + vUv.y * 0.35 - uTime * 0.07);
    float sheen = smoothstep(0.0, 0.04, band) * smoothstep(0.12, 0.04, band) * 0.1;
    // Fresnel suave según el ángulo de visión
    float fres = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewPos))), 3.0);

    vec3 col = tex * (0.78 + uActive * 0.3 + uHover * 0.15);
    col += edgeCol * edge * glow;
    col += vec3(0.9, 0.92, 1.0) * sheen;
    col += edgeCol * fres * 0.35;
    gl_FragColor = vec4(col, mask * uOpacity * 0.96);
    #include <colorspace_fragment>
  }
`;

export function createCardMaterial(map: THREE.Texture) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uMap: { value: map },
      uTime: { value: 0 },
      uActive: { value: 0 },
      uHover: { value: 0 },
      uOpacity: { value: 0 },
      uAspect: { value: CARD_W / CARD_H },
    },
  });
}
