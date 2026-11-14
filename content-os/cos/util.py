"""Rutas, configuración y E/S comunes."""
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "datos"
SALIDA = RAIZ / "salida"

REELS = DATOS / "reels.jsonl"
VIRALES = DATOS / "virales.json"
DESMONTADOS = DATOS / "desmontados"
ANALISIS = DATOS / "analisis"
REGLAS_JSON = DATOS / "reglas.json"
REGLAS_SEMILLA = RAIZ / "reglas-semilla.md"
MARCA = RAIZ / "marca.md"


def cargar_config() -> dict:
    with open(RAIZ / "config.json", encoding="utf-8") as f:
        return json.load(f)


def leer_json(ruta: Path, defecto=None):
    if not ruta.exists():
        return defecto
    with open(ruta, encoding="utf-8") as f:
        return json.load(f)


def escribir_json(ruta: Path, datos) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    tmp = ruta.with_suffix(ruta.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    tmp.replace(ruta)


def leer_jsonl(ruta: Path) -> list[dict]:
    if not ruta.exists():
        return []
    with open(ruta, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def escribir_jsonl(ruta: Path, filas: list[dict]) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    tmp = ruta.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        for fila in filas:
            f.write(json.dumps(fila, ensure_ascii=False) + "\n")
    tmp.replace(ruta)


def escribir_texto(ruta: Path, texto: str) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(texto, encoding="utf-8")


def slug(texto: str, largo: int = 50) -> str:
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-zA-Z0-9]+", "-", t).strip("-").lower()
    return t[:largo].strip("-") or "sin-titulo"


def requiere_env(nombre: str, para: str) -> str:
    valor = os.environ.get(nombre, "").strip()
    if not valor:
        sys.exit(f"Falta la variable de entorno {nombre} ({para}). Ver README.")
    return valor


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def miles(n) -> str:
    if n is None:
        return "—"
    return f"{int(n):,}".replace(",", ".")
