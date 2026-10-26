---
name: video-gen
description: >-
  Genera clips de video AI para reels/anuncios usando fal.ai (Kling 3.0, Seedance 2.0,
  Flux). Incluye flujo completo de identity lock: character sheet de 10 imágenes con Flux,
  luego generación de clips con Kling O3 usando element referencing para consistencia
  de personaje. Pensado para "Tarot para Principiantes" pero adaptable. Usar después
  del skill song-script.
compatibility: claude-code
version: 1.0.0
---

# Video Gen — Generación de Clips AI con fal.ai

## Configuración

- **SDK:** `@fal-ai/client` (npm)
- **Auth:** Variable de entorno `FAL_KEY` — nunca la imprimas ni la commits.
- **`.env` obligatorio:** Copia `.env.example` y agrega `FAL_KEY=tu_key_aquí`
- **`.gitignore`:** Verificar que `.env` esté excluido ANTES de cualquier commit.

```bash
# Setup inicial
npm install @fal-ai/client sharp
echo "FAL_KEY=" >> .env
echo ".env" >> .gitignore
```

Antes del primer llamado, confirmar que `.gitignore` excluye `.env`.

---

## Modelos disponibles y costos estimados

| Modelo | fal.ai endpoint | Costo aprox. | Cuándo usarlo |
|--------|----------------|--------------|---------------|
| **Kling O3** (identity lock) | `fal-ai/kling-video/o3/pro/text-to-video` | $0.10–0.17/clip 5s | Personaje consistente beat a beat |
| **Kling V3** (cinematic) | `fal-ai/kling-video/v3/pro/text-to-video` | $0.11–0.17/clip 5s | Tomas de ambiente sin personaje |
| **Seedance 2.0 i2v** | `fal-ai/bytedance/seedance/v2/pro/image-to-video` | $0.24–0.30/clip 5s | Animar una imagen fija de personaje |
| **Flux Schnell** (character sheet) | `fal-ai/flux/schnell` | $0.003/imagen | Generar 10 ángulos del personaje |
| **Flux Dev** (character sheet HQ) | `fal-ai/flux/dev` | $0.025/imagen | Personaje con mayor detalle |

**Estimación para un reel de 9 beats:**
- Character sheet: 10 imágenes × $0.003 = **$0.03**
- 9 clips × 5s Kling O3: 9 × ~$0.14 = **$1.26**
- **Total estimado: ~$1.30 por reel** (sin audio)

---

## FASE 1 — Character Sheet (Identity Lock)

### Flujo obligatorio antes de generar video

El identity lock requiere tener imágenes de referencia del personaje desde múltiples ángulos antes de generar cualquier clip.

#### 1a. Generar hero portrait

```javascript
import { fal } from "@fal-ai/client";

const heroResult = await fal.subscribe("fal-ai/flux/schnell", {
  input: {
    prompt: `[DESCRIPCIÓN_PERSONAJE] — hero portrait, frente directa, lighting suave,
      fondo neutro oscuro, ultra HD, fotografía realista, estilo editorial.
      Colores: vestimenta morada #1A0B2E con detalles dorados #FFC83D.
      Sin texto, sin marcos.`,
    image_size: "portrait_4_3",
    num_images: 1,
    enable_safety_checker: true,
  },
  logs: true,
});

const heroImageUrl = heroResult.data.images[0].url;
// Mostrar al usuario y esperar aprobación antes de continuar
```

**GATE OBLIGATORIA:** Mostrar el hero portrait al usuario y pedir aprobación antes de los 9 ángulos.

#### 1b. Generar 9 ángulos con el hero como referencia

Una vez aprobado el hero, generar estas variaciones (pasando el hero como `image_url` de referencia usando `flux-lora` o `flux-dev` con IP-Adapter, o usando Seedance i2v para los ángulos):

Ángulos requeridos:
1. Frente directa (hero — ya tenés)
2. Perfil izquierdo
3. Perfil derecho
4. Tres cuartos izquierda
5. Tres cuartos derecha
6. Plano detalle — cara + hombros
7. Plano entero — de pies a cabeza
8. Espalda (opcional)
9. Expresión: sonrisa
10. Expresión: gesto de invitación (mano extendida)

```javascript
const angles = [
  "profile left view, same character",
  "profile right view, same character",
  "three-quarter left view",
  "three-quarter right view",
  "close-up face and shoulders",
  "full body standing",
  "smiling expression, front view",
  "hand extended forward, inviting gesture",
  "dramatic lighting, mystical glow",
];

const sheetResults = await Promise.all(
  angles.map(angle =>
    fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: `[DESCRIPCIÓN_PERSONAJE], ${angle}. Misma persona del hero portrait.
          Fondo: oscuro con humo dorado suave. Colores: #1A0B2E y #FFC83D.
          Fotografía editorial realista. Consistencia total de rasgos.`,
        image_size: "portrait_4_3",
        num_images: 1,
      },
    })
  )
);

// Guardar todas las imágenes en references/characters/[nombre-personaje]/
```

Guardar el character sheet en `references/characters/[nombre]/` con nombres numerados:
`01-hero.jpg`, `02-perfil-izq.jpg`, ... `10-gesto-invitacion.jpg`

---

## FASE 2 — Generación de clips por beat

### Consumir el guión de song-script

Para cada beat del guión (del skill `song-script`), generar un clip de 5s con Kling O3:

