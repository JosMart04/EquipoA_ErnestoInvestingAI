// js/lib: Markowitz, NSGA-II, NSGA-III, backtest y Workers. [T-10] [T-11] [T-12] [T-13] [R-OPT-09] [I-04] [I-06] [I-10]
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import E from "../../js/lib/estadistica.js";
import S from "../../js/lib/simplex.js";
import M from "../../js/lib/markowitz.js";
import N2 from "../../js/lib/nsga2.js";
import N3 from "../../js/lib/nsga3.js";
import B from "../../js/lib/backtest.js";
import WO from "../../js/workers/optimizador.worker.js";
import WB from "../../js/workers/backtest.worker.js";
import { dato, leer, leerJSON, ruta, listar } from "./_util.mjs";

const cerca = (a, b, tol, msj) => assert.ok(Math.abs(a - b) <= tol, `${msj || ""} ${a} vs ${b} (tol ${tol})`);
const c4 = dato("04_matriz_correlacion_covarianza.json"), c7 = dato("07_optimizador_markowitz_nsga.json");
const c2 = dato("02_precios_sinteticos_504d.json"), c9 = dato("09_backtesting_portafolios.json");
const TODOS = c4.tickers, TOPE = c7.tope_peso_por_activo, RF = c7.tasa_libre_riesgo;
const universo = { mu: c4.retorno_esperado_anual_simulado, cov: c4.covarianza_anual, tope: TOPE, tickers: TODOS, rf: RF };
const ix = c7.elegibles.map(t => TODOS.indexOf(t));
const elegibles = { mu: ix.map(i => universo.mu[i]), cov: ix.map(i => ix.map(j => universo.cov[i][j])), tope: TOPE, tickers: c7.elegibles, rf: RF, semilla: 2026 };
const vector = (p, tickers) => tickers.map(t => p.pesos[t] || 0);

test("Markowitz, caso analítico de 2 activos sin correlación", () => {
  // Mínima varianza: w₁ = σ₂² / (σ₁² + σ₂²)
  const w = M.minimaVarianza({ mu: [0.05, 0.10], cov: [[0.04, 0], [0, 0.09]], tope: 1 });
  cerca(w[0], 0.09 / 0.13, 1e-8, "w1"); cerca(w[1], 0.04 / 0.13, 1e-8, "w2");
  assert.deepEqual(M.maximoRetorno({ mu: [0.05, 0.10, 0.07], tope: 0.5 }), [0, 0.5, 0.5]);
  assert.throws(() => M.maximoRetorno({ mu: [0.1, 0.2], tope: 0.25 }), RangeError);
});

test("Markowitz: la solución cumple las condiciones KKT (óptimo global)", () => {
  for (const gamma of [0, 0.05, 0.3, 2]) {
    const w = M.carteraPara(Object.assign({ gamma }, universo));
    assert.ok(S.esFactible(w, TOPE, 1e-9));
    const g = E.matVec(universo.cov, w).map((v, i) => v - gamma * universo.mu[i]);
    const puedeSubir = g.filter((v, i) => w[i] < TOPE - 1e-12), puedeBajar = g.filter((v, i) => w[i] > 1e-12);
    assert.ok(Math.max(...puedeBajar) - Math.min(...puedeSubir) <= 1e-9, "KKT con γ = " + gamma);
  }
});

