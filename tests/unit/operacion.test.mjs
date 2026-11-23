// Operación y vigilancia (Spec W13 G.4): estado del mercado, alertas y notificaciones en el núcleo, historial de órdenes. [T-112]
import test from "node:test";
import assert from "node:assert/strict";
import comun from "../../js/common.js";
import Ordenes from "../../js/ordenes.js";
import { dato, leer } from "./_util.mjs";

const { EIA } = comun;

test("mercado de Nueva York: abierto de lunes a viernes de 9:30 a 16:00 ET, con la próxima apertura si está cerrado", () => {
  // Lunes 23-nov-2026, 10:00 ET (15:00 UTC, horario de invierno): abierto, cierra a las 21:00 UTC
  assert.deepEqual(EIA.mercado(new Date("2026-11-23T15:00:00Z")), { abierto: true, cierre: new Date("2026-11-23T21:00:00Z") });
  // Sábado: la próxima apertura es el lunes a las 9:30 ET
  assert.deepEqual(EIA.mercado(new Date("2026-11-21T15:00:00Z")), { abierto: false, apertura: new Date("2026-11-23T14:30:00Z") });
  // Lunes 17:00 ET: abre el martes; lunes 8:00 ET: abre ese mismo día
  assert.equal(EIA.mercado(new Date("2026-11-23T22:00:00Z")).apertura.toISOString(), "2026-11-24T14:30:00.000Z");
  assert.equal(EIA.mercado(new Date("2026-11-23T13:00:00Z")).apertura.toISOString(), "2026-11-23T14:30:00.000Z");
  // Horario de verano (julio): 9:30 ET = 13:30 UTC
  assert.equal(EIA.mercado(new Date("2026-07-04T12:00:00Z")).apertura.toISOString(), "2026-07-06T13:30:00.000Z");
  // Viernes 15:59 ET abierto; 16:00 ET cerrado hasta el lunes
  assert.equal(EIA.mercado(new Date("2026-11-27T20:59:00Z")).abierto, true);
  assert.equal(EIA.mercado(new Date("2026-11-27T21:00:00Z")).apertura.toISOString(), "2026-11-30T14:30:00.000Z");
});

test("alertas en el núcleo: las reglas del contrato (§2, archivo 11) y una alerta inactiva nunca se dispara", () => {
  const act = { ultimo: 100, var_1d_pct: -2.5 };
  assert.equal(EIA.alertas.disparada({ activa: true, tipo: "precio_sobre", umbral: 100 }, act), true);
  assert.equal(EIA.alertas.disparada({ activa: true, tipo: "precio_bajo", umbral: 99 }, act), false);
  assert.equal(EIA.alertas.disparada({ activa: true, tipo: "var_1d_menor_a_pct", umbral: -2 }, act), true);
  assert.equal(EIA.alertas.disparada({ activa: false, tipo: "precio_sobre", umbral: 1 }, act), false);
  const c11 = dato("11_watchlist_alertas_portafolio_demo.json");
  assert.deepEqual(EIA.alertas.iniciales(c11).map(a => a.id), c11.alertas.map((a, i) => "a" + (i + 1)));
});

test("notificaciones: no se repiten por id, cuentan las no leídas y guardan datos (no textos traducidos)", () => {
  EIA.estado.del(EIA.notificaciones.clave());
  assert.equal(EIA.notificaciones.agregar({ id: "alerta|a1|x", tipo: "alerta", datos: { ticker: "NVDA", tipo: "precio_sobre", umbral: 1 } }), true);
  assert.equal(EIA.notificaciones.agregar({ id: "alerta|a1|x", tipo: "alerta", datos: {} }), false);
  EIA.notificaciones.agregar({ tipo: "orden", datos: { lado: "C", ticker: "SPY", n: 2, precio: 10 } });
  assert.equal(EIA.notificaciones.noLeidas(), 2);
  assert.equal(EIA.notificaciones.lista()[0].tipo, "orden"); // la más reciente primero
  EIA.notificaciones.marcarLeidas();
  assert.equal(EIA.notificaciones.noLeidas(), 0);
  EIA.estado.del(EIA.notificaciones.clave());
});

test("historial de órdenes: filtros, totales y CSV con cabeceras estables", () => {
  const l = [
    { fecha: "2026-11-20T15:00:00.000Z", ticker: "NVDA", lado: "C", cantidad: 2, precio: 100 },
    { fecha: "2026-11-22T15:00:00.000Z", ticker: "SPY", lado: "V", cantidad: 1, precio: 50 },
    { fecha: "2026-11-21T15:00:00.000Z", ticker: "NVDA", lado: "V", cantidad: 1, precio: 110 }
  ];
  assert.deepEqual(Ordenes.filtrar(l, {}).map(o => o.fecha.slice(8, 10)), ["22", "21", "20"]);
  assert.equal(Ordenes.filtrar(l, { ticker: "NVDA", lado: "V" }).length, 1);
  assert.equal(Ordenes.filtrar(l, { desde: "2026-11-21", hasta: "2026-11-21" }).length, 1);
  assert.deepEqual(Ordenes.totales(l), { n: 3, comprado: 200, vendido: 160 });
  const csv = Ordenes.aCSV(l).replace(/^\uFEFF/, "").trim().split("\n");
  assert.equal(csv[0], "fecha_utc,ticker,lado,cantidad,precio_usd,total_usd");
  assert.equal(csv[1], "2026-11-20T15:00:00.000Z,NVDA,compra,2,100,200");
});

test("la cinta de cotizaciones se puede pausar (WCAG 2.2.2), queda quieta con «reducir movimiento» y no cuenta como texto truncado", () => {
  const css = leer("css", "styles.css"), js = leer("js", "common.js");
  assert.match(js, /id="cinta-pausa"[^>]*aria-pressed=/);
  assert.match(css, /\.cinta\.pausada \.cinta-pista \{ animation-play-state: paused; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.cinta-pista \{ animation: none !important; \}/);
  assert.match(js, /class="cinta-pista cinta-copia" aria-hidden="true"/);
  assert.match(leer("js", "lib", "i18n-calidad.js"), /\[data-marquesina\]/);
});

test("Trading confirma la orden antes de ejecutarla (Spec G.4, Operación)", () => {
  const js = leer("js", "trading.js");
  assert.ok(js.indexOf("EIA.ui.confirmar(") < js.indexOf("EIA.cartera.ejecutar("), "la confirmación va antes de ejecutar");
  assert.match(js, /EIA\.notificaciones\.agregar\(\{ tipo: "orden"/);
});
