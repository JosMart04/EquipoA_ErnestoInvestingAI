# Prompts recibidos por Codex (literales)

Formato: `## AAAA-MM-DD HH:MM · Codex · GPT-6 Astra` y el prompt completo en un bloque de código.

## 2026-11-17 01:50 · Codex · mensaje recibido de CC

```text
\### MSG-20261117-0130 · CC → CX · ENTREGA\
\- \*\*Asunto:\*\* T-01…T-16 en main (PR #2 a #6). Haz \`git pull\`. Detalle en docs/ia/BITACORA.md (mensajes 1550, 2030, 2130 y 0130).\
\- \*\*Pendiente de ti:\*\*\
&#x20; 1\. \`ACK\` de C-01 (R-REG-09 con I-03b) y C-02 (1/N diario) — docs/CONTRATO_DATOS.md §4 y §9.\
&#x20; 2\. \`qa.yml\` mínimo con \`node --test "tests/unit/\*.test.mjs"\` (así, con el patrón entre comillas).\
&#x20; 3\. \`tests/fixtures/opt_referencia.json\` = \`{tickers, mu, cov, tope, rf, frontera[{retorno_esperado_anual_pct, volatilidad_anual_pct, pesos}]}\`.\
&#x20; 4\. \`data_real/meta.json\` con \`fecha_corte\` y \`generado_en\`; \`data_real/cierres_historicos.json\` = \`{fechas[], cierres{TICKER: []}}\`.\
\- \*\*Medido en data/ (para tu pipeline):\*\* la volatilidad de \`09\` usa desviación poblacional; el rebalanceo se publica con la fecha de la sesión siguiente a la decisión; \`07.markowitz\_\*\` es un Markowitz real sobre \`04\`; no pude reproducir las tres carteras de \`09\`.\
\- \*\*Selectores E2E:\*\* shell, Clasificación y accesibilidad están listados en los mensajes 1550, 2030 y 0130 de la bitácora. A 390 px el menú está colapsado (\`#btn-modulos\`) y Clasificación abre en la vista «Por activo».\
\- \*\*Contrato:\*\* C-01 y C-02 siguen pendientes de ACK.\
\- \*\*Prioridad:\*\* alta · \*\*Para cuándo:\*\* mar 17
```

## 2026-11-17 11:38 · Codex · mensaje recibido de CC

```text
\### MSG-20261117-1112 · CC → CX · ENTREGA (resumen; detalle en la bitácora, mensajes 1031–1112)\
\- \*\*Asunto:\*\* PR #7 integrado; contrato con tus ACK; cámara corregida; seis módulos terminados\
\- \*\*Qué cambió:\*\* Fusioné tu PR #7 (82→107 pruebas JS, la de cvxpy ya corre y pasa). Contrato: I-03b solo como igualdad inversa, la cota ampliada no es equivalente, R-REG-09 literal sigue fallando en 5 activos, publicación parcial declarada, C-01 y C-02 aceptados. Cámara: el HUD sacaba el \`\<video>\` del documento al primer segundo y lo pausaba (PR #8); pausa de manos ahora con puño (D-22). Módulos nuevos: Regresión (#10), Optimizador (#11), Dashboard y Watchlist (#12), Trading y Leaderboard (#13), con \`EIA.cartera\` en el núcleo.\
\- \*\*Qué necesito de ti:\*\* (1) E2E con cámara falsa de Chrome que compruebe durante 10 s que \`EIA.camara.estado().cuadros\` sube y que \`video\` es \`{pausado: false, enDocumento: true}\`; (2) clic real sobre un punto de NSGA-II en el Optimizador → cambia \`#h-composicion\`; (3) en Modo real, esperar \`aviso.real.parcial\` mientras falten 01–13; (4) selectores de cada módulo en los mensajes 1045–1108.\
\- \*\*Archivos / PR:\*\* PR #8 a #14, todos fusionados con CI en verde\
\- \*\*Contrato:\*\* C-01 y C-02 aceptados; aclaración editorial y dos campos derivados nuevos (§5), sin cambio de esquema\
\- \*\*Prioridad:\*\* alta · \*\*Para cuándo:\*\* mié 18
```

## 2026-11-17 · Codex · entrega de Backtesting

```text
Mensaje de Opus 5.5:

📨 MENSAJE PARA CX\
Backtesting (T-24) fusionado en el PR [JosMart04/EquipoA_ErnestoInvestingAI#17 · feat(backtesting): T-24…](https://github.com/JosMart04/EquipoA_ErnestoInvestingAI/pull/17) (CI verde). Selectores para los E2E:

- `#capital` y `#drawdown` (los dos gráficos)
- `#tabla-metricas` con 3 `tr.fila-cartera`
- `#verificacion` (contiene «7»)
- `#nota-tope:not([hidden])`
- `#tl-cartera` (segmentado)
- `#tl-fechas button[data-rebalanceo]` (12, uno con `aria-pressed="true"`)
- `#tl-detalle`
- `#interpretacion .interp[data-cartera]` (3)
- `#recalcular[disabled]`

Flujo: Portafolios → «Ver su backtesting» del Agresivo → `#tl-cartera` llega con Agresivo elegido. En el Modo real hoy muestra «publicación parcial» porque falta `09`. js/stub.js ya no existe. Contrato sin cambios. Detalle en `MSG-20261117-1204` de la bitácora.
```

## 2026-11-17 · Entrega de integración, accesibilidad y pipeline

```text
Mensaje de Opus 5.5:

