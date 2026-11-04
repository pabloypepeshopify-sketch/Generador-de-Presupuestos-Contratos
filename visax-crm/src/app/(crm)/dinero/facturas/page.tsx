import Link from 'next/link';
import { Search } from 'lucide-react';
import { exigirSocio } from '@/lib/sesion';
import { negociosParaElegir } from '@/lib/dinero-servidor';
import { fechaCorta, hoy } from '@/lib/fechas';
import { euros, tamanoArchivo } from '@/lib/dinero';
import { normalizar } from '@/lib/textos';
import { AccionesFactura, BotonFactura } from '@/components/dinero';
import { Vacio } from '@/components/ui';
import type { Factura, NegocioRef } from '@/lib/tipos';

export const metadata = { title: 'Facturas' };

type FacturaConDatos = Factura & { negocios: NegocioRef | null; cobros: { concepto: string } | null };

export default async function PaginaFacturas({ searchParams }: { searchParams: Promise<{ anio?: string; q?: string }> }) {
  const { supabase } = await exigirSocio();
  const sp = await searchParams;
  const anioActual = Number(hoy().slice(0, 4));
  const anio = sp.anio === 'todas' ? null : /^\d{4}$/.test(sp.anio ?? '') ? Number(sp.anio) : anioActual;
  const busqueda = normalizar((sp.q ?? '').slice(0, 80));

  let q = supabase.from('facturas').select('*, negocios(id, nombre), cobros(concepto)').order('fecha', { ascending: false }).order('creado_en', { ascending: false });
  if (anio) q = q.gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`);
  const [{ data, error }, negocios, primera] = await Promise.all([q.limit(1000), negociosParaElegir(), supabase.from('facturas').select('fecha').order('fecha').limit(1).maybeSingle()]);
  if (error) throw new Error(error.message);
  let facturas = (data ?? []) as unknown as FacturaConDatos[];
  if (busqueda) facturas = facturas.filter((f) => normalizar(`${f.numero ?? ''} ${f.negocios?.nombre ?? ''} ${f.archivo_nombre}`).includes(busqueda));
  const desde = primera.data?.fecha ? Math.min(Number(primera.data.fecha.slice(0, 4)), anioActual) : anioActual;
  const anios = Array.from({ length: anioActual - desde + 1 }, (_, i) => anioActual - i);
  const total = facturas.reduce((t, f) => t + Number(f.importe_total ?? 0), 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Año">
          {anios.map((a) => (
            <Link key={a} href={`/dinero/facturas?anio=${a}`} className="chip" aria-pressed={anio === a}>
              {a}
            </Link>
          ))}
          <Link href="/dinero/facturas?anio=todas" className="chip" aria-pressed={anio === null}>
            Todas
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form className="relative" action="/dinero/facturas">
            <input type="hidden" name="anio" value={anio ?? 'todas'} />
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-tenue" />
            <input name="q" defaultValue={sp.q ?? ''} className="input w-56 pl-8" placeholder="Número o cliente" aria-label="Buscar factura" />
          </form>
          <BotonFactura negocios={negocios} />
        </div>
      </div>
      {!facturas.length ? (
        <Vacio titulo={busqueda ? 'Ninguna factura coincide' : 'Sin facturas'} texto="Sube los PDF desde aquí, desde la ficha del cliente o desde cada cobro." />
      ) : (
        <>
          <p className="mb-3 text-[13px] text-suave">
            {facturas.length} {facturas.length === 1 ? 'factura' : 'facturas'} · total facturado <b className="text-texto tabular-nums">{euros(total)}</b>
          </p>
          <ul className="caja flex flex-col divide-y divide-borde">
            {facturas.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.numero ? `Factura ${f.numero}` : f.archivo_nombre}</p>
                  <p className="text-[12.5px] text-suave">
                    {fechaCorta(f.fecha)} ·{' '}
                    {f.negocios && (
                      <Link href={`/negocios/${f.negocios.id}`} className="text-texto hover:underline">
                        {f.negocios.nombre}
                      </Link>
                    )}
                    {f.cobros ? ` · ${f.cobros.concepto}` : ''}
                    {f.archivo_bytes ? ` · PDF ${tamanoArchivo(f.archivo_bytes)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {f.importe_total != null && <span className="font-semibold tabular-nums">{euros(f.importe_total)}</span>}
                  <AccionesFactura factura={f} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
