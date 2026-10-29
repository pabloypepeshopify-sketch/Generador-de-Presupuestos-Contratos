import Link from 'next/link';
import { ChevronRight, Phone, Plus } from 'lucide-react';
import { exigirSocio, obtenerCatalogos } from '@/lib/sesion';
import { consultarNegocios, filtrosActivos, leerFiltros, POR_PAGINA, valoresUsados } from '@/lib/filtros';
import { diaRelativo, haceTiempo, hora, vencimiento } from '@/lib/fechas';
import { nombres, telHref } from '@/lib/textos';
import { SelectorEstado } from '@/components/selectores';
import { Avatar, CabeceraPagina, EstadoBadge, IconoInteraccion, ServiciosEtiquetas, Vacio } from '@/components/ui';
import type { NegocioVista } from '@/lib/tipos';
import { FiltrosNegocios } from './filtros';

export const metadata = { title: 'Negocios' };

const COLOR_VENCE = { atrasada: 'text-peligro', hoy: 'text-aviso', proxima: 'text-suave', sin_fecha: 'text-tenue' };

function ProximaAccion({ n }: { n: NegocioVista }) {
  if (!n.proxima_accion) return <span className="text-tenue">Sin acción pendiente</span>;
  const v = vencimiento(n.proxima_fecha);
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate">{n.proxima_accion}</span>
      <span className={`text-[12px] font-medium ${COLOR_VENCE[v]}`}>
        {v === 'atrasada' ? 'Atrasada · ' : ''}
        {diaRelativo(n.proxima_fecha)}
        {n.proxima_hora ? ` · ${hora(n.proxima_hora)}` : ''}
        {n.tareas_pendientes > 1 ? ` · +${n.tareas_pendientes - 1}` : ''}
      </span>
    </span>
  );
}

