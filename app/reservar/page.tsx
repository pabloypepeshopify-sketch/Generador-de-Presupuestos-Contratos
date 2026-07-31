import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Schedule } from '@/components/Schedule';

export const metadata: Metadata = {
  title: 'Reservar reunión',
  description:
    'Reserva una llamada gratuita con VISAX AI y descubre qué puedes automatizar en tu negocio con Inteligencia Artificial. Sin compromiso.',
};

export default function ReservarPage() {
  return (
    <>
      <Header />
      <main className="pt-32">
        <div className="container-x">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ink-soft transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
        </div>
        <Schedule />
      </main>
      <Footer />
    </>
  );
}
