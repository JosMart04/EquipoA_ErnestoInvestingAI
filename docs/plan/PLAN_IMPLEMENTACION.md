# PLAN DE IMPLEMENTACIÓN — Ernesto Investing AI

> Escrito por Claude Code (Fable 5.2) el lunes 16-nov-2026 en modo Plan (prompt CC-F-01) y **aprobado por Josué** ese mismo día.
> Quien retome (Opus 5.5): lee primero `docs/ia/HANDOFF.md`; este plan dice **qué** y **cómo**, el HANDOFF dice **dónde quedó**.
> El contrato de datos vive en `docs/CONTRATO_DATOS.md`. Los IDs `T-xx`, `H-xx`, `C-xx` e `I-xx` son estables.

## Contexto

El repo `JosMart04/EquipoA_ErnestoInvestingAI` tiene hoy solo la base del profesor (4 módulos heredados que funcionan, 5 páginas stub, `js/common.js` de 28 líneas y `css/styles.css` de 37) más el paquete de contexto y `figma-src/`. Hay que convertirlo, antes del viernes 20-nov 16:00, en un solo sitio integrado de 9 módulos con doble modo de datos, i18n y accesibilidad. Fable trabaja solo hoy; desde mañana sigue Opus 5.5 (CC-O) leyendo este plan y `docs/ia/HANDOFF.md`. Este plan fija la arquitectura, las APIs y las tareas T-01…T-29 para que otro modelo las ejecute sin ambigüedad, y define lo que Fable construye hoy.

## 1. Estado real verificado (lunes 16-nov)

- `main` = `origin/main` en `3d438db`, árbol limpio. Existe la rama remota `cx/T-30-preparar-clon` (CX). CX confirmó D-16; T-30 sigue pendiente.
- SHA-256 de `data/*.json`: **13/13 iguales al Anexo B.3**.
- No existen todavía `tests/`, `data_real/`, `i18n/`, `js/lib/`, `js/a11y/` ni `.nojekyll`.
- Base: `common.js` es un script clásico con globales `PAGES`, `$`, `fmt{n,pct,usd,cls}`, `loadJSON`, `store`, `applyTheme`, `buildShell`, `showError`; llama a `window.init` en `DOMContentLoaded` y a `window.onTheme` al cambiar de tema. Los heredados llevan su JS en línea.
- Herramientas: Node 24.18.1 (el plan dice 22), Python 3.12.10. En jsDelivr responden 200 `echarts@5.5.1` y `@mediapipe/tasks-vision@1.2.3` (`vision_bundle.mjs` + `wasm/`). Modelos: `face_landmarker.task` 3,76 MB y `hand_landmarker.task` 7,82 MB.
- `figma-src/src/` es la referencia visual: `components/Layout.tsx` (cabecera, centro de accesibilidad, HUD), `components/ui.tsx` (ficha IA, aviso, contenedor de gráfico, segmentado), `screens/*.tsx` (una por módulo), `styles/globals.css` (tokens), `lib/ctx.tsx` (nombres EN, mapa de grupos y abreviaturas de modelos).

## 2. Hallazgos: contradicciones, huecos e ideas poco realistas

