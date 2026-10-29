// Página pública: «Analiza tu local gratis» (/) y el informe personal de cada local (/para/<codigo>).
// Habla con la función «informe» de Supabase, que no devuelve nada privado del local.

const API = 'https://jwissdakpdzfdrohsnzk.supabase.co/functions/v1/informe';
const WA = '34656999241';
const app = document.getElementById('app');
const parametros = new URLSearchParams(location.search);
const vistaPrevia = parametros.get('p') === '1'; // el equipo mirando el informe: no cuenta como visita

const num = new Intl.NumberFormat('es-ES');
const nota = (n) => (n == null ? '–' : n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const euros = (n) => (n == null ? '' : Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }));

async function api(cuerpo) {
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(datos.error || 'Algo ha fallado. Inténtalo otra vez.'), { estado: res.status });
  return datos;
}

const guardado = {
  leer(k) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  poner(k, v) {
    try { localStorage.setItem(k, v); } catch { /* sin almacenamiento: no pasa nada */ }
  },
};

const enlaceWa = (texto) => `https://wa.me/${WA}?text=${encodeURIComponent(texto)}`;

// ---------- Informe personal ----------
async function informe(codigo) {
  let d;
  try {
    d = await api({ accion: 'ver', codigo, origen: parametros.get('o') || 'web', vista_previa: vistaPrevia });
  } catch (e) {
    app.innerHTML = `<section class="hero"><h1>Este informe <em class="acento">no existe.</em></h1>
      <p>Puede que el enlace esté mal copiado. Puedes analizar tu local desde cero:</p>
      <a class="btn primario grande" href="/">Analizar mi local gratis</a></section>`;
    return;
  }
  document.title = `${d.nombre} · Informe de Google · VISAX NFC`;
  const textoWa = `Hola, he visto el informe de ${d.nombre} (ref. ${d.codigo}) y quiero saber más.`;
  document.getElementById('cab-wa').href = enlaceWa(textoWa);

  const g = d.google;
  const z = d.zona_cifras;
  const zona = d.zona || z?.zona || 'tu zona';
  const faltan = g && z?.mediana_resenas != null ? z.mediana_resenas - g.resenas : null;
  const productos = [...d.productos].sort((a, b) => /reseñ/i.test(b.nombre) - /reseñ/i.test(a.nombre));
  const estrella = productos[0];

  const diagnostico = [];
  if (g && z) {
    if (faltan > 0) diagnostico.push(`Os faltan unas <b>${num.format(faltan)} reseñas</b> para estar en la mitad alta de ${esc(zona)}.`);
    else diagnostico.push(`Tenéis más reseñas que la mayoría de ${esc(zona)}. Ahora toca que no se escape ninguna.`);
    if (g.nota != null && z.media_nota != null && g.nota < z.media_nota) {
      diagnostico.push(`Vuestra nota (${nota(g.nota)}) está por debajo de la media de la zona (${nota(z.media_nota)}). Cuantas más reseñas dejan los clientes contentos, más pesa lo bueno.`);
    }
  }

  const barras = g && z ? [{ nombre: d.nombre, resenas: g.resenas, nota: g.nota, tu: true }, ...z.top] : [];
  const maximo = Math.max(1, ...barras.map((b) => b.resenas), z?.mediana_resenas ?? 0);

  app.innerHTML = `
    <section class="hero">
      <span class="pildora"><i></i>Informe gratuito · datos públicos de Google Maps</span>
      <h1>${esc(d.nombre)}, así os ven <em class="acento">en Google.</em></h1>
      ${g ? '' : '<p>Aún no tenemos los datos de vuestra ficha, pero esto es lo que podemos hacer por vuestro local.</p>'}
    </section>

    ${g ? `
    <section class="cifras" aria-label="Vuestras cifras">
      <div class="cifra"><small>Vuestra nota</small><b>${nota(g.nota)}<span class="estrella">★</span></b></div>
      <div class="cifra"><small>Vuestras reseñas</small><b>${num.format(g.resenas)}</b></div>
      ${z ? `<div class="cifra"><small>Media de la zona</small><b>${nota(z.media_nota)}<span class="estrella">★</span></b></div>
      <div class="cifra"><small>La mitad de la zona supera</small><b>${num.format(z.mediana_resenas ?? 0)}</b></div>` : ''}
    </section>` : ''}

    ${diagnostico.length ? `<section class="tarjeta diagnostico">${diagnostico.map((p) => `<p>${p}</p>`).join('')}</section>` : ''}

    ${barras.length ? `
    <section class="tarjeta">
      <h2>Reseñas en Google <span class="tenue">· ${esc(zona)}</span></h2>
      <ul class="barras">
        ${barras.map((b) => `<li class="${b.tu ? 'tu' : ''}">
          <span class="b-nombre">${esc(b.tu ? `${b.nombre} (vosotros)` : b.nombre)}</span>
          <span class="b-pista"><span class="b-relleno" style="width:${Math.max(2, (b.resenas / maximo) * 100)}%"></span></span>
          <span class="b-valor">${num.format(b.resenas)} · ${nota(b.nota)}★</span>
        </li>`).join('')}
      </ul>
      ${z.mediana_resenas != null ? `<p class="tenue nota-pie">Comparado con ${num.format(z.resultados)} locales de ${esc(zona)}. La mitad tiene más de ${num.format(z.mediana_resenas)} reseñas.</p>` : ''}
    </section>` : ''}

    <section class="seccion">
      <h2>Cómo conseguir más reseñas <em class="acento">sin pedirlas una a una</em></h2>
      <p class="tenue">Ponéis el expositor en la barra o en las mesas. El cliente acerca el móvil y se abre vuestra ficha de Google, lista para dejar la reseña. Sin app ni pilas, y os llega ya programado.</p>
      ${estrella ? tarjetaProducto(estrella, true) : ''}
      <div class="productos">${productos.slice(1).map((p) => tarjetaProducto(p)).join('')}</div>
    </section>

    <section class="seccion acciones">
      <a class="btn wa grande bloque" href="${enlaceWa(textoWa)}" target="_blank" rel="noopener" data-evento="whatsapp">Hablar por WhatsApp</a>
    </section>

    ${d.chat.activo ? `
    <section class="tarjeta chat" id="chat">
      <h2>Pregúntale al asistente</h2>
      <p class="tenue">Te contesta al momento un asistente virtual. Si prefieres a una persona, díselo.</p>
      <ol class="mensajes" id="mensajes"><li class="msg agente">${esc(d.chat.saludo)}</li></ol>
      <form class="chat-form" id="chat-form">
        <input id="chat-texto" maxlength="1000" autocomplete="off" placeholder="Escribe tu pregunta…" aria-label="Tu mensaje" required>
        <button class="btn primario" aria-label="Enviar">Enviar</button>
      </form>
    </section>` : ''}

    <section class="tarjeta" id="contacto">
      <h2>¿Prefieres que te llamemos?</h2>
      <form class="formulario" id="form-contacto">
        <label class="campo"><span>Tu nombre</span><input name="nombre" maxlength="80" autocomplete="name" required></label>
        <label class="campo"><span>Teléfono</span><input name="telefono" type="tel" inputmode="tel" maxlength="20" autocomplete="tel" placeholder="600 000 000" required></label>
        <label class="campo"><span>¿Algo que debamos saber? <small class="tenue">(opcional)</small></span><textarea name="mensaje" rows="2" maxlength="500"></textarea></label>
        <label class="casilla"><input type="checkbox" name="acepto" required>
          <span>Acepto que VISAX NFC use estos datos para contactarme sobre esta consulta. Más información en la <a href="https://visaxnfc.es/privacidad" target="_blank" rel="noopener">política de privacidad</a>.</span></label>
        <p class="error" id="contacto-error" hidden></p>
        <button class="btn primario grande bloque">Que me llamen</button>
      </form>
    </section>

    ${z?.fecha ? `<p class="tenue nota-pie centro">Datos públicos de Google Maps del ${new Date(z.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}. Informe orientativo.</p>` : ''}
  `;

  app.querySelectorAll('[data-evento]').forEach((a) => a.addEventListener('click', () => {
    api({ accion: 'evento', codigo, tipo: a.dataset.evento, detalle: a.dataset.detalle, vista_previa: vistaPrevia }).catch(() => {});
  }));
  formularioContacto(codigo);
  if (d.chat.activo) chat(codigo);
}

function tarjetaProducto(p, destacado = false) {
  const url = new URL(p.url || 'https://visaxnfc.es');
  url.searchParams.set('utm_source', 'informe');
  url.searchParams.set('utm_medium', parametros.get('o') || 'web');
  return `<article class="producto ${destacado ? 'destacado' : ''}">
    <div><h3>${esc(p.nombre)}</h3><p>${esc(p.descripcion)}</p>
      <p class="precio">${euros(p.precio)}${p.precio_volumen ? ` <small>${esc(p.precio_volumen)}</small>` : ''}</p></div>
    <a class="btn ${destacado ? 'primario' : 'sec'}" href="${esc(url)}" target="_blank" rel="noopener" data-evento="tienda" data-detalle="${esc(p.nombre)}">Ver y pedir</a>
  </article>`;
}

function formularioContacto(codigo) {
  const form = document.getElementById('form-contacto');
  const error = document.getElementById('contacto-error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(form));
    const boton = form.querySelector('button');
    boton.disabled = true;
    error.hidden = true;
    try {
      await api({ accion: 'contacto', codigo, nombre: datos.nombre, telefono: datos.telefono, mensaje: datos.mensaje, acepto: datos.acepto === 'on' });
      form.outerHTML = '<p class="ok">¡Hecho! Te llamamos hoy o el próximo día laborable.</p>';
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
      boton.disabled = false;
    }
  });
}

