"""Pruebas desde contrato §4/§7 y PLAN_MAESTRO §7.3; no importan código JS."""
from datetime import date, datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import re
import statistics
import unittest

ROOT = Path(__file__).resolve().parents[2]


def leer(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def dato(prefijo):
    return json.loads(next((ROOT / "data").glob(prefijo + "_*.json")).read_text(encoding="utf-8"))


class ContratoEntrega(unittest.TestCase):
    def test_hashes_profesor(self):
        plan = (ROOT / "docs/contexto/PLAN_MAESTRO.md").read_text(encoding="utf-8")
        entradas = re.findall(r"(?m)^([0-9a-f]{64})  (\S+\.json)$", plan)
        self.assertEqual(len(entradas), 13)
        for esperado, nombre in entradas:
            with self.subTest(archivo=nombre):
                self.assertEqual(hashlib.sha256((ROOT / "data" / nombre).read_bytes()).hexdigest(), esperado)

    def test_c01_igualdad_inversa_y_discrepancia_literal_documentada(self):
        # La guía literal NO pasa en cinco activos. No sustituir este diagnóstico
        # por una tolerancia mayor ni afirmar que I-03b satisface P04 literal.
        fallos_literal = []
        for ticker, pred in dato("06")["predicciones"].items():
            p, m, r = pred["precio_ultimo"], pred["ensamble_mediana"][-1], pred["retorno_proyectado_30d_pct"]
            self.assertEqual(round((m / p - 1) * 100, 2), r, ticker)
            if abs(m - p * (1 + r / 100)) > 0.01:
                fallos_literal.append(ticker)
        self.assertEqual(set(fallos_literal), {"MSFT", "AMZN", "META", "TSLA", "SPY"})

    def test_i09_portafolios_citan_puntos_exactos(self):
        puntos = {p["id"]: p for p in dato("07")["nsga2_elegibles"]}
        for nivel in dato("08")["niveles"]:
            ident = re.search(r"N2-\d+", nivel["origen"]).group()
            for campo in ("retorno_esperado_anual_pct", "volatilidad_anual_pct", "sharpe", "cvar95_diario_pct", "pesos"):
                self.assertEqual(nivel[campo], puntos[ident][campo], (nivel["nivel"], campo))

    def test_c02_i10_referencias_y_metricas(self):
        precios, bt = dato("02"), dato("09")
        n = bt["periodo"]["sesiones"]
        start = len(precios["fechas"]) - n - 1
        self.assertEqual(bt["fechas"], ["inicio"] + precios["fechas"][start + 1:])
        curvas = {}
        for ticker in ("SPY", "QQQ", "EPU"):
            p = precios["cierres"][ticker][start:]
            curvas[ticker] = [100 * v / p[0] for v in p]
        diaria = [100.0]
        for i in range(start + 1, len(precios["fechas"])):
            r = statistics.mean(p[i] / p[i - 1] - 1 for p in precios["cierres"].values())
            diaria.append(diaria[-1] * (1 + r))
        curvas["Igual ponderado (1/N)"] = diaria
        for nombre, curva in curvas.items():
            publicada = bt["referencias"][nombre]
            self.assertEqual(len(curva), len(publicada["curva"]))
            for a, b in zip(curva, publicada["curva"]):
                self.assertAlmostEqual(a, b, delta=0.001, msg=nombre)
            rendimientos = [b / a - 1 for a, b in zip(curva, curva[1:])]
            self.assertAlmostEqual(statistics.pstdev(rendimientos) * math.sqrt(252) * 100,
                                   publicada["metricas"]["volatilidad_anual_pct"], delta=0.0051)
        rf = dato("07")["tasa_libre_riesgo"]
        for s in list(bt["carteras"].values()) + list(bt["referencias"].values()):
            m = s["metricas"]
            self.assertAlmostEqual((m["cagr_pct"] - 100 * rf) / m["volatilidad_anual_pct"], m["sharpe"], delta=0.001)
            self.assertAlmostEqual(m["cagr_pct"] / abs(m["max_drawdown_pct"]), m["calmar"], delta=0.002)
        for cartera in bt["carteras"].values():
            self.assertEqual([r["fecha"] for r in cartera["rebalanceos"]],
                             [precios["fechas"][start + 21 * k + 1] for k in range(12)])

    def test_i11_fecha_ancla(self):
        self.assertEqual(dato("13")["fecha_ancla_precios"], dato("02")["fechas"][-1])

    def test_fixture_cvxpy_estructura_factibilidad_y_metricas(self):
        fx = leer("tests/fixtures/opt_referencia.json")
        d4 = dato("04")
        self.assertEqual(fx["tickers"], d4["tickers"])
        self.assertEqual(fx["mu"], d4["retorno_esperado_anual_simulado"])
        self.assertEqual(fx["cov"], d4["covarianza_anual"])
        self.assertEqual(len(fx["frontera"]), 35)
        fuente = ROOT / fx["procedencia"]["entrada"]
        self.assertEqual(hashlib.sha256(fuente.read_bytes()).hexdigest(), fx["procedencia"]["entrada_sha256"])
        anterior = (-math.inf, -math.inf)
        for p in fx["frontera"]:
            w = [p["pesos"][t] for t in fx["tickers"]]
            self.assertTrue(all(math.isfinite(v) and -1e-8 <= v <= fx["tope"] + 1e-8 for v in w))
            self.assertAlmostEqual(sum(w), 1, delta=1e-8)
            retorno = sum(a * b for a, b in zip(w, fx["mu"])) * 100
            varianza = sum(w[i] * fx["cov"][i][j] * w[j] for i in range(len(w)) for j in range(len(w)))
            volatilidad = math.sqrt(varianza) * 100
            self.assertAlmostEqual(retorno, p["retorno_esperado_anual_pct"], delta=1e-8)
            self.assertAlmostEqual(volatilidad, p["volatilidad_anual_pct"], delta=1e-8)
            self.assertGreaterEqual(retorno, anterior[0] - 1e-7)
            self.assertGreaterEqual(volatilidad, anterior[1] - 1e-7)
            anterior = (retorno, volatilidad)

    def test_cierres_reales_rectangulares_y_trazables(self):
        meta = leer("data_real/meta.json")
        panel = leer("data_real/cierres_historicos.json")
        tickers = [x["ticker"] for x in dato("01")]
        self.assertEqual(list(panel["cierres"]), tickers)
        fechas = panel["fechas"]
        self.assertGreaterEqual(len(fechas), 504)
        self.assertEqual(fechas, sorted(set(fechas)))
        for f in fechas:
            self.assertEqual(date.fromisoformat(f).isoformat(), f)
        self.assertEqual(meta["fecha_corte"], fechas[-1])
        generado = datetime.fromisoformat(meta["generado_en"].replace("Z", "+00:00"))
        self.assertIsNotNone(generado.tzinfo)
        self.assertLessEqual(generado, datetime.now(timezone.utc))
        self.assertLessEqual(date.fromisoformat(fechas[-1]), generado.date())
        self.assertEqual(set(meta["tickers_ok"]) | set(meta["tickers_con_problemas"]), set(tickers))
        for t, valores in panel["cierres"].items():
            self.assertEqual(len(valores), len(fechas), t)
            self.assertTrue(all(type(v) in (int, float) and math.isfinite(v) and v > 0 for v in valores), t)
        self.assertIn("Yahoo Finance", meta["fuente"])
        self.assertIn("yfinance", meta["fuente"])
        self.assertIn("Yahoo Finance", meta["aviso"])
        self.assertIn("yfinance", meta["aviso"])
        self.assertTrue(meta["metodologia"]["auto_adjust"])
        path = ROOT / "data_real/cierres_historicos.json"
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), meta["metodologia"]["cierres_sha256"])
        self.assertLessEqual(sum(p.stat().st_size for p in (ROOT / "data_real").rglob("*") if p.is_file()), 15_000_000)


if __name__ == "__main__":
    unittest.main()
