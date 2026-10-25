import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Marquee } from '@/components/Marquee';
import { Services } from '@/components/Services';
import { HowItWorks } from '@/components/HowItWorks';
import { WhyAutomate } from '@/components/WhyAutomate';
import { Stats } from '@/components/Stats';
import { Testimonials } from '@/components/Testimonials';
import { Founders } from '@/components/Founders';
import { NfcSection } from '@/components/NfcSection';
import { Schedule } from '@/components/Schedule';
import { Contact } from '@/components/Contact';
import { FAQ } from '@/components/FAQ';
import { Footer } from '@/components/Footer';
import { Experience } from '@/components/Experience';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Experience />
        <Hero />
        <Marquee />
        <Services />
        <HowItWorks />
        <WhyAutomate />
        <Stats />
        <Testimonials />
        <NfcSection />
        <Founders />
        <Schedule />
        <Contact />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
