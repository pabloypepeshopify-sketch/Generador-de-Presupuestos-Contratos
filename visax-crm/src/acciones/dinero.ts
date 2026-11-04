'use server';

import { z } from 'zod';
import { obtenerSesion } from '@/lib/sesion';
import { hoy } from '@/lib/fechas';
import { MAX_ARCHIVO } from '@/lib/dinero';
import { datosFormulario, erroresDe, esquemaCobro, esquemaContrato, esquemaFactura, esquemaGasto, esquemaMarcarCobrado } from '@/lib/validacion';
import { mensajeErrorBD } from '@/lib/textos';
import type { ResultadoAccion } from '@/lib/tipos';

const SIN_SESION: ResultadoAccion = { ok: false, error: 'Tu sesión ha caducado. Vuelve a entrar.' };
const uuid = z.string().uuid();
const BUCKET = 'documentos';

const errorDinero = (m: string | undefined) => {
  if (m && /facturas_numero_unico/.test(m)) return 'Ya hay una factura con ese número.';
  if (m && /cobros_contrato_id_fecha_prevista_key/.test(m)) return 'Ese servicio ya tiene una cuota en esa fecha.';
  return mensajeErrorBD(m);
};

// ---------- Servicios contratados ----------
export async function guardarContrato(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const datos = esquemaContrato.safeParse(datosFormulario(fd));
  if (!datos.success) return { ok: false, ...erroresDe(datos.error) };
  const d = datos.data;
  const { error } = await supabase.rpc('guardar_contrato', {
    p_id: d.id,
    p_negocio: d.negocio_id,
    p_concepto: d.concepto,
    p_servicio: d.servicio,
    p_periodicidad: d.periodicidad,
    p_importe: d.importe_base,
    p_iva: d.iva_pct,
    p_irpf: d.irpf_pct,
    p_inicio: d.fecha_inicio,
    p_fin: d.periodicidad === 'unico' ? null : d.fecha_fin,
    p_notas: d.notas,
  });
  if (error) return { ok: false, error: errorDinero(error.message) };
  return { ok: true, mensaje: d.id ? 'Servicio actualizado' : 'Servicio añadido' };
}

export async function borrarContrato(id: string): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Servicio no válido' };
  const { error } = await supabase.rpc('borrar_contrato', { p_id: id });
  if (error) return { ok: false, error: errorDinero(error.message) };
  return { ok: true, mensaje: 'Servicio quitado. Lo ya cobrado se conserva.' };
}

// ---------- Cobros ----------
export async function guardarCobro(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const datos = esquemaCobro.safeParse(datosFormulario(fd));
  if (!datos.success) return { ok: false, ...erroresDe(datos.error) };
  const { id, ya_cobrado, fecha_cobro, metodo, ...d } = datos.data;
  const campos = { concepto: d.concepto, fecha_prevista: d.fecha_prevista, importe_base: d.importe_base, iva_pct: d.iva_pct, irpf_pct: d.irpf_pct, notas: d.notas };
  const { error } = id
    ? await supabase.from('cobros').update(campos).eq('id', id)
    : await supabase.from('cobros').insert({
        ...campos,
        negocio_id: d.negocio_id,
        ...(ya_cobrado ? { estado: 'cobrado', fecha_cobro, metodo } : {}),
      });
  if (error) return { ok: false, error: errorDinero(error.message) };
  return { ok: true, mensaje: id ? 'Cobro actualizado' : 'Cobro añadido' };
}

export async function marcarCobrado(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const datos = esquemaMarcarCobrado.safeParse(datosFormulario(fd));
  if (!datos.success) return { ok: false, ...erroresDe(datos.error) };
  const { id, fecha_cobro, metodo } = datos.data;
  const { data, error } = await supabase.from('cobros').update({ estado: 'cobrado', fecha_cobro, metodo }).eq('id', id).neq('estado', 'cobrado').select('id');
  if (error) return { ok: false, error: errorDinero(error.message) };
  if (!data?.length) return { ok: false, error: 'Ese cobro ya estaba cobrado o ya no existe' };
  return { ok: true, mensaje: 'Cobro apuntado' };
}

/** Vuelve a pendiente un cobro cobrado o anulado */
export async function deshacerCobro(id: string): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Cobro no válido' };
  const { error } = await supabase.from('cobros').update({ estado: 'pendiente' }).eq('id', id);
  if (error) return { ok: false, error: errorDinero(error.message) };
  return { ok: true, mensaje: 'Cobro pendiente otra vez' };
}

/** Una cuota que no se va a cobrar: se anula (no se borra, para que no se vuelva a generar) */
export async function anularCobro(id: string): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Cobro no válido' };
  const { error } = await supabase.from('cobros').update({ estado: 'anulado' }).eq('id', id).eq('estado', 'pendiente');
  if (error) return { ok: false, error: errorDinero(error.message) };
  return { ok: true, mensaje: 'Cobro anulado' };
}

export async function borrarCobro(id: string): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Cobro no válido' };
  const { data: cobro } = await supabase.from('cobros').select('contrato_id').eq('id', id).maybeSingle();
  if (!cobro) return { ok: false, error: 'Ese cobro ya no existe' };
  if (cobro.contrato_id) return { ok: false, error: 'Las cuotas de un servicio no se borran: anúlala o cambia el servicio.' };
  const { error } = await supabase.from('cobros').delete().eq('id', id);
  if (error) return { ok: false, error: errorDinero(error.message) };
  return { ok: true, mensaje: 'Cobro eliminado' };
}

