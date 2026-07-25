# Auditor de Contratos — Detector de Cláusulas de Riesgo (Make.com + OpenAI)

Producto de automatización para **gestorías, inmobiliarias, constructoras y pymes** que firman
contratos de **alquiler, con proveedores o laborales** en España. Antes de firmar, un contrato llega
por email (fase pruebas: Gmail), se **extrae su texto (OCR si es escaneado)**, una **IA lo analiza
contra una checklist cerrada de riesgos**, se clasifica con un **semáforo (verde/ámbar/rojo)** y se
envía un **informe en PDF** al responsable junto con el contrato original.

**El sistema nunca decide ni aconseja firmar o no firmar: solo informa y señala riesgos para que
decida un humano.** Todo se construye **100 % en Make.com** (sin app propia), zona **EU
(eu1.make.com)**. La salida (Gmail) está aislada en un módulo para migrar a **WhatsApp/Twilio**.

> Es una **primera capa de detección automática, NO un dictamen jurídico**. Ver `docs/06-descargo-legal.md`.

---

> ✅ **Validado contra la API real de Make** (org VISAX AI, `eu1.make.com`): los 8 módulos distintos
> pasan `validate_module_configuration` y replican patrones ya probados en producción en tu cuenta.
> Activos de Google (plantilla, hoja, carpeta) **ya creados**. Detalle en `docs/07`.
>
> 🟢 **Montado, PROBADO end-to-end y ACTIVO en tu cuenta de Make** — escenario **`6697383`** "Auditor
> de Contratos · Detector de Clausulas de Riesgo", cableado a tus conexiones (Gmail, Google, OpenAI
> `8476285`), tu clave de Mistral y los 3 activos de Google. Los 20 módulos importaron sin errores.
>
> **Prueba real de extremo a extremo superada** (contrato PDF de proveedor de riesgo → asunto
> `AUDITAR`): ✅ trigger Gmail → ✅ descarga adjunto → ✅ **OCR Mistral** → ✅ **OpenAI** (con la
> conexión `8476285`) → ✅ Parse → ✅ semáforo **ROJO** (riesgo_alto=2, medio=4, faltan_criticos=1) →
> ✅ **informe Google Doc con etiquetas sustituidas** (cita textual + explicación llana por punto +
> descargo legal fijo) → ✅ export **PDF** → ✅ fila Sheets `INFORME_ENVIADO` con enlace → ✅ email con
> informe + contrato. También verificado el caso **NO_ANALIZABLE**: la IA marcó correctamente varias
> facturas reales (Shopify/Anthropic) como "no es un contrato" sin inventar análisis.
>
> **Filtro seguro:** el disparador usa `q = subject:AUDITAR has:attachment filename:pdf`, así **solo
> audita lo que reenvíes con `AUDITAR` en el asunto** (nunca facturas ni otros PDF). Cámbialo si
> prefieres un alias `+contratos@` o una etiqueta. Nota histórica: durante una prueba previa OpenAI
> tuvo una incidencia (HTTP 500 confirmada en status.openai.com); se resolvió al usar la conexión
> `8476285`.

## 🟢 Ya montado, probado y ACTIVO en tu cuenta (VISAX AI)

| Recurso | ID / valor |
|---------|-----------|
| **Escenario Make (ACTIVO, cada 15 min)** | **`6697383`** |
| Disparador (filtro seguro) | `q = subject:AUDITAR has:attachment filename:pdf` |
| Carpeta de informes (Drive) | `1ugUnyqwYW7yL3OBqBV1Tr9XomiLMVTm-` |
| Plantilla del informe (Docs) | `1AqZ6dcTLWwDFHgCG5OAdO5tVd6BzzCCduJQp-_pvrXw` |
| Hoja de trazabilidad (Sheets) | `135y-0zqrnJcbJgJdUD0gZwgLWau9h_soIRrfymOo74w` (pestaña `Untitled`) |
| Conexiones usadas | Gmail `8532314` · Google `8533301` · **OpenAI `8476285`** |

