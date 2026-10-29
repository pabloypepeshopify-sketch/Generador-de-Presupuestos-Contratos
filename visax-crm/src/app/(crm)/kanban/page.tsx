import Link from 'next/link';
import { Search } from 'lucide-react';
import { exigirSocio, obtenerCatalogos } from '@/lib/sesion';
import { consultarNegocios, leerFiltros } from '@/lib/filtros';
import { CabeceraPagina } from '@/components/ui';
import { Tablero } from './tablero';

export const metadata = { title: 'Kanban' };

export default async function PaginaKanban({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await exigirSocio();
  const cat = await obtenerCatalogos();
  const sp = await searchParams;
  const f = { ...leerFiltros(sp), orden: 'proxima' };
  const ocultarCerrados = sp.cerrados !== '1';
  const { negocios, total } = await consultarNegocios(supabase, f, { paginar: false });
  const estados = ocultarCerrados ? cat.estados.filter((e) => e.grupo !== 'cerrado') : cat.estados;

  const enlace = (cambios: Record<string, string>) => {
    const u = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])));
    for (const [k, v] of Object.entries(cambios)) {
      if (v) u.set(k, v);
      else u.delete(k);
    }
    return `/kanban${u.size ? `?${u}` : ''}`;
  };

  return (
    <>
      <CabeceraPagina titulo="Oportunidades" sub={`${total} negocios · arrastra una tarjeta o usa «Mover a» para cambiar su estado`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form action="/kanban" className="relative min-w-[220px] flex-1 sm:max-w-xs">
          {Object.entries(sp).map(([k, v]) => (typeof v === 'string' && k !== 'q' ? <input key={k} type="hidden" name={k} value={v} /> : null))}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tenue" />
          <input name="q" defaultValue={f.q} className="input pl-9" placeholder="Buscar" aria-label="Buscar en el Kanban" />
        </form>
        <div className="flex rounded-lg border border-borde bg-panel p-0.5" role="group" aria-label="Responsable">
          {[{ id: '', nombre: 'Todos' }, ...cat.socios].map((s) => (
            <Link
              key={s.id || 'todos'}
              href={enlace({ responsable: s.id })}
              aria-current={f.responsable === s.id ? 'true' : undefined}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${f.responsable === s.id ? 'bg-white/[0.09] text-texto' : 'text-suave hover:text-texto'}`}
            >
              {s.nombre}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cat.servicios.map((s) => (
            <Link key={s.codigo} href={enlace({ servicio: f.servicio === s.codigo ? '' : s.codigo })} className="chip" aria-pressed={f.servicio === s.codigo}>
              {s.nombre}
            </Link>
          ))}
        </div>
        <Link href={enlace({ cerrados: ocultarCerrados ? '1' : '' })} className="btn btn-fantasma btn-sm ml-auto">
          {ocultarCerrados ? 'Mostrar «No interesado» y «Descartado»' : 'Ocultar cerrados'}
        </Link>
      </div>

      <Tablero negocios={negocios} estados={estados} todosEstados={cat.estados} socios={cat.socios} />
    </>
  );
}
