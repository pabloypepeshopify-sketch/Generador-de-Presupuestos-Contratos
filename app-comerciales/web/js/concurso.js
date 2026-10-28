// Concurso del mes entre comerciales: 1 punto por cita hecha y 7 por venta.
import { html, useMemo, useState } from './preact.js';
import { perfil, useStore } from './datos.js';
import { Avatar, Chips } from './ui.js';

export const PUNTOS_CITA = 1;
export const PUNTOS_VENTA = 7;
export const PREMIO = '100 €';

// Una cita cuenta cuando se apunta su visita y se habló con el dueño en persona.
// La base de datos enlaza cada visita con su cita y guarda quién la consiguió.
export const esCitaHecha = (ll) => ll.tipo === 'visita' && ll.contacto === 'dueno' && !!ll.cita_conseguida_por;

// La venta es de quien la apunta; si la apunta un socio, del comercial que consiguió la cita o lleva el local.
export function vendedor(ll, locales) {
  if (perfil(ll.comercial_id)?.rol === 'comercial') return ll.comercial_id;
  return ll.cita_conseguida_por || locales.find((l) => l.id === ll.local_id)?.comercial_id || null;
}

// Puntos que genera una llamada o visita: [{ id, tipo: 'cita' | 'venta', puntos }]
export function puntosDe(ll, locales) {
  const r = [];
  if (esCitaHecha(ll)) r.push({ id: ll.cita_conseguida_por, tipo: 'cita', puntos: PUNTOS_CITA });
  if (ll.resultado === 'vendido') {
    const v = vendedor(ll, locales);
    if (v) r.push({ id: v, tipo: 'venta', puntos: PUNTOS_VENTA });
  }
  return r;
}

export function mes(desplazamiento = 0) {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() + desplazamiento, 1);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + desplazamiento + 1, 1);
  return { desde, hasta, nombre: desde.toLocaleDateString('es-ES', { month: 'long' }) };
}

// Citas conseguidas que aún esperan su visita (puntos por ganar), por comercial.
function citasPorHacer(s) {
  const r = new Map();
  for (const l of s.locales) {
    if (l.estado !== 'cita') continue;
    const origen = s.llamadas.find((x) => x.local_id === l.id && x.resultado === 'cita'); // la más reciente
    const quien = !origen ? null : origen.tipo === 'llamada' ? origen.comercial_id : origen.contacto !== 'dueno' ? origen.cita_conseguida_por : null;
    if (quien) r.set(quien, (r.get(quien) || 0) + 1);
  }
  return r;
}

export function clasificacion(s, { desde, hasta }) {
  const filas = new Map(s.perfiles.filter((p) => p.rol === 'comercial').map((p) => [p.id, { p, citas: 0, ventas: 0, puntos: 0, porHacer: 0 }]));
  const ini = desde.getTime();
  const fin = hasta.getTime();
  for (const ll of s.llamadas) {
    const t = Date.parse(ll.creado_en);
    if (t < ini || t >= fin) continue;
    for (const pt of puntosDe(ll, s.locales)) {
      const f = filas.get(pt.id);
      if (!f) continue; // los socios no compiten
      f.puntos += pt.puntos;
      if (pt.tipo === 'cita') f.citas++;
      else f.ventas++;
    }
  }
  if (Date.now() < fin) for (const [id, n] of citasPorHacer(s)) if (filas.has(id)) filas.get(id).porHacer = n;
  return [...filas.values()]
    .filter((f) => f.p.activo || f.puntos)
    .sort((a, b) => b.puntos - a.puntos || b.ventas - a.ventas || a.p.nombre.localeCompare(b.p.nombre, 'es'));
}

const ptos = (n) => `${n} ${n === 1 ? 'punto' : 'puntos'}`;

