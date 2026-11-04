import { NextResponse, type NextRequest } from 'next/server';
import { obtenerSesion } from '@/lib/sesion';

// Abre una factura o un justificante: comprueba la sesión del socio y redirige a un enlace temporal
// del almacén privado (caduca a los 2 minutos). ?de=factura|gasto · &descargar=1 para bajarlo.
export async function GET(peticion: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, socio } = await obtenerSesion();
  if (!socio) return NextResponse.redirect(new URL('/login', peticion.url));
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('No encontrado', { status: 404 });

  const de = peticion.nextUrl.searchParams.get('de');
  const fila =
    de === 'gasto'
      ? (await supabase.from('gastos').select('path:justificante_path, nombre:justificante_nombre').eq('id', id).maybeSingle()).data
      : (await supabase.from('facturas').select('path:archivo_path, nombre:archivo_nombre').eq('id', id).maybeSingle()).data;
  if (!fila?.path) return new NextResponse('No encontrado', { status: 404 });

  const descargar = peticion.nextUrl.searchParams.get('descargar') === '1';
  const { data, error } = await supabase.storage.from('documentos').createSignedUrl(fila.path, 120, descargar ? { download: fila.nombre ?? true } : undefined);
  if (error || !data) return new NextResponse('No se ha podido abrir el archivo', { status: 502 });
  return NextResponse.redirect(data.signedUrl);
}
