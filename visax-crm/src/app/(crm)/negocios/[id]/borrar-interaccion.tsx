'use client';

import { Trash2 } from 'lucide-react';
import { borrarInteraccion } from '@/acciones/seguimiento';
import { useAccion } from '@/components/cliente';

export function BorrarInteraccion({ id }: { id: string }) {
  const { ejecutar, pendiente } = useAccion();
  return (
    <button
      className="ml-auto rounded p-1 text-tenue hover:bg-peligro/10 hover:text-peligro"
      aria-label="Eliminar este contacto del historial"
      title="Eliminar este contacto del historial"
      disabled={pendiente}
      onClick={() => ejecutar(() => borrarInteraccion(id), { confirmar: '¿Eliminar este contacto del historial? Solo para corregir errores; no se puede deshacer.' })}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
