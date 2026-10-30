'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CircleCheck, Lightbulb } from 'lucide-react';
import { registrarInteraccion } from '@/acciones/seguimiento';
import { BotonEnviar } from '@/components/cliente';
import { Avatar, Campo, EstadoBadge, IconoInteraccion, conColor } from '@/components/ui';
import { fechaCorta, sumarDias } from '@/lib/fechas';
import { GRUPOS_RESULTADO, NIVELES } from '@/lib/textos';
import type { Catalogos, Contacto, Negocio, NegocioServicio, NivelInteres, Resultado, Socio, Tarea } from '@/lib/tipos';

type Props = {
  negocio: Negocio;
  contactos: Contacto[];
  serviciosActuales: NegocioServicio[];
  tarea: Tarea | null;
  cat: Catalogos;
  yo: Socio;
  tipoInicial: string;
  ahora: string;
  hoy: string;
};

// En una llamada no tiene sentido «volver a visitar» como siguiente paso por defecto
function tareaParaCanal(sugerida: string | null, canal: string) {
  if (sugerida === 'volver_visitar' && canal !== 'visita') return canal === 'llamada' ? 'llamar' : 'recontactar';
  if (sugerida === 'recontactar' && canal === 'llamada') return 'llamar';
  return sugerida;
}

function descripcionSugerida(tareaTipo: string, nombreTarea: string, persona: string, horaIndicada: string, servicios: string[]) {
  const quien = persona ? ` con ${persona}` : ' con el responsable';
  const aLas = horaIndicada ? ` (a las ${horaIndicada})` : '';
  switch (tareaTipo) {
    case 'volver_visitar':
      return `Volver a visitar y hablar${quien}${aLas}`;
    case 'llamar':
      return `Llamar y hablar${quien}${aLas}`;
    case 'enviar_info':
      return `Enviar información${servicios.length ? ` de ${servicios.join(', ')}` : ' de nuestros servicios'}`;
    case 'preparar_presupuesto':
      return `Preparar presupuesto${servicios.length ? ` de ${servicios.join(', ')}` : ''}`;
    case 'hacer_demo':
      return `Hacer demostración${servicios.length ? ` de ${servicios.join(', ')}` : ''}`;
    default:
      return `${nombreTarea}${persona ? ` con ${persona}` : ''}${aLas}`;
  }
}

