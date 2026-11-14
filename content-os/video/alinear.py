"""Tiempos de cada palabra de una voz en off (Whisper local) → JSON para subtítulos y animación.
Uso: python video/alinear.py voces/que-pasa.mp3 [texto_guion.txt]"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel


def alinear(audio: Path, guion: str | None = None) -> list[dict]:
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(audio), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    modelo = WhisperModel("small", device="cpu", compute_type="int8")
    segs, _ = modelo.transcribe(np.frombuffer(pcm, dtype=np.float32), language="es", word_timestamps=True,
                                initial_prompt=guion)
    return [{"p": w.word.strip(), "t": round(w.start, 3), "fin": round(w.end, 3)}
            for s in segs for w in (s.words or []) if w.word.strip()]


if __name__ == "__main__":
    audio = Path(sys.argv[1])
    guion = Path(sys.argv[2]).read_text(encoding="utf-8") if len(sys.argv) > 2 else None
    palabras = alinear(audio, guion)
    destino = audio.with_suffix(".json")
    destino.write_text(json.dumps(palabras, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(palabras)} palabras → {destino}")
