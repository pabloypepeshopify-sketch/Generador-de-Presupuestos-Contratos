# Carta NFC — pedir desde la mesa

El cliente acerca el móvil al **NFC de su mesa** → se abre la carta → elige, añade notas
("sin cebolla") y pulsa **Enviar pedido** → la comanda aparece al instante en la tablet de
cocina/barra como **"Mesa 2 · 2× Tapa de croquetas"**. Sin app, sin registro, sin camarero
tomando nota.

```
 NFC Mesa 2 ──► https://carta-nfc-pedidos.netlify.app/m/080f59f08e
                         │  (el código identifica la mesa y el restaurante)
                         ▼
                 Carta en el móvil ──► Enviar pedido ──► Supabase (valida mesa, precios, stock)
                                                              │
               Panel de comandas (tablet) ◄── cada 3 s ───────┘
               Nuevo → En preparación → Listo → Servido → Mesa cobrada
```

## En vivo

| Qué | Enlace |
|---|---|
| Carta demo (Mesa 2) | https://carta-nfc-pedidos.netlify.app/m/080f59f08e |
| Carta demo (NFC general, elige mesa) | https://carta-nfc-pedidos.netlify.app/r/demo |
| Panel de comandas demo | https://carta-nfc-pedidos.netlify.app/cocina.html?r=demo&k=demo-cocina |
| Alta de restaurantes (tú) | https://carta-nfc-pedidos.netlify.app/alta.html |

Las claves de admin de la demo y la clave de plataforma **no están en el repo**: se entregaron
aparte. Si se pierden, ver "Claves" más abajo.

## Qué incluye

**Cliente (móvil)** — `index.html`
- Carta por categorías con los **14 alérgenos** obligatorios (Reglamento UE 1169/2011).
- Carrito con cantidades y **nota por plato**, nota general, total.
- La mesa viene del NFC. Con un NFC general (`/r/<restaurante>`) el cliente elige su mesa.
- Estado en vivo de su pedido: Recibido → En preparación → **¡Listo!** (vibra).
- Botones **Llamar al camarero** y **Pedir la cuenta**.
- Productos agotados marcados; si cocina pausa los pedidos, la carta queda solo lectura.

**Panel de comandas (tablet cocina/barra)** — `cocina.html`
- 3 columnas: Nuevos / En preparación / Listos. Un toque avanza el estado (con deshacer).
- **Sonido + vibración + aviso** al llegar pedidos; tiempo de espera en ámbar/rojo.
- Avisos de "llama al camarero" y "pide la cuenta" (con el total de la mesa).
- Pestaña **Mesas**: consumo abierto por mesa, ticket imprimible y **"Cobrada · liberar mesa"**.
- Imprimir comanda (cualquier impresora del navegador, formato ticket 72 mm).
- Pausar/reanudar pedidos por móvil. Mantiene la pantalla encendida.

**Gestión del restaurante (dueño)** — `admin.html`
- Carta: categorías (ordenar/ocultar), productos, precios, alérgenos, foto, **Agotado** en 1 toque.
- **Mesas y NFC**: crear mesas en lote, enlace de cada mesa, **Grabar NFC desde el móvil**
  (Chrome Android), QR por mesa y hoja imprimible con todos los QR (respaldo para móviles sin NFC).
- Ajustes: nombre, mensaje, color de marca, permitir elegir mesa, abrir/cerrar pedidos.
- Claves: generar enlace del panel de cocina, cambiar clave de admin.
- **Hoy**: nº de pedidos, importe y lo más pedido.

**Plataforma (tú, vendedor de NFC)** — `alta.html`
- Alta de un restaurante en 10 segundos (nombre, identificador, nº de mesas) → te da los 3
  enlaces para entregar. Listado con actividad de 7 días, activar/desactivar (impago), resetear
  clave de admin.

## Bares que ya tienen su web de carta: `pedidos.js`

Si el bar ya tiene su carta en una web propia, no hace falta cambiarla: se le añade **una línea**
y esa misma web pasa a admitir pedidos desde la mesa (botón **+** en cada precio, barra con la
mesa, carrito, estado del pedido, llamar camarero / pedir cuenta, en el idioma de la web).

```html
<script src="https://carta-nfc-pedidos.netlify.app/w/pedidos.js" data-restaurante="martinez-bar" defer></script>
```

- **Visita normal** (Google, Instagram…): la web se ve exactamente igual. El script solo se activa
  si se llega desde el NFC/QR de una mesa (`?mesa=<codigo>`) o con `?pedir=1`.
- **NFC**: se siguen grabando los enlaces cortos `/m/<codigo>`. En gestión → *Ajustes* → **Web propia
  de la carta** se pone la URL de la carta del bar y el NFC redirige allí con la mesa. Si el bar
  cambia de web, se cambia esa URL y **no hay que regrabar** los NFC.