function chat(codigo) {
  const lista = document.getElementById('mensajes');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-texto');
  const clave = `visax-chat-${codigo}`;
  let conversacion = guardado.leer(clave) || '';
  let ultimo = 0;
  const vistos = new Set();

  const pintar = (mensajes) => {
    for (const m of mensajes) {
      ultimo = Math.max(ultimo, m.id);
      if (vistos.has(m.id)) continue;
      vistos.add(m.id);
      const li = document.createElement('li');
      li.className = `msg ${m.autor === 'cliente' ? 'cliente' : 'agente'}`;
      // Enlaces clicables, el resto como texto
      li.innerHTML = esc(m.texto).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
      lista.append(li);
    }
    lista.scrollTop = lista.scrollHeight;
  };
  // Aviso de la propia página (no viene del servidor ni cuenta para el historial)
  const burbuja = (texto) => {
    const li = document.createElement('li');
    li.className = 'msg agente';
    li.innerHTML = esc(texto).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
    lista.append(li);
    lista.scrollTop = lista.scrollHeight;
  };
  const escribiendo = (si) => {
    lista.querySelector('.escribiendo')?.remove();
    if (si) {
      const li = document.createElement('li');
      li.className = 'msg agente escribiendo';
      li.innerHTML = '<i></i><i></i><i></i>';
      li.setAttribute('aria-label', 'Escribiendo');
      lista.append(li);
      lista.scrollTop = lista.scrollHeight;
    }
  };

  // Recupera la conversación si ya había una en este móvil
  if (conversacion) {
    api({ accion: 'chat_ver', codigo, conversacion_id: conversacion, desde_id: 0 }).then((r) => pintar(r.mensajes)).catch(() => {
      conversacion = '';
    });
  }

  async function esperarRespuesta() {
    for (let i = 0; i < 12; i++) {
      await new Promise((ok) => setTimeout(ok, 3000));
      const r = await api({ accion: 'chat_ver', codigo, conversacion_id: conversacion, desde_id: ultimo }).catch(() => ({ mensajes: [] }));
      if (r.mensajes.some((m) => m.autor !== 'cliente')) return pintar(r.mensajes);
      pintar(r.mensajes);
    }
    burbuja(`Se me está resistiendo la respuesta. Si quieres, escríbenos por WhatsApp: https://wa.me/${WA}`);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';
    input.disabled = true;
    const li = document.createElement('li');
    li.className = 'msg cliente provisional';
    li.textContent = texto;
    lista.append(li);
    escribiendo(true);
    try {
      const r = await api({ accion: 'chat', codigo, conversacion_id: conversacion || undefined, texto, desde_id: ultimo });
      conversacion = r.conversacion_id;
      guardado.poner(clave, conversacion);
      li.remove();
      pintar(r.mensajes);
      if (r.pausado) burbuja('Le he pasado tu mensaje al equipo. Te contestan en cuanto puedan.');
      else if (r.pendiente) {
        escribiendo(true);
        await esperarRespuesta();
      }
    } catch (err) {
      li.classList.remove('provisional');
      burbuja(err.message);
    } finally {
      escribiendo(false);
      input.disabled = false;
      input.focus();
    }
  });
}

