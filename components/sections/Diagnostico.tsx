import { CalendarDays, Mail, MessageCircle, Phone } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { DiagnosticoForm } from '@/components/sections/DiagnosticoForm';
import { site } from '@/lib/site.config';

/** Contacto principal: solicitar el diagnóstico inicial (llega por correo vía n8n). */
export function Diagnostico() {
  const telefonos = [
    { label: 'Llámanos', num: site.phone, raw: site.phoneRaw },
    { label: 'O también al', num: site.callPhone, raw: site.callPhoneRaw },
  ];
  return (
    <section id="diagnostico" aria-labelledby="diagnostico-title" className="section relative overflow-hidden">
      <div
        className="pointer-events-none absolute right-0 top-1/4 -z-10 h-[50vh] w-[50vh] rounded-full bg-[radial-gradient(circle,rgba(63,125,251,0.14),transparent_70%)]"
        aria-hidden="true"
      />
      <div className="container-x grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <SectionHeading
            id="diagnostico-title"
            eyebrow="Empecemos"
            title="Solicita tu"
            accent="diagnóstico inicial."
            size="md"
            intro="Cuéntanos un poco sobre tu empresa y qué te gustaría mejorar. Te contestamos para preparar el diagnóstico contigo."
          />

          <ul className="mt-10 grid gap-3">
            {telefonos.map((t) => (
              <li key={t.raw}>
                <a
                  href={`tel:${t.raw}`}
                  className="card-fx flex items-center gap-4 rounded-card border border-ink-line bg-bg-soft/60 p-4"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
                    <Phone className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-xs uppercase tracking-widest text-ink-faint">{t.label}</span>
                    <span className="block text-2xl font-semibold tracking-tight">{t.num}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <a
              href={`mailto:${site.email}`}
              className="flex min-w-0 items-center gap-3 rounded-card border border-ink-line bg-bg-soft/60 p-4 text-sm text-ink-soft transition hover:text-ink"
            >
              <Mail className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <span className="truncate">{site.email}</span>
            </a>
            {site.whatsapp && (
              <a
                href={`https://wa.me/${site.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-card border border-ink-line bg-bg-soft/60 p-4 text-sm text-ink-soft transition hover:text-ink"
              >
                <MessageCircle className="h-5 w-5 shrink-0 text-[#25D366]" aria-hidden="true" /> Escríbenos por WhatsApp
              </a>
            )}
          </div>

          <a
            href="/#visita"
            className="mt-3 flex items-center gap-3 rounded-card border border-dashed border-ink-strong p-4 text-sm text-ink-soft transition hover:text-ink"
          >
            <CalendarDays className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <span>
              ¿Prefieres que vayamos a verte? <strong className="font-semibold text-ink">Reserva una visita</strong>
            </span>
          </a>
        </div>

        <DiagnosticoForm />
      </div>
    </section>
  );
}
