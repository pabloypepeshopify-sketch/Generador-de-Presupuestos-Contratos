import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { mesActual, moverMes, nombreMes } from '@/lib/dinero';

/** ‹ noviembre 2026 › · mantiene el resto de parámetros de la página */
export function SelectorMes({ mes, ruta, otros = {} }: { mes: string; ruta: string; otros?: Record<string, string | undefined> }) {
  const enlace = (m: string) => {
    const q = new URLSearchParams(Object.entries({ ...otros, mes: m }).filter((e): e is [string, string] => !!e[1]));
    return `${ruta}?${q}`;
  };
  const actual = mesActual();
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Mes">
      <Link href={enlace(moverMes(mes, -1))} className="btn btn-sm px-2" aria-label="Mes anterior">
        <ChevronLeft className="size-4" />
      </Link>
      <span className="min-w-[150px] text-center text-[14px] font-semibold capitalize">{nombreMes(mes)}</span>
      <Link href={enlace(moverMes(mes, 1))} className="btn btn-sm px-2" aria-label="Mes siguiente">
        <ChevronRight className="size-4" />
      </Link>
      {mes !== actual && (
        <Link href={enlace(actual)} className="btn btn-fantasma btn-sm">
          Este mes
        </Link>
      )}
    </div>
  );
}
