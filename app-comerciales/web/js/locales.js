// Lista de locales, ficha con historial, alta/edición e importación de listados.
import { html, useEffect, useMemo, useState } from './preact.js';
import {
  actividadDigital, borrarLocal, busqueda, crearLocal, editarLocal, esSocio, historial, importarLocales, responderWhatsApp, useStore,
} from './datos.js';
import { puntosDe } from './concurso.js';
import {
  Avatar, Cabecera, Campo, Chips, Grupo, Icono, Insignia, Interes, Seccion, TarjetaLocal, Vacio, aviso, ir, nombreDe, volver,
} from './ui.js';
import {
  ESTADOS, INTERES, OPORTUNIDAD, ORDEN_ESTADOS, ORIGENES, TIPOS_LOCAL, copiar, enlaceInforme, euros, fechaLarga, fechaRelativa, gcalHref, haceCuanto,
  capital, hora, hoyISO, mapsHref, mensajeError, mensajeInforme, normTel, normTxt, porCita, sumarDias, telHref, textoResultado, whatsappHref,
} from './util.js';

// Los filtros se recuerdan mientras la app está abierta.
const filtros = { estado: 'todos', quien: 'todos', q: '', orden: 'reciente' };

export function Locales({ query }) {
  const s = useStore();
  const [f, setF] = useState(() => ({ ...filtros, ...(query.estado ? { estado: query.estado } : {}), ...(query.q ? { q: query.q } : {}) }));
  const [limite, setLimite] = useState(60);
  const cambiar = (k, v) => {
    setF((x) => ({ ...x, [k]: v }));
    filtros[k] = v;
    setLimite(60);
  };

  const { conteo, lista } = useMemo(() => {
    const q = normTxt(f.q);
    const qTel = normTel(f.q);
    const base = s.locales.filter((l) => {
      if (f.quien === 'mios' && l.comercial_id !== s.yo.id) return false;
      if (f.quien !== 'todos' && f.quien !== 'mios' && l.comercial_id !== f.quien) return false;
      if (!q) return true;
      if (qTel.length >= 3 && (normTel(l.telefono).includes(qTel) || normTel(l.dueno_telefono).includes(qTel))) return true;
      return [l.nombre, l.dueno_nombre, l.zona, l.direccion].some((c) => normTxt(c).includes(q));
    });
    const conteo = { todos: base.length };
    for (const l of base) conteo[l.estado] = (conteo[l.estado] || 0) + 1;
    const filtrada = f.estado === 'todos' ? base : base.filter((l) => l.estado === f.estado);
    const orden = {
      reciente: (a, b) => (b.ultima_llamada_en || b.creado_en).localeCompare(a.ultima_llamada_en || a.creado_en),
      nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
      cita: porCita,
    }[f.estado === 'cita' && f.orden === 'reciente' ? 'cita' : f.orden];
    return { conteo, lista: [...filtrada].sort(orden) };
  }, [s.locales, f, s.yo.id]);

  const opcionesEstado = [{ v: 'todos', txt: 'Todos', sub: conteo.todos }].concat(
    ORDEN_ESTADOS.map((e) => ({ v: e, txt: ESTADOS[e].txt, sub: conteo[e] || 0, color: ESTADOS[e].color })),
  );

  return html`
    <${Cabecera} titulo="Los" acento="locales" sub=${`${s.locales.length} en total`}>
      <button class="icono-btn" onClick=${() => ir('/captacion?vista=radar')} aria-label="Radar de Google Maps"><${Icono} n="radar" /></button>
      <button class="icono-btn" onClick=${() => ir('/importar')} aria-label="Importar lista"><${Icono} n="subir" /></button>
      <button class="icono-btn principal" onClick=${() => ir('/nuevo-local')} aria-label="Añadir local"><${Icono} n="mas" /></button>
    </${Cabecera}>

    <div class="buscador">
      <${Icono} n="buscar" t=${18} />
      <input type="search" placeholder="Buscar por local, dueño, zona o teléfono" value=${f.q} onInput=${(e) => cambiar('q', e.target.value)} />
    </div>
    <div class="chips-scroll"><${Chips} opciones=${opcionesEstado} valor=${f.estado} onCambio=${(v) => cambiar('estado', v || 'todos')} /></div>
    <div class="filtros-fila">
      <select value=${f.quien} onChange=${(e) => cambiar('quien', e.target.value)} aria-label="Comercial">
        <option value="todos">Todo el equipo</option>
        <option value="mios">Mis locales</option>
        ${s.perfiles.filter((p) => p.activo && p.id !== s.yo.id).map((p) => html`<option value=${p.id}>${p.nombre}</option>`)}
      </select>
      <select value=${f.orden} onChange=${(e) => cambiar('orden', e.target.value)} aria-label="Orden">
        <option value="reciente">${f.estado === 'cita' ? 'Por fecha de cita' : 'Más recientes'}</option>
        <option value="nombre">Por nombre</option>
      </select>
    </div>

    ${lista.length
      ? html`<div class="lista">${lista.slice(0, limite).map((l) => html`<${TarjetaLocal} l=${l} key=${l.id} />`)}</div>
        ${lista.length > limite ? html`<button class="btn sec bloque" onClick=${() => setLimite(limite + 100)}>Ver más (${lista.length - limite})</button>` : null}`
      : html`<${Vacio} titulo=${s.locales.length ? 'Nada con estos filtros' : 'Aún no hay locales'}
          texto=${s.locales.length ? 'Prueba a quitar algún filtro.' : 'Registra una llamada o importa tu lista de bares para empezar.'}>
          ${!s.locales.length ? html`<button class="btn sec" onClick=${() => ir('/importar')}>Importar lista</button>` : null}
        </${Vacio}>`}
  `;
}

