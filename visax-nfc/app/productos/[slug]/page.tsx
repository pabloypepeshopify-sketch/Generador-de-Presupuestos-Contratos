import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, PackageCheck, Truck } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductBuy } from '@/components/ProductBuy';
import { productBySlug, products } from '@/lib/products';
import { eur } from '@/lib/pricing';
import { site } from '@/lib/site.config';

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = productBySlug(params.slug);
  if (!p) return {};
  return {
    title: p.name,
    description: `${p.tagline} ${eur(p.price)} IVA incluido. Te llega programado con tu enlace.`,
    alternates: { canonical: `${site.url}/productos/${p.slug}` },
    openGraph: { images: [{ url: p.image }] },
  };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const p = productBySlug(params.slug);
  if (!p) notFound();

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: `${site.url}${p.image}`,
    brand: { '@type': 'Brand', name: site.name },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: (p.price / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
      url: `${site.url}/productos/${p.slug}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Header />
      <main className="container-x pb-24 pt-32">
        <Link href="/#productos" className="inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Todos los productos
        </Link>
        <div className="mt-8 grid gap-12 lg:grid-cols-2">
          <ProductGallery product={p} />
          <div>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">{p.name}</h1>
            <p className="mt-4 text-lg text-ink-soft">{p.tagline}</p>
            <div className="mt-8">
              <ProductBuy product={p} />
            </div>
            <ul className="mt-8 space-y-2.5">
              {p.bullets.map((b) => (
                <li key={b} className="flex gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" /> {b}
                </li>
              ))}
            </ul>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="flex gap-3 rounded-2xl border border-ink-line p-4 text-sm">
                <PackageCheck className="h-5 w-5 shrink-0 text-brand-cyan" />
                <span>
                  <strong className="block">Programado y probado</strong>
                  <span className="text-ink-soft">Preparado en {site.shipping.prep}</span>
                </span>
              </div>
              <div className="flex gap-3 rounded-2xl border border-ink-line p-4 text-sm">
                <Truck className="h-5 w-5 shrink-0 text-brand-cyan" />
                <span>
                  <strong className="block">Envío {site.shipping.eta}</strong>
                  <span className="text-ink-soft">
                    {eur(site.shipping.cost)} · gratis desde {eur(site.shipping.freeFrom)}
                  </span>
                </span>
              </div>
            </div>
            <div className="mt-10 border-t border-ink-line pt-8">
              <h2 className="font-display text-2xl">Descripción</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">{p.description}</p>
              <h2 className="mt-8 font-display text-2xl">Qué incluye</h2>
              <ul className="mt-3 space-y-2 text-ink-soft">
                {p.includes.map((x) => (
                  <li key={x} className="flex gap-3">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-brand-cyan" /> {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
