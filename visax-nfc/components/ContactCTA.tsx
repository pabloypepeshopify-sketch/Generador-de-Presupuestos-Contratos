import { Mail, MessageCircle, Phone } from 'lucide-react';
import { site } from '@/lib/site.config';

/** Cierre: pedidos grandes, varios locales o dudas → WhatsApp, teléfono o email. */
export function ContactCTA() {
  return (
    <section id="contacto" className="section">
      <div className="container-x">
        <div className="flex flex-col items-start justify-between gap-8 rounded-[calc(var(--radius)*1.6)] border border-ink-line bg-bg-soft/60 p-8 sm:p-12 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h2 className="font-display text-4xl leading-tight sm:text-5xl">
              ¿Varios locales o <span className="text-gradient italic">un pedido grande</span>?
            </h2>
            <p className="mt-4 text-ink-soft">Te preparamos un presupuesto a medida. Escríbenos y te respondemos hoy.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto">
            <a
              href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent('Hola, quiero un presupuesto de NFC para mi negocio.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 font-semibold text-[#06060B]"
            >
              <MessageCircle className="h-5 w-5" /> WhatsApp
            </a>
            <a href={`tel:${site.phoneRaw}`} className="flex items-center justify-center gap-2 rounded-full border border-ink-line px-6 py-3.5 font-semibold transition hover:border-brand-violet/60">
              <Phone className="h-4 w-4" /> {site.phone}
            </a>
            <a href={`mailto:${site.email}`} className="flex items-center justify-center gap-2 text-sm text-ink-soft transition hover:text-white">
              <Mail className="h-4 w-4" /> {site.email}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
