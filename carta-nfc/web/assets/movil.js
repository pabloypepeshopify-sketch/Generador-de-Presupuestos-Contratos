// Modo "móvil junto al TPV" (pack Solo pedidos): un móvil fijo con cargador al lado del TPV del bar.
// Enseña solo lo nuevo en letra grande; el camarero lo apunta en su TPV y toca "Apuntado".
// Mismas RPC que el panel de comandas (carta_cocina): no cambia nada del servidor.
//   Apuntado  → estado "preparando" (el cliente ve "En preparación")
//   Atendido  → aviso de camarero/cuenta a "servido" (igual que el panel)
(function () {
  const { rpc, esc, dinero, store } = window.Carta;
  const $ = (id) => document.getElementById(id);
  const K_SESION = 'carta:movil', K_REPETIR = 'carta:movil:repetir';
  const POLL_MS = 3000, REPETIR_MS = 20000;

  let sesion = null, datos = null, timer = null, fallos = 0, offline = false;
  let audio = null, wakeLock = null, repetirT = null;
  let vistos = null;                 // ids ya notificados (null = primera carga)
  const recien = new Set();          // ids llegados en esta sesión (resaltados)
  const quitados = new Set();        // apuntados/atendidos aquí, a la espera de que el servidor lo confirme
  const hechos = [];                 // últimos apuntados en este móvil (para deshacer)
  let repetir = store.get(K_REPETIR, true);

  // ── sesión
  function iniciar() {
    const qs = new URLSearchParams(location.search);
    if (qs.get('r') && qs.get('k')) {
      sesion = { slug: qs.get('r').toLowerCase(), clave: qs.get('k') };
      history.replaceState(null, '', location.pathname); // la clave no se queda a la vista
    } else sesion = store.get(K_SESION, null) || store.get('carta:cocina', null);
    if (!sesion) return login();
    entrar();
  }
  function login(msg) {
    $('app').hidden = true; $('activar').hidden = true; $('login').hidden = false;
    $('login-error').textContent = msg || '';
    if (sesion) $('login-slug').value = sesion.slug;
  }
  async function entrar() {
    try {
      datos = await llamar('listar');
    } catch (e) {
      if (e.code === 'clave_incorrecta' || e.code === 'restaurante_no_encontrado') { store.del(K_SESION); return login('Bar o clave incorrectos.'); }
      return login(e.humano || 'No hay conexión. Revisa el WiFi y vuelve a intentarlo.');
    }
    store.set(K_SESION, sesion);
    $('login').hidden = true; $('app').hidden = false;
    $('c-repetir').checked = repetir;
    pintar();
    pedirActivacion();
    clearInterval(timer); timer = setInterval(sondear, POLL_MS);
    clearInterval(repetirT); repetirT = setInterval(recordar, REPETIR_MS);
    reloj(); setInterval(reloj, 15000);
  }
  const llamar = (accion, datosAcc) => rpc('carta_cocina', { p_slug: sesion.slug, p_clave: sesion.clave, p_accion: accion, p_datos: datosAcc || {} });

  // ── sondeo
  async function sondear() {
    try {
      datos = await llamar('listar');
      fallos = 0;
      if (offline) { offline = false; toast('Conexión recuperada'); }
    } catch (e) {
      if (e.code === 'clave_incorrecta') { clearInterval(timer); store.del(K_SESION); return login('La clave ha cambiado. Vuelve a entrar.'); }
      fallos++;
      if (fallos >= 3 && !offline) { offline = true; pitar([330, 262, 330, 262]); }
    }
    pintar();
  }

  // ── pintar
  const nuevos = () => (datos ? datos.pedidos : []).filter((p) => p.estado === 'nuevo' && !quitados.has(p.id));
  function hace(fecha) {
    const s = Math.max(0, Math.round((Date.parse(datos.ahora || new Date()) - Date.parse(fecha)) / 1000));
    if (s < 60) return 'ahora';
    const m = Math.round(s / 60);
    return m < 60 ? `hace ${m} min` : `hace ${Math.floor(m / 60)} h ${m % 60} min`;
  }
  function totalMesa(mesaId) {
    return datos.pedidos.filter((p) => p.tipo === 'pedido' && p.mesa_id === mesaId && p.estado !== 'cancelado')
      .reduce((s, p) => s + Number(p.total || 0), 0);
  }
  function pintar() {
    if (!datos) return;
    const r = datos.restaurante;
    $('m-nombre').textContent = r.nombre;
    document.title = (nuevos().length ? `(${nuevos().length}) ` : '') + 'Pedidos · ' + r.nombre;
    if (/^#[0-9a-f]{6}$/i.test(r.color || '')) document.documentElement.style.setProperty('--marca', r.color);
    $('conn').className = 'conn ' + (offline ? 'mal' : 'bien');
    $('offline').hidden = !offline;
    $('pausado').hidden = r.pedidos_abiertos;
    $('b-pausa').textContent = r.pedidos_abiertos ? '⏸ Pausar' : '▶ Reanudar';
    $('b-pausa').classList.toggle('off', !r.pedidos_abiertos);

    const lista = nuevos();
    const ids = new Set(lista.map((p) => p.id));
    if (vistos) {
      const llegan = lista.filter((p) => !vistos.has(p.id));
      if (llegan.length) avisar(llegan);
    } else if (lista.length) setTimeout(() => avisar(lista), 300); // al abrir ya había cosas sin apuntar
    vistos = new Set([...(vistos || []), ...ids]);
    // los quitados que el servidor ya no da como nuevos se olvidan
    [...quitados].forEach((id) => { if (!datos.pedidos.some((p) => p.id === id && p.estado === 'nuevo')) quitados.delete(id); });

    const avisos = lista.filter((p) => p.tipo !== 'pedido');
    const pedidos = lista.filter((p) => p.tipo === 'pedido');
    let h = avisos.map((a) => {
      const t = a.tipo === 'cuenta' ? totalMesa(a.mesa_id) : 0;
      return `<article class="card aviso"><div class="cab"><span class="mesa">${esc(a.mesa)}</span><span class="cuando">${esc(hace(a.creado))}</span></div>
        <p>${a.tipo === 'cuenta' ? '🧾 Pide la cuenta' + (t ? ` · ${esc(dinero(t, r.moneda))}` : '') : '🙋 Llama al camarero'}</p>
        <div class="pie"><span></span><button class="ok" type="button" data-atender="${esc(a.id)}">✓ Atendido</button></div></article>`;
    }).join('');
    h += pedidos.map((p) => {
      const min = (Date.parse(datos.ahora) - Date.parse(p.creado)) / 60000;
      return `<article class="card${recien.has(p.id) ? ' nuevo' : ''}"><div class="cab"><span class="mesa">${esc(p.mesa)}</span>
        <span class="cuando${min > 5 ? ' tarde' : ''}">Nº ${esc(p.numero)} · ${esc(hace(p.creado))}</span></div>
        <ul>${p.lineas.map((l) => `<li><b>${esc(l.cantidad)}×</b>${esc(l.nombre)}${l.nota ? `<small>→ ${esc(l.nota)}</small>` : ''}</li>`).join('')}</ul>
        ${p.nota ? `<p class="nota">${esc(p.nota)}</p>` : ''}
        <div class="pie"><span class="total">${esc(dinero(p.total, r.moneda))}</span><button class="ok" type="button" data-apuntar="${esc(p.id)}">✓ Apuntado en el TPV</button></div></article>`;
    }).join('');
    $('lista').innerHTML = h || `<div class="vacio"><b>Sin pedidos nuevos</b>${r.pedidos_abiertos ? 'Cuando una mesa pida, sonará y saldrá aquí en grande.' : 'Los pedidos por el móvil están en pausa.'}</div>`;
    pintarHechos();
  }
  function pintarHechos() {
    $('hechos').hidden = !hechos.length;
    $('hechos').innerHTML = '<h2>Últimos apuntados en este móvil</h2>' + hechos.map((x) =>
      `<div class="hecho"><span>${esc(x.texto)} · ${esc(x.hora)}</span><button class="b" type="button" data-deshacer="${esc(x.id)}">Deshacer</button></div>`).join('');
  }
  function reloj() {
    $('reloj').textContent = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    if (datos) pintar();
  }

  // ── sonido, vibración y pantalla
  function sonidoListo() { return !!(audio && audio.state === 'running'); }
  function pintarSonido() {
    const on = sonidoListo();
    $('b-sonido').textContent = on ? '🔔 Sonido' : '🔕 Sonido';
    $('b-sonido').classList.toggle('on', on);
    $('b-sonido').classList.toggle('off', !on);
  }
  function activarAudio() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume().then(pintarSonido, pintarSonido);
    } catch { /* sin audio */ }
    pintarSonido();
  }
  function pedirActivacion() {
    // Tras abrir o reiniciar, el navegador no deja sonar nada hasta que alguien toque la pantalla.
    $('activar').hidden = sonidoListo();
  }
  function pitar(frecs, fuerte = true) {
    if (!sonidoListo()) return;
    let t = audio.currentTime;
    frecs.forEach((f) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = fuerte ? 'square' : 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(fuerte ? 0.7 : 0.4, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(audio.destination);
      o.start(t); o.stop(t + 0.22);
      t += 0.24;
    });
  }
  function avisar(llegan) {
    llegan.forEach((p) => recien.add(p.id));
    const pedido = llegan.some((p) => p.tipo === 'pedido');
    pitar(pedido ? [988, 1319, 988, 1319, 988, 1319] : [784, 784, 784, 784]);
    if (navigator.vibrate) try { navigator.vibrate([400, 150, 400, 150, 400]); } catch { /* */ }
    const p = llegan[0];
    toast(p.tipo === 'pedido' ? `Nuevo pedido · ${p.mesa}` : p.tipo === 'cuenta' ? `${p.mesa} pide la cuenta` : `${p.mesa} llama al camarero`);
    if (!sonidoListo()) pedirActivacion();
  }
  function recordar() {
    if (repetir && nuevos().length) pitar([988, 1319, 988, 1319]);
  }
  async function pedirWakeLock() {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible' && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; pintarWake(); });
      }
    } catch { wakeLock = null; }
    pintarWake();
  }
  function pintarWake() {
    $('wake-txt').textContent = wakeLock ? 'sí ✓' : ('wakeLock' in navigator ? 'no (toca la pantalla una vez)' : 'este navegador no lo permite: ponlo en los ajustes del móvil');
  }

  // ── acciones
  async function estado(id, nuevo) {
    quitados.add(id); pintar();
    try {
      datos = await llamar('estado', { id, estado: nuevo });
      return true;
    } catch (e) {
      quitados.delete(id);
      toast(e.code === 'pedido_no_encontrado' ? 'Ese pedido ya no está' : 'No se pudo guardar. Revisa la conexión.');
      return false;
    } finally { pintar(); }
  }
  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.apuntar) {
      const p = datos.pedidos.find((x) => x.id === b.dataset.apuntar);
      if (await estado(b.dataset.apuntar, 'preparando') && p) {
        hechos.unshift({ id: p.id, texto: `${p.mesa} · nº ${p.numero}`, hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) });
        hechos.length = Math.min(hechos.length, 6);
        pintarHechos();
      }
    } else if (b.dataset.atender) {
      await estado(b.dataset.atender, 'servido');
    } else if (b.dataset.deshacer) {
      const id = b.dataset.deshacer;
      try {
        datos = await llamar('estado', { id, estado: 'nuevo' });
        hechos.splice(hechos.findIndex((x) => x.id === id), 1);
        vistos.add(id); // no vuelve a pitar
        pintar();
      } catch { toast('No se pudo deshacer'); }
    } else if (b.id === 'b-pausa') {
      const abiertos = !datos.restaurante.pedidos_abiertos;
      if (!abiertos && !confirm('¿Pausar los pedidos por el móvil? Los clientes solo podrán ver la carta.')) return;
      try { datos = await llamar('pausa', { abiertos }); pintar(); toast(abiertos ? 'Pedidos reanudados' : 'Pedidos en pausa'); }
      catch { toast('No se pudo cambiar. Revisa la conexión.'); }
    } else if (b.id === 'b-sonido') {
      activarAudio(); pitar([880, 1175], false);
      if (!sonidoListo()) pedirActivacion();
    } else if (b.id === 'b-mas') {
      const abrir = $('mas').hidden;
      $('mas').hidden = !abrir; b.setAttribute('aria-expanded', String(abrir)); pintarWake();
    } else if (b.id === 'b-probar') {
      activarAudio(); pitar([988, 1319, 988, 1319, 988, 1319]);
    } else if (b.id === 'b-salir') {
      if (!confirm('¿Salir? Habrá que volver a poner la clave.')) return;
      store.del(K_SESION); clearInterval(timer); clearInterval(repetirT); sesion = null; datos = null; vistos = null; login();
    } else if (b.id === 'b-activar') {
      $('activar').hidden = true;
      activarAudio(); pedirWakeLock();
      setTimeout(() => { pintarSonido(); pitar([880, 1175], false); }, 150); // pitido corto: confirma que suena
    }
  });
  $('c-repetir').addEventListener('change', (e) => { repetir = e.target.checked; store.set(K_REPETIR, repetir); });
  $('login-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    sesion = { slug: $('login-slug').value.trim().toLowerCase(), clave: $('login-clave').value.trim() };
    activarAudio(); pedirWakeLock();
    entrar();
  });
  document.addEventListener('pointerdown', () => { if (!sonidoListo()) activarAudio(); pedirWakeLock(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    pedirWakeLock();
    if (audio && audio.state !== 'running') pedirActivacion();
    if (sesion && datos) sondear();
  });
  let toastT;
  function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3500); }

  pintarSonido();
  iniciar();
})();
