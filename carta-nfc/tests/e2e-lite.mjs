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
for (let i = 1; i <= 10; i++) rpcAdmin('producto', { nombre: `Burger extra ${i}`, precio: '9', categoria_id: burgers, alergenos: ['gluten'] });
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
  const fuera = await k.evaluate(() => ['k-pedido', 'tab-tickets', 'tab-caja', 'tab-informes', 'dlg-cobrar']
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
  ok(await m.locator('#mis-pedidos [data-repetir]').count() === 1, 'botón "🔁 Repetir" en Tus pedidos');

  // Buscar y alergias
  await m.fill('#buscar', 'ensalad');
  ok(await m.locator('.prod:visible').count() === 1 && await m.locator('.cat:visible').count() === 1, 'buscador: "ensalad" deja solo la Ensaladilla');
  await m.fill('#buscar', 'zzz');
  ok(await m.locator('#sin-resultados').isVisible(), 'buscador sin resultados: aviso');
  await m.fill('#buscar', '');
  await m.click('#btn-alerg');
  await m.locator('[data-sin="gluten"]').click();
  ok(await m.locator('.prod:visible', { hasText: 'McTínez' }).count() === 0 && await m.locator('.prod:visible', { hasText: 'Ensaladilla' }).count() === 1,
    'filtro "Sin gluten" oculta las burgers y deja la ensaladilla');
  await m.locator('[data-sin="gluten"]').click();
  ok(await m.locator('.prod:visible').count() === 12, 'quitar el filtro vuelve a mostrar todo');
  await m.click('#btn-alerg');
  ok(await m.locator('a[href="/privacidad.html"]').count() === 1, 'enlace a Privacidad en el pie');

  // ------------------------------------------------------------ LLEGA AL PANEL
  const ped = k.locator('#l-nuevos .ped', { hasText: 'Mesa 2' });
  await ped.waitFor({ timeout: 8000 });
  const txt = await ped.innerText();
  ok(txt.includes('2×') && txt.includes('Ensaladilla rusa · Tapa') && txt.includes('sin cebolla') && txt.includes('Rápido, porfa'), 'el pedido llega al panel con notas');
  await k.getByRole('tab', { name: 'Mesas' }).click();
  ok(await k.locator('.mesa-tile.pide', { hasText: 'Mesa 2' }).count() === 1 && await k.locator('.mesa-tile.libre').count() === 3,
    'mapa de mesas: Mesa 2 en verde (acaba de pedir) y las otras 3 libres');
  await shot(k, 'lite-07-mapa');
  await k.getByRole('tab', { name: 'Pedidos' }).click();
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
  await m.locator('#cuenta-mesa', { hasText: 'Lo que habéis pedido' }).waitFor({ timeout: 12000 });
  ok((await m.locator('#cuenta-mesa .cm-total').innerText()).includes('17,80'), 'el cliente ve la cuenta de la mesa: 17,80 €');

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
  ok(await k.locator('.mesa-tile.ocupada', { hasText: 'Mesa 2' }).count() === 1, 'mapa: Mesa 2 con consumo tras apuntar');
  await k.locator('.mesa-tile', { hasText: 'Mesa 2' }).click();
  const card = k.locator('#dlg-mesa[open] .mesa-card');
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
  await m.locator('#mis-pedidos [data-repetir]').first().click();
  await m.locator('#dlg-carrito[open]').waitFor();
  ok((await m.locator('#carrito-total').innerText()).includes('17,80'), '"🔁 Repetir": otra ronda igual al carrito (17,80 €)');
  await m.locator('#dlg-carrito [data-cerrar]').click();

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

  // ------------------------------------------------------------ PANTALLAS (cocina / barra)
  console.log('PANTALLAS');
  const k2 = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  vigilar(k2, 'pantalla cocina');
  await k2.goto(`${BASE}/cocina.html?r=martinez-demo&k=cocina-l`);
  await k2.locator('#l-nuevos .ped', { hasText: 'Mesa 3' }).waitFor();
  await k2.click('#k-puesto');
  await k2.locator('#dlg-puesto [value="cats"]').check();
  await k2.locator('#dlg-puesto label', { hasText: 'Con patatas' }).locator('input').check();
  await k2.locator('#dlg-puesto button[type="submit"]').click();
  await k2.getByText('Esperando pedidos…').waitFor();
  ok(await k2.locator('#k-puesto-chip', { hasText: 'Con patatas' }).isVisible(), 'pantalla de cocina: solo "Con patatas" (la burger de la Mesa 3 no sale aquí)');
  ok(await k.locator('#l-nuevos .ped', { hasText: 'Mesa 3' }).count() === 1, 'el panel completo sigue viendo la Mesa 3');
  if (await g.locator('#dlg-ok[open]').count()) await g.locator('#dlg-ok [data-cerrar]').click();
  await g.locator('.prod', { hasText: 'Ensaladilla rusa' }).getByRole('button', { name: 'Añadir Ensaladilla rusa · Media' }).click();
  await g.getByRole('button', { name: 'Añadir Burger extra 1', exact: true }).click();
  await g.click('#cart-open'); await g.click('#btn-enviar'); await g.locator('#dlg-ok[open]').waitFor();
  await g.locator('#dlg-ok [data-cerrar]').click();
  const pc = k2.locator('#l-nuevos .ped', { hasText: 'Ensaladilla' });
  await pc.waitFor({ timeout: 8000 });
  ok(!(await pc.innerText()).includes('Burger extra 1') && (await pc.innerText()).includes('de otra pantalla'), 'cocina ve solo la ensaladilla del pedido');
  await pc.getByRole('button', { name: '✓ Hecho' }).click();
  await pc.waitFor({ state: 'detached' });
  ok(await k.locator('#l-nuevos .ped', { hasText: 'Burger extra 1' }).count() === 1, '"✓ Hecho" en cocina no lo quita del panel del camarero');
  await shot(k2, 'lite-08-pantalla-cocina');

  // ------------------------------------------------------------ AGOTADO DESDE EL PANEL
  await k.getByRole('tab', { name: 'Carta' }).click();
  await k.locator('.ag', { hasText: 'Burger extra 2' }).click();
  await k.locator('.ag.fuera', { hasText: 'Burger extra 2' }).waitFor();
  await m.reload();
  await m.locator('.prod', { hasText: 'Burger extra 2' }).locator('.tag-agotado').waitFor();
  ok(true, 'agotado desde el panel en un toque → el cliente lo ve agotado');
  await k.locator('.ag', { hasText: 'Burger extra 2' }).click();
  await k.locator('.ag:not(.fuera)', { hasText: 'Burger extra 2' }).waitFor();
  await shot(k, 'lite-09-agotados');

  // ------------------------------------------------------------ CÓDIGO DE MESA
  console.log('CÓDIGO DE MESA');
  await a.getByRole('tab', { name: 'Ajustes y claves' }).click();
  await a.locator('#aj-codigo').check();
  await a.locator('#form-ajustes button[type="submit"]').click();
  await a.getByText('Código de mesa activado').waitFor();
  ok(psql("select codigo_mesa from carta.restaurantes where slug = 'martinez-demo'") === 't', 'Gestión: código de mesa activado');
  await m.reload();
  await m.locator('#banner-codigo', { hasText: 'abra tu mesa' }).waitFor();
  ok(true, 'cliente: "pide al camarero que abra tu mesa"');
  if (await m.locator('#cart-bar').isHidden()) await m.getByRole('button', { name: 'Añadir Ensaladilla rusa · Tapa', exact: true }).click();
  await m.click('#cart-open'); await m.click('#btn-enviar');
  await m.locator('#dlg-codigo[open]').waitFor();
  ok(true, 'sin código no se puede pedir: pide el código');
  await k.getByRole('tab', { name: 'Mesas' }).click();
  await k.locator('.mesa-tile', { hasText: 'Mesa 2' }).click();
  await k.locator('#dlg-mesa').getByRole('button', { name: /Abrir mesa/ }).click();
  const cod = (await k.locator('#dlg-mesa .codigo-mesa b').innerText()).trim();
  ok(/^[0-9]{4}$/.test(cod), 'el camarero abre la Mesa 2: código ' + cod);
  await shot(k, 'lite-10-codigo');
  await k.locator('#dlg-mesa [data-cerrar]').click();
  await m.fill('#codigo-input', cod === '0000' ? '1111' : '0000');
  await m.locator('#form-codigo button[type="submit"]').click();
  await m.locator('#codigo-error', { hasText: 'no es el de tu mesa' }).waitFor();
  ok(true, 'código equivocado: no entra');
  await m.fill('#codigo-input', cod);
  await m.locator('#form-codigo button[type="submit"]').click();
  await m.locator('#dlg-ok[open]').waitFor();
  await m.locator('#dlg-ok [data-cerrar]').click();
  await k.getByRole('tab', { name: 'Pedidos' }).click();
  await k.locator('#l-nuevos .ped', { hasText: 'Mesa 2' }).waitFor({ timeout: 8000 });
  ok(true, 'con el código correcto el pedido llega');
  await k.getByRole('tab', { name: 'Mesas' }).click();
  await k.locator('.mesa-tile', { hasText: 'Mesa 2' }).click();
  k.once('dialog', (dd) => dd.accept());
  await k.locator('#dlg-mesa').getByRole('button', { name: /liberar mesa/ }).click();
  await k.locator('#dlg-mesa').waitFor({ state: 'hidden' });
  ok(psql("select coalesce(clave_sesion, 'null') from carta.mesas where nombre = 'Mesa 2' and restaurante_id = (select id from carta.restaurantes where slug = 'martinez-demo')") === 'null',
    'al liberar la mesa el código deja de valer');
  await a.locator('#aj-codigo').uncheck();
  await a.locator('#form-ajustes button[type="submit"]').click();
  await a.getByText('Código de mesa desactivado').waitFor();
  await k.getByRole('tab', { name: 'Pedidos' }).click();

  // ------------------------------------------------------------ SIN CONEXIÓN: no pide la clave
  const off = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  await off.route('**/rest/v1/rpc/carta_cocina', (rt) => rt.abort());
  await off.goto(`${BASE}/cocina.html?r=martinez-demo&k=cocina-l`);
  await off.locator('#conectando').waitFor();
  ok(await off.locator('#login').isHidden(), 'sin conexión: "Conectando…" en vez de pedir la clave');
  await off.unroute('**/rest/v1/rpc/carta_cocina');
  await off.click('#reintentar');
  await off.locator('#k-nombre', { hasText: 'Martínez' }).waitFor();
  ok(true, 'al volver la conexión entra solo con la clave guardada');

  // ------------------------------------------------------------ DEMO EN DIRECTO
  const dm = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  vigilar(dm, 'demo');
  await dm.goto(`${BASE}/demo.html?r=martinez-demo&k=cocina-l&m=${mesa(2)}`);
  ok(!dm.url().includes('cocina-l'), 'demo: la clave desaparece de la barra');
  await dm.frameLocator('#f-cliente').getByRole('heading', { name: 'Martínez Bar (demo)' }).waitFor();
  await dm.frameLocator('#f-bar').locator('#k-nombre', { hasText: 'Martínez' }).waitFor();
  ok(true, 'demo: carta del cliente y panel del bar lado a lado');
  await shot(dm, 'lite-06-demo');

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
    && res.includes('Panel del bar') && res.includes('/demo.html?r=bar-casa-pepe'), 'alta: carta, gestión, panel del bar y demo en directo');
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
