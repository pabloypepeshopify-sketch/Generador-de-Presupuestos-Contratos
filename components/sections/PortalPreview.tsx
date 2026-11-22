import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { TiltOnScroll } from '@/components/ui/TiltOnScroll';
import { portal } from '@/content/home';

const MENU = ['Inicio', 'Servicios activos', 'Incidencias', 'Historial de mejoras', 'Informes', 'Solicitudes'];

/** Adelanto del portal de clientes. Claramente marcado como «Próximamente»: hoy no funciona. */
export function PortalPreview() {
  return (
    <section id="portal" aria-labelledby="portal-title" className="section overflow-hidden">
      <div className="container-x grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeading
            id="portal-title"
            eyebrow="Portal de clientes · Próximamente"
            title="Todo lo de tu empresa,"
            accent="en un solo sitio."
            size="md"
            intro="Estamos preparando un espacio privado para cada cliente. Todavía no está disponible: mientras tanto, lo gestionamos todo contigo directamente."
          />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {portal.features.map((f) => (
              <li key={f.title} className="flex gap-3">
                <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <span>
                  <span className="block font-semibold">{f.title}</span>
                  <span className="text-sm text-ink-soft">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/acceso" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
            Ver acceso clientes <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Maqueta (decorativa). Sin datos: solo la estructura del futuro panel. */}
        <TiltOnScroll className="relative">
        <div className="relative" aria-hidden="true">
          <div className="absolute -inset-6 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_40%,rgba(63,125,251,0.22),transparent_70%)]" />
          <div className="relative overflow-hidden rounded-card-lg border border-ink-line bg-bg-soft shadow-card">
            <div className="flex items-center gap-1.5 border-b border-ink-line px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="ml-3 h-5 flex-1 rounded-md bg-white/[0.04]" />
            </div>
            <div className="grid grid-cols-[34%_1fr] sm:grid-cols-[28%_1fr]">
              <div className="flex flex-col gap-1 border-r border-ink-line p-3">
                {MENU.map((m, i) => (
                  <span
                    key={m}
                    className={`truncate rounded-lg px-2.5 py-2 text-[11px] ${i === 0 ? 'bg-white/[0.06] text-ink' : 'text-ink-faint'}`}
                  >
                    {m}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-3 p-4 opacity-70">
                <span className="h-4 w-2/5 rounded bg-white/10" />
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="flex h-16 flex-col justify-end gap-1.5 rounded-xl border border-ink-line p-2.5">
                      <span className="h-2 w-3/4 rounded bg-white/10" />
                      <span className="h-2 w-1/2 rounded bg-brand/60" />
                    </span>
                  ))}
                </div>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="flex items-center gap-3 rounded-xl border border-ink-line p-3">
                    <span className="h-6 w-6 rounded-full bg-white/10" />
                    <span className="h-2 flex-1 rounded bg-white/10" />
                    <span className="h-4 w-14 rounded-full bg-white/[0.06]" />
                  </span>
                ))}
              </div>
            </div>
          </div>
          <span className="absolute -top-4 right-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#06060B] shadow-glow sm:right-8">
            <Clock3 className="h-3.5 w-3.5" /> Próximamente
          </span>
        </div>
        </TiltOnScroll>
      </div>
    </section>
  );
}
