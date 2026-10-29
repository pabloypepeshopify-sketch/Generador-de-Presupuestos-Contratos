'use server';

import { z } from 'zod';
import { obtenerSesion } from '@/lib/sesion';
import { datosFormulario, erroresDe, esquemaInteraccion, esquemaReprogramar, esquemaTarea } from '@/lib/validacion';
import { mensajeErrorBD } from '@/lib/textos';
import type { ResultadoAccion } from '@/lib/tipos';

const SIN_SESION: ResultadoAccion = { ok: false, error: 'Tu sesión ha caducado. Vuelve a entrar.' };
const uuid = z.string().uuid();

/** Registra una visita, llamada u otro contacto y, si se ha revisado y marcado, su siguiente paso. Todo o nada. */
export async function registrarInteraccion(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const datos = esquemaInteraccion.safeParse(datosFormulario(fd));
  if (!datos.success) return { ok: false, ...erroresDe(datos.error) };
  const d = datos.data;
  const { error } = await supabase.rpc('registrar_interaccion', {
    p_negocio: d.negocio_id,
    p_tipo: d.tipo,
    p_resultado: d.resultado,
    p_fecha_local: d.fecha_local,
    p_socio: d.socio_id,
    p_persona: d.persona,
    p_servicios: d.servicios,
    p_notas: d.notas,
    p_crear_tarea: d.crear_tarea,
    p_tarea_tipo: d.crear_tarea ? d.tarea_tipo : null,
    p_tarea_descripcion: d.crear_tarea ? d.tarea_descripcion : null,
    p_tarea_fecha: d.crear_tarea ? d.tarea_fecha : null,
    p_tarea_hora: d.crear_tarea ? d.tarea_hora : null,
    p_tarea_responsable: d.crear_tarea ? d.tarea_responsable : null,
    p_nuevo_estado: d.nuevo_estado,
    p_horario_contacto: d.horario_contacto,
    p_completar_tarea: d.completar_tarea,
  });
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  // La navegación a la ficha la hace el formulario (más fiable que redirigir a la página padre)
  return { ok: true, mensaje: 'Contacto registrado' };
}

export async function borrarInteraccion(id: string): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Contacto no válido' };
  const { error } = await supabase.from('interacciones').delete().eq('id', id);
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  return { ok: true, mensaje: 'Contacto eliminado del historial' };
}

export async function crearTarea(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const datos = esquemaTarea.safeParse(datosFormulario(fd));
  if (!datos.success) return { ok: false, ...erroresDe(datos.error) };
  const d = datos.data;
  const { error } = await supabase.from('tareas').insert({ ...d, vence_hora: d.vence_fecha ? d.vence_hora : null });
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  return { ok: true, mensaje: 'Tarea creada' };
}

export async function editarTarea(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const id = uuid.safeParse(fd.get('id'));
  const datos = esquemaTarea.safeParse(datosFormulario(fd));
  if (!id.success) return { ok: false, error: 'Tarea no válida' };
  if (!datos.success) return { ok: false, ...erroresDe(datos.error) };
  const { negocio_id: _negocio, ...d } = datos.data;
  const { error } = await supabase.from('tareas').update({ ...d, vence_hora: d.vence_fecha ? d.vence_hora : null }).eq('id', id.data);
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  return { ok: true, mensaje: 'Tarea actualizada' };
}

export async function reprogramarTarea(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const datos = esquemaReprogramar.safeParse(datosFormulario(fd));
  if (!datos.success) return { ok: false, ...erroresDe(datos.error) };
  const { id, vence_fecha, vence_hora } = datos.data;
  const { error } = await supabase
    .from('tareas')
    .update({ vence_fecha, vence_hora: vence_fecha ? vence_hora : null })
    .eq('id', id)
    .eq('estado', 'pendiente');
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  return { ok: true, mensaje: vence_fecha ? 'Tarea reprogramada' : 'Tarea sin fecha' };
}

/** Marca una tarea como hecha sin registrar contacto (por ejemplo, «Preparar presupuesto») */
export async function completarTarea(id: string): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Tarea no válida' };
  const { error } = await supabase.from('tareas').update({ estado: 'completada' }).eq('id', id).eq('estado', 'pendiente');
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  return { ok: true, mensaje: 'Tarea completada' };
}

export async function reabrirTarea(id: string): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Tarea no válida' };
  const { error } = await supabase.from('tareas').update({ estado: 'pendiente' }).eq('id', id);
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  return { ok: true, mensaje: 'Tarea pendiente otra vez' };
}

export async function borrarTarea(id: string): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Tarea no válida' };
  const { error } = await supabase.from('tareas').delete().eq('id', id);
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  return { ok: true, mensaje: 'Tarea eliminada' };
}
