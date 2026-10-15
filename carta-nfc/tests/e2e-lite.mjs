// E2E de la versión "Solo pedidos" (carta-nfc/lite) con navegador real y BD local:
//   cliente pide desde el NFC de su mesa → llega al panel del bar (móvil) → "✓ Apuntado" → el cliente lo ve →
//   pide la cuenta → Mesas: imprimir ticket (pre-cuenta) → liberar mesa. Además: carta general eligiendo mesa,
//   QR de la carta en el panel, tamaños agrupados, tema Martínez, agotado, informe + Excel y nada de TPV/cobros.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT_LITE || '8788';
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS || '';
const psql = (sql) => execSync(`psql -h /tmp -p 54329 -U postgres -d carta_test -tAq -c "${sql}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('FALLO: ' + m); console.log('  ✓ ' + m); };
const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${n}.png` }); };
const sinScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

execSync('bash ./db-local.sh', { cwd: DIR, stdio: 'ignore' });
const srv = spawn('node', ['servidor-local.mjs'], { cwd: DIR, env: { ...process.env, PORT, WEB_ROOT: path.resolve(DIR, '../lite') }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
psql("select carta._alta('Martínez Bar (demo)', 'martinez-demo', 4, 'admin-l', 'cocina-l')");
psql("update carta.restaurantes set color = '#FCA80C' where slug = 'martinez-demo'");
const rpcAdmin = (accion, datos) => psql(`set role anon; select public.carta_admin('martinez-demo','admin-l','${accion}','${JSON.stringify(datos).replace(/"/g, '\\"')}'::jsonb)`);
const patatas = JSON.parse(rpcAdmin('categoria', { nombre: 'Con patatas' })).id;
const burgers = JSON.parse(rpcAdmin('categoria', { nombre: 'Burgers' })).id;
rpcAdmin('producto', { nombre: 'Ensaladilla rusa · Tapa', precio: '3.9', categoria_id: patatas, descripcion: 'Con crujiente de patata', alergenos: ['huevo'] });
rpcAdmin('producto', { nombre: 'Ensaladilla rusa · Media', precio: '9', categoria_id: patatas });
rpcAdmin('producto', { nombre: 'McTínez', precio: '10', categoria_id: burgers, alergenos: ['gluten', 'lacteos'] });
const mesa = (n) => psql(`select m.codigo from carta.mesas m join carta.restaurantes r on r.id = m.restaurante_id where r.slug = 'martinez-demo' and m.nombre = 'Mesa ${n}'`);

const browser = await chromium.launch();
const errores = [];
const vigilar = (p, q) => {
  p.on('pageerror', (e) => errores.push(`${q}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/400|Failed to load resource|fonts\.g/.test(m.text())) errores.push(`${q}: ${m.text()}`); });
};

try {
  // ------------------------------------------------------------ PANEL DEL BAR (móvil junto al TPV)
  console.log('PANEL');
  const kctx = await browser.newContext({ ...devices['Pixel 7'] });
  const k = await kctx.newPage();
  vigilar(k, 'panel');
  await k.goto(`${BASE}/cocina.html?r=martinez-demo&k=cocina-l`);
  await k.getByText('Esperando pedidos…').waitFor();
  ok(!k.url().includes('cocina-l'), 'la clave desaparece de la barra de direcciones');
  ok(await k.evaluate(() => document.documentElement.dataset.tema) === 'martinez', 'tema Martínez aplicado en el panel');
  ok(await k.locator('#k-activar').isVisible(), 'aviso grande para activar el sonido');
  await k.click('#k-activar');
  await k.locator('#k-activar').waitFor({ state: 'hidden' });
  ok(true, 'sonido activado con un toque');
  const fuera = await k.evaluate(() => ['k-pedido', 'k-puesto', 'tab-tickets', 'tab-caja', 'tab-informes', 'dlg-cobrar']
    .filter((id) => document.getElementById(id)).concat(/Cobrar|Tickets|Caja|Comandero/.test(document.body.innerText) ? ['texto'] : []));
  ok(fuera.length === 0, 'sin TPV, comandero, cobros, tickets ni caja en el panel');
  ok(await sinScroll(k), 'panel en el móvil: sin scroll lateral');

  // ------------------------------------------------------------ CLIENTE (NFC Mesa 2)
  console.log('CLIENTE');
  const mctx = await browser.newContext({ ...devices['iPhone 13'] });
  const m = await mctx.newPage();
  vigilar(m, 'cliente');
  await m.goto(`${BASE}/m/${mesa(2)}`);
  await m.getByRole('heading', { name: 'Martínez Bar (demo)' }).waitFor();
  ok((await m.locator('#mesa-btn').textContent()).includes('Mesa 2'), 'el NFC identifica la mesa: Mesa 2');
  ok(await m.evaluate(() => document.documentElement.dataset.tema) === 'martinez', 'tema Martínez en la carta');
  const ens = m.locator('.prod', { hasText: 'Ensaladilla rusa' });
  ok(await ens.count() === 1 && await ens.locator('.tam').count() === 2, 'tamaños agrupados: Ensaladilla rusa con Tapa y Media');
  ok(await ens.locator('.alergeno', { hasText: 'Huevo' }).count() === 1, 'alérgenos visibles');
  await shot(m, 'lite-01-carta');
  await ens.getByRole('button', { name: 'Añadir Ensaladilla rusa · Tapa' }).click();
  await ens.getByRole('button', { name: 'Añadir otro' }).click();
  await m.locator('.prod', { hasText: 'McTínez' }).getByRole('button', { name: /Añadir/ }).click();
  ok((await m.locator('#cart-total').innerText()).includes('17,80'), 'carrito: 2×3,90 + 10 = 17,80 €');
  await m.click('#cart-open');
  await m.fill('input[aria-label="Nota para McTínez"]', 'sin cebolla');
  await m.fill('#carrito-nota', 'Rápido, porfa');
  await m.click('#btn-enviar');
  await m.locator('#dlg-ok[open]').waitFor();
  ok((await m.locator('#ok-texto').innerText()).includes('Mesa 2'), 'pedido enviado desde la mesa');
  await m.locator('#dlg-ok [data-cerrar]').click();
  ok(await sinScroll(m), 'carta en el móvil: sin scroll lateral');

  // ------------------------------------------------------------ LLEGA AL PANEL
  const ped = k.locator('#l-nuevos .ped', { hasText: 'Mesa 2' });
  await ped.waitFor({ timeout: 8000 });
  const txt = await ped.innerText();
  ok(txt.includes('2×') && txt.includes('Ensaladilla rusa · Tapa') && txt.includes('sin cebolla') && txt.includes('Rápido, porfa'), 'el pedido llega al panel con notas');
  ok((await k.title()).startsWith('(1)') && (await k.locator('#n-pedidos').innerText()) === '1', 'contador de pedidos nuevos: 1');
  await shot(k, 'lite-02-panel-nuevo');
  await ped.getByRole('button', { name: '✓ Apuntado' }).click();
  await ped.waitFor({ state: 'detached' });
  await k.locator('#l-apuntados .apuntado', { hasText: 'Mesa 2' }).waitFor();
  ok(true, 'un toque en "✓ Apuntado": sale de nuevos y queda en "Apuntados hace poco"');
  await k.locator('#l-apuntados [data-deshacer]').first().click();
  await ped.waitFor();
  await ped.getByRole('button', { name: '✓ Apuntado' }).click();
  await ped.waitFor({ state: 'detached' });
  ok(true, 'deshacer devuelve el pedido a nuevos');
  ok(psql("select estado from carta.pedidos where tipo = 'pedido'") === 'servido', 'apuntado = estado servido en la BD');
  await m.locator('.estado.servido', { hasText: 'Apuntado' }).waitFor({ timeout: 12000 });
  ok(true, 'el cliente ve "✓ Apuntado"');

  // ------------------------------------------------------------ AVISOS
  await m.click('#btn-cuenta');
  const aviso = k.locator('.aviso.cuenta', { hasText: 'Mesa 2' });
  await aviso.waitFor({ timeout: 8000 });
  ok((await aviso.innerText()).includes('17,80'), 'aviso: "Mesa 2 pide la cuenta (17,80 €)"');
  await shot(k, 'lite-03-panel-cuenta');
  await aviso.getByRole('button', { name: 'Atendido' }).click();
  await aviso.waitFor({ state: 'detached' });
  await m.click('#btn-camarero');
  await k.locator('.aviso.camarero', { hasText: 'Mesa 2' }).waitFor({ timeout: 8000 });
  await k.locator('.aviso.camarero').getByRole('button', { name: 'Atendido' }).click();
  ok(true, 'avisos de cuenta y camarero, atendidos');

  // ------------------------------------------------------------ MESAS: TICKET Y LIBERAR
  await k.getByRole('tab', { name: 'Mesas' }).click();
  const card = k.locator('.mesa-card', { hasText: 'Mesa 2' });
  ok((await card.innerText()).includes('17,80'), 'Mesas: Mesa 2 lleva 17,80 €');
  ok(await sinScroll(k), 'Mesas en el móvil: sin scroll lateral');
  await shot(k, 'lite-04-panel-mesas');
  const [tk] = await Promise.all([kctx.waitForEvent('page'), card.getByRole('button', { name: /Imprimir ticket/ }).click()]);
  await tk.waitForLoadState();
  const tkTxt = await tk.evaluate(() => document.body.innerText);
  ok(tkTxt.includes('Mesa 2') && tkTxt.includes('2× Ensaladilla rusa · Tapa') && /TOTAL\s+17,80/.test(tkTxt) && tkTxt.includes('no válida como factura'),
    'ticket impreso: pre-cuenta de Mesa 2, 17,80 €, "no válida como factura"');
  await tk.close();
  k.once('dialog', (d) => d.accept());
  await card.getByRole('button', { name: /liberar mesa/ }).click();
  await card.waitFor({ state: 'detached' });
  ok(psql("select count(*) from carta.pedidos where not cerrado") === '0', 'mesa liberada: pedidos y avisos cerrados');

  // ------------------------------------------------------------ CARTA GENERAL (QR del camarero)
  console.log('CARTA GENERAL');
  await k.getByRole('tab', { name: 'Pedidos' }).click();
  await k.click('#k-qr');
  ok(await k.locator('#dlg-qr[open] #qr-img svg').count() === 1, 'el panel enseña el QR de la carta general');
  await k.locator('#dlg-qr [data-cerrar]').click();
  const g = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  vigilar(g, 'general');
  await g.goto(`${BASE}/r/martinez-demo`);
  await g.locator('.prod', { hasText: 'McTínez' }).getByRole('button', { name: /Añadir/ }).click();
  await g.click('#cart-open');
  await g.click('#btn-enviar');
  await g.locator('#dlg-mesa[open]').waitFor();
  await g.locator('#mesas-grid').getByRole('button', { name: 'Mesa 3' }).click();
  await g.click('#btn-enviar');
  await g.locator('#dlg-ok[open]').waitFor();
  await k.locator('#l-nuevos .ped', { hasText: 'Mesa 3' }).waitFor({ timeout: 8000 });
  ok(true, 'carta general: el cliente elige Mesa 3 y el pedido llega al panel');

  // ------------------------------------------------------------ GESTIÓN
  console.log('GESTIÓN');
  const actx = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
  const a = await actx.newPage();
  vigilar(a, 'gestión');
  await a.goto(`${BASE}/admin.html?r=martinez-demo&k=admin-l`);
  await a.getByRole('heading', { name: 'Martínez Bar (demo)' }).waitFor();
  const tabs = await a.locator('[data-tab]').allTextContents();
  ok(tabs.join('|') === 'Carta|Mesas y NFC|Ajustes y claves|📊 Informes', 'gestión: Carta, Mesas y NFC, Ajustes, Informes (sin Facturación ni Stock)');
  ok(await sinScroll(a), 'gestión en el móvil: sin scroll lateral');
  await a.locator('.prod-row', { hasText: 'McTínez' }).getByRole('button', { name: /Disponible/ }).click();
  await a.locator('.prod-row', { hasText: 'McTínez' }).getByRole('button', { name: /Agotado/ }).waitFor();
  await m.reload();
  await m.locator('.prod', { hasText: 'McTínez' }).locator('.tag-agotado').waitFor();
  ok(true, '"Agotado" en un toque → el cliente lo ve agotado');
  await a.getByRole('tab', { name: 'Mesas y NFC' }).click();
  ok(await a.locator('#mesas-lista .mesa-row').count() === 4 && (await a.locator('#row-general code').innerText()).endsWith('/r/martinez-demo'),
    'Mesas y NFC: 4 mesas y la carta general');
  await a.getByRole('tab', { name: '📊 Informes' }).click();
  await a.locator('.iv-hero .v').waitFor();
  ok((await a.locator('.iv-hero .v').innerText()).includes('27,80'), 'informe de hoy: 27,80 € (17,80 + 10)');
  ok(await a.locator('.iv-card h3', { hasText: 'Lo más pedido' }).count() === 1 && await a.locator('[data-iv-productos]', { hasText: 'McTínez' }).count() === 1, 'informe: lo más pedido');
  ok(await a.locator('.iv-card h3', { hasText: 'Mesas' }).count() === 1, 'informe: mesas');
  await a.locator('[data-iv-rango="7d"]').click();
  await a.locator('.iv-card h3', { hasText: 'Ventas por día' }).waitFor();
  ok(true, 'informe de 7 días: ventas por día');
  const [dl] = await Promise.all([a.waitForEvent('download'), a.locator('[data-iv-csv]').click()]);
  ok(/^informe_martinez-demo_.*\.csv$/.test(dl.suggestedFilename()), 'Excel del periodo: ' + dl.suggestedFilename());
  ok(await sinScroll(a), 'informe en el móvil: sin scroll lateral');
  await shot(a, 'lite-05-informe');

  // ------------------------------------------------------------ ALTA (plataforma)
  console.log('ALTA');
  psql("select carta.fijar_clave_plataforma('plataforma-de-pruebas')");
  const al = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  vigilar(al, 'alta');
  await al.goto(`${BASE}/alta.html`);
  await al.fill('#clave', 'plataforma-de-pruebas');
  await al.getByRole('button', { name: 'Entrar' }).click();
  await al.locator('#lista', { hasText: 'Martínez Bar (demo)' }).waitFor();
  await al.fill('#nombre', 'Bar Casa Pepe');
  await al.fill('#mesas', '6');
  await al.getByRole('button', { name: 'Dar de alta' }).click();
  const res = await al.locator('#resultado .secreto').innerText();
  ok(res.includes('/r/bar-casa-pepe') && res.includes('/admin.html?r=bar-casa-pepe') && res.includes('/cocina.html?r=bar-casa-pepe')
    && res.includes('Panel del bar'), 'alta: los 3 enlaces (carta, gestión, panel del bar)');
  al.once('dialog', (dd) => dd.accept());
  await al.locator('#lista .r', { hasText: 'Bar Casa Pepe' }).getByRole('button', { name: 'Desactivar' }).click();
  await al.locator('#lista .r', { hasText: 'Bar Casa Pepe' }).getByRole('button', { name: 'Activar' }).waitFor();
  const cerrado = await (await browser.newContext()).newPage();
  await cerrado.goto(`${BASE}/r/bar-casa-pepe`);
  await cerrado.getByText('No encontramos este restaurante').waitFor();
  ok(true, 'desactivar (impago): su carta deja de funcionar');

  ok(errores.length === 0, 'sin errores JS en consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
  console.log('\nE2E LITE OK');
} catch (e) {
  console.error(e.message);
  if (errores.length) console.error('Errores consola:', errores);
  process.exitCode = 1;
} finally {
  await browser.close();
  srv.kill();
}