export function FichaLocal({ id }) {
  const s = useStore();
  const l = s.locales.find((x) => x.id === id);
  const [hist, setHist] = useState(null);

  useEffect(() => {
    historial(id).then(setHist).catch(() => setHist([]));
  }, [id]);

  // Une lo cargado con lo que llega en tiempo real.
  const llamadas = useMemo(() => {
    const m = new Map((hist || []).map((x) => [x.id, x]));
    for (const x of s.llamadas) if (x.local_id === id) m.set(x.id, x);
    return [...m.values()].sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  }, [hist, s.llamadas, id]);

  if (!l) return html`<${Cabecera} titulo="Local" atras="/locales" /><${Vacio} titulo="Este local ya no existe" texto="Puede que alguien lo haya borrado." />`;

  const tel = l.dueno_telefono || l.telefono;
  const wa = whatsappHref(l.dueno_telefono) || whatsappHref(l.telefono);
  const productos = s.productos.filter((p) => l.productos?.includes(p.id));

  async function borrar() {
    if (!confirm(`¿Borrar «${l.nombre}» y todo su historial? No se puede deshacer.`)) return;
    try {
      await borrarLocal(l.id);
      aviso('Local borrado');
      volver('/locales');
    } catch (e) {
      aviso(mensajeError(e), 'error');
    }
  }

  return html`
    <${Cabecera} titulo=${l.nombre} sub=${[l.tipo, l.zona].filter(Boolean).join(' · ')} atras="/locales">
      <button class="icono-btn" onClick=${() => ir(`/local/${l.id}/editar`)} aria-label="Editar"><${Icono} n="editar" /></button>
    </${Cabecera}>

    <div class="ficha-estado"><${Insignia} estado=${l.estado} /><${Interes} n=${l.interes} conTexto />
      ${l.hablado_con_dueno ? html`<span class="etq">Ya habló con el dueño</span>` : null}</div>

    <div class="acciones-rapidas">
      ${tel ? html`<a class="accion" href=${telHref(tel)}><${Icono} n="tel" /><span>Llamar</span></a>` : null}
      ${wa ? html`<a class="accion" href=${wa} target="_blank" rel="noopener"><${Icono} n="chat" /><span>WhatsApp</span></a>` : null}
      <a class="accion" href=${mapsHref(l)} target="_blank" rel="noopener"><${Icono} n="mapa" /><span>Mapa</span></a>
      ${l.estado === 'cita' ? html`<a class="accion" href=${gcalHref(l, nombreDe(l.cita_comercial_id))} target="_blank" rel="noopener"><${Icono} n="agenda" /><span>Calendario</span></a>` : null}
    </div>

    ${l.estado === 'cita' ? html`<div class="bloque-cita">
      <div><small>Cita con el dueño</small><b>${[hoyISO(), sumarDias(hoyISO(), 1)].includes(l.cita_fecha) ? `${fechaRelativa(l.cita_fecha)} · ` : ''}${capital(fechaLarga(l.cita_fecha))}</b>
        <span>${l.cita_hora ? `a las ${hora(l.cita_hora)}` : 'sin hora'} · va <b>${nombreDe(l.cita_comercial_id)}</b></span></div>
    </div>` : null}
    ${l.estado === 'rellamar' ? html`<div class="bloque-cita rellamar">
      <div><small>Volver a llamar</small><b>${l.rellamar_fecha ? `${fechaRelativa(l.rellamar_fecha)}${l.rellamar_hora ? ` · ${hora(l.rellamar_hora)}` : ''}` : 'Sin fecha'}</b></div>
    </div>` : null}

    <div class="botones-dos">
      ${l.estado === 'cita' || l.estado === 'cliente'
        ? html`<button class="btn primario grande" onClick=${() => ir(`/visita?local=${l.id}`)}><${Icono} n="mapa" /> Apuntar visita</button>
               <button class="btn sec grande" onClick=${() => ir(`/llamada?local=${l.id}`)}><${Icono} n="tel" /> Apuntar llamada</button>`
        : html`<button class="btn primario grande" onClick=${() => ir(`/llamada?local=${l.id}`)}><${Icono} n="tel" /> Apuntar llamada</button>
               <button class="btn sec grande" onClick=${() => ir(`/visita?local=${l.id}`)}><${Icono} n="mapa" /> Apuntar visita</button>`}
    </div>

    <${Seccion} titulo="Datos">
      <dl class="datos">
        <div><dt>Dueño</dt><dd>${l.dueno_nombre || html`<span class="tenue">Sin saber todavía</span>`}</dd></div>
        ${l.dueno_telefono ? html`<div><dt>Móvil del dueño</dt><dd><a href=${telHref(l.dueno_telefono)}>${l.dueno_telefono}</a></dd></div>` : null}
        <div><dt>Teléfono del local</dt><dd>${l.telefono ? html`<a href=${telHref(l.telefono)}>${l.telefono}</a>` : html`<span class="tenue">—</span>`}</dd></div>
        <div><dt>Dirección</dt><dd>${l.direccion || html`<span class="tenue">—</span>`}</dd></div>
        <div><dt>Productos que le interesan</dt><dd>${productos.length ? html`<div class="etqs">${productos.map((p) => html`<span class="etq">${p.nombre}</span>`)}</div>` : html`<span class="tenue">—</span>`}</dd></div>
        ${l.importe_venta ? html`<div><dt>Venta</dt><dd><b>${euros(l.importe_venta)}</b></dd></div>` : null}
        <div><dt>Lo lleva</dt><dd>${l.comercial_id ? html`<span class="con-avatar"><${Avatar} id=${l.comercial_id} t=${20} /> ${nombreDe(l.comercial_id)}</span>` : html`<span class="tenue">Sin asignar</span>`}</dd></div>
        <div><dt>Llamadas</dt><dd>${l.num_llamadas}${l.ultima_llamada_en ? ` · última ${haceCuanto(l.ultima_llamada_en)}` : ''}</dd></div>
        ${l.notas ? html`<div class="ancho"><dt>Notas</dt><dd class="notas">${l.notas}</dd></div>` : null}
      </dl>
    </${Seccion}>

    <${BloqueCaptacion} l=${l} wa=${wa} />

    <${Seccion} titulo="Historial">
      ${hist === null && !llamadas.length ? html`<p class="tenue">Cargando…</p>`
        : llamadas.length ? html`<ol class="historial">${llamadas.map((x) => html`<${EntradaHistorial} x=${x} productos=${s.productos} locales=${s.locales} key=${x.id} />`)}</ol>`
        : html`<${Vacio} titulo="Sin llamadas todavía" />`}
    </${Seccion}>

    ${esSocio() ? html`<button class="btn peligro bloque" onClick=${borrar}><${Icono} n="papelera" /> Borrar local</button>` : null}
  `;
}

