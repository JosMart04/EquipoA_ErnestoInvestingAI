# CONTRATO DE DATOS — Ernesto Investing AI

**Versión 1.0.0** · 16-nov-2026 · dueño: Claude Code (CC) · se cambia solo con el protocolo `CAMBIO-CONTRATO` y el `ACK` de Codex (PLAN_MAESTRO §15.4).

Aplica **igual** a `data/` (Modo profesor, 13 JSON intocables) y a `data_real/` (Modo real, lo genera el pipeline de CX). El sitio lee los dos con el mismo código: `EIA.datos(nombre)` en `js/common.js`.

Todo lo que dice «medido» se comprobó el 16-nov-2026 sobre `data/` (commit base `e9d711e`, SHA-256 del Anexo B.3 del PLAN_MAESTRO).

---

## 1. Reglas generales

1. **Los JSON se leen, no se inventan** (R-DAT-01). Toda cifra en pantalla sale de `archivo → campo` o de un **campo derivado** de la sección 5.
2. **`data/` no se modifica** (R-DAT-02). `data_real/` conserva **nombre de archivo y esquema** de los 13 archivos.
3. **Ninguna cifra escrita a mano** (R-DAT-03). Las constantes de método están en la sección 6, con nombre y origen. Los diccionarios `i18n/*.json` no contienen cifras de datos (lo comprueba una prueba unitaria).
4. Números: punto decimal, sin separador de miles. Fechas: `AAAA-MM-DD` (día de sesión de NYSE). La interfaz las interpreta en **UTC**.
5. Sufijo `_pct` = porcentaje (2,93 significa 2,93 %). Sin sufijo y entre 0 y 1 = fracción (pesos, probabilidades, `volatilidad_anual`, `tasa_libre_riesgo`).
6. Orden canónico de los 26 activos: el de `01` (igual en `05`, `06` y `10`).
7. La interfaz **no depende de campos opcionales**: si existen los muestra; si faltan, deriva o los omite.

## 2. Los 13 archivos

`O` = obligatorio. `Op` = opcional (solo Modo real, salvo que se diga otra cosa).

### 01_universo_tickers.json — lista de 26

| Campo | Tipo | Nota |
|---|---|---|
| `ticker` | texto | O. Identificador único |
| `nombre`, `sector`, `nota` | texto | O. Sin tildes en los datos; `nota` puede ser `""` |
| `grupo` | texto | O. Uno de: `Magnificas 7`, `Mineras con operaciones en Peru`, `ETF sectoriales`, `ETF globales y Peru` |
| `precio_ancla_<AAAA-MM-DD>` | número | O. **La fecha va en el nombre del campo** (en `data/`: `precio_ancla_2026-11-11`). La interfaz **no lo usa**: el último precio sale de `10.ultimo` |
| `volatilidad_anual` | fracción | O |
| `beta_SPY` | número | O |

### 02_precios_sinteticos_504d.json

`{fechas[504], cierres{TICKER: número[504]}, nota}`. En `data/`: 2024-12-06 → 2026-11-11. En el Modo real conserva el nombre (aunque sean precios reales), trae las últimas 504 sesiones y `nota` lo dice.

### 03_ohlcv_sintetico_120d.json

`{fechas[120], series{TICKER: {o[120], h[120], l[120], c[120], v[120]}}}`. Última fecha = la de `02`.

### 04_matriz_correlacion_covarianza.json

`{tickers[26], correlacion[26][26], covarianza_anual[26][26], retorno_esperado_anual_simulado[26]}`. Covarianza y retorno en **fracción anual**.

### 05_clasificadores_binarios.json

