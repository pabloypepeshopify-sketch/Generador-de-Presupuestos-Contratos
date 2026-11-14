// VISAX Juega · panel del dueño. Datos de ejemplo (fijos para cada nombre de local)
// sumados a lo que se haya jugado de verdad en este móvil.
import {
  cargarConfig, guardarConfig, cargarCliente, guardarCliente, hoyISO, sumarDias, fechaCorta,
  escapar, toast, COLORES, enlace,
} from './comun.js';

const $ = (s) => document.querySelector(s);
let cfg = cargarConfig();
let est = cargarCliente();
const hoy = hoyISO();
const DIAS = 30;
const fmt = new Intl.NumberFormat('es-ES');
const fmtEur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// ---------- Datos de ejemplo deterministas ----------
function semilla(texto) {
  let h = 2166136261;
  for (const ch of texto) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function azar(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simular() {
  const r = azar(semilla(cfg.nombre.toLowerCase()));
  const base = 16 + r() * 14;
  const porDia = { 0: 1.3, 1: 0.75, 2: 0.85, 3: 0.9, 4: 1.05, 5: 1.4, 6: 1.65 };
  const dias = [];
  for (let i = DIAS - 1; i >= 0; i--) {
    const fecha = sumarDias(hoy, -i);
    const dow = new Date(fecha + 'T12:00:00').getDay();
    const tendencia = 0.78 + 0.42 * ((DIAS - 1 - i) / (DIAS - 1)); // crece desde que se instalan las placas
    let toques = Math.round(base * porDia[dow] * tendencia * (0.85 + r() * 0.3));
    if (i === 0) toques = Math.round(toques * Math.min(1, 0.35 + new Date().getHours() / 24)); // hoy va por la mitad
    dias.push({ fecha, toques });
  }
  const toques = dias.reduce((s, d) => s + d.toques, 0);
  const jugadas = Math.round(toques * (0.79 + r() * 0.06));
  const canjes = Math.round(jugadas * (0.34 + r() * 0.07));
  const resenas = Math.round(toques * (0.06 + r() * 0.03));
  const repiten = Math.round(31 + r() * 11);
  const prev = Math.round(toques * (0.72 + r() * 0.1)); // 30 días anteriores
  return { dias, toques, jugadas, canjes, resenas, repiten, prev, r };
}

let datos;
function calcular() {
  datos = simular();
  // Lo jugado de verdad en este móvil
  const propiasHoy = est.visitas.filter((d) => d === hoy).length;
  datos.dias[DIAS - 1].toques += propiasHoy;
  datos.toques += est.visitas.length;
  datos.jugadas += est.jugadas.length;
  datos.canjes += est.premios.filter((p) => p.canjeado).length;
  datos.resenas += est.resenas || 0;
}

// ---------- KPIs ----------
function pintarKpis() {
  const ticket = Number(cfg.ticket) || 14;
  const crec = Math.round(((datos.toques - datos.prev) / datos.prev) * 100);
  const kpis = [
    { t: 'Toques en las placas', v: fmt.format(datos.toques), n: `<b>+${crec}%</b> vs. 30 días antes` },
    { t: 'Partidas jugadas', v: fmt.format(datos.jugadas), n: `${Math.round((datos.jugadas / datos.toques) * 100)}% de los que tocan, juegan` },
    { t: 'Clientes que repiten', v: `${datos.repiten}%`, n: 'han vuelto al menos una vez' },
    { t: 'Premios canjeados', v: fmt.format(datos.canjes), n: 'cada canje es una visita de vuelta' },
    { t: 'Clics en reseña de Google', v: fmt.format(datos.resenas), n: 'voluntarias, sin premio a cambio' },
    { t: 'Ventas de esas visitas', v: fmtEur.format(datos.canjes * ticket), n: `estimado · ${fmtEur.format(ticket)} de ticket medio`, d: true },
  ];
  $('#kpis').innerHTML = kpis.map((k) => `
    <div class="kpi${k.d ? ' destacado' : ''}">
      <span class="k-titulo">${k.t}</span>
      <span class="k-valor">${k.v}</span>
      <span class="k-nota">${k.n}</span>
    </div>`).join('');
}

// ---------- Gráfico de barras (una serie) ----------
function pintarGrafico() {
  const cont = $('#grafico');
  const W = Math.max(280, cont.clientWidth);
  const H = cont.clientHeight;
  const m = { t: 8, r: 4, b: 24, l: 30 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = Math.max(...datos.dias.map((d) => d.toques));
  const paso = max > 60 ? 20 : max > 30 ? 10 : 5;
  const tope = Math.ceil(max / paso) * paso;
  const y = (v) => m.t + ih - (v / tope) * ih;
  const bw = iw / DIAS;
  const gap = 2;
  const ancho = Math.max(2, bw - gap);
  let rejilla = '';
  for (let v = 0; v <= tope; v += paso) {
    rejilla += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`;
    rejilla += `<text x="${m.l - 8}" y="${y(v)}" text-anchor="end" dominant-baseline="middle">${v}</text>`;
  }
  let barras = '', etiquetas = '';
  datos.dias.forEach((d, i) => {
    const x = m.l + i * bw + gap / 2;
    const top = y(d.toques);
    const alto = m.t + ih - top;
    const rr = Math.min(4, ancho / 2, alto);
    const path = alto <= 0 ? '' : `M${x},${m.t + ih} V${top + rr} Q${x},${top} ${x + rr},${top} H${x + ancho - rr} Q${x + ancho},${top} ${x + ancho},${top + rr} V${m.t + ih} Z`;
    barras += `<rect class="hit" data-i="${i}" x="${m.l + i * bw}" y="${m.t}" width="${bw}" height="${ih}"/><path class="barra-d" data-b="${i}" d="${path}"/>`;
    if (i % 7 === (DIAS - 1) % 7) etiquetas += `<text x="${x + ancho / 2}" y="${H - 6}" text-anchor="middle">${i === DIAS - 1 ? 'Hoy' : fechaCorta(d.fecha)}</text>`;
  });
  cont.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Toques por día en los últimos 30 días">
    <g class="rejilla eje">${rejilla}</g><g>${barras}</g><g class="eje">${etiquetas}</g></svg>`;
  $('#total-grafico').textContent = `${fmt.format(datos.toques)} toques`;

  const tip = $('#tooltip');
  cont.querySelectorAll('.hit').forEach((h) => {
    h.addEventListener('pointerenter', () => {
      const i = Number(h.dataset.i);
      const d = datos.dias[i];
      const b = cont.querySelector(`[data-b="${i}"]`);
      cont.querySelectorAll('.barra-d.activa').forEach((x) => x.classList.remove('activa'));
      b.classList.add('activa');
      const fecha = new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      tip.innerHTML = `${fecha}<br><b>${d.toques}</b> toques`;
      const r = h.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      tip.style.left = `${Math.min(window.innerWidth - 60, Math.max(60, r.left + r.width / 2))}px`;
      tip.style.top = `${br.top || r.bottom - 20}px`;
      tip.hidden = false;
    });
    h.addEventListener('pointerleave', () => {
      tip.hidden = true;
      cont.querySelectorAll('.barra-d.activa').forEach((x) => x.classList.remove('activa'));
    });
  });

  $('#tabla').innerHTML = `<table><thead><tr><th>Día</th><th>Toques</th></tr></thead><tbody>${
    datos.dias.slice().reverse().map((d) => `<tr><td>${fechaCorta(d.fecha)}</td><td>${d.toques}</td></tr>`).join('')}</tbody></table>`;
}

// ---------- Premios entregados ----------
function pintarPremios() {
  const total = cfg.premios.reduce((s, p) => s + (Number(p.peso) || 0), 0) || 1;
  const filas = cfg.premios.map((p) => {
    let v = Math.round((datos.jugadas * (Number(p.peso) || 0)) / total);
    v += est.premios.filter((x) => x.nombre === p.nombre && x.origen !== `Por tus ${cfg.sellos} visitas`).length;
    return { nombre: p.nombre, v };
  }).sort((a, b) => b.v - a.v);
  const max = Math.max(1, ...filas.map((f) => f.v));
  $('#barras-premios').innerHTML = filas.map((f) => `
    <div class="barra-premio">
      <span>${escapar(f.nombre)}</span>
      <div class="pista"><div class="relleno" style="width:${(f.v / max) * 100}%"></div></div>
      <span class="valor">${fmt.format(f.v)}</span>
    </div>`).join('') + `<p class="peque flojo" style="margin-top:10px">Además: ${Math.max(1, Math.round(datos.canjes / 9))} clientes han llenado su tarjeta de ${cfg.sellos} visitas (${escapar(cfg.premioSellos)}).</p>`;
}

// ---------- Actividad ----------
function pintarActividad() {
  const r = azar(semilla(cfg.nombre + hoy));
  const ahora = new Date();
  const ev = [];
  // Lo de este móvil, primero
  est.premios.filter((p) => p.canjeado === hoy).forEach((p) => ev.push({ min: ahora.getHours() * 60 + ahora.getMinutes(), t: `Canjeado ${p.codigo} · ${escapar(p.nombre)}`, tuyo: true }));
  est.premios.filter((p) => p.fecha === hoy).forEach((p) => ev.push({ min: ahora.getHours() * 60 + ahora.getMinutes(), t: `Ganó ${escapar(p.nombre)}`, tuyo: true }));
  const minFin = Math.max(10 * 60, ahora.getHours() * 60 + ahora.getMinutes() - 3);
  const nombres = cfg.premios.map((p) => p.nombre);
  for (let i = 0; i < 9; i++) {
    const min = Math.round(minFin - i * (14 + r() * 26));
    const mesa = 1 + Math.floor(r() * 12);
    const tipo = r();
    const premio = nombres[Math.floor(r() * nombres.length)];
    let t;
    if (tipo < 0.5) t = `Mesa ${mesa} · ganó ${escapar(premio)}`;
    else if (tipo < 0.75) t = `Canjeado VX-${Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(r() * 32)]).join('')} · ${escapar(premio)}`;
    else if (tipo < 0.88) t = `Mesa ${mesa} · cliente que repite (${2 + Math.floor(r() * 4)}ª visita)`;
    else t = `Mesa ${mesa} · clic en reseña de Google`;
    ev.push({ min, t });
  }
  ev.sort((a, b) => b.min - a.min);
  const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  $('#actividad').innerHTML = ev.map((e) => `<li><time>${hhmm(e.min)}</time><span>${e.t}${e.tuyo ? ' <span class="tuyo">· este móvil</span>' : ''}</span></li>`).join('');
}

// ---------- Canjear por código ----------
$('#codigo').addEventListener('input', (e) => {
  let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (v.startsWith('VX')) v = v.slice(2);
  e.target.value = v ? 'VX-' + v.slice(0, 4) : '';
});
$('#form-canje').addEventListener('submit', (e) => {
  e.preventDefault();
  est = cargarCliente();
  const codigo = $('#codigo').value.trim();
  const res = $('#resultado-canje');
  const p = est.premios.find((x) => x.codigo === codigo);
  res.className = 'peque';
  if (!/^VX-[A-Z0-9]{4}$/.test(codigo)) { res.textContent = 'Escribe el código completo, por ejemplo VX-7KQ2.'; res.classList.add('mal'); return; }
  if (!p) { res.textContent = 'Ese código no existe. En la demo, juega primero en «Ver como cliente» desde este mismo móvil.'; res.classList.add('mal'); return; }
  if (p.canjeado) { res.textContent = `Ya se canjeó el ${fechaCorta(p.canjeado)}. No se puede usar dos veces.`; res.classList.add('mal'); return; }
  p.canjeado = hoy;
  guardarCliente(est);
  res.textContent = `✓ Canjeado: ${p.nombre}. Visita de vuelta apuntada.`;
  res.classList.add('ok');
  $('#codigo').value = '';
  refrescar();
});

// ---------- Configuración ----------
function pintarConfig() {
  $('#cfg-nombre').value = cfg.nombre;
  $('#cfg-sellos').value = cfg.sellos;
  $('#cfg-premio-sellos').value = cfg.premioSellos;
  $('#cfg-ticket').value = cfg.ticket ?? 14;
  $('#cfg-juego').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === cfg.juego)));
  const colores = COLORES.includes(cfg.color) ? COLORES : [...COLORES, cfg.color];
  $('#cfg-colores').innerHTML = colores.map((c) => `<button type="button" data-c="${c}" style="background:${c}" aria-label="Color ${c}" aria-pressed="${c === cfg.color}"></button>`).join('');
  pintarFilasPremios();
}
function pintarFilasPremios() {
  $('#cfg-premios').innerHTML = cfg.premios.map((p, i) => `
    <div class="fila-premio">
      <input class="entrada" data-n="${i}" value="${escapar(p.nombre)}" maxlength="28" aria-label="Premio ${i + 1}">
      <div class="pct"><input class="entrada" data-p="${i}" type="number" min="0" max="100" value="${p.peso}" aria-label="Probabilidad premio ${i + 1}"></div>
      <button type="button" class="quitar" data-q="${i}" aria-label="Quitar premio" ${cfg.premios.length <= 2 ? 'disabled' : ''}>×</button>
    </div>`).join('');
  sumaPesos();
}
function sumaPesos() {
  const s = cfg.premios.reduce((a, p) => a + (Number(p.peso) || 0), 0);
  $('#suma-pesos').textContent = s === 100 ? 'Suma 100% ✓' : `Suma ${s}% (se reparte en proporción)`;
}
$('#cfg-premios').addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.n) cfg.premios[t.dataset.n].nombre = t.value;
  if (t.dataset.p) { cfg.premios[t.dataset.p].peso = Math.max(0, Number(t.value) || 0); sumaPesos(); }
});
$('#cfg-premios').addEventListener('click', (e) => {
  const q = e.target.closest('[data-q]');
  if (q && cfg.premios.length > 2) { cfg.premios.splice(Number(q.dataset.q), 1); pintarFilasPremios(); }
});
$('#anadir-premio').addEventListener('click', () => {
  if (cfg.premios.length >= 8) return toast('Máximo 8 premios');
  cfg.premios.push({ nombre: 'Nuevo premio', peso: 10 });
  pintarFilasPremios();
  $(`[data-n="${cfg.premios.length - 1}"]`).select();
});
$('#cfg-juego').addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  cfg.juego = b.dataset.v;
  $('#cfg-juego').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
});
$('#cfg-colores').addEventListener('click', (e) => {
  const b = e.target.closest('[data-c]');
  if (!b) return;
  cfg.color = b.dataset.c;
  $('#cfg-colores').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
});
$('#form-config').addEventListener('submit', (e) => {
  e.preventDefault();
  const premios = cfg.premios.map((p) => ({ nombre: p.nombre.trim(), peso: p.peso })).filter((p) => p.nombre);
  if (premios.length < 2) return toast('Pon al menos 2 premios');
  if (!premios.some((p) => p.peso > 0)) return toast('Algún premio tiene que tener probabilidad');
  cfg = {
    ...cfg,
    nombre: $('#cfg-nombre').value.trim() || cfg.nombre,
    sellos: Math.min(10, Math.max(3, Number($('#cfg-sellos').value) || 5)),
    premioSellos: $('#cfg-premio-sellos').value.trim() || cfg.premioSellos,
    ticket: Math.max(1, Number($('#cfg-ticket').value) || 14),
    premios,
    premiosPropios: true,
  };
  guardarConfig(cfg);
  toast('Guardado. Ya se ve en la página del cliente.');
  refrescar();
});

// ---------- Arranque ----------
function refrescar() {
  est = cargarCliente();
  $('#titulo-local').textContent = cfg.nombre;
  document.title = `${cfg.nombre} · Panel VISAX Juega`;
  $('#ver-cliente').href = enlace('cliente.html', cfg);
  calcular();
  pintarKpis();
  pintarGrafico();
  pintarPremios();
  pintarActividad();
  pintarConfig();
}
refrescar();
let rt;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(pintarGrafico, 120); });
// Si se juega en otra pestaña (p. ej. la vista previa), el panel se actualiza solo.
window.addEventListener('storage', () => { cfg = cargarConfig(); refrescar(); });
