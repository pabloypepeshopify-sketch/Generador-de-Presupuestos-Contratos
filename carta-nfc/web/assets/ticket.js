// Ticket / factura: HTML común para pantalla, impresora térmica (72 mm) y ticket digital.
// Requiere assets/vendor/qrcode.js para el QR tributario.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (n) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));
  const FORMAS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', bizum: 'Bizum', otro: 'Otro' };
  const TITULOS = { F1: 'FACTURA', F2: 'FACTURA SIMPLIFICADA', F3: 'FACTURA (sustituye a simplificadas)',
    R1: 'FACTURA RECTIFICATIVA', R4: 'FACTURA RECTIFICATIVA', R5: 'FACTURA SIMPLIFICADA RECTIFICATIVA' };
  const fechaCorta = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

  function qrSvg(texto, celda) {
    if (!window.qrcode) return '';
    const q = window.qrcode(0, 'M');
    q.addData(texto);
    q.make();
    return q.createSvgTag({ cellSize: celda || 3, margin: 0, scalable: true });
  }

  function html(d) {
    const e = d.emisor || {};
    const fecha = new Date(d.expedido).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
    const dom = [e.domicilio, [e.codigo_postal, e.municipio].filter(Boolean).join(' '), e.provincia].filter(Boolean).join(', ');
    return `<div class="tk">
      <div class="tk-c"><div class="tk-nom">${esc(e.nombre_comercial || e.razon_social)}</div>
        ${e.nombre_comercial ? `<div>${esc(e.razon_social)}</div>` : ''}
        <div>NIF ${esc(e.nif)}</div><div>${esc(dom)}</div></div>
      <hr>
      <div class="tk-c tk-b">${esc(TITULOS[d.tipo] || d.tipo)}</div>
      <div class="tk-r"><span>Nº ${esc(d.num_serie)}</span><span>${esc(fecha)}</span></div>
      ${d.mesa ? `<div>${esc(d.mesa)}</div>` : ''}
      ${d.rectifica ? `<div>Rectifica a: ${esc(d.rectifica.num_serie)} (${esc(fechaCorta(d.rectifica.fecha_expedicion))})</div>` : ''}
      ${(d.sustituye || []).map((x) => `<div>Sustituye a: ${esc(x.num_serie)} (${esc(fechaCorta(x.fecha_expedicion))})</div>`).join('')}
      ${d.fecha_operacion ? `<div>Fecha de la operación: ${esc(fechaCorta(d.fecha_operacion))}</div>` : ''}
      ${d.motivo ? `<div>Motivo: ${esc(d.motivo)}</div>` : ''}
      ${d.parcial && !String(d.tipo).startsWith('R') ? '<div class="tk-s">Cuenta separada (pago por partes)</div>' : ''}
      ${d.cliente ? `<hr><div class="tk-b">Cliente</div><div>${esc(d.cliente.nombre)}</div>
        <div>NIF ${esc(d.cliente.nif)}</div><div>${esc(d.cliente.domicilio)}</div>` : ''}
      <hr>
      ${(d.lineas || []).map((l) => `<div class="tk-r"><span>${esc(l.cantidad)} x ${esc(l.nombre)}</span><span>${num(l.importe)}</span></div>
        ${l.cantidad > 1 ? `<div class="tk-s">&nbsp;&nbsp;${num(l.precio)} c/u</div>` : ''}`).join('')}
      <hr>
      <div class="tk-r tk-t"><span>TOTAL</span><span>${num(d.total)} €</span></div>
      <div class="tk-c tk-s">IVA incluido</div>
      <table class="tk-iva"><tr><th>IVA</th><th>Base</th><th>Cuota</th><th>Total</th></tr>
        ${(d.desglose || []).map((x) => `<tr><td>${num(x.iva).replace(',00', '')} %</td><td>${num(x.base)}</td><td>${num(x.cuota)}</td><td>${num(x.total)}</td></tr>`).join('')}
      </table>
      <hr>
      ${(d.pagos || []).map((p) => `<div class="tk-r"><span>${Number(p.importe) < 0 ? 'Devolución · ' : ''}${esc(FORMAS[p.forma] || p.forma)}</span><span>${num(p.importe)}</span></div>
        ${p.entregado != null ? `<div class="tk-r tk-s"><span>&nbsp;&nbsp;Entregado ${num(p.entregado)}</span><span>Cambio ${num(p.cambio)}</span></div>` : ''}`).join('')}
      ${Number(d.propina) > 0 ? `<div class="tk-r tk-s"><span>Propina (no incluida en la factura)</span><span>${num(d.propina)}</span></div>` : ''}
      ${d.sif && d.sif.qr_url ? `<div class="tk-c tk-s" style="margin-top:8px">QR tributario:</div>
        <div class="tk-qr">${qrSvg(d.sif.qr_url)}</div>
        ${d.sif.leyenda ? `<div class="tk-c tk-b">${esc(d.sif.leyenda)}</div>` : ''}` : ''}
      ${d.sif && d.sif.entorno === 'pruebas' ? '<div class="tk-c tk-aviso">ENTORNO DE PRUEBAS · SIN VALIDEZ FISCAL</div>' : ''}
      ${d.estado && d.estado !== 'emitido' ? `<div class="tk-c tk-aviso">${esc(d.estado.toUpperCase())}${d.sustituido_por
        ? ` POR LA FACTURA ${esc(d.sustituido_por.num_serie)}` : ''}</div>` : ''}
      ${d.pie ? `<div class="tk-c" style="margin-top:8px">${esc(d.pie)}</div>` : ''}
    </div>`;
  }

  const css = `
    .tk{font:12.5px/1.35 ui-monospace,"SF Mono",Menlo,Consolas,monospace;color:#000;background:#fff}
    .tk hr{border:0;border-top:1px dashed #000;margin:7px 0}
    .tk-c{text-align:center}.tk-b{font-weight:700}.tk-nom{font-size:16px;font-weight:700}
    .tk-r{display:flex;justify-content:space-between;gap:8px}
    .tk-r span:first-child{min-width:0;overflow-wrap:anywhere}
    .tk-t{font-size:17px;font-weight:700;margin-top:2px}
    .tk-s{font-size:11px}
    .tk-iva{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}
    .tk-iva th,.tk-iva td{text-align:right;padding:1px 0}.tk-iva th:first-child,.tk-iva td:first-child{text-align:left}
    .tk-qr{display:flex;justify-content:center;margin:4px 0}
    .tk-qr svg{width:35mm;height:35mm}
    .tk-aviso{margin-top:6px;font-weight:700;border:1px solid #000;padding:3px}`;

  window.CartaTicket = { html, css, qrSvg };
})();
