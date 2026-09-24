import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { productBySlug } from '@/lib/products';
import { MAX_QTY, discountFor, shippingFor, unitPrice } from '@/lib/pricing';
import { site } from '@/lib/site.config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { items?: Array<{ slug?: unknown; qty?: unknown }> };

/**
 * Crea una sesión de Stripe Checkout. El precio NUNCA viene del navegador:
 * se recalcula aquí con el catálogo, los descuentos por cantidad y el envío.
 * Sin STRIPE_SECRET_KEY responde 503 y el carrito ofrece el pedido por WhatsApp.
 */
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const items = (body.items ?? [])
    .map((i) => ({ product: typeof i.slug === 'string' ? productBySlug(i.slug) : undefined, qty: Number(i.qty) }))
    .filter((i) => i.product && Number.isInteger(i.qty) && i.qty >= 1 && i.qty <= MAX_QTY);
  if (!items.length) return NextResponse.json({ error: 'empty_cart' }, { status: 400 });

  const origin = req.headers.get('origin') ?? site.url;
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(({ product, qty }) => {
    const off = discountFor(qty);
    return {
      quantity: qty,
      price_data: {
        currency: 'eur',
        unit_amount: unitPrice(product!.price, qty),
        tax_behavior: 'inclusive',
        product_data: {
          name: product!.name,
          description: off ? `Descuento por cantidad −${Math.round(off * 100)} % aplicado` : 'Programado con tu enlace',
          images: [`${origin}${product!.image}`],
        },
      },
    };
  });
  const subtotal = items.reduce((s, { product, qty }) => s + unitPrice(product!.price, qty) * qty, 0);
  const shipping = shippingFor(subtotal);

  const kinds = new Set(items.map((i) => i.product!.linkKind));
  const customFields: Stripe.Checkout.SessionCreateParams.CustomField[] = [
    { key: 'negocio', type: 'text', label: { type: 'custom', custom: 'Nombre de tu negocio' }, text: { maximum_length: 120 } },
  ];
  if (kinds.has('review'))
    customFields.push({
      key: 'enlace_resenas',
      type: 'text',
      optional: true,
      label: { type: 'custom', custom: 'Enlace de reseñas de Google (opcional)' },
      text: { maximum_length: 255 },
    });
  if (kinds.has('menu'))
    customFields.push({
      key: 'enlace_carta',
      type: 'text',
      optional: true,
      label: { type: 'custom', custom: 'Enlace de tu carta digital (opcional)' },
      text: { maximum_length: 255 },
    });

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'es',
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: ['ES'] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: shipping ? `Envío ${site.shipping.eta}` : `Envío gratis ${site.shipping.eta}`,
            fixed_amount: { amount: shipping, currency: 'eur' },
            tax_behavior: 'inclusive',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 5 },
            },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'auto',
      custom_fields: customFields,
      custom_text: {
        submit: {
          message:
            '¿No sabes tu enlace de reseñas o de la carta? Déjalo en blanco: lo buscamos nosotros y te escribimos antes de enviar.',
        },
      },
      metadata: { pedido: items.map((i) => `${i.qty}x ${i.product!.slug}`).join(', ') },
      success_url: `${origin}/gracias?pedido={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#productos`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[checkout]', err);
    return NextResponse.json({ error: 'stripe_error' }, { status: 502 });
  }
}
