# 07 · Checklist de configuración manual (tras importar los blueprints)

Todo lo que **no** se puede pre-rellenar en el JSON está marcado con `REEMPLAZAR_*` (textos) o `0`
(IDs de conexión `__IMTCONN__`). Repasa esta lista tras importar.

## A. Conexiones (OAuth / API) — se asignan en cada módulo

- [ ] **Google (Sheets)** — conexión `google` con permiso de Sheets. Asignar en los **5 módulos**
      Google Sheets (Escenario 1: módulos 1, 5, 8, 11, 14 · Escenario 2: módulo 1).
- [ ] **Gmail** — módulo `google-email:sendAnEmail` v4. Asignar en los módulos de envío
      (Escenario 1: 4, 7, 10, 13 · Escenario 2: 5).
- [ ] **OpenAI** — API key. Asignar en los módulos OpenAI (Escenario 1: 6, 9, 12 · Escenario 2: 4).

> En Make, `__IMTCONN__` no se pega a mano: se elige la conexión en el desplegable de cada módulo.

## B. Hoja de Google Sheets

- [ ] Crear la hoja con las **12 columnas en orden** (ver `docs/02`), cabeceras en la fila 1.
- [ ] Copiar su **Spreadsheet ID** (de la URL) y sustituir **`REEMPLAZAR_SPREADSHEET_ID`** en los 5
      módulos de Sheets de ambos escenarios.
- [ ] Poner el **nombre real de la pestaña** en **`REEMPLAZAR_NOMBRE_PESTANA`** (campo *Sheet Name*)
      en esos 5 módulos.
- [ ] Comprobar que `fecha_emision` está en formato **`AAAA-MM-DD`**.

## C. Prompts de OpenAI

- [ ] Pegar el **system prompt** de `prompts/system-prompt-recordatorios.md` en los 3 módulos
      OpenAI del Escenario 1 (rutas amable/firme/escalado).
- [ ] Pegar el **system prompt** de `prompts/system-prompt-resumen-semanal.md` en el módulo OpenAI
      del Escenario 2.
- [ ] En los prompts de usuario, sustituir **`REEMPLAZAR_NOMBRE_EMPRESA`** por el nombre de la
      empresa que firma los emails.

## D. Emails internos

- [ ] Sustituir **`REEMPLAZAR_EMAIL_INTERNO@tu-empresa.com`** por el email del responsable en:
      Escenario 1 módulos **4** (aviso sin datos) y **13** (escalado), y Escenario 2 módulo **5**.
- [ ] (Los recordatorios al cliente ya usan `` {{1.`2`}} `` = columna email; no tocar.)

## E. Programación (cron)

- [ ] **Escenario 1**: *Scheduling* = diario. Recomendado L–V a una hora fija (p. ej. 08:00). El
      blueprint trae `indefinitely` cada 86400 s restringido a L–V 08:00–20:00; ajusta la ventana a
      tu gusto en el reloj del escenario.
- [ ] **Escenario 2**: *Scheduling* = semanal. El blueprint trae `indefinitely` cada 604800 s; si lo
      quieres fijo (p. ej. lunes 09:00), configúralo en el reloj del escenario.

## F. Umbrales de días (opcional)

- [ ] Ajustar los umbrales `7 / 15 / 30` en los filtros de las rutas del Router (Escenario 1) si tu
      política de cobro es distinta (ver `docs/03`).

## G. Permisos y prueba

- [ ] La cuenta Google de la conexión debe tener acceso de **edición** a la hoja.
- [ ] Meter **una factura de prueba** vencida con tu propio email en `cliente_email` y `estado_pago
      = PENDIENTE`, `nivel_escalado = 0`, `fecha_emision` de hace >7 días.
- [ ] **Activar** el Escenario 1 y ejecutarlo una vez (*Run once*). Verificar que llega el email y
      que la fila pasa a `nivel_escalado = 1` con `fecha_ultimo_recordatorio` = hoy.
- [ ] **Activar** el Escenario 2 y ejecutarlo una vez. Verificar el email de resumen con el total.
- [ ] Marcar la factura de prueba como `PAGADO` y volver a ejecutar: no debe enviarse nada.

## H. Producción (cuando dejes la fase de pruebas por email)

- [ ] Sustituir los módulos de **envío al cliente** (Escenario 1: 7 y 10) por WhatsApp Business/
      Twilio, usando `` {{1.`3`}} `` (teléfono). Ver `docs/08`. Los avisos internos pueden seguir por
      email.
