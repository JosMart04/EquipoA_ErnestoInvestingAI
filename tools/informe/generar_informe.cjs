// tools/informe/generar_informe.cjs — cuerpo del informe S13_EquipoA (DOCX) para unirlo después a la carátula.
// Las cifras se leen de los JSON (data/ y data_real/) con las mismas funciones puras del sitio: nada escrito a mano.
// Requiere el paquete npm «docx» (instalado fuera del repo; pásalo con NODE_PATH) y las figuras de recortar.py.
// Uso: NODE_PATH=<carpeta>/node_modules node tools/informe/generar_informe.cjs <carpeta_img> <salida.docx>
const fs = require("fs"), path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType,
  ImageRun, TableOfContents, LevelFormat, BorderStyle, ExternalHyperlink, PageBreak
} = require("docx");

const RAIZ = path.resolve(__dirname, "..", "..");
const [IMG, SALIDA] = [process.argv[2], process.argv[3]];
const leer = p => JSON.parse(fs.readFileSync(path.join(RAIZ, p), "utf8"));
const B = require(path.join(RAIZ, "js/backtesting.js")), C = require(path.join(RAIZ, "js/clasificacion.js")), R = require(path.join(RAIZ, "js/regresion.js"));

/* ── Cifras ── */
function cifras(carpeta) {
  const c09 = leer(carpeta + "/09_backtesting_portafolios.json"), c13 = leer(carpeta + "/13_patrones_y_parametros.json");
  const c05 = leer(carpeta + "/05_clasificadores_binarios.json"), c06 = leer(carpeta + "/06_regresores_precio_30d.json"), c07 = leer(carpeta + "/07_optimizador_markowitz_nsga.json");
  return { c09, inter: B.interpretar(c09, c13.parametros.TOPE_PESO), verif: B.verificar(c09), clas: C.resumen(c05), reg: R.resumen(c06), regV: R.verificacionGlobal(c06), c07, tope: c13.parametros.TOPE_PESO };
}
const P = cifras("data"), RE = cifras("data_real");
const meta = leer("data_real/meta.json");
const n = (x, d = 2) => Number(x).toFixed(d);
const pct = (x, d = 2) => (x > 0 ? "+" : "") + n(x, d) + "%";
const pctS = (x, d = 1) => n(x, d) + "%";
const fecha = iso => { const [a, m, d] = iso.split("-"); return `${Number(d)} de ${["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"][Number(m) - 1]} de ${a}`; };
const met = (c, k) => (c.c09.carteras[k] || c.c09.referencias[k]).metricas;
const lista = xs => new Intl.ListFormat("es", { type: "conjunction" }).format(xs);

/* ── Estilo ── */
const GRANATE = "771A23", FUENTE = "Times New Roman", ANCHO = 9461; // ancho útil en DXA (A4 con los márgenes de la carátula)
const run = (t, o = {}) => new TextRun(Object.assign({ text: t, font: FUENTE, size: 22 }, o));
/** Párrafo con fragmentos: texto plano o [texto, {bold, italics}] */
function p(...partes) {
  const op = partes.length && partes[partes.length - 1] && partes[partes.length - 1].__op ? partes.pop() : {};
  return new Paragraph({ alignment: op.centro ? AlignmentType.CENTER : AlignmentType.JUSTIFIED, spacing: { after: op.after ?? 100, line: 264 },
    keepNext: !!op.keepNext, children: partes.map(x => (Array.isArray(x) ? run(x[0], x[1]) : typeof x === "string" ? run(x) : x)) });
}
const op = o => Object.assign({ __op: true }, o);
const h1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 280, after: 120 }, children: [run(t, { size: 30, bold: true, color: GRANATE })] });
const h2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 180, after: 80 }, children: [run(t, { size: 24, bold: true, color: GRANATE })] });
const vineta = (...partes) => new Paragraph({ numbering: { reference: "vinetas", level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: 50, line: 252 },
  children: partes.map(x => (Array.isArray(x) ? run(x[0], x[1]) : run(x))) });
