import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { site } from '@/lib/site.config';
import { eur, tierSummary } from '@/lib/pricing';
import { products } from '@/lib/products';

export const metadata: Metadata = { title: 'Condiciones de venta, envíos y devoluciones' };

export default function Condiciones() {
  const { holder, nif, address } = site.legal;
  return (
    <LegalPage title="Condiciones de venta" updated="septiembre de 2026">
      <h2>Vendedor</h2>
      <p>
        {holder} (NIF {nif}), {address} — {site.name}. Contacto: <a href={`mailto:${site.email}`}>{site.email}</a> ·{' '}
        {site.phone}.
      </p>

      <h2>Productos y precios</h2>
      <p>
        Los precios se muestran en euros con el IVA incluido. Algunos productos tienen un precio por unidad más bajo
        según la cantidad que compres del mismo producto, que se aplica automáticamente:
      </p>
      <ul>
        {products
          .filter((p) => p.tiers?.length)
          .map((p) => (
            <li key={p.slug}>
              {p.shortName}: {eur(p.price)}/ud; {tierSummary(p)}.
            </li>
          ))}
      </ul>
      <p>
        Los productos que necesitan un software o sistema se venden como NFC y el software se contrata aparte: el de
        pedido en mesa va con tu carta digital (850 € + IVA, o 990 € + IVA con la página web) y el de llamar al camarero
        se presupuesta. La carta digital (300 € + IVA) y la web premium con carta digital premium (600 € + IVA) también
        se contratan aparte. La carta digital, la web y el software de pedidos tienen demo gratuita antes de contratar. El
        mantenimiento es opcional: 39 €/mes + IVA con todos los cambios que necesites, o 15 €/mes + IVA por un cambio de
        carta al mes.
        Los gastos de envío se muestran antes de pagar.
      </p>

      <h2>Pedido y pago</h2>
      <p>
        El pedido se completa al pagar con tarjeta, Apple Pay o Google Pay a través de Stripe, que procesa el pago de forma
        segura. Recibirás un email de confirmación. Durante el pago nos indicas el nombre de tu negocio y el enlace que
        grabaremos en el NFC; si no lo indicas, lo buscamos y te lo confirmamos antes de enviar.
      </p>

      <h2>Programación y envío</h2>
      <p>
        <strong>Solo hacemos envíos nacionales</strong>, a direcciones de España. No enviamos fuera de España.
      </p>
      <ul>
        <li>Preparamos y programamos cada pedido antes de enviarlo. El plazo de entrega te lo confirmamos al hacer el pedido.</li>
        <li>
          Envío a {site.shipping.zone} por {site.shipping.carrier}. Coste {eur(site.shipping.cost)}; gratis en pedidos desde{' '}
          {eur(site.shipping.freeFrom)}.
        </li>
        <li>Para Canarias, Ceuta o Melilla, consúltanos antes de pedir.</li>
      </ul>

      <h2>Desistimiento y devoluciones</h2>
      <p>
        Tienes <strong>14 días naturales</strong> desde que recibes el pedido para devolverlo sin dar explicaciones, seas
        particular o negocio.
      </p>
      <ul>
        <li>
          Avísanos dentro de ese plazo por email a <a href={`mailto:${site.email}`}>{site.email}</a>, por WhatsApp o con
          el formulario de abajo, y te indicamos dónde enviarlo.
        </li>
        <li>
          Envíanoslo en los 14 días siguientes a tu aviso, <strong>sin usar</strong>, en buen estado y a ser posible en su
          embalaje. Si el producto se ha usado o dañado más allá de lo necesario para comprobarlo, podremos descontar esa
          pérdida de valor.
        </li>
        <li>Los gastos de envío de la devolución corren de tu cuenta.</li>
        <li>
          Te devolvemos el importe pagado, incluido el envío original, por el mismo medio de pago y en un máximo de 14 días
          desde tu aviso. Podemos esperar a recibir el producto, o a que nos mandes el justificante de envío, antes de
          hacer el reembolso.
        </li>
      </ul>

      <h2>Formulario de desistimiento</h2>
      <p>Si quieres, copia este texto y envíanoslo a {site.email}:</p>
      <blockquote className="rounded-2xl border border-white/10 p-5 text-sm">
        A la atención de {holder}, {address}, {site.email}:
        <br />
        Por la presente le comunico que desisto de mi contrato de venta del siguiente bien: [producto y cantidad].
        <br />
        Pedido el / recibido el: [fechas]. Nombre: [tu nombre]. Dirección: [tu dirección].
        <br />
        Fecha y firma (solo si lo envías en papel).
      </blockquote>

      <h2>Garantía</h2>
      <p>
        Los productos cuentan con la garantía legal de conformidad. Si llegan dañados o no funcionan, escríbenos con una foto
        y lo solucionamos.
      </p>

      <h2>Legislación</h2>
      <p>Estas condiciones se rigen por la legislación española.</p>
    </LegalPage>
  );
}
