// Captación sin llamar: quién está interesado (calientes), radar de Google Maps por zonas
// y cartas con QR al informe personal de cada local.
import { html, useEffect, useMemo, useState } from './preact.js';
import { actualizar, borrarZona, busquedasDe, esSocio, guardarZona, lanzarRadar, marcarCartasEnviadas, useStore } from './datos.js';
import { Cabecera, Campo, Chips, Icono, TarjetaLocal, Vacio, aviso, ir, volver } from './ui.js';
import { OPORTUNIDAD, calor, descargarCSV, enlaceInforme, fechaLarga, haceCuanto, hoyISO, mensajeError } from './util.js';

const FRECUENCIAS = [7, 15, 30, 60].map((d) => ({ v: d, txt: `Cada ${d} días` }));

export function Captacion({ query }) {
  const s = useStore();
  const [vista, setVista] = useState(['calientes', 'radar', 'cartas'].includes(query.vista) ? query.vista : 'calientes');
  const calientes = useMemo(
    () => s.locales.map((l) => ({ l, c: calor(l) })).filter((x) => x.c).sort((a, b) => b.c.ts.localeCompare(a.c.ts)),
    [s.locales],
  );

  return html`
    <${Cabecera} titulo="La" acento="captación" sub="Encontrar locales y saber quién está interesado" atras="/" />
    <div class="segmento tres">
      <button class=${vista === 'calientes' ? 'on' : ''} onClick=${() => setVista('calientes')}>Calientes <small>${calientes.length}</small></button>
      <button class=${vista === 'radar' ? 'on' : ''} onClick=${() => setVista('radar')}>Radar <small>${s.zonas.length}</small></button>
      <button class=${vista === 'cartas' ? 'on' : ''} onClick=${() => setVista('cartas')}>Cartas</button>
    </div>
    ${vista === 'calientes' ? html`<${Calientes} lista=${calientes} />` : vista === 'radar' ? html`<${Radar} />` : html`<${ElegirCartas} />`}
  `;
}

function Calientes({ lista }) {
  if (!lista.length) {
    return html`<${Vacio} titulo="Nadie caliente todavía"
      texto="Aquí salen los locales que en los últimos 14 días han abierto su informe, han escrito al asistente o han pedido que les llaméis. Son los primeros a los que llamar." />`;
  }
  return html`<p class="ayuda">Han mostrado interés en los últimos 14 días. Llamadles hoy: ya saben quiénes sois.</p>
    <div class="lista">${lista.map(({ l }) => html`<${TarjetaLocal} l=${l} key=${l.id} />`)}</div>`;
}

// ---------- Radar ----------
function Radar() {
  const s = useStore();
  const socio = esSocio();
  const [buscando, setBuscando] = useState(null);
  const [form, setForm] = useState(false);

  async function buscar(z) {
    setBuscando(z.id);
    try {
      const r = await lanzarRadar(z.id);
      aviso(r.nuevos ? `${r.nuevos} locales nuevos en ${z.zona}` : `Sin locales nuevos en ${z.zona} (${r.actualizados} actualizados)`);
    } catch (e) {
      aviso(mensajeError(e), 'error');
    } finally {
      setBuscando(null);
    }
  }

  async function alternar(z) {
    try {
      await guardarZona({ id: z.id, activa: !z.activa });
    } catch (e) {
      aviso(mensajeError(e), 'error');
    }
  }

  async function quitar(z) {
    if (!confirm(`¿Quitar la zona «${z.consulta}»? Los locales que ya encontró se quedan.`)) return;
    try {
      await borrarZona(z.id);
      aviso('Zona quitada');
    } catch (e) {
      aviso(mensajeError(e), 'error');
    }
  }

  const porZona = (z) => s.locales.filter((l) => l.zona === z.zona).length;
  const error = s.zonas.find((z) => /GOOGLE_PLACES_API_KEY/.test(z.ultimo_resultado || ''));

  return html`
    <p class="ayuda">Cada mañana el radar busca en Google Maps las zonas que tocan y añade los locales nuevos con su nota y sus reseñas. Cada local tiene su informe personal para enviárselo.</p>
    ${error ? html`<div class="alerta"><${Icono} n="aviso" t=${18} /><div>Falta conectar Google Maps: hay que poner la clave en Supabase (mira CAPTACION.md). Hasta entonces el radar no puede buscar.</div></div>` : null}
    ${socio && !form ? html`<button class="btn primario bloque" onClick=${() => setForm(true)}><${Icono} n="mas" /> Añadir zona</button>` : null}
    ${form ? html`<${FormZona} alTerminar=${(z) => { setForm(false); if (z) buscar(z); }} />` : null}
    ${s.zonas.length ? html`<div class="lista">${s.zonas.map((z) => html`<article class="zona ${z.activa ? '' : 'inactiva'}" key=${z.id}>
      <div class="zona-cab"><b>${z.consulta}</b><span class="etq">${porZona(z)} locales</span></div>
      <small>${z.activa ? `Cada ${z.cada_dias} días` : 'En pausa'}${z.ultima_busqueda_en ? ` · última ${haceCuanto(z.ultima_busqueda_en)}` : ' · aún sin buscar'}</small>
      ${z.ultimo_resultado ? html`<small class=${/^Error/.test(z.ultimo_resultado) ? 'error' : 'tenue'}>${z.ultimo_resultado}</small>` : null}
      ${socio ? html`<div class="botones-fila">
        <button class="btn sec peque" disabled=${buscando === z.id} onClick=${() => buscar(z)}><${Icono} n="radar" t=${16} /> ${buscando === z.id ? 'Buscando…' : 'Buscar ahora'}</button>
        <button class="btn fantasma peque" onClick=${() => alternar(z)}>${z.activa ? 'Pausar' : 'Reanudar'}</button>
        <a class="btn fantasma peque" href=${`#/locales?q=${encodeURIComponent(z.zona)}`}>Ver locales</a>
        <button class="btn fantasma peque" onClick=${() => quitar(z)} aria-label="Quitar zona"><${Icono} n="papelera" t=${16} /></button>
      </div>` : null}
    </article>`)}</div>`
      : html`<${Vacio} titulo="Sin zonas todavía" texto=${socio ? 'Añade la primera: por ejemplo «bares en Triana, Sevilla».' : 'Pídele a Pablo o a Pepe que añadan zonas.'} />`}
  `;
}