// ---------- Captación en la ficha: Google, su informe, lo que ha hecho y sus conversaciones ----------
const POR_DONDE = { qr: 'desde el QR', nfc: 'con la pegatina NFC', carta: 'desde la carta', ig: 'desde Instagram', wa: 'desde WhatsApp', email: 'desde un email', anuncio: 'desde un anuncio', video: 'desde un vídeo', analiza: 'tras analizar su local' };

function textoEvento(e) {
  switch (e.tipo) {
    case 'visto': return `Abrió su informe${POR_DONDE[e.detalle] ? ` ${POR_DONDE[e.detalle]}` : ''}`;
    case 'whatsapp': return e.detalle || 'Pulsó «Hablar por WhatsApp» en su informe';
    case 'tienda': return `Fue a la tienda${e.detalle ? `: ${e.detalle}` : ''}`;
    case 'chat': return `Escribió al asistente: «${e.detalle}»`;
    default: return e.detalle || e.tipo;
  }
}

function BloqueCaptacion({ l, wa }) {
  const [act, setAct] = useState(null);
  const [zona, setZona] = useState(null);
  const cargar = () => actividadDigital(l.id).then(setAct).catch(() => setAct({ eventos: [], conversaciones: [] }));

  useEffect(() => {
    cargar();
  }, [l.id, l.informe_visitas, l.ultimo_mensaje_en, l.pidio_contacto_en]);
  // Con conversaciones abiertas, refresca para ver las respuestas del agente
  useEffect(() => {
    if (!act?.conversaciones.length) return;
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [act?.conversaciones.length, l.id]);
  useEffect(() => {
    if (l.busqueda_id) busqueda(l.busqueda_id).then(setZona).catch(() => {});
  }, [l.busqueda_id]);

  const faltan = zona?.mediana_resenas != null && l.google_resenas != null ? zona.mediana_resenas - l.google_resenas : null;
  const copiarTxt = async (txt, ok) => {
    const hecho = await copiar(txt);
    aviso(hecho ? ok : 'No se pudo copiar', hecho ? 'ok' : 'error');
  };
  const waInforme = wa ? whatsappHref(l.dueno_telefono, mensajeInforme(l, 'wa')) || whatsappHref(l.telefono, mensajeInforme(l, 'wa')) : null;

  return html`
    ${l.google_nota != null || l.google_id ? html`<${Seccion} titulo="Google Maps">
      <div class="tiles">
        <div class="tile"><b>${l.google_nota != null ? String(l.google_nota).replace('.', ',') : '–'}<small>★</small></b><span>Nota</span></div>
        <div class="tile"><b>${l.google_resenas ?? 0}</b><span>Reseñas</span></div>
        <div class="tile"><b>${zona?.mediana_resenas ?? '–'}</b><span>Mitad de su zona supera</span></div>
      </div>
      ${l.oportunidad ? html`<p class="ayuda"><b>${OPORTUNIDAD[l.oportunidad]}</b>${faltan > 0 ? ` · le faltan unas ${faltan} reseñas para la mitad alta de su zona` : ''}${zona?.media_nota != null ? ` · nota media de la zona ${String(zona.media_nota).replace('.', ',')}` : ''}</p>` : null}
      <div class="botones-fila">
        ${l.maps_url ? html`<a class="btn fantasma peque" href=${l.maps_url} target="_blank" rel="noopener"><${Icono} n="mapa" t=${16} /> Su ficha</a>` : null}
        ${l.web ? html`<a class="btn fantasma peque" href=${l.web} target="_blank" rel="noopener"><${Icono} n="externo" t=${16} /> Su web</a>` : null}
      </div>
    </${Seccion}>` : null}

    <${Seccion} titulo="Su informe">
      <p class="ayuda">${ORIGENES[l.origen] || ''}${l.informe_visitas ? ` · lo ha abierto ${l.informe_visitas} ${l.informe_visitas === 1 ? 'vez' : 'veces'}, la última ${haceCuanto(l.informe_visto_en)}` : ' · aún no lo ha abierto'}${l.carta_enviada_en ? ` · carta enviada ${haceCuanto(l.carta_enviada_en)}` : ''}</p>
      <div class="botones-fila">
        <a class="btn sec peque" href=${`${enlaceInforme(l)}?p=1`} target="_blank" rel="noopener"><${Icono} n="externo" t=${16} /> Ver informe</a>
        <button class="btn fantasma peque" onClick=${() => copiarTxt(enlaceInforme(l, 'nfc'), 'Enlace para la pegatina NFC copiado')}><${Icono} n="enlace" t=${16} /> Enlace NFC</button>
        <button class="btn fantasma peque" onClick=${() => copiarTxt(mensajeInforme(l, 'ig'), 'Mensaje copiado: pégalo en Instagram')}><${Icono} n="copiar" t=${16} /> Mensaje Instagram</button>
        ${waInforme ? html`<a class="btn fantasma peque" href=${waInforme} target="_blank" rel="noopener"><${Icono} n="chat" t=${16} /> Mandar por WhatsApp</a>` : null}
      </div>
      ${act?.eventos.length ? html`<ul class="eventos">${act.eventos.slice(0, 12).map((e) => html`<li key=${e.id}><span>${textoEvento(e)}</span><small>${haceCuanto(e.creado_en)}</small></li>`)}</ul>` : null}
    </${Seccion}>

    ${act?.conversaciones.map((c) => html`<${Conversacion} c=${c} l=${l} alCambiar=${cargar} key=${c.id} />`)}
  `;
}

function Conversacion({ c, l, alCambiar }) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function pausar() {
    try {
      await editarLocal(l.id, { agente_pausado: !l.agente_pausado });
      aviso(l.agente_pausado ? 'El asistente vuelve a contestar solo' : 'Asistente en pausa: contestáis vosotros');
    } catch (e) {
      aviso(mensajeError(e), 'error');
    }
  }

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await responderWhatsApp(c.id, texto.trim());
      setTexto('');
      aviso('Enviado por WhatsApp. El asistente queda en pausa en esta conversación.');
      alCambiar();
    } catch (err) {
      aviso(mensajeError(err), 'error');
    } finally {
      setEnviando(false);
    }
  }

  return html`<${Seccion} titulo=${c.canal === 'whatsapp' ? `WhatsApp · +${c.wa_id}` : 'Chat de su informe'}>
    <div class="conv-cab"><span class=${`etq ${l.agente_pausado ? '' : 'activo'}`}><${Icono} n="robot" t=${14} /> ${l.agente_pausado ? 'Asistente en pausa' : 'Asistente contestando'}</span>
      <button class="btn fantasma peque" onClick=${pausar}>${l.agente_pausado ? 'Reactivar asistente' : 'Pausar asistente'}</button></div>
    <ol class="conversacion">${c.mensajes.map((m) => html`<li class=${`burbuja ${m.autor}`} key=${m.id}>
      ${m.texto}<small>${m.autor === 'agente' ? 'Asistente' : m.autor === 'equipo' ? 'Equipo' : 'Cliente'} · ${haceCuanto(m.creado_en)}</small></li>`)}</ol>
    ${c.canal === 'whatsapp' ? html`<form class="responder" onSubmit=${enviar}>
      <textarea rows="2" value=${texto} onInput=${(e) => setTexto(e.target.value)} placeholder="Contestar por WhatsApp (pausa al asistente)"></textarea>
      <button class="btn primario" disabled=${enviando || !texto.trim()}>${enviando ? 'Enviando…' : 'Enviar'}</button>
    </form>` : html`<p class="ayuda">El chat de la web no admite respuestas a mano: llamadle o escribidle por WhatsApp.</p>`}
  </${Seccion}>`;
}

