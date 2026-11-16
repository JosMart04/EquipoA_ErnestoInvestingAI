---
title: "PLAN MAESTRO — EquipoA_ErnestoInvestingAI"
subtitle: "Sistema Web Integrado Ernesto Investing AI · IHC 2026-II · Semana 13 → Semana 15"
author: "Equipo A · FISI-UNMSM · preparado con Claude Opus 5.5 el 16-nov-2026"
---

# PLAN MAESTRO — EquipoA_ErnestoInvestingAI

**Documento de contexto común para Claude Code (Fable 5.2 → Opus 5.5) y Codex (GPT-6 Astra).**
Versión 1.0 · lunes 16-nov-2026, 13:00 (Lima, UTC−5) · Autor: Claude Opus 5.5 (chat) para Josué Martines Cancho (J0sM4rt).

> **Cómo leer esto (para las IAs).** Lean el documento completo antes de escribir código. El orden de autoridad es:
> **(1)** la guía del profesor (`26.11.13.SpecTrabajoGrupal_W12.v2_..._Ernesto_Investing_AI.pdf`) →
> **(2)** este plan →
> **(3)** `docs/ia/DECISIONES.md` →
> **(4)** su propio criterio.
> Si algo de este plan contradice la guía en un punto **evaluado por la rúbrica**, gana la guía y deben avisar en `docs/ia/BITACORA.md`. Los identificadores (`R-…`, `D-…`, `T-…`, `C-…`) son estables: úsenlos en commits, PR y mensajes.

---

## Índice

1. Contexto, equipo y decisiones cerradas
2. Requisitos de la guía (lista trazable con IDs)
3. Conflictos entre la guía y lo que quiere el equipo, y cómo se resuelven
4. Arquitectura del sitio (doble modo, estado, capa de datos, estructura del repo)
5. Contrato de datos (los 13 JSON, invariantes y extensiones del modo real)
6. Pipeline de datos reales (Yahoo Finance → 36 modelos → optimizador → backtesting)
7. Algoritmos en el navegador (Markowitz, NSGA-II, NSGA-III y backtesting en Web Workers)
8. Diseño de interfaz y especificación de los 9 módulos (con pautas de Amershi)
9. Suite de accesibilidad (lector de pantalla, sonificación, barrido, cabeza/mirada, manos, voz)
10. Internacionalización ES-PE / EN-US (bonificación)
11. Calidad: pruebas automáticas, auditoría y verificaciones del profesor
12. Figma Make (mockups, importación sin créditos, `figma-src/`)
13. Reparto del trabajo entre IAs y personas, y propiedad de archivos
14. Cronograma lunes 16 → viernes 20 y orden de recorte
15. Protocolo de comunicación entre IAs y flujo de Git
16. Riesgos y mitigaciones
17. Definición de terminado y lista final de entrega
18. Anexos (equipo y pruebas humanas, referencias técnicas, glosario)

---

# 1. Contexto, equipo y decisiones cerradas

## 1.1 El encargo

- **Curso:** Interacción Hombre-Computador (202W0606), Unidad IV, Sesión 13. **Profesor:** Mg. Ing. Ernesto D. Cancho-Rodríguez, MBA.
- **Trabajo:** construir **Ernesto Investing AI** como **un solo sitio web integrado** (HTML + CSS + JavaScript puro, sin compilación), con 9 módulos: Dashboard, Watchlist y alertas, Trading simulado, Leaderboard, Clasificación, Regresión 30 días, Optimizador, Portafolios (3 niveles de riesgo) y Backtesting. Publicado en **GitHub Pages**.
- **Punto de partida:** `https://github.com/mbaernestocr-tech/ernesto-investing-ai-base-s13` (verificado: idéntico al ZIP del aula salvo finales de línea CRLF). Es la versión adaptada **del sistema de la Semana 4 de nuestro propio Equipo A**.
- **Entrega:** viernes **20-nov-2026, 18:00** (Aula Virtual). Es un **avance**: el mismo repositorio se mejora para el **proyecto final de la Semana 15**.
- **Lo que se evalúa en IHC:** cómo se comunican predicciones inciertas, cómo se evita que el usuario las malinterprete, cómo se navega un sistema grande y cómo se mantiene accesible.

## 1.2 Equipo A (11 integrantes)

| # | Apellidos y nombres | Código |
|---|---|---|
| 1 | Arboleda Sanchez, Ericka Sofia | 24200047 |
| 2 | Cabrejos Palomino, Christian Daniel | 23200242 |
| 3 | Ccoicca Fernandez, Adrian | 24200154 |
| 4 | Cerna Sifuentes, Augusto Nicolás | 24200053 |
| 5 | Grijalva De La Cruz, Rony Smith | 24200058 |
| 6 | Martines Cancho, Josue (coordinador e integrador) | 24200060 |
| 7 | Postigo Vega, Diana Carolina | 24200167 |
| 8 | Siesquen Torres, Katherine Lizbeth | 24200066 |
| 9 | Tecsi Alanoca, Jean Carlo | 24200068 |
| 10 | Tonconi Isidro, Maria Sunori | 24200176 |
| 11 | Villegas Niño, Marco Antonio | 21200266 |

> Nota: la guía dice «Grupos: de 3 a 5 integrantes». El Equipo A tiene 11; el coordinador confirma con el profesor si hace falta. No bloquea el trabajo.

## 1.3 Herramientas de IA y su papel

| Alias | Herramienta | Disponibilidad | Papel principal |
|---|---|---|---|
| **CC-F** | Claude Code con **Fable 5.2** | **Solo hoy, lunes 16-nov** | Plan de implementación (modo Plan) y la base de arquitectura más difícil |
| **CC-O** | Claude Code con **Opus 5.5** | Desde el martes 17-nov | Continúa la implementación del sitio siguiendo el plan de Fable |
| **CX** | Codex con **GPT-6 Astra** ("Astra 6.0") | Toda la semana | Pipeline de datos reales en Python, pruebas y auditoría independientes, documentación, informe y video |
| **OP** | Claude **Opus 5.5** en el chat de claude.ai (conector de Figma) | Toda la semana | Mockups de Figma Make e importación sin gastar créditos; consultas de coordinación |
| **HUM** | Integrantes del equipo | Mié–vie | Pruebas en dispositivos reales y revisión (sección 13 y Anexo A) |

## 1.4 Decisiones cerradas (no se reabren sin el coordinador)

| ID | Decisión |
|---|---|
| **D-01** | Entrega: viernes 20-nov-2026 18:00 (Lima). Objetivo interno: **subir todo a las 16:00** (2 h de margen). Es un avance; la Semana 15 continúa en el mismo repo. |
| **D-02** | El sitio tiene **dos modos de datos**: **Modo profesor** (datos sintéticos de `data/`, exactamente lo que pide la guía) y **Modo real** (Yahoo Finance + modelos entrenados de verdad). **Al abrir el sitio por primera vez se muestra el Modo profesor**; un control visible en la barra superior cambia al Modo real. La elección se guarda en el navegador y puede forzarse con `?modo=real` o `?modo=profesor`. |
| **D-03** | «Cualquier rango de fechas» significa: rango libre en **gráficos**, en la **ventana de estimación del optimizador** (Markowitz, NSGA-II y NSGA-III **reales** ejecutados en el navegador dentro de un Web Worker) y en el **periodo del backtesting**. Los **36 modelos** (18 clasificadores + 18 regresores) se entrenan en el pipeline de Python con **fecha de corte = último cierre** y también en **cierres de mes anteriores** (últimos 12), seleccionables en la interfaz. **No** se reentrenan modelos al vuelo en el navegador. |
| **D-04** | Actualización **automática diaria** con **GitHub Actions** cada día hábil después del cierre de Nueva York (cron `15 22 * * 1-5` UTC = 17:15 Lima). Sin servidores propios, sin claves. Yahoo no se llama desde el navegador (CORS). |
| **D-05** | El código de los **mockups de Figma Make vive fuera del repositorio y nunca se commitea**. Solo el ZIP que se descarga desde Figma Make se descomprime **sin editar** en `figma-src/` (lo exige la guía). |
| **D-06** | Los mockups de Figma Make los escribe **OP** (Opus 5.5 en el chat) con la estructura de proyecto que acepta Figma Make y los importa con el conector de Figma (`send_code_to_figma`): **la primera importación no gasta créditos**. |
| **D-07** | Accesibilidad para el viernes: **(a)** lector de pantalla + sonificación + resumen hablado; **(c)** puntero con cabeza/mirada + clic por parpadeo o permanencia (MediaPipe); **(d)** gestos de mano (MediaPipe); **(e)** barrido con un solo interruptor; **(f)** preferencias visuales. **(b) comandos de voz va en la última fase** (viernes, solo si todo lo anterior está verde; si no, Semana 15). |
| **D-08** | Repositorio **público**: `github.com/JosMart04/EquipoA_ErnestoInvestingAI` (sin «S13», porque sigue en la Semana 15). GitHub Pages desde `main` / raíz → `https://josmart04.github.io/EquipoA_ErnestoInvestingAI/`. **No es fork**: se copia el contenido del repo base. |
| **D-09** | Los archivos entregables sí siguen el patrón de la guía: `S13_EquipoA_Informe.pdf`, etc. (el nombre del repo es decisión del equipo). |
| **D-10** | Todos los integrantes reciben tareas de **prueba** (Anexo A), aunque CC y CX también prueban automáticamente. |
| **D-11** | El **video** es opcional (no es requisito): lo produce CX al final de la semana con voces y música de ElevenLabs, si hay tiempo. |
| **D-12** | El sitio sigue siendo **HTML + CSS + JS puro sin compilación** (regla de la guía). Las únicas dependencias en tiempo de ejecución son **ECharts 5.5.1** (la que fija la guía) y **MediaPipe Tasks Vision**, que **solo se carga cuando el usuario activa la cámara**. Esta excepción se declara en el informe. Python y Node se usan **solo** para el pipeline y las pruebas, nunca para servir el sitio. |
| **D-13** | `data/` (los 13 JSON del profesor) **no se modifica nunca**. Los datos reales van en `data_real/` con **el mismo esquema**. |
| **D-14** | Los prompts P01–P08 de la guía se usan **literalmente** (rellenando los corchetes) como entrada de cada módulo, seguidos de un bloque `<extensiones_equipo>` con lo del modo real y la accesibilidad. Todo prompt real queda copiado literal en `PROMPTS_USADOS.md`. |
| **D-15** | **El contexto vive en el repo y nunca se pierde.** `docs/contexto/` guarda: `PLAN_MAESTRO.md` + `PLAN_MAESTRO.pdf` (este documento), `GUIA_PROFESOR_S13.pdf` (la guía) y `PROMPTS_INICIALES.md`. En la raíz hay `CLAUDE.md` (lo lee Claude Code en cada sesión) y `AGENTS.md` (lo lee Codex en cada sesión), ambos con las reglas clave y la orden de leer `docs/contexto/` antes de trabajar. La coordinación diaria vive en `docs/ia/`. |

---

# 2. Requisitos de la guía (lista trazable)

Cada requisito tiene un ID. Todo PR menciona los IDs que cubre. «Verificación» es cómo lo comprueba la batería de pruebas (sección 11) o una persona.

## 2.1 Rúbrica (nota sobre 20; bonificación +1 por i18n)

| Criterio | Peso | Requisitos |
|---|---|---|
| Integración en un solo sitio | 15 % | R-INT-* |
| Clasificación binaria | 12 % | R-CLA-* |
| Regresión a 30 sesiones | 12 % | R-REG-* |
| Optimizador (Markowitz, NSGA-II, NSGA-III) | 15 % | R-OPT-* |
| Portafolios de 3 niveles | 10 % | R-POR-* |
| Backtesting | 12 % | R-BT-* |
| Diseño IHC y accesibilidad | 12 % | R-IHC-*, R-A11Y-* |
| Repositorio, src de Figma y despliegue | 7 % | R-FLU-*, R-ENT-02/03 |
| Informe y declaración de IA | 5 % | R-ENT-04/05 |
| **Bonificación** internacionalización | +1 | R-I18N-01 |

## 2.2 Integración transversal (R-INT)

| ID | Requisito | Verificación |
|---|---|---|
| R-INT-01 | Una sola barra de navegación con los **9 módulos**, idéntica en las 9 páginas | Playwright: 9 enlaces, mismo orden, `aria-current="page"` en la actual |
| R-INT-02 | Misma tipografía, paleta y componentes | Un solo `css/styles.css`; revisión visual |
| R-INT-03 | Estado compartido: el portafolio elegido en Portafolios se ve en Trading y Leaderboard; la watchlist se respeta en todos los módulos | Prueba E2E: elegir Moderado → Trading lo muestra → Leaderboard recalcula |
| R-INT-04 | Mismos 26 activos y misma fecha de cierre en todas las pantallas; un activo cambia de valor en un solo lugar | Una sola capa de datos con caché (sección 4.4) |
| R-INT-05 | Desde un activo en Clasificación se llega a su Regresión, y de allí al Optimizador | E2E: `clasificacion → regresion.html?t=X → optimizador.html?t=X` |
| R-INT-06 | Tema claro y oscuro, **incluidos los gráficos** | E2E: cambiar tema y comparar colores del canvas o de las opciones de ECharts |
| R-INT-07 | Vista móvil **sin desplazamiento horizontal a 390 px** | Playwright: `scrollWidth <= clientWidth` en 390×844, en las 9 páginas y ambos modos |
| R-INT-08 | Aviso de simulación visible en cada módulo de predicción, optimización y backtesting | Selector `[data-aviso]` presente y visible |
| R-INT-09 | Un solo despliegue en GitHub Pages (rama `main`, carpeta raíz) | La URL responde 200 en las 9 páginas |
| R-INT-10 | **Un solo** `css/styles.css` y **un solo** `js/common.js` compartidos; sin duplicar CSS ni JS | Revisión de código; los JS por módulo solo contienen lógica del módulo |

## 2.3 Datos (R-DAT)

| ID | Requisito |
|---|---|
| R-DAT-01 | Los JSON se **leen, no se inventan**. Toda cifra mostrada se rastrea a **archivo + campo**. Los campos derivados se declaran en `docs/CONTRATO_DATOS.md` y en el informe. |
| R-DAT-02 | `data/` no se modifica (ni formato, ni espacios, ni finales de línea). |
| R-DAT-03 | Ninguna cifra escrita a mano en el código (P08 lo audita). Las constantes de método (por ejemplo 0,5 o 0,08) se leen del JSON o se nombran como constantes documentadas. |

## 2.4 Módulos heredados (R-HER)

| ID | Módulo | Requisito mínimo | Aceptación |
|---|---|---|---|
| R-HER-01 | Dashboard | 26 activos, velas de 120 sesiones, filtro por grupo (4 grupos) | Cambiar de activo redibuja **sin recargar**; consola sin errores |
| R-HER-02 | Watchlist y alertas | Agregar y quitar activos; alertas disparadas visibles | Persiste en el navegador; disparadas se distinguen **sin depender solo del color** |
| R-HER-03 | Trading simulado | Órdenes con validación de efectivo y cantidad | Errores claros **asociados al campo** (`aria-describedby`, `aria-invalid`); el valor del portafolio se actualiza |
| R-HER-04 | Leaderboard | Ranking con la posición del usuario resaltada | El retorno del usuario sale de su portafolio de Trading |

## 2.5 Clasificación (R-CLA) — entrada `05_clasificadores_binarios.json`

