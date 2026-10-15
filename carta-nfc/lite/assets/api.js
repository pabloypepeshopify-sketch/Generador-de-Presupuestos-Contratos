// Capa común (versión "Solo pedidos"): llamadas RPC a Supabase, mensajes de error, utilidades y tema del bar.
(function () {
  const cfg = window.CARTA_CONFIG || {};

  // Estilo propio por bar (sin tocar la base de datos): slug → tema (assets/tema-<tema>.css).
  // Sin tema, la carta usa el color de marca de Ajustes.
  const TEMAS = { 'martinez-demo': 'martinez' };
  const FUENTES = {
    martinez: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Montserrat:wght@400;500;600;700&display=swap',
  };

  const MENSAJES = {
    restaurante_no_encontrado: 'Este restaurante no está disponible.',
    mesa_no_valida: 'Este NFC/QR de mesa ya no es válido. Pide ayuda al camarero.',
    pedidos_cerrados: 'Ahora mismo no se aceptan pedidos por el móvil. Llama al camarero.',
    pedido_vacio: 'Tu pedido está vacío.',
    pedido_demasiado_grande: 'El pedido es demasiado grande. Divídelo en varios.',
    nota_demasiado_larga: 'La nota es demasiado larga.',
    demasiados_pedidos: 'Demasiados pedidos seguidos desde esta mesa. Espera un minuto.',
    cantidad_no_valida: 'Cantidad no válida.',
    producto_no_valido: 'Algún producto ya no está en la carta. Recarga la página.',
    clave_incorrecta: 'Clave incorrecta.',
    slug_ocupado: 'Ese identificador ya está en uso.',
    slug_no_valido: 'Identificador no válido: solo minúsculas, números y guiones (3-40).',
    nombre_obligatorio: 'El nombre es obligatorio.',
    precio_no_valido: 'Precio no válido (ej.: 3.50).',
    mesa_repetida: 'Ya existe una mesa con ese nombre.',
    color_no_valido: 'Color no válido.',
    rango_no_valido: 'Rango de mesas no válido (máx. 200).',
    filtro_no_valido: 'Revisa las fechas del filtro.',
    pedido_no_encontrado: 'Ese pedido ya no existe.',
    no_encontrado: 'No encontrado. Recarga la página.',
    red: 'Sin conexión. Revisa el WiFi/datos e inténtalo de nuevo.',
  };

  class ApiError extends Error {
    constructor(code, detail) {
      super(code);
      this.code = code;
      this.detail = detail || '';
    }
    get humano() {
      if (this.code === 'producto_agotado') return `Agotado: ${this.detail}. Quítalo del pedido.`;
      return MENSAJES[this.code] || 'Algo ha fallado. Inténtalo de nuevo.';
    }
  }

  async function rpc(fn, args) {
    const headers = { 'Content-Type': 'application/json', apikey: cfg.supabaseKey };
    // Las claves legacy (JWT) también van en Authorization; las sb_publishable_ solo en apikey.
    if (cfg.supabaseKey && !cfg.supabaseKey.startsWith('sb_')) headers.Authorization = 'Bearer ' + cfg.supabaseKey;
    let res;
    try {
      res = await fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
        method: 'POST', headers, body: JSON.stringify(args || {}), cache: 'no-store',
      });
    } catch (e) {
      throw new ApiError('red');
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const msg = (data && data.message) || 'error';
      const [code, ...rest] = msg.split(':');
      throw new ApiError(code, rest.join(':'));
    }
    return data;
  }

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtCache = {};
  function dinero(n, moneda) {
    const m = moneda || 'EUR';
    fmtCache[m] = fmtCache[m] || new Intl.NumberFormat('es-ES', { style: 'currency', currency: m });
    return fmtCache[m].format(Number(n || 0));
  }

  function hace(fecha, ahora) {
    const s = Math.max(0, Math.round(((ahora || Date.now()) - new Date(fecha).getTime()) / 1000));
    if (s < 60) return 'ahora';
    const m = Math.floor(s / 60);
    if (m < 60) return `hace ${m} min`;
    return `hace ${Math.floor(m / 60)} h ${m % 60} min`;
  }

  function hora(fecha) {
    return new Date(fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  let toastTimer;
  function toast(msg, tipo) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'toast show' + (tipo === 'error' ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast' + (tipo === 'error' ? ' error' : ''); }, 3200);
  }

  // Color de marca del restaurante + color de texto legible encima.
  function aplicarColor(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    document.documentElement.style.setProperty('--brand', hex);
    document.documentElement.style.setProperty('--brand-ink', lum > 0.62 ? '#1f1a14' : '#ffffff');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', hex);
  }

  function aplicarTema(slug) {
    const tema = TEMAS[slug];
    if (!tema || document.documentElement.dataset.tema === tema) return;
    document.documentElement.dataset.tema = tema;
    [FUENTES[tema], `/assets/tema-${tema}.css`].filter(Boolean).forEach((href) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      document.head.appendChild(l);
    });
  }

  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* modo privado */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* modo privado */ } },
  };

  const ALERGENOS = {
    gluten: 'Gluten', crustaceos: 'Crustáceos', huevo: 'Huevo', pescado: 'Pescado', cacahuete: 'Cacahuete',
    soja: 'Soja', lacteos: 'Lácteos', frutos_cascara: 'Frutos de cáscara', apio: 'Apio', mostaza: 'Mostaza',
    sesamo: 'Sésamo', sulfitos: 'Sulfitos', altramuces: 'Altramuces', moluscos: 'Moluscos',
  };

  // URL pública que se graba en el NFC de cada mesa y la de la carta general.
  function urlMesa(codigo) { return location.origin + '/m/' + codigo; }
  function urlRestaurante(slug) { return location.origin + '/r/' + slug; }

  // QR en SVG (vendor/qrcode.js, cargado solo en las páginas que lo usan).
  function qr(url) {
    const q = window.qrcode(0, 'M');
    q.addData(url);
    q.make();
    return q;
  }

  // Imprimir (ticket 80 mm, hoja de QR…): en el móvil, en una ventana propia (imprimir desde un iframe
  // oculto no es fiable en iPhone/Android); en ordenador, en un iframe sin salir de la página.
  function imprimir(html, css) {
    const doc = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Imprimir</title><style>${css || ''}</style></head><body>${html}</body></html>`;
    if (window.matchMedia('(max-width: 760px)').matches) {
      const w = window.open('', '_blank');
      if (!w) { toast('Permite las ventanas emergentes para imprimir.', 'error'); return; }
      w.document.write(doc);
      w.document.close();
      setTimeout(() => { w.focus(); w.print(); }, 300);
      return;
    }
    let f = document.getElementById('print-frame');
    if (!f) {
      f = document.createElement('iframe');
      f.id = 'print-frame';
      f.title = 'Impresión';
      f.tabIndex = -1;
      f.setAttribute('aria-hidden', 'true');
      f.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
      document.body.appendChild(f);
    }
    f.contentDocument.open();
    f.contentDocument.write(doc);
    f.contentDocument.close();
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); }, 50);
  }

  // Netlify inyecta un badge fijo abajo a la derecha. Si está, se marca <html class="nl-badge">
  // para dejarle hueco y que no tape el botón del pedido.
  function vigilarBadge() {
    const marcar = () => document.documentElement.classList.toggle('nl-badge', !!document.getElementById('nl-badge-frame'));
    marcar();
    if ('MutationObserver' in window && document.body) new MutationObserver(marcar).observe(document.body, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigilarBadge);
  else vigilarBadge();

  window.Carta = { rpc, esc, dinero, hace, hora, toast, aplicarColor, aplicarTema, store, ALERGENOS, urlMesa, urlRestaurante, qr, imprimir };
})();
