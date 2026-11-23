// Comandos de voz (T-90, PLAN_MAESTRO §9.7): el intérprete convierte frases en acciones, en ES y EN.
import test from "node:test";
import assert from "node:assert/strict";
import V from "../../js/a11y/voz.js";
import { dato, leerJSON, leer } from "./_util.mjs";

const gram = idioma => leerJSON("locales", idioma + ".json").voz;
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

test("T-90b: números dichos con palabras pasan a cifras (ES y EN)", () => {
  assert.equal(V.palabrasANumeros("treinta y siete", "es"), "37");
  assert.equal(V.palabrasANumeros("dos mil veinticinco", "es"), "2025");
  assert.equal(V.palabrasANumeros("ciento veinte", "es"), "120");
  assert.equal(V.palabrasANumeros("magnificas siete", "es"), "magnificas 7");
  assert.equal(V.palabrasANumeros("two thousand twenty five", "en"), "2025");
  assert.equal(V.palabrasANumeros("one hundred five", "en"), "105");
  assert.equal(V.palabrasANumeros("mil", "es"), "mil", "«mil» suelto no es un número aquí");
});

test("T-90b: ordinales para elegir entre botones repetidos", () => {
  assert.deepEqual(V.extraerOrdinal("el segundo comprar", "es"), { indice: 2, resto: "el comprar" });
  assert.deepEqual(V.extraerOrdinal("comprar número dos", "es"), { indice: 2, resto: "comprar" });
  assert.deepEqual(V.extraerOrdinal("la última", "es"), { indice: -1, resto: "la" });
  assert.deepEqual(V.extraerOrdinal("the third buy", "en"), { indice: 3, resto: "the buy" });
  assert.equal(V.extraerOrdinal("mostrar todos", "es").indice, null);
});

test("T-90b: «clic en …» con varias palabras, abreviaturas, números y periodos", () => {
  const ok = (dicho, nombre, l = "es") => assert.ok(V.puntuar(dicho, nombre, l) >= V.UMBRAL_CLIC, `«${dicho}» → «${nombre}» (${V.puntuar(dicho, nombre, l).toFixed(2)})`);
  const no = (dicho, nombre, l = "es") => assert.ok(V.puntuar(dicho, nombre, l) < V.UMBRAL_CLIC, `«${dicho}» no es «${nombre}»`);
  ok("elegir moderado", "Elegir el nivel Moderado");
  ok("mostrar todos", "Mostrar todos los modelos");
  ok("veinticinco de noviembre", "1. 25 nov. 2025");
  ok("magnificas siete", "Magníficas 7");
  ok("tres meses", "3M"); ok("un año", "1A"); ok("3 m", "3M"); ok("one year", "1Y", "en");
  no("tres meses", "1M"); no("comprar", "Vender"); no("ver su regresion", "Ver en el optimizador");
  // Entre varios candidatos gana el más completo; si empatan, vuelven todos (en orden del documento) para elegir
  const items = [{ nombres: ["Quitar AAPL de la watchlist", "Quitar"] }, { nombres: ["Quitar MSFT de la watchlist", "Quitar"] }, { nombres: ["Agregar"] }];
  assert.equal(V.mejoresCoincidencias("quitar", items, "es").length, 2, "dos «Quitar» empatados: se pregunta cuál");
  assert.deepEqual(V.mejoresCoincidencias("quitar msft", items, "es"), [items[1]], "con el ticker ya no hay duda");
  assert.deepEqual(V.mejoresCoincidencias("nada que ver", items, "es"), []);
});

test("T-90b: sin espacios solo cuenta sobre palabras completas (una etiqueta larga con «…63 mínimo…» no es «3 meses»)", () => {
  assert.ok(V.puntuar("tres meses", "AAPL: último cierre USD 355.63 el 11 de noviembre; el mínimo fue USD 328.21", "es") < V.UMBRAL_CLIC);
  assert.ok(V.puntuar("3 m", "3M", "es") >= 1);
});

test("voz en cualquier escritura: normalización Unicode (NFKC/NFD), sin tashkeel y con el alef unificado en árabe (Lab 13)", () => {
  assert.equal(V.normalizar("اَلتَّصْنِيفُ أداة"), "التصنيف اداه");
  assert.equal(V.normalizar("ＡＢＣ　１２３"), "abc 123", "ancho completo → normal");
  assert.equal(V.normalizar("Классификация!"), "классификация");
});

test("voz en japonés: el verbo va al final y no hay espacios («分類を開く»)", () => {
  const G = leerJSON("locales", "ja-JP.json").voz;
  assert.deepEqual(V.interpretar("分類を開く", G, activos), { accion: "ir", modulo: "clasificacion" });
  assert.deepEqual(V.interpretar("バックテストに移動", G, activos), { accion: "ir", modulo: "backtesting" });
  assert.equal(V.interpretar("購入をクリック", G, activos).texto, "購入");
  assert.ok(V.puntuar("購入", "購入する") >= V.UMBRAL_CLIC, "en japonés «clic en» compara por subcadenas");
});

test("voz en árabe: «اذهب إلى التصنيف» abre Clasificación y «اللغة …» pide otro idioma", () => {
  const G = leerJSON("locales", "ar-EG.json").voz;
  assert.deepEqual(V.interpretar("اذهب إلى التصنيف", G, activos), { accion: "ir", modulo: "clasificacion" });
  assert.deepEqual(V.interpretar("اللغة اليابانية", G, activos), { accion: "idioma", texto: "اليابانيه" });
});
