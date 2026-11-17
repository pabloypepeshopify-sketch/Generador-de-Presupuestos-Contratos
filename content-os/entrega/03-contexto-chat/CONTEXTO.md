# Contexto del chat de vídeos 3D de VISAX NFC (para retomar en otra sesión)

## Negocio y objetivo
- **VISAX NFC** (visaxnfc.es) vende tarjetas y placas NFC para bares, restaurantes y otros locales:
  - carta digital con pedido desde la mesa (el pedido llega al móvil del camarero y a las pantallas de barra y cocina);
  - reseñas de Google, WiFi y redes sociales;
  - llamar al camarero o pedir la cuenta.
- **Objetivo de la cuenta:** hacerse viral y ganar seguidores entre el público general (no solo dueños de bares), y a la vez venderles a los bares.
- Se publican en **Instagram Reels** (y TikTok).

## Preferencias del usuario (importante)
- Habla en español, respuestas cortas y directas.
- **Cada vídeo con un estilo 3D distinto**, sin limitarse a cambiar colores; la cuenta tiene que tener variedad.
- Sí gustan los **muñecotes 3D** (los del POV / juguete) con fondos de bar distintos.
- **Mucha dopamina, cortes de plano constantes y pocos efectos gráficos.**
- **No empezar con el producto NFC.** Empezar con una curiosidad o una situación.
- **Música:** nada que suene a anuncio. El `beat` le parecía comercial; la `guitarra_bar` le gusta.
- **Sin marca de agua** `visaxnfc.es`.
- **Llamadas a la acción:**
  - Vídeos de curiosidad o tecnología: «Sígueme si quieres saber más sobre la tecnología NFC» (tal cual, sin más).
  - Vídeos de negocio: «Comenta PALABRA», por ejemplo MESA, CAÑA, CHIRINGUITO o AHORRO.
- **Voces de ElevenLabs** (modelo eleven_v4):
  - Narrador: **Tony** `851ejYcv2BoNPjrkw93G`. Es la voz que eligió el usuario.
  - Cliente en primera persona (POV): **Dani** `xH6DmlUWSqhSmFog5gxa`.
  - Camarero: **David (acento andaluz)** `LG5CpCuzWTE7pUsAnHo2`.
- **Cosas que no gustaron:**
  - El primer vídeo «que-pasa»: poco profesional.
  - El «versus» en pantalla partida.
  - Los primeros muñecos: feos, y el bar no tenía paredes.
  - Llamadas a la acción del tipo «sígueme para saber la tecnología de los bares».
- El POV en primera persona le encantó y es el que mejor ha funcionado (más de 1000 visitas).

## Cómo se hacen los vídeos (todo en `content-os/video/`)
- `motor.js`: motor 3D (Three.js) con todas las escenas `V['id']`: pov, nfc, calle, usos, locales, hotel, mano, chiringuito, ahorro, mesa7, menu…
- `estilos.js`: estilos visuales y de subtítulos (holograma, neón, cómic, maqueta, ia, nocheIso, plastilina, chiringuito, ahorro…).
- `juguete.js`: muñecos, restaurante, manos POV. `diorama.js`: maqueta de calle.
- `render.mjs`: genera el vídeo con Playwright + Chromium y ffmpeg. Mezcla voz, música, efectos y deja el volumen a −14 LUFS.
  - Muestras rápidas: `node render.mjs <id> --muestras 2.5,6,10`
  - Vídeo completo: `node render.mjs <id>`. Tarda unos 20–25 min por vídeo de 30 s.
  - Salida: `content-os/salida/videos/<id>.mp4`.
- **Voz:**
  - Se genera con ElevenLabs y se descarga en `voces/<id>.mp3` junto con `voces/<id>.txt` (el guion).
  - Después: `python3 alinear.py voces/<id>.mp3` y `python3 corregir.py voces/<id>.json voces/<id>.txt`.
  - En `motor.js`, `cue('palabra', n)` da el segundo en que se dice la n-ésima vez esa palabra.
  - Diálogo con varias voces: `ensamblar.py` (ver la cabecera del archivo).
- **Música** en `musica/`: guitarra_bar (la buena), ambient_b, beat (comercial, evitar).
- **Recortes para Instagram:** `recorte_ig.py`. Corta tramos, pone el texto gancho y la píldora de «Comenta» con ffmpeg. Se ejecuta desde `content-os/salida/videos/`. Los tramos están escritos a mano para hotel y pov.
- **Marca de agua:** ya está desactivada en `motor.js` (la línea `// marcaAgua();` en `componer`).

## Git y despliegues
- Rama de trabajo: `claude/ecstatic-darwin-l8byvt`. Los vídeos y el código están subidos ahí.
- PR #3 (lo abrió el usuario): sale de esta rama hacia `claude/presupuestos-contratos-generator-82d5o8`. Ya no se vigila.
- **Vercel:**
  - En los 4 proyectos (generador-de-presupuestos-contratos, visax-nfc, visax-pedidos, visax-informe) hay un *Ignored Build Step* puesto: `git diff --quiet HEAD^ HEAD -- ':(top)' ':(top,exclude)content-os'`. Si un cambio solo toca `content-os/` (vídeos), no se despliega nada.
  - visax-nfc, visax-pedidos y visax-informe apuntan a carpetas que no existen en esta rama (`visax-nfc`, `carta-nfc/lite`, `app-comerciales/informe-web`). Si se toca código fuera de `content-os/`, volverán a fallar.

## Pendiente / siguiente paso
1. Volver a renderizar sin marca de agua los vídeos antiguos antes de publicarlos: todos menos pov y hotel.
2. Sacar versiones cortas de 20–25 s de los que se vayan a publicar, siguiendo `02-algoritmo/ALGORITMO.md`.
3. Siguiente POV: «pides la cuenta y tardan 20 min». El usuario dijo que lo dejara para más adelante. Hay un borrador de voces en `content-os/video/voces/cuenta_borrador/`.
4. Cuando el usuario mande estadísticas de un reel, analizar la curva de retención y aplicar lo aprendido al siguiente.
