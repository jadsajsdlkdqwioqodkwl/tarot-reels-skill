#!/usr/bin/env python
"""Transcribe con faster-whisper (local, sin red) -> JSON de palabras con timing.

Uso:  python transcribe.py <audio_o_video> <salida.json> [modelo=medium] [idioma=es]

Salida: [{"text": "...", "start": s, "end": s}, ...]  (mismo formato que consumen
build-captions / merge-text-timing). Imprime el texto completo y el conteo de palabras.
Requiere `pip install faster-whisper`; el modelo se baja una vez a ~/.cache/huggingface
(usar HF_HUB_OFFLINE=1 si ya está en caché y no querés tocar la red).
Reemplaza a `npx hyperframes transcribe` cuando no hay whisper-cpp instalado.
"""
import json
import sys

from faster_whisper import WhisperModel

if len(sys.argv) < 3:
    sys.exit(__doc__)
src, out = sys.argv[1], sys.argv[2]
model_name = sys.argv[3] if len(sys.argv) > 3 else "medium"
language = sys.argv[4] if len(sys.argv) > 4 else "es"  # JAMÁS un modelo .en si el audio no está en inglés

model = WhisperModel(model_name, device="cpu", compute_type="int8", cpu_threads=4)
segments, _ = model.transcribe(src, language=language, word_timestamps=True, vad_filter=False, beam_size=5)
words = []
for seg in segments:
    for w in seg.words:
        t = w.word.strip()
        if t:
            words.append({"text": t, "start": round(w.start, 3), "end": round(w.end, 3)})
if not words:
    sys.exit("sin palabras: revisá el audio o el idioma (%s)" % language)
with open(out, "w", encoding="utf-8") as f:
    json.dump(words, f, ensure_ascii=False, indent=1)
print(" ".join(w["text"] for w in words))
print(f"\n{len(words)} words, last end {words[-1]['end']}")
