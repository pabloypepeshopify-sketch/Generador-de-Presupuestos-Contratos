# 05 · Datos insuficientes o ambiguos → revisión humana (nunca inventar)

Principio: **si algo no está claro, el sistema NO asume ni inventa; lo marca para revisión humana.**

## Caso 1 — Falta el email de contacto

Es la primera rama del Router (tiene prioridad sobre los recordatorios):

- **Condición**: `` {{1.`2`}} `` (columna `cliente_email`) está **vacía**.
- **Acción**:
  1. Se envía un **aviso interno** al responsable ("Factura X sin datos de contacto").
  2. Se marca `estado_pago = REVISION_MANUAL` y se anota el motivo en `notas`.
- **Efecto**: como pasa a `REVISION_MANUAL`, *Search Rows* (que solo trae `PENDIENTE`) **deja de
  devolverla** → no se intenta ningún recordatorio hasta que un humano complete el email y la
  vuelva a poner `PENDIENTE`. **Nunca se envía un recordatorio a un destinatario inventado.**

> El teléfono vacío no bloquea la fase de pruebas (el canal es email). Cuando se migre a
> WhatsApp/Twilio, replicar la misma comprobación sobre `` {{1.`3`}} `` (columna `cliente_telefono`).
> Ver `docs/08`.

## Caso 2 — Estado de pago ambiguo o desconocido

El flujo solo actúa sobre valores **explícitos**:

- `PENDIENTE` → entra en el ciclo de recordatorios.
- `PAGADO` → excluida (secuencia detenida, `docs/04`).
- `REVISION_MANUAL` → excluida (a la espera de una persona).
- **Cualquier otro valor** (vacío, `?`, texto raro, `PARCIAL`, etc.) **no es `PENDIENTE`**, así que
  *Search Rows* **no lo devuelve** y el flujo **no lo toca**. No se asume que esté pagado ni
  impagado: simplemente **no se automatiza** hasta que un humano normalice el estado.

Recomendación operativa: revisar periódicamente las filas cuyo `estado_pago` no sea uno de los tres
valores canónicos (se pueden localizar con un filtro en la propia hoja).

## Caso 3 — La IA no debe rellenar huecos

El system prompt prohíbe expresamente inventar datos: si no hay `enlace_pago`, la IA **no** lo
menciona ni fabrica un enlace. Los importes y fechas se toman **tal cual** de la hoja.

## Verificado en Make

La factura `F-2026-002` (sin email) generó el aviso interno y quedó en `REVISION_MANUAL`; **no se
le envió ningún recordatorio**. En ejecuciones posteriores siguió excluida por su estado.
