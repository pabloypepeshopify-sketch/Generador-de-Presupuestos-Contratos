'use client';

import { useActionState, useState } from 'react';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { borrarContacto, guardarContacto } from '@/acciones/negocios';
import { BotonEnviar, useAccion, useAvisoDeResultado } from '@/components/cliente';
import { Campo, Seccion } from '@/components/ui';
import { telHref } from '@/lib/textos';
import type { Contacto } from '@/lib/tipos';

export function EditorContactos({ negocioId, contactos }: { negocioId: string; contactos: Contacto[] }) {
  const [editando, setEditando] = useState<string | null>(null); // id o 'nuevo'
  const { ejecutar, pendiente } = useAccion();
  return (
    <Seccion
      titulo="Personas de contacto"
      accion={
        editando !== 'nuevo' && (
          <button className="btn btn-fantasma btn-sm" onClick={() => setEditando('nuevo')}>
            <Plus className="size-3.5" /> Añadir
          </button>
        )
      }
    >
      <ul className="flex flex-col gap-3">
        {contactos.map((c) =>
          editando === c.id ? (
            <li key={c.id}>
              <FormContacto negocioId={negocioId} contacto={c} alTerminar={() => setEditando(null)} />
            </li>
          ) : (
            <li key={c.id} className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-medium">
                  {c.nombre}
                  {c.es_principal && <Star className="size-3.5 fill-aviso text-aviso" aria-label="Contacto principal" />}
                </p>
                {c.cargo && <p className="text-[13px] text-suave">{c.cargo}</p>}
                <p className="flex flex-wrap gap-x-3 text-[13px]">
                  {c.telefono && (
                    <a href={telHref(c.telefono)} className="text-cian hover:underline">
                      {c.telefono}
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="text-cian hover:underline">
                      {c.email}
                    </a>
                  )}
                </p>
              </div>
              <button className="btn btn-fantasma btn-sm px-1.5" aria-label={`Editar ${c.nombre}`} onClick={() => setEditando(c.id)}>
                <Pencil className="size-3.5" />
              </button>
              <button
                className="btn btn-fantasma btn-sm px-1.5 text-tenue"
                aria-label={`Eliminar ${c.nombre}`}
                disabled={pendiente}
                onClick={() => ejecutar(() => borrarContacto(c.id), { confirmar: `¿Eliminar a ${c.nombre} de los contactos?` })}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ),
        )}
        {editando === 'nuevo' && (
          <li>
            <FormContacto negocioId={negocioId} esPrimero={contactos.length === 0} alTerminar={() => setEditando(null)} />
          </li>
        )}
        {contactos.length === 0 && editando !== 'nuevo' && <li className="text-suave">Todavía no sabemos quién es el dueño o encargado.</li>}
      </ul>
    </Seccion>
  );
}

function FormContacto({ negocioId, contacto, esPrimero = false, alTerminar }: { negocioId: string; contacto?: Contacto; esPrimero?: boolean; alTerminar: () => void }) {
  const [resultado, accion] = useActionState(guardarContacto, null);
  useAvisoDeResultado(resultado, alTerminar);
  const err = resultado && !resultado.ok ? resultado.campos ?? {} : {};
  return (
    <form action={accion} className="flex flex-col gap-2.5 rounded-lg border border-borde bg-panel-2/50 p-3">
      <input type="hidden" name="negocio_id" value={negocioId} />
      {contacto && <input type="hidden" name="id" value={contacto.id} />}
      <div className="grid grid-cols-2 gap-2.5">
        <Campo etiqueta="Nombre *" error={err.nombre}>
          <input className="input" name="nombre" defaultValue={contacto?.nombre} required maxLength={120} autoFocus />
        </Campo>
        <Campo etiqueta="Cargo" error={err.cargo}>
          <input className="input" name="cargo" defaultValue={contacto?.cargo ?? ''} maxLength={80} placeholder="Propietario, encargado…" />
        </Campo>
        <Campo etiqueta="Teléfono" error={err.telefono}>
          <input className="input" name="telefono" type="tel" defaultValue={contacto?.telefono ?? ''} maxLength={40} />
        </Campo>
        <Campo etiqueta="Correo" error={err.email}>
          <input className="input" name="email" type="email" defaultValue={contacto?.email ?? ''} maxLength={160} />
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" name="es_principal" defaultChecked={contacto?.es_principal ?? esPrimero} className="accent-[#7c5cff]" />
        Contacto principal (aparece en la tabla)
      </label>
      <div className="flex gap-2">
        <BotonEnviar className="btn btn-primario btn-sm">Guardar</BotonEnviar>
        <button type="button" className="btn btn-fantasma btn-sm" onClick={alTerminar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
