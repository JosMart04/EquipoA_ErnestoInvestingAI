// tools/capturas_ui.mjs — capturas de la interfaz ANTES y DESPUÉS de la iteración 2 (Spec W13 G.1.2, G.4 y G.9).
// «Antes» es la etiqueta git ui-antes (el sitio al cerrar el Lab 13); «después», este directorio de trabajo.
// Sirve cada versión con python -m http.server en un puerto libre y fotografía con Playwright (Microsoft Edge):
// perfil limpio por captura, «reducir movimiento» (la cinta queda quieta y los gráficos sin animación), el tema pedido
// y la hora fija (viernes 20-nov-2026, 10:30 en Nueva York: mercado abierto), para que las capturas se puedan repetir.
// Salida: docs/capturas/ui/antes/<nombre>.png y docs/capturas/ui/despues/<nombre>.png.
//
// Uso: node tools/capturas_ui.mjs [--antes <carpeta con ui-antes>] [nombre…]
//   Sin --antes crea un worktree temporal de ui-antes y lo borra al terminar.
import { createRequire } from "node:module";
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(REPO, "tests", "package.json"));
const { chromium } = require("@playwright/test");
const SALIDA = join(REPO, "docs", "capturas", "ui");
const HORA = new Date("2026-11-20T15:30:00Z");
const AMBAS = ["antes", "despues"], DESPUES = ["despues"];

/* ── Acciones antes de la foto (solo usan controles que existen en la versión que se fotografía) ── */
const esperar = ms => new Promise(r => setTimeout(r, ms));
/** Una orden desde el formulario de Trading, confirmada en su diálogo. */
async function enviarOrden(p, tk, n) {
  await p.selectOption("#orden-activo", tk); await p.fill("#orden-cantidad", n);
  await p.click('#form-orden button[type="submit"]'); await p.waitForSelector("dialog[open]");
  await p.click("dialog[open] button.primary"); await esperar(400);
}
const acciones = {
  async menu(p) { await p.click("#btn-modulos"); await esperar(400); },
  async buscador(p) { await p.keyboard.press("Control+K"); await p.waitForSelector("#buscar-q"); await p.keyboard.type("nv"); await esperar(300); },
  async notificaciones(p) {
    // En un perfil limpio no hay nada que avisar: primero una orden confirmada, que llega a la campana
    await enviarOrden(p, "MSFT", "3");
    await p.goto(p.url().replace("trading.html", "index.html")); await listo(p);
    await p.click("#btn-notif"); await esperar(300);
  },
  async recorrido(p) { await p.click('.franja-tour button[data-franja="si"]'); await esperar(500); },
  async confirmacion(p) {
    await p.selectOption("#orden-activo", "NVDA"); await p.fill("#orden-cantidad", "5");
    await p.click('#form-orden button[type="submit"]'); await p.waitForSelector("dialog[open]"); await esperar(300);
  },
  async ordenes(p) {
    // Dos órdenes reales por la interfaz de Trading (con su confirmación) y luego el historial
    for (const [tk, n] of [["NVDA", "5"], ["AAPL", "8"]]) await enviarOrden(p, tk, n);
    await p.goto(p.url().replace("trading.html", "ordenes.html")); await listo(p);
  },
  async perfil(p) {
    await p.fill("#alias", "Ana María"); await p.click('#form-alias button[type="submit"]');
    for (const [q, o] of [["p1", "b"], ["p2", "b"], ["p3", "c"], ["p4", "b"], ["p5", "b"]]) await p.check(`input[name="${q}"][value="${o}"]`);
    await p.click('#form-riesgo button[type="submit"]'); await esperar(400);
    await p.evaluate(() => window.scrollTo(0, 0));
  }
};

