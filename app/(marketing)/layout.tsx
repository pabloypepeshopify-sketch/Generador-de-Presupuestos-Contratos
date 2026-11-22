import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FloatingCTA } from '@/components/layout/FloatingCTA';
import { ScrollProgress } from '@/components/layout/ScrollProgress';

/** Web pública: cabecera, pie y botones flotantes. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-[10000] rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#06060B] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <ScrollProgress />
      <div className="grain" aria-hidden="true" />
      <Header />
      <main id="contenido">{children}</main>
      <Footer />
      <FloatingCTA />
    </>
  );
}
