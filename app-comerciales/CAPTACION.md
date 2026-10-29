# Captación automática de VISAX NFC

Sistema para encontrar bares y restaurantes en cualquier ciudad de España y hablar con ellos sin
llamar en frío. Las llamadas del equipo se quedan para los que ya han mostrado interés.

```
 RADAR (cada mañana)          PRIMER CONTACTO (legal)           HABLA SOLO (24 h)           EQUIPO
 Google Maps por zonas  ───▶  Carta con QR / pegatina NFC  ───▶  Informe personal     ───▶  «Calientes»
 nota, reseñas y              Vídeos Ray-Ban, anuncios,          + asistente IA en el        en la app:
 oportunidad de cada local    mensaje uno a uno en Instagram     chat y en WhatsApp          llamar primero
```

1. **Radar**: cada día a las 07:17 (UTC) busca en Google Maps las zonas que tocan («bares en Triana,
   Sevilla») y guarda cada local con su nota, sus reseñas y cómo está frente a su zona. Si ya
   estaba, le refresca los datos.
2. **Informe personal**: cada local tiene su página (`/para/<código>`) con su nota y reseñas frente a
   los vecinos, lo que le falta, los productos y tres salidas: WhatsApp, chat con el asistente o
   «que me llamen». Sirve de destino para cartas, QR, pegatinas NFC y mensajes.
3. **«Analiza tu local gratis»** (la portada de la misma web): el dueño escribe el nombre de su bar
   y recibe su informe al momento. Es el enlace para la bio de Instagram, los vídeos y los anuncios.
4. **Asistente con IA** (Claude): contesta en el chat del informe y en WhatsApp a quien escribe
   primero. Explica, recomienda producto, manda el enlace de compra, guarda nombre y móvil y avisa
   al equipo cuando alguien quiere llamada, visita o presupuesto. Se presenta siempre como
   asistente virtual.
5. **App del equipo**: «Calientes» en Inicio y en Captación (abrió su informe, escribió o pidió
   contacto en los últimos 14 días), el radar por zonas, las cartas para imprimir y, en cada ficha,
   lo que ha hecho el local y sus conversaciones con el asistente (con pausa y respuesta a mano).

## Qué está ya funcionando

| Pieza | Dónde | Estado |
| --- | --- | --- |
| Base de datos (zonas, búsquedas, eventos, conversaciones, mensajes, límites) | Supabase `visax-comerciales` | Aplicada |
| Funciones `radar`, `informe`, `whatsapp` | Supabase Edge Functions | Desplegadas |
| Cron diario del radar y limpieza de límites | `cron.job` en Supabase | Activo |
| Página pública del informe y «Analiza tu local» | https://visax-informe.vercel.app (Vercel `visax-informe`) | En línea |
| Pantallas nuevas de la app del equipo | rama `claude/lucid-brahmagupta-aomdsm` | Falta publicarla (paso 3) |

Mientras falten las claves, todo responde con mensajes claros: el radar apunta «Falta la clave de
Google Maps» en la zona, «Analiza tu local» invita a escribir por WhatsApp y el chat no se muestra.

## Para encenderlo

### 1. Clave de Google Maps (radar y «Analiza tu local»)

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto y activa
   **Places API (New)**. Pide tarjeta para la facturación.
2. En *APIs y servicios → Credenciales*, crea una **clave de API** y restríngela a *Places API (New)*.
3. En Supabase → proyecto `visax-comerciales` → *Edge Functions → Secrets*, añade
   `GOOGLE_PLACES_API_KEY` con esa clave.
4. Pon una alerta de presupuesto en Google Cloud (*Facturación → Presupuestos y alertas*).

Coste: Google da cada mes un número de llamadas gratis por tipo de consulta (consúltalo en su
página de precios). Una zona del radar gasta 3 llamadas (hasta 60 locales); un «Analiza tu local»,
3. Con 4 zonas al día (`RADAR_ZONAS_DIA`) y los límites de abajo, el uso normal queda dentro de lo
gratuito.

### 2. Clave de Claude (asistente)

