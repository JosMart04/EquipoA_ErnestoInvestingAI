/* js/a11y/camara.js — ciclo de vida de la cámara para las modalidades «cabeza» y «manos» (PLAN_MAESTRO §9.5).
   · Consentimiento previo: la imagen se procesa SOLO en el navegador; no se envía ni se guarda.
   · MediaPipe Tasks Vision 1.2.3 se descarga únicamente aquí, al activar la cámara (D-12). GPU con respaldo en CPU.
   · HUD permanente «Cámara activa» con Detener (también Esc), Pausa, Recentrar, Calibrar (solo cabeza, T-28) y Gestos. Se detiene el análisis si la pestaña se oculta
     y un vigilante reanuda el video si se pausa o deja de llegar imagen.
   · El sitio es multipágina: al navegar, la cámara se reanuda sola en la página siguiente (consentimiento de la sesión).
   · Una sola modalidad a la vez.
   · Guion simulado (?camara=simulada&mod=cabeza|manos): alimenta el mismo camino con resultados sintéticos, sin cámara ni
     MediaPipe. Sirve para probar bus → puntero → clic de forma automática.
   Josué lo probó con la webcam de su laptop el 17-nov (cabeza y manos): funciona de forma continua. */
(function (global) {
  "use strict";
  const EIA = global.EIA, $ = global.$;
  if (EIA.camara) return;

  const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3";
  const CLAVE_SESION = "eia_cam", CLAVE_CONSENTIMIENTO = "eia_cam_ok";
  let estado = "apagada", modalidad = null, modulo = null, video = null, flujo = null, detector = null, vision = null, fileset = null;
  const RANGO_POR_DEFECTO = 18, ESPERA_CUADRO_MS = 1500; // grados de giro hasta el borde; espera máxima entre cuadros
  let raf = 0, hud = null, simulada = false, cuadros = 0, cuadrosTotales = 0, tFps = 0, fps = 0, ultimoTiempoVideo = -1;
  let ultimoCuadro = 0, tDeteccion = 0, sinCuadros = false, avisoPrevio = null;

  const t = (k, p) => EIA.t(k, p), esc = EIA.esc;
  const sesion = { get: k => { try { return global.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { if (v == null) global.sessionStorage.removeItem(k); else global.sessionStorage.setItem(k, v); } catch (e) { /* sin sesión */ } } };
  const prefs = () => EIA.estado.get("eia_a11y") || {};

  function consentimiento() {
    return new Promise(resolver => {
      EIA.ui.dialogo({
        titulo: t("a11y.cam_consent_titulo"),
        contenido: `<p>${esc(t("a11y.cam_consent_texto"))}</p><p class="mut">${esc(t("a11y.cam_consent_detener"))}</p>`,
        acciones: [{ texto: t("a11y.cam_consent_no"), valor: "no" }, { texto: t("a11y.cam_consent_si"), valor: "si", primario: true }],
        alCerrar: v => resolver(v === "si")
      }).abrir();
    });
  }

  /* El HUD se crea UNA sola vez y después solo se cambian textos. Nunca se reescribe con innerHTML: el <video> de la
     cámara vive dentro del HUD, y si sale del documento el navegador lo pausa y el seguimiento se congela
     (fue el fallo de la versión anterior: el puntero solo se movía el primer segundo). */
  function crearHUD() {
    hud = document.createElement("div"); hud.id = "eia-hud"; hud.setAttribute("role", "region");
    hud.innerHTML = `<p class="hud-titulo"><span class="hud-punto" aria-hidden="true">●</span> <span class="hud-nombre"></span></p>
<p class="hud-estado" role="status" aria-live="polite"></p>
<div class="hud-vista"></div>
<div class="hud-botones"><button type="button" data-accion="pausa"></button><button type="button" data-accion="recentrar"></button><button type="button" data-accion="calibrar"></button><button type="button" data-accion="ayuda"></button><button type="button" data-accion="detener" class="hud-detener"></button></div>`;
    hud.setAttribute("aria-label", t("a11y.cam_activa"));
    document.body.appendChild(hud);
    hud.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.accion === "detener") detener();
      else if (b.dataset.accion === "pausa") { EIA.bus.alternarPausa(); pintarHUD(); }
      else if (b.dataset.accion === "recentrar" && modulo) { modulo.recentrar(); EIA.ui.anunciar(t("a11y.cam_recentrado")); }
      else if (b.dataset.accion === "calibrar") calibrar();
      else if (b.dataset.accion === "ayuda") ayuda();
    });
  }
  const ponerTexto = (sel, texto) => { const n = hud.querySelector(sel); if (n.textContent !== texto) n.textContent = texto; };
  function pintarHUD(mensaje) {
    if (!hud) crearHUD();
    const pausado = EIA.bus && EIA.bus.pausado(), aviso = modulo && modulo.estado.aviso;
    const linea = mensaje || (estado === "cargando" ? t("a11y.cam_cargando")
      : sinCuadros ? t("a11y.cam_sin_cuadros")
      : pausado ? t("a11y.cam_pausada")
      : aviso ? t(aviso)
      : modulo && modulo.estado.detectado ? t(modalidad === "cabeza" ? "a11y.cam_cara_ok" : "a11y.cam_mano_ok", { fps: EIA.fmt.ent(fps) })
      : t(modalidad === "cabeza" ? "a11y.cam_cara_no" : "a11y.cam_mano_no"));
    ponerTexto(".hud-nombre", t("a11y.cam_titulo", { estado: t(simulada ? "a11y.cam_simulada" : "a11y.cam_activa"), modalidad: t("a11y.mod_" + modalidad) }));
    ponerTexto(".hud-estado", linea);
    const bp = hud.querySelector('[data-accion="pausa"]');
    ponerTexto('[data-accion="pausa"]', t(pausado ? "a11y.cam_reanudar" : "a11y.cam_pausar"));
    bp.setAttribute("aria-pressed", String(!!pausado));
    ponerTexto('[data-accion="recentrar"]', t("a11y.cam_recentrar"));
    ponerTexto('[data-accion="calibrar"]', t("a11y.cam_calibrar"));
    ponerTexto('[data-accion="ayuda"]', t("a11y.cam_ayuda"));
    hud.querySelector('[data-accion="calibrar"]').hidden = modalidad !== "cabeza";
    ponerTexto('[data-accion="detener"]', t("a11y.cam_detener"));
  }

  async function cargarVision() {
    if (vision) return;
    vision = await import(CDN + "/vision_bundle.mjs"); // única importación dinámica del sitio, y solo con la cámara activa
    fileset = await vision.FilesetResolver.forVisionTasks(CDN + "/wasm");
  }

  function configuracion() {
    const p = prefs();
    return { clic: p.clic || "permanencia", invertirX: !!p.invertirX, invertirY: !!p.invertirY, rango: p.rango || RANGO_POR_DEFECTO, calibracion: p.calibracion || null };
  }
  /** Bucle de análisis: un cuadro nuevo del video → detectForVideo → el módulo emite comandos al bus.
      Un vigilante reanuda el video si se pausó o si deja de llegar imagen. */
  function ciclo() {
    if (estado !== "activa") return;
    const ahora = performance.now();
    if (!document.hidden && video) {
      if (video.paused) reanudarVideo();
      if (video.readyState >= 2 && video.currentTime !== ultimoTiempoVideo) {
        ultimoTiempoVideo = video.currentTime; ultimoCuadro = ahora;
        if (sinCuadros) { sinCuadros = false; pintarHUD(); }
        // detectForVideo exige marcas de tiempo estrictamente crecientes
        tDeteccion = Math.max(ahora, tDeteccion + 1);
        try { modulo.procesar(detector.detectForVideo(video, tDeteccion), tDeteccion, configuracion()); } catch (e) { fallar(e); return; }
        cuadros++; cuadrosTotales++;
        if (modulo.estado.aviso !== avisoPrevio) { avisoPrevio = modulo.estado.aviso; pintarHUD(); } // p. ej. «mantén el puño…»
      } else if (ahora - ultimoCuadro > ESPERA_CUADRO_MS) {
        if (!sinCuadros) { sinCuadros = true; pintarHUD(); }
        reanudarVideo(); ultimoCuadro = ahora;
      }
    }
    if (ahora - tFps > 1000) { fps = cuadros * 1000 / (ahora - tFps); cuadros = 0; tFps = ahora; pintarHUD(); }
    raf = requestAnimationFrame(ciclo);
  }
  function reanudarVideo() {
    if (!video || !flujo) return;
    if (!hud.contains(video)) hud.querySelector(".hud-vista").appendChild(video); // por si algo lo sacó del documento
    const p = video.play(); if (p && p.catch) p.catch(() => { /* el vigilante lo reintentará */ });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden || estado !== "activa" || simulada) return;
    ultimoCuadro = performance.now(); tFps = ultimoCuadro; cuadros = 0;
    reanudarVideo();
  });

  /** Guion simulado: va del centro al elemento indicado y se queda quieto (permanencia) o hace el gesto de clic. */
  function cicloSimulado(objetivoCss) {
    const inicio = performance.now(), destino = () => {
      const el = objetivoCss && document.querySelector(objetivoCss), r = el && el.getBoundingClientRect();
      return r ? { u: (r.left + r.width / 2) / global.innerWidth, v: (r.top + r.height / 2) / global.innerHeight } : modulo.centroSintetico;
    };
    const paso = () => {
      if (estado !== "activa") return;
      const ahora = performance.now(), s = (ahora - inicio) / 1000, c = modulo.centroSintetico, d = destino();
      const k = Math.max(0, Math.min(1, (s - 0.4) / 0.8));          // 0,4 s en el centro; 0,8 s de viaje
      const gesto = s > 1.6 && s < 2.3;                             // gesto de clic entre 1,6 s y 2,3 s
      modulo.procesar(modulo.sintetico({ u: c.u + (d.u - c.u) * k, v: c.v + (d.v - c.v) * k, parpadeo: gesto, boca: gesto, pellizco: gesto }), ahora, configuracion());
      cuadrosTotales++;
      if (ahora - tFps > 1000) { tFps = ahora; pintarHUD(); }
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
  }

  function fallar(e) {
    const nombre = e && e.name;
    const clave = nombre === "NotAllowedError" ? "a11y.cam_error_permiso" : nombre === "NotFoundError" ? "a11y.cam_error_sin_camara" : "a11y.cam_error_general";
    detener(true);
    EIA.ui.notificar(t(clave), "error");
    EIA.ui.anunciar(t(clave), { urgente: true });
    if (clave === "a11y.cam_error_general" && global.console) console.warn(e);
  }


  /* Ilustraciones propias de la tarjeta de gestos (SVG simple, decorativo: el texto dice lo mismo) */
  const trazo = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  const FIGURAS = {
    cabeza_mover: `<circle cx="32" cy="30" r="14" ${trazo}/><path d="M8 30h6m42 0h-6M32 6v6m0 36v6" ${trazo}/><path d="M11 26l-3 4 3 4M53 26l3 4-3 4" ${trazo}/>`,
    permanencia: `<circle cx="32" cy="32" r="20" ${trazo} stroke-dasharray="94 32"/><path d="M26 22v22l6-6 4 9 4-2-4-9h8z" ${trazo}/>`,
    parpadeo: `<path d="M10 32c8-10 36-10 44 0" ${trazo}/><path d="M10 32c8 8 36 8 44 0" ${trazo}/><path d="M16 40l-3 4M32 43v5M48 40l3 4" ${trazo}/>`,
    boca: `<circle cx="32" cy="32" r="22" ${trazo}/><circle cx="24" cy="26" r="2" fill="currentColor"/><circle cx="40" cy="26" r="2" fill="currentColor"/><ellipse cx="32" cy="42" rx="7" ry="6" ${trazo}/>`,
    mano_mover: `<rect x="18" y="32" width="28" height="22" rx="9" ${trazo}/><path d="M22 34V16m8 18V12m8 22V14m8 22V20" ${trazo}/><path d="M6 44h6m40 0h6M9 41l-3 3 3 3M55 41l3 3-3 3" ${trazo}/>`,
    pellizco: `<path d="M20 52V36c0-6 4-10 10-10h6" ${trazo}/><path d="M36 26c6 0 10-4 10-10" ${trazo}/><path d="M20 36c-6-4-8-10-4-14 3-3 8-1 12 4" ${trazo}/><circle cx="46" cy="14" r="4" ${trazo}/>`,
    puno: `<rect x="14" y="22" width="30" height="26" rx="9" ${trazo}/><path d="M22 22v8m8-8v8m8-8v8" ${trazo}/><circle cx="50" cy="16" r="9" ${trazo}/><path d="M50 11v5l3 3" ${trazo}/>`,
    dos_dedos: `<rect x="18" y="36" width="24" height="18" rx="8" ${trazo}/><path d="M24 36L18 12m14 24l6-24" ${trazo}/><path d="M52 14v20M48 18l4-4 4 4M48 30l4 4 4-4" ${trazo}/>`
  };
  const figura = k => `<svg class="gesto-fig" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true" focusable="false">${FIGURAS[k]}</svg>`;
  /** Tarjeta de ayuda con los gestos de las dos modalidades (PLAN_MAESTRO §9.6). Se abre desde el HUD o desde el Centro. */
  function ayuda() {
    const fila = k => `<li class="gesto">${figura(k)}<div><strong>${esc(t("a11y.g_" + k))}</strong><br><span class="mut">${esc(t("a11y.g_" + k + "_texto"))}</span></div></li>`;
    EIA.ui.dialogo({
      titulo: t("a11y.gestos_titulo"),
      contenido: `<h3>${esc(t("a11y.gestos_cabeza"))}</h3><ul class="gestos">${["cabeza_mover", "permanencia", "parpadeo", "boca"].map(fila).join("")}</ul>
<h3>${esc(t("a11y.gestos_manos"))}</h3><ul class="gestos">${["mano_mover", "pellizco", "puno", "dos_dedos"].map(fila).join("")}</ul>`,
      acciones: [{ texto: t("comun.cerrar"), valor: "", primario: true }]
    }).abrir();
  }

  /* Calibración de 5 puntos (solo cabeza): la persona mira el centro y las cuatro esquinas; tras asentarse, se promedian
     las poses de un segundo en cada punto y un ajuste afín (senales.calibracionCabeza) se guarda en eia_a11y.calibracion.
     Mientras dura, el puntero no se mueve ni hace clic. Esc o «Cancelar» la detienen sin cambiar nada. */
  const ASENTAR_MS = 1200, MEDIR_MS = 1000, PASO_MS = 50;
  let calibrandoAhora = false;
  async function calibrar() {
    if (!modulo || modalidad !== "cabeza" || calibrandoAhora || estado !== "activa") return false;
    const Sen = global.EIALib.senales, puntos = Sen.PUNTOS_CALIBRACION;
    calibrandoAhora = true; modulo.calibrando(true);
    const capa = document.createElement("div"); capa.className = "calibracion";
    capa.setAttribute("role", "dialog"); capa.setAttribute("aria-modal", "true"); capa.setAttribute("aria-labelledby", "calib-titulo");
    capa.innerHTML = `<div class="calib-caja"><h2 id="calib-titulo">${esc(t("a11y.calib_titulo"))}</h2><p class="calib-texto" role="status" aria-live="polite"></p>
<button type="button" class="calib-cancelar">${esc(t("a11y.calib_cancelar"))}</button></div><span class="calib-punto" aria-hidden="true"></span>`;
    document.body.appendChild(capa);
    const texto = capa.querySelector(".calib-texto"), punto = capa.querySelector(".calib-punto"), boton = capa.querySelector(".calib-cancelar");
    let cancelado = false;
    const alTecla = e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancelado = true; } };
    document.addEventListener("keydown", alTecla, true);
    boton.addEventListener("click", () => { cancelado = true; });
    boton.focus();
    const esperar = async ms => { const fin = performance.now() + ms; while (!cancelado && performance.now() < fin) await new Promise(r => setTimeout(r, PASO_MS)); };
    const muestras = [];
    let sinCara = false;
    for (let i = 0; i < puntos.length && !cancelado && !sinCara; i++) {
      const [u, v] = puntos[i];
      punto.style.left = (u * 100) + "%"; punto.style.top = (v * 100) + "%"; punto.classList.remove("midiendo");
      texto.textContent = t("a11y.calib_paso", { n: i + 1, total: puntos.length });
      await esperar(ASENTAR_MS);
      if (cancelado) break;
      if (i === 0) modulo.recentrar(); // el centro define el cero del giro y la inclinación
      punto.classList.add("midiendo");
      const acum = [], t0 = performance.now();
      while (!cancelado && performance.now() - t0 < MEDIR_MS) {
        const m = modulo.muestra();
        if (m && m.t >= t0 - PASO_MS && modulo.estado.detectado) acum.push(m);
        await esperar(PASO_MS);
      }
      if (cancelado) break;
      if (!acum.length) { sinCara = true; break; }
      const media = k => acum.reduce((s, m) => s + m[k], 0) / acum.length;
      muestras.push({ dy: media("dy"), dp: media("dp"), u, v });
    }
    document.removeEventListener("keydown", alTecla, true);
    capa.remove(); modulo.calibrando(false); calibrandoAhora = false;
    // Cancelar tiene prioridad: si la persona pulsó Esc, el mensaje no culpa a la cámara
    if (cancelado || sinCara) { const k = cancelado ? "a11y.calib_cancelada" : "a11y.calib_sin_cara"; EIA.ui.anunciar(t(k)); EIA.ui.notificar(t(k), cancelado ? "info" : "error"); return false; }
    const cal = Sen.calibracionCabeza(muestras);
    if (!cal) { EIA.ui.notificar(t("a11y.calib_fallo"), "error"); EIA.ui.anunciar(t("a11y.calib_fallo"), { urgente: true }); return false; }
    EIA.estado.set("eia_a11y", Object.assign({}, prefs(), { calibracion: cal }));
    EIA.ui.notificar(t("a11y.calib_lista"), "ok"); EIA.ui.anunciar(t("a11y.calib_lista"));
    return true;
  }

  /** Activa una modalidad: "cabeza" o "manos". op = {reanudar, simulada, objetivo (selector CSS del guion simulado)} */
  async function iniciar(mod, op) {
    const o = op || {};
    if (mod !== "cabeza" && mod !== "manos") return false;
    if (estado !== "apagada") detener(true);
    if (!o.simulada && !o.reanudar && sesion.get(CLAVE_CONSENTIMIENTO) !== "1") {
      if (!(await consentimiento())) return false;
      sesion.set(CLAVE_CONSENTIMIENTO, "1");
    }
    modalidad = mod; simulada = !!o.simulada; estado = "cargando";
    try {
      await EIA.cargar("js/lib/senales.js"); await EIA.cargar("js/a11y/bus-entrada.js"); await EIA.cargar("js/a11y/puntero.js");
      await EIA.cargar(mod === "cabeza" ? "js/a11y/cabeza-mirada.js" : "js/a11y/manos.js");
      modulo = mod === "cabeza" ? EIA.cabezaMirada : EIA.manos;
      modulo.recentrar();
      pintarHUD();
      const p = prefs();
      // Con la cabeza el clic por defecto es la permanencia; con la mano, el pellizco
      const permanencia = mod === "cabeza" ? (p.clic || "permanencia") === "permanencia" : !!p.permanenciaManos;
      if (simulada) {
        estado = "activa"; EIA.puntero.activar({ permanencia, ms: p.ms || 900 });
        cicloSimulado(o.objetivo); pintarHUD();
        return true;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error("sin getUserMedia"), { name: "NotFoundError" });
      flujo = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false });
      video = document.createElement("video");
      video.muted = true; video.playsInline = true; video.srcObject = flujo; video.className = "hud-video"; video.setAttribute("aria-hidden", "true");
      await video.play();
      await cargarVision();
      try { detector = await modulo.crearDetector(vision, fileset, "GPU"); }
      catch (e) { detector = await modulo.crearDetector(vision, fileset, "CPU"); } // respaldo sin GPU
      estado = "activa"; sesion.set(CLAVE_SESION, mod);
      EIA.puntero.activar({ permanencia, ms: p.ms || 900 });
      pintarHUD(); hud.querySelector(".hud-vista").appendChild(video);
      tFps = ultimoCuadro = performance.now(); cuadros = 0; cuadrosTotales = 0; sinCuadros = false; ultimoTiempoVideo = -1;
      EIA.ui.anunciar(t("a11y.cam_anuncio_activa"));
      raf = requestAnimationFrame(ciclo);
      return true;
    } catch (e) { fallar(e); return false; }
  }

  /** Detiene todo y libera la cámara. silencioso = true no anuncia (se usa al cambiar de modalidad o tras un error). */
  function detener(silencioso) {
    const estaba = estado !== "apagada";
    estado = "apagada"; cancelAnimationFrame(raf);
    if (flujo) flujo.getTracks().forEach(p => p.stop());
    if (detector && detector.close) { try { detector.close(); } catch (e) { /* ya cerrado */ } }
    flujo = null; detector = null; video = null;
    if (EIA.puntero) EIA.puntero.desactivar();
    if (EIA.bus && EIA.bus.pausado()) EIA.bus.emitir("REANUDAR");
    if (hud) { hud.remove(); hud = null; }
    sesion.set(CLAVE_SESION, null);
    if (estaba && !silencioso) EIA.ui.anunciar(t("a11y.cam_anuncio_detenida"));
  }

  document.addEventListener("keydown", e => { if (e.key === "Escape" && estado !== "apagada" && !calibrandoAhora && !document.querySelector("dialog[open]")) detener(); });
  global.addEventListener("pagehide", () => { if (flujo) flujo.getTracks().forEach(p => p.stop()); }); // la sesión se conserva para reanudar

  EIA.camara = { iniciar, detener, calibrar, ayuda, calibrando: () => calibrandoAhora, estado: () => ({ estado, modalidad, simulada, fps, cuadros: cuadrosTotales, video: video ? { pausado: video.paused, enDocumento: document.contains(video) } : null }), CLAVE_SESION, RANGO_POR_DEFECTO };
})(window);
