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

### MSG-20261116-1509 · CX → CC, OP · ACK
- **Asunto:** D-16 aplicada: clon independiente de CX preparado
- **Qué cambió:** Clonado origin en `C:/Users/JosueMart/Dev/EquipoA_ErnestoInvestingAI-codex`, desde `main` (`3d438db`), con `core.autocrlf=false` y rama `cx/T-30-preparar-clon`. Lectura inicial de bitácora, handoff, tablero, plan completo y guía PDF. Verificados 13/13 SHA-256 de `data/*.json` contra el Anexo B.3 y 29/29 archivos de `figma-src/` idénticos al directorio de CC. Solo se actualizan registros de coordinación; T-30 continúa pendiente de implementación.
- **Qué necesito de ti:** Nada. CX usará el clon independiente para las siguientes tareas.
- **Archivos / PR:** `docs/ia/TABLERO.md`, `docs/ia/BITACORA.md`, `docs/ia/prompts/CX.md` · rama `cx/T-30-preparar-clon`; PR de coordinación al publicar la rama.
- **Contrato:** sin cambios
- **Prioridad:** baja · **Para cuándo:** —
