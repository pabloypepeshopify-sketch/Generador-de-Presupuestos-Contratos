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
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type Service = {
  slug: string;
  icon: LucideIcon;
  title: string;
  short: string;
  description: string;
  result: string;
  tools: string[];
  featured?: boolean;
};

export const services: Service[] = [
  {
    slug: 'recepcionista-virtual-ia',
    icon: Mail,
    title: 'Recepcionista Virtual IA',
    short: 'Gestiona tu agenda por email, sola.',
    description:
      'Lee y entiende los correos entrantes con IA. Agenda, modifica y cancela citas en Google Calendar, responde y confirma automáticamente, y lo registra todo.',
    result: 'Atención 24/7 sin contratar a nadie.',
    tools: ['OpenAI', 'Gmail', 'Google Calendar'],
    featured: true,
  },
  {
    slug: 'agente-de-voz-ia',
    icon: PhoneCall,
    title: 'Agente de Voz IA',
    short: 'Contesta el teléfono con voz natural.',
    description:
      'Atiende llamadas con voz natural (tecnología tipo Vapi), consulta la disponibilidad real y reserva, cambia o cancela citas durante la propia llamada.',
    result: 'Nunca más una llamada perdida.',
    tools: ['Vapi', 'Twilio', 'Google Calendar'],
    featured: true,
  },
  {
    slug: 'reserva-de-citas-web',
    icon: CalendarCheck,
    title: 'Reserva de Citas Web',
    short: 'Del formulario al calendario, al instante.',
    description:
      'Widget o formulario en tu web que crea el evento en Google Calendar y envía el email de confirmación al cliente al instante.',
    result: 'Reservas confirmadas en segundos.',
    tools: ['Tally', 'Google Calendar', 'Gmail'],
  },
  {
    slug: 'cualificacion-de-leads-ia',
    icon: Filter,
    title: 'Cualificación de Leads con IA',
    short: 'Separa el oro del ruido.',
    description:
      'Filtra los formularios entrantes, separa clientes VIP de los comunes, avisa al equipo por Slack y lo guarda en tu CRM u hoja de cálculo.',
    result: 'Priorizas a quien más vale.',
    tools: ['OpenAI', 'Slack', 'Google Sheets'],
  },
  {
    slug: 'generador-presupuestos-contratos-ia',
    icon: FileSignature,
    title: 'Generador de Presupuestos y Contratos IA',
    short: 'Documentos profesionales en un clic.',
    description:
      'Genera presupuestos y contratos con IA, con flujo de aprobación humana, documento profesional en PDF y envío automático al cliente.',
    result: 'De días a minutos por documento.',
    tools: ['OpenAI', 'Google Docs', 'Make'],
    featured: true,
  },
  {
    slug: 'auditor-de-contratos-ia',
    icon: ShieldAlert,
    title: 'Auditor de Contratos IA',
    short: 'Detecta cláusulas de riesgo por ti.',
    description:
      'Analiza los contratos recibidos y detecta cláusulas de riesgo automáticamente, con un informe claro y accionable.',
    result: 'Firma con seguridad.',
    tools: ['OpenAI', 'Google Drive'],
  },
  {
    slug: 'cobrador-automatico-impagos',
    icon: Banknote,
    title: 'Cobrador Automático de Impagos',
    short: 'Recupera facturas sin perseguir a nadie.',
    description:
      'Recordatorios diarios personalizados escritos con IA y un resumen semanal para ti. Recupera las facturas impagadas de forma educada y constante.',
    result: 'Menos impagos, cero incomodidad.',
    tools: ['OpenAI', 'Gmail', 'Google Sheets'],
  },
  {
    slug: 'lector-automatico-facturas',
    icon: ScanLine,
    title: 'Lector Automático de Facturas',
    short: 'OCR + IA que teclea por ti.',
    description:
      'Extrae los datos de cada factura por OCR e IA, evita duplicados y lo vuelca a tu hoja de cálculo o contabilidad.',
    result: 'Adiós a meter datos a mano.',
    tools: ['OCR', 'OpenAI', 'Google Sheets'],
  },
  {
    slug: 'radar-de-reputacion',
    icon: Star,
    title: 'Radar de Reputación',
    short: 'Más reseñas 5★ en automático.',
    description:
      'Encuesta automática tras cada cita: enruta a los clientes contentos a dejar reseña en Google y gestiona en privado a los descontentos.',
    result: 'Sube tu reputación en automático.',
    tools: ['OpenAI', 'Gmail', 'Google'],
  },
];

export const customService = {
  icon: Sparkles,
  title: '¿No ves lo tuyo?',
  short: 'Automatización a medida',
  description:
    'Cuéntanos tu proceso más repetitivo y lo convertimos en una automatización con IA diseñada solo para ti.',
  result: 'Hablemos de tu caso.',
};

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
