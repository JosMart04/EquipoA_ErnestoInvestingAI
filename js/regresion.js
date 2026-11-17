/* Módulo de Regresión de precios a 30 sesiones (regresion.html).
   Sigue las tareas y restricciones del prompt P04 de la guía más las extensiones del equipo
   (docs/contexto/PROMPTS_INICIALES.md, «extensiones_equipo modulo=regresion») y la estructura del módulo de referencia
   (js/clasificacion.js): 1) modelo de vista puro, probado en Node; 2) pintado; 3) EIA.modulo.
   Entradas: 06_regresores_precio_30d.json (pronósticos y métricas) y 02_precios_sinteticos_504d.json (historia),
   más 10 (universo) y 13 (horizonte). Ninguna cifra de datos está escrita aquí; las constantes de método tienen nombre
   y están en docs/CONTRATO_DATOS.md §6. */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const ARCHIVO = "06_regresores_precio_30d.json", ARCHIVO_HISTORIA = "02_precios_sinteticos_504d.json", ARCHIVO_PARAMETROS = "13_patrones_y_parametros.json";
  const TOLERANCIA_GUIA = 0.01;          // US$: verificación literal de P04 («con tolerancia de 1 centavo»)
  const DECIMALES_RETORNO = 2;           // retorno_proyectado_30d_pct viene redondeado a 2 decimales (contrato I-03b)
  const NIVEL_CONO = 0.80;               // el cono es el intervalo del 80 % (z = 1,2816; contrato I-03)
  const VENTANAS = [60, 120, 252];       // sesiones de historia que se pueden mostrar
  const VENTANA_POR_DEFECTO = 120;       // P04: «últimas 120 sesiones de historia»

  /* ═════════════ Modelo de vista (puro) ═════════════ */

  const redondear = (x, d) => { const k = Math.pow(10, d); return Math.round(x * k) / k; };

  /** R-REG-09 de las dos formas (contrato I-03b y nota N-1). La literal de la guía puede fallar por el redondeo de r. */
  function verificar(p) {
    const r = p.retorno_proyectado_30d_pct, ultima = p.ensamble_mediana[p.ensamble_mediana.length - 1];
    const esperado = p.precio_ultimo * (1 + r / 100);
    const diferencia = Math.abs(ultima - esperado);
    const inverso = redondear((ultima / p.precio_ultimo - 1) * 100, DECIMALES_RETORNO);
    return {
      literal: { esperado, diferencia, cumple: diferencia <= TOLERANCIA_GUIA + 1e-9 },
      inversa: { calculado: inverso, cumple: Math.abs(inverso - r) < 1e-9 }
    };
  }
  /** Resultado de R-REG-09 en todos los activos. */
  function verificacionGlobal(c06) {
    const filas = Object.entries(c06.predicciones).map(([t, p]) => Object.assign({ ticker: t }, verificar(p)));
    return {
      total: filas.length,
      literal: filas.filter(f => f.literal.cumple).length,
      inversa: filas.filter(f => f.inversa.cumple).length,
      fallanLiteral: filas.filter(f => !f.literal.cumple).map(f => f.ticker)
    };
  }

  /** Cifras de calidad de los regresores, todas del JSON (contrato §5). */
  function resumen(c06) {
    const ms = c06.modelos, rango = k => [Math.min.apply(null, ms.map(m => m[k])), Math.max.apply(null, ms.map(m => m[k]))];
    return {
      modelos: ms.length,
      porFamilia: ms.reduce((a, m) => { a[m.familia] = (a[m.familia] || 0) + 1; return a; }, {}),
      mape: rango("mape_30d_pct"), r2: rango("r2_retornos_30d"), mejora: rango("mejora_vs_persistencia_pct"),
      mejoran: ms.filter(m => m.mejora_vs_persistencia_pct > 0).length,
      horizonte: c06.fechas_pronostico.length
    };
  }

  /** Modelos que se dibujan y se listan según la familia y los ocultos (G10). */
  function modelosVisibles(c06, filtros) {
    const f = Object.assign({ familia: "todos", ocultos: [] }, filtros);
    return c06.modelos.filter(m => (f.familia === "todos" || m.familia === f.familia) && !f.ocultos.includes(m.modelo));
  }

  /** Todo lo que necesita el gráfico y las tablas para un activo.
      filtros = {familia, ocultos, ventana}. La historia termina en el corte y el pronóstico empieza en la sesión siguiente. */
  function vistaActivo(c06, c02, ticker, filtros) {
    const p = c06.predicciones[ticker];
    if (!p) return null;
    const f = Object.assign({ ventana: VENTANA_POR_DEFECTO }, filtros);
    const cierres = c02.cierres[ticker] || [], n = Math.min(f.ventana, cierres.length);
    const visibles = new Set(modelosVisibles(c06, f).map(m => m.modelo));
    const ultima = p.ensamble_mediana.length - 1;
    return {
      ticker, ultimo: p.precio_ultimo, retorno: p.retorno_proyectado_30d_pct,
      fechasHistoria: c02.fechas.slice(-n), historia: cierres.slice(-n),
      fechasPronostico: c06.fechas_pronostico.slice(),
      mediana: p.ensamble_mediana, p10: p.banda_p10, p90: p.banda_p90, conoInf: p.cono_volatilidad_inf, conoSup: p.cono_volatilidad_sup,
      modelos: p.modelos.filter(m => visibles.has(m.modelo)).map(m => ({ modelo: m.modelo, familia: m.familia, precios: m.precios })),
      final: { mediana: p.ensamble_mediana[ultima], p10: p.banda_p10[ultima], p90: p.banda_p90[ultima], conoInf: p.cono_volatilidad_inf[ultima], conoSup: p.cono_volatilidad_sup[ultima], fecha: c06.fechas_pronostico[ultima] },
      verificacion: verificar(p)
    };
  }

  const Regresion = { verificar, verificacionGlobal, resumen, modelosVisibles, vistaActivo, TOLERANCIA_GUIA, NIVEL_CONO, VENTANAS, VENTANA_POR_DEFECTO, ARCHIVO };
  if (typeof module !== "undefined" && module.exports) module.exports = Regresion;
  if (typeof document === "undefined") return;
  global.Regresion = Regresion;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $, $$ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p);
  const usd = x => EIA.fmt.usd(x);

  let D = null, R = null, V = null, elegido = null, modeloResaltado = null, enlazado = false, grafico = null;
  const leerFiltros = () => Object.assign({ familia: "todos", ventana: VENTANA_POR_DEFECTO, banda: true, cono: true, soloWatch: false, ocultos: [] },
    (EIA.estado.get("eia_filtros") || {}).regresion);
  function guardarFiltros(cambio) {
    const todo = EIA.estado.get("eia_filtros") || {};
    todo.regresion = Object.assign(leerFiltros(), cambio);
    EIA.estado.set("eia_filtros", todo);
  }

  function pintarFicha() {
    EIA.ui.fichaIA($("#ficha"), {
      que_hace: t("regresion.ficha_que_hace", { h: R.horizonte, n: R.modelos, ml: R.porFamilia.ML || 0, dl: R.porFamilia.DL || 0 }),
      que_tan_bien: t("regresion.ficha_que_tan_bien", {
        mapemin: EIA.fmt.pct(R.mape[0], 2, { signo: false }), mapemax: EIA.fmt.pct(R.mape[1], 2, { signo: false }),
        mejoran: R.mejoran, n: R.modelos, mejmin: EIA.fmt.pct(R.mejora[0], 1, { signo: false }), mejmax: EIA.fmt.pct(R.mejora[1], 1, { signo: false }),
        r2min: EIA.fmt.num(R.r2[0], 3), r2max: EIA.fmt.num(R.r2[1], 3)
      }),
      por_que: t("regresion.ficha_por_que", { n: R.modelos, nivel: EIA.fmt.pct(NIVEL_CONO * 100, 0, { signo: false }) }),
      controlas: t("regresion.ficha_controlas"),
      ignorar: t("regresion.ficha_ignorar")
    });
  }

  function pintarControles() {
    const f = leerFiltros(), watch = EIA.watch.lista();
    const lista = D.universo.filter(a => D.c06.predicciones[a.ticker] && (!f.soloWatch || watch.includes(a.ticker)));
    $("#activo").innerHTML = lista.map(a => `<option value="${esc(a.ticker)}"${a.ticker === elegido ? " selected" : ""}>${esc(t("regresion.opcion_activo", { ticker: a.ticker, nombre: a.nombre }))}</option>`).join("");
    $("#solo-watchlist").checked = !!f.soloWatch;
    pintarEstrella();
    EIA.ui.segmentado($("#filtro-familia"), {
      etiqueta: t("comun.familia"), valor: f.familia,
      opciones: [["todos", t("regresion.familia_todos", { n: R.modelos })]].concat(Object.keys(R.porFamilia).map(k => [k, t("regresion.familia_n", { familia: EIA.nombre("familia", k), n: R.porFamilia[k] })])),
      alCambiar(v) { guardarFiltros({ familia: v }); pintarDatos(); }
    });
    EIA.ui.segmentado($("#ventana"), {
      etiqueta: t("regresion.ventana"), valor: String(f.ventana),
      opciones: VENTANAS.map(v => [String(v), t("regresion.ventana_n", { n: v })]),
      alCambiar(v) { guardarFiltros({ ventana: Number(v) }); pintarDatos(); }
    });
    $("#ver-banda").checked = f.banda;
    $("#ver-cono").checked = f.cono;
    $("#lista-modelos").innerHTML = D.c06.modelos.map(m => `<label class="casilla"><input type="checkbox" data-modelo="${esc(m.modelo)}"${f.ocultos.includes(m.modelo) ? "" : " checked"}> ${esc(EIA.nombre("modelo", m.modelo))} <span class="mut">${esc(EIA.nombre("familia", m.familia))}</span></label>`).join("")
      + `<button type="button" id="mostrar-todos">${esc(t("regresion.mostrar_todos"))}</button>`;
  }
  function pintarEstrella() {
    const b = $("#estrella"), esta = EIA.watch.tiene(elegido);
    b.setAttribute("aria-pressed", String(esta));
    b.setAttribute("aria-label", t(esta ? "regresion.watch_quitar" : "regresion.watch_agregar", { ticker: elegido }));
    b.firstElementChild.textContent = esta ? "★" : "☆";
  }

  /** Opciones de ECharts. Las series del pronóstico empiezan en el último cierre para que la línea no se corte. */
  function opcionesGrafico(c) {
    const f = leerFiltros(), nH = V.historia.length, fechas = V.fechasHistoria.concat(V.fechasPronostico);
    const vacio = n => new Array(n).fill(null);
    const pron = arr => vacio(nH - 1).concat([V.ultimo], arr);           // une el pronóstico con el último cierre
    const etiquetaFecha = v => EIA.fmt.fecha(v);
    const series = [];
    for (const m of V.modelos) {
      const resaltado = m.modelo === modeloResaltado;
      series.push({ name: EIA.nombre("modelo", m.modelo), type: "line", data: pron(m.precios), showSymbol: false, silent: !resaltado, z: resaltado ? 4 : 1,
        lineStyle: { width: resaltado ? 2.5 : 1, color: resaltado ? c.serie[1] : c.mut, opacity: resaltado ? 1 : 0.35 }, emphasis: { disabled: true }, tooltip: { show: false } });
    }
    if (f.banda) {
      series.push({ name: "p10", type: "line", stack: "banda", data: pron(V.p10), showSymbol: false, lineStyle: { opacity: 0 }, silent: true, tooltip: { show: false } });
      series.push({ name: t("regresion.serie_banda"), type: "line", stack: "banda", showSymbol: false, silent: true, tooltip: { show: false }, lineStyle: { opacity: 0 },
        areaStyle: { color: c.ac, opacity: 0.18 }, data: vacio(nH - 1).concat([0], V.p90.map((v, i) => v - V.p10[i])) });
    }
    if (f.cono) for (const [arr, clave] of [[V.conoInf, "regresion.serie_cono_inf"], [V.conoSup, "regresion.serie_cono_sup"]]) {
      series.push({ name: t(clave), type: "line", data: pron(arr), showSymbol: false, lineStyle: { type: "dashed", width: 1.5, color: c.warn }, itemStyle: { color: c.warn } });
    }
    series.push({ name: t("regresion.serie_historia"), type: "line", data: V.historia.concat(vacio(V.fechasPronostico.length)), showSymbol: false, lineStyle: { width: 2, color: c.fg }, itemStyle: { color: c.fg },
      markLine: { symbol: "none", silent: true, lineStyle: { color: c.mut, type: "dotted" }, label: { color: c.mut, formatter: () => t("regresion.corte", { fecha: etiquetaFecha(V.fechasHistoria[nH - 1]) }) }, data: [{ xAxis: nH - 1 }] } });
    series.push({ name: t("regresion.serie_mediana"), type: "line", data: pron(V.mediana), symbol: "circle", symbolSize: 5, z: 5, lineStyle: { width: 3, color: c.ac }, itemStyle: { color: c.ac },
      endLabel: { show: true, color: c.fg, formatter: () => t("regresion.etiqueta_mediana", { precio: usd(V.final.mediana) }) } });
    return {
      textStyle: { color: c.fg },
      grid: { left: 52, right: global.innerWidth < 640 ? 72 : 110, top: 30, bottom: 40 }, // espacio para la etiqueta de la mediana
      tooltip: { trigger: "axis", formatter: ps => tooltip(ps, nH) },
      xAxis: { type: "category", data: fechas, axisLabel: { color: c.mut, formatter: etiquetaFecha }, axisLine: { lineStyle: { color: c.bd } } },
      yAxis: { type: "value", scale: true, axisLabel: { color: c.mut, formatter: v => EIA.fmt.num(v, 0) }, splitLine: { lineStyle: { color: c.bd } } },
      series
    };
  }
  function tooltip(ps, nH) {
    const i = ps.length ? ps[0].dataIndex : 0, fecha = esc(EIA.fmt.fecha(ps.length ? ps[0].axisValue : ""));
    if (i < nH) return fecha + "<br>" + esc(t("regresion.tt_historia", { precio: usd(V.historia[i]) }));
    const k = i - nH;
    return fecha + "<br>" + [t("regresion.tt_mediana", { precio: usd(V.mediana[k]) }), t("regresion.tt_banda", { p10: usd(V.p10[k]), p90: usd(V.p90[k]) }),
      t("regresion.tt_cono", { inf: usd(V.conoInf[k]), sup: usd(V.conoSup[k]) })].map(esc).join("<br>");
  }

  function textoResumen() {
    return t("regresion.resumen", {
      ticker: V.ticker, n: R.modelos, precio: usd(V.final.mediana), fecha: EIA.fmt.fecha(V.final.fecha, "larga"),
      nivel: EIA.fmt.pct(NIVEL_CONO * 100, 0, { signo: false }), inf: usd(V.final.conoInf), sup: usd(V.final.conoSup),
      p10: usd(V.final.p10), p90: usd(V.final.p90)
    });
  }

  function pintarGrafico() {
    const num = v => esc(usd(v));
    grafico = EIA.ui.grafico($("#grafico"), {
      id: "pronostico", alto: 384,
      titulo: t("regresion.grafico_titulo", { ticker: V.ticker, n: R.horizonte }),
      opciones: opcionesGrafico,
      // R-REG-06: alternativa en tabla de los 30 precios de la mediana, con las bandas
      tabla: () => ({
        titulo: t("regresion.tabla_titulo", { ticker: V.ticker, n: R.horizonte }),
        columnas: [
          { clave: "fecha", titulo: t("regresion.col_fecha"), tipo: "texto", ordenable: true, fmt: v => esc(EIA.fmt.fecha(v)) },
          { clave: "mediana", titulo: t("regresion.col_mediana"), tipo: "num", ordenable: true, fmt: num },
          { clave: "p10", titulo: t("regresion.col_p10"), tipo: "num", ordenable: true, fmt: num },
          { clave: "p90", titulo: t("regresion.col_p90"), tipo: "num", ordenable: true, fmt: num },
          { clave: "inf", titulo: t("regresion.col_cono_inf"), tipo: "num", ordenable: true, fmt: num },
          { clave: "sup", titulo: t("regresion.col_cono_sup"), tipo: "num", ordenable: true, fmt: num }
        ],
        filas: V.fechasPronostico.map((fecha, i) => ({ fecha, mediana: V.mediana[i], p10: V.p10[i], p90: V.p90[i], inf: V.conoInf[i], sup: V.conoSup[i] })),
        claveFila: x => x.fecha
      }),
      resumen: textoResumen,
      sonido: () => ({ valores: V.historia.concat(V.mediana) })
    });
  }

  function pintarRetorno() {
    const sube = V.retorno > 0;
    $("#retorno").innerHTML = `<p class="retorno-chip ${V.retorno > 0 ? "up" : (V.retorno < 0 ? "dn" : "mut")}" data-retorno="${esc(V.retorno)}">${
      esc(t(sube ? "regresion.retorno_sube" : "regresion.retorno_baja", { pct: EIA.fmt.pct(V.retorno), n: R.horizonte }))}</p>
<p>${esc(textoResumen())}</p>
<p class="mut">${esc(t("regresion.sin_banda"))}</p>
<p class="acciones"><a class="btn" id="enlace-clasificacion" href="clasificacion.html?t=${encodeURIComponent(V.ticker)}"><span aria-hidden="true">←</span> ${esc(t("regresion.ver_clasificacion"))}</a>
<a class="btn primary" id="enlace-optimizador" href="optimizador.html?t=${encodeURIComponent(V.ticker)}">${esc(t("regresion.ver_optimizador"))} <span aria-hidden="true">→</span></a></p>`;
  }

  /** R-REG-09 con honestidad: la comprobación literal de la guía y la igualdad inversa del contrato (I-03b, nota N-1). */
  function pintarVerificacion() {
    const v = V.verificacion, g = verificacionGlobal(D.c06);
    const estado = ok => `<span class="${ok ? "up" : "dn"}"><span aria-hidden="true">${ok ? "✓" : "✗"}</span> ${esc(t(ok ? "regresion.cumple" : "regresion.no_cumple"))}</span>`;
    $("#verificacion").innerHTML = `<h2>${esc(t("regresion.verif_titulo"))}</h2>
<table><caption>${esc(t("regresion.verif_caption", { ticker: V.ticker }))}</caption>
<thead><tr><th scope="col" class="l">${esc(t("regresion.verif_col_regla"))}</th><th scope="col">${esc(t("regresion.verif_col_valor"))}</th><th scope="col" class="l">${esc(t("regresion.verif_col_resultado"))}</th></tr></thead>
<tbody><tr><th scope="row" class="l">${esc(t("regresion.verif_literal", { tol: usd(TOLERANCIA_GUIA) }))}</th><td>${esc(t("regresion.verif_diferencia", { dif: EIA.fmt.usd(v.literal.diferencia, 4) }))}</td><td class="l">${estado(v.literal.cumple)}</td></tr>
<tr><th scope="row" class="l">${esc(t("regresion.verif_inversa", { d: DECIMALES_RETORNO }))}</th><td>${esc(t("regresion.verif_calculado", { calc: EIA.fmt.pct(v.inversa.calculado), r: EIA.fmt.pct(V.retorno) }))}</td><td class="l">${estado(v.inversa.cumple)}</td></tr></tbody></table>
<p>${esc(t("regresion.verif_global", { literal: g.literal, inversa: g.inversa, total: g.total, lista: g.fallanLiteral.join(", ") }))}</p>
<p class="mut">${esc(t("regresion.verif_explica", { d: DECIMALES_RETORNO }))}</p>`;
  }

  function pintarMetricas() {
    const ms = modelosVisibles(D.c06, leerFiltros());
    const pct = v => esc(EIA.fmt.pct(v, 2, { signo: false }));
    EIA.ui.tabla($("#metricas"), {
      id: "tabla-metricas", titulo: t("regresion.metricas_caption"),
      columnas: [
        { clave: "modelo", titulo: t("comun.modelo"), tipo: "texto", ordenable: true, valor: m => EIA.nombre("modelo", m.modelo), fmt: v => esc(v) },
        { clave: "familia", titulo: t("comun.familia"), tipo: "texto", ordenable: true, fmt: v => esc(EIA.nombre("familia", v)) },
        { clave: "mape_30d_pct", titulo: t("regresion.col_mape"), tipo: "num", ordenable: true, fmt: pct },
        { clave: "mae_relativo_pct", titulo: t("regresion.col_mae"), tipo: "num", ordenable: true, fmt: pct },
        { clave: "rmse_relativo_pct", titulo: t("regresion.col_rmse"), tipo: "num", ordenable: true, fmt: pct },
        { clave: "r2_retornos_30d", titulo: t("regresion.col_r2"), tipo: "num", ordenable: true, fmt: v => esc(EIA.fmt.num(v, 3)) },
        { clave: "mejora_vs_persistencia_pct", titulo: t("regresion.col_mejora"), tipo: "num", ordenable: true, fmt: v => EIA.ui.variacion(v, 1) }
      ],
      filas: ms, claveFila: m => m.modelo, orden: { clave: "mape_30d_pct", dir: "asc" }, elegida: modeloResaltado,
      alElegir(m) {
        modeloResaltado = modeloResaltado === m.modelo ? null : m.modelo;
        if (grafico) grafico.redibujar();
        EIA.ui.anunciar(modeloResaltado ? t("regresion.modelo_resaltado", { modelo: EIA.nombre("modelo", m.modelo) }) : t("regresion.modelo_sin_resaltar"));
      }
    });
  }

  /** Lo que cambia con el activo o los filtros. */
  function pintarDatos() {
    const f = leerFiltros();
    V = vistaActivo(D.c06, D.c02, elegido, f);
    if (modeloResaltado && !V.modelos.some(m => m.modelo === modeloResaltado)) modeloResaltado = null;
    $("#contador").textContent = t("regresion.contador", { modelos: V.modelos.length, total: R.modelos });
    pintarGrafico();
    pintarRetorno();
    pintarVerificacion();
    pintarMetricas();
  }

  function elegir(ticker) {
    elegido = ticker;
    EIA.setActivo(ticker);
    pintarEstrella();
    pintarDatos();
    EIA.ui.anunciar(t("regresion.seleccionado", { ticker }));
  }

  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    const main = $("main");
    main.addEventListener("change", e => {
      const el = e.target;
      if (el.id === "activo") elegir(el.value);
      else if (el.id === "ver-banda") { guardarFiltros({ banda: el.checked }); grafico.redibujar(); }
      else if (el.id === "ver-cono") { guardarFiltros({ cono: el.checked }); grafico.redibujar(); }
      else if (el.id === "solo-watchlist") {
        guardarFiltros({ soloWatch: el.checked });
        const lista = el.checked ? EIA.watch.lista() : null;
        if (lista && lista.length && !lista.includes(elegido)) elegido = lista.find(tk => D.c06.predicciones[tk]) || elegido;
        pintarControles(); pintarDatos();
      } else if (el.dataset.modelo) {
        const f = leerFiltros(), oc = f.ocultos.filter(m => m !== el.dataset.modelo);
        if (!el.checked) oc.push(el.dataset.modelo);
        guardarFiltros({ ocultos: oc }); pintarDatos();
      }
    });
    main.addEventListener("click", e => {
      if (e.target.closest("#estrella")) {
        const agregado = EIA.watch.alternar(elegido);
        pintarEstrella();
        EIA.ui.anunciar(t(agregado ? "regresion.watch_agregado" : "regresion.watch_quitado", { ticker: elegido }));
      } else if (e.target.id === "mostrar-todos") { guardarFiltros({ ocultos: [] }); pintarControles(); pintarDatos(); $("#mostrar-todos").focus(); }
    });
  }

  function pintar(datos) {
    D = datos;
    R = resumen(D.c06);
    const pedido = EIA.activo();
    if (!elegido || !D.c06.predicciones[elegido]) elegido = D.c06.predicciones[pedido] ? pedido : D.universo[0].ticker;
    enlazar();
    pintarFicha();
    EIA.ui.selectorCorte($("#corte-real"));
    pintarControles();
    pintarDatos();
  }

  EIA.modulo({
    id: "regresion",
    async cargar() {
      const [c06, c02, universo, parametros] = await EIA.todos([EIA.datos(ARCHIVO), EIA.datos(ARCHIVO_HISTORIA), EIA.universo(), EIA.datos(ARCHIVO_PARAMETROS)]);
      return { c06, c02, universo, horizonte: parametros.parametros.N_FC };
    },
    pintar
  });
})(typeof window !== "undefined" ? window : globalThis);
