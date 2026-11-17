/* Módulo Dashboard de mercado (index.html) — heredado de la Semana 4 y ampliado (R-HER-01, PLAN_MAESTRO §8.3 M1).
   Estructura del módulo de referencia (js/clasificacion.js): modelo de vista puro + pintado + EIA.modulo.
   Entradas: 10 (mercado), 03 (velas de 120 sesiones) y 02 (cierres de 504 sesiones). Ninguna cifra de datos está escrita aquí. */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const ARCHIVO_MERCADO = "10_dashboard_mercado.json", ARCHIVO_VELAS = "03_ohlcv_sintetico_120d.json", ARCHIVO_CIERRES = "02_precios_sinteticos_504d.json";
  const REFERENCIAS = ["SPY", "QQQ", "EPU"];                        // tarjetas de la base del profesor
  /** Preajustes de rango: [clave, sesiones (21 por mes y 252 por año, contrato §6), unidad del rótulo, cantidad].
      null = toda la historia disponible. */
  const PREAJUSTES = [["1m", 21, "meses", 1], ["3m", 63, "meses", 3], ["velas", "velas"], ["1a", 252, "anios", 1], ["max", null]];
  /** Por defecto, todas las velas del archivo 03 (R-HER-01: «velas de 120 sesiones»); su número se lee del JSON. */
  const PREAJUSTE_POR_DEFECTO = "velas";

  /* ═════════════ Modelo de vista (puro) ═════════════ */

  /** Serie del activo para un rango. Si todo el rango cabe en las velas de 03 se dibujan velas; si no, la línea de cierres de 02
      (en el Modo profesor solo hay 120 velas: «más de 120 sesiones se muestran como línea», PLAN_MAESTRO §8.3 M1).
      rango = {sesiones} o {desde, hasta} (fechas ISO). */
  function serieActivo(c02, c03, ticker, rango) {
    const r = rango || {};
    const f02 = c02.fechas, cierres = c02.cierres[ticker] || [];
    let i0 = 0, i1 = f02.length - 1;
    if (r.sesiones) i0 = Math.max(0, f02.length - r.sesiones);
    if (r.desde) { const k = f02.findIndex(f => f >= r.desde); i0 = k < 0 ? f02.length : k; }
    if (r.hasta) { const k = f02.findIndex(f => f > r.hasta); i1 = (k < 0 ? f02.length : k) - 1; }
    if (i1 < i0) return { tipo: "vacia", fechas: [], cierres: [] };
    const fechas = f02.slice(i0, i1 + 1), v = c03.series[ticker];
    const j0 = c03.fechas.indexOf(fechas[0]), j1 = c03.fechas.indexOf(fechas[fechas.length - 1]);
    if (v && j0 >= 0 && j1 >= j0) {
      return { tipo: "velas", fechas: c03.fechas.slice(j0, j1 + 1), o: v.o.slice(j0, j1 + 1), h: v.h.slice(j0, j1 + 1), l: v.l.slice(j0, j1 + 1), c: v.c.slice(j0, j1 + 1), v: v.v.slice(j0, j1 + 1) };
    }
    return { tipo: "linea", fechas, c: cierres.slice(i0, i1 + 1) };
  }

  /** Mínimo, máximo y variación de la serie (para el resumen y la tabla). */
  function estadisticas(s) {
    const bajos = s.tipo === "velas" ? s.l : s.c, altos = s.tipo === "velas" ? s.h : s.c, n = s.c ? s.c.length : 0;
    if (!n) return null;
    return { n, primero: s.c[0], ultimo: s.c[n - 1], variacion: (s.c[n - 1] / s.c[0] - 1) * 100, min: Math.min.apply(null, bajos), max: Math.max.apply(null, altos) };
  }

  const filasUniverso = (c10, grupo) => c10.filter(a => !grupo || a.grupo === grupo);

  const Dashboard = { serieActivo, estadisticas, filasUniverso, PREAJUSTES, REFERENCIAS };
  if (typeof module !== "undefined" && module.exports) module.exports = Dashboard;
  if (typeof document === "undefined") return;
  global.Dashboard = Dashboard;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p);
  let D = null, elegido = null, S = null, enlazado = false, grafico = null;
  const leerFiltros = () => Object.assign({ grupo: "", rango: PREAJUSTE_POR_DEFECTO, desde: "", hasta: "" }, (EIA.estado.get("eia_filtros") || {}).dashboard);
  function guardarFiltros(cambio) {
    const todo = EIA.estado.get("eia_filtros") || {};
    todo.dashboard = Object.assign(leerFiltros(), cambio);
    EIA.estado.set("eia_filtros", todo);
  }
  const rangoActual = () => {
    const f = leerFiltros();
    if (f.rango === "fechas") return { desde: f.desde || undefined, hasta: f.hasta || undefined };
    const p = PREAJUSTES.find(x => x[0] === f.rango) || PREAJUSTES.find(x => x[0] === PREAJUSTE_POR_DEFECTO);
    return { sesiones: p[1] === "velas" ? D.c03.fechas.length : (p[1] || undefined) };
  };

  function pintarKPIs() {
    $("#kpis").innerHTML = REFERENCIAS.map(tk => D.c10.find(a => a.ticker === tk)).filter(Boolean).map(a => `<div class="card kpi"><div class="mut">${esc(t("dashboard.kpi_nombre", { ticker: a.ticker, nombre: a.nombre }))}</div>
<div class="v">${esc(EIA.fmt.usd(a.ultimo))}</div><div>${esc(t("dashboard.kpi_hoy"))} ${EIA.ui.variacion(a.var_1d_pct)}</div></div>`).join("");
  }

  function pintarControles() {
    const f = leerFiltros();
    $("#activo").innerHTML = D.c10.map(a => `<option value="${esc(a.ticker)}"${a.ticker === elegido ? " selected" : ""}>${esc(t("dashboard.opcion_activo", { ticker: a.ticker, nombre: a.nombre }))}</option>`).join("");
    EIA.ui.segmentado($("#rango"), {
      etiqueta: t("dashboard.rango"), valor: f.rango,
      opciones: PREAJUSTES.map(p => [p[0], p[1] === "velas" ? t("dashboard.rango_velas", { n: D.c03.fechas.length }) : p[2] ? t("dashboard.rango_" + p[2], { n: p[3] }) : t("dashboard.rango_max")]).concat([["fechas", t("dashboard.rango_fechas")]]),
      alCambiar(v) { guardarFiltros({ rango: v }); $("#fechas").hidden = v !== "fechas"; pintarGrafico(); }
    });
    const f02 = D.c02.fechas;
    for (const id of ["desde", "hasta"]) { const el = $("#" + id); el.min = f02[0]; el.max = f02[f02.length - 1]; }
    const sesionesPorDefecto = D.c03.fechas.length;
    $("#desde").value = f.desde || f02[Math.max(0, f02.length - sesionesPorDefecto)];
    $("#hasta").value = f.hasta || f02[f02.length - 1];
    $("#fechas").hidden = f.rango !== "fechas";
    const grupos = Array.from(new Set(D.c10.map(a => a.grupo)));
    $("#filtro-grupo").innerHTML = `<option value="">${esc(t("comun.todos"))}</option>` + grupos.map(g => `<option value="${esc(g)}"${g === f.grupo ? " selected" : ""}>${esc(EIA.nombre("grupo", g))}</option>`).join("");
  }

  function opcionesGrafico(c) {
    const comunes = { textStyle: { color: c.fg }, tooltip: { trigger: "axis" }, grid: { left: 56, right: 16, top: 20, bottom: 56 },
      xAxis: { type: "category", data: S.fechas, axisLabel: { color: c.mut, formatter: v => EIA.fmt.fecha(v) }, axisLine: { lineStyle: { color: c.bd } } },
      yAxis: { scale: true, axisLabel: { color: c.mut }, splitLine: { lineStyle: { color: c.bd } } },
      dataZoom: [{ type: "inside" }, { type: "slider", height: 18, textStyle: { color: c.mut }, labelFormatter: (i, v) => EIA.fmt.fecha(v) }] };
    const serie = S.tipo === "velas"
      ? { type: "candlestick", name: elegido, data: S.o.map((o, i) => [o, S.c[i], S.l[i], S.h[i]]), itemStyle: { color: c.up, color0: c.dn, borderColor: c.up, borderColor0: c.dn } }
      : { type: "line", name: elegido, data: S.c, showSymbol: false, lineStyle: { width: 2, color: c.ac }, itemStyle: { color: c.ac } };
    return Object.assign(comunes, { series: [serie] });
  }

  function pintarGrafico() {
    S = serieActivo(D.c02, D.c03, elegido, rangoActual());
    const est = estadisticas(S), num = v => esc(EIA.fmt.num(v));
    $("#nota-serie").textContent = S.tipo === "linea" ? t("dashboard.nota_linea", { n: D.c03.fechas.length }) : "";
    if (!est) { $("#grafico").innerHTML = `<p class="card">${esc(t("dashboard.rango_vacio"))}</p>`; grafico = null; return; }
    const columnas = [{ clave: "f", titulo: t("dashboard.col_fecha"), tipo: "texto", ordenable: true, fmt: v => esc(EIA.fmt.fecha(v)) }];
    if (S.tipo === "velas") columnas.push({ clave: "o", titulo: t("dashboard.col_apertura"), tipo: "num", ordenable: true, fmt: num }, { clave: "h", titulo: t("dashboard.col_maximo"), tipo: "num", ordenable: true, fmt: num }, { clave: "l", titulo: t("dashboard.col_minimo"), tipo: "num", ordenable: true, fmt: num });
    columnas.push({ clave: "c", titulo: t("dashboard.col_cierre"), tipo: "num", ordenable: true, fmt: num });
    if (S.tipo === "velas") columnas.push({ clave: "v", titulo: t("dashboard.col_volumen"), tipo: "num", ordenable: true, fmt: v => esc(EIA.fmt.compacto(v)) });
    grafico = EIA.ui.grafico($("#grafico"), {
      id: "velas",
      titulo: t(S.tipo === "velas" ? "dashboard.velas_titulo" : "dashboard.linea_titulo", { ticker: elegido }),
      opciones: opcionesGrafico,
      tabla: () => ({
        titulo: t(S.tipo === "velas" ? "dashboard.velas_tabla" : "dashboard.linea_tabla", { ticker: elegido }), columnas,
        filas: S.fechas.map((f, i) => ({ f, o: S.o && S.o[i], h: S.h && S.h[i], l: S.l && S.l[i], c: S.c[i], v: S.v && S.v[i] })), claveFila: x => x.f
      }),
      resumen: () => t("dashboard.velas_resumen", { ticker: elegido, ultimo: EIA.fmt.usd(est.ultimo), fecha: EIA.fmt.fecha(S.fechas[est.n - 1], "larga"), n: EIA.fmt.ent(est.n),
        variacion: EIA.fmt.pct(est.variacion), min: EIA.fmt.usd(est.min), max: EIA.fmt.usd(est.max) }),
      sonido: () => ({ valores: S.c })
    });
  }

  function pintarTabla() {
    const f = leerFiltros(), pct = (v, a) => EIA.ui.variacion(v);
    EIA.ui.tabla($("#universo"), {
      id: "tabla-universo", titulo: t("dashboard.universo_caption"),
      columnas: [
        { clave: "ticker", titulo: t("dashboard.col_ticker"), tipo: "texto", ordenable: true, fmt: v => esc(v) },
        { clave: "grupo", titulo: t("comun.grupo"), tipo: "texto", ordenable: true, valor: a => EIA.nombre("grupo", a.grupo), fmt: v => esc(v) },
        { clave: "ultimo", titulo: t("dashboard.col_ultimo"), tipo: "num", ordenable: true, fmt: v => esc(EIA.fmt.num(v)) },
        { clave: "var_1d_pct", titulo: t("dashboard.col_dias", { n: 1 }), tipo: "num", ordenable: true, fmt: pct },
        { clave: "var_5d_pct", titulo: t("dashboard.col_dias", { n: 5 }), tipo: "num", ordenable: true, fmt: pct },
        { clave: "var_1m_pct", titulo: t("dashboard.col_meses", { n: 1 }), tipo: "num", ordenable: true, fmt: pct },
        { clave: "var_3m_pct", titulo: t("dashboard.col_meses", { n: 3 }), tipo: "num", ordenable: true, fmt: pct },
        { clave: "volatilidad_anual_pct", titulo: t("dashboard.col_vol"), tipo: "num", ordenable: true, fmt: v => esc(EIA.fmt.pct(v, 1, { signo: false })) },
        { clave: "beta_vs_SPY", titulo: t("dashboard.col_beta"), tipo: "num", ordenable: true, fmt: v => esc(EIA.fmt.num(v)) },
        { clave: "watch", titulo: t("dashboard.col_watch"), tipo: "texto", valor: a => (EIA.watch.tiene(a.ticker) ? 1 : 0), fmt: (v, a) => botonWatch(a.ticker) },
        { clave: "enlace", titulo: t("dashboard.col_enlace"), tipo: "texto", fmt: (v, a) => `<a href="clasificacion.html?t=${encodeURIComponent(a.ticker)}">${esc(t("dashboard.ver_clasificacion", { ticker: a.ticker }))}</a>` }
      ],
      filas: filasUniverso(D.c10, f.grupo), claveFila: a => a.ticker, elegida: elegido,
      alElegir(a) { elegir(a.ticker); }
    });
  }
  function botonWatch(tk) {
    const esta = EIA.watch.tiene(tk);
    return `<button type="button" class="estrella" data-watch="${esc(tk)}" aria-pressed="${esta}" aria-label="${esc(t(esta ? "dashboard.watch_quitar" : "dashboard.watch_agregar", { ticker: tk }))}"><span aria-hidden="true">${esta ? "★" : "☆"}</span></button>`;
  }

  function elegir(tk) {
    elegido = tk;
    EIA.setActivo(tk);
    $("#activo").value = tk;
    pintarGrafico();
    pintarTabla();
    EIA.ui.anunciar(t("dashboard.seleccionado", { ticker: tk }));
  }

  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    const main = $("main");
    main.addEventListener("change", e => {
      const el = e.target;
      if (el.id === "activo") elegir(el.value);
      else if (el.id === "filtro-grupo") { guardarFiltros({ grupo: el.value }); pintarTabla(); }
      else if (el.id === "desde" || el.id === "hasta") {
        // Si el usuario invierte las fechas se intercambian, para no mostrar un rango vacío
        let d = $("#desde").value, h = $("#hasta").value;
        if (d && h && d > h) { const x = d; d = h; h = x; $("#desde").value = d; $("#hasta").value = h; }
        guardarFiltros({ desde: d, hasta: h }); pintarGrafico();
      }
    });
    main.addEventListener("click", e => {
      const b = e.target.closest("button[data-watch]");
      if (!b) return;
      const tk = b.dataset.watch, agregado = EIA.watch.alternar(tk);
      pintarTabla();
      EIA.ui.anunciar(t(agregado ? "dashboard.watch_agregado" : "dashboard.watch_quitado", { ticker: tk }));
      const nuevo = Array.from(document.querySelectorAll("button[data-watch]")).find(x => x.dataset.watch === tk); if (nuevo) nuevo.focus();
    });
  }

  function pintar(datos) {
    D = datos;
    const pedido = EIA.activo();
    if (!elegido || !D.c10.some(a => a.ticker === elegido)) elegido = D.c10.some(a => a.ticker === pedido) ? pedido : D.c10[0].ticker;
    enlazar();
    pintarKPIs();
    pintarControles();
    pintarGrafico();
    pintarTabla();
  }

  EIA.modulo({
    id: "dashboard",
    async cargar() {
      const [c10, c03, c02] = await Promise.all([EIA.datos(ARCHIVO_MERCADO), EIA.datos(ARCHIVO_VELAS), EIA.datos(ARCHIVO_CIERRES)]);
      return { c10, c03, c02 };
    },
    pintar
  });
})(typeof window !== "undefined" ? window : globalThis);
