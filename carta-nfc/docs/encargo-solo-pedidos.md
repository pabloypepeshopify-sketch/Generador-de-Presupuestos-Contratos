# Encargo para Claude Code: Carta NFC · Pack "Solo pedidos"

> **Para Pablo:** abre un chat nuevo de Claude Code sobre el repo
> `pabloypepeshopify-sketch/Generador-de-Presupuestos-Contratos` y pega este documento entero.
> Las **claves** (plataforma, admin y cocina de cada bar) y los **códigos de mesa** de Martínez
> pégalas aparte en el chat, **nunca** en el repo: es público.
> La parte de TPV, cobros, caja y facturación (VERI\*FACTU) se queda en el otro chat; este chat
> nuevo solo se ocupa del pack de pedidos.

---

## 1. Quién soy y qué vendo

- Soy **Pablo** (VISAX AI): 17 años, estudiante universitario y con poco tiempo.
  Vendo NFC y webs a bares y restaurantes.
- Respuestas **cortas y en español**, sin rodeos. Explícame las cosas en pocas palabras.
- **Lo que vendo, el pack "Solo pedidos":**

| Concepto | Precio |
|---|---|
| Web premium del bar | 400 € |
| Menú digital con sistema de pedidos, a gusto del bar | 300 € |
| Tarjeta o adhesivo NFC por mesa | 15 €/mesa |
| QR impreso por mesa, de respaldo | aparte (más caro: material bueno que no se gaste) |
| Cuota de hosting y soporte, con cambios en mis días laborables y en mi horario | 29 €/mes |

- **Cómo funciona en el bar:**
  1. El cliente acerca el móvil al NFC de su mesa, o escanea su QR.
  2. Se abre la carta y hace su pedido.
  3. El pedido llega a un **móvil fijo junto al TPV del bar** (con soporte de carga y la pantalla siempre encendida).
  4. El camarero lo apunta en su TPV **sin ir mesa por mesa**. El bar sigue cobrando con su TPV de siempre.
- **Si a un cliente no le funciona el NFC:** el camarero le enseña desde su móvil el QR de la
  **carta general** y el cliente elige su mesa.
- **Prioridad:** que sea muy fácil de montar y de mantener. Nada de hardware complicado ni de facturación.

## 2. Lo que YA existe (no lo rehagas)

Todo está hecho y en producción. Un bar es "solo pedidos" cuando **no tiene datos fiscales**:
así funciona Martínez Bar hoy, y el panel no enseña cobros, caja ni tickets.

- **Repo:** carpeta `carta-nfc/`, rama `claude/nfc-menu-table-orders-t40e0t`.
  Crea tu rama a partir de esta y **no hagas push a esa rama**: es la del otro chat.
- **Lee primero `carta-nfc/README.md`.** Están las secciones "Qué incluye", "pedidos.js",
  "Flujo para vender a un bar nuevo", "Seguridad", "Pruebas en local" y `docs/guia-nfc.md`.

**Para el cliente**
- `index.html`: carta con alérgenos, carrito con notas, estado del pedido, llamar al camarero y pedir la cuenta.
- `/m/<codigo>` es el enlace de cada mesa, que se graba en el NFC.
- `/r/<slug>` es la carta general: el cliente elige su mesa (se activa en Ajustes → "permitir elegir mesa").

**Panel del bar** — `cocina.html?r=<slug>&k=<clave cocina>`
- Comandas (Nuevos, En preparación, Listos), sonido y avisos.
- Mesas, con "Cobrada · liberar mesa".
- Imprimir la comanda.
- Pausar los pedidos.
- Funciona en móvil.

**Gestión del dueño** — `admin.html`
- Carta, alérgenos, fotos y "Agotado".
- Mesas y NFC: grabar el NFC desde Chrome en Android, QR por mesa, "🖨 Imprimir QRs de las mesas"
  y QR de la carta general.
- Ajustes, claves e informes.
- Con la clave de admin el panel muestra además el comandero y el stock. Es opcional y no hace falta para este pack.

**Tus herramientas** — `alta.html`
- Alta de bares, listado con actividad, **activar o desactivar** (para impagos) y resetear la clave de admin.
- Necesita la clave de plataforma.

**Web propia del bar**
- `web/w/pedidos.js`: una línea en su web y esa web admite pedidos.
- Ejemplo de página propia de un bar: `clientes/martinez-bar/index.html`.
- `herramientas/importar-carta.mjs`: carga la carta desde la web del bar.

**Demo para enseñar**
- Carta: https://carta-nfc-pedidos.netlify.app/m/080f59f08e
- Panel: https://carta-nfc-pedidos.netlify.app/cocina.html?r=demo&k=demo-cocina

## 3. Infraestructura

- **Supabase:** proyecto `giazlntdbfhnnfizmfao`.
  - Schemas privados `carta` y `fiscal`, con RLS y sin políticas.
  - El navegador solo llama a funciones `public.carta_*`, que son `SECURITY DEFINER` con `search_path=''`.
  - Cada función valida la clave con `carta._auth(slug, clave, 'cocina'|'admin')`.
  - La clave publishable de `web/assets/config.js` es pública por diseño.
- **Netlify:**
  - `carta-nfc-pedidos` (id `a0351380-6d2a-45a1-9f02-ee47ba8f247e`) publica la carpeta `carta-nfc/web/`, sin build.
    Se despliega con la herramienta de Netlify `deploy-site` y el comando que devuelve, ejecutado dentro de `carta-nfc/web`.
  - `martinez-bar-pedidos` (id `c41ec2b4-1862-42e0-9857-d19a21a88fee`) es la página de pedidos de Martínez,
    **en producción**. No la publiques sin mi OK.
