# E2E y axe de CX (T-50)

Playwright 1.65.1 + axe-core 4.14.0. Cuatro proyectos: escritorio 1280×900 y
móvil 390×844, cada uno en claro y oscuro. La configuración descubre los
casos de `tests/e2e/` y `tests/a11y/`.

```powershell
npm ci --prefix tests --ignore-scripts
npx --prefix tests playwright install chromium
npm --prefix tests run test:e2e
```

Python debe estar en PATH. Playwright inicia y detiene un servidor exclusivo
en 127.0.0.1:8765. En Linux se instala Chromium con `--with-deps`.
`E2E_CHROME_PATH` permite señalar una instalación local compatible; la CI
instala el Chromium de Playwright. Los diagnósticos adjuntan la versión real.

## Cobertura

- Cámara falsa de Chrome, MediaPipe real y consentimiento mediante interfaz:
  diez segundos con cuadros/currentTime crecientes, mismo vídeo conectado,
  sin pausa y pista viva. Esc apaga y libera la pista. No detector sustituto.
- Clic real NSGA-II con coordenadas ECharts y `page.mouse.click`; cambia
  composición e ID. A 390 se aíslan los círculos con los interruptores reales
  porque las series se superponen. Escritorio conserva todas las series.
- Backtesting contra `09`: siete curvas, drawdown independiente (0,01 pp por
  redondeo), métricas y ordenación, 7/7, nota 35 %/25 %, interpretación sin
  ocultar pérdidas y recálculo deshabilitado. Agresivo llega seleccionado
  desde Portafolios con tres migas; se pulsan los doce rebalanceos y se
  contrastan fechas y todos los pesos (0,051 pp por presentación a un decimal).
- Migas Clasificación → NVDA → Regresión → Optimizador: 3/4 elementos,
  contexto y página actual correctos, persistencia al recargar y ausencia al
  llegar por la navegación principal.
- T-27: End anuncia último cierre AAPL de `03`; resúmenes por serie con
  1/2/7+7/3 elementos; ninguna etiqueta contiene «This is a chart»;
  barrido con Espacio para entrar y Esc para detener.
- Publicación parcial controlada: nueve páginas × ES/EN. Se mantienen `meta`
  y los recursos del sitio; las peticiones de 01–13 reciben 404 explícitos.
  Se exigen aviso exacto de módulo y pie, archivo ausente y su 404, modo
  conservado y menú móvil. Esto persiste después de publicar datos completos.
- Falta de 09 aislada: además se sirve `13` desde el JSON profesor como fixture
  de parámetros. Intercepción por `URL.pathname` compatible con `?v=`; se
  exige una petición atendida, respuesta 200, cuerpo idéntico, versión del
  manifiesto y ningún 404 de 13. El diagnóstico debe nombrar 09.
- Publicación real completa: nueve módulos contra los archivos publicados,
  contenido visible, sin estado de error ni aviso parcial, atribución y sin
  fallos HTTP. No usa sustitutos de 01–13.
- Axe WCAG 2.2 AA: nueve páginas × dos modos en los cuatro proyectos, 72
  escaneos sin exclusiones de reglas ni elementos. Se espera lista vacía de
  violaciones y se adjunta el resultado completo, incluidos `incomplete`.

ECharts y MediaPipe originales se sirven desde paquetes npm fijados, con
sus URLs y MIME del sitio. Así se evita depender de jsDelivr durante QA.
No se cambian el detector ni las APIs de cámara. Los escenarios HTTP parciales
están explícitamente separados de los de publicación completa.

## Evidencia y límites

Informe HTML en `tests/playwright-report/`; resumen JSON y capturas/trazas de
fallos en `tests/test-results/`. CI conserva los artefactos siete días.
Las excepciones JS y peticiones fallidas son errores; los 404 controlados se
comprueban en sus escenarios específicos.

La primera matriz de esta ampliación terminó 190/192: Backtesting profesor
claro falló por contraste de cinco etiquetas, en ambos anchos. Ver
`docs/informe/QA-20261117.md` e issue #21. No se desactiva la regla. Después,
la revisión de HTTP parcial y migas de Agresivo pasó 88/88 casos dirigidos.
La suite con los datos reales completos suma 228 casos; su resultado se
registra al publicar la entrega.

No sustituye pruebas humanas con webcam, lector de pantalla, audio o
interruptor físico. Pendientes fuera de estos casos: sincronización de
cursor/zoom entre gráficos y flujos restantes de interacción. Pausa de manos:
puño 1,5 s (D-22). `npm audit` informa GHSA-fgmj-fm8m-jvvx en ECharts 5.5.1
(moderada); se mantiene la versión fijada por la guía, sin actualización
mayor automática.

Referencias: [Playwright/axe](https://playwright.dev/docs/accessibility-testing),
[navegadores](https://playwright.dev/docs/browsers),
[servidor](https://playwright.dev/docs/test-webserver).
