import { CreditCard, PackageCheck, Smartphone } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { site } from '@/lib/site.config';

const steps = [
  {
    icon: CreditCard,
    title: 'Eliges y pagas',
    text: 'Añades al carrito y pagas seguro. En el pago nos dejas el nombre de tu negocio y tu enlace; si no lo sabes, lo buscamos nosotros.',
  },
  {
    icon: PackageCheck,
    title: 'Lo programamos y te lo enviamos',
    text: `Grabamos tu enlace en el chip, lo probamos y sale hacia ti en ${site.shipping.prep}. Llega en ${site.shipping.eta}.`,
  },
  {
    icon: Smartphone,
    title: 'Tus clientes tocan',
    text: 'Acercan el móvil y se abre tu página de reseñas o tu carta. Sin apps, sin buscarte en Google, sin enfocar un QR.',
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Cómo funciona"
          title={
            <>
              Tres pasos
              <br />
              <span className="text-gradient italic">y a sumar reseñas</span>
            </>
          }
        />
        <RevealGroup className="mt-14 grid gap-5 md:grid-cols-3" stagger={0.08}>
          {steps.map((s, i) => (
            <RevealItem key={s.title}>
              <div className="relative h-full rounded-[var(--radius)] border border-ink-line bg-bg-soft/60 p-7">
                <span className="absolute right-6 top-5 font-display text-5xl text-white/[0.06]">0{i + 1}</span>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-line bg-gradient-to-br from-white/[0.08] to-transparent text-brand-cyan">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.text}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
