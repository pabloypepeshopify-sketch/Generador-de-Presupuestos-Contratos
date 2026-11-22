import { NextResponse } from 'next/server';
import { limpiarVisita, pareceSpam, validarVisita } from '@/lib/forms';
import { enviarAN8n, leerJson } from '@/lib/n8n';

export const dynamic = 'force-dynamic';

/** Reserva de visita → n8n → Google Calendar + correo a contactovisaxai@gmail.com */
export async function POST(req: Request) {
  const raw = await leerJson(req);
  if (!raw) return NextResponse.json({ ok: false, error: 'formato' }, { status: 400 });
  if (pareceSpam(raw)) return NextResponse.json({ ok: true });

  const datos = limpiarVisita(raw);
  const errores = validarVisita(datos);
  if (Object.keys(errores).length) return NextResponse.json({ ok: false, error: 'datos', errores }, { status: 400 });

  const { status, body } = await enviarAN8n('visitas/reservar', { ...datos, origen: 'visaxai.es' });
  if (status >= 200 && status < 300) return NextResponse.json({ ok: true });
  if (status === 409) return NextResponse.json({ ok: false, error: 'ocupado' }, { status: 409 });
  if (status === 400) return NextResponse.json({ ok: false, error: body.error === 'hueco' ? 'hueco' : 'datos' }, { status: 400 });
  return NextResponse.json({ ok: false, error: 'envio' }, { status: 502 });
}
