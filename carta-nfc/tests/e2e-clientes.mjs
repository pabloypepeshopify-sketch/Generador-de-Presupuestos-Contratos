// E2E de "Mis clientes y cobros" (web/clientes.html) contra la BD local.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || '8787';
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS || '';
const psql = (sql) => execSync(`psql -h /tmp -p 54329 -U postgres -d carta_test -tAq -c "${sql}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('FALLO: ' + m); console.log('  ✓ ' + m); };

execSync('bash ./db-local.sh', { cwd: DIR, stdio: 'ignore' });
psql("select carta.fijar_clave_plataforma('plataforma-local')");
psql("select carta._alta('Bar Moroso', 'bar-moroso', 3, 'a1', 'c1')");
psql("select carta._alta('Bar Puntual', 'bar-puntual', 3, 'a2', 'c2')");
psql("update carta.restaurantes set creado = now() - interval '40 days' where slug = 'bar-moroso'");
const srv = spawn('node', ['servidor-local.mjs'], { cwd: DIR, env: { ...process.env, PORT }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
const browser = await chromium.launch();
const errores = [];
try {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(BASE + '/alta.html');
  ok(await page.locator('a[href="/clientes.html"]').count() === 1, 'enlace desde alta.html');
  await page.goto(BASE + '/clientes.html');
  await page.locator('#clave').fill('plataforma-local');
  await page.locator('#f-login button').click();
  await page.locator('.cli').first().waitFor();
  const moroso = page.locator('.cli[data-slug="bar-moroso"]');
  ok(/Debe 58,00\s€ · 2 meses · 40 días/.test(await moroso.locator('.estado').innerText()), 'el que debe: importe, meses y días de retraso');
  ok(await page.locator('.cli').first().getAttribute('data-slug') === 'bar-moroso', 'los que deben salen arriba');
  ok(/Debe 29,00\s€ · 1 mes · vence hoy/.test(await page.locator('.cli[data-slug="bar-puntual"] .estado').innerText()), 'bar dado de alta hoy: el primer mes se cobra el día del alta');
  ok(/29,00\s€ \/ mes/.test(await moroso.innerText()) && /Próximo cobro/.test(await moroso.innerText()), 'cuota y próximo cobro');
  ok(/87,00/.test(await page.locator('#n-debe').innerText()) && /58,00/.test(await page.locator('#n-mensual').innerText()), 'total pendiente y total al mes');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/clientes.png`, fullPage: true });

  await moroso.locator('[data-forma]').selectOption('bizum');
  await moroso.locator('[data-pagar]').click();
  await page.locator('.cli[data-slug="bar-moroso"] .estado', { hasText: '1 mes' }).waitFor();
  ok(psql("select forma from carta.cuota_pagos") === 'bizum', 'pagado con Bizum');
  ok(/Pagados: .*\(Bizum\)/.test(await moroso.innerText()), 'historial de pagos');
  await moroso.locator('[data-pagar]').click();
  await page.locator('.cli[data-slug="bar-moroso"] .estado', { hasText: 'Al día' }).waitFor();
  ok(true, 'al día tras pagar los dos meses');
  await moroso.locator('[data-deshacer]').click();
  await page.locator('.cli[data-slug="bar-moroso"] .estado', { hasText: 'Debe' }).waitFor();
  ok(true, 'deshacer el último pago');

  console.log('Editar');
  await moroso.locator('summary').click();
  await moroso.locator('input[name=importe]').fill('35');
  await moroso.locator('input[name=notas]').fill('Paga a fin de mes');
  await moroso.locator('form button').click();
  await page.locator('.cli[data-slug="bar-moroso"]', { hasText: 'Paga a fin de mes' }).waitFor();
  ok(/35,00\s€ \/ mes/.test(await page.locator('.cli[data-slug="bar-moroso"]').innerText()), 'cambia la cuota');

  console.log('Desactivar por impago');
  await page.locator('.cli[data-slug="bar-moroso"] [data-activo]').click();
  await page.locator('.cli[data-slug="bar-moroso"] .estado', { hasText: 'Desactivado' }).waitFor();
  ok(psql("select activo from carta.restaurantes where slug = 'bar-moroso'") === 'f', 'desactivado en la BD');
  const r = await page.evaluate(async () => (await fetch('/rest/v1/rpc/carta_menu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_slug: 'bar-moroso' }) })).status);
  ok(r === 400, 'su carta deja de funcionar');
  await page.locator('[data-filtro="off"]').click();
  ok(await page.locator('.cli').count() === 1, 'filtro "Desactivados"');
  await page.locator('.cli[data-slug="bar-moroso"] [data-activo]').click();
  await page.locator('.cli[data-slug="bar-moroso"]').waitFor({ state: 'detached' });
  ok(psql("select activo from carta.restaurantes where slug = 'bar-moroso'") === 't', 'reactivar');
  ok(errores.length === 0, 'sin errores JS' + (errores.length ? ': ' + errores.join(' | ') : ''));
  console.log('\nE2E CLIENTES OK');
} finally {
  await browser.close();
  srv.kill();
}
