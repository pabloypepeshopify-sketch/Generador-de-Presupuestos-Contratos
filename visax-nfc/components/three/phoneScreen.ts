import * as THREE from 'three';

/*
 * Pantalla del móvil (textura dibujada en canvas 2D):
 *   idle   → "Acerca el móvil"
 *   review → valoración con estrellas que se rellenan (0–5)
 *   thanks → "¡Gracias por tu reseña!"
 *   menu   → carta digital (los platos aparecen uno a uno)
 *   added  → plato añadido y barra "Pedir"
 *   sent   → "¡Pedido enviado a cocina!"
 */

export const SCREEN_W = 512;
export const SCREEN_H = 1066;

export type ScreenMode = 'idle' | 'review' | 'thanks' | 'menu' | 'added' | 'sent';
export type ScreenState = { mode: ScreenMode; stars: number; items: number };

// Platos de ejemplo de la carta (solo para la animación)
const DISHES = [
  { name: 'Croquetas caseras', desc: 'Jamón ibérico · 6 uds', price: '8,50 €' },
  { name: 'Ensalada de burrata', desc: 'Tomate, pesto y albahaca', price: '11,00 €' },
  { name: 'Hamburguesa de la casa', desc: 'Ternera, cheddar y bacon', price: '13,90 €' },
  { name: 'Tarta de queso', desc: 'Al horno, con frutos rojos', price: '5,50 €' },
];

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

function check(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, width: number) {
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.43, cy + r * 0.03);
  ctx.lineTo(cx - r * 0.09, cy + r * 0.37);
  ctx.lineTo(cx + r * 0.49, cy - r * 0.34);
  ctx.stroke();
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

  /** Carta digital con pedido (modos menu, added y sent). */
  const drawMenu = (mode: ScreenMode, items: number) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    if (mode === 'sent') {
      ctx.fillStyle = '#F6F4FF';
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      ctx.fillStyle = '#34A853';
      ctx.beginPath();
      ctx.arc(SCREEN_W / 2, 430, 86, 0, Math.PI * 2);
      ctx.fill();
      check(ctx, SCREEN_W / 2, 430, 70, 16);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#16131F';
      ctx.font = font(700, 40);
      ctx.fillText('¡Pedido enviado!', SCREEN_W / 2, 600);
      ctx.fillStyle = '#5F6368';
      ctx.font = font(400, 26);
      ctx.fillText('Ya está en cocina', SCREEN_W / 2, 648);
      ctx.fillStyle = '#7C5CFF';
      roundRect(ctx, SCREEN_W / 2 - 150, 700, 300, 64, 32);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = font(600, 26);
      ctx.fillText('Mesa 4 · 1 plato', SCREEN_W / 2, 742);
      return;
    }

    // Cabecera del local
    ctx.fillStyle = '#16131F';
    ctx.fillRect(0, 0, SCREEN_W, 200);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(700, 36);
    ctx.fillText('Tu restaurante', 40, 138);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    roundRect(ctx, SCREEN_W - 160, 100, 120, 52, 26);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = font(600, 24);
    ctx.fillText('Mesa 4', SCREEN_W - 100, 134);

    // Pestañas
    ctx.textAlign = 'left';
    ['Entrantes', 'Principales', 'Postres'].forEach((t, i) => {
      ctx.fillStyle = i === 0 ? '#16131F' : '#9AA0A6';
      ctx.font = font(i === 0 ? 700 : 500, 24);
      ctx.fillText(t, 40 + i * 160, 256);
    });
    ctx.fillStyle = '#7C5CFF';
    roundRect(ctx, 40, 272, 112, 6, 3);
    ctx.fill();

    // Platos
    DISHES.slice(0, items).forEach((d, i) => {
      const y = 320 + i * 150;
      ctx.fillStyle = '#F4F4F7';
      roundRect(ctx, 28, y, SCREEN_W - 56, 132, 22);
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#16131F';
      ctx.font = font(700, 27);
      ctx.fillText(d.name, 52, y + 48);
      ctx.fillStyle = '#6B7086';
      ctx.font = font(400, 21);
      ctx.fillText(d.desc, 52, y + 82);
      ctx.fillStyle = '#16131F';
      ctx.font = font(600, 24);
      ctx.fillText(d.price, 52, y + 114);
      const added = mode === 'added' && i === 0;
      ctx.fillStyle = added ? '#34A853' : '#7C5CFF';
      ctx.beginPath();
      ctx.arc(SCREEN_W - 84, y + 66, 32, 0, Math.PI * 2);
      ctx.fill();
      if (added) check(ctx, SCREEN_W - 84, y + 66, 30, 7);
      else {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(SCREEN_W - 98, y + 66);
        ctx.lineTo(SCREEN_W - 70, y + 66);
        ctx.moveTo(SCREEN_W - 84, y + 52);
        ctx.lineTo(SCREEN_W - 84, y + 80);
        ctx.stroke();
      }
    });

    // Barra del pedido
    if (mode === 'added') {
      ctx.fillStyle = '#7C5CFF';
      roundRect(ctx, 28, SCREEN_H - 150, SCREEN_W - 56, 96, 48);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.font = font(600, 26);
      ctx.fillText('1 plato · 8,50 €', 64, SCREEN_H - 92);
      ctx.textAlign = 'right';
      ctx.font = font(700, 28);
      ctx.fillText('Pedir  →', SCREEN_W - 64, SCREEN_H - 92);
    }
  };

  const draw = ({ mode, stars, items }: ScreenState) => {
    ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.save();
    roundRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 56);
    ctx.clip();

    if (mode === 'menu' || mode === 'added' || mode === 'sent') {
      drawMenu(mode, items);
    } else if (mode === 'idle') {
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

  draw({ mode: 'idle', stars: 0, items: 0 });
  return { texture, draw };
}
