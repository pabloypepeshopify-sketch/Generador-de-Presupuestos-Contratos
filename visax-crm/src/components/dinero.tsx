'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Ban, Check, Ellipsis, FileText, Loader2, Paperclip, Pencil, Plus, Trash2, Undo2, Upload } from 'lucide-react';
import {
  anularCobro, borrarCobro, borrarContrato, borrarFactura, borrarGasto, deshacerCobro, guardarCobro, guardarContrato, guardarFactura, guardarGasto,
  marcarCobrado, prepararSubida,
} from '@/acciones/dinero';
import { BotonEnviar, useAccion, useAviso, useAvisoDeResultado } from '@/components/cliente';
import { Campo, conColor } from '@/components/ui';
import { entorno } from '@/lib/entorno';
import { diaRelativo, fechaCorta, hoy } from '@/lib/fechas';
import {
  CATEGORIAS_GASTO, ESTADO_COBRO, IRPF_DEFECTO, IRPF_OPCIONES, IVA_DEFECTO, IVA_OPCIONES, MAX_ARCHIVO, METODOS_COBRO, PERIODICIDADES,
  calcularImporte, estadoVisible, euros, leerImporte, metodoDe, periodicidadDe,
} from '@/lib/dinero';
import type { Cobro, Contrato, Factura, Gasto, NegocioRef, Servicio } from '@/lib/tipos';

// ---------- Piezas comunes ----------
function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={titulo} onClick={onCerrar}>
      <div className="caja max-h-[92vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="titulo mb-4 text-[20px]">{titulo}</h3>
        {children}
      </div>
    </div>
  );
}

const textoImporte = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','));

/** Base, IVA e IRPF con el desglose de lo que se cobra al final */
function CamposImporte({ base, iva, irpf, onBase, onIva, onIrpf, conIrpf = true, error }: {
  base: string; iva: number; irpf: number; onBase: (v: string) => void; onIva: (v: number) => void; onIrpf: (v: number) => void; conIrpf?: boolean; error?: string;
}) {
  const b = leerImporte(base);
  const c = b && b > 0 ? calcularImporte(b, iva, conIrpf ? irpf : 0) : null;
  return (
    <div className="flex flex-col gap-2">
      <div className={`grid gap-3 ${conIrpf ? 'grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]' : 'grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'}`}>
        <Campo etiqueta="Importe sin IVA *" error={error}>
          <input className="input" name="importe_base" inputMode="decimal" value={base} onChange={(e) => onBase(e.target.value)} placeholder="0,00" required autoComplete="off" />
        </Campo>
        <Campo etiqueta="IVA">
          <select className="input" name="iva_pct" value={iva} onChange={(e) => onIva(Number(e.target.value))}>
            {IVA_OPCIONES.map((v) => (
              <option key={v} value={v}>
                {v} %
              </option>
            ))}
          </select>
        </Campo>
        {conIrpf && (
          <Campo etiqueta="IRPF">
            <select className="input" name="irpf_pct" value={irpf} onChange={(e) => onIrpf(Number(e.target.value))}>
              {IRPF_OPCIONES.map((v) => (
                <option key={v} value={v}>
                  {v === 0 ? '0 % (particular)' : `${v} %`}
                </option>
              ))}
            </select>
          </Campo>
        )}
      </div>
      {c && (
        <p className="rounded-md bg-white/[0.04] px-3 py-2 text-[12.5px] text-suave">
          {euros(c.base)} + IVA {euros(c.iva)}
          {conIrpf && c.irpf > 0 ? ` − IRPF ${euros(c.irpf)}` : ''} = <b className="text-texto">{euros(c.total)}</b> {conIrpf ? 'a cobrar' : 'en total'}
        </p>
      )}
    </div>
  );
}