| Campo | Tipo | Nota |
|---|---|---|
| `definicion` | texto | O |
| `modelos[18]` | lista | O. `{modelo, familia ∈ {ML, DL}, exactitud, precision, recall, f1, auc (0–1), matriz_confusion{VP, FP, VN, FN}, n_prueba}` |
| `predicciones{TICKER}` | objeto | O. `{modelos[18]{modelo, familia, prob_sube (0–1, 3 decimales), senal}, votos_sube, votos_baja, prob_media, consenso, confianza}` |
| `tasa_base_sube` | fracción | Op. Proporción de SUBE en la prueba. Si falta, la interfaz la deriva (sección 5) |

`senal` y `consenso` ∈ {`SUBE`, `BAJA`} **solamente**. `confianza` ∈ {`alta`, `media`, `baja`}.

### 06_regresores_precio_30d.json

| Campo | Tipo | Nota |
|---|---|---|
| `fechas_pronostico[30]` | fechas | O. Las 30 sesiones de NYSE posteriores al corte |
| `modelos[18]` | lista | O. `{modelo, familia, mape_30d_pct, mae_relativo_pct, rmse_relativo_pct, r2_retornos_30d, mejora_vs_persistencia_pct}` |
| `predicciones{TICKER}` | objeto | O. `{precio_ultimo, modelos[18]{modelo, familia, precios[30]}, ensamble_mediana[30], banda_p10[30], banda_p90[30], retorno_proyectado_30d_pct (2 decimales), cono_volatilidad_inf[30], cono_volatilidad_sup[30]}` |

### 07_optimizador_markowitz_nsga.json

| Campo | Tipo | Nota |
|---|---|---|
| `elegibles[]` | tickers | O |
| `criterio_elegibilidad`, `nota` | texto | O. La interfaz muestra `nota` tal cual |
| `tope_peso_por_activo` | fracción | O. 0,25 en `data/` |
| `tasa_libre_riesgo` | fracción | O. 0,04 en `data/` |
| `markowitz_universo_completo[35]`, `markowitz_elegibles[35]` | puntos | O. Sin `id` |
| `nsga2_elegibles[40]` | puntos | O. Con `id` `N2-01…` |
| `nsga3_elegibles[60]` | puntos | O. Con `id` `N3-01…` |

**Punto:** `{retorno_esperado_anual_pct, volatilidad_anual_pct, sharpe, cvar95_diario_pct, pesos{TICKER: fracción}}`. `pesos` trae **solo** los activos con peso > 0 (medido: de 5 a 16 por punto). `cvar95_diario_pct` es positivo (pérdida).

### 08_portafolios_3_niveles_riesgo.json

`{fecha, niveles[3]}`. `fecha` es la de **generación** (2026-11-13 en `data/`), **no** la de corte.

Nivel: `{nivel ∈ {Conservador, Moderado, Agresivo} en ese orden, origen ("NSGA-II N2-xx (simulado)"), descripcion, restricciones, retorno_esperado_anual_pct, volatilidad_anual_pct, sharpe, cvar95_diario_pct, pesos{TICKER: fracción}, detalle_activos[]{ticker, peso_pct, grupo, razon}}`.

`detalle_activos` lista solo los pesos ≥ 1 %; `pesos` puede traer más (medido: 10–11 frente a 6–9). La interfaz muestra ambos y lo explica.

### 09_backtesting_portafolios.json

| Campo | Tipo | Nota |
|---|---|---|
| `metodo` | texto | O. Se muestra tal cual |
| `fechas[253]` | mixto | O. **`fechas[0] = "inicio"` no es una fecha**; el resto sí |
| `base` | número | O. 100 |
| `periodo{inicio, fin, sesiones}` | objeto | O |
| `carteras{Conservador, Moderado, Agresivo}` | objeto | O. `{curva[253], metricas, rebalanceos[12]{fecha, pesos}, turnover_medio, drawdown[253]}` |
| `referencias{SPY, QQQ, EPU, "Igual ponderado (1/N)"}` | objeto | O. `{curva[253], metricas}` (sin `drawdown`: la interfaz lo deriva de `curva`) |

`metricas`: `{retorno_total_pct, cagr_pct, volatilidad_anual_pct, sharpe, max_drawdown_pct (≤ 0), calmar, meses_positivos_pct}`.

