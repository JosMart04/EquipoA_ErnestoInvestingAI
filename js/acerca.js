/* Acerca de (acerca.html) — Spec W13 G.4 (Cuenta) y G.6 / G.10 (veracidad: «lo real y lo sintético se declaran; el uso
   de IA se declara»). Lee la fecha de corte de cada modo (EIA.meta), qué es real y qué es sintético del archivo 13
   (texto libre del material, mostrado en su idioma original si no hay traducción) y cuántos modelos hay en 05 y 06. */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  /** Tecnologías del sitio: [nombre (o «@clave» si se traduce), versión, licencia, clave del uso]. Nombres propios y versiones no se traducen. */
  const TECNOLOGIAS = [["Apache ECharts", "5.5.1", "Apache-2.0", "uso_echarts"], ["MediaPipe Tasks Vision", "1.2.3", "Apache-2.0", "uso_mediapipe"],
    ["Web Speech API", "—", "—", "uso_voz"], ["yfinance", "1.8.0", "Apache-2.0", "uso_yfinance"], ["@acerca.tec_datos", "—", "CC BY 4.0", "uso_datos"],
    ["@acerca.tec_iconos", "—", "—", "uso_iconos"]];
  const ENLACES = [["https://github.com/JosMart04/EquipoA_ErnestoInvestingAI", "repo"], ["https://www.figma.com/make/BWA9B3JoRbAWZiVoPSyoBO", "figma"]];
  const Acerca = { TECNOLOGIAS, ENLACES };
  if (typeof module !== "undefined" && module.exports) module.exports = Acerca;
  if (typeof document === "undefined") return;

  const { $ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p);
  function pintar(D) {
    $("#creditos").textContent = t("shell.pie_creditos");
    const mp = D.metaProfesor || {}, mr = D.metaReal || {};
    const lista = [
      `<li>${esc(mp.fecha_corte ? t("acerca.datos_profesor", { fecha: EIA.fmt.fecha(mp.fecha_corte, "larga") }) : t("acerca.datos_profesor_sin"))}</li>`,
      `<li>${esc(mr.disponible && mr.fecha_corte ? t("acerca.datos_real", { fecha: EIA.fmt.fecha(mr.fecha_corte, "larga") }) : t("acerca.datos_real_sin"))}</li>`
    ];
    if (D.c05 && D.c06) lista.push(`<li>${esc(t("acerca.modelos", { clasif: EIA.fmt.ent(D.c05.modelos.length), regr: EIA.fmt.ent(D.c06.modelos.length) }))}</li>`);
    const p13 = D.c13 || {};
    $("#datos").innerHTML = `<ul class="ayuda-lista">${lista.join("")}</ul>${
      p13.que_es_real ? `<h3>${esc(t("acerca.real_titulo"))}</h3><p>${EIA.textoDatos(p13.que_es_real)}</p>` : ""}${
      p13.que_es_sintetico ? `<h3>${esc(t("acerca.sintetico_titulo"))}</h3><p>${EIA.textoDatos(p13.que_es_sintetico)}</p>` : ""}`;
    $("#tecnologias").innerHTML = `<div class="tw" role="region" tabindex="0" aria-label="${esc(t("acerca.tec_titulo"))}"><table><caption class="sr">${esc(t("acerca.tec_titulo"))}</caption><thead><tr><th scope="col" class="l">${esc(t("acerca.col_tec"))}</th><th scope="col" class="l">${esc(t("acerca.col_uso"))}</th><th scope="col">${esc(t("acerca.col_version"))}</th><th scope="col">${esc(t("acerca.col_licencia"))}</th></tr></thead><tbody>${
      TECNOLOGIAS.map(([n, v, l, u]) => `<tr><th scope="row" class="l">${esc(n[0] === "@" ? t(n.slice(1)) : n)}</th><td class="l">${esc(t("acerca." + u))}</td><td><bdi>${esc(v)}</bdi></td><td><bdi>${esc(l)}</bdi></td></tr>`).join("")}</tbody></table></div>`;
    $("#enlaces").innerHTML = ENLACES.map(([u, k]) => `<li><a href="${esc(u)}" rel="noopener" target="_blank">${esc(t("acerca." + k))}${EIA.ui.icono("externo")}<span class="sr"> ${esc(t("acerca.ventana_nueva"))}</span></a></li>`).join("");
  }
  EIA.modulo({
    id: "acerca",
    async cargar() {
      const opcional = p => p.catch(() => null);
      const [metaProfesor, metaReal, c13, c05, c06] = await EIA.todos([EIA.meta("profesor"), EIA.meta("real"),
        opcional(EIA.datos("13_patrones_y_parametros.json", { modo: "profesor" })), opcional(EIA.datos("05_clasificadores_binarios.json")), opcional(EIA.datos("06_regresores_precio_30d.json"))]);
      return { metaProfesor, metaReal, c13, c05, c06 };
    },
    pintar
  });
})(typeof window !== "undefined" ? window : globalThis);
