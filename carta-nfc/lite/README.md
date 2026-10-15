# Carta NFC — versión "Solo pedidos"

El cliente pide desde la mesa (NFC o QR) y **el pedido llega al móvil del bar**, junto al TPV.
El camarero lo apunta en su TPV de siempre y toca **✓ Apuntado**. Nada más: sin cobros, sin caja,
sin facturación. El bar sigue cobrando con su TPV.

```
 NFC/QR Mesa 2 ──► /m/<codigo> ──► carta ──► Enviar pedido ──► Supabase (valida mesa y precios)
                                                                   │
        Móvil junto al TPV (cocina.html) ◄──── cada 3 s ───────────┘
        🔔 suena → el camarero lo pasa al TPV → "✓ Apuntado" → el cliente lo ve
```

Es un frontal **separado** de la versión completa (`../web/`, con TPV). Usa **la misma base de datos**
y las mismas funciones, **sin migraciones nuevas**: un bar sin datos fiscales ya funciona así.

## Qué incluye

| Página | Para quién | Qué hace |
|---|---|---|
| `index.html` (`/m/<codigo>`, `/r/<slug>`) | Cliente | Carta por categorías con fotos, precios y alérgenos. Tamaños (Tapa / Media / Ración) en una sola tarjeta. Carrito con nota por plato, **Enviar pedido**, estado (Recibido → ✓ Apuntado), **Llamar al camarero** y **Pedir la cuenta**. Con la carta general (`/r/<slug>`) el cliente elige su mesa. |
| `cocina.html` | Móvil del bar | Pedidos **nuevos** en letra grande, **timbre fuerte** (se repite cada 20 s mientras haya algo sin atender) y pantalla siempre encendida. Un toque: **✓ Apuntado** (con ↩ para deshacer). Avisos de camarero y cuenta. Pestaña **Mesas**: lo que lleva cada mesa, **🖨 Imprimir ticket** y **Cobrada · liberar mesa**. Botón **📱 QR carta** para enseñar el QR de la carta general. Pausar pedidos. |
| `admin.html` | Dueño | Carta (productos, precios, fotos, alérgenos, **Agotado** en un toque), Mesas y NFC (grabar NFC desde Chrome Android, QR por mesa, hoja de QR para imprimir con la carta general), Ajustes (nombre, mensaje, color, abrir/pausar pedidos, elegir mesa), claves e **Informes**. |
| `alta.html` | Tú | Alta de bares (te da los 3 enlaces) y activar/desactivar (impagos). |

**Informes** (Gestión → 📊 Informes): ventas por día y por hora, lo más pedido (con buscador), mesas,
comparación con el periodo anterior y **Excel** del periodo. Salen de los pedidos que entran por el sistema
(lo que se pide en barra sin pasar por él no aparece).

**No incluye** (está en la versión completa): modo TPV y comandero, cobros y formas de pago, cuentas
separadas, propinas, descuentos, devoluciones, tickets fiscales, facturas, VERI\*FACTU, caja y arqueo,
stock, mover/juntar mesas, "Varios", puestos y "Corregir".

### Estados

| En la BD (`carta.pedidos.estado`) | Panel | Cliente |
|---|---|---|
| `nuevo` | Nuevos (suena) | Recibido |
| `servido` | Apuntados hace poco | ✓ Apuntado |
| `cancelado` (✕) | — | Cancelado |

"Cobrada · liberar mesa" marca los pedidos y avisos de la mesa como `cerrado`.

### El ticket impreso

Es una **pre-cuenta** de 80 mm con "IVA incluido. Pre-cuenta: no válida como factura." (constante
`PIE_TICKET` en `assets/cocina.js`). Sin numeración fiscal ni VERI\*FACTU.
TODO(gestoría): si un día se cobra con este ticket porque falla el TPV, el bar debe emitir después su factura en el TPV.

## Montar un bar en 15 minutos

1. **Alta** (2 min): `alta.html` → clave de plataforma → *Nuevo restaurante* (nombre, identificador, nº de mesas).
   Copia los 3 enlaces (carta, gestión, panel) y **guárdalos fuera del repo**: las claves solo se ven esa vez.
2. **Carta** (3 min):
   - si el bar tiene web con la plantilla de Martínez:
     `node ../herramientas/importar-carta.mjs --url <su carta.html> --slug <slug> --clave <clave admin>`;
   - si no, a mano en Gestión → Carta. Fotos: Editar → "Foto (URL https)".
3. **NFC y QR** (5 min): en un **Android con Chrome**, Gestión → *Mesas y NFC* → **📶 Grabar NFC** en cada mesa
   (iPhone: app NFC Tools, ver `../docs/guia-nfc.md`). *🖨 Imprimir QRs de las mesas* → pega cada QR junto a su NFC.
4. **Móvil del bar** (2 min): abre el enlace del **panel** en el móvil junto al TPV (con soporte de carga),
   toca **"toca aquí para activarlo"** (sonido) y deja la pantalla a la vista. El panel la mantiene encendida.
   En Ajustes del móvil: no molestar desactivado y volumen alto.
5. **Camarero** (1 min): que guarde el QR de la carta general (Gestión → Mesas y NFC → Carta general → QR →
   Descargar) o que use **📱 QR carta** en el panel, para el cliente al que no le funcione el NFC.
6. **Prueba** (2 min): acerca un móvil al NFC de una mesa, pide algo, comprueba que suena, toca ✓ Apuntado,
   imprime el ticket desde *Mesas* y libera la mesa.

## Estilo propio de un bar

Por defecto la carta usa el **color** de Ajustes. Para un estilo completo (como Martínez: negro y amarillo,
Instrument Serif + Montserrat) se añade su slug en `TEMAS` de `assets/api.js` y su hoja `assets/tema-<nombre>.css`.
Hoy: `martinez-demo` → `tema-martinez.css`.

## Ejemplo: Martínez Bar (demo)

Restaurante de demostración `martinez-demo` (10 mesas) con la carta de `https://martinez-bar.vercel.app/carta.html`
(123 productos con tamaños) y fotos de su web. Es **independiente** del bar real `martinez-bar`.
Los enlaces con claves y los códigos de mesa no están en el repo: se entregan aparte.

## Publicar

Netlify, proyecto `pedidos-nfc-lite` (https://pedidos-nfc-lite.netlify.app). Se publica esta carpeta tal cual
(sin build): herramienta de Netlify `deploy-site` con el site id del proyecto y el comando que devuelve,
ejecutado **dentro de `carta-nfc/lite/`**.

Los NFC llevan grabado el dominio: decide el dominio definitivo **antes** de grabar en serie.

## Pruebas

```bash
cd carta-nfc/tests
node e2e-lite.mjs     # levanta su BD y su servidor (puerto 8788) → E2E LITE OK
```

Cubre: pedir desde el NFC → llega al panel con sonido → ✓ Apuntado (y deshacer) → el cliente lo ve →
pedir la cuenta → imprimir ticket → liberar mesa; carta general eligiendo mesa; QR en el panel; tamaños
agrupados; tema Martínez; agotado; informe y Excel; sin scroll horizontal en el móvil; nada de TPV/cobros.

## Límites

- Sin internet no llegan pedidos: router 4G de respaldo o el móvil compartiendo datos.
- El sonido necesita **un toque** en el panel tras abrirlo o recargarlo (lo exigen los navegadores): sale un aviso grande.
- Si el móvil bloquea la pantalla o cambia de app, el navegador puede dejar de sondear: panel siempre delante y cargando.
- Alérgenos: la web de Martínez no los publica; en el demo están sin marcar.