const enlace = (t, url) => new ExternalHyperlink({ link: url, children: [run(t, { color: "0B4F9C", underline: {} })] });
let nFig = 0;
function figura(archivo, anchoPx, pie) {
  const ruta = path.join(IMG, archivo + ".jpg"), dims = jpegDims(fs.readFileSync(ruta));
  nFig++;
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 60, after: 40 },
      children: [new ImageRun({ type: "jpg", data: fs.readFileSync(ruta), transformation: { width: anchoPx, height: Math.round(anchoPx * dims.h / dims.w) } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 140 }, children: [run(`Figura ${nFig}. `, { bold: true, size: 18 }), run(pie, { italics: true, size: 18 })] })
  ];
}
/** Varias imágenes en una fila (tabla sin bordes) con un solo pie */
function figuras(lista, pie) {
  nFig++;
  const anchoCelda = Math.floor(ANCHO / lista.length), sinBorde = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const celdas = lista.map(([archivo, anchoPx]) => {
    const ruta = path.join(IMG, archivo + ".jpg"), dims = jpegDims(fs.readFileSync(ruta));
    return new TableCell({ width: { size: anchoCelda, type: WidthType.DXA }, borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "jpg", data: fs.readFileSync(ruta), transformation: { width: anchoPx, height: Math.round(anchoPx * dims.h / dims.w) } })] })] });
  });
  return [
    new Table({ width: { size: ANCHO, type: WidthType.DXA }, columnWidths: lista.map(() => anchoCelda), rows: [new TableRow({ cantSplit: true, children: celdas })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 140 }, children: [run(`Figura ${nFig}. `, { bold: true, size: 18 }), run(pie, { italics: true, size: 18 })] })
  ];
}
/** Tabla con encabezado sombreado. anchos en DXA (suman ANCHO). */
function tabla(anchos, encabezado, filas) {
  const borde = { style: BorderStyle.SINGLE, size: 4, color: "C9D1DA" };
  const celda = (t, i, cab) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA }, borders: { top: borde, bottom: borde, left: borde, right: borde },
    shading: cab ? { type: ShadingType.CLEAR, color: "auto", fill: "F3E6E8" } : undefined, margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ spacing: { after: 0, line: 240 }, children: (Array.isArray(t) ? t : [t]).map(x => (typeof x === "string" ? run(x, { size: 19, bold: cab }) : x)) })]
  });
  return new Table({ width: { size: ANCHO, type: WidthType.DXA }, columnWidths: anchos,
    rows: [new TableRow({ tableHeader: true, cantSplit: true, children: encabezado.map((t, i) => celda(t, i, true)) })]
      .concat(filas.map(f => new TableRow({ cantSplit: true, children: f.map((t, i) => celda(t, i, false)) }))) });
}
const espacio = () => new Paragraph({ spacing: { after: 60 }, children: [] });
/** Ancho y alto de un JPEG (marcador SOF). */
function jpegDims(b) {
  let i = 2;
  while (i < b.length) { const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }; i += 2 + len; }
  throw new Error("JPEG sin tamaño");
}

/* ── Contenido ── */
const URL = { pages: "https://josmart04.github.io/EquipoA_ErnestoInvestingAI/", repo: "https://github.com/JosMart04/EquipoA_ErnestoInvestingAI",
  make: "https://www.figma.com/make/BWA9B3JoRbAWZiVoPSyoBO", site: "https://misty-umber-07813177.figma.site/" };
const spyP = met(P, "SPY"), spyR = met(RE, "SPY");
const cuerpo = [];
const add = (...xs) => xs.flat().forEach(x => cuerpo.push(x));

add(new Paragraph({ spacing: { after: 200 }, children: [run("Índice", { size: 30, bold: true, color: GRANATE })] }),
  new TableOfContents("Índice", { hyperlink: true, headingStyleRange: "1-2" }), new Paragraph({ children: [new PageBreak()] }));