**Cómo usarlo (ya funciona):** reenvía/envía un contrato **PDF** al correo con la palabra
**`AUDITAR`** en el asunto. En ≤15 min recibirás el informe (verde/ámbar/rojo) + el contrato, y
quedará la fila en la hoja. Así **no** audita facturas ni otros PDF.

**Ajustes recomendados (opcionales):**
1. Cambia los emails `to`/`cc` de los módulos de email (ahora tu correo) por los del cliente y su
   asesor legal.
2. *(Máxima calidad)* sustituye el prompt del módulo 8 por la versión completa de
   `prompts/system-prompt.md` + `prompts/user-prompt-template.md` (el escenario lleva ya una versión
   compacta funcional; con la completa el `resumen_ejecutivo` y la coherencia de niveles mejoran).
3. En la hoja `Auditorias - Contratos` hay **5 filas de prueba** (4 facturas marcadas
   `NO_ANALIZABLE_IA` + 1 contrato `ROJO`) que puedes borrar a mano.

## 🧭 Flujo en una imagen

```
Correo con contrato PDF adjunto (Gmail)
        │
        ▼
[Gmail Watch] → [List Attachments (itera)] → [HTTP Mistral OCR] → [Set vars: texto, n_chars]
        │
        ▼
  ROUTER · GATE LEGIBILIDAD
    ├─ n_chars < 400 ─► ILEGIBLE → email "revisar a mano" + Sheets   (NUNCA llama a la IA)
    └─ n_chars ≥ 400 ─► [OpenAI checklist→JSON] → [Parse] → [Set semáforo]
                              │
                              ▼
                        ROUTER · RESULTADO
                          ├─ NO_ANALIZABLE ─► email "revisar" + Sheets   (sin informe)
                          └─ ANALIZADO ─► [Docs informe] → [PDF] → [Sheets] →
                                              ROUTER · SEMÁFORO
                                                ├─ 🟢 VERDE ─► email informe
                                                ├─ 🟡 ÁMBAR ─► email informe
                                                └─ 🔴 ROJO  ─► email informe + CC asesor legal
```

**OCR con Mistral OCR por HTTP** (una llamada, base64) — maneja PDF nativo y escaneado sin conector
de Google Drive. `listEmailAttachments` itera los adjuntos de forma nativa.

---

## 📦 Contenido

```
auditor-contratos/
  blueprints/
    auditor-contratos.blueprint.json     Escenario completo (importar en Make EU)
  prompts/
    system-prompt.md                     Prompt de sistema exacto del módulo OpenAI
    user-prompt-template.md              Prompt de usuario + checklist + esquema JSON
    ejemplo-salida-verde.json            Salida IA de ejemplo (semáforo VERDE)
    ejemplo-salida-rojo.json             Salida IA de ejemplo (semáforo ROJO)
    ejemplo-salida-no-analizable.json    Salida IA de ejemplo (revisión manual)
  plantillas/
    google-docs-informe-riesgos.md       Plantilla del informe + descargo legal fijo
  docs/
    01-arquitectura.md                   Arquitectura módulo por módulo
    02-checklist-riesgos.md              Checklist cerrada (BASE + alquiler/proveedor/laboral)
    03-semaforo-y-router.md              Cálculo del semáforo y su Router
    04-informe-y-trazabilidad.md         Plantilla del informe + columnas de Sheets/Airtable
    05-documento-ilegible.md             Qué pasa si no se puede leer (revisión manual)
    06-descargo-legal.md                 "Esto NO es asesoría legal" (dónde y cómo)
    07-checklist-post-importacion.md     Toda la configuración manual tras importar
    08-migracion-whatsapp.md             Cómo pasar de Gmail a WhatsApp/Twilio
```

---

## ✅ Respuesta a los 9 puntos solicitados

