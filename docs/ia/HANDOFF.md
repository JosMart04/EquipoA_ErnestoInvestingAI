# HANDOFF — estado para quien retome

> Lo actualiza **Claude Code al terminar cada bloque** (hoy Fable, que solo está disponible el lunes 16-nov; desde el martes, Opus 5.5).
> Opus: contrasta este archivo con el código y con `git log`; no confíes ciegamente.

## Última actualización
- Fecha y hora: 2026-11-16 20:25 (Lima)
- Modelo: Claude Fable 5.2 (Claude Code)
- Rama / último commit: `cc/T-09-lib` → PR-4 (js/lib + Workers)

## Hecho (con evidencia)
- **CC-F-00:** repo creado desde la base del profesor (`e9d711e`), `figma-src/` sin editar, Pages activo. SHA-256 de `data/`: 13/13.
- **T-01, T-02 (PR #2):** plan aprobado, contrato v1.0.0, tablero, D-17…D-21, `.nojekyll`. C-01 y C-02 esperan `ACK` de CX.
- **T-03…T-07 (PR-2), núcleo:**
  - `js/common.js`: espacio `EIA` con modo, capa de datos con caché, estado, eventos, i18n, formatos `Intl`, tema y componentes (`aviso`, `fichaIA`, `tabla`, `grafico`, `segmentado`, chips, `dialogo`, `notificar`, `progreso`, `error`) y el ciclo de vida `EIA.modulo({id, cargar, pintar})`. Conserva `$`, `fmt`, `loadJSON`, `store`, `buildShell`, `showError`, `window.init` y `window.onTheme` de la base.
  - `css/styles.css`: tokens claro/oscuro (incluye `--on-ac`, `--bd-ctl`, `--serie-1…6`, mapa de calor), shell con menú colapsado bajo 1180 px, componentes.
  - `i18n/es-PE.json` y `i18n/en-US.json` (mismas claves).
  - `index.html`: el gráfico de velas ya usa `EIA.ui.grafico` (Gráfico | Tabla | Resumen + Escuchar).
  - **Evidencia:** `node --test "tests/unit/*.test.mjs"` → 41/41. Humo en navegador: 9 páginas a 390 px y 1280 px, profesor y real, ES y EN: sin desborde, 9 enlaces, `aria-current`, aviso por módulo, sin claves i18n faltantes; consola sin errores en Modo profesor. Comprobado a mano por script: el gráfico cambia de color con el tema, orden con `aria-sort` y anuncio, flechas en las pestañas, cambio de activo sin recargar, menú con `aria-expanded` y Esc.

- **T-08 (PR-3), Clasificación, MÓDULO DE REFERENCIA:** `clasificacion.html` + `js/clasificacion.js` (modelo de vista puro + pintado + `EIA.modulo`). Mapa de calor 26 × 18 = 468 celdas con color + símbolo + palabra; vistas «Matriz» y «Por activo» (por defecto bajo 640 px); filtros por grupo, familia, watchlist y modelos visibles; consenso con enlaces `?t=`; métricas ordenables; matriz de confusión; bloque de honestidad calculado; ficha IA. **Evidencia:** 51/51 pruebas; en navegador a 1280 y 390 px, ES y EN (cambio de idioma sin recargar), profesor y real: sin desborde, solo SUBE/BAJA (UP/DOWN), consola sin errores en Modo profesor.

- **T-09…T-13 (PR-4), algoritmos y Workers:** `js/lib/` (`prng`, `estadistica`, `simplex`, `markowitz`, `nsga2`, `nsga3`, `backtest`) y `js/workers/` (`optimizador`, `backtest`) + `EIA.trabajo(nombre, params, {alProgresar})`. **Evidencia:** 69/70 pruebas (1 se salta: fixture de CX). Markowitz coincide con `07` del profesor (≤ 0,02 pp); mediana y bandas reproducen `06`; métricas y drawdown reproducen `09`; SPY/QQQ/EPU/1-N exactos. En el navegador: optimizador completo en 1,4 s, backtest en 0,16 s, cancelación y errores correctos. **Aún no los usa ninguna página** (T-18, T-24 y T-26).

## En curso (estado exacto)
- Nada a medias. Lo siguiente es el PR-5 (núcleo de accesibilidad).

## Siguiente paso exacto
1. Rama `cc/T-14-a11y`: T-14 a T-16 del plan §9 y §11 (`js/a11y/*`, `js/lib/senales.js`, modelos en `assets/mediapipe/`, botón `#btn-a11y`).
2. Martes (Opus): T-17 Regresión y T-18 Optimizador **copiando la estructura de `js/clasificacion.js`**.

## Cómo se hace un módulo (el ejemplo vivo es `js/clasificacion.js` + `tests/unit/clasificacion.test.mjs`)
1. HTML mínimo: `<body data-page="<id>">`, un `<h1>`, contenedores vacíos con `id`, `js/common.js` y luego `js/<id>.js`. Texto estático con `data-i18n="clave"`.
2. `js/<id>.js` en formato dual: funciones **puras** de «modelo de vista» (probadas en Node) + `EIA.modulo({id, cargar, pintar})`.
3. `cargar()` pide los JSON con `EIA.datos(...)`; `pintar(datos)` reconstruye la vista (se llama otra vez al cambiar idioma, modo o corte).
4. Todo texto visible sale de `EIA.t(clave, {params})`; todo número, de `EIA.fmt.*`; todo dato del JSON pasa por `EIA.esc`.
5. Señales solo con `EIA.ui.chipSenal` (rechaza lo que no sea SUBE/BAJA).

## Trampas conocidas
- **Comando de pruebas:** `node --test "tests/unit/*.test.mjs"` (con la carpeta sola, Node ≥ 21 falla).
- **Formato de `js/lib`:** cada archivo publica `EIALib.<nombre>` y `module.exports`; las dependencias se piden con `dep("nombre")`. En un Worker se cargan con `importScripts` **en orden de dependencia** (estadistica y simplex antes de markowitz; markowitz antes de nsga2, nsga3 y backtest).
- **Las carteras de `09` del profesor no se reproducen** con `backtest.js` (su optimizador no está documentado); las referencias sí. No es un fallo: el recálculo solo existe en el Modo real.
- **Markowitz usa un algoritmo de pares exacto** (KKT). El gradiente proyectado que proponía el PLAN_MAESTRO tardaba 28 s; este tarda 16 ms.
- **El navegador cachea `js/common.js`** con `python -m http.server`: tras editarlo, recarga forzada (Ctrl+F5).
- **R-REG-09 literal falla en 5 activos** de `data/` por redondeo: se verifica con I-03b (contrato §4 y nota N-1).
- **El 1/N del profesor es de rebalanceo diario** (contrato I-10, nota N-2).
- **El «Agresivo» de `08` rinde menos que el «Moderado»** (nota N-4): no escribir textos que afirmen un orden entre niveles.
- **Texto sobre `--ac`:** usar siempre `--on-ac` (blanco fijo da 2,08:1 en oscuro; hay una prueba que lo vigila).
- **Los diccionarios i18n no llevan cifras** (prueba «sin cifras de datos»): los números entran como parámetros.
- **Modo real sin `data_real/`:** cada página registra un 404 de `data_real/meta.json` en la consola; es lo esperado.
- **Páginas con `window.init`** (heredadas y stubs): su texto estático sigue solo en español hasta T-17…T-24.
- El botón «Accesibilidad» de la cabecera todavía no existe: llega con el PR-5 (`#btn-a11y`).
- `09.fechas[0]` es `"inicio"`, no una fecha (I-06). `EIA.fmt.fecha("inicio")` ya lo traduce.
- El Agresivo del backtesting del profesor usa tope 0,35 aunque `08` diga 25 % (nota N-3): se documenta, no se corrige.
- `es-PE` en `Intl` usa punto decimal: `+2.93%`, `USD 355.63`. Las fechas ISO se formatean en **UTC**.
- Un `<select>` nativo no se abre con el puntero virtual (§9.3).
- `figma-src/` trae sus propios `.gitignore` y `.gitattributes`: son parte del export y no se tocan.
- Aún no hay CI: se fusiona con puerta local (plan §13).

## Cómo probar
- `python -m http.server 8000` → http://127.0.0.1:8000 (o `?modo=real`, `?lang=en-US`)
- `node --test "tests/unit/*.test.mjs"`
