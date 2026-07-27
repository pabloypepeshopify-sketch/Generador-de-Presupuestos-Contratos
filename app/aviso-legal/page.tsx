import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { site } from '@/lib/site.config';

export const metadata: Metadata = {
  title: 'Aviso legal',
  robots: { index: false, follow: true },
};

export default function AvisoLegalPage() {
  return (
    <>
      <Header />
      <main className="pt-32">
        <article className="container-x prose-invert max-w-3xl pb-24">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
          <h1 className="mt-8 font-display text-5xl">Aviso legal</h1>
          <p className="mt-4 rounded-xl border border-brand-violet/30 bg-brand-gradient-soft p-4 text-sm text-ink-soft">
            ⚠️ Texto de ejemplo (placeholder). Sustitúyelo por tu aviso legal real revisado por un
            profesional. Edita <code>app/aviso-legal/page.tsx</code>.
          </p>
          <div className="mt-8 space-y-6 text-ink-soft">
            <section>
              <h2 className="font-display text-2xl text-ink">1. Datos identificativos</h2>
              <p className="mt-2 text-sm leading-relaxed">
                Titular: {site.legalName}. Contacto: {site.email} · {site.phone}. Completa aquí tu
                NIF/CIF, domicilio y datos registrales.
              </p>
            </section>
            <section>
              <h2 className="font-display text-2xl text-ink">2. Objeto</h2>
              <p className="mt-2 text-sm leading-relaxed">
                Este sitio web tiene por objeto informar sobre los servicios de automatización con
                Inteligencia Artificial de {site.name}.
              </p>
            </section>
            <section>
              <h2 className="font-display text-2xl text-ink">3. Propiedad intelectual</h2>
              <p className="mt-2 text-sm leading-relaxed">
                Todos los contenidos de este sitio son titularidad de {site.legalName} o de terceros
                que han autorizado su uso.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
