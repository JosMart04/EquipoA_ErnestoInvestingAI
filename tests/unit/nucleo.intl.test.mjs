// Núcleo de i18n (Lab 13 · Spec W13 G.5): respaldo a es-PE, lang/dir, formatos con Intl, zona horaria y cierre del
// mercado, orden con Collator, textos libres del JSON, pseudolocalización y la fachada del kit del curso. [T-101]
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import comun from "../../js/common.js";
import { manifiesto, diccionario } from "./_util.mjs";

const { EIA } = comun;
EIA.usarManifiesto(manifiesto());
const ES = diccionario("es-PE"), EN = diccionario("en-US");
const usar = (tag, dic, respaldo) => EIA.usarDiccionario(dic, tag, respaldo);

test("respaldo como el kit del curso: la clave que falta en un idioma sale de es-PE; si tampoco está, ⟦clave⟧", () => {
  usar("en-US", { comun: { saltar: "Skip" } }, ES);
  assert.equal(EIA.t("comun.saltar"), "Skip");
  assert.equal(EIA.t("comun.cerrar"), ES.comun.cerrar, "cae a es-PE");
  assert.equal(EIA.t("no.existe"), "⟦no.existe⟧", "nunca silenciosa");
});

test("plurales: la categoría sale de Intl.PluralRules y {n} se escribe con los dígitos del idioma", () => {
  usar("es-PE", ES);
  assert.equal(EIA.t("config.vista_alertas", { n: 1 }), "1 alerta activa");
  assert.equal(EIA.t("config.vista_alertas", { n: 1234 }), "1,234 alertas activas", "es-PE agrupa con coma (Intl)");
  usar("ar-EG", { p: { zero: "صفر {n}", one: "واحد", two: "اثنان", few: "{n} قليلة", many: "{n} كثيرة", other: "{n} أخرى" } });
  assert.equal(EIA.t("p", { n: 0 }), "صفر ٠");
  assert.equal(EIA.t("p", { n: 3 }), "٣ قليلة", "árabe: «few» y dígitos ٣");
  assert.equal(EIA.t("p", { n: 11 }), "١١ كثيرة", "árabe: «many»");
});

test("normalización BCP 47: etiqueta exacta, idioma base y pseudoidiomas; sin autodetección", () => {
  assert.equal(EIA.normalizarIdioma("EN-us"), "en-US");
  assert.equal(EIA.normalizarIdioma("es"), "es-PE");
  assert.equal(EIA.normalizarIdioma("qps-ploc"), "qps-ploc");
  assert.equal(EIA.normalizarIdioma("xx-YY"), null);
  assert.equal(EIA.normalizarIdioma("no es una etiqueta!!"), null);
});

test("dirección: rtl en árabe y hebreo (y en el pseudoidioma espejado), ltr en el resto", () => {
  assert.equal(EIA.dir("es-PE"), "ltr");
  assert.equal(EIA.dir("ar-EG"), "rtl");
  assert.equal(EIA.dir("he-IL"), "rtl");
  assert.equal(EIA.dir("qps-plocm"), "rtl");
  assert.equal(EIA.dir("ja-JP"), "ltr");
});

test("pseudolocalización: formatea como es-PE y la marca el núcleo", () => {
  usar("qps-ploc", ES);
  assert.ok(EIA.esPseudo());
  assert.equal(EIA.localeFormato(), "es-PE");
  usar("es-PE", ES);
  assert.ok(!EIA.esPseudo());
});

test("cierre de la NYSE (16:00 en Nueva York) con y sin horario de verano, mostrado en la zona elegida", () => {
  assert.equal(EIA.instanteCierre("2026-11-18").toISOString(), "2026-11-18T21:00:00.000Z", "invierno: UTC−5");
  assert.equal(EIA.instanteCierre("2026-03-09").toISOString(), "2026-03-09T20:00:00.000Z", "verano (desde el 8-mar): UTC−4");
  assert.equal(EIA.instanteCierre("2026-03-06").toISOString(), "2026-03-06T21:00:00.000Z");
  usar("es-PE", ES);
  const c = EIA.instanteCierre("2026-11-18");
  assert.match(EIA.fmt.hora(c, "America/Lima"), /^4:00\s?p\.?\s?m\.?$/i, "Lima: 16:00 (UTC−5)");
  assert.match(EIA.fmt.hora(c, "Asia/Tokyo"), /^6:00\s?a\.?\s?m\.?$/i, "Tokio: 06:00 del día siguiente");
  assert.equal(EIA.fmt.hora(c, EIA.ZONA_MERCADO).replace(/\s/g, " "), EIA.fmt.hora(c, "America/New_York").replace(/\s/g, " "));
});

