#!/usr/bin/env node
// Genera la web premium + carta con pedidos de un bar a partir de su bar.config.mjs.
//
//   node herramientas/web-bar.mjs --nuevo <slug>        crea clientes/<slug>/ desde la plantilla
//   node herramientas/web-bar.mjs clientes/<slug>       genera clientes/<slug>/publicar/
//
// Lo publicado es estático (sin build en Netlify): index.html (web), carta.html (carta con pedidos),
// aviso-legal.html, privacidad.html, robots.txt, sitemap.xml, _headers, netlify.toml e img/.
// Fotos: si está instalado sharp (cd herramientas && npm install) se reducen a WebP 800/1600 px.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLANTILLA = path.join(RAIZ, 'clientes/_plantilla');
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_TXT = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_SCHEMA = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const avisos = [];
const avisa = (m) => avisos.push(m);
const falla = (m) => { console.error('✗ ' + m); process.exit(1); };

// ───────────────────────────────────────────────────────────── utilidades
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (r) => '#' + r.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
const mezcla = (a, b, t) => rgb2hex(hex2rgb(a).map((x, i) => x * t + hex2rgb(b)[i] * (1 - t))); // t = peso de a
const rgba = (h, a) => `rgba(${hex2rgb(h).join(',')},${a})`;
function luminancia(h) {
  return hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
}
export function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const telHref = (t) => 'tel:' + String(t).replace(/[^\d+]/g, '');
const waHref = (t) => 'https://wa.me/' + String(t).replace(/\D/g, '');

