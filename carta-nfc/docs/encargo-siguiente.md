# Encargo para Claude Code: dejar lista para vender la Carta NFC (pedidos + móvil del camarero)

> **Para Pablo:** abre un chat nuevo de Claude Code sobre el repo
> `pabloypepeshopify-sketch/Generador-de-Presupuestos-Contratos` y pega este documento entero.
> Las claves (plataforma, admin y cocina) pégalas aparte en el chat, **nunca** en el repo: es público.

---

## 0. Alcance (léelo primero)

- **Solo** la carpeta `carta-nfc/`: la carta digital con pedidos que usa el cliente y lo que le llega al
  camarero (móvil junto al TPV / panel de comandas), más el kit de pegatinas y los papeles de venta.
- **No toques nada fuera de `carta-nfc/`.** La raíz del repo es la web de VISAX (Next.js en Vercel): no se toca.
- **No toques Martínez** (`clientes/martinez-bar/`, sitio `martinez-bar-pedidos`, `martinez-bar.vercel.app`)
  ni crees pedidos en `martinez-bar`. Pruebas solo con el restaurante `demo` o con la base local.
- La parte de TPV, cobros, caja y facturación (VERI\*FACTU) es de otro chat: no la toques
  (`003_fiscal.sql`, `004`, `006_tpv.sql`, `007_tpv2.sql`, funciones `fiscal_*`, `carta_tpv`, `carta_informe`,
  `caja.js`, `comandero.js`, `ticket.js`, `tickets.js`, `stock.js` y los bloques TPV/cobro de `cocina.js`).
- Respuestas **cortas y en español**. Soy Pablo, 17 años, poco tiempo.

## 1. Dónde está todo

- **Rama de trabajo:** `claude/solo-pedidos-pack` (sale de `claude/nfc-menu-table-orders-t40e0t`, que es la
  del otro chat: **no hagas push a esa**). Crea tu rama desde `claude/solo-pedidos-pack`.
- **Lee primero `carta-nfc/README.md`**, sobre todo: "Qué incluye", "Kit de instalación", "Modo móvil junto
  al TPV", "Mis clientes y cobros", "Papeles de venta", "Flujo para vender a un bar nuevo", "Seguridad" y
  "Pruebas en local".
- **Supabase:** proyecto `giazlntdbfhnnfizmfao`. Schemas privados `carta` y `fiscal`; el navegador solo llama
  a funciones `public.carta_*` (`SECURITY DEFINER`, `search_path=''`). La migración `008_cuotas.sql` ya está
  aplicada en remoto (nombre `carta_nfc_cuotas`) y coincide con la local.
- **Netlify:** sitio `carta-nfc-pedidos` (id `a0351380-6d2a-45a1-9f02-ee47ba8f247e`) publica `carta-nfc/web/`
  sin build. Se despliega con la herramienta de Netlify `deploy-site` y el comando que devuelve, ejecutado
  **dentro de `carta-nfc/web`**.

## 2. Qué ya está hecho (no lo rehagas)

| Pieza | Archivo | Estado |
|---|---|---|
| Carta del cliente (NFC de mesa `/m/<codigo>`, carta general `/r/<slug>`) | `web/index.html`, `assets/cliente.js` | En producción |
| Panel de comandas (tablet) | `web/cocina.html` | En producción |
| **Móvil junto al TPV**: solo lo nuevo en grande, "Apuntado en el TPV", sonido que se repite, pantalla encendida, "toca para activar el sonido" tras reiniciar, sin conexión, pausar | `web/movil.html`, `assets/movil.{js,css}`, `movil.webmanifest` | Hecho y probado, **sin publicar** |
| **Kit de instalación**: adhesivo por mesa (A4 o imprenta) + PNG del QR de la carta general para la galería del camarero | `web/kit.html`, `assets/kit.js` (botón en Gestión → Mesas y NFC) | Hecho y probado, **sin publicar** |
| **Mis clientes y cobros** (cuota 29 €/mes, quién debe, desactivar por impago) | `web/clientes.html`, `assets/clientes.js`, `supabase/008_cuotas.sql` | BD aplicada, página **sin publicar** |
| **Papeles**: hoja de venta, guía del camarero, checklist, contrato (TODO gestoría) | `web/papeles/` | Hecho, **sin publicar** |
| Plantilla de web premium por bar (opcional, no prioritaria ahora) | `clientes/_plantilla/`, `herramientas/web-bar.mjs` | Hecho |

**Por qué no está publicado:** el 15/10/2026 Netlify rechazó el despliegue con
"Skipped due to account credit usage exceeded" (la cuenta se quedó sin créditos). Producción sigue con la
versión anterior y funciona.

## 3. Qué te pido (por prioridad)

1. **Publicar.** Si Netlify ya tiene créditos: desplegar `carta-nfc/web` desde la rama `claude/solo-pedidos-pack`.
   - Antes de desplegar, comprueba que producción no tiene cambios más nuevos que la rama
     (compara con `curl` `assets/cocina.js`, `assets/api.js`, `assets/admin.js` de producción con los del repo):
     si el otro chat ha publicado algo más nuevo, **no lo pises**: avísame.
   - Si sigue sin créditos, dímelo en una línea y para. No muevas nada a otro hosting sin mi OK.
