import { ArrowUpRight, Nfc } from 'lucide-react';
import { site } from '@/lib/site.config';

/** Enlace a la tienda VISAX NFC (la misma casa), como la tienda enlaza aquí. */
export function NfcSection() {
  return (
    <section id="nfc" className="section">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[calc(var(--radius)*1.6)] border border-brand-violet/30 bg-brand-gradient-soft p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-violet/30 blur-[90px]" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="eyebrow flex items-center gap-2">
                <Nfc className="h-4 w-4 text-brand-cyan" /> También de VISAX
              </p>
              <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
                ¿Tienes un bar o un restaurante?{' '}
                <span className="text-gradient italic">Pásate al NFC</span>
              </h2>
              <p className="mt-4 max-w-xl text-ink-soft">
                En <strong className="text-white">VISAX NFC</strong> tienes placas y expositores listos para usar: carta
                digital y pedidos desde la mesa, llamar al camarero, WiFi, redes sociales y reseñas de Google con un toque
                del móvil. Te llegan programados.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <a
                href={site.nfcUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-[#06060B] transition hover:bg-brand-silver"
              >
                Ir a la tienda NFC <ArrowUpRight className="h-4 w-4" />
              </a>
              <p className="text-sm text-ink-soft">Envío en 24–72 h · Sin app ni batería.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
