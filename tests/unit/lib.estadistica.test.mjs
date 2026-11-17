// js/lib: PRNG, estadística y símplex, anclados a los datos del profesor. [T-09] [I-03] [I-06] [I-10]
import test from "node:test";
import assert from "node:assert/strict";
import E from "../../js/lib/estadistica.js";
import S from "../../js/lib/simplex.js";
import P from "../../js/lib/prng.js";
import { dato } from "./_util.mjs";

const cerca = (a, b, tol, msj) => assert.ok(Math.abs(a - b) <= tol, `${msj || ""} ${a} vs ${b} (tol ${tol})`);

test("PRNG: misma semilla, misma secuencia; valores en [0, 1)", () => {
  const a = P.crearPRNG(2026), b = P.crearPRNG(2026), c = P.crearPRNG(7);
  const sa = Array.from({ length: 50 }, () => a.sig()), sb = Array.from({ length: 50 }, () => b.sig()), sc = Array.from({ length: 50 }, () => c.sig());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every(x => x >= 0 && x < 1));
  const normales = Array.from({ length: 4000 }, () => a.normal());
  cerca(E.media(normales), 0, 0.06, "media de la normal"); cerca(E.desv(normales), 1, 0.06, "desviación de la normal");
  assert.deepEqual(a.barajar([1, 2, 3, 4, 5]).sort(), [1, 2, 3, 4, 5]);
});

test("percentil con interpolación lineal y mediana", () => {
  assert.equal(E.percentil([1, 2, 3, 4], 50), 2.5);
  assert.equal(E.percentil([10, 20, 30, 40, 50], 10), 14);
  assert.equal(E.percentil([10, 20, 30, 40, 50], 90), 46);
  assert.equal(E.mediana([3, 1, 2]), 2);
});

test("I-03: mediana y bandas p10/p90 de los 18 modelos reproducen 06 en los 26 activos", () => {
  const c6 = dato("06_regresores_precio_30d.json");
  for (const [t, p] of Object.entries(c6.predicciones)) {
    for (let i = 0; i < 30; i++) {
      const col = p.modelos.map(m => m.precios[i]);
      cerca(E.mediana(col), p.ensamble_mediana[i], 0.0051, t + " mediana día " + i);
      cerca(E.percentil(col, 10), p.banda_p10[i], 0.0051, t + " p10 día " + i);
      cerca(E.percentil(col, 90), p.banda_p90[i], 0.0051, t + " p90 día " + i);
    }
  }
});

test("I-03b (R-REG-09): el retorno proyectado es el de la mediana, redondeado a 2 decimales", () => {
  const c6 = dato("06_regresores_precio_30d.json");
  let fuera = 0;
  for (const [t, p] of Object.entries(c6.predicciones)) {
    assert.equal(E.redondear((p.ensamble_mediana[29] / p.precio_ultimo - 1) * 100, 2), p.retorno_proyectado_30d_pct, t);
    const dif = Math.abs(p.ensamble_mediana[29] - p.precio_ultimo * (1 + p.retorno_proyectado_30d_pct / 100));
    assert.ok(dif <= 0.01 + p.precio_ultimo * 0.00005, t + " cota diagnóstica (más permisiva que I-03b; no la sustituye)");
    if (dif > 0.01) fuera++;
  }
  assert.equal(fuera, 5, "nota N-1 del contrato: 5 activos superan 1 centavo con la fórmula literal de P04");
});

test("I-06 e I-10: las 7 métricas y el drawdown de 09 se reproducen desde las curvas", () => {
  const c9 = dato("09_backtesting_portafolios.json");
  for (const [n, s] of [...Object.entries(c9.carteras), ...Object.entries(c9.referencias)]) {
    const m = E.metricasCurva(s.curva, { rf: 0.04 });
    cerca(m.retorno_total_pct, s.metricas.retorno_total_pct, 0.006, n + " retorno total");
    cerca(m.cagr_pct, s.metricas.cagr_pct, 0.006, n + " CAGR");
    cerca(m.volatilidad_anual_pct, s.metricas.volatilidad_anual_pct, 0.006, n + " volatilidad");
    cerca(m.sharpe, s.metricas.sharpe, 0.0015, n + " Sharpe");
    cerca(m.max_drawdown_pct, s.metricas.max_drawdown_pct, 0.006, n + " máximo drawdown");
    cerca(m.calmar, s.metricas.calmar, 0.002, n + " Calmar");
    cerca(m.meses_positivos_pct, s.metricas.meses_positivos_pct, 0.06, n + " meses positivos");
    // R-BT-06: curva final frente a retorno total, ±0,05 pp
    cerca((s.curva.at(-1) / 100 - 1) * 100, s.metricas.retorno_total_pct, 0.05, n + " R-BT-06");
    if (s.drawdown) { const d = E.drawdown(s.curva); s.drawdown.forEach((v, i) => cerca(d[i], v, 0.002, n + " drawdown " + i)); }
  }
});

