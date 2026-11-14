// VISAX Juega · página del cliente (lo que se abre al tocar la placa NFC).
import {
  cargarConfig, cargarCliente, guardarCliente, reiniciarCliente, hoyISO, sumarDias,
  codigoPremio, sortearPremio, fechaCorta, escapar, tintaSobre, toast, PIN_DEMO,
} from './comun.js';

const cfg = cargarConfig();
let est = cargarCliente();
const hoy = hoyISO();
const $ = (s) => document.querySelector(s);

const ICONO_REGALO = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3.5-5-1.2C7 7 9.5 7 12 7zm0 0c1.5-3 5-3.5 5-1.2C17 7 14.5 7 12 7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const ICONO_OK = '<svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONO_SELLO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ---------- Tema del local ----------
function aplicarTema() {
  const r = document.documentElement.style;
  r.setProperty('--accent', cfg.color);
  r.setProperty('--on-accent', tintaSobre(cfg.color));
  $('#nombre-local').textContent = cfg.nombre;
  $('#avatar').textContent = (cfg.nombre.replace(/^(bar|café|cafe|cafetería|restaurante)\s+/i, '').trim()[0] || 'V').toUpperCase();
  document.title = `${cfg.nombre} · Juega y gana`;
}

// ---------- Visitas y sellos ----------
function registrarVisita(forzar = false) {
  if (!forzar && est.visitas.includes(hoy)) return false;
  est.visitas.push(hoy);
  const n = cfg.sellos;
  if (est.visitas.length % n === 0) {
    est.premios.unshift(nuevoPremio(cfg.premioSellos, `Por tus ${n} visitas`));
    guardarCliente(est);
    return true;
  }
  guardarCliente(est);
  return false;
}

function pintarSellos(animarUltimo = false) {
  const n = cfg.sellos;
  const llenos = est.visitas.length % n;
  const cont = $('#sellos');
  cont.style.setProperty('--n', n);
  cont.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    const ultimo = i === n - 1;
    d.className = 'sello' + (i < llenos ? ' lleno' : '') + (ultimo && i >= llenos ? ' regalo' : '');
    d.innerHTML = i < llenos ? ICONO_SELLO : ultimo ? ICONO_REGALO : '';
    if (i < llenos && !(animarUltimo && i === llenos - 1)) d.style.animation = 'none';
    cont.appendChild(d);
  }
  $('#cuenta-sellos').textContent = `${llenos} de ${n}`;
  const faltan = n - llenos;
  $('#texto-sellos').innerHTML = `Te ${faltan === 1 ? 'falta <strong>1 visita</strong>' : `faltan <strong>${faltan} visitas</strong>`} para: <strong>${escapar(cfg.premioSellos)}</strong>. Cada día que toques la placa suma un sello.`;
}

// ---------- Premios ----------
function nuevoPremio(nombre, origen) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    codigo: codigoPremio(),
    nombre,
    origen,
    fecha: hoy,
    validoDesde: sumarDias(hoy, 1),
    caduca: sumarDias(hoy, 30),
    canjeado: null,
  };
}

function pintarPremios() {
  const cont = $('#lista-premios');
  if (!est.premios.length) {
    cont.innerHTML = '<p class="vacio">Aún no tienes premios. ¡Juega arriba y se guardan aquí, en tu móvil!</p>';
    return;
  }
  cont.innerHTML = est.premios.map((p) => `
    <div class="premio${p.canjeado ? ' usado' : ''}">
      <div class="premio-ico">${ICONO_REGALO}</div>
      <div class="premio-texto">
        <strong>${escapar(p.nombre)}</strong>
        <span>${p.canjeado ? `Canjeado el ${fechaCorta(p.canjeado)}` : `${escapar(p.origen)} · válido hasta el ${fechaCorta(p.caduca)}`}</span>
      </div>
      <button data-canjear="${p.id}" ${p.canjeado ? 'disabled' : ''}>${p.canjeado ? 'Usado' : 'Canjear'}</button>
    </div>`).join('');
}

