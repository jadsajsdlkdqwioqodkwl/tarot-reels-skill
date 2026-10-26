#!/usr/bin/env node
// ============================================================================
// reels-editor · Paso 0 — Configura la MARCA del editor (colores + tipografía)
// ============================================================================
// Genera `brand.json` (fuente de verdad de la marca) y `brand.css` (las variables
// que consume la composición). Se corre UNA vez por proyecto; después todos los
// reels de esa marca salen iguales entre sí y distintos a los de cualquier otro.
//
// Uso A — con respuestas sueltas (lo típico cuando el modelo ya preguntó en el chat):
//   node setup-brand.mjs --proj /ruta/al/proyecto \
//     --name "Mi Marca" --accent "#FF3B30" --dark "#101010" --font "Anton" \
//     --language es --dialect neutro --handle "@mimarca"
//
// Uso B — con un JSON de respuestas:
//   node setup-brand.mjs --proj /ruta/al/proyecto --from respuestas.json
//
// Uso C — tipografía propia (archivo .otf/.ttf del usuario):
//   node setup-brand.mjs --proj /ruta --name "X" --accent "#0AF" \
//     --font-file /ruta/a/MiFuente-Black.otf --font "Mi Fuente"
//
// Flags útiles:
//   --emphasis accent|white   color de las palabras de énfasis (default: accent)
//   --motion minimal|medium|hype   nivel de la capa de motion (default: medium) → reference/motion-layer.md
//   --ratio 4:5|9:16          lienzo del reel (default: 4:5; el prompt del usuario manda)
//   --char-width 0.62         ancho medio de glifo (solo si sabés lo que hacés)
//   --force                   sobreescribe un brand.json existente
//   --print-fonts             lista el catálogo de tipografías recomendadas y sale
//
// Salidas (dentro de --proj):
//   brand.json   configuración legible por el modelo y por los otros scripts
//   brand.css    variables CSS + carga de la tipografía (la usa index.html)
//   fonts/       copia de la tipografía propia, si se pasó --font-file
// ============================================================================
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

// ---------------------------------------------------------------- catálogo ---
// charWidth = ancho medio de glifo en fracción del font-size. Es solo la
// estimación inicial: la composición la refina midiendo en el navegador.
const FONT_CATALOG = {
  Anton:            { weight: 400, charWidth: 0.50, note: "Condensada muy pesada. El default: lee perfecto chiquita." },
  "Archivo Black":  { weight: 400, charWidth: 0.66, note: "Ancha y sólida, estilo editorial/deportivo." },
  "Bebas Neue":     { weight: 400, charWidth: 0.40, note: "Muy condensada, todo mayúsculas. Elegante y agresiva." },
  Oswald:           { weight: 700, charWidth: 0.48, note: "Condensada clásica, más neutra que Anton." },
  Montserrat:       { weight: 800, charWidth: 0.62, note: "Geométrica amable. Marcas cálidas / lifestyle." },
  Poppins:          { weight: 800, charWidth: 0.62, note: "Geométrica redonda. Tech amigable." },
  Inter:            { weight: 900, charWidth: 0.58, note: "Neutra de interfaz. Marcas sobrias / SaaS." },
  "Space Grotesk":  { weight: 700, charWidth: 0.56, note: "Grotesca con personalidad. Tech / cripto / diseño." },
  Figtree:          { weight: 900, charWidth: 0.56, note: "Humanista moderna. Coaching / consultoría." },
  Rubik:            { weight: 900, charWidth: 0.58, note: "Esquinas redondeadas. Marcas jóvenes." },
};

const args = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = args.indexOf("--" + n);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d;
};
const has = (n) => args.includes("--" + n);

if (has("print-fonts")) {
  console.log("Tipografías recomendadas (todas gratis, Google Fonts):\n");
  for (const [name, f] of Object.entries(FONT_CATALOG)) {
    console.log(`  ${name.padEnd(16)} peso ${f.weight}  · ${f.note}`);
  }
  console.log("\nTambién podés usar la tuya: --font-file /ruta/a/TuFuente.otf --font \"Tu Fuente\"");
  process.exit(0);
}

// ------------------------------------------------------------- respuestas ---
const fromFile = flag("from");
const answers = fromFile ? JSON.parse(readFileSync(fromFile, "utf8")) : {};
// --from acepta tanto un archivo de respuestas plano ({name, accent, ...}) como el brand.json anidado que
// escribe este mismo script ({brandName, colors:{accent,dark,light}, font:{family,...}, captions:{emphasis}}).
if (answers.colors || answers.brandName || (answers.font && typeof answers.font === "object")) {
  const c = answers.colors || {};
  answers.name ??= answers.brandName;
  answers.accent ??= c.accent; answers.dark ??= c.dark; answers.light ??= c.light;
  answers.emphasis ??= answers.captions?.emphasis === "white" ? "white" : undefined;
  if (answers.font && typeof answers.font === "object") {
    const f = answers.font;
    answers["font-weight"] ??= f.weight; answers["char-width"] ??= f.charWidth;
    answers.font = f.family;
  }
}
const pick = (k, fallback) => flag(k, answers[k] ?? fallback);

