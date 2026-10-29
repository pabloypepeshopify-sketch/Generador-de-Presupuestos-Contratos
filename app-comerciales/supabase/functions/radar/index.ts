// Radar: busca bares y restaurantes en Google Maps por zonas y los mete en la lista del equipo
// con su nota, sus reseñas y cómo están frente a su zona. Si ya estaban, les refresca los datos.
// Lo llama el cron cada mañana (las zonas que tocan) o un socio desde la app (una zona ahora).
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { admin, cors, json, miembro, normTel } from "../_shared/comun.ts";
import { SinClaveGoogle, buscarTexto, cifrasZona, oportunidad } from "../_shared/google.ts";

const ZONAS_POR_DIA = Number(Deno.env.get("RADAR_ZONAS_DIA") ?? 4);

type Zona = { id: string; consulta: string; zona: string; cada_dias: number; ultima_busqueda_en: string | null };

async function barrer(db: SupabaseClient, zona: Zona, creadoPor: string | null) {
  const sitios = (await buscarTexto(zona.consulta)).filter((s) => s.abierto && s.hosteleria);
  const cifras = cifrasZona(sitios);
  const { data: busqueda, error } = await db.from("busquedas").insert({
    zona_id: zona.id, consulta: zona.consulta, zona: zona.zona, resultados: sitios.length,
    media_nota: cifras.media_nota, mediana_resenas: cifras.mediana_resenas, top: cifras.top, creado_por: creadoPor,
  }).select().single();
  if (error) throw error;

  // Ya en la lista: por ficha de Google o, si se apuntó a mano, por teléfono
  const { data: conGoogle } = await db.from("locales").select("id, google_id").in("google_id", sitios.map((s) => s.google_id));
  const { data: sinGoogle } = await db.from("locales").select("id, telefono, direccion").is("google_id", null).not("telefono", "is", null);
  const porGoogle = new Map((conGoogle ?? []).map((l) => [l.google_id, l.id]));
  const porTel = new Map((sinGoogle ?? []).filter((l) => normTel(l.telefono).length === 9).map((l) => [normTel(l.telefono), l]));

  const nuevos = [];
  let actualizados = 0;
  for (const s of sitios) {
    const google = {
      google_nota: s.nota, google_resenas: s.resenas, maps_url: s.maps_url, web: s.web,
      oportunidad: oportunidad(s, cifras), busqueda_id: busqueda.id,
    };
    const id = porGoogle.get(s.google_id);
    const mismoTel = !id && s.telefono ? porTel.get(normTel(s.telefono)) : undefined;
    if (id) {
      await db.from("locales").update(google).eq("id", id);
      actualizados++;
    } else if (mismoTel) {
      await db.from("locales").update({ ...google, google_id: s.google_id, direccion: mismoTel.direccion ?? s.direccion }).eq("id", mismoTel.id);
      porTel.delete(normTel(s.telefono));
      actualizados++;
    } else {
      nuevos.push({
        ...google, nombre: s.nombre, tipo: s.tipo, telefono: s.telefono, direccion: s.direccion,
        zona: zona.zona, origen: "radar", google_id: s.google_id,
      });
    }
  }
  let creados = 0;
  if (nuevos.length) {
    const { data, error: e2 } = await db.from("locales")
      .upsert(nuevos, { onConflict: "google_id", ignoreDuplicates: true }).select("id");
    if (e2) throw e2;
    creados = data?.length ?? 0;
  }

  const resumen = `${sitios.length} encontrados · ${creados} nuevos · ${actualizados} actualizados`;
  await db.from("busquedas").update({ nuevos: creados }).eq("id", busqueda.id);
  await db.from("zonas").update({ ultima_busqueda_en: new Date().toISOString(), ultimo_resultado: resumen }).eq("id", zona.id);
  return { busqueda_id: busqueda.id, resultados: sitios.length, nuevos: creados, actualizados, ...cifras, resumen };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const db = admin();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Petición no válida" }, 400);
  }

  try {
    // Pasada automática diaria (cron de la base de datos)
    if (body.accion === "automatico") {
      const { data: ok } = await db.rpc("radar_cron_ok", { secreto: req.headers.get("x-radar-cron") ?? "" });
      if (!ok) return json({ error: "No autorizado" }, 401);
      const { data: zonas } = await db.from("zonas").select("*").eq("activa", true)
        .order("ultima_busqueda_en", { ascending: true, nullsFirst: true });
      const tocan = (zonas ?? []).filter((z: Zona) =>
        !z.ultima_busqueda_en || Date.now() - Date.parse(z.ultima_busqueda_en) >= z.cada_dias * 864e5 - 3600e3
      ).slice(0, ZONAS_POR_DIA);
      const hechas = [];
      for (const z of tocan) {
        try {
          hechas.push({ zona: z.consulta, ...(await barrer(db, z, null)) });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await db.from("zonas").update({ ultimo_resultado: `Error: ${msg}`.slice(0, 300) }).eq("id", z.id);
          hechas.push({ zona: z.consulta, error: msg });
          if (e instanceof SinClaveGoogle) break;
        }
      }
      return json({ ok: true, hechas });
    }

    // Un socio lanza una zona desde la app
    if (body.accion === "zona") {
      const yo = await miembro(req, db);
      if (!yo) return json({ error: "Sesión no válida, vuelve a entrar" }, 401);
      if (yo.rol !== "socio") return json({ error: "Solo los socios pueden usar el radar" }, 403);
      const { data: zona } = await db.from("zonas").select("*").eq("id", String(body.zona_id ?? "")).maybeSingle();
      if (!zona) return json({ error: "Esa zona ya no existe" }, 404);
      try {
        return json({ ok: true, ...(await barrer(db, zona, yo.id)) });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await db.from("zonas").update({ ultimo_resultado: `Error: ${msg}`.slice(0, 300) }).eq("id", zona.id);
        return json({ error: msg }, e instanceof SinClaveGoogle ? 503 : 502);
      }
    }

    return json({ error: "Acción desconocida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Error inesperado" }, 500);
  }
});
