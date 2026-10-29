import Link from 'next/link';
import { Clock } from 'lucide-react';
import { exigirSocio, obtenerCatalogos } from '@/lib/sesion';
import { diaLargo, diaRelativo, hoy, hora, sumarDias } from '@/lib/fechas';
import { nombres } from '@/lib/textos';
import { FilaTarea } from '@/components/tareas';
import { Avatar, CabeceraPagina, Seccion, Vacio } from '@/components/ui';
import type { TareaConNegocio } from '@/lib/tipos';

export const metadata = { title: 'Agenda' };

const FILTROS_TIPO = [
  { v: '', txt: 'Todas las acciones' },
  { v: 'volver_visitar', txt: 'Visitas programadas' },
  { v: 'llamar', txt: 'Llamadas pendientes' },
  { v: 'otras', txt: 'Otras acciones' },
];

export default async function Agenda({ searchParams }: { searchParams: Promise<{ socio?: string; tipo?: string; hechas?: string }> }) {
  const { supabase } = await exigirSocio();
  const cat = await obtenerCatalogos();
  const n = nombres(cat);
  const sp = await searchParams;
  const socio = cat.socios.find((s) => s.id === sp.socio) ?? null;
  const tipo = FILTROS_TIPO.some((f) => f.v === sp.tipo) ? sp.tipo ?? '' : '';
  const verHechas = sp.hechas === '1';
  const h = hoy();

  let q = supabase
    .from('tareas')
    .select('*, negocios(id, nombre, localidad, estado, horario_contacto)')
    .eq('estado', 'pendiente')
    .order('vence_fecha', { ascending: true, nullsFirst: false })
    .order('vence_hora', { ascending: true, nullsFirst: false })
    .order('creado_en')
    .limit(500);
  if (socio) q = q.eq('responsable_id', socio.id);
  if (tipo === 'otras') q = q.not('tipo', 'in', '(volver_visitar,llamar)');
  else if (tipo) q = q.eq('tipo', tipo);

  let qLocalizar = supabase
    .from('negocios_vista')
    .select('id, nombre, localidad, horario_contacto, responsable_id, proxima_accion, proxima_fecha, proxima_hora, ultima_interaccion_en')
    .eq('estado', 'pendiente_localizar')
    .order('proxima_fecha', { ascending: true, nullsFirst: false })
    .limit(100);
  if (socio) qLocalizar = qLocalizar.eq('responsable_id', socio.id);

  let qHechas = supabase
    .from('tareas')
    .select('*, negocios(id, nombre, localidad, estado, horario_contacto)')
    .eq('estado', 'completada')
    .gte('completada_en', new Date(Date.now() - 7 * 864e5).toISOString())
    .order('completada_en', { ascending: false })
    .limit(50);
  if (socio) qHechas = qHechas.eq('responsable_id', socio.id);

  const [tareasR, localizarR, hechasR] = await Promise.all([q, qLocalizar, verHechas ? qHechas : Promise.resolve({ data: [] })]);
  const tareas = (tareasR.data ?? []) as TareaConNegocio[];
  const localizar = localizarR.data ?? [];
  const hechas = (hechasR.data ?? []) as TareaConNegocio[];

  const atrasadas = tareas.filter((t) => t.vence_fecha && t.vence_fecha < h);
  const deHoy = tareas.filter((t) => t.vence_fecha === h);
  const proximas = tareas.filter((t) => t.vence_fecha && t.vence_fecha > h && t.vence_fecha <= sumarDias(h, 7));
  const masAdelante = tareas.filter((t) => t.vence_fecha && t.vence_fecha > sumarDias(h, 7));
  const sinFecha = tareas.filter((t) => !t.vence_fecha);
  const porDia = new Map<string, TareaConNegocio[]>();
  for (const t of proximas) porDia.set(t.vence_fecha!, [...(porDia.get(t.vence_fecha!) ?? []), t]);

  const enlace = (cambios: Record<string, string>) => {
    const u = new URLSearchParams({ ...(socio ? { socio: socio.id } : {}), ...(tipo ? { tipo } : {}), ...(verHechas ? { hechas: '1' } : {}) });
    for (const [k, v] of Object.entries(cambios)) {
      if (v) u.set(k, v);
      else u.delete(k);
    }
    return `/agenda${u.size ? `?${u}` : ''}`;
  };
  const lista = (l: TareaConNegocio[]) => (
    <ul className="flex flex-col gap-2">
      {l.map((t) => (
        <FilaTarea key={t.id} tarea={t} socios={cat.socios} tiposTarea={n.tipoTarea} />
      ))}
    </ul>
  );

  return (
    <>
      <CabeceraPagina titulo="Agenda" sub={`${tareas.length} acciones pendientes${socio ? ` de ${socio.nombre}` : ''} · ${diaLargo(h)}`}>
        <div className="flex rounded-lg border border-borde bg-panel p-0.5" role="group" aria-label="Responsable">
          {[{ id: '', nombre: 'Los dos' }, ...cat.socios].map((s) => (
            <Link
              key={s.id || 'todos'}
              href={enlace({ socio: s.id })}
              aria-current={(socio?.id ?? '') === s.id ? 'true' : undefined}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${(socio?.id ?? '') === s.id ? 'bg-white/[0.09] text-texto' : 'text-suave hover:text-texto'}`}
            >
              {s.nombre}
            </Link>
          ))}
        </div>
      </CabeceraPagina>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {FILTROS_TIPO.map((f) => (
          <Link key={f.v || 'todas'} href={enlace({ tipo: f.v })} className="chip" aria-pressed={tipo === f.v}>
            {f.txt}
          </Link>
        ))}
        <Link href={enlace({ hechas: verHechas ? '' : '1' })} className="chip ml-auto" aria-pressed={verHechas}>
          Completadas (7 días)
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          {tareas.length === 0 && <Vacio titulo="No hay acciones pendientes" texto="Las tareas se crean al registrar una visita o llamada, o desde la ficha de cada negocio." />}
          {atrasadas.length > 0 && (
            <Seccion titulo={<span className="text-peligro">Atrasadas · {atrasadas.length}</span>} className="border-peligro/30">
              <p className="mb-3 text-[13px] text-suave">Siguen aquí hasta que se completen o se reprogramen.</p>
              {lista(atrasadas)}
            </Seccion>
          )}
          <Seccion titulo={<span className="text-aviso">Hoy · {deHoy.length}</span>}>{deHoy.length ? lista(deHoy) : <p className="text-suave">Nada programado para hoy.</p>}</Seccion>
          {porDia.size > 0 && (
            <Seccion titulo={`Próximos 7 días · ${proximas.length}`}>
              <div className="flex flex-col gap-4">
                {[...porDia.entries()].map(([dia, l]) => (
                  <div key={dia}>
                    <h3 className="mb-2 text-[12px] font-semibold tracking-wide text-suave uppercase">{diaRelativo(dia)}</h3>
                    {lista(l)}
                  </div>
                ))}
              </div>
            </Seccion>
          )}
          {masAdelante.length > 0 && <Seccion titulo={`Más adelante · ${masAdelante.length}`}>{lista(masAdelante)}</Seccion>}
          {verHechas && <Seccion titulo={`Completadas en los últimos 7 días · ${hechas.length}`}>{hechas.length ? lista(hechas) : <p className="text-suave">Ninguna.</p>}</Seccion>}
        </div>

        <div className="flex flex-col gap-5">
          <Seccion titulo={`Sin fecha · ${sinFecha.length}`}>
            <p className="mb-3 text-[13px] text-suave">Seguimientos que necesitan planificación: ponles fecha con «Reprogramar».</p>
            {sinFecha.length ? lista(sinFecha) : <p className="text-tenue">Todo tiene fecha.</p>}
          </Seccion>
          <Seccion titulo={`Responsable sin localizar · ${localizar.length}`}>
            {localizar.length === 0 ? (
              <p className="text-tenue">Ningún negocio pendiente de localizar al responsable.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-borde">
                {localizar.map((x) => (
                  <li key={x.id} className="py-2.5 first:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/negocios/${x.id}`} className="truncate font-medium hover:text-cian">
                        {x.nombre}
                      </Link>
                      <Avatar socio={cat.socios.find((s) => s.id === x.responsable_id)} tam={20} />
                    </div>
                    {x.horario_contacto && (
                      <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-aviso">
                        <Clock className="size-3.5" /> {x.horario_contacto}
                      </p>
                    )}
                    <p className="mt-0.5 text-[12.5px] text-suave">
                      {x.proxima_accion ? `${x.proxima_accion} · ${diaRelativo(x.proxima_fecha)}${x.proxima_hora ? ` ${hora(x.proxima_hora)}` : ''}` : 'Sin acción programada'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>
        </div>
      </div>
    </>
  );
}
