'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { CalendarClock, Check, Clock, RotateCcw, Trash2 } from 'lucide-react';
import { borrarTarea, completarTarea, reabrirTarea, reprogramarTarea } from '@/acciones/seguimiento';
import { BotonEnviar, useAccion, useAvisoDeResultado } from '@/components/cliente';
import { Avatar } from '@/components/ui';
import { diaRelativo, hora, hoy, sumarDias, vencimiento } from '@/lib/fechas';
import type { Socio, Tarea, TareaConNegocio } from '@/lib/tipos';

// Qué tipo de contacto se propone al completar cada tipo de tarea
const CONTACTO_DE_TAREA: Record<string, string> = {
  volver_visitar: 'visita',
  llamar: 'llamada',
  enviar_info: 'email',
  hacer_demo: 'reunion',
  recontactar: 'llamada',
};

const ESTILO_VENCE = {
  atrasada: 'text-peligro',
  hoy: 'text-aviso',
  proxima: 'text-suave',
  sin_fecha: 'text-tenue',
};

export function FilaTarea({
  tarea,
  socios,
  tiposTarea,
  mostrarNegocio = true,
}: {
  tarea: Tarea | TareaConNegocio;
  socios: Socio[];
  tiposTarea: Record<string, string>;
  mostrarNegocio?: boolean;
}) {
  const { ejecutar, pendiente } = useAccion();
  const [reprogramando, setReprogramando] = useState(false);
  const negocio = 'negocios' in tarea ? tarea.negocios : null;
  const responsable = socios.find((s) => s.id === tarea.responsable_id);
  const v = vencimiento(tarea.vence_fecha);
  const hecha = tarea.estado === 'completada';

  return (
    <li className={`flex flex-col gap-2 rounded-lg border px-3 py-2.5 ${v === 'atrasada' && !hecha ? 'border-peligro/30 bg-peligro/[0.04]' : 'border-borde bg-panel-2/40'}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[11.5px] font-semibold tracking-wide text-cian uppercase">{tiposTarea[tarea.tipo] ?? tarea.tipo}</span>
            {mostrarNegocio && negocio && (
              <Link href={`/negocios/${negocio.id}`} className="truncate font-semibold hover:underline">
                {negocio.nombre}
              </Link>
            )}
          </div>
          <p className={`mt-0.5 ${hecha ? 'text-tenue line-through' : ''}`}>{tarea.descripcion}</p>
          {tarea.notas && <p className="mt-0.5 text-[13px] text-suave">{tarea.notas}</p>}
          {mostrarNegocio && negocio?.horario_contacto && !hecha && (
            <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-aviso">
              <Clock className="size-3.5" /> {negocio.horario_contacto}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <span className={`text-[12.5px] font-semibold ${hecha ? 'text-tenue' : ESTILO_VENCE[v]}`}>
            {v === 'atrasada' && !hecha ? 'Atrasada · ' : ''}
            {diaRelativo(tarea.vence_fecha)}
            {tarea.vence_hora ? ` · ${hora(tarea.vence_hora)}` : ''}
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] text-suave">
            <Avatar socio={responsable} tam={18} /> {responsable?.nombre ?? 'Sin asignar'}
          </span>
        </div>
      </div>

      {!hecha ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/negocios/${tarea.negocio_id}/contacto?tarea=${tarea.id}&tipo=${CONTACTO_DE_TAREA[tarea.tipo] ?? 'llamada'}`}
            className="btn btn-sm"
            title="Registrar qué ha pasado y, si hace falta, programar lo siguiente"
          >
            <Check className="size-3.5" /> Hecha: registrar resultado
          </Link>
          <button className="btn btn-fantasma btn-sm" disabled={pendiente} onClick={() => ejecutar(() => completarTarea(tarea.id))}>
            Marcar hecha
          </button>
          <button className="btn btn-fantasma btn-sm" onClick={() => setReprogramando((r) => !r)} aria-expanded={reprogramando}>
            <CalendarClock className="size-3.5" /> Reprogramar
          </button>
          <button
            className="btn btn-fantasma btn-sm ml-auto px-2 text-tenue"
            disabled={pendiente}
            aria-label="Borrar tarea"
            title="Borrar tarea"
            onClick={() => ejecutar(() => borrarTarea(tarea.id), { confirmar: '¿Borrar esta tarea? No se puede deshacer.' })}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[12.5px] text-tenue">
          <Check className="size-3.5 text-ok" /> Completada
          <button className="btn btn-fantasma btn-sm ml-auto" disabled={pendiente} onClick={() => ejecutar(() => reabrirTarea(tarea.id))}>
            <RotateCcw className="size-3.5" /> Reabrir
          </button>
        </div>
      )}

      {reprogramando && !hecha && <Reprogramar tarea={tarea} alTerminar={() => setReprogramando(false)} />}
    </li>
  );
}

function Reprogramar({ tarea, alTerminar }: { tarea: Tarea; alTerminar: () => void }) {
  const [resultado, accion] = useActionState(reprogramarTarea, null);
  const [fecha, setFecha] = useState(tarea.vence_fecha ?? '');
  useAvisoDeResultado(resultado, alTerminar);
  const h = hoy();
  const rapidas = [
    { txt: 'Hoy', v: h },
    { txt: 'Mañana', v: sumarDias(h, 1) },
    { txt: '+3 días', v: sumarDias(h, 3) },
    { txt: '+1 semana', v: sumarDias(h, 7) },
  ];
  return (
    <form action={accion} className="flex flex-wrap items-end gap-2 rounded-lg border border-borde bg-panel p-2.5">
      <input type="hidden" name="id" value={tarea.id} />
      <div className="flex flex-wrap gap-1">
        {rapidas.map((r) => (
          <button key={r.txt} type="button" className="chip" aria-pressed={fecha === r.v} onClick={() => setFecha(r.v)}>
            {r.txt}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={fecha === ''} onClick={() => setFecha('')}>
          Sin fecha
        </button>
      </div>
      <input className="input w-auto" type="date" name="vence_fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label="Nueva fecha" />
      <input className="input w-auto" type="time" name="vence_hora" defaultValue={hora(tarea.vence_hora)} aria-label="Hora" disabled={!fecha} />
      <BotonEnviar className="btn btn-primario btn-sm">Guardar</BotonEnviar>
    </form>
  );
}
