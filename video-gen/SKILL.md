---
name: video-gen
description: >-
  Genera clips de video AI para reels/anuncios usando fal.ai (Kling O3, Flux).
  Incluye flujo completo de identity lock: character sheet de 10 imágenes con Flux,
  luego generación de clips con Kling O3 usando element referencing. Usar después
  del skill song-script.
compatibility: claude-code
version: 2.0.0
---

# Video Gen — Generación de Clips AI con fal.ai

## Configuración

```bash
npm install @fal-ai/client sharp
cp .env.example .env   # agregar FAL_KEY al .env
```

- **Auth:** `FAL_KEY` en `.env` — nunca imprimir ni commitear
- **Verificar antes de cualquier commit:** `git status` — confirmar que `.env` no aparece
- **Si se expuso una key:** rotar en https://fal.ai/dashboard/keys inmediatamente

> ℹ️ **Sobre el negocio:** No hay información hardcodeada de ningún negocio.
> El usuario proveerá todos los datos al invocar el skill.

---

## Modelos y costos

| Modelo | Endpoint fal.ai | Costo aprox. | Cuándo usarlo |
|--------|----------------|--------------|---------------|
| **Kling O3 Pro** | `fal-ai/kling-video/o3/pro/text-to-video` | $0.10–0.17 / clip 5s | Personaje consistente (identity lock) |
| **Kling V3 Pro** | `fal-ai/kling-video/v3/pro/text-to-video` | $0.11–0.17 / clip 5s | Ambientes sin personaje, cinematográfico |
| **Flux Dev** | `fal-ai/flux/dev` | $0.025 / imagen | Character sheet alta calidad |
| **Flux Schnell** | `fal-ai/flux/schnell` | $0.003 / imagen | Pruebas rápidas de concepto |

### Estimación de costo por reel de 9 beats

```
Character sheet (primera vez, 10 imgs Flux Dev):  10 × $0.025  = $0.25
9 clips × 5s Kling O3:                            9  × ~$0.14  = $1.26
──────────────────────────────────────────────────────────────────────
Total estimado primer reel:                                      ~$1.51
Reels siguientes (misma personaje):                              ~$1.26
```

**Mostrar esta estimación y pedir confirmación ANTES de generar.** No generar hasta recibir "sí".

---

## SELECTOR DE PERSONAJE (ejecutar SIEMPRE al inicio)

Leer `brand.json → characters[]`. Si el array tiene entradas, mostrar:

```
🎭 ¿Qué personaje usamos en este reel?

[listar cada entrada del array]:
  a) Luna — mujer 28-35, mística (✅ sheet listo / ⚠️ sheet pendiente)
  b) Crear nuevo personaje para este reel
  c) Sin personaje — solo ambientes y texto en pantalla

Si hay variante B: ¿mismo personaje o diferente para B?
```

- **Personaje con `sheetReady: true`** → saltar Pasos 1a y 1b, ir directo a Paso 1c (QA) y luego Fase 2
- **Personaje con `sheetReady: false`** → ejecutar Pasos 1a + 1b, luego marcar `sheetReady: true` en `brand.json`
- **Nuevo personaje** → preguntar los 5 datos (nombre, género/edad, cabello, rasgos, vestimenta/mundo), ejecutar 1a + 1b, luego agregar al array de `brand.json` con `sheetReady: true`
- **Sin personaje** → ir directo a Fase 2 con prompts de ambiente/texto (sin `element_reference_images`)

---

## FASE 1 — Character Sheet (Identity Lock)

### Cuándo ejecutar esta fase
- **Primera vez** con este personaje (`sheetReady: false` o nuevo) → ejecutar completo (Pasos 1a + 1b)
- **Personaje ya existe** (`sheetReady: true`) → saltar al Paso 1c
- Verificar existencia física: `ls references/characters/`

### Paso 1a — Generar hero portrait

El hero portrait es el anchor visual. Todos los clips del reel lo referenciarán.

