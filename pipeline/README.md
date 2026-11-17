# Pipeline real y validación de CX

Python 3.12. Precios ajustados de Yahoo Finance vía yfinance (proyecto no
afiliado a Yahoo), con fines educativos. Pueden tener retrasos o errores;
no es asesoría de inversión. Los precios no se distribuyen bajo la licencia
del material sintético del curso.

## Reproducir

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install torch==2.15.0 --index-url https://download.pytorch.org/whl/cpu
.venv/Scripts/python -m pip install -r pipeline/requirements.txt
.venv/Scripts/python -m pipeline.ejecutar --salida data_real --modo completo --corte 2026-11-16
.venv/Scripts/python tools/validar_contrato.py data_real --modo real
.venv/Scripts/python tools/validar_contrato.py data --modo profesor
```

Sin `--corte` usa la última sesión XNYS cerrada (incluye festivos, DST y cierres
anticipados). Descarga desde 2010 o desde la primera cotización; el panel común
empieza cuando todos tienen historia (XLC limita a 2018-06-19). OHLCV conserva
la historia individual completa. Huecos internos de hasta dos sesiones se
rellenan hacia adelante y se registran; un hueco mayor o último cierre
faltante impide publicar. No se fabrica historia previa a la cotización.
VIX solo es variable explicativa, no activo invertible.

`diario` genera 01–13 y conserva los cortes existentes. `cortes` y `completo`
generan también los doce cierres de mes previos, en dos procesos. En esta
versión `diario` reentrena DL con el mismo presupuesto reducido: no reutiliza
pesos semanales que contaminarían la evaluación externa. Cada resultado por
algoritmo/corte se guarda en `pipeline/.cache/modelos/`, identificado por
SHA-256 de variables, etiquetas, código de modelado y presupuesto de épocas.
La misma ejecución puede retomarse desde esa caché. No se versionan pesos ni
cachés. El modo completo requiere CPU y puede tardar más que el objetivo de
una hora del plan; `meta.duracion_s` registra la duración medida.

## Método y prevención de fuga

- Modelos de panel: los 26 activos juntos. Variables de PLAN_MAESTRO §6.3:
  retornos, volatilidad, RSI, MACD, medias, volumen, beta/correlación con SPY,
  mercado, VIX y grupo. Las ventanas solo alcanzan el cierre de cada fecha.
- Prueba externa: últimas 252 fechas con etiqueta a 30 sesiones conocida;
  6.552 filas. Entre entrenamiento y prueba hay 30 fechas embargadas. El
  escalado se ajusta solo en entrenamiento. La auditoría exporta fechas y
  número real de filas. No se seleccionan modelos por el resultado externo.
- Once ML por tarea con nombres contractuales. SVC, SVR y kNN usan como
  máximo las 12.000 filas más recientes; los demás usan todo el entrenamiento
  válido. Regresores ML estiman log-retornos a 5/10/15/20/25/30 sesiones y se
  interpolan desde horizonte cero. Hiperparámetros modestos, fijos y publicados.
- Siete DL separados por tarea: MLP (20 sesiones aplanadas), RNN, LSTM, GRU,
  BiLSTM, CNN 1D y Transformer (60 sesiones). Semilla 2026, Adam 0,001, lote
  256, cuatro hilos CPU. Presupuesto predeterminado **3 épocas**, fijado antes
  de observar resultados; máximo permitido 15. Early stopping con paciencia
  3 en las últimas 126 fechas internas, separadas por embargo de 30 sesiones.
  Tras medir externamente, se reinicia y entrena con todos los datos
  etiquetados hasta el corte durante las épocas elegidas internamente.
  La regresión DL aprende 30 log-retornos directamente; factor de escala 10
  reversible para la pérdida. El Transformer incluye posición entrenable.
- Métricas de regresión sobre horizonte 30: MAPE relativo al precio futuro,
  MAE/RMSE relativos al precio inicial, R² de retornos simples y mejora de MAE
  contra persistencia. Resultados negativos se conservan. Mediana y bandas
  se calculan de los 18 caminos publicados, cono con volatilidad de 252 días.
- Markowitz: cvxpy/CLARABEL, 35 objetivos; μ mezcla mediana anualizada recortada
  y CAPM supuesto, Σ Ledoit-Wolf de 252 días. NSGA-II/III: pymoo, 200
  generaciones, semilla 2026, reparación al símplex con tope 25 %. CVaR de la
  peor cola histórica diaria al 5 %. NSGA-II toma 40 puntos del frente final.
  NSGA-III archiva candidatos no dominados realmente evaluados durante las
  200 generaciones, sin modificar la evolución, y toma 60 del archivo.
  Si el archivo tiene menos de 40/60 puntos,
  se repiten soluciones existentes y se declara cuántas son distintas.
- Tres carteras del NSGA-II: mínima volatilidad, máximo Sharpe, máximo retorno.
  Elegibles SUBE y proyección positiva; se completa hasta cuatro por
  probabilidad media, con aviso, si hace falta.
- Backtesting: 252 sesiones; decisión cada 21 al cierre, publicada en la sesión
  siguiente; ventana 126 y momentum 63. Mínima varianza / máximo Sharpe al 25 %;
  máximo retorno al 35 %. Coste 5 pb sobre turnover contra los pesos que
  derivaron por precios, incluida inversión inicial. SPY/QQQ/EPU buy-and-hold;
  **1/N diario sin comisión** (C-02). Volatilidad poblacional. No se utilizan
  predicciones posteriores para reconstruir el pasado.

Cada corte histórico vuelve a truncar precios, construir variables, separar
prueba/entrenamiento y entrenar. La descarga actual ajustada puede incorporar
revisiones de splits/dividendos posteriores al corte: no es una base
point-in-time de versiones históricas. Universo fijo y sesgo de supervivencia
se declaran; los resultados no se ajustan para que las carteras ganen.

## Publicación y controles

Se genera en una carpeta temporal de la caché. `tools/validar_contrato.py`
comprueba estructura, nombres, I-01…I-11, atribución, embargo y presupuesto de
15 MB. Solo después se reemplaza `data_real/`; si falla el reemplazo, se
restaura el respaldo. Se conservan respaldos locales ignorados por Git.
`data/` y `figma-src/` permanecen intactos. La publicación remota de esta
entrega se revisa mediante PR.

El workflow `actualizar-datos.yml` es **manual y de solo lectura**: entrega
un artefacto validado. Cron y push del bot a main quedan sujetos a autorización
explícita tras el rechazo de revisión automática; propuesta en
`docs/informe/T-32-propuesta.md`.

```powershell
node --test "tests/unit/*.test.mjs"
.venv/Scripts/python -m unittest discover -s tests/datos -p "test_*.py" -v
.venv/Scripts/python -m unittest discover -s pipeline/tests -p "test_*.py" -v
npm --prefix tests run test:e2e
```

Las pruebas alteran datos futuros y comprueban que el pasado no cambie;
verifican embargo por fecha, pesos y rechazo de corrupción. QA de navegador
incluye modos reales completos y regresiones HTTP parciales controladas.
La referencia independiente `pipeline.referencia_opt` sigue disponible.
C-01 se valida solo por igualdad inversa; el diagnóstico literal de un centavo
se mantiene y puede fallar sin convertirlo en aprobado.

Referencias: [yfinance](https://ranaroussi.github.io/yfinance/reference/api/yfinance.download.html),
[validación temporal scikit-learn](https://scikit-learn.org/stable/modules/cross_validation.html),
[NSGA-III pymoo](https://pymoo.org/algorithms/moo/nsga3.html),
[reparación pymoo](https://pymoo.org/constraints/repair.html).
