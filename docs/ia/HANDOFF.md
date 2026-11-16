# HANDOFF — estado para quien retome

> Lo actualiza **Claude Code al terminar cada bloque** (hoy Fable, que solo está disponible el lunes 16-nov; desde el martes, Opus 5.5).
> Opus: contrasta este archivo con el código y con `git log`; no confíes ciegamente.

## Última actualización
- Fecha y hora: 2026-11-16 15:05 (Lima)
- Modelo: Claude Fable 5.2 (Claude Code)
- Rama / último commit: `main` · commit inicial «chore: base S13 del profesor (CC BY 4.0) + contexto del plan + export de Figma Make sin editar»

## Hecho (con evidencia)
- Prompt CC-F-00: base del profesor (commit `e9d711e`) copiada a la raíz sin tocar `.gitignore`, `CLAUDE.md`, `AGENTS.md`, `docs/contexto` ni `docs/ia`.
- `git init -b main` con `core.autocrlf=false`. SHA-256 de `data/*.json`: 13/13 iguales al Anexo B.3.
- `figma-src/`: export de Figma Make sin editar (29 archivos, hash idéntico al ZIP).
- D-16 registrada; T-70 y T-71 en «hecho»; enlaces de Figma en la bitácora.
- Repo y Pages se crean justo después de este commit; comprobar con `gh api repos/JosMart04/EquipoA_ErnestoInvestingAI/pages`.

## En curso (estado exacto)
- Nada. Todavía no hay código propio: el sitio es la base del profesor tal cual.

## Siguiente paso exacto
1. Prompt CC-F-01: modo Plan → `docs/plan/PLAN_IMPLEMENTACION.md` y tareas T-01 a T-29 en el tablero.

## Trampas conocidas
- `figma-src/` trae sus propios `.gitignore` y `.gitattributes`: son parte del export y no se tocan.
- `09.fechas[0]` es `"inicio"`, no una fecha (I-06).
- El Agresivo del backtesting del profesor usa tope 0,35 aunque `08` diga 25 % (I-06): se documenta, no se corrige.
- `es-PE` en `Intl` usa punto decimal (§10).
- Un `<select>` nativo no se abre con el puntero virtual (§9.3).

## Cómo probar
- `python -m http.server 8000` → http://127.0.0.1:8000
