# content-os · máquina de guiones virales para VISAX NFC

Busca vídeos cortos que **reventaron** frente a lo normal de su autor, los desmonta plano a plano, saca las
**reglas** que comparten y escribe **guiones de curiosidad** sobre NFC aplicándolas. No publica nada: el resultado son
guiones listos para grabar.

```
recolectar ─► virales ─► desmontar ─► analizar ─► reglas ─► guiones
 (Apify)     (×10 su     (ffmpeg +    (Claude,    (Claude)   (Claude +
             normal)     ElevenLabs)  visión)                marca.md)
```

## Qué hay ya hecho

- `salida/guiones/`: **10 guiones semilla** listos para grabar, escritos con `reglas-semilla.md` (hipótesis, aún sin
  datos propios). Los huecos `[RESULTADO REAL]` / `[Nº REAL]` se rellenan al grabar; no se inventan.
- `marca.md`: qué vendemos, tono, territorios de curiosidad, datos técnicos comprobados y lo que está prohibido.
  Todo guion nuevo parte de aquí: **edítalo** para cambiar el enfoque.

## Puesta en marcha

Requisitos: Python 3.10+ y `ffmpeg`.

```bash
cd content-os
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...     # obligatoria para analizar / reglas / guiones
export APIFY_TOKEN=...           # para descargar reels (apify.com → Settings → Integrations)
export ELEVENLABS_API_KEY=...    # opcional: transcribe la voz de cada viral
```

### Solo guiones (con las reglas semilla), sin descargar nada

```bash
python -m cos guiones -n 10
python -m cos guiones -n 5 --tema "experimentos con la tarjeta en un bar"
```

### Pipeline completo

```bash
python -m cos todo
```

O paso a paso:

| Paso | Comando | Resultado |
|---|---|---|
| 1 | `python -m cos recolectar` | `datos/reels.jsonl`: reels de los hashtags + histórico de sus autores |
| 1b | `python -m cos importar export.json --plataforma tiktok` | Alternativa: un export propio (JSON de Apify o CSV) |
| 2 | `python -m cos virales` | `salida/virales.md`: los que hicieron ≥ ×10 su mediana |
| 3 | `python -m cos desmontar` | `datos/desmontados/*/`: planos, fotogramas, gancho, transcripción |
| 4 | `python -m cos reglas` | Analiza cada viral y escribe `salida/reglas.md` |
| 5 | `python -m cos guiones` | `salida/guiones/*.md` (+ histórico en `salida/guiones.json`) |

Cada paso guarda lo que hace y no repite trabajo ya hecho (borra `datos/analisis/` para reanalizar).
Los guiones nuevos evitan los títulos que ya están en `salida/guiones.json`.

## Ajustes (`config.json`)

- `hashtags.nicho`: lo que se publica sobre NFC. `hashtags.formato`: virales de curiosidad/tecnología de los que
  aprender **estructura** aunque no hablen de NFC (el nicho NFC tiene poco volumen y casi todo es venta).
- `perfiles`: cuentas concretas a vigilar.
- `umbral_viral` (10): ×N sobre la mediana del autor. El vídeo de referencia usaba ×100; con un nicho pequeño, ×10
  ya filtra bien. Si un autor no tiene histórico, se compara con sus seguidores (`umbral_viral_por_seguidores`).
- `min_visitas`, `max_virales_a_desmontar`, `guiones_por_tanda`, `modelo`, `esfuerzo`.
- `apify`: actores y su entrada. Si Apify cambia la entrada de un actor, se corrige aquí sin tocar código.

## Coste aproximado por tanda

- Apify: según plan (los actores de TikTok/Instagram cobran por resultado; con la config por defecto, ~2.000 reels).
- Claude: 1 llamada con imágenes por viral + 1 para reglas + 1 por tanda de guiones.
- ElevenLabs: minutos de audio de los virales desmontados (opcional).

## Pruebas

```bash
python tests/prueba_local.py [video.mp4]   # sin claves: normalización, virales, desmontaje y render
```

## Límites y cuidado

- Descargar vídeos de otros es para **analizarlos**, no para resubirlos. Los términos de TikTok/Instagram limitan el
  scraping: usa Apify con datos públicos y volumen moderado.
- Los enlaces de vídeo de Apify caducan: ejecuta `desmontar` poco después de `recolectar`.
- Pendiente (siguientes fases): voz clonada, montaje automático, aprobación desde el móvil, publicación y medir qué
  guion funcionó para realimentar las reglas.
