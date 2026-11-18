// Módulo de Regresión: modelo de vista sobre los datos del profesor. [T-17] [R-REG-01…09]
import test from "node:test";
import assert from "node:assert/strict";
import R from "../../js/regresion.js";
import { dato, leer } from "./_util.mjs";

const c06 = dato("06_regresores_precio_30d.json"), c02 = dato("02_precios_sinteticos_504d.json");

test("R-REG-09: la comprobación literal de la guía falla en 5 activos y la igualdad inversa (I-03b) pasa en los 26", () => {
  const g = R.verificacionGlobal(c06);
  assert.equal(g.total, 26);
  assert.equal(g.inversa, 26);
  assert.equal(g.literal, 21);
  assert.deepEqual(g.fallanLiteral.sort(), ["AMZN", "META", "MSFT", "SPY", "TSLA"]);
  const meta = R.verificar(c06.predicciones.META);
  assert.equal(meta.literal.cumple, false);
  assert.ok(Math.abs(meta.literal.diferencia - 0.021411) < 1e-6, "máximo declarado en el contrato (nota N-1)");
  assert.equal(meta.inversa.cumple, true);
  assert.equal(R.verificar(c06.predicciones.NVDA).literal.cumple, true);
});

test("la verificación detecta un retorno publicado que no corresponde a la mediana", () => {
  const malo = JSON.parse(JSON.stringify(c06.predicciones.NVDA));
  malo.retorno_proyectado_30d_pct += 0.05;
  const v = R.verificar(malo);
  assert.equal(v.inversa.cumple, false);
  assert.equal(v.literal.cumple, false);
});

test("R-REG-01: historia de 120 sesiones por defecto + 30 proyectadas, unidas en el corte", () => {
  const v = R.vistaActivo(c06, c02, "NVDA", {});
  assert.equal(R.VENTANA_POR_DEFECTO, 120);
  assert.equal(v.historia.length, 120);
  assert.equal(v.fechasPronostico.length, 30);
  assert.equal(v.fechasHistoria.at(-1), c02.fechas.at(-1));
  assert.ok(v.fechasPronostico[0] > v.fechasHistoria.at(-1), "el pronóstico empieza después del corte");
  assert.equal(v.historia.at(-1), v.ultimo, "último cierre de 02 = precio_ultimo de 06 (I-07)");
  assert.equal(v.mediana, c06.predicciones.NVDA.ensamble_mediana);
  assert.equal(v.final.mediana, c06.predicciones.NVDA.ensamble_mediana[29]);
  assert.ok(v.final.p10 <= v.final.mediana && v.final.mediana <= v.final.p90, "la mediana está dentro de la banda");
  assert.ok(v.final.conoInf < v.final.mediana && v.final.mediana < v.final.conoSup, "y dentro del cono");
  for (const n of R.VENTANAS) assert.equal(R.vistaActivo(c06, c02, "NVDA", { ventana: n }).historia.length, n);
  assert.equal(R.vistaActivo(c06, c02, "NO_EXISTE", {}), null);
});

test("R-REG-02 y G10: familia y modelos ocultos", () => {
  assert.equal(R.vistaActivo(c06, c02, "AAPL", {}).modelos.length, 18);
  assert.equal(R.vistaActivo(c06, c02, "AAPL", { familia: "ML" }).modelos.length, 11);
  assert.equal(R.vistaActivo(c06, c02, "AAPL", { familia: "DL" }).modelos.length, 7);
  const oc = R.vistaActivo(c06, c02, "AAPL", { ocultos: ["XGBoost", "LSTM"] });
  assert.equal(oc.modelos.length, 16);
  assert.ok(!oc.modelos.some(m => m.modelo === "XGBoost"));
  assert.equal(R.modelosVisibles(c06, { familia: "DL", ocultos: ["LSTM"] }).length, 6);
  for (const m of R.vistaActivo(c06, c02, "AAPL", {}).modelos) assert.equal(m.precios.length, 30);
});

test("ficha IA: el resumen de calidad sale del JSON (G1, G2)", () => {
  const r = R.resumen(c06);
  assert.equal(r.modelos, 18);
  assert.deepEqual(r.porFamilia, { ML: 11, DL: 7 });
  assert.equal(r.horizonte, 30);
  assert.equal(r.mape[0], Math.min(...c06.modelos.map(m => m.mape_30d_pct)));
  assert.equal(r.mejora[1], Math.max(...c06.modelos.map(m => m.mejora_vs_persistencia_pct)));
  assert.equal(r.mejoran, c06.modelos.filter(m => m.mejora_vs_persistencia_pct > 0).length);
});

test("regresion.html: sin cifras escritas a mano y con los contenedores que usan las pruebas E2E", () => {
  const h = leer("regresion.html");
  for (const id of ["ficha", "activo", "estrella", "filtro-familia", "ventana", "solo-watchlist", "ver-banda", "ver-cono", "lista-modelos", "grafico", "retorno", "verificacion", "metricas", "contador", "corte-real"]) {
    assert.ok(h.includes(`id="${id}"`), "falta #" + id);
  }
  assert.match(h, /id="ver-banda" checked/, "R-REG-04: banda activada por defecto");
  assert.match(h, /id="ver-cono" checked/, "R-REG-04: cono disponible y activado");
  const visible = h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<title[\s\S]*?<\/title>/, "").replace(/<h1[\s\S]*?<\/h1>/, "").replace(/<[^>]+>/g, " ")
    .replace(/\bp10\b|\bp90\b/g, "");
  assert.ok(!/\d/.test(visible), "hay dígitos en el texto de la página: " + (visible.match(/\S*\d\S*/) || [""])[0]);
});

test("T-26: con modelos peores que «el precio no cambia» (datos reales), el rango de mejora es solo el de los que mejoran", () => {
  const otro = JSON.parse(JSON.stringify(c06));
  otro.modelos.forEach((m, i) => { m.mejora_vs_persistencia_pct = i < 6 ? 0.5 + i * 0.25 : -1 - i; });
  const r = R.resumen(otro);
  assert.equal(r.mejoran, 6);
  assert.deepEqual(r.mejoraPositiva, [0.5, 1.75], "solo los 6 que mejoran");
  assert.ok(r.mejora[0] < 0, "el rango completo sigue disponible para «hasta {peor}»");
  otro.modelos.forEach(m => { m.mejora_vs_persistencia_pct = -2; });
  assert.equal(R.resumen(otro).mejoraPositiva, null, "si ninguno mejora no hay rango positivo");
  assert.equal(R.resumen(c06).mejoran, R.resumen(c06).modelos, "en el Modo profesor mejoran los 18");
});
