// Accesibilidad (a) y (e): exploración de gráficos, resumen automático, sonificación y barrido. [T-27] [R-A11Y-05]
import test from "node:test";
import assert from "node:assert/strict";
import comun from "../../js/common.js";
import son from "../../js/a11y/sonificacion.js";
import barrido from "../../js/a11y/barrido.js";
import { leer, leerJSON } from "./_util.mjs";

const { EIA } = comun;
EIA.usarDiccionario(leerJSON("i18n", "es-PE.json"), "es-PE");

test("exploración punto a punto: flechas, Inicio/Fin y saltos de página sin salirse de la serie", () => {
  const n = 120;
  assert.equal(EIA.moverCursor(null, "ArrowRight", n), 0, "la primera flecha a la derecha va al inicio");
  assert.equal(EIA.moverCursor(null, "ArrowLeft", n), n - 1, "la primera a la izquierda va al final");
  assert.equal(EIA.moverCursor(5, "ArrowRight", n), 6);
  assert.equal(EIA.moverCursor(0, "ArrowLeft", n), 0, "no pasa del inicio");
  assert.equal(EIA.moverCursor(n - 1, "ArrowRight", n), n - 1, "no pasa del final");
  assert.equal(EIA.moverCursor(40, "Home", n), 0);
  assert.equal(EIA.moverCursor(40, "End", n), n - 1);
  assert.equal(EIA.moverCursor(0, "PageDown", n), 12, "un décimo de la serie");
  assert.equal(EIA.moverCursor(5, "PageUp", n), 0);
  assert.equal(EIA.moverCursor(5, "a", n), null, "otras teclas no mueven");
  assert.equal(EIA.moverCursor(0, "ArrowRight", 0), null);
});

test("resumen automático de una serie: tendencia, extremos, último valor y variación (PLAN_MAESTRO §9.2)", () => {
  const d = EIA.describirSerie([100, 120, 90, 110]);
  assert.deepEqual([d.inicio, d.fin, d.max, d.iMax, d.min, d.iMin, d.tendencia], [100, 110, 120, 1, 90, 2, "sube"]);
  assert.ok(Math.abs(d.variacionPct - 10) < 1e-9);
  assert.equal(EIA.describirSerie([0, -3, -1]).variacionPct, null, "si empieza en 0 (caída desde el máximo) no hay variación porcentual");
  assert.equal(EIA.describirSerie([5, 5, 5]).tendencia, "plana");
  assert.equal(EIA.describirSerie([null, NaN]), null);
  const txt = EIA.textoSerie({ nombre: "NVDA", valores: [100, 120, 90, 110], etiquetas: ["a", "b", "c", "d"], formato: v => "US$" + v, tipo: "tiempo" });
  for (const parte of ["NVDA", "sube", "US$100", "US$110", "US$120 (b)", "US$90 (c)"]) assert.ok(txt.includes(parte), parte + " en «" + txt + "»");
  const cat = EIA.textoSerie({ nombre: "Moderado", valores: [24, 0, 25], etiquetas: ["XLU", "B", "AMZN"], formato: v => v + "%", tipo: "categorias" });
  assert.ok(cat.includes("25% (AMZN)") && cat.includes("0% (B)") && !cat.includes("sube"), cat);
});

test("sonificación: tono por valor (220–880 Hz), paneo de izquierda a derecha y glisando SUBE/BAJA", () => {
  assert.equal(son.frecuencia(0, 0, 10), son.F_MIN);
  assert.equal(son.frecuencia(10, 0, 10), son.F_MAX);
  assert.ok(Math.abs(son.frecuencia(5, 0, 10) - Math.sqrt(son.F_MIN * son.F_MAX)) < 1e-9, "escala logarítmica");
  assert.deepEqual([son.paneo(0, 5), son.paneo(4, 5), son.paneo(0, 1)], [-1, 1, 0]);
  const [a, b] = son.glisando(true), [c, d] = son.glisando(false);
  assert.ok(b > a && d < c, "SUBE asciende y BAJA desciende");
});

test("barrido (e): seis grupos fijos, bloques para grupos grandes y avance circular", () => {
  assert.deepEqual(barrido.GRUPOS, ["navegacion", "controles", "contenido", "graficos", "tablas", "pie"]);
  assert.equal(barrido.clasificar({ cabecera: true, grafico: true }), "navegacion");
  assert.equal(barrido.clasificar({ grafico: true, control: true }), "graficos");
  assert.equal(barrido.clasificar({ tabla: true }), "tablas");
  assert.equal(barrido.clasificar({ control: true }), "controles");
  assert.equal(barrido.clasificar({}), "contenido");
  assert.equal(barrido.bloques([1, 2, 3], 8), null, "un grupo pequeño no se parte");
  const b = barrido.bloques(Array.from({ length: 52 }, (_, i) => i), 8);
  assert.ok(b.every(x => x.elementos.length <= 8), "ningún bloque supera el máximo");
  assert.equal(b.reduce((s, x) => s + x.elementos.length, 0), 52, "no se pierde ningún elemento");
  assert.deepEqual([b[0].desde, b[b.length - 1].hasta], [1, 52]);
  assert.equal(barrido.siguiente(2, 3), 0, "después de la última opción vuelve a la primera");
});

test("cada gráfico tiene tabla, resumen y sonido; el Optimizador conserva su propia exploración (§9.8)", () => {
  for (const m of ["dashboard", "regresion", "optimizador", "portafolios", "backtesting"]) {
    const js = leer("js", m + ".js"), n = (js.match(/EIA\.ui\.grafico\(/g) || []).length;
    for (const campo of ["tabla:", "resumen:", "sonido:"]) assert.equal((js.match(new RegExp(campo, "g")) || []).length >= n, true, m + " " + campo);
  }
  assert.match(leer("js", "optimizador.js"), /explorar: false/);
  assert.match(leer("clasificacion.html"), /id="escuchar-mapa"/, "el mapa de calor también suena");
  assert.ok(!/abrirOpciones/.test(leer("js", "a11y", "puntero.js")), "el diálogo de <select> vive en el núcleo (no se duplica)");
});

test("el botón «♪ Escuchar» de los gráficos está oculto, pero la tecla S y la voz lo siguen usando (decisión de Josué, 19-nov)", () => {
  const js = leer("js", "common.js");
  assert.match(js, /<button type="button" class="escuchar"[^>]*\shidden>/, "el botón se crea con el atributo hidden");
  assert.match(js, /e\.key === "s" \|\| e\.key === "S"\) \{[^}]*\$\("\.escuchar", destino\)/, "la tecla S lo sigue pulsando");
  assert.match(leer("js", "a11y", "voz.js"), /case "escuchar": \{\s*const b = \$\("\.escuchar"\)/, "el comando de voz lo sigue pulsando");
});