### 10_dashboard_mercado.json — lista de 26

`{ticker, nombre, grupo, sector, ultimo, var_1d_pct, var_5d_pct, var_1m_pct, var_3m_pct, volatilidad_anual_pct, beta_vs_SPY, volumen}`. **`ultimo` es el único «último precio» que usa la interfaz** (`EIA.precio`).

### 11_watchlist_alertas_portafolio_demo.json

`{watchlist_inicial[], alertas[]{ticker, tipo, umbral, activa}, portafolio_demo{efectivo, posiciones[]{ticker, cantidad, costo}}}`. `tipo` ∈ {`precio_sobre`, `precio_bajo`, `var_1d_menor_a_pct`, `var_1d_mayor_a_pct`}.

Regla de disparo: `precio_sobre` ⇔ `ultimo ≥ umbral`; `precio_bajo` ⇔ `ultimo ≤ umbral`; `var_1d_menor_a_pct` ⇔ `var_1d_pct ≤ umbral`; `var_1d_mayor_a_pct` ⇔ `var_1d_pct ≥ umbral`.

### 12_leaderboard_liga.json — lista de 10

`{alias, equipo, retorno_liga_pct, operaciones, sharpe, posicion}`. Liga **ficticia**. `ficticio: true` es `Op`.

### 13_patrones_y_parametros.json

`{semilla, fecha_ancla_precios, fecha_generacion, fuentes_de_anclaje[], que_es_real, que_es_sintetico, patrones_aplicados[8]{id, nombre, detalle}, parametros{N_HIST, N_FC, RF, TOPE_PESO, clasificadores, regresores}, parametros_por_ticker[26], aviso}`.

**`fecha_ancla_precios` es la fecha de corte que muestra la interfaz** en todas las pantallas (R-INT-04).

## 3. Nombres exactos (carácter por carácter, en ambos modos)

- **Clasificadores ML (11):** `Regresion logistica`, `SVC (kernel RBF)`, `k-vecinos (kNN)`, `Naive Bayes gaussiano`, `Arbol de decision`, `Random Forest`, `Extra Trees`, `AdaBoost`, `Gradient Boosting`, `XGBoost`, `LightGBM`.
- **Regresores ML (11):** `Regresion lineal`, `Ridge`, `Lasso`, `Elastic Net`, `SVR (RBF)`, `k-vecinos (kNN)`, `Arbol de decision`, `Random Forest`, `Gradient Boosting`, `XGBoost`, `LightGBM`.
- **DL (7, en ambos):** `MLP (red densa)`, `RNN simple`, `LSTM`, `GRU`, `BiLSTM`, `CNN 1D`, `Transformer`.

La interfaz los presenta con el mapa `datos.modelo.*` y `datos.modelo_corto.*` de `i18n/` (por ejemplo `Arbol de decision` → «Árbol de decisión» / «Decision tree»). **Un nombre que no esté en el mapa se muestra tal cual**, sin error.

## 4. Invariantes

Las comprueban `tools/validar_contrato.py` (CX) y, las que tocan a la interfaz, `tests/unit/` (CC). Todas se cumplen en `data/` (medido).

