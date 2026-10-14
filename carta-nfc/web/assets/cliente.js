// Carta para el cliente: ver, añadir al pedido y enviarlo a cocina desde la mesa.
(function () {
  const { rpc, esc, dinero, toast, aplicarColor, store, ALERGENOS } = window.Carta;
  const $ = (id) => document.getElementById(id);

  // ---- Origen: /m/<codigo-mesa>  |  /r/<slug>  |  ?m=  |  ?r=
  const qs = new URLSearchParams(location.search);
  const ruta = location.pathname.match(/^\/(m|r)\/([A-Za-z0-9-]+)/);
  const urlMesa = (ruta && ruta[1] === 'm' ? ruta[2] : qs.get('m')) || null;
  const urlSlug = (ruta && ruta[1] === 'r' ? ruta[2] : qs.get('r')) || null;

  const ESTADOS = { nuevo: 'Recibido', preparando: 'En preparación', listo: '¡Listo! Te lo llevamos', servido: 'Servido', cancelado: 'Cancelado' };

  let menu = null;          // respuesta de carta_menu
  let productos = {};       // id -> producto
  let mesa = null;          // { codigo, nombre }
  let carrito = {};         // id -> { cantidad, nota }
  let enviando = false;
  let pollTimer = null;

  const ses = {
    get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } },
  };
  const kCarrito = () => 'carta:carrito:' + menu.restaurante.slug;
  const kMesa = () => 'carta:mesa:' + menu.restaurante.slug;
  const kPedidos = () => 'carta:pedidos:' + menu.restaurante.slug;

  function mostrarError(titulo, texto) {
    $('cargando').hidden = true;
    $('app').hidden = true;
    $('error').hidden = false;
    $('error-titulo').textContent = titulo;
    $('error-texto').textContent = texto;
  }

  async function cargar() {
    if (!urlMesa && !urlSlug) {
      mostrarError('Carta digital', 'Acerca el móvil al NFC de tu mesa (o escanea su QR) para ver la carta y pedir.');
      return;
    }
    try {
      menu = await rpc('carta_menu', { p_slug: urlSlug, p_mesa: urlMesa });
    } catch (e) {
      if (e.code === 'restaurante_no_encontrado') {
        mostrarError('Carta no disponible', urlMesa
          ? 'Este NFC de mesa ya no está activo. Pide ayuda al camarero.'
          : 'No encontramos este restaurante.');
      } else {
        mostrarError('No se pudo cargar la carta', e.humano || 'Inténtalo de nuevo en unos segundos.');
      }
      return;
    }
    // El bar tiene su propia web de carta (con pedidos.js): el NFC lleva allí con la mesa.
    if (menu.restaurante.web_carta) {
      const destino = new URL(menu.restaurante.web_carta);
      if (menu.mesa) destino.searchParams.set('mesa', menu.mesa.codigo);
      else destino.searchParams.set('pedir', '1');
      location.replace(destino.toString());
      return;
    }
    productos = {};
    menu.categorias.forEach((c) => c.productos.forEach((p) => { productos[p.id] = p; }));
    mesa = menu.mesa || null;
    if (!mesa && menu.restaurante.mesa_libre) {
      const guardada = ses.get(kMesa(), null);
      if (guardada && menu.mesas.some((m) => m.codigo === guardada.codigo)) mesa = guardada;
    }
    carrito = ses.get(kCarrito(), {});
    Object.keys(carrito).forEach((id) => { if (!productos[id] || !productos[id].disponible) delete carrito[id]; });

    aplicarColor(menu.restaurante.color);
    document.title = menu.restaurante.nombre + ' · Carta';
    $('r-nombre').textContent = menu.restaurante.nombre;
    $('r-mensaje').textContent = menu.restaurante.mensaje || '';
    renderMenu();
    renderEstadoPedidos();
    actualizarCabecera();
    $('cargando').hidden = true;
    $('app').hidden = false;
    observarCategorias();
    refrescarPedidos();
  }

  function puedePedir() {
    return menu.restaurante.pedidos_abiertos && (!!mesa || (menu.restaurante.mesa_libre && menu.mesas.length > 0));
  }

  function actualizarCabecera() {
    const r = menu.restaurante;
    const btn = $('mesa-btn');
    if (mesa) {
      btn.textContent = '📍 ' + mesa.nombre + (menu.mesa ? '' : ' · cambiar');
      btn.disabled = !!menu.mesa;
    } else if (r.mesa_libre && menu.mesas.length) {
      btn.textContent = '📍 Elegir mi mesa';
      btn.disabled = false;
    } else {
      btn.hidden = true;
    }
    $('banner-cerrado').hidden = r.pedidos_abiertos;
    $('banner-sin-mesa').hidden = !(r.pedidos_abiertos && !mesa && !(r.mesa_libre && menu.mesas.length));
    $('ayuda').hidden = !mesa && !(r.mesa_libre && menu.mesas.length);
    actualizarCarritoBar();
  }

  // ---------------------------------------------------------------- carta ----
  function renderMenu() {
    const cats = menu.categorias;
    $('cats').innerHTML = cats.map((c, i) =>
      `<button class="tab" type="button" data-cat="${i}" aria-selected="${i === 0}">${esc(c.nombre)}</button>`).join('');
    $('menu').innerHTML = cats.length ? cats.map((c, i) => `
      <section class="cat" id="cat-${i}" data-cat="${i}">
        <h2>${esc(c.nombre)}</h2>
        ${c.productos.map(renderProducto).join('')}
      </section>`).join('') : '<p class="muted" style="padding:24px 0">La carta todavía está vacía.</p>';
  }

  function renderProducto(p) {
    const al = (p.alergenos || []).map((a) => `<span class="alergeno">${esc(ALERGENOS[a] || a)}</span>`).join('');
    return `
      <article class="prod card${p.disponible ? '' : ' agotado'}" data-id="${esc(p.id)}">
        <div class="prod-txt">
          <h3>${esc(p.nombre)}</h3>
          ${p.descripcion ? `<p class="desc">${esc(p.descripcion)}</p>` : ''}
          ${al ? `<div class="alergenos" aria-label="Alérgenos">${al}</div>` : ''}
          <div class="precio num">${dinero(p.precio, menu.restaurante.moneda)}</div>
        </div>
        <div class="prod-side">
          ${p.imagen_url ? `<img class="prod-img" src="${esc(p.imagen_url)}" alt="" loading="lazy">` : ''}
          <div class="ctrl" data-ctrl="${esc(p.id)}">${renderControl(p)}</div>
        </div>
      </article>`;
  }

  function renderControl(p) {
    if (!p.disponible) return '<span class="tag-agotado">Agotado</span>';
    if (!puedePedir()) return '';
    const n = carrito[p.id] ? carrito[p.id].cantidad : 0;
    if (!n) return `<button class="add" type="button" data-add="${esc(p.id)}" aria-label="Añadir ${esc(p.nombre)}">+</button>`;
    return `<div class="stepper" role="group" aria-label="Cantidad de ${esc(p.nombre)}">
      <button type="button" data-menos="${esc(p.id)}" aria-label="Quitar uno">−</button>
      <span class="n num">${n}</span>
      <button type="button" data-add="${esc(p.id)}" aria-label="Añadir otro">+</button></div>`;
  }

  function refrescarControl(id) {
    document.querySelectorAll(`[data-ctrl="${CSS.escape(id)}"]`).forEach((el) => { el.innerHTML = renderControl(productos[id]); });
  }

  function cambiar(id, delta) {
    const actual = carrito[id] ? carrito[id].cantidad : 0;
    const n = Math.max(0, Math.min(20, actual + delta));
    if (n === 0) delete carrito[id];
    else carrito[id] = { cantidad: n, nota: carrito[id] ? carrito[id].nota : '' };
    ses.set(kCarrito(), carrito);
    refrescarControl(id);
    actualizarCarritoBar();
    if ($('dlg-carrito').open) renderCarrito();
  }

  function totales() {
    let n = 0, total = 0;
    Object.entries(carrito).forEach(([id, l]) => { n += l.cantidad; total += l.cantidad * Number(productos[id].precio); });
    return { n, total };
  }

  function actualizarCarritoBar() {
    const { n, total } = totales();
    $('cart-bar').hidden = n === 0 || !puedePedir();
    $('cart-n').textContent = n;
    $('cart-total').textContent = dinero(total, menu.restaurante.moneda);
  }

  function observarCategorias() {
    const tabs = [...document.querySelectorAll('#cats .tab')];
    if (!tabs.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const i = e.target.dataset.cat;
        tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.cat === i)));
        const activo = tabs[i];
        if (activo) activo.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      });
    }, { rootMargin: '-70px 0px -70% 0px' });
    document.querySelectorAll('.cat').forEach((s) => io.observe(s));
  }

  // -------------------------------------------------------------- carrito ----
  function renderCarrito() {
    const m = menu.restaurante.moneda;
    const lineas = Object.entries(carrito);
    $('carrito-mesa').textContent = mesa ? 'Para ' + mesa.nombre : 'Elige tu mesa al enviar';
    $('carrito-lineas').innerHTML = lineas.length ? lineas.map(([id, l]) => {
      const p = productos[id];
      return `<div class="linea">
        <div class="linea-top">
          <span class="nom">${esc(p.nombre)}</span>
          <div class="stepper">
            <button type="button" data-menos="${esc(id)}" aria-label="Quitar uno">−</button>
            <span class="n num">${l.cantidad}</span>
            <button type="button" data-add="${esc(id)}" aria-label="Añadir otro">+</button>
          </div>
          <span class="num" style="min-width:72px;text-align:right">${dinero(l.cantidad * Number(p.precio), m)}</span>
        </div>
        <input type="text" maxlength="140" data-nota="${esc(id)}" value="${esc(l.nota || '')}" placeholder="Nota: sin cebolla, poco hecho…" aria-label="Nota para ${esc(p.nombre)}">
      </div>`;
    }).join('') : '<p class="muted">Tu pedido está vacío.</p>';
    $('carrito-total').textContent = dinero(totales().total, m);
    $('btn-enviar').disabled = lineas.length === 0 || enviando;
  }

  async function enviar() {
    if (enviando) return;
    if (!mesa) { abrirMesas(true); return; }
    const lineas = Object.entries(carrito).map(([id, l]) => ({ producto_id: id, cantidad: l.cantidad, nota: (l.nota || '').trim() || null }));
    if (!lineas.length) return;
    enviando = true;
    $('btn-enviar').disabled = true;
    $('btn-enviar').textContent = 'Enviando…';
    try {
      const res = await rpc('carta_pedir', { p_mesa: mesa.codigo, p_lineas: lineas, p_nota: $('carrito-nota').value.trim() || null });
      const lista = store.get(kPedidos(), []).filter((p) => Date.now() - new Date(p.creado).getTime() < 12 * 3600e3);
      lista.unshift({ token: res.token, numero: res.numero, creado: res.creado, total: res.total, estado: res.estado });
      store.set(kPedidos(), lista.slice(0, 20));
      carrito = {};
      ses.set(kCarrito(), carrito);
      $('carrito-nota').value = '';
      Object.keys(productos).forEach(refrescarControl);
      actualizarCarritoBar();
      $('dlg-carrito').close();
      $('ok-texto').textContent = `Pedido nº ${res.numero} · ${res.mesa} · ${dinero(res.total, menu.restaurante.moneda)}. Ya está en cocina; aquí verás cuándo está listo.`;
      $('dlg-ok').showModal();
      renderEstadoPedidos();
      refrescarPedidos();
    } catch (e) {
      toast(e.humano || 'No se pudo enviar el pedido.', 'error');
      if (e.code === 'pedidos_cerrados') { menu.restaurante.pedidos_abiertos = false; actualizarCabecera(); $('dlg-carrito').close(); }
      if (e.code === 'mesa_no_valida') { mesa = null; ses.set(kMesa(), null); actualizarCabecera(); }
    } finally {
      enviando = false;
      $('btn-enviar').textContent = 'Enviar pedido';
      $('btn-enviar').disabled = Object.keys(carrito).length === 0;
    }
  }

  // ----------------------------------------------------------------- mesa ----
  let enviarTrasElegir = false;
  function abrirMesas(despuesEnviar) {
    enviarTrasElegir = !!despuesEnviar;
    $('mesas-grid').innerHTML = menu.mesas.map((m) =>
      `<button class="btn${mesa && mesa.codigo === m.codigo ? ' primary' : ''}" type="button" data-mesa="${esc(m.codigo)}">${esc(m.nombre)}</button>`).join('');
    if ($('dlg-carrito').open) $('dlg-carrito').close();
    $('dlg-mesa').showModal();
  }

  function elegirMesa(codigo) {
    const m = menu.mesas.find((x) => x.codigo === codigo);
    if (!m) return;
    mesa = { codigo: m.codigo, nombre: m.nombre };
    ses.set(kMesa(), mesa);
    $('dlg-mesa').close();
    actualizarCabecera();
    Object.keys(productos).forEach(refrescarControl);
    if (enviarTrasElegir) { renderCarrito(); $('dlg-carrito').showModal(); }
  }

  // --------------------------------------------------- estado de pedidos ----
  function renderEstadoPedidos() {
    const lista = store.get(kPedidos(), []).filter((p) => Date.now() - new Date(p.creado).getTime() < 12 * 3600e3);
    const visibles = lista.filter((p) => p.estado !== 'servido' || Date.now() - new Date(p.creado).getTime() < 3600e3).slice(0, 5);
    $('mis-pedidos').hidden = visibles.length === 0;
    $('mis-pedidos').innerHTML = '<h2>Tus pedidos</h2>' + visibles.map((p) => `
      <div class="mp-row"><span>Pedido nº ${esc(p.numero)} · <span class="num">${dinero(p.total, menu.restaurante.moneda)}</span></span>
      <span class="estado ${esc(p.estado)}">${esc(ESTADOS[p.estado] || p.estado)}</span></div>`).join('');
  }

  async function refrescarPedidos() {
    clearTimeout(pollTimer);
    const lista = store.get(kPedidos(), []);
    const activos = lista.filter((p) => !['servido', 'cancelado'].includes(p.estado) && Date.now() - new Date(p.creado).getTime() < 12 * 3600e3);
    if (!activos.length) return;
    if (document.visibilityState === 'visible') {
      try {
        const estados = await rpc('carta_estado', { p_tokens: activos.map((p) => p.token) });
        let aviso = false;
        estados.forEach((e) => {
          const p = lista.find((x) => x.token === e.token);
          if (!p) return;
          if (p.estado !== 'listo' && e.estado === 'listo') aviso = true;
          p.estado = e.estado;
        });
        store.set(kPedidos(), lista);
        renderEstadoPedidos();
        if (aviso) { toast('¡Tu pedido está listo! Te lo llevan ahora.'); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
      } catch { /* reintenta en el siguiente ciclo */ }
    }
    pollTimer = setTimeout(refrescarPedidos, 8000);
  }

  async function avisar(tipo) {
    if (!mesa) { abrirMesas(false); return; }
    const btn = $(tipo === 'cuenta' ? 'btn-cuenta' : 'btn-camarero');
    btn.disabled = true;
    try {
      await rpc('carta_avisar', { p_mesa: mesa.codigo, p_tipo: tipo });
      toast(tipo === 'cuenta' ? 'Hemos avisado: te traen la cuenta enseguida.' : 'Hemos avisado al camarero. Viene enseguida.');
    } catch (e) {
      toast(e.humano, 'error');
    } finally {
      setTimeout(() => { btn.disabled = false; }, 4000);
    }
  }

  // --------------------------------------------------------------- eventos ----
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('button');
    if (!t) return;
    if (t.dataset.add) cambiar(t.dataset.add, +1);
    else if (t.dataset.menos) cambiar(t.dataset.menos, -1);
    else if (t.dataset.mesa) elegirMesa(t.dataset.mesa);
    else if (t.dataset.cat !== undefined && t.classList.contains('tab')) {
      document.getElementById('cat-' + t.dataset.cat).scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (t.hasAttribute('data-cerrar')) t.closest('dialog').close();
    else if (t.id === 'cart-open') { renderCarrito(); $('dlg-carrito').showModal(); }
    else if (t.id === 'btn-enviar') enviar();
    else if (t.id === 'mesa-btn') abrirMesas(false);
    else if (t.id === 'btn-camarero') avisar('camarero');
    else if (t.id === 'btn-cuenta') avisar('cuenta');
  });
  document.addEventListener('input', (ev) => {
    const id = ev.target.dataset && ev.target.dataset.nota;
    if (id && carrito[id]) { carrito[id].nota = ev.target.value; ses.set(kCarrito(), carrito); }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && menu) refrescarPedidos(); });

  cargar();
})();
