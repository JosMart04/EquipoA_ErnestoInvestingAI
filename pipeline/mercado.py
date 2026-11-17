"""Exportación del contrato sin reutilizar resultados sintéticos."""
from datetime import datetime, timezone, timedelta
import json
import math
from decimal import Decimal
import numpy as np
import exchange_calendars as xcals
from .descarga_cierres import ROOT,FUENTE

ARCHIVOS={p.name[:2]:p.name for p in (ROOT/'data').glob('*.json')}
def plantilla(n): return json.loads((ROOT/'data'/ARCHIVOS[n]).read_text(encoding='utf-8'))
def fechas(index): return index.strftime('%Y-%m-%d').tolist()
def numeros(a,d=6): return np.asarray(a).round(d).tolist()

def parametros_json(x):
    # XGBoost utiliza NaN como sentinela en el parámetro "missing".
    # Solo se convierte metadata del estimador; nunca precios ni métricas.
    if isinstance(x,dict):return {k:parametros_json(v) for k,v in x.items()}
    if isinstance(x,list):return [parametros_json(v) for v in x]
    if isinstance(x,float) and not math.isfinite(x):return str(x)
    return x

def sesiones_pronostico(corte):
    cal=xcals.get_calendar('XNYS',start=str(corte.date()),end=str((corte+timedelta(days=100)).date()))
    sesiones=cal.sessions.tz_localize(None)
    futuras=fechas(sesiones[sesiones>corte][:30])
    if len(futuras)!=30:raise ValueError('Calendario insuficiente para 30 sesiones')
    return futuras

def pronosticos(panel,resultados,vol):
    corte=panel.index[-1];ts=list(panel)
    futuras=sesiones_pronostico(corte)
    audit=resultados['auditoria']
    c05={'definicion':'SUBE si P(t+30)>P(t); BAJA en otro caso. Modelos de panel reales, prueba temporal externa con embargo de 30 sesiones.','modelos':[],'predicciones':{},'tasa_base_sube':audit['tasa_base_sube'],'metodologia':audit}
    c06={'fechas_pronostico':futuras,'modelos':[],'predicciones':{},'metodologia':audit}
    for clave,destino in [('clasificacion',c05),('regresion',c06)]:
        for m in resultados[clave]: destino['modelos'].append({'modelo':m['modelo'],'familia':m['familia'],**m['metricas'],'hiperparametros':parametros_json(m['entrenamiento'])})
    for j,t in enumerate(ts):
        modelos=[{'modelo':m['modelo'],'familia':m['familia'],'prob_sube':round(float(m['actual'][j]),3)} for m in resultados['clasificacion']]
        for m in modelos: m['senal']='SUBE' if m['prob_sube']>=0.5 else 'BAJA'
        media=round(float(np.mean([m['prob_sube'] for m in modelos])),6);votos=sum(m['senal']=='SUBE' for m in modelos);dist=abs(Decimal(str(media))-Decimal('0.5'))
        c05['predicciones'][t]={'modelos':modelos,'votos_sube':votos,'votos_baja':18-votos,'prob_media':round(media,6),'consenso':'SUBE' if media>=0.5 else 'BAJA','confianza':'alta' if dist>=Decimal('0.08') else 'media' if dist>=Decimal('0.04') else 'baja'}
        ultimo=round(float(panel[t].iloc[-1]),6)
        caminos=np.array([ultimo*np.exp(m['actual'][j]) for m in resultados['regresion']]).round(6)
        if not np.isfinite(caminos).all() or (caminos<=0).any(): raise ValueError('Pronósticos de precios inválidos')
        med=np.median(caminos,axis=0).round(6);p10,p90=np.percentile(caminos,[10,90],axis=0)
        cono=1.2816*vol[j]/np.sqrt(252)*np.sqrt(np.arange(1,31))
        c06['predicciones'][t]={'precio_ultimo':ultimo,'modelos':[{'modelo':m['modelo'],'familia':m['familia'],'precios':caminos[i].tolist()} for i,m in enumerate(resultados['regresion'])],'ensamble_mediana':med.tolist(),'banda_p10':numeros(p10),'banda_p90':numeros(p90),'retorno_proyectado_30d_pct':round((med[-1]/ultimo-1)*100,2),'cono_volatilidad_inf':numeros(med*np.exp(-cono)),'cono_volatilidad_sup':numeros(med*np.exp(cono))}
    return c05,c06