export function FormularioContacto({ negocio, contactos, serviciosActuales, tarea, cat, yo, tipoInicial, ahora, hoy }: Props) {
  const [resultadoAccion, accion] = useActionState(registrarInteraccion, null);
  const [tipo, setTipo] = useState(tipoInicial);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [persona, setPersona] = useState('');
  const [socioId, setSocioId] = useState(yo.id);
  const [servicios, setServicios] = useState<Record<string, NivelInteres | null>>({});
  const [horaIndicada, setHoraIndicada] = useState('');
  const [guardarHorario, setGuardarHorario] = useState(true);
  const [crearTarea, setCrearTarea] = useState(false);
  const [tareaTipo, setTareaTipo] = useState('recontactar');
  const [descripcion, setDescripcion] = useState('');
  const [descripcionTocada, setDescripcionTocada] = useState(false);
  const [fecha, setFecha] = useState(sumarDias(hoy, 1));
  const [horaTarea, setHoraTarea] = useState('');
  const [responsable, setResponsable] = useState(negocio.responsable_id ?? yo.id);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const err = resultadoAccion && !resultadoAccion.ok ? resultadoAccion.campos ?? {} : {};
  const router = useRouter();
  useEffect(() => {
    // El aviso «Contacto registrado» llega por cookie al cambiar de página
    if (!resultadoAccion?.ok) return;
    const ficha = `/negocios/${negocio.id}`;
    router.push(ficha);
    // Con mala cobertura la navegación puede quedarse a medias: el contacto ya está guardado,
    // así que si en unos segundos no se ha abierto la ficha, se carga la página entera.
    const respaldo = setTimeout(() => window.location.assign(ficha), 6000);
    return () => clearTimeout(respaldo);
  }, [resultadoAccion]); // eslint-disable-line react-hooks/exhaustive-deps

  const nombreServicio = (c: string) => cat.servicios.find((s) => s.codigo === c)?.nombre ?? c;
  const nombreTarea = (c: string) => cat.tiposTarea.find((t) => t.codigo === c)?.nombre ?? c;
  const estadoDe = (c: string) => cat.estados.find((e) => e.codigo === c);
  const serviciosElegidos = Object.keys(servicios);

  const recalcularDescripcion = (t: string, p = persona, h = horaIndicada, s = serviciosElegidos) => {
    if (!descripcionTocada) setDescripcion(descripcionSugerida(t, nombreTarea(t), p, h, s.map(nombreServicio)));
  };

  // Al elegir el resultado se rellena una propuesta de siguiente paso, que se puede cambiar antes de guardar
  const elegirResultado = (r: Resultado, canal = tipo) => {
    setResultado(r);
    const t = tareaParaCanal(r.sugerencia_tarea, canal);
    setCrearTarea(!!t);
    if (t) {
      setTareaTipo(t);
      setFecha(r.sugerencia_dias != null ? sumarDias(hoy, r.sugerencia_dias) : sumarDias(hoy, 1));
      setDescripcionTocada(false);
      setDescripcion(descripcionSugerida(t, nombreTarea(t), persona, horaIndicada, serviciosElegidos.map(nombreServicio)));
    }
    let estado = r.sugerencia_estado;
    if (!estado && negocio.estado === 'pendiente_contactar') estado = 'primer_contacto';
    setNuevoEstado(estado && estado !== negocio.estado ? estado : '');
  };

  const grupos = useMemo(() => {
    const m = new Map<string, Resultado[]>();
    for (const r of cat.resultados) m.set(r.grupo, [...(m.get(r.grupo) ?? []), r]);
    return [...m.entries()];
  }, [cat.resultados]);

  const horario = horaIndicada ? `Se le puede encontrar a las ${horaIndicada} (nos lo dijeron el ${fechaCorta(hoy)})` : '';
  const quien = cat.socios.find((s) => s.id === socioId);

  return (
    <form action={accion} className="flex flex-col gap-4 pb-24 md:pb-0">
      <input type="hidden" name="negocio_id" value={negocio.id} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="resultado" value={resultado?.codigo ?? ''} />
      <input type="hidden" name="socio_id" value={socioId} />
      <input type="hidden" name="servicios" value={JSON.stringify(servicios)} />
      <input type="hidden" name="crear_tarea" value={crearTarea ? 'true' : 'false'} />
      <input type="hidden" name="nuevo_estado" value={nuevoEstado} />
      {tarea && <input type="hidden" name="completar_tarea" value={tarea.id} />}
      {resultado?.pide_hora && guardarHorario && horario && <input type="hidden" name="horario_contacto" value={horario} />}

      {tarea && (
        <div className="flex items-start gap-2 rounded-lg border border-cian/30 bg-cian/[0.06] px-3 py-2.5 text-[13.5px]">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-cian" />
          <p>
            Al guardar se marcará como hecha la tarea <span className="font-medium">«{tarea.descripcion}»</span>.
          </p>
        </div>
      )}

      <div className="caja flex flex-col gap-4 p-4 md:p-5">
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-medium text-suave">Tipo de contacto</legend>
          <div className="flex flex-wrap gap-2">
            {cat.tiposInteraccion.map((t) => (
              <button
                key={t.codigo}
                type="button"
                className="chip"
                aria-pressed={tipo === t.codigo}
                onClick={() => {
                  setTipo(t.codigo);
                  if (resultado) elegirResultado(resultado, t.codigo);
                }}
              >
                <IconoInteraccion tipo={t.codigo} className="size-3.5" /> {t.nombre}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[12.5px] font-medium text-suave">¿Qué ha pasado? *</legend>
          <div className="flex flex-col gap-3">
            {grupos.map(([grupo, lista]) => (
              <div key={grupo}>
                <p className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-tenue uppercase">{GRUPOS_RESULTADO[grupo] ?? grupo}</p>
                <div className="flex flex-wrap gap-1.5">
                  {lista.map((r) => (
                    <button key={r.codigo} type="button" className="chip" aria-pressed={resultado?.codigo === r.codigo} onClick={() => elegirResultado(r)}>
                      {r.nombre}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {err.resultado && <p className="mt-2 text-[12.5px] text-peligro">{err.resultado}</p>}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Campo etiqueta="Persona con la que se habló" error={err.persona}>
            <input
              className="input"
              name="persona"
              list="contactos-negocio"
              value={persona}
              onChange={(e) => {
                setPersona(e.target.value);
                if (crearTarea) recalcularDescripcion(tareaTipo, e.target.value);
              }}
              maxLength={120}
              placeholder="Nombre y cargo, si lo sabes"
            />
            <datalist id="contactos-negocio">
              {contactos.map((c) => (
                <option key={c.id} value={c.cargo ? `${c.nombre} (${c.cargo})` : c.nombre} />
              ))}
            </datalist>
          </Campo>
          <Campo etiqueta="Fecha y hora" error={err.fecha_local} ayuda="Cámbiala si registras un contacto anterior">
            <input className="input" type="datetime-local" name="fecha_local" defaultValue={ahora} max={ahora.slice(0, 10) + 'T23:59'} required />
          </Campo>
        </div>

        <fieldset>
          <legend className="mb-2 text-[12.5px] font-medium text-suave">Lo hizo</legend>
          <div className="flex flex-wrap gap-2">
            {cat.socios.map((s) => (
              <button key={s.id} type="button" className="chip" style={conColor(s.color)} aria-pressed={socioId === s.id} onClick={() => setSocioId(s.id)}>
                <Avatar socio={s} tam={18} /> {s.nombre}
                {s.id === yo.id ? ' (yo)' : ''}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[12.5px] font-medium text-suave">Servicios tratados</legend>
          <div className="flex flex-wrap gap-2">
            {cat.servicios.map((s) => {
              const on = s.codigo in servicios;
              return (
                <button
                  key={s.codigo}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  onClick={() => {
                    const siguiente = { ...servicios };
                    if (on) delete siguiente[s.codigo];
                    else siguiente[s.codigo] = (serviciosActuales.find((a) => a.servicio === s.codigo)?.nivel as NivelInteres) ?? null;
                    setServicios(siguiente);
                    if (crearTarea) recalcularDescripcion(tareaTipo, persona, horaIndicada, Object.keys(siguiente));
                  }}
                >
                  {s.nombre}
                </button>
              );
            })}
          </div>
          {serviciosElegidos.length > 0 && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-borde bg-panel-2/50 p-3">
              <p className="text-[12px] text-tenue">Interés que ha mostrado en cada uno (se guarda en su ficha):</p>
              {serviciosElegidos.map((c) => (
                <div key={c} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13.5px]">{nombreServicio(c)}</span>
                  <div className="flex flex-wrap gap-1">
                    {NIVELES.map((n) => (
                      <button key={n.v} type="button" className="chip min-h-[28px] px-2.5 py-0.5 text-[12px]" style={conColor(n.color)} aria-pressed={servicios[c] === n.v} onClick={() => setServicios({ ...servicios, [c]: servicios[c] === n.v ? null : n.v })}>
                        {n.corto}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        <Campo etiqueta="Notas" error={err.notas}>
          <textarea className="input" name="notas" rows={3} maxLength={5000} placeholder="Necesidades, problemas que ha contado, dudas, objeciones…" />
        </Campo>
      </div>

      {resultado && (
        <div className="caja flex flex-col gap-4 border-acento/30 p-4 md:p-5">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold">
            <Lightbulb className="size-4 text-aviso" /> Siguiente paso
            <span className="font-normal text-tenue">· propuesta según el resultado, revísala antes de guardar</span>
          </p>

          {resultado.pide_hora && (
            <div className="grid gap-3 rounded-lg border border-aviso/30 bg-aviso/[0.05] p-3 sm:grid-cols-[auto_1fr] sm:items-end">
              <Campo etiqueta="¿A qué hora se le puede encontrar?">
                <input
                  className="input w-[140px]"
                  type="time"
                  value={horaIndicada}
                  onChange={(e) => {
                    setHoraIndicada(e.target.value);
                    setHoraTarea(e.target.value);
                    if (crearTarea) recalcularDescripcion(tareaTipo, persona, e.target.value);
                  }}
                />
              </Campo>
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={guardarHorario} onChange={(e) => setGuardarHorario(e.target.checked)} className="accent-[#7c5cff]" disabled={!horaIndicada} />
                Guardarlo en la ficha del negocio
              </label>
            </div>
          )}

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={crearTarea} onChange={(e) => setCrearTarea(e.target.checked)} className="size-4 accent-[#7c5cff]" />
            <span className="font-medium">Programar la siguiente acción</span>
          </label>
          {crearTarea && (
            <div className="flex flex-col gap-3 rounded-lg border border-borde bg-panel-2/50 p-3">
              <div className="flex flex-wrap gap-1.5">
                {cat.tiposTarea.map((t) => (
                  <button
                    key={t.codigo}
                    type="button"
                    className="chip"
                    aria-pressed={tareaTipo === t.codigo}
                    onClick={() => {
                      setTareaTipo(t.codigo);
                      recalcularDescripcion(t.codigo);
                    }}
                  >
                    {t.nombre}
                  </button>
                ))}
              </div>
              <input type="hidden" name="tarea_tipo" value={tareaTipo} />
              <Campo etiqueta="Qué hay que hacer" error={err.tarea_descripcion ?? err.tarea_tipo}>
                <input
                  className="input"
                  name="tarea_descripcion"
                  value={descripcion}
                  onChange={(e) => {
                    setDescripcion(e.target.value);
                    setDescripcionTocada(true);
                  }}
                  maxLength={300}
                />
              </Campo>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ['Hoy', hoy],
                  ['Mañana', sumarDias(hoy, 1)],
                  ['+3 días', sumarDias(hoy, 3)],
                  ['+1 semana', sumarDias(hoy, 7)],
                  ['+1 mes', sumarDias(hoy, 30)],
                  ['Sin fecha', ''],
                ].map(([txt, v]) => (
                  <button key={txt} type="button" className="chip" aria-pressed={fecha === v} onClick={() => setFecha(v)}>
                    {txt}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Campo etiqueta="Fecha" error={err.tarea_fecha}>
                  <input className="input" type="date" name="tarea_fecha" value={fecha} min={hoy} onChange={(e) => setFecha(e.target.value)} />
                </Campo>
                <Campo etiqueta="Hora">
                  <input className="input" type="time" name="tarea_hora" value={horaTarea} onChange={(e) => setHoraTarea(e.target.value)} disabled={!fecha} />
                </Campo>
                <Campo etiqueta="Responsable" className="col-span-2 sm:col-span-1">
                  <select className="input" name="tarea_responsable" value={responsable} onChange={(e) => setResponsable(e.target.value)}>
                    {cat.socios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] font-medium text-suave">Estado comercial</span>
            <div className="flex flex-wrap items-center gap-2">
              <EstadoBadge nombre={estadoDe(negocio.estado)?.nombre ?? negocio.estado} color={estadoDe(negocio.estado)?.color ?? '#8a90a6'} />
              <ArrowRight className="size-4 text-tenue" />
              <select className="input w-auto min-w-[260px]" value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)} aria-label="Nuevo estado comercial">
                <option value="">Mantener el estado actual</option>
                {cat.estados
                  .filter((e) => e.codigo !== negocio.estado)
                  .map((e) => (
                    <option key={e.codigo} value={e.codigo}>
                      {e.nombre}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {resultadoAccion && !resultadoAccion.ok && (
        <p role="alert" className="rounded-lg border border-peligro/40 bg-peligro/10 px-3 py-2 text-[13px] text-[#ffb4b2]">
          {resultadoAccion.error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-[62px] z-10 border-t border-borde bg-fondo/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <BotonEnviar className="btn btn-primario btn-lg w-full md:w-auto" disabled={!resultado || resultadoAccion?.ok === true} pendiente="Guardando…">
          {resultadoAccion?.ok ? (
            <>
              <CircleCheck className="size-4" /> Guardado. Abriendo la ficha…
            </>
          ) : (
            <>Guardar contacto{quien && quien.id !== yo.id ? ` de ${quien.nombre}` : ''}</>
          )}
        </BotonEnviar>
      </div>
    </form>
  );
}