- **Carta**: `herramientas/importar-carta.mjs` lee la web y crea un producto por plato **y por
  tamaño** (Tapa / Media / Ración…) con su precio. Volver a ejecutarlo actualiza precios sin duplicar.
  ```bash
  node herramientas/importar-carta.mjs --url https://martinez-bar.vercel.app/carta.html --slug martinez-bar --clave <clave admin>
  ```
- **Probar sin tocar su hosting**: `herramientas/espejo-web.py` copia la web y le añade la línea;
  se publica la copia en Netlify (sin indexar en Google).
- El script reconoce por defecto la plantilla de Martínez (`.dish`, `.dish__p`, claves i18n `mn.*`).
  Para otra web: atributos `data-carta-plato`, `data-carta-ref`, `data-carta-precio` en el HTML, o
  selectores propios con `data-sel-plato`, `data-sel-precio`… y colores con `data-acento`, `data-fondo`.

### Martínez Bar (prueba real)

Martínez tiene una **página de pedidos propia**, nueva y separada de su web (que no se toca):
`clientes/martinez-bar/index.html`, con su estilo (negro/amarillo, Instrument Serif + Montserrat,
sus fotos), los 80 platos con tamaños (Tapa/Media/Ración…) y conectada a la misma base de datos y
panel de cocina.

| Qué | Enlace |
|---|---|
| Página de pedidos de Martínez | https://martinez-bar-pedidos.netlify.app/ |
| NFC de cada mesa (abre la página con la mesa) | `https://carta-nfc-pedidos.netlify.app/m/<codigo de mesa>` (códigos en gestión → Mesas y NFC) |
| Panel de comandas | `cocina.html?r=martinez-bar&k=<clave cocina>` (clave entregada aparte) |

**Publicar esta página = sobrescribir la de producción del bar.** Hazlo solo desde este archivo y con
el OK de Pablo. Antes, pasa `node tests/e2e-martinez.mjs`, que la prueba contra la BD local sin tocar
producción.

La versión del repo añade **Ver tu ticket** (facturación Fase 1) sobre la publicada el 14/10/2026:
- no cambia nada mientras Martínez no tenga activada la facturación;
- está pendiente de publicar.

*Web propia de la carta* = `https://martinez-bar-pedidos.netlify.app/`. Si algún día prefieren pedir
desde su web de Vercel, basta con pegar la línea de `pedidos.js` en su `carta.html` y cambiar ese
ajuste; los NFC no se regraban.

## Flujo para vender a un bar nuevo

1. `alta.html` → clave de plataforma → **Nuevo restaurante** (ej. "Bar Casa Pepe", `casa-pepe`, 12 mesas).
2. Copia los 3 enlaces (carta, gestión, cocina). Las claves solo se muestran esa vez.
3. Abre el enlace de **gestión** y carga la carta (o que la cargue el dueño).
4. En un **Android con Chrome**: gestión → *Mesas y NFC* → **📶 Grabar NFC** en cada mesa y
   acerca la pegatina. Ver [docs/guia-nfc.md](docs/guia-nfc.md) (iPhone: app NFC Tools).
5. Abre el enlace de **cocina** en la tablet (se queda guardado) y toca **Activar sonido**.
6. Prueba: acerca un móvil al NFC de una mesa y pide algo.

## Seguridad (resumen)

- Las tablas están en un schema privado (`carta`) **no expuesto** por la API. El navegador solo
  llama a funciones `public.carta_*` que validan todo en el servidor.
- **El precio lo pone el servidor**, nunca el móvil. Producto de otro local, agotado o de una
  categoría oculta → rechazado.
- Código de mesa aleatorio (no es "mesa=2"): nadie puede pedir para otra mesa cambiando la URL.
  Si un NFC se pierde o lo copian: *↻ Código* en gestión y se vuelve a grabar.
- Anti-broma: máximo 6 pedidos por mesa y minuto; avisos repetidos no se duplican.
- Claves de cocina/admin guardadas como hash SHA-256; la de cocina no abre la gestión.
- La clave "publishable" de Supabase en `assets/config.js` es pública por diseño.

## Facturación — Fase 1: tickets locales

Plan completo en [docs/brief-facturacion.md](docs/brief-facturacion.md). La Fase 1 ya está hecha:

- **Esquema privado `fiscal`** (`supabase/003_fiscal.sql`, idempotente) con estas tablas:
  - titular, series y documentos (con sus líneas);
  - cobros;
  - registros SIF y eventos.
  - Documentos, líneas, cobros y registros son **inalterables**: un trigger impide editarlos o
    borrarlos. Solo cambian el estado y los campos de envío.
