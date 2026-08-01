# Plantilla de mensaje de WhatsApp (para aprobar en Meta)

Con la **API oficial de WhatsApp (Cloud API)**, para **iniciar** una conversación con un cliente
(cuando él no te ha escrito en las últimas 24 h) **estás obligado a usar una _plantilla de mensaje_
aprobada por Meta**. No puedes escribir texto libre en frío. Aquí tienes la plantilla lista para dar
de alta; Meta suele aprobarla en minutos/pocas horas.

> Dónde se crea: **WhatsApp Manager → Herramientas de mensajería → Plantillas de mensajes → Crear
> plantilla** (o en la pestaña *Plantillas* del panel de WhatsApp dentro de Meta Business).

---

## Datos de la plantilla a crear

| Campo | Valor |
|-------|-------|
| **Nombre** | `envio_documento` (en minúsculas y con guiones bajos; **este es el nombre que pondrás en Make** en `REEMPLAZAR_TEMPLATE_NAME`) |
| **Categoría** | **UTILITY / Utilidad** (es una transacción solicitada por el cliente, no marketing) |
| **Idioma** | **Español (es)** |
| **Encabezado (Header)** | Tipo **DOCUMENTO** (para adjuntar el PDF) |
| **Cuerpo (Body)** | Ver texto abajo (1 variable) |
| **Pie (Footer)** | *(opcional)* `Este mensaje ha sido enviado de forma automatizada.` |
| **Botones** | *(opcional)* Ninguno |

### Texto del CUERPO (cópialo tal cual)

```
Hola {{1}}, te enviamos el documento que has solicitado en el archivo adjunto. Si tienes cualquier duda, respóndenos por aquí y te atendemos. Un saludo.
```

- `{{1}}` = **nombre del cliente**. Meta te pedirá un **ejemplo** para la variable: pon `María López`.
- El **encabezado tipo Documento** es donde viajará el **PDF** (presupuesto/contrato). Meta te pedirá
  un **PDF de ejemplo** al crear la plantilla: sube cualquier PDF de muestra.

---

## Cómo se conecta esto en Make (escenario 2, ruta WhatsApp)

Una vez la plantilla esté **APROBADA**, en el módulo **WhatsApp Business Cloud → Send a Template
Message** de Make:

1. **Sender ID / From**: selecciona tu número (aparecerá solo al tener la conexión creada).
2. **To / Receiver**: `+{{1.cliente_telefono}}` (ya viene en formato internacional desde el escenario 1).
3. **Message Template**: elige `envio_documento`.
4. Al elegir la plantilla, Make mostrará los huecos que hay que rellenar:
   - **Encabezado (Documento)** → mapea el **Media ID** del módulo anterior *Upload a Media*: `{{10.id}}`.
     - (El nombre de fichero puede ir como `{{4.filename}}`.)
   - **Cuerpo · Variable {{1}}** → `{{2.cliente_nombre}}` (viene de la búsqueda en Google Sheets).

> El PDF se sube primero con el módulo **WhatsApp → Upload a Media** (id 10 del blueprint), que
> devuelve un **Media ID**; ese Media ID es lo que la plantilla usa en el encabezado de documento.

---

## Notas importantes sobre plantillas (Meta)

- **Categoría correcta = menos rechazos.** Enviar un presupuesto/contrato solicitado es **Utility**,
  no Marketing. Si la marcas como Marketing, Meta puede pedir consentimiento explícito y es más cara.
- **No metas precios ni condiciones en el texto de la plantilla.** Todo eso va **dentro del PDF**.
  La plantilla solo es el mensaje de acompañamiento; así evitas tener que re-aprobar la plantilla
  cada vez que cambian tus precios.
- Si el cliente **responde**, se abre una **ventana de 24 h** en la que ya puedes escribirle texto
  libre (sin plantilla) desde el módulo *Send a Message*. Fuera de esa ventana, siempre plantilla.
- Puedes tener **varias plantillas** (p. ej. una para presupuestos y otra para contratos); crea las
  que necesites y elige la correcta en Make con un Router si quieres diferenciarlas.
