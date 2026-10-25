/**
 * ─────────────────────────────────────────────────────────────
 *  CONFIGURACIÓN CENTRAL DE VISAX NFC
 *  Datos de contacto, empresa, envíos y enlaces. Cambia aquí y
 *  se actualiza toda la web (cabecera, pie, legales, pago…).
 * ─────────────────────────────────────────────────────────────
 */

export type Testimonial = { name: string; business: string; text: string };

export const site = {
  name: 'VISAX NFC',
  tagline: 'Carta, pedidos en mesa y reseñas con un solo toque',
  description:
    'Moderniza tu local con NFC: carta digital, pedidos desde la mesa, aviso al camarero, WiFi, redes sociales y reseñas de Google con un toque del móvil. Te lo enviamos programado y listo para usar.',

  url: 'https://visaxnfc.es',
  // Web de automatizaciones con IA (enlace del menú "Automatizaciones IA")
  aiUrl: 'https://visaxai.es',

  // ── CONTACTO ────────────────────────────────────────────────
  phone: '656 999 241',
  phoneRaw: '+34656999241',
  email: 'contactovisaxai@gmail.com',
  whatsapp: '34656999241',

  // ── TITULAR (aviso legal, condiciones, facturas) ────────────
  legal: {
    holder: 'Pablo Villegas Becerra',
    nif: '49851130X',
    address: 'C/ Juan de Arratia, 5, 11540 Sanlúcar de Barrameda (Cádiz)',
  },

  // ── FUNDADORES (apartado "Quiénes somos") ───────────────────
  founders: [
    { name: 'Pepe Sánchez Ortiz', initials: 'PS', role: 'Cofundador' },
    { name: 'Pablo Villegas Becerra', initials: 'PV', role: 'Cofundador' },
  ],

  // ── ENVÍOS (importes en céntimos) ───────────────────────────
  shipping: {
    cost: 490,
    freeFrom: 5000,
    zone: 'Península y Baleares',
    eta: '24–72 h',
    prep: '3–5 días laborables', // preparación y programación antes de enviar
  },

  // Opiniones de clientes: la sección aparece sola en cuanto haya alguna.
  testimonials: [] as Testimonial[],
} as const;
