/* js/a11y/bus-entrada.js — bus de comandos semánticos (PLAN_MAESTRO §9.3).
   Todas las modalidades alternativas (cabeza, manos, barrido, voz) emiten los MISMOS comandos, y ninguna reimplementa
   clics ni navegación. Cada comando tiene una acción por defecto; un oyente puede marcar datos.manejado = true para
   sustituirla (así lo hace el puntero virtual con ACTIVAR). Se carga bajo demanda. */
(function (global) {
  "use strict";
  const EIA = global.EIA;
  if (EIA.bus) return;

  const COMANDOS = ["MOVER_PUNTERO", "ACTIVAR", "SIGUIENTE", "ANTERIOR", "DESPLAZAR", "VOLVER", "PAUSAR", "REANUDAR",
    "IR_A_MODULO", "SIGUIENTE_MODULO", "MODULO_ANTERIOR", "AYUDA"];
  const ENFOCABLES = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
  const oyentes = new Map();
  let pausado = false;

  const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  function enfocables() {
    const raiz = document.querySelector("dialog[open]") || document;
    return Array.from(raiz.querySelectorAll(ENFOCABLES)).filter(visible);
  }
  function moverFoco(paso) {
    const l = enfocables(); if (!l.length) return;
    const i = l.indexOf(document.activeElement);
    l[(i + paso + l.length) % l.length].focus();
  }
  function cambiarModulo(paso) {
    const i = global.PAGES.findIndex(p => p[2] === document.body.dataset.page);
    global.location.href = global.PAGES[(i + paso + global.PAGES.length) % global.PAGES.length][0];
  }

  const porDefecto = {
    SIGUIENTE() { moverFoco(1); },
    ANTERIOR() { moverFoco(-1); },
    ACTIVAR() { const el = document.activeElement; if (el && el !== document.body && el.click) el.click(); },
    DESPLAZAR(d) { global.scrollBy({ top: d.dy || 0, behavior: "auto" }); },
    VOLVER() { const dlg = document.querySelector("dialog[open]"); if (dlg) dlg.close(); else global.history.back(); },
    IR_A_MODULO(d) { const p = (global.PAGINAS_NAV || []).find(x => x[2] === d.id) || global.PAGES.find(x => x[2] === d.id); if (p) global.location.href = p[0]; },
    SIGUIENTE_MODULO() { cambiarModulo(1); },
    MODULO_ANTERIOR() { cambiarModulo(-1); },
    AYUDA() { if (EIA.abrirAccesibilidad) EIA.abrirAccesibilidad(); },
    PAUSAR() { pausado = true; EIA.ui.anunciar(EIA.t("a11y.pausado")); },
    REANUDAR() { pausado = false; EIA.ui.anunciar(EIA.t("a11y.reanudado")); }
  };

  EIA.bus = {
    COMANDOS,
    /** Escucha un comando. Devuelve la función que cancela. */
    on(comando, fn) {
      if (!oyentes.has(comando)) oyentes.set(comando, new Set());
      oyentes.get(comando).add(fn);
      return () => oyentes.get(comando).delete(fn);
    },
    /** Emite un comando. En pausa solo pasan PAUSAR y REANUDAR. Devuelve false si se descartó. */
    emitir(comando, datos) {
      if (!COMANDOS.includes(comando)) throw new Error("Comando desconocido: " + comando);
      if (pausado && comando !== "REANUDAR" && comando !== "PAUSAR") return false;
      const d = datos || {};
      (oyentes.get(comando) || []).forEach(fn => { try { fn(d); } catch (e) { console.error(e); } });
      if (!d.manejado && porDefecto[comando]) porDefecto[comando](d);
      return true;
    },
    pausado: () => pausado,
    alternarPausa() { EIA.bus.emitir(pausado ? "REANUDAR" : "PAUSAR"); }
  };
})(window);
