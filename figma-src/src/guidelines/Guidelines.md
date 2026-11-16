# Guidelines — Ernesto Investing AI (mockups del Equipo A)

These guidelines describe the design system used by these mockups. Any later change made with Figma Make prompts must follow them.

## Product
- Educational stock-market website for the course Interacción Hombre-Computador (FISI-UNMSM). 9 modules: Dashboard, Watchlist y alertas, Trading simulado, Leaderboard, Clasificación, Regresión 30 días, Optimizador, Portafolios, Backtesting.
- Two data modes: **Modo profesor** (synthetic data from the course JSON files, the default) and **Modo real** (Yahoo Finance + trained models). In these mockups all numbers come from the professor's synthetic JSON; real-mode screens are labelled «vista de diseño · datos de ejemplo».

## Non-negotiable rules
- Classification is **binary**: only SUBE (▲) or BAJA (▼). Never NEUTRO, MANTENER or HOLD.
- Color is never the only channel: always the word + ▲/▼ symbol; series also differ by dash pattern, marker or direct label.
- Text contrast ≥ 4.5:1 in light and dark themes. Visible focus ring (3px, `--ac`). «Saltar al contenido» link.
- Every prediction, optimization and backtesting screen shows the notice «Datos sintéticos · resultados simulados» (or the module-specific text).
- Every chart has a table alternative and a plain-language summary (tabs Gráfico / Tabla / Resumen / Escuchar).
- No horizontal page scroll at 390 px.
- Do not invent numbers: they come from `src/data/muestra.ts`.
- Do not use real brand logos.

## Tokens
- Palette: `--ac #0B4F9C` (blue), `--up #0A7D3C` (green), `--dn #B3261E` (red), `--warn #8A5A00`; dark theme variants in `styles/globals.css`.
- Chart series: Okabe-Ito palette `#0072B2 #E69F00 #009E73 #CC79A7 #56B4E9 #D55E00`.
- Radius 12px cards, 8px controls. Spacing 4/8/12/16/24/32. Touch targets ≥ 44px on mobile.

## Human-AI guidelines (Amershi et al.)
Each prediction module starts with a «Ficha IA» card: Qué hace (G1) · Qué tan bien lo hace (G2) · Por qué (G11) · Qué controlas (G17) · Cómo ignorarlo (G10).
