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
  tagline: 'Más reseñas y menos papel, con un solo toque',
  description:
    'Expositores NFC de reseñas de Google y tarjetas NFC para ver la carta con un toque. Te los enviamos programados con tu enlace, listos para usar.',

  url: 'https://visax-nfc.vercel.app',
  // Web de automatizaciones con IA (enlace del menú "Automatizaciones IA")
  aiUrl: 'https://visax-ai-v2.vercel.app',

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
