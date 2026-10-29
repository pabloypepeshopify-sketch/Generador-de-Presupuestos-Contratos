'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import { ESTADOS_ESPECIALES, ORDENES, PRESETS_PROXIMO, PRESETS_ULTIMO, type Filtros } from '@/lib/filtros';
import type { Catalogos } from '@/lib/tipos';

export function FiltrosNegocios({
  f,
  cat,
  sectores,
  localidades,
  activos,
}: {
  f: Filtros;
  cat: Pick<Catalogos, 'estados' | 'servicios' | 'socios' | 'tiposInteraccion'>;
  sectores: string[];
  localidades: string[];
  activos: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [cargando, iniciar] = useTransition();
  const [texto, setTexto] = useState(f.q);
  const [abierto, setAbierto] = useState(activos > (f.q ? 1 : 0));
  const primera = useRef(true);

  const cambiar = (cambios: Record<string, string>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    p.delete('pagina');
    iniciar(() => router.replace(`/negocios${p.size ? `?${p}` : ''}`, { scroll: false }));
  };

  // Búsqueda mientras se escribe
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    const t = setTimeout(() => cambiar({ q: texto.trim() }), 300);
    return () => clearTimeout(t);
  }, [texto]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (nombre: keyof Filtros, etiqueta: string, opciones: { v: string; txt: string }[], vacio = 'Todos') => (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11.5px] font-medium text-tenue">{etiqueta}</span>
      <select className="input min-h-[34px] py-1.5 text-[13px]" value={String(f[nombre] ?? '')} onChange={(e) => cambiar({ [nombre]: e.target.value })}>
        <option value="">{vacio}</option>
        {opciones.map((o) => (
          <option key={o.v} value={o.v}>
            {o.txt}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tenue" />
          <input
            className="input pl-9"
            placeholder="Buscar por negocio, contacto o teléfono"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            aria-label="Buscar negocios"
            type="search"
          />
        </div>
        <button className="btn" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
          <SlidersHorizontal className="size-4" /> Filtros{activos ? ` (${activos})` : ''}
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-borde-2 px-3 py-2 text-[13px]">
          <input type="checkbox" checked={f.pendientes} onChange={(e) => cambiar({ pendientes: e.target.checked ? '1' : '' })} className="accent-[#7c5cff]" />
          Con tareas pendientes
        </label>
        <select className="input w-auto min-w-[200px]" value={f.orden} onChange={(e) => cambiar({ orden: e.target.value === 'reciente' ? '' : e.target.value })} aria-label="Ordenar por">
          {ORDENES.map((o) => (
            <option key={o.v} value={o.v}>
              Ordenar: {o.txt}
            </option>
          ))}
        </select>
        {cargando && <Loader2 className="size-4 animate-spin text-suave" aria-label="Cargando" />}
        {activos > 0 && (
          <Link href="/negocios" className="btn btn-fantasma btn-sm" onClick={() => setTexto('')}>
            <X className="size-3.5" /> Quitar filtros
          </Link>
        )}
      </div>

      {abierto && (
        <div className="caja grid grid-cols-2 gap-3 p-3 md:grid-cols-4 xl:grid-cols-8">
          {select('estado', 'Estado', [...ESTADOS_ESPECIALES, ...cat.estados.map((e) => ({ v: e.codigo, txt: e.nombre }))])}
          {select('responsable', 'Responsable', [...cat.socios.map((s) => ({ v: s.id, txt: s.nombre })), { v: 'sin', txt: 'Sin responsable' }])}
          {select('servicio', 'Servicio de interés', cat.servicios.map((s) => ({ v: s.codigo, txt: s.nombre })))}
          {select('sector', 'Sector', sectores.map((s) => ({ v: s, txt: s })))}
          {select('localidad', 'Localidad', localidades.map((s) => ({ v: s, txt: s })), 'Todas')}
          {select('canal', 'Contactado por', cat.tiposInteraccion.map((t) => ({ v: t.codigo, txt: t.nombre })), 'Cualquier canal')}
          {select('ultimo', 'Último contacto', PRESETS_ULTIMO, 'Cualquier fecha')}
          {select('proximo', 'Próximo seguimiento', PRESETS_PROXIMO, 'Cualquier fecha')}
          {f.ultimo === 'rango' && (
            <div className="col-span-2 flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[11.5px] text-tenue">Último contacto desde</span>
                <input type="date" className="input min-h-[34px] py-1" value={f.ultimo_desde} onChange={(e) => cambiar({ ultimo_desde: e.target.value })} />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[11.5px] text-tenue">hasta</span>
                <input type="date" className="input min-h-[34px] py-1" value={f.ultimo_hasta} onChange={(e) => cambiar({ ultimo_hasta: e.target.value })} />
              </label>
            </div>
          )}
          {f.proximo === 'rango' && (
            <div className="col-span-2 flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[11.5px] text-tenue">Seguimiento desde</span>
                <input type="date" className="input min-h-[34px] py-1" value={f.proximo_desde} onChange={(e) => cambiar({ proximo_desde: e.target.value })} />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[11.5px] text-tenue">hasta</span>
                <input type="date" className="input min-h-[34px] py-1" value={f.proximo_hasta} onChange={(e) => cambiar({ proximo_hasta: e.target.value })} />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
