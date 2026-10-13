// Prueba de extremo a extremo con navegador real:
//   admin crea la carta -> cliente pide desde el NFC de Mesa 2 -> llega a cocina -> estados ->
//   cliente ve "listo" -> pide la cuenta -> cocina cobra y libera la mesa -> NFC general + elegir mesa.
// Requiere: Postgres local (db-local.sh) y servidor-local.mjs levantado en BASE.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8787';
const SHOTS = process.env.SHOTS || '';
const psql = (sql) => execSync(`psql -h /tmp -p 54329 -U postgres -d carta_test -tAq -c "${sql}"`).toString().trim();
const ok = (cond, msg) => { if (!cond) throw new Error('FALLO: ' + msg); console.log('  ✓ ' + msg); };
const shot = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false }); } };

execSync('bash ./db-local.sh', { stdio: 'ignore' });
psql("select carta._alta('Bar Test', 'bar-test', 4, 'admin-test-key', 'cocina-test-key')");

const browser = await chromium.launch();
const errores = [];
const vigilar = (page, quien) => {
  page.on('pageerror', (e) => errores.push(`${quien}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/400|Failed to load resource/.test(m.text())) errores.push(`${quien}: ${m.text()}`); });
};

try {
  // ---------------------------------------------------------------- ADMIN
  console.log('ADMIN');
  const adminCtx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const admin = await adminCtx.newPage();
  vigilar(admin, 'admin');
  await admin.goto(`${BASE}/admin.html?r=bar-test&k=admin-test-key`);
  await admin.getByRole('heading', { name: 'Bar Test' }).waitFor();
  ok(!admin.url().includes('admin-test-key'), 'la clave desaparece de la barra de direcciones');

  for (const nombre of ['Tapas', 'Bebidas']) {
    admin.once('dialog', (d) => d.accept(nombre));
    await admin.getByRole('button', { name: '＋ Categoría' }).click();
    await admin.locator('.cat-head h2', { hasText: nombre }).waitFor();
  }
  ok(true, 'categorías Tapas y Bebidas creadas');

  async function crearProducto(nombre, precio, categoria, alergenos = [], desc = '') {
    await admin.getByRole('button', { name: '＋ Producto' }).click();
    await admin.fill('#p-nombre', nombre);
    await admin.fill('#p-precio', precio);
    await admin.selectOption('#p-categoria', { label: categoria });
    await admin.fill('#p-descripcion', desc);
    for (const a of alergenos) await admin.locator('#p-alergenos label', { hasText: a }).locator('input').check();
    await admin.click('#p-guardar');
    await admin.locator('.prod-row strong', { hasText: nombre }).waitFor();
  }
  await crearProducto('Tapa de croquetas', '3,00', 'Tapas', ['Gluten', 'Lácteos'], 'Caseras de jamón');
  await crearProducto('Patatas bravas', '6,5', 'Tapas', ['Huevo']);
  await crearProducto('Caña', '2,20', 'Bebidas', ['Gluten']);
  ok(await admin.locator('.prod-row').count() === 3, '3 productos creados (precio con coma aceptado)');
  await shot(admin, '01-admin-carta');

  await admin.getByRole('tab', { name: 'Mesas y NFC' }).click();
  ok(await admin.locator('#mesas-lista .mesa-row').count() === 4, '4 mesas creadas en el alta');
  const urlMesa2 = await admin.locator('#mesas-lista .mesa-row', { hasText: 'Mesa 2' }).locator('code').innerText();
  ok(/\/m\/[0-9a-f]{10}$/.test(urlMesa2), 'URL NFC de Mesa 2: ' + urlMesa2);
  await admin.locator('#mesas-lista .mesa-row', { hasText: 'Mesa 2' }).getByRole('button', { name: 'QR' }).click();
  ok(await admin.locator('#qr-img svg').count() === 1, 'QR generado');
  await admin.locator('#dlg-qr .dlg-foot [data-cerrar]').click();
  await admin.locator('#mesas-lista .mesa-row', { hasText: 'Mesa 2' }).getByRole('button', { name: /Grabar NFC/ }).click();
  ok(await admin.locator('#nfc-body', { hasText: 'NFC Tools' }).count() === 1, 'sin Web NFC: instrucciones NFC Tools');
  await admin.locator('#dlg-nfc .dlg-foot [data-cerrar]').click();
  await shot(admin, '02-admin-mesas');

  // ---------------------------------------------------------------- COCINA
  console.log('COCINA');
  const cocinaCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const cocina = await cocinaCtx.newPage();
  vigilar(cocina, 'cocina');
  await cocina.goto(`${BASE}/cocina.html?r=bar-test&k=cocina-test-key`);
  await cocina.getByText('Esperando pedidos…').waitFor();
  ok(await cocina.locator('#k-admin').isHidden(), 'clave de cocina no ve el enlace de admin');

  // ---------------------------------------------------------------- CLIENTE (NFC Mesa 2)
  console.log('CLIENTE');
  const movilCtx = await browser.newContext({ ...devices['iPhone 13'] });
  const movil = await movilCtx.newPage();
  vigilar(movil, 'cliente');
  await movil.goto(urlMesa2.replace(/^https?:\/\/[^/]+/, BASE));
  await movil.getByRole('heading', { name: 'Bar Test' }).waitFor();
  ok((await movil.locator('#mesa-btn').innerText()).includes('Mesa 2'), 'el NFC identifica la mesa: Mesa 2');
  ok(await movil.locator('.prod', { hasText: 'Tapa de croquetas' }).locator('.alergeno', { hasText: 'Gluten' }).count() === 1, 'alérgenos visibles');
  await shot(movil, '03-cliente-carta');

  const croq = movil.locator('.prod', { hasText: 'Tapa de croquetas' });
  await croq.getByRole('button', { name: /Añadir/ }).click();
  await croq.getByRole('button', { name: 'Añadir otro' }).click();
  await movil.locator('.prod', { hasText: 'Caña' }).getByRole('button', { name: /Añadir/ }).click();
  ok((await movil.locator('#cart-total').innerText()).includes('8,20'), 'carrito: 2×3,00 + 2,20 = 8,20 €');
  await movil.click('#cart-open');
  await movil.fill('input[aria-label="Nota para Tapa de croquetas"]', 'sin sal');
  await movil.fill('#carrito-nota', 'Las cañas primero');
  await shot(movil, '04-cliente-carrito');
  await movil.click('#btn-enviar');
  await movil.locator('#dlg-ok[open]').waitFor();
  const okTxt = await movil.locator('#ok-texto').innerText();
  ok(okTxt.includes('nº 1') && okTxt.includes('Mesa 2') && okTxt.includes('8,20'), 'pedido enviado: ' + okTxt.split('.')[0]);
  await shot(movil, '05-cliente-enviado');
  await movil.locator('#dlg-ok [data-cerrar]').click();

  // ---------------------------------------------------------------- LLEGA A COCINA
  const ticket = cocina.locator('#l-nuevo .ticket', { hasText: 'Mesa 2' });
  await ticket.waitFor({ timeout: 8000 });
  const tTxt = await ticket.innerText();
  ok(tTxt.includes('2×') && tTxt.includes('Tapa de croquetas') && tTxt.includes('sin sal') && tTxt.includes('Las cañas primero'), 'comanda en cocina: Mesa 2 · 2× Tapa de croquetas → sin sal');
  ok((await cocina.title()).startsWith('(1)'), 'título del panel avisa: (1)');
  await shot(cocina, '06-cocina-nuevo');
  await ticket.getByRole('button', { name: 'Empezar' }).click();
  await cocina.locator('#l-preparando .ticket', { hasText: 'Mesa 2' }).waitFor();
  await cocina.locator('#l-preparando .ticket', { hasText: 'Mesa 2' }).getByRole('button', { name: '¡Listo!' }).click();
  await cocina.locator('#l-listo .ticket', { hasText: 'Mesa 2' }).waitFor();
  ok(true, 'cocina: nuevo → en preparación → listo');

  await movil.locator('.estado.listo').waitFor({ timeout: 12000 });
  ok(true, 'el cliente ve "¡Listo! Te lo llevamos"');
  await shot(movil, '07-cliente-listo');

  // ---------------------------------------------------------------- CUENTA
  await movil.click('#btn-cuenta');
  await movil.getByText('te traen la cuenta').waitFor();
  const aviso = cocina.locator('.aviso.cuenta', { hasText: 'Mesa 2' });
  await aviso.waitFor({ timeout: 8000 });
  ok((await aviso.innerText()).includes('8,20'), 'cocina: "Mesa 2 pide la cuenta (8,20 €)"');
  await shot(cocina, '08-cocina-cuenta');
  await movil.click('#btn-cuenta');
  await cocina.waitForTimeout(3500);
  ok(await cocina.locator('.aviso.cuenta').count() === 1, 'aviso repetido no se duplica');
  await aviso.getByRole('button', { name: 'Atendido' }).click();
  await cocina.locator('#l-listo .ticket', { hasText: 'Mesa 2' }).getByRole('button', { name: 'Servido' }).click();
  await cocina.locator('#l-listo .ticket').waitFor({ state: 'detached' });

  await cocina.getByRole('tab', { name: /Mesas/ }).click();
  const mesaCard = cocina.locator('.mesa-card', { hasText: 'Mesa 2' });
  ok((await mesaCard.innerText()).includes('8,20'), 'pestaña Mesas: Mesa 2 total 8,20 €');
  await shot(cocina, '09-cocina-mesas');
  cocina.once('dialog', (d) => d.accept());
  await mesaCard.getByRole('button', { name: /Cobrada/ }).click();
  await mesaCard.waitFor({ state: 'detached' });
  ok(true, 'mesa cobrada y liberada');
  await cocina.getByRole('tab', { name: /Comandas/ }).click();

  // ---------------------------------------------------------------- NFC GENERAL + ELEGIR MESA
  console.log('NFC GENERAL');
  const movil2 = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  vigilar(movil2, 'cliente2');
  await movil2.goto(`${BASE}/r/bar-test`);
  await movil2.getByRole('heading', { name: 'Bar Test' }).waitFor();
  ok((await movil2.locator('#mesa-btn').innerText()).includes('Elegir'), 'sin mesa: botón "Elegir mi mesa"');
  await movil2.locator('.prod', { hasText: 'Patatas bravas' }).getByRole('button', { name: /Añadir/ }).click();
  await movil2.click('#cart-open');
  await movil2.click('#btn-enviar');
  await movil2.locator('#dlg-mesa[open]').waitFor();
  await shot(movil2, '10-cliente-elegir-mesa');
  await movil2.locator('#mesas-grid').getByRole('button', { name: 'Mesa 3' }).click();
  await movil2.click('#btn-enviar');
  await movil2.locator('#dlg-ok[open]').waitFor();
  ok((await movil2.locator('#ok-texto').innerText()).includes('nº 2'), 'pedido nº 2 del día');
  await cocina.locator('#l-nuevo .ticket', { hasText: 'Mesa 3' }).waitFor({ timeout: 8000 });
  ok(true, 'cocina recibe pedido de Mesa 3 (mesa elegida a mano)');

  // ---------------------------------------------------------------- AGOTADO + PAUSA
  await admin.getByRole('tab', { name: 'Carta' }).click();
  await admin.locator('.prod-row', { hasText: 'Caña' }).getByRole('button', { name: /Disponible/ }).click();
  await admin.locator('.prod-row', { hasText: 'Caña' }).getByRole('button', { name: /Agotado/ }).waitFor();
  await movil2.reload();
  await movil2.locator('.prod', { hasText: 'Caña' }).locator('.tag-agotado').waitFor();
  ok(true, 'agotado en admin → el cliente ve "Agotado"');

  cocina.once('dialog', (d) => d.accept());
  await cocina.click('#k-pausa');
  await cocina.locator('#k-pausa.pausados').waitFor();
  await movil2.reload();
  await movil2.locator('#banner-cerrado').waitFor();
  ok(await movil2.locator('.add').count() === 0, 'pedidos pausados: carta solo lectura');
  await shot(movil2, '11-cliente-pausado');
  await cocina.click('#k-pausa');

  // ---------------------------------------------------------------- SEGURIDAD BÁSICA
  const r = await movil2.evaluate(async () => {
    const f = (fn, b) => fetch('/rest/v1/rpc/' + fn, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((x) => x.json());
    return {
      cocina: await f('carta_cocina', { p_slug: 'bar-test', p_clave: 'adivina' }),
      admin: await f('carta_admin', { p_slug: 'bar-test', p_clave: 'cocina-test-key' }),
    };
  });
  ok(r.cocina.message === 'clave_incorrecta' && r.admin.message === 'clave_incorrecta', 'sin clave no se ve cocina; clave de cocina no abre admin');

  // ---------------------------------------------------------------- NFC caducado
  await movil2.goto(`${BASE}/m/0000000000`);
  await movil2.getByText('ya no está activo').waitFor();
  ok(true, 'NFC con código inválido → mensaje claro');

  ok(errores.length === 0, 'sin errores JS en consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
  console.log('\nE2E OK');
} catch (e) {
  console.error(e.message);
  if (errores.length) console.error('Errores consola:', errores);
  process.exitCode = 1;
} finally {
  await browser.close();
}
