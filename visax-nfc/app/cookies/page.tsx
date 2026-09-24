import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { site } from '@/lib/site.config';

export const metadata: Metadata = { title: 'Política de cookies' };

export default function Cookies() {
  return (
    <LegalPage title="Política de cookies" updated="septiembre de 2026">
      <p>
        {site.name} no usa cookies de publicidad ni de analítica. Solo guarda en tu navegador (almacenamiento local) lo
        imprescindible para que la tienda funcione:
      </p>
      <ul>
        <li>
          <strong>Carrito:</strong> los productos y cantidades que añades, para no perderlos si recargas la página.
        </li>
        <li>
          <strong>Avisos:</strong> si ya has cerrado el aviso de ayuda, para no volver a mostrártelo.
        </li>
      </ul>
      <p>
        Al pagar pasas a la página segura de Stripe, que puede usar sus propias cookies técnicas para procesar el pago y
        prevenir el fraude. Puedes borrar estos datos cuando quieras desde la configuración de tu navegador.
      </p>
    </LegalPage>
  );
}