**Reglas del prompt de hero:**
- Fondo neutro (sólido oscuro o sólido claro — no fondos complejos en el hero)
- Full body o waist-up — nunca solo cara (el modelo necesita ver proporciones completas)
- Iluminación plana y pareja — no dramática en el hero (la dramatización va en los clips)
- Incluir: edad aparente, rasgos físicos, vestimenta, textura de piel visible

**Estructura del prompt:**

```
Full body front view, head to toe. A [EDAD]-year-old [GÉNERO] with [CABELLO],
[TEXTURA_PIEL], wearing [VESTIMENTA]. [FONDO_NEUTRO].
Photorealistic, visible skin texture, individual hair strands catching light.
[PROPORCIONES_CORPORALES]. Direct eye contact, relaxed stance.
Soft even studio lighting from both sides.
```

**Variables clave:**

| Variable | Cómo llenar | Qué evitar |
|----------|-------------|------------|
| `CABELLO` | color + textura + largo (ej: "long dark wavy hair with golden highlights") | "hermoso cabello" sin especificar |
| `TEXTURA_PIEL` | tono + 2 cues de realismo (ej: "olive skin, visible pores, slight warmth on cheeks") | "piel perfecta", "sin imperfecciones" |
| `VESTIMENTA` | material + color + fit (ej: "deep purple velvet robe with gold embroidery") | solo el nombre de la prenda sin descripción |
| `FONDO_NEUTRO` | "Clean dark background, deep [color] gradient" o "Clean white studio background" | fondos con objetos o texturas complejas |

**Código:**

```javascript
import { fal } from "@fal-ai/client";

const heroResult = await fal.subscribe("fal-ai/flux/dev", {
  input: {
    prompt: "[PROMPT_COMPLETO_AQUÍ]",
    image_size: "portrait_4_3",
    num_images: 1,
    enable_safety_checker: true,
    guidance_scale: 3.5,
    num_inference_steps: 28,
  },
  logs: true,
});

const heroImageUrl = heroResult.data.images[0].url;
// Guardar en: references/characters/[nombre]/01-hero-front.jpg
```

**QA obligatorio del hero:** Ver checklist de QA al final de esta sección.  
**Gate obligatoria:** Mostrar el hero y esperar aprobación explícita antes de los 9 ángulos.

---

### Paso 1b — Generar 9 ángulos adicionales

Con el hero aprobado, generar los 9 ángulos restantes usando el hero como `lora_path` o pasando la URL como referencia en el prompt.

**Los 10 ángulos del character sheet:**

| # | Archivo | Ángulo | Prefix del prompt | Notas de pose/iluminación |
|---|---------|--------|-------------------|---------------------------|
| 1 | `01-hero-front.jpg` | Full body frontal (hero) | `Full body front view, head to toe.` | Ya generado — es el anchor |
| 2 | `02-3q-left.jpg` | 3/4 izquierda | `Three-quarter view from the left.` | 45° hacia cámara-izquierda, mirando al lente |
| 3 | `03-3q-right.jpg` | 3/4 derecha | `Three-quarter view from the right.` | 45° hacia cámara-derecha, mirando al lente |
| 4 | `04-profile-left.jpg` | Perfil izquierdo | `Left profile view.` | Perfil completo, luz de rim desde atrás |
| 5 | `05-profile-right.jpg` | Perfil derecho | `Right profile view.` | Perfil completo, luz de rim desde atrás |
| 6 | `06-face-closeup.jpg` | Primer plano cara | `Face close-up, tight crop.` | Frente a barbilla, beauty lighting, catchlights en ojos |
| 7 | `07-back-shoulder.jpg` | Espalda / sobre hombro | `Back view, looking over shoulder.` | Mira hacia atrás sobre hombro derecho |
| 8 | `08-medium-portrait.jpg` | Retrato medio | `Front-facing medium portrait, waist up.` | De cintura, contacto visual directo |
| 9 | `09-full-body-3q.jpg` | Cuerpo entero 3/4 | `Full body three-quarter view.` | Largo completo, 45° cámara-izquierda |
| 10 | `10-above-angle.jpg` | Ángulo superior | `Slightly above angle, looking up at camera.` | Cámara levemente arriba, mentón hacia arriba |

