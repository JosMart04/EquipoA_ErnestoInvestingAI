/* Módulo Trading simulado (trading.html) — heredado de la Semana 4 y ampliado (R-HER-03, PLAN_MAESTRO §8.3 M3).
   Órdenes a mercado al último precio (10.ultimo, R-INT-04) con validación de efectivo y cantidad; los errores se asocian
   al campo (aria-invalid + aria-describedby) y el foco va al primer error. La cartera y su cálculo viven en el núcleo
   (EIA.cartera) porque también los usan el Leaderboard y «Llevar a Trading».
   Entradas: 10 (precios) y 11 (cartera demo). */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const ARCHIVO_MERCADO = "10_dashboard_mercado.json", ARCHIVO_DEMO = "11_watchlist_alertas_portafolio_demo.json";
  const MAX_HISTORIAL = 50; // órdenes que se muestran en el historial (las más recientes)

  /** Vista previa de una orden: costo o ingreso estimado y lo que quedaría. Pura. */
  function vistaPrevia(c, orden, precio) {
    const q = Number(orden.cantidad);
    if (!(precio > 0) || !Number.isInteger(q) || q < 1) return null;
    const total = q * precio, pos = c.posiciones.find(p => p.ticker === orden.ticker);
    return orden.lado === "C"
      ? { lado: "C", total, efectivoRestante: c.efectivo - total }
      : { lado: "V", total, quedan: (pos ? pos.cantidad : 0) - q };
  }

  const Trading = { vistaPrevia, MAX_HISTORIAL };
  if (typeof module !== "undefined" && module.exports) module.exports = Trading;
  if (typeof document === "undefined") return;
  global.Trading = Trading;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p), usd = x => EIA.fmt.usd(x);
  let D = null, enlazado = false;
  const precio = tk => { const a = D.c10.find(x => x.ticker === tk); return a ? a.ultimo : NaN; };
  const cartera = () => EIA.estado.get(EIA.cartera.clave()) || EIA.cartera.copia(D.c11.portafolio_demo);
  const ordenes = () => EIA.estado.get(EIA.cartera.claveOrdenes()) || [];
  const leerOrden = () => ({ ticker: $("#orden-activo").value, lado: ($("input[name=lado]:checked") || {}).value, cantidad: $("#orden-cantidad").value });

  function pintarResumen() {
    const c = cartera(), valor = EIA.cartera.valor(c, precio), inicial = EIA.cartera.valorInicial(D.c11.portafolio_demo);
    $("#resumen").innerHTML = `<div class="card kpi"><div class="mut">${esc(t("trading.efectivo"))}</div><div class="v" id="efectivo">${esc(usd(c.efectivo))}</div></div>
<div class="card kpi"><div class="mut">${esc(t("trading.valor"))}</div><div class="v" id="valor-portafolio">${esc(usd(valor))}</div></div>
<div class="card kpi"><div class="mut">${esc(t("trading.retorno"))}</div><div class="v">${EIA.ui.variacion((valor / inicial - 1) * 100)}</div><div class="mut">${esc(t("trading.retorno_base", { inicial: usd(inicial) }))}</div></div>`;
  }

  /** «Portafolio aplicado» (R-INT-03): lo crea «Llevar a Trading» desde Portafolios u Optimizador (T-25). */
  function pintarAplicado() {
    const e = EIA.estado.get("eia_elegido"), caja = $("#aplicado");
    const a = e && e.modo === EIA.modo() ? e.aplicado : null;
    caja.hidden = !a;
    if (!a) return;
    const texto = a.nivel ? t("trading.aplicado_texto", { nivel: EIA.nombre("nivel", a.nivel), origen: a.origen }) : t("trading.aplicado_texto_opt", { origen: a.origen });
    caja.innerHTML = `<h2>${esc(t("trading.aplicado_titulo"))}</h2><p>${esc(texto)}</p>${(a.excluidos || []).length ? `<p class="mut">${esc(t("trading.aplicado_excluidos", { lista: a.excluidos.join(", ") }))}</p>` : ""}`;
  }

  function pintarFormulario() {
    const actual = $("#orden-activo").value || EIA.activo();
    $("#orden-activo").innerHTML = D.c10.map(a => `<option value="${esc(a.ticker)}"${a.ticker === actual ? " selected" : ""}>${esc(t("trading.opcion_activo", { ticker: a.ticker, nombre: a.nombre }))}</option>`).join("");
    actualizarVista();
  }

  function actualizarVista() {
    const o = leerOrden(), p = precio(o.ticker);
    $("#precio-actual").textContent = Number.isFinite(p) ? t("trading.precio_actual", { precio: usd(p), fecha: EIA.fmt.fecha(D.fechaCorte, "larga") }) : "";
    const v = vistaPrevia(cartera(), o, p);
    $("#vista-previa").textContent = !v ? "" : v.lado === "C"
      ? t("trading.previa_compra", { total: usd(v.total), restante: usd(v.efectivoRestante) })
      : t("trading.previa_venta", { total: usd(v.total), n: v.quedan, ticker: o.ticker });
  }

  function pintarPosiciones() {
    const filas = EIA.cartera.filas(cartera(), precio);
    if (!filas.length) { $("#posiciones").innerHTML = `<p>${esc(t("trading.sin_posiciones"))}</p>`; return; }
    EIA.ui.tabla($("#posiciones"), {
      id: "tabla-posiciones", titulo: t("trading.posiciones_caption"),
      columnas: [
        { clave: "ticker", titulo: t("trading.col_activo"), tipo: "texto", ordenable: true, fmt: v => esc(v) },
        { clave: "cantidad", titulo: t("trading.col_cantidad"), tipo: "num", ordenable: true, fmt: v => esc(EIA.fmt.ent(v)) },
        { clave: "costo", titulo: t("trading.col_costo"), tipo: "num", ordenable: true, fmt: v => esc(usd(v)) },
        { clave: "ultimo", titulo: t("trading.col_ultimo"), tipo: "num", ordenable: true, fmt: v => esc(usd(v)) },
        { clave: "valor", titulo: t("trading.col_valor"), tipo: "num", ordenable: true, fmt: v => esc(usd(v)) },
        { clave: "pnl", titulo: t("trading.col_pnl"), tipo: "num", ordenable: true, fmt: (v, f) => `<span class="${v > 0 ? "up" : v < 0 ? "dn" : "mut"}">${esc(usd(v))}</span> ${EIA.ui.variacion(f.pnl_pct)}` }
      ],
      filas, claveFila: f => f.ticker, orden: { clave: "valor", dir: "desc" }
    });
  }

  function pintarHistorial() {
    const l = ordenes().slice(-MAX_HISTORIAL).reverse();
    if (!l.length) { $("#historial").innerHTML = `<p>${esc(t("trading.sin_ordenes"))}</p>`; return; }
    const hora = iso => new Intl.DateTimeFormat(EIA.idioma(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
    EIA.ui.tabla($("#historial"), {
      id: "tabla-historial", titulo: t("trading.historial_caption"),
      columnas: [
        { clave: "fecha", titulo: t("trading.col_cuando"), tipo: "texto", fmt: v => esc(hora(v)) },
        { clave: "lado", titulo: t("trading.col_lado"), tipo: "texto", fmt: v => esc(t(v === "C" ? "trading.compra" : "trading.venta")) },
        { clave: "ticker", titulo: t("trading.col_activo"), tipo: "texto", fmt: v => esc(v) },
        { clave: "cantidad", titulo: t("trading.col_cantidad"), tipo: "num", fmt: v => esc(EIA.fmt.ent(v)) },
        { clave: "precio", titulo: t("trading.col_precio"), tipo: "num", fmt: v => esc(usd(v)) },
        { clave: "total", titulo: t("trading.col_total"), tipo: "num", valor: f => f.cantidad * f.precio, fmt: v => esc(usd(v)) }
      ],
      filas: l, claveFila: f => f.fecha + f.ticker + f.lado
    });
  }

  function mostrarErrores(err) {
    const campos = [["cantidad", "#orden-cantidad", "#orden-cantidad-error"], ["ticker", "#orden-activo", "#orden-activo-error"]];
    let primero = null;
    for (const [campo, input, msj] of campos) {
      if (err[campo]) { $(input).setAttribute("aria-invalid", "true"); $(msj).textContent = t("trading.error_" + err[campo]); primero = primero || $(input); }
      else { $(input).removeAttribute("aria-invalid"); $(msj).textContent = ""; }
    }
    const hay = Object.keys(err).length;
    $("#orden-alerta").textContent = hay ? t("trading.revisa", { n: hay }) : "";
    if (primero) primero.focus();
  }

  function enviar() {
    const o = leerOrden(), p = precio(o.ticker), c = cartera();
    const err = EIA.cartera.validar(c, o, p);
    mostrarErrores(err);
    if (Object.keys(err).length) return;
    EIA.estado.set(EIA.cartera.clave(), EIA.cartera.ejecutar(c, o, p));
    const l = ordenes(); l.push({ fecha: new Date().toISOString(), ticker: o.ticker, lado: o.lado, cantidad: Number(o.cantidad), precio: p });
    EIA.estado.set(EIA.cartera.claveOrdenes(), l);
    const texto = t(o.lado === "C" ? "trading.ejecutada_compra" : "trading.ejecutada_venta", { n: Number(o.cantidad), ticker: o.ticker, precio: usd(p) });
    EIA.ui.notificar(texto, "ok"); EIA.ui.anunciar(texto);
    pintarResumen(); pintarPosiciones(); pintarHistorial(); actualizarVista();
  }

  function reiniciar() {
    EIA.ui.dialogo({
      titulo: t("trading.reiniciar_titulo"),
      contenido: `<p>${esc(t("trading.reiniciar_texto", { efectivo: usd(D.c11.portafolio_demo.efectivo) }))}</p>`,
      acciones: [{ texto: t("trading.cancelar"), valor: "no" }, { texto: t("trading.reiniciar_confirmar"), valor: "si", primario: true }],
      alCerrar(v) {
        if (v !== "si") return;
        EIA.estado.del(EIA.cartera.clave()); EIA.estado.del(EIA.cartera.claveOrdenes());
        mostrarErrores({}); pintarResumen(); pintarPosiciones(); pintarHistorial(); actualizarVista();
        EIA.ui.notificar(t("trading.reiniciada"), "ok"); EIA.ui.anunciar(t("trading.reiniciada"));
      }
    }).abrir();
  }

  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    const main = $("main");
    main.addEventListener("submit", e => { if (e.target.id === "form-orden") { e.preventDefault(); enviar(); } });
    main.addEventListener("input", e => { if (e.target.closest("#form-orden")) actualizarVista(); });
    main.addEventListener("change", e => { if (e.target.closest("#form-orden")) { actualizarVista(); if (e.target.id === "orden-activo") EIA.setActivo(e.target.value); } });
    main.addEventListener("click", e => { if (e.target.id === "reiniciar") reiniciar(); });
  }

  function pintar(datos) {
    D = datos;
    enlazar();
    pintarResumen();
    pintarAplicado();
    pintarFormulario();
    pintarPosiciones();
    pintarHistorial();
  }

  EIA.modulo({
    id: "trading",
    async cargar() {
      const [c10, c11, meta] = await Promise.all([EIA.datos(ARCHIVO_MERCADO), EIA.datos(ARCHIVO_DEMO), EIA.meta()]);
      return { c10, c11, fechaCorte: meta.fecha_corte };
    },
    pintar
  });
})(typeof window !== "undefined" ? window : globalThis);
