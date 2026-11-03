import {
  Mail,
  PhoneCall,
  CalendarCheck,
  Filter,
  FileSignature,
  ShieldAlert,
  Banknote,
  ScanLine,
  Star,
  Workflow,
  AppWindow,
  Globe,
  Headphones,
  TrendingUp,
  FileText,
  Wand2,
  type LucideIcon,
} from 'lucide-react';

export type CategoryId = 'atencion' | 'documentos' | 'ventas' | 'a-medida';

export type Category = {
  id: CategoryId;
  icon: LucideIcon;
  title: string;
  /** Nombre corto para los botones de navegación */
  chip: string;
  intro: string;
};

/** Categorías en el orden en que se muestran. */
export const categories: Category[] = [
  {
    id: 'atencion',
    icon: Headphones,
    title: 'Atención al cliente 24/7',
    chip: 'Atención al cliente',
    intro: 'Que ningún cliente se quede sin respuesta: emails, llamadas y reservas, a cualquier hora.',
  },
  {
    id: 'documentos',
    icon: FileText,
    title: 'Documentos, facturas y cobros',
    chip: 'Documentos y cobros',
    intro: 'El papeleo que te quita horas, hecho solo y sin errores.',
  },
  {
    id: 'ventas',
    icon: TrendingUp,
    title: 'Ventas y reputación',
    chip: 'Ventas y reseñas',
    intro: 'Atiende primero a los clientes que más valen y consigue más reseñas de 5 estrellas.',
  },
  {
    id: 'a-medida',
    icon: Wand2,
    title: 'Software, webs y automatizaciones a medida',
    chip: 'A tu medida',
    intro: 'Lo que tu negocio necesita y no existe hecho: lo diseñamos y lo construimos para ti.',
  },
];

export type Service = {
  slug: string;
  category: CategoryId;
  icon: LucideIcon;
  title: string;
  /** Qué hace, en una frase y sin tecnicismos (tarjeta) */
  summary: string;
  /** Explicación completa (detalle) */
  description: string;
  result: string;
  tools: string[];
};

