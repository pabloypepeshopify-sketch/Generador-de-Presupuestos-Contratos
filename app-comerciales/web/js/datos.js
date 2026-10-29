// Conexión con Supabase, estado global y operaciones de datos.
import { useEffect, useReducer } from './preact.js';
import { mensajeError, normTxt } from './util.js';

export const SUPABASE_URL = 'https://jwissdakpdzfdrohsnzk.supabase.co';
// Clave publicable: puede ir en el navegador, los permisos los marca la RLS de la base de datos.
export const SUPABASE_KEY = 'sb_publishable_564OF9NIVbvLem0YoxeYsA_YFtLI4WA';
export const DOMINIO = 'equipo.visaxnfc.es';
const DIAS_HISTORIAL = 120;

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'visax-equipo' },
});

// ---------- Estado global ----------
// sesion: undefined = comprobando, null = sin sesión
export const store = {
  sesion: undefined,
  yo: null,
  perfiles: [],
  productos: [],
  locales: [],
  llamadas: [],
  zonas: [],
  cartas: [], // ids de los locales elegidos para imprimir cartas
  listo: false,
  errorCarga: null,
  aviso: null,
};
const oyentes = new Set();
let version = 0;

export function actualizar(cambios) {
  Object.assign(store, cambios);
  version++;
  oyentes.forEach((f) => f());
}

export function useStore() {
  const [, forzar] = useReducer((x) => x + 1, 0);
  const vista = version;
  useEffect(() => {
    oyentes.add(forzar);
    // Si el store cambió entre el render y la suscripción, repinta.
    if (vista !== version) forzar();
    return () => oyentes.delete(forzar);
  }, []);
  return store;
}

export const perfil = (id) => store.perfiles.find((p) => p.id === id);
export const esSocio = () => store.yo?.rol === 'socio';

// Inserta o reemplaza una fila en la lista del store.
export function fusionar(tabla, fila) {
  const lista = store[tabla];
  const existe = lista.some((x) => x.id === fila.id);
  const nueva = existe ? lista.map((x) => (x.id === fila.id ? fila : x)) : tabla === 'llamadas' ? [fila, ...lista] : [...lista, fila];
  const cambios = { [tabla]: nueva };
  if (tabla === 'perfiles' && fila.id === store.yo?.id) cambios.yo = fila;
  actualizar(cambios);
}

// ---------- Carga ----------
async function todas(consulta) {
  const paso = 1000;
  let filas = [];
  for (let desde = 0; ; desde += paso) {
    const { data, error } = await consulta().range(desde, desde + paso - 1);
    if (error) throw error;
    filas = filas.concat(data);
    if (data.length < paso) return filas;
  }
}

async function cargarTodo() {
  const desde = new Date(Date.now() - DIAS_HISTORIAL * 864e5).toISOString();
  const [perfiles, productos, locales, llamadas, zonas] = await Promise.all([
    todas(() => sb.from('perfiles').select('*').order('creado_en').order('id')),
    todas(() => sb.from('productos').select('*').order('orden').order('creado_en')),
    todas(() => sb.from('locales').select('*').order('creado_en').order('id')),
    todas(() => sb.from('llamadas').select('*').gte('creado_en', desde).order('creado_en', { ascending: false }).order('id')),
    todas(() => sb.from('zonas').select('*').order('creado_en').order('id')),
  ]);
  const yo = perfiles.find((p) => p.id === store.sesion?.user?.id) || null;
  actualizar({ perfiles, productos, locales, llamadas, zonas, yo, listo: true, errorCarga: null });
  escuchar();
}

let cargaEnCurso = null;
export function iniciar() {
  cargaEnCurso ??= cargarTodo()
    .catch((e) => actualizar({ errorCarga: mensajeError(e) }))
    .finally(() => (cargaEnCurso = null));
  return cargaEnCurso;
}

// ---------- Tiempo real: lo que hace un compañero aparece al momento ----------
let canal = null;
async function escuchar() {
  if (canal) return;
  canal = sb.channel('equipo');
  for (const tabla of ['locales', 'llamadas', 'perfiles', 'productos', 'zonas']) {
    canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, (p) => {
      if (p.errors?.length) return;
      if (p.eventType === 'DELETE') {
        if (p.old?.id) actualizar({ [tabla]: store[tabla].filter((x) => x.id !== p.old.id) });
      } else if (p.new?.id) fusionar(tabla, p.new);
    });
  }
  // Con la clave publicable hay que pasar el token del usuario, o la RLS rechaza los eventos.
  await sb.realtime.setAuth(store.sesion?.access_token);
  canal.subscribe();
}

// Al volver a la app tras un rato en segundo plano, recarga por si se perdió algún cambio.
let ocultaDesde = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) ocultaDesde = Date.now();
  else if (store.listo && ocultaDesde && Date.now() - ocultaDesde > 60_000) iniciar();
});

