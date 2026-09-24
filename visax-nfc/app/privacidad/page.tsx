import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { site } from '@/lib/site.config';

export const metadata: Metadata = { title: 'Política de privacidad' };

export default function Privacidad() {
  const { holder, nif, address } = site.legal;
  return (
    <LegalPage title="Política de privacidad" updated="septiembre de 2026">
      <h2>Responsable del tratamiento</h2>
      <p>
        {holder} (NIF {nif}), {address}. Contacto: <a href={`mailto:${site.email}`}>{site.email}</a> · {site.phone}.
      </p>

      <h2>Qué datos tratamos y para qué</h2>
      <ul>
        <li>
          <strong>Pedidos:</strong> nombre, email, teléfono, dirección de envío, nombre del negocio, enlace a programar y,
          si lo indicas, NIF/CIF para la factura. Los usamos para preparar, programar, enviar y facturar tu pedido.
        </li>
        <li>
          <strong>Consultas:</strong> los datos que nos envíes por WhatsApp, email o teléfono, para responderte.
        </li>
      </ul>
      <p>
        No guardamos los datos de tu tarjeta: el pago lo procesa Stripe directamente.
      </p>

      <h2>Base legal</h2>
      <ul>
        <li>Ejecución del contrato de compraventa (pedidos y envíos).</li>
        <li>Cumplimiento de obligaciones legales (facturación y contabilidad).</li>
        <li>Tu consentimiento o interés legítimo al contactarnos (consultas).</li>
      </ul>

      <h2>Destinatarios</h2>
      <p>
        Stripe (procesamiento de pagos), la empresa de transporte (entrega del pedido) y Vercel (alojamiento de la web), que
        actúan como encargados del tratamiento. No vendemos ni cedemos tus datos a terceros para publicidad.
      </p>

      <h2>Conservación</h2>
      <p>
        Mientras dure la relación comercial y, después, durante los plazos que exige la ley (por ejemplo, la normativa
        fiscal y mercantil).
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a{' '}
        <a href={`mailto:${site.email}`}>{site.email}</a>. Si consideras que no hemos atendido bien tu solicitud, puedes
        reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd.es</a>).
      </p>
    </LegalPage>
  );
}
