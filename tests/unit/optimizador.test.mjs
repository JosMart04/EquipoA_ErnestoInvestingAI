// Módulo Optimizador: modelo de vista sobre los datos del profesor. [T-18] [R-OPT-01…09]
import test from "node:test";
import assert from "node:assert/strict";
import O from "../../js/optimizador.js";
import { dato, leer } from "./_util.mjs";

const c07 = dato("07_optimizador_markowitz_nsga.json"), c05 = dato("05_clasificadores_binarios.json"), c06 = dato("06_regresores_precio_30d.json");

test("R-OPT-09: los 170 puntos suman 1 ± 0,02 y ningún peso supera el tope", () => {
  const v = O.verificarTodos(c07);
  assert.equal(v.puntos, 35 + 35 + 40 + 60);
  assert.equal(v.cumplen, v.puntos);
  const malo = { pesos: { A: 0.30, B: 0.30, C: 0.30, D: 0.05 } };
  const r = O.verificarPesos(malo, c07.tope_peso_por_activo);
  assert.equal(r.cumpleTope, false);
  assert.equal(r.cumpleSuma, false);
});

test("R-OPT-01 y R-OPT-02: series visibles según los interruptores y la opción de curva", () => {
  const claves = vis => O.seriesVisibles(c07, vis).map(s => s.clave);
  assert.deepEqual(claves({}), ["mk_elegibles", "nsga2", "nsga3"]);
  assert.deepEqual(claves({ curva: "universo" }), ["mk_universo", "nsga2", "nsga3"]);
  assert.deepEqual(claves({ curva: "ambas" }), ["mk_universo", "mk_elegibles", "nsga2", "nsga3"]);
  assert.deepEqual(claves({ markowitz: false, nsga3: false }), ["nsga2"]);
  const s = O.seriesVisibles(c07, {});
  assert.equal(s.find(x => x.clave === "nsga3").puntos, c07.nsga3_elegibles, "R-OPT-08: los puntos se leen del JSON, sin recalcular");
});

test("R-OPT-03 y R-OPT-07: navegación con teclado entre puntos y series", () => {
  const tam = [35, 40, 60];
  assert.deepEqual(O.navegar({ s: 0, i: 0 }, "ArrowRight", tam), { s: 0, i: 1 });
  assert.deepEqual(O.navegar({ s: 0, i: 34 }, "ArrowRight", tam), { s: 0, i: 34 }, "no pasa del último");
  assert.deepEqual(O.navegar({ s: 0, i: 0 }, "ArrowLeft", tam), { s: 0, i: 0 });
  assert.deepEqual(O.navegar({ s: 2, i: 59 }, "ArrowDown", tam), { s: 0, i: 34 }, "vuelve a la primera serie y ajusta el índice");
  assert.deepEqual(O.navegar({ s: 0, i: 10 }, "ArrowUp", tam), { s: 2, i: 10 });
  assert.deepEqual(O.navegar({ s: 1, i: 10 }, "End", tam), { s: 1, i: 39 });
  assert.deepEqual(O.navegar({ s: 1, i: 10 }, "Home", tam), { s: 1, i: 0 });
  assert.equal(O.navegar({ s: 0, i: 0 }, "a", tam), null);
  const ini = O.puntoInicial(O.seriesVisibles(c07, {}));
  assert.equal(O.seriesVisibles(c07, {})[ini.s].puntos[ini.i].id, "N2-37", "empieza en el NSGA-II de mayor Sharpe");
});

test("R-OPT-04: los frentes NSGA quedan por encima (en riesgo) de la curva de Markowitz", () => {
  const d2 = O.distanciaAMarkowitz(c07.nsga2_elegibles, c07.markowitz_elegibles);
  const d3 = O.distanciaAMarkowitz(c07.nsga3_elegibles, c07.markowitz_elegibles);
  assert.equal(d2.n, 40);
  assert.ok(d2.media > 0 && d3.media > 0, "a igual retorno, más volatilidad");
  assert.ok(Math.abs(d2.media - 0.268) < 0.001 && Math.abs(d3.max - 3.150) < 0.001, "valores medidos el 17-nov");
});

test("R-OPT-05: elegibles y razón de cada activo, también de los que no entran", () => {
  for (const tk of c07.elegibles) { const r = O.razonElegible(tk, c07, c05, c06); assert.equal(r.elegible, true); assert.equal(r.motivo, "ok"); }
  assert.equal(O.razonElegible("AAPL", c07, c05, c06).motivo, "ambos");     // BAJA y proyección negativa
  assert.equal(O.razonElegible("MSFT", c07, c05, c06).motivo, "retorno");   // SUBE pero proyección negativa
  assert.equal(O.razonElegible("FSM", c07, c05, c06).motivo, "consenso");   // BAJA pero proyección positiva
  assert.equal(O.razonElegible("NVDA", c07, c05, c06).votos, c05.predicciones.NVDA.votos_sube);
  assert.equal(O.razonElegible("NO_EXISTE", c07, c05, c06), null);
});

test("pesos ordenados de mayor a menor", () => {
  const w = O.pesosOrdenados(c07.nsga2_elegibles[0]);
  assert.ok(w.every((x, i) => i === 0 || w[i - 1].peso >= x.peso));
  assert.equal(w.length, Object.keys(c07.nsga2_elegibles[0].pesos).length);
});

test("optimizador.html: sin cifras escritas a mano, contenedores E2E y recálculo deshabilitado en el Modo profesor", () => {
  const h = leer("optimizador.html");
  for (const id of ["ficha", "ver-markowitz", "ver-nsga2", "ver-nsga3", "curva", "grafico", "composicion", "explicacion", "elegibles", "recalcular", "corte-real"]) assert.ok(h.includes(`id="${id}"`), "falta #" + id);
  assert.match(h, /id="recalcular" disabled/, "R-OPT-08");
  assert.ok(!/EIA\.trabajo|new Worker/.test(leer("js", "optimizador.js")), "el módulo no recalcula fronteras");
  const visible = h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
  assert.ok(!/\d/.test(visible.replace(/CVaR 95/g, "")), "hay dígitos en el texto de la página: " + (visible.match(/\S*\d\S*/) || [""])[0]);
});

test("T-26: ventanas de estimación que terminan en el corte y caben en la historia", () => {
  const fechas = Array.from({ length: 300 }, (_, i) => "2026-" + String(1 + Math.floor(i / 28)).padStart(2, "0") + "-" + String(1 + (i % 28)).padStart(2, "0"));
  const v = O.ventanas(fechas, fechas[260], [126, 252, 504]);
  assert.deepEqual(v.map(x => x.n), [126, 252], "504 no cabe");
  assert.equal(v[0].hasta, fechas[260]);
  assert.equal(v[1].desde, fechas[260 - 252]);
  assert.equal(O.ventanas(fechas, null, [126])[0].hasta, fechas[299], "sin corte, el último cierre");
});
