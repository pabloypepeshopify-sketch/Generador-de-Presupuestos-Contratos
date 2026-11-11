# Vídeo 9 — La media maratón de Manolo (VISAX NFC)

Motor autocontenido (no necesita `visax_videos/`). Desde esta carpeta:

```bash
pip install edge-tts numpy scipy pillow   # + ffmpeg, node, playwright
python3 lib/tts.py .                      # lines.json -> voice.wav + tl.json
bash lib/build.sh .                       # part1.js + part2.js -> scene.html
node lib/render.js . shots 0.5,10,25      # fotogramas de prueba en shots/
node lib/render.js . dump                 # -> sfx.json
python3 lib/sfx_mix.py .                  # voz + SFX + música -> mix.wav (music/*.mp3 de incompetech)
node lib/render.js . render 8             # trozos en out/
bash lib/mux.sh . VISAX_IA_09_la_media_maraton_de_Manolo
```

Música (no incluida, bajar de incompetech.com a `music/`): "Monkeys Spinning Monkeys.mp3", "Bossa Antigua.mp3".
