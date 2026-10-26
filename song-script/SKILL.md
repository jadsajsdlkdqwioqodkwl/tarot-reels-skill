---
name: song-script
description: >-
  Escribe el guión de una "historia cantada" para reels / anuncios de Meta Ads /
  TikTok, siguiendo la anatomía de 9 beats de un AI song ad. Produce letra lista
  para Beatra y brief de personaje listo para video-gen. Usar antes de generar
  audio o video.
compatibility: claude-code
version: 3.0.0
---

# Song Script — Historia Cantada para Reels

## Propósito

Produce:
1. **Guión de 9 beats** con letra cantada + visual sugerido por beat
2. **Prompt de audio** para Beatra (`beatra-ai/lyrics-to-song-skill`)
3. **Brief de personaje** para el skill `video-gen`

> ℹ️ Este skill no tiene información hardcodeada de ningún negocio ni tono.
> Todos los datos vienen de `brand.json` + lo que el usuario provee en el brief.
> Los frameworks de copywriting son reales, tomados de TikAdSuite, Hooked.so,
> ShortGenius y práctica documentada de ads de TikTok/Meta (ver sección FRAMEWORKS).

---

## Paso 0 — Capturar datos de marca y brief

### 0a — Leer brand.json

```bash
cat brand.json 2>/dev/null || echo "NO BRAND FILE"
```

Si existe: los campos `brandName`, `audience.pain`, `audience.transformation`,
`tone`, `cta`, `dialect`, y especialmente `voice.examples[]` son los defaults.
**No volver a preguntar lo que ya está en brand.json.**

Si hay `voice.examples[]` en brand.json: usarlos como referencia de estilo y
vocabulario real de la marca. Si no hay, pedirlos en el Paso 0b.

### 0b — Capturar voz real de la marca (CRÍTICO si no hay voice.examples)

Si `brand.json` no tiene el campo `voice.examples[]` (o está vacío), preguntar:

```
🎤 Para que el guión suene como VOS y no como Claude, necesito ejemplos reales.

Pegá 3-5 ejemplos de cómo ya te comunicás con tu audiencia:
  - Captions de posts que funcionaron
  - Frases que usás en stories
  - Mensajes de venta que ya enviaste
  - Respuestas a comentarios que lograron engagement
  - Cualquier texto que digas "sí, eso soy yo"

(Si no tenés nada, escribí cómo hablarías a una amiga que tiene tu problema)
```

Cuando el usuario los provea:
1. Extraer: vocabulario recurrente, longitud de frases, nivel de formalidad,
   palabras propias de su nicho, expresiones que repiten
2. Guardar en `brand.json → voice.examples[]` y `brand.json → voice.markers`
3. Usar esos marcadores en TODA la letra — no el vocabulario genérico de la skill

```bash
# Guardar voice.examples en brand.json si no existían
node -e "
const fs = require('fs');
const b = JSON.parse(fs.readFileSync('brand.json', 'utf8'));
b.voice = b.voice || {};
b.voice.examples = [/* los ejemplos que dio el usuario */];
b.voice.markers = {/* extracto: palabras clave, nivel, tono */};
fs.writeFileSync('brand.json', JSON.stringify(b, null, 2));
console.log('✅ Voice guardada en brand.json');
"
```

### 0c — Selector de personaje

Leer `brand.json → characters[]`. Mostrar siempre:

```
🎭 ¿Qué personaje protagoniza este reel?

[Si hay personajes guardados]:
  a) [Nombre] — [descripción breve] ([✅/❌] character sheet)
  b) Nuevo perfil — describir ahora
  c) Sin personaje — voz en off / texto solo

[Si no hay ninguno]:
  a) Crear personaje ahora (nombre, género/edad, estética en 2 líneas)
  b) Sin personaje — solo voz y texto
```

### 0d — Brief del reel

Preguntar solo lo que brand.json no responde:

