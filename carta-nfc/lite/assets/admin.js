// Gestión del restaurante (Solo pedidos): agotados, mesas + NFC/QR, ajustes, claves e informes.
// La carta y los precios solo se editan en "Modo VISAX" (con la clave de plataforma): lo hace VISAX AI, va en la cuota.
(function () {
  const { rpc, esc, dinero, toast, aplicarColor, aplicarTema, store, ALERGENOS, urlMesa, urlRestaurante, qr, imprimir } = window.Carta;
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
    cargarCodigoMesa();
    cargarHoy();
    if (leerVisax()) comprobarEditor(leerVisax());
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
    aplicarTema(r.slug);
    document.title = 'Gestión · ' + r.nombre;
    $('a-nombre').textContent = r.nombre;
    $('a-ver').href = urlRestaurante(r.slug);
    pintarCarta();
    pintarMesas();
    pintarAjustes();
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
          ${c && editor ? `<div class="acc">
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
              <div class="nom"><strong>${esc(p.nombre)}</strong>${extras && extras.opciones && extras.opciones[p.id] ? ' <span class="chip">⚙ opciones</span>' : ''}
                <span class="muted small">${p.alergenos.length ? p.alergenos.map((a) => ALERGENOS[a] || a).join(', ') : 'Sin alérgenos marcados'}</span></div>
              <span class="num" style="font-weight:700">${dinero(p.precio, m)}</span>
              <button class="btn sm sw ${p.disponible ? 'on' : 'off'}" data-disp="${p.id}" aria-pressed="${!p.disponible}">${p.disponible ? '● Disponible' : '○ Agotado'}</button>
              ${editor ? `<div class="acc">
                <button class="btn sm" data-editar="${p.id}">Editar</button>
                <button class="btn sm ghost danger" data-borrar-prod="${p.id}" aria-label="Borrar ${esc(p.nombre)}">🗑</button>
              </div>` : ''}
            </div>`).join('') : '<div class="prod-row muted small">Sin productos todavía.</div>'}
        </div>
      </div>`).join('') : `<div class="card pad"><p>${editor ? 'La carta está vacía. Crea una categoría (Tapas, Bebidas…) y luego los productos.'
      : 'Tu carta aún está vacía: te la montamos nosotros.'}</p></div>`;
  }

  // Modo VISAX: solo con la clave de plataforma salen los botones para crear, editar, borrar y cambiar precios.
  // Se guarda solo en esta pestaña (sessionStorage), igual que en alta.html.
  const K_VISAX = 'carta:plataforma';
  let editor = false;
  const leerVisax = () => { try { return sessionStorage.getItem(K_VISAX); } catch { return null; } };
  async function comprobarEditor(clave) {
    editor = false;
    if (clave) {
      try {
        await rpc('carta_plataforma', { p_clave: clave, p_accion: 'listar', p_datos: {} });
        editor = true;
        try { sessionStorage.setItem(K_VISAX, clave); } catch { /* */ }
      } catch (e) {
        if (e.code === 'clave_incorrecta') { try { sessionStorage.removeItem(K_VISAX); } catch { /* */ } }
        toast(e.code === 'clave_incorrecta' ? 'Clave de VISAX incorrecta.' : e.humano, 'error');
      }
    }
    $('editor-toolbar').hidden = !editor;
    $('editor-entrar').hidden = editor;
    $('aviso-carta').hidden = editor;
    if (d) pintarCarta();
    return editor;
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
    $('aj-abiertos').checked = r.pedidos_abiertos;
    $('aj-libre').checked = r.mesa_libre;
    if (codigoMesa !== null) $('aj-codigo').checked = codigoMesa;
  }

  // Código de mesa (009), WiFi, reseñas y opciones por plato (010): se leen y se cambian con carta_panel.
  let codigoMesa = null;
  let extras = null;  // carta_panel con la clave del dueño (null si la base de datos aún no tiene 010)
  const panel = (accion, datos) => rpc('carta_panel', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: accion || 'datos', p_datos: datos || {} });
  async function cargarCodigoMesa() {
    try {
      const r = await panel();
      codigoMesa = !!r.codigo_mesa;
      $('aj-codigo').checked = codigoMesa;
      extras = 'opciones' in r ? r : null;
    } catch { $('aj-codigo').closest('label').hidden = true; }
    pintarExtras();
    pintarCarta();
  }

  function pintarExtras() {
    $('form-extras').hidden = !extras;
    $('tab-opiniones').hidden = !extras;
    $('p-opciones-box').hidden = !extras;
    if (!extras || $('form-extras').contains(document.activeElement)) return;
    $('ex-wifi-red').value = extras.wifi_red || '';
    $('ex-wifi-clave').value = extras.wifi_clave || '';
    $('ex-resena').value = extras.resena_url || '';
    $('ex-trivia').checked = !!extras.trivia;
  }

  // "Hoy": ventas y pedidos (carta_informe de hoy), mesas con consumo, valoración de 30 días y quién gana el trivial.
  async function cargarHoy() {
    try {
      const [inf, pan] = await Promise.all([
        rpc('carta_informe', { p_slug: sesion.slug, p_clave: sesion.clave, p_filtro: {} }),
        panel().catch(() => null),
      ]);
      const m = d.restaurante.moneda, k = inf.kpis;
      const val = pan && pan.valoracion && pan.valoracion.n ? pan.valoracion : null;
      $('hoy-strip').innerHTML = `<span class="muted">Hoy</span>
        <span><b class="num">${dinero(k.ventas, m)}</b> vendido</span>
        <span><b class="num">${esc(k.pedidos)}</b> pedido${k.pedidos === 1 ? '' : 's'}</span>
        ${pan && 'mesas_activas' in pan ? `<span><b class="num">${esc(pan.mesas_activas)}/${esc(pan.mesas.length)}</b> mesas con consumo</span>` : ''}
        ${val ? `<span>⭐ <b class="num">${media1(val.media)}</b> <small class="muted">(${esc(val.n)} opiniones, 30 días)</small></span>` : ''}
        ${pan && pan.trivia_top && pan.trivia_top.length ? `<span>🧠 Trivial: <b>${esc(pan.trivia_top[0].nombre)}</b> <small class="muted">${esc(pan.trivia_top[0].mesa)} · ${esc(pan.trivia_top[0].puntos)}/10</small></span>` : ''}`;
      $('hoy-strip').hidden = false;
    } catch { $('hoy-strip').hidden = true; }
  }

  const media1 = (x) => Number(x).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  async function cargarOpiniones() {
    try {
      const r = await panel('opiniones');
      const ops = r.opiniones || [], val = r.valoracion;
      const fecha = (t) => new Date(t).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      $('opiniones').innerHTML = `
        ${val && val.n ? `<div class="op-media"><b class="num">⭐ ${media1(val.media)}</b><span class="muted">${esc(val.n)} opiniones en los últimos 30 días</span></div>` : ''}
        ${extras && !extras.resena_url ? '<p class="small muted">Consejo: pon tu enlace de reseñas de Google en Ajustes → WiFi, reseñas y trivial.</p>' : ''}
        ${ops.length ? ops.map((o) => `<div class="op-row"><span class="est" aria-label="${esc(o.estrellas)} de 5">${'★'.repeat(o.estrellas)}${'☆'.repeat(5 - o.estrellas)}</span>
          <span class="muted small"> · ${esc(o.mesa)} · ${fecha(o.creado)}</span>${o.comentario ? `<p>${esc(o.comentario)}</p>` : ''}</div>`).join('')
          : '<p class="muted">Aún no hay opiniones. Salen al pedir la cuenta o al liberar la mesa.</p>'}`;
    } catch (e) { $('opiniones').innerHTML = `<p class="muted">${esc(e.humano || 'No se pudieron cargar las opiniones.')}</p>`; }
  }

  // "Punto: Poco hecho, Al punto, Hecho" ⇄ [{ nombre, valores }]
  const opcionesATexto = (ops) => (ops || []).map((g) => `${g.nombre}: ${g.valores.join(', ')}`).join('\n');
  function textoAOpciones(txt) {
    const lineas = txt.split('\n').map((l) => l.trim()).filter(Boolean);
    return lineas.map((l) => {
      const i = l.indexOf(':');
      if (i < 1) throw new Error('Cada línea: "Nombre: opción, opción". Ejemplo: Punto: Poco hecho, Al punto, Hecho');
      const valores = l.slice(i + 1).split(',').map((v) => v.trim()).filter(Boolean);
      if (valores.length < 2) throw new Error(`"${l.slice(0, i)}" necesita al menos 2 opciones separadas por comas.`);
      return { nombre: l.slice(0, i).trim(), valores };
    });
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
    $('p-opciones').value = p && extras && extras.opciones ? opcionesATexto(extras.opciones[p.id]) : '';
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
    let opciones = null;
    if (extras) {
      try { opciones = textoAOpciones($('p-opciones').value); } catch (e) { toast(e.message, 'error'); return; }
    }
    $('p-guardar').disabled = true;
    const ok = await op('producto', p, 'Producto guardado');
    if (ok && extras) {
      const id = p.id || ok.id;
      const antes = JSON.stringify(extras.opciones[id] || []);
      if (id && antes !== JSON.stringify(opciones)) {
        try { extras = await panel('opciones', { id, opciones }); pintarCarta(); }
        catch (e) { toast(e.humano, 'error'); $('p-guardar').disabled = false; return; }
      }
    }
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
  function abrirQr(url, nombre) {
    const q = qr(url);
    $('qr-titulo').textContent = nombre;
    $('qr-img').innerHTML = q.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    $('qr-url').textContent = url;
    $('qr-descargar').href = q.createDataURL(10, 4);
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

  // Hoja A4 con el QR de cada mesa (para el adhesivo junto al NFC) y el de la carta general.
  function imprimirQrs() {
    const activas = d.mesas.filter((m) => m.activa);
    if (!activas.length) { toast('No hay mesas activas', 'error'); return; }
    const r = d.restaurante;
    const tarjeta = (url, nombre, texto) => `<div class="q">${qr(url).createSvgTag({ cellSize: 4, margin: 0, scalable: true })}
      <h2>${esc(nombre)}</h2><p>${texto}</p></div>`;
    imprimir(`<div class="g">${activas.map((m) => tarjeta(urlMesa(m.codigo), m.nombre, 'Escanea o acerca el móvil para pedir')).join('')}
      ${tarjeta(urlRestaurante(r.slug), 'Carta general', 'Escanea, pide y elige tu mesa')}</div>`,
    `body{font-family:system-ui,sans-serif;margin:0;padding:10mm;color:#000;background:#fff}
      .g{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}
      .q{border:1px dashed #999;border-radius:4mm;padding:5mm;text-align:center;break-inside:avoid}
      .q svg{width:42mm;height:42mm}.q h2{margin:2mm 0 0;font-size:16pt}.q p{margin:1mm 0 0;font-size:9pt;color:#444}`);
  }

  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); toast('Copiado'); }
    catch { prompt('Copia el enlace:', texto); }
  }

  function mostrarSecreto(contenedor, titulo, url) {
    $(contenedor).innerHTML = `<div class="secreto"><strong>${esc(titulo)}</strong><br><code>${esc(url)}</code>
      <div class="acc"><button class="btn sm" data-copiar="${esc(url)}">Copiar</button>
      <button class="btn sm" data-qr="${esc(url)}" data-nombre="${esc(titulo)}">QR para escanear con el móvil del bar</button></div>
      <p class="small muted">Guárdalo ahora: por seguridad no se vuelve a mostrar.</p></div>`;
  }

  let informes = null;  // pestaña Informes (CartaInformes)

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
    const quiereCodigo = $('aj-codigo').checked;  // se lee antes: al guardar se repintan los ajustes
    await op('ajustes', {
      nombre: $('aj-nombre').value.trim(), mensaje: $('aj-mensaje').value.trim(), color: $('aj-color').value,
      pedidos_abiertos: $('aj-abiertos').checked, mesa_libre: $('aj-libre').checked,
    }, 'Ajustes guardados');
    if (codigoMesa !== null && quiereCodigo !== codigoMesa) {
      try {
        codigoMesa = !!(await rpc('carta_panel', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: 'ajuste_codigo',
          p_datos: { activo: quiereCodigo } })).codigo_mesa;
        $('aj-codigo').checked = codigoMesa;
        toast(codigoMesa ? '🔑 Código de mesa activado' : 'Código de mesa desactivado');
      } catch (e) { toast(e.humano, 'error'); }
    }
  });

  $('form-extras').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const resena = $('ex-resena').value.trim();
    if (resena && !/^https:\/\/\S+$/.test(resena)) { toast('El enlace debe empezar por https://', 'error'); return; }
    document.activeElement.blur();
    try {
      extras = await panel('extras', { wifi_red: $('ex-wifi-red').value.trim(), wifi_clave: $('ex-wifi-clave').value.trim(),
        resena_url: resena, trivia: $('ex-trivia').checked });
      pintarExtras();
      cargarHoy();
      toast('Guardado');
    } catch (e) { toast(e.humano, 'error'); }
  });
  setInterval(() => { if (sesion && d && document.visibilityState === 'visible') cargarHoy(); }, 60000);

  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const ds = b.dataset;
    const cat = (id) => d.categorias.find((c) => c.id === id);
    const mesa = (id) => d.mesas.find((m) => m.id === id);

    if (ds.tab) {
      document.querySelectorAll('[data-tab]').forEach((t) => t.setAttribute('aria-selected', String(t === b)));
      ['carta', 'mesas', 'ajustes', 'hoy', 'opiniones'].forEach((t) => { $('t-' + t).hidden = t !== ds.tab; });
      if (ds.tab === 'opiniones') cargarOpiniones();
      if (ds.tab === 'hoy') {
        if (informes) informes.recargar();
        else informes = window.CartaInformes.montar($('informes'), { sesion: () => sesion, moneda: () => (d ? d.restaurante.moneda : 'EUR') });
      }
    } else if (ds.cerrar !== undefined) {
      if (nfcAbort) { nfcAbort.abort(); nfcAbort = null; }
      b.closest('dialog').close();
    } else if (b.id === 'editor-entrar') {
      const clave = prompt('Clave de plataforma de VISAX AI:');
      if (clave && await comprobarEditor(clave.trim())) toast('✏️ Modo VISAX: ya puedes editar la carta y los precios');
    } else if (b.id === 'editor-salir') {
      try { sessionStorage.removeItem(K_VISAX); } catch { /* */ }
      comprobarEditor(null);
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
      if (!confirm('Se generará un enlace nuevo y el anterior dejará de funcionar en el móvil del bar. ¿Continuar?')) return;
      const res = await op('regenerar_clave', { tipo: 'cocina' });
      if (res) mostrarSecreto('clave-cocina-out', 'Enlace del panel del bar', `${location.origin}/cocina.html?r=${encodeURIComponent(sesion.slug)}&k=${encodeURIComponent(res.clave)}`);
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
