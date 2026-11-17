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
  EIA.IDIOMAS = ["es-PE", "en-US"];

  /* Páginas del sitio: [archivo, clave i18n, id, es módulo nuevo]. Mismo orden que la base del profesor. */
  const PAGES = [
    ["index.html", "nav.dashboard", "dashboard"], ["watchlist.html", "nav.watchlist", "watchlist"],
    ["trading.html", "nav.trading", "trading"], ["leaderboard.html", "nav.leaderboard", "leaderboard"],
    ["clasificacion.html", "nav.clasificacion", "clasificacion", 1], ["regresion.html", "nav.regresion", "regresion", 1],
    ["optimizador.html", "nav.optimizador", "optimizador", 1], ["portafolios.html", "nav.portafolios", "portafolios", 1],
    ["backtesting.html", "nav.backtesting", "backtesting", 1]
  ];

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
  /** Compatibilidad con la base. */
  const loadJSON = nombre => EIA.datos(nombre);

  /** Fechas de corte disponibles (la primera es la más reciente). */
  EIA.cortes = async function () {
    const mt = await EIA.meta();
    if (EIA.modo() === "real" && mt.disponible) {
      try { const ix = await EIA.datos("cortes/index.json"); if (ix && Array.isArray(ix.cortes) && ix.cortes.length) return ix.cortes.slice(); } catch (e) { /* sin cortes históricos */ }
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
  EIA.activo = () => parametros().get("t") || EIA.estado.get("eia_activo");
  EIA.setActivo = function (t) {
    EIA.estado.set("eia_activo", t);
    if (hayDOM && global.history && global.history.replaceState && parametros().has("t")) {
      const u = new URL(global.location.href); u.searchParams.set("t", t);
      global.history.replaceState(null, "", u.pathname + u.search + u.hash);
    }
  };

  /* ───────────── Internacionalización (ES-PE / EN-US) ───────────── */
  let _idioma = null, _dic = {};
  const avisados = new Set();
  function normalizarIdioma(v) {
    if (!v) return null;
    const s = String(v).toLowerCase();
    if (s === "en" || s === "en-us") return "en-US";
    if (s === "es" || s === "es-pe") return "es-PE";
    return null;
  }
  EIA.idioma = function () {
    if (_idioma) return _idioma;
    _idioma = normalizarIdioma(parametros().get("lang")) || normalizarIdioma(EIA.estado.get("eia_lang")) || "es-PE";
    return _idioma;
  };
  const buscar = (dic, clave) => clave.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), dic);
  /** ¿Existe la clave en el diccionario activo? */
  EIA.hayTexto = clave => buscar(_dic, clave) !== undefined;
  /** Texto traducido. Parámetros con nombre: «Votos: {sube} ▲». Si el valor es {one, other} elige el plural con params.n. */
  EIA.t = function (clave, params) {
    let v = buscar(_dic, clave);
    if (v && typeof v === "object" && typeof v.other === "string") {
      const cat = new Intl.PluralRules(EIA.idioma()).select(Number(params && params.n));
      v = typeof v[cat] === "string" ? v[cat] : v.other;
    }
    if (typeof v !== "string") {
      if (!avisados.has(clave) && global.console) { avisados.add(clave); console.warn("i18n: falta la clave " + clave); }
      return "⟦" + clave + "⟧";
    }
    return params ? v.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : v;
  };
  /** Nombre de presentación de un valor del JSON (grupo, modelo, sector…). Si no está en el mapa, devuelve el valor tal cual. */
  EIA.nombre = function (categoria, valor) {
    const m = _dic.datos && _dic.datos[categoria];
    return m && typeof m[valor] === "string" ? m[valor] : String(valor);
  };
  /** Solo para pruebas y para el arranque: instala un diccionario ya cargado. */
  EIA.usarDiccionario = function (dic, idioma) { _dic = dic || {}; if (idioma) _idioma = idioma; formateadores.clear(); };
  EIA.cargarIdioma = async function (idioma) {
    const r = await fetch("i18n/" + idioma + ".json?v=" + EIA.version);
    if (!r.ok) throw new ErrorDatos("http", "i18n/" + idioma + ".json", r.status);
    EIA.usarDiccionario(await r.json(), idioma);
  };
  /** Aplica data-i18n (texto) y data-i18n-attr="aria-label=clave,title=clave" (atributos). */
  EIA.traducir = function (raiz) {
    $$("[data-i18n]", raiz).forEach(el => { el.textContent = EIA.t(el.dataset.i18n); });
    $$("[data-i18n-attr]", raiz).forEach(el => el.dataset.i18nAttr.split(",").forEach(par => {
      const [atributo, clave] = par.split("=");
      if (atributo && clave) el.setAttribute(atributo.trim(), EIA.t(clave.trim()));
    }));
  };
  EIA.setIdioma = async function (idioma) {
    const l = normalizarIdioma(idioma);
    if (!l || l === EIA.idioma()) return;
    try { await EIA.cargarIdioma(l); } catch (e) { EIA.ui.error(e); return; }
    EIA.estado.set("eia_lang", l);
    quitarParametro("lang");
    document.documentElement.lang = l;
    pintarShell();
    EIA.traducir();
    EIA.emit("eia:idioma", { idioma: l });
    EIA.ui.anunciar(EIA.t("shell.anuncio_idioma"));
  };

  /* ───────────── Formatos con Intl según el idioma activo ───────────── */
  const formateadores = new Map();
  function nf(op) {
    const k = EIA.idioma() + JSON.stringify(op);
    if (!formateadores.has(k)) formateadores.set(k, new Intl.NumberFormat(EIA.idioma(), op));
    return formateadores.get(k);
  }
  const ISO = /^\d{4}-\d{2}-\d{2}/;
  EIA.fmt = {
    /** Número con d decimales. */
    num: (x, d = 2) => nf({ minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(x)),
    ent: x => nf({ maximumFractionDigits: 0 }).format(Number(x)),
    /** x ya viene en puntos porcentuales (2,93 → «+2.93%»). Con {signo:false} no antepone el signo +. */
    pct: (x, d = 2, op) => nf({ style: "percent", minimumFractionDigits: d, maximumFractionDigits: d, signDisplay: op && op.signo === false ? "auto" : "exceptZero" }).format(Number(x) / 100),
    /** Probabilidad 0–1 como número («0.62»). */
    prob: (p, d = 2) => nf({ minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(p)),
    /** Dólares; d decimales (2 por defecto). */
    usd: (x, d) => nf(d == null ? { style: "currency", currency: "USD" } : { style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(x)),
    compacto: x => nf({ notation: "compact", maximumFractionDigits: 1 }).format(Number(x)),
    /** Fecha ISO (día de sesión) en UTC para que no se corra un día en Lima. Lo que no es fecha (p. ej. "inicio") se traduce. */
    fecha(iso, estilo) {
      const s = String(iso);
      if (!ISO.test(s)) return s === "inicio" ? EIA.t("comun.inicio") : s;
      const op = estilo === "larga" ? { dateStyle: "long", timeZone: "UTC" } : { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" };
      return new Intl.DateTimeFormat(EIA.idioma(), op).format(new Date(s.slice(0, 10) + "T00:00:00Z"));
    }
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
        : String(x).localeCompare(String(y), EIA.idioma(), { numeric: true, sensitivity: "base" });
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
  /** Colores de los gráficos leídos de los tokens CSS: una sola fuente de color para ambos temas. */
  EIA.coloresGrafico = function () {
    const cs = getComputedStyle(document.documentElement);
    const v = n => cs.getPropertyValue(n).trim();
    return {
      fg: v("--fg"), mut: v("--mut"), bd: v("--bd"), bg: v("--bg"), panel: v("--panel"), hl: v("--hl"),
      up: v("--up"), dn: v("--dn"), ac: v("--ac"), warn: v("--warn"),
      serie: [1, 2, 3, 4, 5, 6].map(i => v("--serie-" + i))
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
  };

  /** Abre el Centro de accesibilidad (js/a11y/panel.js se carga la primera vez). */
  EIA.abrirAccesibilidad = function () {
    return EIA.cargar("js/a11y/panel.js").then(() => EIA.a11y.abrir()).catch(e => EIA.ui.notificar(String(e.message || e), "error"));
  };
  /** Reanuda las modalidades de control al cargar la página: el sitio es multipágina y la cámara no sobrevive a la navegación.
      También atiende los modos de prueba ?puntero=raton y ?camara=simulada&mod=cabeza|manos&objetivo=<selector>. */
  function reanudarAccesibilidad() {
    const q = parametros();
    let enSesion = null; try { enSesion = global.sessionStorage.getItem("eia_cam"); } catch (e) { enSesion = null; }
    const simulada = q.get("camara") === "simulada", modalidad = simulada ? (q.get("mod") || "cabeza") : enSesion;
    if (modalidad) {
      EIA.cargar("js/a11y/camara.js").then(() => EIA.camara.iniciar(modalidad, { reanudar: true, simulada, objetivo: q.get("objetivo") })).catch(() => {});
    } else if (q.get("puntero") === "raton") {
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

  /* ───────────── Shell: cabecera, menú de módulos, controles y pie ───────────── */
  let menuAbierto = false;
  function plantillaCabecera() {
    const t = EIA.t, pagina = document.body.dataset.page, modo = EIA.modo();
    const mp = metaLista.profesor, mr = metaLista.real;
    const enlaces = PAGES.map(p => `<li><a href="${p[0]}"${p[2] === pagina ? ' aria-current="page"' : ""}>${esc(t(p[1]))}${p[3] ? '<span class="nuevo" aria-hidden="true"> ★</span>' : ""}</a></li>`).join("");
    const rotuloProfesor = mp && mp.fecha_corte ? t("shell.modo_profesor", { fecha: EIA.fmt.fecha(mp.fecha_corte) }) : t("shell.modo_profesor_sin_fecha");
    const rotuloReal = mr && mr.disponible && mr.fecha_corte ? t("shell.modo_real", { fecha: EIA.fmt.fecha(mr.fecha_corte) }) : t("shell.modo_real_sin_fecha");
    return `<div class="bar">
  <a class="brand" href="index.html">Ernesto <span>Investing AI</span></a>
  <button id="btn-modulos" type="button" aria-expanded="${menuAbierto}" aria-controls="nav-modulos"><span aria-hidden="true">☰</span> ${esc(t("nav.modulos"))}</button>
  <nav id="nav-modulos" aria-label="${esc(t("nav.etiqueta"))}"${menuAbierto ? ' class="abierto"' : ""}><ul>${enlaces}</ul></nav>
  <div class="controles">
    <div id="ctl-modo" class="seg" role="group" aria-label="${esc(t("shell.datos_grupo"))}">
      <span class="seg-rot" aria-hidden="true">${esc(t("shell.datos"))}</span>
      <button type="button" data-modo="profesor" aria-pressed="${modo === "profesor"}">${esc(rotuloProfesor)}</button>
      <button type="button" data-modo="real" aria-pressed="${modo === "real"}">${esc(rotuloReal)}</button>
    </div>
    <label class="sr" for="ctl-idioma">${esc(t("shell.idioma"))}</label>
    <select id="ctl-idioma">${EIA.IDIOMAS.map(l => `<option value="${l}"${l === EIA.idioma() ? " selected" : ""}>${l.toUpperCase()}</option>`).join("")}</select>
    <button id="tema" type="button" aria-pressed="${EIA.tema() === "dark"}" title="${esc(t("shell.tema_titulo"))}"><span aria-hidden="true">◐</span> ${esc(t("shell.tema"))}</button>
    <button id="btn-a11y" type="button" aria-haspopup="dialog" title="${esc(t("shell.accesibilidad_titulo"))}">${esc(t("shell.accesibilidad"))}</button>
  </div>
</div>`;
  }
  function plantillaPie() {
    const t = EIA.t, modo = EIA.modo(), mt = metaLista[modo];
    const fecha = mt && mt.fecha_corte ? EIA.fmt.fecha(mt.fecha_corte, "larga") : "";
    const claveAviso = modo === "real" && !(mt && mt.disponible) ? "aviso.real.sin_datos"
      : modo === "real" && _parcial ? "aviso.real.parcial" : "aviso." + modo + ".global";
    return `<p class="aviso" data-aviso="global" role="note"><span class="aviso-ico" aria-hidden="true">⚠</span><span>${esc(t(claveAviso, { fecha }))}</span></p>
<p class="pie-creditos">${esc(t("shell.pie_creditos"))}</p>`;
  }
  /** Repinta los textos del shell (idioma, modo, fecha de corte) conservando el foco. */
  function pintarShell() {
    const cab = $("header.top"), pie = $("footer.pie");
    if (!cab || !pie) return;
    const foco = cab.contains(document.activeElement) ? document.activeElement : null;
    const selectorFoco = foco ? (foco.id ? "#" + foco.id : (foco.dataset.modo ? `[data-modo="${foco.dataset.modo}"]` : null)) : null;
    cab.innerHTML = plantillaCabecera();
    pie.innerHTML = plantillaPie();
    const salto = $("a.skip"); if (salto) salto.textContent = EIA.t("comun.saltar");
    if (selectorFoco) { const n = $(selectorFoco, cab); if (n) n.focus(); }
  }
  function alternarMenu(abrir, devolverFoco) {
    menuAbierto = abrir === undefined ? !menuAbierto : abrir;
    const b = $("#btn-modulos"), n = $("#nav-modulos");
    if (b) b.setAttribute("aria-expanded", String(menuAbierto));
    if (n) n.classList.toggle("abierto", menuAbierto);
    if (devolverFoco && b) b.focus();
  }
  /** Construye la estructura fija de la página (una sola vez). Conserva el nombre de la base. */
  function buildShell() {
    applyTheme(EIA.estado.get("eia_theme"));
    EIA.aplicarPreferencias();
    if ($("header.top")) return;
    document.body.insertAdjacentHTML("afterbegin", '<a class="skip" href="#contenido"></a><header class="top"></header>');
    const main = $("main");
    if (main) { main.id = "contenido"; main.setAttribute("tabindex", "-1"); }
    document.body.insertAdjacentHTML("beforeend",
      '<footer class="pie"></footer><div id="eia-vivo" class="sr" aria-live="polite" aria-atomic="true"></div>' +
      '<div id="eia-alerta" class="sr" role="alert"></div><div id="eia-notas" aria-live="polite"></div>');
    const cab = $("header.top");
    cab.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.modo) EIA.setModo(b.dataset.modo);
      else if (b.id === "tema") EIA.setTema(EIA.tema() === "dark" ? "light" : "dark");
      else if (b.id === "btn-modulos") alternarMenu();
      else if (b.id === "btn-a11y") EIA.abrirAccesibilidad();
    });
    cab.addEventListener("change", e => { if (e.target.id === "ctl-idioma") EIA.setIdioma(e.target.value); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && menuAbierto) alternarMenu(false, true);
      // Atajo con modificadores para no chocar con los lectores de pantalla (WCAG 2.1.4)
      if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === "KeyA") { e.preventDefault(); EIA.abrirAccesibilidad(); }
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
  EIA.ui.notificar = function (texto, tipo) {
    const caja = $("#eia-notas"); if (!caja) return;
    const n = document.createElement("div");
    n.className = "nota nota-" + (tipo || "info"); n.setAttribute("role", "status"); n.textContent = texto;
    caja.appendChild(n);
    setTimeout(() => n.remove(), 6000);
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
    const vencido = modo === "real" && mt.vencido ? `<span class="aviso-extra">${esc(EIA.t("aviso.real.vencido", { n: mt.antiguedad_habiles }))}</span>` : "";
    el.innerHTML = `<span class="aviso-ico" aria-hidden="true">⚠</span><span>${esc(EIA.t(clave, { fecha }))} ${vencido}</span>`;
    return el;
  };

  /** Estado de error del módulo. Con datos reales ausentes ofrece volver al Modo profesor (no cambia solo). */
  EIA.ui.error = function (e) {
    const main = $("main"); if (!main) return;
    $$(".estado-error", main).forEach(n => n.remove());
    const t = EIA.t, sinReales = e && e.codigo === "sin-datos-reales";
    const caja = document.createElement("div");
    caja.className = "estado-error card"; caja.setAttribute("role", "alert");
    if (sinReales) {
      // Publicación parcial: hay meta.json pero no el archivo de este módulo. Los avisos dejan de hablar de modelos reales.
      if (EIA.modo() === "real" && (metaLista.real || {}).disponible && !_parcial) {
        _parcial = true;
        const av = $(":scope > .aviso", main); if (av) EIA.ui.aviso(av.dataset.aviso);
        const pie = $("footer.pie"); if (pie) pie.innerHTML = plantillaPie();
      }
      caja.innerHTML = `<h2>${esc(t("error.sin_reales_titulo"))}</h2><p>${esc(t("error.sin_reales_texto", { archivo: e.archivo }))}</p><button type="button" class="primary" data-volver>${esc(t("error.volver_profesor"))}</button>`;
      $("[data-volver]", caja).addEventListener("click", () => EIA.setModo("profesor"));
    } else {
      const msj = e && e.codigo === "http" ? t("error.http", { archivo: e.archivo, estado: e.estado })
        : e && e.codigo === "json" ? t("error.json", { archivo: e.archivo }) : String((e && e.message) || e);
      caja.innerHTML = `<h2>${esc(t("error.titulo"))}</h2><p>${esc(msj)}</p><p class="mut">${esc(t("error.servidor"))}</p>`;
      if (global.console) console.error(e);
    }
    const ref = $(":scope > .aviso", main) || $("h1", main);
    if (ref) ref.after(caja); else main.prepend(caja);
    main.classList.add("sin-datos");
  };
  /** Compatibilidad con la base. */
  const showError = e => EIA.ui.error(e);

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

  /** Contenedor de gráfico con pestañas Gráfico | Tabla | Resumen y botón Escuchar.
      cfg = {id, titulo, alto, opciones(colores) → option de ECharts, tabla() → cfg de EIA.ui.tabla, resumen() → texto, sonido() → {valores}} */
  EIA.ui.grafico = function (destino, cfg) {
    const t = EIA.t, id = cfg.id || "graf-" + (++_uid);
    const pest = [["g", "grafico.pestana_grafico"], ["t", "grafico.pestana_tabla"], ["r", "grafico.pestana_resumen"]];
    let activa = "g", inst = null, sonando = null;
    const montaje = montar(destino), senal = { signal: montaje.control.signal };
    destino.innerHTML = `<section class="card grafico" id="${esc(id)}" aria-labelledby="${esc(id)}-h">
  <div class="graf-cab"><h2 id="${esc(id)}-h">${esc(cfg.titulo)}</h2>
    <div class="graf-ctl"><div class="seg" role="tablist" aria-label="${esc(t("grafico.vistas"))}">${
      pest.map(([k, clave]) => `<button type="button" role="tab" id="${esc(id)}-tab-${k}" data-pest="${k}" aria-selected="${k === activa}" aria-controls="${esc(id)}-p-${k}" tabindex="${k === activa ? 0 : -1}">${esc(t(clave))}</button>`).join("")}</div>
      ${cfg.sonido ? `<button type="button" class="escuchar" aria-pressed="false"><span aria-hidden="true">♪</span> ${esc(t("grafico.escuchar"))}</button>` : ""}</div></div>
  <div role="tabpanel" id="${esc(id)}-p-g" aria-labelledby="${esc(id)}-tab-g"><div class="chart" role="img" style="height:${Number(cfg.alto) || 352}px"></div></div>
  <div role="tabpanel" id="${esc(id)}-p-t" aria-labelledby="${esc(id)}-tab-t" hidden></div>
  <div role="tabpanel" id="${esc(id)}-p-r" aria-labelledby="${esc(id)}-tab-r" tabindex="0" hidden><p class="resumen"></p></div>
</section>`;
    const lienzo = $(".chart", destino);
    function dibujar() {
      const resumen = cfg.resumen ? cfg.resumen() : cfg.titulo;
      lienzo.setAttribute("aria-label", resumen);
      if (!global.echarts) { lienzo.textContent = t("grafico.sin_echarts"); return; }
      if (!inst) inst = global.echarts.init(lienzo);
      const a11y = EIA.estado.get("eia_a11y") || {};
      const base = { animation: !EIA.movimientoReducido(), aria: { enabled: true, decal: { show: !!a11y.decal } } };
      inst.setOption(Object.assign(base, cfg.opciones(EIA.coloresGrafico())), true);
    }
    function pintarPanel() {
      if (activa === "g") { dibujar(); if (inst) inst.resize(); }
      else if (activa === "t" && cfg.tabla) EIA.ui.tabla($("#" + id + "-p-t", destino), cfg.tabla());
      else if (activa === "r") $(".resumen", destino).textContent = cfg.resumen ? cfg.resumen() : "";
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
    destino.addEventListener("click", e => {
      const b = e.target.closest("[data-pest]");
      if (b && destino.contains(b)) elegir(b.dataset.pest);
      const s = e.target.closest(".escuchar");
      if (s && destino.contains(s)) {
        if (sonando) { sonando.detener(); sonando = null; s.setAttribute("aria-pressed", "false"); return; }
        s.setAttribute("aria-pressed", "true");
        EIA.cargar("js/a11y/sonificacion.js").then(() => {
          sonando = EIA.sonar(cfg.sonido().valores, { alTerminar() { sonando = null; s.setAttribute("aria-pressed", "false"); } });
        }).catch(err => { s.setAttribute("aria-pressed", "false"); EIA.ui.notificar(String(err.message || err), "error"); });
      }
    }, senal);
    destino.addEventListener("keydown", e => {
      const b = e.target.closest("[data-pest]"); if (!b) return;
      const i = pest.findIndex(p => p[0] === b.dataset.pest);
      const j = e.key === "ArrowRight" ? (i + 1) % pest.length : e.key === "ArrowLeft" ? (i + pest.length - 1) % pest.length
        : e.key === "Home" ? 0 : e.key === "End" ? pest.length - 1 : -1;
      if (j >= 0) { e.preventDefault(); elegir(pest[j][0], true); }
    }, senal);
    const cancelarTema = EIA.on("eia:tema", () => { if (activa === "g") dibujar(); });
    let observador = null;
    if (global.ResizeObserver) { observador = new ResizeObserver(() => { if (inst && activa === "g") inst.resize(); }); observador.observe(lienzo); }
    function destruir() {
      cancelarTema();
      if (sonando) { sonando.detener(); sonando = null; }
      if (observador) { observador.disconnect(); observador = null; }
      if (inst) { inst.dispose(); inst = null; }
    }
    montaje.alDesmontar = destruir; // si se vuelve a montar sobre el mismo nodo, se libera el gráfico anterior
    dibujar();
    return { redibujar() { pintarPanel(); }, instancia: () => inst, destruir };
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
      if (vuelta === _vuelta && main) main.removeAttribute("aria-busy");
    }
  }
  /** Registra el módulo de la página: {id, cargar: async () => datos, pintar: datos => void}.
      cargar se repite al cambiar de modo o de corte; pintar, además, al cambiar de idioma. */
  EIA.modulo = function (def) { _modulo = def; if (_listo) correr(true); };
  /** Vuelve a pintar el módulo con los datos ya cargados. */
  EIA.repintar = () => (_modulo ? correr(false) : undefined);

  async function arrancar() {
    buildShell();
    try { await EIA.cargarIdioma(EIA.idioma()); }
    catch (e) {
      // Último recurso: sin diccionario no hay textos; se informa en los dos idiomas.
      const m = $("main");
      if (m) m.insertAdjacentHTML("afterbegin", '<p class="err" role="alert">No se pudo cargar i18n/. Abra el sitio desde un servidor (GitHub Pages o <code>python -m http.server</code>). / Could not load i18n/. Open the site from a web server.</p>');
      return;
    }
    document.documentElement.lang = EIA.idioma();
    pintarShell();
    EIA.traducir();
    EIA.on("eia:modo", () => { if (_modulo) correr(true); else global.location.reload(); });
    EIA.on("eia:corte", () => { if (_modulo) correr(true); else global.location.reload(); });
    EIA.on("eia:idioma", () => { if (_modulo) correr(false); else global.location.reload(); });
    _listo = true;
    EIA.emit("eia:listo");
    await EIA.meta();
    pintarShell();
    if (_modulo) await correr(true);
    else {
      // Páginas de la base que aún usan window.init
      EIA.ui.aviso(document.body.dataset.page || "generico");
      if (global.init) { try { await global.init(); } catch (e) { EIA.ui.error(e); } }
    }
    reanudarAccesibilidad();
  }

  /* ───────────── Publicación ───────────── */
  const api = { EIA, PAGES, $, $$, fmt, loadJSON, store, applyTheme, buildShell, showError };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (hayDOM) {
    Object.assign(global, api);
    document.addEventListener("DOMContentLoaded", arrancar);
  }
})(typeof window !== "undefined" ? window : globalThis);