| ID | Requisito | Verificación |
|---|---|---|
| R-CLA-01 | Mapa de calor activo × modelo con `prob_sube`; cada celda con **color + palabra SUBE/BAJA + símbolo ▲/▼**; tabla con `scope` | **26 × 18 = 468 celdas** |
| R-CLA-02 | Consenso por activo: votos a favor y en contra, probabilidad media, confianza (alta/media/baja) | Coincide con `votos_sube`, `votos_baja`, `prob_media`, `confianza` |
| R-CLA-03 | Métricas por modelo: exactitud, precisión, recall, F1, AUC y **matriz de confusión**; **ordenables con teclado** | Encabezados `<button>` con `aria-sort` |
| R-CLA-04 | Honestidad: mostrar que las exactitudes rondan 52–58 % y explicar en lenguaje llano qué es «acertar un poco más que una moneda» | Texto visible, no oculto |
| R-CLA-05 | Filtros por grupo y por familia (ML, DL) | E2E |
| R-CLA-06 | **Solo dos clases**. Prohibido mostrar «NEUTRO», «MANTENER», «HOLD» o una tercera salida | Búsqueda de texto en el DOM y el código |
| R-CLA-07 | Aviso «Datos sintéticos · clasificación simulada» | `[data-aviso]` |

## 2.6 Regresión (R-REG) — entradas `06_regresores_precio_30d.json` y `02_precios_sinteticos_504d.json`

| ID | Requisito | Verificación |
|---|---|---|
| R-REG-01 | Gráfico: últimas **120 sesiones** de historia + **30 proyectadas**; una línea tenue por modelo, la **mediana destacada**, sombreado **p10–p90** | Revisión visual + opciones de ECharts |
| R-REG-02 | Selector de activo y de familia (todos, solo ML, solo DL); casillas para activar o desactivar modelos | E2E |
| R-REG-03 | Etiqueta de retorno proyectado con color **y** texto y símbolo, por ejemplo «+2,93 % ▲» | Texto presente |
| R-REG-04 | Cono de volatilidad **siempre disponible**; banda visible **por defecto** | Estado inicial |
| R-REG-05 | Métricas por modelo: MAPE, MAE, RMSE, R² de retornos, mejora frente a la persistencia | Tabla |
| R-REG-06 | Alternativa en tabla de los **30 precios de la mediana** | Tabla accesible |
| R-REG-07 | Fechas y números con `Intl` según el locale activo | Prueba i18n |
| R-REG-08 | Aviso «Datos sintéticos · pronóstico simulado, no es asesoría de inversión» | `[data-aviso]` |
| R-REG-09 | **Verificación del profesor:** `ensamble_mediana[29] ≈ precio_ultimo × (1 + retorno_proyectado_30d_pct/100)` con tolerancia de **1 centavo** | Prueba automática en los 26 activos (en los datos del profesor la diferencia máxima medida es 0,006) |

## 2.7 Optimizador (R-OPT) — entrada `07_optimizador_markowitz_nsga.json`

| ID | Requisito | Verificación |
|---|---|---|
| R-OPT-01 | Dispersión riesgo (X) – retorno (Y): Markowitz como **línea**, NSGA-II como **puntos**, NSGA-III como **puntos coloreados por CVaR 95 %** | Opciones de ECharts |
| R-OPT-02 | Interruptores para mostrar u ocultar cada serie; opción «universo completo» frente a «solo elegibles» | E2E |
| R-OPT-03 | Clic **o Enter** en un punto → panel con pesos (barras) y métricas (retorno, volatilidad, Sharpe, CVaR) | E2E con teclado |
| R-OPT-04 | Explicación breve de qué optimiza cada método y **por qué los frentes NSGA quedan algo por debajo** de Markowitz | Texto visible |
| R-OPT-05 | Lista de activos elegibles y el criterio de elegibilidad | Lee `elegibles` y `criterio_elegibilidad` |
| R-OPT-06 | Aviso permanente: «NSGA-II y NSGA-III simulados: no se ejecutó ningún algoritmo evolutivo» (**modo profesor**) | `[data-aviso]` |
| R-OPT-07 | Puntos seleccionables con teclado; tabla alternativa de los puntos | E2E |
| R-OPT-08 | En **modo profesor** no se recalculan las fronteras: solo se leen del JSON | Revisión de código |
| R-OPT-09 | **Verificación del profesor:** en cada punto, `Σ pesos = 1 ± 0,02` y ningún peso supera `tope_peso_por_activo` | Prueba automática sobre los 170 puntos (en los datos del profesor: sumas 0,9979–1,0002; peso máximo 0,25) |

## 2.8 Portafolios (R-POR) — entrada `08_portafolios_3_niveles_riesgo.json`

| ID | Requisito |
|---|---|
| R-POR-01 | Tres tarjetas comparables lado a lado (Conservador, Moderado, Agresivo) con retorno esperado, volatilidad, Sharpe y CVaR |
| R-POR-02 | Gráfico de composición por nivel (dona o barras) con los pesos |
| R-POR-03 | Tabla de razones por activo tal como viene en `detalle_activos[].razon` |
| R-POR-04 | Botón «Llevar a Trading» que traslada el portafolio recomendado al módulo de Trading |

## 2.9 Backtesting (R-BT) — entrada `09_backtesting_portafolios.json`

| ID | Requisito | Verificación |
|---|---|---|
| R-BT-01 | Curvas de capital **base 100** de las 3 carteras frente a SPY, QQQ, EPU e «Igual ponderado (1/N)»; y curvas de **drawdown** | Gráficos |
| R-BT-02 | Tabla de métricas ordenable: retorno total, CAGR, volatilidad, Sharpe, máximo drawdown, Calmar y % de meses positivos | Tabla |
| R-BT-03 | Línea de tiempo de rebalanceos con los pesos de cada fecha | Componente accesible |
| R-BT-04 | Bloque «Interpretación» **generado desde los números** del JSON (sin conclusiones fijas en el código), que diga si cada cartera superó o no a SPY y por qué podría ser | Cambiar los números cambia el texto |
| R-BT-05 | Declarar que el backtesting es sobre historia sintética (modo profesor) y que el desempeño pasado no garantiza el futuro | `[data-aviso]` |
| R-BT-06 | **Verificación del profesor:** `curva[-1]/100 − 1 = retorno_total_pct/100 ± 0,05 pp` | Prueba automática |
| R-BT-07 | **No manipular** datos ni parámetros para que una cartera «gane». En el modo profesor las tres carteras pierden (−4,10 %, −6,19 %, −16,51 %) frente a SPY (+15,09 %), QQQ (+25,70 %), EPU (+28,97 %) y 1/N (+14,87 %): hay que **explicarlo**, no corregirlo | Revisión |

## 2.10 IHC y accesibilidad (R-IHC, R-A11Y)

| ID | Requisito |
|---|---|
| R-IHC-01 | **G1 y G2** (Amershi et al.): cada módulo de predicción dice qué hace y con qué exactitud; métricas visibles, no escondidas |
| R-IHC-02 | **G10**: el usuario puede ignorar o descartar una recomendación (quitar un activo del portafolio, ocultar un modelo) |
| R-IHC-03 | **G11**: las recomendaciones traen su razón (votos de clasificadores y proyección de regresión) |
| R-IHC-04 | **G17**: el usuario controla el universo, los modelos mostrados y el nivel de riesgo |
| R-A11Y-01 | Verde/rojo para SUBE/BAJA **siempre** con palabra y símbolo; nada depende solo del color |
| R-A11Y-02 | Contraste de texto **≥ 4,5:1** (WCAG 2.2 AA) en tema claro y oscuro |
| R-A11Y-03 | Tablas y gráficos con `aria-label` o texto alternativo; tablas con `scope`; formularios con `label` |
| R-A11Y-04 | Todo se opera con teclado; foco visible; enlace «Saltar al contenido» |
| R-A11Y-05 | Cada gráfico tiene una **alternativa en tabla** |
| R-I18N-01 | **(Bono +1)** Selector ES-PE / EN-US en la barra de navegación; números, monedas y fechas con `Intl.NumberFormat` e `Intl.DateTimeFormat`; **sin cadenas concatenadas** |

## 2.11 Flujo y entregables (R-FLU, R-ENT)

| ID | Requisito | Evidencia |
|---|---|---|
| R-FLU-01 | Figma completo: pantallas de los 5 módulos nuevos + adaptación de las 4 heredadas; un solo archivo; prototipo navegable | Enlace en modo vista + capturas en el informe |
| R-FLU-02 | `figma-src/` con el código descargado de Figma Make **sin editar** | Carpeta en el repo |
| R-FLU-03 | Interfaces con Claude siguiendo los prompts del Anexo A de la guía | `*.html` y `js/*.js` por módulo |
| R-FLU-04 | Integración (P07) | Sitio local en `http://127.0.0.1:8000` |
| R-FLU-05 | Despliegue en GitHub Pages y prueba en el celular | URL |
| R-FLU-06 | Verificación (P08): consola sin errores, 9 páginas cargan, móvil sin desborde, accesibilidad | Tabla de verificación en el informe |
| R-ENT-01 | Enlace de solo lectura del archivo de Figma | Enlace |
| R-ENT-02 | Repositorio público con `README.md`, `figma-src/`, `data/` y el sitio | Enlace |
| R-ENT-03 | Sistema desplegado con los 9 módulos funcionando | Enlace |
| R-ENT-04 | **Informe PDF de 8 a 12 páginas**: arquitectura, decisiones de diseño por módulo, capturas, interpretación del backtesting, limitaciones y declaración de uso de IA | `S13_EquipoA_Informe.pdf` |
| R-ENT-05 | `PROMPTS_USADOS.md` con los prompts **literales** de Claude y Figma Make que realmente se usaron | Archivo en la raíz |
| R-ETI-01 | Todo código o texto asistido por IA se ejecuta, verifica y declara | Informe + commits con coautoría |
| R-ETI-02 | No presentar datos sintéticos como reales ni pronósticos como asesoría de inversión | Avisos por modo |
| R-ETI-03 | Ningún secreto, token ni clave en el repositorio | Escaneo en CI + revisión |

---

# 3. Conflictos entre la guía y lo que quiere el equipo

El coordinador quiere un sistema **realista**: datos reales, algoritmos reales, cualquier rango de fechas, actualización dinámica y accesibilidad avanzada. La guía pide datos sintéticos, modelos simulados y fronteras leídas del JSON. La solución es **no elegir**: el sitio cumple la guía al pie de la letra en el **Modo profesor** y, además, ofrece el **Modo real** con la misma interfaz.

| Lo que dice la guía | Lo que quiere el equipo | Resolución |
|---|---|---|
| Datos sintéticos anclados al 11-nov-2026; «los JSON se leen, no se inventan» | Datos reales de Yahoo Finance, cualquier fecha, actualizados | **Doble modo con el mismo esquema** (D-02, D-13). Los datos reales también son JSON leídos, con trazabilidad a archivo y campo, generados por un pipeline reproducible y declarado. |
| «No se entrena ningún modelo… ni se ejecuta NSGA-II, NSGA-III o Markowitz en el navegador» (está en «Qué NO se pide», no prohibido) | Algoritmos reales | En el Modo real: modelos y fronteras **entrenados y calculados en Python** (el navegador los **lee**, igual que en el Modo profesor) y, solo para rangos personalizados, Markowitz/NSGA recalculados en un Web Worker. Se declara como trabajo adicional. |
| «Todo módulo debe llevar el aviso de datos sintéticos / simulado» | Datos reales | El aviso **depende del modo** (sección 4.2). En el Modo real dice «Datos reales de Yahoo Finance… modelos entrenados por el equipo… no es asesoría de inversión». Nunca se presenta un dato sintético como real ni viceversa. |
| P03: «Sin dependencias externas salvo ECharts 5.5.1» | Control por mirada y manos con MediaPipe | MediaPipe se carga **solo** al activar la cámara (carga diferida) y se declara. Sin cámara, el sitio no descarga nada más que ECharts. |
| `figma-src/` en el repo | El código de los mockups no debe ir al repo | El código fuente de trabajo queda fuera (D-05); en el repo solo entra el **export oficial de Figma Make sin editar**. |
| Flujo «Figma primero, luego código» | Hacer todo en paralelo para llegar al viernes | Los mockups (OP) y la implementación (CC) parten de **los mismos tokens y especificaciones de este plan** (sección 8). Cuando los mockups están listos, CC hace una pasada de conformidad visual. El informe describe el orden real con honestidad. |
| Fronteras: «No recalcular, solo leer del JSON» (P05) | Rango libre | En el Modo profesor se respeta al pie de la letra. En el Modo real el valor por defecto también se **lee** del JSON del pipeline; el recálculo ocurre solo si el usuario pide un rango personalizado y se etiqueta como «recalculado en tu navegador». |
| Plan de la guía: entregables `S13_Equipo<letra>_…` | Repo `EquipoA_ErnestoInvestingAI` | El repo se llama así (D-08); los archivos entregables siguen el patrón (D-09). |

**Regla de oro:** si en algún momento falta tiempo, el **Modo profesor completo y pulido** (todo R-INT, R-CLA, R-REG, R-OPT, R-POR, R-BT, R-IHC, R-A11Y) tiene prioridad absoluta sobre el Modo real y sobre la accesibilidad avanzada. El profesor corrige con sus JSON.

---

# 4. Arquitectura del sitio

## 4.1 Principios

1. **Un sitio estático**, sin compilación, servido por GitHub Pages: HTML + CSS + JS (módulos ES permitidos), ECharts 5.5.1 desde jsDelivr y MediaPipe con carga diferida.
2. **Una sola capa de datos** con dos proveedores (profesor / real) y **el mismo esquema**. Los módulos no saben de qué modo vienen los datos, salvo para textos y para habilitar el recálculo.
3. **Compatibilidad con la base.** Se conservan `$`, `fmt`, `loadJSON`, `store`, `buildShell` y las claves `eia_theme`, `eia_watch`, `eia_port`, para no romper lo heredado. Se agrega el espacio de nombres `EIA`.
4. **Un solo `css/styles.css` y un solo `js/common.js`** (R-INT-10). Lo opcional y pesado (accesibilidad avanzada, Workers, algoritmos) va en archivos aparte que `common.js` carga **bajo demanda**. No se duplica código entre módulos.
5. **Accesibilidad por construcción:** HTML semántico primero, ARIA solo cuando hace falta, foco siempre visible, nada depende solo del color, y cada gráfico tiene tabla, resumen y sonificación.

## 4.2 Los dos modos

| Aspecto | **Modo profesor** (por defecto) | **Modo real** |
|---|---|---|
| Carpeta de datos | `data/` (intocable) | `data_real/` (la genera el pipeline cada día hábil) |
| Fecha de corte | 11-nov-2026 (fija) | Último cierre de NYSE (por ejemplo 16-nov-2026) y 12 cierres de mes anteriores seleccionables |
| Historia de precios | 504 sesiones (02) y 120 velas (03) | Desde 2010-01-04 (o la salida a bolsa) por activo |
| Rango de fechas | Solo filtra la visualización dentro de lo que traen los JSON | Libre en gráficos, optimizador y backtesting (D-03) |
| Modelos | Simulados (salidas del JSON) | 18 clasificadores y 18 regresores entrenados con validación sin mirar el futuro |
| Optimizador | Se lee del JSON; **sin recálculo** (R-OPT-08) | Se lee del JSON del pipeline (pymoo y cvxpy reales); con rango personalizado se recalcula en un Worker |
| Backtesting | Se lee del JSON | Se lee del JSON del pipeline; con rango personalizado se recalcula en un Worker |
| Leaderboard | Liga ficticia del profesor | La misma liga ficticia (declarado como tal) y el usuario con sus precios reales |
| Aviso principal | «Datos sintéticos · resultados simulados» + el texto exacto de cada módulo (R-CLA-07, R-REG-08, R-OPT-06, R-BT-05) | «Datos reales de Yahoo Finance al cierre del {fecha} (descargados con yfinance, con fines educativos; pueden tener retraso o errores) · Modelos entrenados por el Equipo A · No es asesoría de inversión» |
| Si algo falla | — | Si `data_real/meta.json` no carga, o tiene más de 5 días hábiles de antigüedad, se avisa y se ofrece volver al Modo profesor (sin cambiar solo) |

