# 08 · Migración de la salida: Gmail → WhatsApp / Twilio

La fase de pruebas usa **Gmail** como canal de salida. Todo el "hacia la persona" está aislado en
los módulos de email: **#7, #13, #19, #20, #21**. Migrar a WhatsApp = sustituir esos módulos; **el
resto del flujo (extracción, IA, semáforo, informe, Sheets) no cambia**.

## Qué se sustituye
| Módulo actual (Gmail) | Rol | Reemplazo en producción |
|-----------------------|-----|-------------------------|
| #19 / #20 / #21 | Informe VERDE/ÁMBAR/ROJO al responsable | WhatsApp Business API o Twilio |
| #21 (CC legal) | Copia al asesor en ROJO | 2.º mensaje WhatsApp al número del legal |
| #7 / #13 | Avisos de revisión manual | Mensaje WhatsApp de aviso |

## Opción A · WhatsApp Business Cloud API (Meta)
- App en Make: **WhatsApp Business Cloud** (`whatsapp-business-cloud`).
- Módulo: **Send a Message** (o *Send a Template Message* para iniciar conversación fuera de la
  ventana de 24 h).
- El adjunto (informe PDF) se envía como **mensaje de tipo `document`**: WhatsApp exige una **URL
  pública** del archivo, no binario inline. Solución: el informe ya está en Drive (paso #15); genera
  un enlace compartible (Drive → *Create a shareable link* / permisos "cualquiera con el enlace") y
  pásalo como `link` del documento. Alternativamente, sube el PDF a la Media API de WhatsApp y usa el
  `media_id`.
- **Plantilla de mensaje (HSM)** aprobada por Meta, p. ej.:
  > `Auditoría de contrato {{1}}: semáforo {{2}}. Informe adjunto. Aviso: no es asesoramiento
  > jurídico; la decisión de firmar es suya.`
  con variables `{{1}} = nombre_archivo`, `{{2}} = semáforo`.

## Opción B · Twilio (WhatsApp o SMS)
- App en Make: **Twilio** (`twilio`).
- Módulo: **Send a Message** (`from` = número Twilio WhatsApp `whatsapp:+…`, `to` = `whatsapp:+…`).
- Adjunto vía `mediaUrl` con la **URL pública** del informe PDF en Drive.

## Recomendaciones al migrar
- **Mantén el descargo legal** también en el texto del mensaje de WhatsApp (una línea): sigue sin ser
  asesoramiento jurídico.
- **Mantén la lógica de semáforo y los Routers** intactos: solo cambian los módulos de mensajería.
  El ROJO sigue notificando además al asesor legal.
- **Ventana de 24 h**: para el primer contacto usa *Template Message* aprobado; para respuestas
  dentro de la conversación abierta puedes usar mensajes de sesión.
- **Trazabilidad**: no toques los módulos de Sheets; el registro histórico es independiente del canal.

> Patrón idéntico al del proyecto hermano (generador de presupuestos): un único punto de salida
> sustituible por diseño.
