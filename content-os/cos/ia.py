"""Llamadas a Claude: analizar cada viral, sacar reglas y escribir guiones."""
import base64
import json
from pathlib import Path

import anthropic

from .util import (ANALISIS, DESMONTADOS, MARCA, REGLAS_JSON, REGLAS_SEMILLA, SALIDA, leer_json, escribir_json,
                   log)


# ---------- Esquemas (salida estructurada) ----------

def obj(**props) -> dict:
    return {"type": "object", "properties": props, "required": list(props), "additionalProperties": False}


S = {"type": "string"}
N = {"type": "number"}
LS = {"type": "array", "items": S}


def lista(item: dict) -> dict:
    return {"type": "array", "items": item}


ESQ_ANALISIS = obj(
    gancho=obj(tipo=S, visual=S, texto_pantalla=S, primera_frase=S, por_que_funciona=S),
    formato=S,
    estructura=lista(obj(seg_inicio=N, seg_fin=N, funcion=S, descripcion=S)),
    ritmo=obj(cambios_de_plano_por_10s=N, descripcion=S),
    texto_en_pantalla=S,
    audio=S,
    payoff=S,
    cta=S,
    emocion_principal=S,
    palancas_virales=LS,
    por_que_se_hizo_viral=S,
    como_trasladarlo_a_nfc=S,
)

CATEGORIAS = ["gancho", "estructura", "ritmo", "texto", "audio", "payoff", "cta", "tema", "formato", "produccion"]

ESQ_REGLAS = obj(
    reglas=lista(obj(
        id=S,
        categoria={"type": "string", "enum": CATEGORIAS},
        regla=S,
        como_aplicarla=S,
        evidencia=LS,
        confianza={"type": "string", "enum": ["alta", "media", "baja"]},
    ))
)

ESQ_GUIONES = obj(
    guiones=lista(obj(
        titulo=S,
        producto={"type": "string", "enum": ["reseñas Google", "carta", "pedir desde la mesa", "redes sociales",
                                             "llamar al camarero", "varios"]},
        inspirado_en=S,
        angulo=S,
        por_que_despierta_curiosidad=S,
        gancho=obj(visual=S, texto_pantalla=S, voz=S),
        planos=lista(obj(seg_inicio=N, seg_fin=N, visual=S, voz=S, texto_pantalla=S)),
        payoff=S,
        cta=S,
        pie=S,
        hashtags=LS,
        duracion_s=N,
        reglas_aplicadas=LS,
        material_a_grabar=LS,
        riesgos=S,
        curiosidad_1_10=N,
    ))
)


# ---------- Cliente ----------

def _llamar(cfg: dict, sistema: str, contenido: list[dict], esquema: dict) -> dict:
    client = anthropic.Anthropic()
    try:
        with client.beta.messages.stream(
            model=cfg["modelo"],
            max_tokens=64000,
            system=sistema,
            messages=[{"role": "user", "content": contenido}],
            output_config={"effort": cfg["esfuerzo"], "format": {"type": "json_schema", "schema": esquema}},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        ) as stream:
            msg = stream.get_final_message()
    except anthropic.AuthenticationError:
        raise SystemExit("Clave de Anthropic no válida. Define ANTHROPIC_API_KEY (ver README).")
    except anthropic.RateLimitError:
        raise SystemExit("Límite de uso de la API de Anthropic alcanzado. Espera y repite.")
    except anthropic.APIStatusError as e:
        raise SystemExit(f"Error de la API de Anthropic ({e.status_code}): {e.message}")
    except anthropic.APIConnectionError:
        raise SystemExit("No se pudo conectar con la API de Anthropic.")
    if msg.stop_reason == "refusal":
        raise SystemExit("Claude rechazó la petición (refusal). Revisa el contenido enviado.")
    if msg.stop_reason == "max_tokens":
        raise SystemExit("La respuesta se cortó por longitud. Baja `guiones_por_tanda` o el nº de virales.")
    texto = "".join(b.text for b in msg.content if b.type == "text")
    return json.loads(texto)