| # | Hallazgo (medido) | Corrección |
|---|---|---|
| H-01 | **R-REG-09 no se cumple al pie de la letra en los datos del profesor.** `\|mediana[29] − último·(1+r/100)\|` supera 1 centavo en 5 de 26 activos: META 0,0214 · MSFT 0,0147 · SPY 0,0131 · TSLA 0,0124 · AMZN 0,0101. El PLAN_MAESTRO dice «máx. 0,006». Causa: `retorno_proyectado_30d_pct` viene redondeado a 2 decimales. La forma inversa (`round((mediana[29]/último − 1)·100, 2) = r`) se cumple 26/26. | Verificación automática = forma inversa exacta + tolerancia `0,01 + último × 0,00005`. Se declara en el contrato y en el informe. **Afecta al validador de CX hoy** → `CAMBIO-CONTRATO C-01`. |
| H-02 | **El 1/N del profesor se rebalancea a diario, sin comisión** (reproduce `09` con diferencia 0,000 desde `02`); §6.3 dice «rebalanceo mensual». SPY, QQQ y EPU son comprar y mantener (dif. ≤ 0,0005). | `C-02` a CX; `js/lib/backtest.js` lo implementa así y lo prueba contra `09`. |
| H-03 | **El «Agresivo» del profesor (N2-36: 16,07 % / 17,52 %) rinde y arriesga menos que el «Moderado» (N2-37: 16,49 % / 17,92 %)** y no es el punto de mayor retorno del frente (N2-40: 17,13 %). | La interfaz no afirma ningún orden entre niveles: muestra `descripcion` y las cifras del JSON. Se documenta junto con el tope 0,35 (I-06). |
| H-04 | **La base incumple contraste en oscuro:** texto blanco sobre `--ac` `#7db7ff` = 2,08:1 (página actual del menú, `button.primary`, `.skip`); velas `#b3261e` sobre panel oscuro 2,51:1; borde de controles `--bd` 1,39:1 (< 3:1, WCAG 1.4.11); Okabe-Ito `#E69F00` (2,25) y `#56B4E9` (2,31) sobre blanco. | Tokens nuevos `--on-ac`, `--bd-ctl`, `--serie-1…6` por tema y una prueba unitaria de contraste sobre `styles.css`. |
| H-05 | §4.1 permite módulos ES, pero `python -m http.server` en Windows toma el MIME de `.js` del registro; si está mal, los módulos fallan y los scripts clásicos no. El profesor ejecuta así. | **Todo el camino del Modo profesor usa scripts clásicos.** `js/lib` y Workers en «formato dual» (global + `module.exports`) con `importScripts`. Único `import()` dinámico: MediaPipe desde el CDN. |
| H-06 | «Merge solo con CI en verde», pero `qa.yml` es T-51 (miércoles). | Hasta que exista: puerta local (`node --test "tests/unit/*.test.mjs"` + protocolo de humo de §13 + SHA-256). Pido a CX adelantar un `qa.yml` mínimo. |
| H-07 | CC-F-01 construye Clasificación sin P03, y PROMPTS_INICIALES no trae `<extensiones_equipo modulo="clasificacion">`: hueco de evidencia para R-FLU-03 / D-14. | **Decidido por Josué:** se sigue sin P03. Clasificación se construye bajo CC-F-01 siguiendo la lista de tareas y restricciones de P03; se registra así en `docs/ia/prompts/CC.md` y en la bitácora para que CX lo declare en `PROMPTS_USADOS.md`. |
| H-08 | Menú móvil: el plan dice < 900 px; el export de Figma colapsa a < 1180 px. | 1180 px (la guía manda seguir el Figma); 9 enlaces + 4 controles no caben antes. |
| H-09 | Falta `.nojekyll` (Pages compila con Jekyll; `PLAN_MAESTRO.md` tiene front matter y `${{ }}`). | Se agrega en T-01. |
| H-10 | La guía dice exactitud «52–58 %» (4.2) y «52–57 %» (3.3); los datos dan 52,4–56,7 %. Lo mismo con «18 modelos», «26 activos», «25 %». | Toda cifra se calcula del JSON; los diccionarios i18n no contienen cifras de datos (prueba unitaria con lista blanca: G1, p10–p90, CVaR 95, 1/N…). |
| H-11 | `Intl` en `es-PE` (Node 24, ICU 78): `+2.93%`, `USD 355.63`, `11 nov. 2026`; el ejemplo de la guía es «+2,93 %». | Se usa `Intl` y se declara. Las fechas ISO se interpretan en UTC (en Lima, UTC−5, `new Date("2026-11-11")` mostraría el día 10). |
| H-12 | `01` lleva la fecha en el nombre de un campo (`precio_ancla_2026-11-11`); `08.fecha` es 2026-11-13 (generación), no el corte. | La interfaz usa `10.ultimo` y `13.fecha_ancla_precios`; el contrato fija el prefijo `precio_ancla_`. |
| H-13 | Ninguna IA puede verificar el seguimiento con cámara real. Además el sitio es multipágina: el flujo de cámara muere en cada navegación. | Hoy: lógica pura probada en Node + guion simulado de landmarks + `?puntero=raton`. Reanudación automática por página con consentimiento de sesión. Prueba humana obligatoria (Josué hoy 5 min si puede; Adrian y Augusto mié–jue). |
| H-14 | La carga de hoy de §14 son ~7–8 h de trabajo continuo sin tropiezos. | Orden y lista de recorte en §12; HANDOFF tras cada bloque. |
| H-15 | Las pruebas contra cvxpy/Python dependen de fixtures de CX que hoy no existen. | Hoy se prueba contra los datos del profesor (`04`, `06`, `07`, `09`); las pruebas con fixtures quedan escritas con `skip` si falta el archivo. |
| H-16 | La guía pone ejecutar NSGA/Markowitz en el navegador bajo «Qué NO se pide». | Workers solo en Modo real; en Modo profesor el control está deshabilitado y explicado (R-OPT-08), con una prueba que lo garantiza. |
| H-17 | §13.2 no asigna `.nojekyll` ni `tools/descargar_modelos.*`. | Los toma CC (se registra como D-17). |

## 3. Decisiones de arquitectura

1. **Scripts clásicos, sin compilación.** `js/common.js` (único núcleo) + `js/<modulo>.js` por página. Todo lo opcional se carga bajo demanda con `EIA.cargar(src)`.
2. **Formato dual** en `common.js`, `js/<modulo>.js`, `js/lib/*` y la lógica pura de `js/a11y/*`: publican en el global y, si existe `module`, en `module.exports`; el código con DOM se protege con `typeof document`. Así Node los prueba sin navegador ni dependencias.
3. **Cada módulo separa «modelo de vista» (puro) de «pintado» (DOM).** Ejemplo: `Clasificacion.modeloVista(c05, universo, filtros)` devuelve filas, columnas y celdas; `pintar()` solo las vuelca. Las verificaciones del profesor (468 celdas, solo SUBE/BAJA) se prueban sobre el modelo de vista.
4. **Ciclo de vida único:** `EIA.modulo({id, cargar, pintar})`. Arranque → `cargar` → `pintar`. `eia:modo`/`eia:corte` → `cargar`+`pintar`. `eia:idioma` → `EIA.traducir()`+`pintar`. `eia:tema` → solo se redibujan los gráficos registrados. Las páginas que aún usan `window.init` (base) siguen funcionando y recargan la página al cambiar modo o idioma.
5. **Una fuente de color:** los gráficos leen los tokens CSS con `getComputedStyle` (`EIA.coloresGrafico()`); no hay colores en JS.
6. **HTML legible sin JS:** el texto ES-PE va en el HTML con `data-i18n`; el diccionario lo sustituye al cargar.

