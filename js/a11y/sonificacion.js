/* Sonificación (PLAN_MAESTRO §9.2): convierte datos en sonido con Web Audio.
   - Serie completa: valor → frecuencia (220–880 Hz, escala logarítmica); tiempo → paneo de izquierda a derecha.
   - Exploración punto a punto: un tono corto por punto (EIA.tono), que usa EIA.ui.grafico con ←/→.
   - Direcciones (mapa de calor de Clasificación): un tono ascendente para SUBE y uno descendente para BAJA.
   Se carga bajo demanda la primera vez que se pide un sonido. Formato dual: las funciones puras se prueban en Node. */
(function (global) {
  "use strict";
  const F_MIN = 220, F_MAX = 880, DURACION_S = 4, VOLUMEN = 0.15;
  let contexto = null;

  /** Frecuencia de un valor dentro de [min, max]. Función pura. */
  function frecuencia(v, min, max) {
    const u = max > min ? (v - min) / (max - min) : 0.5;
    return F_MIN * Math.pow(F_MAX / F_MIN, Math.max(0, Math.min(1, u)));
  }
  /** Paneo del punto i de n: −1 (izquierda) a 1 (derecha). Función pura. */
  function paneo(i, n) { return n > 1 ? -1 + 2 * i / (n - 1) : 0; }
  /** Frecuencias de inicio y fin de un glisando: SUBE asciende una quinta y BAJA desciende lo mismo. Función pura. */
  function glisando(sube) { return sube ? [330, 495] : [495, 330]; }

  function audio() {
    const Ctx = global.AudioContext || global.webkitAudioContext;
    if (!Ctx) return null;
    contexto = contexto || new Ctx();
    if (contexto.state === "suspended") contexto.resume();
    return contexto;
  }
  /** Conecta oscilador → ganancia → paneo → salida. Devuelve los nodos. */
  function cadena(ctx) {
    const osc = ctx.createOscillator(), gan = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = "sine";
    osc.connect(gan);
    if (pan) { gan.connect(pan); pan.connect(ctx.destination); } else gan.connect(ctx.destination);
    return { osc, gan, pan };
  }
  /** Envolvente sin chasquidos entre t0 y t1. */
  function envolvente(gan, t0, t1) {
    gan.gain.setValueAtTime(0.0001, t0);
    gan.gain.exponentialRampToValueAtTime(VOLUMEN, t0 + 0.02);
    gan.gain.setValueAtTime(VOLUMEN, Math.max(t0 + 0.02, t1 - 0.04));
    gan.gain.exponentialRampToValueAtTime(0.0001, t1);
  }

  const EIA = global.EIA;
  if (EIA) {
    /** Reproduce la serie. Devuelve {detener()}. op.alTerminar se llama al acabar o al detener. */
    EIA.sonar = function (valores, op) {
      const o = op || {};
      const serie = (valores || []).filter(v => Number.isFinite(v));
      const ctx = audio();
      if (!ctx || serie.length === 0) { if (o.alTerminar) o.alTerminar(); return { detener() {} }; }
      const min = Math.min.apply(null, serie), max = Math.max.apply(null, serie);
      const { osc, gan, pan } = cadena(ctx);
      const t0 = ctx.currentTime + 0.05, paso = DURACION_S / serie.length;
      serie.forEach((v, i) => {
        osc.frequency.setValueAtTime(frecuencia(v, min, max), t0 + i * paso);
        if (pan) pan.pan.setValueAtTime(paneo(i, serie.length), t0 + i * paso);
      });
      envolvente(gan, t0, t0 + DURACION_S);
      let terminado = false;
      const fin = () => { if (terminado) return; terminado = true; if (o.alTerminar) o.alTerminar(); };
      osc.onended = fin;
      osc.start(t0); osc.stop(t0 + DURACION_S + 0.05);
      return { detener() { try { osc.stop(); } catch (e) { /* ya detenido */ } fin(); } };
    };
    /** Un tono corto (0,12 s) para un punto: v dentro de [min, max]; op.pan en [−1, 1]. */
    EIA.tono = function (v, min, max, op) {
      const ctx = audio(); if (!ctx || !Number.isFinite(v)) return;
      const { osc, gan, pan } = cadena(ctx), t0 = ctx.currentTime + 0.01, t1 = t0 + 0.12;
      osc.frequency.setValueAtTime(frecuencia(v, min, max), t0);
      if (pan) pan.pan.setValueAtTime(op && Number.isFinite(op.pan) ? op.pan : 0, t0);
      envolvente(gan, t0, t1);
      osc.start(t0); osc.stop(t1 + 0.02);
    };
    /** Secuencia de direcciones (true = SUBE, false = BAJA), una cada 0,25 s, de izquierda a derecha. Devuelve {detener()}. */
    EIA.sonarDirecciones = function (lista, op) {
      const o = op || {}, ctx = audio(), dirs = (lista || []).filter(x => typeof x === "boolean");
      if (!ctx || !dirs.length) { if (o.alTerminar) o.alTerminar(); return { detener() {} }; }
      const paso = 0.25, t0 = ctx.currentTime + 0.05, nodos = [];
      dirs.forEach((sube, i) => {
        const { osc, gan, pan } = cadena(ctx), ti = t0 + i * paso, [fa, fb] = glisando(sube);
        osc.frequency.setValueAtTime(fa, ti);
        osc.frequency.exponentialRampToValueAtTime(fb, ti + 0.18);
        if (pan) pan.pan.setValueAtTime(paneo(i, dirs.length), ti);
        envolvente(gan, ti, ti + 0.2);
        osc.start(ti); osc.stop(ti + 0.22);
        nodos.push(osc);
      });
      let terminado = false;
      const fin = () => { if (terminado) return; terminado = true; if (o.alTerminar) o.alTerminar(); };
      nodos[nodos.length - 1].onended = fin;
      return { detener() { nodos.forEach(n => { try { n.stop(); } catch (e) { /* ya detenido */ } }); fin(); } };
    };
    EIA.sonar.frecuencia = frecuencia;
  }

  const api = { frecuencia, paneo, glisando, F_MIN, F_MAX };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
