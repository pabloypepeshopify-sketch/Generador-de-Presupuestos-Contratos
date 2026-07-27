import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { site } from '@/lib/site.config';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  robots: { index: false, follow: true },
};

export default function PrivacidadPage() {
  return (
    <>
      <Header />
      <main className="pt-32">
        <article className="container-x max-w-3xl pb-24">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
          <h1 className="mt-8 font-display text-5xl">Política de privacidad</h1>
          <p className="mt-4 rounded-xl border border-brand-violet/30 bg-brand-gradient-soft p-4 text-sm text-ink-soft">
            ⚠️ Texto de ejemplo (placeholder). Sustitúyelo por tu política de privacidad real
            conforme al RGPD/LOPDGDD. Edita <code>app/privacidad/page.tsx</code>.
          </p>
          <div className="mt-8 space-y-6 text-ink-soft">
            <section>
              <h2 className="font-display text-2xl text-ink">1. Responsable del tratamiento</h2>
              <p className="mt-2 text-sm leading-relaxed">
                {site.legalName}. Contacto: {site.email} · {site.phone}.
              </p>
            </section>
            <section>
              <h2 className="font-display text-2xl text-ink">2. Finalidad</h2>
              <p className="mt-2 text-sm leading-relaxed">
                Los datos que nos facilitas mediante los formularios se utilizan exclusivamente para
                responder a tu solicitud, gestionar la cita y ofrecerte nuestros servicios.
              </p>
            </section>
            <section>
              <h2 className="font-display text-2xl text-ink">3. Legitimación y derechos</h2>
              <p className="mt-2 text-sm leading-relaxed">
                La base legal es tu consentimiento. Puedes ejercer tus derechos de acceso,
                rectificación, supresión y oposición escribiendo a {site.email}.
              </p>
            </section>
            <section>
              <h2 className="font-display text-2xl text-ink">4. Cookies</h2>
              <p className="mt-2 text-sm leading-relaxed">
                Este sitio utiliza cookies técnicas y, con tu consentimiento, cookies de medición.
                Puedes gestionarlas desde el banner de cookies.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
