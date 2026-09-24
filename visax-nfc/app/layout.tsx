import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { site } from '@/lib/site.config';
import { products } from '@/lib/products';
import { SmoothScroll } from '@/components/providers/SmoothScroll';
import { CustomCursor } from '@/components/providers/CustomCursor';
import { CartProvider } from '@/components/cart/CartProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { FloatingHelp } from '@/components/FloatingHelp';

const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  keywords: [
    'expositor NFC reseñas Google',
    'tarjeta NFC menú',
    'carta digital NFC',
    'más reseñas Google',
    'NFC hostelería',
    'VISAX NFC',
  ],
  authors: [{ name: site.name }],
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: { card: 'summary_large_image', title: `${site.name} — ${site.tagline}`, description: site.description },
  robots: { index: true, follow: true },
  alternates: { canonical: site.url },
};

export const viewport: Viewport = { themeColor: '#06060B', width: 'device-width', initialScale: 1 };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: site.name,
  description: site.description,
  url: site.url,
  telephone: site.phoneRaw,
  email: site.email,
  areaServed: 'ES',
  address: { '@type': 'PostalAddress', streetAddress: site.legal.address, addressCountry: 'ES' },
  makesOffer: products.map((p) => ({
    '@type': 'Offer',
    priceCurrency: 'EUR',
    price: (p.price / 100).toFixed(2),
    itemOffered: { '@type': 'Product', name: p.name, url: `${site.url}/productos/${p.slug}` },
  })),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="grain" aria-hidden="true" />
        <CustomCursor />
        <CartProvider>
          <SmoothScroll>
            {children}
            <FloatingHelp />
          </SmoothScroll>
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
