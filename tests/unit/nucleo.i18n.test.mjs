// Diccionarios i18n de los 13 idiomas (Lab 13 · Spec W13 G.5): mismas claves y parámetros que es-PE, plurales de cada
// idioma según CLDR, claves usadas, sin cifras de datos y solo dos clases. [T-04] [T-101] [R-I18N-01] [R-DAT-03] [R-CLA-06]
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { leer, listar, aplanar, ruta, PAGINAS_SITIO, manifiesto, diccionario, categoriasPlural } from "./_util.mjs";

const M = manifiesto();
const IDIOMAS = M.idiomas.map(i => i.tag);
const ES = diccionario("es-PE"), EN = diccionario("en-US");
const es = aplanar(ES);
const parametros = s => (String(s).match(/\{\w+\}/g) || []).sort().join(",");
/** Claves sin la categoría de plural («a.b#few» → «a.b») y sin los textos opcionales de datos (datos.textos.*). */
const base = dic => new Set(Object.keys(aplanar(dic)).filter(k => !k.startsWith("datos.textos.")).map(k => k.split("#")[0]));
const BASE_ES = base(ES);

test("el manifiesto declara idiomas con archivo, etiqueta BCP 47 canónica, dirección y estado", () => {
  assert.equal(M.fuente, "es-PE");
  assert.ok(IDIOMAS.includes("es-PE") && IDIOMAS.includes("en-US"));
  for (const i of M.idiomas) {
    assert.ok(existsSync(ruta("locales", i.tag + ".json")), "falta locales/" + i.tag + ".json");
    assert.equal(Intl.getCanonicalLocales(i.tag)[0], i.tag, "etiqueta no canónica: " + i.tag);
    assert.ok(["ltr", "rtl"].includes(i.dir), i.tag + ": dir");
    assert.ok(["fuente", "completo", "borrador"].includes(i.estado), i.tag + ": estado");
    assert.ok(i.endonimo && i.endonimo.trim(), i.tag + ": endónimo");
    const info = new Intl.Locale(i.tag);
    const ti = typeof info.getTextInfo === "function" ? info.getTextInfo() : info.textInfo;
    if (ti && ti.direction) assert.equal(i.dir, ti.direction, i.tag + ": dir distinto del de Intl");
    if (i.estado === "borrador") assert.ok(i.etiqueta_borrador, i.tag + ": la etiqueta «borrador» en su idioma");
  }
  assert.equal(new Set(IDIOMAS).size, IDIOMAS.length, "idiomas repetidos");
});

for (const tag of IDIOMAS) {
  const info = M.idiomas.find(i => i.tag === tag), D = diccionario(tag), d = aplanar(D);
  test(`${tag}: mismas claves que es-PE${info.parcial ? " (parcial: sin claves sobrantes)" : ""}`, () => {
    const B = base(D);
    const sobran = [...B].filter(k => !BASE_ES.has(k) && !k.startsWith("_meta"));
    assert.deepEqual(sobran, [], "claves que no existen en es-PE");
    if (!info.parcial) assert.deepEqual([...BASE_ES].filter(k => !B.has(k)), [], "faltan claves");
  });
  test(`${tag}: los mismos parámetros {nombre} que es-PE`, () => {
    for (const [k, v] of Object.entries(d)) {
      if (k.startsWith("_meta") || k.startsWith("datos.textos.")) continue;
      const kb = k.split("#")[0], ref = es[kb] !== undefined ? es[kb] : es[kb + "#other"];
      if (ref === undefined) continue;
      // En un plural, «one», «two» o «zero» pueden decir el número con palabras («un activo»): {n} es opcional
      const sinN = x => (k.includes("#") ? parametros(x).split(",").filter(q => q && q !== "{n}").join(",") : parametros(x));
      assert.equal(sinN(v), sinN(ref), `${tag} · ${k}: parámetros distintos`);
    }
  });
  test(`${tag}: cada plural tiene las categorías CLDR del idioma (${categoriasPlural(tag).join(", ")})`, () => {
    const req = categoriasPlural(tag);
    const recorrer = (o, ruta) => {
      for (const [k, v] of Object.entries(o)) {
        if (!v || typeof v !== "object") continue;
        if (typeof v.other === "string") { for (const c of req) assert.ok(typeof v[c] === "string", `${tag} · ${ruta}${k}: falta «${c}»`); }
        else recorrer(v, ruta + k + ".");
      }
    };
    recorrer(D, "");
  });
  test(`${tag}: ningún texto está vacío`, () => {
    for (const [k, v] of Object.entries(d)) if (!k.startsWith("_meta")) assert.ok(typeof v === "string" && v.trim().length > 0, `${tag} · vacío: ${k}`);
  });
}

