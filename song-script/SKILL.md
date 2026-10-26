---
name: song-script
description: >-
  Escribe el guión de una "historia cantada" para reels / anuncios de Meta Ads /
  TikTok, siguiendo la anatomía de 9 beats de un AI song ad (Hook → Tensión →
  Resolución → CTA). Optimizado para "Tarot para Principiantes" (Perú) pero
  adaptable a cualquier marca. Úsalo antes de generar audio con Beatra o video
  con el skill video-gen.
compatibility: claude-code
version: 1.0.0
---

# Song Script — Historia Cantada para Reels

## Propósito

Este skill produce:
1. El **guión de 9 beats** de la historia cantada (letra + indicaciones visuales por beat).
2. Un **brief de personaje** listo para el skill `video-gen` (character sheet).
3. El **prompt de audio** listo para Beatra (`beatra-ai/lyrics-to-song-skill`).

---

## Anatomía de un AI Song Ad (9 beats)

Basado en el infographic "Anatomy of a Great AI Song Ad":

| # | Beat | Duración | Función |
|---|------|----------|---------|
| 1 | **Hook** | 2–3 s | Captura la atención. Debe parar el scroll. Pregunta o afirmación impactante. |
| 2 | **Pain / Problema** | 3–4 s | Nombra el dolor del avatar. Empatía inmediata. |
| 3 | **Agitation** | 2–3 s | Intensifica el dolor. "Y lo peor es que…" |
| 4 | **Dream** | 2–3 s | Pinta el mundo ideal. Aspiración. |
| 5 | **Bridge / Transición** | 1–2 s | Conecta el sueño con la solución. |
| 6 | **Solution** | 3–4 s | Presenta el producto/servicio. El antes vs el después. |
| 7 | **Proof / Credibilidad** | 2–3 s | Evidencia, resultados, número concreto o testimonio condensado. |
| 8 | **Transformation** | 2–3 s | El avatar YA tiene la vida soñada gracias a la solución. |
| 9 | **CTA** | 2–3 s | Invitación directa. Urgencia suave. Link / acción concreta. |

**Duración total objetivo:** 25–35 s para reel (formato corto), hasta 60 s para anuncio largo.

---

## Proceso paso a paso

### 1. Brief inicial (pídele al usuario si no lo dio)

```
- Producto / servicio: ___
- Avatar (cliente ideal): ___  
- Principal dolor del avatar: ___
- Promesa clave: ___
- CTA deseado: ___
- Tono: [místico / empoderador / urgente / íntimo / otro]
- Duración objetivo: [corto 25–35 s / largo 45–60 s]
- Género musical sugerido: [pop / trap / cumbia / electrónico / otro]
```

Para "Tarot para Principiantes" el brief por defecto es:
- Avatar: mujer 25–45, Lima y provincias, siente que su vida está "estancada"
- Dolor: incertidumbre sobre el futuro (amor, trabajo, dinero)
- Promesa: claridad, guía, respuesta concreta
- CTA: "Reserva tu lectura hoy"
- Tono: místico + empoderador
- Colores de marca: `#FFC83D` (dorado) y `#1A0B2E` (morado oscuro)

### 2. Redactar los 9 beats

Para cada beat, escribe:
- **Letra cantada** (verso o frase musical, máx 12 palabras por beat corto)
- **Visual sugerido** (qué se ve en pantalla — descripción para el skill video-gen)
- **Emoción target** (qué debe sentir el espectador)

**Reglas de letra:**
- Usa lenguaje coloquial (español neutro con peruanismos sutiles si el tono lo pide)
- Cada beat debe poder cantarse en ≤ 4 segundos (≈ 10–14 sílabas a 140 BPM)
- El hook debe funcionar SIN contexto previo — si alguien ve solo las primeras 2 palabras, debe detenerse
- Evita rimas forzadas que rompan la naturalidad
- Incluye al menos una imagen concreta (no solo abstracciones)

### 3. Formato de salida

Entrega el guión en este formato exacto (el skill `video-gen` lo consume así):

```
🎵 HISTORIA CANTADA — [NOMBRE DE LA MARCA]
Género: [género musical]
BPM sugerido: [100–160]
Duración total estimada: [X] s
Ratio: [9:16 / 4:5]

---

BEAT 1 — HOOK
Letra: "[texto]"
Visual: [descripción para el prompt de video]
Emoción: [impacto / curiosidad / shock / etc.]
Duración: [X]s

BEAT 2 — PAIN
Letra: "[texto]"
Visual: [descripción]
Emoción: [empatía / reconocimiento]
Duración: [X]s

[... beats 3–8 ...]

BEAT 9 — CTA
Letra: "[texto]"
Visual: [descripción — incluye logo/overlay de texto con CTA]
Emoción: [urgencia suave / esperanza]
Duración: [X]s

---

LETRA COMPLETA (para Beatra):
[todos los versos seguidos, con saltos de línea por beat, listos para pegar en Beatra]

BRIEF DE PERSONAJE (para video-gen):
Nombre del personaje: ___
Descripción física: [edad aparente, rasgos, vestimenta, estética]
Estética de mundo: [ambientación de los clips]
Paleta visual: #FFC83D, #1A0B2E
```

