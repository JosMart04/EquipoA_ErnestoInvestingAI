"""Walk-forward causal de 252 sesiones, comisión sobre turnover y 1/N diario."""
import numpy as np
from scipy.optimize import minimize
from .optimizador import frontera,proyectar

RF=0.04

def metricas(curva):
    c=np.asarray(curva);r=c[1:]/c[:-1]-1;dd=c/np.maximum.accumulate(c)-1
    total=(c[-1]/c[0]-1)*100;cagr=((c[-1]/c[0])**(252/len(r))-1)*100
    vol=float(np.std(r,ddof=0)*np.sqrt(252)*100);mdd=float(dd.min()*100)
    return {'retorno_total_pct':round(total,6),'cagr_pct':round(cagr,6),'volatilidad_anual_pct':round(vol,6),'sharpe':round((cagr-100*RF)/vol,6),'max_drawdown_pct':round(mdd,6),'calmar':round(cagr/abs(mdd),6) if mdd else 0,'meses_positivos_pct':round(np.mean([c[min(i+21,len(c)-1)]>c[i] for i in range(0,len(c)-1,21)])*100,6)}

def ejecutar(panel):
    valores=panel.to_numpy();ts=list(panel);inicio=len(panel)-253
    refs={}
    for t in ['SPY','QQQ','EPU']:
        c=valores[inicio:,ts.index(t)]/valores[inicio,ts.index(t)]*100
        refs[t]={'curva':c.round(6).tolist(),'metricas':metricas(c)}
    r=valores[inicio+1:]/valores[inicio:-1]-1
    c=100*np.r_[1,np.cumprod(1+r.mean(axis=1))]
    refs['Igual ponderado (1/N)']={'curva':c.round(6).tolist(),'metricas':metricas(c)}
    carteras={}
    for nombre,tope in [('Conservador',0.25),('Moderado',0.25),('Agresivo',0.35)]:
        pesos=np.zeros(len(ts));c=[100.];rebs=[];turns=[]
        for j in range(252):
            d=inicio+j
            if j%21==0:
                mom=valores[d]/valores[d-63]-1;ix=np.flatnonzero(mom>0)
                if len(ix)<4: ix=np.argsort(mom)[-4:]
                hist=valores[d-126:d+1,ix];ret=hist[1:]/hist[:-1]-1
                mu=ret.mean(axis=0)*252;cov=np.cov(ret,rowvar=False)*252
                if nombre=='Conservador': objetivo=frontera(mu,cov,tope,n=1)[0]
                elif nombre=='Agresivo':
                    objetivo=np.zeros(len(ix));resto=1.
                    for k in np.argsort(mu)[::-1]: objetivo[k]=min(tope,resto);resto-=objetivo[k]
                else:
                    res=minimize(lambda w:-(w@mu-RF)/np.sqrt(w@cov@w),np.ones(len(ix))/len(ix),method='SLSQP',bounds=[(0,tope)]*len(ix),constraints={'type':'eq','fun':lambda w:w.sum()-1},options={'ftol':1e-10,'maxiter':500})
                    if not res.success: raise ValueError('Sharpe no convergió: '+res.message)
                    objetivo=proyectar(res.x,tope)[0]
                nuevo=np.zeros(len(ts));nuevo[ix]=objetivo
                turnover=float(np.abs(nuevo-pesos).sum());turns.append(turnover);pesos=nuevo
                rebs.append({'fecha':str(panel.index[d+1].date()),'pesos':{t:round(float(w),12) for t,w in zip(ts,pesos) if w>1e-12}})
                comision=turnover*0.0005
            else: comision=0
            crecimiento=1+float(pesos@r[j]);c.append(c[-1]*(1-comision)*crecimiento)
            pesos=pesos*(1+r[j])/crecimiento
        c=np.array(c)
        carteras[nombre]={'curva':c.round(6).tolist(),'metricas':metricas(c),'rebalanceos':rebs,'turnover_medio':round(float(np.mean(turns)),8),'drawdown':((c/np.maximum.accumulate(c)-1)*100).round(6).tolist()}
    return {'metodo':'Datos reales ajustados de Yahoo Finance. Walk-forward cada 21 sesiones; ventana 126; momentum 63; comision 5 pb sobre turnover contra pesos que derivan con precios. Decision al cierre, publicacion en la sesion siguiente. Conservador minima varianza y Moderado maximo Sharpe, tope 25 %; Agresivo maximo retorno, tope 35 %. Referencias buy-and-hold y 1/N diario sin comision. No se usan predicciones futuras. Resultados sin ajustar para ganar.','fechas':['inicio']+[str(f.date()) for f in panel.index[inicio+1:]],'base':100,'periodo':{'inicio':str(panel.index[inicio+1].date()),'fin':str(panel.index[-1].date()),'sesiones':252},'carteras':carteras,'referencias':refs}
