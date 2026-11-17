// Núcleo (js/common.js): funciones puras, i18n, formatos y compatibilidad con la base. [T-03] [T-04]
import test from "node:test";
import assert from "node:assert/strict";
import comun from "../../js/common.js";
import { leerJSON } from "./_util.mjs";

const { EIA, PAGES, fmt, store } = comun;
const ES = leerJSON("i18n", "es-PE.json"), EN = leerJSON("i18n", "en-US.json");

test("compatibilidad con la base: se conservan $, fmt, loadJSON, store, PAGES, buildShell y showError", () => {
  for (const n of ["$", "$$", "fmt", "loadJSON", "store", "applyTheme", "buildShell", "showError", "PAGES", "EIA"]) assert.ok(n in comun, "falta " + n);
  for (const n of ["n", "pct", "usd", "cls"]) assert.equal(typeof fmt[n], "function", "fmt." + n);
  assert.equal(PAGES.length, 9);
  assert.deepEqual(PAGES.map(p => p[2]), ["dashboard", "watchlist", "trading", "leaderboard", "clasificacion", "regresion", "optimizador", "portafolios", "backtesting"]);
});

test("el Modo profesor es el que se abre por defecto (D-02)", () => {
  assert.equal(EIA.modo(), "profesor");
});

test("urlDatos: data/ en profesor; data_real/ con versión y corte en real", () => {
  assert.equal(EIA.urlDatos("05_clasificadores_binarios.json", { modo: "profesor" }), "data/05_clasificadores_binarios.json");
  assert.equal(EIA.urlDatos("10_dashboard_mercado.json", { modo: "real", version: "2026-11-16T22:30:00Z" }), "data_real/10_dashboard_mercado.json?v=2026-11-16T22%3A30%3A00Z");
  assert.equal(EIA.urlDatos("05_clasificadores_binarios.json", { modo: "real", corte: "2026-10-30" }), "data_real/cortes/2026-10-30/05_clasificadores_binarios.json");
  // 10 no depende del corte: siempre es el último
  assert.equal(EIA.urlDatos("10_dashboard_mercado.json", { modo: "real", corte: "2026-10-30" }), "data_real/10_dashboard_mercado.json");
});

test("diasHabiles cuenta de lunes a viernes", () => {
  assert.equal(EIA.diasHabiles("2026-11-11", new Date("2026-11-11T15:00:00Z")), 0);
  assert.equal(EIA.diasHabiles("2026-11-11", new Date("2026-11-12T15:00:00Z")), 1);
  assert.equal(EIA.diasHabiles("2026-11-13", new Date("2026-11-16T15:00:00Z")), 1); // viernes → lunes
  assert.equal(EIA.diasHabiles("2026-11-11", new Date("2026-11-20T15:00:00Z")), 7);
});

test("estado: funciona sin localStorage (respaldo en memoria) y store() mantiene la firma de la base", () => {
  assert.equal(store("eia_prueba"), null);
  store("eia_prueba", { a: 1 });
  assert.deepEqual(store("eia_prueba"), { a: 1 });
  assert.deepEqual(EIA.estado.get("eia_no_existe", [1]), [1]);
  EIA.estado.del("eia_prueba");
  assert.equal(EIA.estado.get("eia_prueba"), null);
});

test("eventos: on devuelve la función que cancela", () => {
  let n = 0;
  const cancelar = EIA.on("eia:prueba", d => { n += d.x; });
  EIA.emit("eia:prueba", { x: 2 });
  cancelar();
  EIA.emit("eia:prueba", { x: 5 });
  assert.equal(n, 2);
});