// ---------- Analiza tu local ----------
function analiza() {
  app.innerHTML = `
    <section class="hero">
      <span class="pildora"><i></i>Gratis · sin registros · 10 segundos</span>
      <h1>¿Cuántas reseñas le faltan <em class="acento">a tu bar?</em></h1>
      <p>Compara la ficha de Google de tu bar o restaurante con los locales de tu zona y mira lo que te falta para destacar.</p>
    </section>
    <section class="tarjeta">
      <form class="formulario" id="form-buscar">
        <label class="campo"><span>Nombre del local</span><input name="nombre" maxlength="80" placeholder="Bar Manolo" required></label>
        <label class="campo"><span>Ciudad o barrio</span><input name="ciudad" maxlength="60" placeholder="Triana, Sevilla" required></label>
        <p class="error" id="buscar-error" hidden></p>
        <button class="btn primario grande bloque">Analizar mi local</button>
      </form>
      <div id="candidatos"></div>
    </section>
    <section class="seccion pasos">
      <div><b>1</b><p>Buscamos tu local en Google Maps.</p></div>
      <div><b>2</b><p>Lo comparamos con los bares y restaurantes de alrededor.</p></div>
      <div><b>3</b><p>Te enseñamos tu nota, tus reseñas y cuánto te falta.</p></div>
    </section>
    <p class="tenue nota-pie centro">Solo usamos datos públicos de Google Maps.</p>
  `;
  const form = document.getElementById('form-buscar');
  const error = document.getElementById('buscar-error');
  const caja = document.getElementById('candidatos');
  const fallo = (err) => {
    error.innerHTML = err.estado === 503
      ? `${esc(err.message)} <a href="${enlaceWa('Hola, quiero el informe de reseñas de mi local.')}" target="_blank" rel="noopener">Abrir WhatsApp</a>`
      : esc(err.message);
    error.hidden = false;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(form));
    const boton = form.querySelector('button');
    boton.disabled = true;
    error.hidden = true;
    caja.innerHTML = '';
    try {
      const { candidatos } = await api({ accion: 'buscar', nombre: datos.nombre, ciudad: datos.ciudad });
      caja.innerHTML = candidatos.length
        ? `<p class="tenue">¿Cuál es el tuyo?</p><ul class="candidatos">${candidatos.map((c) => `<li><button type="button" class="candidato" data-id="${esc(c.google_id)}"><b>${esc(c.nombre)}</b><small>${esc(c.direccion)}</small></button></li>`).join('')}</ul>`
        : '<p class="tenue">No lo encontramos. Prueba con el nombre tal y como aparece en Google Maps.</p>';
      caja.querySelectorAll('.candidato').forEach((b) => b.addEventListener('click', async () => {
        caja.querySelectorAll('.candidato').forEach((x) => (x.disabled = true));
        b.classList.add('eligiendo');
        b.querySelector('small').textContent = 'Comparando con tu zona…';
        try {
          const { codigo } = await api({ accion: 'analizar', google_id: b.dataset.id });
          location.href = `/para/${codigo}?o=analiza`;
        } catch (err) {
          fallo(err);
          caja.querySelectorAll('.candidato').forEach((x) => (x.disabled = false));
        }
      }));
    } catch (err) {
      fallo(err);
    } finally {
      boton.disabled = false;
    }
  });
}

const ruta = location.pathname.match(/^\/para\/([a-z2-9]{8})\/?$/);
if (ruta) informe(ruta[1]);
else analiza();
