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

## Estructura

```
carta-nfc/
  supabase/001_esquema.sql   tablas (schema carta) + API SQL (funciones carta_*)
  supabase/002_demo.sql      restaurante demo "Bar La Demo" (re-ejecutable)
  web/                       sitio estático publicado en Netlify (sin build)
    index.html cocina.html admin.html alta.html
    assets/ app.css api.js config.js cliente.* cocina.* admin.* vendor/qrcode.js (MIT)
    _redirects               /m/<codigo> y /r/<slug> → index.html
    _headers  netlify.toml
  tests/
    sql-tests.sql            ~45 comprobaciones de la API SQL como rol anon
    servidor-local.mjs       imita Supabase (RPC) + Netlify (rewrites) en local
    e2e.mjs                  navegador real: admin → cliente → cocina → cuenta → cobro
    humo-produccion.mjs      prueba rápida contra el sitio publicado (limpia después)
  docs/guia-nfc.md
```

## Infraestructura actual

- **Base de datos**: proyecto Supabase `giazlntdbfhnnfizmfao` (eu-west-1). Comparte proyecto con
  la app de facturación pero **aislado** en el schema `carta` + funciones `carta_*`; no toca
  ninguna tabla existente. Para moverlo a un proyecto propio: ejecutar `001_esquema.sql` (y
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
bash db-local.sh                      # crea la BD carta_test
psql -h /tmp -p 54329 -U postgres -d carta_test -f sql-tests.sql   # → TODAS LAS PRUEBAS SQL OK
node servidor-local.mjs &             # http://localhost:8787
node e2e.mjs                          # → E2E OK
# contra producción (usa la mesa de la demo):
MESA=080f59f08e node humo-produccion.mjs
```

## Límites conocidos / siguientes pasos

- **Pago online** no incluido (se cobra en mesa/barra como siempre). Siguiente paso natural: Stripe/Bizum.
- Panel de cocina por sondeo cada 3 s (robusto con WiFi de bar); no usa WebSockets.
- Impresión vía diálogo del navegador; impresoras térmicas que funcionen como impresora del
  sistema valen. Impresión automática sin diálogo requeriría un agente local.
- Carta en un idioma (español).
- Netlify muestra un badge "Powered by Netlify" (se cierra con su ✕); el diseño deja hueco para
  que nunca tape el botón del pedido.
