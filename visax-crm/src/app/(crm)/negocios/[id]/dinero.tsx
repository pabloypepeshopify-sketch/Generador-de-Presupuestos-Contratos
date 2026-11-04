import Link from 'next/link';
import { ArrowRight, Paperclip } from 'lucide-react';
import { obtenerSesion } from '@/lib/sesion';
import { asegurarCuotas } from '@/lib/dinero-servidor';
import { fechaCorta, hoy } from '@/lib/fechas';
import { categoriaDe, euros, periodicidadDe } from '@/lib/dinero';
import { AccionesFactura, AccionesGasto, BotonCobro, BotonContrato, BotonFactura, BotonGasto, FilaCobro, QuitarContrato } from '@/components/dinero';
import { Seccion } from '@/components/ui';
import type { Cobro, Contrato, Factura, Gasto, Servicio } from '@/lib/tipos';

const suma = (l: { importe_base: number }[]) => l.reduce((t, x) => t + Number(x.importe_base), 0);

/** Bloque de dinero de la ficha: servicios contratados, cobros, facturas y gastos de este negocio */
export async function DineroNegocio({ negocioId, servicios, esCliente }: { negocioId: string; servicios: Servicio[]; esCliente: boolean }) {
  await asegurarCuotas();
  const { supabase } = await obtenerSesion();
  const [contratosR, cobrosR, facturasR, gastosR] = await Promise.all([
    supabase.from('contratos').select('*').eq('negocio_id', negocioId).order('creado_en'),
    supabase.from('cobros').select('*').eq('negocio_id', negocioId).order('fecha_prevista'),
    supabase.from('facturas').select('*').eq('negocio_id', negocioId).order('fecha', { ascending: false }),
    supabase.from('gastos').select('*').eq('negocio_id', negocioId).order('fecha', { ascending: false }),
  ]);
  const contratos = (contratosR.data ?? []) as Contrato[];
  const cobros = (cobrosR.data ?? []) as Cobro[];
  const facturas = (facturasR.data ?? []) as Factura[];
  const gastos = (gastosR.data ?? []) as Gasto[];

  const h = hoy();
  const pendientes = cobros.filter((c) => c.estado === 'pendiente');
  const cobrados = cobros.filter((c) => c.estado === 'cobrado').sort((a, b) => (b.fecha_cobro ?? '').localeCompare(a.fecha_cobro ?? ''));
  const totalCobrado = suma(cobrados);
  const totalGastos = suma(gastos);
  const vencido = pendientes.filter((c) => c.fecha_prevista <= h).reduce((t, c) => t + Number(c.importe_total), 0);
  const facturasDe = (id: string) => facturas.filter((f) => f.cobro_id === id);
  const vacio = !contratos.length && !cobros.length && !facturas.length && !gastos.length;

  if (vacio && !esCliente)
    return (
      <Seccion titulo="Dinero" accion={<BotonContrato negocioId={negocioId} servicios={servicios} />}>
        <p className="text-suave">Cuando contrate algo, apunta aquí el servicio (pago único o cuota) y los cobros saldrán solos.</p>
      </Seccion>
    );

  const visibles = [...pendientes, ...cobrados.slice(0, 6)];
  const ocultos = cobros.length - visibles.length;

  return (
    <Seccion
      titulo="Dinero"
      accion={
        <Link href={`/dinero/cobros?ver=todos&negocio=${negocioId}`} className="inline-flex items-center gap-1 text-[12.5px] text-cian hover:underline">
          Todos sus cobros <ArrowRight className="size-3.5" />
        </Link>
      }
    >
      <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { txt: 'Cobrado', valor: euros(totalCobrado), def: 'sin IVA' },
          { txt: 'Pendiente', valor: euros(vencido), def: 'vencido, a cobrar', alerta: vencido > 0 },
          { txt: 'Gastos', valor: euros(totalGastos), def: 'de este cliente' },
          { txt: 'Lo que deja', valor: euros(totalCobrado - totalGastos), def: 'cobrado − gastos', destacado: true },
        ].map((k) => (
          <div key={k.txt} className={`rounded-lg border p-2.5 ${k.destacado ? 'border-ok/30 bg-ok/[0.05]' : k.alerta ? 'border-peligro/35' : 'border-borde'}`}>
            <dt className="text-[11.5px] font-medium uppercase tracking-wide text-tenue">{k.txt}</dt>
            <dd className={`mt-0.5 text-[16px] font-semibold tabular-nums ${k.alerta ? 'text-peligro' : k.destacado ? 'text-ok' : ''}`}>{k.valor}</dd>
            <dd className="text-[11.5px] text-tenue">{k.def}</dd>
          </div>
        ))}
      </dl>

      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold">Servicios contratados</h3>
        <BotonContrato negocioId={negocioId} servicios={servicios} />
      </div>
      {contratos.length ? (
        <ul className="mb-5 flex flex-col divide-y divide-borde rounded-lg border border-borde">
          {contratos.map((c) => {
            const p = periodicidadDe(c.periodicidad);
            const terminado = c.fecha_fin && c.fecha_fin < h;
            return (
              <li key={c.id} className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 ${terminado ? 'opacity-60' : ''}`}>
                <div className="min-w-0">
                  <p className="font-medium">{c.concepto}</p>
                  <p className="text-[12.5px] text-suave">
                    {p.txt} · {c.periodicidad === 'unico' ? `el ${fechaCorta(c.fecha_inicio)}` : `desde ${fechaCorta(c.fecha_inicio)}${c.fecha_fin ? ` hasta ${fechaCorta(c.fecha_fin)}` : ''}`}
                    {Number(c.irpf_pct) === 0 ? ' · sin IRPF' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-1 font-semibold tabular-nums">
                    {euros(c.importe_base)}
                    <span className="text-[12px] font-normal text-tenue"> + IVA{p.sufijo}</span>
                  </span>
                  <BotonContrato negocioId={negocioId} servicios={servicios} contrato={c} />
                  <QuitarContrato contrato={c} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mb-5 text-[13px] text-suave">Ningún servicio apuntado. Añade lo que ha contratado: una web (pago único), un mantenimiento (mensual)…</p>
      )}

      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold">
          Cobros <span className="font-normal text-tenue">· {pendientes.length} pendientes</span>
        </h3>
        <BotonCobro negocioId={negocioId} />
      </div>
      {visibles.length ? (
        <ul className="mb-2 flex flex-col gap-2">
          {visibles.map((c) => (
            <FilaCobro key={c.id} cobro={c} facturas={facturasDe(c.id)} />
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-[13px] text-suave">Sin cobros todavía.</p>
      )}
      {ocultos > 0 && (
        <Link href={`/dinero/cobros?ver=todos&negocio=${negocioId}`} className="mb-3 inline-block text-[12.5px] text-cian hover:underline">
          Ver {ocultos} cobros más
        </Link>
      )}

      <div className="mt-3 mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold">
          Facturas <span className="font-normal text-tenue">· {facturas.length}</span>
        </h3>
        <BotonFactura negocioId={negocioId} cobros={cobros.filter((c) => c.estado !== 'anulado')} />
      </div>
      {facturas.length ? (
        <ul className="mb-5 flex flex-col divide-y divide-borde rounded-lg border border-borde">
          {facturas.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">{f.numero ? `Factura ${f.numero}` : f.archivo_nombre}</p>
                <p className="text-[12.5px] text-suave">
                  {fechaCorta(f.fecha)}
                  {f.importe_total != null ? ` · ${euros(f.importe_total)}` : ''}
                  {f.cobro_id ? ` · ${cobros.find((c) => c.id === f.cobro_id)?.concepto ?? ''}` : ''}
                </p>
              </div>
              <AccionesFactura factura={f} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-5 text-[13px] text-suave">Sin facturas. Sube el PDF desde aquí o desde el cobro.</p>
      )}

      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold">
          Gastos de este cliente <span className="font-normal text-tenue">· {euros(totalGastos)}</span>
        </h3>
        <BotonGasto negocioId={negocioId} />
      </div>
      {gastos.length ? (
        <ul className="flex flex-col divide-y divide-borde rounded-lg border border-borde">
          {gastos.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">
                  {g.concepto} {g.justificante_path && <Paperclip className="inline size-3.5 text-tenue" aria-label="Con justificante" />}
                </p>
                <p className="text-[12.5px] text-suave">
                  {fechaCorta(g.fecha)} · {categoriaDe(g.categoria)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-1 font-semibold tabular-nums">{euros(g.importe_base)}</span>
                <AccionesGasto gasto={g} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-suave">Ningún gasto. Apunta lo que os cuesta este cliente (hosting, dominio, APIs…) para saber lo que deja de verdad.</p>
      )}
    </Seccion>
  );
}
