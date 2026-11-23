// tools/i18n/ensamblar.mjs — arma locales/<tag>.json a partir de tandas de traducción (JSON parciales por secciones)
// en el orden de claves de es-PE, con los metadatos de borrador, y rechaza cifras sueltas fuera de datos.*.
// Uso: node tools/i18n/ensamblar.mjs <carpeta_con_tandas>/<tag> <tag> [--parcial]
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const [carpeta, tag] = process.argv.slice(2);
const parcial = process.argv.includes("--parcial");
const fuente = JSON.parse(readFileSync(join(RAIZ, "locales", "es-PE.json"), "utf8"));

/** Une las tandas (cada una con secciones completas o parciales). */
const unido = {};
const fundir = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && typeof v.other !== "string" ? fundir(a[k], v) : v; return a; };
for (const f of readdirSync(carpeta).filter(x => x.endsWith(".json")).sort()) fundir(unido, JSON.parse(readFileSync(join(carpeta, f), "utf8")));

/** Reordena según es-PE; conserva lo que no está en es-PE (datos.textos). */
function ordenar(ref, obj) {
  if (!obj || typeof obj !== "object" || typeof obj.other === "string") return obj;
  const r = {};
  for (const k of Object.keys(ref || {})) if (k in obj) r[k] = ordenar(ref[k], obj[k]);
  for (const k of Object.keys(obj)) if (!(k in r)) r[k] = obj[k];
  return r;
}
const salida = Object.assign({ _meta: { estado: "borrador", parcial, revisado_por: null, generado_con: "Claude Opus 5.5 (Claude Code), desde es-PE", fecha: new Date().toISOString().slice(0, 10),
  nota: "Traducción en borrador generada con IA: requiere revisión de una persona hablante competente (Spec W13 G.10.4)." } }, ordenar(fuente, unido));

// Cifras sueltas fuera de datos.* (los números van como {parámetros}); los términos permitidos son los de las pruebas
const permitidos = [/IHC 2026-II/g, /CC BY 4\.0/g, /1\/N/g, /p10–p90|\bp10\b|\bp90\b/g, /CVaR 95/g, /\bG1[017]?\b|\bG2\b/g, /\bF1\b/g, /WCAG 2\.2/g, /390 px/g, /Alt\+Shift\+\w/g, /\(1 \+ [^)]+\)/g];
const exenta = k => k.startsWith("datos.") || k.startsWith("_meta") || k === "nav.regresion" || k === "regresion.titulo" || /\.titulo_pagina$/.test(k);
const malos = [];
(function recorrer(o, ruta) {
  for (const [k, v] of Object.entries(o)) {
    const c = ruta ? ruta + "." + k : k;
    if (v && typeof v === "object") recorrer(v, c);
    else if (typeof v === "string" && !exenta(c)) { let s = v.replace(/\{\w+\}/g, ""); for (const p of permitidos) s = s.replace(p, ""); if (/\p{Nd}/u.test(s)) malos.push(c + ": " + v); }
  }
})(salida, "");
if (malos.length) { console.error("Cifras sueltas:\n  " + malos.join("\n  ")); process.exit(1); }
writeFileSync(join(RAIZ, "locales", tag + ".json"), JSON.stringify(salida, null, 2) + "\n", "utf8");
console.log(`locales/${tag}.json escrito`);
