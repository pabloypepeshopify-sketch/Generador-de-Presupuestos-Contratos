import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/layout/LegalPage';
import { Pending } from '@/components/ui/Pending';
import { site } from '@/lib/site.config';

export const metadata: Metadata = {
  title: 'Política de cookies',
  description: `Qué cookies usa la web de ${site.name}.`,
  alternates: { canonical: '/cookies' },
  robots: { index: false, follow: true },
};

export default function CookiesPage() {
  return (
    <LegalPage title="Política de cookies" updated="noviembre de 2026">
      <Pending>TODO: confirmar · si algún día se añade analítica o publicidad, actualizar esta página y poner aviso de cookies</Pending>
      <section>
        <h2>1. ¿Usamos cookies?</h2>
        <p>
          Esta web no instala cookies de publicidad, de analítica ni de redes sociales, y no guarda datos en tu navegador para
          seguirte. Por eso no te mostramos ningún aviso de cookies.
        </p>
      </section>
      <section>
        <h2>2. Servicios de terceros</h2>
        <p>
          Si pulsas en el botón de WhatsApp o en un enlace a otra web, saldrás de este sitio y se aplicarán las políticas de
          ese servicio.
        </p>
      </section>
      <section>
        <h2>3. Más información</h2>
        <p>
          Para cualquier duda sobre tus datos, consulta la <Link href="/privacidad">política de privacidad</Link> o
          escríbenos a <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
