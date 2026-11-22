/**
 * Envío de los formularios a n8n (solo servidor: lo usan las rutas de app/api).
 *
 * La URL base de los webhooks NO está en el código: va en la variable de entorno
 * N8N_WEBHOOK_BASE del proyecto de Vercel (p. ej. https://<instancia>/webhook/<ruta>).
 * Así no queda a la vista en el navegador ni en el repositorio.
 *
 * Flujos de n8n (proyecto «VISAX AI»):
 *  - diagnostico              → «VISAX AI · Web · Diagnóstico → Gmail»
 *  - visitas/disponibilidad   → «VISAX AI · Web · Visitas → Google Calendar y Gmail»
 *  - visitas/reservar         → mismo flujo, segunda entrada
 */
export type RutaN8n = 'diagnostico' | 'visitas/disponibilidad' | 'visitas/reservar';

export async function enviarAN8n(ruta: RutaN8n, datos: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const base = process.env.N8N_WEBHOOK_BASE;
  if (!base) {
    console.error('[n8n] Falta la variable de entorno N8N_WEBHOOK_BASE');
    return { status: 503, body: { ok: false, error: 'config' } };
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      body = { ok: res.ok };
    }
    if (!res.ok) console.error(`[n8n] ${ruta} respondió ${res.status}`);
    return { status: res.status, body };
  } catch (err) {
    console.error(`[n8n] ${ruta} no respondió`, err);
    return { status: 504, body: { ok: false, error: 'red' } };
  }
}

/** Lee el JSON de la petición con un tamaño máximo (evita cuerpos enormes). */
export async function leerJson(req: Request, max = 20_000): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > max) return null;
  try {
    const data = JSON.parse(text);
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}
