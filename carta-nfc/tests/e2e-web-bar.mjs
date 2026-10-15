// E2E de la plantilla de webs de bares (clientes/_plantilla + herramientas/web-bar.mjs) contra la BD local.
// Genera clientes/bar-la-demo/publicar/ y lo sirve en un navegador con la API redirigida al servidor local
// (no toca producción). Comprueba la web (SEO, horario, mapa bajo demanda) y la carta (ver, pedir, avisar).
//   node e2e-web-bar.mjs          SHOTS=/carpeta  para guardar capturas
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || '8787';
const BASE = `http://localhost:${PORT}`;
const BAR = path.join(DIR, '../clientes/bar-la-demo');
const OUT = path.join(BAR, 'publicar');
const WEB = 'https://bar-la-demo.netlify.app';
const SHOTS = process.env.SHOTS || '';
const psql = (sql) => execSync(`psql -h /tmp -p 54329 -U postgres -d carta_test -tAq -c "${sql}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('FALLO: ' + m); console.log('  ✓ ' + m); };
const TIPOS = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain' };

execSync('bash ./db-local.sh --demo', { cwd: DIR, stdio: 'ignore' });
execSync('node herramientas/web-bar.mjs clientes/bar-la-demo', { cwd: path.join(DIR, '..'), stdio: 'ignore' });
const srv = spawn('node', ['servidor-local.mjs'], { cwd: DIR, env: { ...process.env, PORT }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
psql("update carta.restaurantes set mesa_libre = false where slug = 'demo'");
const mesa = psql("select m.codigo from carta.mesas m join carta.restaurantes r on r.id = m.restaurante_id where r.slug = 'demo' and m.nombre = 'Mesa 2'");
const pedidos = () => +psql("select count(*) from carta.pedidos p join carta.restaurantes r on r.id = p.restaurante_id where r.slug = 'demo'");

const browser = await chromium.launch();
const errores = [];
const nuevo = async (disp) => {
  const ctx = await browser.newContext({ ...devices[disp], locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  await ctx.route('https://giazlntdbfhnnfizmfao.supabase.co/rest/v1/rpc/*', async (route) => {
    const fn = new URL(route.request().url()).pathname.split('/').pop();
    await route.fulfill({ response: await route.fetch({ url: `${BASE}/rest/v1/rpc/${fn}` }) });
  });
  await ctx.route(`${WEB}/**`, (route) => {
    let p = new URL(route.request().url()).pathname; if (p === '/') p = '/index.html';
    const f = path.join(OUT, path.normalize(p));
    if (!f.startsWith(OUT) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: '404' });
    route.fulfill({ contentType: TIPOS[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await ctx.route(/^https:\/\/(fonts\.(googleapis|gstatic)\.com|maps\.google\.com)\//, (route) => route.abort());
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`${disp}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errores.push(`${disp}: ${m.text()}`); });
  return { ctx, page };
};

try {
  // ── archivos generados
  console.log('Generador');
  for (const f of ['index.html', 'carta.html', 'aviso-legal.html', 'privacidad.html', 'robots.txt', 'sitemap.xml', '_headers', 'netlify.toml']) {
    ok(fs.existsSync(path.join(OUT, f)), `genera ${f}`);
  }
  ok(fs.readdirSync(path.join(OUT, 'img')).some((n) => n.endsWith('-800.webp')), 'reduce fotos a WebP');
  const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
  ok(!/clave|demo-cocina/i.test(fs.readFileSync(path.join(OUT, 'carta.html'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')), 'la web no lleva claves');
  ok(/connect-src https:\/\/giazlntdbfhnnfizmfao\.supabase\.co/.test(fs.readFileSync(path.join(OUT, '_headers'), 'utf8')), 'CSP permite solo la API de pedidos');

  // ── web en el móvil
  console.log('Web (iPhone)');
  const { ctx, page } = await nuevo('iPhone 13');
  await page.goto(WEB + '/');
  ok((await page.locator('h1').innerText()) === 'Bar La Demo', 'portada con el nombre');
  ok(/Bar en Sanlúcar de Barrameda/.test(await page.title()), 'título con tipo y ciudad (SEO local)');
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
  ok(ld['@type'] === 'BarOrPub' && ld.address.addressLocality === 'Sanlúcar de Barrameda' && ld.openingHoursSpecification.length > 5, 'datos estructurados de Google (dirección y horario)');
  ok(ld.hasMenu === WEB + '/carta.html', 'datos estructurados enlazan la carta');
  ok(await page.locator('link[rel=canonical]').getAttribute('href') === WEB + '/', 'canonical');
  await page.locator('#estado:not([hidden])').waitFor();
  ok(/^(Abierto ahora · cierra|Cerrado ahora)/.test(await page.locator('#estado').innerText()), 'abierto/cerrado ahora según el horario');
  ok(await page.locator('tr.hoy').count() === 1, 'marca el día de hoy en el horario');
  ok(await page.locator('#mapa iframe').count() === 0, 'el mapa de Google no se carga solo');
  await page.locator('#verMapa').click();
  ok(await page.locator('#mapa iframe').count() === 1, 'el mapa se carga al pulsar');
  const sinAlt = await page.locator('img:not([alt])').count();
  ok(sinAlt === 0, 'todas las imágenes tienen alt');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sin scroll horizontal en el móvil');
  ok(await page.locator('.fijo a[href="carta.html"]').isVisible(), 'botón fijo "Ver la carta" en el móvil');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/web-movil.png`, fullPage: true });
  await page.locator('.fijo a').click();
  await page.waitForURL(/carta\.html/);

  // ── carta sin mesa (visita desde Google): se ve, no se pide
  console.log('Carta sin mesa');
  await page.locator('.dish').first().waitFor();
  ok(await page.locator('.dish').count() >= 15, 'carta con los platos de la BD');
  ok(await page.locator('.alg span').filter({ hasText: 'Gluten' }).count() > 0, 'muestra alérgenos');
  ok(await page.locator('[data-add]').count() === 0, 'sin mesa no hay botones de pedir');
  ok(/acerca el móvil/i.test(await page.locator('#intro').innerText()), 'explica cómo pedir desde la mesa');

  // ── carta desde el NFC de una mesa
  console.log('Carta desde el NFC (Mesa 2)');
  const antes = pedidos();
  await page.goto(`${WEB}/carta.html?mesa=${mesa}`);
  await page.locator('[data-add]').first().waitFor();
  ok((await page.locator('#pillTxt').innerText()) === 'Mesa 2', 'la mesa viene del NFC');
  ok(!page.url().includes('mesa='), 'la URL se limpia (si la comparten no lleva la mesa)');
  await page.locator('[data-add]').nth(0).click();
  await page.locator('[data-add]').nth(0).click();
  await page.locator('[data-add]').nth(1).click();
  ok((await page.locator('#barAct').innerText()).includes('3'), 'carrito con 3 productos');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/carta-movil.png` });
  await page.locator('#barAct [data-act="cart"]').click();
  await page.locator('[data-note-tg]').first().click();
  await page.locator('[data-note]').first().fill('sin cebolla');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/carta-pedido.png` });
  await page.locator('#sendBtn').click();
  await page.locator('#mOk:not([hidden])').waitFor();
  ok(pedidos() === antes + 1, 'el pedido llega a la BD');
  const p = psql("select p.mesa_nombre || '|' || p.total || '|' || (select string_agg(coalesce(l.nota,''), ',') from carta.pedido_lineas l where l.pedido_id = p.id) from carta.pedidos p order by p.creado desc limit 1");
  ok(p.startsWith('Mesa 2|8.80|') && p.includes('sin cebolla'), 'mesa, total (lo pone el servidor) y nota correctos: ' + p);
  await page.locator('#mOk [data-close]').click();
  await page.locator('#barAct [data-act="camarero"]').click();
  await page.locator('.toast.show').waitFor();
  ok(+psql("select count(*) from carta.pedidos where tipo = 'camarero'") === 1, 'llamar al camarero');
  psql("update carta.pedidos set estado = 'listo' where tipo = 'pedido'");
  await page.locator('#barSub.hot').waitFor({ timeout: 15000 });
  ok(/listo/i.test(await page.locator('#barSub').innerText()), 'avisa cuando el pedido está listo');

  // ── carta general (/r/demo → ?pedir=1) con "elegir mesa"
  console.log('Carta general: elegir mesa');
  psql("update carta.restaurantes set mesa_libre = true where slug = 'demo'");
  const ctx2 = await nuevo('Pixel 7');
  await ctx2.page.goto(`${WEB}/carta.html?pedir=1`);
  await ctx2.page.locator('[data-add]').first().click();
  await ctx2.page.locator('#barAct [data-act="cart"]').click();
  await ctx2.page.locator('#sendBtn').click();
  await ctx2.page.locator('#mMesa:not([hidden]) [data-mesa]').first().waitFor();
  await ctx2.page.locator('#mesasGrid button', { hasText: 'Terraza 1' }).click();
  await ctx2.page.locator('#mOk:not([hidden])').waitFor();
  ok(psql("select mesa_nombre from carta.pedidos where tipo = 'pedido' order by creado desc limit 1") === 'Terraza 1', 'pedido desde la carta general con la mesa elegida');

  // ── pedidos cerrados
  psql("update carta.restaurantes set pedidos_abiertos = false where slug = 'demo'");
  await ctx2.page.reload();
  await ctx2.page.locator('.dish').first().waitFor();
  ok(await ctx2.page.locator('#closedBox').isVisible() && await ctx2.page.locator('[data-add]').count() === 0, 'pedidos cerrados: solo se ve la carta');
  psql("update carta.restaurantes set pedidos_abiertos = true, mesa_libre = false where slug = 'demo'");

  // ── escritorio
  const ctx3 = await nuevo('Desktop Chrome');
  await ctx3.page.goto(WEB + '/');
  ok(await ctx3.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'escritorio sin scroll horizontal');
  if (SHOTS) await ctx3.page.screenshot({ path: `${SHOTS}/web-escritorio.png`, fullPage: true });
  await ctx3.page.goto(WEB + '/aviso-legal.html');
  ok(await ctx3.page.locator('meta[name=robots][content=noindex]').count() === 1, 'páginas legales sin indexar');

  ok(errores.length === 0, 'sin errores JS' + (errores.length ? ': ' + errores.join(' | ') : ''));
  console.log('\nE2E WEB BAR OK');
} finally {
  await browser.close();
  srv.kill();
}