function EntradaHistorial({ x, productos, locales }) {
  const prods = productos.filter((p) => x.productos?.includes(p.id)).map((p) => p.nombre);
  const quien = x.contacto === 'nadie' ? null : x.contacto === 'dueno' ? `Habló con el dueño${x.dueno_nombre ? ` (${x.dueno_nombre})` : ''}` : `Habló con un empleado${x.empleado_nombre ? ` (${x.empleado_nombre})` : ''}`;
  const puntos = puntosDe(x, locales);
  const deCita = x.tipo !== 'visita' ? null
    : !x.cita_origen_id ? 'Visita sin cita previa (puerta fría)'
    : x.cita_conseguida_por ? `Visita de la cita que consiguió ${nombreDe(x.cita_conseguida_por)}` : 'Visita de la cita';
  return html`<li class="res-${x.resultado}">
    <div class="h-cab"><${Avatar} id=${x.comercial_id} t=${24} /><b>${nombreDe(x.comercial_id)}</b>
      <span>${x.tipo === 'visita' ? 'Visita' : 'Llamada'} · ${haceCuanto(x.creado_en)}</span></div>
    ${deCita ? html`<p class="h-enlace">${deCita}</p>` : null}
    <div class="h-res"><span class="res res-${x.resultado}">${textoResultado(x)}</span>
      ${x.resultado === 'cita' ? html` <span>${fechaRelativa(x.cita_fecha)}${x.cita_hora ? ` · ${hora(x.cita_hora)}` : ''} · va ${nombreDe(x.cita_comercial_id)}</span>` : null}
      ${x.resultado === 'rellamar' && x.rellamar_fecha ? html` <span>${fechaRelativa(x.rellamar_fecha)}${x.rellamar_hora ? ` · ${hora(x.rellamar_hora)}` : ''}</span>` : null}
      ${x.importe ? html` <b>${euros(x.importe)}</b>` : null}
      <${Interes} n=${x.interes} />
      ${puntos.map((pt) => html`<span class=${`punto ${pt.tipo}`}>+${pt.puntos} ${nombreDe(pt.id)}</span>`)}</div>
    ${quien ? html`<p>${quien}</p>` : null}
    ${prods.length ? html`<div class="etqs">${prods.map((p) => html`<span class="etq">${p}</span>`)}</div>` : null}
    ${x.notas ? html`<p class="notas">${x.notas}</p>` : null}
  </li>`;
}

