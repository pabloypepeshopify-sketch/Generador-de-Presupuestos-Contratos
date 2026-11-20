"""Recolección de reels: Apify (TikTok / Instagram) o importación de un JSON/CSV propio."""
import csv
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

from .util import REELS, leer_jsonl, escribir_jsonl, log, requiere_env

APIFY = "https://api.apify.com/v2"


# ---------- Normalización ----------

def _get(item: dict, *rutas):
    """Devuelve el primer valor no vacío entre varias rutas tipo 'a.b.0'."""
    for ruta in rutas:
        v = item
        for parte in ruta.split("."):
            if isinstance(v, list) and parte.isdigit():
                v = v[int(parte)] if int(parte) < len(v) else None
            elif isinstance(v, dict):
                v = v.get(parte)
            else:
                v = None
            if v is None:
                break
        if v not in (None, "", []):
            return v
    return None


def _num(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def normalizar(item: dict, plataforma: str) -> dict | None:
    if plataforma == "tiktok":
        r = {
            "id": _get(item, "id"),
            "autor": _get(item, "authorMeta.name", "author.uniqueId", "autor"),
            "seguidores": _num(_get(item, "authorMeta.fans", "seguidores")),
            "visitas": _num(_get(item, "playCount", "stats.playCount", "visitas")),
            "likes": _num(_get(item, "diggCount", "stats.diggCount", "likes")),
            "comentarios": _num(_get(item, "commentCount", "stats.commentCount", "comentarios")),
            "compartidos": _num(_get(item, "shareCount", "stats.shareCount", "compartidos")),
            "url": _get(item, "webVideoUrl", "url"),
            "texto": _get(item, "text", "desc", "texto") or "",
            "video_url": _get(item, "mediaUrls.0", "videoMeta.downloadAddr", "video_url"),
            "duracion": _get(item, "videoMeta.duration", "duracion"),
            "fecha": _get(item, "createTimeISO", "fecha"),
        }
    else:
        codigo = _get(item, "shortCode", "code")
        r = {
            "id": _get(item, "id", "shortCode"),
            "autor": _get(item, "ownerUsername", "owner.username", "autor"),
            "seguidores": _num(_get(item, "ownerFollowersCount", "seguidores")),
            "visitas": _num(_get(item, "videoPlayCount", "videoViewCount", "playCount", "visitas")),
            "likes": _num(_get(item, "likesCount", "likes")),
            "comentarios": _num(_get(item, "commentsCount", "comentarios")),
            "compartidos": _num(_get(item, "sharesCount", "compartidos")),
            "url": _get(item, "url") or (f"https://www.instagram.com/reel/{codigo}/" if codigo else None),
            "texto": _get(item, "caption", "texto") or "",
            "video_url": _get(item, "videoUrl", "video_url"),
            "duracion": _get(item, "videoDuration", "duracion"),
            "fecha": _get(item, "timestamp", "fecha"),
        }
    if not r["id"] or not r["autor"] or r["visitas"] is None:
        return None
    r["id"] = str(r["id"])
    r["plataforma"] = plataforma
    r["clave"] = f"{plataforma}:{r['id']}"
    return r


def guardar(nuevos: list[dict]) -> int:
    """Une con lo ya guardado (por clave). Lo nuevo pisa a lo viejo: las métricas se actualizan."""
    todos = {r["clave"]: r for r in leer_jsonl(REELS)}
    antes = len(todos)
    for r in nuevos:
        todos[r["clave"]] = {**todos.get(r["clave"], {}), **{k: v for k, v in r.items() if v is not None}}
    escribir_jsonl(REELS, list(todos.values()))
    return len(todos) - antes


# ---------- Apify ----------

def _apify(metodo: str, ruta: str, token: str, cuerpo=None):
    req = urllib.request.Request(
        APIFY + ruta,
        method=metodo,
        data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    for intento in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and intento < 3:
                time.sleep(5 * (intento + 1))
                continue
            raise SystemExit(f"Apify {e.code} en {ruta}: {e.read()[:500].decode(errors='ignore')}")
        except urllib.error.URLError:
            if intento < 3:
                time.sleep(5 * (intento + 1))
                continue
            raise


def _rellenar(plantilla, valores: dict):
    if isinstance(plantilla, dict):
        return {k: _rellenar(v, valores) for k, v in plantilla.items()}
    if isinstance(plantilla, list):
        return [_rellenar(v, valores) for v in plantilla]
    if isinstance(plantilla, str) and plantilla in valores:
        return valores[plantilla]
    return plantilla


def ejecutar_actor(actor: str, entrada: dict, token: str, max_usd: float | None = None) -> list[dict]:
    log(f"  Apify → {actor} {json.dumps(entrada, ensure_ascii=False)[:160]}")
    tope = f"?maxTotalChargeUsd={max_usd}" if max_usd else ""
    run = _apify("POST", f"/acts/{actor}/runs{tope}", token, entrada)["data"]
    run_id, dataset = run["id"], run["defaultDatasetId"]
    while True:
        datos = _apify("GET", f"/actor-runs/{run_id}", token)["data"]
        estado = datos["status"]
        if estado == "SUCCEEDED":
            break
        if estado in ("FAILED", "ABORTED", "TIMED-OUT"):
            raise SystemExit(f"El actor {actor} terminó en {estado} (run {run_id}).")
        time.sleep(10)
    gasto = datos.get("usageTotalUsd")
    if gasto is not None:
        log(f"  gasto de esta ejecución: {gasto:.2f} $")
    items, offset = [], 0
    while True:
        lote = _apify("GET", f"/datasets/{dataset}/items?clean=true&format=json&offset={offset}&limit=1000", token)
        items += lote
        if len(lote) < 1000:
            return items
        offset += 1000


def recolectar_apify(cfg: dict) -> None:
    token = requiere_env("APIFY_TOKEN", "para descargar reels con Apify")
    tope = cfg.get("max_usd_por_ejecucion")
    hashtags = [h.lstrip("#") for grupo in (cfg.get("hashtags") or {}).values() for h in grupo]
    # Cada búsqueda recuerda a qué grupo pertenece (producto o formato) para luego filtrar por tema.
    grupo_de = {q.lower(): g for g, qs in (cfg.get("busquedas") or {}).items() for q in qs}
    for plataforma in cfg["plataformas"]:
        plantillas = cfg["apify"][plataforma]
        reels = []
        if hashtags:
            log(f"[{plataforma}] hashtags: {', '.join(hashtags)}")
            crudos = ejecutar_actor(
                plantillas["hashtags"]["actor"],
                _rellenar(plantillas["hashtags"]["input"], {"$HASHTAGS": hashtags, "$N": cfg["max_por_hashtag"]}),
                token, tope,
            )
            reels += [r for r in (normalizar(i, plataforma) for i in crudos) if r]
        if grupo_de and plantillas.get("busquedas"):
            log(f"[{plataforma}] {len(grupo_de)} búsquedas")
            crudos = ejecutar_actor(
                plantillas["busquedas"]["actor"],
                _rellenar(plantillas["busquedas"]["input"], {"$BUSQUEDAS": list(grupo_de), "$N": cfg["max_por_hashtag"]}),
                token, tope,
            )
            for i in crudos:
                r = normalizar(i, plataforma)
                if r:
                    q = str(i.get("searchQuery") or "").lower()
                    r["busqueda"], r["grupo"] = q or None, grupo_de.get(q)
                    reels.append(r)
        log(f"  {len(reels)} reels válidos, {guardar(reels)} nuevos")

        # Para saber "lo normal" de cada autor hacen falta más vídeos suyos.
        perfiles = list(cfg.get("perfiles") or [])
        por_visitas = sorted(reels, key=lambda r: r["visitas"], reverse=True)
        for r in por_visitas:
            if len(perfiles) >= cfg["autores_para_baseline"]:
                break
            if r["autor"] not in perfiles:
                perfiles.append(r["autor"])
        if not perfiles:
            continue
        log(f"[{plataforma}] histórico de {len(perfiles)} autores")
        crudos = ejecutar_actor(
            plantillas["perfiles"]["actor"],
            _rellenar(plantillas["perfiles"]["input"], {"$PERFILES": perfiles, "$N": cfg["max_por_perfil"]}),
            token, tope,
        )
        reels = [r for r in (normalizar(i, plataforma) for i in crudos) if r]
        log(f"  {len(reels)} reels válidos, {guardar(reels)} nuevos")


def enlaces_de_video(cfg: dict, reels: list[dict]) -> dict[str, str]:
    """Pide a Apify el vídeo descargable solo de estos reels (los virales). Devuelve {clave: url}."""
    token = requiere_env("APIFY_TOKEN", "para descargar los vídeos virales con Apify")
    enlaces = {}
    for plataforma in {r["plataforma"] for r in reels}:
        plantilla = cfg["apify"].get(plataforma, {}).get("videos")
        lista = [r for r in reels if r["plataforma"] == plataforma and r.get("url")]
        if not plantilla or not lista:
            continue
        log(f"[{plataforma}] pidiendo el vídeo de {len(lista)} virales")
        crudos = ejecutar_actor(plantilla["actor"],
                                _rellenar(plantilla["input"], {"$URLS": [r["url"] for r in lista]}),
                                token, cfg.get("max_usd_por_ejecucion"))
        for i in crudos:
            r = normalizar(i, plataforma)
            if r and r.get("video_url"):
                enlaces[r["clave"]] = r["video_url"]
    return enlaces


# ---------- Importación manual ----------

def importar(ruta: Path, plataforma: str) -> None:
    """Acepta el JSON tal cual lo exporta Apify, una lista ya normalizada, o un CSV con columnas
    id, autor, visitas, url, texto, video_url, duracion, seguidores, likes, comentarios."""
    if ruta.suffix.lower() == ".csv":
        with open(ruta, encoding="utf-8-sig", newline="") as f:
            crudos = list(csv.DictReader(f))
    else:
        with open(ruta, encoding="utf-8") as f:
            crudos = json.load(f)
        if isinstance(crudos, dict):
            crudos = crudos.get("items") or crudos.get("reels") or []
    reels = []
    for i in crudos:
        plat = i.get("plataforma") or plataforma
        r = normalizar(i, plat)
        if r:
            reels.append(r)
    log(f"{len(reels)} de {len(crudos)} filas válidas, {guardar(reels)} nuevas")
