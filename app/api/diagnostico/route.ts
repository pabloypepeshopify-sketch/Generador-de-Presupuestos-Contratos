import { NextResponse } from 'next/server';
import { limpiarDiagnostico, pareceSpam, validarDiagnostico } from '@/lib/forms';
import { enviarAN8n, leerJson } from '@/lib/n8n';

export const dynamic = 'force-dynamic';

/** Solicitud de diagnóstico → n8n → correo a contactovisaxai@gmail.com */
export async function POST(req: Request) {
  const raw = await leerJson(req);
  if (!raw) return NextResponse.json({ ok: false, error: 'formato' }, { status: 400 });

  // Bots: respondemos «ok» para no darles pistas, pero no se envía nada.
  if (pareceSpam(raw)) return NextResponse.json({ ok: true });

  const datos = limpiarDiagnostico(raw);
  const errores = validarDiagnostico(datos);
  if (Object.keys(errores).length) return NextResponse.json({ ok: false, error: 'datos', errores }, { status: 400 });

  const { status } = await enviarAN8n('diagnostico', { ...datos, origen: 'visaxai.es' });
  if (status >= 200 && status < 300) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false, error: 'envio' }, { status: 502 });
}