add(h1("1. Introducción"),
  p("Ernesto Investing AI es el sistema web integrado del trabajo grupal de la Semana 13 de Interacción Humano-Computador (IHC 2026-II, FISI-UNMSM). Reúne en un solo sitio los cuatro módulos heredados de la Semana 4 (Dashboard, Watchlist y alertas, Trading simulado y Leaderboard) y los cinco que pide la guía: Clasificación binaria de tendencia, Regresión de precios a 30 sesiones, Optimizador (Markowitz, NSGA-II y NSGA-III), Portafolios en tres niveles de riesgo y Backtesting."),
  p("El objetivo de diseño fue que una persona sin formación financiera entienda ", ["qué hace cada modelo, qué tan bien lo hace y por qué dice lo que dice", { italics: true }], ", siguiendo las pautas de interacción humano-IA de Amershi et al. (G1, G2, G10, G11 y G17) y WCAG 2.2 AA. El sitio abre en el ", ["Modo profesor", { bold: true }], ", con los 13 JSON sintéticos del curso intactos; un ", ["Modo real", { bold: true }], " opcional usa precios de Yahoo Finance y modelos entrenados por el equipo, con el mismo esquema de datos."),
  tabla([2600, 6861], ["Entregable", "Enlace"], [
    ["Sistema desplegado (GitHub Pages)", [enlace(URL.pages, URL.pages)]],
    ["Repositorio público", [enlace(URL.repo, URL.repo)]],
    ["Archivo de Figma Make (diseño)", [enlace(URL.make, URL.make)]],
    ["Prototipo navegable de Figma Make", [enlace(URL.site, URL.site)]],
    ["Prompts literales", [run("PROMPTS_USADOS.md en la raíz del repositorio", { size: 19 })]]
  ]), espacio());

add(h1("2. Arquitectura"),
  p("Es un sitio estático, sin compilación ni frameworks (HTML, CSS y JavaScript), publicado en GitHub Pages. Las nueve páginas comparten un núcleo (", ["js/common.js", { italics: true }], ") y una sola hoja de estilos; cada módulo separa un «modelo de vista» puro, probado en Node, del pintado con Apache ECharts 5.5.1. Las modalidades de accesibilidad emiten los mismos comandos semánticos a un bus común y se cargan solo cuando se activan (MediaPipe Tasks Vision 1.2.3 para la cámara)."),
  figura("arquitectura", 610, "Capas del sistema: fuentes de datos, núcleo, algoritmos, accesibilidad, módulos, calidad y despliegue."),
  tabla([2200, 7261], ["Decisión", "Por qué"], [
    ["Ninguna cifra escrita a mano", "Todo se lee de los JSON o se deriva y se declara en el contrato de datos (docs/CONTRATO_DATOS.md). Los diccionarios de textos no contienen cifras (lo vigila una prueba)."],
    ["Dos modos con el mismo esquema", "El Modo profesor cumple la guía al pie de la letra; el Modo real muestra el mismo sistema con datos reales, 12 cortes mensuales y recálculo en el navegador con Web Workers."],
    ["Un solo núcleo", "Navegación, temas, idioma (ES-PE / EN-US con Intl), estado compartido (watchlist, cartera elegida, migas de pan) y componentes accesibles (gráfico con tabla y resumen, tabla ordenable, diálogo) se escriben una vez."],
    ["Calidad automática", "Cada cambio entra por un PR con CI obligatoria: pruebas unitarias, escaneo de secretos (Gitleaks) y E2E con Playwright y axe-core. Se fusionaron más de 30 PR; desde que existe la CI, ninguno se fusiona sin tenerla en verde."]
  ]), espacio());

add(h1("3. Flujo de trabajo y diseño en Figma"),
  p("Se siguió el flujo obligatorio de la guía (§6.1). El diseño se hizo en Figma Make: el prompt P01 sirvió como especificación para escribir el código de las pantallas, que se importó al archivo de Make con el conector de Figma, sin generación de la IA de Make. El archivo incluye los 9 módulos, sus variantes de tema, idioma y modo, la vista móvil de Portafolios, el Centro de accesibilidad y una galería que enlaza todo (prototipo navegable). El código descargado de Figma Make está sin editar en ", ["figma-src/", { italics: true }], "; las interfaces finales se construyeron con Claude siguiendo las tareas y restricciones de los prompts P03 a P07, se integraron (P07), se publicaron en GitHub Pages y se auditaron con P08."),
  figuras([["figma-galeria", 300], ["figma-optimizador", 300]], "Diseño en Figma Make: galería de pantallas del prototipo (izquierda) y pantalla del Optimizador (derecha)."));

