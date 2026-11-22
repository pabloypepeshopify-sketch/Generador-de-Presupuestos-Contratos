import { SectionHeading } from '@/components/ui/SectionHeading';
import { VisitaReserva } from '@/components/sections/VisitaReserva';
import { site } from '@/lib/site.config';

/** Reserva de una visita presencial (n8n → Google Calendar + Gmail). */
export function Visita() {
  return (
    <section id="visita" aria-labelledby="visita-title" className="section pt-0">
      <div className="container-x">
        <SectionHeading
          id="visita-title"
          eyebrow="Visitas presenciales"
          title="¿Prefieres que vayamos"
          accent="a tu negocio?"
          size="md"
          intro={`Elige día y hora y vamos a verte, en ${site.zona.base} o donde esté tu empresa en la provincia de Cádiz o Sevilla. Te llamamos antes para confirmar la visita.`}
        />
        <div className="mt-10">
          <VisitaReserva />
        </div>
      </div>
    </section>
  );
}
