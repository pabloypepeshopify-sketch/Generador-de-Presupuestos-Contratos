import { Building2, Calculator, HardHat, Store, Stethoscope, UtensilsCrossed, type LucideIcon } from 'lucide-react';

/**
 * Problemas que resolvemos, por sector.
 * Son EJEMPLOS DE POSIBILIDADES: sin cifras, sin porcentajes y sin clientes reales.
 */
export type Sector = {
  id: string;
  name: string;
  icon: LucideIcon;
  /** Situación de partida, en una frase */
  pain: string;
  examples: string[];
};

export const sectores: Sector[] = [
  {
    id: 'inmobiliarias',
    name: 'Inmobiliarias',
    icon: Building2,
    pain: 'Contactos de varios portales, visitas que coordinar y propietarios que piden noticias.',
    examples: [
      'Los contactos que llegan de los portales reciben respuesta y quedan registrados sin que nadie los copie a mano.',
      'Las visitas a los inmuebles se agendan y se recuerdan solas, al cliente y al agente.',
      'Cada propietario recibe un resumen de cómo va su venta o alquiler sin preparar el informe a mano.',
    ],
  },
  {
    id: 'gestorias',
    name: 'Gestorías y asesorías',
    icon: Calculator,
    pain: 'Papeles que llegan por todas partes, plazos que vigilar y las mismas preguntas cada trimestre.',
    examples: [
      'Las facturas de los clientes se recogen, se clasifican y se pasan al sistema contable automáticamente.',
      'Cada cliente recibe un aviso con lo que falta antes de cada vencimiento.',
      'Las consultas habituales se contestan al momento y las complicadas llegan ordenadas a la persona adecuada.',
    ],
  },
  {
    id: 'clinicas',
    name: 'Clínicas',
    icon: Stethoscope,
    pain: 'Una recepción que no da abasto entre llamadas, citas, cambios y cancelaciones.',
    examples: [
      'Las citas y recordatorios se gestionan por WhatsApp sin saturar la recepción.',
      'Los huecos que deja una cancelación se ofrecen a los pacientes que esperaban cita.',
      'Los formularios y consentimientos se rellenan antes de la consulta y quedan en la ficha del paciente.',
    ],
  },
  {
    id: 'comercios',
    name: 'Comercios locales',
    icon: Store,
    pain: 'Tienda física, web y redes a la vez, con el mismo equipo de siempre.',
    examples: [
      'El stock de la tienda y el de la web se actualizan a la vez.',
      'Los clientes habituales reciben novedades pensadas para lo que suelen comprar.',
      'Las preguntas de siempre (horarios, envíos, disponibilidad) se responden solas a cualquier hora.',
    ],
  },
  {
    id: 'construccion',
    name: 'Construcción y reformas',
    icon: HardHat,
    pain: 'Presupuestos que se hacen de noche, obras repartidas y facturas que se cobran tarde.',
    examples: [
      'Los presupuestos salen en minutos a partir de tus plantillas, con tus precios y tu imagen.',
      'Cada obra tiene su parte diario con fotos desde el móvil, y la oficina lo ve al momento.',
      'Las facturas pendientes se reclaman con recordatorios automáticos y educados.',
    ],
  },
  {
    id: 'restauracion',
    name: 'Restauración',
    icon: UtensilsCrossed,
    pain: 'Reservas por teléfono, web y redes, una carta que cambia y reseñas que importan.',
    examples: [
      'Las reservas del teléfono, la web y las redes acaban en un único calendario.',
      'La carta digital se actualiza en un minuto y los pedidos se pueden hacer desde la mesa.',
      'Después de cada visita, los clientes contentos reciben un enlace para dejar su reseña.',
    ],
  },
];

export const SECTORES_AVISO = 'Ejemplos ilustrativos. Cada solución se diseña tras analizar tu negocio.';
