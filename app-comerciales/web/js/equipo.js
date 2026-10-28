// Informe del equipo, catálogo, ajustes personales y gestión de usuarios (socios).
import { html, useMemo, useState } from './preact.js';
import {
  borrarProducto, cambiarMiContrasena, cerrarSesion, editarMiPerfil, esSocio, gestionarEquipo, guardarProducto, useStore,
} from './datos.js';
import {
  Avatar, Cabecera, Campo, Chips, Grupo, Icono, Seccion, Vacio, aviso, nombreDe,
} from './ui.js';
import { SeccionConcurso, puntosDe } from './concurso.js';
import {
  COLORES, ESTADOS, ORDEN_ESTADOS, contrasenaAleatoria, descargarCSV, euros, hora, inicioPeriodo, isoLocal, mensajeError, pct, textoResultado,
} from './util.js';

const PERIODOS = [
  { v: 'hoy', txt: 'Hoy' },
  { v: 'semana', txt: 'Esta semana' },
  { v: 'mes', txt: 'Este mes' },
  { v: '90', txt: '90 días' },
];

function metricas(llamadas) {
  const ll = llamadas.filter((l) => l.tipo === 'llamada');
  const ventas = llamadas.filter((l) => l.resultado === 'vendido');
  return {
    llamadas: ll.length,
    cogen: ll.filter((l) => l.contacto !== 'nadie').length,
    dueno: ll.filter((l) => l.contacto === 'dueno').length,
    citas: ll.filter((l) => l.resultado === 'cita').length,
    noInteresa: ll.filter((l) => l.resultado === 'no_interesa').length,
    visitas: llamadas.filter((l) => l.tipo === 'visita').length,
    ventas: ventas.length,
    importe: ventas.reduce((n, l) => n + Number(l.importe || 0), 0),
  };
}

