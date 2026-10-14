// Gestión del restaurante: carta, alérgenos, mesas + NFC/QR, ajustes, claves y resumen del día.
(function () {
  const { rpc, esc, dinero, toast, aplicarColor, store, ALERGENOS, urlMesa, urlRestaurante } = window.Carta;
  const $ = (id) => document.getElementById(id);
  const K_SESION = 'carta:admin';

  let sesion = null;
  let d = null; // última respuesta de carta_admin

  // ---------------------------------------------------------------- sesión ----
  function iniciar() {
    const qs = new URLSearchParams(location.search);
    if (qs.get('r') && qs.get('k')) {
      sesion = { slug: qs.get('r').toLowerCase(), clave: qs.get('k') };
      history.replaceState(null, '', location.pathname);
    } else {
      sesion = store.get(K_SESION, null) || store.get('carta:cocina', null);
    }
    if (!sesion) return mostrarLogin();
    entrar(true);
  }

  function mostrarLogin(msg) {
    $('app').hidden = true;
    $('login').hidden = false;
    $('login-error').textContent = msg || '';
    if (sesion) $('login-slug').value = sesion.slug;
  }

  async function entrar(silencioso) {
    try {
      d = await rpc('carta_admin', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: 'datos', p_datos: {} });
    } catch (e) {
      if (e.code === 'clave_incorrecta') { store.del(K_SESION); return mostrarLogin(silencioso ? '' : 'Restaurante o clave incorrectos.'); }
      return mostrarLogin(e.humano);
    }
    store.set(K_SESION, sesion);
    $('login').hidden = true;
    $('app').hidden = false;
    pintar();
  }

  async function op(accion, datos, okMsg) {
    try {
      const res = await rpc('carta_admin', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: accion, p_datos: datos || {} });
      d = res;
      pintar();
      if (okMsg) toast(okMsg);
      return res;
    } catch (e) {
      if (e.code === 'clave_incorrecta') { store.del(K_SESION); mostrarLogin('Sesión caducada. Vuelve a entrar.'); }
      else toast(e.humano, 'error');
      return null;
    }
  }

  // ---------------------------------------------------------------- render ----
  function pintar() {
    const r = d.restaurante;
    aplicarColor(r.color);
    document.title = 'Gestión · ' + r.nombre;
    $('a-nombre').textContent = r.nombre;
    $('a-ver').href = urlRestaurante(r.slug);
    pintarCarta();
    pintarMesas();
    pintarAjustes();
    pintarHoy();
  }

  function pintarCarta() {
    const m = d.restaurante.moneda;
    const grupos = d.categorias.map((c) => ({ c, prods: d.productos.filter((p) => p.categoria_id === c.id) }));
    const sueltos = d.productos.filter((p) => !p.categoria_id);
    if (sueltos.length) grupos.push({ c: null, prods: sueltos });
    $('carta-lista').innerHTML = grupos.length ? grupos.map(({ c, prods }, i) => `
      <div class="cat-block">
        <div class="cat-head">
          <h2>${c ? esc(c.nombre) : 'Sin categoría'} ${c && !c.activa ? '<span class="chip">Oculta</span>' : ''}</h2>
          ${c ? `<div class="acc">
            <button class="btn sm ghost" data-cat-subir="${c.id}" ${i === 0 ? 'disabled' : ''} aria-label="Subir categoría">↑</button>
            <button class="btn sm ghost" data-cat-bajar="${c.id}" ${i >= d.categorias.length - 1 ? 'disabled' : ''} aria-label="Bajar categoría">↓</button>
            <button class="btn sm" data-cat-renombrar="${c.id}">Renombrar</button>
            <button class="btn sm" data-cat-activa="${c.id}">${c.activa ? 'Ocultar' : 'Mostrar'}</button>
            <button class="btn sm ghost danger" data-cat-borrar="${c.id}" aria-label="Borrar categoría">🗑</button>
          </div>` : ''}
        </div>
        <div class="card">
          ${prods.length ? prods.map((p) => `
            <div class="prod-row${p.disponible ? '' : ' agotado'}">
              <div class="nom"><strong>${esc(p.nombre)}</strong>
                <span class="muted small">${p.alergenos.length ? p.alergenos.map((a) => ALERGENOS[a] || a).join(', ') : 'Sin alérgenos marcados'}</span></div>
              <span class="num" style="font-weight:700">${dinero(p.precio, m)}</span>
              <button class="btn sm sw ${p.disponible ? 'on' : 'off'}" data-disp="${p.id}" aria-pressed="${!p.disponible}">${p.disponible ? '● Disponible' : '○ Agotado'}</button>
              <div class="acc">
                <button class="btn sm" data-editar="${p.id}">Editar</button>
                <button class="btn sm ghost danger" data-borrar-prod="${p.id}" aria-label="Borrar ${esc(p.nombre)}">🗑</button>
              </div>
            </div>`).join('') : '<div class="prod-row muted small">Sin productos todavía.</div>'}
        </div>
      </div>`).join('') : '<div class="card pad"><p>Tu carta está vacía. Empieza creando una categoría (Tapas, Bebidas…) y luego añade productos.</p></div>';
  }

  function pintarMesas() {
    const r = d.restaurante;
    $('row-general').innerHTML = filaNfc({ nombre: 'Carta general', url: urlRestaurante(r.slug), archivo: 'carta-' + r.slug });
    $('nfc-soporte').textContent = 'NDEFReader' in window ? '✓ Este móvil puede grabar NFC directamente.' : 'Para grabar NFC desde aquí usa Chrome en Android (o la app NFC Tools).';
    $('mesas-lista').innerHTML = d.mesas.length ? d.mesas.map((m) => `
      <div class="mesa-row${m.activa ? '' : ' inactiva'}">
        <div class="nom"><strong>${esc(m.nombre)}</strong><code>${esc(urlMesa(m.codigo))}</code></div>
        <div class="acc" style="flex-wrap:wrap">
          <button class="btn sm primary" data-nfc="${esc(urlMesa(m.codigo))}" data-nombre="${esc(m.nombre)}">📶 Grabar NFC</button>
          <button class="btn sm" data-qr="${esc(urlMesa(m.codigo))}" data-nombre="${esc(m.nombre)}">QR</button>
          <button class="btn sm" data-copiar="${esc(urlMesa(m.codigo))}">Copiar</button>
          <button class="btn sm" data-mesa-renombrar="${m.id}">Renombrar</button>
          <button class="btn sm" data-mesa-activa="${m.id}">${m.activa ? 'Desactivar' : 'Activar'}</button>
          <button class="btn sm ghost" data-mesa-codigo="${m.id}" title="Nuevo código: el NFC/QR antiguo deja de funcionar">↻ Código</button>
          <button class="btn sm ghost danger" data-mesa-borrar="${m.id}" aria-label="Borrar ${esc(m.nombre)}">🗑</button>
        </div>
      </div>`).join('') : '<div class="mesa-row muted">Aún no hay mesas. Créalas arriba.</div>';
  }

  function filaNfc({ nombre, url }) {
    return `<div class="nom"><strong>${esc(nombre)}</strong><code>${esc(url)}</code></div>
      <div class="acc" style="flex-wrap:wrap">
        <button class="btn sm primary" data-nfc="${esc(url)}" data-nombre="${esc(nombre)}">📶 Grabar NFC</button>
        <button class="btn sm" data-qr="${esc(url)}" data-nombre="${esc(nombre)}">QR</button>
        <button class="btn sm" data-copiar="${esc(url)}">Copiar</button>
      </div>`;
  }

  function pintarAjustes() {
    const r = d.restaurante;
    if (document.activeElement && $('form-ajustes').contains(document.activeElement)) return;
    $('aj-nombre').value = r.nombre;
    $('aj-mensaje').value = r.mensaje || '';
    $('aj-color').value = r.color;
    $('aj-web').value = r.web_carta || '';
    $('aj-abiertos').checked = r.pedidos_abiertos;
    $('aj-libre').checked = r.mesa_libre;
  }

  function pintarHoy() {
    const m = d.restaurante.moneda;
    $('hoy-pedidos').textContent = d.hoy.pedidos;
    $('hoy-total').textContent = dinero(d.hoy.total, m);
    $('hoy-top').innerHTML = d.top.length ? d.top.map((t) =>
      `<div class="top-row"><span>${esc(t.cantidad)}× ${esc(t.nombre)}</span><span class="num">${dinero(t.importe, m)}</span></div>`).join('')
      : '<p class="muted">Todavía no hay pedidos hoy.</p>';
  }

  // ------------------------------------------------------------ productos ----
  function abrirProducto(p) {
    $('prod-titulo').textContent = p ? 'Editar producto' : 'Nuevo producto';
    $('p-id').value = p ? p.id : '';
    $('p-nombre').value = p ? p.nombre : '';
    $('p-precio').value = p ? String(p.precio).replace('.', ',') : '';
    $('p-descripcion').value = p ? p.descripcion || '' : '';
    $('p-imagen').value = p ? p.imagen_url || '' : '';
    $('p-disponible').checked = p ? p.disponible : true;
    $('p-categoria').innerHTML = '<option value="">Sin categoría</option>' + d.categorias.map((c) =>
      `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
    $('p-categoria').value = p ? p.categoria_id || '' : (d.categorias[0] ? d.categorias[0].id : '');
    const sel = new Set(p ? p.alergenos : []);
    $('p-alergenos').innerHTML = Object.entries(ALERGENOS).map(([k, v]) =>
      `<label class="check"><input type="checkbox" value="${k}" ${sel.has(k) ? 'checked' : ''}> ${v}</label>`).join('');
    $('dlg-producto').showModal();
    $('p-nombre').focus();
  }

  async function guardarProducto(ev) {
    ev.preventDefault();
    const precio = $('p-precio').value.trim().replace(',', '.');
    if (!/^\d{1,5}(\.\d{1,2})?$/.test(precio)) { toast('Precio no válido. Ejemplo: 3,50', 'error'); return; }
    const p = {
      id: $('p-id').value || null,
      nombre: $('p-nombre').value.trim(),
      precio,
      categoria_id: $('p-categoria').value || null,
      descripcion: $('p-descripcion').value.trim(),
      imagen_url: $('p-imagen').value.trim(),
      disponible: $('p-disponible').checked,
      alergenos: [...$('p-alergenos').querySelectorAll('input:checked')].map((i) => i.value),
    };
    if (p.imagen_url && !/^https:\/\//.test(p.imagen_url)) { toast('La foto debe ser un enlace https://', 'error'); return; }
    $('p-guardar').disabled = true;
    const ok = await op('producto', p, 'Producto guardado');
    $('p-guardar').disabled = false;
    if (ok) $('dlg-producto').close();
  }

  async function moverCategoria(id, dir) {
    const cats = d.categorias;
    const i = cats.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cats.length) return;
    // Reasigna órdenes consecutivos para que el intercambio sea siempre efectivo.
    const nuevo = cats.slice();
    [nuevo[i], nuevo[j]] = [nuevo[j], nuevo[i]];
    for (let k = 0; k < nuevo.length; k++) {
      if (nuevo[k].orden !== k + 1) await op('categoria', { id: nuevo[k].id, nombre: nuevo[k].nombre, orden: k + 1 });
    }
  }

  // ------------------------------------------------------------ NFC y QR ----
  function qrSvg(url) {
    const qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return qr;
  }

  function abrirQr(url, nombre) {
    const qr = qrSvg(url);
    $('qr-titulo').textContent = nombre;
    $('qr-img').innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    $('qr-url').textContent = url;
    $('qr-descargar').href = qr.createDataURL(10, 4);
    $('qr-descargar').download = 'qr-' + nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.gif';
    $('dlg-qr').showModal();
  }

  let nfcAbort = null;
  async function grabarNfc(url, nombre) {
    $('nfc-titulo').textContent = 'Grabar NFC · ' + nombre;
    if (!('NDEFReader' in window)) {
      $('nfc-body').innerHTML = `
        <p>Este navegador no puede grabar NFC directamente (solo Chrome en Android lo permite).</p>
        <p><strong>Con la app gratuita NFC Tools</strong> (Android/iPhone):</p>
        <ol><li>Escribir → Añadir un registro → <b>URL / URI</b></li>
        <li>Pega este enlace:<div class="secreto"><code>${esc(url)}</code></div></li>
        <li>Escribir → acerca la etiqueta NFC de <b>${esc(nombre)}</b>.</li></ol>
        <button class="btn" data-copiar="${esc(url)}">Copiar enlace</button>`;
      $('dlg-nfc').showModal();
      return;
    }
    nfcAbort = new AbortController();
    $('nfc-body').innerHTML = `<p style="font-size:44px;text-align:center;margin:8px 0">📶</p>
      <p style="text-align:center"><strong>Acerca la etiqueta NFC de ${esc(nombre)}</strong> a la parte trasera del móvil…</p>
      <p class="small muted" style="text-align:center;word-break:break-all">${esc(url)}</p>`;
    $('dlg-nfc').showModal();
    try {
      const ndef = new window.NDEFReader();
      await ndef.write({ records: [{ recordType: 'url', data: url }] }, { signal: nfcAbort.signal });
      $('nfc-body').innerHTML = `<p style="font-size:44px;text-align:center;margin:8px 0">✅</p><p style="text-align:center"><strong>NFC de ${esc(nombre)} grabado.</strong><br>Pruébalo acercando otro móvil.</p>`;
      if (navigator.vibrate) navigator.vibrate(200);
    } catch (e) {
      if (e.name === 'AbortError') return;
      $('nfc-body').innerHTML = `<p>No se pudo grabar: ${esc(e.message || e.name)}.</p><p class="small muted">Comprueba que el NFC del móvil está activado y que la etiqueta no está bloqueada (solo lectura).</p>`;
    }
  }

  function imprimirQrs() {
    const activas = d.mesas.filter((m) => m.activa);
    if (!activas.length) { toast('No hay mesas activas', 'error'); return; }
    const w = window.open('', '_blank');
    if (!w) { toast('Permite las ventanas emergentes para imprimir', 'error'); return; }
    const r = d.restaurante;
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>QRs · ${esc(r.nombre)}</title><style>
      body{font-family:system-ui,sans-serif;margin:0;padding:10mm;color:#000;background:#fff}
      .g{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}
      .q{border:1px dashed #999;border-radius:4mm;padding:5mm;text-align:center;break-inside:avoid}
      .q svg{width:42mm;height:42mm}.q h2{margin:2mm 0 0;font-size:16pt}.q p{margin:1mm 0 0;font-size:9pt;color:#444}
      @media print{.no{display:none}}</style></head><body>
      <p class="no"><button onclick="print()">Imprimir</button></p><div class="g">
      ${activas.map((m) => `<div class="q">${qrSvg(urlMesa(m.codigo)).createSvgTag({ cellSize: 4, margin: 0, scalable: true })}
        <h2>${esc(m.nombre)}</h2><p>Escanea o acerca el móvil para pedir</p></div>`).join('')}
      </div></body></html>`);
    w.document.close();
  }

  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); toast('Copiado'); }
    catch { prompt('Copia el enlace:', texto); }
  }

  function mostrarSecreto(contenedor, titulo, url) {
    $(contenedor).innerHTML = `<div class="secreto"><strong>${esc(titulo)}</strong><br><code>${esc(url)}</code>
      <div class="acc"><button class="btn sm" data-copiar="${esc(url)}">Copiar</button>
      <button class="btn sm" data-qr="${esc(url)}" data-nombre="${esc(titulo)}">QR para escanear con la tablet</button></div>
      <p class="small muted">Guárdalo ahora: por seguridad no se vuelve a mostrar.</p></div>`;
  }

  // ----------------------------------------------------------- facturación ----
  let fzDatos = null;
  const ENVIO = { pendiente: 'Pendiente de envío (Fase 2)', no_aplica: 'No se envía', correcto: 'Enviado ✓',
    aceptado_con_errores: 'Aceptado con errores', incorrecto: 'Rechazado', enviado: 'Enviado' };

  async function fz(accion, datos, okMsg) {
    try {
      fzDatos = await rpc('fiscal_admin', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: accion, p_datos: datos || {} });
      pintarFacturacion();
      if (okMsg) toast(okMsg);
      return fzDatos;
    } catch (e) {
      if (e.code === 'sin_config' || /function|schema/i.test(e.message)) $('fz-estado').innerHTML = '<p>El módulo de facturación aún no está instalado.</p>';
      else toast(e.humano, 'error');
      return null;
    }
  }

  function pintarFacturacion() {
    const f = fzDatos, t = f.titular, m = d ? d.restaurante.moneda : 'EUR';
    const activo = t && t.modo_sif !== 'desactivado';
    $('fz-estado').innerHTML = `
      <h2>Estado ${activo ? '<span class="chip" style="background:#d7f5df;color:#14632e">Activa</span>' : '<span class="chip">Desactivada</span>'}</h2>
      <p class="muted small" style="margin:6px 0 0">${activo
        ? `Al cobrar una mesa en el panel de comandas se emite el ticket (${esc(t.modo_sif === 'verifactu' ? 'VERI*FACTU' : 'No VERI*FACTU')}, entorno de <b>${esc(t.entorno_aeat)}</b>). Los registros se guardan encadenados; el envío a la AEAT llega en la Fase 2.`
        : 'Rellena los datos fiscales para que el panel de comandas emita tickets al cobrar. Mientras tanto, el panel funciona como siempre.'}</p>
      ${f.sif && Number(f.sif.registros) ? `<p class="small" style="margin:10px 0 0">Registros VERI*FACTU: <b>${f.sif.registros}</b> · pendientes de envío: <b>${f.sif.pendientes}</b></p>
        <p class="fz-huella">Última huella: ${esc(f.sif.ultima_huella)}</p>` : ''}`;
    if (!(document.activeElement && $('form-fiscal').contains(document.activeElement))) {
      const v = t || {};
      $('fz-nif').value = v.nif || '';
      $('fz-tipo').value = v.tipo_persona || 'fisica';
      $('fz-razon').value = v.razon_social || '';
      $('fz-comercial').value = v.nombre_comercial || (t ? '' : (d && d.restaurante.nombre) || '');
      $('fz-domicilio').value = v.domicilio || '';
      $('fz-cp').value = v.codigo_postal || '';
      $('fz-municipio').value = v.municipio || '';
      $('fz-provincia').value = v.provincia || '';
      $('fz-regiva').value = v.regimen_iva || 'general';
      $('fz-renta').value = v.regimen_renta || '';
      $('fz-modo').value = v.modo_sif || 'verifactu';
      $('fz-entorno').value = 'pruebas';
      $('fz-iva').value = String(Number(v.iva_defecto || 10));
      $('fz-limite').value = String(Number(v.limite_simplificada || 3000)).replace('.', ',');
      $('fz-serie-t').value = v.serie_tickets || 'T';
      $('fz-serie-f').value = v.serie_facturas || 'F';
      $('fz-pie').value = v.pie_ticket || '';
    }
    const def = t ? Number(t.iva_defecto) : 10;
    $('fz-iva-cats').innerHTML = f.categorias.length ? f.categorias.map((c) => `
      <div class="fz-cat"><span>${esc(c.nombre)}</span>
        <select data-iva-cat="${c.id}" aria-label="IVA de ${esc(c.nombre)}">
          <option value="" ${c.iva == null ? 'selected' : ''}>Por defecto (${def} %)</option>
          ${[10, 21, 4].map((x) => `<option value="${x}" ${Number(c.iva) === x && c.iva != null ? 'selected' : ''}>${x} %</option>`).join('')}
        </select></div>`).join('') : '<p class="muted">Sin categorías.</p>';
    $('fz-docs').innerHTML = f.documentos.length ? f.documentos.map((x) => `
      <div class="fz-doc"><div class="n"><strong>${esc(x.num_serie)}</strong> · ${esc(x.tipo === 'F1' ? 'Factura' : 'Ticket')}
        <div class="muted small">${new Date(x.expedido).toLocaleString('es-ES')} · ${esc(x.mesa || '')} · ${esc(ENVIO[x.envio] || x.envio || '')}</div></div>
        <span class="num" style="font-weight:700">${dinero(x.total, m)}</span>
        <a class="btn sm" href="/ticket.html?t=${encodeURIComponent(x.token)}" target="_blank" rel="noopener">Ver</a></div>`).join('')
      : '<p class="muted">Todavía no hay tickets.</p>';
  }

  $('form-fiscal').addEventListener('submit', (ev) => {
    ev.preventDefault();
    document.activeElement.blur();
    const limite = $('fz-limite').value.trim().replace(',', '.');
    fz('titular', {
      nif: $('fz-nif').value.trim(), tipo_persona: $('fz-tipo').value, razon_social: $('fz-razon').value.trim(),
      nombre_comercial: $('fz-comercial').value.trim(), domicilio: $('fz-domicilio').value.trim(),
      codigo_postal: $('fz-cp').value.trim(), municipio: $('fz-municipio').value.trim(), provincia: $('fz-provincia').value.trim(),
      regimen_iva: $('fz-regiva').value, regimen_renta: $('fz-renta').value, modo_sif: $('fz-modo').value,
      entorno_aeat: 'pruebas', iva_defecto: $('fz-iva').value, limite_simplificada: limite || '3000',
      serie_tickets: $('fz-serie-t').value.trim(), serie_facturas: $('fz-serie-f').value.trim(), pie_ticket: $('fz-pie').value.trim(),
    }, 'Datos fiscales guardados');
  });
  document.addEventListener('change', (ev) => {
    const id = ev.target.dataset && ev.target.dataset.ivaCat;
    if (id) fz('iva_categoria', { id, iva: ev.target.value || null }, 'IVA actualizado');
  });

  // --------------------------------------------------------------- eventos ----
  $('login-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    sesion = { slug: $('login-slug').value.trim().toLowerCase(), clave: $('login-clave').value.trim() };
    entrar(false);
  });
  $('form-producto').addEventListener('submit', guardarProducto);

  $('form-mesas').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const desde = parseInt($('m-desde').value, 10), hasta = parseInt($('m-hasta').value, 10);
    op('crear_mesas', { prefijo: $('m-prefijo').value.trim() || 'Mesa', desde, hasta }, 'Mesas creadas');
  });

  $('form-ajustes').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    document.activeElement.blur();
    await op('ajustes', {
      nombre: $('aj-nombre').value.trim(), mensaje: $('aj-mensaje').value.trim(), color: $('aj-color').value,
      web_carta: $('aj-web').value.trim(),
      pedidos_abiertos: $('aj-abiertos').checked, mesa_libre: $('aj-libre').checked,
    }, 'Ajustes guardados');
  });

  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const ds = b.dataset;
    const cat = (id) => d.categorias.find((c) => c.id === id);
    const mesa = (id) => d.mesas.find((m) => m.id === id);

    if (ds.tab) {
      document.querySelectorAll('[data-tab]').forEach((t) => t.setAttribute('aria-selected', String(t === b)));
      ['carta', 'mesas', 'ajustes', 'hoy', 'facturacion'].forEach((t) => { $('t-' + t).hidden = t !== ds.tab; });
      if (ds.tab === 'hoy') op('datos');
      if (ds.tab === 'facturacion') fz('datos');
    } else if (ds.cerrar !== undefined) {
      if (nfcAbort) { nfcAbort.abort(); nfcAbort = null; }
      b.closest('dialog').close();
    } else if (b.id === 'nuevo-producto') abrirProducto(null);
    else if (b.id === 'nueva-categoria') {
      const n = prompt('Nombre de la categoría (ej.: Tapas, Bebidas, Postres):');
      if (n && n.trim()) op('categoria', { nombre: n.trim() }, 'Categoría creada');
    } else if (ds.editar) abrirProducto(d.productos.find((p) => p.id === ds.editar));
    else if (ds.disp) {
      const p = d.productos.find((x) => x.id === ds.disp);
      op('disponible', { id: p.id, disponible: !p.disponible }, p.disponible ? `${p.nombre}: agotado` : `${p.nombre}: disponible`);
    } else if (ds.borrarProd) {
      const p = d.productos.find((x) => x.id === ds.borrarProd);
      if (confirm(`¿Borrar "${p.nombre}" de la carta?`)) op('borrar_producto', { id: p.id }, 'Producto borrado');
    } else if (ds.catRenombrar) {
      const c = cat(ds.catRenombrar);
      const n = prompt('Nuevo nombre:', c.nombre);
      if (n && n.trim()) op('categoria', { id: c.id, nombre: n.trim() });
    } else if (ds.catActiva) {
      const c = cat(ds.catActiva);
      op('categoria', { id: c.id, nombre: c.nombre, activa: !c.activa });
    } else if (ds.catBorrar) {
      const c = cat(ds.catBorrar);
      if (confirm(`¿Borrar la categoría "${c.nombre}"? Sus productos pasarán a "Sin categoría".`)) op('borrar_categoria', { id: c.id });
    } else if (ds.catSubir) moverCategoria(ds.catSubir, -1);
    else if (ds.catBajar) moverCategoria(ds.catBajar, +1);
    else if (ds.nfc) grabarNfc(ds.nfc, ds.nombre);
    else if (ds.qr) abrirQr(ds.qr, ds.nombre);
    else if (ds.copiar) copiar(ds.copiar);
    else if (b.id === 'imprimir-qrs') imprimirQrs();
    else if (b.id === 'mesa-suelta') {
      const n = prompt('Nombre de la mesa (ej.: Barra 1, Terraza 3):');
      if (n && n.trim()) op('mesa', { nombre: n.trim() }, 'Mesa creada');
    } else if (ds.mesaRenombrar) {
      const m = mesa(ds.mesaRenombrar);
      const n = prompt('Nuevo nombre:', m.nombre);
      if (n && n.trim()) op('mesa', { id: m.id, nombre: n.trim() });
    } else if (ds.mesaActiva) {
      const m = mesa(ds.mesaActiva);
      op('mesa', { id: m.id, nombre: m.nombre, activa: !m.activa });
    } else if (ds.mesaCodigo) {
      const m = mesa(ds.mesaCodigo);
      if (confirm(`¿Generar un código nuevo para ${m.nombre}?\nEl NFC/QR actual dejará de funcionar y tendrás que volver a grabarlo.`)) op('regenerar_mesa', { id: m.id }, 'Código regenerado: vuelve a grabar el NFC');
    } else if (ds.mesaBorrar) {
      const m = mesa(ds.mesaBorrar);
      if (confirm(`¿Borrar ${m.nombre}? Su NFC dejará de funcionar.`)) op('borrar_mesa', { id: m.id }, 'Mesa borrada');
    } else if (b.id === 'clave-cocina') {
      if (!confirm('Se generará una clave nueva y la anterior dejará de funcionar en las tablets. ¿Continuar?')) return;
      const res = await op('regenerar_clave', { tipo: 'cocina' });
      if (res) mostrarSecreto('clave-cocina-out', 'Enlace del panel de cocina', `${location.origin}/cocina.html?r=${encodeURIComponent(sesion.slug)}&k=${encodeURIComponent(res.clave)}`);
    } else if (b.id === 'clave-admin') {
      if (!confirm('Se generará una clave de admin nueva. ¿Continuar?')) return;
      const res = await op('regenerar_clave', { tipo: 'admin' });
      if (res) {
        sesion.clave = res.clave;
        store.set(K_SESION, sesion);
        mostrarSecreto('clave-admin-out', 'Nuevo enlace de administración', `${location.origin}/admin.html?r=${encodeURIComponent(sesion.slug)}&k=${encodeURIComponent(res.clave)}`);
      }
    } else if (b.id === 'a-salir') {
      store.del(K_SESION);
      sesion = null;
      mostrarLogin();
    }
  });

  iniciar();
})();
