# E2E de cámara, Optimizador, Backtesting y publicación parcial (T-50)

Responde a MSG-20261117-1112 y a los detalles 1031, 1035 y 1054.
Incluye la entrega de Backtesting del 17-nov (MSG-20261117-1203 en la bitácora;
1204 en el mensaje recibido). Hay 48 casos: los mismos 24 a 1280×900 y 390×844.

## Ejecución desde la raíz

```powershell
npm ci --prefix tests --ignore-scripts
npx --prefix tests playwright install chromium
npm --prefix tests run test:e2e
```

Python debe estar en PATH. Playwright inicia y detiene un servidor en
127.0.0.1:8765; no reutiliza otro servidor que pudiera servir un clon distinto.
En Linux: `npx --prefix tests playwright install --with-deps chromium`.

Si ya hay una instalación compatible de Chrome for Testing, se puede indicar
la ruta absoluta de su ejecutable en `E2E_CHROME_PATH`.
La CI instala el navegador de Playwright 1.65.1. La versión realmente
ejecutada aparece en los adjuntos de diagnóstico.

## Qué se comprueba

- **Cámara:** entrada desde el Centro de accesibilidad, consentimiento por
  su botón real, `getUserMedia` con los dispositivos falsos de Chrome,
  modelo Face Landmarker del repositorio y MediaPipe 1.2.3 real.
  No se usa `?camara=simulada`, ni `canvas.captureStream`,
  ni detector sustituto. Tras recibir el primer cuadro se observa el flujo
  durante al menos 10 segundos, muestreando cada 250 ms. Se exige:
  vídeo conectado y sin pausa, mismo nodo DOM, pista viva, más cuadros
  procesados y avance de `currentTime` en cada ventana de un segundo.
  Esc debe apagar la cámara, quitar el HUD y terminar la pista.
- **Optimizador:** conversión de coordenadas con la API de ECharts y
  `page.mouse.click` sobre un círculo NSGA-II distinto del punto
  inicial. No se llama al manejador, `dispatchAction` ni
  `HTMLElement.click()`. El encabezado de composición debe cambiar
  e incluir el ID elegido. Se mantienen las comprobaciones de pesos y el
  recálculo deshabilitado en Modo profesor. En escritorio se mantienen todas
  las series; en móvil se aíslan los círculos NSGA-II mediante los interruptores
  reales (R-OPT-02), porque las series se superponen a ese ancho.
- **Backtesting profesor:** siete curvas de capital contra `09`, drawdown
  calculado independientemente desde cada curva (tolerancia 0,01 pp por
  redondeo), las siete métricas de cada serie y ordenación por retorno.
  Se exige «7 de 7 series», nota de Agresivo 35 % frente a tope 25 %,
  tres interpretaciones que reconocen la pérdida frente a SPY y recálculo
  deshabilitado. El enlace real desde la tarjeta Agresivo debe seleccionarlo
  al llegar; se pulsan los 12 rebalanceos y se verifican fecha, selección
  única y todos los pesos contra `09` (0,051 pp por presentación a un decimal).
  No se importan las funciones del módulo para obtener los resultados esperados.
- **Publicación parcial actual:** nueve páginas × ES-PE/EN-US × dos tamaños.
  Se leen el manifiesto real y los diccionarios. El aviso del módulo y del pie
  debe contener la traducción exacta de `aviso.real.parcial`, con la
  fecha formateada por Intl. Se exige un error que nombre un JSON ausente,
  su 404 correspondiente y ningún otro fallo de red. En Backtesting se verifica además el 404 de `09`. Como `09` y `13`
  faltan y se solicitan en paralelo, el diagnóstico puede nombrar cualquiera.
- **Ausencia aislada de 09:** cuatro casos adicionales (ES/EN × ambos anchos)
  sirven `13` desde el JSON profesor como fixture explícito de parámetros;
  el resto de solicitudes sigue llegando al servidor. Aquí se exige
  específicamente `09_backtesting_portafolios.json` en el diagnóstico,
  su 404 y los avisos parciales exactos. No representa la publicación real
  presente ni permite considerarla completa. No cambia el modo solo.
  En móvil se abre el menú antes de comprobar sus nueve enlaces.
- Ausencia de excepciones JS no controladas y de desborde horizontal en los
  escenarios de Optimizador, Backtesting y publicación parcial.

ECharts 5.5.1 y MediaPipe 1.2.3 se sirven mediante rutas de Playwright desde
sus paquetes npm originales, con las mismas URLs y tipos MIME que usa el
sitio. Así la prueba del comportamiento no depende de que jsDelivr responda.
HTML, CSS, código del sitio y modelos binarios se sirven desde el clon.
Los JSON también, salvo la ruta de `13` en los cuatro casos explícitos
que aíslan `09`; no se inventan salidas de datos ni de MediaPipe.

La prueba parcial es una prueba de integración de la publicación presente:
exige que los archivos que el módulo anuncia como ausentes falten de verdad.
Cuando se publiquen 01–13, deberá conservarse esa regresión con un escenario
HTTP parcial controlado y agregarse la cobertura del modo completo, sin
eliminar las aserciones sobre avisos, archivo y 404.

## Evidencia y límites

`tests/playwright-report/` contiene el informe HTML.
Se adjuntan diagnósticos (versión del navegador, HTTP, consola y excepciones),
muestras de cámara y punto seleccionado. Ante fallo también se guardan
captura y traza. La CI sube ambos directorios durante siete días.

Esta suite no demuestra que la detección de caras o gestos funcione con
personas reales: la cámara falsa genera un patrón de prueba. Sigue pendiente
la prueba humana con webcam, incluyendo el sentido de los ejes y el puño
cerrado durante 1,5 s para pausar manos (D-22). Tampoco sustituye la suite
completa E2E/axe, ambos temas ni los restantes flujos entre módulos.
No se verifica todavía la sincronización interactiva del cursor/zoom entre
los gráficos de Backtesting ni su interpretación con datos alterados.

`npm audit` informa GHSA-fgmj-fm8m-jvvx para ECharts 5.5.1
(severidad moderada). Se conserva esa versión, fijada por la guía, y se
registra para revisión de CC; no se ejecuta una actualización mayor automática.

Referencias:
- [Playwright: navegadores](https://playwright.dev/docs/browsers).
- [Playwright: servidor para pruebas](https://playwright.dev/docs/test-webserver).
