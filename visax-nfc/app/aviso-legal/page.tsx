import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { site } from '@/lib/site.config';

export const metadata: Metadata = { title: 'Aviso legal' };

export default function AvisoLegal() {
  const { holder, nif, address } = site.legal;
  return (
    <LegalPage title="Aviso legal" updated="septiembre de 2026">
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio
        Electrónico (LSSI-CE), se informa de los datos del titular de este sitio web:
      </p>
      <ul>
        <li><strong>Titular:</strong> {holder}</li>
        <li><strong>NIF:</strong> {nif}</li>
        <li><strong>Domicilio:</strong> {address}</li>
        <li><strong>Email:</strong> <a href={`mailto:${site.email}`}>{site.email}</a></li>
        <li><strong>Teléfono:</strong> {site.phone}</li>
        <li><strong>Nombre comercial:</strong> {site.name}</li>
        <li><strong>Actividad:</strong> venta online de expositores y tarjetas NFC.</li>
      </ul>

      <h2>Uso del sitio</h2>
      <p>
        El acceso a este sitio es gratuito y atribuye la condición de usuario, que se compromete a hacer un uso adecuado de
        sus contenidos. Las compras se rigen por las <a href="/condiciones">condiciones de venta</a>.
      </p>

      <h2>Propiedad intelectual e industrial</h2>
      <p>
        Los textos, diseños, logotipos y código de este sitio pertenecen a {site.name} o se usan con autorización. Las marcas
        de terceros que aparecen en los productos (por ejemplo, Google) pertenecen a sus titulares; {site.name} no está
        afiliada ni patrocinada por ellos.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        {site.name} no se hace responsable del uso indebido de los contenidos ni de los daños derivados de interrupciones
        técnicas ajenas a su control. Los enlaces a sitios de terceros se ofrecen solo a título informativo.
      </p>

      <h2>Legislación aplicable</h2>
      <p>Este sitio se rige por la legislación española.</p>
    </LegalPage>
  );
}