// [nombre, página, ancho, alto, tema, idioma, versiones, acción]
const CAPTURAS = [
  ["dashboard", "index.html", 1280, 900, "claro", "es-PE", AMBAS],
  ["dashboard-oscuro", "index.html", 1280, 900, "oscuro", "es-PE", AMBAS],
  ["dashboard-375", "index.html", 375, 812, "claro", "es-PE", AMBAS],
  ["menu-375", "index.html", 375, 812, "claro", "es-PE", AMBAS, "menu"],
  ["dashboard-ar", "index.html", 1280, 900, "claro", "ar-EG", AMBAS],
  ["clasificacion", "clasificacion.html?t=NVDA", 1280, 900, "claro", "es-PE", AMBAS],
  ["trading", "trading.html", 1280, 900, "claro", "es-PE", AMBAS],
  ["configuracion", "configuracion.html", 1280, 900, "oscuro", "es-PE", AMBAS],
  ["activo", "activo.html?t=NVDA", 1280, 900, "claro", "es-PE", DESPUES],
  ["activo-ar", "activo.html?t=NVDA", 1280, 900, "oscuro", "ar-EG", DESPUES],
  ["comparador", "comparador.html?activos=NVDA,AAPL,MSFT", 1280, 900, "claro", "es-PE", DESPUES],
  ["confirmacion", "trading.html", 1280, 900, "claro", "es-PE", DESPUES, "confirmacion"],
  ["ordenes", "trading.html", 1280, 900, "claro", "es-PE", DESPUES, "ordenes"],
  ["notificaciones", "trading.html", 1280, 900, "claro", "es-PE", DESPUES, "notificaciones"],
  ["buscador", "index.html", 1280, 900, "oscuro", "es-PE", DESPUES, "buscador"],
  ["recorrido", "index.html", 1280, 900, "claro", "es-PE", DESPUES, "recorrido"],
  ["perfil", "perfil.html", 1280, 900, "claro", "es-PE", DESPUES, "perfil"],
  ["perfil-375-oscuro", "perfil.html", 375, 812, "oscuro", "es-PE", DESPUES],
  ["ayuda", "ayuda.html", 1280, 900, "claro", "es-PE", DESPUES],
  ["acerca", "acerca.html", 1280, 900, "claro", "ja-JP", DESPUES]
];

const puertoLibre = () => new Promise(ok => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
async function servir(raiz) {
  const puerto = await puertoLibre();
  const proc = spawn("python", ["-m", "http.server", String(puerto), "--bind", "127.0.0.1", "--directory", raiz], { stdio: "ignore" });
  const base = `http://127.0.0.1:${puerto}/`;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) return { proc, base }; } catch (e) { /* aún no responde */ } await esperar(250); }
  throw new Error("El servidor no respondió: " + base);
}
/** La página terminó de cargar: sin esqueleto ni aria-busy, y un respiro para los gráficos. */
async function listo(p) {
  await p.waitForLoadState("networkidle");
  await p.waitForFunction(() => !document.querySelector("main.cargando, [aria-busy=\"true\"]"), null, { timeout: 15000 }).catch(() => {});
  await esperar(900);
}

const arg = n => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : null; };
const pedidas = process.argv.slice(2).filter((a, i, l) => !a.startsWith("--") && l[i - 1] !== "--antes");
let raizAntes = arg("antes"), worktree = null;
if (!raizAntes) {
  worktree = join(mkdtempSync(join(tmpdir(), "eia-ui-")), "ui-antes");
  execFileSync("git", ["worktree", "add", "--detach", worktree, "ui-antes"], { cwd: REPO, stdio: "ignore" });
  raizAntes = worktree;
}
const servidores = { antes: await servir(resolve(raizAntes)), despues: await servir(REPO) };
const navegador = await chromium.launch({ headless: true, channel: process.env.MEDIR_CANAL || "msedge" });
let fallas = 0;
try {
  for (const v of AMBAS) mkdirSync(join(SALIDA, v), { recursive: true });
  for (const [nombre, pagina, ancho, alto, tema, idioma, versiones, accion] of CAPTURAS) {
    if (pedidas.length && !pedidas.includes(nombre)) continue;
    for (const v of versiones) {
      const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, colorScheme: tema === "oscuro" ? "dark" : "light", reducedMotion: "reduce", locale: idioma });
      const p = await ctx.newPage();
      const errores = [];
      p.on("pageerror", e => errores.push(e.message));
      try {
        await p.clock.setFixedTime(HORA);
        await p.goto(servidores[v].base + pagina + (pagina.includes("?") ? "&" : "?") + "lang=" + idioma);
        await listo(p);
        if (accion) await acciones[accion](p);
        const destino = join(SALIDA, v, nombre + ".png");
        await p.screenshot({ path: destino });
        console.log(`ok    ${v}/${nombre}${errores.length ? "  (errores: " + errores.join(" | ") + ")" : ""}`);
        if (errores.length) fallas++;
      } catch (e) {
        fallas++; console.log(`FALLA ${v}/${nombre}: ${e.message.split("\n")[0]}`);
      } finally { await ctx.close(); }
    }
  }
} finally {
  await navegador.close();
  for (const s of Object.values(servidores)) s.proc.kill();
  if (worktree) { try { execFileSync("git", ["worktree", "remove", "--force", worktree], { cwd: REPO, stdio: "ignore" }); } catch (e) { /* se limpia con git worktree prune */ } }
}
if (fallas) { console.log(`${fallas} captura(s) con problemas`); process.exitCode = 1; }
