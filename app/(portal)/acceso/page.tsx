import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock3, Mail, Phone } from 'lucide-react';
import { site } from '@/lib/site.config';
import { portal } from '@/content/home';

export const metadata: Metadata = {
  title: 'Acceso clientes',
  description: 'El portal de clientes de VISAX AI estará disponible próximamente.',
  alternates: { canonical: '/acceso' },
  robots: { index: false, follow: true },
};

/**
 * Entrada al futuro portal. Honesta: sin login falso ni campos de contraseña
 * que no funcionan. Cuando exista el portal, aquí irá el inicio de sesión real.
 */
export default function AccesoPage() {
  return (
    <div className="relative flex flex-1 items-center overflow-hidden py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="hero-aurora opacity-70" />
        <div className="hero-grid absolute inset-0" />
      </div>

      <div className="container-x grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-ink-line bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-ink-soft">
            <Clock3 className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> Próximamente
          </p>
          <h1 className="mt-6 text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.04] tracking-tightest">
            Portal de clientes
            <span className="block text-gradient pb-[0.06em]">en preparación.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            El portal de clientes estará disponible próximamente. Si ya eres cliente, contacta con nosotros y te atendemos
            directamente.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={`tel:${site.phoneRaw}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#06060B] shadow-glow transition hover:bg-brand-silver"
            >
              <Phone className="h-4 w-4" aria-hidden="true" /> {site.phone}
            </a>
            <a
              href={`tel:${site.callPhoneRaw}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink-line px-6 py-3.5 text-sm font-semibold transition hover:border-ink-strong"
            >
              <Phone className="h-4 w-4" aria-hidden="true" /> {site.callPhone}
            </a>
            <a
              href={`mailto:${site.email}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink-line px-6 py-3.5 text-sm font-semibold transition hover:border-ink-strong"
            >
              <Mail className="h-4 w-4" aria-hidden="true" /> Escríbenos
            </a>
          </div>

          <Link href="/#diagnostico" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
            ¿Aún no eres cliente? Solicita tu diagnóstico inicial <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="rounded-card-lg border border-ink-line bg-bg-soft/70 p-6 sm:p-8">
          <p className="eyebrow">Lo que podrás hacer desde tu espacio</p>
          <ul className="mt-5 flex flex-col gap-4">
            {portal.features.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient-soft text-accent">
                  <f.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold">{f.title}</span>
                  <span className="text-sm text-ink-soft">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