add(h1("4. Decisiones de diseño por módulo"),
  p("Todos los módulos de predicción comparten tres decisiones: un ", ["aviso de simulación", { bold: true }], " según el modo de datos; una ", ["Ficha de la IA", { bold: true }], " con las pautas G1 (qué hace), G2 (qué tan bien lo hace, con métricas del JSON), G11 (por qué dice lo que dice), G17 (qué controlas) y G10 (cómo ignorarlo); y, en cada gráfico, una ", ["tabla alternativa y un resumen en texto", { bold: true }], ". Las señales llevan siempre palabra y símbolo (▲ SUBE / ▼ BAJA), nunca solo color."),
  h2("Clasificación binaria"),
  p(`Un mapa de calor de 26 activos × 18 modelos (11 de Machine Learning y 7 de Deep Learning) muestra en cada celda la señal con su símbolo y la probabilidad de SUBE. Al elegir un activo, el panel de consenso explica los votos y la confianza (alta, media o baja). La ficha compara con honestidad: en el Modo profesor la exactitud va de ${pctS(P.clas.exactitudMin * 100)} a ${pctS(P.clas.exactitudMax * 100)} y solo ${P.clas.superanBase} de 18 modelos superan a la regla «siempre SUBE» (${pctS(P.clas.tasaBase * 100)}). Se puede filtrar por grupo y familia, ocultar modelos (G10, G17) y escuchar el consenso como sonido.`),
  figura("clasificacion", 560, "Clasificación: mapa de calor con palabra, símbolo y probabilidad, y consenso del activo elegido."),
  h2("Regresión a 30 sesiones"),
  p(`El gráfico une la historia con la mediana de los 18 modelos, la banda p10–p90 y un cono de volatilidad, para que la incertidumbre sea visible (una línea sola comunicaría una certeza que no existe). La ficha declara el error (MAPE de ${pctS(P.reg.mape[0], 2)} a ${pctS(P.reg.mape[1], 2)}) y que el R² de los retornos es muy bajo. La verificación de la guía (mediana final = último × (1 + retorno), con tolerancia de un centavo) se muestra tal cual: se cumple en ${P.regV.literal} de ${P.regV.total} activos y falla en ${lista(P.regV.fallanLiteral)} por el redondeo del retorno publicado; la comprobación inversa del contrato se cumple en ${P.regV.inversa}.`),
  figura("regresion", 540, "Regresión: historia, mediana, banda p10–p90 y cono de volatilidad, con el resumen del activo."),
  h2("Optimizador"),
  p(`Las tres curvas se superponen con formas distintas: Markowitz como línea, NSGA-II como círculos y NSGA-III como triángulos coloreados por CVaR 95 %. Un punto se elige con clic, con las flechas del teclado o desde la tabla, y la composición muestra pesos, métricas y la verificación de la suma y del tope de ${pctS(P.tope * 100, 0)}. Un texto explica, con las cifras del archivo, por qué los frentes evolutivos quedan algo por debajo de Markowitz, y el aviso dice que en el Modo profesor NSGA-II y NSGA-III son simulados. La cartera elegida se puede llevar a Trading.`),
  figura("optimizador", 540, "Optimizador: tres curvas superpuestas y composición del punto seleccionado."),
  h2("Portafolios en tres niveles"),
  p("Las tres carteras (Conservador, Moderado y Agresivo) se comparan lado a lado con su origen en el frente NSGA-II, sus métricas y el CVaR explicado en lenguaje llano. Cada activo trae su razón (votos de los clasificadores y proyección de los regresores); se puede excluir un activo y los pesos se reparten de nuevo (G10), y «Llevar a Trading» ejecuta las órdenes simuladas con la misma validación de Trading."),
  figura("portafolios", 540, "Portafolios: comparación lado a lado de los tres niveles con sus métricas y activos principales."),
  h2("Módulos heredados e integración"),
  p("El Dashboard ofrece velas por periodo o fechas y el universo filtrable; la Watchlist, alertas con estado «⚠ DISPARADA» en texto; Trading, validación en línea con errores asociados al campo; y el Leaderboard marca tu fila con icono, texto y fondo. La integración comparte una barra de navegación idéntica, migas de pan cuando se llega por un enlace cruzado (Clasificación › activo › Regresión › Optimizador), tema claro y oscuro (también en los gráficos), dos idiomas sin recargar y una vista móvil sin desborde horizontal a 390 px."),
  figura("dashboard-oscuro", 400, "Dashboard en tema oscuro: navegación común, selector de datos e idioma, aviso de simulación y velas."));

