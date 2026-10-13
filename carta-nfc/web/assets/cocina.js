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
    pausa.textContent = r.pedidos_abiertos ? '📲 Pedidos móvil: abiertos' : '⏸ Pedidos móvil: PAUSADOS';
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
        <button class="btn sm" data-print-mesa="${esc(g.ref.id)}">🖨 Ticket</button>
        <button class="btn sm primary" style="flex:1" data-cerrar-mesa="${esc(g.ref.id)}">Cobrada · liberar mesa</button>
      </div>
    </article>`;
  }

  // ---------------------------------------------------------- impresión ----
  function imprimir(html) {
    const f = $('print-frame');
    const doc = f.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
      body{font:14px/1.35 ui-monospace,Menlo,Consolas,monospace;width:72mm;margin:0;padding:4mm;color:#000}
      h1{font-size:22px;margin:0}h2{font-size:15px;margin:2px 0 8px}.r{display:flex;justify-content:space-between;gap:6px}
      hr{border:0;border-top:1px dashed #000;margin:6px 0}.n{font-style:italic;padding-left:12px}.t{font-size:18px;font-weight:700}
      </style></head><body>${html}</body></html>`);
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

  // --------------------------------------------------------- sonido y aviso ----
  function pintarSonido() {
    $('k-sonido').textContent = sonidoOn && audio && audio.state === 'running' ? '🔔 Sonido activado' : '🔕 Activar sonido';
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
      vista = b.dataset.vista;
      document.querySelectorAll('[data-vista]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.vista === vista)));
      $('v-comandas').hidden = vista !== 'comandas';
      $('v-mesas').hidden = vista !== 'mesas';
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
        store.del(K_SESION); clearTimeout(timer); sesion = null; vistos = null; mostrarLogin();
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sesion && datos) { pedirWakeLock(); sondear(); }
  });

  iniciar();
})();
