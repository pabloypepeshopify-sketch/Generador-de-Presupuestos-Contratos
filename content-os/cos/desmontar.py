"""Desmontaje plano a plano: descarga, cortes de escena, fotogramas clave y transcripción."""
import json
import os
import re
import subprocess
import urllib.request
import uuid
from pathlib import Path

from .util import DESMONTADOS, VIRALES, leer_json, escribir_json, log

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
MOMENTOS_GANCHO = [0.0, 0.5, 1.0, 1.5, 2.5]


def _ff(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True)


def duracion(video: Path) -> float:
    r = _ff("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video))
    return float(r.stdout.strip() or 0)


def descargar(url: str, destino: Path) -> bool:
    if destino.exists() and destino.stat().st_size > 10_000:
        return True
    try:
        cab = {"User-Agent": UA, "Referer": "https://www.tiktok.com/"}
        if url.startswith("https://api.apify.com/") and os.environ.get("APIFY_TOKEN"):
            cab = {"Authorization": f"Bearer {os.environ['APIFY_TOKEN']}"}
        req = urllib.request.Request(url, headers=cab)
        with urllib.request.urlopen(req, timeout=120) as resp, open(destino, "wb") as f:
            while bloque := resp.read(1 << 16):
                f.write(bloque)
        return destino.stat().st_size > 10_000
    except Exception as e:  # URL caducada, 403 del CDN, etc.
        log(f"    no se pudo descargar: {e}")
        destino.unlink(missing_ok=True)
        return False


def puntuaciones(video: Path) -> list[tuple[float, float]]:
    """Cambio de imagen (0–1) de cada fotograma respecto al anterior."""
    r = _ff("ffmpeg", "-hide_banner", "-i", str(video), "-an",
            "-vf", "select='gte(scene,0)',metadata=print:file=-", "-f", "null", "-")
    pares = re.findall(r"pts_time:([\d.]+)\s+lavfi\.scene_score=([\d.]+)", r.stdout)
    return [(float(t), float(s)) for t, s in pares]


def cortes(video: Path, umbral: float, total: float) -> list[float]:
    """Cortes de plano. Si con el umbral apenas hay (vídeo de cámara continua, oscuro…), lo baja
    hasta tener ~1 corte cada 8 s. Dentro de 0,4 s se queda con el cambio más fuerte."""
    pts = puntuaciones(video)
    elegidos: list[tuple[float, float]] = []
    for u in sorted({umbral, 0.2, 0.12}, reverse=True):
        if u > umbral:
            continue
        elegidos = []
        for t, s in pts:
            if s < u or not 0.25 < t < total - 0.25:
                continue
            if elegidos and t - elegidos[-1][0] < 0.4:
                if s > elegidos[-1][1]:
                    elegidos[-1] = (t, s)
                continue
            elegidos.append((t, s))
        if len(elegidos) >= total / 8:
            break
    return [round(t, 2) for t, _ in elegidos]


def planos(video: Path, umbral: float, maximo: int, tramo_max: float = 4.0) -> list[dict]:
    total = duracion(video)
    limites = [0.0] + cortes(video, umbral, total) + [total]
    lista = []
    for ini, fin in zip(limites, limites[1:]):
        if lista and fin - ini < 0.25:  # fusiona destellos
            lista[-1]["fin"] = fin
            continue
        # Plano largo sin corte (cámara en movimiento): se trocea para ver cómo evoluciona.
        trozos = max(1, round((fin - ini) / tramo_max))
        for k in range(trozos):
            a = ini + (fin - ini) * k / trozos
            lista.append({"ini": round(a, 2), "fin": round(ini + (fin - ini) * (k + 1) / trozos, 2),
                          "corte": k == 0})
    for i, p in enumerate(lista, 1):
        p["n"] = i
        p["dur"] = round(p["fin"] - p["ini"], 2)
    if len(lista) > maximo:  # muestreo uniforme para no mandar 60 imágenes a la IA
        paso = len(lista) / maximo
        for i, p in enumerate(lista):
            p["con_imagen"] = int(i / paso) != int((i - 1) / paso) if i else True
    else:
        for p in lista:
            p["con_imagen"] = True
    return lista


def fotograma(video: Path, t: float, destino: Path) -> None:
    _ff("ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(video),
        "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "4", str(destino))


def transcribir(video: Path, carpeta: Path) -> dict | None:
    """ElevenLabs Speech-to-Text (scribe_v1). Sin ELEVENLABS_API_KEY se omite."""
    clave = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not clave:
        return None
    audio = carpeta / "audio.mp3"
    _ff("ffmpeg", "-v", "error", "-y", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", str(audio))
    if not audio.exists():
        return None
    limite = "----cos" + uuid.uuid4().hex
    cuerpo = b"".join([
        f"--{limite}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n".encode(),
        f"--{limite}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"audio.mp3\"\r\n"
        f"Content-Type: audio/mpeg\r\n\r\n".encode(),
        audio.read_bytes(),
        f"\r\n--{limite}--\r\n".encode(),
    ])
    req = urllib.request.Request(
        "https://api.elevenlabs.io/v1/speech-to-text", data=cuerpo, method="POST",
        headers={"xi-api-key": clave, "Content-Type": f"multipart/form-data; boundary={limite}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            datos = json.loads(resp.read())
    except Exception as e:
        log(f"    transcripción fallida: {e}")
        return None
    palabras = [w for w in datos.get("words", []) if w.get("type") == "word"]
    return {
        "idioma": datos.get("language_code"),
        "texto": datos.get("text", ""),
        "palabras": [{"t": round(w.get("start", 0), 2), "p": w.get("text", "")} for w in palabras],
    }


def desmontar(cfg: dict, solo: list[str] | None = None) -> list[dict]:
    virales = leer_json(VIRALES, [])
    if not virales:
        raise SystemExit("No hay virales. Ejecuta antes `virales`.")
    objetivo = [v for v in virales if not solo or v["clave"] in solo][: cfg["max_virales_a_desmontar"]]
    carpeta_de = lambda v: DESMONTADOS / v["clave"].replace(":", "_")

    # Plataformas con plantilla "videos" (TikTok): se pide el vídeo descargable solo de los virales pendientes.
    pendientes = [v for v in objetivo if not (carpeta_de(v) / "info.json").exists()
                  and cfg["apify"].get(v["plataforma"], {}).get("videos")]
    if pendientes:
        from .fuentes import enlaces_de_video
        enlaces = enlaces_de_video(cfg, pendientes)
        for v in pendientes:
            v["video_url"] = enlaces.get(v["clave"]) or v.get("video_url")

    hechos = []
    for v in objetivo:
        carpeta = carpeta_de(v)
        info_ruta = carpeta / "info.json"
        if info_ruta.exists():
            hechos.append(leer_json(info_ruta))
            continue
        log(f"  desmontando @{v['autor']} ×{v['ratio']} ({v['url']})")
        if not v.get("video_url"):
            log("    sin URL de vídeo (activa la descarga en el actor de Apify)")
            continue
        carpeta.mkdir(parents=True, exist_ok=True)
        video = carpeta / "video.mp4"
        if not descargar(v["video_url"], video):
            continue
        lista = planos(video, cfg["umbral_escena"], cfg["max_planos_por_reel"])
        for p in lista:
            if p["con_imagen"]:
                p["imagen"] = f"plano_{p['n']:02d}.jpg"
                fotograma(video, p["ini"] + p["dur"] / 2, carpeta / p["imagen"])
        gancho = []
        for t in MOMENTOS_GANCHO:
            if t < lista[-1]["fin"]:
                nombre = f"gancho_{t:.1f}s.jpg"
                fotograma(video, t, carpeta / nombre)
                gancho.append({"t": t, "imagen": nombre})
        info = {
            "reel": {k: v.get(k) for k in ("clave", "plataforma", "autor", "url", "texto", "visitas",
                                            "likes", "comentarios", "compartidos", "base", "ratio", "metodo")},
            "duracion": lista[-1]["fin"],
            "planos": lista,
            "gancho": gancho,
            "transcripcion": transcribir(video, carpeta),
        }
        escribir_json(info_ruta, info)
        hechos.append(info)
        log(f"    {len(lista)} planos, {'con' if info['transcripcion'] else 'sin'} transcripción")
    return hechos
