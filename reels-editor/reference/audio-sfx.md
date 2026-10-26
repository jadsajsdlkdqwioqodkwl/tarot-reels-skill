# Audio generado — SFX, música de fondo y ducking

## Regla de arquitectura (leer primero)

El archivo de entrega se arma **muxeando el audio del master sobre el render**
(SKILL.md §PASO OBLIGATORIO, por el drift del renderer). Eso significa que **cualquier
`<audio>` que agregue a la composición se pierde en la entrega**. Por eso toda la capa de
audio generado se mezcla con ffmpeg en un archivo propio y ESE es el que se muxea:

```
master.mp4 (voz)  ─┐
sfx + música        ├─ ffmpeg (amix + sidechaincompress) ─► reel-<slug>/master-mix.m4a ─► mux sobre el render
```

Los `<audio>` en el HTML solo sirven para escuchar el mix en el preview del Studio; se
pueden dejar, pero no son la fuente de verdad.

> **Voz baja o despareja**: nivelarla primero con `scripts/level-voice.mjs` (ver `pipeline-montaje.md §B2`); el mix parte de ese wav.

## Biblioteca

Está en el proyecto, con licencia por archivo:

```
assets/sfx/   manifest.tsv   (86 efectos Mixkit · whoosh, swoosh, pop, click, ding, glitch,
                              typing, camera, notification, transition, bass, sparkle, impact, bell, riser)
assets/music/ manifest.tsv   (27 pistas Mixkit · cinematic, chill, corporate, hip-hop, energetic, ambient, funk)
assets/ASSETS.md             licencias, fuentes y cómo ampliar
```

Para elegir: `cut -f1,2 assets/sfx/manifest.tsv | column -t`. Para escuchar uno:
`ffplay -nodisp -autoexit assets/sfx/<archivo>`. Antes de usar un SFX en un reel, medir su
duración (`ffprobe -show_entries format=duration`) y su pico (`volumedetect`): los de
Mixkit vienen a niveles muy distintos.

Paleta por marca: `brand.json → sfx` asigna un archivo por rol (`hook`, `transition`,
`emphasis`, `cta`, `typing`). Una vez elegida, se repite en todos los reels: la marca
suena igual siempre.

## Dónde va cada SFX

| Momento | SFX | Nivel (pico) | Nota |
|---|---|---|---|
| Entrada del hook (chip 1 y chip 2) | whoosh corto o pop ×2 | -12 dB | A 0.12 s y 0.30 s, igual que el pop visual |
| Salida del hook | swoosh suave | -16 dB | opcional |
| Transición de sección | whoosh / impact / riser corto | -10 dB | centrado en el boundary |
| Punch-in de énfasis | pop seco o bass hit | -14 dB | solo en `hype` |
| Número / count-up | ding / sparkle | -14 dB | |
| Texto que se tipea | typing (recortado al largo del texto) | -18 dB | |
| CTA final | notification / bell | -12 dB | 1 solo |

Nunca más de un SFX cada 2 s. Nunca un SFX sobre una palabra importante de la voz.

## Música de fondo

- Nivel: `medium` → la música queda ~22 dB por debajo de la voz; `hype` → ~18 dB.
  Sin voz (intro/outro de b-roll) sube a -8 dB.
- Ducking por sidechain: la música baja sola cuando hay voz y vuelve en las pausas.
- Fade-in 0.6 s al inicio, fade-out 1.2 s al final.
- Elegir por BPM/energía del guion: hablado rápido → 110-125 BPM; tutorial → chill/ambient.
- Loudness final del mix: `loudnorm=I=-14:TP=-1:LRA=11` (igual que el master).

## Receta ffmpeg (SFX + música + ducking → master-mix.m4a)

`clips.json`-style config no hace falta: un comando con `adelay` por SFX.