### 4. Gate de aprobación (OBLIGATORIO)

Antes de pasar al siguiente skill, muestra el guión completo y pregunta:

```
📝 Guión listo — revisá antes de continuar

[guión completo]

¿Aprobás este guión? Opciones:
a) Sí, generá el audio con Beatra
b) Sí, generá el video con video-gen
c) Editar beat [número]
d) Reescribir desde cero
```

**No avances hasta recibir confirmación.** Esta gate es separada de la confirmación de costo de generación.

### 5. Prompt para Beatra

Una vez aprobado, entrega:

```bash
# Instalar si no está instalado:
npx skills add beatra-ai/lyrics-to-song-skill

# Luego invoca el skill y pasa esta letra:
```

```
LETRA PARA BEATRA:
[letra completa del guión]

PARÁMETROS:
- Género: [género]
- BPM: [BPM]
- Duración: [X]s
- Mood: [místico / empoderador / etc.]
- Idioma: español
```

---

## Ejemplo de guión — Tarot para Principiantes

```
🎵 HISTORIA CANTADA — TAROT PARA PRINCIPIANTES
Género: Pop electrónico con elementos étnicos
BPM sugerido: 120
Duración total estimada: 30 s
Ratio: 9:16

---

BEAT 1 — HOOK (3s)
Letra: "¿Y si el universo ya tiene tu respuesta?"
Visual: Personaje místico con ojos brillantes, mira directo a cámara, humo dorado
Emoción: Curiosidad / pausa en el scroll

BEAT 2 — PAIN (3s)
Letra: "Cuando todo se siente incierto y sin salida…"
Visual: Ciudad nocturna, persona sola, lluvia suave
Emoción: Reconocimiento / empatía

BEAT 3 — AGITATION (3s)
Letra: "El trabajo, el amor, el dinero — todo en duda"
Visual: Cartas confusas, imágenes superpuestas de preocupaciones
Emoción: Tensión que se intensifica

BEAT 4 — DREAM (3s)
Letra: "Imagina saber qué camino elegir hoy"
Visual: Luz dorada rompiendo la oscuridad, cielo estrellado
Emoción: Esperanza / aspiración

BEAT 5 — BRIDGE (2s)
Letra: "Las cartas hablan cuando tú las escuchas"
Visual: Mano del personaje extendiendo una carta brillante
Emoción: Transición mágica

BEAT 6 — SOLUTION (4s)
Letra: "Tarot para Principiantes — tu guía en lo que viene"
Visual: Logo, interfaz/lectura en vivo, personaje sonriente con cartas
Emoción: Alivio / solución clara

BEAT 7 — PROOF (3s)
Letra: "Miles de lecturas. Respuestas reales."
Visual: Pantalla con testimonios breves, estrellas doradas
Emoción: Confianza / credibilidad

BEAT 8 — TRANSFORMATION (3s)
Letra: "Ya no caminas sola — el universo te habla"
Visual: Misma persona del beat 2, ahora serena, con luz dorada
Emoción: Transformación emocional

BEAT 9 — CTA (3s)
Letra: "Reserva tu lectura hoy. El momento es ahora."
Visual: Botón animado, URL o usuario de IG, personaje haciendo gesto de invitación
Emoción: Urgencia suave / acción

---

LETRA COMPLETA (para Beatra):
¿Y si el universo ya tiene tu respuesta?
Cuando todo se siente incierto y sin salida…
El trabajo, el amor, el dinero — todo en duda

Imagina saber qué camino elegir hoy
Las cartas hablan cuando tú las escuchas

Tarot para Principiantes — tu guía en lo que viene
Miles de lecturas. Respuestas reales.
Ya no caminas sola — el universo te habla

Reserva tu lectura hoy. El momento es ahora.

BRIEF DE PERSONAJE (para video-gen):
Nombre del personaje: Luna (vidente IA)
Descripción física: Mujer latina, 28–35 años aparentes, ojos oscuros y mirada intensa, 
  cabello largo oscuro con mechones dorados, vestimenta: túnica morada con detalles dorados,
  joyería étnica con cristales
Estética de mundo: Interior místico — velas, cristales, tela de terciopelo morado,
  humo dorado, cartas del tarot iluminadas, luz de luna suave
Paleta visual: #FFC83D (dorado), #1A0B2E (morado oscuro profundo)
```
