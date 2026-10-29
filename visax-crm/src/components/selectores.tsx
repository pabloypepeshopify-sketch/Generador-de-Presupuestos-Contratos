'use client';

import { cambiarEstado, cambiarResponsable } from '@/acciones/negocios';
import { useAccion } from '@/components/cliente';
import type { Estado, Socio } from '@/lib/tipos';

/** Cambio de estado comercial desde la tabla, la ficha o el Kanban (también es la alternativa accesible al arrastre) */
export function SelectorEstado({ id, estado, estados, compacto = false, etiqueta = 'Estado comercial' }: { id: string; estado: string; estados: Estado[]; compacto?: boolean; etiqueta?: string }) {
  const { ejecutar, pendiente } = useAccion();
  const actual = estados.find((e) => e.codigo === estado);
  return (
    <select
      aria-label={etiqueta}
      value={estado}
      disabled={pendiente}
      onChange={(e) => ejecutar(() => cambiarEstado(id, e.target.value))}
      onClick={(e) => e.stopPropagation()}
      className={`input font-medium ${compacto ? 'min-h-[30px] py-1 pl-2.5 text-[12.5px]' : ''}`}
      style={{ color: actual?.color, borderColor: actual ? `color-mix(in srgb, ${actual.color} 45%, transparent)` : undefined }}
    >
      {estados.map((e) => (
        <option key={e.codigo} value={e.codigo} style={{ color: '#f5f7fb' }}>
          {e.nombre}
        </option>
      ))}
    </select>
  );
}

export function SelectorResponsable({ id, responsableId, socios, compacto = false }: { id: string; responsableId: string | null; socios: Socio[]; compacto?: boolean }) {
  const { ejecutar, pendiente } = useAccion();
  return (
    <select
      aria-label="Socio responsable"
      value={responsableId ?? ''}
      disabled={pendiente}
      onChange={(e) => ejecutar(() => cambiarResponsable(id, e.target.value || null))}
      className={`input ${compacto ? 'min-h-[30px] py-1 pl-2.5 text-[12.5px]' : ''}`}
    >
      <option value="">Sin responsable</option>
      {socios.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre}
        </option>
      ))}
    </select>
  );
}
