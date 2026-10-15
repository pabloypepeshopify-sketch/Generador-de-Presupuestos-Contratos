// E2E del TPV, segunda parte, con navegador real y BD local: "Varios" en el comandero, corregir consumo
// (menos, invitar, quitar), descuento al cobrar, factura de un ticket (F3), caja (abrir, salida, arqueo, cierre)
// y puesto de la pantalla (filtro por categoría). Y que un bar sin facturación no ve nada de esto.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || '8787';
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS || '';
const psql = (sql) => execSync(`psql -h /tmp -p 54329 -U postgres -d carta_test -tAq -c "${sql}"`).toString().trim();
const psqlIn = (sql) => execSync('psql -h /tmp -p 54329 -U postgres -d carta_test -tAq -v ON_ERROR_STOP=1 -f -', { input: sql }).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('FALLO: ' + m); console.log('  ✓ ' + m); };
const shot = async (p, n, full) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: !!full }); };
const ANIO = new Date().toLocaleString('es-ES', { year: 'numeric', timeZone: 'Europe/Madrid' });

execSync('bash ./db-local.sh', { cwd: DIR, stdio: 'ignore' });
const srv = spawn('node', ['servidor-local.mjs'], { cwd: DIR, env: { ...process.env, PORT }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
psqlIn(`
select carta._alta('Bar TPV', 'bar-tpv', 6, 'admin-t', 'cocina-t');
select carta._alta('Bar Sin Facturar', 'sin-fact', 2, 'admin-s', 'cocina-s');
do $$
declare v jsonb; ct uuid; cb uuid;
begin
  v := public.carta_admin('bar-tpv', 'admin-t', 'categoria', '{"nombre":"Tapas"}');   ct := (v->>'id')::uuid;
  v := public.carta_admin('bar-tpv', 'admin-t', 'categoria', '{"nombre":"Bebidas"}'); cb := (v->>'id')::uuid;
  perform public.carta_admin('bar-tpv', 'admin-t', 'producto', jsonb_build_object('nombre', 'Croquetas', 'precio', '3', 'categoria_id', ct));
  perform public.carta_admin('bar-tpv', 'admin-t', 'producto', jsonb_build_object('nombre', 'Caña', 'precio', '2', 'categoria_id', cb));
  perform public.fiscal_admin('bar-tpv', 'admin-t', 'titular', '{"nif":"00000000T","razon_social":"DEMO","domicilio":"Calle 1","tipo_persona":"juridica"}');
  v := public.carta_admin('sin-fact', 'admin-s', 'producto', '{"nombre":"Café","precio":"1.5"}');
end $$;`);

const browser = await chromium.launch();
const errores = [];
const vigilar = (p, q) => {
  p.on('pageerror', (e) => errores.push(`${q}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/400|Failed to load resource/.test(m.text())) errores.push(`${q}: ${m.text()}`); });
  p.on('dialog', (d) => d.accept());
};

try {
  const k = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
  vigilar(k, 'tablet');
  await k.goto(`${BASE}/cocina.html?r=bar-tpv&k=cocina-t`);
  await k.locator('#tab-caja:not([hidden])').waitFor();

  console.log('CAJA · abrir y salida');
  await k.click('#tab-caja');
  await k.locator('[data-cj-form="abrir"] [name="fondo"]').fill('100');
  await k.locator('[data-cj-form="abrir"] button[type="submit"]').click();
  await k.locator('.cj-hero').waitFor();
  ok((await k.locator('.cj-hero b').textContent()).includes('100,00'), 'caja abierta: esperado 100,00 €');
  await k.locator('[data-cj-form="movimiento"] [name="importe"]').fill('12,50');
  await k.locator('[data-cj-concepto="Proveedor"]').click();
  await k.locator('[data-cj-form="movimiento"] button[type="submit"]').click();
  await k.locator('.cj-mov', { hasText: 'Proveedor' }).waitFor();
  ok((await k.locator('.cj-hero b').textContent()).includes('87,50'), 'salida de 12,50 al proveedor: esperado 87,50 €');
  await shot(k, 'u01-caja');

  console.log('COMANDERO · Varios');
  await k.click('[data-vista="comandas"]');
  await k.click('#k-pedido');
  const cm = k.locator('#dlg-comandero');
  await cm.locator('.cm-prod').first().waitFor();
  await cm.locator('[data-cm-mesa]', { hasText: 'Mesa 1' }).click();
  for (let i = 0; i < 3; i++) await cm.locator('.cm-prod', { hasText: 'Croquetas' }).click();
  for (let i = 0; i < 2; i++) await cm.locator('.cm-prod', { hasText: 'Caña' }).click();
  await cm.locator('[data-cm="varios"]').first().click();
  await cm.locator('[data-cm-varios] [name="nombre"]').fill('Tabaco');
  await cm.locator('[data-cm-varios] [name="precio"]').fill('5,50');
  await cm.locator('[data-cm-varios] [name="iva"]').selectOption('21');
  await shot(k, 'u02-varios');
  await cm.locator('[data-cm-varios] button[type="submit"]').click();
  ok((await cm.locator('.cm-total').innerText()).includes('18,50'), 'comandero: 3 croquetas + 2 cañas + Tabaco 5,50 = 18,50 €');
  await cm.locator('[data-cm="enviar"]').click();
  await k.locator('#l-nuevo .ticket', { hasText: 'Tabaco' }).waitFor();
  ok(psql("select iva from carta.pedido_lineas where nombre = 'Tabaco'") === '21.00', 'Varios guardado con IVA 21 %');

  console.log('PUESTO · barra solo con Bebidas');
  await k.click('#k-puesto');
  const dp = k.locator('#dlg-puesto');
  await dp.locator('input[value="cats"]').check();
  await dp.locator('label', { hasText: 'Tapas' }).locator('input').uncheck();
  await shot(k, 'u03-puesto');
  await dp.locator('button[type="submit"]').click();
  const t = k.locator('#l-nuevo .ticket').first();
  await t.locator('.t-otros').waitFor();
  const txt = await t.textContent();
  ok(txt.includes('Caña') && txt.includes('Tabaco') && !txt.includes('Croquetas'), 'la barra ve Caña y Varios, no las croquetas');
  ok((await t.locator('.t-otros').textContent()).includes('1 línea'), 'aviso de 1 línea de otro puesto');
  await k.click('#k-puesto');
  await dp.locator('input[value="todo"]').check();
  await dp.locator('button[type="submit"]').click();
  await k.locator('#l-nuevo .ticket', { hasText: 'Croquetas' }).waitFor();
  ok(true, 'puesto "Todo": vuelve a verse todo');

  console.log('CORREGIR · menos, invitar');
  await k.click('[data-vista="mesas"]');
  await k.locator('.mesa-card', { hasText: 'Mesa 1' }).locator('[data-editar-mesa]').click();
  const de = k.locator('#dlg-editar');
  await de.locator('.ed-linea', { hasText: 'Croquetas' }).locator('[data-ed$=":menos"]').click();
  await de.locator('.ed-linea', { hasText: '2× Croquetas' }).waitFor();
  await de.locator('.ed-linea', { hasText: 'Caña' }).locator('[data-ed$=":invitar"]').click();
  await de.locator('.ed-linea', { hasText: 'Caña (invitación)' }).waitFor();
  await shot(k, 'u04-corregir');
  ok((await de.locator('.dlg-head').textContent()).includes('11,50'), 'tras corregir: 6 + 0 + 5,50 = 11,50 €');
  await de.locator('[data-ed-cerrar]').last().click();
  ok(psql("select count(*) from carta.pedido_eventos where estado like 'editado:%'") === '2', 'las 2 correcciones quedan registradas');

  console.log('COBRO · 10 % de descuento en efectivo');
  await k.locator('.mesa-card', { hasText: 'Mesa 1' }).locator('[data-cobrar-mesa]').click();
  const dc = k.locator('#dlg-cobrar');
  await dc.locator('[data-desc="10"]').click();
  // 10 % de 11,50 = 1,15 → 10,35
  ok((await dc.locator('#cb-a-cobrar').textContent()).includes('10,35'), 'con 10 %: 10,35 €');
  ok((await dc.locator('#cb-desc-info').textContent()).includes('1,15'), 'descuento −1,15 € visible');
  await dc.locator('[data-forma="efectivo"]').click();
  await dc.locator('#cb-entregado').fill('20');
  await shot(k, 'u05-descuento');
  await dc.locator('#cb-emitir').click();
  await dc.locator('.tk-prev').waitFor();
  const prev = await dc.locator('.tk-prev').textContent();
  ok(prev.includes('Descuento 10 %') && prev.includes('10,35'), 'ticket con líneas de descuento y total 10,35');
  await dc.locator('[data-cobro="cerrar"]').last().click();

  console.log('FACTURA DE UN TICKET (F3)');
  await k.click('[data-vista="tickets"]');
  await k.locator('[data-tkl-ver]').first().click();
  const dt = k.locator('#dlg-ticket');
  await dt.locator('[data-visto="facturar"]').click();
  await dt.locator('[name="nif"]').fill('00000000T');
  await dt.locator('[name="nombre"]').fill('ACME SL');
  await dt.locator('[name="domicilio"]').fill('Calle 2, Madrid');
  await dt.locator('#fz-emitir').click();
  await dt.locator('h2', { hasText: 'Factura F' + ANIO }).waitFor();
  const f3 = await dt.locator('.tk-prev').textContent();
  ok(f3.includes('ACME SL') && f3.includes('Sustituye a: T' + ANIO + '-000001'), 'factura F3 con cliente que sustituye al ticket');
  ok(!(await dt.locator('[data-visto="facturar"]').count()), 'una factura no se vuelve a facturar');
  await shot(k, 'u06-factura');
  await dt.locator('[data-visto="cerrar"]').last().click();
  ok(psql("select string_agg(tipo || ':' || estado, ',' order by expedido, tipo) from fiscal.documentos") === 'F2:sustituido,F3:emitido', 'F2 sustituido + F3 emitido');

  console.log('CAJA · arqueo y cierre');
  await k.click('#tab-caja');
  await k.locator('.cj-hero').waitFor();
  // 100 - 12,50 + 10,35 = 97,85
  ok((await k.locator('.cj-hero b').textContent()).includes('97,85'), 'esperado 97,85 € (la F3 no cuenta doble)');
  await k.locator('[data-cj="cerrar"]').click();
  await k.locator('[data-cj-billete="50"]').fill('1');
  await k.locator('[data-cj-billete="20"]').fill('2');
  await k.locator('[data-cj-billete="5"]').fill('1');
  await k.locator('[data-cj-billete="2"]').fill('1');
  await k.locator('[data-cj-billete="0.5"]').fill('1');
  await k.locator('[data-cj-billete="0.2"]').fill('1');
  await k.locator('[data-cj-billete="0.1"]').fill('1');
  await k.locator('[data-cj-billete="0.05"]').fill('1');
  ok((await k.locator('#cj-contado').inputValue()) === '97,85', 'recuento de billetes y monedas: 97,85');
  ok((await k.locator('#cj-res').textContent()).includes('Cuadra'), 'cuadra ✓');
  await shot(k, 'u07-arqueo');
  await k.locator('#cj-cerrar').click();
  await k.locator('[data-cj-form="abrir"]').waitFor();
  await k.waitForFunction(() => (document.getElementById('print-frame').contentDocument.body || {}).textContent?.includes('CIERRE DE CAJA'));
  const hoja = await k.evaluate(() => document.getElementById('print-frame').contentDocument.body.textContent);
  ok(hoja.includes('DESCUADRE') && hoja.includes('1 × 50 €') && hoja.includes('Proveedor'), 'hoja de cierre a la impresora (con billetes y movimientos)');
  ok(psql('select contado || \'/\' || descuadre from fiscal.caja_turnos') === '97.85/0.00', 'turno cerrado: 97,85 sin descuadre');
  await k.locator('[data-cj="historial"]').click();
  await k.locator('.cj-hist tbody tr').first().waitFor();
  ok(await k.locator('.cj-hist tbody tr').count() === 1, 'historial de cierres');
  await shot(k, 'u08-historial');

  console.log('MÓVIL · caja y corregir');
  const mv = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  vigilar(mv, 'móvil');
  await mv.goto(`${BASE}/cocina.html?r=bar-tpv&k=cocina-t`);
  await mv.locator('#tab-caja:not([hidden])').waitFor();
  await mv.click('#tab-caja');
  await mv.locator('[data-cj-form="abrir"]').waitFor();
  const ancho = await mv.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok(ancho, 'caja en el móvil sin scroll horizontal');
  await shot(mv, 'u09-movil-caja');

  console.log('BAR SIN FACTURACIÓN · sin cambios');
  const s = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
  vigilar(s, 'sin-fact');
  await s.goto(`${BASE}/cocina.html?r=sin-fact&k=cocina-s`);
  await s.locator('#k-nombre', { hasText: 'Bar Sin Facturar' }).waitFor();
  await s.waitForTimeout(800);
  ok(await s.locator('#tab-caja').isHidden() && await s.locator('#k-puesto').isHidden() && await s.locator('#k-pedido').isHidden(),
    'sin Caja, Puesto ni Pedido');
  ok(await s.locator('#k-offline').isHidden(), 'sin aviso de conexión');

  ok(!errores.length, 'sin errores de JavaScript' + (errores.length ? ': ' + errores.join(' | ') : ''));
  console.log('\nE2E TPV2 OK');
} catch (e) {
  console.error(e.message);
  if (errores.length) console.error('Errores JS:', errores);
  process.exitCode = 1;
} finally {
  await browser.close();
  srv.kill();
}
