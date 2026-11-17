// Portafolios (T-23) y «Llevar a Trading» (núcleo, T-25). [R-POR-01…04] [I-05] [I-09]
import test from "node:test";
import assert from "node:assert/strict";
import comun from "../../js/common.js";
import P from "../../js/portafolios.js";
import { dato, leer } from "./_util.mjs";

const { EIA } = comun, C = EIA.cartera;
const c08 = dato("08_portafolios_3_niveles_riesgo.json"), c07 = dato("07_optimizador_markowitz_nsga.json"), c10 = dato("10_dashboard_mercado.json");
const precio = tk => (c10.find(a => a.ticker === tk) || {}).ultimo;
const cerca = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m || ""} ${a} vs ${b}`);

test("R-POR-03: las razones son las del JSON, literales, y los pesos < 1 % se declaran aparte (I-05)", () => {
  for (const n of c08.niveles) {
    const r = P.razones(n, []);
    assert.equal(r.filas.length, n.detalle_activos.length);
    r.filas.forEach((f, i) => assert.equal(f.razon, n.detalle_activos[i].razon, "razón literal"));
    for (const m of r.menores) assert.ok(m.peso < P.UMBRAL_DETALLE, m.ticker);
    assert.equal(r.filas.length + r.menores.length, Object.keys(n.pesos).length, n.nivel + ": todos los pesos aparecen");
    cerca(r.sumaRenormalizada, 1, 1e-9, n.nivel);
  }
});

test("G10: excluir un activo reparte su peso entre los demás", () => {
  const n = c08.niveles[1], ex = ["AMZN"], r = P.razones(n, ex);
  const amzn = r.filas.find(f => f.ticker === "AMZN");
  assert.equal(amzn.excluido, true); assert.equal(amzn.renormalizado, 0);
  cerca(r.sumaRenormalizada, 1, 1e-9);
  const otro = r.filas.find(f => !f.excluido);
  const suma = Object.values(n.pesos).reduce((a, b) => a + b, 0); // en el archivo suman 0,9992, no exactamente 1
  cerca(otro.renormalizado, n.pesos[otro.ticker] / (suma - n.pesos.AMZN), 1e-12, "proporcional");
  assert.equal(P.razones(n, Object.keys(n.pesos)).quedan, 0);
});

test("R-POR-02: composición de los tres niveles y principales", () => {
  const m = P.composicion(c08);
  for (const n of c08.niveles) assert.ok(Object.keys(n.pesos).every(tk => m.some(f => f.ticker === tk)));
  m.forEach(f => assert.equal(f.pesos.length, 3));
  const top = P.principales(c08.niveles[0], 5);
  assert.equal(top.length, 5); assert.ok(top.every((x, i) => i === 0 || top[i - 1].peso >= x.peso));
});

test("I-09: cada nivel es un punto del frente NSGA-II con las mismas métricas y pesos", () => {
  for (const n of c08.niveles) {
    const id = n.origen.split(" ")[1], p = c07.nsga2_elegibles.find(x => x.id === id);
    assert.ok(p, n.nivel); assert.deepEqual(p.pesos, n.pesos); assert.equal(p.sharpe, n.sharpe);
  }
});

test("Llevar a Trading: plan con cantidad = floor(monto × peso / precio) y sin pasarse del monto (§4.5)", () => {
  const n = c08.niveles[1], pesos = C.renormalizar(n.pesos, []), monto = 25000;
  const plan = C.plan(pesos, monto, precio);
  for (const o of plan.ordenes) {
    assert.equal(o.cantidad, Math.floor((monto * o.peso) / o.precio + 1e-9));
    assert.ok(o.cantidad >= 1);
  }
  assert.ok(plan.total <= monto + 1e-9); cerca(plan.sobrante, monto - plan.total, 1e-9);
  for (const o of plan.sinComprar) assert.ok(o.precio > monto * o.peso, o.ticker + " no alcanza para una acción");
  // Las órdenes del plan pasan la validación de Trading en secuencia
  let c = { efectivo: monto, posiciones: [] };
  for (const o of plan.ordenes) c = C.ejecutar(c, { ticker: o.ticker, lado: "C", cantidad: o.cantidad }, o.precio);
  cerca(c.efectivo, plan.sobrante, 1e-6);
  assert.deepEqual(C.renormalizar({ A: 0.5, B: 0.5 }, ["A", "B"]), {});
  assert.deepEqual(C.plan({ AAPL: 1 }, 10, precio).ordenes, [], "monto menor que una acción");
});

test("portafolios.html: sin cifras escritas a mano y con sus contenedores", () => {
  const h = leer("portafolios.html");
  for (const id of ["ficha", "niveles", "grafico", "razones", "corte-real"]) assert.ok(h.includes(`id="${id}"`), "falta #" + id);
  assert.ok(!/<script>(?!<\/script>)/.test(h));
  const visible = h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/NSGA-II/g, "");
  assert.ok(!/\d/.test(visible), "hay dígitos: " + (visible.match(/\S*\d\S*/) || [""])[0]);
  const js = leer("js", "portafolios.js").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  assert.ok(!/(más|mayor|menor) (riesgo|retorno) que/i.test(js), "N-4: no se afirma un orden entre niveles");
});
