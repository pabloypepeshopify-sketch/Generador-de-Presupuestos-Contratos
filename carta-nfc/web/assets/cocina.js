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
  let devol = null;                 // devolución en curso (ventana Ver)
  let tpv = null;                   // modo TPV: mesas, carta y stock bajo (carta_tpv)
  let mover = null;                 // mover consumo de mesa
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
    $('k-pedido').hidden = !modoTPV();
    if (datos) pintar();
    cargarTPV();
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
    let htmlMesas = mesas.map((m) => tarjetaMesa(m, r.moneda)).join('');
    if (modoTPV() && tpv) {
      // Plano: las mesas libres a un toque del comandero.
      const ocupadas = new Set(mesas.map((g) => g.ref.mesa_id).filter(Boolean));
      const libres = tpv.mesas.filter((x) => !ocupadas.has(x.id));
      htmlMesas += `<section class="libres"><h3>Libres · ${libres.length} de ${tpv.mesas.length}</h3><div class="libres-lista">
        ${mesas.some((g) => !g.ref.mesa_id) ? '' : '<button type="button" class="btn" data-libre="">🍺 Barra</button>'}
        ${libres.map((x) => `<button type="button" class="btn" data-libre="${esc(x.id)}">${esc(x.nombre)}</button>`).join('')}</div></section>`;
    }
    $('v-mesas').innerHTML = htmlMesas || '<div class="vacio" style="grid-column:1/-1">No hay mesas con consumo abierto.</div>';

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

  function mismaMesa(a, b) { return (a.mesa_id || b.mesa_id) ? a.mesa_id === b.mesa_id : a.mesa === b.mesa; }

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
    const yaCobrado = parciales.get(claveMesa(g.ref)) || 0;
    return `<article class="card mesa-card${g.cuenta ? ' pide-cuenta' : ''}">
      <h3><span>${esc(g.nombre)}</span><span class="num">${dinero(total, moneda)}</span></h3>
      <div class="estados">
        ${g.cuenta ? '<span class="chip">🧾 Pide la cuenta</span>' : ''}
        <span class="chip">${validos.length} pedido${validos.length === 1 ? '' : 's'}</span>
        ${pend ? `<span class="chip">${pend} sin servir</span>` : ''}
        ${yaCobrado ? `<span class="chip">💳 Ya cobrado ${dinero(yaCobrado, moneda)}</span>` : ''}
      </div>
      <ul>${Object.values(items).map((i) => `<li><span>${i.cantidad}× ${esc(i.nombre)}</span><span class="num">${dinero(i.importe, moneda)}</span></li>`).join('')}</ul>
      <div style="display:flex;gap:6px">
        ${fiscal.activo && total > 0
          ? `<button class="btn sm" data-print-mesa="${esc(g.ref.id)}">🖨 Pre-cuenta</button>
             <button class="btn sm primary" style="flex:1" data-cobrar-mesa="${esc(g.ref.id)}">💳 Cobrar ${dinero(r2(total - yaCobrado), moneda)}</button>`
          : `<button class="btn sm" data-print-mesa="${esc(g.ref.id)}">🖨 Ticket</button>
             <button class="btn sm primary" style="flex:1" data-cerrar-mesa="${esc(g.ref.id)}">Cobrada · liberar mesa</button>`}
      </div>
      ${modoTPV() ? `<div class="mesa-tpv">
        <button class="btn sm" data-anadir-mesa="${esc(g.ref.id)}">➕ Añadir</button>
        ${tpv ? `<button class="btn sm" data-mover-mesa="${esc(g.ref.id)}">⇄ Mover</button>` : ''}</div>` : ''}
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

  const MODOS = { todo: 'Todo junto', productos: 'Por productos', partes: 'A partes iguales' };
  const parciales = new Map();   // mesa → ya cobrado en cuentas separadas (para su tarjeta)
  const claveMesa = (p) => (p.mesa_id ? p.mesa_id : 'n:' + p.mesa);

  async function abrirCobro(refId) {
    const ref = datos.pedidos.find((p) => p.id === refId);
    const g = ref && agruparMesas(datos.pedidos).find((x) => mismaMesa(x.ref, ref));
    if (!g) return;
    const validos = g.pedidos.filter((p) => p.estado !== 'cancelado');
    const ids = datos.pedidos.filter((p) => mismaMesa(p, ref)).map((p) => p.id);
    let pend = null;
    try {
      pend = await rpc('fiscal_pendiente', { p_slug: sesion.slug, p_clave: sesion.clave, p_pedido_ids: ids });
    } catch { /* sin detalle: se cobra el total */ }
    cobro = {
      refId, clave: claveMesa(ref), mesa: g.nombre, ids, pedidos: validos.length,
      total: pend ? r2(Number(pend.pendiente)) : r2(validos.reduce((s, p) => s + Number(p.total), 0)),
      cobrado: pend ? Number(pend.cobrado) : 0, partes: pend ? pend.partes : [], lineas: pend ? pend.lineas : [],
      modo: 'todo', sel: {}, personas: 2, formasPersona: [], forma: 'tarjeta', enviando: false, doc: null,
    };
    if (cobro.cobrado) parciales.set(cobro.clave, cobro.cobrado); else parciales.delete(cobro.clave);
    pintarCobro();
    if (!$('dlg-cobrar').open) $('dlg-cobrar').showModal();
    actualizarCobro();
  }

  function pintarCobro() {
    const c = cobro, m = datos.restaurante.moneda;
    const nPartes = c.partes.length;
    $('dlg-cobrar').innerHTML = `
      <div class="dlg-head"><div><h2>Cobrar · ${esc(c.mesa)}</h2><div class="muted small">${c.pedidos} pedido${c.pedidos === 1 ? '' : 's'}${c.cobrado
        ? ` · ya cobrado ${dinero(c.cobrado, m)} en ${nPartes} ticket${nPartes === 1 ? '' : 's'}` : ''}</div></div>
        <button class="x" data-cobro="cerrar" aria-label="Cerrar">×</button></div>
      <div class="dlg-body">
        <div class="cb-total"><span class="muted">${c.cobrado ? 'Pendiente' : 'Total consumo'} (IVA incluido)</span><b class="num" id="cb-a-cobrar">${dinero(c.total, m)}</b></div>
        ${c.lineas.length ? `<div class="cb-modos" role="group" aria-label="Cómo se paga">
          ${Object.entries(MODOS).map(([k, v]) => `<button type="button" data-cobro-modo="${k}" aria-pressed="${k === c.modo}">${v}</button>`).join('')}
        </div>` : ''}
        <div id="cb-productos" hidden>
          <p class="muted small cb-ayuda">Marca lo que paga esta persona: se le hace su propio ticket y la mesa sigue abierta con el resto.</p>
          ${c.lineas.map((l) => `<div class="cb-linea"><span>${esc(l.nombre)}<small>${dinero(l.precio, m)} · quedan ${esc(l.cantidad)}</small></span>
            <span class="cb-qty"><button type="button" data-sel-menos="${esc(l.k)}" aria-label="Quitar uno">−</button><b data-sel-n="${esc(l.k)}">0</b>
            <button type="button" data-sel-mas="${esc(l.k)}" aria-label="Añadir uno">+</button><button type="button" class="cb-todo" data-sel-todo="${esc(l.k)}">Todo</button></span></div>`).join('')}
        </div>
        <div id="cb-partes" hidden>
          <label class="field cb-personas"><span>Entre cuántas personas</span><input type="number" inputmode="numeric" min="2" max="20" id="cb-personas" value="${c.personas}"></label>
          <div id="cb-personas-lista"></div>
          <p class="muted small cb-ayuda">Un solo ticket con el pago de cada uno (puede pagar cada uno con lo que quiera).</p>
        </div>
        <div id="cb-pago">
          <div class="cb-formas" role="group" aria-label="Forma de pago">
            ${Object.entries(FORMAS).map(([k, v]) => `<button type="button" data-forma="${k}" aria-pressed="${k === c.forma}">${v}</button>`).join('')}
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
        </div>
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
  }

  // Lo que se cobra ahora: todo lo pendiente o lo marcado (por productos).
  function aCobrar() {
    if (cobro.modo === 'productos') return r2(cobro.lineas.reduce((s, l) => s + (cobro.sel[l.k] || 0) * Number(l.precio), 0));
    return cobro.total;
  }
  // Reparto a partes iguales en céntimos: los primeros pagan 1 céntimo más si no es exacto.
  function repartos() {
    const n = Math.max(2, Math.min(20, cobro.personas || 2));
    const cent = Math.round(cobro.total * 100), base = Math.floor(cent / n), resto = cent - base * n;
    return Array.from({ length: n }, (_, i) => (base + (i < resto ? 1 : 0)) / 100);
  }

  function actualizarCobro() {
    if (!cobro || cobro.doc) return;
    const c = cobro, m = datos.restaurante.moneda;
    const partes = c.modo === 'partes';
    $('cb-productos').hidden = c.modo !== 'productos';
    $('cb-partes').hidden = !partes;
    $('cb-pago').hidden = partes;
    document.querySelectorAll('#dlg-cobrar [data-cobro-modo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cobroModo === c.modo)));
    const base = aCobrar();
    const propina = partes ? 0 : importe($('cb-propina').value);
    const aPagar = r2(base + (propina || 0));
    $('cb-a-cobrar').textContent = dinero(base, m);
    c.lineas.forEach((l) => { const e = document.querySelector(`#dlg-cobrar [data-sel-n="${l.k}"]`); if (e) e.textContent = c.sel[l.k] || 0; });
    if (partes) {
      const v = parseInt($('cb-personas').value, 10);
      c.personas = Number.isFinite(v) ? Math.max(2, Math.min(20, v)) : 2;
      const rep = repartos();
      c.formasPersona = rep.map((_, i) => c.formasPersona[i] || 'tarjeta');
      $('cb-personas-lista').innerHTML = rep.map((v2, i) => `<div class="cb-persona"><span>Persona ${i + 1} <b>${dinero(v2, m)}</b></span>
        <span class="cb-mini">${['efectivo', 'tarjeta', 'bizum'].map((f) => `<button type="button" data-persona="${i}:${f}" aria-pressed="${c.formasPersona[i] === f}">${FORMAS[f]}</button>`).join('')}</span></div>`).join('');
    }
    const factura = $('cb-factura').checked;
    document.querySelectorAll('#dlg-cobrar [data-forma]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.forma === c.forma)));
    $('cb-efectivo').hidden = c.forma !== 'efectivo';
    $('cb-mixto').hidden = c.forma !== 'mixto';
    $('cb-cliente').hidden = !factura;
    let aviso = '';
    if (Number.isNaN(propina)) aviso = 'Propina no válida.';
    if (!partes && c.forma === 'efectivo') {
      const ent = importe($('cb-entregado').value);
      $('cb-cambio').textContent = ent ? (ent >= aPagar ? `Cambio: ${dinero(r2(ent - aPagar), m)}` : `Faltan ${dinero(r2(aPagar - ent), m)}`) : '';
      $('cb-cambio').classList.toggle('mal', !!ent && ent < aPagar);
    }
    if (!partes && c.forma === 'mixto') {
      const suma = r2([...document.querySelectorAll('#dlg-cobrar [data-mixto]')].reduce((s, i) => s + (importe(i.value) || 0), 0));
      const resto = r2(aPagar - suma);
      $('cb-resto').textContent = resto === 0 ? '✓ Cuadra' : resto > 0 ? `Faltan ${dinero(resto, m)}` : `Sobran ${dinero(-resto, m)}`;
      $('cb-resto').classList.toggle('mal', resto !== 0);
    }
    if (c.modo === 'productos' && !base) aviso = 'Marca qué paga esta persona.';
    if (!factura && fiscal.limite_simplificada && base > Number(fiscal.limite_simplificada)) {
      aviso = `Más de ${dinero(fiscal.limite_simplificada, m)}: marca "Factura con NIF".`;
    }
    $('cb-aviso').textContent = aviso;
    $('cb-aviso').hidden = !aviso;
    const btn = $('cb-emitir');
    const que = factura ? 'Emitir factura' : c.modo === 'productos' ? 'Cobrar esta parte' : 'Emitir ticket';
    btn.textContent = c.enviando ? 'Emitiendo…' : `${que} · ${dinero(aPagar, m)}${partes ? ` (${repartos().length} pagos)` : ''}`;
    btn.disabled = c.enviando || !!aviso;
  }

  async function emitirCobro() {
    const c = cobro;
    if (!c || c.enviando) return;
    const partes = c.modo === 'partes';
    const propina = partes ? 0 : (importe($('cb-propina').value) || 0);
    const aPagar = r2(aCobrar() + propina);
    let pagos;
    if (partes) {
      const tot = {};
      repartos().forEach((v, i) => { const f = c.formasPersona[i] || 'tarjeta'; tot[f] = r2((tot[f] || 0) + v); });
      pagos = Object.entries(tot).map(([forma, v]) => ({ forma, importe: v.toFixed(2) }));
    } else if (c.forma === 'mixto') {
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
    const lineas = c.modo === 'productos'
      ? Object.entries(c.sel).filter(([, n]) => n > 0).map(([k, n]) => ({ k, cantidad: n })) : null;
    if (lineas && !lineas.length) { toast('Marca qué paga esta persona.', 'error'); return; }
    const cliente = $('cb-factura').checked
      ? { nif: $('cb-nif').value.trim(), nombre: $('cb-nombre').value.trim(), domicilio: $('cb-domicilio').value.trim() }
      : null;
    c.enviando = true;
    actualizarCobro();
    try {
      c.doc = await rpc('fiscal_cobrar', { p_slug: sesion.slug, p_clave: sesion.clave, p_datos: {
        pedido_ids: c.ids, pagos, propina: propina.toFixed(2), cliente, lineas, dispositivo: 'Panel de comandas' } });
      const queda = Number(c.doc.pendiente || 0);
      if (queda > 0) parciales.set(c.clave, r2(c.cobrado + Number(c.doc.total))); else parciales.delete(c.clave);
      pintarTicketEmitido();
      toast(queda > 0 ? `Parte cobrada · ${c.doc.num_serie} · quedan ${dinero(queda, datos.restaurante.moneda)}` : `${c.mesa} cobrada · ${c.doc.num_serie}`);
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
    const d = cobro.doc, queda = Number(d.pendiente || 0);
    $('dlg-cobrar').innerHTML = `
      <div class="dlg-head"><h2>✓ ${d.tipo === 'F1' ? 'Factura' : 'Ticket'} ${esc(d.num_serie)}</h2>
        <button class="x" data-cobro="cerrar" aria-label="Cerrar">×</button></div>
      <div class="dlg-body">
        ${queda > 0 ? `<p class="cb-queda">Queda por cobrar <b>${dinero(queda, datos.restaurante.moneda)}</b> en ${esc(cobro.mesa)}.</p>` : ''}
        <div class="tk-prev">${window.CartaTicket.html(d)}</div><div id="qr-digital"></div></div>
      <div class="dlg-foot" style="flex-wrap:wrap">
        ${queda > 0 ? `<button class="btn primary" type="button" data-cobro="resto">💳 Cobrar el resto (${dinero(queda, datos.restaurante.moneda)})</button>` : ''}
        <button class="btn ${queda > 0 ? '' : 'primary'}" type="button" data-cobro="imprimir">🖨 Imprimir ticket</button>
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

  async function accionCobro(a) {
    if (a === 'cerrar') { $('dlg-cobrar').close(); cobro = null; }
    else if (a === 'emitir') emitirCobro();
    else if (a === 'imprimir') imprimirTicket(cobro.doc);
    else if (a === 'resto') {
      const ref = cobro.refId;
      await sondear();
      abrirCobro(ref);
    } else if (a === 'qr') {
      const url = urlTicket(cobro.doc);
      $('qr-digital').innerHTML = `${window.CartaTicket.qrSvg(url, 4)}<p class="small muted">El cliente lo escanea y se lleva su ticket en el móvil.</p>`;
    }
  }

  function cambiarSeleccion(k, delta) {
    const l = cobro.lineas.find((x) => x.k === k);
    if (!l) return;
    const n = delta === 'todo' ? Number(l.cantidad) : (cobro.sel[k] || 0) + delta;
    cobro.sel[k] = Math.max(0, Math.min(Number(l.cantidad), n));
    actualizarCobro();
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

  const FORMAS_DEV = { efectivo: '💶 Efectivo', tarjeta: '💳 Tarjeta', bizum: '📲 Bizum', otro: 'Otro' };
  const puedeDevolver = (d) => modoTPV() && fiscal.activo && (d.tipo === 'F1' || d.tipo === 'F2');

  async function verTicket(token) {
    try {
      visto = await rpc('fiscal_documento', { p_token: token });
    } catch (e) {
      toast(e.humano, 'error');
      return;
    }
    devol = null;
    pintarVisto();
    if (!$('dlg-ticket').open) $('dlg-ticket').showModal();
  }

  function pintarVisto() {
    const d = visto, m = datos.restaurante.moneda;
    const nombre = d.tipo.startsWith('R') ? 'Rectificativa' : d.tipo === 'F1' ? 'Factura' : 'Ticket';
    const rect = d.rectificaciones || [];
    $('dlg-ticket').innerHTML = `
      <div class="dlg-head"><h2>${nombre} ${esc(d.num_serie)}</h2>
        <button class="x" data-visto="cerrar" aria-label="Cerrar">×</button></div>
      <div class="dlg-body">
        ${rect.length ? `<p class="cb-queda">Con devoluciones: ${rect.map((x) => `${esc(x.num_serie)} (${dinero(x.total, m)})`).join(', ')}</p>` : ''}
        <div class="tk-prev">${window.CartaTicket.html(d)}</div><div class="qr-digital" id="qr-visto"></div></div>
      <div class="dlg-foot" style="flex-wrap:wrap">
        <button class="btn primary" type="button" data-visto="imprimir">🖨 Imprimir</button>
        <button class="btn" type="button" data-visto="qr">📱 Ticket digital (QR)</button>
        ${puedeDevolver(d) ? '<button class="btn" type="button" data-visto="devolver">↩ Devolver</button>' : ''}
        <button class="btn ghost" type="button" data-visto="cerrar">Cerrar</button>
      </div>`;
  }

  // Devolución (factura rectificativa por diferencias) de todo o parte de un ticket.
  function abrirDevolucion() {
    const d = visto, m = datos.restaurante.moneda;
    const previas = (d.rectificaciones || []).length > 0;
    devol = { previas, sel: Object.fromEntries(d.lineas.map((l) => [l.k, previas ? 0 : Number(l.cantidad)])),
      forma: (d.pagos && d.pagos[0] && d.pagos[0].forma) || 'efectivo', enviando: false };
    $('dlg-ticket').innerHTML = `
      <div class="dlg-head"><div><h2>↩ Devolver · ${esc(d.num_serie)}</h2><div class="muted small">Se emite una factura rectificativa con el importe en negativo.</div></div>
        <button class="x" data-visto="cerrar" aria-label="Cerrar">×</button></div>
      <div class="dlg-body">
        ${previas ? '<p class="cb-queda">Este ticket ya tiene devoluciones: marca solo lo que falta por devolver.</p>' : ''}
        ${d.lineas.map((l) => `<div class="cb-linea"><span>${esc(l.nombre)}<small>${dinero(l.precio, m)} · cobradas ${esc(l.cantidad)}</small></span>
          <span class="cb-qty"><button type="button" data-dv-menos="${esc(l.k)}" aria-label="Quitar uno">−</button><b data-dv-n="${esc(l.k)}"></b>
          <button type="button" data-dv-mas="${esc(l.k)}" aria-label="Añadir uno">+</button></span></div>`).join('')}
        <p class="muted small" style="margin:12px 0 6px">Cómo se devuelve el dinero</p>
        <div class="cb-formas" role="group" aria-label="Forma de devolución">
          ${Object.entries(FORMAS_DEV).map(([k, v]) => `<button type="button" data-dv-forma="${k}" aria-pressed="${k === devol.forma}">${v}</button>`).join('')}
        </div>
        <label class="field"><span>Motivo</span><input type="text" id="dv-motivo" maxlength="200" placeholder="Ej.: plato devuelto, cobrado por error"></label>
        <label class="check"><input type="checkbox" id="dv-reabrir"> Reabrir la mesa para volver a cobrarla (si el cobro estaba mal)</label>
      </div>
      <div class="dlg-foot" style="flex-wrap:wrap">
        <button class="btn primary" type="button" data-visto="emitir-dev" id="dv-emitir"></button>
        <button class="btn ghost" type="button" data-visto="volver">Volver</button>
      </div>`;
    actualizarDevolucion();
  }

  function actualizarDevolucion() {
    if (!devol || !visto) return;
    const d = visto, m = datos.restaurante.moneda;
    let total = 0, completa = !devol.previas;
    d.lineas.forEach((l) => {
      const n = devol.sel[l.k] || 0;
      total += n * Number(l.precio);
      if (n < Number(l.cantidad)) completa = false;
      const e = document.querySelector(`#dlg-ticket [data-dv-n="${l.k}"]`);
      if (e) e.textContent = n;
    });
    document.querySelectorAll('#dlg-ticket [data-dv-forma]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dvForma === devol.forma)));
    const re = $('dv-reabrir');
    re.disabled = !completa;
    if (!completa) re.checked = false;
    const btn = $('dv-emitir');
    btn.textContent = devol.enviando ? 'Emitiendo…' : `Emitir devolución · ${dinero(-total, m)}`;
    btn.disabled = devol.enviando || total <= 0;
  }

  async function emitirDevolucion() {
    if (!devol || devol.enviando) return;
    const lineas = Object.entries(devol.sel).filter(([, n]) => n > 0).map(([k, n]) => ({ k, cantidad: n }));
    const reabrir = $('dv-reabrir').checked;
    devol.enviando = true;
    actualizarDevolucion();
    try {
      const r = await rpc('fiscal_rectificar', { p_slug: sesion.slug, p_clave: sesion.clave, p_datos: {
        token: visto.token, lineas, forma: devol.forma, motivo: $('dv-motivo').value.trim() || null, reabrir,
        dispositivo: 'Panel de comandas' } });
      visto = r;
      devol = null;
      pintarVisto();
      toast(`Devolución ${r.num_serie} emitida${reabrir ? ' · mesa reabierta' : ''}`);
      if (lista) lista.recargar();
      if (reabrir) sondear();
    } catch (e) {
      devol.enviando = false;
      toast(e.humano, 'error');
      actualizarDevolucion();
    }
  }

  function accionVisto(a) {
    if (a === 'cerrar') { $('dlg-ticket').close(); visto = null; devol = null; }
    else if (a === 'imprimir' && visto) imprimirTicket(visto);
    else if (a === 'qr' && visto) {
      $('qr-visto').innerHTML = `${window.CartaTicket.qrSvg(urlTicket(visto), 4)}<p class="small muted">El cliente lo escanea y se lleva su ticket en el móvil.</p>`;
    } else if (a === 'devolver' && visto) abrirDevolucion();
    else if (a === 'emitir-dev') emitirDevolucion();
    else if (a === 'volver') { devol = null; pintarVisto(); }
  }

  // ------------------------------------------------- modo TPV: mesas y comandero ----
  // Bares con facturación (o entrando con la clave del dueño): comandero, plano de mesas, mover y stock.
  const modoTPV = () => !!fiscal.modo_sif || !!(datos && datos.es_admin);

  async function cargarTPV() {
    if (!modoTPV()) { tpv = null; pintarStock(); return; }
    try {
      tpv = await rpc('carta_tpv', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: 'datos', p_datos: {} });
    } catch {
      tpv = null;
    }
    pintarStock();
    if (datos) pintar();
  }

  function pintarStock() {
    const bajo = tpv ? tpv.stock_bajo : [];
    $('k-stock').innerHTML = bajo.map((p) => `<span class="stock-chip${Number(p.stock) ? '' : ' cero'}">${Number(p.stock)
      ? `⚠ Quedan ${esc(p.stock)}` : '⛔ Agotado'} · ${esc(p.nombre)}</span>`).join('');
  }

  function abrirComandero(mesaId) {
    if (!window.CartaComandero) return;
    window.CartaComandero.abrir({
      sesion: () => sesion, moneda: () => datos.restaurante.moneda, mesaId, cobrar: !!fiscal.activo,
      alEnviar: async (p, o) => {
        await sondear();
        cargarTPV();
        if (o.cobrar) { cambiarVista('mesas'); abrirCobro(p.id); }
      },
    });
  }

  function abrirMover(refId) {
    const ref = datos.pedidos.find((p) => p.id === refId);
    if (!ref || !tpv) return;
    const ocupadas = new Set(datos.pedidos.filter((p) => !p.cerrado && p.mesa_id).map((p) => p.mesa_id));
    mover = { ids: datos.pedidos.filter((p) => mismaMesa(p, ref)).map((p) => p.id), desde: ref.mesa };
    $('dlg-mover').innerHTML = `
      <div class="dlg-head"><div><h2>⇄ Mover ${esc(ref.mesa)}</h2><div class="muted small">Todo su consumo pasa a la mesa que elijas. Si está ocupada, se juntan.</div></div>
        <button class="x" data-mover-cerrar aria-label="Cerrar">×</button></div>
      <div class="dlg-body"><div class="mover-lista">
        ${tpv.mesas.filter((x) => x.id !== ref.mesa_id).map((x) => `<button type="button" class="btn${ocupadas.has(x.id) ? '' : ' libre'}" data-mover-a="${esc(x.id)}">${esc(x.nombre)}${ocupadas.has(x.id) ? '<small>ocupada</small>' : ''}</button>`).join('')}
      </div></div>`;
    $('dlg-mover').showModal();
  }

  async function moverA(mesaId) {
    if (!mover) return;
    try {
      const r = await rpc('carta_tpv', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: 'mover', p_datos: { ids: mover.ids, mesa_id: mesaId } });
      $('dlg-mover').close();
      toast(`${mover.desde} → ${r.mesa}`);
      parciales.clear();
      await sondear();
    } catch (e) {
      toast(e.humano, 'error');
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
    } else if (b.dataset.cobroModo && cobro) {
      cobro.modo = b.dataset.cobroModo; cobro.sel = {};
      actualizarCobro();
    } else if (b.dataset.selMas && cobro) { cambiarSeleccion(b.dataset.selMas, 1);
    } else if (b.dataset.selMenos && cobro) { cambiarSeleccion(b.dataset.selMenos, -1);
    } else if (b.dataset.selTodo && cobro) { cambiarSeleccion(b.dataset.selTodo, 'todo');
    } else if (b.dataset.persona && cobro) {
      const [i, f] = b.dataset.persona.split(':');
      cobro.formasPersona[Number(i)] = f;
      actualizarCobro();
    } else if ((b.dataset.dvMas || b.dataset.dvMenos) && devol && visto) {
      const k = b.dataset.dvMas || b.dataset.dvMenos;
      const l = visto.lineas.find((x) => x.k === k);
      devol.sel[k] = Math.max(0, Math.min(Number(l.cantidad), (devol.sel[k] || 0) + (b.dataset.dvMas ? 1 : -1)));
      actualizarDevolucion();
    } else if (b.dataset.dvForma && devol) {
      devol.forma = b.dataset.dvForma;
      actualizarDevolucion();
    } else if (b.dataset.libre !== undefined) {
      abrirComandero(b.dataset.libre);
    } else if (b.dataset.anadirMesa) {
      const ref = datos.pedidos.find((p) => p.id === b.dataset.anadirMesa);
      abrirComandero(ref ? (ref.mesa_id || '') : undefined);
    } else if (b.dataset.moverMesa) {
      abrirMover(b.dataset.moverMesa);
    } else if (b.dataset.moverA) {
      moverA(b.dataset.moverA);
    } else if (b.hasAttribute('data-mover-cerrar')) {
      $('dlg-mover').close();
    } else if (b.id === 'k-pedido') {
      abrirComandero(undefined);
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
        tpv = null; parciales.clear(); $('k-stock').innerHTML = ''; $('k-pedido').hidden = true;
        mostrarLogin();
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sesion && datos) { pedirWakeLock(); sondear(); cargarFiscal(); }
  });
  document.addEventListener('input', (ev) => {
    if (cobro && ev.target.closest('#dlg-cobrar')) actualizarCobro();
    if (devol && ev.target.closest('#dlg-ticket')) actualizarDevolucion();
  });
  document.addEventListener('change', (ev) => { if (cobro && ev.target.id === 'cb-factura') actualizarCobro(); });
  $('dlg-cobrar').addEventListener('close', () => { cobro = null; });
  $('dlg-ticket').addEventListener('close', () => { visto = null; devol = null; });
  $('dlg-mover').addEventListener('close', () => { mover = null; });
  setInterval(() => { if (sesion && datos && document.visibilityState === 'visible') cargarTPV(); }, 60000);
  { const st = document.createElement('style'); st.textContent = window.CartaTicket ? window.CartaTicket.css : ''; document.head.appendChild(st); }

  iniciar();
})();
