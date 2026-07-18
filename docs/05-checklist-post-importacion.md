# 05 · Checklist de configuración manual post-importación

Todo lo que **NO** puede venir pre-rellenado en el blueprint (IDs de hooks, conexiones OAuth,
IDs de plantilla/carpeta) y debes configurar tras importar. Los valores marcados como
`REEMPLAZAR_*` y los `0` en `hook`/`__IMTCONN__` son los que hay que sustituir.

## 0. Antes de importar
- [ ] Cuenta Make en zona **EU (eu1.make.com)**.
- [ ] Cuenta de OpenAI con **API key** activa y saldo.
- [ ] Cuenta de Google (Gmail, Docs, Drive, Sheets) para las pruebas.

## 1. Crear conexiones (una vez, reutilizables)
En Make → *Connections* (solo **4** conexiones, no hace falta Google Drive):
- [ ] **OpenAI** (API key) — app `openai-gpt-3`.
- [ ] **Google (Gmail)** — app `google-email`. Autoriza el envío de correo.
- [ ] **Google Docs** — app `google-docs` (su scope ya incluye Drive para crear/exportar el Doc).
- [ ] **Google Sheets** — app `google-sheets`.

> ⚠️ Google exige que la app OAuth de Make esté verificada o que añadas tu cuenta como *usuario de
> prueba* si usas un proyecto propio de Google Cloud. Con las conexiones estándar de Make, basta
> con autorizar.

## 2. Preparar los activos de Google
- [ ] Crear la **plantilla de Google Docs** con las etiquetas (ver `plantillas/`). Copia su ID
      de la URL (`docs.google.com/document/d/<TEMPLATE_DOC_ID>/edit`). En el Doc las etiquetas van
      **con llaves** (`{{cliente_nombre}}`); en el módulo de Make se escriben **sin llaves**
      (`cliente_nombre`) — el módulo añade las llaves automáticamente.
- [ ] Crear en Drive una **carpeta para documentos generados** → copia su `FOLDER_ID_GENERADOS`.
- [ ] Crear el **Google Sheet de seguimiento** con la pestaña `Seguimiento` y las cabeceras de
      `docs/02-google-sheets.md`. Copia el `SPREADSHEET_ID`.
- [ ] Dar permiso de acceso a la cuenta conectada sobre la plantilla, la carpeta y la hoja.

## 3. Importar los blueprints
- [ ] Make → *Create a new scenario* → menú `···` → **Import Blueprint** →
      `blueprints/01-generador-principal.blueprint.json`.
- [ ] Repetir con `blueprints/02-aprobacion-envio.blueprint.json`.

## 4. Reasignar conexiones en cada módulo
Tras importar, cada módulo mostrará "conexión no encontrada" (en el blueprint aparecen como `0`,
que es el marcador a sustituir). Selecciona la conexión correcta:
- **Escenario 1:** OpenAI (#3), Gmail (#6, #10), Sheets (#7, #11), Docs (#8 crear, #9 exportar PDF).
- **Escenario 2:** Sheets (#2 buscar, #6, #7), Docs (#4 exportar PDF), Gmail (#5, #8).

> El parámetro de conexión se llama `account` en los módulos de Gmail y `__IMTCONN__` en los de
> OpenAI, Google Docs y Google Sheets. Ambos se resuelven al reseleccionar la conexión en la UI.

## 5. Crear y enganchar los webhooks (los `hook: 0`)
- [ ] **Escenario 1 → módulo 1 (Webhook):** clic en *Add* → nombre `presupuestos-in` → copia la URL.
      Pégala en tu **Typeform/Google Forms/Tally** como destino (o úsala desde WhatsApp).
- [ ] **Escenario 2 → módulo 1 (Webhook):** *Add* → nombre `presupuestos-aprobacion` → copia la URL.
- [ ] En el **Escenario 1, módulo 11 (email de aprobación)**, sustituye
      `https://hook.eu1.make.com/REEMPLAZAR_HOOK_APROBACION` por la URL real del webhook del
      escenario 2.

## 6. Sustituir los marcadores `REEMPLAZAR_*`
| Marcador | Dónde | Valor |
|----------|-------|-------|
| `REEMPLAZAR_TEMPLATE_DOC_ID` | Esc.1 #8 `document` | ID de la plantilla Docs |
| `REEMPLAZAR_FOLDER_ID_GENERADOS` | Esc.1 #8 `folderId` | Carpeta donde se crean los docs |
| `REEMPLAZAR_SPREADSHEET_ID` | Esc.1 #7/#11, Esc.2 #2/#6/#7 | ID del Google Sheet |
| `REEMPLAZAR_EMAIL_INTERNO@tu-agencia.com` | Esc.1 #6/#10, Esc.2 #8 | Email del revisor |
| `REEMPLAZAR_NOMBRE_EMPRESA` / `REEMPLAZAR_TELEFONO` | Esc.2 #5 | Datos de tu empresa |
| `REEMPLAZAR_HOOK_APROBACION` | Esc.1 #10 (enlaces del email) | URL webhook Esc.2 |

## 7. Rellenar el prompt de OpenAI (módulo #3)
- [ ] Selecciona `model = gpt-4o` (o el que uses); al elegirlo aparecen los campos **Messages**.
- [ ] Pega el *system prompt* (`prompts/system-prompt.md`) como mensaje **System**.
- [ ] Pega el *user prompt* (`prompts/user-prompt-template.md`) como mensaje **User**, con tus
      **reglas de negocio** reales (`reglas-negocio/`). Debe incluir `{{1}}` (datos del webhook).
- [ ] Verifica `temperature = 0.2`. El **modo JSON** ya viene forzado en el blueprint vía
      *Other Input Parameters* → `response_format = {"type":"json_object"}`. (Alternativa: para el
      modelo elegido, activar «Response Format: JSON Object» si tu versión del módulo lo ofrece.)

## 8. Verificar el mapeo de etiquetas (módulo #8, *Create a Document from a Template*)
- [ ] Cada elemento de **Values** tiene `Tags` = nombre de la etiqueta **sin llaves**
      (ej. `cliente_nombre`) y `Replaced Value` = el valor mapeado. El módulo busca `{{cliente_nombre}}`
      en el Doc. Asegúrate de que cada etiqueta exista en la plantilla. Añade/ajusta pares según tu
      plantilla real (ver `plantillas/`).

## 9. Pruebas (fase email)
- [ ] Activa el escenario 1 y ejecuta *Run once*.
- [ ] Envía el `ejemplos/payload-webhook-reforma.json` al webhook (desde el formulario o con curl).
- [ ] Comprueba: se genera el Doc, el PDF, llega el email de aprobación con adjunto y botones.
- [ ] Pulsa **APROBAR** → el escenario 2 envía el PDF al email del cliente de prueba y Sheets pasa
      a `ENVIADO`.
- [ ] Prueba el caso `FALTAN_DATOS` (quita `metros_cuadrados` y `cliente_email`): debe llegar el
      email interno de datos faltantes y Sheets `PENDIENTE_DATOS`, **sin** generar PDF.

## 10. Activar
- [ ] Programa/activa ambos escenarios (*Scheduling: Immediately* para escenarios instantáneos por
      webhook).
- [ ] Revisa el consumo de operaciones y el límite de tu plan de Make.

## Verificación con MCP (opcional, si usas el MCP de Make)
Puedes validar cada blueprint antes de importar con `validate_blueprint_schema`, y validar la
config de cada módulo con `validate_module_configuration`.