test("Markowitz: frontera de 35 puntos factible, creciente y que coincide con la del profesor", () => {
  const f = M.fronteraCruda(Object.assign({ puntos: 35 }, universo));
  assert.equal(f.length, 35);
  f.forEach((x, i) => {
    assert.ok(S.esFactible(x.w, TOPE, 1e-9), "factible " + i);
    if (i) { assert.ok(x.retorno >= f[i - 1].retorno - 1e-9, "retorno creciente"); assert.ok(x.vol >= f[i - 1].vol - 1e-9, "riesgo creciente"); }
  });
  // Al mismo retorno, nuestra volatilidad es la del profesor (su frontera está redondeada a 4 decimales de peso)
  for (const p of c7.markowitz_universo_completo) {
    const wp = vector(p, TODOS), r = E.retornoCartera(wp, universo.mu);
    if (r < f[0].retorno || r > f[34].retorno) continue;
    const nuestra = E.volCartera(M.carteraParaRetorno(universo, r).w, universo.cov);
    cerca(nuestra * 100, E.volCartera(wp, universo.cov) * 100, 0.02, "volatilidad al retorno " + (r * 100).toFixed(2));
  }
  const con = M.frontera(Object.assign({ puntos: 35 }, elegibles));
  assert.equal(con.length, 35);
  for (const p of con) {
    assert.deepEqual(Object.keys(p).sort(), ["cvar95_diario_pct", "pesos", "retorno_esperado_anual_pct", "sharpe", "volatilidad_anual_pct"]);
    const s = Object.values(p.pesos).reduce((a, b) => a + b, 0);
    assert.ok(s >= 0.98 && s <= 1.02 && Math.max(...Object.values(p.pesos)) <= TOPE + 1e-9, "R-OPT-09");
  }
});

test("NSGA-II: operadores básicos", () => {
  assert.ok(N2.domina([1, 1], [2, 1])); assert.ok(!N2.domina([1, 2], [2, 1])); assert.ok(!N2.domina([1, 1], [1, 1]));
  const F = [[1, 5], [2, 3], [3, 1], [3, 4], [4, 4]];
  assert.deepEqual(N2.ordenNoDominado(F), [[0, 1, 2], [3], [4]]);
  const d = N2.distanciaCrowding(F, [0, 1, 2]);
  assert.equal(d[0], Infinity); assert.equal(d[2], Infinity); assert.ok(d[1] > 0 && Number.isFinite(d[1]));
  assert.deepEqual(N2.repartir([1, 2, 3, 4, 5, 6, 7, 8, 9], 3), [1, 5, 9]);
});

test("NSGA-II: frente factible, no dominado, determinista y nunca mejor que Markowitz", () => {
  const f = N2.frenteCarteras2(elegibles);
  assert.equal(f.length, 40);
  assert.deepEqual(f.map(p => p.id), Array.from({ length: 40 }, (x, i) => "N2-" + String(i + 1).padStart(2, "0")));
  const obj = f.map(p => { const w = vector(p, elegibles.tickers); return [-E.retornoCartera(w, elegibles.mu), E.volCartera(w, elegibles.cov)]; });
  const rMin = E.retornoCartera(M.minimaVarianza(elegibles), elegibles.mu), rMax = E.retornoCartera(M.maximoRetorno(elegibles), elegibles.mu);
  let peor = 0;
  f.forEach((p, i) => {
    const s = Object.values(p.pesos).reduce((a, b) => a + b, 0);
    assert.ok(s >= 0.98 && s <= 1.02 && Math.max(...Object.values(p.pesos)) <= TOPE + 1e-9, "I-04 en " + p.id);
    obj.forEach((o, j) => { if (i !== j) assert.ok(!N2.domina(o, obj[i]) || Math.abs(o[0] - obj[i][0]) + Math.abs(o[1] - obj[i][1]) < 2e-4, p.id + " está dominado"); });
    const r = Math.min(rMax, Math.max(rMin, -obj[i][0]));
    const exceso = (obj[i][1] - E.volCartera(M.carteraParaRetorno(elegibles, r).w, elegibles.cov)) * 100;
    assert.ok(exceso >= -0.02, p.id + " no puede quedar por debajo del riesgo de Markowitz (" + exceso.toFixed(4) + " pp)");
    peor = Math.max(peor, exceso);
  });
  assert.ok(peor < 2, "el frente queda cerca de la frontera exacta (peor exceso " + peor.toFixed(3) + " pp)");
  assert.deepEqual(N2.frenteCarteras2(elegibles), f, "misma semilla, mismo frente");
  assert.notDeepEqual(N2.frenteCarteras2(Object.assign({}, elegibles, { semilla: 7 })), f);
});