const proj = resolve(pick("proj", process.cwd()));
const brandName = pick("name", "");
const handle = pick("handle", "");
const accentRaw = pick("accent", null);
if (!accentRaw) fail("Falta --accent (el color de marca, en hex: ej #FF3B30). Es la única respuesta sin default: preguntásela al usuario.");
const accent = normHex(accentRaw, "--accent");
const dark = normHex(pick("dark", "#0D0D0D"), "--dark");
const light = normHex(pick("light", "#FFFFFF"), "--light");
const language = pick("language", "es");
const dialect = pick("dialect", "neutro");
const cta = pick("cta", "");
const emphasis = pick("emphasis", "accent");
const fontFile = pick("font-file", null);
const fontName = pick("font", fontFile ? basename(fontFile).replace(/[-_].*$/, "") : "Anton");

if (!brandName) fail("Falta --name (el nombre de la marca).");
if (!existsSync(proj)) fail(`No existe el proyecto: ${proj}`);
const outJson = join(proj, "brand.json");
if (existsSync(outJson) && !has("force")) {
  fail(`Ya existe ${outJson}. Usá --force para sobreescribirlo (se pierde la config anterior).`);
}

// ------------------------------------------------------------ tipografía ---
let font;
if (fontFile) {
  if (!existsSync(fontFile)) fail(`No existe la tipografía: ${fontFile}`);
  mkdirSync(join(proj, "fonts"), { recursive: true });
  const dest = join(proj, "fonts", basename(fontFile));
  copyFileSync(fontFile, dest);
  font = {
    family: fontName,
    source: "local",
    file: "fonts/" + basename(fontFile),
    format: /\.otf$/i.test(fontFile) ? "opentype" : "truetype",
    weight: Number(pick("font-weight", 900)),
    charWidth: Number(pick("char-width", 0.62)),
  };
} else {
  const cat = FONT_CATALOG[fontName];
  if (!cat) {
    fail(`Tipografía desconocida: "${fontName}".\n` +
         `Elegí una del catálogo (node setup-brand.mjs --print-fonts) o pasá la tuya con --font-file.`);
  }
  font = {
    family: fontName,
    source: "google",
    url: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, "+")}:wght@${cat.weight}&display=swap`,
    weight: Number(pick("font-weight", cat.weight)),
    charWidth: Number(pick("char-width", cat.charWidth)),
  };
}

// ------------------------------------------------- contraste y derivados ---
const accentInk = bestInk(accent, dark, light);
const [ar, ag, ab] = rgb(accent);
const accentGlow = `rgba(${ar},${ag},${ab},0.45)`;
const emphColor = emphasis === "white" ? light : accent;
const emphGlow = emphasis === "white" ? "rgba(0,0,0,0.0)" : accentGlow;

const warnings = [];
if (contrast(accent, "#000000") < 3) {
  warnings.push(
    `El acento ${accent} tiene poco contraste contra negro (${contrast(accent, "#000000").toFixed(2)}:1). ` +
    `Las palabras de énfasis van a costar de leer sobre video oscuro: probá una versión más clara del color, ` +
    `o usá --emphasis white y dejá el acento solo para el chip del hook.`);
}
if (contrast(accent, accentInk) < 4.5) {
  warnings.push(
    `El chip del hook (texto ${accentInk} sobre ${accent}) queda en ${contrast(accent, accentInk).toFixed(2)}:1. ` +
    `Es bajo para texto grande sobre video: considerá un acento más saturado o más oscuro.`);
}
if (contrast(dark, light) < 7) {
  warnings.push(`La base oscura ${dark} y el texto ${light} tienen poco contraste entre sí.`);
}

// ------------------------------------------------------------- escritura ---
// Capa de MOTION + AUDIO (reference/motion-layer.md y audio-sfx.md). Se conservan de un
// brand.json previo al regenerar con --force; si no, defaults.
const prev = existsSync(outJson) ? JSON.parse(readFileSync(outJson, "utf8")) : {};
const motion = pick("motion", prev.motion ?? answers.motion ?? "medium"); // minimal | medium | hype
if (!["minimal", "medium", "hype"].includes(motion)) fail(`--motion inválido: ${motion} (minimal|medium|hype)`);
const ratio = pick("ratio", prev.ratio ?? answers.ratio ?? "4:5");        // 4:5 (default de la marca) | 9:16
if (!["9:16", "4:5"].includes(ratio)) fail(`--ratio inválido: ${ratio} (9:16|4:5)`);
const captionStyle = pick("caption-style", prev.captions?.style ?? "minimal"); // word | chunk | minimal
if (!["word", "chunk", "minimal"].includes(captionStyle)) fail(`--caption-style inválido: ${captionStyle} (word|chunk|minimal)`);
const hookStyle = pick("hook-style", prev.hook?.style ?? "editorial");          // editorial | chips
if (!["editorial", "chips"].includes(hookStyle)) fail(`--hook-style inválido: ${hookStyle} (editorial|chips)`);
const sfx = prev.sfx ?? answers.sfx ?? {
  _comment: "Paleta de SFX por rol (archivos de assets/sfx/). Vacío = elegir del manifest y fijarlo acá.",
  hook: "", transition: "", emphasis: "", cta: "", typing: "",
};
const music = prev.music ?? answers.music ?? {
  _comment: "Música de fondo por defecto (assets/music/). mood guía la elección; file fija una pista.",
  mood: "chill", file: "", volume: motion === "hype" ? 0.45 : 0.35,
};

const brand = {
  _comment: "Config de marca del editor de reels. Editá acá y volvé a correr setup-brand.mjs --force para regenerar brand.css.",
  brandName,
  handle,
  language,
  dialect,
  cta,
  colors: { accent, accentInk, accentGlow, dark, light },
  font,
  captions: {
    emphasis,
    emphColor,
    baseSize: Number(pick("caption-size", 54)),
    minSize: Number(pick("caption-min", 40)),
    maxWidth: Number(pick("caption-maxwidth", 790)),
    bottom: ratio === "4:5" ? 250 : 470,   // safe zone inferior según el lienzo (SKILL.md §4:5)
    style: captionStyle,                   // word | chunk | minimal (SKILL.md §Captions)
  },
  hook: { top: ratio === "4:5" ? 110 : 300, fontSize: 48, radius: 18, uppercase: true, style: hookStyle }, // editorial | chips
  lexicon: answers.lexicon ?? prev.lexicon ?? { always: {}, never: [] },
  ratio,
  motion,
  sfx,
  music,
  generatedAt: new Date().toISOString().slice(0, 10),
};
writeFileSync(outJson, JSON.stringify(brand, null, 2) + "\n");

const fontFace = font.source === "google"
  ? `@import url("${font.url}");`
  : `@font-face {\n  font-family: "${font.family}";\n  src: url("${font.file}") format("${font.format}");\n  font-weight: ${font.weight};\n  font-style: normal;\n}`;

writeFileSync(join(proj, "brand.css"), `/* ============================================================
   brand.css — generado por setup-brand.mjs (${brand.generatedAt})
   Marca: ${brandName}
   NO editar a mano: cambiá brand.json y volvé a correr el script.
   ============================================================ */
