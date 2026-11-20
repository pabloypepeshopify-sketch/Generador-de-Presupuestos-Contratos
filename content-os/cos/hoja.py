"""Hoja de contacto por viral: gancho + un fotograma por plano, con tiempos, en una sola imagen.
Sirve para revisar un viral de un vistazo (o para que Claude lo analice en una sesión sin API)."""
from pathlib import Path

from .util import DESMONTADOS, leer_json, log

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # Pillow es opcional
    Image = None


def _fuente(tam: int):
    for ruta in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf", "Arial.ttf"):
        try:
            return ImageFont.truetype(ruta, tam)
        except OSError:
            continue
    return ImageFont.load_default()


def hoja(carpeta: Path, columnas: int = 8, ancho: int = 200) -> Path | None:
    info = leer_json(carpeta / "info.json")
    celdas = [(f"G {g['t']}s", carpeta / g["imagen"]) for g in info["gancho"]]
    celdas += [(f"P{p['n']} {p['ini']}-{p['fin']}" + ("" if p.get("corte", True) else " ~"), carpeta / p["imagen"])
               for p in info["planos"] if p.get("imagen")]
    celdas = [(t, r) for t, r in celdas if r.exists()]
    if not celdas:
        return None
    alto = int(ancho * 16 / 9)
    filas = -(-len(celdas) // columnas)
    lienzo = Image.new("RGB", (columnas * ancho, filas * (alto + 22)), "white")
    pintar, fuente = ImageDraw.Draw(lienzo), _fuente(14)
    for i, (texto, ruta) in enumerate(celdas):
        x, y = (i % columnas) * ancho, (i // columnas) * (alto + 22)
        img = Image.open(ruta).convert("RGB")
        img.thumbnail((ancho - 4, alto))
        lienzo.paste(img, (x + 2, y + 22))
        pintar.text((x + 4, y + 3), texto, fill="black", font=fuente)
    destino = carpeta / "hoja.jpg"
    lienzo.save(destino, quality=80)
    return destino


def hojas() -> list[Path]:
    if Image is None:
        raise SystemExit("Falta Pillow: pip install pillow")
    hechas = [h for c in sorted(DESMONTADOS.glob("*/")) if (c / "info.json").exists() and (h := hoja(c))]
    log(f"{len(hechas)} hojas de contacto")
    return hechas
