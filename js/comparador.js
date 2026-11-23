/* Comparador de activos (comparador.html?activos=A,B,C) — Spec W13 G.4, bloque Mercado.
   Curvas en base 100 sobre los cierres de 02 (mismo esquema en el Modo real) y, para el periodo elegido, retorno,
   volatilidad y beta calculados en el navegador (se declara en la página); la correlación es la de 04.
   Modelo de vista puro + pintado + EIA.modulo. Ninguna cifra de datos está escrita aquí. */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const Mk = (global.EIALib && global.EIALib.mercado) || require("./lib/mercado.js");
  const ARCHIVO_CIERRES = "02_precios_sinteticos_504d.json", ARCHIVO_CORR = "04_matriz_correlacion_covarianza.json";
  const MAXIMO = 5;               // activos a la vez: más líneas ya no se distinguen (ni por color ni por trazo)
  const BASE = 100;               // las curvas parten de 100 en la primera sesión del periodo
  const REFERENCIA_BETA = "SPY";
  /** Periodos: [clave, sesiones (21 por mes, 252 por año, contrato §6), unidad del rótulo, cantidad]; null = toda la historia. */
  const PERIODOS = [["1m", 21, "meses", 1], ["3m", 63, "meses", 3], ["6m", 126, "meses", 6], ["1a", 252, "anios", 1], ["max", null]];
  const TRAZOS = ["solid", "dashed", "dotted", "solid", "dashed"];

  /* ═════════════ Modelo de vista (puro) ═════════════ */

  /** Selección válida: tickers del universo, sin repetir y como mucho MAXIMO. */
  function normalizar(lista, universo, maximo) {
    const validos = new Set(universo), out = [];
    for (const tk of lista || []) if (validos.has(tk) && !out.includes(tk)) out.push(tk);
    return out.slice(0, maximo || MAXIMO);
  }
  /** Lee la selección de un texto «A,B,C» (parámetro de la URL). */
  const deTexto = s => String(s || "").split(",").map(x => x.trim().toUpperCase()).filter(Boolean);
  const sesionesDe = clave => { const p = PERIODOS.find(x => x[0] === clave) || PERIODOS[3]; return p[1] || undefined; };

  const Comparador = { normalizar, deTexto, sesionesDe, PERIODOS, MAXIMO, BASE };
  if (typeof module !== "undefined" && module.exports) module.exports = Comparador;
  if (typeof document === "undefined") return;
  global.Comparador = Comparador;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p), I = (n, c) => EIA.ui.icono(n, c);
  let D = null, sel = [], periodo = "1a", enlazado = false;

  function guardar() {
    EIA.estado.set("eia_comparador", { activos: sel, periodo });
    try { const u = new URL(global.location.href); u.searchParams.set("activos", sel.join(",")); global.history.replaceState(null, "", u.pathname.split("/").pop() + u.search); } catch (e) { /* sin historial */ }
  }

  function pintarSeleccion() {
    const nombre = tk => (D.c10.find(a => a.ticker === tk) || {}).nombre || tk;
    $("#seleccion").innerHTML = sel.map((tk, i) => `<li class="sel-chip"><span class="muestra-trazo mt-${i}" aria-hidden="true"></span><a href="activo.html?t=${encodeURIComponent(tk)}"><bdi>${esc(tk)}</bdi></a> <span class="mut">${esc(nombre(tk))}</span>
<button type="button" class="quitar-sel" data-quitar="${esc(tk)}" aria-label="${esc(t("comparador.quitar_aria", { ticker: tk }))}">${I("cerrar")}</button></li>`).join("");
    const libres = D.c10.filter(a => !sel.includes(a.ticker));
    $("#agregar-activo").innerHTML = libres.map(a => `<option value="${esc(a.ticker)}">${esc(t("dashboard.opcion_activo", { ticker: a.ticker, nombre: a.nombre }))}</option>`).join("");
    const lleno = sel.length >= MAXIMO;
    $("#btn-agregar").disabled = lleno; $("#agregar-activo").disabled = lleno;
    $("#aviso-maximo").textContent = lleno ? t("comparador.maximo", { n: EIA.fmt.ent(MAXIMO) }) : "";
    EIA.ui.segmentado($("#periodo"), {
      etiqueta: t("dashboard.rango"), valor: periodo,
      opciones: PERIODOS.map(p => [p[0], p[2] ? t("dashboard.rango_" + p[2], { n: p[3] }) : t("dashboard.rango_max")]),
      alCambiar(v) { periodo = v; guardar(); pintarResultados(); }
    });
  }

  function pintarResultados() {
    if (!sel.length) {
      $("#grafico").innerHTML = EIA.ui.vacio({ icono: "comparar", titulo: t("comparador.vacio_titulo"), texto: t("comparador.vacio_texto") });
      $("#metricas").innerHTML = ""; $("#correlacion").innerHTML = "";
      return;
    }
    const ses = sesionesDe(periodo), B = Mk.base100(D.c02.cierres, sel, ses, D.c02.fechas);
    const fin = B.fechas.length - 1, f = v => EIA.fmt.num(v, 1);
    EIA.ui.grafico($("#grafico"), {
      id: "comparacion", alto: 400,
      titulo: t("comparador.grafico_titulo", { base: EIA.fmt.ent(BASE) }),
      opciones: c => ({
        textStyle: { color: c.fg }, tooltip: { trigger: "axis", valueFormatter: v => f(v) }, legend: { top: 0, textStyle: { color: c.fg } },
        grid: { left: 56, right: 76, top: 40, bottom: 56 },
        xAxis: { type: "category", data: B.fechas, axisLabel: { color: c.mut, formatter: v => EIA.fmt.fecha(v) }, axisLine: { lineStyle: { color: c.bd } } },
        yAxis: { scale: true, axisLabel: { color: c.mut }, splitLine: { lineStyle: { color: c.bd } } },
        dataZoom: [{ type: "inside" }, { type: "slider", height: 18, bottom: 8, textStyle: { color: c.mut }, labelFormatter: (i, v) => EIA.fmt.fecha(v) }],
        // Cada línea: color, trazo y el nombre al final (nunca solo el color)
        series: sel.map((tk, i) => ({ type: "line", name: tk, data: B.series[tk], showSymbol: false,
          lineStyle: { width: 2.2, color: c.serie[i % c.serie.length], type: TRAZOS[i] }, itemStyle: { color: c.serie[i % c.serie.length] },
          endLabel: { show: true, formatter: "{a}", color: c.fg, fontWeight: 600 },
          markLine: i === 0 ? { silent: true, symbol: "none", label: { show: false }, lineStyle: { color: c.mut, type: "dashed" }, data: [{ yAxis: BASE }] } : undefined }))
      }),
      tabla: () => ({
        titulo: t("comparador.tabla_titulo", { base: EIA.fmt.ent(BASE) }),
        columnas: [{ clave: "f", titulo: t("dashboard.col_fecha"), tipo: "texto", ordenable: true, fmt: v => esc(EIA.fmt.fecha(v)) }]
          .concat(sel.map(tk => ({ clave: tk, titulo: tk, tipo: "num", ordenable: true, fmt: v => esc(f(v)) }))),
        filas: B.fechas.map((fe, i) => Object.assign({ f: fe }, ...sel.map(tk => ({ [tk]: B.series[tk][i] })))), claveFila: x => x.f
      }),
      resumen: () => t("comparador.resumen", { desde: EIA.fmt.fecha(B.fechas[0], "larga"), hasta: EIA.fmt.fecha(B.fechas[fin], "larga"),
        lista: EIA.fmt.lista(sel.map(tk => t("comparador.serie_final", { ticker: tk, valor: f(B.series[tk][fin]) }))) }),
      sonido: () => ({ series: sel.map((tk, i) => ({ nombre: tk, valores: B.series[tk], etiquetas: B.fechas.map(x => EIA.fmt.fecha(x)), formato: v => f(v), indice: i })) })
    });
    pintarMetricas(ses);
    pintarCorrelacion();
  }

  function pintarMetricas(ses) {
    const filas = Mk.metricasPeriodo(D.c02.cierres, sel, ses, D.c02.fechas, REFERENCIA_BETA).map(m => Object.assign(m, { ultimo: (D.c10.find(a => a.ticker === m.ticker) || {}).ultimo }));
    EIA.ui.tabla($("#metricas"), {
      id: "tabla-comparacion", titulo: t("comparador.metricas_caption"),
      columnas: [
        { clave: "ticker", titulo: t("comun.activo"), tipo: "texto", ordenable: true, fmt: v => `<a href="activo.html?t=${encodeURIComponent(v)}">${esc(v)}</a>` },
        { clave: "ultimo", titulo: t("dashboard.col_ultimo"), tipo: "num", ordenable: true, fmt: v => esc(EIA.fmt.usd(v)) },
        { clave: "retorno", titulo: t("comparador.col_retorno"), tipo: "num", ordenable: true, fmt: v => EIA.ui.variacion(v) },
        { clave: "volatilidad", titulo: t("comparador.col_vol"), tipo: "num", ordenable: true, fmt: v => esc(EIA.fmt.pct(v, 1, { signo: false })) },
        { clave: "beta", titulo: t("comparador.col_beta", { ref: REFERENCIA_BETA }), tipo: "num", ordenable: true, fmt: v => esc(isFinite(v) ? EIA.fmt.num(v) : "—") }
      ],
      filas, claveFila: x => x.ticker, orden: { clave: "retorno", dir: "desc" }
    });
  }

  function pintarCorrelacion() {
    if (!D.c04 || sel.length < 2) { $("#correlacion").innerHTML = `<p class="mut">${esc(t(D.c04 ? "comparador.corr_minimo" : "activo.corr_sin_datos"))}</p>`; return; }
    const celda = (a, b) => { const r = Mk.correlacion(D.c04, a, b); return r == null ? "—" : EIA.fmt.num(r); };
    $("#correlacion").innerHTML = `<div class="tw" role="region" tabindex="0" aria-label="${esc(t("comparador.corr_caption"))}"><table class="corr"><caption>${esc(t("comparador.corr_caption"))}</caption>
<thead><tr><td></td>${sel.map(tk => `<th scope="col">${esc(tk)}</th>`).join("")}</tr></thead>
<tbody>${sel.map(a => `<tr><th scope="row" class="l">${esc(a)}</th>${sel.map(b => `<td>${esc(celda(a, b))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    const main = $("main");
    main.addEventListener("submit", e => {
      if (e.target.id !== "form-agregar") return;
      e.preventDefault();
      const tk = $("#agregar-activo").value;
      if (!tk || sel.length >= MAXIMO) return;
      sel = normalizar(sel.concat([tk]), D.c10.map(a => a.ticker));
      guardar(); pintarSeleccion(); pintarResultados();
      EIA.ui.anunciar(t("comparador.anuncio_agregado", { ticker: tk }));
      const b = $("#btn-agregar"); if (b && !b.disabled) $("#agregar-activo").focus();
    });
    main.addEventListener("click", e => {
      const b = e.target.closest("button[data-quitar]");
      if (!b) return;
      const tk = b.dataset.quitar;
      sel = sel.filter(x => x !== tk);
      guardar(); pintarSeleccion(); pintarResultados();
      EIA.ui.anunciar(t("comparador.anuncio_quitado", { ticker: tk }));
      const siguiente = $("#seleccion button[data-quitar]") || $("#agregar-activo"); if (siguiente) siguiente.focus();
    });
  }

  function pintar(datos) {
    D = datos;
    const universo = D.c10.map(a => a.ticker), guardado = EIA.estado.get("eia_comparador") || {};
    const pedido = deTexto(new URLSearchParams(global.location.search).get("activos"));
    if (!sel.length) sel = normalizar(pedido.length ? pedido : guardado.activos && guardado.activos.length ? guardado.activos : [EIA.activo() || universo[0], REFERENCIA_BETA], universo);
    if (guardado.periodo && PERIODOS.some(p => p[0] === guardado.periodo) && !pedido.length) periodo = guardado.periodo;
    enlazar();
    pintarSeleccion();
    pintarResultados();
  }

  EIA.modulo({
    id: "comparador",
    async cargar() {
      const [c10, c02, c04] = await EIA.todos([EIA.universo(), EIA.datos(ARCHIVO_CIERRES), EIA.datos(ARCHIVO_CORR).catch(() => null)]);
      return { c10, c02, c04 };
    },
    pintar
  });
})(typeof window !== "undefined" ? window : globalThis);
