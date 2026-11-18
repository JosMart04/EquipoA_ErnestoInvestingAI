// Módulo Backtesting: modelo de vista sobre los datos del profesor. [T-24] [R-BT-01…07]
import test from "node:test";
import assert from "node:assert/strict";
import B from "../../js/backtesting.js";
import { dato, leer } from "./_util.mjs";

const c09 = dato("09_backtesting_portafolios.json"), TOPE = dato("13_patrones_y_parametros.json").parametros.TOPE_PESO;
const copia = o => JSON.parse(JSON.stringify(o));

test("R-BT-01: 7 series (3 carteras y 4 referencias), todas con drawdown ≤ 0 y la misma longitud que las fechas", () => {
  const s = B.series(c09);
  assert.equal(s.length, 7);
  assert.deepEqual(s.filter(x => x.tipo === "cartera").map(x => x.clave), ["Conservador", "Moderado", "Agresivo"]);
  for (const x of s) {
    assert.equal(x.curva.length, c09.fechas.length); assert.equal(x.drawdown.length, c09.fechas.length);
    assert.ok(x.drawdown.every(v => v <= 1e-9), x.clave); assert.equal(x.curva[0], c09.base);
  }
  // El drawdown derivado de las referencias coincide con el de las carteras cuando se calcula igual
  const mod = c09.carteras.Moderado, dd = B.drawdown(mod.curva);
  dd.forEach((v, i) => assert.ok(Math.abs(v - mod.drawdown[i]) < 0.002, "día " + i));
  assert.equal(c09.fechas[0], "inicio", "I-06: la primera fecha no es una fecha");
});

test("R-BT-06: curva final frente a retorno total, ± 0,05 pp en las 7 series", () => {
  const v = B.verificar(c09);
  assert.equal(v.length, 7);
  assert.ok(v.every(x => x.cumple), JSON.stringify(v.filter(x => !x.cumple)));
  const malo = copia(c09); malo.carteras.Moderado.metricas.retorno_total_pct += 1;
  assert.equal(B.verificar(malo).find(x => x.clave === "Moderado").cumple, false);
});

test("R-BT-04 y R-BT-07: la interpretación sale de los números (las tres pierden frente a SPY y se explica)", () => {
  const inter = B.interpretar(c09, TOPE);
  assert.equal(inter.length, 3);
  for (const x of inter) {
    assert.equal(x.supera, false, x.clave);
    assert.equal(x.spyRetorno, c09.referencias.SPY.metricas.retorno_total_pct);
    const codigos = x.causas.map(c => c.codigo);
    assert.ok(codigos.includes("persistencia"), x.clave + ": 1/N rindió más");
    assert.ok(codigos.includes("costo"), x.clave + ": turnover medio > 1");
    assert.ok(codigos.includes("concentracion"), x.clave + ": llegó al tope");
    assert.ok(codigos.includes("no_elegido"), x.clave);
    assert.equal(x.causas.find(c => c.codigo === "no_elegido").ticker, "EPU", "EPU es la referencia que más subió");
  }
  const costo = inter[0].causas.find(c => c.codigo === "costo");
  assert.ok(Math.abs(costo.costo - c09.carteras.Conservador.turnover_medio * 12 * B.COMISION * 100) < 1e-9);
});

test("R-BT-04: si cambian los números, cambia la interpretación (no hay conclusiones fijas)", () => {
  const otro = copia(c09);
  otro.carteras.Moderado.metricas.retorno_total_pct = 40; otro.carteras.Moderado.metricas.sharpe = 2; otro.carteras.Moderado.metricas.volatilidad_anual_pct = 10;
  const m = B.interpretar(otro, TOPE).find(x => x.clave === "Moderado");
  assert.equal(m.supera, true); assert.equal(m.mejorSharpe, true); assert.equal(m.masVolatil, false);
  assert.deepEqual(m.causas, [], "no se buscan causas de una derrota que no ocurrió");
  otro.carteras.Conservador.turnover_medio = 0.5;
  assert.ok(!B.interpretar(otro, TOPE).find(x => x.clave === "Conservador").causas.some(c => c.codigo === "costo"));
});

test("R-BT-03: rebalanceos con pesos ordenados y turnover frente al anterior; nota del tope 0,35 (N-3)", () => {
  const c = c09.carteras.Agresivo;
  const r0 = B.rebalanceo(c, 0), r1 = B.rebalanceo(c, 1);
  assert.equal(r0.turnover, null, "el primero parte de efectivo");
  assert.ok(r1.turnover > 0 && r1.turnover <= 2);
  assert.ok(r1.pesos.every((w, i) => i === 0 || r1.pesos[i - 1].peso >= w.peso));
  assert.equal(c.rebalanceos.length, 12);
  assert.equal(B.pesoMaximo(c), 0.35);
  assert.ok(B.pesoMaximo(c) > TOPE, "el Agresivo supera el tope declarado: se muestra la nota");
  assert.ok(B.pesoMaximo(c09.carteras.Conservador) <= TOPE + 1e-9);
});

test("backtesting.html: sin cifras escritas a mano, recálculo deshabilitado y la inconsistencia documentada en el código", () => {
  const h = leer("backtesting.html");
  for (const id of ["ficha", "metodo", "series-visibles", "curvas", "caidas", "metricas", "verificacion", "nota-tope", "tl-cartera", "tl-fechas", "tl-detalle", "interpretacion", "recalcular"]) assert.ok(h.includes(`id="${id}"`), "falta #" + id);
  assert.match(h, /id="recalcular" disabled/);
  const visible = h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
  assert.ok(!/\d/.test(visible), "hay dígitos: " + (visible.match(/\S*\d\S*/) || [""])[0]);
  const js = leer("js", "backtesting.js");
  assert.match(js, /0,35/, "comentario sobre la inconsistencia del tope del Agresivo");
  assert.ok(!/EIA\.trabajo|new Worker/.test(js), "en el Modo profesor no se recalcula");
});

test("T-26: fechas para terminar un backtesting recalculado (último cierre y fines de mes, del más reciente al más antiguo)", () => {
  const f = ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-30", "2026-11-02", "2026-11-16"];
  assert.deepEqual(B.finesDeMes(f, 13), ["2026-11-16", "2026-10-30", "2026-09-30"]);
  assert.deepEqual(B.finesDeMes(f, 2), ["2026-11-16", "2026-10-30"]);
  assert.deepEqual(B.finesDeMes([], 13), []);
  const js = leer("js", "backtesting.js");
  assert.ok(!/EIA\.trabajo|new Worker/.test(js), "el Worker lo lanza el núcleo (EIA.ui.recalculo), solo en el Modo real");
});
