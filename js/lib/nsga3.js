/* js/lib/nsga3.js — NSGA-III (Deb y Jain, 2014) para carteras con 3 objetivos: −retorno, volatilidad y CVaR 95 %.
   Direcciones de referencia de Das-Dennis, normalización (punto ideal, puntos extremos por ASF e interceptos),
   asociación a la referencia más cercana y selección por nichos. Reutiliza los operadores de nsga2.js.
   Solo se usa en el Modo real con rango personalizado; en el Modo profesor los frentes se LEEN del JSON (R-OPT-08).
   Lógica pura, sin DOM. Formato dual: EIALib.nsga3 y module.exports. */
(function (global) {
  "use strict";
  const L = global.EIALib = global.EIALib || {};
  const dep = n => L[n] || require("./" + n + ".js");
  const E = dep("estadistica"), S = dep("simplex"), P = dep("prng"), N2 = dep("nsga2");

  /** Direcciones de referencia de Das-Dennis: puntos del símplex de m objetivos con p divisiones. (3, 12) → 91. */
  function dasDennis(m, p) {
    const salida = [];
    (function rec(resto, dim, actual) {
      if (dim === m - 1) { salida.push(actual.concat(resto / p)); return; }
      for (let i = 0; i <= resto; i++) rec(resto - i, dim + 1, actual.concat(i / p));
    })(p, 0, []);
    return salida;
  }

  /** Resuelve A·x = b por eliminación gaussiana con pivoteo. Devuelve null si A es singular. */
  function resolver(A, b) {
    const n = b.length, M = A.map((f, i) => f.concat(b[i]));
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-12) return null;
      const t = M[c]; M[c] = M[piv]; M[piv] = t;
      for (let r = 0; r < n; r++) { if (r === c) continue; const k = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; }
    }
    return M.map((f, i) => f[n] / f[i]);
  }

  /** Normaliza los objetivos de un conjunto: resta el punto ideal y divide entre los interceptos del hiperplano de extremos. */
  function normalizar(F) {
    const m = F[0].length, ideal = new Array(m).fill(Infinity);
    for (const f of F) for (let k = 0; k < m; k++) if (f[k] < ideal[k]) ideal[k] = f[k];
    const T = F.map(f => f.map((v, k) => v - ideal[k]));
    // Puntos extremos: el que minimiza la función de logro (ASF) con peso casi total en un eje
    const extremos = [];
    for (let j = 0; j < m; j++) {
      let mejor = 0, valor = Infinity;
      T.forEach((f, i) => { let a = -Infinity; for (let k = 0; k < m; k++) { const x = f[k] / (k === j ? 1 : 1e-6); if (x > a) a = x; } if (a < valor) { valor = a; mejor = i; } });
      extremos.push(T[mejor]);
    }
    const peor = new Array(m).fill(0);
    for (const f of T) for (let k = 0; k < m; k++) if (f[k] > peor[k]) peor[k] = f[k];
    let interceptos = null;
    const plano = resolver(extremos, new Array(m).fill(1));
    if (plano && plano.every(a => a > 1e-12)) interceptos = plano.map(a => 1 / a);
    // Respaldo cuando el hiperplano degenera: el peor valor observado en cada objetivo
    if (!interceptos || interceptos.some((v, k) => !(v > 1e-12) || v > peor[k] * 1e6)) interceptos = peor.slice();
    return T.map(f => f.map((v, k) => (interceptos[k] > 1e-12 ? v / interceptos[k] : 0)));
  }

  /** Asocia un punto normalizado con la dirección de referencia más cercana. Devuelve {ref, d} (distancia perpendicular). */
  function asociar(f, refs) {
    let ref = 0, d = Infinity;
    for (let j = 0; j < refs.length; j++) {
      const r = refs[j]; let fr = 0, rr = 0;
      for (let k = 0; k < f.length; k++) { fr += f[k] * r[k]; rr += r[k] * r[k]; }
      const t = rr > 0 ? fr / rr : 0; let s = 0;
      for (let k = 0; k < f.length; k++) { const x = f[k] - t * r[k]; s += x * x; }
      if (s < d) { d = s; ref = j; }
    }
    return { ref, d: Math.sqrt(d) };
  }

  /** NSGA-III genérico sobre carteras. p = {n, tope, evaluar(w) → [3 objetivos], refs?, pob?, gens?, semilla?, alGeneracion?} */
  function nsga3(p) {
    const refs = p.refs || dasDennis(3, 12), rng = p.rng || P.crearPRNG(p.semilla), n = p.n, tope = p.tope, gens = p.gens || 150;
    const pob = p.pob || (Math.ceil(refs.length / 4) * 4 + (refs.length % 4 === 0 ? 4 : 0)); // 91 referencias → 92 individuos
    const crear = x => ({ x, f: p.evaluar(x) });
    let P0 = Array.from({ length: pob }, () => crear(N2.individuoAzar(n, tope, rng)));
    for (let g = 0; g < gens; g++) {
      const hijos = [];
      while (hijos.length < pob) {
        const a = P0[rng.entero(pob)].x, b = P0[rng.entero(pob)].x; // en NSGA-III los padres se eligen al azar
        const [h1, h2] = N2.cruceSBX(a, b, tope, rng);
        hijos.push(crear(S.proyectarConTope(N2.mutar(h1, tope, rng), tope)));
        if (hijos.length < pob) hijos.push(crear(S.proyectarConTope(N2.mutar(h2, tope, rng), tope)));
      }
      const union = P0.concat(hijos), frentes = N2.ordenNoDominado(union.map(i => i.f));
      const elegidos = []; let ultimo = null;
      for (const fr of frentes) { if (elegidos.length + fr.length <= pob) fr.forEach(ix => elegidos.push(ix)); else { ultimo = fr; break; } }
      if (ultimo && elegidos.length < pob) {
        const St = elegidos.concat(ultimo), norm = normalizar(St.map(ix => union[ix].f));
        const asoc = norm.map(f => asociar(f, refs)), nicho = new Array(refs.length).fill(0);
        for (let i = 0; i < elegidos.length; i++) nicho[asoc[i].ref]++;
        let candidatos = ultimo.map((ix, j) => ({ ix, ref: asoc[elegidos.length + j].ref, d: asoc[elegidos.length + j].d }));
        const activas = new Set(refs.map((r, j) => j));
        while (elegidos.length < pob && candidatos.length) {
          let min = Infinity; for (const j of activas) if (nicho[j] < min) min = nicho[j];
          const empate = []; for (const j of activas) if (nicho[j] === min) empate.push(j);
          const j = empate[rng.entero(empate.length)], suyos = candidatos.filter(c => c.ref === j);
          if (!suyos.length) { activas.delete(j); if (!activas.size) break; continue; }
          const pick = nicho[j] === 0 ? suyos.reduce((a, b) => (b.d < a.d ? b : a)) : suyos[rng.entero(suyos.length)];
          elegidos.push(pick.ix); nicho[j]++;
          candidatos = candidatos.filter(c => c !== pick);
        }
        // Si las referencias activas se agotaron, se completa con los candidatos restantes
        for (const c of candidatos) { if (elegidos.length >= pob) break; elegidos.push(c.ix); }
      }
      P0 = elegidos.map(ix => union[ix]);
      if (p.alGeneracion) p.alGeneracion(g + 1, gens);
    }
    const primero = N2.ordenNoDominado(P0.map(i => i.f))[0];
    return { poblacion: P0, frente: primero.map(ix => P0[ix]), referencias: refs.length };
  }

  /** Frente NSGA-III de carteras con el esquema de 07.nsga3_elegibles (ids N3-01…).
      p = {mu, cov, tope, tickers, retornosDiarios? (T×N), rf?, semilla?, pob?, gens?, puntos? = 60, alProgresar?}
      Con retornosDiarios el tercer objetivo es el CVaR 95 % histórico; sin ellos, el de una normal. */
  function frenteCarteras3(p) {
    const M = dep("markowitz"), R = p.retornosDiarios;
    const cvarDe = w => (R ? E.cvar(R.map(f => E.punto(f, w)), 0.95) : E.cvarNormalDiario(E.retornoCartera(w, p.mu), E.volCartera(w, p.cov)));
    const r = nsga3({
      n: p.mu.length, tope: p.tope, pob: p.pob, gens: p.gens, semilla: p.semilla,
      evaluar: w => [-E.retornoCartera(w, p.mu), E.volCartera(w, p.cov), cvarDe(w)],
      alGeneracion: p.alProgresar ? (g, G) => p.alProgresar(g / G) : null
    });
    const orden = r.frente.slice().sort((a, b) => a.f[1] - b.f[1]);
    return N2.repartir(orden, p.puntos || 60).map((ind, i) => Object.assign(M.aPunto(ind.x, p), { id: "N3-" + String(i + 1).padStart(2, "0") }));
  }

  const api = { dasDennis, resolver, normalizar, asociar, nsga3, frenteCarteras3 };
  L.nsga3 = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
