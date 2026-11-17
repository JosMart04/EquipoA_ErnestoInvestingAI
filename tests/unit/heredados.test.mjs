// Módulos heredados (Dashboard, Watchlist): modelo de vista sobre los datos del profesor. [T-19] [T-20] [R-HER-01] [R-HER-02]
import test from "node:test";
import assert from "node:assert/strict";
import Dash from "../../js/dashboard.js";
import W from "../../js/watchlist.js";
import { dato, leer } from "./_util.mjs";

const c02 = dato("02_precios_sinteticos_504d.json"), c03 = dato("03_ohlcv_sintetico_120d.json"), c10 = dato("10_dashboard_mercado.json"), c11 = dato("11_watchlist_alertas_portafolio_demo.json");

test("Dashboard: dentro de las 120 velas se dibujan velas; más allá, la línea de cierres", () => {
  const s6 = Dash.serieActivo(c02, c03, "AAPL", { sesiones: 63 });
  assert.equal(s6.tipo, "velas"); assert.equal(s6.c.length, 63); assert.equal(s6.fechas.at(-1), c03.fechas.at(-1));
  const s120 = Dash.serieActivo(c02, c03, "AAPL", { sesiones: 120 });
  assert.equal(s120.tipo, "velas"); assert.equal(s120.o.length, 120);
  const s1a = Dash.serieActivo(c02, c03, "AAPL", { sesiones: 252 });
  assert.equal(s1a.tipo, "linea"); assert.equal(s1a.c.length, 252);
  const todo = Dash.serieActivo(c02, c03, "AAPL", {});
  assert.equal(todo.tipo, "linea"); assert.equal(todo.c.length, c02.fechas.length);
  const f = Dash.serieActivo(c02, c03, "AAPL", { desde: "2026-09-01", hasta: "2026-09-30" });
  assert.equal(f.tipo, "velas"); assert.ok(f.fechas.every(x => x >= "2026-09-01" && x <= "2026-09-30"));
  assert.equal(Dash.serieActivo(c02, c03, "AAPL", { desde: "2030-01-01" }).tipo, "vacia");
  assert.equal(s6.c.at(-1), c10.find(a => a.ticker === "AAPL").ultimo, "un activo tiene un solo último precio (R-INT-04)");
});

test("Dashboard: estadísticas del resumen y filtro por grupo", () => {
  const e = Dash.estadisticas(Dash.serieActivo(c02, c03, "NVDA", { sesiones: 120 }));
  assert.equal(e.n, 120);
  assert.ok(e.min <= e.primero && e.min <= e.ultimo && e.max >= e.ultimo);
  assert.equal(Dash.filasUniverso(c10, "").length, 26);
  assert.equal(Dash.filasUniverso(c10, "Magnificas 7").length, 7);
  assert.deepEqual(Dash.REFERENCIAS, ["SPY", "QQQ", "EPU"]);
});

test("Watchlist: reglas de disparo de las alertas (contrato §2, archivo 11)", () => {
  const nvda = c10.find(a => a.ticker === "NVDA");
  assert.equal(W.alertaDisparada({ tipo: "precio_sobre", umbral: nvda.ultimo, activa: true }, nvda), true, "igual al umbral dispara");
  assert.equal(W.alertaDisparada({ tipo: "precio_sobre", umbral: nvda.ultimo + 1, activa: true }, nvda), false);
  assert.equal(W.alertaDisparada({ tipo: "precio_bajo", umbral: nvda.ultimo + 1, activa: true }, nvda), true);
  assert.equal(W.alertaDisparada({ tipo: "var_1d_menor_a_pct", umbral: nvda.var_1d_pct, activa: true }, nvda), true);
  assert.equal(W.alertaDisparada({ tipo: "var_1d_mayor_a_pct", umbral: nvda.var_1d_pct + 0.01, activa: true }, nvda), false);
  assert.equal(W.alertaDisparada({ tipo: "precio_bajo", umbral: nvda.ultimo + 1, activa: false }, nvda), false, "una alerta inactiva nunca se dispara");
  const ini = W.alertasIniciales(c11);
  assert.equal(ini.length, c11.alertas.length);
  assert.ok(ini.every(a => a.id && W.TIPOS.includes(a.tipo)));
  // Con los datos del profesor ninguna alerta inicial está disparada
  assert.equal(ini.filter(a => W.alertaDisparada(a, c10.find(x => x.ticker === a.ticker))).length, 0);
});

test("Watchlist: validación de alertas y del activo que se agrega", () => {
  const tk = c10.map(a => a.ticker);
  assert.deepEqual(W.validarAlerta({ ticker: "NVDA", tipo: "precio_sobre", umbral: "180" }, tk), {});
  assert.deepEqual(W.validarAlerta({ ticker: "NVDA", tipo: "precio_sobre", umbral: "" }, tk), { umbral: "numero" });
  assert.deepEqual(W.validarAlerta({ ticker: "NVDA", tipo: "precio_bajo", umbral: "-3" }, tk), { umbral: "positivo" });
  assert.deepEqual(W.validarAlerta({ ticker: "NVDA", tipo: "var_1d_menor_a_pct", umbral: "-3" }, tk), {}, "una variación puede ser negativa");
  assert.deepEqual(W.validarAlerta({ ticker: "XXX", tipo: "otro", umbral: "1" }, tk), { ticker: "ticker", tipo: "tipo" });
  assert.equal(W.tickerDeTexto("nvda", c10), "NVDA");
  assert.equal(W.tickerDeTexto("NVDA · NVIDIA", c10), "NVDA");
  assert.equal(W.tickerDeTexto("Southern", c10), "SCCO");
  assert.equal(W.tickerDeTexto("zzz", c10), null);
  assert.equal(W.tickerDeTexto("", c10), null);
});

test("Watchlist: minigráfico de 60 sesiones", () => {
  const m = W.minigrafico(c02, "SPY");
  assert.equal(m.cierres.length, W.SESIONES_MINIGRAFICO);
  assert.equal(m.hasta, c02.fechas.at(-1));
  assert.ok(m.min <= m.max);
  assert.equal(W.minigrafico(c02, "NO_EXISTE"), null);
});

test("index.html y watchlist.html: sin cifras escritas a mano, sin script en línea y con sus contenedores", () => {
  for (const [pag, ids] of [["index.html", ["kpis", "activo", "rango", "desde", "hasta", "grafico", "filtro-grupo", "universo"]], ["watchlist.html", ["agregar", "lista", "alertas", "nuevo-ticker", "nuevo-tipo", "nuevo-umbral", "resumen-alertas"]]]) {
    const h = leer(pag);
    for (const id of ids) assert.ok(h.includes(`id="${id}"`), pag + " falta #" + id);
    assert.ok(!/<script>(?!<\/script>)/.test(h), pag + ": el JS del módulo vive en js/");
    const visible = h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
    assert.ok(!/\d/.test(visible), pag + ": hay dígitos en el texto de la página: " + (visible.match(/\S*\d\S*/) || [""])[0]);
  }
});
