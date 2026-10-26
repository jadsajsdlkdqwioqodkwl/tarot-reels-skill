# Capa de motion — elementos generados más allá de los captions

Tercera capa del editor (las otras dos son **marca** y **oficio**). Define QUÉ elementos
puedo generar sobre el video, CUÁNDO van y con qué límites. El nivel lo fija
`brand.json → motion` (`minimal` | `medium` | `hype`); dentro de cada nivel no se
pregunta, se aplica.

Todo lo de acá vive en la composición HTML (HyperFrames + GSAP) y se hornea en el render.
Reglas que no cambian: una sola timeline pausada registrada en `window.__timelines`,
`class="clip"` en todo elemento visible con timing, nada aleatorio (`Math.random()`
prohibido: PRNG con semilla si hace falta), safe zones de IG siempre.

Antes de armar un efecto a mano, buscarlo en el catálogo: `npx hyperframes catalog --query
"<el movimiento, en inglés>"` → `npx hyperframes add <nombre>`. Lo instalado ya está en
`compositions/` (bloques) y `compositions/components/` (componentes): leer el archivo
instalado antes de cablearlo.

## Menú por nivel

| Elemento | minimal | medium | hype | Dónde se decide |
|---|---|---|---|---|
| Hook de dos chips (3 s) | ✔ | ✔ | ✔ | siempre (SKILL.md §Hook) |
| Captions una palabra, corte seco | ✔ | ✔ | — | SKILL.md §Captions |
| Captions con animación (`caption-highlight` / `caption-kinetic-slam`) | — | — | ✔ | este doc §Captions animados |
| Punch-in en palabras de énfasis | — | 1 cada 8-12 s | 1 cada 4-6 s | §Punch-in |
| B-roll por cutaway | si el guion lo pide | ✔ | ✔ | §B-roll |
| Transición en cambio de idea (flash / whip / blur) | — | solo en cambios de sección | en cada cambio de idea | §Transiciones |
| Lower-third de presentación (primeros 4 s) | — | ✔ si hay nombre/rol | ✔ | §Lower-third |
| End card / CTA (últimos 3 s) | si hay CTA | ✔ | ✔ | §CTA |
| Contador / número grande | — | si hay cifra clave | ✔ | §Números |
| Look: grano + viñeta sutil | — | opcional por marca | ✔ | §Look |
| SFX (whoosh, pop, impacto) | hook | hook + transiciones + CTA | + énfasis | `audio-sfx.md` |
| Música de fondo | — | ✔ a -22 dB bajo la voz | ✔ a -18 dB | `audio-sfx.md` |

Regla general: **un elemento a la vez en pantalla además de los captions.** Si entra un
punch-in no entra una transición en el mismo segundo; si hay lower-third no hay hook
simultáneo (el hook va primero, el lower-third entra cuando el hook sale).

## Punch-in (zoom corto en palabra de énfasis)

El video principal va dentro de un wrapper SIN timing (el timing queda en el `<video>`):

```html
<div id="cam" style="position:absolute; inset:0; transform-origin: 50% 42%; will-change: transform;">
  <video id="main-v" class="clip" data-start="0" data-duration="{{DURATION}}" data-track-index="0"
         data-media-start="0" src="{{MASTER_SRC}}" muted playsinline></video>
</div>
```

```js
// t = segundo (del master) en que se dice la palabra de énfasis; sacarlo de captions.json
function punchIn(t, scale = 1.07) {
  tl.to("#cam", { scale, duration: 0.16, ease: "power3.out" }, t - 0.03);
  tl.to("#cam", { scale: 1, duration: 0.55, ease: "power2.inOut" }, t + 0.85);
}
```

- Escala 1.06-1.08 (más de 1.10 pixela el 1080p y marea).
- Transform-origin a la altura de los ojos (42 %) en selfie; al centro del objeto en b-roll.
- Nunca dentro de los 3 s del hook ni sobre un corte de toma (`boundaries` de captions.json
  ± 0.4 s): ahí el corte ya es el acento.
- Para zoom sostenido tipo "cámara viva" (regla "la cámara es un actor"): un push-in de
  1.00 → 1.04 a lo largo de cada toma, con `ease: "none"`, reseteado en cada boundary.

## B-roll por cutaway

Clip corto encima del master en una pista superior. El master sigue sonando (su audio
no se toca), la imagen se tapa.

```html
<video id="broll-1" class="clip" data-start="12.40" data-duration="2.2" data-track-index="1"
       data-media-start="3.0" src="assets/broll/pantalla-app.mp4" muted playsinline
       style="position:absolute; inset:0; width:1080px; height:1920px; object-fit:cover;"></video>
```

```js
// push-in suave para que el b-roll no quede muerto
tl.fromTo("#broll-1", { scale: 1.0 }, { scale: 1.05, duration: 2.2, ease: "none" }, 12.40);
```

- Duración 1.2-2.7 s. Entra en la palabra que lo nombra ("mirá esta pantalla"), no antes.
- Si el b-roll trae texto quemado o UI, no se le superpone caption en esa zona: mover el
  caption-layer arriba (`--caption-bottom` mayor) solo durante ese cutaway, con `tl.set`.
- Formato: 1080×1920 ya recortado (o `object-fit: cover`). Horizontal real → letterbox,
  nunca crop (regla permanente).
- Fuente: clips del usuario, capturas de pantalla (`hyperframes capture <url>`), o
  generados (bloques del registry como `app-showcase`, `code-typing`, `x-post`).

