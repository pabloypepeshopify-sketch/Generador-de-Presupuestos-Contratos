import type { Metadata } from 'next';
import { site } from '@/lib/site.config';
import { Hero } from '@/components/sections/Hero';
import { Problema } from '@/components/sections/Problema';
import { QueHacemos } from '@/components/sections/QueHacemos';
import { Sectores } from '@/components/sections/Sectores';
import { ComoTrabajamos } from '@/components/sections/ComoTrabajamos';
import { Planes } from '@/components/sections/Planes';
import { PorQue } from '@/components/sections/PorQue';
import { Testimonios } from '@/components/sections/Testimonios';
import { PortalPreview } from '@/components/sections/PortalPreview';
import { FAQ } from '@/components/sections/FAQ';
import { Diagnostico } from '@/components/sections/Diagnostico';
import { Visita } from '@/components/sections/Visita';

export const metadata: Metadata = {
  title: { absolute: `${site.name} · Socio tecnológico e inteligencia artificial para empresas en Cádiz y Sevilla` },
  description:
    'Tu socio tecnológico: analizamos tu empresa, detectamos qué mejorar y lo ponemos en marcha con inteligencia artificial, automatización y tecnología, con una suscripción mensual. Transformación digital para pymes desde Sanlúcar de Barrameda.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: site.name,
    url: site.url,
    title: `${site.name} · Tu empresa puede funcionar mejor`,
    description:
      'Analizamos, modernizamos y optimizamos empresas mediante inteligencia artificial y tecnología. Socio tecnológico para pymes en Cádiz y Sevilla.',
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problema />
      <QueHacemos />
      <Planes />
      <Sectores />
      <ComoTrabajamos />
      <PorQue />
      <Testimonios />
      <PortalPreview />
      <FAQ />
      <Diagnostico />
      <Visita />
    </>
  );
}
