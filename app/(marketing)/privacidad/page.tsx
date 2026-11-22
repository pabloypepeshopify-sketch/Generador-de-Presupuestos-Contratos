import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/layout/LegalPage';
import { Pending } from '@/components/ui/Pending';
import { site } from '@/lib/site.config';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: `Cómo trata ${site.name} los datos que nos envías desde esta web.`,
  alternates: { canonical: '/privacidad' },
  robots: { index: false, follow: true },
};

export default function PrivacidadPage() {
  const { holder, nif, address } = site.legal;
  const mail = <a href={`mailto:${site.email}`}>{site.email}</a>;
  return (
    <LegalPage title="Política de privacidad" updated="noviembre de 2026">
      <Pending>TODO: confirmar · revisar los textos legales con vuestra asesoría</Pending>
      <section>
        <h2>1. Responsable del tratamiento</h2>
        <p>
          {holder} (NIF {nif}), {address}, que opera con el nombre comercial {site.name}. Contacto: {mail} · {site.phone}.
        </p>
      </section>
      <section>
        <h2>2. Qué datos tratamos y para qué</h2>
        <ul>
          <li>
            Solicitud de diagnóstico: nombre, empresa, sector, email, teléfono y lo que nos cuentes sobre tu empresa, para
            contactarte, preparar el diagnóstico y, si lo pides, una propuesta.
          </li>
          <li>
            Reserva de una visita: nombre, empresa, email, teléfono, dirección, localidad, día y hora elegidos y tus
            comentarios, para apuntar la visita en nuestro calendario y llamarte para confirmarla.
          </li>
          <li>Consultas por WhatsApp, email o teléfono: los datos que nos envíes, para atenderte.</li>
        </ul>
      </section>
      <section>
        <h2>3. Base legal</h2>
        <p>
          Tu consentimiento al enviarnos el formulario o reservar una visita, y la aplicación de medidas precontractuales a
          tu petición. Si contratas un servicio, la ejecución del contrato y el cumplimiento de obligaciones legales, como la
          facturación.
        </p>
      </section>
      <section>
        <h2>4. Destinatarios</h2>
        <p>
          No vendemos ni cedemos tus datos. Los tratan, como encargados y solo para prestarnos su servicio: n8n (plataforma
          de automatización que recibe el formulario y las reservas), Google (correo electrónico y calendario) y Vercel
          (alojamiento de la web). Algunos pueden tratar datos fuera del Espacio Económico Europeo con las garantías que
          exige el RGPD (cláusulas contractuales tipo o Marco de Privacidad de Datos UE-EE. UU.).
        </p>
      </section>
      <section>
        <h2>5. Conservación</h2>
        <p>Mientras dure la relación o hasta que nos pidas borrarlos y, después, durante los plazos que exige la ley.</p>
      </section>
      <section>
        <h2>6. Tus derechos</h2>
        <p>
          Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad, y retirar tu
          consentimiento, escribiendo a {mail}. Si consideras que no hemos atendido bien tu solicitud, puedes reclamar ante la
          Agencia Española de Protección de Datos (
          <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
            aepd.es
          </a>
          ).
        </p>
      </section>
      <section>
        <h2>7. Cookies</h2>
        <p>
          Esta web no usa cookies de publicidad ni de analítica. Tienes el detalle en la <Link href="/cookies">política de
          cookies</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