test("i18n: parámetros con nombre, plurales y mapa de presentación", () => {
  EIA.usarDiccionario(ES, "es-PE");
  assert.equal(EIA.t("shell.modo_profesor", { fecha: "X" }), "Profesor · X");
  assert.match(EIA.t("aviso.real.vencido", { n: 1 }), /1 día hábil /);
  assert.match(EIA.t("aviso.real.vencido", { n: 6 }), /6 días hábiles/);
  assert.equal(EIA.nombre("modelo", "Arbol de decision"), "Árbol de decisión");
  assert.equal(EIA.nombre("grupo", "Magnificas 7"), "Magníficas 7");
  assert.equal(EIA.nombre("sector", "Mercado EE.UU. amplio"), "Mercado amplio de EE. UU."); // clave con puntos
  assert.equal(EIA.nombre("modelo", "Modelo que no existe"), "Modelo que no existe"); // sin mapa: tal cual, sin error
  assert.equal(EIA.t("clave.que.no.existe"), "⟦clave.que.no.existe⟧");
  EIA.usarDiccionario(EN, "en-US");
  assert.equal(EIA.nombre("senal", "SUBE"), "UP");
  assert.equal(EIA.nombre("senal", "BAJA"), "DOWN");
  assert.match(EIA.t("aviso.real.vencido", { n: 1 }), /1 business day old/);
});

test("formatos con Intl según el idioma (R-I18N-01, R-REG-07)", () => {
  EIA.usarDiccionario(ES, "es-PE");
  assert.equal(EIA.fmt.pct(2.93), "+2.93%");
  assert.equal(EIA.fmt.pct(-0.37), "-0.37%");
  assert.equal(EIA.fmt.pct(55.95, 1, { signo: false }), "56.0%");
  assert.equal(EIA.fmt.num(1234567.891), "1,234,567.89");
  assert.match(EIA.fmt.usd(355.63), /^USD\s355\.63$/);
  assert.equal(EIA.fmt.fecha("2026-11-11", "larga"), "11 de noviembre de 2026");
  assert.equal(EIA.fmt.fecha("inicio"), "Inicio"); // 09.fechas[0] no es una fecha (I-06)
  assert.equal(fmt.cls(1), "up"); assert.equal(fmt.cls(-1), "dn"); assert.equal(fmt.cls(0), "mut");
  EIA.usarDiccionario(EN, "en-US");
  assert.equal(EIA.fmt.usd(355.63), "$355.63");
  assert.equal(EIA.fmt.fecha("2026-11-11", "larga"), "November 11, 2026");
  assert.equal(EIA.fmt.fecha("inicio"), "Start");
});

test("las fechas ISO se formatean en UTC: no se corren un día en Lima (UTC−5)", () => {
  EIA.usarDiccionario(ES, "es-PE");
  // El formato no depende de la zona horaria de la máquina
  assert.match(EIA.fmt.fecha("2026-11-11"), /^11 /);
  assert.match(EIA.fmt.fecha("2026-01-01"), /^01 /);
});

test("ordenarFilas: numérico, texto y estable", () => {
  EIA.usarDiccionario(ES, "es-PE");
  const filas = [{ m: "b", x: 2 }, { m: "a", x: 2 }, { m: "c", x: 1 }];
  assert.deepEqual(EIA.ordenarFilas(filas, { clave: "x" }, "desc").map(f => f.m), ["b", "a", "c"]); // empate: conserva el orden
  assert.deepEqual(EIA.ordenarFilas(filas, { clave: "x" }, "asc").map(f => f.m), ["c", "b", "a"]);
  assert.deepEqual(EIA.ordenarFilas(filas, { clave: "m" }, "asc").map(f => f.m), ["a", "b", "c"]);
  assert.deepEqual(EIA.ordenarFilas(filas, { clave: "y", valor: f => -f.x }, "desc").map(f => f.m), ["c", "b", "a"]);
  assert.deepEqual(filas.map(f => f.m), ["b", "a", "c"], "no muta la entrada");
});

test("solo dos clases: el chip de señal rechaza cualquier otro valor (R-CLA-06)", () => {
  EIA.usarDiccionario(ES, "es-PE");
  assert.deepEqual(EIA.SENALES, ["SUBE", "BAJA"]);
  assert.match(EIA.ui.chipSenal("SUBE", 0.62), /▲.*SUBE.*0\.62/s);
  assert.match(EIA.ui.chipSenal("BAJA"), /▼.*BAJA/s);
  for (const malo of ["NEUTRO", "MANTENER", "HOLD", "", undefined]) assert.throws(() => EIA.ui.chipSenal(malo));
});

