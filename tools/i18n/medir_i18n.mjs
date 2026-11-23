// tools/i18n/medir_i18n.mjs — medición de truncados y desbordes por página, idioma, pseudolocalización y ancho
// (Lab 13 · Spec W13 G.5.5). Es una prueba técnica automática: sus filas NO son datos de personas.
//
// Versión A = el sitio antes de internacionalizar (etiqueta git i18n-antes, en un worktree): esa versión solo carga
// i18n/es-PE.json, así que se le entrega el diccionario del idioma medido en lugar del español. El <html> queda en
// lang="es-PE" y sin dir, como en la versión A del ejercicio 13.2 del profesor.
// Versión B = el sitio actual con ?lang=<locale>. La pseudolocalización se aplica igual en las dos versiones,
// transformando el diccionario que pide la página (js/lib/i18n-calidad.js, algoritmo del kit del profesor).
//
// Uso:
//   node tools/i18n/medir_i18n.mjs --version A --raiz <carpeta del sitio> [--dicc <carpeta con <locale>.json>]
//        [--locales es-PE,en-US] [--pseudo no,si] [--anchos 375,1280] [--paginas index,trading,...]
//        [--salida docs/i18n/medicion.csv] [--anexar] [--capturas <carpeta>]
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(join(REPO, "tests", "package.json"));
const { chromium } = require("@playwright/test");
const calidad = require(join(REPO, "js", "lib", "i18n-calidad.js"));

const arg = (n, def) => { const i = process.argv.indexOf("--" + n); return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def; };
const bandera = n => process.argv.includes("--" + n);
const VERSION = arg("version", "B");
const RAIZ = resolve(arg("raiz", REPO));
const DICC = resolve(arg("dicc", VERSION === "A" ? join(RAIZ, "i18n") : join(RAIZ, "locales")));
const LOCALES = arg("locales", "es-PE,en-US").split(",");
const PSEUDO = arg("pseudo", "no,si").split(",");
const ANCHOS = arg("anchos", "375,1280").split(",").map(Number);
// La versión A (i18n-antes) solo tiene los 9 módulos; la B mide todas las páginas de la barra lateral (PAGINAS_NAV)
const PAGINAS_A = "index,watchlist,trading,leaderboard,clasificacion,regresion,optimizador,portafolios,backtesting";
const PAGINAS_B = () => require(join(REPO, "js", "common.js")).PAGINAS_NAV.map(p => p[0].replace(/\.html$/, "")).join(",");
const PAGINAS = arg("paginas", VERSION === "A" ? PAGINAS_A : PAGINAS_B()).split(",");
const SALIDA = resolve(arg("salida", join(REPO, "docs", "i18n", "medicion_i18n_PRUEBA_TECNICA_BOT.csv")));
const CAPTURAS = arg("capturas", null);

/** Puerto libre para el servidor estático. */
const puertoLibre = () => new Promise(ok => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
async function esperarServidor(url) {
  for (let i = 0; i < 60; i++) { try { const r = await fetch(url); if (r.ok) return; } catch (e) { /* aún no responde */ } await new Promise(r => setTimeout(r, 250)); }
  throw new Error("El servidor no respondió: " + url);
}
function diccionario(locale, pseudo) {
  const f = join(DICC, locale + ".json");
  if (!existsSync(f)) throw new Error("No existe el diccionario " + f);
  const d = JSON.parse(readFileSync(f, "utf8"));
  return JSON.stringify(pseudo ? calidad.pseudoDiccionario(d) : d);
}

const puerto = await puertoLibre();
const servidor = spawn("python", ["-m", "http.server", String(puerto), "--bind", "127.0.0.1", "--directory", RAIZ], { stdio: "ignore" });
const BASE = `http://127.0.0.1:${puerto}/`;
const filas = [];
try {
  await esperarServidor(BASE);
  // Microsoft Edge (Chromium) ya está en Windows; con MEDIR_CANAL=chromium usa el Chromium de Playwright
  const navegador = await chromium.launch({ headless: true, channel: process.env.MEDIR_CANAL || "msedge" });
  const script = readFileSync(join(REPO, "js", "lib", "i18n-calidad.js"), "utf8");
  for (const pagina of PAGINAS) for (const locale of LOCALES) for (const ps of PSEUDO) for (const ancho of ANCHOS) {
    const pseudo = ps === "si" || ps === "sí";
    const ctx = await navegador.newContext({ viewport: { width: ancho, height: 900 }, locale: "es-PE", timezoneId: "America/Lima", reducedMotion: "reduce", colorScheme: "light" });
    const page = await ctx.newPage();
    if (VERSION === "A") await page.route("**/i18n/es-PE.json*", r => r.fulfill({ contentType: "application/json; charset=utf-8", body: diccionario(locale, pseudo) }));
    else if (pseudo) await page.route(`**/locales/${locale}.json*`, r => r.fulfill({ contentType: "application/json; charset=utf-8", body: diccionario(locale, true) }));
    const lang = VERSION === "A" ? "es-PE" : locale;
    await page.goto(`${BASE}${pagina}.html?lang=${lang}&modo=profesor`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.addScriptTag({ content: script });
    const m = await page.evaluate(loc => self.EIALib.i18nCalidad.medir(document, { locale: loc }), locale);
    if (CAPTURAS) { mkdirSync(CAPTURAS, { recursive: true }); await page.screenshot({ path: join(CAPTURAS, `${VERSION}_${pagina}_${locale}${pseudo ? "_pseudo" : ""}_${ancho}.png`), fullPage: false }); }
    filas.push(Object.assign({ hora: new Date().toISOString().slice(11, 19), locale, version: VERSION, pseudo: pseudo ? "sí" : "no", pagina, ancho }, m));
    console.log(`${VERSION} ${pagina} ${locale}${pseudo ? " pseudo" : ""} ${ancho}px → truncados ${m.truncados}, desbordes ${m.desbordes}, scroll ${m.scroll_horizontal}` +
      (m.desbordes ? "  " + m.ejemplos.desbordes.join(" ") : "") + (m.truncados ? "  " + m.ejemplos.truncados.join(" ") : ""));
    await ctx.close();
  }
  await navegador.close();
} finally {
  servidor.kill();
}
// Expansión: caracteres frente a es-PE en la misma versión, página, ancho y pseudolocalización
for (const f of filas) {
  const base = filas.find(g => g.locale === "es-PE" && g.version === f.version && g.pagina === f.pagina && g.ancho === f.ancho && g.pseudo === f.pseudo);
  f.expansion = base ? Math.round((f.caracteres / base.caracteres - 1) * 100) : "";
}
mkdirSync(dirname(SALIDA), { recursive: true });
let csv = calidad.aCSV(filas);
if (bandera("anexar") && existsSync(SALIDA)) csv = readFileSync(SALIDA, "utf8").replace(/\n?$/, "\n") + csv.split("\n").slice(1).join("\n");
writeFileSync(SALIDA, csv, "utf8");
console.log(`\n${filas.length} mediciones → ${SALIDA}`);
