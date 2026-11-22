import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** Plantilla de las páginas legales (aviso legal, privacidad, cookies). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="container-x max-w-3xl pb-24 pt-32">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al inicio
      </Link>
      <h1 className="mt-8 text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-2 text-sm text-ink-soft">Última actualización: {updated}</p>
      <div className="mt-8 space-y-7 text-ink-soft [&_a]:text-ink [&_a]:underline [&_h2]:text-xl [&_h2]:text-ink [&_li]:text-sm [&_p]:mt-2 [&_p]:text-sm [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
