// Estructura del sitio: 9 páginas, un solo CSS y un solo núcleo, sin módulos ES, y data/ intacto.
// [T-07] [R-INT-01] [R-INT-10] [R-DAT-02]
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import comun from "../../js/common.js";
import { leer, listar, ruta, PAGINAS } from "./_util.mjs";

const contar = (txt, patron) => (txt.match(patron) || []).length;

test("las 9 páginas existen, en el orden de la barra de navegación", () => {
  assert.deepEqual(comun.PAGES.map(p => p[0]), PAGINAS);
  for (const p of PAGINAS) assert.ok(leer(p).length > 0, p);
});

for (const [archivo, , id] of comun.PAGES) {
  test(`${archivo}: un h1, un main, un solo styles.css y un solo common.js`, () => {
    const h = leer(archivo);
    assert.match(h, /<html lang="es-PE">/);
    assert.match(h, /<meta name="viewport" content="width=device-width,initial-scale=1">/);
    assert.equal(contar(h, /<h1[\s>]/g), 1, "h1");
    assert.equal(contar(h, /<main[\s>]/g), 1, "main");
    assert.equal(contar(h, /<link rel="stylesheet"/g), 1, "hojas de estilo");
    assert.equal(contar(h, /href="css\/styles\.css"/g), 1, "styles.css");
    assert.equal(contar(h, /src="js\/common\.js"/g), 1, "common.js");
    assert.equal(contar(h, /<style[\s>]/g), 0, "bloques <style>");
    assert.ok(new RegExp(`<body data-page="${id}"`).test(h), "data-page");
    assert.ok(!/type="module"/.test(h), "sin módulos ES (D-21)");
  });
}

test("los scripts del sitio son clásicos: sin import ni export estáticos (D-21, H-05)", () => {
  for (const a of listar("js", p => p.endsWith(".js"))) {
    assert.ok(!/^\s*(import\s[^(]|export\s)/m.test(leer(a)), a);
  }
});

test("ECharts es la 5.5.1 de jsDelivr, la que fija la guía", () => {
  for (const p of PAGINAS) for (const m of leer(p).matchAll(/<script src="(https?:[^"]+)"/g)) {
    assert.equal(m[1], "https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js", p);
  }
});

test("data/ está byte a byte como lo entregó el profesor (SHA-256 del Anexo B.3)", () => {
  const plan = leer("docs", "contexto", "PLAN_MAESTRO.md");
  const esperado = {};
  for (const m of plan.matchAll(/^([0-9a-f]{64}) {2}(\d\d_\S+\.json)$/gm)) esperado[m[2]] = m[1];
  assert.equal(Object.keys(esperado).length, 13);
  const archivos = readdirSync(ruta("data")).sort();
  assert.deepEqual(archivos, Object.keys(esperado).sort());
  for (const a of archivos) {
    assert.equal(createHash("sha256").update(readFileSync(ruta("data", a))).digest("hex"), esperado[a], a);
  }
});

test("configuracion.html (Spec W13 G.4): misma estructura que las demás páginas y se abre desde la cabecera", () => {
  const h = leer("configuracion.html");
  assert.match(h, /<html lang="es-PE">/);
  assert.equal(contar(h, /<h1[\s>]/g), 1, "h1");
  assert.equal(contar(h, /src="js\/common\.js"/g), 1, "common.js");
  assert.match(h, /<body data-page="configuracion"/);
  assert.match(leer("js", "common.js"), /href="configuracion\.html"/, "botón ⚙ Configuración en la cabecera");
});

test("cada página carga la herramienta de calidad i18n antes del núcleo (pseudolocalización y auditoría)", () => {
  for (const p of [...PAGINAS, "configuracion.html"]) {
    const h = leer(p), i = h.indexOf('src="js/lib/i18n-calidad.js"'), j = h.indexOf('src="js/common.js"');
    assert.ok(i > 0 && i < j, p);
  }
});

test("hreflang: cada página enlaza su versión en cada idioma del manifiesto y x-default (Lab 13, auditoría de 14 sitios)", () => {
  const tags = JSON.parse(leer("locales", "index.json")).idiomas.map(i => i.tag);
  for (const p of [...PAGINAS, "configuracion.html"]) {
    const h = leer(p), enlazados = [...h.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)];
    assert.deepEqual(enlazados.map(m => m[1]).sort(), [...tags, "x-default"].sort(), p);
    for (const [, tag, href] of enlazados) assert.equal(href, tag === "x-default" ? p : p + "?lang=" + tag, p + " · " + tag);
  }
});