def _img(ruta: Path) -> dict:
    return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                        "data": base64.standard_b64encode(ruta.read_bytes()).decode()}}


# ---------- 1. Analizar cada viral ----------

SISTEMA_ANALISIS = """Eres analista de vídeo corto (TikTok / Reels). Recibes un vídeo viral desmontado: métricas, \
fotogramas del gancho (primeros segundos), un fotograma por plano con sus tiempos, la transcripción si la hay y el texto \
de la publicación. Explica con precisión qué hace el vídeo segundo a segundo y por qué rindió muy por encima de lo \
normal de su autor. Describe solo lo que se ve o se oye; si algo no se puede saber por los fotogramas, dilo en vez de \
suponerlo. Escribe en español de España, concreto y sin relleno. El campo como_trasladarlo_a_nfc propone cómo usar el \
mismo mecanismo en un vídeo sobre tarjetas y expositores NFC sin que parezca un anuncio."""


def analizar(cfg: dict) -> list[dict]:
    ANALISIS.mkdir(parents=True, exist_ok=True)
    hechos = []
    for info_ruta in sorted(DESMONTADOS.glob("*/info.json")):
        carpeta = info_ruta.parent
        destino = ANALISIS / f"{carpeta.name}.json"
        if destino.exists():
            hechos.append(leer_json(destino))
            continue
        info = leer_json(info_ruta)
        r = info["reel"]
        log(f"  analizando @{r['autor']} ×{r['ratio']}")
        c: list[dict] = [{"type": "text", "text": (
            f"Plataforma: {r['plataforma']} · Autor: @{r['autor']} · Duración: {info['duracion']} s\n"
            f"Visitas: {r['visitas']} · Lo normal del autor: {r['base']} ({r['metodo']}) · ×{r['ratio']}\n"
            f"Likes: {r['likes']} · Comentarios: {r['comentarios']} · Compartidos: {r['compartidos']}\n"
            f"Texto de la publicación: {r['texto'] or '(vacío)'}\n\n"
            "Fotogramas del gancho:")}]
        for g in info["gancho"]:
            c += [{"type": "text", "text": f"Segundo {g['t']}"}, _img(carpeta / g["imagen"])]
        c.append({"type": "text", "text": "Planos (cortes detectados automáticamente; «sigue sin corte» = mismo plano "
                                          "continuo troceado para ver cómo evoluciona):"})
        for p in info["planos"]:
            tipo = "" if p.get("corte", True) else " · sigue sin corte"
            c.append({"type": "text", "text": f"Plano {p['n']}: {p['ini']}–{p['fin']} s ({p['dur']} s){tipo}"})
            if p.get("imagen"):
                c.append(_img(carpeta / p["imagen"]))
        t = info.get("transcripcion")
        if t:
            marcas = " ".join(f"[{w['t']}]{w['p']}" for w in t["palabras"][:400])
            c.append({"type": "text", "text": f"Transcripción ({t['idioma']}):\n{t['texto']}\n\nCon tiempos:\n{marcas}"})
        else:
            c.append({"type": "text", "text": "Sin transcripción: analiza solo lo visual y el texto en pantalla."})
        analisis = {"reel": r, "analisis": _llamar(cfg, SISTEMA_ANALISIS, c, ESQ_ANALISIS)}
        escribir_json(destino, analisis)
        hechos.append(analisis)
    if not hechos:
        raise SystemExit("No hay virales desmontados. Ejecuta antes `desmontar`.")
    return hechos


# ---------- 2. Reglas ----------

