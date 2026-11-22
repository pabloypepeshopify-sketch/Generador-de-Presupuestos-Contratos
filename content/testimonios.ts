/**
 * Testimonios de clientes. VACÍO a propósito: solo se añaden testimonios
 * reales, con el permiso del cliente. La sección se activa en config/flags.ts.
 */
export type Testimonio = { quote: string; name: string; company: string };

export const testimonios: Testimonio[] = [];