// ---------- Hoja inferior ----------
function abrirHoja(html, alCerrar) {
  $('#hoja-contenido').innerHTML = html;
  $('#velo').hidden = false;
  $('#hoja').hidden = false;
  $('#hoja')._alCerrar = alCerrar;
  $('#hoja')._abierta = Date.now();
  const foco = $('#hoja').querySelector('input, button');
  if (foco) setTimeout(() => foco.focus({ preventScroll: true }), 50);
}
function cerrarHoja() {
  $('#velo').hidden = true;
  $('#hoja').hidden = true;
  const f = $('#hoja')._alCerrar;
  $('#hoja')._alCerrar = null;
  if (f) f();
}
// Evita cerrar sin querer: el dedo que estaba rascando no debe cerrar la hoja.
let toqueEnVelo = false;
$('#velo').addEventListener('pointerdown', () => { toqueEnVelo = Date.now() - ($('#hoja')._abierta || 0) > 500; });
$('#velo').addEventListener('click', () => { if (toqueEnVelo) cerrarHoja(); toqueEnVelo = false; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#hoja').hidden) cerrarHoja(); });

function celebrar() {
  if (!window.confetti || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colores = [cfg.color, '#FFD166', '#FFFFFF'];
  window.confetti({ particleCount: 110, spread: 75, origin: { y: 0.55 }, colors: colores, zIndex: 30 });
  setTimeout(() => window.confetti({ particleCount: 60, spread: 110, origin: { y: 0.45 }, colors: colores, zIndex: 30 }), 250);
}

function ganar(indice) {
  const p = nuevoPremio(cfg.premios[indice].nombre, cfg.juego === 'ruleta' ? 'Ruleta' : 'Rasca y gana');
  est.premios.unshift(p);
  est.jugadas.push(hoy);
  guardarCliente(est);
  pintarPremios();
  celebrar();
  if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  setTimeout(() => {
    abrirHoja(`
      <p class="tenue">¡Enhorabuena! Has ganado</p>
      <p class="gran-premio" id="hoja-titulo">${escapar(p.nombre)}</p>
      <p class="tenue">Canjéalo en tu <strong>próxima visita</strong>. Tienes hasta el ${fechaCorta(p.caduca)}.</p>
      <button class="boton" id="guardar-premio">${ICONO_REGALO} Guardar en mi móvil</button>
    `, () => pintarJuego());
    $('#guardar-premio').addEventListener('click', (e) => {
      e.currentTarget.innerHTML = `${ICONO_SELLO.replace('<svg', '<svg width="20" height="20"')} Guardado en tu móvil`;
      e.currentTarget.disabled = true;
      setTimeout(() => { cerrarHoja(); $('#titulo-premios').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 700);
    });
  }, cfg.juego === 'ruleta' ? 350 : 450);
}

// ---------- Juego ----------
function pintarJuego(forzar = false) {
  const zona = $('#zona-juego');
  const esRuleta = cfg.juego === 'ruleta';
  $('#titulo-juego').textContent = esRuleta ? 'Gira la ruleta' : 'Rasca y gana';
  if (!forzar && est.jugadas.includes(hoy)) {
    const ultimo = est.premios.find((p) => p.fecha === hoy && p.origen !== `Por tus ${cfg.sellos} visitas`);
    $('#sub-juego').textContent = 'Una jugada al día por persona.';
    zona.innerHTML = `
      <div class="ya-jugado">
        <strong>Hoy ya has jugado${ultimo ? `: ${escapar(ultimo.nombre)}` : ''}</strong>
        <span class="tenue peque">Vuelve otro día y toca la placa: nueva jugada y un sello más.</span>
      </div>`;
    return;
  }
  $('#sub-juego').textContent = esRuleta
    ? 'Pulsa GIRAR y descubre tu premio. 1 jugada al día.'
    : 'Rasca con el dedo y descubre tu premio. 1 jugada al día.';
  if (esRuleta) pintarRuleta(zona); else pintarRasca(zona);
}

function pintarRasca(zona) {
  const indice = sortearPremio(cfg.premios);
  zona.innerHTML = `
    <div class="rasca" id="rasca">
      <div class="rasca-premio" aria-live="polite"><small>Has ganado</small><strong>${escapar(cfg.premios[indice].nombre)}</strong></div>
      <canvas aria-label="Zona para rascar. Pasa el dedo por encima." role="img"></canvas>
    </div>`;
  const caja = $('#rasca');
  const canvas = caja.querySelector('canvas');
  const premioEl = caja.querySelector('.rasca-premio');
  premioEl.style.visibility = 'hidden';
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w, h;

  function dibujarCapa() {
    const r = caja.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#D9D4CE'); g.addColorStop(0.5, '#F4F1EC'); g.addColorStop(1, '#BFB8AF');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#8A8178';
    for (let i = 0; i < 260; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#6B625B';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 22px Inter, system-ui, sans-serif';
    ctx.fillText('RASCA AQUÍ', w / 2, h / 2 - 8);
    ctx.font = '500 13px Inter, system-ui, sans-serif';
    ctx.fillText('con el dedo', w / 2, h / 2 + 18);
    premioEl.style.visibility = 'visible';
  }
  dibujarCapa();

  let rascando = false, ultimo = null, movs = 0, terminado = false;
  function punto(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function rascar(p) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 42; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo((ultimo || p).x, (ultimo || p).y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ultimo = p;
    if (++movs % 6 === 0) comprobar();
  }
  function comprobar() {
    const datos = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let total = 0, limpios = 0;
    const paso = 12 * dpr;
    for (let y = 0; y < canvas.height; y += paso) {
      for (let x = 0; x < canvas.width; x += paso) {
        total++;
        if (datos[(Math.floor(y) * canvas.width + Math.floor(x)) * 4 + 3] < 128) limpios++;
      }
    }
    if (!terminado && limpios / total > 0.5) {
      terminado = true;
      canvas.style.opacity = '0';
      canvas.style.pointerEvents = 'none';
      ganar(indice);
    }
  }
  canvas.addEventListener('pointerdown', (e) => { if (terminado) return; rascando = true; ultimo = null; canvas.setPointerCapture(e.pointerId); rascar(punto(e)); });
  canvas.addEventListener('pointermove', (e) => { if (rascando && !terminado) rascar(punto(e)); });
  const parar = () => { rascando = false; ultimo = null; };
  canvas.addEventListener('pointerup', parar);
  canvas.addEventListener('pointercancel', parar);
}

function mezclar(hex, conBlanco) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * conBlanco));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

// Parte un nombre largo en dos líneas por el espacio más centrado.
function partir(t) {
  if (t.length <= 12) return [t];
  const mitad = t.length / 2;
  let mejor = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === ' ' && (mejor < 0 || Math.abs(i - mitad) < Math.abs(mejor - mitad))) mejor = i;
  const l = mejor < 0 ? [t] : [t.slice(0, mejor), t.slice(mejor + 1)];
  return l.map((x) => (x.length > 14 ? x.slice(0, 13) + '…' : x));
}

function pintarRuleta(zona) {
  const premios = cfg.premios;
  const n = premios.length;
  const a = 360 / n;
  const R = 100;
  const tonos = [cfg.color, mezclar(cfg.color, 0.78), '#FFFFFF'];
  const segs = premios.map((p, i) => {
    const t0 = ((i * a - 90) * Math.PI) / 180;
    const t1 = (((i + 1) * a - 90) * Math.PI) / 180;
    const x0 = R + R * Math.cos(t0), y0 = R + R * Math.sin(t0);
    const x1 = R + R * Math.cos(t1), y1 = R + R * Math.sin(t1);
    let fondo = tonos[i % (n % 2 === 0 ? 2 : 3)];
    if (n % 3 === 1 && i === n - 1 && n > 1) fondo = tonos[1];
    const tinta = fondo === cfg.color ? tintaSobre(cfg.color) : '#1C1714';
    const centro = i * a + a / 2 - 90;
    // En la mitad izquierda se gira el texto 180° para que no quede boca abajo.
    const izq = ((centro % 360) + 360) % 360 > 90 && ((centro % 360) + 360) % 360 < 270;
    const lx = R + R * 0.62;
    const giroTexto = `rotate(${centro} ${R} ${R})${izq ? ` rotate(180 ${lx} ${R})` : ''}`;
    const lineas = partir(p.nombre);
    const tspans = lineas.map((l, k) => `<tspan x="${lx}" dy="${k === 0 ? (lineas.length - 1) * -5 : 10}">${escapar(l)}</tspan>`).join('');
    return `
      <path d="M${R},${R} L${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${a > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z" fill="${fondo}" stroke="#fff" stroke-width="1.5"/>
      <text transform="${giroTexto}" x="${lx}" y="${R}" fill="${tinta}" font-size="${lineas.some((l) => l.length > 11) ? 7.4 : 8.4}" font-weight="700" font-family="Inter, system-ui, sans-serif" text-anchor="middle" dominant-baseline="middle">${tspans}</text>`;
  }).join('');
  zona.innerHTML = `
    <div class="ruleta">
      <svg class="flecha" viewBox="0 0 30 36" aria-hidden="true"><path d="M15 34 3 6a12 12 0 1 1 24 0z" fill="#1C1714"/><circle cx="15" cy="11" r="4" fill="#fff"/></svg>
      <svg class="rueda" id="rueda" viewBox="-4 -4 208 208" role="img" aria-label="Ruleta de premios">
        <circle cx="100" cy="100" r="103" fill="#1C1714"/>
        ${segs}
      </svg>
      <button class="centro-btn" id="girar">GIRAR</button>
    </div>`;
  let giro = 0;
  $('#girar').addEventListener('click', (e) => {
    e.currentTarget.disabled = true;
    const indice = sortearPremio(premios);
    const jitter = (Math.random() - 0.5) * a * 0.6;
    const destino = 360 * 6 - (indice * a + a / 2) + jitter;
    giro = giro - (giro % 360) + destino;
    const rueda = $('#rueda');
    rueda.style.transform = `rotate(${giro}deg)`;
    const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => ganar(indice), reducido ? 100 : 4700);
  });
}

// ---------- Canjear (lo hace el camarero con su PIN) ----------
function abrirCanje(id) {
  const p = est.premios.find((x) => x.id === id);
  if (!p || p.canjeado) return;
  const temprano = hoy < p.validoDesde;
  abrirHoja(`
    <p class="tenue">Enséñale esta pantalla al camarero</p>
    <h3 id="hoja-titulo">${escapar(p.nombre)}</h3>
    <div class="codigo">${p.codigo}</div>
    <p class="tenue peque">Válido hasta el ${fechaCorta(p.caduca)} · un solo uso</p>
    ${temprano ? '<p class="peque tenue">Normalmente se canjea a partir de tu próxima visita. En la demo puedes probarlo ya.</p>' : ''}
    <form class="pin" id="form-pin" autocomplete="off">
      <input id="pin" inputmode="numeric" maxlength="4" placeholder="PIN" aria-label="PIN del personal" />
      <button class="boton" type="submit">Canjear</button>
    </form>
    <p class="peque tenue">Solo para el personal del local · PIN de la demo: ${PIN_DEMO}</p>
    <p class="error" id="error-pin" role="alert"></p>
  `);
  $('#form-pin').addEventListener('submit', (e) => {
    e.preventDefault();
    if ($('#pin').value !== PIN_DEMO) {
      $('#error-pin').textContent = 'PIN incorrecto.';
      $('#pin').select();
      return;
    }
    p.canjeado = hoy;
    guardarCliente(est);
    pintarPremios();
    $('#hoja-contenido').innerHTML = `
      <div class="ok">${ICONO_OK}</div>
      <h3 id="hoja-titulo">¡Canjeado!</h3>
      <p class="tenue">${escapar(p.nombre)} · código ${p.codigo}</p>
      <p class="peque tenue">El dueño lo ve al momento en su panel. Este código ya no se puede volver a usar.</p>
      <button class="boton sec" id="cerrar">Cerrar</button>`;
    $('#cerrar').addEventListener('click', cerrarHoja);
    celebrar();
  });
}

$('#lista-premios').addEventListener('click', (e) => {
  const b = e.target.closest('[data-canjear]');
  if (b) abrirCanje(b.dataset.canjear);
});

// ---------- Enlaces del local ----------
document.querySelector('.enlaces').addEventListener('click', (e) => {
  const b = e.target.closest('[data-accion]');
  if (!b) return;
  const acc = b.dataset.accion;
  if (acc === 'carta') toast('Aquí se abre la carta del local');
  if (acc === 'instagram') toast('Aquí se abre el Instagram del local');
  if (acc === 'resena') {
    est.resenas = (est.resenas || 0) + 1;
    guardarCliente(est);
    toast('Aquí se abre la ficha de Google para dejar la reseña');
  }
  if (acc === 'wifi') {
    abrirHoja(`
      <h3 id="hoja-titulo">WiFi gratis</h3>
      <div class="dato"><span>Red</span><strong>${escapar(cfg.wifi.red)}</strong></div>
      <div class="dato"><span>Contraseña</span><strong>${escapar(cfg.wifi.clave)}</strong></div>
      <button class="boton" id="copiar">Copiar contraseña</button>
      <p class="peque tenue">Con la placa NFC de WiFi el móvil se conecta solo, sin teclear nada.</p>`);
    $('#copiar').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(cfg.wifi.clave); toast('Contraseña copiada'); } catch { toast(cfg.wifi.clave); }
    });
  }
});

// ---------- Controles de la demo ----------
document.querySelector('.demo').addEventListener('click', (e) => {
  const b = e.target.closest('[data-demo]');
  if (!b) return;
  const acc = b.dataset.demo;
  if (acc === 'jugar') {
    est.jugadas = est.jugadas.filter((d) => d !== hoy);
    guardarCliente(est);
    pintarJuego(true);
    $('#titulo-juego').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (acc === 'visita') {
    const premio = registrarVisita(true);
    pintarSellos(true);
    pintarPremios();
    if (premio) { celebrar(); toast(`¡${cfg.sellos} visitas! Premio guardado: ${cfg.premioSellos}`); }
    else toast('Nueva visita: +1 sello');
  }
  if (acc === 'reiniciar') {
    reiniciarCliente();
    location.reload();
  }
});

// ---------- Arranque ----------
if (window.self !== window.top) document.body.classList.add('en-vista'); // dentro del móvil de la página del comercial
aplicarTema();
const premioPorVisitas = registrarVisita();
pintarSellos(true);
pintarPremios();
pintarJuego();
if (premioPorVisitas) setTimeout(() => toast(`¡${cfg.sellos} visitas! Tienes premio: ${cfg.premioSellos}`), 600);
