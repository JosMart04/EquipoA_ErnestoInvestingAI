# TABLERO de tareas

Cada responsable edita **solo sus filas**. Estados: `pendiente` · `en curso` · `en revisión` · `hecho` · `bloqueado`.
Responsables: **CC** (Claude Code: Fable hoy, Opus desde el martes) · **CX** (Codex, GPT-6 Astra) · **OP** (Opus 5.5 en claude.ai) · **JM** (Josué) · **HUM** (equipo).
Las tareas de CC (T-01 a T-29) se detallan en `docs/plan/PLAN_IMPLEMENTACION.md` §11 (objetivo, archivos, dependencias, aceptación y estimación).
**Peticiones de CC a CX** (no son filas nuevas; van dentro de T-30, T-37, T-39 y T-51): aplicar C-01 y C-02; validar I-09…I-11; adelantar un `qa.yml` mínimo; fixture `opt_referencia.json`; selectores E2E del plan §4 y §8.

| ID | Tarea | Resp. | Estado | Rama / PR | Requisitos | Notas |
|---|---|---|---|---|---|---|
| T-00 | Preparar el repo, Pages, docs/contexto, CLAUDE.md, AGENTS.md | JM | pendiente | main | R-INT-09, R-ENT-02 | PLAN_MAESTRO §15.1 |
| T-01 | Plan de implementación, tablero, prompt literal, D-17…D-21, `.nojekyll` | CC-F | hecho | cc/T-01-plan · PR #2 | R-INT-09 | PLAN_IMPLEMENTACION §11 |
| T-02 | `docs/CONTRATO_DATOS.md` v1.0.0 + C-01 y C-02 | CC-F → CC-O | hecho | PR #2 · PR #9 | R-DAT-01…03 | ACK de CX (C-01 solo igualdad inversa; C-02). Aclaración editorial en PR #9 |
| T-03 | Núcleo: `EIA`, eventos, estado, modo, capa de datos, tema | CC-F | hecho | cc/T-03-nucleo | R-INT-03/04/10, D-02 | |
| T-04 | i18n: motor, diccionarios, `Intl`, mapa de presentación | CC-F | hecho | cc/T-03-nucleo | R-I18N-01, R-REG-07 | |
| T-05 | Shell y hoja de estilos (tokens, cabecera, menú < 1180 px, avisos) | CC-F | hecho | cc/T-03-nucleo | R-INT-01/02/06/07/08, R-A11Y-01/02/04 | |
| T-06 | Componentes comunes (ficha IA, tabla ordenable, contenedor de gráfico…) | CC-F | hecho | cc/T-03-nucleo | R-IHC-01, R-CLA-03, R-A11Y-03/05 | |
| T-07 | 9 páginas sobre el shell nuevo + pruebas del núcleo | CC-F | hecho | cc/T-03-nucleo | R-INT-01/06, R-HER-01 | |
| T-08 | **Clasificación completa (módulo de referencia)** | CC-F | hecho | cc/T-08-clasificacion | R-CLA-01…07, R-IHC-01…04, R-INT-05 | Sin P03 pegado (D-20) |
| T-09 | `js/lib`: prng, estadística, símplex | CC-F | hecho | cc/T-09-lib | D-03, I-03 | |
| T-10 | `js/lib`: Markowitz con tope | CC-F | hecho | cc/T-09-lib | R-OPT-09, I-04 | |
| T-11 | `js/lib`: NSGA-II y NSGA-III | CC-F | hecho | cc/T-09-lib | I-04 | |
| T-12 | `js/lib`: backtest walk-forward | CC-F | hecho | cc/T-09-lib | R-BT-06, I-06, I-10 | |
| T-13 | Workers y `EIA.trabajo` | CC-F | hecho | cc/T-09-lib | D-03, R-OPT-08 | |
| T-14 | A11y: preferencias, panel y anunciador (f) | CC-F | hecho | cc/T-14-a11y | D-07 f, R-A11Y-04 | |
| T-15 | A11y: bus de entrada y puntero virtual | CC-F | hecho | cc/T-14-a11y | D-07 c/d/e | |
| T-16 | A11y: cámara, cabeza-mirada, manos, señales | CC-F | hecho | cc/T-14-a11y | D-07 c/d, D-12 | Se congelaba tras el primer segundo: corregido en T-28a |
| T-17 | Regresión (P04) | CC-O | hecho | PR #10 | R-REG-01…09 | mar |
| T-18 | Optimizador (P05), Modo profesor | CC-O | hecho | PR #11 | R-OPT-01…09 | mar |
| T-19 | Dashboard ampliado | CC-O | hecho | PR #12 | R-HER-01 | mar |
| T-20 | Watchlist y gestor de alertas | CC-O | hecho | PR #12 | R-HER-02 | mar |
| T-21 | Trading con validación asociada al campo | CC-O | hecho | PR #13 | R-HER-03 | mar |
| T-22 | Leaderboard | CC-O | hecho | PR #13 | R-HER-04 | mar |
| T-23 | Portafolios (P06) | CC-O | hecho | PR #16 | R-POR-01…04 | Flujo Portafolios → Trading → Leaderboard probado en el navegador |
| T-24 | Backtesting (P06) | CC-O | hecho | PR #17 | R-BT-01…07 | Interpretación por reglas (cambia si cambian los números); R-BT-06 visible; nota del tope 0,35 (N-3). Retira `js/stub.js` (ya no lo usa ninguna página) |
| T-25 | Integración P07: estado compartido, enlaces, «Llevar a Trading» | CC-O | hecho | PR #16 y PR #19 | R-INT-03/05, R-POR-04 | «Llevar a Trading» (PR #16) y migas de pan al llegar por un enlace cruzado |
| T-26 | Modo real en los 9 módulos, cortes y recálculo en Workers | CC-O | hecho | PR #24 | D-02, D-03 | Revisado con los datos del PR #22: 9 páginas sin errores; recálculo en Workers (Backtesting 0,4 s, Optimizador 1,7 s) con «Volver a los datos del archivo»; cortes del más reciente al más antiguo; textos que solo valían para el curso corregidos |
| T-27 | A11y (a) completa y (e) barrido | CC-O | hecho | PR #20 | D-07 a/e/f, R-A11Y-05 | Exploración punto a punto con tono y anuncio, resumen automático por serie, «Leer en voz alta», consenso sonoro en Clasificación, barrido de 6 grupos, fuente legible y cursor grande. Corrige el aria-label en inglés de ECharts |
| T-28a | **Arreglo:** la cámara se congelaba al primer segundo (el HUD sacaba el `<video>` del documento); vigilante del video; gestos de mano (D-22); histéresis del puntero; recorrido de la cabeza | CC-O | hecho | PR #8 | D-07 c/d | Verificado con MediaPipe real y video falso, y **por Josué con la webcam de su laptop el 17-nov: funciona** |
| T-28 | A11y (c) y (d) completas | CC-O | hecho | PR #25 | D-07 c/d, D-23 | Calibración de 5 puntos de la cabeza con interfaz (HUD «Calibrar», Esc cancela, se quita en el Centro); tarjeta de gestos con SVG propios (HUD «Gestos» y Centro); «V» de dos dedos para desplazar. Sin deslizar ni pulgar arriba (D-23). Sin ajuste fino con el iris. **Josué la validó con su webcam el 17-nov** |
| T-29 | Conformidad con Figma, correcciones de QA y P08, congelamiento | CC-O | en curso | PR #23 (issue #21) · cc/T-29-conformidad · PR #26 | R-FLU-01/06 | Pasada de Figma: solo faltaban las casillas de series de Backtesting. Optimizador móvil: símbolos más chicos y zoom con dos dedos (mejora parcial). Falta la auditoría P08 de CX y el congelamiento |
| T-30 | Validador del contrato (ambos modos, SHA-256 de data/) | CX | pendiente | cx/T-51-ci-referencias-datos · PR #7 | R-DAT-*, I-01…I-08 | ACK C-01/I-03b y C-02; I-09/I-10/I-11 comprobadas en tests/datos. Validador completo aún pendiente. |
| T-31 | Pipeline v0: descarga + mercado (01, 02, 03, 04, 10, 11, 12, 13, precios, cierres, meta) | CX | en curso | cx/T-51-ci-referencias-datos · PR #7 | D-03, D-04 | Entrega parcial: meta + cierres reales de 26 tickers / 2.115 sesiones, corte 2026-11-16. Restan 01–13 y precios por activo. |
| T-32 | Workflow actualizar-datos.yml (diario, cortes, completo) | CX | pendiente | | D-04 | |
| T-33 | 11 clasificadores ML + 05 real | CX | pendiente | | R-CLA-* | |
| T-34 | 11 regresores ML + 06 real | CX | pendiente | | R-REG-* | |
| T-35 | 7 DL (clasificación y regresión) | CX | pendiente | | R-CLA-*, R-REG-* | |
| T-36 | 07 optimizador (cvxpy + pymoo) + 08 portafolios | CX | pendiente | | R-OPT-*, R-POR-* | |
| T-37 | 09 backtesting real | CX | pendiente | cx/T-51-ci-referencias-datos · PR #7 | R-BT-* | ACK C-02: referencia 1/N diaria sin comisión; volatilidad poblacional y fecha publicada en sesión siguiente verificadas. |
| T-38 | Cortes históricos (12 fines de mes) | CX | pendiente | | D-03 | |
| T-39 | Fixtures de referencia para las pruebas JS | CX | en revisión | cx/T-51-ci-referencias-datos · PR #7 | §7.3 | opt_referencia.json: 35 puntos independientes con cvxpy; activa la prueba JS pendiente. Fixture de backtest queda pendiente. |
| T-50 | Suite E2E + axe + datos | CX | en revisión | cx/T-50-e2e-backtesting · PR #18 | §11 | PR #15 integrado (40 E2E); se agregan 4 de Backtesting: curvas/métricas y Agresivo → 12 rebalanceos a 1280/390. Parcial real + 4 casos aislando ausencia de 09 con fixture de 13. Total 48; resta axe, temas y otros flujos. |
| T-51 | qa.yml (CI) + escaneo de secretos | CX | en revisión | PR #7 y #15 integrados | R-ETI-03 | Jobs pruebas, secretos y e2e con evidencias integrados; la suite descubre también Backtesting. Resta axe al completar T-50. |
| T-60 | Auditoría P08 | CX | pendiente | | R-FLU-06 | |
| T-61 | README + PROMPTS_USADOS.md | CX | en curso | cx/T-51-ci-referencias-datos · PR #7 | R-ENT-02, R-ENT-05 | README: atribución Yahoo/yfinance y alcance parcial; resto de documentación y PROMPTS_USADOS pendiente. |
| T-62 | Informe PDF S13_EquipoA_Informe.pdf | CX | pendiente | | R-ENT-04 | |
| T-63 | Guía de accesibilidad para el usuario | CX | pendiente | | §9 | |
| T-64 | Video (opcional) | CX | pendiente | | D-11 | |
| T-70 | Mockups de Figma Make + importación | OP | hecho | fuera del repo | R-FLU-01 | https://www.figma.com/make/BWA9B3JoRbAWZiVoPSyoBO |
| T-71 | Compartir Figma (solo lectura) + figma-src/ sin editar | JM | hecho | main | R-FLU-02, R-ENT-01 | |
| T-80 | Pruebas humanas por rol | HUM | pendiente | issues | §11, Anexo A | |
| T-90 | Comandos de voz (última fase) | CC | pendiente | | D-07 (b) | solo si todo está en verde |