// ---------- Sesión ----------
export async function iniciarSesion(usuario, password) {
  const u = usuario.trim().toLowerCase();
  const email = u.includes('@') ? u : `${normTxt(u).replace(/[^a-z0-9._-]/g, '')}@${DOMINIO}`;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function cerrarSesion() {
  await sb.auth.signOut();
}

function limpiar() {
  if (canal) sb.removeChannel(canal);
  canal = null;
  actualizar({ yo: null, perfiles: [], productos: [], locales: [], llamadas: [], zonas: [], cartas: [], listo: false, errorCarga: null });
}

sb.auth.onAuthStateChange((evento, sesion) => {
  // Diferido: supabase-js no admite llamadas a la API dentro de este callback.
  setTimeout(() => {
    actualizar({ sesion });
    if (sesion && !store.listo) iniciar();
    if (!sesion) limpiar();
  }, 0);
});

// ---------- Locales ----------
export async function crearLocal(datos) {
  const { data, error } = await sb.from('locales').insert(datos).select().single();
  if (error) throw error;
  fusionar('locales', data);
  return data;
}

export async function editarLocal(id, cambios) {
  const { data, error } = await sb.from('locales').update(cambios).eq('id', id).select().single();
  if (error) throw error;
  fusionar('locales', data);
  return data;
}

export async function borrarLocal(id) {
  const { error } = await sb.from('locales').delete().eq('id', id);
  if (error) throw error;
  actualizar({ locales: store.locales.filter((l) => l.id !== id), llamadas: store.llamadas.filter((l) => l.local_id !== id) });
}

export async function importarLocales(filas) {
  let creados = 0;
  for (let i = 0; i < filas.length; i += 500) {
    const { data, error } = await sb.from('locales').insert(filas.slice(i, i + 500)).select();
    if (error) throw error;
    const ids = new Set(store.locales.map((l) => l.id));
    actualizar({ locales: [...store.locales, ...data.filter((d) => !ids.has(d.id))] });
    creados += data.length;
  }
  return creados;
}

// ---------- Llamadas y visitas ----------
export async function registrarLlamada(datos) {
  const { data, error } = await sb.from('llamadas').insert(datos).select().single();
  if (error) throw error;
  fusionar('llamadas', data);
  // El trigger de la base de datos actualiza la ficha del local; la traemos ya.
  const { data: local } = await sb.from('locales').select('*').eq('id', datos.local_id).single();
  if (local) fusionar('locales', local);
  return data;
}

export async function historial(localId) {
  const { data, error } = await sb.from('llamadas').select('*').eq('local_id', localId).order('creado_en', { ascending: false });
  if (error) throw error;
  return data;
}

// ---------- Captación: radar, informe, conversaciones del agente y cartas ----------
async function invocar(funcion, cuerpo) {
  const { data, error } = await sb.functions.invoke(funcion, { body: cuerpo });
  if (error) {
    let msg = error.message;
    try {
      msg = (await error.context.json()).error || msg;
    } catch {}
    throw new Error(msg);
  }
  return data;
}

export async function guardarZona(z) {
  const { id, ...campos } = z;
  const q = id ? sb.from('zonas').update(campos).eq('id', id) : sb.from('zonas').insert(campos);
  const { data, error } = await q.select().single();
  if (error) throw error;
  fusionar('zonas', data);
  return data;
}

export async function borrarZona(id) {
  const { error } = await sb.from('zonas').delete().eq('id', id);
  if (error) throw error;
  actualizar({ zonas: store.zonas.filter((z) => z.id !== id) });
}

// Barre la zona ahora en Google Maps. Los locales nuevos llegan solos por tiempo real.
export const lanzarRadar = (zonaId) => invocar('radar', { accion: 'zona', zona_id: zonaId });

export async function actividadDigital(localId) {
  const [eventos, conversaciones] = await Promise.all([
    sb.from('eventos').select('*').eq('local_id', localId).order('creado_en', { ascending: false }).limit(50),
    sb.from('conversaciones').select('id, canal, wa_id, creado_en, actualizado_en, mensajes(id, autor, texto, creado_en)')
      .eq('local_id', localId).order('actualizado_en', { ascending: false }),
  ]);
  if (eventos.error) throw eventos.error;
  if (conversaciones.error) throw conversaciones.error;
  for (const c of conversaciones.data) c.mensajes = c.mensajes.filter((m) => m.texto).sort((a, b) => a.id - b.id);
  return { eventos: eventos.data, conversaciones: conversaciones.data };
}

export const responderWhatsApp = (conversacionId, texto) => invocar('whatsapp', { accion: 'enviar', conversacion_id: conversacionId, texto });

export async function busqueda(id) {
  const { data, error } = await sb.from('busquedas').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function busquedasDe(ids) {
  if (!ids.length) return [];
  const { data, error } = await sb.from('busquedas').select('*').in('id', ids);
  if (error) throw error;
  return data;
}

export async function marcarCartasEnviadas(ids) {
  const ahora = new Date().toISOString();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await sb.from('locales').update({ carta_enviada_en: ahora }).in('id', ids.slice(i, i + 200)).select();
    if (error) throw error;
    data.forEach((l) => fusionar('locales', l));
  }
}

// ---------- Catálogo ----------
export async function guardarProducto(p) {
  const { id, ...campos } = p;
  const q = id ? sb.from('productos').update(campos).eq('id', id) : sb.from('productos').insert(campos);
  const { data, error } = await q.select().single();
  if (error) throw error;
  fusionar('productos', data);
  return data;
}

export async function borrarProducto(id) {
  const { error } = await sb.from('productos').delete().eq('id', id);
  if (error) throw error;
  actualizar({ productos: store.productos.filter((p) => p.id !== id) });
}

// ---------- Perfil y equipo ----------
export async function editarMiPerfil(cambios) {
  const { data, error } = await sb.from('perfiles').update(cambios).eq('id', store.yo.id).select().single();
  if (error) throw error;
  fusionar('perfiles', data);
}

export async function cambiarMiContrasena(password) {
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
}

// Acciones de socios (crear usuario, cambiar contraseña, rol, activar...) en la función "equipo".
export async function gestionarEquipo(cuerpo) {
  const { data, error } = await sb.functions.invoke('equipo', { body: cuerpo });
  if (error) {
    let msg = error.message;
    try {
      msg = (await error.context.json()).error || msg;
    } catch {}
    throw new Error(msg);
  }
  const { data: perfiles } = await sb.from('perfiles').select('*').order('creado_en').order('id');
  if (perfiles) actualizar({ perfiles, yo: perfiles.find((p) => p.id === store.yo?.id) || store.yo });
  return data;
}