// ---------- Alta y edición ----------
const VACIO = { nombre: '', tipo: null, telefono: '', direccion: '', zona: '', dueno_nombre: '', dueno_telefono: '', estado: 'pendiente', interes: null, productos: [], comercial_id: null, notas: '' };

export function EditarLocal({ id }) {
  const s = useStore();
  const original = id ? s.locales.find((x) => x.id === id) : null;
  const [f, setF] = useState(() => ({ ...VACIO, ...(original || { comercial_id: s.yo.id }) }));
  const [guardando, setGuardando] = useState(false);
  const cambiar = (k, v) => setF((x) => ({ ...x, [k]: v }));

  if (id && !original) return html`<${Cabecera} titulo="Editar" atras="/locales" /><${Vacio} titulo="Este local ya no existe" />`;

  const dupTel = normTel(f.telefono).length >= 9 && s.locales.find((l) => l.id !== id && (normTel(l.telefono) === normTel(f.telefono) || normTel(l.dueno_telefono) === normTel(f.telefono)));
  const dupNombre = !dupTel && f.nombre.trim() && s.locales.find((l) => l.id !== id && normTxt(l.nombre) === normTxt(f.nombre) && normTxt(l.zona) === normTxt(f.zona));

  async function guardar(e) {
    e.preventDefault();
    if (!f.nombre.trim()) return aviso('Pon el nombre del local', 'error');
    setGuardando(true);
    const datos = {
      nombre: f.nombre.trim(),
      tipo: f.tipo,
      telefono: f.telefono.trim() || null,
      direccion: f.direccion?.trim() || null,
      zona: f.zona?.trim() || null,
      dueno_nombre: f.dueno_nombre?.trim() || null,
      dueno_telefono: f.dueno_telefono?.trim() || null,
      estado: f.estado,
      interes: f.interes,
      productos: f.productos,
      comercial_id: f.comercial_id,
      notas: f.notas?.trim() || null,
    };
    try {
      const l = id ? await editarLocal(id, datos) : await crearLocal(datos);
      aviso(id ? 'Cambios guardados' : 'Local añadido');
      if (id) volver(`/local/${id}`);
      else ir(`/local/${l.id}`, { reemplazar: true });
    } catch (err) {
      aviso(mensajeError(err), 'error');
      setGuardando(false);
    }
  }

  return html`
    <${Cabecera} titulo=${id ? 'Editar local' : 'Nuevo local'} atras=${id ? `/local/${id}` : '/locales'} />
    <form class="formulario" onSubmit=${guardar}>
      <${Grupo} titulo="El local">
        <${Campo} etiqueta="Nombre *"><input value=${f.nombre} onInput=${(e) => cambiar('nombre', e.target.value)} placeholder="Bar Manolo" required /><//>
        <${Chips} opciones=${TIPOS_LOCAL.map((t) => ({ v: t, txt: t }))} valor=${f.tipo} onCambio=${(v) => cambiar('tipo', v)} />
        <div class="dos-col">
          <${Campo} etiqueta="Teléfono"><input type="tel" inputmode="tel" value=${f.telefono} onInput=${(e) => cambiar('telefono', e.target.value)} placeholder="956 000 000" /><//>
          <${Campo} etiqueta="Zona / ciudad"><input value=${f.zona} onInput=${(e) => cambiar('zona', e.target.value)} placeholder="Sanlúcar centro" /><//>
        </div>
        ${dupTel ? html`<${AvisoDuplicado} l=${dupTel} motivo="Ese teléfono ya está en" />` : null}
        ${dupNombre ? html`<${AvisoDuplicado} l=${dupNombre} motivo="Ya hay un local con ese nombre:" />` : null}
        <${Campo} etiqueta="Dirección"><input value=${f.direccion || ''} onInput=${(e) => cambiar('direccion', e.target.value)} placeholder="C/ Ancha, 12" /><//>
      <//>

      <${Grupo} titulo="El dueño">
        <div class="dos-col">
          <${Campo} etiqueta="Nombre del dueño"><input value=${f.dueno_nombre || ''} onInput=${(e) => cambiar('dueno_nombre', e.target.value)} /><//>
          <${Campo} etiqueta="Móvil del dueño"><input type="tel" inputmode="tel" value=${f.dueno_telefono || ''} onInput=${(e) => cambiar('dueno_telefono', e.target.value)} /><//>
        </div>
      <//>

      <${Grupo} titulo="Seguimiento">
        <${Campo} etiqueta="Estado">
          <select value=${f.estado} onChange=${(e) => cambiar('estado', e.target.value)}>
            ${ORDEN_ESTADOS.map((e) => html`<option value=${e}>${ESTADOS[e].txt}</option>`)}
          </select>
        <//>
        ${f.estado === 'cita' && !original?.cita_fecha ? html`<p class="ayuda">Para poner fecha y hora de la cita, usa «Apuntar llamada».</p>` : null}
        <span class="campo-et">Interés</span>
        <${Chips} opciones=${[1, 2, 3].map((n) => ({ v: n, txt: INTERES[n] }))} valor=${f.interes} onCambio=${(v) => cambiar('interes', v)} />
        <span class="campo-et">Productos que le interesan</span>
        <${Chips} multi opciones=${s.productos.filter((p) => p.activo).map((p) => ({ v: p.id, txt: p.nombre }))} valor=${f.productos} onCambio=${(v) => cambiar('productos', v)} />
        <${Campo} etiqueta="Lo lleva">
          <select value=${f.comercial_id || ''} onChange=${(e) => cambiar('comercial_id', e.target.value || null)}>
            <option value="">Sin asignar</option>
            ${s.perfiles.filter((p) => p.activo || p.id === f.comercial_id).map((p) => html`<option value=${p.id}>${p.nombre}</option>`)}
          </select>
        <//>
        <${Campo} etiqueta="Notas"><textarea rows="3" value=${f.notas || ''} onInput=${(e) => cambiar('notas', e.target.value)} placeholder="Horario, quién decide, lo que le preocupa…"></textarea><//>
      <//>

      <div class="pie-fijo"><button class="btn primario grande bloque" disabled=${guardando}>${guardando ? 'Guardando…' : id ? 'Guardar cambios' : 'Añadir local'}</button></div>
    </form>
  `;
}

