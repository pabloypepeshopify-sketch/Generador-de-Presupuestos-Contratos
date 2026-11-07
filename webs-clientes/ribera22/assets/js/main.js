/* Ribera22 Copas & Cocktails — main.js (sin dependencias) */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, body = doc.body;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Storage seguro ---------- */
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- Toast ---------- */
  var toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = doc.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("is-show");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("is-show"); }, 2800);
  }

  /* ---------- i18n ES/EN ---------- */
  var DICT = window.R22_I18N || {};
  var LANGS = ["es", "en", "de", "fr"];
  var lang = "es";
  function dict() { return DICT[lang] || {}; }
  function applyLang(l) {
    lang = LANGS.indexOf(l) > 0 ? l : "es";
    root.lang = lang;
    var D = dict();
    doc.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (el._es === undefined) el._es = el.innerHTML;
      el.innerHTML = D[k] ? D[k] : el._es;
    });
    doc.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":"), attr = p[0], k = p[1];
        if (!attr || !k) return;
        el._esAttr = el._esAttr || {};
        if (el._esAttr[attr] === undefined) el._esAttr[attr] = el.getAttribute(attr);
        el.setAttribute(attr, D[k] ? D[k] : el._esAttr[attr]);
      });
    });
    doc.querySelectorAll(".lang button[data-lang]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang)); });
    doc.querySelectorAll("[data-lang-current]").forEach(function (el) { el.textContent = lang.toUpperCase(); });
    store("r22-lang", lang);
  }
  var qsLang = (location.search.match(/[?&]lang=(es|en|de|fr)/) || [])[1];
  var initial = qsLang || store("r22-lang") || "es";
  /* Desplegable de idioma */
  doc.querySelectorAll(".lang").forEach(function (box) {
    var toggle = box.querySelector(".lang__toggle"), menu = box.querySelector(".lang__menu");
    function setOpen(o) { box.classList.toggle("is-open", o); if (toggle) toggle.setAttribute("aria-expanded", String(o)); if (menu) menu.hidden = !o; }
    if (toggle) toggle.addEventListener("click", function (e) { e.stopPropagation(); setOpen(!box.classList.contains("is-open")); });
    box.querySelectorAll("button[data-lang]").forEach(function (b) {
      b.addEventListener("click", function () { applyLang(b.getAttribute("data-lang")); setOpen(false); if (toggle) toggle.focus(); });
    });
    doc.addEventListener("click", function (e) { if (!box.contains(e.target)) setOpen(false); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    setOpen(false);
  });
  applyLang(initial);
  function t(k, es) { var v = dict()[k]; return v ? v : es; }

  /* ---------- Cabecera que se esconde al bajar ---------- */
  var lastY = window.scrollY || 0, hideTick = false;
  function headerAuto() {
    var y = window.scrollY || 0, hdr = doc.querySelector(".site-header");
    if (hdr && !reduced && !body.classList.contains("menu-open") && !body.classList.contains("lb-open")) {
      if (y > 260 && y > lastY + 6) hdr.classList.add("is-hidden");
      else if (y < lastY - 6 || y < 140) hdr.classList.remove("is-hidden");
    }
    lastY = y; hideTick = false;
  }
  window.addEventListener("scroll", function () { if (!hideTick) { hideTick = true; requestAnimationFrame(headerAuto); } }, { passive: true });

  /* ---------- Transición suave entre páginas ---------- */
  if (!reduced && !(doc.startViewTransition)) {
    doc.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest("a");
      if (!a) return;
      var href = a.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#" || a.target === "_blank" || a.hasAttribute("download")) return;
      if (a.origin !== location.origin || /^(mailto|tel|javascript):/i.test(href)) return;
      if (a.pathname === location.pathname && a.search === location.search) return;
      e.preventDefault();
      body.classList.add("is-leaving");
      setTimeout(function () { location.href = a.href; }, 200);
    });
    window.addEventListener("pageshow", function (e) { if (e.persisted) body.classList.remove("is-leaving"); });
  }

  /* ---------- Header scroll ---------- */
  var header = doc.querySelector(".site-header");
  var bar = doc.querySelector(".action-bar");
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || 0;
    if (header) header.classList.toggle("is-scrolled", y > 24);
    if (bar) bar.classList.toggle("is-visible", y > 140 || !doc.querySelector(".hero"));
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Menú móvil ---------- */
  var burger = doc.querySelector(".burger"), menu = doc.getElementById("mobile-menu");
  function setMenu(open) {
    body.classList.toggle("menu-open", open);
    if (burger) { burger.setAttribute("aria-expanded", String(open)); burger.setAttribute("aria-label", open ? t("ui.close_menu", "Cerrar menú") : t("ui.open_menu", "Abrir menú")); }
    if (menu) { menu.setAttribute("aria-hidden", String(!open)); if (open) { var f = menu.querySelector("a"); f && setTimeout(function () { f.focus(); }, 60); } }
    if (!open && burger && menu && menu.contains(doc.activeElement)) burger.focus();
  }
  if (burger) burger.addEventListener("click", function () { setMenu(!body.classList.contains("menu-open")); });
  if (menu) menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && body.classList.contains("menu-open")) setMenu(false); });
  window.addEventListener("resize", function () { if (window.innerWidth >= 1000 && body.classList.contains("menu-open")) setMenu(false); });

  /* ---------- Reveal on scroll ---------- */
  var reveals = doc.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else { reveals.forEach(function (el) { el.classList.add("is-in"); }); }

  /* ---------- Enlaces con datos pendientes ---------- */
  doc.querySelectorAll('a[href*="PENDIENTE"]').forEach(function (a) {
    a.classList.add("is-pending");
    a.setAttribute("aria-disabled", "true");
    a.addEventListener("click", function (e) { e.preventDefault(); toast(t("ui.pending", "Dato pendiente de confirmar por el cliente")); });
  });

  /* ---------- Horario: marcar hoy ---------- */
  var today = doc.querySelector('.hours tr[data-dow="' + new Date().getDay() + '"]');
  if (today) today.classList.add("is-today");

  /* ---------- Año footer ---------- */
  doc.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Mapa (carga bajo demanda → sin cookies de terceros hasta click) ---------- */
  doc.querySelectorAll("[data-map]").forEach(function (wrap) {
    var btn = wrap.querySelector("[data-map-load]");
    function load() {
      if (wrap.classList.contains("is-loaded")) return;
      var f = doc.createElement("iframe");
      f.src = wrap.getAttribute("data-map");
      f.width = "100%"; f.height = "400"; f.style.border = "0"; f.loading = "lazy";
      f.referrerPolicy = "no-referrer-when-downgrade";
      f.title = t("contact.map_title", "Mapa de Ribera22 en Plaza del Cabildo, Sanlúcar de Barrameda");
      f.setAttribute("allowfullscreen", "");
      wrap.appendChild(f); wrap.classList.add("is-loaded");
    }
    if (store("r22-maps") === "1") load();
    if (btn) btn.addEventListener("click", function () { store("r22-maps", "1"); load(); });
  });

  /* ---------- Carta: scrollspy + filtro sin alcohol ---------- */
  var chips = doc.querySelectorAll(".menu-nav [data-target]");
  if (chips.length) {
    var sections = [];
    chips.forEach(function (c) { var s = doc.getElementById(c.getAttribute("data-target")); if (s) sections.push({ chip: c, sec: s }); });
    var navInner = doc.querySelector(".menu-nav__inner");
    var current = null;
    function setActive(chip) {
      if (current === chip) return; current = chip;
      chips.forEach(function (c) { c.classList.toggle("is-active", c === chip); c.removeAttribute("aria-current"); });
      if (chip) {
        chip.setAttribute("aria-current", "true");
        if (navInner) {
          var l = chip.offsetLeft - navInner.clientWidth / 2 + chip.clientWidth / 2;
          navInner.scrollTo({ left: l, behavior: reduced ? "auto" : "smooth" });
        }
      }
    }
    function spy() {
      var y = window.scrollY + (header ? header.offsetHeight : 70) + 90, active = sections[0] && sections[0].chip;
      sections.forEach(function (o) { if (o.sec.getBoundingClientRect().top + window.scrollY <= y) active = o.chip; });
      setActive(active);
    }
    window.addEventListener("scroll", function () { requestAnimationFrame(spy); }, { passive: true });
    spy();

    var freeBtn = doc.querySelector("[data-filter-free]");
    if (freeBtn) freeBtn.addEventListener("click", function () {
      var on = freeBtn.getAttribute("aria-pressed") !== "true";
      freeBtn.setAttribute("aria-pressed", String(on));
      var n = 0;
      doc.querySelectorAll(".menu-item").forEach(function (it) {
        var ok = it.hasAttribute("data-free");
        it.classList.toggle("is-dimmed", on && !ok);
        if (on && ok) n++;
      });
      toast(on ? t("menu.free_on", "Destacados los cócteles con opción sin alcohol") + " (" + n + ")" : t("menu.free_off", "Mostrando toda la carta"));
    });
  }

  /* ---------- Lightbox galería ---------- */
  var items = Array.prototype.slice.call(doc.querySelectorAll("[data-lightbox]"));
  var lb = doc.getElementById("lightbox");
  if (lb && lb.parentNode !== body) body.appendChild(lb); // fuera de <main> para quedar sobre header/barra
  if (items.length && lb) {
    var img = lb.querySelector("img"), cap = lb.querySelector(".lightbox__caption"), counter = lb.querySelector(".lightbox__count");
    var idx = 0, lastFocus = null, startX = null;
    function show(i) {
      idx = (i + items.length) % items.length;
      var it = items[idx];
      img.classList.add("is-swapping");
      var src = it.getAttribute("data-full"), alt = (it.querySelector("img") || {}).alt || "";
      var pre = new Image();
      pre.onload = pre.onerror = function () { img.src = src; img.alt = alt; img.classList.remove("is-swapping"); };
      pre.src = src;
      var c = it.querySelector(".gallery__cap span");
      cap.textContent = c ? c.textContent : alt;
      counter.textContent = (idx + 1) + " / " + items.length;
    }
    function open(i) { lastFocus = doc.activeElement; lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false"); body.style.overflow = "hidden"; show(i); lb.querySelector("[data-lb-close]").focus(); }
    function close() { lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true"); body.style.overflow = ""; lastFocus && lastFocus.focus(); }
    items.forEach(function (it, i) { it.addEventListener("click", function () { open(i); }); });
    lb.querySelector("[data-lb-close]").addEventListener("click", close);
    lb.querySelector("[data-lb-prev]").addEventListener("click", function () { show(idx - 1); });
    lb.querySelector("[data-lb-next]").addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target.classList.contains("lightbox__stage")) close(); });
    doc.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(idx + 1);
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "Tab") { // focus trap
        var f = lb.querySelectorAll("button"), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    lb.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (startX === null) return; var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); startX = null;
    });
  }
})();
