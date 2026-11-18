# Auditoría P08: calidad, accesibilidad y veracidad

**HIPÓTESIS PARA VERIFICAR.** Toda conclusión de este documento conserva esta condición hasta que una persona la compruebe en pantalla, como exige P08. Una reproducción automatizada no sustituye esa comprobación humana.

Fecha: 17-nov-2026 (Lima). Revisor: CX/Codex, independiente del autor del sitio CC. CX sí escribió el pipeline y parte de las pruebas; esta revisión no constituye una segunda auditoría independiente de su propio pipeline. Revisión del sitio: `4c62ca3` (integra `origin/main` `9f3ebad`, PR #23–#27) con datos de PR #22. No se editaron HTML, JS, CSS, i18n, `data/` ni `figma-src/`.

## Dictamen y prioridad para T-29

El conflicto de PR #22 quedó resuelto y publicado en `4c62ca3`, conservando ambos historiales y las filas de cada responsable. GitHub lo reconoce como fusionable. **La integración de datos no equivale al cierre de T-29:** hay un hallazgo nuevo de severidad alta en la presentación de cortes históricos y dos de severidad media en textos de veracidad. No se declara conformidad completa WCAG ni cumplimiento literal de R-REG-09.

CC debe reproducir H-01 primero, corregir sus rutas y devolver evidencia antes del congelamiento. H-02 y H-03 son ajustes de texto y contexto, sin necesidad de cambiar el esquema. No se deben corregir las cifras del profesor para obtener una aprobación.

## Evidencia y método

- Especificación: guía del profesor, pp. 10–11 (IHC, WCAG y verificación), p. 14 (R-REG-09), p. 17 (P08, transcrito al final); PLAN_MAESTRO §11 y CX-03. La guía prevalece sobre el contrato si difieren en un criterio evaluado.
- Lectura de los nueve módulos, núcleo compartido, etiquetas ES/EN, estilos de foco, tablas, fórmulas, avisos y rutas de datos. Las cifras observadas se contrastaron con JSON; las constantes de método/diseño no se confunden con cifras financieras inventadas.
- Chromium local, 1280×900 y 390×844, temas claro/oscuro, modos profesor/real; bibliotecas originales ECharts y MediaPipe fijadas por versión. La matriz sustituye el transporte CDN por los mismos paquetes npm; no demuestra disponibilidad externa del CDN ni operación sin conexión.
- Pruebas: 132/132 JS; 15/15 datos y 16/16 pipeline Python. Navegador: **228/228** (156 funcionales y **72/72 axe sin violaciones**) sobre `4c62ca3`, más **16/16** de T-26/T-28/T-29: **244/244 locales**, ejecutados en dos bloques sin solapamiento. Sin omisiones ni reintentos. La primera ejecución de la ampliación tuvo cuatro fallos de uso de Playwright (`toHaveValue` no admite `option`); se corrigió a comprobar su atributo `value`, conservando la misma fecha esperada, y se repitieron los 16 casos.
- Reproducción adicional independiente: `node tests/a11y/p08-evidencia.mjs`. Arranca servidor local 8766, abre Chromium, lee el DOM y ECharts sin alterar datos o módulos, guarda `docs/informe/evidencias-P08.json` y tres capturas en `docs/capturas/p08/`. `E2E_CHROME_PATH` permite elegir Chrome. Cero excepciones JS en esta reproducción.

## Validación automática y alcance

La CI de la resolución `4c62ca3` pasa pruebas, secretos y 228 E2E/axe: [ejecución 44224229714](https://github.com/JosMart04/EquipoA_ErnestoInvestingAI/actions/runs/44224229714). PR #23 corrige el contraste #21; se comprobó con las mismas reglas axe y sin exclusiones. El commit de entrega de esta auditoría vuelve a ejecutar CI con los 244 casos; consultar su check exacto en [PR #22](https://github.com/JosMart04/EquipoA_ErnestoInvestingAI/pull/22/checks).

[QA-P08-resumen.json](QA-P08-resumen.json) conserva resultados y consola. Los 316 mensajes de consola del bloque completo se limitan a 288 errores HTTP 404 deliberados de las pruebas parciales y 28 mensajes de MediaPipe/WebGL durante cámara falsa (incluidos cuatro `INFO: Created TensorFlow Lite XNNPACK delegate for CPU.` emitidos por stderr). No hay mensajes de consola en los demás casos ni excepciones JS no controladas. No se ocultan estos mensajes para afirmar «consola vacía» de toda la suite. Axe también conserva resultados incompletos; un cero en violaciones no acredita las comprobaciones que requieren juicio humano.

La ampliación prueba recálculo real y vuelta al archivo en Backtesting/Optimizador, último corte primero, QQQ oculto/restaurado en ambos gráficos con Espacio, calibración cancelada con Esc manteniendo cámara activa y guía de ocho gestos. Conserva la regresión de video activo durante diez segundos. Las pruebas verdes no cubrían H-01…H-03: se encontraron mediante auditoría adicional y quedan pendientes de CC, no se convierten en expectativas que acepten el defecto.

## Hallazgos nuevos — HIPÓTESIS PARA VERIFICAR

| ID / módulo | Hallazgo | Evidencia (cita literal del código) y reproducción | Severidad | Corrección propuesta |
|---|---|---|---|---|
| H-01 · Regresión real / cortes | La historia incluye precios posteriores al corte y se une a un pronóstico antiguo. El eje retrocede casi un año y la etiqueta del corte/aviso muestra la fecha actual. | `js/regresion.js:76`: `fechasHistoria: c02.fechas.slice(-n), historia: cierres.slice(-n),`. La carga de `02` en `:346` no depende del corte: `js/common.js:128`: `const DEPENDE_DEL_CORTE = /^0[5-8]_/;`. Aviso `common.js:752`: `const fecha = mt.fecha_corte ? EIA.fmt.fecha(mt.fecha_corte, "larga") : "";`. Abrir Regresión real AAPL, seleccionar **2025-11-28**: historia termina **2026-11-16**, primer pronóstico **2025-12-01**, cierre dibujado **352.779999**, ancla del snapshot **277.881897**. | **Alta**, veracidad temporal/G1–G2. Es una mezcla en la interfaz, no evidencia de fuga en el entrenamiento. | CC: obtener la historia hasta el corte desde los precios congelados de `cortes/<fecha>/auditoria.json`; no basta recortar la descarga actual, cuyos ajustes pueden cambiar. Separar fecha de descarga/último mercado y corte del modelo. El último precio histórico debe coincidir con `06.precio_ultimo` y el eje debe ser creciente. Mantener la selección de ventana dentro de la historia disponible. Añadir regresión E2E sobre primer y último snapshot. |
| H-02 · Clasificación real, ficha y tabla de métricas | Presenta **6.552 observaciones** como **6.552 días**. La frase «Es apenas mejor que lanzar una moneda» es fija, aunque hay exactitudes inferiores a 50 % y ninguno supera la tasa base. | `js/clasificacion.js:42`: `nPrueba: ms[0].n_prueba`. `i18n/es-PE.json:467`: `en una prueba de {n} días. Es apenas mejor que lanzar una moneda`; `:505`: `Métricas de cada modelo en una prueba de {n} días`. Pantalla del corte actual: **47,5–56,5 %**, base **56,5 %**; `meta.metodologia.evaluacion` declara `fechas_prueba:252`, `n_prueba:6552`. Son 252 fechas × 26 activos. | **Media**, G2/veracidad. | CC: distinguir observaciones activo-fecha de sesiones en ambos idiomas y en caption/ficha; obtener fechas del metadato disponible o usar «observaciones» donde no se conoce el conteo de fechas. Redactar la comparación según las métricas, indicando que 0/18 supera la base en este corte; conservar las cifras desfavorables. |
| H-03 · Optimizador profesor, ficha IA | La ficha niega la ejecución de cualquier algoritmo para todas las fronteras, incluyendo Markowitz, pese a que Markowitz se reproduce numéricamente a partir de `04`. El aviso específico de NSGA sí está bien delimitado. | `i18n/es-PE.json:621`: `En el Modo profesor las fronteras son simuladas: no se ejecutó ningún algoritmo.` Visible en G2. La prueba independiente cvxpy pasa y las unitarias comprueban Markowitz contra `07`. El contrato/bitácora reconocen un Markowitz real sobre datos sintéticos. | **Media**, atribución del método/G2. | CC: limitar «simulados/no se ejecutaron algoritmos evolutivos» a NSGA-II/III, distinguir Markowitz calculado sobre datos sintéticos. Revisar también EN; no afirmar con ello que los precios sean reales. |

Capturas verificadas de la reproducción: [H-01](../capturas/p08/regresion-corte-historico.png), [H-02](../capturas/p08/clasificacion-calidad.png), [H-03](../capturas/p08/optimizador-ficha.png). Valores y texto completos: [evidencias-P08.json](evidencias-P08.json). Los hallazgos son del sitio con los datos de la rama; no se atribuyen a la versión de Pages previa al merge.

## Discrepancias y límites conocidos — HIPÓTESIS PARA VERIFICAR

| Módulo | Hallazgo | Evidencia literal | Severidad | Corrección / tratamiento |
|---|---|---|---|---|
| Regresión, ambos modos | R-REG-09 literal sigue incumplido; I-03b no es equivalente a la tolerancia de un centavo. | `js/regresion.js:13`: `const TOLERANCIA_GUIA = 0.01;`; `:27`: `const diferencia = Math.abs(ultima - esperado);`. Recálculo independiente de `06`: profesor MSFT 0,014745; AMZN 0,010095; META 0,021411; TSLA 0,012356; SPY 0,013135 USD. Real MSFT 0,025492; GOOGL 0,013085; META 0,018682; QQQ 0,021465 USD. | Alta para aceptación literal de la guía, conocida C-01/N-1. | Mantener ambas verificaciones visibles y declarar la discrepancia al profesor. El ACK interno acepta I-03b; no acredita aceptación externa de una excepción. No alterar `data/` ni ampliar la tolerancia para aprobar. La observación de CC de USD 0,0009 para un activo no demuestra cumplimiento en los 26. |
| Optimizador móvil | El solapamiento entre símbolos limita la selección directa en el frente conjunto. | `js/optimizador.js:157`: `const movil = global.innerWidth < ANCHO_MOVIL, tam = { mk: movil ? 4 : 6, n2: movil ? 6 : 9, n3: movil ? 8 : 11, sel: movil ? 18 : 24 };`. CC declara en MSG-1932 que 38/40 círculos quedan cerca de triángulos antes del zoom. E2E selecciona por clic real aislando NSGA-II a 390 px. | Media de usabilidad, conocida y mitigada. | Mantener casillas, tabla y teclado; no anunciar que el clic en cada punto del frente superpuesto está validado. Una persona debe evaluar la facilidad de uso táctil. El recuento 38/40 se atribuye a CC, no a una nueva medición de CX. |
| Datos reales / backtesting | Histórico ajustado revisable, universo fijo, DL de tres épocas; el backtest usa momentum y no las señales mensuales de los 36 modelos. | `pipeline/backtesting.py:50`: `Walk-forward cada 21 sesiones; ventana 126; momentum 63`; `meta.metodologia.ajustes_historicos`: `Descarga actual ajustada por splits/dividendos; no es una base point-in-time de versiones históricas.` | Limitaciones metodológicas, no un defecto nuevo oculto. | Conservarlas en el informe; no presentar el backtest como validación de la estrategia de pronósticos/NSGA de cada mes ni como rentabilidad futura. La independencia de revisión aquí es limitada por la autoría de CX. |

## Criterios aparentemente cumplidos — HIPÓTESIS PARA VERIFICAR

| Alcance / módulo | Evidencia y límites |
|---|---|
| Avisos de los cinco módulos nuevos | `i18n/es-PE.json:62–66` y equivalentes EN: clasificación simulada; pronóstico simulado; NSGA simulado; resultados simulados; backtest sintético. El núcleo inserta el aviso de cada módulo. `real.spec.mjs` contrasta Yahoo Finance, yfinance, liga ficticia, órdenes simuladas y ausencia de asesoría. H-01 limita la fidelidad de la fecha en cortes antiguos. |
| Dashboard | JSON 10/03, universo y velas; exploración `End` anuncia último cierre, una serie textual; carga sin desborde en la matriz. |
| Watchlist | JSON 11, controles de alertas y watchlist compartida; etiquetas de campo. No se acreditan alertas reales fuera de la página. |
| Trading | Estado separado por modo (`EIA.cartera.clave`), validación de efectivo/cantidad y órdenes explícitamente simuladas; precios de JSON. |
| Leaderboard | Liga ficticia declarada en el modo real y datos del JSON 12; no representa usuarios reales ni una competición en línea. |
| Clasificación | `EIA.SENALES = ["SUBE", "BAJA"]` (`common.js:19`); `senalBinaria` rechaza una tercera clase. 26×18=468 predicciones por corte, modelo de vista lee `m.senal` y `m.prob_sube`; forma, texto y color. H-02 pendiente. |
| Regresión | Mediana, p10/p90, cono y 30 sesiones leídos de `06`; tabla alternativa y dos series de texto. `verificar()` muestra por separado literal/inversa; no oculta fallos conocidos. H-01 pendiente. |
| Optimizador | Composición al clic real NSGA-II, pesos y comprobación desde JSON, Markowitz/cvxpy probado, casillas, tabla, navegación por flechas. H-03 y limitación móvil declaradas. |
| Portafolios | Tres niveles, pesos/razones de `08`, exclusión y renormalización, elección y enlace a Trading/Backtesting. No se afirma que el Agresivo supere siempre al Moderado. |
| Backtesting | Siete series, drawdown y métricas desde `09`, 12 rebalanceos, interpretación derivada (`B.interpretar`), nota visible de 35 %/25 %. No se corrige el resultado para ganar a SPY. |
| Cifras y veracidad | No se identificó una cifra financiera escrita a mano en los nueve módulos revisados en sustitución del JSON. Constantes identificadas: tolerancia 0,01, umbrales de confianza, ventanas, semilla, base 100, 252 sesiones, comisiones y topes del método. Esta observación es acotada al código revisado; no certifica la ausencia absoluta de cualquier error. `data/` conserva los 13 SHA-256 del Anexo B.3. |
| Accesibilidad estructural | `common.js:905` genera `<th scope="col"...>` y `:919` `<th scope="row"...>`; formularios con etiquetas, enlace de salto y alternativas Gráfico/Tabla/Resumen. `css/styles.css:114`: `:focus-visible { outline: 3px solid var(--ac); outline-offset: 2px; }`. Los tests de teclado cubren migas, barrido, exploración de gráficos y las nuevas casillas; no equivalen a recorrer todo con un lector de pantalla. |
| Integración | 9 módulos, tema/idioma/estado compartidos; migas 3→4, recarga, desaparición por navegación principal, Portafolios→Agresivo. Ausencias reales controladas devuelven «publicación parcial», con fixture 13 efectivamente servido y consulta `?v=` verificada. |

## Evidencia humana recibida

**Reporte humano, no prueba realizada por CX:** Josué confirmó en Pages con la webcam de su laptop la calibración de cinco puntos y la V de dos dedos; CC también registra cabeza/manos continuas, sonido y voz. Fuente precisa: **MSG-20261117-1957**, commit `6706dff`, integrado por PR #27; el mensaje recibido cita **1956**, pero el identificador que existe en la bitácora es 1957. Se cita así sin modificar el historial. Esto aporta evidencia humana para esas funciones y ese entorno; no valida todos los dispositivos, usuarios o lectores de pantalla ni los nuevos hallazgos H-01…H-03.

## No verificable

- Compatibilidad efectiva con NVDA, Narrador, TalkBack y experiencia con interruptor físico: no hay ejecución humana registrada. Axe no evalúa por sí solo la experiencia ni todo WCAG 2.2 AA.
- Accesibilidad perceptiva de cada elemento pintado en canvas, audición de todos los tonos, precisión de la mirada, fatiga y tasa de errores en otras personas/dispositivos. La validación de Josué tiene el alcance descrito arriba.
- Aprobación del profesor a la discrepancia literal R-REG-09. No consta; C-01 es acuerdo interno.
- Origen histórico de cada operación del generador sintético del profesor: reproducir Markowitz no permite reconstruir las tres carteras sintéticas de `09` sin su método completo.
- Operación de Pages con los datos de PR #22 y primera ejecución programada del bot después del merge. Las pruebas locales no sustituyen una comprobación del despliegue. El cron ya tiene autorización explícita y no necesita una segunda autorización.
- Revisión humana y descarte/cierre de H-01…H-03. Tabla para CC: reproducir, corregir, aportar captura y nueva prueba; si no se reproduce, registrar condiciones y descarte motivado, conservando la evidencia anterior.
- Entrega global terminada: informe PDF 8–12 páginas, recopilación final `PROMPTS_USADOS.md`, pruebas humanas por rol y congelamiento siguen tareas aparte. Este Markdown es la auditoría P08, no el informe final de entrega.

## Prompt P08 literal (guía, p. 17)

Transcripción extraída del PDF, conservando palabras y saltos de línea. Su contexto sintético se aplica al Modo profesor; la extensión CX-03 exige auditar además el Modo real, sus fuentes y avisos. No se modifica el prompt para ocultar esa distinción.

```xml
<prompt id="P08" nombre="Claude: auditoría de calidad, accesibilidad y veracidad del sistema">
  <role>Eres un auditor de calidad de software y accesibilidad (WCAG 2.2 AA) que no inventa
hallazgos.</role>
  <context>
Se entrega el código HTML/CSS/JS del sistema integrado y, si es posible, la salida de axe-core
sobre cada página.
Es un sistema con datos sintéticos y predicciones simuladas.
  </context>
  <task>
1. Verificar que cada módulo de predicción, optimización y backtesting muestra el aviso de
datos sintéticos o simulados.
2. Verificar que la clasificación solo muestra SUBE o BAJA.
3. Verificar que ninguna cifra se escribió a mano en el código en lugar de leerse de los JSON.
4. Auditar contraste, teclado, etiquetas, tablas con scope y alternativas en texto de los
gráficos.
5. Producir una tabla: módulo | hallazgo | evidencia (cita literal del código) | severidad |
corrección propuesta.
  </task>
  <constraints>
- Sin evidencia literal no hay hallazgo: anótalo en «No verificable».
- Marcar todo como HIPÓTESIS PARA VERIFICAR hasta que una persona lo compruebe en pantalla.
  </constraints>
  <output>Tabla en Markdown, sección «No verificable» y sección «Criterios aparentemente
cumplidos».</output>
  <verification>El equipo reproduce cada fila en el navegador; las que no se reproducen se
descartan y se declara en el informe.</verification>
</prompt>
```