**Control de modo (barra superior):** un grupo de dos botones con `aria-pressed`, rótulo visible «Datos:», opciones «Profesor · 11-nov-2026» y «Reales · Yahoo {fecha}». Al cambiar de modo:

1. se guarda `eia_modo`;
2. se emite el evento `eia:modo`;
3. cada módulo vuelve a cargar y dibujar **sin recargar la página**; si un módulo no lo soporta, se recarga la página conservando el estado;
4. una región `aria-live` anuncia «Ahora ves datos reales al cierre del 16 de noviembre de 2026».

El parámetro `?modo=` de la URL tiene prioridad y se guarda.

## 4.3 Estructura del repositorio

```text
EquipoA_ErnestoInvestingAI/
├── CLAUDE.md                 # Lo lee Claude Code en cada sesión → apunta a docs/contexto/
├── AGENTS.md                 # Lo lee Codex en cada sesión → apunta a docs/contexto/
├── README.md                 # Qué es, cómo ejecutar, enlaces (Figma, Pages), integrantes, licencia CC BY 4.0 del material base
├── PROMPTS_USADOS.md         # Prompts LITERALES usados (R-ENT-05)
├── LICENSE                   # La del material base (CC BY 4.0, Ernesto D. Cancho-Rodríguez), conservada
├── .gitignore  .gitattributes  .nojekyll
├── index.html  watchlist.html  trading.html  leaderboard.html          # heredados (ampliados)
├── clasificacion.html  regresion.html  optimizador.html  portafolios.html  backtesting.html
├── css/
│   └── styles.css            # ÚNICA hoja de estilos (tokens, componentes, temas, accesibilidad)
├── js/
│   ├── common.js             # ÚNICO núcleo compartido: shell, nav, tema, modo, idioma, estado, capa de datos, fmt, avisos, utilidades de tablas y gráficos
│   ├── dashboard.js  watchlist.js  trading.js  leaderboard.js
│   ├── clasificacion.js  regresion.js  optimizador.js  portafolios.js  backtesting.js
│   ├── lib/                  # Lógica pura sin DOM, testeable en Node
│   │   ├── estadistica.js    # medias, covarianza, percentiles, CVaR, drawdown, métricas
│   │   ├── simplex.js        # proyección al símplex con tope por activo
│   │   ├── markowitz.js      # frontera eficiente con restricciones
│   │   ├── nsga2.js  nsga3.js  prng.js
│   │   └── backtest.js       # walk-forward mensual (mismo método que el profesor)
│   ├── workers/
│   │   ├── optimizador.worker.js
│   │   └── backtest.worker.js
│   └── a11y/                 # Se cargan bajo demanda desde common.js
│       ├── panel.js          # Centro de accesibilidad (diálogo)
│       ├── preferencias.js   # tamaño de texto, contraste, movimiento, fuente, espaciado
│       ├── anunciador.js     # regiones aria-live
│       ├── resumen.js        # resúmenes en texto de gráficos y páginas
│       ├── sonificacion.js   # Web Audio: gráficos convertidos en sonido + exploración punto a punto
│       ├── lectura.js        # speechSynthesis (leer resumen)
│       ├── bus-entrada.js    # comandos semánticos comunes a todas las modalidades
│       ├── puntero.js        # puntero virtual, permanencia (dwell), imán, zonas de desplazamiento
│       ├── barrido.js        # barrido con un solo interruptor
│       ├── camara.js         # consentimiento, getUserMedia, ciclo de video, pausa
│       ├── cabeza-mirada.js  # MediaPipe FaceLandmarker → puntero + clic por parpadeo o boca
│       ├── manos.js          # MediaPipe HandLandmarker → puntero + pellizco + deslizar
│       └── voz.js            # Comandos de voz (última fase, D-07)
├── i18n/
│   ├── es-PE.json
│   └── en-US.json
├── assets/
│   ├── mediapipe/            # face_landmarker.task, hand_landmarker.task (descargados por tools/descargar_modelos.*)
│   ├── fuentes/              # Atkinson Hyperlegible (OFL) para la opción de fuente legible
│   └── sonidos/              # clics y confirmaciones cortos (opcional)
├── data/                     # 13 JSON del profesor — NO SE TOCAN (D-13)
├── data_real/                # Generado por el pipeline (sección 5.4) — solo lo escribe GitHub Actions o CX
├── pipeline/                 # Python: descarga, variables, 36 modelos, optimizador, backtesting
│   ├── requirements.txt  README.md  ejecutar.py  config.py
│   ├── descarga.py  variables.py  clasificadores.py  regresores.py  modelos_dl.py
│   ├── optimizador.py  portafolios.py  backtesting.py  mercado.py  exportar.py
│   └── tests/
├── tools/
│   ├── validar_contrato.py   # valida data/ y data_real/ contra el contrato (sección 5)
│   ├── descargar_modelos.ps1 / .sh   # modelos de MediaPipe
│   └── servir.ps1 / .sh      # python -m http.server 8000
├── tests/                    # Playwright + axe-core (dev). package.json SOLO para pruebas
│   ├── package.json  playwright.config.js
│   ├── e2e/  a11y/  datos/  unit/
│   └── fixtures/
├── figma-src/                # Export de Figma Make SIN EDITAR (D-05)
├── docs/
│   ├── contexto/             # PLAN_MAESTRO.md, PLAN_MAESTRO.pdf, GUIA_PROFESOR_S13.pdf, PROMPTS_INICIALES.md
│   ├── ia/                   # TABLERO.md, BITACORA.md, DECISIONES.md, HANDOFF.md
│   ├── plan/                 # PLAN_IMPLEMENTACION.md (lo escribe Fable hoy)
│   ├── CONTRATO_DATOS.md     # Versión viva del contrato (sección 5)
│   ├── capturas/             # Capturas para el informe (claro, oscuro, 390 px, ambos modos)
│   ├── informe/              # Fuente del informe y S13_EquipoA_Informe.pdf
│   └── guia-usuario/         # Guía de accesibilidad y atajos
└── .github/
    ├── workflows/actualizar-datos.yml   # cron diario (D-04)
    ├── workflows/qa.yml                 # pruebas en cada PR
    └── ISSUE_TEMPLATE/hallazgo-prueba.md
```

## 4.4 Capa de datos (`js/common.js`)

```js
// Contrato de la API (nombres orientativos; Fable decide los definitivos y los documenta)
EIA.modo()                         // "profesor" | "real"
EIA.setModo(m)                     // guarda, emite "eia:modo"
EIA.datos(nombreArchivo)           // Promise<JSON> de data/ o data_real/ según el modo, con caché por modo
EIA.datosCorte(nombreArchivo, f)   // Modo real: data_real/cortes/<f>/<archivo>; sin f = último corte
EIA.cortes()                       // Profesor: ["2026-11-11"]; real: data_real/cortes/index.json
EIA.meta()                         // fecha de corte, fuente, generado_en, antigüedad, estado
EIA.historia(ticker, {desde, hasta}) // Profesor: desde 02/03; real: data_real/precios/<T>.json
EIA.estado.get(k) / .set(k, v)     // envoltura de localStorage con try/catch
EIA.on(evento, fn)                 // "eia:modo" | "eia:idioma" | "eia:tema" | "eia:estado"
EIA.t(clave, params)               // i18n (sección 10)
EIA.fmt.num/pct/usd/fecha(...)     // Intl según el idioma activo
EIA.aviso(modulo)                  // inserta el aviso correcto según módulo y modo, con data-aviso
```

- `loadJSON(nombre)` de la base pasa a delegar en `EIA.datos(nombre)`. Así los cuatro módulos heredados funcionan en ambos modos con cambios mínimos.
- **Caché y coherencia (R-INT-04):** cada archivo se pide una sola vez por modo y página. El «último precio» de un activo se toma **siempre** de `10_dashboard_mercado.json → ultimo`, y la capa expone `EIA.precio(ticker)` para que ningún módulo lo calcule por su cuenta.
- **Evitar caché vieja:** en el Modo real, las peticiones a `data_real/` llevan `?v=<meta.generado_en>`.
- **Errores:** mensaje en la página con `role="alert"`, como `showError` de la base, y en el Modo real la opción de volver al Modo profesor.

## 4.5 Estado compartido (`localStorage`)

| Clave | Contenido | Usado en |
|---|---|---|
| `eia_theme` | `"light"` / `"dark"` (base) | Todo |
| `eia_modo` | `"profesor"` / `"real"` | Todo |
| `eia_lang` | `"es-PE"` / `"en-US"` | Todo |
| `eia_watch` | lista de tickers (base) | Watchlist; estrella ★ y filtro «Solo mi watchlist» en Dashboard, Clasificación, Regresión y Optimizador (R-INT-03) |
| `eia_port` | portafolio de Trading del **Modo profesor** (base) | Trading, Leaderboard |
| `eia_port_real` | portafolio de Trading del **Modo real** (precios reales) | Trading, Leaderboard |
| `eia_activo` | último activo seleccionado | Dashboard, Clasificación, Regresión, Optimizador |
| `eia_elegido` | `{modo, nivel, fecha_corte, origen, pesos, excluidos[], llevado_a_trading}` | Portafolios → Trading → Leaderboard |
| `eia_modelos_ocultos` | modelos ocultados por el usuario (G10) | Clasificación, Regresión |
| `eia_rango` | `{modulo: {desde, hasta}}` por modo | Dashboard, Regresión, Optimizador, Backtesting |
| `eia_corte` | fecha de corte elegida (Modo real) | Clasificación, Regresión, Optimizador, Portafolios |
| `eia_a11y` | preferencias de accesibilidad y modalidades activas | Todo |

**«Llevar a Trading» (R-POR-04, G10):** abre un diálogo que muestra cuánto efectivo invertir (por defecto todo el disponible), calcula `cantidad = floor(monto × peso / precio)` por activo y deja **desmarcar** activos (los pesos se renormalizan). Al confirmar ejecuta órdenes de compra a mercado con la misma validación de Trading y guarda `eia_elegido.llevado_a_trading = true`. Trading muestra una tarjeta «Portafolio aplicado: Moderado (NSGA-II N2-37)». El Leaderboard recalcula el retorno del usuario.

## 4.6 Navegación

- Barra superior: marca → 9 módulos (orden de la base) → control de **Modo** → selector de **Idioma** → **Tema** → **Accesibilidad**.
- **Por debajo de 900 px**, los 9 módulos pasan a un menú desplegable (botón «Módulos» con `aria-expanded`) para que no haya desborde a 390 px (R-INT-07). Los controles siguen alcanzables.
- Enlaces cruzados (R-INT-05): Clasificación (fila de un activo) → «Ver su regresión» `regresion.html?t=NVDA` → «Ver en el optimizador» `optimizador.html?t=NVDA` (resalta el activo y dice si es elegible y por qué). También Dashboard → Clasificación, Watchlist → Regresión y Portafolios → Backtesting.
- Migas de pan cuando se llega por un enlace cruzado: «Clasificación › NVDA › Regresión».
- `scroll-padding-top` igual a la altura de la cabecera fija, para que el foco nunca quede tapado (WCAG 2.4.11).

---

# 5. Contrato de datos

El contrato aplica **igual** a `data/` (profesor) y a `data_real/` (real). La versión viva está en `docs/CONTRATO_DATOS.md` (la crea Fable a partir de esta sección, versión `1.0.0`). **Cambiar el contrato** requiere un mensaje `CAMBIO-CONTRATO` en la bitácora y el acuerdo de CC y CX (sección 15).

## 5.1 Esquema de los 13 archivos (medido sobre los JSON del profesor)

| Archivo | Estructura |
|---|---|
| `01_universo_tickers.json` | `[{ticker, nombre, grupo, sector, nota, "precio_ancla_2026-11-11", volatilidad_anual (fracción), beta_SPY}] × 26` |
| `02_precios_sinteticos_504d.json` | `{fechas[504] (2024-12-06 → 2026-11-11), cierres{TICKER: [504]}, nota}` |
| `03_ohlcv_sintetico_120d.json` | `{fechas[120] (→ 2026-11-11), series{TICKER: {o[120], h[120], l[120], c[120], v[120]}}}` |
| `04_matriz_correlacion_covarianza.json` | `{tickers[26], correlacion[26][26], covarianza_anual[26][26], retorno_esperado_anual_simulado[26]}` |
| `05_clasificadores_binarios.json` | `{definicion, modelos[18]{modelo, familia, exactitud, precision, recall, f1, auc, matriz_confusion{VP, FP, VN, FN}, n_prueba}, predicciones{TICKER: {modelos[18]{modelo, familia, prob_sube, senal}, votos_sube, votos_baja, prob_media, consenso, confianza}}}` |
| `06_regresores_precio_30d.json` | `{fechas_pronostico[30] (2026-11-12 → 2026-12-24), modelos[18]{modelo, familia, mape_30d_pct, mae_relativo_pct, rmse_relativo_pct, r2_retornos_30d, mejora_vs_persistencia_pct}, predicciones{TICKER: {precio_ultimo, modelos[18]{modelo, familia, precios[30]}, ensamble_mediana[30], banda_p10[30], banda_p90[30], retorno_proyectado_30d_pct, cono_volatilidad_inf[30], cono_volatilidad_sup[30]}}}` |
| `07_optimizador_markowitz_nsga.json` | `{elegibles[], criterio_elegibilidad, tope_peso_por_activo (0,25), tasa_libre_riesgo (0,04), markowitz_universo_completo[35], markowitz_elegibles[35], nsga2_elegibles[40]{…, id "N2-xx"}, nsga3_elegibles[60]{…, id "N3-xx"}, nota}`; cada punto: `{retorno_esperado_anual_pct, volatilidad_anual_pct, sharpe, cvar95_diario_pct, pesos{TICKER: fracción}}` |
| `08_portafolios_3_niveles_riesgo.json` | `{fecha, niveles[3]{nivel, origen, descripcion, restricciones, retorno_esperado_anual_pct, volatilidad_anual_pct, sharpe, cvar95_diario_pct, pesos{}, detalle_activos[]{ticker, peso_pct, grupo, razon}}}` |
| `09_backtesting_portafolios.json` | `{metodo, fechas[253] (fechas[0] = "inicio"), base 100, periodo{inicio, fin, sesiones 252}, carteras{Conservador|Moderado|Agresivo: {curva[253], metricas{7}, rebalanceos[12]{fecha, pesos}, turnover_medio, drawdown[253]}}, referencias{SPY|QQQ|EPU|"Igual ponderado (1/N)": {curva[253], metricas{7}}}}` |
| `10_dashboard_mercado.json` | `[{ticker, nombre, grupo, sector, ultimo, var_1d_pct, var_5d_pct, var_1m_pct, var_3m_pct, volatilidad_anual_pct, beta_vs_SPY, volumen}] × 26` |
| `11_watchlist_alertas_portafolio_demo.json` | `{watchlist_inicial[5], alertas[]{ticker, tipo ∈ {precio_sobre, precio_bajo, var_1d_menor_a_pct, var_1d_mayor_a_pct}, umbral, activa}, portafolio_demo{efectivo, posiciones[]{ticker, cantidad, costo}}}` |
| `12_leaderboard_liga.json` | `[{alias, equipo, retorno_liga_pct, operaciones, sharpe, posicion}] × 10` (liga **ficticia**) |
| `13_patrones_y_parametros.json` | `{semilla, fecha_ancla_precios, fecha_generacion, fuentes_de_anclaje[], que_es_real, que_es_sintetico, patrones_aplicados[8]{id, nombre, detalle}, parametros{N_HIST, N_FC, RF, TOPE_PESO, clasificadores, regresores}, parametros_por_ticker[26]{…}, aviso}` |

