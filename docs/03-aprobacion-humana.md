# 03 · Aprobación humana antes de enviar al cliente

**Regla de oro:** ningún documento generado por IA se envía al cliente sin que una persona lo
revise y apruebe. Esto es especialmente crítico en el sector legal (borradores que deben validar
un profesional colegiado) y protege frente a errores de importe o cláusulas en reformas.

## ¿Qué partes requieren aprobación?

| Fase del flujo                         | ¿Aprobación humana? |
|----------------------------------------|:-------------------:|
| Recepción de datos (webhook)           | No                  |
| Redacción IA + cálculo de partidas     | No (automático)     |
| Generación de Google Doc + PDF         | No (automático)     |
| **Envío del PDF al cliente**           | **SÍ — obligatorio**|
| Registro en Sheets                     | No                  |

## Cómo se implementa en Make (patrón de 2 escenarios)

Make **no tiene un módulo nativo de "aprobación"**, así que se implementa con el patrón
**"enlaces mágicos de aprobación"**, robusto y sin apps propias:

1. **Escenario 1** genera el PDF y **NO lo envía al cliente**. En su lugar:
   - Sube el PDF a Drive (obtiene `pdf_id`).
   - Envía un **email interno al revisor** (módulo 11) con:
     - el PDF adjunto para revisarlo,
     - dos botones/enlaces HTML:
       - **✅ APROBAR Y ENVIAR** → `https://hook.eu1.make.com/<HOOK_APROBACION>?id_solicitud=...&decision=aprobar&pdf_id=...&cliente_email=...`
       - **❌ RECHAZAR** → el mismo enlace con `decision=rechazar`.
   - Marca la fila en Sheets como `PENDIENTE_APROBACION`.

2. El revisor abre el email, comprueba el PDF y **pulsa un botón**. Eso hace una petición GET al
   **webhook del Escenario 2**.

3. **Escenario 2** recibe la decisión:
   - `aprobar` → descarga el PDF y lo **envía al cliente** (Gmail; en producción WhatsApp) → Sheets `ENVIADO`.
   - `rechazar` → Sheets `RECHAZADO` + aviso interno.
   - Responde al navegador con una página HTML de confirmación (módulo *Webhook Response*).

```
Esc.1 [11] Email al revisor ──(pulsa botón)──► Esc.2 [1] Webhook ──► envía o descarta
```

### Ventajas de este patrón
- **Cero riesgo** de envío automático al cliente.
- Funciona desde el móvil (el revisor aprueba desde el correo).
- Desacoplado: si el escenario 2 falla, el 1 ya dejó todo registrado.
- El "punto de envío al cliente" queda aislado en un módulo → fácil de cambiar a WhatsApp.

## Alternativas (según preferencia del cliente)

| Alternativa | Cómo | Cuándo usarla |
|-------------|------|---------------|
| **Router + enlaces mágicos** (elegida) | 2 escenarios + webhook de decisión | Recomendada. Simple y a prueba de fallos. |
| **Make "Approval" / Incomplete executions** | Activar `Allow storing of incomplete executions` y reanudar manualmente desde el panel de Make | Si el revisor trabaja siempre dentro de Make. Menos cómodo desde móvil. |
| **Herramienta de firma (fase 2)** | Signaturit/Sign0/DocuSign entre aprobación y cliente | Cuando quieras firma electrónica integrada. |
| **Doble aprobación (legal)** | Añadir un segundo revisor en cadena (2 emails secuenciales) | Despachos que exijan validación de socio + colegiado. |

## Seguridad del webhook de aprobación
- El `id_solicitud` incluye timestamp; considera añadir un **token aleatorio** por solicitud
  (genera un `token` en el módulo *Set Variables* del escenario 1 y valídalo en el escenario 2 con
  un *Filter*) para que los enlaces no sean adivinables.
- No incluyas datos sensibles del cliente en la URL más allá de lo imprescindible.
