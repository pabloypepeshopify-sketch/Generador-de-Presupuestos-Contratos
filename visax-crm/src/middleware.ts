import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLICAS = ['/login', '/activar'];

// Refresca la sesión en cada petición y manda al login a quien no la tenga.
// La comprobación de que la cuenta es de un socio se hace además en el layout y en la base de datos (RLS).
export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const esPublica = PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));

  if (!user && !esPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = '/login';
    destino.search = ruta === '/' ? '' : `?volver=${encodeURIComponent(ruta + request.nextUrl.search)}`;
    return NextResponse.redirect(destino);
  }
  if (user && ruta === '/login') {
    const destino = request.nextUrl.clone();
    destino.pathname = '/';
    destino.search = '';
    return NextResponse.redirect(destino);
  }
  return respuesta;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|marca.svg|icono.*\\.png|manifest.webmanifest).*)'],
};
