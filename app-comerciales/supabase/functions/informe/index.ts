// API pública de la página del informe (…/para/<codigo>) y de «Analiza tu local gratis»:
// datos del local frente a su zona, registro de lo que hace el visitante, petición de
// contacto y chat con el agente. Nunca devuelve notas, teléfonos del dueño ni estados internos.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { VISAX, admin, anotar, cors, dentroDelLimite, huellaIp, json, normTel, pedirLlamada, texto } from "../_shared/comun.ts";
import { SinClaveGoogle, candidatos, cifrasZona, ficha, oportunidad, vecinos } from "../_shared/google.ts";
import { SALUDO_WEB, atender, crearConversacion, mensajeDelCliente } from "../_shared/agente.ts";

const CODIGO = /^[a-z2-9]{8}$/;
const ORIGENES = new Set(["qr", "nfc", "carta", "ig", "wa", "email", "web", "anuncio", "video", "analiza"]);

// deno-lint-ignore no-explicit-any
type Local = Record<string, any>;

async function localPorCodigo(db: SupabaseClient, codigo: unknown): Promise<Local | null> {
  if (typeof codigo !== "string" || !CODIGO.test(codigo)) return null;
  const { data } = await db.from("locales").select("*").eq("codigo", codigo).maybeSingle();
  return data;
}

