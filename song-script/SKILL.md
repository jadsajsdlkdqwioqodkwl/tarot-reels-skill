---
name: song-script
description: >-
  Escribe el guión de una "historia cantada" para reels / anuncios de Meta Ads /
  TikTok, siguiendo la anatomía de 9 beats de un AI song ad. Produce letra lista
  para Beatra y brief de personaje listo para video-gen. Usar antes de generar
  audio o video.
compatibility: claude-code
version: 4.0.0
sources:
  - holy-templar/drama-song-ad (github.com/holy-templar/drama-song-ad) — reglas de escritura de guión cantado, anatomía de arco narrativo, géneros y reglas de letra.
  - NousResearch/hermes-agent skills/creative/songwriting-and-ai-music (github.com/nousresearch/hermes-agent) — craft de lyrics, prosodia, trucos fonéticos para IA cantante, estructura de canción.
  - robpalmer99/claude-code-copywriting-skills (github.com/robpalmer99/claude-code-copywriting-skills) — hooks, Story C, open loops, intrigue intensifiers, bucket brigades. $523M+ en ads rastreados.
  - ScaleAcademy/creative-strategist-skills (github.com/ScaleAcademy/creative-strategist-skills) — PAS, BAB, AIDA, Star-Story-Solution, OCR con ejemplos reales de campaña.
  - boringmarketer/direct-response-copy-gist (gist.github.com/boringmarketer, 104 estrellas) — Hormozi rhythm, pain quantification, founder story, social proof con números específicos.
  - coreyhaines31/marketingskills (github.com/coreyhaines31/marketingskills, 20K+ estrellas) — reglas anti-hook-slop, UGC scripts, CTA concreto. 43 skills de marketing.
  - krusemediallc/arcads-claude-code (github.com/krusemediallc/arcads-claude-code) — anatomía de 9 beats del AI song ad, pipeline UGC→video. Caleb "Mr. Paid Social", $150M+ en ad spend.
  - TheCraigHewitt/skills (github.com/TheCraigHewitt/skills) — hook formula 3 pasos, retención YouTube, anti-patterns de hooks.
  - yabasha/copywrite-skill (github.com/yabasha/copywrite-skill) — Schwartz awareness + Hopkins scientific advertising, CTA intensity por nivel.
  - jtydhr88/lyric-writing-skills (github.com/jtydhr88/lyric-writing-skills) — prosodia profesional, LYR-SPEC, Takayama Hiroshi y Taniguchi Naohisa.
  - shixinzhang/tiktok-viral-hooks (github.com/shixinzhang/tiktok-viral-hooks, actualizado diariamente) — biblioteca de hooks virales de TikTok, transcripts y fórmulas de 2 líneas.
---

# Song Script — Historia Cantada para Reels

## Propósito

Produce:
1. **Guión de 9 beats** con letra cantada + visual sugerido por beat
2. **Prompt de audio** para Beatra (`beatra-ai/lyrics-to-song-skill`)
3. **Brief de personaje** para el skill `video-gen`

> Este skill no tiene información predefinida de ningún negocio ni tono.
> Todos los datos vienen de `brand.json` + lo que el usuario provee en el brief.
> Los frameworks de copywriting son reales (ver sección FRAMEWORKS).

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
Para que el guión suene como tú y no como un bot, necesito ejemplos reales.

Pega 3-5 ejemplos de cómo te comunicas con tu audiencia:
  - Captions de posts que funcionaron
  - Frases que usas en stories
  - Mensajes de venta que ya enviaste
  - Respuestas a comentarios que generaron engagement
  - Cualquier texto que digas "sí, así soy yo"

(Si no tienes nada, escribe cómo le hablarías a una amiga que tiene el problema de tu cliente)
```

Cuando el usuario provea los ejemplos:
1. Extraer: vocabulario recurrente, longitud de frases, nivel de formalidad,
   palabras propias del nicho, expresiones que se repiten
2. Guardar en `brand.json → voice.examples[]` y `brand.json → voice.markers`
3. Usar esos marcadores en TODA la letra — no el vocabulario genérico del skill

```bash
node -e "
const fs = require('fs');
const b = JSON.parse(fs.readFileSync('brand.json', 'utf8'));
b.voice = b.voice || {};
b.voice.examples = [/* los ejemplos que dio el usuario */];
b.voice.markers = {/* extracto: palabras clave, nivel, tono */};
fs.writeFileSync('brand.json', JSON.stringify(b, null, 2));
console.log('Voice guardada en brand.json');
"
```

### 0c — Selector de personaje

Leer `brand.json → characters[]`. Mostrar siempre:

```
¿Qué personaje protagoniza este reel?

