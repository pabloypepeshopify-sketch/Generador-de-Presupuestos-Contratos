"""Convierte reglas y guiones a Markdown legible."""
from datetime import date

from .util import SALIDA, escribir_texto, escribir_json, leer_json, slug


def reglas_md(reglas: list[dict], n_virales: int) -> str:
    l = ["# Reglas virales", "", f"Extraídas de {n_virales} virales analizados.", ""]
    for cat in dict.fromkeys(r["categoria"] for r in reglas):
        l += [f"## {cat.capitalize()}", ""]
        for r in (x for x in reglas if x["categoria"] == cat):
            l.append(f"- **{r['id']}** ({r['confianza']}, {len(r['evidencia'])} vídeos): {r['regla']}  ")
            l.append(f"  _Cómo:_ {r['como_aplicarla']}")
        l.append("")
    return "\n".join(l)


def _seg(x) -> str:
    return f"{x:g}".replace(".", ",")


def guion_md(g: dict) -> str:
    l = [
        f"# {g['titulo']}",
        "",
        f"**Ángulo:** {g['angulo']}  ",
        f"**Por qué engancha:** {g['por_que_despierta_curiosidad']}  ",
        f"**Duración:** {_seg(g['duracion_s'])} s · **Curiosidad:** {_seg(g['curiosidad_1_10'])}/10 · "
        f"**Reglas:** {', '.join(g['reglas_aplicadas'])}",
        "",
        "## Gancho (0–1,5 s)",
        f"- **Imagen:** {g['gancho']['visual']}",
        f"- **Texto en pantalla:** {g['gancho']['texto_pantalla']}",
        f"- **Voz:** «{g['gancho']['voz']}»",
        "",
        "## Planos",
        "| Seg. | Imagen | Voz | Texto en pantalla |",
        "|---|---|---|---|",
    ]
    for p in g["planos"]:
        celdas = [p["visual"], p["voz"], p["texto_pantalla"]]
        celdas = [c.replace("|", "/").replace("\n", " ") for c in celdas]
        l.append(f"| {_seg(p['seg_inicio'])}–{_seg(p['seg_fin'])} | " + " | ".join(celdas) + " |")
    l += [
        "",
        f"**Final / payoff:** {g['payoff']}  ",
        f"**Llamada a la acción:** {g['cta']}",
        "",
        "## Publicación",
        f"{g['pie']}",
        "",
        " ".join("#" + h.lstrip("#") for h in g["hashtags"]),
        "",
        "## Para grabar",
        *[f"- {m}" for m in g["material_a_grabar"]],
        "",
        f"**Riesgos / cuidado:** {g['riesgos']}",
        "",
    ]
    return "\n".join(l)


def guardar_guiones(guiones: list[dict]) -> list[str]:
    hoy = date.today().isoformat()
    carpeta = SALIDA / "guiones"
    rutas = []
    for g in guiones:
        ruta = carpeta / f"{hoy}-{slug(g['titulo'])}.md"
        escribir_texto(ruta, guion_md(g))
        rutas.append(str(ruta))
    historico = leer_json(SALIDA / "guiones.json", [])
    historico += [{**g, "fecha": hoy} for g in guiones]
    escribir_json(SALIDA / "guiones.json", historico)
    return rutas


def titulos_previos() -> list[str]:
    return [g["titulo"] for g in leer_json(SALIDA / "guiones.json", [])]
