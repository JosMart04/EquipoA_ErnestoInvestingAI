# Datos y referencias de CX

Esta entrega atiende MSG-20261117-0130. Es una parte de T-31 y T-39;
no contiene los 36 modelos, la optimización completa ni el backtesting real.

## Instalación y ejecución

Desde la raíz del clon de CX (Python 3.12):

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -r pipeline/requirements-base.txt
.venv/Scripts/python -m pipeline.referencia_opt
.venv/Scripts/python -m pipeline.descarga_cierres
```

- La referencia de 35 puntos usa los μ y Σ anuales de `data/04`,
  y el tope y tasa de `data/07`. CVXPY/CLARABEL resuelve mínima
  varianza bajo restricciones de presupuesto, tope y retorno objetivo.
  No importa código JS ni copia las salidas de Markowitz del profesor.
- La descarga consulta Yahoo Finance mediante yfinance con
  `auto_adjust=True`. `--corte AAAA-MM-DD` admite solo sesiones
  ya cerradas; por defecto se usa la última de XNYS, considerando festivos,
  horario de verano y cierres anticipados.
- `--usar-cache` reutiliza descargas del mismo corte en
  `pipeline/.cache/` (excluidas de Git). Para obtener datos revisados
  de Yahoo se ejecuta sin esa opción.
- Cada ticker se solicita desde 2010-01-01. El panel rectangular se inicia
  en la primera sesión disponible para todos los activos: XLC limita la
  publicación actual a 2018-06-19. No se inventan precios anteriores a
  su cotización. La descarga de B ya trae historia desde 2010-01-04;
  no se empalma con otro símbolo.
- Se rellenan hacia adelante únicamente huecos internos de hasta dos sesiones;
  se registran en `meta.metodologia.sesiones_rellenadas`.
  Un hueco mayor, un cierre final ausente, valores no positivos/no finitos
  o menos de 504 sesiones impiden publicar.
- La publicación del 17-nov-2026 contiene 2.115 sesiones hasta 16-nov-2026,
  26 tickers y ningún relleno. Ambos JSON se validan antes de escribir;
  cada archivo se reemplaza atómicamente y el manifiesto se escribe al final.
  La coherencia del par se comprueba mediante SHA-256 en la CI.
- El publicador parcial rechaza `data/` y una salida que ya tenga los
  archivos numerados 01–09. No sustituye el futuro publicador completo.

## Alcance de data_real/

Solo están `meta.json` y `cierres_historicos.json`.
El manifiesto declara el estado parcial y la atribución.
Los módulos que necesiten 01–13 seguirán mostrando el archivo que falta:
esta entrega no significa que el Modo real completo esté terminado.

La historia ajustada descargada hoy puede incorporar revisiones posteriores
a un corte histórico. Por sí sola no demuestra un experimento point-in-time.
Los modelos, embargo de 30 sesiones y evaluación fuera de muestra todavía
no se implementan ni se afirman en esta entrega.

Los datos proceden de Yahoo Finance, obtenidos con yfinance (proyecto no
afiliado a Yahoo), con fines educativos. Pueden tener retrasos o errores y
no son asesoría de inversión. No se incluyen bajo la licencia CC BY 4.0
del material base. La atribución también deberá aparecer en el archivo 13
cuando se genere como parte del pipeline completo.

## C-01 y C-02: evidencia independiente

C-01: se acepta la igualdad inversa exacta I-03b:
`round((mediana[29] / precio_ultimo - 1) * 100, 2) == retorno_proyectado_30d_pct`.
Pasa 26/26. La comprobación literal de P04 de un centavo falla en MSFT,
AMZN, META, TSLA y SPY (máximo: 0,021411 USD en META).
Se conserva este diagnóstico, sin afirmar que la guía literal se cumple.
La cota `0,01 + precio_ultimo * 0,00005` es más permisiva;
no es matemáticamente equivalente a la igualdad inversa. CC debe ajustar
esa redacción en el contrato, cuya propiedad conserva.

C-02: el 1/N diario sin comisión reproduce las 253 cifras de la referencia
del profesor con error máximo 0,0004932791 (por el redondeo a tres decimales).
SPY/QQQ/EPU son comprar y mantener. Las pruebas comprueban además I-09,
I-10, I-11, desviación poblacional y fechas de rebalanceo publicadas en la
sesión posterior a la decisión. No se afirma reproducir las tres carteras.

## Verificación

```powershell
node --test "tests/unit/*.test.mjs"
.venv/Scripts/python -m unittest discover -s tests/datos -p "test_*.py" -v
.venv/Scripts/python -m unittest discover -s pipeline/tests -p "test_*.py" -v
```

La CI usa Node 22 y Python 3.12, ejecuta estas pruebas y Gitleaks, sin
consultar Yahoo. Estos controles no sustituyen el validador completo
(T-30), Playwright ni axe (T-50).

Referencias de implementación:
- [API de descarga de yfinance](https://ranaroussi.github.io/yfinance/reference/api/yfinance.download.html).
- [Problemas cuadráticos en CVXPY](https://www.cvxpy.org/examples/basic/quadratic_program.html).
- [Gitleaks Action](https://github.com/gitleaks/gitleaks-action).
