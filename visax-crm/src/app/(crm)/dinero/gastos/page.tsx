import Link from 'next/link';
import { Paperclip } from 'lucide-react';
import { exigirSocio } from '@/lib/sesion';
import { negociosParaElegir } from '@/lib/dinero-servidor';
import { fechaCorta } from '@/lib/fechas';
import { categoriaDe, euros, mesActual, mesValido, rangoMes } from '@/lib/dinero';
import { AccionesGasto, BotonGasto } from '@/components/dinero';
import { Vacio } from '@/components/ui';
import type { Gasto, NegocioRef } from '@/lib/tipos';
import { SelectorMes } from '../selector-mes';

export const metadata = { title: 'Gastos' };

type GastoConNegocio = Gasto & { negocios: NegocioRef | null };

export default async function PaginaGastos({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { supabase } = await exigirSocio();
  const mes = mesValido((await searchParams).mes) ?? mesActual();
  const m = rangoMes(mes);
  const [{ data, error }, negocios] = await Promise.all([
    supabase.from('gastos').select('*, negocios(id, nombre)').gte('fecha', m.desde).lte('fecha', m.hasta).order('fecha', { ascending: false }).order('creado_en', { ascending: false }),
    negociosParaElegir(),
  ]);
  if (error) throw new Error(error.message);
  const gastos = (data ?? []) as unknown as GastoConNegocio[];
  const total = gastos.reduce((t, g) => t + Number(g.importe_base), 0);
  const deClientes = gastos.filter((g) => g.negocio_id).reduce((t, g) => t + Number(g.importe_base), 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SelectorMes mes={mes} ruta="/dinero/gastos" />
        <BotonGasto negocios={negocios} />
      </div>
      {!gastos.length ? (
        <Vacio titulo="Sin gastos este mes" texto="Apunta hosting, herramientas, APIs, publicidad… Si es de un cliente concreto, elígelo y sabréis lo que deja cada uno." />
      ) : (
        <>
          <p className="mb-3 text-[13px] text-suave">
            Total del mes: <b className="text-texto tabular-nums">{euros(total)}</b> sin IVA · de clientes {euros(deClientes)} · generales {euros(total - deClientes)}
          </p>
          <ul className="caja flex flex-col divide-y divide-borde">
            {gastos.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {g.concepto} {g.justificante_path && <Paperclip className="inline size-3.5 text-tenue" aria-label="Con justificante" />}
                  </p>
                  <p className="text-[12.5px] text-suave">
                    {fechaCorta(g.fecha)} · {categoriaDe(g.categoria)} ·{' '}
                    {g.negocios ? (
                      <Link href={`/negocios/${g.negocios.id}`} className="text-texto hover:underline">
                        {g.negocios.nombre}
                      </Link>
                    ) : (
                      'General'
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{euros(g.importe_base)}</p>
                    <p className="text-[12px] text-tenue tabular-nums">{euros(g.importe_total)} con IVA</p>
                  </div>
                  <AccionesGasto gasto={g} negocios={negocios} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