test("toda clave usada en el HTML y el JS existe en es-PE", () => {
  const raices = Object.keys(ES);
  const existe = k => k in es || (k + "#other") in es;
  const archivos = [...PAGINAS_SITIO, ...listar("js", p => p.endsWith(".js"))];
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
  for (const k of ["estado_fuente", "estado_completo", "estado_borrador", "pseudo_ltr", "pseudo_rtl", "direccion_ltr", "direccion_rtl"]) assert.ok(("config." + k) in es, "config." + k);
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
  const permitidos = [/IHC 2026-II|HCI 2026-II/g, /CC BY 4\.0/g, /1\/N/g, /\bp10\b|\bp90\b|p10–p90|p10-p90/g, /CVaR 95/g, /\bG1[017]?\b|\bG2\b/g, /\bF1\b/g,
    /WCAG 2\.2/g, /390 px/g, /Alt\+Shift\+\w/g, /\(1 \+ [^)]+\)/g]; // la fórmula de la verificación de P04
  // Nombres que vienen de la guía o de los datos (el título de Regresión es el nombre del módulo en la guía)
  const exentas = k => k.startsWith("datos.") || k.startsWith("_meta") || k === "nav.regresion" || k === "regresion.titulo" || /\.titulo_pagina$/.test(k);
  const malos = [];
  for (const tag of IDIOMAS) for (const [k, v] of Object.entries(aplanar(diccionario(tag)))) {
    if (exentas(k)) continue;
    let s = v.replace(/\{\w+\}/g, "");
    for (const p of permitidos) s = s.replace(p, "");
    if (/\p{Nd}/u.test(s)) malos.push(tag + " · " + k + ": " + v); // cualquier dígito: también ٠١٢ o १२३
  }
  assert.deepEqual(malos, []);
});

test("solo dos clases: SUBE y BAJA; ninguna tercera salida en i18n, HTML ni JS (R-CLA-06)", () => {
  for (const tag of IDIOMAS) assert.deepEqual(Object.keys(diccionario(tag).datos.senal).sort(), ["BAJA", "SUBE"], tag);
  // Se buscan las formas en mayúsculas, que son las que usaría una etiqueta de clase
  // («mantener» en minúsculas es un verbo corriente del español y no se prohíbe).
  const prohibido = /\b(NEUTRO|NEUTRAL|MANTENER|HOLD)\b/;
  for (const a of [...PAGINAS_SITIO, ...listar("js", p => p.endsWith(".js")), ...listar("locales")]) {
    assert.ok(!prohibido.test(leer(a)), "tercera clase en " + a);
  }
  // Y ningún idioma traduce la señal como «mantener / conservar» (hold)
  const mantener = { "ar-EG": /احتفاظ/, "he-IL": /החזק/, "ja-JP": /保有|ホールド/, "zh-CN": /持有/, "ko-KR": /보유|유지/, "hi-IN": /होल्ड/, "ru-RU": /Держать/,
    "pt-BR": /\bManter\b/, "fr-FR": /\bConserver\b/, "de-DE": /\bHalten\b/, "qu-PE": /Waqaychay/ };
  for (const tag of IDIOMAS) {
    const s = diccionario(tag).datos.senal, re = mantener[tag];
    if (re) assert.ok(!re.test(s.SUBE) && !re.test(s.BAJA), tag + ": la señal no es «mantener»");
  }
});
