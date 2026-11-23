/* Módulo Watchlist y alertas (watchlist.html) — heredado de la Semana 4 y ampliado (R-HER-02, PLAN_MAESTRO §8.3 M2).
   Estructura del módulo de referencia: modelo de vista puro + pintado + EIA.modulo.
   Entradas: 10 (precios y variaciones), 11 (watchlist inicial y alertas iniciales) y 02 (minigráficos).
   La watchlist se guarda en eia_watch (la comparten todos los módulos) y las alertas en eia_alertas (eia_alertas_real
   en el Modo real, porque sus umbrales dependen de los precios). */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const ARCHIVO_MERCADO = "10_dashboard_mercado.json", ARCHIVO_DEMO = "11_watchlist_alertas_portafolio_demo.json", ARCHIVO_CIERRES = "02_precios_sinteticos_504d.json";
  const SESIONES_MINIGRAFICO = 60;                    // la base del profesor muestra las últimas 60 sesiones
  const TIPOS = ["precio_sobre", "precio_bajo", "var_1d_menor_a_pct", "var_1d_mayor_a_pct"];

  /* ═════════════ Modelo de vista (puro) ═════════════ */

  // Reglas y alertas iniciales: en el núcleo (EIA.alertas), para que el centro de notificaciones avise en cualquier página
  const alertaDisparada = (a, activo) => EIA.alertas.disparada(a, activo);
  const alertasIniciales = c11 => EIA.alertas.iniciales(c11);
  function validarAlerta(a, tickers) {
    const e = {};
    if (!tickers.includes(a.ticker)) e.ticker = "ticker";
    if (!TIPOS.includes(a.tipo)) e.tipo = "tipo";
    if (a.umbral === "" || a.umbral == null || !Number.isFinite(Number(a.umbral))) e.umbral = "numero";
    else if (a.tipo && a.tipo.indexOf("precio") === 0 && Number(a.umbral) <= 0) e.umbral = "positivo";
    return e;
  }
  /** Normaliza lo que escribe el usuario en «Agregar activo»: acepta el ticker o «TICKER · Nombre». */
  function tickerDeTexto(texto, c10) {
    const s = String(texto || "").trim().toUpperCase();
    if (!s) return null;
    const exacto = c10.find(a => a.ticker === s.split(/\s|·/)[0]);
    if (exacto) return exacto.ticker;
    const porNombre = c10.filter(a => a.nombre.toUpperCase().includes(s));
    return porNombre.length === 1 ? porNombre[0].ticker : null;
  }
  /** Últimos cierres para el minigráfico y su variación. */
  function minigrafico(c02, ticker, n) {
    const c = (c02.cierres[ticker] || []).slice(-(n || SESIONES_MINIGRAFICO));
    if (!c.length) return null;
    return { cierres: c, min: Math.min.apply(null, c), max: Math.max.apply(null, c), variacion: (c[c.length - 1] / c[0] - 1) * 100, desde: c02.fechas[c02.fechas.length - c.length], hasta: c02.fechas[c02.fechas.length - 1] };
  }

  const Watchlist = { alertaDisparada, alertasIniciales, validarAlerta, tickerDeTexto, minigrafico, TIPOS, SESIONES_MINIGRAFICO };
  if (typeof module !== "undefined" && module.exports) module.exports = Watchlist;
  if (typeof document === "undefined") return;
  global.Watchlist = Watchlist;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $, $$ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p);
  let D = null, enlazado = false, anunciado = false;
  const claveAlertas = () => EIA.alertas.clave();
  const alertas = () => EIA.estado.get(claveAlertas()) || alertasIniciales(D.c11);
  const guardarAlertas = l => EIA.estado.set(claveAlertas(), l);
  const activo = tk => D.c10.find(a => a.ticker === tk);
  const condicion = a => EIA.alertas.texto(a);
  const insignia = () => `<span class="insignia-disparada"><span aria-hidden="true">⚠</span> ${esc(t("watchlist.disparada"))}</span>`;

  function svgMini(tk) {
    const m = minigrafico(D.c02, tk); if (!m) return "";
    const ancho = 180, alto = 30, paso = ancho / Math.max(1, m.cierres.length - 1), rango = m.max - m.min || 1;
    const pts = m.cierres.map((v, i) => (i * paso).toFixed(1) + "," + (alto - 2 - (alto - 4) * (v - m.min) / rango).toFixed(1)).join(" ");
    const etiqueta = t("watchlist.mini_aria", { ticker: tk, n: m.cierres.length, desde: EIA.fmt.usd(m.cierres[0]), hasta: EIA.fmt.usd(m.cierres[m.cierres.length - 1]), variacion: EIA.fmt.pct(m.variacion) });
    return `<svg class="mini" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="${esc(etiqueta)}"><title>${esc(etiqueta)}</title><polyline fill="none" stroke="currentColor" stroke-width="1.6" points="${pts}"/></svg>`;
  }

  function pintarAgregar() {
    $("#tickers").innerHTML = D.c10.map(a => `<option value="${esc(t("watchlist.opcion_activo", { ticker: a.ticker, nombre: a.nombre }))}"></option>`).join("");
    $("#nuevo-ticker").innerHTML = D.c10.map(a => `<option value="${esc(a.ticker)}">${esc(t("watchlist.opcion_activo", { ticker: a.ticker, nombre: a.nombre }))}</option>`).join("");
    $("#nuevo-tipo").innerHTML = TIPOS.map(k => `<option value="${k}">${esc(EIA.nombre("alerta_tipo", k))}</option>`).join("");
  }

  function pintarLista() {
    const lista = EIA.watch.lista().filter(tk => activo(tk)), al = alertas();
    $("#contador").textContent = t("watchlist.contador", { n: lista.length });
    if (!lista.length) { $("#lista").innerHTML = EIA.ui.vacio({ icono: "estrella", titulo: t("watchlist.vacia_titulo"), texto: t("watchlist.vacia"), accion: { texto: t("watchlist.vacia_accion"), href: "index.html" } }); return; }
    const disparadas = tk => al.filter(a => a.ticker === tk && alertaDisparada(a, activo(tk)));
    EIA.ui.tabla($("#lista"), {
      id: "tabla-watch", titulo: t("watchlist.tabla_caption"),
      columnas: [
        { clave: "ticker", titulo: t("watchlist.col_ticker"), tipo: "texto", ordenable: true, fmt: v => `<a href="activo.html?t=${encodeURIComponent(v)}">${esc(v)}</a>` },
        { clave: "ultimo", titulo: t("watchlist.col_ultimo"), tipo: "num", ordenable: true, valor: f => activo(f.ticker).ultimo, fmt: v => esc(EIA.fmt.usd(v)) },
        { clave: "var", titulo: t("watchlist.col_1d"), tipo: "num", ordenable: true, valor: f => activo(f.ticker).var_1d_pct, fmt: v => EIA.ui.variacion(v) },
        { clave: "mini", titulo: t("watchlist.col_mini", { n: SESIONES_MINIGRAFICO }), tipo: "texto", fmt: (v, f) => svgMini(f.ticker) },
        { clave: "alertas", titulo: t("watchlist.col_alertas"), tipo: "texto", valor: f => disparadas(f.ticker).length,
          fmt: (v, f) => { const a = al.filter(x => x.ticker === f.ticker && x.activa); return a.length ? a.map(x => `<span class="alerta-celda">${esc(condicion(x))}${alertaDisparada(x, activo(f.ticker)) ? " " + insignia() : ""}</span>`).join("<br>") : `<span class="mut">${esc(t("watchlist.sin_alertas"))}</span>`; } },
        { clave: "acciones", titulo: t("watchlist.col_acciones"), tipo: "texto", fmt: (v, f) => `<a href="regresion.html?t=${encodeURIComponent(f.ticker)}">${esc(t("watchlist.ver_regresion"))}</a> · <a href="clasificacion.html?t=${encodeURIComponent(f.ticker)}">${esc(t("watchlist.ver_clasificacion"))}</a> · <button type="button" class="quitar" data-quitar="${esc(f.ticker)}" aria-label="${esc(t("watchlist.quitar_aria", { ticker: f.ticker }))}">${esc(t("watchlist.quitar"))}</button>` }
      ],
      filas: lista.map(ticker => ({ ticker })), claveFila: f => f.ticker,
      claseFila: f => (disparadas(f.ticker).length ? "fila-disparada" : "")
    });
  }

  function pintarAlertas() {
    const al = alertas();
    if (!al.length) { $("#alertas").innerHTML = `<p>${esc(t("watchlist.sin_alertas_config"))}</p>`; return; }
    $("#alertas").innerHTML = `<div class="tw" role="region" tabindex="0" aria-label="${esc(t("watchlist.alertas_caption"))}"><table id="tabla-alertas"><caption>${esc(t("watchlist.alertas_caption"))}</caption>
<thead><tr><th scope="col" class="l">${esc(t("watchlist.col_ticker"))}</th><th scope="col" class="l">${esc(t("watchlist.col_tipo"))}</th><th scope="col" class="l">${esc(t("watchlist.col_umbral"))}</th><th scope="col" class="l">${esc(t("watchlist.col_estado"))}</th><th scope="col" class="l">${esc(t("watchlist.col_activa"))}</th><th scope="col" class="l">${esc(t("watchlist.col_acciones"))}</th></tr></thead>
<tbody>${al.map(a => { const disp = alertaDisparada(a, activo(a.ticker)); return `<tr data-alerta="${esc(a.id)}"${disp ? ' class="fila-disparada"' : ""}>
<th scope="row" class="l">${esc(a.ticker)}</th><td class="l">${esc(EIA.nombre("alerta_tipo", a.tipo))}</td>
<td class="l"><label class="sr" for="umbral-${esc(a.id)}">${esc(t("watchlist.umbral_aria", { condicion: condicion(a) }))}</label><input type="number" step="any" class="umbral" id="umbral-${esc(a.id)}" data-umbral="${esc(a.id)}" value="${esc(a.umbral)}"></td>
<td class="l">${disp ? insignia() : `<span class="mut">${esc(t(a.activa ? "watchlist.no_disparada" : "watchlist.inactiva"))}</span>`}</td>
<td class="l"><label class="casilla"><input type="checkbox" data-activa="${esc(a.id)}"${a.activa ? " checked" : ""}> <span class="sr">${esc(t("watchlist.activa_aria", { condicion: condicion(a) }))}</span></label></td>
<td class="l"><button type="button" data-borrar="${esc(a.id)}" aria-label="${esc(t("watchlist.borrar_aria", { condicion: condicion(a) }))}">${esc(t("watchlist.borrar"))}</button></td></tr>`; }).join("")}</tbody></table></div>`;
  }

  /** Anuncio al cargar: cuántas alertas están disparadas (R-HER-02, nunca solo color). */
  function anunciarDisparadas() {
    const al = alertas().filter(a => alertaDisparada(a, activo(a.ticker)));
    const texto = al.length ? t("watchlist.anuncio_disparadas", { n: al.length, lista: al.map(condicion).join("; ") }) : t("watchlist.anuncio_ninguna");
    // Las alertas se evalúan con el último cierre: se dice cuándo fue, en la zona elegida (Spec G.4: «hora local»)
    const mt = D.meta || {}, cierre = mt.fecha_corte ? EIA.instanteCierre(mt.fecha_corte) : null;
    $("#resumen-alertas").textContent = cierre ? texto + " " + t("watchlist.segun_cierre", { fecha: EIA.fmt.fecha(mt.fecha_corte), hora_local: EIA.fmt.hora(cierre), zona: EIA.fmt.zonaNombre(EIA.zona(), cierre) }) : texto;
    if (!anunciado) { anunciado = true; EIA.ui.anunciar(texto); }
  }

  function mostrarError(campo, codigo) {
    const input = $("#" + campo), p = $("#" + campo + "-error");
    if (codigo) { input.setAttribute("aria-invalid", "true"); p.textContent = t("watchlist.error_" + codigo); }
    else { input.removeAttribute("aria-invalid"); p.textContent = ""; }
  }

  function agregar() {
    const tk = tickerDeTexto($("#agregar").value, D.c10);
    if (!tk) { mostrarError("agregar", "ticker"); $("#agregar").focus(); return; }
    mostrarError("agregar", null);
    if (EIA.watch.tiene(tk)) { EIA.ui.anunciar(t("watchlist.ya_esta", { ticker: tk })); return; }
    EIA.watch.alternar(tk);
    $("#agregar").value = "";
    pintarLista(); anunciarDisparadas();
    EIA.ui.anunciar(t("watchlist.agregado", { ticker: tk }));
  }
  function crearAlerta() {
    const nueva = { ticker: $("#nuevo-ticker").value, tipo: $("#nuevo-tipo").value, umbral: $("#nuevo-umbral").value };
    const e = validarAlerta(nueva, D.c10.map(a => a.ticker));
    mostrarError("nuevo-umbral", e.umbral || null);
    if (Object.keys(e).length) { $("#nuevo-umbral").focus(); return; }
    const al = alertas();
    const id = "u" + Date.now().toString(36);
    al.push({ id, ticker: nueva.ticker, tipo: nueva.tipo, umbral: Number(nueva.umbral), activa: true });
    guardarAlertas(al);
    $("#nuevo-umbral").value = "";
    pintarLista(); pintarAlertas(); anunciarDisparadas();
    EIA.ui.anunciar(t("watchlist.alerta_creada", { condicion: condicion(al[al.length - 1]) }));
  }

  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    const main = $("main");
    main.addEventListener("submit", e => {
      e.preventDefault();
      if (e.target.id === "form-agregar") agregar(); else if (e.target.id === "form-alerta") crearAlerta();
    });
    main.addEventListener("click", e => {
      const q = e.target.closest("button[data-quitar]"), b = e.target.closest("button[data-borrar]");
      if (q) {
        const tk = q.dataset.quitar; EIA.watch.alternar(tk);
        pintarLista(); anunciarDisparadas();
        EIA.ui.anunciar(t("watchlist.quitado", { ticker: tk }));
        const sig = $("button[data-quitar]") || $("#agregar"); sig.focus();
      } else if (b) {
        const al = alertas(), a = al.find(x => x.id === b.dataset.borrar);
        guardarAlertas(al.filter(x => x.id !== b.dataset.borrar));
        pintarLista(); pintarAlertas(); anunciarDisparadas();
        if (a) EIA.ui.anunciar(t("watchlist.alerta_borrada", { condicion: condicion(a) }));
        const sig = $("button[data-borrar]") || $("#nuevo-ticker"); sig.focus();
      }
    });
    main.addEventListener("change", e => {
      const el = e.target;
      if (el.dataset.activa || el.dataset.umbral) {
        const al = alertas(), a = al.find(x => x.id === (el.dataset.activa || el.dataset.umbral));
        if (!a) return;
        if (el.dataset.activa) a.activa = el.checked;
        else {
          const err = validarAlerta(Object.assign({}, a, { umbral: el.value }), D.c10.map(x => x.ticker)).umbral;
          if (err) { el.setAttribute("aria-invalid", "true"); EIA.ui.anunciar(t("watchlist.error_" + err), { urgente: true }); return; }
          el.removeAttribute("aria-invalid"); a.umbral = Number(el.value);
        }
        guardarAlertas(al);
        const id = el.id;
        pintarLista(); pintarAlertas(); anunciarDisparadas();
        const vuelta = document.getElementById(id) || $(`[data-activa="${a.id}"]`); if (vuelta) vuelta.focus();
      }
    });
  }

  function pintar(datos) {
    D = datos;
    enlazar();
    pintarAgregar();
    pintarLista();
    pintarAlertas();
    anunciarDisparadas();
  }

  EIA.modulo({
    id: "watchlist",
    async cargar() {
      const [c10, c11, c02, meta] = await EIA.todos([EIA.datos(ARCHIVO_MERCADO), EIA.datos(ARCHIVO_DEMO), EIA.datos(ARCHIVO_CIERRES), EIA.meta()]);
      return { c10, c11, c02, meta };
    },
    pintar
  });
})(typeof window !== "undefined" ? window : globalThis);
