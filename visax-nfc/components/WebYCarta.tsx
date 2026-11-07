import { ArrowRight, BookOpenText, Check, Globe, MessageCircle } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { site } from '@/lib/site.config';

/** Servicio secundario: hacemos la carta digital y la web del local, y las unimos al NFC. */
const servicios = [
  {
    icon: BookOpenText,
    title: 'Carta digital',
    text: 'Tu carta en el móvil del cliente: platos, precios, fotos y alérgenos, bien ordenados y fácil de leer. Es la que abre tu NFC de carta o de pedido en mesa.',
    puntos: ['Sin imprimir cada vez que cambia algo', 'Se ve bien en cualquier móvil'],
  },
  {
    icon: Globe,
    title: 'Página web del local',
    text: 'Una web rápida y moderna con tu horario, cómo llegar, tu carta y un botón para llamar o reservar. Con tu dominio y preparada para salir en Google.',
    puntos: ['Pensada primero para el móvil', 'Enlazada con tu ficha de Google y tus redes'],
  },
];

const whatsapp = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent('Hola, me interesa la carta digital y/o la web para mi local.')}`;

export function WebYCarta() {
  return (
    <section id="webs" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="También lo hacemos"
          title={
            <>
              ¿Sin carta digital o sin web?
              <br />
              <span className="text-gradient italic">Te las hacemos</span>
            </>
          }
          intro="Si aún no tienes carta digital, o tu local no tiene web, te las preparamos nosotros y las dejamos unidas a tus NFC: el cliente te encuentra en Google, ve la carta en la mesa y te deja la reseña."
        />

        <RevealGroup className="mt-12 grid gap-5 md:grid-cols-2" stagger={0.08}>
          {servicios.map((s) => (
            <RevealItem key={s.title}>
              <div className="card-fx flex h-full flex-col rounded-[var(--radius)] border border-ink-line bg-bg-soft/60 p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient-soft text-brand-cyan">
                  <s.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 font-display text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.text}</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {s.puntos.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        <div className="mt-5 flex flex-col items-start justify-between gap-5 rounded-[var(--radius)] border border-brand-violet/30 bg-brand-gradient-soft p-6 sm:flex-row sm:items-center sm:p-7">
          <p className="max-w-xl text-sm text-ink-soft sm:text-base">
            <strong className="text-white">Mejor juntas:</strong> web, carta digital y NFC hechos a la vez, con la misma
            imagen y todo enlazado. Te damos el precio cerrado antes de empezar.
          </p>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-[#06060B] transition hover:bg-brand-silver"
          >
            <MessageCircle className="h-4 w-4" /> Pide presupuesto <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
