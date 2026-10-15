// Capa común: llamadas RPC a Supabase, mensajes de error y utilidades de UI.
(function () {
  const cfg = window.CARTA_CONFIG || {};

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
    producto_agotado: 'Agotado',
    clave_incorrecta: 'Clave incorrecta.',
    slug_ocupado: 'Ese identificador ya está en uso.',
    slug_no_valido: 'Identificador no válido: solo minúsculas, números y guiones (3-40).',
    nombre_obligatorio: 'El nombre es obligatorio.',
    precio_no_valido: 'Precio no válido (ej.: 3.50).',
    mesa_repetida: 'Ya existe una mesa con ese nombre.',
    color_no_valido: 'Color no válido.',
    rango_no_valido: 'Rango de mesas no válido (máx. 200).',
    web_no_valida: 'La web de la carta debe empezar por https://',
    titular_sin_datos: 'Faltan los datos fiscales del restaurante (gestión → Facturación).',
    facturacion_desactivada: 'La facturación está desactivada.',
    pagos_no_cuadran: 'Los pagos no cuadran con el total. Revisa importes y propina.',
    pagos_no_validos: 'Forma de pago o importe no válido.',
    entregado_insuficiente: 'El importe entregado no llega al total.',
    pedidos_ya_cobrados: 'Esta mesa ya se ha cobrado.',
    nada_que_cobrar: 'No hay nada que cobrar en esta mesa.',
    importe_supera_limite_simplificada: 'Importe por encima del límite del ticket: emite factura con NIF.',
    nif_cliente_no_valido: 'El NIF del cliente no es válido.',
    cliente_incompleto: 'Para la factura faltan nombre o domicilio del cliente.',
    serie_bloqueada: 'La serie de facturación está bloqueada.',
    propina_no_valida: 'Propina no válida.',
    nif_no_valido: 'El NIF no es válido.',
    titular_incompleto: 'Faltan datos fiscales obligatorios (razón social, domicilio, tipo de persona).',
    produccion_no_disponible: 'El entorno de producción de la AEAT llega en la Fase 2. De momento, pruebas.',
    filtro_no_valido: 'Revisa las fechas del filtro.',
    lineas_no_validas: 'Selección no válida. Vuelve a abrir el cobro.',
    cantidad_supera_pendiente: 'Esa cantidad ya está cobrada o devuelta. Revisa la selección.',
    mesa_sin_cerrar: 'Esa mesa aún tiene cuenta pendiente: termina de cobrarla antes de devolver.',
    nada_que_rectificar: 'Este ticket ya está devuelto entero.',
    no_rectificable: 'Este documento no se puede devolver.',
    reabrir_solo_total: 'Solo se puede reabrir la mesa si se devuelve el ticket entero.',
    serie_rectificativas_repetida: 'La serie de rectificativas coincide con otra serie de facturación.',
    stock_no_valido: 'Stock no válido (un número entero, 0 o más).',
    ids_no_validos: 'No hay pedidos que mover.',
    pedido_no_encontrado: 'Ese pedido ya no existe o ya se ha cobrado.',
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

  function configurado() {
    return !!cfg.supabaseUrl && !/^REEMPLAZAR/.test(cfg.supabaseUrl);
  }

  async function rpc(fn, args) {
    if (!configurado()) throw new ApiError('sin_config');
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

  // URL pública que se graba en el NFC de cada mesa.
  function urlMesa(codigo) { return location.origin + '/m/' + codigo; }
  function urlRestaurante(slug) { return location.origin + '/r/' + slug; }

  // Netlify inyecta un badge fijo abajo a la derecha. Si está, se marca <html class="nl-badge">
  // para dejarle hueco y que no tape el botón del pedido ni los tickets.
  function vigilarBadge() {
    const marcar = () => document.documentElement.classList.toggle('nl-badge', !!document.getElementById('nl-badge-frame'));
    marcar();
    if ('MutationObserver' in window && document.body) new MutationObserver(marcar).observe(document.body, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigilarBadge);
  else vigilarBadge();

  window.Carta = { rpc, ApiError, configurado, esc, dinero, hace, hora, toast, aplicarColor, store, ALERGENOS, urlMesa, urlRestaurante };
})();
