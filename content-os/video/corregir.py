"""Sustituye el texto de Whisper por el del guion (manteniendo los tiempos) para que los subtítulos salgan sin erratas.
Uso: python video/corregir.py voces/<id>.json voces/<id>.txt"""
import difflib
import json
import re
import sys
import unicodedata


def n(s):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode())


def corregir(pal, guion):
    a = [n(p['p']) for p in pal]
    b = [n(x) for x in guion]
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == 'equal' or (op == 'replace' and i2 - i1 == j2 - j1):
            out += [{'p': guion[j1 + k], 't': pal[i1 + k]['t'], 'fin': pal[i1 + k]['fin']} for k in range(i2 - i1)]
        elif op in ('replace', 'insert'):
            # reparte el hueco de tiempo entre las palabras del guion
            t0 = pal[i1]['t'] if i1 < len(pal) and i2 > i1 else (out[-1]['fin'] if out else 0)
            t1 = pal[i2 - 1]['fin'] if i2 > i1 else (pal[i1]['t'] if i1 < len(pal) else t0 + 0.3)
            m = j2 - j1
            out += [{'p': guion[j1 + k], 't': round(t0 + (t1 - t0) * k / m, 3), 'fin': round(t0 + (t1 - t0) * (k + 1) / m, 3)} for k in range(m)]
        elif op == 'delete' and out:
            out[-1]['fin'] = pal[i2 - 1]['fin']
    return out


if __name__ == '__main__':
    pal = json.load(open(sys.argv[1], encoding='utf-8'))
    guion = open(sys.argv[2], encoding='utf-8').read().split()
    nuevo = corregir(pal, guion)
    json.dump(nuevo, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(sys.argv[1], len(pal), '→', len(nuevo), 'palabras')