test("NSGA-III: 91 direcciones de Das-Dennis, frente factible y no dominado en 3 objetivos", () => {
  const refs = N3.dasDennis(3, 12);
  assert.equal(refs.length, 91);
  refs.forEach(r => cerca(r[0] + r[1] + r[2], 1, 1e-12, "suma de la referencia"));
  assert.deepEqual(N3.resolver([[2, 0], [0, 4]], [1, 1]), [0.5, 0.25]);
  assert.equal(N3.resolver([[1, 1], [1, 1]], [1, 1]), null);
  assert.equal(N3.asociar([0.5, 0.5, 0], [[1, 0, 0], [0.5, 0.5, 0], [0, 0, 1]]).ref, 1);
  const f = N3.frenteCarteras3(elegibles);
  assert.ok(f.length >= 20 && f.length <= 60, "tamaño del frente: " + f.length);
  f.forEach((p, i) => {
    assert.equal(p.id, "N3-" + String(i + 1).padStart(2, "0"));
    const s = Object.values(p.pesos).reduce((a, b) => a + b, 0);
    assert.ok(s >= 0.98 && s <= 1.02 && Math.max(...Object.values(p.pesos)) <= TOPE + 1e-9, "I-04 en " + p.id);
    assert.ok(p.cvar95_diario_pct > 0);
  });
  assert.deepEqual(N3.frenteCarteras3(elegibles), f, "determinista");
});

test("backtest: SPY, QQQ, EPU y 1/N reproducen 09 del profesor (I-10)", () => {
  const r = B.walkForward({ fechas: c2.fechas, cierres: c2.cierres, tickers: TODOS });
  assert.deepEqual(r.fechas, c9.fechas);
  assert.deepEqual(r.periodo, c9.periodo);
  assert.equal(r.base, c9.base);
  for (const [n, s] of Object.entries(c9.referencias)) {
    r.referencias[n].curva.forEach((v, i) => cerca(v, s.curva[i], 0.001, n + " curva " + i));
    assert.deepEqual(r.referencias[n].metricas, s.metricas, n);
  }
});

test("backtest: estructura de 09, mismas fechas de rebalanceo, topes y sin mirar el futuro", () => {
  const r = B.walkForward({ fechas: c2.fechas, cierres: c2.cierres, tickers: TODOS });
  for (const [n, c] of Object.entries(r.carteras)) {
    const prof = c9.carteras[n], tope = B.POR_DEFECTO.perfiles[n].tope;
    assert.equal(c.curva.length, 253); assert.equal(c.drawdown.length, 253); assert.equal(c.curva[0], 100);
    assert.ok(c.drawdown.every(v => v <= 0));
    assert.deepEqual(c.rebalanceos.map(x => x.fecha), prof.rebalanceos.map(x => x.fecha), n + ": fechas de rebalanceo");
    for (const x of c.rebalanceos) {
      const ws = Object.values(x.pesos);
      cerca(ws.reduce((a, b) => a + b, 0), 1, 0.002, n + " suma"); assert.ok(Math.max(...ws) <= tope + 1e-9, n + " tope");
    }
    cerca((c.curva.at(-1) / 100 - 1) * 100, c.metricas.retorno_total_pct, 0.05, n + " R-BT-06");
    assert.deepEqual(Object.keys(c.metricas), Object.keys(prof.metricas));
  }
  // Sin mirar el futuro: alterar los precios posteriores a un rebalanceo no cambia sus pesos ni los anteriores
  const futuro = JSON.parse(JSON.stringify(c2.cierres)), corte = c2.fechas.indexOf(r.carteras.Moderado.rebalanceos[5].fecha);
  for (const t of TODOS) for (let i = corte; i < futuro[t].length; i++) futuro[t][i] *= 1 + 0.5 * Math.sin(i + t.length);
  const r2 = B.walkForward({ fechas: c2.fechas, cierres: futuro, tickers: TODOS });
  for (const n of Object.keys(r.carteras)) assert.deepEqual(r2.carteras[n].rebalanceos.slice(0, 6), r.carteras[n].rebalanceos.slice(0, 6), n);
  // La comisión resta capital
  const sin = B.walkForward({ fechas: c2.fechas, cierres: c2.cierres, tickers: TODOS, comisionPb: 0 });
  for (const n of Object.keys(r.carteras)) assert.ok(sin.carteras[n].curva.at(-1) > r.carteras[n].curva.at(-1), n);
  assert.throws(() => B.walkForward({ fechas: c2.fechas.slice(0, 300), cierres: c2.cierres, tickers: TODOS, hasta: 299 }), RangeError);
});