| ID | Invariante |
|---|---|
| I-01 | Los 26 tickers de `01` aparecen, y solo ellos, en `02`, `03`, `04`, `05`, `06`, `10` y `13.parametros_por_ticker`. |
| I-02 | `05`: 18 modelos (11 ML + 7 DL) con los nombres exactos. `senal = "SUBE"` ⇔ `prob_sube ≥ 0,5`; `votos_sube` = número de SUBE; `votos_baja = 18 − votos_sube`; `prob_media` = media de las 18 (±0,0015); `consenso = "SUBE"` ⇔ `prob_media ≥ 0,5`; `confianza` según `\|prob_media − 0,5\|` (`alta` ≥ 0,08; `media` ≥ 0,04; si no `baja`). `VP + FP + VN + FN = n_prueba`. |
| I-03 | `06`: `ensamble_mediana[i]` = mediana de los 18 modelos (±0,005, medido); `banda_p10`/`banda_p90` = percentiles 10 y 90 con interpolación lineal (±0,005); cono = `mediana × exp(±1,2816 · σ_d · √h)` con `σ_d = volatilidad_anual / √252`. |
| **I-03b** | **R-REG-09, forma verificable:** `round((ensamble_mediana[29] / precio_ultimo − 1) · 100, 2) = retorno_proyectado_30d_pct` (exacto, 26/26). **Esta igualdad inversa es la única comprobación normativa** (ACK de CX, C-01). La cota `\|ensamble_mediana[29] − precio_ultimo · (1 + r/100)\| ≤ 0,01 + precio_ultimo × 0,00005` es solo un **diagnóstico más permisivo**: no es equivalente a la igualdad y no la sustituye. Ver sección 8, nota N-1. |
| I-04 | `07`: `0 ≤ peso ≤ tope_peso_por_activo`; `Σ pesos ∈ [0,98; 1,02]`; `sharpe = (retorno − 100 · tasa_libre_riesgo) / volatilidad` (±0,01); `elegibles` = activos con `consenso = SUBE` **y** `retorno_proyectado_30d_pct > 0`, en el orden de `01` (medido: idéntico). |
| I-05 | `08`: tres niveles en el orden Conservador, Moderado, Agresivo; `Σ pesos ≈ 1`; `razon` = `"{n}/18 clasificadores = SUBE; proyeccion mediana 30 sesiones {±x.xx} %"`. |
| I-06 | `09`: `fechas[0] = "inicio"`; `curva[0] = 100`; `len(curva) = len(fechas)`; en carteras además `len(drawdown) = len(fechas)` y `drawdown ≤ 0`; **R-BT-06:** `\|curva[-1]/100 − 1 − retorno_total_pct/100\| ≤ 0,0005`. |
| I-07 | El último precio de cada activo es el mismo en `01` (ancla), `06.precio_ultimo`, `10.ultimo` y el último cierre de `02` y `03`. |
| I-08 | Última fecha de `02` = última de `03` = fecha de corte. |
| **I-09** | `08.niveles[].origen` cita un `id` de `07.nsga2_elegibles`, y ese punto tiene las mismas métricas y los mismos `pesos` que el nivel (medido: sí, N2-05, N2-37, N2-36). |
| **I-10** | `09`: `sharpe = (cagr_pct − 100 · rf) / volatilidad_anual_pct` (±0,001); `calmar = cagr_pct / \|max_drawdown_pct\|` (±0,002). Referencias SPY, QQQ, EPU = **comprar y mantener** desde `02` (`curva[i] = 100 · P[i]/P[0]`, ±0,001). **«Igual ponderado (1/N)» = media simple de los retornos diarios de los 26 activos, es decir, rebalanceo diario y sin comisión** (±0,001). Ver nota N-2. |
| **I-11** | `13.fecha_ancla_precios` = última fecha de `02`. |

## 5. Campos derivados que muestra la interfaz

No están en los JSON; se calculan en el navegador y se declaran aquí y en el informe.

| Derivado | Fórmula | Dónde se usa |
|---|---|---|
| Tasa base de SUBE | `05.tasa_base_sube` si existe; si no `(VP + FN) / n_prueba` del primer modelo (medido: 0,5595, igual en los 18) | Ficha IA de Clasificación |
| Rango de exactitud y de AUC | mínimo y máximo de `05.modelos[]` | Ficha IA y bloque de honestidad |
| Conteos | número de modelos por familia, de activos por grupo, de celdas visibles | Filtros y ficha IA |
| Intensidad de celda | nivel 3 si `\|prob_sube − 0,5\| ≥ 0,08`; nivel 2 si `≥ 0,04`; si no nivel 1 | Fondo del mapa de calor (la **señal** se lee de `senal`) |
| Aciertos al decir SUBE | `VP` de `VP + FP` | Frase de la matriz de confusión |
| Fecha de corte | `13.fecha_ancla_precios` (profesor) · `meta.fecha_corte` (real) | Control de modo, avisos, pie |
| Drawdown de referencias | `curva / máximo acumulado − 1` | Backtesting |
| Valor y retorno del usuario | `efectivo + Σ cantidad × 10.ultimo`, frente al valor inicial de `11.portafolio_demo` a su `costo` | Trading, Leaderboard |
| Suma y máximo de pesos | `Σ pesos` y `max(pesos)` | Comprobación visible del Optimizador (R-OPT-09) |