function FormZona({ alTerminar }) {
  const [consulta, setConsulta] = useState('');
  const [zona, setZona] = useState('');
  const [cada, setCada] = useState(30);
  const [guardando, setGuardando] = useState(false);
  const zonaAuto = consulta.split(/\s+en\s+/i)[1]?.trim() || '';

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      const z = await guardarZona({ consulta: consulta.trim(), zona: (zona || zonaAuto).trim(), cada_dias: cada });
      aviso('Zona añadida. Buscando…');
      alTerminar(z);
    } catch (err) {
      aviso(/duplicate|unique/i.test(err.message) ? 'Esa búsqueda ya está en el radar' : mensajeError(err), 'error');
      setGuardando(false);
    }
  }

  return html`<form class="formulario tarjeta-form" onSubmit=${guardar}>
    <${Campo} etiqueta="Qué buscar en Google Maps" ayuda="Como lo escribirías en Google Maps. Hasta 60 locales por búsqueda.">
      <input value=${consulta} onInput=${(e) => setConsulta(e.target.value)} placeholder="bares en Triana, Sevilla" required minlength="3" maxlength="120" />
    <//>
    <${Chips} opciones=${['bares en ', 'restaurantes en ', 'cafeterías en ', 'tapas en '].map((t) => ({ v: t, txt: t.trim() + '…' }))}
      valor=${null} onCambio=${(v) => v && setConsulta(v + (zonaAuto || ''))} />
    <${Campo} etiqueta="Nombre de la zona" ayuda="Se guarda en cada local para filtrar y en las cartas.">
      <input value=${zona} onInput=${(e) => setZona(e.target.value)} placeholder=${zonaAuto || 'Triana, Sevilla'} maxlength="80" />
    <//>
    <span class="campo-et">Repetir la búsqueda</span>
    <${Chips} opciones=${FRECUENCIAS} valor=${cada} onCambio=${(v) => v && setCada(v)} />
    <div class="botones-fila">
      <button class="btn primario" disabled=${guardando || !(zona || zonaAuto)}>${guardando ? 'Guardando…' : 'Añadir y buscar'}</button>
      <button type="button" class="btn fantasma" onClick=${() => alTerminar(null)}>Cancelar</button>
    </div>
  </form>`;
}

// ---------- Cartas ----------
const filtroCartas = { zona: 'todas', oportunidad: 2, sinCarta: true };

