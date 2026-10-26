---
name: song-script
description: >-
  Escribe el guión de una "historia cantada" para reels / anuncios de Meta Ads /
  TikTok, siguiendo la anatomía de 9 beats de un AI song ad. Produce letra lista
  para Beatra y brief de personaje listo para video-gen. Usar antes de generar
  audio o video.
compatibility: claude-code
version: 2.0.0
---

# Song Script — Historia Cantada para Reels

## Propósito

Produce:
1. **Guión de 9 beats** con letra cantada + visual sugerido por beat
2. **Prompt de audio** para Beatra (`beatra-ai/lyrics-to-song-skill`)
3. **Brief de personaje** para el skill `video-gen`

> ℹ️ **Sobre el negocio:** No hay información hardcodeada de ningún negocio en esta skill.
> El usuario proveerá todos los datos de su marca al invocar el skill.

---

## Paso 0 — Capturar el brief (SIEMPRE preguntar primero)

### 0a — Leer brand.json si existe

```bash
cat brand.json 2>/dev/null || echo "NO BRAND FILE"
```

Si existe: los campos `brandName`, `audience.pain`, `audience.transformation`, `tone`, `cta`, `dialect` son los defaults del brief. **No volver a preguntar lo que ya está ahí.**

### 0b — Selector de personaje

Leer `brand.json → characters[]`. Mostrar siempre:

```
🎭 ¿Qué personaje protagoniza este reel?

[si hay personajes guardados]:
  a) Luna — mujer mística 28-35 (✅ disponible)
  b) Nuevo perfil — describir ahora
  c) Sin personaje — voz en off / texto solo

[si no hay ninguno]:
  a) Crear personaje ahora (nombre, género/edad, estética en 2 líneas)
  b) Sin personaje — solo voz y texto
```

El personaje elegido va al **BRIEF DE PERSONAJE** del output para que `video-gen` lo reciba directamente.

### 0c — Brief del reel

Preguntar solo lo que brand.json no responde:

```
📋 Brief para este reel
(Los campos con ✓ vienen de brand.json — solo confirmalos o cambialos)

1. ¿Qué comunicamos en este reel?: ___
   (puede ser una oferta puntual, un dolor específico, una temporada)
2. Tono ✓ [el de brand.json]: ¿mismo o cambiar?
3. CTA ✓ [el de brand.json]: ¿mismo o cambiar?
4. Duración: [corto 25–35 s / largo 45–60 s]  (default: corto)
5. Género musical: [pop / trap / cumbia / reggaeton / electrónico / balada / otro]
6. ¿Variante A/B? [solo A / sí, generar hook alternativo para B]
```

**No escribir el guión hasta tener respuesta al punto 1.**

---

## La anatomía de un AI Song Ad — 9 beats

| # | Beat | Duración | Función | Pregunta clave |
|---|------|----------|---------|----------------|
| 1 | **Hook** | 2–3 s | Para el scroll. Pregunta o afirmación impactante sin contexto previo | ¿Esto me detiene aunque no sepa nada del producto? |
| 2 | **Pain** | 3–4 s | Nombra el dolor exacto del avatar. Empatía inmediata | ¿El avatar dice "eso me pasa a mí"? |
| 3 | **Agitation** | 2–3 s | Intensifica el dolor. "Y lo peor es que…" | ¿Duele más que el beat anterior? |
| 4 | **Dream** | 2–3 s | El mundo ideal. Lo que el avatar realmente quiere | ¿Se puede visualizar claramente? |
| 5 | **Bridge** | 1–2 s | Conecta el sueño con la solución. Transición musical | ¿Existe una lógica natural hacia la solución? |
| 6 | **Solution** | 3–4 s | Presenta el producto/servicio. Antes vs después | ¿Queda claro QUÉ es y QUÉ hace? |
| 7 | **Proof** | 2–3 s | Evidencia concreta: número, resultado, testimonio comprimido | ¿Hay algo específico, no solo "miles de personas"? |
| 8 | **Transformation** | 2–3 s | El avatar YA tiene la vida soñada gracias a la solución | ¿Contrasta visiblemente con el Beat 2? |
| 9 | **CTA** | 2–3 s | Invitación directa con urgencia suave | ¿Dice exactamente qué hacer ahora? |

**Duración total:** 25–35 s (corto) o 45–60 s (largo)

---

## Reglas de letra (battle-tested)

