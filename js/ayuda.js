/* Ayuda (ayuda.html) — Spec W13 G.4, bloque Cuenta. Primeros pasos, qué hay en cada página (los subtítulos de cada
   módulo, sin duplicar textos), atajos de teclado, comandos de voz (las mismas claves de la ayuda de voz), glosario y
   preguntas frecuentes, con un filtro de búsqueda que tolera tildes y mayúsculas (EIA.normalizar). */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  /** Subtítulo de cada página (descripción en «Qué hay en cada página»). */
  const SUBTITULO = { configuracion: "config.sub" };
  /** Atajos: [teclas (no se traducen), clave de la descripción]. */
  const ATAJOS = [["Ctrl + K", "at_buscar"], ["/", "at_barra"], ["Alt + Shift + A", "at_a11y"], ["Alt + Shift + V", "at_voz"], ["Esc", "at_esc"], ["← →  ↑ ↓", "at_flechas"], ["Tab · Shift + Tab", "at_tab"]];
  const VOZ = ["ayuda_ir", "ayuda_nav", "ayuda_activo", "ayuda_buscar", "ayuda_vista", "ayuda_filtros", "ayuda_lectura", "ayuda_acciones", "ayuda_detener"];
  /** Glosario: [término (clave existente o texto propio), clave de la definición]. */
  const GLOSARIO = [["dashboard.col_vol", "def_volatilidad"], ["dashboard.col_beta", "def_beta"], ["=Sharpe", "def_sharpe"], ["=CVaR", "def_cvar"],
    ["backtesting.col_max_drawdown_pct", "def_drawdown"], ["activo.col_correlacion", "def_correlacion"], ["clasificacion.col_consenso", "def_consenso"],
    ["regresion.serie_banda", "def_banda"], ["ayuda.term_base", "def_base"]];
  const FAQ = ["f1", "f2", "f3", "f4", "f5", "f6"];

  /** Pura: ¿el texto de un elemento contiene la búsqueda? (sin tildes ni mayúsculas) */
  const coincide = (texto, q) => !EIA.normalizar(q) || EIA.normalizar(texto).includes(EIA.normalizar(q));
  const Ayuda = { coincide, SUBTITULO, ATAJOS, VOZ, GLOSARIO, FAQ };
  if (typeof module !== "undefined" && module.exports) module.exports = Ayuda;
  if (typeof document === "undefined") return;
  global.Ayuda = Ayuda;

  const { $, $$ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p);
  let enlazado = false;
  const seccion = (id, titulo, cuerpo) => `<section class="card ayuda-seccion" aria-labelledby="h-${id}"><h2 id="h-${id}">${esc(titulo)}</h2>${cuerpo}</section>`;

  function pintar() {
    const termino = k => (k[0] === "=" ? k.slice(1) : t(k, { base: EIA.fmt.ent(100) }));
    $("#ayuda-contenido").innerHTML = [
      seccion("inicio", t("ayuda.inicio_titulo"), `<ol class="ayuda-lista">${["inicio_1", "inicio_2", "inicio_3", "inicio_4"].map(k => `<li class="ayuda-item">${esc(t("ayuda." + k))}</li>`).join("")}</ol>`),
      seccion("modulos", t("ayuda.modulos_titulo"), comun.NAVEGACION.map(([b, l]) => `<h3>${esc(t("nav.bloque_" + b))}</h3><dl class="ayuda-dl">${l.map(p =>
        `<div class="ayuda-item"><dt><a href="${p[0]}">${esc(t(p[1]))}</a></dt><dd>${esc(t(SUBTITULO[p[2]] || p[2] + ".sub"))}</dd></div>`).join("")}</dl>`).join("")),
      seccion("atajos", t("ayuda.atajos_titulo"), `<div class="tw" role="region" tabindex="0" aria-label="${esc(t("ayuda.atajos_titulo"))}"><table><caption class="sr">${esc(t("ayuda.atajos_titulo"))}</caption><thead><tr><th scope="col" class="l">${esc(t("ayuda.col_atajo"))}</th><th scope="col" class="l">${esc(t("ayuda.col_accion"))}</th></tr></thead><tbody>${
        ATAJOS.map(([k, d]) => `<tr class="ayuda-item"><th scope="row" class="l"><kbd>${esc(k)}</kbd></th><td class="l">${esc(t("ayuda." + d))}</td></tr>`).join("")}</tbody></table></div>`),
      seccion("voz", t("ayuda.voz_titulo"), `<p class="mut">${esc(t("voz.ayuda_intro"))}</p><ul class="ayuda-lista">${VOZ.map(k => `<li class="ayuda-item">${esc(t("voz." + k))}</li>`).join("")}</ul>`),
      seccion("glosario", t("ayuda.glosario_titulo"), `<dl class="ayuda-dl">${GLOSARIO.map(([term, d]) => `<div class="ayuda-item"><dt>${esc(termino(term))}</dt><dd>${esc(t("ayuda." + d))}</dd></div>`).join("")}</dl>`),
      seccion("faq", t("ayuda.faq_titulo"), FAQ.map(f => `<details class="ayuda-item faq"><summary>${esc(t("ayuda." + f + "_p"))}</summary><p>${esc(t("ayuda." + f + "_r"))}</p></details>`).join(""))
    ].join("");
    filtrar();
  }

  function filtrar() {
    const q = $("#ayuda-q").value;
    let visibles = 0;
    $$(".ayuda-seccion").forEach(s => {
      const items = $$(".ayuda-item", s);
      let n = 0;
      items.forEach(it => { const si = coincide(it.textContent, q); it.hidden = !si; if (si) n++; if (si && q && it.tagName === "DETAILS") it.open = true; });
      $$("h3", s).forEach(h => { const dl = h.nextElementSibling; h.hidden = !!dl && $$(".ayuda-item", dl).every(x => x.hidden); });
      s.hidden = n === 0; visibles += n;
    });
    $("#ayuda-estado").textContent = !EIA.normalizar(q) ? "" : visibles ? t("ayuda.resultados", { n: visibles }) : t("ayuda.sin_resultados");
  }

  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    $("#ayuda-q").addEventListener("input", filtrar);
    $("#ayuda-tour").addEventListener("click", () => EIA.tour.iniciar());
  }

  EIA.modulo({ id: "ayuda", async cargar() { return {}; }, pintar() { enlazar(); pintar(); } });
})(typeof window !== "undefined" ? window : globalThis);