function ElegirCartas() {
  const s = useStore();
  const [f, setF] = useState(filtroCartas);
  const [elegidos, setElegidos] = useState(() => new Set(s.cartas));
  const cambiar = (k, v) => {
    filtroCartas[k] = v;
    setF({ ...filtroCartas });
  };

  const zonas = useMemo(() => [...new Set(s.locales.filter((l) => l.google_id && l.zona).map((l) => l.zona))].sort(), [s.locales]);
  const lista = useMemo(() => s.locales.filter((l) =>
    l.direccion && !['cliente', 'no_interesa'].includes(l.estado) &&
    (f.zona === 'todas' || l.zona === f.zona) &&
    (!f.sinCarta || !l.carta_enviada_en) &&
    (l.oportunidad ?? 1) >= f.oportunidad,
  ).sort((a, b) => (b.oportunidad ?? 0) - (a.oportunidad ?? 0) || a.nombre.localeCompare(b.nombre, 'es')), [s.locales, f]);

  const marcar = (id) => setElegidos((x) => {
    const n = new Set(x);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const todos = lista.length && lista.every((l) => elegidos.has(l.id));
  const ids = lista.filter((l) => elegidos.has(l.id)).map((l) => l.id);

  function imprimir() {
    actualizar({ cartas: ids });
    ir('/cartas');
  }

  function csv() {
    const filas = s.locales.filter((l) => ids.includes(l.id));
    descargarCSV(`cartas-visax-${hoyISO()}.csv`, [
      ['Local', 'Dirección', 'Zona', 'Nota Google', 'Reseñas', 'Enlace QR (carta)', 'Enlace pegatina NFC'],
      ...filas.map((l) => [l.nombre, l.direccion, l.zona, l.google_nota, l.google_resenas, enlaceInforme(l, 'carta'), enlaceInforme(l, 'nfc')]),
    ]);
  }

  return html`
    <p class="ayuda">Una carta por local con sus datos de Google y un QR a su informe. Cuando lo abran, os aparece en Calientes para llamarles. Pegad también una pegatina NFC con el enlace de la columna «NFC» del CSV: es la mejor demostración del producto.</p>
    <div class="filtros-fila">
      <select value=${f.zona} onChange=${(e) => cambiar('zona', e.target.value)} aria-label="Zona">
        <option value="todas">Todas las zonas</option>
        ${zonas.map((z) => html`<option value=${z}>${z}</option>`)}
      </select>
      <select value=${f.oportunidad} onChange=${(e) => cambiar('oportunidad', Number(e.target.value))} aria-label="Oportunidad">
        <option value="3">${OPORTUNIDAD[3]}</option>
        <option value="2">Mucha o algo de oportunidad</option>
        <option value="1">Todos</option>
      </select>
    </div>
    <label class="interruptor"><input type="checkbox" checked=${f.sinCarta} onChange=${(e) => cambiar('sinCarta', e.target.checked)} /> Solo los que aún no tienen carta</label>
    ${lista.length ? html`
      <div class="botones-fila">
        <button class="btn fantasma peque" onClick=${() => setElegidos(todos ? new Set() : new Set(lista.slice(0, 100).map((l) => l.id)))}>${todos ? 'Quitar todos' : 'Elegir todos'}</button>
        <span class="tenue">${ids.length} elegidos de ${lista.length}</span>
      </div>
      <ul class="lista-elegir">${lista.map((l) => html`<li key=${l.id}><label>
        <input type="checkbox" checked=${elegidos.has(l.id)} onChange=${() => marcar(l.id)} />
        <div><b>${l.nombre}</b><small>${[l.google_nota != null && `★ ${String(l.google_nota).replace('.', ',')} · ${l.google_resenas ?? 0} reseñas`, OPORTUNIDAD[l.oportunidad], l.carta_enviada_en && `carta ${haceCuanto(l.carta_enviada_en)}`].filter(Boolean).join(' · ')}</small>
          <small class="tenue">${l.direccion}</small></div>
      </label></li>`)}</ul>
      <div class="pie-fijo botones-dos">
        <button class="btn primario" disabled=${!ids.length} onClick=${imprimir}><${Icono} n="imprimir" /> Imprimir ${ids.length || ''}</button>
        <button class="btn sec" disabled=${!ids.length} onClick=${csv}><${Icono} n="descargar" /> CSV</button>
      </div>`
      : html`<${Vacio} titulo="No hay locales para carta" texto="Hacen falta locales con dirección, que vienen del radar. Prueba a cambiar los filtros." />`}
  `;
}

// Generador de QR (se carga solo al imprimir cartas)
let libQR = null;
function cargarQR() {
  libQR ??= new Promise((ok, mal) => {
    if (window.qrcode) return ok(window.qrcode);
    const sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
    sc.onload = () => ok(window.qrcode);
    sc.onerror = () => {
      libQR = null;
      mal(new Error('No se pudo cargar el generador de QR. Revisa la conexión.'));
    };
    document.head.append(sc);
  });
  return libQR;
}

function qrSVG(qrcode, texto) {
  const q = qrcode(0, 'M');
  q.addData(texto);
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true, alt: 'Código QR al informe' });
}

const num = (n) => new Intl.NumberFormat('es-ES').format(n ?? 0);
const nota = (n) => String(n).replace('.', ',');