function Fila({ f, pos, lider, yo }) {
  return html`<li class=${`podio-fila ${lider ? 'lider' : ''} ${yo ? 'yo' : ''}`}>
    <span class="podio-pos">${lider ? '👑' : `${pos}º`}</span>
    <${Avatar} p=${f.p} t=${34} />
    <div class="podio-nombre"><b>${f.p.nombre}${yo ? ' (tú)' : ''}</b>
      <small>${f.citas} ${f.citas === 1 ? 'cita hecha' : 'citas hechas'} · ${f.ventas} ${f.ventas === 1 ? 'venta' : 'ventas'}${f.porHacer ? ` · ${f.porHacer} por visitar` : ''}</small></div>
    <span class="podio-puntos"><b>${f.puntos}</b><small>${f.puntos === 1 ? 'punto' : 'puntos'}</small></span>
  </li>`;
}

// Tarjeta resumida para Inicio
export function TarjetaConcurso() {
  const s = useStore();
  const m = mes(0);
  const filas = useMemo(() => clasificacion(s, m), [s.llamadas, s.locales, s.perfiles]);
  if (!filas.length) return null;
  const miPos = filas.findIndex((f) => f.p.id === s.yo.id);
  const dias = Math.ceil((m.hasta - Date.now()) / 864e5);
  return html`<a class="concurso compacto" href="#/equipo">
    <div class="concurso-cab">
      <div><span class="concurso-etq">🏆 Concurso de ${m.nombre}</span>
        <b>${PREMIO} <em class="acento">al primero</em></b></div>
      <small>${dias === 1 ? 'Último día' : `Quedan ${dias} días`}</small>
    </div>
    <ol class="podio">${filas.slice(0, 3).map((f, i) => html`<${Fila} f=${f} pos=${i + 1} lider=${i === 0 && f.puntos > 0} yo=${f.p.id === s.yo.id} key=${f.p.id} />`)}</ol>
    ${miPos > 2 ? html`<p class="concurso-yo">Vas ${miPos + 1}º con ${ptos(filas[miPos].puntos)}.</p>` : null}
  </a>`;
}

// Sección completa para la pestaña Equipo
export function SeccionConcurso() {
  const s = useStore();
  const [desp, setDesp] = useState(0);
  const m = mes(desp);
  const filas = useMemo(() => clasificacion(s, m), [s.llamadas, s.locales, s.perfiles, desp]);
  const dias = Math.ceil((m.hasta - Date.now()) / 864e5);
  const ganador = desp < 0 && filas[0]?.puntos ? filas[0] : null;
  return html`<section class="concurso">
    <div class="concurso-cab">
      <div><span class="concurso-etq">🏆 Concurso de ${m.nombre}</span>
        <b>${PREMIO} <em class="acento">al primero</em></b></div>
      <small>${desp ? 'Terminado' : dias === 1 ? 'Último día' : `Quedan ${dias} días`}</small>
    </div>
    <${Chips} valor=${desp} onCambio=${(v) => v !== null && setDesp(v)} opciones=${[{ v: 0, txt: 'Este mes' }, { v: -1, txt: 'Mes pasado' }]} />
    ${ganador ? html`<p class="concurso-ganador">Ganó <b>${ganador.p.nombre}</b> con ${ptos(ganador.puntos)}.</p>` : null}
    <ol class="podio">${filas.map((f, i) => html`<${Fila} f=${f} pos=${i + 1} lider=${i === 0 && f.puntos > 0} yo=${f.p.id === s.yo.id} key=${f.p.id} />`)}</ol>
    <details class="reglas"><summary>Cómo se cuentan los puntos</summary>
      <ul>
        <li><b>+${PUNTOS_CITA} punto por cita hecha:</b> cuenta cuando se apunta la visita a esa cita y se habló con el dueño en persona. El punto es para quien consiguió la cita, aunque vaya otro.</li>
        <li><b>+${PUNTOS_VENTA} puntos por venta:</b> para quien la apunta (en visita o por teléfono). Si la apunta un socio, para el comercial de esa cita o local.</li>
        <li>La app reconoce sola de qué cita es cada visita. Las visitas sin cita (puerta fría) solo puntúan si hay venta.</li>
        <li>Cuenta el mes en que se apunta la visita o la venta. Empate: gana quien tenga más ventas. Los socios no compiten.</li>
      </ul>
    </details>
  </section>`;
}