📨 MENSAJE PARA CX\
PR #18, [JosMart04/EquipoA_ErnestoInvestingAI#19 · feat(integracion): migas de pan…](https://github.com/JosMart04/EquipoA_ErnestoInvestingAI/pull/19) y #20 fusionados (CI verde, 48 E2E). Detalle en `MSG-20261117-1523` y `MSG-20261117-1533`. Pendientes:

1. **Alta:** arreglar el caso aislado «falta 09» de `parcial.spec.mjs`. El patrón no admite `?v=` y el `13` también da 404. Usar `'**/data_real/13_patrones_y_parametros.json?*'` y comprobar que se sirvió el fixture.
2. E2E de migas (R-INT-05): `nav.migas` con 3 y luego 4 elementos, y sin migas al llegar por `#nav-modulos`.
3. E2E de T-27:
   - exploración con `End` sobre `#velas .chart` y anuncio en `#eia-vivo`;
   - `.resumen-series li`: 1 en Dashboard, 2 en Regresión, 7 en cada gráfico de Backtesting y 3 en Portafolios;
   - ningún `aria-label` contiene «This is a chart»;
   - con `?barrido=1`: `.barrido-rotulo`, Espacio y Esc.
4. axe-core en 9 páginas × 2 temas × 2 modos.
5. **Alta:** publicar 01–13 reales (T-31…T-38); el Modo real (T-26) depende de eso.

En el tablero, T-27 todavía figura «en revisión»: lo pasaré a «hecho» en el próximo bloque.
```


## 2026-11-17 · autorización del bot programado

```text
<send_user_message_question_reply>
[{"questionItemId":"[\"request_user_input_async\",\"call_307c40ac2ee2419689c2859ec121fd99\",0]","question":"¿Autorizas activar T-32 para publicar automáticamente solo `data_real/**` en `main`, tras validar, de lunes a viernes a las 22:15 UTC y domingos a las 06:00 UTC? La propuesta está en `docs/informe/T-32-propuesta.md`; el workflow manual ya funciona sin escritura remota.","answer":"Sí, autorizar el bot programado"}]
</send_user_message_question_reply>
```


## 20261117-2140 · Resolución PR #22 y auditoría P08

```text
Ya le envié tu mensaje a Opus 5.5 y terminó de trabajar, te envió este mensaje:

Sigo esperando dos cosas de Codex para cerrar T-29 antes del congelamiento del jueves a las 20:00:

1. Que resuelva en su [PR #22](https://github.com/JosMart04/EquipoA_ErnestoInvestingAI/pull/22) el conflicto en docs/ia/BITACORA.md para poder fusionar los datos reales. Ese PR sigue sin cambios desde su último commit.
2. La auditoría P08, para corregir lo que encuentre.

Cuando me pases cualquiera de las dos, sigo.

📨 MENSAJE PARA CX\
Josué validó con su webcam, en Pages, la calibración de 5 puntos y la «V» de dos dedos (PR [JosMart04/EquipoA_ErnestoInvestingAI#25 · feat(a11y): calibración de la…](https://github.com/JosMart04/EquipoA_ErnestoInvestingAI/pull/25)): funcionan bien. Puedes citarlo como evidencia humana en la auditoría P08 y en el informe (bitácora `MSG-20261117-1956`). Sigue pendiente de ti: el conflicto de docs/ia/BITACORA.md en el PR [JosMart04/EquipoA_ErnestoInvestingAI#22](https://github.com/JosMart04/EquipoA_ErnestoInvestingAI/pull/22) y la auditoría P08.
```

### P08 aplicado desde la guía, página 17

Transcripción literal por extracción del PDF; se conservan los saltos de línea y se omiten espacios finales de extracción. Se aplica a ambos modos según CX-03. No lo pegó el usuario: CX lo recuperó de la especificación.

```xml
<prompt id="P08" nombre="Claude: auditoría de calidad, accesibilidad y veracidad del sistema">
  <role>Eres un auditor de calidad de software y accesibilidad (WCAG 2.2 AA) que no inventa
hallazgos.</role>
  <context>
Se entrega el código HTML/CSS/JS del sistema integrado y, si es posible, la salida de axe-core
sobre cada página.
Es un sistema con datos sintéticos y predicciones simuladas.
  </context>
  <task>
1. Verificar que cada módulo de predicción, optimización y backtesting muestra el aviso de
datos sintéticos o simulados.
2. Verificar que la clasificación solo muestra SUBE o BAJA.
3. Verificar que ninguna cifra se escribió a mano en el código en lugar de leerse de los JSON.
4. Auditar contraste, teclado, etiquetas, tablas con scope y alternativas en texto de los
gráficos.
5. Producir una tabla: módulo | hallazgo | evidencia (cita literal del código) | severidad |
corrección propuesta.
  </task>
  <constraints>
- Sin evidencia literal no hay hallazgo: anótalo en «No verificable».
- Marcar todo como HIPÓTESIS PARA VERIFICAR hasta que una persona lo compruebe en pantalla.
  </constraints>
  <output>Tabla en Markdown, sección «No verificable» y sección «Criterios aparentemente
cumplidos».</output>
  <verification>El equipo reproduce cada fila en el navegador; las que no se reproducen se
descartan y se declara en el informe.</verification>
</prompt>
```
