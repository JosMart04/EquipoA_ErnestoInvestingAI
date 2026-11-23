/* js/lib/mercado.js — series de precios para el Dashboard, el detalle de activo y el comparador. Lógica pura, sin DOM.
   Lee los cierres de 02 (o cierres_historicos en el Modo real, mismo esquema), las velas OHLCV de 03 y la matriz de 04.
   Ninguna cifra de datos está escrita aquí; las métricas derivadas se declaran en la interfaz («calculado de los cierres»).
   Formato dual: EIALib.mercado y module.exports. */
(function (global) {
  "use strict";
  const L = global.EIALib = global.EIALib || {};
  const dep = n => L[n] || require("./" + n + ".js");
  const E = dep("estadistica");

  /** Serie del activo para un rango. Si todo el rango cabe en las velas de 03 se dibujan velas; si no, la línea de cierres
      de 02 (en el Modo profesor solo hay 120 velas, PLAN_MAESTRO §8.3 M1). rango = {sesiones} o {desde, hasta} (ISO). */
  function serieActivo(c02, c03, ticker, rango) {
    const r = rango || {};
    const f02 = c02.fechas, cierres = c02.cierres[ticker] || [];
    let i0 = 0, i1 = f02.length - 1;
    if (r.sesiones) i0 = Math.max(0, f02.length - r.sesiones);
    if (r.desde) { const k = f02.findIndex(f => f >= r.desde); i0 = k < 0 ? f02.length : k; }
    if (r.hasta) { const k = f02.findIndex(f => f > r.hasta); i1 = (k < 0 ? f02.length : k) - 1; }
    if (i1 < i0) return { tipo: "vacia", fechas: [], cierres: [] };
    const fechas = f02.slice(i0, i1 + 1), v = c03 && c03.series[ticker];
    const j0 = c03 ? c03.fechas.indexOf(fechas[0]) : -1, j1 = c03 ? c03.fechas.indexOf(fechas[fechas.length - 1]) : -1;
    if (v && j0 >= 0 && j1 >= j0) {
      return { tipo: "velas", fechas: c03.fechas.slice(j0, j1 + 1), o: v.o.slice(j0, j1 + 1), h: v.h.slice(j0, j1 + 1), l: v.l.slice(j0, j1 + 1), c: v.c.slice(j0, j1 + 1), v: v.v.slice(j0, j1 + 1) };
    }
    return { tipo: "linea", fechas, c: cierres.slice(i0, i1 + 1) };
  }

  /** Mínimo, máximo y variación de una serie (para el resumen y la tabla). null si está vacía. */
  function estadisticas(s) {
    const bajos = s.tipo === "velas" ? s.l : s.c, altos = s.tipo === "velas" ? s.h : s.c, n = s.c ? s.c.length : 0;
    if (!n) return null;
    return { n, primero: s.c[0], ultimo: s.c[n - 1], variacion: (s.c[n - 1] / s.c[0] - 1) * 100, min: Math.min.apply(null, bajos), max: Math.max.apply(null, altos) };
  }

  /** Índices [i0, i1] de las últimas `sesiones` fechas (todas si no se indica). */
  function ventana(fechas, sesiones) {
    const i1 = fechas.length - 1;
    return [sesiones ? Math.max(0, fechas.length - sesiones) : 0, i1];
  }
  /** Curvas en base 100 desde la primera fecha de la ventana: comparan activos de precios muy distintos. */
  function base100(cierres, tickers, sesiones, fechas) {
    const [i0, i1] = ventana(fechas, sesiones);
    const out = {};
    for (const tk of tickers) {
      const c = (cierres[tk] || []).slice(i0, i1 + 1);
      out[tk] = c.length && c[0] ? c.map(x => (x / c[0]) * 100) : [];
    }
    return { fechas: fechas.slice(i0, i1 + 1), series: out };
  }
  /** Métricas de cada activo en la ventana, calculadas de los cierres: retorno del periodo (%), volatilidad anualizada (%)
      con retornos simples diarios (como el material del curso) y beta frente a la referencia (SPY por defecto). */
  function metricasPeriodo(cierres, tickers, sesiones, fechas, referencia) {
    const [i0, i1] = ventana(fechas, sesiones);
    const ref = E.retornosSimples((cierres[referencia || "SPY"] || []).slice(i0, i1 + 1));
    const varRef = ref.length > 1 ? E.varianza(ref) : NaN, mRef = E.media(ref);
    return tickers.map(tk => {
      const c = (cierres[tk] || []).slice(i0, i1 + 1), r = E.retornosSimples(c);
      let cov = 0; for (let i = 0; i < r.length && i < ref.length; i++) cov += (r[i] - E.media(r)) * (ref[i] - mRef);
      cov /= Math.max(1, Math.min(r.length, ref.length));
      return {
        ticker: tk,
        retorno: c.length > 1 ? (c[c.length - 1] / c[0] - 1) * 100 : NaN,
        volatilidad: r.length > 1 ? E.desv(r) * Math.sqrt(E.SESIONES_ANIO) * 100 : NaN,
        beta: varRef > 0 ? cov / varRef : NaN,
        sesiones: c.length
      };
    });
  }
  /** Correlación entre dos activos según la matriz de 04 (null si falta alguno). */
  function correlacion(c04, a, b) {
    const i = c04.tickers.indexOf(a), j = c04.tickers.indexOf(b);
    return i < 0 || j < 0 ? null : c04.correlacion[i][j];
  }
  /** Los n activos más y menos correlacionados con uno, sin contarlo a él (04). */
  function vecinos(c04, ticker, n) {
    const i = c04.tickers.indexOf(ticker);
    if (i < 0) return { mas: [], menos: [] };
    const otros = c04.tickers.map((tk, j) => ({ ticker: tk, rho: c04.correlacion[i][j] })).filter(x => x.ticker !== ticker);
    const orden = otros.slice().sort((x, y) => y.rho - x.rho);
    return { mas: orden.slice(0, n), menos: orden.slice(-n).reverse() };
  }

  const api = { serieActivo, estadisticas, ventana, base100, metricasPeriodo, correlacion, vecinos };
  L.mercado = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