export function Informe() {
  const s = useStore();
  const [periodo, setPeriodo] = useState('semana');

  const d = useMemo(() => {
    const desde = inicioPeriodo(periodo).toISOString();
    const delPeriodo = s.llamadas.filter((l) => l.creado_en >= desde);
    const total = metricas(delPeriodo);
    const porPersona = s.perfiles
      .map((p) => ({ p, m: metricas(delPeriodo.filter((l) => l.comercial_id === p.id)) }))
      .filter(({ p, m }) => p.activo || m.llamadas || m.visitas)
      .sort((a, b) => b.m.citas - a.m.citas || b.m.ventas - a.m.ventas || b.m.llamadas - a.m.llamadas);
    const cartera = ORDEN_ESTADOS.map((e) => [e, s.locales.filter((l) => l.estado === e).length]);
    return { total, porPersona, cartera };
  }, [s.llamadas, s.perfiles, s.locales, periodo]);

  const maxCitas = Math.max(1, ...d.porPersona.map((x) => x.m.citas));
  const maxCartera = Math.max(1, ...d.cartera.map(([, n]) => n));
  const embudo = [
    ['Llamadas', d.total.llamadas],
    ['Lo cogen', d.total.cogen],
    ['Con el dueño', d.total.dueno],
    ['Citas', d.total.citas],
    ['Ventas', d.total.ventas],
  ];

  return html`
    <${Cabecera} titulo="El" acento="equipo" sub="Cómo va cada uno">
      <a class="icono-btn" href="#/catalogo" aria-label="Catálogo"><${Icono} n="catalogo" /></a>
      <a class="icono-btn" href="#/ajustes" aria-label="Ajustes"><${Icono} n="ajustes" /></a>
    </${Cabecera}>
    <${SeccionConcurso} />
    <div class="seccion-cab"><h2>Actividad</h2></div>
    <${Chips} opciones=${PERIODOS} valor=${periodo} onCambio=${(v) => v && setPeriodo(v)} />

    <div class="tiles cuatro">
      <div class="tile"><b>${d.total.llamadas}</b><span>Llamadas</span></div>
      <div class="tile"><b>${d.total.dueno}</b><span>Con el dueño</span></div>
      <div class="tile destacado"><b>${d.total.citas}</b><span>Citas</span></div>
      <div class="tile oro"><b>${d.total.ventas}</b><span>${d.total.importe ? euros(d.total.importe) : 'Ventas'}</span></div>
    </div>

    <${Seccion} titulo="Embudo">
      <div class="embudo">${embudo.map(([txt, n], i) => html`<div class="embudo-fila">
        <span>${txt}</span>
        <div class="barra"><i style=${`width:${d.total.llamadas ? Math.max(2, (n / d.total.llamadas) * 100) : 0}%;--c:${['var(--accent)', 'var(--st-rellamar)', 'var(--cyan)', 'var(--st-cita)', 'var(--st-cliente)'][i]}`}></i></div>
        <b>${n}</b><small>${i ? pct(n, embudo[i - 1][1]) : ''}</small>
      </div>`)}</div>
    </${Seccion}>

    <${Seccion} titulo="Por persona">
      ${d.porPersona.length ? html`<div class="ranking">${d.porPersona.map(({ p, m }) => html`<article class="persona" key=${p.id}>
        <div class="persona-cab"><${Avatar} p=${p} t=${34} /><div><b>${p.nombre}</b><small>${p.rol === 'socio' ? 'Socio' : 'Comercial'}</small></div>
          <div class="persona-citas"><b>${m.citas}</b><small>citas</small></div></div>
        <div class="barra"><i style=${`width:${(m.citas / maxCitas) * 100}%;--c:${p.color}`}></i></div>
        <div class="persona-datos">
          <span><b>${m.llamadas}</b> llamadas</span>
          <span><b>${pct(m.cogen, m.llamadas)}</b> lo cogen</span>
          <span><b>${m.dueno}</b> con dueño</span>
          <span><b>${pct(m.citas, m.llamadas)}</b> llamada→cita</span>
          <span><b>${m.ventas}</b> ventas${m.importe ? ` · ${euros(m.importe)}` : ''}</span>
        </div>
      </article>`)}</div>` : html`<${Vacio} titulo="Sin actividad en este periodo" />`}
    </${Seccion}>

    <${Seccion} titulo="Cartera de locales">
      <div class="embudo">${d.cartera.map(([e, n]) => html`<a class="embudo-fila enlace" href=${`#/locales?estado=${e}`}>
        <span>${ESTADOS[e].txt}</span>
        <div class="barra"><i style=${`width:${(n / maxCartera) * 100}%;--c:${ESTADOS[e].color}`}></i></div>
        <b>${n}</b><small></small>
      </a>`)}</div>
    </${Seccion}>

    <${Seccion} titulo="Exportar a Excel">
      <div class="botones-fila">
        <button class="btn sec" onClick=${exportarLocales}><${Icono} n="descargar" /> Locales</button>
        <button class="btn sec" onClick=${exportarLlamadas}><${Icono} n="descargar" /> Llamadas (120 días)</button>
      </div>
    </${Seccion}>
  `;

  function exportarLocales() {
    const prod = (ids) => s.productos.filter((p) => ids?.includes(p.id)).map((p) => p.nombre).join(', ');
    descargarCSV(`locales-${isoLocal(new Date())}.csv`, [
      ['Local', 'Tipo', 'Zona', 'Dirección', 'Teléfono', 'Dueño', 'Móvil dueño', 'Estado', 'Interés', 'Habló con dueño', 'Cita día', 'Cita hora', 'Va', 'Rellamar', 'Productos', 'Venta €', 'Lo lleva', 'Nº llamadas', 'Última llamada', 'Notas'],
      ...s.locales.map((l) => [l.nombre, l.tipo, l.zona, l.direccion, l.telefono, l.dueno_nombre, l.dueno_telefono, ESTADOS[l.estado]?.txt, l.interes, l.hablado_con_dueno ? 'Sí' : 'No',
        l.cita_fecha, hora(l.cita_hora), l.cita_comercial_id ? nombreDe(l.cita_comercial_id) : '', l.rellamar_fecha, prod(l.productos), l.importe_venta,
        l.comercial_id ? nombreDe(l.comercial_id) : '', l.num_llamadas, l.ultima_llamada_en ? new Date(l.ultima_llamada_en).toLocaleString('es-ES') : '', l.notas]),
    ]);
  }

  function exportarLlamadas() {
    const nombreLocal = new Map(s.locales.map((l) => [l.id, l.nombre]));
    descargarCSV(`llamadas-${isoLocal(new Date())}.csv`, [
      ['Fecha', 'Comercial', 'Local', 'Tipo', 'Habló con', 'Resultado', 'Interés', 'Dueño', 'Empleado', 'Cita día', 'Cita hora', 'Importe €', 'Cita conseguida por', 'Puntos', 'Notas'],
      ...s.llamadas.map((l) => [new Date(l.creado_en).toLocaleString('es-ES'), nombreDe(l.comercial_id), nombreLocal.get(l.local_id), l.tipo,
        { nadie: 'Nadie', empleado: 'Empleado', dueno: 'Dueño' }[l.contacto], textoResultado(l), l.interes, l.dueno_nombre, l.empleado_nombre,
        l.cita_fecha, hora(l.cita_hora), l.importe, l.cita_conseguida_por ? nombreDe(l.cita_conseguida_por) : '',
        puntosDe(l, s.locales).map((pt) => `+${pt.puntos} ${nombreDe(pt.id)}`).join(', '), l.notas]),
    ]);
  }
}

