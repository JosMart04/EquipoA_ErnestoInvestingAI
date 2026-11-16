# PROMPTS INICIALES — EquipoA_ErnestoInvestingAI

Copiar y pegar **completos**. Van en el estilo ESLBHP del profesor (etiquetas `role`, `context`, `task`, `constraints`, `output`, `verification`). Cada IA copia el prompt que recibe, literal, en `docs/ia/prompts/<CC|CX|OP>.md` (después se compila en `PROMPTS_USADOS.md`).

| Orden | Cuándo | Herramienta | Prompt |
|---|---|---|---|
| 0 | Lun 13:30 | Josué (PowerShell) | Preparar el repo: PLAN_MAESTRO §15.1 |
| 1 | Lun 14:00 | **Claude Code · Fable 5.2 · modo Plan** | **CC-F-01** |
| 2 | Lun 14:00 | **Codex · GPT-6 Astra** | **CX-01** |
| 3 | Mar 09:00 | Claude Code · Opus 5.5 | **CC-O-01** (relevo) |
| 4 | Mar–mié | Claude Code · Opus 5.5 | **CC-O-MOD** (P03–P07 del profesor + extensiones) |
| 5 | Mié | Codex | **CX-02** (pruebas y CI) |
| 6 | Jue | Codex | **CX-03** (auditoría P08) |
| 7 | Jue–vie | Codex | **CX-04** (README, PROMPTS_USADOS, informe) |
| 8 | Vie (solo si todo verde) | Claude Code · Opus 5.5 | **CC-O-VOZ** |
| 9 | Vie (opcional) | Codex | **CX-05** (video) |

**Cómo pasar mensajes:** cuando una IA imprima un bloque `📨 MENSAJE PARA CX` (o CC), cópialo tal cual y pégalo en la otra IA con: «Mensaje de la otra IA (también está en docs/ia/BITACORA.md):» + el bloque. Antes, pide a la otra IA que haga `git pull`.

---

## 1 · CC-F-01 — Fable 5.2 en **modo Plan** (lunes, hoy)

**Antes de pegarlo:**

1. Abre Claude Code en `$HOME\Dev\EquipoA_ErnestoInvestingAI`.
2. Elige el modelo **Fable 5.2**.
3. Pulsa `Shift+Tab` hasta ver «plan mode».
4. Pega el prompt.
5. Cuando presente el plan, revísalo y apruébalo. Para avanzar rápido, elige que acepte ediciones automáticamente.

