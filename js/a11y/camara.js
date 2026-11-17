/* js/a11y/camara.js — ciclo de vida de la cámara para las modalidades «cabeza» y «manos» (PLAN_MAESTRO §9.5).
   · Consentimiento previo: la imagen se procesa SOLO en el navegador; no se envía ni se guarda.
   · MediaPipe Tasks Vision 1.2.3 se descarga únicamente aquí, al activar la cámara (D-12). GPU con respaldo en CPU.
   · HUD permanente «Cámara activa» con Detener (también Esc), Pausa y Recentrar. Se detiene el análisis si la pestaña se oculta.
   · El sitio es multipágina: al navegar, la cámara se reanuda sola en la página siguiente (consentimiento de la sesión).
   · Una sola modalidad a la vez.
   · Guion simulado (?camara=simulada&mod=cabeza|manos): alimenta el mismo camino con resultados sintéticos, sin cámara ni
     MediaPipe. Sirve para probar bus → puntero → clic de forma automática.
   NO VERIFICADO CON CÁMARA REAL por una IA: requiere prueba humana (Anexo A del PLAN_MAESTRO). */
(function (global) {
  "use strict";
  const EIA = global.EIA, $ = global.$;
  if (EIA.camara) return;

  const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3";
  const CLAVE_SESION = "eia_cam", CLAVE_CONSENTIMIENTO = "eia_cam_ok";
  let estado = "apagada", modalidad = null, modulo = null, video = null, flujo = null, detector = null, vision = null, fileset = null;
  let raf = 0, hud = null, simulada = false, cuadros = 0, tFps = 0, fps = 0, ultimoTiempoVideo = -1;

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

  function pintarHUD(mensaje) {
    if (!hud) {
      hud = document.createElement("div"); hud.id = "eia-hud"; hud.setAttribute("role", "status");
      document.body.appendChild(hud);
      hud.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.accion === "detener") detener();
        else if (b.dataset.accion === "pausa") { EIA.bus.alternarPausa(); pintarHUD(); }
        else if (b.dataset.accion === "recentrar" && modulo) modulo.recentrar();
      });
    }
    const pausado = EIA.bus && EIA.bus.pausado();
    const linea = mensaje || (estado === "cargando" ? t("a11y.cam_cargando")
      : pausado ? t("a11y.cam_pausada")
      : modulo && modulo.estado.detectado ? t(modalidad === "cabeza" ? "a11y.cam_cara_ok" : "a11y.cam_mano_ok", { fps: EIA.fmt.ent(fps) })
      : t(modalidad === "cabeza" ? "a11y.cam_cara_no" : "a11y.cam_mano_no"));
    hud.innerHTML = `<p class="hud-titulo"><span class="hud-punto" aria-hidden="true">●</span> ${esc(t(simulada ? "a11y.cam_simulada" : "a11y.cam_activa"))} · ${esc(t("a11y.mod_" + modalidad))}</p>
<p class="hud-estado">${esc(linea)}</p>
<div class="hud-botones"><button type="button" data-accion="pausa">${esc(t(pausado ? "a11y.cam_reanudar" : "a11y.cam_pausar"))}</button><button type="button" data-accion="recentrar">${esc(t("a11y.cam_recentrar"))}</button><button type="button" data-accion="detener" class="hud-detener">${esc(t("a11y.cam_detener"))}</button></div>`;
  }

  async function cargarVision() {
    if (vision) return;
    vision = await import(CDN + "/vision_bundle.mjs"); // única importación dinámica del sitio, y solo con la cámara activa
    fileset = await vision.FilesetResolver.forVisionTasks(CDN + "/wasm");
  }

  function configuracion() {
    const p = prefs();
    return { clic: p.clic || "permanencia", invertirX: !!p.invertirX, invertirY: !!p.invertirY };
  }
  function ciclo() {
    if (estado !== "activa") return;
    const ahora = performance.now();
    if (!document.hidden && video && video.readyState >= 2 && video.currentTime !== ultimoTiempoVideo) {
      ultimoTiempoVideo = video.currentTime;
      try { modulo.procesar(detector.detectForVideo(video, ahora), ahora, configuracion()); } catch (e) { fallar(e); return; }
      cuadros++;
    }
    if (ahora - tFps > 1000) { fps = cuadros * 1000 / (ahora - tFps); cuadros = 0; tFps = ahora; pintarHUD(); }
    raf = requestAnimationFrame(ciclo);
  }

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
      pintarHUD(); hud.appendChild(video);
      tFps = performance.now(); cuadros = 0;
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

  document.addEventListener("keydown", e => { if (e.key === "Escape" && estado !== "apagada" && !document.querySelector("dialog[open]")) detener(); });
  global.addEventListener("pagehide", () => { if (flujo) flujo.getTracks().forEach(p => p.stop()); }); // la sesión se conserva para reanudar

  EIA.camara = { iniciar, detener, estado: () => ({ estado, modalidad, simulada, fps }), CLAVE_SESION };
})(window);
