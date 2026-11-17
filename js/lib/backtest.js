/* js/lib/backtest.js — backtesting walk-forward mensual con el mismo método que declara el profesor en 09.metodo:
   rebalanceo cada 21 sesiones, ventana de estimación de 126, filtro de momentum a 63, comisión de 5 pb sobre el turnover
   y sin mirar el futuro (cada decisión usa solo cierres anteriores). Devuelve el esquema de 09 (docs/CONTRATO_DATOS.md).
   Solo se usa en el Modo real con periodo personalizado; en el Modo profesor el backtesting se LEE del JSON.
   Lógica pura, sin DOM. Formato dual: EIALib.backtest y module.exports. */
(function (global) {
  "use strict";
  const L = global.EIALib = global.EIALib || {};
  const dep = n => L[n] || require("./" + n + ".js");
  const E = dep("estadistica"), M = dep("markowitz");

  const BASE = 100, NOMBRE_1N = "Igual ponderado (1/N)";
  const POR_DEFECTO = {
    sesiones: 252, paso: 21, ventana: 126, momentum: 63, comisionPb: 5, rf: 0.04, minActivos: 4,
    // El Agresivo usa tope 0,35 porque así viene en 09 del profesor (contrato, nota N-3)
    perfiles: { Conservador: { tipo: "minvar", tope: 0.25 }, Moderado: { tipo: "maxsharpe", tope: 0.25 }, Agresivo: { tipo: "maxret", tope: 0.35 } },
    referencias: ["SPY", "QQQ", "EPU"]
  };

  /** Activos que pasan el filtro de momentum en el cierre d; si son menos del mínimo, los de mejor momentum. */
  function elegibles(cierres, tickers, d, o, minimo) {
    const mom = tickers.map(t => ({ t, m: cierres[t][d] / cierres[t][d - o.momentum] - 1 }));
    const pasan = mom.filter(x => x.m > 0);
    if (pasan.length >= minimo) return pasan.map(x => x.t);
    return mom.sort((a, b) => b.m - a.m).slice(0, minimo).map(x => x.t);
  }

  /** Pesos de un perfil decididos con la información disponible hasta el cierre d (inclusive). */
  function decidir(cierres, tickers, d, perfil, o) {
    const minimo = Math.max(o.minActivos, Math.ceil(1 / perfil.tope - 1e-9));
    const el = elegibles(cierres, tickers, d, o, minimo);
    const R = E.matrizRetornos(cierres, el, d - o.ventana, d);
    const mu = E.mediasColumnas(R).map(x => x * E.SESIONES_ANIO), cov = E.escalar(E.covarianza(R, true), E.SESIONES_ANIO);
    const p = { mu, cov, tope: perfil.tope, rf: o.rf };
    const w = perfil.tipo === "minvar" ? M.minimaVarianza(p) : perfil.tipo === "maxret" ? M.maximoRetorno(p) : M.maximoSharpe(p);
    const pesos = {};
    el.forEach((t, i) => { if (w[i] > 1e-6) pesos[t] = w[i]; });
    return pesos;
  }

  /** Simula un perfil. Devuelve {curva, rebalanceos, turnover_medio, drawdown, metricas}. i0 es el índice del cierre base. */
  function simular(fechas, cierres, tickers, i0, perfil, o) {
    const curva = [BASE], rebalanceos = []; let capital = BASE, pesos = {}, turnoverTotal = 0;
    for (let s = 1; s <= o.sesiones; s++) {
      const t = i0 + s;
      if ((s - 1) % o.paso === 0) {
        const nuevos = decidir(cierres, tickers, t - 1, perfil, o); // solo cierres hasta t − 1
        let turnover = 0;
        for (const k of new Set(Object.keys(pesos).concat(Object.keys(nuevos)))) turnover += Math.abs((nuevos[k] || 0) - (pesos[k] || 0));
        capital *= 1 - (o.comisionPb / 10000) * turnover;
        turnoverTotal += turnover;
        pesos = nuevos;
        const redondos = {}; for (const k of Object.keys(nuevos)) redondos[k] = E.redondear(nuevos[k], 4);
        rebalanceos.push({ fecha: fechas[t], pesos: redondos });
      }
      // Retorno del día y deriva de los pesos
      let r = 0; const valor = {};
      for (const k of Object.keys(pesos)) { const rk = cierres[k][t] / cierres[k][t - 1] - 1; r += pesos[k] * rk; valor[k] = pesos[k] * (1 + rk); }
      capital *= 1 + r;
      for (const k of Object.keys(valor)) pesos[k] = valor[k] / (1 + r);
      curva.push(capital);
    }
    const curvaR = curva.map(v => E.redondear(v, 3));
    return { curva: curvaR, metricas: redondearMetricas(E.metricasCurva(curva, { rf: o.rf })), rebalanceos,
      turnover_medio: E.redondear(turnoverTotal / rebalanceos.length, 3), drawdown: E.drawdown(curva).map(v => E.redondear(v, 3)) };
  }
  function redondearMetricas(m) {
    return { retorno_total_pct: E.redondear(m.retorno_total_pct, 2), cagr_pct: E.redondear(m.cagr_pct, 2), volatilidad_anual_pct: E.redondear(m.volatilidad_anual_pct, 2),
      sharpe: E.redondear(m.sharpe, 3), max_drawdown_pct: E.redondear(m.max_drawdown_pct, 2), calmar: E.redondear(m.calmar, 3), meses_positivos_pct: E.redondear(m.meses_positivos_pct, 1) };
  }

  /** Comprar y mantener un activo desde el cierre base. */
  function comprarYMantener(cierres, ticker, i0, sesiones) {
    const c = cierres[ticker], curva = [];
    for (let s = 0; s <= sesiones; s++) curva.push(BASE * c[i0 + s] / c[i0]);
    return curva;
  }
  /** Igual ponderado (1/N): media simple de los retornos diarios de todos los activos (rebalanceo diario, sin comisión; contrato I-10). */
  function igualPonderado(cierres, tickers, i0, sesiones) {
    const curva = [BASE];
    for (let s = 1; s <= sesiones; s++) {
      const t = i0 + s; let r = 0;
      for (const k of tickers) r += cierres[k][t] / cierres[k][t - 1] - 1;
      curva.push(curva[s - 1] * (1 + r / tickers.length));
    }
    return curva;
  }

  /** Backtesting completo. p = {fechas, cierres:{T:[]}, tickers, hasta? (índice del último cierre), metodo?, …POR_DEFECTO, alProgresar?}
      Necesita al menos sesiones + max(ventana, momentum) + 1 cierres antes de `hasta`. */
  function walkForward(p) {
    const o = Object.assign({}, POR_DEFECTO, p), fechas = p.fechas, cierres = p.cierres, tickers = p.tickers;
    const fin = p.hasta == null ? fechas.length - 1 : p.hasta, i0 = fin - o.sesiones;
    if (i0 - Math.max(o.ventana, o.momentum) < 0) throw new RangeError("Historia insuficiente: se necesitan " + (o.sesiones + Math.max(o.ventana, o.momentum) + 1) + " cierres");
    const carteras = {}, nombres = Object.keys(o.perfiles);
    nombres.forEach((n, i) => { carteras[n] = simular(fechas, cierres, tickers, i0, o.perfiles[n], o); if (p.alProgresar) p.alProgresar((i + 1) / nombres.length); });
    const referencias = {}, empaquetar = c => ({ curva: c.map(v => E.redondear(v, 3)), metricas: redondearMetricas(E.metricasCurva(c, { rf: o.rf })) });
    for (const t of o.referencias) if (cierres[t]) referencias[t] = empaquetar(comprarYMantener(cierres, t, i0, o.sesiones));
    referencias[NOMBRE_1N] = empaquetar(igualPonderado(cierres, tickers, i0, o.sesiones));
    return {
      metodo: p.metodo || "", fechas: ["inicio"].concat(fechas.slice(i0 + 1, fin + 1)), base: BASE,
      periodo: { inicio: fechas[i0 + 1], fin: fechas[fin], sesiones: o.sesiones }, carteras, referencias
    };
  }

  const api = { walkForward, elegibles, decidir, simular, comprarYMantener, igualPonderado, POR_DEFECTO, NOMBRE_1N, BASE };
  L.backtest = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
