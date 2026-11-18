/* js/a11y/cabeza-mirada.js — puntero con la cabeza (PLAN_MAESTRO §9.5) sobre MediaPipe Face Landmarker.
   La orientación de la cabeza (giro e inclinación) mueve el puntero; el clic es por permanencia (la hace puntero.js),
   por parpadeo largo o por boca abierta. Sin calibrar usa ganancias por defecto («Recorrido de la cabeza» e «Invertir»);
   con la calibración de 5 puntos (T-28, la interfaz está en camara.js) usa el ajuste afín guardado en eia_a11y.
   Josué lo probó con la webcam de su laptop el 17-nov: funciona. El ajuste fino con el iris no se hizo.
   El guion simulado usa el rango por defecto (18°).
   Requiere js/lib/senales.js y bus-entrada.js. Lo carga camara.js. */
(function (global) {
  "use strict";
  const EIA = global.EIA, Sen = global.EIALib.senales;
  if (EIA.cabezaMirada) return;

  const RANGO_GIRO = 18, PROPORCION_INCLINACION = 2 / 3; // grados de giro que recorren media pantalla (ajustable en el Centro)
  const fx = Sen.filtroOneEuro({ minCutoff: 1.0, beta: 0.007 }), fy = Sen.filtroOneEuro({ minCutoff: 1.0, beta: 0.007 });
  // Parpadeo largo: ≥ 400 ms (los naturales duran menos de 250 ms). Boca abierta: ≥ 300 ms.
  const parpadeo = Sen.detectorSostenido({ on: 0.5, off: 0.3, minMs: 400, maxMs: 2000 });
  const boca = Sen.detectorSostenido({ on: 0.5, off: 0.3, minMs: 300, maxMs: 3000 });
  let neutro = null, ultimo = null, calibrando = false;
  const estado = { detectado: false };

  const puntaje = (res, nombre) => {
    const cs = res.faceBlendshapes && res.faceBlendshapes[0] && res.faceBlendshapes[0].categories;
    const c = cs && cs.find(k => k.categoryName === nombre);
    return c ? c.score : 0;
  };

  EIA.cabezaMirada = {
    estado,
    crearDetector(vision, fileset, delegado) {
      return vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "assets/mediapipe/face_landmarker.task", delegate: delegado },
        runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true
      });
    },
    /** res: resultado de detectForVideo; t: ms; cfg: {clic: "permanencia" | "parpadeo" | "boca", invertirX, invertirY, rango (grados), calibracion} */
    procesar(res, t, cfg) {
      const m = res && res.facialTransformationMatrixes && res.facialTransformationMatrixes[0];
      estado.detectado = !!m;
      if (!m) return;
      const a = Sen.anguloCabeza(m.data);
      if (!neutro) neutro = a; // la primera pose (o la de «Recentrar») es el centro de la pantalla
      ultimo = { dy: a.yaw - neutro.yaw, dp: a.pitch - neutro.pitch, t };
      if (calibrando) return; // mientras se calibra, el puntero no se mueve ni hace clic (la capa toma las muestras)
      // En espejo: girar la cabeza hacia la derecha del usuario lleva el puntero a la derecha
      const sx = cfg && cfg.invertirX ? 1 : -1, sy = cfg && cfg.invertirY ? 1 : -1;
      const giro = (cfg && cfg.rango) || RANGO_GIRO, inclinacion = giro * PROPORCION_INCLINACION;
      const cal = cfg && cfg.calibracion, pc = cal ? Sen.aplicarCalibracion(cal, ultimo.dy, ultimo.dp) : null;
      const u = pc ? pc.u : 0.5 + sx * ultimo.dy / (2 * giro), v = pc ? pc.v : 0.5 + sy * ultimo.dp / (2 * inclinacion);
      EIA.bus.emitir("MOVER_PUNTERO", { x: fx.filtrar(u * global.innerWidth, t), y: fy.filtrar(v * global.innerHeight, t) });
      const clic = cfg && cfg.clic;
      if (clic === "parpadeo" && parpadeo.paso(Math.min(puntaje(res, "eyeBlinkLeft"), puntaje(res, "eyeBlinkRight")), t)) EIA.bus.emitir("ACTIVAR");
      else if (clic === "boca" && boca.paso(puntaje(res, "jawOpen"), t)) EIA.bus.emitir("ACTIVAR");
    },
    recentrar() { neutro = null; fx.reiniciar(); fy.reiniciar(); },
    /** Última pose respecto del centro: {dy, dp, t} en grados (la usa la calibración). */
    muestra() { return ultimo; },
    calibrando(activo) { calibrando = !!activo; if (!activo) { fx.reiniciar(); fy.reiniciar(); } },
    /** Resultado sintético para el guion simulado: la cabeza apunta a (u, v) de la pantalla (0–1). */
    sintetico(p) {
      const yaw = -(p.u - 0.5) * 2 * RANGO_GIRO, pitch = -(p.v - 0.5) * 2 * RANGO_GIRO * PROPORCION_INCLINACION;
      const cat = (n, s) => ({ categoryName: n, score: s });
      return {
        facialTransformationMatrixes: [{ rows: 4, columns: 4, data: Sen.matrizCabeza(yaw, pitch) }],
        faceBlendshapes: [{ categories: [cat("eyeBlinkLeft", p.parpadeo ? 0.9 : 0.05), cat("eyeBlinkRight", p.parpadeo ? 0.9 : 0.05), cat("jawOpen", p.boca ? 0.9 : 0.02)] }]
      };
    },
    /** El guion simulado empieza mirando al centro: así el neutro es (0, 0). */
    centroSintetico: { u: 0.5, v: 0.5 }
  };
})(window);
