/**
 * ─────────────────────────────────────────────────────────────
 *  PLANES DE SUSCRIPCIÓN
 *  Cambia aquí planes, textos y precios: los componentes no se tocan.
 *
 *  - price: cuota mensual en euros (número) o null → se muestra «Precio a medida».
 *  - setupFee: alta / puesta en marcha en euros o null → «Consultar».
 *  - priceNote: texto bajo el precio (por ejemplo «+ IVA»). null = nada.
 *
 *  Los planes se diferencian por DEDICACIÓN y ACOMPAÑAMIENTO, no por
 *  una lista de automatizaciones. No pongas horas, garantías ni compromisos.
 * ─────────────────────────────────────────────────────────────
 */

export type Plan = {
  id: 'esencial' | 'profesional' | 'premium';
  name: string;
  /** Frase corta bajo el nombre */
  tagline: string;
  /** Para quién es */
  forWho: string;
  price: number | null;
  // TODO: confirmar si hay cuota de alta
  setupFee: number | null;
  priceNote: string | null;
  /** Plan resaltado visualmente */
  featured?: boolean;
  /** Las cinco dimensiones que pide cada plan */
  details: {
    accompaniment: string;
    implementation: string;
    support: string;
    // TODO: confirmar frecuencia concreta de reuniones de cada plan
    meetings: string;
  };
  includes: string[];
};

export const plans: Plan[] = [
  {
    id: 'esencial',
    name: 'Esencial',
    tagline: 'Para empezar a modernizarse',
    forWho: 'Empresas que quieren dar los primeros pasos y empezar por lo que más se nota.',
    price: 290,
    setupFee: null,
    priceNote: null,
    details: {
      accompaniment: 'Cercano, para arrancar con buen pie',
      implementation: 'Primeras implementaciones, las de más impacto',
      support: 'Mantenimiento y seguimiento periódico',
      meetings: 'Revisiones periódicas',
    },
    includes: [
      'Diagnóstico inicial de tu empresa',
      'Primeras implementaciones',
      'Mantenimiento de lo que ponemos en marcha',
      'Seguimiento periódico',
    ],
  },
  {
    id: 'profesional',
    name: 'Profesional',
    tagline: 'Para optimizar varias áreas',
    forWho: 'Empresas que quieren mejorar varias áreas a la vez y meter la IA en su día a día.',
    price: 590,
    setupFee: null,
    priceNote: null,
    featured: true,
    details: {
      accompaniment: 'Más dedicación y acompañamiento',
      implementation: 'Más capacidad y más inteligencia artificial',
      support: 'Revisión periódica de nuevas oportunidades',
      meetings: 'Reuniones periódicas de seguimiento',
    },
    includes: [
      'Todo lo del plan Esencial',
      'Más capacidad de implementación',
      'Más inteligencia artificial en tus procesos',
      'Modernización de herramientas y web',
      'Revisión periódica de oportunidades',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'Tu departamento tecnológico externo',
    forWho: 'Empresas que quieren delegar toda su evolución tecnológica en un equipo externo.',
    price: 890,
    setupFee: null,
    priceNote: null,
    details: {
      accompaniment: 'Máxima dedicación',
      implementation: 'Proyectos amplios y planificación continua',
      support: 'Atención prioritaria',
      meetings: 'Reuniones periódicas y planificación continua',
    },
    includes: [
      'Todo lo del plan Profesional',
      'Máxima dedicación de nuestro equipo',
      'Proyectos amplios',
      'Prioridad en la atención',
      'Planificación tecnológica continua',
    ],
  },
];

/** Textos cuando no hay precio definido */
export const PRICE_FALLBACK = 'Precio a medida';
export const SETUP_FALLBACK = 'Consultar';

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const formatEuros = (n: number) => eur.format(n);