```
📋 Brief para este reel
(Los campos con ✓ vienen de brand.json — confirmá o cambiá)

1. ¿Qué comunicamos en este reel?: ___
   (oferta puntual, dolor específico, temporada, lanzamiento)
2. Tono ✓ [el de brand.json]: ¿mismo o cambiar?
3. CTA ✓ [el de brand.json]: ¿mismo o cambiar?
4. Duración objetivo: [corto 25–35 s / largo 45–60 s]  (default: corto)
5. Género musical: [pop / trap / cumbia / reggaeton / electrónico / balada / otro]
6. Nivel de audiencia: [fría — no me conoce / tibia — me siguió / caliente — ya vio mis ads]
7. ¿Variante A/B?: [solo A / generar también hook alternativo para B]
```

**No escribir el guión hasta tener respuesta al punto 1.**

---

## Frameworks de copywriting reales (NO inventados por Claude)

> Fuentes: TikAdSuite.com "TikTok Ad Copywriting Formulas That Drive Real Sales" (2026),
> Hooked.so "Crafting a High-Converting Script for Advertising" (2026),
> ShortGenius.com "8 Powerful Ad Script Example Frameworks" (2026),
> Precis & TikTok Research Playbook (10 Nordic eCommerce brands, +55% ROI con UGC-style).

### FRAMEWORK SELECTOR — elegir según nivel de audiencia

| Audiencia | Framework | Por qué |
|-----------|-----------|---------|
| Fría (nunca oyó del producto) | **AIDA** o **HVO** | Necesitan construir desde cero — awareness antes de conversión |
| Tibia (siguió, vio contenido) | **PAS** | Ya sienten el dolor, necesitan agitación y solución clara |
| Caliente (vio ads, no convirtió) | **Skeptic Script** | El escepticismo es su estado — liderarlo con duda, no con promesas |
| Cualquier nivel | **Hook Formula** | El hook es obligatorio en todos los frameworks |

---

### FRAMEWORK 1 — AIDA (Attention → Interest → Desire → Action)

**Origen:** Elias St. Elmo Lewis, 1898. El más documentado en publicidad.
**Usar cuando:** audiencia fría, lanzamientos nuevos, primer contacto.

Mapeado a los 9 beats del song ad:

| Beat | Fase AIDA | Función en canción |
|------|-----------|-------------------|
| 1 Hook | **Attention** (0-3s) | Pattern interrupt — pregunta o afirmación que para el scroll |
| 2 Pain | **Interest** inicio | Razón específica para seguir escuchando |
| 3 Agitation | **Interest** profundo | Expandir por qué les importa |
| 4 Dream | **Desire** inicio | Mostrar la transformación posible |
| 5 Bridge | **Desire** intermedio | Transición emocional hacia la solución |
| 6 Solution | **Desire** climax | El producto como catalizador del sueño |
| 7 Proof | **Desire** validación | Evidencia — número, resultado, historia |
| 8 Transformation | **Desire** cierre | El avatar ya tiene la vida soñada |
| 9 CTA | **Action** | Instrucción directa y específica |

**Regla de oro de AIDA para song ads:** La fase Desire es donde entra la música.
Los beats 4-8 deben sonar como la canción de la vida que el avatar quiere vivir,
no como un argumento de venta.

---

### FRAMEWORK 2 — PAS (Problem → Agitate → Solution)

**Origen:** Documentado ampliamente en direct response copywriting.
**Usar cuando:** audiencia tibia, productos de dolor alto, retargeting.

Mapeado a los 9 beats:

| Beat | Fase PAS | Función en canción |
|------|----------|-------------------|
| 1 Hook | Entrada al **Problem** | El hook nombra el dolor directamente — sin contexto |
| 2 Pain | **Problem** completo | "Eso me pasa a mí exactamente" |
| 3 Agitation | **Agitate** | "Y lo peor es que..." — eleva las consecuencias |
| 4-5 | **Agitate** sostenido | Mostrar el costo emocional o práctico de no resolver |
| 6 Solution | **Solution** | Aparece el producto como la salida |
| 7 Proof | **Solution** + evidencia | Cierra el escepticismo |
| 8 Transformation | Resultado del **Solution** | El antes vs. el ahora |
| 9 CTA | Cierre de **Solution** | Qué hacer para obtener la solución |

