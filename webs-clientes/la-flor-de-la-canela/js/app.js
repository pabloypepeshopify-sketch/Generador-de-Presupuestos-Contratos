/* La Flor de la Canela · lógica de la web y de la carta digital */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var WA = '34618012208';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var guardar = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var leer = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };

  var T = window.TRAD;
  var IDIOMAS = T.idiomas.map(function (i) { return i.id; });

  /* ───────────── textos que pinta el JS ───────────── */
  var mensajeES = function (f) {
    return 'Hola, quería reservar mesa en La Flor de la Canela.\n\n· Nombre: ' + f.nombre + '\n· Personas: ' + f.personas +
      '\n· Día: ' + f.dia + '\n· Hora: ' + f.hora + '\n· Zona: ' + f.zona + (f.notas ? '\n· Notas: ' + f.notas : '') +
      (f.idioma ? '\n· Idioma del cliente: ' + f.idioma : '') + '\n\n¡Gracias!';
  };
  var UI = {
    es: { tapa: 'Tapa', racion: 'Ración', precio: 'Precio', casa: 'De la casa', consulta: 'Alérgenos: consulta al personal',
          precioBarra: 'Precio en barra', vacio: 'No hay platos que coincidan.', vacioSub: 'Prueba con otra palabra o quita algún filtro.',
          aviso: 'La cocina española, las tartas y las bebidas aún no tienen los alérgenos en carta, así que con filtros activos no se muestran. Pregunta y te lo decimos.',
          platos: 'platos', bebidas: 'bebidas', errNombre: 'Pon tu nombre para la reserva.', errDia: 'Elige el día.', errPasado: 'Ese día ya ha pasado.',
          locale: 'es-ES', msg: mensajeES },
    en: { tapa: 'Tapa', racion: 'Plate', precio: 'Price', casa: 'House favourite', consulta: 'Allergens: please ask your server',
          precioBarra: 'Ask at the bar', vacio: 'No dishes match.', vacioSub: 'Try another word or remove a filter.',
          aviso: 'Allergen info for the Spanish kitchen, cakes and drinks isn’t on the menu yet, so those are hidden while filters are on. Just ask us.',
          platos: 'dishes', bebidas: 'drinks', errNombre: 'Please add your name.', errDia: 'Pick a day.', errPasado: 'That day has already passed.',
          locale: 'en-GB',
          msg: function (f) { return 'Hi! I’d like to book a table at La Flor de la Canela.\n\n· Name: ' + f.nombre + '\n· Guests: ' + f.personas + '\n· Day: ' + f.dia + '\n· Time: ' + f.hora + '\n· Area: ' + f.zona + (f.notas ? '\n· Notes: ' + f.notas : '') + '\n\nThank you!'; } },
    ja: { tapa: 'タパ', racion: 'ラシオン', precio: '価格', casa: 'おすすめ', consulta: 'アレルゲン：スタッフにお尋ねください',
          precioBarra: '価格はスタッフへ', vacio: '該当する料理がありません。', vacioSub: '別の言葉で検索するか、フィルターを解除してください。',
          aviso: 'スペイン料理・ケーキ・ドリンクはメニューにアレルゲン情報がないため、フィルター使用中は表示されません。スタッフにお尋ねください。',
          platos: '品', bebidas: '種', errNombre: 'お名前を入力してください。', errDia: '日付を選んでください。', errPasado: 'その日はすでに過ぎています。',
          locale: 'es-ES', idiomaCliente: 'japonés', msg: mensajeES },
    zh: { tapa: '小份', racion: '大份', precio: '价格', casa: '招牌', consulta: '过敏原：请咨询服务员',
          precioBarra: '价格请咨询吧台', vacio: '没有符合条件的菜品。', vacioSub: '请换个关键词或清除筛选。',
          aviso: '西班牙菜、蛋糕和饮品暂无过敏原信息，筛选时不会显示。请咨询服务员。',
          platos: '道', bebidas: '款', errNombre: '请填写姓名。', errDia: '请选择日期。', errPasado: '该日期已过。',
          locale: 'es-ES', idiomaCliente: 'chino', msg: mensajeES }
  };

  var estado = { lang: 'es', cocina: 'peru', busqueda: '', quitar: new Set() };

  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var precio = function (n) { return n.toFixed(2).replace('.', ',') + ' €'; };
  var sinTildes = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var t = function (k) { return UI[estado.lang][k]; };
  var cjk = function () { return estado.lang === 'ja' || estado.lang === 'zh'; };

  /* nombres traducidos de la carta */
  var nCocina = function (c) { return c[estado.lang] || (T.cocinas[c.id] && T.cocinas[c.id][estado.lang]) || c.en; };
  var nLema = function (c) { return c.lema[estado.lang] || (T.lemas[c.id] && T.lemas[c.id][estado.lang]) || c.lema.en; };
  var nSeccion = function (s) { return s[estado.lang] || (T.secciones[s.id] && T.secciones[s.id][estado.lang]) || s.en; };
  var nIntro = function (s) { if (!s.intro) return ''; return s.intro[estado.lang] || (T.intros[s.id] && T.intros[s.id][estado.lang]) || s.intro.en; };
  var nAlergeno = function (n) { var a = ALERGENOS[n]; return a[estado.lang] || (T.alergenos[estado.lang] && T.alergenos[estado.lang][n]) || a.en; };
  var nNota = function (nota) { return nota[estado.lang] || (T.notas[nota.es] && T.notas[nota.es][estado.lang]) || nota.en; };
  /* → { sub: nombre traducido (solo ja/zh), d: descripción en el idioma actual } */
  function tradPlato(p) {
    if (estado.lang === 'es') return { sub: '', d: p.d };
    if (estado.lang === 'en') return { sub: '', d: p.en || p.d };
    var x = T.platos[p.n] && T.platos[p.n][estado.lang];
    return x ? { sub: x[0], d: x[1] } : { sub: '', d: p.en || p.d };
  }

  /* ───────────── idioma ───────────── */
  var originales = new Map();
  function aplicarIdioma(lang) {
    if (IDIOMAS.indexOf(lang) === -1) lang = 'es';
    estado.lang = lang;
    var info = T.idiomas.filter(function (i) { return i.id === lang; })[0];
    document.documentElement.lang = info.html;
    var dic = T.textos[lang] || {};
    $$('[data-i18n]').forEach(function (el) {
      if (!originales.has(el)) originales.set(el, el.textContent);
      var k = el.getAttribute('data-i18n');
      el.textContent = lang !== 'es' && dic[k] != null ? dic[k] : originales.get(el);
    });
    $$('[data-i18n-html]').forEach(function (el) {
      if (!originales.has(el)) originales.set(el, el.innerHTML);
      var k = el.getAttribute('data-i18n-html');
      el.innerHTML = lang !== 'es' && dic[k] != null ? dic[k] : originales.get(el);
    });
    $$('[data-i18n-ph]').forEach(function (el) {
      if (!originales.has(el)) originales.set(el, el.placeholder);
      var k = el.getAttribute('data-i18n-ph');
      el.placeholder = lang !== 'es' && dic[k] != null ? dic[k] : originales.get(el);
    });
    $('#idioma-actual').textContent = info.corto;
    $$('#idiomas-lista [data-lang]').forEach(function (b) { b.setAttribute('aria-checked', b.getAttribute('data-lang') === lang ? 'true' : 'false'); });
    guardar('flor-lang', lang);
    pintarTodo();
  }

  /* selector de idioma */
  var btnIdioma = $('#idioma');
  var listaIdiomas = $('#idiomas-lista');
  listaIdiomas.innerHTML = T.idiomas.map(function (i) {
    return '<button type="button" role="menuitemradio" data-lang="' + i.id + '" lang="' + i.html + '">' + esc(i.nombre) + '</button>';
  }).join('');
  function abrirIdiomas(si) {
    listaIdiomas.hidden = !si;
    btnIdioma.setAttribute('aria-expanded', si ? 'true' : 'false');
    if (si) { var act = $('[aria-checked="true"]', listaIdiomas) || $('button', listaIdiomas); act.focus(); }
  }
  btnIdioma.addEventListener('click', function (e) { e.stopPropagation(); abrirIdiomas(listaIdiomas.hidden); });
  listaIdiomas.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lang]');
    if (!b) return;
    aplicarIdioma(b.getAttribute('data-lang'));
    abrirIdiomas(false);
    btnIdioma.focus();
  });
  listaIdiomas.addEventListener('keydown', function (e) {
    var bs = $$('button', listaIdiomas), i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
  });
  document.addEventListener('click', function (e) { if (!listaIdiomas.hidden && !e.target.closest('.idiomas')) abrirIdiomas(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !listaIdiomas.hidden) { abrirIdiomas(false); btnIdioma.focus(); } });

  /* ───────────── carta ───────────── */
  var cuerpo = $('#panel-carta');
  var chips = $('#carta-chips');

  function alergenosHTML(p, s) {
    if (!p.a) return s.consulta ? '' : '<span class="al-consulta">' + t('consulta') + '</span>';
    if (!p.a.length) return '';
    return '<div class="plato-alerg">' + p.a.map(function (n) {
      var nom = nAlergeno(n);
      return '<span class="al" style="--c:' + ALERGENOS[n].color + '" title="' + esc(nom) + '"><i>' + n + '</i>' + esc(nom) + '</span>';
    }).join('') + '</div>';
  }

  var conPrecios = window.MOSTRAR_PRECIOS !== false;
  function formatosHTML(p) {
    var f = (p.t != null ? '<span>' + t('tapa') + '</span>' : '') + (p.r != null ? '<span>' + t('racion') + '</span>' : '');
    return f ? '<div class="plato-formatos">' + f + '</div>' : '';
  }
  function preciosHTML(p, s) {
    if (!conPrecios) return s.sinPrecio ? '' : formatosHTML(p);
    if (s.sinPrecio) return '';
    if (p.u != null) return '<div class="plato-precios unico"><span><small>' + t('precio') + '</small>' + precio(p.u) + '</span></div>';
    var c = function (v, et) { return v == null ? '<span class="vacio">—</span>' : '<span><small>' + et + '</small>' + precio(v) + '</span>'; };
    return '<div class="plato-precios">' + c(p.t, t('tapa')) + c(p.r, t('racion')) + '</div>';
  }

  /* Fotos: 'ceviche' → img/ceviche.webp (del local); 'wm:Archivo.jpg' → Wikimedia Commons */
  function fotoUrl(p, mini) {
    if (p.foto.indexOf('wm:') === 0) {
      return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(p.foto.slice(3)) + '?width=' + (mini ? 160 : 1000);
    }
    return 'img/' + p.foto + (mini ? '-mini' : '') + '.webp';
  }

  function platoHTML(p, s) {
    var tr = tradPlato(p);
    var foto = p.foto ? '<button class="plato-foto" type="button" data-foto="' + fotoUrl(p) + '" aria-label="' + esc(p.n) + '"><img src="' + fotoUrl(p, true) + '" alt="" loading="lazy" width="120" height="120"></button>' : '';
    var casa = p.top ? '<span class="plato-casa"><svg><use href="#flor"/></svg>' + t('casa') + '</span>' : '';
    var nota = p.nota ? '<span class="plato-nota">' + esc(nNota(p.nota)) + '</span>' : '';
    return '<article class="plato' + (s.sinPrecio ? ' sin-precio' : '') + '">' +
      '<div class="plato-info">' + foto +
        '<div><h4 class="plato-nombre">' + esc(p.n) + casa + nota + '</h4>' +
        (tr.sub ? '<p class="plato-trad">' + esc(tr.sub) + '</p>' : '') +
        (tr.d ? '<p class="plato-desc">' + esc(tr.d) + '</p>' : '') +
        alergenosHTML(p, s) + '</div>' +
      '</div>' + preciosHTML(p, s) + '</article>';
  }

  function pasaFiltros(p) {
    if (estado.quitar.size) {
      if (!p.a) return false;
      for (var i = 0; i < p.a.length; i++) if (estado.quitar.has(p.a[i])) return false;
    }
    if (estado.busqueda) {
      var x = T.platos[p.n] || {};
      var extra = (x.ja ? x.ja.join(' ') : '') + ' ' + (x.zh ? x.zh.join(' ') : '');
      var txt = sinTildes(p.n + ' ' + p.d + ' ' + p.en + ' ' + extra);
      if (txt.indexOf(estado.busqueda) === -1) return false;
    }
    return true;
  }

  function cabeceraSeccion(s, nombre, num) {
    var unico = s.platos.every(function (p) { return p.u != null; });
    var cols = !conPrecios || s.sinPrecio ? ''
      : '<div class="cs-cols' + (unico ? ' unico' : '') + '">' + (unico ? '<span>' + t('precio') + '</span>' : '<span>' + t('tapa') + '</span><span>' + t('racion') + '</span>') + '</div>';
    var intro = nIntro(s);
    var avisoAl = s.consulta ? '<p class="cs-intro">' + (intro ? esc(intro) + ' ' : '') + '<span>' + t('consulta') + '</span></p>' : (intro ? '<p class="cs-intro">' + esc(intro) + '</p>' : '');
    return '<header class="cs-cabeza"><h3>' + esc(nombre) + ' <small>' + num + ' ' + t(s.bebida ? 'bebidas' : 'platos') + '</small></h3>' + cols + '</header>' + avisoAl;
  }

  function pintarCarta() {
    var buscando = !!estado.busqueda;
    // al buscar se mira en toda la carta a la vez
    var cocinas = buscando ? CARTA : CARTA.filter(function (c) { return c.id === estado.cocina; });
    var html = '';
    var secs = [];
    var ocultasSinDatos = false;

    cocinas.forEach(function (coc) {
      if (!buscando) html += '<p class="carta-lema">' + esc(nLema(coc)) + '</p>';
      coc.secciones.forEach(function (s) {
        var platos = s.platos.filter(pasaFiltros);
        if (estado.quitar.size && s.platos.some(function (p) { return !p.a; })) ocultasSinDatos = true;
        if (!platos.length) return;
        var nombre = nSeccion(s) + (buscando ? ' · ' + nCocina(coc) : '');
        secs.push({ id: s.id, nombre: nSeccion(s) });
        html += '<section class="carta-seccion" id="' + s.id + '">' + cabeceraSeccion(s, nombre, platos.length) +
          platos.map(function (p) { return platoHTML(p, s); }).join('') + '</section>';
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
      return '<label><input type="checkbox" value="' + n + '"' + (estado.quitar.has(+n) ? ' checked' : '') + '><span style="--c:' + ALERGENOS[n].color + '"><i>' + n + '</i>' + esc(nAlergeno(n)) + '</span></label>';
    }).join('');
    $('#leyenda').innerHTML = Object.keys(ALERGENOS).map(function (n) {
      return '<span class="al" style="--c:' + ALERGENOS[n].color + '"><i>' + n + '</i>' + esc(nAlergeno(n)) + '</span>';
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
      var p = x.p, tr = tradPlato(p);
      var pr = !conPrecios ? [p.t != null ? t('tapa') : '', p.r != null ? t('racion') : ''].filter(Boolean).join(' · ')
        : (p.t != null ? '<span>' + t('tapa') + '<b>' + precio(p.t) + '</b></span>' : '') + (p.r != null ? '<span>' + t('racion') + '<b>' + precio(p.r) + '</b></span>' : '');
      return '<a class="estrella" href="#' + x.s.id + '" data-abrir-carta="' + x.c.id + '">' +
        '<figure><img src="' + fotoUrl(p) + '" alt="' + esc(p.n) + '" loading="lazy" width="800" height="850"><span class="chapa"><span class="mini-bandera ' + (x.c.id === 'sevilla' ? 'es' : 'pe') + '"></span>' + esc(nSeccion(x.s)) + '</span></figure>' +
        '<div class="estrella-cuerpo"><h3>' + esc(p.n) + '</h3>' + (tr.sub ? '<p class="estrella-trad">' + esc(tr.sub) + '</p>' : '') +
        '<p>' + esc(tr.d) + '</p><div class="precio-linea">' + pr + '</div></div></a>';
    }).join('');
  }

  function pintarTodo() {
    pintarSelector();
    pintarAlergenos();
    pintarCarta();
    pintarEstrellas();
  }

  /* número de platos de la portada (sin contar bebidas) */
  var nPlatos = 0;
  CARTA.forEach(function (c) { c.secciones.forEach(function (s) { if (!s.bebida) nPlatos += s.platos.length; }); });
  $$('.num-platos').forEach(function (el) { el.textContent = nPlatos; });

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

  function cambiarCocina(id) {
    if (estado.busqueda) cerrarBusqueda();
    estado.cocina = id;
    pintarSelector();
    pintarCarta();
  }

  /* pestañas */
  var ORDEN = CARTA.map(function (c) { return c.id; });
  $$('.selector [role="tab"]').forEach(function (b) {
    b.addEventListener('click', function () { cambiarCocina(b.getAttribute('data-cocina')); });
    b.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var i = ORDEN.indexOf(estado.cocina) + (e.key === 'ArrowRight' ? 1 : -1);
      var otro = ORDEN[(i + ORDEN.length) % ORDEN.length];
      cambiarCocina(otro);
      $('#tab-' + otro).focus();
    });
  });

  /* enlaces que abren la carta en una pestaña concreta */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-abrir-carta]');
    if (!a) return;
    var id = a.getAttribute('data-abrir-carta');
    var destino = a.getAttribute('href');
    e.preventDefault();
    cambiarCocina(id);
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

    // En japonés y chino el mensaje sale en español para que lo lea el personal.
    var enEspanol = t('msg') === mensajeES;
    var fecha = new Date(dia + 'T12:00:00');
    var diaTxt = fecha.toLocaleDateString(t('locale'), { weekday: 'long', day: 'numeric', month: 'long' });
    var zonaEl = form.querySelector('input[name="zona"]:checked');
    var zonaTxt = !zonaEl ? '' : (enEspanol ? (zonaEl.value === 'terraza' ? 'Terraza' : 'Dentro') : zonaEl.nextElementSibling.textContent);
    var texto = t('msg')({
      nombre: nombre, personas: form.personas.value, dia: diaTxt, hora: form.hora.value,
      zona: zonaTxt, notas: form.notas.value.trim(), idioma: t('idiomaCliente') || ''
    });
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
  });

  /* ───────────── arranque ───────────── */
  $('#anio').textContent = new Date().getFullYear();

  function idiomaInicial() {
    var p = new URLSearchParams(location.search).get('lang');
    if (p && IDIOMAS.indexOf(p) > -1) return p;
    var g = leer('flor-lang');
    if (g && IDIOMAS.indexOf(g) > -1) return g;
    var nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
    if (nav === 'es') return 'es';
    if (nav === 'ja' || nav === 'zh') return nav;
    return navigator.language ? 'en' : 'es';
  }

  // QR de mesa: /#carta, /#carta-peru, /#carta-sevilla o /#carta-postres
  if (location.hash === '#carta-sevilla' || location.hash === '#carta-espanola') estado.cocina = 'sevilla';
  if (location.hash === '#carta-postres' || location.hash === '#carta-bebidas') estado.cocina = 'dulce';
  aplicarIdioma(idiomaInicial());

  if (/^#carta/.test(location.hash)) {
    setTimeout(function () { $('#carta').scrollIntoView(); }, 50);
  }
  alScroll();
})();
