# 06 · Envío por WhatsApp (API oficial de Meta) — guía para tu SIM prepago

Objetivo: que el sistema, en vez de mandar el presupuesto/contrato al cliente **por email**, se lo
mande **por WhatsApp**, usando la **API oficial de WhatsApp (WhatsApp Business Cloud API de Meta)**.

> **Estado actual (preparado para cuando tengas la SIM):**
> - ✅ **Blueprint listo**: `blueprints/03-envio-whatsapp.blueprint.json` (escenario 2 con WhatsApp
>   + email de reserva). Importable en cuanto tengas la conexión.
> - ✅ **Plantilla de mensaje** para dar de alta en Meta: `plantillas/whatsapp-plantilla-mensaje.md`.
> - ✅ **El teléfono ya viaja por el flujo**: el escenario 1 normaliza el número a formato
>   internacional (`cliente_telefono_e164`) y lo pasa en los botones de aprobación (ver blueprint 01).
> - ⏳ **Lo único que falta y depende de la SIM**: registrar el número en Meta y **crear la conexión
>   de WhatsApp en Make**. Sin ese número físico, Make **no deja** crear el módulo (da el error
>   `Connection not found`). Por eso este paso se hace el día que tengas la tarjeta.

---

## 1. Cómo encaja tu idea (SIM prepago + tu móvil)

Tu plan de comprar una **SIM prepago** es correcto, y aquí está el porqué exacto:

- Necesitas un **número de teléfono nuevo, que NO estés usando ya en el WhatsApp normal**. Una SIM
  prepago barata te da justo eso.
- Ese número lo vas a **registrar en Meta**. Durante el registro, Meta te envía un **código por SMS
  o llamada** a esa SIM: **para eso necesitas el móvil con la tarjeta puesta**, para leer el código.
- ⚠️ **Importante**: una vez registras el número en la API de WhatsApp, **ese número queda "ocupado"
  por la API** y **ya no podrás usarlo en la app normal de WhatsApp** (ni WhatsApp ni WhatsApp
  Business) en el móvil. No pasa nada: **no necesitas tener el móvil encendido** para enviar; los
  mensajes salen desde los servidores de Meta a través de Make. El móvil + SIM solo hacen falta
  **una vez**, para recibir el código de alta (y de vez en cuando si Meta pide re-verificar).
- 💡 Consejo: usa una SIM **de un número que no te importe "quemar" para uso personal** y guarda el
  PIN/PUK. Sirve cualquier operador; solo tiene que poder recibir SMS.

**Coste:** la Cloud API de Meta es **gratuita** para este uso (las conversaciones de *servicio* /
*utility* iniciadas por plantilla tienen un volumen mensual gratuito muy holgado para una empresa de
reformas o un despacho). No pagas a Make por el módulo (es una app estándar).

---

## 2. Qué vas a montar (resumen del cambio)

El envío al cliente estaba aislado en **un solo módulo** (escenario 2). La versión WhatsApp sustituye
ese punto por **dos módulos de WhatsApp** y deja el email como **reserva** por si un cliente no dio
teléfono:

```
Escenario 2 · ruta "APROBAR":
  [4] Google Docs → Download PDF
        │
        ├─►(cliente tiene teléfono)  [10] WhatsApp → Upload a Media (sube el PDF → media_id)
        │                            [11] WhatsApp → Send a Template Message (envía plantilla + PDF)
        │                            [12] Sheets → ENVIADO (canal: whatsapp)
        │
        └─►(sin teléfono)            [5] Gmail → cliente (reserva)
                                     [6] Sheets → ENVIADO (canal: email)
```

Todo esto ya está construido en `blueprints/03-envio-whatsapp.blueprint.json`.

---

## 3. EL DÍA QUE LLEGUE LA SIM — checklist paso a paso

