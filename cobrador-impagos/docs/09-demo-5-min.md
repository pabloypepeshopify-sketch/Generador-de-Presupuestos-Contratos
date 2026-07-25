# 09 · Guion de la demo de 5 minutos

Objetivo: enseñar en vivo cómo una "factura vencida" ficticia dispara sola el recordatorio. Con la
hoja de ejemplo, **una sola ejecución** muestra los 3 tonos + la salvaguarda de datos incompletos.

## Preparación (una vez, ~2 min)

1. Sube **`ejemplos/facturas-demo.csv`** a Google Drive (Drive lo convierte en hoja de cálculo).
   Sus fechas están en el pasado, así que **sirve siempre** sin tocar nada.
2. Copia el **Spreadsheet ID** (de la URL) y ponlo (más el nombre de la pestaña) en los 5 módulos de
   Sheets del **Escenario 1** (ver `docs/07`, secciones B). Asigna las 3 conexiones si aún no lo has
   hecho.
3. En `ejemplos/facturas-demo.csv`, cambia el email de la fila **F-2026-001** por **tu propio email**
   (para recibir el recordatorio en directo delante del cliente). Opcional: cámbialo también en
   F-2026-005 y F-2026-006.
4. **Activa** el Escenario 1.

## En directo (~3 min)

1. Enseña la hoja: 7 "facturas", una claramente vencida (F-2026-001, ~35 días, sin recordar).
2. Pulsa **Run once** en el Escenario 1 (o espera al cron). Explica que en real corre solo cada día.
3. Abre tu bandeja: en segundos llegan
   - **Recordatorio amable** (F-2026-001) — cordial, con enlace de pago.
   - **2.º aviso firme** (F-2026-005) — más serio, pide fecha concreta.
   - **[ACCIÓN] escalado interno** (F-2026-006) — nota al dueño para decisión humana.
   - **[REVISION]** (F-2026-002) — la que no tiene email: **no se le escribe**, se marca para revisar.
4. Vuelve a la hoja: se han actualizado solas `nivel_escalado`, `fecha_ultimo_recordatorio` y `notas`
   (trazabilidad).
5. Marca una factura como **PAGADO** y pulsa Run once otra vez: **no se envía nada** a esa. "El día
   que cobras, deja de perseguir sola."
6. (Opcional) Ejecuta el **Escenario 2**: llega el **resumen semanal** con el total pendiente.

## Mensajes de venta

- "Es dinero ya ganado que se recupera **sin que nadie tenga que perseguir a nadie**."
- "El tono lo pone la IA según lo que se debe y desde cuándo; **a los 30 días decides tú**, nunca hay
  vía legal automática."
- "Todo queda **registrado en tu propia hoja**; los lunes recibes el total pendiente."

## Notas

- Para repetir la demo desde cero, vuelve a subir el CSV (crea una hoja nueva) o pon a mano las filas
  a `estado_pago = PENDIENTE`, `nivel_escalado = 0`, `fecha_ultimo_recordatorio` vacío.
- La guardia "una vez al día" hace que, si pulsas Run once dos veces seguidas, **no** se duplique el
  envío (ver `docs/03`).
