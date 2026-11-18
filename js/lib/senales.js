/* js/lib/senales.js — matemática de las modalidades de cámara (PLAN_MAESTRO §9.5 y §9.6), sin DOM ni MediaPipe:
   filtro One Euro, calibración afín, detectores con histéresis y medidas sobre los landmarks de la cara y la mano.
   Lógica pura. Formato dual: EIALib.senales y module.exports. Se prueba en Node (tests/unit/lib.senales.test.mjs). */
(function (global) {
  "use strict";
  const L = global.EIALib = global.EIALib || {};
  const GRADOS = 180 / Math.PI;

  /** Filtro One Euro (Casiez et al., 2012): suaviza el temblor cuando el puntero va lento y no retrasa cuando va rápido. */
  function filtroOneEuro(op) {
    const o = Object.assign({ minCutoff: 1.0, beta: 0.007, dCutoff: 1.0 }, op);
    let xPrev = null, dxPrev = 0, tPrev = null;
    const alfa = (corte, dt) => { const tau = 1 / (2 * Math.PI * corte); return 1 / (1 + tau / dt); };
    return {
      /** x: valor crudo; tMs: marca de tiempo en milisegundos. */
      filtrar(x, tMs) {
        if (xPrev === null || tMs <= tPrev) { xPrev = x; tPrev = tMs; return x; }
        const dt = (tMs - tPrev) / 1000, dx = (x - xPrev) / dt;
        const aD = alfa(o.dCutoff, dt), dxS = aD * dx + (1 - aD) * dxPrev;
        const a = alfa(o.minCutoff + o.beta * Math.abs(dxS), dt), xS = a * x + (1 - a) * xPrev;
        xPrev = xS; dxPrev = dxS; tPrev = tMs;
        return xS;
      },
      reiniciar() { xPrev = null; dxPrev = 0; tPrev = null; }
    };
  }

  /** Ajuste afín por mínimos cuadrados: (u, v) → (x, y). muestras = [{u, v, x, y}] (≥ 3 no alineadas).
      Devuelve {aplicar(u, v) → {x, y}} o null si el sistema es singular. Es la calibración de 5 puntos. */
  function ajusteAfin(muestras) {
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bx = [0, 0, 0], by = [0, 0, 0];
    for (const m of muestras) {
      const f = [m.u, m.v, 1];
      for (let i = 0; i < 3; i++) { bx[i] += f[i] * m.x; by[i] += f[i] * m.y; for (let j = 0; j < 3; j++) A[i][j] += f[i] * f[j]; }
    }
    const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
    if (Math.abs(det) < 1e-12) return null;
    const resolver = b => {
      const d = k => { const M = A.map((f, i) => f.map((v, j) => (j === k ? b[i] : v))); return M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]); };
      return [d(0) / det, d(1) / det, d(2) / det];
    };
    const cx = resolver(bx), cy = resolver(by);
    return { cx, cy, aplicar: (u, v) => ({ x: cx[0] * u + cx[1] * v + cx[2], y: cy[0] * u + cy[1] * v + cy[2] }) };
  }

  /** Detector de gesto sostenido con histéresis: dispara UNA vez cuando el valor supera `on` durante minMs
      (y, si se da maxMs, no más que eso), y se rearma cuando baja de `off`. Ignora los parpadeos naturales (cortos). */
  function detectorSostenido(op) {
    const o = Object.assign({ on: 0.5, off: 0.3, minMs: 400, maxMs: Infinity }, op);
    let desde = null, disparado = false;
    return {
      paso(valor, tMs) {
        if (valor >= o.on) {
          if (desde === null) { desde = tMs; disparado = false; }
          const dur = tMs - desde;
          if (!disparado && dur >= o.minMs && dur <= o.maxMs) { disparado = true; return true; }
        } else if (valor <= o.off) { desde = null; disparado = false; }
        return false;
      },
      reiniciar() { desde = null; disparado = false; },
      /** Fracción (0–1) del tiempo sostenido mientras el gesto está en curso y aún no disparó. */
      progreso: tMs => (desde === null || disparado ? 0 : Math.max(0, Math.min(1, (tMs - desde) / o.minMs)))
    };
  }

  /** Detector de pellizco: «inicio» cuando la razón baja de `on`, «fin» cuando vuelve a subir de `off`. */
  function detectorPellizco(op) {
    const o = Object.assign({ on: 0.35, off: 0.5 }, op);
    let cerrado = false;
    return {
      paso(razon) {
        if (!cerrado && razon < o.on) { cerrado = true; return "inicio"; }
        if (cerrado && razon > o.off) { cerrado = false; return "fin"; }
        return null;
      },
      cerrado: () => cerrado
    };
  }

  /** Giro (yaw) e inclinación (pitch) de la cabeza, en grados, desde la matriz de transformación facial 4×4 de MediaPipe
      (16 valores en orden por columnas). yaw > 0: la nariz apunta hacia +X de la cámara; pitch > 0: hacia arriba. */
  function anguloCabeza(m) {
    return { yaw: Math.atan2(m[8], m[10]) * GRADOS, pitch: Math.asin(Math.max(-1, Math.min(1, -m[9]))) * GRADOS };
  }
  /** Inversa de anguloCabeza: matriz 4×4 (por columnas) de una cabeza con ese giro e inclinación. Sirve al guion simulado. */
  function matrizCabeza(yaw, pitch) {
    const y = yaw / GRADOS, p = pitch / GRADOS, cy = Math.cos(y), sy = Math.sin(y), cp = Math.cos(p), sp = Math.sin(p);
    // Columnas: eje X, eje Y, eje Z (hacia donde mira la nariz) y traslación
    return [cy, 0, -sy, 0, -sy * sp, cp, -cy * sp, 0, sy * cp, -sp, cy * cp, 0, 0, 0, 0, 1];
  }

  const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  /** Razón de pellizco de una mano (21 landmarks): distancia pulgar–índice entre el tamaño de la palma. */
  function razonPellizco(lm) { const palma = distancia(lm[0], lm[9]); return palma > 1e-9 ? distancia(lm[4], lm[8]) / palma : 1; }
  /** ¿Palma abierta? Las cuatro puntas (8, 12, 16, 20) están más lejos de la muñeca que sus nudillos medios (6, 10, 14, 18). */
  function palmaAbierta(lm) {
    const pares = [[8, 6], [12, 10], [16, 14], [20, 18]];
    return pares.every(([punta, nudillo]) => distancia(lm[punta], lm[0]) > 1.15 * distancia(lm[nudillo], lm[0])) && razonPellizco(lm) > 0.6;
  }
  /** ¿Puño cerrado? Las cuatro puntas (8, 12, 16, 20) quedan más cerca de la muñeca que sus nudillos medios (6, 10, 14, 18).
      Es el gesto de pausa: no se confunde con señalar (índice extendido), con la mano abierta ni con el pellizco. */
  function punoCerrado(lm) {
    const pares = [[8, 6], [12, 10], [16, 14], [20, 18]];
    return pares.every(([punta, nudillo]) => distancia(lm[punta], lm[0]) < distancia(lm[nudillo], lm[0]));
  }
  /** ¿«V» con dos dedos? Índice y medio extendidos, anular y meñique doblados. Es el gesto de desplazar la página (T-28);
      no se confunde con el puño (dos dedos están extendidos) ni con la mano abierta (anular y meñique doblados). */
  function dosDedos(lm) {
    const extendido = (p, n) => distancia(lm[p], lm[0]) > 1.15 * distancia(lm[n], lm[0]);
    const doblado = (p, n) => distancia(lm[p], lm[0]) < distancia(lm[n], lm[0]);
    return extendido(8, 6) && extendido(12, 10) && doblado(16, 14) && doblado(20, 18);
  }

  /* Calibración de 5 puntos de la cabeza (PLAN_MAESTRO §9.5): se mira el centro y las cuatro esquinas, y un ajuste afín
     por mínimos cuadrados lleva (giro, inclinación) respecto del centro a un punto de la pantalla. */
  const PUNTOS_CALIBRACION = [[0.5, 0.5], [0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]];
  const GIRO_MINIMO = 4, INCLINACION_MINIMA = 3; // grados: con menos, la persona casi no movió la cabeza y el ajuste no sirve
  /** muestras = [{dy, dp, u, v}] → {cx, cy} (coeficientes que se guardan en JSON) o null si no sirven. */
  function calibracionCabeza(muestras) {
    if (!muestras || muestras.length < 3) return null;
    const rango = k => Math.max.apply(null, muestras.map(m => m[k])) - Math.min.apply(null, muestras.map(m => m[k]));
    if (rango("dy") < GIRO_MINIMO || rango("dp") < INCLINACION_MINIMA) return null;
    const a = ajusteAfin(muestras.map(m => ({ u: m.dy, v: m.dp, x: m.u, y: m.v })));
    return a ? { cx: a.cx, cy: a.cy } : null;
  }
  /** Aplica una calibración guardada: (giro, inclinación) respecto del centro → punto de la pantalla (0–1, recortado). */
  function aplicarCalibracion(cal, dy, dp) {
    const lim = v => Math.max(0, Math.min(1, v));
    return { u: lim(cal.cx[0] * dy + cal.cx[1] * dp + cal.cx[2]), v: lim(cal.cy[0] * dy + cal.cy[1] * dp + cal.cy[2]) };
  }

  /** Punto de la mano que mueve el puntero: el medio de los nudillos del índice y del medio (landmarks 5 y 9).
      Casi no se mueve al pellizcar, a diferencia de la punta del índice. */
  function puntoMano(lm) { return { x: (lm[5].x + lm[9].x) / 2, y: (lm[5].y + lm[9].y) / 2 }; }

  /** Lleva un punto de la imagen (0–1) dentro de la «caja activa» central a 0–1 de pantalla, en espejo (como un espejo real). */
  function mapaCaja(x, y, margen) {
    const g = margen == null ? 0.2 : margen, lado = 1 - 2 * g, lim = v => Math.max(0, Math.min(1, v));
    return { u: lim(1 - (x - g) / lado), v: lim((y - g) / lado) };
  }

  const api = { filtroOneEuro, ajusteAfin, detectorSostenido, detectorPellizco, anguloCabeza, matrizCabeza, razonPellizco, palmaAbierta, punoCerrado, puntoMano, mapaCaja, distancia,
    dosDedos, calibracionCabeza, aplicarCalibracion, PUNTOS_CALIBRACION, GIRO_MINIMO, INCLINACION_MINIMA };
  L.senales = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
