/**
 * ─────────────────────────────────────────────────────────────
 *  CONFIGURACIÓN CENTRAL DE VISAX AI
 *  Cambia aquí TODO lo personalizable: teléfono, email,
 *  redes sociales, textos de marca y URL del sitio.
 * ─────────────────────────────────────────────────────────────
 */
export const site = {
  name: 'VISAX AI',
  legalName: 'VISAX AI',
  // Lema de marca (sustituye a «Automatizamos. Inteligencia. Resultados.»)
  tagline: 'Tu socio tecnológico. Tu empresa, en constante evolución.',
  // Título corto para Google (title por defecto)
  seoTitle: 'Socio tecnológico para pymes en Cádiz y Sevilla',
  description:
    'VISAX AI es el socio tecnológico de tu empresa: analizamos cómo trabaja tu negocio, detectamos qué mejorar y lo ponemos en marcha con inteligencia artificial, automatización y tecnología, mes a mes. Desde Sanlúcar de Barrameda, para toda la provincia de Cádiz y Sevilla.',

  // URL pública (dominio propio conectado en Vercel)
  url: 'https://visaxai.es',

  // Tienda de NFC de la misma casa (enlace del menú y de la sección "VISAX NFC")
  nfcUrl: 'https://visaxnfc.es',

  // ── TITULAR (aviso legal y privacidad) ─────────────────────
  // VISAX es el nombre comercial; el titular legal es la persona dada de alta.
  legal: {
    holder: 'Pablo Villegas Becerra',
    nif: '49851130X',
    address: 'C/ Juan de Arratia, 5, 11540 Sanlúcar de Barrameda (Cádiz)',
  },

  // ── ZONA DE TRABAJO (sección "Dónde trabajamos", Google) ───
  zona: {
    base: 'Sanlúcar de Barrameda',
    provincias: [
      {
        nombre: 'Cádiz',
        pueblos: ['Sanlúcar de Barrameda', 'Jerez de la Frontera', 'Cádiz', 'El Puerto de Santa María', 'Chipiona', 'Rota', 'Chiclana', 'San Fernando', 'Algeciras'],
      },
      {
        nombre: 'Sevilla',
        pueblos: ['Sevilla', 'Dos Hermanas', 'Lebrija', 'Utrera', 'Alcalá de Guadaíra', 'Los Palacios', 'Écija'],
      },
    ],
  },

  // ── FUNDADORES (sección "Quiénes somos") ───────────────────
  founders: [
    { name: 'Pepe Sánchez Ortiz', initials: 'PS', role: 'Cofundador' },
    { name: 'Pablo Villegas Becerra', initials: 'PV', role: 'Cofundador' },
  ],

  // ── CONTACTO ────────────────────────────────────────────────
  phone: '656 999 241',
  phoneRaw: '+34656999241', // formato para enlaces tel:
  email: 'contactovisaxai@gmail.com',
  // Segundo teléfono (también se muestra en contacto)
  callPhone: '622 293 436',
  callPhoneRaw: '+34622293436',
  // Número de WhatsApp en formato internacional sin signos (déjalo vacío para ocultar el botón)
  whatsapp: '34656999241',

  // Horario de atención
  schedule: {
    weekdays: 'Lunes a Viernes',
    hours: '9:00 – 19:00',
    timezone: 'CET (España)',
    note: 'Visitas presenciales con cita previa.',
  },

  // Zona horaria del negocio (IANA): calendario de visitas
  businessTimezone: 'Europe/Madrid',

  // ── REDES SOCIALES (deja vacío para ocultar) ────────────────
  social: {
    instagram: '',
    linkedin: '',
    x: '',
    youtube: '',
    tiktok: '',
  },

  // Ruta del logo (SVG vectorizado del logotipo oficial; geometría en lib/brand.ts)
  logo: '/logo.svg',
} as const;

export type SiteConfig = typeof site;
