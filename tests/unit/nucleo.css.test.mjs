// Hoja de estilos: contraste de los tokens en claro y oscuro. [T-05] [R-A11Y-02] [R-INT-02]
import test from "node:test";
import assert from "node:assert/strict";
import { leer, contraste } from "./_util.mjs";

const css = leer("css", "styles.css");
function tokens(patron) {
  const m = css.match(patron);
  assert.ok(m, "no se encontró el bloque " + patron);
  const t = {};
  for (const d of m[1].matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) t[d[1]] = d[2].toLowerCase();
  return t;
}
const claro = tokens(/:root\s*\{([^}]*)\}/);
const oscuro = tokens(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/);
const oscuroSistema = tokens(/:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}/);

// Texto sobre fondo: WCAG 2.2 AA pide 4,5:1
const TEXTO = [["--fg", "--bg"], ["--fg", "--panel"], ["--fg", "--hl"], ["--fg", "--aviso"], ["--mut", "--bg"], ["--mut", "--panel"], ["--mut", "--hl"],
  ["--ac", "--panel"], ["--ac", "--bg"], ["--ac", "--hl"], ["--up", "--panel"], ["--up", "--bg"], ["--up", "--hl"],
  ["--dn", "--panel"], ["--dn", "--bg"], ["--dn", "--hl"], ["--warn", "--panel"], ["--warn", "--aviso"], ["--on-ac", "--ac"],
  ["--up-t", "--up-1"], ["--up-t", "--up-2"], ["--up-t", "--up-3"], ["--dn-t", "--dn-1"], ["--dn-t", "--dn-2"], ["--dn-t", "--dn-3"],
  // Etiquetas dentro de barras de color (issue #21: barra apilada de Backtesting y composición de Portafolios)
  ...[1, 2, 3, 4, 5, 6].map(i => ["--serie-texto-" + i, "--serie-" + i])];
// Bordes de controles, foco y marcas de gráficos: WCAG 1.4.11 pide 3:1
const NO_TEXTO = [["--bd-ctl", "--panel"], ["--bd-ctl", "--bg"], ["--ac", "--panel"], ["--ac", "--bg"], ["--up", "--panel"], ["--dn", "--panel"],
  ...[1, 2, 3, 4, 5, 6].map(i => ["--serie-" + i, "--panel"])];

for (const [nombre, t] of [["claro", claro], ["oscuro", oscuro]]) {
  test(`tema ${nombre}: todo texto alcanza 4,5:1`, () => {
    for (const [a, b] of TEXTO) {
      assert.ok(t[a] && t[b], `falta el token ${a} o ${b}`);
      const r = contraste(t[a], t[b]);
      assert.ok(r >= 4.5, `${a} sobre ${b} = ${r.toFixed(2)}:1`);
    }
  });
  test(`tema ${nombre}: bordes de controles, foco y series de gráficos alcanzan 3:1`, () => {
    for (const [a, b] of NO_TEXTO) {
      assert.ok(t[a] && t[b], `falta el token ${a} o ${b}`);
      const r = contraste(t[a], t[b]);
      assert.ok(r >= 3, `${a} sobre ${b} = ${r.toFixed(2)}:1`);
    }
  });
}

test("los dos temas definen los mismos tokens", () => {
  assert.deepEqual(Object.keys(oscuro).sort(), Object.keys(claro).sort());
});

test("el oscuro por preferencia del sistema es idéntico al oscuro elegido", () => {
  assert.deepEqual(oscuroSistema, oscuro);
});

test("el texto sobre el color de acción usa --on-ac, no blanco fijo (la base daba 2,08:1 en oscuro)", () => {
  assert.ok(!/background:\s*var\(--ac\);\s*color:\s*#fff/i.test(css));
  assert.ok(/nav a\[aria-current="page"\]\s*\{[^}]*color:\s*var\(--on-ac\)/.test(css));
});

test("el foco siempre es visible: nadie quita el contorno de :focus-visible", () => {
  assert.match(css, /:focus-visible\s*\{\s*outline:\s*3px solid var\(--ac\)/);
  assert.ok(!/:focus-visible\s*\{[^}]*outline:\s*(none|0)/.test(css));
});
