// E2E de la página propia de Martínez (clientes/martinez-bar/index.html) contra la BD local.
// La página llama a Supabase y enlaza al ticket por URL absoluta: aquí se redirigen al servidor local,
// así que no toca producción. Comprueba que:
//   - sin facturación activa la página funciona igual (sin enlace de ticket ni errores);
//   - con facturación activa, al cobrar la mesa aparece "Ver tu ticket" y abre el ticket con QR.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || '8787';
const BASE = `http://localhost:${PORT}`;
const PAGINA = 'https://martinez-bar-pedidos.test/';
const HTML = readFileSync(path.join(DIR, '../clientes/martinez-bar/index.html'), 'utf8');
const SHOTS = process.env.SHOTS || '';
const psql = (sql) => execSync(`psql -h /tmp -p 54329 -U postgres -d carta_test -tAq -c "${sql}"`).toString().trim();
const anon = (sql) => psql(`set role anon; ${sql}`);
const j = (o) => `'${JSON.stringify(o).replace(/"/g, '\\"')}'::jsonb`;
const ok = (c, m) => { if (!c) throw new Error('FALLO: ' + m); console.log('  ✓ ' + m); };
const ANIO = new Date().toLocaleString('es-ES', { year: 'numeric', timeZone: 'Europe/Madrid' });

execSync('bash ./db-local.sh', { cwd: DIR, stdio: 'ignore' });
const srv = spawn('node', ['servidor-local.mjs'], { cwd: DIR, env: { ...process.env, PORT }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
psql("select carta._alta('Martínez Bar', 'martinez-bar', 4, 'admin-m', 'cocina-m')");
const cat = JSON.parse(anon(`select public.carta_admin('martinez-bar','admin-m','categoria',${j({ nombre: 'Burgers' })})`)).id;
anon(`select public.carta_admin('martinez-bar','admin-m','producto',${j({ nombre: 'McTínez', precio: '10', categoria_id: cat })})`);
const mesa = psql("select codigo from carta.mesas m join carta.restaurantes r on r.id = m.restaurante_id where r.slug = 'martinez-bar' and m.nombre = 'Mesa 1'");
const pedidoIds = () => psql("select coalesce(json_agg(p.id), '[]') from carta.pedidos p join carta.restaurantes r on r.id = p.restaurante_id where r.slug = 'martinez-bar' and not p.cerrado");

const browser = await chromium.launch();
const errores = [];
const llamadas = [];
const vigilar = (p, q) => {
  p.on('pageerror', (e) => errores.push(`${q}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/400|Failed to load resource/.test(m.text())) errores.push(`${q}: ${m.text()}`); });
};
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
await ctx.route('https://giazlntdbfhnnfizmfao.supabase.co/rest/v1/rpc/*', async (route) => {
  const fn = new URL(route.request().url()).pathname.split('/').pop();
  llamadas.push(fn);
  await route.fulfill({ response: await route.fetch({ url: `${BASE}/rest/v1/rpc/${fn}` }) });
});
await ctx.route(`${PAGINA}**`, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: HTML }));
await ctx.route('https://carta-nfc-pedidos.netlify.app/**', async (route) => {
  const u = new URL(route.request().url());
  await route.fulfill({ response: await route.fetch({ url: BASE + u.pathname + u.search }) });
});
await ctx.route(/^https:\/\/(martinez-bar\.vercel\.app|fonts\.(googleapis|gstatic)\.com)\//, (route) => route.abort());

async function pedir(m) {
  await m.locator('[data-add]').first().click();
  await m.locator('#barAct [data-act="cart"]').click();
  await m.locator('#sendBtn').click();
  await m.locator('#mOk:not([hidden])').waitFor();
  await m.locator('#mOk [data-close]').click();
}

try {
  console.log('SIN FACTURACIÓN (Martínez hoy)');
  const m = await ctx.newPage();
  vigilar(m, 'martinez');
  await m.goto(`${PAGINA}?mesa=${mesa}`);
  await m.locator('[data-add]').first().waitFor();
  await pedir(m);
  ok(true, 'pedido enviado desde la página de Martínez');
  // La cocina cobra con el flujo de siempre (sin facturación): la mesa se cierra sin ticket.
  psql("update carta.pedidos set cerrado = true where restaurante_id = (select id from carta.restaurantes where slug = 'martinez-bar')");
  await m.reload();
  await m.locator('[data-add]').first().waitFor();
  await m.waitForTimeout(1000);
  ok(llamadas.includes('fiscal_tickets'), 'consulta fiscal_tickets');
  await m.locator('#barInfo').click();
  await m.locator('#mCart:not([hidden]) .ord').first().waitFor();
  ok(await m.locator('#mCart .ord .tk').count() === 0, 'sin facturación: no aparece "Ver tu ticket"');
  await m.locator('#mCart [data-close]').click();

  console.log('CON FACTURACIÓN (entorno de pruebas)');
  anon(`select public.fiscal_admin('martinez-bar','admin-m','titular',${j({
    nif: '00000000T', razon_social: 'DEMO SIN VALIDEZ FISCAL', domicilio: 'Plaza del Cabildo 1', tipo_persona: 'juridica',
  })})`);
  await pedir(m);
  const ids = JSON.parse(pedidoIds());
  ok(ids.length === 1, 'un pedido abierto en Mesa 1');
  const doc = JSON.parse(anon(`select public.fiscal_cobrar('martinez-bar','cocina-m',${j({ pedido_ids: ids, pagos: [{ forma: 'tarjeta', importe: 10 }] })})`));
  ok(doc.num_serie === `T${ANIO}-000001`, `cocina cobra → ticket ${doc.num_serie}`);
  await m.locator('#barInfo').click();
  const enlace = m.locator('#mCart .ord .tk', { hasText: 'Ver tu ticket' });
  await enlace.waitFor({ timeout: 30000 });
  ok(await enlace.count() === 1, 'aparece "Ver tu ticket" solo en el pedido cobrado con ticket (sin recargar)');
  ok((await enlace.getAttribute('href')) === `https://carta-nfc-pedidos.netlify.app/ticket.html?t=${doc.token}`, 'el enlace apunta al ticket de la plataforma');
  if (SHOTS) await m.screenshot({ path: `${SHOTS}/m01-ver-ticket.png` });
  const [tkPage] = await Promise.all([ctx.waitForEvent('page'), enlace.click()]);
  vigilar(tkPage, 'ticket');
  await tkPage.locator('.tk').waitFor();
  const tk = await tkPage.locator('.tk').innerText();
  ok(tk.includes(`T${ANIO}-000001`) && tk.includes('10,00') && await tkPage.locator('.tk-qr svg').count() === 1, 'ticket digital con número, total y QR');
  if (SHOTS) await tkPage.screenshot({ path: `${SHOTS}/m02-ticket.png`, fullPage: true });

  ok(errores.length === 0, 'sin errores JS' + (errores.length ? ': ' + errores.join(' | ') : ''));
  console.log('\nE2E MARTÍNEZ OK');
} catch (e) {
  console.error(e.message);
  if (errores.length) console.error('Errores consola:', errores);
  process.exitCode = 1;
} finally {
  await browser.close();
  srv.kill();
}
