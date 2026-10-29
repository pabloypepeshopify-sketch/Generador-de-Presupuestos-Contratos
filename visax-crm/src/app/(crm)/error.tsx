'use client';

import Link from 'next/link';

export default function ErrorCRM({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-center" role="alert">
      <h1 className="titulo text-[24px]">Algo ha fallado</h1>
      <p className="text-suave">
        No se han podido cargar los datos. Puede ser un corte de conexión. {error.digest ? `(Referencia: ${error.digest})` : ''}
      </p>
      <div className="flex gap-2">
        <button className="btn btn-primario" onClick={reset}>
          Reintentar
        </button>
        <Link href="/" className="btn">
          Ir al panel
        </Link>
      </div>
    </div>
  );
}