## 4. API definitiva de `js/common.js`

```js
// —— Compatibilidad con la base (se conservan nombre y firma) ——
PAGES                                // 9 entradas [archivo, claveI18n, id, esNuevo]
$(sel, raiz)  ·  $$(sel, raiz)       // $$ es nuevo: Array de nodos
fmt.n(x,d) · fmt.pct(x,d) · fmt.usd(x) · fmt.cls(x)   // delegan en EIA.fmt
loadJSON(nombre)                     // = EIA.datos(nombre)
store(k) / store(k, v)               // = EIA.estado.get / set
applyTheme(t) · buildShell() · showError(e) · window.init · window.onTheme

// —— Modo y datos ——
EIA.modo() → "profesor" | "real"     // ?modo= > eia_modo > "profesor"
EIA.setModo(m)                       // guarda, vacía la caché del otro modo, emite "eia:modo"
EIA.datos(nombre, {modo, corte}) → Promise<JSON>
        // profesor: data/<nombre> · real: data_real/<nombre>?v=<meta.generado_en>
        // real con corte: data_real/cortes/<AAAA-MM-DD>/<nombre>. Caché de promesas por modo|corte|nombre.
EIA.meta() → Promise<{modo, fecha_corte, generado_en, fuente, antiguedad_habiles, vencido, disponible}>
        // profesor: fecha_corte = 13.fecha_ancla_precios · real: data_real/meta.json (cache: "no-cache")
EIA.cortes() → Promise<string[]>  ·  EIA.corte() / EIA.setCorte(f)   // emite "eia:corte"
EIA.universo() → Promise<[{ticker, nombre, grupo, sector, ultimo, …}]>   // de 10, orden canónico
EIA.precio(ticker) → Promise<number>                                     // siempre 10.ultimo (R-INT-04)
EIA.historia(ticker, {desde, hasta}) → Promise<{fechas, c, o?, h?, l?, v?}>
EIA.ErrorDatos                       // {codigo: "http" | "json" | "sin-datos-reales", archivo, estado}

// —— Estado y eventos ——
EIA.estado.get(k, porDefecto) · .set(k, v) · .del(k)   // localStorage con try/catch y respaldo en memoria
EIA.watch.lista() · .tiene(t) · .alternar(t)           // eia_watch (inicial: 11.watchlist_inicial)
EIA.activo() / EIA.setActivo(t)                        // ?t= > eia_activo
EIA.on(evento, fn) → cancelar   ·   EIA.emit(evento, detalle)
        // "eia:listo" · "eia:modo"{modo} · "eia:corte"{corte} · "eia:idioma"{idioma}
        // "eia:tema"{tema} · "eia:estado"{clave, valor} (también desde otras pestañas)

// —— i18n y formato ——
EIA.idioma() / EIA.setIdioma("es-PE" | "en-US")        // ?lang= > eia_lang > "es-PE"; actualiza <html lang>
EIA.t(clave, params) → string        // "Votos: {sube} ▲ SUBE"; si el valor es {one, other} usa Intl.PluralRules con params.n
EIA.nombre(categoria, valorJSON) → string   // grupo, sector, modelo, modelo_corto, senal, confianza, nivel, referencia, alerta_tipo
EIA.traducir(raiz)                   // aplica data-i18n y data-i18n-attr="aria-label=clave,title=clave"
EIA.fmt.num(x,d=2) · .ent(x) · .pct(x,d=2,{signo}) · .prob(p,d=2) · .usd(x) · .compacto(x)
EIA.fmt.fecha(iso, "corta" | "larga") // UTC; un valor no ISO (p. ej. "inicio") pasa por EIA.t("comun.inicio")

// —— Tema ——
EIA.tema() → "light" | "dark"  ·  EIA.setTema(t)  ·  EIA.coloresGrafico() → {fg, mut, bd, panel, up, dn, ac, serie[6]}

// —— Componentes (devuelven el nodo o un controlador) ——
EIA.modulo({id, cargar: async () => datos, pintar: (datos) => void})
EIA.ui.aviso(modulo) → <p class="aviso" data-aviso="<modulo>" role="note">
EIA.ui.fichaIA(destino, {que_hace, que_tan_bien, por_que, controlas, ignorar})   // <details> + <dl>, G1 G2 G11 G17 G10
EIA.ui.tabla(destino, {id, titulo, columnas:[{clave, titulo, tipo, ordenable, fmt}], filas, claveFila, orden, alElegir})
        → {actualizar(filas), ordenar(clave, dir)}      // caption, scope, <button> + aria-sort, anuncio en aria-live
EIA.ui.grafico(destino, {id, titulo, alto, opciones:(colores)=>option, tabla:()=>cfg, resumen:()=>texto, sonido:()=>{valores, etiquetas}})
        → {redibujar(), instancia(), destruir()}        // pestañas Gráfico | Tabla | Resumen + botón Escuchar
EIA.ui.segmentado(destino, {etiqueta, opciones:[[valor, texto]], valor, alCambiar})   // botones con aria-pressed
EIA.ui.chipSenal(senal, prob?) · .chipConfianza(nivel) · .variacion(pct)              // color + símbolo + palabra
EIA.ui.dialogo({titulo, contenido, acciones}) → {abrir(), cerrar()}                   // <dialog>.showModal()
EIA.ui.anunciar(texto, {urgente}) · .notificar(texto, tipo) · .progreso(destino, {etiqueta}) · .error(e)
EIA.trabajo(nombre, params, {alProgresar}) → {promesa, cancelar()}                    // envoltura de Worker
EIA.cargar(src) → Promise            // script clásico bajo demanda, una sola vez
EIA.esc(texto)                       // escapa HTML
```

