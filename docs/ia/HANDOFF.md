# HANDOFF — estado para quien retome

> Lo actualiza **Claude Code al terminar cada bloque**. Fable 5.2 hizo T-01…T-16 el lunes; desde el martes 17 trabaja Opus 5.5 (CC-O).
> Opus: contrasta este archivo con el código y con `git log`; no confíes ciegamente.

## Última actualización
- Fecha y hora: 2026-11-17 12:44 (Lima)
- Modelo: Claude Opus 5.5 (Claude Code)
- Rama / último commit: `cc/T-25-migas` → PR #19 (migas de pan)

## Hecho (con evidencia)

Todo está en `main` por PR. `node --test "tests/unit/*.test.mjs"` → **120/120, ninguna omitida**. Además, CX tiene 48 E2E con Playwright (PR #15 y #18) en la CI. La CI (`qa.yml` de CX) corre en cada PR: pruebas JS, 16 pruebas Python de datos y Gitleaks.

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
| #19 | T-25 | **Migas de pan** en el núcleo al llegar por un enlace cruzado (Clasificación › NVDA › Regresión › Optimizador; Portafolios › Agresivo › Backtesting) | 120/120; navegador: cadena, recarga, vuelta atrás, cambio de activo, EN, barra de módulos sin migas, 390 px; 27 cargas de humo |

### Accesibilidad: qué está probado y qué no

**Probado en el navegador sin webcam (Fable el 16, Opus el 17):**
- **Bucle real de la cámara** (PR #8): MediaPipe 1.2.3 cargado de verdad con un video falso (`canvas.captureStream`): 369 cuadros en 10 s (46 por segundo), el `<video>` sigue en la página y sin pausa. Con un detector sustituto en movimiento: el puntero sigue moviéndose a los 10 s con la cabeza; con la mano abierta no se pausa; el puño 1,5 s pausa y reanuda; si algo saca el `<video>`, el vigilante lo devuelve.
- Centro de accesibilidad (`#btn-a11y` o `Alt+Shift+A`): tamaño de texto, alto contraste, reducir movimiento, espaciado, subrayar enlaces y tramas; se guardan en `eia_a11y` y se aplican en todas las páginas.
- Puntero virtual con `?puntero=raton`: permanencia sobre un botón (un solo clic, sin repetir), `<select>` → diálogo de opciones → elige una, abrir y cerrar el Centro, enlace de otro módulo.
- Guion simulado (`EIA.camara.iniciar("cabeza" | "manos", {simulada: true, objetivo: "#tema"})` o `?camara=simulada&mod=cabeza&objetivo=%23tema`): **cabeza + permanencia**, **cabeza + parpadeo largo** y **mano + pellizco** llevan el puntero al botón y hacen clic; Esc detiene; al detener se quitan HUD, puntero y `modo-puntero`.
- Sin cámara no se descarga MediaPipe (comprobado en los recursos de la página).

**NO probado (necesita una persona con webcam; Anexo A: Adrian y Augusto):**
- **Josué probó la versión del PR #6 el 17-nov: el puntero solo se movía el primer instante.** La causa se corrigió en el PR #8; **falta que vuelva a probarlo** con la cámara real (al menos 1 minuto con la cabeza y 1 con la mano, en dos páginas).
- **El signo de los ejes de la cabeza.** `senales.anguloCabeza` supone la matriz de MediaPipe en orden por columnas. Si el puntero va al revés, hay dos casillas «Invertir» en el Centro; si hace falta, cambia el valor por defecto de `sx`/`sy` en `js/a11y/cabeza-mirada.js`.
- Umbrales reales de parpadeo (0,5 durante 400 ms), boca (0,5 durante 300 ms), pellizco (0,35 / 0,5) y puño (1,5 s); el recorrido por defecto de la cabeza (18°).
- La reanudación de la cámara al cambiar de página (`sessionStorage.eia_cam`).
- Lectores de pantalla reales (NVDA, Narrador, TalkBack).
- El atajo `Alt+Shift+A` con una pulsación real (el evento sintético llega y abre el panel).

## En curso (estado exacto)
- Nada a medias tras el PR #17. **Los nueve módulos usan `EIA.modulo` e i18n**; ya no queda ninguna página stub.

## Siguiente paso exacto
1. `git pull`; `node --test "tests/unit/*.test.mjs"`; `js/clasificacion.js` es el patrón de módulo.
2. **T-27** (accesibilidad a y e): resumen y lectura punto a punto de cada gráfico, barrido; **T-26** (Modo real) cuando CX publique 01–13 en `data_real/`.
3. Mejora pendiente del Optimizador: a 390 px los puntos de NSGA-II y NSGA-III se superponen.
4. Cuando Josué vuelva a probar la webcam, ajusta signos y umbrales con lo que reporte.

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
- **Calibración de 5 puntos:** está la matemática (`senales.ajusteAfin`, probada) pero no la interfaz; hoy se usa «Recentrar» y ganancias fijas (±18° de giro y ±12° de inclinación recorren la pantalla).
- **Sonificación:** solo el barrido básico de «Escuchar» (`js/a11y/sonificacion.js`).
- **`EIA.historia`** existe pero ningún módulo la usa todavía.
- **T-00** (fila de Josué en el tablero) sigue en «pendiente» aunque el repo y Pages ya existen: no es una fila de CC.

## Trampas conocidas
- **Comando de pruebas:** `node --test "tests/unit/*.test.mjs"` (con la carpeta sola, Node ≥ 21 falla).
- **El panel de navegador integrado de Claude, cuando está oculto, no ejecuta `requestAnimationFrame` ni entrega el evento `close` de `<dialog>`.** Por eso `EIA.ui.dialogo` finaliza también tras `submit`, `cancel` y `cerrar()`, y para probar el puntero sin ver el panel sustituí `requestAnimationFrame` por un temporizador dentro de la prueba. En un navegador normal no pasa.
- **Nunca reescribas con `innerHTML` un nodo que contenga el `<video>` de la cámara:** al salir del documento el navegador lo pausa y el seguimiento se congela (fue el fallo del 17-nov; hay una prueba que vigila `camara.js`).
- **Migas de pan** (`js/common.js`, `prepararMigas`/`pintarMigas`): salen de `document.referrer` + `?t=`/`?nivel=` y de `sessionStorage.eia_migas`; **no** agregues parámetros a la URL de los enlaces cruzados (CX compara URLs exactas).
- **«Llevar a Trading»** vive en el núcleo (`EIA.ui.llevarATrading`): úsalo desde cualquier módulo con `{pesos, excluidos, nivel, origen, fuente}`; guarda `eia_elegido.aplicado`, que Trading muestra.
- **A 390 px los puntos de NSGA-II y NSGA-III se superponen** (lo detectó CX en E2E): para elegir con el dedo hay que apagar series; con teclado o desde la tabla funciona. Mejora pendiente.
- **Modo real hoy:** `data_real/` solo tiene `meta.json` y `cierres_historicos.json`. Cada módulo muestra «publicación parcial» y nombra el archivo que falta; es lo esperado hasta que CX publique 01–13.
- **El navegador cachea `js/common.js` y los `i18n/*.json`** con `python -m http.server`: tras editarlos, recarga forzada (Ctrl+F5).
- **Remontar componentes:** `EIA.ui.tabla`, `segmentado` y `grafico` cancelan sus oyentes anteriores al montarse otra vez sobre el mismo nodo (`montar()` en `common.js`). Si creas un componente nuevo con `addEventListener` sobre `destino`, usa `montar(destino).control.signal`.
- **Formato de `js/lib`:** cada archivo publica `EIALib.<nombre>` y `module.exports`; las dependencias se piden con `dep("nombre")`. En un Worker se cargan con `importScripts` **en orden de dependencia** (estadistica y simplex antes de markowitz; markowitz antes de nsga2, nsga3 y backtest).
- **Las carteras de `09` del profesor no se reproducen** con `backtest.js` (su optimizador no está documentado); las referencias sí. No es un fallo: el recálculo solo existe en el Modo real.
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
