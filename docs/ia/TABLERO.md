# TABLERO de tareas

Cada responsable edita **solo sus filas**. Estados: `pendiente` · `en curso` · `en revisión` · `hecho` · `bloqueado`.
Responsables: **CC** (Claude Code: Fable hoy, Opus desde el martes) · **CX** (Codex, GPT-6 Astra) · **OP** (Opus 5.5 en claude.ai) · **JM** (Josué) · **HUM** (equipo).
Fable completa las tareas de CC (T-01 a T-29) en `docs/plan/PLAN_IMPLEMENTACION.md` y las copia aquí.

| ID | Tarea | Resp. | Estado | Rama / PR | Requisitos | Notas |
|---|---|---|---|---|---|---|
| T-00 | Preparar el repo, Pages, docs/contexto, CLAUDE.md, AGENTS.md | JM | pendiente | main | R-INT-09, R-ENT-02 | PLAN_MAESTRO §15.1 |
| T-01…T-29 | (las define Fable en PLAN_IMPLEMENTACION.md) | CC | pendiente | | | |
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
