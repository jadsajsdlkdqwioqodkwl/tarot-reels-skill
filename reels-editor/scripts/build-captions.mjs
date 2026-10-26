#!/usr/bin/env node
// ============================================================================
// reels-editor · Paso F — Construye captions.json + captions.js para la composición
// ============================================================================
// Uso:   node build-captions.mjs <captions-config.json>
//
// captions-config.json (lo arma el modelo después de leer las transcripciones v2):
// {
//   "workDir": "/ruta/absoluta/al/_work",      // lee segments.json y transcripts-cut/<id>.json
//   "out": "/ruta/absoluta/a/reel-slug/captions.js",   // el JS que carga index.html
//   "fix": {                                   // typos de Whisper + dialecto + léxico de marca
//     "clot code": ["Claude", "Code"],         //   frase → varias palabras (timing proporcional)
//     "yquiero":   ["Y", "quiero"],            //   merge de Whisper → split
//     "puedes":    "podés",                    //   palabra → palabra
//     "mac os":    "macOS"                     //   frase → una palabra (se funde el timing)
//   },
//   "emph": ["claude", "40", "gratis", "cero"], // palabras en color de acento (sin puntuación, minúsculas)
//   "capitalizeFirst": true                    // primera palabra de cada toma en mayúscula inicial
// }
//
// Entradas (las produce el pipeline):
//   <workDir>/segments.json              offsets exactos por cut (cut-and-master.mjs)
//   <workDir>/transcripts-cut/<id>.json  palabras con timing LOCAL al cut (Paso E / merge-text-timing)
//
// Salidas:
//   <workDir>/captions.json   { captions:[{t,s,e,emph}], boundaries:[...], segments:[...] }
//   <out>                     window.__CAPTIONS = {...}  (lo consume composition-template.html)
//
// Reglas aplicadas (criterios cerrados de SKILL.md §Captions):
// - timing en segundos del MASTER: start local + masterStart del cut
// - el end de la última palabra se clampa a cutDur (Whisper derrama timestamps, trampa 18)
// - sin puntuación de cierre salvo ! y ?; caso natural
// - ninguna palabra pisa a la siguiente (e <= s de la próxima)
// ============================================================================
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, isAbsolute } from "node:path";

const cfgPath = process.argv[2];
if (!cfgPath) { console.error("uso: node build-captions.mjs <captions-config.json>"); process.exit(1); }
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const workDir = resolve(cfg.workDir);
const outJs = isAbsolute(cfg.out) ? cfg.out : resolve(workDir, cfg.out);
const FIX = Object.fromEntries(Object.entries(cfg.fix || {}).map(([k, v]) => [norm(k), v]));
const EMPH = new Set((cfg.emph || []).map(norm));
const capFirst = cfg.capitalizeFirst !== false;

const segments = JSON.parse(readFileSync(join(workDir, "segments.json"), "utf8"));
const captions = [];
const boundaries = [];

for (const seg of segments) {
  const tPath = join(workDir, "transcripts-cut", seg.id + ".json");
  if (!existsSync(tPath)) { console.error(`✖ falta ${tPath} (Paso E)`); process.exit(1); }
  const raw = JSON.parse(readFileSync(tPath, "utf8"));
  const words = (Array.isArray(raw) ? raw : raw.words || raw.segments?.flatMap((s) => s.words) || [])
    .map((w) => ({ text: String(w.text ?? w.word ?? "").trim(), start: +w.start, end: +w.end }))
    .filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end));

  // trampa 18: Whisper puede derramar timestamps más allá del final del cut
  const cutDur = seg.cutDur ?? Infinity;
  for (const w of words) {
    if (w.end > cutDur) w.end = cutDur;
    if (w.start > cutDur) w.start = Math.max(0, cutDur - 0.1);
    if (w.end <= w.start) w.end = w.start + 0.05;
  }

  // 1) fixes de frase (claves con espacio): se buscan ventanas de N palabras
  const phraseKeys = Object.keys(FIX).filter((k) => k.includes(" ")).sort((a, b) => b.length - a.length);
  let list = [...words];
  for (const key of phraseKeys) {
    const parts = key.split(" ");
    for (let i = 0; i + parts.length <= list.length; i++) {
      const win = list.slice(i, i + parts.length);
      if (win.map((w) => norm(w.text)).join(" ") === key) {
        const merged = { text: win.map((w) => w.text).join(" "), start: win[0].start, end: win[win.length - 1].end };
        list.splice(i, parts.length, ...applyFix(merged, FIX[key], win.map((w) => w.text).join(" ")));
      }
    }
  }
  // 2) fixes de palabra
  list = list.flatMap((w) => {
    const k = norm(w.text);
    return k in FIX ? applyFix(w, FIX[k], w.text) : [w];
  });

  // 3) limpieza + énfasis + offset al master
  const segWords = [];
  for (const w of list) {
    let t = clean(w.text);
    if (!t) continue;
    if (capFirst && segWords.length === 0) t = t.charAt(0).toUpperCase() + t.slice(1);
    segWords.push({
      t,
      s: +(w.start + seg.masterStart).toFixed(3),
      e: +(w.end + seg.masterStart).toFixed(3),
      emph: EMPH.has(norm(t)),
    });
  }
  boundaries.push(+seg.masterStart.toFixed(3));
  captions.push(...segWords);
  console.log(`\n[${seg.id}] @${seg.masterStart.toFixed(2)}s · ${segWords.length} palabras`);
  console.log("  " + segWords.map((w) => (w.emph ? "*" + w.t + "*" : w.t)).join(" "));
}

// 4) ninguna palabra pisa a la siguiente
for (let i = 0; i < captions.length - 1; i++) {
  if (captions[i].e > captions[i + 1].s) captions[i].e = captions[i + 1].s;
  if (captions[i].e <= captions[i].s) captions[i].e = +(captions[i].s + 0.04).toFixed(3);
}

const outObj = {
  captions,
  boundaries,
  segments: segments.map((s) => ({ id: s.id, masterStart: s.masterStart, cutDur: s.cutDur })),
};
writeFileSync(join(workDir, "captions.json"), JSON.stringify(outObj, null, 1));
writeFileSync(outJs, "window.__CAPTIONS = " + JSON.stringify(outObj) + ";\n");
console.log(`\n✅ ${captions.length} palabras · ${captions.filter((c) => c.emph).length} en acento`);
console.log(`   ${join(workDir, "captions.json")}`);
console.log(`   ${outJs}`);
console.log("\nLeé el texto de arriba buscando typos: lo que no se arregló acá sale horneado en el video.");

// ------------------------------------------------------------------ helpers --
function norm(s) {
  return String(s).toLowerCase().normalize("NFC").replace(/[.,;:!?¡¿"“”()\[\]]/g, "").trim();
}
function clean(s) {
  return String(s).trim().replace(/[.,;:"“”]+$/g, "").replace(/^[.,;:"“”]+/g, "");
}
// value: string (1 palabra) | string[] (split con timing proporcional al largo)
function applyFix(w, value, original) {
  const outs = Array.isArray(value) ? value : [value];
  if (outs.length === 1) return [{ ...w, text: outs[0] }];
  const total = outs.reduce((a, t) => a + Math.max(t.length, 1), 0);
  const dur = w.end - w.start;
  let cursor = w.start;
  return outs.map((t, i) => {
    const d = (dur * Math.max(t.length, 1)) / total;
    const piece = { text: t, start: +cursor.toFixed(3), end: +(i === outs.length - 1 ? w.end : cursor + d).toFixed(3) };
    cursor += d;
    return piece;
  });
}
