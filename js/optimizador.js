/* Módulo Optimizador: Markowitz, NSGA-II y NSGA-III (optimizador.html).
   Sigue las tareas y restricciones del prompt P05 de la guía más las extensiones del equipo
   (docs/contexto/PROMPTS_INICIALES.md, «extensiones_equipo modulo=optimizador») y la estructura de js/clasificacion.js.
   En el Modo profesor las fronteras SOLO se leen del JSON (R-OPT-08): este archivo no crea Workers ni recalcula nada.
   Entradas: 07_optimizador_markowitz_nsga.json (fronteras, elegibles, tope), 05 y 06 (razón de cada elegible) y 10 (nombres). */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const ARCHIVO = "07_optimizador_markowitz_nsga.json", ARCHIVO_CLASIF = "05_clasificadores_binarios.json", ARCHIVO_REGRES = "06_regresores_precio_30d.json";
  const TOLERANCIA_SUMA = 0.02;   // P05: «la suma de pesos de cada punto es 1 ± 0,02»
  const TOLERANCIA_TOPE = 1e-9;   // comparación de coma flotante con el tope
  /** Series del gráfico, en el orden en que se recorren con ↑/↓. campo = clave del JSON. */
  const SERIES = [
    { clave: "mk_universo", campo: "markowitz_universo_completo", tipo: "markowitz" },
    { clave: "mk_elegibles", campo: "markowitz_elegibles", tipo: "markowitz" },
    { clave: "nsga2", campo: "nsga2_elegibles", tipo: "nsga2" },
    { clave: "nsga3", campo: "nsga3_elegibles", tipo: "nsga3" }
  ];

  /* ═════════════ Modelo de vista (puro) ═════════════ */

  /** Series visibles según los interruptores. vis = {markowitz, nsga2, nsga3, curva: "elegibles" | "universo" | "ambas"} */
  function seriesVisibles(c07, vis) {
    const v = Object.assign({ markowitz: true, nsga2: true, nsga3: true, curva: "elegibles" }, vis);
    return SERIES.filter(s => {
      if (s.tipo === "markowitz") return v.markowitz && (v.curva === "ambas" || (v.curva === "universo") === (s.clave === "mk_universo"));
      return v[s.tipo];
    }).map(s => Object.assign({}, s, { puntos: c07[s.campo] || [] }));
  }

  /** R-OPT-09 para un punto: Σ pesos = 1 ± 0,02 y ningún peso supera el tope. */
  function verificarPesos(punto, tope) {
    const ws = Object.values(punto.pesos), suma = ws.reduce((a, b) => a + b, 0), max = Math.max.apply(null, ws);
    return { suma, max, cumpleSuma: Math.abs(suma - 1) <= TOLERANCIA_SUMA, cumpleTope: max <= tope + TOLERANCIA_TOPE };
  }
  function verificarTodos(c07) {
    let puntos = 0, cumplen = 0;
    for (const s of SERIES) for (const p of c07[s.campo] || []) { puntos++; const v = verificarPesos(p, c07.tope_peso_por_activo); if (v.cumpleSuma && v.cumpleTope) cumplen++; }
    return { puntos, cumplen };
  }

  /** Pesos de mayor a menor: [{ticker, peso}]. */
  const pesosOrdenados = punto => Object.entries(punto.pesos).map(([ticker, peso]) => ({ ticker, peso })).sort((a, b) => b.peso - a.peso);

  /** Exceso de volatilidad (pp) de un frente frente a la curva de Markowitz al mismo retorno (interpolación lineal).
      Los puntos fuera del rango de retornos de la curva no se comparan. Es un campo derivado (contrato §5). */
  function distanciaAMarkowitz(frente, curva) {
    const c = curva.slice().sort((a, b) => a.retorno_esperado_anual_pct - b.retorno_esperado_anual_pct);
    const volEn = r => {
      for (let i = 1; i < c.length; i++) {
        const a = c[i - 1], b = c[i];
        if (r >= a.retorno_esperado_anual_pct && r <= b.retorno_esperado_anual_pct) {
          const d = b.retorno_esperado_anual_pct - a.retorno_esperado_anual_pct, u = d > 0 ? (r - a.retorno_esperado_anual_pct) / d : 0;
          return a.volatilidad_anual_pct + u * (b.volatilidad_anual_pct - a.volatilidad_anual_pct);
        }
      }
      return null;
    };
    const dif = frente.map(p => { const v = volEn(p.retorno_esperado_anual_pct); return v == null ? null : p.volatilidad_anual_pct - v; }).filter(x => x != null);
    return { n: dif.length, media: dif.length ? dif.reduce((a, b) => a + b, 0) / dif.length : 0, max: dif.length ? Math.max.apply(null, dif) : 0 };
  }

  /** ¿Por qué un activo es (o no) elegible? Criterio de 07: consenso SUBE y proyección mediana > 0 (contrato I-04). */
  function razonElegible(ticker, c07, c05, c06) {
    const cl = c05.predicciones[ticker], rg = c06.predicciones[ticker];
    if (!cl || !rg) return null;
    const sube = cl.consenso === "SUBE", positivo = rg.retorno_proyectado_30d_pct > 0;
    return {
      ticker, elegible: c07.elegibles.includes(ticker), votos: cl.votos_sube, modelos: cl.modelos.length, consenso: cl.consenso,
      retorno: rg.retorno_proyectado_30d_pct,
      motivo: sube && positivo ? "ok" : (!sube && !positivo ? "ambos" : (!sube ? "consenso" : "retorno"))
    };
  }

  /** Navegación con teclado por los puntos: ←/→ dentro de la serie, ↑/↓ entre series, Inicio/Fin.
      pos = {s, i}; tamanos = puntos por serie visible. Devuelve la nueva posición o null si la tecla no aplica. */
  function navegar(pos, tecla, tamanos) {
    if (!tamanos.length) return null;
    let s = Math.min(pos.s, tamanos.length - 1), i = pos.i;
    if (tecla === "ArrowRight") i = Math.min(i + 1, tamanos[s] - 1);
    else if (tecla === "ArrowLeft") i = Math.max(i - 1, 0);
    else if (tecla === "ArrowDown") { s = (s + 1) % tamanos.length; i = Math.min(i, tamanos[s] - 1); }
    else if (tecla === "ArrowUp") { s = (s - 1 + tamanos.length) % tamanos.length; i = Math.min(i, tamanos[s] - 1); }
    else if (tecla === "Home") i = 0;
    else if (tecla === "End") i = tamanos[s] - 1;
    else return null;
    return { s, i: Math.max(0, i) };
  }

  /** Punto inicial: el de mayor Sharpe de NSGA-II (o de la primera serie visible). */
  function puntoInicial(visibles) {
    const s = Math.max(0, visibles.findIndex(x => x.tipo === "nsga2")), pts = visibles[s] ? visibles[s].puntos : [];
    let i = 0; pts.forEach((p, k) => { if (p.sharpe > pts[i].sharpe) i = k; });
    return { s, i };
  }

  const Optimizador = { SERIES, seriesVisibles, verificarPesos, verificarTodos, pesosOrdenados, distanciaAMarkowitz, razonElegible, navegar, puntoInicial, TOLERANCIA_SUMA, ARCHIVO };
  if (typeof module !== "undefined" && module.exports) module.exports = Optimizador;
  if (typeof document === "undefined") return;
  global.Optimizador = Optimizador;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $, $$ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p);
  const pct = (x, d) => EIA.fmt.pct(x, d == null ? 2 : d, { signo: false });
  let D = null, VIS = [], pos = { s: 0, i: 0 }, grafico = null, enlazado = false;

  const leerFiltros = () => Object.assign({ markowitz: true, nsga2: true, nsga3: true, curva: "elegibles" }, (EIA.estado.get("eia_filtros") || {}).optimizador);
  function guardarFiltros(cambio) {
    const todo = EIA.estado.get("eia_filtros") || {};
    todo.optimizador = Object.assign(leerFiltros(), cambio);
    EIA.estado.set("eia_filtros", todo);
  }
  const nombreSerie = s => t("optimizador.serie_" + s.clave);
  /** Nombre de un punto: el id del JSON (N2-xx, N3-xx) o la posición en la curva de Markowitz. */
  const nombrePunto = (s, i) => (s.puntos[i].id ? t("optimizador.punto_id", { serie: nombreSerie(s), id: s.puntos[i].id }) : t("optimizador.punto_n", { serie: nombreSerie(s), n: i + 1, total: s.puntos.length }));
  const describir = (s, i) => {
    const p = s.puntos[i];
    return t("optimizador.punto_aria", { nombre: nombrePunto(s, i), ret: pct(p.retorno_esperado_anual_pct), vol: pct(p.volatilidad_anual_pct), sharpe: EIA.fmt.num(p.sharpe, 3), cvar: pct(p.cvar95_diario_pct) });
  };

  function pintarFicha() {
    const g2 = distanciaAMarkowitz(D.c07.nsga2_elegibles, D.c07.markowitz_elegibles);
    EIA.ui.fichaIA($("#ficha"), {
      que_hace: t("optimizador.ficha_que_hace", { n: D.c07.elegibles.length, tope: pct(D.c07.tope_peso_por_activo * 100, 0) }),
      que_tan_bien: t(EIA.modo() === "profesor" ? "optimizador.ficha_que_tan_bien_profesor" : "optimizador.ficha_que_tan_bien_real", { media: EIA.fmt.num(g2.media, 2) }),
      por_que: t("optimizador.ficha_por_que"),
      controlas: t("optimizador.ficha_controlas"),
      ignorar: t("optimizador.ficha_ignorar")
    });
  }

  function pintarControles() {
    const f = leerFiltros();
    for (const k of ["markowitz", "nsga2", "nsga3"]) $("#ver-" + k).checked = f[k];
    EIA.ui.segmentado($("#curva"), {
      etiqueta: t("optimizador.curva"), valor: f.curva,
      opciones: [["elegibles", t("optimizador.curva_elegibles")], ["universo", t("optimizador.curva_universo")], ["ambas", t("optimizador.curva_ambas")]],
      alCambiar(v) { guardarFiltros({ curva: v }); recalcularVisibles(true); }
    });
  }

  function opcionesGrafico(c) {
    const series = VIS.map((s, k) => {
      const datos = s.puntos.map(p => [p.volatilidad_anual_pct, p.retorno_esperado_anual_pct, p.cvar95_diario_pct]);
      const base = { id: s.clave, name: nombreSerie(s), data: datos, emphasis: { scale: 1.6 } };
      if (s.tipo === "markowitz") return Object.assign(base, { type: "line", symbol: "circle", symbolSize: 6, showAllSymbol: true, lineStyle: { width: 2.5, type: s.clave === "mk_universo" ? "dashed" : "solid", color: s.clave === "mk_universo" ? c.mut : c.fg }, itemStyle: { color: s.clave === "mk_universo" ? c.mut : c.fg } });
      if (s.tipo === "nsga2") return Object.assign(base, { type: "scatter", symbol: "circle", symbolSize: 9, itemStyle: { color: c.serie[0], borderColor: c.panel, borderWidth: 1 } });
      return Object.assign(base, { type: "scatter", symbol: "triangle", symbolSize: 11, itemStyle: { borderColor: c.panel, borderWidth: 1 } });
    });
    const sel = VIS[pos.s] && VIS[pos.s].puntos[pos.i];
    if (sel) series.push({ id: "seleccion", name: t("optimizador.serie_seleccion"), type: "scatter", symbol: "circle", symbolSize: 24, silent: true, z: 10,
      itemStyle: { color: "transparent", borderColor: c.ac, borderWidth: 3 }, data: [[sel.volatilidad_anual_pct, sel.retorno_esperado_anual_pct]], tooltip: { show: false } });
    const n3 = VIS.findIndex(s => s.tipo === "nsga3"), cv = D.c07.nsga3_elegibles.map(p => p.cvar95_diario_pct);
    return {
      textStyle: { color: c.fg },
      grid: { left: 56, right: 24, top: 40, bottom: n3 >= 0 ? 92 : 56 },
      legend: { top: 0, selectedMode: false, textStyle: { color: c.fg }, data: VIS.map(nombreSerie) },
      tooltip: { trigger: "item", formatter: p => (p.seriesId === "seleccion" ? "" : esc(describir(VIS.find(s => s.clave === p.seriesId), p.dataIndex))) },
      xAxis: { type: "value", scale: true, name: t("optimizador.eje_x"), nameLocation: "middle", nameGap: 28, nameTextStyle: { color: c.mut }, axisLabel: { color: c.mut, formatter: v => EIA.fmt.num(v, 0) }, splitLine: { lineStyle: { color: c.bd } } },
      yAxis: { type: "value", scale: true, name: t("optimizador.eje_y"), nameTextStyle: { color: c.mut }, axisLabel: { color: c.mut, formatter: v => EIA.fmt.num(v, 0) }, splitLine: { lineStyle: { color: c.bd } } },
      // NSGA-III coloreado por CVaR 95 % (el valor también está en la información emergente y en la tabla)
      visualMap: n3 >= 0 ? { type: "continuous", seriesIndex: n3, dimension: 2, min: Math.min.apply(null, cv), max: Math.max.apply(null, cv), orient: "horizontal", left: "center", bottom: 0, itemHeight: 140,
        text: [t("optimizador.cvar_alto"), t("optimizador.cvar_bajo")], textStyle: { color: c.fg }, calculable: false, inRange: { color: [c.serie[2], c.serie[1], c.serie[5]] } } : undefined,
      series
    };
  }

  function filasTabla() {
    const filas = [];
    VIS.forEach((s, k) => s.puntos.forEach((p, i) => filas.push({ clave: k + "|" + i, s: k, i, serie: nombreSerie(s), id: p.id || t("optimizador.n_punto", { n: i + 1 }), ret: p.retorno_esperado_anual_pct, vol: p.volatilidad_anual_pct, sharpe: p.sharpe, cvar: p.cvar95_diario_pct })));
    return filas;
  }
  function pintarGrafico() {
    const num = v => esc(pct(v));
    grafico = EIA.ui.grafico($("#grafico"), {
      id: "frontera", alto: 448,
      titulo: t("optimizador.grafico_titulo"),
      opciones: opcionesGrafico,
      // R-OPT-07: alternativa en tabla con todos los puntos visibles; el botón de cada fila lo selecciona
      tabla: () => ({
        titulo: t("optimizador.tabla_titulo"),
        columnas: [
          { clave: "serie", titulo: t("optimizador.col_serie"), tipo: "texto", ordenable: true, valor: f => f.serie + " · " + f.id, fmt: (v, f) => esc(t("optimizador.seleccionar_punto", { serie: f.serie, id: f.id })) },
          { clave: "ret", titulo: t("optimizador.col_retorno"), tipo: "num", ordenable: true, fmt: num },
          { clave: "vol", titulo: t("optimizador.col_volatilidad"), tipo: "num", ordenable: true, fmt: num },
          { clave: "sharpe", titulo: t("optimizador.col_sharpe"), tipo: "num", ordenable: true, fmt: v => esc(EIA.fmt.num(v, 3)) },
          { clave: "cvar", titulo: t("optimizador.col_cvar"), tipo: "num", ordenable: true, fmt: num }
        ],
        filas: filasTabla(), claveFila: f => f.clave, elegida: pos.s + "|" + pos.i,
        alElegir: f => seleccionar({ s: f.s, i: f.i }, true)
      }),
      resumen: () => t("optimizador.resumen", { sel: describir(VIS[pos.s], pos.i), n2: D.c07.nsga2_elegibles.length, n3: D.c07.nsga3_elegibles.length, nm: D.c07.markowitz_elegibles.length }),
      sonido: () => ({ valores: (VIS[pos.s] || { puntos: [] }).puntos.map(p => p.retorno_esperado_anual_pct) }),
      explorar: false // el lienzo ya se recorre con las flechas y Enter elige el punto (R-OPT-03)
    });
    const lienzo = $("#frontera .chart");
    // R-OPT-03 y R-OPT-07: el gráfico es enfocable y se recorre con las flechas; Enter muestra la composición
    lienzo.tabIndex = 0;
    lienzo.setAttribute("role", "application");
    lienzo.setAttribute("aria-roledescription", t("optimizador.rol_grafico"));
    lienzo.setAttribute("aria-describedby", "ayuda-teclado");
    const inst = grafico.instancia();
    if (inst) inst.on("click", p => { const s = VIS.findIndex(x => x.clave === p.seriesId); if (s >= 0) seleccionar({ s, i: p.dataIndex }, true); });
    marcarFoco();
  }
  /** Resalta en ECharts el punto con el foco del teclado y actualiza el nombre accesible del gráfico. */
  function marcarFoco() {
    const lienzo = $("#frontera .chart"), inst = grafico && grafico.instancia();
    if (!lienzo || !VIS[pos.s]) return;
    lienzo.setAttribute("aria-label", t("optimizador.grafico_aria", { punto: describir(VIS[pos.s], pos.i) }));
    if (inst && document.activeElement === lienzo) inst.dispatchAction({ type: "showTip", seriesIndex: pos.s, dataIndex: pos.i });
  }

  function seleccionar(p, anunciar) {
    pos = p;
    if (grafico) { grafico.redibujar(); marcarFoco(); }
    pintarComposicion();
    if (anunciar) EIA.ui.anunciar(t("optimizador.seleccionado", { punto: describir(VIS[pos.s], pos.i) }));
  }

  function pintarComposicion() {
    const s = VIS[pos.s], caja = $("#composicion");
    if (!s) { caja.innerHTML = `<p>${esc(t("optimizador.sin_series"))}</p>`; return; }
    const p = s.puntos[pos.i], v = verificarPesos(p, D.c07.tope_peso_por_activo), ws = pesosOrdenados(p), tope = D.c07.tope_peso_por_activo;
    const marca = ok => `<span class="${ok ? "up" : "dn"}"><span aria-hidden="true">${ok ? "✓" : "✗"}</span> ${esc(t(ok ? "optimizador.cumple" : "optimizador.no_cumple"))}</span>`;
    caja.innerHTML = `<h2 id="h-composicion">${esc(t("optimizador.composicion_titulo", { nombre: nombrePunto(s, pos.i) }))}</h2>
<dl class="metricas-punto">
<div><dt>${esc(t("optimizador.col_retorno"))}</dt><dd>${esc(pct(p.retorno_esperado_anual_pct))}</dd></div>
<div><dt>${esc(t("optimizador.col_volatilidad"))}</dt><dd>${esc(pct(p.volatilidad_anual_pct))}</dd></div>
<div><dt>${esc(t("optimizador.col_sharpe"))}</dt><dd>${esc(EIA.fmt.num(p.sharpe, 3))}</dd></div>
<div><dt>${esc(t("optimizador.col_cvar"))}</dt><dd>${esc(pct(p.cvar95_diario_pct))}</dd></div></dl>
<p class="mut">${esc(t("optimizador.cvar_explica", { cvar: pct(p.cvar95_diario_pct) }))}</p>
<table class="pesos"><caption>${esc(t("optimizador.pesos_caption", { nombre: nombrePunto(s, pos.i) }))}</caption>
<thead><tr><th scope="col" class="l">${esc(t("comun.activo"))}</th><th scope="col" class="l">${esc(t("optimizador.col_peso"))}</th></tr></thead>
<tbody>${ws.map(w => `<tr><th scope="row" class="l">${esc(w.ticker)}</th><td class="l"><span class="barra-peso"><span style="width:${(100 * w.peso / tope).toFixed(1)}%"></span></span> ${esc(pct(w.peso * 100, 1))}</td></tr>`).join("")}</tbody></table>
<p class="comprobacion">${esc(t("optimizador.verif_suma", { suma: pct(v.suma * 100, 1) }))} ${marca(v.cumpleSuma)} · ${esc(t("optimizador.verif_tope", { max: pct(v.max * 100, 1), tope: pct(tope * 100, 1) }))} ${marca(v.cumpleTope)}</p>
<p class="acciones"><button type="button" id="llevar-punto">${esc(t("optimizador.llevar"))}</button></p>`;
  }

  function pintarExplicacion() {
    const g2 = distanciaAMarkowitz(D.c07.nsga2_elegibles, D.c07.markowitz_elegibles), g3 = distanciaAMarkowitz(D.c07.nsga3_elegibles, D.c07.markowitz_elegibles);
    const todos = verificarTodos(D.c07);
    $("#explicacion").innerHTML = `<h2>${esc(t("optimizador.explica_titulo"))}</h2>
<dl class="definiciones">
<dt>${esc(t("optimizador.serie_mk_elegibles"))}</dt><dd>${esc(t("optimizador.explica_markowitz"))}</dd>
<dt>${esc(t("optimizador.serie_nsga2"))}</dt><dd>${esc(t("optimizador.explica_nsga2"))}</dd>
<dt>${esc(t("optimizador.serie_nsga3"))}</dt><dd>${esc(t("optimizador.explica_nsga3"))}</dd></dl>
<h3>${esc(t("optimizador.debajo_titulo"))}</h3>
<p>${esc(t("optimizador.debajo_texto", { m2: EIA.fmt.num(g2.media, 2), x2: EIA.fmt.num(g2.max, 2), m3: EIA.fmt.num(g3.media, 2), x3: EIA.fmt.num(g3.max, 2) }))}</p>
<p class="mut">${esc(t(EIA.modo() === "profesor" ? "optimizador.debajo_profesor" : "optimizador.debajo_real"))}</p>
<p>${esc(t("optimizador.verif_global", { cumplen: todos.cumplen, puntos: todos.puntos, tol: EIA.fmt.num(TOLERANCIA_SUMA, 2), tope: pct(D.c07.tope_peso_por_activo * 100, 0) }))}</p>`;
  }

  /** R-OPT-05: elegibles con su razón; con ?t= explica si el activo pedido es elegible o no. */
  function pintarElegibles() {
    const pedido = EIA.activo(), nombre = tk => (D.universo.find(a => a.ticker === tk) || {}).nombre || tk;
    const filas = D.c07.elegibles.map(tk => razonElegible(tk, D.c07, D.c05, D.c06)).filter(Boolean);
    let aviso = "";
    if (pedido && D.c05.predicciones[pedido]) {
      const r = razonElegible(pedido, D.c07, D.c05, D.c06);
      aviso = `<p class="nota-activo ${r.elegible ? "up" : "dn"}" id="activo-pedido"><span aria-hidden="true">${r.elegible ? "✓" : "✗"}</span> ${esc(t("optimizador.pedido_" + (r.elegible ? "ok" : r.motivo), {
        ticker: pedido, votos: r.votos, n: r.modelos, consenso: EIA.nombre("senal", r.consenso), retorno: EIA.fmt.pct(r.retorno) }))}</p>`;
    }
    $("#elegibles").innerHTML = `<h2>${esc(t("optimizador.elegibles_titulo", { n: filas.length }))}</h2>
<p>${esc(t("optimizador.criterio"))}</p>${aviso}
<ul class="lista-elegibles">${filas.map(r => `<li${r.ticker === pedido ? ' class="elegida"' : ""}><strong>${esc(r.ticker)}</strong> <span class="mut">${esc(nombre(r.ticker))}</span> · ${esc(t("optimizador.razon", { votos: r.votos, n: r.modelos }))} · ${EIA.ui.variacion(r.retorno)}</li>`).join("")}</ul>`;
  }

  /** Recalcula las series visibles tras un cambio de interruptores, conservando el punto si sigue visible. */
  function recalcularVisibles(repintar) {
    const antes = VIS[pos.s] ? { clave: VIS[pos.s].clave, i: pos.i } : null;
    VIS = seriesVisibles(D.c07, leerFiltros());
    const s = antes ? VIS.findIndex(x => x.clave === antes.clave) : -1;
    pos = s >= 0 ? { s, i: Math.min(antes.i, VIS[s].puntos.length - 1) } : puntoInicial(VIS);
    if (repintar) { pintarGrafico(); pintarComposicion(); }
  }

  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    const main = $("main");
    main.addEventListener("change", e => {
      const k = e.target.id && e.target.id.replace("ver-", "");
      if (["markowitz", "nsga2", "nsga3"].includes(k)) { guardarFiltros({ [k]: e.target.checked }); recalcularVisibles(true); }
    });
    main.addEventListener("click", e => {
      if (!e.target.closest("#llevar-punto") || !VIS[pos.s]) return;
      const s = VIS[pos.s];
      EIA.ui.llevarATrading({ pesos: s.puntos[pos.i].pesos, excluidos: [], nivel: null, origen: nombrePunto(s, pos.i), fuente: "optimizador" });
    });
    main.addEventListener("keydown", e => {
      if (!e.target.matches("#frontera .chart")) return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); seleccionar(pos, true); $("#composicion").focus(); return; }
      const n = navegar(pos, e.key, VIS.map(s => s.puntos.length));
      if (!n) return;
      e.preventDefault();
      pos = n; marcarFoco();
      EIA.ui.anunciar(describir(VIS[pos.s], pos.i));
    });
  }

  function pintar(datos) {
    D = datos;
    enlazar();
    recalcularVisibles(false);
    pintarFicha();
    EIA.ui.selectorCorte($("#corte-real"));
    pintarControles();
    pintarGrafico();
    pintarComposicion();
    pintarExplicacion();
    pintarElegibles();
  }

  EIA.modulo({
    id: "optimizador",
    async cargar() {
      const [c07, c05, c06, universo] = await EIA.todos([EIA.datos(ARCHIVO), EIA.datos(ARCHIVO_CLASIF), EIA.datos(ARCHIVO_REGRES), EIA.universo()]);
      return { c07, c05, c06, universo };
    },
    pintar
  });
})(typeof window !== "undefined" ? window : globalThis);
