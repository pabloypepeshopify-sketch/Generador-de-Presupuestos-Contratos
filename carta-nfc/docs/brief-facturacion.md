# Brief para Claude Code — Módulo de tickets, facturación, contabilidad e impuestos (Carta NFC)

> Autor: Pablo (VISAX AI) · Fecha: 14/10/2026 · Cliente piloto: **Martínez Bar** (Sanlúcar de Barrameda, Cádiz)
> Repo: `pabloypepeshopify-sketch/Generador-de-Presupuestos-Contratos` · carpeta `carta-nfc/`
> Rama de trabajo actual: `claude/nfc-menu-table-orders-t40e0t`

---

## 1. Objetivo

Hoy VISAX vende a restaurantes un sistema **Carta NFC**: el cliente toca el NFC de su mesa, pide desde el móvil y la comanda llega al panel de cocina. Queremos que, **cuando vendamos este sistema, incluya también la parte de cobro y fiscalidad**:

1. **Ticket** al cobrar la mesa: factura simplificada legal en España, con requisitos **VERI\*FACTU**.
2. **Facturación**: numeración por series, factura completa cuando el cliente la pida, rectificativas y anulaciones.
3. **Contabilización**: asientos automáticos según el PGC y libro registro de facturas emitidas.
4. **Liquidación impositiva**: borradores del **modelo 303** trimestral y del **390** anual, más un resumen para la gestoría. **No se presenta nada automáticamente**.

Todo expuesto como una **API multi-restaurante**, para poder vendérselo a cualquier bar que ya use Carta NFC. El primer cliente y caso de prueba es Martínez Bar.

---

## 2. Lo que ya existe y funciona (NO romper)

### 2.1 Backend (Supabase)
- Proyecto Supabase `giazlntdbfhnnfizmfao`. El esquema está en `carta-nfc/supabase/001_esquema.sql` y la demo en `002_demo.sql`.
- Las tablas viven en el esquema `carta`, con RLS activado sin políticas. Todo se accede por funciones `security definer`.
  - `carta.restaurantes`: slug, nombre, mensaje, color, moneda, zona_horaria, pedidos_abiertos, mesa_libre, admin_hash, cocina_hash y web_carta.
  - `carta.mesas`: nombre y un código hex de 10 caracteres, que es el que va en el NFC.
  - `carta.categorias` y `carta.productos`. `productos` tiene precio **con IVA incluido**, alérgenos y `ref`.
  - `carta.pedidos`: tipo (pedido/camarero/cuenta), estado (nuevo/preparando/listo/servido/cancelado), total, token y `cerrado` (true cuando la mesa se ha cobrado).
  - `carta.pedido_lineas`: nombre, precio y cantidad congelados en el momento del pedido, más una nota.
- RPC públicas: `POST https://giazlntdbfhnnfizmfao.supabase.co/rest/v1/rpc/<funcion>`.
  - Cabeceras: `Content-Type: application/json` y `apikey: sb_publishable_sdLnLlIQvJBPTcmNx9FFpw_UEIAwbDP`. Es una clave pública y no lleva `Authorization`.
  - Si una llamada falla, devuelve HTTP 400 con `{"message":"codigo_error"}`.

| RPC | Parámetros | Devuelve |
|---|---|---|
| `carta_menu` | `p_slug`, `p_mesa` | restaurante, mesa, mesas, categorias[productos] |
| `carta_pedir` | `p_mesa`, `p_lineas[{producto_id,cantidad,nota}]`, `p_nota` | `{numero, token, total, mesa, estado, creado}`. El servidor calcula el precio |
| `carta_avisar` | `p_mesa`, `p_tipo` (camarero/cuenta) | `{ok, repetido}` |
| `carta_estado` | `p_tokens[]` | `[{token, numero, estado, total}]` |
| `carta_cocina` | `p_slug`, `p_clave`, `p_accion` (listar/estado/**cerrar**/pausa), `p_datos` | panel de cocina |
| `carta_admin` | `p_slug`, `p_clave`, `p_accion`, `p_datos` | gestión del dueño |
| `carta_plataforma` | `p_clave`, `p_accion` | alta de restaurantes (VISAX) |

