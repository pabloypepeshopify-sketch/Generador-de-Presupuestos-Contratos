// Stock por producto (gestión): unidades o raciones que quedan, aviso de "quedan pocas" y ajustes rápidos.
// A 0 el producto se marca agotado solo; si se cancela un pedido, el stock vuelve. Vacío = sin control.
// Uso: CartaStock.montar(elemento, { sesion: () => ({ slug, clave }), moneda: () => 'EUR' })
(function () {
  const { rpc, esc, dinero, toast } = window.Carta;
  const CSS = `
.sk-intro{color:var(--muted);font-size:14px;margin:0 0 12px}
.sk-bajo{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
.sk-bajo span{padding:5px 10px;border-radius:999px;font-weight:700;font-size:13px;background:color-mix(in srgb,var(--warn) 16%,var(--surface));border:1px solid var(--warn)}
.sk-bajo span.cero{background:color-mix(in srgb,var(--danger) 14%,var(--surface));border-color:var(--danger)}
.sk-buscar{width:100%;min-height:42px;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);margin-bottom:10px}
.sk-cat{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:14px 0 4px}
.sk-fila{display:grid;grid-template-columns:minmax(0,1fr) 92px 92px auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}
.sk-fila .n{min-width:0;overflow-wrap:anywhere;font-weight:600}
.sk-fila .n small{display:block;color:var(--muted);font-weight:500}
.sk-fila label{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--muted)}
.sk-fila input{width:100%;min-height:40px;padding:6px 8px;border:1px solid var(--line);border-radius:10px;background:var(--surface);font-size:16px;text-align:center}
.sk-aj{display:flex;gap:4px}
.sk-aj button{min-width:40px;height:40px;border-radius:10px;border:1px solid var(--line);background:var(--surface);font-weight:700;cursor:pointer}
.sk-aj button:disabled{opacity:.35;cursor:default}
.sk-ago{color:var(--danger);font-weight:700}
@media (max-width:600px){.sk-fila{grid-template-columns:minmax(0,1fr) 74px 74px}.sk-aj{grid-column:1/-1;justify-content:flex-end}}`;

  function montar(raiz, opts) {
    if (!document.getElementById('sk-css')) {
      const st = document.createElement('style'); st.id = 'sk-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    const est = { datos: null, q: '' };

    async function llamar(accion, datos) {
      const s = opts.sesion();
      est.datos = await rpc('carta_tpv', { p_slug: s.slug, p_clave: s.clave, p_accion: accion, p_datos: datos || {} });
      pintar();
    }

    function pintar() {
      const d = est.datos, m = opts.moneda(), q = est.q.toLowerCase();
      const foco = document.activeElement && raiz.contains(document.activeElement) ? document.activeElement.dataset : null;
      raiz.innerHTML = `
        <p class="sk-intro">Pon cuántas unidades o raciones te quedan de cada producto. Cada pedido las descuenta;
          al llegar a 0 se marca <b>agotado</b> solo y, si se cancela un pedido, vuelven. Déjalo vacío para no controlarlo.</p>
        ${d.stock_bajo.length ? `<div class="sk-bajo">${d.stock_bajo.map((p) => `<span class="${Number(p.stock) ? '' : 'cero'}">${Number(p.stock) ? `⚠ Quedan ${esc(p.stock)}` : '⛔ Agotado'} · ${esc(p.nombre)}</span>`).join('')}</div>` : ''}
        <input type="search" class="sk-buscar" data-sk-q placeholder="Buscar producto" value="${esc(est.q)}" aria-label="Buscar producto">
        ${d.categorias.map((c) => {
          const ps = c.productos.filter((p) => !q || p.nombre.toLowerCase().includes(q));
          if (!ps.length) return '';
          return `<div class="sk-cat">${esc(c.nombre)}</div>${ps.map((p) => `
            <div class="sk-fila" data-sk-id="${esc(p.id)}">
              <div class="n">${esc(p.nombre)}<small>${dinero(p.precio, m)}${p.disponible ? '' : ' · <span class="sk-ago">agotado</span>'}</small></div>
              <label>Quedan<input type="number" inputmode="numeric" min="0" max="99999" data-sk-stock value="${p.stock == null ? '' : esc(p.stock)}" placeholder="—" aria-label="Stock de ${esc(p.nombre)}"></label>
              <label>Avisar con<input type="number" inputmode="numeric" min="0" max="99999" data-sk-alerta value="${p.alerta == null ? '' : esc(p.alerta)}" placeholder="—" aria-label="Aviso de ${esc(p.nombre)}"></label>
              <div class="sk-aj">
                <button type="button" data-sk-n="-1" ${p.stock == null ? 'disabled' : ''} aria-label="Restar 1">−1</button>
                <button type="button" data-sk-n="1" ${p.stock == null ? 'disabled' : ''} aria-label="Sumar 1">+1</button>
                <button type="button" data-sk-n="10" ${p.stock == null ? 'disabled' : ''} aria-label="Sumar 10">+10</button>
              </div>
            </div>`).join('')}`;
        }).join('')}`;
      if (foco && foco.skQ !== undefined) { const i = raiz.querySelector('[data-sk-q]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    }

    raiz.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-sk-n]');
      if (!b) return;
      const id = b.closest('[data-sk-id]').dataset.skId;
      b.disabled = true;
      try { await llamar('sumar', { id, n: b.dataset.skN }); } catch (e) { toast(e.humano, 'error'); b.disabled = false; }
    });
    raiz.addEventListener('change', async (ev) => {
      const t = ev.target;
      if (!t.matches('[data-sk-stock],[data-sk-alerta]')) return;
      const fila = t.closest('[data-sk-id]');
      const stock = fila.querySelector('[data-sk-stock]').value.trim();
      const alerta = fila.querySelector('[data-sk-alerta]').value.trim();
      try {
        await llamar('stock', { id: fila.dataset.skId, stock, alerta });
        toast(stock === '' ? 'Sin control de stock' : `Stock guardado: ${stock}`);
      } catch (e) { toast(e.humano, 'error'); }
    });
    raiz.addEventListener('input', (ev) => {
      if (ev.target.hasAttribute('data-sk-q')) { est.q = ev.target.value.trim(); pintar(); }
    });

    const cargar = () => llamar('datos').catch((e) => { raiz.innerHTML = `<p class="sk-intro">${esc(e.humano || 'No se ha podido cargar el stock.')}</p>`; });
    raiz.innerHTML = '<p class="sk-intro">Cargando…</p>';
    cargar();
    return { recargar: cargar };
  }

  window.CartaStock = { montar };
})();
