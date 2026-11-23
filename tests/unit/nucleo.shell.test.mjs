// Barra lateral por bloques (Spec W13 G.4), iconos y estados de la interfaz. [T-110]
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import comun from "../../js/common.js";
import { leer, ruta, PAGINAS_SITIO } from "./_util.mjs";

const { NAVEGACION, PAGINAS_NAV, PAGES } = comun;
const sprite = leer("assets", "iconos.svg");
const es = JSON.parse(leer("locales", "es-PE.json"));

test("la barra lateral agrupa las páginas en los bloques de la Spec G.4, en ese orden", () => {
  assert.deepEqual(NAVEGACION.map(b => b[0]), ["mercado", "vigilancia", "modelos", "cartera", "operacion", "cuenta"]);
  for (const [bloque] of NAVEGACION) assert.ok(es.nav["bloque_" + bloque], "falta nav.bloque_" + bloque);
});

test("la barra lateral enlaza todas las páginas del sitio, cada una una sola vez y existente", () => {
  const archivos = PAGINAS_NAV.map(p => p[0]);
  assert.equal(new Set(archivos).size, archivos.length, "páginas repetidas");
  assert.deepEqual([...archivos].sort(), [...PAGINAS_SITIO].sort());
  for (const a of archivos) assert.ok(existsSync(ruta(a)), a);
  // Los 9 módulos de la base siguen marcados igual: los 5 nuevos con ★
  for (const p of PAGES) {
    const n = PAGINAS_NAV.find(x => x[0] === p[0]);
    assert.ok(n, p[0]);
    assert.equal(!!n[4], !!p[3], "★ de " + p[0]);
  }
});

test("cada página de la barra lateral tiene su texto y un icono del sprite", () => {
  for (const [archivo, clave, , icono] of PAGINAS_NAV) {
    const [sec, k] = clave.split(".");
    assert.ok(es[sec] && es[sec][k], archivo + ": falta " + clave);
    assert.ok(sprite.includes(`id="i-${icono}"`), archivo + ": falta el icono i-" + icono);
  }
});

test("los iconos del shell y de los estados existen en el sprite", () => {
  const js = leer("js", "common.js");
  const usados = new Set([...js.matchAll(/I\("([a-z-]+)"/g), ...js.matchAll(/icono\("([a-z-]+)"/g), ...js.matchAll(/icono: "([a-z-]+)"/g)].map(m => m[1]));
  for (const id of usados) assert.ok(sprite.includes(`id="i-${id}"`), "falta i-" + id);
});

test("los iconos son decorativos y toman el color del texto", () => {
  for (const m of sprite.matchAll(/<symbol id="(i-[a-z-]+)"([^>]*)>/g)) assert.match(m[2], /stroke="currentColor"/, m[1]);
  assert.match(leer("js", "common.js"), /<svg class="ico\$\{[^}]*\}" aria-hidden="true" focusable="false">/);
});

test("el cajón se abre con ☰ (#btn-modulos), atrapa el foco y se cierra con Esc (código del núcleo)", () => {
  const js = leer("js", "common.js");
  assert.match(js, /id="btn-modulos"[^>]*aria-expanded="\$\{menuAbierto\}"[^>]*aria-controls="lateral"/);
  assert.match(js, /e\.key === "Escape" && menuAbierto\) alternarMenu\(false, true\)/);
  assert.match(js, /Foco atrapado en el cajón/);
});
