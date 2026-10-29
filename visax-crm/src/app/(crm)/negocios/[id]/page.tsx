import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, DoorOpen, Phone } from 'lucide-react';
import { exigirSocio, obtenerCatalogos } from '@/lib/sesion';
import { diaRelativo, fechaHora, hora } from '@/lib/fechas';
import { nombres } from '@/lib/textos';
import { SelectorEstado, SelectorResponsable } from '@/components/selectores';
import { FilaTarea } from '@/components/tareas';
import { Seccion, Vacio } from '@/components/ui';
import type { CambioEstado, Contacto, Interaccion, Negocio, NegocioServicio, Tarea } from '@/lib/tipos';
import { MenuOtroContacto, BorrarNegocio } from './acciones-ficha';
import { DatosNegocio } from './datos';
import { EditorServicios } from './servicios';
import { EditorContactos } from './contactos';
import { NuevaTarea } from './nueva-tarea';
import { Historial } from './historial';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirSocio();
  const { data } = await supabase.from('negocios').select('nombre').eq('id', id).maybeSingle();
  return { title: data?.nombre ?? 'Negocio' };
}

export default async function FichaNegocio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, socio: yo } = await exigirSocio();
  const cat = await obtenerCatalogos();
  const n = nombres(cat);

  const [negR, contactosR, serviciosR, interR, tareasR, cambiosR] = await Promise.all([
    supabase.from('negocios').select('*').eq('id', id).maybeSingle(),
    supabase.from('contactos').select('*').eq('negocio_id', id).order('es_principal', { ascending: false }).order('creado_en'),
    supabase.from('negocio_servicios').select('*').eq('negocio_id', id),
    supabase.from('interacciones').select('*').eq('negocio_id', id).order('fecha', { ascending: false }),
    supabase.from('tareas').select('*').eq('negocio_id', id).order('vence_fecha', { nullsFirst: false }).order('vence_hora', { nullsFirst: false }),
    supabase.from('cambios_estado').select('*').eq('negocio_id', id).order('creado_en', { ascending: false }),
  ]);
  const negocio = negR.data as Negocio | null;
  if (!negocio) notFound();

  const contactos = (contactosR.data ?? []) as Contacto[];
  const servicios = (serviciosR.data ?? []) as NegocioServicio[];
  const interacciones = (interR.data ?? []) as Interaccion[];
  const tareas = (tareasR.data ?? []) as Tarea[];
  const pendientes = tareas.filter((t) => t.estado === 'pendiente');
  const cambios = (cambiosR.data ?? []) as CambioEstado[];
  const creador = cat.socios.find((s) => s.id === negocio.creado_por);
  const proxima = pendientes[0];

  return (
    <>
      <Link href="/negocios" className="mb-3 inline-flex items-center gap-1 text-[13px] text-suave hover:text-texto">
        <ArrowLeft className="size-3.5" /> Negocios
      </Link>

      <header className="mb-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="titulo text-[28px] leading-tight md:text-[32px]">{negocio.nombre}</h1>
            <p className="mt-1 text-suave">
              {[negocio.sector, negocio.localidad].filter(Boolean).join(' · ') || 'Sin sector ni localidad'}
              <span className="text-tenue">
                {' '}
                · Alta {fechaHora(negocio.creado_en).split(' · ')[0]}
                {creador ? ` por ${creador.nombre}` : ''}
              </span>
            </p>
            {negocio.horario_contacto && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-aviso/10 px-2 py-0.5 text-[13px] text-aviso">
                <Clock className="size-3.5" /> {negocio.horario_contacto}
              </p>
            )}
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[400px]">
            <div className="flex flex-col gap-1">
              <span className="text-[11.5px] text-tenue">Estado comercial</span>
              <SelectorEstado id={negocio.id} estado={negocio.estado} estados={cat.estados} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11.5px] text-tenue">Responsable</span>
              <SelectorResponsable id={negocio.id} responsableId={negocio.responsable_id} socios={cat.socios} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/negocios/${negocio.id}/contacto?tipo=visita`} className="btn btn-primario btn-lg flex-1 sm:flex-none">
            <DoorOpen className="size-4" /> Registrar visita
          </Link>
          <Link href={`/negocios/${negocio.id}/contacto?tipo=llamada`} className="btn btn-lg flex-1 sm:flex-none">
            <Phone className="size-4" /> Registrar llamada
          </Link>
          <MenuOtroContacto negocioId={negocio.id} tipos={cat.tiposInteraccion.filter((t) => !['visita', 'llamada'].includes(t.codigo))} />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Seccion
            titulo={
              <>
                Tareas pendientes <span className="font-normal text-tenue">· {pendientes.length}</span>
              </>
            }
            accion={<NuevaTarea negocioId={negocio.id} responsableId={negocio.responsable_id ?? yo.id} socios={cat.socios} tiposTarea={cat.tiposTarea} />}
          >
            {proxima ? (
              <>
                <p className="mb-3 text-[13px] text-suave">
                  Próxima acción: <span className="font-medium text-texto">{proxima.descripcion}</span> · {diaRelativo(proxima.vence_fecha)}
                  {proxima.vence_hora ? ` ${hora(proxima.vence_hora)}` : ''}
                </p>
                <ul className="flex flex-col gap-2">
                  {pendientes.map((t) => (
                    <FilaTarea key={t.id} tarea={t} socios={cat.socios} tiposTarea={n.tipoTarea} mostrarNegocio={false} />
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-suave">
                No hay ninguna acción pendiente con este negocio.{' '}
                {!['cliente_ganado', 'no_interesado', 'descartado'].includes(negocio.estado) && <span className="text-aviso">Conviene programar el siguiente paso.</span>}
              </p>
            )}
          </Seccion>

          <Seccion
            titulo={
              <>
                Historial <span className="font-normal text-tenue">· {interacciones.length} contactos</span>
              </>
            }
          >
            <Historial interacciones={interacciones} tareas={tareas} cambios={cambios} cat={cat} />
          </Seccion>
        </div>

        <div className="flex flex-col gap-5">
          <DatosNegocio negocio={negocio} socios={cat.socios} />
          <EditorServicios negocioId={negocio.id} servicios={cat.servicios} actuales={servicios} />
          <EditorContactos negocioId={negocio.id} contactos={contactos} />
          {interacciones.length === 0 && pendientes.length === 0 && (
            <Vacio titulo="Negocio sin actividad" texto="Registra la primera visita o llamada para empezar su historial." />
          )}
          <BorrarNegocio id={negocio.id} nombre={negocio.nombre} />
        </div>
      </div>
    </>
  );
}
