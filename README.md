# tarot-reels-skill

Skills de Claude Code para generar reels musicales AI para Instagram / Meta Ads / TikTok.  
Pipeline completo: guión narrativo → audio AI → clips con identity lock → post-producción.

## Skills disponibles

| Skill | Función |
|-------|---------|
| `song-script` | Guión de historia cantada (9 beats: Hook→Tensión→Resolución→CTA) |
| `video-gen` | Clips AI con identity lock via fal.ai (Kling O3 + Flux character sheet) |
| `reels-editor` | Captions + audio mix + AV sync (HyperFrames + faster-whisper + ffmpeg) |

## Pipeline completo — Reel Musical AI

```
song-script → Beatra (audio) → video-gen → reels-editor → reel final
```

### 1. Guión — song-script
```bash
npx skills add jadsajsdlkdqwioqodkwl/tarot-reels-skill --skill song-script
```
Produce: guión de 9 beats + brief de personaje + letra lista para Beatra.

### 2. Audio — Beatra
```bash
npx skills add beatra-ai/lyrics-to-song-skill
```
Convierte la letra en canción. Guarda en `outputs/audio/`.

### 3. Clips AI — video-gen
```bash
npx skills add jadsajsdlkdqwioqodkwl/tarot-reels-skill --skill video-gen
```
- Genera character sheet de 10 imágenes con Flux (una vez por personaje)
- Genera 9 clips de 5s con Kling O3 (identity lock via element referencing)
- Costo estimado: ~$1.30–1.60 por reel

### 4. Post-producción — reels-editor
```bash
npx skills add jadsajsdlkdqwioqodkwl/tarot-reels-skill --skill reels-editor
```
Mezcla audio + captions + AV sync. Exporta en 4:5 (Meta Ads) o 9:16 (Stories/TikTok).

## Setup inicial

```bash
# 1. Clonar
git clone https://github.com/jadsajsdlkdqwioqodkwl/tarot-reels-skill
cd tarot-reels-skill

# 2. Instalar dependencias
npm install @fal-ai/client sharp

# 3. Configurar API keys
cp .env.example .env
# Editar .env y agregar: FAL_KEY=tu_key_de_fal_ai

# 4. Instalar skill de audio
npx skills add beatra-ai/lyrics-to-song-skill
```

## Costo estimado por reel

| Componente | Costo |
|------------|-------|
| Character sheet (primera vez, 10 imgs Flux Dev) | ~$0.25 |
| 9 clips × 5s Kling O3 | ~$1.26 |
| Audio Beatra | Gratis (600 créditos iniciales) |
| **Total aprox.** | **~$1.30–1.60** |

El character sheet se genera **una sola vez** y se reutiliza en todos los reels.

## Requisitos

- Node.js 20+, FFmpeg en el PATH
- Python 3.10+ con faster-whisper (`pip install faster-whisper`)
- HyperFrames: `npm create hyperframes@latest`
- Cuenta en fal.ai: https://fal.ai (API key en `.env`)

## Seguridad

**Nunca commitees `.env`** — el `.gitignore` ya lo excluye.  
Antes de cada commit: `git status` para verificar que no haya archivos con keys.