export default async function PaginaNegocios({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await exigirSocio();
  const cat = await obtenerCatalogos();
  const n = nombres(cat);
  const sp = await searchParams;
  const f = leerFiltros(sp);
  const [{ negocios, total }, { sectores, localidades }] = await Promise.all([consultarNegocios(supabase, f), valoresUsados(supabase)]);
  const activos = filtrosActivos(f);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlacePagina = (p: number) => {
    const u = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === 'string' && k !== 'pagina' ? [[k, v]] : [])));
    if (p > 1) u.set('pagina', String(p));
    return `/negocios${u.size ? `?${u}` : ''}`;
  };
  const socio = (id: string | null) => cat.socios.find((s) => s.id === id);

  return (
    <>
      <CabeceraPagina titulo="Negocios" sub={`${total} ${total === 1 ? 'negocio' : 'negocios'}${activos ? ' con estos filtros' : ' registrados'}`}>
        <Link href="/negocios/nuevo" className="btn btn-primario">
          <Plus className="size-4" /> Nuevo negocio
        </Link>
      </CabeceraPagina>

      <FiltrosNegocios f={f} cat={cat} sectores={sectores} localidades={localidades} activos={activos} />

      {negocios.length === 0 ? (
        activos ? (
          <Vacio titulo="Ningún negocio cumple estos filtros" texto="Prueba a quitar algún filtro o a buscar de otra forma.">
            <Link href="/negocios" className="btn">
              Quitar filtros
            </Link>
          </Vacio>
        ) : (
          <Vacio titulo="Todavía no hay negocios" texto="Registra el primer negocio que hayáis visitado o llamado. Solo hace falta el nombre.">
            <Link href="/negocios/nuevo" className="btn btn-primario">
              <Plus className="size-4" /> Nuevo negocio
            </Link>
          </Vacio>
        )
      ) : (
        <>
          {/* Escritorio: tabla (la primera columna queda fija al desplazar en horizontal) */}
          <div className="caja hidden max-h-[calc(100dvh-230px)] overflow-auto lg:block">
            <table className="tabla w-full min-w-[1320px] text-[13.5px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-[2]">Negocio</th>
                  <th>Sector</th>
                  <th>Localidad</th>
                  <th>Contacto</th>
                  <th>Teléfono</th>
                  <th>Servicios de interés</th>
                  <th className="w-[190px]">Estado</th>
                  <th>Resp.</th>
                  <th>Último contacto</th>
                  <th>Próxima acción</th>
                  <th>Seguimiento</th>
                </tr>
              </thead>
              <tbody>
                {negocios.map((x) => {
                  const v = vencimiento(x.proxima_fecha);
                  return (
                    <tr key={x.id}>
                      <td className="sticky left-0 z-[1] max-w-[230px] bg-panel">
                        <Link href={`/negocios/${x.id}`} className="flex items-center gap-1 font-semibold hover:text-cian">
                          <span className="truncate">{x.nombre}</span>
                          <ChevronRight className="size-3.5 shrink-0 text-tenue" />
                        </Link>
                      </td>
                      <td className="max-w-[140px] truncate text-suave">{x.sector ?? '—'}</td>
                      <td className="max-w-[130px] truncate text-suave">{x.localidad ?? '—'}</td>
                      <td className="max-w-[170px]">
                        <span className="block truncate">{x.contacto_nombre ?? <span className="text-tenue">—</span>}</span>
                        {x.contacto_cargo && <span className="block truncate text-[12px] text-tenue">{x.contacto_cargo}</span>}
                      </td>
                      <td className="whitespace-nowrap">
                        {x.telefono_contacto ? (
                          <a href={telHref(x.telefono_contacto)} className="hover:text-cian">
                            {x.telefono_contacto}
                          </a>
                        ) : (
                          <span className="text-tenue">—</span>
                        )}
                      </td>
                      <td>
                        <ServiciosEtiquetas codigos={x.servicios_interes} max={2} />
                      </td>
                      <td>
                        <SelectorEstado id={x.id} estado={x.estado} estados={cat.estados} compacto />
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <Avatar socio={socio(x.responsable_id)} tam={22} />
                          <span className="text-suave">{socio(x.responsable_id)?.nombre ?? '—'}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        {x.ultima_interaccion_en ? (
                          <span className="flex items-center gap-1.5" title={x.ultima_resultado ? n.resultado[x.ultima_resultado] : undefined}>
                            {x.ultima_tipo && <IconoInteraccion tipo={x.ultima_tipo} className="size-3.5 text-tenue" />}
                            {haceTiempo(x.ultima_interaccion_en)}
                          </span>
                        ) : (
                          <span className="text-tenue">Nunca</span>
                        )}
                      </td>
                      <td className="max-w-[220px]">
                        {x.proxima_accion ? (
                          <span className="block truncate" title={x.proxima_accion}>
                            {x.proxima_accion}
                            {x.tareas_pendientes > 1 && <span className="text-tenue"> · +{x.tareas_pendientes - 1}</span>}
                          </span>
                        ) : (
                          <span className="text-tenue">—</span>
                        )}
                      </td>
                      <td className={`whitespace-nowrap font-medium ${x.proxima_accion ? COLOR_VENCE[v] : 'text-tenue'}`}>
                        {x.proxima_accion ? (
                          <>
                            {v === 'atrasada' ? 'Atrasada · ' : ''}
                            {diaRelativo(x.proxima_fecha)}
                            {x.proxima_hora ? ` ${hora(x.proxima_hora)}` : ''}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Móvil y tablet: tarjetas con los mismos datos */}
          <ul className="flex flex-col gap-2 lg:hidden">
            {negocios.map((x) => (
              <li key={x.id} className="caja p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/negocios/${x.id}`} className="min-w-0">
                    <p className="truncate font-semibold">{x.nombre}</p>
                    <p className="truncate text-[12.5px] text-suave">{[x.sector, x.localidad].filter(Boolean).join(' · ') || 'Sin sector'}</p>
                  </Link>
                  <Avatar socio={socio(x.responsable_id)} tam={26} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <EstadoBadge nombre={x.estado_nombre} color={x.estado_color} />
                  <ServiciosEtiquetas codigos={x.servicios_interes} max={2} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[13px]">
                  <div>
                    <p className="text-[11.5px] text-tenue">Contacto</p>
                    <p className="truncate">{x.contacto_nombre ?? '—'}</p>
                    {x.telefono_contacto && (
                      <a href={telHref(x.telefono_contacto)} className="inline-flex items-center gap-1 text-cian">
                        <Phone className="size-3" /> {x.telefono_contacto}
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="text-[11.5px] text-tenue">Último contacto</p>
                    <p>{haceTiempo(x.ultima_interaccion_en)}</p>
                  </div>
                </div>
                <div className="mt-2 border-t border-borde pt-2 text-[13px]">
                  <ProximaAccion n={x} />
                </div>
              </li>
            ))}
          </ul>

          {paginas > 1 && (
            <nav className="mt-4 flex items-center justify-center gap-2" aria-label="Páginas">
              {f.pagina > 1 && (
                <Link className="btn btn-sm" href={enlacePagina(f.pagina - 1)}>
                  Anterior
                </Link>
              )}
              <span className="text-[13px] text-suave">
                Página {f.pagina} de {paginas}
              </span>
              {f.pagina < paginas && (
                <Link className="btn btn-sm" href={enlacePagina(f.pagina + 1)}>
                  Siguiente
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
