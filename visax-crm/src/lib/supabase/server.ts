import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { entorno } from '@/lib/entorno';

// Cliente de Supabase para el servidor: usa la sesión del socio guardada en cookies,
// así que todas las consultas pasan por las políticas RLS de la base de datos.
export async function crearClienteServidor() {
  const almacen = await cookies();
  const { url, clave } = entorno();
  return createServerClient(url, clave, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // En un Server Component no se pueden escribir cookies; el middleware ya refresca la sesión.
        }
      },
    },
  });
}