export function AvisoDuplicado({ l, motivo, onUsar }) {
  return html`<div class="alerta">
    <${Icono} n="aviso" t=${18} />
    <div>${motivo} <b>${l.nombre}</b>${l.zona ? ` (${l.zona})` : ''} · <${Insignia} estado=${l.estado} />
      ${l.ultimo_comercial_id ? html`<small>Última llamada de ${nombreDe(l.ultimo_comercial_id)} ${haceCuanto(l.ultima_llamada_en)}</small>` : null}
      <div class="alerta-acc">
        ${onUsar ? html`<button type="button" class="btn sec peque" onClick=${() => onUsar(l)}>Es este, usarlo</button>` : null}
        <button type="button" class="btn fantasma peque" onClick=${() => ir(`/local/${l.id}`)}>Ver ficha</button>
      </div>
    </div>
  </div>`;
}

// ---------- Importar listado (pegar desde Excel o Google Sheets) ----------
export function Importar() {
  const s = useStore();
  const [texto, setTexto] = useState('');
  const [asignar, setAsignar] = useState('');
  const [guardando, setGuardando] = useState(false);

  const filas = useMemo(() => {
    const vistos = new Set(s.locales.map((l) => normTel(l.telefono)).filter((t) => t.length >= 9));
    const nombres = new Set(s.locales.map((l) => `${normTxt(l.nombre)}|${normTxt(l.zona)}`));
    return texto.split(/\r?\n/).map((linea) => linea.trim()).filter(Boolean).map((linea) => {
      const sep = linea.includes('\t') ? '\t' : linea.includes(';') ? ';' : ',';
      const [nombre = '', telefono = '', zona = '', direccion = '', tipo = ''] = linea.split(sep).map((c) => c.trim());
      const t = normTel(telefono);
      const repetido = (t.length >= 9 && vistos.has(t)) || nombres.has(`${normTxt(nombre)}|${normTxt(zona)}`);
      if (!repetido) {
        if (t.length >= 9) vistos.add(t);
        nombres.add(`${normTxt(nombre)}|${normTxt(zona)}`);
      }
      return { nombre, telefono, zona, direccion, tipo, repetido };
    }).filter((f) => f.nombre && !/^nombre$/i.test(f.nombre));
  }, [texto, s.locales]);

  const nuevos = filas.filter((f) => !f.repetido);

  async function importar() {
    setGuardando(true);
    try {
      const n = await importarLocales(nuevos.map((f) => ({
        nombre: f.nombre,
        telefono: f.telefono || null,
        zona: f.zona || null,
        direccion: f.direccion || null,
        tipo: f.tipo || null,
        comercial_id: asignar || null,
      })));
      aviso(`${n} locales importados`);
      ir('/locales?estado=pendiente', { reemplazar: true });
    } catch (e) {
      aviso(mensajeError(e), 'error');
      setGuardando(false);
    }
  }

  return html`
    <${Cabecera} titulo="Importar lista" sub="Pega tu listado de bares y restaurantes" atras="/locales" />
    <div class="formulario">
      <p class="ayuda">Una línea por local, en este orden: <b>nombre; teléfono; zona; dirección; tipo</b>. Solo el nombre es obligatorio. Puedes copiar las columnas directamente desde Excel o Google Sheets.</p>
      <textarea rows="8" class="mono" value=${texto} onInput=${(e) => setTexto(e.target.value)}
        placeholder=${'Bar Manolo; 956 123 456; Sanlúcar; C/ Ancha 3; Bar\nCasa Balbino; 956 360 513; Sanlúcar'}></textarea>
      <${Campo} etiqueta="Asignar a">
        <select value=${asignar} onChange=${(e) => setAsignar(e.target.value)}>
          <option value="">Sin asignar (quien llame primero)</option>
          ${s.perfiles.filter((p) => p.activo).map((p) => html`<option value=${p.id}>${p.nombre}</option>`)}
        </select>
      <//>
      ${filas.length ? html`
        <p><b>${nuevos.length}</b> nuevos${filas.length - nuevos.length ? html` · <span class="tenue">${filas.length - nuevos.length} ya estaban y se saltan</span>` : null}</p>
        <div class="tabla-previa"><table>
          <thead><tr><th>Nombre</th><th>Teléfono</th><th>Zona</th></tr></thead>
          <tbody>${filas.slice(0, 50).map((f) => html`<tr class=${f.repetido ? 'repetido' : ''}><td>${f.nombre}</td><td>${f.telefono}</td><td>${f.zona}</td></tr>`)}</tbody>
        </table></div>` : null}
      <button class="btn primario grande bloque" disabled=${!nuevos.length || guardando} onClick=${importar}>
        ${guardando ? 'Importando…' : `Importar ${nuevos.length || ''} locales`}
      </button>
    </div>
  `;
}

