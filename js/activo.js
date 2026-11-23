/* Detalle de activo (activo.html?t=TICKER) — Spec W13 G.4, bloque Mercado: «velas, volumen, rangos, estados de carga».
   Reúne en una página lo que el sistema sabe de un activo: precio y riesgo (10), velas y volumen (03), cierres (02),
   correlaciones (04), la nota del material (01) y lo que dicen los modelos (05 y 06), siempre con su incertidumbre (G.6).
   Estructura del módulo de referencia (js/clasificacion.js): modelo de vista puro + pintado + EIA.modulo. Sin cifras escritas a mano. */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const Mk = (global.EIALib && global.EIALib.mercado) || require("./lib/mercado.js");
  const ARCHIVOS = { c10: "10_dashboard_mercado.json", c01: "01_universo_tickers.json", c02: "02_precios_sinteticos_504d.json",
    c03: "03_ohlcv_sintetico_120d.json", c04: "04_matriz_correlacion_covarianza.json", c05: "05_clasificadores_binarios.json", c06: "06_regresores_precio_30d.json" };
  /** Rangos del gráfico: todas las velas de 03, un año (252 sesiones, contrato §6) o toda la historia de 02. */
  const RANGOS = [["velas", "velas"], ["1a", 252], ["max", null]];
  const VECINOS = 5;

  /* ═════════════ Modelo de vista (puro) ═════════════ */

  /** Lo que dicen los modelos del activo: consenso de los clasificadores (05) y regresión a 30 sesiones (06).
      Cada parte es null si su archivo no está (publicación real parcial) o no trae el activo. */
  function resumenModelos(c05, c06, ticker) {
    const p = c05 && c05.predicciones && c05.predicciones[ticker];
    const r = c06 && c06.predicciones && c06.predicciones[ticker];
    const ultimo = a => a[a.length - 1];
    return {
      clasif: p ? { consenso: p.consenso, prob: p.prob_media, confianza: p.confianza, sube: p.votos_sube, baja: p.votos_baja, n: p.votos_sube + p.votos_baja } : null,
      regr: r ? { mediana: ultimo(r.ensamble_mediana), p10: ultimo(r.banda_p10), p90: ultimo(r.banda_p90), retorno: r.retorno_proyectado_30d_pct,
        n: r.ensamble_mediana.length, fecha: c06.fechas_pronostico ? ultimo(c06.fechas_pronostico) : null } : null
    };
  }
  /** Rango del gráfico según la clave elegida ({sesiones}). */
  function rangoDe(clave, c03) {
    const r = RANGOS.find(x => x[0] === clave) || RANGOS[0];
    return { sesiones: r[1] === "velas" ? c03.fechas.length : (r[1] || undefined) };
  }

  const Activo = { resumenModelos, rangoDe, RANGOS, VECINOS };
  if (typeof module !== "undefined" && module.exports) module.exports = Activo;
  if (typeof document === "undefined") return;
  global.Activo = Activo;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p), I = (n, c) => EIA.ui.icono(n, c);
  let D = null, elegido = null, rango = "velas", enlazado = false;

  function pintarControles() {
    $("#sel-activo").innerHTML = D.c10.map(a => `<option value="${esc(a.ticker)}"${a.ticker === elegido ? " selected" : ""}>${esc(t("dashboard.opcion_activo", { ticker: a.ticker, nombre: a.nombre }))}</option>`).join("");
    EIA.ui.segmentado($("#rango"), {
      etiqueta: t("dashboard.rango"), valor: rango,
      opciones: [["velas", t("dashboard.rango_velas", { n: D.c03.fechas.length })], ["1a", t("dashboard.rango_anios", { n: 1 })], ["max", t("dashboard.rango_max")]],
      alCambiar(v) { rango = v; pintarGrafico(); }
    });
  }

  function pintarCabecera(a) {
    const esta = EIA.watch.tiene(a.ticker), tk = encodeURIComponent(a.ticker);
    const fecha = D.c03.fechas[D.c03.fechas.length - 1];
    $("#cabecera").innerHTML = `<div class="activo-id"><span class="activo-tk"><bdi>${esc(a.ticker)}</bdi></span><span class="activo-nombre">${esc(a.nombre)}</span>
<span class="tag">${esc(EIA.nombre("grupo", a.grupo))}</span><span class="tag">${esc(EIA.nombre("sector", a.sector))}</span></div>
<p class="activo-precio"><span class="v cifra">${esc(EIA.fmt.usd(a.ultimo))}</span> ${EIA.ui.variacion(a.var_1d_pct)} <span class="mut">${esc(t("activo.cierre_de", { fecha: EIA.fmt.fecha(fecha, "larga") }))}</span></p>
<p class="acciones">
  <button type="button" class="estrella-btn" data-watch="${esc(a.ticker)}" aria-pressed="${esta}">${I("estrella")}${esc(t(esta ? "dashboard.watch_quitar" : "dashboard.watch_agregar", { ticker: a.ticker }))}</button>
  <a class="btn primary" href="trading.html?t=${tk}">${I("trading")}${esc(t("activo.operar"))}</a>
  <a class="btn" href="watchlist.html?t=${tk}">${I("campana")}${esc(t("activo.crear_alerta"))}</a>
  <a class="btn" href="comparador.html?activos=${tk},SPY">${I("comparar")}${esc(t("activo.comparar"))}</a>
</p>`;
  }

  function pintarKPIs(a) {
    const kpi = (rot, html) => `<div class="card kpi kpi-chico"><div class="mut">${esc(rot)}</div><div class="v">${html}</div></div>`;
    $("#kpis").innerHTML = [
      kpi(t("dashboard.col_dias", { n: 5 }), EIA.ui.variacion(a.var_5d_pct)),
      kpi(t("dashboard.col_meses", { n: 1 }), EIA.ui.variacion(a.var_1m_pct)),
      kpi(t("dashboard.col_meses", { n: 3 }), EIA.ui.variacion(a.var_3m_pct)),
      kpi(t("dashboard.col_vol"), esc(EIA.fmt.pct(a.volatilidad_anual_pct, 1, { signo: false }))),
      kpi(t("dashboard.col_beta"), esc(EIA.fmt.num(a.beta_vs_SPY))),
      kpi(t("activo.kpi_volumen"), esc(EIA.fmt.compacto(a.volumen)))
    ].join("");
  }

  function pintarGrafico() {
    const S = Mk.serieActivo(D.c02, D.c03, elegido, rangoDe(rango, D.c03)), est = Mk.estadisticas(S), num = v => esc(EIA.fmt.num(v));
    if (!est) { $("#grafico").innerHTML = EIA.ui.vacio({ icono: "mercado", titulo: t("dashboard.rango_vacio_titulo"), texto: t("dashboard.rango_vacio") }); return; }
    const columnas = [{ clave: "f", titulo: t("dashboard.col_fecha"), tipo: "texto", ordenable: true, fmt: v => esc(EIA.fmt.fecha(v)) }];
    if (S.tipo === "velas") columnas.push({ clave: "o", titulo: t("dashboard.col_apertura"), tipo: "num", ordenable: true, fmt: num }, { clave: "h", titulo: t("dashboard.col_maximo"), tipo: "num", ordenable: true, fmt: num }, { clave: "l", titulo: t("dashboard.col_minimo"), tipo: "num", ordenable: true, fmt: num });
    columnas.push({ clave: "c", titulo: t("dashboard.col_cierre"), tipo: "num", ordenable: true, fmt: num });
    if (S.tipo === "velas") columnas.push({ clave: "v", titulo: t("dashboard.col_volumen"), tipo: "num", ordenable: true, fmt: v => esc(EIA.fmt.compacto(v)) });
    EIA.ui.grafico($("#grafico"), {
      id: "velas-activo", alto: S.tipo === "velas" ? 440 : 352,
      titulo: t(S.tipo === "velas" ? "dashboard.velas_titulo" : "dashboard.linea_titulo", { ticker: elegido }),
      opciones: c => EIA.ui.opcionesVelas(c, S, elegido),
      tabla: () => ({ titulo: t(S.tipo === "velas" ? "dashboard.velas_tabla" : "dashboard.linea_tabla", { ticker: elegido }), columnas,
        filas: S.fechas.map((f, i) => ({ f, o: S.o && S.o[i], h: S.h && S.h[i], l: S.l && S.l[i], c: S.c[i], v: S.v && S.v[i] })), claveFila: x => x.f }),
      resumen: () => t("dashboard.velas_resumen", { ticker: elegido, ultimo: EIA.fmt.usd(est.ultimo), fecha: EIA.fmt.fecha(S.fechas[est.n - 1], "larga"), n: EIA.fmt.ent(est.n),
        variacion: EIA.fmt.pct(est.variacion), min: EIA.fmt.usd(est.min), max: EIA.fmt.usd(est.max) }),
      sonido: () => ({ series: [{ nombre: t("dashboard.serie_cierre", { ticker: elegido }), valores: S.c, etiquetas: S.fechas.map(f => EIA.fmt.fecha(f)), formato: v => EIA.fmt.usd(v), indice: 0 }] })
    });
  }

  function pintarModelos() {
    const m = resumenModelos(D.c05, D.c06, elegido), tk = encodeURIComponent(elegido);
    if (!m.clasif && !m.regr) { $("#modelos").innerHTML = EIA.ui.vacio({ icono: "info", titulo: t("activo.modelos_sin_datos") }); return; }
    const partes = [];
    if (m.clasif) {
      partes.push(`<h3>${esc(t("activo.modelos_clasif"))}</h3>
<p class="fila-chips">${EIA.ui.chipSenal(m.clasif.consenso, m.clasif.prob)} ${EIA.ui.chipConfianza(m.clasif.confianza)}</p>
<p>${esc(t("activo.modelos_votos", { sube: EIA.fmt.ent(m.clasif.sube), n: EIA.fmt.ent(m.clasif.n), prob: EIA.fmt.pct(m.clasif.prob * 100, 1, { signo: false }) }))}</p>
<p><a href="clasificacion.html?t=${tk}">${esc(t("dashboard.ver_clasificacion", { ticker: elegido }))}</a></p>`);
    }
    if (m.regr) {
      partes.push(`<h3>${esc(t("activo.modelos_regr"))}</h3>
<p class="retorno-chip ${m.regr.retorno >= 0 ? "up" : "dn"}">${esc(t(m.regr.retorno >= 0 ? "regresion.retorno_sube" : "regresion.retorno_baja", { pct: EIA.fmt.pct(m.regr.retorno), n: EIA.fmt.ent(m.regr.n) }))}</p>
<p>${esc(t("activo.modelos_mediana", { precio: EIA.fmt.usd(m.regr.mediana), fecha: m.regr.fecha ? EIA.fmt.fecha(m.regr.fecha, "larga") : "" }))} ${esc(t("regresion.tt_banda", { p10: EIA.fmt.usd(m.regr.p10), p90: EIA.fmt.usd(m.regr.p90) }))}</p>
<p><a href="regresion.html?t=${tk}">${esc(t("activo.ver_regresion", { ticker: elegido }))}</a></p>`);
    }
    partes.push(`<p class="mut">${esc(t("activo.modelos_aviso"))}</p>`);
    $("#modelos").innerHTML = partes.join("");
  }

  function pintarCorrelaciones() {
    if (!D.c04) { $("#correlaciones").innerHTML = EIA.ui.vacio({ icono: "info", titulo: t("activo.corr_sin_datos") }); return; }
    const v = Mk.vecinos(D.c04, elegido, VECINOS);
    const tabla = (titulo, filas) => `<div class="tw" role="region" tabindex="0" aria-label="${esc(titulo)}"><table><caption>${esc(titulo)}</caption>
<thead><tr><th scope="col" class="l">${esc(t("comun.activo"))}</th><th scope="col">${esc(t("activo.col_correlacion"))}</th></tr></thead>
<tbody>${filas.map(x => `<tr><th scope="row" class="l"><a href="activo.html?t=${encodeURIComponent(x.ticker)}">${esc(x.ticker)}</a></th><td>${esc(EIA.fmt.num(x.rho))}</td></tr>`).join("")}</tbody></table></div>`;
    $("#correlaciones").innerHTML = `<div class="corr-par">${tabla(t("activo.corr_mas"), v.mas)}${tabla(t("activo.corr_menos"), v.menos)}</div>`;
  }

  function pintarNota() {
    const a = D.c01 && D.c01.find(x => x.ticker === elegido), nota = a && a.nota ? a.nota : "";
    $("#sec-nota").hidden = !nota;
    if (!nota) return;
    // Texto libre del material del curso: EIA.textoDatos lo traduce si conoce el patrón; si no, lo deja escapado
    // y marcado con su idioma original (lang="es"), como el resto de textos libres de los JSON (Lab 13)
    $("#nota").innerHTML = EIA.textoDatos(nota);
  }

  function elegir(tk, anunciar) {
    elegido = tk;
    EIA.setActivo(tk);
    // La URL refleja el activo: se puede compartir y las migas lo usan como contexto
    try { const u = new URL(global.location.href); u.searchParams.set("t", tk); global.history.replaceState(null, "", u.pathname.split("/").pop() + u.search); } catch (e) { /* sin historial */ }
    const a = D.c10.find(x => x.ticker === tk);
    $("#sel-activo").value = tk;
    pintarCabecera(a); pintarKPIs(a); pintarGrafico(); pintarModelos(); pintarCorrelaciones(); pintarNota();
    if (anunciar) EIA.ui.anunciar(t("dashboard.seleccionado", { ticker: tk }));
  }

  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    const main = $("main");
    main.addEventListener("change", e => { if (e.target.id === "sel-activo") elegir(e.target.value, true); });
    main.addEventListener("click", e => {
      const b = e.target.closest("button[data-watch]");
      if (!b) return;
      const agregado = EIA.watch.alternar(b.dataset.watch);
      pintarCabecera(D.c10.find(x => x.ticker === elegido));
      EIA.ui.anunciar(t(agregado ? "dashboard.watch_agregado" : "dashboard.watch_quitado", { ticker: elegido }));
      const nuevo = $("#cabecera button[data-watch]"); if (nuevo) nuevo.focus();
    });
  }

  function pintar(datos) {
    D = datos;
    const pedido = EIA.activo();
    if (!elegido || !D.c10.some(a => a.ticker === elegido)) elegido = D.c10.some(a => a.ticker === pedido) ? pedido : D.c10[0].ticker;
    enlazar();
    pintarControles();
    elegir(elegido, false);
  }

  EIA.modulo({
    id: "activo",
    async cargar() {
      // 10, 02 y 03 son imprescindibles; el resto enriquece la página y puede faltar en una publicación real parcial
      const opcional = n => EIA.datos(ARCHIVOS[n]).catch(() => null);
      const [c10, c02, c03, c01, c04, c05, c06] = await EIA.todos([EIA.datos(ARCHIVOS.c10), EIA.datos(ARCHIVOS.c02), EIA.datos(ARCHIVOS.c03),
        opcional("c01"), opcional("c04"), opcional("c05"), opcional("c06")]);
      return { c10, c02, c03, c01, c04, c05, c06 };
    },
    pintar
  });
})(typeof window !== "undefined" ? window : globalThis);
