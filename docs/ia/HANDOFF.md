# HANDOFF — estado para quien retome

> Lo actualiza **Claude Code al terminar cada bloque** (hoy Fable, que solo está disponible el lunes 16-nov; desde el martes, Opus 5.5).
> Opus: contrasta este archivo con el código y con `git log`; no confíes ciegamente.

## Última actualización
- Fecha y hora: 2026-11-16 15:45 (Lima)
- Modelo: Claude Fable 5.2 (Claude Code)
- Rama / último commit: `cc/T-01-plan` → PR-1 (plan + contrato)

## Hecho (con evidencia)
- **CC-F-00:** repo creado desde la base del profesor (`e9d711e`), `figma-src/` sin editar, Pages activo. SHA-256 de `data/`: 13/13.
- **T-01:** `docs/plan/PLAN_IMPLEMENTACION.md` aprobado por Josué; tablero con T-01…T-29; D-17…D-21; `.nojekyll`.
- **T-02:** `docs/CONTRATO_DATOS.md` v1.0.0. C-01 y C-02 enviados a CX (esperan `ACK`).

## En curso (estado exacto)
- Nada a medias. Lo siguiente es el PR-2 (núcleo).

## Siguiente paso exacto
1. Rama `cc/T-03-nucleo`: T-03 a T-07 del plan §11 (`js/common.js`, `css/styles.css`, `i18n/*.json`, las 9 páginas sobre el shell nuevo, `tests/unit/nucleo.*.test.mjs`).
2. Luego T-08 (Clasificación), T-09…T-13 (`js/lib` + Workers) y T-14…T-16 (accesibilidad), en ese orden (D-18).

## Trampas conocidas
- **R-REG-09 literal falla en 5 activos** de `data/` por redondeo: se verifica con I-03b (contrato §4 y nota N-1).
- **El 1/N del profesor es de rebalanceo diario** (contrato I-10, nota N-2).
- **El «Agresivo» de `08` rinde menos que el «Moderado»** (nota N-4): no escribir textos que afirmen un orden entre niveles.
- **La base incumple contraste en oscuro** (blanco sobre `--ac` = 2,08:1): usar `--on-ac`.
- `09.fechas[0]` es `"inicio"`, no una fecha (I-06).
- El Agresivo del backtesting del profesor usa tope 0,35 aunque `08` diga 25 % (nota N-3): se documenta, no se corrige.
- `es-PE` en `Intl` usa punto decimal: `+2.93%`, `USD 355.63`. Las fechas ISO se formatean en **UTC** (en Lima se correrían un día).
- Un `<select>` nativo no se abre con el puntero virtual (§9.3).
- `figma-src/` trae sus propios `.gitignore` y `.gitattributes`: son parte del export y no se tocan.
- Aún no hay CI: se fusiona con puerta local (plan §13).

## Cómo probar
- `python -m http.server 8000` → http://127.0.0.1:8000
- `node --test tests/unit/` (cuando exista `tests/unit/`)