// ───────────────────────────────────────────────────────────── tema
export function tema(c) {
  const k = c.colores || {};
  for (const n of ['fondo', 'texto', 'oscuro', 'acento', 'textoAcento']) {
    if (!/^#[0-9a-fA-F]{6}$/.test(k[n] || '')) falla(`colores.${n} debe ser un color #RRGGBB`);
  }
  const claro = luminancia(k.fondo) > 0.2;
  let suave = mezcla(k.texto, k.fondo, 0.68);
  for (let t = 0.68; contraste(suave, k.fondo) < 4.6 && t < 1; t += 0.04) suave = mezcla(k.texto, k.fondo, Math.min(1, t));
  const sobreOscuro = contraste(k.fondo, k.oscuro) >= 4.5 ? k.fondo : (contraste('#ffffff', k.oscuro) >= contraste('#111111', k.oscuro) ? '#ffffff' : '#111111');
  let acentoOscuro = k.acento;
  for (let t = 1; contraste(acentoOscuro, k.fondo) < 3 && t > 0.2; t -= 0.08) acentoOscuro = mezcla(k.acento, claro ? '#000000' : '#ffffff', t);
  const pruebas = [
    ['texto sobre fondo', k.texto, k.fondo, 4.5],
    ['texto de la cabecera sobre "oscuro"', sobreOscuro, k.oscuro, 4.5],
    ['textoAcento sobre acento (botones)', k.textoAcento, k.acento, 4.5],
    ['acento sobre "oscuro" (detalles en la barra)', k.acento, k.oscuro, 3],
  ];
  for (const [que, a, b, min] of pruebas) {
    const r = contraste(a, b);
    if (r < min) avisa(`Contraste bajo: ${que} = ${r.toFixed(2)}:1 (mínimo ${min}:1). Cambia los colores.`);
  }
  return {
    fondo: k.fondo, texto: k.texto, oscuro: k.oscuro, acento: k.acento, 't-acento': k.textoAcento,
    suave, linea: rgba(k.texto, 0.14), 'sobre-oscuro': sobreOscuro,
    panel: claro ? mezcla('#ffffff', k.fondo, 0.6) : mezcla(k.texto, k.fondo, 0.07),
    'acento-h': mezcla(k.acento, '#ffffff', 0.86), 'acento-suave': rgba(k.acento, 0.16),
    'acento-oscuro': acentoOscuro, 'fondo-nav': rgba(k.fondo, 0.94),
  };
}
const varsCSS = (t, f) => ':root{' + Object.entries(t).map(([n, v]) => `--${n}:${v}`).join(';') +
  `;--f-tit:${f.tit};--f-txt:${f.txt}}`;

function fuentes(c) {
  const f = c.fuentes || {};
  const ok = (n) => /^[A-Za-z0-9 ]{2,40}$/.test(n || '');
  const sis = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  if (!f.google || !ok(f.titulos) || !ok(f.texto)) {
    if (f.google) avisa('fuentes: nombres no válidos; se usan las del sistema.');
    return { tit: 'Georgia,"Times New Roman",serif', txt: sis, link: '' };
  }
  const fam = [...new Set([f.titulos, f.texto])].map((n) =>
    'family=' + n.trim().replace(/ /g, '+') + (n === f.texto ? ':wght@400;500;600;700' : '')).join('&');
  return {
    tit: `"${f.titulos}",Georgia,serif`, txt: `"${f.texto}",${sis}`,
    link: '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      `<link href="https://fonts.googleapis.com/css2?${fam}&display=swap" rel="stylesheet">`,
  };
}

// ───────────────────────────────────────────────────────────── horario
export function tramos(txt) {
  if (!txt || !String(txt).trim()) return [];
  return String(txt).split(',').map((s) => {
    const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    if (!m) falla(`horario: "${s.trim()}" no es HH:MM-HH:MM`);
    const [a, b] = [+m[1] * 60 + +m[2], +m[3] * 60 + +m[4]];
    if (a > 24 * 60 || b > 24 * 60) falla(`horario: hora imposible en "${s.trim()}"`);
    return [a, b];
  });
}
const hhmm = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

// ───────────────────────────────────────────────────────────── imágenes
async function cargarSharp() {
  try { return (await import(pathToFileURL(path.join(RAIZ, 'herramientas/node_modules/sharp/lib/index.js')).href)).default; }
  catch { try { return (await import('sharp')).default; } catch { return null; } }
}
async function imagenes(c, dir, out) {
  const sharp = await cargarSharp();
  if (!sharp) avisa('Fotos sin optimizar: instala sharp con  cd herramientas && npm install  y vuelve a generar.');
  const mapa = {};
  const refs = new Set([c.logo, c.portada, ...(c.fotos || []).map((f) => f.src), ...(c.destacados || []).map((d) => d.foto),
    ...Object.values((c.carta && c.carta.fotosCategorias) || {})].filter(Boolean));
  fs.mkdirSync(path.join(out, 'img'), { recursive: true });
  for (const ref of refs) {
    if (/^https:\/\//.test(ref)) { mapa[ref] = { src: ref }; continue; }
    if (!/^img\/[A-Za-z0-9._-]+$/.test(ref)) falla(`foto "${ref}": usa img/nombre.jpg o una URL https://`);
    const orig = path.join(dir, ref);
    if (!fs.existsSync(orig)) { avisa(`Falta la foto ${ref} (no se muestra).`); continue; }
    const ext = path.extname(ref).toLowerCase(), base = path.basename(ref, ext);
    if (ext === '.svg' || !sharp || !['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      fs.copyFileSync(orig, path.join(out, ref));
      mapa[ref] = { src: ref };
      continue;
    }
    const img = sharp(orig).rotate();
    const meta = await img.metadata();
    const anchoMax = meta.autoOrient?.width || meta.width;
    const anchos = [800, 1600].filter((w, i) => i === 0 || anchoMax > 900).map((w) => Math.min(w, anchoMax));
    const srcset = [];
    for (const w of [...new Set(anchos)]) {
      const nom = `img/${base}-${w}.webp`;
      const info = await sharp(orig).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(out, nom));
      srcset.push({ nom, w: info.width, h: info.height });
    }
    const p = srcset[0];
    mapa[ref] = { src: p.nom, w: p.w, h: p.h, srcset: srcset.map((s) => `${s.nom} ${s.w}w`).join(', ') };
    if (ref === c.logo) { // icono para el navegador y para compartir
      await sharp(orig).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(out, 'img/icono.png'));
      mapa[ref].icono = 'img/icono.png';
    }
  }
  return mapa;
}
function img(mapa, ref, { alt = '', cls = '', sizes = '100vw', lazy = true, prioridad = false } = {}) {
  const m = mapa[ref]; if (!m) return '';
  return `<img${cls ? ` class="${cls}"` : ''} src="${esc(m.src)}"${m.srcset ? ` srcset="${esc(m.srcset)}" sizes="${sizes}"` : ''}` +
    `${m.w ? ` width="${m.w}" height="${m.h}"` : ''} alt="${esc(alt)}"${lazy ? ' loading="lazy" decoding="async"' : ''}${prioridad ? ' fetchpriority="high"' : ''}>`;
}

// ───────────────────────────────────────────────────────────── iconos (trazos propios)
const ICO = {
  tel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.4-4A8 8 0 1 1 8 18.6z"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M15 8h-1.5A2.5 2.5 0 0 0 11 10.5V21M8.5 13H15"/></svg>',
  carta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
};

// ───────────────────────────────────────────────────────────── piezas comunes
function cabeza(c, t, f, mapa, { titulo, desc, canon, indexar = true, css, extra = '' }) {
  const icono = mapa[c.logo]?.icono || mapa[c.logo]?.src || '';
  const og = mapa[c.portada]?.srcset ? mapa[c.portada].srcset.split(', ').pop().split(' ')[0] : mapa[c.portada]?.src;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
${indexar ? `<link rel="canonical" href="${esc(canon)}">` : '<meta name="robots" content="noindex">'}
<meta name="theme-color" content="${t.oscuro}">
${icono ? `<link rel="icon" href="${esc(icono)}"><link rel="apple-touch-icon" href="${esc(icono)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="${esc(c.nombre)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canon)}">
${og ? `<meta property="og:image" content="${esc(/^https:/.test(og) ? og : c.url + '/' + og)}">` : ''}
${f.link}
<style>${varsCSS(t, f)}
${css}</style>
${extra}
</head>`;
}
function marca(c, mapa, href) {
  return `<a class="marca" href="${href}">${mapa[c.logo] ? `<img src="${esc(mapa[c.logo].src)}" alt="" width="34" height="34">` : ''}<span>${esc(c.nombre)}</span></a>`;
}
const dirTxt = (d) => [d.calle, [d.cp, d.ciudad].filter(Boolean).join(' '), d.provincia].filter(Boolean).join(', ');
const mapaHref = (c) => c.mapaUrl || ('https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(c.geo ? `${c.geo.lat},${c.geo.lng}` : `${c.nombre}, ${dirTxt(c.direccion || {})}`));
const pie = (c) => `<footer class="pie"><div class="wrap">
  <b>${esc(c.nombre)}</b>
  <p>${esc(dirTxt(c.direccion || {}))}</p>
  <nav aria-label="Legal"><a href="aviso-legal.html">Aviso legal</a><a href="privacidad.html">Privacidad</a><a href="carta.html">Carta</a></nav>
</div></footer>`;

// ───────────────────────────────────────────────────────────── index.html (la web)
function jsonLd(c, mapa) {
  const d = c.direccion || {};
  const horas = [];
  DIAS.forEach((k, i) => tramos(c.horario?.[k]).forEach(([a, b]) => horas.push({
    '@type': 'OpeningHoursSpecification', dayOfWeek: DIAS_SCHEMA[i], opens: hhmm(a), closes: hhmm(b),
  })));
  const ld = {
    '@context': 'https://schema.org', '@type': c.tipoGoogle || 'Restaurant', name: c.nombre, url: c.url + '/',
    description: c.lema || undefined,
    image: mapa[c.portada] ? (/^https:/.test(mapa[c.portada].src) ? mapa[c.portada].src : c.url + '/' + mapa[c.portada].src) : undefined,
    telephone: c.telefono || undefined, email: c.email || undefined,
    servesCuisine: (c.cocina || []).length ? c.cocina : undefined, priceRange: c.precio || undefined,
    hasMenu: c.url + '/carta.html', acceptsReservations: c.telefono ? 'True' : undefined,
    address: { '@type': 'PostalAddress', streetAddress: d.calle, postalCode: d.cp, addressLocality: d.ciudad, addressRegion: d.provincia, addressCountry: 'ES' },
    geo: c.geo ? { '@type': 'GeoCoordinates', latitude: c.geo.lat, longitude: c.geo.lng } : undefined,
    openingHoursSpecification: horas.length ? horas : undefined,
    sameAs: [c.instagram, c.facebook].filter((u) => /^https:\/\/.+\..+\/.+/.test(u || '')),
  };
  // Sin aggregateRating: Google no admite las valoraciones del propio negocio en su web.
  return JSON.stringify(ld).replace(/</g, '\\u003c');
}

function web(c, t, f, mapa) {
  const css = fs.readFileSync(path.join(PLANTILLA, 'estilos.css'), 'utf8');
  const ciudad = c.direccion?.ciudad || '';
  const tipo = { BarOrPub: 'Bar', Restaurant: 'Restaurante', CafeOrCoffeeShop: 'Cafetería', Bakery: 'Panadería' }[c.tipoGoogle] || 'Bar';
  const titulo = `${c.nombre} · ${tipo}${ciudad ? ' en ' + ciudad : ''}`;
  const desc = [c.lema, (c.cocina || []).join(', '), ciudad && `${tipo} en ${ciudad}.`, 'Mira la carta y pide desde tu mesa.'].filter(Boolean).join(' ').slice(0, 300);
  const horario = DIAS.map((k, i) => {
    const tr = tramos(c.horario?.[k]);
    return `<tr data-dia="${i}"><th scope="row">${DIAS_TXT[i]}</th><td${tr.length ? '' : ' class="cerrado"'}>${tr.length ? tr.map(([a, b]) => `${hhmm(a)}–${hhmm(b)}`).join('<br>') : 'Cerrado'}</td></tr>`;
  }).join('');
  const horJSON = JSON.stringify(DIAS.map((k) => tramos(c.horario?.[k])));
  const r = c.resenas || {};
  const estrellas = r.nota ? '★'.repeat(Math.round(r.nota)) + '☆'.repeat(5 - Math.round(r.nota)) : '';
  const contacto = [
    c.telefono && `<li><a href="${telHref(c.telefono)}">${ICO.tel}<span>Llamar<small>${esc(c.telefono)}</small></span></a></li>`,
    c.whatsapp && `<li><a href="${waHref(c.whatsapp)}" target="_blank" rel="noopener">${ICO.chat}<span>WhatsApp<small>Escríbenos para reservar</small></span></a></li>`,
    c.instagram && `<li><a href="${esc(c.instagram)}" target="_blank" rel="noopener">${ICO.cam}<span>Instagram<small>Fotos y novedades</small></span></a></li>`,
    c.facebook && `<li><a href="${esc(c.facebook)}" target="_blank" rel="noopener">${ICO.fb}<span>Facebook</span></a></li>`,
    c.email && `<li><a href="mailto:${esc(c.email)}">${ICO.mail}<span>Correo<small>${esc(c.email)}</small></span></a></li>`,
  ].filter(Boolean).join('');
  const mapaEmbed = c.geo
    ? `https://maps.google.com/maps?q=${c.geo.lat},${c.geo.lng}&z=16&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(dirTxt(c.direccion || {}))}&z=16&output=embed`;

  return cabeza(c, t, f, mapa, { titulo, desc, canon: c.url + '/', css,
    extra: `<script type="application/ld+json">${jsonLd(c, mapa)}</script>` }) + `
<body>
<a class="skip" href="#contenido">Saltar al contenido</a>
<header class="top"><div class="wrap">
  ${marca(c, mapa, './')}
  <nav aria-label="Principal">
    <a class="opt" href="#horario">Horario</a><a class="opt" href="#donde">Cómo llegar</a>
    ${c.telefono ? `<a class="opt" href="${telHref(c.telefono)}">Llamar</a>` : ''}
    <a class="btn btn-acento" href="carta.html">Ver la carta</a>
  </nav>
</div></header>

<main id="contenido">
<section class="hero" aria-labelledby="titulo">
  ${img(mapa, c.portada, { cls: 'bg', lazy: false, prioridad: true })}
  <div class="wrap">
    <h1 id="titulo">${esc(c.nombre)}</h1>
    ${c.lema ? `<p class="lema">${esc(c.lema)}</p>` : ''}
    <p class="estado" id="estado" hidden><i></i><span></span></p>
    <div class="ctas">
      <a class="btn btn-acento" href="carta.html">${ICO.carta}Ver la carta</a>
      <a class="btn btn-borde" href="${esc(mapaHref(c))}" target="_blank" rel="noopener">${ICO.pin}Cómo llegar</a>
    </div>
  </div>
</section>

${(c.sobre || []).length ? `<section class="sec" aria-labelledby="h-sobre"><div class="wrap sobre">
  <div><h2 id="h-sobre">La casa</h2>${c.sobre.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
  ${c.fotos?.[0] ? `<div>${img(mapa, c.fotos[0].src, { alt: c.fotos[0].alt, sizes: '(min-width:860px) 45vw, 100vw' }).replace('<img', '<img style="border-radius:6px;aspect-ratio:4/3;object-fit:cover;width:100%"')}</div>` : ''}
</div></section>` : ''}

${(c.destacados || []).length ? `<section class="sec" aria-labelledby="h-dest"><div class="wrap">
  <h2 id="h-dest">Lo que más se pide</h2>
  <ul class="destacados">${c.destacados.map((d) => `<li>${img(mapa, d.foto, { alt: '', sizes: '(min-width:640px) 33vw, 104px' })}<div><h3>${esc(d.nombre)}</h3>${d.texto ? `<p>${esc(d.texto)}</p>` : ''}</div></li>`).join('')}</ul>
  <a class="btn btn-acento ver-carta" href="carta.html">${ICO.carta}Ver la carta completa</a>
</div></section>` : ''}

${(c.fotos || []).length > 1 ? `<section class="sec" aria-labelledby="h-fotos"><div class="wrap">
  <h2 id="h-fotos">Fotos</h2>
  <div class="galeria" tabindex="0" aria-label="Galería de fotos, desliza para ver más">${c.fotos.map((p) => `<figure>${img(mapa, p.src, { alt: p.alt, sizes: '(min-width:760px) 420px, 78vw' })}${p.alt ? `<figcaption>${esc(p.alt)}</figcaption>` : ''}</figure>`).join('')}</div>
</div></section>` : ''}

<section class="sec" id="horario" aria-labelledby="h-horario"><div class="wrap dos">
  <div>
    <h2 id="h-horario">Horario</h2>
    <table class="horario"><caption class="sr">Horario de apertura</caption><tbody>${horario}</tbody></table>
    ${c.avisoHorario ? `<p class="aviso-h">${esc(c.avisoHorario)}</p>` : ''}
  </div>
  <div id="donde">
    <h2>Dónde estamos</h2>
    <address class="dir">${esc(dirTxt(c.direccion || {}))}</address>
    <div class="mapa" id="mapa">
      <div><p>Mira el mapa o abre la ruta en tu móvil.</p>
      <button class="btn btn-acento" type="button" id="verMapa" data-src="${esc(mapaEmbed)}">${ICO.pin}Ver el mapa aquí</button>
      <small>El mapa es de Google y solo se carga si lo abres.</small></div>
    </div>
    <div class="acciones"><a class="btn btn-borde" href="${esc(mapaHref(c))}" target="_blank" rel="noopener">${ICO.pin}Cómo llegar</a>
    ${c.telefono ? `<a class="btn btn-borde" href="${telHref(c.telefono)}">${ICO.tel}Llamar</a>` : ''}</div>
  </div>
</div></section>

${(r.lista || []).length ? `<section class="sec" aria-labelledby="h-res"><div class="wrap">
  <h2 id="h-res">Lo que dicen</h2>
  ${r.nota ? `<p class="nota-g"><b>${esc(String(r.nota).replace('.', ','))}</b><span class="estrellas" aria-hidden="true">${estrellas}</span><span>${r.total ? esc(r.total) + ' reseñas en Google' : 'en Google'}</span></p>` : ''}
  <ul class="resenas">${r.lista.map((x) => `<li><blockquote>${esc(x.texto)}</blockquote><cite>${esc(x.autor)}</cite></li>`).join('')}</ul>
  ${r.url ? `<p style="margin-top:20px"><a href="${esc(r.url)}" target="_blank" rel="noopener">Ver todas las reseñas en Google</a></p>` : ''}
</div></section>` : ''}

${contacto ? `<section class="sec" id="contacto" aria-labelledby="h-contacto"><div class="wrap">
  <h2 id="h-contacto">Contacto</h2>
  <ul class="contacto">${contacto}</ul>
</div></section>` : ''}
</main>

${pie(c)}
<div class="fijo"><a class="btn btn-acento" href="carta.html">${ICO.carta}Ver la carta y pedir</a></div>

<script>
(function(){
  var H = ${horJSON};
  var el = document.getElementById('estado');
  try {
    var p = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/Madrid', weekday:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(new Date());
    var g = function(t){ return (p.find(function(x){ return x.type === t; }) || {}).value; };
    var d = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(g('weekday'));
    var m = (+g('hour')) * 60 + (+g('minute'));
    var hh = function(x){ x = x % 1440; return ('0' + Math.floor(x / 60)).slice(-2) + ':' + ('0' + (x % 60)).slice(-2); };
    var fila = document.querySelector('tr[data-dia="' + d + '"]'); if (fila) fila.classList.add('hoy');
    var abierto = null, prox = null;
    H[d].forEach(function(t){ var fin = t[1] <= t[0] ? t[1] + 1440 : t[1]; if (m >= t[0] && m < fin) abierto = fin; });
    var ay = (d + 6) % 7;
    H[ay].forEach(function(t){ if (t[1] <= t[0] && m < t[1]) abierto = t[1]; });
    if (abierto == null){
      H[d].forEach(function(t){ if (t[0] > m && (prox == null || t[0] < prox[1])) prox = ['hoy', t[0]]; });
      for (var i = 1; !prox && i < 8; i++){ var dd = (d + i) % 7; if (H[dd].length) prox = [i === 1 ? 'mañana' : ${JSON.stringify(DIAS_TXT.map((x) => x.toLowerCase()))}[dd], H[dd][0][0]]; }
    }
    el.querySelector('span').textContent = abierto != null ? 'Abierto ahora · cierra a las ' + hh(abierto)
      : 'Cerrado ahora' + (prox ? ' · abre ' + prox[0] + ' a las ' + hh(prox[1]) : '');
    el.classList.toggle('abierto', abierto != null);
    el.hidden = false;
  } catch(e){}
  var b = document.getElementById('verMapa');
  if (b) b.addEventListener('click', function(){
    var f = document.createElement('iframe');
    f.src = b.dataset.src; f.title = 'Mapa de ${esc(c.nombre).replace(/'/g, '')}'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
    var m = document.getElementById('mapa'); m.innerHTML = ''; m.appendChild(f);
  });
  // El botón fijo "Ver la carta" aparece al pasar la portada (allí ya están sus botones).
  var fijo = document.querySelector('.fijo'), ctas = document.querySelector('.hero .ctas');
  if (fijo && ctas && 'IntersectionObserver' in window){
    fijo.classList.add('oculto');
    new IntersectionObserver(function(e){ fijo.classList.toggle('oculto', e[0].isIntersecting); }).observe(ctas);
  }
  if (document.getElementById('nl-badge-frame')) document.documentElement.classList.add('nl-badge');
})();
</script>
</body>
</html>
`;
}

// ───────────────────────────────────────────────────────────── carta.html
function carta(c, t, f, mapa, api) {
  const css = fs.readFileSync(path.join(PLANTILLA, 'carta.css'), 'utf8');
  const js = fs.readFileSync(path.join(PLANTILLA, 'carta.js'), 'utf8');
  const k = c.carta || {};
  const fotosCat = {};
  Object.entries(k.fotosCategorias || {}).forEach(([n, ref]) => { if (mapa[ref]) fotosCat[n] = mapa[ref].src; });
  const BAR = {
    slug: c.slug, nombre: c.nombre, api: api.url + '/rest/v1/rpc/', key: api.key, webUrl: './',
    pestanas: (k.pestanas || []).map((p) => ({ nombre: String(p.nombre), categorias: (p.categorias || []).map(String) })),
    fotosCategorias: fotosCat, notasCategorias: k.notasCategorias || {}, notasFinales: k.notasFinales || [],
    alergenos: k.alergenos !== false,
  };
  const ciudad = c.direccion?.ciudad || '';
  return cabeza(c, t, f, mapa, {
    titulo: `Carta de ${c.nombre}${ciudad ? ' · ' + ciudad : ''}`,
    desc: `Carta de ${c.nombre} con precios y alérgenos. Pide desde tu mesa con el móvil.`,
    canon: c.url + '/carta.html', css,
  }) + `
<body>
<header class="top"><div class="wrap">
  ${marca(c, mapa, './').replace('width="34" height="34"', 'width="32" height="32"')}
  <button class="pill none" id="pill" type="button" hidden><i></i><span id="pillTxt">Mesa</span></button>
</div></header>
<div class="wrap intro">
  <h1>La carta</h1>
  <p id="intro">Cargando…</p>
  <p class="closed" id="closedBox" hidden>Ahora no se aceptan pedidos por el móvil. Llama al camarero.</p>
</div>
<nav class="nav" id="nav" hidden aria-label="Secciones de la carta"><div class="wrap">
  <div class="tabs" id="tabs" role="tablist" hidden></div>
  <div class="chips" id="chips"></div>
</div></nav>
<main class="wrap" id="main"><div class="state"><div class="spin"></div>Cargando la carta…</div></main>
<div class="spacer"></div>

<div class="bar" id="bar" hidden><div class="wrap">
  <button class="bar-info" id="barInfo" type="button"><b id="barMesa">${esc(c.nombre)}</b><span id="barSub">Cargando…</span></button>
  <div class="bar-act" id="barAct"></div>
</div></div>

<div class="modal" id="mCart" hidden role="dialog" aria-modal="true" aria-labelledby="cartTitle"><div class="sheet">
  <div class="grab"></div>
  <div class="sh-head"><div><span class="sub" id="cartMesa">Mesa</span><h2 id="cartTitle">Tu pedido</h2></div><button class="x" data-close aria-label="Cerrar">×</button></div>
  <div id="cartBody"></div><div class="err" id="cartErr" hidden role="alert"></div><div id="ordersBody"></div>
</div></div>

<div class="modal center" id="mOk" hidden role="dialog" aria-modal="true" aria-labelledby="okTitle"><div class="sheet">
  <div class="ok-ico"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
  <h2 id="okTitle">¡Pedido enviado!</h2>
  <p class="meta" id="okMeta"></p>
  <p>Te avisamos aquí cuando esté listo. Puedes seguir pidiendo cuando quieras.</p>
  <button class="btn-big dark" data-close style="margin-top:20px">Seguir viendo la carta</button>
</div></div>

<div class="modal center" id="mMesa" hidden role="dialog" aria-modal="true" aria-labelledby="mesaTitle"><div class="sheet">
  <div class="sh-head"><h2 id="mesaTitle" style="text-align:left">¿En qué mesa estás?</h2><button class="x" data-close aria-label="Cerrar">×</button></div>
  <p style="text-align:left" id="mesaHelp"></p>
  <div class="mesas" id="mesasGrid"></div>
</div></div>

<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>window.BAR = ${JSON.stringify(BAR).replace(/</g, '\\u003c')};</script>
<script>
${js}</script>
</body>
</html>
`;
}

// ───────────────────────────────────────────────────────────── legal  TODO(gestoría)
function legal(c, t, f, mapa, L, cual) {
  const css = fs.readFileSync(path.join(PLANTILLA, 'estilos.css'), 'utf8');
  const p = (v) => v ? esc(v) : '[pendiente]';
  const cuerpo = cual === 'aviso'
    ? `<h1>Aviso legal</h1>
<!-- TODO(gestoría): revisar este texto (LSSI-CE art. 10) antes de publicar. -->
<p>Este sitio web es de <b>${p(L.titular)}</b>, con NIF ${p(L.nif)} y domicilio en ${p(L.domicilio)}. Contacto: ${p(L.email || c.email)}.</p>
<h2>Uso del sitio</h2><p>La información de esta web (carta, precios, horario) es orientativa y puede cambiar. Los precios que valen son los del local.</p>
<h2>Pedidos desde la mesa</h2><p>La carta permite enviar pedidos a la barra desde la mesa. No se paga por internet: se paga en el local, como siempre.</p>
<h2>Propiedad intelectual</h2><p>Los textos y fotos de esta web pertenecen a su titular o se usan con permiso.</p>`
    : `<h1>Privacidad</h1>
<!-- TODO(gestoría): revisar este texto (RGPD) antes de publicar. -->
<p><b>Responsable:</b> ${p(L.titular)}, NIF ${p(L.nif)}. Contacto: ${p(L.email || c.email)}.</p>
<h2>Qué datos tratamos</h2><p>Para pedir desde la mesa <b>no pedimos ningún dato personal</b>: ni nombre, ni teléfono, ni correo. El pedido solo lleva la mesa, los platos y las notas que escribas.</p>
<h2>Datos en tu móvil</h2><p>Tu pedido en curso y el estado de tus pedidos se guardan en tu propio navegador (almacenamiento local), solo para que funcione la carta. No usamos cookies de publicidad ni de analítica.</p>
<h2>Servicios de terceros</h2><ul>
<li>Las fuentes de letra se cargan de Google Fonts.</li>
<li>El mapa es de Google Maps y solo se carga si pulsas «Ver el mapa aquí». Google puede usar sus propias cookies.</li>
<li>La web está alojada en Netlify y los pedidos se guardan en Supabase (servidores en la Unión Europea).</li></ul>
<h2>Tus derechos</h2><p>Puedes escribirnos a ${p(L.email || c.email)} para cualquier consulta sobre privacidad. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>`;
  return cabeza(c, t, f, mapa, { titulo: (cual === 'aviso' ? 'Aviso legal' : 'Privacidad') + ' · ' + c.nombre, desc: c.nombre, canon: '', indexar: false, css }) + `
<body><header class="top"><div class="wrap">${marca(c, mapa, './')}<nav><a class="btn btn-acento" href="carta.html">Ver la carta</a></nav></div></header>
<main class="wrap legal-txt">${cuerpo}</main>${pie(c)}</body></html>
`;
}

// ───────────────────────────────────────────────────────────── validación
function validar(c) {
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(c.slug || '')) falla('slug no válido (minúsculas, números y guiones)');
  if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(c.url || '')) falla('url debe ser https://dominio, sin barra al final');
  if (!c.nombre) falla('falta nombre');
  for (const k of Object.keys(c.horario || {})) if (!DIAS.includes(k)) falla(`horario: "${k}" no es un día (sin tildes: miercoles, sabado)`);
  DIAS.forEach((k) => tramos(c.horario?.[k]));
  if (!c.portada) avisa('Sin foto de portada: la portada queda en color liso.');
  if (!c.direccion?.calle) avisa('Sin dirección: Google no podrá situar el bar.');
  if (!c.geo) avisa('Sin geo (coordenadas): el mapa se busca por dirección.');
  (c.fotos || []).forEach((p) => { if (!p.alt) avisa(`La foto ${p.src} no tiene descripción (alt).`); });
  if (/clave|password|secret/i.test(Object.keys(c).join(' '))) avisa('La config tiene un campo de clave: la web no la necesita y el repo es público. Quítalo.');
}

function apiPublica() {
  const s = fs.readFileSync(path.join(RAIZ, 'web/assets/config.js'), 'utf8');
  const url = (s.match(/supabaseUrl:\s*'([^']+)'/) || [])[1];
  const key = (s.match(/supabaseKey:\s*'([^']+)'/) || [])[1];
  if (!url || !key) falla('No se pudo leer web/assets/config.js');
  return { url, key };
}

// ───────────────────────────────────────────────────────────── principal
async function generar(dir) {
  dir = path.resolve(dir);
  const cfgPath = path.join(dir, 'bar.config.mjs');
  if (!fs.existsSync(cfgPath)) falla(`No existe ${cfgPath}`);
  const c = (await import(pathToFileURL(cfgPath).href + '?t=' + Date.now())).default;
  let L = {};
  const lp = path.join(dir, 'legal.local.mjs');
  if (fs.existsSync(lp)) L = (await import(pathToFileURL(lp).href + '?t=' + Date.now())).default || {};
  else avisa('Falta legal.local.mjs: el aviso legal sale con [pendiente] (titular y NIF). Ver _plantilla/legal.local.ejemplo.mjs');
  validar(c);
  const t = tema(c), f = fuentes(c), api = apiPublica();
  const out = path.join(dir, 'publicar');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const mapa = await imagenes(c, dir, out);
  const host = new URL(api.url).host;
  const escribe = (n, s) => fs.writeFileSync(path.join(out, n), s);
  escribe('index.html', web(c, t, f, mapa));
  escribe('carta.html', carta(c, t, f, mapa, api));
  escribe('aviso-legal.html', legal(c, t, f, mapa, L, 'aviso'));
  escribe('privacidad.html', legal(c, t, f, mapa, L, 'privacidad'));
  escribe('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${c.url}/sitemap.xml\n`);
  const hoy = new Date().toISOString().slice(0, 10);
  escribe('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    ['/', '/carta.html'].map((u) => `  <url><loc>${c.url}${u}</loc><lastmod>${hoy}</lastmod></url>`).join('\n') + '\n</urlset>\n');
  escribe('netlify.toml', `# Web de ${c.nombre}: generada con herramientas/web-bar.mjs. No editar a mano.\n[build]\n  publish = "."\n  command = ""\n`);
  escribe('_headers', `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https: data:; connect-src https://${host}; frame-src https://maps.google.com https://www.google.com; base-uri 'self'; form-action 'self'
/*.html
  Cache-Control: public, max-age=0, must-revalidate
/img/*
  Cache-Control: public, max-age=604800
`);
  const peso = fs.readdirSync(out, { recursive: true }).reduce((s, n) => { const p = path.join(out, n); return s + (fs.statSync(p).isFile() ? fs.statSync(p).size : 0); }, 0);
  console.log(`✓ ${c.nombre}: ${path.relative(process.cwd(), out)}/  (${(peso / 1024).toFixed(0)} KB)`);
  for (const a of avisos) console.log('  ! ' + a);
  console.log(`\nSiguiente:
  1. Sube la carpeta publicar/ a su sitio de Netlify (uno por bar).
  2. En gestión del bar → Ajustes → "Web propia de la carta":  ${c.url}/carta.html
     (los NFC /m/<codigo> llevarán a esa carta con la mesa ya puesta)`);
}

function nuevo(slug) {
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug || '')) falla('Uso: --nuevo <slug>  (minúsculas, números y guiones)');
  const dir = path.join(RAIZ, 'clientes', slug);
  if (fs.existsSync(dir)) falla(`Ya existe clientes/${slug}`);
  fs.mkdirSync(path.join(dir, 'img'), { recursive: true });
  const cfg = fs.readFileSync(path.join(PLANTILLA, 'bar.config.mjs'), 'utf8')
    .replace("slug: 'demo'", `slug: '${slug}'`).replace("url: 'https://bar-la-demo.netlify.app'", `url: 'https://${slug}.netlify.app'`);
  fs.writeFileSync(path.join(dir, 'bar.config.mjs'), cfg);
  fs.copyFileSync(path.join(PLANTILLA, 'legal.local.ejemplo.mjs'), path.join(dir, 'legal.local.mjs'));
  fs.writeFileSync(path.join(dir, 'img/LEEME.txt'), 'Mete aquí el logo y las fotos del bar (JPG o PNG grandes; la herramienta las reduce).\n');
  console.log(`✓ Creado clientes/${slug}/\n  1. Rellena bar.config.mjs y legal.local.mjs (este no se sube a git)\n  2. Fotos en img/\n  3. node herramientas/web-bar.mjs clientes/${slug}`);
}

const args = process.argv.slice(2);
if (args[0] === '--nuevo') nuevo(args[1]);
else if (args[0]) await generar(args[0]);
else console.log('Uso:\n  node herramientas/web-bar.mjs --nuevo <slug>\n  node herramientas/web-bar.mjs clientes/<slug>');
