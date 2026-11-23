# Guía técnica de internacionalización

Cómo está internacionalizado **Ernesto Investing AI** (Lab 13 y Spec del trabajo grupal W13, sección G.5) y cómo se mantiene. El sitio funciona en **13 idiomas** sin compilación: HTML, CSS y JavaScript puros, con las API `Intl` del navegador.

## 1. Recursos y manifiesto

- **Un JSON por idioma** en [`locales/`](../../locales/): las claves se agrupan por función (`dashboard.*`, `trading.*`, `config.*`, `voz.*`, `datos.*`…). Ninguna cadena visible se concatena; las variables van como `{parámetros}`.
- **Manifiesto** [`locales/index.json`](../../locales/index.json). Por cada idioma declara:
  - la etiqueta BCP 47;
  - el endónimo;
  - la escritura (ISO 15924) y la dirección;
  - el estado (`fuente`, `completo` o `borrador`) y si es parcial;
  - el idioma del reconocimiento de voz y la palabra «borrador» en ese idioma;
  - la completitud, que calcula `tools/i18n/revisar.mjs`.
- **Respaldo:** si a un idioma le falta una clave, se usa la de **es-PE** y se avisa en la consola. `⟦clave⟧` solo aparece si tampoco existe en es-PE. Así funciona el quechua parcial.
- **Sin autodetección:** el sitio abre siempre en es-PE (decisión de Josué). El idioma se elige en la barra o en Configuración, o con `?lang=<etiqueta>`, y se guarda en `localStorage` (`eia_lang`).

**Agregar un idioma:**
1. Crea `locales/<tag>.json` con las mismas claves que `es-PE.json` (o una parte, si es parcial).
2. Agrega su línea en el manifiesto.
3. Ejecuta:
   ```powershell
   node tools/i18n/revisar.mjs --escribir
   node tools/i18n/hreflang.mjs
   node --test "tests/unit/*.test.mjs"
   ```

No hace falta tocar código.

## 2. API del núcleo (`js/common.js`)

| Función | Para qué | `Intl` |
|---|---|---|
| `EIA.t(clave, params)` | Texto traducido. Si `params.n` existe, elige la forma de plural. Los enteros se formatean con los dígitos del idioma; en RTL, cada parámetro se aísla con U+2068 y U+2069 | `PluralRules`, `NumberFormat` |
| `EIA.fmt.num`, `ent`, `pct`, `usd` | Números, porcentajes con signo y montos **siempre en USD**: cambiar el idioma cambia el formato, no la divisa | `NumberFormat` |
| `EIA.fmt.fecha`, `hora`, `fechaHora` | Fechas y horas en la **zona horaria elegida** | `DateTimeFormat` |
| `EIA.fmt.rel`, `hace`, `lista` | «hace 2 horas», «A, B y C» | `RelativeTimeFormat`, `ListFormat` |
| `EIA.fmt.zonaNombre`, `desfase` | «hora de Perú», «GMT−5» | `DateTimeFormat` |
| `EIA.ordenar`, `EIA.ordenarFilas` | Orden alfabético del idioma (Á junto a A, Ñ después de N en español) | `Collator` |
| `EIA.endonimo`, `EIA.nombreIdioma` | Nombres de idiomas | `DisplayNames` |
| `EIA.textoDatos(texto)` | Traduce los textos libres en español de los JSON (`datos.textos`). Las cifras se cambian por `{#}` y se vuelven a formatear | `NumberFormat` |
| `EIA.localeFormato()` | Locale de formato: con `-u-nu-latn` si la persona prefiere dígitos occidentales; el de respaldo si `Intl` no conoce el idioma (qu-PE) | `supportedLocalesOf` |
| `I18N` / `EIA.i18n` | Fachada con la API del kit del profesor (`t, num, money, pct, dt, rel, names, sort, dir, pseudoloc, state, medir`) | — |

## 3. `lang`, `dir` y RTL (ar-EG, he-IL)

- `<html lang dir>` se fija al cargar y al cambiar de idioma. La dirección sale del manifiesto. Cada `<option>` del selector lleva su `lang`.
- **CSS lógico:** `margin-inline`, `padding-inline`, `inset-inline`, `text-align: start` y similares. Las flechas de texto (`.flecha`) se espejan; ▲ ▼ no.
- **Gráficos:** `EIA.espejarGrafico` invierte el eje X de ECharts y pone el eje Y a la derecha en RTL, para los cinco módulos con gráficos.
- **Teclado:** `EIA.teclaLogica` intercambia ← y → en RTL, en pestañas, controles segmentados y exploración de gráficos (WAI-ARIA APG).
- **Fuentes:** pilas de fuentes del sistema por `:lang()` para ar, he, ja, zh, ko y hi. No se descarga ninguna fuente.
- **Bidi:** tickers y números dentro de frases RTL van aislados. `overflow-wrap: anywhere` en avisos y pies evita desbordes con palabras largas.

