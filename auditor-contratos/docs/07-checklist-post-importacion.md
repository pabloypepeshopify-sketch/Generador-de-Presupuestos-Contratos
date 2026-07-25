# 07 · Checklist de configuración manual post-importación

Todo lo que **NO** puede venir pre-rellenado en el blueprint (conexiones OAuth, IDs de carpetas/hoja/
plantilla, emails) y hay que configurar tras importar. Los `REEMPLAZAR_*` y los `0` en `__IMTCONN__`
son los marcadores a sustituir.

## 0. Antes de importar
- [ ] Cuenta Make en zona **EU (eu1.make.com)**.
- [ ] Cuenta de OpenAI con **API key** activa y saldo.
- [ ] Cuenta de Google (Gmail, Drive, Docs, Sheets) para las pruebas.
- [ ] *(Opcional, solo si usas OCR dedicado)* API key de **Mistral** o proyecto de **Google Vision**.

## 1. Crear conexiones (una vez, reutilizables)
En Make → *Connections* (**5** conexiones):
- [ ] **OpenAI** — app `openai-gpt-3`.
- [ ] **Google (Gmail)** — app `google-email`. Autoriza lectura de correo (watch) y envío.
- [ ] **Google Drive** — app `google-drive`. **Necesaria aquí** (subir/convertir el adjunto para OCR).
- [ ] **Google Docs** — app `google-docs` (crear informe y exportar a texto/PDF).
- [ ] **Google Sheets** — app `google-sheets`.

> ⚠️ Google puede exigir que la app OAuth de Make esté verificada o que añadas tu cuenta como
> *usuario de prueba* si usas un proyecto propio de Google Cloud. Con las conexiones estándar de
> Make, basta con autorizar.

## 2. Preparar los activos de Google
- [ ] Crear en Drive una **carpeta de trabajo** (donde se suben/convierten los adjuntos) →
      copia su `FOLDER_ID_TRABAJO`.
- [ ] Crear en Drive una **carpeta de informes generados** → copia su `FOLDER_ID_INFORMES`.
- [ ] Crear la **plantilla del informe** en Google Docs con las etiquetas y el descargo legal fijo
      (ver `plantillas/google-docs-informe-riesgos.md`). Copia su `TEMPLATE_INFORME_ID` de la URL.
      En el Doc las etiquetas van **con llaves** (`{{semaforo}}`); en Make se escriben **sin llaves**.
- [ ] Crear el **Google Sheet** `Auditorias - Contratos` con la pestaña `Auditorias` y las cabeceras
      de `docs/04-informe-y-trazabilidad.md`. Copia el `SPREADSHEET_ID`.
- [ ] Dar acceso a la cuenta conectada sobre las dos carpetas, la plantilla y la hoja.
- [ ] *(Fase pruebas Gmail)* Crea una **etiqueta/carpeta** `Contratos-Entrantes` si prefieres vigilar
      solo ahí en vez de toda la bandeja.

## 3. Importar el blueprint
- [ ] Make → *Create a new scenario* → menú `···` → **Import Blueprint** →
      `blueprints/auditor-contratos.blueprint.json`.

## 4. Reasignar conexiones en cada módulo
Tras importar, cada módulo mostrará "conexión no encontrada" (`__IMTCONN__: 0`). Reasigna:
- **Gmail** (`google-email`): #1 (watch), #7, #13, #19, #20, #21.
- **Google Drive** (`google-drive`): #3 (upload+convert).
- **Google Docs** (`google-docs`): #4 (export texto), #15 (crear informe), #16 (export PDF).
- **OpenAI** (`openai-gpt-3`): #9.
- **Google Sheets** (`google-sheets`): #8, #14, #17.

## 5. Verificar el módulo de disparo (#1, Watch emails)
- [ ] Reselecciona **carpeta/etiqueta** a vigilar (`INBOX` o `Contratos-Entrantes`).
- [ ] Filtro `has:attachment` (o el criterio que use tu versión del módulo).
- [ ] *Scheduling* del escenario: **cada X minutos** (Gmail watch es trigger de sondeo, no instant).
- [ ] Si tu versión etiqueta el remitente distinto de `{{1.from}}` o el asunto distinto de
      `{{1.subject}}`, remapea esas dos referencias en el paso 5.