- Autenticación del panel y del admin: `carta._auth(p_slug, p_clave, 'cocina'|'admin')` con las claves hasheadas en `restaurantes`.
- **Punto de enganche clave:** `carta_cocina` con la acción `'cerrar'` marca `cerrado = true` en los pedidos de una mesa ("Cobrada · liberar mesa" en la pestaña **Mesas** de `web/cocina.html`). **Hoy no registra ni forma de pago ni ticket.** Ahí es donde debe nacer el ticket.

### 2.2 Frontends (Netlify)
| Qué | Archivo en el repo | URL en producción |
|---|---|---|
| Carta genérica, panel de cocina, admin y alta | `carta-nfc/web/*` | `https://carta-nfc-pedidos.netlify.app` (sitio Netlify `carta-nfc-pedidos`) |
| Panel de cocina de Martínez | `web/cocina.html?r=martinez-bar&k=<clave cocina>` | igual que la fila anterior |
| **Página de pedidos propia de Martínez** (diseño Martínez, a la que llegan los NFC) | `carta-nfc/clientes/martinez-bar/index.html` | `https://martinez-bar-pedidos.netlify.app/?mesa=<codigo>` (sitio Netlify `martinez-bar-pedidos`) |

- La página de Martínez se rehízo y desplegó el 14/10/2026. Es un único HTML sin build, con:
  - Pestañas Cocina/Coctelería y platos con tamaños agrupados por `ref` (`base#n`).
  - Carrito en `sessionStorage` y tokens de pedido en `localStorage` durante 12 h.
  - Consulta de estado cada 8 s, botones Camarero/Cuenta y modo de pedidos cerrados.
  - Escapado de todo el texto que viene de la base de datos.
  - **La versión de este commit es la que está en producción.** Si se redespliega, que sea desde aquí.
- La insignia "Powered by Netlify" está desactivada en ambos sitios.
- La web de marketing de Martínez es aparte (`https://martinez-bar.vercel.app`, Vercel) y **no se toca**.

### 2.3 Datos reales de Martínez Bar
- Slug `martinez-bar`. Mensaje: "Cocktail & Snack Bar · Plaza del Cabildo". Moneda EUR. 12 mesas (Mesa 1 a Mesa 12).
- Carta: 9 categorías y unos 125 productos. Cocina: Burgers, ¿Unos nachos?, Tacos baos y más, Con patatas, Entre panes, Abacería. Coctelería: Sherry Cocktails, Spritz, Cócteles.
- Los tamaños llegan como productos separados (ref `mn.abaceria.0#0/1/2` = Tapa/Media/Ración).
- Ejemplos de precios: McTínez 10 €, Cecina de León Tapa 3,90 € / Media 9 € / Ración 16 €, cócteles 8 €.
- **Todos los precios son con IVA incluido.**
- **Faltan los datos fiscales del titular** (NIF, razón social, domicilio fiscal, persona física o sociedad, régimen de IRPF/IS). Pídeselos a Pablo. **No inventes un NIF.**

---

## 3. Marco legal a cumplir (España, territorio común: Andalucía)

> Verifica cada punto en la sede de la AEAT antes de dar algo por cerrado. Lo marcado con ⚠️ puede cambiar.

**Ticket = factura simplificada.** Lo regula el Reglamento de facturación, RD 1619/2012.
- En hostelería y restauración se permite hasta **3.000 € (IVA incluido)**. El límite general es 400 €.
- Contenido mínimo:
  - número y serie;
  - fecha de expedición, y fecha de la operación si es distinta;
  - NIF y nombre o razón social del expedidor;
  - descripción de lo vendido;
  - tipo de IVA, con la mención "IVA incluido";
  - importe total.
- **Factura completa** si la pide un cliente empresa (NIF, nombre y domicilio del destinatario, base y cuota desglosadas). Puede canjear un ticket ya emitido.

**IVA de restauración: 10 %.** Se aplica a comida y bebida servidas en el local, cócteles con alcohol incluidos, porque es un servicio de restauración. Deja el tipo **configurable por producto o categoría** (21 % / 10 % / 4 %) por si se vende algo para llevar o mercancía.

