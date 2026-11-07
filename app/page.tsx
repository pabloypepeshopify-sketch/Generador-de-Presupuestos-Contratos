import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Marquee } from '@/components/Marquee';
import { Services } from '@/components/Services';
import { HowItWorks } from '@/components/HowItWorks';
import { WhyAutomate } from '@/components/WhyAutomate';
import { UseCases } from '@/components/UseCases';
import { WebsSection } from '@/components/WebsSection';
import { Founders } from '@/components/Founders';
import { NfcSection } from '@/components/NfcSection';
import { Schedule } from '@/components/Schedule';
import { Contact } from '@/components/Contact';
import { FAQ } from '@/components/FAQ';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Marquee />
        <Services />
        <UseCases />
        <HowItWorks />
        <WhyAutomate />
        <WebsSection />
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
