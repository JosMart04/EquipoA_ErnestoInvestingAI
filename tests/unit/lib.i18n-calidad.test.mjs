// Calidad de la i18n (Lab 13, Spec W13 G.5.5): pseudolocalización igual a la del kit del profesor y CSV compatible con su notebook.
import test from "node:test";
import assert from "node:assert/strict";
import calidad from "../../js/lib/i18n-calidad.js";

test("pseudolocalización: el mismo resultado que el kit del profesor (tildes, ~40 % más y corchetes)", () => {
  assert.equal(calidad.pseudolocalizar("Comprar"), "[Cómprár ···]");
  const s = calidad.pseudolocalizar("Orden simulada");
  assert.ok(s.startsWith("[") && s.endsWith("]"));
  assert.ok(s.length >= Math.ceil("Orden simulada".length * 1.4), "alarga al menos un 40 %");
});

test("pseudolocalización: conserva las {variables} y los plurales; no toca metadatos ni la gramática de voz", () => {
  assert.match(calidad.pseudolocalizar("Votos: {sube} ▲ y {baja} ▼"), /\{sube\}.*\{baja\}/);
  const d = calidad.pseudoDiccionario({ _meta: { estado: "borrador" }, a: { titulo: "Alertas" }, b: { one: "{n} alerta", other: "{n} alertas" }, voz: { g_ir: "ir a|abrir", titulo: "Voz" } });
  assert.deepEqual(d._meta, { estado: "borrador" });
  assert.match(d.a.titulo, /^\[Álértás/);
  assert.deepEqual(Object.keys(d.b), ["one", "other"]);
  assert.match(d.b.one, /\{n\}/);
  assert.equal(d.voz.g_ir, "ir a|abrir", "la gramática de voz no se muestra: no se pseudolocaliza");
  assert.notEqual(d.voz.titulo, "Voz");
});

test("CSV: las 12 primeras columnas son las del ejercicio 13.2 (las lee el notebook del profesor) y lleva BOM", () => {
  assert.deepEqual(calidad.COLUMNAS.slice(0, 12), ["hora", "locale", "version", "pseudo", "truncados", "desbordes", "fechas_fijas", "dinero_fijo", "lang_ok", "dir_ok", "expansion", "caracteres"]);
  const csv = calidad.aCSV([{ hora: "10:00:00", locale: "ar-EG", version: "B", pseudo: "no", truncados: 0, pagina: "a,b" }]);
  assert.ok(csv.startsWith("﻿hora,locale,version"));
  assert.match(csv, /"a,b"/, "las comas se escapan");
});

test("dirección por idioma: árabe y hebreo de derecha a izquierda", () => {
  assert.equal(calidad.direccion("ar-EG"), "rtl");
  assert.equal(calidad.direccion("he-IL"), "rtl");
  assert.equal(calidad.direccion("ja-JP"), "ltr");
  assert.equal(calidad.direccion("qu-PE"), "ltr");
});
