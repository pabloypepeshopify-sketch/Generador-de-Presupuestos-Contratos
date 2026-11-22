import Link from 'next/link';
import { Home, ClipboardCheck } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="hero-aurora" />
      </div>
      <div className="flex flex-col items-center gap-8">
        <Logo className="h-7" />
        <p className="text-gradient text-[28vw] font-semibold leading-none tracking-tightest sm:text-[14rem]">404</p>
        <h1 className="max-w-md text-2xl">Esta página no existe o ha cambiado de sitio.</h1>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#06060B] transition hover:bg-brand-silver"
          >
            <Home className="h-4 w-4" aria-hidden="true" /> Volver al inicio
          </Link>
          <Link
            href="/#diagnostico"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-ink-line px-7 py-3.5 text-sm font-semibold text-ink-soft transition hover:text-ink"
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Solicitar diagnóstico
          </Link>
        </div>
      </div>
    </main>
  );
}
