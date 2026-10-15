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

## Webs de bares: plantilla "web premium + carta con pedidos"

Cada bar tiene su carpeta `clientes/<slug>/` con **un solo archivo de configuración** (`bar.config.mjs`:
colores, logo, fuentes, textos, horario, dirección, reseñas, contacto…) y sus fotos en `img/`.
La herramienta genera una web estática (sin build en Netlify) que se sube a **un sitio de Netlify por bar**.

```bash
cd carta-nfc/herramientas && npm install          # una vez (sharp: reduce las fotos a WebP)
cd ..
node herramientas/web-bar.mjs --nuevo casa-pepe   # crea clientes/casa-pepe/ desde la plantilla
#   rellenar clientes/casa-pepe/bar.config.mjs, legal.local.mjs (no se sube a git) y meter las fotos en img/
node herramientas/web-bar.mjs clientes/casa-pepe  # genera clientes/casa-pepe/publicar/ y avisa de lo que falte
```

Lo que sale en `publicar/`:
- `index.html` — la web: portada con foto, **"Abierto ahora / Cerrado ahora"** según el horario, la casa,
  lo que más se pide, galería, horario (marca hoy), dónde estamos (el mapa de Google solo se carga si se
  pulsa: más rápido y sin cookies de Google de entrada), reseñas, contacto (llamar, WhatsApp, Instagram) y
  un botón fijo "Ver la carta y pedir" en el móvil.
- `carta.html` — la carta con pedidos (mismo motor que la página de Martínez, generalizado): alérgenos,
  tamaños (Tapa/Media/Ración), notas por plato, estado del pedido, llamar al camarero y pedir la cuenta.
  - Sin mesa (visita desde Google o Instagram): solo se ve la carta.
  - Desde el NFC/QR de la mesa (`?mesa=`): se pide. La URL se limpia para que, si la comparten, no lleve la mesa.
  - Desde la carta general (`/r/<slug>` → `?pedir=1`) con "permitir elegir mesa": pide y elige mesa al enviar.
- SEO local: título "Nombre · Bar en Ciudad", descripción, canonical, Open Graph, datos estructurados de
  Google (dirección, coordenadas, horario, carta), `sitemap.xml` y `robots.txt`.
- `aviso-legal.html` y `privacidad.html` — TODO(gestoría): revisar los textos. El titular y el NIF salen de
  `legal.local.mjs`, que **no se sube** (repo público).
- `_headers` con cabeceras de seguridad (CSP que solo deja hablar con la API de pedidos).

Publicar:
1. Netlify → crear un sitio por bar y subir `clientes/<slug>/publicar/` (con la herramienta de Netlify:
   `deploy-site` y su comando, ejecutado dentro de `publicar/`).
2. Gestión del bar → *Ajustes* → **Web propia de la carta** = `https://<sitio>/carta.html`.
   Los NFC `/m/<codigo>` llevan a esa carta con la mesa puesta; no hay que regrabarlos si cambia la web.

Notas:
- La herramienta avisa si un color se lee mal sobre otro (contraste), si falta una foto o la descripción
  de una foto, y si falta la dirección o las coordenadas.
- Cambios del bar (horario, fotos, textos): editar `bar.config.mjs`, regenerar y volver a subir.
- La carta y los precios salen siempre de la base de datos (gestión), no del archivo de configuración.
- Ejemplo: `clientes/bar-la-demo/` (restaurante `demo`, fotos de relleno). Prueba: `node tests/e2e-web-bar.mjs`.
- Martínez sigue con su página propia (`clientes/martinez-bar/`); la plantilla es para los bares nuevos.

## Kit de instalación imprimible — `kit.html`

Gestión → *Mesas y NFC* → **🧾 Kit de instalación** (usa la sesión de gestión; abre en otra pestaña).
- **Adhesivo por mesa**: nombre del bar y logo, nombre de la mesa en grande, **zona del NFC** (círculo
  "Acerca aquí": el chip NFC se pega detrás de ese círculo), el QR de la mesa y "Acerca tu móvil o escanea".
  Tamaños: pequeño 60×60 mm (12 por A4), mediano 85×85 mm (6 por A4), grande 95×135 mm (4 por A4).
  Color de marca, logo (se sube en el momento, se recuerda en ese navegador) y texto cambiables.
- **A4 para recortar** (líneas de corte discontinuas) o **Imprenta**: 1 adhesivo por página con 2 mm de
  sangrado y marcas de corte. Imprimir → "Guardar como PDF", márgenes "Ninguno", con gráficos de fondo.
