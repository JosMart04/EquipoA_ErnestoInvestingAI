/* js/lib/nsga2.js — NSGA-II (Deb et al., 2002) para carteras: minimiza (−retorno, volatilidad).
   Ordenamiento rápido no dominado, distancia de apiñamiento (crowding), torneo binario, cruce SBX, mutación polinómica
   y reparación de cada individuo por proyección al símplex con tope (simplex.js).
   Solo se usa en el Modo real con rango personalizado; en el Modo profesor los frentes se LEEN del JSON (R-OPT-08).
   Lógica pura, sin DOM. Formato dual: EIALib.nsga2 y module.exports. */
(function (global) {
  "use strict";
  const L = global.EIALib = global.EIALib || {};
  const dep = n => L[n] || require("./" + n + ".js");
  const E = dep("estadistica"), S = dep("simplex"), P = dep("prng");

  const ETA_CRUCE = 15, ETA_MUTACION = 20, PROB_CRUCE = 0.9;

  /** a domina a b si no es peor en ningún objetivo y es mejor en alguno (todos se minimizan). */
  function domina(a, b) {
    let mejor = false;
    for (let i = 0; i < a.length; i++) { if (a[i] > b[i]) return false; if (a[i] < b[i]) mejor = true; }
    return mejor;
  }

  /** Ordenamiento rápido no dominado. Devuelve los frentes como listas de índices (el primero es el no dominado). */
  function ordenNoDominado(F) {
    const n = F.length, dominados = Array.from({ length: n }, () => []), cuenta = new Array(n).fill(0), frentes = [[]];
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (domina(F[p], F[q])) { dominados[p].push(q); cuenta[q]++; }
        else if (domina(F[q], F[p])) { dominados[q].push(p); cuenta[p]++; }
      }
    }
    for (let p = 0; p < n; p++) if (cuenta[p] === 0) frentes[0].push(p);
    let i = 0;
    while (frentes[i].length) {
      const sig = [];
      for (const p of frentes[i]) for (const q of dominados[p]) if (--cuenta[q] === 0) sig.push(q);
      frentes.push(sig); i++;
    }
    frentes.pop();
    return frentes;
  }

  /** Distancia de apiñamiento de los individuos de un frente. Devuelve un arreglo alineado con `frente`. */
  function distanciaCrowding(F, frente) {
    const n = frente.length, d = new Array(n).fill(0);
    if (n <= 2) return d.fill(Infinity);
    const m = F[0].length;
    for (let k = 0; k < m; k++) {
      const orden = frente.map((ix, pos) => pos).sort((a, b) => F[frente[a]][k] - F[frente[b]][k]);
      const min = F[frente[orden[0]]][k], max = F[frente[orden[n - 1]]][k];
      d[orden[0]] = d[orden[n - 1]] = Infinity;
      if (max - min <= 0) continue;
      for (let j = 1; j < n - 1; j++) d[orden[j]] += (F[frente[orden[j + 1]]][k] - F[frente[orden[j - 1]]][k]) / (max - min);
    }
    return d;
  }

  /** Cruce binario simulado (SBX) de dos padres dentro de [0, tope]. Devuelve dos hijos sin reparar. */
  function cruceSBX(a, b, tope, rng) {
    const n = a.length, h1 = a.slice(), h2 = b.slice();
    if (rng.sig() > PROB_CRUCE) return [h1, h2];
    for (let i = 0; i < n; i++) {
      if (rng.sig() > 0.5 || Math.abs(a[i] - b[i]) < 1e-14) continue;
      const u = rng.sig(), beta = u <= 0.5 ? Math.pow(2 * u, 1 / (ETA_CRUCE + 1)) : Math.pow(1 / (2 * (1 - u)), 1 / (ETA_CRUCE + 1));
      h1[i] = Math.min(tope, Math.max(0, 0.5 * ((1 + beta) * a[i] + (1 - beta) * b[i])));
      h2[i] = Math.min(tope, Math.max(0, 0.5 * ((1 - beta) * a[i] + (1 + beta) * b[i])));
    }
    return [h1, h2];
  }
  /** Mutación polinómica con probabilidad 1/n por variable. Modifica x. */
  function mutar(x, tope, rng) {
    const n = x.length, pm = 1 / n;
    for (let i = 0; i < n; i++) {
      if (rng.sig() > pm) continue;
      const u = rng.sig(), d = u < 0.5 ? Math.pow(2 * u, 1 / (ETA_MUTACION + 1)) - 1 : 1 - Math.pow(2 * (1 - u), 1 / (ETA_MUTACION + 1));
      x[i] = Math.min(tope, Math.max(0, x[i] + d * tope));
    }
    return x;
  }
  /** Individuo inicial al azar: pesos exponenciales normalizados (uniforme sobre el símplex) y reparados al tope. */
  function individuoAzar(n, tope, rng) {
    const v = new Array(n); let s = 0;
    for (let i = 0; i < n; i++) { v[i] = -Math.log(1 - rng.sig()); s += v[i]; }
    // Carteras concentradas y dispersas: se eleva a una potencia al azar antes de normalizar
    const k = 1 + 3 * rng.sig(); let s2 = 0;
    for (let i = 0; i < n; i++) { v[i] = Math.pow(v[i] / s, k); s2 += v[i]; }
    return S.proyectarConTope(v.map(x => x / s2), tope);
  }

  /** NSGA-II genérico sobre carteras. p = {n, tope, evaluar(w) → [objetivos], pob?, gens?, semilla?, alGeneracion?(g, gens)}
      Devuelve {poblacion: [{x, f}], frente: [{x, f}]} con el primer frente al final de la última generación. */
  function nsga2(p) {
    const pob = p.pob || 100, gens = p.gens || 150, rng = p.rng || P.crearPRNG(p.semilla), n = p.n, tope = p.tope;
    const crear = x => ({ x, f: p.evaluar(x) });
    let P0 = Array.from({ length: pob }, () => crear(individuoAzar(n, tope, rng)));
    let rango = new Array(pob).fill(0), dist = new Array(pob).fill(0);
    const clasificar = lista => {
      const F = lista.map(i => i.f), frentes = ordenNoDominado(F), rg = new Array(lista.length), ds = new Array(lista.length);
      frentes.forEach((fr, k) => { const d = distanciaCrowding(F, fr); fr.forEach((ix, j) => { rg[ix] = k; ds[ix] = d[j]; }); });
      return { frentes, rg, ds };
    };
    let c = clasificar(P0); rango = c.rg; dist = c.ds;
    const torneo = () => { const a = rng.entero(pob), b = rng.entero(pob); return rango[a] < rango[b] || (rango[a] === rango[b] && dist[a] > dist[b]) ? P0[a] : P0[b]; };
    for (let g = 0; g < gens; g++) {
      const hijos = [];
      while (hijos.length < pob) {
        const [h1, h2] = cruceSBX(torneo().x, torneo().x, tope, rng);
        hijos.push(crear(S.proyectarConTope(mutar(h1, tope, rng), tope)));
        if (hijos.length < pob) hijos.push(crear(S.proyectarConTope(mutar(h2, tope, rng), tope)));
      }
      const union = P0.concat(hijos), cu = clasificar(union), sig = [];
      for (const fr of cu.frentes) {
        if (sig.length + fr.length <= pob) { for (const ix of fr) sig.push(ix); }
        else { fr.slice().sort((a, b) => cu.ds[b] - cu.ds[a]).slice(0, pob - sig.length).forEach(ix => sig.push(ix)); break; }
      }
      P0 = sig.map(ix => union[ix]);
      c = clasificar(P0); rango = c.rg; dist = c.ds;
      if (p.alGeneracion) p.alGeneracion(g + 1, gens);
    }
    return { poblacion: P0, frente: c.frentes[0].map(ix => P0[ix]) };
  }

  /** Elige k elementos repartidos de forma uniforme a lo largo de una lista ya ordenada. */
  function repartir(lista, k) {
    if (lista.length <= k) return lista.slice();
    const r = [];
    for (let i = 0; i < k; i++) r.push(lista[Math.round(i * (lista.length - 1) / (k - 1))]);
    return r;
  }

  /** Frente NSGA-II de carteras con el esquema de 07.nsga2_elegibles (ids N2-01…).
      p = {mu, cov, tope, tickers, rf?, semilla?, pob?, gens?, puntos? = 40, retornosDiarios?, alProgresar?} */
  function frenteCarteras2(p) {
    const M = dep("markowitz");
    const r = nsga2({
      n: p.mu.length, tope: p.tope, pob: p.pob, gens: p.gens, semilla: p.semilla,
      evaluar: w => [-E.retornoCartera(w, p.mu), E.volCartera(w, p.cov)],
      alGeneracion: p.alProgresar ? (g, G) => p.alProgresar(g / G) : null
    });
    const orden = r.frente.slice().sort((a, b) => a.f[1] - b.f[1]);
    return repartir(orden, p.puntos || 40).map((ind, i) => Object.assign(M.aPunto(ind.x, p), { id: "N2-" + String(i + 1).padStart(2, "0") }));
  }

  const api = { domina, ordenNoDominado, distanciaCrowding, cruceSBX, mutar, individuoAzar, nsga2, repartir, frenteCarteras2 };
  L.nsga2 = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
