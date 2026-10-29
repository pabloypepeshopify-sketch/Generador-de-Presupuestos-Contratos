import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { exigirSocio, obtenerCatalogos } from '@/lib/sesion';
import { diaLargo, fechaHoraRelativa, hoy, sumarDias } from '@/lib/fechas';
import { nombres } from '@/lib/textos';
import { FilaTarea } from '@/components/tareas';
import { Avatar, CabeceraPagina, EstadoBadge, IconoInteraccion, Seccion, Vacio } from '@/components/ui';
import type { Interaccion, TareaConNegocio } from '@/lib/tipos';

export const metadata = { title: 'Panel' };

type Resumen = Record<
  | 'negocios' | 'nuevos_semana' | 'contactos_hoy' | 'contactos_semana' | 'negocios_contactados_semana' | 'interesados' | 'oportunidades'
  | 'propuestas_pendientes' | 'clientes' | 'clientes_mes' | 'por_localizar' | 'sin_contactar'
  | 'seguimientos_pendientes' | 'seguimientos_atrasados' | 'seguimientos_hoy' | 'seguimientos_sin_fecha',
  number
>;

export default async function Panel({ searchParams }: { searchParams: Promise<{ socio?: string }> }) {
  const { supabase, socio: yo } = await exigirSocio();
  const cat = await obtenerCatalogos();
  const n = nombres(cat);
  const { socio: filtro } = await searchParams;
  const socioFiltro = cat.socios.find((s) => s.id === filtro) ?? null;
  const h = hoy();

  const [resumenR, misTareasR, pendientesR, actividadR, estadosR] = await Promise.all([
    supabase.rpc('panel_resumen', { p_socio: socioFiltro?.id ?? null }),
    supabase
      .from('tareas')
      .select('*, negocios(id, nombre, localidad, estado, horario_contacto)')
      .eq('estado', 'pendiente')
      .eq('responsable_id', yo.id)
      .lte('vence_fecha', sumarDias(h, 3))
      .order('vence_fecha')
      .order('vence_hora', { nullsFirst: false })
      .limit(30),
    supabase.from('tareas').select('responsable_id, vence_fecha').eq('estado', 'pendiente'),
    (() => {
      let q = supabase.from('interacciones').select('id, negocio_id, tipo, fecha, socio_id, persona, resultado, negocios(nombre)').order('fecha', { ascending: false }).limit(12);
      if (socioFiltro) q = q.eq('socio_id', socioFiltro.id);
      return q;
    })(),
    (() => {
      let q = supabase.from('negocios').select('estado');
      if (socioFiltro) q = q.eq('responsable_id', socioFiltro.id);
      return q;
    })(),
  ]);

  const r = (resumenR.data ?? {}) as Resumen;
  const misTareas = (misTareasR.data ?? []) as TareaConNegocio[];
  const actividad = (actividadR.data ?? []) as unknown as (Interaccion & { negocios: { nombre: string } | null })[];
  const porEstado = new Map<string, number>();
  for (const x of estadosR.data ?? []) porEstado.set(x.estado, (porEstado.get(x.estado) ?? 0) + 1);
  const cargaSocios = cat.socios.map((s) => {
    const suyas = (pendientesR.data ?? []).filter((t) => t.responsable_id === s.id);
    return { s, total: suyas.length, atrasadas: suyas.filter((t) => t.vence_fecha && t.vence_fecha < h).length, hoy: suyas.filter((t) => t.vence_fecha === h).length };
  });

  const indicadores = [
    { valor: r.negocios, txt: 'Negocios registrados', def: `${r.nuevos_semana ?? 0} nuevos esta semana`, href: '/negocios' },
    { valor: r.contactos_semana, txt: 'Contactos esta semana', def: `Visitas, llamadas y mensajes · ${r.contactos_hoy ?? 0} hoy`, href: '/negocios?orden=reciente' },
    { valor: r.oportunidades, txt: 'Oportunidades activas', def: `De Interesado a Decisión pendiente · ${r.interesados ?? 0} interesados`, href: '/negocios?estado=grupo:oportunidad' },
    { valor: r.propuestas_pendientes, txt: 'Propuestas pendientes', def: 'Propuesta enviada o decisión pendiente', href: '/negocios?estado=grupo:propuestas' },
    { valor: r.clientes, txt: 'Clientes ganados', def: `${r.clientes_mes ?? 0} este mes`, href: '/negocios?estado=cliente_ganado', destacado: true },
    { valor: r.seguimientos_pendientes, txt: 'Seguimientos pendientes', def: `Tareas sin completar · ${r.seguimientos_hoy ?? 0} para hoy`, href: '/agenda' },
    { valor: r.seguimientos_atrasados, txt: 'Seguimientos atrasados', def: 'Con fecha anterior a hoy', href: '/agenda', alerta: (r.seguimientos_atrasados ?? 0) > 0 },
    { valor: r.por_localizar, txt: 'Responsable sin localizar', def: `${r.sin_contactar ?? 0} negocios sin primer contacto`, href: '/negocios?estado=pendiente_localizar' },
  ];

  const atrasadas = misTareas.filter((t) => t.vence_fecha && t.vence_fecha < h);
  const deHoy = misTareas.filter((t) => t.vence_fecha === h);
  const proximas = misTareas.filter((t) => t.vence_fecha && t.vence_fecha > h);

  return (
    <>
      <CabeceraPagina
        titulo={
          <>
            Hola, <span className="acento-texto">{yo.nombre}</span>
          </>
        }
        sub={diaLargo(h)}
      >
        <div className="flex rounded-lg border border-borde bg-panel p-0.5" role="group" aria-label="Ver datos de">
          {[{ id: '', nombre: 'Los dos' }, ...cat.socios].map((s) => (
            <Link
              key={s.id || 'todos'}
              href={s.id ? `/?socio=${s.id}` : '/'}
              aria-current={(socioFiltro?.id ?? '') === s.id ? 'true' : undefined}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${(socioFiltro?.id ?? '') === s.id ? 'bg-white/[0.09] text-texto' : 'text-suave hover:text-texto'}`}
            >
              {s.nombre}
            </Link>
          ))}
        </div>
        <Link href="/negocios/nuevo" className="btn btn-primario">
          <Plus className="size-4" /> Nuevo negocio
        </Link>
      </CabeceraPagina>

      {socioFiltro && (
        <p className="mb-4 text-[13px] text-suave">
          Datos de {socioFiltro.nombre}: negocios de los que es responsable, contactos que ha hecho y tareas que tiene asignadas.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map((k) => (
          <Link
            key={k.txt}
            href={k.href}
            className={`caja group flex flex-col gap-1 p-4 transition-colors hover:border-borde-2 ${k.alerta ? 'border-peligro/40' : ''} ${k.destacado ? 'border-ok/30' : ''}`}
          >
            <span className={`titulo text-[30px] leading-none ${k.alerta ? 'text-peligro' : k.destacado ? 'text-ok' : ''}`}>{k.valor ?? 0}</span>
            <span className="mt-1 font-medium">{k.txt}</span>
            <span className="text-[12px] text-tenue">{k.def}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Seccion
          titulo="Mis próximas acciones"
          accion={
            <Link href="/agenda" className="inline-flex items-center gap-1 text-[13px] text-cian hover:underline">
              Agenda completa <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {misTareas.length === 0 ? (
            <Vacio titulo="No tienes nada pendiente hasta dentro de 3 días" texto="Cuando registres una visita o llamada podrás programar el siguiente paso." />
          ) : (
            <div className="flex flex-col gap-5">
              {[
                ['Atrasadas', atrasadas, 'text-peligro'],
                ['Hoy', deHoy, 'text-aviso'],
                ['Próximos 3 días', proximas, 'text-suave'],
              ].map(([titulo, lista, color]) =>
                (lista as TareaConNegocio[]).length ? (
                  <div key={titulo as string}>
                    <h3 className={`mb-2 text-[12px] font-semibold tracking-wide uppercase ${color}`}>
                      {titulo as string} · {(lista as TareaConNegocio[]).length}
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {(lista as TareaConNegocio[]).map((t) => (
                        <FilaTarea key={t.id} tarea={t} socios={cat.socios} tiposTarea={n.tipoTarea} />
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
          )}
        </Seccion>

        <div className="flex flex-col gap-5">
          <Seccion titulo="Tareas de cada socio">
            <ul className="flex flex-col gap-3">
              {cargaSocios.map(({ s, total, atrasadas: at, hoy: hh }) => (
                <li key={s.id}>
                  <Link href={`/agenda?socio=${s.id}`} className="flex items-center gap-3 rounded-lg p-1 hover:bg-white/[0.03]">
                    <Avatar socio={s} tam={30} />
                    <div className="flex-1">
                      <p className="font-medium">{s.nombre}</p>
                      <p className="text-[12.5px] text-suave">
                        {total} pendientes · {hh} hoy
                        {at ? <span className="text-peligro"> · {at} atrasadas</span> : null}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-tenue" />
                  </Link>
                </li>
              ))}
            </ul>
          </Seccion>

          <Seccion titulo={socioFiltro ? `Negocios de ${socioFiltro.nombre} por estado` : 'Negocios por estado'}>
            <ul className="flex flex-col gap-1.5">
              {cat.estados.map((e) => (
                <li key={e.codigo}>
                  <Link href={`/negocios?estado=${e.codigo}${socioFiltro ? `&responsable=${socioFiltro.id}` : ''}`} className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-white/[0.03]">
                    <EstadoBadge nombre={e.nombre} color={e.color} />
                    <span className="font-semibold tabular-nums">{porEstado.get(e.codigo) ?? 0}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Seccion>
        </div>
      </div>

      <Seccion titulo={socioFiltro ? `Últimos contactos de ${socioFiltro.nombre}` : 'Últimos contactos del equipo'} className="mt-5">
        {actividad.length === 0 ? (
          <Vacio titulo="Todavía no hay contactos registrados" texto="Abre un negocio y pulsa «Registrar visita» o «Registrar llamada»." />
        ) : (
          <ul className="divide-y divide-borde">
            {actividad.map((a) => {
              const s = cat.socios.find((x) => x.id === a.socio_id);
              return (
                <li key={a.id}>
                  <Link href={`/negocios/${a.negocio_id}`} className="flex items-center gap-3 py-2.5 hover:bg-white/[0.02]">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-cian">
                      <IconoInteraccion tipo={a.tipo} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">
                        <span className="font-medium">{a.negocios?.nombre ?? 'Negocio'}</span>
                        <span className="text-suave"> · {n.resultado[a.resultado] ?? a.resultado}</span>
                      </p>
                      <p className="text-[12.5px] text-tenue">
                        {n.tipoInteraccion[a.tipo]} · {s?.nombre ?? '—'}
                        {a.persona ? ` · con ${a.persona}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-[12.5px] text-suave">{fechaHoraRelativa(a.fecha)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Seccion>
    </>
  );
}
