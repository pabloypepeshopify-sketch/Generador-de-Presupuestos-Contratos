'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { buscarDuplicados, crearNegocio, type Duplicado } from '@/acciones/negocios';
import { BotonEnviar } from '@/components/cliente';
import { Avatar, Campo, conColor } from '@/components/ui';
import { hoy, sumarDias } from '@/lib/fechas';
import type { Servicio, Socio, TipoSimple } from '@/lib/tipos';

const SECTORES_HABITUALES = ['Restaurante', 'Bar', 'Cafetería', 'Inmobiliaria', 'Tienda', 'Clínica', 'Peluquería', 'Gimnasio', 'Hotel', 'Taller', 'Asesoría', 'Academia'];
const MOTIVO = { nombre: 'nombre parecido', telefono: 'mismo teléfono', direccion: 'dirección parecida' };

export function FormularioAlta({
  yo,
  socios,
  servicios,
  tiposTarea,
  sectores,
  localidades,
}: {
  yo: Socio;
  socios: Socio[];
  servicios: Servicio[];
  tiposTarea: TipoSimple[];
  sectores: string[];
  localidades: string[];
}) {
  const [resultado, accion] = useActionState(crearNegocio, null);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [responsable, setResponsable] = useState(yo.id);
  const [tareaTipo, setTareaTipo] = useState('');
  const [tareaFecha, setTareaFecha] = useState(sumarDias(hoy(), 1));
  const [duplicados, setDuplicados] = useState<Duplicado[]>([]);
  const err = resultado && !resultado.ok ? resultado.campos ?? {} : {};

  // Aviso de posibles duplicados mientras se escribe (no impide crear el negocio)
  useEffect(() => {
    if (nombre.trim().length < 3 && telefono.replace(/\D/g, '').length < 9) {
      setDuplicados([]);
      return;
    }
    const t = setTimeout(() => {
      buscarDuplicados({ nombre, telefono, direccion: [direccion, localidad].filter(Boolean).join(' ') })
        .then(setDuplicados)
        .catch(() => setDuplicados([]));
    }, 350);
    return () => clearTimeout(t);
  }, [nombre, telefono, direccion, localidad]);

  const h = hoy();
  return (
    <form action={accion} className="flex flex-col gap-5">
      <div className="caja flex flex-col gap-4 p-5">
        <Campo etiqueta="Nombre del negocio *" error={err.nombre}>
          <input className="input text-[15px]" name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={160} autoFocus autoComplete="off" aria-invalid={!!err.nombre} placeholder="Ej.: Inmobiliaria Costa Sur" />
        </Campo>

        {duplicados.length > 0 && (
          <div role="status" className="rounded-lg border border-aviso/40 bg-aviso/[0.07] p-3 text-[13px]">
            <p className="mb-1.5 flex items-center gap-1.5 font-medium text-aviso">
              <TriangleAlert className="size-4" /> ¿Ya lo tenéis? Hay negocios parecidos:
            </p>
            <ul className="flex flex-col gap-1">
              {duplicados.map((d) => (
                <li key={d.id}>
                  <Link href={`/negocios/${d.id}`} target="_blank" className="text-texto hover:underline">
                    {d.nombre}
                  </Link>
                  <span className="text-suave">
                    {d.localidad ? ` · ${d.localidad}` : ''} · {MOTIVO[d.motivo]}
                    {d.responsable_id ? ` · lo lleva ${socios.find((s) => s.id === d.responsable_id)?.nombre ?? '—'}` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-tenue">Si es otro negocio distinto, puedes crearlo igualmente.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Sector" error={err.sector}>
            <input className="input" name="sector" list="sectores" maxLength={80} placeholder="Restaurante, inmobiliaria…" />
            <datalist id="sectores">
              {[...new Set([...sectores, ...SECTORES_HABITUALES])].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Campo>
          <Campo etiqueta="Localidad" error={err.localidad}>
            <input className="input" name="localidad" list="localidades" value={localidad} onChange={(e) => setLocalidad(e.target.value)} maxLength={80} />
            <datalist id="localidades">
              {localidades.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Campo>
          <Campo etiqueta="Dirección" error={err.direccion}>
            <input className="input" name="direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={200} placeholder="Calle y número" />
          </Campo>
          <Campo etiqueta="Teléfono" error={err.telefono}>
            <input className="input" name="telefono" type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={40} aria-invalid={!!err.telefono} />
          </Campo>
          <Campo etiqueta="Persona de contacto" error={err.contacto_nombre}>
            <input className="input" name="contacto_nombre" maxLength={120} placeholder="Dueño o encargado" />
          </Campo>
          <Campo etiqueta="Cargo" error={err.contacto_cargo}>
            <input className="input" name="contacto_cargo" maxLength={80} placeholder="Propietario, encargada…" />
          </Campo>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[12.5px] font-medium text-suave">Servicios que podrían interesarle</legend>
          <div className="flex flex-wrap gap-2">
            {servicios.map((s) => {
              const on = elegidos.includes(s.codigo);
              return (
                <button key={s.codigo} type="button" className="chip" aria-pressed={on} onClick={() => setElegidos((l) => (on ? l.filter((x) => x !== s.codigo) : [...l, s.codigo]))}>
                  {s.nombre}
                </button>
              );
            })}
          </div>
          {elegidos.map((c) => (
            <input key={c} type="hidden" name="servicios" value={c} />
          ))}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[12.5px] font-medium text-suave">Responsable</legend>
          <div className="flex flex-wrap gap-2">
            {socios.map((s) => (
              <button key={s.id} type="button" className="chip" style={conColor(s.color)} aria-pressed={responsable === s.id} onClick={() => setResponsable(s.id)}>
                <Avatar socio={s} tam={18} /> {s.nombre}
                {s.id === yo.id ? ' (yo)' : ''}
              </button>
            ))}
          </div>
          <input type="hidden" name="responsable_id" value={responsable} />
        </fieldset>

        <Campo etiqueta="Nota inicial" error={err.nota}>
          <textarea className="input" name="nota" maxLength={2000} rows={2} placeholder="Qué sabemos del negocio, cómo lo hemos conocido…" />
        </Campo>
      </div>

      <div className="caja flex flex-col gap-3 p-5">
        <p className="text-[13.5px] font-semibold">
          Próximo paso <span className="font-normal text-tenue">(opcional)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {tiposTarea.map((t) => (
            <button key={t.codigo} type="button" className="chip" aria-pressed={tareaTipo === t.codigo} onClick={() => setTareaTipo(tareaTipo === t.codigo ? '' : t.codigo)}>
              {t.nombre}
            </button>
          ))}
        </div>
        <input type="hidden" name="tarea_tipo" value={tareaTipo} />
        {tareaTipo && (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Campo etiqueta="Descripción" error={err.tarea_descripcion}>
              <input className="input" name="tarea_descripcion" maxLength={300} placeholder={tiposTarea.find((t) => t.codigo === tareaTipo)?.nombre} />
            </Campo>
            <Campo etiqueta="Fecha">
              <input className="input" type="date" name="tarea_fecha" value={tareaFecha} min={h} onChange={(e) => setTareaFecha(e.target.value)} />
            </Campo>
            <Campo etiqueta="Hora">
              <input className="input" type="time" name="tarea_hora" />
            </Campo>
          </div>
        )}
      </div>

      {resultado && !resultado.ok && (
        <p role="alert" className="rounded-lg border border-peligro/40 bg-peligro/10 px-3 py-2 text-[13px] text-[#ffb4b2]">
          {resultado.error}
        </p>
      )}

      <div className="sticky bottom-20 z-10 flex flex-wrap gap-2 rounded-xl border border-borde bg-fondo/90 p-2 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <BotonEnviar className="btn btn-primario btn-lg flex-1 sm:flex-none" pendiente="Creando…">
          Crear negocio
        </BotonEnviar>
        <BotonEnviar className="btn btn-lg flex-1 sm:flex-none" name="despues" value="visita" pendiente="Creando…">
          Crear y registrar visita
        </BotonEnviar>
        <BotonEnviar className="btn btn-lg hidden sm:inline-flex" name="despues" value="llamada" pendiente="Creando…">
          Crear y registrar llamada
        </BotonEnviar>
      </div>
    </form>
  );
}