test("I-04: Sharpe y CVaR de los puntos de 07 siguen las fórmulas del contrato", () => {
  const c7 = dato("07_optimizador_markowitz_nsga.json");
  for (const k of ["markowitz_universo_completo", "markowitz_elegibles", "nsga2_elegibles", "nsga3_elegibles"]) for (const p of c7[k]) {
    cerca(E.sharpe(p.retorno_esperado_anual_pct, p.volatilidad_anual_pct, 100 * c7.tasa_libre_riesgo), p.sharpe, 0.01, k + " Sharpe");
    const s = Object.values(p.pesos).reduce((a, b) => a + b, 0);
    assert.ok(s >= 0.98 && s <= 1.02 && Math.max(...Object.values(p.pesos)) <= c7.tope_peso_por_activo + 1e-9, k + " R-OPT-09");
  }
  // El CVaR del profesor es aproximadamente el de una normal (medido: dentro del 10 % en las fronteras de Markowitz; no es una regla exacta)
  for (const k of ["markowitz_universo_completo", "markowitz_elegibles"]) for (const p of c7[k]) {
    const nuestro = E.cvarNormalDiario(p.retorno_esperado_anual_pct / 100, p.volatilidad_anual_pct / 100) * 100;
    assert.ok(Math.abs(nuestro / p.cvar95_diario_pct - 1) <= 0.10, k + " CVaR normal " + nuestro.toFixed(3) + " vs " + p.cvar95_diario_pct);
  }
});

test("covarianza, Ledoit-Wolf y autovalor máximo", () => {
  const rng = P.crearPRNG(1), R = Array.from({ length: 200 }, () => { const a = rng.normal(), b = rng.normal(); return [a, 0.5 * a + b, b - a]; });
  const C = E.covarianza(R, true);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cerca(C[i][j], C[j][i], 1e-12, "simetría");
  cerca(C[0][0], E.varianza(R.map(f => f[0]), true), 1e-12, "diagonal = varianza");
  const lw = E.ledoitWolf(R);
  assert.ok(lw.contraccion >= 0 && lw.contraccion <= 1);
  const traza = M => M[0][0] + M[1][1] + M[2][2];
  cerca(traza(lw.cov), traza(E.covarianza(R, false)), 1e-9, "Ledoit-Wolf conserva la traza");
  cerca(E.autovalorMax([[2, 0], [0, 5]]), 5, 1e-9, "autovalor");
  cerca(E.volCartera([0.5, 0.5], [[0.04, 0], [0, 0.04]]), Math.sqrt(0.02), 1e-12, "volatilidad de cartera");
  cerca(E.cvar([-0.10, -0.05, 0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.01, 0.02, 0.03], 0.95), 0.10, 1e-12, "CVaR histórico");
});

test("símplex con tope: suma, límites, idempotencia y optimalidad", () => {
  const rng = P.crearPRNG(2026);
  for (let k = 0; k < 300; k++) {
    const n = 4 + rng.entero(23), tope = Math.max(1 / n + 0.01, 0.1 + 0.3 * rng.sig());
    const v = Array.from({ length: n }, () => 2 * rng.normal());
    const w = S.proyectarConTope(v, tope);
    assert.ok(S.esFactible(w, tope, 1e-9), "factible");
    const w2 = S.proyectarConTope(w, tope);
    w.forEach((x, i) => cerca(w2[i], x, 1e-9, "idempotente"));
    // Ningún otro punto factible queda más cerca de v
    const z = S.proyectarConTope(Array.from({ length: n }, () => rng.normal()), tope);
    const d = u => u.reduce((a, x, i) => a + (x - v[i]) * (x - v[i]), 0);
    assert.ok(d(w) <= d(z) + 1e-9, "óptimo");
  }
  assert.deepEqual(S.proyectarConTope([0.25, 0.25, 0.25, 0.25], 0.25), [0.25, 0.25, 0.25, 0.25]);
  assert.throws(() => S.proyectarConTope([1, 1, 1], 0.25), RangeError); // 3 activos con tope 25 % no suman 1
});
