// Panel del bar (versión "Solo pedidos"): los pedidos de las mesas llegan con sonido al móvil junto al TPV.
// El camarero los pasa a su TPV y toca "✓ Apuntado" (estado preparando). Avisos de camarero/cuenta, mapa de mesas
// con colores (ticket, liberar y código de mesa), agotados en un toque y modo "pantalla de cocina" (Nuevos →
// Preparando → ¡Listo!), que puede ver solo unas categorías y recibir los pedidos al momento o cuando el camarero
// los apunta. "¡Listo!" pasa el pedido a listo y el camarero lo ve en "Listos para servir".
(function () {
  const { rpc, esc, dinero, hace, hora, toast, aplicarColor, aplicarTema, store, urlRestaurante, qr, imprimir } = window.Carta;
  const $ = (id) => document.getElementById(id);
  const K_SESION = 'carta:cocina';
  const K_SONIDO = 'carta:cocina:sonido';
  const RECORDAR_MS = 20000;   // mientras haya pedidos o avisos sin atender, vuelve a sonar
  const RECORDAR_COCINA_MS = 60000;
  // TODO(gestoría): pie del ticket impreso. Es una pre-cuenta, no una factura: si un día se cobra con este
  // ticket porque falla el TPV, el bar debe emitir después su factura en el TPV.
  const PIE_TICKET = 'IVA incluido. Pre-cuenta: no válida como factura.';

  let sesion = null;     // { slug, clave }
  let datos = null;      // última respuesta de carta_cocina (pedidos abiertos)
  let panel = null;      // carta_panel: mesas, carta y código de mesa (null si no está disponible)
  let vista = 'pedidos';
  let vistos = null;     // ids ya notificados (null = primera carga)
  let timer = null;
  let fallos = 0;
  let audio = null;
  let sonidoOn = store.get(K_SONIDO, true);
  let wakeLock = null;
  let ultimoPitido = 0;
  let mesaAbierta = null;  // mesa del diálogo abierto (id o 'n:<nombre>')
  // Qué es esta pantalla: 'todo' (camarero junto al TPV) o 'cocina' (Nuevos → Preparando → ¡Listo!).
  // cats: solo esas categorías (null = todas). esperar: la cocina recibe el pedido cuando el camarero lo apunta.
  let puesto = { modo: 'todo', cats: null, esperar: false, desde: 0 };
  let hechos = new Map();        // en la pantalla de cocina: id → { e: 'prep' | 'listo', t }
  let vistosListo = null;        // camarero: pedidos listos ya avisados
  const sincronizando = new Set();
  const recien = new Set();

  const kPuesto = () => 'carta:puesto:' + sesion.slug;
  const kHechos = () => 'carta:hechos:' + sesion.slug;

  // ---------------------------------------------------------------- sesión ----
  function iniciar() {
    const qs = new URLSearchParams(location.search);
    if (qs.get('r') && qs.get('k')) {
      sesion = { slug: qs.get('r').toLowerCase(), clave: qs.get('k') };
      history.replaceState(null, '', location.pathname); // la clave no se queda a la vista en la barra
    } else {
      // Desde Gestión se entra directo: la clave del dueño también abre el panel.
      sesion = store.get(K_SESION, null) || store.get('carta:admin', null);
    }
    if (!sesion) return mostrarLogin();
    entrar();
  }

  function mostrarLogin(msg) {
    $('panel').hidden = true;
    $('conectando').hidden = true;
    $('login').hidden = false;
    $('login-error').textContent = msg || '';
    if (sesion) $('login-slug').value = sesion.slug;
  }

  // Sin internet no se pide la clave: se espera a que vuelva la conexión y se entra solo.
  let reintento = null;
  function mostrarConectando(msg) {
    $('login').hidden = true;
    $('panel').hidden = true;
    $('conectando').hidden = false;
    $('conectando-txt').textContent = msg || 'Sin conexión con el servidor. Lo intento otra vez sola cada pocos segundos.';
    clearTimeout(reintento);
    reintento = setTimeout(entrar, 5000);
  }

  async function entrar() {
    clearTimeout(reintento);
    try {
      datos = await rpc('carta_cocina', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: 'listar', p_datos: {} });
    } catch (e) {
      if (e.code === 'clave_incorrecta') { store.del(K_SESION); return mostrarLogin('Restaurante o clave incorrectos.'); }
      return mostrarConectando(e.code === 'red' ? '' : e.humano);
    }
    store.set(K_SESION, sesion);
    puesto = leerPuesto();
    hechos = new Map(store.get(kHechos(), []).map(([id, v]) => [id, typeof v === 'number' ? { e: 'listo', t: v } : v])
      .filter(([, v]) => v && Date.now() - v.t < 18 * 3600e3));
    $('login').hidden = true;
    $('conectando').hidden = true;
    $('panel').hidden = false;
    aplicarColor(datos.restaurante.color);
    aplicarTema(datos.restaurante.slug);
    $('k-nombre').textContent = datos.restaurante.nombre;
    $('k-admin').hidden = !datos.es_admin;
    pintarSonido();
    procesar(datos);
    programar();
    pedirWakeLock();
    cargarPanel();
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

  // Mesas, carta y código de mesa (009_panel_bar.sql). Si no está, el panel funciona sin mapa completo ni agotados.
  async function cargarPanel(nombre, payload) {
    try {
      const r = await rpc('carta_panel', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: nombre || 'datos', p_datos: payload || {} });
      panel = r;
      if (datos) pintar();
      return r;
    } catch (e) {
      if (nombre) toast(e.humano, 'error');
      return null;
    }
  }

  // ---------------------------------------------------------- pantalla ----
  // Una pantalla de cocina puede ver solo unas categorías (cocina sin bebidas, barra solo bebidas). Lo que no tiene
  // categoría se ve en todas. "Empezar" es de esta pantalla; "¡Listo!" avisa al camarero (estado listo).
  function leerPuesto() {
    const g = store.get(kPuesto(), {}) || {};
    const modo = g.modo || (g.cats && g.cats.length ? 'cocina' : 'todo');  // pantallas guardadas con la versión anterior
    return { modo, cats: g.cats && g.cats.length ? g.cats : null, esperar: !!g.esperar, desde: g.desde || 0 };
  }
  const enPuesto = () => puesto.modo === 'cocina';
  function lineasPuesto(p) {
    if (!enPuesto() || !puesto.cats) return p.lineas;
    return p.lineas.filter((l) => !l.categoria_id || puesto.cats.includes(l.categoria_id));
  }
  const relevante = (p) => (p.tipo === 'pedido' ? lineasPuesto(p).length > 0 : !enPuesto());

  // Columna de un pedido en la pantalla de cocina: 'nuevo' | 'prep' | 'listo' | null (no se ve aquí).
  function columna(p) {
    if (p.tipo !== 'pedido' || p.cerrado || p.estado === 'cancelado' || !lineasPuesto(p).length) return null;
    const h = hechos.get(p.id);
    if (h) return h.e;
    if (p.estado === 'nuevo') return puesto.esperar ? null : 'nuevo';
    if (p.estado === 'preparando') return 'nuevo';
    // Listo o servido por otra pantalla: si llegó después de configurar esta, aquí aún falta lo suyo.
    return new Date(p.creado).getTime() > puesto.desde ? 'nuevo' : null;
  }

  const pendiente = (p) => !p.cerrado && (enPuesto() ? columna(p) === 'nuevo' : p.estado === 'nuevo');
  const listoServir = (p) => !enPuesto() && p.tipo === 'pedido' && !p.cerrado && p.estado === 'listo';

  function guardarHechos() { store.set(kHechos(), [...hechos.entries()]); }

  function procesar(d) {
    datos = d;
    $('k-conn').className = 'dot ok';
    $('k-offline').hidden = true;
    const nuevos = d.pedidos.filter(pendiente);
    const listos = d.pedidos.filter(listoServir);
    if (vistos === null) {
      vistos = new Set(nuevos.map((p) => p.id));
      vistosListo = new Set(listos.map((p) => p.id + p.actualizado));
    } else {
      const llegan = nuevos.filter((p) => !vistos.has(p.id));
      const salen = listos.filter((p) => !vistosListo.has(p.id + p.actualizado));
      nuevos.forEach((p) => vistos.add(p.id));
      listos.forEach((p) => vistosListo.add(p.id + p.actualizado));
      llegan.concat(salen).forEach((p) => { recien.add(p.id); setTimeout(() => recien.delete(p.id), 5000); });
      if (llegan.length) avisarLlegada(llegan);
      else if (salen.length) { pitar('listo'); toast(`🍽 Listo para servir · ${salen[0].mesa}`); }
      else if ((nuevos.length || listos.length) && Date.now() - ultimoPitido > (enPuesto() ? RECORDAR_COCINA_MS : RECORDAR_MS)) {
        pitar(nuevos.some((p) => p.tipo === 'pedido') ? 'pedido' : nuevos.length ? 'aviso' : 'listo');
      }
    }
    if (enPuesto()) sincronizarListos();
    pintar();
  }

  // Si la cocina terminó algo que el camarero aún no había apuntado, al apuntarlo pasa a listo solo.
  function sincronizarListos() {
    datos.pedidos.forEach((p) => {
      const h = hechos.get(p.id);
      if (h && h.e === 'listo' && p.estado === 'preparando' && !sincronizando.has(p.id)) {
        sincronizando.add(p.id);
        accion('estado', { id: p.id, estado: 'listo' }).finally(() => sincronizando.delete(p.id));
      }
    });
  }

  function marcar(id, e) {
    if (e) hechos.set(id, { e, t: Date.now() }); else hechos.delete(id);
    guardarHechos();
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
    const nombresCat = enPuesto() && puesto.cats && panel ? panel.categorias.filter((c) => puesto.cats.includes(c.id)).map((c) => c.nombre) : [];
    $('k-puesto-chip').hidden = !enPuesto();
    $('k-puesto-chip').textContent = '🖥 Cocina' + (nombresCat.length ? ': ' + nombresCat.join(', ') : '');

    const avisos = enPuesto() ? [] : d.pedidos.filter((p) => p.tipo !== 'pedido' && p.estado === 'nuevo');
    const pedidos = d.pedidos.filter((p) => p.tipo === 'pedido');
    const nuevos = pedidos.filter(pendiente);
    $('v-pedidos').hidden = vista !== 'pedidos' || enPuesto();
    $('v-cocina').hidden = vista !== 'pedidos' || !enPuesto();
    document.querySelector('[data-vista="mesas"]').hidden = enPuesto();
    if (enPuesto() && vista === 'mesas') cambiarVista('pedidos');

    $('k-avisos').innerHTML = avisos.map((a) => {
      const totalMesa = pedidos.filter((p) => mismaMesa(p, a) && p.estado !== 'cancelado').reduce((s, p) => s + Number(p.total), 0);
      return `<div class="aviso ${esc(a.tipo)}">
        <span>${a.tipo === 'cuenta' ? '🧾' : '🙋'} <b>${esc(a.mesa)}</b> · ${a.tipo === 'cuenta' ? 'pide la cuenta' + (totalMesa ? ` (${dinero(totalMesa, r.moneda)})` : '') : 'llama al camarero'}
          <small class="muted">${hace(a.creado, ahora)}</small></span>
        <button class="btn" type="button" data-atender="${esc(a.id)}">Atendido</button>
      </div>`;
    }).join('');

    if (enPuesto()) pintarCocina(pedidos, ahora);
    else pintarCamarero(pedidos, nuevos, ahora, r);

    $('n-pedidos').textContent = nuevos.length || '';
    pintarMapa(ahora, r.moneda);
    pintarCarta();
    if (mesaAbierta && $('dlg-mesa').open) pintarMesa();

    const n = nuevos.length + avisos.length;
    document.title = (n ? `(${n}) ` : '') + 'Pedidos · ' + r.nombre;
  }

  const resumen = (p) => lineasPuesto(p).map((l) => `${esc(l.cantidad)}× ${esc(l.nombre)}`).join(', ');

  function pintarCamarero(pedidos, nuevos, ahora, r) {
    $('l-nuevos').innerHTML = nuevos.length ? nuevos.map((p) => tarjeta(p, ahora, r.moneda)).join('')
      : `<div class="vacio">${r.pedidos_abiertos ? 'Esperando pedidos…' : '⏸ Pedidos por el móvil pausados'}</div>`;

    // Lo que la cocina ha terminado: el camarero lo lleva a la mesa y toca "Servido".
    const listos = pedidos.filter(listoServir).sort((a, b) => new Date(a.actualizado) - new Date(b.actualizado));
    $('listos').hidden = !listos.length;
    $('l-listos').innerHTML = listos.map((p) => `<div class="listo-item${recien.has(p.id) ? ' recien' : ''}">
      <span><b>${esc(p.mesa)}</b> · #${esc(p.numero)} · ${resumen(p)} <small class="muted">${hace(p.actualizado, ahora)}</small></span>
      <button class="btn primary" type="button" data-servido="${esc(p.id)}">✓ Servido</button></div>`).join('');

    // Lo último apuntado, con ↩ para deshacer un toque por error.
    const atendidos = pedidos.filter((p) => ['preparando', 'listo', 'servido'].includes(p.estado))
      .sort((a, b) => new Date(b.actualizado) - new Date(a.actualizado));
    $('apuntados').hidden = !atendidos.length;
    $('l-apuntados').innerHTML = atendidos.slice(0, 8).map((p) => `<div class="apuntado">
      <span><b>${esc(p.mesa)}</b> · #${esc(p.numero)} · ${resumen(p)}${p.estado === 'preparando' ? '' : ` <span class="chip">${p.estado === 'listo' ? 'listo' : 'servido'}</span>`}</span>
      <button class="btn sm ghost" type="button" data-deshacer="${esc(p.id)}" aria-label="Deshacer: volver a nuevo">↩</button></div>`).join('');
  }

  // Pantalla de cocina: tres columnas con el tiempo que lleva esperando cada pedido (verde, amarillo, rojo).
  function pintarCocina(pedidos, ahora) {
    const col = { nuevo: [], prep: [], listo: [] };
    pedidos.forEach((p) => { const c = columna(p); if (c) col[c].push(p); });
    const porLlegada = (a, b) => new Date(a.creado) - new Date(b.creado);
    col.nuevo.sort(porLlegada);
    col.prep.sort(porLlegada);
    col.listo = col.listo.filter((p) => Date.now() - hechos.get(p.id).t < 30 * 60e3)
      .sort((a, b) => hechos.get(b.id).t - hechos.get(a.id).t).slice(0, 8);
    $('k-nuevo').innerHTML = col.nuevo.map((p) => tarjetaCocina(p, ahora, 'nuevo')).join('')
      || `<div class="vacio">${puesto.esperar ? 'Llegan aquí cuando el camarero los apunta.' : 'Esperando pedidos…'}</div>`;
    $('k-prep').innerHTML = col.prep.map((p) => tarjetaCocina(p, ahora, 'prep')).join('') || '<div class="vacio">—</div>';
    $('k-listo').innerHTML = col.listo.map((p) => tarjetaCocina(p, ahora, 'listo')).join('') || '<div class="vacio">—</div>';
    $('c-nuevo').textContent = col.nuevo.length || '';
    $('c-prep').textContent = col.prep.length || '';
    $('c-listo').textContent = col.listo.length || '';
  }

  function tarjetaCocina(p, ahora, c) {
    const min = Math.max(0, Math.floor((ahora - new Date(p.creado).getTime()) / 60000));
    const color = c === 'listo' ? 'hecho' : min >= 20 ? 't-rojo' : min >= 10 ? 't-amarillo' : 't-verde';
    const lineas = lineasPuesto(p), otras = p.lineas.length - lineas.length;
    const boton = c === 'nuevo' ? `<button class="btn primary block" type="button" data-empezar="${esc(p.id)}">▶ Empezar</button>`
      : c === 'prep' ? `<button class="btn primary block listo" type="button" data-listo="${esc(p.id)}">✓ ¡Listo!</button>`
        : '';
    return `<article class="kc ${color}${recien.has(p.id) ? ' recien' : ''}" data-id="${esc(p.id)}">
      <div class="kc-head"><span class="kc-mesa">${esc(p.mesa)}</span>
        <span class="kc-t num">${c === 'listo' ? '✓ ' + hora(new Date(hechos.get(p.id).t).toISOString()) : min + ' min'}</span>
        ${c !== 'nuevo' ? `<button class="btn sm ghost" type="button" data-volver="${esc(p.id)}" aria-label="Deshacer">↩</button>` : ''}</div>
      <div class="kc-meta muted">#${esc(p.numero)} · ${hora(p.creado)}</div>
      ${c === 'listo' ? `<p class="kc-res">${resumen(p)}</p>` : `<ul class="p-lineas">${lineas.map((l) => `<li><b>${esc(l.cantidad)}×</b> ${esc(l.nombre)}${l.nota ? `<em>→ ${esc(l.nota)}</em>` : ''}</li>`).join('')}</ul>
      ${otras ? `<p class="p-otros">+ ${otras} línea${otras === 1 ? '' : 's'} de otra pantalla</p>` : ''}
      ${p.nota ? `<p class="p-nota">📝 ${esc(p.nota)}</p>` : ''}`}
      ${boton}
    </article>`;
  }

  function tarjeta(p, ahora, moneda) {
    const min = Math.floor((ahora - new Date(p.creado).getTime()) / 60000);
    const cls = min >= 10 ? 'muy-tarde' : min >= 5 ? 'tarde' : '';
    const lineas = lineasPuesto(p), otras = p.lineas.length - lineas.length;
    return `<article class="ped${recien.has(p.id) ? ' recien' : ''}" data-id="${esc(p.id)}">
      <div class="p-head"><span class="p-mesa">${esc(p.mesa)}</span>
        <span class="p-meta">#${esc(p.numero)} · ${hora(p.creado)} · <span class="${cls}">${hace(p.creado, ahora)}</span></span></div>
      <ul class="p-lineas">${lineas.map((l) => `<li><b>${esc(l.cantidad)}×</b> ${esc(l.nombre)}${l.nota ? `<em>→ ${esc(l.nota)}</em>` : ''}</li>`).join('')}</ul>
      ${otras ? `<p class="p-otros">+ ${otras} línea${otras === 1 ? '' : 's'} de otra pantalla</p>` : ''}
      ${p.nota ? `<p class="p-nota">📝 ${esc(p.nota)}</p>` : ''}
      <div class="p-foot">
        <span class="p-total num">${dinero(p.total, moneda)}</span>
        <button class="btn ghost danger" type="button" data-cancelar="${esc(p.id)}" aria-label="Cancelar pedido de ${esc(p.mesa)}">✕</button>
        <button class="btn primary apuntar" type="button" data-apuntar="${esc(p.id)}">✓ Apuntado</button>
      </div>
    </article>`;
  }

  function mismaMesa(a, b) { return (a.mesa_id || b.mesa_id) ? a.mesa_id === b.mesa_id : a.mesa === b.mesa; }
  const claveMesa = (p) => p.mesa_id || 'n:' + p.mesa;

  // Pedidos abiertos de una mesa (por id de mesa, o por nombre si la mesa ya no existe).
  function grupo(clave) {
    const todos = datos.pedidos.filter((p) => claveMesa(p) === clave);
    const pedidos = todos.filter((p) => p.tipo === 'pedido');
    const validos = pedidos.filter((p) => p.estado !== 'cancelado');
    const items = {};
    validos.forEach((p) => p.lineas.forEach((l) => {
      const k = l.nombre + '|' + l.precio;
      items[k] = items[k] || { nombre: l.nombre, precio: Number(l.precio), cantidad: 0 };
      items[k].cantidad += l.cantidad;
    }));
    return {
      todos, pedidos, validos, items: Object.values(items),
      total: validos.reduce((s, p) => s + Number(p.total), 0),
      nuevos: validos.filter((p) => p.estado === 'nuevo').length,
      listos: validos.filter((p) => p.estado === 'listo').length,
      cuenta: todos.some((p) => p.tipo === 'cuenta' && p.estado === 'nuevo'),
      camarero: todos.some((p) => p.tipo === 'camarero' && p.estado === 'nuevo'),
      ultimo: validos.reduce((m, p) => Math.max(m, new Date(p.creado).getTime()), 0),
    };
  }

  // ---------------------------------------------------------------- mapa ----
  function mesasDelMapa() {
    const lista = panel ? panel.mesas.map((m) => ({ clave: m.id, id: m.id, nombre: m.nombre, codigo: m.clave })) : [];
    datos.pedidos.forEach((p) => {  // mesas con pedidos que no salen en la lista (sin carta_panel o borradas)
      if (!lista.some((m) => m.clave === claveMesa(p))) lista.push({ clave: claveMesa(p), id: p.mesa_id, nombre: p.mesa, codigo: null });
    });
    return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
  }

  function estadoMesa(g) {
    if (g.cuenta || g.camarero) return 'espera';
    if (g.nuevos) return 'pide';
    if (g.listos) return 'listo';
    if (g.validos.length) return 'ocupada';
    return 'libre';
  }

  function pintarMapa(ahora, moneda) {
    const mesas = mesasDelMapa();
    let ocupadas = 0;
    $('mapa').innerHTML = mesas.length ? mesas.map((m) => {
      const g = grupo(m.clave), est = estadoMesa(g);
      if (est !== 'libre') ocupadas++;
      const detalle = est === 'espera' ? (g.cuenta ? '🧾 Pide la cuenta' : '🙋 Llama')
        : est === 'pide' ? `🔔 ${g.nuevos} nuevo${g.nuevos === 1 ? '' : 's'}`
          : est === 'listo' ? '🍽 Listo para servir'
          : est === 'ocupada' ? `${Math.max(0, Math.round((ahora - g.ultimo) / 60000))} min` : (m.codigo ? `🔑 ${esc(m.codigo)}` : 'Libre');
      return `<button type="button" class="mesa-tile ${est}" data-mesa="${esc(m.clave)}" aria-label="${esc(m.nombre)}: ${esc(detalle)}">
        <b>${esc(m.nombre)}</b>
        <span class="t-total num">${g.validos.length ? dinero(g.total, moneda) : ''}</span>
        <small>${detalle}</small></button>`;
    }).join('') : '<div class="vacio">No hay mesas. Créalas en Gestión → Mesas y NFC.</div>';
    $('n-mesas').textContent = ocupadas || '';
  }

  function abrirMesa(clave) {
    mesaAbierta = clave;
    pintarMesa();
    if (!$('dlg-mesa').open) $('dlg-mesa').showModal();
  }

  function pintarMesa() {
    const m = mesasDelMapa().find((x) => x.clave === mesaAbierta);
    if (!m) { $('dlg-mesa').close(); return; }
    const g = grupo(m.clave), mon = datos.restaurante.moneda;
    const conCodigo = panel && panel.codigo_mesa && m.id;
    const html = `
      <div class="dlg-head"><h2 id="mesa-titulo">${esc(m.nombre)}</h2><button class="x" type="button" data-cerrar aria-label="Cerrar">×</button></div>
      <div class="dlg-body">
        ${conCodigo ? `<div class="codigo-mesa">${m.codigo
          ? `<span class="muted small">Código de la mesa</span><b class="num">${esc(m.codigo)}</b><span class="muted small">Díselo a los clientes para que puedan pedir.</span>
             <button class="btn sm" type="button" data-abrir="${esc(m.id)}">↻ Código nuevo</button>`
          : `<span class="muted small">La mesa está cerrada: los clientes no pueden pedir.</span>
             <button class="btn primary" type="button" data-abrir="${esc(m.id)}">🔑 Abrir mesa y dar código</button>`}</div>` : ''}
        ${g.validos.length ? `<article class="mesa-card">
          <h3><span>Consumo</span><span class="num">${dinero(g.total, mon)}</span></h3>
          <div class="estados">
            ${g.cuenta ? '<span class="chip">🧾 Pide la cuenta</span>' : ''}${g.camarero ? '<span class="chip">🙋 Llama al camarero</span>' : ''}
            <span class="chip">${g.validos.length} pedido${g.validos.length === 1 ? '' : 's'}</span>
            ${g.nuevos ? `<span class="chip alerta">${g.nuevos} sin apuntar</span>` : ''}
            ${g.listos ? `<span class="chip">🍽 ${g.listos} listo${g.listos === 1 ? '' : 's'} para servir</span>` : ''}
          </div>
          <ul>${g.items.map((i) => `<li><span>${i.cantidad}× ${esc(i.nombre)}</span><span class="num">${dinero(i.cantidad * i.precio, mon)}</span></li>`).join('')}</ul>
          <div class="mesa-acc">
            <button class="btn" type="button" data-ticket="${esc(m.clave)}">🖨 Imprimir ticket</button>
            <button class="btn primary" type="button" data-liberar="${esc(m.clave)}">Cobrada · liberar mesa</button>
          </div>
        </article>` : `<p class="muted">Sin consumo abierto.</p>
          ${conCodigo && m.codigo ? `<button class="btn block" type="button" data-cerrar-codigo="${esc(m.id)}">Cerrar mesa (el código deja de valer)</button>` : ''}`}
      </div>`;
    if (html !== $('dlg-mesa').dataset.html) { $('dlg-mesa').dataset.html = html; $('dlg-mesa').innerHTML = html; }
  }

  // Pre-cuenta de 80 mm por si falla el TPV.
  function imprimirTicket(clave) {
    const m = mesasDelMapa().find((x) => x.clave === clave);
    const g = grupo(clave);
    if (!m || !g.validos.length) return;
    const mon = datos.restaurante.moneda;
    imprimir(`<h1>${esc(datos.restaurante.nombre)}</h1><h2>${esc(m.nombre)} · ${new Date().toLocaleString('es-ES')}</h2><hr>
      ${g.items.map((i) => `<div class="r"><span>${i.cantidad}× ${esc(i.nombre)}</span><span>${dinero(i.cantidad * i.precio, mon)}</span></div>`).join('')}
      <hr><div class="r t"><span>TOTAL</span><span>${dinero(g.total, mon)}</span></div><p class="pie">${esc(PIE_TICKET)}</p>`,
    `@page{size:80mm auto;margin:0}
      body{font:14px/1.35 ui-monospace,Menlo,Consolas,monospace;width:72mm;margin:0;padding:4mm;color:#000;background:#fff}
      h1{font-size:20px;margin:0}h2{font-size:14px;margin:2px 0 8px;font-weight:400}.r{display:flex;justify-content:space-between;gap:6px}
      hr{border:0;border-top:1px dashed #000;margin:6px 0}.t{font-size:18px;font-weight:700}.pie{font-size:11px;margin-top:8px}`);
  }

  async function liberar(clave) {
    const m = mesasDelMapa().find((x) => x.clave === clave);
    const g = grupo(clave);
    if (!m) return;
    const msg = (g.nuevos ? `Ojo: ${m.nombre} tiene ${g.nuevos} pedido(s) sin apuntar.\n` : '') + `¿Marcar ${m.nombre} como cobrada y dejarla libre?`;
    if (!confirm(msg)) return;
    if (g.todos.length && !(await accion('cerrar', { ids: g.todos.map((p) => p.id) }))) return;
    if (panel && panel.codigo_mesa && m.id) await cargarPanel('cerrar_mesa', { mesa_id: m.id });
    toast(`${m.nombre} liberada`);
    $('dlg-mesa').close();
  }

  // ----------------------------------------------------------- agotados ----
  function pintarCarta() {
    $('tab-carta').hidden = !panel;
    if (!panel) return;
    const cats = enPuesto() && puesto.cats ? panel.categorias.filter((c) => puesto.cats.includes(c.id)) : panel.categorias;
    const agotados = panel.categorias.reduce((s, c) => s + c.productos.filter((p) => !p.disponible).length, 0);
    $('n-agotados').textContent = agotados || '';
    $('agotados').innerHTML = cats.length ? cats.map((c) => `<section class="ag-cat"><h3>${esc(c.nombre)}</h3><div class="ag-lista">
      ${c.productos.map((p) => `<button type="button" class="ag${p.disponible ? '' : ' fuera'}" data-disp="${esc(p.id)}" data-valor="${!p.disponible}"
        aria-pressed="${!p.disponible}">${esc(p.nombre)}<small>${p.disponible ? 'Disponible' : 'AGOTADO'}</small></button>`).join('')}
      </div></section>`).join('') : '<div class="vacio">La carta está vacía.</div>';
  }

  // ----------------------------------------------------------- pantalla ----
  function abrirPuesto() {
    const cats = panel ? panel.categorias : [];
    $('dlg-puesto').innerHTML = `
      <div class="dlg-head"><h2 id="puesto-titulo">🖥 Esta pantalla</h2><button class="x" type="button" data-cerrar aria-label="Cerrar">×</button></div>
      <form class="dlg-body" id="puesto-form">
        <p class="muted small" style="margin-top:0">Se guarda solo en este aparato. Cada pantalla del bar puede ser una cosa distinta.</p>
        <label class="check"><input type="radio" name="modo" value="todo" ${enPuesto() ? '' : 'checked'}> <span><b>Camarero</b>: pedidos, avisos,
          "✓ Apuntado" y "Listos para servir" (móvil junto al TPV)</span></label>
        <label class="check"><input type="radio" name="modo" value="cocina" ${enPuesto() ? 'checked' : ''}> <span><b>Cocina / barra</b>:
          Nuevos → Preparando → ¡Listo! con el tiempo de cada pedido</span></label>
        <fieldset class="puesto-cats"><legend class="small muted">Qué ve esta pantalla</legend>
          ${cats.map((c) => `<label class="check"><input type="checkbox" name="cat" value="${esc(c.id)}"
          ${!puesto.cats || puesto.cats.includes(c.id) ? 'checked' : ''}> ${esc(c.nombre)}</label>`).join('') || '<p class="muted small">No hay categorías en la carta.</p>'}
          <label class="check"><input type="checkbox" name="esperar" ${puesto.esperar ? 'checked' : ''}> Recibir los pedidos solo cuando el camarero
            los apunta (así no se cocina nada que no esté en el TPV)</label>
        </fieldset>
        <div class="dlg-foot" style="padding:12px 0 0"><button class="btn primary block" type="submit">Guardar</button></div>
      </form>`;
    $('dlg-puesto').showModal();
  }

  function guardarPuesto(form) {
    const todas = form.querySelectorAll('[name="cat"]');
    const cats = [...form.querySelectorAll('[name="cat"]:checked')].map((i) => i.value);
    const cocina = form.modo.value === 'cocina';
    if (cocina && todas.length && !cats.length) { toast('Marca al menos una categoría.', 'error'); return; }
    puesto = { modo: cocina ? 'cocina' : 'todo', cats: cocina && cats.length < todas.length ? cats : null,
               esperar: cocina && form.esperar.checked, desde: puesto.modo === 'cocina' && cocina ? puesto.desde : Date.now() };
    store.set(kPuesto(), puesto);
    $('dlg-puesto').close();
    vistos = null;  // sin pitidos por lo que ya había
    procesar(datos);
    toast(cocina ? '🖥 Pantalla de cocina' : '📱 Pantalla del camarero');
  }

  function abrirQr() {
    $('qr-img').innerHTML = qr(urlRestaurante(sesion.slug)).createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    $('qr-titulo').textContent = datos.restaurante.nombre;
    $('dlg-qr').showModal();
  }

  function cambiarVista(v) {
    vista = v;
    document.querySelectorAll('[data-vista]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.vista === vista)));
    $('v-pedidos').hidden = vista !== 'pedidos' || enPuesto();
    $('v-cocina').hidden = vista !== 'pedidos' || !enPuesto();
    $('v-mesas').hidden = vista !== 'mesas';
    $('v-carta').hidden = vista !== 'carta';
    if (vista !== 'pedidos') cargarPanel();
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

  // Timbre fuerte (onda cuadrada, volumen alto), dos veces para pedidos; escalera hacia arriba para "listo".
  function pitar(tipo) {
    ultimoPitido = Date.now();
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    if (!sonando()) return;
    const notas = tipo === 'pedido' ? [988, 1319, 988, 1319, 0, 988, 1319, 988, 1319]
      : tipo === 'listo' ? [1047, 1319, 1568, 2093, 0, 1047, 1319, 1568, 2093] : [784, 784, 784];
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
    pitar(llegan.some((p) => p.tipo === 'pedido') ? 'pedido' : 'aviso');
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
    else if (ds.apuntar) { b.disabled = true; await accion('estado', { id: ds.apuntar, estado: 'preparando' }); }
    else if (ds.servido) { b.disabled = true; await accion('estado', { id: ds.servido, estado: 'servido' }); }
    else if (ds.deshacer) { b.disabled = true; await accion('estado', { id: ds.deshacer, estado: 'nuevo' }); }
    else if (ds.empezar) marcar(ds.empezar, 'prep');
    else if (ds.listo) {
      const p = datos.pedidos.find((x) => x.id === ds.listo);
      marcar(ds.listo, 'listo');
      // Sin apuntar todavía: se queda listo aquí y pasa a listo en cuanto el camarero lo apunte.
      if (p && p.estado !== 'nuevo' && p.estado !== 'listo') await accion('estado', { id: p.id, estado: 'listo' });
    } else if (ds.volver) {
      const h = hechos.get(ds.volver), p = datos.pedidos.find((x) => x.id === ds.volver);
      marcar(ds.volver, h && h.e === 'listo' ? 'prep' : null);
      if (h && h.e === 'listo' && p && p.estado === 'listo') await accion('estado', { id: p.id, estado: 'preparando' });
    } else if (ds.atender) { b.disabled = true; await accion('estado', { id: ds.atender, estado: 'servido' }); }
    else if (ds.cancelar) {
      if (confirm('¿Cancelar este pedido? No contará en la cuenta de la mesa.')) await accion('estado', { id: ds.cancelar, estado: 'cancelado' });
    } else if (ds.mesa) abrirMesa(ds.mesa);
    else if (ds.ticket) imprimirTicket(ds.ticket);
    else if (ds.liberar) liberar(ds.liberar);
    else if (ds.abrir) {
      const r = await cargarPanel('abrir', { mesa_id: ds.abrir });
      if (r) toast(`Código de la mesa: ${r.codigo}`);
    } else if (ds.cerrarCodigo) await cargarPanel('cerrar_mesa', { mesa_id: ds.cerrarCodigo });
    else if (ds.disp) { b.disabled = true; await cargarPanel('disponible', { id: ds.disp, disponible: ds.valor === 'true' }); }
    else if (b.hasAttribute('data-cerrar')) b.closest('dialog').close();
    else if (b.id === 'k-qr') abrirQr();
    else if (b.id === 'k-puesto') { if (!panel) await cargarPanel(); abrirPuesto(); }
    else if (b.id === 'reintentar') entrar();
    else if (b.id === 'k-activar') { sonidoOn = true; store.set(K_SONIDO, true); activarAudio(); setTimeout(() => pitar('aviso'), 150); }
    else if (b.id === 'k-sonido') {
      sonidoOn = !sonando();
      store.set(K_SONIDO, sonidoOn);
      activarAudio();
      if (sonidoOn) setTimeout(() => pitar('aviso'), 150);
      pintarSonido();
    } else if (b.id === 'k-pausa') {
      const abrirPedidos = !datos.restaurante.pedidos_abiertos;
      if (abrirPedidos || confirm('¿Pausar los pedidos por móvil? Los clientes verán la carta pero no podrán pedir.')) await accion('pausa', { abiertos: abrirPedidos });
    } else if (b.id === 'k-salir') {
      if (confirm('¿Salir del panel? Tendrás que volver a introducir la clave.')) {
        store.del(K_SESION); clearTimeout(timer); sesion = null; vistos = null; panel = null;
        cambiarVista('pedidos');
        mostrarLogin();
      }
    }
  });
  document.addEventListener('submit', (ev) => {
    if (ev.target.id === 'puesto-form') { ev.preventDefault(); guardarPuesto(ev.target); }
  });
  $('dlg-mesa').addEventListener('close', () => { mesaAbierta = null; $('dlg-mesa').dataset.html = ''; });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sesion && datos) { pedirWakeLock(); sondear(); cargarPanel(); }
  });
  window.addEventListener('offline', () => { if (sesion && datos) $('k-offline').hidden = false; });
  window.addEventListener('online', () => { if (sesion && datos) sondear(); else if (sesion) entrar(); });
  setInterval(() => { if (sesion && datos && document.visibilityState === 'visible') cargarPanel(); }, 30000);

  iniciar();
})();
