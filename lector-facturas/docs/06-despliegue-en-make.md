# 06 · Despliegue real en Make (YA CREADO Y CABLEADO)

El escenario **ya está creado y casi todo cableado** en la cuenta de Make (org `My Organization`,
team `My Team`, zona `eu1`). Está **desactivado** a la espera de **1 solo dato**: la API key de Mistral
(el OCR), que requiere alta con pago y por eso no se puede automatizar. **La hoja de destino y el email
de avisos ya están puestos.**

## Recursos creados en Make
| Recurso | Nombre | ID |
|---------|--------|----|
| Escenario | Lector Automatico de Facturas · OCR + IA | **6613926** |
| Carpeta | Lector de Facturas | 370160 |
| Data store (dedup) | Lector Facturas · Dedup | **149074** |
| Data structure | Facturas procesadas (dedup) | 496996 |
| Google Sheet de destino | Facturas - Lector Automatico (Make) · pestaña `Untitled` | `1qtZNixNsExhuDdXBVP3FcnNHu-xfyu4hul97ot2CFUE` |

## Conexiones y datos ya cableados
| Módulo(s) | Conexión / dato | ID / valor |
|-----------|----------|----|
| Gmail: Watch (1) y Send (12) | My Gmail connection | `8532314` |
| OpenAI (4) | My OpenAI connection | `8476276` |
| Google Sheets (9, 11, 13) | My Google connection | `8533301` |
| Sheet destino (9, 11, 13) | Spreadsheet ya creado, pestaña `Untitled` | ✅ cableado y **probado** (escribe fila OK) |
| Email de avisos (12) | `pabloypepeshopify@gmail.com` | ✅ puesto |
| OCR (3) | HTTP con API key de Mistral en el header | ⏳ **pegar la key** |

- **Prompts ya embebidos** en el módulo OpenAI (system + user). Modelo `gpt-4o-mini`, modo JSON. Los campos
  `Temperature`/`Max tokens`/`Top P`/`Number of completions` se dejan **vacíos** a propósito (ver más abajo).
- **Trigger Gmail** con filtro `has:attachment filename:pdf`, `format = Full`, `mark as read`.
- **Programación:** cada 15 min (`indefinitely / 900s`). Para la demo, usa **Run once**.

## ⚠️ Lo único que falta para activarlo (1 dato)
**API key de Mistral** → módulo **3** (OCR), header `Authorization`, sustituir
`REEMPLAZAR_MISTRAL_API_KEY` por `Bearer <tu_key>`.
- Alta en `console.mistral.ai` → **API Keys → Create new key** (tiene plan gratuito para empezar).
- **IMPORTANTE:** el valor del header debe ser `Bearer <tu_key>` (con el prefijo `Bearer ` y un espacio).
  Pegar solo la clave da error 401 y el OCR devuelve texto vacío.
- El escenario ya está **probado de extremo a extremo** con este OCR (ver README); la hoja y el email ya
  están cableados. Tras pegar la key, pulsa **Run once** o activa el toggle **ON**.

> La pestaña de la hoja se llama **`Untitled`** (así se creó al generarla automáticamente). Si la
> renombras, actualiza el campo *Sheet* de los módulos 9, 11 y 13. También hay una fila `SMOKE-TEST` de
> la prueba de escritura que puedes borrar.

## Activación y prueba (demo de 5 minutos)
1. Pega la API key de Mistral en el módulo 3.
2. Abre el escenario y pulsa **Run once**.
3. Envía un email a la cuenta de Gmail con **una factura PDF real** adjunta.
4. En segundos aparece la fila estructurada en la hoja (o el aviso por email, si es dudosa).
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
- **Sheets: `'valueInputOption' is required but not specified`** → en cada módulo *Add a Row* (9, 11, 13),
  el campo *Value input* debe estar en `User entered`. El escenario ya viene con `valueInputOption`
  puesto; solo aplica si reconstruyes el módulo a mano.
- **Sheets: la fila no cae donde esperas** → confirma que el *Sheet* seleccionado es la pestaña real
  (aquí `Untitled`) y que existen las 19 cabeceras A→S.
- **No detecta duplicados** → revisa que el Data Store seleccionado en módulos 6 y 10 es el `149074`.
