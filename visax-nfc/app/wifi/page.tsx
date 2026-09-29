import type { Metadata } from 'next';
import { Wifi } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { CopyButton } from '@/components/CopyButton';

export const metadata: Metadata = { title: 'Conéctate al WiFi', robots: { index: false } };

/**
 * Página que abre el NFC de WiFi en iPhone (Apple no permite conectarse a una red
 * desde un NFC). Datos en la URL: /wifi?r=<red>&c=<contraseña>
 */
export default function WifiPage({ searchParams }: { searchParams: { r?: string; c?: string } }) {
  const red = typeof searchParams.r === 'string' ? searchParams.r.slice(0, 64) : '';
  const clave = typeof searchParams.c === 'string' ? searchParams.c.slice(0, 128) : '';

  return (
    <main className="container-x flex min-h-[100svh] flex-col items-center justify-center py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-ink-line bg-brand-gradient-soft">
        <Wifi className="h-8 w-8 text-brand-cyan" />
      </span>
      {red ? (
        <>
          <h1 className="mt-6 font-display text-4xl sm:text-5xl">Conéctate al WiFi</h1>
          <div className="mt-8 w-full max-w-sm space-y-3 text-left">
            <div className="rounded-2xl border border-ink-line bg-bg-soft/70 p-4">
              <p className="text-xs uppercase tracking-wider text-ink-faint">Red</p>
              <p className="mt-1 break-all text-lg font-semibold">{red}</p>
            </div>
            {clave && (
              <div className="rounded-2xl border border-ink-line bg-bg-soft/70 p-4">
                <p className="text-xs uppercase tracking-wider text-ink-faint">Contraseña</p>
                <p className="mt-1 break-all font-mono text-lg">{clave}</p>
              </div>
            )}
          </div>
          {clave && <CopyButton text={clave} className="mt-6 w-full max-w-sm" />}
          <ol className="mt-8 max-w-sm space-y-2 text-left text-sm text-ink-soft">
            {clave && <li>1. Pulsa «Copiar contraseña».</li>}
            <li>{clave ? '2.' : '1.'} Abre Ajustes › Wi‑Fi.</li>
            <li>
              {clave ? '3.' : '2.'} Elige «{red}»{clave ? ' y pega la contraseña' : ''}.
            </li>
          </ol>
        </>
      ) : (
        <>
          <h1 className="mt-6 font-display text-4xl">WiFi no disponible</h1>
          <p className="mt-4 max-w-sm text-ink-soft">Este enlace no tiene los datos de la red. Pregunta en el local.</p>
        </>
      )}
      <Logo className="mt-14 h-5 opacity-60" />
    </main>
  );
}
