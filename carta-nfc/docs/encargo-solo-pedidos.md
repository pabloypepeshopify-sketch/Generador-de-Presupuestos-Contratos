# Encargo para Claude Code: Carta NFC "Solo pedidos" (versión sencilla)

> **Para Pablo:** abre un chat nuevo de Claude Code sobre el repo
> `pabloypepeshopify-sketch/Generador-de-Presupuestos-Contratos` y pega este documento entero.
> Las **claves** (plataforma, admin y cocina) y los **códigos de mesa** pégalas aparte en el chat,
> **nunca** en el repo: es público.

---

## 1. Qué quiero, en una frase

Una versión **sencilla** del sistema que ya tenemos: el cliente pide desde la mesa (NFC o QR) y
**el pedido le llega directamente al bar**. Nada más.
Es el sistema actual "con cinco pasos atrás": sin TPV, sin cobros, sin caja, sin facturación.

Monta **un ejemplo completo con la carta y el estilo de Martínez Bar** para enseñarlo a otros bares.

## 2. Quién soy y cómo lo vendo

- Soy **Pablo** (VISAX AI): 17 años, estudiante y con poco tiempo. Respuestas **cortas y en español**.
- **Lo que vendo:** web premium (400 €) + menú digital con pedidos (300 €) + NFC por mesa con adhesivo
  (15 €/mesa) + QR de respaldo + cuota de 29 €/mes (hosting y soporte en mi horario).
- **En el bar:**
  - el bar sigue cobrando con **su TPV de siempre**;
  - los pedidos llegan a un **móvil fijo junto al TPV**, con soporte de carga y la pantalla siempre encendida;
  - el camarero los apunta en su TPV sin ir mesa por mesa.
- **Si a un cliente no le va el NFC:** el camarero le enseña desde su móvil el **QR de la carta general**
  y el cliente elige su mesa.

## 3. Qué se queda y qué se quita

**SE QUEDA (lo justo):**

1. **Cliente (móvil)**
   - Carta por categorías con fotos, precios y alérgenos.
   - Carrito con nota por plato y el botón **Enviar pedido**.
   - Estado del pedido: recibido o listo.
   - Botones **Llamar al camarero** y **Pedir la cuenta**.
   - La mesa viene del NFC o QR (`/m/<codigo>`). Con la carta general (`/r/<slug>`), el cliente elige su mesa.
2. **Panel del bar (en el móvil o tablet junto al TPV)**
   - Lista de pedidos **nuevos**, con letra grande, **sonido fuerte** y la pantalla siempre encendida.
     - Un toque: "✓ Apuntado".
     - Si el bar lo pide, dos estados como mucho: nuevo y apuntado/servido.
   - Avisos de "llama al camarero" y "pide la cuenta".
   - Pestaña Mesas: lo que lleva cada mesa, **🖨 Imprimir ticket** (por si falla el TPV) y "Cobrada · liberar mesa".
3. **Registro de datos e informes**
   - Todo pedido queda guardado.
   - Informe sencillo: ventas por día y por hora, lo más pedido, mesas y comparación con el periodo anterior.
   - Excel del periodo.
4. **Gestión del dueño**
   - Carta: productos, precios, fotos y "Agotado" en un toque.
   - Mesas con NFC y QR: grabar el NFC desde Chrome en Android, QR por mesa, hoja para imprimir los QR
     y QR de la carta general.
   - Ajustes básicos: nombre, color, abrir o pausar los pedidos.
5. **Mi página de alta** (`alta.html`): dar de alta un bar y activarlo o desactivarlo (impagos).

**El ticket impreso:** es una **pre-cuenta "no válida como factura"**, el ticket que ya existe en "Mesas".
No metas VERI\*FACTU ni numeración fiscal. TODO(gestoría): si un día se cobra con este ticket porque falla
el TPV, el bar debe emitir después su factura en el TPV.

**SE QUITA (no debe aparecer en la versión sencilla):**
- Modo TPV y comandero.
- Cobros con forma de pago, cuentas separadas, propinas, descuentos y devoluciones.
- Tickets fiscales, facturas, VERI\*FACTU y la pestaña Tickets.
- Caja y arqueo.
- Stock.
- Mover y juntar mesas, "Varios", puestos de cocina/barra y "Corregir".

## 4. Cómo hacerlo (para no romper nada)

- **No borres ni cambies la versión completa** (`carta-nfc/web/`): es la del otro chat (TPV) y está en producción.
- Haz la versión sencilla como **un frontal nuevo y separado**, por ejemplo `carta-nfc/lite/`:
  - copia y recorta de `web/` lo que se queda: `index.html`, `cliente.*`, `cocina.*`, `admin.*`,
    `api.js`, `config.js`, `app.css` y las partes de informes;
  - quita todo lo de la lista "SE QUITA";
  - menos código es mejor;
  - publícalo en un **sitio nuevo de Netlify** (por ejemplo `pedidos-nfc-lite`).
