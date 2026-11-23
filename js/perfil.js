/* Perfil (perfil.html) — Spec W13 G.4, bloque Cuenta. Sin cuentas ni servidores: el alias, el perfil de riesgo y las
   preferencias se guardan en este navegador (eia_perfil). El perfil de riesgo es ORIENTATIVO (no es asesoría): cinco
   preguntas puntuadas de 1 a 3 sugieren uno de los tres niveles de Portafolios. La actividad se deriva de la cartera
   simulada (EIA.cartera), de las órdenes, de las alertas y de la watchlist. Modelo de vista puro + pintado + EIA.modulo. */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const MAX_ALIAS = 24;
  const PREGUNTAS = ["p1", "p2", "p3", "p4", "p5"], OPCIONES = ["a", "b", "c"];
  /** Puntaje total (de 5 a 15) → nivel sugerido: hasta 8, Conservador; hasta 11, Moderado; desde 12, Agresivo. */
  const UMBRALES = [[8, "Conservador"], [11, "Moderado"], [Infinity, "Agresivo"]];

  /* ═════════════ Modelo de vista (puro) ═════════════ */

  /** Nivel sugerido; null si falta alguna respuesta. respuestas = {p1: "a" | "b" | "c", …}. */
  function nivelDe(respuestas) {
    const r = respuestas || {};
    if (PREGUNTAS.some(p => !OPCIONES.includes(r[p]))) return null;
    const puntos = PREGUNTAS.reduce((s, p) => s + OPCIONES.indexOf(r[p]) + 1, 0);
    return { puntos, max: PREGUNTAS.length * OPCIONES.length, nivel: UMBRALES.find(u => puntos <= u[0])[1] };
  }
  /** Alias válido: entre 1 y MAX_ALIAS caracteres (contados como grafemas simples), sin espacios a los lados. */
  const aliasValido = a => { const s = String(a || "").trim(); return s.length > 0 && Array.from(s).length <= MAX_ALIAS; };

  const Perfil = { nivelDe, aliasValido, PREGUNTAS, OPCIONES, UMBRALES, MAX_ALIAS };
  if (typeof module !== "undefined" && module.exports) module.exports = Perfil;
  if (typeof document === "undefined") return;
  global.Perfil = Perfil;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p), usd = x => EIA.fmt.usd(x);
  let D = null, enlazado = false;
  const perfil = () => EIA.estado.get("eia_perfil") || {};
  const guardarPerfil = cambio => EIA.estado.set("eia_perfil", Object.assign(perfil(), cambio));

  function pintarDatos() {
    const p = perfil(), ini = EIA.iniciales(p.alias);
    $("#avatar").innerHTML = ini ? esc(ini) : EIA.ui.icono("usuario");
    $("#saludo").textContent = p.alias ? t("shell.cuenta_saludo", { alias: p.alias }) : t("shell.cuenta_demo");
    $("#saludo").classList.toggle("mut", !p.alias);
    $("#alias").value = p.alias || "";
    $("#alias").maxLength = MAX_ALIAS;
  }

  function pintarActividad() {
    const precio = tk => { const a = D.c10.find(x => x.ticker === tk); return a ? a.ultimo : NaN; };
    const c = EIA.estado.get(EIA.cartera.clave()) || EIA.cartera.copia(D.c11.portafolio_demo);
    const valor = EIA.cartera.valor(c, precio), inicial = EIA.cartera.valorInicial(D.c11.portafolio_demo);
    const ordenes = (EIA.estado.get(EIA.cartera.claveOrdenes()) || []).length;
    const alertas = EIA.alertas.lista(D.c11).filter(a => a.activa).length;
    // Lista compacta: la etiqueta es el enlace a la página de origen (sin «Ver» repetidos para el lector de pantalla)
    const kpi = (rot, html, href) => `<div><dt>${href ? `<a href="${href}">${esc(rot)}</a>` : esc(rot)}</dt><dd>${html}</dd></div>`;
    $("#actividad").innerHTML = [
      kpi(t("perfil.act_valor"), esc(usd(valor)), "trading.html"),
      kpi(t("perfil.act_retorno"), EIA.ui.variacion((valor / inicial - 1) * 100)),
      kpi(t("perfil.act_ordenes"), esc(EIA.fmt.ent(ordenes)), "ordenes.html"),
      kpi(t("perfil.act_alertas"), esc(EIA.fmt.ent(alertas)), "watchlist.html"),
      kpi(t("perfil.act_watch"), esc(EIA.fmt.ent(EIA.watch.lista().length)), "watchlist.html")
    ].join("");
  }

  function pintarPreguntas() {
    const r = (perfil().riesgo || {}).respuestas || {};
    $("#preguntas").innerHTML = PREGUNTAS.map(p => `<fieldset class="pregunta"><legend>${esc(t("perfil." + p))}</legend>${OPCIONES.map(o =>
      `<label class="opcion"><input type="radio" name="${p}" value="${o}"${r[p] === o ? " checked" : ""}> ${esc(t("perfil." + p + "_" + o))}</label>`).join("")}</fieldset>`).join("");
    pintarResultado();
  }
  function pintarResultado() {
    const g = perfil().riesgo;
    if (!g || !g.nivel) { $("#resultado").innerHTML = ""; return; }
    const nombre = EIA.nombre("nivel", g.nivel);
    $("#resultado").innerHTML = `<div class="resultado-riesgo"><p class="resultado-nivel">${esc(t("perfil.resultado", { nivel: nombre }))}</p>
<p>${esc(t("perfil.explica_" + g.nivel.toLowerCase()))} <span class="mut">${esc(t("perfil.resultado_detalle", { puntos: EIA.fmt.ent(g.puntos), max: EIA.fmt.ent(g.max) }))}</span></p>
<p><a class="btn primary" href="portafolios.html?nivel=${encodeURIComponent(g.nivel)}">${esc(t("perfil.ver_nivel", { nivel: nombre }))}</a></p>
<p class="mut">${esc(t("perfil.resultado_aviso"))}</p></div>`;
  }

  function borrarDatos() {
    EIA.ui.confirmar({ titulo: t("perfil.borrar_titulo"), contenido: `<p>${esc(t("perfil.borrar_texto"))}</p>`, aceptar: t("perfil.borrar_confirmar"), cancelar: t("comun.cancelar") }).then(si => {
      if (!si) return;
      // Todo lo del sitio empieza por «eia_» (watchlist, alertas, cartera, órdenes, notificaciones, perfil y preferencias)
      for (const almacen of [global.localStorage, global.sessionStorage]) {
        try { Object.keys(almacen).filter(k => k.indexOf("eia_") === 0).forEach(k => almacen.removeItem(k)); } catch (e) { /* sin almacenamiento */ }
      }
      EIA.ui.notificar(t("perfil.borrado"), "ok");
      setTimeout(() => global.location.reload(), 600);
    });
  }

  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    const main = $("main");
    main.addEventListener("submit", e => {
      e.preventDefault();
      if (e.target.id === "form-alias") {
        const v = $("#alias").value.trim(), err = $("#alias-error");
        if (!aliasValido(v)) { err.textContent = t("perfil.error_alias", { max: EIA.fmt.ent(MAX_ALIAS) }); $("#alias").setAttribute("aria-invalid", "true"); $("#alias").focus(); return; }
        err.textContent = ""; $("#alias").removeAttribute("aria-invalid");
        guardarPerfil({ alias: v }); pintarDatos();
        EIA.ui.notificar(t("perfil.guardado"), "ok"); EIA.ui.anunciar(t("perfil.guardado"));
      } else if (e.target.id === "form-riesgo") {
        const r = {}; for (const p of PREGUNTAS) { const x = main.querySelector(`input[name="${p}"]:checked`); if (x) r[p] = x.value; }
        const n = nivelDe(r), err = $("#riesgo-error");
        if (!n) { err.textContent = t("perfil.falta"); const libre = PREGUNTAS.find(p => !r[p]); const x = main.querySelector(`input[name="${libre}"]`); if (x) x.focus(); return; }
        err.textContent = "";
        guardarPerfil({ riesgo: Object.assign({ respuestas: r, fecha: new Date().toISOString() }, n) });
        pintarResultado();
        EIA.ui.anunciar(t("perfil.resultado", { nivel: EIA.nombre("nivel", n.nivel) }));
      }
    });
    main.addEventListener("click", e => {
      if (e.target.closest("#borrar")) borrarDatos();
      else if (e.target.closest("#abrir-a11y")) EIA.abrirAccesibilidad();
    });
  }

  EIA.modulo({
    id: "perfil",
    async cargar() {
      const [c10, c11] = await EIA.todos([EIA.universo(), EIA.datos("11_watchlist_alertas_portafolio_demo.json")]);
      return { c10, c11 };
    },
    pintar(datos) { D = datos; enlazar(); pintarDatos(); pintarActividad(); pintarPreguntas(); }
  });
})(typeof window !== "undefined" ? window : globalThis);
