# Ernesto Investing AI · Equipo A

Sistema web integrado de IHC 2026-II, FISI-UNMSM: Dashboard, Watchlist,
Trading simulado, Leaderboard, Clasificación, Regresión a 30 sesiones,
Optimizador, Portafolios y Backtesting. HTML, CSS y JavaScript sin compilación.
Interfaz ES/EN, temas claro/oscuro y navegación móvil.

```powershell
python -m http.server 8000
```

Abrir [sitio local](http://127.0.0.1:8000).
Repositorio del equipo: [EquipoA_ErnestoInvestingAI](https://github.com/JosMart04/EquipoA_ErnestoInvestingAI).

## Modos y procedencia

- **Profesor (`data/`):** 13 JSON originales intocables. Historia y resultados
  sintéticos del curso; no se entrenaron esos modelos. Anclas al 11-nov-2026.
- **Real (`data_real/`):** el pipeline de esta entrega descarga OHLCV ajustado,
  entrena los 18 clasificadores y 18 regresores, ejecuta cvxpy/pymoo y calcula
  backtesting causal. El corte y la procedencia están en `meta.json`; los
  13 archivos conservan el contrato. Esta entrega incluye doce cortes de
  fin de mes (nov-2025 a oct-2026), con sus auditorías; ocupa 12,69 MB.
  Los estados parciales se muestran como
  tales y no activan automáticamente el otro modo.
- La liga y el Trading son simulados en ambos modos. No se conectan cuentas,
  no se ejecutan órdenes reales y no hay claves de proveedor en el repositorio.

Los datos reales proceden de **Yahoo Finance, obtenidos con yfinance**
(proyecto no afiliado a Yahoo), con fines educativos. Pueden tener retrasos o
errores. No son asesoría de inversión. La historia ajustada descargada hoy
puede incorporar revisiones posteriores a cortes históricos; el universo fijo
introduce sesgo de supervivencia. Los resultados se publican tal como salen.

## Reproducir el pipeline y las pruebas

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install torch==2.15.0 --index-url https://download.pytorch.org/whl/cpu
.venv/Scripts/python -m pip install -r pipeline/requirements.txt
.venv/Scripts/python -m pipeline.ejecutar --salida data_real --modo completo
.venv/Scripts/python tools/validar_contrato.py data_real --modo real
node --test "tests/unit/*.test.mjs"
npm ci --prefix tests --ignore-scripts
npx --prefix tests playwright install chromium
npm --prefix tests run test:e2e
```

El entrenamiento requiere CPU y puede ser prolongado, especialmente los doce
cortes. Se guarda caché local ignorada por Git. Embargo de 30 sesiones,
252 fechas de prueba externa, hiperparámetros y limitaciones:
[pipeline/README.md](pipeline/README.md).
Pruebas de navegador y axe: [tests/e2e/README.md](tests/e2e/README.md).
Contrato: [docs/CONTRATO_DATOS.md](docs/CONTRATO_DATOS.md).

QA incluye pruebas JS, datos, causalidad, E2E y axe. La matriz inicial de esta
entrega encontró contraste insuficiente en Backtesting claro:
[issue #21](https://github.com/JosMart04/EquipoA_ErnestoInvestingAI/issues/21).
No se desactivan reglas para ocultar el hallazgo. Las verificaciones automáticas
no sustituyen pruebas humanas con webcam, lectores de pantalla o audio.

`actualizar-datos.yml` configura el bot autorizado: diario L–V 22:15 UTC,
cortes domingo 06:00 UTC y ejecución manual. Valida, conserva un artefacto,
publica solo `data_real/**` en main sin force y solicita reconstruir Pages.
Entrará en vigor al integrar el PR con CI verde; [límites y autorización
T-32](docs/informe/T-32-propuesta.md).

## Accesibilidad

Centro de accesibilidad en la cabecera (`Alt+Shift+A`), preferencias de texto,
contraste y movimiento, exploración de gráficos con flechas/Inicio/Fin,
lectura y sonificación, barrido con Espacio/Enter y Esc para detener.
Cámara con consentimiento para cabeza y manos; manos se pausa con puño
cerrado 1,5 s (D-22). La validación física de estas modalidades sigue pendiente.

## Atribución

Base educativa de Ernesto D. Cancho-Rodríguez (FISI-UNMSM), adaptada por el
Equipo A con asistencia de IA. Código, textos y datos sintéticos del material
base bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), ver
[LICENSE](LICENSE). Los datos de Yahoo Finance no se incluyen bajo esa licencia.
El export de Figma Make en `figma-src/` se conserva sin editar.
