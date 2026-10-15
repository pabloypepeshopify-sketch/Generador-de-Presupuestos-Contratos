/* Carta con pedidos desde la mesa — motor común de la plantilla de webs de bares.
 * La configuración la inyecta herramientas/web-bar.mjs en window.BAR (ver carta.html generado).
 * Mismo API que la carta de la plataforma: carta_menu, carta_pedir, carta_avisar, carta_estado.
 * El precio lo pone siempre el servidor; aquí solo se muestra. Todo texto de la BD pasa por esc(). */
(function(){
'use strict';
var B = window.BAR;
var API = B.api, KEY = B.key, SLUG = B.slug;
var POLL_MS = 8000, TTL = 12 * 60 * 60 * 1000;
var PFX = 'bar:' + SLUG + ':';
var K_MESA = PFX + 'mesa', K_CART = PFX + 'carrito', K_NOTA = PFX + 'nota', K_ORD = PFX + 'pedidos';
var ESTADOS = { nuevo:'Recibido', preparando:'En preparación', listo:'¡Listo! Te lo llevamos', servido:'Servido', cancelado:'Cancelado' };
var ALERG = { gluten:'Gluten', crustaceos:'Crustáceos', huevo:'Huevo', pescado:'Pescado', cacahuete:'Cacahuete', soja:'Soja',
  lacteos:'Lácteos', frutos_cascara:'Frutos de cáscara', apio:'Apio', mostaza:'Mostaza', sesamo:'Sésamo',
  sulfitos:'Sulfitos', altramuces:'Altramuces', moluscos:'Moluscos' };
var CLOSED_MSG = 'Ahora no se aceptan pedidos por el móvil. Llama al camarero.';

var S = { rest:null, mesa:null, mesas:[], cats:[], prods:{}, cart:[], nota:'', orders:[], tab:0, sending:false, avisando:{}, noteOpen:{} };
var qs = new URLSearchParams(location.search);
var urlMesa = (qs.get('mesa') || '').trim() || null;

/* ── utilidades ── */
var $ = function(id){ return document.getElementById(id); };
function esc(v){
  return String(v == null ? '' : v).replace(/[&<>"'`]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c];
  });
}
function norm(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function money(n){
  n = Number(n) || 0;
  var dec = Math.round(n * 100) % 100 !== 0;
  try { return new Intl.NumberFormat('es-ES', { style:'currency', currency:(S.rest && S.rest.moneda) || 'EUR', minimumFractionDigits:dec ? 2 : 0, maximumFractionDigits:2 }).format(n); }
  catch(e){ return n.toFixed(dec ? 2 : 0).replace('.', ',') + ' €'; }
}
function store(kind){ try { return kind === 'l' ? window.localStorage : window.sessionStorage; } catch(e){ return null; } }
function getJ(kind, k){ try { var s = store(kind); var v = s && s.getItem(k); return v ? JSON.parse(v) : null; } catch(e){ return null; } }
function setJ(kind, k, v){ try { var s = store(kind); if (!s) return; if (v == null) s.removeItem(k); else s.setItem(k, JSON.stringify(v)); } catch(e){} }
function one(r){ return Array.isArray(r) ? r[0] : r; }
function plural(n, a, b){ return n + ' ' + (n === 1 ? a : b); }
function safeUrl(u){ return /^(https:\/\/|img\/)/.test(String(u || '')) ? String(u) : ''; }

/* ── API ── */
function ApiError(code){ this.code = code; this.message = code; }
function rpc(fn, body){
  var ctrl = ('AbortController' in window) ? new AbortController() : null;
  var timer = setTimeout(function(){ if (ctrl) ctrl.abort(); }, 15000);
  return fetch(API + fn, {
    method:'POST', headers:{ 'Content-Type':'application/json', 'apikey':KEY },
    body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined
  }).then(function(res){
    return res.text().then(function(t){
      clearTimeout(timer);
      var data = null; try { data = t ? JSON.parse(t) : null; } catch(e){}
      if (!res.ok) throw new ApiError((data && data.message) || ('http_' + res.status));
      return data;
    });
  }, function(){ clearTimeout(timer); throw new ApiError('red'); });
}
function errMsg(code){
  code = String(code || '');
  if (code.indexOf('producto_agotado') === 0){
    var n = code.split(':').slice(1).join(':').trim();
    return n ? 'Lo sentimos, «' + n + '» se acaba de agotar. Quítalo de tu pedido y vuelve a enviarlo.'
             : 'Uno de los productos se acaba de agotar. Revisa tu pedido.';
  }
  var M = {
    mesa_no_valida: 'No reconocemos esta mesa. Vuelve a acercar el móvil a la pegatina de tu mesa.',
    pedidos_cerrados: CLOSED_MSG,
    demasiados_pedidos: 'Has enviado varios pedidos seguidos. Espera un momento o llama al camarero.',
    producto_no_valido: 'Algún producto ya no está en la carta. Hemos actualizado tu pedido: revísalo.',
    pedido_vacio: 'Tu pedido está vacío. Toca + en los platos que quieras.',
    restaurante_no_encontrado: 'La carta no está disponible ahora mismo. Pregunta al camarero.',
    red: 'Sin conexión. Revisa tu internet y vuelve a intentarlo.'
  };
  return M[code] || 'No se ha podido completar. Inténtalo de nuevo o llama al camarero.';
}

/* ── aviso ── */
var toastT;
function toast(msg, kind, ms){
  var t = $('toast');
  t.textContent = msg;
  t.className = 'toast show' + (kind ? ' ' + kind : '');
  clearTimeout(toastT);
  toastT = setTimeout(function(){ t.className = 'toast' + (kind ? ' ' + kind : ''); }, ms || 2200);
}

/* ── ventanas ── */
var zTop = 60, lastFocus = null;
function openM(id){
  var m = $(id); lastFocus = document.activeElement;
  m.hidden = false; m.style.zIndex = ++zTop;
  document.body.classList.add('locked');
  var f = m.querySelector('[data-close], button, input, textarea'); if (f) try { f.focus({ preventScroll:true }); } catch(e){}
}
function closeM(id){
  $(id).hidden = true;
  if (!document.querySelector('.modal:not([hidden])')){
    document.body.classList.remove('locked');
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll:true }); } catch(e){}
  }
}
document.addEventListener('click', function(e){
  var m = e.target.closest('.modal'); if (!m) return;
  if (e.target === m || e.target.closest('[data-close]')) closeM(m.id);
});
document.addEventListener('keydown', function(e){
  if (e.key !== 'Escape') return;
  var open = Array.prototype.slice.call(document.querySelectorAll('.modal:not([hidden])'));
  open.sort(function(a,b){ return (+b.style.zIndex) - (+a.style.zIndex); });
  if (open[0]) closeM(open[0].id);
});

