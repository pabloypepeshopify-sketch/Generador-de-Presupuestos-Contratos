import { ArrowRight, CalendarPlus, CircleCheck, Flag } from 'lucide-react';
import { diaRelativo, fechaHora, hora } from '@/lib/fechas';
import { nombres, SERVICIO_CORTO } from '@/lib/textos';
import { Avatar, EstadoBadge, IconoInteraccion, Vacio, conColor } from '@/components/ui';
import type { CambioEstado, Catalogos, Interaccion, Tarea } from '@/lib/tipos';
import { BorrarInteraccion } from './borrar-interaccion';

type Elemento =
  | { clase: 'interaccion'; fecha: string; x: Interaccion }
  | { clase: 'estado'; fecha: string; x: CambioEstado }
  | { clase: 'tarea_creada'; fecha: string; x: Tarea }
  | { clase: 'tarea_hecha'; fecha: string; x: Tarea };

// Línea de tiempo con tres tipos de elementos bien diferenciados:
// contactos (tarjetas), cambios de estado (línea con flecha) y tareas (línea con icono de calendario/check).
export function Historial({ interacciones, tareas, cambios, cat }: { interacciones: Interaccion[]; tareas: Tarea[]; cambios: CambioEstado[]; cat: Catalogos }) {
  const n = nombres(cat);
  const estado = (c: string | null) => cat.estados.find((e) => e.codigo === c);
  const socio = (id: string | null) => cat.socios.find((s) => s.id === id);

  const elementos: Elemento[] = [
    ...interacciones.map((x) => ({ clase: 'interaccion' as const, fecha: x.fecha, x })),
    ...cambios.map((x) => ({ clase: 'estado' as const, fecha: x.creado_en, x })),
    // Las tareas creadas al registrar un contacto ya aparecen en esa tarjeta como «siguiente paso»
    ...tareas.filter((t) => !t.origen_interaccion_id).map((x) => ({ clase: 'tarea_creada' as const, fecha: x.creado_en, x })),
    ...tareas.filter((t) => t.estado === 'completada' && t.completada_en).map((x) => ({ clase: 'tarea_hecha' as const, fecha: x.completada_en!, x })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  if (!elementos.length) return <Vacio titulo="Sin historial todavía" />;

  return (
    <ol className="relative flex flex-col gap-3 border-l border-borde-2 pl-5">
      {elementos.map((el) => {
        if (el.clase === 'interaccion') {
          const x = el.x;
          const autor = socio(x.socio_id);
          return (
            <li key={`i${x.id}`} className="relative">
              <span className="absolute top-3 -left-[31px] grid size-5 place-items-center rounded-full border border-cian/40 bg-panel text-cian">
                <IconoInteraccion tipo={x.tipo} className="size-3" />
              </span>
              <article className="rounded-lg border border-borde bg-panel-2/60 p-3.5">
                <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold">{n.tipoInteraccion[x.tipo] ?? x.tipo}</span>
                  <span className="inline-flex items-center gap-1 text-[13px] text-suave">
                    <Avatar socio={autor} tam={18} /> {autor?.nombre ?? '—'}
                  </span>
                  <span className="text-[12.5px] text-tenue">{fechaHora(x.fecha)}</span>
                  <BorrarInteraccion id={x.id} />
                </header>
                <p className="mt-2">
                  <span className="etiqueta" style={conColor(resultadoColor(cat, x.resultado))}>
                    {n.resultado[x.resultado] ?? x.resultado}
                  </span>
                </p>
                {x.persona && <p className="mt-2 text-[13px] text-suave">Habló con: <span className="text-texto">{x.persona}</span></p>}
                {x.servicios.length > 0 && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[13px] text-suave">
                    Servicios tratados:
                    {x.servicios.map((s) => (
                      <span key={s} className="rounded-md bg-white/[0.06] px-1.5 py-px text-[12px]">
                        {SERVICIO_CORTO[s] ?? s}
                      </span>
                    ))}
                  </p>
                )}
                {x.notas && <p className="mt-2 whitespace-pre-wrap text-[13.5px]">{x.notas}</p>}
                {x.proxima_accion && (
                  <p className="mt-2 rounded-md bg-cian/[0.07] px-2.5 py-1.5 text-[13px] text-cian">
                    Siguiente paso: {x.proxima_accion}
                    {x.proxima_fecha ? ` · ${diaRelativo(x.proxima_fecha)}` : ' · sin fecha'}
                    {x.proxima_hora ? ` ${hora(x.proxima_hora)}` : ''}
                  </p>
                )}
                {x.registrada_por !== x.socio_id && (
                  <p className="mt-2 text-[12px] text-tenue">Registrado por {socio(x.registrada_por)?.nombre ?? '—'}</p>
                )}
              </article>
            </li>
          );
        }
        if (el.clase === 'estado') {
          const x = el.x;
          const nuevo = estado(x.estado_nuevo);
          const antes = estado(x.estado_anterior);
          return (
            <li key={`e${x.id}`} className="relative flex flex-wrap items-center gap-2 py-0.5 text-[13px] text-suave">
              <span className="absolute top-1 -left-[27px] grid size-3 place-items-center rounded-full border-2 border-fondo" style={{ background: nuevo?.color }} />
              <Flag className="size-3.5" />
              {antes ? (
                <>
                  Estado: <EstadoBadge nombre={antes.nombre} color={antes.color} /> <ArrowRight className="size-3.5" />
                </>
              ) : (
                'Negocio registrado como'
              )}
              {nuevo && <EstadoBadge nombre={nuevo.nombre} color={nuevo.color} />}
              <span className="text-tenue">
                · {socio(x.socio_id)?.nombre ?? 'sistema'} · {fechaHora(x.creado_en)}
              </span>
            </li>
          );
        }
        const t = el.x;
        const hecha = el.clase === 'tarea_hecha';
        return (
          <li key={`${el.clase}${t.id}`} className="relative flex flex-wrap items-center gap-2 py-0.5 text-[13px] text-suave">
            <span className={`absolute top-1 -left-[27px] size-3 rounded-full border-2 border-fondo ${hecha ? 'bg-ok' : 'bg-azul'}`} />
            {hecha ? <CircleCheck className="size-3.5 text-ok" /> : <CalendarPlus className="size-3.5 text-azul" />}
            {hecha ? 'Tarea completada:' : 'Tarea programada:'} <span className="text-texto">{t.descripcion}</span>
            {!hecha && (
              <span>
                para {diaRelativo(t.vence_fecha).toLowerCase()}
                {t.vence_hora ? ` ${hora(t.vence_hora)}` : ''} · {socio(t.responsable_id)?.nombre ?? 'sin responsable'}
              </span>
            )}
            <span className="text-tenue">
              · {socio(hecha ? t.completada_por : t.creado_por)?.nombre ?? '—'} · {fechaHora(el.fecha)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function resultadoColor(cat: Catalogos, codigo: string) {
  const r = cat.resultados.find((x) => x.codigo === codigo);
  if (!r) return '#a3a9bc';
  return { localizar: '#F5A524', sin_interes: '#F25F5C', interes: '#7C5CFF', decision: '#22C55E', otro: '#A3A9BC' }[r.grupo];
}

