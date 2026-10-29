import type { SupabaseClient } from '@supabase/supabase-js';
import { madridAUtc, hoy, semanaActual, sumarDias } from '@/lib/fechas';
import { normalizar } from '@/lib/textos';
import type { NegocioVista } from '@/lib/tipos';

// Filtros de la tabla de negocios. Viven en la URL para poder compartirlos y combinarlos.
export type Filtros = {
  q: string;
  estado: string;
  responsable: string;
  servicio: string;
  sector: string;
  localidad: string;
  canal: string;
  ultimo: string;
  ultimo_desde: string;
  ultimo_hasta: string;
  proximo: string;
  proximo_desde: string;
  proximo_hasta: string;
  pendientes: boolean;
  orden: string;
  pagina: number;
};

export const POR_PAGINA = 50;

export const ESTADOS_ESPECIALES: { v: string; txt: string }[] = [
  { v: 'abiertos', txt: 'Abiertos (sin cerrar ni ganar)' },
  { v: 'grupo:oportunidad', txt: 'Oportunidades activas' },
  { v: 'grupo:propuestas', txt: 'Propuesta enviada o decisión pendiente' },
];

export const PRESETS_ULTIMO = [
  { v: 'hoy', txt: 'Hoy' },
  { v: '7d', txt: 'Últimos 7 días' },
  { v: '30d', txt: 'Últimos 30 días' },
  { v: 'mas30', txt: 'Hace más de 30 días' },
  { v: 'nunca', txt: 'Nunca contactado' },
  { v: 'rango', txt: 'Entre fechas…' },
];

export const PRESETS_PROXIMO = [
  { v: 'atrasado', txt: 'Atrasado' },
  { v: 'hoy', txt: 'Hoy' },
  { v: 'semana', txt: 'Esta semana' },
  { v: '7d', txt: 'Próximos 7 días' },
  { v: 'sin_fecha', txt: 'Pendiente sin fecha' },
  { v: 'sin_tarea', txt: 'Sin tarea pendiente' },
  { v: 'rango', txt: 'Entre fechas…' },
];

export const ORDENES = [
  { v: 'reciente', txt: 'Último contacto (reciente primero)' },
  { v: 'proxima', txt: 'Próxima acción (antes primero)' },
  { v: 'estado', txt: 'Estado comercial' },
  { v: 'creado', txt: 'Fecha de alta (nuevos primero)' },
  { v: 'nombre', txt: 'Nombre (A-Z)' },
];

const fechaValida = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');

export function leerFiltros(sp: Record<string, string | string[] | undefined>): Filtros {
  const v = (k: string) => {
    const x = sp[k];
    return (Array.isArray(x) ? x[0] : x ?? '').toString().slice(0, 120);
  };
  return {
    q: v('q').trim(),
    estado: v('estado'),
    responsable: v('responsable'),
    servicio: v('servicio'),
    sector: v('sector'),
    localidad: v('localidad'),
    canal: v('canal'),
    ultimo: v('ultimo'),
    ultimo_desde: fechaValida(v('ultimo_desde')),
    ultimo_hasta: fechaValida(v('ultimo_hasta')),
    proximo: v('proximo'),
    proximo_desde: fechaValida(v('proximo_desde')),
    proximo_hasta: fechaValida(v('proximo_hasta')),
    pendientes: v('pendientes') === '1',
    orden: ORDENES.some((o) => o.v === v('orden')) ? v('orden') : 'reciente',
    pagina: Math.max(1, Math.min(1000, Number.parseInt(v('pagina') || '1', 10) || 1)),
  };
}

export const filtrosActivos = (f: Filtros) =>
  [f.q, f.estado, f.responsable, f.servicio, f.sector, f.localidad, f.canal, f.ultimo, f.proximo, f.pendientes ? '1' : ''].filter(Boolean).length;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODIGO = /^[a-z_]{2,40}$/;

