---
name: reels-editor
description: Pipeline completo de edición de reels para Instagram/TikTok con HyperFrames. Usar SIEMPRE que haya que editar video hablado (reels, clips crudos de celular) o un montaje con voz en off y b-roll, con corte de silencios, captions sincronizados palabra por palabra, hook de texto, capa de motion (punch-ins, b-roll, transiciones, lower-third, CTA, números) y capa de audio (SFX, música con ducking). La tipografía, los colores, el idioma y el nivel de motion salen de la configuración de marca del proyecto (brand.json): si no existe, la skill la crea preguntando. Cubre criterios de edición, tamaños, safe zones de Instagram, hooks con sombra blur, calidad de export a los fps de la fuente, mux del audio y la verificación obligatoria frame a frame. Incluye scripts listos (setup de marca, cortes+master, captions) y template de composición. También aplica cuando se quiere transformar/reversionar un video propio para republicarlo.
compatibility: claude-code
version: 1.0.0
---

# Editor de reels — pipeline de edición

Sos el editor de video de esta marca. Este pipeline está probado de punta a punta en
reels reales publicados (clips de iPhone → reel de 60-170s, sincro verificada frame a
frame). **Lo que el usuario pide en el prompt manda** (ver §Precedencia): los criterios de
estilo de abajo son defaults, no leyes; solo los invariantes de calidad se mantienen siempre.

Hay tres capas y conviene no mezclarlas:

| Capa | Qué es | Dónde vive |
|---|---|---|
| **Marca** | tipografía, colores, idioma/variante, léxico, CTA, nivel de motion, paleta de SFX, música | `brand.json` del proyecto (lo genera `scripts/setup-brand.mjs`) |
| **Oficio** | corte de silencios, sincro de captions, safe zones, calidad de export, mux, verificación | esta skill (defaults + invariantes de calidad, ver §Precedencia) |
| **Motion + audio** | qué elementos generados van sobre el video (punch-in, b-roll, transiciones, lower-third, CTA, números, look) y qué suena (SFX, música con ducking) | `reference/motion-layer.md` y `reference/audio-sfx.md`; el NIVEL lo fija `brand.json → motion` (`minimal` / `medium` / `hype`) |

Dos flujos según el material:
- **Selfie hablado a cámara** → `reference/pipeline-detallado.md` (cortes de silencio + captions).
- **Voz en off + montaje de b-roll/producto** → `reference/pipeline-montaje.md`.

> **Trabajás dentro de un proyecto HyperFrames** (HTML + GSAP → MP4 vía `npm run check` /
> `npx hyperframes render`). `$PROJ` = la raíz del proyecto HyperFrames (p. ej.
> `~/reels/hyper-edits`); todos los comandos usan `$PROJ`, nunca una ruta fija. Las reglas del framework están en su
> `CLAUDE.md` y en las skills `hyperframes-*` instaladas en `~/.claude/skills/`
> (`/hyperframes-core`, `/hyperframes-registry`, `/hyperframes-keyframes`, `/hyperframes-audio`,
> `/hyperframes-cli`, `/embedded-captions`, `/talking-head-recut`): invocarlas antes de
> escribir HTML nuevo o cablear un bloque del registry.

## Precedencia: el prompt manda

**1. Lo que el usuario pide en el prompt gana siempre sobre cualquier default de esta skill.**
"Sin subtítulos" → no se generan captions (ni su pipeline). "Sin hook" → sin hook. "9:16", "30 fps",
"tomas de 5 s", "solo 6 beats", "sin música" → se hace tal cual. No se discute ni se "corrige" hacia el default;
si algo es ambiguo, se pregunta una vez, y si es explícito se ejecuta.

**2. Invariantes de calidad (se aplican siempre, salvo que el usuario pida quitarlos):**
- **Quitar muletillas y titubeos** (eh, em, mmm, "este", "o sea" de relleno, palabras repetidas por trabarse),
  además de las pausas muertas. Hoy es manual: palabras con timing de `transcribe.py` → rangos a cortar → `cut-and-master`
  (no hay script dedicado todavía).
- **Homogeneizar el audio**: voz nivelada de punta a punta (`level-voice.mjs`), `loudnorm` social en el master.
- **Mux del audio del master** sobre el render + verificar sincro (`measure-av-delay.mjs`).
- **Mirar frames reales** del MP4 final antes de entregar.
- **Licencias**: nada bajado con `fetch-asset` se usa sin su línea en `assets/LICENSES.tsv`.

