/* js/workers/optimizador.worker.js — recalcula Markowitz, NSGA-II y NSGA-III fuera del hilo de la interfaz.
   SOLO para el Modo real con una ventana de estimación personalizada (D-03). En el Modo profesor no se crea nunca
   este Worker: las fronteras se leen del JSON (R-OPT-08).
   Worker clásico (importScripts). Protocolo (PLAN_MAESTRO §7.2):
     entrada  {tipo: "calcular", params}
     salida   {tipo: "progreso", pct} · {tipo: "resultado", datos} (esquema de 07) · {tipo: "error", mensaje}
   Para cancelar, la página llama a worker.terminate(). `manejar` se exporta para probarlo en Node. */
(function (global) {
  "use strict";
  const enWorker = typeof importScripts === "function";
  if (enWorker) importScripts("../lib/prng.js", "../lib/estadistica.js", "../lib/simplex.js", "../lib/markowitz.js", "../lib/nsga2.js", "../lib/nsga3.js");
  const lib = n => (enWorker ? global.EIALib[n] : require("../lib/" + n + ".js"));
  const E = lib("estadistica"), M = lib("markowitz"), N2 = lib("nsga2"), N3 = lib("nsga3");

  /** params = {fechas, cierres:{T:[]}, tickers, elegibles, desde?, hasta? (fechas ISO), tope, rf, semilla?, muAnual?:{T: fracción},
                criterio_elegibilidad?, nota?, gens?, pob?}
      Retorno esperado: muAnual si viene (p. ej. el del pipeline); si no, la media histórica anualizada de la ventana.
      Covarianza: Ledoit-Wolf sobre los retornos diarios de la ventana, anualizada. */
  function calcular(params, progreso) {
    const p = params, fechas = p.fechas;
    let i0 = p.desde ? fechas.findIndex(f => f >= p.desde) : 0, i1 = fechas.length - 1;
    if (p.hasta) { const k = fechas.findIndex(f => f > p.hasta); i1 = k < 0 ? fechas.length - 1 : k - 1; }
    if (i0 < 0 || i1 - i0 < 30) throw new Error("La ventana elegida tiene menos de 30 sesiones");
    const minimo = Math.ceil(1 / p.tope - 1e-9);
    if (p.elegibles.length < minimo) throw new Error("Con tope " + p.tope + " hacen falta al menos " + minimo + " activos elegibles");
    const preparar = tickers => {
      const R = E.matrizRetornos(p.cierres, tickers, i0, i1);
      const mu = p.muAnual ? tickers.map(t => p.muAnual[t]) : E.mediasColumnas(R).map(x => x * E.SESIONES_ANIO);
      return { mu, cov: E.escalar(E.ledoitWolf(R).cov, E.SESIONES_ANIO), tope: p.tope, rf: p.rf, tickers, retornosDiarios: R, semilla: p.semilla, gens: p.gens, pob: p.pob };
    };
    const todo = preparar(p.tickers), el = preparar(p.elegibles);
    progreso(5);
    const markowitz_universo_completo = M.frontera(Object.assign({ puntos: 35 }, todo)); progreso(15);
    const markowitz_elegibles = M.frontera(Object.assign({ puntos: 35 }, el)); progreso(25);
    const nsga2_elegibles = N2.frenteCarteras2(Object.assign({ puntos: 40, alProgresar: f => progreso(25 + 35 * f) }, el));
    const nsga3_elegibles = N3.frenteCarteras3(Object.assign({ puntos: 60, alProgresar: f => progreso(60 + 40 * f) }, el));
    return {
      elegibles: p.elegibles.slice(), criterio_elegibilidad: p.criterio_elegibilidad || "", tope_peso_por_activo: p.tope, tasa_libre_riesgo: p.rf,
      markowitz_universo_completo, markowitz_elegibles, nsga2_elegibles, nsga3_elegibles, nota: p.nota || "",
      recalculado: { desde: fechas[i0], hasta: fechas[i1], sesiones: i1 - i0, semilla: p.semilla == null ? null : p.semilla }
    };
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