const inP = P.inter, inR = RE.inter;
add(h1("5. Interpretación del backtesting"),
  p(`El backtesting rebalancea cada mes durante ${P.c09.periodo.sesiones} sesiones, solo con información disponible en cada fecha, y se publica tal como sale. La interpretación del sitio se genera por reglas a partir de las cifras, y la verificación de la guía (valor final de la curva frente al retorno total, ± 0,05 puntos) se cumple en ${P.verif.filter(v => v.cumple).length} de ${P.verif.length} series.`),
  figura("backtesting-curvas", 540, "Backtesting (Modo profesor): capital de las tres carteras frente a SPY, QQQ, EPU y 1/N."),
  tabla([1900, 1350, 1350, 1500, 1500, 1861], ["Serie (Modo profesor)", "Retorno total", "Sharpe", "Volatilidad", "Máxima caída", "Meses positivos"],
    ["Conservador", "Moderado", "Agresivo", "SPY", "Igual ponderado (1/N)"].map(k => { const m = met(P, k); return [k, pct(m.retorno_total_pct), n(m.sharpe, 3), pctS(m.volatilidad_anual_pct, 2), pct(m.max_drawdown_pct), pctS(m.meses_positivos_pct)]; })),
  espacio(),
  p(["Modo profesor (historia sintética). ", { bold: true }], `Las tres carteras terminaron por debajo de SPY (${pct(spyP.retorno_total_pct)}): Conservador ${pct(met(P, "Conservador").retorno_total_pct)}, Moderado ${pct(met(P, "Moderado").retorno_total_pct)} y Agresivo ${pct(met(P, "Agresivo").retorno_total_pct)}, con Sharpe negativo y caídas más profundas que el mercado. Ni siquiera alcanzaron al reparto igual 1/N (${pct(met(P, "Igual ponderado (1/N)").retorno_total_pct)}). Las causas que el sitio propone, como hipótesis medidas en los datos, son: poca persistencia del impulso (elegir lo que venía subiendo no ayudó), el costo del rebalanceo (rotación media por encima de 1, es decir, comisiones), la concentración en pocos activos y que la referencia que más subió, ${inP[0].causas.find(c => c.codigo === "no_elegido").ticker} (${pct(met(P, "EPU").retorno_total_pct)}), pesó poco. Además, el Agresivo del archivo llega a 35 % por activo aunque el tope declarado es 25 %: es una inconsistencia del material y se muestra sin corregir.`),
  p(["Modo real (Yahoo Finance, ", { bold: true }], [`${fecha(RE.c09.periodo.inicio)} a ${fecha(RE.c09.periodo.fin)}). `, { bold: true }], `Las tres carteras superaron a SPY (${pct(spyR.retorno_total_pct)}): Conservador ${pct(met(RE, "Conservador").retorno_total_pct)} con menos volatilidad que el mercado, Moderado ${pct(met(RE, "Moderado").retorno_total_pct)} con el mejor Sharpe (${n(met(RE, "Moderado").sharpe, 3)}) y Agresivo ${pct(met(RE, "Agresivo").retorno_total_pct)}, pero con una volatilidad de ${pctS(met(RE, "Agresivo").volatilidad_anual_pct, 2)} y una caída máxima de ${pct(met(RE, "Agresivo").max_drawdown_pct)}, por lo que su Sharpe (${n(met(RE, "Agresivo").sharpe, 3)}) es peor que el de SPY (${n(spyR.sharpe, 3)}). Es un solo año, con universo fijo y precios ajustados que pueden revisarse: no prueba que la estrategia funcione en general. El recálculo en el navegador reproduce el resultado del pipeline en Python con la misma fecha final.`),
  figura("backtesting-real", 520, "Backtesting (Modo real): capital de las tres carteras frente a las referencias con datos de Yahoo Finance."),
  p(["El desempeño pasado no garantiza resultados futuros; nada de esto es asesoría de inversión.", { italics: true }]));