| # | Pedido | Dónde |
|---|--------|-------|
| 1 | Arquitectura completa del escenario, módulo por módulo | [`docs/01-arquitectura.md`](docs/01-arquitectura.md) |
| 2 | Checklist de riesgos exacta (cerrada, por tipo de contrato) | [`docs/02-checklist-riesgos.md`](docs/02-checklist-riesgos.md) |
| 3 | Prompt de sistema exacto del módulo OpenAI (JSON estructurado) | [`prompts/system-prompt.md`](prompts/system-prompt.md) · [`prompts/user-prompt-template.md`](prompts/user-prompt-template.md) |
| 4 | Cálculo del semáforo global y su implementación con Router | [`docs/03-semaforo-y-router.md`](docs/03-semaforo-y-router.md) |
| 5 | Plantilla del informe + estructura de Sheets/Airtable | [`plantillas/`](plantillas/) · [`docs/04-informe-y-trazabilidad.md`](docs/04-informe-y-trazabilidad.md) |
| 6 | Dejar claro que NO sustituye asesoría legal | [`docs/06-descargo-legal.md`](docs/06-descargo-legal.md) |
| 7 | Qué pasa si el documento no se puede leer (revisión manual) | [`docs/05-documento-ilegible.md`](docs/05-documento-ilegible.md) |
| 8 | JSON del blueprint (con partes a completar señaladas) | [`blueprints/auditor-contratos.blueprint.json`](blueprints/auditor-contratos.blueprint.json) |
| 9 | Checklist de configuración manual post-importación | [`docs/07-checklist-post-importacion.md`](docs/07-checklist-post-importacion.md) |

---

## 🚀 Puesta en marcha rápida

1. Lee `docs/07-checklist-post-importacion.md`.
2. Importa `blueprints/auditor-contratos.blueprint.json` en Make (zona EU).
3. Reasigna las **3 conexiones** (OpenAI, Gmail, Google) en cada módulo y pega tu **clave de Mistral**
   en la cabecera del módulo HTTP (#3).
4. Sustituye los `REEMPLAZAR_*` (carpeta, plantilla, hoja, emails). *Para tu cuenta, los IDs de los
   activos ya creados están en `docs/07` sección 8.*
5. Pega el system + user prompt de `prompts/` en el módulo OpenAI (#8).
6. Prueba con un contrato con riesgo (→ ROJO), uno equilibrado (→ VERDE) y un escaneo basura (→ ILEGIBLE).

---

## ⚠️ Partes que NO se pueden pre-rellenar en el blueprint
Marcadas con `REEMPLAZAR_*` (strings) y `0` en `__IMTCONN__` (IDs de conexión):
- **Conexiones OAuth** (OpenAI, Gmail, Google) — **3 conexiones** (Docs y Sheets comparten la de Google).
- **Clave API de Mistral** (cabecera del módulo HTTP #3) — no es conexión de Make.
- **ID de la carpeta** de informes, **ID de la plantilla** (Docs) y **ID + pestaña del Google Sheet**.
- **Emails** del responsable y del asesor legal (CC en ROJO), y **nombre de empresa**.
- **Filtro `q`** del módulo de disparo Watch emails.

Detalle y pasos exactos en [`docs/07-checklist-post-importacion.md`](docs/07-checklist-post-importacion.md).

---

## 🔒 Notas de responsabilidad
- El informe es una **primera capa de detección**, **no asesoramiento jurídico**. El descargo va como
  **texto fijo** en la plantilla, en el email y reforzado en el prompt (ver `docs/06-descargo-legal.md`).
- La IA **no inventa cláusulas**: cita textual del contrato o marca `falta`. Si el documento no se
  puede leer, **revisión manual**, nunca un informe con huecos (ver `docs/05-documento-ilegible.md`).
- El semáforo **no aprueba ni rechaza**: colorea, prioriza y (en rojo) añade al asesor legal en copia.
  La decisión de firmar es **siempre humana**.
