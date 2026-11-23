// Cuenta y extras (Spec W13 G.4): Perfil con perfil de riesgo, Ayuda, Acerca de, buscador global, recorrido guiado y
// comandos de voz de las páginas nuevas. [T-113]
import test from "node:test";
import assert from "node:assert/strict";
import comun from "../../js/common.js";
import Perfil from "../../js/perfil.js";
import Ayuda from "../../js/ayuda.js";
import Acerca from "../../js/acerca.js";
import V from "../../js/a11y/voz.js";
import { dato, leer, leerJSON, aplanar } from "./_util.mjs";

const { EIA, NAVEGACION } = comun;
const es = aplanar(leerJSON("locales", "es-PE.json"));
const existe = k => k in es || (k + "#other") in es;

test("el bloque Cuenta lleva Perfil, Configuración, Ayuda y Acerca de, en ese orden", () => {
  const cuenta = NAVEGACION.find(b => b[0] === "cuenta")[1];
  assert.deepEqual(cuenta.map(p => p[0]), ["perfil.html", "configuracion.html", "ayuda.html", "acerca.html"]);
});

test("perfil de riesgo: cinco respuestas de 1 a 3 puntos y tres niveles, con los umbrales en sus bordes", () => {
  const todas = o => Object.fromEntries(Perfil.PREGUNTAS.map(p => [p, o]));
  assert.deepEqual(Perfil.nivelDe(todas("a")), { puntos: 5, max: 15, nivel: "Conservador" });
  assert.deepEqual(Perfil.nivelDe(todas("b")), { puntos: 10, max: 15, nivel: "Moderado" });
  assert.deepEqual(Perfil.nivelDe(todas("c")), { puntos: 15, max: 15, nivel: "Agresivo" });
  const con = (...r) => Perfil.nivelDe(Object.fromEntries(Perfil.PREGUNTAS.map((p, i) => [p, r[i]])));
  assert.equal(con("a", "a", "a", "b", "c").nivel, "Conservador"); // 8 puntos
  assert.equal(con("a", "a", "b", "b", "c").nivel, "Moderado");    // 9
  assert.equal(con("a", "b", "b", "c", "c").nivel, "Moderado");    // 11
  assert.equal(con("b", "b", "b", "c", "c").nivel, "Agresivo");    // 12
  assert.equal(Perfil.nivelDe({ p1: "a" }), null, "faltan respuestas");
  assert.equal(Perfil.nivelDe(Object.assign(todas("a"), { p3: "d" })), null, "opción inválida");
  assert.equal(Perfil.nivelDe(null), null);
});

test("los niveles del perfil de riesgo son los de Portafolios (archivo 08) y cada uno tiene su explicación", () => {
  const niveles = dato("08_portafolios_3_niveles_riesgo.json").niveles.map(n => n.nivel);
  assert.deepEqual(Perfil.UMBRALES.map(u => u[1]), niveles);
  for (const n of niveles) assert.ok(existe("perfil.explica_" + n.toLowerCase()), "falta perfil.explica_" + n.toLowerCase());
  for (const p of Perfil.PREGUNTAS) {
    assert.ok(existe("perfil." + p), "falta perfil." + p);
    for (const o of Perfil.OPCIONES) assert.ok(existe(`perfil.${p}_${o}`), `falta perfil.${p}_${o}`);
  }
});

test("alias: de uno a MAX_ALIAS caracteres (por punto de código) y sin contar los espacios de los lados", () => {
  assert.equal(Perfil.aliasValido(""), false);
  assert.equal(Perfil.aliasValido("   "), false);
  assert.equal(Perfil.aliasValido(null), false);
  assert.equal(Perfil.aliasValido("  Ana  "), true);
  assert.equal(Perfil.aliasValido("x".repeat(Perfil.MAX_ALIAS)), true);
  assert.equal(Perfil.aliasValido("x".repeat(Perfil.MAX_ALIAS + 1)), false);
  assert.equal(Perfil.aliasValido("😀".repeat(Perfil.MAX_ALIAS)), true, "un emoji cuenta como uno");
});

