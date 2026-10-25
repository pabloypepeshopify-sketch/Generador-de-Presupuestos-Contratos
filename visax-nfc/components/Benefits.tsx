import { BatteryFull, ChefHat, Clock, FileX2, Leaf, MapPinned, Smartphone, Sparkles, Truck } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { eur } from '@/lib/pricing';
import { site } from '@/lib/site.config';

/** Lo que cambia en el local al pasar al móvil del cliente. */
const items = [
  {
    icon: FileX2,
    title: 'Carta siempre al día',
    text: 'Cambias un precio o un plato y la carta del móvil cambia al momento. Sin reimprimir, sin cartas manchadas ni tachones.',
  },
  {
    icon: ChefHat,
    title: 'Pedidos sin esperas',
    text: 'El cliente pide desde la mesa cuando quiere y el pedido llega directo a cocina. Menos esperas y más mesas por servicio.',
  },
  {
    icon: Clock,
    title: 'Tu equipo, donde hace falta',
    text: 'Menos viajes para tomar nota, dar la contraseña del WiFi o responder si alguien llama. Más tiempo para atender bien.',
  },
  {
    icon: Smartphone,
    title: 'Como ya viven tus clientes',
    text: 'Hoy todo se hace con el móvil: buscar sitio, mirar la carta, pagar, opinar. Tu local se adapta sin que nadie se descargue nada.',
  },
  {
    icon: Sparkles,
    title: 'Una imagen moderna',
    text: 'Desde el primer toque, el cliente ve un local cuidado y actual. Y eso se nota en cómo te recuerda y te recomienda.',
  },
  {
    icon: MapPinned,
    title: 'Más visibilidad',
    text: 'Reseñas en Google y seguidores en tus redes de gente que ya está en tu local: la mejor publicidad, sin pagar anuncios.',
  },
];

const facts = [
  { icon: BatteryFull, text: 'Sin app ni batería' },
  { icon: Leaf, text: 'Menos papel y menos imprenta' },
  { icon: Truck, text: `Envío ${site.shipping.eta} · gratis desde ${eur(site.shipping.freeFrom)}` },
];

export function Benefits() {
  return (
    <section id="ventajas" className="section">
      <div className="container-x">
        <SectionHeading
          eyebrow="Moderniza tu local"
          title={
            <>
              Tu negocio, adaptado
              <br />
              <span className="text-gradient italic">a cómo se vive hoy</span>
            </>
          }
          intro="Tus clientes ya lo hacen todo con el móvil. Con un toque en la mesa, tu local se pone al día: menos papel, menos esperas y un servicio más ágil, sin cambiar tu forma de trabajar."
        />
        <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {items.map((it) => (
            <RevealItem key={it.title}>
              <div className="card-fx h-full rounded-[var(--radius)] border border-ink-line bg-bg-soft/60 p-7">
                <it.icon className="h-6 w-6 text-brand-cyan" />
                <h3 className="mt-4 font-display text-xl">{it.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{it.text}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
        <ul className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-ink-soft">
          {facts.map((f) => (
            <li key={f.text} className="flex items-center gap-2">
              <f.icon className="h-4 w-4 text-brand-cyan" /> {f.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