[Si hay personajes guardados]:
  a) [Nombre] — [descripción breve] ([listo / pendiente] character sheet)
  b) Nuevo perfil — describir ahora
  c) Sin personaje — voz en off / texto solo

[Si no hay ninguno]:
  a) Crear personaje ahora (nombre, género/edad, estética en 2 líneas)
  b) Sin personaje — solo voz y texto
```

### 0d — Brief del reel

Preguntar solo lo que brand.json no responde:

```
Brief para este reel
(Los campos con (ok) vienen de brand.json — confirma o cambia)

1. ¿Qué comunicamos en este reel?: ___
   (oferta puntual, dolor específico, temporada, lanzamiento)
2. Tono (ok) [el de brand.json]: ¿mismo o cambiar?
3. CTA (ok) [el de brand.json]: ¿mismo o cambiar?
4. Duración objetivo: [corto 25–35 s / largo 45–60 s]  (default: corto)
5. Género musical: [pop / trap / cumbia / reggaeton / electrónico / balada / otro]
6. Nivel de audiencia: [fría — no me conoce / tibia — me siguió / caliente — ya vio mis ads]
7. ¿Variante A/B?: [solo A / generar también hook alternativo para B]
```

**No escribir el guión hasta tener respuesta al punto 1.**

---

## Reglas de escritura de letra cantada (LEER ANTES DE ESCRIBIR)

> Fuente principal: holy-templar/drama-song-ad (github.com/holy-templar/drama-song-ad)
> y NousResearch/hermes-agent songwriting-and-ai-music (github.com/nousresearch/hermes-agent)

Estas reglas son las que separan una letra que convierte de una que suena a IA.

### Regla 1 — Sin rimas (la más importante)

**Las rimas hacen que el guión suene a jingle infantil o slam de marketing.**
No buscar rimas. Si aparecen dos líneas que riman por accidente, cambiar una.
Los slant rhymes (rimas imperfectas de consonante o vocal) están permitidos si
ocurren de forma natural; las rimas perfectas forzadas, nunca.

La excepción es si el género elegido es explícitamente un jingle corto (≤15 s).
En ese caso las rimas son el mecanismo, no el defecto.

### Regla 2 — Líneas cortas. Una idea. Parece un caption.

Cada línea: **una sola idea, idealmente menos de 8 palabras**.
Cada línea debe funcionar como una leyenda de foto o un caption.
Si una línea tiene dos ideas, dividirla en dos.

**Mal:** "Y fue entonces cuando me di cuenta de que todo lo que había intentado no había servido para nada"
**Bien:**
```
Tres años intentando lo mismo.
Nada funcionó.
```

### Regla 3 — Primera persona, pasado, un solo narrador

El avatar habla de su propia experiencia. Una sola voz.
Otros personajes solo aparecen como citas textuales dentro de la narración.
El narrador nunca rompe la cuarta pared para vender en los beats 1–8.

### Regla 4 — Especificidad sobre abstracción

Los detalles concretos construyen credibilidad. Los genéricos la destruyen.

**Mal:** "Me sentía muy mal todo el tiempo"
**Bien:** "Eran las 2 de la mañana. Otra vez sin dormir."

Usar: edades, años, tiempos, días, semanas, kilos, cifras reales.
Los objetos físicos cargan la emoción: un vestido que no cierra, una foto en el escritorio,
el teléfono en la mesa de noche. Los objetos que aparecen al inicio deben regresar.

### Regla 5 — El dolor lo dice otro, no el narrador

Cada punto doloroso se expresa como cita de otra persona, no como auto-análisis.
Esto hace que el avatar no suene como víctima sino como testigo.

**Mal:** "Me sentía invisible y poco valorada"
**Bien:** "Mi mejor amiga me dijo: 'siempre estás cansada. ¿Estás bien?'"

### Regla 6 — Sin metáforas, sin figuras de estilo

Lenguaje literal y cotidiano. Sin metáforas, sin imágenes poéticas.
Dos excepciones permitidas: (1) una palabra clave que va acumulando significado
secundario a lo largo de la letra, y (2) términos que explican el mecanismo del producto
usando analogías de fontanería o flujo ("bloqueado", "acumulado", "liberar").

### Regla 7 — El producto nunca aparece antes del Beat 6

El producto es la solución, no el tema. Si aparece antes, el espectador cierra el video.
En AIDA y PAS: primero el mentor (Beat 5), luego el producto (Beat 6).
En Skeptic: primero la rendición emocional (Beat 5), luego el objeto físico (Beat 6).

### Regla 8 — Líneas de quiebre entre secciones

Cada cambio de arco narrativo necesita una línea de transición explícita.
Ejemplo: "Fue entonces cuando mi hermana me llamó."
Estas líneas orientan al espectador dentro del arco sin que necesite ver la estructura.

### Regla 9 — Sílabas y tempo

La letra debe poder cantarse al BPM elegido sin atropellar ni elongar artificialmente.
Referencia de velocidad de canto (fuente: holy-templar/drama-song-ad):

| Tempo | Palabras por segundo |
|-------|---------------------|
| Lento (70–85 BPM, balada, soul) | ~1.8 palabras/s |
| Medio (90–115 BPM, pop, country) | ~2.2 palabras/s |
| Rápido (120–140 BPM, trap, reggaeton) | ~2.5 palabras/s |

**Géneros donde las palabras se escuchan bien** (recomendados para ads):
Soul / R&B balada · Country / country-pop · Gospel · Acústico / singer-songwriter

**Géneros donde las palabras se pierden** (evitar para ads):
Dance-pop · House · EDM · K-pop · Reggaeton muy rápido

### Regla 10 — Trucos fonéticos para IA cantante

Cuando la letra va a Beatra u otra IA de canto, aplicar:

- **Nombres propios y palabras inusuales**: escribir la pronunciación fonética
  (Ej: "Sephora" → "Se-fo-ra", "Oura" → "Au-ra")
- **Mayúsculas** = mayor énfasis e intensidad en esa sílaba
- **Vocales extendidas**: "no-o-o" = melisma sostenido
- **Puntos suspensivos**: "no sé... qué hacer" = pausa dramática
- **Números**: siempre como palabras ("24" → "veinticuatro")
- **Acrónimos**: separarlos ("IA" → "i-a")
- Los números entran bien en el ritmo cuando se cantan como palabras.

### Regla 11 — Prosodia: que la música y la letra se apoyen

(Fuente: NousResearch/hermes-agent songwriting-and-ai-music)

Las emociones estables (resolución, paz, confianza) van mejor con melodías
asentadas, acordes resueltos, y patrones rítmicos regulares.
Las emociones inestables (duda, angustia, esperanza) van mejor con melodías
que no resuelven, acordes suspendidos, y variaciones en el ritmo.

Los versos (beats 1–5) típicamente se cantan en registro más bajo.
El clímax emocional (beats 6–8) típicamente sube al registro alto.
Si el género es balada, el Beat 9 (CTA) puede bajar de nuevo — cierre íntimo.

### Regla 12 — El CTA es una invitación, no un grito

El CTA final usa:
- Verbo + objeto + urgencia suave
- Evitar "¡No te lo pierdas!" o "¡Aprovecha ahora!" — son spam auditivo
- La urgencia viene de escasez o deadline real, no de exclamaciones

---

## Frameworks de copywriting

> Fuente: TikAdSuite "TikTok Ad Copywriting Formulas" (2026),
> Hooked.so "Crafting a High-Converting Script" (2026),
> ShortGenius.com "8 Powerful Ad Script Frameworks" (2026).

### Selector de framework según nivel de audiencia

| Audiencia | Framework | Por qué |
|-----------|-----------|---------|
| Fría (nunca oyó del producto) | **AIDA** o **HVO** | Necesitan construir desde cero |
| Tibia (siguió, vio contenido) | **PAS** | Ya sienten el dolor, necesitan agitación y solución |
| Caliente (vio ads, no convirtió) | **Skeptic Script** | El escepticismo es su estado — liderarlo con duda, no con promesas |
| Cualquier nivel | **Hook Formula** | El hook es obligatorio en todos los frameworks |

---

### FRAMEWORK 1 — AIDA (Attention → Interest → Desire → Action)

**Origen:** Elias St. Elmo Lewis, 1898. El más documentado en publicidad.
**Usar cuando:** audiencia fría, lanzamientos nuevos, primer contacto.

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

**Regla de oro de AIDA para song ads:** Los beats 4–8 deben sonar como la canción
de la vida que el avatar quiere vivir, no como un argumento de venta.

---

### FRAMEWORK 2 — PAS (Problem → Agitate → Solution)

**Origen:** Documentado en direct response copywriting clásico.
**Usar cuando:** audiencia tibia, productos de dolor alto, retargeting.

| Beat | Fase PAS | Función en canción |
|------|----------|-------------------|
| 1 Hook | Entrada al **Problem** | El hook nombra el dolor directamente — sin contexto |
| 2 Pain | **Problem** completo | "Eso me pasa a mí exactamente" |
| 3 Agitation | **Agitate** | "Y lo peor es que..." — eleva las consecuencias |
| 4–5 | **Agitate** sostenido | Mostrar el costo emocional o práctico de no resolver |
| 6 Solution | **Solution** | Aparece el producto como la salida |
| 7 Proof | **Solution** + evidencia | Cierra el escepticismo |
| 8 Transformation | Resultado del **Solution** | El antes vs. el ahora |
| 9 CTA | Cierre de **Solution** | Qué hacer para obtener la solución |

**Regla de oro de PAS:** Los beats 2 y 3 son los que más duelen.
Deben ser tan específicos que el avatar piense "alguien me está espiando".
Evitar el dolor genérico ("te sientes mal") e ir al dolor concreto
("son las 2 de la mañana y sigues en el teléfono sin poder dormir").

---

### FRAMEWORK 3 — Skeptic Script

**Origen:** Documentado por TikAdSuite como el framework de mayor conversión en
audiencias saturadas que ya vieron otras soluciones.
**Usar cuando:** audiencia caliente / retargeting, mercado con muchas promesas similares.

Estructura del arco: Skepticism → Reluctant Trial → Undeniable Proof

| Beat | Arco Skeptic | Función en canción |
|------|-------------|-------------------|
| 1 Hook | **Escepticismo del avatar** | El hook ES la duda: "Yo tampoco lo creía..." / "Ya probé todo..." |
| 2 Pain | El pasado fallido | Lo que no funcionó antes — específico, no vago |
| 3 Agitation | El peso del escepticismo | "Ya gasté dinero, ya perdí tiempo, ya no confío en nada" |
| 4 Dream | La tentación a pesar de todo | Un último intento — casi resignado |
| 5 Bridge | El quiebre | El momento en que algo diferente pasó |
| 6 Solution | La rendición ante la evidencia | "Tuve que admitir que funcionó" |
| 7 Proof | Prueba reluctante | "No lo digo yo — lo dice el resultado" |
| 8 Transformation | "Estaba equivocado/a" | La admisión honesta de que cambió |
| 9 CTA | Invitación al escéptico | "Si no lo crees, lo entiendo. Igual mira esto." |

**Regla de oro del Skeptic Script:** Nunca eliminar el escepticismo — usarlo.
La voz del personaje ES la voz del avatar dubitativo. No convertir el hook
en una promesa — debe sonar a rendición honesta, no a pitch.

---

### FRAMEWORK 4 — HVO (Hook → Value → Offer)

**Origen:** Documentado en TikAdSuite para flash sales y productos de impulso.
**Usar cuando:** oferta puntual, urgencia real, audiencia lista para comprar.

| Beat | Fase HVO | Función en canción |
|------|----------|-------------------|
| 1–2 | **Hook** fuerte | Detiene el scroll + establece relevancia |
| 3–4 | **Value** rápido | Entrega algo útil / sorprendente antes de pedir nada |
| 5–6 | **Value** → **Offer** | La transición directa a la oferta |
| 7–8 | **Offer** + prueba | La oferta específica con validación |
| 9 | **Offer** cierre | CTA con urgencia real (deadline o escasez concreta) |

**Regla de oro del HVO:** El Value es lo que diferencia este framework de un
pitch directo. Hay que dar algo (información, revelación, emoción) ANTES de pedir.
Si los beats 3–4 no entregan valor real, el framework no funciona.

---

### Hook Formula — Tipos de hook por objetivo

**Fuentes reales (Claude solo siguió estos formatos — no los inventó):**
- `robpalmer99/claude-code-copywriting-skills` — Rob Palmer, $523M+ rastreados
- `ScaleAcademy/creative-strategist-skills` — ad-formulas.md
- `boringmarketer` gist — direct-response-copy-gist.md (104 estrellas, 31 forks)
- `coreyhaines31/marketingskills` — skills/ad-creative/SKILL.md (20K+ estrellas)
- `TheCraigHewitt/skills` — youtube/hook-writing/SKILL.md

#### Hook Positivo — Resultado + Tiempo + Calificador
Estructura: `[Resultado específico] en [tiempo concreto] [elemento inesperado]`

Ejemplos reales (fuente: `robpalmer99/claude-code-copywriting-skills`):
- *"I lost 23 lbs in 8 weeks without giving up pizza."*
- *"Over 47,000 women have tried this 30-second trick..."*

Patrón: **número** + **tiempo específico** + **sin el sacrificio típico**. Nada de adjetivos.

Usar cuando: el producto tiene resultado visible, medible y rápido.

#### Hook Negativo — Contrarian / Pattern Interrupt
Estructura: `[Creencia universal] + [refutación con consecuencia concreta]`

Ejemplos reales (fuente: `robpalmer99/claude-code-copywriting-skills`):
- *"Everything you've been told about _____ is wrong."*

Ejemplos reales (fuente: `TheCraigHewitt/skills`, hook-writing SKILL.md):
- *"Everyone says you need to hire to scale. I just deleted three roles from my org chart."*
- *"Every YouTube coach will tell you to post 3 times a week. That advice nearly killed my channel."*
- *"Turns out, the conventional wisdom is completely wrong."*

Patrón: consejo muy dado → contraejemplo concreto del narrador. No "la gente dice X" — "todos dicen X, yo hice Y".

Usar cuando: el avatar usa soluciones alternativas que no funcionan.

#### Hook de Pregunta / Curiosity Gap
Estructura: afirmación con número que abre un loop que solo se cierra viendo el video entero.

Ejemplos reales (fuente: `robpalmer99/claude-code-copywriting-skills`):
- *"I tested 47 headlines. One pattern beat everything else by 3x."*
  (No es pregunta — número + resultado parcial = loop forzado.)

Ejemplos reales (fuente: `ScaleAcademy/creative-strategist-skills`, ad-formulas.md):
- *"47 seconds. That's how long you have before your prospect's attention is gone."*
  (Número inesperado + consecuencia = loop sin pregunta explícita.)

Regla de `coreyhaines31/marketingskills` (anti hook-slop):
- ❌ *"Here's what nobody tells you about X."* — demasiado genérico
- ❌ *"Stop scrolling."* — sobre-usado, no funciona
- ✅ Gana la atención con algo específico al espectador. *"POV: it's 3pm and you're on your fourth coffee."*

Usar cuando: el avatar ya siente el problema pero no sabe que existe la solución.

#### Hook Escéptico (para Skeptic Script)
Estructura: `[Estado de rendición total]` — mostrar el estado, no explicarlo.

Ejemplos reales (fuente: `robpalmer99/claude-code-copywriting-skills`, estructura Story C):
- *"Six months ago, I couldn't even look at myself in the mirror."*
- *"I tried everything — diets, trainers, supplements. Nothing worked."*

Ejemplos reales (fuente: `TheCraigHewitt/skills`, hook-writing SKILL.md):
- *"Last Tuesday I almost pulled the plug on a product we'd spent 6 months building."*
  (Momento de tensión en fecha específica = credibilidad total.)

Patrón: no "yo dudaba" — el resultado de dudar durante meses, en una sola línea.

Usar cuando: audiencia caliente que ya vio promesas similares.

---

## Técnicas battle-tested — extraídas de 10+ repos reales

> Claude solo siguió estos ejemplos — no los inventó.
> Los ejemplos en inglés aplican la misma lógica en español.

---

### Story C — El arco de 4 líneas que más convierte
Fuente: `robpalmer99/claude-code-copywriting-skills` ($523M+ rastreados)

El arco más probado para ads de 30–45 segundos:

```
"Six months ago, I couldn't even look at myself in the mirror."      ← estado de rendición (hook)
"I tried everything — diets, trainers, supplements. Nothing worked." ← pasado fallido (Beat 2–3)
"Then my sister sent me this weird article about..."                  ← quiebre / bridge (Beat 5)
"In 8 weeks, I dropped 23 lbs. My husband noticed in the first 2 weeks." ← transformación (Beat 7–8)
```

Por qué funciona: (1) credibilidad sin pedirla, (2) "nothing worked" = escepticismo del avatar, (3) "my sister" = tercer personaje real (Regla 5), (4) resultado tiene número Y testigo.

---

### Open Loops — Cómo mantener la atención entre beats
Fuente: `robpalmer99/claude-code-copywriting-skills`

Abrir un loop al inicio de un beat y cerrarlo 2–3 beats después:
- *"I tested 47 headlines. One pattern beat everything else by 3x."*
  (El loop: ¿cuál es el patrón? No se cierra hasta el Beat 7.)
- *"There's a reason your doctor won't tell you about this..."*
  (El loop: ¿por qué no? Se cierra en el Beat 6.)

Regla: no abrir más de 1 loop por vez. Un loop abierto = razón para seguir; dos = confusión.

---

### Intrigue Intensifiers — Hacer el producto irresistible sin exagerar
Fuente: `robpalmer99/claude-code-copywriting-skills`

Detalles específicos que hacen lo ordinario parecer extraordinario:
- *"It's 150 million years old."*
- *"It's smaller than a nickel."*
- *"Harvard announced it only last week."*

Aplicar en Beat 6–7: el producto no es "natural y efectivo" — es [detalle concreto que lo hace único].

---

### Bucket Brigades — Transiciones que evitan el skip
Fuente: `robpalmer99/claude-code-copywriting-skills`

Frases cortas al inicio de un beat que fuerzan a seguir escuchando:
- *"But here's the thing..."*
- *"Here's what I discovered..."*
- *"This is where it gets interesting..."*
- *"Wait, it gets better..."*
- *"And that's not even the best part..."*
- *"Now here's what nobody tells you..."*
- *"Which brings me to the real secret..."*

Usar entre beats 3→4, 5→6, 7→8.

---

### Tell Them What It's NOT — Anticipa el escepticismo
Fuente: `robpalmer99/claude-code-copywriting-skills`

Antes de decir qué es la solución, decir qué NO es. Elimina objeciones antes de que aparezcan:
- *"It's not a diet... not a supplement... not exercise... not willpower..."*

Cada "no" elimina una objeción. La lista crea suspenso — el "then what is it?" jala al Beat 6.
Usar en Beat 5 (Bridge) cuando la audiencia es caliente/escéptica.

---

### Pain Quantification — Convertir frustración vaga en número concreto
Fuente: `boringmarketer/direct-response-copy-gist` (104 estrellas, 31 forks)

En vez de decir "es muy complicado", cuantificar el dolor:
- *"4 hrs to set up emails + 6 hrs designing a landing page + 4 hrs to handle Stripe webhooks + 2 hrs for SEO tags + ∞ hrs overthinking... = 22+ hours of headaches."*

En Beats 2–3: el dolor no es "tarda mucho" — es "X horas + Y horas + Z = [total] de tiempo perdido".

---

### Hormozi Rhythm — Corto + Largo + Corto
Fuente: `boringmarketer/direct-response-copy-gist`, adaptado de Alex Hormozi

El copy que más convierte alterna longitud de líneas:
- *"Customers do NOT buy code. Customers buy a life transformation."*
  (Corto: impacto. Largo: contexto. Corto: el remate.)

Aplicar en beats 1→2 y 7→8: no escribir dos líneas del mismo largo seguidas.

---

### Context Lean-In → Scroll-Stop → Contrarian Snapback
Fuente: `TheCraigHewitt/skills`, hook-writing SKILL.md (47 skills, 7 meses activo)

| Paso | Duración | Función | Ejemplo real |
|------|----------|---------|-------------|
| **Context Lean-In** | 2–5 s | "Me identifico" | *"Last month I was spending 8 hours a week on reports."* |
| **Scroll-Stop** | 3–8 s | "¿Qué?" (momento inesperado) | *"So I replaced the entire process with one AI agent."* |
| **Contrarian Snapback** | 5–15 s | "Por qué este video es diferente" | *"But here's what nobody tells you about this approach — and it nearly cost me $50K."* |

---

### PAS en acción — Ejemplo completo de ad real
Fuente: `ScaleAcademy/creative-strategist-skills`, ad-formulas.md

```
"You spend 3 hours briefing ads that nobody watches past second 2."           ← Problem (Beat 1–2)
"Every week, same cycle — brief, produce, launch, fail.
 Your budget bleeds while your competitors scale."                             ← Agitation (Beat 3)
