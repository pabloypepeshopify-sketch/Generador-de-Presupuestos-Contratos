# 07 · Checklist de configuración manual post-importación

Todo lo que **NO** puede venir pre-rellenado en el blueprint genérico (conexiones OAuth, clave de
Mistral, IDs de carpeta/hoja/plantilla, emails) y hay que configurar tras importar. Los `REEMPLAZAR_*`
y los `0` en `__IMTCONN__` son los marcadores a sustituir.

> **Nota:** para **tu** cuenta (VISAX AI) ya he creado los 3 activos de Google y validado todos los
> módulos contra la API de Make; los IDs reales están en la sección 8. Para **vender/instalar en otro
> cliente**, crea sus propios activos y conexiones siguiendo estos mismos pasos.

## 0. Antes de importar
- [ ] Cuenta Make en zona **EU (eu1.make.com)**.
- [ ] Cuenta de OpenAI con **API key** activa y saldo.
- [ ] **API key de Mistral** (para el OCR). La misma que ya usas en "Lector de Facturas · OCR + IA".
- [ ] Cuenta de Google (Gmail, Docs, Sheets) para las pruebas.

## 1. Conexiones (solo 3, reutilizables) — sin Google Drive
En Make → *Connections*:
- [ ] **OpenAI** — app `openai-gpt-3`.
- [ ] **Google (Gmail)** — app `google-email`. Autoriza lectura de correo (watch) y envío.
- [ ] **Google** — app `google` (**la misma conexión sirve para Docs y Sheets**).