/* ── carga ── */
function isOpen(){ return !!(S.rest && S.rest.pedidos_abiertos); }
function canOrder(){ return isOpen() && (!!S.mesa || !!(S.rest && S.rest.mesa_libre)); }

function load(){
  var saved = getJ('s', K_MESA);
  var code = urlMesa || (saved && saved.codigo) || null;
  return rpc('carta_menu', { p_slug:SLUG, p_mesa:code }).then(function(d){
    d = one(d) || {};
    S.rest = d.restaurante || { nombre:B.nombre, pedidos_abiertos:false, mesa_libre:false, moneda:'EUR' };
    S.mesas = Array.isArray(d.mesas) ? d.mesas : [];
    if (d.mesa && d.mesa.codigo){
      var fromNfc = !!urlMesa && d.mesa.codigo === urlMesa;
      S.mesa = { codigo:d.mesa.codigo, nombre:d.mesa.nombre, fija: fromNfc || !!(saved && saved.fija && saved.codigo === d.mesa.codigo) };
      setJ('s', K_MESA, S.mesa);
    } else {
      S.mesa = null; setJ('s', K_MESA, null);
      if (urlMesa) setTimeout(function(){ toast('No reconocemos el código de esta mesa. Elige tu mesa al pedir.', 'err', 4000); }, 600);
    }
    if (urlMesa && history.replaceState){ // la URL limpia: si la comparten, no lleva la mesa
      try { history.replaceState(null, '', location.pathname); } catch(e){}
    }
    buildCats(d.categorias || []);
    restoreCart();
    renderAll();
  });
}

function tabOf(nombre, i, n){
  var P = B.pestanas || [];
  if (!P.length) return 0;
  var k = norm(nombre);
  for (var t = 0; t < P.length; t++){
    if ((P[t].categorias || []).some(function(c){ return norm(c) === k; })) return t;
  }
  return P.length - 1;
}
function lookup(map, nombre){
  var k = norm(nombre), r = null;
  Object.keys(map || {}).forEach(function(x){ if (norm(x) === k) r = map[x]; });
  return r;
}

