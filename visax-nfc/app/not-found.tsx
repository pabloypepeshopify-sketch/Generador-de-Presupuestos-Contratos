import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="container-x flex min-h-[70svh] flex-col items-center justify-center pt-32 text-center">
        <p className="font-display text-8xl text-gradient">404</p>
        <h1 className="mt-4 font-display text-3xl">Esta página no existe</h1>
        <Link href="/" className="mt-8 rounded-full bg-brand-gradient px-6 py-3 font-semibold">
          Volver a la tienda
        </Link>
      </main>
      <Footer />
    </>
  );
}