- **Web de marketing de Martínez:** `https://martinez-bar.vercel.app`, en Vercel. **No se toca.**

## 4. Reglas (obligatorias)

1. **Martínez Bar es un cliente real.** No crees pedidos en `martinez-bar` sin mi OK, porque
   aparecen en la tablet del bar. Las pruebas, con el restaurante `demo` o con la base local.
2. **No rompas las RPC ni las páginas actuales.** Las migraciones van en archivos nuevos
   `supabase/0NN_*.sql`:
   - idempotentes (`create or replace`, `if not exists`) y **sin `drop`**;
   - antes de numerar, mira `supabase/` y la lista de migraciones remotas: el otro chat también crea migraciones;
   - si son grandes, aplícalas en Supabase por partes y comprueba después que local y remoto coinciden.
3. **No toques la parte del otro chat:**
   - `003_fiscal.sql`, `004`, `006_tpv.sql`, `007_tpv2.sql`;
   - las funciones `fiscal_*`, `carta_tpv` y `carta_informe`;
   - `web/assets/caja.js`, `comandero.js`, `ticket.js`, `tickets.js` y `stock.js`, y los bloques de modo TPV y cobro de `cocina.js`.
   Si necesitas cambiar algo compartido (`carta_pedir`, `carta_cocina`, `carta._pedido_json`,
   `cocina.js`), hazlo **compatible hacia atrás** y avísame.
4. **El repo es público.** Nunca subas claves, códigos de mesa de bares reales, NIF reales ni certificados.
   Antes de cada commit, busca en el diff las claves que te pase.
5. **Seguridad:**
   - escapa todo texto que venga de la base de datos al pintar HTML;
   - el servidor valida los importes (el móvil nunca manda precios);
   - mantén el anti-broma (límite de pedidos por mesa).
6. Si algo legal es dudoso, déjalo **configurable y marcado con `TODO(gestoría)`**. No lo des por hecho.
7. Antes de hacer push, pasa las pruebas: `bash tests/db-local.sh`, `sql-tests.sql`, `e2e.mjs`,
   `e2e-widget.mjs` y `e2e-martinez.mjs`; el README explica cómo. Después de desplegar, prueba en producción **solo con `demo`**.

## 5. Qué te pido (por prioridad)

1. **Plantilla de "web premium + menú digital"** que pueda reutilizar en cada bar:
   - una página bonita por bar (portada, fotos, horario, mapa, reseñas, contacto) y el menú
     digital con pedidos integrado (con `pedidos.js` o una página propia como la de Martínez);
   - colores, logo, fuentes y textos fáciles de cambiar desde un solo archivo de configuración por bar;
   - carpeta `clientes/<slug>/` y un sitio de Netlify por bar;
   - rápida en el móvil, accesible y con SEO local básico.
2. **Kit de instalación imprimible:**
   - adhesivo por mesa con nombre de la mesa, "Acerca tu móvil o escanea", el QR, el logo del bar y la zona del NFC;
   - en formato A4 para recortar o para enviarlo a imprenta;
   - y un **QR de la carta general** para la galería del móvil del camarero.
3. **Modo "móvil junto al TPV"** del panel, pensado para ese uso:
   - letra grande, solo lo nuevo, sonido fuerte y que la pantalla no se apague;
   - debe aguantar reinicios: si hace falta tocar para activar el sonido, que lo diga claro;
   - opcional, si te sobra tiempo: avisos push al móvil del camarero aunque esté bloqueado
     (Web Push; en iPhone necesita el panel añadido a la pantalla de inicio).
4. **Mis clientes y cobros** (en `alta.html` o una página para mí):
   - lista de bares con fecha de alta, cuota (29 €), próximo cobro y si está pagado;
   - botón de desactivar por impago (ya existe "activar/desactivar").
   - Sin pasarela de pago: solo control.
5. **Papeles de venta:**
   - hoja de venta de 1 página con la demo y la cuenta de "una caña más por mesa al día";
   - manual de 1 página para el camarero;
   - checklist de instalación;
   - plantilla de contrato con la cuota, el horario de soporte y el corte del servicio por impago,
     marcada para que la revise una gestoría.

En cada punto: hazlo, pruébalo en local y con `demo`, actualiza el README, haz commit y push a tu rama
y dime en dos líneas qué has hecho y qué falta.

## 6. Cómo monto un bar (el procedimiento que hay que facilitar)

1. Firmo con el bar y le pido el logo, las fotos, la carta con precios, cuántas mesas tiene y sus nombres.
2. `alta.html` → nuevo restaurante. Guardo las 3 claves fuera del repo.
3. Cargo la carta (importar de su web o a mano) y creo su web premium + menú.
4. Grabo el NFC de cada mesa desde Chrome en Android (ver `docs/guia-nfc.md`) y pego el adhesivo con su QR.
5. Pongo el móvil con soporte de carga junto al TPV, con el panel abierto y "Activar sonido" pulsado.
6. Hago una prueba de verdad con el camarero y le paso el QR de la carta general.
7. Soporte: 29 €/mes, en mi horario. Si no paga, desactivo el bar en `alta.html`.

## 7. Notas legales (para tenerlas presentes, no para resolver)

- El pack **no emite tickets ni facturas**: la pre-cuenta dice "no válido como factura".
  En principio no le aplica VERI\*FACTU; TODO(gestoría): confirmarlo.
- Tengo 17 años: para facturar mis ventas, lo consultaré con una gestoría y mis padres. No hace falta resolverlo en código.
- No guardamos datos personales de los clientes del bar. Si se añade algo (nombre, teléfono), avísame antes: entra el RGPD.
