// Comandos de voz (T-90, PLAN_MAESTRO §9.7): el intérprete convierte frases en acciones, en ES y EN.
import test from "node:test";
import assert from "node:assert/strict";
import V from "../../js/a11y/voz.js";
import { dato, leerJSON, leer } from "./_util.mjs";

const gram = idioma => leerJSON("i18n", idioma + ".json").voz;
const ES = gram("es-PE"), EN = gram("en-US");
const activos = dato("10_dashboard_mercado.json").map(a => ({ ticker: a.ticker, nombre: a.nombre }));
const di = (frase, G = ES) => V.interpretar(frase, G, activos);

test("normalizar: sin tildes, mayúsculas ni signos", () => {
  assert.equal(V.normalizar("¡Ir a Clasificación!"), "ir a clasificacion");
  assert.equal(V.normalizar("  Activo   NVDA. "), "activo nvda");
});

test("ir a un módulo (con o sin «ir a»), en ES y EN", () => {
  assert.deepEqual(di("Ir a clasificación"), { accion: "ir", modulo: "clasificacion" });
  assert.deepEqual(di("abre el backtesting"), { accion: "ir", modulo: "backtesting" });
  assert.deepEqual(di("llévame a la regresión"), { accion: "ir", modulo: "regresion" });
  assert.deepEqual(di("portafolios"), { accion: "ir", modulo: "portafolios" });
  assert.deepEqual(di("go to the optimizer", EN), { accion: "ir", modulo: "optimizador" });
  assert.deepEqual(di("leaderboard", EN), { accion: "ir", modulo: "leaderboard" });
  assert.equal(di("ir a la luna"), null, "un módulo que no existe no se inventa");
});

test("activo por ticker, por letras deletreadas o por empresa", () => {
  assert.equal(di("activo NVDA").valor, "NVDA");
  assert.equal(di("activo n v d a").valor, "NVDA", "deletreado");
  assert.equal(di("activo Apple").valor, "AAPL");
  assert.equal(di("Apple").valor, "AAPL", "basta con la empresa");
  assert.equal(di("asset Microsoft", EN).valor, "MSFT");
  const nada = di("activo patito");
  assert.equal(nada.accion, "activo"); assert.equal(nada.valor, null, "no se inventa un activo");
});

test("comandos fijos de vista, filtros, lectura y control", () => {
  assert.deepEqual(di("tema oscuro"), { accion: "tema", valor: "dark" });
  assert.deepEqual(di("light theme", EN), { accion: "tema", valor: "light" });
  assert.deepEqual(di("modo real"), { accion: "modo", valor: "real" });
  assert.deepEqual(di("course mode", EN), { accion: "modo", valor: "profesor" });
  assert.deepEqual(di("solo ML"), { accion: "familia", valor: "ML" });
  assert.deepEqual(di("leer resumen"), { accion: "leer" });
  assert.deepEqual(di("escuchar gráfico"), { accion: "escuchar" });
  assert.deepEqual(di("llevar a trading"), { accion: "llevar" });
  assert.deepEqual(di("siguiente"), { accion: "siguiente" });
  assert.deepEqual(di("bajar"), { accion: "desplazar", sentido: 1 });
  assert.deepEqual(di("scroll up", EN), { accion: "desplazar", sentido: -1 });
  assert.deepEqual(di("inglés"), { accion: "idioma", valor: "en-US" });
  assert.deepEqual(di("spanish", EN), { accion: "idioma", valor: "es-PE" });
  assert.deepEqual(di("¿qué puedo decir?"), { accion: "ayuda" });
  assert.deepEqual(di("detener voz"), { accion: "detener" });
});

test("«clic en …» guarda el texto que se busca en la página", () => {
  assert.deepEqual(di("clic en elegir moderado"), { accion: "clic", texto: "elegir moderado" });
  assert.deepEqual(di("pulsa Trading"), { accion: "clic", texto: "trading" });
  assert.deepEqual(di("click on send", EN), { accion: "clic", texto: "send" });
  assert.equal(di("hola qué tal"), null);
});

test("la gramática es la misma en los dos idiomas y la voz solo se carga bajo demanda", () => {
  assert.deepEqual(Object.keys(ES).filter(k => /^[gm]_/.test(k)).sort(), Object.keys(EN).filter(k => /^[gm]_/.test(k)).sort());
  for (const html of ["index.html", "clasificacion.html", "regresion.html"]) assert.ok(!leer(html).includes("voz.js"), html + " no carga voz.js por su cuenta");
  assert.match(leer("js", "common.js"), /js\/a11y\/voz\.js/, "el núcleo la carga con Alt+Shift+V o al reanudar");
});
