// Formulario rápido para apuntar una llamada o una visita al local (con cita o a puerta fría).
import { html, useMemo, useState } from './preact.js';
import { crearLocal, editarLocal, registrarLlamada, useStore } from './datos.js';
import {
  Avatar, Cabecera, Campo, Chips, Grupo, Icono, Insignia, aviso, ir, nombreDe, volver,
} from './ui.js';
import { AvisoDuplicado } from './locales.js';
import { puntosDe } from './concurso.js';
import {
  ESTADOS, INTERES, TIPOS_LOCAL, euros, fechaLarga, fechaRelativa, gcalHref, haceCuanto, hora, hoyISO, mensajeError, normTel, normTxt,
  sumarDias, whatsappHref,
} from './util.js';

const RESULTADOS_LLAMADA = {
  empleado: [
    { v: 'cita', txt: 'Cita para ver al dueño', ico: '📅', color: 'var(--st-cita)' },
    { v: 'rellamar', txt: 'Volver a llamar', ico: '🔁', color: 'var(--st-rellamar)' },
    { v: 'no_interesa', txt: 'No les interesa', ico: '✕', color: 'var(--st-nointeresa)' },
  ],
  dueno: [
    { v: 'cita', txt: 'Quedamos en persona', ico: '📅', color: 'var(--st-cita)' },
    { v: 'rellamar', txt: 'Volver a llamar', ico: '🔁', color: 'var(--st-rellamar)' },
    { v: 'no_interesa', txt: 'No le interesa', ico: '✕', color: 'var(--st-nointeresa)' },
    { v: 'vendido', txt: 'Compra ya', ico: '💰', color: 'var(--st-cliente)' },
  ],
};
const RESULTADOS_VISITA = {
  dueno: [
    { v: 'vendido', txt: 'Vendido', ico: '💰', color: 'var(--st-cliente)' },
    { v: 'rellamar', txt: 'Se lo piensa', ico: '🤔', color: 'var(--st-rellamar)' },
    { v: 'cita', txt: 'Otra cita', ico: '📅', color: 'var(--st-cita)' },
    { v: 'no_interesa', txt: 'No le interesa', ico: '✕', color: 'var(--st-nointeresa)' },
  ],
  empleado: [
    { v: 'cita', txt: 'Cita para ver al dueño', ico: '📅', color: 'var(--st-cita)' },
    { v: 'rellamar', txt: 'Volver a llamar', ico: '🔁', color: 'var(--st-rellamar)' },
    { v: 'no_interesa', txt: 'No les interesa', ico: '✕', color: 'var(--st-nointeresa)' },
  ],
};
const CONTACTOS_LLAMADA = [
  { v: 'nadie', txt: 'No lo cogen', ico: '📵', color: 'var(--st-nocontesta)' },
  { v: 'empleado', txt: 'Un empleado', ico: '🧑‍🍳', color: 'var(--st-rellamar)' },
  { v: 'dueno', txt: 'El dueño', ico: '👔', color: 'var(--st-cita)' },
];
const CONTACTOS_VISITA = [
  { v: 'dueno', txt: 'Con el dueño', ico: '👔', color: 'var(--st-cita)' },
  { v: 'empleado', txt: 'Solo un empleado', ico: '🧑‍🍳', color: 'var(--st-rellamar)' },
  { v: 'nadie', txt: 'Estaba cerrado', ico: '🔒', color: 'var(--st-nocontesta)' },
];
const HORAS = ['10:00', '11:00', '12:00', '13:00', '17:00', '18:00', '19:00'];

function inicial(l, yoId, esVisita) {
  return {
    // En la visita a una cita lo normal es ver al dueño
    contacto: esVisita && l?.estado === 'cita' ? 'dueno' : null,
    resultado: null,
    interes: l?.interes ?? null,
    dueno_nombre: l?.dueno_nombre || '',
    empleado_nombre: '',
    cita_fecha: sumarDias(hoyISO(), 1),
    cita_hora: '',
    cita_comercial_id: yoId,
    rellamar_fecha: sumarDias(hoyISO(), 1),
    rellamar_hora: '',
    productos: l?.productos || [],
    importe: '',
    notas: '',
    direccion: l?.direccion || '',
    dueno_telefono: l?.dueno_telefono || '',
  };
}