### Lo que funciona
- **Concreción sobre abstracción:** "no sé si acepto el trabajo" > "la incertidumbre me consume"
- **Primera persona del avatar:** "No sé qué hacer" > "muchas personas no saben qué hacer"
- **Imágenes sensoriales:** describe lo que se ve, huele, siente — no solo emociones
- **Gancho en 3 palabras:** las primeras 3 palabras del Hook deben funcionar solas
- **Ritmo natural:** cada beat debe poder cantarse en ≤ 4 segundos (~10–14 sílabas a 140 BPM)
- **Rima cuando fluye:** si la rima se siente forzada, no rimar es mejor

### Lo que destruye el copy
- ❌ Adjetivos vacíos: "increíble", "asombroso", "transformador", "poderoso"
- ❌ Clichés de bienestar: "tu mejor versión", "el universo conspira", "energía positiva"
- ❌ Hablar del producto antes del Beat 5
- ❌ CTAs genéricos: "no te lo pierdas", "aprovecha esta oportunidad"
- ❌ Rimas que cambian el significado de la frase para encajar

### Tabla de sílabas por BPM (referencia)

| BPM | Sílabas por beat de 3s | Sílabas por beat de 4s |
|-----|----------------------|----------------------|
| 100 | 8–10 | 10–13 |
| 120 | 10–12 | 13–16 |
| 140 | 12–14 | 15–19 |
| 160 | 14–16 | 18–22 |

---

## Fórmulas por tono

### Tono MÍSTICO / ESPIRITUAL
```
Hook:       "[Pregunta que asume poderes ocultos o conocimiento vetado]"
Pain:       "[Sensación de estar perdido/a, sin dirección, en oscuridad]"
Agitation:  "[Cada decisión equivocada tiene un costo concreto]"
Dream:      "[Claridad, certeza, saber exactamente qué camino tomar]"
Bridge:     "[Las respuestas ya existen — solo hay que saber leerlas]"
Solution:   "[Herramienta/servicio que revela lo que estaba oculto]"
Proof:      "[Número de personas / resultados concretos obtenidos]"
Transform.: "[El avatar actúa con confianza, sin dudas]"
CTA:        "[Verbo de acción + objeto + urgencia temporal suave]"
```

**Palabras que funcionan en este tono:** revelar, descubrir, claridad, guía, señal, camino, mensaje, universo, respuesta, certeza  
**Palabras a evitar:** magia, brujería, hechizo, predicción (a menos que el producto lo sea explícitamente)

### Tono EMPODERADOR / TRANSFORMACIÓN
```
Hook:       "[Afirmación disruptiva que desafía la narrativa del avatar]"
Pain:       "[Esfuerzo sin resultados / trabajo duro que no avanza]"
Agitation:  "[El tiempo pasa y la brecha crece]"
Dream:      "[Logro específico: número, título, estado]"
Bridge:     "[La diferencia no es el esfuerzo — es el método]"
Solution:   "[Sistema / método / herramienta concreta]"
Proof:      "[Resultado medible con tiempo específico]"
Transform.: "[El avatar en el estado deseado, haciendo lo que soñaba]"
CTA:        "[Verbo + promesa de velocidad + acción específica]"
```

**Palabras que funcionan:** sistema, método, resultado, en X días, comprobado, exactamente, paso a paso  
**Palabras a evitar:** fácil (suena falso), instantáneo (genera escepticismo), secreto (gastado)

### Tono ÍNTIMO / CONFESIONAL
```
Hook:       "[Confesión que el avatar nunca diría en voz alta]"
Pain:       "[Momento específico de vergüenza, miedo o soledad]"
Agitation:  "[Nadie lo entiende / lo seguís cargando solo/a]"
Dream:      "[Ser comprendido/a, ya no tener que esconderlo]"
Bridge:     "[Hay un lugar / alguien que sí entiende]"
Solution:   "[Comunidad / servicio / guía que valida la experiencia]"
Proof:      "[Historia comprimida de alguien similar]"
Transform.: "[El avatar sintiéndose acompañado y comprendido]"
CTA:        "[Invitación suave, sin presión, "cuando estés listo/a"]"
```

**Palabras que funcionan:** solo/a, nadie, por fin, entender, acompañar, cargás, secreto  
**Palabras a evitar:** comunidad (suena corporativo), apoyo emocional (muy clínico)

