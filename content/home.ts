import {
  BrainCircuit,
  Clock,
  Compass,
  FileClock,
  Handshake,
  Layers,
  LifeBuoy,
  MapPin,
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
  diferenciador: 'No vendemos herramientas. Mejoramos empresas.',
  ctaPrincipal: 'Solicita tu diagnóstico inicial',
  ctaSecundario: 'Cómo trabajamos',
} as const;

export type Item = { icon: LucideIcon; title: string; text: string };

/** El problema: el día a día del empresario */
export const problemas: Item[] = [
  {
    icon: Repeat,
    title: 'Tareas manuales que se repiten',
    text: 'Copiar datos de un sitio a otro, contestar lo mismo una y otra vez, rehacer documentos. Horas que no hacen crecer la empresa.',
  },
  {
    icon: Unplug,
    title: 'Herramientas que no se hablan',
    text: 'El correo por un lado, las hojas de cálculo por otro y el programa de gestión por otro. La información se pierde por el camino.',
  },
  {
    icon: Compass,
    title: 'La IA, sin saber por dónde empezar',
    text: 'Oyes hablar de inteligencia artificial cada día, pero no sabes qué te sirve a ti ni a quién preguntar sin que te vendan humo.',
  },
  {
    icon: Clock,
    title: 'Sin tiempo para mejorar',
    text: 'Entre clientes, equipo y papeles, no queda tiempo para modernizar la empresa. Y se va quedando para mañana.',
  },
];

/** Qué hacemos: capacidades, no productos */
export const capacidades: Item[] = [
  {
    icon: Workflow,
    title: 'Procesos inteligentes',
    text: 'Automatizamos las tareas manuales y repetitivas para que el trabajo fluya solo entre personas y herramientas.',
  },
  {
    icon: BrainCircuit,
    title: 'Inteligencia artificial',
    text: 'Integramos la IA en el funcionamiento de tu negocio: atender, ordenar, redactar, resumir y decidir con más información.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Modernización digital',
    text: 'Webs, herramientas y sistemas al día, conectados entre sí y pensados para cómo trabajáis.',
  },
  {
    icon: RefreshCw,
    title: 'Mejora continua',
    text: 'Seguimiento, mantenimiento y nuevas oportunidades cada mes. Tu empresa no se queda parada.',
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
    text: 'Te hablamos claro y sin jerga. Tú nos cuentas cómo trabajas; la parte técnica es cosa nuestra.',
  },
  {
    icon: Layers,
    title: 'No tienes que buscar herramientas',
    text: 'Nada de comparar programas y aplicaciones. Elegimos y conectamos lo que encaja contigo.',
  },
  {
    icon: Route,
    title: 'Partimos de tus necesidades reales',
    text: 'Primero entendemos tu negocio; después decidimos la tecnología. Nunca al revés.',
  },
  {
    icon: Sparkles,
    title: 'Soluciones a medida',
    text: 'Cada empresa es distinta. Lo que hacemos se adapta a la tuya, no a una plantilla.',
  },
  {
    icon: Handshake,
    title: 'Un único socio para todo',
    text: 'Automatización, IA, web y sistemas con un solo equipo que conoce tu empresa de principio a fin.',
  },
  {
    icon: MapPin,
    title: 'Cerca de ti',
    text: 'Somos un equipo pequeño y local. Conocemos tu negocio, podemos visitarte y trabajar a tu lado.',
  },
  {
    icon: LifeBuoy,
    title: 'Mejora continua',
    text: 'No entregamos y desaparecemos: seguimos revisando y mejorando contigo mes a mes.',
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
