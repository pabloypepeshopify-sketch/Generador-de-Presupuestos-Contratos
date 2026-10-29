'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { obtenerSesion } from '@/lib/sesion';
import { datosFormulario, erroresDe, esquemaAltaRapida, esquemaContacto, esquemaNegocio, esquemaServicio } from '@/lib/validacion';
import { mensajeErrorBD } from '@/lib/textos';
import { avisarTrasRedirigir } from '@/lib/aviso';
import type { ResultadoAccion } from '@/lib/tipos';

const SIN_SESION: ResultadoAccion = { ok: false, error: 'Tu sesión ha caducado. Vuelve a entrar.' };
const uuid = z.string().uuid();
const codigo = z.string().regex(/^[a-z_]{2,40}$/);

export async function crearNegocio(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const datos = esquemaAltaRapida.safeParse(datosFormulario(fd, ['servicios']));
  if (!datos.success) return { ok: false, ...erroresDe(datos.error) };
  const d = datos.data;
  const { data: id, error } = await supabase.rpc('crear_negocio', {
    p_nombre: d.nombre,
    p_sector: d.sector,
    p_direccion: d.direccion,
    p_localidad: d.localidad,
    p_telefono: d.telefono,
    p_responsable: d.responsable_id,
    p_contacto_nombre: d.contacto_nombre,
    p_contacto_cargo: d.contacto_cargo,
    p_servicios: d.servicios,
    p_nota: d.nota,
    p_tarea_tipo: d.tarea_tipo,
    p_tarea_descripcion: d.tarea_descripcion,
    p_tarea_fecha: d.tarea_fecha,
    p_tarea_hora: d.tarea_hora,
  });
  if (error || !id) return { ok: false, error: mensajeErrorBD(error?.message) };
  const despues = fd.get('despues');
  if (despues === 'visita' || despues === 'llamada') redirect(`/negocios/${id}/contacto?tipo=${despues}&nuevo=1`);
  await avisarTrasRedirigir('creado');
  redirect(`/negocios/${id}`);
}

export type Duplicado = { id: string; nombre: string; localidad: string | null; estado: string; responsable_id: string | null; motivo: 'nombre' | 'telefono' | 'direccion' };

export async function buscarDuplicados(datos: { nombre: string; telefono?: string; direccion?: string; excluir?: string }): Promise<Duplicado[]> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return [];
  const nombre = datos.nombre.trim().slice(0, 160);
  if (nombre.length < 3 && !(datos.telefono ?? '').replace(/\D/g, '')) return [];
  const { data } = await supabase.rpc('posibles_duplicados', {
    p_nombre: nombre,
    p_telefono: datos.telefono?.slice(0, 40) || null,
    p_direccion: datos.direccion?.slice(0, 200) || null,
    p_excluir: datos.excluir && uuid.safeParse(datos.excluir).success ? datos.excluir : null,
  });
  return (data ?? []) as Duplicado[];
}

export async function actualizarNegocio(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const id = uuid.safeParse(fd.get('id'));
  if (!id.success) return { ok: false, error: 'Negocio no válido' };
  const datos = esquemaNegocio.safeParse(datosFormulario(fd));
  if (!datos.success) return { ok: false, ...erroresDe(datos.error) };
  const { error } = await supabase.from('negocios').update(datos.data).eq('id', id.data);
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  return { ok: true, mensaje: 'Datos guardados' };
}

export async function cambiarEstado(id: string, estado: string): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success || !codigo.safeParse(estado).success) return { ok: false, error: 'Datos no válidos' };
  const { data, error } = await supabase.from('negocios').update({ estado }).eq('id', id).select('id').maybeSingle();
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  if (!data) return { ok: false, error: 'El negocio ya no existe' };
  return { ok: true, mensaje: 'Estado actualizado' };
}

export async function cambiarResponsable(id: string, responsableId: string | null): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success || (responsableId !== null && !uuid.safeParse(responsableId).success)) return { ok: false, error: 'Datos no válidos' };
  const { error } = await supabase.from('negocios').update({ responsable_id: responsableId }).eq('id', id);
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  return { ok: true, mensaje: 'Responsable actualizado' };
}

export async function borrarNegocio(id: string): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Negocio no válido' };
  const { error } = await supabase.from('negocios').delete().eq('id', id);
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  await avisarTrasRedirigir('borrado');
  redirect('/negocios');
}

export async function guardarServicio(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const datos = esquemaServicio.safeParse(datosFormulario(fd));
  if (!datos.success) return { ok: false, ...erroresDe(datos.error) };
  const { negocio_id, servicio, nivel, notas } = datos.data;
  const { error } =
    nivel === 'quitar'
      ? await supabase.from('negocio_servicios').delete().match({ negocio_id, servicio })
      : await supabase
          .from('negocio_servicios')
          .upsert({ negocio_id, servicio, nivel, notas, actualizado_en: new Date().toISOString() }, { onConflict: 'negocio_id,servicio' });
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  return { ok: true, mensaje: 'Servicio actualizado' };
}

export async function guardarContacto(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const datos = esquemaContacto.safeParse(datosFormulario(fd));
  if (!datos.success) return { ok: false, ...erroresDe(datos.error) };
  const id = fd.get('id');
  const d = datos.data;
  if (d.es_principal) {
    // Solo puede haber un contacto principal por negocio
    await supabase.from('contactos').update({ es_principal: false }).eq('negocio_id', d.negocio_id).eq('es_principal', true);
  }
  const { error } =
    typeof id === 'string' && uuid.safeParse(id).success
      ? await supabase.from('contactos').update(d).eq('id', id)
      : await supabase.from('contactos').insert(d);
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  return { ok: true, mensaje: 'Contacto guardado' };
}

export async function borrarContacto(id: string): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Contacto no válido' };
  const { error } = await supabase.from('contactos').delete().eq('id', id);
  if (error) return { ok: false, error: mensajeErrorBD(error.message) };
  return { ok: true, mensaje: 'Contacto eliminado' };
}
