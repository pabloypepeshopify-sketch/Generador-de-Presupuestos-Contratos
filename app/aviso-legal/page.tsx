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

const h2 = 'font-display text-2xl text-ink';
const p = 'mt-2 text-sm leading-relaxed';

export default function AvisoLegalPage() {
  const { holder, nif, address } = site.legal;
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
          <p className="mt-2 text-sm text-ink-soft">Última actualización: octubre de 2026</p>
          <div className="mt-8 space-y-6 text-ink-soft">
            <section>
              <h2 className={h2}>1. Datos identificativos</h2>
              <p className={p}>
                En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de
                Comercio Electrónico (LSSI-CE), se informa de los datos del titular de este sitio web:
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                <li>Titular: {holder}</li>
                <li>NIF: {nif}</li>
                <li>Domicilio: {address}</li>
                <li>
                  Email: <a href={`mailto:${site.email}`} className="text-white underline">{site.email}</a> · Teléfono:{' '}
                  {site.phone}
                </li>
                <li>Nombre comercial: {site.name}</li>
                <li>Actividad: diseño e implantación de automatizaciones con Inteligencia Artificial para empresas.</li>
              </ul>
            </section>
            <section>
              <h2 className={h2}>2. Uso del sitio</h2>
              <p className={p}>
                El acceso a este sitio es gratuito y atribuye la condición de usuario, que se compromete a hacer un uso
                adecuado de sus contenidos y a no emplearlos para actividades ilícitas. La información sobre servicios es
                orientativa; cada proyecto se presupuesta por escrito antes de empezar.
              </p>
            </section>
            <section>
              <h2 className={h2}>3. Propiedad intelectual e industrial</h2>
              <p className={p}>
                Los textos, diseños, logotipos y código de este sitio pertenecen a {holder} ({site.name}) o se usan con
                autorización. Las marcas de terceros que se mencionan pertenecen a sus titulares.
              </p>
            </section>
            <section>
              <h2 className={h2}>4. Responsabilidad</h2>
              <p className={p}>
                {site.name} no se hace responsable del uso indebido de los contenidos ni de los daños derivados de
                interrupciones técnicas ajenas a su control. Los enlaces a sitios de terceros se ofrecen solo a título
                informativo.
              </p>
            </section>
            <section>
              <h2 className={h2}>5. Legislación aplicable</h2>
              <p className={p}>Este sitio se rige por la legislación española.</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