// ---------- Archivos (facturas y justificantes) ----------
const esquemaSubida = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('factura'), negocioId: uuid, nombre: z.string().min(1).max(200), tamano: z.number().int().min(1).max(MAX_ARCHIVO), mime: z.literal('application/pdf') }),
  z.object({
    tipo: z.literal('gasto'),
    nombre: z.string().min(1).max(200),
    tamano: z.number().int().min(1).max(MAX_ARCHIVO),
    mime: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  }),
]);
const EXTENSION: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Prepara la subida directa del navegador al almacén privado (permiso de un solo uso para esa ruta) */
export async function prepararSubida(datos: unknown): Promise<ResultadoAccion<{ path: string; token: string }>> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const d = esquemaSubida.safeParse(datos);
  if (!d.success) {
    const t = (datos as { tamano?: number })?.tamano ?? 0;
    return { ok: false, error: t > MAX_ARCHIVO ? 'El archivo pasa de 10 MB' : 'Solo se pueden subir PDF (y fotos para los justificantes)' };
  }
  const path = d.data.tipo === 'factura' ? `facturas/${d.data.negocioId}/${crypto.randomUUID()}.pdf` : `gastos/${crypto.randomUUID()}.${EXTENSION[d.data.mime]}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: 'No se ha podido preparar la subida. Inténtalo de nuevo.' };
  return { ok: true, datos: { path, token: data.token } };
}

/** Comprueba que el archivo se ha subido de verdad antes de guardarlo en la base de datos */
async function archivoExiste(supabase: Awaited<ReturnType<typeof obtenerSesion>>['supabase'], path: string) {
  const carpeta = path.slice(0, path.lastIndexOf('/'));
  const nombre = path.slice(path.lastIndexOf('/') + 1);
  const { data } = await supabase.storage.from(BUCKET).list(carpeta, { search: nombre, limit: 1 });
  return !!data?.some((o) => o.name === nombre);
}

async function borrarArchivos(supabase: Awaited<ReturnType<typeof obtenerSesion>>['supabase'], paths: (string | null | undefined)[]) {
  const lista = paths.filter((p): p is string => !!p);
  if (lista.length) await supabase.storage.from(BUCKET).remove(lista);
}

// ---------- Facturas ----------
export async function guardarFactura(fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const datos = esquemaFactura.safeParse(datosFormulario(fd));
  if (!datos.success) return { ok: false, ...erroresDe(datos.error) };
  const { marcar_cobrado, ...d } = datos.data;
  if (!d.archivo_path.startsWith(`facturas/${d.negocio_id}/`)) return { ok: false, error: 'Archivo no válido' };
  if (!(await archivoExiste(supabase, d.archivo_path))) return { ok: false, error: 'No ha llegado el PDF. Vuelve a subirlo.' };

  const { error } = await supabase.from('facturas').insert(d);
  if (error) {
    await borrarArchivos(supabase, [d.archivo_path]);
    return { ok: false, error: errorDinero(error.message) };
  }
  if (marcar_cobrado && d.cobro_id) {
    await supabase.from('cobros').update({ estado: 'cobrado', fecha_cobro: hoy() }).eq('id', d.cobro_id).eq('estado', 'pendiente');
  }
  return { ok: true, mensaje: marcar_cobrado && d.cobro_id ? 'Factura guardada y cobro apuntado' : 'Factura guardada' };
}

export async function borrarFactura(id: string): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Factura no válida' };
  const { data, error } = await supabase.from('facturas').delete().eq('id', id).select('archivo_path');
  if (error) return { ok: false, error: errorDinero(error.message) };
  await borrarArchivos(supabase, (data ?? []).map((f) => f.archivo_path));
  return { ok: true, mensaje: 'Factura eliminada' };
}

// ---------- Gastos ----------
export async function guardarGasto(fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  const datos = esquemaGasto.safeParse(datosFormulario(fd));
  if (!datos.success) return { ok: false, ...erroresDe(datos.error) };
  const { id, quitar_justificante, justificante_path, justificante_nombre, ...d } = datos.data;
  if (justificante_path && !(await archivoExiste(supabase, justificante_path))) return { ok: false, error: 'No ha llegado el justificante. Vuelve a subirlo.' };

  const anterior = id ? (await supabase.from('gastos').select('justificante_path').eq('id', id).maybeSingle()).data : null;
  if (id && !anterior) return { ok: false, error: 'Ese gasto ya no existe' };
  const archivo = justificante_path
    ? { justificante_path, justificante_nombre: justificante_nombre ?? 'justificante' }
    : quitar_justificante
      ? { justificante_path: null, justificante_nombre: null }
      : {};
  const { error } = id ? await supabase.from('gastos').update({ ...d, ...archivo }).eq('id', id) : await supabase.from('gastos').insert({ ...d, ...archivo });
  if (error) {
    await borrarArchivos(supabase, [justificante_path]);
    return { ok: false, error: errorDinero(error.message) };
  }
  // El justificante anterior sobra si se ha cambiado o quitado
  if (anterior?.justificante_path && (justificante_path || quitar_justificante)) await borrarArchivos(supabase, [anterior.justificante_path]);
  return { ok: true, mensaje: id ? 'Gasto actualizado' : 'Gasto apuntado' };
}

export async function borrarGasto(id: string): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return SIN_SESION;
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Gasto no válido' };
  const { data, error } = await supabase.from('gastos').delete().eq('id', id).select('justificante_path');
  if (error) return { ok: false, error: errorDinero(error.message) };
  await borrarArchivos(supabase, (data ?? []).map((g) => g.justificante_path));
  return { ok: true, mensaje: 'Gasto eliminado' };
}