**Nombres exactos de los modelos** (deben coincidir carácter por carácter en ambos modos):

- **Clasificadores (11 ML):** `Regresion logistica`, `SVC (kernel RBF)`, `k-vecinos (kNN)`, `Naive Bayes gaussiano`, `Arbol de decision`, `Random Forest`, `Extra Trees`, `AdaBoost`, `Gradient Boosting`, `XGBoost`, `LightGBM`.
- **Clasificadores (7 DL):** `MLP (red densa)`, `RNN simple`, `LSTM`, `GRU`, `BiLSTM`, `CNN 1D`, `Transformer`.
- **Regresores (11 ML):** `Regresion lineal`, `Ridge`, `Lasso`, `Elastic Net`, `SVR (RBF)`, `k-vecinos (kNN)`, `Arbol de decision`, `Random Forest`, `Gradient Boosting`, `XGBoost`, `LightGBM`.
- **Regresores (7 DL):** los mismos 7 nombres DL de arriba.
- **Grupos:** `Magnificas 7`, `Mineras con operaciones en Peru`, `ETF sectoriales`, `ETF globales y Peru` (sin tildes en los datos; la interfaz los muestra con tildes mediante un mapa de traducción: «Magníficas 7», «Mineras con operaciones en Perú», …).

## 5.2 Invariantes (las comprueban `tools/validar_contrato.py` y `tests/datos/`)

Se verificaron sobre los datos del profesor: **todas se cumplen**.

| ID | Invariante |
|---|---|
| I-01 | 26 tickers en todos los archivos por activo, mismo conjunto que `01`. |
| I-02 | `05`: 18 modelos (11 ML + 7 DL) con los nombres exactos. Por activo: `senal = "SUBE"` ⇔ `prob_sube ≥ 0,5`; `votos_sube` = número de SUBE; `votos_baja = 18 − votos_sube`; `prob_media` = media de las 18 (±0,0015 por redondeo); `consenso = "SUBE"` ⇔ `prob_media ≥ 0,5`; `confianza` = `alta` si `|prob_media − 0,5| ≥ 0,08`, `media` si `≥ 0,04`, si no `baja`. `senal`/`consenso` ∈ {SUBE, BAJA} **solamente**. `VP+FP+VN+FN = n_prueba`. |
| I-03 | `06`: 30 fechas de pronóstico = las 30 sesiones bursátiles de NYSE posteriores al corte; cada modelo trae 30 precios; `ensamble_mediana[i]` = mediana de los 18 modelos en el día *i* (±0,005); `banda_p10`/`banda_p90` = percentiles 10/90 de los 18 modelos (interpolación lineal, ±0,005); `retorno_proyectado_30d_pct = round((mediana[29]/precio_ultimo − 1)·100, 2)`; **cono** = `mediana × exp(±1,2816 · σ_d · √h)` con `σ_d = volatilidad_anual / √252` (intervalo del 80 %; medido en los datos del profesor: z = 1,281–1,285). |
| I-04 | `07`: `0 ≤ peso ≤ tope_peso_por_activo`; `Σ pesos ∈ [0,98; 1,02]`; `sharpe = (retorno − 100·tasa_libre_riesgo) / volatilidad` (±0,01); `elegibles` = activos con `consenso = SUBE` **y** `retorno_proyectado_30d_pct > 0`; ids `N2-01…`, `N3-01…`. |
| I-05 | `08`: niveles `Conservador`, `Moderado`, `Agresivo` en ese orden; `Σ pesos ≈ 1`; `detalle_activos` lista solo pesos ≥ 1 % (en `pesos` pueden venir pesos menores: la interfaz muestra ambos con claridad); `razon` con el formato `"{n}/18 clasificadores = SUBE; proyeccion mediana 30 sesiones {±x.xx} %"`. |
| I-06 | `09`: `fechas[0] = "inicio"` (**no es una fecha**: la interfaz lo muestra como «Inicio» y no lo pasa por `Date`); `curva[0] = 100`; `len(curva) = len(drawdown) = len(fechas)`; `drawdown ≤ 0`; R-BT-06. **Ojo:** en el backtesting del profesor, el **Agresivo usa tope 0,35**, mientras `08` dice «tope 25 %». Es una inconsistencia del material: se **documenta** en el informe, no se corrige. |
| I-07 | El último precio de cada activo es **el mismo** en `01` (precio ancla), `06.precio_ultimo`, `10.ultimo` y el último cierre de `02` y `03` (R-INT-04). |
| I-08 | Último elemento de `02.fechas` = último de `03.fechas` = fecha de corte. |

## 5.3 Fórmulas de métricas (para replicar en el Modo real)

- **Sharpe** = (retorno anual − 4 %) / volatilidad anual. **CVaR 95 % diario** = −media de los retornos diarios del 5 % peor (en %).
- **Backtesting:** retorno total = `curva[-1]/100 − 1`; CAGR = `(curva[-1]/100)^(252/sesiones) − 1`; volatilidad = `std(retornos diarios)·√252`; máximo drawdown = mínimo de `curva/max_acumulado − 1`; Calmar = CAGR / |máximo drawdown|; meses positivos = % de bloques de 21 sesiones con retorno > 0.
- **Clasificación (prueba fuera de muestra):** exactitud, precisión, recall y F1 de la clase SUBE; AUC ROC; matriz de confusión con SUBE como positivo.
- **Regresión (prueba fuera de muestra, horizonte 30):** `mape_30d_pct` = media de |P̂(t+30) − P(t+30)| / P(t+30) · 100; `mae_relativo_pct` = media de |r̂₃₀ − r₃₀| · 100; `rmse_relativo_pct` = √media((r̂₃₀ − r₃₀)²) · 100; `r2_retornos_30d` = 1 − SSE/SST sobre r₃₀; `mejora_vs_persistencia_pct` = (MAPE_persistencia − MAPE_modelo) / MAPE_persistencia · 100, donde la persistencia predice P(t+30) = P(t).

## 5.4 Extensiones del Modo real (`data_real/`)

Los **13 archivos conservan nombre y esquema** (también `02_precios_sinteticos_504d.json`, aunque sean reales: así la capa de datos no cambia; su campo `nota` dice «REALES»). Se agregan:

| Archivo | Contenido |
|---|---|
| `meta.json` | `{version_contrato, generado_en (ISO UTC), fecha_corte, fuente: "Yahoo Finance vía yfinance <versión>", tickers_ok[], tickers_con_problemas[], stale (bool), duracion_s, commit, aviso}` |
| `precios/<TICKER>.json` | `{ticker, desde, fechas[], o[], h[], l[], c[], v[]}` diario **ajustado** (splits y dividendos), desde 2010-01-04 o desde la salida a bolsa |
| `cierres_historicos.json` | `{fechas[], cierres{TICKER: []}}` de todo el periodo (lo usan los Workers del optimizador y del backtesting) |
| `cortes/index.json` | `{ultimo, cortes[]}`: último cierre + 12 cierres de mes anteriores |
| `cortes/<YYYY-MM-DD>/05…, 06…, 07…, 08…` | Mismos esquemas, entrenados **solo con datos hasta esa fecha** |
| Campos opcionales | `fuente`, `generado_en`, `fecha_corte`, `metodologia`, `hiperparametros`, `n_prueba` real. **La interfaz no debe depender de ellos**, solo mostrarlos si existen. |

**Reglas del Modo real** (además de I-01…I-08):

- `12_leaderboard_liga.json`: la misma liga ficticia, marcada con `"ficticio": true`.
- `11`: la misma watchlist inicial; umbrales recalculados (precio_sobre = último × 1,05; precio_bajo = último × 0,95; los de variación igual); portafolio demo con el mismo efectivo y cantidades y `costo` = cierre real de hace 63 sesiones.
- Si hay **menos de 4 elegibles**, el problema con tope 25 % no tiene solución (4 × 25 % = 100 %). Regla: se completa con los activos de mayor `prob_media` hasta llegar a 4 y se muestra con un aviso visible («Se agregaron X y Y para poder respetar el tope de 25 %»).
- Presupuesto de tamaño: `data_real/` ≤ 15 MB.

---

# 6. Pipeline de datos reales (Python) — responsable: CX

## 6.1 Por qué existe

Yahoo Finance **no se puede consultar desde el navegador**: el endpoint de históricos `v8/finance/chart` responde sin autenticación desde un servidor, pero en el navegador falla por CORS y cookies. Por eso un proceso en **GitHub Actions** descarga, entrena, optimiza y escribe JSON estáticos en `data_real/`, que GitHub Pages sirve como cualquier otro archivo (D-04).

## 6.2 Entorno y versiones (verificadas el 16-nov-2026)

Python 3.12. `pipeline/requirements.txt` fija versiones compatibles:

```text
yfinance~=1.8.0
pandas~=3.1
numpy~=2.5
scipy~=1.18
scikit-learn~=1.9
xgboost~=3.4
lightgbm~=4.7
torch~=2.15        # instalar la variante CPU: --index-url https://download.pytorch.org/whl/cpu
pymoo~=0.6.2
cvxpy~=1.9
exchange-calendars~=4.13
```

> Si alguna versión no instala en Windows o en Actions, CX baja a la última que funcione y lo anota en `docs/ia/DECISIONES.md`.

## 6.3 Etapas

```text
pipeline/ejecutar.py --salida data_real --corte auto --modo {diario|cortes|completo}
  1. descarga.py       → precios ajustados de los 26 tickers (+ ^VIX solo como variable explicativa)
  2. mercado.py        → 01, 02, 03, 04, 10, 11, 12, 13, precios/<T>.json, cierres_historicos.json
  3. variables.py      → panel de variables por (fecha, ticker), sin mirar el futuro
  4. clasificadores.py → 05 (11 ML con scikit-learn/XGBoost/LightGBM)
     modelos_dl.py     → 05 (7 DL con PyTorch)
  5. regresores.py     → 06 (11 ML + 7 DL), ensamble, bandas y cono
  6. optimizador.py    → 07 (Markowitz con cvxpy; NSGA-II y NSGA-III con pymoo)
  7. portafolios.py    → 08 (3 niveles desde el frente NSGA-II)
  8. backtesting.py    → 09 (walk-forward mensual; mismo método que el profesor)
  9. exportar.py       → escribe en una carpeta temporal, valida el contrato y reemplaza data_real/ de forma atómica
```

### 1. Descarga (`descarga.py`)

- `yf.download(tickers, start="2010-01-01", interval="1d", auto_adjust=True, group_by="ticker", threads=True, progress=False)`. Hasta 3 reintentos con espera de 30, 60 y 120 s; si un ticker falla, se reintenta solo con `yf.Ticker(t).history(...)`.
- Se alinea todo al calendario de sesiones de SPY (NYSE). Huecos de hasta 2 sesiones se rellenan hacia adelante; huecos mayores invalidan el ticker y se reportan en `meta.tickers_con_problemas`.
- **Verificar el ticker `B` (Barrick)**: Barrick cambió su símbolo en NYSE durante 2025. Si `B` trae poca historia, documentar y unir con la serie del símbolo anterior **solo si Yahoo lo confirma**; si no, se usa la historia disponible y se declara.
- Caché local en `pipeline/.cache/` (en `.gitignore`).
- Atribución obligatoria en `meta.fuente` y en la interfaz: «Datos de Yahoo Finance obtenidos con yfinance (proyecto no afiliado a Yahoo), con fines educativos».

### 2. Variables (`variables.py`) — solo información disponible hasta el día *t*

- Retornos logarítmicos a 1, 5, 10, 21, 63 y 126 sesiones; volatilidad a 21 y 63; RSI(14); histograma MACD(12, 26, 9) normalizado por el precio; distancia a las medias de 50 y 200; z-score del volumen a 21; beta y correlación a 63 con SPY; retorno y volatilidad de SPY a 21; nivel y variación de ^VIX; grupo del activo (one-hot de 4).
- **Etiqueta de clasificación:** `y = 1` si `P(t+30) > P(t)`, si no 0 (exactamente la definición de la guía).
- **Etiqueta de regresión:** retornos logarítmicos acumulados `r_h = ln(P(t+h)/P(t))`; ML en horizontes **5, 10, 15, 20, 25 y 30** con interpolación lineal en *h* (con `r_0 = 0`); DL con salida directa de los 30 horizontes.
- **Modelos «de panel»:** un modelo por algoritmo entrenado con los 26 activos juntos (más datos, y menos tiempo que 26 × 36 modelos). Se declara en el informe.

### 3. Validación sin mirar el futuro

- **Prueba fuera de muestra:** las últimas **252 fechas con etiqueta conocida** antes del corte (todas las de `t + 30 ≤ corte`), con todos los tickers. `n_prueba` = número real de filas.
- **Embargo de 30 sesiones** entre entrenamiento y prueba, porque las etiquetas a 30 días se solapan; sin embargo habría fuga de información.
- El escalado (`StandardScaler`) se ajusta **solo** con el entrenamiento.
- Tras medir, cada modelo **se reentrena con todo lo etiquetado hasta el corte** y predice en la fecha de corte para cada ticker.
- Se guarda además `tasa_base_sube` (porcentaje de SUBE en la prueba), para que la interfaz diga con honestidad: «un modelo que siempre dijera SUBE acertaría X %».

### 4 y 5. Los 36 modelos

| Familia | Clasificadores (`05`) | Regresores (`06`) | Notas |
|---|---|---|---|
| ML | `LogisticRegression`, `SVC(rbf, probability=True)`, `KNeighborsClassifier(k≈50)`, `GaussianNB`, `DecisionTreeClassifier(max_depth=5)`, `RandomForestClassifier`, `ExtraTreesClassifier`, `AdaBoostClassifier`, `HistGradientBoostingClassifier` («Gradient Boosting»), `XGBClassifier`, `LGBMClassifier` | `LinearRegression`, `Ridge`, `Lasso`, `ElasticNet`, `SVR(rbf)`, `KNeighborsRegressor`, `DecisionTreeRegressor`, `RandomForestRegressor`, `HistGradientBoostingRegressor`, `XGBRegressor`, `LGBMRegressor` | SVC, SVR y kNN se entrenan con las ≤ 12 000 filas más recientes (complejidad cuadrática); se declara. Hiperparámetros modestos y fijos; semilla 2026. |
| DL (PyTorch, CPU) | MLP (últimas 20 sesiones aplanadas), RNN, LSTM, GRU, BiLSTM (oculta 32), CNN 1D (2 capas conv, k = 5), Transformer (d_model = 32, 4 cabezas, 2 capas) sobre ventanas de **60 sesiones** | Las mismas arquitecturas con salida de 30 valores | Adam (lr = 1e-3), lote 256, ≤ 15 épocas con *early stopping* (paciencia 3) en una validación temporal con embargo; `torch.manual_seed(2026)`; `torch.set_num_threads(4)` |

- **Salidas de `05` y `06`:** se calculan **exactamente** con las invariantes I-02 e I-03 (consenso, confianza, mediana, p10–p90, retorno y cono con `σ_d` de las últimas 252 sesiones reales).
- `fechas_pronostico`: las 30 próximas sesiones de NYSE según `exchange_calendars` (XNYS).

### 6. Optimizador (`07`)

