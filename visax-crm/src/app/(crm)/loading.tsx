import { Loader2 } from 'lucide-react';

export default function Cargando() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-2 text-suave" role="status">
      <Loader2 className="size-5 animate-spin" /> Cargando…
    </div>
  );
}
