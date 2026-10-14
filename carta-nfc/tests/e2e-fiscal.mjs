// E2E de la Fase 1 de facturación con navegador real (BD local):
//   admin da de alta los datos fiscales → cliente pide desde la mesa → cocina "Cobrar" (tarjeta,
//   efectivo con cambio, factura con NIF) → ticket con QR VERI*FACTU → el cliente ve "Ver tu ticket".
//   Un bar SIN datos fiscales mantiene el panel de siempre ("Cobrada · liberar mesa").
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:8787';
const SHOTS = process.env.SHOTS || '';
const psql = (sql) => execSync(`psql -h /tmp -p 54329 -U postgres -d carta_test -tAq -c "${sql}"`).toString().trim();
const psqlIn = (sql) => execSync('psql -h /tmp -p 54329 -U postgres -d carta_test -tAq -v ON_ERROR_STOP=1 -f -', { input: sql }).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('FALLO: ' + m); console.log('  ✓ ' + m); };
const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${n}.png` }); };
const ANIO = new Date().toLocaleString('es-ES', { year: 'numeric', timeZone: 'Europe/Madrid' });

execSync('bash ./db-local.sh', { cwd: DIR, stdio: 'ignore' });
const srv = spawn('node', ['servidor-local.mjs'], { cwd: DIR, env: { ...process.env, PORT: '8787' }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
psql("select carta._alta('Bar Fiscal', 'bar-fiscal', 4, 'admin-f', 'cocina-f')");
psql("select carta._alta('Bar Sin Fiscal', 'sin-fiscal', 2, 'admin-s', 'cocina-s')");
const rpcAdmin = (slug, clave, accion, datos) => psql(`set role anon; select public.carta_admin('${slug}','${clave}','${accion}','${JSON.stringify(datos).replace(/"/g, '\\"')}'::jsonb)`);
for (const slug of [['bar-fiscal', 'admin-f'], ['sin-fiscal', 'admin-s']]) {
  const cat = JSON.parse(rpcAdmin(...slug, 'categoria', { nombre: 'Tapas' })).id;
  rpcAdmin(...slug, 'producto', { nombre: 'Cecina de León · Media', precio: '9', categoria_id: cat });
  rpcAdmin(...slug, 'producto', { nombre: 'McTínez', precio: '10', categoria_id: cat });
}
const mesa = (slug, n) => psql(`select codigo from carta.mesas m join carta.restaurantes r on r.id = m.restaurante_id where r.slug = '${slug}' and m.nombre = 'Mesa ${n}'`);

const browser = await chromium.launch();
const errores = [];
const vigilar = (p, q) => {
  p.on('pageerror', (e) => errores.push(`${q}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/400|Failed to load resource/.test(m.text())) errores.push(`${q}: ${m.text()}`); });
};
async function pedir(ctx, codigo, items) {
  const m = await ctx.newPage();
  vigilar(m, 'cliente');
  await m.goto(`${BASE}/m/${codigo}`);
  for (const [nombre, n] of items) {
    const prod = m.locator('.prod', { hasText: nombre });
    for (let i = 0; i < n; i++) await prod.locator('[data-add]').first().click();
  }
  await m.click('#cart-open');
  await m.click('#btn-enviar');
  await m.locator('#dlg-ok[open]').waitFor();
  await m.locator('#dlg-ok [data-cerrar]').click();
  return m;
}

try {
  console.log('ADMIN · datos fiscales');
  const admin = await (await browser.newContext({ viewport: { width: 1100, height: 1000 } })).newPage();
  vigilar(admin, 'admin');
  await admin.goto(`${BASE}/admin.html?r=bar-fiscal&k=admin-f`);
  await admin.getByRole('tab', { name: 'Facturación' }).click();
  await admin.locator('#fz-estado', { hasText: 'Desactivada' }).waitFor();
  ok(true, 'sin datos fiscales: facturación desactivada');
  await admin.fill('#fz-nif', '00000000T');
  await admin.fill('#fz-razon', 'DEMO SIN VALIDEZ FISCAL');
  await admin.fill('#fz-comercial', 'Bar Fiscal');
  await admin.fill('#fz-domicilio', 'Plaza del Cabildo 1');
  await admin.fill('#fz-cp', '11540');
  await admin.fill('#fz-municipio', 'Sanlúcar de Barrameda');
  await admin.fill('#fz-provincia', 'Cádiz');
  await admin.fill('#fz-pie', '¡Gracias por tu visita!');
  await admin.click('#form-fiscal button[type=submit]');
  await admin.locator('#fz-estado', { hasText: 'Activa' }).waitFor();
  ok(true, 'datos fiscales guardados → facturación activa (VERI*FACTU, pruebas)');
  await shot(admin, 'f01-admin-facturacion');

  console.log('CLIENTE · Mesa 2 pide 2× Cecina Media + McTínez');
  const movilCtx = await browser.newContext({ ...devices['iPhone 13'] });
  const movil = await pedir(movilCtx, mesa('bar-fiscal', 2), [['Cecina de León', 2], ['McTínez', 1]]);

  console.log('COCINA · Cobrar');
  const k = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  vigilar(k, 'cocina');
  await k.goto(`${BASE}/cocina.html?r=bar-fiscal&k=cocina-f`);
  await k.locator('#l-nuevo .ticket', { hasText: 'Mesa 2' }).waitFor();
  await k.getByRole('tab', { name: /Mesas/ }).click();
  const card = k.locator('.mesa-card', { hasText: 'Mesa 2' });
  await card.getByRole('button', { name: /Cobrar 28,00/ }).waitFor();
  ok(true, 'la tarjeta de la mesa muestra "Cobrar 28,00 €"');
  await card.getByRole('button', { name: /Cobrar/ }).click();
  const dlg = k.locator('#dlg-cobrar');
  await dlg.locator('[data-forma="tarjeta"][aria-pressed="true"]').waitFor();
  await shot(k, 'f02-cobrar');
  await dlg.locator('#cb-emitir').click();
  await dlg.locator('.tk').waitFor();
  const tk = await dlg.locator('.tk').innerText();
  ok(tk.includes('FACTURA SIMPLIFICADA') && tk.includes(`T${ANIO}-000001`), `ticket F2 T${ANIO}-000001`);
  ok(tk.includes('25,45') && tk.includes('2,55') && tk.includes('28,00') && tk.includes('IVA incluido'), 'base 25,45 · cuota 2,55 · total 28,00 · IVA incluido');
  ok(tk.includes('NIF 00000000T') && tk.includes('Tarjeta') && tk.includes('VERI*FACTU') && tk.includes('ENTORNO DE PRUEBAS'), 'emisor, pago, leyenda VERI*FACTU y aviso de pruebas');
  ok(await dlg.locator('.tk-qr svg').count() === 1, 'QR tributario en el ticket');
  await dlg.locator('[data-cobro="qr"]').click();
  ok(await dlg.locator('#qr-digital svg').count() === 1, 'QR del ticket digital para el cliente');
  await shot(k, 'f03-ticket');
  await dlg.locator('.dlg-foot [data-cobro="cerrar"]').click();
  await card.waitFor({ state: 'detached' });
  ok(true, 'Mesa 2 cobrada y liberada');

  console.log('COCINA · efectivo con cambio y propina');
  await pedir(movilCtx, mesa('bar-fiscal', 3), [['McTínez', 1]]);
  const card3 = k.locator('.mesa-card', { hasText: 'Mesa 3' });
  await card3.getByRole('button', { name: /Cobrar/ }).click({ timeout: 10000 });
  await dlg.locator('[data-forma="efectivo"]').click();
  await dlg.locator('#cb-propina').fill('1');
  await dlg.locator('#cb-entregado').fill('20');
  ok((await dlg.locator('#cb-cambio').innerText()).includes('9,00'), 'cambio 20 − (10 + 1 de propina) = 9,00 €');
  await dlg.locator('#cb-emitir').click();
  await dlg.locator('.tk').waitFor();
  const tk2 = await dlg.locator('.tk').innerText();
  ok(tk2.includes(`T${ANIO}-000002`) && tk2.includes('Cambio 9,00') && tk2.includes('Propina'), `T${ANIO}-000002 en efectivo con cambio y propina aparte`);
  await dlg.locator('.dlg-foot [data-cobro="cerrar"]').click();

  console.log('COCINA · factura con NIF');
  await pedir(movilCtx, mesa('bar-fiscal', 4), [['Cecina de León', 1]]);
  const card4 = k.locator('.mesa-card', { hasText: 'Mesa 4' });
  await card4.getByRole('button', { name: /Cobrar/ }).click({ timeout: 10000 });
  await dlg.locator('#cb-factura').check();
  await dlg.locator('#cb-nif').fill('B12345674');
  await dlg.locator('#cb-nombre').fill('Empresa Demo SL');
  await dlg.locator('#cb-domicilio').fill('Calle Falsa 1, Cádiz');
  ok((await dlg.locator('#cb-emitir').innerText()).toLowerCase().includes('emitir factura'), 'botón "Emitir factura"');
  await dlg.locator('#cb-emitir').click();
  await dlg.locator('.tk').waitFor();
  const tk3 = await dlg.locator('.tk').innerText();
  ok(tk3.includes(`F${ANIO}-000001`) && tk3.includes('Empresa Demo SL') && tk3.includes('NIF B12345674'), `factura F${ANIO}-000001 con datos del cliente`);
  await dlg.locator('.dlg-foot [data-cobro="cerrar"]').click();

  console.log('CLIENTE · "Ver tu ticket"');
  const enlace = movil.locator('#mis-pedidos a', { hasText: 'Ver tu ticket' }).first();
  await movil.reload();
  await enlace.waitFor({ timeout: 25000 });
  ok(true, 'el cliente ve "Ver tu ticket" en sus pedidos');
  await enlace.click();
  await movil.waitForURL(/ticket\.html\?t=/);
  await movil.locator('.tk').waitFor();
  const tkm = await movil.locator('.tk').innerText();
  ok(new RegExp(`[TF]${ANIO}-00000[12]`).test(tkm) && tkm.includes('NIF 00000000T') && await movil.locator('.tk-qr svg').count() === 1,
    'ticket digital en el móvil (con QR)');
  await shot(movil, 'f04-ticket-movil');

  console.log('COCINA · pestaña Tickets');
  await k.getByRole('tab', { name: /Tickets/ }).click();
  const filas = k.locator('#tickets-lista .tkl-fila');
  await filas.nth(2).waitFor();
  ok(await filas.count() === 3, 'Tickets de hoy: 3 documentos');
  const resumen = await k.locator('#tickets-lista [data-tkl-resumen]').innerText();
  ok(resumen.includes('47,00') && resumen.includes('37,00') && resumen.includes('11,00'),
    'resumen: ventas 47,00 · tarjeta 37,00 · efectivo 11,00 (con propina)');
  await k.locator('#tickets-lista [data-tkl-f="q"]').fill('empresa');
  await k.waitForFunction(() => document.querySelectorAll('#tickets-lista .tkl-fila').length === 1);
  ok((await filas.first().innerText()).includes(`F${ANIO}-000001`), 'búsqueda por cliente → la factura');
  await filas.first().getByRole('button', { name: /Ver/ }).click();
  const dv = k.locator('#dlg-ticket');
  await dv.locator('.tk').waitFor();
  ok((await dv.locator('.tk').innerText()).includes('Empresa Demo SL'), 'ver un ticket antiguo desde el panel');
  await dv.locator('[data-visto="qr"]').click();
  ok(await dv.locator('#qr-visto svg').count() === 1, 'QR del ticket digital desde la lista');
  ok(await dv.locator('[data-visto="imprimir"]').isVisible(), 'botón Imprimir');
  await shot(k, 'f05-tickets-ver');
  await dv.locator('.dlg-foot [data-visto="cerrar"]').click();
  await k.locator('#tickets-lista [data-tkl-f="q"]').fill('');
  await k.waitForFunction(() => document.querySelectorAll('#tickets-lista .tkl-fila').length === 3);
  await k.locator('#tickets-lista [data-tkl-rango="ayer"]').click();
  await k.locator('#tickets-lista .tkl-vacio', { hasText: 'No hay tickets' }).waitFor();
  ok(true, 'filtro "Ayer": sin tickets');
  await k.locator('#tickets-lista [data-tkl-rango="hoy"]').click();
  await filas.nth(2).waitFor();
  await shot(k, 'f06-tickets');

  console.log('ADMIN · listado y Excel');
  await admin.reload();
  await admin.getByRole('tab', { name: 'Facturación' }).click();
  await admin.locator('#fz-docs .tkl-fila').nth(2).waitFor();
  ok(await admin.locator('#fz-docs .tkl-fila').count() === 3, '3 documentos en Facturación');
  ok((await admin.locator('#fz-estado').innerText()).includes('pendientes de envío: 3'), '3 registros pendientes de envío (Fase 2)');
  const [descarga] = await Promise.all([admin.waitForEvent('download'), admin.locator('#fz-docs [data-tkl-csv]').click()]);
  const csv = readFileSync(await descarga.path(), 'utf8');
  const lineas = csv.trim().split('\r\n');
  ok(csv.charCodeAt(0) === 0xfeff && lineas[0].includes('"Base imponible"') && lineas.length === 4, `CSV: cabecera + 3 filas (${descarga.suggestedFilename()})`);
  ok(lineas[1].includes(`"T${ANIO}-000001"`) && lineas[1].includes(';25,45;2,55;28,00;28,00;'), 'CSV: T…-000001 base 25,45 · cuota 2,55 · total 28,00');
  ok(lineas[3].includes('"B12345674"') && lineas[3].includes('"Empresa Demo SL"'), 'CSV: la factura con NIF y nombre del cliente');
  const [pop] = await Promise.all([admin.waitForEvent('popup'), admin.locator('#fz-docs [data-tkl-ver]').first().click()]);
  await pop.locator('.tk').waitFor();
  ok(await pop.locator('.tk-qr svg').count() === 1, 'gestión: "Ver · Imprimir" abre el ticket');
  await pop.close();

  console.log('COCINA · muchos tickets (paginación)');
  psqlIn(`do $$
    declare r carta.restaurantes; m carta.mesas; pid uuid;
    begin
      select * into r from carta.restaurantes where slug = 'bar-fiscal';
      select * into m from carta.mesas where restaurante_id = r.id and nombre = 'Mesa 1';
      for i in 1..52 loop
        insert into carta.pedidos (restaurante_id, mesa_id, mesa_nombre, numero, total) values (r.id, m.id, m.nombre, 100 + i, 2.5) returning id into pid;
        insert into carta.pedido_lineas (pedido_id, nombre, precio, cantidad) values (pid, 'Café', 2.5, 1);
        perform public.fiscal_cobrar('bar-fiscal', 'cocina-f', jsonb_build_object('pedido_ids', jsonb_build_array(pid),
          'pagos', jsonb_build_array(jsonb_build_object('forma', 'bizum', 'importe', '2.50'))));
      end loop;
    end $$;`);
  await k.getByRole('tab', { name: /Mesas/ }).click();
  await k.getByRole('tab', { name: /Tickets/ }).click();
  await k.locator('#tickets-lista [data-tkl-mas]', { hasText: '50 de 55' }).waitFor();
  ok(await filas.count() === 50, '55 tickets: se ven 50 y "Cargar más (50 de 55)"');
  await k.locator('#tickets-lista [data-tkl-mas]').click();
  await filas.nth(54).waitFor();
  ok(await filas.count() === 55 && await k.locator('#tickets-lista [data-tkl-mas]').isHidden(), 'Cargar más → los 55');
  ok((await filas.last().innerText()).includes(`T${ANIO}-000001`), 'el más antiguo al final');

  console.log('BAR SIN DATOS FISCALES (como Martínez hoy)');
  await pedir(movilCtx, mesa('sin-fiscal', 1), [['McTínez', 1]]);
  const k2 = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  vigilar(k2, 'cocina-sin');
  await k2.goto(`${BASE}/cocina.html?r=sin-fiscal&k=cocina-s`);
  await k2.getByRole('tab', { name: /Mesas/ }).click();
  const c2 = k2.locator('.mesa-card', { hasText: 'Mesa 1' });
  await c2.getByRole('button', { name: /Cobrada · liberar mesa/ }).waitFor();
  ok(await c2.getByRole('button', { name: /Cobrar/ }).count() === 0, 'sin datos fiscales: el panel sigue igual que antes');
  ok(await k2.locator('#tab-tickets').isHidden(), 'sin datos fiscales: no aparece la pestaña Tickets');

  ok(errores.length === 0, 'sin errores JS' + (errores.length ? ': ' + errores.join(' | ') : ''));
  console.log('\nE2E FISCAL OK');
} catch (e) {
  console.error(e.message);
  if (errores.length) console.error('Errores consola:', errores);
  process.exitCode = 1;
} finally {
  await browser.close();
  srv.kill();
}
