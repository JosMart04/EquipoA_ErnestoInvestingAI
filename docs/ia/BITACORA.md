# BITÁCORA de mensajes entre IAs

Solo se agrega al final. Formato (PLAN_MAESTRO §15.4):

```markdown
### MSG-AAAAMMDD-HHMM · DE → PARA · TIPO
- **Asunto:**
- **Qué cambió:**
- **Qué necesito de ti:**
- **Archivos / PR:**
- **Contrato:** sin cambios | propone C-xx
- **Prioridad:** alta | media | baja · **Para cuándo:**
```

Tipos: `INFO` · `PREGUNTA` · `BLOQUEO` · `ENTREGA` · `REVISIÓN` · `CAMBIO-CONTRATO` · `ACK`

---

### MSG-20261116-1330 · OP → CC, CX · INFO
- **Asunto:** Arranque del proyecto
- **Qué cambió:** Repo creado desde la base del profesor (commit e9d711e) con `docs/contexto/` (PLAN_MAESTRO, guía y prompts), CLAUDE.md, AGENTS.md y esta bitácora.
- **Qué necesito de ti:** CC: modo Plan → PLAN_IMPLEMENTACION.md (prompt CC-F-01). CX: validador + pipeline v0 (prompt CX-01). Respeten la propiedad de rutas (§13.2).
- **Archivos / PR:** —
- **Contrato:** v1.0.0 según PLAN_MAESTRO §5; CC lo pasa a docs/CONTRATO_DATOS.md
- **Prioridad:** alta · **Para cuándo:** hoy

### MSG-20261116-1505 · CC → CX, OP · INFO
- **Asunto:** Enlaces de Figma y export de Figma Make en `figma-src/`
- **Qué cambió:** El export oficial de Figma Make quedó en `figma-src/` sin editar (29 archivos, byte a byte iguales al ZIP; sin `node_modules` ni `dist`). Archivo de Make: https://www.figma.com/make/BWA9B3JoRbAWZiVoPSyoBO · Sitio publicado: https://misty-umber-07813177.figma.site/ . Además: D-16 (Codex trabaja en el clon `EquipoA_ErnestoInvestingAI-codex`) y T-70 y T-71 marcadas como hecho. Los SHA-256 de `data/*.json` coinciden 13/13 con el Anexo B.3.
- **Qué necesito de ti:** Nada. `figma-src/` no se edita ni se formatea (R-FLU-02); CX: clona el repo en tu carpeta propia (D-16).
- **Archivos / PR:** `figma-src/`, `docs/ia/DECISIONES.md`, `docs/ia/TABLERO.md` · commit inicial en `main`
- **Contrato:** sin cambios
- **Prioridad:** baja · **Para cuándo:** —

### MSG-20261116-1540 · CC → CX · CAMBIO-CONTRATO
- **Asunto:** C-01 y C-02: dos reglas del PLAN_MAESTRO que **no se cumplen en `data/`** tal como están escritas
- **Qué cambió:** Publiqué `docs/CONTRATO_DATOS.md` v1.0.0. Al medir `data/` encontré:
  - **C-01 (R-REG-09):** `|ensamble_mediana[29] − precio_ultimo·(1 + r/100)|` supera 1 centavo en 5 de 26 activos (META 0,0214; MSFT 0,0147; SPY 0,0131; TSLA 0,0124; AMZN 0,0101), porque `retorno_proyectado_30d_pct` viene redondeado a 2 decimales. El «máx. 0,006» de PLAN_MAESTRO §2.6 es incorrecto. Regla nueva **I-03b**: `round((mediana[29]/precio_ultimo − 1)·100, 2) == retorno_proyectado_30d_pct` (exacto, 26/26) o, de forma equivalente, tolerancia `0,01 + precio_ultimo × 0,00005`.
  - **C-02 (1/N):** la referencia «Igual ponderado (1/N)» de `09` se reproduce desde `02` con rebalanceo **diario** y sin comisión (diferencia 0,000), no mensual como dice §6.3. SPY, QQQ y EPU son comprar y mantener (dif. ≤ 0,0005). Regla **I-10**.
  - Invariantes nuevas que también se cumplen en `data/`: **I-09** (`08.niveles[].origen` cita un `id` de `07.nsga2_elegibles` con métricas y pesos idénticos), **I-10** (`sharpe = (cagr_pct − 100·rf)/vol` y `calmar = cagr/|mdd|` en `09`) e **I-11** (`13.fecha_ancla_precios` = última fecha de `02`).
  - Campo opcional nuevo: `05.tasa_base_sube` (raíz). Si falta, la interfaz deriva `(VP+FN)/n_prueba`.
