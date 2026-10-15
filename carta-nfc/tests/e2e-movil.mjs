// E2E del modo "móvil junto al TPV" (web/movil.html) contra la BD local con el restaurante demo.
// Llegada de pedidos y avisos, sonido (se cuentan los pitidos), Apuntado/Deshacer, Atendido, pausa,
// reinicio (pide tocar para activar el sonido) y aviso de "sin conexión".
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || '8787';
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS || '';
const psql = (sql) => execSync(`psql -h /tmp -p 54329 -U postgres -d carta_test -tAq -c "${sql.replace(/"/g, '\\"')}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('FALLO: ' + m); console.log('  ✓ ' + m); };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

execSync('bash ./db-local.sh --demo', { cwd: DIR, stdio: 'ignore' });
const srv = spawn('node', ['servidor-local.mjs'], { cwd: DIR, env: { ...process.env, PORT }, stdio: 'ignore' });
await espera(1500);
const mesa = (n) => psql(`select m.codigo from carta.mesas m join carta.restaurantes r on r.id = m.restaurante_id where r.slug = 'demo' and m.nombre = '${n}'`);
const prod = (n) => psql(`select id from carta.productos where nombre = '${n}'`);
const pedir = (m, lineas, nota) => {
  const r = JSON.parse(psql(`set role anon; select public.carta_pedir('${mesa(m)}', '${JSON.stringify(lineas)}'::jsonb, ${nota ? `'${nota}'` : 'null'})`));
  return { ...r, id: psql(`select id from carta.pedidos where token = '${r.token}'`) };
};
const estado = (id) => psql(`select estado from carta.pedidos where id = '${id}'`);

const browser = await chromium.launch();
const errores = [];
try {
  const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  // cuenta los pitidos (osciladores) sin necesidad de altavoz
  await ctx.addInitScript(() => {
    window.__pitidos = 0;
    const C = window.AudioContext || window.webkitAudioContext;
    const orig = C.prototype.createOscillator;
    C.prototype.createOscillator = function () { window.__pitidos++; return orig.call(this); };
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errores.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  const pitidos = () => page.evaluate(() => window.__pitidos);

  console.log('Arranque');
  await page.goto(`${BASE}/movil.html?r=demo&k=demo-cocina`);
  await page.locator('#app:not([hidden])').waitFor();
  ok(!page.url().includes('k='), 'la clave no se queda en la barra de direcciones');
  ok(await page.locator('#activar').isVisible(), 'al abrir pide tocar para activar el sonido (lo dice claro)');
  await page.locator('#b-activar').click();
  ok(await page.locator('#activar').isHidden(), 'tras tocar, desaparece');
  await page.locator('#b-sonido.on').waitFor();
  ok(true, 'sonido activado');
  ok(/Sin pedidos nuevos/.test(await page.locator('#lista').innerText()), 'pantalla vacía clara');

  console.log('Llega un pedido');
  const antes = await pitidos();
  const p1 = pedir('Mesa 2', [{ producto_id: prod('Tapa de croquetas'), cantidad: 2, nota: 'sin cebolla' }, { producto_id: prod('Caña'), cantidad: 1 }], 'somos 3');
  await page.locator('.card [data-apuntar]').waitFor({ timeout: 8000 });
  const card = page.locator('.card').first();
  const txt = await card.innerText();
  ok(/Mesa 2/.test(txt) && /2×\s*Tapa de croquetas/.test(txt) && /sin cebolla/.test(txt) && /somos 3/.test(txt), 'mesa, platos, notas y nota general');
  ok(parseFloat(await card.locator('.mesa').evaluate((e) => getComputedStyle(e).fontSize)) >= 36, 'mesa en letra grande');
  ok(parseFloat(await card.locator('li').first().evaluate((e) => getComputedStyle(e).fontSize)) >= 24, 'platos en letra grande');
  ok((await pitidos()) >= antes + 6, 'suena al llegar');
  ok(/^\(1\)/.test(await page.title()), 'el título cuenta los pendientes');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/movil-pedido.png` });

  console.log('Repite el aviso si nadie lo apunta');
  const p2 = await pitidos();
  await espera(21000);
  ok((await pitidos()) > p2, 'vuelve a sonar a los 20 s');

  console.log('Apuntado');
  await page.locator(`[data-apuntar="${p1.id}"]`).click();
  await page.locator('.card [data-apuntar]').waitFor({ state: 'detached' });
  ok(estado(p1.id) === 'preparando', 'el cliente lo ve "En preparación"');
  ok(/Mesa 2/.test(await page.locator('#hechos').innerText()), 'queda en "últimos apuntados"');
  const p3 = await pitidos();
  await page.locator(`[data-deshacer="${p1.id}"]`).click();
  await page.locator(`[data-apuntar="${p1.id}"]`).waitFor();
  ok(estado(p1.id) === 'nuevo', 'deshacer lo devuelve a nuevos');
  await espera(3500);
  ok((await pitidos()) === p3, 'deshacer no hace sonar otra vez');
  await page.locator(`[data-apuntar="${p1.id}"]`).click();
  await page.locator('.card [data-apuntar]').waitFor({ state: 'detached' });

  console.log('Avisos');
  psql(`set role anon; select public.carta_avisar('${mesa('Mesa 2')}', 'cuenta')`);
  await page.locator('.card.aviso').waitFor({ timeout: 8000 });
  ok(/Pide la cuenta · 8,20/.test(await page.locator('.card.aviso').innerText()), 'pide la cuenta con el total de la mesa');
  await page.locator('[data-atender]').click();
  await page.locator('.card.aviso').waitFor({ state: 'detached' });
  ok(psql("select estado from carta.pedidos where tipo = 'cuenta'") === 'servido', 'atendido');

  console.log('Pausa');
  await page.locator('#b-pausa').click();
  await page.locator('#pausado:not([hidden])').waitFor();
  ok(psql("select pedidos_abiertos from carta.restaurantes where slug = 'demo'") === 'f', 'pausar pedidos');
  await page.locator('#b-pausa').click();
  await page.locator('#pausado').waitFor({ state: 'hidden' });

  console.log('Reinicio del móvil');
  await page.reload();
  await page.locator('#app:not([hidden])').waitFor();
  ok(await page.locator('#activar').isVisible(), 'tras reiniciar sigue dentro (sin clave) y pide tocar para el sonido');
  const p4 = pedir('Terraza 1', [{ producto_id: prod('Café'), cantidad: 1 }]);
  await page.locator(`[data-apuntar="${p4.id}"]`).waitFor({ timeout: 8000 });
  ok(await page.locator('#activar').isVisible(), 'un pedido con el sonido sin activar sigue mostrando el aviso de tocar');
  await page.locator('#b-activar').click();

  console.log('Sin conexión');
  await page.route('**/rest/v1/rpc/carta_cocina', (r) => r.abort());
  await page.locator('#offline:not([hidden])').waitFor({ timeout: 15000 });
  ok(true, 'avisa "Sin conexión" si deja de llegar información');
  await page.unroute('**/rest/v1/rpc/carta_cocina');
  await page.locator('#offline').waitFor({ state: 'hidden', timeout: 10000 });
  ok(true, 'se recupera solo');

  await page.locator('#b-mas').click();
  ok(/Pantalla siempre encendida/.test(await page.locator('#mas').innerText()), 'ayuda para que la pantalla no se apague');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/movil-mas.png` });
  ok(errores.length === 0, 'sin errores JS' + (errores.length ? ': ' + errores.join(' | ') : ''));
  console.log('\nE2E MÓVIL OK');
} finally {
  await browser.close();
  srv.kill();
}