function buildCats(cats){
  S.prods = {};
  S.cats = cats.map(function(c, i){
    var groups = [], gmap = {};
    (c.productos || []).forEach(function(p, pi){
      // Los tamaños (Tapa / Media / Ración) vienen como productos con ref "base#n" y nombre "Plato · Tamaño".
      var ref = String(p.ref || p.id), h = ref.indexOf('#');
      var base = h >= 0 ? ref.slice(0, h) : ref;
      var idx = h >= 0 ? parseInt(ref.slice(h + 1), 10) || 0 : 0;
      var nombre = String(p.nombre || '');
      var cut = nombre.lastIndexOf(' · ');
      var plato = (h >= 0 && cut > 0) ? nombre.slice(0, cut) : nombre;
      var talla = h >= 0 ? (cut > 0 ? nombre.slice(cut + 3) : 'Opción ' + (idx + 1)) : '';
      var g = gmap[base];
      if (!g){ g = { base:base, nombre:plato, descripcion:'', alergenos:[], foto:'', opts:[], order:pi }; gmap[base] = g; groups.push(g); }
      if (!g.descripcion && p.descripcion) g.descripcion = p.descripcion;
      if (!g.foto && p.imagen_url) g.foto = safeUrl(p.imagen_url);
      (p.alergenos || []).forEach(function(a){ if (ALERG[a] && g.alergenos.indexOf(a) < 0) g.alergenos.push(a); });
      var prod = { id:p.id, nombre:nombre, plato:plato, talla:talla, idx:idx, precio:Number(p.precio) || 0, disponible:p.disponible !== false };
      g.opts.push(prod);
      S.prods[p.id] = prod;
    });
    groups.forEach(function(g){ g.opts.sort(function(a,b){ return a.idx - b.idx; }); });
    return { id:c.id || ('otros-' + i), nombre:c.nombre, tab:tabOf(c.nombre, i, cats.length),
             foto:safeUrl(lookup(B.fotosCategorias, c.nombre)), nota:lookup(B.notasCategorias, c.nombre), groups:groups };
  });
}

/* ── pintar carta ── */
function renderAll(){ renderHeader(); renderMenu(); updateBadges(); updateBar(); }

function renderHeader(){
  var pill = $('pill');
  $('pillTxt').textContent = S.mesa ? S.mesa.nombre : 'Elegir mesa';
  pill.classList.toggle('none', !S.mesa);
  pill.hidden = !S.mesa && !(S.rest && S.rest.mesa_libre);
  pill.disabled = !!(S.mesa && S.mesa.fija);
  var intro = $('intro');
  if (!isOpen()) intro.textContent = 'Echa un vistazo a la carta. Para pedir, avisa al camarero.';
  else if (S.mesa) intro.textContent = 'Toca + en lo que quieras y envía el pedido. Llega directo a la barra.';
  else if (S.rest && S.rest.mesa_libre) intro.textContent = 'Toca + en lo que quieras. Al enviar, te preguntamos tu mesa.';
  else intro.textContent = 'Para pedir desde tu mesa, acerca el móvil a la pegatina de la mesa o escanea su QR.';
  $('closedBox').hidden = isOpen();
}

function alergHTML(g){
  if (!B.alergenos || !g.alergenos.length) return '';
  return '<p class="alg"><span class="sr">Alérgenos: </span>' + g.alergenos.map(function(a){ return '<span>' + esc(ALERG[a]) + '</span>'; }).join('') + '</p>';
}

function dishHTML(g){
  var order = canOrder();
  var h = '<li class="dish">';
  if (g.foto) h += '<img class="dish-img" src="' + esc(g.foto) + '" alt="" loading="lazy" width="96" height="96" onerror="this.remove()">';
  h += '<div class="dish-body">';
  if (g.opts.length > 1 || (g.opts[0] && g.opts[0].talla)){
    h += '<h3>' + esc(g.nombre) + '</h3>';
    if (g.descripcion) h += '<p class="desc">' + esc(g.descripcion) + '</p>';
    h += alergHTML(g) + '<div class="sizes">';
    g.opts.forEach(function(o){
      var lbl = '<span class="lbl">' + esc(o.talla) + '</span>';
      if (!o.disponible) h += '<span class="size static off">' + lbl + '<span class="soldout">Agotado</span></span>';
      else if (!order) h += '<span class="size static">' + lbl + '<span class="pr">' + esc(money(o.precio)) + '</span></span>';
      else h += '<button class="size" type="button" data-add="' + esc(o.id) + '" aria-label="Añadir ' + esc(o.nombre) + ', ' + esc(money(o.precio)) + '">' +
                lbl + '<span class="pr">' + esc(money(o.precio)) + '</span><span class="pl" aria-hidden="true">+</span><em class="badge" hidden></em></button>';
    });
    h += '</div>';
  } else {
    var o = g.opts[0];
    h += '<div class="dish-row"><div><h3>' + esc(g.nombre) + '</h3>';
    if (g.descripcion) h += '<p class="desc">' + esc(g.descripcion) + '</p>';
    h += alergHTML(g) + '</div><div class="buy"><span class="price">' + esc(money(o.precio)) + '</span>';
    if (!o.disponible) h += '<span class="soldout">Agotado</span>';
    else if (order) h += '<button class="add" type="button" data-add="' + esc(o.id) + '" aria-label="Añadir ' + esc(o.nombre) + '"><span aria-hidden="true">+</span><em class="badge" hidden></em></button>';
    h += '</div></div>';
  }
  return h + '</div></li>';
}

