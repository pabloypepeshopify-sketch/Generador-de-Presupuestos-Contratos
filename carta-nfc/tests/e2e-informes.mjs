// E2E de los informes de ventas (005_informes.sql + assets/informes.js) con navegador real y BD local.
// Genera ventas de hoy, ayer y hace 3 días a horas distintas; comprueba gestión, tablet, móvil, cierre Z y Excel.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || '8787';
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS || '';
const psqlIn = (sql) => execSync('psql -h /tmp -p 54329 -U postgres -d carta_test -tAq -v ON_ERROR_STOP=1 -f -', { input: sql }).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('FALLO: ' + m); console.log('  ✓ ' + m); };
const shot = async (p, n, full) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: !!full }); };

execSync('bash ./db-local.sh', { cwd: DIR, stdio: 'ignore' });
const srv = spawn('node', ['servidor-local.mjs'], { cwd: DIR, env: { ...process.env, PORT }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

// Bar con facturación: hoy 13:10 (2 croquetas + 2 cañas = 10), 14:20 (1 croqueta = 3), 21:05 (3 croquetas + 1 tarta = 14,50),
// 21:40 (2 cañas = 4, cancelado); ayer 21:30 (2 croquetas = 6); hace 3 días 14:00 (1 tarta = 5,50). El flan no se vende.
psqlIn(`
select carta._alta('Bar Informes', 'bar-inf', 6, 'admin-i', 'cocina-i');
select carta._alta('Bar Sin Facturar', 'sin-fact', 2, 'admin-s', 'cocina-s');
do $$
declare v jsonb; ct uuid; cb uuid; cro uuid; cana uuid; flan uuid; tarta uuid; m text[]; hoy date := (now() at time zone 'Europe/Madrid')::date;
  tk text; id_ uuid;
begin
  v := public.carta_admin('bar-inf', 'admin-i', 'categoria', '{"nombre":"Tapas"}');   ct := (v->>'id')::uuid;
  v := public.carta_admin('bar-inf', 'admin-i', 'categoria', '{"nombre":"Bebidas"}'); cb := (v->>'id')::uuid;
  v := public.carta_admin('bar-inf', 'admin-i', 'producto', jsonb_build_object('nombre', 'Croquetas', 'precio', '3', 'categoria_id', ct)); cro := (v->>'id')::uuid;
  v := public.carta_admin('bar-inf', 'admin-i', 'producto', jsonb_build_object('nombre', 'Tarta de queso', 'precio', '5.50', 'categoria_id', ct)); tarta := (v->>'id')::uuid;
  v := public.carta_admin('bar-inf', 'admin-i', 'producto', jsonb_build_object('nombre', 'Flan', 'precio', '4', 'categoria_id', ct)); flan := (v->>'id')::uuid;
  v := public.carta_admin('bar-inf', 'admin-i', 'producto', jsonb_build_object('nombre', 'Caña', 'precio', '2', 'categoria_id', cb)); cana := (v->>'id')::uuid;
  m := array(select x->>'codigo' from jsonb_array_elements(v->'mesas') x order by x->>'nombre');

  tk := public.carta_pedir(m[1], jsonb_build_array(jsonb_build_object('producto_id', cro, 'cantidad', 2), jsonb_build_object('producto_id', cana, 'cantidad', 2)))->>'token';
  update carta.pedidos set creado = (hoy + time '13:10') at time zone 'Europe/Madrid' where token = tk;
  tk := public.carta_pedir(m[2], jsonb_build_array(jsonb_build_object('producto_id', cro, 'cantidad', 1)))->>'token';
  update carta.pedidos set creado = (hoy + time '14:20') at time zone 'Europe/Madrid' where token = tk;
  tk := public.carta_pedir(m[3], jsonb_build_array(jsonb_build_object('producto_id', cro, 'cantidad', 3), jsonb_build_object('producto_id', tarta, 'cantidad', 1)))->>'token';
  update carta.pedidos set creado = (hoy + time '21:05') at time zone 'Europe/Madrid' where token = tk returning id into id_;
  perform public.carta_cocina('bar-inf', 'cocina-i', 'estado', jsonb_build_object('id', id_, 'estado', 'listo'));
  update carta.pedido_eventos set en = (hoy + time '21:17') at time zone 'Europe/Madrid' where pedido_id = id_ and estado = 'listo';
  tk := public.carta_pedir(m[4], jsonb_build_array(jsonb_build_object('producto_id', cana, 'cantidad', 2)))->>'token';
  update carta.pedidos set creado = (hoy + time '21:40') at time zone 'Europe/Madrid' where token = tk returning id into id_;
  perform public.carta_cocina('bar-inf', 'cocina-i', 'estado', jsonb_build_object('id', id_, 'estado', 'cancelado'));
  tk := public.carta_pedir(m[5], jsonb_build_array(jsonb_build_object('producto_id', cro, 'cantidad', 2)))->>'token';
  update carta.pedidos set creado = (hoy - 1 + time '21:30') at time zone 'Europe/Madrid' where token = tk;
  tk := public.carta_pedir(m[6], jsonb_build_array(jsonb_build_object('producto_id', tarta, 'cantidad', 1)))->>'token';
  update carta.pedidos set creado = (hoy - 3 + time '14:00') at time zone 'Europe/Madrid' where token = tk;

  perform public.fiscal_admin('bar-inf', 'admin-i', 'titular', '{"nif":"00000000T","razon_social":"DEMO","domicilio":"Calle 1","tipo_persona":"juridica"}');
  perform public.fiscal_cobrar('bar-inf', 'cocina-i', jsonb_build_object(
    'pedido_ids', (select jsonb_agg(id) from carta.pedidos where mesa_nombre = 'Mesa 1' and restaurante_id = (select id from carta.restaurantes where slug = 'bar-inf')),
    'pagos', '[{"forma":"tarjeta","importe":"10"}]'::jsonb));
end $$;`);

const browser = await chromium.launch();
const errores = [];
const vigilar = (p, q) => {
  p.on('pageerror', (e) => errores.push(`${q}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/400|Failed to load resource/.test(m.text())) errores.push(`${q}: ${m.text()}`); });
};
const txt = (p, sel) => p.locator(sel).innerText();

try {
  console.log('GESTIÓN · Informes de hoy');
  const actx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  const a = await actx.newPage();
  vigilar(a, 'admin');
  await a.goto(`${BASE}/admin.html?r=bar-inf&k=admin-i`);
  await a.getByRole('tab', { name: /Informes/ }).click();
  await a.locator('#informes .iv-hero .v').waitFor();
  const hero = await txt(a, '#informes .iv-hero');
  ok(hero.includes('27,50') && hero.includes('vs ayer'), 'ventas de hoy 27,50 € con comparación vs ayer');
  ok(hero.includes('+358 %') || hero.includes('358'), 'delta +358 % frente a ayer (6,00 €)');
  const kpis = await txt(a, '#informes .iv-hero + .iv-kpis');
  ok(kpis.includes('Pedidos') && kpis.includes('\n3') && kpis.includes('9,17'), 'pedidos 3 · ticket medio 9,17 €');
  ok(kpis.includes('Cobrado (1 ticket)') && kpis.includes('10,00'), 'cobrado con facturación: 1 ticket de 10,00 €');
  const hora = await txt(a, '#informes .iv-card:has(h3:text("Ventas por hora")) .iv-sub');
  ok(hora.includes('21:00') && hora.includes('14,50'), 'hora punta 21:00 con 14,50 €');
  ok(await a.locator('#informes .iv-col').count() >= 9, 'columnas por hora (13 h → 21 h)');
  const prods = a.locator('#informes [data-iv-productos] tbody tr');
  ok((await prods.first().innerText()).includes('Croquetas') && (await prods.first().innerText()).includes('18,00'), 'lo más vendido: croquetas 6 uds · 18,00 €');
  await a.locator('#informes [data-iv-q]').fill('caña');
  await a.waitForFunction(() => document.querySelectorAll('#informes [data-iv-productos] tbody tr').length === 1);
  ok((await prods.first().innerText()).includes('Caña'), 'buscador: "caña" → 2 uds (la cancelada no cuenta)');
  await a.locator('#informes [data-iv-q]').fill('');
  await a.locator('#informes [data-iv-orden="unidades"]').click();
  ok((await prods.first().innerText()).includes('Croquetas'), 'ordenar por unidades');
  ok((await txt(a, '#informes .iv-card:has(h3:text("Sin ventas"))')).includes('Flan'), 'sin ventas: el flan');
  const serv = await txt(a, '#informes .iv-card:has(h3:text("Servicio"))');
  ok(serv.includes('12 min') && serv.includes('13:10') && serv.includes('21:05'), 'cocina 12 min de media · primer 13:10 · último 21:05');
  ok((await txt(a, '#informes .iv-card:has(h3:text("IVA repercutido"))')).includes('9,09'), 'IVA repercutido: base 9,09');
  await a.locator('#informes .iv-col').last().hover();
  ok(!(await a.locator('#informes .iv-tip').isHidden()), 'tooltip al pasar por una columna');
  await shot(a, 'i01-gestion-hoy', true);

  console.log('GESTIÓN · 7 días y Excel');
  await a.locator('#informes [data-iv-rango="7d"]').click();
  await a.locator('#informes .iv-card:has(h3:text("Ventas por día"))').waitFor();
  const h7 = await txt(a, '#informes .iv-hero');
  ok(h7.includes('39,00') && h7.includes('7 días'), '7 días: 39,00 € (hoy + ayer + hace 3 días)');
  ok(await a.locator('#informes .iv-card:has(h3:text("Ventas por día")) .iv-col').count() === 7, 'gráfica de 7 días');
  ok(await a.locator('#informes .iv-card:has(h3:text("Por día de la semana")) .iv-col').count() === 7, 'gráfica por día de la semana');
  const [dl] = await Promise.all([a.waitForEvent('download'), a.locator('#informes [data-iv-csv]').click()]);
  const csv = readFileSync(await dl.path(), 'utf8');
  ok(csv.charCodeAt(0) === 0xfeff && csv.includes('"Resumen"') && csv.includes('"Croquetas";"Tapas";8;24,00'), `Excel del informe (${dl.suggestedFilename()})`);
  await shot(a, 'i02-gestion-7d', true);

  console.log('TABLET · pestaña Informes y cierre Z');
  const k = await (await browser.newContext({ viewport: { width: 1180, height: 820 }, locale: 'es-ES', timezoneId: 'Europe/Madrid' })).newPage();
  vigilar(k, 'cocina');
  await k.goto(`${BASE}/cocina.html?r=bar-inf&k=cocina-i`);
  await k.locator('#tab-informes:not([hidden])').waitFor();
  await k.getByRole('tab', { name: /Informes/ }).click();
  await k.locator('#informes-panel .iv-hero .v').waitFor();
  ok((await txt(k, '#informes-panel .iv-hero')).includes('27,50'), 'tablet: informe de hoy');
  await k.locator('#informes-panel [data-iv-z]').click();
  await k.waitForFunction(() => document.getElementById('iv-print')?.contentDocument?.body?.innerText.includes('CIERRE Z'));
  const z = await k.evaluate(() => document.getElementById('iv-print').contentDocument.body.innerText);
  ok(z.includes('27,50') && z.includes('Tarjeta') && z.includes('Croquetas') && z.includes('T'), 'cierre Z: ventas, cobros por forma de pago y lo más vendido');

  console.log('MÓVIL · informes');
  const mctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  const t = await mctx.newPage();
  vigilar(t, 'movil');
  await t.goto(`${BASE}/cocina.html?r=bar-inf&k=cocina-i`);
  await t.locator('#tab-informes:not([hidden])').waitFor();
  await t.getByRole('tab', { name: /Informes/ }).click();
  await t.locator('#informes-panel .iv-hero .v').waitFor();
  ok(await t.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'móvil: sin scroll lateral');
  await shot(t, 'i03-movil', true);
  const [zp] = await Promise.all([mctx.waitForEvent('page'), t.locator('#informes-panel [data-iv-z]').click()]);
  await zp.waitForLoadState();
  ok((await zp.locator('body').innerText()).includes('CIERRE Z'), 'móvil: el cierre Z se abre en su propia página para imprimir');
  await zp.close();

  console.log('BAR SIN FACTURACIÓN (como Martínez)');
  const s = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
  vigilar(s, 'sin');
  await s.goto(`${BASE}/cocina.html?r=sin-fact&k=cocina-s`);
  await s.locator('#k-nombre:text("Bar Sin Facturar")').waitFor();
  await s.waitForTimeout(800);
  ok(await s.locator('#tab-informes').isHidden() && await s.locator('#tab-tickets').isHidden(), 'clave de cocina: el panel sigue igual (sin Informes ni Tickets)');
  await s.goto(`${BASE}/cocina.html?r=sin-fact&k=admin-s`);
  await s.locator('#tab-informes:not([hidden])').waitFor();
  ok(true, 'con la clave del dueño sí ve Informes');
  await s.getByRole('tab', { name: /Informes/ }).click();
  await s.locator('#informes-panel .iv-hero .v').waitFor();
  ok(await s.locator('#informes-panel .iv-card:has(h3:text("Cobros"))').count() === 0, 'sin facturación: no hay bloque de cobros, solo ventas por pedidos');

  ok(errores.length === 0, 'sin errores JS' + (errores.length ? ': ' + errores.join(' | ') : ''));
  console.log('\nE2E INFORMES OK');
} catch (e) {
  console.error(e.message);
  if (errores.length) console.error('Errores consola:', errores);
  process.exitCode = 1;
} finally {
  await browser.close();
  srv.kill();
}
