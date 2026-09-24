import Link from 'next/link';
import { ArrowUpRight, Mail, MessageCircle, Phone } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { products } from '@/lib/products';
import { site } from '@/lib/site.config';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden border-t border-ink-line pt-20">
      <div className="pointer-events-none absolute -top-1/2 left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-brand-blue/10 blur-[140px]" />
      <div className="container-x relative">
        <div className="grid gap-10 pb-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-ink-soft">{site.description}</p>
          </div>
          <div>
            <p className="eyebrow mb-5">Productos</p>
            <ul className="flex flex-col gap-3 text-sm">
              {products.map((p) => (
                <li key={p.slug}>
                  <Link href={`/productos/${p.slug}`} className="text-ink-soft transition hover:text-white">
                    {p.shortName}
                  </Link>
                </li>
              ))}
              <li>
                <a href={site.aiUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-ink-soft transition hover:text-white">
                  Automatizaciones IA <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-5">Ayuda</p>
            <ul className="flex flex-col gap-3 text-sm">
              <li><a href="/#como-funciona" className="text-ink-soft transition hover:text-white">Cómo funciona</a></li>
              <li><a href="/#preguntas" className="text-ink-soft transition hover:text-white">Preguntas frecuentes</a></li>
              <li><Link href="/condiciones" className="text-ink-soft transition hover:text-white">Envíos y devoluciones</Link></li>
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
                <a href={`mailto:${site.email}`} className="flex items-center gap-2 break-all transition hover:text-white">
                  <Mail className="h-4 w-4 shrink-0 text-brand-cyan" /> {site.email}
                </a>
              </li>
              <li>
                <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition hover:text-white">
                  <MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="overflow-hidden py-6" aria-hidden="true">
          <div className="select-none text-white opacity-[0.06] [mask-image:linear-gradient(to_bottom,#000,rgba(0,0,0,0.3))]">
            <Logo variant="word" className="mx-auto w-[88%]" />
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-ink-line py-8 text-xs text-ink-soft sm:flex-row">
          <p>
            © {year} {site.name} · {site.legal.holder}
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/aviso-legal" className="transition hover:text-white">Aviso legal</Link>
            <Link href="/privacidad" className="transition hover:text-white">Privacidad</Link>
            <Link href="/condiciones" className="transition hover:text-white">Condiciones de venta</Link>
            <Link href="/cookies" className="transition hover:text-white">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