**Regla de oro de PAS para song ads:** Los beats 2 y 3 son los que más duelen —
deben ser tan específicos que el avatar piense "alguien me está espiando".
Evitar el dolor genérico ("te sentís mal") y ir al dolor concreto ("son las 2am
y seguís en el teléfono buscando señales que no llegan").

---

### FRAMEWORK 3 — Skeptic Script

**Origen:** Documentado por TikAdSuite como el framework de mayor conversión en 2026
para categorías saturadas y audiencias que ya vieron otras soluciones.
**Usar cuando:** audiencia caliente/retargeting, mercado saturado de promesas similares.

Estructura del arco: Skepticism → Reluctant Trial → Undeniable Proof

Mapeado a los 9 beats:

| Beat | Arco Skeptic | Función en canción |
|------|-------------|-------------------|
| 1 Hook | **Skepticismo del avatar** | El hook ES la duda: "Yo tampoco creía..." / "Ya probé todo..." |
| 2 Pain | El pasado fallido | Lo que no funcionó antes — específico, no vago |
| 3 Agitation | El peso del escepticismo | "Ya gasté plata, ya perdí tiempo, ya no confío en nada" |
| 4 Dream | La tentación a pesar de todo | Un último intento — casi resignado |
| 5 Bridge | El quiebre | El momento en que algo diferente pasó |
| 6 Solution | La rendición ante la evidencia | "Tuve que admitir que funcionó" |
| 7 Proof | Prueba reluctante | "No lo digo yo — lo dice el resultado" |
| 8 Transformation | "Estaba equivocado/a" | La admisión honesta de que cambió |
| 9 CTA | Invitación al escéptico | "Si no creés, entiendo. Igual mirá esto." |

**Regla de oro del Skeptic Script:** Nunca eliminar el escepticismo — usarlo.
La voz del personaje ES la voz del avatar dubitativo. No convertir el hook
en una promesa — debe sonar a rendición honesta, no a pitch.

---

### FRAMEWORK 4 — HVO (Hook → Value → Offer)

**Origen:** Documentado en TikAdSuite para flash sales y productos de impulso.
**Usar cuando:** oferta puntual, urgencia real, audiencia lista para comprar.

Mapeado a los 9 beats (versión comprimida para urgencia):

| Beat | Fase HVO | Función en canción |
|------|----------|-------------------|
| 1-2 | **Hook** fuerte | Detiene el scroll + establece relevancia |
| 3-4 | **Value** rápido | Entrega algo útil/sorprendente antes de pedir nada |
| 5-6 | **Value** → **Offer** | La transición directa a la oferta |
| 7-8 | **Offer** + prueba | La oferta específica con validación |
| 9 | **Offer** cierre | CTA con urgencia real (deadline o escasez concreta) |

**Regla de oro del HVO:** El Value es lo que diferencia este framework de un
pitch directo. Hay que dar algo (información, revelación, emoción) ANTES de pedir.
Si el beat 3-4 no entrega valor real, el framework no funciona.

---

### HOOK FORMULA — Tipos de hook por objetivo

**Fuente:** TikAdSuite + análisis de 500+ ads de alto desempeño (LinkedIn, 2026).

#### Hook Positivo — Resultado + Tiempo + Calificador
Estructura: `[Resultado específico] en [tiempo concreto] usando [elemento inesperado]`

Ejemplo: *"Empecé a leer el tarot en 11 días sin saber nada antes"*

Usar cuando: el producto tiene resultado visible y rápido.

#### Hook Negativo — Stop + Comportamiento + Consecuencia
Estructura: `Dejá de [comportamiento] — [consecuencia que no sabían]`

Ejemplo: *"Dejá de buscar señales en el horóscopo — el tarot te dice algo diferente"*

Usar cuando: el avatar usa soluciones alternativas que no funcionan.

#### Hook de Pregunta — Pregunta + Stakes Implícitas
Estructura: `¿[Pregunta que asume algo que les importa]?`

Ejemplo: *"¿Qué harías si supieras exactamente qué decisión tomar?"*

Usar cuando: el avatar ya siente el problema pero no sabe que existe tu solución.

#### Hook Escéptico (para Skeptic Script)
Estructura: `[Admisión de duda] + [apertura a la posibilidad]`

Ejemplo: *"Yo no creía en el tarot — hasta que una carta describió mi semana exacta"*

Usar cuando: audiencia caliente que ya vio promesas similares.

---

## Reglas de letra (derivadas de análisis de ads reales)

### Qué convierte

- **Especificidad numérica:** "11 días" supera "rápido" siempre (TikAdSuite, 2026)
- **Primera persona del avatar:** "No sé qué hacer" vs. "muchas personas no saben"
- **Gancho en 3 palabras:** Las primeras 3 palabras deben funcionar solas
- **Voz de marca real:** Usar el vocabulario de `brand.json → voice.markers`, NO el genérico
- **Concreción sobre abstracción:** "son las 2am mirando el techo" > "la incertidumbre me consume"
- **Ritmo natural al BPM:** cada beat debe caber en ≤ 4 segundos cantado

### Qué destruye el copy (documentado)

- ❌ Adjetivos vacíos: "increíble", "asombroso", "poderoso", "transformador"
- ❌ Clichés de bienestar: "tu mejor versión", "el universo conspira"
- ❌ Mencionar el producto antes del Beat 5 (en AIDA/PAS) o Beat 6 (en Skeptic)
- ❌ CTAs genéricos: "no te lo pierdas", "aprovecha esta oportunidad"
- ❌ Rimas forzadas que cambian el significado
- ❌ Vocabulario que no viene de los `voice.examples` del cliente

### Tabla de sílabas por BPM

| BPM | Sílabas por beat de 3s | Sílabas por beat de 4s |
|-----|----------------------|----------------------|
| 100 | 8–10 | 10–13 |
| 120 | 10–12 | 13–16 |
| 140 | 12–14 | 15–19 |
| 160 | 14–16 | 18–22 |

---

## Checklist pre-escritura (ANTES de generar la letra)

Antes de escribir el primer beat, completar mentalmente:

1. ✅ ¿Tengo `voice.examples` o `voice.markers` del cliente? (Si no, pedir en Paso 0b)
2. ✅ ¿Elegí el framework correcto según el nivel de audiencia?
3. ✅ ¿Sé cuál es el tipo de hook que voy a usar?
4. ✅ ¿Sé el dolor específico del avatar (no el genérico)?
5. ✅ ¿Tengo evidencia concreta para el Beat 7 (número, resultado, historia)?

Si alguna respuesta es "no" → volver al Paso 0 y pedir esa información.
**No empezar con información incompleta y rellenar con genéricos.**

---

## Anatomía de los 9 beats

| # | Beat | Duración | Función | Pregunta de validación |
|---|------|----------|---------|----------------------|
| 1 | **Hook** | 2–3 s | Para el scroll. Funciona sin contexto previo | ¿Esto funciona en 3 palabras sin saber nada del producto? |
| 2 | **Pain** | 3–4 s | Nombra el dolor exacto. Empatía inmediata | ¿El avatar dice "eso me pasa a mí"? |
| 3 | **Agitation** | 2–3 s | Intensifica. "Y lo peor es que…" | ¿Duele más que el beat anterior? |
| 4 | **Dream** | 2–3 s | El mundo ideal — lo que realmente quiere | ¿Se puede visualizar claramente sin el producto? |
| 5 | **Bridge** | 1–2 s | Conecta el sueño con la solución | ¿Hay lógica natural hacia la solución? |
| 6 | **Solution** | 3–4 s | Presenta el producto. Antes vs. después | ¿Queda claro QUÉ es y QUÉ hace? |
| 7 | **Proof** | 2–3 s | Evidencia concreta: número, resultado, historia | ¿Hay algo específico, no vago? |
| 8 | **Transformation** | 2–3 s | El avatar YA tiene la vida soñada | ¿Contrasta visiblemente con el Beat 2? |
| 9 | **CTA** | 2–3 s | Invitación directa con urgencia suave | ¿Dice exactamente qué hacer? |

**Duración total:** 25–35 s (corto) o 45–60 s (largo)

---

## Formato de salida del guión

Usar EXACTAMENTE este formato — `video-gen` y `reels-editor` lo consumen así:

```
🎵 HISTORIA CANTADA — [NOMBRE DEL NEGOCIO]
Framework usado: [AIDA / PAS / Skeptic / HVO]
Hook tipo: [Positivo / Negativo / Pregunta / Escéptico]
Tono de voz: [extraído de brand.json — no inventado]
Género musical: [género]
BPM sugerido: [número]
Duración total estimada: [X] s
Ratio de exportación: [9:16 / 4:5]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEAT 1 — HOOK ([X]s) · [Hook Positivo/Negativo/Pregunta/Escéptico]
Letra: "[texto cantado]"
Visual: [descripción de qué se ve — para video-gen]
Emoción objetivo: [qué debe sentir el espectador]
Nota: [por qué este hook funciona según el framework elegido]

BEAT 2 — PAIN ([X]s) · [Fase: Problem/Interest]
Letra: "[texto cantado]"
Visual: [descripción]
Emoción objetivo: [empatía / reconocimiento]
Nota: [qué hace que este dolor sea específico, no genérico]

BEAT 3 — AGITATION ([X]s) · [Fase: Agitate/Interest profundo]
Letra: "[texto cantado]"
Visual: [descripción]
Emoción objetivo: [incomodidad que pide resolución]
Nota: [cómo es más intenso que el Beat 2]

BEAT 4 — DREAM ([X]s) · [Fase: Desire/Agitate sostenido]
Letra: "[texto cantado]"
Visual: [descripción — sin el producto todavía]
Emoción objetivo: [esperanza, anhelo]
Nota: [___]

BEAT 5 — BRIDGE ([X]s) · [Fase: Desire intermedio]
Letra: "[texto cantado]"
Visual: [descripción — momento de quiebre]
Emoción objetivo: [transición emocional]
Nota: [___]

BEAT 6 — SOLUTION ([X]s) · [Fase: Desire climax / Solution]
Letra: "[texto cantado — PRIMERA VEZ que aparece el producto]"
Visual: [descripción — el producto en acción]
Emoción objetivo: [alivio, reconocimiento de la salida]
Nota: [cómo se conecta directamente al dolor del Beat 2]

BEAT 7 — PROOF ([X]s) · [Fase: Desire validación / Solution + evidencia]
Letra: "[texto cantado — número, resultado, historia real]"
Visual: [descripción]
Emoción objetivo: [confianza, confirmación]
Nota: [qué hace que esta prueba sea creíble, no vaga]

BEAT 8 — TRANSFORMATION ([X]s) · [Fase: Desire cierre / Resultado]
Letra: "[texto cantado]"
Visual: [descripción — CONTRASTE con Beat 2]
Emoción objetivo: [aspiración realizada]
Nota: [cómo contrasta específicamente con el Beat 2]

BEAT 9 — CTA ([X]s) · [Fase: Action / Cierre]
Letra: "[texto cantado]"
Visual: [descripción — DEBE incluir CTA en pantalla: URL, @usuario o botón]
Emoción objetivo: [urgencia suave / acción clara]
Nota: [verbo + objeto + urgencia = fórmula del CTA]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LETRA COMPLETA (para Beatra):
[todos los versos en orden, salto de línea entre beats, SIN etiquetas de beat]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BRIEF DE PERSONAJE (para video-gen):
Nombre del personaje: ___
Edad aparente: ___
Rasgos físicos clave: ___
Vestimenta / estética: ___
Ambiente / mundo visual: ___
Paleta de colores: ___
```

---

## Gate de aprobación (OBLIGATORIA antes de continuar)

Después de entregar el guión, mostrar siempre:

```
📝 Guión [A] listo — confirmá antes de continuar

Framework: [el usado]
Palabras totales en letra: [N]
Duración estimada a [BPM] BPM: [X]s ✅ / ⚠️ ajustar
Vocabulario de marca usado: [listar 3-5 palabras/frases que vinieron de voice.examples]

¿Qué querés hacer?
a) Aprobar y continuar al pipeline completo
b) Editar beat [número] — decime qué cambiar
c) Cambiar el framework — [AIDA / PAS / Skeptic / HVO]
d) Ver 3 alternativas del Hook (A/B testing de hooks)
e) Generar variante B ahora (hook + agitation distintos, resto igual)
f) El tono no suena a mí — mostrarme qué voice.examples usé
```

**Si eligió A/B en el brief:** generar automáticamente variante B junto con la A.
La variante B siempre usa el mismo guión de Beats 2–9, solo cambia Beat 1 y Beat 3.

```
━━━━━━━━━━━━━━━━━  VARIANTE A  ━━━━━━━━━━━━━━━━━
BEAT 1 — HOOK: "[hook A — tipo: Positivo]"
BEAT 3 — AGITATION: "[agitation A]"

━━━━━━━━━━━━━━━━━  VARIANTE B  ━━━━━━━━━━━━━━━━━
BEAT 1 — HOOK: "[hook B — tipo distinto: Negativo / Pregunta / Escéptico]"
BEAT 3 — AGITATION: "[misma emoción, formulación diferente]"
```

**No avanzar hasta recibir respuesta.** Gate independiente de la confirmación de costo.

---

## Loop de regeneración inteligente

Cuando el usuario rechaza el guión, NO regenerar a ciegas.
Preguntar primero el tipo de falla:

```
❌ ¿Qué está fallando?
a) No suena a mí / no es mi voz → Volver a Paso 0b, pedir más voice.examples
b) El hook no engancha → Cambiar tipo de hook (Positivo→Negativo o Pregunta→Escéptico)
c) El ritmo no encaja al cantarlo → Ajustar sílabas — ¿qué BPM querés?
d) La solución aparece muy tarde → Avanzar el Beat 6 — ¿cuándo querés que entre?
e) El CTA es genérico → ¿Cuál es exactamente la acción que querés que hagan?
f) El dolor no es el mío / de mi audiencia → Describime el dolor real con tus palabras
g) Otro — describí qué está mal
```

Aplicar SOLO la corrección que corresponde. No reescribir todo.

---

## Prompt para Beatra

Una vez aprobado el guión:

```bash
npx skills add beatra-ai/lyrics-to-song-skill
```

Pasar a Beatra:
```
LETRA:
[letra completa del guión]

PARÁMETROS:
Género: [género del guión]
BPM: [BPM del guión]
Duración: [X]s
Mood: [tono del guión — en palabras concretas del brief, no inventadas]
Idioma: [idioma/dialecto de brand.json]
Instrucción extra: La letra tiene 9 secciones — mantener el tempo
parejo a través de todas. La sección 9 (CTA) debe terminar con
resolución musical, no un fade.
```

---

## Checklist de calidad antes de entregar

- [ ] Hook funciona en 3 palabras sin contexto previo
- [ ] Se usaron palabras/frases de `voice.examples` del cliente
- [ ] Beat 2 (Pain) nombra un dolor tan específico que el avatar piensa "me están espiando"
- [ ] Beat 3 (Agitation) es más intenso que Beat 2
- [ ] El producto NO aparece antes del Beat 6 (en AIDA/PAS/Skeptic)
- [ ] Beat 7 tiene algo concreto — número, resultado real, historia comprimida — NO "miles de personas"
- [ ] El CTA dice exactamente qué hacer (verbo + objeto + urgencia)
- [ ] Cada beat cabe en ≤ 4 segundos cantado al BPM elegido
- [ ] No hay adjetivos vacíos en ningún beat
- [ ] La Nota del Beat 1 explica el tipo de hook y por qué funciona para este framework
- [ ] La letra completa para Beatra está limpia (sin etiquetas de beat)
