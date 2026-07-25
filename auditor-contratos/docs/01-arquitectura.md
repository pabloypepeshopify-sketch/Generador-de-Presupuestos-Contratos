# 01 · Arquitectura del escenario (módulo por módulo)

Producto: **Auditor de Contratos — Detector de Cláusulas de Riesgo**. Un **único escenario de
Make** que, cuando llega un contrato PDF por email (fase de pruebas: Gmail), extrae su texto con
**OCR (Mistral OCR)**, lo analiza con IA contra una checklist cerrada de riesgos, clasifica el
resultado con un **semáforo** y envía un **informe en PDF** al responsable junto con el contrato
original. **Nunca aprueba, rechaza ni aconseja firmar**: solo informa.

> **Validado contra la API real de Make** (org VISAX AI, zona `eu1.make.com`): todos los módulos,
> versiones y nombres de campo de abajo están **confirmados** con `validate_module_configuration` y
> replican patrones ya probados en producción en esta cuenta (escenario hermano "Lector de Facturas
> · OCR + IA").

```
CORREO CON CONTRATO PDF ADJUNTO (Gmail)   [en produccion: carpeta de Google Drive]
        │
        ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ESCENARIO ÚNICO — Auditoría de contrato                                              │
│                                                                                        │
│  [1] Gmail Watch ─► [2] List Attachments (itera) ─► [3] HTTP Mistral OCR ─►            │
│  [4] Set Variables (texto, n_chars, ids, tipo) ─►                                      │
│                                                                                        │
│  [5] ROUTER · GATE DE LEGIBILIDAD                                                       │
│        ├─ n_chars <  MIN  ─► ILEGIBLE ─► [6] Email "revisar a mano" + [7] Sheets       │
│        │                                                        (NUNCA llama a la IA)   │
│        └─ n_chars >= MIN  ─► ANALIZABLE                                                 │
│                 [8] OpenAI (checklist→JSON) ─► [9] Parse JSON ─► [10] Set semáforo ─►   │
│                                                                                        │
│                 [11] ROUTER · RESULTADO DEL ANÁLISIS                                    │
│                       ├─ estado=NO_ANALIZABLE ─► [12] Email "revisar" + [13] Sheets     │
│                       │                                        (NO genera informe)      │
│                       └─ estado=ANALIZADO                                               │
│                              [14] Docs crea informe ─► [15] Docs export PDF ─►          │
│                              [16] Sheets add fila (semáforo, enlaces) ─►                │
│                                                                                        │
│                              [17] ROUTER · SEMÁFORO (solo cambia la notificación)       │
│                                    ├─ VERDE ─► [18] Email informe (verde)               │
│                                    ├─ ÁMBAR ─► [19] Email informe (ámbar)               │
│                                    └─ ROJO  ─► [20] Email informe (rojo) + CC legal     │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

> **Tres Routers, tres responsabilidades distintas** (no es sobre-ingeniería):
> - **R5 (legibilidad):** evita gastar una llamada a OpenAI sobre texto basura/vacío.
> - **R11 (resultado):** si la IA declara que no puede analizar con fiabilidad, **no** genera informe.
> - **R17 (semáforo):** el informe y la fila de Sheets ya están hechos una sola vez; este router
>   solo diferencia el correo (asunto, urgencia, CC a legal en rojo). Sin duplicar módulos.

---

## Módulos en orden (identificadores y versiones REALES, validados)

| # | Módulo (identificador real · versión) | Conexión | Propósito |
|---|----------------------------------------|----------|-----------|
| **1** | `google-email:triggerWatchNewEmails` **v4** | Gmail | Disparador de sondeo. Vigila la bandeja con el filtro Gmail `q = "has:attachment filename:pdf"`. Salidas usadas: `{{1.id}}`, `{{1.fromEmail}}`, `{{1.subject}}`. En producción se sustituye por **Google Drive → Watch Files** (ver nota final). |
| **2** | `google-email:listEmailAttachments` **v4** | Gmail | Descarga los adjuntos del correo (`returnAttachmentData = true`, `include = ["attachment"]`, `messageId = {{1.id}}`). **Actúa de iterador natural**: un bundle por adjunto. Salidas: `{{2.mimeType}}`, `{{2.filename}}`, `{{2.data}}`. |
| **3** | `http:MakeRequest` **v4** | — (clave API) | **OCR con Mistral OCR.** POST a `https://api.mistral.ai/v1/ocr` con `document_url = data:{{2.mimeType}};base64,{{base64(2.data)}}`. Maneja **PDF nativo y escaneado**. `parseResponse = true`. Un **filtro** ("Solo PDF") descarta lo que no sea PDF. Salida: `{{3.data.pages[].markdown}}`. |
| **4** | `util:SetVariables` **v1** | — | Normaliza: `id_auditoria`, `fecha_analisis`, `remitente = {{1.fromEmail}}`, `asunto`, `nombre_archivo = {{2.filename}}`, `texto_contrato = {{join(map(3.data.pages; "markdown"); " ")}}`, **`n_chars = {{length(...)}}`** y `tipo_contrato` (del asunto o `auto`). |
| **5** | `builtin:BasicRouter` **v1** | — | **Gate de legibilidad** (por `n_chars`). Ver `05-documento-ilegible.md`. |
| **6** | `google-email:sendAnEmail` **v4** | Gmail | *(ILEGIBLE)* Aviso "revisar a mano" + adjunta el original. **No** llama a la IA. |
| **7** | `google-sheets:addRow` **v2** | Google | *(ILEGIBLE)* Registra `ILEGIBLE_REVISION_MANUAL`. |
| **8** | `openai-gpt-3:CreateCompletion` **v1** | OpenAI | *(ANALIZABLE)* Evalúa el contrato contra la **checklist cerrada** → **JSON**. `model = gpt-4o`, `temperature = 0.1`, `response_format = {type: json_object}`. |
| **9** | `json:ParseJSON` **v1** | — | Parsea `{{8.result}}` → `estado_analisis`, `puntos[]`, `contadores`, `informe_cuerpo`… |
| **10** | `util:SetVariables` **v1** | — | Calcula el **semáforo determinista** (`semaforo`, `semaforo_texto`) desde `contadores`. Ver `03-semaforo-y-router.md`. |
| **11** | `builtin:BasicRouter` **v1** | — | **Resultado**: `NO_ANALIZABLE` → revisión manual; `ANALIZADO` → informe. |
| **12** | `google-email:sendAnEmail` **v4** | Gmail | *(NO_ANALIZABLE)* La IA no pudo analizar con fiabilidad. Aviso + original. **Sin informe.** |
| **13** | `google-sheets:addRow` **v2** | Google | *(NO_ANALIZABLE)* Registra `NO_ANALIZABLE_IA` + `motivo`. |
| **14** | `google-docs:createADocumentFromTemplate` **v1** | Google | *(ANALIZADO)* Copia la plantilla y sustituye etiquetas. **Descargo legal = texto fijo de la plantilla.** Salidas: `{{14.id}}`, `{{14.webViewLink}}`. |
| **15** | `google-docs:exportADocument` **v1** | Google | *(ANALIZADO)* Exporta el informe a **PDF** (`mimeType = application/pdf`). Salida: `{{15.data}}`. |
| **16** | `google-sheets:addRow` **v2** | Google | *(ANALIZADO)* Registra semáforo, contadores, enlace y `INFORME_ENVIADO`. |
| **17** | `builtin:BasicRouter` **v1** | — | **Semáforo**: 3 rutas por `{{10.semaforo}}`. Solo cambia la notificación. |
| **18** | `google-email:sendAnEmail` **v4** | Gmail | *(VERDE)* Informe PDF `{{15.data}}` **+ contrato original** `{{2.data}}`. |
| **19** | `google-email:sendAnEmail` **v4** | Gmail | *(ÁMBAR)* Igual, asunto ámbar. |
| **20** | `google-email:sendAnEmail` **v4** | Gmail | *(ROJO)* Igual, asunto rojo, **con CC al asesor legal**. |

> **Único punto de salida sustituible:** los módulos 18/19/20 (y 6/12) son el ÚNICO sitio donde el
> sistema "sale" hacia una persona. Cambiar de Gmail a WhatsApp/Twilio = cambiar esos módulos. Ver
> `08-migracion-whatsapp.md`.

---

## Conexiones necesarias (solo 3 + 1 clave API)
- **Gmail** (`google-email`) — módulos 1, 2, 6, 12, 18, 19, 20.
- **Google** (`google`, sirve para Docs **y** Sheets) — módulos 7, 13, 14, 15, 16.
- **OpenAI** (`openai-gpt-3`) — módulo 8.
- **Clave API de Mistral** (en la cabecera del módulo HTTP #3) — no es una conexión de Make.

> **No hace falta Google Drive**: el OCR de Mistral extrae el texto directamente del adjunto en
> base64, y Google Docs crea/exporta el informe sin el conector de Drive. Menos conexiones = producto
> más barato y fácil de instalar en cada cliente.

---

## Decisiones de diseño

- **OCR con Mistral OCR (probado en esta cuenta):** una sola llamada HTTP con
  `data:{{2.mimeType}};base64,{{base64(2.data)}}` devuelve el texto en `pages[].markdown`, tanto de
  PDF nativo como escaneado. El **gate de legibilidad (paso 5)** funciona igual sea cual sea la
  calidad del OCR.
- **La IA no decide:** el system prompt prohíbe recomendar firmar/no firmar y prohíbe inventar
  cláusulas. Solo detecta y explica.
- **Semáforo determinista en Make, no en la IA:** la IA aporta `contadores`; el semáforo se calcula
  con `if()` en el paso 10 y se enruta con filtros (paso 17). Auditable y reproducible.
- **Descargo legal a prueba de manipulación:** texto **fijo en la plantilla** de Docs (paso 14) +
  repetido en el email. La IA no puede omitirlo ni reescribirlo.
- **Doble red contra "huecos rellenados":** gate por nº de caracteres (paso 5) + la propia IA que se
  autodeclara `NO_ANALIZABLE` (paso 11). Ambos → revisión manual, nunca informe incompleto.

---

## Variante de disparador por Google Drive (producción)
Sustituye el paso **1** por **Google Drive → Watch Files in a folder** apuntando a una carpeta
`Contratos-Entrantes`, y el paso **2** por la descarga del archivo. El resto del flujo (3→20) no
cambia. Así el cliente arrastra contratos a una carpeta en lugar de reenviarlos por correo.

## Variante DOCX / imágenes
Mistral OCR procesa PDF e imágenes, **no .docx**. Para admitir Word, añade antes del paso 3 una rama
**Google Drive → Upload (convert=true)** + **Google Docs → Export (text/plain)** solo para adjuntos
`.docx`; deja el PDF por la ruta Mistral. Para empezar, el filtro del paso 3 acepta solo PDF (lo más
común al enviar un contrato a revisar).