```xml
<prompt id="CC-F-01" nombre="Fable: plan de implementación y base del sistema Ernesto Investing AI">
  <role>
Eres el arquitecto y desarrollador front-end principal del sistema Ernesto Investing AI (IHC 2026-II, FISI-UNMSM, Equipo A).
Dominas HTML, CSS y JavaScript sin frameworks, accesibilidad WCAG 2.2 AA, visualización con ECharts, optimización de portafolios (Markowitz, NSGA-II, NSGA-III) y visión por computadora en el navegador con MediaPipe.
Eres riguroso: no das nada por hecho sin evidencia ejecutada.
  </role>
  <context>
- Repositorio: JosMart04/EquipoA_ErnestoInvestingAI (esta carpeta). Lee primero CLAUDE.md.
- Fuente de verdad, en este orden: docs/contexto/GUIA_PROFESOR_S13.pdf (la guía; léela COMPLETA), docs/contexto/PLAN_MAESTRO.md (léelo COMPLETO: decisiones D-01 a D-15, requisitos R-*, contrato §5, arquitectura §4, algoritmos §7, diseño §8, accesibilidad §9, i18n §10, propiedad de rutas §13.2, cronograma §14, protocolo §15).
- Código base del profesor: index.html, watchlist.html, trading.html, leaderboard.html, 5 páginas stub, js/common.js, js/stub.js, css/styles.css; data/ con 13 JSON que NUNCA se modifican.
- HOY (lunes 16-nov-2026) es tu ÚNICO día de trabajo. Desde mañana continúa Claude Code con Opus 5.5, que retomará leyendo docs/plan/PLAN_IMPLEMENTACION.md y docs/ia/HANDOFF.md. Tu plan debe ser lo bastante detallado para que otro modelo lo ejecute sin ambigüedad.
- En paralelo trabaja Codex (GPT-6 Astra) en pipeline/, data_real/, tools/validar_contrato.py, tests/e2e|a11y|datos, .github/workflows y docs del informe. No toques sus rutas.
- Entrega: viernes 20-nov-2026 a las 16:00 (límite 18:00). Mockups de Figma Make a cargo de Opus 5.5 en otro chat: https://www.figma.com/make/BWA9B3JoRbAWZiVoPSyoBO
  </context>
  <task>
FASE A — MODO PLAN (no escribas archivos todavía)
1. Lee la guía, el PLAN_MAESTRO, CLAUDE.md y todo el código base. Revisa el estado real del repo: git status, estructura, y SHA-256 de data/ contra el Anexo B.3 del plan.
2. Presenta un PLAN DE IMPLEMENTACIÓN detallado con tareas atómicas T-01, T-02, … Cada tarea lleva: objetivo; archivos; R-IDs que cubre; dependencias; criterio de aceptación verificable; estimación; responsable (CC-F hoy / CC-O desde el martes / CX); orden. Debe incluir:
   a) La API definitiva de js/common.js (firmas y eventos), compatible con $, fmt, loadJSON y store de la base.
   b) La estructura de i18n y de los componentes comunes (ficha IA, avisos por modo, tabla ordenable, contenedor de gráfico con Gráfico/Tabla/Resumen/Escuchar, control de modo, menú móvil).
   c) El contrato de datos refinado (docs/CONTRATO_DATOS.md v1.0.0) a partir de §5.
   d) El diseño de js/lib (símplex con tope, Markowitz, NSGA-II, NSGA-III, backtest, estadística) y de los Workers, con su estrategia de pruebas unitarias.
   e) El plan por módulo (9), indicando qué prompt del profesor (P03 a P07) se usa en cada uno y qué <extensiones_equipo> se agregan.
   f) El plan de accesibilidad: bus de entrada, puntero virtual, barrido, cámara, cabeza-mirada, manos y voz (última fase).
   g) Los riesgos técnicos y cómo verificarás cada uno.
3. Señala con franqueza cualquier contradicción, hueco o idea poco realista del PLAN_MAESTRO frente a la guía o frente al tiempo disponible, y propone la corrección.

FASE B — DESPUÉS DE MI APROBACIÓN
4. Escribe docs/plan/PLAN_IMPLEMENTACION.md y docs/CONTRATO_DATOS.md (v1.0.0). Agrega tus tareas y las de CX a docs/ia/TABLERO.md. Copia este prompt literal en docs/ia/prompts/CC.md.
5. Ejecuta en este orden de prioridad (§14, lunes), con una rama cc/T-xx por bloque y un PR por bloque:
   (1) núcleo: js/common.js y css/styles.css (modo profesor/real, capa de datos, estado, i18n, cabecera con menú móvil, avisos, ficha IA, tabla ordenable, contenedor de gráfico, tema que también cambia los gráficos);
   (2) docs/CONTRATO_DATOS.md;
   (3) js/lib + js/workers + tests/unit;
   (4) núcleo de accesibilidad: bus-entrada, puntero, camara, cabeza-mirada, manos y panel de preferencias, en una versión funcional mínima;
   (5) el módulo de Clasificación completo como MÓDULO DE REFERENCIA, que los demás imitarán.
   Haz merge a main solo con las pruebas en verde.
6. Al terminar CADA bloque:
   - actualiza docs/ia/HANDOFF.md (hecho; en curso; siguiente paso exacto; trampas conocidas; cómo probar);
   - agrega un mensaje en docs/ia/BITACORA.md;
   - imprime en el chat el bloque «📨 MENSAJE PARA CX» si algo le afecta (por ejemplo la API de datos, el contrato o los selectores para pruebas E2E).
7. Si te escribo «cierra», o si notas que se acaba tu sesión, deja HANDOFF.md impecable para Opus 5.5 y haz commit de todo.
  </task>
  <constraints>
- Nunca modificar data/. Nunca escribir secretos.
- HTML + CSS + JS puro, sin compilación ni frameworks. ECharts 5.5.1 desde https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js. MediaPipe Tasks Vision 1.2.3 solo bajo demanda, al activar la cámara.
- Un solo css/styles.css y un solo js/common.js; nada duplicado.
- El Modo profesor es el que se abre por defecto y cumple la guía al pie de la letra; tiene prioridad absoluta sobre el Modo real y sobre la accesibilidad avanzada.
- Clasificación solo SUBE/BAJA. Color nunca como único canal (palabra + ▲/▼). Contraste ≥ 4,5:1 en claro y oscuro. Teclado completo, foco visible y «Saltar al contenido». Alternativa en tabla para cada gráfico. Sin desborde horizontal a 390 px.
- Ninguna cifra escrita a mano: todo se lee de data/ o data_real/ (o se deriva y se declara).
- Comentarios del código en español. Textos visibles mediante i18n (ES-PE y EN-US), sin concatenar cadenas.
- Respeta la propiedad de rutas (§13.2) y el protocolo de mensajes (§15.4).
  </constraints>
  <output>
Fase A: el plan completo en el chat, para mi aprobación.
Fase B: archivos, commits y PR. Al final de cada bloque, un resumen breve más los bloques 📨.
  </output>
  <verification>
- python -m http.server 8000: las 9 páginas cargan sin errores de consola en ambos modos (el real puede mostrar «sin datos todavía» si CX no publicó data_real/).
- tests/unit pasa (node --test o el runner que definas).
- Clasificación: 468 celdas; solo SUBE/BAJA; filtros; métricas ordenables con teclado; sin desborde a 390 px.
- data/ con los mismos SHA-256 del Anexo B.3.
  </verification>
</prompt>
```