### Tono URGENTE / ESCASEZ
```
Hook:       "[Dato o realidad que asusta / despierta]"
Pain:       "[Lo que se está perdiendo mientras espera]"
Agitation:  "[El costo de no actuar hoy — en términos concretos]"
Dream:      "[La oportunidad todavía existe... pero no para siempre]"
Bridge:     "[La ventana está abierta — pero se cierra]"
Solution:   "[Oferta / acceso / herramienta disponible ahora]"
Proof:      "[Cuántos ya lo tomaron / quedan X lugares]"
Transform.: "[Los que actuaron ya tienen resultados]"
CTA:        "[Verbo de acción + deadline o escasez concreta]"
```

**Palabras que funcionan:** hoy, solo X lugares, últimas horas, ya, todavía, antes de  
**Palabras a evitar:** oferta limitada (desgastado), ¡APURATE! (agresivo)

---

## Formato de salida del guión

Usar EXACTAMENTE este formato — el skill `video-gen` lo consume así:

```
🎵 HISTORIA CANTADA — [NOMBRE DEL NEGOCIO]
Tono: [tono elegido]
Género musical: [género]
BPM sugerido: [número]
Duración total estimada: [X] s
Ratio de exportación: [9:16 / 4:5]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEAT 1 — HOOK ([X]s)
Letra: "[texto cantado]"
Visual: [descripción de qué se ve — para el prompt de video]
Emoción objetivo: [qué debe sentir el espectador]
Nota: [razón por la que funciona este hook — o advertencia si hay riesgo]

BEAT 2 — PAIN ([X]s)
Letra: "[texto cantado]"
Visual: [descripción]
Emoción objetivo: [empatía / reconocimiento]
Nota: [___]

[... beats 3–8 con la misma estructura ...]

BEAT 9 — CTA ([X]s)
Letra: "[texto cantado]"
Visual: [descripción — DEBE incluir el CTA en pantalla: URL, @usuario, o botón]
Emoción objetivo: [urgencia suave / esperanza / acción]
Nota: [___]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LETRA COMPLETA (para Beatra):
[todos los versos en orden, salto de línea entre beats, sin etiquetas de beat]

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

## Gate de aprobación (OBLIGATORIA)

Después de entregar el guión, mostrar siempre:

```
📝 Guión A listo — confirmá antes de continuar

Palabras totales en letra: [N]
Duración estimada cantada a [BPM] BPM: [X]s ✅ / ⚠️ ajustar

¿Qué querés hacer?
a) Aprobar y continuar al pipeline completo
b) Editar beat [número] — decime qué cambiar
c) Reescribir completo con otra dirección
d) Ver 3 alternativas del Hook (para elegir o para variante B)
e) Generar variante B ahora (hook + agitation distintos, resto igual)
```

**Si eligió A/B en el brief:** generar automáticamente la variante B junto con la A.
La variante B siempre usa el mismo guión de Beats 2–9, solo cambia Beat 1 (Hook) y Beat 3 (Agitation).

Mostrar ambas en paralelo para comparar:

```
━━━━━━━━━━━━━━━━  VARIANTE A  ━━━━━━━━━━━━━━━━
BEAT 1 — HOOK: "[hook A]"
BEAT 3 — AGITATION: "[agitation A]"

━━━━━━━━━━━━━━━━  VARIANTE B  ━━━━━━━━━━━━━━━━
BEAT 1 — HOOK: "[hook B — más directo/más curioso]"
BEAT 3 — AGITATION: "[formulación diferente del mismo dolor]"
```

**No avanzar hasta recibir respuesta.** Esta gate es independiente de la confirmación de costo de generación de video.

---

## Prompt para Beatra

Una vez aprobado el guión:

```bash
# Instalar si no está:
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
Mood: [tono del guión]
Idioma: [idioma/dialecto]
Instrucción extra: La letra tiene 9 secciones — mantener el tempo 
parejo a través de todas. La sección 9 (CTA) debe terminar con 
resolución musical, no un fade.
```

---

## Checklist de calidad antes de entregar

- [ ] Hook funciona en 3 palabras sin contexto previo
- [ ] Beat 2 (Pain) nombra una emoción que el avatar reconoce en sí mismo
- [ ] Beat 3 (Agitation) es más intenso que el Beat 2
- [ ] No hay nombre del producto antes del Beat 6
- [ ] El CTA dice exactamente qué hacer (verbo + objeto + urgencia)
- [ ] Cada beat cabe en ≤ 4 segundos cantado al BPM elegido
- [ ] No hay adjetivos vacíos en ningún beat
- [ ] El Brief de Personaje NO incluye información real del usuario (demografía, nombres reales de clientes, etc.)
- [ ] La letra completa para Beatra está limpia (sin etiquetas de beat)
