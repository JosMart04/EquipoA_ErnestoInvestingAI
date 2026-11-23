/* Módulo Portafolios en 3 niveles de riesgo (portafolios.html).
   Sigue las tareas y restricciones del prompt P06 de la guía (parte de portafolios) más las extensiones del equipo
   (docs/contexto/PROMPTS_INICIALES.md, «extensiones_equipo modulo=portafolios-backtesting») y la estructura de
   js/clasificacion.js. Entradas: 08 (niveles, pesos, razones) y 10 (precios para «Llevar a Trading»).
   OJO (contrato, nota N-4): en los datos del profesor el «Agresivo» rinde y arriesga MENOS que el «Moderado».
   Por eso ningún texto afirma un orden entre niveles: se muestran la descripción del JSON y sus cifras. */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const ARCHIVO = "08_portafolios_3_niveles_riesgo.json";
  const UMBRAL_DETALLE = 0.01; // 08.detalle_activos solo lista pesos ≥ 1 % (contrato I-05)
  const COLA_CVAR = 5;         // el CVaR 95 % es la pérdida media en el 5 % de peores días

  /* ═════════════ Modelo de vista (puro) ═════════════ */

  /** Filas de razones de un nivel: las de detalle_activos (razón literal del JSON) con el peso renormalizado
      tras excluir activos (G10). menores = pesos < 1 % que el archivo no detalla. */
  function razones(nivel, excluidos) {
    const ex = excluidos || [], renorm = EIA.cartera.renormalizar(nivel.pesos, ex);
    const filas = nivel.detalle_activos.map(d => ({
      ticker: d.ticker, grupo: d.grupo, peso: nivel.pesos[d.ticker] != null ? nivel.pesos[d.ticker] : d.peso_pct / 100,
      peso_pct: d.peso_pct, razon: d.razon, excluido: ex.includes(d.ticker), renormalizado: renorm[d.ticker] || 0
    }));
    const detallados = new Set(filas.map(f => f.ticker));
    const menores = Object.entries(nivel.pesos).filter(([tk, w]) => !detallados.has(tk) && w < UMBRAL_DETALLE).map(([ticker, peso]) => ({ ticker, peso, renormalizado: renorm[ticker] || 0 }));
    const suma = Object.values(renorm).reduce((a, b) => a + b, 0);
    return { filas, menores, sumaRenormalizada: suma, quedan: Object.keys(renorm).length };
  }

  /** Matriz de composición: tickers (de mayor a menor peso total) × niveles. */
  function composicion(c08) {
    const tickers = new Set();
    c08.niveles.forEach(n => Object.keys(n.pesos).forEach(tk => tickers.add(tk)));
    const total = tk => c08.niveles.reduce((a, n) => a + (n.pesos[tk] || 0), 0);
    return Array.from(tickers).sort((a, b) => total(b) - total(a)).map(tk => ({ ticker: tk, pesos: c08.niveles.map(n => n.pesos[tk] || 0) }));
  }

  /** Activos con mayor peso de un nivel (para la tarjeta). */
  const principales = (nivel, n) => Object.entries(nivel.pesos).sort((a, b) => b[1] - a[1]).slice(0, n).map(([ticker, peso]) => ({ ticker, peso }));

  const Portafolios = { razones, composicion, principales, UMBRAL_DETALLE, ARCHIVO };
  if (typeof module !== "undefined" && module.exports) module.exports = Portafolios;
  if (typeof document === "undefined") return;
  global.Portafolios = Portafolios;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $, $$ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p);
  const pct = (x, d) => EIA.fmt.pct(x, d == null ? 2 : d, { signo: false });
  const PRINCIPALES = 5;
  let D = null, visto = null, enlazado = false;
  /** Textos libres del JSON (origen, descripción, restricciones, razón): traducidos si el idioma los tiene; si no, en
      español con lang="es" (EIA.textoDatos). */
  const textoDatos = s => EIA.textoDatos(s);
  const elegido = () => { const e = EIA.estado.get("eia_elegido"); return e && e.modo === EIA.modo() ? e : null; };
  const leerExcluidos = nivel => (((EIA.estado.get("eia_filtros") || {}).portafolios || {}).excluidos || {})[nivel] || [];
  function guardarExcluidos(nivel, lista) {
    const todo = EIA.estado.get("eia_filtros") || {}, p = todo.portafolios || { excluidos: {} };
    p.excluidos = Object.assign({}, p.excluidos, { [nivel]: lista });
    todo.portafolios = p;
    EIA.estado.set("eia_filtros", todo);
    const e = elegido(); if (e && e.nivel === nivel) EIA.estado.set("eia_elegido", Object.assign(e, { excluidos: lista }));
  }
  const nivelVisto = () => D.c08.niveles.find(n => n.nivel === visto) || D.c08.niveles[0];

  function pintarFicha() {
    EIA.ui.fichaIA($("#ficha"), {
      que_hace: t("portafolios.ficha_que_hace", { n: D.c08.niveles.length }),
      que_tan_bien: t("portafolios.ficha_que_tan_bien"),
      por_que: t("portafolios.ficha_por_que"),
      controlas: t("portafolios.ficha_controlas"),
      ignorar: t("portafolios.ficha_ignorar")
    });
  }

  function pintarTarjetas() {
    const e = elegido();
    $("#niveles").innerHTML = D.c08.niveles.map(n => {
      const es = e && e.nivel === n.nivel, top = principales(n, PRINCIPALES);
      return `<article class="card nivel${es ? " nivel-elegido" : ""}" aria-labelledby="h-${esc(n.nivel)}" data-nivel="${esc(n.nivel)}">
<h2 id="h-${esc(n.nivel)}">${es ? '<span aria-hidden="true">✓ </span>' : ""}${esc(EIA.nombre("nivel", n.nivel))}</h2>
<p class="mut">${esc(t("portafolios.origen"))} ${textoDatos(n.origen)}</p>
<p>${textoDatos(n.descripcion)}</p>
<dl class="metricas-punto">
<div><dt>${esc(t("portafolios.retorno"))}</dt><dd>${esc(pct(n.retorno_esperado_anual_pct))}</dd></div>
<div><dt>${esc(t("portafolios.volatilidad"))}</dt><dd>${esc(pct(n.volatilidad_anual_pct))}</dd></div>
<div><dt>${esc(t("portafolios.sharpe"))}</dt><dd>${esc(EIA.fmt.num(n.sharpe, 3))}</dd></div>
<div><dt>${esc(t("portafolios.cvar"))}</dt><dd>${esc(pct(n.cvar95_diario_pct))}</dd></div></dl>
<p class="mut">${esc(t("portafolios.cvar_llano", { cvar: pct(n.cvar95_diario_pct), cola: pct(COLA_CVAR, 0) }))}</p>
<p class="mut">${esc(t("portafolios.restricciones"))} ${textoDatos(n.restricciones)}</p>
<h3>${esc(t("portafolios.principales", { n: top.length }))}</h3>
<ul class="lista-pesos">${top.map(w => `<li><span class="tk">${esc(w.ticker)}</span> <span class="barra-peso"><span style="width:${(100 * w.peso / top[0].peso).toFixed(1)}%"></span></span> ${esc(pct(w.peso * 100, 1))}</li>`).join("")}</ul>
<p class="acciones"><button type="button" data-elegir-nivel="${esc(n.nivel)}" aria-pressed="${!!es}">${esc(t(es ? "portafolios.elegido" : "portafolios.elegir", { nivel: EIA.nombre("nivel", n.nivel) }))}</button>
<a class="btn" href="backtesting.html?nivel=${encodeURIComponent(n.nivel)}">${esc(t("portafolios.ver_backtesting"))} <span class="flecha" aria-hidden="true">→</span></a></p>
</article>`;
    }).join("");
  }

  function pintarComposicion() {
    const filas = composicion(D.c08), niveles = D.c08.niveles.map(n => EIA.nombre("nivel", n.nivel));
    EIA.ui.grafico($("#grafico"), {
      id: "composicion", alto: 300,
      titulo: t("portafolios.grafico_titulo"),
      // R-POR-02: barras apiladas por nivel; cada tramo lleva su ticker como etiqueta (el color no es el único canal)
      opciones: c => ({
        textStyle: { color: c.fg },
        tooltip: { trigger: "item", formatter: p => esc(t("portafolios.tt", { ticker: p.seriesName, nivel: p.name, peso: pct(p.value, 1) })) },
        grid: { left: 96, right: 16, top: 16, bottom: 40 },
        xAxis: { type: "value", max: 100, axisLabel: { color: c.mut, formatter: v => EIA.fmt.pct(v, 0, { signo: false }) }, splitLine: { lineStyle: { color: c.bd } } },
        yAxis: { type: "category", data: niveles, axisLabel: { color: c.fg } },
        series: filas.map((f, i) => ({
          name: f.ticker, type: "bar", stack: "pesos", barWidth: "60%",
          data: f.pesos.map(w => w * 100),
          itemStyle: { color: c.serie[i % c.serie.length], borderColor: c.panel, borderWidth: 1 },
          label: { show: true, position: "inside", color: c.serieTexto[i % c.serieTexto.length], fontWeight: "bold", formatter: p => (p.value >= 6 ? f.ticker : "") }
        }))
      }),
      tabla: () => ({
        titulo: t("portafolios.tabla_titulo"),
        columnas: [{ clave: "ticker", titulo: t("comun.activo"), tipo: "texto", ordenable: true, fmt: v => esc(v) }].concat(D.c08.niveles.map((n, k) => ({
          clave: "n" + k, titulo: EIA.nombre("nivel", n.nivel), tipo: "num", ordenable: true, valor: f => f.pesos[k], fmt: v => esc(v > 0 ? pct(v * 100, 2) : t("portafolios.no_incluido"))
        }))),
        filas, claveFila: f => f.ticker
      }),
      resumen: () => t("portafolios.resumen", { lista: D.c08.niveles.map(n => t("portafolios.resumen_nivel", { nivel: EIA.nombre("nivel", n.nivel), n: Object.keys(n.pesos).length, top: principales(n, 1)[0].ticker, peso: pct(principales(n, 1)[0].peso * 100, 1) })).join(" ") }),
      // T-27: cada nivel es una serie de categorías (activos); el punto i es la serie i de ECharts en la barra del nivel k
      sonido: () => ({ inicial: 1, series: D.c08.niveles.map((n, k) => ({ nombre: EIA.nombre("nivel", n.nivel), tipo: "categorias",
        valores: filas.map(f => f.pesos[k] * 100), etiquetas: filas.map(f => f.ticker), formato: v => pct(v, 1), tip: i => ({ seriesIndex: i, dataIndex: k }) })) })
    });
  }

  function pintarRazones() {
    const n = nivelVisto(), ex = leerExcluidos(n.nivel), r = razones(n, ex), e = elegido();
    $("#razones").innerHTML = `<h2>${esc(t("portafolios.razones_titulo", { nivel: EIA.nombre("nivel", n.nivel) }))}</h2>
<p class="mut">${esc(t(e && e.nivel === n.nivel ? "portafolios.razones_elegido" : "portafolios.razones_ayuda"))}</p>
<div class="tw" role="region" tabindex="0" aria-label="${esc(t("portafolios.razones_caption", { nivel: EIA.nombre("nivel", n.nivel) }))}"><table id="tabla-razones"><caption>${esc(t("portafolios.razones_caption", { nivel: EIA.nombre("nivel", n.nivel) }))}</caption>
<thead><tr><th scope="col" class="l">${esc(t("portafolios.col_excluir"))}</th><th scope="col" class="l">${esc(t("comun.activo"))}</th><th scope="col" class="l">${esc(t("comun.grupo"))}</th><th scope="col">${esc(t("portafolios.col_peso"))}</th><th scope="col">${esc(t("portafolios.col_renormalizado"))}</th><th scope="col" class="l">${esc(t("portafolios.col_razon"))}</th></tr></thead>
<tbody>${r.filas.map(f => `<tr data-ticker="${esc(f.ticker)}"${f.excluido ? ' class="excluido"' : ""}>
<td class="l"><label class="casilla"><input type="checkbox" data-excluir="${esc(f.ticker)}"${f.excluido ? " checked" : ""}> <span class="sr">${esc(t("portafolios.excluir_aria", { ticker: f.ticker }))}</span></label></td>
<th scope="row" class="l">${esc(f.ticker)}</th><td class="l">${esc(EIA.nombre("grupo", f.grupo))}</td><td>${esc(pct(f.peso * 100, 1))}</td>
<td>${f.excluido ? esc(t("portafolios.excluido")) : esc(pct(f.renormalizado * 100, 1))}</td><td class="l">${textoDatos(f.razon)}</td></tr>`).join("")}</tbody></table></div>
${r.menores.length ? `<p class="mut">${esc(t("portafolios.menores", { lista: r.menores.map(m => t("portafolios.menor", { ticker: m.ticker, peso: pct(m.peso * 100, 2) })).join(", "), umbral: pct(UMBRAL_DETALLE * 100, 0) }))}</p>` : ""}
<p class="comprobacion">${esc(t("portafolios.comprobacion", { n: r.quedan, suma: pct(r.sumaRenormalizada * 100, 1) }))}</p>
<p class="acciones"><button type="button" class="primary" id="llevar"${r.quedan ? "" : " disabled"}>${esc(t("portafolios.llevar", { nivel: EIA.nombre("nivel", n.nivel) }))}</button>
<a class="btn" href="trading.html">${esc(t("portafolios.ir_trading"))} <span class="flecha" aria-hidden="true">→</span></a></p>`;
  }

  function elegirNivel(nivel) {
    const n = D.c08.niveles.find(x => x.nivel === nivel); if (!n) return;
    const previo = EIA.estado.get("eia_elegido") || {};
    EIA.estado.set("eia_elegido", { modo: EIA.modo(), nivel: n.nivel, origen: n.origen, fecha: D.c08.fecha, pesos: n.pesos, excluidos: leerExcluidos(n.nivel),
      llevado_a_trading: !!(previo.nivel === n.nivel && previo.llevado_a_trading), aplicado: previo.aplicado || null });
    visto = n.nivel;
    pintarTarjetas(); pintarRazones();
    const b = $$("button[data-elegir-nivel]").find(x => x.dataset.elegirNivel === nivel); if (b) b.focus();
    EIA.ui.anunciar(t("portafolios.anuncio_elegido", { nivel: EIA.nombre("nivel", n.nivel) }));
  }

  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    const main = $("main");
    main.addEventListener("click", e => {
      const b = e.target.closest("button[data-elegir-nivel]");
      if (b) { elegirNivel(b.dataset.elegirNivel); return; }
      if (e.target.closest("#llevar")) {
        const n = nivelVisto();
        EIA.ui.llevarATrading({ pesos: n.pesos, excluidos: leerExcluidos(n.nivel), nivel: n.nivel, origen: n.origen, fuente: "portafolios", alTerminar() { pintarTarjetas(); pintarRazones(); } });
      }
    });
    main.addEventListener("change", e => {
      const tk = e.target.dataset && e.target.dataset.excluir;
      if (!tk) return;
      const n = nivelVisto(), lista = leerExcluidos(n.nivel).filter(x => x !== tk);
      if (e.target.checked) lista.push(tk);
      guardarExcluidos(n.nivel, lista);
      pintarRazones();
      const vuelta = $$("input[data-excluir]").find(x => x.dataset.excluir === tk); if (vuelta) vuelta.focus();
      EIA.ui.anunciar(t(e.target.checked ? "portafolios.anuncio_excluido" : "portafolios.anuncio_incluido", { ticker: tk }));
    });
  }

  function pintar(datos) {
    D = datos;
    const e = elegido(), pedido = new URLSearchParams(global.location.search).get("nivel");
    if (!visto) visto = (D.c08.niveles.find(n => n.nivel === pedido) || {}).nivel || (e && e.nivel) || D.c08.niveles[0].nivel;
    enlazar();
    pintarFicha();
    EIA.ui.selectorCorte($("#corte-real"));
    pintarTarjetas();
    pintarComposicion();
    pintarRazones();
  }

  EIA.modulo({ id: "portafolios", async cargar() { return { c08: await EIA.datos(ARCHIVO) }; }, pintar });
})(typeof window !== "undefined" ? window : globalThis);
