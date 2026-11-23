/* js/a11y/voz.js — comandos de voz (PLAN_MAESTRO §9.7; D-07 b; T-90).
   Web Speech API (SpeechRecognition / webkitSpeechRecognition) en el idioma activo. Cada frase reconocida se interpreta
   con la gramática de i18n (voz.g_* y voz.m_*, alternativas separadas por «|») y se convierte en una acción: los comandos
   de navegación y foco se emiten en el bus (bus-entrada.js), como las demás modalidades.
   · Consentimiento previo: en Chrome y Edge el audio lo procesa el servicio de reconocimiento del navegador (servidores
     de Google o Microsoft). El sitio no graba ni envía audio por su cuenta. En Firefox no existe: el Centro lo explica.
   · Indicador fijo «Escuchando» con Pausa, Comandos y Detener; Esc o «detener voz» lo apagan; Alt+Shift+V lo alterna.
   · Confirmación visual (indicador y notificación) y hablada (síntesis de voz). Mientras el sitio habla, no se escucha,
     para que no se oiga a sí mismo.
   · Se reanuda al cambiar de página (sessionStorage.eia_voz).
   Formato dual: lo puro (normalizar, interpretar) se prueba en Node. */
(function (global) {
  "use strict";
  const MODULOS = ["dashboard", "watchlist", "trading", "leaderboard", "clasificacion", "regresion", "optimizador", "portafolios", "backtesting",
    "activo", "comparador", "ordenes", "perfil", "configuracion", "ayuda", "acerca"];

  /** Minúsculas, sin tildes ni signos, espacios simples. Pura. */
  function normalizar(texto) {
    // NFKC (ancho completo → normal), minúsculas, NFD y sin marcas combinantes (tildes, tashkeel árabe, niqqud hebreo):
    // vale para cualquier escritura (Lab 13: normalización Unicode). En árabe se unifican las formas del alef y la ta marbuta.
    return String(texto || "").normalize("NFKC").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
      .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
      .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  }
  /** ¿El texto está en una escritura sin espacios entre palabras (chino, japonés)? Pura. */
  const sinEspacios = t => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(t);
  /** Activo dicho por ticker («NVDA», «n v d a») o por empresa («Apple»). activos = [{ticker, nombre}]. Pura. */
  function buscarActivo(texto, activos) {
    const t = normalizar(texto); if (!t) return null;
    const letras = /^([a-z] )+[a-z]$/.test(t) ? t.replace(/ /g, "") : t.replace(/ /g, "");
    const porTicker = (activos || []).find(a => normalizar(a.ticker).replace(/ /g, "") === letras);
    if (porTicker) return porTicker.ticker;
    const porNombre = (activos || []).find(a => { const n = normalizar(a.nombre); return n === t || (t.length >= 3 && (n.startsWith(t + " ") || n.split(" ")[0] === t)); });
    return porNombre ? porNombre.ticker : null;
  }

  /* ── Coincidencia de «clic en …» (T-90b): por palabras, con números dichos en palabras y ordinales ── */
  const NUM = {
    es: { cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13,
      catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23,
      veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50,
      sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
      seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900 },
    en: { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
      fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
      seventy: 70, eighty: 80, ninety: 90 }
  };
  const MIL = { es: "mil", en: "thousand" }, CIEN_EN = "hundred";
  const ORD = {
    es: { primero: 1, primera: 1, primer: 1, segundo: 2, segunda: 2, tercero: 3, tercera: 3, tercer: 3, cuarto: 4, cuarta: 4, quinto: 5, quinta: 5,
      sexto: 6, sexta: 6, septimo: 7, septima: 7, octavo: 8, octava: 8, noveno: 9, novena: 9, decimo: 10, decima: 10, ultimo: -1, ultima: -1 },
    en: { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, last: -1 }
  };
  const VACIAS = {
    es: new Set(["de", "del", "la", "el", "los", "las", "en", "a", "al", "y", "e", "o", "un", "una", "unos", "unas", "por", "para", "con", "su", "sus", "boton", "enlace", "opcion"]),
    en: new Set(["the", "of", "to", "a", "an", "and", "or", "on", "in", "for", "with", "button", "link", "option"])
  };
  const UNIDADES = {
    es: { mes: "m", meses: "m", ano: "a", anos: "a", semana: "s", semanas: "s", dia: "d", dias: "d" },
    en: { month: "m", months: "m", year: "y", years: "y", week: "w", weeks: "w", day: "d", days: "d" }
  };
  /** Números dichos, ordinales y palabras vacías solo están en español e inglés; en los demás idiomas el reconocedor
      entrega las cifras y no se quitan palabras. */
  const lengua = idioma => { const b = String(idioma || "es").slice(0, 2); return b === "en" ? "en" : b === "es" ? "es" : "otra"; };
  /** Números dichos con palabras → cifras: «treinta y siete» → 37, «dos mil veinticinco» → 2025. Texto ya normalizado. Pura. */
  function palabrasANumeros(texto, idioma) {
    const L = lengua(idioma), num = NUM[L], salida = [], tk = String(texto || "").split(" ").filter(Boolean);
    if (!num) return String(texto || "");
    let actual = null, total = 0;
    const cerrar = () => { if (actual !== null || total) { salida.push(String(total + (actual || 0))); actual = null; total = 0; } };
    for (let i = 0; i < tk.length; i++) {
      const w = tk[i];
      if (w in num) { const v = num[w]; actual = actual === null ? v : (v < 10 && actual % 10 === 0 && actual >= 20 ? actual + v : (v < 100 && actual >= 100 && actual % 100 === 0 ? actual + v : (cerrar(), v))); continue; }
      if (/^\d+$/.test(w) && actual === null && !total) { salida.push(w); continue; }
      if (L === "es" && w === "y" && actual !== null && actual >= 20 && actual % 10 === 0 && tk[i + 1] in num && num[tk[i + 1]] < 10) continue; // «treinta y siete»
      if (w === MIL[L] && (actual !== null || tk[i + 1] in num)) { total += (actual === null ? 1 : actual) * 1000; actual = null; continue; }
      if (L === "en" && w === CIEN_EN && actual !== null) { actual *= 100; continue; }
      cerrar(); salida.push(w);
    }
    cerrar();
    return salida.join(" ");
  }
  /** «el segundo comprar», «comprar número dos», «la última» → {indice (1, 2… o −1 = último), resto}. Pura. */
  function extraerOrdinal(texto, idioma) {
    const L = lengua(idioma), ord = ORD[L] || {}, t = palabrasANumeros(normalizar(texto), L), tk = t.split(" ").filter(Boolean);
    let indice = null;
    const resto = [];
    for (let i = 0; i < tk.length; i++) {
      const w = tk[i];
      if (indice === null && w in ord) { indice = ord[w]; continue; }
      if (indice === null && (w === "numero" || w === "number" || w === "nro") && /^\d+$/.test(tk[i + 1] || "")) { indice = Number(tk[i + 1]); i++; continue; }
      resto.push(w);
    }
    return { indice, resto: resto.join(" ") };
  }
  /** Palabras significativas: normalizadas, números en cifras y sin artículos ni preposiciones. Pura. */
  function palabras(texto, idioma) {
    const L = lengua(idioma);
    const tk = palabrasANumeros(normalizar(texto), L).split(" ").filter(Boolean), salida = [];
    const uno = L === "es" ? ["un", "una"] : L === "en" ? ["a", "an"] : [], unidades = UNIDADES[L] || {}, vacias = VACIAS[L] || new Set();
    // «3 meses» → «3m» y «un año» → «1a»: así coincide con los botones de periodo «1M», «3M», «1A»
    for (let i = 0; i < tk.length; i++) {
      const cantidad = /^\d+$/.test(tk[i]) ? tk[i] : uno.includes(tk[i]) ? "1" : null;
      if (cantidad && unidades[tk[i + 1]]) { salida.push(cantidad + unidades[tk[i + 1]]); i++; }
      else if (!vacias.has(tk[i])) salida.push(tk[i]);
    }
    return salida;
  }
  /** Qué tan bien coincide lo dicho con el nombre de un control (0 = nada; ≥ 1 = la frase completa está). Pura.
      Cuenta las palabras dichas que aparecen (iguales, abreviadas como «nov» por «noviembre», o en plural) y compara
      también sin espacios para que «3 m» encuentre «3M». Penaliza un poco los nombres con muchas palabras de más. */
  function puntuar(dicho, nombre, idioma) {
    if (sinEspacios(String(dicho)) || sinEspacios(String(nombre))) {
      const q = normalizar(dicho).replace(/ /g, ""), n = normalizar(nombre).replace(/ /g, "");
      if (!q || !n) return 0;
      if (q === n) return 1.5;
      return n.includes(q) ? Math.max(0.6, 1 - Math.min(0.3, (n.length - q.length) / (4 * n.length))) : q.includes(n) && n.length >= 2 ? 0.7 : 0;
    }
    const Q = palabras(dicho, idioma), N = palabras(nombre, idioma);
    if (!Q.length || !N.length) return 0;
    const raiz = w => w.replace(/(es|s)$/, "");
    const parecido = (a, b) => a === b || (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) || (a.length > 3 && raiz(a) === raiz(b));
    let s = Q.filter(q => N.some(n => parecido(q, n))).length / Q.length;
    const cq = Q.join(""), cn = N.join("");
    // Sin espacios, pero solo sobre palabras completas seguidas del nombre: «3 m» = «3M»; en cambio «…63 mínimo…» no es «3m»
    const seguidas = () => { for (let i = 0; i < N.length; i++) { let j = ""; for (let k = i; k < N.length && j.length < cq.length; k++) { j += N[k]; if (j === cq) return true; } } return false; };
    if (cq === cn) s = 1.5; else if (cq.length >= 2 && seguidas()) s = Math.max(s, 1.1);
    return s - Math.min(0.2, 0.02 * Math.max(0, N.length - Q.length));
  }
  const UMBRAL_CLIC = 0.6; // menos: la frase y el nombre comparten muy poco
  /** De una lista [{nombres:[…]}] (en orden del documento), las mejores coincidencias empatadas. Pura. */
  function mejoresCoincidencias(dicho, items, idioma) {
    const con = items.map((it, i) => ({ it, i, s: Math.max.apply(null, it.nombres.map(n => puntuar(dicho, n, idioma))) })).filter(x => x.s >= UMBRAL_CLIC);
    if (!con.length) return [];
    const top = Math.max.apply(null, con.map(x => x.s));
    return con.filter(x => top - x.s < 1e-9).sort((a, b) => a.i - b.i).map(x => x.it);
  }

  /** Frase → acción. G = {g_*: "alt1|alt2", m_<modulo>: "…"} del idioma activo. Devuelve null si no se entiende. Pura. */
  function interpretar(texto, G, activos) {
    const t = normalizar(texto); if (!t) return null;
    const juntas = sinEspacios(t);
    const alt = k => (G[k] ? G[k].split("|").map(normalizar).filter(Boolean).sort((a, b) => b.length - a.length) : []);
    const prefijo = k => alt(k).find(p => t === p || t.startsWith(p + " ") || (juntas && t.startsWith(p) && t !== p));
    // El verbo al final («分類を開く», «분류 열기»): el argumento va antes
    const sufijo = k => alt(k).find(p => t.endsWith(" " + p) || (juntas && t.endsWith(p) && t !== p));
    const argumento = k => { let p = prefijo(k); if (p) return t.slice(p.length).trim(); p = sufijo(k); return p ? t.slice(0, t.length - p.length).trim() : null; };
    const igual = k => alt(k).includes(t);
    // Gana el nombre más largo que coincida: «注文履歴» es el historial de órdenes, aunque «注文» también nombre a Trading
    const modulo = s => {
      const r = s.replace(/^(el|la|los|las|al|the)\s+/, "");
      let mejor = null, largo = 0;
      for (const id of MODULOS) for (const n of alt("m_" + id)) {
        if (n.length > largo && (r === n || r.startsWith(n + " ") || (juntas && r.startsWith(n)))) { mejor = id; largo = n.length; }
      }
      return mejor;
    };
    let resto;
    // 1) Comandos con argumento
    if ((resto = argumento("g_ir"))) { const m = modulo(resto); if (m) return { accion: "ir", modulo: m }; }
    if ((resto = argumento("g_idioma"))) return { accion: "idioma", texto: resto };
    if ((resto = argumento("g_buscar"))) return { accion: "buscar", texto: resto };
    if ((resto = argumento("g_clic"))) return { accion: "clic", texto: resto };
    if ((resto = argumento("g_activo"))) return { accion: "activo", valor: buscarActivo(resto, activos), texto: resto };
    // 2) Comandos fijos
    const fijos = [["g_siguiente", { accion: "siguiente" }], ["g_anterior", { accion: "anterior" }], ["g_volver", { accion: "volver" }],
      ["g_bajar", { accion: "desplazar", sentido: 1 }], ["g_subir", { accion: "desplazar", sentido: -1 }],
      ["g_tema_oscuro", { accion: "tema", valor: "dark" }], ["g_tema_claro", { accion: "tema", valor: "light" }],
      ["g_modo_real", { accion: "modo", valor: "real" }], ["g_modo_profesor", { accion: "modo", valor: "profesor" }],
      ["g_solo_ml", { accion: "familia", valor: "ML" }], ["g_solo_dl", { accion: "familia", valor: "DL" }], ["g_todos", { accion: "familia", valor: "todos" }],
      ["g_leer", { accion: "leer" }], ["g_escuchar", { accion: "escuchar" }], ["g_llevar", { accion: "llevar" }],
      ["g_ayuda", { accion: "ayuda" }], ["g_detener", { accion: "detener" }],
      ["g_ingles", { accion: "idioma", valor: "en-US" }], ["g_espanol", { accion: "idioma", valor: "es-PE" }]];
    for (const [k, r] of fijos) if (igual(k)) return Object.assign({}, r);
    // 3) Solo el nombre de un módulo o de un activo
    const m = modulo(t); if (m && alt("m_" + m).includes(t)) return { accion: "ir", modulo: m };
    const a = buscarActivo(t, activos); if (a) return { accion: "activo", valor: a, texto: t };
    return null;
  }

  const api = { normalizar, buscarActivo, interpretar, palabrasANumeros, extraerOrdinal, palabras, puntuar, mejoresCoincidencias, MODULOS, UMBRAL_CLIC };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  const EIA = global.EIA;
  if (!EIA || !global.document || EIA.voz) return;
  const t = (k, p) => EIA.t(k, p), esc = EIA.esc, $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const CLAVE = "eia_voz", CLAVE_OK = "eia_voz_ok", DESPLAZAMIENTO = 0.6; // fracción de la ventana por «bajar» / «subir»
  const sesion = { get: k => { try { return global.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { if (v == null) global.sessionStorage.removeItem(k); else global.sessionStorage.setItem(k, v); } catch (e) { /* sin sesión */ } } };
  const Reconocedor = global.SpeechRecognition || global.webkitSpeechRecognition;

  let rec = null, activo = false, pausado = false, hablando = false, chip = null, activos = [], reinicios = 0;
  /** Gramática del idioma activo (claves voz.g_* y voz.m_*). */
  function gramatica() {
    const G = {};
    ["g_ir", "g_clic", "g_activo", "g_siguiente", "g_anterior", "g_volver", "g_bajar", "g_subir", "g_tema_oscuro", "g_tema_claro",
      "g_modo_real", "g_modo_profesor", "g_solo_ml", "g_solo_dl", "g_todos", "g_leer", "g_escuchar", "g_llevar", "g_ayuda", "g_detener",
      "g_ingles", "g_espanol", "g_cancelar", "g_idioma", "g_buscar"].concat(MODULOS.map(m => "m_" + m)).forEach(k => { G[k] = t("voz." + k); });
    return G;
  }

  /* ── Indicador fijo (se crea una vez; después solo cambian textos) ── */
  function crearChip() {
    chip = document.createElement("div"); chip.id = "eia-voz"; chip.setAttribute("role", "region"); chip.setAttribute("aria-label", t("voz.titulo"));
    chip.innerHTML = '<p class="voz-cab"><span class="voz-punto" aria-hidden="true">●</span> <span class="voz-estado" role="status" aria-live="polite"></span></p><p class="voz-oido mut"></p>'
      + '<div class="voz-botones"><button type="button" data-voz="pausa"></button><button type="button" data-voz="ayuda"></button><button type="button" data-voz="detener"></button></div>';
    document.body.appendChild(chip);
    chip.addEventListener("click", e => {
      const b = e.target.closest("button[data-voz]"); if (!b) return;
      if (b.dataset.voz === "detener") detener();
      else if (b.dataset.voz === "ayuda") ayuda();
      else alternarPausa();
    });
  }
  function pintarChip(oido) {
    if (!chip) crearChip();
    // En el celular el recuadro de la cámara ocupa el ancho de abajo: si está activo, el indicador va encima
    const hud = document.getElementById("eia-hud");
    chip.style.bottom = hud && global.innerWidth < 640 ? (hud.offsetHeight + 24) + "px" : "";
    chip.querySelector(".voz-estado").textContent = t(pausado ? "voz.pausado" : "voz.escuchando");
    chip.classList.toggle("pausado", pausado);
    if (oido !== undefined) chip.querySelector(".voz-oido").textContent = oido;
    const bp = chip.querySelector('[data-voz="pausa"]');
    bp.textContent = t(pausado ? "voz.reanudar" : "voz.pausa"); bp.setAttribute("aria-pressed", String(pausado));
    chip.querySelector('[data-voz="ayuda"]').textContent = t("voz.comandos");
    chip.querySelector('[data-voz="detener"]').textContent = t("voz.detener");
  }

  /** Confirma un comando: en el indicador, en la región viva y en voz alta (sin escuchar mientras habla). */
  function confirmar(texto, tipo) {
    pintarChip(texto);
    EIA.ui.anunciar(texto);
    if (tipo === "error") EIA.ui.notificar(texto, "error");
    hablar(texto);
  }
  function hablar(texto) {
    if (!texto || !EIA.hayVoz()) return;
    hablando = true; pararReconocimiento();
    const l = EIA.leerEnVozAlta(texto, { alTerminar() { hablando = false; if (activo && !pausado) arrancar(); } });
    if (!l) { hablando = false; if (activo && !pausado) arrancar(); }
  }

  /* ── Ejecución de las acciones ── */
  const nombreAccesible = el => (el.getAttribute("aria-label") || (el.labels && el.labels[0] && el.labels[0].textContent) || el.textContent || el.value || el.title || "");
  const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  /** Controles visibles que se pueden pulsar por voz y, de cada lista desplegable, también sus opciones.
      Cada uno con sus nombres posibles: el accesible (aria-label o etiqueta) y el texto visible, que pueden diferir. */
  function candidatos() {
    const raiz = document.querySelector("dialog[open]") || document;
    const lista = [];
    // Solo lo que se activa: las regiones desplazables y los lienzos de gráficos (tabindex sin rol de control) no se «pulsan»
    Array.from(raiz.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),summary,[role="tab"],[role="button"],[role="link"],[role="option"],[role="menuitem"]'))
      .filter(el => visible(el) && !el.closest("#eia-voz")).forEach(el => {
        const nombres = [nombreAccesible(el), el.textContent || ""].map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean);
        if (nombres.length) lista.push({ el, nombres, tipo: "control" });
        if (el.tagName === "SELECT") {
          const etiqueta = nombreAccesible(el).trim();
          Array.from(el.options).forEach(op => { const tx = op.textContent.trim(); if (tx) lista.push({ el, opcion: op, nombres: [tx, etiqueta + " " + tx], tipo: "opcion" }); });
        }
      });
    return lista;
  }
  /* Elección cuando hay varios con el mismo nombre: se numeran en pantalla y se espera «uno», «dos»… o «cancelar» */
  const ESPERA_ELECCION_MS = 20000;
  let eleccion = null; // {cand: [...], hasta}
  function quitarMarcas() { $$(".voz-marca").forEach(m => m.remove()); }
  function marcar(cand) {
    quitarMarcas();
    cand.forEach((c, i) => {
      const r = c.el.getBoundingClientRect(), m = document.createElement("span");
      m.className = "voz-marca"; m.setAttribute("aria-hidden", "true"); m.textContent = EIA.fmt.ent(i + 1);
      m.style.left = (r.left + global.scrollX - 6) + "px"; m.style.top = (r.top + global.scrollY - 10) + "px";
      document.body.appendChild(m);
    });
  }
  function terminarEleccion() { eleccion = null; quitarMarcas(); }
  function nombreDe(c) { return (c.tipo === "opcion" ? c.opcion.textContent : nombreAccesible(c.el)).replace(/\s+/g, " ").trim().slice(0, 60); }
  function pulsarCandidato(c) {
    terminarEleccion();
    if (c.tipo === "opcion") {
      c.el.value = c.opcion.value; c.el.dispatchEvent(new Event("change", { bubbles: true }));
      confirmar(t("voz.ok_opcion", { opcion: nombreDe(c), campo: nombreAccesible(c.el).replace(/\s+/g, " ").trim().slice(0, 40) }));
      return;
    }
    const nombre = nombreDe(c);
    pulsar(c.el); confirmar(t("voz.ok_clic", { nombre }));
  }
  /** «clic en …»: la mejor coincidencia; si hay varias empatadas, el ordinal dicho («el segundo») o una elección numerada. */
  function clicPorVoz(texto) {
    const L = EIA.idioma(), o = extraerOrdinal(texto, L);
    const buscar = q => mejoresCoincidencias(q, candidatos(), L);
    let cand = o.indice !== null && o.resto ? buscar(o.resto) : [];
    let indice = cand.length ? o.indice : null;
    if (!cand.length) { cand = buscar(texto); indice = null; } // «clic en primer nivel»: el ordinal era parte del nombre
    if (!cand.length) { confirmar(t("voz.no_clic", { texto }), "error"); return; }
    if (indice !== null) {
      const c = indice === -1 ? cand[cand.length - 1] : cand[indice - 1];
      if (!c) { confirmar(t("voz.elegir_fuera", { n: EIA.fmt.ent(cand.length) }), "error"); return; }
      pulsarCandidato(c); return;
    }
    if (cand.length === 1) { pulsarCandidato(cand[0]); return; }
    eleccion = { cand: cand.slice(0, 9), hasta: Date.now() + ESPERA_ELECCION_MS };
    marcar(eleccion.cand);
    confirmar(t("voz.elegir", { n: eleccion.cand.length, texto }));
  }
  /** Respuesta a una elección pendiente: un número, un ordinal o «cancelar». Devuelve true si la atendió. */
  function responderEleccion(oido) {
    if (!eleccion) return false;
    if (Date.now() > eleccion.hasta) { terminarEleccion(); return false; }
    const L = EIA.idioma(), G = gramatica(), n = normalizar(oido);
    if ((G.g_cancelar || "").split("|").map(normalizar).includes(n)) { terminarEleccion(); confirmar(t("voz.elegir_cancelado")); return true; }
    const o = extraerOrdinal(n, L), cifra = (palabrasANumeros(n, L).match(/\d+/) || [])[0];
    const i = o.indice !== null ? o.indice : cifra ? Number(cifra) : null;
    if (i === null) { terminarEleccion(); return false; } // otra orden: se olvida la elección y se interpreta normal
    const c = i === -1 ? eleccion.cand[eleccion.cand.length - 1] : eleccion.cand[i - 1];
    if (!c) { confirmar(t("voz.elegir_fuera", { n: EIA.fmt.ent(eleccion.cand.length) }), "error"); return true; }
    pulsarCandidato(c);
    return true;
  }
  function pulsar(el) {
    if (el.tagName === "SELECT") { EIA.ui.opcionesSelect(el); return; }
    el.focus({ preventScroll: false });
    if (el.matches('input[type="text"],input[type="number"],input[type="search"],textarea')) return; // se enfoca para escribir
    el.click();
  }
  async function bus(comando, datos) { await EIA.cargar("js/a11y/bus-entrada.js"); EIA.bus.emitir(comando, datos || {}); }
  const nombreModulo = id => t(((global.PAGINAS_NAV || []).find(p => p[2] === id) || global.PAGES.find(p => p[2] === id) || [])[1] || id);

  async function ejecutar(a, oido) {
    switch (a.accion) {
      case "ir":
        sesion.set(CLAVE, "1"); // se reanuda en la página nueva
        confirmar(t("voz.ok_ir", { modulo: nombreModulo(a.modulo) }));
        await bus("IR_A_MODULO", { id: a.modulo }); return;
      case "buscar": confirmar(t("voz.ok_buscar", { texto: a.texto })); EIA.abrirBuscador(a.texto); return;
      case "siguiente": await bus("SIGUIENTE"); pintarChip(t("voz.ok_siguiente")); return;
      case "anterior": await bus("ANTERIOR"); pintarChip(t("voz.ok_anterior")); return;
      case "volver": await bus("VOLVER"); pintarChip(t("voz.ok_volver")); return;
      case "desplazar": await bus("DESPLAZAR", { dy: a.sentido * global.innerHeight * DESPLAZAMIENTO }); pintarChip(t(a.sentido > 0 ? "voz.ok_bajar" : "voz.ok_subir")); return;
      case "tema": EIA.setTema(a.valor); confirmar(t(a.valor === "dark" ? "voz.ok_tema_oscuro" : "voz.ok_tema_claro")); return;
      case "modo": EIA.setModo(a.valor); confirmar(t(a.valor === "real" ? "voz.ok_modo_real" : "voz.ok_modo_profesor")); return;
      case "idioma": {
        if (!a.valor) {
          const dicho = normalizar(a.texto);
          const tag = EIA.IDIOMAS.find(x => [EIA.endonimo(x), EIA.nombreIdioma(x), EIA.nombreIdioma(x.split("-")[0])].some(n => { const m = normalizar(n); return m && (m === dicho || m.startsWith(dicho) || dicho.startsWith(m)); }));
          if (!tag) { confirmar(t("voz.no_entendi", { texto: oido }), "error"); return; }
          a.valor = tag;
        }
        await EIA.setIdioma(a.valor);
        reiniciarIdioma();
        confirmar(t("voz.ok_idioma")); return;
      }
      case "familia": {
        const b = $(`#filtro-familia button[data-valor="${a.valor}"]`);
        if (!b) { confirmar(t("voz.no_aqui"), "error"); return; }
        b.click(); confirmar(a.valor === "todos" ? t("voz.ok_todos") : t("voz.ok_familia", { familia: a.valor })); return;
      }
      case "activo": {
        if (!a.valor) { confirmar(t("voz.no_activo", { texto: a.texto }), "error"); return; }
        const sel = $("#activo"), boton = $(`button[data-ticker="${a.valor}"]`);
        if (sel && Array.from(sel.options).some(o => o.value === a.valor)) { sel.value = a.valor; sel.dispatchEvent(new Event("change", { bubbles: true })); }
        else if (boton) boton.click();
        else { EIA.setActivo(a.valor); sesion.set(CLAVE, "1"); const u = new URL(global.location.href); u.searchParams.set("t", a.valor); global.location.href = u.pathname + u.search; }
        confirmar(t("voz.ok_activo", { ticker: a.valor })); return;
      }
      case "leer":
        await EIA.cargar("js/a11y/panel.js");
        pintarChip(t("voz.ok_leer")); hablar(EIA.a11y.resumenPagina()); return;
      case "escuchar": {
        const b = $(".escuchar");
        if (!b) { confirmar(t("voz.no_aqui"), "error"); return; }
        b.click(); pintarChip(t("voz.ok_escuchar")); return; // sin hablar: se oiría encima del sonido del gráfico
      }
      case "llevar": {
        const b = $("#llevar") || $("#llevar-punto");
        if (!b) { confirmar(t("voz.no_aqui"), "error"); return; }
        b.click(); confirmar(t("voz.ok_llevar")); return;
      }
      case "clic": clicPorVoz(a.texto); return;
      case "ayuda": ayuda(); return;
      case "detener": detener(); return;
      default: confirmar(t("voz.no_entendi", { texto: oido }), "error");
    }
  }
  /** Interpreta y ejecuta una frase (la usa el reconocedor y también las pruebas). */
  async function ejecutarTexto(texto) {
    const oido = String(texto || "").trim(); if (!oido) return null;
    pintarChip(t("voz.oido", { texto: oido }));
    if (responderEleccion(oido)) return { accion: "eleccion" };
    const a = interpretar(oido, gramatica(), activos);
    if (!a) { confirmar(t("voz.no_entendi", { texto: oido }), "error"); return null; }
    await ejecutar(a, oido);
    return a;
  }

  /** Tarjeta con lo que se puede decir. */
  function ayuda() {
    const filas = ["ir", "nav", "activo", "vista", "filtros", "lectura", "acciones", "detener"].map(k => `<li>${esc(t("voz.ayuda_" + k))}</li>`).join("");
    EIA.ui.dialogo({ titulo: t("voz.ayuda_titulo"), contenido: `<p class="mut">${esc(t("voz.ayuda_intro"))}</p><ul class="voz-ayuda">${filas}</ul>`, acciones: [{ texto: t("comun.cerrar"), valor: "", primario: true }] }).abrir();
  }

  /* ── Reconocimiento ── */
  function crearReconocedor() {
    const r = new Reconocedor();
    const info = EIA.infoIdioma(EIA.idioma()) || {};
    r.lang = info.voz || (EIA.esPseudo() ? EIA.fuente() : EIA.idioma()); r.continuous = true; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = e => {
      reinicios = 0;
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) ejecutarTexto(e.results[i][0].transcript);
    };
    r.onerror = e => {
      const k = e.error === "not-allowed" || e.error === "service-not-allowed" ? "voz.err_permiso" : e.error === "audio-capture" ? "voz.err_sin_micro"
        : e.error === "network" ? "voz.err_red" : null;
      if (k) { detener(true); EIA.ui.notificar(t(k), "error"); EIA.ui.anunciar(t(k), { urgente: true }); }
    };
    // Las sesiones continuas terminan tras un silencio largo: se vuelve a escuchar (con un límite para no ciclar)
    r.onend = () => { if (activo && !pausado && !hablando) { if (++reinicios > 20) { detener(true); EIA.ui.notificar(t("voz.err_general"), "error"); return; } setTimeout(arrancar, 250); } };
    return r;
  }
  function arrancar() { if (!activo || pausado || hablando) return; try { if (!rec) rec = crearReconocedor(); rec.start(); } catch (e) { /* ya estaba escuchando */ } }
  function pararReconocimiento() { if (rec) { try { rec.abort(); } catch (e) { /* ya parado */ } } }
  function reiniciarIdioma() { pararReconocimiento(); rec = null; if (activo && !pausado) setTimeout(arrancar, 250); pintarChip(); }
  function alternarPausa() { pausado = !pausado; if (pausado) pararReconocimiento(); else arrancar(); pintarChip(); EIA.ui.anunciar(t(pausado ? "voz.pausado" : "voz.escuchando")); }

  function consentimiento() {
    return new Promise(resolver => {
      EIA.ui.dialogo({
        titulo: t("voz.consent_titulo"),
        contenido: `<p>${esc(t("voz.consent_texto"))}</p><p class="mut">${esc(t("voz.consent_detener"))}</p>`,
        acciones: [{ texto: t("voz.consent_no"), valor: "no" }, { texto: t("voz.consent_si"), valor: "si", primario: true }],
        alCerrar: v => resolver(v === "si")
      }).abrir();
    });
  }
  /** Activa la voz. op = {reanudar} (al cambiar de página no se vuelve a pedir el consentimiento de la sesión). */
  async function iniciar(op) {
    const o = op || {};
    if (activo) return true;
    if (!Reconocedor) { EIA.ui.notificar(t("voz.no_disponible"), "error"); return false; }
    if (!o.reanudar && sesion.get(CLAVE_OK) !== "1") { if (!(await consentimiento())) return false; sesion.set(CLAVE_OK, "1"); }
    try { activos = (await EIA.universo()).map(a => ({ ticker: a.ticker, nombre: a.nombre })); } catch (e) { activos = []; }
    activo = true; pausado = false; reinicios = 0; sesion.set(CLAVE, "1");
    pintarChip(t("voz.ayuda_corta"));
    if (!o.reanudar) EIA.ui.anunciar(t("voz.iniciado"));
    arrancar();
    return true;
  }
  /** Apaga la voz. silencioso = true no anuncia (errores). */
  function detener(silencioso) {
    const estaba = activo;
    activo = false; pausado = false; pararReconocimiento(); rec = null;
    if (chip) { chip.remove(); chip = null; }
    terminarEleccion();
    sesion.set(CLAVE, null);
    if (estaba && !silencioso) EIA.ui.anunciar(t("voz.detenido"));
  }

  document.addEventListener("keydown", e => { if (e.key === "Escape" && activo && !document.querySelector("dialog[open]")) detener(); });
  EIA.on("eia:idioma", () => { if (activo) reiniciarIdioma(); });

  EIA.voz = { iniciar, detener, ejecutarTexto, ayuda, disponible: () => !!Reconocedor, activo: () => activo, pausado: () => pausado, alternar: () => (activo ? detener() : iniciar()) };
  Object.assign(EIA.voz, api);
})(typeof window !== "undefined" ? window : globalThis);
