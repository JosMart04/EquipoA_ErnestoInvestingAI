/* js/lib/markowitz.js — frontera eficiente de Markowitz con tope por activo y sin posiciones cortas.
   Método: para cada γ ≥ 0 se minimiza ½·wᵀΣw − γ·μᵀw sobre { 0 ≤ w ≤ tope, Σw = 1 } con un algoritmo de pares exacto
   (problema convexo: converge al óptimo). El retorno crece con γ, así que cada retorno objetivo se alcanza por bisección.
   Solo se usa en el Modo real con rango personalizado (PLAN_MAESTRO §7); en el Modo profesor las fronteras se LEEN del JSON.
   Lógica pura, sin DOM. Formato dual: EIALib.markowitz y module.exports. */
(function (global) {
  "use strict";
  const L = global.EIALib = global.EIALib || {};
  const dep = n => L[n] || require("./" + n + ".js");
  const E = dep("estadistica"), S = dep("simplex");

  /** Cartera de máximo retorno: se llena hasta el tope empezando por el activo de mayor retorno (óptimo exacto de un problema lineal). */
  function maximoRetorno(p) {
    const orden = p.mu.map((m, i) => i).sort((a, b) => p.mu[b] - p.mu[a]), w = new Array(p.mu.length).fill(0);
    let queda = 1;
    for (const i of orden) { const x = Math.min(p.tope, queda); w[i] = x; queda -= x; if (queda <= 1e-15) break; }
    if (queda > 1e-9) throw new RangeError("No hay cartera factible con tope " + p.tope);
    return w;
  }

  /** Minimiza ½·wᵀΣw − γ·μᵀw sobre { 0 ≤ w ≤ tope, Σw = 1 }. p = {mu, cov, tope, gamma, w0?, iter?, tol?}
      Algoritmo de pares (como SMO): en cada paso mueve peso del activo con mayor gradiente que puede bajar al de menor
      gradiente que puede subir, con el paso óptimo exacto. Termina cuando se cumplen las condiciones KKT (óptimo global,
      porque el problema es convexo). Cada paso cuesta O(n). */
  function carteraPara(p) {
    const n = p.mu.length, gamma = p.gamma || 0, c = p.tope, cov = p.cov, mu = p.mu;
    const iter = p.iter || 200000, tol = p.tol || 1e-12, eps = 1e-15;
    const w = p.w0 ? p.w0.slice() : S.proyectarConTope(new Array(n).fill(1 / n), c);
    const g = E.matVec(cov, w);
    for (let i = 0; i < n; i++) g[i] -= gamma * mu[i];
    for (let k = 0; k < iter; k++) {
      let sube = -1, baja = -1;
      for (let i = 0; i < n; i++) {
        if (w[i] < c - eps && (sube < 0 || g[i] < g[sube])) sube = i;   // puede recibir peso
        if (w[i] > eps && (baja < 0 || g[i] > g[baja])) baja = i;       // puede ceder peso
      }
      if (sube < 0 || baja < 0 || g[baja] - g[sube] <= tol) break;      // KKT: nadie mejora
      const curva = cov[sube][sube] + cov[baja][baja] - 2 * cov[sube][baja];
      const limite = Math.min(c - w[sube], w[baja]);
      const d = curva > eps ? Math.min(limite, (g[baja] - g[sube]) / curva) : limite;
      w[sube] += d; w[baja] -= d;
      const fs = cov[sube], fb = cov[baja];
      for (let i = 0; i < n; i++) g[i] += d * (fs[i] - fb[i]);
    }
    return w;
  }
  const minimaVarianza = p => carteraPara(Object.assign({}, p, { gamma: 0 }));

  /** Cartera de mínima varianza con retorno = objetivo, por bisección sobre γ (el retorno crece con γ).
      p = {mu, cov, tope}; op = {techo, w0, piso}. Devuelve {w, gamma}. */
  function carteraParaRetorno(p, objetivo, op) {
    const o = op || {};
    let a = o.piso || 0, b = o.techo || techoGamma(p), w = o.w0 || null;
    for (let k = 0; k < 60; k++) {
      const gm = (a + b) / 2;
      w = carteraPara({ mu: p.mu, cov: p.cov, tope: p.tope, gamma: gm, w0: w || undefined });
      const r = E.retornoCartera(w, p.mu);
      if (Math.abs(r - objetivo) <= 1e-10) { a = gm; break; }
      if (r < objetivo) a = gm; else b = gm;
    }
    return { w, gamma: a };
  }
  /** γ a partir del cual la solución ya es la cartera de máximo retorno. */
  function techoGamma(p) {
    const rMax = E.retornoCartera(maximoRetorno(p), p.mu);
    let techo = 1e-3, w = null;
    for (let k = 0; k < 80; k++) {
      w = carteraPara({ mu: p.mu, cov: p.cov, tope: p.tope, gamma: techo, w0: w || undefined });
      if (E.retornoCartera(w, p.mu) >= rMax - 1e-12) break;
      techo *= 2;
    }
    return techo;
  }

  /** Frontera eficiente «cruda»: [{w, retorno, vol}] con retornos equiespaciados entre mínima varianza y máximo retorno. */
  function fronteraCruda(p) {
    const puntos = p.puntos || 35;
    const medir = w => ({ w, retorno: E.retornoCartera(w, p.mu), vol: E.volCartera(w, p.cov) });
    const wMin = minimaVarianza(p), wMax = maximoRetorno(p);
    const rMin = E.retornoCartera(wMin, p.mu), rMax = E.retornoCartera(wMax, p.mu);
    const salida = [medir(wMin)];
    if (!(rMax - rMin > 1e-12) || puntos < 2) return salida;
    const techo = techoGamma(p);
    let piso = 0, wPrev = wMin;
    for (let j = 1; j < puntos - 1; j++) {
      const sol = carteraParaRetorno(p, rMin + (rMax - rMin) * j / (puntos - 1), { techo, piso, w0: wPrev });
      piso = sol.gamma; wPrev = sol.w;
      salida.push(medir(sol.w));
      if (p.alProgresar) p.alProgresar(j / (puntos - 1));
    }
    // El último punto es el de máximo retorno con la menor varianza posible (puede haber empates en retorno)
    salida.push(medir(carteraPara({ mu: p.mu, cov: p.cov, tope: p.tope, gamma: techo * 4, w0: wPrev })));
    return salida;
  }

  /** Convierte una cartera al punto del contrato (esquema de 07). tickers en el orden de w. retornosDiarios (T×N) es opcional. */
  function aPunto(w, p) {
    const retorno = E.retornoCartera(w, p.mu), vol = E.volCartera(w, p.cov), rf = p.rf == null ? 0.04 : p.rf;
    const cv = p.retornosDiarios ? E.cvar(p.retornosDiarios.map(f => E.punto(f, w)), 0.95) : E.cvarNormalDiario(retorno, vol);
    const pesos = {};
    w.forEach((x, i) => { if (x >= 5e-5) pesos[p.tickers[i]] = E.redondear(x, 4); });
    return {
      retorno_esperado_anual_pct: E.redondear(retorno * 100, 2), volatilidad_anual_pct: E.redondear(vol * 100, 2),
      sharpe: E.redondear(E.sharpe(retorno, vol, rf), 3), cvar95_diario_pct: E.redondear(cv * 100, 2), pesos
    };
  }
  /** Frontera con el esquema de 07.markowitz_*: p = {mu, cov, tope, tickers, rf?, puntos?, retornosDiarios?} */
  const frontera = p => fronteraCruda(p).map(x => aPunto(x.w, p));

  /** Cartera de máximo Sharpe sobre la frontera (búsqueda sobre γ). */
  function maximoSharpe(p) {
    const rf = p.rf == null ? 0.04 : p.rf, cruda = fronteraCruda(Object.assign({}, p, { puntos: p.puntos || 41 }));
    let mejor = cruda[0], s = -Infinity;
    for (const x of cruda) { const v = E.sharpe(x.retorno, x.vol, rf); if (v > s) { s = v; mejor = x; } }
    return mejor.w;
  }

  const api = { maximoRetorno, carteraPara, minimaVarianza, carteraParaRetorno, techoGamma, fronteraCruda, frontera, aPunto, maximoSharpe };
  L.markowitz = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
