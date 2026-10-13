# Guía: grabar los NFC de las mesas

Cada mesa tiene un enlace único, por ejemplo `https://carta-nfc-pedidos.netlify.app/m/080f59f08e`.
Ese enlace es lo que se graba en la pegatina/tarjeta NFC de la mesa. El código final identifica
la mesa: **no hace falta que la URL diga "mesa=2"** y nadie puede pedir para otra mesa cambiándola.

## Opción A — Android + Chrome (la más rápida)

1. Abre en el móvil Android el enlace de **gestión** del restaurante (admin.html).
2. Pestaña **Mesas y NFC** → en "Mesa 1" pulsa **📶 Grabar NFC**.
3. Acerca la pegatina a la parte trasera del móvil → "✅ NFC de Mesa 1 grabado".
4. Repite con cada mesa. Pon la pegatina en su mesa justo después para no mezclarlas.

Requisitos: NFC activado en Ajustes del móvil, Chrome actualizado, web abierta en https.

## Opción B — iPhone o cualquier móvil: app gratuita "NFC Tools"

1. En gestión → *Mesas y NFC* → **Copiar** el enlace de la mesa.
2. NFC Tools → **Escribir** → **Añadir un registro** → **URL / URI** → pega el enlace.
3. **Escribir** → acerca la pegatina.

## Qué chip comprar

- **NTAG213** (144 bytes) sobra: los enlaces miden ~50 caracteres. NTAG215/216 también valen.
- Para mesas metálicas: pegatinas **anti-metal (on-metal)**.
- Formato: pegatina redonda 25–30 mm o soporte de mesa con el logo del local + "Acerca tu móvil
  para pedir". Añade el **QR** impreso en el mismo soporte para móviles sin NFC
  (gestión → *Imprimir QRs de las mesas*).

## Proteger los NFC (recomendado)

Cualquiera con una app podría **regrabar** una pegatina sin bloquear y poner otra web.
Cuando la mesa funcione, bloquéala: NFC Tools → *Otras* → **Bloquear etiqueta** (es irreversible:
si un día cambia el enlace, se cambia la pegatina). Como el enlace de cada mesa no cambia salvo
que tú pulses *↻ Código*, bloquear es seguro.

## NFC general del local

En *Mesas y NFC* → **NFC general del local**: un enlace `/r/<restaurante>` para la barra, la
puerta o el escaparate. Abre la carta y, si en *Ajustes* está activado "el cliente puede elegir
su mesa", deja pedir eligiendo la mesa de una lista. Si lo desactivas, ese NFC solo muestra la carta.

## Si ya tienes NFC grabados con tu landing

Si las pegatinas antiguas apuntan a tu landing y están bloqueadas, la landing puede redirigir a
`/r/<restaurante>`; el cliente elegirá su mesa de la lista. Para que la mesa vaya sola en el pedido,
cada mesa necesita su propio enlace `/m/<codigo>` grabado.
