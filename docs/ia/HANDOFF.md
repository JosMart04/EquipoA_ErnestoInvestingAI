# HANDOFF — estado para quien retome

> Lo actualiza **Claude Code al terminar cada bloque**. Fable 5.2 hizo T-01…T-16 el lunes; desde el martes 17 trabaja Opus 5.5 (CC-O). **Desde el 17-nov por la noche Codex ya no participa (D-24): CC mantiene también sus rutas.**
> Opus: contrasta este archivo con el código y con `git log`; no confíes ciegamente.

## Última actualización
- Fecha y hora: 2026-11-17 22:33 (Lima)
- Modelo: Claude Opus 5.5 (Claude Code)
- Rama / último commit: `cc/readme-profesional` → PR #31 (README profesional; «About» de GitHub actualizado)

## Hecho (con evidencia)

Todo está en `main` por PR. `node --test "tests/unit/*.test.mjs"` → **140/140, ninguna omitida**. Además, CX tiene 48 E2E con Playwright (PR #15 y #18) en la CI. La CI (`qa.yml` de CX) corre en cada PR: pruebas JS, 16 pruebas Python de datos y Gitleaks.

| PR | Tareas | Qué hay | Evidencia |
|---|---|---|---|
| inicial | CC-F-00 | Repo desde la base del profesor (`e9d711e`), `figma-src/` sin editar, Pages activo | SHA-256 de `data/`: 13/13 (ahora también es una prueba unitaria) |
| #2 | T-01, T-02 | `docs/plan/PLAN_IMPLEMENTACION.md`, `docs/CONTRATO_DATOS.md` v1.0.0, tablero, D-17…D-21, `.nojekyll` | C-01 y C-02 enviados a CX: **siguen sin `ACK`** |
| #3 | T-03…T-07 | `js/common.js` (espacio `EIA`), `css/styles.css`, `i18n/*.json`, Dashboard con `EIA.ui.grafico` | Humo en navegador: 9 páginas, 390 y 1280 px, profesor y real, ES y EN |
| #4 | T-08 | **Clasificación completa, módulo de referencia** | 468 celdas, solo SUBE/BAJA, filtros, orden con teclado, sin desborde a 390 px, EN sin recargar |
| #5 | T-09…T-13 | `js/lib/*` (Markowitz, NSGA-II, NSGA-III, backtest…), `js/workers/*`, `EIA.trabajo()` | Markowitz = `07` del profesor (≤ 0,02 pp); referencias de `09` exactas; en navegador: optimizador 1,4 s, backtest 0,16 s |
| #6 | T-14…T-16 | Centro de accesibilidad, bus de entrada, puntero virtual, cámara, cabeza-mirada, manos, `js/lib/senales.js`, modelos en `assets/mediapipe/` | Ver la sección siguiente |
| #7 (CX) | T-31, T-39, T-51 | `qa.yml`, fixture cvxpy (35 puntos), `data_real/meta.json` y `cierres_historicos.json` | Fusionado por CC-O con CI verde; la prueba Markowitz vs cvxpy ya corre y pasa |
| #8 | T-28a | **La cámara se congelaba al primer segundo**: el HUD se reescribía con `innerHTML` y sacaba el `<video>` del documento. HUD fijo + vigilante del video; manos y puntero más estables (D-22) | MediaPipe real + video falso: 369 cuadros en 10 s; la versión anterior perdía el `<video>` a 1,5 s |
| #9 | T-02b | Contrato: ACK de C-01 (solo igualdad inversa) y C-02; la cota ampliada ya no se llama «equivalente»; R-REG-09 literal sigue incumpliéndose. Aviso «publicación parcial» en Modo real | 27 cargas: 9 páginas × (real ES 390, real EN 1280, profesor 390) |
| #10 | T-17 | **Regresión** (P04): historia + 30 sesiones, mediana, banda p10–p90, cono, tabla de 30 precios, métricas ordenables, verificación R-REG-09 de las dos formas. Selector de corte movido al núcleo | 1280 y 390 px, ES y EN sin recargar, tema del gráfico; 27 cargas de humo |
| #11 | T-18 | **Optimizador** (P05): dispersión riesgo–retorno con Markowitz (línea; elegibles, universo o ambas), NSGA-II (círculos) y NSGA-III (triángulos coloreados por CVaR, con escala); interruptores; selección con clic, con el teclado (flechas + Enter) o desde la tabla; composición con barras, métricas y comprobación R-OPT-09; explicación de por qué NSGA queda debajo, medida en los datos; elegibles con su razón y mensaje para `?t=`; recálculo deshabilitado en Modo profesor | 95/95; navegador: teclado, Enter, tabla de 135 puntos, interruptores, EN sin recargar, 390 px; 27 cargas de humo. **El clic con ratón real no se pudo simular** (panel oculto): el manejador sí funciona |
| #12 | T-19, T-20 | **Dashboard** (velas por defecto, periodos, fechas, tabla ordenable con estrella y enlace) y **Watchlist y alertas** (agregar, minigráficos, gestor de alertas, «⚠ DISPARADA» con fila resaltada y anuncio), ambos con `EIA.modulo` e i18n | 101/101; navegador: periodos, fechas, filtros, estrella, alta y baja de alertas, errores con `aria-invalid`; 27 cargas de humo |
| #13 | T-21, T-22 | **Trading** (vista previa, errores en el campo con `aria-invalid` y foco, posiciones, historial, reinicio con diálogo, tarjeta «Portafolio aplicado») y **Leaderboard** (ranking con tu fila marcada; el retorno sale de tu cartera de Trading). La cartera vive en el núcleo: `EIA.cartera` | 107/107; navegador: errores de cantidad, efectivo y venta; compra; reinicio; Trading → Leaderboard; 27 cargas de humo |
| #15 (CX) | T-50 | E2E: cámara falsa + MediaPipe real (cuadros crecientes 10 s), clic real en NSGA-II, aviso parcial en 9 páginas | 40 E2E en la CI |
| #16 | T-23, T-25 (parte) | **Portafolios** (tarjetas, elegir nivel, composición, razones con «Excluir») y **«Llevar a Trading»** compartido (`EIA.ui.llevarATrading`) desde Portafolios y el Optimizador; Trading muestra la cartera aplicada | 113/113; flujo Portafolios → Trading → Leaderboard en el navegador; 390 px; 27 cargas de humo |
| #17 | T-24 | **Backtesting** (P06): capital y caída conectados, métricas con las carteras marcadas, R-BT-06 visible, nota del tope 0,35, línea de tiempo de 12 rebalanceos con pesos y cambio frente al anterior, interpretación generada con reglas. Se retira `js/stub.js` | 119/119; navegador: 1280 y 390 px, EN sin recargar, `?nivel=`, contraste de 12 elementos en claro y oscuro; 27 cargas de humo |
| #18 (CX) | T-50 | E2E de Backtesting (curvas, métricas, nota del tope, Agresivo → 12 rebalanceos) y ausencia aislada de `09` | 48 E2E en la CI |
| #19 | T-25 | **Migas de pan** en el núcleo al llegar por un enlace cruzado (Clasificación › NVDA › Regresión › Optimizador; Portafolios › Agresivo › Backtesting) | 120/120; navegador: cadena, recarga, vuelta atrás, cambio de activo, EN, barra de módulos sin migas, 390 px; 27 cargas de humo. Además `EIA.todos`: el diagnóstico de datos ausentes nombra el primer archivo en orden |
| #20 | T-27 | **Accesibilidad de gráficos (a) y barrido (e):** exploración punto a punto con tono y anuncio, resumen automático por serie, «Leer en voz alta», consenso sonoro, barrido de 6 grupos, fuente legible y cursor grande; corrige el aria-label en inglés de ECharts | 126/126; navegador: 5 módulos con gráfico, barrido completo (grupo → bloque → `<select>` → diálogo → opción → Esc), reanudación al navegar, 390 px, contraste ≥ 5,5:1; 27 cargas de humo |
| #23 | T-29 (QA) | Issue #21 de CX (axe): texto con contraste medido sobre cada color de serie (`--serie-texto-N`) en Backtesting y Portafolios | 169 tramos ≥ 4,95:1 en claro, oscuro y alto contraste |
| #24 | T-26 | **Modo real** con los datos del PR #22 de CX: recálculo en Workers en Backtesting y Optimizador (`EIA.ui.recalculo`), cortes ordenados, textos que solo valían para el curso | 130/130; probado con los datos reales en un worktree: 9 páginas, recálculo, «Volver», idioma, corte antiguo, 390 px; 27 cargas de humo |
| #25 | T-28 | **Calibración de 5 puntos** de la cabeza con interfaz, **guía de gestos** con SVG propios y **«V» de dos dedos** para desplazar (D-23: sin deslizar ni pulgar arriba) | 132/132; navegador con poses simuladas: calibración exacta, Esc, quitar desde el Centro, V desplaza sin mover el puntero, 390 px |
| #26 | T-29 (parte) | Pasada de conformidad con Figma: casillas de series visibles en Backtesting (como en Figma) sincronizadas con la leyenda; Optimizador móvil con símbolos más chicos y zoom con dos dedos | 132/132; navegador: casillas ↔ leyenda en los dos gráficos sin bucle, EN, 390 px; 27 cargas de humo |
| #22 (CX) | T-31…T-38, T-50 | **Datos reales 01–13 y 12 cortes**, bot T-32, auditoría P08 con capturas | 244/244 pruebas de navegador de CX |
| #29 | T-29 (P08) | **H-01 / #28:** Regresión con corte antiguo usa los precios congelados de `cortes/<fecha>/auditoria.json` (antes mezclaba la historia actual). **H-02:** Clasificación habla de observaciones (y sesiones si se conocen) y compara con «siempre SUBE» según las cifras. **H-03:** en el Optimizador profesor, Markowitz se calcula; solo NSGA es simulado | 134/134; navegador con datos reales: cortes 2025-11-28 y 2026-10-30, sin corte, ES/EN; 27 cargas de humo |
| #30 | T-90 | **Comandos de voz** (`js/a11y/voz.js`): Web Speech API ES/EN, consentimiento, indicador, confirmación visual y hablada, ayuda, Alt+Shift+V, reanudación al navegar; gramática en i18n y acciones por el bus | 140/140; navegador con reconocedor simulado: tema, filtro, activo por empresa, clic en, ayuda, pausa, idioma, detener, atajo, Centro, navegación con reanudación, 390 px; 27 cargas de humo. **Sin micrófono real** |
| #31 | T-61 (parte) | **README profesional** (módulos, características, tecnologías con versiones, arquitectura, ejecución, pruebas, datos, accesibilidad, créditos) y «About» de GitHub (descripción, sitio, 20 temas) | Enlaces del README verificados |

### Accesibilidad: qué está probado y qué no

**Probado en el navegador sin webcam (Fable el 16, Opus el 17):**
- **Bucle real de la cámara** (PR #8): MediaPipe 1.2.3 cargado de verdad con un video falso (`canvas.captureStream`): 369 cuadros en 10 s (46 por segundo), el `<video>` sigue en la página y sin pausa. Con un detector sustituto en movimiento: el puntero sigue moviéndose a los 10 s con la cabeza; con la mano abierta no se pausa; el puño 1,5 s pausa y reanuda; si algo saca el `<video>`, el vigilante lo devuelve.
- Centro de accesibilidad (`#btn-a11y` o `Alt+Shift+A`): tamaño de texto, alto contraste, reducir movimiento, espaciado, subrayar enlaces y tramas; se guardan en `eia_a11y` y se aplican en todas las páginas.
- **Barrido** con `?barrido=1` (o el botón del Centro): grupos, bloques, «Salir del grupo», `<select>` → diálogo → opción, Esc, reanudación al cambiar de página. Interruptor probado con eventos de teclado sintéticos; **falta probarlo con un interruptor físico o con parpadeo real**.
- **Exploración de gráficos:** flechas, Inicio/Fin, Re Pág/Av Pág, ↑/↓ y S en Dashboard, Regresión, Backtesting y Portafolios; anuncios en `#eia-vivo` y tooltip. **Josué confirmó el 17-nov que el sonido y la voz funcionan.**
- Puntero virtual con `?puntero=raton`: permanencia sobre un botón (un solo clic, sin repetir), `<select>` → diálogo de opciones → elige una, abrir y cerrar el Centro, enlace de otro módulo.
- Guion simulado (`EIA.camara.iniciar("cabeza" | "manos", {simulada: true, objetivo: "#tema"})` o `?camara=simulada&mod=cabeza&objetivo=%23tema`): **cabeza + permanencia**, **cabeza + parpadeo largo** y **mano + pellizco** llevan el puntero al botón y hacen clic; Esc detiene; al detener se quitan HUD, puntero y `modo-puntero`.
- Sin cámara no se descarga MediaPipe (comprobado en los recursos de la página).

**Probado por Josué con la webcam de su laptop (17-nov):** cabeza y manos funcionan de forma continua (tras el PR #20); el sonido y la voz se oyen; la **calibración de 5 puntos** y la **«V» de dos dedos** funcionan bien (tras el PR #25, en Pages).

**NO probado todavía (Anexo A: Adrian y Augusto):**
- **El signo de los ejes de la cabeza.** `senales.anguloCabeza` supone la matriz de MediaPipe en orden por columnas. Si el puntero va al revés, hay dos casillas «Invertir» en el Centro; si hace falta, cambia el valor por defecto de `sx`/`sy` en `js/a11y/cabeza-mirada.js`.
- Umbrales reales de parpadeo (0,5 durante 400 ms), boca (0,5 durante 300 ms), pellizco (0,35 / 0,5) y puño (1,5 s); el recorrido por defecto de la cabeza (18°).
- La reanudación de la cámara al cambiar de página (`sessionStorage.eia_cam`).
- Lectores de pantalla reales (NVDA, Narrador, TalkBack).
- El atajo `Alt+Shift+A` con una pulsación real (el evento sintético llega y abre el panel).

## En curso (estado exacto)
- Nada a medias tras el PR #17. **Los nueve módulos usan `EIA.modulo` e i18n**; ya no queda ninguna página stub.

## Siguiente paso exacto
1. `git pull`; `node --test "tests/unit/*.test.mjs"`; `js/clasificacion.js` es el patrón de módulo.
2. Datos reales: fusionados (PR #22). Revisar el Modo real en Pages tras cada actualización del bot de CX (T-32).
2b. **T-29**: que CX repita su reproductor P08 sobre `main` y cierre #28; luego **congelamiento de funciones** (jue 19, 20:00): desde ahí solo correcciones.
3. Optimizador a 390 px: mejoró (símbolos y zoom, PR #26), pero los frentes del curso casi coinciden; en el celular se elige apagando una serie o desde la tabla.
4. Josué probó la webcam el 17-nov y funciona; si alguien reporta el puntero invertido, usa las casillas «Invertir» del Centro.

## Cómo se hace un módulo (el ejemplo vivo es `js/clasificacion.js` + `tests/unit/clasificacion.test.mjs`)
1. HTML mínimo: `<body data-page="<id>">`, un `<h1>`, un `<p class="sub">`, contenedores vacíos con `id`, `js/common.js` y luego `js/<id>.js`. Texto estático con `data-i18n="clave"`. Sin cifras en el HTML.
2. `js/<id>.js` en formato dual: funciones **puras** de «modelo de vista» (probadas en Node) + pintado + `EIA.modulo({id, cargar, pintar})`.
3. `cargar()` pide los JSON con `EIA.datos(...)`; `pintar(datos)` reconstruye la vista. Se llama otra vez al cambiar idioma, modo o corte: debe ser idempotente. Los oyentes del módulo se enlazan **una sola vez** (bandera `enlazado`).
4. Todo texto visible sale de `EIA.t(clave, {params})`; todo número, de `EIA.fmt.*`; todo dato del JSON pasa por `EIA.esc`.
5. Señales solo con `EIA.ui.chipSenal` (rechaza lo que no sea SUBE/BAJA).
6. El aviso del módulo lo inserta el núcleo (`aviso.<modo>.<id>` en i18n). No lo escribas en el HTML.

## Desviaciones respecto del plan (decididas al ejecutar)
- **Markowitz** usa un algoritmo de pares exacto (KKT), no gradiente proyectado: el gradiente tardaba 28 s; este, 16 ms.
- **`js/a11y/preferencias.js` y `anunciador.js` no existen:** las preferencias las aplica `EIA.aplicarPreferencias()` de `common.js` (para no cargar nada más en cada página) y los anuncios son `EIA.ui.anunciar()`. El panel está en `js/a11y/panel.js`.
- **Calibración de 5 puntos:** está con interfaz desde el PR #25 (`EIA.camara.calibrar`); sin calibrar se usan «Recentrar» y ganancias fijas (±18° de giro y ±12° de inclinación). El **ajuste fino con el iris no se hizo**.
- **Gestos de mano (D-23):** sin «deslizar» ni «pulgar arriba»; hay «V» de dos dedos para desplazar.
- **`resumen.js` y `lectura.js` no existen:** el resumen automático y la exploración punto a punto viven en `EIA.ui.grafico` (núcleo), para que todos los gráficos los tengan sin cargar nada más. `js/a11y/sonificacion.js` (tonos) y `js/a11y/barrido.js` sí son archivos aparte, cargados bajo demanda.
- **Sonificación de la regresión:** la mediana y la historia suenan como series (↑/↓ para cambiar); la banda como ruido suave no se hizo.
- **Fuente legible:** usa Atkinson Hyperlegible o Verdana **si están instaladas**; no se descarga ninguna fuente (el sitio no carga recursos externos aparte de ECharts y MediaPipe).
- **`EIA.historia`** existe pero ningún módulo la usa todavía.
- **T-00** (fila de Josué en el tablero) sigue en «pendiente» aunque el repo y Pages ya existen: no es una fila de CC.

## Trampas conocidas
- **Comando de pruebas:** `node --test "tests/unit/*.test.mjs"` (con la carpeta sola, Node ≥ 21 falla).
- **El panel de navegador integrado de Claude, cuando está oculto, no ejecuta `requestAnimationFrame` ni entrega el evento `close` de `<dialog>`.** Por eso `EIA.ui.dialogo` finaliza también tras `submit`, `cancel` y `cerrar()`, y para probar el puntero sin ver el panel sustituí `requestAnimationFrame` por un temporizador dentro de la prueba. En un navegador normal no pasa.
- **Nunca reescribas con `innerHTML` un nodo que contenga el `<video>` de la cámara:** al salir del documento el navegador lo pausa y el seguimiento se congela (fue el fallo del 17-nov; hay una prueba que vigila `camara.js`).
- **ECharts y `aria-label`:** con `aria.enabled`, ECharts reescribe el `aria-label` del lienzo con una descripción automática en inglés. `EIA.ui.grafico` le pasa el resumen i18n en `aria.label.description`; si haces un gráfico fuera del núcleo, haz lo mismo.
- **Exploración con teclado:** `cfg.sonido()` devuelve `{series:[{nombre, valores, etiquetas, formato, tipo, indice | tip(i, instancia)}], inicial}`. Si el módulo ya maneja las flechas sobre su lienzo, pasa `explorar: false` (Optimizador).
- **Migas de pan** (`js/common.js`, `prepararMigas`/`pintarMigas`): salen de `document.referrer` + `?t=`/`?nivel=` y de `sessionStorage.eia_migas`; **no** agregues parámetros a la URL de los enlaces cruzados (CX compara URLs exactas).
- **«Llevar a Trading»** vive en el núcleo (`EIA.ui.llevarATrading`): úsalo desde cualquier módulo con `{pesos, excluidos, nivel, origen, fuente}`; guarda `eia_elegido.aplicado`, que Trading muestra.
- **A 390 px los puntos de NSGA-II y NSGA-III se superponen** (lo detectó CX en E2E): para elegir con el dedo hay que apagar series; con teclado o desde la tabla funciona. Mejora pendiente.
- **Modo real hoy:** `data_real/` solo tiene `meta.json` y `cierres_historicos.json`. Cada módulo muestra «publicación parcial» y nombra el archivo que falta; es lo esperado hasta que CX publique 01–13.
- **El navegador cachea `js/common.js` y los `i18n/*.json`** con `python -m http.server`: tras editarlos, recarga forzada (Ctrl+F5).
- **Remontar componentes:** `EIA.ui.tabla`, `segmentado` y `grafico` cancelan sus oyentes anteriores al montarse otra vez sobre el mismo nodo (`montar()` en `common.js`). Si creas un componente nuevo con `addEventListener` sobre `destino`, usa `montar(destino).control.signal`.
- **Formato de `js/lib`:** cada archivo publica `EIALib.<nombre>` y `module.exports`; las dependencias se piden con `dep("nombre")`. En un Worker se cargan con `importScripts` **en orden de dependencia** (estadistica y simplex antes de markowitz; markowitz antes de nsga2, nsga3 y backtest).
- **Las carteras de `09` del profesor no se reproducen** con `backtest.js` (su optimizador no está documentado); las referencias sí. No es un fallo: el recálculo solo existe en el Modo real. **Con los datos reales sí:** misma fecha final → EPU y 1/N idénticos al Python de CX; Moderado +17,05 % frente a +17,03 %.
- **ECharts conectados (`echarts.connect`):** nunca llames a `dispatchAction` dentro de un evento de leyenda: se reenvía entre los gráficos sin fin. Usa `setOption({legend: {selected}})` (no emite eventos) y deja que `connect` propague los clics.
- **`String.replace` con texto de reemplazo:** `$$` se vuelve `$` (me pasó con `$$(…)`). En los scripts de edición, usa una función como reemplazo.
- **Recálculo (`EIA.ui.recalculo`):** el módulo guarda `recalc` y en `pintar(datos)` lo mezcla con los datos del archivo; se descarta al cambiar de modo (y de corte en el Optimizador). El Worker solo se crea en el núcleo (`EIA.trabajo`); una prueba vigila que ningún módulo cree Workers.
- **Voz (`js/a11y/voz.js`):** la gramática está en i18n (`voz.g_*`, `voz.m_*`, alternativas sin tildes separadas por «|»); para un comando nuevo agrega la clave en los dos idiomas y el caso en `interpretar` y `ejecutar`. Mientras el sitio habla se detiene el reconocimiento (si no, se oye a sí mismo). Chrome y Edge envían el audio a su servicio: por eso hay consentimiento.
- **Corte antiguo en Regresión:** la historia sale de `cortes/<fecha>/auditoria.json → precios_validacion` (precios congelados del corte). No uses el 02 actual recortado salvo como respaldo: Yahoo revisa los ajustados.
- **`cortes/index.json`:** `ultimo` no está en `cortes[]` y el arreglo viene ascendente; usa siempre `EIA.ordenarCortes`.
- **R-REG-09 literal falla en 5 activos** de `data/` por redondeo: se verifica con I-03b (contrato §4 y nota N-1).
- **El 1/N del profesor es de rebalanceo diario** (contrato I-10, nota N-2). La volatilidad de `09` usa desviación poblacional.
- **El «Agresivo» de `08` rinde menos que el «Moderado»** (nota N-4): no escribir textos que afirmen un orden entre niveles.
- **Texto sobre `--ac`:** usar siempre `--on-ac` (blanco fijo da 2,08:1 en oscuro; hay una prueba que lo vigila).
- **Los diccionarios i18n no llevan cifras** (prueba «sin cifras de datos»): los números entran como parámetros. Las claves que terminan en `_` son prefijos (`"a11y.mod_" + modalidad`).
- `09.fechas[0]` es `"inicio"`, no una fecha (I-06). `EIA.fmt.fecha("inicio")` ya lo traduce.
- El Agresivo del backtesting del profesor usa tope 0,35 aunque `08` diga 25 % (nota N-3): se documenta, no se corrige. Backtesting lo calcula (`pesoMaximo`) y muestra `#nota-tope` solo si alguna cartera supera el tope de `13`.
- **Interpretación del Backtesting:** las frases salen de `B.interpretar(c09, tope)`; no escribas conclusiones fijas en i18n (hay una prueba que altera los datos y espera otro texto).
- `es-PE` en `Intl` usa punto decimal: `+2.93%`, `USD 355.63`. Las fechas ISO se formatean en **UTC**.
- En el celular (≤ 640 px) la cabecera no es fija, a propósito: ocupa varias filas.
- `figma-src/` trae sus propios `.gitignore` y `.gitattributes`: son parte del export y no se tocan.
- La CI es `.github/workflows/qa.yml` (de CX): fusiona solo con `pruebas` y `secretos` en verde.

## Cómo probar
- `python -m http.server 8000` → http://127.0.0.1:8000 (o `?modo=real`, `?lang=en-US`, `?t=NVDA`)
- `node --test "tests/unit/*.test.mjs"`
- Puntero sin cámara: `clasificacion.html?puntero=raton` (quédate quieto 0,9 s sobre un botón).
- Guion simulado: `clasificacion.html?camara=simulada&mod=cabeza&objetivo=%23tema` (el tema cambia solo a los ~2 s).
- Cámara real: botón «Accesibilidad» → «Activar: puntero con la cabeza». Requiere `http://localhost` o HTTPS.
