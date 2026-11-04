import Link from 'next/link';
import { ArrowRight, TriangleAlert } from 'lucide-react';
import { exigirSocio } from '@/lib/sesion';
import { asegurarCuotas, resumenDinero } from '@/lib/dinero-servidor';
import { euros, mesActual, mesValido, nombreMes, rangoAnio, rangoMes } from '@/lib/dinero';
import { Vacio } from '@/components/ui';
import type { ResumenDinero } from '@/lib/tipos';
import { SelectorMes } from './selector-mes';

export const metadata = { title: 'Dinero' };

function Bloque({ titulo, r }: { titulo: string; r: ResumenDinero }) {
  const ganancia = r.ingresos - r.gastos;
  const tiles = [
    { txt: 'Ingresos', valor: r.ingresos, def: `${r.num_cobros} ${r.num_cobros === 1 ? 'cobro' : 'cobros'} · sin IVA` },
    { txt: 'Gastos', valor: r.gastos, def: `${r.num_gastos} ${r.num_gastos === 1 ? 'gasto' : 'gastos'} · sin IVA` },
    { txt: 'Ganancia', valor: ganancia, def: 'Ingresos − gastos', destacado: true },
    { txt: 'Para cada uno', valor: ganancia / 2, def: 'La mitad para Pablo y la mitad para Pepe', destacado: true },
  ];
  return (
    <section className="mb-6">
      <h2 className="mb-2.5 text-[13.5px] font-semibold capitalize">{titulo}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((k) => (
          <div key={k.txt} className={`caja flex flex-col gap-1 p-4 ${k.destacado ? (k.valor < 0 ? 'border-peligro/40' : 'border-ok/30') : ''}`}>
            <span className={`titulo text-[26px] leading-none tabular-nums ${k.destacado ? (k.valor < 0 ? 'text-peligro' : 'text-ok') : ''}`}>{euros(k.valor)}</span>
            <span className="mt-1 font-medium">{k.txt}</span>
            <span className="text-[12px] text-tenue">{k.def}</span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[12.5px] text-suave">
        IVA cobrado <b className="text-texto tabular-nums">{euros(r.iva_cobrado)}</b> · IVA de los gastos <b className="text-texto tabular-nums">{euros(r.gastos_iva)}</b> · IRPF que os han retenido{' '}
        <b className="text-texto tabular-nums">{euros(r.irpf_retenido)}</b> · Entrado en el banco <b className="text-texto tabular-nums">{euros(r.entrado)}</b>
      </p>
    </section>
  );
}

export default async function PaginaDinero({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { supabase } = await exigirSocio();
  await asegurarCuotas();
  const mes = mesValido((await searchParams).mes) ?? mesActual();
  const anio = Number(mes.slice(0, 4));
  const m = rangoMes(mes);
  const a = rangoAnio(anio);
  const [rMes, rAnio, hayAlgo] = await Promise.all([
    resumenDinero(m.desde, m.hasta),
    resumenDinero(a.desde, a.hasta),
    Promise.all([supabase.from('cobros').select('id', { count: 'exact', head: true }), supabase.from('gastos').select('id', { count: 'exact', head: true })]).then(
      ([c, g]) => (c.count ?? 0) + (g.count ?? 0) > 0,
    ),
  ]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SelectorMes mes={mes} ruta="/dinero" />
      </div>

      {rMes.num_pendientes_vencidos > 0 && (
        <Link href="/dinero/cobros" className="caja mb-5 flex items-center gap-3 border-aviso/40 p-3.5 hover:border-aviso/70">
          <TriangleAlert className="size-5 shrink-0 text-aviso" />
          <span className="flex-1">
            Tenéis <b className="tabular-nums">{euros(rMes.pendiente_vencido)}</b> por cobrar ya vencidos ({rMes.num_pendientes_vencidos} {rMes.num_pendientes_vencidos === 1 ? 'cobro' : 'cobros'}
            {rMes.num_atrasados ? `, ${rMes.num_atrasados} atrasados` : ''}).
          </span>
          <ArrowRight className="size-4 text-suave" />
        </Link>
      )}

      {!hayAlgo ? (
        <Vacio titulo="Todavía no hay dinero apuntado" texto="Abre la ficha de un cliente y añade lo que ha contratado (pago único o cuota). Los cobros saldrán solos y aquí verás lo que ganáis.">
          <Link href="/negocios?estado=cliente_ganado" className="btn btn-primario">
            Ver clientes
          </Link>
        </Vacio>
      ) : (
        <>
          <Bloque titulo={nombreMes(mes)} r={rMes} />
          <Bloque titulo={`Año ${anio}`} r={rAnio} />
          <p className="text-[12px] text-tenue">
            Ingresos: lo cobrado (sin IVA) con fecha de cobro en ese periodo. Gastos: lo gastado (sin IVA) en ese periodo. La ganancia es antes del IRPF de la renta; el IRPF que os retienen los
            clientes ya está adelantado a Hacienda.
          </p>
        </>
      )}
    </>
  );
}
