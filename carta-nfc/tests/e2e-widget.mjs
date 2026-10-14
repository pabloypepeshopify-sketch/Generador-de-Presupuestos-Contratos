// E2E de pedidos.js sobre la copia real de la web de un bar (Martínez Bar):
//   visita normal sin cambios → NFC de mesa → + en platos/tamaños/cócteles → cambio de idioma →
//   enviar → llega a cocina con el tamaño → "listo" se ve en la web → agotado.
// Requiere: Postgres local, MIRROR=<carpeta creada con herramientas/espejo-web.py>.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const MIRROR = process.env.MIRROR;
if (!MIRROR) { console.error('Falta MIRROR=<carpeta de la copia>'); process.exit(2); }
const SHOTS = process.env.SHOTS || '';
const BW = 'http://localhost:8788', BP = 'http://localhost:8787';
const psql = (sql) => execSync(`psql -h /tmp -p 54329 -U postgres -d carta_test -tAq -c "${sql}"`).toString().trim();
const ok = (c, m) => { if (!c) throw new Error('FALLO: ' + m); console.log('  ✓ ' + m); };
const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${n}.png` }); };

// Copia de prueba con el script apuntando al servidor local
const PRUEBA = MIRROR.replace(/\/$/, '') + '-prueba';
fs.rmSync(PRUEBA, { recursive: true, force: true });
fs.cpSync(MIRROR, PRUEBA, { recursive: true });
const cartaFile = path.join(PRUEBA, 'carta.html');
fs.writeFileSync(cartaFile, fs.readFileSync(cartaFile, 'utf8').replace(/<script src="[^"]*pedidos\.js"[^>]*><\/script>/,
  `<script src="/w/pedidos.js" data-restaurante="martinez-bar" data-api="${BW}" data-key="sb_publishable_local" defer></script>`));

execSync('bash ./db-local.sh', { cwd: DIR, stdio: 'ignore' });
const hijos = [
  spawn('node', ['servidor-local.mjs'], { cwd: DIR, env: { ...process.env, PORT: '8787' }, stdio: 'ignore' }),
  spawn('node', ['servidor-local.mjs'], { cwd: DIR, env: { ...process.env, PORT: '8788', WEB_ROOT: PRUEBA }, stdio: 'ignore' }),
];
await new Promise((r) => setTimeout(r, 1500));
psql("select carta._alta('Martínez Bar', 'martinez-bar', 10, 'admin-mz', 'cocina-mz')");
console.log(execSync(`node ../herramientas/importar-carta.mjs --url ${BW}/carta.html --slug martinez-bar --clave admin-mz --api ${BW} --key sb_publishable_local`, { cwd: DIR }).toString().trim());
const MESA3 = psql("select codigo from carta.mesas m join carta.restaurantes r on r.id = m.restaurante_id where r.slug = 'martinez-bar' and m.nombre = 'Mesa 3'");

const browser = await chromium.launch();
const errores = [];
const vigilar = (p, q) => {
  p.on('pageerror', (e) => errores.push(`${q}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/400|Failed to load resource/.test(m.text())) errores.push(`${q}: ${m.text()}`); });
};
const plato = (p, key) => p.locator(`.dish:has([data-i18n="${key}"])`);

