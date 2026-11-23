// Utilidades comunes de las pruebas unitarias (Node ≥ 22, sin dependencias).
// Ejecutar desde la raíz del repo: node --test tests/unit/
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ruta = (...p) => join(RAIZ, ...p);
export const leer = (...p) => readFileSync(ruta(...p), "utf8");
export const leerJSON = (...p) => JSON.parse(leer(...p));
export const dato = nombre => leerJSON("data", nombre);

/** Lista recursiva de archivos de una carpeta del repo que cumplen el filtro. */
export function listar(carpeta, filtro) {
  const salida = [];
  const andar = dir => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) andar(p);
      else if (!filtro || filtro(p)) salida.push(relative(RAIZ, p).replace(/\\/g, "/"));
    }
  };
  andar(ruta(carpeta));
  return salida.sort();
}

/** Las 9 páginas del sitio, en el orden de la barra de navegación. */
export const PAGINAS = ["index.html", "watchlist.html", "trading.html", "leaderboard.html", "clasificacion.html",
  "regresion.html", "optimizador.html", "portafolios.html", "backtesting.html"];

/** Todas las páginas del sitio: los 9 módulos de la base más las de la iteración 2 (Spec W13 G.4). */
export const PAGINAS_SITIO = [...PAGINAS, "configuracion.html", "activo.html", "comparador.html"];

/** Manifiesto de idiomas y diccionario de cada uno (locales/). */
export const manifiesto = () => leerJSON("locales", "index.json");
export const diccionario = tag => leerJSON("locales", tag + ".json");
/** Categorías de plural que exige un idioma. En es, fr, pt, it y ca la categoría «many» solo aplica a millones exactos
    y notación compacta (CLDR); ahí basta «other». */
export function categoriasPlural(tag) {
  const c = new Intl.PluralRules(tag).resolvedOptions().pluralCategories;
  return ["es", "fr", "pt", "it", "ca"].includes(tag.split("-")[0]) ? c.filter(x => x !== "many") : c;
}

/** Aplana un diccionario i18n: {"a.b": "texto"}. Los plurales {one, other} quedan como "a.b#one". */
export function aplanar(obj, prefijo = "", salida = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const clave = prefijo ? prefijo + "." + k : k;
    if (v && typeof v === "object") {
      if (typeof v.other === "string") { for (const [cat, txt] of Object.entries(v)) salida[clave + "#" + cat] = txt; }
      else aplanar(v, clave, salida);
    } else salida[clave] = v;
  }
  return salida;
}

/** Razón de contraste WCAG entre dos colores #rrggbb. */
export function contraste(a, b) {
  const lum = h => {
    const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
