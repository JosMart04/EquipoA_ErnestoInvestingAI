/* js/a11y/manos.js — gestos de mano (PLAN_MAESTRO §9.6) sobre MediaPipe Hand Landmarker.
   Versión funcional mínima: la punta del índice mueve el puntero, el pellizco (pulgar + índice) hace clic y la palma
   abierta sostenida 1 s pausa o reanuda. Deslizar, dos dedos y pulgar arriba llegan en T-28.
   NO VERIFICADO CON CÁMARA REAL por una IA. Requiere js/lib/senales.js y bus-entrada.js. Lo carga camara.js. */
(function (global) {
  "use strict";
  const EIA = global.EIA, Sen = global.EIALib.senales;
  if (EIA.manos) return;

  const MARGEN_CAJA = 0.2; // la «caja activa» es el 60 % central de la imagen: no hay que estirar el brazo
  const fx = Sen.filtroOneEuro({ minCutoff: 1.2, beta: 0.01 }), fy = Sen.filtroOneEuro({ minCutoff: 1.2, beta: 0.01 });
  const pellizco = Sen.detectorPellizco({ on: 0.35, off: 0.5 });
  const palma = Sen.detectorSostenido({ on: 0.5, off: 0.5, minMs: 1000 });
  const estado = { detectado: false };

  EIA.manos = {
    estado,
    crearDetector(vision, fileset, delegado) {
      return vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "assets/mediapipe/hand_landmarker.task", delegate: delegado },
        runningMode: "VIDEO", numHands: 1
      });
    },
    procesar(res, t) {
      const lm = res && res.landmarks && res.landmarks[0];
      estado.detectado = !!lm;
      if (!lm) { palma.reiniciar(); return; }
      // La palma abierta debe poder REANUDAR, así que se evalúa aunque el bus esté en pausa
      if (palma.paso(Sen.palmaAbierta(lm) ? 1 : 0, t)) { EIA.bus.alternarPausa(); return; }
      const p = Sen.mapaCaja(lm[8].x, lm[8].y, MARGEN_CAJA);
      EIA.bus.emitir("MOVER_PUNTERO", { x: fx.filtrar(p.u * global.innerWidth, t), y: fy.filtrar(p.v * global.innerHeight, t) });
      if (pellizco.paso(Sen.razonPellizco(lm)) === "inicio") EIA.bus.emitir("ACTIVAR");
    },
    recentrar() { fx.reiniciar(); fy.reiniciar(); },
    /** Resultado sintético para el guion simulado: mano con el índice en (u, v) de la pantalla; pellizco o palma opcionales. */
    sintetico(p) {
      const lado = 1 - 2 * MARGEN_CAJA, ix = MARGEN_CAJA + (1 - p.u) * lado, iy = MARGEN_CAJA + p.v * lado;
      const lm = Array.from({ length: 21 }, () => ({ x: ix, y: iy + 0.2, z: 0 }));
      const pon = (i, dx, dy) => { lm[i] = { x: ix + dx, y: iy + dy, z: 0 }; };
      pon(0, 0, 0.30); pon(9, 0, 0.14);                      // muñeca y base del dedo medio: palma de 0,16
      pon(8, 0, 0); pon(6, 0, p.palma ? 0.10 : 0.06);        // índice
      pon(4, p.pellizco ? 0.01 : 0.12, p.pellizco ? 0.01 : 0.10); // pulgar junto al índice si hay pellizco
      for (const [punta, nudillo] of [[12, 10], [16, 14], [20, 18]]) { pon(punta, 0.02, p.palma ? 0 : 0.18); pon(nudillo, 0.02, 0.10); } // puño salvo palma
      return { landmarks: [lm] };
    },
    centroSintetico: { u: 0.5, v: 0.5 }
  };
})(window);