export const services: Service[] = [
  {
    slug: 'recepcionista-virtual-ia',
    category: 'atencion',
    icon: Mail,
    title: 'Recepcionista Virtual IA',
    summary: 'Contesta los emails de tus clientes y les da, cambia o cancela la cita en tu calendario.',
    description:
      'Lee y entiende los correos entrantes con IA. Agenda, modifica y cancela citas en Google Calendar, responde y confirma automáticamente, y lo registra todo.',
    result: 'Atención 24/7 sin contratar a nadie.',
    tools: ['OpenAI', 'Gmail', 'Google Calendar'],
  },
  {
    slug: 'agente-de-voz-ia',
    category: 'atencion',
    icon: PhoneCall,
    title: 'Agente de Voz IA',
    summary: 'Coge el teléfono con voz natural y reserva, cambia o cancela citas durante la llamada.',
    description:
      'Atiende llamadas con voz natural (tecnología tipo Vapi), consulta la disponibilidad real y reserva, cambia o cancela citas durante la propia llamada.',
    result: 'Nunca más una llamada perdida.',
    tools: ['Vapi', 'Twilio', 'Google Calendar'],
  },
  {
    slug: 'reserva-de-citas-web',
    category: 'atencion',
    icon: CalendarCheck,
    title: 'Reserva de Citas Web',
    summary: 'Tus clientes reservan desde tu web y la cita entra sola en tu calendario, con email de confirmación.',
    description:
      'Widget o formulario en tu web que crea el evento en Google Calendar y envía el email de confirmación al cliente al instante.',
    result: 'Reservas confirmadas en segundos.',
    tools: ['Tally', 'Google Calendar', 'Gmail'],
  },
  {
    slug: 'generador-presupuestos-contratos-ia',
    category: 'documentos',
    icon: FileSignature,
    title: 'Presupuestos y Contratos con IA',
    summary: 'Crea presupuestos y contratos profesionales en PDF; tú los apruebas y se envían solos al cliente.',
    description:
      'Genera presupuestos y contratos con IA, con flujo de aprobación humana, documento profesional en PDF y envío automático al cliente.',
    result: 'De días a minutos por documento.',
    tools: ['OpenAI', 'Google Docs', 'Make'],
  },
  {
    slug: 'cobrador-automatico-impagos',
    category: 'documentos',
    icon: Banknote,
    title: 'Cobrador Automático de Impagos',
    summary: 'Envía recordatorios amables a quien te debe dinero hasta que paga. Tú solo recibes un resumen.',
    description:
      'Recordatorios diarios personalizados escritos con IA y un resumen semanal para ti. Recupera las facturas impagadas de forma educada y constante.',
    result: 'Menos impagos, cero incomodidad.',
    tools: ['OpenAI', 'Gmail', 'Google Sheets'],
  },
  {
    slug: 'lector-automatico-facturas',
    category: 'documentos',
    icon: ScanLine,
    title: 'Lector Automático de Facturas',
    summary: 'Lee tus facturas, saca los datos y los pasa a tu hoja de cálculo o contabilidad, sin duplicados.',
    description:
      'Extrae los datos de cada factura por OCR e IA, evita duplicados y lo vuelca a tu hoja de cálculo o contabilidad.',
    result: 'Adiós a meter datos a mano.',
    tools: ['OCR', 'OpenAI', 'Google Sheets'],
  },
  {
    slug: 'auditor-de-contratos-ia',
    category: 'documentos',
    icon: ShieldAlert,
    title: 'Auditor de Contratos IA',
    summary: 'Revisa los contratos que te llegan y te marca las cláusulas de riesgo antes de firmar.',
    description:
      'Analiza los contratos recibidos y detecta cláusulas de riesgo automáticamente, con un informe claro y accionable.',
    result: 'Firma con seguridad.',
    tools: ['OpenAI', 'Google Drive'],
  },
  {
    slug: 'cualificacion-de-leads-ia',
    category: 'ventas',
    icon: Filter,
    title: 'Cualificación de Leads con IA',
    summary: 'Lee cada formulario que llega, separa a los clientes que más valen y avisa a tu equipo al momento.',
    description:
      'Filtra los formularios entrantes, separa clientes VIP de los comunes, avisa al equipo por Slack y lo guarda en tu CRM u hoja de cálculo.',
    result: 'Priorizas a quien más vale.',
    tools: ['OpenAI', 'Slack', 'Google Sheets'],
  },
  {
    slug: 'radar-de-reputacion',
    category: 'ventas',
    icon: Star,
    title: 'Radar de Reputación',
    summary: 'Pregunta a cada cliente qué tal le fue: los contentos dejan reseña en Google y los descontentos te escriben a ti.',
    description:
      'Encuesta automática tras cada cita: enruta a los clientes contentos a dejar reseña en Google y gestiona en privado a los descontentos.',
    result: 'Sube tu reputación en automático.',
    tools: ['OpenAI', 'Gmail', 'Google'],
  },
  {
    slug: 'automatizaciones-a-medida',
    category: 'a-medida',
    icon: Workflow,
    title: 'Automatizaciones a medida',
    summary: '¿Tienes una tarea que se repite? La convertimos en un proceso automático conectado a tus herramientas.',
    description:
      'Además de las automatizaciones que ya tenemos listas, diseñamos la tuya desde cero: escuchamos cómo trabajas, decidimos qué se automatiza y lo conectamos con el email, el calendario, las hojas de cálculo o el programa que ya uses.',
    result: 'Hecha para cómo trabajas tú.',
    tools: ['Make', 'OpenAI', 'Tus herramientas'],
  },
  {
    slug: 'software-a-medida',
    category: 'a-medida',
    icon: AppWindow,
    title: 'Software a medida',
    summary: 'Programas y aplicaciones web hechos para tu negocio: paneles de gestión, herramientas internas o portales para clientes.',
    description:
      'Cuando ningún programa del mercado encaja, lo creamos para ti: una aplicación web con lo que tu negocio necesita, sin pagar por funciones que no usas, y conectada con tus automatizaciones si quieres.',
    result: 'Una herramienta que se adapta a ti, no al revés.',
    tools: ['Aplicación web', 'A medida', 'IA integrada'],
  },
  {
    slug: 'paginas-web',
    category: 'a-medida',
    icon: Globe,
    title: 'Páginas web',
    summary: 'Tu web moderna, rápida y adaptada al móvil, con dominio propio y preparada para salir en Google.',
    description:
      'Diseñamos y publicamos la web de tu negocio: moderna, rápida y pensada para el móvil, con tu dominio y lista para Google. Si la necesitas, le añadimos reservas, formularios o pagos conectados a tus automatizaciones.',
    result: 'Una web que trabaja para traerte clientes.',
    tools: ['Dominio propio', 'Google', 'Móvil'],
  },
];

export const servicesIn = (id: CategoryId) => services.filter((s) => s.category === id);

// Tecnologías para el marquee de logos
export const technologies = [
  'OpenAI',
  'Make',
  'Google Calendar',
  'Google Sheets',
  'Gmail',
  'Vapi',
  'Twilio',
  'Slack',
  'Tally',
  'Google Docs',
];