function tabs(){ var P = B.pestanas || []; return P.length ? P : [{ nombre:'Carta' }]; }

function renderMenu(){
  var html = '', T = tabs();
  if (!S.cats.length){
    $('main').innerHTML = '<div class="state"><h2>Carta en preparación</h2><p>Pregunta al camarero qué hay hoy.</p></div>';
    return;
  }
  T.forEach(function(tab, ti){
    var cats = S.cats.filter(function(c){ return c.tab === ti; });
    html += '<div class="pane" data-pane="' + ti + '"' + (S.tab === ti ? '' : ' hidden') + ' role="tabpanel">';
    cats.forEach(function(c){
      html += '<section class="sec" id="sec-' + esc(c.id) + '" aria-labelledby="h-' + esc(c.id) + '"><h2 id="h-' + esc(c.id) + '">' + esc(c.nombre) + '</h2>';
      if (c.nota) html += '<p class="sec-nota">' + esc(c.nota) + '</p>';
      if (c.foto) html += '<div class="photo"><img src="' + esc(c.foto) + '" alt="" loading="lazy" width="760" height="475" onerror="this.parentNode.remove()"></div>';
      html += '<ul class="dishes">' + c.groups.map(dishHTML).join('') + '</ul></section>';
    });
    html += '</div>';
  });
  if ((B.notasFinales || []).length) html += '<div class="notes">' + B.notasFinales.map(function(n){ return '<p>' + esc(n) + '</p>'; }).join('') + '</div>';
  $('main').innerHTML = html;
  var tb = $('tabs');
  if ((B.pestanas || []).length > 1){
    tb.hidden = false;
    tb.innerHTML = T.map(function(t, i){
      var n = S.cats.filter(function(c){ return c.tab === i; }).reduce(function(s, c){ return s + c.groups.length; }, 0);
      return '<button class="tab" role="tab" type="button" data-tab="' + i + '" aria-selected="' + (S.tab === i) + '">' + esc(t.nombre) + ' <small>' + n + '</small></button>';
    }).join('');
  } else tb.hidden = true;
  $('nav').hidden = false;
  renderChips();
  measure();
}

function renderChips(){
  var cats = S.cats.filter(function(c){ return c.tab === S.tab; });
  $('chips').innerHTML = cats.map(function(c, i){
    return '<button class="chip' + (i === 0 ? ' on' : '') + '" type="button" data-go="sec-' + esc(c.id) + '">' + esc(c.nombre) + '</button>';
  }).join('');
  document.querySelectorAll('.tab').forEach(function(t){ t.setAttribute('aria-selected', String(+t.dataset.tab === S.tab)); });
}

function measure(){
  document.documentElement.style.setProperty('--headH', document.querySelector('.top').offsetHeight + 'px');
}
function offset(){ return document.querySelector('.top').offsetHeight + $('nav').offsetHeight + 6; }

function setTab(t){
  if (t === S.tab) return;
  S.tab = t;
  document.querySelectorAll('.pane').forEach(function(p){ p.hidden = +p.dataset.pane !== t; });
  renderChips();
  var navTop = $('nav').offsetTop - document.querySelector('.top').offsetHeight;
  if (window.scrollY > navTop) window.scrollTo({ top:navTop, behavior:'auto' });
  $('chips').scrollLeft = 0;
}
$('tabs').addEventListener('click', function(e){ var b = e.target.closest('[data-tab]'); if (b) setTab(+b.dataset.tab); });
$('chips').addEventListener('click', function(e){
  var b = e.target.closest('[data-go]'); if (!b) return;
  var el = document.getElementById(b.dataset.go); if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset() + 8, behavior:'smooth' });
});
var spyRaf = 0;
window.addEventListener('scroll', function(){
  if (spyRaf) return;
  spyRaf = requestAnimationFrame(function(){
    spyRaf = 0;
    var pane = document.querySelector('.pane:not([hidden])'); if (!pane) return;
    var secs = pane.querySelectorAll('.sec'), cur = secs[0], lim = offset() + 40;
    secs.forEach(function(s){ if (s.getBoundingClientRect().top <= lim) cur = s; });
    if (!cur) return;
    var chips = $('chips'), active = null;
    chips.querySelectorAll('.chip').forEach(function(c){ var on = c.dataset.go === cur.id; c.classList.toggle('on', on); if (on) active = c; });
    if (active){
      var target = active.offsetLeft - (chips.clientWidth - active.offsetWidth) / 2;
      if (Math.abs(chips.scrollLeft - target) > 30) chips.scrollLeft = target;
    }
  });
}, { passive:true });
window.addEventListener('resize', measure);