2. **Probar en producción solo con `demo`**, en este orden:
   - Carta: `https://carta-nfc-pedidos.netlify.app/m/080f59f08e` → pedir algo.
   - Móvil del camarero: `https://carta-nfc-pedidos.netlify.app/movil.html?r=demo&k=demo-cocina` → suena,
     "Apuntado", el cliente ve "En preparación". Deja los pedidos de prueba apuntados.
   - `kit.html` (desde Gestión de la demo), `clientes.html` y `papeles/`.
   - Pásame los enlaces que funcionan.
3. **Repasar la carta del cliente para vender** (`index.html` + `cliente.js`, es lo que verá cada bar sin web
   propia): que se vea bien en el móvil, con fotos de producto si las hay, alérgenos, color del bar, y sin
   errores. Cambios pequeños y compatibles; no rompas las RPC. Capturas en iPhone y Android (Playwright) antes y después.
4. **Preparar la demo para enseñar**: carta de `demo` con buenos nombres, descripciones y fotos (URLs https de
   imágenes libres de derechos), y que `movil.html` de la demo quede bonito. Sin tocar la estructura de la BD.
5. **Opcional, si sobra tiempo:** avisos push al móvil del camarero con la pantalla bloqueada (Web Push).
   Necesita claves VAPID y una Edge Function de Supabase que envíe el aviso al llegar un pedido. En iPhone
   solo funciona con el panel añadido a la pantalla de inicio. Pídeme OK antes de crear claves o funciones.

En cada punto: hazlo, pruébalo en local y con `demo`, actualiza el README, haz commit y push a tu rama y
dime en dos líneas qué has hecho y qué falta.

## 4. Reglas (obligatorias)

1. Martínez Bar es un cliente real: nada de pedidos ni despliegues en lo suyo sin mi OK.
2. Migraciones nuevas en archivos `carta-nfc/supabase/0NN_*.sql`, idempotentes (`create or replace`,
   `if not exists`) y **sin `drop`**. Ya existe `008_cuotas.sql`: la siguiente es `009`. Antes de numerar,
   mira `supabase/` y la lista de migraciones remotas (el otro chat también crea). Comprueba después que
   local y remoto coinciden.
3. Repo público: nunca subas claves, códigos de mesa de bares reales, NIF reales ni certificados. Busca en el
   diff las claves que te pase antes de cada commit. (El código de mesa de la demo `080f59f08e` y la clave
   `demo-cocina` son públicos.)
4. Seguridad: escapa todo texto de la BD al pintar HTML; el servidor pone los precios; mantén el límite de
   pedidos por mesa.
5. Lo legal dudoso: configurable y marcado `TODO(gestoría)`. No guardamos datos personales de los clientes
   del bar; si hiciera falta alguno, avísame antes (RGPD).
6. Antes de cada push pasa las pruebas (cómo, en "Pruebas en local" del README). Postgres local en
   `/tmp:54329`; si no está arrancado, arráncalo (`initdb` + `pg_ctl` con `-p 54329 -k /tmp`).
   - Obligatorias: `bash tests/db-local.sh`, `sql-tests.sql`, `sql-tests-cuotas.sql`, `e2e.mjs`,
     `e2e-widget.mjs` (necesita la copia de Martínez: `herramientas/espejo-web.py`), `e2e-martinez.mjs`,
     `e2e-movil.mjs`, `e2e-kit.mjs`, `e2e-clientes.mjs`, `e2e-papeles.mjs`.
   - Si tocas algo compartido, pasa también las del otro chat: `e2e-fiscal`, `e2e-informes`, `e2e-tpv`, `e2e-tpv2`
     y sus `sql-tests-*.sql`.
7. Después de desplegar, prueba en producción **solo con `demo`**.

## 5. Cómo se monta un bar (lo que hay que facilitar)

1. Firmo y pido logo, carta con precios, nº de mesas y sus nombres.
2. `alta.html` → nuevo restaurante. Guardo las claves fuera del repo. Los enlaces incluyen el del
   **móvil junto al TPV** (`movil.html?r=…&k=…`).
3. Cargo la carta en Gestión (o con `herramientas/importar-carta.mjs`).
4. Gestión → Mesas y NFC → **Kit de instalación**: imprimo los adhesivos y guardo el QR de la carta general
   en la galería del camarero.
5. Grabo el NFC de cada mesa desde Chrome en Android (`docs/guia-nfc.md`) y pego los adhesivos.
6. Móvil con cargador junto al TPV: abro `movil.html`, lo añado a la pantalla de inicio y toco "activar sonido".
7. Prueba real con el camarero y le dejo la guía (`papeles/manual-camarero.html`).
8. Apunto la cuota en `clientes.html`. Si no paga, "Desactivar por impago".

## 6. Notas legales (tener presentes, no resolver)

- El pack no emite tickets ni facturas; el bar cobra con su TPV. TODO(gestoría): confirmar que no aplica VERI\*FACTU.
- Tengo 17 años: quién firma el contrato y cómo facturo lo veré con una gestoría y mis padres. El contrato de
  `papeles/contrato.html` es un borrador marcado TODO(gestoría).