test("iniciales del avatar: hasta dos palabras, en mayúsculas y sin partir caracteres", () => {
  assert.equal(EIA.iniciales("Ana María"), "AM");
  assert.equal(EIA.iniciales("  josé  "), "J");
  assert.equal(EIA.iniciales("élodie de la cruz"), "ÉD");
  assert.equal(EIA.iniciales("😀 feliz"), "😀F");
  assert.equal(EIA.iniciales(""), "");
  assert.equal(EIA.iniciales(undefined), "");
});

test("normalizar: sin tildes, mayúsculas ni espacios de más, y en cualquier escritura (NFKC)", () => {
  assert.equal(EIA.normalizar("  Clasificación   Binaria "), "clasificacion binaria");
  assert.equal(EIA.normalizar("ＮＶＤＡ"), "nvda");
  assert.equal(EIA.normalizar("Über"), "uber");
  assert.equal(EIA.normalizar(null), "");
});

test("buscador: primero la coincidencia exacta, luego al inicio y luego contenida; empates en el orden original", () => {
  const f = [
    { id: "amd", claves: ["AMD", "Advanced Micro Devices"] },
    { id: "nvda", claves: ["NVDA", "NVIDIA Corp"] },
    { id: "comp", claves: ["Comparador", "Mercado"] },
    { id: "merc", claves: ["Mercado"] }
  ];
  assert.deepEqual(EIA.buscarEn(f, "nvda").map(x => x.id), ["nvda"]);
  assert.deepEqual(EIA.buscarEn(f, "  Mercado ").map(x => x.id), ["comp", "merc"], "las dos son exactas: orden original");
  assert.deepEqual(EIA.buscarEn(f, "merc").map(x => x.id), ["comp", "merc"]);
  assert.deepEqual(EIA.buscarEn(f, "micro").map(x => x.id), ["amd"], "contenida en una clave");
  assert.deepEqual(EIA.buscarEn(f, "a").map(x => x.id), ["amd", "nvda", "comp", "merc"], "al inicio (AMD) antes que contenida");
  assert.equal(EIA.buscarEn(f, "comparacion").length, 0);
  assert.deepEqual(EIA.buscarEn(f, ""), []);
  assert.equal(EIA.buscarEn(f, "a", 2).length, 2, "respeta el máximo");
});

test("recorrido guiado: cada paso tiene su título y su texto, y no se abre solo", () => {
  assert.ok(EIA.tour.PASOS.length >= 3);
  for (const [selector, k] of EIA.tour.PASOS) {
    assert.ok(selector.trim().length > 0);
    assert.ok(existe("shell." + k) && existe("shell." + k + "_t"), "falta el texto del paso " + k);
  }
  assert.equal(EIA.tour.activo, false);
  // Solo se ofrece en el Dashboard y solo mientras no se haya hecho ni descartado (eia_tour)
  const nucleo = leer("js", "common.js");
  assert.match(nucleo, /dataset\.page !== "dashboard" \|\| EIA\.estado\.get\("eia_tour"\)/);
});

test("ayuda: cada página de la barra lateral tiene su descripción, y existen atajos, glosario y preguntas", () => {
  for (const [, paginas] of NAVEGACION) for (const p of paginas) {
    const k = Ayuda.SUBTITULO[p[2]] || p[2] + ".sub";
    assert.ok(existe(k), "falta la descripción de " + p[0] + " (" + k + ")");
  }
  for (const [, d] of Ayuda.ATAJOS) assert.ok(existe("ayuda." + d), "falta ayuda." + d);
  for (const [term, d] of Ayuda.GLOSARIO) {
    if (term[0] !== "=") assert.ok(existe(term), "falta el término " + term);
    assert.ok(existe("ayuda." + d), "falta ayuda." + d);
  }
  for (const f of Ayuda.FAQ) assert.ok(existe(`ayuda.${f}_p`) && existe(`ayuda.${f}_r`), "falta la pregunta " + f);
  for (const k of Ayuda.VOZ) assert.ok(existe("voz." + k), "falta voz." + k);
});

test("filtro de la ayuda: sin tildes ni mayúsculas, y vacío muestra todo", () => {
  assert.equal(Ayuda.coincide("Volatilidad anualizada", "VOLATIL"), true);
  assert.equal(Ayuda.coincide("Clasificación", "clasificacion"), true);
  assert.equal(Ayuda.coincide("Beta", "   "), true);
  assert.equal(Ayuda.coincide("Beta", "sharpe"), false);
});

