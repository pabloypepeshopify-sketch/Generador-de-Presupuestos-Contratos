// Pantallas de Inicio (resumen del día) y Agenda (visitas y rellamadas).
import { html, useMemo, useState } from './preact.js';
import { useStore } from './datos.js';
import {
  Avatar, BotonTel, Cabecera, Chips, Icono, Seccion, TarjetaLocal, Vacio, ir, nombreDe,
} from './ui.js';
import {
  RESULTADOS, capital, diaDe, fechaLarga, fechaRelativa, gcalHref, haceCuanto, hoyISO, hora, porCita,
} from './util.js';

function contar(llamadas) {
  const soloLlamadas = llamadas.filter((l) => l.tipo === 'llamada');
  return {
    llamadas: soloLlamadas.length,
    dueno: soloLlamadas.filter((l) => l.contacto === 'dueno').length,
    citas: soloLlamadas.filter((l) => l.resultado === 'cita').length,
  };
}

const porRellamar = (yoId) => (a, b) =>
  (b.comercial_id === yoId) - (a.comercial_id === yoId) ||
  (a.rellamar_fecha || '9').localeCompare(b.rellamar_fecha || '9') ||
  (a.rellamar_hora || '99').localeCompare(b.rellamar_hora || '99');

export function Inicio() {
  const s = useStore();
  const hoy = hoyISO();

  const d = useMemo(() => {
    const deHoy = s.llamadas.filter((l) => diaDe(l.creado_en) === hoy);
    return {
      mio: contar(deHoy.filter((l) => l.comercial_id === s.yo.id)),
      equipo: contar(deHoy),
      citas: s.locales.filter((l) => l.estado === 'cita' && l.cita_fecha >= hoy).sort(porCita),
      sinResultado: s.locales.filter((l) => l.estado === 'cita' && l.cita_fecha < hoy).sort(porCita),
      rellamar: s.locales.filter((l) => l.estado === 'rellamar' && (!l.rellamar_fecha || l.rellamar_fecha <= hoy)).sort(porRellamar(s.yo.id)),
      porLlamar: s.locales.filter((l) => l.estado === 'pendiente' || l.estado === 'no_contesta').length,
      recientes: [...s.llamadas].sort((a, b) => b.creado_en.localeCompare(a.creado_en)).slice(0, 8),
    };
  }, [s.llamadas, s.locales, s.yo.id, hoy]);

  const localDe = (id) => s.locales.find((l) => l.id === id);
  const nombrePila = s.yo.nombre.split(' ')[0];

  return html`
    <header class="cab cab-marca">
      <img class="logo" src="/logo.svg" alt="VISAX NFC" />
      <div class="cab-acc">
        <a class="icono-btn" href="#/catalogo" aria-label="Catálogo"><${Icono} n="catalogo" /></a>
        <a class="icono-btn avatar-btn" href="#/ajustes" aria-label="Ajustes"><${Avatar} p=${s.yo} t=${36} /></a>
      </div>
    </header>

    <section class="hero">
      <span class="pildora"><i></i>${capital(fechaLarga(hoy))}</span>
      <h1>Hola, <em class="acento">${nombrePila}.</em></h1>
      <p>${d.mio.citas ? `Llevas ${d.mio.citas} ${d.mio.citas === 1 ? 'cita' : 'citas'} hoy. ¡A por la siguiente!` : 'El objetivo de cada llamada: hablar con el dueño en persona.'}</p>
    </section>

    <div class="tiles">
      <div class="tile"><b>${d.mio.llamadas}</b><span>Llamadas hoy</span></div>
      <div class="tile"><b>${d.mio.dueno}</b><span>Con el dueño</span></div>
      <div class="tile destacado"><b>${d.mio.citas}</b><span>Citas hoy</span></div>
    </div>
    <p class="nota-equipo">Equipo hoy: <b>${d.equipo.llamadas}</b> llamadas · <b>${d.equipo.dueno}</b> con dueño · <b>${d.equipo.citas}</b> citas</p>

    <button class="btn primario grande bloque" onClick=${() => ir('/llamada')}>
      <${Icono} n="tel" /> Apuntar llamada
    </button>

    ${d.sinResultado.length ? html`
      <${Seccion} titulo="Visitas sin resultado" enlace="/agenda">
        <div class="alerta"><${Icono} n="aviso" t=${18} /> Estas citas ya pasaron. Apunta cómo fue la visita.</div>
        <div class="lista">${d.sinResultado.slice(0, 3).map((l) => html`<${FilaVisita} l=${l} key=${l.id} />`)}</div>
      </${Seccion}>` : null}

    <${Seccion} titulo="Próximas visitas" enlace="/agenda">
      ${d.citas.length
        ? html`<div class="lista">${d.citas.slice(0, 5).map((l) => html`<${FilaVisita} l=${l} key=${l.id} />`)}</div>`
        : html`<${Vacio} titulo="Sin visitas a la vista" texto="Cuando consigas hablar con un dueño en persona, aparecerá aquí." />`}
    </${Seccion}>

    <${Seccion} titulo="Para llamar hoy" enlace="/agenda?vista=rellamar">
      ${d.rellamar.length
        ? html`<div class="lista">${d.rellamar.slice(0, 5).map((l) => html`<${TarjetaLocal} l=${l} key=${l.id} mostrar="rellamar" />`)}</div>`
        : html`<${Vacio} titulo="Nada pendiente para hoy" texto=${d.porLlamar ? `Hay ${d.porLlamar} locales por llamar o que no lo cogieron.` : ''}>
            ${d.porLlamar ? html`<a class="btn sec" href="#/locales?estado=no_contesta">Ver los que no lo cogieron</a>` : null}
          </${Vacio}>`}
    </${Seccion}>

    <${Seccion} titulo="Lo último del equipo">
      ${d.recientes.length
        ? html`<ul class="actividad">${d.recientes.map((ll) => {
          const l = localDe(ll.local_id);
          return html`<li key=${ll.id} onClick=${() => l && ir(`/local/${l.id}`)}>
              <${Avatar} id=${ll.comercial_id} t=${30} />
              <div><b>${nombreDe(ll.comercial_id)}</b> ${ll.tipo === 'visita' ? 'visitó' : 'llamó a'} <b>${l?.nombre || 'un local'}</b>
                <span class="res res-${ll.resultado}">${RESULTADOS[ll.resultado]}</span>
                <small>${haceCuanto(ll.creado_en)}</small></div>
            </li>`;
        })}</ul>`
        : html`<${Vacio} titulo="Todavía no hay llamadas" texto="Pulsa «Registrar llamada» para apuntar la primera." />`}
    </${Seccion}>
  `;
}

