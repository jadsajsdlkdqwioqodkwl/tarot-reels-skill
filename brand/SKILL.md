---
name: brand
description: >-
  Configura y mantiene la información de marca para el pipeline de reels AI.
  Crea o actualiza brand.json con datos del negocio, personaje, audiencia y
  tono. Invocar una sola vez por proyecto; todos los demás skills lo consumen.
compatibility: claude-code
version: 1.0.0
---

# Brand — Configuración de Marca

## Propósito

Crea el archivo `brand.json` que alimenta a todos los skills del pipeline:

- `song-script` lo usa para el brief del negocio y el tono por defecto
- `video-gen` lo usa para el personaje, paleta de colores y ratio
- `reels-editor` lo usa para tipografía, colores, motion level y captions

> ℹ️ Invocar este skill **una sola vez por proyecto** (o cada vez que cambie algo de la marca).
> Si ya existe `brand.json`, preguntar qué sección actualizar — no sobreescribir sin confirmar.

---

## Paso 0 — Verificar si ya existe

```bash
ls brand.json 2>/dev/null && echo "EXISTS" || echo "NOT FOUND"
```

- **Existe** → mostrar el contenido actual, preguntar qué sección actualizar
- **No existe** → hacer la entrevista completa (abajo)

---

## Entrevista de marca (primera vez)

### Bloque 1 — Negocio

```
📋 Cuéntame sobre tu negocio

1. Nombre del negocio / marca: ___
2. Qué vendes / qué haces (en 1 oración): ___
3. País y ciudad (para referencia cultural): ___
4. URL o redes donde están: ___
```

### Bloque 2 — Audiencia

```
👥 ¿A quién le hablas?

5. Edad del cliente ideal: ___
6. Género (si es relevante): ___
7. Principal dolor o problema que resolvés: ___
8. Qué resultado / transformación promete tu producto: ___
9. Cómo habla tu audiencia (jerga, expresiones que usan): ___
```

### Bloque 3 — Visual y tono

```
🎨 Identidad visual y de voz

10. Color principal de marca (hex, o describilo): ___
11. Color oscuro / fondo (hex, o describilo): ___
12. Tipografía preferida (o "no sé, sugerí una"): ___
13. Tono de voz: [místico / empoderador / íntimo / urgente / divertido / otro: ___]
14. Idioma y variante: [español neutro / peruano / mexicano / colombiano / otro: ___]
```

### Bloque 4 — Pipeline

```
⚙️ Configuración técnica

15. Ratio de exportación: [4:5 para Meta Ads / 9:16 para Stories y TikTok / ambos]
16. Nivel de motion en los reels: [minimal / medium / hype]
17. CTA típico que usás (texto exacto si lo tenés): ___
```

### Bloque 5 — Personaje (opcional pero recomendado)

```
🧑 ¿Quieres un personaje AI fijo para los reels?
(Si dices que no, cada reel puede tener un look diferente)

18. ¿Usar personaje fijo? [sí / no]

Si sí:
19. Nombre del personaje: ___
20. Género y edad aparente: ___
21. Rasgos físicos (cabello, ojos, tono de piel, rasgos específicos): ___
22. Vestimenta / estética: ___
23. Ambiente / mundo visual donde aparece: ___
24. ¿Ya tienes imágenes de referencia? [sí → ruta / no → generar desde cero]
```

**Pedir solo lo que no tenga respuesta obvia.** Si el usuario ya dijo algo relevante en el prompt, no volver a preguntar.

---

## Generar brand.json

Con las respuestas, escribir `brand.json` en la raíz del proyecto:

