// WhatsApp Business (API de Meta): el agente contesta solo a quien escribe al número de VISAX
// (desde el informe, una carta, un anuncio o un vídeo). Nunca escribe en frío a nadie.
// Secretos: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN y WHATSAPP_APP_SECRET.
// Desde la app, el equipo contesta a mano y el agente se pausa en esa conversación.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { admin, cors, json, miembro, normTel, texto } from "../_shared/comun.ts";
import { atender, crearConversacion, mensajeDelCliente, mensajeDelEquipo } from "../_shared/agente.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const GRAPH = `https://graph.facebook.com/${Deno.env.get("WHATSAPP_GRAPH_VERSION") ?? "v24.0"}`;
const env = (k: string) => Deno.env.get(k) ?? "";

async function enviarWhatsApp(to: string, body: string) {
  const res = await fetch(`${GRAPH}/${env("WHATSAPP_PHONE_ID")}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: true, body: body.slice(0, 4000) } }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`WhatsApp: ${e?.error?.message ?? res.status}`);
  }
}

// Meta firma cada aviso con el secreto de la app (cabecera X-Hub-Signature-256)
async function firmaValida(req: Request, crudo: string) {
  const secreto = env("WHATSAPP_APP_SECRET");
  const firma = req.headers.get("x-hub-signature-256") ?? "";
  if (!secreto || !firma.startsWith("sha256=")) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(crudo)));
  const esperado = [...mac].map((x) => x.toString(16).padStart(2, "0")).join("");
  const dada = firma.slice(7);
  if (dada.length !== esperado.length) return false;
  let dif = 0;
  for (let i = 0; i < dada.length; i++) dif |= dada.charCodeAt(i) ^ esperado.charCodeAt(i);
  return dif === 0;
}

// deno-lint-ignore no-explicit-any
function textoDelMensaje(m: any): string {
  const t = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title;
  if (t) return String(t).slice(0, 2000);
  const tipos: Record<string, string> = { audio: "un audio", image: "una foto", video: "un vídeo", document: "un documento", sticker: "un sticker", location: "una ubicación" };
  return `(El cliente ha enviado ${tipos[m.type] ?? "algo"} que no puedes ver. Pídele con amabilidad que te lo escriba.)`;
}

// deno-lint-ignore no-explicit-any
async function localPara(db: SupabaseClient, waId: string, txt: string, perfil: string): Promise<any> {
  // 1) Viene de su informe: el mensaje lleva su referencia
  const ref = txt.match(/\bref\.?\s*([a-z2-9]{8})\b/i)?.[1]?.toLowerCase();
  if (ref) {
    const { data } = await db.from("locales").select("*").eq("codigo", ref).maybeSingle();
    if (data) return data;
  }
  // 2) Ya le teníamos con ese móvil
  const tel = waId.startsWith("34") ? normTel(waId) : "";
  if (tel.length === 9) {
    const { data } = await db.from("locales").select("*").or(`dueno_telefono.not.is.null,telefono.not.is.null`);
    const l = (data ?? []).find((x) => normTel(x.dueno_telefono) === tel || normTel(x.telefono) === tel);
    if (l) return l;
  }
  // 3) Nuevo: ficha provisional que el agente completa al saber el nombre del local
  const { data, error } = await db.from("locales").insert({
    nombre: `WhatsApp · ${perfil || `+${waId}`}`, origen: "whatsapp", dueno_nombre: perfil || null,
    dueno_telefono: tel || `+${waId}`, estado: "pendiente",
  }).select().single();
  if (error) throw error;
  return data;
}

// deno-lint-ignore no-explicit-any
async function procesar(db: SupabaseClient, m: any, perfil: string) {
  const waId = String(m.from ?? "");
  if (!/^\d{6,16}$/.test(waId)) return;
  const txt = textoDelMensaje(m);
  let { data: conv } = await db.from("conversaciones").select("*").eq("canal", "whatsapp").eq("wa_id", waId).maybeSingle();
  if (!conv) {
    const local = await localPara(db, waId, txt, perfil);
    try {
      conv = await crearConversacion(db, local, "whatsapp", waId);
      await db.from("eventos").insert({ local_id: local.id, tipo: "whatsapp", detalle: `Escribió por WhatsApp: ${txt.slice(0, 150)}` });
    } catch {
      ({ data: conv } = await db.from("conversaciones").select("*").eq("canal", "whatsapp").eq("wa_id", waId).single());
    }
  }
  if (!(await mensajeDelCliente(db, conv.id, txt, String(m.id ?? "")))) return; // repetido
  await atender(db, conv.id, (t) => enviarWhatsApp(waId, t));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = admin();

  // Verificación del webhook al darlo de alta en Meta
  if (req.method === "GET") {
    const u = new URL(req.url);
    const ok = u.searchParams.get("hub.mode") === "subscribe" && env("WHATSAPP_VERIFY_TOKEN") &&
      u.searchParams.get("hub.verify_token") === env("WHATSAPP_VERIFY_TOKEN");
    return ok ? new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 }) : new Response("Prohibido", { status: 403 });
  }
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  // Respuesta a mano desde la app del equipo
  if (req.headers.get("Authorization")) {
    try {
      const b = await req.json();
      if (b.accion !== "enviar") return json({ error: "Acción desconocida" }, 400);
      const yo = await miembro(req, db);
      if (!yo) return json({ error: "Sesión no válida, vuelve a entrar" }, 401);
      const txt = String(b.texto ?? "").trim().slice(0, 2000);
      if (!txt) return json({ error: "Escribe el mensaje" }, 400);
      const { data: conv } = await db.from("conversaciones").select("*").eq("id", String(b.conversacion_id ?? "")).maybeSingle();
      if (!conv || conv.canal !== "whatsapp") return json({ error: "Solo se puede contestar a conversaciones de WhatsApp" }, 400);
      await db.from("locales").update({ agente_pausado: true }).eq("id", conv.local_id);
      await enviarWhatsApp(conv.wa_id, txt);
      await mensajeDelEquipo(db, conv.id, txt);
      return json({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Fuera de las 24 h desde su último mensaje, WhatsApp solo deja enviar plantillas aprobadas
      return json({ error: /24|window|re-engagement/i.test(msg) ? "Han pasado más de 24 h desde su último mensaje: WhatsApp no deja escribirle hasta que conteste. Llámale." : msg }, 400);
    }
  }

  // Avisos de Meta (mensajes entrantes)
  const crudo = await req.text();
  if (!(await firmaValida(req, crudo))) return new Response("Firma no válida", { status: 401 });
  // deno-lint-ignore no-explicit-any
  let aviso: any;
  try {
    aviso = JSON.parse(crudo);
  } catch {
    return new Response("ok");
  }
  const tareas: Promise<unknown>[] = [];
  for (const entrada of aviso.entry ?? []) {
    for (const cambio of entrada.changes ?? []) {
      const v = cambio.value ?? {};
      // deno-lint-ignore no-explicit-any
      const perfiles = new Map((v.contacts ?? []).map((c: any) => [c.wa_id, texto(c.profile?.name, 60)]));
      for (const m of v.messages ?? []) {
        tareas.push(procesar(db, m, String(perfiles.get(m.from) ?? "")).catch((e) => console.error("whatsapp", e)));
      }
    }
  }
  // Contestamos a Meta enseguida y el agente sigue trabajando en segundo plano
  const todo = Promise.all(tareas);
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(todo);
  else await todo;
  return new Response("ok");
});
