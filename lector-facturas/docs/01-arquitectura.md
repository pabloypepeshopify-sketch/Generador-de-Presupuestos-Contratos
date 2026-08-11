# 01 · Arquitectura del escenario (módulo por módulo)

Un **único escenario** de Make. Disparador por email (Gmail) en fase de pruebas, ampliable a Drive.
Sin app propia, sin código.

```
EMAIL con PDF adjunto (Gmail)
        │
        ▼
[1] Watch emails ─► [2] List attachments ─► [3] OCR (Mistral, HTTP) ─► [4] OpenAI ─► [5] Parse JSON
                     (baja los adjuntos)     (filtro: solo PDF)         (¿es factura?  (a campos)
                                                                         + estructura)
                                                                                   │
                                                          [6] Data Store: ¿existe? ◄┘
                                                                   │
                                                          [7] Set Variables (banderas)
                                                                   │
                                                          [8] ROUTER
             ┌───────────────────────────┬───────────────────────────┬──────────────────────┐
             ▼ OK                          ▼ REVISIÓN                   ▼ DUPLICADA
   [9]  Sheets: fila PROCESADA    [11] Sheets: fila REVISION_MANUAL   [13] Sheets: fila DUPLICADA
   [10] Data Store: marcar         [12] Email de aviso "revisar"
        como procesada
```

## Módulos en orden

| # | Módulo (identificador real) | Propósito |
|---|-----------------------------|-----------|
| **1** | **Gmail → Watch emails** `google-email:triggerWatchNewEmails` (v4) | Disparador *polling*. Filtro Gmail `has:attachment filename:pdf` para traer solo emails con factura en PDF. `format = Full` (necesario para obtener el binario del adjunto), `Mark as read = Yes`. Su cursor interno garantiza que cada email se procesa **una sola vez**. |
| **2** | **Gmail → List email attachments and media** `google-email:listEmailAttachments` | **Descarga los adjuntos** del email (`messageId = {{1.id}}`, `Include = Attachments`, **`Return file data = Yes`**). Es un módulo *search*: emite un bundle por adjunto, así que **no hace falta iterador** y procesa varias facturas del mismo email. Salida: `{{2.data}}` (binario), `{{2.filename}}` (nombre), `{{2.mimeType}}` (tipo MIME). ⚠️ **Imprescindible**: el trigger *Watch emails* NO devuelve el binario del adjunto (solo `hasAttachment`); este módulo es el que lo baja. |
| **3** | **HTTP → Make a request** `http:MakeRequest` (v4) | **OCR**. `POST https://api.mistral.ai/v1/ocr` con el PDF en base64 (`data:{{2.contentType}};base64,{{base64(2.data)}}`). Devuelve el texto en markdown por páginas (`{{3.data.pages[].markdown}}`), conservando tablas de partidas e IVA. **Lleva un filtro de entrada "Solo PDF"** para descartar adjuntos que no sean factura (logos de firma, etc.). Ver `docs/02-ocr-comparativa.md`. |
| **4** | **OpenAI → Create a completion** `openai-gpt-3:CreateCompletion` | **Clasifica y estructura**. Primero decide `es_factura` (`true/false`): si el PDF es una factura de proveedor de verdad o es otra cosa (presupuesto, albarán, aviso de pago, publicidad…). Luego **estructura** el texto OCR en JSON limpio. `gpt-4o-mini`, modo JSON (`response_format = {type: json_object}`). Sin `temperature`/`max_tokens` (ver nota abajo). *System prompt* y *user prompt* en `prompts/`. Nunca inventa: si no lee un dato, lo deja vacío. Es **permisivo** con `es_factura`: una factura real con campos faltantes sigue siendo `true` (irá a REVISIÓN). |
| **5** | **JSON → Parse JSON** `json:ParseJSON` | Convierte `{{4.result}}` en campos mapeables: `estado`, `proveedor_nombre`, `base_imponible`, `total`, `confianza`, etc. |
| **6** | **Data Store → Check the existence of a record** `datastore:ExistRecord` | **Antiduplicados**. Clave = `nif|numero_factura` (o `nombre|numero` si no hay NIF). Devuelve `{{6.exist}}` (sí/no). Ver `docs/05-dedup.md`. |
| **7** | **Tools → Set multiple variables** `util:SetVariables` | Calcula banderas para el Router: `clave_factura`, `id_registro`, `fecha_proceso`, `dup` (`SI/NO` según `6.exist`), `descuadre` (`SI/NO`: comprueba en Make que `base + IVA = total`) y **`es_fac`** (`SI/NO` según `5.es_factura`) — la bandera que decide si el documento se registra o se descarta. |
| **8** | **Flow Control → Router** `builtin:BasicRouter` | Bifurca en 3 rutas con filtros. **Las 3 rutas exigen `es_fac = SI`**: si el documento no es una factura, no coincide con ninguna ruta y **se descarta sin dejar rastro** en la hoja. Ver `docs/03-validacion-confianza.md`. |
| **9** | **Google Sheets → Add a Row** `google-sheets:addRow` | *(Ruta OK)* Registra la factura con `estado = PROCESADA` en la hoja contable. Columnas en `docs/04-google-sheets-airtable.md`. |
| **10** | **Data Store → Add/replace a record** `datastore:AddRecord` | *(Ruta OK)* Guarda la clave de la factura para que un reenvío futuro se detecte como duplicado. |
| **11** | **Google Sheets → Add a Row** `google-sheets:addRow` | *(Ruta REVISIÓN)* Registra la factura con `estado = REVISION_MANUAL` y el motivo, para que un humano la valide. **No** se marca en el Data Store (no está confirmada). |
| **12** | **Gmail → Send an email** `google-email:sendAnEmail` (v4) | *(Ruta REVISIÓN)* Avisa al responsable con proveedor, importes, confianza y motivo. Es el "no fallar en silencio" del brief. |
| **13** | **Google Sheets → Add a Row** `google-sheets:addRow` | *(Ruta DUPLICADA)* Deja traza de que llegó una factura ya registrada, sin volver a contabilizarla. |