**3. Todo lo demás es DEFAULT ajustable:** ratio (el de `brand.json`, hoy **4:5**; no se cambia por cuenta propia),
si hay captions y de qué estilo, hook, fps, duración y cantidad de tomas, umbrales de corte de silencio, nivel de motion,
tamaños, paleta de SFX. Donde más abajo diga CERRADO / PROHIBIDO / REGLA PERMANENTE / NUNCA / JAMÁS, leerlo como
"default de oficio: se aplica si el prompt no dice otra cosa" (excepto los invariantes del punto 2 y las safe zones de la plataforma).

## Archivos de esta skill

| Archivo | Qué es |
|---|---|
| `reference/brand-setup.md` | **Las preguntas de marca y cómo se aplican.** Leer antes del primer reel de una marca nueva. |
| `reference/pipeline-detallado.md` | **LEER ENTERO antes de empezar.** Cada comando copy-paste, pasos 0→J y las 20 trampas conocidas. |
| `reference/composition-template.html` | El index.html de la composición. Se copian y reemplazan SOLO los `{{PLACEHOLDERS}}`; los colores y la fuente entran por `brand.css`. |
| `reference/composition-template-minimal.html` | **Template DEFAULT desde 2026-10-20** (4:5): subtítulos minimal por frases + headline editorial tipeado. Placeholders documentados en su cabecera. El template viejo (`composition-template.html`, una palabra + chips) queda para `captions.style: word` / `hook.style: chips`. |
| `reference/motion-layer.md` | **Capa de motion.** Menú por nivel (`minimal`/`medium`/`hype`), snippets de punch-in, b-roll, transiciones, lower-third, CTA, números, look y cómo cablear bloques del registry. |
| `reference/audio-sfx.md` | **Capa de audio.** Biblioteca `assets/sfx` + `assets/music`, dónde va cada SFX, música con ducking por sidechain y la receta ffmpeg del `master-mix.m4a` que se muxea. |
| `reference/pipeline-montaje.md` | **Flujo voz en off + montaje de b-roll.** Inventario de fuentes por letra, plan de montaje, build-master, xfade, verificación de tomas, versionado. |
| `scripts/setup-brand.mjs` | Genera `brand.json` + `brand.css` a partir de las respuestas de marca (calcula contraste del chip, avisa si el acento no lee sobre video). Flags nuevos: `--motion`, `--ratio`. |
| `scripts/cut-and-master.mjs` | Corta silencios por clip + arma el master (offsets exactos en segments.json). Config: `clips.json`. |
| `scripts/build-chunk-captions.mjs` | Subtítulos **minimal**: agrupa `words.json` (transcribe.py) en frases de 2-4 palabras cortadas en la puntuación, sin conectores colgando → `captions.js` con `window.__CHUNKS`. Uso: `node build-chunk-captions.mjs words.json reel-x/captions.js --max 4 --dur <s> [--fix "viejo=nuevo"]`. Leer la lista impresa buscando typos. |
| `scripts/build-captions.mjs` | Construye `captions.json` + `captions.js` desde `segments.json` + `transcripts-cut/` aplicando `fix` (typos/dialecto/léxico) y `emph`. Config: `captions-config.json`. |
| `scripts/check-cut-edges.mjs` | Verifica por ENERGÍA que ningún borde de corte parta una palabra. Correr siempre después de cut-and-master. |
| `scripts/retranscribe-blocks.mjs` | Re-transcribe cada cut en sub-bloques de ~8s (cortados en silencios) → onsets precisos, sin errores puntuales de hasta 1s. |
| `scripts/consensus-timing.mjs` | Promedia dos pasadas de sub-bloques con bordes corridos (cancela el ruido de onset de Whisper). |
| `scripts/level-voice.mjs` | Nivela voces bajas o que se apagan (highpass + denoise + dynaudnorm + loudnorm 2 pasadas + limiter). Uso: `node level-voice.mjs in out.wav -14`. |
| `scripts/measure-av-delay.mjs` | Correlación cruzada master↔render: detecta el atraso de audio que mete el renderer. Debe dar 0.0ms DESPUÉS del mux. |
| `scripts/merge-text-timing.mjs` | Alinea por LCS el texto del cut entero con el timing de los sub-bloques y deja lo mejor de cada uno. Correr DESPUÉS de los anteriores. |
| `scripts/transcribe.py` | Transcripción local con faster-whisper → JSON de palabras con timing. Usar cuando no hay `whisper-cpp` (en esta máquina no está): `python transcribe.py <audio> <out.json> [modelo] [idioma]`. |
| `scripts/fetch-asset.mjs` | Busca y descarga B-roll, fotos y música libres (Pixabay, Pexels opcional, Internet Archive CC0, Openverse cc0/pdm) y registra la licencia en `assets/LICENSES.tsv`. Ver §Assets externos. |
| `assets/brand.example.json` | Ejemplo comentado de configuración de marca. |

## Assets externos: fetch-asset

