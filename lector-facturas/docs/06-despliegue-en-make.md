# 06 · Despliegue real en Make (YA CREADO)

El escenario **ya está creado** en la cuenta de Make (org `My Organization`, team `My Team`, zona `eu1`).
Está **desactivado** a la espera de 3 datos que no se pueden crear automáticamente (API key de Mistral,
ID del Google Sheet y email de avisos).

## Recursos creados en Make
| Recurso | Nombre | ID |
|---------|--------|----|
| Escenario | Lector Automatico de Facturas · OCR + IA | **6613926** |
| Carpeta | Lector de Facturas | 370160 |
| Data store (dedup) | Lector Facturas · Dedup | **149074** |
| Data structure | Facturas procesadas (dedup) | 496996 |

## Conexiones ya cableadas (reutilizadas de la cuenta)
| Módulo(s) | Conexión | ID |
|-----------|----------|----|
| Gmail: Watch (1) y Send (12) | My Gmail connection | `8532314` |
| OpenAI (4) | My OpenAI connection | `8476276` |
| Google Sheets (9, 11, 13) | My Google connection | `8533301` |
| OCR (3) | HTTP con API key de Mistral en el header | — (pegar la key) |

- **Prompts ya embebidos** en el módulo OpenAI (system + user). Modelo `gpt-4o-mini`, modo JSON. Los campos
  `Temperature`/`Max tokens`/`Top P`/`Number of completions` se dejan **vacíos** a propósito (ver más abajo).
- **Trigger Gmail** con filtro `has:attachment filename:pdf`, `format = Full`, `mark as read`.
- **Programación:** cada 15 min (`indefinitely / 900s`). Para la demo, usa **Run once**.

## ⚠️ Lo que falta para activarlo (3 cosas)
1. **API key de Mistral** → módulo **3** (OCR), header `Authorization`, sustituir
   `REEMPLAZAR_MISTRAL_API_KEY` por `Bearer <tu_key>` (o solo la key si dejas el prefijo `Bearer `).
2. **Google Sheet de destino** → crea la hoja con la pestaña `Facturas` y las cabeceras de
   `docs/04-google-sheets-airtable.md`. Copia su **Spreadsheet ID** y pégalo en los módulos **9, 11 y 13**
   (sustituye `REEMPLAZAR_SPREADSHEET_ID`).
3. **Email de avisos de revisión** → módulo **12**, campo *To*, sustituye
   `REEMPLAZAR_EMAIL_REVISION@tu-cliente.com` por el correo del responsable.

## Activación y prueba (demo de 5 minutos)
1. Pega la API key de Mistral, el Spreadsheet ID (×3) y el email de avisos.
2. Abre el escenario y pulsa **Run once**.
3. Envía un email a la cuenta de Gmail con **una factura PDF real** adjunta.
4. En segundos aparece la fila estructurada en la hoja `Facturas` (o el aviso, si es dudosa).
5. Activa el escenario (toggle **ON**) para que vigile la bandeja cada 15 min.

## Ampliar el disparador a Google Drive (sin tocar el resto)
1. Añade **Google Drive → Watch files in a folder** como nuevo módulo 1 (elige la carpeta).
2. Añade **Google Drive → Download a file** (`{{1.id}}`) para obtener el binario.
3. Repunta el módulo 3 (OCR): `document_url` = `data:{{2.mimeType}};base64,{{base64(2.data)}}`.
4. Del OCR en adelante, **nada cambia**. Puedes tener los dos disparadores en escenarios gemelos.

## Comprobaciones rápidas si algo falla
- **El OCR devuelve 401** → API key de Mistral mal pegada o sin saldo.
- **La IA devuelve texto no-JSON** → confirma que `response_format = {type: json_object}` sigue en
  *Other input parameters* del módulo 4.
- **Error `[400] ... expected an integer/decimal, but got a string`** en el módulo OpenAI → tienes
  algún valor en `Temperature`, `Max tokens`, `Top P` o `Number of completions`. **Vacíalos**: este
  módulo los envía como texto y la API los rechaza. El escenario ya viene con esos campos vacíos.
- **Sheets da error de columnas** → la pestaña debe llamarse `Facturas` y tener las 19 cabeceras A→S.
- **No detecta duplicados** → revisa que el Data Store seleccionado en módulos 6 y 10 es el `149074`.
