# Cobrador Automático de Impagos (Make.com + OpenAI)

Producto de automatización para **talleres, clínicas y academias en España**. Revisa cada día una
hoja de facturas, y para cada impago envía por **email** (fase de pruebas) un recordatorio redactado
por IA con el **tono adecuado a la antigüedad de la deuda** (amable → firme → escalado interno),
con **enlace de pago** opcional, deja **traza en la propia hoja** y manda un **resumen semanal** del
total pendiente. Todo **100 % en Make.com**, sin app propia. La salida al cliente está aislada en un
módulo para migrar a **WhatsApp/Twilio** en producción.

> Nunca automatiza la vía legal ni amenaza: el tono más firme sigue siendo profesional y cordial. A
> los 30 días escala al dueño para **decisión humana**.

---

## ✅ Estado: CREADO y PROBADO en Make (EU)

Los 2 escenarios se crearon y **verificaron de extremo a extremo con ejecuciones y emails reales**
(incluida una ejecución automática del cron). Tras la prueba quedan **desactivados** para no enviar
correos de demo; se activan al conectar la hoja real. IDs y resultados en
[`docs/06-despliegue-en-make.md`](docs/06-despliegue-en-make.md).

- Escenario 1 (Recordatorios diarios): ID `6620630`
- Escenario 2 (Resumen semanal): ID `6651592`
- Hoja demo: `1gewgNj8bkKUg4UVXR10Yv9tY3hM9knxGbBc--idPJg0` (pestaña `Untitled`)

Prueba real (hoja demo de 7 facturas): amable + firme (con enlace Stripe) + escalado interno +
revisión por datos incompletos + stop al pagar + umbral no alcanzado + fin de secuencia, y resumen
semanal **1.454,90 € · 6 facturas**.

---

## 📦 Contenido

```
cobrador-impagos/
  blueprints/
    01-recordatorios-diarios.blueprint.json   Escenario 1 (cron diario, Router 4 rutas)
    02-resumen-semanal.blueprint.json         Escenario 2 (cron semanal, agregador + IA)
  prompts/
    system-prompt-recordatorios.md            System prompt de los 3 tonos
    system-prompt-resumen-semanal.md          System prompt del resumen
    prompts-usuario.md                        Prompts de usuario por ruta (con FASE)
  docs/
    01-arquitectura.md                        Módulo por módulo
    02-google-sheets.md                       Estructura de columnas de la hoja
    03-router-y-dias-impago.md                Cálculo de días + lógica del Router + anti-duplicado
    04-stop-al-pagar.md                       Cómo se detiene la secuencia al marcar PAGADO
    05-datos-insuficientes.md                 Falta email / estado ambiguo → revisión humana
    06-despliegue-en-make.md                  IDs reales, prueba realizada y gotchas resueltos
    07-checklist-post-importacion.md          Configuración manual tras importar
    08-migracion-whatsapp-stripe.md           Salida por WhatsApp/Twilio y cobro Stripe/Bizum
  ejemplos/
    facturas-demo.csv                         Datos de prueba (7 facturas, todos los casos)
```

---

## ✅ Respuesta a los 8 puntos pedidos

| # | Pedido | Dónde |
|---|--------|-------|
| 1 | Arquitectura completa, módulo por módulo | [`docs/01-arquitectura.md`](docs/01-arquitectura.md) |
| 2 | System prompt exacto de los 3 tonos | [`prompts/system-prompt-recordatorios.md`](prompts/system-prompt-recordatorios.md) · [`prompts/prompts-usuario.md`](prompts/prompts-usuario.md) |
| 3 | Lógica del Router y cálculo de días de impago (anti-duplicado) | [`docs/03-router-y-dias-impago.md`](docs/03-router-y-dias-impago.md) |
| 4 | Estructura de columnas de la hoja | [`docs/02-google-sheets.md`](docs/02-google-sheets.md) |
| 5 | Detener la secuencia al marcar PAGADO | [`docs/04-stop-al-pagar.md`](docs/04-stop-al-pagar.md) |
| 6 | Datos ausentes/ambiguos → revisión humana (no inventar) | [`docs/05-datos-insuficientes.md`](docs/05-datos-insuficientes.md) |
| 7 | JSON del blueprint (con partes a completar señaladas) | [`blueprints/`](blueprints/) |
| 8 | Checklist de configuración manual post-importación | [`docs/07-checklist-post-importacion.md`](docs/07-checklist-post-importacion.md) |

---

## 🧭 Flujo en una imagen

```
              GOOGLE SHEETS (facturas)
                       │  cron diario
                       ▼
   Search Rows (estado=PENDIENTE) ──► Set Vars (dias_impago) ──► ROUTER
                                                                   │
   sin email ──► aviso interno + REVISION_MANUAL                   │
   nivel0 & ≥7d  ──► IA AMABLE  → cliente → nivel=1                │
   nivel1 & ≥15d ──► IA FIRME   → cliente (+enlace) → nivel=2      │
   nivel2 & ≥30d ──► IA ESCALADO→ dueño (decisión humana) → nivel=3│
   PAGADO ──► (excluida en origen: no se envía nada)

              GOOGLE SHEETS (facturas)
                       │  cron semanal
                       ▼
   Search Rows (≠PAGADO) ─► Aggregator (total, nº, líneas) ─► IA resumen ─► email al dueño
```

---

## ⚠️ Detalle técnico clave (por qué las referencias son `` {{1.`N`}} ``)

El módulo *Search Rows* creado por API expone las columnas **por índice base-0** (`` {{1.`0`}} `` =
`id_factura`, `` {{1.`2`}} `` = `cliente_email`, …), **no** por nombre de cabecera. Por eso **el orden
de columnas de la hoja debe respetarse** (ver `docs/02`). Este y otros *gotchas* (rango `A1:Z1`,
comparación con vacío en filtros) están documentados en `docs/06` y ya resueltos en los blueprints.

## 🔒 Responsabilidad

- Nunca se automatiza la vía legal ni se amenaza; a los 30 días la decisión es **siempre humana**.
- La IA **no inventa** datos: si faltan (email/estado), la factura va a `REVISION_MANUAL`.
