/* Configuración (configuracion.html) — Spec W13 G.4 «Cuenta» y zona 3 del Lab 13 (adaptación cultural):
   idioma por endónimo (sin banderas), dígitos, zona horaria, tema, colores de alza y baja, y las herramientas de i18n
   (pseudolocalización y auditoría de truncados y desbordes del ejercicio 13.2). Las preferencias se guardan solo en
   este navegador (localStorage) y las aplica js/common.js en todas las páginas. La vista previa usa datos del JSON. */
(function (global) {
  "use strict";
  const comun = global.EIA ? global : require("./common.js");
  const EIA = comun.EIA;
  const ARCHIVO_MERCADO = "10_dashboard_mercado.json", ARCHIVO_DEMO = "11_watchlist_alertas_portafolio_demo.json";
  const REFERENCIAS = ["SPY", "QQQ", "EPU"];
  /* Valores de prueba de las categorías de plural CLDR (zero, one, two, few, many, other): no son datos del sistema. */
  const MUESTRA_PLURALES = [0, 1, 2, 3, 11, 100];

  /** Zonas IANA agrupadas por región («America/Lima» → «America»), en el orden recibido. Pura. */
  function agruparZonas(zonas) {
    const g = new Map();
    for (const z of zonas) { const r = z.includes("/") ? z.split("/")[0] : "Etc"; if (!g.has(r)) g.set(r, []); g.get(r).push(z); }
    return g;
  }
  /** Nombre corto de una zona: «America/Argentina/Buenos_Aires» → «Buenos Aires». Pura. */
  const ciudad = z => String(z).split("/").pop().replace(/_/g, " ");
  /** Porcentaje entero de completitud (0–100) a partir del manifiesto. Pura. */
  const completitud = info => Math.max(0, Math.min(100, Math.round(Number(info && info.completitud != null ? info.completitud : 100))));

  const Config = { agruparZonas, ciudad, completitud, MUESTRA_PLURALES };
  if (typeof module !== "undefined" && module.exports) module.exports = Config;
  if (typeof document === "undefined") return;
  global.Config = Config;

  /* ═════════════ Pintado (DOM) ═════════════ */
  const { $, $$ } = comun, esc = EIA.esc, t = (k, p) => EIA.t(k, p);
  let D = null, enlazado = false, idiomaAnterior = null, auditoria = [];

  const radio = (nombre, valor, rotulo, marcado, extra) =>
    `<label class="opcion"><input type="radio" name="${esc(nombre)}" value="${esc(valor)}"${marcado ? " checked" : ""}> <span>${rotulo}</span>${extra || ""}</label>`;

  function pintarIdiomas() {
    const actual = EIA.idioma(), m = EIA.manifiesto();
    $("#idiomas").innerHTML = m.idiomas.map(i => {
      const estado = t("config.estado_" + (i.estado === "fuente" ? "fuente" : i.estado === "borrador" ? "borrador" : "completo"));
      const detalles = [
        EIA.nombreIdioma(i.tag),
        t("config.escritura", { escritura: EIA.nombreIdioma(i.escritura || "Latn", "script") }) + " · " + t(i.dir === "rtl" ? "config.direccion_rtl" : "config.direccion_ltr"),
        t("config.completitud", { pct: EIA.fmt.pct(completitud(i), 0, { signo: false }) }),
        t(i.voz && String(i.voz).split("-")[0] === i.tag.split("-")[0] ? "config.voz_si" : "config.voz_no")
      ];
      const rotulo = `<span class="endonimo" lang="${esc(i.tag)}" dir="${esc(i.dir || "ltr")}">${esc(EIA.endonimo(i.tag))}</span>` +
        ` <span class="insignia-estado estado-${esc(i.estado || "completo")}">${esc(estado)}</span>`;
      return radio("idioma", i.tag, rotulo, i.tag === actual, `<span class="mut idioma-detalle">${esc(detalles.join(" · "))}</span>`);
    }).join("");
  }

  function pintarNumeros() {
    const base = EIA.esPseudo() ? EIA.fuente() : EIA.idioma(), latn = EIA.estado.get("eia_num") === "latn";
    const precio = precioReferencia();
    const ejemplo = loc => { try { return new Intl.NumberFormat(loc, { style: "currency", currency: "USD" }).format(precio); } catch (e) { return ""; } };
    $("#numeros").innerHTML = radio("numeros", "idioma", esc(t("config.numeros_idioma", { ejemplo: ejemplo(base) })), !latn) +
      radio("numeros", "latn", esc(t("config.numeros_latinos", { ejemplo: ejemplo(base + "-u-nu-latn") })), latn);
  }
  const activoReferencia = () => D.c10.find(a => a.ticker === REFERENCIAS[0]) || D.c10[0];
  const precioReferencia = () => activoReferencia().ultimo;

  function pintarVista() {
    const a = activoReferencia(), mt = D.meta || {};
    const alertas = (D.c11.alertas || []).filter(x => x.activa).length;
    const nombres = EIA.ordenar(D.c10.map(x => x.nombre)).slice(0, 6);
    const filas = [
      [t("config.vista_precio", { ticker: a.ticker }), esc(EIA.fmt.usd(a.ultimo))],
      [t("config.vista_variacion", { ticker: a.ticker }), EIA.ui.variacion(a.var_1d_pct)],
      [t("config.vista_cierre"), esc(mt.fecha_corte ? EIA.textoCierre(mt.fecha_corte) : "")],
      [t("config.vista_alertas_rotulo"), esc(t("config.vista_alertas", { n: alertas }))
        + `<br><span class="mut">${esc(EIA.fmt.lista(MUESTRA_PLURALES.map(n => t("config.vista_alertas", { n }))))}</span>`],
      [t("config.vista_lista"), esc(EIA.fmt.lista(REFERENCIAS))],
      [t("config.vista_relativo"), esc(mt.generado_en ? EIA.fmt.fechaHora(mt.generado_en) + " · " + EIA.fmt.hace(mt.generado_en) : "")],
      [t("config.vista_orden"), esc(EIA.fmt.lista(nombres))]
    ];
    $("#vista").innerHTML = `<table class="vista-previa"><tbody>${filas.map(f => `<tr><th scope="row" class="l">${esc(f[0])}</th><td class="l">${f[1]}</td></tr>`).join("")}</tbody></table>`;
  }

  function pintarZona() {
    const sel = $("#zona"), elegida = EIA.estado.get("eia_zona") || "";
    let zonas = [];
    try { zonas = Intl.supportedValuesOf("timeZone"); } catch (e) { zonas = [EIA.zonaDispositivo(), "UTC"]; }
    const ahora = new Date(), grupos = agruparZonas(zonas);
    const op = z => `<option value="${esc(z)}"${z === elegida ? " selected" : ""}>${esc(ciudad(z) + " · " + EIA.fmt.desfase(z, ahora))}</option>`;
    sel.innerHTML = `<option value=""${elegida ? "" : " selected"}>${esc(t("config.zona_dispositivo", { zona: ciudad(EIA.zonaDispositivo()) }))}</option>` +
      Array.from(grupos.entries()).map(([r, lista]) => `<optgroup label="${esc(r)}">${lista.map(op).join("")}</optgroup>`).join("");
    const mt = D.meta || {};
    if (mt.fecha_corte) {
      const c = EIA.instanteCierre(mt.fecha_corte);
      $("#zona-ejemplo").textContent = t("config.zona_ejemplo", { fecha: EIA.fmt.fecha(mt.fecha_corte), hora_mercado: EIA.fmt.hora(c, EIA.ZONA_MERCADO), hora_local: EIA.fmt.hora(c), zona: EIA.fmt.zonaNombre(EIA.zona(), c) });
    }
  }

  function pintarApariencia() {
    const tema = EIA.tema(), pref = EIA.estado.get("eia_colores") || "auto";
    $("#temas").innerHTML = radio("tema", "light", esc(t("config.tema_claro")), tema === "light") + radio("tema", "dark", esc(t("config.tema_oscuro")), tema === "dark");
    const actual = t(EIA.colores() === "rojo-sube" ? "config.colores_rojo" : "config.colores_verde");
    $("#colores").innerHTML = radio("colores", "auto", esc(t("config.colores_auto", { actual })), pref === "auto") +
      radio("colores", "verde-sube", esc(t("config.colores_verde")), pref === "verde-sube") + radio("colores", "rojo-sube", esc(t("config.colores_rojo")), pref === "rojo-sube");
    const a = activoReferencia();
    $("#colores-muestra").innerHTML = `${EIA.ui.variacion(Math.abs(a.var_1d_pct) || 1)} · ${EIA.ui.variacion(-(Math.abs(a.var_1d_pct) || 1))}`;
  }

  function pintarHerramientas() {
    const actual = EIA.idioma();
    if (!EIA.esPseudo(actual)) idiomaAnterior = actual;
    const volver = EIA.esPseudo(actual)
      ? `<button type="button" data-idioma="${esc(idiomaAnterior || EIA.fuente())}">${esc(t("config.volver_idioma", { idioma: EIA.endonimo(idiomaAnterior || EIA.fuente()) }))}</button>` : "";
    $("#pseudo").innerHTML = `<button type="button" data-idioma="qps-ploc"${actual === "qps-ploc" ? ' aria-pressed="true"' : ""}>${esc(t("config.pseudo_ltr"))}</button>` +
      ` <button type="button" data-idioma="qps-plocm"${actual === "qps-plocm" ? ' aria-pressed="true"' : ""}>${esc(t("config.pseudo_rtl"))}</button> ${volver}`;
    pintarAuditoria();
  }

  function pintarAuditoria() {
    if (!auditoria.length) { $("#auditoria").innerHTML = ""; return; }
    const si = v => esc(t(v === "sí" ? "comun.si" : "comun.no"));
    $("#auditoria").innerHTML = `<div class="tabla-envoltura"><table><caption>${esc(t("config.tabla_caption"))}</caption>
<thead><tr><th scope="col" class="l">${esc(t("config.col_pagina"))}</th><th scope="col">${esc(t("config.col_truncados"))}</th><th scope="col">${esc(t("config.col_desbordes"))}</th>
<th scope="col">${esc(t("config.col_scroll"))}</th><th scope="col">${esc(t("config.col_lang"))}</th><th scope="col">${esc(t("config.col_dir"))}</th><th scope="col">${esc(t("config.col_caracteres"))}</th></tr></thead>
<tbody>${auditoria.map(f => `<tr><th scope="row" class="l">${esc(f.nombre)}</th><td>${esc(EIA.fmt.ent(f.truncados))}</td><td>${esc(EIA.fmt.ent(f.desbordes))}</td><td>${si(f.scroll_horizontal)}</td><td>${si(f.lang_ok)}</td><td>${si(f.dir_ok)}</td><td>${esc(EIA.fmt.ent(f.caracteres))}</td></tr>`).join("")}</tbody></table></div>`;
  }

  /** Auditoría del ejercicio 13.2 en las páginas del sitio: cada una se abre en un marco oculto del ancho actual. */
  async function auditar() {
    const boton = $("#auditar"), estado = $("#auditoria-estado"), calidad = global.EIALib.i18nCalidad;
    const paginas = (comun.PAGES || []).map(p => ({ archivo: p[0], nombre: t(p[1]), id: p[2] }));
    boton.disabled = true; $("#exportar").disabled = true; auditoria = [];
    const ancho = document.documentElement.clientWidth;
    for (let i = 0; i < paginas.length; i++) {
      const p = paginas[i];
      estado.textContent = t("config.auditando", { pagina: p.nombre, n: EIA.fmt.ent(i + 1), total: EIA.fmt.ent(paginas.length) });
      const marco = document.createElement("iframe");
      marco.setAttribute("aria-hidden", "true"); marco.tabIndex = -1;
      marco.style.cssText = `position:absolute;inset-inline-start:-20000px;top:0;width:${ancho}px;height:900px;border:0;visibility:hidden`;
      document.body.appendChild(marco);
      await new Promise(ok => { marco.onload = ok; marco.src = p.archivo; });
      await new Promise(ok => setTimeout(ok, 2500));
      const m = calidad.medir(marco.contentDocument, { locale: EIA.idioma(), dir: EIA.dir() });
      auditoria.push(Object.assign({ hora: new Date().toISOString().slice(11, 19), locale: EIA.idioma(), version: "B", pseudo: EIA.esPseudo() ? "sí" : "no", pagina: p.id, nombre: p.nombre, ancho, expansion: "" }, m));
      marco.remove();
      pintarAuditoria();
    }
    const suma = k => auditoria.reduce((s, f) => s + f[k], 0);
    estado.textContent = t("config.auditoria_lista", { truncados: EIA.fmt.ent(suma("truncados")), desbordes: EIA.fmt.ent(suma("desbordes")), paginas: EIA.fmt.ent(auditoria.length) });
    boton.disabled = false; $("#exportar").disabled = false;
  }
  function exportar() {
    const csv = global.EIALib.i18nCalidad.aCSV(auditoria);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "ejercicio_13_2_auditoria_investing_ai_" + EIA.idioma() + "_PRUEBA_TECNICA_BOT.csv";
    document.body.appendChild(a); a.click(); a.remove();
  }

  function pintar(datos) {
    D = datos;
    pintarIdiomas(); pintarNumeros(); pintarVista(); pintarZona(); pintarApariencia(); pintarHerramientas();
    enlazar();
  }
  function enlazar() {
    if (enlazado) return;
    enlazado = true;
    const main = $("main");
    main.addEventListener("change", e => {
      const el = e.target;
      if (el.name === "idioma") EIA.setIdioma(el.value);
      else if (el.name === "numeros") { EIA.setNumeros(el.value === "latn" ? "latn" : null); EIA.ui.anunciar(t("config.anuncio_numeros")); }
      else if (el.name === "tema") EIA.setTema(el.value);
      else if (el.name === "colores") { EIA.setColores(el.value); pintarApariencia(); EIA.ui.anunciar(t("config.anuncio_colores")); }
      else if (el.id === "zona") { EIA.setZona(el.value || null); EIA.ui.anunciar(t("config.anuncio_zona", { zona: EIA.fmt.zonaNombre(EIA.zona()) })); }
    });
    main.addEventListener("click", e => {
      const b = e.target.closest("button[data-idioma]");
      if (b) EIA.setIdioma(b.dataset.idioma);
      else if (e.target.id === "auditar") auditar();
      else if (e.target.id === "exportar") exportar();
    });
    EIA.on("eia:tema", () => { if (D) pintarApariencia(); });
  }

  EIA.modulo({
    id: "configuracion",
    async cargar() {
      const [c10, c11, meta] = await Promise.all([EIA.datos(ARCHIVO_MERCADO), EIA.datos(ARCHIVO_DEMO), EIA.meta()]);
      return { c10, c11, meta };
    },
    pintar
  });
})(typeof window !== "undefined" ? window : globalThis);
