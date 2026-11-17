/* js/a11y/puntero.js — puntero virtual (PLAN_MAESTRO §9.3): un anillo grande que no es el cursor del sistema.
   Convierte MOVER_PUNTERO y ACTIVAR del bus en acciones sobre la página:
     · imán: se engancha al elemento interactivo más cercano dentro de un radio, con histéresis para que el temblor no lo suelte;
     · permanencia (dwell): clic tras quedarse quieto sobre un elemento, con anillo de progreso;
     · zonas de desplazamiento arriba y abajo;
     · un <select> nativo no se puede abrir por programa: se muestra un diálogo con sus opciones.
   Modo de prueba sin cámara: ?puntero=raton mueve el anillo con el ratón. Requiere bus-entrada.js. */
(function (global) {
  "use strict";
  const EIA = global.EIA;
  if (EIA.puntero) return;

  const INTERACTIVOS = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[role="tab"],[tabindex]:not([tabindex="-1"])';
  const CIRCUNFERENCIA = 113; // 2·π·18, la del anillo de progreso
  const cfg = { permanencia: true, ms: 900, iman: 80, zona: 0.08, velocidadDesplazamiento: 14, histeresis: 16 };
  let activo = false, x = 0, y = 0, anillo = null, objetivo = null, desde = 0, bloqueado = null, raf = 0, conRaton = false;

  function crearAnillo() {
    anillo = document.createElement("div");
    anillo.id = "eia-puntero"; anillo.setAttribute("aria-hidden", "true");
    anillo.innerHTML = '<svg viewBox="0 0 44 44" width="56" height="56"><circle class="fondo" cx="22" cy="22" r="18"/><circle class="prog" cx="22" cy="22" r="18" transform="rotate(-90 22 22)"/><circle class="centro" cx="22" cy="22" r="4"/></svg>';
    document.body.appendChild(anillo);
  }
  const progreso = f => { const c = anillo.querySelector(".prog"); c.style.strokeDasharray = CIRCUNFERENCIA; c.style.strokeDashoffset = String(CIRCUNFERENCIA * (1 - Math.max(0, Math.min(1, f)))); };

  /** Elemento interactivo más cercano al punto, dentro del radio del imán (0 si el punto está dentro). */
  function cercano(px, py) {
    const raiz = document.querySelector("dialog[open]") || document;
    let mejor = null, dMin = cfg.iman;
    for (const el of raiz.querySelectorAll(INTERACTIVOS)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > global.innerHeight) continue;
      const dx = Math.max(r.left - px, 0, px - r.right), dy = Math.max(r.top - py, 0, py - r.bottom), d = Math.hypot(dx, dy);
      if (d < dMin || (d === dMin && mejor && r.width * r.height < mejor.getBoundingClientRect().width * mejor.getBoundingClientRect().height)) { dMin = d; mejor = el; }
    }
    return mejor;
  }
  function fijarObjetivo(el) {
    if (el === objetivo) return;
    if (objetivo) objetivo.classList.remove("eia-objetivo");
    objetivo = el; desde = performance.now();
    if (bloqueado && bloqueado !== el) bloqueado = null; // al salir del elemento recién pulsado, se rearma
    if (objetivo) objetivo.classList.add("eia-objetivo");
  }
  function mover(nx, ny) {
    x = Math.max(0, Math.min(global.innerWidth - 1, nx)); y = Math.max(0, Math.min(global.innerHeight - 1, ny));
    if (!activo) return;
    anillo.style.transform = "translate(" + (x - 28) + "px," + (y - 28) + "px)";
    // Histéresis: mientras el puntero siga dentro del objetivo actual (ampliado unos píxeles) se conserva, aunque otro
    // elemento quede más cerca. Así el temblor no reinicia la permanencia ni salta entre botones vecinos.
    if (objetivo && objetivo.isConnected) {
      const r = objetivo.getBoundingClientRect(), h = cfg.histeresis;
      if (r.width > 0 && x >= r.left - h && x <= r.right + h && y >= r.top - h && y <= r.bottom + h) return;
    }
    fijarObjetivo(cercano(x, y));
  }

  function pulsar() {
    const el = objetivo || document.elementFromPoint(x, y);
    if (!el) return;
    anillo.classList.remove("clic"); void anillo.offsetWidth; anillo.classList.add("clic"); // destello
    bloqueado = el; progreso(0);
    if (el.tagName === "SELECT") { EIA.ui.opcionesSelect(el); return; }
    if (el.focus) el.focus({ preventScroll: true });
    if (el.click) el.click();
  }

  function ciclo() {
    if (!activo) return;
    const ahora = performance.now(), quieto = !EIA.bus.pausado();
    if (quieto && cfg.permanencia && objetivo && objetivo !== bloqueado) {
      const f = (ahora - desde) / cfg.ms;
      progreso(f);
      if (f >= 1) pulsar();
    } else progreso(0);
    // Zonas de desplazamiento: solo cuando no hay nada interactivo debajo
    if (quieto && !objetivo && !document.querySelector("dialog[open]")) {
      if (y < global.innerHeight * cfg.zona) EIA.bus.emitir("DESPLAZAR", { dy: -cfg.velocidadDesplazamiento });
      else if (y > global.innerHeight * (1 - cfg.zona)) EIA.bus.emitir("DESPLAZAR", { dy: cfg.velocidadDesplazamiento });
    }
    raf = requestAnimationFrame(ciclo);
  }
  const alMoverRaton = e => EIA.bus.emitir("MOVER_PUNTERO", { x: e.clientX, y: e.clientY });

  EIA.bus.on("MOVER_PUNTERO", d => mover(d.x, d.y));
  // Con el barrido encendido, ACTIVAR (parpadeo, boca, pellizco) es su interruptor y no un clic bajo el puntero
  EIA.bus.on("ACTIVAR", d => { if (activo && !(EIA.barrido && EIA.barrido.activo())) { d.manejado = true; pulsar(); } });

  EIA.puntero = {
    /** op = {permanencia, ms, iman, raton} */
    activar(op) {
      Object.assign(cfg, op || {});
      if (activo) return;
      activo = true; conRaton = !!(op && op.raton);
      if (!anillo) crearAnillo();
      anillo.hidden = false;
      document.body.classList.add("modo-puntero");
      mover(global.innerWidth / 2, global.innerHeight / 2);
      if (conRaton) document.addEventListener("mousemove", alMoverRaton);
      raf = requestAnimationFrame(ciclo);
    },
    desactivar() {
      if (!activo) return;
      activo = false; cancelAnimationFrame(raf);
      if (conRaton) document.removeEventListener("mousemove", alMoverRaton);
      fijarObjetivo(null); bloqueado = null;
      if (anillo) anillo.hidden = true;
      document.body.classList.remove("modo-puntero");
    },
    configurar(op) { Object.assign(cfg, op || {}); },
    estado: () => ({ activo, x, y, objetivo, permanencia: cfg.permanencia, ms: cfg.ms })
  };
})(window);
