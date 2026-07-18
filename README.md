# Generador Automático de Presupuestos / Contratos (Make.com + OpenAI)

Producto de automatización para **empresas de reformas, constructoras y despachos de abogados en
España**. Convierte los datos de una visita/consulta (formulario o WhatsApp) en un
**presupuesto o contrato en PDF**, redactado por IA a partir de una plantilla, con **aprobación
humana obligatoria** antes de enviarlo al cliente y **seguimiento en Google Sheets**.

Todo se construye **100 % en Make.com** (sin app propia). Fase de pruebas por **email (Gmail)**;
el envío al cliente está aislado en un módulo para migrar a **WhatsApp/Twilio** en producción.

> Objetivo de negocio: pasar el tiempo de respuesta de **días a minutos** para no perder al cliente
> frente a quien responde antes.

---

## ✅ Estado: DESPLEGADO, ACTIVO y PROBADO en Make
Los 2 escenarios están **creados, activos y verificados de extremo a extremo** en Make (EU), con
conexiones, prompts, reglas de negocio y activos de Google (hoja, plantilla, carpeta) ya creados y
cableados. Prueba real: presupuesto de baño **6.399,17 €** generado, PDF creado, aprobado y
enviado, fila en Sheets a `ENVIADO`. Detalle e IDs en
[`docs/07-despliegue-en-make.md`](docs/07-despliegue-en-make.md).

- Escenario 1 (Generación + Aprobación): ID `6611125` · webhook `https://hook.eu1.make.com/um1aiy31btng29en6mukyff4v1puvy6c`
- Escenario 2 (Aprobación y Envío): ID `6611154`
- Hoja de seguimiento y plantilla Docs: creadas en tu Drive (IDs en el doc 07).

## 🚀 Puesta en marcha rápida (importar desde cero)
Si prefieres reimportar en otra cuenta con los blueprints genéricos:
1. Lee `docs/05-checklist-post-importacion.md`.
2. Importa `blueprints/01-generador-principal.blueprint.json` y `blueprints/02-aprobacion-envio.blueprint.json` en Make (EU).
3. Sustituye todos los `REEMPLAZAR_*`, asigna conexiones y crea los 2 webhooks.
4. Pega los prompts de `prompts/` y tus precios de `reglas-negocio/`.
5. Prueba con `ejemplos/payload-webhook-reforma.json`.

---

## 📦 Contenido del repositorio

```
blueprints/
  01-generador-principal.blueprint.json   Escenario 1: recibe datos → IA → Doc → PDF → aprobación
  02-aprobacion-envio.blueprint.json      Escenario 2: aprobar/rechazar → envío al cliente
prompts/
  system-prompt.md                        Prompt de sistema exacto (fiable, JSON, no inventa)
  user-prompt-template.md                 Prompt de usuario + esquema de salida
  ejemplo-salida.json                     Salida IA de ejemplo (COMPLETO)
  ejemplo-salida-faltan-datos.json        Salida IA de ejemplo (FALTAN_DATOS)
plantillas/
  google-docs-presupuesto-reforma.md      Placeholders del Doc (reformas)
  google-docs-contrato-legal.md           Placeholders del Doc (legal)
reglas-negocio/
  reglas-precios-reformas.md               Precios/cláusulas que aplica la IA (editable)
ejemplos/
  payload-webhook-reforma.json            Payload de entrada de ejemplo (reforma)
  payload-webhook-legal.json              Payload de entrada de ejemplo (legal)
docs/
  01-arquitectura.md                       Arquitectura módulo por módulo
  02-google-sheets.md                      Estructura de la hoja de seguimiento
  03-aprobacion-humana.md                  Dónde y cómo se aprueba antes de enviar
  04-datos-insuficientes.md                Qué pasa si faltan datos (no inventar)
  05-checklist-post-importacion.md         Todo lo que hay que configurar a mano
  06-migracion-whatsapp.md                 Cómo pasar de Gmail a WhatsApp/Twilio
```

---

## ✅ Respuesta a los 7 puntos solicitados

| # | Pedido | Dónde |
|---|--------|-------|
| 1 | Arquitectura completa del escenario, módulo por módulo | [`docs/01-arquitectura.md`](docs/01-arquitectura.md) |
| 2 | Prompt de sistema exacto del módulo OpenAI | [`prompts/system-prompt.md`](prompts/system-prompt.md) |
| 3 | Estructura de la plantilla de Docs y columnas de Sheets | [`plantillas/`](plantillas/) · [`docs/02-google-sheets.md`](docs/02-google-sheets.md) |
| 4 | Aprobación humana (Router + patrón de 2 escenarios) | [`docs/03-aprobacion-humana.md`](docs/03-aprobacion-humana.md) |
| 5 | Qué hacer si la IA no tiene datos (no inventar) | [`docs/04-datos-insuficientes.md`](docs/04-datos-insuficientes.md) |
| 6 | JSON del blueprint de Make (con partes a completar señaladas) | [`blueprints/`](blueprints/) |
| 7 | Checklist de configuración manual post-importación | [`docs/05-checklist-post-importacion.md`](docs/05-checklist-post-importacion.md) |

---

## 🧭 Flujo en una imagen

```
Formulario / WhatsApp
        │  (webhook)
        ▼
[Set Vars] → [OpenAI: redacta + calcula, JSON] → [Parse JSON] → [Router]
                                                                   │
                    ┌──────────────────────────────────────────────┤
       FALTAN_DATOS │                                              │ COMPLETO
                    ▼                                              ▼
       Email interno "faltan X"                    Google Docs → PDF → Email de
       Sheets: PENDIENTE_DATOS                     aprobación al revisor (PDF + botones)
                                                   Sheets: PENDIENTE_APROBACION
                                                              │
                                     (revisor pulsa APROBAR / RECHAZAR)
                                                              ▼
                              Escenario 2: envía PDF al CLIENTE (Gmail→WhatsApp)
                                            Sheets: ENVIADO / RECHAZADO
```

---

## ⚠️ Partes que NO se pueden pre-rellenar en el blueprint
Están marcadas con `REEMPLAZAR_*` (strings) y `0` en `hook`/`__IMTCONN__`/`account` (IDs numéricos):
- **IDs de webhook** (se crean tras importar).
- **Conexiones OAuth** (OpenAI, Gmail, Google Docs, Google Sheets) — **4 conexiones**, sin Drive.
- **IDs** de la plantilla de Docs, la carpeta de Drive de destino y el Google Sheet.
- **Emails** internos, datos de empresa y **URL del webhook de aprobación** dentro del email.

Detalle y pasos exactos en [`docs/05-checklist-post-importacion.md`](docs/05-checklist-post-importacion.md).

---

## 🔒 Notas de responsabilidad
- Los textos legales generados son **borradores**; deben ser validados por un profesional
  colegiado antes de enviarse. La aprobación humana es obligatoria (ver doc 03).
- La IA **no inventa datos**: si faltan, bloquea la generación y avisa al equipo (ver doc 04).

## 🔮 Ampliaciones futuras
- Firma electrónica integrada (Signaturit/DocuSign) tras la aprobación.
- Varias opciones de presupuesto (básico / premium) con un Router adicional.
- Seguimiento automático de presupuestos no respondidos (3.º escenario programado sobre la misma
  hoja de Sheets).