add(h1("6. Accesibilidad e IHC"),
  tabla([1500, 7961], ["Pauta", "Cómo se cumple"], [
    ["G1 y G2", "La Ficha de la IA de cada módulo dice qué hace y con qué exactitud, con métricas leídas del JSON y comparaciones honestas (tasa base, persistencia, error)."],
    ["G10", "Ocultar modelos, excluir activos de una cartera, apagar series o no usar ninguna recomendación; nada se aplica solo."],
    ["G11", "Votos de los clasificadores, proyección de los regresores y razón de cada activo; interpretación del backtesting generada desde las cifras."],
    ["G17", "Universo, grupo, familia de modelos, nivel de riesgo, series visibles, fechas y corte de los modelos."]
  ]), espacio(),
  p("Además de la base WCAG 2.2 AA (contraste ≥ 4,5:1 en ambos temas, teclado completo con foco visible, «Saltar al contenido», tablas con scope, formularios con label y una alternativa en tabla y en texto para cada gráfico), el Centro de accesibilidad (Alt+Shift+A) reúne preferencias visuales y seis modalidades:"),
  vineta(["Lectura y sonido: ", { bold: true }], "resumen automático de cada gráfico, lectura en voz alta y exploración punto a punto con las flechas, con un tono por valor."),
  vineta(["Cabeza: ", { bold: true }], "puntero por la orientación de la cabeza (MediaPipe Face Landmarker), calibración de 5 puntos y clic por permanencia, parpadeo largo o boca abierta."),
  vineta(["Manos: ", { bold: true }], "pellizco para hacer clic, puño para pausar y «V» con dos dedos para desplazar."),
  vineta(["Un interruptor: ", { bold: true }], "barrido por grupos y elementos con Espacio, Enter o un gesto de la cámara."),
  vineta(["Voz: ", { bold: true }], "«ir a clasificación», «activo Apple», «tema oscuro» o «clic en» con el texto de cualquier control, en español e inglés (Alt+Shift+V)."),
  p("La cámara y la voz piden consentimiento; la imagen se procesa solo en el navegador. Un integrante validó con su webcam la cabeza, las manos, la calibración y la «V», y con su micrófono los comandos de voz. La guía de uso está en docs/guia-usuario/accesibilidad.md. Bonificación: la interfaz está en ES-PE y EN-US sin recargar, con formatos de Intl y sin cadenas concatenadas."),
  figuras([["centro", 260], ["movil-portafolios", 150], ["movil-clasificacion", 150]], "Centro de accesibilidad y vista móvil a 390 px (Portafolios en tema claro; Clasificación en tema oscuro)."));

add(h1("7. Verificación (P08)"),
  tabla([3300, 1100, 5061], ["Criterio (Anexo C y P08)", "Resultado", "Evidencia"], [
    ["Consola sin errores; 9 páginas cargan", "Cumple", "27 cargas por cambio (9 páginas × profesor claro, profesor oscuro y real) sin errores ni textos faltantes; E2E en la CI."],
    ["Misma navegación en las 9 páginas", "Cumple", "Barra única generada por el núcleo; E2E comprueba los 9 enlaces."],
    ["Sin desborde horizontal a 390 px", "Cumple", "Medido en cada módulo y en la matriz E2E a 390 px."],
    ["Tema claro y oscuro, incluidos los gráficos", "Cumple", "Los colores de ECharts salen de las variables del tema; E2E en ambos temas."],
    ["Contraste, teclado, etiquetas y tablas", "Cumple", "axe-core sin violaciones serias o críticas en 72 combinaciones (tras corregir el issue #21); prueba unitaria de contraste por tema."],
    ["Aviso de simulación; solo SUBE y BAJA", "Cumple", "Aviso por modo en cada módulo; el núcleo rechaza cualquier tercera clase."],
    ["Backtesting tal como salió; ninguna cifra a mano", "Cumple", "Interpretación por reglas desde 09; diccionarios sin cifras y contrato de datos."],
    ["Auditoría independiente P08", "Corregida", "Codex encontró 3 hallazgos (uno alto: el corte histórico en Regresión mezclaba historias); se corrigieron en el PR #29."],
    ["Pruebas y secretos", "Cumple", "144 pruebas unitarias JS, 31 de Python y 244 casos de navegador; Gitleaks en cada PR."]
  ]), espacio());

