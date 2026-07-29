/**
 * ─────────────────────────────────────────────────────────────
 *  CONFIGURACIÓN CENTRAL DE VISAX AI
 *  Cambia aquí TODO lo personalizable: teléfono, email, webhook,
 *  redes sociales, textos de marca y URL del sitio.
 * ─────────────────────────────────────────────────────────────
 */
export const site = {
  name: 'VISAX AI',
  legalName: 'VISAX AI',
  tagline: 'Automatizamos tu negocio con Inteligencia Artificial',
  description:
    'VISAX AI diseña automatizaciones a medida con Inteligencia Artificial: recepcionistas virtuales, agentes de voz, cobros, facturas y contratos. Menos tareas manuales, más negocio.',

  // URL pública (cámbiala por tu dominio real al desplegar en Vercel)
  url: 'https://visax.ai',

  // ── CONTACTO ────────────────────────────────────────────────
  phone: '+34 622 293 436',
  phoneRaw: '+34622293436', // formato para enlaces tel:
  email: 'pabloypepeshopify@gmail.com',
  // Número de WhatsApp en formato internacional sin signos (déjalo vacío para ocultar el botón)
  whatsapp: '34622293436',

  // Horario de atención
  schedule: {
    weekdays: 'Lunes a Viernes',
    hours: '9:00 – 19:00',
    timezone: 'CET (España)',
    note: 'Tus automatizaciones, en cambio, trabajan 24/7.',
  },

  // ── WEBHOOKS DE MAKE (citas por correo) ─────────────────────
  // 1) RESERVA: crea el evento en Google Calendar y envía el email de
  //    confirmación. Recibe { nombre, email, telefono, fecha, hora }.
  makeWebhook: 'https://hook.eu1.make.com/i3sffiqtduc3jhr93kxvvi2j04oejptg',
  // 2) DISPONIBILIDAD: dado un día { fecha: "YYYY-MM-DD" } devuelve el
  //    horario y las horas ya ocupadas para pintar los tramos libres.
  //    Respuesta JSON: { inicio, fin, duracion, ocupadas_inicio, ocupadas_fin }.
  //    IMPORTANTE: para poder LEER esta respuesta desde el navegador, el
  //    módulo "Webhook response" de Make debe devolver la cabecera
  //    Access-Control-Allow-Origin: *  (CORS). Ver README.
  availabilityWebhook: 'https://hook.eu1.make.com/30lkmlm2w48g77cnz93it7firfdenh4s',

  // ── REDES SOCIALES (deja vacío para ocultar) ────────────────
  social: {
    instagram: '',
    linkedin: '',
    x: '',
    youtube: '',
    tiktok: '',
  },

  // Ruta del logo (SVG generado a partir del logotipo aportado)
  logo: '/logo.svg',
} as const;

export type SiteConfig = typeof site;
