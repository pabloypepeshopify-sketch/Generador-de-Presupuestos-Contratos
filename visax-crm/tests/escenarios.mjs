// Pruebas de aceptación (10 escenarios) contra una instancia en marcha del CRM.
// Usa datos ficticios con el prefijo «[PRUEBA]» y los borra al terminar.
//
//   BASE_URL=http://localhost:3000 \
//   CRM_USUARIO_A=pablo CRM_CLAVE_A=... CRM_USUARIO_B=pepe CRM_CLAVE_B=... \
//   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
//   node tests/escenarios.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const A = { usuario: process.env.CRM_USUARIO_A ?? 'pablo', clave: process.env.CRM_CLAVE_A, nombre: process.env.CRM_NOMBRE_A ?? 'Pablo' };
const B = { usuario: process.env.CRM_USUARIO_B ?? 'pepe', clave: process.env.CRM_CLAVE_B, nombre: process.env.CRM_NOMBRE_B ?? 'Pepe' };
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const CAPTURAS = path.resolve(process.env.CAPTURAS ?? 'tests/capturas');
if (!A.clave || !B.clave || !SB_URL || !SB_KEY) {
  console.error('Faltan variables: CRM_CLAVE_A, CRM_CLAVE_B, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  process.exit(2);
}
mkdirSync(CAPTURAS, { recursive: true });

const PREFIJO = '[PRUEBA]';
const N = {
  inmo: `${PREFIJO} Inmobiliaria Costa Sur`,
  resto: `${PREFIJO} Restaurante El Puerto`,
  tienda: `${PREFIJO} Tienda Moda Norte`,
  clinica: `${PREFIJO} Clínica Dental Sol`,
};
const NUMERO_FACTURA = `PRUEBA-${Date.now()}`;
// PDF mínimo válido para la prueba de facturas
const PDF = '%PDF-1.4\n1 0 obj <</Type/Catalog/Pages 2 0 R>> endobj\n2 0 obj <</Type/Pages/Kids[3 0 R]/Count 1>> endobj\n3 0 obj <</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>> endobj\ntrailer <</Root 1 0 R>>\n%%EOF\n';
const leerEuros = (t) => Number(String(t).replace(/[^\d,-]/g, '').replace(',', '.'));

const resultados = [];
const errores = [];
async function escenario(nombre, fn) {
  const t0 = Date.now();
  try {
    await fn();
    resultados.push({ nombre, ok: true, ms: Date.now() - t0 });
    console.log(`✔ ${nombre}`);
  } catch (e) {
    resultados.push({ nombre, ok: false, error: e.message.split('\n')[0] });
    for (const [k, pg] of Object.entries({ pA, pB, pBm })) await pg?.screenshot({ path: path.join(CAPTURAS, `fallo-${nombre.slice(0, 2).trim()}-${k}.png`), fullPage: true }).catch(() => {});
    console.log(`✘ ${nombre}\n   ${e.message.split('\n').slice(0, 3).join('\n   ')}`);
  }
}
const comprobar = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;
const navegador = await chromium.launch({ proxy });
const nuevoContexto = (movil = false) =>
  navegador.newContext({
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    viewport: movil ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: movil ? 2 : 1,
    isMobile: movil,
    hasTouch: movil,
  });

async function abrirSesion(ctx, u) {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push(`${u.usuario}: ${e.message}`));
  await p.goto(`${BASE}/login`);
  await p.fill('input[name=usuario]', u.usuario);
  await p.fill('input[name=password]', u.clave);
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForURL(`${BASE}/`, { timeout: 30000 });
  return p;
}

async function captura(p, nombre) {
  await p.screenshot({ path: path.join(CAPTURAS, `${nombre}.png`), fullPage: true });
}

