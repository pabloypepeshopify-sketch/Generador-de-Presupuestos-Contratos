// Panel del bar (versión "Solo pedidos"): los pedidos de las mesas llegan con sonido al móvil junto al TPV.
// El camarero los pasa a su TPV y toca "✓ Apuntado". Avisos de camarero/cuenta y pestaña Mesas con ticket.
(function () {
  const { rpc, esc, dinero, hace, hora, toast, aplicarColor, aplicarTema, store, urlRestaurante, qr, imprimir } = window.Carta;
  const $ = (id) => document.getElementById(id);
  const K_SESION = 'carta:cocina';
  const K_SONIDO = 'carta:cocina:sonido';
  const RECORDAR_MS = 20000;   // mientras haya pedidos o avisos sin atender, vuelve a sonar
  // TODO(gestoría): pie del ticket impreso. Es una pre-cuenta, no una factura: si un día se cobra con este
  // ticket porque falla el TPV, el bar debe emitir después su factura en el TPV.
  const PIE_TICKET = 'IVA incluido. Pre-cuenta: no válida como factura.';

  let sesion = null;     // { slug, clave }
  let datos = null;      // última respuesta de carta_cocina
  let vista = 'pedidos';
  let vistos = null;     // ids ya notificados (null = primera carga)
  let timer = null;
  let fallos = 0;
  let audio = null;
  let sonidoOn = store.get(K_SONIDO, true);
  let wakeLock = null;
  let ultimoPitido = 0;
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
    aplicarTema(datos.restaurante.slug);
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
      if (e.code === 'clave_incorrecta') { clearTimeout(timer); store.del(K_SESION); return mostrarLogin('La clave del panel ha cambiado. Vuelve a entrar.'); }
      fallos++;
      $('k-conn').className = 'dot err';
      if (fallos >= 2) $('k-offline').hidden = false;
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

  const pendientes = (d) => d.pedidos.filter((p) => p.estado === 'nuevo' && !p.cerrado);

  function procesar(d) {
    datos = d;
    $('k-conn').className = 'dot ok';
    $('k-offline').hidden = true;
    const nuevos = pendientes(d);
    if (vistos === null) {
      vistos = new Set(d.pedidos.map((p) => p.id));
    } else {
      const llegan = nuevos.filter((p) => !vistos.has(p.id));
      llegan.forEach((p) => { vistos.add(p.id); recien.add(p.id); setTimeout(() => recien.delete(p.id), 5000); });
      if (llegan.length) avisarLlegada(llegan);
      else if (nuevos.length && Date.now() - ultimoPitido > RECORDAR_MS) pitar(nuevos.some((p) => p.tipo === 'pedido'));
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
    pausa.innerHTML = r.pedidos_abiertos ? '📲 <span class="lbl">Pedidos: </span>abiertos' : '⏸ <span class="lbl">Pedidos: </span>PAUSADOS';
    pausa.setAttribute('aria-label', pausa.textContent);
    pausa.className = 'btn sm ' + (r.pedidos_abiertos ? 'abiertos' : 'pausados');

    const avisos = d.pedidos.filter((p) => p.tipo !== 'pedido' && p.estado === 'nuevo');
    const pedidos = d.pedidos.filter((p) => p.tipo === 'pedido');
    const nuevos = pedidos.filter((p) => p.estado === 'nuevo');

    $('k-avisos').innerHTML = avisos.map((a) => {
      const totalMesa = pedidos.filter((p) => mismaMesa(p, a) && p.estado !== 'cancelado').reduce((s, p) => s + Number(p.total), 0);
      return `<div class="aviso ${esc(a.tipo)}">
        <span>${a.tipo === 'cuenta' ? '🧾' : '🙋'} <b>${esc(a.mesa)}</b> · ${a.tipo === 'cuenta' ? 'pide la cuenta' + (totalMesa ? ` (${dinero(totalMesa, r.moneda)})` : '') : 'llama al camarero'}
          <small class="muted">${hace(a.creado, ahora)}</small></span>
        <button class="btn" type="button" data-atender="${esc(a.id)}">Atendido</button>
      </div>`;
    }).join('');

    $('l-nuevos').innerHTML = nuevos.length ? nuevos.map((p) => tarjeta(p, ahora, r.moneda)).join('')
      : `<div class="vacio">${r.pedidos_abiertos ? 'Esperando pedidos…' : '⏸ Pedidos por el móvil pausados'}</div>`;

    const apuntados = pedidos.filter((p) => ['preparando', 'listo', 'servido'].includes(p.estado))
      .sort((a, b) => new Date(b.actualizado) - new Date(a.actualizado)).slice(0, 8);
    $('apuntados').hidden = !apuntados.length;
    $('l-apuntados').innerHTML = apuntados.map((p) => `<div class="apuntado">
      <span><b>${esc(p.mesa)}</b> · #${esc(p.numero)} · ${p.lineas.map((l) => `${esc(l.cantidad)}× ${esc(l.nombre)}`).join(', ')}</span>
      <button class="btn sm ghost" type="button" data-deshacer="${esc(p.id)}" aria-label="Deshacer: volver a nuevo">↩</button></div>`).join('');

    $('n-pedidos').textContent = nuevos.length || '';
    const mesas = agruparMesas(d.pedidos);
    $('n-mesas').textContent = mesas.length || '';
    $('v-mesas').innerHTML = mesas.length ? mesas.map((m) => tarjetaMesa(m, r.moneda)).join('')
      : '<div class="vacio">No hay mesas con consumo abierto.</div>';

    const n = nuevos.length + avisos.length;
    document.title = (n ? `(${n}) ` : '') + 'Pedidos · ' + r.nombre;
  }

  function tarjeta(p, ahora, moneda) {
    const min = Math.floor((ahora - new Date(p.creado).getTime()) / 60000);
    const cls = min >= 10 ? 'muy-tarde' : min >= 5 ? 'tarde' : '';
    return `<article class="ped${recien.has(p.id) ? ' recien' : ''}" data-id="${esc(p.id)}">
      <div class="p-head"><span class="p-mesa">${esc(p.mesa)}</span>
        <span class="p-meta">#${esc(p.numero)} · ${hora(p.creado)} · <span class="${cls}">${hace(p.creado, ahora)}</span></span></div>
      <ul class="p-lineas">${p.lineas.map((l) => `<li><b>${esc(l.cantidad)}×</b> ${esc(l.nombre)}${l.nota ? `<em>→ ${esc(l.nota)}</em>` : ''}</li>`).join('')}</ul>
      ${p.nota ? `<p class="p-nota">📝 ${esc(p.nota)}</p>` : ''}
      <div class="p-foot">
        <span class="p-total num">${dinero(p.total, moneda)}</span>
        <button class="btn ghost danger" type="button" data-cancelar="${esc(p.id)}" aria-label="Cancelar pedido de ${esc(p.mesa)}">✕</button>
        <button class="btn primary apuntar" type="button" data-apuntar="${esc(p.id)}">✓ Apuntado</button>
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

  function consumo(g) {
    const validos = g.pedidos.filter((p) => p.estado !== 'cancelado');
    const items = {};
    validos.forEach((p) => p.lineas.forEach((l) => {
      const k = l.nombre + '|' + l.precio;
      items[k] = items[k] || { nombre: l.nombre, precio: Number(l.precio), cantidad: 0 };
      items[k].cantidad += l.cantidad;
    }));
    return { validos, items: Object.values(items), total: validos.reduce((s, p) => s + Number(p.total), 0) };
  }

  function tarjetaMesa(g, moneda) {
    const { validos, items, total } = consumo(g);
    const sin = validos.filter((p) => p.estado === 'nuevo').length;
    return `<article class="card mesa-card${g.cuenta ? ' pide-cuenta' : ''}">
      <h3><span>${esc(g.nombre)}</span><span class="num">${dinero(total, moneda)}</span></h3>
      <div class="estados">
        ${g.cuenta ? '<span class="chip">🧾 Pide la cuenta</span>' : ''}
        <span class="chip">${validos.length} pedido${validos.length === 1 ? '' : 's'}</span>
        ${sin ? `<span class="chip alerta">${sin} sin apuntar</span>` : ''}
      </div>
      <ul>${items.map((i) => `<li><span>${i.cantidad}× ${esc(i.nombre)}</span><span class="num">${dinero(i.cantidad * i.precio, moneda)}</span></li>`).join('')}</ul>
      <div class="mesa-acc">
        <button class="btn" type="button" data-ticket="${esc(g.ref.id)}">🖨 Imprimir ticket</button>
        <button class="btn primary" type="button" data-liberar="${esc(g.ref.id)}">Cobrada · liberar mesa</button>
      </div>
    </article>`;
  }

  const grupoDe = (refId) => {
    const ref = datos.pedidos.find((p) => p.id === refId);
    return ref && agruparMesas(datos.pedidos).find((x) => mismaMesa(x.ref, ref));
  };

  // Pre-cuenta de 80 mm por si falla el TPV.
  function imprimirTicket(refId) {
    const g = grupoDe(refId);
    if (!g) return;
    const m = datos.restaurante.moneda, { items, total } = consumo(g);
    imprimir(`<h1>${esc(datos.restaurante.nombre)}</h1><h2>${esc(g.nombre)} · ${new Date().toLocaleString('es-ES')}</h2><hr>
      ${items.map((i) => `<div class="r"><span>${i.cantidad}× ${esc(i.nombre)}</span><span>${dinero(i.cantidad * i.precio, m)}</span></div>`).join('')}
      <hr><div class="r t"><span>TOTAL</span><span>${dinero(total, m)}</span></div><p class="pie">${esc(PIE_TICKET)}</p>`,
    `@page{size:80mm auto;margin:0}
      body{font:14px/1.35 ui-monospace,Menlo,Consolas,monospace;width:72mm;margin:0;padding:4mm;color:#000;background:#fff}
      h1{font-size:20px;margin:0}h2{font-size:14px;margin:2px 0 8px;font-weight:400}.r{display:flex;justify-content:space-between;gap:6px}
      hr{border:0;border-top:1px dashed #000;margin:6px 0}.t{font-size:18px;font-weight:700}.pie{font-size:11px;margin-top:8px}`);
  }

  async function liberar(refId) {
    const g = grupoDe(refId);
    if (!g) return;
    const sin = g.pedidos.filter((p) => p.estado === 'nuevo').length;
    const msg = (sin ? `Ojo: ${g.nombre} tiene ${sin} pedido(s) sin apuntar.\n` : '') + `¿Marcar ${g.nombre} como cobrada y dejarla libre?`;
    if (confirm(msg) && await accion('cerrar', { ids: g.ids })) toast(`${g.nombre} liberada`);
  }

  function abrirQr() {
    $('qr-img').innerHTML = qr(urlRestaurante(sesion.slug)).createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    $('qr-titulo').textContent = datos.restaurante.nombre;
    $('dlg-qr').showModal();
  }

  function cambiarVista(v) {
    vista = v;
    document.querySelectorAll('[data-vista]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.vista === vista)));
    $('v-pedidos').hidden = vista !== 'pedidos';
    $('v-mesas').hidden = vista !== 'mesas';
  }

  // --------------------------------------------------------- sonido y aviso ----
  const sonando = () => sonidoOn && audio && audio.state === 'running';

  function pintarSonido() {
    $('k-sonido').innerHTML = sonando() ? '🔔 <span class="lbl">Sonido</span>' : '🔕 <span class="lbl">Sin sonido</span>';
    $('k-sonido').setAttribute('aria-label', sonando() ? 'Sonido activado: tocar para apagar' : 'Sonido apagado: tocar para activar');
    $('k-activar').hidden = sonando();
  }

  function activarAudio() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume().then(pintarSonido, pintarSonido);
    } catch { /* sin audio */ }
    pintarSonido();
  }

  // Timbre fuerte (onda cuadrada, volumen alto), dos veces para pedidos.
  function pitar(esPedido) {
    ultimoPitido = Date.now();
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    if (!sonando()) return;
    const notas = esPedido ? [988, 1319, 988, 1319, 0, 988, 1319, 988, 1319] : [784, 784, 784];
    let t = audio.currentTime;
    notas.forEach((f) => {
      if (f) {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.9, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g).connect(audio.destination);
        o.start(t); o.stop(t + 0.22);
      }
      t += 0.22;
    });
  }

  function avisarLlegada(llegan) {
    const hayPedido = llegan.some((p) => p.tipo === 'pedido');
    pitar(hayPedido);
    const p = llegan[0];
    toast(p.tipo === 'pedido' ? `Nuevo pedido · ${p.mesa}` : p.tipo === 'cuenta' ? `${p.mesa} pide la cuenta` : `${p.mesa} llama al camarero`);
  }

  async function pedirWakeLock() {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible' && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch { /* no soportado */ }
  }

  // --------------------------------------------------------------- eventos ----
  $('login-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    sesion = { slug: $('login-slug').value.trim().toLowerCase(), clave: $('login-clave').value.trim() };
    activarAudio();
    entrar();
  });

  // Cualquier toque reactiva el audio (los navegadores lo exigen) y la pantalla encendida.
  document.addEventListener('pointerdown', (ev) => {
    if (sonidoOn && !sonando() && !ev.target.closest('#k-sonido')) activarAudio();
    pedirWakeLock();
  });

  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    const ds = b.dataset;
    if (ds.vista) cambiarVista(ds.vista);
    else if (ds.apuntar) { b.disabled = true; await accion('estado', { id: ds.apuntar, estado: 'servido' }); }
    else if (ds.deshacer) { b.disabled = true; await accion('estado', { id: ds.deshacer, estado: 'nuevo' }); }
    else if (ds.atender) { b.disabled = true; await accion('estado', { id: ds.atender, estado: 'servido' }); }
    else if (ds.cancelar) {
      if (confirm('¿Cancelar este pedido? No contará en la cuenta de la mesa.')) await accion('estado', { id: ds.cancelar, estado: 'cancelado' });
    } else if (ds.ticket) imprimirTicket(ds.ticket);
    else if (ds.liberar) liberar(ds.liberar);
    else if (b.hasAttribute('data-cerrar')) b.closest('dialog').close();
    else if (b.id === 'k-qr') abrirQr();
    else if (b.id === 'k-activar') { sonidoOn = true; store.set(K_SONIDO, true); activarAudio(); setTimeout(() => pitar(false), 150); }
    else if (b.id === 'k-sonido') {
      sonidoOn = !sonando();
      store.set(K_SONIDO, sonidoOn);
      activarAudio();
      if (sonidoOn) setTimeout(() => pitar(false), 150);
      pintarSonido();
    } else if (b.id === 'k-pausa') {
      const abrir = !datos.restaurante.pedidos_abiertos;
      if (abrir || confirm('¿Pausar los pedidos por móvil? Los clientes verán la carta pero no podrán pedir.')) await accion('pausa', { abiertos: abrir });
    } else if (b.id === 'k-salir') {
      if (confirm('¿Salir del panel? Tendrás que volver a introducir la clave.')) {
        store.del(K_SESION); clearTimeout(timer); sesion = null; vistos = null;
        cambiarVista('pedidos');
        mostrarLogin();
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sesion && datos) { pedirWakeLock(); sondear(); }
  });
  window.addEventListener('offline', () => { if (sesion && datos) $('k-offline').hidden = false; });
  window.addEventListener('online', () => { if (sesion && datos) sondear(); });

  iniciar();
})();
