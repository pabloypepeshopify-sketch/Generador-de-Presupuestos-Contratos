import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { exigirSocio, obtenerCatalogos } from '@/lib/sesion';
import { ahoraLocal, hoy } from '@/lib/fechas';
import { EstadoBadge } from '@/components/ui';
import type { Contacto, Negocio, NegocioServicio, Tarea } from '@/lib/tipos';
import { FormularioContacto } from './formulario';

export const metadata = { title: 'Registrar contacto' };

export default async function RegistrarContacto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string; tarea?: string; nuevo?: string }>;
}) {
  const { id } = await params;
  const { tipo, tarea: tareaId, nuevo } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, socio: yo } = await exigirSocio();
  const cat = await obtenerCatalogos();

  const [negR, contactosR, serviciosR, tareaR] = await Promise.all([
    supabase.from('negocios').select('*').eq('id', id).maybeSingle(),
    supabase.from('contactos').select('*').eq('negocio_id', id).order('es_principal', { ascending: false }),
    supabase.from('negocio_servicios').select('*').eq('negocio_id', id),
    tareaId && /^[0-9a-f-]{36}$/i.test(tareaId)
      ? supabase.from('tareas').select('*').eq('id', tareaId).eq('negocio_id', id).eq('estado', 'pendiente').maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const negocio = negR.data as Negocio | null;
  if (!negocio) notFound();
  const estado = cat.estados.find((e) => e.codigo === negocio.estado);
  const tipoInicial = cat.tiposInteraccion.some((t) => t.codigo === tipo) ? tipo! : 'visita';

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/negocios/${id}`} className="mb-3 inline-flex items-center gap-1 text-[13px] text-suave hover:text-texto">
        <ArrowLeft className="size-3.5" /> {negocio.nombre}
      </Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="titulo text-[26px] leading-tight md:text-[30px]">
            Registrar <span className="acento-texto">contacto</span>
          </h1>
          <p className="mt-1 text-suave">
            {negocio.nombre}
            {negocio.localidad ? ` · ${negocio.localidad}` : ''}
          </p>
        </div>
        {estado && <EstadoBadge nombre={estado.nombre} color={estado.color} />}
      </div>
      {nuevo && <p className="mb-4 rounded-lg border border-ok/30 bg-ok/[0.07] px-3 py-2 text-[13px] text-[#a7f3c4]">Negocio creado. Ahora registra cómo ha ido el contacto.</p>}
      <FormularioContacto
        negocio={negocio}
        contactos={(contactosR.data ?? []) as Contacto[]}
        serviciosActuales={(serviciosR.data ?? []) as NegocioServicio[]}
        tarea={(tareaR.data as Tarea | null) ?? null}
        cat={cat}
        yo={yo}
        tipoInicial={tipoInicial}
        ahora={ahoraLocal()}
        hoy={hoy()}
      />
    </div>
  );
}