- Opcional: adhesivo de la **carta general** (barra, entrada). Avisa si "permitir elegir mesa" está apagado.
- **QR de la carta general para la galería** del móvil del camarero: imagen PNG 1080×1350 para guardar
  (Android: botón; iPhone: mantener el dedo → Guardar en Fotos). Se enseña al cliente al que no le va el NFC.
- QR con corrección de errores alta (Q, aguanta arañazos) y en vectorial (nítido a cualquier tamaño).
- Prueba: `node tests/e2e-kit.mjs` (genera los PDF; `PDF=/carpeta` para guardarlos).

## Modo "móvil junto al TPV" — `movil.html` (pack Solo pedidos)

Para el móvil fijo con cargador al lado del TPV del bar. Misma clave que el panel de cocina
(`movil.html?r=<slug>&k=<clave cocina>`; el enlace sale en `alta.html` y en Gestión → Ajustes → Generar enlace de cocina).
- **Solo lo nuevo, en grande**: mesa, platos con sus notas, nota general y total. Los avisos de
  "llama al camarero" y "pide la cuenta" (con el total de la mesa) salen arriba en amarillo.
- El camarero lo mete en su TPV y toca **✓ Apuntado en el TPV** (el cliente ve "En preparación").
  "Últimos apuntados" con **Deshacer**. Los avisos se cierran con **✓ Atendido**.
- **Sonido fuerte** al llegar algo y, si nadie lo apunta, **se repite cada 20 s** (se puede quitar en ⋯).
  Vibración. El título de la pestaña cuenta los pendientes.
- **Pantalla encendida** (Wake Lock; si el móvil no lo permite, ⋯ explica cómo ponerlo en Ajustes).
- **Aguanta reinicios**: la sesión se guarda. Al abrir o reiniciar, el navegador no deja sonar nada hasta
  que alguien toque: sale una pantalla grande **"Toca aquí para activar el sonido"** y vuelve a salir si
  llega un pedido con el sonido sin activar. Se puede añadir a la pantalla de inicio como app ("Pedidos").
- **"Sin conexión"** en rojo (con pitido grave) si deja de llegar información; se quita solo al volver.
- **Pausar / Reanudar** los pedidos por el móvil.
- Usa las mismas RPC que el panel (`carta_cocina`): no cambia nada en la base de datos ni en `cocina.js`.
- Pendiente (opcional): avisos push con el móvil bloqueado (Web Push; en iPhone requiere añadirlo a la
  pantalla de inicio). Necesita una función en Supabase que envíe los avisos y claves VAPID.
- Prueba: `node tests/e2e-movil.mjs`.

## Flujo para vender a un bar nuevo

1. `alta.html` → clave de plataforma → **Nuevo restaurante** (ej. "Bar Casa Pepe", `casa-pepe`, 12 mesas).
2. Copia los 3 enlaces (carta, gestión, cocina). Las claves solo se muestran esa vez.
3. Abre el enlace de **gestión** y carga la carta (o que la cargue el dueño).
4. Gestión → *Mesas y NFC* → **🧾 Kit de instalación**: imprime los adhesivos (o PDF para la imprenta)
   y guarda en el móvil del camarero el QR de la carta general.
5. En un **Android con Chrome**: gestión → *Mesas y NFC* → **📶 Grabar NFC** en cada mesa y
   acerca la pegatina. Ver [docs/guia-nfc.md](docs/guia-nfc.md) (iPhone: app NFC Tools).
6. Abre el enlace de **cocina** en la tablet (se queda guardado) y toca **Activar sonido**.
   Pack Solo pedidos: en el móvil junto al TPV abre el enlace **movil.html** y toca "Toca aquí para activar el sonido".
7. Prueba: acerca un móvil al NFC de una mesa y pide algo.

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
  - **Funciona en el móvil**: en pantallas pequeñas la cabecera se compacta (nombre + iconos, pestañas debajo).
    Al imprimir se abre el ticket en su propia página (`ticket.html?t=…&imprimir=1`), que lanza imprimir / guardar PDF.
    Imprimir desde un iframe oculto no es fiable en iPhone ni en Android.
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

## Informes de ventas (tipo TPV)

Pestaña **📊 Informes** en Gestión. También sale en la tablet en los bares con facturación, o si se entra con la clave del dueño. Datos: `supabase/005_informes.sql` + `web/assets/informes.js`.