Cuando falte B-roll, foto o música que no esté en `assets/`, buscalo con `node ~/.claude/skills/reels-editor/scripts/fetch-asset.mjs search <pixabay|pexels|archive|openverse> <video|photo|audio> "<query>" --proj "$PROJ"`: la query va SIEMPRE en inglés (en español devuelve 0 resultados).
Elegí uno de los 5 candidatos y bajalo con `get <fuente> <id>`: queda en `assets/fetched/`, baja la mejor resolución disponible (con tope de 40 MB; `--max-mb N`) y hay que informar al usuario cuál bajó.
Cada descarga añade una línea a `assets/LICENSES.tsv`: **ningún asset bajado con `fetch-asset` se usa si no tiene su línea ahí**. Solo pasan CC0, public domain, Pixabay Content License y Pexels License; el script rechaza NC, SA, CC-BY y unknown, y eso no se evita.
Pexels es opcional (emisión de claves pausada): sin `PEXELS_API_KEY` se salta solo; `PIXABAY_API_KEY` es la que cuenta. Las búsquedas de Pixabay se cachean 24 h (lo exige su API). Si una fuente falla o da 0 resultados, se lo decís al usuario; no cambies de fuente en silencio.
**Ideas abstractas** ("decisión difícil", "universo", "duda"): no buscar el concepto; buscar una **metáfora visual literal** en inglés ("crossroads path", "night sky stars", "person standing at fork in road"). Si no hay un resultado bueno, usar una **tarjeta de texto o motion graphic** en vez de un stock flojo (en la prueba de voz, "decisión difícil" salió como una ilustración animada de otro estilo).
`assets/LICENSES.tsv` es solo para lo bajado con `fetch-asset`; la biblioteca local (`assets/music`, `assets/sfx`) ya queda cubierta por sus `manifest.tsv` y no necesita línea ahí.
SFX: no hay búsqueda; usar la biblioteca Mixkit de `assets/sfx` (95). Pixabay audio no está soportado (su API oficial solo cubre imágenes y video).
Los videos de Pixabay/Pexels **no traen audio**: van como cutaway `<video muted>` (`motion-layer.md §B-roll`), NO por `cut-and-master.mjs` (que exige pista de audio y falla sin ella). Probado: clip 1080p/50 fps → render 1080×1920 a 50 fps sin problemas.

## Setup en una máquina nueva (una sola vez)

1. **ffmpeg + ffprobe en el PATH** y **Node 22+** (macOS: `brew install ffmpeg node`;
   Windows: build de gyan.dev + instalador de Node; los scripts corren igual desde Git Bash).
2. **Claude Code** logueado, con las skills de HyperFrames instaladas en `~/.claude/skills/`
   (`npx hyperframes skills`, o clonar `heygen-com/hyperframes` y copiar `skills/*`).
3. **Un proyecto HyperFrames** donde trabajar (`$PROJ`). Si hubiera que
   crearlo de cero: `package.json` con los scripts `check`/`render` apuntando a
   `npx --yes hyperframes@0.8.145` (o la versión que diga `npm view hyperframes version`;
   subir el pin con `npx hyperframes@latest upgrade --project`), `meta.json`
   (`{"id":"hyper-edits","name":"hyper-edits"}`) y `hyperframes.json`.
4. **Configurar la marca** (Paso 0, abajo).
5. **Biblioteca de assets** en `assets/` (SFX, música, bloques del registry) con su
   `ASSETS.md`: ver `reference/audio-sfx.md §Cómo ampliar`.
6. Primera corrida: `scripts/transcribe.py` (requiere `pip install faster-whisper`) baja el modelo de Whisper y el primer
   `render` baja el Chrome del renderer (unos minutos, solo la primera vez).

## PASO 0 — Configuración de marca (solo la primera vez del proyecto)

**Antes de tocar un solo clip, verificá si existe `brand.json` en la raíz del proyecto.**

- **Existe** → leelo y usá esos valores. No vuelvas a preguntar nada de marca.
- **No existe** → hacé la entrevista corta de `reference/brand-setup.md` (5 preguntas;
  la única sin default es el color de marca) y corré `scripts/setup-brand.mjs` con las
  respuestas. Recién ahí arranca el reel.

```bash
node ~/.claude/skills/reels-editor/scripts/setup-brand.mjs \
  --proj "$PROJ" --name "Mi Marca" --accent "#FF3B30" --dark "#101010" \
  --font "Anton" --language es --dialect neutro
```

El script escribe `brand.json` (config legible) y `brand.css` (las variables que consume
la composición), elige por contraste el color de texto del chip de acento y **avisa si el
color de acento no va a leerse sobre video oscuro**. Esos avisos se le cuentan al usuario:
no se ignoran ni se resuelven por cuenta propia.

