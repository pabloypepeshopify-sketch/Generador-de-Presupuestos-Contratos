// Variables de entorno necesarias (ver .env.example). No hay claves secretas en el frontend.
export function entorno() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ver .env.example)');
  }
  return { url, clave };
}

// Las cuentas no usan correo real: «pablo» entra como pablo@crm.visaxai.es (no se envía nada ahí).
export const DOMINIO_CUENTAS = 'crm.visaxai.es';
export const emailDeUsuario = (usuario: string) => `${usuario.trim().toLowerCase()}@${DOMINIO_CUENTAS}`;
