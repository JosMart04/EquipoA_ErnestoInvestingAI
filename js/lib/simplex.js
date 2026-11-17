/* js/lib/simplex.js — proyección euclidiana al conjunto de carteras factibles { 0 ≤ wᵢ ≤ tope, Σw = suma }.
   Es la pieza que comparten Markowitz (gradiente proyectado) y la reparación de NSGA-II y NSGA-III.
   Lógica pura, sin DOM. Formato dual: EIALib.simplex y module.exports. */
(function (global) {
  "use strict";
  const L = global.EIALib = global.EIALib || {};

  /** Proyecta v sobre { 0 ≤ w ≤ tope, Σw = suma }. La solución es wᵢ = clip(vᵢ − τ, 0, tope); τ se halla por bisección.
      Lanza RangeError si el conjunto está vacío (n·tope < suma): con tope 25 % hacen falta al menos 4 activos. */
  function proyectarConTope(v, tope, suma) {
    const s = suma == null ? 1 : suma, n = v.length;
    if (!(tope > 0) || n * tope < s - 1e-12) throw new RangeError("No hay cartera factible: " + n + " activos con tope " + tope + " no alcanzan a sumar " + s);
    let bajo = Infinity, alto = -Infinity;
    for (let i = 0; i < n; i++) { if (v[i] - tope < bajo) bajo = v[i] - tope; if (v[i] > alto) alto = v[i]; }
    const total = tau => { let a = 0; for (let i = 0; i < n; i++) { const x = v[i] - tau; a += x <= 0 ? 0 : (x >= tope ? tope : x); } return a; };
    // total(τ) es decreciente: total(bajo) = n·tope ≥ suma y total(alto) = 0 ≤ suma
    for (let k = 0; k < 100; k++) { const medio = (bajo + alto) / 2; if (total(medio) > s) bajo = medio; else alto = medio; }
    const tau = (bajo + alto) / 2, w = new Array(n);
    let acumulado = 0;
    for (let i = 0; i < n; i++) { const x = v[i] - tau; w[i] = x <= 0 ? 0 : (x >= tope ? tope : x); acumulado += w[i]; }
    // Reparto del residuo numérico entre los pesos que no están en un límite
    const resto = s - acumulado;
    if (Math.abs(resto) > 1e-15) {
      const libres = []; for (let i = 0; i < n; i++) if (w[i] > 0 && w[i] < tope) libres.push(i);
      if (libres.length) { const d = resto / libres.length; for (const i of libres) w[i] = Math.min(tope, Math.max(0, w[i] + d)); }
    }
    return w;
  }

  /** ¿w cumple los límites y la suma dentro de la tolerancia? */
  function esFactible(w, tope, tol, suma) {
    const t = tol == null ? 1e-9 : tol, s = suma == null ? 1 : suma;
    let a = 0;
    for (let i = 0; i < w.length; i++) { if (!(w[i] >= -t) || w[i] > tope + t) return false; a += w[i]; }
    return Math.abs(a - s) <= t * Math.max(1, w.length);
  }

  const api = { proyectarConTope, esFactible };
  L.simplex = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
