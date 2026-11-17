# Datos reales · corte 2026-11-16

Publicación en la rama de CX, PR #22; pendiente de revisión y merge. Los nueve
módulos cargan 01–13. Los doce snapshots se completan antes de cerrar T-38.

## Trazabilidad y evaluación

- Fuente: Yahoo Finance mediante yfinance, precios ajustados. 26 activos,
  2.115 sesiones comunes desde 2018-06-19; historia individual desde 2010 o IPO.
- Prueba externa: 2025-10-03 a 2026-10-05, 252 fechas × 26 activos
  = 6,552 observaciones. Última etiqueta: 2026-11-16.
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