Para ver el catálogo de tipografías: `node setup-brand.mjs --print-fonts`. Si la marca
tiene su propia tipografía, se pasa el archivo: `--font-file /ruta/a/Fuente-Black.otf`.

## Flujo (resumen — el detalle está en pipeline-detallado.md)

1. **Analizar fuentes**: specs + rotación (el celular reporta 1920×1080 con rotation=-90 = vertical real;
   **sin rotation = horizontal REAL → modo letterbox**, ver criterio "Fuente horizontal"),
   color (bt709 SDR esperado; **HDR → frenar y avisar**), fps (usar el de la fuente, típico 60),
   frames de muestra (clasificar selfie/b-roll + posición de cabeza), volumedetect.
2. **Transcribir cada clip** (`python scripts/transcribe.py <clip> <out.json> small <brand.language>`,
   JAMÁS `.en` si el audio no está en inglés) → entender la historia, definir orden (casi siempre
   el numérico) y redactar el hook.
3. **Medir silencios** con `silencedetect` calibrado (típico `-25dB:d=0.3`; a -37dB el ruido
   urbano tapa todo). NUNCA cortar por gaps de Whisper (estira palabras sobre pausas).
4. **Cortar + master**: armar `clips.json` y correr `cut-and-master.mjs`.
5. **Re-transcribir los CUTS** (no el master: desfasa) con **`--model medium`** para el
   timing (el `small` driftea hasta ~1.7s en tomas largas, ver Captions) → control word-count.
6. **Captions**: armar `captions-config.json` (fixes de dialecto/léxico de marca + énfasis) y
   correr `build-captions.mjs`. Leer el texto final completo buscando typos restantes.
7. **Componer**: copiar el template (`composition-template-minimal.html` por default; el viejo solo si `captions.style` es `word`/`chunk`) a `index.html`, rellenar `{{PLACEHOLDERS}}`, sumar la
   capa de motion del nivel de la marca (`motion-layer.md`) y mezclar la capa de audio
   (`audio-sfx.md` → `master-mix.m4a`), `npm run check` (0 errors; el warning AudioContext
   es benigno). Si `brand.json → ratio` es `4:5`: lienzo 1080×1350, `--hook-top: 110px`,
   `--caption-bottom: 250px`.
8. **Validar barato**: draft corto del hook + draft completo para el fit de palabras largas.
   NUNCA descubrir errores visuales en el render final.
9. **Render final + mux del audio + verificación obligatoria** (abajo) + entrega.

## Criterios y defaults (el prompt manda; ver §Precedencia)

### Edición (corte de silencios)

- Política **selfie**: cortar toda pausa ≥ 0.55s, colapsándola a ~0.30s (padding 0.12s
  antes de la voz / 0.18s después). Las respiraciones cortas QUEDAN: el reel es dinámico,
  no robótico.
- Política **b-roll**: cortar solo pausas ≥ 0.90s (padding 0.12/0.30) para no romper
  demos a mitad de acción. Los b-roll con voz en off se cortan igual, con esta política.
- Cabezas y colas de cada clip se recortan SIEMPRE (ahí vive el manoteo al teléfono).
- Audio del master: `loudnorm=I=-14:TP=-1:LRA=11` (loudness social).

### Fuente horizontal (video apaisado) — default

- **Detección**: horizontal REAL = 1920×1080 (16:9) **sin** `rotation` en metadata.
  (Los verticales de celular también reportan 1920×1080 pero CON `rotation=-90`.)
- **El video queda horizontal. PROHIBIDO cropear a 9:16** (ni franja central ni ningún
  recorte) y prohibido estirar. Va **letterbox centrado** en el lienzo 1080×1920: las
  franjas negras arriba y abajo QUEDAN, no pasa nada. Recortar al centro descuadra la
  cabeza y arruina toda demo de pantalla: es peor que las franjas.
- Cómo: `"fit": "letterbox"` por clip en `clips.json` → cut-and-master.mjs hace
  `scale=1080:-2` + `pad=1080:1920` centrado (el video ocupa y≈656–1264).
- **Captions en la franja negra inferior**: la capa estándar (`bottom:470px`) ya cae
  ahí — NO se mueve, mismo estilo one-word de siempre.
- Hook y CTA: sin cambio (`top:300` cae dentro de la franja negra superior).
- **Scrim: se BORRA** el `<div id="scrim">` de la composición en modo letterbox (los
  captions van sobre negro puro; el gradiente solo ensucia el borde inferior del video).
- Se pueden mezclar clips verticales (full-bleed) y horizontales (letterbox) en el mismo
  reel: todos los cuts salen 1080×1920 y concatenan igual.

