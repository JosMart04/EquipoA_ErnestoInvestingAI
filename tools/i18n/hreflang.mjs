// tools/i18n/hreflang.mjs — escribe en cada página los <link rel="alternate" hreflang> de los idiomas del manifiesto
// (locales/index.json) más x-default. La auditoría de 14 sitios del Lab 13 da 2 de 10 puntos por hreflang.
// Uso: node tools/i18n/hreflang.mjs   (después de agregar o quitar un idioma)
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PAGINAS = ["index", "watchlist", "trading", "leaderboard", "clasificacion", "regresion", "optimizador", "portafolios", "backtesting", "configuracion"].map(p => p + ".html");
const tags = JSON.parse(readFileSync(join(RAIZ, "locales", "index.json"), "utf8")).idiomas.map(i => i.tag);
for (const p of PAGINAS) {
  const f = join(RAIZ, p);
  let h = readFileSync(f, "utf8");
  const salto = h.includes("\r\n") ? "\r\n" : "\n";
  h = h.replace(/(\r?\n)?<link rel="alternate" hreflang="[^"]+" href="[^"]+">/g, ""); // se rehacen todos
  const enlaces = tags.map(t => `<link rel="alternate" hreflang="${t}" href="${p}?lang=${t}">`).concat(`<link rel="alternate" hreflang="x-default" href="${p}">`);
  h = h.replace(/(<link rel="stylesheet" href="css\/styles\.css">)/, (m) => m + salto + enlaces.join(salto));
  writeFileSync(f, h, "utf8");
  console.log(p + ": " + tags.length + " idiomas + x-default");
}