```javascript
import { fal } from "@fal-ai/client";
import { readFileSync } from "fs";

// Cargar las imágenes de referencia del character sheet
const referenceImages = [
  "references/characters/luna/01-hero.jpg",
  "references/characters/luna/04-tres-cuartos-izq.jpg",
  "references/characters/luna/06-plano-entero.jpg",
];

async function generateBeatClip(beat) {
  const result = await fal.subscribe(
    "fal-ai/kling-video/o3/pro/text-to-video",
    {
      input: {
        prompt: beat.visual_prompt,
        duration: "5",          // siempre 5s por beat
        aspect_ratio: "9:16",   // vertical para reel
        element_reference_images: referenceImages,  // identity lock
        // NO usar generate_audio: true — el audio viene de Beatra
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log(`Beat ${beat.number}: ${update.logs?.slice(-1)[0]?.message}`);
        }
      },
    }
  );

  return {
    beat: beat.number,
    videoUrl: result.data.video?.url,
    requestId: result.requestId,
  };
}
```

### Prompt formula para cada beat (adaptar el visual del guión)

```
[EMOCIÓN DEL BEAT]. [PERSONAJE: nombre + acción] en [AMBIENTE].
[DETALLE CINEMATOGRÁFICO]. [MOVIMIENTO DE CÁMARA].
Estética: luz de vela dorada, humo suave, cristales brillantes, paleta #1A0B2E y #FFC83D.
Vertical 9:16. Cine latinoamericano contemporáneo. Ultra HD.
NO texto en pantalla. NO subtítulos. Movimiento continuo fluido.
```

**Ejemplo para Beat 1 — Hook:**
```
Personaje místico latino mira directo a cámara con intensidad serena.
Humo dorado envuelve sus hombros. Ojos brillantes con efecto de luz interior.
Cámara hace zoom suave hacia adelante. Fondo: terciopelo morado oscuro con velas.
Estética: misterioso, elegante, íntimo. 9:16 vertical. Ultra HD.
NO texto. Movimiento continuo fluido 5 segundos.
```

---

## FASE 3 — QA y gestión de costos

### Antes de generar — mostrar estimación

```
Estimación de costo para este reel:
  Character sheet (10 imgs Flux Dev): 10 × $0.025 = $0.25
  9 clips × 5s Kling O3: 9 × $0.14 = $1.26
  ────────────────────────────────────
  Estimado total: ~$1.51

⚠️ Estimación — el costo real puede variar ±20%.
¿Procedemos? (sí / no / generar solo [X] beats primero como prueba)
```

No generar hasta recibir confirmación explícita.

### QA por clip

Después de cada clip generado:
1. Revisar que el personaje sea visualmente consistente con el character sheet
2. Revisar que no haya artefactos visuales severos (manos deformadas, rostro distorsionado)
3. Si hay defecto grave: regenerar con prompt refinado (máx 2 reintentos por clip)
4. Registrar en `logs/fal-api.jsonl`:

```json
{
  "timestamp": "2026-10-25T...",
  "model": "kling-video/o3/pro",
  "beat": 1,
  "duration": "5s",
  "aspect_ratio": "9:16",
  "reference_images_count": 3,
  "request_id": "...",
  "video_url": "...",
  "status": "completed",
  "cost_usd_estimate": 0.14,
  "retry_count": 0
}
```

### Retry cap

Máximo 2 reintentos por clip (3 intentos totales).
Si el defecto persiste: informar al usuario, mostrar el mejor intento, preguntar cómo proceder.

---

## FASE 4 — Stitch y entrega a reels-editor

Una vez todos los clips generados y aprobados:

```bash
# Crear lista de clips en orden
ls -1 outputs/beats/*.mp4 | sort > /tmp/concat_list.txt
sed -i 's/^/file /' /tmp/concat_list.txt

# Concatenar clips (sin audio — el audio viene de Beatra)
ffmpeg -f concat -safe 0 -i /tmp/concat_list.txt -c copy outputs/reel_raw.mp4

# Entregar al skill reels-editor para:
# - Agregar captions (HyperFrames + faster-whisper)
# - Mixar con el audio de Beatra
# - Medir AV delay (debe quedar 0.0ms)
# - Exportar en ratio 4:5 o 9:16 final
```

**Handoff al reels-editor:**
```
El video raw está en: outputs/reel_raw.mp4
El audio de Beatra está en: outputs/[nombre]_audio.mp3

Próximo paso: invocar el skill reels-editor con:
- video_input: outputs/reel_raw.mp4
- audio_input: outputs/[nombre]_audio.mp3
- captions: sí (transcribir desde el audio)
- ratio: 4:5 (para Meta Ads) o 9:16 (para Stories/TikTok)
```

---

## Archivo .env.example

```bash
# fal.ai API key — obtener en https://fal.ai/dashboard/keys
FAL_KEY=

# Opcional: sobreescribir endpoints si fal.ai cambia versiones
FAL_KLING_O3_ENDPOINT=fal-ai/kling-video/o3/pro/text-to-video
FAL_KLING_V3_ENDPOINT=fal-ai/kling-video/v3/pro/text-to-video
FAL_SEEDANCE_ENDPOINT=fal-ai/bytedance/seedance/v2/pro/image-to-video
FAL_FLUX_ENDPOINT=fal-ai/flux/dev
```

---

## Seguridad (OBLIGATORIO)

Antes de cualquier commit:
1. `git status` — revisar que `.env` NO aparezca en los archivos a commitear
2. Si aparece: `git rm --cached .env` y verificar que `.gitignore` lo excluya
3. Nunca imprimir el valor de `FAL_KEY` en logs ni en chat
4. Si se expuso accidentalmente: rotar la key en https://fal.ai/dashboard/keys inmediatamente