- **Periodos:** Hoy, Ayer, 7 días, 30 días, Este mes, Mes pasado, Este año o fechas a mano.
  - Todo se compara con el periodo anterior de la misma duración (▲/▼ %).
- **Cifras clave:** ventas (IVA incluido), pedidos, ticket medio, productos vendidos y mesas con consumo.
  - Si el bar factura: lo cobrado, el nº de tickets y el ticket medio por cuenta.
- **Gráficas** (pasa el dedo o el ratón por una barra para ver su valor):
  - ventas por hora, con la hora punta;
  - por día, o por mes si el periodo es largo;
  - por día de la semana.
- **Lo más vendido:** ranking por importe o por unidades, con buscador ("¿cuántas croquetas he vendido este mes?") y % sobre ventas.
- **Por categoría**, **mesas que más generan** y **platos sin ventas**: candidatos a cambiar o quitar de la carta.
- **Cobros e IVA** (si factura): por forma de pago, propinas, primer y último ticket, y la base y el IVA por tipo (lo del 303).
- **Servicio:**
  - tiempo medio de cocina (hasta "¡Listo!"), hasta servir y de respuesta a avisos;
  - llamadas al camarero, cuentas pedidas y cancelaciones.
  - Los tiempos salen de `carta.pedido_eventos`: un trigger apunta cada cambio de estado. Si fallara, nunca bloquea el pedido.
- **🖨 Cierre Z / informe** en papel de 80 mm. En el móvil se abre en su propia página para imprimir o guardar en PDF.
- **⬇ Excel:** resumen, productos, categorías, días, horas y mesas.

Las ventas salen de los pedidos que entran por el sistema; lo que se cobra en barra sin pasar por él no aparece.

## Modo TPV

Se activa solo en bares con facturación (o entrando al panel con la clave del dueño). Datos:
`supabase/006_tpv.sql`. En un bar sin datos fiscales, como Martínez hoy, el panel no cambia.

- **➕ Comandero táctil** (`assets/comandero.js`): el camarero mete pedidos desde la tablet o el móvil.
  - Para una mesa o para **🍺 Barra** (venta rápida, sin mesa).
  - Categorías, buscador, botones grandes, cantidades y nota por plato.
  - "Ya servido" para lo de barra: no pasa por cocina.
  - **Enviar a cocina** o **Enviar y cobrar**.
- **Plano de mesas:** en la pestaña Mesas se ven también las libres; un toque abre el comandero en esa mesa.
  - **⇄ Mover** pasa el consumo a otra mesa; si está ocupada, se juntan.
  - **➕ Añadir** suma un pedido a una mesa ocupada.
- **Dividir la cuenta:**
  - **por productos:** cada uno paga lo suyo con su propio ticket y la mesa sigue abierta hasta cobrarlo todo, con "Cobrar el resto";
  - **a partes iguales:** un ticket con el pago de cada persona, cada una con su forma de pago.
- **↩ Devoluciones**, desde Tickets → Ver: factura rectificativa por diferencias.
  - R5 si el original es un ticket, R1 si es una factura; serie propia `R`.
  - De todo o de algunos platos, con motivo y forma de devolución.
  - Si se devuelve entero, se puede **reabrir la mesa** para volver a cobrarla bien.
  - El original queda "rectificado" y los informes y la lista suman en neto.
- **📦 Stock** (Gestión → Stock):
  - unidades o raciones por producto, que cada pedido descuenta (trigger, sin tocar `carta_pedir`);
  - a 0 se marca **agotado** solo y el cliente ya no puede pedirlo;
  - si se cancela un pedido, el stock vuelve;
  - aviso "quedan pocas" en el panel y ajustes rápidos (+1, +10, merma).

**Cajón de dinero:** se conecta a la impresora de tickets (cable RJ11). En el driver de la impresora se
activa "abrir cajón al imprimir". **Datáfono:** el del banco funciona tal cual (se marca "Tarjeta").
Para que el importe pase solo al datáfono, ver "Siguientes pasos".

### TPV, segunda parte (`supabase/007_tpv2.sql`)

Lo que le faltaba para sustituir el TPV de un bar sin echar nada de menos:

