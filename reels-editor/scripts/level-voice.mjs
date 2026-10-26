#!/usr/bin/env node
// Nivela una voz en off: sube volumen, parejo de punta a punta (arregla voces que se van bajando).
// Cadena 100% ffmpeg (sin subir el audio a ningún servicio): highpass -> denoise suave ->
// dynaudnorm (leveler que sigue el nivel ventana a ventana) -> compresor -> loudnorm 2 pasadas (EBU R128) -> limiter.
// Uso: node level-voice.mjs <in> <out.wav> [LUFS=-14] [--no-denoise]
import { spawnSync } from 'node:child_process';
const [,, inp, out, lufsArg] = process.argv;
if (!inp || !out) { console.error('uso: level-voice.mjs <in> <out.wav> [LUFS] [--no-denoise]'); process.exit(1); }
const I = Number(lufsArg && !lufsArg.startsWith('--') ? lufsArg : -14);
const denoise = !process.argv.includes('--no-denoise');
const pre = ['highpass=f=70', denoise ? 'afftdn=nr=12:nf=-45' : null,
  'dynaudnorm=f=300:g=21:p=0.9:m=40:s=8:r=0.0',      // leveler: gauss 21 ventanas, hasta +32dB, suave
  'acompressor=threshold=-20dB:ratio=3:attack=15:release=250:makeup=2'].filter(Boolean).join(',');
const run = (a) => spawnSync('ffmpeg', a, { encoding: 'utf8', maxBuffer: 1 << 26 });
const m = run(['-hide_banner', '-i', inp, '-af', `${pre},loudnorm=I=${I}:TP=-1.5:LRA=7:print_format=json`, '-f', 'null', '-']).stderr;
const j = JSON.parse(m.slice(m.lastIndexOf('{'), m.lastIndexOf('}') + 1));
const ln = `loudnorm=I=${I}:TP=-1.5:LRA=7:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
const r = run(['-y', '-v', 'error', '-i', inp, '-af', `${pre},${ln},alimiter=limit=0.89`, '-ar', '48000', '-ac', '2', out]);
if (r.status) { console.error(r.stderr); process.exit(1); }
console.log(`ok -> ${out}  (medido antes de loudnorm: ${j.input_i} LUFS, objetivo ${I})`);
