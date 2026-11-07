import { ArrowRight, ArrowUpRight, Check, Globe } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { site } from '@/lib/site.config';

/** Servicio secundario: páginas web. Con nuestras dos webs como ejemplo real. */
const puntos = [
  'Diseño a medida, con tu imagen',
  'Rápida y pensada primero para el móvil',
  'Con tu dominio y preparada para salir en Google',
  'Con reservas, formularios o pagos conectados a tus automatizaciones',
];

const ejemplos = [
  { url: site.nfcUrl, nombre: 'visaxnfc.es', que: 'Tienda online de NFC para bares y restaurantes, con pago con tarjeta' },
];

export function WebsSection() {
  return (
    <section id="webs" className="section">
      <div className="container-x grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <SectionHeading
            eyebrow="También hacemos páginas web"
            title={
              <>
                ¿Tu negocio necesita web?
                <br />
                <span className="text-gradient italic">Te la hacemos</span>
              </>
            }
            intro="Además de automatizar, diseñamos y publicamos webs modernas para negocios. Te damos el precio cerrado antes de empezar."
          />
          <ul className="mt-8 space-y-3">
            {puntos.map((p) => (
              <li key={p} className="flex items-start gap-3 text-ink-soft">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-cyan" /> {p}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <MagneticButton href="/#reservar" variant="secondary">
              Pide presupuesto de tu web <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-ink-line bg-bg-soft/70 p-6 sm:p-7">
          <p className="eyebrow flex items-center gap-2">
            <Globe className="h-4 w-4 text-brand-cyan" /> Hechas por nosotros
          </p>
          <ul className="mt-5 flex flex-col gap-3">
            <li className="rounded-2xl border border-ink-line bg-bg-raise p-4">
              <span className="block font-display text-xl">visaxai.es</span>
              <span className="mt-1 block text-sm text-ink-soft">Esta web que estás viendo, con reservas conectadas al calendario</span>
            </li>
            {ejemplos.map((e) => (
              <li key={e.nombre}>
                <a
                  href={e.url}
                  target="_blank"
                  rel="noopener"
                  className="card-fx group flex items-center justify-between gap-4 rounded-2xl border border-ink-line bg-bg-raise p-4"
                >
                  <span>
                    <span className="block font-display text-xl">{e.nombre}</span>
                    <span className="mt-1 block text-sm text-ink-soft">{e.que}</span>
                  </span>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-ink-faint transition group-hover:text-white" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
