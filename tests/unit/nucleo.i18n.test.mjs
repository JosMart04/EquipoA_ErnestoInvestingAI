// Diccionarios i18n: paridad ES/EN, claves usadas, sin cifras de datos y solo dos clases. [T-04] [R-I18N-01] [R-DAT-03] [R-CLA-06]
import test from "node:test";
import assert from "node:assert/strict";
import { leer, leerJSON, listar, aplanar, PAGINAS } from "./_util.mjs";

const ES = leerJSON("i18n", "es-PE.json"), EN = leerJSON("i18n", "en-US.json");
const es = aplanar(ES), en = aplanar(EN);
const parametros = s => (String(s).match(/\{\w+\}/g) || []).sort().join(",");

test("es-PE y en-US tienen exactamente las mismas claves", () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
});

test("cada texto usa los mismos parámetros {nombre} en los dos idiomas", () => {
  for (const k of Object.keys(es)) assert.equal(parametros(en[k]), parametros(es[k]), "parámetros distintos en " + k);
});

test("ningún texto está vacío", () => {
  for (const [k, v] of Object.entries({ ...es, ...en })) assert.ok(typeof v === "string" && v.trim().length > 0, "vacío: " + k);
});

test("toda clave usada en el HTML y el JS existe en los diccionarios", () => {
  const raices = Object.keys(ES);
  const existe = k => k in es || (k + "#other") in es;
  const archivos = [...PAGINAS, ...listar("js", p => p.endsWith(".js"))];
  const faltan = [];
  for (const a of archivos) {
    const txt = leer(a);
    // Literales con forma de clave cuya raíz es una sección del diccionario
    for (const m of txt.matchAll(/["'`]([a-z_0-9]+(?:\.[A-Za-z_0-9]+)+)["'`]/g)) {
      if (/\.(html|js|json)$/.test(m[1])) continue; // nombres de archivo, no claves
      if (m[1].endsWith("_")) continue;             // prefijo que se completa en tiempo de ejecución ("a11y.mod_" + modalidad)
      if (raices.includes(m[1].split(".")[0]) && !existe(m[1])) faltan.push(a + ": " + m[1]);
    }
    if (!a.endsWith(".html")) continue; // los atributos data-i18n solo se revisan en las páginas
    for (const m of txt.matchAll(/data-i18n="([^"]+)"/g)) if (!existe(m[1])) faltan.push(a + ": " + m[1]);
    for (const m of txt.matchAll(/data-i18n-attr="([^"]+)"/g)) {
      for (const par of m[1].split(",")) { const k = (par.split("=")[1] || "").trim(); if (!existe(k)) faltan.push(a + ": " + k); }
    }
  }
  assert.deepEqual(faltan, []);
});

test("las claves que el núcleo compone en tiempo de ejecución existen", () => {
  for (const k of ["que_hace", "que_tan_bien", "por_que", "controlas", "ignorar", "titulo"]) assert.ok(("ficha." + k) in es, "ficha." + k);
  for (const modo of ["profesor", "real"]) for (const k of ["global", "generico"]) assert.ok(("aviso." + modo + "." + k) in es, "aviso." + modo + "." + k);
  for (const id of ["clasificacion", "regresion", "optimizador", "portafolios", "backtesting"]) assert.ok(("aviso.profesor." + id) in es, "aviso.profesor." + id);
  for (const id of ["dashboard", "watchlist", "trading", "leaderboard", "clasificacion", "regresion", "optimizador", "portafolios", "backtesting"]) assert.ok(("nav." + id) in es, "nav." + id);
});

test("avisos del Modo profesor: texto literal de la guía (R-CLA-07, R-REG-08, R-OPT-06)", () => {
  assert.equal(ES.aviso.profesor.clasificacion, "Datos sintéticos · clasificación simulada");
  assert.equal(ES.aviso.profesor.regresion, "Datos sintéticos · pronóstico simulado, no es asesoría de inversión");
  assert.equal(ES.aviso.profesor.optimizador, "NSGA-II y NSGA-III simulados: no se ejecutó ningún algoritmo evolutivo");
  assert.equal(ES.aviso.profesor.portafolios, "Datos sintéticos · resultados simulados");
  assert.match(ES.aviso.profesor.backtesting, /historia sintética/);
  assert.match(ES.aviso.profesor.backtesting, /no garantiza/);
});

test("los diccionarios no contienen cifras de datos (R-DAT-03): solo nombres propios y términos de método", () => {
  // Términos que llevan dígitos y NO son cifras de datos
  const permitidos = [/IHC 2026-II|HCI 2026-II/g, /CC BY 4\.0/g, /1\/N/g, /\bp10\b|\bp90\b/g, /CVaR 95/g, /\bG1[017]?\b|\bG2\b/g, /\bF1\b/g,
    /WCAG 2\.2/g, /390 px/g, /Alt\+Shift\+\w/g,
    /\(1 \+ (retorno|return)\)/g]; // la fórmula de la verificación de P04
  // Nombres que vienen de la guía o de los datos (el título de Regresión es el nombre del módulo en la guía)
  const exentas = k => k.startsWith("datos.") || k === "nav.regresion" || k === "regresion.titulo" || /\.titulo_pagina$/.test(k);
  const malos = [];
  for (const dic of [es, en]) for (const [k, v] of Object.entries(dic)) {
    if (exentas(k)) continue;
    let s = v.replace(/\{\w+\}/g, "");
    for (const p of permitidos) s = s.replace(p, "");
    if (/\d/.test(s)) malos.push(k + ": " + v);
  }
  assert.deepEqual(malos, []);
});

test("solo dos clases: SUBE y BAJA; ninguna tercera salida en i18n, HTML ni JS (R-CLA-06)", () => {
  assert.deepEqual(Object.keys(ES.datos.senal).sort(), ["BAJA", "SUBE"]);
  assert.deepEqual(Object.keys(EN.datos.senal).sort(), ["BAJA", "SUBE"]);
  // Se buscan las formas en mayúsculas, que son las que usaría una etiqueta de clase
  // («mantener» en minúsculas es un verbo corriente del español y no se prohíbe).
  const prohibido = /\b(NEUTRO|NEUTRAL|MANTENER|HOLD)\b/;
  for (const a of [...PAGINAS, ...listar("js", p => p.endsWith(".js")), ...listar("i18n")]) {
    assert.ok(!prohibido.test(leer(a)), "tercera clase en " + a);
  }
});
