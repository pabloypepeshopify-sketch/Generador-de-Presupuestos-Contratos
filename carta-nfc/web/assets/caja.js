// Caja: apertura con fondo, entradas y salidas de efectivo, efectivo esperado en vivo y cierre con arqueo
// (recuento por billetes y monedas, descuadre e impresión). Historial de cierres para reimprimirlos.
// Uso: CartaCaja.montar(elemento, { sesion: () => ({ slug, clave }), moneda: () => 'EUR', imprimir: (html) => {} })
(function () {
  const { rpc, esc, dinero, toast } = window.Carta;
  const VALORES = ['500', '200', '100', '50', '20', '10', '5', '2', '1', '0.5', '0.2', '0.1', '0.05', '0.02', '0.01'];
  const FORMAS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', bizum: 'Bizum', otro: 'Otro' };
  const CONCEPTOS = { salida: ['Proveedor', 'Compra', 'Retirada al banco', 'Adelanto'], entrada: ['Cambio', 'Ingreso', 'Fondo extra'] };

  const CSS = `
.cj{display:grid;gap:12px;max-width:980px;margin:0 auto}
.cj-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px}
.cj-card h2{font-size:18px;margin:0 0 4px}
.cj-intro{color:var(--muted);font-size:14px;margin:0 0 12px}
.cj-hero{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px}
.cj-hero b{font-size:40px;line-height:1.1;font-variant-numeric:tabular-nums}
.cj-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:12px}
.cj-kpis div{background:var(--surface-2);border-radius:12px;padding:10px 12px}
.cj-kpis span{display:block;font-size:12px;color:var(--muted)}
.cj-kpis b{font-size:19px;font-variant-numeric:tabular-nums}
.cj-fila{display:flex;flex-wrap:wrap;gap:8px;align-items:end}
.cj-fila label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;flex:1 1 140px;min-width:0}
.cj-fila input{min-height:46px;padding:8px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);font-size:17px;width:100%;min-width:0}
.cj-fila .btn{min-height:46px}
.cj-tipo{display:grid;grid-template-columns:1fr 1fr;gap:4px;background:var(--surface-2);padding:4px;border-radius:12px;flex:1 1 100%}
.cj-tipo button{min-height:42px;border:0;border-radius:9px;background:transparent;font-weight:700;cursor:pointer}
.cj-tipo button[aria-pressed="true"]{background:var(--surface);box-shadow:var(--shadow)}
.cj-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}
.cj-chips button{min-height:34px;padding:4px 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);cursor:pointer;font-weight:600}
.cj-movs{margin-top:12px}
.cj-mov{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}
.cj-mov .c{min-width:0;overflow-wrap:anywhere}
.cj-mov small{display:block;color:var(--muted)}
.cj-mov .i{font-weight:700;font-variant-numeric:tabular-nums}
.cj-billetes{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
.cj-billetes label{display:grid;grid-template-columns:64px minmax(0,1fr);align-items:center;gap:6px;background:var(--surface-2);border-radius:10px;padding:6px 8px;font-weight:700}
.cj-billetes input{min-height:40px;padding:4px 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);font-size:17px;text-align:center;width:100%;min-width:0}
.cj-res{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:12px 0}
.cj-res div{border-radius:12px;padding:10px 12px;background:var(--surface-2)}
.cj-res span{display:block;font-size:12px;color:var(--muted)}
.cj-res b{font-size:22px;font-variant-numeric:tabular-nums}
.cj-res .ok{background:color-mix(in srgb,var(--ok) 14%,var(--surface))}
.cj-res .mal{background:color-mix(in srgb,var(--danger) 14%,var(--surface))}
.cj-hist{width:100%;border-collapse:collapse;font-size:14px}
.cj-hist th,.cj-hist td{padding:8px 6px;border-top:1px solid var(--line);text-align:right;font-variant-numeric:tabular-nums}
.cj-hist th:first-child,.cj-hist td:first-child{text-align:left}
.cj-hist .mal{color:var(--danger);font-weight:700}
.cj-botones{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.cj-botones .btn{flex:1 1 180px;min-height:50px}
@media (max-width:600px){.cj-hero b{font-size:32px}.cj-hist .opc{display:none}}`;

  const r2 = (n) => Math.round(n * 100) / 100;
  const importe = (v) => {
    const t = String(v == null ? '' : v).trim().replace(',', '.');
    return /^\d{1,6}(\.\d{1,2})?$/.test(t) ? Number(t) : (t === '' ? null : NaN);
  };
  const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
  const horaCorta = (iso) => new Date(iso).toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' });
  const nombreValor = (v) => (Number(v) >= 1 ? `${v} €` : `${Math.round(Number(v) * 100)} cts`);

  // Hoja de cierre para la impresora térmica.
  function htmlCierre(t, restaurante, m) {
    const rs = t.resumen || {}, pf = rs.por_forma || {};
    const fila = (a, b) => `<div class="r"><span>${a}</span><span>${b}</span></div>`;
    return `<h1>${esc(restaurante || 'Caja')}</h1><h2>CIERRE DE CAJA</h2>
      ${fila('Apertura', esc(fechaHora(t.abierto)))}${fila('Cierre', esc(fechaHora(t.cerrado)))}<hr>
      ${fila('Tickets', esc(rs.tickets || 0))}${fila('Ventas (IVA incl.)', dinero(rs.ventas, m))}
      ${Number(rs.devoluciones) ? fila(`Devoluciones (${esc(rs.devoluciones)})`, dinero(rs.devuelto, m)) : ''}
      ${Object.keys(pf).sort().map((k) => fila(esc(FORMAS[k] || k), dinero(pf[k], m))).join('')}
      ${Number(rs.propinas) ? fila('Propinas', dinero(rs.propinas, m)) : ''}<hr>
      <div><b>EFECTIVO</b></div>
      ${fila('Fondo inicial', dinero(t.fondo, m))}${fila('Cobros en efectivo', dinero(rs.efectivo, m))}
      ${fila('Entradas', dinero(rs.entradas, m))}${fila('Salidas', '-' + dinero(rs.salidas, m))}
      ${(t.movimientos || []).map((x) => `<div class="n">${x.tipo === 'salida' ? '-' : '+'}${dinero(x.importe, m)} ${esc(x.concepto)}</div>`).join('')}
      <hr>${fila('Esperado', dinero(t.esperado, m))}${fila('Contado', dinero(t.contado, m))}
      <div class="r t"><span>DESCUADRE</span><span>${Number(t.descuadre) > 0 ? '+' : ''}${dinero(t.descuadre, m)}</span></div>
      ${t.billetes && Object.keys(t.billetes).length ? `<hr>${VALORES.filter((v) => t.billetes[v]).map((v) =>
        fila(`${t.billetes[v]} × ${nombreValor(v)}`, dinero(r2(t.billetes[v] * Number(v)), m))).join('')}` : ''}
      ${t.nota ? `<hr><div>Nota: ${esc(t.nota)}</div>` : ''}
      <hr><p style="font-size:11px">Firma:</p><br><br>`;
  }

  function montar(raiz, opts) {
    if (!document.getElementById('cj-css')) {
      const st = document.createElement('style'); st.id = 'cj-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    const est = { d: null, vista: 'caja', tipo: 'salida', billetes: {}, historial: null, enviando: false };

    async function llamar(accion, datos) {
      const s = opts.sesion();
      const r = await rpc('fiscal_caja', { p_slug: s.slug, p_clave: s.clave, p_accion: accion, p_datos: datos || {} });
      est.d = r;
      return r;
    }

    function pintar() {
      const m = opts.moneda(), d = est.d;
      if (est.vista === 'historial') return pintarHistorial();
      if (!d.turno) {
        raiz.innerHTML = `<div class="cj"><section class="cj-card">
          <h2>💶 Caja cerrada</h2>
          <p class="cj-intro">Abre la caja al empezar el turno con el dinero que dejas en el cajón para cambios.
            Así, al cerrar, sabrás cuánto efectivo debería haber y si cuadra.</p>
          <form class="cj-fila" data-cj-form="abrir">
            <label>Fondo de caja (cambio inicial)<input type="text" inputmode="decimal" name="fondo" placeholder="Ej.: 150" required></label>
            <button class="btn primary" type="submit">Abrir caja</button>
          </form>
          ${d.ultimo ? `<p class="cj-intro" style="margin-top:12px">Último cierre: ${esc(fechaHora(d.ultimo.cerrado))} · contado ${dinero(d.ultimo.contado, m)}
            · descuadre ${Number(d.ultimo.descuadre) > 0 ? '+' : ''}${dinero(d.ultimo.descuadre, m)}</p>` : ''}
          <div class="cj-botones"><button class="btn" type="button" data-cj="historial">📜 Cierres anteriores</button></div>
        </section></div>`;
        return;
      }
      if (est.vista === 'cerrar') return pintarCierre();
      const t = d.turno, rs = t.resumen || {}, pf = rs.por_forma || {};
      raiz.innerHTML = `<div class="cj">
        <section class="cj-card">
          <div class="cj-hero"><div><h2>💶 Efectivo que debería haber en el cajón</h2>
            <span class="cj-intro">Caja abierta ${esc(fechaHora(t.abierto))}</span></div><b>${dinero(rs.esperado, m)}</b></div>
          <div class="cj-kpis">
            <div><span>Fondo inicial</span><b>${dinero(t.fondo, m)}</b></div>
            <div><span>Cobrado en efectivo</span><b>${dinero(rs.efectivo, m)}</b></div>
            ${['tarjeta', 'bizum', 'otro'].filter((k) => pf[k]).map((k) => `<div><span>Cobrado ${FORMAS[k].toLowerCase()}</span><b>${dinero(pf[k], m)}</b></div>`).join('')}
            <div><span>Entradas</span><b>${dinero(rs.entradas, m)}</b></div>
            <div><span>Salidas</span><b>${dinero(rs.salidas, m)}</b></div>
            <div><span>Ventas · ${esc(rs.tickets || 0)} tickets</span><b>${dinero(rs.ventas, m)}</b></div>
            ${Number(rs.propinas) ? `<div><span>Propinas</span><b>${dinero(rs.propinas, m)}</b></div>` : ''}
            ${Number(rs.devoluciones) ? `<div><span>Devoluciones (${esc(rs.devoluciones)})</span><b>${dinero(rs.devuelto, m)}</b></div>` : ''}
          </div>
        </section>
        <section class="cj-card">
          <h2>Sacar o meter dinero</h2>
          <p class="cj-intro">Pago a un proveedor, cambio que traes del banco… Queda apuntado y no se puede borrar.</p>
          <form class="cj-fila" data-cj-form="movimiento">
            <div class="cj-tipo" role="group" aria-label="Tipo de movimiento">
              <button type="button" data-cj-tipo="salida" aria-pressed="${est.tipo === 'salida'}">➖ Sacar (salida)</button>
              <button type="button" data-cj-tipo="entrada" aria-pressed="${est.tipo === 'entrada'}">➕ Meter (entrada)</button>
            </div>
            <label>Importe<input type="text" inputmode="decimal" name="importe" placeholder="0,00" required></label>
            <label style="flex:2 1 200px">Concepto<input type="text" name="concepto" maxlength="120" placeholder="Ej.: Pan del proveedor" required></label>
            <button class="btn" type="submit">Apuntar</button>
          </form>
          <div class="cj-chips">${CONCEPTOS[est.tipo].map((c) => `<button type="button" data-cj-concepto="${esc(c)}">${esc(c)}</button>`).join('')}</div>
          <div class="cj-movs">${(t.movimientos || []).slice().reverse().map((x) => `<div class="cj-mov">
            <span>${x.tipo === 'salida' ? '➖' : '➕'}</span><span class="c">${esc(x.concepto)}<small>${esc(horaCorta(x.creado))}</small></span>
            <span class="i">${x.tipo === 'salida' ? '−' : '+'}${dinero(x.importe, m)}</span></div>`).join('') || '<p class="cj-intro">Sin movimientos.</p>'}</div>
        </section>
        <div class="cj-botones">
          <button class="btn primary" type="button" data-cj="cerrar">🔒 Cerrar caja (arqueo)</button>
          <button class="btn" type="button" data-cj="historial">📜 Cierres anteriores</button>
        </div>
      </div>`;
    }

    function totalBilletes() {
      return r2(VALORES.reduce((s, v) => s + (parseInt(est.billetes[v], 10) || 0) * Number(v), 0));
    }

    function pintarCierre() {
      const m = opts.moneda(), t = est.d.turno, rs = t.resumen || {};
      raiz.innerHTML = `<div class="cj"><section class="cj-card">
        <h2>🔒 Cerrar caja</h2>
        <p class="cj-intro">Cuenta el dinero del cajón. Puedes contar por billetes y monedas o escribir el total directamente.</p>
        <div class="cj-billetes">${VALORES.map((v) => `<label>${esc(nombreValor(v))}<input type="number" inputmode="numeric" min="0" max="99999"
          data-cj-billete="${v}" value="${esc(est.billetes[v] || '')}" placeholder="0" aria-label="Unidades de ${esc(nombreValor(v))}"></label>`).join('')}</div>
        <form data-cj-form="cerrar">
          <div class="cj-fila" style="margin-top:12px">
            <label>Total contado<input type="text" inputmode="decimal" name="contado" id="cj-contado" placeholder="0,00" required></label>
            <label style="flex:2 1 220px">Nota (opcional)<input type="text" name="nota" maxlength="300" placeholder="Ej.: falta un ticket de proveedor"></label>
          </div>
          <div class="cj-res" id="cj-res"></div>
          <div class="cj-botones">
            <button class="btn primary" type="submit" id="cj-cerrar">Cerrar caja e imprimir</button>
            <button class="btn ghost" type="button" data-cj="volver">Volver</button>
          </div>
        </form>
        <p class="cj-intro">Esperado ${dinero(rs.esperado, m)} = fondo ${dinero(t.fondo, m)} + efectivo ${dinero(rs.efectivo, m)}
          + entradas ${dinero(rs.entradas, m)} − salidas ${dinero(rs.salidas, m)}.</p>
      </section></div>`;
      const tb = totalBilletes();
      if (tb) raiz.querySelector('#cj-contado').value = tb.toFixed(2).replace('.', ',');
      actualizarCierre();
    }

    function actualizarCierre() {
      const res = raiz.querySelector('#cj-res');
      if (!res) return;
      const m = opts.moneda(), esperado = Number(est.d.turno.resumen.esperado);
      const contado = importe(raiz.querySelector('#cj-contado').value);
      const desc = contado == null || Number.isNaN(contado) ? null : r2(contado - esperado);
      res.innerHTML = `<div><span>Esperado</span><b>${dinero(esperado, m)}</b></div>
        <div><span>Contado</span><b>${contado == null || Number.isNaN(contado) ? '—' : dinero(contado, m)}</b></div>
        <div class="${desc == null ? '' : desc === 0 ? 'ok' : 'mal'}"><span>${desc == null ? 'Descuadre' : desc === 0 ? 'Cuadra ✓' : desc > 0 ? 'Sobra' : 'Falta'}</span>
          <b>${desc == null ? '—' : dinero(Math.abs(desc), m)}</b></div>`;
      raiz.querySelector('#cj-cerrar').disabled = est.enviando || desc == null;
    }

    async function pintarHistorial() {
      const m = opts.moneda();
      raiz.innerHTML = `<div class="cj"><section class="cj-card"><h2>📜 Cierres de caja</h2><p class="cj-intro">Cargando…</p></section></div>`;
      try {
        const s = opts.sesion();
        const r = await rpc('fiscal_caja', { p_slug: s.slug, p_clave: s.clave, p_accion: 'historial', p_datos: { limite: '60' } });
        est.historial = r.historial;
      } catch (e) {
        raiz.querySelector('.cj-intro').textContent = e.humano || 'No se ha podido cargar.';
        return;
      }
      if (est.vista !== 'historial') return;
      raiz.innerHTML = `<div class="cj"><section class="cj-card"><h2>📜 Cierres de caja</h2>
        ${est.historial.length ? `<table class="cj-hist"><thead><tr><th>Cierre</th><th class="opc">Ventas</th><th class="opc">Esperado</th><th>Contado</th><th>Descuadre</th><th></th></tr></thead><tbody>
          ${est.historial.map((x) => `<tr><td>${esc(fechaHora(x.cerrado))}</td><td class="opc">${dinero(x.ventas, m)}</td><td class="opc">${dinero(x.esperado, m)}</td>
            <td>${dinero(x.contado, m)}</td><td class="${Number(x.descuadre) ? 'mal' : ''}">${Number(x.descuadre) > 0 ? '+' : ''}${dinero(x.descuadre, m)}</td>
            <td><button class="btn sm" type="button" data-cj-ver="${esc(x.id)}">🖨</button></td></tr>`).join('')}</tbody></table>`
          : '<p class="cj-intro">Aún no hay cierres.</p>'}
        <div class="cj-botones"><button class="btn" type="button" data-cj="volver">← Volver a la caja</button></div></section></div>`;
    }

    async function enviar(form) {
      if (est.enviando) return;
      const tipo = form.dataset.cjForm;
      let accion = tipo, datos = {};
      if (tipo === 'abrir') {
        const f = importe(form.fondo.value);
        if (f == null || Number.isNaN(f)) { toast('Fondo no válido (ej.: 150).', 'error'); return; }
        datos = { fondo: f.toFixed(2), dispositivo: 'Panel de comandas' };
      } else if (tipo === 'movimiento') {
        const i = importe(form.importe.value);
        if (!i || Number.isNaN(i)) { toast('Importe no válido.', 'error'); return; }
        datos = { tipo: est.tipo, importe: i.toFixed(2), concepto: form.concepto.value.trim() };
      } else if (tipo === 'cerrar') {
        const c = importe(form.contado.value);
        if (c == null || Number.isNaN(c)) { toast('Escribe el total contado.', 'error'); return; }
        const billetes = Object.fromEntries(VALORES.filter((v) => parseInt(est.billetes[v], 10) > 0).map((v) => [v, parseInt(est.billetes[v], 10)]));
        const desc = r2(c - Number(est.d.turno.resumen.esperado));
        if (desc !== 0 && !confirm(`${desc > 0 ? 'Sobran' : 'Faltan'} ${dinero(Math.abs(desc), opts.moneda())}. ¿Cerrar la caja igualmente?`)) return;
        datos = { contado: c.toFixed(2), billetes, nota: form.nota.value.trim() || null };
      }
      est.enviando = true;
      try {
        const r = await llamar(accion, datos);
        if (tipo === 'abrir') toast('Caja abierta');
        else if (tipo === 'movimiento') toast(`${est.tipo === 'salida' ? 'Salida' : 'Entrada'} apuntada`);
        else {
          toast('Caja cerrada');
          est.vista = 'caja'; est.billetes = {};
          if (r.cerrado && opts.imprimir) opts.imprimir(htmlCierre(r.cerrado, opts.nombre && opts.nombre(), opts.moneda()));
        }
      } catch (e) {
        toast(e.humano, 'error');
      } finally {
        est.enviando = false;
      }
      pintar();
    }

    raiz.addEventListener('submit', (ev) => {
      const f = ev.target.closest('[data-cj-form]');
      if (!f) return;
      ev.preventDefault();
      enviar(f);
    });
    raiz.addEventListener('click', async (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.cjTipo) {
        est.tipo = b.dataset.cjTipo;
        raiz.querySelectorAll('[data-cj-tipo]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        raiz.querySelector('.cj-chips').innerHTML = CONCEPTOS[est.tipo].map((c) => `<button type="button" data-cj-concepto="${esc(c)}">${esc(c)}</button>`).join('');
      } else if (b.dataset.cjConcepto) {
        const i = raiz.querySelector('[data-cj-form="movimiento"] [name="concepto"]');
        i.value = b.dataset.cjConcepto; i.focus();
      } else if (b.dataset.cj === 'cerrar') {
        try { await llamar('estado'); } catch (e) { toast(e.humano, 'error'); }
        est.vista = 'cerrar'; pintar();
      } else if (b.dataset.cj === 'historial') { est.vista = 'historial'; pintar(); }
      else if (b.dataset.cj === 'volver') { est.vista = 'caja'; pintar(); }
      else if (b.dataset.cjVer) {
        try {
          const s = opts.sesion();
          const r = await rpc('fiscal_caja', { p_slug: s.slug, p_clave: s.clave, p_accion: 'ver', p_datos: { id: b.dataset.cjVer } });
          if (opts.imprimir) opts.imprimir(htmlCierre(r.turno_visto, opts.nombre && opts.nombre(), opts.moneda()));
        } catch (e) { toast(e.humano, 'error'); }
      }
    });
    raiz.addEventListener('input', (ev) => {
      const t = ev.target;
      if (t.dataset.cjBillete) {
        est.billetes[t.dataset.cjBillete] = t.value;
        const tb = totalBilletes();
        raiz.querySelector('#cj-contado').value = tb ? tb.toFixed(2).replace('.', ',') : '';
        actualizarCierre();
      } else if (t.id === 'cj-contado') actualizarCierre();
    });

    const cargar = async () => {
      if (est.vista === 'historial') return pintar();
      try { await llamar('estado'); pintar(); } catch (e) {
        raiz.innerHTML = `<div class="cj"><section class="cj-card"><p class="cj-intro">${esc(e.humano || 'No se ha podido cargar la caja.')}</p></section></div>`;
      }
    };
    raiz.innerHTML = '<div class="cj"><section class="cj-card"><p class="cj-intro">Cargando caja…</p></section></div>';
    cargar();
    // Refresca el esperado sin pisar lo que se está escribiendo.
    return { recargar: () => { if (est.vista === 'caja' && !raiz.contains(document.activeElement)) cargar(); else if (est.vista === 'caja' && !est.d) cargar(); } };
  }

  window.CartaCaja = { montar, htmlCierre };
})();