${fontFace}

:root {
  --brand-font: "${font.family}", "Arial Black", sans-serif;
  --brand-font-weight: ${font.weight};
  --brand-char-width: ${font.charWidth};

  --brand-accent: ${accent};
  --brand-accent-ink: ${accentInk};
  --brand-accent-glow: ${accentGlow};
  --brand-dark: ${dark};
  --brand-light: ${light};

  --caption-color: ${light};
  --caption-emph-color: ${emphColor};
  --caption-emph-glow: ${emphGlow};
  --caption-base-size: ${brand.captions.baseSize}px;
  --caption-min-size: ${brand.captions.minSize}px;
  --caption-max-width: ${brand.captions.maxWidth}px;
  --caption-bottom: ${brand.captions.bottom}px;

  --hook-top: ${brand.hook.top}px;
  --hook-font-size: ${brand.hook.fontSize}px;
  --hook-radius: ${brand.hook.radius}px;
}
`);

console.log(`✅ Marca configurada: ${brandName}`);
console.log(`   ${outJson}`);
console.log(`   ${join(proj, "brand.css")}`);
console.log(`   Tipografía: ${font.family} (${font.source})  ·  Acento: ${accent} · texto del chip: ${accentInk}`);
if (font.source === "local") console.log(`   Copiada a ${join(proj, font.file)}`);
if (warnings.length) {
  console.log("\n⚠️  Avisos de contraste (decidilos con el usuario, no los ignores):");
  for (const w of warnings) console.log("   - " + w);
}
console.log("\nSiguiente paso: copiar reference/composition-template.html a index.html del proyecto.");

// ------------------------------------------------------------- helpers -----
function fail(msg) { console.error("✖ " + msg); process.exit(1); }
function normHex(v, label) {
  const s = String(v).trim().replace(/^#?/, "#").toUpperCase();
  const short = /^#([0-9A-F]{3})$/.exec(s);
  const full = /^#([0-9A-F]{6})$/.exec(s);
  if (short) return "#" + short[1].split("").map((c) => c + c).join("");
  if (full) return s;
  fail(`Color inválido en ${label}: "${v}". Formato esperado: #RRGGBB (ej: #FF3B30).`);
}
function rgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function bestInk(bg, darkInk, lightInk) {
  return contrast(bg, darkInk) >= contrast(bg, lightInk) ? darkInk : lightInk;
}
