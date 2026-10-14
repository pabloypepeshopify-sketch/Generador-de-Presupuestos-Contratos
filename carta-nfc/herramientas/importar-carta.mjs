// Lee la carta de la web de un bar y la carga en la plataforma (acción "importar" por ref).
// Usa las mismas reglas que web/w/pedidos.js para que cada botón "+" encuentre su producto:
//   ref = clave i18n del nombre (mn.seccion.N); con varios precios: ref#0, ref#1… (un producto por tamaño)
//   sin precio en el plato: precio común de la sección ("Todos a 8 €")
//
// Uso:
//   node importar-carta.mjs --url https://martinez-bar.vercel.app/carta.html --slug martinez-bar --clave <clave admin> [--seco]
//   (--seco: solo muestra lo que importaría)
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const API = (args.api || 'https://giazlntdbfhnnfizmfao.supabase.co').replace(/\/$/, '');
const KEY = args.key || 'sb_publishable_sdLnLlIQvJBPTcmNx9FFpw_UEIAwbDP';
if (!args.url || !args.slug || (!args.clave && !args.seco)) {
  console.error('Uso: node importar-carta.mjs --url <carta.html> --slug <restaurante> --clave <clave admin> [--seco]');
  process.exit(2);
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const texto = (html) => html.replace(/<[^>]+>/g, '').replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENT[e] ?? m))
  .replace(/\s+/g, ' ').trim();
const precio = (html) => {
  const m = texto(html).replace(/€/g, '').trim().replace(',', '.').match(/^\d{1,5}(\.\d{1,2})?$/);
  return m ? m[0] : null;
};

// Divide el HTML en elementos <div class="dish"…>…</div> respetando divs anidados.
function bloques(html, abre) {
  const out = [];
  let i = 0;
  while ((i = html.indexOf(abre, i)) !== -1) {
    let prof = 0, j = i;
    const re = /<div\b|<\/div>/g;
    re.lastIndex = i;
    let m;
    while ((m = re.exec(html))) {
      prof += m[0] === '</div>' ? -1 : 1;
      if (prof === 0) { j = re.lastIndex; break; }
    }
    out.push(html.slice(i, j));
    i = j;
  }
  return out;
}

const res = await fetch(args.url);
if (!res.ok) throw new Error(`No se pudo leer ${args.url}: ${res.status}`);
const html = await res.text();
const secciones = [...html.matchAll(/<section class="msec" id="([^"]+)"[\s\S]*?<\/section>/g)];
const productos = [];
const avisos = [];
secciones.forEach(([sec, id], si) => {
  const categoria = texto((sec.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [, id])[1]);
  const flat = (sec.match(/class="msec__flat"[\s\S]*?<b>([\s\S]*?)<\/b>/) || [])[1];
  const cab = (sec.match(/<div class="prices-head"[^>]*>([\s\S]*?)<\/div>/) || [])[1];
  const tamanos = cab ? [...cab.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)].slice(1).map((m) => texto(m[1])) : [];
  bloques(sec, '<div class="dish"').forEach((d) => {
    const nom = d.match(/<span data-i18n="(mn\.[^"]+)">([\s\S]*?)<\/span>/);
    if (!nom) return;
    const [, ref, nombreHtml] = nom;
    const nombre = texto(nombreHtml);
    const descripcion = texto((d.match(/class="dish__desc"[^>]*>([\s\S]*?)<\/p>/) || [, ''])[1]) || null;
    const precios = [...d.matchAll(/<span class="dish__p[^"]*"[^>]*>([\s\S]*?)<\/span>/g)].map((m) => precio(m[1]));
    const base = { categoria, categoria_orden: si + 1, descripcion };
    if (precios.length === 0) {
      const p = flat && precio(flat);
      if (!p) { avisos.push(`${ref} ${nombre}: sin precio`); return; }
      productos.push({ ...base, ref, nombre, precio: p, orden: productos.length + 1 });
    } else if (precios.length === 1) {
      if (!precios[0]) { avisos.push(`${ref} ${nombre}: precio ilegible`); return; }
      productos.push({ ...base, ref, nombre, precio: precios[0], orden: productos.length + 1 });
    } else {
      precios.forEach((p, i) => {
        if (!p) { avisos.push(`${ref}#${i} ${nombre}: precio ilegible`); return; }
        productos.push({ ...base, ref: `${ref}#${i}`, nombre: `${nombre} · ${tamanos[i] || 'Tamaño ' + (i + 1)}`, precio: p, orden: productos.length + 1 });
      });
    }
  });
});

console.log(`${secciones.length} secciones · ${productos.length} productos (con tamaños)`);
avisos.forEach((a) => console.warn('  ! ' + a));
if (args.seco) {
  productos.forEach((p) => console.log(`  ${p.ref.padEnd(26)} ${p.precio.padStart(6)} €  ${p.categoria} › ${p.nombre}`));
  process.exit(0);
}
const r = await fetch(`${API}/rest/v1/rpc/carta_admin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: KEY, ...(KEY.startsWith('sb_') ? {} : { Authorization: 'Bearer ' + KEY }) },
  body: JSON.stringify({ p_slug: args.slug, p_clave: args.clave, p_accion: 'importar', p_datos: { productos } }),
});
const data = await r.json();
if (!r.ok) { console.error('Error:', data.message || data); process.exit(1); }
console.log(`✓ Importados/actualizados: ${data.importados} · productos en la carta: ${data.productos.length}`);