**Prompt por ángulo — estructura:**

```
[PREFIX_ÁNGULO] The exact same person from the reference — same [DESCRIPCIÓN_CABELLO],
same [RASGOS_ESPECÍFICOS], same [COLOR_OJOS] eyes, same [VESTIMENTA].
[FONDO según ángulo]. Photorealistic, same skin texture and tone.
```

**Código:**

```javascript
const angles = [
  { file: "02-3q-left.jpg",      prefix: "Three-quarter view from the left." },
  { file: "03-3q-right.jpg",     prefix: "Three-quarter view from the right." },
  { file: "04-profile-left.jpg", prefix: "Left profile view." },
  { file: "05-profile-right.jpg",prefix: "Right profile view." },
  { file: "06-face-closeup.jpg", prefix: "Face close-up, tight crop." },
  { file: "07-back-shoulder.jpg",prefix: "Back view, looking over her shoulder." },
  { file: "08-medium-portrait.jpg",prefix: "Front-facing medium portrait, waist up." },
  { file: "09-full-body-3q.jpg", prefix: "Full body three-quarter view." },
  { file: "10-above-angle.jpg",  prefix: "Slightly above angle, looking up at camera." },
];

// Generar en secuencia (no paralelo) para evitar rate limits
for (const angle of angles) {
  const result = await fal.subscribe("fal-ai/flux/dev", {
    input: {
      prompt: `${angle.prefix} The exact same person from the reference — [MISMA_DESCRIPCIÓN_COMPLETA]. [FONDO_NEUTRO]. Photorealistic.`,
      image_size: "portrait_4_3",
      num_images: 1,
    },
  });
  // Guardar en references/characters/[nombre]/[angle.file]
}
```

**Naming convention para la carpeta:**

```
references/characters/[nombre]-[cabello]-[rasgo-principal]-[tono-piel]/
```

Ejemplos:
- `luna-cabello-oscuro-dorado-mistica-oliva/`
- `sofia-rubia-ondulada-freckles-clara/`
- `kai-oscuro-corto-mandibula-fuerte-moreno/`

### Paso 1c — QA del character sheet

Para cada imagen, verificar:

- [ ] Mismo color y textura de cabello que el hero
- [ ] Misma forma de cara y rasgos que el hero
- [ ] Mismo tono de piel que el hero
- [ ] Misma vestimenta que el hero
- [ ] Sin extremidades extra o faltantes
- [ ] Sin rostros duplicados o fusionados
- [ ] Texto ilegible o ausente (no debe haber texto en las imágenes)
- [ ] Si hay defecto grave: regenerar con prompt refinado, máx **2 reintentos**

**Retry cap:** 2 reintentos por imagen (3 intentos totales).
Si el defecto persiste tras 2 reintentos: informar al usuario, mostrar el mejor intento, preguntar cómo proceder.

---

## FASE 2 — Generación de clips por beat

### Consumir el guión del skill song-script

El skill `song-script` entrega un `BRIEF DE PERSONAJE` y 9 beats con `Visual:` por beat.
Usar esos datos para construir el prompt de cada clip.

### Fórmula de prompt para clips con personaje (Kling O3)

```
[EMOCIÓN_DEL_BEAT en presente] — [PERSONAJE: nombre + acción específica] en [AMBIENTE].
[DETALLE DE LUZ]. [MOVIMIENTO DE CÁMARA].
[NOTA DE ESTÉTICA]. Vertical 9:16. [CALIDAD].
NO texto en pantalla. NO subtítulos. Movimiento continuo fluido 5 segundos.
```

**Capas del prompt de video:**

