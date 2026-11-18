/* Módulo Backtesting de portafolios (backtesting.html).
   Sigue las tareas y restricciones del prompt P06 de la guía (parte de backtesting) más las extensiones del equipo
   (docs/contexto/PROMPTS_INICIALES.md, «extensiones_equipo modulo=portafolios-backtesting») y la estructura de
   js/clasificacion.js. Entradas: 09 (curvas, métricas, rebalanceos) y 13 (tope por activo y tasa libre de riesgo).
   La interpretación se GENERA POR REGLAS a partir de los números (R-BT-04): no hay conclusiones escritas en el código.
   Se publica tal como sale (R-BT-07): en los datos del profesor las tres carteras pierden frente a SPY y hay que explicarlo.
   Inconsistencia del material (contrato, nota N-3): en 09 el perfil Agresivo llega a pesos de 0,35 aunque 08 y 13
   dicen tope 25 %. No se corrige: se detecta en los datos y se muestra una nota. */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const ARCHIVO = "09_backtesting_portafolios.json", ARCHIVO_PARAMETROS = "13_patrones_y_parametros.json";
  const TOLERANCIA_PP = 0.05;  // R-BT-06: curva final frente a retorno total, ± 0,05 puntos porcentuales (guía, P06)
  const COMISION = 0.0005;     // 5 pb sobre el turnover (09.metodo y contrato §6)
  const REFERENCIA = "SPY";    // la guía compara cada cartera con SPY
  const UNO_N = "Igual ponderado (1/N)";
  const CIERRES = "cierres_historicos.json"; // Modo real: historia completa para recalcular (contrato §7)
  const OPCIONES_FIN = 13;                   // el último cierre y los 12 fines de mes anteriores

  /* ═════════════ Modelo de vista (puro) ═════════════ */

  /** Drawdown en % de una curva (≤ 0). Las referencias no lo traen en 09: se deriva (contrato §5). */
  function drawdown(curva) { let mx = -Infinity; return curva.map(v => { if (v > mx) mx = v; return (v / mx - 1) * 100; }); }

  /** Las 7 series: 3 carteras y 4 referencias, con su drawdown. */
  function series(c09) {
    const carteras = Object.entries(c09.carteras).map(([clave, c]) => ({ clave, tipo: "cartera", curva: c.curva, drawdown: c.drawdown, metricas: c.metricas, turnover: c.turnover_medio, rebalanceos: c.rebalanceos }));
    const refs = Object.entries(c09.referencias).map(([clave, r]) => ({ clave, tipo: "referencia", curva: r.curva, drawdown: drawdown(r.curva), metricas: r.metricas }));
    return carteras.concat(refs);
  }

  /** R-BT-06 en cada serie: curva[-1]/base − 1 frente a retorno_total_pct. */
  function verificar(c09) {
    return series(c09).map(s => {
      const dif = Math.abs((s.curva[s.curva.length - 1] / c09.base - 1) * 100 - s.metricas.retorno_total_pct);
      return { clave: s.clave, dif, cumple: dif <= TOLERANCIA_PP + 1e-9 };
    });
  }

  /** Peso máximo que alcanzó cada cartera en sus rebalanceos (para la nota del tope). */
  const pesoMaximo = c => Math.max.apply(null, c.rebalanceos.map(r => Math.max.apply(null, Object.values(r.pesos))));
  /** Peso medio de un activo en los rebalanceos de una cartera (0 si nunca entró). */
  const pesoMedio = (c, tk) => c.rebalanceos.reduce((a, r) => a + (r.pesos[tk] || 0), 0) / c.rebalanceos.length;

  /** Interpretación por reglas (R-BT-04). Devuelve hechos y causas posibles con sus cifras; los textos los pone i18n.
      tope = tope por activo declarado (13.parametros.TOPE_PESO). */
  function interpretar(c09, tope) {
    const spy = c09.referencias[REFERENCIA].metricas, unoN = c09.referencias[UNO_N] && c09.referencias[UNO_N].metricas;
    // La referencia de mercado que más subió (sin contar 1/N, que no es un activo)
    const mejorRef = Object.entries(c09.referencias).filter(([k]) => k !== UNO_N).sort((a, b) => b[1].metricas.retorno_total_pct - a[1].metricas.retorno_total_pct)[0];
    return Object.entries(c09.carteras).map(([clave, c]) => {
      const m = c.metricas, supera = m.retorno_total_pct > spy.retorno_total_pct, causas = [];
      if (!supera) {
        if (unoN && m.retorno_total_pct < unoN.retorno_total_pct) causas.push({ codigo: "persistencia", unoN: unoN.retorno_total_pct });
        if (c.turnover_medio > 1) causas.push({ codigo: "costo", turnover: c.turnover_medio, costo: c.turnover_medio * c.rebalanceos.length * COMISION * 100 });
        const max = pesoMaximo(c);
        if (max >= tope - 1e-9) causas.push({ codigo: "concentracion", max });
        if (mejorRef && m.retorno_total_pct < mejorRef[1].metricas.retorno_total_pct) causas.push({ codigo: "no_elegido", ticker: mejorRef[0], retorno: mejorRef[1].metricas.retorno_total_pct, peso: pesoMedio(c, mejorRef[0]) });
      }
      return {
        clave, supera, retorno: m.retorno_total_pct, spyRetorno: spy.retorno_total_pct, diferencia: m.retorno_total_pct - spy.retorno_total_pct,
        sharpe: m.sharpe, spySharpe: spy.sharpe, mejorSharpe: m.sharpe > spy.sharpe,
        vol: m.volatilidad_anual_pct, spyVol: spy.volatilidad_anual_pct, masVolatil: m.volatilidad_anual_pct > spy.volatilidad_anual_pct,
        mdd: m.max_drawdown_pct, spyMdd: spy.max_drawdown_pct, peorCaida: m.max_drawdown_pct < spy.max_drawdown_pct,
        meses: m.meses_positivos_pct, spyMeses: spy.meses_positivos_pct, causas
      };
    });
  }

  /** Un rebalanceo: pesos de mayor a menor y turnover frente al anterior (Σ|Δ peso| entre los objetivos; derivado,
      no incluye la deriva de precios entre fechas). El primero parte de efectivo. */
  function rebalanceo(cartera, i) {
    const r = cartera.rebalanceos[i], prev = i > 0 ? cartera.rebalanceos[i - 1].pesos : null;
    let turnover = null;
    if (prev) { const ks = new Set(Object.keys(r.pesos).concat(Object.keys(prev))); turnover = 0; ks.forEach(k => { turnover += Math.abs((r.pesos[k] || 0) - (prev[k] || 0)); }); }
    return { fecha: r.fecha, pesos: Object.entries(r.pesos).map(([ticker, peso]) => ({ ticker, peso })).sort((a, b) => b.peso - a.peso), turnover };
  }

  /** Fechas en que puede terminar un backtesting recalculado: el último cierre y el último día hábil de cada mes
      anterior, de la más reciente a la más antigua (como mucho n). Pura. */
  function finesDeMes(fechas, n) {
    const salida = fechas.length ? [fechas[fechas.length - 1]] : [];
    for (let i = fechas.length - 2; i >= 0 && salida.length < n; i--) if (fechas[i].slice(0, 7) !== fechas[i + 1].slice(0, 7)) salida.push(fechas[i]);
    return salida;
  }

  const Backtesting = { drawdown, series, verificar, interpretar, rebalanceo, pesoMaximo, pesoMedio, finesDeMes, TOLERANCIA_PP, COMISION, REFERENCIA, UNO_N, ARCHIVO };
  if (typeof module !== "undefined" && module.exports) module.exports = Backtesting;
  if (typeof document === "undefined") return;
  global.Backtesting = Backtesting;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $, $$ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p);
  const pct = (x, d) => EIA.fmt.pct(x, d == null ? 2 : d);               // con signo: retornos y diferencias
  const pctS = (x, d) => EIA.fmt.pct(x, d == null ? 2 : d, { signo: false });
  const GRUPO_GRAFICOS = "eia-backtesting";                              // curvas y drawdown comparten el cursor
  let D = null, S = null, carteraTL = null, idxTL = 0, enlazado = false, gCurvas = null, gDD = null;
  let base = null, recalc = null; // recalc = {c09, fin, modo}: resultado calculado en el navegador (T-26)
  const ocultas = new Set();      // claves de las series ocultas (casillas y leyenda; las dos se sincronizan)
  const nombre = clave => (D.c09.carteras[clave] ? EIA.nombre("nivel", clave) : EIA.nombre("referencia", clave));

  function pintarFicha() {
    const inter = interpretar(D.c09, D.tope), superan = inter.filter(x => x.supera).length;
    EIA.ui.fichaIA($("#ficha"), {
      que_hace: t("backtesting.ficha_que_hace", { n: Object.keys(D.c09.carteras).length, sesiones: D.c09.periodo.sesiones, inicio: EIA.fmt.fecha(D.c09.periodo.inicio, "larga"), fin: EIA.fmt.fecha(D.c09.periodo.fin, "larga") }),
      que_tan_bien: t("backtesting.ficha_que_tan_bien", { superan, n: inter.length, ref: REFERENCIA }),
      por_que: t("backtesting.ficha_por_que"),
      controlas: t("backtesting.ficha_controlas"),
      ignorar: t("backtesting.ficha_ignorar")
    });
    const pm = recalc && D.c09.parametros;
    if (pm) {
      const tope = n => pctS(pm.perfiles[n].tope * 100, 0);
      $("#metodo").textContent = t("backtesting.metodo_navegador", { paso: pm.paso, ventana: pm.ventana, momentum: pm.momentum, comision: pm.comisionPb, tc: tope("Conservador"), tm: tope("Moderado"), ta: tope("Agresivo") });
    } else $("#metodo").innerHTML = `${esc(t("backtesting.metodo"))} <span lang="es">${esc(D.c09.metodo)}</span>`;
  }

  /** Estilo de cada serie: carteras con línea gruesa continua, discontinua o de punto y raya; referencias punteadas y finas.
      Así se distinguen sin depender del color (R-A11Y-01). */
  function estilo(s, i, c) {
    const tipos = ["solid", "dashed", [10, 4, 2, 4]];
    if (s.tipo === "cartera") return { width: 3, type: tipos[i % tipos.length], color: c.serie[i % c.serie.length] };
    return { width: 1.5, type: "dotted", color: s.clave === UNO_N ? c.mut : c.serie[(i + 1) % c.serie.length] };
  }
  function opcionesLineas(c, campo, ejeY) {
    return {
      textStyle: { color: c.fg },
      legend: { top: 0, textStyle: { color: c.fg }, data: S.map(s => nombre(s.clave)), selected: Object.fromEntries(S.map(s => [nombre(s.clave), !ocultas.has(s.clave)])) },
      tooltip: { trigger: "axis", valueFormatter: v => EIA.fmt.num(v) },
      // A la derecha cabe el nombre de cada cartera al final de su línea (antes se cortaba: «Co…», «Mo…»)
      grid: { left: 52, right: 96, top: 56, bottom: 36 },
      xAxis: { type: "category", data: D.c09.fechas, axisLabel: { color: c.mut, formatter: v => EIA.fmt.fecha(v) }, axisLine: { lineStyle: { color: c.bd } } },
      yAxis: { type: "value", scale: true, name: ejeY, nameTextStyle: { color: c.mut }, axisLabel: { color: c.mut }, splitLine: { lineStyle: { color: c.bd } } },
      dataZoom: [{ type: "inside" }],
      series: S.map((s, i) => ({ name: nombre(s.clave), type: "line", data: s[campo], showSymbol: false, lineStyle: estilo(s, i, c), itemStyle: { color: estilo(s, i, c).color },
        endLabel: s.tipo === "cartera" ? { show: true, color: c.fg, formatter: () => nombre(s.clave) } : undefined }))
    };
  }
  function tablaSerie(campo, titulo, fmt) {
    return () => ({
      titulo,
      columnas: [{ clave: "f", titulo: t("backtesting.col_fecha"), tipo: "texto", fmt: v => esc(EIA.fmt.fecha(v)) }]
        .concat(S.map((s, i) => ({ clave: "s" + i, titulo: nombre(s.clave), tipo: "num", ordenable: true, fmt: v => esc(fmt(v)) }))),
      filas: D.c09.fechas.map((f, k) => { const o = { f, k }; S.forEach((s, i) => { o["s" + i] = s[campo][k]; }); return o; }),
      claveFila: x => String(x.k)
    });
  }
  /** T-27: las 7 series se exploran con ↑/↓; se empieza por la cartera de la línea de tiempo. */
  function sonidoSeries(campo, formato) {
    const etiquetas = D.c09.fechas.map(f => EIA.fmt.fecha(f));
    return { inicial: Math.max(0, S.findIndex(s => s.clave === carteraTL)), series: S.map((s, k) => ({ nombre: nombre(s.clave), valores: s[campo], etiquetas, formato, indice: k })) };
  }
  /** Casillas de series visibles (como en Figma): la leyenda de ECharts no se maneja con el teclado. El trazo del rótulo
      repite el del gráfico (continuo, discontinuo o punto-raya en las carteras; punteado en las referencias). */
  const TRAZO = ["━━", "╍╍", "━·", "┈┈"];
  function pintarSeries() {
    const caja = $("#series-visibles");
    caja.innerHTML = S.map((s, i) => `<label class="casilla"><input type="checkbox" data-serie="${esc(s.clave)}"${ocultas.has(s.clave) ? "" : " checked"}> <span><span aria-hidden="true" class="trazo">${s.tipo === "cartera" ? TRAZO[i % 3] : TRAZO[3]}</span> ${esc(nombre(s.clave))}</span></label>`).join("");
  }
  /** Muestra u oculta una serie en los dos gráficos y en las casillas. */
  function verSerie(clave, ver) {
    if (ver) ocultas.delete(clave); else ocultas.add(clave);
    // setOption y no dispatchAction: no emite eventos. Con los dos gráficos conectados, un dispatchAction dentro del evento
    // de la leyenda se reenviaba entre ellos sin fin (medido: 51 eventos en 4,7 s antes de cortarlo).
    const seleccion = Object.fromEntries(S.map(s => [nombre(s.clave), !ocultas.has(s.clave)]));
    for (const g of [gCurvas, gDD]) { const inst = g && g.instancia(); if (inst) inst.setOption({ legend: { selected: seleccion } }); }
    const cb = $$("#series-visibles input[data-serie]").find(x => x.dataset.serie === clave); if (cb) cb.checked = ver;
  }
  function conectar() {
    const a = gCurvas && gCurvas.instancia(), b = gDD && gDD.instancia();
    // Si se usa la leyenda del gráfico, solo se actualizan el estado y las casillas: el otro gráfico ya recibe el mismo
    // clic por echarts.connect (si además se le fijara aquí, ese reenvío lo volvería a alternar)
    for (const inst of [a, b]) if (inst) inst.on("legendselectchanged", e => {
      const s = S.find(x => nombre(x.clave) === e.name); if (!s) return;
      const ver = !!e.selected[e.name];
      if (ver) ocultas.delete(s.clave); else ocultas.add(s.clave);
      const cb = $$("#series-visibles input[data-serie]").find(x => x.dataset.serie === s.clave); if (cb) cb.checked = ver;
    });
    if (a && b && global.echarts) { a.group = GRUPO_GRAFICOS; b.group = GRUPO_GRAFICOS; global.echarts.connect(GRUPO_GRAFICOS); }
  }
  function pintarGraficos() {
    const fin = s => s.curva[s.curva.length - 1];
    gCurvas = EIA.ui.grafico($("#curvas"), {
      id: "capital", alto: 384, titulo: t("backtesting.curvas_titulo", { base: EIA.fmt.ent(D.c09.base) }),
      opciones: c => opcionesLineas(c, "curva", t("backtesting.eje_capital")),
      tabla: tablaSerie("curva", t("backtesting.curvas_tabla"), v => EIA.fmt.num(v)),
      resumen: () => t("backtesting.curvas_resumen", { base: EIA.fmt.ent(D.c09.base), lista: S.map(s => t("backtesting.serie_final", { nombre: nombre(s.clave), valor: EIA.fmt.num(fin(s)) })).join("; ") }),
      sonido: () => sonidoSeries("curva", v => EIA.fmt.num(v))
    });
    gDD = EIA.ui.grafico($("#caidas"), {
      id: "drawdown", alto: 288, titulo: t("backtesting.dd_titulo"),
      opciones: c => opcionesLineas(c, "drawdown", t("backtesting.eje_dd")),
      tabla: tablaSerie("drawdown", t("backtesting.dd_tabla"), v => pctS(v)),
      resumen: () => t("backtesting.dd_resumen", { lista: S.map(s => t("backtesting.serie_mdd", { nombre: nombre(s.clave), mdd: pct(s.metricas.max_drawdown_pct) })).join("; ") }),
      sonido: () => sonidoSeries("drawdown", v => pctS(v))
    });
    conectar();
  }

  function pintarMetricas() {
    const col = (clave, tipo, f) => ({ clave, titulo: t("backtesting.col_" + clave), tipo: "num", ordenable: true, valor: s => s.metricas[clave], fmt: f });
    const conSigno = v => EIA.ui.variacion(v), sinSigno = v => esc(pctS(v)), num = v => esc(EIA.fmt.num(v, 3));
    EIA.ui.tabla($("#metricas"), {
      id: "tabla-metricas", titulo: t("backtesting.metricas_caption"),
      columnas: [
        { clave: "nombre", titulo: t("backtesting.col_serie"), tipo: "texto", ordenable: true, valor: s => nombre(s.clave), fmt: v => esc(v) },
        { clave: "tipo", titulo: t("backtesting.col_tipo"), tipo: "texto", ordenable: true, valor: s => t("backtesting.tipo_" + s.tipo), fmt: v => esc(v) },
        col("retorno_total_pct", "num", conSigno), col("cagr_pct", "num", conSigno), col("volatilidad_anual_pct", "num", sinSigno),
        col("sharpe", "num", num), col("max_drawdown_pct", "num", v => esc(pct(v))), col("calmar", "num", num), col("meses_positivos_pct", "num", v => esc(pctS(v, 1)))
      ],
      filas: S, claveFila: s => s.clave, orden: { clave: "retorno_total_pct", dir: "desc" },
      claseFila: s => (s.tipo === "cartera" ? "fila-cartera" : "")
    });
    const v = verificar(D.c09), ok = v.filter(x => x.cumple).length;
    $("#verificacion").innerHTML = `<span class="${ok === v.length ? "up" : "dn"}"><span aria-hidden="true">${ok === v.length ? "✓" : "✗"}</span> ${esc(t("backtesting.verif", { ok, n: v.length, tol: EIA.fmt.num(TOLERANCIA_PP, 2), max: EIA.fmt.num(Math.max.apply(null, v.map(x => x.dif)), 4) }))}</span>`;
  }

  function pintarLineaTiempo() {
    const claves = Object.keys(D.c09.carteras);
    if (!carteraTL || !D.c09.carteras[carteraTL]) carteraTL = claves[0];
    const c = D.c09.carteras[carteraTL];
    idxTL = Math.min(idxTL, c.rebalanceos.length - 1);
    EIA.ui.segmentado($("#tl-cartera"), {
      etiqueta: t("backtesting.tl_cartera"), valor: carteraTL, opciones: claves.map(k => [k, EIA.nombre("nivel", k)]),
      alCambiar(v) { carteraTL = v; pintarLineaTiempo(); }
    });
    $("#tl-fechas").innerHTML = c.rebalanceos.map((r, i) => `<li><button type="button" data-rebalanceo="${i}" aria-pressed="${i === idxTL}">${esc(t("backtesting.tl_boton", { n: i + 1, fecha: EIA.fmt.fecha(r.fecha) }))}</button></li>`).join("");
    pintarRebalanceo();
  }
  function pintarRebalanceo() {
    const c = D.c09.carteras[carteraTL], r = rebalanceo(c, idxTL);
    $("#tl-detalle").innerHTML = `<h3>${esc(t("backtesting.tl_titulo", { cartera: EIA.nombre("nivel", carteraTL), n: idxTL + 1, total: c.rebalanceos.length, fecha: EIA.fmt.fecha(r.fecha, "larga") }))}</h3>
<div class="barra-apilada" role="img" aria-label="${esc(t("backtesting.tl_barra", { lista: r.pesos.map(w => t("backtesting.tl_peso", { ticker: w.ticker, peso: pctS(w.peso * 100, 1) })).join(", ") }))}">${
      r.pesos.map((w, i) => `<span class="seg seg-${i % 6}" style="width:${(w.peso * 100).toFixed(2)}%">${w.peso >= 0.08 ? esc(w.ticker) : ""}</span>`).join("")}</div>
<table class="pesos"><caption>${esc(t("backtesting.tl_caption", { fecha: EIA.fmt.fecha(r.fecha) }))}</caption>
<thead><tr><th scope="col" class="l">${esc(t("comun.activo"))}</th><th scope="col">${esc(t("backtesting.col_peso"))}</th></tr></thead>
<tbody>${r.pesos.map(w => `<tr><th scope="row" class="l">${esc(w.ticker)}</th><td>${esc(pctS(w.peso * 100, 1))}</td></tr>`).join("")}</tbody></table>
<p>${esc(r.turnover == null ? t("backtesting.tl_inicial") : t("backtesting.tl_turnover", { turnover: pctS(r.turnover * 100, 0), medio: pctS(c.turnover_medio * 100, 0) }))}</p>`;
  }

  function pintarInterpretacion() {
    const inter = interpretar(D.c09, D.tope), ref = REFERENCIA;
    const causa = (x, c) => t("backtesting.causa_" + c.codigo, {
      unoN: pct(c.unoN), turnover: pctS((c.turnover || 0) * 100, 0), costo: EIA.fmt.num(c.costo, 2), max: pctS((c.max || 0) * 100, 0),
      ticker: c.ticker, retorno: pct(c.retorno), peso: pctS((c.peso || 0) * 100, 1), n: D.c09.carteras[x.clave].rebalanceos.length
    });
    $("#interpretacion").innerHTML = `<h2>${esc(t("backtesting.interp_titulo"))}</h2>${inter.map(x => `<article class="interp" data-cartera="${esc(x.clave)}">
<h3>${esc(EIA.nombre("nivel", x.clave))} <span class="${x.supera ? "up" : "dn"}"><span aria-hidden="true">${x.supera ? "▲" : "▼"}</span> ${esc(t(x.supera ? "backtesting.supera" : "backtesting.no_supera", { ref }))}</span></h3>
<p>${esc(t(x.supera ? "backtesting.frase_supera" : "backtesting.frase_no_supera", { retorno: pct(x.retorno), ref, refRet: pct(x.spyRetorno), dif: EIA.fmt.num(Math.abs(x.diferencia), 2) }))}
${esc(t(x.mejorSharpe ? "backtesting.frase_sharpe_mejor" : "backtesting.frase_sharpe_peor", { sharpe: EIA.fmt.num(x.sharpe, 3), refSharpe: EIA.fmt.num(x.spySharpe, 3), ref }))}</p>
<p>${esc(t(x.masVolatil ? "backtesting.frase_vol_mas" : "backtesting.frase_vol_menos", { vol: pctS(x.vol), refVol: pctS(x.spyVol), ref }))}
${esc(t(x.peorCaida ? "backtesting.frase_mdd_peor" : "backtesting.frase_mdd_mejor", { mdd: pct(x.mdd), refMdd: pct(x.spyMdd), ref }))}
${esc(t("backtesting.frase_meses", { meses: pctS(x.meses, 1), refMeses: pctS(x.spyMeses, 1), ref }))}</p>
${x.causas.length ? `<p>${esc(t("backtesting.causas_intro"))}</p><ul>${x.causas.map(c => `<li>${esc(causa(x, c))}</li>`).join("")}</ul>` : ""}</article>`).join("")}
<p class="cierre"><strong>${esc(t("backtesting.cierre"))}</strong> ${esc(EIA.modo() === "profesor" ? t("backtesting.cierre_profesor") : t("backtesting.cierre_real"))}</p>`;
  }

  /** Nota N-3: se detecta en los datos si alguna cartera supera el tope declarado; no se corrige. */
  function pintarNotaTope() {
    const exceden = Object.entries(D.c09.carteras).map(([k, c]) => ({ k, max: pesoMaximo(c) })).filter(x => x.max > D.tope + 1e-9);
    const caja = $("#nota-tope");
    caja.hidden = !exceden.length;
    // En el Modo profesor es una inconsistencia del material (N-3); en el real, una regla declarada en el método del archivo
    if (exceden.length) caja.textContent = t(EIA.modo() === "real" ? "backtesting.nota_tope_real" : "backtesting.nota_tope", { lista: exceden.map(x => t("backtesting.nota_tope_item", { cartera: EIA.nombre("nivel", x.k), max: pctS(x.max * 100, 0) })).join(", "), tope: pctS(D.tope * 100, 0) });
  }

  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    $("main").addEventListener("change", e => {
      const cb = e.target.closest("input[data-serie]");
      if (cb) { verSerie(cb.dataset.serie, cb.checked); EIA.ui.anunciar(t(cb.checked ? "backtesting.serie_visible" : "backtesting.serie_oculta", { serie: nombre(cb.dataset.serie) })); }
    });
    $("main").addEventListener("click", e => {
      const b = e.target.closest("button[data-rebalanceo]");
      if (!b) return;
      idxTL = Number(b.dataset.rebalanceo);
      $$("#tl-fechas button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      pintarRebalanceo();
      EIA.ui.anunciar(t("backtesting.tl_anuncio", { fecha: EIA.fmt.fecha(D.c09.carteras[carteraTL].rebalanceos[idxTL].fecha, "larga") }));
    });
  }

  /** Sección «Recalcular con otro periodo»: en el Modo real, el Worker de backtest con los cierres reales (D-03). */
  function pintarRecalculo() {
    const montarCon = opciones => EIA.ui.recalculo($("#recalculo"), {
      modulo: "backtesting", opciones, valor: recalc ? recalc.fin : (opciones[0] || [])[0],
      activo: recalc ? t("backtesting.recalculado_detalle", { inicio: EIA.fmt.fecha(recalc.c09.periodo.inicio), fin: EIA.fmt.fecha(recalc.c09.periodo.fin) }) : null,
      async calcular(fin) {
        const [ch, u] = await EIA.todos([EIA.datos(CIERRES), EIA.universo()]);
        return { worker: "backtest", params: { fechas: ch.fechas, cierres: ch.cierres, tickers: u.map(a => a.ticker).filter(tk => ch.cierres[tk]), fin } };
      },
      alResultado(c09, fin) { recalc = { c09, fin, modo: EIA.modo() }; pintar(base); },
      alVolver() { recalc = null; pintar(base); }
    });
    if (EIA.modo() !== "real") { montarCon([]); return; }
    EIA.datos(CIERRES)
      .then(ch => montarCon(finesDeMes(ch.fechas, OPCIONES_FIN).map((f, i) => [f, i === 0 ? t("backtesting.fin_ultimo", { fecha: EIA.fmt.fecha(f) }) : EIA.fmt.fecha(f)])))
      .catch(() => montarCon([]));
  }

  function pintar(datos) {
    base = datos;
    if (recalc && recalc.modo !== EIA.modo()) recalc = null; // al volver al Modo profesor se descarta
    D = recalc ? Object.assign({}, datos, { c09: recalc.c09 }) : datos;
    S = series(D.c09);
    if (!carteraTL) { const pedido = new URLSearchParams(global.location.search).get("nivel"); carteraTL = D.c09.carteras[pedido] ? pedido : null; }
    enlazar();
    pintarFicha();
    pintarSeries();
    pintarGraficos();
    pintarMetricas();
    pintarLineaTiempo();
    pintarInterpretacion();
    pintarNotaTope();
    pintarRecalculo();
  }

  EIA.modulo({
    id: "backtesting",
    async cargar() {
      const [c09, c13] = await EIA.todos([EIA.datos(ARCHIVO), EIA.datos(ARCHIVO_PARAMETROS)]);
      return { c09, tope: c13.parametros.TOPE_PESO };
    },
    pintar
  });
})(typeof window !== "undefined" ? window : globalThis);