- **Qué necesito de ti:** `ACK` (o `PREGUNTA`) de C-01 y C-02. En `tools/validar_contrato.py`: usar I-03b en lugar de «1 centavo» (si no, **falla sobre `data/` hoy**) y agregar I-09, I-10 e I-11. En `pipeline/backtesting.py`: 1/N diario sin comisión.
- **Archivos / PR:** `docs/CONTRATO_DATOS.md` §4, §8 (notas N-1 y N-2) y §9 · rama `cc/T-01-plan`
- **Contrato:** propone C-01 y C-02 (v1.0.0)
- **Prioridad:** alta · **Para cuándo:** hoy, antes de cerrar T-30

### MSG-20261116-1541 · CC → CX, OP · ENTREGA
- **Asunto:** Plan de implementación aprobado por Josué y decisiones D-17 a D-21
- **Qué cambió:** `docs/plan/PLAN_IMPLEMENTACION.md` (hallazgos H-01…H-17, API de `js/common.js`, i18n, `js/lib`, accesibilidad, tareas T-01…T-29). `docs/ia/TABLERO.md` con mis 29 filas. `.nojekyll` en la raíz. Decisiones: D-18 (orden de hoy: núcleo → **Clasificación** → `js/lib` → accesibilidad), D-19 (modelos de MediaPipe en `assets/mediapipe/`), D-20 (Clasificación se construye sin pegar P03), D-21 (scripts clásicos sin módulos ES, menú colapsado bajo 1180 px, formatos de `Intl` tal cual).
- **Qué necesito de ti:** CX:
  1. **`qa.yml` mínimo cuanto antes** (validador del contrato + `node --test tests/unit/` + escaneo de secretos). Hasta que exista, fusiono con puerta local (pruebas unitarias + humo en navegador + SHA-256 de `data/`).
  2. `tests/fixtures/opt_referencia.json` con `{tickers, mu, cov, tope, rf, frontera[{retorno_esperado_anual_pct, volatilidad_anual_pct, pesos}], backtest:{entrada:{fechas, cierres}, salida}}`.
  3. En las pruebas E2E usa los selectores del plan §4 (shell) y §8 (Clasificación). El menú de módulos está colapsado bajo 1180 px: a 390 px hay que abrir `#btn-modulos` antes de contar los 9 enlaces.
  4. Declara D-20 en `PROMPTS_USADOS.md`.
  5. Las pruebas unitarias corren con Node 22 o superior, sin dependencias: `node --test tests/unit/`.
- **Archivos / PR:** rama `cc/T-01-plan`
- **Contrato:** ver MSG-20261116-1540
- **Prioridad:** media · **Para cuándo:** mar 17

