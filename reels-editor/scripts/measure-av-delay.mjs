#!/usr/bin/env node
// ============================================================================
// Mide el desfase de audio entre el MASTER y el MP4 RENDERIZADO.
// ============================================================================
// El renderer de HyperFrames re-encodea el audio y puede introducir un ATRASO
// constante. Si existe, los captions (que siguen la línea de tiempo del master)
// aparecen ANTES que la voz en el video final: es el "no sincroniza al 100%".
// Correlación cruzada de la envolvente de energía, resolución 2.5ms.
//
// Uso: node measure-av-delay.mjs <master.mp4> <render.mp4> [t1,t2,t3...]
// ============================================================================
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [master, render, pointsArg] = process.argv.slice(2);
if (!master || !render) { console.error("uso: node measure-av-delay.mjs <master> <render> [t1,t2,...]"); process.exit(1); }
const SR = 16000, W = 40; // W=40 → 2.5ms por muestra de envolvente
const WIN = 25;           // ventana máxima por tramo (s)
const fileDur = (f) => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim();
// La ventana se recorta al final del archivo más corto: medir fuera de rango daba lags falsos de 10-17 ms
// con r≈0.92 (el audio no es distinto: se acaba antes que la ventana).
const total = Math.min(fileDur(master), fileDur(render));
let points = (pointsArg || "10,70,135").split(",").map(Number).filter((t) => t < total - 4);
if (!points.length) points = [0]; // reels cortos: un solo tramo desde el inicio
let DUR = WIN;

const raw = (file, ss) => {
  const out = join(tmpdir(), `avd_${file.replace(/\W/g, "").slice(-12)}_${ss}.raw`);
  // -ss DESPUÉS de -i (corte por muestras decodificadas): con -ss antes de -i, un m4a y un mp4 con el mismo audio
  // daban 5-17 ms de lag falso por la precisión de búsqueda de cada contenedor.
  execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ss", String(ss), "-t", String(DUR),
    "-ac", "1", "-ar", String(SR), "-f", "s16le", "-y", out]);
  const b = readFileSync(out);
  const n = b.length / 2;
  const a = new Float64Array(n);
  for (let i = 0; i < n; i++) a[i] = b.readInt16LE(i * 2) / 32768;
  return a;
};
const env = (x) => {
  const n = Math.floor(x.length / W), e = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < W; j++) s += x[i * W + j] ** 2; e[i] = Math.sqrt(s / W); }
  return e;
};

const lags = [];
for (const ss of points) {
  DUR = Math.min(WIN, +(total - ss).toFixed(2));
  const ea = env(raw(master, ss)), eb = env(raw(render, ss));
  const mean = (v) => v.reduce((a, c) => a + c, 0) / v.length;
  const ma = mean(ea), mb = mean(eb);
  let best = { r: -2, lag: 0 };
  for (let lag = -120; lag <= 120; lag++) {
    let num = 0, da = 0, db = 0;
    for (let i = 200; i < ea.length - 200; i++) {
      const j = i + lag; if (j < 0 || j >= eb.length) continue;
      const x = ea[i] - ma, y = eb[j] - mb; num += x * y; da += x * x; db += y * y;
    }
    const r = num / Math.sqrt(da * db);
    if (r > best.r) best = { r, lag };
  }
  const ms = best.lag * (W / SR) * 1000;
  lags.push(ms);
  console.log(`tramo ${ss}s-${(ss + DUR).toFixed(1)}s: lag = ${ms.toFixed(1)}ms  (r=${best.r.toFixed(4)})`);
}
const avg = lags.reduce((a, c) => a + c, 0) / lags.length;
console.log(`\npromedio: ${avg.toFixed(1)}ms ${avg > 0 ? "(el audio del RENDER va ATRASADO → los captions entran antes que la voz)" : ""}`);
console.log(`constante entre tramos: ${(Math.max(...lags) - Math.min(...lags)).toFixed(1)}ms de dispersión`);
