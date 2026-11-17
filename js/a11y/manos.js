/* js/a11y/manos.js — gestos de mano (PLAN_MAESTRO §9.6) sobre MediaPipe Hand Landmarker.
   · Puntero: el medio de los nudillos del índice y del medio (no la punta del índice, que se mueve al pellizcar).
   · Clic: pellizco (pulgar + índice). Mientras el pellizco se cierra, el puntero se congela para que el clic caiga
     donde estaba.
   · Pausa / reanudar: puño cerrado sostenido 1,5 s (D-22). Antes era «palma abierta 1 s», pero mover el puntero con la
     mano abierta —lo natural— pausaba el control al segundo y el puntero se quedaba quieto.
   Deslizar para cambiar de módulo, dos dedos y pulgar arriba llegan en T-28.
   Requiere js/lib/senales.js y bus-entrada.js. Lo carga camara.js. */
(function (global) {
  "use strict";
  const EIA = global.EIA, Sen = global.EIALib.senales;
  if (EIA.manos) return;

  const MARGEN_CAJA = 0.2;      // la «caja activa» es el 60 % central de la imagen: no hay que estirar el brazo
  const CONGELAR_BAJO = 0.5;    // razón de pellizco por debajo de la cual el puntero deja de moverse
  const fx = Sen.filtroOneEuro({ minCutoff: 1.2, beta: 0.01 }), fy = Sen.filtroOneEuro({ minCutoff: 1.2, beta: 0.01 });
  const pellizco = Sen.detectorPellizco({ on: 0.35, off: CONGELAR_BAJO });
  const puno = Sen.detectorSostenido({ on: 0.5, off: 0.5, minMs: 1500 });
  const estado = { detectado: false, aviso: null };

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
      if (!lm) { puno.reiniciar(); estado.aviso = null; return; }
      // El puño debe poder REANUDAR, así que se evalúa aunque el bus esté en pausa
      const cerrado = Sen.punoCerrado(lm);
      if (puno.paso(cerrado ? 1 : 0, t)) { EIA.bus.alternarPausa(); estado.aviso = null; return; }
      estado.aviso = cerrado && puno.progreso(t) > 0 ? (EIA.bus.pausado() ? "a11y.cam_puno_reanudar" : "a11y.cam_puno_pausar") : null;
      if (cerrado) return; // con el puño cerrado no se mueve el puntero ni se hace clic
      const razon = Sen.razonPellizco(lm);
      if (razon >= CONGELAR_BAJO && !pellizco.cerrado()) {
        const pt = Sen.puntoMano(lm), p = Sen.mapaCaja(pt.x, pt.y, MARGEN_CAJA);
        EIA.bus.emitir("MOVER_PUNTERO", { x: fx.filtrar(p.u * global.innerWidth, t), y: fy.filtrar(p.v * global.innerHeight, t) });
      }
      if (pellizco.paso(razon) === "inicio") EIA.bus.emitir("ACTIVAR");
    },
    recentrar() { fx.reiniciar(); fy.reiniciar(); },
    /** Resultado sintético para el guion simulado y las pruebas: los nudillos en (u, v) de la pantalla.
        p = {u, v, pellizco, palma, puno} */
    sintetico(p) {
      const lado = 1 - 2 * MARGEN_CAJA, ix = MARGEN_CAJA + (1 - p.u) * lado, iy = MARGEN_CAJA + p.v * lado;
      const lm = Array.from({ length: 21 }, () => ({ x: ix, y: iy, z: 0 }));
      const pon = (i, dx, dy) => { lm[i] = { x: ix + dx, y: iy + dy, z: 0 }; };
      pon(0, 0, 0.16);                                   // muñeca: palma de 0,16
      pon(5, -0.02, 0); pon(9, 0.02, 0);                 // nudillos del índice y del medio: su punto medio es (ix, iy)
      pon(13, 0.05, 0.01); pon(17, 0.08, 0.02);
      // Índice extendido salvo con el puño
      pon(6, -0.02, -0.05); pon(8, -0.02, p.puno ? 0.04 : -0.10);
      // Medio, anular y meñique: extendidos con la palma abierta, doblados en otro caso
      for (const [punta, nudillo, dx] of [[12, 10, 0.02], [16, 14, 0.05], [20, 18, 0.08]]) { pon(nudillo, dx, -0.05); pon(punta, dx, p.palma ? -0.10 : 0.04); }
      // Pulgar: junto a la punta del índice si hay pellizco
      if (p.pellizco) lm[4] = { x: lm[8].x + 0.01, y: lm[8].y + 0.01, z: 0 }; else pon(4, -0.12, 0.02);
      return { landmarks: [lm] };
    },
    centroSintetico: { u: 0.5, v: 0.5 }
  };
})(window);
