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

const h2 = 'font-display text-2xl text-ink';
const p = 'mt-2 text-sm leading-relaxed';
const ul = 'mt-3 list-disc space-y-1 pl-5 text-sm';

export default function PrivacidadPage() {
  const { holder, nif, address } = site.legal;
  const mail = (
    <a href={`mailto:${site.email}`} className="text-white underline">
      {site.email}
    </a>
  );
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
          <h1 className="mt-8 font-display text-5xl">Política de privacidad</h1>
          <p className="mt-2 text-sm text-ink-soft">Última actualización: octubre de 2026</p>
          <div className="mt-8 space-y-6 text-ink-soft">
            <section>
              <h2 className={h2}>1. Responsable del tratamiento</h2>
              <p className={p}>
                {holder} (NIF {nif}), {address}, que opera con el nombre comercial {site.name}. Contacto: {mail} ·{' '}
                {site.phone}.
              </p>
            </section>
            <section>
              <h2 className={h2}>2. Qué datos tratamos y para qué</h2>
              <ul className={ul}>
                <li>
                  Formulario de contacto: tu email y tu mensaje, para responder a tu consulta y, si lo pides, prepararte una
                  propuesta.
                </li>
                <li>
                  Reserva de reunión: nombre, email, teléfono, día y hora elegidos, para agendar la llamada y enviarte la
                  confirmación por email.
                </li>
                <li>Consultas por WhatsApp, email o teléfono: los datos que nos envíes, para atenderte.</li>
              </ul>
            </section>
            <section>
              <h2 className={h2}>3. Base legal</h2>
              <p className={p}>
                Tu consentimiento al enviarnos el formulario o reservar, y la aplicación de medidas precontractuales a tu
                petición (preparar una propuesta). Si contratas un servicio, la ejecución del contrato y el cumplimiento de
                obligaciones legales, como la facturación.
              </p>
            </section>
            <section>
              <h2 className={h2}>4. Destinatarios</h2>
              <p className={p}>
                No vendemos ni cedemos tus datos. Los tratan, como encargados y solo para prestarnos su servicio: Make
                (automatización que gestiona el formulario y las reservas), Google (calendario y correo electrónico) y Vercel
                (alojamiento de la web). Algunos pueden tratar datos fuera del Espacio Económico Europeo con las garantías
                que exige el RGPD (cláusulas contractuales tipo o Marco de Privacidad de Datos UE-EE. UU.).
              </p>
            </section>
            <section>
              <h2 className={h2}>5. Conservación</h2>
              <p className={p}>
                Mientras dure la relación o hasta que nos pidas borrarlos y, después, durante los plazos que exige la ley.
              </p>
            </section>
            <section>
              <h2 className={h2}>6. Tus derechos</h2>
              <p className={p}>
                Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad, y
                retirar tu consentimiento, escribiendo a {mail}. Si consideras que no hemos atendido bien tu solicitud, puedes
                reclamar ante la Agencia Española de Protección de Datos (
                <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-white underline">
                  aepd.es
                </a>
                ).
              </p>
            </section>
            <section>
              <h2 className={h2}>7. Cookies</h2>
              <p className={p}>
                Este sitio no usa cookies de publicidad ni de analítica. Solo guarda en tu navegador (almacenamiento local) tu
                elección en el aviso de cookies, para no volver a mostrártelo.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
