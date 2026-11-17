// Cartera de Trading (EIA.cartera en el núcleo), Trading y Leaderboard. [T-21] [T-22] [R-HER-03] [R-HER-04]
import test from "node:test";
import assert from "node:assert/strict";
import comun from "../../js/common.js";
import Tr from "../../js/trading.js";
import L from "../../js/leaderboard.js";
import { dato, leer } from "./_util.mjs";

const { EIA } = comun;
const C = EIA.cartera;
const c10 = dato("10_dashboard_mercado.json"), c11 = dato("11_watchlist_alertas_portafolio_demo.json"), c12 = dato("12_leaderboard_liga.json");
const precio = tk => (c10.find(a => a.ticker === tk) || {}).ultimo;
const cerca = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m || ""} ${a} vs ${b}`);

test("claves por modo: el Modo profesor conserva eia_port de la base", () => {
  assert.equal(C.clave("profesor"), "eia_port"); assert.equal(C.clave("real"), "eia_port_real");
  assert.equal(C.claveOrdenes("profesor"), "eia_ordenes"); assert.equal(C.claveOrdenes("real"), "eia_ordenes_real");
});

test("validación de órdenes: cantidad entera, efectivo y posiciones (R-HER-03)", () => {
  const c = C.copia(c11.portafolio_demo), p = precio("NVDA");
  assert.deepEqual(C.validar(c, { ticker: "NVDA", lado: "C", cantidad: "10" }, p), {});
  for (const q of ["0", "-3", "2.5", "", "abc"]) assert.deepEqual(C.validar(c, { ticker: "NVDA", lado: "C", cantidad: q }, p), { cantidad: "entero" }, "cantidad " + q);
  assert.deepEqual(C.validar(c, { ticker: "NVDA", lado: "C", cantidad: String(Math.floor(c.efectivo / p) + 1) }, p), { cantidad: "efectivo" });
  assert.deepEqual(C.validar(c, { ticker: "AAPL", lado: "V", cantidad: "1" }, precio("AAPL")), { cantidad: "sin_posicion" });
  assert.deepEqual(C.validar(c, { ticker: "NVDA", lado: "V", cantidad: "61" }, p), { cantidad: "insuficiente" }, "la demo tiene 60 NVDA");
  assert.deepEqual(C.validar(c, { ticker: "XXX", lado: "C", cantidad: "1" }, undefined), { ticker: "ticker" });
});

test("ejecutar: compra con costo medio, venta parcial y total, sin modificar la cartera recibida", () => {
  const c0 = C.copia(c11.portafolio_demo), p = precio("NVDA");
  const c1 = C.ejecutar(c0, { ticker: "NVDA", lado: "C", cantidad: 40 }, p);
  assert.deepEqual(c0, C.copia(c11.portafolio_demo), "pura");
  const pos = c1.posiciones.find(x => x.ticker === "NVDA");
  assert.equal(pos.cantidad, 100);
  cerca(pos.costo, (60 * 152.88 + 40 * p) / 100, 1e-9, "costo medio");
  cerca(c1.efectivo, c0.efectivo - 40 * p, 1e-9, "efectivo");
  const c2 = C.ejecutar(c1, { ticker: "NVDA", lado: "V", cantidad: 100 }, p);
  assert.ok(!c2.posiciones.some(x => x.ticker === "NVDA"), "una posición en cero desaparece");
  const c3 = C.ejecutar(c0, { ticker: "AAPL", lado: "C", cantidad: 1 }, precio("AAPL"));
  assert.equal(c3.posiciones.find(x => x.ticker === "AAPL").costo, precio("AAPL"));
  assert.throws(() => C.ejecutar(c0, { ticker: "NVDA", lado: "V", cantidad: 999 }, p));
  // El valor de mercado no cambia al comprar o vender al último precio
  cerca(C.valor(c1, precio), C.valor(c0, precio), 1e-6, "valor tras comprar");
  cerca(C.valor(c2, precio), C.valor(c0, precio), 1e-6, "valor tras vender");
});

test("filas de posiciones y vista previa", () => {
  const c = C.copia(c11.portafolio_demo), f = C.filas(c, precio).find(x => x.ticker === "SPY");
  cerca(f.valor, 20 * precio("SPY"), 1e-9); cerca(f.pnl, (precio("SPY") - 706.62) * 20, 1e-9);
  const v = Tr.vistaPrevia(c, { ticker: "NVDA", lado: "C", cantidad: "10" }, precio("NVDA"));
  cerca(v.total, 10 * precio("NVDA"), 1e-9); cerca(v.efectivoRestante, c.efectivo - v.total, 1e-9);
  assert.equal(Tr.vistaPrevia(c, { ticker: "NVDA", lado: "V", cantidad: "10" }, precio("NVDA")).quedan, 50);
  assert.equal(Tr.vistaPrevia(c, { ticker: "NVDA", lado: "C", cantidad: "0" }, precio("NVDA")), null);
});

test("Leaderboard: el retorno del usuario sale de su cartera y entra en el ranking (R-HER-04)", () => {
  const c = C.copia(c11.portafolio_demo), ret = (C.valor(c, precio) / C.valorInicial(c11.portafolio_demo) - 1) * 100;
  const filas = L.ranking(c12, { retorno_liga_pct: ret, operaciones: 0 });
  assert.equal(filas.length, c12.length + 1);
  assert.ok(filas.every((f, i) => i === 0 || filas[i - 1].retorno_liga_pct >= f.retorno_liga_pct), "orden descendente");
  assert.deepEqual(filas.map(f => f.posicion), filas.map((f, i) => i + 1));
  const yo = filas.filter(f => f.usted);
  assert.equal(yo.length, 1); assert.equal(yo[0].clave, L.CLAVE_USUARIO); cerca(yo[0].retorno_liga_pct, ret, 1e-12);
  assert.equal(L.ranking(c12, { retorno_liga_pct: 1e6, operaciones: 0 })[0].usted, true);
});

test("trading.html y leaderboard.html: sin script en línea, sin cifras a mano y con sus contenedores", () => {
  for (const [pag, ids] of [["trading.html", ["resumen", "aplicado", "form-orden", "orden-activo", "orden-cantidad", "orden-cantidad-error", "vista-previa", "orden-alerta", "posiciones", "historial", "reiniciar"]], ["leaderboard.html", ["mi-posicion", "liga"]]]) {
    const h = leer(pag);
    for (const id of ids) assert.ok(h.includes(`id="${id}"`), pag + " falta #" + id);
    assert.ok(!/<script>(?!<\/script>)/.test(h), pag + ": el JS del módulo vive en js/");
    const visible = h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
    assert.ok(!/\d/.test(visible), pag + ": hay dígitos: " + (visible.match(/\S*\d\S*/) || [""])[0]);
  }
  assert.match(leer("trading.html"), /aria-describedby="orden-cantidad-error/, "error asociado al campo");
});
