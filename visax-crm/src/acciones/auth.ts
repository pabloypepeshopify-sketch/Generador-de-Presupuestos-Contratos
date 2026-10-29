'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { crearClienteServidor } from '@/lib/supabase/server';
import { emailDeUsuario, entorno } from '@/lib/entorno';
import { obtenerSesion } from '@/lib/sesion';
import type { ResultadoAccion } from '@/lib/tipos';
import { avisarTrasRedirigir } from '@/lib/aviso';

const usuarioValido = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{2,30}$/, 'Usuario no válido');

const destinoSeguro = (v: FormDataEntryValue | null) => {
  const s = typeof v === 'string' ? v : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : '/';
};

export async function iniciarSesion(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const usuario = usuarioValido.safeParse(fd.get('usuario'));
  const password = String(fd.get('password') ?? '');
  if (!usuario.success || !password) return { ok: false, error: 'Escribe tu usuario y tu contraseña' };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email: emailDeUsuario(usuario.data), password });
  if (error || !data.user) {
    return { ok: false, error: /rate|too many/i.test(error?.message ?? '') ? 'Demasiados intentos. Espera unos minutos.' : 'Usuario o contraseña incorrectos' };
  }
  const { data: socio } = await supabase.from('socios').select('id').eq('id', data.user.id).maybeSingle();
  if (!socio) {
    await supabase.auth.signOut();
    return { ok: false, error: 'Esta cuenta no tiene acceso al CRM' };
  }
  redirect(destinoSeguro(fd.get('volver')));
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect('/login');
}

const esquemaActivar = z
  .object({
    usuario: usuarioValido,
    codigo: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'El código tiene el formato XXXX-XXXX-XXXX'),
    password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres').max(72),
    password2: z.string(),
  })
  .refine((d) => d.password === d.password2, { message: 'Las contraseñas no coinciden', path: ['password2'] });

/** Primer acceso o recuperación: canjea el código de un solo uso y fija la contraseña */
export async function activarCuenta(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const datos = esquemaActivar.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { ok: false, error: datos.error.issues[0].message };

  const { url, clave } = entorno();
  let respuesta: Response;
  try {
    respuesta = await fetch(`${url}/functions/v1/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: clave },
      body: JSON.stringify({ usuario: datos.data.usuario, codigo: datos.data.codigo, password: datos.data.password }),
      cache: 'no-store',
    });
  } catch {
    return { ok: false, error: 'No se ha podido conectar. Inténtalo de nuevo.' };
  }
  const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
  if (!respuesta.ok) return { ok: false, error: cuerpo.error ?? 'No se ha podido activar la cuenta' };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email: emailDeUsuario(datos.data.usuario), password: datos.data.password });
  if (error) {
    await avisarTrasRedirigir('activada');
    redirect('/login');
  }
  await avisarTrasRedirigir('bienvenida');
  redirect('/');
}

const esquemaContrasena = z
  .object({ password: z.string().min(10, 'Mínimo 10 caracteres').max(72), password2: z.string() })
  .refine((d) => d.password === d.password2, { message: 'Las contraseñas no coinciden', path: ['password2'] });

export async function cambiarContrasena(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return { ok: false, error: 'Tu sesión ha caducado' };
  const datos = esquemaContrasena.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { ok: false, error: datos.error.issues[0].message };
  const { error } = await supabase.auth.updateUser({ password: datos.data.password });
  if (error) return { ok: false, error: /same|different/i.test(error.message) ? 'La nueva contraseña debe ser distinta de la actual' : 'No se ha podido cambiar la contraseña' };
  return { ok: true, mensaje: 'Contraseña cambiada' };
}

/** Un socio genera un código para recuperar el acceso (el suyo o el del otro socio) */
export async function generarCodigoAcceso(_: ResultadoAccion<string> | null, fd: FormData): Promise<ResultadoAccion<string>> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return { ok: false, error: 'Tu sesión ha caducado' };
  const usuario = usuarioValido.safeParse(fd.get('usuario'));
  if (!usuario.success) return { ok: false, error: 'Elige a quién' };
  const { data, error } = await supabase.rpc('generar_codigo_acceso', { p_usuario: usuario.data });
  if (error || !data) return { ok: false, error: 'No se ha podido generar el código' };
  return { ok: true, datos: data as string };
}

const esquemaPerfil = z.object({
  nombre: z.string().trim().min(1, 'Pon tu nombre').max(60),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color no válido'),
});

export async function actualizarPerfil(_: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return { ok: false, error: 'Tu sesión ha caducado' };
  const datos = esquemaPerfil.safeParse(Object.fromEntries(fd));
  if (!datos.success) return { ok: false, error: datos.error.issues[0].message };
  const { error } = await supabase.from('socios').update(datos.data).eq('id', socio.id);
  if (error) return { ok: false, error: 'No se ha podido guardar' };
  return { ok: true, mensaje: 'Perfil guardado' };
}