**Estructura del shell** (selectores estables para las pruebas E2E de CX):
`a.skip` · `header.top` › `a.brand`, `#btn-modulos[aria-expanded]`, `nav#nav-modulos a[aria-current="page"]` (9), `#ctl-modo button[data-modo][aria-pressed]`, `#ctl-idioma`, `#tema[aria-pressed]`, `#btn-a11y` · `main#contenido` · `footer.pie [data-aviso="global"]` · `#eia-vivo[aria-live]`. El menú se colapsa por debajo de 1180 px.

**Claves de estado:** las de PLAN_MAESTRO §4.5 más `eia_alertas`, `eia_ordenes`, `eia_filtros` y `eia_ficha`.

## 5. i18n y componentes comunes

- **Diccionarios** `i18n/es-PE.json` e `i18n/en-US.json`, mismas claves, jerarquía `comun.*`, `nav.*`, `aviso.<modo>.<modulo>`, `ficha.*`, `tabla.*`, `grafico.*`, `a11y.*`, `<modulo>.*`, y `datos.<categoria>.<valor del JSON>` para el mapa de presentación (los datos no se tocan: `"Arbol de decision"` → «Árbol de decisión» / «Decision tree»).
- Plantillas con parámetros con nombre; plurales `{one, other}`; SUBE/BAJA → UP/DOWN, siempre con ▲/▼; los valores internos no cambian.
- **Avisos del Modo profesor (texto literal de la guía):** Clasificación «Datos sintéticos · clasificación simulada»; Regresión «Datos sintéticos · pronóstico simulado, no es asesoría de inversión»; Optimizador «NSGA-II y NSGA-III simulados: no se ejecutó ningún algoritmo evolutivo»; Portafolios y heredados «Datos sintéticos · resultados simulados»; Backtesting: historia sintética + «el desempeño pasado no garantiza resultados futuros». Modo real: texto de §4.2 con `{fecha}`.
- **Tokens** (`styles.css`): los de la base + `--on-ac`, `--aviso`, `--bd-ctl`, `--up-1…3`/`--up-t`, `--dn-1…3`/`--dn-t` (de `figma-src/…/globals.css`), `--serie-1…6`, y bloques `[data-contraste="alto"]`, `[data-movimiento="reducido"]`, `body.modo-puntero`. Se mantiene el mecanismo de tema de la base (`[data-theme]` + `prefers-color-scheme`).
- **Mapa de calor:** 3 intensidades con los umbrales 0,04 y 0,08 del Anexo B de la guía (constantes de método con nombre, declaradas en el contrato).

## 6. Contrato de datos — `docs/CONTRATO_DATOS.md` v1.0.0

Parte de PLAN_MAESTRO §5 y añade:

1. Tabla campo por campo de los 13 archivos (tipo, unidad, obligatorio/opcional) según lo medido.
2. Invariantes I-01…I-08 más: **I-03b** (R-REG-09 en forma inversa, H-01); **I-09** `08.niveles[].origen` cita un id de `07.nsga2_elegibles` con métricas y pesos idénticos (medido: sí); **I-10** en `09`, `sharpe = (cagr_pct − 100·rf)/volatilidad` y 1/N con rebalanceo diario sin comisión (H-02); **I-11** `13.fecha_ancla_precios` = último de `02.fechas`.
3. **Campos derivados que muestra la interfaz** (R-DAT-01): tasa base `(VP+FN)/n_prueba` (o `05.tasa_base_sube` si existe), mínimos y máximos de exactitud y AUC, conteos por familia y grupo, intensidad de celda, fecha de corte.
4. **Constantes de método** y de dónde salen (0,5; 0,04/0,08; z = 1,2816; 252/21/126/63; 5 pb; topes).
5. Extensiones del Modo real (§5.4), qué hace la interfaz si falta un archivo o un campo opcional.
6. **Inconsistencias del material del profesor** que se documentan y no se corrigen: tope 0,35 del Agresivo, H-01, H-03, H-10, H-12.
7. Cambios que requieren `ACK` de CX: **C-01** (H-01) y **C-02** (H-02).

## 7. `js/lib`, Workers y pruebas unitarias

