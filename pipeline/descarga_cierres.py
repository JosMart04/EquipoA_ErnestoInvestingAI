"""T-31 parcial: descarga cierres ajustados; no genera predicciones ni carteras."""
import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

import exchange_calendars as xcals
import numpy as np
import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "pipeline/.cache"
FUENTE = f"Yahoo Finance vía yfinance {yf.__version__} (proyecto no afiliado a Yahoo), con fines educativos"


def corte_cerrado(ahora):
    """Usa el cierre real del calendario XNYS, incluso sesiones cortas y DST."""
    cal = xcals.get_calendar("XNYS", start="2010-01-01", end=(ahora + timedelta(days=7)).date().isoformat())
    schedule = cal.schedule
    cerradas = schedule[schedule["close"] <= pd.Timestamp(ahora)]
    return cal, cerradas.index[-1].date().isoformat()


def alinear(series, sesiones, tickers):
    """Panel rectangular desde el primer cierre común, sin backfill."""
    if set(series) != set(tickers):
        raise ValueError("Faltan tickers")
    panel = pd.DataFrame({t: series[t].reindex(sesiones) for t in tickers})
    if any(panel[t].first_valid_index() is None for t in tickers):
        raise ValueError("Ticker sin historia")
    desde = max(panel[t].first_valid_index() for t in tickers)
    panel = panel.loc[desde:].copy()
    problemas = {}
    for t in tickers:
        faltan = panel[t].isna()
        if faltan.iloc[-1]:
            raise ValueError(f"{t}: falta el último cierre")
        groups = (~faltan).cumsum()
        if (faltan.groupby(groups).sum() > 2).any():
            raise ValueError(f"{t}: hueco de más de dos sesiones")
        if faltan.any():
            problemas[t] = panel.index[faltan].strftime("%Y-%m-%d").tolist()
            panel[t] = panel[t].ffill(limit=2)
    if len(panel) < 504 or not np.isfinite(panel.to_numpy()).all() or (panel <= 0).any().any():
        raise ValueError("Se necesitan al menos 504 sesiones positivas y finitas para los 26 tickers")
    return panel, problemas


def descargar(tickers, hasta, reutilizar=False):
    CACHE.mkdir(parents=True, exist_ok=True)
    yf.set_tz_cache_location(str(CACHE / "yfinance"))
    yf.config.debug.hide_exceptions = False
    fin = (datetime.fromisoformat(hasta) + timedelta(days=1)).date().isoformat()
    series = {}
    for ticker in tickers:
        cache = CACHE / f"{ticker}-{hasta}.json"
        if reutilizar and cache.exists():
            raw = json.loads(cache.read_text(encoding="utf-8"))
            series[ticker] = pd.Series(raw["cierres"], index=pd.to_datetime(raw["fechas"]), dtype=float)
            continue
        for intento in range(4):
            try:
                frame = yf.Ticker(ticker).history(
                    start="2010-01-01", end=fin, interval="1d", auto_adjust=True,
                    actions=False, repair=False, keepna=True, timeout=30,
                )
                if frame.empty:
                    raise ValueError(f"{ticker}: respuesta vacía")
                s = frame["Close"].copy()
                s.index = pd.to_datetime(s.index.date)
                s = s.loc[(s.index >= "2010-01-04") & (s.index <= hasta)].sort_index()
                if s.empty or not s.index.is_unique:
                    raise ValueError(f"{ticker}: fechas vacías o duplicadas")
                raw = {"ticker": ticker, "fuente": FUENTE,
                       "descargado_en": datetime.now(timezone.utc).isoformat(),
                       "fechas": s.index.strftime("%Y-%m-%d").tolist(),
                       "cierres": [None if pd.isna(v) else float(v) for v in s]}
                cache.write_text(json.dumps(raw, allow_nan=False), encoding="utf-8")
                series[ticker] = s
                print(f"{ticker}: {len(s)} cierres ({s.index[0].date()} a {s.index[-1].date()})", flush=True)
                break
            except Exception as exc:
                if intento == 3:
                    raise RuntimeError(f"No se publica: {ticker}: {exc}") from exc
                print(f"{ticker}: reintento {intento + 1}: {type(exc).__name__}", flush=True)
                time.sleep([30, 60, 120][intento])
    return series