export function FilaVisita({ l }) {
  const tel = l.dueno_telefono || l.telefono;
  return html`<article class="fila-visita" onClick=${() => ir(`/local/${l.id}`)}>
    <div class="fv-hora"><b>${l.cita_hora ? hora(l.cita_hora) : '––:––'}</b><small>${fechaRelativa(l.cita_fecha)}</small></div>
    <div class="fv-main">
      <b>${l.nombre}</b>
      <span>${[l.dueno_nombre && `Dueño: ${l.dueno_nombre}`, l.direccion || l.zona].filter(Boolean).join(' · ') || 'Sin dirección'}</span>
      <span class="fv-quien"><${Avatar} id=${l.cita_comercial_id} t=${18} /> Va ${nombreDe(l.cita_comercial_id)}</span>
    </div>
    <div class="fv-acc"><${BotonTel} tel=${tel} peque /></div>
  </article>`;
}

export function Agenda({ query }) {
  const s = useStore();
  const [vista, setVista] = useState(query.vista === 'rellamar' ? 'rellamar' : 'visitas');
  const [quien, setQuien] = useState('todos');
  const hoy = hoyISO();

  const filtrarQuien = (l, campo) => quien === 'todos' || l[campo] === s.yo.id;

  const visitas = useMemo(() => {
    const citas = s.locales.filter((l) => l.estado === 'cita' && filtrarQuien(l, 'cita_comercial_id')).sort(porCita);
    const pasadas = citas.filter((l) => l.cita_fecha < hoy);
    const dias = new Map();
    for (const l of citas.filter((c) => c.cita_fecha >= hoy)) {
      if (!dias.has(l.cita_fecha)) dias.set(l.cita_fecha, []);
      dias.get(l.cita_fecha).push(l);
    }
    return { pasadas, dias: [...dias.entries()] };
  }, [s.locales, quien, hoy]);

  const rellamar = useMemo(() => {
    const lista = s.locales.filter((l) => l.estado === 'rellamar' && filtrarQuien(l, 'comercial_id')).sort(porRellamar(s.yo.id));
    return [
      ['Atrasadas', lista.filter((l) => l.rellamar_fecha && l.rellamar_fecha < hoy)],
      ['Hoy', lista.filter((l) => l.rellamar_fecha === hoy)],
      ['Próximos días', lista.filter((l) => l.rellamar_fecha > hoy)],
      ['Sin fecha', lista.filter((l) => !l.rellamar_fecha)],
    ].filter(([, ls]) => ls.length);
  }, [s.locales, quien, hoy]);

  const totalVisitas = visitas.pasadas.length + visitas.dias.reduce((n, [, ls]) => n + ls.length, 0);
  const totalRellamar = rellamar.reduce((n, [, ls]) => n + ls.length, 0);

  return html`
    <${Cabecera} titulo="La" acento="agenda" sub="Visitas a dueños y llamadas pendientes" />
    <div class="segmento">
      <button class=${vista === 'visitas' ? 'on' : ''} onClick=${() => setVista('visitas')}>Visitas <small>${totalVisitas}</small></button>
      <button class=${vista === 'rellamar' ? 'on' : ''} onClick=${() => setVista('rellamar')}>Volver a llamar <small>${totalRellamar}</small></button>
    </div>
    <${Chips} valor=${quien} onCambio=${(v) => setQuien(v || 'todos')}
      opciones=${[{ v: 'todos', txt: 'Todo el equipo' }, { v: 'mias', txt: vista === 'visitas' ? 'Las que voy yo' : 'Las mías' }]} />

    ${vista === 'visitas' ? html`
      ${visitas.pasadas.length ? html`
        <${Seccion} titulo="Ya pasaron · falta el resultado">
          <div class="lista">${visitas.pasadas.map((l) => html`<div class="con-accion" key=${l.id}>
            <${FilaVisita} l=${l} />
            <button class="btn sec peque" onClick=${() => ir(`/visita?local=${l.id}`)}>Apuntar resultado</button>
          </div>`)}</div>
        </${Seccion}>` : null}
      ${visitas.dias.map(([dia, ls]) => html`
        <${Seccion} titulo=${dia === hoy ? 'Hoy' : capital(fechaLarga(dia))} key=${dia}>
          <div class="lista">${ls.map((l) => html`<div class="con-accion" key=${l.id}>
            <${FilaVisita} l=${l} />
            <a class="btn fantasma peque" href=${gcalHref(l, nombreDe(l.cita_comercial_id))} target="_blank" rel="noopener">
              <${Icono} n="agenda" t=${16} /> Google Calendar</a>
          </div>`)}</div>
        </${Seccion}>`)}
      ${!totalVisitas ? html`<${Vacio} titulo="No hay visitas" texto="Las citas con dueños que consigáis aparecerán aquí, ordenadas por día y hora." />` : null}
    ` : html`
      ${rellamar.map(([titulo, ls]) => html`
        <${Seccion} titulo=${titulo} key=${titulo}>
          <div class="lista">${ls.map((l) => html`<${TarjetaLocal} l=${l} key=${l.id} mostrar="rellamar" />`)}</div>
        </${Seccion}>`)}
      ${!totalRellamar ? html`<${Vacio} titulo="Nadie a quien volver a llamar" texto="Cuando un empleado te diga «llama más tarde» o el dueño no esté, apúntalo como «Volver a llamar»." />` : null}
    `}
  `;
}