---

## 2 · CX-01 — Codex (GPT-6 Astra): pipeline de datos reales (lunes, hoy)

**Antes de pegarlo:** abre Codex en la misma carpeta del repo, con el modelo `gpt-6-astra` y razonamiento alto. Antes de cada tarea, haz `git pull`.

```xml
<prompt id="CX-01" nombre="Codex: pipeline de datos reales y validador del contrato">
  <role>
Eres un ingeniero de datos y de machine learning financiero, riguroso con la validación temporal: sin fugas, sin mirar el futuro.
Escribes Python 3.12 limpio, reproducible y probado.
  </role>
  <context>
- Repositorio: JosMart04/EquipoA_ErnestoInvestingAI. Lee primero AGENTS.md.
- Fuente de verdad: docs/contexto/GUIA_PROFESOR_S13.pdf y docs/contexto/PLAN_MAESTRO.md (lee COMPLETAS las §1–6, §11, §13–17 y el Anexo B).
- Tu frente: F6 (pipeline real). Más adelante, F7 (pruebas), F8 (auditoría), F9 (informe) y F12 (video).
- Tus rutas: pipeline/, data_real/, tools/validar_contrato.py, tests/fixtures/, .github/workflows/actualizar-datos.yml.
- Claude Code (Fable hoy, Opus desde mañana) construye el sitio (html, css, js). No toques sus rutas.
- El sitio lee data_real/ con EXACTAMENTE el mismo esquema que data/ (13 archivos del profesor, intocables) más las extensiones de §5.4.
- Yahoo Finance no se puede llamar desde el navegador. Por eso los datos se generan en GitHub Actions cada día hábil a las 22:15 UTC.
  </context>
  <task>
1. Copia este prompt literal en docs/ia/prompts/CX.md. Trabaja en la rama cx/T-30-pipeline-base.
2. tools/validar_contrato.py: valida un directorio de datos contra §5.2 (I-01 a I-08), §5.4 y las verificaciones de la guía (R-REG-09, R-OPT-09, R-BT-06, 468 celdas, solo SUBE/BAJA). Con --modo profesor verifica además los SHA-256 del Anexo B.3. Debe pasar sobre data/ HOY.
3. pipeline/ v0, siguiendo §6.3 etapas 1 y 2: descarga con yfinance (reintentos, caché, alineación al calendario de NYSE, verificación del ticker B) y mercado.py. Genera 01, 02, 03, 04, 10, 11, 12, 13, precios/<T>.json, cierres_historicos.json, cortes/index.json y meta.json en data_real/. Ejecútalo en local y valida.
4. .github/workflows/actualizar-datos.yml según §6.5 (diario, cortes y completo). Escritura atómica: se publica solo si el validador pasa.
5. Etapas 3 a 8 (§6.3), en este orden: variables → 11 clasificadores ML → 11 regresores ML → 7 DL (PyTorch CPU) → 07 (cvxpy + pymoo) → 08 → 09. Usa validación sin mirar el futuro, con embargo de 30 sesiones, y agrega tasa_base_sube. Mide los tiempos y respeta el presupuesto de §6.4.
6. Exporta tests/fixtures/opt_referencia.json (μ, Σ, frontera de cvxpy y backtest de referencia), para que CC pruebe sus algoritmos JS contra los tuyos.
7. Tras cada bloque: actualiza tus filas en docs/ia/TABLERO.md, agrega un mensaje en docs/ia/BITACORA.md e imprime «📨 MENSAJE PARA CC» cuando algo le afecte (por ejemplo: «data_real v0 lista», «nuevo campo opcional», «propuesta CAMBIO-CONTRATO»).
  </task>
  <constraints>
- No modificar data/. Cero secretos: yfinance no necesita clave.
- No cambiar el esquema sin el protocolo CAMBIO-CONTRATO y el ACK de CC (§15.4).
- Los nombres de los 36 modelos deben coincidir carácter por carácter con §5.1. Solo dos clases (SUBE/BAJA).
- Semilla 2026. Versiones fijadas en pipeline/requirements.txt (§6.2).
- Publicar los resultados tal como salgan: está prohibido ajustar para que las carteras «ganen».
- data_real/ ≤ 15 MB. Atribución de Yahoo/yfinance en meta.json y en 13.
- Si algo del plan resulta irreal (tiempos, una librería que no instala, el ticker B), dilo y propone una alternativa en DECISIONES.md.
  </constraints>
  <output>Código en pipeline/ y tools/, data_real/ generado y validado, workflow, fixtures y mensajes 📨. Al final de cada bloque, un resumen con los tiempos medidos.</output>
  <verification>
- python tools/validar_contrato.py data --modo profesor → OK (incluye SHA-256).
- python -m pipeline.ejecutar --salida data_real --modo completo → OK, y luego python tools/validar_contrato.py data_real --modo real → OK.
- Una ejecución manual del workflow en GitHub Actions en verde, con su commit de datos.
- Las métricas fuera de muestra se informan sin maquillaje. Si la exactitud supera el 60 %, sospecha de fuga de información y revísalo.
  </verification>
</prompt>
```

