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
  const MODULOS = ["dashboard", "watchlist", "trading", "leaderboard", "clasificacion", "regresion", "optimizador", "portafolios", "backtesting"];

  /** Minúsculas, sin tildes ni signos, espacios simples. Pura. */
  function normalizar(texto) {
    return String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();
  }
  /** Activo dicho por ticker («NVDA», «n v d a») o por empresa («Apple»). activos = [{ticker, nombre}]. Pura. */
  function buscarActivo(texto, activos) {
    const t = normalizar(texto); if (!t) return null;
    const letras = /^([a-z] )+[a-z]$/.test(t) ? t.replace(/ /g, "") : t.replace(/ /g, "");
    const porTicker = (activos || []).find(a => normalizar(a.ticker).replace(/ /g, "") === letras);
    if (porTicker) return porTicker.ticker;
    const porNombre = (activos || []).find(a => { const n = normalizar(a.nombre); return n === t || (t.length >= 3 && (n.startsWith(t + " ") || n.split(" ")[0] === t)); });
    return porNombre ? porNombre.ticker : null;
  }
  /** Frase → acción. G = {g_*: "alt1|alt2", m_<modulo>: "…"} del idioma activo. Devuelve null si no se entiende. Pura. */
  function interpretar(texto, G, activos) {
    const t = normalizar(texto); if (!t) return null;
    const alt = k => (G[k] ? G[k].split("|").map(normalizar).filter(Boolean).sort((a, b) => b.length - a.length) : []);
    const prefijo = k => alt(k).find(p => t === p || t.startsWith(p + " "));
    const igual = k => alt(k).includes(t);
    const modulo = s => { const r = s.replace(/^(el|la|los|las|al|the)\s+/, ""); return MODULOS.find(id => alt("m_" + id).some(n => r === n || r.startsWith(n + " "))) || null; };
    let p;
    // 1) Comandos con argumento
    if ((p = prefijo("g_ir"))) { const m = modulo(t.slice(p.length).trim()); if (m) return { accion: "ir", modulo: m }; }
    if ((p = prefijo("g_clic"))) { const resto = t.slice(p.length).trim(); if (resto) return { accion: "clic", texto: resto }; }
    if ((p = prefijo("g_activo"))) { const resto = t.slice(p.length).trim(); if (resto) return { accion: "activo", valor: buscarActivo(resto, activos), texto: resto }; }
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

  const api = { normalizar, buscarActivo, interpretar, MODULOS };
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
      "g_ingles", "g_espanol"].concat(MODULOS.map(m => "m_" + m)).forEach(k => { G[k] = t("voz." + k); });
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
  /** «clic en X»: el elemento interactivo visible cuyo nombre accesible coincide mejor (exacto, empieza, contiene). */
  function buscarControl(texto) {
    const raiz = document.querySelector("dialog[open]") || document;
    const q = normalizar(texto);
    const lista = Array.from(raiz.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),summary,[role="tab"],[tabindex]:not([tabindex="-1"])'))
      .filter(el => visible(el) && !el.closest("#eia-voz")).map(el => ({ el, n: normalizar(nombreAccesible(el)) })).filter(x => x.n);
    const exacto = lista.filter(x => x.n === q), empieza = lista.filter(x => x.n.startsWith(q)), contiene = lista.filter(x => x.n.includes(q));
    const grupo = exacto.length ? exacto : empieza.length ? empieza : contiene;
    return grupo.length ? grupo.sort((a, b) => a.n.length - b.n.length)[0].el : null;
  }
  function pulsar(el) {
    if (el.tagName === "SELECT") { EIA.ui.opcionesSelect(el); return; }
    el.focus({ preventScroll: false });
    if (el.matches('input[type="text"],input[type="number"],input[type="search"],textarea')) return; // se enfoca para escribir
    el.click();
  }
  async function bus(comando, datos) { await EIA.cargar("js/a11y/bus-entrada.js"); EIA.bus.emitir(comando, datos || {}); }
  const nombreModulo = id => t((global.PAGES.find(p => p[2] === id) || [])[1] || id);

  async function ejecutar(a, oido) {
    switch (a.accion) {
      case "ir":
        sesion.set(CLAVE, "1"); // se reanuda en la página nueva
        confirmar(t("voz.ok_ir", { modulo: nombreModulo(a.modulo) }));
        await bus("IR_A_MODULO", { id: a.modulo }); return;
      case "siguiente": await bus("SIGUIENTE"); pintarChip(t("voz.ok_siguiente")); return;
      case "anterior": await bus("ANTERIOR"); pintarChip(t("voz.ok_anterior")); return;
      case "volver": await bus("VOLVER"); pintarChip(t("voz.ok_volver")); return;
      case "desplazar": await bus("DESPLAZAR", { dy: a.sentido * global.innerHeight * DESPLAZAMIENTO }); pintarChip(t(a.sentido > 0 ? "voz.ok_bajar" : "voz.ok_subir")); return;
      case "tema": EIA.setTema(a.valor); confirmar(t(a.valor === "dark" ? "voz.ok_tema_oscuro" : "voz.ok_tema_claro")); return;
      case "modo": EIA.setModo(a.valor); confirmar(t(a.valor === "real" ? "voz.ok_modo_real" : "voz.ok_modo_profesor")); return;
      case "idioma":
        await EIA.setIdioma(a.valor);
        reiniciarIdioma();
        confirmar(t("voz.ok_idioma")); return;
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
      case "clic": {
        const el = buscarControl(a.texto);
        if (!el) { confirmar(t("voz.no_clic", { texto: a.texto }), "error"); return; }
        const nombre = nombreAccesible(el).replace(/\s+/g, " ").trim().slice(0, 60);
        pulsar(el); confirmar(t("voz.ok_clic", { nombre })); return;
      }
      case "ayuda": ayuda(); return;
      case "detener": detener(); return;
      default: confirmar(t("voz.no_entendi", { texto: oido }), "error");
    }
  }
  /** Interpreta y ejecuta una frase (la usa el reconocedor y también las pruebas). */
  async function ejecutarTexto(texto) {
    const oido = String(texto || "").trim(); if (!oido) return null;
    pintarChip(t("voz.oido", { texto: oido }));
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
    r.lang = EIA.idioma(); r.continuous = true; r.interimResults = false; r.maxAlternatives = 1;
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
    sesion.set(CLAVE, null);
    if (estaba && !silencioso) EIA.ui.anunciar(t("voz.detenido"));
  }

  document.addEventListener("keydown", e => { if (e.key === "Escape" && activo && !document.querySelector("dialog[open]")) detener(); });
  EIA.on("eia:idioma", () => { if (activo) reiniciarIdioma(); });

  EIA.voz = { iniciar, detener, ejecutarTexto, ayuda, disponible: () => !!Reconocedor, activo: () => activo, pausado: () => pausado, alternar: () => (activo ? detener() : iniciar()) };
  Object.assign(EIA.voz, api);
})(typeof window !== "undefined" ? window : globalThis);
