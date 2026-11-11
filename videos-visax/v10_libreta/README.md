# Vídeo 10 — La libreta de 312 nombres (VISAX NFC)

Motor autocontenido (no necesita `visax_videos/`). Desde esta carpeta:

```bash
pip install edge-tts numpy scipy pillow   # + ffmpeg, node, playwright
python3 lib/tts.py .                      # lines.json -> voice.wav + tl.json
bash lib/build.sh .                       # part1.js + part2.js + shots.js -> scene.html
node lib/render.js . shots 0.5,10,25      # fotogramas de prueba en shots/
node lib/render.js . dump                 # -> sfx.json
python3 lib/sfx_mix.py .                  # voz + SFX + música -> mix.wav (music/*.mp3 de incompetech)
node lib/render.js . render 8             # trozos en out/
bash lib/mux.sh . VISAX_IA_10_la_libreta_de_312_nombres
```

Música (no incluida, bajar de incompetech.com a `music/`): "Dreamer.mp3", "Pixel Peeker Polka - faster.mp3", "Heartwarming.mp3".