- **💶 Caja** (pestaña del panel, `assets/caja.js`):
  - abrir con fondo de cambio; apuntar salidas (proveedor, banco…) y entradas, que no se pueden borrar;
  - "efectivo que debería haber en el cajón" en vivo: fondo + cobros en efectivo − devoluciones en efectivo + entradas − salidas;
  - **cerrar con arqueo**: recuento por billetes y monedas, descuadre, nota, hoja de cierre impresa e historial para reimprimir;
  - qué cobros entran en cada turno lo marca el registro SIF (correlativo): ninguno se pierde ni se repite entre turnos.
- **✎ Corregir** (tarjeta de la mesa): quitar una unidad, quitar la línea o **🎁 invitar** (precio 0).
  - Devuelve el stock, queda registrado en el informe de eventos y, sin líneas, el pedido se cancela.
  - Si la mesa ya tiene una parte cobrada, se corrige con una devolución (no se toca lo cobrado).
  - Mesa toda invitada: se cierra sin ticket (no hay venta).
- **Descuento al cobrar:** 5/10/15/20 %, otro % o un importe. Va en el ticket como líneas negativas por tipo de IVA.
  Un ticket con descuento solo se devuelve entero.
- **➕ Varios** en el comandero: concepto y precio libres (menú del día, tabaco…) con su IVA.
- **🧾 Hacer factura** de un ticket ya cobrado (Tickets → Ver): factura completa **F3** con los datos del cliente que
  sustituye al ticket (queda "sustituido"); no se cobra otra vez ni mueve caja. Los totales no la cuentan doble.
- **🖥 Puesto** (cada tablet): qué categorías ve en Comandas (cocina sin bebidas, barra solo bebidas) e
  **impresión automática** de cada comanda nueva. Sin diálogo: Chrome con `--kiosk-printing` y la impresora de
  tickets como predeterminada. El estado (preparando/listo) es del pedido entero.
- **Aviso "Sin conexión"** en el panel si deja de llegar información del servidor (también en bares sin TPV).

TODO(gestoría): confirmar F3 con "FacturasSustituidas" para la factura de un ticket, que comparta la serie `F`,
y el descuento como líneas negativas por tipo de IVA.

## Estructura

```
carta-nfc/
  supabase/001_esquema.sql   tablas (schema carta) + API SQL (funciones carta_*)
  supabase/002_demo.sql      restaurante demo "Bar La Demo" (re-ejecutable)
  supabase/003_fiscal.sql    facturación Fase 1: schema fiscal + funciones fiscal_*
  supabase/004_fiscal_tickets.sql  listado completo de tickets (fiscal_documentos)
  supabase/005_informes.sql  informes de ventas (carta_informe) + registro de eventos de pedidos
  supabase/006_tpv.sql       modo TPV: comandero, cuentas separadas, rectificativas, stock, mover mesas
  supabase/007_tpv2.sql      caja (arqueo), corregir/invitar, descuentos, "Varios", factura de un ticket (F3)
  web/                       sitio estático publicado en Netlify (sin build)
    index.html cocina.html admin.html alta.html ticket.html kit.html movil.html
    assets/ app.css api.js config.js cliente.* cocina.* admin.* ticket.js tickets.js informes.js comandero.js stock.js caja.js vendor/qrcode.js (MIT)
    w/pedidos.js             script para añadir pedidos a la web propia de un bar
    _redirects               /m/<codigo> y /r/<slug> → index.html
    _headers  netlify.toml
  clientes/martinez-bar/      página de pedidos propia de Martínez Bar (HTML único, publicada en Netlify)
  clientes/_plantilla/        plantilla de webs de bares: bar.config.mjs (ejemplo), estilos, motor de la carta
  clientes/bar-la-demo/       web de ejemplo con la plantilla (restaurante demo)
  herramientas/
    web-bar.mjs              genera la web + carta de un bar desde su bar.config.mjs
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
    e2e-movil.mjs            móvil junto al TPV: llegada, sonido y repetición, Apuntado/Deshacer, avisos, pausa, reinicio, sin conexión
    e2e-kit.mjs              kit de instalación: adhesivos A4/imprenta, PDF, carta general, imagen para la galería
    e2e-web-bar.mjs          plantilla de webs de bares: genera bar-la-demo, web (SEO, horario, mapa) y carta (pedir, mesa)
    sql-tests-informes.sql   informes: ventas, comparación, tiempos, productos, cobros, aislamiento
    e2e-informes.mjs         informes en gestión, tablet y móvil; cierre Z y Excel
    sql-tests-tpv.sql        comandero, stock, mover, cuentas separadas, rectificativas, cadena con negativos
    e2e-tpv.mjs              comandero (mesa y Barra), stock, plano, mover, dividir cuenta, devoluciones, móvil
    sql-tests-tpv2.sql       caja, corregir/invitar, Varios, descuentos, F3, mesa invitada, cadena
    e2e-tpv2.mjs             caja y arqueo, Varios, puesto, corregir, descuento, factura de un ticket, móvil
    humo-produccion.mjs      prueba rápida contra el sitio publicado (limpia después)
  docs/guia-nfc.md
  docs/brief-facturacion.md  plan del módulo de tickets, facturación, contabilidad e impuestos
```

