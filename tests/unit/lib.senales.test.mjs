// js/lib/senales.js: matemática de las modalidades de cámara (sin cámara ni MediaPipe). [T-16] [D-07 c, d]
import test from "node:test";
import assert from "node:assert/strict";
import S from "../../js/lib/senales.js";
import { leer, leerJSON, listar } from "./_util.mjs";

const cerca = (a, b, tol, msj) => assert.ok(Math.abs(a - b) <= tol, `${msj || ""} ${a} vs ${b} (tol ${tol})`);

test("filtro One Euro: quita el temblor en reposo y sigue los movimientos rápidos", () => {
  const f = S.filtroOneEuro({ minCutoff: 1, beta: 0.007 });
  let t = 0; const salida = [];
  for (let i = 0; i < 120; i++) { t += 33; salida.push(f.filtrar(500 + (i % 2 ? 6 : -6), t)); } // temblor de ±6 px a 30 fps
  const cola = salida.slice(60), amplitud = Math.max(...cola) - Math.min(...cola);
  assert.ok(amplitud < 4, "el temblor de 12 px queda por debajo de 4 px: " + amplitud.toFixed(2));
  let y = 0; for (let i = 0; i < 30; i++) { t += 33; y = f.filtrar(500 + 40 * (i + 1), t); }   // barrido rápido de 1 200 px
  assert.ok(y > 1500, "sigue el movimiento rápido sin quedarse atrás: " + y.toFixed(0));
  f.reiniciar(); assert.equal(f.filtrar(10, 5000), 10);
});

test("calibración: el ajuste afín recupera una transformación conocida con 5 puntos", () => {
  const real = (u, v) => ({ x: 40 * u - 3 * v + 640, y: 2 * u + 55 * v + 360 });
  const puntos = [[0, 0], [-15, -10], [15, -10], [-15, 10], [15, 10]].map(([u, v]) => ({ u, v, ...real(u, v) }));
  const a = S.ajusteAfin(puntos);
  for (const [u, v] of [[7, -4], [-12, 9], [0, 3]]) { const r = a.aplicar(u, v), e = real(u, v); cerca(r.x, e.x, 1e-6, "x"); cerca(r.y, e.y, 1e-6, "y"); }
  assert.equal(S.ajusteAfin([{ u: 0, v: 0, x: 0, y: 0 }, { u: 1, v: 1, x: 1, y: 1 }, { u: 2, v: 2, x: 2, y: 2 }]), null, "puntos alineados: sin solución");
});

test("parpadeo largo: dispara una vez a los 400 ms e ignora los parpadeos naturales", () => {
  const d = S.detectorSostenido({ on: 0.5, off: 0.3, minMs: 400, maxMs: 2000 });
  let disparos = 0;
  for (let t = 0; t <= 200; t += 33) if (d.paso(0.9, t)) disparos++;     // parpadeo natural de 200 ms
  d.paso(0.05, 240);
  assert.equal(disparos, 0);
  for (let t = 1000; t <= 2500; t += 33) if (d.paso(0.9, t)) disparos++; // ojos cerrados 1,5 s
  assert.equal(disparos, 1, "un solo clic aunque siga cerrado");
  d.paso(0.05, 2600);
  for (let t = 3000; t <= 3500; t += 33) if (d.paso(0.9, t)) disparos++;
  assert.equal(disparos, 2, "se rearma al abrir los ojos");
});

test("pellizco con histéresis: inicio y fin sin rebotes", () => {
  const d = S.detectorPellizco({ on: 0.35, off: 0.5 });
  const eventos = [0.9, 0.6, 0.34, 0.40, 0.45, 0.30, 0.49, 0.51, 0.9, 0.2].map(r => d.paso(r));
  assert.deepEqual(eventos, [null, null, "inicio", null, null, null, null, "fin", null, "inicio"]);
});

test("ángulos de la cabeza: matrizCabeza y anguloCabeza son inversas", () => {
  for (const [yaw, pitch] of [[0, 0], [12, -7], [-18, 10], [25, 15]]) {
    const a = S.anguloCabeza(S.matrizCabeza(yaw, pitch));
    cerca(a.yaw, yaw, 1e-9, "giro"); cerca(a.pitch, pitch, 1e-9, "inclinación");
  }
  const identidad = S.anguloCabeza([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  cerca(identidad.yaw, 0, 1e-12); cerca(identidad.pitch, 0, 1e-12);
});

test("mano: razón de pellizco, palma abierta y caja activa en espejo", () => {
  const mano = (pellizco, abierta) => {
    const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.7 }));
    lm[0] = { x: 0.5, y: 0.8 }; lm[9] = { x: 0.5, y: 0.64 };
    lm[8] = { x: 0.5, y: 0.5 }; lm[6] = { x: 0.5, y: abierta ? 0.6 : 0.56 };
    lm[4] = pellizco ? { x: 0.51, y: 0.51 } : { x: 0.62, y: 0.6 };
    for (const [p, n] of [[12, 10], [16, 14], [20, 18]]) { lm[p] = { x: 0.52, y: abierta ? 0.5 : 0.68 }; lm[n] = { x: 0.52, y: 0.6 }; }
    return lm;
  };
  assert.ok(S.razonPellizco(mano(true, false)) < 0.35);
  assert.ok(S.razonPellizco(mano(false, false)) > 0.5);
  assert.equal(S.palmaAbierta(mano(false, true)), true);
  assert.equal(S.palmaAbierta(mano(false, false)), false);
  assert.equal(S.palmaAbierta(mano(true, true)), false, "un pellizco no es una palma abierta");
  assert.deepEqual(S.mapaCaja(0.5, 0.5, 0.2), { u: 0.5, v: 0.5 });
  cerca(S.mapaCaja(0.2, 0.2, 0.2).u, 1, 1e-12, "espejo: la izquierda de la imagen es la derecha de la pantalla");
  assert.deepEqual(S.mapaCaja(0.05, 0.99, 0.2), { u: 1, v: 1 }, "se recorta a la pantalla");
});

test("D-12: MediaPipe solo se menciona en js/a11y/camara.js y ninguna página lo carga", () => {
  for (const a of [...listar("js", p => p.endsWith(".js")), ...listar(".", p => /^[^/\\]+\.html$/.test(p.split(/[\\/]/).pop()) && !p.includes("figma-src") && !p.includes("node_modules") && p.split(/[\\/]/).length === 1)]) {
    const usa = /cdn\.jsdelivr\.net\/npm\/@mediapipe/.test(leer(a));
    assert.equal(usa, a === "js/a11y/camara.js", a);
  }
  assert.match(leer("js", "a11y", "camara.js"), /@mediapipe\/tasks-vision@1\.2\.3/);
});

test("los textos del centro de accesibilidad existen en los dos idiomas", () => {
  for (const l of ["es-PE", "en-US"]) {
    const a = leerJSON("i18n", l + ".json").a11y;
    for (const k of ["contraste", "movimiento", "espaciado", "enlaces", "decal", "invertirX", "invertirY"]) { assert.ok(a[k], l + " " + k); assert.ok(a[k + "_ayuda"], l + " " + k + "_ayuda"); }
    for (const k of ["mod_cabeza", "mod_manos", "clic_permanencia", "clic_parpadeo", "clic_boca"]) assert.ok(a[k], l + " " + k);
  }
});
