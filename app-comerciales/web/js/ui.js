// Navegación, iconos y componentes reutilizables.
import { html, useEffect, useState } from './preact.js';
import { actualizar, perfil, store, useStore } from './datos.js';
import {
  ESTADOS, INTERES, fechaRelativa, haceCuanto, hora, iniciales, telHref,
} from './util.js';

// ---------- Rutas (#/locales, #/local/<id>...) ----------
export function leerRuta() {
  const [ruta, q = ''] = (location.hash.replace(/^#/, '') || '/').split('?');
  return { ruta: ruta || '/', partes: ruta.split('/').filter(Boolean), query: Object.fromEntries(new URLSearchParams(q)) };
}

export function useRuta() {
  const [r, setR] = useState(leerRuta);
  useEffect(() => {
    const f = () => {
      setR(leerRuta());
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return r;
}

let pasos = 0;
export function ir(ruta, { reemplazar = false } = {}) {
  if (reemplazar) location.replace(`#${ruta}`);
  else {
    pasos++;
    location.hash = ruta;
  }
}
export function volver(porDefecto = '/') {
  if (pasos > 0) {
    pasos--;
    history.back();
  } else ir(porDefecto, { reemplazar: true });
}

// ---------- Avisos ----------
export function aviso(texto, tipo = 'ok') {
  const id = Date.now();
  actualizar({ aviso: { id, texto, tipo } });
  setTimeout(() => store.aviso?.id === id && actualizar({ aviso: null }), 3000);
}

export function Aviso() {
  const s = useStore();
  if (!s.aviso) return null;
  return html`<div class="aviso ${s.aviso.tipo}" role="status" key=${s.aviso.id}>${s.aviso.texto}</div>`;
}

// ---------- Iconos (trazos estilo Lucide) ----------
const RUTAS = {
  inicio: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  locales: '<path d="M4 9.5 5.5 4h13L20 9.5M4 9.5V20h16V9.5M4 9.5c0 1.4 1.1 2.5 2.5 2.5S9 10.9 9 9.5c0 1.4 1.1 2.5 2.5 2.5h1c1.4 0 2.5-1.1 2.5-2.5 0 1.4 1.1 2.5 2.5 2.5S20 10.9 20 9.5M10 20v-4h4v4"/>',
  agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  equipo: '<path d="M3 20h18M6 16v-5M11 16V6M16 16v-8M21 16v-3"/>',
  tel: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  mapa: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  atras: '<path d="M15 18l-6-6 6-6"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  editar: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  papelera: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5z"/>',
  catalogo: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  usuarios: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a7 7 0 0 1 4 6.5"/>',
  salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  descargar: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  subir: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  flecha: '<path d="m9 6 6 6-6 6"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  externo: '<path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  aviso: '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  euro: '<path d="M18 7a7 7 0 1 0 0 10M4 10h10M4 14h10"/>',
};

export function Icono({ n, t = 20 }) {
  return html`<svg class="ico" width=${t} height=${t} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: RUTAS[n] }}></svg>`;
}

// ---------- Componentes ----------
export function Insignia({ estado }) {
  const e = ESTADOS[estado] || ESTADOS.pendiente;
  return html`<span class="insignia" style=${`--c:${e.color}`}><i></i>${e.txt}</span>`;
}

export function Interes({ n, conTexto }) {
  if (!n) return null;
  return html`<span class="interes" title=${`Interés: ${INTERES[n]}`}>
    ${[1, 2, 3].map((i) => html`<i class=${i <= n ? 'on' : ''}></i>`)}${conTexto ? html`<span>${INTERES[n]}</span>` : null}
  </span>`;
}

export function Avatar({ id, p, t = 28 }) {
  const per = p || perfil(id) || { nombre: '?', color: '#4B5066' };
  return html`<span class="avatar" title=${per.nombre} style=${`--c:${per.color};width:${t}px;height:${t}px;font-size:${Math.round(t * 0.4)}px`}>${iniciales(per.nombre)}</span>`;
}

export const nombreDe = (id) => perfil(id)?.nombre || '—';

// acento: parte final del título en cursiva con degradado, como en visaxnfc.es
export function Cabecera({ titulo, acento, sub, atras, children }) {
  return html`<header class="cab">
    ${atras ? html`<button class="icono-btn" onClick=${() => volver(atras)} aria-label="Volver"><${Icono} n="atras" t=${22} /></button>` : null}
    <div class="cab-tit"><h1>${titulo}${acento ? html` <em class="acento">${acento}</em>` : null}</h1>${sub ? html`<p>${sub}</p>` : null}</div>
    <div class="cab-acc">${children}</div>
  </header>`;
}

// opciones: [{ v, txt, color?, ico? }]
export function Chips({ opciones, valor, onCambio, multi = false, grande = false }) {
  const activo = (v) => (multi ? (valor || []).includes(v) : valor === v);
  const pulsar = (v) => {
    if (!multi) return onCambio(valor === v ? null : v);
    const lista = valor || [];
    onCambio(lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  };
  return html`<div class="chips ${grande ? 'grande' : ''}" role=${multi ? 'group' : 'radiogroup'}>
    ${opciones.map((o) => html`<button type="button" class="chip ${activo(o.v) ? 'on' : ''}" aria-pressed=${activo(o.v)}
        style=${o.color ? `--c:${o.color}` : ''} onClick=${() => pulsar(o.v)}>
      ${o.ico ? html`<span class="chip-ico">${o.ico}</span>` : null}<span>${o.txt}</span>${o.sub ? html`<small>${o.sub}</small>` : null}
    </button>`)}
  </div>`;
}

export function Campo({ etiqueta, ayuda, children }) {
  return html`<label class="campo"><span class="campo-et">${etiqueta}</span>${children}${ayuda ? html`<small class="ayuda">${ayuda}</small>` : null}</label>`;
}

export function Grupo({ titulo, children }) {
  return html`<fieldset class="grupo"><legend>${titulo}</legend>${children}</fieldset>`;
}

export function Seccion({ titulo, enlace, txtEnlace = 'Ver todo', children }) {
  return html`<section class="seccion">
    <div class="seccion-cab"><h2>${titulo}</h2>${enlace ? html`<a href=${`#${enlace}`} onClick=${() => pasos++}>${txtEnlace}</a>` : null}</div>
    ${children}
  </section>`;
}

export function Vacio({ titulo, texto, children }) {
  return html`<div class="vacio"><b>${titulo}</b>${texto ? html`<p>${texto}</p>` : null}${children}</div>`;
}

export function BotonTel({ tel, peque }) {
  if (!tel) return null;
  return html`<a class="btn-tel ${peque ? 'peque' : ''}" href=${telHref(tel)} aria-label=${`Llamar al ${tel}`} onClick=${(e) => e.stopPropagation()}>
    <${Icono} n="tel" t=${peque ? 16 : 18} />
  </a>`;
}

// Tarjeta de local para listas
export function TarjetaLocal({ l, mostrar = 'auto' }) {
  const verCita = l.estado === 'cita' && l.cita_fecha;
  const verRellamar = l.estado === 'rellamar' && (l.rellamar_fecha || mostrar === 'rellamar');
  return html`<article class="tarjeta-local" onClick=${() => ir(`/local/${l.id}`)} tabindex="0"
      onKeyDown=${(e) => e.key === 'Enter' && ir(`/local/${l.id}`)}>
    <div class="tl-main">
      <div class="tl-fila1"><b class="tl-nombre">${l.nombre}</b><${Interes} n=${l.interes} /></div>
      <div class="tl-fila2"><${Insignia} estado=${l.estado} />${l.zona ? html`<span>${l.zona}</span>` : null}${l.tipo ? html`<span>${l.tipo}</span>` : null}</div>
      ${verCita ? html`<div class="tl-dato cita"><${Icono} n="agenda" t=${15} /> ${fechaRelativa(l.cita_fecha)}${l.cita_hora ? ` · ${hora(l.cita_hora)}` : ''} · va ${nombreDe(l.cita_comercial_id)}</div>` : null}
      ${verRellamar ? html`<div class="tl-dato rellamar"><${Icono} n="reloj" t=${15} /> Llamar ${l.rellamar_fecha ? fechaRelativa(l.rellamar_fecha).toLowerCase() : 'otra vez'}${l.rellamar_hora ? ` · ${hora(l.rellamar_hora)}` : ''}</div>` : null}
      ${l.dueno_nombre ? html`<div class="tl-dato">Dueño: <b>${l.dueno_nombre}</b>${l.hablado_con_dueno ? ' · ya habló con él' : ''}</div>` : null}
      <div class="tl-pie">
        ${l.ultima_llamada_en
          ? html`<${Avatar} id=${l.ultimo_comercial_id} t=${18} /><span>${haceCuanto(l.ultima_llamada_en)} · ${l.num_llamadas} ${l.num_llamadas === 1 ? 'llamada' : 'llamadas'}</span>`
          : html`<span>Sin llamar todavía</span>`}
      </div>
    </div>
    <${BotonTel} tel=${l.dueno_telefono || l.telefono} />
  </article>`;
}

export function Cargando({ texto = 'Cargando…' }) {
  return html`<div class="cargando"><img class="cargando-marca" src="/marca.svg" alt="" /><p>${texto}</p></div>`;
}