## Infraestructura actual

- **Base de datos**: proyecto Supabase `giazlntdbfhnnfizmfao` (eu-west-1). Comparte proyecto con
  la app de facturación pero **aislado** en el schema `carta` + funciones `carta_*`; no toca
  ninguna tabla existente. La facturación vive en el schema `fiscal` + funciones `fiscal_*`.
  Para moverlo a un proyecto propio: ejecutar `001_esquema.sql`, `003_fiscal.sql`, `004_fiscal_tickets.sql`, `005_informes.sql`, `006_tpv.sql`, `007_tpv2.sql` (y
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
bash db-local.sh                      # crea la BD carta_test (001 + 003 … 007)
psql -h /tmp -p 54329 -U postgres -d carta_test -f sql-tests.sql   # → TODAS LAS PRUEBAS SQL OK
bash db-local.sh && psql -h /tmp -p 54329 -U postgres -d carta_test -v ON_ERROR_STOP=1 -f sql-tests-fiscal.sql
                                      # → TODAS LAS PRUEBAS FISCALES OK
node e2e-fiscal.mjs                   # levanta su propio servidor → E2E FISCAL OK
node e2e-martinez.mjs                 # página de Martínez, sin tocar producción → E2E MARTÍNEZ OK
node e2e-movil.mjs                    # móvil junto al TPV → E2E MÓVIL OK
node e2e-kit.mjs                      # kit de instalación (adhesivos y PDF) → E2E KIT OK
node e2e-web-bar.mjs                  # plantilla de webs de bares (requiere cd ../herramientas && npm install) → E2E WEB BAR OK
bash db-local.sh && psql -h /tmp -p 54329 -U postgres -d carta_test -v ON_ERROR_STOP=1 -f sql-tests-informes.sql
node e2e-informes.mjs                 # → E2E INFORMES OK
bash db-local.sh && psql -h /tmp -p 54329 -U postgres -d carta_test -v ON_ERROR_STOP=1 -f sql-tests-tpv.sql
node e2e-tpv.mjs                      # → E2E TPV OK
bash db-local.sh && psql -h /tmp -p 54329 -U postgres -d carta_test -v ON_ERROR_STOP=1 -f sql-tests-tpv2.sql
node e2e-tpv2.mjs                     # → E2E TPV2 OK
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
  - Fase 3: contabilidad (el cierre de caja ya está, ver "TPV, segunda parte");
  - Fase 4: borradores 303/390;
  - Fase 5: producción con Martínez, cuando haya datos fiscales y certificado.
- **Datáfono integrado:** que el importe pase solo al datáfono y vuelva "pagado" (Stripe Terminal o SumUp).
- **Impresora de cocina/barra automática** (Star CloudPRNT / Epson Server Direct Print) y apertura del cajón solo en efectivo.
- **Pago online** no incluido (se cobra en mesa/barra como siempre). Siguiente paso natural: Stripe/Bizum.
- Panel de cocina por sondeo cada 3 s (robusto con WiFi de bar); no usa WebSockets.
- **Sin internet no se puede pedir ni cobrar** (todo está en la nube). Recomendado: router 4G de respaldo
  (o el móvil compartiendo datos) para que la tablet no se quede nunca sin conexión.
- Impresión vía diálogo del navegador; impresoras térmicas que funcionen como impresora del
  sistema valen. Impresión automática sin diálogo requeriría un agente local.
- Carta propia de la plataforma en un idioma (español); con `pedidos.js` se usan los idiomas de la web del bar.
- Suplementos tipo "carne extra +2,5 €" no son opciones con precio: el cliente lo pide en la nota
  del plato y se cobra en mesa.
- Si el bar cambia precios en su web, hay que volver a ejecutar `importar-carta.mjs` (el precio
  que vale siempre es el de la base de datos).
- Netlify muestra un badge "Powered by Netlify" (se cierra con su ✕); el diseño deja hueco para
  que nunca tape el botón del pedido.
