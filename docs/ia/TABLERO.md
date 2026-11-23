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
| T-26 | Modo real en los 9 módulos, cortes y recálculo en Workers | CC-O | hecho | PR #24 | D-02, D-03 | Revisado con los datos del PR #22: 9 páginas sin errores; recálculo en Workers (Backtesting 0,4 s, Optimizador 1,7 s) con «Volver a los datos del archivo»; cortes del más reciente al más antiguo; textos que solo valían para el curso corregidos |
| T-27 | A11y (a) completa y (e) barrido | CC-O | hecho | PR #20 | D-07 a/e/f, R-A11Y-05 | Exploración punto a punto con tono y anuncio, resumen automático por serie, «Leer en voz alta», consenso sonoro en Clasificación, barrido de 6 grupos, fuente legible y cursor grande. Corrige el aria-label en inglés de ECharts |
| T-28a | **Arreglo:** la cámara se congelaba al primer segundo (el HUD sacaba el `<video>` del documento); vigilante del video; gestos de mano (D-22); histéresis del puntero; recorrido de la cabeza | CC-O | hecho | PR #8 | D-07 c/d | Verificado con MediaPipe real y video falso, y **por Josué con la webcam de su laptop el 17-nov: funciona** |
| T-28 | A11y (c) y (d) completas | CC-O | hecho | PR #25 | D-07 c/d, D-23 | Calibración de 5 puntos de la cabeza con interfaz (HUD «Calibrar», Esc cancela, se quita en el Centro); tarjeta de gestos con SVG propios (HUD «Gestos» y Centro); «V» de dos dedos para desplazar. Sin deslizar ni pulgar arriba (D-23). Sin ajuste fino con el iris. **Josué la validó con su webcam el 17-nov** |
| T-29 | Conformidad con Figma, correcciones de QA y P08, congelamiento | CC-O | en revisión | PR #23 (#21) · PR #26 (Figma) · cc/T-29-auditoria-p08 · PR #29 | R-FLU-01/06 | Auditoría P08 de CX: H-01 (#28), H-02 y H-03 reproducidos y corregidos con evidencia. Las capturas del informe revelaron tres detalles visuales (título del eje Y del Optimizador, etiquetas finales del Backtesting, casilla «Fuente legible»), corregidos en cc/T-61-entregables. Queda el congelamiento (jue 20:00) |
| T-30 | Validador del contrato (ambos modos, SHA-256 de data/) | CX | hecho | PR #22 (fusionado) | R-DAT-*, I-01…I-11 | Validador I-01…I-11 aprobado en profesor y real; discrepancia literal preservada; pruebas de corrupción y temporalidad. |
| T-31 | Pipeline v0: descarga + mercado (01, 02, 03, 04, 10, 11, 12, 13, precios, cierres, meta) | CX | hecho | PR #22 (fusionado) | D-03, D-04 | 01–13, precios, meta y doce cortes generados/validados al 2026-11-16; 12,69 MB. Fusionado en el Fusionado en el PR #22. |
| T-32 | Workflow actualizar-datos.yml (diario, cortes, completo) | CX | hecho | PR #22 (fusionado) | D-04 | Autorizado por Josué el 17-nov: diario L–V 22:15 UTC y cortes domingo 06:00 UTC. Solo data_real/** tras validar, artefacto conservado y push sin force; integrado en el PR #22; desde D-24 lo mantiene CC. |
| T-33 | 11 clasificadores ML + 05 real | CX | hecho | PR #22 (fusionado) | R-CLA-* | Corte 2026-11-16 generado y validado con modelos reales y prueba externa; fusionado en PR #22. Doce cortes históricos listos (T-38). |
| T-34 | 11 regresores ML + 06 real | CX | hecho | PR #22 (fusionado) | R-REG-* | Corte 2026-11-16 generado y validado con modelos reales y prueba externa; fusionado en PR #22. Doce cortes históricos listos (T-38). |
| T-35 | 7 DL (clasificación y regresión) | CX | hecho | PR #22 (fusionado) | R-CLA-*, R-REG-* | Corte 2026-11-16 generado y validado con modelos reales y prueba externa; fusionado en PR #22. Doce cortes históricos listos (T-38). |
| T-36 | 07 optimizador (cvxpy + pymoo) + 08 portafolios | CX | hecho | PR #22 (fusionado) | R-OPT-*, R-POR-* | Corte 2026-11-16 generado y validado con modelos reales y prueba externa; fusionado en PR #22. Doce cortes históricos listos (T-38). |
| T-37 | 09 backtesting real | CX | hecho | PR #22 (fusionado) | R-BT-* | Corte 2026-11-16 generado y validado con modelos reales y prueba externa; fusionado en PR #22. Doce cortes históricos listos (T-38). |
| T-38 | Cortes históricos (12 fines de mes) | CX | hecho | PR #22 (fusionado) | D-03 | Doce cierres mensuales (nov-2025 a oct-2026), 432 resultados reales; versiones de precios y hashes conservados. Validador y pruebas de corrupción pasan. Fusionado en el PR #22. |
| T-39 | Fixtures de referencia para las pruebas JS | CX | hecho | PR #7 (fusionado) | §7.3 | opt_referencia.json: 35 puntos independientes con cvxpy; activa la prueba JS pendiente. Fixture de backtest queda pendiente. |
| T-50 | Suite E2E + axe + datos | CX | hecho | PR #22 (fusionado) | §11 | 132 JS, 31 Python, 244/244 navegador locales (228 + 16), 72/72 axe sin violaciones; contraste #21 corregido. Nuevos E2E T-26/T-28/T-29. P08 identifica tres hallazgos aparte. |
| T-51 | qa.yml (CI) + escaneo de secretos | CX | hecho | PR #22 (fusionado) | R-ETI-03 | CI de resolución 4c62ca3 verde (228 casos); la entrega P08 amplía a 244. Sin exclusiones axe. |
| T-60 | Auditoría P08 | CX | hecho | PR #22 (fusionado) · docs/informe/auditoria_P08.md | R-FLU-06 | Entregada con prompt literal, citas, JSON y tres capturas: H-01 alta (historia futura en corte antiguo), H-02/H-03 medias (veracidad). Evidencia humana MSG-1957. CC reprodujo y corrigió los tres hallazgos (PR #29). |
| T-61 | README + PROMPTS_USADOS.md | CC-O (D-24) | hecho | PR #31 · PR #34 | R-ENT-02, R-ENT-05 | README profesional y «About» de GitHub (PR #31). `PROMPTS_USADOS.md`: 21 entradas literales de OP, CC y CX en orden cronológico, generado con `tools/compilar_prompts.mjs` (autorizado por Josué el 18-nov) |
| T-62 | Informe PDF S13_EquipoA_Informe.pdf | CC-O (D-24) | hecho | PR #34 | R-ENT-04 | 10 páginas con la carátula del equipo; 10 figuras; cifras leídas de los JSON (`tools/informe/`). **Josué lo revisó y lo aprobó el 18-nov** |
| T-63 | Guía de accesibilidad para el usuario | CC-O (D-24) | hecho | PR #34 | §9 | `docs/guia-usuario/accesibilidad.md` |
| T-64 | Video (opcional) | HUM (D-24) | pendiente | | D-11 | |
| T-70 | Mockups de Figma Make + importación | OP | hecho | fuera del repo | R-FLU-01 | https://www.figma.com/make/BWA9B3JoRbAWZiVoPSyoBO |
| T-71 | Compartir Figma (solo lectura) + figma-src/ sin editar | JM | hecho | main | R-FLU-02, R-ENT-01 | |
| T-80 | Pruebas humanas por rol | HUM | pendiente | issues | §11, Anexo A | |
| T-90 | Comandos de voz (última fase) | CC-O | hecho | PR #30 y PR #32 | D-07 (b) | Josué la validó con su micrófono el 17-nov. PR #32: «clic en» por palabras, con números dichos, opciones de listas y elección numerada entre botones repetidos. **Josué validó también estas mejoras con su micrófono** |
| T-100 | i18n: etiqueta «antes» y medición de truncados y desbordes (versión A) | CC-O | hecho | PR #39 | Lab 13 L.4 pasos 2-3; Spec G.5.5 | Etiqueta `i18n-antes`; `js/lib/i18n-calidad.js` (medir() y pseudolocalización del kit); `tools/i18n/medir_i18n.mjs`; CSV A es-PE/en-US |
| T-101 | i18n: núcleo (locales/ y manifiesto, respaldo, dir, zona horaria, Collator, pseudolocalización, fachada I18N), selector por endónimo, Configuración, colores, hreflang | CC-O | en revisión | cc/T-101-i18n-nucleo | Spec G.5.1-6; Lab L.5 | 170 pruebas JS; auditoría en vivo desde Configuración |
| T-102 | i18n: RTL (CSS lógico, ECharts espejado, teclado, fuentes, flechas, bidi) | CC-O | en revisión | cc/T-102-rtl | Spec G.5.2 | 30 reglas a CSS lógico; RTL no agrega desbordes (qps-plocm = qps-ploc) |
| T-103 | Traducciones de la guía: ar-EG, ja-JP, qu-PE (borradores) + voz | CC-O | pendiente | | Spec G.1.3, G.5.7 | |
| T-104 | Traducciones extra: he-IL, zh-CN, ko-KR, hi-IN, ru-RU, pt-BR, fr-FR, de-DE (borradores) | CC-O | pendiente | | D-25 | |
| T-105 | i18n: medición B, capturas antes/después, notebook, guía técnica, README | CC-O | pendiente | | Lab L.6-7; Spec G.9 | |
