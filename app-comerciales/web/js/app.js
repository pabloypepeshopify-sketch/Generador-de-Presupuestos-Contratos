// Punto de entrada: sesión, navegación y armazón de la app.
import { html, render, useState } from './preact.js';
import { cerrarSesion, iniciar, iniciarSesion, useStore } from './datos.js';
import { Aviso, Cargando, Icono, useRuta } from './ui.js';
import { Agenda, Inicio } from './inicio.js';
import { EditarLocal, FichaLocal, Importar, Locales } from './locales.js';
import { FormLlamada } from './llamada.js';
import { Ajustes, Catalogo, Informe, Miembros } from './equipo.js';
import { mensajeError } from './util.js';

function Login() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setError('');
    setEntrando(true);
    try {
      await iniciarSesion(usuario, password);
    } catch (err) {
      setError(mensajeError(err));
      setEntrando(false);
    }
  }

  return html`<main class="login">
    <form class="login-caja" onSubmit=${entrar}>
      <div class="marca"><span class="marca-logo">V</span><div><b>VISAX NFC</b><small>Equipo comercial</small></div></div>
      <h1>Entra en tu cuenta</h1>
      <label class="campo"><span class="campo-et">Usuario</span>
        <input value=${usuario} onInput=${(e) => setUsuario(e.target.value)} autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="p. ej. comercial1" required /></label>
      <label class="campo"><span class="campo-et">Contraseña</span>
        <input type="password" value=${password} onInput=${(e) => setPassword(e.target.value)} autocomplete="current-password" required /></label>
      ${error ? html`<p class="error">${error}</p>` : null}
      <button class="btn primario grande bloque" disabled=${entrando}>${entrando ? 'Entrando…' : 'Entrar'}</button>
      <p class="tenue centro">¿No tienes cuenta? Pídesela a Pablo o a Pepe.</p>
    </form>
  </main>`;
}

const NAV = [
  ['/', 'inicio', 'Inicio'],
  ['/locales', 'locales', 'Locales'],
  null,
  ['/agenda', 'agenda', 'Agenda'],
  ['/equipo', 'equipo', 'Equipo'],
];

function Nav({ activa }) {
  return html`<nav class="nav" aria-label="Secciones">
    <div class="nav-marca"><span class="marca-logo">V</span><b>VISAX Equipo</b></div>
    ${NAV.map((it) => (it
      ? html`<a href=${`#${it[0]}`} class=${activa === it[0] ? 'on' : ''} aria-current=${activa === it[0] ? 'page' : null}><${Icono} n=${it[1]} t=${22} /><span>${it[2]}</span></a>`
      : html`<a href="#/llamada" class="fab" aria-label="Apuntar llamada"><${Icono} n="tel" t=${24} /><span>Llamada</span></a>`))}
  </nav>`;
}

function Pagina({ ruta }) {
  const [a, b, c] = ruta.partes;
  switch (a) {
    case undefined: return [html`<${Inicio} />`, '/'];
    case 'locales': return [html`<${Locales} query=${ruta.query} />`, '/locales'];
    case 'local': return [c === 'editar' ? html`<${EditarLocal} id=${b} />` : html`<${FichaLocal} id=${b} />`, '/locales'];
    case 'nuevo-local': return [html`<${EditarLocal} />`, '/locales'];
    case 'importar': return [html`<${Importar} />`, '/locales'];
    case 'llamada': return [html`<${FormLlamada} query=${ruta.query} />`, ''];
    case 'visita': return [html`<${FormLlamada} query=${ruta.query} tipo="visita" />`, ''];
    case 'agenda': return [html`<${Agenda} query=${ruta.query} />`, '/agenda'];
    case 'equipo': return [html`<${Informe} />`, '/equipo'];
    case 'catalogo': return [html`<${Catalogo} />`, ''];
    case 'ajustes': return [html`<${Ajustes} />`, ''];
    case 'miembros': return [html`<${Miembros} />`, ''];
    default: return [html`<${Inicio} />`, '/'];
  }
}

function App() {
  const s = useStore();
  const ruta = useRuta();

  if (s.sesion === undefined) return html`<${Cargando} />`;
  if (!s.sesion) return html`<${Login} /><${Aviso} />`;
  if (!s.listo) {
    if (!s.errorCarga) return html`<${Cargando} texto="Cargando datos del equipo…" />`;
    return html`<div class="cargando"><p>${s.errorCarga}</p>
      <button class="btn primario" onClick=${iniciar}>Reintentar</button>
      <button class="btn fantasma" onClick=${cerrarSesion}>Cerrar sesión</button></div>`;
  }
  if (!s.yo?.activo) {
    return html`<div class="cargando"><p>Esta cuenta no tiene acceso a la app del equipo.</p>
      <button class="btn primario" onClick=${cerrarSesion}>Salir</button></div>`;
  }

  const [contenido, activa] = Pagina({ ruta });
  return html`<div class="app">
    <${Nav} activa=${activa} />
    <main class="pagina" key=${ruta.ruta + JSON.stringify(ruta.query)}>${contenido}</main>
    <${Aviso} />
  </div>`;
}

render(html`<${App} />`, document.getElementById('app'));