// ---------- Catálogo ----------
export function Catalogo() {
  const s = useStore();
  const [editando, setEditando] = useState(null); // producto o {} para nuevo
  const socio = esSocio();
  const lista = s.productos.filter((p) => p.activo || socio);

  return html`
    <${Cabecera} titulo="El" acento="catálogo" sub="Lo que vendemos y a cuánto" atras="/">
      ${socio ? html`<button class="icono-btn principal" onClick=${() => setEditando({})} aria-label="Añadir producto"><${Icono} n="mas" /></button>` : null}
    </${Cabecera}>
    ${editando ? html`<${FormProducto} p=${editando} alTerminar=${() => setEditando(null)} />` : null}
    ${lista.length ? html`<div class="catalogo">${lista.map((p) => html`<article class="producto ${p.activo ? '' : 'inactivo'}" key=${p.id}>
      <div class="producto-cab"><b>${p.nombre}</b>${p.precio != null ? html`<span class="precio">${euros(p.precio)}</span>` : null}</div>
      ${p.descripcion ? html`<p>${p.descripcion}</p>` : null}
      ${p.precio_volumen ? html`<small class="volumen">Por volumen: ${p.precio_volumen}</small>` : null}
      <div class="producto-acc">
        ${p.url ? html`<a class="btn fantasma peque" href=${p.url} target="_blank" rel="noopener"><${Icono} n="externo" t=${16} /> Ver en la web</a>` : null}
        ${p.url ? html`<a class="btn fantasma peque" href=${`https://wa.me/?text=${encodeURIComponent(`${p.nombre}: ${p.url}`)}`} target="_blank" rel="noopener"><${Icono} n="chat" t=${16} /> Enviar</a>` : null}
        ${socio ? html`<button class="btn fantasma peque" onClick=${() => setEditando(p)}><${Icono} n="editar" t=${16} /> Editar</button>` : null}
      </div>
    </article>`)}</div>` : html`<${Vacio} titulo="El catálogo está vacío" />`}
  `;
}

