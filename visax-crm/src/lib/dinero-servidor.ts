import { cache } from 'react';
import { obtenerSesion } from '@/lib/sesion';
import type { NegocioRef, ResumenDinero } from '@/lib/tipos';

/** Crea las cuotas que toquen (hasta un mes vista). Una vez por petición, antes de leer cobros. */
export const asegurarCuotas = cache(async () => {
  const { supabase } = await obtenerSesion();
  await supabase.rpc('generar_cobros');
});

export async function resumenDinero(desde: string, hasta: string): Promise<ResumenDinero> {
  const { supabase } = await obtenerSesion();
  const { data, error } = await supabase.rpc('dinero_resumen', { p_desde: desde, p_hasta: hasta });
  if (error) throw new Error(`No se ha podido calcular el resumen: ${error.message}`);
  const r = data as Record<string, number | string>;
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)])) as ResumenDinero;
}

/** Negocios para los selectores de cobros, facturas y gastos: primero los clientes */
export const negociosParaElegir = cache(async (): Promise<NegocioRef[]> => {
  const { supabase } = await obtenerSesion();
  const { data } = await supabase.from('negocios').select('id, nombre, estado').order('nombre');
  const lista = (data ?? []) as NegocioRef[];
  return [...lista.filter((n) => n.estado === 'cliente_ganado'), ...lista.filter((n) => n.estado !== 'cliente_ganado')];
});
