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