export function FormLlamada({ query, tipo: tipoInicial = 'llamada' }) {
  const s = useStore();
  const [tipo, setTipo] = useState(tipoInicial);
  const esVisita = tipo === 'visita';
  const [localId, setLocalId] = useState(query.local || null);
  const local = localId ? s.locales.find((l) => l.id === localId) : null;
  const [nuevo, setNuevo] = useState({ nombre: '', telefono: '', zona: '', tipo: null });
  const [f, setF] = useState(() => inicial(s.locales.find((l) => l.id === query.local), s.yo.id, esVisita));
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState(null);
  const cambiar = (k, v) => setF((x) => ({ ...x, [k]: v }));

  function elegirLocal(l) {
    setLocalId(l.id);
    setF((x) => {
      const base = inicial(l, s.yo.id, esVisita);
      return { ...base, contacto: x.contacto || base.contacto, resultado: x.resultado, notas: x.notas };
    });
  }

  function cambiarTipo(t) {
    setTipo(t);
    setErrores({});
    setF((x) => ({ ...x, contacto: t === 'visita' && local?.estado === 'cita' ? 'dueno' : null, resultado: null }));
  }

  // De qué cita es esta visita (la base de datos lo enlaza igual al guardar)
  const citaDeLaVisita = esVisita && local?.estado === 'cita'
    ? s.llamadas.find((x) => x.local_id === local.id && x.resultado === 'cita')
    : null;
  const quienConsiguio = citaDeLaVisita
    ? citaDeLaVisita.tipo === 'llamada' ? citaDeLaVisita.comercial_id : citaDeLaVisita.cita_conseguida_por
    : null;

  function elegirContacto(c) {
    setF((x) => ({ ...x, contacto: c, resultado: c === 'nadie' ? 'no_contesta' : x.resultado === 'no_contesta' || (c === 'empleado' && x.resultado === 'vendido') ? null : x.resultado }));
  }

  // Sugerencias mientras se escribe el nombre (para no llamar dos veces al mismo bar)
  const sugerencias = useMemo(() => {
    const q = normTxt(nuevo.nombre);
    if (localId || q.length < 2) return [];
    return s.locales.filter((l) => normTxt(l.nombre).includes(q)).slice(0, 5);
  }, [nuevo.nombre, localId, s.locales]);
  const dupTel = !localId && normTel(nuevo.telefono).length >= 9
    ? s.locales.find((l) => normTel(l.telefono) === normTel(nuevo.telefono) || normTel(l.dueno_telefono) === normTel(nuevo.telefono))
    : null;

  const resultados = (esVisita ? RESULTADOS_VISITA : RESULTADOS_LLAMADA)[f.contacto] || [];
  const conPersona = f.contacto && f.contacto !== 'nadie';
  const activos = s.perfiles.filter((p) => p.activo);

  async function guardar() {
    const err = {};
    if (!localId && !nuevo.nombre.trim()) err.local = 'Escribe el nombre del local o elige uno de la lista';
    if (!f.contacto) err.contacto = esVisita ? '¿Con quién hablaste?' : '¿Quién lo cogió?';
    if (!f.resultado) err.resultado = '¿Cómo ha ido?';
    if (f.resultado === 'cita' && !f.cita_fecha) err.cita = 'Pon el día de la cita';
    setErrores(err);
    if (Object.keys(err).length) {
      aviso(Object.values(err)[0], 'error');
      return;
    }
    setGuardando(true);
    try {
      let l = local;
      if (!l) {
        l = await crearLocal({
          nombre: nuevo.nombre.trim(),
          telefono: nuevo.telefono.trim() || null,
          zona: nuevo.zona.trim() || null,
          tipo: nuevo.tipo,
        });
        setLocalId(l.id);
      }
      // Datos del local que se suelen apuntar al conseguir la cita
      const extra = {};
      if (f.direccion.trim() && f.direccion.trim() !== (l.direccion || '')) extra.direccion = f.direccion.trim();
      if (f.dueno_telefono.trim() && f.dueno_telefono.trim() !== (l.dueno_telefono || '')) extra.dueno_telefono = f.dueno_telefono.trim();
      if (Object.keys(extra).length) await editarLocal(l.id, extra);

      const r = f.resultado;
      const ll = await registrarLlamada({
        local_id: l.id,
        comercial_id: s.yo.id,
        tipo,
        contacto: f.contacto,
        resultado: r,
        interes: conPersona ? f.interes : null,
        dueno_nombre: conPersona ? f.dueno_nombre.trim() || null : null,
        empleado_nombre: f.contacto === 'empleado' ? f.empleado_nombre.trim() || null : null,
        cita_fecha: r === 'cita' ? f.cita_fecha : null,
        cita_hora: r === 'cita' && f.cita_hora ? f.cita_hora : null,
        cita_comercial_id: r === 'cita' ? f.cita_comercial_id : null,
        rellamar_fecha: r === 'rellamar' ? f.rellamar_fecha || null : null,
        rellamar_hora: r === 'rellamar' && f.rellamar_fecha && f.rellamar_hora ? f.rellamar_hora : null,
        productos: conPersona ? f.productos : [],
        importe: r === 'vendido' && f.importe ? Number(String(f.importe).replace(',', '.')) || null : null,
        notas: f.notas.trim() || null,
      });
      setHecho({ id: l.id, ll });
    } catch (e) {
      aviso(mensajeError(e), 'error');
    } finally {
      setGuardando(false);
    }
  }

  if (hecho) return html`<${Hecho} id=${hecho.id} ll=${hecho.ll} />`;

  return html`
    <${Cabecera} titulo="Apuntar" acento=${esVisita ? 'visita' : 'llamada'} sub=${local ? local.nombre : 'Rápido: tres toques y listo'} atras=${local ? `/local/${local.id}` : '/'} />
    <div class="formulario">
      <div class="segmento">
        <button type="button" class=${esVisita ? '' : 'on'} onClick=${() => cambiarTipo('llamada')}>📞 Llamada</button>
        <button type="button" class=${esVisita ? 'on' : ''} onClick=${() => cambiarTipo('visita')}>🚪 Visita al local</button>
      </div>

      <${Grupo} titulo="1 · Local">
        ${local ? html`<div class="local-elegido">
            <div><b>${local.nombre}</b><span>${[local.zona, local.tipo].filter(Boolean).join(' · ')}</span>
              <span><${Insignia} estado=${local.estado} />${local.ultima_llamada_en ? ` · ${haceCuanto(local.ultima_llamada_en)} por ${nombreDe(local.ultimo_comercial_id)}` : ''}</span></div>
            ${!query.local ? html`<button class="btn fantasma peque" onClick=${() => setLocalId(null)}>Cambiar</button>` : null}
          </div>`
        : html`
          <${Campo} etiqueta="Nombre del local">
            <input value=${nuevo.nombre} class=${errores.local ? 'mal' : ''} onInput=${(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              placeholder="Escribe para buscar o añadir" autocomplete="off" />
          <//>
          ${sugerencias.length ? html`<div class="sugerencias">
            <small>¿Es uno de estos? Ya están en la lista:</small>
            ${sugerencias.map((l) => html`<button type="button" class="sugerencia" onClick=${() => elegirLocal(l)}>
              <b>${l.nombre}</b><span>${l.zona || ''}</span><${Insignia} estado=${l.estado} />
              ${l.ultimo_comercial_id ? html`<small>${nombreDe(l.ultimo_comercial_id)} · ${haceCuanto(l.ultima_llamada_en)}</small>` : null}
            </button>`)}
          </div>` : null}
          ${nuevo.nombre.trim().length >= 2 ? html`
            <div class="dos-col">
              <${Campo} etiqueta="Teléfono"><input type="tel" inputmode="tel" value=${nuevo.telefono} onInput=${(e) => setNuevo({ ...nuevo, telefono: e.target.value })} /><//>
              <${Campo} etiqueta="Zona / ciudad"><input value=${nuevo.zona} onInput=${(e) => setNuevo({ ...nuevo, zona: e.target.value })} /><//>
            </div>
            ${dupTel ? html`<${AvisoDuplicado} l=${dupTel} motivo="Ese teléfono ya es de" onUsar=${elegirLocal} />` : null}
            <${Chips} opciones=${TIPOS_LOCAL.map((t) => ({ v: t, txt: t }))} valor=${nuevo.tipo} onCambio=${(v) => setNuevo({ ...nuevo, tipo: v })} />
          ` : null}`}
        ${esVisita && local ? html`<div class=${`enlace-cita ${citaDeLaVisita ? 'con-cita' : ''}`}>
          ${citaDeLaVisita
            ? html`<span>📅</span><div>Es la cita ${quienConsiguio ? html`que consiguió <b>${nombreDe(quienConsiguio)}</b>` : 'pendiente'}
                · ${fechaRelativa(local.cita_fecha)}${local.cita_hora ? ` ${hora(local.cita_hora)}` : ''}.
                <small>${quienConsiguio ? `Si hablas con el dueño, suma 1 punto para ${nombreDe(quienConsiguio)}.` : 'Se apunta como visita de esta cita.'}</small></div>`
            : html`<span>🚪</span><div>Visita sin cita previa (puerta fría).<small>Si vendes, suma 7 puntos.</small></div>`}
        </div>` : null}
      <//>

      <${Grupo} titulo=${esVisita ? '2 · ¿Con quién hablaste?' : '2 · ¿Quién lo cogió?'}>
        <${Chips} grande valor=${f.contacto} onCambio=${elegirContacto} opciones=${esVisita ? CONTACTOS_VISITA : CONTACTOS_LLAMADA} />
        ${errores.contacto && !f.contacto ? html`<p class="error">${errores.contacto}</p>` : null}
      <//>

      ${conPersona ? html`
      <${Grupo} titulo="3 · ¿Cómo ha ido?">
        <${Chips} grande valor=${f.resultado} onCambio=${(v) => cambiar('resultado', v)} opciones=${resultados} />
        ${errores.resultado && !f.resultado ? html`<p class="error">${errores.resultado}</p>` : null}

        ${f.resultado === 'cita' ? html`<div class="bloque-sub cita">
          <span class="campo-et">Día de la cita</span>
          <${Chips} valor=${f.cita_fecha} onCambio=${(v) => v && cambiar('cita_fecha', v)} opciones=${[0, 1, 2].map((n) => ({ v: sumarDias(hoyISO(), n), txt: fechaRelativa(sumarDias(hoyISO(), n)) }))} />
          <div class="dos-col">
            <${Campo} etiqueta="Fecha"><input type="date" value=${f.cita_fecha} min=${hoyISO()} onInput=${(e) => cambiar('cita_fecha', e.target.value)} /><//>
            <${Campo} etiqueta="Hora"><input type="time" value=${f.cita_hora} step="900" onInput=${(e) => cambiar('cita_hora', e.target.value)} /><//>
          </div>
          <${Chips} valor=${f.cita_hora} onCambio=${(v) => cambiar('cita_hora', v || '')} opciones=${HORAS.map((h) => ({ v: h, txt: h }))} />
          <span class="campo-et">¿Quién va a ver al dueño?</span>
          <${Chips} valor=${f.cita_comercial_id} onCambio=${(v) => v && cambiar('cita_comercial_id', v)}
            opciones=${activos.map((p) => ({ v: p.id, txt: p.id === s.yo.id ? `${p.nombre} (yo)` : p.nombre, ico: html`<${Avatar} p=${p} t=${18} />` }))} />
          <${Campo} etiqueta="Dirección del local"><input value=${f.direccion} onInput=${(e) => cambiar('direccion', e.target.value)} placeholder="Para ir a la visita" /><//>
        </div>` : null}

        ${f.resultado === 'rellamar' ? html`<div class="bloque-sub rellamar">
          <span class="campo-et">¿Cuándo volver a llamar?</span>
          <${Chips} valor=${f.rellamar_fecha} onCambio=${(v) => cambiar('rellamar_fecha', v || '')} opciones=${[
            { v: hoyISO(), txt: 'Hoy' }, { v: sumarDias(hoyISO(), 1), txt: 'Mañana' },
            { v: sumarDias(hoyISO(), 3), txt: 'En 3 días' }, { v: sumarDias(hoyISO(), 7), txt: 'En una semana' },
          ]} />
          <div class="dos-col">
            <${Campo} etiqueta="Fecha"><input type="date" value=${f.rellamar_fecha} onInput=${(e) => cambiar('rellamar_fecha', e.target.value)} /><//>
            <${Campo} etiqueta="Hora (opcional)"><input type="time" value=${f.rellamar_hora} step="900" onInput=${(e) => cambiar('rellamar_hora', e.target.value)} /><//>
          </div>
        </div>` : null}

        ${f.resultado === 'vendido' ? html`<div class="bloque-sub vendido">
          <${Campo} etiqueta="Importe de la venta (€)"><input type="text" inputmode="decimal" value=${f.importe} onInput=${(e) => cambiar('importe', e.target.value)} placeholder="0,00" /><//>
        </div>` : null}
      <//>

      <${Grupo} titulo="Datos que has sacado">
        <div class="dos-col">
          <${Campo} etiqueta="Nombre del dueño"><input value=${f.dueno_nombre} onInput=${(e) => cambiar('dueno_nombre', e.target.value)} placeholder="Si te lo han dicho" /><//>
          ${f.contacto === 'empleado'
            ? html`<${Campo} etiqueta="Empleado que te atendió"><input value=${f.empleado_nombre} onInput=${(e) => cambiar('empleado_nombre', e.target.value)} placeholder="Nombre (opcional)" /><//>`
            : html`<${Campo} etiqueta="Móvil del dueño"><input type="tel" inputmode="tel" value=${f.dueno_telefono} onInput=${(e) => cambiar('dueno_telefono', e.target.value)} placeholder="Opcional" /><//>`}
        </div>
        <span class="campo-et">¿Cuánto interés?</span>
        <${Chips} valor=${f.interes} onCambio=${(v) => cambiar('interes', v)} opciones=${[
          { v: 1, txt: INTERES[1], ico: '❄️' }, { v: 2, txt: INTERES[2], ico: '🙂' }, { v: 3, txt: INTERES[3], ico: '🔥' },
        ]} />
        <span class="campo-et">${f.resultado === 'vendido' ? '¿Qué ha comprado?' : '¿Qué productos le interesan?'} <a href="#/catalogo" class="enlace-mini">Ver catálogo</a></span>
        <${Chips} multi valor=${f.productos} onCambio=${(v) => cambiar('productos', v)}
          opciones=${s.productos.filter((p) => p.activo).map((p) => ({ v: p.id, txt: p.nombre }))} />
      <//>` : null}

      ${f.contacto ? html`
      <${Grupo} titulo="Notas">
        <textarea rows="3" value=${f.notas} onInput=${(e) => cambiar('notas', e.target.value)}
          placeholder=${f.contacto === 'nadie' ? 'Opcional' : 'Lo que te ha dicho, horario del dueño, objeciones…'}></textarea>
      <//>
      <div class="pie-fijo">
        <button class="btn primario grande bloque" disabled=${guardando} onClick=${guardar}>
          <${Icono} n="check" /> ${guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>` : null}
    </div>
  `;
}

function Hecho({ id, ll }) {
  const s = useStore();
  const l = s.locales.find((x) => x.id === id);
  if (!l) return null;
  const esVisita = ll.tipo === 'visita';
  const puntos = puntosDe(ll, s.locales);
  const frases = {
    cita: `Cita con el dueño de ${l.nombre}: ${fechaLarga(l.cita_fecha)}${l.cita_hora ? ` a las ${hora(l.cita_hora)}` : ''}. Va ${nombreDe(l.cita_comercial_id)}.`,
    rellamar: `Hay que volver a llamar a ${l.nombre}${l.rellamar_fecha ? ` ${fechaRelativa(l.rellamar_fecha).toLowerCase()}` : ''}.`,
    no_contesta: esVisita ? `${l.nombre} estaba cerrado.` : `${l.nombre} no lo ha cogido. Queda en «No lo cogen».`,
    no_interesa: `${l.nombre} queda como «No interesa».`,
    cliente: `${l.nombre} pasa a cliente.${l.importe_venta ? ` ${euros(l.importe_venta)}.` : ''}`,
  };
  const textoWA = l.estado === 'cita'
    ? `Hola${l.dueno_nombre ? ` ${l.dueno_nombre}` : ''}, soy ${nombreDe(l.cita_comercial_id)} de VISAX NFC. Te confirmo que paso a verte ${fechaLarga(l.cita_fecha)}${l.cita_hora ? ` a las ${hora(l.cita_hora)}` : ''}. Un saludo.`
    : null;
  const wa = textoWA && whatsappHref(l.dueno_telefono, textoWA);
  return html`
    <div class="hecho">
      <div class="hecho-ico" style=${`--c:${ESTADOS[l.estado].color}`}><${Icono} n="check" t=${40} /></div>
      <h1>${ll.resultado === 'vendido' ? html`¡Venta <em class="acento">cerrada!</em>` : l.estado === 'cita' ? html`¡Cita <em class="acento">conseguida!</em>` : esVisita ? html`Visita <em class="acento">apuntada</em>` : html`Llamada <em class="acento">apuntada</em>`}</h1>
      <p>${(ll.resultado === 'no_contesta' ? frases.no_contesta : frases[l.estado]) || 'Guardado.'}</p>
      ${puntos.length ? html`<div class="puntos-ganados">${puntos.map((pt) => html`<span class=${`punto ${pt.tipo}`}>
        +${pt.puntos} ${pt.puntos === 1 ? 'punto' : 'puntos'} para ${nombreDe(pt.id)} · ${pt.tipo === 'cita' ? 'cita hecha' : 'venta'}</span>`)}</div>` : null}
      <div class="hecho-acc">
        ${l.estado === 'cita' ? html`<a class="btn primario grande bloque" href=${gcalHref(l, nombreDe(l.cita_comercial_id))} target="_blank" rel="noopener"><${Icono} n="agenda" /> Añadir a Google Calendar</a>` : null}
        ${wa ? html`<a class="btn sec grande bloque" href=${wa} target="_blank" rel="noopener"><${Icono} n="chat" /> Confirmar por WhatsApp al dueño</a>` : null}
        <button class=${`btn ${l.estado === 'cita' ? 'sec' : 'primario'} grande bloque`} onClick=${() => ir(`/${ll.tipo}?n=${Date.now()}`, { reemplazar: true })}>
          <${Icono} n=${esVisita ? 'mapa' : 'tel'} /> ${esVisita ? 'Apuntar otra visita' : 'Apuntar otra llamada'}</button>
        <button class="btn fantasma bloque" onClick=${() => ir(`/local/${l.id}`, { reemplazar: true })}>Ver ficha del local</button>
        <button class="btn fantasma bloque" onClick=${() => volver('/')}>Volver</button>
      </div>
    </div>
  `;
}
