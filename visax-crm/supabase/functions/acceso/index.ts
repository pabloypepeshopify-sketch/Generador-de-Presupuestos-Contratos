// Activa una cuenta o restablece su contraseña con un código de un solo uso.
// Los códigos los genera un socio desde Ajustes (o el administrador por SQL para el primer acceso).
// La service role solo existe aquí, en el servidor de Supabase.
import { createClient } from "jsr:@supabase/supabase-js@2";

const DOMINIO = "crm.visaxai.es";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Petición no válida" }, 400);
  }

  const usuario = String(body.usuario ?? "").trim().toLowerCase();
  const codigo = String(body.codigo ?? "").trim().toUpperCase();
  const password = String(body.password ?? "");

  if (!/^[a-z0-9._-]{2,30}$/.test(usuario)) return json({ error: "Usuario no válido" }, 400);
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codigo)) return json({ error: "El código tiene el formato XXXX-XXXX-XXXX" }, 400);
  if (password.length < 10 || password.length > 72) return json({ error: "La contraseña debe tener entre 10 y 72 caracteres" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: canje, error: errCanje } = await admin.rpc("acceso_canjear", { p_usuario: usuario, p_codigo: codigo });
  if (errCanje) return json({ error: "No se ha podido comprobar el código" }, 500);
  if (!canje?.ok) return json({ error: "Código no válido, caducado o ya usado" }, 400);

  let socioId: string | null = canje.socio_id;
  if (socioId) {
    const { error } = await admin.auth.admin.updateUserById(socioId, { password });
    if (error) return json({ error: "No se ha podido cambiar la contraseña. Pide un código nuevo." }, 400);
  } else {
    const email = `${usuario}@${DOMINIO}`;
    const { data: creado, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { usuario, nombre: canje.nombre },
    });
    if (error) {
      // La cuenta puede existir de un intento anterior a medias: la buscamos y le ponemos la contraseña
      const { data: lista } = await admin.auth.admin.listUsers({ perPage: 200 });
      const existente = lista?.users.find((u) => u.email === email);
      if (!existente) return json({ error: "No se ha podido crear la cuenta. Pide un código nuevo." }, 400);
      const { error: e2 } = await admin.auth.admin.updateUserById(existente.id, { password, email_confirm: true });
      if (e2) return json({ error: "No se ha podido crear la cuenta. Pide un código nuevo." }, 400);
      socioId = existente.id;
    } else {
      socioId = creado.user.id;
    }
    const { error: e3 } = await admin.rpc("acceso_alta_socio", { p_id: socioId, p_usuario: usuario, p_nombre: canje.nombre });
    if (e3) return json({ error: "No se ha podido dar de alta el acceso" }, 500);
  }

  return json({ ok: true, usuario });
});