- **Retornos esperados μ (anuales):** combinación declarada y ajustable: `μ = 0,5·μ_modelo + 0,5·μ_CAPM`, con `μ_modelo = (1 + r30)^(252/30) − 1` (de la mediana del ensamble, recortado a [−50 %, +80 %]) y `μ_CAPM = 4 % + β·5 %` (prima de mercado supuesta). Sin esta mezcla, las proyecciones a 30 días anualizadas producen carteras extremas.
- **Covarianza:** Ledoit-Wolf sobre los retornos diarios de las últimas 252 sesiones, × 252.
- **Elegibles:** consenso SUBE **y** retorno proyectado > 0; si hay menos de 4, se completa según la sección 5.4.
- **Markowitz (cvxpy):** 35 puntos, de la cartera de mínima varianza a la de máximo retorno factible; `min wᵀΣw` sujeto a `Σw = 1`, `0 ≤ w ≤ 0,25` y `μᵀw ≥ objetivo`. Versiones «universo completo» y «elegibles».
- **NSGA-II (pymoo `NSGA2`):** pesos en [0; 0,25] con **reparación** por proyección al símplex con tope; objetivos (−retorno, volatilidad); población 100, 200 generaciones, semilla 2026; del frente final se toman 40 puntos repartidos por volatilidad.
- **NSGA-III (pymoo `NSGA3`):** direcciones de referencia Das-Dennis (3 objetivos, 12 particiones → 91); objetivos (−retorno, volatilidad, CVaR 95 % diario histórico); 200 generaciones; 60 puntos.
- La `nota` del Modo real dice la verdad: «NSGA-II y NSGA-III ejecutados con pymoo (semilla 2026)…». La explicación de por qué los frentes quedan **ligeramente por debajo** de Markowitz se apoya en los datos: son heurísticas con generaciones finitas frente a un óptimo exacto de programación cuadrática. Se puede medir la distancia media al frente exacto y mostrarla.

### 7. Portafolios (`08`)

Del frente NSGA-II: **Conservador** = menor volatilidad; **Moderado** = máximo Sharpe; **Agresivo** = mayor retorno. Con el mismo formato que el profesor: `origen "NSGA-II N2-xx"`, `razon` con votos y proyección y `detalle_activos` con pesos ≥ 1 %.

### 8. Backtesting (`09`) — mismo método que el profesor

Walk-forward mensual (cada 21 sesiones) sobre las últimas **252 sesiones** hasta el corte; ventana de estimación de **126**; filtro de **momentum a 63** (entran los activos con retorno a 63 sesiones > 0; si quedan menos de 4, los 4 de mejor momentum); **comisión de 5 pb** sobre el turnover; sin mirar el futuro. Perfiles: Conservador = mínima varianza (tope 25 %), Moderado = máximo Sharpe (tope 25 %), Agresivo = máximo retorno con **tope 35 %** (replica al profesor; ver I-06). Referencias: SPY, QQQ y EPU (comprar y mantener) y 1/N con rebalanceo mensual. Las métricas siguen la sección 5.3. **El resultado se publica tal como salga.**

> Semana 15 (opcional): un segundo backtesting que use las predicciones de los cortes mensuales (señales de los modelos), para medir si los modelos aportan algo frente al momentum.

## 6.4 Presupuesto de tiempo y modos de ejecución

| Modo | Cuándo | Qué hace | Objetivo de duración |
|---|---|---|---|
| `diario` | cron de lunes a viernes, 22:15 UTC | Descarga + reentrena los 22 modelos ML + **inferencia** DL con pesos en caché (`actions/cache`, clave por semana ISO) + 07, 08 y 09 | ≤ 40 min |
| `cortes` | domingo 06:00 UTC y manual | 12 cortes de fin de mes con los 36 modelos (DL con menos épocas si hace falta) | ≤ 3 h |
| `completo` | manual / primera vez | Todo, incluido el reentrenamiento DL | ≤ 1 h |

Si `diario` no tiene pesos DL en caché, entrena los 7 DL con épocas reducidas y lo registra en `meta`.

## 6.5 Workflow de GitHub Actions (`.github/workflows/actualizar-datos.yml`)

```yaml
name: Actualizar datos reales
on:
  schedule:
    - cron: "15 22 * * 1-5"   # diario, tras el cierre de NYSE (17:15 Lima)
    - cron: "0 6 * * 0"       # domingo: cortes históricos
  workflow_dispatch:
    inputs:
      modo: { type: choice, options: [diario, cortes, completo], default: completo }
permissions:
  contents: write
concurrency: { group: datos-reales, cancel-in-progress: false }
jobs:
  actualizar:
    runs-on: ubuntu-latest
    timeout-minutes: 240
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12", cache: pip }
      - name: Instalar dependencias
        run: |
          pip install torch --index-url https://download.pytorch.org/whl/cpu
          pip install -r pipeline/requirements.txt
      - uses: actions/cache@v4
        with:
          path: pipeline/.cache
          key: pipeline-${{ runner.os }}-${{ github.run_id }}
          restore-keys: pipeline-${{ runner.os }}-
      - name: Ejecutar pipeline
        run: |
          MODO="${{ github.event.inputs.modo }}"
          if [ -z "$MODO" ]; then
            if [ "${{ github.event.schedule }}" = "0 6 * * 0" ]; then MODO=cortes; else MODO=diario; fi
          fi
          python -m pipeline.ejecutar --salida data_real --modo "$MODO"
      - name: Validar contrato
        run: python tools/validar_contrato.py data_real --modo real
      - name: Publicar
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add data_real
          git diff --cached --quiet || git commit -m "datos: actualizacion $(date -u +%F) [skip ci]"
          git push
```

- **Si falla la validación, no se publica nada** y quedan los datos del día anterior; la interfaz muestra la antigüedad en el aviso.
- El bot **solo** escribe en `data_real/**`.
- GitHub desactiva los cron de repos públicos tras 60 días sin actividad: no afecta al curso, pero conviene saberlo para la Semana 15.

---

# 7. Algoritmos en el navegador (Modo real, rango personalizado) — responsable: CC

Solo se usan cuando el usuario elige un **rango personalizado** en el Optimizador o en el Backtesting del **Modo real** (D-03). En el Modo profesor están **desactivados** (R-OPT-08); el control aparece deshabilitado con la explicación «En el modo profesor las fronteras se leen del JSON».

## 7.1 Biblioteca pura (`js/lib/`, sin DOM, testeable en Node)

| Archivo | Contenido |
|---|---|
| `prng.js` | PRNG con semilla (mulberry32, semilla 2026) para resultados reproducibles |
| `estadistica.js` | Retornos logarítmicos, medias, covarianza muestral y **Ledoit-Wolf**, percentiles, CVaR 95 %, drawdown y las métricas de la sección 5.3 |
| `simplex.js` | **Proyección euclidiana al conjunto `{0 ≤ wᵢ ≤ c, Σw = 1}`** por bisección sobre τ: `wᵢ = clip(vᵢ − τ, 0, c)`. Es la pieza que usan Markowitz y la reparación de NSGA. Requiere `n·c ≥ 1`. |
| `markowitz.js` | Frontera de **35 puntos**: para una malla logarítmica de aversión al riesgo λ, `max μᵀw − (λ/2)·wᵀΣw` por **gradiente proyectado** (paso 1/L, con L = λ·autovalor máximo de Σ; convexo, converge). Se completa con los extremos de mínima varianza y máximo retorno. |
| `nsga2.js` | NSGA-II (Deb et al., 2002): ordenamiento rápido no dominado, distancia de *crowding*, torneo binario, cruce SBX (η = 15), mutación polinómica (η = 20) y reparación por `simplex.js`. Población 100, 150 generaciones. 2 objetivos. |
| `nsga3.js` | NSGA-III (Deb y Jain, 2014): puntos de referencia Das-Dennis (3 objetivos, p = 12 → 91), normalización (punto ideal, puntos extremos por ASF, interceptos), asociación a la referencia más cercana y *niching*. Población 92, 150 generaciones. Objetivos: −retorno, volatilidad y CVaR 95 %. |
| `backtest.js` | Walk-forward del profesor (sección 6.3, etapa 8), parametrizable. |

## 7.2 Workers

- `js/workers/optimizador.worker.js` y `js/workers/backtest.worker.js` importan `js/lib/*` con `importScripts` o como Worker de módulo.
- **Protocolo de mensajes:**
  - Entrada: `{tipo:"calcular", params}`.
  - Salida: `{tipo:"progreso", pct}`, `{tipo:"resultado", datos}` (mismo esquema que `07` y `09`) y `{tipo:"error", mensaje}`.
  - Cancelación: `worker.terminate()`.
- La interfaz muestra una barra de progreso con `role="progressbar"`, un botón **Cancelar** y la etiqueta «Recalculado en tu navegador con datos del {desde} al {hasta}»; el resultado se puede comparar con el del pipeline.
- **Rendimiento objetivo:** ≤ 3 s en una laptop y ≤ 8 s en un celular de gama media para 26 activos. Si se excede, se bajan las generaciones y se avisa.

## 7.3 Pruebas de los algoritmos

- `tests/unit/`: la proyección al símplex cumple la suma y los límites; Markowitz coincide con cvxpy: CX exporta `tests/fixtures/opt_referencia.json` y la volatilidad, al mismo retorno, difiere menos de 0,3 pp; NSGA-II no domina a Markowitz más allá de la tolerancia numérica; el backtest JS reproduce el de Python (±0,1 pp en el retorno total).
- Las invariantes I-04 e I-06 se aplican también a los resultados de los Workers.

---

# 8. Diseño de interfaz y especificación de los 9 módulos

## 8.1 Sistema visual (lo comparten los mockups de Figma Make y el sitio)

**Paleta base** (la del profesor, ya en `css/styles.css`). Todas las parejas de texto deben pasar 4,5:1.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#f6f8fb` | `#0e141b` | Fondo |
| `--panel` | `#ffffff` | `#17202b` | Tarjetas y tablas |
| `--fg` | `#14202e` | `#e9eff5` | Texto |
| `--mut` | `#4d5b6b` | `#aab7c4` | Texto secundario (verificar 4,5:1 sobre `--panel` y `--hl`) |
| `--bd` | `#d3dce6` | `#2c3a49` | Bordes |
| `--ac` | `#0b4f9c` | `#7db7ff` | Acción, foco, enlaces |
| `--up` | `#0a7d3c` | `#52d18a` | SUBE / positivo (siempre con ▲ y palabra) |
| `--dn` | `#b3261e` | `#ff8a80` | BAJA / negativo (siempre con ▼ y palabra) |
| `--warn` | `#8a5a00` | `#ffcc66` | Avisos |
| `--hl` | `#e8f1fb` | `#1e2c3d` | Resaltado, encabezados de tabla |

- **Mapa de calor:** fondos en 3 intensidades según `|p − 0,5|` (0–0,04, 0,04–0,08, ≥ 0,08, igual que la confianza). En tema claro: SUBE `#e3f4e8`/`#c4e8cf`/`#9fd8b0` con texto `#0a3d1f`; BAJA `#fbe5e3`/`#f5c9c5`/`#eea69f` con texto `#5c1410`. En oscuro, los equivalentes oscuros con texto claro. **Siempre** «▲ SUBE 0,62» o «▼ BAJA 0,41» dentro de la celda.
- **Series de gráficos:** paleta apta para daltonismo (Okabe-Ito): `#0072B2`, `#E69F00`, `#009E73`, `#CC79A7`, `#56B4E9`, `#D55E00` (más `#000`/`#fff` según tema). Cada serie se distingue **también** por tipo de línea (continua, discontinua, punteada), marcador y **etiqueta directa** al final de la línea. ECharts: `aria: { enabled: true, decal: { show: <preferencia> } }`.
- **Tipografía:** `system-ui, "Segoe UI", Roboto, Arial, sans-serif`; escala 14/16/18/22/28 px; altura de línea 1,55. Opción de fuente legible: Atkinson Hyperlegible (local, OFL).
- **Espaciado:** 4/8/12/16/24/32 px. **Bordes redondeados:** 8 px en controles y 12 px en tarjetas (los de la base). **Objetivos táctiles** ≥ 44 × 44 px en móvil y ≥ 24 × 24 px siempre (WCAG 2.5.8).
- **Foco:** contorno de 3 px `--ac` con separación de 2 px (ya en la base), nunca suprimido.
- **Puntos de quiebre:** 390, 640, 900 y 1280 px.
- **Componentes comunes** (en `common.js` + `styles.css`): barra superior, menú de módulos móvil, control de modo, selector de idioma, botón de tema, botón de accesibilidad, **ficha IA**, aviso por modo, tarjeta KPI, tabla accesible ordenable, chip de señal (▲/▼), chip de confianza, control segmentado, casillas de modelos, selector de rango de fechas (preajustes + dos `input type="date"`), selector de fecha de corte, contenedor de gráfico con pestañas «Gráfico | Tabla | Resumen» y botón «Escuchar», diálogo modal accesible, notificación (`role="status"`) y barra de progreso.

## 8.2 La «ficha IA» (patrón de Amershi en cada módulo de predicción)

Arriba de Clasificación, Regresión, Optimizador, Portafolios y Backtesting, una tarjeta compacta y desplegable:

| Fila | Pauta | Contenido |
|---|---|---|
| **Qué hace** | G1 | Una frase: «Estima si cada activo subirá o bajará en 30 sesiones con 18 modelos». |
| **Qué tan bien lo hace** | G2 | Números reales del JSON, por ejemplo «Exactitud de 52 % a 57 % · AUC de 0,54 a 0,62 · apenas mejor que lanzar una moneda». Nunca escondido. |
| **Por qué dice lo que dice** | G11 | Enlace a la explicación (votos, proyección o razón por activo). |
| **Qué controlas** | G17 | Filtros de universo, modelos visibles, nivel de riesgo, fecha de corte y rango. |
| **Cómo ignorarlo** | G10 | «Puedes ocultar modelos, excluir activos o no usar la recomendación». |

## 8.3 Especificación por módulo

> Para cada módulo: datos, componentes, interacciones, accesibilidad, modo real, enlaces y verificación. Los textos exactos del aviso del Modo profesor se respetan (R-*-aviso).

### M1 · Dashboard (`index.html`) — R-HER-01

- **Datos:** 10, 03, 02 (real: `precios/<T>.json`).
- **Componentes:** KPI de SPY, QQQ y EPU (precio, variación diaria con signo, ▲/▼ y palabra); gráfico de velas del activo elegido; preajustes de rango (1M, 3M, 6M, 1A, 5A, Máx) más fechas desde/hasta; tabla del universo (26) con filtro por grupo, orden por columna, estrella ★ de watchlist y enlace «Ver clasificación».
- **Interacción:** cambiar de activo o de rango redibuja **sin recargar**. El zoom por arrastre de ECharts tiene alternativa con botones y fechas (WCAG 2.5.7). En el Modo profesor, más de 120 sesiones se muestran como línea de cierres (02) con una nota.
- **Accesibilidad:** pestañas Gráfico/Tabla/Resumen; resumen como «AAPL: 355,63 US$, +1,39 % hoy; en 120 sesiones subió 4,2 %…»; sonificación del precio.

### M2 · Watchlist y alertas (`watchlist.html`) — R-HER-02

- **Componentes:** combobox con búsqueda para agregar; tabla con último precio, variación, minigráfico (con texto alternativo), alertas y botón Quitar (`aria-label="Quitar NVDA"`); **gestor de alertas**: crear, editar, activar/desactivar y borrar (guardado en `eia_alertas`; las del JSON son las iniciales).
- **Alerta disparada:** insignia «⚠ DISPARADA» con icono + texto + borde, fila resaltada y anuncio `aria-live` al cargar («2 alertas disparadas: NVDA sobre 182,42; …»). Nunca solo color.
- **Enlaces:** a Regresión y a Clasificación de cada activo.

### M3 · Trading simulado (`trading.html`) — R-HER-03

- **Formulario:** `label` en todo; vista previa («Costo estimado: 1 778,28 US$ · efectivo restante: 23 221,72 US$»); errores **en línea** debajo del campo con `aria-describedby`, `aria-invalid="true"` y foco al primer error; mensaje global en `role="alert"`.
- **Tarjeta «Portafolio aplicado»** si existe `eia_elegido`; historial de órdenes (`eia_ordenes`); «Reiniciar demo» con diálogo de confirmación.
- **Modo real:** usa `eia_port_real` y los últimos precios reales; el aviso dice que las órdenes son simuladas.

