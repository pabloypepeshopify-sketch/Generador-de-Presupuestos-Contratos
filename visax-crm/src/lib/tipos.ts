// Tipos de las filas de la base de datos (ver supabase/migrations)

export type Socio = { id: string; usuario: string; nombre: string; color: string };

export type GrupoEstado = 'inicio' | 'seguimiento' | 'oportunidad' | 'ganado' | 'cerrado';
export type Estado = { codigo: string; nombre: string; descripcion: string; orden: number; color: string; grupo: GrupoEstado };

export type Servicio = { codigo: string; nombre: string; orden: number; activo: boolean };
export type TipoSimple = { codigo: string; nombre: string; orden: number; activo: boolean };

export type GrupoResultado = 'localizar' | 'sin_interes' | 'interes' | 'decision' | 'otro';
export type Resultado = {
  codigo: string;
  nombre: string;
  grupo: GrupoResultado;
  orden: number;
  sugerencia_estado: string | null;
  sugerencia_tarea: string | null;
  sugerencia_dias: number | null;
  pide_hora: boolean;
  activo: boolean;
};

export type Catalogos = {
  estados: Estado[];
  servicios: Servicio[];
  tiposInteraccion: TipoSimple[];
  tiposTarea: TipoSimple[];
  resultados: Resultado[];
  socios: Socio[];
};

export type NivelInteres = 'alto' | 'medio' | 'bajo' | 'por_valorar' | 'no';

export type Negocio = {
  id: string;
  nombre: string;
  razon_social: string | null;
  sector: string | null;
  direccion: string | null;
  localidad: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  redes: string | null;
  responsable_id: string | null;
  creado_por: string | null;
  estado: string;
  potencial: 'bajo' | 'medio' | 'alto' | null;
  presupuesto_estimado: number | null;
  necesidades: string | null;
  problemas: string | null;
  objeciones: string | null;
  horario_contacto: string | null;
  notas: string | null;
  ultima_interaccion_en: string | null;
  estado_cambiado_en: string;
  creado_en: string;
  actualizado_en: string;
};

export type NegocioVista = Negocio & {
  estado_nombre: string;
  estado_orden: number;
  estado_color: string;
  estado_grupo: GrupoEstado;
  contacto_nombre: string | null;
  contacto_cargo: string | null;
  telefono_contacto: string | null;
  servicios_interes: string[];
  ultima_tipo: string | null;
  ultima_resultado: string | null;
  ultima_socio_id: string | null;
  tipos_contacto: string[];
  proxima_tarea_id: string | null;
  proxima_accion: string | null;
  proxima_tipo: string | null;
  proxima_fecha: string | null;
  proxima_hora: string | null;
  proxima_responsable_id: string | null;
  tareas_pendientes: number;
};

export type Contacto = {
  id: string;
  negocio_id: string;
  nombre: string;
  cargo: string | null;
  telefono: string | null;
  email: string | null;
  es_principal: boolean;
  notas: string | null;
  creado_en: string;
};

export type NegocioServicio = {
  negocio_id: string;
  servicio: string;
  nivel: NivelInteres;
  notas: string | null;
  actualizado_en: string;
};

export type Interaccion = {
  id: string;
  negocio_id: string;
  tipo: string;
  fecha: string;
  socio_id: string;
  registrada_por: string;
  persona: string | null;
  resultado: string;
  servicios: string[];
  notas: string | null;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  proxima_hora: string | null;
  creado_en: string;
};

export type Tarea = {
  id: string;
  negocio_id: string;
  tipo: string;
  descripcion: string;
  responsable_id: string | null;
  vence_fecha: string | null;
  vence_hora: string | null;
  estado: 'pendiente' | 'completada';
  notas: string | null;
  origen_interaccion_id: string | null;
  cierre_interaccion_id: string | null;
  completada_en: string | null;
  completada_por: string | null;
  creado_por: string | null;
  creado_en: string;
};

export type TareaConNegocio = Tarea & {
  negocios: { id: string; nombre: string; localidad: string | null; estado: string; horario_contacto: string | null } | null;
};

export type CambioEstado = {
  id: string;
  negocio_id: string;
  estado_anterior: string | null;
  estado_nuevo: string;
  socio_id: string | null;
  interaccion_id: string | null;
  creado_en: string;
};

// Respuesta estándar de las acciones del servidor
export type ResultadoAccion<T = undefined> = { ok: true; datos?: T; mensaje?: string } | { ok: false; error: string; campos?: Record<string, string> };
