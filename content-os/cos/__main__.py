"""content-os · pipeline de virales → reglas → guiones.

Uso (desde la carpeta content-os):
  python -m cos recolectar               Descarga reels de hashtags/perfiles con Apify
  python -m cos importar FICHERO [--plataforma tiktok|instagram]
  python -m cos virales                  Filtra los que reventaron frente a lo normal de su autor
  python -m cos desmontar [--clave K]    Descarga y corta plano a plano (+ transcripción)
  python -m cos analizar                 Claude analiza cada viral
  python -m cos reglas                   Claude saca las reglas comunes → salida/reglas.md
  python -m cos guiones [-n 10] [--tema "..."]
  python -m cos todo                     Todo lo anterior seguido
"""
import argparse
from pathlib import Path

from . import fuentes, render, virales as vir
from .util import SALIDA, cargar_config, escribir_texto, log


def main() -> None:
    p = argparse.ArgumentParser(prog="cos", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("recolectar")
    imp = sub.add_parser("importar")
    imp.add_argument("fichero", type=Path)
    imp.add_argument("--plataforma", default="instagram", choices=["instagram", "tiktok"])
    sub.add_parser("virales")
    des = sub.add_parser("desmontar")
    des.add_argument("--clave", action="append", help="solo este reel (plataforma:id); repetible")
    sub.add_parser("transcribir", help="transcribe los desmontados que no tienen transcripción")
    sub.add_parser("hojas", help="una imagen por viral con todos sus fotogramas y tiempos")
    sub.add_parser("analizar")
    sub.add_parser("reglas")
    gui = sub.add_parser("guiones")
    gui.add_argument("-n", type=int)
    gui.add_argument("--tema")
    sub.add_parser("todo")
    a = p.parse_args()
    cfg = cargar_config()

    if a.cmd in ("recolectar", "todo"):
        fuentes.recolectar_apify(cfg)
    if a.cmd == "importar":
        fuentes.importar(a.fichero, a.plataforma)
    if a.cmd in ("virales", "todo"):
        vir.calcular(cfg)
        log(f"→ {SALIDA / 'virales.md'}")
    if a.cmd in ("desmontar", "todo"):
        from .desmontar import desmontar
        desmontar(cfg, a.clave if a.cmd == "desmontar" else None)
    if a.cmd == "hojas":
        from .hoja import hojas
        for h in hojas():
            log(f"→ {h}")
    if a.cmd == "transcribir":
        from .desmontar import completar_transcripciones
        log(f"{completar_transcripciones()} transcripciones nuevas")
    if a.cmd in ("analizar", "reglas", "todo"):
        from . import ia
        analisis = ia.analizar(cfg)
        if a.cmd in ("reglas", "todo"):
            reglas = ia.extraer_reglas(cfg, analisis)
            escribir_texto(SALIDA / "reglas.md", render.reglas_md(reglas, len(analisis)))
            log(f"→ {len(reglas)} reglas en {SALIDA / 'reglas.md'}")
    if a.cmd in ("guiones", "todo"):
        from . import ia
        n = (a.n if a.cmd == "guiones" and a.n else None) or cfg["guiones_por_tanda"]
        tema = a.tema if a.cmd == "guiones" else None
        guiones = ia.generar_guiones(cfg, n, tema, render.titulos_previos())
        for ruta in render.guardar_guiones(guiones):
            log(f"→ {ruta}")


if __name__ == "__main__":
    main()