export function Cartas() {
  const s = useStore();
  const locales = s.locales.filter((l) => s.cartas.includes(l.id));
  const [listo, setListo] = useState(null); // { qrcode, busquedas }
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([cargarQR(), busquedasDe([...new Set(locales.map((l) => l.busqueda_id).filter(Boolean))])])
      .then(([qrcode, bs]) => setListo({ qrcode, busquedas: new Map(bs.map((b) => [b.id, b])) }))
      .catch((e) => setError(mensajeError(e)));
  }, []);

  async function enviadas() {
    try {
      await marcarCartasEnviadas(locales.map((l) => l.id));
      aviso(`${locales.length} cartas marcadas como enviadas`);
      actualizar({ cartas: [] });
      volver('/captacion?vista=cartas');
    } catch (e) {
      aviso(mensajeError(e), 'error');
    }
  }

  if (!locales.length) return html`<${Cabecera} titulo="Cartas" atras="/captacion?vista=cartas" /><${Vacio} titulo="No hay cartas elegidas" />`;

  return html`
    <div class="no-imprimir">
      <${Cabecera} titulo="Cartas" sub=${`${locales.length} listas para imprimir en A4`} atras="/captacion?vista=cartas" />
      ${error ? html`<p class="error">${error}</p>` : null}
      <div class="botones-dos">
        <button class="btn primario" disabled=${!listo} onClick=${() => window.print()}><${Icono} n="imprimir" /> Imprimir</button>
        <button class="btn sec" onClick=${enviadas}><${Icono} n="check" /> Ya las envié</button>
      </div>
      <p class="ayuda">En el móvil, «Imprimir» deja guardarlas en PDF para llevarlas a la imprenta.</p>
    </div>
    <div class="cartas">${listo ? locales.map((l) => html`<${Carta} l=${l} b=${listo.busquedas.get(l.busqueda_id)} qrcode=${listo.qrcode} key=${l.id} />`) : html`<p class="tenue">Preparando cartas…</p>`}</div>
  `;
}

function Carta({ l, b, qrcode }) {
  const url = enlaceInforme(l, 'carta');
  const faltan = b?.mediana_resenas != null && l.google_resenas != null ? b.mediana_resenas - l.google_resenas : null;
  const zona = l.zona || b?.zona;
  return html`<article class="carta">
    <header class="carta-cab"><img src="/logo.svg" alt="VISAX NFC" /><span>Sanlúcar de Barrameda, ${fechaLarga(hoyISO()).replace(/^\w+, /, '')}</span></header>
    <p class="carta-para"><b>${l.nombre}</b><br />${l.direccion}</p>
    <h2>Hola, equipo de ${l.nombre}:</h2>
    ${l.google_nota != null ? html`<p>Hemos mirado vuestra ficha de Google Maps: tenéis <b>${nota(l.google_nota)} estrellas con ${num(l.google_resenas)} reseñas</b>.
      ${b?.mediana_resenas != null ? html` En ${zona || 'vuestra zona'}, la mitad de los bares y restaurantes tiene más de <b>${num(b.mediana_resenas)} reseñas</b>${b.media_nota != null ? ` y la nota media es ${nota(b.media_nota)}` : ''}.` : null}
      ${faltan > 0 ? html` Os faltan unas <b>${num(faltan)} reseñas</b> para estar entre los que más tienen.` : null}</p>` : null}
    <p>Cada día pasan por vuestro local clientes contentos que no dejan reseña porque les da pereza buscaros en Google. Con nuestro expositor NFC solo tienen que acercar el móvil: se abre vuestra ficha, lista para dejar la reseña. Sin app y sin pilas.</p>
    <div class="carta-qr">
      <div class="qr" dangerouslySetInnerHTML=${{ __html: qrSVG(qrcode, url) }}></div>
      <div><b>Vuestro informe, gratis</b><p>Escanead el código con la cámara del móvil: veréis cómo estáis frente a vuestra zona y qué podéis mejorar. No hace falta registrarse.</p>
        <small>${url.replace(/^https:\/\//, '')}</small></div>
    </div>
    <p>Un saludo,<br /><b>Pablo y Pepe · VISAX NFC</b><br />WhatsApp 656 999 241 · visaxnfc.es</p>
    <footer class="carta-pie">Hemos sacado el nombre y la dirección de vuestro local de su ficha pública de Google Maps para enviaros esta carta. Responsable: Pablo Villegas Becerra (NIF 49851130X), C/ Juan de Arratia, 5, 11540 Sanlúcar de Barrameda. Si no queréis recibir más cartas nuestras, escribid a contactovisaxai@gmail.com. Más información en visaxnfc.es/privacidad.</footer>
  </article>`;
}

