// Pruebas del agente con una base de datos en memoria y un servidor falso de la API de Claude.
// deno test --allow-net --allow-env --no-check=remote supabase/functions/tests/
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { atender, crearConversacion, mensajeDelCliente, mensajeDelEquipo, usarClienteIA } from "../_shared/agente.ts";
import { DbFalsa } from "./db-falsa.ts";

// deno-lint-ignore no-explicit-any
type Peticion = { cuerpo: any; cabeceras: Headers };
// deno-lint-ignore no-explicit-any
type Respuesta = { content: any[]; stop_reason: string; espera?: number };

const peticiones: Peticion[] = [];
let guion: Respuesta[] = [];

const servidor = Deno.serve({ port: 0, onListen() {} }, async (req) => {
  peticiones.push({ cuerpo: await req.json(), cabeceras: req.headers });
  const r = guion.shift() ?? { content: [{ type: "text", text: "(sin guion)" }], stop_reason: "end_turn" };
  if (r.espera) await new Promise((ok) => setTimeout(ok, r.espera));
  return Response.json({
    id: `msg_${peticiones.length}`, type: "message", role: "assistant", model: "claude-opus-5-5",
    content: r.content, stop_reason: r.stop_reason, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 },
  });
});
usarClienteIA(new Anthropic({ apiKey: "prueba", baseURL: `http://127.0.0.1:${servidor.addr.port}`, maxRetries: 0 }));

const texto = (t: string): Respuesta => ({ content: [{ type: "thinking", thinking: "", signature: "firma" }, { type: "text", text: t }], stop_reason: "end_turn" });

function preparar() {
  Deno.env.set("ANTHROPIC_API_KEY", "prueba");
  peticiones.length = 0;
  guion = [];
  const db = new DbFalsa();
  db.tablas.productos = [
    { id: "p1", nombre: "Expositor NFC de reseñas Google", descripcion: "Un toque y a reseñar.", precio: 29.99, precio_volumen: "10,00 €/ud desde 50 ud", url: "https://visaxnfc.es/productos/expositor-resenas-google", orden: 2, activo: true },
  ];
  db.tablas.busquedas = [{ id: "b1", consulta: "bares en Triana, Sevilla", resultados: 52, media_nota: 4.4, mediana_resenas: 310, top: [{ nombre: "La Taberna", nota: 4.6, resenas: 1240 }] }];
  db.tablas.locales = [{
    id: "l1", nombre: "Bar Prueba", tipo: "Bar", zona: "Triana, Sevilla", codigo: "abcd2345", origen: "radar", estado: "pendiente",
    google_nota: 4.1, google_resenas: 87, busqueda_id: "b1", agente_pausado: false, notas: null, dueno_nombre: null, dueno_telefono: null,
  }];
  return { db, sb: db as unknown as SupabaseClient };
}

// Toda petición a la API debe ser un historial válido: empieza y acaba en el cliente, y cada
// tool_use va seguido justo después de su tool_result.
// deno-lint-ignore no-explicit-any
function historialValido(messages: any[]) {
  assertEquals(messages[0].role, "user");
  assertEquals(messages.at(-1).role, "user");
  messages.forEach((m, i) => {
    // deno-lint-ignore no-explicit-any
    const usos = m.role === "assistant" ? m.content.filter((b: any) => b.type === "tool_use").map((b: any) => b.id) : [];
    if (usos.length) {
      const siguiente = messages[i + 1];
      // deno-lint-ignore no-explicit-any
      const resultados = siguiente.content.filter((b: any) => b.type === "tool_result").map((b: any) => b.tool_use_id);
      assertEquals(resultados, usos, `tool_result justo después del tool_use (mensaje ${i})`);
    }
  });
}

