// Detalle de activo y comparador (Spec W13 G.4, bloque Mercado): modelo de vista sobre los datos del profesor. [T-111]
import test from "node:test";
import assert from "node:assert/strict";
import Mk from "../../js/lib/mercado.js";
import Activo from "../../js/activo.js";
import Comp from "../../js/comparador.js";
import comun from "../../js/common.js";
import { dato, leer } from "./_util.mjs";

const c02 = dato("02_precios_sinteticos_504d.json"), c03 = dato("03_ohlcv_sintetico_120d.json"), c04 = dato("04_matriz_correlacion_covarianza.json");
const c05 = dato("05_clasificadores_binarios.json"), c06 = dato("06_regresores_precio_30d.json"), c10 = dato("10_dashboard_mercado.json");
const universo = c10.map(a => a.ticker);

test("base 100: cada curva parte de 100 y conserva las proporciones de los cierres", () => {
  const B = Mk.base100(c02.cierres, ["NVDA", "SPY"], 63, c02.fechas);
  assert.equal(B.fechas.length, 63);
  assert.equal(B.fechas.at(-1), c02.fechas.at(-1));
  for (const tk of ["NVDA", "SPY"]) {
    const c = c02.cierres[tk].slice(-63);
    assert.equal(B.series[tk][0], 100);
    assert.ok(Math.abs(B.series[tk].at(-1) - (c.at(-1) / c[0]) * 100) < 1e-9);
  }
});

test("métricas del periodo: retorno de los cierres, volatilidad positiva y beta de SPY frente a sí mismo = 1", () => {
  const [nvda, spy] = Mk.metricasPeriodo(c02.cierres, ["NVDA", "SPY"], 252, c02.fechas, "SPY");
  const c = c02.cierres.NVDA.slice(-252);
  assert.ok(Math.abs(nvda.retorno - (c.at(-1) / c[0] - 1) * 100) < 1e-9);
  assert.ok(nvda.volatilidad > 0 && spy.volatilidad > 0);
  assert.ok(Math.abs(spy.beta - 1) < 1e-9);
  assert.equal(nvda.sesiones, 252);
});

test("vecinos de 04: sin el propio activo, ordenados y con la correlación de la matriz", () => {
  const v = Mk.vecinos(c04, "NVDA", 5);
  assert.equal(v.mas.length, 5); assert.equal(v.menos.length, 5);
  assert.ok(![...v.mas, ...v.menos].some(x => x.ticker === "NVDA"));
  for (let i = 1; i < 5; i++) assert.ok(v.mas[i - 1].rho >= v.mas[i].rho);
  for (let i = 1; i < 5; i++) assert.ok(v.menos[i - 1].rho <= v.menos[i].rho);
  assert.equal(Mk.correlacion(c04, "NVDA", v.mas[0].ticker), v.mas[0].rho);
  assert.equal(Mk.correlacion(c04, "NVDA", "NO-EXISTE"), null);
});

test("detalle de activo: los modelos se leen de 05 y 06 tal cual, solo SUBE o BAJA, con banda p10–p90", () => {
  const m = Activo.resumenModelos(c05, c06, "NVDA"), p = c05.predicciones.NVDA, r = c06.predicciones.NVDA;
  assert.ok(["SUBE", "BAJA"].includes(m.clasif.consenso));
  assert.equal(m.clasif.prob, p.prob_media);
  assert.equal(m.clasif.n, p.votos_sube + p.votos_baja);
  assert.equal(m.regr.mediana, r.ensamble_mediana.at(-1));
  assert.ok(m.regr.p10 <= m.regr.mediana && m.regr.mediana <= m.regr.p90);
  assert.equal(m.regr.retorno, r.retorno_proyectado_30d_pct);
  // Publicación real parcial: sin 05 ni 06 no se inventa nada
  assert.deepEqual(Activo.resumenModelos(null, null, "NVDA"), { clasif: null, regr: null });
});

test("comparador: la selección solo admite activos del universo, sin repetir y como mucho cinco", () => {
  assert.deepEqual(Comp.normalizar(["NVDA", "NVDA", "XXX", "SPY"], universo), ["NVDA", "SPY"]);
  assert.equal(Comp.normalizar(universo, universo).length, Comp.MAXIMO);
  assert.deepEqual(Comp.deTexto(" nvda, spy ,,qqq"), ["NVDA", "SPY", "QQQ"]);
  assert.equal(Comp.sesionesDe("max"), undefined);
  assert.equal(Comp.sesionesDe("1a"), 252);
});

test("el detalle y el comparador están en el bloque Mercado de la barra lateral y cargan sus librerías", () => {
  const mercado = comun.NAVEGACION.find(b => b[0] === "mercado")[1].map(p => p[0]);
  assert.deepEqual(mercado, ["index.html", "activo.html", "comparador.html"]);
  for (const p of ["activo.html", "comparador.html", "index.html"]) {
    const h = leer(p);
    const pos = s => h.indexOf(`src="${s}"`);
    assert.ok(pos("js/lib/estadistica.js") > 0 && pos("js/lib/estadistica.js") < pos("js/lib/mercado.js") && pos("js/lib/mercado.js") < pos("js/common.js"), p);
  }
});
