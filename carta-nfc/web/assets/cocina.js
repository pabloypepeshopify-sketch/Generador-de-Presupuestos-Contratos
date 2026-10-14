// Panel de comandas: recibe en vivo los pedidos de cada mesa, avisos y cierre de mesas.
(function () {
  const { rpc, esc, dinero, hace, hora, toast, aplicarColor, store } = window.Carta;
  const $ = (id) => document.getElementById(id);
  const K_SESION = 'carta:cocina';
  const K_SONIDO = 'carta:cocina:sonido';
  const SIGUIENTE = { nuevo: ['preparando', 'Empezar'], preparando: ['listo', '¡Listo!'], listo: ['servido', 'Servido'] };
  const ANTERIOR = { preparando: 'nuevo', listo: 'preparando' };

  let sesion = null;     // { slug, clave }
  let datos = null;      // última respuesta de carta_cocina
  let vista = 'comandas';
  let vistos = null;     // Set de ids ya notificados (null = primera carga)
  let timer = null;
  let fallos = 0;
  let audio = null;
  let sonidoOn = store.get(K_SONIDO, false);
  let wakeLock = null;
  let fiscal = { activo: false };   // facturación del restaurante (fiscal_config)
  let cobro = null;                 // estado de la ventana Cobrar
  let lista = null;                 // pestaña Tickets (CartaTickets)
  let informes = null;              // pestaña Informes (CartaInformes)
  let visto = null;                 // ticket abierto en la ventana Ver
  const recien = new Set();

  // ---------------------------------------------------------------- sesión ----
  function iniciar() {
    const qs = new URLSearchParams(location.search);
    if (qs.get('r') && qs.get('k')) {
      sesion = { slug: qs.get('r').toLowerCase(), clave: qs.get('k') };
      history.replaceState(null, '', location.pathname); // la clave no se queda a la vista en la barra
    } else {
      sesion = store.get(K_SESION, null);
    }
    if (!sesion) return mostrarLogin();
    entrar();
  }

  function mostrarLogin(msg) {
    $('panel').hidden = true;
    $('login').hidden = false;
    $('login-error').textContent = msg || '';
    if (sesion) $('login-slug').value = sesion.slug;
  }

  async function entrar() {
    try {
      datos = await rpc('carta_cocina', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: 'listar', p_datos: {} });
    } catch (e) {
      if (e.code === 'clave_incorrecta') { store.del(K_SESION); return mostrarLogin('Restaurante o clave incorrectos.'); }
      return mostrarLogin(e.humano);
    }
    store.set(K_SESION, sesion);
    $('login').hidden = true;
    $('panel').hidden = false;
    aplicarColor(datos.restaurante.color);
    document.title = 'Comandas · ' + datos.restaurante.nombre;
    $('k-nombre').textContent = datos.restaurante.nombre;
    $('k-admin').hidden = !datos.es_admin;
    pintarSonido();
    procesar(datos);
    programar();
    pedirWakeLock();
    cargarFiscal();
  }

  async function cargarFiscal() {
    try {
      fiscal = await rpc('fiscal_config', { p_slug: sesion.slug, p_clave: sesion.clave });
    } catch {
      fiscal = { activo: false };  // sin módulo de facturación: el panel funciona como siempre
    }
    // Con datos fiscales (aunque la facturación esté desactivada) se pueden consultar los tickets ya emitidos.
    $('tab-tickets').hidden = !fiscal.modo_sif;
    // Informes de ventas: bares con facturación (modo TPV) o entrando con la clave del dueño.
    const verInformes = !!fiscal.modo_sif || !!(datos && datos.es_admin);
    $('tab-informes').hidden = !verInformes;
    if ((!fiscal.modo_sif && vista === 'tickets') || (!verInformes && vista === 'informes')) cambiarVista('comandas');
    if (datos) pintar();
  }

  // ------------------------------------------------------------------ datos ----
  function programar() {
    clearTimeout(timer);
    timer = setTimeout(sondear, fallos ? Math.min(15000, 3000 * (fallos + 1)) : 3000);
  }

  async function sondear() {
    try {
      const d = await rpc('carta_cocina', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: 'listar', p_datos: {} });
      fallos = 0;
      procesar(d);
    } catch (e) {
      if (e.code === 'clave_incorrecta') { clearTimeout(timer); store.del(K_SESION); return mostrarLogin('La clave de cocina ha cambiado. Vuelve a entrar.'); }
      fallos++;
      $('k-conn').className = 'dot err';
    }
    programar();
  }

  async function accion(nombre, payload) {
    try {
      const d = await rpc('carta_cocina', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: nombre, p_datos: payload || {} });
      procesar(d);
      return true;
    } catch (e) {
      toast(e.humano, 'error');
      return false;
    }
  }

  function procesar(d) {
    datos = d;
    $('k-conn').className = 'dot ok';
    const nuevos = d.pedidos.filter((p) => p.estado === 'nuevo' && !p.cerrado);
    if (vistos === null) {
      vistos = new Set(d.pedidos.map((p) => p.id));
    } else {
      const llegan = nuevos.filter((p) => !vistos.has(p.id));
      llegan.forEach((p) => { vistos.add(p.id); recien.add(p.id); setTimeout(() => recien.delete(p.id), 4000); });
      if (llegan.length) avisarLlegada(llegan);
    }
    pintar();
  }

  // ---------------------------------------------------------------- render ----
  function pintar() {
    const d = datos;
    const ahora = new Date(d.ahora).getTime() || Date.now();
    const r = d.restaurante;
    $('k-reloj').textContent = hora(d.ahora);
    const pausa = $('k-pausa');
    pausa.innerHTML = r.pedidos_abiertos ? '📲 <span class="lbl">Pedidos móvil: </span>abiertos' : '⏸ <span class="lbl">Pedidos móvil: </span>PAUSADOS';
    pausa.setAttribute('aria-label', pausa.textContent);
    pausa.className = 'btn sm ' + (r.pedidos_abiertos ? 'abiertos' : 'pausados');

    const avisos = d.pedidos.filter((p) => p.tipo !== 'pedido' && p.estado === 'nuevo');
    const pedidos = d.pedidos.filter((p) => p.tipo === 'pedido');

    $('k-avisos').innerHTML = avisos.map((a) => {
      const totalMesa = pedidos.filter((p) => mismaMesa(p, a) && p.estado !== 'cancelado').reduce((s, p) => s + Number(p.total), 0);
      return `<div class="aviso ${esc(a.tipo)}">
        <span>${a.tipo === 'cuenta' ? '🧾' : '🙋'} ${esc(a.mesa)} · ${a.tipo === 'cuenta' ? 'pide la cuenta' + (totalMesa ? ` (${dinero(totalMesa, r.moneda)})` : '') : 'llama al camarero'}</span>
        <span class="small muted">${hace(a.creado, ahora)}</span>
        <button class="btn sm" data-atender="${esc(a.id)}">Atendido</button>
      </div>`;
    }).join('');

    ['nuevo', 'preparando', 'listo'].forEach((estado) => {
      const lista = pedidos.filter((p) => p.estado === estado);
      $('c-' + estado).textContent = lista.length || '';
      $('l-' + estado).innerHTML = lista.length ? lista.map((p) => ticket(p, ahora, r.moneda)).join('')
        : `<div class="vacio">${estado === 'nuevo' ? 'Esperando pedidos…' : '—'}</div>`;
    });

    const activos = pedidos.filter((p) => ['nuevo', 'preparando', 'listo'].includes(p.estado)).length;
    $('n-comandas').textContent = activos || '';
    const mesas = agruparMesas(d.pedidos);
    $('n-mesas').textContent = mesas.length || '';
    $('v-mesas').innerHTML = mesas.length ? mesas.map((m) => tarjetaMesa(m, r.moneda)).join('')
      : '<div class="vacio" style="grid-column:1/-1">No hay mesas con consumo abierto.</div>';

    const pendientes = pedidos.filter((p) => p.estado === 'nuevo').length + avisos.length;
    document.title = (pendientes ? `(${pendientes}) ` : '') + 'Comandas · ' + r.nombre;
  }

  function ticket(p, ahora, moneda) {
    const min = Math.floor((ahora - new Date(p.creado).getTime()) / 60000);
    const cls = min >= 20 ? 'muy-tarde' : min >= 10 ? 'tarde' : '';
    const sig = SIGUIENTE[p.estado];
    return `<article class="ticket ${esc(p.estado)}${recien.has(p.id) ? ' recien' : ''}" data-id="${esc(p.id)}">
      <div class="t-head"><span class="t-mesa">${esc(p.mesa)}</span><span class="t-num">#${esc(p.numero)}</span></div>
      <div class="t-meta">${hora(p.creado)} · <span class="${cls}">${hace(p.creado, ahora)}</span> · ${dinero(p.total, moneda)}</div>
      <ul class="t-lineas">${p.lineas.map((l) => `<li><b>${esc(l.cantidad)}×</b>${esc(l.nombre)}${l.nota ? `<em>→ ${esc(l.nota)}</em>` : ''}</li>`).join('')}</ul>
      ${p.nota ? `<p class="t-nota">📝 ${esc(p.nota)}</p>` : ''}
      <div class="t-foot">
        ${sig ? `<button class="btn primary" data-estado="${sig[0]}" data-id="${esc(p.id)}">${sig[1]}</button>` : ''}
        ${ANTERIOR[p.estado] ? `<button class="btn sm ghost" title="Deshacer" aria-label="Volver al paso anterior" data-estado="${ANTERIOR[p.estado]}" data-id="${esc(p.id)}">↩</button>` : ''}
        <button class="btn sm ghost" title="Imprimir" aria-label="Imprimir comanda" data-print="${esc(p.id)}">🖨</button>
        <button class="btn sm ghost danger" title="Cancelar pedido" aria-label="Cancelar pedido" data-cancelar="${esc(p.id)}">✕</button>
      </div>
    </article>`;
  }

  function mismaMesa(a, b) { return a.mesa_id ? a.mesa_id === b.mesa_id : a.mesa === b.mesa; }

  function agruparMesas(todos) {
    const grupos = [];
    todos.forEach((p) => {
      let g = grupos.find((x) => mismaMesa(x.ref, p));
      if (!g) { g = { ref: p, nombre: p.mesa, pedidos: [], ids: [] }; grupos.push(g); }
      g.ids.push(p.id);
      if (p.tipo === 'pedido') g.pedidos.push(p);
      if (p.tipo === 'cuenta' && p.estado === 'nuevo') g.cuenta = true;
    });
    return grupos.filter((g) => g.pedidos.length).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
  }

  function tarjetaMesa(g, moneda) {
    const validos = g.pedidos.filter((p) => p.estado !== 'cancelado');
    const total = validos.reduce((s, p) => s + Number(p.total), 0);
    const items = {};
    validos.forEach((p) => p.lineas.forEach((l) => {
      const k = l.nombre + '|' + l.precio;
      items[k] = items[k] || { nombre: l.nombre, cantidad: 0, importe: 0 };
      items[k].cantidad += l.cantidad;
      items[k].importe += l.cantidad * Number(l.precio);
    }));
    const pend = validos.filter((p) => p.estado !== 'servido').length;
    return `<article class="card mesa-card${g.cuenta ? ' pide-cuenta' : ''}">
      <h3><span>${esc(g.nombre)}</span><span class="num">${dinero(total, moneda)}</span></h3>
      <div class="estados">
        ${g.cuenta ? '<span class="chip">🧾 Pide la cuenta</span>' : ''}
        <span class="chip">${validos.length} pedido${validos.length === 1 ? '' : 's'}</span>
        ${pend ? `<span class="chip">${pend} sin servir</span>` : ''}
      </div>
      <ul>${Object.values(items).map((i) => `<li><span>${i.cantidad}× ${esc(i.nombre)}</span><span class="num">${dinero(i.importe, moneda)}</span></li>`).join('')}</ul>
      <div style="display:flex;gap:6px">
        ${fiscal.activo && total > 0
          ? `<button class="btn sm" data-print-mesa="${esc(g.ref.id)}">🖨 Pre-cuenta</button>
             <button class="btn sm primary" style="flex:1" data-cobrar-mesa="${esc(g.ref.id)}">💳 Cobrar ${dinero(total, moneda)}</button>`
          : `<button class="btn sm" data-print-mesa="${esc(g.ref.id)}">🖨 Ticket</button>
             <button class="btn sm primary" style="flex:1" data-cerrar-mesa="${esc(g.ref.id)}">Cobrada · liberar mesa</button>`}
      </div>
    </article>`;
  }

  // ---------------------------------------------------------- impresión ----
  function imprimir(html, cssExtra) {
    const f = $('print-frame');
    const doc = f.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
      @page{size:80mm auto;margin:0}
      body{font:14px/1.35 ui-monospace,Menlo,Consolas,monospace;width:72mm;margin:0;padding:4mm;color:#000}
      h1{font-size:22px;margin:0}h2{font-size:15px;margin:2px 0 8px}.r{display:flex;justify-content:space-between;gap:6px}
      hr{border:0;border-top:1px dashed #000;margin:6px 0}.n{font-style:italic;padding-left:12px}.t{font-size:18px;font-weight:700}
      ${cssExtra || ''}</style></head><body>${html}</body></html>`);
    doc.close();
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); }, 50);
  }

  function imprimirPedido(p) {
    const m = datos.restaurante.moneda;
    imprimir(`<h1>${esc(p.mesa)}</h1><h2>Pedido #${esc(p.numero)} · ${hora(p.creado)}</h2><hr>
      ${p.lineas.map((l) => `<div class="r"><span>${l.cantidad}× ${esc(l.nombre)}</span><span>${dinero(l.cantidad * l.precio, m)}</span></div>${l.nota ? `<div class="n">→ ${esc(l.nota)}</div>` : ''}`).join('')}
      ${p.nota ? `<hr><div>NOTA: ${esc(p.nota)}</div>` : ''}<hr><div class="r t"><span>TOTAL</span><span>${dinero(p.total, m)}</span></div>`);
  }

  function imprimirMesa(refId) {
    const ref = datos.pedidos.find((p) => p.id === refId);
    const g = agruparMesas(datos.pedidos).find((x) => mismaMesa(x.ref, ref));
    if (!g) return;
    const m = datos.restaurante.moneda;
    const validos = g.pedidos.filter((p) => p.estado !== 'cancelado');
    const lineas = validos.flatMap((p) => p.lineas);
    const total = validos.reduce((s, p) => s + Number(p.total), 0);
    imprimir(`<h1>${esc(datos.restaurante.nombre)}</h1><h2>${esc(g.nombre)} · ${new Date().toLocaleString('es-ES')}</h2><hr>
      ${lineas.map((l) => `<div class="r"><span>${l.cantidad}× ${esc(l.nombre)}</span><span>${dinero(l.cantidad * l.precio, m)}</span></div>`).join('')}
      <hr><div class="r t"><span>TOTAL</span><span>${dinero(total, m)}</span></div><p style="font-size:11px">IVA incluido. Ticket no válido como factura.</p>`);
  }

  // ------------------------------------------------------------- cobrar ----
  const r2 = (n) => Math.round(n * 100) / 100;
  const importe = (v) => {
    const t = String(v == null ? '' : v).trim().replace(',', '.');
    return /^\d{1,6}(\.\d{1,2})?$/.test(t) ? Number(t) : (t === '' ? 0 : NaN);
  };
  const FORMAS = { efectivo: '💶 Efectivo', tarjeta: '💳 Tarjeta', bizum: '📲 Bizum', mixto: '➗ Mixto' };

  function abrirCobro(refId) {
    const ref = datos.pedidos.find((p) => p.id === refId);
    const g = agruparMesas(datos.pedidos).find((x) => mismaMesa(x.ref, ref));
    if (!g) return;
    const validos = g.pedidos.filter((p) => p.estado !== 'cancelado');
    cobro = {
      mesa: g.nombre, ids: datos.pedidos.filter((p) => mismaMesa(p, ref)).map((p) => p.id),
      total: r2(validos.reduce((s, p) => s + Number(p.total), 0)), pedidos: validos.length,
      forma: 'tarjeta', enviando: false, doc: null,
    };
    const m = datos.restaurante.moneda;
    $('dlg-cobrar').innerHTML = `
      <div class="dlg-head"><div><h2>Cobrar · ${esc(cobro.mesa)}</h2><div class="muted small">${cobro.pedidos} pedido${cobro.pedidos === 1 ? '' : 's'}</div></div>
        <button class="x" data-cobro="cerrar" aria-label="Cerrar">×</button></div>
      <div class="dlg-body">
        <div class="cb-total"><span class="muted">Total consumo (IVA incluido)</span><b class="num">${dinero(cobro.total, m)}</b></div>
        <div class="cb-formas" role="group" aria-label="Forma de pago">
          ${Object.entries(FORMAS).map(([k, v]) => `<button type="button" data-forma="${k}" aria-pressed="${k === cobro.forma}">${v}</button>`).join('')}
        </div>
        <div id="cb-efectivo" hidden>
          <label class="field"><span>Entregado por el cliente</span><input type="text" inputmode="decimal" id="cb-entregado" placeholder="Ej.: 50"></label>
          <p class="cb-info" id="cb-cambio"></p>
        </div>
        <div id="cb-mixto" hidden>
          <div class="cb-fila">
            ${['efectivo', 'tarjeta', 'bizum'].map((f) => `<label class="field"><span>${FORMAS[f]}</span><input type="text" inputmode="decimal" data-mixto="${f}" placeholder="0,00"></label>`).join('')}
          </div>
          <p class="cb-info" id="cb-resto"></p>
        </div>
        <label class="field"><span>Propina (opcional, no entra en la factura)</span><input type="text" inputmode="decimal" id="cb-propina" placeholder="0,00"></label>
        <hr class="cb-sep">
        <label class="check"><input type="checkbox" id="cb-factura"> Factura con NIF (empresa o autónomo)</label>
        <div id="cb-cliente" hidden>
          <label class="field"><span>NIF / CIF</span><input type="text" id="cb-nif" autocapitalize="characters" maxlength="12"></label>
          <label class="field"><span>Nombre o razón social</span><input type="text" id="cb-nombre" maxlength="120"></label>
          <label class="field"><span>Domicilio fiscal</span><input type="text" id="cb-domicilio" maxlength="200"></label>
        </div>
        <p class="cb-info mal" id="cb-aviso" hidden></p>
      </div>
      <div class="dlg-foot"><button class="btn primary block" type="button" data-cobro="emitir" id="cb-emitir"></button></div>`;
    $('dlg-cobrar').showModal();
    actualizarCobro();
  }

  function actualizarCobro() {
    if (!cobro || cobro.doc) return;
    const m = datos.restaurante.moneda;
    const propina = importe($('cb-propina').value);
    const aPagar = r2(cobro.total + (propina || 0));
    const factura = $('cb-factura').checked;
    document.querySelectorAll('#dlg-cobrar [data-forma]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.forma === cobro.forma)));
    $('cb-efectivo').hidden = cobro.forma !== 'efectivo';
    $('cb-mixto').hidden = cobro.forma !== 'mixto';
    $('cb-cliente').hidden = !factura;
    let aviso = '';
    if (Number.isNaN(propina)) aviso = 'Propina no válida.';
    if (cobro.forma === 'efectivo') {
      const ent = importe($('cb-entregado').value);
      $('cb-cambio').textContent = ent ? (ent >= aPagar ? `Cambio: ${dinero(r2(ent - aPagar), m)}` : `Faltan ${dinero(r2(aPagar - ent), m)}`) : '';
      $('cb-cambio').classList.toggle('mal', !!ent && ent < aPagar);
    }
    if (cobro.forma === 'mixto') {
      const suma = r2([...document.querySelectorAll('#dlg-cobrar [data-mixto]')].reduce((s, i) => s + (importe(i.value) || 0), 0));
      const resto = r2(aPagar - suma);
      $('cb-resto').textContent = resto === 0 ? '✓ Cuadra' : resto > 0 ? `Faltan ${dinero(resto, m)}` : `Sobran ${dinero(-resto, m)}`;
      $('cb-resto').classList.toggle('mal', resto !== 0);
    }
    if (!factura && fiscal.limite_simplificada && cobro.total > Number(fiscal.limite_simplificada)) {
      aviso = `Más de ${dinero(fiscal.limite_simplificada, m)}: marca "Factura con NIF".`;
    }
    $('cb-aviso').textContent = aviso;
    $('cb-aviso').hidden = !aviso;
    const btn = $('cb-emitir');
    btn.textContent = cobro.enviando ? 'Emitiendo…' : `${factura ? 'Emitir factura' : 'Emitir ticket'} · ${dinero(aPagar, m)}`;
    btn.disabled = cobro.enviando || !!aviso;
  }

  async function emitirCobro() {
    const c = cobro;
    if (!c || c.enviando) return;
    const propina = importe($('cb-propina').value) || 0;
    const aPagar = r2(c.total + propina);
    let pagos;
    if (c.forma === 'mixto') {
      pagos = [...document.querySelectorAll('#dlg-cobrar [data-mixto]')]
        .map((i) => ({ forma: i.dataset.mixto, importe: importe(i.value) }))
        .filter((p) => p.importe > 0);
      if (pagos.some((p) => Number.isNaN(p.importe)) || r2(pagos.reduce((s, p) => s + p.importe, 0)) !== aPagar) {
        toast('El pago mixto no cuadra con el total.', 'error'); return;
      }
      pagos = pagos.map((p) => ({ forma: p.forma, importe: p.importe.toFixed(2) }));
    } else if (c.forma === 'efectivo') {
      const ent = importe($('cb-entregado').value);
      if (Number.isNaN(ent) || (ent && ent < aPagar)) { toast('El importe entregado no llega al total.', 'error'); return; }
      pagos = [{ forma: 'efectivo', importe: aPagar.toFixed(2), entregado: ent ? ent.toFixed(2) : null }];
    } else {
      pagos = [{ forma: c.forma, importe: aPagar.toFixed(2) }];
    }
    const cliente = $('cb-factura').checked
      ? { nif: $('cb-nif').value.trim(), nombre: $('cb-nombre').value.trim(), domicilio: $('cb-domicilio').value.trim() }
      : null;
    c.enviando = true;
    actualizarCobro();
    try {
      c.doc = await rpc('fiscal_cobrar', { p_slug: sesion.slug, p_clave: sesion.clave, p_datos: {
        pedido_ids: c.ids, pagos, propina: propina.toFixed(2), cliente, dispositivo: 'Panel de comandas' } });
      pintarTicketEmitido();
      toast(`${c.mesa} cobrada · ${c.doc.num_serie}`);
      sondear();
    } catch (e) {
      toast(e.humano, 'error');
      if (e.code === 'pedidos_ya_cobrados') { $('dlg-cobrar').close(); sondear(); }
    } finally {
      c.enviando = false;
      if (!c.doc) actualizarCobro();
    }
  }

  function pintarTicketEmitido() {
    const d = cobro.doc;
    $('dlg-cobrar').innerHTML = `
      <div class="dlg-head"><h2>✓ ${d.tipo === 'F1' ? 'Factura' : 'Ticket'} ${esc(d.num_serie)}</h2>
        <button class="x" data-cobro="cerrar" aria-label="Cerrar">×</button></div>
      <div class="dlg-body"><div class="tk-prev">${window.CartaTicket.html(d)}</div><div id="qr-digital"></div></div>
      <div class="dlg-foot" style="flex-wrap:wrap">
        <button class="btn primary" type="button" data-cobro="imprimir">🖨 Imprimir ticket</button>
        <button class="btn" type="button" data-cobro="qr">📱 Ticket digital (QR)</button>
        <button class="btn ghost" type="button" data-cobro="cerrar">Cerrar</button>
      </div>`;
  }

  function urlTicket(d) { return `${location.origin}/ticket.html?t=${encodeURIComponent(d.token)}`; }

  // En el móvil, imprimir desde un iframe oculto no es fiable (iPhone/Android imprimen la página entera o nada):
  // se abre el ticket en su propia página, que lanza la impresión (o "Guardar como PDF").
  const esMovil = () => window.matchMedia('(max-width: 760px)').matches;
  function imprimirTicket(d) {
    if (esMovil()) window.open(urlTicket(d) + '&imprimir=1', '_blank');
    else imprimir(window.CartaTicket.html(d), window.CartaTicket.css);
  }

  function accionCobro(a) {
    if (a === 'cerrar') { $('dlg-cobrar').close(); cobro = null; }
    else if (a === 'emitir') emitirCobro();
    else if (a === 'imprimir') imprimirTicket(cobro.doc);
    else if (a === 'qr') {
      const url = urlTicket(cobro.doc);
      $('qr-digital').innerHTML = `${window.CartaTicket.qrSvg(url, 4)}<p class="small muted">El cliente lo escanea y se lleva su ticket en el móvil.</p>`;
    }
  }

  // ------------------------------------------------------- tickets emitidos ----
  function cambiarVista(v) {
    vista = v;
    document.querySelectorAll('[data-vista]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.vista === vista)));
    const sel = document.querySelector(`[data-vista="${vista}"]`);
    if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    $('v-comandas').hidden = vista !== 'comandas';
    $('v-mesas').hidden = vista !== 'mesas';
    $('v-tickets').hidden = vista !== 'tickets';
    $('v-informes').hidden = vista !== 'informes';
    if (vista === 'informes') {
      if (informes) informes.recargar();
      else informes = window.CartaInformes.montar($('informes-panel'), { sesion: () => sesion, moneda: () => (datos ? datos.restaurante.moneda : 'EUR') });
      return;
    }
    if (vista !== 'tickets') return;
    if (lista) lista.recargar();
    else lista = window.CartaTickets.montar($('tickets-lista'), {
      sesion: () => sesion, moneda: () => (datos ? datos.restaurante.moneda : 'EUR'), ver: verTicket,
    });
  }

  async function verTicket(token) {
    try {
      visto = await rpc('fiscal_documento', { p_token: token });
    } catch (e) {
      toast(e.humano, 'error');
      return;
    }
    $('dlg-ticket').innerHTML = `
      <div class="dlg-head"><h2>${visto.tipo === 'F1' ? 'Factura' : 'Ticket'} ${esc(visto.num_serie)}</h2>
        <button class="x" data-visto="cerrar" aria-label="Cerrar">×</button></div>
      <div class="dlg-body"><div class="tk-prev">${window.CartaTicket.html(visto)}</div><div class="qr-digital" id="qr-visto"></div></div>
      <div class="dlg-foot" style="flex-wrap:wrap">
        <button class="btn primary" type="button" data-visto="imprimir">🖨 Imprimir</button>
        <button class="btn" type="button" data-visto="qr">📱 Ticket digital (QR)</button>
        <button class="btn ghost" type="button" data-visto="cerrar">Cerrar</button>
      </div>`;
    if (!$('dlg-ticket').open) $('dlg-ticket').showModal();
  }

  function accionVisto(a) {
    if (a === 'cerrar') { $('dlg-ticket').close(); visto = null; }
    else if (a === 'imprimir' && visto) imprimirTicket(visto);
    else if (a === 'qr' && visto) {
      $('qr-visto').innerHTML = `${window.CartaTicket.qrSvg(urlTicket(visto), 4)}<p class="small muted">El cliente lo escanea y se lleva su ticket en el móvil.</p>`;
    }
  }

  // --------------------------------------------------------- sonido y aviso ----
  function pintarSonido() {
    const on = sonidoOn && audio && audio.state === 'running';
    $('k-sonido').innerHTML = on ? '🔔 <span class="lbl">Sonido activado</span>' : '🔕 <span class="lbl">Activar sonido</span>';
    $('k-sonido').setAttribute('aria-label', $('k-sonido').textContent);
  }

  function activarAudio() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume().then(pintarSonido);
    } catch { /* sin audio */ }
    pintarSonido();
  }

  function pitar(frecuencias) {
    if (!sonidoOn || !audio || audio.state !== 'running') return;
    let t = audio.currentTime;
    frecuencias.forEach((f) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(audio.destination);
      o.start(t); o.stop(t + 0.3);
      t += 0.32;
    });
  }

  function avisarLlegada(llegan) {
    const hayPedido = llegan.some((p) => p.tipo === 'pedido');
    pitar(hayPedido ? [880, 1175, 880, 1175] : [660, 660, 660]);
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    const p = llegan[0];
    toast(p.tipo === 'pedido' ? `Nuevo pedido · ${p.mesa}` : p.tipo === 'cuenta' ? `${p.mesa} pide la cuenta` : `${p.mesa} llama al camarero`);
  }

  async function pedirWakeLock() {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen');
    } catch { /* no soportado */ }
  }

  // --------------------------------------------------------------- eventos ----
  $('login-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    sesion = { slug: $('login-slug').value.trim().toLowerCase(), clave: $('login-clave').value.trim() };
    activarAudio();
    entrar();
  });

  document.addEventListener('pointerdown', () => { if (sonidoOn) activarAudio(); if (!wakeLock) pedirWakeLock(); }, { once: true });

  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.vista) {
      cambiarVista(b.dataset.vista);
    } else if (b.dataset.visto) {
      accionVisto(b.dataset.visto);
    } else if (b.dataset.estado && b.dataset.id) {
      b.disabled = true;
      await accion('estado', { id: b.dataset.id, estado: b.dataset.estado });
    } else if (b.dataset.atender) {
      b.disabled = true;
      await accion('estado', { id: b.dataset.atender, estado: 'servido' });
    } else if (b.dataset.cancelar) {
      if (confirm('¿Cancelar este pedido? No se cobrará.')) await accion('estado', { id: b.dataset.cancelar, estado: 'cancelado' });
    } else if (b.dataset.print) {
      imprimirPedido(datos.pedidos.find((p) => p.id === b.dataset.print));
    } else if (b.dataset.printMesa) {
      imprimirMesa(b.dataset.printMesa);
    } else if (b.dataset.cobrarMesa) {
      abrirCobro(b.dataset.cobrarMesa);
    } else if (b.dataset.cobro) {
      accionCobro(b.dataset.cobro);
    } else if (b.dataset.forma && cobro) {
      cobro.forma = b.dataset.forma;
      actualizarCobro();
    } else if (b.dataset.cerrarMesa) {
      const ref = datos.pedidos.find((p) => p.id === b.dataset.cerrarMesa);
      const ids = datos.pedidos.filter((p) => mismaMesa(p, ref)).map((p) => p.id);
      const pend = datos.pedidos.filter((p) => mismaMesa(p, ref) && p.tipo === 'pedido' && ['nuevo', 'preparando', 'listo'].includes(p.estado)).length;
      const msg = (pend ? `Ojo: ${ref.mesa} tiene ${pend} pedido(s) sin servir.\n` : '') + `¿Marcar ${ref.mesa} como cobrada y dejarla libre?`;
      if (confirm(msg) && await accion('cerrar', { ids })) toast(`${ref.mesa} liberada`);
    } else if (b.id === 'k-pausa') {
      const abrir = !datos.restaurante.pedidos_abiertos;
      if (abrir || confirm('¿Pausar los pedidos por móvil? Los clientes verán la carta pero no podrán pedir.')) await accion('pausa', { abiertos: abrir });
    } else if (b.id === 'k-sonido') {
      sonidoOn = !(sonidoOn && audio && audio.state === 'running');
      store.set(K_SONIDO, sonidoOn);
      activarAudio();
      if (sonidoOn) setTimeout(() => pitar([880, 1175]), 150);
      pintarSonido();
    } else if (b.id === 'k-salir') {
      if (confirm('¿Salir del panel? Tendrás que volver a introducir la clave.')) {
        store.del(K_SESION); clearTimeout(timer); sesion = null; vistos = null;
        lista = null; $('tickets-lista').innerHTML = '';
        informes = null; $('informes-panel').innerHTML = ''; cambiarVista('comandas');
        mostrarLogin();
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sesion && datos) { pedirWakeLock(); sondear(); cargarFiscal(); }
  });
  document.addEventListener('input', (ev) => { if (cobro && ev.target.closest('#dlg-cobrar')) actualizarCobro(); });
  document.addEventListener('change', (ev) => { if (cobro && ev.target.id === 'cb-factura') actualizarCobro(); });
  $('dlg-cobrar').addEventListener('close', () => { cobro = null; });
  $('dlg-ticket').addEventListener('close', () => { visto = null; });
  { const st = document.createElement('style'); st.textContent = window.CartaTicket ? window.CartaTicket.css : ''; document.head.appendChild(st); }

  iniciar();
})();