### Estilos de subtítulo y de headline (`brand.json → captions.style` / `hook.style`)

El DEFAULT cambió el 2026-10-20 porque el estilo anterior (palabras gruesas con contorno de 3 px + chips
de color) se veía recargado y "genérico de IA". Hoy:

- **`captions.style: "minimal"` (default)**: letra fina (Montserrat 600, ~42 px, auto-fit a ≤860 px), blanca,
  contorno simple de 1.6 px + sombra suave, **frases de 2-4 palabras** con corte seco (sin animación, sin
  chip). **Posición: ~30% desde abajo (`--cap-bottom: 385px` en 4:5), un poco bajo el centro** (pedido del usuario).
  **Contorno sincronizado:** la palabra que se está diciendo se perfila en dorado (`--cap-hi`), el resto queda con contorno oscuro;
  `build-chunk-captions.mjs` emite `w:[[palabra,inicio,fin]]` para eso. Pipeline: `build-chunk-captions.mjs` + `composition-template-minimal.html`.
- `word`: una palabra por vez, Anton gruesa (la sección de abajo). `chunk`: frases sobre recuadro de acento.
  Solo si el usuario los pide.
- **`hook.style: "editorial" (default)`**: headline serif (Playfair Display) de 2 líneas centrado arriba, línea 1
  blanca y línea 2 itálica dorada, filete fino encima, **tipeado letra a letra** con el SFX de teclas, velo
  superior suave solo mientras está en pantalla. Sin chips ni cajas. `chips` = el hook viejo de abajo.
- Un cambio de estilo se pide con `setup-brand.mjs --force --caption-style … --hook-style …`.

**El texto del headline NO lo inventa el editor: se le pregunta al usuario en CADA reel** (ver §Qué preguntar).

### Captions estilo `word` (legacy; "sin subtítulos" en el prompt → no hay captions)

- **La tipografía de la marca** (`brand.json` → `font`), la misma en captions y hook.
  Tiene que ser una **display pesada**: las de texto (regular/medium) desaparecen sobre video.
- **Una sola palabra por vez, corte seco** (set on/off). SIN karaoke, SIN pop, SIN
  animación de entrada/salida. Nunca dos palabras visibles a la vez. (Excepción única:
  `brand.json → motion: "hype"` habilita un componente de captions animados del registry,
  ver `motion-layer.md §Captions animados`; un solo estilo por reel.)
- **Tamaño CHICO estilo caption nativo de IG**: base 54px, mínimo 40, ancho máximo 790px.
  La palabra ocupa ~30% del ancho. Un caption a 90px se lee como cartel de aviso, no como
  reel: es el error más común y el más caro de corregir después.
- El tamaño se estima con el `charWidth` de la tipografía y **se refina midiendo en el
  navegador** (`refitCaptions` del template), así funciona igual con una condensada tipo
  Anton que con una ancha tipo Archivo Black. Si una palabra no entra ni en el mínimo, el
  template avisa por consola: leer esos warnings.
- Blanco, `-webkit-text-stroke: 3px #000` + `paint-order: stroke fill` + sombra suave.
- **Énfasis**: palabras clave en el color de acento de la marca, estático con glow sutil
  (números, producto/modelo, verbo de impacto, CTA; ~1 de cada 8-12 palabras). Si el acento
  no contrasta contra video oscuro, `setup-brand.mjs` lo avisa: en ese caso el énfasis va en
  blanco (`--emphasis white`) y el acento queda solo para el chip del hook.
- Posición: centrados, capa en `bottom: 470px` (banda segura sobre el torso).
- Timing: aparece 30ms antes de decirse; sostiene hasta la palabra siguiente si el gap
  es < 0.45s; en pausas largas sale a +0.25s. El hide JAMÁS pisa el show siguiente.
- **Modelo de transcripción para el TIMING = `medium`, NO `small`** (regla verificada en un
  testimonio de 130s): el `small` es rápido y alcanza para ENTENDER el contenido (Paso B),
  pero ubica mal los onsets de palabra y el error se ACUMULA en tomas de más de ~1 min
  (drift medido de hasta **1.7s** → captions desincronizados "en algunas partes"). Para el
  pase de timing (Paso E) usar `scripts/transcribe.py ... medium`: onsets bastante
  más precisos y, de yapa, transcribe mejor el texto (acentos, números, léxico). Si un reel
  ya salió y los captions patinan, re-transcribir el cut con `medium` y reconstruir con
  `build-captions.mjs` (mismo config).
