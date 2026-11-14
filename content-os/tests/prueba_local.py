"""Prueba sin claves: normalización, filtro de virales, desmontaje de un vídeo local y render.
Uso: python tests/prueba_local.py [ruta_a_un_video.mp4]"""
import json, shutil, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import cos.util as u

tmp = Path(tempfile.mkdtemp())
for nombre, valor in {"DATOS": tmp / "datos", "SALIDA": tmp / "salida"}.items():
    setattr(u, nombre, valor)
u.REELS, u.VIRALES = u.DATOS / "reels.jsonl", u.DATOS / "virales.json"
u.DESMONTADOS, u.ANALISIS, u.REGLAS_JSON = u.DATOS / "desmontados", u.DATOS / "analisis", u.DATOS / "reglas.json"
from cos import fuentes, virales, desmontar, render
for m in (fuentes, virales, desmontar, render):
    for k in ("REELS", "VIRALES", "SALIDA", "DESMONTADOS"):
        if hasattr(m, k): setattr(m, k, getattr(u, k))

cfg = u.cargar_config()
video = sys.argv[1] if len(sys.argv) > 1 else None

# 1. Normalización con formas reales de Apify
tt = {"id": "1", "authorMeta": {"name": "ana", "fans": 1000}, "playCount": 900000, "diggCount": 5,
      "webVideoUrl": "https://tiktok.com/@ana/video/1", "text": "hola", "videoMeta": {"duration": 20}}
ig = {"id": "9", "shortCode": "Cx", "ownerUsername": "luis", "videoPlayCount": 1200, "caption": "x"}
a, b = fuentes.normalizar(tt, "tiktok"), fuentes.normalizar(ig, "instagram")
assert a["autor"] == "ana" and a["visitas"] == 900000 and a["seguidores"] == 1000
assert b["url"] == "https://www.instagram.com/reel/Cx/" and b["visitas"] == 1200
assert fuentes.normalizar({"id": "2"}, "tiktok") is None

# 2. Virales: autor con 6 vídeos normales (~10k) y uno de 600k; otro autor solo con seguidores
reels = []
for i, v in enumerate([9000, 11000, 10000, 12000, 8000, 10500, 600000]):
    reels.append({"clave": f"tiktok:a{i}", "id": f"a{i}", "plataforma": "tiktok", "autor": "ana", "visitas": v,
                  "url": f"https://x/{i}", "video_url": (Path(video).resolve().as_uri() if video else None)})
reels.append({"clave": "instagram:s1", "id": "s1", "plataforma": "instagram", "autor": "solo", "visitas": 400000,
              "seguidores": 20000, "url": "https://y/1"})
reels.append({"clave": "instagram:s2", "id": "s2", "plataforma": "instagram", "autor": "nadie", "visitas": 90000,
              "url": "https://y/2"})
vir = virales.calcular(cfg, reels)
claves = [v["clave"] for v in vir]
assert claves == ["tiktok:a6", "instagram:s1"], claves
assert vir[0]["ratio"] == 58.5 and vir[0]["metodo"] == "mediana_autor"
assert vir[1]["metodo"] == "seguidores" and vir[1]["ratio"] == 20.0
print("virales OK:", [(v["autor"], v["ratio"]) for v in vir])

# 3. Desmontaje de un vídeo local
if video:
    hechos = desmontar.desmontar(cfg, ["tiktok:a6"])
    info = hechos[0]
    assert info["planos"] and info["gancho"]
    carpeta = u.DESMONTADOS / "tiktok_a6"
    imgs = sorted(p.name for p in carpeta.glob("*.jpg"))
    assert all((carpeta / p["imagen"]).exists() for p in info["planos"] if p.get("imagen"))
    print(f"desmontaje OK: {len(info['planos'])} planos, {len(imgs)} imágenes, {info['duracion']} s")
    print("  planos:", [(p["ini"], p["fin"]) for p in info["planos"]])

# 4. Render de guiones semilla
semilla = json.loads((u.RAIZ / "ejemplos" / "guiones-semilla.json").read_text(encoding="utf-8"))
rutas = render.guardar_guiones(semilla)
assert len(rutas) == 10 and render.titulos_previos()[0] == semilla[0]["titulo"]
print("render OK:", Path(rutas[0]).name)
shutil.rmtree(tmp)
print("TODO OK")