> El OCR (módulo HTTP #3) **no usa conexión de Make**: la clave de Mistral va en su cabecera
> `Authorization`. Y Google Docs crea/exporta el informe sin el conector de Drive.

## 2. Preparar los activos de Google
- [ ] **Carpeta de informes generados** en Drive → copia su `FOLDER_ID_INFORMES`.
- [ ] **Plantilla del informe** en Google Docs con las etiquetas y el descargo legal fijo (ver
      `plantillas/google-docs-informe-riesgos.md`). Copia su `TEMPLATE_INFORME_ID`. Etiquetas **con
      llaves** en el Doc (`{{semaforo}}`); en Make **sin llaves**.
- [ ] **Google Sheet** de trazabilidad con las 14 cabeceras de `docs/04-informe-y-trazabilidad.md`.
      Copia el `SPREADSHEET_ID` y el **nombre de la pestaña** (`sheetId`).
- [ ] *(Fase pruebas Gmail)* opcional: etiqueta/carpeta `Contratos-Entrantes` si prefieres vigilar
      solo ahí.

## 3. Importar el blueprint
- [ ] Make → *Create a new scenario* → menú `···` → **Import Blueprint** →
      `blueprints/auditor-contratos.blueprint.json`.

## 4. Reasignar conexiones en cada módulo (`__IMTCONN__: 0`)
- **Gmail** (`google-email`): #1 (watch), #2 (adjuntos), #6, #12, #18, #19, #20.
- **Google** (`google`, Docs+Sheets): #7, #13, #14 (crear informe), #15 (export PDF), #16.
- **OpenAI** (`openai-gpt-3`): #8.
- **HTTP** (#3): sin conexión; pega la clave de Mistral en la cabecera (sección 5).

## 5. Pegar la clave de Mistral (módulo #3, HTTP)
- [ ] En *Headers* → `Authorization` sustituye `Bearer REEMPLAZAR_MISTRAL_API_KEY` por
      `Bearer <tu-clave-Mistral>`.
- [ ] El cuerpo ya trae `data:{{2.mimeType}};base64,{{base64(2.data)}}` y `parseResponse = true`.

## 6. Verificar el disparador (#1) y el OCR (#3)
- [ ] #1 *Watch emails*: campo `q` = `has:attachment filename:pdf` (o `label:Contratos-Entrantes
      has:attachment`). *Scheduling* del escenario: **cada X minutos** (es trigger de sondeo).
- [ ] #3 filtro "Solo PDF" activo. Salida del OCR: `{{3.data.pages[].markdown}}` (ya mapeado en #4
      como `texto_contrato` y `n_chars`).

## 7. Rellenar el prompt de OpenAI (#8)
- [ ] `model = gpt-4o`, `temperature = 0.1`.
- [ ] Pega el **system prompt** (`prompts/system-prompt.md`) como mensaje **System**.
- [ ] Pega el **user prompt** (`prompts/user-prompt-template.md`) como mensaje **User** (incluye la
      checklist cerrada, `{{4.tipo_contrato}}` y `{{4.texto_contrato}}`).
- [ ] El **modo JSON** ya viene forzado (*Other Input Parameters* → `response_format = {"type":"json_object"}`).

## 8. Sustituir los marcadores `REEMPLAZAR_*`
| Marcador | Dónde | Valor genérico | **Ya creado en tu cuenta (VISAX AI)** |
|----------|-------|----------------|----------------------------------------|
| `REEMPLAZAR_MISTRAL_API_KEY` | #3 (header) | Tu clave Mistral | *(usa tu clave existente de Mistral)* |
| `REEMPLAZAR_FOLDER_ID_INFORMES` | #14 `folderId` | Carpeta de informes | `1ugUnyqwYW7yL3OBqBV1Tr9XomiLMVTm-` |
| `REEMPLAZAR_TEMPLATE_INFORME_ID` | #14 `document` | Plantilla Docs | `1AqZ6dcTLWwDFHgCG5OAdO5tVd6BzzCCduJQp-_pvrXw` |
| `REEMPLAZAR_SPREADSHEET_ID` | #7, #13, #16 | Google Sheet | `135y-0zqrnJcbJgJdUD0gZwgLWau9h_soIRrfymOo74w` |
| `sheetId` (pestaña) | #7, #13, #16 | Nombre de tu pestaña | `Untitled` |
| `REEMPLAZAR_EMAIL_RESPONSABLE@tu-cliente.com` | #6, #12, #18, #19, #20 (`to`) | Email del responsable | `pabloypepeshopify@gmail.com` (cámbialo por el del cliente) |
| `REEMPLAZAR_EMAIL_ASESOR_LEGAL@tu-cliente.com` | #20 (`cc`) | Email del asesor legal | *(pon el del abogado)* |
| `REEMPLAZAR_NOMBRE_EMPRESA` | #14 (etiqueta `nombre_empresa`) | Nombre de la empresa | `VISAX AI` |

## 9. Ajustar el umbral de legibilidad (`MIN_CHARS`)
- [ ] En los filtros de #6 (`number:less 400`) y #8 (`number:greaterorequal 400`), ajusta el `400`
      a tu realidad documental. **Deben coincidir** para no dejar huecos entre rutas.

## 10. Pruebas (fase Gmail)
- [ ] Activa el escenario y *Run once*.
- [ ] Envía un **contrato PDF con riesgo** (renovación automática + permanencia larga + pena
      desproporcionada) → informe **ROJO** con CC al legal y fila `INFORME_ENVIADO`.
- [ ] Envía un **contrato equilibrado** → informe **VERDE**.
- [ ] Envía un **PDF escaneado en blanco / imagen basura** → email `ILEGIBLE_REVISION_MANUAL`, **sin**
      informe, sin llamada a OpenAI.
- [ ] Comprueba en Sheets las filas con estados y semáforos correctos, y el enlace al informe.
- [ ] Abre un informe PDF: confirma el **descargo legal fijo** y la **cita textual** de cada punto.

## 11. Activar
- [ ] Activa el escenario (*Scheduling* cada X min). Revisa consumo de operaciones y límites del plan.

## Estado de validación (hecho por mí contra tu org de Make)
- ✅ Los **8 módulos distintos** validados con `validate_module_configuration` (org 8133524, team
  1998941): `triggerWatchNewEmails` v4, `listEmailAttachments` v4 (`include` como **array**),
  `http:MakeRequest` v4, `openai-gpt-3:CreateCompletion` v1, `google-docs:createADocumentFromTemplate`
  v1, `google-docs:exportADocument` v1, `google-sheets:addRow` v2, `google-email:sendAnEmail` v4.
- ✅ Activos de Google creados (sección 8) y pestaña de la hoja confirmada (`Untitled`) vía RPC.
