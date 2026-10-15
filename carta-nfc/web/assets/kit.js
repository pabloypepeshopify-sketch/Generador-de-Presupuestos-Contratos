// Kit de instalación imprimible: un adhesivo por mesa (nombre, QR, zona del NFC, logo) en A4 para
// recortar o para imprenta (1 por página, sangrado de 2 mm y marcas de corte), y el QR de la carta
// general como imagen para la galería del móvil del camarero. Usa la sesión de gestión (clave de admin).
(function () {
  const { rpc, esc, store, urlMesa, urlRestaurante } = window.Carta;
  const $ = (id) => document.getElementById(id);

  // Medidas en mm por tamaño. v = vertical.
  const TAM = {
    s: { w: 60, h: 60, pad: 3.5, logo: 5, bar: 2.8, mesa: 6.5, nfc: 20, qr: 25, pie: 2.5, mini: 1.9, franja: 1.6 },
    m: { w: 85, h: 85, pad: 5, logo: 7, bar: 3.6, mesa: 9, nfc: 28, qr: 35, pie: 3.3, mini: 2.4, franja: 2.2 },
    l: { w: 95, h: 135, pad: 6, logo: 9, bar: 4.2, mesa: 11, nfc: 32, qr: 40, pie: 3.8, mini: 2.8, franja: 3, v: true },
  };
  const SANGRADO = 2, MARGEN_MARCAS = 8;
  const ONDAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M7 8.5a5 5 0 0 1 0 7"/><path d="M11 6a8.5 8.5 0 0 1 0 12"/><path d="M15 3.5a12 12 0 0 1 0 17"/></svg>';

  const sesion = store.get('carta:admin', null);
  let d = null;
  const st = { tam: 'm', modo: 'a4', color: '#1e4535', texto: 'Acerca tu móvil o escanea', general: false, logo: '', sel: new Set() };
  const kLogo = () => 'carta:kit:logo:' + d.restaurante.slug;

  function error(msg) { $('err').hidden = false; $('err').innerHTML = msg; }

  async function iniciar() {
    if (!sesion) return error('<h1>Kit de instalación</h1><p style="margin-top:8px">Ábrelo desde <a href="/admin.html">Gestión</a> → <b>Mesas y NFC</b> → "Kit de instalación".</p>');
    try {
      d = await rpc('carta_admin', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: 'datos', p_datos: {} });
    } catch (e) {
      return error(`<p>No se pudo entrar (${esc(e.humano || e.code)}). Vuelve a <a href="/admin.html">Gestión</a>.</p>`);
    }
    const r = d.restaurante;
    document.title = 'Kit de instalación · ' + r.nombre;
    $('k-nombre').textContent = r.nombre;
    st.color = /^#[0-9a-f]{6}$/i.test(r.color || '') ? r.color : st.color;
    st.logo = store.get(kLogo(), '') || '';
    d.mesas.filter((m) => m.activa).forEach((m) => st.sel.add(m.id));
    $('k-color').value = st.color;
    $('k-mesas').innerHTML = d.mesas.filter((m) => m.activa).map((m) =>
      `<label><input type="checkbox" data-mesa="${esc(m.id)}" checked> ${esc(m.nombre)}</label>`).join('') ||
      '<span class="aviso">No hay mesas activas: créalas en Gestión → Mesas y NFC.</span>';
    $('panel').hidden = false;
    $('galeria').hidden = false;
    pintar();
    galeria();
  }

  function qrSvg(url) {
    const qr = window.qrcode(0, 'Q');
    qr.addData(url);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }

  function adhesivo(t, item, extra = 0, pos = '') {
    const r = d.restaurante;
    const v = (n) => `${n}mm`;
    const estilo = `--w:${v(t.w + 2 * extra)};--h:${v(t.h + 2 * extra)};--pad:${v(t.pad + extra)};--logo:${v(t.logo)};--f-bar:${v(t.bar)};` +
      `--f-mesa:${v(t.mesa)};--nfc:${v(t.nfc)};--qr:${v(t.qr)};--f-pie:${v(t.pie)};--f-mini:${v(t.mini)};--franja:${v(t.franja + extra)}` + pos;
    const cab = `<div class="cab">${st.logo ? `<img src="${esc(st.logo)}" alt="">` : ''}<span>${esc(r.nombre)}</span></div>`;
    const nfc = `<div class="nfc">${ONDAS}<small>Acerca<br>aquí</small></div>`;
    const qr = `<div class="qr">${qrSvg(item.url)}</div>`;
    const pie = `<p class="pie"><b>${esc(st.texto)}</b><br>${item.general ? 'para ver la carta. Eliges tu mesa al pedir.' : 'para ver la carta y pedir'}</p>`;
    const cuerpo = t.v
      ? `${cab}<div class="mesa">${esc(item.nombre)}</div><div class="zonas">${nfc}<span class="o">o escanea</span>${qr}</div>${pie}`
      : `${cab}<div class="mesa">${esc(item.nombre)}</div><div class="zonas">${nfc}${qr}</div>${pie}`;
    return `<div class="ad${t.v ? ' v' : ''}" style="${estilo}" data-item="${esc(item.nombre)}"><div class="franja"></div><div class="in">${cuerpo}</div></div>`;
  }

  function items() {
    const lista = d.mesas.filter((m) => m.activa && st.sel.has(m.id)).map((m) => ({ nombre: m.nombre, url: urlMesa(m.codigo) }));
    if (st.general) lista.push({ nombre: 'Carta', url: urlRestaurante(d.restaurante.slug), general: true });
    return lista;
  }

  function pintar() {
    document.documentElement.style.setProperty('--marca', st.color);
    const t = TAM[st.tam], lista = items();
    $('k-aviso-libre').hidden = !(st.general && !d.restaurante.mesa_libre);
    let html = '', pagina = '';
    if (!lista.length) { $('vista').innerHTML = '<p class="err">Marca al menos una mesa.</p>'; return; }
    if (st.modo === 'a4') {
      const cols = Math.floor(190 / t.w), filas = Math.floor(277 / t.h), porHoja = cols * filas;
      for (let i = 0; i < lista.length; i += porHoja) {
        html += `<div class="hoja a4" style="grid-template-columns:repeat(${cols},${t.w}mm);grid-auto-rows:${t.h}mm">` +
          lista.slice(i, i + porHoja).map((it) => adhesivo(t, it)).join('') + '</div>';
      }
      pagina = '@page{size:A4;margin:0}';
    } else {
      const W = t.w + 2 * MARGEN_MARCAS, H = t.h + 2 * MARGEN_MARCAS, o = MARGEN_MARCAS - SANGRADO;
      const marcas = [];
      // marcas de corte: fuera del sangrado, alineadas con el borde final del adhesivo
      for (const x of [MARGEN_MARCAS, MARGEN_MARCAS + t.w]) {
        marcas.push(`left:${x - 0.1}mm;top:0;width:.2mm;height:${o - 1}mm`, `left:${x - 0.1}mm;bottom:0;width:.2mm;height:${o - 1}mm`);
      }
      for (const y of [MARGEN_MARCAS, MARGEN_MARCAS + t.h]) {
        marcas.push(`top:${y - 0.1}mm;left:0;height:.2mm;width:${o - 1}mm`, `top:${y - 0.1}mm;right:0;height:.2mm;width:${o - 1}mm`);
      }
      html = lista.map((it) => `<div class="hoja imp" style="width:${W}mm;height:${H}mm">` +
        adhesivo(t, it, SANGRADO, `;left:${o}mm;top:${o}mm`) +
        marcas.map((m) => `<i class="marca" style="${m}"></i>`).join('') + '</div>').join('');
      pagina = `@page{size:${W}mm ${H}mm;margin:0}`;
    }
    $('pagina').textContent = pagina;
    $('vista').innerHTML = html;
  }

  // ── QR de la carta general para la galería del móvil (PNG 1080 × 1350)
  function claro(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
  }
  function envolver(ctx, texto, x, y, ancho, alto) {
    const palabras = texto.split(' '); let linea = '';
    for (const p of palabras) {
      const prueba = linea ? linea + ' ' + p : p;
      if (ctx.measureText(prueba).width > ancho && linea) { ctx.fillText(linea, x, y); linea = p; y += alto; } else linea = prueba;
    }
    ctx.fillText(linea, x, y);
  }
  function galeria() {
    const r = d.restaurante, url = urlRestaurante(r.slug);
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    const x = c.getContext('2d');
    const tinta = claro(st.color) ? '#151515' : '#ffffff';
    x.fillStyle = st.color; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = tinta; x.textAlign = 'center';
    x.font = '700 64px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    envolver(x, r.nombre, 540, 150, 940, 72);
    // tarjeta blanca con el QR
    const qr = window.qrcode(0, 'Q'); qr.addData(url); qr.make();
    const n = qr.getModuleCount(), lado = 760, cel = Math.floor(lado / (n + 8)), tq = cel * (n + 8), ox = (1080 - tq) / 2, oy = 250;
    x.fillStyle = '#ffffff';
    if (x.roundRect) { x.beginPath(); x.roundRect(ox, oy, tq, tq, 36); x.fill(); } else x.fillRect(ox, oy, tq, tq);
    x.fillStyle = '#000000';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (qr.isDark(i, j)) x.fillRect(ox + (j + 4) * cel, oy + (i + 4) * cel, cel, cel);
    x.fillStyle = tinta;
    x.font = '700 54px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    x.fillText('Escanea para ver la carta', 540, oy + tq + 100);
    x.font = '500 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    x.fillText('Eliges tu mesa al enviar el pedido', 540, oy + tq + 160);
    const fin = () => {
      const png = c.toDataURL('image/png');
      $('g-img').src = png;
      $('g-bajar').href = png;
      $('g-bajar').download = 'qr-carta-' + r.slug + '.png';
    };
    if (st.logo) {
      const im = new Image();
      im.onload = () => { const h = 90, w = Math.min(300, im.width * h / im.height); x.drawImage(im, 540 - w / 2, 30, w, h); fin(); };
      im.onerror = fin; im.src = st.logo;
      // el nombre baja un poco si hay logo: se repinta la franja de arriba
      x.fillStyle = st.color; x.fillRect(0, 0, 1080, 240);
      x.fillStyle = tinta; x.font = '700 56px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      envolver(x, r.nombre, 540, 190, 940, 60);
    } else fin();
  }

  // ── controles
  $('k-tam').addEventListener('change', (e) => { st.tam = e.target.value; pintar(); });
  $('k-modo').addEventListener('change', (e) => { st.modo = e.target.value; pintar(); });
  $('k-color').addEventListener('input', (e) => { st.color = e.target.value; pintar(); });
  $('k-color').addEventListener('change', galeria);
  $('k-texto').addEventListener('input', (e) => { st.texto = e.target.value.trim() || 'Acerca tu móvil o escanea'; pintar(); });
  $('k-general').addEventListener('change', (e) => { st.general = e.target.checked; pintar(); });
  $('k-mesas').addEventListener('change', (e) => {
    const id = e.target.dataset.mesa; if (!id) return;
    if (e.target.checked) st.sel.add(id); else st.sel.delete(id);
    pintar();
  });
  $('k-logo').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 600 * 1024) { alert('El logo pesa mucho (máx. 600 KB). Usa un PNG o SVG más pequeño.'); return; }
    const fr = new FileReader();
    fr.onload = () => { st.logo = fr.result; store.set(kLogo(), st.logo); pintar(); galeria(); };
    fr.readAsDataURL(f);
  });
  $('k-quitar-logo').addEventListener('click', () => { st.logo = ''; store.del(kLogo()); $('k-logo').value = ''; pintar(); galeria(); });
  $('k-imprimir').addEventListener('click', () => window.print());

  iniciar();
})();
