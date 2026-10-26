# Pipeline de montaje — voz en off + b-roll de producto

Segundo flujo del editor. El primero (`pipeline-detallado.md`) es **selfie hablado a
cámara**: una persona, corte de silencios, captions. Este es **voz en off + montaje**: una
pista de voz (grabada o TTS) y muchas tomas cortas de material de producto/b-roll que se
cortan AL RITMO de la voz. Lo probamos en el reel de cartas de tarot (5 versiones, 35
tomas de 6 fuentes, 73 s, 4:5) y estas son las reglas que quedaron.

Cuándo es este flujo y no el otro:
- No hay nadie hablando a cámara, o hay una voz que no es la del video.
- Hay 3+ fuentes de video distintas y el reel se arma eligiendo tomas.
- El cliente pide "un video con mis clips y esta voz / este guion".

## Paso 0 — Marca y guion

- `brand.json` igual que siempre. Además `ratio` (`9:16` o `4:5`: el feed de IG recorta
  los reels a 4:5, los clientes de producto suelen pedir 4:5).
- Guion: si no hay voz grabada, se escribe el guion con el usuario (120-180 palabras para
  60-75 s) y se genera con TTS (`npx hyperframes tts` o ElevenLabs si el usuario tiene la
  voz). La voz se **recorta de silencios** igual que un selfie (`silencedetect` + atrim):
  en el reel de cartas la voz pasó de 81 s a 73 s.

## Paso A — Inventario de fuentes (obligatorio y por escrito)

Cada fuente recibe una **letra** (A, B, C…) y una ficha en `_work/sources.md`:
resolución, fps, si trae subtítulos quemados, y una **tabla de qué se ve en cada tramo**
(cada 1-2 s). Esa tabla sale de extraer 1 frame por segundo y MIRARLOS:

```bash
ffmpeg -v error -i "$SRC/fuente.mp4" -vf "fps=1,scale=270:-2" "$WORK/frames/B_%03d.jpg"
```

De ahí se anota lo prohibido/preferido: en el reel de cartas había que vetar cartas con
desnudos (La Estrella, Los Enamorados), el manual de papel y la caja con QR, y preferir
la mano con las cartas (B). **Sin esta tabla aparecen cosas que el cliente no quiere y
hay que rehacer el reel** (nos pasó dos veces: v2 y v4).

Reglas de material:
- Si una fuente tiene versión con y sin subtítulos quemados, usar SIEMPRE la limpia.
- Ningún tramo de ninguna fuente se usa dos veces en el mismo reel.
- Las fuentes que duplican contenido entre sí (T 5-9 ≈ A 0-10) se anotan para no repetir.
- Resoluciones distintas se normalizan al lienzo (`scale` + `crop` centrado o `pad`); una
  fuente de 576 px se ve blanda: usarla solo si es material único y poco tiempo.

## Paso B — Transcripción de la voz

`python ~/.claude/skills/reels-editor/scripts/transcribe.py vo.mp3 _work/words.json medium $LANG`
(faster-whisper local; `HF_HUB_OFFLINE=1` si el modelo ya está en caché) → palabras con timing.
`npx hyperframes transcribe` solo sirve si hay `whisper-cpp` instalado (en esta máquina no lo hay).
Con eso se marca el guion en **frases** y cada frase recibe su toma.

## Paso C — Plan de montaje (`_work/montaje.md`)

Tabla `# | fuente inicio–fin | frase`. Criterios:
- **Toma = frase o media frase.** Duración 1.2-2.7 s *(default: si el prompt fija cantidad de beats o duración
  de tomas, manda el prompt)*; el cambio cae en el inicio de la frase (±0.1 s), nunca a mitad de palabra.
- **Hook: una sola toma de 2.5-3 s**, la más limpia y reconocible. Muchos cortes en los
  primeros 3 s cansan (feedback real: la v2 con 37 tomas "cambiaba demasiado al principio").
- Mostrar lo que se dice: "collar" → toma con el collar; "78 cartas" → el mazo abierto. Si
  no hay toma literal, la más cercana en significado, nunca una al azar.
- La fuente principal (la más linda) lleva el 35-45 % del tiempo; el resto se reparte.
- Las tomas de producto en venta (caja, kit) van en el bloque de CTA, no antes.
- Cerrar con la toma más fuerte del producto + CTA.

## Paso D — Armar el master

Script por reel en `_work/build-master.mjs` (copiar el de `reel-cartas/_work/build-master5.mjs`
como base). Qué hace:
1. Por toma: `trim` + `setpts` + normalización al lienzo (`scale/crop/pad`) + `fps` del
   proyecto → `segs/<fuente>_<ini>-<fin>.mp4`. **El nombre del segmento incluye el
   archivo fuente**: sin eso el caché reutiliza tomas de otra versión de la fuente (bug
   real de la v5).
2. `segments.json` con `masterStart` medido del archivo (nunca teórico).
3. Concat (o xfade, abajo) → `video_only.mp4` con `-g fps -keyint_min fps -bf 0`.
4. Mix de audio (`audio-sfx.md`): voz + música + SFX → `mix.wav` → `master.mp4` con
   `loudnorm`.

### Transiciones xfade (solo acá, en el master)

Entre dos tomas consecutivas que son un cambio de sección se puede meter un `xfade` de
0.25-0.4 s (`fade`, `slideleft`, `zoomin`, `wipeleft`, `circleopen`; lista completa:
`ffmpeg -h filter=xfade`). Con xfade los `masterStart` ya no son la suma de duraciones:
cada transición resta su duración. El script tiene que recalcularlos y escribirlos en
`segments.json`. Máximo 4-6 xfades por reel; el resto corte seco.

