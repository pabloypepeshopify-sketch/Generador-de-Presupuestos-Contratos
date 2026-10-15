// Mis clientes y cobros: cuota mensual de cada bar (carta_cuotas) + activar/desactivar (carta_plataforma).
(function () {
  const { rpc, esc, dinero, toast } = window.Carta;
  const $ = (id) => document.getElementById(id);
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const FORMAS = { bizum: 'Bizum', transferencia: 'Transferencia', efectivo: 'Efectivo', tarjeta: 'Tarjeta', otro: 'Otro' };
  let clave = null, datos = null, filtro = 'todos';
  try { clave = sessionStorage.getItem('carta:plataforma'); } catch { /* */ }

  const fecha = (s) => { if (!s) return '—'; const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return `${d} ${MESES[m - 1]} ${y}`; };
  const mes = (s) => { const [y, m] = String(s).split('-').map(Number); return `${MESES[m - 1]} ${y}`; };

  async function llamar(fn, accion, d) {
    try {
      const r = await rpc(fn, { p_clave: clave, p_accion: accion, p_datos: d || {} });
      try { sessionStorage.setItem('carta:plataforma', clave); } catch { /* */ }
      $('f-login').hidden = true; $('zona').hidden = false;
      return r;
    } catch (e) {
      if (e.code === 'clave_incorrecta') { $('f-login').hidden = false; $('zona').hidden = true; try { sessionStorage.removeItem('carta:plataforma'); } catch { /* */ } }
      const M = { nada_pendiente: 'No tiene meses pendientes.', nada_que_deshacer: 'No hay pagos que quitar.',
        importe_no_valido: 'Cuota no válida (ej.: 29 o 29,50).', fecha_no_valida: 'Fecha no válida.' };
      toast(M[e.code] || e.humano || e.code, 'error');
      return null;
    }
  }
  async function cargar(accion, d) {
    const r = await llamar('carta_cuotas', accion || 'listar', d);
    if (r) { datos = r; pintar(); }
    return r;
  }

  function estado(c) {
    const q = c.cuota;
    if (!c.activo) return ['neutro', 'Desactivado' + (q.debe > 0 ? ` · debe ${dinero(q.debe)}` : '')];
    if (q.sin_cuota) return ['neutro', 'Sin cuota'];
    if (q.al_dia) return ['ok', 'Al día'];
    const n = q.pendientes.length;
    return ['ko', `Debe ${dinero(q.debe)} · ${n} ${n === 1 ? 'mes' : 'meses'} · ${q.dias_retraso ? q.dias_retraso + (q.dias_retraso === 1 ? ' día' : ' días') : 'vence hoy'}`];
  }

  function pintar() {
    const lista = datos.clientes;
    const hoy = datos.hoy, mesHoy = hoy.slice(0, 7);
    const activos = lista.filter((c) => c.activo);
    $('n-activos').textContent = activos.length;
    $('n-mensual').textContent = dinero(activos.filter((c) => !c.cuota.sin_cuota).reduce((s, c) => s + Number(c.cuota.importe), 0));
    $('n-debe').textContent = dinero(lista.reduce((s, c) => s + Number(c.cuota.debe), 0));
    $('n-mes').textContent = dinero(lista.reduce((s, c) => s + c.pagos.filter((p) => String(p.pagado_el).slice(0, 7) === mesHoy).reduce((t, p) => t + Number(p.importe), 0), 0));

    const ver = lista.filter((c) => filtro === 'todos' || (filtro === 'deben' && c.activo && !c.cuota.al_dia) ||
      (filtro === 'aldia' && c.activo && c.cuota.al_dia) || (filtro === 'off' && !c.activo));
    // primero los que deben (más retraso arriba), luego el resto por fecha de alta
    ver.sort((a, b) => (b.cuota.dias_retraso || 0) - (a.cuota.dias_retraso || 0) || String(a.alta).localeCompare(String(b.alta)));
    $('lista').innerHTML = ver.length ? ver.map((c) => {
      const q = c.cuota, [cls, txt] = estado(c);
      const debe = c.activo && !q.al_dia && !q.sin_cuota;
      return `<article class="card cli${debe ? ' debe' : ''}${c.activo ? '' : ' off'}" data-slug="${esc(c.slug)}">
        <div class="cab"><h3>${esc(c.nombre)} <span class="small muted">${esc(c.slug)}</span></h3><span class="estado ${cls}">${esc(txt)}</span></div>
        <div class="datos">
          <div><span>Alta</span>${esc(fecha(c.alta))}</div>
          <div><span>Cuota</span>${q.sin_cuota ? 'Sin cuota' : esc(dinero(q.importe)) + ' / mes'}</div>
          <div><span>Próximo cobro</span>${q.proximo ? esc(fecha(q.proximo)) : '—'}</div>
          <div><span>Último pago</span>${q.ultimo_pago ? `${esc(mes(q.ultimo_pago.periodo))} (${esc(fecha(q.ultimo_pago.pagado_el))})` : '—'}</div>
          <div><span>Pedidos 30 días</span>${esc(c.pedidos_30d)}</div>
        </div>
        ${q.notas ? `<p class="nota">📝 ${esc(q.notas)}</p>` : ''}
        <div class="acc">
          ${debe ? `<select data-forma aria-label="Forma de pago">${Object.entries(FORMAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
            <button class="btn sm primary" data-pagar="${esc(c.slug)}">✓ Pagado ${esc(mes(q.pendientes[0]))}</button>` : ''}
          ${c.pagos.length ? `<button class="btn sm ghost" data-deshacer="${esc(c.slug)}">Deshacer último pago</button>` : ''}
          ${c.activo
            ? `<button class="btn sm danger" data-activo="${esc(c.slug)}" data-valor="false">Desactivar${debe ? ' por impago' : ''}</button>`
            : `<button class="btn sm" data-activo="${esc(c.slug)}" data-valor="true">Activar</button>`}
        </div>
        ${c.pagos.length ? `<p class="pagos">Pagados: ${c.pagos.map((p) => esc(mes(p.periodo)) + (p.forma ? ` (${esc(FORMAS[p.forma] || p.forma)})` : '')).join(' · ')}</p>` : ''}
        <details><summary>Editar cuota</summary>
          <form class="editar" data-editar="${esc(c.slug)}">
            <label class="field"><span>Cuota €/mes</span><input name="importe" inputmode="decimal" value="${esc(String(q.importe).replace('.', ','))}" required></label>
            <label class="field"><span>Primer cobro</span><input name="inicio" type="date" value="${esc(q.inicio)}" required></label>
            <label class="field" style="flex-basis:100%"><span>Notas (cómo paga, contacto…)</span><input name="notas" maxlength="500" value="${esc(q.notas || '')}"></label>
            <label class="small"><input type="checkbox" name="sin_cuota"${q.sin_cuota ? ' checked' : ''}> Sin cuota (demo, pruebas…)</label>
            <button class="btn sm primary" type="submit">Guardar</button>
          </form>
        </details>
      </article>`;
    }).join('') : '<p class="muted">Nada que mostrar con este filtro.</p>';
  }

  $('f-login').addEventListener('submit', (ev) => { ev.preventDefault(); clave = $('clave').value; cargar(); });
  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.filtro) {
      filtro = b.dataset.filtro;
      document.querySelectorAll('[data-filtro]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      pintar();
    } else if (b.dataset.pagar) {
      const forma = b.closest('.acc').querySelector('[data-forma]').value;
      b.disabled = true;
      if (await cargar('pagar', { slug: b.dataset.pagar, forma })) toast('Pago apuntado');
    } else if (b.dataset.deshacer) {
      if (!confirm('¿Quitar el último pago apuntado de ' + b.dataset.deshacer + '?')) return;
      if (await cargar('deshacer', { slug: b.dataset.deshacer })) toast('Pago quitado');
    } else if (b.dataset.activo) {
      const activar = b.dataset.valor === 'true';
      if (!activar && !confirm('¿Desactivar ' + b.dataset.activo + '? Su carta, sus NFC y sus pedidos dejan de funcionar hasta que lo actives.')) return;
      if (await llamar('carta_plataforma', 'activo', { slug: b.dataset.activo, activo: activar })) {
        await cargar(); toast(activar ? 'Activado' : 'Desactivado');
      }
    }
  });
  document.addEventListener('submit', async (ev) => {
    const f = ev.target.closest('[data-editar]'); if (!f) return;
    ev.preventDefault();
    const d = { slug: f.dataset.editar, importe: f.importe.value.trim(), inicio: f.inicio.value, notas: f.notas.value, sin_cuota: f.sin_cuota.checked };
    if (await cargar('fijar', d)) toast('Guardado');
  });

  if (clave) cargar(); else $('f-login').hidden = false;
})();
