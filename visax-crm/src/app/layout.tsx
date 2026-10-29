import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Avisos, AvisoDeUrl } from '@/components/cliente';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'VISAX AI CRM', template: '%s · VISAX AI CRM' },
  description: 'CRM comercial de VISAX AI',
  robots: { index: false, follow: false },
  icons: { icon: '/marca.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#08080d',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Para poder instalarla como aplicación (Chrome/Edge: «Instalar»; iPhone: «Añadir a pantalla de inicio»).
            Va aquí y no en `metadata` porque Next envía los metadatos dentro del <body> y Chrome solo busca el
            manifiesto en el <head>. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icono-180.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="VISAX CRM" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <Avisos>
          {children}
          <Suspense>
            <AvisoDeUrl />
          </Suspense>
        </Avisos>
      </body>
    </html>
  );
}
