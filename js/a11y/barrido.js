/* js/a11y/barrido.js — barrido con un solo interruptor (PLAN_MAESTRO §9.4; D-07 e).
   Recorre GRUPOS (navegación, controles del módulo, contenido, gráficos, tablas, pie) y, al activar uno, sus ELEMENTOS,
   con un marco grueso y un rótulo («Grupo 2 de 6: Controles del módulo»). Cada nivel termina con «Salir del grupo»;
   el nivel superior, con «Detener el barrido». Los grupos grandes se parten en bloques para no esperar demasiado.
   El interruptor es Espacio o Enter, o cualquier fuente que emita ACTIVAR en el bus (parpadeo largo, boca, pellizco).
   Esc detiene. Se reanuda al cambiar de página (sessionStorage.eia_barrido). Formato dual: lo puro se prueba en Node. */
(function (global) {
  "use strict";
  const MS_POR_DEFECTO = 1200, MAX_BLOQUE = 8;
  const ENFOCABLES = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
  const GRUPOS = ["navegacion", "controles", "contenido", "graficos", "tablas", "pie"];

  /** Pura: parte una lista en bloques de como mucho `tam` elementos, con sus posiciones (1-based) para el rótulo. */
  function bloques(lista, tam) {
    const t = tam || MAX_BLOQUE;
    if (lista.length <= t) return null;
    const n = Math.ceil(lista.length / t), por = Math.ceil(lista.length / n), salida = [];
    for (let i = 0; i < lista.length; i += por) salida.push({ desde: i + 1, hasta: Math.min(lista.length, i + por), elementos: lista.slice(i, i + por) });
    return salida;
  }
  /** Pura: grupo de un elemento según dónde está y qué es. `donde` = {cabecera, pie, grafico, tabla, control}. */
  function clasificar(donde) {
    if (donde.cabecera) return "navegacion";
    if (donde.pie) return "pie";
    if (donde.grafico) return "graficos";
    if (donde.tabla) return "tablas";
    if (donde.control) return "controles";
    return "contenido";
  }
  /** Pura: siguiente posición del cursor en un nivel de n opciones (la última es salir o detener). */
  const siguiente = (i, n) => (n > 0 ? (i + 1) % n : 0);

  const api = { bloques, clasificar, siguiente, GRUPOS, MAX_BLOQUE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  const EIA = global.EIA;
  if (!EIA || !global.document || EIA.barrido) return;
  const t = (k, p) => EIA.t(k, p), $ = s => document.querySelector(s);

  const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && global.getComputedStyle(el).visibility !== "hidden";
  function nombreDe(el) {
    const n = el.getAttribute("aria-label") || (el.labels && el.labels[0] && el.labels[0].textContent) || el.textContent || el.value || el.title || "";
    return n.replace(/\s+/g, " ").trim().slice(0, 80) || t("a11y.barrido_sin_nombre");
  }
  /** Árbol de la página: [{tipo:"nodo", nombre, hijos}|{tipo:"el", el, nombre}] según los grupos fijos. */
  function arbol() {
    const dlg = document.querySelector("dialog[open]");
    const raiz = dlg || document;
    const todos = Array.from(raiz.querySelectorAll(ENFOCABLES)).filter(el => visible(el) && !el.closest(".barrido-capa"));
    const hoja = el => ({ tipo: "el", el, nombre: nombreDe(el) });
    const nodo = (nombre, els) => {
      const partes = bloques(els);
      return { tipo: "nodo", nombre, hijos: partes ? partes.map(b => ({ tipo: "nodo", nombre: t("a11y.barrido_bloque", { desde: b.desde, hasta: b.hasta }), hijos: b.elementos.map(hoja) })) : els.map(hoja) };
    };
    if (dlg) return [nodo(t("a11y.barrido_g_dialogo"), todos)];
    const por = {};
    todos.forEach(el => {
      const g = clasificar({
        cabecera: !!el.closest("header.top") || el.classList.contains("skip"), pie: !!el.closest("footer.pie"),
        grafico: !!el.closest(".grafico"), tabla: !!el.closest("table"),
        control: el.matches("select,input,textarea,[role=tab]") || !!el.closest(".seg,[role=group],[role=tablist],.filtros")
      });
      (por[g] = por[g] || []).push(el);
    });
    return GRUPOS.filter(g => por[g] && por[g].length).map(g => nodo(t("a11y.barrido_g_" + g), por[g]));
  }

  let activo = false, reloj = null, pila = [], capa = null, marco = null, rotulo = null, cancelarBus = null;
  /** Opciones del nivel actual: los hijos y, al final, salir (o detener en el nivel superior). */
  function nivel() {
    let lista = arbol();
    const camino = [];
    for (let k = 0; k < pila.length - 1; k++) {
      const n = lista[pila[k]];
      if (!n || n.tipo !== "nodo") { pila = [0]; return { opciones: arbol().concat([{ tipo: "fin" }]), camino: [] }; }
      camino.push(n.nombre); lista = n.hijos;
    }
    return { opciones: lista.concat([{ tipo: pila.length > 1 ? "salir" : "fin" }]), camino };
  }
  function rect(op) {
    const els = op.tipo === "el" ? [op.el] : op.tipo === "nodo" ? hojas(op) : [];
    const rs = els.map(e => e.getBoundingClientRect()).filter(r => r.width || r.height);
    if (!rs.length) return null;
    return { x: Math.min(...rs.map(r => r.left)), y: Math.min(...rs.map(r => r.top)), x2: Math.max(...rs.map(r => r.right)), y2: Math.max(...rs.map(r => r.bottom)) };
  }
  const hojas = n => n.tipo === "el" ? [n.el] : n.tipo === "nodo" ? n.hijos.flatMap(hojas) : [];
  function pintar(anunciar) {
    const { opciones, camino } = nivel(), i = pila[pila.length - 1] % opciones.length, op = opciones[i];
    pila[pila.length - 1] = i;
    const total = opciones.length - 1;
    const texto = op.tipo === "fin" ? t("a11y.barrido_detener") : op.tipo === "salir" ? t("a11y.barrido_salir")
      : pila.length === 1 ? t("a11y.barrido_grupo", { n: i + 1, total, nombre: op.nombre })
        : t("a11y.barrido_elemento", { n: i + 1, total, nombre: op.nombre });
    rotulo.textContent = camino.length ? t("a11y.barrido_ruta", { ruta: camino.join(EIA.dir() === "rtl" ? " ‹ " : " › "), texto }) : texto;
    // El marco rodea el grupo o el elemento; «salir» marca el grupo que se deja
    const r = op.tipo === "salir" ? rect({ tipo: "nodo", hijos: opciones.slice(0, -1) }) : rect(op);
    marco.hidden = !r; marco.classList.toggle("salir", op.tipo !== "nodo" && op.tipo !== "el");
    if (r) {
      Object.assign(marco.style, { left: (r.x + global.scrollX - 6) + "px", top: (r.y + global.scrollY - 6) + "px", width: (r.x2 - r.x + 12) + "px", height: (r.y2 - r.y + 12) + "px" });
      const primero = op.tipo === "el" ? op.el : hojas(op)[0];
      if (primero && (r.y < 0 || r.y2 > global.innerHeight)) primero.scrollIntoView({ block: "nearest" });
    }
    // Con lector de pantalla: el elemento recibe el foco (se lee solo); los grupos se anuncian
    if (op.tipo === "el") op.el.focus({ preventScroll: true });
    else if (anunciar) EIA.ui.anunciar(rotulo.textContent);
  }
  function avanzar() {
    if (!activo || document.hidden) return;
    const { opciones } = nivel();
    pila[pila.length - 1] = siguiente(pila[pila.length - 1], opciones.length);
    pintar(true);
  }
  function reiniciarReloj() {
    if (reloj) global.clearInterval(reloj);
    reloj = global.setInterval(avanzar, Number((EIA.estado.get("eia_a11y") || {}).barrido_ms) || MS_POR_DEFECTO);
  }
  /** El interruptor: entra al grupo, pulsa el elemento, sale del grupo o detiene. */
  function activar() {
    if (!activo) return;
    const { opciones } = nivel(), op = opciones[pila[pila.length - 1]];
    if (op.tipo === "fin") { detener(); return; }
    if (op.tipo === "salir") pila.pop();
    else if (op.tipo === "nodo") pila.push(0);
    else {
      const el = op.el;
      pila = [0];
      if (el.tagName === "SELECT") EIA.ui.opcionesSelect(el); // el diálogo pasa a ser el único grupo
      else if (el.matches("input[type=text],input[type=number],input[type=search],textarea")) { el.focus(); EIA.ui.anunciar(t("a11y.barrido_campo")); }
      else { el.focus({ preventScroll: true }); el.click(); }
    }
    reiniciarReloj();
    // Tras pulsar, la página puede cambiar (diálogo, nuevo contenido): se repinta en el siguiente cuadro
    global.setTimeout(() => { if (activo) pintar(true); }, 60);
  }
  function tecla(e) {
    if (!activo) return;
    if (e.key === "Escape" && !document.querySelector("dialog[open]")) { e.preventDefault(); detener(); return; }
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (!e.repeat) activar(); }
  }
  function iniciar() {
    if (activo) return;
    activo = true; pila = [0];
    capa = document.createElement("div"); capa.className = "barrido-capa";
    capa.innerHTML = '<div class="barrido-marco" aria-hidden="true"></div><p class="barrido-rotulo" aria-hidden="true"></p>';
    document.body.appendChild(capa);
    marco = capa.querySelector(".barrido-marco"); rotulo = capa.querySelector(".barrido-rotulo");
    document.addEventListener("keydown", tecla, true);
    try { global.sessionStorage.setItem("eia_barrido", "1"); } catch (e) { /* sin almacenamiento */ }
    EIA.cargar("js/a11y/bus-entrada.js").then(() => {
      if (!activo || cancelarBus) return;
      cancelarBus = EIA.bus.on("ACTIVAR", d => { if (activo) { d.manejado = true; activar(); } });
    }).catch(() => {});
    EIA.ui.anunciar(t("a11y.barrido_iniciado"));
    pintar(false);
    reiniciarReloj();
  }
  function detener() {
    if (!activo) return;
    activo = false;
    if (reloj) global.clearInterval(reloj); reloj = null;
    if (cancelarBus) { cancelarBus(); cancelarBus = null; }
    document.removeEventListener("keydown", tecla, true);
    if (capa) capa.remove(); capa = marco = rotulo = null;
    try { global.sessionStorage.removeItem("eia_barrido"); } catch (e) { /* sin almacenamiento */ }
    EIA.ui.anunciar(t("a11y.barrido_detenido"));
  }

  EIA.barrido = { iniciar, detener, activar, activo: () => activo, reiniciarReloj };
  Object.assign(EIA.barrido, api);
})(typeof window !== "undefined" ? window : globalThis);
