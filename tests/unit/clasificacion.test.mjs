// Módulo de Clasificación: modelo de vista sobre los datos del profesor. [T-08] [R-CLA-01…06]
import test from "node:test";
import assert from "node:assert/strict";
import C from "../../js/clasificacion.js";
import { dato, leer } from "./_util.mjs";

const c05 = dato("05_clasificadores_binarios.json"), universo = dato("10_dashboard_mercado.json");
const todo = C.modeloVista(c05, universo, {});

test("R-CLA-01: 26 activos × 18 modelos = 468 celdas", () => {
  assert.equal(todo.filas.length, 26);
  assert.equal(todo.columnas.length, 18);
  assert.equal(todo.celdas, 468);
  assert.equal(todo.filas.reduce((a, f) => a + f.celdas.length, 0), 468);
});

test("R-CLA-06: solo SUBE o BAJA en celdas y consensos, y coinciden con el JSON", () => {
  for (const f of todo.filas) {
    const p = c05.predicciones[f.ticker];
    assert.ok(["SUBE", "BAJA"].includes(f.consenso));
    assert.equal(f.consenso, p.consenso);
    f.celdas.forEach((c, i) => {
      assert.ok(["SUBE", "BAJA"].includes(c.senal));
      assert.equal(c.senal, p.modelos[i].senal, f.ticker + " / " + c.modelo); // se lee, no se recalcula
      assert.equal(c.prob, p.modelos[i].prob_sube);
    });
  }
});

test("una tercera clase en los datos detiene el módulo en vez de mostrarse", () => {
  const malo = JSON.parse(JSON.stringify(c05));
  malo.predicciones.AAPL.modelos[0].senal = "MANTENER";
  assert.throws(() => C.modeloVista(malo, universo, {}), /no binaria/);
  const malo2 = JSON.parse(JSON.stringify(c05));
  malo2.predicciones.AAPL.consenso = "NEUTRO";
  assert.throws(() => C.modeloVista(malo2, universo, {}), /no binaria/);
});

test("R-CLA-02: votos, probabilidad media y confianza salen del JSON", () => {
  for (const f of todo.filas) {
    const p = c05.predicciones[f.ticker];
    assert.equal(f.votos_sube, p.votos_sube);
    assert.equal(f.votos_baja, p.votos_baja);
    assert.equal(f.prob_media, p.prob_media);
    assert.equal(f.confianza, p.confianza);
    assert.equal(f.celdas.filter(c => c.senal === "SUBE").length, p.votos_sube);
  }
});

test("R-CLA-05: filtros por familia y por grupo", () => {
  const ml = C.modeloVista(c05, universo, { familia: "ML" }), dl = C.modeloVista(c05, universo, { familia: "DL" });
  assert.equal(ml.columnas.length, 11); assert.equal(ml.celdas, 26 * 11);
  assert.equal(dl.columnas.length, 7); assert.equal(dl.celdas, 26 * 7);
  assert.ok(ml.columnas.every(c => c.familia === "ML"));
  const grupos = [...new Set(universo.map(a => a.grupo))];
  assert.equal(grupos.length, 4);
  let suma = 0;
  for (const g of grupos) { const v = C.modeloVista(c05, universo, { grupo: g }); assert.ok(v.filas.every(f => f.grupo === g)); suma += v.filas.length; }
  assert.equal(suma, 26);
  assert.equal(C.modeloVista(c05, universo, { grupo: "Magnificas 7" }).filas.length, 7);
});

test("watchlist y modelos ocultos (G10, G17)", () => {
  const w = C.modeloVista(c05, universo, { soloWatch: true, watch: ["NVDA", "SPY"] });
  assert.deepEqual(w.filas.map(f => f.ticker), ["NVDA", "SPY"]);
  const o = C.modeloVista(c05, universo, { ocultos: ["XGBoost", "LSTM"] });
  assert.equal(o.columnas.length, 16);
  assert.ok(!o.columnas.some(c => c.modelo === "XGBoost"));
  assert.equal(C.metricasVisibles(c05, { familia: "DL", ocultos: ["LSTM"] }).length, 6);
  assert.equal(C.modeloVista(c05, universo, { soloWatch: true, watch: [] }).celdas, 0);
});

test("intensidad de celda: umbrales 0,04 y 0,08 sin errores de coma flotante", () => {
  assert.equal(C.intensidad(0.5), 1); assert.equal(C.intensidad(0.539), 1);
  assert.equal(C.intensidad(0.54), 2); assert.equal(C.intensidad(0.46), 2);
  assert.equal(C.intensidad(0.58), 3); assert.equal(C.intensidad(0.42), 3); // 0,58 − 0,5 = 0,0799999… en coma flotante
  assert.equal(C.intensidad(0.799), 3); assert.equal(C.intensidad(0.157), 3);
});

test("R-CLA-04: el resumen de calidad se deriva de los datos (contrato §5)", () => {
  const r = C.resumen(c05);
  assert.equal(r.modelos, 18);
  assert.deepEqual(r.porFamilia, { ML: 11, DL: 7 });
  assert.equal(r.exactitudMin, Math.min(...c05.modelos.map(m => m.exactitud)));
  assert.equal(r.exactitudMax, Math.max(...c05.modelos.map(m => m.exactitud)));
  assert.ok(r.exactitudMin > 0.5 && r.exactitudMax < 0.6, "apenas mejor que una moneda");
  const mc = c05.modelos[0].matriz_confusion;
  assert.equal(r.tasaBase, (mc.VP + mc.FN) / c05.modelos[0].n_prueba);
  // Si el pipeline publica tasa_base_sube, se usa ese campo
  assert.equal(C.resumen({ ...c05, tasa_base_sube: 0.6 }).tasaBase, 0.6);
});

test("invariantes I-01 e I-02 que usa el módulo se cumplen en data/", () => {
  assert.deepEqual(Object.keys(c05.predicciones), universo.map(a => a.ticker));
  for (const m of c05.modelos) { const k = m.matriz_confusion; assert.equal(k.VP + k.FP + k.VN + k.FN, m.n_prueba, m.modelo); }
});

test("clasificacion.html: sin cifras escritas a mano y con los contenedores que usan las pruebas E2E", () => {
  const h = leer("clasificacion.html");
  for (const id of ["ficha", "filtro-grupo", "filtro-familia", "solo-watchlist", "vista", "mapa-envoltura", "consenso", "metricas", "matriz-confusion", "honestidad", "contador"]) {
    assert.ok(h.includes(`id="${id}"`), "falta #" + id);
  }
  const visible = h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
  assert.ok(!/\d/.test(visible), "hay dígitos en el texto de la página: " + (visible.match(/\S*\d\S*/) || [""])[0]);
  const js = leer("js", "clasificacion.js").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  assert.ok(!/0\.5[0-9]|0\.08|0\.04|\b468\b|\b18\b|\b26\b/.test(js), "constantes de datos escritas en js/clasificacion.js");
});
