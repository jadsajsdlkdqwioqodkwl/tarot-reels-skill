#!/usr/bin/env node
// Subtítulos en FRASES CORTAS (estilo "minimal"): agrupa las palabras con timing de un transcript
// (transcribe.py -> [{text,start,end}]) en frases de 2-4 palabras cortadas en la puntuación,
// sin dejar conectores ("de", "que", "tu"...) colgando al final de una frase.
// Uso: node build-chunk-captions.mjs <words.json> <out captions.js> [--max 4] [--dur <segundos>] [--fix "viejo=nuevo,..."]
// Salida: window.__CHUNKS = [{t, show, hide, w:[[palabra,s,e],...]}]  (show = 30 ms antes de decirse; hide = show de la siguiente o +0.4 s)
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : d; };
const [inp, out] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!inp || !out) { console.error("uso: build-chunk-captions.mjs <words.json> <out.js> [--max 4] [--dur S] [--fix a=b,...]"); process.exit(1); }
const MAX = +flag("max", 4);
const fixes = Object.fromEntries((flag("fix", "") || "").split(",").filter(Boolean).map((p) => p.split("=")));
const STOP = new Set("de del la el los las un una unos unas que y o u e a al en con sin por para te se me tu tus su sus mi mis lo le les como muy más pero si no ni es son".split(" "));

const raw = JSON.parse(readFileSync(inp, "utf8"));
const words = raw.map((w) => {
  const text0 = (w.text ?? w.word ?? "").trim();
  const clean = text0.replace(/[.,;:…]+$/, "").replace(/^[¿¡]/, "");
  return { t: fixes[clean] ?? clean, s: +w.start, e: +w.end, brk: /[.,;:!?…]$/.test(text0) };
}).filter((w) => w.t);

// 1) cláusulas por puntuación
const clauses = []; let cur = [];
for (const w of words) { cur.push(w); if (w.brk) { clauses.push(cur); cur = []; } }
if (cur.length) clauses.push(cur);

// 2) cada cláusula -> grupos balanceados de <= MAX palabras, sin conector al final
const chunks = [];
for (const c of clauses) {
  const n = c.length, k = Math.ceil(n / MAX);
  const sizes = Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0));
  let idx = 0; const groups = [];
  sizes.forEach((sz) => { groups.push(c.slice(idx, idx + sz)); idx += sz; });
  for (let g = 0; g < groups.length - 1; g++) {            // mover conectores finales a la frase siguiente
    while (groups[g].length > 1 && STOP.has(groups[g].at(-1).t.toLowerCase())) groups[g + 1].unshift(groups[g].pop());
  }
  for (const g of groups) if (g.length) chunks.push(g);
}
// frases de 1 palabra se pegan a la vecina si caben
for (let i = 0; i < chunks.length; i++) {
  if (chunks[i].length === 1 && i + 1 < chunks.length && chunks[i + 1].length < MAX && !chunks[i][0].brk) { chunks[i + 1] = [...chunks[i], ...chunks[i + 1]]; chunks.splice(i, 1); i--; }
}

const DUR = flag("dur") ? +flag("dur") : Infinity;
const res = chunks.map((g) => ({ t: g.map((w) => w.t).join(" "), show: +Math.max(0, g[0].s - 0.03).toFixed(3), last: g.at(-1).e,
  w: g.map((x) => [x.t, +x.s.toFixed(3), +x.e.toFixed(3)]) })); // w = [palabra, inicio, fin] para el resaltado sincronizado
res.forEach((c, i) => {
  const next = res[i + 1];
  const hide = next ? (next.show - c.last < 0.45 ? next.show : Math.min(c.last + 0.25, next.show)) : Math.min(DUR, c.last + 0.4);
  c.hide = +Math.max(hide, c.show + 0.2).toFixed(3); delete c.last;
});
writeFileSync(out, "window.__CHUNKS = " + JSON.stringify(res) + ";\n", "utf8");
console.log(`${res.length} frases · ${res.map((c) => c.t).join(" | ")}`);