### Paso A · Alta del número en Meta (una vez)
1. Entra en **[Meta for Developers](https://developers.facebook.com/)** con tu cuenta y en
   **[Meta Business Suite](https://business.facebook.com/)** crea (si no tienes) una **cuenta de
   empresa (Meta Business)**.
2. Crea una **App** de tipo *Business* y añádele el producto **WhatsApp**.
3. En la sección WhatsApp → **"Empezar" / API Setup**: añade tu **número de la SIM prepago** como
   número de teléfono. Meta te enviará un **código de verificación** por SMS/llamada → mételo con el
   móvil que tiene la SIM.
4. Apunta dos cosas que te da Meta:
   - **Phone Number ID** (un número largo) → lo pondrás en Make (`REEMPLAZAR_PHONE_NUMBER_ID`).
   - **WhatsApp Business Account ID (WABA)**.
5. Genera un **token de acceso permanente** (System User token con permisos
   `whatsapp_business_messaging` y `whatsapp_business_management`). Lo usará Make para conectarse.

### Paso B · Da de alta la plantilla de mensaje
- Sigue `plantillas/whatsapp-plantilla-mensaje.md`: crea la plantilla **`envio_documento`**
  (categoría *Utility*, idioma *es*, **encabezado tipo Documento** + cuerpo con `{{1}}` = nombre).
- Espera a que Meta la marque como **APROBADA** (suele ser rápido).

### Paso C · Crea la conexión de WhatsApp en Make
1. En Make, ve a **Connections → Add** y elige **WhatsApp Business Cloud**.
2. Pega el **token** y asocia tu **WABA / número**. Guarda.

### Paso D · Monta el envío WhatsApp en el escenario 2
Tienes **dos opciones** (elige la más cómoda):

**Opción rápida (recomendada): importar el blueprint ya hecho**
1. Duplica tu escenario 2 actual como copia de seguridad (o expórtalo).
2. Importa `blueprints/03-envio-whatsapp.blueprint.json`.
3. Asigna las conexiones cuando lo pida: Google Sheets y Google Docs (las que ya tienes) y la
   **nueva conexión de WhatsApp** en los módulos 10 y 11.
4. En los módulos WhatsApp 10 y 11, en **Sender ID/From**, selecciona tu número (sustituye
   `REEMPLAZAR_PHONE_NUMBER_ID`).
5. En el módulo 11 (**Send a Template Message**): elige la plantilla `envio_documento` y mapea:
   - Encabezado (Documento) → `{{10.id}}` (el Media ID del PDF subido).
   - Variable `{{1}}` del cuerpo → `{{2.cliente_nombre}}`.
6. Revisa el `spreadsheetId` y el nombre de pestaña (tu hoja usa la pestaña **`Untitled`**).
7. Apunta la URL del nuevo webhook y **pégala en los botones del email de aprobación** del
   escenario 1 (ver Paso E) si el webhook cambió.

**Opción manual (sobre tu escenario 2 actual): añadir 2 módulos**
1. En la ruta *APROBAR*, después de **[4] Download PDF**, añade un **Router**.
2. Ruta 1 (filtro: `cliente_telefono` **existe**):
   - **WhatsApp → Upload a Media**: From = tu número; File name = `{{4.filename}}`; Data = `{{4.data}}`.
   - **WhatsApp → Send a Template Message**: From = tu número; To = `+{{1.cliente_telefono}}`;
     Template = `envio_documento`; Documento del encabezado = `{{ID_del_upload}}`;
     variable nombre = `{{2.cliente_nombre}}`.
   - **Sheets → Update a Row** → estado `ENVIADO` (como el módulo 6 actual, canal `whatsapp`).
3. Ruta 2 (filtro: `cliente_telefono` **no existe**): deja tu **Gmail actual + Update Row** como reserva.

### Paso E · Asegura que el teléfono llega al escenario 2
El escenario 2 necesita el teléfono del cliente. Ya está resuelto en el **blueprint 01 del repo**,
pero si tu escenario 1 en Make es anterior a este cambio, haz este **micro-ajuste manual** (30 s):

1. **Escenario 1 → módulo 2 (Tools · Set variables)**: añade una variable llamada
   **`cliente_telefono_e164`** con este valor (normaliza a formato internacional España, +34):
   ```
   {{if(replace(replace(replace(ifempty(1.cliente_telefono; ""); " "; ""); "+"; ""); "-"; "") = ""; ""; if(substring(replace(replace(replace(ifempty(1.cliente_telefono; ""); " "; ""); "+"; ""); "-"; ""); 0; 2) = "34"; replace(replace(replace(ifempty(1.cliente_telefono; ""); " "; ""); "+"; ""); "-"; ""); "34" + replace(replace(replace(ifempty(1.cliente_telefono; ""); " "; ""); "+"; ""); "-"; "")))}}
   ```
2. **Escenario 1 → módulo 10 (email de aprobación)**: a los **dos** enlaces (APROBAR y RECHAZAR)
   añádeles al final de la URL: `&cliente_telefono={{2.cliente_telefono_e164}}`.

> Con esto, al pulsar APROBAR, el escenario 2 recibe `cliente_telefono` en formato `34XXXXXXXXX`
> (sin `+`, para que no se rompa en la URL). El módulo de WhatsApp lo envía como `+{{1.cliente_telefono}}`.

### Paso F · Prueba
1. Activa los escenarios 1 y 2.
2. Manda una solicitud de prueba **con tu propio móvil personal como `cliente_telefono`**.
3. Aprueba desde el email → deberías **recibir el PDF por WhatsApp** en tu móvil.
4. Comprueba en Sheets que la fila pasa a `ENVIADO` con canal `whatsapp`.

---

## 4. Reglas de WhatsApp que conviene tener claras

- **Ventana de 24 h**: para escribir a un cliente que **no** te ha hablado en las últimas 24 h,
  **es obligatorio usar una plantilla aprobada** (por eso montamos `envio_documento`). Si el cliente
  te responde, se abre una ventana de 24 h en la que puedes mandar texto libre.
- **El PDF va en el encabezado de la plantilla** como documento (se sube antes con *Upload a Media*).
- **Número en formato internacional**: `+34XXXXXXXXX`. El escenario 1 ya lo normaliza; aun así, pide
  el teléfono en el formulario con prefijo si puedes.
- **No uses este número en la app de WhatsApp del móvil** una vez registrado en la API.

## 5. ¿Y si algún día quieres volver al email para alguien concreto?
Ya está previsto: si una solicitud llega **sin teléfono**, el escenario 2 la envía **por email**
automáticamente (ruta de reserva). No tienes que hacer nada.