### M4 · Leaderboard (`leaderboard.html`) — R-HER-04

- Tabla con `caption`; la fila del usuario lleva «Usted (su portafolio de Trading)», icono, negrita, fondo `--hl` y `aria-current="true"`.
- Retorno calculado desde el portafolio de Trading del modo activo. Nota visible: «Liga ficticia de ejemplo».

### M5 · Clasificación (`clasificacion.html`) — R-CLA-01…07

- **Ficha IA:** exactitud mínima y máxima, AUC y **tasa base** («un modelo que siempre dijera SUBE acertaría X %»). En el Modo profesor la tasa base se deriva de la matriz de confusión (`(VP+FN)/n_prueba`) y se declara como campo derivado.
- **Filtros (G17):** grupo, familia (Todos/ML/DL), «Solo mi watchlist», casillas para mostrar u ocultar cada modelo (G10, en `eia_modelos_ocultos`).
- **Mapa de calor:** `<table>` con `<th scope="col">` por modelo (con abreviatura y nombre completo en `abbr`/`aria-label`) y `<th scope="row">` por activo. Celdas con fondo + «▲ SUBE 0,62» y etiqueta accesible «NVDA, XGBoost: SUBE, probabilidad 62 %». Primera columna fija. En **< 640 px** se muestra una **vista por activo** (lista de tarjetas desplegables) en lugar de la matriz; la matriz sigue disponible dentro de una región con desplazamiento propio, `tabindex="0"` y `role="region"`, sin desbordar la página. **468 celdas** con todos los modelos visibles.
- **Consenso del activo seleccionado:** barra de votos con texto («12 ▲ SUBE · 6 ▼ BAJA»), probabilidad media, insignia de confianza (alta/media/baja con icono y texto) y explicación en lenguaje llano (G11). Botones «Ver su regresión →» y «Ver en el optimizador →».
- **Métricas por modelo:** tabla ordenable (encabezados `<button>` con `aria-sort`) con exactitud, precisión, recall, F1 y AUC; al elegir un modelo, su **matriz de confusión** como tabla 2 × 2 con encabezados y frase («De los 174 días en que dijo SUBE, acertó 102»).
- **Honestidad (R-CLA-04):** bloque «¿Qué significa 55 %?»: «si lanzas una moneda 100 veces, aciertas unas 50; estos modelos aciertan entre 52 y 57. Sirven como una pista débil, no como una certeza».
- **Prohibido** cualquier tercera clase (R-CLA-06).
- **Modo real:** selector de fecha de corte; las métricas son fuera de muestra con `n_prueba` real.

### M6 · Regresión 30 días (`regresion.html`) — R-REG-01…09

- **Controles:** activo (combobox; respeta `?t=`), familia (Todos/ML/DL), casillas de los 18 modelos, interruptores «Banda p10–p90» (**activada por defecto**) y «Cono de volatilidad» (**disponible siempre**, activado por defecto), ventana de historia (60/120/252; personalizada en el Modo real).
- **Gráfico:** historia (línea), una línea fina y tenue por modelo, **mediana gruesa** con marcadores y etiqueta directa, área p10–p90, cono con líneas discontinuas y línea vertical «Corte: 11-nov-2026».
- **Chip de retorno:** «+2,93 % ▲ en 30 sesiones» (o «−0,37 % ▼»), con color, símbolo y texto.
- **Lenguaje llano:** «La mediana de 18 modelos proyecta 354,32 US$ el 24-dic-2026. Por volatilidad, el 80 % de los escenarios cae entre X y Y. Una línea sin banda comunicaría una certeza que no existe».
- **Métricas:** tabla ordenable (MAPE, MAE, RMSE, R² y mejora frente a la persistencia) con definiciones en lenguaje llano.
- **Tabla alternativa (R-REG-06):** 30 filas con fecha, mediana, p10, p90 y cono inferior y superior.
- **Enlaces:** ← Clasificación del activo; → «Ver en el optimizador».

### M7 · Optimizador (`optimizador.html`) — R-OPT-01…09

- **Gráfico riesgo–retorno:** Markowitz (línea; universo completo y elegibles), NSGA-II (círculos), NSGA-III (triángulos con escala de color por CVaR, cuyo valor también aparece en la información emergente y en la tabla, porque el color no puede ser el único canal).
- **Interruptores** por serie y «Universo completo / Solo elegibles».
- **Selección por teclado (R-OPT-03 y R-OPT-07):** el contenedor del gráfico es enfocable; ←/→ recorren los puntos de la serie activa, ↑/↓ cambian de serie y Enter selecciona; cada paso se anuncia («NSGA-II N2-12: retorno 10,2 %, volatilidad 12,9 %, Sharpe 0,48»). También hay una **tabla de puntos** con botón «Seleccionar» por fila.
- **Panel de composición:** barras horizontales de pesos ordenadas, métricas (retorno, volatilidad, Sharpe, CVaR), comprobación visible «Suma de pesos 100,0 % · peso máximo 25,0 %» y botón «Llevar a Trading».
- **Elegibles:** lista con el criterio y la razón por activo. Con `?t=NVDA`, mensaje del tipo «NVDA es elegible: 17/18 SUBE y +5,35 %» o «no es elegible porque su consenso es BAJA».
- **Explicación (R-OPT-04):** qué optimiza cada método y por qué NSGA queda algo por debajo de Markowitz.
- **Aviso permanente (R-OPT-06).**
- **Modo real:** selector de ventana de estimación + «Recalcular en mi navegador» (Worker, progreso, cancelar) + selector de corte.

### M8 · Portafolios (`portafolios.html`) — R-POR-01…04

- **Tres tarjetas lado a lado** (apiladas en móvil): nombre, descripción, origen, métricas con ayuda en lenguaje llano («en el 5 % de los peores días perderías en promedio 1,66 %»), dona de pesos (con decal y etiquetas) y tabla de leyenda.
- «Elegir este nivel» (control con `aria-pressed`, G17) → guarda `eia_elegido`.
- **Tabla de razones** del nivel elegido (ticker, grupo, peso, razón) con casilla «Excluir» (G10) y vista previa de los pesos renormalizados. Nota sobre los pesos < 1 % (I-05).
- **«Llevar a Trading»:** diálogo descrito en la sección 4.5.
- Versión de **390 px** cuidada: la guía pide esta pantalla en móvil en Figma.

### M9 · Backtesting (`backtesting.html`) — R-BT-01…07

- **Curvas de capital** base 100 (3 carteras con línea continua, discontinua y de puntos y raya; referencias punteadas y más finas; leyenda con interruptores) y **drawdown** sincronizado.
- **Tabla de métricas** ordenable: 7 métricas × 7 series.
- **Línea de tiempo de rebalanceos:** 12 fechas como botones; al elegir una, tabla y barras apiladas de pesos y turnover.
- **Interpretación (R-BT-04):** texto **generado por reglas** a partir de los números, con plantillas i18n; nada fijo. Por cartera:
  - ¿superó a SPY? (retorno total y Sharpe);
  - riesgo (volatilidad y máximo drawdown);
  - consistencia (meses positivos);
  - posibles causas formuladas como hipótesis: poca persistencia en los datos (el momentum no se sostiene), costo del rebalanceo (turnover medio > 1 → comisiones), concentración por el tope, o el mercado que más subió no fue elegido.

  Cierra con «El desempeño pasado no garantiza resultados futuros» y, en el Modo profesor, «sobre historia sintética».
- **Modo real:** selector de periodo + recálculo en un Worker.

---

# 9. Suite de accesibilidad (D-07)

## 9.1 Centro de accesibilidad

Botón «Accesibilidad» en la barra superior (atajo `Alt+Shift+A`). Abre un diálogo modal accesible (foco atrapado, Esc cierra y devuelve el foco). Todo se guarda en `eia_a11y`.

| Sección | Opciones |
|---|---|
| **Visual (f)** | Tamaño de texto 100–200 %; alto contraste (paleta con ≥ 7:1); reducir movimiento (también respeta `prefers-reduced-motion`); fuente legible; espaciado de texto (WCAG 1.4.12); cursor grande; subrayar enlaces; mostrar decal en gráficos |
| **Lectura (a)** | Leer resumen de la página; velocidad y voz; sonificación activada; anunciar cambios |
| **Control** | Barrido con un interruptor (e); cabeza/mirada (c); manos (d); comandos de voz (b, última fase) |
| **Ayuda** | Atajos de teclado, guía rápida por modalidad y privacidad de la cámara |

**Atajos:** solo con modificadores (`Alt+Shift+letra`) y desactivables, para no chocar con lectores de pantalla (WCAG 2.1.4). `Alt+Shift+H` muestra la ayuda.

## 9.2 (a) Lector de pantalla, resúmenes y sonificación

- **Base WCAG 2.2 AA en todo:** landmarks (`header`, `nav`, `main`, `footer`), un solo `h1` por página, jerarquía de títulos, tablas con `caption` y `scope`, formularios con `label`, nombres accesibles que contienen el texto visible (2.5.3), regiones vivas para cambios asíncronos y `lang` correcto al cambiar de idioma.
- **Resumen automático** de cada gráfico (`js/a11y/resumen.js`), generado desde los datos con plantillas i18n: tendencia, máximo, mínimo, último valor y variación. Visible en la pestaña «Resumen» y leíble con `speechSynthesis` (botón «Leer»).
- **Sonificación** (`js/a11y/sonificacion.js`, Web Audio):
  - Botón «Escuchar»: recorre la serie en 3–6 s; el valor se convierte en tono (220–880 Hz en escala logarítmica) y el tiempo en paneo de izquierda a derecha.
  - En la regresión, la mediana suena como tono continuo y la banda como un ruido suave cuyo volumen sigue su anchura.
  - En el mapa de calor, un tono ascendente para SUBE y uno descendente para BAJA por fila.
  - **Exploración punto a punto:** con el foco en el gráfico, ←/→ mueve un cursor, suena el tono y se anuncia «12 nov 2026: 355,63 US$»; Inicio/Fin van a los extremos y `S` reproduce todo.
- Pruebas manuales con **NVDA + Chrome/Firefox** y **Narrador + Edge** en Windows, y **TalkBack** en Android (Anexo A).

## 9.3 Arquitectura común de entrada

Todas las modalidades alternativas emiten **comandos semánticos** a `bus-entrada.js`, de modo que ninguna reimplementa clics ni navegación:

```text
MOVER_PUNTERO(x, y) · ACTIVAR · SIGUIENTE · ANTERIOR · DESPLAZAR(dy) · VOLVER · PAUSAR/REANUDAR
· IR_A_MODULO(id) · SIGUIENTE_MODULO · MODULO_ANTERIOR · AYUDA
```

- `puntero.js` convierte `MOVER_PUNTERO` y `ACTIVAR` en acciones sobre el DOM:
  - **Puntero virtual:** un anillo grande y visible, que no es el cursor del sistema.
  - **Permanencia (dwell):** clic tras 900 ms de quietud, ajustable de 500 a 2000 ms, con anillo de progreso.
  - **Imán:** atrae el puntero al elemento interactivo más cercano dentro de 80 px (configurable).
  - **Objetivos agrandados:** clase `body.modo-puntero`, que sube los objetivos a ≥ 48 px.
  - **Zonas de desplazamiento** arriba y abajo.
  - Sonido y destello al hacer clic.
- **Problema conocido:** un `<select>` nativo no se puede abrir de forma programática. En modo puntero, los `select` se reemplazan por un **listbox accesible propio** (o se muestran como grupo de botones si tienen pocas opciones).
- Solo **una** modalidad de cámara a la vez (cabeza/mirada **o** manos), para no saturar la CPU.

## 9.4 (e) Barrido con un solo interruptor

- Recorre **grupos** (navegación, controles del módulo, contenido principal, gráfico, tablas, pie) y luego los **elementos** del grupo, con resaltado grueso y rótulo («Grupo 2 de 6: Filtros»).
- Intervalo de 1,2 s (ajustable de 0,5 a 3 s).
- El interruptor puede ser `Espacio`/`Enter` (configurable), un **parpadeo largo**, una **boca abierta** o un **pellizco**: cualquier fuente que emita `ACTIVAR`.
- Cada grupo incluye la opción «Salir del grupo». Funciona con o sin lector de pantalla.

## 9.5 (c) Puntero con la cabeza o la mirada (MediaPipe Face Landmarker)

- **Carga diferida:**
  - Bundle: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs`.
  - WASM: `…@1.2.3/wasm`.
  - Modelo copiado en el repo: `assets/mediapipe/face_landmarker.task`, descargado por `tools/descargar_modelos.*` desde `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`.
- **Opciones:** `runningMode: "VIDEO"`, `numFaces: 1`, `outputFaceBlendshapes: true`, `outputFacialTransformationMatrixes: true`; GPU con respaldo en CPU.
- **Consentimiento:** diálogo previo («La cámara se procesa solo en tu navegador; no se envía ni se guarda ninguna imagen»), indicador permanente «Cámara activa», botón **Detener** siempre visible y `Esc` para detener. Se pausa si la pestaña se oculta.
- **Puntero principal = orientación de la cabeza** (yaw/pitch de la matriz de transformación), mapeada a la pantalla con una **calibración de 5 puntos** (centro y 4 esquinas, ajuste lineal por mínimos cuadrados) y suavizada con un **filtro One Euro** (minCutoff ≈ 1,0; beta ≈ 0,007).
- **Ajuste fino opcional con la mirada:** desplazamiento del iris (landmarks 468–477) respecto de las comisuras de los ojos (33/133 y 362/263).
- **Honestidad técnica:** con una webcam, la mirada sola es imprecisa. Por eso se combina con la cabeza, el imán, los objetivos grandes y la permanencia.
- **Clic** (a elección del usuario): permanencia; **parpadeo largo** (`eyeBlinkLeft` y `eyeBlinkRight` > 0,5 durante ≥ 400 ms, ignorando parpadeos naturales < 250 ms); o **boca abierta** (`jawOpen` > 0,5 durante ≥ 300 ms).
- **HUD:** miniatura de la cámara (ocultable), estado del seguimiento, FPS y botones Recalibrar y Pausa.
- **Pruebas:** con un video falso de Chrome (`--use-fake-device-for-media-stream --use-file-for-fake-video-capture=<archivo.y4m>`) y con un **reproductor de landmarks grabados** (JSON) que alimenta el bus sin cámara.

## 9.6 (d) Gestos de mano (MediaPipe Hand Landmarker)

- **Modelo:** `assets/mediapipe/hand_landmarker.task` (de `…/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`), con `numHands: 1` y modo `VIDEO`.
- **Puntero:** la punta del índice (landmark 8), mapeada desde una «caja activa» central de la imagen espejada a la pantalla, con filtro One Euro.
- **Gestos** (heurísticas propias, con histéresis):

| Gesto | Comando |
|---|---|
| **Pellizco** (distancia pulgar–índice, landmarks 4–8, / tamaño de la palma < 0,35) | `ACTIVAR` (clic) |
| Pellizco sostenido + mover | Desplazar |
| **Palma abierta** sostenida 1 s | `PAUSAR/REANUDAR` |
| **Deslizar** la mano a izquierda o derecha (velocidad de la muñeca) | Módulo anterior / siguiente |
| Dos dedos (índice y medio) arriba + mover vertical | `DESPLAZAR` |
| Pulgar arriba sostenido (opcional) | Confirmar diálogo |

- Una tarjeta de ayuda con ilustraciones simples (SVG propios) explica los gestos.

## 9.7 (b) Comandos de voz — última fase

- **Tecnología:** Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`), `lang` = idioma activo, botón para hablar y modo continuo opcional.
- **Avisos al usuario:** en Chrome el audio se procesa en servidores de Google. En Firefox no está disponible: se oculta la opción con una explicación.
- **Gramática:**
  - «ir a clasificación» / «go to classification»;
  - «siguiente» / «anterior»;
  - «activo NVDA» / «Apple»;
  - «tema oscuro»;
  - «modo real» / «modo profesor»;
  - «solo ML»;
  - «leer resumen»;
  - «escuchar gráfico»;
  - «llevar a trading»;
  - «clic en {texto visible}», que coincide con los nombres accesibles (2.5.3);
  - «ayuda».
