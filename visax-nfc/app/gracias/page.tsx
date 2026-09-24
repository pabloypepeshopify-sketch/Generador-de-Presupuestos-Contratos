import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ClearCart } from '@/components/cart/ClearCart';
import { site } from '@/lib/site.config';

export const metadata: Metadata = { title: 'Pedido recibido', robots: { index: false } };

export default function ThanksPage() {
  return (
    <>
      <ClearCart />
      <Header />
      <main className="container-x flex min-h-[80svh] flex-col items-center justify-center pb-20 pt-32 text-center">
        <CheckCircle2 className="h-16 w-16 text-[#34A853]" />
        <h1 className="mt-6 font-display text-5xl">¡Pedido recibido!</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Te hemos enviado el recibo por email. Programamos tu NFC con el enlace que nos has indicado y sale hacia ti en{' '}
          {site.shipping.prep}. Si nos faltaba el enlace, te escribimos antes de enviarlo.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="rounded-full border border-ink-line px-6 py-3 font-semibold transition hover:border-brand-violet/60">
            Volver al inicio
          </Link>
          <a
            href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent('Hola, acabo de hacer un pedido en VISAX NFC.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-semibold text-[#06060B]"
          >
            <MessageCircle className="h-5 w-5" /> ¿Alguna duda? WhatsApp
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
