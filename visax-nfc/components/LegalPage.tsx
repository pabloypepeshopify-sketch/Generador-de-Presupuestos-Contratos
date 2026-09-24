import type { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

/** Maqueta común de las páginas legales. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="container-x max-w-3xl pb-24 pt-32">
        <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">Última actualización: {updated}</p>
        <div className="legal mt-10 space-y-6 leading-relaxed text-ink-soft [&_a]:text-white [&_a]:underline [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-white">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
