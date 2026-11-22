import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { site } from '@/lib/site.config';

/**
 * Layout del PORTAL DE CLIENTES (futuro). Independiente de la web pública:
 * cabecera mínima, sin menú comercial. Hoy solo cuelga de aquí /acceso.
 * Ver docs/ARQUITECTURA_PORTAL.md.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100svh] flex-col">
      <header className="border-b border-ink-line">
        <div className="container-x flex h-16 items-center justify-between">
          <Link href="/" aria-label={`${site.name}: volver a la web`}>
            <Logo className="h-6" />
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Volver a la web
          </Link>
        </div>
      </header>
      <main id="contenido" className="flex flex-1 flex-col">
        {children}
      </main>
      <footer className="border-t border-ink-line">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-6 text-xs text-ink-faint sm:flex-row">
          <span>{site.tagline}</span>
          <span>
            <Link href="/privacidad" className="hover:text-ink">
              Privacidad
            </Link>
            {' · '}
            <Link href="/aviso-legal" className="hover:text-ink">
              Aviso legal
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
