# 01 · Arquitectura del escenario (módulo por módulo)

Producto: **Auditor de Contratos — Detector de Cláusulas de Riesgo**. Un **único escenario de
Make** que, cuando llega un contrato por email (fase de pruebas: Gmail), extrae su texto (OCR si es
escaneado), lo analiza con IA contra una checklist cerrada de riesgos, clasifica el resultado con un
**semáforo** y envía un **informe en PDF** al responsable junto con el contrato original. **Nunca
aprueba, rechaza ni aconseja firmar**: solo informa. Todo lo analizado queda en Sheets/Airtable.

> **Zona Make:** EU (`eu1.make.com`). **Salida:** Gmail (pruebas), aislada en un solo módulo para
> migrar a WhatsApp/Twilio (ver `08-migracion-whatsapp.md`).

```
CORREO CON CONTRATO ADJUNTO (Gmail)  ──►  [o carpeta de Google Drive en producción]
        │
        ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ESCENARIO ÚNICO — Auditoría de contrato                                              │
│                                                                                        │
│  [1] Gmail Watch ─► [2] Iterator(adjuntos) ─► [3] Drive Upload (convert=OCR) ─►        │
│  [4] Docs Export text/plain ─► [5] Set Variables (id, texto, n_chars, tipo) ─►         │
│                                                                                        │
│  [6] ROUTER · GATE DE LEGIBILIDAD                                                       │
│        ├─ n_chars <  MIN  ─► ILEGIBLE ─► [7] Email "revisar a mano" + [8] Sheets       │
│        │                                                        (NUNCA llama a la IA)   │
│        └─ n_chars >= MIN  ─► ANALIZABLE                                                 │
│                 [9] OpenAI (checklist→JSON) ─► [10] Parse JSON ─► [11] Set semáforo ─►  │
│                                                                                        │
│                 [12] ROUTER · RESULTADO DEL ANÁLISIS                                    │
│                       ├─ estado=NO_ANALIZABLE ─► [13] Email "revisar" + [14] Sheets     │
│                       │                                        (NO genera informe)      │
│                       └─ estado=ANALIZADO                                               │
│                              [15] Docs crea informe ─► [16] Docs export PDF ─►          │
│                              [17] Sheets add fila (semáforo, enlaces) ─►                │
│                                                                                        │
│                              [18] ROUTER · SEMÁFORO (solo cambia la notificación)       │
│                                    ├─ VERDE ─► [19] Email informe (verde)               │
│                                    ├─ ÁMBAR ─► [20] Email informe (ámbar)               │
│                                    └─ ROJO  ─► [21] Email informe (rojo) + CC legal     │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

> **Tres Routers, tres responsabilidades distintas** (no es sobre-ingeniería):
> - **R6 (legibilidad):** evita gastar una llamada a OpenAI sobre texto basura/vacío.
> - **R12 (resultado):** si la IA declara que no puede analizar con fiabilidad, **no** genera informe.
> - **R18 (semáforo):** el informe y la fila de Sheets ya están hechos una sola vez; este router
>   solo diferencia el correo (asunto, banner de urgencia, CC a legal en rojo). Sin duplicar módulos.

---

## Módulos en orden

| # | Módulo (identificador real) | Propósito |
|---|-----------------------------|-----------|
| **1** | **Gmail → Watch emails** `google-email:watchEmails` | Disparador. Vigila la bandeja (o una etiqueta/carpeta `Contratos-Entrantes`) filtrando correos **con adjunto**. En producción se sustituye por **Google Drive → Watch Files** sobre una carpeta concreta (ver nota al final). |
| **2** | **Flow Control → Iterator** `builtin:BasicFeeder` | Itera el array `attachments[]` del correo: un ciclo por adjunto. Permite auditar varios contratos en un mismo email. |
| **3** | **Google Drive → Upload a File** `google-drive:uploadAFile` | **Extracción + OCR en un paso.** Sube el adjunto a una carpeta de trabajo con **`convert = true`**: Drive convierte PDF/Word a Google Doc y, si el PDF es **escaneado (imagen)**, aplica **OCR** automáticamente. Devuelve el `id` del Doc resultante. Un **filtro** en la entrada descarta lo que no sea PDF/DOCX. |
| **4** | **Google Docs → Download/Export a Document** `google-docs:exportADocument` | Exporta el Doc del paso 3 con **`mimeType = text/plain`** → devuelve `data` = **texto plano** del contrato. (Es el mismo módulo que el proyecto hermano usa para exportar a PDF; aquí se usa para exportar a texto.) |
| **5** | **Tools → Set multiple variables** `util:SetVariables` | Normaliza campos transversales: `id_auditoria`, `fecha_analisis`, `remitente`, `asunto`, `nombre_archivo`, `texto_contrato = {{4.data}}`, **`n_chars = {{length(4.data)}}`** y `tipo_contrato` (deducido del asunto o `auto`). |
| **6** | **Flow Control → Router** `builtin:BasicRouter` | **Gate de legibilidad.** Bifurca por `n_chars`. Ver `05-documento-ilegible.md`. |
| **7** | **Gmail → Send an email** `google-email:sendAnEmail` (v4) | *(Ruta ILEGIBLE)* Avisa al responsable: "documento no legible, revisar manualmente". Adjunta el original. **No** se llama a la IA. |
| **8** | **Google Sheets → Add a Row** `google-sheets:addRow` | *(Ruta ILEGIBLE)* Registra estado `ILEGIBLE_REVISION_MANUAL`. |
| **9** | **OpenAI → Create a completion** `openai-gpt-3:CreateCompletion` | *(Ruta ANALIZABLE)* Cerebro. Con el *system prompt* (`prompts/system-prompt.md`) evalúa el contrato contra la **checklist cerrada** y devuelve **JSON**: por punto → estado (cubierto/falta/riesgo), cita textual, explicación llana, nivel de riesgo, `contadores` y `informe_cuerpo`. `model = gpt-4o`, `temperature = 0.1`, `response_format = {type: json_object}`. |
| **10** | **JSON → Parse JSON** `json:ParseJSON` | Convierte la cadena de OpenAI (`{{9.result}}`) en bundle mapeable (`estado_analisis`, `puntos[]`, `contadores`, `informe_cuerpo`…). |
| **11** | **Tools → Set multiple variables** `util:SetVariables` | Calcula el **semáforo determinista** a partir de `contadores` (ver `03-semaforo-y-router.md`). Fuente única de verdad para el informe, la hoja y el Router 18. |
| **12** | **Flow Control → Router** `builtin:BasicRouter` | **Resultado del análisis.** Si `estado_analisis = NO_ANALIZABLE` → revisión manual; si `= ANALIZADO` → genera informe. |
| **13** | **Gmail → Send an email** (v4) | *(Ruta NO_ANALIZABLE)* La IA no pudo analizar con fiabilidad (texto ilegible/incompleto pese a superar el gate). Avisa para revisión manual. **No** se genera informe con huecos. |
| **14** | **Google Sheets → Add a Row** | *(Ruta NO_ANALIZABLE)* Registra estado `NO_ANALIZABLE_IA` + `motivo`. |
| **15** | **Google Docs → Create a Document from a Template** `google-docs:createADocumentFromTemplate` | *(Ruta ANALIZADO)* Copia la plantilla del informe y sustituye etiquetas (`semaforo`, `resumen_ejecutivo`, `informe_cuerpo`, metadatos). El **descargo legal es texto fijo de la plantilla**, no lo escribe la IA. Devuelve `id` y `webViewLink`. |
| **16** | **Google Docs → Download/Export a Document** `google-docs:exportADocument` | *(Ruta ANALIZADO)* Exporta el informe a **PDF** (`mimeType = application/pdf`). Devuelve `data`. |
| **17** | **Google Sheets → Add a Row** | *(Ruta ANALIZADO)* Registra la auditoría: semáforo, contadores, enlace al informe, estado `INFORME_ENVIADO`. |
| **18** | **Flow Control → Router** `builtin:BasicRouter` | **Semáforo.** Tres rutas con filtro sobre `{{11.semaforo}}`. Solo cambia la notificación. |
| **19** | **Gmail → Send an email** (v4) | *(VERDE)* Envía el informe PDF **+ contrato original** al responsable. Asunto verde: "sin riesgos relevantes". |
| **20** | **Gmail → Send an email** (v4) | *(ÁMBAR)* Igual, asunto ámbar: "revisar antes de firmar". |
| **21** | **Gmail → Send an email** (v4) | *(ROJO)* Igual, asunto rojo: "riesgo alto, no firmar sin asesoría", **con CC al asesor legal**. |

> **Único punto de salida sustituible:** los módulos 19/20/21 (y 7/13) son el ÚNICO sitio donde el
> sistema "sale" hacia una persona. Cambiar de Gmail a WhatsApp/Twilio = cambiar esos módulos. Ver
> `08-migracion-whatsapp.md`.

---

## Decisiones de diseño

- **Extracción + OCR sin API extra:** `Google Drive Upload (convert=true)` + `Google Docs Export
  (text/plain)` cubre **PDF nativo, Word (.docx) y PDF escaneado** (Drive hace OCR al convertir),
  usando solo conexiones de Google. Alternativa de mayor precisión: **Mistral OCR / Google Vision**
  vía módulo HTTP (spec en la sección siguiente). El **gate de legibilidad (paso 6) funciona igual
  sea cual sea el método**.
- **La IA no decide:** el system prompt prohíbe recomendar firmar/no firmar y prohíbe inventar
  cláusulas. Solo detecta y explica. La decisión es siempre humana.
- **Semáforo determinista en Make, no en la IA:** la IA aporta `contadores`; el semáforo se calcula
  con `if()` en el paso 11 y se enruta con filtros (paso 18). Lógica auditable y reproducible, no
  sujeta al "criterio" del modelo. Ver `03-semaforo-y-router.md`.
- **Descargo legal a prueba de manipulación:** va como **texto fijo en la plantilla de Docs** (paso
  15) y se repite en el cuerpo del email. La IA no puede omitirlo ni reescribirlo.
- **Doble red de seguridad contra "huecos rellenados":** gate por nº de caracteres (paso 6) + la
  propia IA que se autodeclara `NO_ANALIZABLE` (paso 12). Ambos → revisión manual, nunca un informe
  incompleto. Ver `05-documento-ilegible.md`.

---

## Variante de extracción con OCR dedicado (Mistral OCR / Google Vision)

Si necesitas **mayor precisión de OCR** que la de Drive (contratos escaneados de baja calidad),
sustituye los pasos **3–4** por un módulo **HTTP → Make a request** contra **Mistral OCR**:

```
POST https://api.mistral.ai/v1/ocr
Headers: Authorization: Bearer {{MISTRAL_API_KEY}} · Content-Type: application/json
Body (raw JSON):
{
  "model": "mistral-ocr-latest",
  "document": {
    "type": "document_url",
    "document_url": "data:application/pdf;base64,{{base64 del adjunto {{2.data}}}}"
  }
}
```

La respuesta trae `pages[].markdown`; en el paso 5 se hace
`texto_contrato = {{join(map(body.pages; "markdown"); "\n\n")}}` y `n_chars = {{length(...)}}`.
**Google Vision** (`google-vision-ai`) es válido para imágenes/PDF en GCS, pero requiere bucket de
Cloud Storage; para el flujo por email, Drive-convert o Mistral OCR son más directos.

## Variante de disparador por Google Drive (producción)

Sustituye el paso **1** por **Google Drive → Watch Files over a folder**
(`google-drive:watchFilesInAFolder`) apuntando a una carpeta `Contratos-Entrantes`. El paso 2
(Iterator de adjuntos) desaparece: cada archivo nuevo es un ciclo. El resto del flujo (3→21) no
cambia. Así el cliente arrastra contratos a una carpeta en lugar de reenviarlos por correo.
