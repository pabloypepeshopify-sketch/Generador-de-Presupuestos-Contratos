'use client';

import { useActionState, useState } from 'react';
import { Pencil } from 'lucide-react';
import { actualizarNegocio } from '@/acciones/negocios';
import { BotonEnviar, useAvisoDeResultado } from '@/components/cliente';
import { Campo, Dato, Seccion } from '@/components/ui';
import { POTENCIALES, telHref } from '@/lib/textos';
import type { Negocio, Socio } from '@/lib/tipos';

const euros = (n: number | null) => (n == null ? null : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n));
const enlaceWeb = (w: string) => (/^https?:\/\//i.test(w) ? w : `https://${w}`);

export function DatosNegocio({ negocio: x, socios }: { negocio: Negocio; socios: Socio[] }) {
  const [editando, setEditando] = useState(false);
  const [resultado, accion] = useActionState(actualizarNegocio, null);
  useAvisoDeResultado(resultado, () => setEditando(false));
  const err = resultado && !resultado.ok ? resultado.campos ?? {} : {};

  if (!editando) {
    return (
      <>
        <Seccion
          titulo="Datos del negocio"
          accion={
            <button className="btn btn-fantasma btn-sm" onClick={() => setEditando(true)}>
              <Pencil className="size-3.5" /> Editar
            </button>
          }
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13.5px]">
            <Dato etiqueta="Nombre legal">{x.razon_social}</Dato>
            <Dato etiqueta="Sector">{x.sector}</Dato>
            <div className="col-span-2">
              <Dato etiqueta="Dirección">{[x.direccion, x.localidad].filter(Boolean).join(', ')}</Dato>
            </div>
            <Dato etiqueta="Teléfono">
              {x.telefono && (
                <a href={telHref(x.telefono)} className="text-cian hover:underline">
                  {x.telefono}
                </a>
              )}
            </Dato>
            <Dato etiqueta="Correo">
              {x.email && (
                <a href={`mailto:${x.email}`} className="text-cian hover:underline">
                  {x.email}
                </a>
              )}
            </Dato>
            <Dato etiqueta="Web">
              {x.web && (
                <a href={enlaceWeb(x.web)} target="_blank" rel="noopener noreferrer" className="text-cian hover:underline">
                  {x.web}
                </a>
              )}
            </Dato>
            <Dato etiqueta="Redes sociales">{x.redes}</Dato>
            {x.notas && (
              <div className="col-span-2">
                <Dato etiqueta="Notas">
                  <span className="whitespace-pre-wrap">{x.notas}</span>
                </Dato>
              </div>
            )}
          </dl>
        </Seccion>
        <Seccion
          titulo="Información comercial"
          accion={
            <button className="btn btn-fantasma btn-sm" onClick={() => setEditando(true)}>
              <Pencil className="size-3.5" /> Editar
            </button>
          }
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13.5px]">
            <Dato etiqueta="Potencial">{POTENCIALES.find((p) => p.v === x.potencial)?.txt}</Dato>
            <Dato etiqueta="Presupuesto estimado">{euros(x.presupuesto_estimado)}</Dato>
            <div className="col-span-2">
              <Dato etiqueta="Necesidades detectadas">
                <span className="whitespace-pre-wrap">{x.necesidades}</span>
              </Dato>
            </div>
            <div className="col-span-2">
              <Dato etiqueta="Problemas que nos ha contado">
                <span className="whitespace-pre-wrap">{x.problemas}</span>
              </Dato>
            </div>
            <div className="col-span-2">
              <Dato etiqueta="Objeciones">
                <span className="whitespace-pre-wrap">{x.objeciones}</span>
              </Dato>
            </div>
            <div className="col-span-2">
              <Dato etiqueta="Cuándo encontrar al responsable">{x.horario_contacto}</Dato>
            </div>
          </dl>
        </Seccion>
      </>
    );
  }

  return (
    <Seccion titulo="Editar datos">
      <form action={accion} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={x.id} />
        <Campo etiqueta="Nombre comercial *" error={err.nombre}>
          <input className="input" name="nombre" defaultValue={x.nombre} required maxLength={160} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Nombre legal" error={err.razon_social}>
            <input className="input" name="razon_social" defaultValue={x.razon_social ?? ''} maxLength={160} />
          </Campo>
          <Campo etiqueta="Sector" error={err.sector}>
            <input className="input" name="sector" defaultValue={x.sector ?? ''} maxLength={80} />
          </Campo>
          <Campo etiqueta="Dirección" error={err.direccion}>
            <input className="input" name="direccion" defaultValue={x.direccion ?? ''} maxLength={200} />
          </Campo>
          <Campo etiqueta="Localidad" error={err.localidad}>
            <input className="input" name="localidad" defaultValue={x.localidad ?? ''} maxLength={80} />
          </Campo>
          <Campo etiqueta="Teléfono" error={err.telefono}>
            <input className="input" name="telefono" type="tel" defaultValue={x.telefono ?? ''} maxLength={40} />
          </Campo>
          <Campo etiqueta="Correo" error={err.email}>
            <input className="input" name="email" type="email" defaultValue={x.email ?? ''} maxLength={160} />
          </Campo>
          <Campo etiqueta="Web" error={err.web}>
            <input className="input" name="web" defaultValue={x.web ?? ''} maxLength={200} />
          </Campo>
          <Campo etiqueta="Redes sociales" error={err.redes}>
            <input className="input" name="redes" defaultValue={x.redes ?? ''} maxLength={300} placeholder="@usuario, enlaces…" />
          </Campo>
          <Campo etiqueta="Responsable">
            <select className="input" name="responsable_id" defaultValue={x.responsable_id ?? ''}>
              <option value="">Sin responsable</option>
              {socios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Potencial">
            <select className="input" name="potencial" defaultValue={x.potencial ?? ''}>
              <option value="">Sin valorar</option>
              {POTENCIALES.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.txt}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Presupuesto estimado (€)" error={err.presupuesto_estimado}>
            <input className="input" name="presupuesto_estimado" inputMode="decimal" defaultValue={x.presupuesto_estimado ?? ''} />
          </Campo>
          <Campo etiqueta="Cuándo encontrar al responsable" error={err.horario_contacto}>
            <input className="input" name="horario_contacto" defaultValue={x.horario_contacto ?? ''} maxLength={200} placeholder="Tardes a partir de las 17:30" />
          </Campo>
        </div>
        <Campo etiqueta="Necesidades detectadas" error={err.necesidades}>
          <textarea className="input" name="necesidades" defaultValue={x.necesidades ?? ''} rows={2} />
        </Campo>
        <Campo etiqueta="Problemas que nos ha contado" error={err.problemas}>
          <textarea className="input" name="problemas" defaultValue={x.problemas ?? ''} rows={2} />
        </Campo>
        <Campo etiqueta="Objeciones" error={err.objeciones}>
          <textarea className="input" name="objeciones" defaultValue={x.objeciones ?? ''} rows={2} />
        </Campo>
        <Campo etiqueta="Notas generales" error={err.notas}>
          <textarea className="input" name="notas" defaultValue={x.notas ?? ''} rows={3} />
        </Campo>
        <div className="flex gap-2">
          <BotonEnviar>Guardar</BotonEnviar>
          <button type="button" className="btn btn-fantasma" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        </div>
      </form>
    </Seccion>
  );
}
