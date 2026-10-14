/*! Carta NFC · pedidos.js
 * Añade "pedir desde la mesa" a una carta web que ya existe, con una línea:
 *   <script src="https://carta-nfc-pedidos.netlify.app/w/pedidos.js" data-restaurante="mi-bar" defer></script>
 *
 * Solo se activa si se llega desde el NFC/QR de una mesa (?mesa=<codigo>) o con ?pedir=1
 * (el cliente elige mesa). Una visita normal a la web no ve nada distinto.
 *
 * Cómo encuentra los platos (por defecto, plantilla de carta con i18n):
 *   plato   .dish                         (o [data-carta-plato])
 *   nombre  [data-i18n^="mn."]             (su clave i18n es la referencia del plato)
 *   precio  .dish__p                       (varios = tamaños: ref#0, ref#1…)
 *   tamaños .prices-head span (2º en adelante) dentro de la misma sección
 * Un plato también puede llevar su referencia explícita: data-carta-ref="...".
 */
(function () {
  'use strict';
  if (window.__cartaNfcPedidos) return;
  window.__cartaNfcPedidos = true;

  const SCRIPT = document.currentScript || document.querySelector('script[data-restaurante]');
  const DS = (SCRIPT && SCRIPT.dataset) || {};
  const CFG = {
    api: (DS.api || 'https://giazlntdbfhnnfizmfao.supabase.co').replace(/\/$/, ''),
    key: DS.key || 'sb_publishable_sdLnLlIQvJBPTcmNx9FFpw_UEIAwbDP',
    slug: (DS.restaurante || '').toLowerCase(),
    plato: DS.selPlato || '.dish, [data-carta-plato]',
    nombre: DS.selNombre || '[data-i18n^="mn."], [data-carta-nombre]',
    precio: DS.selPrecio || '.dish__p, [data-carta-precio]',
    seccion: DS.selSeccion || 'section, [data-carta-seccion]',
    tamanos: DS.selTamanos || '.prices-head span:not(:first-child), [data-carta-tamano]',
    acento: DS.acento || '#FCA80C',
    fondo: DS.fondo || '#0B0B0B',
    papel: DS.papel || '#F3F0EA',
    tinta: DS.tinta || '#131313',
  };
  if (!CFG.slug) { console.warn('[pedidos.js] falta data-restaurante'); return; }

  // ------------------------------------------------------------------ textos ----
  const T = {
    es: {
      mesa: 'Mesa', verPedido: 'Ver pedido', tuPedido: 'Tu pedido', enviar: 'Enviar pedido', enviando: 'Enviando…',
      nota: 'Nota para cocina (opcional)', notaPh: 'Ej.: traed primero las bebidas', notaLinea: 'Nota: sin cebolla, poco hecho…',
      total: 'Total', vacio: 'Toca + en un plato para pedir', camarero: 'Camarero', cuenta: 'Cuenta',
      camareroLargo: 'Llamar al camarero', cuentaLarga: 'Pedir la cuenta',
      avisadoCamarero: 'Hemos avisado al camarero. Viene enseguida.', avisadoCuenta: 'Hemos avisado: te traen la cuenta enseguida.',
      enviado: '¡Pedido enviado!', enviadoTxt: (n, m, t) => `Pedido nº ${n} · ${m} · ${t}. Ya está en cocina; aquí verás cuándo está listo.`,
      seguir: 'Seguir viendo la carta', elegirMesa: '¿En qué mesa estás?', cambiar: 'cambiar', tusPedidos: 'Tus pedidos', pedidoN: 'Pedido nº',
      e: { nuevo: 'Recibido', preparando: 'En preparación', listo: '¡Listo! Te lo llevamos', servido: 'Servido', cancelado: 'Cancelado' },
      listoToast: '¡Tu pedido está listo! Te lo llevan ahora.', agotado: 'Agotado', anadido: 'Añadido',
      cerrado: 'Ahora mismo no se aceptan pedidos por el móvil. Llama al camarero.', cerrar: 'Cerrar',
      anadir: 'Añadir', quitar: 'Quitar uno', vacioCarrito: 'Tu pedido está vacío.',
      err: { mesa_no_valida: 'Este NFC de mesa ya no es válido. Pide ayuda al camarero.', pedidos_cerrados: 'Ahora no se aceptan pedidos por el móvil.',
        demasiados_pedidos: 'Demasiados pedidos seguidos. Espera un minuto.', producto_agotado: 'Algún plato se ha agotado. Quítalo del pedido.',
        producto_no_valido: 'Algún plato ya no está disponible. Recarga la página.', red: 'Sin conexión. Inténtalo de nuevo.', _: 'Algo ha fallado. Inténtalo de nuevo.' },
    },
    en: {
      mesa: 'Table', verPedido: 'View order', tuPedido: 'Your order', enviar: 'Send order', enviando: 'Sending…',
      nota: 'Note for the kitchen (optional)', notaPh: 'E.g.: drinks first, please', notaLinea: 'Note: no onion, well done…',
      total: 'Total', vacio: 'Tap + on a dish to order', camarero: 'Waiter', cuenta: 'Bill',
      camareroLargo: 'Call the waiter', cuentaLarga: 'Ask for the bill',
      avisadoCamarero: 'The waiter is on the way.', avisadoCuenta: 'Done: your bill is on the way.',
      enviado: 'Order sent!', enviadoTxt: (n, m, t) => `Order #${n} · ${m} · ${t}. It's in the kitchen; you'll see here when it's ready.`,
      seguir: 'Back to the menu', elegirMesa: 'Which table are you at?', cambiar: 'change', tusPedidos: 'Your orders', pedidoN: 'Order #',
      e: { nuevo: 'Received', preparando: 'Being prepared', listo: 'Ready! On its way', servido: 'Served', cancelado: 'Cancelled' },
      listoToast: 'Your order is ready! It’s on its way.', agotado: 'Sold out', anadido: 'Added',
      cerrado: 'Mobile ordering is paused right now. Please call the waiter.', cerrar: 'Close',
      anadir: 'Add', quitar: 'Remove one', vacioCarrito: 'Your order is empty.',
      err: { mesa_no_valida: 'This table tag is no longer valid. Please ask the staff.', pedidos_cerrados: 'Mobile ordering is paused right now.',
        demasiados_pedidos: 'Too many orders in a row. Please wait a minute.', producto_agotado: 'Something sold out. Please remove it.',
        producto_no_valido: 'Something is no longer available. Please reload.', red: 'No connection. Please try again.', _: 'Something went wrong. Please try again.' },
    },
    de: {
      mesa: 'Tisch', verPedido: 'Bestellung', tuPedido: 'Deine Bestellung', enviar: 'Bestellung senden', enviando: 'Wird gesendet…',
      nota: 'Hinweis für die Küche (optional)', notaPh: 'Z. B.: zuerst die Getränke', notaLinea: 'Hinweis: ohne Zwiebeln…',
      total: 'Summe', vacio: 'Tippe + bei einem Gericht', camarero: 'Kellner', cuenta: 'Rechnung',
      camareroLargo: 'Kellner rufen', cuentaLarga: 'Rechnung bitte',
      avisadoCamarero: 'Der Kellner kommt gleich.', avisadoCuenta: 'Die Rechnung kommt gleich.',
      enviado: 'Bestellung gesendet!', enviadoTxt: (n, m, t) => `Bestellung Nr. ${n} · ${m} · ${t}. Sie ist in der Küche; hier siehst du, wann sie fertig ist.`,
      seguir: 'Zurück zur Karte', elegirMesa: 'An welchem Tisch sitzt du?', cambiar: 'ändern', tusPedidos: 'Deine Bestellungen', pedidoN: 'Bestellung Nr.',
      e: { nuevo: 'Erhalten', preparando: 'In Zubereitung', listo: 'Fertig! Kommt gleich', servido: 'Serviert', cancelado: 'Storniert' },
      listoToast: 'Deine Bestellung ist fertig!', agotado: 'Ausverkauft', anadido: 'Hinzugefügt',
      cerrado: 'Handy-Bestellungen sind gerade pausiert. Bitte den Kellner rufen.', cerrar: 'Schließen',
      anadir: 'Hinzufügen', quitar: 'Eins entfernen', vacioCarrito: 'Deine Bestellung ist leer.',
      err: { mesa_no_valida: 'Dieser Tisch-Tag ist nicht mehr gültig.', pedidos_cerrados: 'Handy-Bestellungen sind gerade pausiert.',
        demasiados_pedidos: 'Zu viele Bestellungen. Bitte warte eine Minute.', producto_agotado: 'Etwas ist ausverkauft. Bitte entfernen.',
        producto_no_valido: 'Etwas ist nicht mehr verfügbar. Bitte neu laden.', red: 'Keine Verbindung. Bitte erneut versuchen.', _: 'Etwas ist schiefgelaufen.' },
    },
    fr: {
      mesa: 'Table', verPedido: 'Voir la commande', tuPedido: 'Votre commande', enviar: 'Envoyer la commande', enviando: 'Envoi…',
      nota: 'Note pour la cuisine (facultatif)', notaPh: 'Ex. : les boissons d’abord', notaLinea: 'Note : sans oignon…',
      total: 'Total', vacio: 'Touchez + sur un plat pour commander', camarero: 'Serveur', cuenta: 'Addition',
      camareroLargo: 'Appeler le serveur', cuentaLarga: 'Demander l’addition',
      avisadoCamarero: 'Le serveur arrive.', avisadoCuenta: 'L’addition arrive.',
      enviado: 'Commande envoyée !', enviadoTxt: (n, m, t) => `Commande nº ${n} · ${m} · ${t}. Elle est en cuisine ; vous verrez ici quand elle sera prête.`,
      seguir: 'Retour à la carte', elegirMesa: 'À quelle table êtes-vous ?', cambiar: 'changer', tusPedidos: 'Vos commandes', pedidoN: 'Commande nº',
      e: { nuevo: 'Reçue', preparando: 'En préparation', listo: 'Prête ! Elle arrive', servido: 'Servie', cancelado: 'Annulée' },
      listoToast: 'Votre commande est prête !', agotado: 'Épuisé', anadido: 'Ajouté',
      cerrado: 'Les commandes par mobile sont en pause. Appelez le serveur.', cerrar: 'Fermer',
      anadir: 'Ajouter', quitar: 'Retirer un', vacioCarrito: 'Votre commande est vide.',
      err: { mesa_no_valida: 'Ce tag de table n’est plus valide.', pedidos_cerrados: 'Les commandes par mobile sont en pause.',
        demasiados_pedidos: 'Trop de commandes d’affilée. Patientez une minute.', producto_agotado: 'Un plat est épuisé. Retirez-le.',
        producto_no_valido: 'Un plat n’est plus disponible. Rechargez la page.', red: 'Pas de connexion. Réessayez.', _: 'Une erreur est survenue.' },
    },
  };
  const LOCALE = { es: 'es-ES', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' };
  const idioma = () => { const l = (document.documentElement.lang || 'es').slice(0, 2).toLowerCase(); return T[l] ? l : 'es'; };
  const t = () => T[idioma()];

  // ------------------------------------------------------------ utilidades ----
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dinero = (n) => new Intl.NumberFormat(LOCALE[idioma()], { style: 'currency', currency: (menu && menu.restaurante.moneda) || 'EUR' }).format(Number(n || 0));
  const ses = {
    get(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } },
  };
  const loc = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } },
  };
  const K = { mesa: 'cnp:mesa:' + CFG.slug, activo: 'cnp:activo:' + CFG.slug, carrito: 'cnp:carrito:' + CFG.slug, pedidos: 'cnp:pedidos:' + CFG.slug };

  async function rpc(fn, args) {
    const h = { 'Content-Type': 'application/json', apikey: CFG.key };
    if (!CFG.key.startsWith('sb_')) h.Authorization = 'Bearer ' + CFG.key;
    let res;
    try {
      res = await fetch(CFG.api + '/rest/v1/rpc/' + fn, { method: 'POST', headers: h, body: JSON.stringify(args), cache: 'no-store' });
    } catch { const e = new Error('red'); e.code = 'red'; throw e; }
    const data = await res.json().catch(() => null);
    if (!res.ok) { const e = new Error((data && data.message) || 'error'); e.code = e.message.split(':')[0]; throw e; }
    return data;
  }
  const humano = (e) => t().err[e && e.code] || t().err._;
  // "Mesa 3" -> "Table 3" / "Tisch 3" según el idioma de la web
  const nombreMesa = (m) => { const x = /^Mesa\s+(.+)$/i.exec(m.nombre); return x ? `${t().mesa} ${x[1]}` : m.nombre; };

  // ---------------------------------------------------------------- estado ----
  let menu = null, mesa = null, carrito = {}, enviando = false, pollTimer = null;
  const productos = {};   // id -> producto (de la BD)
  const enlaces = {};     // id -> { plato, nombreEl, tamanoEl } para mostrar el nombre en el idioma de la web
  let ui = null;          // shadow root

  // ------------------------------------------------------------ arranque ----
  async function iniciar() {
    const qs = new URLSearchParams(location.search);
    const mesaUrl = qs.get('mesa') || qs.get('m');
    const pedir = qs.has('pedir');
    if (mesaUrl || pedir) ses.set(K.activo, true);
    const guardada = ses.get(K.mesa, null);
    if (!mesaUrl && !pedir && !guardada && !ses.get(K.activo, false)) return; // visita normal: no se toca nada

    try {
      menu = await rpc('carta_menu', { p_slug: CFG.slug, p_mesa: mesaUrl || (guardada && guardada.codigo) || null });
    } catch (e) {
      console.warn('[pedidos.js]', e.message);
      return;
    }
    menu.categorias.forEach((c) => c.productos.forEach((p) => { productos[p.id] = p; }));
    mesa = menu.mesa || null;
    if (mesa) ses.set(K.mesa, mesa);
    else if (mesaUrl) ses.set(K.mesa, null);
    if (!mesa && !(menu.restaurante.mesa_libre && menu.mesas.length)) {
      if (mesaUrl) avisoSuelto(t().err.mesa_no_valida);
      return;
    }
    carrito = ses.get(K.carrito, {});
    Object.keys(carrito).forEach((id) => { if (!productos[id] || !productos[id].disponible) delete carrito[id]; });

    montarUI();
    decorarPlatos();
    pintar();
    refrescarPedidos();
    new MutationObserver(() => { pintar(); decorarPlatos(true); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  // ----------------------------------------------- botones "+" en la carta ----
  function refsDePlato(plato) {
    const explicita = plato.getAttribute('data-carta-ref');
    const nombreEl = plato.querySelector(CFG.nombre);
    const base = explicita || (nombreEl && (nombreEl.getAttribute('data-i18n') || nombreEl.getAttribute('data-carta-nombre')));
    if (!base) return [];
    const precios = [...plato.querySelectorAll(CFG.precio)];
    const seccion = plato.closest(CFG.seccion);
    const tamanos = seccion ? [...seccion.querySelectorAll(CFG.tamanos)] : [];
    if (precios.length <= 1) return [{ ref: base, slot: precios[0] || null, nombreEl, tamanoEl: null }];
    return precios.map((p, i) => ({ ref: base + '#' + i, slot: p, nombreEl, tamanoEl: tamanos[i] || null }));
  }

  function decorarPlatos(soloTextos) {
    if (!menu.restaurante.pedidos_abiertos) return;
    const porRef = {};
    Object.values(productos).forEach((p) => { if (p.ref) porRef[p.ref] = p; });
    document.querySelectorAll(CFG.plato).forEach((plato) => {
      refsDePlato(plato).forEach(({ ref, slot, nombreEl, tamanoEl }) => {
        const p = porRef[ref];
        if (!p) return;
        enlaces[p.id] = { plato, nombreEl, tamanoEl };
        let b = plato.querySelector(`.cnp-add[data-id="${p.id}"]`);
        if (!b && !soloTextos) {
          b = document.createElement('button');
          b.type = 'button';
          b.className = 'cnp-add';
          b.dataset.id = p.id;
          if (slot) { slot.classList.add('cnp-p'); slot.appendChild(b); }
          else {
            const fila = document.createElement('div');
            fila.className = 'cnp-row';
            fila.appendChild(b);
            plato.appendChild(fila);
          }
        }
        if (b) pintarBoton(b, p);
      });
    });
  }

  function pintarBoton(b, p) {
    const n = carrito[p.id] ? carrito[p.id].cantidad : 0;
    b.disabled = !p.disponible;
    b.innerHTML = p.disponible ? '<span aria-hidden="true">+</span>' + (n ? `<span class="cnp-n">${n}</span>` : '') : esc(t().agotado);
    b.setAttribute('aria-label', p.disponible ? `${t().anadir}: ${nombreDe(p.id)}${n ? ` (${n})` : ''}` : t().agotado);
  }

  function pintarBotones() {
    document.querySelectorAll('.cnp-add[data-id]').forEach((b) => { const p = productos[b.dataset.id]; if (p) pintarBoton(b, p); });
  }

  function nombreDe(id) {
    const l = enlaces[id], p = productos[id];
    if (!l || !l.nombreEl) return p ? p.nombre : '';
    const base = l.nombreEl.textContent.trim();
    return l.tamanoEl ? `${base} · ${l.tamanoEl.textContent.trim()}` : base;
  }

  // ---------------------------------------------------------------- UI ----
  function montarUI() {
    const css = document.createElement('style');
    css.textContent = `
      .cnp-add{all:unset;box-sizing:border-box;position:relative;display:flex;align-items:center;justify-content:center;
        width:max-content;min-width:36px;height:36px;margin:10px 0 0 auto;padding:0 12px;border-radius:999px;cursor:pointer;
        background:${CFG.acento};color:${CFG.tinta};font:600 20px/1 Montserrat,system-ui,-apple-system,"Segoe UI",sans-serif;
        letter-spacing:.04em;transition:transform .12s ease,filter .2s ease;-webkit-tap-highlight-color:transparent}
      .cnp-add:hover{filter:brightness(1.08)}
      .cnp-add:active{transform:scale(.92)}
      .cnp-add:focus-visible{outline:2px solid ${CFG.tinta};outline-offset:2px}
      .cnp-add:disabled{background:transparent;color:inherit;opacity:.55;cursor:default;font-size:11px;text-transform:uppercase;letter-spacing:.12em;border:1px solid currentColor;height:28px}
      .cnp-add .cnp-n{position:absolute;top:-7px;right:-7px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;box-sizing:border-box;
        background:${CFG.tinta};color:${CFG.acento};font:700 11px/20px Montserrat,system-ui,sans-serif;text-align:center;letter-spacing:0}
      .cnp-p{grid-row:1 / span 2;align-self:start}
      .cnp-row{grid-column:1/-1;display:flex;justify-content:flex-end}
      .cnp-row .cnp-add{margin-top:6px}
      #cnp-espacio{height:96px}`;
    document.head.appendChild(css);
    const espacio = document.createElement('div');
    espacio.id = 'cnp-espacio';
    document.body.appendChild(espacio);

    const host = document.createElement('div');
    host.id = 'carta-nfc-pedidos';
    document.body.appendChild(host);
    ui = host.attachShadow({ mode: 'open' });
    ui.innerHTML = `<style>
      :host{all:initial}
      *{box-sizing:border-box}
      .r{--a:${CFG.acento};--f:${CFG.fondo};--p:${CFG.papel};--t:${CFG.tinta};--mut:#6b655d;--line:rgba(19,19,19,.14);
        font:15px/1.45 Montserrat,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--t)}
      .serif{font-family:"Instrument Serif",Georgia,"Times New Roman",serif;font-weight:400}
      button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
      .bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:var(--f);color:var(--p);
        padding:10px 14px calc(10px + env(safe-area-inset-bottom));border-top:1px solid rgba(243,240,234,.14);
        display:flex;align-items:center;gap:10px;box-shadow:0 -8px 24px rgba(0,0,0,.25)}
      .bar.badge{bottom:64px}
      .mesa{all:unset;cursor:pointer;display:flex;flex-direction:column;min-width:0;flex:1}
      .mesa b{font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:24px;line-height:1.05;white-space:nowrap}
      .mesa small{font-size:11px;letter-spacing:.08em;color:#B3AEA6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .acc{display:flex;gap:8px;flex-shrink:0}
      .ghost{border:1px solid rgba(243,240,234,.3);background:transparent;color:var(--p);border-radius:999px;min-height:40px;padding:0 14px;
        font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
      .prim{border:0;background:var(--a);color:var(--t);border-radius:999px;min-height:46px;padding:0 18px;font-size:12px;font-weight:700;
        letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:10px;white-space:nowrap}
      .prim .n{background:var(--t);color:var(--a);border-radius:999px;min-width:24px;height:24px;line-height:24px;padding:0 6px;letter-spacing:0;text-align:center}
      .prim:disabled{opacity:.55;cursor:default}
      dialog{border:0;padding:0;background:var(--p);color:var(--t);width:min(560px,calc(100% - 16px));max-height:calc(100% - 16px);
        border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.45)}
      dialog::backdrop{background:rgba(11,11,11,.6)}
      .hd{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:20px 20px 12px;border-bottom:1px solid var(--line)}
      .hd h2{margin:0;font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:34px;line-height:1}
      .hd .sub{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);margin-top:6px}
      .x{border:0;background:transparent;font-size:28px;line-height:1;padding:2px 6px;color:var(--mut)}
      .bd{padding:6px 20px 14px;overflow:auto;max-height:58vh}
      .ft{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--line)}
      .tot small{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
      .tot b{font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:32px;line-height:1}
      .li{padding:14px 0;border-bottom:1px solid var(--line)}
      .li-top{display:flex;align-items:center;gap:10px}
      .li-top .nom{flex:1;font-weight:600;line-height:1.3}
      .st{display:inline-flex;align-items:center;border-radius:999px;background:rgba(19,19,19,.07)}
      .st button{border:0;background:transparent;width:38px;height:38px;font-size:20px;font-weight:600}
      .st span{min-width:20px;text-align:center;font-weight:700}
      .pr{min-width:70px;text-align:right;font-variant-numeric:tabular-nums}
      input,textarea{width:100%;font:inherit;font-size:14px;color:var(--t);background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-top:8px;outline:none}
      input:focus,textarea:focus{border-color:var(--t)}
      textarea{min-height:64px;resize:vertical}
      label.lab{display:block;margin-top:14px;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
      .mp{margin-top:16px;padding:12px 14px;border-radius:14px;background:rgba(19,19,19,.05)}
      .mp h3{margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
      .mp-row{display:flex;justify-content:space-between;gap:8px;padding:5px 0;font-size:14px}
      .es{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:rgba(19,19,19,.08);white-space:nowrap}
      .es.preparando{background:#dbe7ff;color:#1d3d8f}.es.listo{background:#d7f5df;color:#14632e}.es.cancelado{color:#a3221b}
      .ayuda{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}
      .line{border:1px solid var(--t);background:transparent;border-radius:999px;min-height:44px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase}
      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;padding:6px 0 10px}
      .grid button{min-height:52px;border-radius:14px;border:1px solid var(--line);background:#fff;font-weight:600}
      .grid button.on{background:var(--t);color:var(--p)}
      .ok{text-align:center;padding:30px 22px 24px}
      .ok .tick{width:70px;height:70px;border-radius:50%;margin:0 auto 14px;display:grid;place-items:center;background:var(--a);color:var(--t);font-size:34px}
      .ok h2{margin:0;font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:38px}
      .ok p{color:var(--mut);margin:10px 0 20px}
      .ok .prim{width:100%;justify-content:center}
      .aviso{margin:12px 0 0;padding:12px 14px;border-radius:12px;background:#fff3d6;font-weight:600;font-size:14px}
      .toast{position:fixed;left:50%;bottom:110px;transform:translate(-50%,16px);opacity:0;pointer-events:none;z-index:2147483001;
        background:var(--p);color:var(--t);padding:12px 18px;border-radius:14px;font-weight:600;font-size:14px;max-width:calc(100% - 32px);
        text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:all .2s ease}
      .toast.show{opacity:1;transform:translate(-50%,0)}
      .toast.err{background:#a3221b;color:#fff}
      .bar.badge ~ .toast{bottom:174px}
      @media (max-width:380px){.ghost{padding:0 10px;letter-spacing:.08em}.prim{padding:0 14px;letter-spacing:.08em}}
    </style>
    <div class="r">
      <div class="bar" part="bar"></div>
      <div class="toast" role="status"></div>
      <dialog id="d-carrito"></dialog>
      <dialog id="d-mesa"></dialog>
      <dialog id="d-ok"></dialog>
    </div>`;
    ui.addEventListener('click', onClick);
    ui.addEventListener('input', onInput);
    document.addEventListener('click', (ev) => {
      const b = ev.target.closest('.cnp-add[data-id]');
      if (!b) return;
      ev.preventDefault();
      ev.stopPropagation();
      cambiar(b.dataset.id, +1);
      toast(`${t().anadido}: ${nombreDe(b.dataset.id)}`);
    }, true);
    const badge = () => ui.querySelector('.bar').classList.toggle('badge', !!document.getElementById('nl-badge-frame'));
    badge();
    new MutationObserver(badge).observe(document.body, { childList: true });
  }

  const $ = (sel) => ui.querySelector(sel);

  function totales() {
    let n = 0, total = 0;
    Object.entries(carrito).forEach(([id, l]) => { n += l.cantidad; total += l.cantidad * Number(productos[id].precio); });
    return { n, total };
  }

  function puedePedir() { return menu.restaurante.pedidos_abiertos; }

  function pintar() {
    if (!ui) return;
    const tx = t(), { n, total } = totales();
    const activo = pedidosActivos()[0];
    const sub = !puedePedir() ? tx.cerrado
      : activo ? `${tx.pedidoN} ${activo.numero} · ${tx.e[activo.estado] || activo.estado}`
      : mesa ? tx.vacio : tx.elegirMesa;
    $('.bar').innerHTML = `
      <button class="mesa" data-a="mesa" ${menu.mesa ? 'disabled' : ''}>
        <b>${mesa ? esc(nombreMesa(mesa)) : tx.mesa + ' ?'}${mesa && !menu.mesa ? ` <small style="font-family:inherit">(${tx.cambiar})</small>` : ''}</b>
        <small>${esc(sub)}</small>
      </button>
      <div class="acc">
        ${n && puedePedir()
          ? `<button class="prim" data-a="abrir"><span class="n">${n}</span>${esc(tx.verPedido)} · ${dinero(total)}</button>`
          : `<button class="ghost" data-a="camarero" aria-label="${esc(tx.camareroLargo)}">${esc(tx.camarero)}</button>
             <button class="ghost" data-a="cuenta" aria-label="${esc(tx.cuentaLarga)}">${esc(tx.cuenta)}</button>
             ${activo || loc.get(K.pedidos, []).length ? `<button class="ghost" data-a="abrir" aria-label="${esc(tx.tusPedidos)}">☰</button>` : ''}`}
      </div>`;
    pintarBotones();
    if ($('#d-carrito').open) pintarCarrito();
  }

  function pintarCarrito() {
    const tx = t(), lineas = Object.entries(carrito);
    const mios = pedidosRecientes();
    $('#d-carrito').innerHTML = `
      <div class="hd"><div><h2>${esc(tx.tuPedido)}</h2><div class="sub">${mesa ? esc(nombreMesa(mesa)) : ''}</div></div>
        <button class="x" data-a="cerrar" aria-label="${esc(tx.cerrar)}">×</button></div>
      <div class="bd">
        ${!puedePedir() ? `<div class="aviso">${esc(tx.cerrado)}</div>` : ''}
        ${lineas.length ? lineas.map(([id, l]) => `
          <div class="li">
            <div class="li-top"><span class="nom">${esc(nombreDe(id))}</span>
              <span class="st"><button data-a="menos" data-id="${id}" aria-label="${esc(tx.quitar)}">−</button><span>${l.cantidad}</span>
              <button data-a="mas" data-id="${id}" aria-label="${esc(tx.anadir)}">+</button></span>
              <span class="pr">${dinero(l.cantidad * Number(productos[id].precio))}</span></div>
            <input type="text" maxlength="140" data-nota="${id}" value="${esc(l.nota || '')}" placeholder="${esc(tx.notaLinea)}" aria-label="${esc(tx.notaLinea)}">
          </div>`).join('') : `<p style="color:var(--mut)">${esc(tx.vacioCarrito)}</p>`}
        ${lineas.length ? `<label class="lab">${esc(tx.nota)}<textarea id="nota" maxlength="300" placeholder="${esc(tx.notaPh)}">${esc(ses.get(K.carrito + ':nota', ''))}</textarea></label>` : ''}
        ${mios.length ? `<div class="mp"><h3>${esc(tx.tusPedidos)}</h3>${mios.map((p) => `
          <div class="mp-row"><span>${esc(tx.pedidoN)} ${esc(p.numero)} · ${dinero(p.total)}</span><span class="es ${esc(p.estado)}">${esc(tx.e[p.estado] || p.estado)}</span></div>`).join('')}</div>` : ''}
        <div class="ayuda">
          <button class="line" data-a="camarero">${esc(tx.camareroLargo)}</button>
          <button class="line" data-a="cuenta">${esc(tx.cuentaLarga)}</button>
        </div>
      </div>
      ${lineas.length ? `<div class="ft"><div class="tot"><small>${esc(tx.total)}</small><b>${dinero(totales().total)}</b></div>
        <button class="prim" data-a="enviar" ${enviando || !puedePedir() ? 'disabled' : ''}>${esc(enviando ? tx.enviando : tx.enviar)}</button></div>` : ''}`;
  }

  function abrirMesas(trasEnviar) {
    const tx = t();
    $('#d-mesa').dataset.tras = trasEnviar ? '1' : '';
    $('#d-mesa').innerHTML = `
      <div class="hd"><h2>${esc(tx.elegirMesa)}</h2><button class="x" data-a="cerrar" aria-label="${esc(tx.cerrar)}">×</button></div>
      <div class="bd"><div class="grid">${menu.mesas.map((m) =>
        `<button data-a="elegir" data-codigo="${esc(m.codigo)}" class="${mesa && mesa.codigo === m.codigo ? 'on' : ''}">${esc(nombreMesa(m))}</button>`).join('')}</div></div>`;
    if ($('#d-carrito').open) $('#d-carrito').close();
    $('#d-mesa').showModal();
  }

  let toastTimer;
  function toast(msg, error) {
    const el = $('.toast');
    el.textContent = msg;
    el.className = 'toast show' + (error ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast' + (error ? ' err' : ''); }, 2600);
  }

  function avisoSuelto(msg) {
    const d = document.createElement('div');
    d.setAttribute('role', 'alert');
    d.style.cssText = `position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;padding:14px 16px;border-radius:14px;background:${CFG.fondo};color:${CFG.papel};font:600 14px/1.4 Montserrat,system-ui,sans-serif`;
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 8000);
  }

  // ------------------------------------------------------------- acciones ----
  function cambiar(id, delta) {
    if (!productos[id] || !productos[id].disponible || !puedePedir()) return;
    const n = Math.max(0, Math.min(20, (carrito[id] ? carrito[id].cantidad : 0) + delta));
    if (!n) delete carrito[id];
    else carrito[id] = { cantidad: n, nota: carrito[id] ? carrito[id].nota : '' };
    ses.set(K.carrito, carrito);
    pintar();
  }

  async function enviar() {
    if (enviando) return;
    if (!mesa) { abrirMesas(true); return; }
    const lineas = Object.entries(carrito).map(([id, l]) => ({ producto_id: id, cantidad: l.cantidad, nota: (l.nota || '').trim() || null }));
    if (!lineas.length) return;
    enviando = true;
    pintarCarrito();
    try {
      const nota = ($('#nota') && $('#nota').value.trim()) || null;
      const res = await rpc('carta_pedir', { p_mesa: mesa.codigo, p_lineas: lineas, p_nota: nota });
      const lista = loc.get(K.pedidos, []).filter((p) => Date.now() - new Date(p.creado).getTime() < 12 * 3600e3);
      lista.unshift({ token: res.token, numero: res.numero, creado: res.creado, total: res.total, estado: res.estado });
      loc.set(K.pedidos, lista.slice(0, 20));
      carrito = {};
      ses.set(K.carrito, carrito);
      ses.set(K.carrito + ':nota', '');
      $('#d-carrito').close();
      const tx = t();
      $('#d-ok').innerHTML = `<div class="ok"><div class="tick" aria-hidden="true">✓</div><h2>${esc(tx.enviado)}</h2>
        <p>${esc(tx.enviadoTxt(res.numero, nombreMesa({ nombre: res.mesa }), dinero(res.total)))}</p>
        <button class="prim" data-a="cerrar">${esc(tx.seguir)}</button></div>`;
      $('#d-ok').showModal();
      refrescarPedidos();
    } catch (e) {
      toast(humano(e), true);
      if (e.code === 'pedidos_cerrados') { menu.restaurante.pedidos_abiertos = false; }
      if (e.code === 'mesa_no_valida') { mesa = null; ses.set(K.mesa, null); }
    } finally {
      enviando = false;
      pintar();
    }
  }

  async function avisar(tipo) {
    if (!mesa) { abrirMesas(false); return; }
    try {
      await rpc('carta_avisar', { p_mesa: mesa.codigo, p_tipo: tipo });
      toast(tipo === 'cuenta' ? t().avisadoCuenta : t().avisadoCamarero);
    } catch (e) { toast(humano(e), true); }
  }

  function pedidosRecientes() {
    return loc.get(K.pedidos, []).filter((p) => Date.now() - new Date(p.creado).getTime() < 12 * 3600e3)
      .filter((p) => p.estado !== 'servido' || Date.now() - new Date(p.creado).getTime() < 3600e3).slice(0, 5);
  }
  function pedidosActivos() { return pedidosRecientes().filter((p) => !['servido', 'cancelado'].includes(p.estado)); }

  async function refrescarPedidos() {
    clearTimeout(pollTimer);
    const lista = loc.get(K.pedidos, []);
    const activos = pedidosActivos();
    if (!activos.length) return;
    if (document.visibilityState === 'visible') {
      try {
        const estados = await rpc('carta_estado', { p_tokens: activos.map((p) => p.token) });
        let listo = false;
        estados.forEach((e) => {
          const p = lista.find((x) => x.token === e.token);
          if (!p) return;
          if (p.estado !== 'listo' && e.estado === 'listo') listo = true;
          p.estado = e.estado;
        });
        loc.set(K.pedidos, lista);
        pintar();
        if (listo) { toast(t().listoToast); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
      } catch { /* siguiente ciclo */ }
    }
    pollTimer = setTimeout(refrescarPedidos, 8000);
  }

  function onClick(ev) {
    const b = ev.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'abrir') { pintarCarrito(); $('#d-carrito').showModal(); }
    else if (a === 'cerrar') b.closest('dialog').close();
    else if (a === 'mas') cambiar(b.dataset.id, +1);
    else if (a === 'menos') cambiar(b.dataset.id, -1);
    else if (a === 'enviar') enviar();
    else if (a === 'camarero') avisar('camarero');
    else if (a === 'cuenta') avisar('cuenta');
    else if (a === 'mesa') abrirMesas(false);
    else if (a === 'elegir') {
      const m = menu.mesas.find((x) => x.codigo === b.dataset.codigo);
      if (!m) return;
      mesa = { codigo: m.codigo, nombre: m.nombre };
      ses.set(K.mesa, mesa);
      const tras = $('#d-mesa').dataset.tras;
      $('#d-mesa').close();
      pintar();
      if (tras) { pintarCarrito(); $('#d-carrito').showModal(); }
    }
  }

  function onInput(ev) {
    const id = ev.target.dataset && ev.target.dataset.nota;
    if (id && carrito[id]) { carrito[id].nota = ev.target.value; ses.set(K.carrito, carrito); }
    if (ev.target.id === 'nota') ses.set(K.carrito + ':nota', ev.target.value);
  }

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && menu) refrescarPedidos(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
