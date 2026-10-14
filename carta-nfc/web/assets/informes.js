// Informes de ventas tipo TPV (panel de comandas y gestión).
// Periodo → ventas con comparación, horas punta, días, lo más vendido (con buscador), categorías, cobros,
// tiempos de servicio, mesas y platos sin ventas. Cierre Z imprimible y Excel (CSV) del periodo.
// Uso: CartaInformes.montar(elemento, { sesion: () => ({ slug, clave }), moneda: () => 'EUR' })
(function () {
  const { rpc, esc, dinero, toast } = window.Carta;
  const FORMAS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', bizum: 'Bizum', otro: 'Otro' };
  const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const RANGOS = [['hoy', 'Hoy'], ['ayer', 'Ayer'], ['7d', '7 días'], ['30d', '30 días'], ['mes', 'Este mes'],
    ['mesant', 'Mes pasado'], ['anio', 'Este año']];
  const TOP = 10;

  // Una sola serie por gráfica: un tono (ámbar) validado para superficie clara y oscura.
  const CSS = `
.iv{--viz-1:#b45309;--viz-track:color-mix(in srgb,var(--viz-1) 14%,transparent)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .iv{--viz-1:#cf7a1e}}
:root[data-theme="dark"] .iv{--viz-1:#cf7a1e}
.iv{display:grid;gap:14px}
.iv.cargando .iv-cuerpo{opacity:.45;transition:opacity .2s}
.iv-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px;min-width:0}
.iv-card h3{font-size:15px;margin:0 0 2px}
.iv-card .iv-sub{color:var(--muted);font-size:13px;margin:0 0 12px}
.iv-filtros{display:flex;flex-wrap:wrap;gap:8px;align-items:end}
.iv-rangos{display:flex;gap:4px;width:100%;overflow-x:auto;scrollbar-width:none}
.iv-rangos::-webkit-scrollbar{display:none}
.iv-rangos button{flex:0 0 auto;min-height:38px;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);font-weight:600;cursor:pointer}
.iv-rangos button[aria-pressed="true"]{background:var(--text);color:var(--bg);border-color:var(--text)}
.iv-filtros label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;flex:1 1 130px;min-width:0}
.iv-filtros input{min-height:42px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);width:100%;min-width:0}
.iv-filtros .btn{min-height:42px}
.iv-cuerpo{display:grid;gap:14px;grid-template-columns:repeat(12,minmax(0,1fr))}
.iv-cuerpo>*{grid-column:span 12}
@media (min-width:900px){.iv-cuerpo>.m6{grid-column:span 6}.iv-cuerpo>.m4{grid-column:span 4}.iv-cuerpo>.m8{grid-column:span 8}}
.iv-hero{display:flex;flex-wrap:wrap;align-items:end;gap:8px 24px}
.iv-hero .lbl{color:var(--muted);font-size:14px;font-weight:600}
.iv-hero .v{font-size:52px;font-weight:800;line-height:1.05;letter-spacing:-.02em}
.iv-delta{font-size:14px;font-weight:700}
.iv-delta.sube{color:var(--ok)}.iv-delta.baja{color:var(--danger)}.iv-delta.igual{color:var(--muted)}
.iv-delta small{font-weight:500;color:var(--muted)}
.iv-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:16px}
.iv-kpi{background:var(--surface-2);border-radius:12px;padding:10px 12px;min-width:0}
.iv-kpi span{display:block;font-size:12px;color:var(--muted)}
.iv-kpi b{display:block;font-size:22px;font-weight:700;margin:2px 0}
.iv-kpi .iv-delta{font-size:12px}
.iv-cols{position:relative;height:180px;margin:24px 0 0 40px}
.iv-cols .eje{position:absolute;left:-40px;right:0;border-top:1px solid var(--line);font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
.iv-cols .eje span{position:absolute;left:0;top:-8px;width:36px;text-align:right;background:var(--surface);padding-right:4px}
.iv-plot{position:absolute;inset:0 0 0 0;display:flex;align-items:flex-end;gap:2px}
.iv-col{flex:1 1 0;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;position:relative;outline:none;cursor:default}
.iv-col i{display:block;width:100%;max-width:24px;background:var(--viz-1);border-radius:4px 4px 0 0;min-height:0}
.iv-col:hover i,.iv-col:focus-visible i{filter:brightness(1.15)}
.iv-col:focus-visible{box-shadow:inset 0 0 0 2px var(--text);border-radius:4px}
.iv-col em{position:absolute;font-style:normal;font-size:11px;font-weight:700;white-space:nowrap;color:var(--text);transform:translateY(-4px)}
.iv-x{display:flex;gap:2px;margin:4px 0 0 40px;font-size:11px;color:var(--muted)}
.iv-x span{flex:1 1 0;min-width:0;text-align:center;white-space:nowrap;overflow:visible}
.iv-tip{position:fixed;z-index:50;pointer-events:none;background:var(--text);color:var(--bg);font-size:13px;padding:6px 9px;border-radius:8px;box-shadow:var(--shadow);max-width:240px}
.iv-tip b{display:block;font-size:15px}
.iv-tabla{width:100%;border-collapse:collapse;font-size:14px}
.iv-tabla th{font-size:12px;color:var(--muted);font-weight:600;text-align:left;padding:6px 6px;border-bottom:1px solid var(--line)}
.iv-tabla td{padding:7px 6px;border-bottom:1px solid var(--line);vertical-align:middle}
.iv-tabla tr:last-child td{border-bottom:0}
.iv-tabla .n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.iv-tabla .pos{color:var(--muted);width:28px;font-variant-numeric:tabular-nums}
.iv-tabla small{display:block;color:var(--muted);font-size:12px}
.iv-hbar{display:block;height:6px;border-radius:0 3px 3px 0;background:var(--viz-1);margin-top:5px;min-width:2px}
.iv-prod-tools{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}
.iv-prod-tools input{flex:1 1 180px;min-height:40px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);min-width:0}
.iv-seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.iv-seg button{border:0;background:var(--surface);padding:8px 12px;font-weight:600;cursor:pointer;min-height:40px}
.iv-seg button[aria-pressed="true"]{background:var(--text);color:var(--bg)}
.iv-chips{display:flex;flex-wrap:wrap;gap:6px}
.iv-chips span{background:var(--surface-2);border-radius:999px;padding:4px 10px;font-size:13px}
.iv-vacio{color:var(--muted);text-align:center;padding:18px 0}
.iv-datos{margin-top:10px;font-size:13px}
.iv-datos summary{cursor:pointer;color:var(--muted)}
.iv-mas{margin-top:8px}
@media (max-width:600px){
  .iv-hero .v{font-size:44px}
  .iv-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
  .iv-x span.sec{visibility:hidden}
  .iv-filtros .btn{flex:1 1 140px}
  .iv-card{padding:12px}
}`;

  // ------------------------------------------------------------- fechas ----
  const hoyLocal = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
  const sumarDias = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  function rango(nombre, hoy) {
    const [y, m] = hoy.split('-').map(Number);
    if (nombre === 'ayer') return [sumarDias(hoy, -1), sumarDias(hoy, -1)];
    if (nombre === '7d') return [sumarDias(hoy, -6), hoy];
    if (nombre === '30d') return [sumarDias(hoy, -29), hoy];
    if (nombre === 'mes') return [hoy.slice(0, 8) + '01', hoy];
    if (nombre === 'mesant') {
      const ini = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
      return [ini, sumarDias(hoy.slice(0, 8) + '01', -1)];
    }
    if (nombre === 'anio') return [hoy.slice(0, 4) + '-01-01', hoy];
    return [hoy, hoy];
  }
  const fCorta = (iso) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  const fDiaMes = (iso) => { const [, m, d] = iso.split('-'); return `${Number(d)} ${MESES[Number(m) - 1]}`; };
  const horaDe = (ts) => (ts ? String(ts).slice(11, 16) : '—');

  // ----------------------------------------------------------- números ----
  const num = (n) => Number(n || 0);
  const entero = (n) => new Intl.NumberFormat('es-ES').format(num(n));
  function compacto(n) {
    n = num(n);
    if (n >= 1e6) return (n / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' M';
    if (n >= 1e3) return (n / 1e3).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' mil';
    return n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  }
  function techo(max) {  // máximo "redondo" del eje: 1, 2, 2.5, 5 × 10^k
    if (max <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(max)));
    for (const k of [1, 2, 2.5, 5, 10]) if (max <= k * p) return k * p;
    return 10 * p;
  }
  // Comparación con el periodo anterior. Sin datos previos no se muestra nada (la cifra grande lo explica).
  function delta(actual, anterior, etiqueta) {
    actual = num(actual); anterior = num(anterior);
    if (!anterior) return '';
    const pct = Math.round(((actual - anterior) / anterior) * 100);
    const cls = pct > 0 ? 'sube' : pct < 0 ? 'baja' : 'igual';
    const fl = pct > 0 ? '▲' : pct < 0 ? '▼' : '=';
    return `<span class="iv-delta ${cls}">${fl} ${pct > 0 ? '+' : ''}${pct} % <small>${esc(etiqueta)}</small></span>`;
  }
  const plural = (n, uno, varios) => `${entero(n)} ${num(n) === 1 ? uno : varios}`;
  const minutos = (m) => (m == null ? '—' : `${num(m).toLocaleString('es-ES', { maximumFractionDigits: 1 })} min`);

  // CSV para Excel en español (;, coma decimal, BOM). Evita fórmulas en textos.
  function celda(v, texto) {
    let s = v == null ? '' : String(v);
    if (texto && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return texto ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  const dec = (n) => num(n).toFixed(2).replace('.', ',');

  // ---------------------------------------------------------- gráficas ----
  // Columnas (una serie). datos: [{ x, valor, tip, sec }]. Etiqueta solo el máximo.
  function columnas(datos, { titulo, fmt }) {
    const max = Math.max(0, ...datos.map((d) => d.valor));
    if (!max) return '<div class="iv-vacio">Sin ventas en este periodo.</div>';
    const top = techo(max);
    const iMax = datos.findIndex((d) => d.valor === max);
    const ejes = [0, 0.5, 1].map((k) => `<div class="eje" style="bottom:${k * 100}%"><span>${esc(compacto(top * k))}</span></div>`).join('');
    const cols = datos.map((d, i) => `
      <div class="iv-col" tabindex="0" data-tip="${esc(d.tip)}" aria-label="${esc(d.tip)}">
        ${i === iMax ? `<em style="bottom:${(d.valor / top) * 100}%">${esc(fmt(d.valor))}</em>` : ''}
        <i style="height:${(d.valor / top) * 100}%"></i>
      </div>`).join('');
    const xs = datos.map((d) => `<span class="${d.sec ? 'sec' : ''}">${esc(d.x)}</span>`).join('');
    const filas = datos.map((d) => `<tr><td>${esc(d.tip.split(' · ')[0])}</td><td class="n">${esc(fmt(d.valor))}</td></tr>`).join('');
    return `<div class="iv-cols" role="img" aria-label="${esc(titulo)}">${ejes}<div class="iv-plot">${cols}</div></div>
      <div class="iv-x" aria-hidden="true">${xs}</div>
      <details class="iv-datos"><summary>Ver datos</summary><table class="iv-tabla"><tbody>${filas}</tbody></table></details>`;
  }

  // ---------------------------------------------------------- componente ----
  function montar(raiz, opts) {
    if (!document.getElementById('iv-css')) {
      const st = document.createElement('style'); st.id = 'iv-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    const hoy = hoyLocal();
    const est = { rango: 'hoy', desde: hoy, hasta: hoy, data: null, seq: 0, orden: 'importe', q: '', todos: false };
    raiz.innerHTML = `
      <div class="iv">
        <div class="iv-card"><div class="iv-filtros">
          <div class="iv-rangos" role="group" aria-label="Periodo">
            ${RANGOS.map(([k, v]) => `<button type="button" data-iv-rango="${k}" aria-pressed="${k === est.rango}">${v}</button>`).join('')}
          </div>
          <label>Desde<input type="date" data-iv-f="desde" value="${est.desde}"></label>
          <label>Hasta<input type="date" data-iv-f="hasta" value="${est.hasta}"></label>
          <button class="btn sm" type="button" data-iv-z>🖨 Cierre Z / informe</button>
          <button class="btn sm" type="button" data-iv-csv>⬇ Excel</button>
        </div></div>
        <div class="iv-cuerpo"><div class="iv-card iv-vacio">Cargando informe…</div></div>
      </div>
      <div class="iv-tip" hidden></div>`;
    const $q = (s) => raiz.querySelector(s);
    const tip = $q('.iv-tip');

    async function cargar() {
      const n = ++est.seq;
      raiz.querySelector('.iv').classList.add('cargando');
      try {
        const s = opts.sesion();
        const d = await rpc('carta_informe', { p_slug: s.slug, p_clave: s.clave, p_filtro: { desde: est.desde, hasta: est.hasta } });
        if (n !== est.seq) return;
        est.data = d;
        pintar();
      } catch (e) {
        if (n === est.seq) $q('.iv-cuerpo').innerHTML = `<div class="iv-card iv-vacio">${esc(e.humano || 'No se ha podido cargar el informe.')}</div>`;
      } finally {
        if (n === est.seq) raiz.querySelector('.iv').classList.remove('cargando');
      }
    }

    function etiquetaAnterior(p) {
      if (p.dias === 1) return p.desde === p.hoy ? 'vs ayer' : `vs ${fCorta(p.anterior_desde)}`;
      return `vs ${fCorta(p.anterior_desde)}–${fCorta(p.anterior_hasta)}`;
    }

    function pintar() {
      const d = est.data, m = opts.moneda(), k = d.kpis, a = d.anterior, p = d.periodo, c = d.cobros;
      const vsTxt = etiquetaAnterior(p);
      const ticket = num(k.pedidos) ? num(k.ventas) / num(k.pedidos) : 0;
      const ticketAnt = num(a.pedidos) ? num(a.ventas) / num(a.pedidos) : 0;
      const periodoTxt = p.dias === 1 ? fCorta(p.desde) : `${fCorta(p.desde)} – ${fCorta(p.hasta)} (${p.dias} días)`;

      // Horas: del primer al último tramo con ventas (mín. 12:00–23:00 de referencia si hay pocas).
      const ph = new Map((d.por_hora || []).map((x) => [x.h, x]));
      const hs = [...ph.keys()];
      let h0 = hs.length ? Math.min(...hs) : 12, h1 = hs.length ? Math.max(...hs) : 23;
      if (h1 - h0 < 6) { h0 = Math.max(0, h0 - 2); h1 = Math.min(23, h1 + 2); }
      const horas = [];
      for (let h = h0; h <= h1; h++) {
        const x = ph.get(h) || { ventas: 0, pedidos: 0 };
        horas.push({ x: String(h), sec: h % 2 === 1, valor: num(x.ventas), tip: `${String(h).padStart(2, '0')}:00–${String(h).padStart(2, '0')}:59 · ${dinero(x.ventas, m)} · ${plural(x.pedidos, 'pedido', 'pedidos')}` });
      }
      const pico = horas.reduce((b, x) => (x.valor > (b ? b.valor : 0) ? x : b), null);

      // Días (o meses si el periodo es largo)
      let dias = (d.por_dia || []).map((x) => ({ fecha: x.fecha, valor: num(x.ventas), pedidos: x.pedidos }));
      let porMes = false;
      if (dias.length > 62) {
        porMes = true;
        const g = new Map();
        dias.forEach((x) => { const kk = x.fecha.slice(0, 7); const o = g.get(kk) || { fecha: kk, valor: 0, pedidos: 0 }; o.valor += x.valor; o.pedidos += x.pedidos; g.set(kk, o); });
        dias = [...g.values()];
      }
      const paso = Math.ceil(dias.length / 10);
      const serieDias = dias.map((x, i) => {
        const lbl = porMes ? `${MESES[Number(x.fecha.slice(5, 7)) - 1]} ${x.fecha.slice(2, 4)}` : fDiaMes(x.fecha);
        return { x: i % paso === 0 ? lbl : '', valor: x.valor, tip: `${porMes ? lbl : fCorta(x.fecha)} · ${dinero(x.valor, m)} · ${plural(x.pedidos, 'pedido', 'pedidos')}` };
      });
      const dows = new Map((d.por_dia_semana || []).map((x) => [x.dow, x]));
      const serieDow = [1, 2, 3, 4, 5, 6, 7].map((i) => {
        const x = dows.get(i) || { ventas: 0, pedidos: 0 };
        return { x: DIAS[i].slice(0, 3), valor: num(x.ventas), tip: `${DIAS[i]} · ${dinero(x.ventas, m)} · ${plural(x.pedidos, 'pedido', 'pedidos')}` };
      });
      const mejorDia = serieDias.length > 1 ? dias.reduce((b, x) => (x.valor > b.valor ? x : b), dias[0]) : null;

      const formas = c ? Object.entries(c.por_forma || {}).sort((x, y) => num(y[1]) - num(x[1])) : [];
      const maxForma = Math.max(1, ...formas.map((f) => num(f[1])));
      const cats = d.categorias || [];
      const maxCat = Math.max(1, ...cats.map((x) => num(x.importe)));
      const totalVentas = num(k.ventas) || 1;

      $q('.iv-cuerpo').innerHTML = `
        <section class="iv-card">
          <div class="iv-hero">
            <div><div class="lbl">Ventas · ${esc(periodoTxt)}</div><div class="v">${dinero(k.ventas, m)}</div></div>
            <div style="padding-bottom:8px">${num(a.ventas) ? delta(k.ventas, a.ventas, `${vsTxt} (${dinero(a.ventas, m)})`)
              : `<span class="iv-delta igual">Sin ventas en el periodo anterior <small>(${esc(vsTxt.replace(/^vs /, ''))})</small></span>`}</div>
          </div>
          <div class="iv-kpis">
            <div class="iv-kpi"><span>Pedidos</span><b>${entero(k.pedidos)}</b>${delta(k.pedidos, a.pedidos, vsTxt)}</div>
            <div class="iv-kpi"><span>Ticket medio por pedido</span><b>${dinero(ticket, m)}</b>${delta(ticket, ticketAnt, vsTxt)}</div>
            <div class="iv-kpi"><span>Productos vendidos</span><b>${entero(k.unidades)}</b>${delta(k.unidades, a.unidades, vsTxt)}</div>
            <div class="iv-kpi"><span>Mesas con consumo</span><b>${entero(k.mesas)}</b></div>
            ${c ? `<div class="iv-kpi"><span>Cobrado (${plural(c.tickets, 'ticket', 'tickets')})</span><b>${dinero(c.facturado, m)}</b>${delta(c.facturado, c.anterior_facturado, vsTxt)}</div>
                   <div class="iv-kpi"><span>Ticket medio por cuenta</span><b>${dinero(num(c.tickets) ? num(c.facturado) / num(c.tickets) : 0, m)}</b></div>` : ''}
          </div>
        </section>

        <section class="iv-card ${p.dias > 1 ? 'm8' : ''}">
          <h3>Ventas por hora</h3>
          <p class="iv-sub">${pico && pico.valor ? `Hora punta: <b>${esc(pico.tip.split(' · ')[0])}</b> con ${dinero(pico.valor, m)}` : 'Sin ventas en este periodo.'}</p>
          ${columnas(horas, { titulo: 'Ventas por hora', fmt: (v) => dinero(v, m) })}
        </section>

        ${p.dias > 1 ? `<section class="iv-card m4">
          <h3>Por día de la semana</h3>
          <p class="iv-sub">${(() => { const b = serieDow.reduce((x, y) => (y.valor > x.valor ? y : x)); return b.valor ? `El mejor: <b>${esc(b.tip.split(' · ')[0])}</b>` : '—'; })()}</p>
          ${columnas(serieDow, { titulo: 'Ventas por día de la semana', fmt: (v) => dinero(v, m) })}
        </section>
        <section class="iv-card">
          <h3>Ventas por ${porMes ? 'mes' : 'día'}</h3>
          <p class="iv-sub">${mejorDia && mejorDia.valor ? `Mejor ${porMes ? 'mes' : 'día'}: <b>${esc(porMes ? mejorDia.fecha : fCorta(mejorDia.fecha))}</b> con ${dinero(mejorDia.valor, m)}` : ''}</p>
          ${columnas(serieDias, { titulo: `Ventas por ${porMes ? 'mes' : 'día'}`, fmt: (v) => dinero(v, m) })}
        </section>` : ''}

        <section class="iv-card m8">
          <h3>Lo más vendido</h3>
          <p class="iv-sub">${entero((d.productos || []).length)} productos distintos · busca cualquiera para ver cuánto has vendido.</p>
          <div class="iv-prod-tools">
            <input type="search" data-iv-q placeholder="Buscar producto o categoría (ej.: croquetas)" value="${esc(est.q)}" aria-label="Buscar producto">
            <div class="iv-seg" role="group" aria-label="Ordenar por">
              <button type="button" data-iv-orden="importe" aria-pressed="${est.orden === 'importe'}">€ Importe</button>
              <button type="button" data-iv-orden="unidades" aria-pressed="${est.orden === 'unidades'}">Unidades</button>
            </div>
          </div>
          <div data-iv-productos></div>
        </section>

        <section class="iv-card m4">
          <h3>Por categoría</h3>
          <p class="iv-sub">Peso de cada sección de la carta en las ventas.</p>
          ${cats.length ? `<table class="iv-tabla"><tbody>${cats.map((x) => `
            <tr><td>${esc(x.nombre)}<span class="iv-hbar" style="width:${(num(x.importe) / maxCat) * 100}%"></span></td>
            <td class="n">${dinero(x.importe, m)}<small>${Math.round((num(x.importe) / totalVentas) * 100)} %</small></td></tr>`).join('')}</tbody></table>`
          : '<div class="iv-vacio">Sin ventas.</div>'}
        </section>

        ${c ? `<section class="iv-card m6">
          <h3>Cobros</h3>
          <p class="iv-sub">${plural(c.tickets, 'ticket', 'tickets')}${num(c.facturas) ? ` (${entero(c.facturas)} con factura)` : ''}${c.primero ? ` · del ${esc(c.primero)} al ${esc(c.ultimo)}` : ''}</p>
          ${formas.length ? `<table class="iv-tabla"><tbody>${formas.map(([f, v]) => `
            <tr><td>${esc(FORMAS[f] || f)}<span class="iv-hbar" style="width:${(num(v) / maxForma) * 100}%"></span></td><td class="n">${dinero(v, m)}</td></tr>`).join('')}
            <tr><td>Propinas <small>no entran en la factura</small></td><td class="n">${dinero(c.propinas, m)}</td></tr></tbody></table>`
          : '<div class="iv-vacio">Sin cobros en este periodo.</div>'}
        </section>
        <section class="iv-card m6">
          <h3>IVA repercutido</h3>
          <p class="iv-sub">Lo que va al modelo 303 (ventas). Base + IVA = total cobrado.</p>
          ${(c.iva || []).length ? `<table class="iv-tabla"><thead><tr><th>Tipo</th><th class="n">Base</th><th class="n">IVA</th><th class="n">Total</th></tr></thead><tbody>
            ${c.iva.map((x) => `<tr><td>${num(x.iva)} %</td><td class="n">${dinero(x.base, m)}</td><td class="n">${dinero(x.cuota, m)}</td><td class="n">${dinero(x.total, m)}</td></tr>`).join('')}
            <tr><td><b>Total</b></td><td class="n"><b>${dinero(c.base, m)}</b></td><td class="n"><b>${dinero(c.cuota, m)}</b></td><td class="n"><b>${dinero(c.facturado, m)}</b></td></tr></tbody></table>`
          : '<div class="iv-vacio">Sin tickets en este periodo.</div>'}
        </section>` : ''}

        <section class="iv-card m6">
          <h3>Servicio</h3>
          <p class="iv-sub">Tiempos medidos desde que entra el pedido${num(k.pedidos) && k.min_preparacion == null ? '. Se calculan cuando cocina marca los pedidos como "¡Listo!" y "Servido"' : ''}.</p>
          <div class="iv-kpis" style="margin-top:0">
            <div class="iv-kpi"><span>Cocina (hasta "listo")</span><b>${minutos(k.min_preparacion)}</b></div>
            <div class="iv-kpi"><span>Hasta servir</span><b>${minutos(k.min_servicio)}</b></div>
            <div class="iv-kpi"><span>Respuesta a avisos</span><b>${minutos(k.min_respuesta)}</b></div>
            <div class="iv-kpi"><span>Llamadas al camarero</span><b>${entero(k.avisos_camarero)}</b></div>
            <div class="iv-kpi"><span>Cuentas pedidas</span><b>${entero(k.avisos_cuenta)}</b></div>
            <div class="iv-kpi"><span>Pedidos cancelados</span><b>${entero(k.cancelados)}</b>${num(k.cancelados) ? `<span>${dinero(k.cancelado_importe, m)}</span>` : ''}</div>
          </div>
          <p class="iv-sub" style="margin:10px 0 0">Primer pedido: <b>${esc(horaDe(k.primer_pedido))}</b> · último: <b>${esc(horaDe(k.ultimo_pedido))}</b></p>
        </section>

        <section class="iv-card m6">
          <h3>Mesas</h3>
          <p class="iv-sub">Qué mesas han generado más.</p>
          ${(d.mesas || []).length ? `<table class="iv-tabla"><thead><tr><th>Mesa</th><th class="n">Pedidos</th><th class="n">Ventas</th><th class="n">Medio</th></tr></thead><tbody>
            ${d.mesas.slice(0, 15).map((x) => `<tr><td>${esc(x.nombre)}</td><td class="n">${entero(x.pedidos)}</td><td class="n">${dinero(x.ventas, m)}</td><td class="n">${dinero(num(x.ventas) / Math.max(1, num(x.pedidos)), m)}</td></tr>`).join('')}
          </tbody></table>` : '<div class="iv-vacio">Sin ventas.</div>'}
        </section>

        <section class="iv-card">
          <h3>Sin ventas en este periodo</h3>
          <p class="iv-sub">Platos de la carta que nadie ha pedido: candidatos a cambiar, destacar o quitar.</p>
          ${(d.sin_ventas || []).length ? `<div class="iv-chips">${d.sin_ventas.slice(0, 80).map((x) => `<span>${esc(x.nombre)}${x.disponible ? '' : ' · agotado'}</span>`).join('')}${d.sin_ventas.length > 80 ? `<span>y ${d.sin_ventas.length - 80} más</span>` : ''}</div>`
          : '<div class="iv-vacio">¡Todo lo de la carta se ha vendido al menos una vez!</div>'}
        </section>`;
      pintarProductos();
    }

    function pintarProductos() {
      const d = est.data, m = opts.moneda();
      const caja = $q('[data-iv-productos]');
      if (!caja) return;
      const total = num(d.kpis.ventas) || 1;
      let lista = (d.productos || []).slice();
      const q = est.q.toLowerCase();
      if (q) lista = lista.filter((x) => (x.nombre + ' ' + x.categoria).toLowerCase().includes(q));
      lista.sort((x, y) => num(y[est.orden]) - num(x[est.orden]) || num(y.importe) - num(x.importe));
      const max = Math.max(1, ...lista.map((x) => num(x[est.orden])));
      const ver = est.todos || q ? lista : lista.slice(0, TOP);
      const pos = new Map((d.productos || []).slice().sort((x, y) => num(y[est.orden]) - num(x[est.orden])).map((x, i) => [x, i + 1]));
      caja.innerHTML = ver.length ? `
        <table class="iv-tabla"><thead><tr><th class="pos">#</th><th>Producto</th><th class="n">Uds</th><th class="n">Importe</th></tr></thead><tbody>
          ${ver.map((x) => `<tr><td class="pos">${pos.get(x)}</td>
            <td>${esc(x.nombre)}<small>${esc(x.categoria)} · ${plural(x.pedidos, 'pedido', 'pedidos')}</small><span class="iv-hbar" style="width:${(num(x[est.orden]) / max) * 100}%"></span></td>
            <td class="n">${entero(x.unidades)}</td>
            <td class="n">${dinero(x.importe, m)}<small>${(num(x.importe) / total * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %</small></td></tr>`).join('')}
        </tbody></table>
        ${!q && lista.length > TOP ? `<button class="btn sm iv-mas" type="button" data-iv-todos>${est.todos ? 'Ver solo los 10 primeros' : `Ver los ${lista.length}`}</button>` : ''}`
        : `<div class="iv-vacio">${q ? 'Ningún producto vendido coincide con la búsqueda.' : 'Sin ventas en este periodo.'}</div>`;
    }

    // --------------------------------------------------------- cierre Z ----
    function htmlZ() {
      const d = est.data, m = opts.moneda(), k = d.kpis, p = d.periodo, c = d.cobros;
      const r = (a, b) => `<div class="r"><span>${a}</span><span>${b}</span></div>`;
      const unDia = p.dias === 1;
      return `<h1>${esc(d.restaurante)}</h1>
        <h2>${unDia ? 'CIERRE Z' : 'INFORME DE VENTAS'}<br>${unDia ? fCorta(p.desde) : `${fCorta(p.desde)} – ${fCorta(p.hasta)}`}</h2>
        <div style="font-size:11px">Impreso ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}</div><hr>
        ${r('Ventas (IVA incl.)', dinero(k.ventas, m))}${r('Pedidos', entero(k.pedidos))}
        ${r('Ticket medio', dinero(num(k.pedidos) ? num(k.ventas) / num(k.pedidos) : 0, m))}${r('Productos', entero(k.unidades))}
        ${r('Mesas', entero(k.mesas))}${r('Cancelados', `${entero(k.cancelados)} · ${dinero(k.cancelado_importe, m)}`)}
        ${c ? `<hr><b>COBROS</b>${r('Tickets', entero(c.tickets))}${c.primero ? r('Del', esc(c.primero)) + r('Al', esc(c.ultimo)) : ''}
          ${Object.entries(c.por_forma || {}).map(([f, v]) => r(esc(FORMAS[f] || f), dinero(v, m))).join('')}
          ${r('Propinas', dinero(c.propinas, m))}${r('<b>Total cobrado</b>', `<b>${dinero(num(c.facturado) + num(c.propinas), m)}</b>`)}
          <hr><b>IVA</b>${(c.iva || []).map((x) => r(`${num(x.iva)} % base ${dec(x.base)}`, `cuota ${dec(x.cuota)}`)).join('')}
          ${r('Base total', dinero(c.base, m))}${r('IVA total', dinero(c.cuota, m))}` : ''}
        <hr><b>CATEGORÍAS</b>${(d.categorias || []).map((x) => r(esc(x.nombre), dinero(x.importe, m))).join('')}
        <hr><b>LO MÁS VENDIDO</b>${(d.productos || []).slice(0, 15).map((x) => r(`${entero(x.unidades)} × ${esc(x.nombre)}`, dec(x.importe))).join('')}
        <hr>${r('Primer pedido', esc(horaDe(k.primer_pedido)))}${r('Último pedido', esc(horaDe(k.ultimo_pedido)))}
        ${k.min_preparacion != null ? r('Cocina (media)', minutos(k.min_preparacion)) : ''}`;
    }
    const CSS_Z = `@page{size:80mm auto;margin:0}
      body{font:13px/1.35 ui-monospace,Menlo,Consolas,monospace;width:72mm;margin:0;padding:4mm;color:#000}
      h1{font-size:18px;margin:0;text-align:center}h2{font-size:14px;margin:4px 0 6px;text-align:center}
      .r{display:flex;justify-content:space-between;gap:6px}hr{border:0;border-top:1px dashed #000;margin:6px 0}`;
    function imprimirZ() {
      if (!est.data) return;
      const doc = `<!doctype html><html><head><meta charset="utf-8"><title>Cierre</title><style>${CSS_Z}</style></head><body>${htmlZ()}</body></html>`;
      if (window.matchMedia('(max-width: 760px)').matches) {
        // Móvil: ventana propia (imprimir un iframe oculto no es fiable en iPhone/Android).
        const w = window.open('', '_blank');
        if (!w) { toast('Permite las ventanas emergentes para imprimir.', 'error'); return; }
        w.document.write(doc); w.document.close();
        setTimeout(() => { w.focus(); w.print(); }, 300);
        return;
      }
      let f = document.getElementById('iv-print');
      if (!f) {
        f = document.createElement('iframe'); f.id = 'iv-print'; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
        f.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
        document.body.appendChild(f);
      }
      f.contentDocument.open(); f.contentDocument.write(doc); f.contentDocument.close();
      setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); }, 50);
    }

    // ------------------------------------------------------------ Excel ----
    function descargar() {
      const d = est.data;
      if (!d) return;
      const k = d.kpis, p = d.periodo, c = d.cobros, L = [];
      const fila = (...xs) => L.push(xs.join(';'));
      fila(celda('Informe de ventas', true), celda(d.restaurante, true), celda(`${fCorta(p.desde)} - ${fCorta(p.hasta)}`, true));
      L.push('');
      fila(celda('Resumen', true));
      [['Ventas (IVA incl.)', dec(k.ventas)], ['Pedidos', k.pedidos], ['Ticket medio', dec(num(k.pedidos) ? num(k.ventas) / num(k.pedidos) : 0)],
        ['Productos vendidos', k.unidades], ['Mesas con consumo', k.mesas], ['Pedidos cancelados', k.cancelados], ['Importe cancelado', dec(k.cancelado_importe)],
        ['Ventas periodo anterior', dec(d.anterior.ventas)]].forEach(([a, b]) => fila(celda(a, true), b));
      if (c) {
        [['Tickets', c.tickets], ['Cobrado (facturado)', dec(c.facturado)], ['Base imponible', dec(c.base)], ['IVA', dec(c.cuota)], ['Propinas', dec(c.propinas)]]
          .forEach(([a, b]) => fila(celda(a, true), b));
        Object.entries(c.por_forma || {}).forEach(([f, v]) => fila(celda('Cobrado ' + (FORMAS[f] || f).toLowerCase(), true), dec(v)));
      }
      L.push('');
      fila(...['Producto', 'Categoría', 'Unidades', 'Importe', '% ventas', 'Pedidos'].map((x) => celda(x, true)));
      (d.productos || []).forEach((x) => fila(celda(x.nombre, true), celda(x.categoria, true), x.unidades, dec(x.importe),
        dec((num(x.importe) / (num(k.ventas) || 1)) * 100), x.pedidos));
      L.push('');
      fila(...['Categoría', 'Unidades', 'Importe'].map((x) => celda(x, true)));
      (d.categorias || []).forEach((x) => fila(celda(x.nombre, true), x.unidades, dec(x.importe)));
      L.push('');
      fila(...['Fecha', 'Pedidos', 'Ventas'].map((x) => celda(x, true)));
      (d.por_dia || []).forEach((x) => fila(fCorta(x.fecha), x.pedidos, dec(x.ventas)));
      L.push('');
      fila(...['Hora', 'Pedidos', 'Ventas'].map((x) => celda(x, true)));
      (d.por_hora || []).forEach((x) => fila(`${String(x.h).padStart(2, '0')}:00`, x.pedidos, dec(x.ventas)));
      L.push('');
      fila(...['Mesa', 'Pedidos', 'Ventas'].map((x) => celda(x, true)));
      (d.mesas || []).forEach((x) => fila(celda(x.nombre, true), x.pedidos, dec(x.ventas)));
      const blob = new Blob(['﻿' + L.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `informe_${opts.sesion().slug}_${p.desde}_${p.hasta}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    // ---------------------------------------------------------- eventos ----
    function ponerRango(nombre) {
      est.rango = nombre;
      [est.desde, est.hasta] = rango(nombre, hoyLocal());
      $q('[data-iv-f="desde"]').value = est.desde;
      $q('[data-iv-f="hasta"]').value = est.hasta;
      raiz.querySelectorAll('[data-iv-rango]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ivRango === nombre)));
      cargar();
    }
    raiz.addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b || !raiz.contains(b)) return;
      if (b.dataset.ivRango) ponerRango(b.dataset.ivRango);
      else if (b.dataset.ivOrden) {
        est.orden = b.dataset.ivOrden;
        raiz.querySelectorAll('[data-iv-orden]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        pintarProductos();
      } else if (b.hasAttribute('data-iv-todos')) { est.todos = !est.todos; pintarProductos(); }
      else if (b.hasAttribute('data-iv-z')) imprimirZ();
      else if (b.hasAttribute('data-iv-csv')) descargar();
    });
    raiz.addEventListener('input', (ev) => {
      if (ev.target.hasAttribute('data-iv-q')) { est.q = ev.target.value.trim(); pintarProductos(); }
    });
    raiz.addEventListener('change', (ev) => {
      const k = ev.target.dataset && ev.target.dataset.ivF;
      if (!k) return;
      est[k] = ev.target.value;
      if (est.desde && est.hasta && est.hasta < est.desde) { toast('"Hasta" no puede ser antes que "Desde".', 'error'); return; }
      est.rango = '';
      raiz.querySelectorAll('[data-iv-rango]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      cargar();
    });
    // Tooltip de las columnas (ratón y teclado). El texto va por textContent.
    function mostrarTip(col) {
      const t = col.dataset.tip.split(' · ');
      tip.textContent = '';
      const b = document.createElement('b'); b.textContent = t[1] || '';
      tip.append(b, document.createTextNode([t[0], t[2]].filter(Boolean).join(' · ')));
      tip.hidden = false;
      const rc = col.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.min(window.innerWidth - tw - 8, Math.max(8, rc.left + rc.width / 2 - tw / 2)) + 'px';
      tip.style.top = Math.max(8, rc.top - th - 8) + 'px';
    }
    raiz.addEventListener('pointerover', (ev) => { const col = ev.target.closest('.iv-col'); if (col) mostrarTip(col); });
    raiz.addEventListener('pointerout', (ev) => { if (ev.target.closest('.iv-col')) tip.hidden = true; });
    raiz.addEventListener('focusin', (ev) => { const col = ev.target.closest('.iv-col'); if (col) mostrarTip(col); });
    raiz.addEventListener('focusout', () => { tip.hidden = true; });
    window.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

    cargar();
    return { recargar: () => (est.rango ? ponerRango(est.rango) : cargar()) };
  }

  window.CartaInformes = { montar };
})();
