import { NextResponse } from 'next/server';
import { esFecha } from '@/lib/forms';
import { enviarAN8n, leerJson } from '@/lib/n8n';

export const dynamic = 'force-dynamic';

/** Horas libres de un día para visitas (n8n consulta Google Calendar). */
export async function POST(req: Request) {
  const raw = await leerJson(req, 500);
  if (!raw || !esFecha(raw.fecha)) return NextResponse.json({ ok: false, error: 'fecha', huecos: [] }, { status: 400 });

  const { status, body } = await enviarAN8n('visitas/disponibilidad', { fecha: raw.fecha });
  if (status >= 200 && status < 300 && Array.isArray(body.huecos)) {
    const huecos = (body.huecos as Array<{ hora?: unknown; libre?: unknown }>)
      .filter((h) => typeof h.hora === 'string')
      .map((h) => ({ hora: h.hora as string, libre: h.libre === true }));
    return NextResponse.json({ ok: true, fecha: raw.fecha, duracion: body.duracion ?? 60, huecos });
  }
  if (status === 400) return NextResponse.json({ ok: false, error: 'fecha', huecos: [] }, { status: 400 });
  return NextResponse.json({ ok: false, error: 'envio', huecos: [] }, { status: 502 });
}