| Archivo | Exporta |
|---|---|
| `prng.js` | `crearPRNG(semilla = 2026)` → `{sig, entero, normal, barajar}` (mulberry32) |
| `estadistica.js` | `retornosLog`, `media`, `desv`, `covarianza`, `ledoitWolf`, `percentil` (lineal), `mediana`, `cvar`, `drawdown`, `metricasCurva` (las 7 de `09`), `retornoCartera`, `volCartera`, `sharpe`, `autovalorMax` |
| `simplex.js` | `proyectarConTope(v, tope, suma = 1)` por bisección; `RangeError` si `n·tope < suma`; `esFactible` |
| `markowitz.js` | `minimaVarianza`, `maximoRetorno` (voraz, exacto), `carteraPara({mu, cov, tope, gamma})` (gradiente proyectado acelerado), `frontera({…, puntos = 35})` con bisección en γ por retorno objetivo; salida con el esquema de `07` |
| `nsga2.js` | `domina`, `ordenNoDominado`, `distanciaCrowding`, `nsga2({…})` (torneo, SBX η = 15, mutación polinómica η = 20, reparación con `simplex`), `frenteCarteras2` → 40 puntos `N2-xx` |
| `nsga3.js` | `dasDennis(3, 12)` (91), normalización (ideal, extremos por ASF, interceptos con respaldo), asociación y nichos, `frenteCarteras3` → 60 puntos `N3-xx` |
| `backtest.js` | `walkForward({fechas, cierres, …})` → esquema de `09` (ventana 126, momentum 63, paso 21, 5 pb, tope 0,35 en Agresivo, 1/N diario) |
| `senales.js` | filtro One Euro, ajuste afín por mínimos cuadrados (calibración), detectores con histéresis (parpadeo, boca, pellizco, palma) |

- **Workers** clásicos (`js/workers/optimizador.worker.js`, `backtest.worker.js`): `importScripts("../lib/…")`; el archivo exporta `manejar(mensaje, publicar)` para probarlo en Node. Protocolo de §7.2: `{tipo:"calcular", params}` → `progreso` / `resultado` / `error`; cancelar = `terminate()`.
- **Runner:** `node --test "tests/unit/*.test.mjs"` (sin dependencias, compatible con Node 22). Archivos `*.test.mjs`.
- **Pruebas ancladas a los datos del profesor:** mediana y p10/p90 de los 18 modelos reproducen `06` (±0,005); `metricasCurva` y `drawdown` reproducen `09` en las 7 series; SPY/QQQ/EPU y 1/N se reproducen desde `02` (±0,001); nuestra frontera con `04` no queda por encima (en riesgo) de `07.markowitz_*`.
- **Propiedades:** símplex (suma, límites, idempotencia, optimalidad frente a puntos factibles al azar); frontera monótona; NSGA factible, mutuamente no dominado, determinista con semilla y nunca mejor que Markowitz más allá de la tolerancia; backtest sin mirar el futuro (cambiar precios posteriores no cambia pesos anteriores).
- **Pruebas del núcleo:** paridad de claves ES/EN y de parámetros; toda clave usada en HTML/JS existe; diccionarios sin cifras; contraste de tokens (texto ≥ 4,5; bordes y series ≥ 3); 9 páginas con un `h1`, un `styles.css` y un `common.js`; ninguna tercera clase en HTML, JS ni i18n; sin `type="module"`.

## 8. Plan por módulo

| Módulo | Prompt del profesor | Datos | Extensiones del equipo | Resp. |
|---|---|---|---|---|
| Clasificación | **P03** | 05, 10 | ficha IA; filtros grupo/familia/watchlist/modelos; vistas «Matriz» y «Por activo» (por defecto < 640 px); consenso con enlaces `regresion.html?t=` y `optimizador.html?t=`; métricas ordenables + matriz de confusión; bloque de honestidad calculado; selector de corte en Modo real | **CC-F (hoy, referencia)** |
| Regresión | **P04** | 06, 02 | bloque de PROMPTS_INICIALES; verificación H-01 visible | CC-O mar |
| Optimizador | **P05** | 07, 05, 06 | bloque de PROMPTS_INICIALES; Worker solo en Modo real | CC-O mar |
| Portafolios y Backtesting | **P06** | 08, 09 | bloque de PROMPTS_INICIALES; sin afirmar orden entre niveles (H-03); interpretación por reglas | CC-O mié |
| Dashboard, Watchlist, Trading, Leaderboard + integración | **P07** | 10, 03, 02, 11, 12 | §8.3 M1–M4; estado compartido; «Llevar a Trading»; migas | CC-O mar–mié |

**Clasificación (referencia), detalle:** `clasificacion.html` + `js/clasificacion.js`, sin ECharts. Selectores publicados: `#mapa-calor td[data-celda]` (468 con todos los modelos visibles), `[data-senal="SUBE"|"BAJA"]`, `#consenso`, `#tabla-metricas th button`, `#matriz-confusion`, `#filtro-grupo`, `#filtro-familia [data-valor]`, `#solo-watchlist`, `#enlace-regresion`, `#enlace-optimizador`, `[data-aviso="clasificacion"]`. Celda = fondo por intensidad + «▲ SUBE» + probabilidad + `aria-label` completo. La señal se **lee** de `senal`/`consenso`; no se recalcula.

## 9. Plan de accesibilidad

