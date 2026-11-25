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
psql("update carta.restaurantes set color = '#FCA80C', resena_url = 'https://g.page/r/martinez-demo/review' where slug = 'martinez-demo'");
psql("select carta.fijar_clave_plataforma('plataforma-de-pruebas')");
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
  ok(psql("select estado from carta.pedidos where tipo = 'pedido'") === 'preparando', 'apuntado = estado preparando en la BD');
  await m.locator('.estado.preparando', { hasText: 'Apuntado' }).waitFor({ timeout: 12000 });
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
  await m.locator('#dlg-valorar[open]').waitFor();
  await m.locator('[data-estrella="4"]').click();
  await m.fill('#val-comentario', 'Todo buenísimo');
  await m.click('#val-enviar');
  await m.locator('#val-paso2').waitFor();
  ok(await m.locator('#val-google').isVisible() && await m.locator('#val-google').getAttribute('href') === 'https://g.page/r/martinez-demo/review',
    'tras pedir la cuenta: "¿Qué tal todo?" y, después, la reseña de Google para todos');
  await shot(m, 'lite-12-valorar');
  await m.locator('#val-paso2 [data-cerrar]').click();
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
  ok(tabs.join('|') === 'Carta|Mesas y NFC|Ajustes y claves|📊 Informes|⭐ Opiniones', 'gestión: Carta, Mesas y NFC, Ajustes, Informes, Opiniones (sin Facturación ni Stock)');
  ok(await a.locator('#nuevo-producto').isHidden() && await a.getByRole('button', { name: 'Editar' }).count() === 0
    && await a.locator('[data-cat-renombrar]').count() === 0 && await a.locator('#aviso-carta').isVisible(),
    'el dueño no puede crear, editar ni cambiar precios (solo Agotado)');
  await a.locator('#hoy-strip', { hasText: 'vendido' }).waitFor();
  const hoy = await a.locator('#hoy-strip').innerText();
  ok(hoy.includes('27,80') && hoy.includes('1/4') && hoy.includes('4,0'), 'resumen de hoy: 27,80 €, 1/4 mesas con consumo, ⭐ 4,0 · ' + hoy.replace(/\s+/g, ' '));
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

  // ------------------------------------------------------------ OPINIONES, WIFI, OPCIONES Y TRIVIAL
  console.log('EXTRAS');
  await a.getByRole('tab', { name: '⭐ Opiniones' }).click();
  await a.locator('#opiniones .op-row', { hasText: 'Todo buenísimo' }).waitFor();
  ok((await a.locator('#opiniones .op-row').first().innerText()).includes('★★★★☆'), 'Opiniones: 4 estrellas de la Mesa 2 con su comentario');
  await a.getByRole('tab', { name: 'Ajustes y claves' }).click();
  await a.fill('#ex-wifi-red', 'Martinez-Clientes');
  await a.fill('#ex-wifi-clave', 'cañas2026');
  await a.locator('#ex-trivia').check();
  await a.locator('#form-extras button[type="submit"]').click();
  await a.getByText('Guardado', { exact: true }).waitFor();
  await a.getByRole('tab', { name: 'Carta' }).click();
  a.once('dialog', (dd) => dd.accept('mal'));
  await a.click('#editor-entrar');
  await a.getByText('Clave de VISAX incorrecta.').waitFor();
  ok(await a.locator('#nuevo-producto').isHidden(), 'Modo VISAX: con una clave mala no se edita');
  a.once('dialog', (dd) => dd.accept('plataforma-de-pruebas'));
  await a.click('#editor-entrar');
  await a.locator('#nuevo-producto').waitFor();
  ok(await a.getByRole('button', { name: 'Editar' }).count() === 13, 'Modo VISAX (tu clave de plataforma): crear, editar y precios');
  await a.locator('.prod-row', { hasText: 'Burger extra 3' }).getByRole('button', { name: 'Editar' }).click();
  await a.fill('#p-opciones', 'Punto: Poco hecho, Al punto, Hecho');
  await a.click('#p-guardar');
  await a.locator('.prod-row', { hasText: 'Burger extra 3' }).locator('.chip', { hasText: 'opciones' }).waitFor();
  await a.click('#editor-salir');
  await a.locator('#nuevo-producto').waitFor({ state: 'hidden' });
  ok(await a.getByRole('button', { name: 'Editar' }).count() === 0, 'Gestión: WiFi, trivial y opciones guardados; al salir del modo VISAX, sin editar');
  await m.evaluate(() => sessionStorage.clear());
  await m.reload();
  await m.locator('#wifi', { hasText: 'Martinez-Clientes' }).waitFor();
  ok((await m.locator('#wifi').innerText()).includes('cañas2026'), 'la carta de la mesa enseña la WiFi');
  await m.getByRole('button', { name: 'Añadir Burger extra 3 (elegir opciones)' }).click();
  await m.locator('#dlg-opc[open]').waitFor();
  await shot(m, 'lite-13-opciones');
  await m.locator('#dlg-opc label', { hasText: 'Al punto' }).click();
  await m.locator('#form-opc button[type="submit"]').click();
  await m.click('#cart-open');
  ok((await m.locator('#carrito-lineas').innerText()).includes('Punto: Al punto'), 'opciones: "Punto: Al punto" en el carrito');
  await m.click('#btn-enviar');
  await m.locator('#dlg-ok[open]').waitFor();
  await m.locator('#dlg-ok [data-cerrar]').click();
  const po = k.locator('#l-nuevos .ped', { hasText: 'Burger extra 3' });
  await po.waitFor({ timeout: 8000 });
  ok((await po.innerText()).includes('Punto: Al punto'), 'la opción elegida llega al panel con el plato');
  await po.getByRole('button', { name: '✓ Apuntado' }).click();
  await po.waitFor({ state: 'detached' });
  await m.click('#btn-trivia');
  await m.fill('#trivia-nombre', 'Paco');
  await m.locator('#form-trivia button[type="submit"]').click();
  for (let i = 1; i <= 10; i++) {
    await m.locator('#trivia-body').getByText(`Pregunta ${i} de 10`).waitFor();
    await m.locator('#trivia-body [data-resp="0"]').click();
  }
  await m.locator('#trivia-body .tv-fin').waitFor();
  const aciertos = (await m.locator('.tv-fin h2').innerText()).split('/')[0].trim();
  ok(psql("select puntos from carta.trivia_partidas where nombre = 'Paco'") === aciertos, `trivial: solo con el nombre, corrige el servidor (${aciertos}/10)`);
  ok(await m.locator('#trivia-ranking li.yo', { hasText: 'Paco' }).count() === 1, 'trivial: sale en el ranking de hoy');
  ok(await sinScroll(m), 'trivial en el móvil: sin scroll lateral');
  await shot(m, 'lite-11-trivial');
  await m.locator('#dlg-trivia [data-cerrar]').click();

  // ------------------------------------------------------------ PANTALLAS (cocina / barra)
  console.log('PANTALLAS');
  const k2 = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  vigilar(k2, 'pantalla cocina');
  await k2.goto(`${BASE}/cocina.html?r=martinez-demo&k=cocina-l`);
  await k2.locator('#l-nuevos .ped', { hasText: 'Mesa 3' }).waitFor();
  await k2.click('#k-puesto');
  await k2.locator('#dlg-puesto [value="cocina"]').check();
  await k2.locator('#dlg-puesto label', { hasText: 'Burgers' }).locator('input').uncheck();
  await k2.locator('#dlg-puesto button[type="submit"]').click();
  await k2.locator('#k-nuevo').getByText('Esperando pedidos…').waitFor();
  ok(await k2.locator('#k-puesto-chip', { hasText: 'Con patatas' }).isVisible() && await k2.locator('#v-pedidos').isHidden(),
    'pantalla de cocina: Nuevos → Preparando → ¡Listos!, solo "Con patatas" (la burger de la Mesa 3 no sale aquí)');
  ok(await k.locator('#l-nuevos .ped', { hasText: 'Mesa 3' }).count() === 1, 'el panel completo sigue viendo la Mesa 3');
  await k.locator('#l-nuevos .ped', { hasText: 'Mesa 3' }).getByRole('button', { name: '✓ Apuntado' }).click();
  await k.locator('#l-nuevos .ped', { hasText: 'Mesa 3' }).waitFor({ state: 'detached' });
  if (await g.locator('#dlg-ok[open]').count()) await g.locator('#dlg-ok [data-cerrar]').click();
  await g.locator('.prod', { hasText: 'Ensaladilla rusa' }).getByRole('button', { name: 'Añadir Ensaladilla rusa · Media' }).click();
  await g.getByRole('button', { name: 'Añadir Burger extra 1', exact: true }).click();
  await g.click('#cart-open'); await g.click('#btn-enviar'); await g.locator('#dlg-ok[open]').waitFor();
  await g.locator('#dlg-ok [data-cerrar]').click();
  const pc = k2.locator('#k-nuevo .kc', { hasText: 'Ensaladilla' });
  await pc.waitFor({ timeout: 8000 });
  ok(!(await pc.innerText()).includes('Burger extra 1') && (await pc.innerText()).includes('de otra pantalla'), 'cocina ve solo la ensaladilla del pedido');
  ok(await pc.evaluate((el) => el.classList.contains('t-verde')), 'tiempo en verde (recién llegado)');
  await pc.getByRole('button', { name: '▶ Empezar' }).click();
  const pp = k2.locator('#k-prep .kc', { hasText: 'Ensaladilla' });
  await pp.getByRole('button', { name: '✓ ¡Listo!' }).click();
  await k2.locator('#k-listo .kc', { hasText: 'Mesa 3' }).waitFor();
  const idListo = psql("select id from carta.pedidos p where exists (select 1 from carta.pedido_lineas l where l.pedido_id = p.id and l.nombre = 'Burger extra 1')");
  ok(psql(`select estado from carta.pedidos where id = '${idListo}'`) === 'nuevo' && await k.locator('#l-nuevos .ped', { hasText: 'Burger extra 1' }).count() === 1,
    'listo en cocina sin apuntar: el camarero aún lo tiene que apuntar en el TPV');
  await shot(k2, 'lite-08-pantalla-cocina');
  await k.locator('#l-nuevos .ped', { hasText: 'Burger extra 1' }).getByRole('button', { name: '✓ Apuntado' }).click();
  const li = k.locator('#l-listos .listo-item', { hasText: 'Mesa 3' });
  await li.waitFor({ timeout: 12000 });
  ok(psql(`select estado from carta.pedidos where id = '${idListo}'`) === 'listo', 'al apuntarlo pasa solo a "🍽 Listos para servir" (la cocina ya lo tenía)');
  await g.locator('.estado.listo').waitFor({ timeout: 12000 });
  ok(true, 'el cliente ve "🍽 ¡Listo!"');
  await k.getByRole('tab', { name: 'Mesas' }).click();
  ok(await k.locator('.mesa-tile.listo', { hasText: 'Mesa 3' }).count() === 1, 'mapa: Mesa 3 en azul (listo para servir)');
  await k.getByRole('tab', { name: 'Pedidos' }).click();
  await shot(k, 'lite-14-listos');
  await li.getByRole('button', { name: '✓ Servido' }).click();
  await li.waitFor({ state: 'detached' });
  ok(psql(`select estado from carta.pedidos where id = '${idListo}'`) === 'servido', '"✓ Servido" → estado servido');
  // La cocina recibe el pedido solo cuando el camarero lo apunta
  await k2.click('#k-puesto');
  await k2.locator('#dlg-puesto [name="esperar"]').check();
  await k2.locator('#dlg-puesto button[type="submit"]').click();
  await g.getByRole('button', { name: 'Añadir Ensaladilla rusa · Tapa', exact: true }).click();
  await g.click('#cart-open'); await g.click('#btn-enviar'); await g.locator('#dlg-ok[open]').waitFor();
  await g.locator('#dlg-ok [data-cerrar]').click();
  const pt = k.locator('#l-nuevos .ped', { hasText: 'Ensaladilla rusa · Tapa' });
  await pt.waitFor({ timeout: 8000 });
  await k2.waitForTimeout(3500);
  ok(await k2.locator('#k-nuevo .kc', { hasText: 'Tapa' }).count() === 0, 'modo "cuando el camarero lo apunta": la cocina aún no lo ve');
  await pt.getByRole('button', { name: '✓ Apuntado' }).click();
  await k2.locator('#k-nuevo .kc', { hasText: 'Tapa' }).waitFor({ timeout: 8000 });
  ok(true, 'al apuntarlo en el TPV, llega a cocina');
  // Al liberar la mesa (cobrada), el móvil del cliente pregunta "¿Qué tal todo?"
  await g.locator('#cuenta-mesa', { hasText: 'Lo que habéis pedido' }).waitFor({ timeout: 12000 });
  await k.getByRole('tab', { name: 'Mesas' }).click();
  await k.locator('.mesa-tile', { hasText: 'Mesa 3' }).click();
  k.once('dialog', (dd) => dd.accept());
  await k.locator('#dlg-mesa').getByRole('button', { name: /liberar mesa/ }).click();
  await k.locator('#dlg-mesa').waitFor({ state: 'hidden' });
  await k.getByRole('tab', { name: 'Pedidos' }).click();
  await g.locator('#dlg-valorar[open]').waitFor({ timeout: 15000 });
  ok(true, 'al liberar la Mesa 3, su cliente ve "¿Qué tal todo?" (y luego la reseña de Google)');
  await g.locator('#val-paso1 [data-cerrar]').click();

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