```bash
REEL=reel-<slug>
ffmpeg -y -v error \
  -i $REEL/master.mp4 \
  -i assets/music/mixkit-chill-1234.mp3 \
  -i assets/sfx/mixkit-whoosh-1489.mp3 \
  -i assets/sfx/mixkit-notification-2650.mp3 \
  -filter_complex "
    [0:a]aformat=sample_rates=48000:channel_layouts=stereo[voice];
    [1:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${DUR},afade=t=in:d=0.6,afade=t=out:st=$(node -e "console.log(+(${DUR}-1.2).toFixed(3))"):d=1.2,volume=0.35[mus];
    [voice]asplit=2[v1][v2];
    [mus][v2]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=400:makeup=1[musduck];
    [2:a]adelay=120|120,volume=0.5[sfx1];
    [3:a]adelay=$(node -e "console.log(Math.round((${DUR}-3)*1000))")|$(node -e "console.log(Math.round((${DUR}-3)*1000))"),volume=0.5[sfx2];
    [v1][musduck][sfx1][sfx2]amix=inputs=4:duration=first:normalize=0,
    loudnorm=I=-14:TP=-1:LRA=11[out]" \
  -map "[out]" -c:a aac -b:a 192k -ar 48000 $REEL/master-mix.m4a
```

- `adelay=<ms>|<ms>`: posición del SFX en milisegundos (dos canales).
- Los cálculos usan `node -e` porque `bc` no existe en Git Bash de Windows.
- `sidechaincompress`: la voz (`[v2]`) comprime la música. `threshold` más bajo = ducking
  más agresivo; `release=400` evita el bombeo.
- `amix … normalize=0`: sin eso ffmpeg baja todo 1/N y la voz pierde nivel.
- Verificar: `volumedetect` del mix (max ≈ -1 dB) y **escuchar** 3 tramos: voz clara, música
  presente en las pausas, ningún SFX tapando una palabra.

Mux final (reemplaza al del SKILL.md cuando hay capa de audio):

```bash
ffmpeg -y -i renders/REEL_<slug>_vN.mp4 -i $REEL/master-mix.m4a \
  -map 0:v -map 1:a -c copy -shortest -movflags +faststart renders/REEL_<slug>_final.mp4
node scripts/measure-av-delay.mjs $REEL/master.mp4 renders/REEL_<slug>_final.mp4 10,40,70   # lag 0.0 ms
```

`measure-av-delay` correlaciona voz contra voz: con música encima puede bajar la `r`, pero
el lag tiene que seguir en 0.0 ms. Si da distinto, el problema es el mux, no la música.

## Preview en el Studio (opcional)

Para escuchar el mix dentro de `npm run dev` se puede declarar la música en el HTML con
el ducking automatizado; es solo preview, la entrega sigue siendo el mix de ffmpeg.

```html
<audio id="music" data-start="0" data-duration="{{DURATION}}" data-track-index="4"
       src="assets/music/mixkit-chill-1234.mp3" data-volume="0.35"
       data-automation='{"version":1,"lanes":[{"target":"volume","points":[{"t":0,"v":0},{"t":0.6,"v":1},{"t":{{DUR_MINUS_1_2}},"v":1},{"t":{{DURATION}},"v":0}]}]}'></audio>
```

## Cómo ampliar la biblioteca

- Mixkit (sin cuenta, uso comercial, sin atribución): bajar desde la página de la
  categoría; los `-preview.mp3` de `assets.mixkit.co` son los mismos archivos que sirve
  el reproductor del sitio.
- Freesound CC0 (necesita token gratis en freesound.org/apiv2/apply):
  `curl "https://freesound.org/apiv2/search/text/?query=whoosh&filter=license:%22Creative%20Commons%200%22%20duration:[0%20TO%202]&fields=id,name,previews&token=$FREESOUND_TOKEN"`
  y bajar `previews.preview-hq-mp3` de cada resultado.
- Kenney (CC0): packs de UI/impactos en kenney.nl/assets (bajar el zip a mano).
- BigSoundBank (CC0): `https://bigsoundbank.com/UPLOAD/mp3/<id>.mp3`.
- Cada archivo nuevo entra en el `manifest.tsv` con fuente y licencia. Sin eso no se usa.
