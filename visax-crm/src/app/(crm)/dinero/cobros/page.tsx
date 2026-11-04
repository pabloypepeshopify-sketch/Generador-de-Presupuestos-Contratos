import Link from 'next/link';
import { X } from 'lucide-react';
import { exigirSocio } from '@/lib/sesion';
import { asegurarCuotas, negociosParaElegir } from '@/lib/dinero-servidor';
import { hoy } from '@/lib/fechas';
import { euros, mesActual, mesValido, rangoMes } from '@/lib/dinero';
import { BotonCobro, FilaCobro } from '@/components/dinero';
import { Vacio } from '@/components/ui';
import type { Cobro, Factura, NegocioRef } from '@/lib/tipos';
import { SelectorMes } from '../selector-mes';

export const metadata = { title: 'Cobros' };

type CobroConDatos = Cobro & { negocios: NegocioRef | null; facturas: Factura[] };
const VISTAS = [
  { v: 'pendientes', txt: 'Por cobrar' },
  { v: 'cobrados', txt: 'Cobrados' },
  { v: 'anulados', txt: 'Anulados' },
  { v: 'todos', txt: 'Todos' },
] as const;

function Grupo({ titulo, cobros, color }: { titulo: string; cobros: CobroConDatos[]; color?: string }) {
  if (!cobros.length) return null;
  const total = cobros.reduce((t, c) => t + Number(c.importe_total), 0);
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[13.5px] font-semibold" style={color ? { color } : undefined}>
        {titulo} <span className="font-normal text-tenue">· {cobros.length} · {euros(total)} a cobrar</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {cobros.map((c) => (
          <FilaCobro key={c.id} cobro={c} negocio={c.negocios ?? undefined} facturas={c.facturas} />
        ))}
      </ul>
    </section>
  );
}

export default async function PaginaCobros({ searchParams }: { searchParams: Promise<{ ver?: string; mes?: string; negocio?: string }> }) {
  const { supabase } = await exigirSocio();
  await asegurarCuotas();
  const sp = await searchParams;
  const ver = VISTAS.some((x) => x.v === sp.ver) ? (sp.ver as (typeof VISTAS)[number]['v']) : 'pendientes';
  const mes = mesValido(sp.mes) ?? mesActual();
  const negocioId = sp.negocio && /^[0-9a-f-]{36}$/i.test(sp.negocio) ? sp.negocio : undefined;

  let q = supabase.from('cobros').select('*, negocios(id, nombre, estado), facturas(*)');
  if (negocioId) q = q.eq('negocio_id', negocioId);
  if (ver === 'pendientes') q = q.eq('estado', 'pendiente').order('fecha_prevista');
  else if (ver === 'cobrados') {
    const m = rangoMes(mes);
    q = q.eq('estado', 'cobrado').gte('fecha_cobro', m.desde).lte('fecha_cobro', m.hasta).order('fecha_cobro', { ascending: false });
  } else if (ver === 'anulados') q = q.eq('estado', 'anulado').order('fecha_prevista', { ascending: false }).limit(300);
  else q = q.order('fecha_prevista', { ascending: false }).limit(500);

  const [{ data, error }, negocios] = await Promise.all([q, negociosParaElegir()]);
  if (error) throw new Error(error.message);
  const cobros = (data ?? []) as unknown as CobroConDatos[];
  const negocioFiltro = negocioId ? negocios.find((n) => n.id === negocioId) : undefined;
  const h = hoy();
  const enlace = (v: string) => `/dinero/cobros?${new URLSearchParams({ ver: v, ...(negocioId ? { negocio: negocioId } : {}) })}`;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Qué cobros ver">
          {VISTAS.map((x) => (
            <Link key={x.v} href={enlace(x.v)} className="chip" aria-pressed={ver === x.v}>
              {x.txt}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ver === 'cobrados' && <SelectorMes mes={mes} ruta="/dinero/cobros" otros={{ ver, negocio: negocioId }} />}
          <BotonCobro negocioId={negocioId} negocios={negocios} />
        </div>
      </div>

      {negocioFiltro && (
        <p className="mb-4 inline-flex items-center gap-2 rounded-lg bg-white/[0.05] px-3 py-1.5 text-[13px]">
          Cobros de <Link href={`/negocios/${negocioFiltro.id}`} className="font-semibold hover:underline">{negocioFiltro.nombre}</Link>
          <Link href={`/dinero/cobros?ver=${ver}`} aria-label="Quitar filtro" className="text-tenue hover:text-texto">
            <X className="size-3.5" />
          </Link>
        </p>
      )}

      {!cobros.length ? (
        <Vacio
          titulo={ver === 'pendientes' ? 'No hay nada por cobrar' : 'No hay cobros aquí'}
          texto={ver === 'pendientes' ? 'Las cuotas de los servicios contratados aparecen solas hasta un mes antes de su fecha.' : undefined}
        />
      ) : ver === 'pendientes' ? (
        <>
          <Grupo titulo="Atrasados" color="#F25F5C" cobros={cobros.filter((c) => c.fecha_prevista < h)} />
          <Grupo titulo="Vencen hoy" color="#F5A524" cobros={cobros.filter((c) => c.fecha_prevista === h)} />
          <Grupo titulo="Próximos" cobros={cobros.filter((c) => c.fecha_prevista > h)} />
        </>
      ) : ver === 'cobrados' ? (
        <>
          <p className="mb-3 text-[13px] text-suave">
            Cobrado este mes: <b className="text-texto tabular-nums">{euros(cobros.reduce((t, c) => t + Number(c.importe_base), 0))}</b> sin IVA ·{' '}
            {euros(cobros.reduce((t, c) => t + Number(c.importe_total), 0))} entrados en el banco
          </p>
          <ul className="flex flex-col gap-2">
            {cobros.map((c) => (
              <FilaCobro key={c.id} cobro={c} negocio={c.negocios ?? undefined} facturas={c.facturas} />
            ))}
          </ul>
        </>
      ) : (
        <ul className="flex flex-col gap-2">
          {cobros.map((c) => (
            <FilaCobro key={c.id} cobro={c} negocio={c.negocios ?? undefined} facturas={c.facturas} />
          ))}
        </ul>
      )}
    </>
  );
}