| Capa | Qué especificar | Ejemplo |
|------|-----------------|---------|
| **Acción** | verbo + dirección + velocidad | "extiende la mano izquierda lentamente hacia cámara" |
| **Expresión facial** | emoción + dirección de mirada | "mirada directa a cámara, expresión serena y segura" |
| **Ambiente** | 3 objetos concretos del espacio | "velas encendidas, cristales sobre terciopelo, humo suave" |
| **Luz** | fuente + temperatura + calidad | "luz de vela dorada lateral, sombras suaves en rostro" |
| **Cámara** | movimiento + velocidad | "zoom suave entrante, 5 segundos" |
| **Restricciones** | qué NO debe aparecer | "NO texto, NO subtítulos, NO cortes" |

**Palabras de movimiento de cámara (usar estas):**
- `slow zoom in toward subject` (acerca el personaje)
- `slow zoom out revealing environment` (aleja para mostrar ambiente)
- `gentle pan left/right` (barrido lateral suave)
- `static shot, subtle camera shake` (estático con microvibración natural)
- `slow tilt up from hands to face` (paneo vertical)

**Palabras a EVITAR en prompts de video:**
- ❌ "cinematic" (genérico, el modelo lo ignora)
- ❌ "stunning", "beautiful", "amazing" (adjetivos vacíos)
- ❌ "8K", "ultra HD", "high resolution" (no afectan la calidad en modelos de video)
- ❌ "professional lighting" (especificar el tipo exacto en cambio)
- ❌ "perfect" en cualquier forma

### Código para generación de clips

```javascript
import { fal } from "@fal-ai/client";
import fs from "fs";

// Cargar referencias del character sheet aprobado
const characterRefs = [
  "references/characters/[carpeta]/01-hero-front.jpg",
  "references/characters/[carpeta]/06-face-closeup.jpg",
  "references/characters/[carpeta]/08-medium-portrait.jpg",
];

// Convertir imágenes a URLs de datos base64 para element referencing
async function imageToBase64(path) {
  const data = fs.readFileSync(path);
  const ext = path.split('.').pop();
  return `data:image/${ext};base64,${data.toString('base64')}`;
}

async function generateBeatClip(beat, prompt) {
  const result = await fal.subscribe(
    "fal-ai/kling-video/o3/pro/text-to-video",
    {
      input: {
        prompt: prompt,
        duration: "5",
        aspect_ratio: "9:16",
        // Identity lock: pasar el hero como referencia de elemento
        // Nota: verificar documentación actual de fal.ai para el parámetro exacto
        // puede ser element_reference_images, reference_images, o image_url
        negative_prompt: "text, subtitles, watermark, blurry, distorted face, extra limbs, duplicate person",
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          const lastLog = update.logs?.slice(-1)[0]?.message;
          if (lastLog) console.log(`Beat ${beat}: ${lastLog}`);
        }
      },
    }
  );

  return {
    beat: beat,
    videoUrl: result.data.video?.url,
    requestId: result.requestId,
  };
}

// Generar los 9 clips
const clips = [];
for (let i = 1; i <= 9; i++) {
  const clip = await generateBeatClip(i, beatPrompts[i]);
  clips.push(clip);
  
  // Log inmediato
  logToFile({
    timestamp: new Date().toISOString(),
    model: "kling-video/o3/pro",
    beat: i,
    duration: "5s",
    aspect_ratio: "9:16",
    reference_images_count: characterRefs.length,
    request_id: clip.requestId,
    video_url: clip.videoUrl,
    status: clip.videoUrl ? "completed" : "failed",
    cost_usd_estimate: 0.14,
    retry_count: 0,
  });
}
```

### Nota sobre identity lock en fal.ai

Kling O3 en fal.ai soporta "element referencing" para consistencia de personaje.
**Antes de implementar, verificar el parámetro exacto actual:**