async function vistaPublica(db: SupabaseClient, l: Local) {
  const [{ data: busqueda }, { data: productos }] = await Promise.all([
    l.busqueda_id
      ? db.from("busquedas").select("consulta, zona, resultados, media_nota, mediana_resenas, top, creado_en").eq("id", l.busqueda_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("productos").select("nombre, descripcion, precio, precio_volumen, url").eq("activo", true).order("orden"),
  ]);
  return {
    codigo: l.codigo,
    nombre: String(l.nombre).startsWith("WhatsApp ·") ? "Tu local" : l.nombre,
    tipo: l.tipo,
    zona: l.zona,
    google: l.google_nota != null || l.google_resenas != null
      ? { nota: l.google_nota != null ? Number(l.google_nota) : null, resenas: l.google_resenas ?? 0, maps_url: l.maps_url }
      : null,
    zona_cifras: busqueda
      ? {
        consulta: busqueda.consulta,
        resultados: busqueda.resultados,
        media_nota: busqueda.media_nota != null ? Number(busqueda.media_nota) : null,
        mediana_resenas: busqueda.mediana_resenas,
        // deno-lint-ignore no-explicit-any
        top: (busqueda.top ?? []).filter((t: any) => t.nombre !== l.nombre).slice(0, 4),
        fecha: busqueda.creado_en,
      }
      : null,
    productos: productos ?? [],
    contacto: { whatsapp: VISAX.whatsapp, telefono: VISAX.telefono, web: VISAX.web },
    chat: { activo: Boolean(Deno.env.get("ANTHROPIC_API_KEY")) && !l.agente_pausado, saludo: SALUDO_WEB },
  };
}

async function mensajesVisibles(db: SupabaseClient, conversacionId: string, desdeId: number) {
  const { data } = await db.from("mensajes").select("id, autor, texto")
    .eq("conversacion_id", conversacionId).gt("id", desdeId).in("autor", ["cliente", "agente", "equipo"])
    .not("texto", "is", null).order("id");
  return data ?? [];
}

const ciudadDe = (direccion: string | null) => direccion?.match(/\b\d{5}\s+([^,]+)/)?.[1]?.trim() ?? null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const db = admin();
  // deno-lint-ignore no-explicit-any
  let b: Record<string, any>;
  try {
    b = await req.json();
  } catch {
    return json({ error: "Petición no válida" }, 400);
  }
  const ip = await huellaIp(req);
  const limite = (accion: string, max: number, minutos: number) => dentroDelLimite(db, `${accion}:${ip}`, max, minutos);
  const demasiadas = () => json({ error: "Demasiadas peticiones seguidas. Prueba dentro de un rato." }, 429);

  try {
    switch (b.accion) {
      case "ver": {
        if (!(await limite("ver", 60, 10))) return demasiadas();
        const l = await localPorCodigo(db, b.codigo);
        if (!l) return json({ error: "No encontramos este informe" }, 404);
        if (!b.vista_previa) {
          const origen = ORIGENES.has(b.origen) ? b.origen : null;
          await db.from("eventos").insert({ local_id: l.id, tipo: "visto", detalle: origen });
          await db.from("locales").update({ informe_visto_en: new Date().toISOString(), informe_visitas: (l.informe_visitas ?? 0) + 1 }).eq("id", l.id);
        }
        return json(await vistaPublica(db, l));
      }

      case "evento": {
        if (!["whatsapp", "tienda"].includes(b.tipo)) return json({ error: "Evento no válido" }, 400);
        if (!(await limite("evento", 60, 10))) return demasiadas();
        const l = await localPorCodigo(db, b.codigo);
        if (!l) return json({ error: "No encontramos este informe" }, 404);
        if (!b.vista_previa) await db.from("eventos").insert({ local_id: l.id, tipo: b.tipo, detalle: texto(b.detalle, 200) || null });
        return json({ ok: true });
      }

      case "contacto": {
        if (b.acepto !== true) return json({ error: "Marca la casilla para que podamos contactarte" }, 400);
        const nombre = texto(b.nombre, 80);
        const tel = texto(b.telefono, 30);
        if (!nombre) return json({ error: "Dinos tu nombre" }, 400);
        if (normTel(tel).length !== 9) return json({ error: "Escribe un teléfono de 9 cifras" }, 400);
        if (!(await limite("contacto", 5, 60))) return demasiadas();
        const l = await localPorCodigo(db, b.codigo);
        if (!l) return json({ error: "No encontramos este informe" }, 404);
        const cambios: Record<string, unknown> = {};
        if (!l.dueno_nombre) cambios.dueno_nombre = nombre;
        if (!l.dueno_telefono) cambios.dueno_telefono = tel;
        if (Object.keys(cambios).length) await db.from("locales").update(cambios).eq("id", l.id);
        const mensaje = texto(b.mensaje, 500);
        await pedirLlamada(db, l.id, `Formulario del informe: ${nombre} · ${tel}${mensaje ? ` · ${mensaje}` : ""}`);
        await anotar(db, l.id, `Pidió que le contactemos desde su informe: ${nombre} · ${tel}${mensaje ? ` · «${mensaje}»` : ""} (aceptó la política de privacidad)`);
        return json({ ok: true });
      }

      // «Analiza tu local»: primero candidatos por nombre y ciudad…
      case "buscar": {
        const consulta = `${texto(b.nombre, 80)} ${texto(b.ciudad, 60)}`.trim();
        if (consulta.length < 3) return json({ error: "Escribe el nombre del local y la ciudad" }, 400);
        if (!(await limite("buscar", 10, 60)) || !(await dentroDelLimite(db, "buscar:dia", 400, 1440))) return demasiadas();
        return json({ candidatos: await candidatos(consulta) });
      }

      // …y luego el informe del elegido, comparado con los locales de alrededor
      case "analizar": {
        const googleId = texto(b.google_id, 300);
        if (!googleId) return json({ error: "Elige tu local" }, 400);
        const { data: ya } = await db.from("locales").select("id, codigo").eq("google_id", googleId).maybeSingle();
        if (ya) {
          await db.from("eventos").insert({ local_id: ya.id, tipo: "analizado", detalle: "Lo analizó desde la web (ya estaba en la lista)" });
          return json({ codigo: ya.codigo });
        }
        if (!(await limite("analizar", 5, 60)) || !(await dentroDelLimite(db, "analizar:dia", 200, 1440))) return demasiadas();
        const s = await ficha(googleId);
        const alrededor = s.lat != null && s.lng != null ? (await vecinos(s.lat, s.lng)).filter((v) => v.google_id !== s.google_id) : [];
        const cifras = cifrasZona(alrededor);
        const ciudad = ciudadDe(s.direccion);
        const { data: busqueda, error: e1 } = await db.from("busquedas").insert({
          consulta: `alrededor de ${s.nombre}`, zona: ciudad, resultados: alrededor.length,
          media_nota: cifras.media_nota, mediana_resenas: cifras.mediana_resenas, top: cifras.top,
        }).select().single();
        if (e1) throw e1;
        const google = {
          google_id: s.google_id, google_nota: s.nota, google_resenas: s.resenas, maps_url: s.maps_url, web: s.web,
          oportunidad: oportunidad(s, cifras), busqueda_id: busqueda.id,
        };
        // ¿Lo teníamos apuntado a mano con el mismo teléfono?
        let local: Local | null = null;
        if (s.telefono && normTel(s.telefono).length === 9) {
          const { data: mismos } = await db.from("locales").select("id, codigo, telefono").is("google_id", null).not("telefono", "is", null);
          const m = (mismos ?? []).find((x) => normTel(x.telefono) === normTel(s.telefono));
          if (m) {
            await db.from("locales").update(google).eq("id", m.id);
            local = m;
          }
        }
        if (!local) {
          const { data, error } = await db.from("locales").insert({
            ...google, nombre: s.nombre, tipo: s.tipo, telefono: s.telefono, direccion: s.direccion, zona: ciudad, origen: "web",
          }).select("id, codigo").single();
          if (error) throw error;
          local = data;
        }
        await db.from("eventos").insert({ local_id: local!.id, tipo: "analizado", detalle: "Analizó su local desde la web" });
        return json({ codigo: local!.codigo });
      }

      case "chat": {
        const txt = String(b.texto ?? "").trim().slice(0, 1000);
        if (!txt) return json({ error: "Escribe un mensaje" }, 400);
        if (!(await limite("chat", 20, 10))) return demasiadas();
        const l = await localPorCodigo(db, b.codigo);
        if (!l) return json({ error: "No encontramos este informe" }, 404);
        let convId = typeof b.conversacion_id === "string" ? b.conversacion_id : "";
        if (convId) {
          const { data: c } = await db.from("conversaciones").select("id").eq("id", convId).eq("local_id", l.id).eq("canal", "web").maybeSingle();
          if (!c) convId = "";
        }
        if (!convId) {
          convId = (await crearConversacion(db, l, "web")).id;
          await db.from("eventos").insert({ local_id: l.id, tipo: "chat", detalle: txt.slice(0, 200) });
        }
        await mensajeDelCliente(db, convId, txt);
        // Si la conversación la lleva el equipo, el mensaje le llega como aviso para llamar
        if (l.agente_pausado) await pedirLlamada(db, l.id, `Escribió en el chat de su informe: ${txt.slice(0, 300)}`);
        const respuestas = l.agente_pausado ? [] : await atender(db, convId);
        return json({
          conversacion_id: convId,
          mensajes: await mensajesVisibles(db, convId, Number(b.desde_id) || 0),
          pendiente: !l.agente_pausado && !respuestas.length,
          pausado: !!l.agente_pausado,
        });
      }

      case "chat_ver": {
        if (!(await limite("chat_ver", 120, 10))) return demasiadas();
        const l = await localPorCodigo(db, b.codigo);
        if (!l || typeof b.conversacion_id !== "string") return json({ error: "No encontrado" }, 404);
        const { data: c } = await db.from("conversaciones").select("id").eq("id", b.conversacion_id).eq("local_id", l.id).maybeSingle();
        if (!c) return json({ error: "No encontrado" }, 404);
        return json({ mensajes: await mensajesVisibles(db, c.id, Number(b.desde_id) || 0) });
      }

      default:
        return json({ error: "Acción desconocida" }, 400);
    }
  } catch (e) {
    if (e instanceof SinClaveGoogle) return json({ error: "El análisis automático todavía no está activo. Escríbenos por WhatsApp y te lo preparamos." }, 503);
    console.error(e);
    return json({ error: "Algo ha fallado. Inténtalo otra vez en un momento." }, 500);
  }
});
