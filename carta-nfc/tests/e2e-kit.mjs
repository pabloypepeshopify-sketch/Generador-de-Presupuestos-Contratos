// E2E del kit de instalación (web/kit.html) contra la BD local con el restaurante demo.
// Comprueba los adhesivos por mesa (A4 e imprenta), la carta general y la imagen para la galería.
//   node e2e-kit.mjs        PDF=/carpeta  para guardar los PDF generados
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || '8787';
const BASE = `http://localhost:${PORT}`;
const psql = (sql) => execSync(`psql -h /tmp -p 54329 -U postgres -d carta_test -tAq -c "${sql}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('FALLO: ' + m); console.log('  ✓ ' + m); };

execSync('bash ./db-local.sh --demo', { cwd: DIR, stdio: 'ignore' });
psql("update carta.restaurantes set admin_hash = carta._hash('admin-demo-local') where slug = 'demo'");
const srv = spawn('node', ['servidor-local.mjs'], { cwd: DIR, env: { ...process.env, PORT }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
const browser = await chromium.launch();
const errores = [];
try {
  console.log('Sin sesión');
  const p0 = await browser.newPage();
  await p0.goto(BASE + '/kit.html');
  await p0.locator('#err:not([hidden])').waitFor();
  ok(/Gestión/.test(await p0.locator('#err').innerText()), 'sin sesión de gestión pide entrar desde Gestión');

  console.log('Con sesión de gestión');
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('carta:admin', JSON.stringify({ slug: 'demo', clave: 'admin-demo-local' })));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await page.goto(BASE + '/admin.html');
  await page.locator('[data-tab="mesas"]').click();
  ok(await page.locator('#kit-instalacion').getAttribute('href') === '/kit.html', 'botón "Kit de instalación" en Mesas y NFC');
  await page.goto(BASE + '/kit.html');
  await page.locator('.ad').first().waitFor();
  const mesas = +psql("select count(*) from carta.mesas m join carta.restaurantes r on r.id = m.restaurante_id where r.slug = 'demo' and m.activa");
  ok(await page.locator('.ad').count() === mesas, `un adhesivo por mesa activa (${mesas})`);
  ok(await page.locator('.ad .qr svg').count() === mesas && await page.locator('.ad .nfc').count() === mesas, 'cada adhesivo lleva QR y zona del NFC');
  const codigo = psql("select m.codigo from carta.mesas m join carta.restaurantes r on r.id = m.restaurante_id where r.slug = 'demo' and m.nombre = 'Mesa 3'");
  ok((await page.locator('.ad[data-item="Mesa 3"] .mesa').innerText()) === 'Mesa 3', 'nombre de la mesa en grande');
  ok(/Acerca tu móvil o escanea/.test(await page.locator('.ad').first().innerText()), 'texto "Acerca tu móvil o escanea"');
  ok(await page.locator('.hoja.a4').count() === Math.ceil(mesas / 6), 'A4 mediano: 6 por hoja');
  await page.selectOption('#k-tam', 's');
  ok(await page.locator('.hoja.a4').count() === Math.ceil(mesas / 12), 'A4 pequeño: 12 por hoja');
  // ningún adhesivo se sale de la hoja ni pisa a otro
  const solapes = await page.evaluate(() => [...document.querySelectorAll('.hoja')].some((h) => {
    const hb = h.getBoundingClientRect();
    const r = [...h.querySelectorAll('.ad')].map((a) => a.getBoundingClientRect());
    return r.some((a, i) => a.right > hb.right + 1 || a.bottom > hb.bottom + 1 || r.some((b, j) => j > i && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
  }));
  ok(!solapes, 'los adhesivos caben en el A4 sin pisarse');
  // el contenido de cada adhesivo cabe dentro (nada recortado)
  for (const tam of ['s', 'm', 'l']) {
    await page.selectOption('#k-tam', tam);
    const fuera = await page.evaluate(() => [...document.querySelectorAll('.ad')].some((a) => {
      const b = a.getBoundingClientRect();
      return [...a.querySelectorAll('.cab,.mesa,.nfc,.qr,.pie')].some((e) => { const r = e.getBoundingClientRect(); return r.bottom > b.bottom + .5 || r.right > b.right + .5 || r.top < b.top - .5; });
    }));
    ok(!fuera, `tamaño ${tam}: el contenido cabe en el adhesivo`);
  }
  await page.check('#k-general');
  ok(await page.locator('.ad').count() === mesas + 1 && await page.locator('.ad[data-item="Carta"]').count() === 1, 'añade el adhesivo de la carta general');
  ok(await page.locator('#k-aviso-libre').isHidden(), 'sin aviso si está "permitir elegir mesa"');
  const qr = await page.locator('.ad[data-item="Mesa 3"] .qr svg').innerHTML();
  ok(qr.includes('<path') || qr.includes('<rect'), 'QR en vectorial (nítido al imprimir)');

  console.log('Imprenta');
  await page.selectOption('#k-tam', 'm');
  await page.selectOption('#k-modo', 'imprenta');
  ok(await page.locator('.hoja.imp').count() === mesas + 1, 'un adhesivo por página');
  ok(/size:101mm 101mm/.test(await page.locator('#pagina').innerText()), 'página = adhesivo + márgenes de marcas (85 + 16 mm)');
  ok(await page.locator('.hoja.imp').first().locator('.marca').count() === 8, '8 marcas de corte');
  const ad = await page.locator('.hoja.imp .ad').first().evaluate((a) => [a.offsetWidth, getComputedStyle(a).left]);
  ok(Math.abs(ad[0] - 89 * 96 / 25.4) < 2, 'adhesivo con 2 mm de sangrado por lado (89 mm)');
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, path: process.env.PDF ? process.env.PDF + '/imprenta.pdf' : undefined });
  ok((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length === mesas + 1, 'PDF de imprenta con una página por adhesivo');
  await page.selectOption('#k-modo', 'a4');
  const pdfA4 = await page.pdf({ preferCSSPageSize: true, printBackground: true, path: process.env.PDF ? process.env.PDF + '/a4.pdf' : undefined });
  ok((pdfA4.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length === Math.ceil((mesas + 1) / 6), 'PDF A4 con las hojas justas');
  if (process.env.PDF) await page.screenshot({ path: process.env.PDF + '/kit.png', fullPage: false });

  console.log('Galería del camarero');
  await page.waitForFunction(() => (document.getElementById('g-img').src || '').startsWith('data:image/png'));
  ok(/qr-carta-demo\.png/.test(await page.locator('#g-bajar').getAttribute('download')), 'imagen PNG "qr-carta-demo.png" para guardar');
  psql("update carta.restaurantes set mesa_libre = false where slug = 'demo'");
  await page.reload();
  await page.locator('.ad').first().waitFor();
  await page.check('#k-general');
  ok(await page.locator('#k-aviso-libre').isVisible(), 'avisa si la carta general no deja elegir mesa');
  ok(errores.length === 0, 'sin errores JS' + (errores.length ? ': ' + errores.join(' | ') : ''));
  void codigo;
  console.log('\nE2E KIT OK');
} finally {
  await browser.close();
  srv.kill();
}
