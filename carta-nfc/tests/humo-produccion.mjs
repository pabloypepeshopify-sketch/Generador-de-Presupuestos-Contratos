// Prueba rápida contra el sitio publicado: pide desde el NFC de una mesa, comprueba que llega
// a cocina y deja la mesa limpia (pedido cancelado y mesa cerrada).
// Uso: BASE=https://carta-nfc-pedidos.netlify.app SLUG=demo MESA=<codigo> CLAVE=<clave cocina> node humo-produccion.mjs
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const { BASE = 'https://carta-nfc-pedidos.netlify.app', SLUG = 'demo', MESA, CLAVE = 'demo-cocina', SHOTS = '' } = process.env;
if (!MESA) { console.error('Falta MESA=<codigo de mesa>'); process.exit(2); }
const ok = (c, m) => { if (!c) throw new Error('FALLO: ' + m); console.log('  ✓ ' + m); };

const browser = await chromium.launch();
try {
  const movil = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  await movil.goto(`${BASE}/m/${MESA}`);
  await movil.locator('#r-nombre').waitFor();
  const mesa = (await movil.locator('#mesa-btn').innerText()).replace('📍', '').trim();
  ok(mesa.length > 0, `NFC abre la carta de "${await movil.locator('#r-nombre').innerText()}" en ${mesa}`);
  if (SHOTS) await movil.screenshot({ path: `${SHOTS}/prod-cliente.png` });

  await movil.locator('.prod:not(.agotado) .add').first().click();
  await movil.click('#cart-open');
  await movil.fill('#carrito-nota', 'PRUEBA AUTOMÁTICA — ignorar');
  await movil.click('#btn-enviar');
  await movil.locator('#dlg-ok[open]').waitFor({ timeout: 15000 });
  const txt = await movil.locator('#ok-texto').innerText();
  ok(true, 'pedido enviado: ' + txt.split('.')[0]);

  const cocina = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await cocina.goto(`${BASE}/cocina.html?r=${SLUG}&k=${encodeURIComponent(CLAVE)}`);
  const ticket = cocina.locator('#l-nuevo .ticket', { hasText: 'PRUEBA AUTOMÁTICA' }).first();
  await ticket.waitFor({ timeout: 15000 });
  ok((await ticket.innerText()).includes(mesa), `llega a cocina como ${mesa}`);
  if (SHOTS) await cocina.screenshot({ path: `${SHOTS}/prod-cocina.png` });

  cocina.once('dialog', (d) => d.accept());
  await ticket.locator('[data-cancelar]').click();
  await cocina.waitForTimeout(1500);
  await cocina.getByRole('tab', { name: /Mesas/ }).click();
  const tarjeta = cocina.locator('.mesa-card', { hasText: mesa });
  if (await tarjeta.count()) {
    cocina.once('dialog', (d) => d.accept());
    await tarjeta.getByRole('button', { name: /Cobrada/ }).click();
    await tarjeta.waitFor({ state: 'detached' });
  }
  ok(true, 'limpieza: pedido de prueba cancelado y mesa liberada');
  console.log('\nHUMO PRODUCCIÓN OK');
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