```
[0:v][1:v]xfade=transition=slideleft:duration=0.3:offset=<dur0-0.3>[v01];
[v01][2:v]xfade=transition=fade:duration=0.25:offset=<dur0+dur1-0.3-0.25>[v012]
```

## Paso E — Verificación del montaje ANTES de captions

4 frames por toma (al 10 %, 40 %, 70 %, 95 %) y mirarlos todos. Checklist:
- Ninguna toma muestra lo vetado.
- Ningún tramo repetido (grep del plan).
- Ningún corte de escena DENTRO de una toma (detección automática:
  `select='gt(scene,0.4)',showinfo` por segmento; los que quedan son movimiento de manos).
- Cuadros negros: `blackdetect=d=0.1`.

## Paso F — Captions

**Default actual: `minimal`** (frases de 2-4 palabras, letra fina, contorno simple; `build-chunk-captions.mjs` + `composition-template-minimal.html`, ver SKILL.md §Estilos). Los dos estilos anteriores siguen disponibles si el cliente los pide; queda en `brand.json → captions.style`:
- `word` (default del editor): una palabra, corte seco, dorado en énfasis.
- `chunk`: frases de 2-5 palabras cortadas en la puntuación de la voz, sobre un recuadro
  del color de acento (reel de cartas: Anton 66 px, recuadro rosa, centro en y=690 de
  1350). Sirve para tapar subtítulos quemados de las fuentes.

Timing: igual que selfie (`build-captions.mjs` con la voz como único "cut" cuyo
`masterStart` es 0 si la voz arranca con el video). Energía (`silencedetect -38dB`) para
anclar frases, interpolación entre anclas.

## Paso G — Composición, motion y render

- Template de siempre con el `ratio` del proyecto (4:5 → `1080×1350`, `--hook-top: 110px`,
  `--caption-bottom: 250px`, `height` del scrim 620).
- Capa de motion según `brand.json → motion` (`motion-layer.md`). En montaje, el punch-in
  va sobre la toma, no sobre la cabeza.
- Render (`hyperframes render -q high --crf 16 -f <fps>`) → mux con `master.mp4` (ya trae
  el mix) → `measure-av-delay` 0.0 ms → verificación de frames (hook, 2 medios, final).

## Paso H — Versionado

Cada versión entregada es un MP4 nuevo (`REEL_<slug>_vN.mp4`), nunca se pisa la anterior,
y `reel-<slug>/CHANGELOG.md` registra: pedido del cliente, qué cambió, tabla de montaje
completa, fuentes nuevas, tiempo por fuente. Es lo que permitió volver de la v2 a la
estructura de la v1 sin rehacer todo.

## Paso B2 — Nivelar la voz (voces bajas o que se van apagando)

Una voz grabada/TTS puede venir baja (-30 LUFS) o apagándose hacia el final (caso real:
voz de 49 s que caía ~5 dB). **Antes de transcribir y mezclar**:

```bash
node ~/.claude/skills/reels-editor/scripts/level-voice.mjs vo_raw.mp3 _work/vo_lvl.wav -14
```

Cadena 100 % ffmpeg, local (la voz del cliente no se sube a ningún servicio): highpass 70 Hz →
`afftdn` (denoise suave, necesario cuando se amplifica mucho) → `dynaudnorm` (leveler ventana a
ventana: iguala el nivel de punta a punta) → `acompressor` → `loudnorm` 2 pasadas (EBU R128) →
`alimiter`. Es la misma técnica que ffmpeg-normalize / Auphonic, sin cuenta ni subida.
**Verificar** el nivel por ventanas: `ffmpeg -ss T -t 4 -i vo_lvl.wav -af volumedetect -f null -`
en 8-10 puntos; tienen que estar a ±1.5 dB. Si el último tramo queda más bajo, subirlo con
`volume='if(gt(t,T),1.28,1)':eval=frame` en una pausa. El mix (`audio-sfx.md`) parte de este wav.

## Paso B3 — Onsets: Whisper llega tarde

Medido en el reel kit-tarot: `faster_whisper medium` marcó "Manual" en 41.8 s y la energía
(`silencedetect -38dB:d=0.25`) en 41.45 s (0.35 s de error). En `build-captions` anclar con
tolerancia 0.5 s, no 0.3.

## Reglas añadidas el 2026-10-20 (feedback del reel cartas v7)

- **Producto/tema visible solo cuando se nombra.** El corte al tomas de "manual", "collar", "tapete" arranca en la
  palabra clave (±0.1 s, mirar `words.json`) y NO antes; mientras se habla de otra cosa no se muestra (ni de fondo:
  elegir tomas sin ese objeto detrás). Si falta metraje, buscar en TODAS las fuentes del proyecto (`Clips 1/`), incluidos
  los crudos 4K, antes de estirar o repetir.
- **Tomas largas continuas** en las secciones de producto (una toma por idea, no 4 cortes); cortar solo en cambios de idea.
- **No arrancar con un gesto a medias** (carta de espaldas, volteándose): el primer frame real debe ser el estado final (carta ya volteada).
- **Quitar frases de la voz** (el usuario puede pedirlo): cortar en mínimos de energía (±80 ms) con crossfade de 12 ms y
  re-escribir `words.json` con el desfase (ver `reel-cartas-v6/_work/edit-voice.mjs` como base).
- **Primer SFX = teclado** (typing con el headline), nunca sparks/shine al segundo 0.
- **Música de fondo muy baja pero audible**: `volume≈0.17` sobre el mp3 + `sidechaincompress=threshold=0.1:ratio=2` (el ducking
  fuerte de antes, ratio 5, la dejaba inaudible).