```bash
# Consultar la documentación actualizada del endpoint
curl https://fal.run/fal-ai/kling-video/o3/pro/text-to-video --help
# O revisar: https://fal.ai/models/fal-ai/kling-video
```

Los parámetros pueden ser `element_reference_images`, `reference_images`, o similar.
Si el parámetro cambió, usar el que esté documentado en fal.ai al momento de implementar.

---

## FASE 3 — QA de clips

Para cada clip generado, verificar:

- [ ] El personaje se ve consistente con el character sheet (misma cara, cabello, vestimenta)
- [ ] No hay artefactos visuales severos (manos deformadas, rostro duplicado, extremidades extras)
- [ ] El movimiento de cámara es suave y continuo (no hay cortes dentro del clip)
- [ ] No hay texto ni subtítulos en el video
- [ ] El ambiente corresponde al beat del guión

**Si hay defecto:** regenerar con prompt refinado, máx 2 reintentos.  
**Retry cap:** 2 reintentos por clip. Si persiste: informar al usuario, mostrar el mejor intento.

**Log de cada clip** en `logs/fal-api.jsonl`:

```json
{
  "timestamp": "ISO 8601",
  "model": "kling-video/o3/pro",
  "beat": 1,
  "duration": "5s",
  "aspect_ratio": "9:16",
  "reference_images_count": 3,
  "request_id": "...",
  "video_url": "...",
  "status": "completed | failed",
  "cost_usd_estimate": 0.14,
  "retry_count": 0
}
```

---

## FASE 4 — Stitch y handoff a reels-editor

```bash
# Descargar clips y crear lista en orden
# (asumir que clips se descargaron a outputs/beats/)
ls -1 outputs/beats/*.mp4 | sort -t_ -k2 -n > /tmp/clips_ordered.txt
sed -i 's/^/file /' /tmp/clips_ordered.txt

# Concatenar (sin re-encodear si los codecs son iguales)
ffmpeg -f concat -safe 0 -i /tmp/clips_ordered.txt -c copy outputs/reel_raw.mp4

# Si hay error de codec: re-encodear
ffmpeg -f concat -safe 0 -i /tmp/clips_ordered.txt \
  -vf "scale=1080:1920" -c:v libx264 -preset fast -crf 18 \
  outputs/reel_raw.mp4
```

**Handoff al skill `reels-editor`:**

```
Video raw listo en: outputs/reel_raw.mp4
Audio de Beatra en: outputs/audio/[archivo].mp3

Invocar skill reels-editor con:
- video_input: outputs/reel_raw.mp4
- audio_input: outputs/audio/[archivo].mp3
- captions: sí
- ratio: 4:5 (Meta Ads) o 9:16 (Stories/TikTok)
- target_av_delay: 0.0ms (obligatorio)
```

---

## Gate de estimación de costo (OBLIGATORIA)

Antes de generar cualquier cosa, mostrar siempre:

```
💰 Estimación de costo antes de proceder

  Character sheet (10 imgs × $0.025 Flux Dev):    $0.25
  [o] Character sheet ya existe — $0.00

  Clips (N beats × 5s × $0.14 Kling O3):          $X.XX
  ─────────────────────────────────────────────────
  Total estimado:                                  ~$X.XX

  ⚠️ Estimación — verificar costo real en https://fal.ai/dashboard/billing
  
  ¿Procedemos?
  a) Sí, generar todo
  b) Generar solo el character sheet primero
  c) Generar solo beats [números] como prueba
  d) Cancelar
```

No generar hasta recibir respuesta explícita.

---

## Checklist de seguridad (antes de cada commit)

- [ ] `git status` — `.env` NO aparece en los archivos staged
- [ ] `FAL_KEY` no está hardcodeada en ningún archivo `.js`, `.mjs`, `.json`
- [ ] `logs/fal-api.jsonl` no contiene API keys ni rutas personales
- [ ] `references/characters/` está en `.gitignore`
- [ ] `outputs/` está en `.gitignore`