- **Base de datos: usa la que ya existe**, sin migraciones nuevas si se puede. Las funciones que necesitas ya están:
  - `carta_carta`, `carta_pedir` y las de estado (en `supabase/001_esquema.sql`);
  - `carta_cocina`, `carta_admin` y `carta_plataforma`;
  - `carta_informe` (en `005_informes.sql`).
  Un bar sin datos fiscales ya funciona en modo "solo pedidos".
  Si necesitas una migración: archivo nuevo `supabase/0NN_*.sql`, idempotente y **sin `drop`**.
  Antes de numerarlo, mira las que ya existen, porque el otro chat también crea migraciones.
- Trabaja en **tu propia rama**, creada a partir de `claude/nfc-menu-table-orders-t40e0t`.
  No hagas push a esa rama.
- Lee antes `carta-nfc/README.md` ("Qué incluye", "pedidos.js", "Flujo para vender a un bar nuevo",
  "Seguridad", "Pruebas en local") y `docs/guia-nfc.md`.

## 5. El ejemplo de Martínez Bar

- Crea un restaurante **nuevo de demostración**: `martinez-demo`, con el nombre "Martínez Bar (demo)" y unas 10 mesas.
- Carga su carta con `herramientas/importar-carta.mjs` desde su web pública
  `https://martinez-bar.vercel.app/carta.html`; trae los platos y los tamaños.
- Dale el estilo de Martínez: negro y amarillo, Instrument Serif + Montserrat. Fíjate en
  `clientes/martinez-bar/index.html`.
- **No toques el restaurante real `martinez-bar`:**
  - es un cliente real y sus pedidos salen en la tablet del bar;
  - no crees pedidos en él;
  - no redespliegues `martinez-bar-pedidos`.
  Pasar al Martínez real a la versión sencilla: solo con mi OK.
- **Al terminar, dame 3 enlaces** del ejemplo:
  - la carta de una mesa;
  - la carta general;
  - el panel del bar.

## 6. Infraestructura

- **Supabase:** proyecto `giazlntdbfhnnfizmfao`.
  - Schemas privados `carta` y `fiscal`, con RLS y sin políticas.
  - El navegador solo llama a `public.carta_*`, que son `SECURITY DEFINER` con `search_path=''`.
  - Las claves se validan con `carta._auth(slug, clave, 'cocina'|'admin')`.
  - La clave publishable de `config.js` es pública por diseño.
- **Netlify:**
  - `carta-nfc-pedidos` (`a0351380-6d2a-45a1-9f02-ee47ba8f247e`) es la versión completa. **No la toques**.
  - `martinez-bar-pedidos` (`c41ec2b4-1862-42e0-9857-d19a21a88fee`) es producción de Martínez. **No la toques**.
  - Para desplegar: herramienta de Netlify `deploy-site` y el comando que devuelve, ejecutado dentro de la carpeta.
- **Web de marketing de Martínez:** `https://martinez-bar.vercel.app` (Vercel). **No se toca**; solo se lee la carta.

## 7. Reglas

1. El repo es público: nada de claves, códigos de mesa de bares reales, NIF ni certificados.
   Antes de cada commit, revisa el diff.
2. Escapa todo texto que venga de la base de datos al pintar HTML. El servidor pone los precios, nunca el móvil.
3. Pruebas: con la base local (`tests/db-local.sh`, `tests/servidor-local.mjs`) y en producción
   **solo con `demo` o `martinez-demo`**. Las pruebas que ya existen tienen que seguir pasando.
   Añade una e2e de la versión sencilla: pedir → llega al panel → imprimir ticket → liberar mesa.
4. Que se vea bien en el móvil (es donde se usa el panel): sin scroll horizontal y con botones grandes.
5. Si algo legal es dudoso, déjalo configurable y marcado con `TODO(gestoría)`.
6. Al terminar:
   - README de la versión sencilla, con cómo montar un bar en 15 minutos;
   - commit y push a tu rama;
   - y dime en pocas líneas qué has hecho, los 3 enlaces del ejemplo y qué falta.

## 8. Cómo se monta un bar (lo que la versión sencilla debe facilitar)

1. `alta.html` → nuevo restaurante. Guardo las claves fuera del repo.
2. Cargo la carta (importar de su web o a mano).
3. Grabo el NFC de cada mesa y pego el adhesivo con su QR.
4. Pongo un móvil con soporte de carga junto al TPV, con el panel abierto y el sonido activado.
5. Le paso al camarero el QR de la carta general.
6. Hacemos una prueba con un pedido real y listo.