| Pieza | Hoy (CC-F, versión funcional mínima) | Después (CC-O) |
|---|---|---|
| Preferencias (f) | `preferencias.js` + `panel.js`: tamaño de texto, alto contraste, reducir movimiento, espaciado, subrayar enlaces. `common.js` aplica las guardadas al arrancar sin cargar el panel. Atajo `Alt+Shift+A` | Fuente legible (Atkinson, OFL), cursor grande, decal en gráficos (T-27) |
| Bus de entrada | `bus-entrada.js`: `EIA.bus.emitir/on` con los 11 comandos de §9.3 y sus acciones por defecto | — |
| Puntero virtual | `puntero.js`: anillo, permanencia 900 ms con progreso, imán 80 px, zonas de desplazamiento, `select` → diálogo de opciones, `body.modo-puntero`. Modo de prueba `?puntero=raton` | Listbox propio pulido, sonido (T-28) |
| Cámara | `camara.js`: consentimiento, `getUserMedia`, bucle de video, pausa al ocultar, HUD con Detener (Esc), carga diferida de MediaPipe 1.2.3, respaldo en CPU, reanudación por página | — |
| Cabeza-mirada (c) | `cabeza-mirada.js`: yaw/pitch → puntero con One Euro; clic por permanencia, parpadeo largo o boca abierta; ganancias por defecto | Calibración de 5 puntos con interfaz, ajuste fino con iris (T-28) |
| Manos (d) | `manos.js`: índice → puntero, pellizco → `ACTIVAR`, palma 1 s → pausa | Deslizar, dos dedos, pulgar arriba, tarjeta de ayuda (T-28) |
| Lectura (a) | «Escuchar» básico (barrido de tonos) y pestaña Resumen dentro de `EIA.ui.grafico` | `resumen.js`, `lectura.js`, exploración punto a punto, sonificación del mapa de calor (T-27) |
| Barrido (e) | — | `barrido.js` sobre el bus (T-27) |
| Voz (b) | — | T-90, viernes, solo con todo en verde |

Antes de programar MediaPipe leo `vision.d.ts` de la 1.2.3 en el CDN (no doy por buena la API que recuerdo). **Decidido por Josué:** los dos modelos se descargan de `storage.googleapis.com/mediapipe-models` y se guardan en `assets/mediapipe/` (`face_landmarker.task` 3,76 MB y `hand_landmarker.task` 7,82 MB; el repo crece 11,6 MB). `tools/descargar_modelos.ps1` y `.sh` dejan el paso reproducible.

## 10. Riesgos técnicos y cómo se verifican

| Riesgo | Verificación |
|---|---|
| Desborde a 390 px (matriz de 468 celdas, cabecera) | `scrollWidth ≤ clientWidth` en las 9 páginas a 390 px en el navegador integrado; la matriz vive en una región con desplazamiento propio |
| API del núcleo sin consumidor real | Clasificación y el Dashboard (gráfico de velas migrado a `EIA.ui.grafico`) la usan hoy |
| MIME y módulos ES | Prueba unitaria «sin `type=module` ni `import` estático»; humo con `python -m http.server` |
| Deriva de la API de MediaPipe 1.2.3 | Lectura de `vision.d.ts`; respaldo en CPU; guion simulado |
| Cámara sin verificar | Pruebas en Node de `senales.js`; guion simulado extremo a extremo; se declara «sin probar con cámara real» en HANDOFF |
| NSGA-III incorrecto | Das-Dennis = 91, factibilidad, no dominancia, determinismo; si no pasa, no se fusiona y queda especificado para CC-O |
| `data_real/` ausente o incompleto | Estado «aún no hay datos reales» con botón para volver al Modo profesor, probado hoy |
| Conflictos con CX en `docs/ia/*` | `git pull --rebase` antes de cada PR; la bitácora solo se agrega al final |
| `localStorage` bloqueado | `try/catch` + respaldo en memoria |
| Se acaba el día | Lista de recorte de §12 y HANDOFF por bloque |

## 11. Tareas

`Est.` = tiempo de agente. PR-n = bloque de hoy.

