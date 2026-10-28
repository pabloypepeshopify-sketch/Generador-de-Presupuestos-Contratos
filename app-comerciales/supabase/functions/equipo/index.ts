// Gestión del equipo (solo socios): crear usuarios, cambiar contraseña, renombrar,
// cambiar rol y activar/desactivar. Usa la service role, que nunca sale del servidor.
import { createClient } from "jsr:@supabase/supabase-js@2";

const DOMINIO = "equipo.visaxnfc.es";
const COLORES = ["#7C5CFF", "#33C6F4", "#22C55E", "#F5A524", "#F25F5C", "#EC4899", "#3F7DFB", "#14B8A6"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const limpiarUsuario = (u: unknown) =>
  String(u ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9._-]/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Petición no válida" }, 400);
  }

  // Si aún no hay nadie en el equipo se permite crear el primer socio (arranque).
  const { count } = await admin.from("perfiles").select("id", { count: "exact", head: true });
  const arranque = count === 0 && body.accion === "crear" && body.rol === "socio";

  let yoId = "";
  if (!arranque) {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth } = await admin.auth.getUser(token);
    if (!auth?.user) return json({ error: "Sesión no válida, vuelve a entrar" }, 401);
    const { data: yo } = await admin.from("perfiles").select("rol, activo").eq("id", auth.user.id).maybeSingle();
    if (!yo?.activo || yo.rol !== "socio") return json({ error: "Solo los socios pueden gestionar el equipo" }, 403);
    yoId = auth.user.id;
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (id && id === yoId && (body.activo === false || body.rol === "comercial")) {
    return json({ error: "No puedes quitarte a ti mismo el acceso de socio" }, 400);
  }
  const password = String(body.password ?? "");
  if ("password" in body && password.length < 6) return json({ error: "La contraseña debe tener al menos 6 caracteres" }, 400);

  switch (body.accion) {
    case "crear": {
      const usuario = limpiarUsuario(body.usuario);
      const nombre = String(body.nombre ?? "").trim() || usuario;
      const rol = body.rol === "socio" ? "socio" : "comercial";
      if (!usuario) return json({ error: "Falta el usuario" }, 400);
      if (!password) return json({ error: "Falta la contraseña" }, 400);
      const { data: creado, error } = await admin.auth.admin.createUser({
        email: `${usuario}@${DOMINIO}`,
        password,
        email_confirm: true,
        user_metadata: { usuario, nombre },
      });
      if (error) {
        const yaExiste = /already|registered|exists/i.test(error.message);
        return json({ error: yaExiste ? `El usuario «${usuario}» ya existe` : error.message }, 400);
      }
      const color = COLORES[(count ?? 0) % COLORES.length];
      const { error: e2 } = await admin.from("perfiles").insert({ id: creado.user.id, usuario, nombre, rol, color });
      if (e2) {
        await admin.auth.admin.deleteUser(creado.user.id);
        return json({ error: e2.message }, 400);
      }
      return json({ ok: true, id: creado.user.id, usuario });
    }

    case "editar": {
      if (!id) return json({ error: "Falta el id" }, 400);
      const cambios: Record<string, unknown> = {};
      if (typeof body.nombre === "string" && body.nombre.trim()) cambios.nombre = body.nombre.trim();
      if (body.rol === "socio" || body.rol === "comercial") cambios.rol = body.rol;
      if (typeof body.color === "string") cambios.color = body.color;
      if (typeof body.usuario === "string") {
        const usuario = limpiarUsuario(body.usuario);
        if (!usuario) return json({ error: "Usuario no válido" }, 400);
        const { error } = await admin.auth.admin.updateUserById(id, { email: `${usuario}@${DOMINIO}`, email_confirm: true });
        if (error) return json({ error: /already|registered|exists/i.test(error.message) ? `El usuario «${usuario}» ya existe` : error.message }, 400);
        cambios.usuario = usuario;
      }
      if (Object.keys(cambios).length) {
        const { error } = await admin.from("perfiles").update(cambios).eq("id", id);
        if (error) return json({ error: error.message }, 400);
      }
      return json({ ok: true });
    }

    case "contrasena": {
      if (!id || !password) return json({ error: "Faltan datos" }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    case "activo": {
      if (!id) return json({ error: "Falta el id" }, 400);
      const activo = body.activo === true;
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: activo ? "none" : "876000h" });
      if (error) return json({ error: error.message }, 400);
      await admin.from("perfiles").update({ activo }).eq("id", id);
      return json({ ok: true });
    }

    default:
      return json({ error: "Acción desconocida" }, 400);
  }
});

