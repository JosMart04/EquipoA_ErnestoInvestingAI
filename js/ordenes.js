/* Historial de órdenes (ordenes.html) — Spec W13 G.4, bloque Vigilancia: «watchlist, alertas, historial de órdenes».
   Lee las órdenes simuladas de este navegador (EIA.cartera.claveOrdenes(), una lista por modo de datos), las filtra,
   muestra totales con plural, la hora en la zona elegida y las exporta a CSV. Modelo de vista puro + pintado + EIA.modulo. */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const LADOS = ["", "C", "V"];

  /* ═════════════ Modelo de vista (puro) ═════════════ */

  /** Órdenes que cumplen los filtros {ticker, lado, desde, hasta} (fechas ISO, por día UTC), de la más reciente a la más antigua. */
  function filtrar(l, f) {
    const g = f || {};
    return (l || []).filter(o => (!g.ticker || o.ticker === g.ticker) && (!g.lado || o.lado === g.lado)
      && (!g.desde || String(o.fecha).slice(0, 10) >= g.desde) && (!g.hasta || String(o.fecha).slice(0, 10) <= g.hasta))
      .slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }
  /** Número de órdenes y montos comprado y vendido (cantidad × precio de cada orden). */
  function totales(l) {
    return (l || []).reduce((t, o) => {
      const m = o.cantidad * o.precio;
      if (o.lado === "C") t.comprado += m; else t.vendido += m;
      t.n++;
      return t;
    }, { n: 0, comprado: 0, vendido: 0 });
  }
  /** CSV con cabeceras estables (para análisis): fecha en UTC, montos en USD con punto decimal. */
  function aCSV(l) {
    const filas = (l || []).map(o => [o.fecha, o.ticker, o.lado === "C" ? "compra" : "venta", o.cantidad, o.precio, Math.round(o.cantidad * o.precio * 100) / 100].join(","));
    return "﻿" + ["fecha_utc,ticker,lado,cantidad,precio_usd,total_usd"].concat(filas).join("\n") + "\n";
  }

  const Ordenes = { filtrar, totales, aCSV, LADOS };
  if (typeof module !== "undefined" && module.exports) module.exports = Ordenes;
  if (typeof document === "undefined") return;
  global.Ordenes = Ordenes;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p), usd = x => EIA.fmt.usd(x);
  let enlazado = false;
  const todas = () => EIA.estado.get(EIA.cartera.claveOrdenes()) || [];
  const leerFiltros = () => Object.assign({ ticker: "", lado: "", desde: "", hasta: "" }, (EIA.estado.get("eia_filtros") || {}).ordenes);
  function guardarFiltros(cambio) {
    const todo = EIA.estado.get("eia_filtros") || {};
    todo.ordenes = Object.assign(leerFiltros(), cambio);
    EIA.estado.set("eia_filtros", todo);
  }

  function pintarFiltros() {
    const f = leerFiltros(), tickers = EIA.ordenar(Array.from(new Set(todas().map(o => o.ticker))));
    $("#f-activo").innerHTML = `<option value="">${esc(t("comun.todos"))}</option>` + tickers.map(tk => `<option value="${esc(tk)}"${tk === f.ticker ? " selected" : ""}>${esc(tk)}</option>`).join("");
    EIA.ui.segmentado($("#f-lado"), {
      etiqueta: t("trading.lado"), valor: f.lado,
      opciones: [["", t("comun.todos")], ["C", t("trading.compra")], ["V", t("trading.venta")]],
      alCambiar(v) { guardarFiltros({ lado: v }); pintarTabla(); }
    });
    $("#f-desde").value = f.desde; $("#f-hasta").value = f.hasta;
    $("#exportar").innerHTML = EIA.ui.icono("descargar") + esc(t("ordenes.exportar"));
  }

  function pintarTabla() {
    const todo = todas(), l = filtrar(todo, leerFiltros()), tot = totales(l);
    $("#exportar").disabled = !l.length;
    if (!todo.length) {
      $("#resumen").textContent = "";
      $("#tabla").innerHTML = EIA.ui.vacio({ icono: "historial", titulo: t("ordenes.vacio_titulo"), texto: t("ordenes.vacio_texto"), accion: { texto: t("ordenes.vacio_accion"), href: "trading.html" } });
      return;
    }
    $("#resumen").textContent = t("ordenes.resumen", { n: tot.n, comprado: usd(tot.comprado), vendido: usd(tot.vendido) });
    if (!l.length) { $("#tabla").innerHTML = EIA.ui.vacio({ icono: "buscar", titulo: t("ordenes.sin_resultados") }); return; }
    EIA.ui.tabla($("#tabla"), {
      id: "tabla-ordenes", titulo: t("ordenes.caption"),
      columnas: [
        // La hora sale en la zona elegida en Configuración (Spec G.5.4); se ordena por la fecha ISO
        { clave: "fecha", titulo: t("trading.col_cuando"), tipo: "texto", ordenable: true, fmt: v => `<time datetime="${esc(v)}">${esc(EIA.fmt.fechaHora(v))}</time>` },
        { clave: "ticker", titulo: t("trading.col_activo"), tipo: "texto", ordenable: true, fmt: v => `<a href="activo.html?t=${encodeURIComponent(v)}">${esc(v)}</a>` },
        { clave: "lado", titulo: t("trading.col_lado"), tipo: "texto", ordenable: true, valor: o => t(o.lado === "C" ? "trading.compra" : "trading.venta"),
          fmt: (v, o) => `<span class="lado lado-${o.lado === "C" ? "c" : "v"}">${esc(v)}</span>` },
        { clave: "cantidad", titulo: t("trading.col_cantidad"), tipo: "num", ordenable: true, fmt: v => esc(EIA.fmt.ent(v)) },
        { clave: "precio", titulo: t("trading.col_precio"), tipo: "num", ordenable: true, fmt: v => esc(usd(v)) },
        { clave: "total", titulo: t("trading.col_total"), tipo: "num", ordenable: true, valor: o => o.cantidad * o.precio, fmt: v => esc(usd(v)) }
      ],
      filas: l.map((o, i) => Object.assign({ clave: o.fecha + "|" + i }, o)), claveFila: o => o.clave, orden: { clave: "fecha", dir: "desc" }
    });
  }

  function exportar() {
    const l = filtrar(todas(), leerFiltros());
    if (!l.length) return;
    // Se genera en el navegador: no se envía nada a ningún servidor
    const url = URL.createObjectURL(new Blob([aCSV(l)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "ordenes_" + EIA.modo() + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    EIA.ui.anunciar(t("ordenes.exportado", { n: l.length }));
  }

  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    const main = $("main");
    main.addEventListener("change", e => {
      const el = e.target;
      if (el.id === "f-activo") { guardarFiltros({ ticker: el.value }); pintarTabla(); }
      else if (el.id === "f-desde" || el.id === "f-hasta") {
        let d = $("#f-desde").value, h = $("#f-hasta").value;
        if (d && h && d > h) { const x = d; d = h; h = x; $("#f-desde").value = d; $("#f-hasta").value = h; }
        guardarFiltros({ desde: d, hasta: h }); pintarTabla();
      }
    });
    main.addEventListener("click", e => { if (e.target.closest("#exportar")) exportar(); });
  }

  EIA.modulo({
    id: "ordenes",
    async cargar() { return {}; },
    pintar() { enlazar(); pintarFiltros(); pintarTabla(); }
  });
})(typeof window !== "undefined" ? window : globalThis);