def mercado(universo,datos,panel,c05,c06,c04):
    corte=str(panel.index[-1].date());ahora=datetime.now(timezone.utc).date().isoformat();ts=list(panel)
    ret=panel.pct_change().iloc[-252:];vol=ret.std(ddof=0).to_numpy()*np.sqrt(252); spy=ret.SPY.to_numpy()
    beta={t:float(np.cov(ret[t],spy,ddof=0)[0,1]/np.var(spy)) for t in ts}
    u=[];dashboard=[]
    for i,a in enumerate(universo):
        t=a['ticker'];p=panel[t];ultimo=round(float(p.iloc[-1]),6)
        u.append({k:a[k] for k in ['ticker','nombre','sector','nota','grupo']} | {'precio_ancla_'+corte:ultimo,'volatilidad_anual':round(float(vol[i]),12),'beta_SPY':round(beta[t],8)})
        dashboard.append({k:a[k] for k in ['ticker','nombre','grupo','sector']} | {'ultimo':ultimo,**{'var_'+n+'_pct':round(float(p.iloc[-1]/p.iloc[-1-h]-1)*100,6) for n,h in [('1d',1),('5d',5),('1m',21),('3m',63)]},'volatilidad_anual_pct':round(float(vol[i])*100,6),'beta_vs_SPY':round(beta[t],8),'volumen':int(datos[t].v.loc[panel.index[-1]])})
    demo=plantilla('11')
    for alerta in demo['alertas']:
        if alerta['tipo'] in ['precio_sobre','precio_bajo']: alerta['umbral']=round(float(panel[alerta['ticker']].iloc[-1])*(1.05 if alerta['tipo']=='precio_sobre' else 0.95),6)
    for pos in demo['portafolio_demo']['posiciones']:pos['costo']=round(float(panel[pos['ticker']].iloc[-64]),6)
    liga=[dict(a,ficticio=True) for a in plantilla('12')]
    metodos=[('Precios','OHLCV ajustado Yahoo Finance/yfinance; sin generar precios sinteticos.'),('Variables','Retornos, volatilidad, RSI, MACD, medias, volumen, SPY, VIX y grupo; solo pasado.'),('Validacion','252 fechas externas con embargo de 30 sesiones y escalado exclusivo de entrenamiento.'),('Modelos','11 ML y 7 DL por tarea; entrenamiento de panel, semilla 2026.'),('Proyecciones','Regresion de log-retornos; ML seis horizontes interpolados, DL treinta salidas.'),('Optimizacion','cvxpy y pymoo; mu mezcla mediana anualizada y CAPM, covarianza Ledoit-Wolf.'),('Backtesting','Walk-forward mensual causal, comision 5 pb; 1/N diario sin comision.'),('Limitaciones','Historia ajustada descargada hoy puede contener revisiones posteriores a cortes historicos; universo fijo y sesgo de supervivencia. Liga ficticia y trading simulado.')]
    c13={'semilla':2026,'fecha_ancla_precios':corte,'fecha_generacion':ahora,'fuentes_de_anclaje':[FUENTE],'que_es_real':'Precios OHLCV ajustados de Yahoo Finance. Modelos entrenados por el Equipo A, evaluación externa y optimización ejecutadas con esos datos.','que_es_sintetico':'Liga ficticia, cartera demo y operaciones simuladas. Pronósticos son estimaciones, no precios futuros observados. No hay patrones sintéticos impuestos a los precios.','patrones_aplicados':[{'id':f'R{i+1}','nombre':n,'detalle':d} for i,(n,d) in enumerate(metodos)],'parametros':{'N_HIST':504,'N_FC':30,'RF':0.04,'TOPE_PESO':0.25,'clasificadores':18,'regresores':18},'parametros_por_ticker':[{'ticker':t,'vol_anual_estimada':round(float(vol[i]),12),'beta_SPY':round(beta[t],8),'p_sube_latente':c05['predicciones'][t]['prob_media'],'retorno_esperado_30d_simulado_pct':c06['predicciones'][t]['retorno_proyectado_30d_pct']} for i,t in enumerate(ts)],'aviso':FUENTE+'. Pueden tener retrasos o errores. Modelos y pronósticos educativos; no es asesoría de inversión.','metodologia':{'campos_heredados':'p_sube_latente representa prob_media real; retorno_esperado_30d_simulado_pct representa proyección real; nombres conservados por contrato.'}}
    out={'01':u,'02':{'fechas':fechas(panel.index[-504:]),'cierres':{t:numeros(panel[t].iloc[-504:]) for t in ts},'nota':'REALES: cierres ajustados de Yahoo Finance obtenidos con yfinance. Nombre conservado por contrato.'},'03':{'fechas':fechas(panel.index[-120:]),'series':{t:{k:numeros(datos[t].loc[panel.index[-120:],k],0 if k=='v' else 6) for k in ['o','h','l','c','v']} for t in ts}},'04':c04,'05':c05,'06':c06,'10':dashboard,'11':demo,'12':liga,'13':c13}
    return out