"This creative testing system eliminates guesswork."                           ← Solution (Beat 6)
```

---

### AIDA en acción — Ejemplo completo de ad real
Fuente: `ScaleAcademy/creative-strategist-skills`, ad-formulas.md

```
"47 seconds. That's how long you have before your prospect's attention is gone."  ← Attention (Beat 1)
"We tested 2,000 hooks across 140 brands. The pattern that emerged
 will change how you write ads."                                                    ← Interest (Beat 2–3)
"Imagine knowing, before you spend a euro, which hook will stop the scroll."        ← Desire (Beat 4–5)
"Get the framework. Link in bio."                                                    ← Action (Beat 9)
```

---

### Star-Story-Solution — Para founder stories y testimonios
Fuente: `ScaleAcademy/creative-strategist-skills`, ad-formulas.md

```
"2 years ago, I was a freelance media buyer burning out on 6 clients."    ← Star (personaje + contexto)
"I was working 60-hour weeks, manually testing creatives, and still
 losing to agencies with bigger budgets. Then I discovered something:
 the problem wasn't my budget — it was my creative process."               ← Story (problema + quiebre)
"I built a system that tests hypotheses, not guesses. Today I manage
 half the clients at 3x the results."                                      ← Solution (transformación)
```

---

### OCR — Para manejar objeciones en el CTA
Fuente: `ScaleAcademy/creative-strategist-skills`, ad-formulas.md

Usar en Beat 9 (CTA) cuando la audiencia es caliente:

```
"I don't have time to test 10 creatives a week."                       ← Objection (la más común)
"Neither did we — until we built a system that turns
 one brief into 5 variations in 20 minutes."                            ← Counter
