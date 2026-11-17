/* js/lib/prng.js — generador pseudoaleatorio con semilla (mulberry32) para resultados reproducibles.
   Lógica pura, sin DOM. Formato dual: global EIALib.prng (página o Worker) y module.exports (Node). */
(function (global) {
  "use strict";
  const L = global.EIALib = global.EIALib || {};
  const SEMILLA = 2026; // la misma semilla del material del profesor (13.semilla)

  function crearPRNG(semilla) {
    let a = (semilla == null ? SEMILLA : semilla) >>> 0;
    /** Siguiente número en [0, 1). */
    function sig() {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      sig,
      /** Entero en [0, n). */
      entero: n => Math.floor(sig() * n),
      /** Normal estándar (Box-Muller). */
      normal() { let u = 0; while (u === 0) u = sig(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * sig()); },
      /** Baraja una copia del arreglo (Fisher-Yates). */
      barajar(arr) { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(sig() * (i + 1)); const x = b[i]; b[i] = b[j]; b[j] = x; } return b; }
    };
  }

  const api = { crearPRNG, SEMILLA };
  L.prng = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
