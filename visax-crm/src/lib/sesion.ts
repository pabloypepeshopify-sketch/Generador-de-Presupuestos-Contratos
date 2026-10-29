import { cache } from 'react';
import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import type { Catalogos, Socio } from '@/lib/tipos';

/** Sesión del socio para esta petición (o null si no hay sesión o la cuenta no es de un socio) */
export const obtenerSesion = cache(async () => {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, socio: null as Socio | null };
  const { data: socio } = await supabase.from('socios').select('id, usuario, nombre, color').eq('id', user.id).maybeSingle();
  return { supabase, socio: (socio as Socio | null) ?? null };
});

/** Para páginas: exige sesión de socio o manda al login */
export async function exigirSocio() {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) redirect('/login');
  return { supabase, socio };
}

/** Catálogos compartidos (estados, servicios, resultados...) y los socios. Una consulta por petición. */
export const obtenerCatalogos = cache(async (): Promise<Catalogos> => {
  const { supabase } = await obtenerSesion();
  const [estados, servicios, tiposInteraccion, tiposTarea, resultados, socios] = await Promise.all([
    supabase.from('estados').select('*').order('orden'),
    supabase.from('servicios').select('*').eq('activo', true).order('orden'),
    supabase.from('tipos_interaccion').select('*').eq('activo', true).order('orden'),
    supabase.from('tipos_tarea').select('*').eq('activo', true).order('orden'),
    supabase.from('resultados').select('*').eq('activo', true).order('orden'),
    supabase.from('socios').select('id, usuario, nombre, color').order('nombre'),
  ]);
  const error = [estados, servicios, tiposInteraccion, tiposTarea, resultados, socios].find((r) => r.error)?.error;
  if (error) throw new Error(`No se han podido cargar los catálogos: ${error.message}`);
  return {
    estados: estados.data ?? [],
    servicios: servicios.data ?? [],
    tiposInteraccion: tiposInteraccion.data ?? [],
    tiposTarea: tiposTarea.data ?? [],
    resultados: resultados.data ?? [],
    socios: socios.data ?? [],
  } as Catalogos;
});