- **Sincro fina = TEXTO del cut entero + TIMING por sub-bloques.** El `medium` sobre el cut
  entero deja **errores puntuales de onset de hasta 1s** en palabras sueltas (medido: peor
  caso −0.99s; el drift MEDIO es ~0, o sea no es deriva acumulada sino palabras que entran
  antes/después de tiempo, casi siempre alrededor de pausas). Transcribir el cut en
  **sub-bloques de ~8s cortados en el medio de un silencio** arregla los onsets, pero
  **ensucia el texto** en los bordes (duplica palabras, rompe términos propios). La solución
  es correr las dos y fusionarlas: `retranscribe-blocks.mjs` (timing) + `merge-text-timing.mjs`
  (alinea por LCS y se queda con el texto del entero y el timing del bloque; interpola solo
  las palabras sin match, típicamente 1-3 por toma). Correrlos SIEMPRE en reels de más de
  ~1 min o con tomas de más de ~15s.
- Texto: caso natural (ni forzar mayúsculas ni minúsculas), sin puntuación de cierre
  salvo `!`/`?`, **respetando la variante de habla de la marca** (`brand.json` → `dialect`:
  Whisper tiende a normalizar a peninsular/neutro, así que si la marca habla de vos hay que
  convertir), y el léxico propio bien escrito (nombres de producto, términos de la marca).

### Hook estilo `chips` (legacy; el default hoy es el headline editorial de arriba)

- **Dos chips apilados centrados**, tipografía de marca a 48px MAYÚSCULAS, radius 18px,
  padding 26/38/24: línea 1 texto claro sobre la base oscura, línea 2 el color de acento
  con su ink calculado por contraste (la línea de acento es el punch: número o promesa).
- **Sombra SIEMPRE con blur**:
  `box-shadow: 0 12px 32px rgba(0,0,0,0.40), 0 4px 12px rgba(0,0,0,0.25);`
  Una sombra dura (`0 6px 0`) parece un segundo recuadro gris: PROHIBIDA. Aplica a
  TODO elemento visual flotante que se agregue a un video, siempre. (Si tu marca vetó el
  blur en piezas impresas, es otra cosa: en video queda horneado en píxeles.)
- Posición `top: 300px`: debajo de la UI superior de IG y arriba de la cabeza en un
  encuadre selfie típico.
- **Verificación del hook contra la cabeza — OBLIGATORIA: después de componer, renderizar
  el arranque, sacar un screenshot al segundo 2 o 3 (hook ya completo en pantalla) y
  MIRARLO: el chip de acento NO puede cortar la cabeza.** El frame de muestra del clip
  crudo NO alcanza (la cabeza se mueve durante los 3 segundos: medir el peor caso, no un
  instante). Si el encuadre trae la cabeza alta (selfie cerca de cámara, típico grabando en
  casa), **achicar el hook y subirlo**: `top` hasta 255px (el piso de la safe zone superior
  es 250) y font/padding/gap reducidos proporcionales (combinación probada: font 42,
  padding 23/33/21, gap 16 — el chip bajó de terminar en y≈514 a y≈443 y despejó la cabeza).
- Timing: entra con pop escalonado (back.out) a los 0.12s/0.30s, sale a los 2.94→3.2s.
- **Copy del hook**: COMPLEMENTA lo que se dice en el primer clip, no lo repite.
  Cuantificado y con curiosity gap (ej.: hablado "clonando tus apps favoritas con IA" →
  hook "CLONÉ UNA APP PAGA / CON 1 PROMPT"). En la voz de la marca, corto (línea 1 ≤ 4-5
  palabras, línea 2 ≤ 3).
- **Ojo con el cero en tipografías display**: en muchas display pesadas el `0` se lee como
  una O («0 PRODUCTOS» parece «O PRODUCTOS») y pierde el punch. Mirá el screenshot del hook:
  si pasa, escribí el número en palabra («CERO»). Los multi-dígito (40, 29) van en dígitos.
- **Sin handle ni logo fijo** arriba (tapa contenido y no suma nada: el perfil ya está en la
  UI de Instagram). Un lower-third de 3 s a los 3.4 s y un end card con el CTA hablado SÍ
  pueden ir, según `brand.json → motion` (`motion-layer.md`).

### Capa de motion y audio (según `brand.json → motion`)

- Lo que puedo generar además del hook y los captions está tabulado por nivel en
  `reference/motion-layer.md`: punch-in en énfasis, b-roll por cutaway, transiciones de
  superposición en cambios de idea, lower-third, CTA/end card, contador, grano/viñeta.
  **Un elemento a la vez además de los captions**, siempre dentro de safe zones.
- Antes de escribir un efecto a mano: `npx hyperframes catalog --query "<movimiento en inglés>"`
  y `npx hyperframes add <nombre>`. Lo ya instalado está en `compositions/` y
  `compositions/components/` del proyecto.
