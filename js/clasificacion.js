/* Módulo de Clasificación binaria de tendencia (clasificacion.html) — MÓDULO DE REFERENCIA.
   Sigue las tareas y restricciones del prompt P03 de la guía más las extensiones del equipo
   (docs/plan/PLAN_IMPLEMENTACION.md §8 y §12). Los demás módulos imitan esta estructura:
     1) «modelo de vista»: funciones puras que leen el JSON y devuelven lo que se va a mostrar (se prueban en Node);
     2) «pintado»: vuelca el modelo de vista en el DOM con textos de EIA.t y formatos de EIA.fmt;
     3) EIA.modulo({id, cargar, pintar}) lo conecta con el modo de datos, el idioma y el tema.
   Entrada: 05_clasificadores_binarios.json (+ 10 para el universo y 13 para el horizonte). Ninguna cifra está escrita aquí. */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const ARCHIVO = "05_clasificadores_binarios.json", ARCHIVO_PARAMETROS = "13_patrones_y_parametros.json";
  const TOLERANCIA = 1e-9; // para comparar umbrales sin errores de coma flotante (0,58 − 0,5 ≠ 0,08 exacto)

  /* ═════════════ Modelo de vista (puro) ═════════════ */

  /** Intensidad del fondo de una celda: 3 si |p − 0,5| ≥ 0,08; 2 si ≥ 0,04; si no 1 (umbrales del Anexo B de la guía). */
  function intensidad(prob) {
    const d = Math.abs(prob - EIA.K.UMBRAL_SENAL);
    return d >= EIA.K.CONFIANZA_ALTA - TOLERANCIA ? 3 : (d >= EIA.K.CONFIANZA_MEDIA - TOLERANCIA ? 2 : 1);
  }
  /** Solo existen dos clases. Cualquier otro valor en los datos detiene el módulo en vez de mostrarse. */
  function senalBinaria(s, donde) {
    if (!EIA.SENALES.includes(s)) throw new Error("Señal no binaria en " + donde + ": " + s);
    return s;
  }
  function mediana(valores) {
    const o = valores.slice().sort((a, b) => a - b), m = Math.floor(o.length / 2);
    return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
  }

  /** Cifras de calidad de los modelos, todas derivadas del JSON (docs/CONTRATO_DATOS.md §5). */
  function resumen(c05) {
    const ms = c05.modelos, ex = ms.map(m => m.exactitud), auc = ms.map(m => m.auc), mc = ms[0].matriz_confusion;
    return {
      modelos: ms.length,
      porFamilia: ms.reduce((a, m) => { a[m.familia] = (a[m.familia] || 0) + 1; return a; }, {}),
      exactitudMin: Math.min.apply(null, ex), exactitudMax: Math.max.apply(null, ex), exactitudTipica: mediana(ex),
      aucMin: Math.min.apply(null, auc), aucMax: Math.max.apply(null, auc),
      // Tasa base: lo que acertaría un modelo que siempre dijera SUBE. Campo opcional del Modo real; si falta, se deriva.
      tasaBase: typeof c05.tasa_base_sube === "number" ? c05.tasa_base_sube : (mc.VP + mc.FN) / ms[0].n_prueba,
      nPrueba: ms[0].n_prueba
    };
  }

  /** Filas, columnas y celdas del mapa de calor según los filtros.
      filtros = {grupo, familia: "todos" | "ML" | "DL", soloWatch, watch: [tickers], ocultos: [modelos]} */
  function modeloVista(c05, universo, filtros) {
    const f = Object.assign({ grupo: "", familia: "todos", soloWatch: false, watch: [], ocultos: [] }, filtros);
    const columnas = c05.modelos
      .map((m, i) => ({ modelo: m.modelo, familia: m.familia, i }))
      .filter(m => (f.familia === "todos" || m.familia === f.familia) && !f.ocultos.includes(m.modelo));
    const filas = universo
      .filter(a => c05.predicciones[a.ticker] && (!f.grupo || a.grupo === f.grupo) && (!f.soloWatch || f.watch.includes(a.ticker)))
      .map(a => {
        const p = c05.predicciones[a.ticker];
        return {
          ticker: a.ticker, nombre: a.nombre, grupo: a.grupo,
          consenso: senalBinaria(p.consenso, a.ticker), confianza: p.confianza,
          votos_sube: p.votos_sube, votos_baja: p.votos_baja, prob_media: p.prob_media,
          celdas: columnas.map(c => {
            const m = p.modelos[c.i];
            // La señal se LEE del JSON; la probabilidad solo decide la intensidad del fondo
            return { modelo: c.modelo, familia: c.familia, prob: m.prob_sube, senal: senalBinaria(m.senal, a.ticker + " / " + c.modelo), nivel: intensidad(m.prob_sube) };
          })
        };
      });
    return { columnas, filas, celdas: filas.length * columnas.length };
  }

  /** Métricas visibles (respeta familia y modelos ocultos). */
  function metricasVisibles(c05, filtros) {
    const f = Object.assign({ familia: "todos", ocultos: [] }, filtros);
    return c05.modelos.filter(m => (f.familia === "todos" || m.familia === f.familia) && !f.ocultos.includes(m.modelo));
  }

  const Clasificacion = { intensidad, senalBinaria, mediana, resumen, modeloVista, metricasVisibles, ARCHIVO };
  if (typeof module !== "undefined" && module.exports) module.exports = Clasificacion;
  if (typeof document === "undefined") return;
  global.Clasificacion = Clasificacion;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $, $$ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p);
  const simbolo = s => (s === "SUBE" ? "▲" : "▼");
  const conSimbolo = s => simbolo(s) + " " + EIA.nombre("senal", s);
  const pct = (fraccion, d) => EIA.fmt.pct(fraccion * 100, d == null ? 1 : d, { signo: false });

  let D = null, R = null, vista = null, elegido = null, modeloElegido = null, enlazado = false;
  const leerFiltros = () => Object.assign({ grupo: "", familia: "todos", soloWatch: false }, (EIA.estado.get("eia_filtros") || {}).clasificacion);
  function guardarFiltros(cambio) {
    const todo = EIA.estado.get("eia_filtros") || {};
    todo.clasificacion = Object.assign(leerFiltros(), cambio);
    EIA.estado.set("eia_filtros", todo);
  }
  const ocultos = () => EIA.estado.get("eia_modelos_ocultos") || [];
  const filtrosActivos = () => Object.assign(leerFiltros(), { watch: EIA.watch.lista(), ocultos: ocultos() });

  function pintarFicha() {
    EIA.ui.fichaIA($("#ficha"), {
      que_hace: t("clasificacion.ficha_que_hace", { n: R.modelos, ml: R.porFamilia.ML || 0, dl: R.porFamilia.DL || 0, h: D.horizonte }),
      que_tan_bien: t("clasificacion.ficha_que_tan_bien", { exmin: pct(R.exactitudMin), exmax: pct(R.exactitudMax), aucmin: EIA.fmt.num(R.aucMin), aucmax: EIA.fmt.num(R.aucMax), n: EIA.fmt.ent(R.nPrueba), base: pct(R.tasaBase) }),
      por_que: t("clasificacion.ficha_por_que", { n: R.modelos, mitad: pct(EIA.K.UMBRAL_SENAL, 0) }),
      controlas: t("clasificacion.ficha_controlas"),
      ignorar: t("clasificacion.ficha_ignorar")
    });
  }

  function pintarFiltros() {
    const f = leerFiltros();
    const grupos = Array.from(new Set(D.universo.map(a => a.grupo)));
    $("#filtro-grupo").innerHTML = `<option value="">${esc(t("comun.todos"))}</option>` + grupos.map(g => `<option value="${esc(g)}"${g === f.grupo ? " selected" : ""}>${esc(EIA.nombre("grupo", g))}</option>`).join("");
    EIA.ui.segmentado($("#filtro-familia"), {
      etiqueta: t("comun.familia"), valor: f.familia,
      opciones: [["todos", t("clasificacion.familia_todos", { n: R.modelos })]].concat(Object.keys(R.porFamilia).map(k => [k, t("clasificacion.familia_n", { familia: EIA.nombre("familia", k), n: R.porFamilia[k] })])),
      alCambiar(v) { guardarFiltros({ familia: v }); pintarDatos(); }
    });
    EIA.ui.segmentado($("#vista"), {
      etiqueta: t("clasificacion.vista"), valor: vista,
      opciones: [["matriz", t("clasificacion.vista_matriz")], ["activos", t("clasificacion.vista_activos")]],
      alCambiar(v) { vista = v; guardarFiltros({ vista: v }); pintarMapa(); }
    });
    $("#solo-watchlist").checked = !!f.soloWatch;
    const oc = ocultos();
    $("#lista-modelos").innerHTML = D.c05.modelos.map(m => `<label class="casilla"><input type="checkbox" data-modelo="${esc(m.modelo)}"${oc.includes(m.modelo) ? "" : " checked"}> ${esc(EIA.nombre("modelo", m.modelo))} <span class="mut">${esc(EIA.nombre("familia", m.familia))}</span></label>`).join("")
      + `<button type="button" id="mostrar-todos">${esc(t("clasificacion.mostrar_todos"))}</button>`;
  }

  const etiquetaCelda = (fila, c) => t("clasificacion.celda_aria", { ticker: fila.ticker, modelo: EIA.nombre("modelo", c.modelo), senal: EIA.nombre("senal", c.senal), prob: pct(c.prob, 0) });
  const claseCelda = c => "c-" + (c.senal === "SUBE" ? "up" : "dn") + "-" + c.nivel;
  function botonWatch(ticker) {
    const esta = EIA.watch.tiene(ticker);
    return `<button type="button" class="estrella" data-watch="${esc(ticker)}" aria-pressed="${esta}" aria-label="${esc(t(esta ? "clasificacion.watch_quitar" : "clasificacion.watch_agregar", { ticker }))}"><span aria-hidden="true">${esta ? "★" : "☆"}</span></button>`;
  }

  function htmlMatriz(mv) {
    const cab = mv.columnas.map(c => `<th scope="col" title="${esc(EIA.nombre("modelo", c.modelo))}"><span aria-hidden="true">${esc(EIA.nombre("modelo_corto", c.modelo))}</span><span class="sr">${esc(EIA.nombre("modelo", c.modelo))}</span> <span class="fam">${esc(EIA.nombre("familia", c.familia))}</span></th>`).join("");
    const cuerpo = mv.filas.map(f => `<tr data-fila="${esc(f.ticker)}"${f.ticker === elegido ? ' class="elegida"' : ""}><th scope="row" class="l fija"><button type="button" class="enlace" data-ticker="${esc(f.ticker)}" title="${esc(f.nombre)}">${esc(f.ticker)}</button>${botonWatch(f.ticker)}</th>${
      f.celdas.map(c => `<td data-celda data-senal="${c.senal}" class="${claseCelda(c)}" aria-label="${esc(etiquetaCelda(f, c))}"><span aria-hidden="true">${simbolo(c.senal)}</span> ${esc(EIA.nombre("senal", c.senal))}<span class="p">${esc(EIA.fmt.prob(c.prob))}</span></td>`).join("")
    }<td class="l">${EIA.ui.chipSenal(f.consenso, f.prob_media)}</td></tr>`).join("");
    return `<div class="tw mapa-region" role="region" tabindex="0" aria-label="${esc(t("clasificacion.mapa_region"))}"><table id="mapa-calor" class="mapa"><caption class="sr">${esc(t("clasificacion.mapa_caption"))}</caption><thead><tr><th scope="col" class="l fija">${esc(t("comun.activo"))}</th>${cab}<th scope="col" class="l">${esc(t("clasificacion.col_consenso"))}</th></tr></thead><tbody>${cuerpo}</tbody></table></div>`;
  }
  function htmlPorActivo(mv) {
    return `<ul id="lista-activos" class="lista-activos">${mv.filas.map(f => `<li data-fila="${esc(f.ticker)}"><details${f.ticker === elegido ? " open" : ""}><summary><span class="la-cab"><strong>${esc(f.ticker)}</strong> <span class="mut">${esc(f.nombre)}</span></span> ${EIA.ui.chipSenal(f.consenso, f.prob_media)} <span class="mut">${esc(t("clasificacion.votos_cortos", { sube: f.votos_sube, baja: f.votos_baja }))}</span></summary>
<ul class="chips-modelos">${f.celdas.map(c => `<li data-celda-lista data-senal="${c.senal}" class="${claseCelda(c)}"><span class="m">${esc(EIA.nombre("modelo", c.modelo))}</span> <span><span aria-hidden="true">${simbolo(c.senal)}</span> ${esc(EIA.nombre("senal", c.senal))} ${esc(EIA.fmt.prob(c.prob))}</span></li>`).join("")}</ul>
<p class="acciones"><button type="button" data-ticker="${esc(f.ticker)}">${esc(t("clasificacion.ver_consenso", { ticker: f.ticker }))}</button>${botonWatch(f.ticker)}</p></details></li>`).join("")}</ul>`;
  }

  function pintarMapa() {
    const mv = modeloVista(D.c05, D.universo, filtrosActivos());
    const caja = $("#mapa-envoltura");
    $("#contador").textContent = t("clasificacion.contador", { activos: mv.filas.length, modelos: mv.columnas.length, celdas: EIA.fmt.ent(mv.celdas) });
    if (mv.columnas.length === 0) caja.innerHTML = `<p>${esc(t("clasificacion.sin_modelos"))}</p>`;
    else if (mv.filas.length === 0) caja.innerHTML = `<p>${esc(t("clasificacion.sin_filas"))}</p>`;
    else caja.innerHTML = vista === "activos" ? htmlPorActivo(mv) : htmlMatriz(mv);
    return mv;
  }

  function pintarConsenso() {
    const caja = $("#consenso"), p = D.c05.predicciones[elegido], a = D.universo.find(x => x.ticker === elegido);
    if (!p || !a) { caja.innerHTML = ""; return; }
    const total = p.votos_sube + p.votos_baja, ancho = v => (total ? (100 * v / total).toFixed(2) : 0);
    const consenso = senalBinaria(p.consenso, elegido);
    caja.innerHTML = `<h2 id="h-consenso">${esc(t("clasificacion.consenso_titulo", { ticker: elegido }))}</h2>
<p class="mut">${esc(a.nombre)} · ${esc(EIA.nombre("grupo", a.grupo))}</p>
<p class="fila-chips">${EIA.ui.chipSenal(consenso, p.prob_media)} ${EIA.ui.chipConfianza(p.confianza)}</p>
<div class="votos-barra" role="img" aria-label="${esc(t("clasificacion.votos_aria", { sube: p.votos_sube, baja: p.votos_baja }))}">${
      p.votos_sube ? `<span class="c-up-3" style="width:${ancho(p.votos_sube)}%">▲ ${p.votos_sube}</span>` : ""}${
      p.votos_baja ? `<span class="c-dn-3" style="width:${ancho(p.votos_baja)}%">▼ ${p.votos_baja}</span>` : ""}</div>
<p>${esc(t("clasificacion.consenso_explica", { n: total, sube: p.votos_sube, baja: p.votos_baja, prob: pct(p.prob_media), senal: conSimbolo(consenso), confianza: EIA.nombre("confianza", p.confianza) }))}</p>
<p class="mut">${esc(t("clasificacion.confianza_explica", { mitad: pct(EIA.K.UMBRAL_SENAL, 0), alta: EIA.fmt.num(EIA.K.CONFIANZA_ALTA * 100, 0), media: EIA.fmt.num(EIA.K.CONFIANZA_MEDIA * 100, 0) }))}</p>
<p class="mut">${esc(t("clasificacion.consenso_recuerda", { min: pct(R.exactitudMin, 0), max: pct(R.exactitudMax, 0) }))}</p>
<p class="acciones"><a class="btn primary" id="enlace-regresion" href="regresion.html?t=${encodeURIComponent(elegido)}">${esc(t("clasificacion.ver_regresion"))} <span aria-hidden="true">→</span></a>
<a class="btn" id="enlace-optimizador" href="optimizador.html?t=${encodeURIComponent(elegido)}">${esc(t("clasificacion.ver_optimizador"))} <span aria-hidden="true">→</span></a></p>`;
  }

  function pintarMatrizConfusion() {
    const caja = $("#matriz-confusion"), m = D.c05.modelos.find(x => x.modelo === modeloElegido);
    if (!m) { caja.innerHTML = ""; return; }
    const mc = m.matriz_confusion, nombre = EIA.nombre("modelo", m.modelo);
    const sube = conSimbolo("SUBE"), baja = conSimbolo("BAJA");
    caja.innerHTML = `<h2>${esc(t("clasificacion.mc_titulo", { modelo: nombre }))}</h2>
<table class="confusion"><caption class="sr">${esc(t("clasificacion.mc_caption", { modelo: nombre }))}</caption>
<thead><tr><td></td><th scope="col">${esc(t("clasificacion.mc_real", { senal: sube }))}</th><th scope="col">${esc(t("clasificacion.mc_real", { senal: baja }))}</th></tr></thead>
<tbody><tr><th scope="row" class="l">${esc(t("clasificacion.mc_dijo", { senal: sube }))}</th><td class="acierto">${esc(t("clasificacion.mc_aciertos", { n: mc.VP }))}</td><td>${esc(t("clasificacion.mc_errores", { n: mc.FP }))}</td></tr>
<tr><th scope="row" class="l">${esc(t("clasificacion.mc_dijo", { senal: baja }))}</th><td>${esc(t("clasificacion.mc_errores", { n: mc.FN }))}</td><td class="acierto">${esc(t("clasificacion.mc_aciertos", { n: mc.VN }))}</td></tr></tbody></table>
<p>${esc(t("clasificacion.mc_frase", { dijo: mc.VP + mc.FP, vp: mc.VP, dijo_baja: mc.VN + mc.FN, vn: mc.VN, n: EIA.fmt.ent(m.n_prueba) }))}</p>`;
  }

  function pintarMetricas() {
    const ms = metricasVisibles(D.c05, filtrosActivos());
    if (!ms.find(m => m.modelo === modeloElegido)) {
      modeloElegido = ms.length ? ms.slice().sort((a, b) => b.exactitud - a.exactitud)[0].modelo : null;
    }
    const comoPct = v => esc(pct(v)), comoNum = v => esc(EIA.fmt.num(v, 3));
    EIA.ui.tabla($("#metricas"), {
      id: "tabla-metricas", titulo: t("clasificacion.metricas_caption", { n: EIA.fmt.ent(R.nPrueba) }),
      columnas: [
        { clave: "modelo", titulo: t("comun.modelo"), tipo: "texto", ordenable: true, valor: m => EIA.nombre("modelo", m.modelo), fmt: v => esc(v) },
        { clave: "familia", titulo: t("comun.familia"), tipo: "texto", ordenable: true, fmt: v => esc(EIA.nombre("familia", v)) },
        { clave: "exactitud", titulo: t("clasificacion.col_exactitud"), tipo: "num", ordenable: true, fmt: comoPct },
        { clave: "precision", titulo: t("clasificacion.col_precision"), tipo: "num", ordenable: true, fmt: comoPct },
        { clave: "recall", titulo: t("clasificacion.col_recall"), tipo: "num", ordenable: true, fmt: comoPct },
        { clave: "f1", titulo: t("clasificacion.col_f1"), tipo: "num", ordenable: true, fmt: comoNum },
        { clave: "auc", titulo: t("clasificacion.col_auc"), tipo: "num", ordenable: true, fmt: comoNum }
      ],
      filas: ms, claveFila: m => m.modelo, orden: { clave: "exactitud", dir: "desc" }, elegida: modeloElegido,
      alElegir(m) { modeloElegido = m.modelo; pintarMatrizConfusion(); }
    });
    pintarMatrizConfusion();
  }

  function pintarHonestidad() {
    const cien = 100, mitad = EIA.K.UMBRAL_SENAL * cien;
    $("#honestidad").innerHTML = `<h2>${esc(t("clasificacion.honestidad_titulo", { tipico: pct(R.exactitudTipica, 0) }))}</h2>
<p>${esc(t("clasificacion.honestidad_p1", { cien: EIA.fmt.ent(cien), mitad: EIA.fmt.ent(mitad), n: R.modelos, min: EIA.fmt.ent(Math.round(R.exactitudMin * cien)), max: EIA.fmt.ent(Math.round(R.exactitudMax * cien)) }))}</p>
<p>${esc(t("clasificacion.honestidad_p2", { base: pct(R.tasaBase), dias: EIA.fmt.ent(R.nPrueba) }))}</p>`;
  }

  /** Mapa, consenso y métricas: lo que cambia con los filtros. */
  function pintarDatos() {
    const mv = pintarMapa();
    if (!mv.filas.find(f => f.ticker === elegido) && mv.filas.length) { elegido = mv.filas[0].ticker; pintarMapa(); }
    pintarConsenso();
    pintarMetricas();
  }

  function elegir(ticker, anunciar) {
    elegido = ticker;
    EIA.setActivo(ticker);
    $$("[data-fila]").forEach(n => n.classList.toggle("elegida", n.dataset.fila === ticker));
    pintarConsenso();
    if (anunciar) EIA.ui.anunciar(t("clasificacion.seleccionado", { ticker }));
  }

  /** Oyentes del módulo: se enlazan una sola vez (el contenido se repinta, los contenedores no). */
  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    const main = $("main");
    main.addEventListener("click", e => {
      const bw = e.target.closest("button[data-watch]"), bt = e.target.closest("button[data-ticker]");
      if (bw) {
        const tk = bw.dataset.watch, agregado = EIA.watch.alternar(tk);
        EIA.ui.anunciar(t(agregado ? "clasificacion.watch_agregado" : "clasificacion.watch_quitado", { ticker: tk }));
        pintarDatos();
        const otra = $$("button[data-watch]").find(b => b.dataset.watch === tk); if (otra) otra.focus();
      } else if (bt) elegir(bt.dataset.ticker, true);
      else if (e.target.id === "mostrar-todos") { EIA.estado.set("eia_modelos_ocultos", []); pintarFiltros(); pintarDatos(); $("#mostrar-todos").focus(); }
    });
    main.addEventListener("change", e => {
      const el = e.target;
      if (el.id === "filtro-grupo") { guardarFiltros({ grupo: el.value }); pintarDatos(); }
      else if (el.id === "solo-watchlist") { guardarFiltros({ soloWatch: el.checked }); pintarDatos(); }
      else if (el.dataset.modelo) {
        const oc = ocultos().filter(m => m !== el.dataset.modelo);
        if (!el.checked) oc.push(el.dataset.modelo);
        EIA.estado.set("eia_modelos_ocultos", oc);
        pintarDatos();
      }
    });
  }

  function pintar(datos) {
    D = datos;
    R = resumen(D.c05);
    const f = leerFiltros();
    // Bajo 640 px la vista por defecto es «Por activo»; la matriz sigue a un clic
    if (!vista) vista = f.vista || (global.matchMedia && global.matchMedia("(max-width: 640px)").matches ? "activos" : "matriz");
    const pedido = EIA.activo();
    if (!elegido || !D.c05.predicciones[elegido]) elegido = D.c05.predicciones[pedido] ? pedido : D.universo[0].ticker;
    enlazar();
    pintarFicha();
    EIA.ui.selectorCorte($("#corte-real"));
    pintarFiltros();
    pintarDatos();
    pintarHonestidad();
  }

  EIA.modulo({
    id: "clasificacion",
    async cargar() {
      const [c05, universo, parametros] = await Promise.all([EIA.datos(ARCHIVO), EIA.universo(), EIA.datos(ARCHIVO_PARAMETROS)]);
      return { c05, universo, horizonte: parametros.parametros.N_FC };
    },
    pintar
  });
})(typeof window !== "undefined" ? window : globalThis);