/* ── carrito ── */
function saveCart(){ setJ('s', K_CART, S.cart); setJ('s', K_NOTA, S.nota || null); }
function restoreCart(){
  var c = getJ('s', K_CART);
  S.cart = (Array.isArray(c) ? c : []).filter(function(l){ return l && S.prods[l.id]; }).map(function(l){
    return { id:l.id, cantidad:Math.min(20, Math.max(1, parseInt(l.cantidad, 10) || 1)), nota:String(l.nota || '').slice(0, 140) };
  });
  S.nota = String(getJ('s', K_NOTA) || '').slice(0, 300);
  saveCart();
}
function cartCount(){ return S.cart.reduce(function(s,l){ return s + l.cantidad; }, 0); }
function cartTotal(){ return S.cart.reduce(function(s,l){ var p = S.prods[l.id]; return s + (p ? p.precio * l.cantidad : 0); }, 0); }

function add(id, btn){
  var p = S.prods[id];
  if (!p || !p.disponible) return;
  if (!isOpen()){ toast(CLOSED_MSG, 'err', 3000); return; }
  var l = S.cart.find(function(x){ return x.id === id; });
  if (l){
    if (l.cantidad >= 20){ toast('Máximo 20 unidades por plato.'); return; }
    l.cantidad++;
  } else S.cart.push({ id:id, cantidad:1, nota:'' });
  saveCart(); updateBadges(); updateBar();
  toast('Añadido: ' + p.nombre);
  if (btn){ btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
}
$('main').addEventListener('click', function(e){ var b = e.target.closest('[data-add]'); if (b) add(b.dataset.add, b); });

function updateBadges(){
  var q = {}; S.cart.forEach(function(l){ q[l.id] = l.cantidad; });
  document.querySelectorAll('[data-add]').forEach(function(b){
    var em = b.querySelector('.badge'); if (!em) return;
    var n = q[b.dataset.add] || 0;
    em.hidden = !n; em.textContent = n || '';
  });
}

/* ── barra inferior ── */
function activeOrders(){ return S.orders.filter(function(o){ return o.estado !== 'servido' && o.estado !== 'cancelado'; }); }
function updateBar(){
  $('barMesa').textContent = S.mesa ? S.mesa.nombre : B.nombre;
  var sub = $('barSub'), act = activeOrders(), n = cartCount();
  var ready = act.find(function(o){ return o.estado === 'listo'; });
  var shown = ready || act[0];
  sub.classList.toggle('hot', !!ready);
  if (shown) sub.textContent = 'Pedido ' + shown.numero + ': ' + (ESTADOS[shown.estado] || shown.estado);
  else if (!isOpen()) sub.textContent = 'Pedidos por móvil cerrados';
  else if (n) sub.textContent = plural(n, 'producto', 'productos') + ' sin enviar';
  else if (canOrder()) sub.textContent = 'Toca + para pedir';
  else sub.textContent = 'Pide desde la pegatina de tu mesa';
  var a = $('barAct');
  if (n && isOpen()) a.innerHTML = '<button class="btn-a" type="button" data-act="cart">Ver pedido · ' + esc(money(cartTotal())) + '<span class="n">' + n + '</span></button>';
  else if (S.mesa) a.innerHTML = '<button class="btn-o" type="button" data-act="camarero">Camarero</button><button class="btn-o" type="button" data-act="cuenta">Cuenta</button>';
  else a.innerHTML = B.webUrl ? '<a class="btn-o" href="' + esc(B.webUrl) + '">Inicio</a>' : '';
  $('bar').hidden = false;
}
$('barAct').addEventListener('click', function(e){
  var b = e.target.closest('button[data-act]'); if (!b) return;
  if (b.dataset.act === 'cart') openCart(); else avisar(b.dataset.act, b);
});
$('barInfo').addEventListener('click', function(){
  if (S.cart.length || S.orders.length) openCart();
  else if (!S.mesa && S.rest && S.rest.mesa_libre) pickMesa(null);
});
$('pill').addEventListener('click', function(){ if (!(S.mesa && S.mesa.fija)) pickMesa(null); });

/* ── ventana del pedido ── */
function openCart(){ $('cartErr').hidden = true; renderCart(); renderOrders(); openM('mCart'); }
function renderCart(){
  $('cartMesa').textContent = S.mesa ? S.mesa.nombre : 'Sin mesa elegida';
  var body = $('cartBody');
  if (!S.cart.length){
    body.innerHTML = '<p class="empty">' + (isOpen() ? 'Tu pedido está vacío. Toca + en los platos que quieras.' : esc(CLOSED_MSG)) + '</p>';
    return;
  }
  var h = '';
  S.cart.forEach(function(l){
    var p = S.prods[l.id]; if (!p) return;
    var showNote = !!l.nota || S.noteOpen[l.id];
    h += '<div class="line" data-id="' + esc(l.id) + '">' +
      '<div class="line-top"><div><div class="line-name">' + esc(p.nombre) + '</div>' +
      '<div class="line-unit">' + esc(money(p.precio)) + ' / ud.</div>' +
      (p.disponible ? '' : '<span class="warn">Agotado: quítalo del pedido</span>') + '</div>' +
      '<div class="line-price">' + esc(money(p.precio * l.cantidad)) + '</div></div>' +
      '<div class="line-ctl"><div class="qty">' +
        '<button type="button" data-q="-1" aria-label="Quitar uno de ' + esc(p.nombre) + '">−</button><span aria-live="polite">' + l.cantidad + '</span>' +
        '<button type="button" data-q="1" aria-label="Añadir uno de ' + esc(p.nombre) + '"' + (l.cantidad >= 20 ? ' disabled' : '') + '>+</button></div>' +
        (showNote ? '' : '<button type="button" class="link" data-note-tg>Añadir nota</button>') + '</div>' +
      '<input class="field" data-note maxlength="140" aria-label="Nota para ' + esc(p.nombre) + '" placeholder="Ej.: sin cebolla, poco hecho…" value="' + esc(l.nota) + '"' + (showNote ? '' : ' hidden') + '>' +
      '</div>';
  });
  var mesaRow = (S.mesa && S.mesa.fija) ? '' :
    '<div class="mesa-row"><span>' + (S.mesa ? esc(S.mesa.nombre) : 'Aún no has elegido mesa') + '</span>' +
    '<button type="button" class="link" data-pick>' + (S.mesa ? 'Cambiar' : 'Elegir mesa') + '</button></div>';
  h += '<label class="lbl-f"><span>Nota para la cocina</span>' +
       '<textarea class="field" id="cartNota" rows="2" maxlength="300" placeholder="Algo que debamos saber del pedido">' + esc(S.nota) + '</textarea></label>' +
       mesaRow +
       '<div class="total"><span>Total</span><b>' + esc(money(cartTotal())) + '</b></div>' +
       '<button class="btn-big" type="button" id="sendBtn"' + (S.sending || !isOpen() ? ' disabled' : '') + '>' + (S.sending ? 'Enviando…' : 'Enviar pedido') + '</button>' +
       '<p class="fine">Se paga en el local, como siempre.</p>';
  body.innerHTML = h;
}
function renderOrders(){
  var b = $('ordersBody'), h = '';
  if (S.orders.length){
    h += '<div class="block"><h3>Tus pedidos</h3>';
    S.orders.forEach(function(o){
      var hora = '';
      try { hora = new Date(o.creado || o.t).toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' }); } catch(e){}
      h += '<div class="ord"><div><b>Pedido ' + esc(o.numero) + '</b><small>' + esc([o.mesaNombre, hora, money(o.total)].filter(Boolean).join(', ')) + '</small></div>' +
           '<span class="st ' + esc(o.estado) + '">' + esc(ESTADOS[o.estado] || o.estado) + '</span></div>';
    });
    h += '</div>';
  }
  if (S.mesa) h += '<div class="block"><h3>¿Necesitas algo?</h3><div class="two">' +
       '<button class="btn-o dark" type="button" data-act="camarero">Llamar al camarero</button>' +
       '<button class="btn-o dark" type="button" data-act="cuenta">Pedir la cuenta</button></div></div>';
  b.innerHTML = h;
}
$('mCart').addEventListener('click', function(e){
  var t = e.target, line = t.closest('.line');
  if (t.closest('[data-q]') && line){
    var l = S.cart.find(function(x){ return x.id === line.dataset.id; }); if (!l) return;
    l.cantidad = Math.min(20, l.cantidad + (+t.closest('[data-q]').dataset.q));
    if (l.cantidad <= 0) S.cart = S.cart.filter(function(x){ return x !== l; });
    saveCart(); renderCart(); updateBadges(); updateBar();
    return;
  }
  if (t.closest('[data-note-tg]') && line){
    S.noteOpen[line.dataset.id] = true;
    t.closest('[data-note-tg]').remove();
    var inp = line.querySelector('[data-note]'); inp.hidden = false; inp.focus();
    return;
  }
  if (t.closest('[data-pick]')){ pickMesa(function(){ renderCart(); }); return; }
  if (t.closest('#sendBtn')){ send(); return; }
  var a = t.closest('[data-act]'); if (a) avisar(a.dataset.act, a);
});
$('mCart').addEventListener('input', function(e){
  var t = e.target;
  if (t.matches('[data-note]')){
    var line = t.closest('.line'); var l = S.cart.find(function(x){ return x.id === line.dataset.id; });
    if (l){ l.nota = t.value.slice(0, 140); saveCart(); }
  } else if (t.id === 'cartNota'){ S.nota = t.value.slice(0, 300); saveCart(); }
});

/* ── enviar ── */
function showErr(msg){ var e = $('cartErr'); e.textContent = msg; e.hidden = false; e.scrollIntoView({ block:'nearest', behavior:'smooth' }); }
function send(){
  if (S.sending) return;
  $('cartErr').hidden = true;
  if (!isOpen()){ showErr(CLOSED_MSG); return; }
  if (!S.cart.length){ showErr(errMsg('pedido_vacio')); return; }
  if (!S.mesa){
    if (S.rest && S.rest.mesa_libre) pickMesa(send);
    else showErr('Para enviar el pedido, acerca el móvil a la pegatina de tu mesa o escanea su QR.');
    return;
  }
  S.sending = true; renderCart();
  var mesa = S.mesa;
  rpc('carta_pedir', {
    p_mesa: mesa.codigo,
    p_lineas: S.cart.map(function(l){ return { producto_id:l.id, cantidad:l.cantidad, nota:(l.nota || '').trim() || null }; }),
    p_nota: (S.nota || '').trim() || null
  }).then(function(r){
    var o = one(r) || {};
    S.orders.unshift({ token:o.token, numero:o.numero, total:Number(o.total) || cartTotal(), mesaNombre:mesa.nombre, estado:o.estado || 'nuevo', creado:o.creado || null, t:Date.now() });
    saveOrders();
    S.cart = []; S.nota = ''; S.noteOpen = {}; saveCart();
    S.sending = false;
    closeM('mCart');
    $('okMeta').textContent = 'Pedido ' + o.numero + ', ' + mesa.nombre + ', ' + money(o.total);
    openM('mOk');
    updateBadges(); updateBar(); startPoll();
    if (navigator.vibrate) try { navigator.vibrate(60); } catch(e){}
  }).catch(function(e){
    S.sending = false;
    var code = (e && e.code) || 'red';
    if (code === 'mesa_no_valida' && !(S.mesa && S.mesa.fija)){ S.mesa = null; setJ('s', K_MESA, null); renderHeader(); updateBar(); }
    if (code === 'pedidos_cerrados'){ S.rest.pedidos_abiertos = false; renderAll(); }
    showErr(errMsg(code));
    if (code.indexOf('producto_') === 0) refreshMenu().then(function(){ renderCart(); showErr(errMsg(code)); });
    else renderCart();
  });
}
function refreshMenu(){
  return rpc('carta_menu', { p_slug:SLUG, p_mesa:S.mesa ? S.mesa.codigo : null }).then(function(d){
    d = one(d) || {};
    if (d.restaurante) S.rest = d.restaurante;
    var y = window.scrollY, before = S.cart.length;
    buildCats(d.categorias || []);
    S.cart = S.cart.filter(function(l){ return S.prods[l.id]; });
    saveCart(); renderAll(); window.scrollTo(0, y);
    if (S.cart.length < before) toast('Hemos quitado de tu pedido platos que ya no están en la carta.', 'err', 3500);
  }).catch(function(){});
}

/* ── mesa ── */
var pickCb = null;
function pickMesa(cb){
  pickCb = cb;
  var grid = $('mesasGrid');
  if (S.rest && S.rest.mesa_libre === false){
    $('mesaHelp').textContent = 'Para pedir, acerca el móvil a la pegatina de tu mesa o escanea su QR.';
    grid.innerHTML = '';
  } else {
    $('mesaHelp').textContent = 'Mira el nombre en la pegatina de tu mesa.';
    grid.innerHTML = S.mesas.map(function(m){
      return '<button type="button" data-mesa="' + esc(m.codigo) + '"' + (S.mesa && S.mesa.codigo === m.codigo ? ' class="on" aria-pressed="true"' : '') + '>' + esc(m.nombre) + '</button>';
    }).join('');
  }
  openM('mMesa');
}
$('mesasGrid').addEventListener('click', function(e){
  var b = e.target.closest('[data-mesa]'); if (!b) return;
  var m = S.mesas.find(function(x){ return x.codigo === b.dataset.mesa; }); if (!m) return;
  var cambia = !S.mesa;
  S.mesa = { codigo:m.codigo, nombre:m.nombre, fija:false };
  setJ('s', K_MESA, S.mesa);
  closeM('mMesa'); renderHeader(); updateBar();
  if (cambia) renderMenu(), updateBadges();
  var cb = pickCb; pickCb = null;
  if (cb) cb(); else toast(m.nombre + ' seleccionada');
});

/* ── camarero / cuenta ── */
function avisar(tipo, btn){
  if (S.avisando[tipo]) return;
  if (!S.mesa){ if (S.rest && S.rest.mesa_libre) pickMesa(function(){ avisar(tipo); }); return; }
  S.avisando[tipo] = true;
  if (btn) btn.disabled = true;
  rpc('carta_avisar', { p_mesa:S.mesa.codigo, p_tipo:tipo }).then(function(r){
    var o = one(r) || {}, cuenta = tipo === 'cuenta';
    if (o.repetido) toast(cuenta ? 'Ya hemos pedido tu cuenta. Enseguida va.' : 'Ya hemos avisado al camarero. Enseguida va.', 'hot', 3000);
    else toast(cuenta ? 'Cuenta pedida. Te la llevamos enseguida.' : 'Camarero avisado. Viene enseguida.', 'hot', 3000);
  }).catch(function(e){
    var code = (e && e.code) || 'red';
    if (code === 'mesa_no_valida' && !(S.mesa && S.mesa.fija)){ S.mesa = null; setJ('s', K_MESA, null); renderHeader(); updateBar(); }
    toast(errMsg(code), 'err', 3500);
  }).then(function(){
    setTimeout(function(){
      S.avisando[tipo] = false;
      document.querySelectorAll('[data-act="' + tipo + '"]').forEach(function(b){ b.disabled = false; });
    }, 4000);
  });
}

/* ── seguimiento ── */
function saveOrders(){ setJ('l', K_ORD, S.orders); }
function loadOrders(){
  var a = getJ('l', K_ORD), now = Date.now();
  S.orders = (Array.isArray(a) ? a : []).filter(function(o){ return o && o.token && now - (o.t || 0) < TTL; });
  saveOrders();
}
var pollT = null, polling = false;
function startPoll(){ if (!pollT && activeOrders().length) pollT = setInterval(poll, POLL_MS); }
function stopPoll(){ clearInterval(pollT); pollT = null; }
function poll(){
  var act = activeOrders();
  if (!act.length){ stopPoll(); return; }
  if (document.hidden || polling) return;
  polling = true;
  rpc('carta_estado', { p_tokens: act.map(function(o){ return o.token; }) }).then(function(r){
    (Array.isArray(r) ? r : []).forEach(function(x){
      var o = S.orders.find(function(z){ return z.token === x.token; }); if (!o) return;
      if (x.estado && x.estado !== o.estado){
        o.estado = x.estado;
        if (x.estado === 'listo'){
          toast('¡Pedido ' + o.numero + ' listo! Te lo llevamos.', 'hot', 5000);
          if (navigator.vibrate) try { navigator.vibrate([220, 120, 220, 120, 320]); } catch(e){}
        } else if (x.estado === 'cancelado') toast('El pedido ' + o.numero + ' se ha cancelado. Pregunta al camarero.', 'err', 5000);
        else if (x.estado === 'preparando') toast('Pedido ' + o.numero + ': en preparación.');
      }
      if (x.total != null) o.total = Number(x.total);
    });
    saveOrders(); updateBar();
    if (!$('mCart').hidden) renderOrders();
    if (!activeOrders().length) stopPoll();
  }).catch(function(){}).then(function(){ polling = false; });
}
document.addEventListener('visibilitychange', function(){ if (!document.hidden) poll(); });

/* Netlify pone a veces su sello abajo a la derecha: se le deja hueco para que no tape el botón. */
function vigilarSello(){
  var marcar = function(){ document.documentElement.classList.toggle('nl-badge', !!document.getElementById('nl-badge-frame')); };
  marcar();
  if ('MutationObserver' in window) new MutationObserver(marcar).observe(document.body, { childList:true });
}

/* ── inicio ── */
function boot(){
  loadOrders();
  load().then(function(){ startPoll(); poll(); }).catch(function(e){
    var code = (e && e.code) || '';
    $('main').innerHTML = '<div class="state"><h2>No se ha podido cargar la carta</h2><p>' + esc(errMsg(code || 'red')) +
      '</p><button class="btn-big dark" type="button" id="retry">Reintentar</button></div>';
    $('retry').onclick = function(){ $('main').innerHTML = '<div class="state"><div class="spin"></div>Cargando la carta…</div>'; boot(); };
  });
}
vigilarSello();
boot();
})();
