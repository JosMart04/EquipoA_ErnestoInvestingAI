// tools/i18n/revisar.mjs — revisión de las traducciones contra es-PE (fuente): completitud, claves que faltan o sobran,
// parámetros {nombre}, categorías de plural CLDR de cada idioma y cifras sueltas. Con --escribir actualiza la
// completitud del manifiesto (locales/index.json). Las pruebas unitarias repiten estas reglas.
// Uso: node tools/i18n/revisar.mjs [--escribir]
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const leer = tag => JSON.parse(readFileSync(join(RAIZ, "locales", tag + ".json"), "utf8"));
const archivoManifiesto = join(RAIZ, "locales", "index.json");
const M = JSON.parse(readFileSync(archivoManifiesto, "utf8"));

/** {"a.b": texto} con los plurales como "a.b#cat"; sin metadatos ni textos opcionales de datos. */
function aplanar(o, p = "", s = {}) {
  for (const [k, v] of Object.entries(o)) {
    const c = p ? p + "." + k : k;
    if (k.startsWith("_") || c.startsWith("datos.textos")) continue;
    if (v && typeof v === "object") { if (typeof v.other === "string") for (const [cat, t] of Object.entries(v)) s[c + "#" + cat] = t; else aplanar(v, c, s); }
    else s[c] = v;
  }
  return s;
}
const params = s => (String(s).match(/\{\w+\}/g) || []).sort().join(",");
const categorias = tag => { const c = new Intl.PluralRules(tag).resolvedOptions().pluralCategories; return ["es", "fr", "pt", "it", "ca"].includes(tag.split("-")[0]) ? c.filter(x => x !== "many") : c; };

const fuente = aplanar(leer(M.fuente));
const basesFuente = new Set(Object.keys(fuente).map(k => k.split("#")[0]));
let problemas = 0;
for (const info of M.idiomas) {
  const d = aplanar(leer(info.tag)), bases = new Set(Object.keys(d).map(k => k.split("#")[0]));
  const faltan = [...basesFuente].filter(k => !bases.has(k)), sobran = [...bases].filter(k => !basesFuente.has(k));
  const malos = [];
  for (const [k, v] of Object.entries(d)) {
    const kb = k.split("#")[0], ref = fuente[kb] !== undefined ? fuente[kb] : fuente[kb + "#other"];
    if (ref === undefined) continue;
    const sinN = x => (k.includes("#") ? params(x).split(",").filter(q => q && q !== "{n}").join(",") : params(x));
    if (sinN(v) !== sinN(ref)) malos.push("parámetros " + k);
  }
  const plurales = new Set(Object.keys(d).filter(k => k.includes("#")).map(k => k.split("#")[0]));
  for (const k of plurales) for (const c of categorias(info.tag)) if (d[k + "#" + c] === undefined) malos.push(`plural ${k}: falta «${c}»`);
  const pct = Math.round(100 * (basesFuente.size - faltan.length) / basesFuente.size);
  info.completitud = pct;
  const n = (info.parcial ? 0 : faltan.length) + sobran.length + malos.length;
  problemas += n;
  console.log(`${info.tag.padEnd(6)} ${String(pct).padStart(3)} %  ${info.estado}${info.parcial ? " (parcial)" : ""}` +
    (faltan.length ? `  faltan ${faltan.length}` : "") + (sobran.length ? `  sobran ${sobran.length}: ${sobran.slice(0, 5).join(", ")}` : "") +
    (malos.length ? `\n         ${malos.slice(0, 8).join("\n         ")}` : ""));
}
if (process.argv.includes("--escribir")) {
  writeFileSync(archivoManifiesto, JSON.stringify(M, null, 2) + "\n", "utf8");
  console.log("completitud escrita en locales/index.json");
}
process.exitCode = problemas ? 1 : 0;
