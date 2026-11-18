/* js/a11y/panel.js — Centro de accesibilidad (PLAN_MAESTRO §9.1): diálogo modal con las preferencias visuales (f),
   la lectura (a: resumen de la página en voz alta, velocidad de la voz y sonificación) y las modalidades de control:
   barrido con un interruptor (e), cabeza (c) y manos (d). Todo se guarda en eia_a11y y lo aplica
   EIA.aplicarPreferencias() de js/common.js al cargar cada página. Se abre con el botón «Accesibilidad» o Alt+Shift+A.
   Pendiente (T-28): calibración de 5 puntos con interfaz. */
(function (global) {
  "use strict";
  const EIA = global.EIA, $ = global.$, $$ = global.$$;
  if (EIA.a11y) return;
  const t = (k, p) => EIA.t(k, p), esc = EIA.esc;
  const RANGO = 18; // grados de giro hasta el borde de la pantalla (el mismo valor por defecto que js/a11y/cabeza-mirada.js)
  const BARRIDO_MS = 1200; // el mismo valor por defecto que js/a11y/barrido.js
  const leer = () => Object.assign({ texto: 100, ms: 900, clic: "permanencia", rango: RANGO, voz: 1, sonido: true, barrido_ms: BARRIDO_MS }, EIA.estado.get("eia_a11y"));
  function guardar(cambio) {
    const p = Object.assign(leer(), cambio);
    EIA.estado.set("eia_a11y", p);
    EIA.aplicarPreferencias();
    if (EIA.puntero) EIA.puntero.configurar({ ms: p.ms, permanencia: p.clic === "permanencia" });
    if (EIA.barrido && EIA.barrido.activo()) EIA.barrido.reiniciarReloj();
    return p;
  }

  const interruptor = (clave, p) => `<label class="casilla fila-pref"><input type="checkbox" data-pref="${clave}"${p[clave] ? " checked" : ""}> <span><strong>${esc(t("a11y." + clave))}</strong><br><span class="mut">${esc(t("a11y." + clave + "_ayuda"))}</span></span></label>`;
  const segundos = ms => EIA.fmt.num(ms / 1000, 1);
  // Valor visible de cada deslizador (se actualiza al moverlo)
  const SALIDAS = {
    texto: p => EIA.fmt.pct(p.texto, 0, { signo: false }), ms: p => segundos(p.ms), barrido_ms: p => segundos(p.barrido_ms),
    rango: p => t("a11y.grados", { n: EIA.fmt.ent(p.rango) }), voz: p => EIA.fmt.num(p.voz, 2)
  };
  const deslizador = (clave, min, max, paso, p) => `<div class="fila-pref"><label for="pref-${clave}">${esc(t("a11y." + clave))}: <output id="pref-${clave}-valor">${esc(SALIDAS[clave](p))}</output></label>
<input type="range" id="pref-${clave}" data-pref="${clave}" min="${min}" max="${max}" step="${paso}" value="${Number(p[clave])}"></div>`;

  /** Texto que se lee con «Leer el resumen de esta página»: título, subtítulo, aviso y el resumen de cada gráfico. */
  function resumenPagina() {
    // Sin los iconos decorativos (aria-hidden) ni la puntuación final, para no leer «⚠» ni «..»
    const limpiar = s => String(s || "").replace(/\s+/g, " ").trim().replace(/[.:;]+$/, "");
    const txt = el => {
      if (!el) return "";
      const copia = el.cloneNode(true);
      copia.querySelectorAll('[aria-hidden="true"]').forEach(n => n.remove());
      return limpiar(copia.textContent);
    };
    const partes = [txt($("main h1")), txt($("main .sub")), txt($("main [data-aviso]"))];
    $$(".grafico").forEach(g => partes.push(txt($("h2", g)) + ": " + limpiar($(".chart", g) ? $(".chart", g).getAttribute("aria-label") : "")));
    return partes.filter(Boolean).join(". ") + ".";
  }

  let lectura = null;
  function contenido() {
    const p = leer(), cam = EIA.camara ? EIA.camara.estado() : { estado: "apagada" };
    const activa = m => cam.estado !== "apagada" && cam.modalidad === m;
    const botonCamara = m => `<button type="button" data-camara="${m}" aria-pressed="${activa(m)}">${esc(t(activa(m) ? "a11y.detener_mod" : "a11y.activar_mod", { modalidad: t("a11y.mod_" + m) }))}</button>`;
    const barridoActivo = !!(EIA.barrido && EIA.barrido.activo());
    return `<p class="mut">${esc(t("a11y.intro"))}</p>
<h3>${esc(t("a11y.sec_visual"))}</h3>
${deslizador("texto", 100, 200, 10, p)}
${interruptor("contraste", p)}${interruptor("movimiento", p)}${interruptor("espaciado", p)}${interruptor("enlaces", p)}${interruptor("fuente", p)}${interruptor("cursor", p)}${interruptor("decal", p)}
<h3>${esc(t("a11y.sec_lectura"))}</h3>
${EIA.hayVoz()
    ? `<div class="acciones"><button type="button" data-leer-pagina aria-pressed="${!!lectura}">${esc(t(lectura ? "a11y.detener_lectura" : "a11y.leer_pagina"))}</button></div>${deslizador("voz", 0.5, 2, 0.25, p)}`
    : `<p class="mut">${esc(t("a11y.sin_voz"))}</p>`}
${interruptor("sonido", p)}
<h3>${esc(t("a11y.sec_control"))}</h3>
<p class="mut">${esc(t("a11y.barrido_ayuda"))}</p>
<div class="acciones"><button type="button" data-barrido aria-pressed="${barridoActivo}">${esc(t(barridoActivo ? "a11y.barrido_detener_btn" : "a11y.barrido_activar"))}</button></div>
${deslizador("barrido_ms", 500, 3000, 100, p)}
<p class="mut">${esc(t("a11y.camara_privacidad"))}</p>
<div class="acciones">${botonCamara("cabeza")}${botonCamara("manos")}</div>
<div class="fila-pref"><label for="pref-clic">${esc(t("a11y.clic"))}</label>
<select id="pref-clic" data-pref="clic">${["permanencia", "parpadeo", "boca"].map(c => `<option value="${c}"${p.clic === c ? " selected" : ""}>${esc(t("a11y.clic_" + c))}</option>`).join("")}</select></div>
${deslizador("ms", 500, 2000, 100, p)}
${deslizador("rango", 10, 30, 2, p)}
<p class="mut">${esc(t("a11y.rango_ayuda"))}</p>
${interruptor("invertirX", p)}${interruptor("invertirY", p)}
${p.calibracion ? `<p class="mut" id="calib-estado">${esc(t("a11y.calib_activa"))}</p><div class="acciones"><button type="button" data-quitar-calibracion>${esc(t("a11y.calib_quitar"))}</button></div>` : ""}
<h3>${esc(t("a11y.sec_ayuda"))}</h3>
<div class="acciones"><button type="button" data-ver-gestos>${esc(t("a11y.ver_gestos"))}</button></div>
<ul><li>${esc(t("a11y.atajo_panel"))}</li><li>${esc(t("a11y.atajo_esc"))}</li><li>${esc(t("a11y.ayuda_barrido"))}</li><li>${esc(t("a11y.ayuda_teclado"))}</li></ul>`;
  }

  let abierto = null;
  function abrir() {
    if (abierto) return;
    const caja = document.createElement("div"); caja.className = "panel-a11y"; caja.innerHTML = contenido();
    caja.addEventListener("input", e => {
      const el = e.target, clave = el.dataset.pref; if (!clave) return;
      const valor = el.type === "checkbox" ? el.checked : (el.type === "range" ? Number(el.value) : el.value);
      const p = guardar({ [clave]: valor });
      if (SALIDAS[clave]) $("#pref-" + clave + "-valor", caja).textContent = SALIDAS[clave](p);
      if (clave === "decal" || clave === "movimiento" || clave === "contraste") EIA.emit("eia:tema", { tema: EIA.tema() }); // los gráficos se redibujan
    });
    caja.addEventListener("click", async e => {
      const lp = e.target.closest("button[data-leer-pagina]");
      if (lp) {
        const pintarBoton = on => { lp.setAttribute("aria-pressed", String(on)); lp.textContent = t(on ? "a11y.detener_lectura" : "a11y.leer_pagina"); };
        if (lectura) { lectura.detener(); lectura = null; pintarBoton(false); return; }
        lectura = EIA.leerEnVozAlta(resumenPagina(), { alTerminar() { lectura = null; if (lp.isConnected) pintarBoton(false); } });
        if (lectura) pintarBoton(true);
        return;
      }
      const qc = e.target.closest("button[data-quitar-calibracion]");
      if (qc) { guardar({ calibracion: null }); $("#calib-estado", caja).textContent = t("a11y.calib_quitada"); qc.remove(); EIA.ui.anunciar(t("a11y.calib_quitada")); return; }
      if (e.target.closest("button[data-ver-gestos]")) { dlg.cerrar(); await EIA.cargar("js/a11y/camara.js"); EIA.camara.ayuda(); return; }
      if (e.target.closest("button[data-barrido]")) {
        dlg.cerrar();
        await EIA.cargar("js/a11y/barrido.js");
        if (EIA.barrido.activo()) EIA.barrido.detener(); else EIA.barrido.iniciar();
        return;
      }
      const b = e.target.closest("button[data-camara]"); if (!b) return;
      const m = b.dataset.camara;
      dlg.cerrar();
      await EIA.cargar("js/a11y/camara.js");
      const c = EIA.camara.estado();
      if (c.estado !== "apagada" && c.modalidad === m) EIA.camara.detener(); else EIA.camara.iniciar(m);
    });
    const dlg = EIA.ui.dialogo({ titulo: t("a11y.titulo"), contenido: caja, acciones: [{ texto: t("comun.cerrar"), valor: "", primario: true }], alCerrar() { abierto = null; } });
    abierto = dlg; dlg.abrir();
  }

  EIA.a11y = { abrir, leer, guardar, resumenPagina };
})(window);
