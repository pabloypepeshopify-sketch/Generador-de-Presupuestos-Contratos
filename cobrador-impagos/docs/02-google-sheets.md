# 02 · Estructura de la hoja de Google Sheets

Una sola pestaña con **cabeceras en la fila 1** y las facturas a partir de la fila 2. El orden de
las columnas **es importante**: los escenarios direccionan cada columna por **posición** (índice
base-0), no por el texto de la cabecera (ver nota técnica abajo).

| Col | Índice | Cabecera | Contenido | Ejemplo |
|-----|--------|----------|-----------|---------|
| A | `` `0` `` | `id_factura` | Identificador único de la factura | `F-2026-001` |
| B | `` `1` `` | `cliente_nombre` | Nombre del cliente | `Taller Hermanos Ruiz` |
| C | `` `2` `` | `cliente_email` | Email de contacto (destino del recordatorio) | `cliente@correo.com` |
| D | `` `3` `` | `cliente_telefono` | Teléfono (para futura fase WhatsApp) | `600123123` |
| E | `` `4` `` | `fecha_emision` | Fecha de emisión **en formato `AAAA-MM-DD`** | `2026-06-14` |
| F | `` `5` `` | `importe` | Importe pendiente (número; punto o coma decimal) | `450.00` |
| G | `` `6` `` | `concepto` | Servicio prestado | `Cambio de embrague` |
| H | `` `7` `` | `estado_pago` | `PENDIENTE` · `PAGADO` · `REVISION_MANUAL` | `PENDIENTE` |
| I | `` `8` `` | `fecha_ultimo_recordatorio` | Fecha del último recordatorio (la rellena el flujo) | `2026-07-21` |
| J | `` `9` `` | `nivel_escalado` | `0` ninguno · `1` amable · `2` firme · `3` escalado | `0` |
| K | `` `10` `` | `enlace_pago` | Enlace Stripe/Bizum (opcional) | `https://buy.stripe.com/...` |
| L | `` `11` `` | `notas` | Traza automática / motivo de revisión | `Recordatorio amable enviado 2026-07-21` |

CSV de cabecera listo para copiar (la primera fila):

```csv
id_factura,cliente_nombre,cliente_email,cliente_telefono,fecha_emision,importe,concepto,estado_pago,fecha_ultimo_recordatorio,nivel_escalado,enlace_pago,notas
```

## Columnas que **rellena el humano** vs. las que **rellena el flujo**

- **Humano** (o un flujo aguas arriba, p. ej. tu facturación): `id_factura`, `cliente_nombre`,
  `cliente_email`, `cliente_telefono`, `fecha_emision`, `importe`, `concepto`, `enlace_pago`.
  Y **marcar `estado_pago = PAGADO`** cuando se cobre.
- **El flujo** (automático): `estado_pago` (a `REVISION_MANUAL` si faltan datos),
  `fecha_ultimo_recordatorio`, `nivel_escalado`, `notas`.
- **Valores iniciales de una factura nueva**: `estado_pago = PENDIENTE`, `nivel_escalado = 0`,
  `fecha_ultimo_recordatorio` y `notas` vacíos.

## Notas técnicas importantes

- **`fecha_emision` en `AAAA-MM-DD`**: el cálculo de días usa `parseDate(...; "YYYY-MM-DD")`. Si
  cambias el formato, actualiza esa fórmula en los módulos *Set Variables* (`docs/03`).
- **Direccionamiento por índice (`` {{1.`2`}} ``)**: cuando el módulo *Search Rows* se crea vía
  blueprint/API, Make expone las columnas por **índice base-0 entre backticks**, no por el nombre de
  la cabecera (`{{1.cliente_email}}` devolvería vacío). Por eso **el orden de columnas debe
  respetarse**. Si insertas/mueves columnas, reajusta los índices en los blueprints.
- **`estado_pago` es la clave del filtro**: el Escenario 1 solo procesa `PENDIENTE`; el Escenario 2,
  todo lo que **no** sea `PAGADO`.
