/* js/a11y/panel.js — Centro de accesibilidad (PLAN_MAESTRO §9.1): diálogo modal con las preferencias visuales (f)
   y los interruptores de las modalidades de control (c) cabeza y (d) manos. Todo se guarda en eia_a11y y lo aplica
   EIA.aplicarPreferencias() de js/common.js al cargar cada página. Se abre con el botón «Accesibilidad» o Alt+Shift+A.
   Pendiente (T-27 y T-28): fuente legible, cursor grande, barrido, lectura en voz alta y calibración. */
(function (global) {
  "use strict";
  const EIA = global.EIA, $ = global.$, $$ = global.$$;
  if (EIA.a11y) return;
  const t = (k, p) => EIA.t(k, p), esc = EIA.esc;
  const RANGO = 18; // grados de giro hasta el borde de la pantalla (el mismo valor por defecto que js/a11y/cabeza-mirada.js)
  const leer = () => Object.assign({ texto: 100, ms: 900, clic: "permanencia", rango: RANGO }, EIA.estado.get("eia_a11y"));
  function guardar(cambio) {
    const p = Object.assign(leer(), cambio);
    EIA.estado.set("eia_a11y", p);
    EIA.aplicarPreferencias();
    if (EIA.puntero) EIA.puntero.configurar({ ms: p.ms, permanencia: p.clic === "permanencia" });
    return p;
  }

  const interruptor = (clave, p) => `<label class="casilla fila-pref"><input type="checkbox" data-pref="${clave}"${p[clave] ? " checked" : ""}> <span><strong>${esc(t("a11y." + clave))}</strong><br><span class="mut">${esc(t("a11y." + clave + "_ayuda"))}</span></span></label>`;

  function contenido() {
    const p = leer(), cam = EIA.camara ? EIA.camara.estado() : { estado: "apagada" };
    const activa = m => cam.estado !== "apagada" && cam.modalidad === m;
    const botonCamara = m => `<button type="button" data-camara="${m}" aria-pressed="${activa(m)}">${esc(t(activa(m) ? "a11y.detener_mod" : "a11y.activar_mod", { modalidad: t("a11y.mod_" + m) }))}</button>`;
    return `<p class="mut">${esc(t("a11y.intro"))}</p>
<h3>${esc(t("a11y.sec_visual"))}</h3>
<div class="fila-pref"><label for="pref-texto">${esc(t("a11y.texto"))}: <output id="pref-texto-valor">${esc(EIA.fmt.pct(p.texto, 0, { signo: false }))}</output></label>
<input type="range" id="pref-texto" data-pref="texto" min="100" max="200" step="10" value="${Number(p.texto)}"></div>
${interruptor("contraste", p)}${interruptor("movimiento", p)}${interruptor("espaciado", p)}${interruptor("enlaces", p)}${interruptor("decal", p)}
<h3>${esc(t("a11y.sec_control"))}</h3>
<p class="mut">${esc(t("a11y.camara_privacidad"))}</p>
<div class="acciones">${botonCamara("cabeza")}${botonCamara("manos")}</div>
<div class="fila-pref"><label for="pref-clic">${esc(t("a11y.clic"))}</label>
<select id="pref-clic" data-pref="clic">${["permanencia", "parpadeo", "boca"].map(c => `<option value="${c}"${p.clic === c ? " selected" : ""}>${esc(t("a11y.clic_" + c))}</option>`).join("")}</select></div>
<div class="fila-pref"><label for="pref-ms">${esc(t("a11y.ms"))}: <output id="pref-ms-valor">${esc(EIA.fmt.num(p.ms / 1000, 1))}</output></label>
<input type="range" id="pref-ms" data-pref="ms" min="500" max="2000" step="100" value="${Number(p.ms)}"></div>
<div class="fila-pref"><label for="pref-rango">${esc(t("a11y.rango"))}: <output id="pref-rango-valor">${esc(t("a11y.grados", { n: EIA.fmt.ent(p.rango) }))}</output></label>
<input type="range" id="pref-rango" data-pref="rango" min="10" max="30" step="2" value="${Number(p.rango)}"></div>
<p class="mut">${esc(t("a11y.rango_ayuda"))}</p>
${interruptor("invertirX", p)}${interruptor("invertirY", p)}
<h3>${esc(t("a11y.sec_ayuda"))}</h3>
<ul><li>${esc(t("a11y.atajo_panel"))}</li><li>${esc(t("a11y.atajo_esc"))}</li><li>${esc(t("a11y.ayuda_teclado"))}</li></ul>`;
  }

  let abierto = null;
  function abrir() {
    if (abierto) return;
    const caja = document.createElement("div"); caja.className = "panel-a11y"; caja.innerHTML = contenido();
    caja.addEventListener("input", e => {
      const el = e.target, clave = el.dataset.pref; if (!clave) return;
      const valor = el.type === "checkbox" ? el.checked : (el.type === "range" ? Number(el.value) : el.value);
      const p = guardar({ [clave]: valor });
      if (clave === "texto") $("#pref-texto-valor", caja).textContent = EIA.fmt.pct(p.texto, 0, { signo: false });
      if (clave === "ms") $("#pref-ms-valor", caja).textContent = EIA.fmt.num(p.ms / 1000, 1);
      if (clave === "rango") $("#pref-rango-valor", caja).textContent = t("a11y.grados", { n: EIA.fmt.ent(p.rango) });
      if (clave === "decal" || clave === "movimiento" || clave === "contraste") EIA.emit("eia:tema", { tema: EIA.tema() }); // los gráficos se redibujan
    });
    caja.addEventListener("click", async e => {
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

  EIA.a11y = { abrir, leer, guardar };
})(window);
