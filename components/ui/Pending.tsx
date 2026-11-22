import { flags } from '@/config/flags';

/**
 * Marca visible de «TODO: confirmar». Solo se pinta fuera de producción
 * (vista previa y local); en visaxai.es no aparece.
 */
export function Pending({ children }: { children: React.ReactNode }) {
  if (!flags.showPending) return null;
  return (
    <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-dashed border-amber-400/60 bg-amber-400/10 px-3 py-1 font-mono text-[11px] text-amber-300">
      {children}
    </span>
  );
}