## Decisiones de diseño
- **OCR y IA separados a propósito.** El OCR (Mistral) *lee* píxeles → texto; la IA (OpenAI) *estructura*
  texto → JSON. Separarlos hace el sistema robusto con escaneos y fotos de móvil (típico en talleres),
  no solo con PDFs digitales.
- **Descarga de adjuntos antes del OCR.** Un email puede traer varias facturas. El módulo *List email
  attachments* emite un bundle por adjunto (no hace falta iterador) y cada uno se procesa por separado.
- **La IA filtra "no-facturas" (`es_factura`).** Gmail trae cualquier PDF adjunto; la IA decide primero si
  es una factura de verdad. Solo las facturas reales pasan el Router; presupuestos, albaranes o avisos de
  pago se descartan **sin** ensuciar la hoja. Permisivo a propósito: si duda y hay nº + importe, la deja pasar.
- **Doble validación (IA + Make).** La IA decide `OK/REVISION` y además Make recalcula el descuadre y el
  umbral de confianza en el Router. Si la IA se relaja, el Router la corrige.
- **Antiduplicados con Data Store, no con Sheets.** Un `Check existence` por clave es O(1) y no depende de
  releer toda la hoja. Ver `docs/05-dedup.md`.
- **Un solo escenario.** No hay bucle de aprobación bloqueante como en el generador de presupuestos: aquí
  la "revisión humana" es una **marca + aviso**, no un botón que frena el flujo. Más simple de vender y operar.

## Ampliación a Google Drive (futuro)
Sustituir el módulo **1** por **Google Drive → Watch files in a folder** y el **2** por la descarga del
fichero. Del módulo **3** en adelante **no cambia nada** (el OCR sigue recibiendo un binario + su MIME).
Ver `docs/06-despliegue-en-make.md`.
