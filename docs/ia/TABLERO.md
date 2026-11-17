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
| T-26 | Modo real en los 9 módulos, cortes y recálculo en Workers | CC-O | pendiente | | D-02, D-03 | mié; depende de T-31…T-38 |
| T-27 | A11y (a) completa y (e) barrido | CC-O | en revisión | cc/T-27-a11y-graficos · PR #20 | D-07 a/e/f, R-A11Y-05 | Exploración punto a punto con tono y anuncio, resumen automático por serie, «Leer en voz alta», consenso sonoro en Clasificación, barrido de 6 grupos, fuente legible y cursor grande. Corrige el aria-label en inglés de ECharts |
| T-28a | **Arreglo:** la cámara se congelaba al primer segundo (el HUD sacaba el `<video>` del documento); vigilante del video; gestos de mano (D-22); histéresis del puntero; recorrido de la cabeza | CC-O | hecho | PR #8 | D-07 c/d | Verificado con MediaPipe real y video falso; **falta la prueba de Josué con webcam** |
| T-28 | A11y (c) y (d) completas | CC-O | pendiente | | D-07 c/d | jue |
| T-29 | Conformidad con Figma, correcciones de QA y P08, congelamiento | CC-O | pendiente | | R-FLU-01/06 | jue–vie |
| T-30 | Validador del contrato (ambos modos, SHA-256 de data/) | CX | en revisión | cx/T-50-accesibilidad-pipeline | R-DAT-*, I-01…I-11 | Validador I-01…I-11 aprobado en profesor y real; discrepancia literal preservada; pruebas de corrupción y temporalidad. |
| T-31 | Pipeline v0: descarga + mercado (01, 02, 03, 04, 10, 11, 12, 13, precios, cierres, meta) | CX | en revisión | cx/T-50-accesibilidad-pipeline | D-03, D-04 | 01–13, precios y meta generados/validados al 2026-11-16 (7,28 MB antes de cortes); falta merge para publicación remota. |
| T-32 | Workflow actualizar-datos.yml (diario, cortes, completo) | CX | en revisión | cx/T-50-accesibilidad-pipeline | D-04 | Workflow manual de solo lectura entrega artefacto. Cron y push del bot a main rechazados por revisión automática; propuesta concreta en docs/informe/T-32-propuesta.md, requiere autorización. |
| T-33 | 11 clasificadores ML + 05 real | CX | en revisión | cx/T-50-accesibilidad-pipeline | R-CLA-* | Corte 2026-11-16 generado y validado con modelos reales y prueba externa; pendiente revisión/merge. Cortes históricos en T-38. |
| T-34 | 11 regresores ML + 06 real | CX | en revisión | cx/T-50-accesibilidad-pipeline | R-REG-* | Corte 2026-11-16 generado y validado con modelos reales y prueba externa; pendiente revisión/merge. Cortes históricos en T-38. |
| T-35 | 7 DL (clasificación y regresión) | CX | en revisión | cx/T-50-accesibilidad-pipeline | R-CLA-*, R-REG-* | Corte 2026-11-16 generado y validado con modelos reales y prueba externa; pendiente revisión/merge. Cortes históricos en T-38. |
| T-36 | 07 optimizador (cvxpy + pymoo) + 08 portafolios | CX | en revisión | cx/T-50-accesibilidad-pipeline | R-OPT-*, R-POR-* | Corte 2026-11-16 generado y validado con modelos reales y prueba externa; pendiente revisión/merge. Cortes históricos en T-38. |
| T-37 | 09 backtesting real | CX | en revisión | cx/T-50-accesibilidad-pipeline | R-BT-* | Corte 2026-11-16 generado y validado con modelos reales y prueba externa; pendiente revisión/merge. Cortes históricos en T-38. |
| T-38 | Cortes históricos (12 fines de mes) | CX | en curso | cx/T-50-accesibilidad-pipeline | D-03 | Implementado; entrenamiento, generación y validación del corte actual y doce cortes históricos en curso. |
| T-39 | Fixtures de referencia para las pruebas JS | CX | en revisión | cx/T-51-ci-referencias-datos · PR #7 | §7.3 | opt_referencia.json: 35 puntos independientes con cvxpy; activa la prueba JS pendiente. Fixture de backtest queda pendiente. |
| T-50 | Suite E2E + axe + datos | CX | en revisión | cx/T-50-accesibilidad-pipeline | §11 | 190/192 iniciales: 120 funcionales y 70/72 axe. Contraste de Backtesting claro falla (issue #21). Fixture 13 corregido y probado con 200/cuerpo/?v=; 88/88 regresiones posteriores. Modo completo se verificará con 01–13. |
| T-51 | qa.yml (CI) + escaneo de secretos | CX | en revisión | cx/T-50-accesibilidad-pipeline | R-ETI-03 | Integra axe, ambos temas/anchos, validación y pruebas causales de pipeline. Hallazgo de CC #21 impide declarar toda QA verde. |
| T-60 | Auditoría P08 | CX | pendiente | | R-FLU-06 | |
| T-61 | README + PROMPTS_USADOS.md | CX | en curso | cx/T-51-ci-referencias-datos · PR #7 | R-ENT-02, R-ENT-05 | README: atribución Yahoo/yfinance y alcance parcial; resto de documentación y PROMPTS_USADOS pendiente. |
| T-62 | Informe PDF S13_EquipoA_Informe.pdf | CX | pendiente | | R-ENT-04 | |
| T-63 | Guía de accesibilidad para el usuario | CX | pendiente | | §9 | |
| T-64 | Video (opcional) | CX | pendiente | | D-11 | |
| T-70 | Mockups de Figma Make + importación | OP | hecho | fuera del repo | R-FLU-01 | https://www.figma.com/make/BWA9B3JoRbAWZiVoPSyoBO |
| T-71 | Compartir Figma (solo lectura) + figma-src/ sin editar | JM | hecho | main | R-FLU-02, R-ENT-01 | |
| T-80 | Pruebas humanas por rol | HUM | pendiente | issues | §11, Anexo A | |
| T-90 | Comandos de voz (última fase) | CC | pendiente | | D-07 (b) | solo si todo está en verde |
