import {
  BrainCircuit,
  Clock,
  Compass,
  FileClock,
  Handshake,
  Layers,
  LifeBuoy,
  MessageSquareText,
  MonitorSmartphone,
  RefreshCw,
  Repeat,
  Route,
  Search,
  Sparkles,
  Unplug,
  Wrench,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

/** Textos de la portada. Los mensajes clave van tal cual los definió el equipo. */

export const mensajes = {
  heroTitle: 'Tu empresa puede funcionar mejor.',
  heroTitleAccent: 'Nosotros nos encargamos de conseguirlo.',
  heroSubtitle:
    'Analizamos, modernizamos y optimizamos empresas mediante inteligencia artificial y tecnología. Nos encargamos de identificar qué necesita tu negocio y llevarlo a cabo.',
  sinSaber: 'No necesitas saber qué tecnología necesita tu empresa. Nosotros nos encargamos de encontrarla y aplicarla.',
  ctaPrincipal: 'Solicita tu diagnóstico inicial',
  ctaSecundario: 'Cómo trabajamos',
} as const;

export type Item = { icon: LucideIcon; title: string; text: string };

/** El problema: el día a día del empresario */
export const problemas: Item[] = [
  {
    icon: Repeat,
    title: 'Tareas manuales que se repiten',
    text: 'Copiar datos, contestar lo mismo, rehacer documentos. Horas que no hacen crecer la empresa.',
  },
  {
    icon: Unplug,
    title: 'Herramientas que no se hablan',
    text: 'Correo, hojas de cálculo y programa de gestión por separado. La información se pierde por el camino.',
  },
  {
    icon: Compass,
    title: 'La IA, sin saber por dónde empezar',
    text: 'Oyes hablar de ella cada día, pero no sabes qué te sirve ni a quién preguntar sin que te vendan humo.',
  },
  {
    icon: Clock,
    title: 'Sin tiempo para mejorar',
    text: 'Entre clientes, equipo y papeles, modernizar la empresa se queda siempre para mañana.',
  },
];

/** Qué hacemos: capacidades, no productos */
export const capacidades: Item[] = [
  {
    icon: Workflow,
    title: 'Procesos inteligentes',
    text: 'Las tareas repetitivas pasan solas de un sitio a otro, sin copiar ni pegar.',
  },
  {
    icon: BrainCircuit,
    title: 'Inteligencia artificial',
    text: 'La IA dentro de tu día a día: atender, ordenar, redactar y resumir.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Modernización digital',
    text: 'Webs, herramientas y sistemas al día y conectados entre sí.',
  },
  {
    icon: RefreshCw,
    title: 'Mejora continua',
    text: 'Cada mes revisamos, mantenemos y buscamos la siguiente mejora.',
  },
];

/** Cómo trabajamos: paso 0 + cuatro fases */
export const diagnostico = {
  title: 'Diagnóstico inicial',
  text: 'La puerta de entrada. Conocemos tu empresa, en tu negocio o por videollamada, y te contamos qué se puede mejorar y por dónde empezar.',
};

export const fases: Item[] = [
  {
    icon: Search,
    title: 'Analizamos',
    text: 'Estudiamos cómo funciona tu empresa por dentro: procesos, herramientas, equipo y clientes.',
  },
  {
    icon: Sparkles,
    title: 'Detectamos',
    text: 'Encontramos dónde se pierde tiempo u oportunidades y decidimos qué conviene hacer primero.',
  },
  {
    icon: Wrench,
    title: 'Implementamos',
    text: 'Ponemos en marcha las soluciones: automatización, IA, web o sistemas. Nos encargamos de todo.',
  },
  {
    icon: RefreshCw,
    title: 'Seguimos mejorando',
    text: 'Mantenemos lo que funciona, lo revisamos y proponemos nuevas mejoras mes a mes.',
  },
];

/** Por qué VISAX AI */
export const razones: Item[] = [
  {
    icon: MessageSquareText,
    title: 'No necesitas conocimientos técnicos',
    text: 'Te hablamos claro. La parte técnica es cosa nuestra.',
  },
  {
    icon: Layers,
    title: 'No tienes que buscar herramientas',
    text: 'Elegimos y conectamos lo que encaja contigo.',
  },
  {
    icon: Route,
    title: 'Partimos de tus necesidades reales',
    text: 'Primero tu negocio, después la tecnología. Nunca al revés.',
  },
  {
    icon: Sparkles,
    title: 'Soluciones a medida',
    text: 'Se adapta a tu empresa, no a una plantilla.',
  },
  {
    icon: Handshake,
    title: 'Un único socio para todo',
    text: 'Automatización, IA, web y sistemas con un solo equipo.',
  },
  {
    icon: LifeBuoy,
    title: 'Mejora continua',
    text: 'No entregamos y desaparecemos: seguimos contigo mes a mes.',
  },
];

/** Portal de clientes (próximamente) */
export const portal = {
  features: [
    { icon: Layers, title: 'Servicios activos', text: 'Qué tienes en marcha y en qué estado está cada cosa.' },
    { icon: LifeBuoy, title: 'Incidencias', text: 'Avísanos de un problema y sigue cómo se resuelve.' },
    { icon: FileClock, title: 'Historial de mejoras', text: 'Todo lo que hemos hecho en tu empresa, mes a mes.' },
    { icon: Search, title: 'Informes', text: 'Los informes de seguimiento, siempre a mano.' },
    { icon: MessageSquareText, title: 'Solicitudes', text: 'Pide una mejora o una visita desde tu espacio.' },
  ],
};
