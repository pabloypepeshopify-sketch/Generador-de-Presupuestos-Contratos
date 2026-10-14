// Lista de tickets y facturas emitidos (panel de comandas y gestión).
// Filtros por fecha, tipo y texto; totales del periodo; ver/reimprimir cualquiera; descarga CSV para la gestoría.
// Uso: CartaTickets.montar(elemento, { sesion: () => ({ slug, clave }), moneda: () => 'EUR', ver: (token) => {} })
(function () {
  const { rpc, esc, dinero, toast } = window.Carta;
  const POR_PAGINA = 50;
  const FORMAS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', bizum: 'Bizum', otro: 'Otro' };
  const RANGOS = [['hoy', 'Hoy'], ['ayer', 'Ayer'], ['7d', '7 días'], ['mes', 'Este mes'], ['todo', 'Todo']];
  const ENVIO = { pendiente: 'pendiente de envío', no_aplica: '', correcto: 'enviado ✓', enviado: 'enviado',
    aceptado_con_errores: 'aceptado con errores', incorrecto: 'rechazado' };

  const CSS = `
.tkl-filtros{display:flex;flex-wrap:wrap;gap:8px;align-items:end}
.tkl-rangos{display:flex;gap:4px;width:100%;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.tkl-rangos::-webkit-scrollbar{display:none}
.tkl-rangos button{flex:0 0 auto;min-height:38px;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);font-weight:600;cursor:pointer}
.tkl-rangos button[aria-pressed="true"]{background:var(--text);color:var(--bg);border-color:var(--text)}
.tkl-filtros label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;flex:1 1 130px;min-width:0}
.tkl-filtros label.tkl-tipo{flex:0 1 120px}
.tkl-filtros label.tkl-q{flex:1 1 160px}
.tkl-filtros input,.tkl-filtros select{min-height:42px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);width:100%;min-width:0}
.tkl-filtros [data-tkl-csv]{min-height:42px}
.tkl-resumen{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:12px 0}
.tkl-resumen div{background:var(--surface-2);border-radius:12px;padding:10px 12px}
.tkl-resumen b{display:block;font-size:20px}
.tkl-resumen span{font-size:12px;color:var(--muted)}
.tkl-fila{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}
.tkl-fila:first-child{border-top:0}
.tkl-fila .n{grid-row:1 / span 2;min-width:0;overflow-wrap:anywhere}
.tkl-fila .t{font-weight:700;white-space:nowrap;text-align:right}
.tkl-fila button{justify-self:end;white-space:nowrap}
@media (max-width:600px){.tkl-resumen{grid-template-columns:repeat(2,minmax(0,1fr))}.tkl-resumen b{font-size:18px}.tkl-filtros [data-tkl-csv]{width:100%}}
.tkl-mas{display:block;margin:12px auto 0}
.tkl-vacio{padding:24px 0;text-align:center;color:var(--muted)}`;

  // Fechas 'YYYY-MM-DD' en la zona del restaurante (por defecto Madrid).
  const hoyLocal = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
  function sumarDias(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  }
  function rango(nombre, hoy) {
    if (nombre === 'hoy') return [hoy, hoy];
    if (nombre === 'ayer') return [sumarDias(hoy, -1), sumarDias(hoy, -1)];
    if (nombre === '7d') return [sumarDias(hoy, -6), hoy];
    if (nombre === 'mes') return [hoy.slice(0, 8) + '01', hoy];
    return ['', ''];
  }
  const fechaCorta = (iso) => iso ? iso.split('-').reverse().join('/') : '';
  const num2 = (n) => Number(n || 0).toFixed(2).replace('.', ',');

  // CSV para Excel en español: ; como separador, coma decimal, BOM UTF-8. Evita fórmulas en textos.
  function celda(v, texto) {
    let s = v == null ? '' : String(v);
    if (texto && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[";\r\n]/.test(s) || texto ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function montar(raiz, opts) {
    if (!document.getElementById('tkl-css')) {
      const st = document.createElement('style'); st.id = 'tkl-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    const hoy = hoyLocal();
    const est = { rango: 'hoy', desde: hoy, hasta: hoy, tipo: '', q: '', docs: [], res: null, saltar: 0, hayMas: false, seq: 0, cargando: false };
    let tq = null;

    raiz.innerHTML = `
      <div class="tkl-filtros">
        <div class="tkl-rangos" role="group" aria-label="Periodo">
          ${RANGOS.map(([k, v]) => `<button type="button" data-tkl-rango="${k}" aria-pressed="${k === est.rango}">${v}</button>`).join('')}
        </div>
        <label>Desde<input type="date" data-tkl-f="desde" value="${est.desde}"></label>
        <label>Hasta<input type="date" data-tkl-f="hasta" value="${est.hasta}"></label>
        <label class="tkl-tipo">Tipo<select data-tkl-f="tipo"><option value="">Todos</option><option value="ticket">Tickets</option><option value="factura">Facturas</option></select></label>
        <label class="tkl-q">Buscar<input type="search" data-tkl-f="q" placeholder="Nº de ticket, mesa o cliente" maxlength="60"></label>
        <button class="btn sm" type="button" data-tkl-csv>⬇ Descargar Excel</button>
      </div>
      <div class="tkl-resumen" data-tkl-resumen></div>
      <div data-tkl-lista><div class="tkl-vacio">Cargando…</div></div>
      <button class="btn tkl-mas" type="button" data-tkl-mas hidden>Cargar más</button>`;
    const q = (sel) => raiz.querySelector(sel);

    function filtro(extra) {
      const f = { desde: est.desde, hasta: est.hasta, tipo: est.tipo, q: est.q };
      return Object.assign(f, extra);
    }

    async function cargar(reiniciar) {
      const n = ++est.seq;
      if (reiniciar) { est.saltar = 0; est.docs = []; }
      est.cargando = true;
      q('[data-tkl-mas]').disabled = true;
      try {
        const s = opts.sesion();
        const r = await rpc('fiscal_documentos', { p_slug: s.slug, p_clave: s.clave,
          p_filtro: filtro({ limite: String(POR_PAGINA), saltar: String(est.saltar) }) });
        if (n !== est.seq) return;
        est.docs = est.docs.concat(r.documentos || []);
        est.saltar = est.docs.length;
        est.hayMas = !!r.hay_mas;
        est.res = r;
        pintar();
      } catch (e) {
        if (n === est.seq) q('[data-tkl-lista]').innerHTML = `<div class="tkl-vacio">${esc(e.humano || 'No se han podido cargar los tickets.')}</div>`;
      } finally {
        if (n === est.seq) { est.cargando = false; q('[data-tkl-mas]').disabled = false; }
      }
    }

    function pintar() {
      const m = opts.moneda(), r = est.res, rs = r.resumen || {}, pf = r.por_forma || {};
      const n = Number(r.cuantos || 0);
      q('[data-tkl-resumen]').innerHTML = `
        <div><span>Documentos</span><b class="num">${n}</b></div>
        <div><span>Ventas (IVA incl.)</span><b class="num">${dinero(rs.total, m)}</b></div>
        <div><span>IVA</span><b class="num">${dinero(rs.cuota, m)}</b></div>
        ${Object.keys(pf).sort().map((k) => `<div><span>Cobrado ${esc((FORMAS[k] || k).toLowerCase())}</span><b class="num">${dinero(pf[k], m)}</b></div>`).join('')}
        ${Number(rs.propinas) ? `<div><span>Propinas (fuera de factura)</span><b class="num">${dinero(rs.propinas, m)}</b></div>` : ''}`;
      q('[data-tkl-lista]').innerHTML = est.docs.length ? est.docs.map((x) => {
        const fecha = new Date(x.expedido).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const factura = x.tipo !== 'F2' && x.tipo !== 'R5';
        const det = [fecha, x.mesa, (x.formas || []).map((f) => FORMAS[f] || f).join(' + '),
          factura && x.cliente ? `${x.cliente.nombre || ''} (${x.cliente.nif || ''})` : '', ENVIO[x.envio] || ''].filter(Boolean);
        return `<div class="tkl-fila" data-tkl-doc="${esc(x.num_serie)}">
          <div class="n"><strong>${esc(x.num_serie)}</strong> ${factura ? '<span class="chip">Factura</span>' : ''}
            ${x.estado !== 'emitido' ? `<span class="chip">${esc(x.estado)}</span>` : ''}
            <div class="muted small">${esc(det.join(' · '))}</div></div>
          <span class="t num">${dinero(x.total, m)}</span>
          <button class="btn sm" type="button" data-tkl-ver="${esc(x.token)}">🧾 Ver · Imprimir</button>
        </div>`;
      }).join('') : '<div class="tkl-vacio">No hay tickets en este periodo.</div>';
      q('[data-tkl-mas]').hidden = !est.hayMas;
      q('[data-tkl-mas]').textContent = `Cargar más (${est.docs.length} de ${n})`;
    }

    function ponerRango(nombre) {
      est.rango = nombre;
      [est.desde, est.hasta] = rango(nombre, hoyLocal());
      q('[data-tkl-f="desde"]').value = est.desde;
      q('[data-tkl-f="hasta"]').value = est.hasta;
      raiz.querySelectorAll('[data-tkl-rango]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tklRango === nombre)));
      cargar(true);
    }

    async function descargar(btn) {
      btn.disabled = true;
      const txt = btn.textContent;
      btn.textContent = 'Preparando…';
      try {
        const s = opts.sesion(), todos = [];
        for (let pag = 0; pag < 100; pag++) {
          const r = await rpc('fiscal_documentos', { p_slug: s.slug, p_clave: s.clave,
            p_filtro: filtro({ limite: '500', saltar: String(todos.length) }) });
          todos.push(...(r.documentos || []));
          if (!r.hay_mas) break;
        }
        if (!todos.length) { toast('No hay tickets en este periodo.'); return; }
        todos.reverse();  // libro en orden de emisión
        const cab = ['Fecha expedición', 'Número', 'Tipo', 'Mesa', 'NIF destinatario', 'Nombre destinatario', 'Tipo IVA %',
          'Base imponible', 'Cuota IVA', 'Total', 'Total documento', 'Propina (no facturada)', 'Forma de pago', 'Estado'];
        const filas = [cab.map((c) => celda(c, true)).join(';')];
        todos.forEach((x) => {
          const tipo = x.tipo === 'F2' ? 'Factura simplificada (F2)' : x.tipo === 'F1' ? 'Factura (F1)' : x.tipo;
          (x.desglose && x.desglose.length ? x.desglose : [{}]).forEach((dg, i) => {
            filas.push([
              celda(fechaCorta(x.fecha)), celda(x.num_serie, true), celda(tipo, true), celda(x.mesa || '', true),
              celda(x.cliente ? x.cliente.nif : '', true), celda(x.cliente ? x.cliente.nombre : '', true),
              celda(dg.iva != null ? num2(dg.iva).replace(',00', '') : ''), celda(num2(dg.base)), celda(num2(dg.cuota)), celda(num2(dg.total)),
              celda(i === 0 ? num2(x.total) : ''), celda(i === 0 ? num2(x.propina) : ''),
              celda(i === 0 ? (x.formas || []).map((f) => FORMAS[f] || f).join(' + ') : '', true), celda(x.estado, true),
            ].join(';'));
          });
        });
        const blob = new Blob(['﻿' + filas.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `tickets_${s.slug}_${est.desde || 'inicio'}_${est.hasta || hoyLocal()}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } catch (e) {
        toast(e.humano || 'No se ha podido descargar.', 'error');
      } finally {
        btn.disabled = false; btn.textContent = txt;
      }
    }

    raiz.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b || !raiz.contains(b)) return;
      if (b.dataset.tklRango) ponerRango(b.dataset.tklRango);
      else if (b.dataset.tklVer) opts.ver(b.dataset.tklVer);
      else if (b.hasAttribute('data-tkl-mas')) cargar(false);
      else if (b.hasAttribute('data-tkl-csv')) descargar(b);
    });
    raiz.addEventListener('input', (ev) => {
      const k = ev.target.dataset && ev.target.dataset.tklF;
      if (k !== 'q') return;
      est.q = ev.target.value.trim();
      clearTimeout(tq);
      tq = setTimeout(() => cargar(true), 300);
    });
    raiz.addEventListener('change', (ev) => {
      const k = ev.target.dataset && ev.target.dataset.tklF;
      if (!k || k === 'q') return;
      est[k] = ev.target.value;
      if (k === 'desde' || k === 'hasta') {
        est.rango = '';
        raiz.querySelectorAll('[data-tkl-rango]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      }
      cargar(true);
    });

    cargar(true);
    // Al volver a la pestaña, los rangos con nombre (Hoy, Ayer…) se recalculan por si ha cambiado el día.
    return { recargar: () => (est.rango ? ponerRango(est.rango) : cargar(true)) };
  }

  window.CartaTickets = { montar };
})();
