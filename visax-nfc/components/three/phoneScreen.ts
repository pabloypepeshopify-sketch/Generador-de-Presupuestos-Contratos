import * as THREE from 'three';

/*
 * Pantalla del móvil (textura dibujada en canvas 2D):
 *   idle   → "Acerca el móvil"
 *   review → valoración con estrellas que se rellenan (0–5)
 *   thanks → "¡Gracias por tu reseña!"
 */

export const SCREEN_W = 512;
export const SCREEN_H = 1066;

export type ScreenState = { mode: 'idle' | 'review' | 'thanks'; stars: number };

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function font(weight: number, size: number) {
  const sans = getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'system-ui, sans-serif';
  return `${weight} ${size}px ${sans}`;
}

export function createScreen() {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const draw = ({ mode, stars }: ScreenState) => {
    ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.save();
    roundRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 56);
    ctx.clip();

    if (mode === 'idle') {
      const g = ctx.createLinearGradient(0, 0, SCREEN_W, SCREEN_H);
      g.addColorStop(0, '#0B0B18');
      g.addColorStop(1, '#221650');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      ctx.fillStyle = '#F6F7FB';
      ctx.textAlign = 'center';
      ctx.font = font(300, 96);
      ctx.fillText('12:30', SCREEN_W / 2, 250);
      ctx.font = font(500, 26);
      ctx.fillStyle = 'rgba(246,247,251,0.7)';
      ctx.fillText('martes, 14 de mayo', SCREEN_W / 2, 300);
      // ondas NFC
      ctx.strokeStyle = '#33C6F4';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(SCREEN_W / 2 - 40, 640, 40 + k * 34, -Math.PI / 4, Math.PI / 4);
        ctx.globalAlpha = 1 - k * 0.25;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#F6F7FB';
      ctx.font = font(600, 34);
      ctx.fillText('Acerca el móvil', SCREEN_W / 2, 820);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      ctx.fillStyle = '#F1F3F4';
      ctx.fillRect(0, 0, SCREEN_W, 150);
      // Cabecera del negocio
      ctx.fillStyle = '#7C5CFF';
      ctx.beginPath();
      ctx.arc(96, 250, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = font(700, 38);
      ctx.fillText('T', 96, 264);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#202124';
      ctx.font = font(700, 36);
      ctx.fillText('Tu negocio', 160, 244);
      ctx.fillStyle = '#5F6368';
      ctx.font = font(400, 24);
      ctx.fillText('Valora tu experiencia', 160, 280);

      // Estrellas
      for (let i = 0; i < 5; i++) {
        star(ctx, 86 + i * 85, 420, 34);
        ctx.fillStyle = i < stars ? '#FBBC05' : '#DADCE0';
        ctx.fill();
      }

      if (mode === 'thanks') {
        ctx.fillStyle = '#34A853';
        ctx.beginPath();
        ctx.arc(SCREEN_W / 2, 640, 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(SCREEN_W / 2 - 30, 642);
        ctx.lineTo(SCREEN_W / 2 - 6, 666);
        ctx.lineTo(SCREEN_W / 2 + 34, 616);
        ctx.stroke();
        ctx.fillStyle = '#202124';
        ctx.textAlign = 'center';
        ctx.font = font(700, 34);
        ctx.fillText('¡Gracias por tu reseña!', SCREEN_W / 2, 790);
      } else {
        // Caja de texto y botón
        ctx.strokeStyle = '#DADCE0';
        ctx.lineWidth = 3;
        roundRect(ctx, 44, 500, SCREEN_W - 88, 230, 18);
        ctx.stroke();
        ctx.fillStyle = '#9AA0A6';
        ctx.font = font(400, 24);
        ctx.fillText('Comparte tu experiencia…', 70, 548);
        ctx.fillStyle = stars >= 5 ? '#1A73E8' : '#8AB4F8';
        roundRect(ctx, SCREEN_W - 230, 790, 186, 76, 38);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.font = font(600, 28);
        ctx.fillText('Publicar', SCREEN_W - 137, 838);
      }
    }
    ctx.restore();
    texture.needsUpdate = true;
  };

  draw({ mode: 'idle', stars: 0 });
  return { texture, draw };
}
