// tools/capturas.mjs — capturas del sitio para el informe (docs/capturas/sitio/), con Microsoft Edge sin ventana.
// Requiere el sitio servido en http://localhost:8000 (python -m http.server 8000).
// Cada captura usa un perfil limpio (el modo y el idioma no se arrastran entre capturas), «reducir movimiento»
// (los gráficos se dibujan sin animación) y el tema pedido. Uso: node tools/capturas.mjs [nombre…]
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const EDGE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const BASE = "http://localhost:8000/";
const SALIDA = resolve("docs/capturas/sitio");
const FIGMA = "https://misty-umber-07813177.figma.site/";
// [nombre, página con parámetros, ancho, alto, tema]
const CAPTURAS = [
  ["dashboard-claro", "index.html?lang=es-PE", 1280, 1150, "claro"],
  ["dashboard-oscuro", "index.html?lang=es-PE", 1280, 1150, "oscuro"],
  ["watchlist-claro", "watchlist.html?lang=es-PE", 1280, 1000, "claro"],
  ["trading-claro", "trading.html?lang=es-PE", 1280, 1000, "claro"],
  ["leaderboard-claro", "leaderboard.html?lang=es-PE", 1280, 900, "claro"],
  ["clasificacion-claro", "clasificacion.html?lang=es-PE&t=NVDA", 1280, 1700, "claro"],
  ["regresion-claro", "regresion.html?lang=es-PE&t=NVDA", 1280, 1700, "claro"],
  ["optimizador-claro", "optimizador.html?lang=es-PE", 1280, 1800, "claro"],
  ["optimizador-oscuro", "optimizador.html?lang=es-PE", 1280, 1800, "oscuro"],
  ["portafolios-claro", "portafolios.html?lang=es-PE", 1280, 1700, "claro"],
  ["backtesting-claro", "backtesting.html?lang=es-PE&nivel=Agresivo", 1280, 3200, "claro"],
  ["backtesting-real", "backtesting.html?modo=real&lang=es-PE", 1280, 3200, "claro"],
  ["regresion-real", "regresion.html?modo=real&lang=es-PE&t=NVDA", 1280, 1700, "claro"],
  ["clasificacion-en", "clasificacion.html?lang=en-US&t=NVDA", 1280, 1000, "claro"],


  ["barrido", "clasificacion.html?lang=es-PE&barrido=1", 1280, 900, "claro"],
  // Diseño en Figma Make (sitio publicado del archivo de Make; rutas con «#/»): van a docs/capturas/figma/
  ["figma/galeria", FIGMA, 1280, 1100, "claro"],
  ["figma/clasificacion", FIGMA + "#/clasificacion", 1280, 1300, "claro"],
  ["figma/optimizador", FIGMA + "#/optimizador", 1280, 1300, "claro"],
  ["figma/backtesting", FIGMA + "#/backtesting", 1280, 1300, "claro"],
  ["figma/portafolios-oscuro", FIGMA + "?tema=oscuro#/portafolios", 1280, 1300, "claro"]
];

if (!EDGE) throw new Error("No se encontró Microsoft Edge");
if (!existsSync(SALIDA)) mkdirSync(SALIDA, { recursive: true });
const pedidas = process.argv.slice(2);
for (const [nombre, pagina, ancho, alto, tema] of CAPTURAS) {
  if (pedidas.length && !pedidas.includes(nombre)) continue;
  const perfil = mkdtempSync(join(tmpdir(), "eia-edge-"));
  const destino = nombre.startsWith("figma/") ? resolve("docs/capturas", nombre + ".png") : join(SALIDA, nombre + ".png");
  const url = /^https?:/.test(pagina) ? pagina : BASE + pagina;
  try {
    if (existsSync(destino)) rmSync(destino);
    execFileSync(EDGE, ["--headless", "--disable-gpu", "--no-first-run", "--hide-scrollbars", "--force-prefers-reduced-motion",
      `--blink-settings=preferredColorScheme=${tema === "oscuro" ? 0 : 1}`, `--user-data-dir=${perfil}`,
      `--window-size=${ancho},${alto}`, "--virtual-time-budget=10000", `--screenshot=${destino}`, url], { stdio: "ignore", timeout: 90000 });
    // Edge puede devolver el control antes de escribir el archivo: se espera hasta 60 s
    const t0 = Date.now();
    while (!existsSync(destino) && Date.now() - t0 < 60000) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    console.log((existsSync(destino) ? "ok   " : "FALTA ") + nombre);
  } finally { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500); try { rmSync(perfil, { recursive: true, force: true, maxRetries: 5 }); } catch (e) { /* Edge aún usa el perfil temporal: queda en %TEMP% */ } }
}
