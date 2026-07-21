# 01 · Arquitectura (módulo por módulo)

Dos escenarios de Make, ambos programados por **cron** (sin webhook). Toda la salida al cliente
está aislada en un único módulo Gmail por rama, sustituible por WhatsApp/Twilio en producción.

```
                          GOOGLE SHEETS (facturas)
                                   │
        ┌──────────────────────────┴───────────────────────────┐
        ▼                                                        ▼
┌───────────────────────────────────────┐        ┌──────────────────────────────┐
│ ESCENARIO 1 — Recordatorios diarios    │        │ ESCENARIO 2 — Resumen semanal │
│ (cron diario)                          │        │ (cron semanal)               │
│                                        │        │                              │
│ [1] Search Rows (estado=PENDIENTE)     │        │ [1] Search Rows (≠ PAGADO)   │
│         │ (una fila por bundle)        │        │      │                        │
│ [2] Set Variables: dias_impago, hoy    │        │ [2] Set Var: dias_impago     │
│         │                              │        │      │                        │
│ [3] Router (por antigüedad + nivel)    │        │ [3] Array Aggregator         │
│    ├─ sin email → [4] Gmail interno     │        │      │  (total, nº, líneas)   │
│    │              [5] Sheets REVISION   │        │ [4] OpenAI (redacta resumen) │
│    ├─ AMABLE  → [6] OpenAI [7] Gmail     │        │ [5] Gmail interno al dueño   │
│    │            [8] Sheets nivel=1       │        └──────────────────────────────┘
│    ├─ FIRME   → [9] OpenAI [10] Gmail    │
│    │            [11] Sheets nivel=2      │
│    └─ ESCAL.  → [12] OpenAI [13] Gmail   │
│                 [14] Sheets nivel=3      │
└────────────────────────────────────────┘
```

---

## ESCENARIO 1 — `blueprints/01-recordatorios-diarios.blueprint.json`

| # | Módulo (identificador real) | Propósito |
|---|-----------------------------|-----------|
| **1** | **Google Sheets → Search Rows** `google-sheets:filterRows` (v2) | **Disparador**. El cron diario lo ejecuta y devuelve **una fila (bundle) por cada factura con `estado_pago = PENDIENTE`** (filtro por letra de columna `H`). Las `PAGADO` y `REVISION_MANUAL` quedan fuera de origen → no se procesan. |
| **2** | **Tools → Set multiple variables** `util:SetVariables` | Calcula por fila: `dias_impago` = días desde `fecha_emision` hasta hoy, y `hoy` = fecha actual `YYYY-MM-DD`. Ver `docs/03`. |
| **3** | **Flow Control → Router** `builtin:BasicRouter` | Bifurca por **antigüedad de la deuda + nivel de escalado + presencia de email**. Cada ruta lleva su **filtro** (condiciones AND). Ver `docs/03`. |
| **4** | **Gmail → Send an email** `google-email:sendAnEmail` (v4) | *(Ruta sin email)* Aviso **interno** al responsable: la factura no tiene email de contacto. No se escribe al cliente. |
| **5** | **Google Sheets → Update a Row** `google-sheets:updateRow` (v2) | *(Ruta sin email)* Marca `estado_pago = REVISION_MANUAL` y anota el motivo en `notas`. |
| **6** | **OpenAI → Create a Completion** `openai-gpt-3:CreateCompletion` | *(Ruta AMABLE)* Redacta el **1.er recordatorio** (tono cordial). `gpt-4o`, `temperature 0.5`. Salida `{{6.result}}`. |
| **7** | **Gmail → Send an email** (v4) | *(AMABLE)* Envía el recordatorio **al cliente** (`{{1.`2`}}`). |
| **8** | **Google Sheets → Update a Row** (v2) | *(AMABLE)* `nivel_escalado = 1`, `fecha_ultimo_recordatorio = hoy`, traza en `notas`. |
| **9** | **OpenAI → Create a Completion** | *(Ruta FIRME)* Redacta el **2.º recordatorio** (tono firme, con enlace de pago si existe). |
| **10** | **Gmail → Send an email** (v4) | *(FIRME)* Envía al cliente. |
| **11** | **Google Sheets → Update a Row** (v2) | *(FIRME)* `nivel_escalado = 2`, `fecha_ultimo_recordatorio = hoy`. |
| **12** | **OpenAI → Create a Completion** | *(Ruta ESCALADO)* Redacta la **nota interna** al responsable (resume el caso, pide decisión humana). |
| **13** | **Gmail → Send an email** (v4) | *(ESCALADO)* Envía al **responsable interno** (no al cliente). |
| **14** | **Google Sheets → Update a Row** (v2) | *(ESCALADO)* `nivel_escalado = 3`. A partir de aquí ninguna ruta vuelve a disparar → **secuencia detenida**. |

> **Nota sobre `search` como primer módulo**: al ser un módulo de acción (no webhook), Make trata el
> escenario como **programado**. La programación (cron) se configura a nivel de escenario, no como
> módulo aparte. Ver `docs/07`.

---

## ESCENARIO 2 — `blueprints/02-resumen-semanal.blueprint.json`

| # | Módulo | Propósito |
|---|--------|-----------|
| **1** | **Google Sheets → Search Rows** (v2) | Devuelve todas las facturas **no pagadas** (`estado_pago ≠ PAGADO`, incluye `PENDIENTE` y `REVISION_MANUAL`). |
| **2** | **Set Variables** | `dias_impago` por fila (para el detalle del resumen). |
| **3** | **Flow Control → Array aggregator** `builtin:BasicAggregator` | Colapsa todas las filas en **un array** con `importe` y una `linea` pre-formateada por factura (`feeder = 1`). |
| **4** | **OpenAI → Create a Completion** | Redacta el resumen. Recibe **total y nº ya calculados por Make** (`sum(map(...))`, `length(...)`), solo redacta. |
| **5** | **Gmail → Send an email** (v4) | Envía el resumen **al responsable** con el total en el asunto. |

---

## Decisiones de diseño

- **Cron, no webhook**: el disparador es una revisión diaria/semanal de la hoja (spec del producto).
- **Máquina de estados en `nivel_escalado` (0→1→2→3)**: garantiza la progresión amable→firme→escalado
  y **evita reenvíos** (una fase se envía una sola vez). Ver `docs/03`.
- **Filtrado en origen (`Search Rows`)**: al no devolver las `PAGADO`, la secuencia se **detiene sola**
  en cuanto se marca el pago (`docs/04`), y se ahorran operaciones.
- **Salida sustituible**: cambiar de Gmail a WhatsApp/Twilio = cambiar los módulos de envío
  (7/10/13). Ver `docs/08`.
- **Total del resumen calculado en Make** (no por la IA): evita errores aritméticos.
