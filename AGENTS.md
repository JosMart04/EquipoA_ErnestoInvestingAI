# AGENTS.md — EquipoA_ErnestoInvestingAI (instrucciones para Codex)

Sistema web integrado **Ernesto Investing AI** (IHC 2026-II, FISI-UNMSM, Equipo A). Entrega: **viernes 20-nov-2026, 16:00** (límite 18:00, hora de Lima).

## Lee esto antes de trabajar (en cada sesión)

1. `docs/ia/BITACORA.md`: mensajes desde tu último mensaje (y `docs/ia/HANDOFF.md` para saber cómo va el sitio).
2. `docs/ia/TABLERO.md`: tus tareas (dueño **CX**).
3. `docs/contexto/PLAN_MAESTRO.md`: en la primera sesión, completo. Tus secciones clave: §5 (contrato de datos), §6 (pipeline), §11 (calidad), §12 (Figma), §13 (propiedad de rutas), §14 (cronograma), §15 (protocolo), §17 (lista final).
4. `docs/contexto/GUIA_PROFESOR_S13.pdf`: la guía. Si choca con el plan en algo evaluado, gana la guía; avisa en la bitácora.

## Tus frentes (CX)

- **F6** pipeline de datos reales.
- **F7** pruebas E2E, de accesibilidad y de datos, y la CI.
- **F8** auditoría P08 independiente.
- **F9** README, `PROMPTS_USADOS.md` e informe PDF.
- **F12** video (opcional).

## Tus rutas

`pipeline/`, `data_real/`, `tools/validar_contrato.py`, `tests/e2e/`, `tests/a11y/`, `tests/datos/`, `tests/fixtures/`, `tests/package.json`, `.github/workflows/`, `README.md`, `PROMPTS_USADOS.md`, `docs/informe/`, `docs/guia-usuario/`, `docs/capturas/`.

**No edites** las rutas de Claude Code: `*.html`, `css/`, `js/`, `i18n/`, `assets/`, `tests/unit/`, `docs/plan/`, `docs/CONTRATO_DATOS.md`. Si ves un error allí, abre un issue o manda un mensaje `REVISIÓN`. Tampoco `figma-src/` ni `data/`.

## Reglas no negociables

- **`data/` no se modifica nunca.** `data_real/` usa el mismo esquema (§5) y lo valida `tools/validar_contrato.py`.
- **Sin mirar el futuro:** embargo de 30 sesiones y prueba fuera de muestra. Resultados publicados **tal como salgan** (prohibido ajustar para que las carteras «ganen»).
- **Solo SUBE/BAJA.** Los nombres de los 36 modelos deben ser idénticos a §5.1.
- **Sin secretos en el repo** (yfinance no necesita clave; la de ElevenLabs solo en variable de entorno local).
- Atribución de Yahoo Finance / yfinance en `meta.json`, en `13` y en el README.
- **Las pruebas se escriben desde la especificación**, no desde el código; nunca se relaja una prueba para que pase.

## Protocolo

- Rama `cx/T-xx-descripcion` → PR → merge solo con la CI en verde (el bot de datos escribe directo en `data_real/**`).
- Al terminar cada bloque:
  1. actualiza tus filas de `docs/ia/TABLERO.md`;
  2. agrega un mensaje al final de `docs/ia/BITACORA.md`;
  3. imprime `📨 MENSAJE PARA CC` si le afecta.
- Copia **literal** cada prompt que recibas en `docs/ia/prompts/CX.md`.
- Cambios del contrato: mensaje `CAMBIO-CONTRATO` y esperar `ACK` de Claude Code.

## Comandos

```powershell
python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r pipeline/requirements.txt
python tools/validar_contrato.py data --modo profesor
python -m pipeline.ejecutar --salida data_real --modo completo
python tools/validar_contrato.py data_real --modo real
python -m http.server 8000
```
