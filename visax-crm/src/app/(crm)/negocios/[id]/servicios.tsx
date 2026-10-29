'use client';

import { useActionState, useRef, useState } from 'react';
import { guardarServicio } from '@/acciones/negocios';
import { useAvisoDeResultado } from '@/components/cliente';
import { Seccion, conColor } from '@/components/ui';
import { NIVELES, nivelDe } from '@/lib/textos';
import type { NegocioServicio, Servicio } from '@/lib/tipos';

// Interés por cada servicio por separado: p. ej. «Web: sin interés actual» y «Automatizaciones: mucho interés».
export function EditorServicios({ negocioId, servicios, actuales }: { negocioId: string; servicios: Servicio[]; actuales: NegocioServicio[] }) {
  return (
    <Seccion titulo="Servicios de interés">
      <ul className="flex flex-col divide-y divide-borde">
        {servicios.map((s) => (
          <FilaServicio key={s.codigo} negocioId={negocioId} servicio={s} actual={actuales.find((a) => a.servicio === s.codigo)} />
        ))}
      </ul>
    </Seccion>
  );
}

function FilaServicio({ negocioId, servicio, actual }: { negocioId: string; servicio: Servicio; actual?: NegocioServicio }) {
  const [resultado, accion] = useActionState(guardarServicio, null);
  const [nota, setNota] = useState(actual?.notas ?? '');
  const [verNota, setVerNota] = useState(!!actual?.notas);
  const form = useRef<HTMLFormElement>(null);
  useAvisoDeResultado(resultado);
  const nivel = actual ? nivelDe(actual.nivel) : null;

  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      <form ref={form} action={accion} className="flex flex-col gap-2">
        <input type="hidden" name="negocio_id" value={negocioId} />
        <input type="hidden" name="servicio" value={servicio.codigo} />
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: nivel?.color ?? '#3a3f52' }} />
            <span className={actual ? 'font-medium' : 'text-suave'}>{servicio.nombre}</span>
          </span>
          <select
            name="nivel"
            aria-label={`Interés en ${servicio.nombre}`}
            className="input w-[170px] min-h-[30px] py-1 text-[12.5px]"
            defaultValue={actual?.nivel ?? 'quitar'}
            style={nivel ? conColor(nivel.color) : undefined}
            onChange={() => form.current?.requestSubmit()}
          >
            <option value="quitar">No registrado</option>
            {NIVELES.map((n) => (
              <option key={n.v} value={n.v}>
                {n.txt}
              </option>
            ))}
          </select>
        </div>
        {actual &&
          (verNota ? (
            <div className="flex gap-2">
              <input className="input min-h-[32px] py-1 text-[13px]" name="notas" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota sobre este servicio" maxLength={1000} />
              {nota !== (actual.notas ?? '') && <button className="btn btn-sm">Guardar</button>}
            </div>
          ) : (
            <>
              <input type="hidden" name="notas" value={nota} />
              <button type="button" className="self-start text-[12.5px] text-tenue hover:text-cian" onClick={() => setVerNota(true)}>
                + Añadir nota
              </button>
            </>
          ))}
      </form>
    </li>
  );
}
