# 07 · Despliegue real en Make (CREADO, PROBADO y ACTIVO)

Los dos escenarios están **creados, activos y verificados de extremo a extremo** en la cuenta de
Make (org `My Organization`, team `My Team`, zona `eu1`). Todos los activos de Google también
están creados. **El flujo completo se ha probado con datos reales y funciona.**

## Escenarios (ACTIVOS)
| Escenario | ID | Webhook | Estado |
|-----------|----|---------|--------|
| 1 · Generación + Aprobación | **6611125** | `https://hook.eu1.make.com/um1aiy31btng29en6mukyff4v1puvy6c` | ✅ Activo |
| 2 · Aprobación y Envío | **6611154** | `https://hook.eu1.make.com/mpt5sps3018nljuvk7n7agono48nmf6q` | ✅ Activo |

- **URL para tu formulario/WhatsApp** (disparador): la del escenario 1 (`...um1aiy31...`).
- La URL del escenario 2 ya está incrustada en los botones ✅/❌ del email de aprobación.

## Activos de Google creados (en tu Drive)
| Activo | ID | Enlace |
|--------|----|--------|
| Carpeta contenedora | `16FlnwdyVgOKfWXzh5E3uneLIN4z_TyLb` | [abrir](https://drive.google.com/drive/folders/16FlnwdyVgOKfWXzh5E3uneLIN4z_TyLb) |
| Carpeta salida (Generados) | `1Hh3iHbJv6rydKFotv8-pgj_eejKrkxwF` | — |
| Hoja de seguimiento | `11l_f2yQbEMeQgGOimwqQemnY6eYvR3bKXxTRG7ZdoAs` | [abrir](https://docs.google.com/spreadsheets/d/11l_f2yQbEMeQgGOimwqQemnY6eYvR3bKXxTRG7ZdoAs/edit) |
| Plantilla Google Docs | `1G5A1jNYMmdP4SZGjKDC5XDz91W9RJ2Wvci2NtMQQi44` | [abrir](https://docs.google.com/document/d/1G5A1jNYMmdP4SZGjKDC5XDz91W9RJ2Wvci2NtMQQi44/edit) |

> ⚠️ La pestaña de la hoja se llama **`Untitled`** (así la nombró la importación). Los módulos de
> Sheets apuntan a `Untitled`. Si la renombras a `Seguimiento`, actualiza el campo *Sheet Name* en
> los 5 módulos de Sheets.

## Conexiones reutilizadas
| Uso | Conexión | ID |
|-----|----------|----|
| OpenAI | My OpenAI connection | `8476276` |
| Gmail (módulo `google-email:sendAnEmail` v4) | My Gmail connection | `8532314` |
| Google Docs + Sheets | My Google connection | `8533301` |

El prompt de sistema, las reglas de precios y el prompt de usuario **ya están embebidos** en el
módulo OpenAI del escenario 1 (`gpt-4o`, `temperature 0.2`, modo JSON). El revisor interno está
puesto a `pabloypepeshopify@gmail.com`.

## ✅ Prueba end-to-end realizada
Se envió el `ejemplos/payload-webhook-reforma.json`. Resultado:
1. IA generó `presupuesto` para *Reforma de baño completo*, total **6.399,17 €** (cálculo correcto
   según reglas). 
2. Google Doc creado + PDF exportado + email de aprobación enviado con el PDF adjunto y botones.
3. Fila en Sheets: `PENDIENTE_APROBACION`.
4. Al pulsar **APROBAR** (webhook esc. 2): PDF enviado al cliente + fila actualizada a `ENVIADO`
   con fecha de envío. Página de confirmación mostrada.

## Lo único que te queda (personalización, opcional)
1. **Datos de tu empresa en la plantilla Docs**: sustituye `REEMPLAZAR_NOMBRE_EMPRESA`,
   `REEMPLAZAR_CIF`, `REEMPLAZAR_TELEFONO`, `REEMPLAZAR_EMAIL_EMPRESA` por los de la empresa cliente.
2. **Email al cliente (esc. 2, módulo 5)**: sustituye `REEMPLAZAR_NOMBRE_EMPRESA` y
   `REEMPLAZAR_TELEFONO` en el cuerpo.
3. **Conecta tu formulario** (Typeform/Tally/Forms) a la URL del webhook del escenario 1, enviando
   los campos que usa el prompt (ver `prompts/user-prompt-template.md`).
4. **Limpieza de la prueba**: en la hoja quedan varias filas de test `PENDIENTE_DATOS` y una
   `ENVIADO`; puedes borrarlas. También hay documentos de prueba en la carpeta *Generados*.

## Gotchas de Make resueltos durante el despliegue (por si editas los módulos)
Estos errores se detectaron **probando en real** y ya están corregidos en los escenarios y en los
blueprints del repo:

| Síntoma (error de ejecución) | Causa | Solución aplicada |
|------------------------------|-------|-------------------|
| `max_completion_tokens: expected an integer, but got a string` | `max_tokens` como `"4000"` (texto) | Valores numéricos: `max_tokens: 4000`, `temperature: 0.2`, `top_p: 1` |
| La IA responde `FALTAN_DATOS` con todo relleno | `{{1}}` (bundle) no serializa a JSON | Mapear campos uno a uno con `{{1.campo}}` |
| `'valueInputOption' is required but not specified` (addRow/updateRow) | Falta el parámetro avanzado | Añadido `valueInputOption: USER_ENTERED` (+ `insertDataOption`, `insertUnformatted` en addRow) |
| `Unable to parse range: 'Untitled'!id_solicitud2:...` (Search Rows) | Filtro por nombre de cabecera | Filtrar por **letra de columna** (`A`) |
| Conexión Gmail "no compatible" | Módulo `ActionSendEmail` obsoleto | Usar `google-email:sendAnEmail` v4 (param `__IMTCONN__`, `content`, `bodyType: rawHtml`) |

## Prueba rápida por consola
```bash
# Generar (esc. 1)
curl -X POST https://hook.eu1.make.com/um1aiy31btng29en6mukyff4v1puvy6c \
  -H "Content-Type: application/json" -d @ejemplos/payload-webhook-reforma.json

# Aprobar (esc. 2) — sustituye id_solicitud y doc_id por los de la fila generada
curl -G https://hook.eu1.make.com/mpt5sps3018nljuvk7n7agono48nmf6q \
  --data-urlencode "id_solicitud=..." --data-urlencode "decision=aprobar" \
  --data-urlencode "doc_id=..." --data-urlencode "cliente_email=cliente@correo.com"
```