- **Confirmación** hablada y visual de cada comando.

## 9.8 Criterios de aceptación de la accesibilidad

- `axe-core` sin violaciones *serious* o *critical* en las 9 páginas × 2 temas × 2 modos.
- Recorrido completo con teclado (Tab, Shift+Tab, Enter, Espacio, flechas en componentes) sin trampas.
- Cada modalidad de la cámara permite: cambiar de módulo, seleccionar un activo, abrir y cerrar un diálogo y ejecutar «Llevar a Trading».
- Cada gráfico tiene tabla + resumen + sonificación.

---

# 10. Internacionalización ES-PE / EN-US (bono R-I18N-01)

- Selector en la barra de navegación (`<select>` con `label`, o botones con `aria-pressed`). Guarda `eia_lang` y actualiza `<html lang>`.
- **Diccionarios** `i18n/es-PE.json` y `i18n/en-US.json` con claves jerárquicas (`clasificacion.ficha.que_hace`) y **plantillas con parámetros con nombre** (`"Votos: {sube} ▲ SUBE · {baja} ▼ BAJA"`). Prohibido concatenar cadenas visibles. Plurales con `Intl.PluralRules`.
- **Formatos con `Intl`** según el locale activo:
  - `Intl.NumberFormat` (números, %, US$ con `style: "currency", currency: "USD"`);
  - `Intl.DateTimeFormat`;
  - `Intl.RelativeTimeFormat` («actualizado hace 2 h»).

  Medido en Node 22: `es-PE` produce `1,234,567.89`, `USD 355.63` y «11 de noviembre de 2026»; `en-US` produce `$355.63` y «November 11, 2026». **Se usa la salida de `Intl` aunque el ejemplo de la guía («+2,93 %») use coma decimal**; se explica en el informe.
- **Datos sin traducir:** los nombres de grupos, sectores y modelos vienen del JSON en español sin tildes. La interfaz los muestra con un **mapa de presentación** (por ejemplo `"Arbol de decision"` → «Árbol de decisión» / «Decision tree»). Los datos no se tocan.
- Las etiquetas SUBE/BAJA se traducen a «UP/DOWN» en EN-US, **siempre** con ▲/▼. Los valores internos siguen siendo `SUBE`/`BAJA`.
- Los textos generados (interpretación del backtesting, resúmenes) usan plantillas en ambos idiomas.

---

# 11. Calidad: pruebas, auditoría y verificaciones del profesor

## 11.1 Capas de prueba

| Capa | Dónde | Responsable | Qué comprueba |
|---|---|---|---|
| Contrato de datos | `tools/validar_contrato.py` + `tests/datos/` | CX | I-01…I-08 en `data/` y `data_real/`; **SHA-256 de `data/`** idéntico al del profesor (Anexo B.3) |
| Unitarias JS | `tests/unit/` (Node, sin navegador) | CC | `js/lib/*`: símplex, Markowitz, NSGA-II/III, backtest, métricas, i18n y formatos |
| E2E | `tests/e2e/` (Playwright 1.65) | CX | 9 páginas × {1280, 390} × {claro, oscuro} × {profesor, real}: consola sin errores, sin desborde, elementos clave, navegación cruzada, estado compartido, cambio de modo, idioma y tema (también de los gráficos) |
| Accesibilidad automática | `tests/a11y/` (`@axe-core/playwright` 4.14, reglas WCAG 2.2 AA) | CX | 0 violaciones *serious*/*critical*; recorrido con teclado; foco visible; `scope`, `label`, `alt` |
| Verificaciones de la guía | `tests/datos/profesor.spec.*` | CX | 468 celdas (R-CLA-01); mediana vs retorno ±0,01 (R-REG-09); pesos 1 ± 0,02 y ≤ tope (R-OPT-09); curva final vs retorno total ±0,05 pp (R-BT-06); ninguna tercera clase (R-CLA-06); aviso por módulo (R-INT-08) |
| Cámara | `tests/e2e/camara.spec.*` | CC y CX | Video falso de Chrome y reproductor de landmarks: el puntero se mueve, el clic por permanencia funciona y Detener libera la cámara |
| Auditoría P08 | `docs/informe/auditoria_P08.md` | **CX** (no es quien construye; revisión independiente) | Tabla módulo \| hallazgo \| evidencia literal \| severidad \| corrección, más «No verificable» y «Criterios aparentemente cumplidos», con el prompt P08 literal |
| Pruebas humanas | Issues con la plantilla `hallazgo-prueba` | HUM | Anexo A |

## 11.2 CI (`.github/workflows/qa.yml`)

En cada PR a `main`: validación del contrato, pruebas unitarias, E2E y axe con Chromium (más Firefox si el tiempo lo permite) y un escaneo de secretos (`gitleaks` o `grep` de «token», «key», «password», «secret», `.env`). **Ningún PR se fusiona en rojo.**

## 11.3 Servir el sitio en local

```powershell
cd $HOME\Dev\EquipoA_ErnestoInvestingAI
python -m http.server 8000      # abrir http://127.0.0.1:8000
```

---

# 12. Figma Make (D-05, D-06) — responsable: OP

## 12.1 Hallazgos que condicionan el método

- La cuenta de Figma del coordinador (`josuemart`) es **plan Starter con asiento View**. Implicaciones:
  - Figma Make se puede usar, con **500 créditos al mes y un tope de 150 al día**.
  - **No se puede publicar** un sitio de Make (requiere un plan de pago con asiento Full).
  - Las herramientas de **lectura** del servidor MCP de Figma tienen un límite de **20 llamadas al mes**. Las de escritura (crear archivo, importar código) no cuentan.
- El servidor MCP de Figma permite **importar un proyecto local a un archivo de Make** (`send_code_to_figma`). **La primera importación no gasta créditos**; los prompts posteriores dentro de Make sí.
- **Archivo ya creado:** «EquipoA_ErnestoInvestingAI — Mockups (Figma Make)» → `https://www.figma.com/make/BWA9B3JoRbAWZiVoPSyoBO`.
- **Opcional (acción de Josué):** solicitar **Figma Education** con el correo UNMSM, que da un plan Professional gratis a estudiantes verificados. Permitiría publicar y daría más créditos. **No bloquea:** la guía pide un «enlace de solo lectura» del archivo, no un sitio publicado.

## 12.2 Procedimiento

1. **OP escribe el proyecto de mockups fuera del repo** (D-05):
   - Vite + React + TypeScript + Tailwind, con la estructura de Figma Make: `src/App.tsx`, `src/components/…`, `src/styles/globals.css`, `guidelines/Guidelines.md`.
   - Los scripts que exige la importación: `.figma/make/install`, `dev`, `deploy-preview`, `deploy` y `.figma/make/deploy.json` con `{"adapter":"static"}`.
   - Datos de muestra tomados **de los JSON del profesor** (un subconjunto), para no inventar cifras.
2. **Pantallas:**
   - Los 9 módulos, cada uno en **claro y oscuro**.
   - **Portafolios a 390 px**.
   - El control de modo (Profesor/Real) y una pantalla de ejemplo en Modo real.
   - El Centro de accesibilidad y el HUD de cámara.
   - Una «Galería de pantallas» inicial que enlaza todo.
   - **Prototipo navegable:** la barra superior conecta los 9 módulos (R-FLU-01).
3. **Subida:** el entorno de OP no alcanza `figma.com`. La subida del archivo comprimido se hace **desde la computadora de Josué**, con el puente del escritorio de Claude o con un comando que OP le entrega. Luego OP completa la importación con `send_code_to_figma`.
4. **Josué** abre el archivo, comprueba la vista previa y comparte con «Cualquiera con el enlace: puede ver» (si el plan Starter no lo permite, invita como lector al correo del profesor).
5. **Josué** usa «Download code» en Make y descomprime el ZIP **sin editar** en `figma-src/`. Commit: `chore(figma): agrega export de Figma Make sin editar`.
6. OP sube capturas a `docs/capturas/figma/` para el informe y para la pasada de conformidad visual de CC (CC **no** gasta llamadas de lectura del MCP de Figma).
7. **`PROMPTS_USADOS.md`** declara con honestidad que el prompt P01 se usó como **especificación** para escribir el código de los mockups (Claude Opus 5.5). Ese código se importó a Figma Make **sin generación de la IA de Make** (0 créditos). Si después se hace algún ajuste con prompts de Make, se copian literales.

---

# 13. Reparto del trabajo y propiedad de archivos

## 13.1 Frentes de trabajo

| Frente | Responsable | Entregable |
|---|---|---|
| F0 · Preparación del repo | Josué (con la sección 15.1) | Repo, Pages, `docs/contexto/`, `CLAUDE.md`, `AGENTS.md`, `docs/ia/` |
| F1 · Plan de implementación | CC-F (modo Plan) | `docs/plan/PLAN_IMPLEMENTACION.md` + `docs/CONTRATO_DATOS.md` |
| F2 · Núcleo del sitio | CC-F → CC-O | `js/common.js`, `css/styles.css`, i18n, modo, estado, componentes |
| F3 · Algoritmos JS | CC-F → CC-O | `js/lib/*`, `js/workers/*`, `tests/unit/*` |
| F4 · Módulos (9) | CC-F (Clasificación como referencia) → CC-O (resto) | `*.html`, `js/<modulo>.js` |
| F5 · Accesibilidad | CC-F (bus, puntero, cámara) → CC-O | `js/a11y/*` |
| F6 · Pipeline real | **CX** | `pipeline/*`, `data_real/*`, `actualizar-datos.yml`, `tools/validar_contrato.py`, fixtures |
| F7 · Pruebas E2E, a11y y datos + CI | **CX** | `tests/e2e`, `tests/a11y`, `tests/datos`, `qa.yml` |
| F8 · Auditoría P08 independiente | **CX** | `docs/informe/auditoria_P08.md` |
| F9 · Documentación e informe | **CX** | `README.md`, `PROMPTS_USADOS.md`, `docs/informe/S13_EquipoA_Informe.pdf`, `docs/guia-usuario/` |
| F10 · Figma Make | **OP** + Josué | Archivo de Make, enlace y `figma-src/` |
| F11 · Pruebas humanas | HUM | Issues (Anexo A) |
| F12 · Video (opcional) | **CX** | Video con voces y música de ElevenLabs (fuera del repo; enlace en el README) |

## 13.2 Propiedad de rutas (para que las IAs no se pisen)

| Ruta | Dueño | Regla para los demás |
|---|---|---|
| `*.html`, `css/`, `js/`, `i18n/`, `assets/` | **CC** | CX solo lee; si encuentra un error, abre un issue o manda un mensaje `REVISIÓN` (no edita) |
| `tests/unit/` | **CC** | — |
| `pipeline/`, `data_real/`, `tools/validar_contrato.py`, `.github/workflows/actualizar-datos.yml`, `tests/fixtures/` | **CX** | CC solo lee |
| `tests/e2e/`, `tests/a11y/`, `tests/datos/`, `tests/package.json`, `.github/workflows/qa.yml` | **CX** | CC puede pedir pruebas por mensaje |
| `README.md`, `PROMPTS_USADOS.md`, `docs/informe/`, `docs/guia-usuario/`, `docs/capturas/` | **CX** | CC aporta secciones técnicas por mensaje |
| `docs/plan/`, `docs/CONTRATO_DATOS.md` | **CC** | Cambios del contrato: protocolo `CAMBIO-CONTRATO` |
| `docs/ia/BITACORA.md` | Todos | **Solo agregar al final** (nunca editar lo ajeno) |
| `docs/ia/TABLERO.md` | Todos | Cada uno edita **solo sus filas** |
| `docs/ia/prompts/CC.md`, `CX.md`, `OP.md` | Cada uno el suyo | CX los compila en `PROMPTS_USADOS.md` el jueves |
| `docs/contexto/`, `CLAUDE.md`, `AGENTS.md` | Josué / OP | Los agentes proponen cambios por mensaje |
| `figma-src/` | Josué | Nadie lo edita |
| `data/` | **Nadie** | Intocable (D-13) |

---

# 14. Cronograma (hora de Lima) y orden de recorte

| Día | CC (Fable hoy → Opus desde el martes) | CX (Astra) | OP / Josué / HUM |
|---|---|---|---|
| **Lun 16** | 14:00 **modo Plan** → `PLAN_IMPLEMENTACION.md` (aprobación de Josué) → ejecutar por prioridad: **(1)** núcleo `common.js`/`styles.css` (modo, capa de datos, estado, i18n, cabecera y menú móvil, avisos, ficha IA, tabla ordenable, contenedor de gráfico); **(2)** `CONTRATO_DATOS.md`; **(3)** `js/lib` + Workers + pruebas unitarias; **(4)** bus de entrada, puntero, cámara, cabeza-mirada y manos (versión funcional); **(5)** Clasificación completa como **módulo de referencia**. Actualiza `HANDOFF.md` al terminar cada bloque | Pipeline v0: descarga, `mercado.py` (01, 02, 03, 04, 10, 11, 12, 13, precios, cierres), `validar_contrato.py` (ambos modos), workflow y primera ejecución manual; luego clasificadores ML | Josué: F0 (13:30). OP: mockups de Figma Make e importación (tarde y noche) |
| **Mar 17** | CC-O lee `HANDOFF.md` → Regresión y Optimizador (profesor), heredados ampliados (Dashboard con rango, alertas, Trading con validación y portafolio aplicado, Leaderboard), textos i18n | DL (7) + `06`, `07`, `08`, `09` reales; workflow en verde; fixtures para las pruebas JS; empieza el esqueleto de Playwright | Josué: `figma-src/`, enlace de Figma, Pages activo |
| **Mié 18** | Portafolios y Backtesting (profesor) → **integración P07 completa** (los 9 módulos) → Modo real conectado en todos → recálculo en Workers → accesibilidad (a), (e), (f) | Suite E2E + axe + `qa.yml`; primer informe de pruebas y issues; cortes históricos (job del domingo, adelantado a mano) | HUM: primera ronda de pruebas (noche) sobre Pages |
| **Jue 19** | Accesibilidad (c) y (d) completas; correcciones de QA; pasada de conformidad con Figma. **20:00 congelamiento de funciones** | **Auditoría P08**, README, `PROMPTS_USADOS.md`, borrador del informe con capturas (claro, oscuro, 390 px, ambos modos), guía de accesibilidad | HUM: ronda completa por rol |
| **Vie 20** | 08:00–12:00 correcciones; **(b) voz** solo si todo está en verde | Informe final PDF (8–12 págs.); video (opcional) | 14:00 verificación final (sección 17) · **16:00 entrega** · 18:00 límite |

**Orden de recorte** si hay retraso (se recorta de arriba hacia abajo; avisar en la bitácora):

1. (b) comandos de voz → Semana 15.
2. Video.
3. Recálculo del **backtesting** en el navegador (queda el del pipeline).
4. Cortes históricos (queda solo el último corte).
5. (d) gestos de mano → Semana 15 (se mantiene (c)).

**Nunca se recorta:** el Modo profesor completo, los avisos, WCAG 2.2 AA base, la alternativa en tabla de cada gráfico, i18n (barato, +1 punto), `figma-src/`, el informe y `PROMPTS_USADOS.md`.

---

# 15. Protocolo de comunicación entre IAs y flujo de Git

## 15.1 Preparación del repositorio (Josué, lunes 13:30, PowerShell)

```powershell
# 0) Requisitos: git, gh (con sesión iniciada), Python 3.12, Node 22.
cd $HOME\Dev
git -c core.autocrlf=false clone https://github.com/mbaernestocr-tech/ernesto-investing-ai-base-s13.git base-s13
New-Item -ItemType Directory EquipoA_ErnestoInvestingAI | Out-Null
robocopy .\base-s13 .\EquipoA_ErnestoInvestingAI /E /XD .git      # código 1 = copia correcta
cd .\EquipoA_ErnestoInvestingAI
git init -b main
git config core.autocrlf false
# 1) Descomprimir aquí el paquete de contexto (CLAUDE.md, AGENTS.md, .gitattributes, docs/contexto, docs/ia)
#    y copiar la guía del profesor a docs\contexto\GUIA_PROFESOR_S13.pdf
git add -A
git commit -m "chore: base S13 del profesor (CC BY 4.0) + contexto del plan maestro"
gh repo create JosMart04/EquipoA_ErnestoInvestingAI --public --source . --remote origin --push `
  --description "Ernesto Investing AI - Equipo A - IHC 2026-II (FISI-UNMSM)"
gh api -X POST repos/JosMart04/EquipoA_ErnestoInvestingAI/pages -f "source[branch]=main" -f "source[path]=/"
```

Comprobar que los datos del profesor quedaron idénticos: `Get-FileHash data\*.json -Algorithm SHA256` debe coincidir con el Anexo B.3.

## 15.2 Ramas y PR

- `main` = lo que publica Pages. Solo se fusiona por PR con CI en verde (excepción: el bot de datos, que escribe solo en `data_real/**`).
- Ramas: `cc/<T-id>-<descripcion>` (Claude Code) y `cx/<T-id>-<descripcion>` (Codex). Un PR por tarea o bloque coherente.
- Mensajes de commit (Conventional Commits en español) con los IDs: `feat(clasificacion): mapa de calor 26x18 con etiqueta y simbolo [R-CLA-01] [T-12]`. Las IAs agregan su coautoría (por ejemplo `Co-Authored-By: Claude …` y `Co-authored-by: Codex (GPT-6 Astra)`); sirve como evidencia de R-ETI-01.
- Antes de empezar: `git pull --rebase`; leer `docs/ia/BITACORA.md` desde su último mensaje.

## 15.3 Archivos de coordinación (`docs/ia/`)

| Archivo | Uso |
|---|---|
| `TABLERO.md` | Tareas `T-xx`: dueño, estado (pendiente / en curso / en revisión / hecho / bloqueado), rama, PR y requisitos que cubre |
| `BITACORA.md` | Mensajes entre IAs, solo agregar, en orden cronológico |
| `DECISIONES.md` | D-01…D-15 de este plan + nuevas (D-16…), con fecha y autor |
| `HANDOFF.md` | Estado para quien retome: hecho, en curso, siguiente paso exacto, trampas conocidas. **Fable lo actualiza al terminar cada bloque**, porque hoy se acaba su disponibilidad |
| `prompts/CC.md`, `CX.md`, `OP.md` | Cada IA copia aquí **literal** cada prompt que recibe de Josué (fecha, herramienta, modelo) |

## 15.4 Formato de mensaje

Cada IA, **al terminar cada bloque de trabajo**, hace dos cosas:

1. agrega el mensaje al final de `docs/ia/BITACORA.md` y lo incluye en su commit;
2. lo imprime en el chat dentro de un bloque `📨 MENSAJE PARA <CC|CX|OP|JOSUÉ>`, para que Josué lo copie y pegue a la otra IA.

```markdown
### MSG-20261116-1730 · CX → CC · ENTREGA
- **Asunto:** data_real v0 lista (01, 02, 03, 04, 10, 11, 12, 13 + precios + cierres)
- **Qué cambió:** …
- **Qué necesito de ti:** …
- **Archivos / PR:** `cx/T-31-mercado` → PR #7
- **Contrato:** sin cambios | propone C-02 (ver abajo)
- **Prioridad:** alta | media | baja · **Para cuándo:** mar 17, 10:00
```

**Tipos:** `INFO`, `PREGUNTA`, `BLOQUEO`, `ENTREGA`, `REVISIÓN`, `CAMBIO-CONTRATO`, `ACK`.

**Cambio de contrato:**

1. Quien lo necesita envía `CAMBIO-CONTRATO` con el diff propuesto, id `C-xx`.
2. El otro responde `ACK` o `PREGUNTA`.
3. CC actualiza `docs/CONTRATO_DATOS.md` (versión semver) en un PR.
4. CX ajusta el pipeline y `validar_contrato.py`.

Nadie rompe el contrato sin `ACK`.

**Bloqueos:** si una IA queda bloqueada más de 30 minutos por algo de la otra, manda `BLOQUEO` a Josué y sigue con otra tarea del tablero.

---

# 16. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Fable solo está disponible hoy | Segura | Alto | Modo Plan primero; prioriza lo arquitectónico y difícil; `HANDOFF.md` tras cada bloque; Opus continúa con el plan detallado |
| Yahoo bloquea, limita o cambia la API (yfinance falla) | Media | Medio | Reintentos y caché; se publica solo si valida; la interfaz muestra la antigüedad; el Modo profesor no depende de Yahoo |
| Historia del ticker `B` incompleta | Media | Bajo | Verificar y declarar (sección 6.3) |
| Entrenar los 7 DL es lento en Actions | Media | Medio | Pesos en caché semanal; épocas reducidas; modelos de panel; el job de cortes por separado |
| Menos de 4 elegibles con tope 25 % | Media | Medio | Regla de completado (sección 5.4) con aviso visible |
| El profesor interpreta el Modo real como «presentar datos como reales» o fuera del encargo | Baja | Alto | Modo profesor por defecto; avisos claros por modo; el informe explica que el Modo real es un **extra** y que la evaluación se hace sobre el Modo profesor |
| MediaPipe sin GPU o cámara denegada | Media | Medio | Respaldo en CPU; mensaje claro; todas las funciones siguen accesibles con teclado y barrido |
| Precisión de la mirada con webcam | Alta | Medio | Cabeza como puntero principal + imán + objetivos grandes + permanencia; calibración |
| `<select>` nativo inaccesible con puntero virtual | Alta | Medio | Listbox propio en modo puntero (9.3) |
| Desborde a 390 px por la tabla de 468 celdas | Alta | Alto | Vista por activo en móvil + región con desplazamiento propio; prueba automática |
| Conflictos de Git entre IAs | Media | Medio | Propiedad de rutas (13.2), ramas por IA, PR con CI |
| Límites de Figma (Starter, View) | Segura | Bajo | Importación sin créditos; enlace de solo lectura; Education opcional; sin llamadas de lectura del MCP |
| Cambios de línea (CRLF) alteran `data/` en Windows | Media | Alto | `core.autocrlf=false`, `.gitattributes` con `data/** -text` y verificación SHA-256 en CI |
| Caché de GitHub Pages (≈10 min) muestra datos viejos | Alta | Bajo | `?v=<generado_en>` en `data_real/` |
| Retraso general | Media | Alto | Orden de recorte (sección 14) y prioridad absoluta al Modo profesor |
| Licencias | Baja | Medio | Se conserva el CC BY 4.0 del material base con atribución; atribución de Yahoo/yfinance; fuentes OFL; modelos de MediaPipe (Apache 2.0) |

---

# 17. Definición de terminado y lista final de entrega

**Un módulo está terminado cuando:** cumple sus R-IDs; funciona en ambos modos (o declara por qué no); pasa E2E, axe y las verificaciones del profesor; no desborda a 390 px; tiene tabla, resumen y sonificación en cada gráfico; tiene sus textos en ES-PE y EN-US; y está registrado en `TABLERO.md` con su PR fusionado.

**Lista final (viernes 14:00)** — basada en el Anexo C de la guía, ampliada:

**Diseño y código**

- [ ] Archivo de Figma (enlace de solo lectura) con pantallas y prototipo navegable
- [ ] `figma-src/` con el export de Make sin editar
- [ ] 9 páginas con la misma navegación; un `css/styles.css` y un `js/common.js`
- [ ] Datos leídos de `data/` (profesor) y `data_real/` (real); ninguna cifra escrita a mano
- [ ] `data/` byte a byte idéntico al del profesor (SHA-256)

**Calidad**

- [ ] Consola sin errores en las 9 páginas (ambos modos, ambos temas)
- [ ] Sin desborde horizontal a 390 px
- [ ] Tema claro y oscuro, incluidos los gráficos
- [ ] Contraste 4,5:1, teclado completo, etiquetas, `scope` y alternativas en tabla
- [ ] axe sin *serious*/*critical*