def escribir_atomico(path, contents):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False, suffix=".tmp") as f:
        temporal = Path(f.name)
        f.write(contents)
    os.replace(temporal, path)


def ejecutar(salida, corte=None, reutilizar=False):
    inicio = time.monotonic()
    ahora = datetime.now(timezone.utc)
    cal, ultimo = corte_cerrado(ahora)
    corte = corte or ultimo
    if corte > ultimo or not cal.is_session(corte):
        raise ValueError("El corte debe ser una sesión XNYS ya cerrada")
    salida = salida.resolve()
    if salida == (ROOT / "data").resolve() or (ROOT / "data").resolve() in salida.parents:
        raise ValueError("data/ es intocable")
    if salida.exists() and any(salida.glob("0[1-9]_*.json")):
        raise ValueError("Este publicador parcial no reemplaza una publicación completa")
    tickers = [x["ticker"] for x in json.loads((ROOT / "data/01_universo_tickers.json").read_text(encoding="utf-8"))]
    series = descargar(tickers, corte, reutilizar)
    sesiones = cal.sessions_in_range("2010-01-04", corte).tz_localize(None)
    panel, problemas = alinear(series, sesiones, tickers)
    cierres = {
        "fechas": panel.index.strftime("%Y-%m-%d").tolist(),
        "cierres": {t: [round(float(v), 8) for v in panel[t]] for t in tickers},
    }
    contents = (json.dumps(cierres, separators=(",", ":"), allow_nan=False) + "\n").encode()
    meta = {
        "version_contrato": "1.0.0",
        "generado_en": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "fecha_corte": cierres["fechas"][-1],
        "fuente": FUENTE,
        "tickers_ok": [t for t in tickers if t not in problemas],
        "tickers_con_problemas": list(problemas),
        "stale": len(cal.sessions_in_range(corte, ultimo)) - 1 > 5,
        "duracion_s": round(time.monotonic() - inicio, 3),
        "commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "aviso": (
            f"Entrega parcial: solo cierres históricos ajustados por splits y dividendos, de {cierres['fechas'][0]} a {corte}. "
            "Panel de fechas comunes a los 26 activos, sin rellenar historia anterior a su cotización. "
            "Aún no se publican los 13 JSON de mercado/modelos ni se habilitan todos los módulos del Modo real. "
            "Datos de Yahoo Finance obtenidos con yfinance (proyecto no afiliado a Yahoo), con fines educativos; "
            "pueden tener retrasos o errores. No es asesoría de inversión."
        ),
        "metodologia": {
            "auto_adjust": True, "relleno": "forward fill de hasta 2 sesiones internas; nunca backfill ni último cierre",
            "sesiones_rellenadas": problemas,
            "inicio_por_ticker": {t: series[t].first_valid_index().date().isoformat() for t in tickers},
            "cierres_sha256": hashlib.sha256(contents).hexdigest(),
            "descarga": "Reutiliza caché del mismo corte" if reutilizar else "Yahoo Finance",
        },
    }
    meta_bytes = (json.dumps(meta, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode("utf-8")
    if len(contents) + len(meta_bytes) > 15_000_000:
        raise ValueError("Presupuesto de 15 MB excedido")
    salida.mkdir(parents=True, exist_ok=True)
    escribir_atomico(salida / "cierres_historicos.json", contents)
    escribir_atomico(salida / "meta.json", meta_bytes)
    print(f"Publicado parcial: {len(tickers)} tickers, {len(panel)} sesiones, corte {corte}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--salida", type=Path, default=ROOT / "data_real")
    parser.add_argument("--corte", help="Última sesión cerrada por defecto")
    parser.add_argument("--usar-cache", action="store_true")
    args = parser.parse_args()
    ejecutar(args.salida, args.corte, args.usar_cache)