## 6. Constantes de método

Tienen nombre en el código (`EIA.K.*` o constantes del módulo) y nunca aparecen como número suelto.

| Constante | Valor | Origen |
|---|---|---|
| Umbral de señal | 0,5 | Guía, Anexo B (`prob_sube ≥ 0,5`) |
| Umbrales de confianza e intensidad | 0,08 y 0,04 | Guía, Anexo B (`confianza`) |
| Horizonte | `13.parametros.N_FC` (30) | JSON |
| Tasa libre de riesgo | `07.tasa_libre_riesgo` (0,04) | JSON |
| Tope por activo | `07.tope_peso_por_activo` (0,25) | JSON |
| Tolerancia de suma de pesos | 0,02 | Guía, P05 (verificación) |
| Tolerancia R-BT-06 | 0,05 pp | Guía, P06 (verificación) |
| z del cono (80 %) | 1,2816 | PLAN_MAESTRO §5.2, I-03 |
| Sesiones por año / por mes | 252 / 21 | `09.metodo` y PLAN_MAESTRO §5.3 |
| Ventana, momentum, comisión | 126, 63, 5 pb | `09.metodo` |
| Tope del Agresivo en el backtesting | 0,35 | Medido en `09` (nota N-3) |
| Nivel del CVaR | 95 % | Nombre del campo `cvar95_diario_pct` |

## 7. Extensiones del Modo real (`data_real/`)

| Archivo | Contenido |
|---|---|
| `meta.json` | `{version_contrato, generado_en (ISO UTC), fecha_corte, fuente, tickers_ok[], tickers_con_problemas[], stale, duracion_s, commit, aviso}` |
| `precios/<TICKER>.json` | `{ticker, desde, fechas[], o[], h[], l[], c[], v[]}` diario ajustado |
| `cierres_historicos.json` | `{fechas[], cierres{TICKER: []}}` (lo usan los Workers) |
| `cortes/index.json` | `{ultimo, cortes[]}` |
| `cortes/<AAAA-MM-DD>/05…, 06…, 07…, 08…` | Mismos esquemas, entrenados solo con datos hasta esa fecha |

Reglas adicionales: las de PLAN_MAESTRO §5.4 (liga ficticia marcada, umbrales de `11` recalculados, completar hasta 4 elegibles con aviso, `data_real/` ≤ 15 MB).

**Cómo reacciona la interfaz:**

| Situación | Comportamiento |
|---|---|
| `data_real/meta.json` no existe o no es JSON | Estado «Aún no hay datos reales publicados» con botón «Volver al Modo profesor». **No cambia de modo sola** |
| Falta un archivo concreto | El módulo muestra el mismo estado, nombrando el archivo |
| `meta.fecha_corte` con más de 5 días hábiles | Aviso de antigüedad en el control de modo y en el aviso del módulo |
| Falta un campo opcional | Se deriva (sección 5) o se omite la fila; nunca error |
| `tickers_con_problemas` no vacío | Nota visible con los tickers |
| **Publicación parcial:** existe `meta.json`, pero falta el archivo que pide el módulo | El módulo muestra «Aún no hay datos reales publicados» nombrando el archivo, y su aviso y el del pie pasan a «publicación parcial» (`aviso.real.parcial`): no se afirma que haya modelos reales |