**Veracidad**

- [ ] Aviso de datos sintéticos o simulados en cada módulo de predicción (Modo profesor) y aviso de datos reales (Modo real)
- [ ] Clasificación solo con SUBE y BAJA
- [ ] Backtesting interpretado tal como salió (sin manipular)
- [ ] Declaración de uso de IA en el informe y `PROMPTS_USADOS.md` con prompts literales

**Entrega**

- [ ] Repositorio público sin credenciales (escaneo limpio)
- [ ] GitHub Pages operativo y probado desde un celular real
- [ ] `S13_EquipoA_Informe.pdf` de 8 a 12 páginas
- [ ] Enlaces registrados en la tabla del curso / Aula Virtual

---

# 18. Anexos

## Anexo A · Pruebas humanas (Josué puede reasignar)

Cada persona prueba sobre la URL de Pages a partir del miércoles por la noche y reporta en GitHub Issues con la plantilla `hallazgo-prueba` (pasos, resultado esperado, resultado obtenido, captura, navegador y dispositivo, severidad).

| Integrante | Rol de prueba |
|---|---|
| Martines Cancho, Josue | Coordinación, integración, verificación final y entrega |
| Arboleda Sanchez, Ericka Sofia | Lector de pantalla **NVDA** (Chrome/Firefox) y **Narrador** (Edge) en Windows |
| Cabrejos Palomino, Christian Daniel | **Android** a 390 px y **TalkBack** |
| Ccoicca Fernandez, Adrian | Control con **cabeza/mirada** (distintas luces, con y sin lentes, dos webcams) |
| Cerna Sifuentes, Augusto Nicolás | **Gestos de mano** (pellizco, palma, deslizar) |
| Grijalva De La Cruz, Rony Smith | Solo **teclado** y **barrido con un interruptor** |
| Postigo Vega, Diana Carolina | Revisión del **informe**, capturas y carátula |
| Siesquen Torres, Katherine Lizbeth | **EN-US** y formatos `Intl`; lenguaje llano de los textos |
| Tecsi Alanoca, Jean Carlo | **Veracidad del Modo profesor**: cifras de pantalla contra los JSON (Anexo C de la guía) |
| Tonconi Isidro, Maria Sunori | **iOS/Safari**; contraste y **daltonismo** (simulación en Chrome DevTools) |
| Villegas Niño, Marco Antonio | **Figma vs. sitio** (conformidad visual) y revisión del guion del video |

## Anexo B · Referencias técnicas

**B.1 Versiones verificadas (16-nov-2026):** ECharts 5.5.1 (fijada por la guía; la última es 6.1.0, **no** actualizar), `@mediapipe/tasks-vision` 1.2.3, Playwright 1.65.1, `@axe-core/playwright` 4.14.0, yfinance 1.8.0, pandas 3.1.1, numpy 2.5.5, scikit-learn 1.9.1, xgboost 3.4.1, lightgbm 4.7.0, torch 2.15.0, pymoo 0.6.2, cvxpy 1.9.3, exchange-calendars 4.13.3, scipy 1.18.1, Node 22.

**B.2 Enlaces:**

- Repo base: `https://github.com/mbaernestocr-tech/ernesto-investing-ai-base-s13` (commit `e9d711e`).
- Versión en línea del profesor: `https://mbaernestocr-tech.github.io/ernesto-investing-ai-base-s13/`.
- Repo del equipo: `https://github.com/JosMart04/EquipoA_ErnestoInvestingAI`.
- Pages: `https://josmart04.github.io/EquipoA_ErnestoInvestingAI/`.
- Figma Make: `https://www.figma.com/make/BWA9B3JoRbAWZiVoPSyoBO`.
- Modelos de MediaPipe:
  - `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`
  - `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`
- ECharts: `https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js`.

**B.3 SHA-256 de `data/` del profesor (commit `e9d711e`, finales de línea LF):**

```text
2ee56b7baf5c60020db10de7b840206fcbe7cf25f63667ebf7daa863a8bcbec7  01_universo_tickers.json
81e406252ec7c53463a584cc7232005d7089e78a9a7345f45c26c2cfabbebf67  02_precios_sinteticos_504d.json
1509e4c4f6a85a51645da4315c78e07b082a406c44435f107868c3fe850cf4f7  03_ohlcv_sintetico_120d.json
fc9e8892238947b333d0e12ba9f39bb76f376ceac075d3164deb560758af522f  04_matriz_correlacion_covarianza.json
09592a497926eb285b3c03e26162d92a8c813fa77163dc58ae1912becc2d8652  05_clasificadores_binarios.json
43b5d51349ce280ee549aa88696279d16d51ca7046237dfa75f0b8c92f8cab65  06_regresores_precio_30d.json
e976b30fb2de1bae4da3191cf195a142402af9baadbecfae996dc6685f196872  07_optimizador_markowitz_nsga.json
adf38e5411254839659e0c074f9f0e7dcd38f30d41e89eb7ba186751016de3b6  08_portafolios_3_niveles_riesgo.json
8f97d8aafda3ff6ae7bf2700ba5e6b0af6019ddf7470835505ee24e0ccaaafbd  09_backtesting_portafolios.json
64c55e6e45753f13147b58cb7dad34e6c20b9e348d14b36aa668383919da4584  10_dashboard_mercado.json
7d50433bfdfe08fb045c0c5640467a67200a199f338188cc9bf4e81d3441fd1e  11_watchlist_alertas_portafolio_demo.json
3776a2ebd369dda028a75c73d14fc938bb71f3826616b96721973c162aa9e777  12_leaderboard_liga.json
7765ca91430eeb8795731d333f273609533ff0bf3801d75b4bff99e4bfda2217  13_patrones_y_parametros.json
```

**B.4 Datos medidos en los JSON del profesor (útiles para textos y pruebas):**

- Exactitud de los clasificadores: de 0,524 a 0,567.
- Consenso: 16 activos SUBE y 10 BAJA.
- 12 elegibles: AMZN, NVDA, BVN, SCCO, BHP, B, XLV, XLP, XLU, SPY, QQQ y EPU.
- Puntos de las fronteras: 35 + 35 + 40 + 60.
- Portafolios: Conservador = N2-05, Moderado = N2-37, Agresivo = N2-36.
- Backtesting: 12 rebalanceos mensuales desde el 25-nov-2025; el Agresivo usa un tope de 0,35.
- Patrones simulados P1–P8, documentados en `13`.

## Anexo C · Glosario mínimo

- **Fecha de corte:** último día cuyos datos usa un modelo.
- **Walk-forward:** reentrenar y rebalancear avanzando en el tiempo, sin usar el futuro.
- **Embargo:** separación temporal entre entrenamiento y prueba para que las etiquetas solapadas no filtren información.
- **CVaR 95 %:** pérdida media del 5 % de peores días.
- **Frente de Pareto:** carteras en las que no se puede mejorar un objetivo sin empeorar otro.
- **Permanencia (dwell):** activar un elemento manteniendo el puntero quieto sobre él.
- **Barrido (scanning):** resaltar opciones por turnos y elegirlas con un solo interruptor.
- **Sonificación:** representar datos con sonido.