function FormProducto({ p, alTerminar }) {
  const [f, setF] = useState({ nombre: '', descripcion: '', precio: '', precio_volumen: '', url: '', activo: true, ...p, precio: p.precio ?? '' });
  const [guardando, setGuardando] = useState(false);
  const cambiar = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await guardarProducto({
        ...(p.id ? { id: p.id } : {}),
        nombre: f.nombre.trim(),
        descripcion: f.descripcion?.trim() || null,
        precio: f.precio === '' ? null : Number(String(f.precio).replace(',', '.')),
        precio_volumen: f.precio_volumen?.trim() || null,
        url: f.url?.trim() || null,
        activo: f.activo,
      });
      aviso('Producto guardado');
      alTerminar();
    } catch (err) {
      aviso(mensajeError(err), 'error');
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!confirm(`¿Borrar «${p.nombre}» del catálogo?`)) return;
    try {
      await borrarProducto(p.id);
      aviso('Producto borrado');
      alTerminar();
    } catch (err) {
      aviso(mensajeError(err), 'error');
    }
  }

  return html`<form class="formulario tarjeta-form" onSubmit=${guardar}>
    <${Campo} etiqueta="Nombre *"><input value=${f.nombre} onInput=${(e) => cambiar('nombre', e.target.value)} required /><//>
    <${Campo} etiqueta="Descripción"><textarea rows="2" value=${f.descripcion || ''} onInput=${(e) => cambiar('descripcion', e.target.value)}></textarea><//>
    <div class="dos-col">
      <${Campo} etiqueta="Precio (€)"><input inputmode="decimal" value=${f.precio} onInput=${(e) => cambiar('precio', e.target.value)} /><//>
      <${Campo} etiqueta="Precio por volumen"><input value=${f.precio_volumen || ''} onInput=${(e) => cambiar('precio_volumen', e.target.value)} placeholder="12,50 €/ud desde 40 ud" /><//>
    </div>
    <${Campo} etiqueta="Enlace en la web"><input type="url" value=${f.url || ''} onInput=${(e) => cambiar('url', e.target.value)} placeholder="https://visaxnfc.es/productos/…" /><//>
    <label class="interruptor"><input type="checkbox" checked=${f.activo} onChange=${(e) => cambiar('activo', e.target.checked)} /> Visible para los comerciales</label>
    <div class="botones-fila">
      <button class="btn primario" disabled=${guardando}>${guardando ? 'Guardando…' : 'Guardar'}</button>
      <button type="button" class="btn fantasma" onClick=${alTerminar}>Cancelar</button>
      ${p.id ? html`<button type="button" class="btn peligro" onClick=${borrar}><${Icono} n="papelera" t=${16} /></button>` : null}
    </div>
  </form>`;
}

