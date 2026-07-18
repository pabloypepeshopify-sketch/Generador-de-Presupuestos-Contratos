# 06 · Migración de Email (pruebas) a WhatsApp (producción)

El diseño aísla el **envío al cliente** en **un único módulo** (Escenario 2, módulo #5) para que
pasar de Gmail a WhatsApp sea un cambio quirúrgico, sin tocar el resto del flujo.

## Punto de sustitución
```
Escenario 2:
  [4] Drive download PDF
  [5] Gmail → CLIENTE   ◄── SUSTITUIR ESTE MÓDULO
  [6] Sheets ENVIADO
```

## Opción A — WhatsApp Business Cloud API (Meta)
Módulo Make: **WhatsApp Business Cloud → Send a Message**.
- Requiere: cuenta de **Meta Business**, número de WhatsApp Business verificado, y **plantillas de
  mensaje aprobadas** por Meta (los mensajes iniciados por la empresa deben usar *message templates*).
- El PDF se envía como **mensaje de tipo documento**: primero sube el PDF (media) y envía el
  `media_id`, o usa una URL pública del PDF (enlace de Drive con permiso de lectura).
- Mapear el teléfono del cliente (`cliente_telefono` en formato E.164, ej. `+34600123456`).

### Consideraciones
- Ventana de 24 h: fuera de una conversación activa, solo puedes iniciar con *template* aprobada.
- Da de alta una plantilla tipo: *"Hola {{1}}, te enviamos tu presupuesto adjunto. Cualquier duda,
  respóndenos por aquí."* con adjunto de documento.

## Opción B — Twilio (WhatsApp)
Módulo Make: **Twilio → Send a Message** (o *Create a Message*).
- Requiere: cuenta Twilio, remitente de WhatsApp (sandbox para pruebas o número aprobado en
  producción), `From` = `whatsapp:+1415...`, `To` = `whatsapp:+34600123456`.
- Adjuntos vía `MediaUrl` → necesita una **URL pública del PDF** (haz el PDF de Drive accesible por
  enlace, o súbelo a un almacenamiento con URL directa).

## Cambios exactos a realizar
1. Añadir la **conexión** WhatsApp Cloud API o Twilio en Make.
2. Borrar/deshabilitar el módulo Gmail #5 y colocar el módulo WhatsApp en su lugar (misma posición
   en la ruta `aprobar`).
3. Mapear:
   - Destinatario → `{{1.cliente_telefono}}` (asegúrate de recogerlo en el formulario en E.164).
   - Documento → `media_id`/`MediaUrl` del PDF (módulo #4 o enlace de Drive del #10 del esc.1).
   - Cuerpo del mensaje → texto breve de acompañamiento.
4. (Opcional) Mantener Gmail como **fallback**: Router que envíe por WhatsApp si hay teléfono y por
   email si no.

## Recogida del teléfono
Asegúrate de que el formulario capture `cliente_telefono` en formato internacional **E.164**
(`+34...`). Puedes normalizarlo en el módulo *Set Variables* del escenario 1 antes de guardarlo.
