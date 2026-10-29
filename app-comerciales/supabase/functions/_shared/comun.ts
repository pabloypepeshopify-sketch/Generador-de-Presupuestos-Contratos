// Utilidades comunes de las funciones de captación (radar, informe y WhatsApp).
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const VISAX = {
  nombre: "VISAX NFC",
  web: "https://visaxnfc.es",
  whatsapp: "34656999241",
  telefono: "656 999 241",
  email: "contactovisaxai@gmail.com",
  // Dónde vive la página pública del informe (enlaces de cartas, QR, NFC y mensajes)
  informe: (Deno.env.get("INFORME_URL") ?? "https://visax-informe.vercel.app").replace(/\/$/, ""),
};

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

export function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Miembro del equipo que hace la petición (por su sesión de la app), o null.
export async function miembro(req: Request, db: SupabaseClient) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: auth } = await db.auth.getUser(token);
  if (!auth?.user) return null;
  const { data: yo } = await db.from("perfiles").select("id, rol, activo, nombre").eq("id", auth.user.id).maybeSingle();
  return yo?.activo ? yo : null;
}

// Teléfonos españoles a 9 cifras (como en la app del equipo)
export function normTel(t: unknown) {
  let d = String(t ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (d.length === 11 && d.startsWith("34")) d = d.slice(2);
  return d;
}
export const esMovil = (t: unknown) => /^[67]\d{8}$/.test(normTel(t));

export const texto = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// Fecha de hoy en Madrid (AAAA-MM-DD) y "29/10" para las notas
export const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
export const diaMesMadrid = () =>
  new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit" }).format(new Date());

// IP cifrada (no guardamos la IP real)
export async function huellaIp(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "sin-ip";
  const bytes = new TextEncoder().encode(`${ip}|${Deno.env.get("SUPABASE_URL")}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Cuenta una petición y dice si cabe dentro del límite (máximo en los últimos `minutos`).
export async function dentroDelLimite(db: SupabaseClient, clave: string, maximo: number, minutos: number) {
  const desde = new Date(Date.now() - minutos * 60_000).toISOString();
  const { count, error } = await db.from("limites_web").select("id", { count: "exact", head: true })
    .eq("clave", clave).gte("creado_en", desde);
  if (error) throw error;
  if ((count ?? 0) >= maximo) return false;
  await db.from("limites_web").insert({ clave });
  return true;
}

// Añade una línea a las notas del local sin borrar lo que hubiera
export async function anotar(db: SupabaseClient, localId: string, linea: string) {
  const { data } = await db.from("locales").select("notas").eq("id", localId).maybeSingle();
  const notas = [data?.notas, `[${diaMesMadrid()}] ${linea}`].filter(Boolean).join("\n").slice(-4000);
  await db.from("locales").update({ notas }).eq("id", localId);
}

// Marca el local para que el equipo lo llame hoy (sin pisar citas ni clientes)
export async function pedirLlamada(db: SupabaseClient, localId: string, motivo: string) {
  const { data: l } = await db.from("locales").select("estado").eq("id", localId).maybeSingle();
  const cambios: Record<string, unknown> = { pidio_contacto_en: new Date().toISOString() };
  if (l && ["pendiente", "no_contesta", "rellamar", "no_interesa"].includes(l.estado)) {
    cambios.estado = "rellamar";
    cambios.rellamar_fecha = hoyMadrid();
    cambios.rellamar_hora = null;
  }
  await db.from("locales").update(cambios).eq("id", localId);
  await db.from("eventos").insert({ local_id: localId, tipo: "contacto", detalle: motivo.slice(0, 500) });
}
