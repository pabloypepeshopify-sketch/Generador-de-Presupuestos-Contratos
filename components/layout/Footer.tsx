import Link from 'next/link';
import { ArrowUpRight, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { nav } from '@/lib/nav';
import { site } from '@/lib/site.config';

const legal = [
  { label: 'Aviso legal', href: '/aviso-legal' },
  { label: 'Privacidad', href: '/privacidad' },
  { label: 'Cookies', href: '/cookies' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-ink-line pt-20">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[50vh] bg-[radial-gradient(50%_60%_at_50%_0%,rgba(63,125,251,0.12),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="container-x relative">
        {/* Cierre */}
        <div className="flex flex-col items-start justify-between gap-8 pb-16 md:flex-row md:items-center">
          <p className="max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Tu socio tecnológico.
            <br />
            <span className="text-gradient">Tu empresa, en constante evolución.</span>
          </p>
          <Button href="/#diagnostico" variant="primary">
            Solicita tu diagnóstico inicial
          </Button>
        </div>

        <div className="grid gap-10 border-t border-ink-line py-14 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1.2fr]">
          <div className="flex flex-col gap-5 sm:col-span-2 md:col-span-1">
            <Logo className="h-7" />
            <p className="max-w-xs text-sm leading-relaxed text-ink-soft">
              Analizamos, modernizamos y optimizamos empresas con inteligencia artificial y tecnología. Desde{' '}
              {site.zona.base}, para toda la provincia de Cádiz y Sevilla.
            </p>
          </div>

          <nav aria-label="Pie de página">
            <p className="eyebrow mb-5">La web</p>
            <ul className="flex flex-col gap-3 text-sm text-ink-soft">
              {nav.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="transition hover:text-ink">
                    {n.label}
                  </a>
                </li>
              ))}
              <li>
                <a href="/#visita" className="transition hover:text-ink">
                  Reservar una visita
                </a>
              </li>
              <li>
                <Link href="/acceso" className="transition hover:text-ink">
                  Acceso clientes
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="eyebrow mb-5">Contacto</p>
            <ul className="flex flex-col gap-3 text-sm text-ink-soft">
              <li>
                <a href={`tel:${site.phoneRaw}`} className="flex items-center gap-2 transition hover:text-ink">
                  <Phone className="h-4 w-4 text-accent" aria-hidden="true" /> {site.phone}
                </a>
              </li>
              <li>
                <a href={`tel:${site.callPhoneRaw}`} className="flex items-center gap-2 transition hover:text-ink">
                  <Phone className="h-4 w-4 text-accent" aria-hidden="true" /> {site.callPhone}
                </a>
              </li>
              <li>
                <a href={`mailto:${site.email}`} className="flex items-center gap-2 break-all transition hover:text-ink">
                  <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> {site.email}
                </a>
              </li>
              {site.whatsapp && (
                <li>
                  <a
                    href={`https://wa.me/${site.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 transition hover:text-ink"
                  >
                    <MessageCircle className="h-4 w-4 text-[#25D366]" aria-hidden="true" /> WhatsApp
                  </a>
                </li>
              )}
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {site.zona.base} (Cádiz)
              </li>
            </ul>
          </div>
        </div>

        {/* Logotipo gigante en fantasma */}
        <div
          className="pointer-events-none select-none pb-4 pt-2 text-white opacity-[0.07] [mask-image:linear-gradient(to_bottom,#000_30%,transparent)]"
          aria-hidden="true"
        >
          <Logo variant="word" className="mx-auto w-[92%]" />
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-ink-line py-8 text-xs text-ink-faint md:flex-row">
          <p>
            © <span suppressHydrationWarning>{year}</span> {site.name} · {site.tagline}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {legal.map((l) => (
              <Link key={l.href} href={l.href} className="transition hover:text-ink">
                {l.label}
              </Link>
            ))}
            <a
              href={site.nfcUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 transition hover:text-ink"
            >
              VISAX NFC <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
