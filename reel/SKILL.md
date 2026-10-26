---
name: reel
description: >-
  Punto de entrada único para crear un reel musical AI de punta a punta.
  Orquesta todo el pipeline: personaje → guión → audio → video → post.
  Invocar este skill, no los individuales.
compatibility: claude-code
version: 1.0.0
---

# Reel — Pipeline Completo de Punta a Punta

Este es el único skill que el usuario necesita invocar. Internamente llama a
`brand`, `song-script`, `video-gen` y `reels-editor` en el orden correcto.

---

## PASO 1 — Seleccionar personaje (SIEMPRE preguntar, nunca asumir)

Leer `brand.json` si existe. Mostrar los personajes guardados en `brand.json → characters[]`.

```
🎭 ¿Qué perfil usamos para este reel?

[Si hay personajes guardados, listarlos]:
  a) Luna — mujer mística 28-35, cabello oscuro dorado (✅ character sheet listo)
  b) Nuevo personaje — describir ahora
  c) Sin personaje — solo texto y ambientes

[Si no hay ninguno guardado]:
  a) Crear personaje ahora (5 preguntas rápidas)
  b) Sin personaje — solo texto y ambientes
```

**Si elige personaje existente con character sheet listo:** saltar Fase 1 de `video-gen` (ya existe en `references/characters/`).  
**Si elige nuevo:** ejecutar Fase 1 de `video-gen` (generar character sheet antes de los clips).  
**Si elige sin personaje:** los 9 clips serán solo de ambiente, objetos, texto animado — sin figura humana.

---

## PASO 2 — Brief del reel

Preguntar solo lo que no esté en `brand.json`:

```
📋 Brief rápido para este reel

1. ¿Qué quieres comunicar? (producto, oferta, dolor a resolver): ___
2. Tono de este reel: [místico / empoderador / íntimo / urgente]
   (default: el de brand.json si existe)
3. CTA de este reel: ___
   (default: el de brand.json si existe)
4. ¿Variante A/B? [solo A / generar también variante B con hook diferente]
```

Con eso y `brand.json` ya tenemos todo. **No preguntar cosas que brand.json ya responde.**

---

## PASO 3 — Guión (invocar song-script internamente)

Con el brief listo, ejecutar el flujo de `song-script`:

1. Generar guión de 9 beats según el tono elegido
2. Si pidió A/B: generar también variante B (mismo Pain→CTA, hook y agitation distintos)
3. Mostrar el guión (o los dos guiones A/B)
4. **Gate: esperar aprobación antes de seguir**

```
📝 ¿Aprobamos el guión?

a) Sí, avanzar a audio y video
b) Editar beat [número]
c) Reescribir el hook — mostrar 3 alternativas
d) Cambiar el tono a [otro]
```

---

## PASO 4 — Estimación de costo

Mostrar ANTES de generar cualquier cosa con fal.ai:

```
💰 Estimación de costo para este reel

  Personaje:
  ├─ Character sheet ya existe → $0.00
  └─ Generar character sheet (10 imgs Flux Dev) → $0.25

  Clips de video:
  └─ 9 clips × 5s Kling O3 → ~$1.26

  Variante B (si aplica):
  └─ 9 clips adicionales → ~$1.26

  ─────────────────────────────────────
  Total estimado: ~$X.XX
  (verificar en https://fal.ai/dashboard/billing)

¿Procedemos?
  a) Sí, generar todo
  b) Generar solo beats [números] como prueba primero
  c) Solo el guión por ahora — generar video después
  d) Cancelar
```

---

## PASO 5 — Audio con Beatra

```bash
npx skills add beatra-ai/lyrics-to-song-skill
```

Pasar la letra completa del guión aprobado. Si hay variante B, generar también su audio.

Guardar en:
- `outputs/audio/reel-[slug]-A.mp3`
- `outputs/audio/reel-[slug]-B.mp3` (si aplica)

**No avanzar al video hasta tener el audio listo.** El audio define el timing de los clips.

---

## PASO 6 — Clips de video (invocar video-gen internamente)

Ejecutar el flujo de `video-gen`:

1. Si personaje nuevo: Fase 1 (character sheet) — mostrar hero, esperar aprobación, generar 9 ángulos
2. Fase 2: generar 9 clips de 5s con Kling O3
3. Si hay variante B: repetir Fase 2 con el mismo personaje pero prompts adaptados al guión B
4. Fase 3: stitch de clips → `outputs/reel-[slug]-A-raw.mp4`

Guardar clips individuales en `outputs/beats/[slug]/beat-[N].mp4`.

---

## PASO 7 — Post-producción (invocar reels-editor internamente)

Con audio + video raw listos:

```
Video raw: outputs/reel-[slug]-A-raw.mp4
Audio:     outputs/audio/reel-[slug]-A.mp3
```