- SFX y música van por ffmpeg a `reel-<slug>/master-mix.m4a` (`reference/audio-sfx.md`),
  nunca solo al HTML: **el mux final pisa cualquier audio del render**. La paleta de SFX
  por rol y la música default están en `brand.json → sfx` / `music`.
- Verificación extra: snapshot en cada punch-in/transición/cutaway + `hyperframes timeline
  --json` sin solapes en la misma pista.

### Safe zones Instagram Reels (1080×1920) — TODO elemento gráfico adentro

- Libre arriba: **250px** (UI superior). Libre abajo: **420px** (caption/música).
- Libre derecha: **144px** (rail de likes/comentarios). Libre izquierda: **60px**.
- Por eso: hook a top:300, captions a bottom:470 con maxWidth 790px.

### Export / calidad

- **fps de la fuente de punta a punta** (60fps en los iPhone modernos): cuts `fps=60`,
  master `-g 60 -keyint_min 60 -bf 0` (keyframe/s: sin esto el render congela),
  render `-f 60`. Nunca bajar a 30.
- Calidad: cuts `crf 15 medium` → master `crf 16 slow` → render `-q high --crf 16`
  (~17 Mbps sobre fuente de celular de ~23 Mbps). Audio AAC 192k 48kHz.
- Fuentes SDR bt709 (el caso normal). Si el ffprobe muestra HLG/PQ (HDR): frenar y avisar.

### PASO OBLIGATORIO: muxear el audio del MASTER sobre el render

**El renderer de HyperFrames remuestrea mal el audio y lo atrasa progresivamente.**
Medido con correlación cruzada en un reel de 167s: el audio del MP4 renderizado va
**60ms atrasado a los 20s, 115ms a los 80s y 142ms a los 150s** respecto del master
(en un tutorial de 56s: 58→75ms). El VIDEO en cambio sigue la línea de tiempo del master
con solo +21ms constante (verificado comparando los cortes de escena). Resultado: por más
perfectos que estén los captions, en el archivo final **la voz suena cada vez más tarde
que la palabra en pantalla** — es la causa real del "no sincroniza al 100%".

Por eso el render de HyperFrames **nunca es el archivo de entrega**. Siempre:

```bash
ffmpeg -i renders/REEL_<slug>_vN.mp4 -i reel-<slug>/master.mp4 \
  -map 0:v -map 1:a -c copy -shortest -movflags +faststart \
  -y renders/REEL_<slug>_final.mp4
```

- `-c copy`: sin re-encode (ni pérdida de calidad ni tiempo).
- Verificar SIEMPRE con `scripts/measure-av-delay.mjs master.mp4 final.mp4 t1,t2,t3`:
  tiene que dar **lag 0.0ms y r=1.0000 en los tres tramos**. Si da distinto de 0, el mux
  falló.
- Recién sobre ESE archivo se corre la auditoría por energía y la verificación de frames.

### Auditoría de sincro por ENERGÍA (no con Whisper)

**Whisper NO sirve para verificar su propio timing**: tiene ±0.3s de ruido de onset y
midiendo la misma palabra en dos ventanas puede dar 77.87 y 78.87. Verificar captions
re-transcribiendo produce falsos positivos y hace perder horas.

La fuente de verdad es la **energía del audio**: `silencedetect` sobre el master con
`noise=-38dB:d=0.25` devuelve los **arranques de voz reales** (cada `silence_end`).
Para cada uno, buscar el caption más cercano y medir `caption.s − onset`:

```bash
ffmpeg -v info -i master.mp4 -af "silencedetect=noise=-38dB:d=0.25" -f null - 2>&1 \
  | grep silence_end | sed 's/.*silence_end: //; s/ .*//'
```

- Ignorar los onsets que caigan a menos de 0.35s de un empalme de tomas (`boundaries`
  de captions.json): ahí el arranque lo define el corte, no la sincro.
- **Objetivo de calidad (alcanzado en un reel de 167s con 23 onsets auditados): |error|
  mediano ≤ 0.05s, p90 ≤ 0.10s, ≥95% dentro de ±0.15s.** Cualquier palabra fuera de ±0.15s
  se corrige a mano en `transcripts-cut/<id>.json` con el onset medido (start local =
  onset − masterStart) y se reconstruye.
- Es barato (una pasada de ffmpeg), audita decenas de puntos y es independiente del
  modelo. Correrlo SIEMPRE antes del render final.

### Consenso de dos pasadas (cuando el timing tiene que ser fino)

Además de `retranscribe-blocks` + `merge-text-timing`, para reels largos conviene una
**segunda pasada con los bordes de bloque corridos** y promediar: los errores de las dos
son independientes, así que el promedio cancela ruido y mata el sesgo de "palabra pegada
al borde del bloque".