Deno.test("responde y guarda la conversación con la petición bien formada", async () => {
  const { db, sb } = preparar();
  const conv = await crearConversacion(sb, db.tablas.locales[0], "web");
  assertStringIncludes(conv.contexto, "4,1 estrellas con 87 reseñas");
  assertStringIncludes(conv.contexto, "la mitad tiene más de 310 reseñas");
  assertStringIncludes(conv.contexto, "https://visaxnfc.es/productos/expositor-resenas-google");

  guion = [texto("¡Hola! Soy el asistente virtual. ¿Cuántas mesas tienes?")];
  await mensajeDelCliente(sb, conv.id, "Hola, ¿qué es esto?");
  const r = await atender(sb, conv.id);
  assertEquals(r, ["¡Hola! Soy el asistente virtual. ¿Cuántas mesas tienes?"]);

  const p = peticiones[0];
  assertEquals(p.cuerpo.model, "claude-opus-5-5");
  assertEquals(p.cuerpo.fallbacks, "default");
  assertEquals(p.cuerpo.thinking, { type: "adaptive", block_binding: { prefix_mismatch_behavior: "drop_block" } });
  assertEquals(p.cuerpo.output_config, { effort: "low" });
  assertEquals(p.cuerpo.system, conv.contexto);
  assert(p.cuerpo.tools.every((t: { strict: boolean }) => t.strict));
  assertStringIncludes(p.cabeceras.get("anthropic-beta") ?? "", "server-side-fallback-2026-07-01");
  assertStringIncludes(p.cabeceras.get("anthropic-beta") ?? "", "thinking-binding-controls-2026-08-01");

  const filas = db.tablas.mensajes.sort((a, b) => (a.orden as number) - (b.orden as number));
  assertEquals(filas.map((f) => [f.orden, f.autor]), [[1, "cliente"], [2, "agente"]]);
  assertEquals(db.tablas.locales[0].ultimo_mensaje_en != null, true);
  assertEquals(db.tablas.conversaciones[0].procesando_hasta, null);

  // Segundo turno: el historial se reenvía idéntico, con el bloque de thinking intacto
  guion = [texto("Perfecto.")];
  await mensajeDelCliente(sb, conv.id, "Tengo 12 mesas");
  await atender(sb, conv.id);
  const segundo = peticiones[1].cuerpo.messages;
  assertEquals(segundo.length, 3);
  assertEquals(segundo[1].content[0], { type: "thinking", thinking: "", signature: "firma" });
  historialValido(segundo);
});

Deno.test("usa las herramientas: guarda datos y avisa al equipo", async () => {
  const { db, sb } = preparar();
  const conv = await crearConversacion(sb, db.tablas.locales[0], "web");
  guion = [
    {
      content: [
        { type: "thinking", thinking: "", signature: "s1" },
        { type: "tool_use", id: "tu1", name: "guardar_datos", input: { nombre_contacto: "Manolo", telefono: "612 345 678", cargo: "Dueño", nombre_local: "", ciudad: "", nota: "12 mesas" } },
        { type: "tool_use", id: "tu2", name: "avisar_equipo", input: { quiere: "llamada", motivo: "Quiere 3 expositores" } },
      ],
      stop_reason: "tool_use",
    },
    texto("Hecho, Manolo. Te llaman hoy."),
  ];
  await mensajeDelCliente(sb, conv.id, "Soy Manolo, el dueño, 612345678. Que me llamen");
  const r = await atender(sb, conv.id);
  assertEquals(r, ["Hecho, Manolo. Te llaman hoy."]);

  const l = db.tablas.locales[0];
  assertEquals(l.dueno_nombre, "Manolo");
  assertEquals(l.dueno_telefono, "612 345 678");
  assertEquals(l.estado, "rellamar");
  assert(l.rellamar_fecha);
  assert(l.pidio_contacto_en);
  assertStringIncludes(String(l.notas), "12 mesas");
  assertStringIncludes(String(l.notas), "Quiere 3 expositores");
  assertEquals(db.tablas.eventos.map((e) => e.tipo), ["contacto"]);

  historialValido(peticiones[1].cuerpo.messages);
  const resultados = peticiones[1].cuerpo.messages[2].content;
  assertEquals(resultados.map((b: { tool_use_id: string }) => b.tool_use_id), ["tu1", "tu2"]);
});

Deno.test("si llega otro mensaje mientras responde, lo contesta después y en orden", async () => {
  const { db, sb } = preparar();
  const conv = await crearConversacion(sb, db.tablas.locales[0], "whatsapp", "34612345678");
  guion = [
    { content: [{ type: "tool_use", id: "tu1", name: "guardar_datos", input: { nombre_contacto: "Ana", telefono: "", cargo: "", nombre_local: "", ciudad: "", nota: "" } }], stop_reason: "tool_use", espera: 150 },
    { ...texto("Encantado, Ana."), espera: 150 },
    texto("Cuesta 29,99 €."),
  ];
  const enviados: string[] = [];
  await mensajeDelCliente(sb, conv.id, "Hola, soy Ana", "wamid.1");
  const primero = atender(sb, conv.id, async (t) => void enviados.push(t));
  await new Promise((ok) => setTimeout(ok, 60));
  await mensajeDelCliente(sb, conv.id, "¿Cuánto cuesta?", "wamid.2");
  const segundo = await atender(sb, conv.id, async (t) => void enviados.push(t));
  assertEquals(segundo, [], "el segundo proceso no responde: ya hay uno trabajando");
  await primero;

  assertEquals(enviados, ["Encantado, Ana.", "Cuesta 29,99 €."]);
  for (const p of peticiones) historialValido(p.cuerpo.messages);
  const ultimo = peticiones.at(-1)!.cuerpo.messages;
  assertEquals(ultimo.at(-1).content[0].text, "¿Cuánto cuesta?");
  const ordenes = db.tablas.mensajes.map((m) => m.orden as number).sort((a, b) => a - b);
  assertEquals(ordenes, [1, 2, 3, 4, 5, 6]);

  // WhatsApp a veces repite el mismo aviso: no se duplica
  assertEquals(await mensajeDelCliente(sb, conv.id, "¿Cuánto cuesta?", "wamid.2"), false);
});

