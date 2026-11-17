"""Casos adversos definidos por las reglas de descarga, sin acceso a Yahoo."""
from datetime import datetime, timezone
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd
from pipeline.descarga_cierres import alinear, corte_cerrado, ejecutar, ROOT


class DescargaCierres(unittest.TestCase):
    def setUp(self):
        self.sesiones = pd.bdate_range("2020-01-01", periods=600)
        self.series = {t: pd.Series(np.arange(600, dtype=float) + 100, index=self.sesiones) for t in ("A", "B")}

    def test_historia_previa_a_cotizacion_no_se_inventa(self):
        self.series["B"].iloc[:10] = np.nan
        p, _ = alinear(self.series, self.sesiones, ["A", "B"])
        self.assertEqual(p.index[0], self.sesiones[10])
        self.assertEqual(len(p), 590)

    def test_dos_huecos_internos_se_rellenan_solo_hacia_adelante(self):
        self.series["B"].iloc[40:42] = np.nan
        p, problemas = alinear(self.series, self.sesiones, ["A", "B"])
        self.assertEqual(p["B"].iloc[40], self.series["B"].iloc[39])
        self.assertEqual(p["B"].iloc[41], self.series["B"].iloc[39])
        self.assertEqual(len(problemas["B"]), 2)

    def test_tres_huecos_rechazan_publicacion(self):
        self.series["B"].iloc[40:43] = np.nan
        with self.assertRaisesRegex(ValueError, "más de dos"):
            alinear(self.series, self.sesiones, ["A", "B"])

    def test_falta_ultimo_cierre_no_se_rellena(self):
        self.series["B"].iloc[-1] = np.nan
        with self.assertRaisesRegex(ValueError, "último cierre"):
            alinear(self.series, self.sesiones, ["A", "B"])

    def test_valores_invalidos_se_rechazan(self):
        for valor in (-10, 0, np.inf):
            with self.subTest(valor=valor):
                self.series["B"].iloc[20] = valor
                with self.assertRaises(ValueError):
                    alinear(self.series, self.sesiones, ["A", "B"])

    def test_no_sesion_actual_incompleta_y_si_cierre_corto(self):
        _, corte = corte_cerrado(datetime(2026, 11, 17, 15, tzinfo=timezone.utc))
        self.assertEqual(corte, "2026-11-16")
        _, corte = corte_cerrado(datetime(2026, 11, 27, 19, tzinfo=timezone.utc))
        self.assertEqual(corte, "2026-11-27")

    def test_data_es_intocable(self):
        with self.assertRaisesRegex(ValueError, "intocable"):
            ejecutar(ROOT / "data")

    def test_fallo_de_descarga_preserva_publicacion_anterior(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            (p / "meta.json").write_text('{"anterior": true}', encoding="utf-8")
            with patch("pipeline.descarga_cierres.descargar", side_effect=RuntimeError("sin red")):
                with self.assertRaisesRegex(RuntimeError, "sin red"):
                    ejecutar(p)
            self.assertEqual((p / "meta.json").read_text(encoding="utf-8"), '{"anterior": true}')
            self.assertFalse((p / "cierres_historicos.json").exists())

    def test_publicacion_completa_no_se_sobrescribe(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            (p / "01_universo_tickers.json").write_text("[]", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "no reemplaza"):
                ejecutar(p)
