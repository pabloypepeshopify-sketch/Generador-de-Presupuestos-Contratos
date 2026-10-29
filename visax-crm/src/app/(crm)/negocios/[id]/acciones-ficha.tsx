'use client';

import Link from 'next/link';
import { ChevronDown, Trash2 } from 'lucide-react';
import { borrarNegocio } from '@/acciones/negocios';
import { useAccion } from '@/components/cliente';
import { IconoInteraccion } from '@/components/ui';
import type { TipoSimple } from '@/lib/tipos';

export function MenuOtroContacto({ negocioId, tipos }: { negocioId: string; tipos: TipoSimple[] }) {
  return (
    <details className="relative flex-1 sm:flex-none [&[open]>summary]:bg-panel-3">
      <summary className="btn btn-lg w-full list-none [&::-webkit-details-marker]:hidden">
        Otro contacto <ChevronDown className="size-4" />
      </summary>
      <div className="absolute right-0 z-10 mt-1 flex min-w-[200px] flex-col rounded-lg border border-borde-2 bg-panel-2 p-1 shadow-2xl sm:left-0 sm:right-auto">
        {tipos.map((t) => (
          <Link key={t.codigo} href={`/negocios/${negocioId}/contacto?tipo=${t.codigo}`} className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-white/[0.06]">
            <IconoInteraccion tipo={t.codigo} className="size-4 text-cian" /> {t.nombre}
          </Link>
        ))}
      </div>
    </details>
  );
}

export function BorrarNegocio({ id, nombre }: { id: string; nombre: string }) {
  const { ejecutar, pendiente } = useAccion();
  return (
    <button
      className="btn btn-fantasma btn-sm self-start text-tenue hover:text-peligro"
      disabled={pendiente}
      onClick={() =>
        ejecutar(() => borrarNegocio(id), {
          confirmar: `¿Eliminar «${nombre}»? Se borrarán también su historial, contactos y tareas. No se puede deshacer.\n\nSi solo no vais a seguir con él, cambia su estado a «Descartado».`,
        })
      }
    >
      <Trash2 className="size-3.5" /> Eliminar negocio
    </button>
  );
}