"Time isn't the problem. Process is. And now you have one."             ← Resolution
```

---

### Schwartz Awareness → Intensidad del CTA
Fuente: `yabasha/copywrite-skill`, Schwartz awareness levels

| Nivel de audiencia | El avatar sabe | Intensidad del CTA |
|--------------------|---------------|-------------------|
| Unaware | Nada del problema | Sin CTA / CTA suave |
| Problem-Aware | El dolor | Educacional — "descubre por qué..." |
| Solution-Aware | Existen soluciones | Baja — "conoce este método..." |
| Product-Aware | Tu producto específico | Media — "empieza hoy..." |
| Most Aware | Te conoce y confía | Directa — "compra ahora / únete" |

El CTA de un ad de audiencia fría **NO puede ser "compra ahora"** — no llega a ese nivel todavía.

---

### Anti hook-slop — Lo que coreyhaines31 llama "slop"
Fuente: `coreyhaines31/marketingskills`, skills/ad-creative/SKILL.md (20K+ estrellas)

Hooks demasiado genéricos — cualquier producto los podría usar:
- ❌ *"POV: [situación genérica]"* — solo funciona si la situación es hiper-específica
- ❌ *"Stop scrolling."* — todo el mundo lo usa
- ❌ *"Here's what nobody tells you about X."* — sobre-usado en 2024–2026
- ❌ CTAs genéricos: *"Get started today"* / *"Join thousands of happy customers."*

Regla: **gana el próximo segundo con algo específico al espectador**.
✅ *"POV: it's 3pm and you're on your fourth coffee."* — funciona porque es hiper-específico.
✅ El CTA nombra la acción Y lo que obtienen: no "aprende más", sino "descarga la guía de 7 días".

---

## Checklist pre-escritura (ANTES de generar la letra)

Antes de escribir el primer beat, completar:

1. ¿Tengo `voice.examples` o `voice.markers` del cliente? (Si no, pedir en Paso 0b)
2. ¿Elegí el framework correcto según el nivel de audiencia?
3. ¿Sé cuál es el tipo de hook que voy a usar?
4. ¿Sé el dolor específico del avatar (no el genérico)?
5. ¿Tengo evidencia concreta para el Beat 7 (número, resultado, historia)?

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

## Reglas de letra — resumen rápido

### Qué convierte

- **Sin rimas** — las rimas suenan a jingle o marketing barato (Regla 1, CRÍTICA)
- **Líneas cortas** — una idea por línea, ≤8 palabras, como un caption (Regla 2)
- **Especificidad numérica:** "11 días" supera "rápido" siempre
- **Primera persona del avatar:** "No sé qué hacer" vs. "muchas personas no saben"
- **Gancho en 3 palabras:** Las primeras 3 palabras deben funcionar solas
- **Voz de marca real:** Usar el vocabulario de `brand.json → voice.markers`, NO el genérico
- **Concreción sobre abstracción:** "son las 2am mirando el techo" > "la incertidumbre me consume"
- **Ritmo natural al BPM:** cada beat debe caber en ≤ 4 segundos cantado
- **Prosodia:** la emoción del beat y el género musical deben apoyarse mutuamente

### Qué destruye el copy

- ❌ **Rimas perfectas** — el mayor saboteador de ads cantados
- ❌ Adjetivos vacíos: "increíble", "asombroso", "poderoso", "transformador"
- ❌ Clichés de bienestar: "tu mejor versión", "el universo conspira"
- ❌ Mencionar el producto antes del Beat 5 (en AIDA/PAS) o Beat 6 (en Skeptic)
- ❌ CTAs genéricos: "no te lo pierdas", "aprovecha esta oportunidad"
- ❌ Rimas forzadas que cambian el significado
- ❌ Vocabulario que no viene de los `voice.examples` del cliente
- ❌ Líneas largas que no caben en ≤ 4 segundos cantados

### Tabla de sílabas por BPM

| BPM | Sílabas por beat de 3s | Sílabas por beat de 4s |
|-----|----------------------|----------------------|
| 100 | 8–10 | 10–13 |
| 120 | 10–12 | 13–16 |
| 140 | 12–14 | 15–19 |
| 160 | 14–16 | 18–22 |

---

## Formato de salida del guión

Usar EXACTAMENTE este formato — `video-gen` y `reels-editor` lo consumen así:

```
HISTORIA CANTADA — [NOMBRE DEL NEGOCIO]
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