/** Consulta la vista de negocios aplicando todos los filtros en la base de datos */
export async function consultarNegocios(supabase: SupabaseClient, f: Filtros, { paginar = true } = {}) {
  let q = supabase.from('negocios_vista').select('*', { count: 'exact' });

  if (f.q) {
    const texto = normalizar(f.q);
    const digitos = f.q.replace(/\D/g, '');
    if (digitos.length >= 3 && digitos.length >= f.q.replace(/\s/g, '').length - 1) q = q.ilike('busqueda_tel', `%${digitos}%`);
    else if (texto) q = q.ilike('busqueda', `%${texto}%`);
  }

  if (f.estado === 'abiertos') q = q.not('estado', 'in', '(cliente_ganado,no_interesado,descartado)');
  else if (f.estado === 'grupo:oportunidad') q = q.eq('estado_grupo', 'oportunidad');
  else if (f.estado === 'grupo:propuestas') q = q.in('estado', ['propuesta_enviada', 'decision_pendiente']);
  else if (CODIGO.test(f.estado)) q = q.eq('estado', f.estado);

  if (f.responsable === 'sin') q = q.is('responsable_id', null);
  else if (UUID.test(f.responsable)) q = q.eq('responsable_id', f.responsable);

  if (CODIGO.test(f.servicio)) q = q.contains('servicios_interes', [f.servicio]);
  if (f.sector) q = q.eq('sector', f.sector);
  if (f.localidad) q = q.eq('localidad', f.localidad);
  if (CODIGO.test(f.canal)) q = q.contains('tipos_contacto', [f.canal]);

  const h = hoy();
  const inicioHoy = madridAUtc(h).toISOString();
  switch (f.ultimo) {
    case 'hoy':
      q = q.gte('ultima_interaccion_en', inicioHoy);
      break;
    case '7d':
      q = q.gte('ultima_interaccion_en', madridAUtc(sumarDias(h, -6)).toISOString());
      break;
    case '30d':
      q = q.gte('ultima_interaccion_en', madridAUtc(sumarDias(h, -29)).toISOString());
      break;
    case 'mas30':
      q = q.lt('ultima_interaccion_en', madridAUtc(sumarDias(h, -29)).toISOString());
      break;
    case 'nunca':
      q = q.is('ultima_interaccion_en', null);
      break;
    case 'rango':
      if (f.ultimo_desde) q = q.gte('ultima_interaccion_en', madridAUtc(f.ultimo_desde).toISOString());
      if (f.ultimo_hasta) q = q.lt('ultima_interaccion_en', madridAUtc(sumarDias(f.ultimo_hasta, 1)).toISOString());
      break;
  }

  const semana = semanaActual();
  switch (f.proximo) {
    case 'atrasado':
      q = q.lt('proxima_fecha', h);
      break;
    case 'hoy':
      q = q.eq('proxima_fecha', h);
      break;
    case 'semana':
      q = q.gte('proxima_fecha', semana.inicio).lte('proxima_fecha', semana.fin);
      break;
    case '7d':
      q = q.gte('proxima_fecha', h).lte('proxima_fecha', sumarDias(h, 7));
      break;
    case 'sin_fecha':
      q = q.gt('tareas_pendientes', 0).is('proxima_fecha', null);
      break;
    case 'sin_tarea':
      q = q.eq('tareas_pendientes', 0);
      break;
    case 'rango':
      if (f.proximo_desde) q = q.gte('proxima_fecha', f.proximo_desde);
      if (f.proximo_hasta) q = q.lte('proxima_fecha', f.proximo_hasta);
      break;
  }

  if (f.pendientes) q = q.gt('tareas_pendientes', 0);

  switch (f.orden) {
    case 'proxima':
      q = q.order('proxima_fecha', { ascending: true, nullsFirst: false }).order('proxima_hora', { ascending: true, nullsFirst: false });
      break;
    case 'estado':
      q = q.order('estado_orden').order('nombre');
      break;
    case 'creado':
      q = q.order('creado_en', { ascending: false });
      break;
    case 'nombre':
      q = q.order('nombre');
      break;
    default:
      q = q.order('ultima_interaccion_en', { ascending: false, nullsFirst: false }).order('creado_en', { ascending: false });
  }
  q = q.order('id');

  if (paginar) q = q.range((f.pagina - 1) * POR_PAGINA, f.pagina * POR_PAGINA - 1);
  else q = q.limit(1000);

  const { data, count, error } = await q;
  if (error) throw new Error(`No se han podido cargar los negocios: ${error.message}`);
  return { negocios: (data ?? []) as NegocioVista[], total: count ?? 0 };
}

/** Sectores y localidades que ya existen, para los desplegables de filtros */
export async function valoresUsados(supabase: SupabaseClient) {
  const { data } = await supabase.from('negocios').select('sector, localidad').limit(5000);
  const ordenar = (l: (string | null)[]) => [...new Set(l.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, 'es'));
  return { sectores: ordenar((data ?? []).map((d) => d.sector)), localidades: ordenar((data ?? []).map((d) => d.localidad)) };
}
