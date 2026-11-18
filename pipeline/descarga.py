"""OHLCV ajustado y VIX, con caché identificada por corte y sin backfill."""
from datetime import datetime, timedelta, timezone
import json
import time
import numpy as np
import pandas as pd
import yfinance as yf
from .descarga_cierres import ROOT, CACHE, FUENTE, corte_cerrado


def descargar(corte=None, cache=True):
    cal, ultimo = corte_cerrado(datetime.now(timezone.utc))
    corte = corte or ultimo
    if corte > ultimo or not cal.is_session(corte):
        raise ValueError('Corte no cerrado')
    universo = json.loads((ROOT/'data/01_universo_tickers.json').read_text())
    tickers = [a['ticker'] for a in universo]
    CACHE.mkdir(exist_ok=True)
    yf.set_tz_cache_location(str(CACHE/'yfinance'))
    sesiones = cal.sessions_in_range('2010-01-04', corte).tz_localize(None)
    datos, rellenos = {}, {}
    for ticker in tickers + ['^VIX']:
        archivo = CACHE/f'ohlcv-{ticker.replace("^", "")}-{corte}.json'
        if cache and archivo.exists():
            raw = json.loads(archivo.read_text())
        else:
            for intento in range(4):
                try:
                    frame = yf.Ticker(ticker).history(start='2010-01-01', end=(datetime.fromisoformat(corte)+timedelta(days=1)).date().isoformat(), auto_adjust=True, actions=False, repair=False, keepna=True, timeout=30)
                    if frame.empty: raise ValueError('Respuesta vacía')
                    frame.index = pd.to_datetime(frame.index.date)
                    frame = frame.loc[:corte, ['Open','High','Low','Close','Volume']]
                    frame.columns = ['o','h','l','c','v']
                    raw = {'ticker':ticker, 'descargado_en':datetime.now(timezone.utc).isoformat(), 'fuente':FUENTE, 'fechas':frame.index.strftime('%Y-%m-%d').tolist(), **{k:[None if pd.isna(v) else float(v) for v in frame[k]] for k in frame}}
                    archivo.write_text(json.dumps(raw, allow_nan=False),encoding='utf-8')
                    break
                except Exception:
                    if intento == 3: raise
                    time.sleep([30,60,120][intento])
        frame = pd.DataFrame({k:raw[k] for k in ['o','h','l','c','v']}, index=pd.to_datetime(raw['fechas']))
        frame = frame.reindex(sesiones).loc[frame.index.min():]
        missing = frame.isna().any(axis=1)
        if missing.iloc[-1] or missing.groupby((~missing).cumsum()).sum().max()>2:
            raise ValueError(f'{ticker}: hueco no permitido')
        rellenos[ticker] = frame.index[missing].strftime('%Y-%m-%d').tolist()
        frame = frame.ffill(limit=2)
        if not np.isfinite(frame.to_numpy()).all() or (frame[['o','h','l','c']]<=0).any().any() or (frame.v<0).any():
            raise ValueError(f'{ticker}: OHLCV inválido')
        if (frame.h < frame[['o','l','c']].max(axis=1)-1e-5).any() or (frame.l > frame[['o','h','c']].min(axis=1)+1e-5).any():
            raise ValueError(f'{ticker}: OHLC incoherente')
        datos[ticker] = frame
        print(f'Descarga {ticker}: {len(frame)} sesiones hasta {corte}',flush=True)
    desde = max(d.index.min() for d in datos.values())
    panel = pd.DataFrame({t:datos[t].c.loc[desde:corte] for t in tickers})
    return universo, datos, panel, rellenos

if __name__ == '__main__':
    import argparse
    p=argparse.ArgumentParser(); p.add_argument('--corte'); a=p.parse_args()
    descargar(a.corte)