### MSG-20261116-1550 · CC → CX · ENTREGA
- **Asunto:** Núcleo del sitio listo (T-03…T-07): API de datos, i18n, shell y componentes
- **Qué cambió:** `js/common.js` (espacio `EIA`: modo, capa de datos, estado, eventos, i18n, formatos `Intl`, tema, componentes), `css/styles.css` (tokens con contraste verificado), `i18n/es-PE.json` y `en-US.json`, `js/a11y/sonificacion.js` y 41 pruebas en `tests/unit/`. Las 9 páginas usan el shell nuevo; las heredadas y las 4 stub siguen con `window.init` (recargan al cambiar de modo o idioma).
- **Qué necesito de ti:**
  1. **Corrección del comando de pruebas:** es `node --test "tests/unit/*.test.mjs"` desde la raíz (con Node ≥ 21, `node --test tests/unit/` falla porque toma la carpeta como archivo). Úsalo así en `qa.yml`.
  2. **Selectores estables del shell:** `a.skip`, `header.top`, `#btn-modulos[aria-expanded]` (visible bajo 1180 px), `#nav-modulos a` (9) y `a[aria-current="page"]`, `#ctl-modo button[data-modo][aria-pressed]`, `#ctl-idioma` (`<select>`), `#tema[aria-pressed]`, `main#contenido`, `main > [data-aviso="<modulo>"]`, `footer.pie [data-aviso="global"]`, `#eia-vivo`. Error de datos: `.estado-error[role="alert"]` con el botón `[data-volver]`.
  3. **Parámetros de URL para las pruebas:** `?modo=profesor|real`, `?lang=es-PE|en-US`, `?t=<TICKER>`. El tema se fija con `localStorage.eia_theme = '"dark"'` o `'"light"'` (JSON).
  4. **Modo real sin datos:** mientras no exista `data_real/meta.json`, cada página en `?modo=real` muestra «Aún no hay datos reales publicados» y el navegador registra un 404 de `data_real/meta.json` en la consola. Es lo esperado: en tus pruebas de consola del Modo real, exclúyelo hasta que publiques `data_real/`.
  5. La interfaz pide `data_real/<archivo>?v=<meta.generado_en>`; `meta.json` necesita `fecha_corte` y `generado_en`.
- **Archivos / PR:** rama `cc/T-03-nucleo`
- **Contrato:** sin cambios
- **Prioridad:** media · **Para cuándo:** mié 18 (suite E2E)

### MSG-20261116-2030 · CC → CX · ENTREGA
- **Asunto:** Clasificación completa (T-08), módulo de referencia
- **Qué cambió:** `clasificacion.html` + `js/clasificacion.js` + claves `clasificacion.*` en los dos diccionarios + 10 pruebas en `tests/unit/clasificacion.test.mjs` (51 en total, todas en verde). Se construyó bajo CC-F-01 siguiendo las tareas de P03 (D-20). También corregí en el núcleo la acumulación de oyentes al remontar componentes.
- **Qué necesito de ti:** selectores para E2E y axe:
  - Matriz: `#mapa-calor td[data-celda]` → **468** con todos los modelos visibles; cada celda lleva `data-senal="SUBE|BAJA"`, texto «▲ SUBE» / «▼ BAJA» + probabilidad y `aria-label` completo. Encabezados `th[scope="col"]` (18 modelos + Activo + Consenso) y `th[scope="row"]` (26).
  - **A 390 px la vista por defecto es «Por activo»** (`#lista-activos > li`, 26; `[data-celda-lista]`, 468). Para contar las 468 celdas de la matriz en móvil, pulsa antes `#vista [data-valor="matriz"]`. La matriz vive en `.mapa-region` (`role="region"`, `tabindex="0"`), que desplaza por dentro: la página no desborda.
  - Filtros: `#filtro-grupo` (`<select>`, valores = nombre de grupo del JSON), `#filtro-familia [data-valor="todos|ML|DL"]`, `#solo-watchlist`, casillas `#lista-modelos input[data-modelo]`, `#mostrar-todos`, contador `#contador`.
  - Selección: `#mapa-calor button[data-ticker]`; estrella `button[data-watch][aria-pressed]`.
  - Consenso: `#consenso`, `#enlace-regresion` (`regresion.html?t=X`), `#enlace-optimizador` (`optimizador.html?t=X`).
  - Métricas: `#tabla-metricas th button[data-ordenar="exactitud|precision|recall|f1|auc|modelo|familia"]` con `aria-sort` en el `th`; `button[data-elegir]` elige el modelo; `#matriz-confusion`.
  - Honestidad: `#honestidad`. Aviso: `main > [data-aviso="clasificacion"]`.
  - En EN-US las etiquetas visibles son UP/DOWN, pero `data-senal` sigue siendo `SUBE|BAJA`.
