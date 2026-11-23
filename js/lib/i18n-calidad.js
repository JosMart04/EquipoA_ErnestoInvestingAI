/* js/lib/i18n-calidad.js — calidad de la internacionalización (Lab 13, Spec W13 G.5.5): pseudolocalización y medición
   de truncados y desbordes en el DOM. Reproduce la función medir() del ejercicio 13.2 del profesor
   (investing-i18n-kit) para que el notebook lea nuestros CSV, con dos ajustes declarados:
   - «truncados» cuenta solo los elementos que recortan texto (overflow hidden/clip o text-overflow), no las regiones
     desplazables (tablas anchas con overflow auto), que se cuentan aparte como «desplazables»;
   - «desbordes» ignora lo que está dentro de un contenedor que recorta o desplaza, y lo oculto a propósito
     (enlace «Saltar al contenido», texto solo para lectores de pantalla).
   Lo usan la página de Configuración (auditoría en vivo) y tools/i18n/medir_i18n.mjs (Playwright).
   Formato dual: EIALib.i18nCalidad y module.exports. pseudolocalizar() y aCSV() son puras; medir() necesita un DOM. */
(function (global) {
  "use strict";
  const L = global.EIALib = global.EIALib || {};

  /** Columnas del CSV: las 12 primeras son las del ejercicio 13.2 del profesor (las lee su notebook). */
  const COLUMNAS = ["hora", "locale", "version", "pseudo", "truncados", "desbordes", "fechas_fijas", "dinero_fijo", "lang_ok", "dir_ok",
    "expansion", "caracteres", "pagina", "ancho", "desplazables", "scroll_horizontal"];
  /** Escrituras de derecha a izquierda (idioma base de la etiqueta BCP 47). */
  const RTL = ["ar", "he", "fa", "ur"];
  const direccion = locale => (RTL.includes(String(locale || "").split("-")[0]) ? "rtl" : "ltr");

  /** Pseudolocalización del kit del profesor: tildes y unos 40 % más de largo, entre corchetes; conserva {variables}. */
  const MAPA = { a: "á", e: "é", i: "í", o: "ó", u: "ú", A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú", n: "ñ", c: "ç" };
  function pseudolocalizar(s) {
    const texto = String(s);
    const out = texto.split(/(\{[^}]+\})/).map(p => (/^\{/.test(p) ? p : p.replace(/[aeiouAEIOUnc]/g, c => MAPA[c]))).join("");
    return "[" + out + " " + "·".repeat(Math.ceil(texto.length * 0.4)) + "]";
  }
  /** Pseudolocaliza un diccionario completo (también los plurales). Deja intactas las claves de metadatos («_…»)
      y la gramática de voz (voz.g_* y voz.m_*), que no se muestran. */
  function pseudoDiccionario(dic, ruta) {
    if (typeof dic === "string") return /^voz\.(g|m)_/.test(ruta || "") ? dic : pseudolocalizar(dic);
    if (Array.isArray(dic)) return dic.map((v, i) => pseudoDiccionario(v, (ruta || "") + "." + i));
    if (dic && typeof dic === "object") {
      const r = {};
      for (const k of Object.keys(dic)) r[k] = k.startsWith("_") ? dic[k] : pseudoDiccionario(dic[k], ruta ? ruta + "." + k : k);
      return r;
    }
    return dic;
  }

  /** Mide la página (doc) como el «Auditar DOM» del ejercicio 13.2. esperado = {locale, dir}. */
  function medir(doc, esperado) {
    const win = doc.defaultView, raiz = doc.body, e = esperado || {};
    const ancho = doc.documentElement.clientWidth;
    const estilo = new Map();
    const cs = el => { if (!estilo.has(el)) estilo.set(el, win.getComputedStyle(el)); return estilo.get(el); };
    const recorta = el => { const o = cs(el).overflowX; return o === "hidden" || o === "clip" || o === "auto" || o === "scroll"; };
    // ¿Algún ancestro (hasta body) recorta o desplaza? Entonces el elemento no desborda la página.
    const dentroDeRecorte = new Map();
    function recortado(el) {
      if (!el.parentElement || el.parentElement === raiz) return false;
      if (dentroDeRecorte.has(el)) return dentroDeRecorte.get(el);
      const p = el.parentElement, r = recorta(p) || recortado(p);
      dentroDeRecorte.set(el, r);
      return r;
    }
    const aProposito = el => !!el.closest(".sr, .skip, [data-marquesina], [aria-hidden='true'] canvas") || cs(el).clipPath === "inset(50%)";
    const visible = el => { const s = cs(el); if (s.display === "none" || s.visibility === "hidden") return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const nombre = el => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");

    const todos = Array.from(raiz.querySelectorAll("*")).filter(el => !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|CANVAS)$/.test(el.tagName) && !el.closest("[_echarts_instance_], svg") && visible(el));
    const truncados = [], desplazables = [], desbordes = [];
    for (const el of todos) {
      const s = cs(el);
      if (aProposito(el)) continue; // .sr y .skip recortan a propósito: no son texto truncado
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
        if (s.overflowX === "hidden" || s.overflowX === "clip" || s.textOverflow === "ellipsis") truncados.push(nombre(el));
        else if (s.overflowX === "auto" || s.overflowX === "scroll") desplazables.push(nombre(el));
      }
      if (s.position === "fixed" || recortado(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > ancho + 1 || r.left < -1) desbordes.push(nombre(el));
    }
    const texto = raiz.innerText || "";
    const dirReal = cs(doc.documentElement).direction;
    return {
      truncados: truncados.length, desbordes: desbordes.length, desplazables: desplazables.length,
      scroll_horizontal: doc.documentElement.scrollWidth > ancho + 1 ? "sí" : "no",
      fechas_fijas: (texto.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) || []).length,
      dinero_fijo: (texto.match(/\$\d+\.\d{2}\b/g) || []).length,
      lang_ok: e.locale ? (doc.documentElement.lang === e.locale ? "sí" : "no") : "",
      dir_ok: dirReal === (e.dir || direccion(e.locale)) ? "sí" : "no",
      caracteres: texto.length, ancho,
      ejemplos: { truncados: truncados.slice(0, 5), desbordes: desbordes.slice(0, 5), desplazables: desplazables.slice(0, 5) }
    };
  }

  /** Filas → CSV con BOM (Excel y pandas con utf-8-sig lo leen bien). */
  function aCSV(filas, columnas) {
    const cols = columnas || COLUMNAS;
    const celda = v => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return "﻿" + cols.join(",") + "\n" + filas.map(f => cols.map(c => celda(f[c])).join(",")).join("\n") + "\n";
  }

  const api = { COLUMNAS, RTL, direccion, pseudolocalizar, pseudoDiccionario, medir, aCSV };
  L.i18nCalidad = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
