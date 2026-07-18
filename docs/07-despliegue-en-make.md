# 07 · Despliegue real en Make (ya creado)

Los dos escenarios **ya están creados** en tu cuenta de Make (org `My Organization`, team `My Team`,
zona `eu1`). Están **desactivados** a la espera de que rellenes 3 IDs de Google (plantilla, hoja y
carpeta), que no se pueden crear automáticamente.

## Escenarios creados
| Escenario | ID | Webhook (disparador) | Estado |
|-----------|----|----------------------|--------|
| 1 · Generación + Aprobación | **6611125** | `https://hook.eu1.make.com/um1aiy31btng29en6mukyff4v1puvy6c` | Inactivo |
| 2 · Aprobación y Envío | **6611154** | `https://hook.eu1.make.com/mpt5sps3018nljuvk7n7agono48nmf6q` | Inactivo |

- Webhook entrada (esc.1): id `3412131` — **esta es la URL que pegas en tu formulario/WhatsApp**.
- Webhook aprobación (esc.2): id `3412132` — ya está incrustada en los botones del email del esc.1.

## Conexiones ya cableadas (reutilizadas de tu cuenta)
| Módulo | Conexión | ID |
|--------|----------|----|
| OpenAI (esc.1 #3) | My OpenAI connection | `8476276` |
| Gmail (esc.1 #6/#10, esc.2 #5/#8) | My Gmail connection | `8532314` |
| Google Docs + Sheets (resto) | My Google connection | `8533301` |

- El **prompt de sistema, las reglas de negocio y el prompt de usuario ya están embebidos** en el
  módulo OpenAI del escenario 1. Modelo `gpt-4o`, `temperature 0.2`, modo JSON activado.
- El email interno del revisor está puesto a `pabloypepeshopify@gmail.com` (cámbialo si quieres).

## ⚠️ Lo que falta para activarlos (3 IDs de Google)
No tengo acceso a Google Drive/Docs/Sheets, así que estos activos los creas tú (5 min) y pegas su ID:

1. **Google Sheet de seguimiento** → crea la hoja con pestaña `Seguimiento` y las cabeceras de
   `docs/02-google-sheets.md`. Copia su ID y pégalo en el campo *Spreadsheet ID* de:
   - Esc.1 módulos **7** y **11**
   - Esc.2 módulos **2**, **6** y **7**
   (reemplaza `REEMPLAZAR_SPREADSHEET_ID`).
2. **Plantilla Google Docs** → crea el Doc con las etiquetas de `plantillas/`. Copia su ID y pégalo
   en *Document ID* del Esc.1 módulo **8** (reemplaza `REEMPLAZAR_TEMPLATE_DOC_ID`).
3. **Carpeta de Drive** para los documentos generados → copia su ID y pégalo en *New Document's
   Location* del Esc.1 módulo **8** (reemplaza `REEMPLAZAR_FOLDER_ID_GENERADOS`).
4. *(Opcional)* En el Esc.2 módulo **5**, sustituye `REEMPLAZAR_NOMBRE_EMPRESA` y
   `REEMPLAZAR_TELEFONO` por los datos de la empresa cliente (esto va en el correo al cliente final).

### Posible reautorización de la conexión Google (documents scope)
El módulo *Create a Document from a Template* (esc.1 #8) requiere el scope
`documents.readonly`. La conexión `8533301` tiene Drive + Sheets pero puede pedirte **reautorizar
para añadir el scope de Google Docs**: abre el módulo, y si Make lo pide, pulsa *Reauthorize* en la
conexión (un clic). Los demás módulos Google funcionan ya.

## Activación
Cuando los 3 IDs estén puestos:
1. Abre cada escenario y pulsa **Run once** en el esc.1 mientras envías un `POST` de prueba al
   webhook de entrada con el `ejemplos/payload-webhook-reforma.json`.
2. Verifica: se genera el Doc + PDF y llega el email de aprobación con adjunto y botones.
3. Pulsa **APROBAR** → el esc.2 envía el PDF y marca `ENVIADO` en Sheets.
4. Activa ambos escenarios (toggle **ON**).

## Prueba rápida por consola
```bash
curl -X POST https://hook.eu1.make.com/um1aiy31btng29en6mukyff4v1puvy6c \
  -H "Content-Type: application/json" \
  -d @ejemplos/payload-webhook-reforma.json
```