```bash
node retranscribe-blocks.mjs "$WORK"                          # pasada A → transcripts-cut
mv "$WORK/transcripts-cut" "$WORK/transcripts-blocks"
node retranscribe-blocks.mjs "$WORK" transcripts-blocks-b 3.5 # pasada B (bordes corridos)
node consensus-timing.mjs "$WORK" transcripts-blocks transcripts-blocks-b
node merge-text-timing.mjs "$WORK"                            # texto limpio del cut entero
```

Referencia real: 499 palabras consensuadas, solo 17 (3.4%) diferían >0.25s entre pasadas.

### Verificación OBLIGATORIA antes de entregar

Ningún reel se entrega sin leer frames reales del MP4 final:
1. ≥4 frames repartidos (inicio / medio ×2 / cerca del final) donde sepas qué palabra
   debería estar activa según captions.json → la sincro se valida VIENDO, incluido un
   punto cercano al final (descarta drift acumulado).
2. Hook presente a t≈1.5, ausente a t≥3.5, sombra difusa, y **screenshot a t=2 y t=3
   (hook completo) mirando que el chip de acento no corte la cabeza**.
3. Captions legibles sobre el b-roll más claro; palabras emph en el color de acento; nada
   fuera de safe zones.
4. `ffprobe`: fps y duración correctos. `volumedetect`: audio presente (~-1dB max).
   `measure-av-delay.mjs`: lag 0.0ms contra el master (el archivo entregado tiene que ser
   el MUXEADO, no el que escupe el renderer).
5. Entregar copia junto a los clips fuente + `SendUserFile`. **El ojo final es humano:
   el dueño de la marca mira el MP4 entero antes de publicar.**

### Mostrar cambios sin re-exportar todo

Para CUALQUIER ajuste visual puntual que el usuario pida ver (sombra, tamaño, color):
`sed` del `data-duration` a 4.5s en una COPIA del index.html → `render -c copia.html`
del tramo relevante → mandarle ese clip cortito. El export completo recién con su OK.
Borrar los archivos de test al terminar.

## Estructura de archivos por reel

```
hyper-edits/
├── brand.json                  ← config de marca (Paso 0, una vez por proyecto)
├── brand.css                   ← generado por setup-brand.mjs (no editar a mano)
├── index.html                  ← composición del reel ACTUAL (backup del anterior en _work)
├── fonts/                      ← solo si la marca usa tipografía propia
├── renders/REEL_<slug>_vN.mp4  ← exports (y copia junto a los clips fuente)
└── reel-<slug>/
    ├── master.mp4              ← video cortado+concatenado+loudnorm
    ├── captions.js             ← window.__CAPTIONS (lo genera build-captions.mjs)
    └── _work/                  ← clips.json, captions-config.json, segments.json,
                                   cuts/, transcripts/, transcripts-cut/, frames/,
                                   scripts copiados, backups
```

## Qué preguntar ANTES de arrancar

- **Primer reel del proyecto** (no hay `brand.json`): la entrevista de marca de
  `reference/brand-setup.md`. Son 5 preguntas y la única obligatoria es el color. Sumar
  una sexta: nivel de motion (`minimal` / `medium` / `hype`; default `medium`).
- **Reels siguientes**: el resto son defaults, salvo que el prompt diga otra cosa. Lo que SÍ se pregunta, siempre:
  0. **Headline / hook textual** (aparte de los subtítulos): con `AskUserQuestion`, 3-4 opciones redactadas a partir del
     guion/voz (case natural, línea 1 ≤ ~16 caracteres, línea 2 = el punch, que complemente y no repita lo hablado)
     + "sin headline". Nunca se pone un headline sin que el usuario lo haya elegido o escrito.
  1. ¿Hay keyword/CTA específico que deba respetarse? (el CTA hablado suele alcanzar)
  2. Si el material trae footage de varias fuentes: ¿qué tomas sí / cuáles vetadas?
  3. Si el material es de montaje (voz + b-roll): confirmar la lista de lo que NO puede
     aparecer en pantalla (`pipeline-montaje.md §Paso A`).

## Reversionar un video propio para republicarlo

Instagram deja de recomendar cuentas que republican contenido sin transformarlo
(ventana de 30 días; créditos, marca de agua y "ediciones superficiales" no cuentan) y
detecta duplicados con hashes perceptuales que sobreviven a recomprimir, recortar,
espejar, cambiar velocidad o filtros de color. **No se intenta "engañar" al hash**: lo que
hace al video nuevo es la misma lista que lo hace mejor video. Mínimo para una
reversión: hook distinto, otro corte (orden/duración), captions y gráficos generados
(capa de motion), b-roll nuevo intercalado, música distinta y, si se puede, otra voz o
guion. Esto aplica a material PROPIO del usuario; para material de terceros, no.
