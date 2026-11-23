// tools/i18n/fusionar.mjs — agrega un lote de claves nuevas a los locales/*.json existentes.
// El lote es un JSON {"es-PE": {...}, "en-US": {...}, "ar-EG": {...}, ...} con secciones parciales.
// Primero se funde es-PE (la fuente: las claves nuevas quedan al final de su sección) y luego cada idioma, que se
// reordena con las claves de es-PE. Rechaza claves que no existan en es-PE y cifras sueltas fuera de datos.*,
// con las mismas reglas que tools/i18n/ensamblar.mjs y las pruebas.
// Uso: node tools/i18n/fusionar.mjs <lote.json> [<lote2.json> …]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const archivo = tag => join(RAIZ, "locales", tag + ".json");
const leer = tag => JSON.parse(readFileSync(archivo(tag), "utf8"));
const escribir = (tag, d) => writeFileSync(archivo(tag), JSON.stringify(d, null, 2) + "\n", "utf8");
const esHoja = v => !v || typeof v !== "object" || typeof v.other === "string";

/** Funde b en a (las formas de plural {one, other…} son hojas). */
function fundir(a, b) {
  for (const [k, v] of Object.entries(b)) a[k] = !esHoja(v) && a[k] && !esHoja(a[k]) ? fundir(a[k], v) : v;
  return a;
}
/** Reordena según es-PE; lo que no está en es-PE (datos.textos, _meta) se conserva al final o al principio. */
function ordenar(ref, obj) {
  if (esHoja(obj)) return obj;
  const r = {};
  if ("_meta" in obj) r._meta = obj._meta;
  for (const k of Object.keys(ref || {})) if (k in obj) r[k] = ordenar(ref[k], obj[k]);
  for (const k of Object.keys(obj)) if (!(k in r)) r[k] = obj[k];
  return r;
}
/** Claves (con su ruta) de un lote que no existen en la referencia. */
function sobrantes(ref, obj, ruta = "") {
  const malas = [];
  for (const [k, v] of Object.entries(obj)) {
    const c = ruta ? ruta + "." + k : k;
    if (c.startsWith("datos.textos")) continue;
    if (!(k in (ref || {}))) malas.push(c);
    else if (!esHoja(v)) malas.push(...sobrantes(ref[k], v, c));
  }
  return malas;
}
const permitidos = [/IHC 2026-II/g, /CC BY 4\.0/g, /1\/N/g, /p10–p90|\bp10\b|\bp90\b/g, /CVaR 95/g, /\bG1[017]?\b|\bG2\b/g, /\bF1\b/g, /WCAG 2\.2/g, /390 px/g, /Alt\+Shift\+\w/g, /\(1 \+ [^)]+\)/g];
const exenta = k => k.startsWith("datos.") || k.startsWith("_meta") || k === "nav.regresion" || k === "regresion.titulo" || /\.titulo_pagina$/.test(k);
function cifras(o, ruta = "") {
  const malos = [];
  for (const [k, v] of Object.entries(o)) {
    const c = ruta ? ruta + "." + k : k;
    if (v && typeof v === "object") malos.push(...cifras(v, c));
    else if (typeof v === "string" && !exenta(c)) { let s = v.replace(/\{\w+\}/g, ""); for (const p of permitidos) s = s.replace(p, ""); if (/\p{Nd}/u.test(s)) malos.push(c + ": " + v); }
  }
  return malos;
}

const lotes = process.argv.slice(2);
if (!lotes.length) { console.error("Uso: node tools/i18n/fusionar.mjs <lote.json> […]"); process.exit(2); }
const lote = {};
for (const f of lotes) for (const [tag, secciones] of Object.entries(JSON.parse(readFileSync(f, "utf8")))) lote[tag] = fundir(lote[tag] || {}, secciones);

const errores = [];
for (const [tag, secciones] of Object.entries(lote)) {
  if (!existsSync(archivo(tag))) errores.push(`${tag}: no existe locales/${tag}.json`);
  for (const m of cifras(secciones)) errores.push(`${tag}: cifra suelta en ${m}`);
}
// es-PE primero: es la referencia de claves y de orden
const fuente = leer("es-PE");
if (lote["es-PE"]) fundir(fuente, lote["es-PE"]);
for (const [tag, secciones] of Object.entries(lote)) if (tag !== "es-PE") for (const c of sobrantes(fuente, secciones)) errores.push(`${tag}: la clave ${c} no existe en es-PE`);
if (errores.length) { console.error(errores.join("\n")); process.exit(1); }

escribir("es-PE", fuente);
for (const [tag, secciones] of Object.entries(lote)) {
  if (tag === "es-PE") continue;
  escribir(tag, ordenar(fuente, fundir(leer(tag), secciones)));
}
console.log(`Fundido en: ${Object.keys(lote).join(", ")}`);
