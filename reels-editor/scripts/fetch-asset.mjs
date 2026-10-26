#!/usr/bin/env node
// fetch-asset.mjs — busca y descarga assets libres con filtro de licencia obligatorio. Node 18+, sin dependencias.
//   node fetch-asset.mjs search <pexels|pixabay|archive|openverse> <video|photo|audio> "<query en inglés>"
//   node fetch-asset.mjs get    <fuente> <id>      (id tal como lo imprime search; ej. video-123)
//   node fetch-asset.mjs --selftest
// Raíz del proyecto ($PROJ): --proj <dir>, o env PROJ, o el primer directorio hacia arriba con hyperframes.json.
// Salidas: $PROJ/assets/fetched/, $PROJ/assets/LICENSES.tsv, $PROJ/assets/.cache/pixabay-search.json (caché 24 h).
// Claves: PIXABAY_API_KEY y PEXELS_API_KEY (opcional: sin clave se salta la fuente). Nunca se imprimen ni se guardan.
import { mkdirSync, appendFileSync, existsSync, writeFileSync, readFileSync, createWriteStream, unlinkSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { dirname, join, resolve } from "node:path";

function findProj(flag) {
  if (flag) return resolve(flag);
  if (process.env.PROJ) return resolve(process.env.PROJ);
  for (let d = process.cwd(); ; d = dirname(d)) {
    if (existsSync(join(d, "hyperframes.json"))) return d;
    if (dirname(d) === d) return process.cwd();
  }
}
const pi = process.argv.indexOf("--proj");
const ROOT = findProj(pi >= 0 ? process.argv[pi + 1] : null);
const OUT = join(ROOT, "assets", "fetched");
const TSV = join(ROOT, "assets", "LICENSES.tsv");
const CACHE = join(ROOT, "assets", ".cache", "pixabay-search.json");
const TTL_MS = 24 * 3600 * 1000; // Pixabay exige cachear las búsquedas 24 h
const UA = "fetch-asset/1.0 (local editing tool)";

// ---- licencias: solo CC0 / public domain / Pexels / Pixabay. CC-BY solo con --allow-by. ----
export function classify(lic) {
  const s = String(lic || "").trim().toLowerCase();
  if (!s || /unknown|desconoc|all rights|copyright(?!-free)/.test(s)) return "rejected";
  if (/(^|[\s_/-])(nc|sa|nd)([\s_/.-]|$)/.test(s) || /non-?commercial|share-?alike/.test(s)) return "rejected";
  if (/^cc0|cc0 |zero|publicdomain\/zero|public domain|^pdm|publicdomain\/mark/.test(s)) return "free";
  if (s === "pexels license" || s === "pixabay content license") return "free";
  if (/^cc[ -]by|by\//.test(s)) return "by";
  return "rejected";
}
export const allowed = (lic, allowBy = false) => { const c = classify(lic); return c === "free" || (allowBy && c === "by"); };
export const needsCredit = (lic) => (classify(lic) === "free" ? "no" : "sí");
export const tsvClean = (v) => String(v ?? "").replace(/[\t\r\n]+/g, " ").trim();

// ---- util ----
class Stop extends Error { constructor(m, code) { super(m); this.code = code; } }
const die = (m) => { throw new Stop(m, 1); };
const key = (n) => process.env[n] || null;
async function getJson(url, headers = {}) {
  let r;
  try { r = await fetch(url, { headers: { "User-Agent": UA, ...headers } }); }
  catch (e) { throw new Error(`red: ${e.cause?.code || e.message}`); }
  if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
  return r.json();
}
// Caché de búsquedas Pixabay: la clave es tipo+query (NUNCA la API key). Un fallo de lectura/escritura no es fatal.
export const cacheFresh = (entry, now = Date.now()) => !!entry && now - entry.t < TTL_MS;
function cacheGet(k) { try { const e = JSON.parse(readFileSync(CACHE, "utf8"))[k]; return cacheFresh(e) ? e.v : null; } catch { return null; } }
function cachePut(k, v) {
  try {
    let c = {}; try { c = JSON.parse(readFileSync(CACHE, "utf8")); } catch {}
    for (const x of Object.keys(c)) if (!cacheFresh(c[x])) delete c[x];
    c[k] = { t: Date.now(), v }; mkdirSync(dirname(CACHE), { recursive: true }); writeFileSync(CACHE, JSON.stringify(c));
  } catch {}
}
const fmtDur = (s) => (s == null ? "-" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);
const split = (id) => { const m = /^(video|photo)-(.+)$/.exec(id); return m ? [m[1], m[2]] : ["video", id]; };

// Cada fuente devuelve candidatos {id,title,dur,res,author,license,page,file?} ya filtrados por licencia.
const sources = {
  pexels: {
    types: ["video", "photo"], keyVar: "PEXELS_API_KEY",
    async search(type, q) {
      const h = { Authorization: key("PEXELS_API_KEY") };
      if (type === "video") {
        const d = await getJson(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=5`, h);
        return (d.videos || []).map((v) => ({ id: `video-${v.id}`, title: v.url.split("/").filter(Boolean).pop(), dur: v.duration, res: `${v.width}x${v.height}`, author: v.user?.name, license: "Pexels License", page: v.url }));
      }
      const d = await getJson(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=5`, h);
      return (d.photos || []).map((p) => ({ id: `photo-${p.id}`, title: p.alt || `photo ${p.id}`, res: `${p.width}x${p.height}`, author: p.photographer, license: "Pexels License", page: p.url }));
    },
    async resolve(id) {
      const h = { Authorization: key("PEXELS_API_KEY") }, [type, n] = split(id);
      if (type === "video") {
        const v = await getJson(`https://api.pexels.com/videos/videos/${n}`, h);
        const files = (v.video_files || []).filter((x) => x.file_type === "video/mp4" && x.width).sort((a, b) => b.width * b.height - a.width * a.height).map((x) => ({ url: x.link, res: `${x.width}x${x.height}` }));
        if (!files.length) throw new Error("sin archivo mp4");
        return { id, title: v.url.split("/").filter(Boolean).pop(), author: v.user?.name, license: "Pexels License", page: v.url, files, ext: "mp4" };
      }
      const p = await getJson(`https://api.pexels.com/v1/photos/${n}`, h);
      return { id, title: p.alt || `photo ${n}`, author: p.photographer, license: "Pexels License", page: p.url, file: p.src.large2x || p.src.original, ext: "jpg" };
    },
  },
  pixabay: {
    types: ["video", "photo"], keyVar: "PIXABAY_API_KEY",
    async search(type, q) {
      const k = key("PIXABAY_API_KEY");
      const base = type === "video" ? "https://pixabay.com/api/videos/" : "https://pixabay.com/api/";
      const ck = `${type}|${q.toLowerCase().trim()}`;
      let d = cacheGet(ck);
      if (d) console.error("(Pixabay: respuesta en caché, <24 h)");
      else { d = await getJson(`${base}?key=${encodeURIComponent(k)}&q=${encodeURIComponent(q)}&per_page=5&safesearch=true`); cachePut(ck, d); }
      return (d.hits || []).map((h) => ({ id: `${type}-${h.id}`, title: (h.tags || `${type} ${h.id}`), dur: h.duration, res: type === "video" ? `${h.videos?.large?.width || h.videos?.medium?.width}x${h.videos?.large?.height || h.videos?.medium?.height}` : `${h.imageWidth}x${h.imageHeight}`, author: h.user, license: "Pixabay Content License", page: h.pageURL }));
    },
    async resolve(id) {
      const k = key("PIXABAY_API_KEY"), [type, n] = split(id);
      const base = type === "video" ? "https://pixabay.com/api/videos/" : "https://pixabay.com/api/";
      const h = ((await getJson(`${base}?key=${encodeURIComponent(k)}&id=${encodeURIComponent(n)}`)).hits || [])[0];
      if (!h) throw new Error(`id ${id} no existe`);
      const files = type === "video"
        ? ["large", "medium", "small", "tiny"].map((t) => h.videos?.[t]).filter((x) => x?.url).map((x) => ({ url: x.url, res: `${x.width}x${x.height}` }))
        : [{ url: h.largeImageURL, res: `${h.imageWidth}x${h.imageHeight}` }];
      if (!files.length || !files[0].url) throw new Error("sin archivo descargable");
      return { id, title: h.tags, author: h.user, license: "Pixabay Content License", page: h.pageURL, files, ext: type === "video" ? "mp4" : "jpg" };
    },
  },
  archive: {
    types: ["audio"],
    async search(_t, q) {
      const query = `(${q}) AND mediatype:audio AND licenseurl:*zero*`;
      const d = await getJson(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=licenseurl&rows=5&output=json`);
      return (d.response?.docs || []).map((x) => ({ id: x.identifier, title: x.title, author: [].concat(x.creator || "-")[0], license: /zero/.test(x.licenseurl || "") ? "CC0 1.0" : "unknown", page: `https://archive.org/details/${x.identifier}` }));
    },
    async resolve(id) {
      const m = await getJson(`https://archive.org/metadata/${encodeURIComponent(id)}`);
      const url = m.metadata?.licenseurl || "";
      const f = (m.files || []).filter((x) => /mp3/i.test(x.format || "") && !/sample/i.test(x.name)).sort((a, b) => +a.size - +b.size)[0];
      if (!f) throw new Error("sin archivo MP3");
      return { id, title: m.metadata?.title, author: [].concat(m.metadata?.creator || "-")[0], license: /zero/.test(url) ? "CC0 1.0" : "unknown", page: `https://archive.org/details/${id}`, file: `https://archive.org/download/${encodeURIComponent(id)}/${f.name.split("/").map(encodeURIComponent).join("/")}`, ext: "mp3" };
    },
  },
  openverse: {
    types: ["audio"],
    async search(_t, q) {
      const d = await getJson(`https://api.openverse.org/v1/audio/?q=${encodeURIComponent(q)}&license=cc0,pdm&page_size=5`);
      return (d.results || []).map((x) => ({ id: x.id, title: x.title, dur: x.duration ? x.duration / 1000 : null, author: x.creator, license: x.license === "cc0" ? "CC0 1.0" : x.license === "pdm" ? "Public Domain Mark" : `CC ${x.license}`, page: x.foreign_landing_url }));
    },
    async resolve(id) {
      const x = await getJson(`https://api.openverse.org/v1/audio/${encodeURIComponent(id)}/`);
      return { id, title: x.title, author: x.creator, license: x.license === "cc0" ? "CC0 1.0" : x.license === "pdm" ? "Public Domain Mark" : `CC ${x.license}`, page: x.foreign_landing_url, file: x.url, ext: (x.filetype || "mp3").replace(/[^a-z0-9]/gi, "") };
    },
  },
};

function needKey(name) {
  const s = sources[name];
  if (s.keyVar && !key(s.keyVar)) { console.error(`AVISO: falta ${s.keyVar}; se salta '${name}'.`); return false; }
  return true;
}

async function cmdSearch(name, type, q, allowBy) {
  const s = sources[name];
  if (!s) die(`fuente desconocida '${name}'. Opciones: ${Object.keys(sources).join(", ")}`);
  if (!s.types.includes(type)) die(`'${name}' soporta: ${s.types.join(", ")}`);
  if (!q) die("falta la query (en inglés)");
  if (!needKey(name)) throw new Stop("", 2);
  let res;
  try { res = await s.search(type, q); } catch (e) { die(`${name}: la API falló (${e.message})`); }
  if (!res.length) die(`${name}: 0 resultados para "${q}" (no se probó otra fuente)`);
  const ok = res.filter((r) => allowed(r.license, allowBy));
  const dropped = res.length - ok.length;
  if (!ok.length) die(`${name}: ${res.length} resultados, todos rechazados por licencia`);
  ok.slice(0, 5).forEach((r, i) => console.log(`${i + 1}. id=${r.id} | ${tsvClean(r.title).slice(0, 70)} | ${r.dur != null ? fmtDur(r.dur) : "-"} ${r.res || ""} | ${r.author || "-"} | ${r.license} | ${r.page}`));
  if (dropped) console.log(`(${dropped} rechazados por licencia)`);
}

async function cmdGet(name, id, allowBy, maxMb) {
  const s = sources[name];
  if (!s) die(`fuente desconocida '${name}'`);
  if (!id) die("falta el id");
  if (!needKey(name)) throw new Stop("", 2);
  let a;
  try { a = await s.resolve(id); } catch (e) { die(`${name}: la API falló (${e.message})`); }
  if (!allowed(a.license, allowBy)) die(`licencia rechazada: "${a.license}" (${a.page})`);
  // Mejor resolución primero; si pesa más que el tope, baja al siguiente escalón y lo informa.
  const tiers = a.files || [{ url: a.file, res: "" }];
  let r, got; const skipped = [];
  for (const t of tiers) {
    if (!/^https:\/\//.test(t.url)) die("URL de descarga no https; abortado");
    try { r = await fetch(t.url, { headers: { "User-Agent": UA } }); } catch (e) { die(`descarga falló: ${e.cause?.code || e.message}`); }
    if (!r.ok) die(`descarga falló: HTTP ${r.status}`);
    const len = +r.headers.get("content-length") || 0;
    if (len > maxMb * 1048576) { await r.body?.cancel(); skipped.push(`${t.res} (${(len / 1048576).toFixed(0)} MB)`); r = null; continue; }
    got = t; break;
  }
  if (!r) die(`todas las resoluciones superan el tope de ${maxMb} MB: ${skipped.join(", ")} (usa --max-mb N); no se descargó nada`);
  mkdirSync(OUT, { recursive: true });
  const slug = tsvClean(a.title || id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const rel = join("assets", "fetched", `${name}-${tsvClean(id).replace(/[^a-z0-9_-]/gi, "")}-${slug}.${a.ext}`);
  const dest = join(ROOT, rel);
  try { await pipeline(Readable.fromWeb(r.body), createWriteStream(dest)); }
  catch (e) { try { unlinkSync(dest); } catch {} die(`descarga interrumpida: ${e.message}`); }
  if (!existsSync(TSV)) writeFileSync(TSV, ["fecha", "fuente", "id", "url_pagina", "licencia", "autor", "pide_credito", "archivo"].join("\t") + "\n");
  appendFileSync(TSV, [new Date().toISOString(), name, id, a.page, a.license, a.author, needsCredit(a.license), rel.replace(/\\/g, "/")].map(tsvClean).join("\t") + "\n");
  if (got.res) console.log(`resolución descargada: ${got.res}${skipped.length ? ` (se saltó ${skipped.join(", ")} por superar ${maxMb} MB)` : " (la mejor disponible)"}`);
  console.log(`OK → ${rel}\nlicencia: ${a.license} | crédito: ${needsCredit(a.license)} | registrado en assets/LICENSES.tsv`);
}

async function selftest() {
  const assert = (await import("node:assert/strict")).default;
  for (const l of ["CC0 1.0", "cc0", "Public Domain Mark", "Public domain", "pdm", "Pexels License", "Pixabay Content License", "https://creativecommons.org/publicdomain/zero/1.0/"]) assert.equal(allowed(l), true, `debe aceptar ${l}`);
  for (const l of ["CC BY-NC 4.0", "CC BY-NC-SA 3.0", "CC BY-NC-ND 3.0", "CC BY-SA 4.0", "CC BY-ND 2.0", "unknown", "", null, undefined, "All rights reserved", "Mixkit License", "noncommercial"]) assert.equal(allowed(l), false, `debe rechazar ${l}`);
  for (const l of ["CC BY 3.0", "CC BY 4.0", "cc-by"]) { assert.equal(allowed(l), false, `CC-BY rechazado por defecto: ${l}`); assert.equal(allowed(l, true), true, `CC-BY con --allow-by: ${l}`); }
  assert.equal(allowed("CC BY-NC 4.0", true), false, "NC nunca, ni con --allow-by");
  assert.equal(needsCredit("CC0 1.0"), "no"); assert.equal(needsCredit("CC BY 4.0"), "sí");
  assert.equal(tsvClean("a\tb\nc"), "a b c");
  assert.deepEqual(split("photo-42"), ["photo", "42"]); assert.deepEqual(split("99"), ["video", "99"]);
  assert.equal(cacheFresh({ t: Date.now() - 3600e3 }), true, "caché de 1 h vigente");
  assert.equal(cacheFresh({ t: Date.now() - 25 * 3600e3 }), false, "caché de 25 h vencida");
  assert.equal(cacheFresh(undefined), false);
  console.log("selftest OK (sin red)");
}

const [, , cmd, ...rest] = process.argv;
try {
const allowBy = rest.includes("--allow-by");
const mi = rest.indexOf("--max-mb");
const maxMb = mi >= 0 ? +rest[mi + 1] || 40 : 40;
const pj = rest.indexOf("--proj");
const args = rest.filter((a, i) => !["--allow-by", "--max-mb", "--proj"].includes(a) && !(mi >= 0 && i === mi + 1) && !(pj >= 0 && i === pj + 1));
if (cmd === "--selftest") await selftest();
else if (cmd === "search") await cmdSearch(args[0], args[1], args[2], allowBy);
else if (cmd === "get") await cmdGet(args[0], args[1], allowBy, maxMb);
else console.log('uso:\n  search <pexels|pixabay|archive|openverse> <video|photo|audio> "<query en inglés>"\n  get <fuente> <id>\n  --selftest   (opciones: --allow-by habilita CC-BY; --max-mb N tope de descarga, default 40)');
} catch (e) {
  if (!(e instanceof Stop)) throw e;
  if (e.message) console.error("ERROR: " + e.message);
  process.exitCode = e.code; // sin process.exit(): evita el assert de libuv en Windows con fetch pendiente
}
