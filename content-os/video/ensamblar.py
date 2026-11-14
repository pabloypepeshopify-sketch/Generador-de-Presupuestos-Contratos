"""Monta una pista de diálogo con varias voces a partir de tomas alineadas (una por personaje).
Cada personaje: <dir>/<q>.wav + <q>.json (palabras con tiempos) + <q>.txt (una frase por línea).
Uso: python video/ensamblar.py <id> <dir> "c1 k1 c2 ..." [huecos "c3:0.4,..."]
Salida: voces/<id>.mp3, voces/<id>.json (palabras con campo q = personaje), voces/<id>.txt"""
import json, subprocess, sys
from pathlib import Path

ident, d, orden = sys.argv[1], Path(sys.argv[2]), sys.argv[3].split()
huecos = dict((k, float(v)) for k, v in (x.split(':') for x in sys.argv[4].split(','))) if len(sys.argv) > 4 else {}
frases = {}
for q in sorted({o[0] for o in orden}):
    pal = json.load(open(d / f'{q}.json', encoding='utf-8'))
    lineas = [l.split() for l in open(d / f'{q}.txt', encoding='utf-8').read().splitlines() if l.strip()]
    i = 0
    for n, l in enumerate(lineas, 1):
        trozo = pal[i:i + len(l)]; i += len(l)
        frases[f'{q}{n}'] = (q, trozo)
t, filtros, entradas, salida_pal = 0.35, [], [], []
for k, clave in enumerate(orden):
    q, trozo = frases[clave]
    a, b = max(0, trozo[0]['t'] - 0.06), trozo[-1]['fin'] + 0.12
    entradas += ['-i', str(d / f'{q}.wav')]
    filtros.append(f'[{k}:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS,adelay={int(t * 1000)}|{int(t * 1000)}[s{k}]')
    for p in trozo: salida_pal.append({'p': p['p'], 't': round(p['t'] - a + t, 3), 'fin': round(p['fin'] - a + t, 3), 'q': q})
    t += (b - a) + 0.22 + huecos.get(clave, 0)
filtros.append(''.join(f'[s{k}]' for k in range(len(orden))) + f'amix=inputs={len(orden)}:normalize=0[o]')
dest = Path('voces') / f'{ident}.mp3'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *entradas, '-filter_complex', ';'.join(filtros), '-map', '[o]', '-b:a', '192k', str(dest)], check=True)
json.dump(salida_pal, open(Path('voces') / f'{ident}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
(Path('voces') / f'{ident}.txt').write_text(' '.join(p['p'] for p in salida_pal), encoding='utf-8')
print(dest, f'{t:.2f}s', len(salida_pal), 'palabras')
