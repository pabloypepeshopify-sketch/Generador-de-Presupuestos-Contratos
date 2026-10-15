// Comandero táctil: el camarero mete pedidos para una mesa o para "Barra" (venta rápida).
// Uso: CartaComandero.abrir({ sesion, moneda, mesaId, cobrar, alEnviar })
//   mesaId: id de mesa, '' = Barra, undefined = la última usada. cobrar: muestra "Enviar y cobrar".
//   alEnviar(pedido, { cobrar }) se llama tras crear el pedido.
(function () {
  const { rpc, esc, dinero, toast } = window.Carta;

  const CSS = `
#dlg-comandero{width:min(1180px,calc(100% - 16px));max-height:calc(100% - 16px);height:calc(100% - 16px);display:none;flex-direction:column;overflow:hidden}
#dlg-comandero[open]{display:flex}
.cm-head{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line)}
.cm-head h2{font-size:18px;margin:0;flex:1}
.cm-mesas{display:flex;gap:6px;overflow-x:auto;padding:10px 14px;border-bottom:1px solid var(--line);scrollbar-width:none}
.cm-mesas::-webkit-scrollbar{display:none}
.cm-mesas button{flex:0 0 auto;min-height:44px;min-width:64px;padding:8px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);font-weight:700;cursor:pointer}
.cm-mesas button[aria-pressed="true"]{background:var(--brand);border-color:var(--brand);color:var(--brand-ink)}
.cm-cuerpo{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 360px}
.cm-carta{display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--line)}
.cm-filtros{display:flex;gap:8px;padding:10px 14px;align-items:center}
.cm-filtros input{flex:1;min-height:44px;padding:8px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);min-width:0}
.cm-cats{display:flex;gap:6px;overflow-x:auto;padding:0 14px 10px;scrollbar-width:none}
.cm-cats::-webkit-scrollbar{display:none}
.cm-cats button{flex:0 0 auto;min-height:38px;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);font-weight:600;cursor:pointer}
.cm-cats button[aria-pressed="true"]{background:var(--text);color:var(--bg);border-color:var(--text)}
.cm-grid{flex:1;overflow:auto;padding:4px 14px 14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;align-content:start}
.cm-prod{position:relative;min-height:88px;padding:10px;border-radius:14px;border:1px solid var(--line);background:var(--surface-2);text-align:left;cursor:pointer;display:flex;flex-direction:column;justify-content:space-between;gap:6px;font-weight:600;-webkit-tap-highlight-color:transparent}
.cm-prod:active{transform:scale(.97)}
.cm-prod .n{font-size:14px;line-height:1.2;overflow-wrap:anywhere}
.cm-prod .p{font-size:15px;font-weight:800}
.cm-prod .s{display:block;font-size:11px;color:var(--muted);font-weight:600}
.cm-prod .c{position:absolute;top:6px;right:6px;min-width:24px;height:24px;border-radius:999px;background:var(--brand);color:var(--brand-ink);font-size:13px;display:grid;place-items:center;padding:0 6px}
.cm-prod[disabled]{opacity:.45;cursor:not-allowed}
.cm-pedido{display:flex;flex-direction:column;min-height:0}
.cm-lineas{flex:1;overflow:auto;padding:6px 14px}
.cm-linea{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 8px;padding:8px 0;border-bottom:1px solid var(--line);align-items:center}
.cm-linea .n{font-weight:600;overflow-wrap:anywhere}
.cm-linea .nota{grid-column:1/-1;font-size:13px;color:var(--muted)}
.cm-linea input{grid-column:1/-1;min-height:36px;padding:6px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
.cm-qty{display:flex;align-items:center;gap:4px}
.cm-qty button{width:38px;height:38px;border-radius:10px;border:1px solid var(--line);background:var(--surface);font-size:20px;font-weight:700;cursor:pointer}
.cm-qty b{min-width:26px;text-align:center}
.cm-sub{display:flex;justify-content:space-between;gap:8px;font-size:13px;color:var(--muted)}
.cm-vacio{color:var(--muted);text-align:center;padding:28px 10px}
.cm-pie{border-top:1px solid var(--line);padding:10px 14px;display:grid;gap:8px}
.cm-pie textarea{width:100%;min-height:40px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);resize:vertical}
.cm-total{display:flex;justify-content:space-between;align-items:baseline;font-size:15px}
.cm-total b{font-size:26px}
.cm-botones{display:flex;gap:8px}
.cm-botones .btn{flex:1;min-height:52px;font-size:16px}
.cm-ver{display:none}
.cm-ver[hidden]{display:none!important}
@media (max-width:800px){
  #dlg-comandero{width:100%;max-width:none;height:100%;max-height:none;margin:0;border-radius:0}
  .cm-cuerpo{grid-template-columns:1fr;position:relative}
  .cm-carta{border-right:0}
  .cm-grid{grid-template-columns:repeat(auto-fill,minmax(108px,1fr));padding-bottom:90px}
  .cm-pedido{position:absolute;inset:0;background:var(--surface);transform:translateY(100%);transition:transform .2s;z-index:2}
  .cm-pedido.ver{transform:none}
  .cm-ver{display:flex;position:absolute;left:10px;right:10px;bottom:10px;z-index:3;min-height:54px;font-size:16px;justify-content:space-between}
  .cm-pedido.ver ~ .cm-ver{display:none}
.cm-ver[hidden]{display:none!important}
}`;

  let dlg = null;
  let opts = null;
  let est = null;
  let ultimaMesa = '';

  function crear() {
    if (dlg) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    dlg = document.createElement('dialog');
    dlg.id = 'dlg-comandero';
    dlg.setAttribute('aria-label', 'Comandero');
    document.body.appendChild(dlg);
    dlg.addEventListener('click', onClick);
    dlg.addEventListener('input', onInput);
    dlg.addEventListener('change', onInput);
    dlg.addEventListener('close', () => { est = null; });
  }

  async function abrir(o) {
    crear();
    opts = o;
    est = { datos: null, mesaId: o.mesaId !== undefined ? (o.mesaId || '') : ultimaMesa, cat: '', q: '', lineas: [],
      nota: '', servido: false, enviando: false, ver: false, notaAbierta: null };
    est.servido = est.mesaId === '';
    dlg.innerHTML = `<div class="cm-head"><h2>Nuevo pedido</h2><button class="x" type="button" data-cm="cerrar" aria-label="Cerrar">×</button></div>
      <div class="cm-vacio">Cargando carta…</div>`;
    if (!dlg.open) dlg.showModal();
    try {
      const s = opts.sesion();
      est.datos = await rpc('carta_tpv', { p_slug: s.slug, p_clave: s.clave, p_accion: 'datos', p_datos: {} });
    } catch (e) {
      dlg.querySelector('.cm-vacio').textContent = e.humano || 'No se ha podido cargar la carta.';
      return;
    }
    if (est.mesaId && !est.datos.mesas.some((m) => m.id === est.mesaId)) est.mesaId = '';
    pintar();
  }

  const productos = () => est.datos.categorias.flatMap((c) => c.productos.map((p) => ({ ...p, cat: c.id || 'otros' })));
  const linea = (id) => est.lineas.find((l) => l.id === id);
  const total = () => est.lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const unidades = () => est.lineas.reduce((s, l) => s + l.cantidad, 0);
  const nombreMesa = () => (est.mesaId ? (est.datos.mesas.find((m) => m.id === est.mesaId) || {}).nombre : 'Barra');

  function pintar() {
    const d = est.datos;
    dlg.innerHTML = `
      <div class="cm-head"><h2>Nuevo pedido · <span data-cm-titulo>${esc(nombreMesa())}</span></h2>
        <button class="x" type="button" data-cm="cerrar" aria-label="Cerrar">×</button></div>
      <div class="cm-mesas" role="group" aria-label="Mesa">
        <button type="button" data-cm-mesa="" aria-pressed="${est.mesaId === ''}">🍺 Barra</button>
        ${d.mesas.map((m) => `<button type="button" data-cm-mesa="${esc(m.id)}" aria-pressed="${est.mesaId === m.id}">${esc(m.nombre)}</button>`).join('')}
      </div>
      <div class="cm-cuerpo">
        <div class="cm-carta">
          <div class="cm-filtros"><input type="search" data-cm-q placeholder="Buscar producto" aria-label="Buscar producto" value="${esc(est.q)}"></div>
          <div class="cm-cats" role="group" aria-label="Categoría">
            <button type="button" data-cm-cat="" aria-pressed="${!est.cat}">Todo</button>
            ${d.categorias.map((c) => `<button type="button" data-cm-cat="${esc(c.id || 'otros')}" aria-pressed="${est.cat === (c.id || 'otros')}">${esc(c.nombre)}</button>`).join('')}
          </div>
          <div class="cm-grid" data-cm-grid></div>
        </div>
        <div class="cm-pedido" data-cm-pedido></div>
        <button class="btn primary cm-ver" type="button" data-cm="ver"></button>
      </div>`;
    pintarGrid();
    pintarPedido();
  }

  function pintarGrid() {
    const m = opts.moneda();
    const q = est.q.toLowerCase();
    const lista = productos().filter((p) => (!est.cat || p.cat === est.cat) && (!q || p.nombre.toLowerCase().includes(q)));
    dlg.querySelector('[data-cm-grid]').innerHTML = lista.length ? lista.map((p) => {
      const l = linea(p.id);
      const sinStock = p.stock != null && p.stock - (l ? l.cantidad : 0) <= 0;
      const off = !p.disponible || sinStock;
      return `<button class="cm-prod" type="button" data-cm-add="${esc(p.id)}" ${off ? 'disabled' : ''} aria-label="Añadir ${esc(p.nombre)}">
        ${l ? `<span class="c">${l.cantidad}</span>` : ''}
        <span class="n">${esc(p.nombre)}</span>
        <span><span class="p">${dinero(p.precio, m)}</span>
        ${!p.disponible ? '<span class="s">Agotado</span>' : p.stock != null ? `<span class="s">Quedan ${Math.max(0, p.stock - (l ? l.cantidad : 0))}</span>` : ''}</span>
      </button>`;
    }).join('') : '<div class="cm-vacio" style="grid-column:1/-1">Ningún producto coincide.</div>';
  }

  function pintarPedido() {
    const m = opts.moneda();
    const caja = dlg.querySelector('[data-cm-pedido]');
    caja.classList.toggle('ver', est.ver);
    const n = unidades();
    caja.innerHTML = `
      <div class="cm-head" style="padding:8px 14px"><h2 style="font-size:16px">${esc(nombreMesa())} · ${n} ${n === 1 ? 'producto' : 'productos'}</h2>
        <button class="btn sm ghost" type="button" data-cm="ocultar" style="display:${est.ver ? '' : 'none'}">← Carta</button></div>
      <div class="cm-lineas">${est.lineas.length ? est.lineas.map((l) => `
        <div class="cm-linea">
          <div><div class="n">${esc(l.nombre)}</div><div class="cm-sub"><span>${dinero(l.precio, m)} c/u</span><span>${dinero(l.precio * l.cantidad, m)}</span></div></div>
          <div class="cm-qty">
            <button type="button" data-cm-menos="${esc(l.id)}" aria-label="Quitar uno">−</button><b>${l.cantidad}</b>
            <button type="button" data-cm-mas="${esc(l.id)}" aria-label="Añadir uno">+</button>
            <button type="button" data-cm-nota="${esc(l.id)}" aria-label="Nota" title="Nota">✎</button>
          </div>
          ${est.notaAbierta === l.id ? `<input type="text" maxlength="140" data-cm-nota-txt="${esc(l.id)}" placeholder="Ej.: sin cebolla" value="${esc(l.nota || '')}">`
            : l.nota ? `<div class="nota">→ ${esc(l.nota)}</div>` : ''}
        </div>`).join('') : '<div class="cm-vacio">Toca los productos para añadirlos.</div>'}</div>
      <div class="cm-pie">
        <textarea data-cm-nota-general maxlength="300" placeholder="Nota para cocina (opcional)">${esc(est.nota)}</textarea>
        <label class="check"><input type="checkbox" data-cm-servido ${est.servido ? 'checked' : ''}> Ya servido (no pasa por cocina)</label>
        <div class="cm-total"><span>Total</span><b>${dinero(total(), m)}</b></div>
        <div class="cm-botones">
          <button class="btn primary" type="button" data-cm="enviar" ${est.lineas.length && !est.enviando ? '' : 'disabled'}>${est.servido ? '✓ Guardar' : '📨 A cocina'}</button>
          ${opts.cobrar ? `<button class="btn" type="button" data-cm="cobrar" ${est.lineas.length && !est.enviando ? '' : 'disabled'}>💳 Y cobrar</button>` : ''}
        </div>
      </div>`;
    const ver = dlg.querySelector('[data-cm="ver"]');
    if (ver) {
      ver.hidden = !est.lineas.length;
      ver.innerHTML = `<span>Ver pedido (${n})</span><span>${dinero(total(), m)}</span>`;
    }
  }

  function anadir(id) {
    const p = productos().find((x) => x.id === id);
    if (!p || !p.disponible) return;
    const l = linea(id);
    if (p.stock != null && (l ? l.cantidad : 0) >= p.stock) { toast(`No quedan más: ${p.nombre}`, 'error'); return; }
    if (l) l.cantidad = Math.min(50, l.cantidad + 1);
    else est.lineas.push({ id: p.id, nombre: p.nombre, precio: Number(p.precio), cantidad: 1, nota: '' });
    if (navigator.vibrate) try { navigator.vibrate(15); } catch { /* nada */ }
    pintarGrid(); pintarPedido();
  }

  async function enviar(cobrar) {
    if (!est.lineas.length || est.enviando) return;
    est.enviando = true; pintarPedido();
    const mesa = nombreMesa();
    try {
      const s = opts.sesion();
      const r = await rpc('carta_tpv', { p_slug: s.slug, p_clave: s.clave, p_accion: 'comandar', p_datos: {
        mesa_id: est.mesaId || null, nota: est.nota.trim() || null, servido: est.servido,
        lineas: est.lineas.map((l) => ({ producto_id: l.id, cantidad: l.cantidad, nota: (l.nota || '').trim() || null })) } });
      ultimaMesa = est.mesaId;
      dlg.close();
      toast(`Pedido nº ${r.pedido.numero} · ${mesa}`);
      if (opts.alEnviar) opts.alEnviar(r.pedido, { cobrar });
    } catch (e) {
      est.enviando = false;
      toast(e.humano || 'No se ha podido enviar.', 'error');
      if (e.code === 'producto_agotado') {
        try {
          const s = opts.sesion();
          est.datos = await rpc('carta_tpv', { p_slug: s.slug, p_clave: s.clave, p_accion: 'datos', p_datos: {} });
        } catch { /* se queda con la carta anterior */ }
      }
      if (est) { pintarGrid(); pintarPedido(); }
    }
  }

  function onClick(ev) {
    const b = ev.target.closest('button');
    if (!b || !est) { if (b && b.dataset.cm === 'cerrar') dlg.close(); return; }
    const ds = b.dataset;
    if (ds.cmAdd) anadir(ds.cmAdd);
    else if (ds.cmMesa !== undefined) {
      est.mesaId = ds.cmMesa;
      est.servido = est.mesaId === '';
      dlg.querySelectorAll('[data-cm-mesa]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      dlg.querySelector('[data-cm-titulo]').textContent = nombreMesa();
      pintarPedido();
    } else if (ds.cmCat !== undefined) {
      est.cat = ds.cmCat;
      dlg.querySelectorAll('[data-cm-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      pintarGrid();
    } else if (ds.cmMas) { const l = linea(ds.cmMas); const p = productos().find((x) => x.id === ds.cmMas);
      if (p && p.stock != null && l.cantidad >= p.stock) toast(`No quedan más: ${p.nombre}`, 'error');
      else { l.cantidad = Math.min(50, l.cantidad + 1); pintarGrid(); pintarPedido(); }
    } else if (ds.cmMenos) {
      const l = linea(ds.cmMenos);
      l.cantidad -= 1;
      if (l.cantidad <= 0) est.lineas = est.lineas.filter((x) => x !== l);
      pintarGrid(); pintarPedido();
    } else if (ds.cmNota) {
      est.notaAbierta = est.notaAbierta === ds.cmNota ? null : ds.cmNota;
      pintarPedido();
      const inp = dlg.querySelector(`[data-cm-nota-txt="${ds.cmNota}"]`);
      if (inp) inp.focus();
    } else if (ds.cm === 'cerrar') {
      if (!est.lineas.length || confirm('¿Descartar este pedido?')) dlg.close();
    } else if (ds.cm === 'enviar') enviar(false);
    else if (ds.cm === 'cobrar') enviar(true);
    else if (ds.cm === 'ver') { est.ver = true; pintarPedido(); }
    else if (ds.cm === 'ocultar') { est.ver = false; pintarPedido(); }
  }

  function onInput(ev) {
    if (!est) return;
    const t = ev.target;
    if (t.hasAttribute('data-cm-q')) { est.q = t.value.trim(); pintarGrid(); }
    else if (t.dataset.cmNotaTxt) { const l = linea(t.dataset.cmNotaTxt); if (l) l.nota = t.value.slice(0, 140); }
    else if (t.hasAttribute('data-cm-nota-general')) est.nota = t.value.slice(0, 300);
    else if (t.hasAttribute('data-cm-servido') && ev.type === 'change') { est.servido = t.checked; pintarPedido(); }
  }

  window.CartaComandero = { abrir };
})();
