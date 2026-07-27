'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, Mail, MessageCircle, Instagram, Linkedin, Youtube } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { site } from '@/lib/site.config';

const nav = [
  { label: 'Servicios', href: '#servicios' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Resultados', href: '#resultados' },
  { label: 'Reservar', href: '#reservar' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contacto', href: '#contacto' },
];

const socialIcons = [
  { key: 'instagram', Icon: Instagram, url: site.social.instagram },
  { key: 'linkedin', Icon: Linkedin, url: site.social.linkedin },
  { key: 'youtube', Icon: Youtube, url: site.social.youtube },
].filter((s) => s.url);

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-ink-line pt-20">
      <div className="pointer-events-none absolute -top-1/2 left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-brand-blue/10 blur-[140px]" />

      <div className="container-x relative">
        {/* CTA final */}
        <div className="flex flex-col items-start justify-between gap-8 pb-16 md:flex-row md:items-center">
          <h2 className="max-w-xl font-display text-4xl leading-tight sm:text-5xl">
            Pon tu negocio en <span className="text-gradient italic">piloto automático</span>.
          </h2>
          <MagneticButton href="#reservar" variant="primary" cursorLabel="Reservar">
            Reservar reunión
          </MagneticButton>
        </div>

        <div className="grid gap-10 border-t border-ink-line py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-ink-soft">{site.description}</p>
            {socialIcons.length > 0 && (
              <div className="flex gap-3">
                {socialIcons.map(({ key, Icon, url }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={key}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-line text-ink-soft transition hover:border-brand-blue/40 hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="eyebrow mb-5">Navegación</p>
            <ul className="flex flex-col gap-3">
              {nav.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="text-sm text-ink-soft transition hover:text-white">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-5">Contacto</p>
            <ul className="flex flex-col gap-3 text-sm text-ink-soft">
              <li>
                <a href={`tel:${site.phoneRaw}`} className="flex items-center gap-2 transition hover:text-white">
                  <Phone className="h-4 w-4 text-brand-cyan" /> {site.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${site.email}`} className="flex items-center gap-2 transition hover:text-white">
                  <Mail className="h-4 w-4 text-brand-cyan" /> {site.email}
                </a>
              </li>
              {site.whatsapp && (
                <li>
                  <a
                    href={`https://wa.me/${site.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 transition hover:text-white"
                  >
                    <MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Gran logotipo revelado */}
        <div className="overflow-hidden py-6">
          <motion.p
            initial={{ y: '110%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="select-none bg-gradient-to-b from-white/10 to-white/[0.02] bg-clip-text text-center font-display text-[18vw] font-semibold leading-none text-transparent"
          >
            VISAX AI
          </motion.p>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-ink-line py-8 text-xs text-ink-faint sm:flex-row">
          <p>
            © {year} {site.legalName}. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <Link href="/aviso-legal" className="transition hover:text-white">
              Aviso legal
            </Link>
            <Link href="/privacidad" className="transition hover:text-white">
              Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