## 6. Verificar la extracción de texto (#3 → #4)
- [ ] En #3 (**Google Drive Upload**): confirma `folderId = FOLDER_ID_TRABAJO`, `convert = true`,
      `data = {{2.data}}`, `name = {{2.fileName}}`. (Si tu versión del módulo usa otros nombres de
      campo para el binario, mapea el adjunto del iterator ahí.)
- [ ] En #4 (**Google Docs Export**): `document = {{3.id}}`, `mimeType = text/plain`. El texto sale
      en `{{4.data}}`. **Si tu versión nombra el campo distinto** (`content`/`body`), remapea
      `texto_contrato` y `n_chars` en el paso 5 a ese campo.
- [ ] *(Opcional OCR dedicado)* Si sustituyes #3–#4 por HTTP → Mistral OCR, mapea
      `texto_contrato = {{join(map(body.pages; "markdown"); "\n\n")}}` (ver `docs/01-arquitectura.md`).

## 7. Rellenar el prompt de OpenAI (#9)
- [ ] `model = gpt-4o`, `temperature = 0.1`.
- [ ] Pega el **system prompt** (`prompts/system-prompt.md`) como mensaje **System**.
- [ ] Pega el **user prompt** (`prompts/user-prompt-template.md`) como mensaje **User**, con la
      **checklist cerrada** y `{{5.texto_contrato}}` / `{{5.tipo_contrato}}`.
- [ ] El **modo JSON** ya viene forzado en el blueprint (*Other Input Parameters* →
      `response_format = {"type":"json_object"}`).

## 8. Sustituir los marcadores `REEMPLAZAR_*`
| Marcador | Dónde | Valor |
|----------|-------|-------|
| `REEMPLAZAR_FOLDER_ID_TRABAJO` | #3 `folderId` | Carpeta de trabajo (subida/convert) |
| `REEMPLAZAR_TEMPLATE_INFORME_ID` | #15 `document` | ID de la plantilla del informe |
| `REEMPLAZAR_FOLDER_ID_INFORMES` | #15 `folderId` | Carpeta de informes generados |
| `REEMPLAZAR_SPREADSHEET_ID` | #8, #14, #17 | ID del Google Sheet |
| `REEMPLAZAR_EMAIL_RESPONSABLE@tu-cliente.com` | #7, #13, #19, #20, #21 (`to`) | Email del responsable |
| `REEMPLAZAR_EMAIL_ASESOR_LEGAL@tu-cliente.com` | #21 (`cc`) | Email del asesor legal (solo ROJO) |
| `REEMPLAZAR_NOMBRE_EMPRESA` | #15 (etiqueta `nombre_empresa`) | Nombre de tu empresa/cliente |

## 9. Ajustar el umbral de legibilidad (`MIN_CHARS`)
- [ ] En los filtros de #7 (`number:less 400`) y #9 (`number:greaterorequal 400`), ajusta el `400`
      a tu realidad documental (recomendado 400). **Deben coincidir** para no dejar huecos entre rutas.

## 10. Pruebas (fase Gmail)
- [ ] Activa el escenario y *Run once*.
- [ ] Envía un **contrato de prueba con riesgo** (renovación automática + permanencia larga + pena
      desproporcionada) → debe llegar informe **ROJO** con CC al legal y fila `INFORME_ENVIADO`.
- [ ] Envía un **contrato equilibrado** → informe **VERDE**.
- [ ] Envía un **PDF escaneado en blanco / imagen basura** → email `ILEGIBLE_REVISION_MANUAL`, **sin**
      informe, sin llamada a OpenAI.
- [ ] Comprueba en Sheets las 3 filas con estados y semáforos correctos, y el enlace al informe.
- [ ] Abre un informe PDF y confirma que el **descargo legal fijo** aparece y que cada punto muestra
      su **cita textual**.

## 11. Activar
- [ ] Activa el escenario (*Scheduling* cada X min). Revisa consumo de operaciones y límites del plan.

## Verificación con MCP (opcional, si usas el MCP de Make)
- Estructura del blueprint: `validate_blueprint_schema`.
- Config de cada módulo: `validate_module_configuration` (útil para confirmar los nombres de campo
  reales de `google-drive:uploadAFile` y `google-docs:exportADocument` en tu versión).
