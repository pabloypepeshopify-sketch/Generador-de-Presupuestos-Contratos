/* Martínez Bar — martinez.js */
(function () {
  "use strict";
  var d = document, b = d.body;
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }


  /* Idioma ES / EN / DE / FR */
  var DICT = window.MZ_EN || {}, LANGS = ["es", "en", "de", "fr"], lang = "es";
  function dict() { return DICT[lang] || {}; }
  function applyLang(l) {
    lang = LANGS.indexOf(l) > 0 ? l : "es"; d.documentElement.lang = lang;
    var D = dict();
    d.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (el._es === undefined) el._es = el.innerHTML;
      var k = el.getAttribute("data-i18n");
      el.innerHTML = D[k] !== undefined ? D[k] : el._es;
    });
    d.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":"); if (!p[1]) return;
        el._esA = el._esA || {}; if (el._esA[p[0]] === undefined) el._esA[p[0]] = el.getAttribute(p[0]);
        el.setAttribute(p[0], D[p[1]] !== undefined ? D[p[1]] : el._esA[p[0]]);
      });
    });
    d.querySelectorAll(".lang button[data-lang]").forEach(function (bt) { bt.setAttribute("aria-pressed", String(bt.getAttribute("data-lang") === lang)); });
    d.querySelectorAll("[data-lang-current]").forEach(function (el) { el.textContent = lang.toUpperCase(); });
    store("mz-lang", lang);
  }
  d.querySelectorAll(".lang").forEach(function (box) {
    var toggle = box.querySelector(".lang__toggle"), menu = box.querySelector(".lang__menu");
    function setOpen(o) { box.classList.toggle("is-open", o); if (toggle) toggle.setAttribute("aria-expanded", String(o)); if (menu) menu.hidden = !o; }
    if (toggle) toggle.addEventListener("click", function (e) { e.stopPropagation(); setOpen(!box.classList.contains("is-open")); });
    box.querySelectorAll("button[data-lang]").forEach(function (bt) { bt.addEventListener("click", function () { applyLang(bt.getAttribute("data-lang")); setOpen(false); if (toggle) toggle.focus(); }); });
    d.addEventListener("click", function (e) { if (!box.contains(e.target)) setOpen(false); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    setOpen(false);
  });
  var qs = (location.search.match(/[?&]lang=(es|en|de|fr)/) || [])[1];
  applyLang(qs || store("mz-lang") || "es");

  /* Header sólido al hacer scroll */
  var hdr = d.querySelector(".hdr");
  function onScroll() { if (hdr) hdr.classList.toggle("is-solid", scrollY > 30 || b.classList.contains("force-solid")); }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* Menú móvil */
  var burger = d.querySelector(".burger"), drawer = d.getElementById("drawer");
  function setMenu(open) {
    b.classList.toggle("menu-open", open);
    if (burger) { burger.setAttribute("aria-expanded", String(open)); burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú"); }
    if (drawer) drawer.setAttribute("aria-hidden", String(!open));
    if (hdr) hdr.classList.toggle("is-solid", open || scrollY > 30);
  }
  if (burger) burger.addEventListener("click", function () { setMenu(!b.classList.contains("menu-open")); });
  if (drawer) drawer.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  d.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* Entradas suaves */
  var rv = d.querySelectorAll(".rv");
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -6% 0px" });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add("in"); });

  /* Posavasos: gira con el scroll */
  var coaster = d.querySelector(".coaster > svg");
  if (coaster && !reduced) {
    var tick = false;
    addEventListener("scroll", function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () { coaster.style.transform = "rotate(" + (scrollY * 0.12) + "deg)"; tick = false; });
    }, { passive: true });
  }

  /* Tira de galería */
  var strip = d.querySelector(".strip");
  if (strip) {
    var step = function () { var f = strip.querySelector("figure"); return f ? f.getBoundingClientRect().width + 14 : 300; };
    d.querySelectorAll("[data-strip]").forEach(function (btn) {
      btn.addEventListener("click", function () { strip.scrollBy({ left: step() * Number(btn.getAttribute("data-strip")), behavior: reduced ? "auto" : "smooth" }); });
    });
    var down = false, sx = 0, sl = 0, moved = false;
    strip.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") return; down = true; moved = false; sx = e.clientX; sl = strip.scrollLeft; strip.style.scrollSnapType = "none"; });
    addEventListener("pointermove", function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 3) moved = true; strip.scrollLeft = sl - dx; });
    addEventListener("pointerup", function () { if (!down) return; down = false; strip.style.scrollSnapType = ""; });
  }

  /* Mapa: se carga al pulsar (sin cookies de Google antes) */
  d.querySelectorAll("[data-map]").forEach(function (m) {
    function load() {
      if (m.classList.contains("is-on")) return;
      var f = d.createElement("iframe");
      f.src = m.getAttribute("data-map"); f.title = "Mapa de Martínez Bar en la Plaza del Cabildo";
      f.loading = "lazy"; f.referrerPolicy = "no-referrer-when-downgrade"; f.setAttribute("allowfullscreen", "");
      m.appendChild(f); m.classList.add("is-on");
    }
    if (store("mz-map") === "1") load();
    var btn = m.querySelector("button"); if (btn) btn.addEventListener("click", function () { store("mz-map", "1"); load(); });
  });

  /* Carta: pestañas Cocina / Coctelería (con #hash) + categorías activas */
  var tabs = d.querySelectorAll(".switch__tab");
  if (tabs.length) {
    var panes = d.querySelectorAll(".pane");
    function show(id, scroll) {
      var found = false;
      tabs.forEach(function (t) { var on = t.getAttribute("aria-controls") === id; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; if (on) found = true; });
      if (!found) return false;
      panes.forEach(function (p) { p.hidden = p.id !== id; });
      if (scroll) { var sw = d.querySelector(".switch"); scrollTo({ top: sw.offsetTop - hdr.offsetHeight + 1, behavior: "auto" }); }
      spy();
      return true;
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { show(t.getAttribute("aria-controls"), true); history.replaceState(null, "", "#" + t.getAttribute("aria-controls")); });
      t.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        var n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); n.click();
      });
    });
    function fromHash() {
      var h = location.hash.slice(1); if (!h) return;
      if (show(h, true)) return;
      var sec = d.getElementById(h);
      if (sec) { var pane = sec.closest(".pane"); if (pane) { show(pane.id, false); setTimeout(function () { sec.scrollIntoView(); }, 0); } }
    }
    function spy() {
      var pane = d.querySelector(".pane:not([hidden])"); if (!pane) return;
      var links = d.querySelectorAll('.cats[data-for="' + pane.id + '"] a');
      d.querySelectorAll(".cats").forEach(function (c) { c.hidden = c.getAttribute("data-for") !== pane.id; });
      var y = scrollY + innerHeight * 0.35, cur = null;
      links.forEach(function (a) { var s = d.getElementById(a.getAttribute("href").slice(1)); if (s && s.getBoundingClientRect().top + scrollY <= y) cur = a; });
      links.forEach(function (a) { a.classList.toggle("is-on", a === cur); });
      if (cur) { var bar = cur.parentNode; var l = cur.offsetLeft - bar.clientWidth / 2 + cur.clientWidth / 2; if (Math.abs(bar.scrollLeft - l) > 30) bar.scrollTo({ left: l, behavior: "smooth" }); }
    }
    addEventListener("scroll", function () { requestAnimationFrame(spy); }, { passive: true });
    addEventListener("hashchange", fromHash);
    fromHash(); spy();
  }

  d.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