```json
{
  "brandName": "[Nombre del negocio]",
  "tagline": "[Qué vendés en 1 oración]",
  "url": "[URL o red principal]",
  "country": "[País]",
  
  "audience": {
    "ageRange": "[ej: 25-45]",
    "gender": "[ej: femenino / mixto]",
    "pain": "[Principal dolor]",
    "transformation": "[Resultado prometido]",
    "voice": "[Cómo habla la audiencia]"
  },
  
  "language": "es",
  "dialect": "[neutro / pe / mx / co / otro]",
  "tone": "[místico / empoderador / íntimo / urgente / divertido]",
  
  "colors": {
    "accent": "[#HEXCODE]",
    "dark": "[#HEXCODE]"
  },
  "font": {
    "family": "[Nombre de tipografía Google Fonts]"
  },
  
  "ratio": "[4:5 / 9:16]",
  "motion": "[minimal / medium / hype]",
  "cta": "[Texto exacto del CTA]",
  
  "character": {
    "enabled": true,
    "name": "[Nombre del personaje]",
    "gender": "[femenino / masculino / no binario]",
    "ageApparent": "[ej: 28-35]",
    "hair": "[descripción detallada]",
    "eyes": "[color + forma]",
    "skin": "[tono + textura]",
    "outfit": "[descripción detallada]",
    "world": "[descripción del ambiente / escenario]",
    "palette": "[colores dominantes del mundo visual]",
    "sheetPath": "references/characters/[nombre-slug]/"
  }
}
```

Si el usuario eligió **no usar personaje fijo**, omitir el bloque `character` (o poner `"character": { "enabled": false }`).

---

## Sugerencias de tipografía por tono

Si el usuario dice "no sé, sugerí una":

| Tono | Tipografía sugerida | Por qué |
|------|--------------------|-|
| Místico / espiritual | `Cinzel` + `Lato` | Serifa clásica + cuerpo limpio |
| Empoderador / transformación | `Anton` + `Inter` | Display pesada + legibilidad |
| Íntimo / confesional | `Playfair Display` + `Merriweather` | Calidez editorial |
| Urgente / escasez | `Oswald` + `Roboto` | Condensada + neutral |
| Divertido / energético | `Bebas Neue` + `Nunito` | Bold + redondo |
| Profesional / corporativo | `Montserrat` + `Source Sans 3` | Clean + confiable |

Todas están en Google Fonts y son gratuitas.

---

## Sugerencias de color si no tiene marca definida

Preguntar: "¿Quieres que sugiera una paleta basada en el tono?"

| Tono | Acento sugerido | Fondo sugerido |
|------|----------------|----------------|
| Místico | `#C9A227` (dorado antiguo) | `#1A0B2E` (morado oscuro) |
| Empoderador | `#FF4500` (rojo fuego) | `#0D0D0D` (negro profundo) |
| Íntimo | `#E8A598` (rosa terracota) | `#1C1C1E` (carbón) |
| Urgente | `#FFD700` (amarillo alerta) | `#1A1A1A` (negro) |
| Divertido | `#00D4FF` (cyan eléctrico) | `#0A0A1E` (azul noche) |

---

## Integración con los otros skills

Después de crear `brand.json`, decirle al usuario:

```
✅ brand.json creado. Así lo usa cada skill:

• song-script:  tono y audiencia son los defaults del brief
• video-gen:    personaje + paleta + ratio para todos los clips
• reels-editor: tipografía + colores + motion level del proyecto

Para invocar cualquier skill sin repetir datos de marca, simplemente 
indicar la ruta al proyecto donde está el brand.json.
```

---

## Actualizar solo una sección

Si `brand.json` ya existe y el usuario quiere cambiar algo:

```bash
# Leer el JSON actual, modificar solo el campo indicado, reescribir
# Ejemplo: cambiar solo el personaje
```

Mostrar el campo actual → confirmar el cambio → reescribir solo ese bloque.
**Nunca sobreescribir campos que no se pidió cambiar.**

---

## Checklist antes de terminar

- [ ] `brand.json` tiene todos los campos de negocio (brandName, tagline, country)
- [ ] `audience` completa (pain + transformation son los más importantes)
- [ ] `colors.accent` y `colors.dark` son valores hex válidos (`#RRGGBB`)
- [ ] `font.family` existe en Google Fonts
- [ ] `ratio` es `"4:5"` o `"9:16"` (comillas incluidas)
- [ ] Si hay personaje: `sheetPath` apunta a una carpeta dentro de `references/characters/`
- [ ] `.gitignore` NO excluye `brand.json` (es config, no secreto)
- [ ] No hay API keys ni contraseñas en ningún campo