**Estado de la publicación real (17-nov-2026, PR #7 de CX):** solo `meta.json` y `cierres_historicos.json` (26 activos, 2.115 sesiones comunes del 2018-06-19 al 2026-11-16, ajustados). Faltan los 13 archivos de mercado y modelos, `precios/` y `cortes/`: **el Modo real todavía no está operativo** en ningún módulo.

Las peticiones a `data_real/` llevan `?v=<meta.generado_en>` para esquivar la caché de Pages; `meta.json` se pide con `cache: "no-cache"`.

## 8. Notas sobre el material del profesor (se documentan, no se corrigen)

| Nota | Qué pasa | Qué hace el equipo |
|---|---|---|
| **N-1** | La verificación de P04 (`mediana[29] ≈ último × (1 + r/100)` con 1 centavo) **no se cumple al pie de la letra** en 5 de 26 activos: META 0,0214; MSFT 0,0147; SPY 0,0131; TSLA 0,0124; AMZN 0,0101. Causa: `retorno_proyectado_30d_pct` está redondeado a 2 decimales, y media centésima de punto sobre un precio de 500–760 son 2,5–3,8 centavos | Se verifica con I-03b (igualdad inversa), que descuenta ese redondeo. **Aceptar I-03b no aprueba la comprobación literal de la guía:** R-REG-09 a un centavo sigue incumpliéndose en MSFT, AMZN, META, TSLA y SPY (máximo 0,021411 US$, META). La interfaz de Regresión muestra las dos comprobaciones y su resultado, y el informe lo declara |
| **N-2** | La referencia «Igual ponderado (1/N)» se reproduce con rebalanceo **diario** sin comisión (diferencia 0,000), no mensual | I-10. El pipeline y `js/lib/backtest.js` la calculan igual |
| **N-3** | En `09` el Agresivo llega a pesos de 0,35 aunque `08` dice «tope 25 %» | Se muestra tal cual y se explica |
| **N-4** | En `08` el «Agresivo» (N2-36: 16,07 % de retorno, 17,52 % de volatilidad) rinde y arriesga **menos** que el «Moderado» (N2-37: 16,49 %, 17,92 %) y no es el punto de mayor retorno del frente (N2-40: 17,13 %) | La interfaz no afirma ningún orden entre niveles: muestra `descripcion` y las cifras |
| **N-5** | La guía dice exactitud «52 a 58 %» (4.2) y «52 a 57 %» (3.3); los datos van de 52,4 % a 56,7 % | Los textos se calculan del JSON |
| **N-6** | `08.fecha` (2026-11-13) es la fecha de generación, no la de corte | La fecha de corte es `13.fecha_ancla_precios` |

## 9. Historial de cambios

| ID | Versión | Fecha | Cambio | Estado |
|---|---|---|---|---|
| — | 1.0.0 | 2026-11-16 | Versión inicial a partir de PLAN_MAESTRO §5, con I-09, I-11, la sección 5 (derivados) y las notas N-1…N-6 | vigente |
| **C-01** | 1.0.0 | 2026-11-16 | R-REG-09 se valida con **I-03b: igualdad inversa exacta**, no con 1 centavo fijo. La cota ampliada queda solo como diagnóstico | **aceptado** (ACK de CX, MSG-20261117-0150, solo para la igualdad inversa) |
| **C-02** | 1.0.0 | 2026-11-16 | 1/N = rebalanceo **diario** sin comisión (I-10), en lugar del «mensual» de PLAN_MAESTRO §6.3 | **aceptado** (ACK de CX, MSG-20261117-0150; error máximo 0,00049) |
| — | 1.0.0 | 2026-11-17 | Aclaración editorial (CC-O): I-03b ya no llama «equivalente» a la cota ampliada; N-1 declara que R-REG-09 literal sigue incumpliéndose; §7 describe la publicación parcial. Sin cambio de esquema | vigente |
