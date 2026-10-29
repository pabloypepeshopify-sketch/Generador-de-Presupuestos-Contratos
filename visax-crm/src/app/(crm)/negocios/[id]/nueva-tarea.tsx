'use client';

import { useActionState, useState } from 'react';
import { Plus } from 'lucide-react';
import { crearTarea } from '@/acciones/seguimiento';
import { BotonEnviar, useAvisoDeResultado } from '@/components/cliente';
import { Campo } from '@/components/ui';
import { hoy, sumarDias } from '@/lib/fechas';
import type { Socio, TipoSimple } from '@/lib/tipos';

export function NuevaTarea({ negocioId, responsableId, socios, tiposTarea }: { negocioId: string; responsableId: string; socios: Socio[]; tiposTarea: TipoSimple[] }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto)
    return (
      <button className="btn btn-sm" onClick={() => setAbierto(true)}>
        <Plus className="size-3.5" /> Nueva tarea
      </button>
    );
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Nueva tarea" onClick={() => setAbierto(false)}>
      <div className="caja w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="titulo mb-4 text-[20px]">Nueva tarea</h3>
        <FormTarea negocioId={negocioId} responsableId={responsableId} socios={socios} tiposTarea={tiposTarea} alTerminar={() => setAbierto(false)} />
      </div>
    </div>
  );
}

function FormTarea({ negocioId, responsableId, socios, tiposTarea, alTerminar }: { negocioId: string; responsableId: string; socios: Socio[]; tiposTarea: TipoSimple[]; alTerminar: () => void }) {
  const [resultado, accion] = useActionState(crearTarea, null);
  const [tipo, setTipo] = useState(tiposTarea[0]?.codigo ?? 'otra');
  const [descripcion, setDescripcion] = useState(tiposTarea[0]?.nombre ?? '');
  const [fecha, setFecha] = useState(sumarDias(hoy(), 1));
  useAvisoDeResultado(resultado, alTerminar);
  const err = resultado && !resultado.ok ? resultado.campos ?? {} : {};
  const h = hoy();
  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="negocio_id" value={negocioId} />
      <input type="hidden" name="tipo" value={tipo} />
      <div className="flex flex-wrap gap-1.5">
        {tiposTarea.map((t) => (
          <button
            key={t.codigo}
            type="button"
            className="chip"
            aria-pressed={tipo === t.codigo}
            onClick={() => {
              if (!descripcion || tiposTarea.some((x) => x.nombre === descripcion)) setDescripcion(t.nombre);
              setTipo(t.codigo);
            }}
          >
            {t.nombre}
          </button>
        ))}
      </div>
      <Campo etiqueta="Descripción *" error={err.descripcion}>
        <input className="input" name="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required maxLength={300} />
      </Campo>
      <div className="flex flex-wrap gap-1.5">
        {[
          ['Hoy', h],
          ['Mañana', sumarDias(h, 1)],
          ['+3 días', sumarDias(h, 3)],
          ['+1 semana', sumarDias(h, 7)],
          ['Sin fecha', ''],
        ].map(([txt, v]) => (
          <button key={txt} type="button" className="chip" aria-pressed={fecha === v} onClick={() => setFecha(v)}>
            {txt}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Campo etiqueta="Fecha" error={err.vence_fecha}>
          <input className="input" type="date" name="vence_fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Campo>
        <Campo etiqueta="Hora">
          <input className="input" type="time" name="vence_hora" disabled={!fecha} />
        </Campo>
        <Campo etiqueta="Responsable">
          <select className="input" name="responsable_id" defaultValue={responsableId}>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <Campo etiqueta="Notas">
        <textarea className="input" name="notas" rows={2} maxLength={2000} />
      </Campo>
      <div className="flex gap-2">
        <BotonEnviar>Crear tarea</BotonEnviar>
        <button type="button" className="btn btn-fantasma" onClick={alTerminar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
