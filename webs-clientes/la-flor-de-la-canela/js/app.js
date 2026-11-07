/* La Flor de la Canela · lógica de la web y de la carta digital */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var WA = '34618012208';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var guardar = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var leer = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };

  /* ───────────── textos en inglés ───────────── */
  var EN = {
    'nav.carta': 'Menu', 'nav.casa': 'Our story', 'nav.barra': 'Bar', 'nav.visita': 'Find us',
    'cta.reservar': 'Book a table', 'cta.carta': 'See the menu',
    'hero.ante': 'Restobar · Santa Justa · Seville',
    'hero.t1': 'Ceviche and serranito,', 'hero.t2': 'at the same table.',
    'hero.sub': 'Peruvian creole cooking and classic Sevillian tapas on Avenida de El Greco. A terrace on the street, tiles inside and a well-shaken pisco sour.',
    'hero.d1': '168 Google reviews', 'hero.d2': 'dishes on the menu', 'hero.d3a': 'Tapa', 'hero.d3': 'or full plate',
    'casa.pie': 'Av. de El Greco, 4 · the old Enea',
    'casa.ante': 'Our story', 'casa.titulo': 'A flower <em>from Lima</em>',
    'casa.p1': 'It’s named after Chabuca Granda’s waltz, the song every Peruvian knows by heart. Behind it is Dani Maguiño, who in 2006 opened what he remembers as Seville’s first Peruvian restaurant, on Plaza Pintor Amalio García del Moral.',
    'casa.p2': 'Today that kitchen lives on Avenida de El Greco: a street terrace with wrought-iron grilles, a blue-and-white tiled dining room, wooden tables and a menu split in two. On one side, ceviche, causa and wok-tossed lomo saltado. On the other, serranito, fried cuttlefish and oxtail stew.',
    'casa.c1': 'cooking Peru in Seville', 'casa.c2': 'kitchens, one table', 'casa.c3': 'allergens marked on the menu',
    'coc.ante': 'Two kitchens', 'coc.titulo': 'Order from both. <em>Share.</em>',
    'coc.pe.t': 'Peruvian kitchen', 'coc.pe.p': 'Ceviche with tiger’s milk, causa limeña, anticuchos, ají de gallina and everything from the wok: lomo saltado, chaufa, tipakay. Creole and chifa, just like in Lima.', 'coc.pe.cta': 'See Peruvian dishes',
    'coc.es.t': 'Spanish kitchen', 'coc.es.p': 'Classic tapas: serranito, pork in whisky sauce, fried cuttlefish, marinated dogfish, oxtail and pork cheeks. With an ice-cold Cruzcampo.', 'coc.es.cta': 'See Spanish dishes',
    'est.ante': 'To start', 'est.titulo': 'What you <em>have to try</em>', 'est.cta': 'Full menu',
    'carta.ante': 'Digital menu', 'carta.titulo': 'The <em>menu</em>',
    'carta.intro': 'Almost everything comes as a tapa or a full plate. Best way: order from both kitchens and share.',
    'carta.tab.pe': 'Peruvian', 'carta.tab.es': 'Spanish', 'carta.alerg': 'Allergens',
    'carta.ph': 'Search: ceviche, chaufa, serranito…',
    'carta.pa.t': 'Hide dishes that contain:', 'carta.pa.nota': 'Based on the restaurant’s menu. If you have an allergy, always tell your server.', 'carta.pa.limpiar': 'Clear filters',
    'carta.legal': 'Prices in euros, VAT included. If you have any allergy or intolerance, let us know and we’ll tell you what’s in every dish.',
    'barra.ante': 'The bar', 'barra.titulo': 'Pisco sour: <em>mango, passion fruit</em> or classic',
    'barra.p': 'Start with a pisco sour and let the night decide the rest. Chicha morada, tropical juices, mojitos and draught Cruzcampo for the tapas.',
    'barra.b1': 'Classic pisco sour', 'barra.b2': 'Passion fruit pisco sour', 'barra.b3': 'Mango pisco sour', 'barra.b4': 'Chicha morada', 'barra.b5': 'Tropical juices', 'barra.b6': 'Mojito',
    'barra.nota': 'Ask at the bar for today’s desserts.',
    'res.ante': 'Book', 'res.titulo': 'Save us <em>a table</em>',
    'res.p': 'Fill this in and WhatsApp opens with the message ready. We’ll reply there to confirm.',
    'res.thefork': 'Also on TheFork',
    'res.f.nombre': 'Name', 'res.f.personas': 'Guests', 'res.f.dia': 'Day', 'res.f.hora': 'Time', 'res.f.zona': 'Where',
    'res.f.terraza': 'Terrace', 'res.f.dentro': 'Inside', 'res.f.notas': 'Anything we should know (optional)', 'res.f.notas.ph': 'Birthday, pram, allergies…',
    'res.f.enviar': 'Request a table on WhatsApp',
    'vis.ante': 'Find us', 'vis.titulo': 'Av. de El Greco, 4 <em>Seville</em>',
    'vis.p': 'In the San Pablo – Santa Justa neighbourhood, 41007. Street terrace and indoor dining room.',
    'vis.horario': 'Opening hours', 'vis.horario.v': 'Call or WhatsApp us and we’ll tell you if there’s a table.',
    'vis.tel': 'Phone & WhatsApp', 'vis.como': 'Get directions',
    'pie.lema': 'Peruvian & Spanish kitchen', 'pie.fotos': 'Photos of the restaurant and its dishes.',
    'cred.carta': 'Digital menu made by', 'cred.pie': 'Website and digital menu made by',
    'bm.carta': 'Menu', 'bm.llamar': 'Call', 'bm.reservar': 'Book', 'bm.llegar': 'Directions'
  };

  var UI = {
    es: { tapa: 'Tapa', racion: 'Ración', precio: 'Precio', casa: 'De la casa', consulta: 'Alérgenos: consulta al personal',
          sinAl: 'Sin alérgenos declarados', vacio: 'No hay platos que coincidan.', vacioSub: 'Prueba con otra palabra o quita algún filtro.',
          aviso: 'La cocina española aún no tiene los alérgenos en carta, así que con filtros activos no se muestra. Pregunta y te lo decimos.',
          platos: 'platos', verCarta: 'Ver en la carta', errNombre: 'Pon tu nombre para la reserva.', errDia: 'Elige el día.', errPasado: 'Ese día ya ha pasado.',
          msg: function (f) { return 'Hola, quería reservar mesa en La Flor de la Canela.\n\n· Nombre: ' + f.nombre + '\n· Personas: ' + f.personas + '\n· Día: ' + f.dia + '\n· Hora: ' + f.hora + '\n· Zona: ' + f.zona + (f.notas ? '\n· Notas: ' + f.notas : '') + '\n\n¡Gracias!'; } },
    en: { tapa: 'Tapa', racion: 'Plate', precio: 'Price', casa: 'House favourite', consulta: 'Allergens: please ask your server',
          sinAl: 'No allergens declared', vacio: 'No dishes match.', vacioSub: 'Try another word or remove a filter.',
          aviso: 'Allergen info for the Spanish kitchen isn’t on the menu yet, so those dishes are hidden while filters are on. Just ask us.',
          platos: 'dishes', verCarta: 'See on the menu', errNombre: 'Please add your name.', errDia: 'Pick a day.', errPasado: 'That day has already passed.',
          msg: function (f) { return 'Hi! I’d like to book a table at La Flor de la Canela.\n\n· Name: ' + f.nombre + '\n· Guests: ' + f.personas + '\n· Day: ' + f.dia + '\n· Time: ' + f.hora + '\n· Area: ' + f.zona + (f.notas ? '\n· Notes: ' + f.notas : '') + '\n\nThank you!'; } }
  };

  var estado = {
    lang: 'es',
    cocina: 'peru',
    busqueda: '',
    quitar: new Set()
  };

  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var precio = function (n) { return n.toFixed(2).replace('.', ',') + ' €'; };
  var sinTildes = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var t = function (k) { return UI[estado.lang][k]; };

  /* ───────────── idioma ───────────── */
  var originales = new Map();
  function aplicarIdioma(lang) {
    estado.lang = lang;
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(function (el) {
      if (!originales.has(el)) originales.set(el, el.textContent);
      var k = el.getAttribute('data-i18n');
      el.textContent = lang === 'en' && EN[k] ? EN[k] : originales.get(el);
    });
    $$('[data-i18n-html]').forEach(function (el) {
      if (!originales.has(el)) originales.set(el, el.innerHTML);
      var k = el.getAttribute('data-i18n-html');
      el.innerHTML = lang === 'en' && EN[k] ? EN[k] : originales.get(el);
    });
    $$('[data-i18n-ph]').forEach(function (el) {
      if (!originales.has(el)) originales.set(el, el.placeholder);
      var k = el.getAttribute('data-i18n-ph');
      el.placeholder = lang === 'en' && EN[k] ? EN[k] : originales.get(el);
    });
    guardar('flor-lang', lang);
    pintarTodo();
  }

  /* ───────────── carta ───────────── */
  var cuerpo = $('#panel-carta');
  var chips = $('#carta-chips');

  function alergenosHTML(p) {
    if (!p.a) return '<span class="al-consulta">' + t('consulta') + '</span>';
    if (!p.a.length) return '';
    return '<div class="plato-alerg">' + p.a.map(function (n) {
      var a = ALERGENOS[n];
      return '<span class="al" style="--c:' + a.color + '" title="' + esc(a[estado.lang]) + '"><i>' + n + '</i>' + esc(a[estado.lang]) + '</span>';
    }).join('') + '</div>';
  }

  function preciosHTML(p) {
    if (p.u != null) return '<div class="plato-precios unico"><span><small>' + t('precio') + '</small>' + precio(p.u) + '</span></div>';
    var c = function (v, et) { return v == null ? '<span class="vacio">—</span>' : '<span><small>' + et + '</small>' + precio(v) + '</span>'; };
    return '<div class="plato-precios">' + c(p.t, t('tapa')) + c(p.r, t('racion')) + '</div>';
  }

  function platoHTML(p) {
    var desc = estado.lang === 'en' ? p.en : p.d;
    var foto = p.foto ? '<button class="plato-foto" type="button" data-foto="img/' + p.foto + '.webp" aria-label="Ver foto de ' + esc(p.n) + '"><img src="img/' + p.foto + '-mini.webp" alt="" loading="lazy" width="120" height="120"></button>' : '';
    var casa = p.top ? '<span class="plato-casa"><svg><use href="#flor"/></svg>' + t('casa') + '</span>' : '';
    var nota = p.nota ? '<span class="plato-nota">' + esc(p.nota[estado.lang]) + '</span>' : '';
    return '<article class="plato">' +
      '<div class="plato-info">' + foto +
        '<div><h4 class="plato-nombre">' + esc(p.n) + casa + nota + '</h4>' +
        (desc ? '<p class="plato-desc">' + esc(desc) + '</p>' : '') +
        alergenosHTML(p) + '</div>' +
      '</div>' + preciosHTML(p) + '</article>';
  }

  function pasaFiltros(p) {
    if (estado.quitar.size) {
      if (!p.a) return false;
      for (var i = 0; i < p.a.length; i++) if (estado.quitar.has(p.a[i])) return false;
    }
    if (estado.busqueda) {
      var txt = sinTildes(p.n + ' ' + p.d + ' ' + p.en);
      if (txt.indexOf(estado.busqueda) === -1) return false;
    }
    return true;
  }

  function pintarCarta() {
    var buscando = !!estado.busqueda;
    // al buscar se mira en las dos cocinas a la vez
    var cocinas = buscando ? CARTA : CARTA.filter(function (c) { return c.id === estado.cocina; });
    var html = '';
    var secs = [];
    var ocultasSinDatos = false;

    cocinas.forEach(function (coc) {
      if (!buscando) html += '<p class="carta-lema">' + esc(coc.lema[estado.lang]) + '</p>';
      coc.secciones.forEach(function (s) {
        var platos = s.platos.filter(pasaFiltros);
        if (estado.quitar.size && s.platos.some(function (p) { return !p.a; })) ocultasSinDatos = true;
        if (!platos.length) return;
        var unico = s.platos.every(function (p) { return p.u != null; });
        var nombre = s[estado.lang] + (buscando ? ' · ' + coc[estado.lang] : '');
        secs.push({ id: s.id, nombre: s[estado.lang] });
        html += '<section class="carta-seccion" id="' + s.id + '">' +
          '<header class="cs-cabeza"><h3>' + esc(nombre) + ' <small>' + platos.length + ' ' + t('platos') + '</small></h3>' +
          '<div class="cs-cols' + (unico ? ' unico' : '') + '">' + (unico ? '<span>' + t('precio') + '</span>' : '<span>' + t('tapa') + '</span><span>' + t('racion') + '</span>') + '</div></header>' +
          platos.map(platoHTML).join('') + '</section>';
      });
    });

    if (!secs.length) {
      html += '<div class="carta-vacio"><svg><use href="#flor"/></svg><p><strong>' + t('vacio') + '</strong><br>' + t('vacioSub') + '</p></div>';
    }
    if (ocultasSinDatos) html += '<p class="carta-aviso">' + t('aviso') + '</p>';

    cuerpo.innerHTML = html;
    chips.innerHTML = secs.map(function (s) { return '<a class="chip" href="#' + s.id + '" data-sec="' + s.id + '">' + esc(s.nombre) + '</a>'; }).join('');
    observarSecciones();
  }

  function pintarSelector() {
    var sel = $('.selector');
    sel.setAttribute('data-activa', estado.cocina);
    $$('.selector [role="tab"]').forEach(function (b) {
      var on = b.getAttribute('data-cocina') === estado.cocina;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    $('#panel-carta').setAttribute('aria-labelledby', 'tab-' + estado.cocina);
  }

  function pintarAlergenos() {
    $('#pa-lista').innerHTML = Object.keys(ALERGENOS).map(function (n) {
      var a = ALERGENOS[n];
      return '<label><input type="checkbox" value="' + n + '"' + (estado.quitar.has(+n) ? ' checked' : '') + '><span style="--c:' + a.color + '"><i>' + n + '</i>' + esc(a[estado.lang]) + '</span></label>';
    }).join('');
    $('#leyenda').innerHTML = Object.keys(ALERGENOS).map(function (n) {
      var a = ALERGENOS[n];
      return '<span class="al" style="--c:' + a.color + '"><i>' + n + '</i>' + esc(a[estado.lang]) + '</span>';
    }).join('');
    var num = $('#alerg-num');
    num.textContent = estado.quitar.size;
    num.hidden = !estado.quitar.size;
  }

  function pintarEstrellas() {
    var elegidos = ['Ceviche', 'Lomo saltado', 'Causa limeña', 'Arroz con mariscos', 'Chicharrón de pescado'];
    var todos = [];
    CARTA.forEach(function (c) { c.secciones.forEach(function (s) { s.platos.forEach(function (p) { todos.push({ p: p, c: c, s: s }); }); }); });
    $('#estrellas-pista').innerHTML = elegidos.map(function (n) {
      var x = todos.filter(function (o) { return o.p.n === n; })[0];
      if (!x) return '';
      var p = x.p;
      var pr = (p.t != null ? '<span>' + t('tapa') + '<b>' + precio(p.t) + '</b></span>' : '') + (p.r != null ? '<span>' + t('racion') + '<b>' + precio(p.r) + '</b></span>' : '');
      return '<a class="estrella" href="#' + x.s.id + '" data-abrir-carta="' + x.c.id + '">' +
        '<figure><img src="img/' + p.foto + '.webp" alt="' + esc(p.n) + '" loading="lazy" width="800" height="850"><span class="chapa"><span class="mini-bandera ' + (x.c.id === 'peru' ? 'pe' : 'es') + '"></span>' + esc(x.s[estado.lang]) + '</span></figure>' +
        '<div class="estrella-cuerpo"><h3>' + esc(p.n) + '</h3><p>' + esc(estado.lang === 'en' ? p.en : p.d) + '</p><div class="precio-linea">' + pr + '</div></div></a>';
    }).join('');
  }

  function pintarTodo() {
    pintarSelector();
    pintarAlergenos();
    pintarCarta();
    pintarEstrellas();
  }

  /* chip activo según la sección que se está leyendo */
  var obs;
  function observarSecciones() {
    if (obs) obs.disconnect();
    if (!('IntersectionObserver' in window)) return;
    obs = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return;
        $$('.chip', chips).forEach(function (c) { c.classList.toggle('activo', c.getAttribute('data-sec') === e.target.id); });
        var act = $('.chip.activo', chips);
        if (act) chips.scrollTo({ left: act.offsetLeft - 8, behavior: 'smooth' });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    $$('.carta-seccion', cuerpo).forEach(function (s) { obs.observe(s); });
  }

  function cambiarCocina(id, bajar) {
    if (estado.busqueda) cerrarBusqueda();
    estado.cocina = id;
    pintarSelector();
    pintarCarta();
    if (bajar) $('#carta').scrollIntoView({ behavior: 'smooth' });
  }

  /* pestañas */
  $$('.selector [role="tab"]').forEach(function (b) {
    b.addEventListener('click', function () { cambiarCocina(b.getAttribute('data-cocina')); });
    b.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var otro = estado.cocina === 'peru' ? 'sevilla' : 'peru';
      cambiarCocina(otro);
      $('#tab-' + otro).focus();
    });
  });

  /* enlaces que abren la carta en una cocina concreta */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-abrir-carta]');
    if (!a) return;
    var id = a.getAttribute('data-abrir-carta');
    var destino = a.getAttribute('href');
    e.preventDefault();
    if (estado.busqueda) cerrarBusqueda();
    estado.cocina = id;
    pintarSelector();
    pintarCarta();
    var el = destino && destino !== '#carta' ? $(destino) : $('#carta');
    (el || $('#carta')).scrollIntoView({ behavior: 'smooth' });
  });

  /* buscador */
  var btnBuscar = $('#btn-buscar');
  var cajaBuscar = $('#carta-busqueda');
  var inputBuscar = $('#buscar');
  function cerrarBusqueda() {
    estado.busqueda = '';
    inputBuscar.value = '';
    cajaBuscar.hidden = true;
    btnBuscar.setAttribute('aria-expanded', 'false');
  }
  btnBuscar.addEventListener('click', function () {
    if (cajaBuscar.hidden) {
      cajaBuscar.hidden = false;
      btnBuscar.setAttribute('aria-expanded', 'true');
      inputBuscar.focus();
    } else { cerrarBusqueda(); pintarCarta(); }
  });
  $('#buscar-cerrar').addEventListener('click', function () { cerrarBusqueda(); pintarCarta(); btnBuscar.focus(); });
  var temp;
  inputBuscar.addEventListener('input', function () {
    clearTimeout(temp);
    temp = setTimeout(function () {
      estado.busqueda = sinTildes(inputBuscar.value.trim());
      pintarCarta();
    }, 120);
  });
  inputBuscar.addEventListener('keydown', function (e) { if (e.key === 'Escape') { cerrarBusqueda(); pintarCarta(); btnBuscar.focus(); } });

  /* alérgenos */
  var btnAl = $('#btn-alergenos');
  var panelAl = $('#panel-alergenos');
  btnAl.addEventListener('click', function () {
    var abrir = panelAl.hidden;
    panelAl.hidden = !abrir;
    btnAl.setAttribute('aria-expanded', abrir ? 'true' : 'false');
  });
  $('#pa-lista').addEventListener('change', function (e) {
    var n = +e.target.value;
    if (e.target.checked) estado.quitar.add(n); else estado.quitar.delete(n);
    var num = $('#alerg-num');
    num.textContent = estado.quitar.size;
    num.hidden = !estado.quitar.size;
    pintarCarta();
  });
  $('#pa-limpiar').addEventListener('click', function () {
    estado.quitar.clear();
    pintarAlergenos();
    pintarCarta();
  });

  /* ───────────── visor de fotos ───────────── */
  var visor = $('#visor');
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-foto]');
    if (!b) return;
    var img = $('img', visor);
    img.src = b.getAttribute('data-foto');
    var interna = $('img', b);
    img.alt = (interna && interna.alt) || '';
    if (visor.showModal) visor.showModal(); else window.open(img.src, '_blank');
  });
  $('.visor-cerrar').addEventListener('click', function () { visor.close(); });
  visor.addEventListener('click', function (e) { if (e.target === visor) visor.close(); });

  /* ───────────── cabecera, menú móvil, barra móvil ───────────── */
  var cab = $('#cabecera');
  var ham = $('#hamburguesa');
  var menu = $('#menu');
  ham.addEventListener('click', function () {
    var abrir = ham.getAttribute('aria-expanded') !== 'true';
    ham.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    menu.classList.toggle('abierto', abrir);
  });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { ham.setAttribute('aria-expanded', 'false'); menu.classList.remove('abierto'); }); });

  var bm = $('.barra-movil');
  var portada = $('#inicio');
  function alScroll() {
    var y = window.scrollY;
    cab.classList.toggle('con-borde', y > 10);
    bm.classList.toggle('visible', y > portada.offsetHeight * 0.55);
  }
  window.addEventListener('scroll', alScroll, { passive: true });

  /* enlace activo del menú */
  if ('IntersectionObserver' in window) {
    var navObs = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return;
        $$('a', menu).forEach(function (a) { a.classList.toggle('activo', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['carta', 'casa', 'barra', 'visitanos'].forEach(function (id) { var el = document.getElementById(id); if (el) navObs.observe(el); });

    var revObs = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visto'); revObs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.revelar').forEach(function (el) { revObs.observe(el); });
  } else {
    $$('.revelar').forEach(function (el) { el.classList.add('visto'); });
  }

  /* cinta: se duplica para que el bucle no tenga corte */
  var pista = $('.cinta-pista');
  pista.innerHTML += pista.innerHTML;

  /* ───────────── reserva por WhatsApp ───────────── */
  var form = $('#form-reserva');
  var hoy = new Date();
  var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  form.dia.min = iso(hoy);
  form.dia.value = iso(hoy);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#form-error');
    err.hidden = true;
    $$('.mal', form).forEach(function (x) { x.classList.remove('mal'); });
    var nombre = form.nombre.value.trim();
    var dia = form.dia.value;
    var fallo = null, campo = null;
    if (!nombre) { fallo = t('errNombre'); campo = form.nombre; }
    else if (!dia) { fallo = t('errDia'); campo = form.dia; }
    else if (dia < iso(hoy)) { fallo = t('errPasado'); campo = form.dia; }
    if (fallo) { err.textContent = fallo; err.hidden = false; campo.classList.add('mal'); campo.focus(); return; }

    var fecha = new Date(dia + 'T12:00:00');
    var diaTxt = fecha.toLocaleDateString(estado.lang === 'en' ? 'en-GB' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    var zonaEl = form.querySelector('input[name="zona"]:checked');
    var zonaTxt = zonaEl ? zonaEl.nextElementSibling.textContent : '';
    var texto = UI[estado.lang].msg({
      nombre: nombre, personas: form.personas.value, dia: diaTxt, hora: form.hora.value,
      zona: zonaTxt, notas: form.notas.value.trim()
    });
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
  });

  /* ───────────── arranque ───────────── */
  $('#anio').textContent = new Date().getFullYear();
  $('#idioma').addEventListener('click', function () { aplicarIdioma(estado.lang === 'es' ? 'en' : 'es'); });

  var params = new URLSearchParams(location.search);
  var langIni = params.get('lang') || leer('flor-lang') || ((navigator.language || 'es').slice(0, 2) === 'es' ? 'es' : (navigator.language ? 'en' : 'es'));
  if (location.hash === '#carta-sevilla' || location.hash === '#carta-espanola') estado.cocina = 'sevilla';
  aplicarIdioma(langIni === 'en' ? 'en' : 'es');

  // QR de mesa: /#carta, /#carta-peru o /#carta-sevilla
  if (/^#carta/.test(location.hash)) {
    setTimeout(function () { $('#carta').scrollIntoView(); }, 50);
  }
  alScroll();
})();
