import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Products } from '@/components/Products';
import { HowItWorks } from '@/components/HowItWorks';
import { Benefits } from '@/components/Benefits';
import { Calculator } from '@/components/Calculator';
import { Testimonials } from '@/components/Testimonials';
import { CrossSell } from '@/components/CrossSell';
import { FAQ } from '@/components/FAQ';
import { ContactCTA } from '@/components/ContactCTA';
import { Footer } from '@/components/Footer';
import { faqs } from '@/lib/faqs';

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Header />
      <main>
        <Hero />
        <Products />
        <HowItWorks />
        <Benefits />
        <Calculator />
        <Testimonials />
        <CrossSell />
        <FAQ />
        <ContactCTA />
      </main>
      <Footer />
    </>
  );
}