async function altaRapida(p, { nombre, sector, localidad, servicio, responsable, boton = 'Crear negocio' }) {
  await p.goto(`${BASE}/negocios/nuevo`);
  await p.fill('input[name=nombre]', nombre);
  if (sector) await p.fill('input[name=sector]', sector);
  if (localidad) await p.fill('input[name=localidad]', localidad);
  if (servicio) await p.getByRole('button', { name: servicio, exact: true }).click();
  if (responsable) await p.locator('button.chip', { hasText: responsable }).first().click();
  await p.getByRole('button', { name: boton, exact: true }).click();
  await p.waitForURL(/\/negocios\/[0-9a-f-]{36}/, { timeout: 30000 });
  return p.url().match(/negocios\/([0-9a-f-]{36})/)[1];
}

async function elegirResultado(p, texto) {
  await p.getByRole('button', { name: texto, exact: true }).click();
}

async function guardarContacto(p, id) {
  await p.getByRole('button', { name: /Guardar contacto/ }).click();
  await p.waitForURL(new RegExp(`/negocios/${id}(\\?|$)`), { timeout: 30000 });
  await p.getByText('Contacto registrado').first().waitFor();
  await p.getByRole('heading', { name: /^Historial/ }).waitFor();
  await p.waitForLoadState('networkidle');
}

