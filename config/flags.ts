/**
 * Interruptores de secciones. Una sección apagada no se pinta.
 * NO actives una sección sin contenido real (testimonios, logos de clientes…).
 */
export const flags = {
  /** Testimonios de clientes. Apagado hasta tener testimonios reales y su permiso. */
  testimonials: false,
  /**
   * Muestra los «TODO: confirmar» de la web (FAQ sin respuesta, etc.) como etiqueta
   * visible. Solo fuera de producción: en visaxai.es esas preguntas no salen.
   */
  showPending: process.env.VERCEL_ENV !== 'production',
} as const;
