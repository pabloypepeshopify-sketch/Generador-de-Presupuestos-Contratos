# VISAX Juega · demo comercial

Demo para enseñar a bares, cafeterías y restaurantes el producto "placas NFC + juegos + premios en el móvil":
el cliente toca la placa de la mesa, juega (rasca y gana o ruleta), gana un premio que se guarda en su móvil
y vuelve para canjearlo. Cada visita suma un sello hacia un premio gordo.

Es solo una demo: no hay servidor. Todo se guarda en el navegador (localStorage) y los números del panel son
de ejemplo (fijos para cada nombre de local), más lo que se juegue de verdad en ese móvil.

## Páginas (`web/`)

| Página | Para quién | Qué hace |
|---|---|---|
| `index.html` | Comercial | Personaliza la demo (nombre, tipo de local, juego, color), vista previa en un móvil, QR para que el dueño la pruebe en su móvil, grabar el enlace en una pegatina NFC (Chrome en Android) y argumentario: cómo funciona, papel vs VISAX y preguntas del dueño. |
| `cliente.html` | Cliente del bar | Lo que se abre al tocar la placa: juego, tarjeta de visitas, mis premios (código único + canje con PIN del camarero), carta, WiFi, Instagram y reseña de Google (voluntaria, sin premio a cambio). Abajo, controles de demo: jugar otra vez, simular visita y reiniciar. |
| `panel.html` | Dueño | Toques, partidas, clientes que repiten, canjes, clics en reseña, ventas estimadas de esas visitas, gráfico por día, premios entregados, canje por código, actividad y edición de premios y probabilidades. |

La personalización viaja en la URL (`cliente.html?n=Bar%20Manolo&t=bar&c=C2410C&j=rasca`), así que el QR o la
pegatina NFC abren la demo ya con el nombre del local.

- `t`: `bar` | `cafe` | `restaurante` (cambia los premios por defecto)
- `j`: `rasca` | `ruleta`
- `c`: color en hex sin `#`
- PIN del camarero en la demo: `1234` (`web/js/comun.js`)

## Decisiones de producto que ya recoge la demo

- **Todos los premios tocan** (no hay "sigue intentándolo"): el cliente siempre se lleva algo y no es un sorteo.
- **La reseña no da premio.** Google prohíbe incentivar reseñas y en la UE es práctica desleal. El botón es voluntario.
- **Antifraude básico:** una partida al día por móvil, un código por premio y canje con PIN. Para la versión real
  habría que usar chips NTAG 424 DNA (enlace distinto en cada toque) y guardar jugadas y canjes en el servidor.

## Desplegar

Proyecto Vercel `visax-juega` (equipo VISAX AI), directorio raíz `visax-juega/web`, sin build.
Se prueba en local con `python3 -m http.server` dentro de `web/`.