// ---------- Ajustes ----------
export function Ajustes() {
  const s = useStore();
  const [nombre, setNombre] = useState(s.yo.nombre);
  const [pass, setPass] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardarPerfil(cambios, ok) {
    setGuardando(true);
    try {
      await editarMiPerfil(cambios);
      aviso(ok);
    } catch (e) {
      aviso(mensajeError(e), 'error');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarPass(e) {
    e.preventDefault();
    if (pass.length < 6) return aviso('Mínimo 6 caracteres', 'error');
    setGuardando(true);
    try {
      await cambiarMiContrasena(pass);
      setPass('');
      aviso('Contraseña cambiada');
    } catch (err) {
      aviso(mensajeError(err), 'error');
    } finally {
      setGuardando(false);
    }
  }

  return html`
    <${Cabecera} titulo="Ajustes" atras="/" />
    <div class="perfil-cab"><${Avatar} p=${s.yo} t=${56} /><div><b>${s.yo.nombre}</b><small>${s.yo.rol === 'socio' ? 'Socio' : 'Comercial'} · usuario «${s.yo.usuario}»</small></div></div>

    <div class="formulario">
      <${Grupo} titulo="Mi perfil">
        <form class="en-linea" onSubmit=${(e) => { e.preventDefault(); nombre.trim() && guardarPerfil({ nombre: nombre.trim() }, 'Nombre guardado'); }}>
          <${Campo} etiqueta="Mi nombre (lo ve el equipo)"><input value=${nombre} onInput=${(e) => setNombre(e.target.value)} /><//>
          <button class="btn sec" disabled=${guardando || nombre.trim() === s.yo.nombre}>Guardar</button>
        </form>
        <span class="campo-et">Mi color</span>
        <div class="colores">${COLORES.map((c) => html`<button type="button" class=${`color ${s.yo.color === c ? 'on' : ''}`} style=${`--c:${c}`} aria-label=${`Color ${c}`}
          onClick=${() => guardarPerfil({ color: c }, 'Color guardado')}></button>`)}</div>
      <//>

      <${Grupo} titulo="Cambiar contraseña">
        <form class="en-linea" onSubmit=${guardarPass}>
          <${Campo} etiqueta="Nueva contraseña"><input type="password" autocomplete="new-password" value=${pass} onInput=${(e) => setPass(e.target.value)} /><//>
          <button class="btn sec" disabled=${guardando || !pass}>Cambiar</button>
        </form>
      <//>

      <div class="menu-lista">
        <a href="#/catalogo"><${Icono} n="catalogo" /> Catálogo de productos <${Icono} n="flecha" t=${16} /></a>
        ${esSocio() ? html`<a href="#/miembros"><${Icono} n="usuarios" /> Gestionar equipo <${Icono} n="flecha" t=${16} /></a>` : null}
        <a href="#/importar"><${Icono} n="subir" /> Importar lista de locales <${Icono} n="flecha" t=${16} /></a>
        <button onClick=${() => confirm('¿Cerrar sesión?') && cerrarSesion()}><${Icono} n="salir" /> Cerrar sesión</button>
      </div>
      <p class="tenue centro">Consejo: añade esta página a la pantalla de inicio del móvil para abrirla como una app.</p>
    </div>
  `;
}

// ---------- Gestión del equipo (solo socios) ----------
export function Miembros() {
  const s = useStore();
  const [nuevo, setNuevo] = useState(null);
  const [credenciales, setCredenciales] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  if (!esSocio()) return html`<${Cabecera} titulo="Equipo" atras="/ajustes" /><${Vacio} titulo="Solo para socios" />`;

  async function ejecutar(cuerpo, ok) {
    setOcupado(true);
    try {
      const r = await gestionarEquipo(cuerpo);
      aviso(ok);
      return r || true;
    } catch (e) {
      aviso(mensajeError(e), 'error');
      return null;
    } finally {
      setOcupado(false);
    }
  }

  async function crear(e) {
    e.preventDefault();
    const r = await ejecutar({ accion: 'crear', ...nuevo }, 'Persona añadida');
    if (r) {
      setCredenciales({ usuario: r.usuario, password: nuevo.password, nombre: nuevo.nombre });
      setNuevo(null);
    }
  }

  async function nuevaContrasena(p) {
    const password = prompt(`Nueva contraseña para ${p.nombre}:`, contrasenaAleatoria());
    if (!password) return;
    if (await ejecutar({ accion: 'contrasena', id: p.id, password }, 'Contraseña cambiada')) setCredenciales({ usuario: p.usuario, password, nombre: p.nombre });
  }

  async function renombrar(p) {
    const nombre = prompt('Nombre que verá el equipo:', p.nombre);
    if (nombre === null) return;
    const usuario = prompt('Usuario para entrar (sin espacios):', p.usuario);
    if (usuario === null) return;
    await ejecutar({ accion: 'editar', id: p.id, nombre, ...(usuario.trim() && usuario.trim() !== p.usuario ? { usuario } : {}) }, 'Datos guardados');
  }

  const mensaje = credenciales && `Hola ${credenciales.nombre}, ya tienes acceso a la app del equipo VISAX:\n${location.origin}\nUsuario: ${credenciales.usuario}\nContraseña: ${credenciales.password}\n(Puedes cambiar la contraseña en Ajustes)`;

  return html`
    <${Cabecera} titulo="Gestionar equipo" sub="Quién puede entrar en la app" atras="/ajustes">
      <button class="icono-btn principal" onClick=${() => setNuevo({ nombre: '', usuario: '', password: contrasenaAleatoria(), rol: 'comercial' })} aria-label="Añadir persona"><${Icono} n="mas" /></button>
    </${Cabecera}>

    ${credenciales ? html`<div class="credenciales">
      <b>Datos de acceso de ${credenciales.nombre}</b>
      <pre>${`Usuario: ${credenciales.usuario}\nContraseña: ${credenciales.password}`}</pre>
      <div class="botones-fila">
        <a class="btn primario" href=${`https://wa.me/?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener"><${Icono} n="chat" /> Enviar por WhatsApp</a>
        <button class="btn sec" onClick=${() => navigator.clipboard?.writeText(mensaje).then(() => aviso('Copiado'))}>Copiar</button>
        <button class="btn fantasma" onClick=${() => setCredenciales(null)}>Cerrar</button>
      </div>
    </div>` : null}

    ${nuevo ? html`<form class="formulario tarjeta-form" onSubmit=${crear}>
      <div class="dos-col">
        <${Campo} etiqueta="Nombre"><input value=${nuevo.nombre} onInput=${(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Lucía" required /><//>
        <${Campo} etiqueta="Usuario para entrar"><input value=${nuevo.usuario} autocapitalize="none" onInput=${(e) => setNuevo({ ...nuevo, usuario: e.target.value })} placeholder="lucia" required /><//>
      </div>
      <${Campo} etiqueta="Contraseña"><input value=${nuevo.password} onInput=${(e) => setNuevo({ ...nuevo, password: e.target.value })} required minlength="6" /><//>
      <${Chips} opciones=${[{ v: 'comercial', txt: 'Comercial' }, { v: 'socio', txt: 'Socio' }]} valor=${nuevo.rol} onCambio=${(v) => v && setNuevo({ ...nuevo, rol: v })} />
      <div class="botones-fila">
        <button class="btn primario" disabled=${ocupado}>${ocupado ? 'Creando…' : 'Crear acceso'}</button>
        <button type="button" class="btn fantasma" onClick=${() => setNuevo(null)}>Cancelar</button>
      </div>
    </form>` : null}

    <div class="lista">${s.perfiles.map((p) => html`<article class=${`miembro ${p.activo ? '' : 'inactivo'}`} key=${p.id}>
      <div class="miembro-cab"><${Avatar} p=${p} t=${36} />
        <div><b>${p.nombre}${p.id === s.yo.id ? ' (tú)' : ''}</b><small>${p.rol === 'socio' ? 'Socio' : 'Comercial'} · usuario «${p.usuario}»${p.activo ? '' : ' · desactivado'}</small></div></div>
      <div class="botones-fila">
        <button class="btn fantasma peque" disabled=${ocupado} onClick=${() => renombrar(p)}><${Icono} n="editar" t=${16} /> Nombre</button>
        <button class="btn fantasma peque" disabled=${ocupado} onClick=${() => nuevaContrasena(p)}>Contraseña</button>
        ${p.id !== s.yo.id ? html`
          <button class="btn fantasma peque" disabled=${ocupado} onClick=${() => ejecutar({ accion: 'editar', id: p.id, rol: p.rol === 'socio' ? 'comercial' : 'socio' }, 'Rol cambiado')}>
            Hacer ${p.rol === 'socio' ? 'comercial' : 'socio'}</button>
          <button class=${`btn peque ${p.activo ? 'peligro' : 'sec'}`} disabled=${ocupado}
            onClick=${() => (p.activo ? confirm(`¿Quitar el acceso a ${p.nombre}? Sus llamadas se quedan guardadas.`) : true) && ejecutar({ accion: 'activo', id: p.id, activo: !p.activo }, p.activo ? 'Acceso quitado' : 'Acceso devuelto')}>
            ${p.activo ? 'Quitar acceso' : 'Devolver acceso'}</button>` : null}
      </div>
    </article>`)}</div>
  `;
}