El skill `reels-editor` hace:
- Sincronizar audio con video (AV delay = 0.0ms obligatorio)
- Agregar captions sincronizados
- Agregar hook textual (preguntar el texto antes)
- Exportar en el ratio de `brand.json` (4:5 o 9:16)

Output final: `renders/REEL-[slug]-A-final.mp4`

---

## PASO 8 — Entrega

```
✅ Reel listo

  📹 Variante A: renders/REEL-[slug]-A-final.mp4
  📹 Variante B: renders/REEL-[slug]-B-final.mp4  (si aplica)

  Duración: [X]s
  Ratio: [4:5 / 9:16]
  AV delay verificado: 0.0ms ✅

  Personaje usado: [nombre] → guardado en references/characters/[carpeta]/
  Costo real: ver https://fal.ai/dashboard/billing

  ¿Qué sigue?
  a) Crear otro reel (mismo personaje)
  b) Crear otro reel (personaje diferente)
  c) Ajustar algo de este reel
  d) Exportar también en otro ratio
```

---

## A/B Testing — cómo funciona

Un A/B en este pipeline significa: **mismo Pain→Transformation→CTA, hook y agitation distintos**.
El algoritmo de Meta muestra ambas versiones y te dice cuál convierte más.

| | Variante A | Variante B |
|---|---|---|
| Hook (Beat 1) | Version original | Hook alternativo (más directo/más curioso) |
| Pain (Beat 2) | Igual | Igual |
| Agitation (Beat 3) | Version original | Formulación diferente del mismo dolor |
| Dream→CTA (Beats 4-9) | Igual | Igual |
| Personaje | Igual | Igual (o diferente si querés testear eso también) |
| Costo adicional | — | ~$1.26 más |

Para testear personaje diferente (demografía distinta), elegir "Crear nuevo personaje" en el Paso 1 de la variante B. Esto suma $0.25 del character sheet.

---

## Gestión de personajes guardados

Los personajes se guardan en `brand.json → characters[]` (array, no objeto único):

```json
{
  "characters": [
    {
      "id": "luna",
      "name": "Luna",
      "ageApparent": "28-35",
      "gender": "femenino",
      "hair": "cabello largo oscuro con mechones dorados",
      "eyes": "oscuros, mirada intensa",
      "skin": "tono oliva, piel visible con textura natural",
      "outfit": "túnica morada con detalles dorados, joyería étnica con cristales",
      "world": "interior místico: velas, cristales, terciopelo morado, humo dorado",
      "sheetPath": "references/characters/luna-oscuro-dorado-oliva/",
      "sheetReady": true
    }
  ]
}
```

Cuando se crea un personaje nuevo y se aprueba su character sheet, se agrega automáticamente a este array con `"sheetReady": true`.

---

## Estructura de outputs por reel

```
tarot-reels-skill/
├── brand.json                        ← config de marca + array de personajes
├── references/characters/
│   └── luna-oscuro-dorado-oliva/     ← character sheet (10 imágenes)
├── outputs/
│   ├── beats/[slug]/beat-[1-9].mp4  ← clips individuales
│   ├── audio/reel-[slug]-A.mp3
│   ├── audio/reel-[slug]-B.mp3
│   ├── reel-[slug]-A-raw.mp4        ← clips concatenados (sin audio final)
│   └── reel-[slug]-B-raw.mp4
├── renders/
│   ├── REEL-[slug]-A-final.mp4      ← entrega final con audio + captions
│   └── REEL-[slug]-B-final.mp4
└── logs/fal-api.jsonl               ← log de cada llamada a fal.ai
```

---

## Bugs conocidos y cómo manejarlos

| Problema | Causa probable | Qué hacer |
|----------|---------------|-----------|
| Clip con cara distorsionada | Kling O3 no respetó el reference | Regenerar ese beat con prompt más restrictivo en descripción facial |
| Personaje diferente entre clips | Las 3 referencias no cubren el ángulo generado | Agregar más ángulos del character sheet como referencia (usar 06-face-closeup siempre) |
| AV delay ≠ 0.0ms | HyperFrames remuestrea el audio | Re-muxear: `ffmpeg -i render.mp4 -i master.mp3 -map 0:v -map 1:a -c copy output.mp4` |
| Error 429 en fal.ai | Rate limit alcanzado | Esperar 60s y reintentar; los clips se generan en secuencia por esto |
| Audio de Beatra no encaja en los 9 beats | Letra demasiado larga o corta | Editar la letra del beat problemático y regenerar solo ese audio |
| Captions desincronizados | Whisper small driftea en tomas largas | Usar `medium` en `transcribe.py` para el timing |

---

## Checklist de seguridad antes de cada commit

- [ ] `git status` — `.env` y `FAL_KEY` NO aparecen staged
- [ ] `outputs/` no está staged (`.gitignore` lo cubre)
- [ ] `references/characters/` no está staged (`.gitignore` lo cubre)
- [ ] `logs/fal-api.jsonl` no está staged (`.gitignore` lo cubre)