---

## 3 · CC-O-01 — Relevo a Opus 5.5 (martes por la mañana)

```xml
<prompt id="CC-O-01" nombre="Opus 5.5: relevo de Fable y continuación">
  <role>Eres el desarrollador front-end principal que continúa el trabajo de Fable 5.2 en Ernesto Investing AI. Mismas competencias y el mismo rigor.</role>
  <context>
Lee, en este orden: CLAUDE.md; docs/ia/HANDOFF.md; docs/plan/PLAN_IMPLEMENTACION.md; docs/ia/TABLERO.md; docs/ia/BITACORA.md (los últimos 15 mensajes); docs/contexto/PLAN_MAESTRO.md (§2, §4, §8, §9, §13–§17); y la guía en docs/contexto/GUIA_PROFESOR_S13.pdf.
Revisa git log de los últimos 2 días y el estado de la CI.
  </context>
  <task>
1. Copia este prompt literal en docs/ia/prompts/CC.md.
2. Resume en 10 líneas el estado real: lo verificado como hecho, lo que está a medias y lo bloqueado. Contrasta HANDOFF con el código y no confíes ciegamente.
3. Continúa con las tareas del cronograma (§14, martes a jueves) en el orden del PLAN_IMPLEMENTACION, una rama cc/T-xx por bloque.
4. Para cada módulo nuevo usa el prompt CC-O-MOD correspondiente (te lo daré con el prompt del profesor).
5. Mantén HANDOFF, TABLERO y BITACORA al día y emite 📨 cuando afecte a CX.
  </task>
  <constraints>Las mismas de CC-F-01 (no modificar data/; sin frameworks; un solo CSS y un solo JS común; Modo profesor primero; WCAG 2.2 AA; solo SUBE/BAJA; i18n; propiedad de rutas).</constraints>
  <output>El resumen de estado, luego trabajo incremental con PR y mensajes.</output>
  <verification>El mismo criterio de terminado de PLAN_MAESTRO §17 para cada módulo.</verification>
</prompt>
```

