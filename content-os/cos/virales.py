"""Filtro de virales: visitas del reel frente a lo normal de su autor."""
from collections import defaultdict
from statistics import median

from .util import REELS, VIRALES, SALIDA, leer_jsonl, escribir_json, escribir_texto, log, miles


def calcular(cfg: dict, reels: list[dict] | None = None) -> list[dict]:
    reels = reels if reels is not None else leer_jsonl(REELS)
    if not reels:
        raise SystemExit("No hay reels. Ejecuta antes `recolectar` o `importar`.")

    por_autor = defaultdict(list)
    for r in reels:
        por_autor[(r["plataforma"], r["autor"].lower())].append(r)

    evaluados = []
    for lista in por_autor.values():
        for r in lista:
            otros = [o["visitas"] for o in lista if o["clave"] != r["clave"] and o["visitas"] is not None]
            fila = {**r, "base": None, "ratio": None, "metodo": None}
            if len(otros) >= cfg["min_posts_baseline"]:
                fila["base"] = max(median(otros), 1)
                fila["ratio"] = round(r["visitas"] / fila["base"], 1)
                fila["metodo"] = "mediana_autor"
                umbral = cfg["umbral_viral"]
            elif r.get("seguidores"):
                fila["base"] = r["seguidores"]
                fila["ratio"] = round(r["visitas"] / max(r["seguidores"], 1), 1)
                fila["metodo"] = "seguidores"
                umbral = cfg["umbral_viral_por_seguidores"]
            else:
                continue
            fila["viral"] = fila["ratio"] >= umbral and r["visitas"] >= cfg["min_visitas"]
            evaluados.append(fila)

    virales = sorted((f for f in evaluados if f["viral"]), key=lambda f: f["ratio"], reverse=True)
    sin_base = len(reels) - len(evaluados)
    log(f"{len(reels)} reels · {len(evaluados)} con referencia · {sin_base} sin histórico del autor · "
        f"{len(virales)} virales")
    escribir_json(VIRALES, virales)
    escribir_texto(SALIDA / "virales.md", informe(virales, len(reels), sin_base, cfg))
    return virales


def informe(virales: list[dict], total: int, sin_base: int, cfg: dict) -> str:
    l = [
        "# Virales detectados",
        "",
        f"{total} reels revisados · {len(virales)} virales · {sin_base} sin histórico suficiente del autor.",
        f"Criterio: ≥ x{cfg['umbral_viral']} su mediana (o ≥ x{cfg['umbral_viral_por_seguidores']} sus seguidores "
        f"si no hay histórico) y ≥ {miles(cfg['min_visitas'])} visitas.",
        "",
        "| # | Plataforma | Autor | Visitas | Su normal | × | Reel |",
        "|---|---|---|---:|---:|---:|---|",
    ]
    for i, v in enumerate(virales, 1):
        base = miles(v["base"]) + (" seg." if v["metodo"] == "seguidores" else "")
        l.append(f"| {i} | {v['plataforma']} | @{v['autor']} | {miles(v['visitas'])} | {base} | "
                 f"×{v['ratio']} | [ver]({v['url']}) |")
    return "\n".join(l) + "\n"