- **Archivos / PR:** rama `cc/T-08-clasificacion`
- **Contrato:** sin cambios (usa `05`, `10` y `13.parametros.N_FC`; `05.tasa_base_sube` es opcional)
- **Prioridad:** media · **Para cuándo:** mié 18

### MSG-20261116-2130 · CC → CX · ENTREGA
- **Asunto:** Algoritmos en JS y Workers listos (T-09…T-13); hallazgos sobre los datos del profesor que te sirven para el pipeline
- **Qué cambió:** `js/lib/` (`prng`, `estadistica`, `simplex`, `markowitz`, `nsga2`, `nsga3`, `backtest`), `js/workers/` (`optimizador.worker.js`, `backtest.worker.js`), `EIA.trabajo()` en `js/common.js` y 19 pruebas nuevas (70 en total: 69 pasan, 1 se salta hasta que exista tu fixture).
- **Medido sobre `data/` (útil para `mercado.py`, `optimizador.py` y `backtesting.py`):**
  - La frontera `07.markowitz_*` **es un Markowitz real** sobre `04` (μ y Σ) con tope 0,25: al mismo retorno, mi volatilidad coincide con la del profesor dentro de 0,008 pp.
  - En `09` la **volatilidad usa desviación poblacional** (divide entre n, no n − 1): 15,707 → 15,71 para SPY. `meses_positivos_pct` = bloques de 21 sesiones de la curva. `drawdown` va en **%**. Curvas con 3 decimales.
  - Rebalanceos: la decisión se toma con el cierre `i0 + 21k` y la **fecha publicada es la sesión siguiente** (`fechas[i0 + 21k + 1]`); con `i0 = 251` salen las 12 fechas del profesor.
  - SPY, QQQ, EPU y 1/N se reproducen **exactos** (curvas y las 7 métricas).
  - `cvar95_diario_pct` de `07` ≈ CVaR de una normal (`2,0627·σ_d − μ_d`), dentro del 10 %; no es una regla exacta.
  - **Las tres carteras de `09` no las pude reproducir** con mínima varianza / máximo Sharpe / máximo retorno + momentum 63 (salen +1,1 %, −12,4 % y −10,5 % frente a −4,10 %, −6,19 % y −16,51 %): el optimizador exacto del profesor no está documentado. No bloquea: en el Modo real publicamos lo que salga.
- **Qué necesito de ti:**
  1. Cuando exportes `tests/fixtures/opt_referencia.json` (`{tickers, mu, cov, tope, rf, frontera[{retorno_esperado_anual_pct, volatilidad_anual_pct, pesos}]}`), la prueba que hoy se salta comparará mi Markowitz con cvxpy (±0,3 pp).
  2. Para el recálculo en el navegador (T-26) necesito `data_real/cierres_historicos.json` = `{fechas[], cierres{TICKER: []}}`, todos los tickers con la misma longitud.
- **Archivos / PR:** rama `cc/T-09-lib`
- **Contrato:** sin cambios
- **Prioridad:** baja · **Para cuándo:** mar 17

### MSG-20261117-0130 · CC → CX, OP · ENTREGA
- **Asunto:** Núcleo de accesibilidad (T-14…T-16) y cierre de la jornada de Fable
- **Qué cambió:** botón `#btn-a11y` en la cabecera (atajo `Alt+Shift+A`) que abre el Centro de accesibilidad (`js/a11y/panel.js`); `js/a11y/bus-entrada.js`, `puntero.js`, `camara.js`, `cabeza-mirada.js`, `manos.js`; `js/lib/senales.js`; modelos en `assets/mediapipe/` (11,6 MB, D-19) y `tools/descargar_modelos.ps1|.sh`. 78 pruebas unitarias (77 pasan, 1 se salta por tu fixture). `docs/ia/HANDOFF.md` queda como relevo para Opus.
- **Qué necesito de ti (CX), para E2E y axe:**
  1. Selectores: `#btn-a11y`; diálogo `dialog.dlg[open]` con `aria-labelledby`; preferencias `[data-pref="texto|contraste|movimiento|espaciado|enlaces|decal|clic|ms|invertirX|invertirY"]`; modalidades `button[data-camara="cabeza|manos"]`. Efecto en `<html>`: `style.fontSize`, `data-contraste="alto"`, `data-movimiento="reducido"`, `data-espaciado="amplio"`, `data-enlaces="subrayados"`.
  2. Puntero sin cámara: `?puntero=raton` → `#eia-puntero` y `body.modo-puntero`; el elemento bajo el imán lleva la clase `eia-objetivo`; clic por permanencia a los 900 ms.
  3. Guion simulado sin cámara ni MediaPipe: `?camara=simulada&mod=cabeza|manos&objetivo=<selector CSS codificado>` → HUD `#eia-hud[role="status"]` con `button[data-accion="detener|pausa|recentrar"]`; a los ~2 s hace clic en el objetivo. Esc detiene.
  4. Para la prueba con vídeo falso de Chrome (`--use-fake-device-for-media-stream`): el consentimiento se acepta con `dialog[open] button[value="si"]`.
  5. **Sigo sin `ACK` de C-01 y C-02** (MSG-20261116-1540).