test("Workers: protocolo calcular → progreso → resultado, y errores como mensaje", () => {
  const msjs = [];
  WO.manejar({ tipo: "calcular", params: { fechas: c2.fechas, cierres: c2.cierres, tickers: TODOS, elegibles: c7.elegibles, tope: TOPE, rf: RF, semilla: 2026, desde: c2.fechas[252], gens: 30 } }, m => msjs.push(m));
  const fin = msjs.at(-1);
  assert.equal(fin.tipo, "resultado");
  assert.ok(msjs.filter(m => m.tipo === "progreso").length > 5);
  assert.equal(msjs.filter(m => m.tipo === "progreso").at(-1).pct, 100);
  assert.deepEqual(Object.keys(fin.datos).filter(k => k !== "recalculado").sort(), Object.keys(c7).sort(), "mismo esquema que 07");
  assert.equal(fin.datos.markowitz_universo_completo.length, 35); assert.equal(fin.datos.markowitz_elegibles.length, 35);
  assert.equal(fin.datos.nsga2_elegibles.length, 40); assert.equal(fin.datos.recalculado.desde, c2.fechas[252]);
  const err = [];
  WO.manejar({ tipo: "calcular", params: { fechas: c2.fechas, cierres: c2.cierres, tickers: TODOS, elegibles: ["SPY", "QQQ"], tope: TOPE, rf: RF } }, m => err.push(m));
  assert.equal(err.at(-1).tipo, "error"); assert.match(err.at(-1).mensaje, /al menos 4/);
  const b = [];
  WB.manejar({ tipo: "calcular", params: { fechas: c2.fechas, cierres: c2.cierres, tickers: TODOS } }, m => b.push(m));
  assert.equal(b.at(-1).tipo, "resultado");
  assert.deepEqual(Object.keys(b.at(-1).datos).sort(), Object.keys(c9).sort(), "mismo esquema que 09");
  WO.manejar({ tipo: "otro" }, () => assert.fail("no debe responder a otros mensajes"));
});

test("R-OPT-08 / H-16: ninguna página crea un Worker por su cuenta; solo EIA.trabajo", () => {
  for (const a of listar("js", p => p.endsWith(".js") && !p.includes("/workers/"))) {
    const n = (leer(a).match(/new Worker\(/g) || []).length;
    assert.equal(n, a === "js/common.js" ? 1 : 0, a);
  }
});

test("fixtures de CX (cvxpy y backtest de Python): se comparan cuando existan", { skip: !existsSync(ruta("tests", "fixtures", "opt_referencia.json")) && "falta tests/fixtures/opt_referencia.json (lo exporta CX, T-39)" }, () => {
  const fx = leerJSON("tests", "fixtures", "opt_referencia.json");
  const p = { mu: fx.mu, cov: fx.cov, tope: fx.tope, tickers: fx.tickers, rf: fx.rf };
  for (const q of fx.frontera) {
    const r = q.retorno_esperado_anual_pct / 100, w = M.carteraParaRetorno(p, r).w;
    cerca(E.volCartera(w, p.cov) * 100, q.volatilidad_anual_pct, 0.3, "volatilidad frente a cvxpy al retorno " + q.retorno_esperado_anual_pct);
  }
});
