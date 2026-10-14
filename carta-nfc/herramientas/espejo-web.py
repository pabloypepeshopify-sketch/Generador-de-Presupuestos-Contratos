#!/usr/bin/env python3
"""Copia una web estática (HTML/CSS/JS/imágenes/fuentes) y añade pedidos.js a sus páginas de carta.

Sirve para probar los pedidos sobre la web real de un bar cuando no tenemos acceso a su hosting.
Cuando el bar quiera dejarlo fijo, solo tiene que pegar la misma línea <script> en su web.

Uso:
  python3 espejo-web.py https://martinez-bar.vercel.app SALIDA --restaurante martinez-bar \
      [--paginas carta.html] [--script https://carta-nfc-pedidos.netlify.app/w/pedidos.js]
"""
import argparse, os, re, subprocess, sys
from urllib.parse import urljoin, urlparse

ap = argparse.ArgumentParser()
ap.add_argument('origen')
ap.add_argument('salida')
ap.add_argument('--restaurante', required=True)
ap.add_argument('--paginas', default='carta.html', help='páginas (separadas por coma) donde se inyecta pedidos.js')
ap.add_argument('--script', default='https://carta-nfc-pedidos.netlify.app/w/pedidos.js')
a = ap.parse_args()

base = a.origen.rstrip('/') + '/'
host = urlparse(base).netloc
pendientes, vistos = [base, urljoin(base, 'robots.txt'), urljoin(base, 'sitemap.xml')], set()

def ruta_local(url):
    p = urlparse(url).path
    if p.endswith('/') or p == '':
        p += 'index.html'
    return os.path.join(a.salida, p.lstrip('/'))

def bajar(url):
    for intento in range(3):
        r = subprocess.run(['curl', '-sSL', '--fail', '--max-time', '60', url], capture_output=True)
        if r.returncode == 0:
            return r.stdout
        if r.returncode == 22:  # 404 y similares: no reintentar
            return None
    print(f'  ! no se pudo bajar {url}', file=sys.stderr)
    return None

def refs(url, cuerpo, tipo):
    txt = cuerpo.decode('utf-8', 'replace')
    found = []
    if tipo == 'html':
        found += re.findall(r'(?:src|href|content|poster)\s*=\s*"([^"#]+)"', txt)
        for ss in re.findall(r'srcset\s*=\s*"([^"]+)"', txt):
            found += [c.strip().split(' ')[0] for c in ss.split(',') if c.strip()]
        found += re.findall(r'url\(\s*[\'"]?([^\'")]+)', txt)
    elif tipo == 'css':
        found += re.findall(r'url\(\s*[\'"]?([^\'")]+)', txt)
    elif tipo == 'js':
        found += re.findall(r'[\'"]((?:\./)?assets/[^\'"\s]+\.(?:jpg|jpeg|png|webp|avif|svg|gif|mp4|webm|woff2?))[\'"]', txt)
    out = []
    for f in found:
        if f.startswith(('data:', 'mailto:', 'tel:', 'javascript:')) or re.search(r'\s', f.strip()):
            continue
        u = urljoin(url, f).split('#')[0].split('?')[0]
        if urlparse(u).netloc == host:
            out.append(u)
    return out

while pendientes:
    url = pendientes.pop()
    if url in vistos:
        continue
    vistos.add(url)
    cuerpo = bajar(url)
    if cuerpo is None:
        continue
    destino = ruta_local(url)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    with open(destino, 'wb') as fh:
        fh.write(cuerpo)
    ext = os.path.splitext(destino)[1].lower()
    tipo = {'.html': 'html', '.css': 'css', '.js': 'js', '.xml': 'html'}.get(ext)
    if tipo:
        pendientes += [u for u in refs(url, cuerpo, tipo) if u not in vistos]

etiqueta = f'<script src="{a.script}" data-restaurante="{a.restaurante}" defer></script>'
for pag in [p.strip() for p in a.paginas.split(',') if p.strip()]:
    f = os.path.join(a.salida, pag)
    html = open(f, encoding='utf-8').read()
    if 'data-restaurante=' not in html:
        html = html.replace('</body>', etiqueta + '\n</body>', 1)
        open(f, 'w', encoding='utf-8').write(html)

# Es una copia de pruebas: que no compita en Google con la web original.
with open(os.path.join(a.salida, '_headers'), 'w') as fh:
    fh.write('/*\n  X-Robots-Tag: noindex\n')
total = sum(len(fs) for _, _, fs in os.walk(a.salida))
print(f'{len(vistos)} URLs revisadas · {total} archivos en {a.salida}')
print(f'Inyectado en: {a.paginas}\n  {etiqueta}')