---

## 4 · CC-O-MOD — Módulos con los prompts del profesor (martes y miércoles)

**Uso (D-14):** pega el prompt del profesor **literal** del Anexo A de la guía (P03, P04, P05, P06 o P07), rellenando los corchetes. Si el enlace de Figma aún no está listo, pon el enlace de Make. Justo debajo, pega el bloque de extensiones de ese módulo. Así `PROMPTS_USADOS.md` muestra que se siguió el flujo obligatorio.

**Encabezado común (va primero, encima del prompt del profesor):**

```text
Contexto del equipo: antes de empezar lee CLAUDE.md, docs/ia/HANDOFF.md y la sección del módulo en docs/contexto/PLAN_MAESTRO.md (§8.3).
Sigue el patrón del módulo de referencia (Clasificación). Copia ESTE mensaje completo, literal, en docs/ia/prompts/CC.md.
A continuación va el prompt del profesor tal cual y, después, las extensiones del equipo.
```

**Extensiones por módulo:**

```xml
<extensiones_equipo modulo="regresion" acompaña="P04">
- Doble modo (PLAN_MAESTRO §4.2): Modo profesor = P04 al pie de la letra; Modo real = data_real/ más un selector de fecha de corte y de ventana de historia.
- Ficha IA (§8.2); interruptores Banda (activado por defecto) y Cono (siempre disponible); chip de retorno con color + ▲/▼ + texto.
- Pestañas Gráfico/Tabla/Resumen/Escuchar (sonificación §9.2); tabla de 30 precios.
- Enlaces cruzados ← Clasificación y → Optimizador con ?t=; respeta la watchlist (★ y filtro).
- i18n ES-PE/EN-US con Intl; sin concatenar cadenas.
- Prueba R-REG-09 en los 26 activos de ambos modos.
</extensiones_equipo>

<extensiones_equipo modulo="optimizador" acompaña="P05">
- Modo profesor = P05 al pie de la letra (sin recálculo). Modo real = data_real/07 más «Recalcular en mi navegador» con ventana personalizada (Worker de §7, progreso, cancelar, etiqueta «recalculado en tu navegador»).
- NSGA-III con triángulos y escala de CVaR, que además aparece en la información emergente y en la tabla. Navegación por teclado del gráfico (←/→ puntos, ↑/↓ series, Enter selecciona, anuncio en aria-live) y tabla de puntos.
- Panel de composición con la comprobación visible «Suma 100,0 % · máx. 25,0 %» y el botón «Llevar a Trading» (§4.5).
- Elegibles con su razón; ?t= resalta el activo y explica si es elegible o no.
- El aviso cambia con el modo (§4.2): en el profesor, el texto literal de R-OPT-06.
</extensiones_equipo>

<extensiones_equipo modulo="portafolios-backtesting" acompaña="P06">
- Portafolios: elegir nivel con aria-pressed (G17); casillas «Excluir» con renormalización (G10); diálogo «Llevar a Trading» (§4.5); versión cuidada a 390 px.
- Backtesting: la interpretación se genera por reglas con plantillas i18n (§8.3 M9), sin texto fijo; línea de tiempo de rebalanceos accesible; fechas[0] = "inicio" no es una fecha (I-06). Documenta en un comentario la inconsistencia del tope del Agresivo (0,35 frente a 25 %).
- Modo real: selector de periodo + recálculo en un Worker (§7).
- Prueba R-BT-06 en ambos modos.
</extensiones_equipo>

<extensiones_equipo modulo="integracion" acompaña="P07">
- El punto 5 de P07 (script de Playwright) lo cubre la suite de CX en tests/: coordina por 📨 y no la dupliques; agrega solo lo que falte.
- Estado compartido completo (§4.5); control de modo e idioma en la barra superior; menú móvil < 900 px; scroll-padding-top para el foco.
- Centro de accesibilidad (§9.1) y las modalidades (a), (e), (f), (c) y (d) integradas en las 9 páginas.
</extensiones_equipo>
```

