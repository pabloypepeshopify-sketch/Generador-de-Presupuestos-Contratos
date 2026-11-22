import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import '@/styles/tokens.css';
import './globals.css';
import { site } from '@/lib/site.config';
import { Motion } from '@/components/providers/Motion';

// Geist (OFL), servida desde el propio repo: sin depender de Google Fonts al compilar.
const sans = localFont({
  src: './fonts/Geist-Variable.woff2',
  weight: '100 900',
  variable: '--font-sans',
  display: 'swap',
});

const mono = localFont({
  src: './fonts/GeistMono-Variable.woff2',
  weight: '100 900',
  variable: '--font-mono',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} · ${site.seoTitle}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  keywords: [
    'socio tecnológico',
    'socio tecnológico para empresas',
    'transformación digital pymes',
    'inteligencia artificial para empresas',
    'departamento tecnológico externo',
    'automatización de procesos',
    'consultoría tecnológica Cádiz',
    'transformación digital Cádiz',
    'inteligencia artificial Sanlúcar de Barrameda',
    'tecnología para pymes Sevilla',
    'VISAX AI',
  ],
  authors: [{ name: site.name }],
  creator: site.name,
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: site.url,
    siteName: site.name,
    title: `${site.name} · ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} · ${site.tagline}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  category: 'technology',
};

export const viewport: Viewport = {
  themeColor: '#06060B',
  width: 'device-width',
  initialScale: 1,
};

// Datos estructurados: la organización y el negocio local (datos reales de contacto).
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${site.url}/#organizacion`,
      name: site.name,
      url: site.url,
      logo: `${site.url}/icon-512.png`,
      email: site.email,
      telephone: site.phoneRaw,
      slogan: site.tagline,
      founder: site.founders.map((f) => ({ '@type': 'Person', name: f.name })),
      sameAs: [site.nfcUrl],
    },
    {
      '@type': 'ProfessionalService',
      '@id': `${site.url}/#negocio`,
      name: site.name,
      description: site.description,
      url: site.url,
      image: `${site.url}/icon-512.png`,
      telephone: site.phoneRaw,
      email: site.email,
      parentOrganization: { '@id': `${site.url}/#organizacion` },
      address: {
        '@type': 'PostalAddress',
        addressLocality: site.zona.base,
        addressRegion: 'Cádiz',
        addressCountry: 'ES',
      },
      areaServed: site.zona.provincias.map((p) => ({ '@type': 'AdministrativeArea', name: `Provincia de ${p.nombre}` })),
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '19:00',
        },
      ],
      knowsAbout: ['Inteligencia artificial', 'Automatización de procesos', 'Transformación digital', 'Desarrollo web', 'Software a medida'],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Motion>{children}</Motion>
      </body>
    </html>
  );
}
