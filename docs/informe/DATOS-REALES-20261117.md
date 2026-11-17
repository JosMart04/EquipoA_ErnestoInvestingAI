# Datos reales · corte 2026-11-16

Publicación en la rama de CX, PR #22; pendiente de revisión y merge. Los nueve
módulos cargan 01–13. Los doce snapshots mensuales están generados y validados.

## Trazabilidad y evaluación

- Fuente: Yahoo Finance mediante yfinance, precios ajustados. 26 activos,
  2.115 sesiones comunes desde 2018-06-19; historia individual desde 2010 o IPO.
- Prueba externa: 2025-10-03 a 2026-10-05, 252 fechas × 26 activos
  = 6552 observaciones. Última etiqueta: 2026-11-16.
- Entrenamiento externo hasta 2025-08-20, etiqueta hasta
  2025-10-02; 30 sesiones embargadas. Validación
  interna de DL separada de la prueba externa; máximo fijo de tres épocas.
- Los resultados se publican tal como salen. El clasificador constante SUBE
  tendría exactitud 56.52% en esta prueba; solo
  0/18 modelos superan esa tasa base.
- 6/18 regresores mejoran el MAE de persistencia en la prueba externa.
  Se conservan las mejoras negativas y los R² negativos.
- R-REG-09 literal a un centavo falla en MSFT, GOOGL, META y QQQ. La igualdad
  inversa aceptada I-03b sí pasa; no se declara equivalente al criterio literal.

## Backtesting medido

252 sesiones, decisión con 126 sesiones pasadas y momentum 63; publicación
el día de negociación siguiente. Comisión de 5 pb sobre turnover de las
carteras. Referencias buy-and-hold; 1/N se rebalancea diariamente sin comisión.

| Serie | Retorno total % | Volatilidad anual % | Máximo drawdown % | Sharpe |
|---|---:|---:|---:|---:|
| Conservador | 12.1339 | 9.6950 | -7.4135 | 0.8390 |
| Moderado | 17.0290 | 14.1199 | -9.7470 | 0.9227 |
| Agresivo | 13.2223 | 36.5904 | -31.0114 | 0.2520 |
| SPY | 11.2929 | 13.7202 | -8.8850 | 0.5315 |
| QQQ | 9.2800 | 21.5587 | -14.8237 | 0.2449 |
| EPU | 28.1419 | 32.4794 | -20.8547 | 0.7433 |
| Igual ponderado (1/N) | 15.4523 | 17.3442 | -11.3024 | 0.6603 |

Estos backtests usan estrategias de momentum, no predicciones producidas
con posterioridad al periodo. El segundo backtest basado en señales de los
modelos mensuales es opcional en el plan y no se presenta como implementado.

## Optimización y límites

NSGA-II y NSGA-III ejecutados con pymoo, semilla 2026, 200 generaciones, NSGA-II desde el frente final y NSGA-III desde un archivo de soluciones no dominadas evaluadas (sin modificar la evolucion). Markowitz: cvxpy/CLARABEL. CVaR historico diario al 95 %. N2: 100 soluciones no dominadas de la poblacion final; 40 puntos publicados (40 distintos). N3: 955 soluciones no dominadas archivadas de las 200 generaciones; 60 puntos publicados (60 distintos).

Las matrices se calculan con los precios; μ mezcla la mediana anualizada
recortada y un CAPM supuesto, y Σ usa Ledoit–Wolf. Las métricas de cada punto
se recalculan desde sus pesos. CVaR se verifica contra la peor cola de 13
pérdidas de las últimas 252 sesiones. Los pesos pequeños no se eliminan de
la cartera, aunque la lista explicativa solo enumera los de al menos 1 %.

La historia ajustada descargada hoy puede incluir revisiones de dividendos
posteriores al corte histórico; no es una base de versiones point-in-time.
Hay universo fijo y sesgo de supervivencia. Tres épocas son un presupuesto
computacional reducido, no evidencia de convergencia de cada red. No se
optimizaron hiperparámetros para mejorar el resultado externo.

`meta.duracion_s` mide la ejecución de publicación. Una ejecución reanudada
reutiliza resultados por huella de datos/código; ese tiempo no representa el
coste total del entrenamiento original. Las dependencias exactas y el commit
se registran en `meta.json`; pesos y cachés no se versionan.

Cada snapshot congela 253 cierres de la versión descargada para generarlo,
con fuente y SHA-256 en su auditoría. Así sus precios pronosticados se
verifican en la misma escala aunque Yahoo revise después el panel actual.
El job diario conserva esa versión y el semanal la regenera explícitamente.
Esto no recupera versiones históricas originales del proveedor: sigue
siendo una descarga actual de precios ajustados, con la limitación declarada.

## Doce cortes publicados

Cada corte contiene 18 clasificadores y 18 regresores evaluados fuera de
muestra, más sus fronteras y tres portafolios. Las huellas completas están
en las auditorías; aquí se muestra su prefijo para facilitar la revisión.

| Corte | Prueba externa | Huella (prefijo) | Elegibles | NSGA-III distintos |
|---|---|---|---:|---:|
| 2025-11-28 | 2024-10-15 – 2025-10-16 | `ffcd9478748b` | 19 | 60 |
| 2025-12-31 | 2024-11-14 – 2025-11-17 | `9a06b6636b86` | 18 | 60 |
| 2026-01-30 | 2024-12-13 – 2025-12-16 | `5af92ecba3cc` | 25 | 60 |
| 2026-02-27 | 2025-01-14 – 2026-01-14 | `4e8f8ce8df06` | 25 | 60 |
| 2026-03-31 | 2025-02-14 – 2026-02-17 | `26fcf0e3c615` | 26 | 60 |
| 2026-04-30 | 2025-03-18 – 2026-03-18 | `a9a70a81d9cf` | 21 | 60 |
| 2026-05-29 | 2025-04-15 – 2026-04-16 | `88174d34887e` | 24 | 60 |
| 2026-06-30 | 2025-05-15 – 2026-05-15 | `194801cf1604` | 26 | 60 |
| 2026-07-31 | 2025-06-17 – 2026-06-17 | `cd35fc9e4605` | 22 | 60 |
| 2026-08-31 | 2025-07-18 – 2026-07-20 | `e63f98b5e3d7` | 20 | 60 |
| 2026-09-30 | 2025-08-18 – 2026-08-18 | `2815d7d53242` | 21 | 60 |
| 2026-10-30 | 2025-09-18 – 2026-09-18 | `82b1d52bfb25` | 24 | 60 |

Publicación: **12693189 bytes** en 102 JSON (límite 15000000). Incluye 01–13,
meta, cierres comunes, 26 históricos individuales, índice de cortes y
los doce grupos de 05–08 + auditoría. El corte actual es 2026-11-16.

La preparación de los 432 resultados históricos se ejecutó aproximadamente
entre las 16:48 y 18:38 de Lima del 17-nov (dos procesos CPU). La generación
final desde caché tardó 67.078 s. No se presenta ese segundo tiempo
como duración del entrenamiento original. Commit generador:
`346edb0ff12c4a08d593046f520565cabead4cbb`.
