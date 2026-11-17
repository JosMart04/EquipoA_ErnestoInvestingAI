/* js/workers/backtest.worker.js — recalcula el backtesting walk-forward fuera del hilo de la interfaz.
   SOLO para el Modo real con un periodo personalizado (D-03); en el Modo profesor el backtesting se lee del JSON.
   Worker clásico (importScripts). Mismo protocolo que optimizador.worker.js:
     entrada  {tipo: "calcular", params}
     salida   {tipo: "progreso", pct} · {tipo: "resultado", datos} (esquema de 09) · {tipo: "error", mensaje} */
(function (global) {
  "use strict";
  const enWorker = typeof importScripts === "function";
  if (enWorker) importScripts("../lib/estadistica.js", "../lib/simplex.js", "../lib/markowitz.js", "../lib/backtest.js");
  const B = enWorker ? global.EIALib.backtest : require("../lib/backtest.js");

  /** params = {fechas, cierres:{T:[]}, tickers, fin? (fecha ISO del último cierre), sesiones?, metodo?, rf?, …} (ver backtest.js) */
  function calcular(params, progreso) {
    const p = Object.assign({}, params);
    if (p.fin) { const k = p.fechas.findIndex(f => f > p.fin); p.hasta = k < 0 ? p.fechas.length - 1 : k - 1; }
    p.alProgresar = f => progreso(100 * f);
    return B.walkForward(p);
  }

  function manejar(mensaje, publicar) {
    if (!mensaje || mensaje.tipo !== "calcular") return;
    let ultimo = -1;
    const progreso = pct => { const v = Math.max(0, Math.min(100, Math.round(pct))); if (v !== ultimo) { ultimo = v; publicar({ tipo: "progreso", pct: v }); } };
    try { const datos = calcular(mensaje.params, progreso); progreso(100); publicar({ tipo: "resultado", datos }); }
    catch (e) { publicar({ tipo: "error", mensaje: String((e && e.message) || e) }); }
  }

  if (enWorker) global.onmessage = e => manejar(e.data, m => global.postMessage(m));
  if (typeof module !== "undefined" && module.exports) module.exports = { manejar, calcular };
})(typeof self !== "undefined" ? self : globalThis);
