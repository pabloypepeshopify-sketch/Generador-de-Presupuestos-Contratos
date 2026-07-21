# 06 · Despliegue real en Make (CREADO y PROBADO)

Los dos escenarios se **crearon, ejecutaron y verificaron de extremo a extremo** en la cuenta de
Make (org `My Organization`, team `My Team` id `1998941`, zona `eu1`), con emails reales y la hoja
de Google real. Tras verificarlos quedan **desactivados** para no llenar la bandeja con datos de
demo: se activan cuando conectes tu hoja real (ver `docs/07`).

## Escenarios

| Escenario | ID | Programación | Estado |
|-----------|----|--------------|--------|
| 1 · Recordatorios diarios | **6620630** | `indefinitely` cada 86400 s, restringido L–V 08:00–20:00 | Verificado · **desactivado** |
| 2 · Resumen semanal | **6651592** | `indefinitely` cada 604800 s (7 días) | Verificado · **desactivado** |

## Activos de Google

| Activo | ID / valor |
|--------|-----------|
| Hoja de facturas (demo) | `1gewgNj8bkKUg4UVXR10Yv9tY3hM9knxGbBc--idPJg0` · pestaña **`Untitled`** |

> ⚠️ La pestaña se llama **`Untitled`** (así la nombró la creación desde CSV). Los 5 módulos de
> Sheets apuntan a `Untitled`. Si la renombras, actualiza el campo *Sheet Name* en los 5 módulos.

## Conexiones reutilizadas

| Uso | Conexión | ID |
|-----|----------|----|
| OpenAI | My OpenAI connection | `8476276` |
| Gmail (`google-email:sendAnEmail` v4) | My Gmail connection | `8532314` |
| Google Sheets (`google`) | My Google connection | `8533301` |
| *(disponible para producción)* Twilio | My Twilio connection | `8476771` |

El responsable interno está puesto a `pabloypepeshopify@gmail.com` y la empresa de la demo firma
como **"Taller Mecánico El Ejemplo"** (sustituibles).

## ✅ Prueba end-to-end realizada

Hoja demo con 7 facturas cubriendo todos los casos. Ejecuciones reales (incluida una **automática
del cron diario**):

| Factura | Situación | Resultado | Comprueba |
|---------|-----------|-----------|-----------|
| F-2026-001 | email, 35–37 d, nivel 0 | AMABLE (día 1) → FIRME (día 2, con enlace Stripe) | recordatorios 1 y 2 + progresión diaria |
| F-2026-002 | **sin email** | aviso interno + `REVISION_MANUAL` | datos insuficientes |
| F-2026-003 | `PAGADO` | intacta, nunca procesada | stop al pagar |
| F-2026-004 | 2–4 d | intacta | umbral (7 d) no alcanzado |
| F-2026-005 | nivel 1 | FIRME → ESCALADO | firme + escalado |
| F-2026-006 | nivel 2 | ESCALADO interno → no-op | escalado + fin de secuencia |
| F-2026-007 | nivel 3 | intacta | secuencia ya detenida |

**Contenido de los emails (IA):**
- *Amable*: cordial, asume buena fe.
- *Firme*: profesional, pide fecha concreta, **incluye el enlace de pago** como botón, sin amenazas
  ni menciones legales.
- *Escalado interno*: nota al responsable con resumen del caso; indica **expresamente** que el
  sistema no enviará más recordatorios y que cualquier vía adicional queda en manos humanas.
- *Resumen semanal*: **Total pendiente 1.454,90 € · 6 facturas** (total calculado por Make),
  agrupado por mayor importe / más antiguas / en revisión manual, con recomendación accionable.

## Gotchas de Make resueltos durante la construcción (léelos si editas los módulos)

| Síntoma | Causa | Solución aplicada |
|---------|-------|-------------------|
| Todas las filas iban a `REVISION_MANUAL`, incluso con email | `{{1.cliente_email}}` (por nombre de cabecera) devolvía **vacío** en un *Search Rows* creado por API | **Direccionar columnas por índice base-0** con backticks: `` {{1.`2`}} `` = email, `` {{1.`0`}} `` = id, etc. |
| Cabeceras no reconocidas | `tableFirstRow` puesto a `"A1:L1"` (**valor no válido**) | Usar un valor del enum: **`"A1:Z1"`** |
| `if(length(trim(...)) > 0; ...)` siempre daba el else | operador infijo `>` poco fiable vía blueprint | Sustituido por comparación de filtro contra cadena vacía (`text:equal ""` / `text:notequal ""`) |
| `limit` rechazado | `"200"` (texto) | numérico: `limit: 200` |
| `Scenario is not activated` al ejecutar on-demand | escenario recién creado está inactivo | `scenarios_activate` antes de `scenarios_run` |
| `updateRow` "borraba" columnas que en realidad conservaba | valores vacíos/indefinidos no sobrescriben la celda | mapear **todas** las columnas 0–11 con su índice para reescribir la fila completa |

> Estos ajustes ya están aplicados en los blueprints de `blueprints/`.
