# 08 · Migración a WhatsApp/Twilio y cobro con Stripe/Bizum

## De Gmail (pruebas) a WhatsApp/Twilio (producción)

El envío al **cliente** está aislado en dos módulos del Escenario 1: **7** (amable) y **10** (firme).
Migrar = sustituir esos dos módulos; **el resto del flujo no cambia** (Router, IA, Sheets).

1. Añade la conexión de salida:
   - **Twilio** (`My Twilio connection` ya existe, id `8476771`) → *Send a Message* (WhatsApp/SMS), o
   - **WhatsApp Business Cloud** → *Send a Message* con una **plantilla aprobada**.
2. En cada módulo nuevo mapea:
   - Destinatario: `` {{1.`3`}} `` (columna `cliente_telefono`, en formato E.164, p. ej. `+34600123123`).
   - Cuerpo: el mismo `{{6.result}}` / `{{9.result}}` de la IA (usa texto plano si el canal no admite
     HTML; puedes pedir a la IA salida en texto quitando las etiquetas del system prompt).
3. Añade la comprobación de **teléfono vacío** igual que la de email (ver `docs/05`): si
   `` {{1.`3`}} `` está vacío, a `REVISION_MANUAL` en vez de intentar el envío.
4. Los **avisos internos** (módulos 4 y 13) y el **resumen semanal** pueden seguir por Gmail.

> WhatsApp Business exige **plantillas pre-aprobadas** para iniciar conversación. Para recordatorios
> de pago, registra plantillas de "recordatorio de factura" con variables (nombre, importe, enlace) y
> deja que la IA rellene solo los huecos permitidos, o usa la plantilla tal cual con variables mapeadas.

## Cobro con enlace Stripe/Bizum (opcional)

- **Ya soportado hoy**: si la columna `enlace_pago` (K) trae un enlace, la IA lo incluye como botón
  en los recordatorios **amable** y **firme**. Basta con rellenar esa columna (manual o desde tu
  facturación).
- **Generación automática del enlace** (ampliación): antes de la rama de envío, añade un módulo
  **Stripe → Create a Payment Link** con el `importe` y el `concepto`, y usa su salida como
  `enlace_pago`. Requiere la clave secreta de Stripe (no se puede pre-rellenar en el blueprint).
- **Conciliación (marcar `PAGADO` solo)**: un escenario aparte con **Stripe → Watch Payments** (o
  conciliación bancaria) que busque la factura por importe/referencia y ponga `estado_pago = PAGADO`.
  Con eso, la secuencia de recordatorios se detiene sola (ver `docs/04`).

## Otras ampliaciones sugeridas

- **Panel de morosidad histórica**: hoja/tab adicional o Looker Studio sobre la misma hoja,
  alimentado por el `nivel_escalado` y las fechas.
- **Cobro en un clic desde el propio mensaje**: enlace de pago prellenado + webhook de Stripe que
  actualiza la hoja al confirmarse el pago.