**VERI\*FACTU (Reglamento de Sistemas Informáticos de Facturación).** Normas: RD 1007/2023 y Orden HAC/1177/2024.
- Aplica a cualquier software que expida facturas o tickets, **también en módulos (estimación objetiva)** (DGT V2055-25). Quedan excluidos los acogidos al SII y los territorios forales.
- Cada factura genera un **registro de alta**, y cada anulación un **registro de anulación**.
- Los registros llevan una **huella SHA-256 encadenada** al registro anterior de ese obligado tributario.
- El ticket impreso lleva un **QR** con la URL de cotejo de la AEAT (NIF emisor, serie+número, fecha e importe total) y la leyenda **"VERI\*FACTU"**.
- Envío de los registros a la AEAT por servicio web (SOAP) con **certificado electrónico**. Hay que respetar el control de flujo, el tamaño máximo de lote, reintentos y estados (correcto / aceptado con errores / incorrecto).
  - Hay entorno de **pruebas/preproducción**: desarrolla contra él.
- Tipos de factura: F1 completa, **F2 simplificada**, F3 completa en sustitución de simplificadas, y R1–R5 rectificativas.
- **VISAX, como productor del software, debe emitir la "declaración responsable" del SIF.** Prepara la plantilla y el dato de versión del sistema.
- ⚠️ Fechas vigentes según el RDL 15/2025: obligatorio desde el **1/1/2027** para sociedades y el **1/7/2027** para el resto (autónomos).
  - En oct-2026 se anunció otro retraso a oct-2028, **sin aprobar todavía**.
  - Diséñalo ya conforme; usarlo antes es voluntario.

**Factura electrónica B2B (Ley Crea y Crece).** Es otra obligación y queda fuera de la v1. ⚠️ Según la prensa, el calendario va de oct-2027 a oct-2028. Diseña el modelo de datos para poder exportar más adelante a Facturae/UBL.

**Contabilidad (PGC), asiento por ticket o resumen diario por forma de pago:**
- Debe: `570 Caja` (efectivo) / `572 Bancos` o una cuenta puente de TPV (tarjeta, Bizum).
- Haber: `700 Ventas` (base) + `477 H.P. IVA repercutido` (cuota).
- Propinas: fuera de la base imponible si se registran aparte. Que sea configurable.
- Plan de cuentas **configurable por restaurante**, porque la gestoría puede usar 705 u otras subcuentas.

**Impuestos (solo borradores):**
- **303** trimestral: plazos del 1 al 20 de abril, julio y octubre, y del 1 al 30 de enero.
- **390** anual.
- IVA repercutido a partir de las ventas. El IVA soportado necesita facturas de compra: eso es la fase 2 (puede venir de Holded, que VISAX ya usa en otros proyectos, o subirse a mano).
- IRPF del titular: modelo **130** (estimación directa) o **131** (módulos), según el régimen que diga Pablo.
- Nunca presentar: generar un **borrador + Excel/PDF para la gestoría**.

---

## 4. Lo que hay que construir

### 4.1 Modelo de datos (nuevo esquema `fiscal`, sin tocar las tablas de `carta` salvo añadir columnas opcionales)
- `fiscal.titulares`: un registro por restaurante, con:
  - NIF, razón social, nombre comercial y domicilio fiscal;
  - tipo de persona (física/jurídica);
  - régimen de IVA y régimen de IRPF/IS;
  - modo SIF (`verifactu` / `no_verifactu` / `desactivado`) y entorno AEAT (`pruebas` / `produccion`);
  - referencia al certificado, guardado en **Supabase Vault/secrets** y nunca en una tabla en claro.
- `fiscal.series`: código (ej. `T` tickets, `F` facturas completas, `R` rectificativas), año y último número. La numeración es **correlativa, sin huecos, con bloqueo transaccional**.
- `fiscal.documentos`:
  - tipo (F1, F2, F3, R*), serie, número, fechas y la mesa de origen;
  - `pedido_ids[]` (vínculo con `carta.pedidos`);
  - cliente (si es factura completa) y totales;
  - desglose por tipo de IVA y forma(s) de pago;
  - documento rectificado o sustituido, si lo hay;
  - estado.
