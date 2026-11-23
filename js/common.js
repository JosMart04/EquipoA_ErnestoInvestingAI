/* Ernesto Investing AI — núcleo compartido (js/common.js)
   Base S13 del profesor (CC BY 4.0, Ernesto D. Cancho-Rodríguez), ampliada por el Equipo A (IHC 2026-II, FISI-UNMSM).
   ÚNICO núcleo del sitio: shell, navegación, tema, modo de datos, idioma, estado, capa de datos, formatos y componentes.
   Es un script clásico (sin módulos ES) en «formato dual»: en el navegador publica globales y en Node (pruebas
   unitarias) exporta con module.exports. La API está documentada en docs/plan/PLAN_IMPLEMENTACION.md §4. */
(function (global) {
  "use strict";

  const hayDOM = typeof document !== "undefined";
  const EIA = { version: "1.0.0", ui: {} };

  /* ───────────── Constantes de método (docs/CONTRATO_DATOS.md §6) ───────────── */
  EIA.K = {
    UMBRAL_SENAL: 0.5,        // prob_sube ≥ 0,5 ⇒ SUBE (guía, Anexo B)
    CONFIANZA_ALTA: 0.08,     // |p − 0,5| ≥ 0,08 ⇒ confianza alta / intensidad 3
    CONFIANZA_MEDIA: 0.04,    // |p − 0,5| ≥ 0,04 ⇒ confianza media / intensidad 2
    DIAS_HABILES_VENCIDO: 5   // el Modo real avisa si los datos son más viejos que esto
  };
  EIA.SENALES = ["SUBE", "BAJA"]; // solo dos clases: nunca una tercera (R-CLA-06)
  /* Idiomas: los declara locales/index.json (agregar uno = su JSON + una línea del manifiesto, sin tocar código).
     Este respaldo mínimo solo se usa si el manifiesto no carga. Los pseudoidiomas (qps-*) se generan en tiempo de
     ejecución desde es-PE para medir truncados y desbordes (Lab 13); no aparecen en la barra. */
  const MANIFIESTO_RESPALDO = { fuente: "es-PE", idiomas: [
    { tag: "es-PE", endonimo: "Español (Perú)", dir: "ltr", estado: "fuente" },
    { tag: "en-US", endonimo: "English (United States)", dir: "ltr", estado: "completo" }] };
  const PSEUDOIDIOMAS = [{ tag: "qps-ploc", dir: "ltr", pseudo: true }, { tag: "qps-plocm", dir: "rtl", pseudo: true }];
  const ESCRITURAS_RTL = ["ar", "he", "fa", "ur"];
  let _manifiesto = MANIFIESTO_RESPALDO;
  EIA.IDIOMAS = MANIFIESTO_RESPALDO.idiomas.map(i => i.tag);

  /* Páginas del sitio: [archivo, clave i18n, id, es módulo nuevo]. Mismo orden que la base del profesor. */
  const PAGES = [
    ["index.html", "nav.dashboard", "dashboard"], ["watchlist.html", "nav.watchlist", "watchlist"],
    ["trading.html", "nav.trading", "trading"], ["leaderboard.html", "nav.leaderboard", "leaderboard"],
    ["clasificacion.html", "nav.clasificacion", "clasificacion", 1], ["regresion.html", "nav.regresion", "regresion", 1],
    ["optimizador.html", "nav.optimizador", "optimizador", 1], ["portafolios.html", "nav.portafolios", "portafolios", 1],
    ["backtesting.html", "nav.backtesting", "backtesting", 1]
  ];
  /* Barra lateral (Spec W13 G.4): las páginas agrupadas por bloque. [archivo, clave i18n, id, icono, es módulo nuevo].
     PAGES se conserva tal cual por compatibilidad con la base; esta tabla agrega las páginas de soporte. */
  const NAVEGACION = [
    ["mercado", [["index.html", "nav.dashboard", "dashboard", "dashboard"], ["activo.html", "nav.activo", "activo", "activo"], ["comparador.html", "nav.comparador", "comparador", "comparar"]]],
    ["vigilancia", [["watchlist.html", "nav.watchlist", "watchlist", "estrella"], ["ordenes.html", "nav.ordenes", "ordenes", "historial"]]],
    ["modelos", [["clasificacion.html", "nav.clasificacion", "clasificacion", "clasificacion", 1], ["regresion.html", "nav.regresion", "regresion", "regresion", 1]]],
    ["cartera", [["optimizador.html", "nav.optimizador", "optimizador", "optimizador", 1], ["portafolios.html", "nav.portafolios", "portafolios", "portafolios", 1],
      ["backtesting.html", "nav.backtesting", "backtesting", "backtesting", 1]]],
    ["operacion", [["trading.html", "nav.trading", "trading", "trading"], ["leaderboard.html", "nav.leaderboard", "leaderboard", "trofeo"]]],
    ["cuenta", [["perfil.html", "nav.perfil", "perfil", "usuario"], ["configuracion.html", "shell.configuracion", "configuracion", "ajustes"],
      ["ayuda.html", "nav.ayuda", "ayuda", "ayuda"], ["acerca.html", "nav.acerca", "acerca", "info"]]]
  ];
  /** Todas las páginas de la barra lateral, en orden: [archivo, clave, id, icono, nuevo, bloque]. */
  const PAGINAS_NAV = NAVEGACION.flatMap(([bloque, l]) => l.map(p => [p[0], p[1], p[2], p[3], p[4] || 0, bloque]));

  /* ───────────── Utilidades ───────────── */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  /** Escapa texto para insertarlo en HTML. Todo dato que venga de un JSON pasa por aquí. */
  EIA.esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ESC[c]);
  const esc = EIA.esc;
  let _uid = 0;

  const parametros = () => new URLSearchParams(hayDOM ? global.location.search : "");
  function quitarParametro(nombre) {
    if (!hayDOM || !global.history || !global.history.replaceState) return;
    const u = new URL(global.location.href);
    if (!u.searchParams.has(nombre)) return;
    u.searchParams.delete(nombre);
    global.history.replaceState(null, "", u.pathname + u.search + u.hash);
  }

  /* ───────────── Eventos ───────────── */
  const oyentes = new Map();
  /** Suscribe a "eia:listo" | "eia:modo" | "eia:corte" | "eia:idioma" | "eia:tema" | "eia:estado". Devuelve la función que cancela. */
  EIA.on = function (evento, fn) {
    if (!oyentes.has(evento)) oyentes.set(evento, new Set());
    oyentes.get(evento).add(fn);
    return () => oyentes.get(evento).delete(fn);
  };
  EIA.emit = function (evento, detalle) {
    (oyentes.get(evento) || []).forEach(fn => {
      try { fn(detalle || {}); } catch (e) { if (global.console) console.error(e); }
    });
  };

  /* ───────────── Estado compartido (localStorage con respaldo en memoria) ───────────── */
  const memoria = {};
  EIA.estado = {
    get(k, porDefecto = null) {
      try {
        const s = global.localStorage.getItem(k);
        return s == null ? (k in memoria ? memoria[k] : porDefecto) : JSON.parse(s);
      } catch (e) { return k in memoria ? memoria[k] : porDefecto; }
    },
    set(k, v) {
      memoria[k] = v;
      try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado o cuota: queda en memoria */ }
      EIA.emit("eia:estado", { clave: k, valor: v });
      return v;
    },
    del(k) {
      delete memoria[k];
      try { global.localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ }
      EIA.emit("eia:estado", { clave: k, valor: null });
    }
  };
  /** Compatibilidad con la base: store(k) lee, store(k, v) guarda. */
  function store(k, v) { if (v === undefined) return EIA.estado.get(k); EIA.estado.set(k, v); }

  /* ───────────── Modo de datos: "profesor" (por defecto) | "real" ───────────── */
  let _modo = null;
  EIA.modo = function () {
    if (_modo) return _modo;
    const p = parametros().get("modo");
    if (p === "real" || p === "profesor") { _modo = p; EIA.estado.set("eia_modo", p); return _modo; }
    _modo = EIA.estado.get("eia_modo") === "real" ? "real" : "profesor";
    return _modo;
  };
  EIA.setModo = function (m) {
    if ((m !== "real" && m !== "profesor") || m === EIA.modo()) return;
    _modo = m; _parcial = false;
    EIA.estado.set("eia_modo", m);
    quitarParametro("modo");
    if (hayDOM) pintarShell();
    EIA.emit("eia:modo", { modo: m });
    if (hayDOM) EIA.meta().then(mt => {
      pintarShell();
      const fecha = mt.fecha_corte ? EIA.fmt.fecha(mt.fecha_corte, "larga") : "";
      EIA.ui.anunciar(m === "profesor" ? EIA.t("shell.anuncio_modo_profesor", { fecha })
        : (mt.disponible ? EIA.t("shell.anuncio_modo_real", { fecha }) : EIA.t("shell.anuncio_modo_real_sin")));
    });
  };

  /* ───────────── Fecha de corte elegida (solo Modo real; null = último corte) ───────────── */
  EIA.corte = () => (EIA.modo() === "real" ? EIA.estado.get("eia_corte") : null);
  EIA.setCorte = function (f) {
    if (f) EIA.estado.set("eia_corte", f); else EIA.estado.del("eia_corte");
    EIA.emit("eia:corte", { corte: f || null });
  };

  /* ───────────── Capa de datos ───────────── */
  class ErrorDatos extends Error {
    /** codigo: "http" | "json" | "sin-datos-reales" */
    constructor(codigo, archivo, estado) {
      super("No se pudo leer " + archivo + (estado ? " (" + estado + ")" : ""));
      this.name = "ErrorDatos"; this.codigo = codigo; this.archivo = archivo; this.estado = estado || 0;
    }
  }
  EIA.ErrorDatos = ErrorDatos;

  const DEPENDE_DEL_CORTE = /^0[5-8]_/; // 05, 06, 07 y 08 existen también por fecha de corte
  const MODULOS_CON_CORTE = ["clasificacion", "regresion", "optimizador", "portafolios"];
  /** Ruta de un archivo de datos. Función pura (la usan las pruebas). */
  EIA.urlDatos = function (nombre, op) {
    const o = op || {};
    if (o.modo !== "real") return "data/" + nombre;
    const carpeta = o.corte && DEPENDE_DEL_CORTE.test(nombre) ? "cortes/" + o.corte + "/" : "";
    return "data_real/" + carpeta + nombre + (o.version ? "?v=" + encodeURIComponent(o.version) : "");
  };

  /** Días hábiles (lun–vie) transcurridos entre una fecha ISO y otra fecha. Función pura. */
  EIA.diasHabiles = function (desdeISO, hasta) {
    const a = new Date(String(desdeISO).slice(0, 10) + "T00:00:00Z");
    const h = hasta instanceof Date ? hasta : new Date(hasta);
    const b = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), h.getUTCDate()));
    if (isNaN(a) || isNaN(b) || b <= a) return 0;
    let n = 0;
    for (const d = new Date(a); d < b;) { d.setUTCDate(d.getUTCDate() + 1); const s = d.getUTCDay(); if (s !== 0 && s !== 6) n++; }
    return n;
  };

  const cache = new Map();     // modo|corte|nombre → Promise<JSON>
  const metaPromesa = {};      // modo → Promise<meta>
  const metaLista = {};        // modo → meta ya resuelta (para pintar el shell sin esperar)
  let _parcial = false;        // Modo real con meta.json publicado pero sin el archivo que pide esta página

  /** Metadatos del modo activo: fecha de corte, antigüedad y si hay datos. Nunca rechaza. */
  EIA.meta = function (modoPedido) {
    const modo = modoPedido || EIA.modo();
    if (metaPromesa[modo]) return metaPromesa[modo];
    metaPromesa[modo] = (async () => {
      let m;
      if (modo === "profesor") {
        try {
          const p = await EIA.datos("13_patrones_y_parametros.json", { modo: "profesor" });
          m = { modo, disponible: true, fecha_corte: p.fecha_ancla_precios, generado_en: p.fecha_generacion, fuente: null, antiguedad_habiles: 0, vencido: false };
        } catch (e) { m = { modo, disponible: false }; }
      } else {
        try {
          const r = await fetch("data_real/meta.json", { cache: "no-cache" });
          if (!r.ok) throw new Error(String(r.status));
          const j = await r.json();
          const ant = EIA.diasHabiles(j.fecha_corte, new Date());
          m = Object.assign({}, j, { modo, disponible: true, antiguedad_habiles: ant, vencido: ant > EIA.K.DIAS_HABILES_VENCIDO || !!j.stale });
        } catch (e) { m = { modo, disponible: false }; }
      }
      metaLista[modo] = m;
      return m;
    })();
    return metaPromesa[modo];
  };

  /** Lee un JSON de data/ (profesor) o data_real/ (real) según el modo, una sola vez por modo y corte. */
  EIA.datos = function (nombre, op) {
    const o = op || {};
    const modo = o.modo || EIA.modo();
    const corte = modo === "real" && DEPENDE_DEL_CORTE.test(nombre) ? (o.corte !== undefined ? o.corte : EIA.corte()) : null;
    const clave = modo + "|" + (corte || "") + "|" + nombre;
    if (cache.has(clave)) return cache.get(clave);
    const promesa = (async () => {
      let version = "";
      if (modo === "real") {
        const mt = await EIA.meta("real");
        if (!mt.disponible) throw new ErrorDatos("sin-datos-reales", nombre, 0);
        version = mt.generado_en || "";
      }
      const url = EIA.urlDatos(nombre, { modo, corte, version });
      let r;
      try { r = await fetch(url); } catch (e) { throw new ErrorDatos(modo === "real" ? "sin-datos-reales" : "http", nombre, 0); }
      if (!r.ok) throw new ErrorDatos(modo === "real" ? "sin-datos-reales" : "http", nombre, r.status);
      try { return await r.json(); } catch (e) { throw new ErrorDatos(modo === "real" ? "sin-datos-reales" : "json", nombre, r.status); }
    })();
    cache.set(clave, promesa);
    promesa.catch(() => cache.delete(clave)); // un fallo no se queda en caché
    return promesa;
  };
  /** Como Promise.all (las peticiones van en paralelo), pero si fallan varias se informa la PRIMERA en el orden dado,
      no la que respondió antes: el mensaje «falta 09_…» es siempre el mismo aunque también falte 13_… */
  EIA.todos = async function (promesas) {
    const r = await Promise.allSettled(promesas);
    const fallo = r.find(x => x.status === "rejected");
    if (fallo) throw fallo.reason;
    return r.map(x => x.value);
  };
  /** Compatibilidad con la base. */
  const loadJSON = nombre => EIA.datos(nombre);

  /** Pura: fechas de corte del índice, de la más reciente a la más antigua. `ultimo` (los archivos de la raíz de data_real/)
      va primero aunque no esté en `cortes[]`; el orden del arreglo publicado no importa. */
  EIA.ordenarCortes = function (ix) {
    const lista = (ix.cortes || []).slice().sort().reverse();
    if (ix.ultimo && lista[0] !== ix.ultimo) lista.unshift(ix.ultimo);
    return Array.from(new Set(lista));
  };
  /** Fechas de corte disponibles (la primera es la más reciente). */
  EIA.cortes = async function () {
    const mt = await EIA.meta();
    if (EIA.modo() === "real" && mt.disponible) {
      try { const ix = await EIA.datos("cortes/index.json"); if (ix && Array.isArray(ix.cortes) && ix.cortes.length) return EIA.ordenarCortes(ix); } catch (e) { /* sin cortes históricos */ }
    }
    return mt.fecha_corte ? [mt.fecha_corte] : [];
  };

  /** Los 26 activos con su último precio (archivo 10). Es la única fuente del «último precio» (R-INT-04). */
  EIA.universo = () => EIA.datos("10_dashboard_mercado.json");
  EIA.precio = async function (ticker) {
    const a = (await EIA.universo()).find(x => x.ticker === ticker);
    return a ? a.ultimo : null;
  };
  /** Historia de cierres de un activo, opcionalmente recortada por fechas ISO. En el Modo real usa precios/<T>.json si existe. */
  EIA.historia = async function (ticker, rango) {
    const r = rango || {};
    let h = null;
    if (EIA.modo() === "real") {
      try { const p = await EIA.datos("precios/" + ticker + ".json"); h = { fechas: p.fechas, c: p.c, o: p.o, h: p.h, l: p.l, v: p.v }; } catch (e) { h = null; }
    }
    if (!h) { const p = await EIA.datos("02_precios_sinteticos_504d.json"); h = { fechas: p.fechas, c: p.cierres[ticker] || [] }; }
    const i0 = r.desde ? h.fechas.findIndex(f => f >= r.desde) : 0;
    let i1 = h.fechas.length;
    if (r.hasta) { i1 = h.fechas.findIndex(f => f > r.hasta); if (i1 < 0) i1 = h.fechas.length; }
    if (i0 < 0) return { fechas: [], c: [] };
    const corta = {};
    Object.keys(h).forEach(k => { if (Array.isArray(h[k])) corta[k] = h[k].slice(i0, i1); });
    return corta;
  };

  /* ───────────── Watchlist y activo seleccionado (estado que comparten los módulos, R-INT-03) ───────────── */
  let watchInicial = null;
  EIA.watch = {
    /** Carga la watchlist inicial del archivo 11 si el usuario aún no tiene una propia. */
    async cargar() {
      if (EIA.estado.get("eia_watch") || watchInicial) return;
      try { watchInicial = (await EIA.datos("11_watchlist_alertas_portafolio_demo.json")).watchlist_inicial || []; } catch (e) { watchInicial = []; }
    },
    lista() { return (EIA.estado.get("eia_watch") || watchInicial || []).slice(); },
    tiene(t) { return EIA.watch.lista().includes(t); },
    alternar(t) {
      const l = EIA.watch.lista(), i = l.indexOf(t);
      if (i >= 0) l.splice(i, 1); else l.push(t);
      EIA.estado.set("eia_watch", l);
      return i < 0;
    }
  };
  /* ───────────── Alertas y notificaciones (Spec W13 G.4, Vigilancia: «alertas con plural y hora local») ─────────────
     Las alertas se guardan en eia_alertas (eia_alertas_real en el Modo real); las reglas son las del contrato (§2, archivo 11).
     Se evalúan en el núcleo para que el centro de notificaciones avise en cualquier página, no solo en la Watchlist. */
  EIA.alertas = {
    clave: () => (EIA.modo() === "real" ? "eia_alertas_real" : "eia_alertas"),
    /** Copia las alertas del archivo 11 con un identificador estable. */
    iniciales: c11 => (c11.alertas || []).map((a, i) => ({ id: "a" + (i + 1), ticker: a.ticker, tipo: a.tipo, umbral: a.umbral, activa: !!a.activa })),
    lista: c11 => EIA.estado.get(EIA.alertas.clave()) || EIA.alertas.iniciales(c11 || {}),
    /** ¿La alerta está disparada? Una alerta inactiva nunca se dispara. */
    disparada(alerta, activo) {
      if (!alerta.activa || !activo) return false;
      switch (alerta.tipo) {
        case "precio_sobre": return activo.ultimo >= alerta.umbral;
        case "precio_bajo": return activo.ultimo <= alerta.umbral;
        case "var_1d_menor_a_pct": return activo.var_1d_pct <= alerta.umbral;
        case "var_1d_mayor_a_pct": return activo.var_1d_pct >= alerta.umbral;
        default: return false;
      }
    },
    /** «NVDA: precio sobre USD 131.81» en el idioma activo. */
    texto(a) {
      const umbral = String(a.tipo).indexOf("precio") === 0 ? EIA.fmt.usd(a.umbral) : EIA.fmt.pct(a.umbral);
      return EIA.t("watchlist.condicion", { ticker: a.ticker, tipo: EIA.nombre("alerta_tipo", a.tipo).toLowerCase(), umbral });
    }
  };
  const MAX_NOTIF = 50;
  /** Centro de notificaciones: guarda datos (no textos) para mostrarlos en el idioma del momento. */
  EIA.notificaciones = {
    clave: () => (EIA.modo() === "real" ? "eia_notif_real" : "eia_notif"),
    lista: () => (EIA.estado.get(EIA.notificaciones.clave()) || []).slice(),
    noLeidas: () => EIA.notificaciones.lista().filter(n => !n.leida).length,
    /** Agrega una notificación {id?, tipo: "alerta" | "orden" | "lote", datos, fecha?}. Con id, no se repite. */
    agregar(n) {
      const l = EIA.notificaciones.lista();
      if (n.id && l.some(x => x.id === n.id)) return false;
      l.unshift(Object.assign({ fecha: new Date().toISOString(), leida: false }, n));
      EIA.estado.set(EIA.notificaciones.clave(), l.slice(0, MAX_NOTIF));
      if (hayDOM) pintarCampana();
      return true;
    },
    marcarLeidas() {
      EIA.estado.set(EIA.notificaciones.clave(), EIA.notificaciones.lista().map(n => Object.assign(n, { leida: true })));
      if (hayDOM) pintarCampana();
    }
  };
  /** Revisa las alertas con los precios del modo activo y avisa una sola vez por alerta y fecha de corte. */
  async function revisarAlertas() {
    try {
      const mt = metaLista[EIA.modo()] || {};
      if (EIA.modo() === "real" && !mt.disponible) return;
      const [c10, c11] = await EIA.todos([EIA.universo(), EIA.datos("11_watchlist_alertas_portafolio_demo.json")]);
      const cierre = mt.fecha_corte ? EIA.instanteCierre(mt.fecha_corte).toISOString() : new Date().toISOString();
      for (const a of EIA.alertas.lista(c11)) {
        if (EIA.alertas.disparada(a, c10.find(x => x.ticker === a.ticker))) {
          EIA.notificaciones.agregar({ id: ["alerta", a.id, a.ticker, a.tipo, a.umbral, mt.fecha_corte || ""].join("|"), tipo: "alerta",
            fecha: cierre, datos: { ticker: a.ticker, tipo: a.tipo, umbral: a.umbral } });
        }
      }
    } catch (e) { /* sin datos de mercado no hay alertas que revisar */ }
  }
  EIA.revisarAlertas = revisarAlertas;
  EIA.activo = () => parametros().get("t") || EIA.estado.get("eia_activo");
  EIA.setActivo = function (t) {
    // Primero la URL y después el aviso: quien escuche "eia:estado" ya lee el activo nuevo con EIA.activo()
    if (hayDOM && global.history && global.history.replaceState && parametros().has("t")) {
      const u = new URL(global.location.href); u.searchParams.set("t", t);
      global.history.replaceState(null, "", u.pathname + u.search + u.hash);
    }
    EIA.estado.set("eia_activo", t);
  };

  /* ───────────── Internacionalización (13 idiomas · Lab 13 · Spec W13 G.5) ─────────────
     Zona 2 del Lab (recursos externalizados): textos en locales/<tag>.json con claves por función, respaldo en es-PE
     para la clave que falte, lang y dir en <html>, formatos con Intl en caché por idioma y zona, plurales con
     Intl.PluralRules y orden con Intl.Collator. La divisa nunca se convierte al cambiar de idioma (Lab L.2 y L.8). */
  let _idioma = null, _dic = {}, _dicRespaldo = null;
  const avisados = new Set();
  /** Herramienta de calidad (pseudolocalización y medición): js/lib/i18n-calidad.js, cargado antes que este archivo. */
  const calidad = () => (global.EIALib && global.EIALib.i18nCalidad) || (typeof require === "function" ? require("./lib/i18n-calidad.js") : null);
  /** Datos de un idioma del manifiesto (o de un pseudoidioma); null si no existe. */
  EIA.infoIdioma = tag => _manifiesto.idiomas.concat(PSEUDOIDIOMAS).find(i => i.tag === tag) || null;
  EIA.fuente = () => _manifiesto.fuente || "es-PE";
  /** Etiqueta BCP 47 conocida más cercana: exacta, o por idioma base («ar» → «ar-EG», «pt» → «pt-BR»). */
  function normalizarIdioma(v) {
    if (!v) return null;
    let tag;
    try { tag = Intl.getCanonicalLocales(String(v).trim())[0]; } catch (e) { return null; }
    if (!tag) return null;
    const exacto = EIA.IDIOMAS.concat(PSEUDOIDIOMAS.map(p => p.tag)).find(t => t.toLowerCase() === tag.toLowerCase());
    if (exacto) return exacto;
    const base = tag.split("-")[0].toLowerCase();
    return EIA.IDIOMAS.find(t => t.split("-")[0].toLowerCase() === base) || null;
  }
  EIA.normalizarIdioma = normalizarIdioma;
  /** Sin autodetección (decisión de Josué): ?lang= o la elección guardada; si no, es-PE. */
  EIA.idioma = function () {
    if (_idioma) return _idioma;
    _idioma = normalizarIdioma(parametros().get("lang")) || normalizarIdioma(EIA.estado.get("eia_lang")) || EIA.fuente();
    return _idioma;
  };
  EIA.esPseudo = tag => { const i = EIA.infoIdioma(tag || EIA.idioma()); return !!(i && i.pseudo); };
  EIA.esBorrador = tag => { const i = EIA.infoIdioma(tag || EIA.idioma()); return !!(i && i.estado === "borrador"); };
  /** Dirección de escritura del idioma: la del manifiesto o, si falta, la del idioma base (árabe, hebreo… → rtl). */
  EIA.dir = function (tag) {
    const t = tag || EIA.idioma(), i = EIA.infoIdioma(t);
    if (i && i.dir) return i.dir;
    return ESCRITURAS_RTL.includes(String(t).split("-")[0]) ? "rtl" : "ltr";
  };
  /** Locale para Intl: el pseudoidioma formatea como es-PE; un idioma sin datos de Intl usa la fuente; la preferencia
      «dígitos latinos» agrega -u-nu-latn (en árabe los dígitos por defecto son ٠١٢…). */
  EIA.localeFormato = function () {
    const tag = EIA.idioma();
    let base = EIA.esPseudo(tag) ? EIA.fuente() : tag;
    try { if (!Intl.NumberFormat.supportedLocalesOf([base]).length) base = EIA.fuente(); } catch (e) { base = EIA.fuente(); }
    return EIA.estado.get("eia_num") === "latn" ? base + "-u-nu-latn" : base;
  };
  const buscar = (dic, clave) => clave.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), dic);
  /** ¿Existe la clave en el diccionario activo (o en el de respaldo)? */
  EIA.hayTexto = clave => buscar(_dic, clave) !== undefined || (!!_dicRespaldo && buscar(_dicRespaldo, clave) !== undefined);
  /** Texto traducido. Parámetros con nombre: «Votos: {sube} ▲». Un valor {zero, one, two, few, many, other} es un plural
      y se elige con Intl.PluralRules según params.n. Si el idioma no tiene la clave, se usa es-PE (como el kit del curso). */
  EIA.t = function (clave, params) {
    let v = buscar(_dic, clave);
    if (v === undefined && _dicRespaldo) {
      v = buscar(_dicRespaldo, clave);
      if (v !== undefined && !avisados.has("r:" + clave) && global.console) { avisados.add("r:" + clave); console.info("i18n: " + EIA.idioma() + " no tiene " + clave + "; se usa " + EIA.fuente()); }
    }
    if (v && typeof v === "object" && typeof v.other === "string") {
      const cat = reglasPlural().select(Number(params && params.n));
      v = typeof v[cat] === "string" ? v[cat] : v.other;
    }
    if (typeof v !== "string") {
      if (!avisados.has(clave) && global.console) { avisados.add(clave); console.warn("i18n: falta la clave " + clave); }
      return "⟦" + clave + "⟧";
    }
    // {n} y los demás enteros salen con los dígitos y separadores del idioma (١٢ en árabe).
    // En RTL cada valor se aísla (U+2068…U+2069, algoritmo bidireccional): un ticker o una cifra no desordena la frase.
    const aislar = EIA.dir() === "rtl" ? x => "⁨" + x + "⁩" : x => x;
    // Todo entero que llega como número (conteos, posiciones, totales) sale con los dígitos del idioma
    const valor = x => (typeof x === "number" && Number.isInteger(x) ? EIA.fmt.ent(x) : String(x));
    return params ? v.replace(/\{(\w+)\}/g, (m, k) => (!(k in params) ? m : aislar(valor(params[k])))) : v;
  };
  /** Nombre de presentación de un valor del JSON (grupo, modelo, sector…). Si no está en el mapa, devuelve el valor tal cual. */
  EIA.nombre = function (categoria, valor) {
    const m = (_dic.datos && _dic.datos[categoria]) || (_dicRespaldo && _dicRespaldo.datos && _dicRespaldo.datos[categoria]);
    return m && typeof m[valor] === "string" ? m[valor] : String(valor);
  };
  /** Una cifra suelta dentro de un texto del JSON (no la de un identificador como «N2»): «17», «+5.35», «-2.0». */
  const CIFRA_EN_TEXTO = /(?:(?<=^|\s)[+\-−])?(?<![\p{L}\p{N}.])\d+(?:\.\d+)?/gu;
  EIA.patronTextoDatos = s => String(s == null ? "" : s).replace(CIFRA_EN_TEXTO, "{#}");
  /** Texto libre en español de un JSON (descripción, restricciones, razón, método…) como HTML. Si el idioma tiene su
      traducción en datos.textos (con las cifras cambiadas por {#}), sale traducido y con las cifras en formato local;
      si no, queda en español marcado con lang="es". Los datos no se modifican. */
  EIA.textoDatos = function (s) {
    const texto = String(s == null ? "" : s);
    if (EIA.esPseudo()) return esc(calidad().pseudolocalizar(texto));
    const cifras = [];
    const patron = texto.replace(CIFRA_EN_TEXTO, m => { cifras.push(m); return "{#}"; });
    const mapa = _dic.datos && _dic.datos.textos;
    const tr = mapa && typeof mapa[patron] === "string" ? mapa[patron] : null;
    if (!tr) return `<span lang="es">${esc(texto)}</span>`;
    let i = 0;
    return esc(tr).replace(/\{#\}/g, () => {
      const c = cifras[i++] || "", [ent, dec = ""] = c.replace(/^[+\-−]/, "").split(".");
      // «05» (N2-05) conserva el cero; el signo + se conserva; los dígitos salen en la escritura del idioma
      const n = nf({ minimumIntegerDigits: ent.length > 1 && ent[0] === "0" ? ent.length : 1, minimumFractionDigits: dec.length, maximumFractionDigits: dec.length });
      return esc((c[0] === "+" ? "+" : "") + n.format(Number(c.replace("−", "-"))));
    });
  };
  /** Solo para pruebas y para el arranque: instala un diccionario ya cargado (y, opcional, el de respaldo es-PE). */
  EIA.usarDiccionario = function (dic, idioma, respaldo) {
    _dic = dic || {}; _dicRespaldo = respaldo || null;
    if (idioma) _idioma = idioma;
    formateadores.clear();
  };
  /** Solo para pruebas y para el arranque: instala el manifiesto de idiomas. */
  EIA.usarManifiesto = function (m) {
    _manifiesto = m && Array.isArray(m.idiomas) && m.idiomas.length ? m : MANIFIESTO_RESPALDO;
    EIA.IDIOMAS = _manifiesto.idiomas.map(i => i.tag);
  };
  EIA.manifiesto = () => _manifiesto;
  EIA.cargarManifiesto = async function () {
    try {
      const r = await fetch("locales/index.json?v=" + EIA.version);
      if (r.ok) EIA.usarManifiesto(await r.json());
    } catch (e) { /* sin manifiesto: es-PE y en-US */ }
  };
  const diccionarios = new Map();
  async function leerDiccionario(tag) {
    if (diccionarios.has(tag)) return diccionarios.get(tag);
    const r = await fetch("locales/" + tag + ".json?v=" + EIA.version);
    if (!r.ok) throw new ErrorDatos("http", "locales/" + tag + ".json", r.status);
    const d = await r.json();
    diccionarios.set(tag, d);
    return d;
  }
  EIA.cargarIdioma = async function (idioma) {
    const fuente = EIA.fuente(), pseudo = EIA.esPseudo(idioma), base = pseudo ? fuente : idioma;
    const dic = await leerDiccionario(base);
    const respaldo = base === fuente ? null : await leerDiccionario(fuente).catch(() => null);
    EIA.usarDiccionario(pseudo ? calidad().pseudoDiccionario(dic) : dic, idioma, respaldo);
  };
  /** Aplica data-i18n (texto) y data-i18n-attr="aria-label=clave,title=clave" (atributos). */
  EIA.traducir = function (raiz) {
    $$("[data-i18n]", raiz).forEach(el => { el.textContent = EIA.t(el.dataset.i18n); });
    $$("[data-i18n-attr]", raiz).forEach(el => el.dataset.i18nAttr.split(",").forEach(par => {
      const [atributo, clave] = par.split("=");
      if (atributo && clave) el.setAttribute(atributo.trim(), EIA.t(clave.trim()));
    }));
  };
  /** lang, dir y la convención de colores del idioma en <html>. */
  function aplicarIdiomaDocumento() {
    if (!hayDOM) return;
    const h = document.documentElement;
    h.lang = EIA.idioma(); h.dir = EIA.dir();
    h.setAttribute("data-colores", EIA.colores());
  }
  EIA.setIdioma = async function (idioma) {
    const l = normalizarIdioma(idioma);
    if (!l || l === EIA.idioma()) return;
    const anterior = _idioma;
    _idioma = l;
    try { await EIA.cargarIdioma(l); } catch (e) { _idioma = anterior; EIA.ui.error(e); return; }
    EIA.estado.set("eia_lang", l);
    quitarParametro("lang");
    aplicarIdiomaDocumento();
    pintarShell();
    EIA.traducir();
    EIA.emit("eia:idioma", { idioma: l });
    EIA.ui.anunciar(EIA.t("shell.anuncio_idioma"));
  };
  /** Nombre de un idioma en ese mismo idioma (endónimo), para el selector: nunca banderas (Spec G.5.6). */
  EIA.endonimo = function (tag) {
    const i = EIA.infoIdioma(tag);
    if (i && i.endonimo) return i.endonimo;
    try { const n = new Intl.DisplayNames([tag], { type: "language" }).of(tag); return n.charAt(0).toLocaleUpperCase(tag) + n.slice(1); } catch (e) { return tag; }
  };
  /** Nombre de un idioma o de una escritura en el idioma de la interfaz («árabe (Egipto)», «hebreo»…). */
  EIA.nombreIdioma = function (tag, tipo) {
    try { return new Intl.DisplayNames([EIA.localeFormato()], { type: tipo || "language" }).of(tag); } catch (e) { return tag; }
  };

  /* ───────────── Zona horaria y cierre del mercado (Spec W13 G.5.4) ─────────────
     La persona elige su zona en Configuración; por defecto, la de su dispositivo. Los días de sesión de los JSON se
     muestran como fechas (en UTC, sin correrse); la hora de cierre se calcula y se muestra en la zona elegida. */
  const ZONA_MERCADO = "America/New_York", HORA_CIERRE = 16; // la NYSE cierra a las 16:00 hora de Nueva York
  const HORA_APERTURA = 9, MINUTO_APERTURA = 30;               // y abre a las 9:30 (lunes a viernes; sin feriados)
  EIA.ZONA_MERCADO = ZONA_MERCADO;
  const zonaValida = z => { try { new Intl.DateTimeFormat("en-US", { timeZone: z }); return true; } catch (e) { return false; } };
  EIA.zonaDispositivo = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { return "UTC"; } };
  EIA.zona = function () { const z = EIA.estado.get("eia_zona"); return z && zonaValida(z) ? z : EIA.zonaDispositivo(); };
  /** z = una zona IANA, o null para volver a la del dispositivo. */
  EIA.setZona = function (z) {
    if (z && !zonaValida(z)) return;
    EIA.estado.set("eia_zona", z || null);
    formateadores.clear();
    if (hayDOM && _listo) pintarShell();
    EIA.emit("eia:zona", { zona: EIA.zona() });
  };
  /** Dígitos: v = "latn" (0-9 en todos los idiomas) o null (los del idioma: ٠١٢… en árabe). */
  EIA.setNumeros = function (v) {
    EIA.estado.set("eia_num", v === "latn" ? "latn" : null);
    formateadores.clear();
    if (hayDOM && _listo) pintarShell();
    EIA.emit("eia:zona", { zona: EIA.zona() });
  };
  /** Pura: minutos de diferencia entre la hora de una zona y UTC en un instante. */
  function desfase(zona, ms) {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: zona, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ms));
    const v = k => Number(p.find(x => x.type === k).value);
    return (Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second")) - ms) / 60000;
  }
  /** Pura: instante del cierre de la sesión del día ISO (16:00 en Nueva York, con o sin horario de verano). */
  /** Instante de una hora de Nueva York (hh:mm) en una fecha ISO. Dos pasadas: el desfase puede cambiar ese mismo día. */
  function instanteNY(iso, h, mi) {
    const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number);
    const local = Date.UTC(a, m - 1, d, h, mi || 0, 0);
    let ms = local - desfase(ZONA_MERCADO, local) * 60000;
    ms = local - desfase(ZONA_MERCADO, ms) * 60000;
    return new Date(ms);
  }
  EIA.instanteCierre = iso => instanteNY(iso, HORA_CIERRE, 0);
  /** Estado del mercado de Nueva York en un instante (por defecto, ahora): abierto de lunes a viernes de 9:30 a 16:00 ET.
      No considera feriados (se declara en la interfaz). Devuelve {abierto, cierre} o {abierto: false, apertura}. */
  EIA.mercado = function (ahora) {
    const t = ahora instanceof Date ? ahora : new Date();
    const partes = new Intl.DateTimeFormat("en-US", { timeZone: ZONA_MERCADO, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(t);
    const p = k => (partes.find(x => x.type === k) || {}).value;
    const iso = p("year") + "-" + p("month") + "-" + p("day");
    const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p("weekday"));
    const minuto = Number(p("hour")) * 60 + Number(p("minute")), abre = HORA_APERTURA * 60 + MINUTO_APERTURA, cierra = HORA_CIERRE * 60;
    const habil = dia >= 1 && dia <= 5;
    if (habil && minuto >= abre && minuto < cierra) return { abierto: true, cierre: instanteNY(iso, HORA_CIERRE, 0) };
    // Próxima apertura: hoy si todavía no abre; si no, el siguiente día hábil
    let fecha = new Date(Date.UTC(Number(p("year")), Number(p("month")) - 1, Number(p("day")))), d = dia;
    if (!(habil && minuto < abre)) { do { fecha = new Date(fecha.getTime() + 86400000); d = (d + 1) % 7; } while (d === 0 || d === 6); }
    return { abierto: false, apertura: instanteNY(fecha.toISOString().slice(0, 10), HORA_APERTURA, MINUTO_APERTURA) };
  };
  /** Horario de referencia (apertura y cierre de un día cualquiera) para el texto de ayuda. */
  EIA.horarioMercado = () => { const hoy = new Date().toISOString().slice(0, 10); return { apertura: instanteNY(hoy, HORA_APERTURA, MINUTO_APERTURA), cierre: instanteNY(hoy, HORA_CIERRE, 0) }; };
  /** «Cierre del 18 nov. 2026: 16:00 en Nueva York (15:00, hora de Perú)». */
  EIA.textoCierre = function (iso) {
    if (!ISO.test(String(iso))) return "";
    const c = EIA.instanteCierre(iso);
    return EIA.t("comun.cierre", { fecha: EIA.fmt.fecha(iso), hora_mercado: EIA.fmt.hora(c, ZONA_MERCADO), hora_local: EIA.fmt.hora(c), zona: EIA.fmt.zonaNombre(EIA.zona(), c) });
  };

  /* ───────────── Formatos con Intl según el idioma y la zona activos ───────────── */
  const formateadores = new Map();
  function intl(tipo, op) {
    const k = tipo + EIA.localeFormato() + JSON.stringify(op || {});
    if (!formateadores.has(k)) formateadores.set(k, new Intl[tipo](EIA.localeFormato(), op));
    return formateadores.get(k);
  }
  const nf = op => intl("NumberFormat", op);
  const dtf = op => intl("DateTimeFormat", op);
  const reglasPlural = () => intl("PluralRules");
  /** Orden alfabético del idioma (Á, Ñ, ü…) con números en su orden natural. */
  EIA.collator = () => intl("Collator", { numeric: true, sensitivity: "base" });
  EIA.ordenar = (lista, f) => lista.slice().sort((a, b) => EIA.collator().compare(String(f ? f(a) : a), String(f ? f(b) : b)));
  const ISO = /^\d{4}-\d{2}-\d{2}/;
  EIA.fmt = {
    /** Número con d decimales. */
    num: (x, d = 2) => nf({ minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(x)),
    ent: x => nf({ maximumFractionDigits: 0 }).format(Number(x)),
    /** x ya viene en puntos porcentuales (2,93 → «+2.93%»). Con {signo:false} no antepone el signo +. */
    pct: (x, d = 2, op) => nf({ style: "percent", minimumFractionDigits: d, maximumFractionDigits: d, signDisplay: op && op.signo === false ? "auto" : "exceptZero" }).format(Number(x) / 100),
    /** Probabilidad 0–1 como número («0.62»). */
    prob: (p, d = 2) => nf({ minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(p)),
    /** Dólares; d decimales (2 por defecto). La divisa no se convierte al cambiar de idioma: solo cambia el formato. */
    usd: (x, d) => nf(d == null ? { style: "currency", currency: "USD" } : { style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(x)),
    compacto: x => nf({ notation: "compact", maximumFractionDigits: 1 }).format(Number(x)),
    /** Fecha ISO (día de sesión) en UTC para que no se corra un día en Lima. Lo que no es fecha (p. ej. "inicio") se traduce. */
    fecha(iso, estilo) {
      const s = String(iso);
      if (!ISO.test(s)) return s === "inicio" ? EIA.t("comun.inicio") : s;
      const op = estilo === "larga" ? { dateStyle: "long", timeZone: "UTC" } : { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" };
      return dtf(op).format(new Date(s.slice(0, 10) + "T00:00:00Z"));
    },
    /** Hora de un instante en la zona elegida (o en la indicada). */
    hora: (instante, zona) => dtf({ hour: "numeric", minute: "2-digit", timeZone: zona || EIA.zona() }).format(instante instanceof Date ? instante : new Date(instante)),
    diaSemana: (instante, zona) => dtf({ weekday: "long", timeZone: zona || EIA.zona() }).format(instante instanceof Date ? instante : new Date(instante)),
    /** Fecha y hora de un instante (marca de tiempo ISO) en la zona elegida. */
    fechaHora: (instante, zona) => dtf({ dateStyle: "medium", timeStyle: "short", timeZone: zona || EIA.zona() }).format(instante instanceof Date ? instante : new Date(instante)),
    /** Nombre de la zona en el idioma activo («hora de Perú», «Peru Time»). */
    zonaNombre(zona, instante) {
      try {
        const p = dtf({ timeZone: zona || EIA.zona(), timeZoneName: "longGeneric" }).formatToParts(instante || new Date()).find(x => x.type === "timeZoneName");
        return p ? p.value : zona;
      } catch (e) { return zona; }
    },
    /** Desfase de la zona con UTC («GMT-5»). */
    desfase(zona, instante) {
      try { const p = dtf({ timeZone: zona, timeZoneName: "shortOffset" }).formatToParts(instante || new Date()).find(x => x.type === "timeZoneName"); return p ? p.value : ""; } catch (e) { return ""; }
    },
    /** Tiempo relativo: rel(-2, "day") → «anteayer» / «2 days ago». */
    rel: (valor, unidad) => intl("RelativeTimeFormat", { numeric: "auto" }).format(valor, unidad),
    /** Tiempo relativo desde ahora hasta un instante pasado, en la unidad más natural. */
    hace(instante, ahora) {
      const seg = Math.round(((instante instanceof Date ? instante : new Date(instante)) - (ahora || new Date())) / 1000), a = Math.abs(seg);
      if (a < 60) return EIA.fmt.rel(seg, "second");
      if (a < 3600) return EIA.fmt.rel(Math.round(seg / 60), "minute");
      if (a < 86400) return EIA.fmt.rel(Math.round(seg / 3600), "hour");
      return EIA.fmt.rel(Math.round(seg / 86400), "day");
    },
    /** Lista con la conjunción del idioma: «AAPL, MSFT y NVDA». */
    lista: (items, tipo) => intl("ListFormat", { type: tipo || "conjunction" }).format(items.map(String))
  };

  /** Compatibilidad con la base: fmt.n, fmt.pct, fmt.usd y fmt.cls. */
  const fmt = { n: EIA.fmt.num, pct: EIA.fmt.pct, usd: EIA.fmt.usd, cls: x => (x > 0 ? "up" : (x < 0 ? "dn" : "mut")) };

  /** Ordena filas por una columna {clave, valor?}. Estable. Función pura. */
  EIA.ordenarFilas = function (filas, col, dir) {
    const signo = dir === "asc" ? 1 : -1;
    const val = f => (col.valor ? col.valor(f) : f[col.clave]);
    return filas.map((f, i) => [f, i]).sort((a, b) => {
      const x = val(a[0]), y = val(b[0]);
      const c = typeof x === "number" && typeof y === "number" ? x - y
        : EIA.collator().compare(String(x), String(y));
      return c !== 0 ? signo * c : a[1] - b[1];
    }).map(p => p[0]);
  };

  /* ───────────── Cartera de Trading (la usan Trading, Leaderboard y «Llevar a Trading») ─────────────
     Cartera = {efectivo, posiciones: [{ticker, cantidad, costo}]}; costo = precio medio de compra.
     Se guarda en eia_port (Modo profesor, clave de la base) o eia_port_real; las órdenes, en eia_ordenes(_real).
     Las funciones de cálculo son puras (se prueban en Node); leer y guardar usan el estado del navegador. */
  EIA.cartera = {
    clave: modo => ((modo || EIA.modo()) === "real" ? "eia_port_real" : "eia_port"),
    claveOrdenes: modo => ((modo || EIA.modo()) === "real" ? "eia_ordenes_real" : "eia_ordenes"),
    /** Copia profunda de una cartera (p. ej. 11.portafolio_demo). */
    copia: c => ({ efectivo: Number(c.efectivo), posiciones: (c.posiciones || []).map(p => ({ ticker: p.ticker, cantidad: Number(p.cantidad), costo: Number(p.costo) })) }),
    /** Valor de mercado: efectivo + Σ cantidad × precio. precio(ticker) → número. */
    valor: (c, precio) => c.posiciones.reduce((a, p) => a + p.cantidad * precio(p.ticker), c.efectivo),
    /** Valor inicial de la demo a precio de costo: la base del retorno del usuario (como en la base del profesor). */
    valorInicial: demo => demo.posiciones.reduce((a, p) => a + p.cantidad * p.costo, demo.efectivo),
    /** Errores de una orden {ticker, lado: "C" | "V", cantidad}: {campo: código}. Vacío si es válida. */
    validar(c, orden, precio) {
      const e = {}, q = Number(orden.cantidad);
      if (!(precio > 0)) e.ticker = "ticker";
      if (orden.lado !== "C" && orden.lado !== "V") e.lado = "lado";
      if (!Number.isInteger(q) || q < 1) e.cantidad = "entero";
      else if (orden.lado === "C" && precio > 0 && q * precio > c.efectivo + 1e-9) e.cantidad = "efectivo";
      else if (orden.lado === "V") {
        const pos = c.posiciones.find(p => p.ticker === orden.ticker);
        if (!pos) e.cantidad = "sin_posicion"; else if (q > pos.cantidad) e.cantidad = "insuficiente";
      }
      return e;
    },
    /** Ejecuta una orden válida y devuelve una cartera NUEVA (no modifica la recibida). */
    ejecutar(c, orden, precio) {
      const err = EIA.cartera.validar(c, orden, precio);
      if (Object.keys(err).length) throw new Error("Orden no válida: " + JSON.stringify(err));
      const n = EIA.cartera.copia(c), q = Number(orden.cantidad), pos = n.posiciones.find(p => p.ticker === orden.ticker);
      if (orden.lado === "C") {
        n.efectivo -= q * precio;
        if (pos) { pos.costo = (pos.costo * pos.cantidad + q * precio) / (pos.cantidad + q); pos.cantidad += q; }
        else n.posiciones.push({ ticker: orden.ticker, cantidad: q, costo: precio });
      } else {
        pos.cantidad -= q; n.efectivo += q * precio;
        n.posiciones = n.posiciones.filter(p => p.cantidad > 0);
      }
      return n;
    },
    /** Pesos sin los activos excluidos, reescalados para que vuelvan a sumar 1 (G10). Devuelve {} si no queda ninguno. */
    renormalizar(pesos, excluidos) {
      const ex = excluidos || [], quedan = Object.entries(pesos).filter(([tk, w]) => w > 0 && !ex.includes(tk));
      const suma = quedan.reduce((a, [, w]) => a + w, 0), salida = {};
      if (suma > 0) for (const [tk, w] of quedan) salida[tk] = w / suma;
      return salida;
    },
    /** Plan de compras de «Llevar a Trading» (PLAN_MAESTRO §4.5): cantidad = floor(monto × peso / precio).
        Devuelve {ordenes: [{ticker, peso, precio, cantidad, total}], sinComprar: [...], total, sobrante}. */
    plan(pesos, monto, precio) {
      const ordenes = [], sinComprar = [];
      for (const [ticker, peso] of Object.entries(pesos)) {
        const p = precio(ticker);
        if (!(p > 0) || !(peso > 0)) continue;
        const cantidad = Math.floor((monto * peso) / p + 1e-9), fila = { ticker, peso, precio: p, cantidad, total: cantidad * p };
        (cantidad > 0 ? ordenes : sinComprar).push(fila);
      }
      ordenes.sort((a, b) => b.peso - a.peso);
      const total = ordenes.reduce((a, o) => a + o.total, 0);
      return { ordenes, sinComprar, total, sobrante: monto - total };
    },
    /** Filas de posiciones con valor y ganancia o pérdida. */
    filas: (c, precio) => c.posiciones.map(p => {
      const ultimo = precio(p.ticker), valor = p.cantidad * ultimo, pnl = (ultimo - p.costo) * p.cantidad;
      return { ticker: p.ticker, cantidad: p.cantidad, costo: p.costo, ultimo, valor, pnl, pnl_pct: p.costo > 0 ? (ultimo / p.costo - 1) * 100 : 0 };
    })
  };

  /* ═════════════ A partir de aquí todo necesita DOM ═════════════ */

  /* ───────────── Tema claro / oscuro ───────────── */
  function applyTheme(t) { if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t); }
  EIA.tema = function () {
    const a = document.documentElement.getAttribute("data-theme");
    if (a === "dark" || a === "light") return a;
    return global.matchMedia && global.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
  };
  EIA.setTema = function (t) {
    applyTheme(t);
    EIA.estado.set("eia_theme", t);
    const b = $("#tema"); if (b) b.setAttribute("aria-pressed", String(t === "dark"));
    EIA.emit("eia:tema", { tema: t });
    if (global.onTheme) global.onTheme(t); // gancho de la base
    EIA.ui.anunciar(EIA.t(t === "dark" ? "shell.anuncio_tema_oscuro" : "shell.anuncio_tema_claro"));
  };
  /* ───────────── Colores de alza y baja (adaptación cultural, zona 3 del Lab 13) ─────────────
     En Japón, China y Corea el alza se pinta en rojo. «Automático» sigue al idioma; la persona puede fijarlo.
     El color nunca es el único indicador: ▲ ▼ y el signo se mantienen siempre. */
  const ROJO_SUBE = ["ja", "zh", "ko"];
  /** "verde-sube" | "rojo-sube" según la preferencia (eia_colores) o el idioma. */
  EIA.colores = function () {
    const p = EIA.estado.get("eia_colores");
    if (p === "verde-sube" || p === "rojo-sube") return p;
    return ROJO_SUBE.includes(String(EIA.idioma()).split("-")[0]) ? "rojo-sube" : "verde-sube";
  };
  /** v = "auto" | "verde-sube" | "rojo-sube". Los gráficos se repintan (leen los tokens --up y --dn). */
  EIA.setColores = function (v) {
    EIA.estado.set("eia_colores", v === "verde-sube" || v === "rojo-sube" ? v : null);
    document.documentElement.setAttribute("data-colores", EIA.colores());
    EIA.emit("eia:tema", { tema: EIA.tema() });
  };
  /** Colores de los gráficos leídos de los tokens CSS: una sola fuente de color para ambos temas. */
  EIA.coloresGrafico = function () {
    const cs = getComputedStyle(document.documentElement);
    const v = n => cs.getPropertyValue(n).trim();
    return {
      fg: v("--fg"), mut: v("--mut"), bd: v("--bd"), bg: v("--bg"), panel: v("--panel"), hl: v("--hl"),
      up: v("--up"), dn: v("--dn"), ac: v("--ac"), warn: v("--warn"),
      serie: [1, 2, 3, 4, 5, 6].map(i => v("--serie-" + i)),
      serieTexto: [1, 2, 3, 4, 5, 6].map(i => v("--serie-texto-" + i)) // texto sobre cada color de serie (≥ 4,5:1)
    };
  };
  /** Opciones de ECharts para velas OHLC con el volumen en un segundo panel (Spec W13 G.4: «velas, volumen, rangos»),
      o para la línea de cierres si la serie no tiene velas. La usan el Dashboard y el detalle de activo.
      c = EIA.coloresGrafico(); s = serie de EIALib.mercado.serieActivo. */
  EIA.ui.opcionesVelas = function (c, s, nombre) {
    const t = EIA.t;
    const eje = { type: "category", data: s.fechas, axisLabel: { color: c.mut, formatter: v => EIA.fmt.fecha(v) }, axisLine: { lineStyle: { color: c.bd } } };
    const zoom = idx => [{ type: "inside", xAxisIndex: idx }, { type: "slider", xAxisIndex: idx, height: 18, bottom: 8, textStyle: { color: c.mut }, labelFormatter: (i, v) => EIA.fmt.fecha(v) }];
    const ejeY = { scale: true, axisLabel: { color: c.mut }, splitLine: { lineStyle: { color: c.bd } } };
    if (s.tipo !== "velas") {
      return { textStyle: { color: c.fg }, tooltip: { trigger: "axis" }, grid: { left: 56, right: 16, top: 20, bottom: 56 }, xAxis: eje, yAxis: ejeY, dataZoom: zoom(0),
        series: [{ type: "line", name: nombre, data: s.c, showSymbol: false, lineStyle: { width: 2, color: c.ac }, itemStyle: { color: c.ac } }] };
    }
    const volumen = t("dashboard.col_volumen");
    return {
      textStyle: { color: c.fg }, tooltip: { trigger: "axis", axisPointer: { type: "cross" } }, axisPointer: { link: [{ xAxisIndex: "all" }] },
      grid: [{ left: 56, right: 16, top: 20, height: "58%" }, { left: 56, right: 16, top: "72%", height: "13%" }],
      xAxis: [eje, Object.assign({}, eje, { gridIndex: 1, axisLabel: { show: false } })],
      yAxis: [ejeY, { gridIndex: 1, scale: true, splitNumber: 2, axisLabel: { color: c.mut, formatter: v => EIA.fmt.compacto(v) }, splitLine: { show: false } }],
      dataZoom: zoom([0, 1]),
      series: [
        { type: "candlestick", name: nombre, data: s.o.map((o, i) => [o, s.c[i], s.l[i], s.h[i]]), itemStyle: { color: c.up, color0: c.dn, borderColor: c.up, borderColor0: c.dn } },
        // El volumen toma el color de la vela del día (la palabra y el valor están en la tabla y en el tooltip)
        { type: "bar", name: volumen, xAxisIndex: 1, yAxisIndex: 1, data: s.v.map((v, i) => ({ value: v, itemStyle: { color: s.c[i] >= s.o[i] ? c.up : c.dn, opacity: 0.55 } })) }
      ]
    };
  };
  EIA.movimientoReducido = () => document.documentElement.dataset.movimiento === "reducido"
    || (global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ───────────── Preferencias de accesibilidad guardadas (el panel vive en js/a11y/) ───────────── */
  EIA.aplicarPreferencias = function () {
    const p = EIA.estado.get("eia_a11y") || {};
    const h = document.documentElement;
    const poner = (attr, valor) => { if (valor) h.setAttribute(attr, valor); else h.removeAttribute(attr); };
    h.style.fontSize = p.texto && p.texto !== 100 ? p.texto + "%" : "";
    poner("data-contraste", p.contraste ? "alto" : "");
    if (p.contraste) applyTheme(EIA.tema()); // el alto contraste necesita el tema explícito en <html>
    poner("data-movimiento", p.movimiento ? "reducido" : "");
    poner("data-espaciado", p.espaciado ? "amplio" : "");
    poner("data-enlaces", p.enlaces ? "subrayados" : "");
    poner("data-fuente", p.fuente ? "legible" : "");
    poner("data-cursor", p.cursor ? "grande" : "");
  };

  /** Abre el Centro de accesibilidad (js/a11y/panel.js se carga la primera vez). */
  EIA.abrirAccesibilidad = function () {
    return EIA.cargar("js/a11y/panel.js").then(() => EIA.a11y.abrir()).catch(e => EIA.ui.notificar(String(e.message || e), "error"));
  };
  /** Reanuda las modalidades de control al cargar la página: el sitio es multipágina y la cámara y el barrido no sobreviven
      a la navegación. También atiende ?barrido=1 y los modos de prueba ?puntero=raton y ?camara=simulada&mod=cabeza|manos&objetivo=<selector>. */
  function reanudarAccesibilidad() {
    const q = parametros();
    let enSesion = null; try { enSesion = global.sessionStorage.getItem("eia_cam"); } catch (e) { enSesion = null; }
    const simulada = q.get("camara") === "simulada", modalidad = simulada ? (q.get("mod") || "cabeza") : enSesion;
    if (modalidad) {
      EIA.cargar("js/a11y/camara.js").then(() => EIA.camara.iniciar(modalidad, { reanudar: true, simulada, objetivo: q.get("objetivo") })).catch(() => {});
    }
    let barrido = null; try { barrido = global.sessionStorage.getItem("eia_barrido"); } catch (e) { barrido = null; }
    if (barrido || q.get("barrido") === "1") EIA.cargar("js/a11y/barrido.js").then(() => EIA.barrido.iniciar()).catch(() => {});
    let voz = null; try { voz = global.sessionStorage.getItem("eia_voz"); } catch (e) { voz = null; }
    if (voz) EIA.cargar("js/a11y/voz.js").then(() => EIA.voz.iniciar({ reanudar: true })).catch(() => {});
    if (!modalidad && q.get("puntero") === "raton") {
      EIA.cargar("js/a11y/bus-entrada.js").then(() => EIA.cargar("js/a11y/puntero.js"))
        .then(() => EIA.puntero.activar({ raton: true, permanencia: true, ms: (EIA.estado.get("eia_a11y") || {}).ms || 900 })).catch(() => {});
    }
  }

  /* ───────────── Carga de scripts bajo demanda (accesibilidad avanzada, algoritmos) ───────────── */
  const cargados = new Map();
  EIA.cargar = function (src) {
    if (!cargados.has(src)) cargados.set(src, new Promise((ok, falla) => {
      const s = document.createElement("script");
      s.src = src + "?v=" + EIA.version;
      s.onload = () => ok();
      s.onerror = () => { cargados.delete(src); falla(new ErrorDatos("http", src, 0)); };
      document.head.appendChild(s);
    }));
    return cargados.get(src);
  };

  /** Lanza un cálculo en un Worker de js/workers/ (solo Modo real con rango personalizado; PLAN_MAESTRO §7.2).
      Devuelve {promesa, cancelar()}. op.alProgresar(pct) recibe el avance de 0 a 100. */
  EIA.trabajo = function (nombre, params, op) {
    const w = new Worker("js/workers/" + nombre + ".worker.js?v=" + EIA.version);
    let cancelar = () => {};
    const promesa = new Promise((ok, falla) => {
      cancelar = () => { w.terminate(); falla(Object.assign(new Error("cancelado"), { cancelado: true })); };
      w.onmessage = e => {
        const m = e.data || {};
        if (m.tipo === "progreso") { if (op && op.alProgresar) op.alProgresar(m.pct); }
        else if (m.tipo === "resultado") { w.terminate(); ok(m.datos); }
        else if (m.tipo === "error") { w.terminate(); falla(new Error(m.mensaje)); }
      };
      w.onerror = e => { w.terminate(); falla(new Error(e.message || "Error en el Worker " + nombre)); };
      w.postMessage({ tipo: "calcular", params });
    });
    return { promesa, cancelar: () => cancelar() };
  };

  /* ───────────── Shell: barra lateral por bloques, barra superior y pie (Spec W13 G.4: navegación común) ─────────────
     Escritorio (≥ 1180 px): barra lateral fija, plegable a un riel de iconos (eia_lateral). Menos ancho: cajón que se
     abre con ☰ (#btn-modulos), con el foco atrapado; Esc, ✕ o el fondo lo cierran y el foco vuelve a ☰. */
  let menuAbierto = false, cuentaAbierta = false, notifAbierta = false;
  const MEDIA_CAJON = "(max-width: 1179.98px)";
  const esCajon = () => !!(global.matchMedia && global.matchMedia(MEDIA_CAJON).matches);
  const plegado = () => EIA.estado.get("eia_lateral") === "plegado";
  /** Icono del sprite propio (assets/iconos.svg). Es decorativo: siempre va junto a un texto visible o accesible. */
  EIA.ui.icono = (nombre, clase) => `<svg class="ico${clase ? " " + clase : ""}" aria-hidden="true" focusable="false"><use href="assets/iconos.svg?v=${EIA.version}#i-${nombre}"></use></svg>`;
  const LOGO = '<svg class="logo" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect class="logo-fondo" width="32" height="32" rx="8"/><path class="logo-trazo" d="M7 21.5l6-6 4 4 8-9"/><path class="logo-trazo" d="M20 10.5h5v5"/></svg>';
  const marca = () => `<a class="brand" href="index.html">${LOGO}<span class="brand-txt">Ernesto <span>Investing AI</span></span></a>`;
  function plantillaLateral() {
    const t = EIA.t, pagina = document.body.dataset.page, I = EIA.ui.icono;
    const bloques = NAVEGACION.map(([b, l]) => `<p class="lat-bloque" id="lat-${b}">${esc(t("nav.bloque_" + b))}</p><ul aria-labelledby="lat-${b}">${l.map(p =>
      `<li><a href="${p[0]}"${p[2] === pagina ? ' aria-current="page"' : ""} title="${esc(t(p[1]))}">${I(p[3])}<span class="lat-txt">${esc(t(p[1]))}</span>${p[4] ? '<span class="nuevo" aria-hidden="true">★</span>' : ""}</a></li>`).join("")}</ul>`).join("");
    return `<div class="lat-cab">${marca()}<button id="btn-cerrar-menu" type="button" class="solo-cajon" aria-label="${esc(t("comun.cerrar"))}">${I("cerrar")}</button></div>
<div id="nav-modulos" class="lat-nav">${bloques}</div>
<div class="lat-pie"><button id="btn-plegar" type="button" class="solo-fijo" aria-pressed="${plegado()}" title="${esc(t("shell.menu_compacto"))}">${I("plegar")}<span class="lat-txt">${esc(t("shell.menu_compacto"))}</span></button></div>`;
  }
  function plantillaCabecera() {
    const t = EIA.t, modo = EIA.modo(), I = EIA.ui.icono;
    const alias = String((EIA.estado.get("eia_perfil") || {}).alias || "").trim(), ini = EIA.iniciales(alias);
    const mp = metaLista.profesor, mr = metaLista.real;
    const rotuloProfesor = mp && mp.fecha_corte ? t("shell.modo_profesor", { fecha: EIA.fmt.fecha(mp.fecha_corte) }) : t("shell.modo_profesor_sin_fecha");
    const rotuloReal = mr && mr.disponible && mr.fecha_corte ? t("shell.modo_real", { fecha: EIA.fmt.fecha(mr.fecha_corte) }) : t("shell.modo_real_sin_fecha");
    return `<div class="bar">
  <button id="btn-modulos" type="button" class="solo-cajon ctl-ico" aria-expanded="${menuAbierto}" aria-controls="lateral" title="${esc(t("nav.modulos"))}">${I("menu")}<span class="sr">${esc(t("nav.modulos"))}</span></button>
  <span class="solo-cajon marca-bar">${marca()}</span>
  <div id="bar-medio" class="bar-medio"><button id="btn-buscar" type="button" class="buscar-disparador" aria-haspopup="dialog" title="${esc(t("shell.buscar_titulo"))}">${I("buscar")}<span class="buscar-txt">${esc(t("shell.buscar"))}</span><kbd aria-hidden="true">Ctrl K</kbd></button><p id="estado-mercado" class="mercado"></p></div>
  <div class="controles">
    <div id="ctl-modo" class="seg" role="group" aria-label="${esc(t("shell.datos_grupo"))}">
      <span class="seg-rot" aria-hidden="true">${esc(t("shell.datos"))}</span>
      <button type="button" data-modo="profesor" aria-pressed="${modo === "profesor"}">${esc(rotuloProfesor)}</button>
      <button type="button" data-modo="real" aria-pressed="${modo === "real"}">${esc(rotuloReal)}</button>
    </div>
    <span class="ctl-idioma">${I("idioma")}<label class="sr" for="ctl-idioma">${esc(t("shell.idioma"))}</label><select id="ctl-idioma">${opcionesIdioma()}</select></span>
    <button id="tema" type="button" class="ctl-ico" aria-pressed="${EIA.tema() === "dark"}" title="${esc(t("shell.tema_titulo"))}">${I("tema")}<span class="ctl-txt">${esc(t("shell.tema"))}</span></button>
    <button id="btn-a11y" type="button" class="ctl-ico" aria-haspopup="dialog" title="${esc(t("shell.accesibilidad_titulo"))}">${I("accesibilidad")}<span class="ctl-txt">${esc(t("shell.accesibilidad"))}</span></button>
  </div>
  <div class="notif">${plantillaCampana()}</div>
  <div class="cuenta">
      <button id="btn-cuenta" type="button" aria-expanded="${cuentaAbierta}" aria-controls="menu-cuenta" title="${esc(t("shell.cuenta"))}"><span class="avatar" aria-hidden="true">${ini ? esc(ini) : I("usuario")}</span><span class="sr">${esc(t("shell.cuenta"))}</span>${I("abajo", "ico-chev")}</button>
      <div id="menu-cuenta" class="menu-cuenta"${cuentaAbierta ? "" : " hidden"}>
        ${alias ? `<p class="menu-hola">${esc(t("shell.cuenta_saludo", { alias }))}</p>` : ""}<p class="menu-cab">${esc(t("shell.cuenta_demo"))}</p>
        <ul>${NAVEGACION.find(b => b[0] === "cuenta")[1].map(p => `<li><a href="${p[0]}"${p[2] === document.body.dataset.page ? ' aria-current="page"' : ""}>${I(p[3])}<span>${esc(t(p[1]))}</span></a></li>`).join("")}
          <li><button type="button" id="menu-tour" class="menu-accion">${I("ayuda")}<span>${esc(t("shell.accion_tour"))}</span></button></li></ul>
      </div>
  </div>
</div>${franjaIdioma()}`;
  }
  /** Opciones del selector de idioma: el endónimo de cada idioma, en su propia escritura y con su lang (Spec G.5.6);
      los borradores lo dicen en su idioma. Un pseudoidioma activo también aparece, para poder volver. */
  function opcionesIdioma() {
    const actual = EIA.idioma(), lista = EIA.IDIOMAS.slice();
    if (EIA.esPseudo(actual)) lista.push(actual);
    return lista.map(tag => {
      const i = EIA.infoIdioma(tag) || {};
      const rotulo = i.pseudo ? EIA.t(i.dir === "rtl" ? "config.pseudo_rtl" : "config.pseudo_ltr")
        : EIA.endonimo(tag) + (i.estado === "borrador" ? " · " + (i.etiqueta_borrador || "borrador") : "");
      return `<option value="${esc(tag)}" lang="${esc(i.pseudo ? EIA.fuente() : tag)}"${tag === actual ? " selected" : ""}>${esc(rotulo)}</option>`;
    }).join("");
  }
  /** Franja bajo la cabecera si el idioma es un borrador (traducción con IA sin revisar) o un pseudoidioma (Spec G.5.7). */
  function franjaIdioma() {
    const t = EIA.t;
    if (EIA.esPseudo()) return `<p class="franja-idioma" role="note"><span aria-hidden="true">⚠</span> ${esc(t("shell.pseudo_activa"))} <a href="configuracion.html">${esc(t("shell.idioma_enlace"))}</a></p>`;
    if (EIA.esBorrador()) return `<p class="franja-idioma" role="note"><span aria-hidden="true">✎</span> ${esc(t("shell.borrador"))} <a href="configuracion.html">${esc(t("shell.idioma_enlace"))}</a></p>`;
    return "";
  }
  function plantillaPie() {
    const t = EIA.t, modo = EIA.modo(), mt = metaLista[modo];
    const fecha = mt && mt.fecha_corte ? EIA.fmt.fecha(mt.fecha_corte, "larga") : "";
    const claveAviso = modo === "real" && !(mt && mt.disponible) ? "aviso.real.sin_datos"
      : modo === "real" && _parcial ? "aviso.real.parcial" : "aviso." + modo + ".global";
    const cierre = mt && mt.fecha_corte ? EIA.textoCierre(mt.fecha_corte) : "";
    const actualizado = mt && mt.generado_en && !isNaN(new Date(mt.generado_en))
      ? t("shell.actualizado", { fecha_hora: EIA.fmt.fechaHora(mt.generado_en), hace: EIA.fmt.hace(mt.generado_en) }) : "";
    return `<p class="aviso" data-aviso="global" role="note"><span class="aviso-ico" aria-hidden="true">⚠</span><span>${esc(t(claveAviso, { fecha }))}</span></p>
${cierre || actualizado ? `<p class="pie-cierre">${esc([cierre, actualizado].filter(Boolean).join(" · "))}</p>` : ""}
<p class="pie-creditos">${esc(t("shell.pie_creditos"))}</p>`;
  }
  /* Estado del mercado (barra superior): punto + texto, nunca solo color; se actualiza cada minuto */
  function pintarMercado() {
    const el = $("#estado-mercado"); if (!el) return;
    const t = EIA.t, m = EIA.mercado(), h = EIA.horarioMercado();
    const texto = m.abierto
      ? t("shell.mercado_abierto", { cierre: EIA.fmt.hora(m.cierre, ZONA_MERCADO), local: EIA.fmt.hora(m.cierre) })
      : t("shell.mercado_cerrado", { dia: EIA.fmt.diaSemana(m.apertura), apertura: EIA.fmt.hora(m.apertura, ZONA_MERCADO), local: EIA.fmt.hora(m.apertura) });
    const ayuda = t("shell.mercado_ayuda", { apertura: EIA.fmt.hora(h.apertura, ZONA_MERCADO), cierre: EIA.fmt.hora(h.cierre, ZONA_MERCADO) });
    el.className = "mercado " + (m.abierto ? "mercado-abierto" : "mercado-cerrado");
    // Visible, el estado corto; el detalle (hora en Nueva York y en tu zona) va al texto accesible y a la ayuda emergente
    el.innerHTML = `<span class="mercado-punto" aria-hidden="true"></span><span aria-hidden="true">${esc(t(m.abierto ? "shell.mercado_abierto_corto" : "shell.mercado_cerrado_corto"))}</span><span class="sr">${esc(texto)}</span>`;
    el.title = texto + ". " + ayuda;
  }
  /* Campanita: botón con el número de no leídas (texto accesible con plural) y panel de divulgación */
  function plantillaCampana() {
    const t = EIA.t, n = EIA.notificaciones.noLeidas();
    return `<button id="btn-notif" type="button" class="ctl-ico" aria-expanded="${notifAbierta}" aria-controls="panel-notif" title="${esc(t("shell.notificaciones"))}">${EIA.ui.icono("campana")}<span class="sr">${esc(n ? t("shell.notif_sin_leer", { n }) : t("shell.notificaciones"))}</span>${
      n ? `<span class="insignia-notif" aria-hidden="true">${esc(EIA.fmt.ent(Math.min(n, 99)))}</span>` : ""}</button>
<div id="panel-notif" class="panel-notif"${notifAbierta ? "" : " hidden"}></div>`;
  }
  function pintarCampana() {
    const c = $(".notif"); if (!c) return;
    const foco = document.activeElement && document.activeElement.id === "btn-notif";
    c.innerHTML = plantillaCampana();
    if (notifAbierta) pintarPanelNotif();
    if (foco) $("#btn-notif").focus();
  }
  function pintarPanelNotif() {
    const p = $("#panel-notif"); if (!p) return;
    const t = EIA.t, I = EIA.ui.icono, l = EIA.notificaciones.lista();
    const item = n => {
      const d = n.datos || {};
      const [ico, texto, href] = n.tipo === "alerta" ? ["alerta", t("shell.notif_alerta", { condicion: EIA.alertas.texto(d) }), "watchlist.html"]
        : n.tipo === "lote" ? ["cartera", t("llevar.hecho", { n: d.n, total: EIA.fmt.usd(d.total) }), "ordenes.html"]
          : ["trading", t(d.lado === "C" ? "trading.ejecutada_compra" : "trading.ejecutada_venta", { n: d.n, ticker: d.ticker, precio: EIA.fmt.usd(d.precio) }), "ordenes.html"];
      return `<li${n.leida ? "" : ' class="no-leida"'}><a href="${href}">${I(ico, "notif-ico")}<span class="notif-cuerpo"><span class="notif-txt">${n.leida ? "" : `<span class="sr">${esc(t("shell.notif_nueva"))} </span>`}${esc(texto)}</span><time datetime="${esc(n.fecha)}" title="${esc(EIA.fmt.fechaHora(n.fecha))}">${esc(EIA.fmt.hace(n.fecha))}</time></span></a></li>`;
    };
    p.innerHTML = `<div class="panel-cab"><p class="panel-titulo">${esc(t("shell.notificaciones"))}</p>${
      l.some(n => !n.leida) ? `<button type="button" class="enlace" id="notif-leidas">${esc(t("shell.notif_marcar"))}</button>` : ""}</div>${
      l.length ? `<ul class="lista-notif">${l.map(item).join("")}</ul>` : `<p class="mut notif-vacio">${esc(t("shell.notif_vacio"))}</p>`}`;
  }
  function alternarNotif(abrir, devolverFoco) {
    notifAbierta = abrir === undefined ? !notifAbierta : abrir;
    if (notifAbierta && cuentaAbierta) alternarCuenta(false);
    const b = $("#btn-notif"), p = $("#panel-notif");
    if (b) b.setAttribute("aria-expanded", String(notifAbierta));
    if (p) { p.hidden = !notifAbierta; if (notifAbierta) { pintarPanelNotif(); const f = $("a,button", p); if (f) f.focus(); } }
    if (!notifAbierta && devolverFoco && b) b.focus();
  }
  /* Cinta de cotizaciones (los activos de 10): se pausa con su botón (WCAG 2.2.2), al pasar el puntero o al enfocarla,
     y queda quieta con «reducir movimiento». La segunda copia, que cierra el bucle, se oculta a los lectores de pantalla. */
  async function pintarCinta() {
    const caja = $("#cinta"); if (!caja) return;
    let c10 = null;
    try { c10 = await EIA.universo(); } catch (e) { c10 = null; }
    if (!c10 || !c10.length) { caja.hidden = true; return; }
    const t = EIA.t, pausada = EIA.estado.get("eia_cinta") === "pausada";
    const items = c10.map(a => `<li><bdi class="cinta-tk">${esc(a.ticker)}</bdi> <span class="cifra">${esc(EIA.fmt.num(a.ultimo))}</span> ${EIA.ui.variacion(a.var_1d_pct)}</li>`).join("");
    caja.hidden = false;
    caja.classList.toggle("pausada", pausada);
    caja.setAttribute("aria-label", t("shell.cinta"));
    caja.innerHTML = `<button type="button" id="cinta-pausa" class="cinta-pausa" aria-pressed="${pausada}" title="${esc(t("shell.cinta_pausar"))}">${EIA.ui.icono(pausada ? "reproducir" : "pausa")}<span class="sr">${esc(t("shell.cinta_pausar"))}</span></button>
<div class="cinta-ventana" data-marquesina><ul class="cinta-pista">${items}</ul><ul class="cinta-pista cinta-copia" aria-hidden="true">${items}</ul></div>`;
  }
  /* ───────────── Buscador global (Ctrl+K o «/»): activos, páginas y acciones — patrón combobox con listbox (WAI-ARIA) ───────────── */
  /** Minúsculas, sin tildes ni marcas combinantes, en cualquier escritura (la misma idea que la voz). Pura. */
  EIA.normalizar = s => String(s == null ? "" : s).normalize("NFKC").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim();
  /** Pura: los resultados de un texto entre fuentes [{claves: [...], …}]: primero la coincidencia exacta, luego al inicio y luego contenida. */
  EIA.buscarEn = function (fuentes, q, max) {
    const n = EIA.normalizar(q);
    if (!n) return [];
    const puntos = f => f.claves.reduce((m, k) => { const c = EIA.normalizar(k); return Math.max(m, c === n ? 3 : c.startsWith(n) ? 2 : c.includes(n) ? 1 : 0); }, 0);
    return fuentes.map((f, i) => ({ f, p: puntos(f), i })).filter(x => x.p).sort((a, b) => b.p - a.p || a.i - b.i).slice(0, max || 15).map(x => x.f);
  };
  /** Acciones del buscador: [id, clave del texto, icono, función]. */
  const ACCIONES_BUSCADOR = () => [
    ["tema", "shell.accion_tema", "tema", () => EIA.setTema(EIA.tema() === "dark" ? "light" : "dark")],
    ["modo", EIA.modo() === "real" ? "shell.accion_modo_profesor" : "shell.accion_modo_real", "dashboard", () => EIA.setModo(EIA.modo() === "real" ? "profesor" : "real")],
    ["a11y", "shell.accion_a11y", "accesibilidad", () => EIA.abrirAccesibilidad()],
    ["voz", "shell.accion_voz", "info", () => EIA.cargar("js/a11y/voz.js").then(() => EIA.voz.alternar()).catch(() => {})],
    ["tour", "shell.accion_tour", "ayuda", () => EIA.tour.iniciar()]
  ];
  let _buscadorUid = 0;
  EIA.abrirBuscador = async function (inicial) {
    if ($("#dlg-buscar")) return;
    const t = EIA.t, I = EIA.ui.icono, previo = document.activeElement, uid = ++_buscadorUid;
    let c10 = [];
    try { c10 = await EIA.universo(); } catch (e) { c10 = []; }
    const fuentes = [
      ...c10.map(a => ({ tipo: "activos", icono: "activo", texto: a.ticker + " · " + a.nombre, extra: EIA.nombre("sector", a.sector), href: "activo.html?t=" + encodeURIComponent(a.ticker),
        claves: [a.ticker, a.nombre, EIA.nombre("sector", a.sector), EIA.nombre("grupo", a.grupo)] })),
      ...PAGINAS_NAV.map(p => ({ tipo: "paginas", icono: p[3], texto: t(p[1]), extra: t("nav.bloque_" + p[5]), href: p[0], claves: [t(p[1]), p[2], t("nav.bloque_" + p[5])] })),
      ...ACCIONES_BUSCADOR().map(a => ({ tipo: "acciones", icono: a[2], texto: t(a[1]), extra: "", hacer: a[3], claves: [t(a[1]), a[0]] }))
    ];
    const d = document.createElement("dialog");
    d.id = "dlg-buscar"; d.className = "dlg dlg-buscar"; d.setAttribute("aria-labelledby", "buscar-tit");
    d.innerHTML = `<h2 id="buscar-tit" class="sr">${esc(t("shell.buscar_titulo"))}</h2>
<div class="buscar-cab">${I("buscar")}<input id="buscar-q" type="text" role="combobox" aria-expanded="false" aria-controls="buscar-lista" aria-autocomplete="list" aria-describedby="buscar-ayuda"
  autocomplete="off" spellcheck="false" aria-label="${esc(t("shell.buscar_titulo"))}" placeholder="${esc(t("shell.buscar_marcador"))}"><kbd>Esc</kbd></div>
<div id="buscar-lista" role="listbox" aria-label="${esc(t("shell.buscar_titulo"))}"></div>
<p id="buscar-ayuda" class="buscar-pie mut">${esc(t("shell.buscar_ayuda"))}</p>`;
    document.body.appendChild(d);
    const q = $("#buscar-q", d), lista = $("#buscar-lista", d);
    let res = [], activo = -1;
    // Sin texto se ofrecen las páginas y las acciones (así el buscador también sirve de menú)
    const pintar = () => {
      res = q.value.trim() ? EIA.buscarEn(fuentes, q.value) : fuentes.filter(f => f.tipo !== "activos");
      activo = res.length ? 0 : -1;
      const grupos = ["activos", "paginas", "acciones"].map(g => [g, res.filter(r => r.tipo === g)]).filter(x => x[1].length);
      lista.innerHTML = !res.length ? `<p class="mut buscar-sin">${esc(t("shell.buscar_sin", { texto: q.value.trim() }))}</p>` : grupos.map(([g, l]) =>
        `<div role="group" aria-labelledby="bg-${uid}-${g}"><div class="buscar-grupo" id="bg-${uid}-${g}">${esc(t("shell.buscar_grupo_" + g))}</div>${l.map(r => {
          const i = res.indexOf(r);
          return `<div role="option" id="bo-${uid}-${i}" data-i="${i}" aria-selected="${i === activo}" class="buscar-op">${I(r.icono)}<span class="buscar-op-txt">${esc(r.texto)}</span>${r.extra ? `<span class="mut buscar-op-extra">${esc(r.extra)}</span>` : ""}</div>`;
        }).join("")}</div>`).join("");
      q.setAttribute("aria-expanded", String(res.length > 0));
      marcar();
    };
    const marcar = () => {
      lista.querySelectorAll('[role="option"]').forEach(o => o.setAttribute("aria-selected", String(Number(o.dataset.i) === activo)));
      if (activo >= 0) { q.setAttribute("aria-activedescendant", "bo-" + uid + "-" + activo); const o = $("#bo-" + uid + "-" + activo, d); if (o && o.scrollIntoView) o.scrollIntoView({ block: "nearest" }); }
      else q.removeAttribute("aria-activedescendant");
    };
    const cerrar = () => { if (d.open) d.close(); d.remove(); if (previo && previo.focus && document.contains(previo)) previo.focus(); };
    const elegir = i => {
      const r = res[i]; if (!r) return;
      cerrar();
      if (r.href) global.location.href = r.href; else if (r.hacer) r.hacer();
    };
    q.addEventListener("input", () => { pintar(); EIA.ui.anunciar(res.length ? t("shell.buscar_resultados", { n: res.length }) : t("shell.buscar_sin", { texto: q.value.trim() })); });
    q.addEventListener("keydown", e => {
      if (e.key === "ArrowDown" && res.length) { e.preventDefault(); activo = (activo + 1) % res.length; marcar(); }
      else if (e.key === "ArrowUp" && res.length) { e.preventDefault(); activo = (activo - 1 + res.length) % res.length; marcar(); }
      else if (e.key === "Home" && res.length && e.ctrlKey) { e.preventDefault(); activo = 0; marcar(); }
      else if (e.key === "End" && res.length && e.ctrlKey) { e.preventDefault(); activo = res.length - 1; marcar(); }
      else if (e.key === "Enter") { e.preventDefault(); elegir(activo); }
    });
    lista.addEventListener("click", e => { const o = e.target.closest('[role="option"]'); if (o) elegir(Number(o.dataset.i)); });
    d.addEventListener("cancel", e => { e.preventDefault(); cerrar(); });
    d.addEventListener("click", e => { if (e.target === d) cerrar(); }); // clic en el fondo
    q.value = inicial || "";
    pintar();
    d.showModal();
    q.focus();
  };

  /* ───────────── Recorrido guiado: no se abre solo (Modo profesor y pruebas); se ofrece una vez en el Dashboard ───────────── */
  const PASOS_TOUR = [
    ["#lateral .lat-nav, #btn-modulos", "tour_1"], ["#btn-buscar", "tour_2"], ["#ctl-modo", "tour_3"],
    [".ficha-ia, main h1", "tour_4"], ["#btn-a11y", "tour_5"], ["#btn-cuenta", "tour_6"]
  ];
  EIA.tour = {
    PASOS: PASOS_TOUR,
    activo: false,
    iniciar() {
      EIA.estado.set("eia_tour", "visto");
      const franja = $(".franja-tour"); if (franja) franja.remove();
      if (menuAbierto) alternarMenu(false);
      EIA.tour.activo = true;
      EIA.tour._previo = document.activeElement;
      EIA.tour.ir(0);
    },
    ir(i) {
      const t = EIA.t, total = PASOS_TOUR.length;
      $$(".tour-objetivo").forEach(n => n.classList.remove("tour-objetivo"));
      let caja = $("#tour");
      if (i < 0 || i >= total) return EIA.tour.terminar();
      // El primer selector visible del paso (la barra lateral fija o, en el celular, el botón ☰)
      // (el cajón cerrado del celular sigue en el DOM con visibility: hidden, así que no basta con offsetParent)
      const visible = n => n && n.offsetParent !== null && getComputedStyle(n).visibility !== "hidden";
      const obj = PASOS_TOUR[i][0].split(",").map(s => $(s.trim())).find(visible);
      if (!caja) {
        caja = document.createElement("div");
        caja.id = "tour"; caja.className = "tour"; caja.setAttribute("role", "dialog"); caja.setAttribute("aria-modal", "false"); caja.setAttribute("aria-labelledby", "tour-tit");
        document.body.appendChild(caja);
        caja.addEventListener("click", e => {
          const b = e.target.closest("button[data-tour]"); if (!b) return;
          const a = b.dataset.tour, n = Number(caja.dataset.paso);
          if (a === "sig") EIA.tour.ir(n + 1); else if (a === "ant") EIA.tour.ir(n - 1); else EIA.tour.terminar();
        });
        caja.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); EIA.tour.terminar(); } });
      }
      caja.dataset.paso = String(i);
      const k = PASOS_TOUR[i][1];
      caja.innerHTML = `<p class="tour-paso mut">${esc(t("shell.tour_paso", { n: EIA.fmt.ent(i + 1), total: EIA.fmt.ent(total) }))}</p>
<h2 id="tour-tit" tabindex="-1">${esc(t("shell." + k + "_t"))}</h2><p>${esc(t("shell." + k))}</p>
<div class="acciones"><button type="button" data-tour="fin" class="enlace">${esc(t("shell.tour_saltar"))}</button><span class="sp"></span>${
        i > 0 ? `<button type="button" data-tour="ant">${esc(t("shell.tour_anterior"))}</button>` : ""}<button type="button" data-tour="sig" class="primary">${esc(t(i === total - 1 ? "shell.tour_terminar" : "shell.tour_siguiente"))}</button></div>`;
      if (obj) {
        obj.classList.add("tour-objetivo");
        if (obj.scrollIntoView) obj.scrollIntoView({ block: "nearest", behavior: EIA.movimientoReducido() ? "auto" : "smooth" });
      }
      EIA.tour._ubicar(caja, obj);
      $("#tour-tit", caja).focus();
    },
    /** Globo junto al elemento: debajo si cabe, si no encima; si el elemento es muy alto (la barra lateral), a su lado.
        Alineado al inicio (derecha en RTL) y siempre dentro de la ventana. */
    _ubicar(caja, obj) {
      const vw = document.documentElement.clientWidth, vh = global.innerHeight, ancho = Math.min(360, vw - 24);
      caja.style.width = ancho + "px";
      const r = obj ? obj.getBoundingClientRect() : { top: 80, bottom: 80, left: 12, right: 12 + ancho };
      const alto = caja.offsetHeight || 200, rtl = document.documentElement.dir === "rtl";
      const dentro = (v, max) => Math.min(Math.max(12, v), max);
      let top, left;
      if (r.bottom + 12 + alto < vh) { top = r.bottom + 12; left = rtl ? r.right - ancho : r.left; }
      else if (r.top - 12 - alto > 0) { top = r.top - 12 - alto; left = rtl ? r.right - ancho : r.left; }
      else {
        // Ni debajo ni encima: al costado que mira al contenido (derecha en LTR, izquierda en RTL) si cabe
        const lado = rtl ? r.left - 12 - ancho : r.right + 12;
        left = lado >= 12 && lado + ancho <= vw - 12 ? lado : (rtl ? r.right - ancho : r.left);
        top = r.top;
      }
      caja.style.top = Math.round(dentro(top, vh - alto - 12)) + "px"; caja.style.left = Math.round(dentro(left, vw - ancho - 12)) + "px";
    },
    terminar() {
      $$(".tour-objetivo").forEach(n => n.classList.remove("tour-objetivo"));
      const caja = $("#tour"); if (caja) caja.remove();
      EIA.tour.activo = false;
      // El foco vuelve a donde estaba; si era el cuerpo (o ya no existe), al contenido principal
      const p = EIA.tour._previo, m = $("main");
      if (p && p !== document.body && p.focus && document.contains(p)) p.focus(); else if (m) m.focus();
      EIA.ui.anunciar(EIA.t("shell.tour_fin"));
    }
  };
  /** Franja «¿Primera vez?» en el Dashboard mientras no se haya hecho ni descartado el recorrido. */
  function ofrecerTour() {
    if (document.body.dataset.page !== "dashboard" || EIA.estado.get("eia_tour") || $(".franja-tour")) return;
    const t = EIA.t, cinta = $("#cinta");
    const f = document.createElement("div");
    f.className = "franja-tour"; f.setAttribute("role", "note");
    f.innerHTML = `${EIA.ui.icono("ayuda")}<span>${esc(t("shell.tour_franja"))}</span><button type="button" class="primary" data-franja="si">${esc(t("shell.tour_iniciar"))}</button><button type="button" data-franja="no">${esc(t("shell.tour_descartar"))}</button>`;
    f.addEventListener("click", e => {
      const b = e.target.closest("button[data-franja]"); if (!b) return;
      if (b.dataset.franja === "si") EIA.tour.iniciar(); else { EIA.estado.set("eia_tour", "descartado"); f.remove(); const m = $("main"); if (m) m.focus(); }
    });
    if (cinta) cinta.after(f); else { const cab = $("header.top"); if (cab) cab.after(f); }
  }
  /** Iniciales del alias del Perfil para el avatar («Ana María» → «AM»); vacío si no hay alias. Pura. */
  EIA.iniciales = alias => String(alias || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => Array.from(p)[0].toUpperCase()).join("");
  /** Repinta los textos del shell (idioma, modo, fecha de corte) conservando el foco. */
  function pintarShell() {
    const cab = $("header.top"), lat = $("#lateral"), pie = $("footer.pie");
    if (!cab || !pie) return;
    const act = document.activeElement, zona = [cab, lat].find(z => z && z.contains(act));
    const selectorFoco = zona ? (act.id ? "#" + act.id : act.dataset.modo ? `[data-modo="${act.dataset.modo}"]`
      : act.getAttribute("href") ? `a[href="${act.getAttribute("href")}"]` : null) : null;
    cab.innerHTML = plantillaCabecera();
    if (lat) { lat.innerHTML = plantillaLateral(); lat.setAttribute("aria-label", EIA.t("nav.etiqueta")); }
    pie.innerHTML = plantillaPie();
    const salto = $("a.skip"); if (salto) salto.textContent = EIA.t("comun.saltar");
    pintarMigas();
    pintarMercado();
    if (selectorFoco) { const n = $(selectorFoco, zona); if (n) n.focus(); }
  }
  /** Página del sitio por id, en la barra lateral o en la lista de la base. */
  const paginaPorId = id => PAGINAS_NAV.find(x => x[2] === id) || PAGES.find(x => x[2] === id);
  /* ───────────── Migas de pan (R-INT-05; PLAN_MAESTRO §4: «Clasificación › NVDA › Regresión») ─────────────
     Solo aparecen al llegar por un enlace cruzado: la URL trae contexto (?t= o ?nivel=) y la página anterior es otro
     módulo. No se agregan parámetros a la URL: el recorrido se deduce de document.referrer y se guarda en
     sessionStorage para encadenar (Clasificación › Regresión › Optimizador) y para conservarlo al recargar. */
  const CLAVE_MIGAS = "eia_migas";
  let _migas = { ruta: [], contexto: null };
  /** Pura: id del módulo de una ruta («/x/regresion.html» → «regresion»; «/x/» → «dashboard»). null si no es un módulo. */
  EIA.paginaDeRuta = function (ruta) {
    const archivo = String(ruta || "").split(/[?#]/)[0].split("/").pop() || "index.html";
    const p = PAGINAS_NAV.find(x => x[0] === archivo) || PAGES.find(x => x[0] === archivo);
    return p ? p[2] : null;
  };
  /** Pura: recorrido de migas [{pagina, href}] hasta la página actual (sin incluirla); [] si no corresponde mostrarlas.
      e = {pagina, contexto: "t" | "nivel" | null, anterior: {pagina, href} | null, guardado: {pagina, contexto, ruta} | null}
      Solo se encadena con un recorrido del mismo tipo de contexto: «Portafolios › Agresivo» no sigue en una página de un activo. */
  EIA.calcularMigas = function (e) {
    if (!e.contexto) return [];
    const mismo = !!e.guardado && e.guardado.contexto === e.contexto;
    // Recarga (o vuelta a la misma página): se conserva el recorrido guardado
    if (mismo && e.guardado.pagina === e.pagina) return e.guardado.ruta.slice();
    if (!e.anterior || !e.anterior.pagina || e.anterior.pagina === e.pagina) return [];
    const base = mismo && e.guardado.pagina === e.anterior.pagina ? e.guardado.ruta : [];
    let ruta = base.concat([{ pagina: e.anterior.pagina, href: e.anterior.href }]);
    // Volver a una página que ya estaba en el recorrido lo recorta (sin ciclos)
    const i = ruta.findIndex(x => x.pagina === e.pagina);
    if (i >= 0) ruta = ruta.slice(0, i);
    return ruta;
  };
  function leerSesion(k) { try { return JSON.parse(global.sessionStorage.getItem(k)); } catch (x) { return null; } }
  function guardarSesion(k, v) { try { global.sessionStorage.setItem(k, JSON.stringify(v)); } catch (x) { /* sin almacenamiento: no hay migas al recargar */ } }
  /** Calcula el recorrido una sola vez al cargar la página. */
  function prepararMigas() {
    const pagina = document.body.dataset.page, p = parametros();
    const contexto = p.get("t") ? { t: p.get("t") } : p.get("nivel") ? { nivel: p.get("nivel") } : null;
    let anterior = null;
    try {
      const r = document.referrer ? new URL(document.referrer) : null;
      if (r && r.origin === global.location.origin) {
        const id = EIA.paginaDeRuta(r.pathname);
        if (id) anterior = { pagina: id, href: paginaPorId(id)[0] + r.search };
      }
    } catch (x) { anterior = null; }
    const tipo = contexto ? Object.keys(contexto)[0] : null;
    const ruta = EIA.calcularMigas({ pagina, contexto: tipo, anterior, guardado: leerSesion(CLAVE_MIGAS) });
    _migas = { ruta, contexto };
    guardarSesion(CLAVE_MIGAS, { pagina, contexto: tipo, ruta });
  }
  /** Pinta (o repinta al cambiar de idioma o de activo) las migas al inicio de <main>. */
  function pintarMigas() {
    const main = $("main"); if (!main) return;
    let nav = $("nav.migas", main);
    if (!_migas.ruta.length) { if (nav) nav.remove(); return; }
    const t = EIA.t, nombre = id => t(paginaPorId(id)[1]);
    const ticker = _migas.contexto.t ? EIA.activo() || _migas.contexto.t : null;
    // Los enlaces de vuelta llevan el activo que se mira ahora (si se cambió en esta página)
    const href = h => {
      if (!ticker) return h;
      const u = new URL(h, global.location.href);
      if (u.searchParams.has("t")) u.searchParams.set("t", ticker);
      return u.pathname.split("/").pop() + u.search;
    };
    const ctx = ticker || EIA.nombre("nivel", _migas.contexto.nivel);
    const items = _migas.ruta.map((x, i) => `<li><a href="${esc(href(x.href))}">${esc(nombre(x.pagina))}</a></li>` +
      (i === 0 ? `<li class="migas-contexto">${esc(ctx)}</li>` : ""));
    items.push(`<li><span aria-current="page">${esc(nombre(document.body.dataset.page))}</span></li>`);
    if (!nav) { nav = document.createElement("nav"); nav.className = "migas"; main.insertBefore(nav, main.firstChild); }
    nav.setAttribute("aria-label", t("nav.migas"));
    nav.innerHTML = "<ol>" + items.join("") + "</ol>";
  }
  /** Abre o cierra el cajón de navegación (pantallas angostas). Al abrir, el foco pasa a la página actual. */
  function alternarMenu(abrir, devolverFoco) {
    menuAbierto = abrir === undefined ? !menuAbierto : abrir;
    const b = $("#btn-modulos"), lat = $("#lateral"), fondo = $(".lat-fondo");
    if (b) b.setAttribute("aria-expanded", String(menuAbierto));
    if (lat) lat.classList.toggle("abierto", menuAbierto);
    if (fondo) fondo.hidden = !menuAbierto;
    document.documentElement.classList.toggle("cajon-abierto", menuAbierto && esCajon());
    if (menuAbierto && lat && esCajon()) { const a = $('a[aria-current="page"]', lat) || $("a", lat); if (a) a.focus(); }
    if (!menuAbierto && devolverFoco && b) b.focus();
  }
  /** Menú de la cuenta (patrón de divulgación: botón con aria-expanded y una lista de enlaces). */
  function alternarCuenta(abrir, devolverFoco) {
    cuentaAbierta = abrir === undefined ? !cuentaAbierta : abrir;
    if (cuentaAbierta && notifAbierta) alternarNotif(false);
    const b = $("#btn-cuenta"), m = $("#menu-cuenta");
    if (b) b.setAttribute("aria-expanded", String(cuentaAbierta));
    if (m) m.hidden = !cuentaAbierta;
    if (cuentaAbierta && m) { const a = $("a,button", m); if (a) a.focus(); }
    if (!cuentaAbierta && devolverFoco && b) b.focus();
  }
  /** Barra lateral completa o en riel de iconos (solo escritorio; se recuerda en eia_lateral). */
  function aplicarLateral() {
    if (plegado()) document.documentElement.setAttribute("data-lateral", "plegado");
    else document.documentElement.removeAttribute("data-lateral");
  }
  function alternarPlegado() {
    EIA.estado.set("eia_lateral", plegado() ? null : "plegado");
    aplicarLateral();
    const b = $("#btn-plegar"); if (b) b.setAttribute("aria-pressed", String(plegado()));
  }
  /** Construye la estructura fija de la página (una sola vez). Conserva el nombre de la base. */
  function buildShell() {
    applyTheme(EIA.estado.get("eia_theme"));
    EIA.aplicarPreferencias();
    if ($("header.top")) return;
    aplicarLateral();
    document.body.classList.add("con-lateral");
    document.body.insertAdjacentHTML("afterbegin", '<a class="skip" href="#contenido"></a><nav class="lateral" id="lateral"></nav><div class="lat-fondo" hidden></div><header class="top"></header><div id="cinta" class="cinta" role="region" hidden></div>');
    const main = $("main");
    if (main) { main.id = "contenido"; main.setAttribute("tabindex", "-1"); }
    prepararMigas();
    EIA.on("eia:estado", d => { if (d.clave === "eia_activo" && _listo) pintarMigas(); });
    document.body.insertAdjacentHTML("beforeend",
      '<footer class="pie"></footer><div id="eia-vivo" class="sr" aria-live="polite" aria-atomic="true"></div>' +
      '<div id="eia-alerta" class="sr" role="alert"></div><div id="eia-notas" aria-live="polite"></div>');
    const cab = $("header.top"), lat = $("#lateral");
    cab.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.modo) EIA.setModo(b.dataset.modo);
      else if (b.id === "tema") EIA.setTema(EIA.tema() === "dark" ? "light" : "dark");
      else if (b.id === "btn-modulos") alternarMenu();
      else if (b.id === "btn-a11y") EIA.abrirAccesibilidad();
      else if (b.id === "btn-cuenta") alternarCuenta();
      else if (b.id === "btn-notif") alternarNotif();
      else if (b.id === "btn-buscar") EIA.abrirBuscador();
      else if (b.id === "menu-tour") { alternarCuenta(false); EIA.tour.iniciar(); }
      else if (b.id === "notif-leidas") { EIA.notificaciones.marcarLeidas(); const x = $("#btn-notif"); if (x) x.focus(); }
    });
    $("#cinta").addEventListener("click", e => {
      if (!e.target.closest("#cinta-pausa")) return;
      EIA.estado.set("eia_cinta", EIA.estado.get("eia_cinta") === "pausada" ? null : "pausada");
      pintarCinta().then(() => { const x = $("#cinta-pausa"); if (x) x.focus(); });
    });
    global.setInterval(pintarMercado, 60000);
    cab.addEventListener("change", e => { if (e.target.id === "ctl-idioma") EIA.setIdioma(e.target.value); });
    lat.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (b && b.id === "btn-plegar") alternarPlegado();
      else if (b && b.id === "btn-cerrar-menu") alternarMenu(false, true);
    });
    $(".lat-fondo").addEventListener("click", () => alternarMenu(false, true));
    // El menú de la cuenta se cierra al hacer clic fuera o al salir con el foco
    document.addEventListener("click", e => {
      if (cuentaAbierta && !e.target.closest(".cuenta")) alternarCuenta(false);
      if (notifAbierta && !e.target.closest(".notif")) alternarNotif(false);
    });
    cab.addEventListener("focusout", e => { if (cuentaAbierta && !(e.relatedTarget && e.relatedTarget.closest(".cuenta")) && e.relatedTarget) alternarCuenta(false); });
    // Al pasar a escritorio, el cajón deja de ser un cajón
    if (global.matchMedia) {
      const mq = global.matchMedia(MEDIA_CAJON);
      const alCambiar = q => { if (!q.matches && menuAbierto) alternarMenu(false); };
      if (mq.addEventListener) mq.addEventListener("change", alCambiar);
    }
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && cuentaAbierta) { alternarCuenta(false, true); return; }
      if (e.key === "Escape" && notifAbierta) { alternarNotif(false, true); return; }
      if (e.key === "Escape" && menuAbierto) alternarMenu(false, true);
      // Foco atrapado en el cajón abierto (pantallas angostas)
      if (e.key === "Tab" && menuAbierto && esCajon()) {
        const f = $$("a[href],button:not([disabled])", lat).filter(el => el.offsetParent !== null);
        if (f.length && e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (f.length && !e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        else if (f.length && !lat.contains(document.activeElement)) { e.preventDefault(); f[0].focus(); }
      }
      // Atajo con modificadores para no chocar con los lectores de pantalla (WCAG 2.1.4)
      if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === "KeyA") { e.preventDefault(); EIA.abrirAccesibilidad(); }
      // Buscador: Ctrl+K (⌘K) en cualquier lugar; «/» si no se está escribiendo en un campo
      const escribiendo = e.target && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if (((e.ctrlKey || e.metaKey) && !e.altKey && e.code === "KeyK") || (e.key === "/" && !escribiendo && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        if (!document.querySelector("dialog[open]")) { e.preventDefault(); EIA.abrirBuscador(); }
      }
      // Alt+Shift+V: activar o detener los comandos de voz (T-90)
      if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === "KeyV") { e.preventDefault(); EIA.cargar("js/a11y/voz.js").then(() => EIA.voz.alternar()).catch(() => {}); }
    });
    // Otra pestaña cambió el estado: se reenvía como evento
    global.addEventListener("storage", e => {
      if (!e.key || e.key.indexOf("eia_") !== 0) return;
      let valor = null; try { valor = e.newValue == null ? null : JSON.parse(e.newValue); } catch (x) { valor = null; }
      EIA.emit("eia:estado", { clave: e.key, valor, externa: true });
    });
  }

  /* ───────────── Componentes comunes ───────────── */

  /* Un componente se puede volver a montar sobre el mismo nodo (cambio de idioma, de modo o de filtro).
     Cada montaje cancela los oyentes del anterior para que no se acumulen. */
  const montajes = new WeakMap();
  function montar(destino) {
    const previo = montajes.get(destino);
    if (previo) { previo.control.abort(); if (previo.alDesmontar) previo.alDesmontar(); }
    const m = { control: new AbortController(), alDesmontar: null };
    montajes.set(destino, m);
    return m;
  }

  /** Anuncia un texto a los lectores de pantalla (región viva). */
  EIA.ui.anunciar = function (texto, op) {
    const el = $(op && op.urgente ? "#eia-alerta" : "#eia-vivo");
    if (!el) return;
    el.textContent = "";
    setTimeout(() => { el.textContent = texto; }, 40);
  };
  /** Notificación breve y visible (role="status"). tipo: "info" | "ok" | "error". */
  EIA.ui.notificar = function (texto, tipo, enlace) {
    const caja = $("#eia-notas"); if (!caja) return;
    const n = document.createElement("div");
    n.className = "nota nota-" + (tipo || "info"); n.setAttribute("role", "status"); n.textContent = texto;
    // Con enlace (p. ej. «Ver el historial completo») la nota dura más, para que dé tiempo de usarlo (WCAG 2.2.1)
    if (enlace && enlace.href) { const a = document.createElement("a"); a.href = enlace.href; a.textContent = enlace.texto; a.className = "nota-enlace"; n.appendChild(document.createTextNode(" ")); n.appendChild(a); }
    caja.appendChild(n);
    setTimeout(() => n.remove(), enlace ? 12000 : 6000);
  };

  /** Aviso de simulación o de datos reales del módulo, según el modo (R-INT-08). Se inserta tras el título. */
  EIA.ui.aviso = function (modulo) {
    const main = $("main"); if (!main) return null;
    let el = $(":scope > .aviso", main);
    if (!el) {
      el = document.createElement("p"); el.className = "aviso"; el.setAttribute("role", "note");
      const h1 = $("h1", main);
      const ref = h1 && h1.nextElementSibling && h1.nextElementSibling.classList.contains("sub") ? h1.nextElementSibling : h1;
      if (ref) ref.after(el); else main.prepend(el);
    }
    el.dataset.aviso = modulo;
    const modo = EIA.modo(), mt = metaLista[modo] || {};
    const fecha = mt.fecha_corte ? EIA.fmt.fecha(mt.fecha_corte, "larga") : "";
    let clave = "aviso." + modo + "." + modulo;
    if (modo === "real" && !mt.disponible) clave = "aviso.real.sin_datos";
    else if (modo === "real" && _parcial) clave = "aviso.real.parcial"; // no se afirma que haya modelos reales
    else if (!EIA.hayTexto(clave)) clave = "aviso." + modo + ".generico";
    // Corte antiguo en un módulo que depende de él: el aviso dice de qué fecha son los modelos (auditoría P08, H-01)
    const corte = modo === "real" && mt.disponible && !_parcial && MODULOS_CON_CORTE.includes(modulo) ? EIA.corte() : null;
    const notaCorte = corte ? `<span class="aviso-extra">${esc(EIA.t("aviso.real.corte_historico", { corte: EIA.fmt.fecha(corte, "larga") }))}</span>` : "";
    const vencido = modo === "real" && mt.vencido ? `<span class="aviso-extra">${esc(EIA.t("aviso.real.vencido", { n: mt.antiguedad_habiles }))}</span>` : "";
    el.innerHTML = `<span class="aviso-ico" aria-hidden="true">⚠</span><span>${esc(EIA.t(clave, { fecha }))} ${notaCorte}${vencido}</span>`;
    return el;
  };

  /** Estado de error del módulo. Con datos reales ausentes ofrece volver al Modo profesor (no cambia solo). */
  EIA.ui.error = function (e) {
    const main = $("main"); if (!main) return;
    $$(".estado-error", main).forEach(n => n.remove());
    const t = EIA.t, sinReales = e && e.codigo === "sin-datos-reales", I = EIA.ui.icono;
    const caja = document.createElement("div");
    caja.className = "estado-error card"; caja.setAttribute("role", "alert");
    if (sinReales) {
      // Publicación parcial: hay meta.json pero no el archivo de este módulo. Los avisos dejan de hablar de modelos reales.
      if (EIA.modo() === "real" && (metaLista.real || {}).disponible && !_parcial) {
        _parcial = true;
        const av = $(":scope > .aviso", main); if (av) EIA.ui.aviso(av.dataset.aviso);
        const pie = $("footer.pie"); if (pie) pie.innerHTML = plantillaPie();
      }
      caja.innerHTML = `<h2>${I("alerta", "estado-ico")}${esc(t("error.sin_reales_titulo"))}</h2><p>${esc(t("error.sin_reales_texto", { archivo: e.archivo }))}</p><div class="acciones"><button type="button" class="primary" data-volver>${esc(t("error.volver_profesor"))}</button></div>`;
      $("[data-volver]", caja).addEventListener("click", () => EIA.setModo("profesor"));
    } else {
      const msj = e && e.codigo === "http" ? t("error.http", { archivo: e.archivo, estado: e.estado })
        : e && e.codigo === "json" ? t("error.json", { archivo: e.archivo }) : String((e && e.message) || e);
      caja.innerHTML = `<h2>${I("alerta", "estado-ico")}${esc(t("error.titulo"))}</h2><p>${esc(msj)}</p><p class="mut">${esc(t("error.servidor"))}</p>
<div class="acciones"><button type="button" class="primary" data-reintentar>${I("reintentar")}${esc(t("comun.reintentar"))}</button>${
        EIA.modo() === "real" ? `<button type="button" data-volver>${esc(t("error.volver_profesor"))}</button>` : ""}</div>`;
      $("[data-reintentar]", caja).addEventListener("click", () => (_modulo ? correr(true) : global.location.reload()));
      const v = $("[data-volver]", caja); if (v) v.addEventListener("click", () => EIA.setModo("profesor"));
      if (global.console) console.error(e);
    }
    const ref = $(":scope > .aviso", main) || $("h1", main);
    if (ref) ref.after(caja); else main.prepend(caja);
    main.classList.add("sin-datos");
  };
  /** Compatibilidad con la base. */
  const showError = e => EIA.ui.error(e);

  /** Estado vacío con icono, título, texto y una llamada a la acción (Spec W13 G.9: estados). Devuelve HTML.
      c = {icono, titulo, texto, accion: {texto, href} | {texto, id}} con textos ya traducidos. */
  EIA.ui.vacio = function (c) {
    const a = c.accion;
    const boton = !a ? "" : a.href ? `<a class="btn primary" href="${esc(a.href)}">${esc(a.texto)}</a>` : `<button type="button" class="primary"${a.id ? ` id="${esc(a.id)}"` : ""}>${esc(a.texto)}</button>`;
    return `<div class="vacio">${EIA.ui.icono(c.icono || "vacio", "vacio-ico")}<p class="vacio-titulo">${esc(c.titulo)}</p>${c.texto ? `<p class="mut">${esc(c.texto)}</p>` : ""}${boton}</div>`;
  };
  /** Confirmación antes de una acción (orden simulada, borrar datos): resuelve true si se acepta.
      cfg = {titulo, contenido (HTML escapado o nodo), aceptar, cancelar} */
  EIA.ui.confirmar = function (cfg) {
    return new Promise(ok => {
      const d = EIA.ui.dialogo({ titulo: cfg.titulo, contenido: cfg.contenido,
        acciones: [{ texto: cfg.cancelar || EIA.t("comun.cancelar"), valor: "no" }, { texto: cfg.aceptar, valor: "si", primario: true }],
        alCerrar: v => ok(v === "si") });
      d.abrir();
    });
  };
  /** Esqueleto de carga con la forma de la página (main[data-esqueleto] = "kpis,grafico,tabla"). Decorativo. */
  const FORMAS_ESQUELETO = {
    kpis: '<div class="esq-fila">' + '<div class="esq esq-kpi"></div>'.repeat(3) + "</div>",
    grafico: '<div class="esq esq-grafico"></div>',
    tabla: '<div class="esq-tabla">' + '<div class="esq esq-linea"></div>'.repeat(6) + "</div>",
    texto: '<div class="esq-tabla">' + '<div class="esq esq-linea"></div>'.repeat(3) + "</div>"
  };
  EIA.ui.esqueleto = formas => `<div class="esqueleto-pagina" aria-hidden="true">${String(formas || "kpis,grafico,tabla").split(",").map(f => FORMAS_ESQUELETO[f.trim()] || "").join("")}</div>`;
  function mostrarEsqueleto(main) {
    if ($(":scope > .esqueleto-pagina", main)) return;
    const ref = $(":scope > .aviso", main) || $(":scope > .sub", main) || $("h1", main);
    const tmp = document.createElement("div"); tmp.innerHTML = EIA.ui.esqueleto(main.dataset.esqueleto);
    if (ref) ref.after(tmp.firstChild); else main.prepend(tmp.firstChild);
    main.classList.add("cargando");
    EIA.ui.anunciar(EIA.t("comun.cargando"));
  }
  function quitarEsqueleto(main) {
    $$(":scope > .esqueleto-pagina", main).forEach(n => n.remove());
    main.classList.remove("cargando");
  }

  /** Ficha de la IA (Amershi G1, G2, G11, G17, G10). filas = {que_hace, que_tan_bien, por_que, controlas, ignorar} ya traducidas. */
  EIA.ui.fichaIA = function (destino, filas) {
    const t = EIA.t, abierta = EIA.estado.get("eia_ficha") !== false;
    const pautas = [["G1", "que_hace"], ["G2", "que_tan_bien"], ["G11", "por_que"], ["G17", "controlas"], ["G10", "ignorar"]];
    destino.innerHTML = `<details class="ficha-ia"${abierta ? " open" : ""}><summary><span aria-hidden="true">ⓘ</span> ${esc(t("ficha.titulo"))}</summary><dl>${
      pautas.map(([g, k]) => `<div><dt><span class="pauta">${g}</span> ${esc(t("ficha." + k))}</dt><dd>${esc(filas[k])}</dd></div>`).join("")}</dl></details>`;
    $("details", destino).addEventListener("toggle", ev => EIA.estado.set("eia_ficha", ev.target.open));
  };

  /** Selector de fecha de corte de los modelos (solo Modo real y con más de un corte).
      caja: contenedor (oculto por defecto) que tiene un <label> y un <select>. Al cambiar, emite "eia:corte". */
  EIA.ui.selectorCorte = async function (caja) {
    const m = montar(caja);
    caja.hidden = true;
    if (EIA.modo() !== "real") return;
    const cortes = await EIA.cortes();
    if (cortes.length < 2) return;
    const sel = $("select", caja), actual = EIA.corte() || cortes[0];
    sel.innerHTML = cortes.map((c, i) => `<option value="${esc(c)}"${c === actual ? " selected" : ""}>${esc(i === 0 ? EIA.t("comun.corte_ultimo", { fecha: EIA.fmt.fecha(c) }) : EIA.fmt.fecha(c))}</option>`).join("");
    sel.addEventListener("change", () => EIA.setCorte(sel.value === cortes[0] ? null : sel.value), { signal: m.control.signal });
    caja.hidden = false;
  };

  /** Recálculo en el navegador (D-03; solo Modo real): selector, botón, progreso, Cancelar y «Volver a los datos del archivo».
      En el Modo profesor solo explica que no se recalcula y deja #recalcular deshabilitado (R-OPT-08). Se monta sobre la
      sección: conserva su <h2> y reemplaza lo demás. cfg = {modulo (prefijo i18n), opciones:[[valor, texto]], valor,
      activo (texto del resultado vigente o null), calcular(valor) → Promise<{worker, params}>, alResultado(datos, valor), alVolver()} */
  EIA.ui.recalculo = function (seccion, cfg) {
    const m = montar(seccion), t = EIA.t, k = cfg.modulo, h2 = $("h2", seccion);
    Array.from(seccion.childNodes).forEach(n => { if (n !== h2) n.remove(); });
    const cuerpo = document.createElement("div");
    seccion.appendChild(cuerpo);
    if (EIA.modo() !== "real") {
      cuerpo.innerHTML = `<p>${esc(t(k + ".recalculo_profesor"))}</p><button type="button" id="recalcular" disabled>${esc(t(k + ".recalcular"))}</button>`;
      return;
    }
    cuerpo.innerHTML = `<p>${esc(t(k + ".recalculo_real"))}</p>
<div class="control-recalculo"><label for="recalculo-opcion">${esc(t(k + ".recalculo_opcion"))}</label>
<select id="recalculo-opcion">${cfg.opciones.map(([v, txt]) => `<option value="${esc(v)}"${v === cfg.valor ? " selected" : ""}>${esc(txt)}</option>`).join("")}</select></div>
<p class="acciones"><button type="button" id="recalcular" class="primary">${esc(t(k + ".recalcular"))}</button><button type="button" id="recalculo-cancelar" hidden>${esc(t("comun.cancelar"))}</button></p>
<div id="recalculo-progreso"></div>${cfg.activo ? `
<p class="recalculado" role="status"><span><strong>${esc(t("comun.recalculado"))}</strong> ${esc(cfg.activo)}</span> <button type="button" id="recalculo-volver">${esc(t("comun.volver_archivo"))}</button></p>` : ""}`;
    let tarea = null;
    const boton = $("#recalcular", cuerpo), cancelar = $("#recalculo-cancelar", cuerpo);
    if (!cfg.opciones.length) { boton.disabled = true; $("p", cuerpo).textContent = t("comun.recalculo_sin_cierres"); }
    seccion.addEventListener("click", async e => {
      const b = e.target.closest("button"); if (!b || !cuerpo.contains(b)) return;
      if (b.id === "recalculo-cancelar") { if (tarea) tarea.cancelar(); return; }
      if (b.id === "recalculo-volver") { cfg.alVolver(); EIA.ui.anunciar(t("comun.volviste_archivo")); return; }
      if (b.id !== "recalcular" || tarea) return;
      const valor = $("#recalculo-opcion", cuerpo).value;
      boton.disabled = true; cancelar.hidden = false;
      const prog = EIA.ui.progreso($("#recalculo-progreso", cuerpo), { etiqueta: t("comun.recalculando") });
      EIA.ui.anunciar(t("comun.recalculando"));
      try {
        const encargo = await cfg.calcular(valor);
        tarea = EIA.trabajo(encargo.worker, encargo.params, { alProgresar: p => prog.set(p) });
        const datos = await tarea.promesa;
        tarea = null; prog.fin();
        cfg.alResultado(datos, valor); // repinta el módulo (y esta sección) con el resultado
        EIA.ui.anunciar(t("comun.recalculo_listo"));
      } catch (err) {
        tarea = null; prog.fin(); boton.disabled = false; cancelar.hidden = true;
        if (err && err.cancelado) EIA.ui.anunciar(t("comun.recalculo_cancelado"));
        else EIA.ui.notificar(t("comun.recalculo_error", { error: String((err && err.message) || err) }), "error");
      }
    }, { signal: m.control.signal });
    m.alDesmontar = () => { if (tarea) tarea.cancelar(); };
  };

  /** Control segmentado: botones con aria-pressed. opciones = [[valor, texto], …]. */
  EIA.ui.segmentado = function (destino, cfg) {
    let valor = cfg.valor;
    const pintar = () => {
      destino.innerHTML = `<div class="seg" role="group" aria-label="${esc(cfg.etiqueta)}">${
        cfg.opciones.map(([v, txt]) => `<button type="button" data-valor="${esc(v)}" aria-pressed="${v === valor}">${esc(txt)}</button>`).join("")}</div>`;
    };
    pintar();
    destino.addEventListener("click", e => {
      const b = e.target.closest("button[data-valor]");
      if (!b || !destino.contains(b) || b.dataset.valor === valor) return;
      valor = b.dataset.valor;
      $$("button[data-valor]", destino).forEach(x => x.setAttribute("aria-pressed", String(x.dataset.valor === valor)));
      if (cfg.alCambiar) cfg.alCambiar(valor);
    }, { signal: montar(destino).control.signal });
    return { valor: () => valor, set(v) { valor = v; pintar(); } };
  };

  /** Chip de señal binaria: color + símbolo + palabra. Rechaza cualquier valor que no sea SUBE o BAJA. */
  EIA.ui.chipSenal = function (senal, prob) {
    if (!EIA.SENALES.includes(senal)) throw new Error("Señal no binaria en los datos: " + senal);
    const sube = senal === "SUBE";
    return `<span class="chip ${sube ? "chip-up" : "chip-dn"}" data-senal="${senal}"><span aria-hidden="true">${sube ? "▲" : "▼"}</span> ${esc(EIA.nombre("senal", senal))}${
      prob == null ? "" : ` <span class="chip-prob">${esc(EIA.fmt.prob(prob))}</span>`}</span>`;
  };
  /** Chip de confianza: icono + texto (alta ●●●, media ●●○, baja ●○○). */
  EIA.ui.chipConfianza = function (nivel) {
    const ico = { alta: "●●●", media: "●●○", baja: "●○○" }[nivel] || "○○○";
    return `<span class="chip chip-conf" data-confianza="${esc(nivel)}"><span aria-hidden="true">${ico}</span> ${esc(EIA.t("comun.confianza", { nivel: EIA.nombre("confianza", nivel) }))}</span>`;
  };
  /** Variación porcentual con signo, flecha y color. */
  EIA.ui.variacion = function (pct, d) {
    const c = fmt.cls(pct);
    return `<span class="${c} var"><span aria-hidden="true">${pct > 0 ? "▲" : (pct < 0 ? "▼" : "•")}</span> ${esc(EIA.fmt.pct(pct, d == null ? 2 : d))}</span>`;
  };

  /** Tabla accesible y ordenable con teclado.
      cfg = {id, titulo, columnas:[{clave, titulo, tipo:"num"|"texto", ordenable, valor?(fila), fmt?(valor, fila) → HTML ya escapado, clase}],
             filas, claveFila(fila), orden:{clave, dir}, alElegir(fila), elegida, claseFila(fila) → clase CSS opcional de la fila} */
  EIA.ui.tabla = function (destino, cfg) {
    let filas = cfg.filas || [], orden = cfg.orden ? Object.assign({}, cfg.orden) : null, elegida = cfg.elegida;
    const cols = cfg.columnas, id = cfg.id || "tabla-" + (++_uid);
    const alineada = c => (c.tipo === "num" ? "" : ' class="l"');
    destino.innerHTML = `<div class="tw" role="region" tabindex="0" aria-label="${esc(cfg.titulo)}"><table id="${esc(id)}"><caption>${esc(cfg.titulo)}</caption><thead><tr>${
      cols.map(c => `<th scope="col" data-col="${esc(c.clave)}"${alineada(c)}>${c.ordenable
        ? `<button type="button" class="orden" data-ordenar="${esc(c.clave)}"><span>${esc(c.titulo)}</span> <span class="orden-ico" aria-hidden="true">↕</span></button>`
        : esc(c.titulo)}</th>`).join("")}</tr></thead><tbody></tbody></table></div>`;
    const tabla = $("table", destino), cuerpo = $("tbody", destino);
    const clave = f => (cfg.claveFila ? String(cfg.claveFila(f)) : "");
    function pintarCuerpo() {
      const col = orden && cols.find(c => c.clave === orden.clave);
      const vis = col ? EIA.ordenarFilas(filas, col, orden.dir) : filas;
      cuerpo.innerHTML = vis.map(f => {
        const k = clave(f);
        const clases = [elegida != null && k === String(elegida) ? "elegida" : "", cfg.claseFila ? cfg.claseFila(f) || "" : ""].filter(Boolean).join(" ");
        return `<tr data-clave="${esc(k)}"${clases ? ' class="' + esc(clases) + '"' : ""}${elegida != null && k === String(elegida) ? ' aria-current="true"' : ""}>` + cols.map((c, i) => {
          const crudo = c.valor ? c.valor(f) : f[c.clave];
          const html = c.fmt ? c.fmt(crudo, f) : esc(crudo);
          if (i === 0) return `<th scope="row" class="l">${cfg.alElegir ? `<button type="button" class="enlace" data-elegir="${esc(k)}">${html}</button>` : html}</th>`;
          return `<td class="${c.tipo === "num" ? "" : "l"}${c.clase ? " " + c.clase : ""}">${html}</td>`;
        }).join("") + "</tr>";
      }).join("");
      $$("th[data-col]", tabla).forEach(th => {
        const b = $("button.orden", th); if (!b) return;
        const activa = orden && orden.clave === th.dataset.col;
        th.setAttribute("aria-sort", activa ? (orden.dir === "asc" ? "ascending" : "descending") : "none");
        $(".orden-ico", b).textContent = activa ? (orden.dir === "asc" ? "↑" : "↓") : "↕";
      });
    }
    destino.addEventListener("click", e => {
      const bo = e.target.closest("button[data-ordenar]"), be = e.target.closest("button[data-elegir]");
      if (bo && destino.contains(bo)) {
        const col = cols.find(c => c.clave === bo.dataset.ordenar);
        const dir = orden && orden.clave === col.clave ? (orden.dir === "asc" ? "desc" : "asc") : (col.tipo === "num" ? "desc" : "asc");
        orden = { clave: col.clave, dir };
        pintarCuerpo();
        EIA.ui.anunciar(EIA.t(dir === "asc" ? "tabla.ordenada_asc" : "tabla.ordenada_desc", { columna: col.titulo }));
      } else if (be && destino.contains(be)) {
        elegida = be.dataset.elegir;
        const fila = filas.find(f => clave(f) === elegida);
        pintarCuerpo();
        const b = $$("button[data-elegir]", cuerpo).find(x => x.dataset.elegir === elegida); if (b) b.focus();
        if (cfg.alElegir && fila) cfg.alElegir(fila);
      }
    }, { signal: montar(destino).control.signal });
    pintarCuerpo();
    return {
      el: tabla,
      actualizar(nuevas) { filas = nuevas || []; pintarCuerpo(); },
      ordenar(c, dir) { orden = { clave: c, dir: dir || "desc" }; pintarCuerpo(); },
      elegir(k) { elegida = k; pintarCuerpo(); },
      orden: () => orden
    };
  };

  /* ───────────── Accesibilidad de los gráficos (PLAN_MAESTRO §9.2; T-27) ───────────── */

  /** En RTL las flechas horizontales se invierten (WAI-ARIA APG): la flecha que apunta al inicio de la lectura retrocede.
      Con el eje X espejado de los gráficos, ← avanza en el tiempo. */
  EIA.teclaLogica = tecla => (EIA.dir() === "rtl" ? ({ ArrowLeft: "ArrowRight", ArrowRight: "ArrowLeft" }[tecla] || tecla) : tecla);
  /** Pura: espeja las opciones de ECharts para una escritura de derecha a izquierda, como pide el kit del curso
      («espeje el eje con inverse en RTL»): los ejes X se invierten, los ejes Y pasan al otro lado y se intercambian los
      márgenes y posiciones left/right de la cuadrícula, la leyenda, el título y el mapa de color. */
  EIA.espejarGrafico = function (op) {
    const lista = x => (Array.isArray(x) ? x : x ? [x] : []);
    lista(op.xAxis).forEach(a => { a.inverse = !a.inverse; });
    lista(op.yAxis).forEach(a => { a.position = a.position === "right" ? "left" : "right"; });
    for (const k of ["grid", "legend", "title", "visualMap", "dataZoom"]) lista(op[k]).forEach(o => {
      if (!o || typeof o !== "object") return;
      const izq = o.left, der = o.right;
      if ((izq === undefined && der === undefined) || izq === "center") return;
      if (izq === "left" || izq === "right") { o.left = izq === "left" ? "right" : "left"; return; }
      delete o.left; delete o.right;
      if (der !== undefined) o.left = der;
      if (izq !== undefined) o.right = izq;
    });
    return op;
  };
  /** Pura: nueva posición del cursor de exploración tras una tecla; null si la tecla no mueve. */
  EIA.moverCursor = function (i, tecla, n) {
    if (!(n > 0)) return null;
    const salto = Math.max(1, Math.round(n / 10)), base = i == null ? -1 : i;
    const destino = tecla === "ArrowRight" ? (i == null ? 0 : base + 1) : tecla === "ArrowLeft" ? (i == null ? n - 1 : base - 1)
      : tecla === "Home" ? 0 : tecla === "End" ? n - 1
      : tecla === "PageDown" ? (i == null ? 0 : base + salto) : tecla === "PageUp" ? (i == null ? 0 : base - salto) : null;
    return destino == null ? null : Math.max(0, Math.min(n - 1, destino));
  };
  /** Pura: cifras de una serie para su resumen automático (tendencia, extremos, último valor y variación). */
  EIA.describirSerie = function (valores) {
    const v = (valores || []).map((x, i) => [x, i]).filter(p => Number.isFinite(p[0]));
    if (!v.length) return null;
    let max = v[0], min = v[0];
    v.forEach(p => { if (p[0] > max[0]) max = p; if (p[0] < min[0]) min = p; });
    const ini = v[0], fin = v[v.length - 1], dif = fin[0] - ini[0];
    const escala = Math.max(Math.abs(max[0]), Math.abs(min[0]), 1e-12);
    return {
      inicio: ini[0], iInicio: ini[1], fin: fin[0], iFin: fin[1], max: max[0], iMax: max[1], min: min[0], iMin: min[1],
      diferencia: dif, variacionPct: ini[0] !== 0 ? 100 * (fin[0] / ini[0] - 1) : null,
      tendencia: Math.abs(dif) <= 0.001 * escala ? "plana" : dif > 0 ? "sube" : "baja"
    };
  };
  /** Series que se pueden explorar y escuchar, normalizadas desde cfg.sonido():
      {series:[{nombre, valores, etiquetas, formato, tipo, tip(i)}], inicial} o, por compatibilidad, {valores, …} de una sola. */
  function seriesSonido(cfg) {
    const s = cfg.sonido ? cfg.sonido() : null;
    if (!s) return { series: [], inicial: 0 };
    const lista = s.series || [Object.assign({ nombre: cfg.titulo }, s)];
    return {
      inicial: Math.max(0, Math.min(lista.length - 1, s.inicial || 0)),
      series: lista.map((x, k) => ({
        nombre: x.nombre || cfg.titulo, valores: x.valores || [], tipo: x.tipo || "tiempo",
        etiquetas: x.etiquetas || (x.valores || []).map((_, i) => EIA.fmt.ent(i + 1)),
        formato: x.formato || (v => EIA.fmt.num(v)),
        tip: x.tip || (i => ({ seriesIndex: x.indice != null ? x.indice : k, dataIndex: i }))
      }))
    };
  }
  /** Texto del resumen automático de una serie (plantillas grafico.resumen_*). */
  function textoSerie(s) {
    const d = EIA.describirSerie(s.valores); if (!d) return "";
    const p = { nombre: s.nombre, max: s.formato(d.max), fmax: s.etiquetas[d.iMax], min: s.formato(d.min), fmin: s.etiquetas[d.iMin] };
    if (s.tipo === "categorias") return EIA.t("grafico.resumen_categorias", Object.assign(p, { n: EIA.fmt.ent(s.valores.length) }));
    return EIA.t("grafico.resumen_serie", Object.assign(p, {
      tendencia: EIA.t("grafico.tendencia_" + d.tendencia), inicio: s.formato(d.inicio), desde: s.etiquetas[d.iInicio],
      fin: s.formato(d.fin), hasta: s.etiquetas[d.iFin],
      cambio: d.variacionPct != null ? EIA.fmt.pct(d.variacionPct) : EIA.t("grafico.cambio_puntos", { dif: s.formato(d.diferencia) })
    }));
  }
  EIA.textoSerie = textoSerie;

  /** Lee un texto con la síntesis de voz del navegador, en el idioma activo. Devuelve {detener()} o null si no hay voz. */
  let _voz = null;
  EIA.leerEnVozAlta = function (texto, op) {
    const o = op || {};
    if (!hayDOM || !global.speechSynthesis || !global.SpeechSynthesisUtterance) return null;
    // Una sola lectura a la vez: la anterior se da por terminada (su botón vuelve a «Leer»)
    if (_voz) _voz.cerrar();
    global.speechSynthesis.cancel();
    const u = new global.SpeechSynthesisUtterance(texto);
    u.lang = EIA.idioma();
    u.rate = Number((EIA.estado.get("eia_a11y") || {}).voz) || 1;
    const actual = {
      hecho: false,
      cerrar() { if (actual.hecho) return; actual.hecho = true; if (_voz === actual) _voz = null; if (o.alTerminar) o.alTerminar(); }
    };
    _voz = actual;
    u.onend = actual.cerrar; u.onerror = actual.cerrar;
    global.speechSynthesis.speak(u);
    return { detener() { actual.cerrar(); global.speechSynthesis.cancel(); } };
  };
  EIA.hayVoz = () => hayDOM && !!global.speechSynthesis && !!global.SpeechSynthesisUtterance;
  /** ¿La sonificación está activada en el Centro de accesibilidad? (por defecto sí) */
  const sonidoActivo = () => (EIA.estado.get("eia_a11y") || {}).sonido !== false;

  /** Gráfico ECharts con pestañas Gráfico / Tabla / Resumen, exploración con teclado, sonido y lectura en voz alta.
      cfg = {id, titulo, alto, opciones(colores), tabla(), resumen(), sonido(), explorar}
      sonido() → {series:[{nombre, valores, etiquetas, formato(v), tipo:"tiempo"|"categorias", indice, tip(i, instancia)}], inicial}
      explorar: false cuando el módulo ya trae su propia navegación con teclado sobre el lienzo (Optimizador).
      El botón «♪ Escuchar» está oculto por decisión de Josué (19-nov): la serie se sigue escuchando con la tecla S
      sobre el gráfico enfocado y con el comando de voz «escuchar gráfico», que pulsan ese botón oculto. */
  EIA.ui.grafico = function (destino, cfg) {
    const t = EIA.t, id = cfg.id || "graf-" + (++_uid);
    const pest = [["g", "grafico.pestana_grafico"], ["t", "grafico.pestana_tabla"], ["r", "grafico.pestana_resumen"]];
    const explorable = !!cfg.sonido && cfg.explorar !== false;
    let activa = "g", inst = null, sonando = null, leyendo = null, cur = { s: null, i: null };
    const montaje = montar(destino), senal = { signal: montaje.control.signal };
    destino.innerHTML = `<section class="card grafico" id="${esc(id)}" aria-labelledby="${esc(id)}-h">
  <div class="graf-cab"><h2 id="${esc(id)}-h">${esc(cfg.titulo)}</h2>
    <div class="graf-ctl"><div class="seg" role="tablist" aria-label="${esc(t("grafico.vistas"))}">${
      pest.map(([k, clave]) => `<button type="button" role="tab" id="${esc(id)}-tab-${k}" data-pest="${k}" aria-selected="${k === activa}" aria-controls="${esc(id)}-p-${k}" tabindex="${k === activa ? 0 : -1}">${esc(t(clave))}</button>`).join("")}</div>
      ${cfg.sonido ? `<button type="button" class="escuchar" aria-pressed="false" hidden><span aria-hidden="true">♪</span> ${esc(t("grafico.escuchar"))}</button>` : ""}</div></div>
  <div role="tabpanel" id="${esc(id)}-p-g" aria-labelledby="${esc(id)}-tab-g"><div class="chart" role="img" style="height:${Number(cfg.alto) || 352}px"></div>${
    explorable ? `<p class="mut graf-ayuda" id="${esc(id)}-ayuda">${esc(t("grafico.explorar_ayuda"))}</p>` : ""}</div>
  <div role="tabpanel" id="${esc(id)}-p-t" aria-labelledby="${esc(id)}-tab-t" hidden></div>
  <div role="tabpanel" id="${esc(id)}-p-r" aria-labelledby="${esc(id)}-tab-r" tabindex="0" hidden><p class="resumen"></p><ul class="resumen-series"></ul>${
    EIA.hayVoz() ? `<p class="acciones"><button type="button" class="leer" aria-pressed="false"><span aria-hidden="true">🔊</span> ${esc(t("grafico.leer"))}</button></p>` : ""}</div>
</section>`;
    const lienzo = $(".chart", destino);
    if (explorable) {
      // El lienzo es un control: role="application" deja pasar las flechas aunque haya un lector de pantalla
      lienzo.tabIndex = 0;
      lienzo.setAttribute("role", "application");
      lienzo.setAttribute("aria-roledescription", t("grafico.rol"));
      lienzo.setAttribute("aria-describedby", id + "-ayuda");
    }
    function dibujar() {
      const resumen = cfg.resumen ? cfg.resumen() : cfg.titulo;
      lienzo.setAttribute("aria-label", resumen);
      if (!global.echarts) { lienzo.textContent = t("grafico.sin_echarts"); return; }
      if (!inst) inst = global.echarts.init(lienzo);
      const a11y = EIA.estado.get("eia_a11y") || {};
      // aria.label.description: sin ella, ECharts reescribe el aria-label del lienzo con su descripción automática en inglés
      const base = { animation: !EIA.movimientoReducido(), aria: { enabled: true, label: { description: resumen }, decal: { show: !!a11y.decal } } };
      const op = Object.assign(base, cfg.opciones(EIA.coloresGrafico()));
      inst.setOption(EIA.dir() === "rtl" ? EIA.espejarGrafico(op) : op, true);
    }
    function textoResumen() {
      const lista = seriesSonido(cfg).series.map(textoSerie).filter(Boolean);
      return { general: cfg.resumen ? cfg.resumen() : "", lista };
    }
    function pintarPanel() {
      if (activa === "g") { dibujar(); if (inst) inst.resize(); }
      else if (activa === "t" && cfg.tabla) EIA.ui.tabla($("#" + id + "-p-t", destino), cfg.tabla());
      else if (activa === "r") {
        const r = textoResumen();
        $(".resumen", destino).textContent = r.general;
        $(".resumen-series", destino).innerHTML = r.lista.map(x => `<li>${esc(x)}</li>`).join("");
      }
    }
    function elegir(k, conFoco) {
      activa = k;
      pest.forEach(([p]) => {
        const b = $("#" + id + "-tab-" + p, destino), sel = p === k;
        b.setAttribute("aria-selected", String(sel)); b.tabIndex = sel ? 0 : -1;
        $("#" + id + "-p-" + p, destino).hidden = !sel;
        if (sel && conFoco) b.focus();
      });
      pintarPanel();
    }
    function escuchar(boton) {
      if (sonando) { sonando.detener(); sonando = null; boton.setAttribute("aria-pressed", "false"); return; }
      const ss = seriesSonido(cfg), s = ss.series[cur.s != null ? cur.s : ss.inicial];
      if (!s) return;
      boton.setAttribute("aria-pressed", "true");
      EIA.ui.anunciar(t("grafico.escuchando", { serie: s.nombre }));
      EIA.cargar("js/a11y/sonificacion.js").then(() => {
        sonando = EIA.sonar(s.valores, { alTerminar() { sonando = null; boton.setAttribute("aria-pressed", "false"); } });
      }).catch(err => { boton.setAttribute("aria-pressed", "false"); EIA.ui.notificar(String(err.message || err), "error"); });
    }
    /** Mueve el cursor de exploración: tono, anuncio y tooltip del punto. */
    function explorar(tecla) {
      const ss = seriesSonido(cfg); if (!ss.series.length) return false;
      if (cur.s == null || cur.s >= ss.series.length) cur.s = ss.inicial;
      if (tecla === "ArrowUp" || tecla === "ArrowDown") {
        if (ss.series.length < 2) return true;
        cur.s = (cur.s + (tecla === "ArrowDown" ? 1 : -1) + ss.series.length) % ss.series.length;
        const s = ss.series[cur.s];
        if (cur.i != null) cur.i = Math.min(cur.i, s.valores.length - 1);
        EIA.ui.anunciar(t("grafico.serie_elegida", { serie: s.nombre, n: EIA.fmt.ent(cur.s + 1), total: EIA.fmt.ent(ss.series.length) }));
        return true;
      }
      const s = ss.series[cur.s], i = EIA.moverCursor(cur.i, tecla, s.valores.length);
      if (i == null) return false;
      cur.i = i;
      const v = s.valores[i];
      EIA.ui.anunciar(t("grafico.punto", { serie: s.nombre, etiqueta: s.etiquetas[i], valor: Number.isFinite(v) ? s.formato(v) : t("grafico.sin_valor"),
        n: EIA.fmt.ent(i + 1), total: EIA.fmt.ent(s.valores.length) }));
      if (inst) { try { inst.dispatchAction(Object.assign({ type: "showTip" }, s.tip(i, inst))); } catch (e) { /* serie oculta en la leyenda */ } }
      if (sonidoActivo() && Number.isFinite(v)) {
        const fin = s.valores.filter(Number.isFinite), min = Math.min.apply(null, fin), max = Math.max.apply(null, fin);
        EIA.cargar("js/a11y/sonificacion.js").then(() => EIA.tono(v, min, max, { pan: s.valores.length > 1 ? -1 + 2 * i / (s.valores.length - 1) : 0 })).catch(() => {});
      }
      return true;
    }
    function leer(boton) {
      if (leyendo) { leyendo.detener(); leyendo = null; return; }
      const r = textoResumen();
      boton.setAttribute("aria-pressed", "true");
      leyendo = EIA.leerEnVozAlta([cfg.titulo, r.general].concat(r.lista).join(". "), { alTerminar() { leyendo = null; boton.setAttribute("aria-pressed", "false"); } });
      if (!leyendo) boton.setAttribute("aria-pressed", "false");
    }
    destino.addEventListener("click", e => {
      const b = e.target.closest("[data-pest]");
      if (b && destino.contains(b)) elegir(b.dataset.pest);
      const s = e.target.closest(".escuchar");
      if (s && destino.contains(s)) escuchar(s);
      const l = e.target.closest(".leer");
      if (l && destino.contains(l)) leer(l);
    }, senal);
    destino.addEventListener("keydown", e => {
      if (explorable && e.target === lienzo && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === "s" || e.key === "S") { e.preventDefault(); const b = $(".escuchar", destino); if (b) escuchar(b); return; }
        if (explorar(EIA.teclaLogica(e.key))) e.preventDefault();
        return;
      }
      const b = e.target.closest("[data-pest]"); if (!b) return;
      const i = pest.findIndex(p => p[0] === b.dataset.pest), k = EIA.teclaLogica(e.key);
      const j = k === "ArrowRight" ? (i + 1) % pest.length : k === "ArrowLeft" ? (i + pest.length - 1) % pest.length
        : k === "Home" ? 0 : k === "End" ? pest.length - 1 : -1;
      if (j >= 0) { e.preventDefault(); elegir(pest[j][0], true); }
    }, senal);
    if (explorable) lienzo.addEventListener("blur", () => { if (inst) inst.dispatchAction({ type: "hideTip" }); }, senal);
    const cancelarTema = EIA.on("eia:tema", () => { if (activa === "g") dibujar(); });
    let observador = null;
    if (global.ResizeObserver) { observador = new ResizeObserver(() => { if (inst && activa === "g") inst.resize(); }); observador.observe(lienzo); }
    function destruir() {
      cancelarTema();
      if (sonando) { sonando.detener(); sonando = null; }
      if (leyendo) { leyendo.detener(); leyendo = null; }
      if (observador) { observador.disconnect(); observador = null; }
      if (inst) { inst.dispose(); inst = null; }
    }
    montaje.alDesmontar = destruir; // si se vuelve a montar sobre el mismo nodo, se libera el gráfico anterior
    dibujar();
    return { redibujar() { pintarPanel(); }, instancia: () => inst, destruir };
  };

  /** Diálogo con las opciones de un <select>: un <select> nativo no se abre con un clic sintético (puntero y barrido). */
  EIA.ui.opcionesSelect = function (sel) {
    const lista = document.createElement("div"); lista.className = "opciones-select";
    const etiqueta = (sel.labels && sel.labels[0] && sel.labels[0].textContent) || sel.getAttribute("aria-label") || "";
    let dlg = null;
    Array.from(sel.options).forEach(o => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = o.textContent; b.setAttribute("aria-pressed", String(o.selected));
      b.addEventListener("click", () => { sel.value = o.value; sel.dispatchEvent(new Event("change", { bubbles: true })); dlg.cerrar(); });
      lista.appendChild(b);
    });
    dlg = EIA.ui.dialogo({ titulo: etiqueta.trim() || EIA.t("a11y.elige_opcion"), contenido: lista });
    dlg.abrir();
    return dlg;
  };

  /** Diálogo modal accesible sobre <dialog>: foco atrapado, Esc cierra y el foco vuelve a quien lo abrió.
      cfg = {titulo, contenido (HTML ya escapado o nodo), acciones:[{texto, valor, primario}], alCerrar(valor)} */
  EIA.ui.dialogo = function (cfg) {
    const d = document.createElement("dialog"), id = "dlg-" + (++_uid);
    let previo = null;
    d.className = "dlg"; d.setAttribute("aria-labelledby", id);
    d.innerHTML = `<form method="dialog"><div class="dlg-cab"><h2 id="${id}">${esc(cfg.titulo)}</h2><button type="submit" value="" class="dlg-cerrar" aria-label="${esc(EIA.t("comun.cerrar"))}">✕</button></div><div class="dlg-cuerpo"></div><div class="dlg-pie">${
      (cfg.acciones || []).map(a => `<button type="submit" value="${esc(a.valor)}"${a.primario ? ' class="primary"' : ""}>${esc(a.texto)}</button>`).join("")}</div></form>`;
    const cuerpo = $(".dlg-cuerpo", d);
    if (typeof cfg.contenido === "string") cuerpo.innerHTML = cfg.contenido; else if (cfg.contenido) cuerpo.appendChild(cfg.contenido);
    // La limpieza no depende solo del evento "close": en una pestaña que no se está dibujando el navegador puede
    // retrasarlo. Se finaliza también tras enviar el formulario, tras Esc ("cancel") y al llamar a cerrar().
    let finalizado = false;
    const finalizar = () => {
      if (finalizado) return;
      finalizado = true;
      if (cfg.alCerrar) cfg.alCerrar(d.returnValue);
      d.remove();
      if (previo && previo.focus) previo.focus();
    };
    const trasCerrar = () => setTimeout(() => { if (!d.open) finalizar(); }, 0);
    d.addEventListener("close", finalizar);
    d.addEventListener("cancel", trasCerrar);
    $("form", d).addEventListener("submit", trasCerrar);
    return {
      el: d,
      abrir() { previo = document.activeElement; document.body.appendChild(d); d.showModal(); },
      cerrar(valor) { if (d.open) d.close(valor || ""); finalizar(); }
    };
  };

  /** Diálogo «Llevar a Trading» (R-POR-04, G10, PLAN_MAESTRO §4.5), compartido por Portafolios y el Optimizador.
      Muestra cuánto efectivo invertir (por defecto todo el disponible), deja desmarcar activos (los pesos se
      renormalizan), calcula las cantidades y, al confirmar, compra a mercado con la misma validación de Trading.
      cfg = {pesos, excluidos, nivel, origen, fuente: "portafolios" | "optimizador", alTerminar()} */
  EIA.ui.llevarATrading = async function (cfg) {
    const t = EIA.t, usd = x => EIA.fmt.usd(x);
    const [c10, c11] = await EIA.todos([EIA.universo(), EIA.datos("11_watchlist_alertas_portafolio_demo.json")]);
    const precio = tk => { const a = c10.find(x => x.ticker === tk); return a ? a.ultimo : NaN; };
    const cartera = () => EIA.estado.get(EIA.cartera.clave()) || EIA.cartera.copia(c11.portafolio_demo);
    const efectivo = Math.floor(cartera().efectivo * 100) / 100;
    const marcados = new Set(Object.keys(cfg.pesos).filter(tk => cfg.pesos[tk] > 0 && !(cfg.excluidos || []).includes(tk)));
    let plan = null;

    const caja = document.createElement("div");
    caja.className = "llevar";
    caja.innerHTML = `<p>${esc(t("llevar.intro", { origen: cfg.origen }))}</p>
<label for="llevar-monto">${esc(t("llevar.monto"))}</label>
<input id="llevar-monto" type="number" min="0" step="0.01" inputmode="decimal" value="${efectivo}" aria-describedby="llevar-monto-ayuda llevar-monto-error">
<p id="llevar-monto-ayuda" class="mut">${esc(t("llevar.monto_ayuda", { efectivo: usd(efectivo) }))}</p>
<p id="llevar-monto-error" class="err" aria-live="polite"></p>
<fieldset class="llevar-activos"><legend>${esc(t("llevar.activos"))}</legend>${Object.keys(cfg.pesos).filter(tk => cfg.pesos[tk] > 0).sort((a, b) => cfg.pesos[b] - cfg.pesos[a]).map(tk =>
      `<label class="casilla"><input type="checkbox" data-llevar="${esc(tk)}"${marcados.has(tk) ? " checked" : ""}> ${esc(tk)}</label>`).join("")}</fieldset>
<div class="llevar-plan" aria-live="polite"></div>`;

    function calcular() {
      const monto = Number(caja.querySelector("#llevar-monto").value), err = caja.querySelector("#llevar-monto-error"), input = caja.querySelector("#llevar-monto");
      const malo = !(monto > 0) ? "llevar.error_monto" : monto > efectivo + 1e-9 ? "llevar.error_efectivo" : null;
      err.textContent = malo ? t(malo, { efectivo: usd(efectivo) }) : "";
      if (malo) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
      const pesos = EIA.cartera.renormalizar(cfg.pesos, Object.keys(cfg.pesos).filter(tk => !marcados.has(tk)));
      plan = malo ? null : EIA.cartera.plan(pesos, monto, precio);
      const destino = caja.querySelector(".llevar-plan");
      if (!plan) { destino.innerHTML = ""; return; }
      destino.innerHTML = !plan.ordenes.length ? `<p class="err">${esc(t("llevar.sin_ordenes"))}</p>` : `<div class="tw" role="region" tabindex="0" aria-label="${esc(t("llevar.plan_caption"))}"><table><caption>${esc(t("llevar.plan_caption"))}</caption>
<thead><tr><th scope="col" class="l">${esc(t("comun.activo"))}</th><th scope="col">${esc(t("llevar.col_peso"))}</th><th scope="col">${esc(t("llevar.col_precio"))}</th><th scope="col">${esc(t("llevar.col_cantidad"))}</th><th scope="col">${esc(t("llevar.col_total"))}</th></tr></thead>
<tbody>${plan.ordenes.map(o => `<tr><th scope="row" class="l">${esc(o.ticker)}</th><td>${esc(EIA.fmt.pct(o.peso * 100, 1, { signo: false }))}</td><td>${esc(usd(o.precio))}</td><td>${esc(EIA.fmt.ent(o.cantidad))}</td><td>${esc(usd(o.total))}</td></tr>`).join("")}</tbody></table></div>
<p class="vista-previa">${esc(t("llevar.resumen", { total: usd(plan.total), sobrante: usd(efectivo - plan.total) }))}</p>${
      plan.sinComprar.length ? `<p class="mut">${esc(t("llevar.sin_comprar", { lista: plan.sinComprar.map(o => o.ticker).join(", ") }))}</p>` : ""}`;
    }
    caja.addEventListener("input", calcular);
    caja.addEventListener("change", e => {
      const tk = e.target.dataset && e.target.dataset.llevar;
      if (tk) { if (e.target.checked) marcados.add(tk); else marcados.delete(tk); calcular(); }
    });

    function ejecutar() {
      let c = cartera(), compradas = 0, gastado = 0;
      const ordenes = EIA.estado.get(EIA.cartera.claveOrdenes()) || [], ahora = new Date().toISOString();
      for (const o of plan.ordenes) {
        const orden = { ticker: o.ticker, lado: "C", cantidad: o.cantidad };
        if (Object.keys(EIA.cartera.validar(c, orden, o.precio)).length) continue; // misma validación que Trading
        c = EIA.cartera.ejecutar(c, orden, o.precio);
        ordenes.push({ fecha: ahora, ticker: o.ticker, lado: "C", cantidad: o.cantidad, precio: o.precio });
        compradas++; gastado += o.total;
      }
      EIA.estado.set(EIA.cartera.clave(), c);
      EIA.estado.set(EIA.cartera.claveOrdenes(), ordenes);
      const excluidos = Object.keys(cfg.pesos).filter(tk => !marcados.has(tk));
      // «aplicado» recuerda la última cartera llevada a Trading aunque después se elija otro nivel
      EIA.estado.set("eia_elegido", { modo: EIA.modo(), nivel: cfg.nivel || null, origen: cfg.origen, fuente: cfg.fuente, pesos: cfg.pesos, excluidos, llevado_a_trading: true,
        aplicado: { nivel: cfg.nivel || null, origen: cfg.origen, fuente: cfg.fuente, excluidos } });
      const texto = t("llevar.hecho", { n: compradas, total: usd(gastado) });
      if (compradas) EIA.notificaciones.agregar({ tipo: "lote", datos: { n: compradas, total: gastado } });
      EIA.ui.notificar(texto, "ok", { href: "ordenes.html", texto: t("trading.ver_historial") }); EIA.ui.anunciar(texto);
      if (cfg.alTerminar) cfg.alTerminar();
    }

    const dlg = EIA.ui.dialogo({
      titulo: t("llevar.titulo", { origen: cfg.origen }), contenido: caja,
      acciones: [{ texto: t("llevar.cancelar"), valor: "no" }, { texto: t("llevar.confirmar"), valor: "si", primario: true }],
      alCerrar(v) { if (v === "si" && plan && plan.ordenes.length) ejecutar(); }
    });
    // Con datos no válidos «Confirmar» no cierra el diálogo: se queda abierto mostrando el error
    $("form", dlg.el).addEventListener("submit", e => {
      if (e.submitter && e.submitter.value === "si" && !(plan && plan.ordenes.length)) { e.preventDefault(); caja.querySelector("#llevar-monto").focus(); }
    });
    calcular();
    dlg.abrir();
    return dlg;
  };

  /** Barra de progreso accesible. */
  EIA.ui.progreso = function (destino, cfg) {
    destino.innerHTML = `<div class="progreso" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="${esc((cfg && cfg.etiqueta) || "")}"><div class="progreso-barra"></div></div>`;
    const p = $(".progreso", destino), b = $(".progreso-barra", destino);
    return {
      set(pct) { const v = Math.max(0, Math.min(100, Math.round(pct))); p.setAttribute("aria-valuenow", String(v)); b.style.width = v + "%"; },
      fin() { destino.innerHTML = ""; }
    };
  };

  /* ───────────── Ciclo de vida de un módulo ───────────── */
  let _modulo = null, _datos = null, _vuelta = 0, _listo = false;
  async function correr(recargar) {
    const vuelta = ++_vuelta, main = $("main");
    if (main) main.setAttribute("aria-busy", "true");
    // El esqueleto solo aparece si la carga tarda: con datos en caché no parpadea
    const reloj = main && (recargar || _datos === null) ? setTimeout(() => { if (vuelta === _vuelta) mostrarEsqueleto(main); }, 150) : null;
    try {
      _parcial = false;
      await EIA.meta();
      if (recargar || _datos === null) { await EIA.watch.cargar(); _datos = await _modulo.cargar(); }
      if (vuelta !== _vuelta) return;
      if (main) { main.classList.remove("sin-datos"); $$(".estado-error", main).forEach(n => n.remove()); }
      EIA.ui.aviso(_modulo.id);
      _modulo.pintar(_datos);
    } catch (e) {
      if (vuelta === _vuelta) { EIA.ui.aviso(_modulo.id); EIA.ui.error(e); }
    } finally {
      clearTimeout(reloj);
      if (vuelta === _vuelta && main) { main.removeAttribute("aria-busy"); quitarEsqueleto(main); }
    }
  }
  /** Registra el módulo de la página: {id, cargar: async () => datos, pintar: datos => void}.
      cargar se repite al cambiar de modo o de corte; pintar, además, al cambiar de idioma. */
  EIA.modulo = function (def) { _modulo = def; if (_listo) correr(true); };
  /** Vuelve a pintar el módulo con los datos ya cargados. */
  EIA.repintar = () => (_modulo ? correr(false) : undefined);

  async function arrancar() {
    await EIA.cargarManifiesto();
    _idioma = null; // ahora que se conocen los idiomas, se vuelve a resolver ?lang= y la elección guardada
    aplicarIdiomaDocumento();
    buildShell();
    try { await EIA.cargarIdioma(EIA.idioma()); }
    catch (e) {
      // Último recurso: sin diccionario no hay textos; se informa en los dos idiomas.
      const m = $("main");
      if (m) m.insertAdjacentHTML("afterbegin", '<p class="err" role="alert">No se pudo cargar locales/. Abra el sitio desde un servidor (GitHub Pages o <code>python -m http.server</code>). / Could not load locales/. Open the site from a web server.</p>');
      return;
    }
    aplicarIdiomaDocumento();
    pintarShell();
    EIA.traducir();
    EIA.on("eia:modo", () => { if (_modulo) correr(true); else global.location.reload(); });
    EIA.on("eia:corte", () => { if (_modulo) correr(true); else global.location.reload(); });
    EIA.on("eia:idioma", () => { if (_modulo) correr(false); else global.location.reload(); });
    EIA.on("eia:zona", () => { if (_modulo) correr(false); });
    EIA.on("eia:modo", () => { pintarCinta(); revisarAlertas().then(pintarCampana); });
    EIA.on("eia:idioma", () => { pintarCinta(); const f = $(".franja-tour"); if (f) { f.remove(); ofrecerTour(); } });
    EIA.on("eia:estado", d => { if (d.clave === "eia_perfil") pintarShell(); });
    _listo = true;
    EIA.emit("eia:listo");
    await EIA.meta();
    pintarShell();
    pintarCinta().then(ofrecerTour);
    revisarAlertas().then(pintarCampana);
    if (_modulo) await correr(true);
    else {
      // Páginas de la base que aún usan window.init
      EIA.ui.aviso(document.body.dataset.page || "generico");
      if (global.init) { try { await global.init(); } catch (e) { EIA.ui.error(e); } }
    }
    reanudarAccesibilidad();
  }

  /* ───────────── Fachada del investing_i18n_kit del curso ─────────────
     Misma API que I18N del kit (t, num, money, pct, dt, rel, names, sort, dir, pseudoloc, state, set, locales), sin
     duplicar código: todo delega en EIA. Así el sitio integra el kit y conserva un solo núcleo (R-INT-10). */
  EIA.i18n = {
    t: (clave, vars) => EIA.t(clave, vars),
    num: (x, op) => nf(op || {}).format(Number(x)),
    money: (x, divisa, op) => nf(Object.assign({ style: "currency", currency: divisa || "USD" }, op)).format(Number(x)),
    pct: x => nf({ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" }).format(Number(x)),
    dt: (iso, op) => dtf(Object.assign({ dateStyle: "medium", timeStyle: "short", timeZone: EIA.zona() }, op)).format(new Date(iso)),
    rel: (v, unidad) => EIA.fmt.rel(v, unidad),
    names: tag => EIA.endonimo(tag),
    sort: (lista, f) => EIA.ordenar(lista, f),
    dir: () => EIA.dir(),
    pseudoloc: s => calidad().pseudolocalizar(s),
    state: () => ({ locale: EIA.idioma(), tz: EIA.zona(), pseudo: EIA.esPseudo(), dir: EIA.dir() }),
    set(o) {
      if (o && "tz" in o) EIA.setZona(o.tz);
      if (o && o.locale) return EIA.setIdioma(o.locale);
      return Promise.resolve();
    },
    /** Mide truncados y desbordes de la página actual (ejercicio 13.2). */
    medir: () => calidad().medir(document, { locale: EIA.idioma(), dir: EIA.dir() }),
    get locales() { return EIA.IDIOMAS.slice(); }
  };

  /* ───────────── Publicación ───────────── */
  const api = { EIA, PAGES, NAVEGACION, PAGINAS_NAV, $, $$, fmt, loadJSON, store, applyTheme, buildShell, showError };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (hayDOM) {
    Object.assign(global, api);
    if (!global.I18N) global.I18N = EIA.i18n;
    document.addEventListener("DOMContentLoaded", arrancar);
  }
})(typeof window !== "undefined" ? window : globalThis);
