/* js/a11y/cabeza-mirada.js — puntero con la cabeza (PLAN_MAESTRO §9.5) sobre MediaPipe Face Landmarker.
   La orientación de la cabeza (giro e inclinación) mueve el puntero; el clic es por permanencia (la hace puntero.js),
   por parpadeo largo o por boca abierta. Versión funcional mínima: usa ganancias por defecto y «Recentrar»;
   la calibración de 5 puntos con interfaz y el ajuste fino con el iris llegan en T-28 (senales.ajusteAfin ya existe).
   NO VERIFICADO CON CÁMARA REAL por una IA: el signo de los ejes debe confirmarlo una persona (hay «Invertir» en el panel).
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
  let neutro = null;
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
    /** res: resultado de detectForVideo; t: ms; cfg: {clic: "permanencia" | "parpadeo" | "boca", invertirX, invertirY, rango (grados)} */
    procesar(res, t, cfg) {
      const m = res && res.facialTransformationMatrixes && res.facialTransformationMatrixes[0];
      estado.detectado = !!m;
      if (!m) return;
      const a = Sen.anguloCabeza(m.data);
      if (!neutro) neutro = a; // la primera pose (o la de «Recentrar») es el centro de la pantalla
      // En espejo: girar la cabeza hacia la derecha del usuario lleva el puntero a la derecha
      const sx = cfg && cfg.invertirX ? 1 : -1, sy = cfg && cfg.invertirY ? 1 : -1;
      const giro = (cfg && cfg.rango) || RANGO_GIRO, inclinacion = giro * PROPORCION_INCLINACION;
      const u = 0.5 + sx * (a.yaw - neutro.yaw) / (2 * giro), v = 0.5 + sy * (a.pitch - neutro.pitch) / (2 * inclinacion);
      EIA.bus.emitir("MOVER_PUNTERO", { x: fx.filtrar(u * global.innerWidth, t), y: fy.filtrar(v * global.innerHeight, t) });
      const clic = cfg && cfg.clic;
      if (clic === "parpadeo" && parpadeo.paso(Math.min(puntaje(res, "eyeBlinkLeft"), puntaje(res, "eyeBlinkRight")), t)) EIA.bus.emitir("ACTIVAR");
      else if (clic === "boca" && boca.paso(puntaje(res, "jawOpen"), t)) EIA.bus.emitir("ACTIVAR");
    },
    recentrar() { neutro = null; fx.reiniciar(); fy.reiniciar(); },
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