SISTEMA_REGLAS = """Eres estratega de contenido corto. Recibes el análisis de varios vídeos que fueron virales \
(muy por encima de lo normal de su autor). Extrae reglas accionables que se repiten entre ellos: cada regla debe \
poder aplicarse al grabar o editar un vídeo nuevo, y citar en evidencia las claves de los vídeos donde aparece. \
Una regla vista en un solo vídeo lleva confianza baja; en tres o más, alta. No incluyas obviedades \
("haz buen contenido") ni reglas sin evidencia. Numera los id como R01, R02... Español de España."""


def extraer_reglas(cfg: dict, analisis: list[dict]) -> list[dict]:
    log(f"  sacando reglas de {len(analisis)} virales")
    cuerpo = json.dumps([{"clave": a["reel"]["clave"], "ratio": a["reel"]["ratio"], "visitas": a["reel"]["visitas"],
                          **a["analisis"]} for a in analisis], ensure_ascii=False)
    reglas = _llamar(cfg, SISTEMA_REGLAS, [{"type": "text", "text": cuerpo}], ESQ_REGLAS)["reglas"]
    escribir_json(REGLAS_JSON, reglas)
    return reglas


# ---------- 3. Guiones ----------

SISTEMA_GUIONES = """Eres guionista de vídeo corto para la marca descrita abajo. Cada guion trata de UNO de sus \
productos (reseñas de Google, carta, pedir desde la mesa, redes sociales, llamar al camarero) y copia la estructura \
de un vídeo viral concreto del aprendizaje: su gancho, sus pasos y su final, adaptados al producto. Indica en \
inspirado_en qué viral copias (autor y qué le copias). Busca curiosidad, no anuncio: quien lo ve debe quedarse por lo \
que pasa o lo que aprende. Aplica las reglas virales que se te dan y cita sus id en reglas_aplicadas. Cada guion debe poder grabarse con un móvil \
y el producto real; lista en material_a_grabar lo que hace falta. Todo dato técnico tiene que ser cierto; si un \
resultado depende de un experimento real (por ejemplo cuánta gente escaneó algo), deja el hueco indicado como \
[RESULTADO REAL] en vez de inventar la cifra. Nada de instrucciones para clonar o leer tarjetas ajenas (pago, hotel, \
DNI) ni de promesas sobre reseñas que incumplan las normas de Google. Ganchos de 1,5 s como máximo. \
Español de España, frases cortas para voz en off."""


def reglas_texto() -> str:
    reglas = leer_json(REGLAS_JSON)
    if reglas:
        return "Reglas extraídas de virales reales:\n" + "\n".join(
            f"{r['id']} [{r['categoria']}, confianza {r['confianza']}]: {r['regla']} — {r['como_aplicarla']}"
            for r in reglas)
    log("  (sin reglas extraídas todavía: uso reglas-semilla.md)")
    return "Reglas semilla (hipótesis, aún sin datos propios):\n" + REGLAS_SEMILLA.read_text(encoding="utf-8")


def generar_guiones(cfg: dict, n: int, tema: str | None, evitar: list[str]) -> list[dict]:
    log(f"  escribiendo {n} guiones")
    pedido = f"Escribe {n} guiones distintos entre sí (ángulos y formatos variados)."
    if tema:
        pedido += f" Tema o idea de partida: {tema}."
    if evitar:
        pedido += "\nYa existen estos títulos; no los repitas ni hagas variaciones obvias:\n- " + "\n- ".join(evitar)
    aprendizaje = SALIDA / "aprendizaje.md"
    c = [
        {"type": "text", "text": "MARCA\n" + MARCA.read_text(encoding="utf-8")},
        {"type": "text", "text": "APRENDIZAJE DE LOS VIRALES\n" + (aprendizaje.read_text(encoding="utf-8")
                                  if aprendizaje.exists() else "(todavía no hay)")},
        {"type": "text", "text": reglas_texto()},
        {"type": "text", "text": pedido},
    ]
    return _llamar(cfg, SISTEMA_GUIONES, c, ESQ_GUIONES)["guiones"]
