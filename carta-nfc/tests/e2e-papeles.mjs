// Papeles de venta (web/papeles/): cada uno cabe en sus páginas A4 y la hoja de venta calcula bien.
//   node e2e-papeles.mjs        PDF=/carpeta  para guardar los PDF
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || '8787';
const BASE = `http://localhost:${PORT}`;
const ok = (c, m) => { if (!c) throw new Error('FALLO: ' + m); console.log('  ✓ ' + m); };
const paginas = (pdf) => (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

const srv = spawn('node', ['servidor-local.mjs'], { cwd: DIR, env: { ...process.env, PORT }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch();
const errores = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await page.goto(BASE + '/papeles/index.html');
  ok(await page.locator('.lista a').count() === 4, 'índice con los 4 papeles');

  await page.goto(BASE + '/papeles/hoja-de-venta.html');
  ok((await page.locator('#o-extra').innerText()).replace(/\s/g, '') === '572€', '10 mesas × 2,20 € × 26 días = 572 €');
  ok((await page.locator('#o-total').innerText()).replace(/\s/g, '') === '850€', 'total inicial 10 mesas = 850 €');
  await page.fill('#i-mesas', '12');
  ok((await page.locator('#o-total').innerText()).replace(/\s/g, '') === '880€' && (await page.locator('#o-nfc').innerText()).replace(/\s/g, '') === '180€', 'ajustable: 12 mesas');
  ok(await page.locator('.qr svg').count() === 2, 'QR de la demo (cliente y móvil del TPV)');
  await page.fill('#i-mesas', '10');

  for (const [f, n] of [['hoja-de-venta', 1], ['manual-camarero', 1], ['checklist-instalacion', 1], ['contrato', 2]]) {
    await page.goto(`${BASE}/papeles/${f}.html`);
    await page.emulateMedia({ media: 'print' });
    const alto = await page.evaluate(() => Math.max(...[...document.querySelectorAll('.hoja')].map((h) => {
      h.style.overflow = 'visible'; h.style.height = 'auto'; h.style.minHeight = '297mm';
      const mm = h.scrollHeight * 25.4 / 96; h.style.cssText = ''; return mm; })));
    ok(alto < 297.6, `${f}: el contenido cabe (${alto.toFixed(1)} mm)`);
    await page.emulateMedia({ media: null });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, path: process.env.PDF ? `${process.env.PDF}/${f}.pdf` : undefined });
    ok(paginas(pdf) === n, `${f}: ${n} ${n === 1 ? 'página' : 'páginas'} A4`);
  }
  await page.goto(BASE + '/papeles/contrato.html');
  ok(/TODO\(gestoría\)/.test(await page.content()), 'contrato marcado TODO(gestoría)');
  await page.emulateMedia({ media: 'print' });
  ok(await page.locator('.antes').isHidden(), 'el aviso de revisión no se imprime');
  ok(errores.length === 0, 'sin errores JS' + (errores.length ? ': ' + errores.join(' | ') : ''));
  console.log('\nE2E PAPELES OK');
} finally {
  await browser.close();
  srv.kill();
}