## Gate de aprobación (OBLIGATORIO antes de continuar)

Después de entregar el guión, mostrar siempre:

```
Guión [A] listo — confirma antes de continuar

Framework: [el usado]
Palabras totales en letra: [N]
Duración estimada a [BPM] BPM: [X]s
Vocabulario de marca usado: [listar 3-5 palabras/frases que vinieron de voice.examples]

¿Qué quieres hacer?
a) Aprobar y continuar al pipeline completo
b) Editar beat [número] — dime qué cambiar
c) Cambiar el framework — [AIDA / PAS / Skeptic / HVO]
d) Ver 3 alternativas del Hook (A/B testing de hooks)
e) Generar variante B ahora (hook + agitation distintos, resto igual)
f) El tono no suena a mí — muéstrame qué voice.examples usé
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

**No avanzar hasta recibir respuesta.**

---

## Loop de regeneración inteligente

Cuando el usuario rechaza el guión, NO regenerar a ciegas.
Preguntar primero el tipo de falla:

```
¿Qué está fallando?
a) No suena a mí / no es mi voz → Volver a Paso 0b, pedir más voice.examples
b) El hook no engancha → Cambiar tipo de hook (Positivo→Negativo o Pregunta→Escéptico)
c) El ritmo no encaja al cantarlo → Ajustar sílabas — ¿qué BPM quieres?
d) La solución aparece muy tarde → Avanzar el Beat 6 — ¿cuándo quieres que entre?
e) El CTA es genérico → ¿Cuál es exactamente la acción que quieres que hagan?
f) El dolor no es el mío / de mi audiencia → Describe el dolor real con tus palabras
g) Suena a rimas / suena a jingle → Reescribir todos los beats evitando rimas
h) Otro — describe qué está mal
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
- [ ] La letra NO tiene rimas perfectas (solo slant rhymes accidentales permitidos)
- [ ] Cada línea tiene una sola idea y ≤8 palabras
- [ ] Beat 2 (Pain) nombra un dolor tan específico que el avatar piensa "me están espiando"
- [ ] Beat 3 (Agitation) es más intenso que Beat 2
- [ ] Los dolores están expresados como citas de otras personas, no como auto-análisis
- [ ] El producto NO aparece antes del Beat 6 (en AIDA/PAS/Skeptic)
- [ ] Beat 7 tiene algo concreto — número, resultado real, historia comprimida — NO "miles de personas"
- [ ] El CTA dice exactamente qué hacer (verbo + objeto + urgencia)
- [ ] Cada beat cabe en ≤ 4 segundos cantado al BPM elegido
- [ ] No hay adjetivos vacíos en ningún beat
- [ ] La Nota del Beat 1 explica el tipo de hook y por qué funciona para este framework
- [ ] La letra completa para Beatra está limpia (sin etiquetas de beat)
- [ ] Los nombres propios o términos difíciles tienen guía fonética si van a Beatra