- `fiscal.documento_lineas`: copia **inmutable** de las líneas (nombre, cantidad, precio con IVA, tipo de IVA, base y cuota).
- `fiscal.registros_sif`: alta y anulación, con el JSON/XML del registro, la huella, la huella anterior, la fecha-hora-huso de generación, el estado de envío, la respuesta de la AEAT, los reintentos y el **log de eventos** del SIF.
- `fiscal.cobros`: forma de pago (efectivo / tarjeta / bizum / mixto), importe, cambio entregado, propina y el usuario o dispositivo que cobra.
- `fiscal.asientos` y `fiscal.asiento_lineas`, más `fiscal.plan_cuentas` configurable.
- `fiscal.cierres_caja`: informe Z diario con ventas por forma de pago, por tipo de IVA y nº de tickets.
- `fiscal.compras` (fase 2): facturas recibidas para el IVA soportado.
- Los documentos emitidos **no se borran ni se editan**: solo se anulan o rectifican. Hazlo cumplir en la base de datos con triggers que impidan UPDATE y DELETE de los campos fiscales.

### 4.2 API (mismo patrón que ya existe: RPC `public.fiscal_*` con `p_slug` + `p_clave`, más Edge Functions para lo que necesite certificado)
| Endpoint | Qué hace |
|---|---|
| `fiscal_cobrar(slug, clave, {pedido_ids \| mesa_codigo, pagos[{forma, importe}], propina?, cliente?})` | Crea el ticket F2 (o la F1 si viene un cliente con NIF), el registro SIF, la huella, el QR y el asiento. Marca los pedidos como `cerrado`. Todo en **una sola transacción** |
| `fiscal_documento(token)` | Devuelve el JSON del ticket y una URL a su versión imprimible (HTML 80 mm para impresora térmica y PDF) con el QR. El token es público para que el cliente vea su ticket en el móvil |
| `fiscal_factura_completa(ticket_id, cliente)` | Canjea un ticket por una factura F3 |
| `fiscal_rectificar` / `fiscal_anular` | R1–R5 y registro de anulación |
| `fiscal_cierre_caja(dia)` | Informe Z |
| `fiscal_libro_emitidas(desde, hasta, formato)` | Libro registro de emitidas (CSV/XLSX con el formato de libros registro de la AEAT) |
| `fiscal_asientos(desde, hasta, formato)` | Diario contable exportable (CSV genérico, más un conector de Holded opcional) |
| `fiscal_borrador_303(año, trimestre)` / `fiscal_borrador_390(año)` | Borradores con casillas |
| Edge Function `fiscal-aeat-envio` | Cola de envío a la AEAT: firma con el certificado del titular, mTLS, control de flujo, reintentos y actualización del estado. Se ejecuta por cron o por disparador |

Los errores siguen el mismo estilo que ya existe (`raise exception 'codigo'`). Ejemplos: `titular_sin_datos`, `importe_supera_limite_simplificada`, `pedidos_ya_cobrados`, `serie_bloqueada`.

### 4.3 Cambios en los frontends
- **Panel de cocina (`web/cocina.html`), pestaña Mesas:** cambiar "Cobrada · liberar mesa" por un botón **"Cobrar"** que abra una ventana con:
  - el total;
  - la forma de pago (efectivo con cálculo del cambio, tarjeta, Bizum o mixto);
  - una casilla "¿Factura con NIF?" que despliegue los datos del cliente;
  - el botón **Emitir ticket**.
  
  Al emitir: vista previa del ticket, botón **Imprimir** (ya hay formato de 72 mm) y opción de mostrar el QR del ticket digital.
- **Página de pedidos del cliente** (Martínez y la genérica): cuando su pedido esté cobrado, mostrar en "Tus pedidos" el enlace **"Ver tu ticket"** (`fiscal_documento(token)`).
- **Admin (`web/admin.html`), nueva pestaña "Facturación":**
  - datos fiscales del titular;
  - series, plan de cuentas y tipos de IVA por categoría;
  - estado de los envíos a la AEAT;
  - cierres de caja;
  - descargas (libro de emitidas, diario, borrador 303).