// Borra los negocios de prueba (y en cascada su historial, contactos y tareas)
async function tokenDePablo() {
  const sesion = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${A.usuario}@crm.visaxai.es`, password: A.clave }),
  }).then((r) => r.json());
  return sesion.access_token;
}

// Borra los negocios de prueba (y en cascada su historial, contactos, tareas, cobros y facturas),
// los gastos de prueba y los PDF que se subieron
async function borrarDatosDePrueba() {
  try {
    const auth = { apikey: SB_KEY, Authorization: `Bearer ${await tokenDePablo()}` };
    const pref = encodeURIComponent(PREFIJO);
    const json = (r) => (r.ok ? r.json() : []);
    const facturas = await fetch(`${SB_URL}/rest/v1/facturas?select=archivo_path,negocios!inner(nombre)&negocios.nombre=like.${pref}*`, { headers: auth }).then(json);
    const gastos = await fetch(`${SB_URL}/rest/v1/gastos?concepto=like.${pref}*&select=justificante_path`, { method: 'DELETE', headers: { ...auth, Prefer: 'return=representation' } }).then(json);
    const archivos = [...facturas.map((f) => f.archivo_path), ...gastos.map((g) => g.justificante_path)].filter(Boolean);
    if (archivos.length) await fetch(`${SB_URL}/storage/v1/object/documentos`, { method: 'DELETE', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: archivos }) });
    const r = await fetch(`${SB_URL}/rest/v1/negocios?nombre=like.${pref}*`, { method: 'DELETE', headers: { ...auth, Prefer: 'return=representation' } });
    return (await r.json()).length ?? 0;
  } catch (e) {
    return `0 (error: ${e.message})`;
  }
}

/** Indicadores del mes actual en Dinero (0 si todavía no hay nada apuntado) */
async function resumenMes(p) {
  await p.goto(`${BASE}/dinero`);
  await p.getByRole('heading', { name: 'Dinero', exact: true }).waitFor();
  const bloque = p.locator('section').filter({ has: p.getByText('Para cada uno', { exact: true }) }).first();
  if (!(await bloque.count())) return { ingresos: 0, gastos: 0, ganancia: 0, cada: 0 };
  const valor = async (txt) => leerEuros(await bloque.locator('div.caja', { has: p.getByText(txt, { exact: true }) }).first().locator('span').first().innerText());
  return { ingresos: await valor('Ingresos'), gastos: await valor('Gastos'), ganancia: await valor('Ganancia'), cada: await valor('Para cada uno') };
}

const ids = {};
const ctxA = await nuevoContexto(false);
const ctxBMovil = await nuevoContexto(true);
const ctxB = await nuevoContexto(false);
let pA, pBm, pB;

const restos = await borrarDatosDePrueba();
if (restos) console.log(`Restos de pruebas anteriores borrados: ${restos}`);

try {
  pA = await abrirSesion(ctxA, A);
  pBm = await abrirSesion(ctxBMovil, B);
  pB = await abrirSesion(ctxB, B);

  await escenario('1. Alta de negocio: Pablo registra una inmobiliaria y aparece en la tabla y en el Kanban', async () => {
    ids.inmo = await altaRapida(pA, { nombre: N.inmo, sector: 'Inmobiliaria', localidad: 'Sanlúcar', servicio: 'Página web', responsable: A.nombre });
    await pA.goto(`${BASE}/negocios?q=${encodeURIComponent('Costa Sur')}`);
    const fila = pA.locator('table tbody tr', { hasText: N.inmo });
    await fila.waitFor();
    comprobar((await fila.innerText()).includes('Inmobiliaria'), 'La fila no muestra el sector');
    await pA.goto(`${BASE}/kanban?q=${encodeURIComponent('Costa Sur')}`);
    const columna = pA.locator('section[aria-label^="Pendiente de contactar"]');
    await columna.locator('article', { hasText: N.inmo }).waitFor();
    await captura(pA, '01-kanban-alta');
  });

  await escenario('2. Visita sin encontrar al dueño (desde el móvil): resultado, hora 17:30 y seguimiento en la agenda', async () => {
    ids.resto = await altaRapida(pBm, { nombre: N.resto, sector: 'Restaurante', localidad: 'Chipiona', servicio: 'Automatizaciones con IA', responsable: B.nombre, boton: 'Crear y registrar visita' });
    comprobar(pBm.url().includes('/contacto?tipo=visita'), 'No ha llevado al registro de la visita');
    await elegirResultado(pBm, 'El dueño o encargado no estaba');
    await pBm.getByLabel('¿A qué hora se le puede encontrar?').fill('17:30');
    comprobar(await pBm.getByLabel('Programar la siguiente acción').isChecked(), 'No propone programar la siguiente acción');
    await captura(pBm, '02-movil-registrar-visita');
    await guardarContacto(pBm, ids.resto);
    await pBm.getByText('Se le puede encontrar a las 17:30').first().waitFor();
    await pBm.goto(`${BASE}/agenda`);
    const tarea = pBm.locator('li', { hasText: N.resto }).filter({ hasText: 'Volver a visitar' }).first();
    await tarea.waitFor();
    comprobar((await tarea.innerText()).includes('17:30'), 'La tarea de la agenda no tiene la hora 17:30');
    await captura(pBm, '02-movil-agenda');
  });

  await escenario('3. Llamada con interés: necesidad, notas y llamada de seguimiento', async () => {
    ids.tienda = await altaRapida(pA, { nombre: N.tienda, sector: 'Tienda', localidad: 'Jerez', responsable: A.nombre });
    await pA.getByRole('link', { name: 'Registrar llamada' }).click();
    await pA.waitForURL(/contacto\?tipo=llamada/);
    await elegirResultado(pA, 'Está interesado, pero necesita más información');
    await pA.getByRole('button', { name: 'Automatizaciones con IA', exact: true }).click();
    await pA.getByRole('button', { name: 'Alto', exact: true }).click();
    await pA.fill('textarea[name=notas]', 'Pierde mucho tiempo contestando WhatsApp de clientes. Quiere automatizar respuestas y pedidos.');
    await pA.getByRole('button', { name: 'Llamar', exact: true }).click();
    await pA.getByRole('button', { name: '+3 días', exact: true }).click();
    const estado = await pA.getByLabel('Nuevo estado comercial').inputValue();
    comprobar(estado === 'interesado', `El estado sugerido es «${estado}» y debería ser «interesado»`);
    await guardarContacto(pA, ids.tienda);
    comprobar((await pA.getByLabel('Estado comercial', { exact: true }).inputValue()) === 'interesado', 'El negocio no ha pasado a Interesado');
    comprobar((await pA.getByLabel('Interés en Automatizaciones con IA').inputValue()) === 'alto', 'No se ha guardado el interés alto en automatizaciones');
    await pA.getByText('Pierde mucho tiempo contestando WhatsApp').waitFor();
    await pA.locator('li', { hasText: 'Llamar y hablar con el responsable' }).first().waitFor();
    await captura(pA, '03-ficha-tienda');
  });

  await escenario('4. Historial: visita de Pablo y llamada de Pepe al mismo negocio, cada una con su autor', async () => {
    await pA.goto(`${BASE}/negocios/${ids.inmo}/contacto?tipo=visita`);
    await elegirResultado(pA, 'Nos han dicho que volvamos más tarde');
    await pA.getByLabel('¿A qué hora se le puede encontrar?').fill('12:00');
    await guardarContacto(pA, ids.inmo);
    await pB.goto(`${BASE}/negocios/${ids.inmo}/contacto?tipo=llamada`);
    await elegirResultado(pB, 'Quiere una demostración');
    await guardarContacto(pB, ids.inmo);
    const historial = pB.locator('ol article');
    comprobar((await historial.count()) === 2, `Se esperaban 2 contactos en el historial y hay ${await historial.count()}`);
    const textos = await historial.allInnerTexts();
    comprobar(textos.some((t) => t.includes('Llamada telefónica') && t.includes(B.nombre)), 'Falta la llamada de Pepe');
    comprobar(textos.some((t) => t.includes('Visita presencial') && t.includes(A.nombre)), 'Falta la visita de Pablo');
    await captura(pB, '04-historial-compartido');
  });

  await escenario('5. Datos compartidos: Pepe ve el negocio de Pablo y gestiona su tarea', async () => {
    await pB.goto(`${BASE}/negocios?q=${encodeURIComponent('Costa Sur')}`);
    await pB.locator('table tbody tr', { hasText: N.inmo }).getByRole('link').first().click();
    await pB.waitForURL(new RegExp(`/negocios/${ids.inmo}`));
    await pB.getByText(`por ${A.nombre}`).first().waitFor();
    const tareaDePablo = pB.locator('li', { hasText: 'Volver a visitar' }).filter({ has: pB.getByRole('button', { name: 'Marcar hecha' }) }).first();
    await tareaDePablo.getByRole('button', { name: 'Marcar hecha' }).click();
    await pB.getByText('Tarea completada', { exact: true }).first().waitFor();
    await pB.reload();
    await pB.getByText('Tarea completada:').first().waitFor();
  });

  await escenario('6. Cambio de estado arrastrando en el Kanban: Interesado → Preparando propuesta', async () => {
    await pB.goto(`${BASE}/kanban?q=${encodeURIComponent('Moda Norte')}`);
    const tarjeta = pB.locator('section[aria-label^="Interesado"] article', { hasText: N.tienda });
    await tarjeta.waitFor();
    const destino = pB.locator('section[aria-label^="Preparando propuesta"]');
    // Las columnas se desplazan en horizontal: hay que tener origen y destino a la vista
    await destino.scrollIntoViewIfNeeded();
    await tarjeta.scrollIntoViewIfNeeded();
    const a = await tarjeta.locator('p', { hasText: 'Último contacto' }).boundingBox();
    const b = await destino.boundingBox();
    await pB.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await pB.mouse.down();
    await pB.mouse.move(a.x + a.width / 2 + 20, a.y + 80, { steps: 5 });
    await pB.mouse.move(b.x + b.width / 2, b.y + 120, { steps: 15 });
    await pB.mouse.up();
    await pB.getByText(/→ Preparando propuesta/).waitFor();
    await destino.locator('article', { hasText: N.tienda }).waitFor();
    await pB.goto(`${BASE}/negocios?q=${encodeURIComponent('Moda Norte')}`);
    const valor = await pB.locator('table tbody tr', { hasText: N.tienda }).getByLabel('Estado comercial', { exact: true }).inputValue();
    comprobar(valor === 'preparando_propuesta', `En la tabla aparece «${valor}»`);
    // Alternativa sin arrastrar: el desplegable «Mover a»
    await pB.goto(`${BASE}/kanban?q=${encodeURIComponent('El Puerto')}`);
    await pB.getByLabel(`Mover ${N.resto} a otro estado`).selectOption('seguimiento_pendiente');
    await pB.locator('section[aria-label^="Seguimiento pendiente"] article', { hasText: N.resto }).waitFor();
    await captura(pB, '06-kanban');
  });

  await escenario('7. Seguimiento atrasado: aparece como atrasado hasta que se reprograma', async () => {
    await pB.goto(`${BASE}/negocios/${ids.resto}`);
    await pB.getByRole('button', { name: 'Nueva tarea' }).click();
    const dialogo = pB.getByRole('dialog', { name: 'Nueva tarea' });
    await dialogo.getByRole('button', { name: 'Llamar', exact: true }).click();
    await dialogo.locator('input[name=descripcion]').fill('Llamar para confirmar horario del dueño');
    const ayer = await pB.evaluate(() => {
      const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date(Date.now() - 864e5));
      return f;
    });
    await dialogo.locator('input[name=vence_fecha]').fill(ayer);
    await dialogo.getByRole('button', { name: 'Crear tarea' }).click();
    await pB.getByText('Tarea creada').first().waitFor();
    await pB.goto(`${BASE}/agenda`);
    const seccionAtrasadas = pB.locator('section', { hasText: /^Atrasadas/ }).first();
    const fila = seccionAtrasadas.locator('li', { hasText: 'Llamar para confirmar horario del dueño' });
    await fila.waitFor();
    comprobar((await fila.innerText()).includes('Atrasada'), 'No se marca como atrasada');
    await captura(pB, '07-agenda-atrasada');
    await pB.reload();
    await fila.waitFor();
    await fila.getByRole('button', { name: 'Reprogramar' }).click();
    await fila.getByRole('button', { name: 'Mañana', exact: true }).click();
    await fila.getByRole('button', { name: 'Guardar' }).click();
    await pB.getByText('Tarea reprogramada').first().waitFor();
    let sigue = 1;
    for (let i = 0; i < 20 && sigue; i++) {
      await pB.waitForTimeout(500);
      sigue = await pB.locator('section', { hasText: /^Atrasadas/ }).locator('li', { hasText: 'Llamar para confirmar horario del dueño' }).count();
    }
    comprobar(sigue === 0, 'Sigue apareciendo como atrasada tras reprogramar');
  });

  await escenario('8. Persistencia: tras cerrar sesión y volver a entrar sigue todo guardado', async () => {
    await pA.goto(`${BASE}/ajustes`);
    await pA.getByRole('button', { name: 'Cerrar sesión' }).last().click();
    await pA.waitForURL(`${BASE}/login`);
    await pA.close();
    pA = await abrirSesion(ctxA, A);
    await pA.goto(`${BASE}/negocios?q=${encodeURIComponent(PREFIJO)}`);
    await pA.locator('table tbody tr', { hasText: N.tienda }).waitFor();
    comprobar((await pA.locator('table tbody tr').count()) === 3, 'No están los 3 negocios de prueba');
    comprobar((await pA.locator('table tbody tr', { hasText: N.tienda }).getByLabel('Estado comercial', { exact: true }).inputValue()) === 'preparando_propuesta', 'El estado no se ha conservado');
    await pA.goto(`${BASE}/negocios/${ids.inmo}`);
    comprobar((await pA.locator('ol article').count()) === 2, 'El historial no se ha conservado');
    await pA.goto(`${BASE}/`);
    await pA.getByText('Negocios registrados').waitFor();
    await captura(pA, '08-panel');
  });

  await escenario('9. Seguridad: sin sesión no se ve nada, ni en la web ni pidiendo los datos directamente', async () => {
    const anon = await nuevoContexto(false);
    const p = await anon.newPage();
    for (const ruta of ['/', '/negocios', `/negocios/${ids.inmo}`, '/kanban', '/agenda', '/ajustes']) {
      await p.goto(`${BASE}${ruta}`);
      comprobar(new URL(p.url()).pathname === '/login', `${ruta} no redirige al login`);
    }
    await anon.close();
    const cab = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
    for (const tabla of ['negocios', 'negocios_vista', 'interacciones', 'tareas', 'contactos', 'socios']) {
      const r = await fetch(`${SB_URL}/rest/v1/${tabla}?select=*&limit=5`, { headers: cab });
      const cuerpo = await r.text();
      comprobar(!r.ok || cuerpo.trim() === '[]', `La tabla ${tabla} responde datos sin sesión (${r.status})`);
    }
    const rpc = await fetch(`${SB_URL}/rest/v1/rpc/panel_resumen`, { method: 'POST', headers: { ...cab, 'Content-Type': 'application/json' }, body: '{}' });
    comprobar(!rpc.ok, 'panel_resumen responde sin sesión');
    const codigo = await fetch(`${SB_URL}/rest/v1/rpc/acceso_canjear`, { method: 'POST', headers: { ...cab, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_usuario: 'pablo', p_codigo: 'AAAA-AAAA-AAAA' }) });
    comprobar(!codigo.ok, 'acceso_canjear se puede llamar sin la función de acceso');
  });

  await escenario('10. Diseño adaptable: las pantallas principales caben en el móvil y funcionan en ordenador', async () => {
    for (const ruta of ['/', '/negocios', `/negocios/${ids.resto}`, `/negocios/${ids.resto}/contacto?tipo=llamada`, '/agenda', '/negocios/nuevo', '/ajustes']) {
      await pBm.goto(`${BASE}${ruta}`);
      await pBm.waitForLoadState('networkidle');
      const desborda = await pBm.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      comprobar(desborda <= 1, `${ruta} se sale ${desborda}px de ancho en el móvil`);
    }
    await pBm.goto(`${BASE}/negocios`);
    await captura(pBm, '10-movil-negocios');
    await pBm.goto(`${BASE}/`);
    await captura(pBm, '10-movil-panel');
    await pA.goto(`${BASE}/negocios?q=${encodeURIComponent(PREFIJO)}`);
    await captura(pA, '10-escritorio-tabla');
    await pA.goto(`${BASE}/agenda`);
    await captura(pA, '10-escritorio-agenda');
    await pA.goto(`${BASE}/negocios/${ids.inmo}`);
    await captura(pA, '10-escritorio-ficha');
  });

  // ---------- Dinero ----------
  await escenario('11. Dinero: servicio mensual, cuota pendiente y cobro apuntado (suma al resumen y 50/50)', async () => {
    const antes = await resumenMes(pA);
    ids.clinica = await altaRapida(pA, { nombre: N.clinica, sector: 'Clínica', localidad: 'Rota', responsable: A.nombre });
    await pA.getByLabel('Estado comercial', { exact: true }).selectOption('cliente_ganado');
    await pA.getByRole('heading', { name: 'Servicios contratados' }).waitFor({ timeout: 30000 });
    await pA.getByRole('button', { name: 'Servicio contratado' }).click();
    const dlg = pA.getByRole('dialog', { name: 'Nuevo servicio contratado' });
    await dlg.locator('input[name=concepto]').fill('Mantenimiento web');
    await dlg.getByRole('button', { name: 'Mensual', exact: true }).click();
    await dlg.locator('input[name=importe_base]').fill('100');
    await dlg.getByText('114,00 €').waitFor(); // 100 + 21 % IVA − 7 % IRPF
    await dlg.getByRole('button', { name: 'Añadir servicio' }).click();
    await pA.getByText('Servicio añadido').first().waitFor();
    const cuota = pA.locator('li', { hasText: 'Mantenimiento web ·' }).first();
    await cuota.waitFor();
    const texto = await cuota.innerText();
    comprobar(texto.includes('114,00'), 'La cuota no muestra 114,00 € a cobrar');
    comprobar(texto.includes('Vence hoy'), 'La cuota de hoy no sale como «Vence hoy»');
    await cuota.getByRole('button', { name: 'Marcar cobrado' }).click();
    await cuota.getByRole('button', { name: 'Apuntar cobro' }).click();
    await pA.getByText('Cobro apuntado').first().waitFor();
    await pA.locator('li', { hasText: 'Mantenimiento web ·' }).first().getByText('Cobrado', { exact: true }).waitFor();
    const despues = await resumenMes(pA);
    comprobar(Math.abs(despues.ingresos - antes.ingresos - 100) < 0.01, `Los ingresos del mes no han subido 100 € (${antes.ingresos} → ${despues.ingresos})`);
    comprobar(Math.abs(despues.cada - antes.cada - 50) < 0.01, `La parte de cada uno no ha subido 50 € (${antes.cada} → ${despues.cada})`);
    await captura(pA, '11-dinero-resumen');
  });

  await escenario('12. Dinero: subir la factura en PDF de un cobro, abrirla y que el otro socio la vea', async () => {
    await pA.goto(`${BASE}/negocios/${ids.clinica}`);
    const cuota = pA.locator('li', { hasText: 'Mantenimiento web ·' }).first();
    await cuota.getByRole('button', { name: 'Subir factura' }).click();
    const dlg = pA.getByRole('dialog', { name: 'Subir factura' });
    await dlg.locator('input[type=file]').setInputFiles({ name: 'factura-prueba.pdf', mimeType: 'application/pdf', buffer: Buffer.from(PDF) });
    await dlg.locator('input[name=numero]').fill(NUMERO_FACTURA);
    const propuesto = await dlg.locator('input[name=importe_total]').inputValue();
    comprobar(['114', '114,00'].includes(propuesto), `No propone el total del cobro (${propuesto})`);
    await dlg.getByRole('button', { name: 'Guardar factura' }).click();
    await pA.getByText('Factura guardada').first().waitFor({ timeout: 30000 });
    const enlace = pA.locator('li', { hasText: 'Mantenimiento web ·' }).first().getByRole('link', { name: `Factura ${NUMERO_FACTURA}` });
    await enlace.waitFor();
    const href = await enlace.getAttribute('href');
    const r = await pA.evaluate(async (u) => {
      const res = await fetch(u);
      const b = new Uint8Array(await res.arrayBuffer());
      return { ok: res.ok, status: res.status, tipo: res.headers.get('content-type'), inicio: String.fromCharCode(...b.slice(0, 4)) };
    }, href);
    comprobar(r.ok, `El PDF no se abre (${r.status})`);
    comprobar((r.tipo ?? '').includes('pdf'), `No llega un PDF (${r.tipo})`);
    comprobar(r.inicio === '%PDF', 'El archivo que se abre no es el PDF subido');
    ids.factura = href.match(/documentos\/([0-9a-f-]{36})/)[1];
    await pB.goto(`${BASE}/dinero/facturas?q=${encodeURIComponent(NUMERO_FACTURA)}`);
    await pB.getByText(`Factura ${NUMERO_FACTURA}`).waitFor();
    await captura(pB, '12-dinero-facturas');
  });

  await escenario('13. Dinero: gasto de un cliente, lo que deja y diseño en el móvil', async () => {
    const antes = await resumenMes(pA);
    await pA.goto(`${BASE}/negocios/${ids.clinica}`);
    await pA.getByRole('button', { name: 'Gasto', exact: true }).click();
    const dlg = pA.getByRole('dialog', { name: 'Nuevo gasto' });
    await dlg.locator('input[name=concepto]').fill(`${PREFIJO} Hosting de la web`);
    await dlg.locator('input[name=importe_base]').fill('30');
    await dlg.getByRole('button', { name: 'Apuntar gasto' }).click();
    await pA.getByText('Gasto apuntado').first().waitFor();
    const deja = pA.locator('dl > div', { has: pA.getByText('Lo que deja', { exact: true }) }).locator('dd').first();
    for (let i = 0; i < 20 && leerEuros(await deja.innerText()) !== 70; i++) await pA.waitForTimeout(500);
    comprobar(leerEuros(await deja.innerText()) === 70, `«Lo que deja» debería ser 70,00 € y es ${await deja.innerText()}`);
    await captura(pA, '13-ficha-dinero');
    const despues = await resumenMes(pA);
    comprobar(Math.abs(despues.gastos - antes.gastos - 30) < 0.01, `Los gastos del mes no han subido 30 € (${antes.gastos} → ${despues.gastos})`);
    comprobar(Math.abs(antes.ganancia - despues.ganancia - 30) < 0.01, `La ganancia no ha bajado 30 € (${antes.ganancia} → ${despues.ganancia})`);
    for (const ruta of ['/dinero', '/dinero/cobros', '/dinero/gastos', '/dinero/facturas', `/negocios/${ids.clinica}`]) {
      await pBm.goto(`${BASE}${ruta}`);
      await pBm.waitForLoadState('networkidle');
      const desborda = await pBm.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      comprobar(desborda <= 1, `${ruta} se sale ${desborda}px de ancho en el móvil`);
    }
    await captura(pBm, '13-movil-ficha-dinero');
  });

  await escenario('14. Dinero: sin sesión no se ven cobros, facturas, gastos ni los PDF', async () => {
    const anon = await nuevoContexto(false);
    const p = await anon.newPage();
    for (const ruta of ['/dinero', '/dinero/cobros', '/dinero/gastos', '/dinero/facturas', `/documentos/${ids.factura}?de=factura`]) {
      await p.goto(`${BASE}${ruta}`);
      comprobar(new URL(p.url()).pathname === '/login', `${ruta} no redirige al login`);
    }
    await anon.close();
    const cab = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
    for (const tabla of ['contratos', 'cobros', 'facturas', 'gastos']) {
      const r = await fetch(`${SB_URL}/rest/v1/${tabla}?select=*&limit=5`, { headers: cab });
      const cuerpo = await r.text();
      comprobar(!r.ok || cuerpo.trim() === '[]', `La tabla ${tabla} responde datos sin sesión (${r.status})`);
    }
    const rpc = await fetch(`${SB_URL}/rest/v1/rpc/dinero_resumen`, { method: 'POST', headers: { ...cab, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_desde: '2026-01-01', p_hasta: '2026-12-31' }) });
    comprobar(!rpc.ok, 'dinero_resumen responde sin sesión');
    const auth = { apikey: SB_KEY, Authorization: `Bearer ${await tokenDePablo()}` };
    const [f] = await fetch(`${SB_URL}/rest/v1/facturas?id=eq.${ids.factura}&select=archivo_path`, { headers: auth }).then((r) => r.json());
    comprobar(f?.archivo_path, 'No se encuentra la factura de prueba');
    for (const url of [`${SB_URL}/storage/v1/object/documentos/${f.archivo_path}`, `${SB_URL}/storage/v1/object/public/documentos/${f.archivo_path}`]) {
      const r = await fetch(url, { headers: cab });
      comprobar(!r.ok, `El PDF se puede descargar sin sesión (${r.status})`);
    }
  });
} finally {
  console.log(`Limpieza: ${await borrarDatosDePrueba()} negocios de prueba borrados`);
  await navegador.close();
}

const fallos = resultados.filter((r) => !r.ok);
if (errores.length) console.log('Errores de JavaScript en el navegador:', errores);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} escenarios correctos`);
process.exit(fallos.length || errores.length ? 1 : 0);