Deno.test("con el agente pausado no llama a la IA, pero ordena los mensajes", async () => {
  const { db, sb } = preparar();
  db.tablas.locales[0].agente_pausado = true;
  const conv = await crearConversacion(sb, db.tablas.locales[0], "whatsapp", "34600000000");
  await mensajeDelCliente(sb, conv.id, "Hola");
  assertEquals(await atender(sb, conv.id), []);
  assertEquals(peticiones.length, 0);
  assertEquals(db.tablas.mensajes[0].orden, 1);

  // Lo que escribe el equipo a mano entra en el historial a continuación
  await mensajeDelEquipo(sb, conv.id, "Hola, soy Pablo");
  assertEquals(db.tablas.mensajes.map((m) => [m.orden, m.autor, m.rol]), [[1, "cliente", "user"], [2, "equipo", "assistant"]]);
});

Deno.test("sin clave de la API avisa una sola vez al cliente y al equipo", async () => {
  const { db, sb } = preparar();
  Deno.env.delete("ANTHROPIC_API_KEY");
  const conv = await crearConversacion(sb, db.tablas.locales[0], "web");
  await mensajeDelCliente(sb, conv.id, "Hola");
  const r = await atender(sb, conv.id);
  assertEquals(r.length, 1);
  assertStringIncludes(r[0], "aviso al equipo");
  assertEquals(db.tablas.locales[0].estado, "rellamar");
  assertEquals(peticiones.length, 0);

  // No repite el aviso; y cuando vuelve la clave, el agente responde solo
  await mensajeDelCliente(sb, conv.id, "¿Hola?");
  assertEquals(await atender(sb, conv.id), []);
  Deno.env.set("ANTHROPIC_API_KEY", "prueba");
  guion = [texto("¡Ya estoy! ¿En qué te ayudo?")];
  await mensajeDelCliente(sb, conv.id, "¿Sigues ahí?");
  assertEquals(await atender(sb, conv.id), ["¡Ya estoy! ¿En qué te ayudo?"]);
  historialValido(peticiones[0].cuerpo.messages);
});

Deno.test("si el modelo rechaza, contesta con un mensaje amable", async () => {
  const { db, sb } = preparar();
  const conv = await crearConversacion(sb, db.tablas.locales[0], "web");
  guion = [{ content: [], stop_reason: "refusal" }];
  await mensajeDelCliente(sb, conv.id, "algo raro");
  const r = await atender(sb, conv.id);
  assertStringIncludes(r[0], "no te lo puedo responder");
});

Deno.test("tras un cambio de modelo a mitad de respuesta no reenvía lo que quedó antes", async () => {
  const { db, sb } = preparar();
  const conv = await crearConversacion(sb, db.tablas.locales[0], "web");
  guion = [{
    content: [
      { type: "thinking", thinking: "", signature: "x" },
      { type: "text", text: "Te cuen" },
      { type: "fallback", from: { model: "claude-opus-5-5" }, to: { model: "claude-opus-5" } },
      { type: "text", text: "Te cuento: el expositor cuesta 29,99 €." },
    ],
    stop_reason: "end_turn",
  }, texto("Vale.")];
  await mensajeDelCliente(sb, conv.id, "precio");
  await atender(sb, conv.id);
  await mensajeDelCliente(sb, conv.id, "ok");
  await atender(sb, conv.id);
  const tipos = peticiones[1].cuerpo.messages[1].content.map((b: { type: string }) => b.type);
  assertEquals(tipos, ["text", "fallback", "text"]);
});

Deno.test("no_molestar marca el local y pausa al agente", async () => {
  const { db, sb } = preparar();
  const conv = await crearConversacion(sb, db.tablas.locales[0], "whatsapp", "34611111111");
  guion = [
    { content: [{ type: "tool_use", id: "t", name: "no_molestar", input: { motivo: "No quiere más mensajes" } }], stop_reason: "tool_use" },
    texto("Entendido, perdona las molestias."),
  ];
  await mensajeDelCliente(sb, conv.id, "No me escribáis más");
  await atender(sb, conv.id);
  assertEquals(db.tablas.locales[0].estado, "no_interesa");
  assertEquals(db.tablas.locales[0].agente_pausado, true);
});

addEventListener("unload", () => servidor.shutdown());