try {
  console.log('VISITA NORMAL');
  const normal = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  vigilar(normal, 'normal');
  await normal.goto(`${BW}/carta.html`);
  await normal.waitForTimeout(1500);
  ok(await normal.locator('.cnp-add').count() === 0 && await normal.locator('#carta-nfc-pedidos').count() === 0,
    'sin NFC la web queda exactamente igual (sin botones ni barra)');

  console.log('CLIENTE (NFC Mesa 3)');
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const m = await ctx.newPage();
  vigilar(m, 'cliente');
  await m.goto(`${BW}/carta.html?mesa=${MESA3}`);
  await m.locator('#carta-nfc-pedidos').waitFor({ state: 'attached' });
  await m.locator('.cnp-add').first().waitFor();
  const nBotones = await m.locator('.cnp-add').count();
  ok(nBotones === 123, `botón + en cada plato y tamaño: ${nBotones}`);
  const bar = m.locator('#carta-nfc-pedidos .bar');
  ok((await bar.innerText()).includes('Mesa 3'), 'la barra muestra la mesa del NFC: Mesa 3');
  await plato(m, 'mn.burgers.2').scrollIntoViewIfNeeded();
  await shot(m, 'w01-carta-mesa');

  await plato(m, 'mn.burgers.2').locator('.cnp-add').click();                 // Big Cuac 12,5
  await plato(m, 'mn.abaceria.0').locator('.cnp-add').nth(1).click();         // Cecina Media 9
  await plato(m, 'mn.abaceria.0').locator('.cnp-add').nth(1).click();         // ×2
  ok((await plato(m, 'mn.abaceria.0').locator('.cnp-add').nth(1).innerText()).includes('2'), 'contador en el botón del tamaño (2)');
  await m.click('#tab-cocteleria');
  await plato(m, 'mn.cocteles.14').locator('.cnp-add').click();               // Mojito 8
  ok((await bar.innerText()).includes('38,50'), 'total 12,5 + 2×9 + 8 = 38,50 €');
  await shot(m, 'w02-barra-pedido');

  // Cambio de idioma de la web → el widget también
  await m.click('.lang__toggle');
  await m.click('.lang__menu button[data-lang="en"]');
  await m.waitForTimeout(300);
  ok((await bar.innerText()).toLowerCase().includes('view order'), 'idioma EN: "View order"');
  await bar.locator('[data-a="abrir"]').click();
  const sheet = m.locator('#carta-nfc-pedidos #d-carrito');
  await sheet.locator('.li').first().waitFor();
  const txtSheet = await sheet.innerText();
  ok(txtSheet.includes('Your order') && txtSheet.includes('León cured beef · Half') && txtSheet.toLowerCase().includes('table 3'),
    'carrito en inglés con los nombres de la web: "León cured beef · Half", "Table 3"');
  await sheet.locator('input[data-nota]').first().fill('poco hecha');
  await sheet.locator('#nota').fill('Somos 3');
  await shot(m, 'w03-carrito-en');
  await sheet.locator('[data-a="enviar"]').click();
  const okDlg = m.locator('#carta-nfc-pedidos #d-ok');
  await okDlg.locator('h2').waitFor();
  ok((await okDlg.innerText()).includes('Order #1'), 'pedido enviado: ' + (await okDlg.locator('p').innerText()).split('.')[0]);
  await shot(m, 'w04-enviado');
  await okDlg.locator('[data-a="cerrar"]').click();

  console.log('COCINA');
  const k = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  vigilar(k, 'cocina');
  await k.goto(`${BP}/cocina.html?r=martinez-bar&k=cocina-mz`);
  const tk = k.locator('#l-nuevo .ticket', { hasText: 'Mesa 3' });
  await tk.waitFor({ timeout: 8000 });
  const tt = await tk.innerText();
  ok(tt.includes('2×') && tt.includes('Cecina de León · Media') && tt.includes('Big Cuac') && tt.includes('Mojito') && tt.includes('poco hecha') && tt.includes('Somos 3'),
    'comanda: Mesa 3 · 2× Cecina de León · Media, Big Cuac (poco hecha), Mojito');
  ok(tt.includes('38,50'), 'total en cocina 38,50 €');
  await shot(k, 'w05-cocina');
  await tk.getByRole('button', { name: 'Empezar' }).click();
  await k.locator('#l-preparando .ticket', { hasText: 'Mesa 3' }).getByRole('button', { name: '¡Listo!' }).click();
  await bar.getByText('Ready', { exact: false }).waitFor({ timeout: 12000 });
  ok(true, 'la web muestra el estado del pedido en vivo: "Ready! On its way"');

  // Llamar camarero desde la web
  await bar.locator('[data-a="camarero"]').click();
  await k.locator('.aviso', { hasText: 'Mesa 3' }).waitFor({ timeout: 8000 });
  ok(true, 'aviso "llama al camarero" llega a cocina');

  // La mesa se mantiene al navegar por la web
  await m.goto(`${BW}/index.html`);
  await m.goto(`${BW}/carta.html`);
  await m.locator('#carta-nfc-pedidos .bar').waitFor();
  ok(/(Mesa|Table) 3/.test(await m.locator('#carta-nfc-pedidos .bar').innerText()), 'al volver a la carta sin ?mesa sigue en Mesa 3');

  // Agotado desde gestión
  const id = psql("select id from carta.productos where ref = 'mn.burgers.2'");
  psql(`set role anon; select public.carta_admin('martinez-bar','admin-mz','disponible','{\\"id\\":\\"${id}\\",\\"disponible\\":false}'::jsonb)`);
  await m.reload();
  await plato(m, 'mn.burgers.2').locator('.cnp-add:disabled').waitFor();
  ok(true, 'plato marcado agotado → botón desactivado');
  await shot(m, 'w06-agotado');

  ok(errores.length === 0, 'sin errores JS' + (errores.length ? ': ' + errores.join(' | ') : ''));
  console.log('\nE2E WIDGET OK');
} catch (e) {
  console.error(e.message);
  if (errores.length) console.error('Errores consola:', errores);
  process.exitCode = 1;
} finally {
  await browser.close();
  hijos.forEach((h) => h.kill());
}
