# 04 · Cómo se detiene la secuencia al marcar la factura como pagada

## Mecanismo

El módulo **Search Rows** del Escenario 1 filtra **en origen** por `estado_pago = PENDIENTE`
(columna `H`). En cuanto una factura se marca **`PAGADO`**:

- deja de ser devuelta por *Search Rows* → **no entra en el flujo**;
- por tanto **no llega al Router** ni a ningún módulo de envío;
- **no se envía ningún mensaje de más**, ni ese día ni los siguientes.

No hace falta ninguna acción de "cancelación": basta con que alguien (o la API de Stripe/banco)
ponga `PAGADO` en la columna `H`. El efecto es inmediato en la siguiente ejecución del cron.

```
estado_pago = PAGADO  ─►  Search Rows la excluye  ─►  fila invisible para el flujo  ─►  0 recordatorios
```

## Cómo marcar el pago

- **Manual**: escribir `PAGADO` en la columna `estado_pago` de esa fila.
- **Semiautomático (opcional)**: un escenario aparte (Stripe *Watch Payments* / conciliación
  bancaria) que busque la factura por `id_factura` o importe y ponga `PAGADO`. No incluido en este
  paquete; es una ampliación (ver `docs/08`).

## Detalle importante sobre el momento del cobro

- Si el pago se registra **el mismo día** en que iba a salir un recordatorio: siempre que `PAGADO`
  esté puesto **antes** de que corra el cron, no se envía nada. Si el cron ya había corrido esa
  mañana, el recordatorio de ese día ya habría salido; a partir del día siguiente, cero.
- Una factura ya **escalada** (`nivel_escalado = 3`) tampoco recibe más automatismos aunque siga
  `PENDIENTE`; marcarla `PAGADO` es igualmente la forma de cerrarla.

## Verificado en Make

En la prueba real, la factura `F-2026-003` con `estado_pago = PAGADO` **nunca fue procesada** en
ninguna ejecución (ni recordatorio, ni cambios en su fila), mientras el resto de facturas
`PENDIENTE` sí avanzaban. El resumen semanal tampoco la contó en el total pendiente.