function SelectorNegocio({ negocios, valor, onCambio, opcional = false, error }: { negocios: NegocioRef[]; valor: string; onCambio: (v: string) => void; opcional?: boolean; error?: string }) {
  const clientes = negocios.filter((n) => n.estado === 'cliente_ganado');
  const otros = negocios.filter((n) => n.estado !== 'cliente_ganado');
  return (
    <Campo etiqueta={opcional ? 'Cliente' : 'Cliente *'} error={error} ayuda={opcional ? 'Déjalo en «General» si no es de un cliente concreto' : undefined}>
      <select className="input" name="negocio_id" value={valor} onChange={(e) => onCambio(e.target.value)} required={!opcional}>
        <option value="">{opcional ? 'General (sin cliente)' : 'Elige el cliente'}</option>
        {clientes.length > 0 && (
          <optgroup label="Clientes">
            {clientes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
          </optgroup>
        )}
        {otros.length > 0 && (
          <optgroup label="Otros negocios">
            {otros.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </Campo>
  );
}

let almacen: ReturnType<typeof createClient> | null = null;
/** Cliente del almacén solo para subir con el permiso de un solo uso que da el servidor (no lleva sesión) */
function clienteAlmacen() {
  if (!almacen) {
    const { url, clave } = entorno();
    almacen = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return almacen;
}

const tipoArchivo = (f: File) => f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : '');

async function subirArchivo(archivo: File, destino: { tipo: 'factura'; negocioId: string } | { tipo: 'gasto' }) {
  const mime = tipoArchivo(archivo);
  const prep = await prepararSubida({ ...destino, nombre: archivo.name, tamano: archivo.size, mime });
  if (!prep.ok || !prep.datos) return { error: prep.ok ? 'No se ha podido preparar la subida' : prep.error };
  const { error } = await clienteAlmacen().storage.from('documentos').uploadToSignedUrl(prep.datos.path, prep.datos.token, archivo, { contentType: mime });
  if (error) return { error: 'No se ha podido subir el archivo. Revisa la conexión e inténtalo otra vez.' };
  return { path: prep.datos.path };
}

// ---------- Servicios contratados ----------
export function BotonContrato({ negocioId, servicios, contrato }: { negocioId: string; servicios: Servicio[]; contrato?: Contrato }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      {contrato ? (
        <button className="btn btn-fantasma btn-sm px-2" onClick={() => setAbierto(true)} aria-label={`Editar ${contrato.concepto}`} title="Editar">
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <button className="btn btn-sm" onClick={() => setAbierto(true)}>
          <Plus className="size-3.5" /> Servicio contratado
        </button>
      )}
      {abierto && (
        <Modal titulo={contrato ? 'Editar servicio contratado' : 'Nuevo servicio contratado'} onCerrar={() => setAbierto(false)}>
          <FormContrato negocioId={negocioId} servicios={servicios} contrato={contrato} alTerminar={() => setAbierto(false)} />
        </Modal>
      )}
    </>
  );
}

function FormContrato({ negocioId, servicios, contrato, alTerminar }: { negocioId: string; servicios: Servicio[]; contrato?: Contrato; alTerminar: () => void }) {
  const [resultado, accion] = useActionState(guardarContrato, null);
  useAvisoDeResultado(resultado, alTerminar);
  const err = resultado && !resultado.ok ? resultado.campos ?? {} : {};
  const [periodicidad, setPeriodicidad] = useState<string>(contrato?.periodicidad ?? 'mensual');
  const [servicio, setServicio] = useState(contrato?.servicio ?? '');
  const [concepto, setConcepto] = useState(contrato?.concepto ?? '');
  const [base, setBase] = useState(textoImporte(contrato?.importe_base));
  const [iva, setIva] = useState(Number(contrato?.iva_pct ?? IVA_DEFECTO));
  const [irpf, setIrpf] = useState(Number(contrato?.irpf_pct ?? IRPF_DEFECTO));
  const unico = periodicidad === 'unico';
  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={contrato?.id ?? ''} />
      <input type="hidden" name="negocio_id" value={negocioId} />
      <input type="hidden" name="periodicidad" value={periodicidad} />
      <input type="hidden" name="servicio" value={servicio} />
      <div>
        <span className="mb-1.5 block text-[12.5px] font-medium text-suave">Servicio</span>
        <div className="flex flex-wrap gap-1.5">
          {servicios
            .filter((s) => !['varios', 'por_identificar'].includes(s.codigo))
            .map((s) => (
              <button
                key={s.codigo}
                type="button"
                className="chip"
                aria-pressed={servicio === s.codigo}
                onClick={() => {
                  const nuevo = servicio === s.codigo ? '' : s.codigo;
                  if (!concepto || servicios.some((x) => x.nombre === concepto)) setConcepto(nuevo ? s.nombre : '');
                  setServicio(nuevo);
                }}
              >
                {s.nombre}
              </button>
            ))}
        </div>
      </div>
      <Campo etiqueta="Concepto *" error={err.concepto} ayuda="Así aparecerá en cada cobro, p. ej. «Mantenimiento web»">
        <input className="input" name="concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} required maxLength={160} />
      </Campo>
      <div>
        <span className="mb-1.5 block text-[12.5px] font-medium text-suave">¿Cómo se paga? *</span>
        <div className="flex flex-wrap gap-1.5">
          {PERIODICIDADES.map((p) => (
            <button key={p.v} type="button" className="chip" aria-pressed={periodicidad === p.v} onClick={() => setPeriodicidad(p.v)}>
              {p.txt}
            </button>
          ))}
        </div>
      </div>
      <CamposImporte base={base} iva={iva} irpf={irpf} onBase={setBase} onIva={setIva} onIrpf={setIrpf} error={err.importe_base} />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta={unico ? 'Fecha del cobro *' : 'Primera cuota *'} error={err.fecha_inicio}>
          <input className="input" type="date" name="fecha_inicio" defaultValue={contrato?.fecha_inicio ?? hoy()} required />
        </Campo>
        {!unico && (
          <Campo etiqueta="Hasta" error={err.fecha_fin} ayuda="Vacío = sin fecha de fin">
            <input className="input" type="date" name="fecha_fin" defaultValue={contrato?.fecha_fin ?? ''} />
          </Campo>
        )}
      </div>
      {!unico && <p className="text-[12.5px] text-tenue">Las cuotas aparecen solas en Cobros cada {periodicidadDe(periodicidad).sufijo.slice(1)}, desde la primera cuota.</p>}
      <Campo etiqueta="Notas">
        <textarea className="input" name="notas" rows={2} maxLength={1000} defaultValue={contrato?.notas ?? ''} />
      </Campo>
      {contrato && <p className="text-[12.5px] text-aviso">Las cuotas pendientes se rehacen con los datos nuevos. Lo cobrado, lo anulado y lo ya facturado no cambia.</p>}
      <div className="flex gap-2">
        <BotonEnviar>{contrato ? 'Guardar cambios' : 'Añadir servicio'}</BotonEnviar>
        <button type="button" className="btn btn-fantasma" onClick={alTerminar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function QuitarContrato({ contrato }: { contrato: Contrato }) {
  const { ejecutar, pendiente } = useAccion();
  return (
    <button
      className="btn btn-fantasma btn-sm px-2 text-tenue hover:text-peligro"
      disabled={pendiente}
      aria-label={`Quitar ${contrato.concepto}`}
      title="Quitar"
      onClick={() =>
        ejecutar(() => borrarContrato(contrato.id), {
          confirmar: `¿Quitar «${contrato.concepto}»? Se quitan sus cuotas pendientes. Lo ya cobrado y las facturas se conservan.\n\nSi el cliente deja de pagar a partir de una fecha, mejor edítalo y pon la fecha «Hasta».`,
        })
      }
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

// ---------- Cobros ----------
export function BotonCobro({ negocioId, negocios }: { negocioId?: string; negocios?: NegocioRef[] }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button className="btn btn-sm" onClick={() => setAbierto(true)}>
        <Plus className="size-3.5" /> Cobro suelto
      </button>
      {abierto && (
        <Modal titulo="Nuevo cobro" onCerrar={() => setAbierto(false)}>
          <FormCobro negocioId={negocioId} negocios={negocios} alTerminar={() => setAbierto(false)} />
        </Modal>
      )}
    </>
  );
}

function FormCobro({ negocioId, negocios, cobro, alTerminar }: { negocioId?: string; negocios?: NegocioRef[]; cobro?: Cobro; alTerminar: () => void }) {
  const [resultado, accion] = useActionState(guardarCobro, null);
  useAvisoDeResultado(resultado, alTerminar);
  const err = resultado && !resultado.ok ? resultado.campos ?? {} : {};
  const [negocio, setNegocio] = useState(cobro?.negocio_id ?? negocioId ?? '');
  const [base, setBase] = useState(textoImporte(cobro?.importe_base));
  const [iva, setIva] = useState(Number(cobro?.iva_pct ?? IVA_DEFECTO));
  const [irpf, setIrpf] = useState(Number(cobro?.irpf_pct ?? IRPF_DEFECTO));
  const [yaCobrado, setYaCobrado] = useState(false);
  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={cobro?.id ?? ''} />
      {cobro || negocioId ? <input type="hidden" name="negocio_id" value={negocio} /> : <SelectorNegocio negocios={negocios ?? []} valor={negocio} onCambio={setNegocio} error={err.negocio_id} />}
      <Campo etiqueta="Concepto *" error={err.concepto}>
        <input className="input" name="concepto" defaultValue={cobro?.concepto ?? ''} required maxLength={200} placeholder="Ej.: Diseño de logotipo" />
      </Campo>
      <CamposImporte base={base} iva={iva} irpf={irpf} onBase={setBase} onIva={setIva} onIrpf={setIrpf} error={err.importe_base} />
      <Campo etiqueta="Fecha prevista *" error={err.fecha_prevista}>
        <input className="input" type="date" name="fecha_prevista" defaultValue={cobro?.fecha_prevista ?? hoy()} required />
      </Campo>
      {!cobro && (
        <>
          <label className="flex items-center gap-2 text-[13.5px]">
            <input type="checkbox" name="ya_cobrado" checked={yaCobrado} onChange={(e) => setYaCobrado(e.target.checked)} className="accent-[#7c5cff]" /> Ya está cobrado
          </label>
          {yaCobrado && (
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Cobrado el *" error={err.fecha_cobro}>
                <input className="input" type="date" name="fecha_cobro" defaultValue={hoy()} required />
              </Campo>
              <Campo etiqueta="Cómo">
                <select className="input" name="metodo" defaultValue="transferencia">
                  {METODOS_COBRO.map((m) => (
                    <option key={m.v} value={m.v}>
                      {m.txt}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          )}
        </>
      )}
      <Campo etiqueta="Notas">
        <textarea className="input" name="notas" rows={2} maxLength={1000} defaultValue={cobro?.notas ?? ''} />
      </Campo>
      <div className="flex gap-2">
        <BotonEnviar>{cobro ? 'Guardar cambios' : 'Añadir cobro'}</BotonEnviar>
        <button type="button" className="btn btn-fantasma" onClick={alTerminar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function FormMarcarCobrado({ cobro, alTerminar }: { cobro: Cobro; alTerminar: () => void }) {
  const [resultado, accion] = useActionState(marcarCobrado, null);
  useAvisoDeResultado(resultado, alTerminar);
  const err = resultado && !resultado.ok ? resultado.campos ?? {} : {};
  return (
    <form action={accion} className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-ok/30 bg-ok/[0.05] p-3">
      <input type="hidden" name="id" value={cobro.id} />
      <Campo etiqueta="Cobrado el" error={err.fecha_cobro}>
        <input className="input" type="date" name="fecha_cobro" defaultValue={hoy()} required />
      </Campo>
      <Campo etiqueta="Cómo">
        <select className="input" name="metodo" defaultValue="transferencia">
          {METODOS_COBRO.map((m) => (
            <option key={m.v} value={m.v}>
              {m.txt}
            </option>
          ))}
        </select>
      </Campo>
      <BotonEnviar className="btn btn-primario">
        <Check className="size-4" /> Apuntar cobro
      </BotonEnviar>
      <button type="button" className="btn btn-fantasma" onClick={alTerminar}>
        Cancelar
      </button>
    </form>
  );
}

export function FilaCobro({ cobro, negocio, facturas = [] }: { cobro: Cobro; negocio?: NegocioRef; facturas?: Factura[] }) {
  const [marcando, setMarcando] = useState(false);
  const [modal, setModal] = useState<'factura' | 'editar' | null>(null);
  const { ejecutar, pendiente } = useAccion();
  const ev = estadoVisible(cobro);
  const e = ESTADO_COBRO[ev];
  const abierto = cobro.estado === 'pendiente';
  return (
    <li className={`rounded-lg border p-3 ${ev === 'atrasado' ? 'border-peligro/35 bg-peligro/[0.04]' : 'border-borde bg-white/[0.015]'} ${cobro.estado === 'anulado' ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{cobro.concepto}</p>
          <p className="mt-0.5 text-[12.5px] text-suave">
            {negocio && (
              <>
                <Link href={`/negocios/${negocio.id}`} className="font-medium text-texto hover:underline">
                  {negocio.nombre}
                </Link>
                {' · '}
              </>
            )}
            {cobro.estado === 'cobrado' && cobro.fecha_cobro
              ? `Cobrado el ${fechaCorta(cobro.fecha_cobro)}${cobro.metodo ? ` · ${metodoDe(cobro.metodo)}` : ''}`
              : `${cobro.estado === 'anulado' ? 'Era para' : 'Previsto'} ${diaRelativo(cobro.fecha_prevista).toLowerCase()}`}
          </p>
          {facturas.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-2 text-[12.5px]">
              {facturas.map((f) => (
                <a key={f.id} href={`/documentos/${f.id}?de=factura`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-cian hover:underline">
                  <FileText className="size-3.5" /> Factura {f.numero ?? ''}
                </a>
              ))}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <p className="font-semibold tabular-nums">
            {euros(cobro.importe_base)} <span className="text-[12px] font-normal text-tenue">sin IVA</span>
          </p>
          <p className="text-[12px] text-tenue tabular-nums">A cobrar {euros(cobro.importe_total)}</p>
          <span className="etiqueta" style={conColor(e.color)}>
            {e.txt}
          </span>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {abierto && !marcando && (
          <button className="btn btn-sm" onClick={() => setMarcando(true)}>
            <Check className="size-3.5 text-ok" /> Marcar cobrado
          </button>
        )}
        {cobro.estado !== 'anulado' && facturas.length === 0 && (
          <button className="btn btn-fantasma btn-sm" onClick={() => setModal('factura')}>
            <Upload className="size-3.5" /> Subir factura
          </button>
        )}
        {cobro.estado !== 'pendiente' && (
          <button className="btn btn-fantasma btn-sm" disabled={pendiente} onClick={() => ejecutar(() => deshacerCobro(cobro.id))}>
            <Undo2 className="size-3.5" /> {cobro.estado === 'anulado' ? 'Reactivar' : 'Deshacer cobro'}
          </button>
        )}
        <details className="relative ml-auto [&[open]>summary]:bg-panel-3">
          <summary className="btn btn-fantasma btn-sm list-none px-2 [&::-webkit-details-marker]:hidden" aria-label="Más opciones">
            <Ellipsis className="size-4" />
          </summary>
          <div className="absolute right-0 z-10 mt-1 flex min-w-[190px] flex-col rounded-lg border border-borde-2 bg-panel-2 p-1 shadow-2xl">
            <button className="flex items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-white/[0.06]" onClick={() => setModal('editar')}>
              <Pencil className="size-3.5" /> Editar importe o fecha
            </button>
            {abierto && cobro.contrato_id && (
              <button className="flex items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-white/[0.06]" disabled={pendiente} onClick={() => ejecutar(() => anularCobro(cobro.id), { confirmar: `¿Anular «${cobro.concepto}»? Queda como no cobrada y no cuenta en los pendientes.` })}>
                <Ban className="size-3.5" /> Anular esta cuota
              </button>
            )}
            {!cobro.contrato_id && (
              <button className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-peligro hover:bg-white/[0.06]" disabled={pendiente} onClick={() => ejecutar(() => borrarCobro(cobro.id), { confirmar: `¿Eliminar el cobro «${cobro.concepto}»?` })}>
                <Trash2 className="size-3.5" /> Eliminar
              </button>
            )}
          </div>
        </details>
      </div>
      {marcando && <FormMarcarCobrado cobro={cobro} alTerminar={() => setMarcando(false)} />}
      {modal === 'factura' && (
        <Modal titulo="Subir factura" onCerrar={() => setModal(null)}>
          <FormFactura negocioId={cobro.negocio_id} cobros={[cobro]} cobroInicial={cobro.id} alTerminar={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'editar' && (
        <Modal titulo="Editar cobro" onCerrar={() => setModal(null)}>
          <FormCobro cobro={cobro} alTerminar={() => setModal(null)} />
        </Modal>
      )}
    </li>
  );
}

// ---------- Facturas ----------
export function BotonFactura({ negocioId, negocios, cobros = [] }: { negocioId?: string; negocios?: NegocioRef[]; cobros?: Cobro[] }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button className="btn btn-sm" onClick={() => setAbierto(true)}>
        <Upload className="size-3.5" /> Subir factura
      </button>
      {abierto && (
        <Modal titulo="Subir factura" onCerrar={() => setAbierto(false)}>
          <FormFactura negocioId={negocioId} negocios={negocios} cobros={cobros} alTerminar={() => setAbierto(false)} />
        </Modal>
      )}
    </>
  );
}

function FormFactura({ negocioId, negocios, cobros = [], cobroInicial, alTerminar }: { negocioId?: string; negocios?: NegocioRef[]; cobros?: Cobro[]; cobroInicial?: string; alTerminar: () => void }) {
  const avisar = useAviso();
  const router = useRouter();
  const [negocio, setNegocio] = useState(negocioId ?? '');
  const [cobroId, setCobroId] = useState(cobroInicial ?? '');
  const cobro = cobros.find((c) => c.id === cobroId);
  const [importe, setImporte] = useState(textoImporte(cobro?.importe_total));
  const [marcar, setMarcar] = useState(cobro?.estado === 'pendiente');
  const [error, setError] = useState<{ campo?: string; texto: string } | null>(null);
  const [paso, setPaso] = useState<'' | 'subiendo' | 'guardando'>('');
  const [, iniciar] = useTransition();

  const elegirCobro = (id: string) => {
    setCobroId(id);
    const c = cobros.find((x) => x.id === id);
    if (c) setImporte(textoImporte(c.importe_total));
    setMarcar(c?.estado === 'pendiente');
  };

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const archivo = fd.get('archivo');
    if (!negocio) return setError({ campo: 'negocio_id', texto: 'Elige el cliente' });
    if (!(archivo instanceof File) || !archivo.size) return setError({ campo: 'archivo', texto: 'Elige el PDF de la factura' });
    if (tipoArchivo(archivo) !== 'application/pdf') return setError({ campo: 'archivo', texto: 'La factura tiene que ser un PDF' });
    if (archivo.size > MAX_ARCHIVO) return setError({ campo: 'archivo', texto: 'El PDF pasa de 10 MB' });
    setError(null);
    setPaso('subiendo');
    const subida = await subirArchivo(archivo, { tipo: 'factura', negocioId: negocio });
    if (!subida.path) {
      setPaso('');
      return setError({ texto: subida.error ?? 'No se ha podido subir' });
    }
    setPaso('guardando');
    fd.delete('archivo');
    fd.set('negocio_id', negocio);
    fd.set('archivo_path', subida.path);
    fd.set('archivo_nombre', archivo.name.slice(0, 200));
    fd.set('archivo_bytes', String(archivo.size));
    const r = await guardarFactura(fd).catch(() => ({ ok: false as const, error: 'No se ha podido guardar. Revisa la conexión.' }));
    setPaso('');
    if (!r.ok) return setError({ campo: 'campos' in r ? Object.keys(r.campos ?? {})[0] : undefined, texto: r.error });
    if (r.mensaje) avisar(r.mensaje);
    alTerminar();
    iniciar(() => router.refresh());
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      {!negocioId && <SelectorNegocio negocios={negocios ?? []} valor={negocio} onCambio={setNegocio} error={error?.campo === 'negocio_id' ? error.texto : undefined} />}
      <Campo etiqueta="PDF de la factura *" error={error?.campo === 'archivo' ? error.texto : undefined} ayuda="Hasta 10 MB">
        <input className="input file:mr-3 file:rounded-md file:border-0 file:bg-panel-3 file:px-3 file:py-1 file:text-texto" type="file" name="archivo" accept="application/pdf,.pdf" required />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Número" error={error?.campo === 'numero' ? error.texto : undefined}>
          <input className="input" name="numero" maxLength={40} placeholder="2026-001" autoComplete="off" />
        </Campo>
        <Campo etiqueta="Fecha *" error={error?.campo === 'fecha' ? error.texto : undefined}>
          <input className="input" type="date" name="fecha" defaultValue={hoy()} required />
        </Campo>
      </div>
      {cobros.length > 0 && (
        <Campo etiqueta="Cobro al que corresponde">
          <select className="input" name="cobro_id" value={cobroId} onChange={(e) => elegirCobro(e.target.value)}>
            <option value="">Ninguno</option>
            {cobros.map((c) => (
              <option key={c.id} value={c.id}>
                {c.concepto} · {euros(c.importe_total)}
                {c.estado === 'cobrado' ? ' (cobrado)' : ''}
              </option>
            ))}
          </select>
        </Campo>
      )}
      <Campo etiqueta="Total de la factura" error={error?.campo === 'importe_total' ? error.texto : undefined} ayuda="Con IVA y descontado el IRPF, como figura en el PDF">
        <input className="input" name="importe_total" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="0,00" autoComplete="off" />
      </Campo>
      {cobro?.estado === 'pendiente' && (
        <label className="flex items-center gap-2 text-[13.5px]">
          <input type="checkbox" name="marcar_cobrado" checked={marcar} onChange={(e) => setMarcar(e.target.checked)} className="accent-[#7c5cff]" /> Ya está cobrado: apuntarlo como cobrado hoy
        </label>
      )}
      <Campo etiqueta="Notas">
        <textarea className="input" name="notas" rows={2} maxLength={1000} />
      </Campo>
      {error && !['negocio_id', 'archivo', 'numero', 'fecha', 'importe_total'].includes(error.campo ?? '') && <p className="text-[13px] text-peligro">{error.texto}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primario" disabled={!!paso}>
          {paso ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {paso === 'subiendo' ? 'Subiendo PDF…' : 'Guardando…'}
            </>
          ) : (
            <>
              <Upload className="size-4" /> Guardar factura
            </>
          )}
        </button>
        <button type="button" className="btn btn-fantasma" onClick={alTerminar} disabled={!!paso}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function AccionesFactura({ factura }: { factura: Factura }) {
  const { ejecutar, pendiente } = useAccion();
  return (
    <span className="inline-flex items-center gap-1">
      <a href={`/documentos/${factura.id}?de=factura`} target="_blank" rel="noopener" className="btn btn-sm">
        <FileText className="size-3.5" /> Ver PDF
      </a>
      <button
        className="btn btn-fantasma btn-sm px-2 text-tenue hover:text-peligro"
        disabled={pendiente}
        aria-label="Eliminar factura"
        title="Eliminar factura"
        onClick={() => ejecutar(() => borrarFactura(factura.id), { confirmar: `¿Eliminar la factura ${factura.numero ?? ''} y su PDF? El cobro no cambia.` })}
      >
        <Trash2 className="size-3.5" />
      </button>
    </span>
  );
}

// ---------- Gastos ----------
export function BotonGasto({ negocioId, negocios, gasto }: { negocioId?: string; negocios?: NegocioRef[]; gasto?: Gasto }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      {gasto ? (
        <button className="btn btn-fantasma btn-sm px-2" onClick={() => setAbierto(true)} aria-label={`Editar ${gasto.concepto}`} title="Editar">
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <button className="btn btn-sm" onClick={() => setAbierto(true)}>
          <Plus className="size-3.5" /> Gasto
        </button>
      )}
      {abierto && (
        <Modal titulo={gasto ? 'Editar gasto' : 'Nuevo gasto'} onCerrar={() => setAbierto(false)}>
          <FormGasto negocioId={negocioId} negocios={negocios} gasto={gasto} alTerminar={() => setAbierto(false)} />
        </Modal>
      )}
    </>
  );
}

function FormGasto({ negocioId, negocios, gasto, alTerminar }: { negocioId?: string; negocios?: NegocioRef[]; gasto?: Gasto; alTerminar: () => void }) {
  const avisar = useAviso();
  const router = useRouter();
  const [negocio, setNegocio] = useState(gasto?.negocio_id ?? negocioId ?? '');
  const [categoria, setCategoria] = useState(gasto?.categoria ?? 'hosting');
  const [base, setBase] = useState(textoImporte(gasto?.importe_base));
  const [iva, setIva] = useState(Number(gasto?.iva_pct ?? IVA_DEFECTO));
  const [quitar, setQuitar] = useState(false);
  const [error, setError] = useState<{ campo?: string; texto: string } | null>(null);
  const [paso, setPaso] = useState<'' | 'subiendo' | 'guardando'>('');
  const [, iniciar] = useTransition();

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const archivo = fd.get('archivo');
    fd.delete('archivo');
    fd.set('negocio_id', negocio);
    fd.set('categoria', categoria);
    if (archivo instanceof File && archivo.size) {
      if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(tipoArchivo(archivo))) return setError({ campo: 'archivo', texto: 'El justificante tiene que ser PDF o foto (JPG, PNG, WEBP)' });
      if (archivo.size > MAX_ARCHIVO) return setError({ campo: 'archivo', texto: 'El archivo pasa de 10 MB' });
      setError(null);
      setPaso('subiendo');
      const subida = await subirArchivo(archivo, { tipo: 'gasto' });
      if (!subida.path) {
        setPaso('');
        return setError({ texto: subida.error ?? 'No se ha podido subir' });
      }
      fd.set('justificante_path', subida.path);
      fd.set('justificante_nombre', archivo.name.slice(0, 200));
    }
    setPaso('guardando');
    const r = await guardarGasto(fd).catch(() => ({ ok: false as const, error: 'No se ha podido guardar. Revisa la conexión.' }));
    setPaso('');
    if (!r.ok) return setError({ campo: 'campos' in r ? Object.keys(r.campos ?? {})[0] : undefined, texto: r.error });
    if (r.mensaje) avisar(r.mensaje);
    alTerminar();
    iniciar(() => router.refresh());
  }

  const campoError = (c: string) => (error?.campo === c ? error.texto : undefined);
  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={gasto?.id ?? ''} />
      <Campo etiqueta="Concepto *" error={campoError('concepto')}>
        <input className="input" name="concepto" defaultValue={gasto?.concepto ?? ''} required maxLength={160} placeholder="Ej.: Hosting anual de la web" />
      </Campo>
      <div>
        <span className="mb-1.5 block text-[12.5px] font-medium text-suave">Categoría</span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIAS_GASTO.map((c) => (
            <button key={c.v} type="button" className="chip" aria-pressed={categoria === c.v} onClick={() => setCategoria(c.v)}>
              {c.txt}
            </button>
          ))}
        </div>
      </div>
      <CamposImporte base={base} iva={iva} irpf={0} onBase={setBase} onIva={setIva} onIrpf={() => {}} conIrpf={false} error={campoError('importe_base')} />
      <Campo etiqueta="Fecha *" error={campoError('fecha')}>
        <input className="input" type="date" name="fecha" defaultValue={gasto?.fecha ?? hoy()} required />
      </Campo>
      {/* Sin lista de clientes (desde la ficha) el gasto se queda en el cliente que ya tiene */}
      {negocios?.length ? <SelectorNegocio negocios={negocios} valor={negocio} onCambio={setNegocio} opcional /> : null}
      <Campo etiqueta="Justificante (opcional)" error={campoError('archivo')} ayuda="PDF o foto del ticket, hasta 10 MB">
        <input className="input file:mr-3 file:rounded-md file:border-0 file:bg-panel-3 file:px-3 file:py-1 file:text-texto" type="file" name="archivo" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp" />
      </Campo>
      {gasto?.justificante_path && (
        <label className="flex items-center gap-2 text-[13px] text-suave">
          <input type="checkbox" name="quitar_justificante" checked={quitar} onChange={(e) => setQuitar(e.target.checked)} className="accent-[#7c5cff]" /> Quitar el justificante actual ({gasto.justificante_nombre})
        </label>
      )}
      <Campo etiqueta="Notas">
        <textarea className="input" name="notas" rows={2} maxLength={1000} defaultValue={gasto?.notas ?? ''} />
      </Campo>
      {error && !['concepto', 'importe_base', 'fecha', 'archivo'].includes(error.campo ?? '') && <p className="text-[13px] text-peligro">{error.texto}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primario" disabled={!!paso}>
          {paso ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {paso === 'subiendo' ? 'Subiendo…' : 'Guardando…'}
            </>
          ) : gasto ? (
            'Guardar cambios'
          ) : (
            'Apuntar gasto'
          )}
        </button>
        <button type="button" className="btn btn-fantasma" onClick={alTerminar} disabled={!!paso}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function AccionesGasto({ gasto, negocios }: { gasto: Gasto; negocios?: NegocioRef[] }) {
  const { ejecutar, pendiente } = useAccion();
  return (
    <span className="inline-flex items-center gap-1">
      {gasto.justificante_path && (
        <a href={`/documentos/${gasto.id}?de=gasto`} target="_blank" rel="noopener" className="btn btn-fantasma btn-sm px-2" aria-label="Ver justificante" title="Ver justificante">
          <Paperclip className="size-3.5" />
        </a>
      )}
      <BotonGasto gasto={gasto} negocios={negocios} />
      <button
        className="btn btn-fantasma btn-sm px-2 text-tenue hover:text-peligro"
        disabled={pendiente}
        aria-label={`Eliminar ${gasto.concepto}`}
        title="Eliminar"
        onClick={() => ejecutar(() => borrarGasto(gasto.id), { confirmar: `¿Eliminar el gasto «${gasto.concepto}»?` })}
      >
        <Trash2 className="size-3.5" />
      </button>
    </span>
  );
}
