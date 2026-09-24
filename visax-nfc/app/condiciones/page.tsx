import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { site } from '@/lib/site.config';
import { TIERS, eur } from '@/lib/pricing';

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
        Los precios se muestran en euros con el IVA incluido. Se aplica un descuento automático por unidades del mismo
        producto:{' '}
        {[...TIERS]
          .reverse()
          .map((t) => `${t.min} o más, −${Math.round(t.off * 100)} %`)
          .join('; ')}
        . Los gastos de envío se muestran antes de pagar.
      </p>

      <h2>Pedido y pago</h2>
      <p>
        El pedido se completa al pagar con tarjeta, Apple Pay o Google Pay a través de Stripe, que procesa el pago de forma
        segura. Recibirás un email de confirmación. Durante el pago nos indicas el nombre de tu negocio y el enlace que
        grabaremos en el NFC; si no lo indicas, lo buscamos y te lo confirmamos antes de enviar.
      </p>

      <h2>Programación y envío</h2>
      <ul>
        <li>Preparación y programación: {site.shipping.prep}.</li>
        <li>
          Envío a {site.shipping.zone}: {site.shipping.eta}. Coste {eur(site.shipping.cost)}; gratis en pedidos desde{' '}
          {eur(site.shipping.freeFrom)}.
        </li>
        <li>Para Canarias, Ceuta o Melilla, consúltanos antes de pedir.</li>
      </ul>

      <h2>Desistimiento y devoluciones</h2>
      <p>
        Si compras como consumidor, dispones de 14 días naturales desde la recepción para desistir de la compra, salvo en
        los productos confeccionados conforme a tus especificaciones o claramente personalizados (art. 103 c del Real
        Decreto Legislativo 1/2007). Escríbenos a <a href={`mailto:${site.email}`}>{site.email}</a> y te indicamos cómo
        devolverlo. El reembolso se hace por el mismo medio de pago en un máximo de 14 días desde que recibimos el producto.
      </p>

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