test("acerca de: las versiones declaradas son las que el sitio carga de verdad (ninguna escrita a mano por separado)", () => {
  const version = n => Acerca.TECNOLOGIAS.find(t => t[0] === n)[1];
  assert.ok(leer("activo.html").includes("echarts@" + version("Apache ECharts") + "/"), "ECharts");
  assert.ok(leer("js", "a11y", "camara.js").includes("tasks-vision@" + version("MediaPipe Tasks Vision")), "MediaPipe");
  assert.match(leer("pipeline", "requirements-base.txt"), new RegExp("^yfinance==" + version("yfinance").replace(/\./g, "\\.") + "$", "m"));
  for (const [n, , , uso] of Acerca.TECNOLOGIAS) {
    if (n[0] === "@") assert.ok(existe(n.slice(1)), "falta " + n.slice(1));
    assert.ok(existe("acerca." + uso), "falta acerca." + uso);
  }
  for (const [u, k] of Acerca.ENLACES) { assert.match(u, /^https:\/\//); assert.ok(existe("acerca." + k)); }
});

test("voz: las páginas nuevas se abren por su nombre y «buscar …» abre el buscador (ES y EN)", () => {
  const activos = dato("10_dashboard_mercado.json").map(a => ({ ticker: a.ticker, nombre: a.nombre }));
  const gram = tag => leerJSON("locales", tag + ".json").voz;
  const ES = gram("es-PE"), EN = gram("en-US");
  const di = (frase, G = ES) => V.interpretar(frase, G, activos);
  assert.deepEqual(di("ir al historial de órdenes"), { accion: "ir", modulo: "ordenes" });
  assert.deepEqual(di("abre el comparador"), { accion: "ir", modulo: "comparador" });
  assert.deepEqual(di("ir a mi perfil"), { accion: "ir", modulo: "perfil" });
  assert.deepEqual(di("ir a ayuda"), { accion: "ir", modulo: "ayuda" });
  assert.deepEqual(di("ayuda"), { accion: "ayuda" }, "«ayuda» sola sigue siendo la ayuda de voz");
  assert.deepEqual(di("ir a órdenes"), { accion: "ir", modulo: "trading" }, "«órdenes» sigue siendo Trading");
  assert.deepEqual(di("buscar Apple"), { accion: "buscar", texto: "apple" });
  assert.deepEqual(di("go to settings", EN), { accion: "ir", modulo: "configuracion" });
  assert.deepEqual(di("open order history", EN), { accion: "ir", modulo: "ordenes" });
  assert.deepEqual(di("search for regression", EN), { accion: "buscar", texto: "regression" });
  for (const m of ["activo", "comparador", "ordenes", "perfil", "configuracion", "ayuda", "acerca"]) assert.ok(V.MODULOS.includes(m), "voz sin el módulo " + m);
});

test("voz: gana el nombre de módulo más largo («注文履歴» es el historial aunque «注文» sea Trading)", () => {
  const activos = [];
  const JA = leerJSON("locales", "ja-JP.json").voz, ZH = leerJSON("locales", "zh-CN.json").voz;
  assert.deepEqual(V.interpretar("注文履歴を開く", JA, activos), { accion: "ir", modulo: "ordenes" });
  assert.deepEqual(V.interpretar("注文を開く", JA, activos), { accion: "ir", modulo: "trading" });
  assert.deepEqual(V.interpretar("打开交易历史", ZH, activos), { accion: "ir", modulo: "ordenes" });
});

test("voz: en cada idioma completo, ningún nombre de módulo se repite entre dos módulos", () => {
  const indice = leerJSON("locales", "index.json");
  const tags = (indice.idiomas || indice).map(x => x.tag || x).filter(t => typeof t === "string" && t !== "qu-PE");
  assert.ok(tags.length >= 12);
  for (const tag of tags) {
    const G = leerJSON("locales", tag + ".json").voz, visto = new Map();
    for (const m of V.MODULOS) for (const n of String(G["m_" + m] || "").split("|").map(V.normalizar).filter(Boolean)) {
      assert.ok(!visto.has(n) || visto.get(n) === m, `${tag}: «${n}» nombra a ${visto.get(n)} y a ${m}`);
      visto.set(n, m);
    }
  }
});
