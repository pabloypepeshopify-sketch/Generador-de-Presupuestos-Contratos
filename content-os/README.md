# content-os · máquina de vídeos virales para VISAX NFC

Busca en TikTok los vídeos que **reventaron** sobre vuestro tema (reseñas de Google, carta y pedido por mesa,
redes sociales, llamar al camarero, «qué pasa cuando escaneas un NFC»), los desmonta plano a plano, saca el
**aprendizaje** (gancho, pasos, por qué funcionaron), escribe **guiones** sobre vuestros productos copiando esos
formatos y **monta los vídeos en 3D** con voz en off y subtítulos.

```
recolectar ─► virales ─► desmontar ─► aprendizaje/reglas ─► guiones ─► vídeo 3D
 (Apify)     (×N su      (ffmpeg +     (Claude, visión)      (Claude)   (Three.js + voz
             normal)     Whisper)                                        ElevenLabs + ffmpeg)
```

## Qué hay ya hecho

| Dónde | Qué |
|---|---|
| `salida/aprendizaje.md` | Ficha de los 20 virales de vuestro tema: gancho exacto, pasos, por qué funcionó, qué copiar |
| `salida/reglas.json` / `reglas.md` | 19 reglas sacadas de esos vídeos, con evidencia |
| `salida/guiones/` | 8 guiones sobre vuestros productos, cada uno copiando un viral concreto |
| `salida/videos/*.mp4` | 6 vídeos 3D montados, 1080×1920, listos para subir |
| `marca.md` | Productos, tono, datos técnicos comprobados y prohibiciones. Todo guion parte de aquí |

Los 2 guiones de formato real («POV: a los bares les encanta esto» y «¿Por qué este bar tiene X estrellas?») no van
en 3D: funcionan porque son reales. Se graban en las visitas de los comerciales, con permiso del dueño.

## Vídeos 3D

| Vídeo | Producto | Copia el formato de |
|---|---|---|
| `que-pasa.mp4` | carta | @sagecadence_ / @worksdsefs7 + recorrido de @menu4d |
| `mesa4.mp4` | pedir desde la mesa | @menu4d (historia de una mesa con reloj) |
| `boton.mp4` | carta, reseñas, redes | @eliannyanez3 (8,2 M): «¿sabes para qué sirve este botón?» |
| `redes.mp4` | redes sociales | @boostdailyfinds (1,1 M): demo de 10 s sin voz, en bucle |
| `camarero.mp4` | llamar al camarero | @apiworking + @menu4d |
| `pilas.mp4` | carta | @worksdsefs7 + respuesta a comentario de @33.hats |

Cómo se hacen (carpeta `video/`):

```bash
# 1. voz en off: un mp3 por vídeo en video/voces/<id>.mp3 (ElevenLabs o tu propia voz, ver abajo)
# 2. tiempos de cada palabra (Whisper local) para subtítulos y animación
python video/alinear.py video/voces/<id>.mp3
# 3. render 3D + montaje (Node + Playwright + ffmpeg); --muestras 1,5,9 saca fotogramas sueltos para revisar
node video/render.mjs <id>
```

- `video/motor.js`: la escena (bar, tarjetas VISAX, móvil con pantallas, ondas NFC, antena y chip por dentro,
  cocina, personajes) y la línea de tiempo de cada vídeo. Las animaciones se enganchan a palabras de la voz
  (`cue('espiral')`), así que si cambia la voz no hay que retocar tiempos.
- Subtítulos palabra a palabra, etiquetas numeradas, logo VISAX y efectos de sonido (toque, pop, ding) generados.
- Render: ~6 min por vídeo de 25 s en un servidor de 4 núcleos sin tarjeta gráfica.

## Poner tu propia voz

**Opción A — grabarla tú (gratis, lo más auténtico):**
1. Lee el texto del vídeo (está en el guion, campo «Voz») con el móvil, en un sitio sin eco, a 15–20 cm.
2. Guarda el audio como `video/voces/<id>.mp3` (por ejemplo `video/voces/mesa4.mp3`). Vale m4a/wav: `ffmpeg -i grabacion.m4a video/voces/mesa4.mp3`.
3. `python video/alinear.py video/voces/mesa4.mp3` y `node video/render.mjs mesa4`. Subtítulos y animación se ajustan solos a tu ritmo.

**Opción B — clonar tu voz en ElevenLabs (escribes el texto y sale con tu voz):**
1. Graba 1–3 minutos de tu voz hablando natural (sin música ni ruido).
2. En elevenlabs.io → Voices → **Add a new voice → Instant Voice Clone**, sube el audio y acepta que la voz es tuya.
3. Pásame el nombre de esa voz: genero las voces en off de todos los vídeos con ella y los vuelvo a montar.
   (Clonar solo con tu propia voz o con permiso de su dueño.)

## Puesta en marcha (pipeline de análisis)

Requisitos: Python 3.10+, `ffmpeg`, Node 18+ con Playwright (para los vídeos).

```bash
cd content-os
pip install -r requirements.txt faster-whisper
export ANTHROPIC_API_KEY=...     # para analizar / reglas / guiones automáticos
export APIFY_TOKEN=...           # para descargar vídeos (apify.com → Settings → Integrations)
export ELEVENLABS_API_KEY=...    # opcional: transcribe con ElevenLabs (si no, Whisper local)
```

| Paso | Comando | Resultado |
|---|---|---|
| 1 | `python -m cos recolectar` | `datos/reels.jsonl`: búsquedas de `config.json` en TikTok |
| 1b | `python -m cos importar export.json --plataforma tiktok` | Alternativa: un export propio (JSON de Apify o CSV) |
| 2 | `python -m cos virales` | `salida/virales.md`: los que hicieron ≥ ×N su normal |
| 3 | `python -m cos desmontar [--clave tiktok:ID]` | `datos/desmontados/*/`: planos, fotogramas, gancho, transcripción (se puede forzar un reel concreto) |
| 3b | `python -m cos transcribir` / `python -m cos hojas` | Transcribe lo pendiente / una imagen por viral con todos sus planos |
| 4 | `python -m cos reglas` | Analiza cada viral y escribe `salida/reglas.md` |
| 5 | `python -m cos guiones [-n 8] [--tema "..."]` | Guiones nuevos con marca + aprendizaje + reglas |

## Ajustes (`config.json`)

- `busquedas`: frases que se buscan en TikTok, agrupadas por producto. Es lo que decide el tema.
- `max_usd_por_ejecucion`: tope de gasto en Apify por ejecución (plan gratis: 5 $/mes).
- `umbral_viral`, `umbral_viral_por_seguidores`, `autores_para_baseline` (0 = no gastar en el histórico de autores).
- `apify`: actores y su entrada; si Apify cambia algo, se corrige aquí sin tocar código.

## Coste de lo hecho (noviembre 2026)

- Apify: ≈ 4,3 $ (1.072 vídeos buscados + 29 descargados).
- ElevenLabs: 5 voces en off con 2 tomas cada una (≈ 3.200 créditos).
- Whisper y render 3D: gratis (local).

## Pruebas

```bash
python tests/prueba_local.py [video.mp4]   # sin claves: normalización, virales, desmontaje y render de guiones
```

## Límites y cuidado

- Los vídeos de otros se descargan para **analizarlos**, no para resubirlos.
- Los enlaces de vídeo de Apify caducan: `desmontar` poco después de `recolectar`.
- Los vídeos 3D usan un bar ficticio («Bar La Esquina») y precios de ejemplo en la pantalla del móvil.
- Pendiente: publicación automática y medir qué vídeo funcionó para realimentar las reglas.