- **Cobrar en el panel de cocina** (pestaña Mesas): la tarjeta de la mesa muestra **💳 Cobrar X €**.
  - Formas de pago: efectivo (con cálculo del cambio), tarjeta, Bizum o mixto.
  - Propina opcional, que va aparte y no entra en la factura.
  - Casilla **Factura con NIF**: emite una F1 con los datos del cliente.
  - Todo ocurre en una sola transacción de `fiscal_cobrar`:
    - el servidor recalcula los importes (el móvil no manda precios);
    - numera sin huecos (`T2026-000001` / `F2026-000001`);
    - desglosa el IVA por tipo y redondea la base por tipo;
    - encadena la huella SHA-256 del registro de alta VERI\*FACTU;
    - cierra la mesa.
- **Ticket** de 80 mm imprimible (`web/assets/ticket.js`). Incluye:
  - emisor, número y fecha;
  - tabla de IVA;
  - forma de pago;
  - **QR tributario** con la leyenda VERI\*FACTU;
  - el aviso "ENTORNO DE PRUEBAS · SIN VALIDEZ FISCAL" mientras no haya envío real.
- **Ticket digital**: el camarero enseña un QR que abre `ticket.html?t=…`. El cliente además ve
  **Ver tu ticket** en "Tus pedidos". Funciona en la carta de la plataforma y en la página de Martínez
  (en el repo; pendiente de publicar).
- **Pestaña 🧾 Tickets en el panel de comandas** (sale cuando el bar tiene datos fiscales):
  - todos los tickets y facturas emitidos, sin límite (50 por página, "Cargar más");
  - filtros Hoy / Ayer / 7 días / Este mes / Todo o fechas a mano, tipo y búsqueda por número, mesa o cliente;
  - totales del periodo: ventas, IVA, cobrado por forma de pago y propinas (sirve de cierre de caja);
  - **Ver · Imprimir** cualquier ticket antiguo, con su QR de ticket digital;
  - **Descargar Excel**: libro de facturas emitidas (CSV con `;` y coma decimal, una fila por tipo de IVA) para la gestoría.
- **Gestión → Facturación**:
  - datos fiscales del titular;
  - modo SIF;
  - IVA por defecto y por categoría;
  - series;
  - límite de factura simplificada;
  - pie del ticket;
  - la misma lista completa de tickets con descarga Excel, y el estado de la cadena.

**Cómo se activa**: gestión → *Facturación* → rellenar los datos fiscales → Guardar.
- Un restaurante **sin datos fiscales sigue exactamente igual que antes**: botones "🖨 Ticket" y
  "Cobrada · liberar mesa". Así está hoy Martínez Bar.
- La demo está activada con un NIF ficticio (`00000000T`, "DEMO SIN VALIDEZ FISCAL").

**Aún no hay envío a la AEAT** (Fase 2):
- los registros quedan como `pendiente` en `fiscal.registros_sif`;
- el entorno está forzado a `pruebas`, así que elegir *producción* devuelve error.

**TODO para la gestoría** (marcado en el SQL):
- IVA 0 % / exenciones no soportados;
- tratamiento de las propinas;
- NIF del productor del SIF para la declaración responsable (`fiscal.sistema`);
- el límite de 3.000 € de la simplificada es configurable.

## Estructura

```
carta-nfc/
  supabase/001_esquema.sql   tablas (schema carta) + API SQL (funciones carta_*)
  supabase/002_demo.sql      restaurante demo "Bar La Demo" (re-ejecutable)
  supabase/003_fiscal.sql    facturación Fase 1: schema fiscal + funciones fiscal_*
  supabase/004_fiscal_tickets.sql  listado completo de tickets (fiscal_documentos)
  web/                       sitio estático publicado en Netlify (sin build)
    index.html cocina.html admin.html alta.html ticket.html
    assets/ app.css api.js config.js cliente.* cocina.* admin.* ticket.js tickets.js vendor/qrcode.js (MIT)
    w/pedidos.js             script para añadir pedidos a la web propia de un bar
    _redirects               /m/<codigo> y /r/<slug> → index.html
    _headers  netlify.toml
  clientes/martinez-bar/      página de pedidos propia de Martínez Bar (HTML único, publicada en Netlify)
  herramientas/
    importar-carta.mjs       carga la carta de la web de un bar (platos + tamaños)
    espejo-web.py            copia una web y le añade pedidos.js (para pruebas)
  tests/
    sql-tests.sql            ~55 comprobaciones de la API SQL como rol anon
    sql-tests-fiscal.sql     facturación: vector oficial AEAT, NIF, redondeos, series, listado, cadena, inalterabilidad
    servidor-local.mjs       imita Supabase (RPC) + Netlify (rewrites) en local
    e2e.mjs                  navegador real: admin → cliente → cocina → cuenta → cobro
    e2e-fiscal.mjs           navegador real: datos fiscales → pedir → Cobrar → ticket con QR → "Ver tu ticket" → Tickets/Excel
    e2e-widget.mjs           pedidos.js sobre la copia de la web de Martínez (idiomas, tamaños)
    e2e-martinez.mjs         página propia de Martínez contra la BD local (pedir, "Ver tu ticket")
    humo-produccion.mjs      prueba rápida contra el sitio publicado (limpia después)
  docs/guia-nfc.md
  docs/brief-facturacion.md  plan del módulo de tickets, facturación, contabilidad e impuestos
```