---

## 5 · CX-02 — Codex: pruebas y CI (miércoles)

```xml
<prompt id="CX-02" nombre="Codex: suite de pruebas E2E, accesibilidad, datos y CI">
  <role>Eres un ingeniero de calidad que escribe pruebas de caja negra a partir de la especificación, no a partir del código.</role>
  <context>Lee AGENTS.md, PLAN_MAESTRO §2 (todos los R-IDs), §11, §17 y la guía. Revisa HANDOFF.md y BITACORA.md. Tus rutas: tests/e2e, tests/a11y, tests/datos, tests/package.json y .github/workflows/qa.yml.</context>
  <task>
1. Copia este prompt literal en docs/ia/prompts/CX.md. Rama cx/T-50-pruebas.
2. Suite Playwright 1.65 + @axe-core/playwright 4.14 con la matriz de §11.1: 9 páginas × {1280, 390} × {claro, oscuro} × {profesor, real}.
3. Pruebas de las verificaciones del profesor y de los R-IDs (consola, desborde, navegación cruzada, estado compartido, aviso por modo, solo SUBE/BAJA, 468 celdas, R-REG-09, R-OPT-09, R-BT-06, i18n con Intl, tema de los gráficos).
4. qa.yml: validador del contrato + pruebas unitarias de CC + E2E + axe + escaneo de secretos, en cada PR.
5. Ejecuta todo y abre un issue por fallo real, con su evidencia. Envía a CC un 📨 con la lista priorizada.
  </task>
  <constraints>No edites html/css/js del sitio. Si una prueba falla por un error del sitio, repórtalo; no lo «arregles» relajando la prueba.</constraints>
  <output>Pruebas, workflow, informe de resultados e issues.</output>
  <verification>La CI corre en un PR de prueba; el informe lista cuántas pruebas pasan y cuántas fallan por R-ID.</verification>
</prompt>
```

---

## 6 · CX-03 — Codex: auditoría P08 (jueves)

Pega **literal el prompt P08 de la guía** y, debajo:

```xml
<extensiones_equipo acompaña="P08">
- Copia este mensaje literal en docs/ia/prompts/CX.md. Eres un revisor independiente: no construiste el sitio.
- Audita AMBOS modos. En el Modo real verifica además la atribución de Yahoo/yfinance, los avisos de datos reales y que no se presenten pronósticos como asesoría.
- Entrada: el código, la salida de axe-core de tests/a11y y la ejecución de tests/datos.
- Salida: docs/informe/auditoria_P08.md con la tabla «módulo | hallazgo | evidencia (cita literal del código) | severidad | corrección propuesta», más las secciones «No verificable» y «Criterios aparentemente cumplidos», todo marcado como HIPÓTESIS PARA VERIFICAR.
- Envía a CC un 📨 con los hallazgos de severidad alta.
</extensiones_equipo>
```

---

## 7 · CX-04 — Codex: README, PROMPTS_USADOS e informe (jueves y viernes)

