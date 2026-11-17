# TABLERO de tareas

Cada responsable edita **solo sus filas**. Estados: `pendiente` · `en curso` · `en revisión` · `hecho` · `bloqueado`.
Responsables: **CC** (Claude Code: Fable hoy, Opus desde el martes) · **CX** (Codex, GPT-6 Astra) · **OP** (Opus 5.5 en claude.ai) · **JM** (Josué) · **HUM** (equipo).
Las tareas de CC (T-01 a T-29) se detallan en `docs/plan/PLAN_IMPLEMENTACION.md` §11 (objetivo, archivos, dependencias, aceptación y estimación).
**Peticiones de CC a CX** (no son filas nuevas; van dentro de T-30, T-37, T-39 y T-51): aplicar C-01 y C-02; validar I-09…I-11; adelantar un `qa.yml` mínimo; fixture `opt_referencia.json`; selectores E2E del plan §4 y §8.

| ID | Tarea | Resp. | Estado | Rama / PR | Requisitos | Notas |
|---|---|---|---|---|---|---|
| T-00 | Preparar el repo, Pages, docs/contexto, CLAUDE.md, AGENTS.md | JM | pendiente | main | R-INT-09, R-ENT-02 | PLAN_MAESTRO §15.1 |
| T-01 | Plan de implementación, tablero, prompt literal, D-17…D-21, `.nojekyll` | CC-F | hecho | cc/T-01-plan · PR #2 | R-INT-09 | PLAN_IMPLEMENTACION §11 |
| T-02 | `docs/CONTRATO_DATOS.md` v1.0.0 + C-01 y C-02 | CC-F | hecho | cc/T-01-plan · PR #2 | R-DAT-01…03 | Espera ACK de CX |
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
| T-14 | A11y: preferencias, panel y anunciador (f) | CC-F | pendiente | cc/T-14-a11y | D-07 f, R-A11Y-04 | |
| T-15 | A11y: bus de entrada y puntero virtual | CC-F | pendiente | cc/T-14-a11y | D-07 c/d/e | |
| T-16 | A11y: cámara, cabeza-mirada, manos, señales | CC-F | pendiente | cc/T-14-a11y | D-07 c/d, D-12 | Cámara real: prueba humana |
| T-17 | Regresión (P04) | CC-O | pendiente | | R-REG-01…09 | mar |
| T-18 | Optimizador (P05), Modo profesor | CC-O | pendiente | | R-OPT-01…09 | mar |
| T-19 | Dashboard ampliado | CC-O | pendiente | | R-HER-01 | mar |
| T-20 | Watchlist y gestor de alertas | CC-O | pendiente | | R-HER-02 | mar |
| T-21 | Trading con validación asociada al campo | CC-O | pendiente | | R-HER-03 | mar |
| T-22 | Leaderboard | CC-O | pendiente | | R-HER-04 | mar |
| T-23 | Portafolios (P06) | CC-O | pendiente | | R-POR-01…04 | mié |
| T-24 | Backtesting (P06) | CC-O | pendiente | | R-BT-01…07 | mié |
| T-25 | Integración P07: estado compartido, enlaces, «Llevar a Trading» | CC-O | pendiente | | R-INT-03/05, R-POR-04 | mié |
| T-26 | Modo real en los 9 módulos, cortes y recálculo en Workers | CC-O | pendiente | | D-02, D-03 | mié; depende de T-31…T-38 |
| T-27 | A11y (a) completa y (e) barrido | CC-O | pendiente | | D-07 a/e/f, R-A11Y-05 | mié |
| T-28 | A11y (c) y (d) completas | CC-O | pendiente | | D-07 c/d | jue |
| T-29 | Conformidad con Figma, correcciones de QA y P08, congelamiento | CC-O | pendiente | | R-FLU-01/06 | jue–vie |
| T-30 | Validador del contrato (ambos modos, SHA-256 de data/) | CX | pendiente | | R-DAT-*, I-01…I-08 | |
| T-31 | Pipeline v0: descarga + mercado (01, 02, 03, 04, 10, 11, 12, 13, precios, cierres, meta) | CX | pendiente | | D-03, D-04 | |
| T-32 | Workflow actualizar-datos.yml (diario, cortes, completo) | CX | pendiente | | D-04 | |
| T-33 | 11 clasificadores ML + 05 real | CX | pendiente | | R-CLA-* | |
| T-34 | 11 regresores ML + 06 real | CX | pendiente | | R-REG-* | |
| T-35 | 7 DL (clasificación y regresión) | CX | pendiente | | R-CLA-*, R-REG-* | |
| T-36 | 07 optimizador (cvxpy + pymoo) + 08 portafolios | CX | pendiente | | R-OPT-*, R-POR-* | |
| T-37 | 09 backtesting real | CX | pendiente | | R-BT-* | |
| T-38 | Cortes históricos (12 fines de mes) | CX | pendiente | | D-03 | |
| T-39 | Fixtures de referencia para las pruebas JS | CX | pendiente | | §7.3 | |
| T-50 | Suite E2E + axe + datos | CX | pendiente | | §11 | |
| T-51 | qa.yml (CI) + escaneo de secretos | CX | pendiente | | R-ETI-03 | |
| T-60 | Auditoría P08 | CX | pendiente | | R-FLU-06 | |
| T-61 | README + PROMPTS_USADOS.md | CX | pendiente | | R-ENT-02, R-ENT-05 | |
| T-62 | Informe PDF S13_EquipoA_Informe.pdf | CX | pendiente | | R-ENT-04 | |
| T-63 | Guía de accesibilidad para el usuario | CX | pendiente | | §9 | |
| T-64 | Video (opcional) | CX | pendiente | | D-11 | |
| T-70 | Mockups de Figma Make + importación | OP | hecho | fuera del repo | R-FLU-01 | https://www.figma.com/make/BWA9B3JoRbAWZiVoPSyoBO |
| T-71 | Compartir Figma (solo lectura) + figma-src/ sin editar | JM | hecho | main | R-FLU-02, R-ENT-01 | |
| T-80 | Pruebas humanas por rol | HUM | pendiente | issues | §11, Anexo A | |
| T-90 | Comandos de voz (última fase) | CC | pendiente | | D-07 (b) | solo si todo está en verde |
