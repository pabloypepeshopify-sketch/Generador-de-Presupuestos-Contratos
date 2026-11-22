import type { Metadata } from 'next';
import { LegalPage } from '@/components/layout/LegalPage';
import { Pending } from '@/components/ui/Pending';
import { site } from '@/lib/site.config';

export const metadata: Metadata = {
  title: 'Aviso legal',
  description: `Datos identificativos y condiciones de uso de la web de ${site.name}.`,
  alternates: { canonical: '/aviso-legal' },
  robots: { index: false, follow: true },
};

export default function AvisoLegalPage() {
  const { holder, nif, address } = site.legal;
  return (
    <LegalPage title="Aviso legal" updated="noviembre de 2026">
      <Pending>TODO: confirmar · revisar los textos legales con vuestra asesoría</Pending>
      <section>
        <h2>1. Datos identificativos</h2>
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio
          Electrónico (LSSI-CE), se informa de los datos del titular de este sitio web:
        </p>
        <ul>
          <li>Titular: {holder}</li>
          <li>NIF: {nif}</li>
          <li>Domicilio: {address}</li>
          <li>
            Email: <a href={`mailto:${site.email}`}>{site.email}</a> · Teléfono: {site.phone}
          </li>
          <li>Nombre comercial: {site.name}</li>
          <li>
            Actividad: análisis, modernización y optimización de empresas mediante inteligencia artificial, automatización y
            tecnología.
          </li>
        </ul>
      </section>
      <section>
        <h2>2. Uso del sitio</h2>
        <p>
          El acceso a este sitio es gratuito y atribuye la condición de usuario, que se compromete a hacer un uso adecuado de
          sus contenidos y a no emplearlos para actividades ilícitas. La información sobre servicios y planes es orientativa;
          las condiciones de cada servicio se acuerdan por escrito antes de empezar.
        </p>
      </section>
      <section>
        <h2>3. Propiedad intelectual e industrial</h2>
        <p>
          Los textos, diseños, logotipos y código de este sitio pertenecen a {holder} ({site.name}) o se usan con
          autorización. Las marcas de terceros que se mencionan pertenecen a sus titulares.
        </p>
      </section>
      <section>
        <h2>4. Responsabilidad</h2>
        <p>
          {site.name} no se hace responsable del uso indebido de los contenidos ni de los daños derivados de interrupciones
          técnicas ajenas a su control. Los enlaces a sitios de terceros se ofrecen solo a título informativo.
        </p>
      </section>
      <section>
        <h2>5. Legislación aplicable</h2>
        <p>Este sitio se rige por la legislación española.</p>
      </section>
    </LegalPage>
  );
}
