# 01 · Arquitectura del escenario (módulo por módulo)

La solución se reparte en **2 escenarios de Make** para implementar la aprobación humana de forma
robusta y desacoplada.

```
FORMULARIO / WHATSAPP
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ ESCENARIO 1 — Generación + solicitud de aprobación                          │
│                                                                             │
│  [1] Webhook ──► [2] Set Variables ──► [3] OpenAI ──► [4] Parse JSON ──► [5] Router
│                                                                        │      │
│                        ┌───────────────────────────────────────────────┘      │
│                        │                                                      │
│         estado=FALTAN_DATOS │                         estado=COMPLETO         │
│                        ▼                                     ▼                │
│         [6] Gmail interno "faltan datos"      [8] Google Docs (crea desde plantilla)
│         [7] Sheets add row PENDIENTE_DATOS    [9] Google Docs → Download PDF │
│                                               [10] Gmail interno "APROBAR"    │
│                                                    (adjunta PDF + 2 enlaces)  │
│                                               [11] Sheets add PENDIENTE_APROBACION
└─────────────────────────────────────────────────────────────────────────────┘
                                                        │
                       (el revisor pulsa APROBAR / RECHAZAR en el email)
                                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ ESCENARIO 2 — Aprobación y envío al cliente                                 │
│                                                                             │
│  [1] Webhook aprobación ──► [2] Sheets Search Rows ──► [3] Router           │
│                                    │                                        │
│                decision=aprobar ◄──┴──► decision=rechazar                   │
│                    ▼                          ▼                             │
│     [4] Docs → Download PDF       [7] Sheets update RECHAZADO               │
│     [5] Gmail → CLIENTE (PDF)     [8] Gmail interno "rechazado"             │
│     [6] Sheets update ENVIADO                                              │
│                    └──────────────► [9] Webhook Response (200 HTML)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

> El PDF se genera con el módulo nativo **Google Docs → «Download a Document»** (`exportADocument`)
> exportando a `application/pdf`. **No se usa el conector de Google Drive**, por lo que hay una
> conexión OAuth menos que configurar. En el escenario 2 se vuelve a exportar el mismo Google Doc
> (por su ID) para adjuntarlo al cliente.

---

## ESCENARIO 1 — `blueprints/01-generador-principal.blueprint.json`

| # | Módulo (identificador real) | Propósito |
|---|---------------|-----------|
| **1** | **Webhook** `gateway:CustomWebHook` | Disparador *instant*. Recibe el JSON del formulario (Typeform/Google Forms/Tally) o del WhatsApp. Es el punto de entrada; su URL se pega en el formulario. |
| **2** | **Tools → Set multiple variables** `util:SetVariables` | Normaliza y prepara datos transversales: genera `id_solicitud` (fecha+email), `fecha_recepcion` y fija `canal_entrada`. Evita repetir fórmulas por todo el escenario. |
| **3** | **OpenAI → Generate a completion** `openai-gpt-3:CreateCompletion` | Cerebro del flujo. Con el *system prompt* (ver `prompts/system-prompt.md`) redacta el documento, calcula partidas según reglas de negocio y devuelve **JSON estructurado**. `select = chat`, `model = gpt-4o`, `temperature = 0.2`. El modo JSON se fuerza vía *Other Input Parameters* → `response_format = {type: json_object}`. |
| **4** | **JSON → Parse JSON** `json:ParseJSON` | Convierte la cadena JSON de OpenAI (`{{3.result}}`) en un bundle con campos mapeables (`estado`, `partidas`, `total`, `cuerpo_documento`…). |
| **5** | **Flow Control → Router** `builtin:BasicRouter` | Bifurca según el campo `estado` que devolvió la IA. Cada ruta lleva un **filtro**. |
| **6** | **Gmail → Send an email** `google-email:ActionSendEmail` | *(Ruta FALTAN_DATOS)* Avisa al equipo interno de qué datos faltan. **No** se contacta al cliente todavía. |
| **7** | **Google Sheets → Add a Row** `google-sheets:addRow` | *(Ruta FALTAN_DATOS)* Registra la solicitud con estado `PENDIENTE_DATOS` para no perder el lead. |
| **8** | **Google Docs → Create a Document from a Template** `google-docs:createADocumentFromTemplate` | *(Ruta COMPLETO)* Copia la plantilla y sustituye las etiquetas (`requests[].text` → `replaceText`). Devuelve el `id` y `webViewLink` del nuevo Doc. |
| **9** | **Google Docs → Download a Document** `google-docs:exportADocument` | *(Ruta COMPLETO)* Exporta el Doc recién creado (`document = {{8.id}}`) a **PDF** (`mimeType = application/pdf`). Devuelve `data` (binario) y `filename`. |
| **10** | **Gmail → Send an email** `google-email:ActionSendEmail` | *(Ruta COMPLETO)* **Solicitud de aprobación**: envía al revisor interno el PDF adjunto (`{{9.data}}`) + dos enlaces (Aprobar / Rechazar) que apuntan al webhook del escenario 2 con `doc_id = {{8.id}}`. |
| **11** | **Google Sheets → Add a Row** `google-sheets:addRow` | *(Ruta COMPLETO)* Registra la solicitud con estado `PENDIENTE_APROBACION`, importe y enlace al Doc (`{{8.webViewLink}}`). |

> **Por qué el envío al cliente NO está en el escenario 1:** separar la generación de la aprobación
> garantiza que ningún documento salga al cliente sin intervención humana, incluso si algo falla.
> Ver `docs/03-aprobacion-humana.md`.

---

## ESCENARIO 2 — `blueprints/02-aprobacion-envio.blueprint.json`

| # | Módulo (identificador real) | Propósito |
|---|---------------|-----------|
| **1** | **Webhook** `gateway:CustomWebHook` | Recibe la decisión del revisor (parámetros `id_solicitud`, `decision`, `doc_id`, `cliente_email`) al pulsar un botón del email de aprobación. |
| **2** | **Google Sheets → Search Rows** `google-sheets:filterRows` | Localiza la fila de la solicitud por `id_solicitud`. Devuelve también el **número de fila** (`__ROW_NUMBER__`) para poder actualizarla. |
| **3** | **Router** `builtin:BasicRouter` | Bifurca por `decision`. |
| **4** | **Google Docs → Download a Document** `google-docs:exportADocument` | *(aprobar)* Vuelve a exportar el Doc aprobado (`document = {{1.doc_id}}`) a PDF. |
| **5** | **Gmail → Send an email** `google-email:ActionSendEmail` | *(aprobar)* **Único punto donde se escribe al CLIENTE.** Envía el PDF definitivo. *(En producción, este módulo se sustituye por WhatsApp/Twilio — ver `docs/06-migracion-whatsapp.md`.)* |
| **6** | **Google Sheets → Update a Row** `google-sheets:updateRow` | *(aprobar)* Marca estado `ENVIADO` y fecha de envío (`rowNumber = {{2.__ROW_NUMBER__}}`). |
| **7** | **Google Sheets → Update a Row** `google-sheets:updateRow` | *(rechazar)* Marca estado `RECHAZADO`. |
| **8** | **Gmail → Send an email** `google-email:ActionSendEmail` | *(rechazar)* Notifica internamente para editar el documento a mano o relanzar. |
| **9** | **Webhook Response** `gateway:WebhookRespond` | Devuelve una página HTML de confirmación al navegador del revisor tras pulsar el botón. |

> **Nota sobre el número de fila:** el módulo *Search Rows* expone el campo **«Row number»**. En el
> blueprint se referencia como `{{2.__ROW_NUMBER__}}`; si tu versión lo etiqueta distinto, remapea
> ese campo en los dos módulos *Update a Row* tras importar.

---

## Decisiones de diseño

- **Modo JSON (`response_format = {type: json_object}`) + Parse JSON**: se pasa como *Other Input
  Parameter* del módulo OpenAI y, combinado con el system prompt que exige JSON, elimina el error
  clásico de que la IA devuelva texto con markdown que rompe el parseo.
- **`id_solicitud` = fecha+email**: clave única para cruzar Sheets ↔ escenarios ↔ Doc/PDF.
- **Sin conector Google Drive**: el PDF se obtiene con el módulo nativo de Google Docs
  (`exportADocument`). Una conexión OAuth menos y menos superficie de fallo.
- **Salida sustituible**: el envío al cliente está aislado en **un solo módulo** (escenario 2, #5).
  Cambiar de Gmail a WhatsApp = cambiar ese módulo, nada más.
- **Reglas de negocio externalizables**: pueden vivir en un Data Store para editarlas sin tocar el
  escenario (ver `reglas-negocio/`).