- Mantener el diseño de cada sitio. La página de Martínez usa su paleta (negro `#0B0B0B`, mármol `#F3F0EA`, amarillo `#FCA80C`, latón `#C9A15E`, Instrument Serif + Montserrat).

### 4.4 Ejemplo trabajado con Martínez Bar (úsalo como test de aceptación)
Mesa 2 pide **2× Cecina de León · Media (9 €)** y **1× McTínez (10 €)**. Total **28,00 € IVA incluido**, y paga con tarjeta.

| Concepto | Valor |
|---|---|
| Tipo de documento | F2 (factura simplificada), serie `T`, nº `T2026-000001` |
| Base imponible al 10 % | 25,45 € |
| Cuota IVA al 10 % | 2,55 € |
| Total | 28,00 € |
| Asiento | Debe 572 (o puente TPV) 28,00 / Haber 700 25,45 · Haber 477 2,55 |
| Registro SIF | Alta F2, huella encadenada a la anterior (o la primera del titular), QR con la URL de cotejo |

**Regla de redondeo:** la cuota de cada tipo de IVA se calcula sobre la suma de bases de ese tipo en el documento, con 2 decimales y redondeo half-up. La base es el total con IVA de ese tipo dividido entre (1 + tipo). La cuota es la diferencia entre ese total y la base, para que base + cuota cuadre exactamente con el total cobrado.

---

## 5. Fases propuestas

1. **Tickets locales:**
   - esquema `fiscal`, series, `fiscal_cobrar` y la ventana Cobrar en el panel;
   - ticket imprimible con QR y huella encadenada;
   - SIF en modo registro, aún sin enviar a la AEAT.
2. **VERI\*FACTU:** Edge Function de envío al **entorno de pruebas** de la AEAT, con estados y reintentos, más la plantilla de la declaración responsable.
3. **Contabilidad:** asientos automáticos, plan de cuentas configurable, cierre de caja y exportaciones (CSV/XLSX, Holded opcional).
4. **Impuestos:** borradores de 303 y 390 y el resumen para la gestoría; facturas de compra para el IVA soportado.
5. **Producción con Martínez:** cuando Pablo dé los datos fiscales y el certificado.

En cada fase: pruebas SQL (`tests/sql-tests.sql`), e2e (`tests/e2e.mjs`, con la base local `tests/supabase-local.sql`) y actualización del `README.md`.

---

## 6. Reglas de trabajo

- **No rompas las RPC ni las páginas actuales.** Hay un restaurante real usándolas. Las migraciones van como `00X_*.sql` nuevos, idempotentes.
- **Pruebas con el restaurante `demo`** o la base local. No crees pedidos ni tickets reales en `martinez-bar` sin el OK de Pablo, porque aparecen en la tablet del bar.
- **El repo es público:**
  - no subas claves (cocina, admin, plataforma), certificados, NIF reales ni códigos de mesa;
  - los secretos van en Supabase secrets/Vault o en variables de Netlify;
  - plantéale a Pablo hacer el repo privado antes de meter la parte fiscal.
- Escapa todo el texto que venga de la base de datos en los HTML. Valida en el servidor todos los importes (el cliente no manda precios).
- Si el sitio `martinez-bar-pedidos` llega a conectarse a Git, ten en cuenta que un push sobrescribe lo publicado.
- Si algo legal es dudoso, déjalo **configurable y marcado con TODO** para que lo revise la gestoría, en vez de asumirlo.

---

## 7. Datos que faltan (preguntar a Pablo)
- Datos fiscales del titular de Martínez Bar (NIF, razón social, domicilio, persona física o sociedad, régimen de IRPF/IS).
- Si emitirán en modo VERI\*FACTU (recomendado) o "No VERI\*FACTU".
- Certificado electrónico: el del titular, o representación o colaboración social a través de la gestoría.
- Formas de pago reales y si manejan propinas.
- Qué usa su gestoría para importar la contabilidad (Holded, A3, Contasol, CSV…).
- Si quiere impresora térmica en barra (modelo) o solo ticket digital y PDF.
