// E2E del modo TPV con navegador real y BD local: comandero (mesa y Barra), stock, plano de mesas,
// mover, cuentas separadas (por productos y a partes iguales), devoluciones y móvil.
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
  perform public.carta_admin('bar-tpv', 'admin-t', 'producto', jsonb_build_object('nombre', 'Tarta de queso', 'precio', '5.50', 'categoria_id', ct));
  perform public.carta_admin('bar-tpv', 'admin-t', 'producto', jsonb_build_object('nombre', 'Caña', 'precio', '2', 'categoria_id', cb));
  perform public.fiscal_admin('bar-tpv', 'admin-t', 'titular', '{"nif":"00000000T","razon_social":"DEMO","domicilio":"Calle 1","tipo_persona":"juridica"}');
end $$;`);

const browser = await chromium.launch();
const errores = [];
const vigilar = (p, q) => {
  p.on('pageerror', (e) => errores.push(`${q}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/400|Failed to load resource/.test(m.text())) errores.push(`${q}: ${m.text()}`); });
  p.on('dialog', (d) => d.accept());
};

try {
  console.log('GESTIÓN · stock');
  const a = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  vigilar(a, 'admin');
  await a.goto(`${BASE}/admin.html?r=bar-tpv&k=admin-t`);
  await a.getByRole('tab', { name: /Stock/ }).click();
  const filaTarta = a.locator('.sk-fila', { hasText: 'Tarta de queso' });
  await filaTarta.locator('[data-sk-stock]').fill('2');
  await filaTarta.locator('[data-sk-alerta]').fill('1');
  await filaTarta.locator('[data-sk-alerta]').press('Tab');
  await a.waitForFunction(() => document.querySelector('.sk-fila [data-sk-n="1"]:not([disabled])'));
  ok(psql("select stock || '/' || stock_alerta from carta.productos where nombre = 'Tarta de queso'") === '2/1', 'stock de la tarta: 2 (aviso con 1)');
  await filaTarta.locator('[data-sk-n="10"]').click();
  await a.waitForFunction(() => document.querySelector('.sk-fila:nth-of-type(n) [data-sk-stock]') && [...document.querySelectorAll('.sk-fila')].some((f) => f.textContent.includes('Tarta') && f.querySelector('[data-sk-stock]').value === '12'));
  await a.locator('.sk-fila', { hasText: 'Tarta de queso' }).locator('[data-sk-stock]').fill('2');
  await a.locator('.sk-fila', { hasText: 'Tarta de queso' }).locator('[data-sk-stock]').press('Tab');
  await a.waitForFunction(() => [...document.querySelectorAll('.sk-fila')].some((f) => f.textContent.includes('Tarta') && f.querySelector('[data-sk-stock]').value === '2'));
  ok(true, 'ajustes rápidos (+10) y corrección a mano');
  await shot(a, 't01-stock');

  console.log('TABLET · comandero');
  const k = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
  vigilar(k, 'tablet');
  await k.goto(`${BASE}/cocina.html?r=bar-tpv&k=cocina-t`);
  await k.locator('#k-pedido:not([hidden])').waitFor();
  ok(true, 'botón ➕ Pedido en el panel');
  await k.click('#k-pedido');
  const cm = k.locator('#dlg-comandero');
  await cm.locator('.cm-prod').first().waitFor();
  await cm.locator('[data-cm-mesa]', { hasText: 'Mesa 2' }).click();
  for (let i = 0; i < 2; i++) await cm.locator('.cm-prod', { hasText: 'Croquetas' }).click();
  await cm.locator('[data-cm-cat]', { hasText: 'Bebidas' }).click();
  for (let i = 0; i < 3; i++) await cm.locator('.cm-prod', { hasText: 'Caña' }).click();
  await cm.locator('.cm-linea', { hasText: 'Caña' }).locator('[data-cm-nota]').click();
  await cm.locator('[data-cm-nota-txt]').fill('bien fría');
  ok((await cm.locator('.cm-total').innerText()).includes('12,00'), 'comandero: 2 croquetas + 3 cañas = 12,00 €');
  await shot(k, 't02-comandero');
  await cm.locator('[data-cm="enviar"]').click();
  await k.locator('#l-nuevo .ticket', { hasText: 'Mesa 2' }).waitFor();
  ok((await k.locator('#l-nuevo .ticket', { hasText: 'Mesa 2' }).innerText()).includes('bien fría'), 'el pedido llega a cocina con su nota');

  console.log('TABLET · stock en el comandero');
  await k.click('#k-pedido');
  await cm.locator('[data-cm-mesa]', { hasText: 'Mesa 1' }).click();
  await cm.locator('.cm-prod', { hasText: 'Tarta' }).click();
  await cm.locator('.cm-prod', { hasText: 'Tarta' }).click();
  ok(await cm.locator('.cm-prod', { hasText: 'Tarta' }).isDisabled(), 'no deja pedir más tartas de las que quedan');
  await cm.locator('[data-cm="enviar"]').click();
  await k.locator('#k-stock .stock-chip', { hasText: 'Agotado' }).waitFor();
  ok((await k.locator('#k-stock').innerText()).includes('Tarta de queso'), 'aviso en el panel: tarta agotada');
  ok(psql("select disponible::text from carta.productos where nombre = 'Tarta de queso'") === 'false', 'la tarta se agota sola');
  await k.locator('#l-nuevo .ticket', { hasText: 'Mesa 1' }).locator('[data-cancelar]').click();
  await k.locator('#l-nuevo .ticket', { hasText: 'Mesa 1' }).waitFor({ state: 'detached' });
  await k.waitForTimeout(300);
  ok(psql("select stock || ' ' || disponible from carta.productos where nombre = 'Tarta de queso'") === '2 true', 'cancelar devuelve las 2 tartas');

  console.log('TABLET · Barra: pedir y cobrar');
  await k.click('#k-pedido');
  await cm.locator('[data-cm-mesa]', { hasText: 'Barra' }).click();
  await cm.locator('.cm-prod', { hasText: 'Caña' }).click();
  ok(await cm.locator('[data-cm-servido]').isChecked(), 'Barra: "ya servido" marcado');
  await cm.locator('[data-cm="cobrar"]').click();
  const dc = k.locator('#dlg-cobrar');
  await dc.locator('#cb-emitir').waitFor();
  await dc.locator('[data-forma="efectivo"]').click();
  await dc.locator('#cb-emitir').click();
  await dc.locator('.tk').waitFor();
  ok((await dc.locator('.tk').innerText()).includes(`T${ANIO}-000001`), `venta rápida en barra cobrada: T${ANIO}-000001`);
  await dc.locator('.dlg-foot [data-cobro="cerrar"]').click();

  console.log('TABLET · plano de mesas y mover');
  await k.getByRole('tab', { name: /Mesas/ }).click();
  await k.locator('.mesa-card', { hasText: 'Mesa 2' }).waitFor();
  // La Mesa 1 solo tiene el pedido cancelado: se libera como siempre.
  await k.locator('.mesa-card', { hasText: 'Mesa 1' }).getByRole('button', { name: /liberar mesa/ }).click();
  await k.locator('.mesa-card', { hasText: 'Mesa 1' }).waitFor({ state: 'detached' });
  await shot(k, 't03-mesas');
  ok((await k.locator('.libres h3').textContent()).includes('5 de 6'), 'plano: 5 mesas libres de 6');
  await k.locator('.mesa-card', { hasText: 'Mesa 2' }).locator('[data-mover-mesa]').click();
  await k.locator('#dlg-mover [data-mover-a]', { hasText: 'Mesa 4' }).click();
  await k.locator('.mesa-card', { hasText: 'Mesa 4' }).waitFor();
  ok(await k.locator('.mesa-card', { hasText: 'Mesa 2' }).count() === 0, 'Mesa 2 → Mesa 4');

  console.log('TABLET · cuentas separadas');
  await k.locator('.mesa-card', { hasText: 'Mesa 4' }).getByRole('button', { name: /Cobrar/ }).click();
  await dc.locator('[data-cobro-modo="productos"]').click();
  await dc.locator('.cb-linea', { hasText: 'Croquetas' }).locator('[data-sel-todo]').click();
  ok((await dc.locator('#cb-emitir').innerText()).includes('6,00'), 'por productos: las croquetas (6,00)');
  await shot(k, 't04-por-productos');
  await dc.locator('#cb-emitir').click();
  await dc.locator('.tk').waitFor();
  const tk2 = await dc.locator('.tk').innerText();
  ok(tk2.includes(`T${ANIO}-000002`) && tk2.includes('Cuenta separada') && (await dc.locator('.cb-queda').innerText()).includes('6,00'),
    'su propio ticket y quedan 6,00');
  await dc.locator('[data-cobro="resto"]').click();
  await dc.locator('[data-cobro-modo="partes"]').waitFor();
  ok((await dc.locator('.dlg-head').innerText()).includes('ya cobrado 6,00'), 'el cobro sabe lo ya pagado');
  await dc.locator('[data-cobro-modo="partes"]').click();
  await dc.locator('#cb-personas').fill('3');
  await dc.locator('[data-persona="0:efectivo"]').click();
  ok(await dc.locator('.cb-persona').count() === 3 && (await dc.locator('#cb-personas-lista').innerText()).includes('2,00'), 'a partes iguales: 3 × 2,00');
  await shot(k, 't05-partes');
  await dc.locator('#cb-emitir').click();
  await dc.locator('.tk').waitFor();
  const tk3 = await dc.locator('.tk').innerText();
  ok(tk3.includes(`T${ANIO}-000003`) && /Efectivo\s+2,00/.test(tk3) && /Tarjeta\s+4,00/.test(tk3), 'un ticket con los 3 pagos (efectivo 2 + tarjeta 4)');
  await dc.locator('.dlg-foot [data-cobro="cerrar"]').click();
  await k.locator('.mesa-card', { hasText: 'Mesa 4' }).waitFor({ state: 'detached' });
  ok(true, 'Mesa 4 cobrada y libre');

  console.log('TABLET · devoluciones');
  await k.getByRole('tab', { name: /Tickets/ }).click();
  await k.locator('#tickets-lista .tkl-fila', { hasText: `T${ANIO}-000002` }).getByRole('button', { name: /Ver/ }).click();
  const dv = k.locator('#dlg-ticket');
  await dv.locator('[data-visto="devolver"]').click();
  await dv.locator('[data-dv-menos]').first().click();   // devuelve 1 de las 2 croquetas
  await dv.locator('#dv-motivo').fill('Croqueta fría');
  ok(await dv.locator('#dv-reabrir').isDisabled() && (await dv.locator('#dv-emitir').innerText()).includes('3,00'), 'devolución parcial (1 croqueta, −3,00): no reabre la mesa');
  await dv.locator('#dv-emitir').click();
  await dv.locator('.tk', { hasText: 'RECTIFICATIVA' }).waitFor();
  const r1 = await dv.locator('.tk').innerText();
  ok(r1.includes(`R${ANIO}-000001`) && r1.includes(`Rectifica a: T${ANIO}-000002`) && r1.includes('-3,00') && r1.includes('Croqueta fría'),
    `rectificativa R${ANIO}-000001 de −3,00 con su motivo`);
  await shot(k, 't06-rectificativa');
  await dv.locator('.dlg-foot [data-visto="cerrar"]').click();
  await k.locator('#tickets-lista .tkl-fila', { hasText: `R${ANIO}-000001` }).waitFor();
  ok((await k.locator('#tickets-lista .tkl-fila', { hasText: `R${ANIO}-000001` }).innerText()).includes('Devolución'), 'en la lista, marcada como devolución');
  // Barra cobrada mal: devolución total y se reabre para cobrarla de nuevo
  await k.locator('#tickets-lista .tkl-fila', { hasText: `T${ANIO}-000001` }).getByRole('button', { name: /Ver/ }).click();
  await dv.locator('[data-visto="devolver"]').click();
  await dv.locator('#dv-reabrir').check();
  await dv.locator('#dv-emitir').click();
  await dv.locator('.tk', { hasText: 'RECTIFICATIVA' }).waitFor();
  await dv.locator('.dlg-foot [data-visto="cerrar"]').click();
  await k.getByRole('tab', { name: /Mesas/ }).click();
  await k.locator('.mesa-card', { hasText: 'Barra' }).waitFor();
  ok(true, 'devolución total con reapertura: la Barra vuelve a estar pendiente de cobro');

  console.log('TABLET · informes con devoluciones');
  await k.getByRole('tab', { name: /Informes/ }).click();
  await k.locator('#informes-panel .iv-card:has(h3:text("Cobros")) .iv-sub').waitFor();
  const cob = await k.locator('#informes-panel .iv-card:has(h3:text("Cobros")) .iv-sub').innerText();
  ok(cob.includes('3 tickets') && cob.includes('2 devoluciones'), 'informe: 3 tickets y 2 devoluciones');
  ok((await k.locator('#informes-panel .iv-kpis').first().innerText()).includes('9,00'), 'cobrado neto: 2 + 6 + 6 − 3 − 2 = 9,00 €');

  console.log('MÓVIL · comandero');
  const mctx = await browser.newContext({ ...devices['iPhone 13'] });
  const t = await mctx.newPage();
  vigilar(t, 'movil');
  await t.goto(`${BASE}/cocina.html?r=bar-tpv&k=cocina-t`);
  await t.locator('#k-pedido:not([hidden])').waitFor();
  await t.click('#k-pedido');
  const cmm = t.locator('#dlg-comandero');
  await cmm.locator('.cm-prod').first().waitFor();
  await cmm.locator('[data-cm-mesa]', { hasText: 'Mesa 3' }).click();
  await cmm.locator('.cm-prod', { hasText: 'Croquetas' }).click();
  await cmm.locator('.cm-prod', { hasText: 'Caña' }).click();
  await shot(t, 't07-movil-comandero');
  await cmm.locator('[data-cm="ver"]').click();
  await cmm.locator('[data-cm="enviar"]').click();
  await t.locator('#l-nuevo .ticket', { hasText: 'Mesa 3' }).waitFor();
  ok(await t.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'móvil: pedido enviado, sin scroll lateral');

  console.log('BAR SIN FACTURACIÓN (como Martínez)');
  const s = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
  vigilar(s, 'sin');
  await s.goto(`${BASE}/cocina.html?r=sin-fact&k=cocina-s`);
  await s.locator('#k-nombre:text("Bar Sin Facturar")').waitFor();
  await s.waitForTimeout(800);
  await s.getByRole('tab', { name: /Mesas/ }).click();
  ok(await s.locator('#k-pedido').isHidden() && await s.locator('.libres').count() === 0, 'clave de cocina: sin comandero ni plano (todo igual)');

  ok(errores.length === 0, 'sin errores JS' + (errores.length ? ': ' + errores.join(' | ') : ''));
  console.log('\nE2E TPV OK');
} catch (e) {
  console.error(e.message);
  if (errores.length) console.error('Errores consola:', errores);
  process.exitCode = 1;
} finally {
  await browser.close();
  srv.kill();
}
