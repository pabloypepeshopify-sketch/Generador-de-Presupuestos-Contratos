import { cookies } from 'next/headers';

// Mensaje para mostrar tras una redirección («Contacto registrado»). Lo lee y borra el navegador.
export async function avisarTrasRedirigir(clave: 'creado' | 'contacto' | 'borrado' | 'bienvenida' | 'activada') {
  (await cookies()).set('crm_aviso', clave, { maxAge: 60, path: '/', sameSite: 'lax' });
}
