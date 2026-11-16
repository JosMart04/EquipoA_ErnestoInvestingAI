/* Sonificación básica (PLAN_MAESTRO §9.2): convierte una serie en tonos.
   Valor → frecuencia (220–880 Hz, escala logarítmica); tiempo → paneo de izquierda a derecha.
   Se carga bajo demanda desde EIA.ui.grafico. La exploración punto a punto llega en T-27. */
(function (global) {
  "use strict";
  const EIA = global.EIA;
  const F_MIN = 220, F_MAX = 880, DURACION_S = 4;
  let contexto = null;

  /** Frecuencia de un valor dentro de [min, max]. Función pura. */
  function frecuencia(v, min, max) {
    const u = max > min ? (v - min) / (max - min) : 0.5;
    return F_MIN * Math.pow(F_MAX / F_MIN, Math.max(0, Math.min(1, u)));
  }

  /** Reproduce la serie. Devuelve {detener()}. op.alTerminar se llama al acabar o al detener. */
  EIA.sonar = function (valores, op) {
    const o = op || {};
    const serie = (valores || []).filter(v => Number.isFinite(v));
    const Ctx = global.AudioContext || global.webkitAudioContext;
    if (!Ctx || serie.length === 0) { if (o.alTerminar) o.alTerminar(); return { detener() {} }; }
    contexto = contexto || new Ctx();
    if (contexto.state === "suspended") contexto.resume();
    const min = Math.min.apply(null, serie), max = Math.max.apply(null, serie);
    const osc = contexto.createOscillator(), gan = contexto.createGain();
    const pan = contexto.createStereoPanner ? contexto.createStereoPanner() : null;
    const t0 = contexto.currentTime + 0.05, paso = DURACION_S / serie.length;
    osc.type = "sine";
    serie.forEach((v, i) => {
      osc.frequency.setValueAtTime(frecuencia(v, min, max), t0 + i * paso);
      if (pan) pan.pan.setValueAtTime(serie.length > 1 ? -1 + 2 * i / (serie.length - 1) : 0, t0 + i * paso);
    });
    gan.gain.setValueAtTime(0.0001, t0);
    gan.gain.exponentialRampToValueAtTime(0.15, t0 + 0.05);
    gan.gain.setValueAtTime(0.15, t0 + DURACION_S - 0.1);
    gan.gain.exponentialRampToValueAtTime(0.0001, t0 + DURACION_S);
    osc.connect(gan);
    if (pan) { gan.connect(pan); pan.connect(contexto.destination); } else gan.connect(contexto.destination);
    let terminado = false;
    const fin = () => { if (terminado) return; terminado = true; if (o.alTerminar) o.alTerminar(); };
    osc.onended = fin;
    osc.start(t0); osc.stop(t0 + DURACION_S + 0.05);
    return { detener() { try { osc.stop(); } catch (e) { /* ya detenido */ } fin(); } };
  };
  EIA.sonar.frecuencia = frecuencia;
})(typeof window !== "undefined" ? window : globalThis);
