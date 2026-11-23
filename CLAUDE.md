# CLAUDE.md — EquipoA_ErnestoInvestingAI

Sistema web integrado **Ernesto Investing AI** (IHC 2026-II, FISI-UNMSM, Equipo A). Entrega: **viernes 20-nov-2026, 16:00** (límite 18:00, hora de Lima).

## Lee esto antes de trabajar (en cada sesión)

1. `docs/ia/HANDOFF.md`: dónde quedó el trabajo y el siguiente paso exacto.
2. `docs/ia/BITACORA.md`: mensajes desde tu último mensaje.
3. `docs/plan/PLAN_IMPLEMENTACION.md` y `docs/ia/TABLERO.md`: tus tareas.
4. `docs/contexto/PLAN_MAESTRO.md`: decisiones D-01 a D-15, requisitos R-*, contrato de datos, arquitectura, diseño, accesibilidad y protocolo. **En la primera sesión, léelo completo.**
5. `docs/contexto/GUIA_PROFESOR_S13.pdf`: la guía del profesor. Si algo choca con el plan en un punto evaluado, gana la guía; avisa en la bitácora.

## Reglas no negociables

- **`data/` no se modifica nunca** (ni bytes ni finales de línea). Los datos reales van en `data_real/`, con el mismo esquema.
- **HTML + CSS + JavaScript puro, sin compilación ni frameworks.** ECharts 5.5.1 por CDN. MediaPipe Tasks Vision 1.2.3 solo bajo demanda, al activar la cámara.
- **Un solo `css/styles.css` y un solo `js/common.js`**; no se duplica código entre módulos.
- **El Modo profesor se abre por defecto** y cumple la guía al pie de la letra. Tiene prioridad sobre el Modo real y sobre la accesibilidad avanzada.
- **Clasificación: solo SUBE o BAJA.** Nunca NEUTRO, MANTENER ni HOLD.
- **Nunca solo color:** palabra + símbolo ▲/▼. Contraste ≥ 4,5:1 en claro y oscuro. Todo con teclado, foco visible, «Saltar al contenido», tabla alternativa por gráfico y sin desborde a 390 px.
- **Ninguna cifra escrita a mano:** todo se lee de los JSON o se deriva y se declara.
- **Textos con i18n** (ES-PE / EN-US) y `Intl`; sin concatenar cadenas visibles.
- **Sin secretos** en el repo.
- **Comentarios del código en español.**

## Tus rutas (Claude Code)

`*.html`, `css/`, `js/`, `locales/`, `assets/`, `tests/unit/`, `docs/plan/`, `docs/CONTRATO_DATOS.md`.

**No edites** las rutas de Codex: `pipeline/`, `data_real/`, `tools/validar_contrato.py`, `tests/e2e|a11y|datos|fixtures/`, `.github/workflows/`, `README.md`, `PROMPTS_USADOS.md`, `docs/informe/`. Tampoco `figma-src/` ni `data/`.

## Protocolo

- Rama `cc/T-xx-descripcion` → PR → merge solo con la CI en verde. Commits con los IDs: `feat(modulo): … [R-…] [T-…]`.
- Al terminar cada bloque:
  1. actualiza `docs/ia/HANDOFF.md` y tus filas de `docs/ia/TABLERO.md`;
  2. agrega un mensaje al final de `docs/ia/BITACORA.md`;
  3. imprime `📨 MENSAJE PARA CX` si le afecta.
- Copia **literal** cada prompt que recibas en `docs/ia/prompts/CC.md`.
- Cambios del contrato de datos: mensaje `CAMBIO-CONTRATO` y esperar `ACK` de Codex.

## Comandos

```powershell
python -m http.server 8000          # http://127.0.0.1:8000
python tools/validar_contrato.py data --modo profesor
cd tests; npx playwright test       # cuando exista la suite
```