| ID | Objetivo | Archivos | R-IDs | Dep. | Aceptación verificable | Est. | Resp. |
|---|---|---|---|---|---|---|---|
| T-01 | Plan, tablero, prompt literal, D-17, `.nojekyll` | `docs/plan/PLAN_IMPLEMENTACION.md`, `docs/ia/*`, `.nojekyll` | R-INT-09 | — | Archivos en `main`; Pages 200 | 20 min | CC-F · PR-1 |
| T-02 | Contrato v1.0.0 + C-01 y C-02 a CX | `docs/CONTRATO_DATOS.md` | R-DAT-01…03 | — | Cada campo usado por la interfaz está descrito; bitácora con C-01/C-02 | 25 min | CC-F · PR-1 |
| T-03 | Núcleo: `EIA`, eventos, estado, modo, capa de datos, tema | `js/common.js` | R-INT-03/04/10, D-02 | T-01 | Globales de la base intactos; `?modo=real` sin `data_real/` muestra el estado «sin datos»; pruebas | 35 min | CC-F · PR-2 |
| T-04 | i18n: motor, diccionarios, `Intl`, mapa de presentación | `js/common.js`, `i18n/*.json` | R-I18N-01, R-REG-07 | T-03 | Paridad ES/EN; sin cifras; cambio de idioma sin recargar en módulos con `EIA.modulo` | 25 min | CC-F · PR-2 |
| T-05 | Shell y hoja de estilos: tokens, cabecera, menú < 1180 px, controles, pie, avisos | `js/common.js`, `css/styles.css` | R-INT-01/02/06/07/08, R-A11Y-01/02/04 | T-04 | 9 enlaces + `aria-current`; sin desborde a 390 px; prueba de contraste verde | 35 min | CC-F · PR-2 |
| T-06 | Componentes: ficha IA, tabla ordenable, contenedor de gráfico, segmentado, chips, diálogo, notificación, progreso, error | `js/common.js`, `css/styles.css` | R-IHC-01, R-CLA-03, R-A11Y-03/05 | T-05 | Orden con teclado y `aria-sort`; pestañas con flechas; diálogo devuelve el foco | 35 min | CC-F · PR-2 |
| T-07 | Las 9 páginas sobre el shell nuevo; Dashboard con `EIA.ui.grafico`; pruebas del núcleo | `*.html`, `tests/unit/nucleo.*.test.mjs` | R-INT-01/06, R-HER-01 | T-06 | 9 páginas sin errores de consola en ambos modos, temas e idiomas; velas cambian con el tema | 30 min | CC-F · PR-2 |
| T-08 | **Clasificación completa (módulo de referencia)** | `clasificacion.html`, `js/clasificacion.js`, `tests/unit/clasificacion.test.mjs`, i18n | R-CLA-01…07, R-IHC-01…04, R-INT-05 | T-07 | 468 celdas; solo SUBE/BAJA; filtros; métricas ordenables con teclado; sin desborde a 390 px; EN-US completo | 80 min | CC-F · PR-3 |
| T-09 | `prng`, `estadistica`, `simplex` | `js/lib/*`, `tests/unit/lib.*.test.mjs` | D-03, I-03 | — | Propiedades del símplex; reproduce `06` y las métricas de `09` | 30 min | CC-F · PR-4 |
| T-10 | Markowitz con tope | `js/lib/markowitz.js` + pruebas | R-OPT-09, I-04 | T-09 | Caso analítico n = 2; frontera de 35 puntos factible; comparación con `07` | 25 min | CC-F · PR-4 |
| T-11 | NSGA-II y NSGA-III | `js/lib/nsga2.js`, `nsga3.js` + pruebas | I-04 | T-10 | Factibles, no dominados, deterministas; ≤ 3 s para 26 activos | 40 min | CC-F · PR-4 |
| T-12 | Backtest walk-forward | `js/lib/backtest.js` + pruebas | R-BT-06, I-06, I-10 | T-10 | Referencias y 1/N reproducen `09` (±0,001); sin mirar el futuro | 30 min | CC-F · PR-4 |
| T-13 | Workers y `EIA.trabajo` | `js/workers/*`, `js/common.js` | D-03, R-OPT-08 | T-11, T-12 | `manejar()` probado en Node; progreso y cancelación en el navegador | 20 min | CC-F · PR-4 |
| T-14 | Preferencias, panel y anunciador (f) | `js/a11y/preferencias.js`, `panel.js`, `anunciador.js`, CSS | D-07 f, R-A11Y-04 | T-06 | Preferencias persisten entre páginas; diálogo con foco atrapado; `Alt+Shift+A` | 30 min | CC-F · PR-5 |
| T-15 | Bus de entrada y puntero virtual | `js/a11y/bus-entrada.js`, `puntero.js`, CSS | D-07 c/d/e | T-14 | Con `?puntero=raton`: cambiar de módulo, elegir un activo y abrir/cerrar un diálogo solo con permanencia | 35 min | CC-F · PR-5 |
| T-16 | Cámara, cabeza-mirada, manos, señales | `js/a11y/camara.js`, `cabeza-mirada.js`, `manos.js`, `js/lib/senales.js`, `assets/mediapipe/*`, `tools/descargar_modelos.*` | D-07 c/d, D-12 | T-15 | Pruebas de `senales.js`; guion simulado mueve el puntero y hace clic; sin cámara no se descarga MediaPipe; Detener libera la cámara | 50 min | CC-F · PR-5 |
| T-17 | Regresión (P04) | `regresion.html`, `js/regresion.js` | R-REG-01…09 | T-08 | PLAN_MAESTRO §17 + I-03b en 26 activos | 3 h | CC-O mar |
| T-18 | Optimizador (P05), Modo profesor | `optimizador.html`, `js/optimizador.js` | R-OPT-01…09 | T-08 | 170 puntos; teclado; sin Worker en Modo profesor | 3 h | CC-O mar |
| T-19 | Dashboard ampliado | `index.html`, `js/dashboard.js` | R-HER-01 | T-07 | Rango, tabla ordenable, ★, sin recargar | 1,5 h | CC-O mar |
| T-20 | Watchlist y gestor de alertas | `watchlist.html`, `js/watchlist.js` | R-HER-02 | T-07 | Persistencia; «DISPARADA» con icono + texto + borde | 1,5 h | CC-O mar |
| T-21 | Trading con validación asociada al campo | `trading.html`, `js/trading.js` | R-HER-03 | T-07 | `aria-invalid` + `aria-describedby`; foco al primer error | 1,5 h | CC-O mar |
| T-22 | Leaderboard | `leaderboard.html`, `js/leaderboard.js` | R-HER-04 | T-21 | Fila propia con `aria-current`; retorno desde Trading | 45 min | CC-O mar |
| T-23 | Portafolios (P06) | `portafolios.html`, `js/portafolios.js` | R-POR-01…04 | T-08 | 3 tarjetas; excluir con renormalización; 390 px cuidado | 2,5 h | CC-O mié |
| T-24 | Backtesting (P06) | `backtesting.html`, `js/backtesting.js` | R-BT-01…07 | T-08 | Interpretación cambia si cambian los números (prueba con datos alterados en memoria) | 3 h | CC-O mié |
| T-25 | Integración P07: estado compartido, enlaces cruzados, migas, «Llevar a Trading» | varios | R-INT-03/05, R-POR-04 | T-17…T-24 | Flujo Portafolios → Trading → Leaderboard | 2 h | CC-O mié |
| T-26 | Modo real en los 9 módulos, cortes y recálculo en Workers | varios | D-02, D-03 | T-13, T-25, T-31…T-38 | Cambio de modo sin recargar; etiqueta «recalculado en tu navegador» | 3 h | CC-O mié |
| T-27 | Accesibilidad (a) completa y (e) barrido | `js/a11y/resumen.js`, `lectura.js`, `sonificacion.js`, `barrido.js` | D-07 a/e/f, R-A11Y-05 | T-15 | Cada gráfico con tabla + resumen + sonido; barrido recorre los 6 grupos | 3 h | CC-O mié |
| T-28 | Accesibilidad (c) y (d) completas | `js/a11y/*` | D-07 c/d | T-16 | §9.8 con testers humanos | 3 h | CC-O jue |
| T-29 | Conformidad con Figma, correcciones de QA y P08, congelamiento | varios | R-FLU-01/06 | todo | CI verde; 0 *serious*/*critical* en axe | 4 h | CC-O jue–vie |
| T-90 | Comandos de voz | `js/a11y/voz.js` | D-07 b | todo en verde | 10 comandos en Chrome, ES y EN | 2 h | CC-O vie |

**Peticiones a CX** (van en el 📨 del PR-1; sus filas T-30…T-64 no se tocan): aplicar C-01 y C-02 en `validar_contrato.py` y en `backtesting.py`; agregar I-09…I-11; adelantar un `qa.yml` mínimo (validador + `node --test "tests/unit/*.test.mjs"` + escaneo de secretos); exportar `tests/fixtures/opt_referencia.json` con `{tickers, mu, cov, tope, rf, frontera[], backtest:{entrada, salida}}`; usar los selectores de §4 y §8 en las pruebas E2E.

## 12. Ejecución de hoy (Fase B)

Orden **aprobado por Josué** (cambia el de CC-F-01: Clasificación sube al tercer lugar): **PR-1** plan + contrato → **PR-2** núcleo → **PR-3** Clasificación → **PR-4** `js/lib` + Workers → **PR-5** núcleo de accesibilidad. Total estimado ≈ 9 h de agente.

Por bloque: rama `cc/T-xx-…` → commits `feat(...): … [R-…] [T-…]` → `node --test "tests/unit/*.test.mjs"` + protocolo de humo + SHA-256 de `data/` → PR → merge → comprobar Pages → HANDOFF, tablero y bitácora → 📨 a CX si le afecta.

**Si se acaba el día, se recorta de abajo hacia arriba:** manos → cabeza-mirada → Workers → backtest → NSGA-III. Lo recortado queda especificado en este plan y marcado en HANDOFF. Si escribes «cierra», termino el commit en curso, dejo HANDOFF exacto y no empiezo nada más.

**Extensiones que aplico a Clasificación sobre las tareas de P03** (quedan escritas aquí porque PROMPTS_INICIALES no las trae): doble modo con selector de fecha de corte en el Modo real; ficha IA con exactitud mínima y máxima, AUC y tasa base calculadas del JSON; filtros por grupo, familia, «Solo mi watchlist» y casillas para ocultar modelos (G10); vista «Por activo» por defecto bajo 640 px con la matriz de 468 celdas disponible en una región con desplazamiento propio; consenso en lenguaje llano con enlaces a Regresión y Optimizador (`?t=`); matriz de confusión del modelo elegido y bloque de honestidad con cifras calculadas; i18n ES-PE/EN-US con `Intl`.

## 13. Verificación

- **Unitarias:** `node --test "tests/unit/*.test.mjs"` en verde antes de cada merge.
- **Protocolo de humo** (navegador integrado sobre `python -m http.server 8000`; la configuración local `.claude/launch.json` se excluye en `.git/info/exclude`): 9 páginas × {profesor, real} × {claro, oscuro} × {ES, EN}: consola sin errores; `scrollWidth ≤ clientWidth` a 390 px; 9 enlaces con `aria-current`; `[data-aviso]` visible; recorrido con Tab y foco visible.
- **Clasificación:** 468 `td[data-celda]`; ningún texto fuera de SUBE/BAJA (UP/DOWN); filtros por grupo y familia; orden de métricas con Enter/Espacio y `aria-sort`; enlaces `?t=`.
- **Datos:** SHA-256 de `data/` contra el Anexo B.3 antes de cada merge.
- **Publicación:** tras cada merge, las 9 URL de Pages responden 200.
- **Sin verificar por una IA:** cámara real (prueba humana) y lectores de pantalla reales (Anexo A).

## 14. Estado al cierre de Fable (17-nov, 01:30)

T-01 a T-16 están hechas y fusionadas en `main` (PR #2 a #6). Lo que cambió respecto de este plan al ejecutarlo, lo que quedó sin verificar (cámara real) y el siguiente paso exacto están en `docs/ia/HANDOFF.md`. T-17 a T-29 y T-90 quedan para CC-O tal como se describen en §11.
