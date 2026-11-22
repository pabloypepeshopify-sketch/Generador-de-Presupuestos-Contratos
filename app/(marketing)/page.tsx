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

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problema />
      <QueHacemos />
      <Sectores />
      <ComoTrabajamos />
      <Planes />
      <PorQue />
      <Testimonios />
      <PortalPreview />
      <FAQ />
      <Diagnostico />
      <Visita />
    </>
  );
}
