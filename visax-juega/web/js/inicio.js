// VISAX Juega · página del comercial: personaliza la demo para el local que visitas.
import { cargarConfig, guardarConfig, TIPOS, COLORES, enlace, toast } from './comun.js';

const $ = (s) => document.querySelector(s);
let cfg = cargarConfig();

function marcar(grupo, valor) {
  grupo.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === valor)));
}

function pintarColores() {
  const lista = COLORES.includes(cfg.color) ? COLORES : [...COLORES, cfg.color];
  $('#colores').innerHTML = lista.map((c) => `<button type="button" data-c="${c}" style="background:${c}" aria-label="Color ${c}" aria-pressed="${c === cfg.color}"></button>`).join('')
    + `<label class="color-libre" title="Otro color"><input type="color" id="color-libre" value="${cfg.color.toLowerCase()}" aria-label="Elegir otro color"></label>`;
  $('#color-libre').addEventListener('input', (e) => { cfg.color = e.target.value.toUpperCase(); cambiar(false); });
  $('#color-libre').addEventListener('change', () => pintarColores());
}

let tVista;
function cambiar(repintarColores = true) {
  guardarConfig(cfg);
  if (repintarColores) pintarColores();
  const urlCliente = enlace('cliente.html', cfg);
  $('#abrir-cliente').href = urlCliente;
  $('#abrir-panel').href = enlace('panel.html', cfg);
  $('#nav-panel').href = enlace('panel.html', cfg);
  const qr = $('#qr');
  qr.innerHTML = '';
  if (window.QRCode) new window.QRCode(qr, { text: urlCliente, width: 152, height: 152, colorDark: '#06060B', colorLight: '#FFFFFF', correctLevel: window.QRCode.CorrectLevel.M });
  clearTimeout(tVista);
  tVista = setTimeout(() => { $('#vista').src = urlCliente; }, 350);
}

// ---------- Controles ----------
$('#nombre').value = cfg.nombre;
marcar($('#tipo'), cfg.tipo);
marcar($('#juego'), cfg.juego);

$('#nombre').addEventListener('input', (e) => { cfg.nombre = e.target.value.trim() || TIPOS[cfg.tipo].ejemplo; cambiar(false); });
$('#tipo').addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]');
  if (!b || b.dataset.v === cfg.tipo) return;
  const ejemplos = Object.values(TIPOS).map((t) => t.ejemplo);
  if (ejemplos.includes(cfg.nombre)) { cfg.nombre = TIPOS[b.dataset.v].ejemplo; $('#nombre').value = cfg.nombre; }
  cfg.tipo = b.dataset.v;
  cfg.premios = TIPOS[cfg.tipo].premios.map((p) => ({ ...p }));
  cfg.premioSellos = TIPOS[cfg.tipo].premioSellos;
  cfg.premiosPropios = false;
  marcar($('#tipo'), cfg.tipo);
  cambiar(false);
});
$('#juego').addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  cfg.juego = b.dataset.v;
  marcar($('#juego'), cfg.juego);
  cambiar(false);
});
$('#colores').addEventListener('click', (e) => {
  const b = e.target.closest('[data-c]');
  if (!b) return;
  cfg.color = b.dataset.c;
  cambiar();
});

$('#copiar').addEventListener('click', async () => {
  const url = enlace('cliente.html', cfg);
  try { await navigator.clipboard.writeText(url); toast('Enlace copiado'); } catch { prompt('Copia el enlace:', url); }
});

// ---------- Grabar la demo en una pegatina NFC (Chrome en Android) ----------
$('#grabar-nfc').addEventListener('click', async () => {
  const estado = $('#estado-nfc');
  const url = enlace('cliente.html', cfg);
  if (!('NDEFReader' in window)) {
    estado.innerHTML = 'Este navegador no puede grabar NFC (solo Chrome en Android). Alternativa: copia el enlace y grábalo con la app <b>NFC Tools</b> como registro «URL».';
    return;
  }
  try {
    estado.textContent = 'Acerca la pegatina NFC a la parte de atrás del móvil…';
    const ndef = new window.NDEFReader();
    await ndef.write({ records: [{ recordType: 'url', data: url }] }, { overwrite: true });
    estado.textContent = '✓ Grabada. Ahora cualquier móvil que la toque abre la demo de este local.';
    if (navigator.vibrate) navigator.vibrate(80);
  } catch (err) {
    estado.textContent = err && err.name === 'NotAllowedError'
      ? 'Hace falta dar permiso de NFC a Chrome y tener el NFC encendido.'
      : 'No se pudo grabar. Prueba otra vez sin mover la pegatina.';
  }
});

pintarColores();
cambiar(false);