test("EIA.esc escapa el HTML de los datos", () => {
  assert.equal(EIA.esc('<b a="1">&\'</b>'), "&lt;b a=&quot;1&quot;&gt;&amp;&#39;&lt;/b&gt;");
});

test("R-INT-05: migas de pan solo al llegar por un enlace cruzado, encadenadas y sin ciclos (PLAN_MAESTRO §4)", () => {
  assert.equal(EIA.paginaDeRuta("/EquipoA/regresion.html"), "regresion");
  assert.equal(EIA.paginaDeRuta("/EquipoA/"), "dashboard", "la raíz de Pages es el Dashboard");
  assert.equal(EIA.paginaDeRuta("/EquipoA/otra.html"), null);
  const clas = { pagina: "clasificacion", href: "clasificacion.html?t=NVDA" };
  // Clasificación → Regresión: «Clasificación › NVDA › Regresión»
  const r1 = EIA.calcularMigas({ pagina: "regresion", contexto: "t", anterior: clas, guardado: { pagina: "clasificacion", contexto: "t", ruta: [] } });
  assert.deepEqual(r1, [clas]);
  // … → Optimizador: se encadena
  const reg = { pagina: "regresion", href: "regresion.html?t=NVDA" };
  const r2 = EIA.calcularMigas({ pagina: "optimizador", contexto: "t", anterior: reg, guardado: { pagina: "regresion", contexto: "t", ruta: r1 } });
  assert.deepEqual(r2.map(x => x.pagina), ["clasificacion", "regresion"]);
  // Recargar conserva el recorrido; volver a una página del recorrido lo recorta
  assert.deepEqual(EIA.calcularMigas({ pagina: "optimizador", contexto: "t", anterior: reg, guardado: { pagina: "optimizador", contexto: "t", ruta: r2 } }), r2);
  const opt = { pagina: "optimizador", href: "optimizador.html?t=NVDA" };
  assert.deepEqual(EIA.calcularMigas({ pagina: "regresion", contexto: "t", anterior: opt, guardado: { pagina: "optimizador", contexto: "t", ruta: r2 } }), [clas]);
  // Sin contexto en la URL (llegada por la barra de módulos) o sin página anterior: no hay migas
  assert.deepEqual(EIA.calcularMigas({ pagina: "regresion", contexto: null, anterior: clas, guardado: null }), []);
  assert.deepEqual(EIA.calcularMigas({ pagina: "regresion", contexto: "t", anterior: null, guardado: null }), []);
  // Un recorrido guardado de otra rama no se mezcla, ni uno de otro tipo de contexto (nivel frente a activo)
  assert.deepEqual(EIA.calcularMigas({ pagina: "clasificacion", contexto: "t", anterior: { pagina: "backtesting", href: "backtesting.html?nivel=Agresivo" }, guardado: { pagina: "backtesting", contexto: "nivel", ruta: [{ pagina: "portafolios", href: "portafolios.html" }] } }).map(x => x.pagina), ["backtesting"]);
  assert.deepEqual(EIA.calcularMigas({ pagina: "backtesting", contexto: "nivel", anterior: { pagina: "portafolios", href: "portafolios.html" }, guardado: { pagina: "optimizador", contexto: "t", ruta: r2 } }).map(x => x.pagina), ["portafolios"]);
});

test("EIA.todos: en paralelo, pero el error es el primero en el orden pedido (el diagnóstico no depende de qué 404 llega antes)", async () => {
  const espera = (ms, v, falla) => new Promise((ok, mal) => setTimeout(() => (falla ? mal(new Error(v)) : ok(v)), ms));
  assert.deepEqual(await EIA.todos([espera(5, "a"), espera(1, "b")]), ["a", "b"]);
  // 13 falla antes que 09, pero se informa 09 (el archivo principal del módulo va primero)
  await assert.rejects(EIA.todos([espera(20, "09", true), espera(1, "13", true)]), /09/);
});
