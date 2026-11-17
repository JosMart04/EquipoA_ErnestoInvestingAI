"""Variables causales de panel y particiones temporales por fecha (no por fila)."""
import numpy as np
import pandas as pd

HORIZONTE=30
VENTANA=60
EMBARGO=30

def construir(universo, datos, panel):
    fechas=panel.index
    spy=panel.SPY
    rs=spy.pct_change()
    vix=datos['^VIX'].c.reindex(fechas)
    grupos=list(dict.fromkeys(a['grupo'] for a in universo))
    xs=[]
    for a in universo:
        t=a['ticker']; p=panel[t]; r=p.pct_change(); v=datos[t].v.reindex(fechas)
        f=pd.DataFrame(index=fechas)
        for h in [1,5,10,21,63,126]: f[f'logret_{h}']=np.log(p/p.shift(h))
        for h in [21,63]: f[f'vol_{h}']=r.rolling(h).std(ddof=0)
        cambio=p.diff(); sub=cambio.clip(lower=0).rolling(14).mean(); baj=(-cambio.clip(upper=0)).rolling(14).mean()
        f['rsi14']=sub/(sub+baj).replace(0,np.nan)
        macd=p.ewm(span=12,adjust=False).mean()-p.ewm(span=26,adjust=False).mean()
        f['macd']=(macd-macd.ewm(span=9,adjust=False).mean())/p
        for h in [50,200]: f[f'media_{h}']=p/p.rolling(h).mean()-1
        f['volumen_z']=(v-v.rolling(21).mean())/v.rolling(21).std(ddof=0).replace(0,np.nan)
        f['beta63']=r.rolling(63).cov(rs)/rs.rolling(63).var()
        f['corr63']=r.rolling(63).corr(rs)
        f['spy_ret21']=np.log(spy/spy.shift(21)); f['spy_vol21']=rs.rolling(21).std(ddof=0)
        f['vix']=vix; f['vix_var']=vix.pct_change()
        for g in grupos: f['grupo_'+g]=float(a['grupo']==g)
        xs.append(f.to_numpy(dtype=np.float32))
    x=np.stack(xs,axis=1)
    precios=panel.to_numpy()
    y=np.full((len(panel),len(universo),30),np.nan,dtype=np.float32)
    for h in range(1,31): y[:-h,:,h-1]=np.log(precios[h:]/precios[:-h])
    return x,y,list(f.columns)

def indices(x,y):
    # Una ventana solo usa [t-59, t]. No se rellena ni se mira t+1.
    finitos=np.isfinite(x).all(axis=(1,2))
    validos=np.convolve(finitos.astype(int),np.ones(VENTANA,dtype=int),'full')[:len(x)]==VENTANA
    conocidos=np.isfinite(y).all(axis=(1,2)) & validos
    dias=np.flatnonzero(conocidos)
    if len(dias)<700: raise ValueError('Historia insuficiente para prueba y embargo')
    prueba=dias[-252:]; entreno=dias[dias<prueba[0]-EMBARGO]
    assert entreno[-1]+HORIZONTE<prueba[0]
    actual=np.array([len(x)-1])
    if not validos[-1]: raise ValueError('Variables del corte no finitas')
    return entreno,prueba,dias,actual

def filas(dias,n):
    return np.array([(d,t) for d in dias for t in range(n)],dtype=int)