1. En [console.anthropic.com](https://console.anthropic.com/) crea una clave de API y añade saldo.
2. En los mismos Secrets de Supabase, añade `ANTHROPIC_API_KEY`.

Usa el modelo `claude-opus-5-5` con esfuerzo bajo para responder rápido, y vuelve a intentar con
otro modelo si una respuesta se rechaza por seguridad. Para gastar menos, añade el secreto
`MODELO_AGENTE` con `claude-sonnet-5-5`. Tope de llamadas al día: `AGENTE_MAX_DIA` (800 por
defecto); al pasarlo, el asistente avisa al equipo en vez de contestar.

### 3. Publicar la app del equipo

La app (`visax-equipo` en Vercel) se publica desde la rama `claude/presupuestos-contratos-generator-82d5o8`.
Para activar las pantallas nuevas, fusiona la rama `claude/lucid-brahmagupta-aomdsm` en esa rama
(o pídeselo a Claude). La base de datos ya está preparada, así que la versión actual sigue
funcionando mientras tanto.

### 4. Dominio propio `informe.visaxnfc.es` (recomendado antes de mandar cartas)

El dominio ya está añadido al proyecto `visax-informe`. Falta un registro en GoDaddy
(donde está el DNS de visaxnfc.es):

| Tipo | Nombre | Valor |
| --- | --- | --- |
| CNAME | `informe` | `a16b5986a9689124.vercel-dns-017.com` |

Cuando funcione `https://informe.visaxnfc.es`, cambia `INFORME_URL` en `web/js/util.js` y añade el
secreto `INFORME_URL` con el mismo valor en Supabase. Los enlaces viejos de `visax-informe.vercel.app`
siguen funcionando.

### 5. WhatsApp Business (para que el asistente conteste en WhatsApp)

1. En [Meta for Developers](https://developers.facebook.com/) crea una app de empresa y añade
   el producto **WhatsApp**. Da de alta el número de VISAX (o uno nuevo).
2. Crea un **token permanente** (usuario del sistema con permiso de WhatsApp).
3. En *WhatsApp → Configuración → Webhook*:
   - URL: `https://jwissdakpdzfdrohsnzk.supabase.co/functions/v1/whatsapp`
   - Token de verificación: una palabra secreta que tú elijas.
   - Suscríbete al campo `messages`.
4. Secrets en Supabase: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` (identificador del número),
   `WHATSAPP_VERIFY_TOKEN` (la palabra del paso 3) y `WHATSAPP_APP_SECRET` (*Configuración de la
   app → Básica → Clave secreta*).

El asistente solo contesta a quien escribe. Si alguien del equipo responde desde la ficha, el
asistente se pausa en esa conversación. WhatsApp no deja escribir a nadie pasadas 24 h de su último
mensaje salvo con plantillas aprobadas: en ese caso, llamada.

## Rutina semanal (sin llamar en frío)

- **Cada día**: abrir *Calientes* y llamar primero a esos. Ya saben quiénes sois y qué vendéis.
- **Lunes**: añadir 2-4 zonas nuevas en *Captación → Radar* (otras ciudades o barrios).
- **Martes**: *Captación → Cartas* → «Mucha oportunidad» → imprimir 30-50 cartas y enviarlas por
  correo. En las 10 mejores, pegad una pegatina NFC programada con el enlace de la columna «NFC»
  del CSV: el producto se demuestra solo. Después, «Ya las envié».
- **Instagram**: desde la ficha, «Mensaje Instagram» copia un mensaje con su informe. Mandadlo a
  mano, uno a uno, a cuentas de negocio, y no más de 20 al día.
- **Vídeos con las Ray-Ban Meta**: enlace en la bio a `https://visax-informe.vercel.app`
  («¿Cuántas reseñas le faltan a tu bar?»). Ideas: un cliente toca el expositor y deja la reseña en
  10 segundos; «pregunto a 5 dueños de Triana cuántas reseñas tienen»; montaje en una barra real.
- **Anuncios** (cuando haya presupuesto): Meta con destino WhatsApp o a la portada del informe,
  dirigidos a dueños de hostelería de las zonas del radar. Todo el que entra lo atiende el asistente.

## Lo que NO hace, y por qué

- **Emails, WhatsApp o SMS automáticos a quien no lo ha pedido.** En España la LSSI (art. 21)
  prohíbe las comunicaciones comerciales electrónicas sin consentimiento previo, también entre
  empresas, y la AEPD lo sanciona (multas de hasta 30.000 € por infracción leve). Además, Meta
  bloquea los números de WhatsApp que escriben en frío.
- **Llamadas automáticas con voz de IA.** La Ley General de Telecomunicaciones (art. 66) exige
  consentimiento previo para llamadas comerciales sin intervención humana.
- **Mensajes automáticos en Instagram.** Van contra las normas de Meta y acaban en bloqueo de la
  cuenta.
- **Cartas en papel a negocios**: sí. Cada carta dice de dónde salen los datos (ficha pública de
  Google Maps), quién es el responsable y cómo darse de baja. Si alguien la pide, marcad el local
  como «No interesa».

Esto es una guía práctica, no asesoramiento legal: ante dudas, consultadlo con un abogado de
protección de datos.

## Límites anti-abuso (en la función `informe`)

| Acción | Límite |
| --- | --- |
| Ver un informe | 60 cada 10 min por IP |
| Buscar un local (Analiza) | 10 por hora por IP y 400 al día en total |
| Analizar un local | 5 por hora por IP y 200 al día en total |
| Chat | 20 mensajes cada 10 min por IP y 40 mensajes por conversación |
| Pedir contacto | 5 por hora por IP |

Las IP se guardan cifradas y se borran a los 2 días.

## Cómo está hecho

- `supabase/migrations/20261029144201_captacion_automatica.sql` y `…_turnos_del_agente.sql`: tablas
  `zonas`, `busquedas`, `eventos`, `conversaciones`, `mensajes`, `limites_web`; columnas nuevas en
  `locales` (Google, código del informe, señales de interés, carta enviada, asistente en pausa);
  RLS (el equipo lee, escriben las funciones); cron diario.
- `supabase/functions/_shared/`: `google.ts` (Places API New), `agente.ts` (asistente: un solo
  proceso responde por conversación, historial que solo crece, herramientas `guardar_datos`,
  `avisar_equipo` y `no_molestar`) y `comun.ts`.
- `supabase/functions/radar`, `informe`, `whatsapp`: se despliegan sin verificación JWT (cada una
  comprueba quién llama: secreto del cron, sesión de socio, firma de Meta o nada en lo público).
- `informe-web/`: página pública estática (Vercel `visax-informe`, raíz `app-comerciales/informe-web`).
- `web/js/captacion.js` y cambios en `inicio.js`, `locales.js`, `ui.js`, `util.js`, `datos.js`.

Pruebas del asistente (base de datos en memoria y API simulada):

```bash
deno test --allow-net --allow-env app-comerciales/supabase/functions/tests/
```