```xml
<prompt id="CX-04" nombre="Codex: documentación, PROMPTS_USADOS e informe PDF">
  <role>Eres redactor técnico y diseñador de documentos académicos en español (Perú), claro y honesto.</role>
  <context>Lee AGENTS.md, la guía completa (en especial §6.2, R-ENT-04 y R-ENT-05), PLAN_MAESTRO §1, §3, §12 y §17, HANDOFF.md, BITACORA.md, DECISIONES.md, docs/informe/auditoria_P08.md y docs/ia/prompts/*.md. Integrantes: Anexo A / §1.2.</context>
  <task>
1. Copia este prompt literal en docs/ia/prompts/CX.md.
2. README.md: qué es el sistema; los dos modos; cómo ejecutarlo (python -m http.server 8000); enlaces de Figma y de Pages; integrantes con alias; tecnologías; accesibilidad; actualización diaria de datos; licencias (CC BY 4.0 del material base con atribución, Yahoo/yfinance, MediaPipe y fuentes); declaración de IA.
3. PROMPTS_USADOS.md: compila LITERALMENTE docs/ia/prompts/CC.md, CX.md y OP.md en orden cronológico, con herramienta y modelo. Incluye la nota sobre P01 (§12.2, punto 7).
4. docs/informe/S13_EquipoA_Informe.pdf (8 a 12 páginas), con carátula UNMSM-FISI con la lista del equipo y sus códigos. Contenido: arquitectura; decisiones de diseño por módulo con las pautas de Amershi; capturas de docs/capturas en claro, oscuro, 390 px y ambos modos; interpretación del backtesting en ambos modos; accesibilidad; limitaciones (incluidas la inconsistencia del tope del Agresivo, la precisión de la mirada con webcam y la diferencia de coma y punto decimal por Intl); tabla de verificación P08; declaración de uso de IA.
5. docs/guia-usuario/accesibilidad.md: guía de uso de cada modalidad y de los atajos.
  </task>
  <constraints>Nada inventado: cada afirmación debe salir del repo, de la bitácora o de la ejecución. Cifras verificables. El texto que se entrega no debe exceder 12 páginas.</constraints>
  <output>Los archivos y el PDF, más un 📨 a Josué con la lista de lo que falta revisar a mano.</output>
  <verification>Abrir el PDF y contar las páginas; comprobar que los enlaces funcionan y que cada captura corresponde a la versión final.</verification>
</prompt>
```

---

## 8 · CC-O-VOZ — Comandos de voz (viernes; solo si todo está en verde)

```xml
<prompt id="CC-O-VOZ" nombre="Opus 5.5: comandos de voz (última fase)">
  <role>Desarrollador front-end de accesibilidad.</role>
  <context>PLAN_MAESTRO §9.3 y §9.7. El bus de entrada ya existe en js/a11y/bus-entrada.js. Solo se hace si la CI está en verde y el congelamiento lo permite.</context>
  <task>Implementa js/a11y/voz.js con la gramática de §9.7 en ES-PE y EN-US, con confirmación hablada y visual, el aviso de privacidad de Chrome, ocultación con explicación en navegadores sin soporte y pruebas. Copia este prompt en docs/ia/prompts/CC.md.</task>
  <constraints>No romper nada de lo existente: si una prueba falla, se revierte. La función va detrás de un interruptor en el Centro de accesibilidad.</constraints>
  <output>PR cc/T-90-voz con la CI en verde.</output>
  <verification>Los 10 comandos de §9.7 funcionan en Chrome en ambos idiomas.</verification>
</prompt>
```

---

## 9 · CX-05 — Codex: video (viernes, opcional)

```xml
<prompt id="CX-05" nombre="Codex: video de presentación con ElevenLabs">
  <role>Productor de video técnico.</role>
  <context>El video es opcional (D-11). Usa el sitio publicado y docs/guia-usuario. La clave de ElevenLabs va SOLO en una variable de entorno local (ELEVENLABS_API_KEY) y nunca se commitea. El video y el audio quedan fuera del repo (video/ está en .gitignore); en el README va solo el enlace.</context>
  <task>
1. Guion de 3 a 4 minutos en español (Perú): problema, los dos modos, recorrido por los 9 módulos, accesibilidad (barrido, cabeza/mirada, manos, sonificación) y honestidad de los modelos.
2. Grabación con Playwright (recordVideo, 1920×1080) siguiendo el guion.
3. Voz con ElevenLabs (modelo eleven_v3, idioma es) y música de fondo con Eleven Music (o desde la web de ElevenLabs si la API no está en el plan).
4. Montaje con ffmpeg (subtítulos SRT incrustados para accesibilidad) o entrega de los recursos para DaVinci Resolve.
5. Copia este prompt literal en docs/ia/prompts/CX.md.
  </task>
  <constraints>Sin secretos en el repo. Las cifras que se mencionen deben coincidir con lo que se ve en pantalla.</constraints>
  <output>video/S13_EquipoA_Video.mp4 + .srt, fuera del repo, y el enlace en el README cuando Josué lo suba.</output>
  <verification>Ver el video completo; comprobar que los subtítulos están sincronizados y que la duración es de 3 a 4 minutos.</verification>
</prompt>
```
