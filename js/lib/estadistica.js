/* js/lib/estadistica.js — estadística de series y de carteras. Lógica pura, sin DOM.
   Las fórmulas son las de docs/CONTRATO_DATOS.md (§4 I-03, I-10 y PLAN_MAESTRO §5.3) y se prueban contra los JSON del profesor.
   Formato dual: EIALib.estadistica y module.exports. */
(function (global) {
  "use strict";
  const L = global.EIALib = global.EIALib || {};

  const SESIONES_ANIO = 252, SESIONES_MES = 21;
  const ES_NORMAL_95 = 2.0627; // pérdida esperada en la cola del 5 % de una normal estándar: φ(1,645) / 0,05

  const suma = a => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
  const media = a => (a.length ? suma(a) / a.length : NaN);
  /** Varianza. muestral = true divide entre n − 1; por defecto entre n (así calcula la volatilidad el material del profesor). */
  function varianza(a, muestral) {
    const m = media(a); let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
    return s / (muestral ? a.length - 1 : a.length);
  }
  const desv = (a, muestral) => Math.sqrt(varianza(a, muestral));

  const retornosSimples = p => { const r = new Array(Math.max(0, p.length - 1)); for (let i = 1; i < p.length; i++) r[i - 1] = p[i] / p[i - 1] - 1; return r; };
  const retornosLog = p => { const r = new Array(Math.max(0, p.length - 1)); for (let i = 1; i < p.length; i++) r[i - 1] = Math.log(p[i] / p[i - 1]); return r; };

  /** Percentil con interpolación lineal (el método por defecto de NumPy). p en [0, 100]. */
  function percentil(a, p) {
    const o = a.slice().sort((x, y) => x - y);
    if (!o.length) return NaN;
    const h = (o.length - 1) * p / 100, i = Math.floor(h), f = h - i;
    return i + 1 < o.length ? o[i] + f * (o[i + 1] - o[i]) : o[i];
  }
  const mediana = a => percentil(a, 50);

  /** Matriz T×N de retornos simples a partir de {ticker: cierres[]} entre los índices [desde, hasta] (inclusive) de los cierres. */
  function matrizRetornos(cierres, tickers, desde, hasta) {
    const R = [];
    for (let t = desde + 1; t <= hasta; t++) R.push(tickers.map(k => cierres[k][t] / cierres[k][t - 1] - 1));
    return R;
  }
  const mediasColumnas = R => { const n = R[0].length, m = new Array(n).fill(0); for (const f of R) for (let j = 0; j < n; j++) m[j] += f[j]; return m.map(x => x / R.length); };

  /** Covarianza de las columnas de R (T×N). muestral = true divide entre T − 1. */
  function covarianza(R, muestral) {
    const T = R.length, n = R[0].length, m = mediasColumnas(R), C = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const f of R) for (let i = 0; i < n; i++) { const di = f[i] - m[i]; for (let j = i; j < n; j++) C[i][j] += di * (f[j] - m[j]); }
    const d = muestral ? T - 1 : T;
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { C[i][j] /= d; C[j][i] = C[i][j]; }
    return C;
  }

  /** Covarianza de Ledoit-Wolf: contrae la covarianza empírica hacia un múltiplo de la identidad (misma fórmula que scikit-learn). */
  function ledoitWolf(R) {
    const T = R.length, n = R[0].length, m = mediasColumnas(R);
    const X = R.map(f => f.map((v, j) => v - m[j]));
    const S = covarianza(R, false);
    let traza = 0; for (let i = 0; i < n; i++) traza += S[i][i];
    const mu = traza / n;
    let delta_ = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) delta_ += S[i][j] * S[i][j];
    let beta_ = 0;
    for (const f of X) { let q = 0; for (let j = 0; j < n; j++) q += f[j] * f[j]; beta_ += q * q; }
    let beta = (beta_ / T - delta_) / (n * T);
    let delta = (delta_ - 2 * mu * traza + n * mu * mu) / n;
    beta = Math.min(beta, delta);
    const contraccion = delta > 0 && beta > 0 ? beta / delta : 0;
    const cov = S.map((f, i) => f.map((v, j) => (1 - contraccion) * v + (i === j ? contraccion * mu : 0)));
    return { cov, contraccion };
  }

  const escalar = (M, k) => M.map(f => f.map(v => v * k));
  function matVec(M, v) { const n = v.length, r = new Array(n); for (let i = 0; i < n; i++) { let s = 0; const f = M[i]; for (let j = 0; j < n; j++) s += f[j] * v[j]; r[i] = s; } return r; }
  const punto = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  const retornoCartera = (w, mu) => punto(w, mu);
  const varianzaCartera = (w, cov) => punto(w, matVec(cov, w));
  const volCartera = (w, cov) => Math.sqrt(Math.max(0, varianzaCartera(w, cov)));
  const sharpe = (retorno, vol, rf) => (vol > 0 ? (retorno - rf) / vol : 0);

  /** Mayor autovalor de una matriz simétrica semidefinida positiva (iteración de potencias). */
  function autovalorMax(M) {
    const n = M.length; let v = new Array(n).fill(1 / Math.sqrt(n)), l = 0;
    for (let k = 0; k < 500; k++) {
      const w = matVec(M, v), norma = Math.sqrt(punto(w, w));
      if (norma === 0) return 0;
      const l2 = norma; v = w.map(x => x / norma);
      if (Math.abs(l2 - l) <= 1e-12 * l2) { l = l2; break; }
      l = l2;
    }
    return l;
  }

  /** CVaR histórico: pérdida media (positiva) en la peor fracción (1 − nivel) de los retornos. Mismas unidades que la entrada. */
  function cvar(retornos, nivel) {
    const q = 1 - (nivel == null ? 0.95 : nivel), o = retornos.slice().sort((a, b) => a - b);
    const k = Math.max(1, Math.floor(o.length * q));
    return -media(o.slice(0, k));
  }
  /** CVaR 95 % diario de una normal con retorno y volatilidad ANUALES (fracción). Devuelve fracción diaria positiva.
      Aproxima el cvar95_diario_pct de 07 (medido: dentro del 10 % en las fronteras de Markowitz). */
  function cvarNormalDiario(retornoAnual, volAnual) {
    return ES_NORMAL_95 * volAnual / Math.sqrt(SESIONES_ANIO) - retornoAnual / SESIONES_ANIO;
  }

  /** Drawdown en % de una curva de capital: curva / máximo acumulado − 1 (≤ 0). */
  function drawdown(curva) {
    let mx = -Infinity;
    return curva.map(v => { if (v > mx) mx = v; return (v / mx - 1) * 100; });
  }

  /** Las 7 métricas de 09 a partir de una curva de capital (contrato I-06 e I-10). rf en fracción anual. */
  function metricasCurva(curva, op) {
    const o = Object.assign({ rf: 0.04, anio: SESIONES_ANIO, mes: SESIONES_MES }, op);
    const sesiones = curva.length - 1, r = retornosSimples(curva);
    const total = curva[sesiones] / curva[0] - 1;
    const cagr = Math.pow(curva[sesiones] / curva[0], o.anio / sesiones) - 1;
    const vol = desv(r, false) * Math.sqrt(o.anio);
    const mdd = Math.min.apply(null, drawdown(curva)) / 100;
    let positivos = 0, bloques = 0;
    for (let k = 0; (k + 1) * o.mes <= sesiones; k++) { bloques++; if (curva[(k + 1) * o.mes] / curva[k * o.mes] - 1 > 0) positivos++; }
    return {
      retorno_total_pct: total * 100, cagr_pct: cagr * 100, volatilidad_anual_pct: vol * 100,
      sharpe: sharpe(cagr, vol, o.rf), max_drawdown_pct: mdd * 100,
      calmar: mdd < 0 ? cagr / Math.abs(mdd) : 0,
      meses_positivos_pct: bloques ? 100 * positivos / bloques : 0
    };
  }

  const redondear = (x, d) => { const k = Math.pow(10, d); return Math.round(x * k) / k; };

  const api = {
    SESIONES_ANIO, SESIONES_MES, ES_NORMAL_95, suma, media, varianza, desv, retornosSimples, retornosLog, percentil, mediana,
    matrizRetornos, mediasColumnas, covarianza, ledoitWolf, escalar, matVec, punto, retornoCartera, varianzaCartera, volCartera, sharpe,
    autovalorMax, cvar, cvarNormalDiario, drawdown, metricasCurva, redondear
  };
  L.estadistica = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