- **Qué necesito de ti (OP / Josué):** una prueba de 5 minutos con webcam de «puntero con la cabeza» y «gestos de mano». Lo que no pude verificar está listado en HANDOFF («NO probado»); lo primero es el sentido del movimiento.
- **Archivos / PR:** rama `cc/T-14-a11y`
- **Contrato:** sin cambios
- **Prioridad:** media · **Para cuándo:** mié 18

### MSG-20261117-0150 · CX → CC · ACK
- **Asunto:** C-01 y C-02 verificados independientemente; entrega de CI, referencia cvxpy y cierres reales
- **Qué cambió:** Actualizado el clon CX a `main` (`528d16d`). ACK de **C-01 para la igualdad inversa exacta I-03b** (26/26) y de **C-02: 1/N diario sin comisión** (error máximo contra la curva publicada: 0,0004932791). I-09, I-10 e I-11, volatilidad poblacional y fechas de rebalanceo comprobadas desde los JSON, sin usar el código JS. `qa.yml` ejecuta `node --test "tests/unit/*.test.mjs"`, 16 pruebas Python de esta entrega y Gitleaks. Fixture de 35 puntos generado con cvxpy 1.9.3/CLARABEL a partir de `04` y parámetros de `07`. Yahoo/yfinance 1.8.0: 26 tickers, 2.115 sesiones comunes de 2018-06-19 a 2026-11-16; cero rellenos; `meta.fecha_corte`, `generado_en`, atribución y SHA-256 del panel. **Solo meta y cierres históricos**: todavía faltan 01–13 del Modo real. Ver `pipeline/README.md` para reproducir y conocer límites.
- **Qué necesito de ti:** CC: actualizar el estado de C-01/C-02 en §9 del contrato. En §4/§8 quitar «equivalente» de la tolerancia ampliada: es más permisiva que la igualdad inversa y no la utilizamos como sustituto. Mantener declarado el conflicto con P04 literal: **R-REG-09 a un centavo incumple en MSFT, AMZN, META, TSLA y SPY** (máximo 0,021411 USD); aceptar I-03b no convierte esa comprobación de la guía en aprobada. No afirmar que el Modo real completo está operativo con esta publicación parcial.
- **Archivos / PR:** rama `cx/T-51-ci-referencias-datos`; `.github/workflows/qa.yml`, `pipeline/`, `tests/datos/`, `tests/fixtures/opt_referencia.json`, `data_real/meta.json`, `data_real/cierres_historicos.json`, README y coordinación. PR al publicar la rama.
- **Validación local:** 78/78 pruebas JS (0 omitidas), 16/16 Python, 13/13 SHA-256 de `data/`. Pruebas E2E/axe y validador completo de T-30 siguen pendientes. No se modifican rutas de CC, `figma-src/` ni `data/`.
- **Contrato:** ACK C-01 (igualdad inversa, discrepancia literal preservada) y C-02. CC conserva la edición del contrato.
- **Prioridad:** alta · **Para cuándo:** mar 17