## Transiciones

El master ya viene concatenado, así que entre dos tomas solo caben **transiciones de superposición**
en el instante del corte (boundary). Se hacen con elementos propios de la composición (`<div>` + GSAP),
**no** con los bloques demo del registry (ver "No usar tal cual" abajo).

| Efecto | Cómo | Duración | Estado |
|---|---|---|---|
| Flash blanco | `<div>` blanco con `opacity 0→0.85→0` (receta de abajo) | 0.18-0.25 s | **probado** (render real) |
| Blur-through | `filter: blur(0→18px→0)` sobre el contenedor de video | 0.30 s | sin probar en la prueba de voz |
| Punch cut | `punchIn(boundary, 1.08)` sin retorno lento | 0.16 s | sin probar en la prueba de voz |
| Whip-pan / light leak | sin receta verificada: no hay `<div>` probado; no usar el bloque del registry | — | pendiente |

Receta del flash (probada; `z-index` por encima del video y debajo de captions/hook si hace falta):

```html
<div id="flash-css" style="position:absolute; inset:0; background:#fff; opacity:0; z-index:30; pointer-events:none;"></div>
```
```js
// en el boundary t (p. ej. 7.58): sube a 0.85 y vuelve en 0.18 s total
tl.fromTo("#flash-css", { opacity: 0 }, { opacity: 0.85, duration: 0.09, ease: "power2.out", yoyo: true, repeat: 1 }, 7.58);
```

**No usar tal cual los bloques del registry** (`flash-through-white`, `whip-pan`, `light-leak`,
`transitions-*`, `editorial-flash-overlay`): son escenas demo de 1920×1080 con texto y grilla, no overlays.
Cableadas con `data-composition-src` + `data-composition-id="main"` (como se documentaba antes) taparon
media pantalla con una losa de color y la línea de tiempo de la raíz dejó de aplicarse (captions fijos en
la primera palabra, hook ausente); al quitar el bloque todo volvió a funcionar. Causa probable: el bloque registra
su propio `window.__timelines["main"]`, el mismo id que la raíz (no verificado a nivel de código). Si hace falta uno, leer el archivo primero
y recrear el efecto como `<div>`; no incluirlo como sub-composición.

**Bloques del registry no probados** (`app-showcase`, `instagram-follow`, `lt-*`): renderiza 3 s antes de usarlos.

Las transiciones **reales** entre tomas (xfade, slide, zoom-through) se hacen al armar el master con
ffmpeg, no en la composición: ver `pipeline-montaje.md §Transiciones xfade`.

Dónde van: solo en cambios de idea del guion (nuevo punto, nueva sección), nunca en
cada corte de silencio. En `medium` el máximo es 1 cada 10-15 s (es una guía: si el usuario pide otra
frecuencia, manda el usuario).

## Lower-third de presentación

Bloques `lt-clean-bar` / `lt-soft-pill` instalados. Entra a los 3.4 s (cuando salió el
hook), dura 3 s, posición dentro de safe zone (bottom ≥ 420 px, left ≥ 60 px). Texto:
nombre + rol/promesa en una línea cada uno, tipografía de marca, colores de `brand.css`.
Si el reel es de la misma cuenta siempre y el perfil ya dice quién es, se omite (lo mismo
que la regla "sin handle fijo").

## CTA / end card

Últimos 3 s. Componente `cta-close` o bloque `instagram-follow`, o dos chips iguales al
hook con el CTA hablado ("Seguime para la parte 2" / "Comentá PROMPT"). Entra con el
mismo pop del hook (`back.out`), sale con el video. El CTA escrito tiene que coincidir
con el CTA hablado: nunca inventar uno.

## Números

Cuando el guion tiene UNA cifra clave ("40 clientes", "en 7 días"): componente `count-up`
grande en el centro superior (y ≈ 500-700) durante 1.2-1.8 s, color de acento, con
`punchIn` suave. Nunca más de dos por reel; los números nunca hacen overshoot.

## Look (grano, viñeta, color)

Componentes `grain-overlay` y `vignette` encima de todo con intensidad fija por marca
(grano 0.06-0.10, viñeta 0.25). Para color grade usar `hyperframes` color grading
(docs `guides/color-grading`) o un LUT en el master con ffmpeg (`lut3d=`). Verificar
siempre en un frame claro y uno oscuro que los captions sigan legibles.

## Captions animados (solo `hype`)

En `hype` se reemplaza la capa de una palabra por un componente del registry:
`caption-highlight` (línea visible, palabra activa resaltada), `caption-kinetic-slam`
(una palabra pantalla completa por beat) o `caption-editorial-emphasis` (contraste de
tamaño en énfasis). Leer el componente instalado y alimentarlo con `window.__CAPTIONS`.
Mismas safe zones y mismo timing (30 ms antes de la voz). Un solo estilo por reel.

## Verificación de la capa de motion (se suma a la del SKILL.md)

1. `npx hyperframes check` → 0 errores.
2. `npx hyperframes snapshot --at <t>` en cada punch-in, transición y cutaway: nada
   fuera de safe zones, nada tapando la cabeza, el caption sigue legible.
3. `npx hyperframes timeline --json`: ningún elemento generado se solapa con otro en la
   misma pista; los b-roll no pisan el hook ni el CTA.
4. Los SFX de la capa de motion van por ffmpeg al mix final, no al HTML
   (ver `audio-sfx.md`): el mux del audio del master pisa cualquier audio del render.