## 4. Zona horaria

- La zona es la que elige la persona en Configuración (`eia_zona`) o, si no elige, la del dispositivo.
- El **cierre del mercado** se calcula como las 16:00 de `America/New_York` de cada sesión (`EIA.instanteCierre`, en dos pasadas, correcto con y sin horario de verano). Se muestra en la zona elegida con `EIA.textoCierre` y la plantilla `comun.cierre` («Cierre de la sesión del {fecha}: {hora_mercado} en Nueva York ({hora_local}, {zona})»).
- Se usa en el pie de cada página, en Watchlist y en las horas de las órdenes de Trading.

## 5. Adaptación cultural

- **Colores de alza y baja:** en automático, ja, zh y ko usan «rojo sube» (`html[data-colores="rojo-sube"]`). Se puede forzar cualquiera de las dos convenciones. El contraste se prueba en ambas, y ▲ ▼ con signo acompañan siempre al color.
- **Endónimos sin banderas** en el selector y en Configuración.
- **Dígitos:** se puede elegir entre los del idioma (por ejemplo, arábigo-índicos en ar-EG) y los occidentales.

## 6. Pseudolocalización y auditoría

- **`qps-ploc`** (acentos y unos 40 % más de texto, con el algoritmo del kit) y **`qps-plocm`** (lo mismo en RTL). Se generan en tiempo de ejecución desde es-PE y conservan los `{parámetros}`. Se activan en Configuración o con `?lang=qps-ploc`.
- **Auditoría en la página:** el botón «Auditar las páginas en este idioma» de Configuración recorre las 9 páginas en `iframe` ocultos con `EIALib.i18nCalidad.medir()`, la misma función del ejercicio 13.2 (ver [README de medición](README.md)). Muestra una tabla y exporta el CSV.
- **Auditoría por lotes:** `tools/i18n/medir_i18n.mjs` (Playwright) mide la versión A (etiqueta `i18n-antes`) y la B en cualquier combinación de idiomas, pseudolocalización y anchos.

## 7. Voz en cualquier idioma

`js/a11y/voz.js` reconoce en el idioma de voz del manifiesto. La gramática de cada idioma vive en su diccionario (`voz.g_*` para acciones, `voz.m_*` para módulos).

La normalización Unicode hace comparables lo oído y la gramática:
- NFKC, minúsculas y NFD, sin marcas;
- alef y ة unificados en árabe;
- comparación por subcadenas en japonés y chino, que no usan espacios.

El comando «idioma …» acepta el endónimo o el nombre del idioma en el idioma actual. El quechua reconoce con la gramática en español.

## 8. SEO y descubrimiento

Cada página tiene `<link rel="alternate" hreflang>` para los 13 idiomas y `x-default`, generados por `tools/i18n/hreflang.mjs` (criterio de la auditoría de 14 sitios del Lab 13).

## 9. Pruebas

`tests/unit/nucleo.i18n.test.mjs`, `nucleo.intl.test.mjs` y `nucleo.paginas.test.mjs`. Para cada idioma del manifiesto comprueban:
- las mismas claves que es-PE (un idioma parcial no puede tener claves de más);
- los mismos parámetros;
- exactamente las categorías de plural de `Intl.PluralRules`;
- ningún texto vacío y ninguna cifra fuera de `datos.*`;
- solo SUBE y BAJA, y ninguna palabra de «mantener» del idioma;
- el respaldo, la dirección, la pseudolocalización, el cierre en horario de verano y fuera de él, el Collator, la fachada `I18N`, hreflang y el contraste de las dos convenciones de color.

## 10. Medición antes y después

Ver la sección de resultados en el [README de medición](README.md#resultados).

## 11. Limitaciones

- **Borradores:** los 11 idiomas distintos de es-PE y en-US los tradujo una IA y **ningún hablante los ha revisado** (Spec W13, G.10.4). Se marcan como borrador en el selector, en Configuración y con una franja en el propio idioma.
- **Quechua parcial** (`qu-PE`): solo la interfaz básica; el resto cae a es-PE. `Intl` no tiene datos de quechua, así que los formatos usan es-PE.
- **La heurística `dinero_fijo` del ejercicio** (`$123.45`) también cuenta montos formateados correctamente por `Intl` en los idiomas cuyo formato de USD es así (en-US, ja-JP, hi-IN, zh-CN y ko-KR con «US$»). En B esos montos **no** están escritos a mano.
- **El experimento 13.3 con personas** queda fuera de esta iteración: es una tarea del equipo con consentimiento informado.