test("orden alfabético con Intl.Collator: tildes y eñe en su lugar (es-PE)", () => {
  usar("es-PE", ES);
  assert.deepEqual(EIA.ordenar(["Zinc", "Ñandú", "Árbol", "Nube", "abeja"]), ["abeja", "Árbol", "Nube", "Ñandú", "Zinc"]);
  assert.deepEqual(EIA.ordenarFilas([{ n: "b2" }, { n: "b10" }, { n: "a" }], { clave: "n" }, "asc").map(f => f.n), ["a", "b2", "b10"], "números en orden natural");
});

test("textos libres del JSON: traducidos con las cifras en formato local, o en español con lang=\"es\"", () => {
  usar("en-US", EN, ES);
  assert.equal(EIA.patronTextoDatos("17/18 clasificadores = SUBE; proyeccion mediana 30 sesiones +5.35 %"), "{#}/{#} clasificadores = SUBE; proyeccion mediana {#} sesiones {#} %");
  assert.equal(EIA.textoDatos("17/18 clasificadores = SUBE; proyeccion mediana 30 sesiones +5.35 %"), "17/18 classifiers = UP; median 30-session projection +5.35%");
  assert.equal(EIA.textoDatos("NSGA-II N2-05 (simulado)"), "NSGA-II N2-05 (simulated)", "el cero de N2-05 se conserva");
  assert.equal(EIA.textoDatos("Texto que nadie tradujo"), '<span lang="es">Texto que nadie tradujo</span>');
  usar("ar-EG", { datos: { textos: { "tope {#} % por activo": "حد {#}٪ لكل أصل" } } }, ES);
  assert.equal(EIA.textoDatos("tope 25 % por activo"), "حد ٢٥٪ لكل أصل", "dígitos árabes");
});

test("textos libres de los JSON: en-US traduce todos los que muestra el sitio (profesor y real)", () => {
  usar("en-US", EN, ES);
  const textos = new Set(), leerJ = f => JSON.parse(readFileSync(f, "utf8"));
  for (const m of ["data", "data_real"]) {
    const c8 = leerJ(m + "/08_portafolios_3_niveles_riesgo.json");
    for (const n of c8.niveles) { for (const k of ["origen", "descripcion", "restricciones"]) textos.add(n[k]); for (const a of n.detalle_activos) textos.add(a.razon); }
    textos.add(leerJ(m + "/09_backtesting_portafolios.json").metodo);
  }
  for (const s of textos) assert.ok(!EIA.textoDatos(s).startsWith('<span lang="es">'), "sin traducción: " + s);
});

test("fachada del investing_i18n_kit: misma API que I18N del curso, sobre EIA", () => {
  usar("en-US", EN, ES);
  const I = EIA.i18n;
  for (const f of ["t", "num", "money", "pct", "dt", "rel", "names", "sort", "dir", "pseudoloc", "state", "set"]) assert.equal(typeof I[f], "function", f);
  assert.equal(I.money(125430.5, "USD"), "$125,430.50", "la divisa no se convierte");
  assert.equal(I.pct(0.0293), "+2.93%");
  assert.equal(I.names("es-PE"), "Español (Perú)");
  assert.equal(I.pseudoloc("Comprar"), "[Cómprár ···]");
  assert.deepEqual(I.sort(["b", "a"], x => x), ["a", "b"]);
  assert.equal(I.state().locale, "en-US");
  assert.ok(Array.isArray(I.locales) && I.locales.includes("es-PE"));
});

test("colores de alza y baja: automático según el idioma (rojo sube en ja, zh y ko)", () => {
  usar("ja-JP", {});
  assert.equal(EIA.colores(), "rojo-sube");
  usar("es-PE", ES);
  assert.equal(EIA.colores(), "verde-sube");
});