## Infraestructura actual

- **Base de datos**: proyecto Supabase `giazlntdbfhnnfizmfao` (eu-west-1). Comparte proyecto con
  la app de facturación pero **aislado** en el schema `carta` + funciones `carta_*`; no toca
  ninguna tabla existente. La facturación vive en el schema `fiscal` + funciones `fiscal_*`.
  Para moverlo a un proyecto propio: ejecutar `001_esquema.sql`, `003_fiscal.sql`, `004_fiscal_tickets.sql` (y
  opcionalmente `002_demo.sql`) en el nuevo proyecto y cambiar `web/assets/config.js`.
- **Web**: Netlify, proyecto `carta-nfc-pedidos` → https://carta-nfc-pedidos.netlify.app.
  Para desplegar: publicar la carpeta `web/` (no hay build).
- **Dominio propio** (recomendado para vender): en Netlify → Domain management. Los NFC ya
  grabados apuntan al dominio con el que se grabaron: decide el dominio **antes** de grabar en serie.

## Claves

- Clave de **plataforma** (para `alta.html`): cambiarla en Supabase → SQL Editor:
  `select carta.fijar_clave_plataforma('nueva-clave-larga');`
- Dueño perdió su clave de **admin**: `alta.html` → *Nueva clave admin*.
- Clave de **cocina**: gestión → *Ajustes y claves* → *Generar enlace de cocina*.

## Pruebas en local

Requiere Postgres 14+ escuchando en `/tmp:54329` y Node 18+.

```bash
cd carta-nfc/tests
npm install
bash db-local.sh                      # crea la BD carta_test (001 + 003 + 004)
psql -h /tmp -p 54329 -U postgres -d carta_test -f sql-tests.sql   # → TODAS LAS PRUEBAS SQL OK
bash db-local.sh && psql -h /tmp -p 54329 -U postgres -d carta_test -v ON_ERROR_STOP=1 -f sql-tests-fiscal.sql
                                      # → TODAS LAS PRUEBAS FISCALES OK
node e2e-fiscal.mjs                   # levanta su propio servidor → E2E FISCAL OK
node e2e-martinez.mjs                 # página de Martínez, sin tocar producción → E2E MARTÍNEZ OK
node servidor-local.mjs &             # http://localhost:8787
node e2e.mjs                          # → E2E OK
# widget sobre la web de un bar (copia hecha con herramientas/espejo-web.py):
MIRROR=/ruta/copia-martinez node e2e-widget.mjs   # → E2E WIDGET OK
# contra producción (usa la mesa de la demo):
MESA=080f59f08e node humo-produccion.mjs
```

## Límites conocidos / siguientes pasos

- **Facturación**, siguientes fases del brief:
  - Fase 2: envío VERI\*FACTU al entorno de pruebas de la AEAT, con estados y reintentos, más la
    declaración responsable;
  - Fase 3: contabilidad y cierre de caja;
  - Fase 4: borradores 303/390;
  - Fase 5: producción con Martínez, cuando haya datos fiscales y certificado.
- **Pago online** no incluido (se cobra en mesa/barra como siempre). Siguiente paso natural: Stripe/Bizum.
- Panel de cocina por sondeo cada 3 s (robusto con WiFi de bar); no usa WebSockets.
- Impresión vía diálogo del navegador; impresoras térmicas que funcionen como impresora del
  sistema valen. Impresión automática sin diálogo requeriría un agente local.
- Carta propia de la plataforma en un idioma (español); con `pedidos.js` se usan los idiomas de la web del bar.
- Suplementos tipo "carne extra +2,5 €" no son opciones con precio: el cliente lo pide en la nota
  del plato y se cobra en mesa.
- Si el bar cambia precios en su web, hay que volver a ejecutar `importar-carta.mjs` (el precio
  que vale siempre es el de la base de datos).
- Netlify muestra un badge "Powered by Netlify" (se cierra con su ✕); el diseño deja hueco para
  que nunca tape el botón del pedido.