add(h1("8. Limitaciones"),
  vineta("Los datos del Modo profesor son sintéticos y sus modelos no se entrenaron (Anexo D de la guía); el sitio lo declara en cada módulo."),
  vineta(`La verificación literal de Regresión (un centavo) falla en ${P.regV.fallanLiteral.length} activos del profesor por el redondeo del retorno a dos decimales; se muestra junto con la comprobación inversa, sin alterar los datos.`),
  vineta("El Agresivo del backtesting del curso usa un tope de 35 % aunque el material declara 25 %; se muestra como inconsistencia, no se corrige."),
  vineta("En el celular, los puntos de NSGA-II y NSGA-III del Optimizador se superponen; se mitiga con zoom, la tabla, el teclado y apagando series."),
  vineta("Con una webcam la mirada sola es imprecisa: se usa la orientación de la cabeza con imán, permanencia y calibración; el ajuste fino con el iris no se implementó. La voz requiere Chrome o Edge, que procesan el audio en su servicio."),
  vineta(`Modo real: un año de backtest, universo fijo (sesgo de supervivencia) e historia ajustada revisable; los clasificadores reales no superan la tasa base (${pctS(RE.clas.tasaBase * 100)}) y solo ${RE.reg.mejoran} de 18 regresores mejoran a «el precio no cambia». El corte vigente es del ${fecha(meta.fecha_corte)}.`),
  vineta("Intl con es-PE usa punto decimal (+2.93%), distinto de la coma del ejemplo de la guía (+2,93 %); se mantuvo la salida estándar de Intl."),
  vineta("Faltan pruebas con lectores de pantalla reales (NVDA, Narrador, TalkBack). El equipo tiene 11 integrantes, más que los 3 a 5 de la guía."));

add(h1("9. Declaración de uso de IA"),
  p("Este trabajo se desarrolló con asistencia de inteligencia artificial, conforme a las reglas de integridad de la guía (§6.3):"),
  vineta(["Claude Code ", { bold: true }], "(Claude Fable 5.2 el 16-nov y Claude Opus 5.5 desde el 17-nov): plan, sitio web, accesibilidad, integración, correcciones y documentación."),
  vineta(["Codex ", { bold: true }], "(GPT-6 Astra): pipeline de datos reales en Python, pruebas E2E y de accesibilidad, CI y la auditoría P08 independiente."),
  vineta(["Claude Opus 5.5 en claude.ai ", { bold: true }], "con el conector de Figma: código de las pantallas a partir de P01 e importación a Figma Make (sin generación de la IA de Make)."),
  p("Todo el código y el texto asistidos se ejecutaron y verificaron con pruebas automáticas, CI en cada PR, auditoría independiente y pruebas humanas del equipo, que además tomó las decisiones de diseño y alcance (registradas en docs/ia/DECISIONES.md). Cada commit asistido lleva coautoría, y los prompts literales usados están en PROMPTS_USADOS.md. La responsabilidad sobre el contenido entregado es del Equipo A."));

/* ── Documento ── */
const doc = new Document({
  creator: "Equipo A · IHC 2026-II", title: "S13_EquipoA_Informe · Ernesto Investing AI", description: "Informe del trabajo grupal de la Semana 13",
  styles: {
    default: { document: { run: { font: FUENTE, size: 22 }, paragraph: { spacing: { after: 120, line: 276 } } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FUENTE, size: 30, bold: true, color: GRANATE }, paragraph: { spacing: { before: 280, after: 120 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FUENTE, size: 24, bold: true, color: GRANATE }, paragraph: { spacing: { before: 180, after: 80 }, keepNext: true, outlineLevel: 1 } }
    ]
  },
  numbering: { config: [{ reference: "vinetas", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 11909, height: 16834 }, margin: { top: 979, right: 1224, bottom: 1008, left: 1224 } } }, children: cuerpo }]
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(SALIDA, b); console.log("cuerpo:", SALIDA, b.length, "bytes;", nFig, "figuras"); });
