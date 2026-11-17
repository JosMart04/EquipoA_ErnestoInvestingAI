"""Validador independiente del contrato 1.0.0; falla antes de publicar."""
import argparse
from decimal import Decimal
import hashlib
import json
import re
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
CLAS=['Regresion logistica','SVC (kernel RBF)','k-vecinos (kNN)','Naive Bayes gaussiano','Arbol de decision','Random Forest','Extra Trees','AdaBoost','Gradient Boosting','XGBoost','LightGBM']
REG=['Regresion lineal','Ridge','Lasso','Elastic Net','SVR (RBF)','k-vecinos (kNN)','Arbol de decision','Random Forest','Gradient Boosting','XGBoost','LightGBM']
DL=['MLP (red densa)','RNN simple','LSTM','GRU','BiLSTM','CNN 1D','Transformer']

def exigir(ok,msg):
    if not ok: raise ValueError(msg)

def finitos(x):
    if isinstance(x,dict):
        for v in x.values():finitos(v)
    elif isinstance(x,list):
        for v in x:finitos(v)
    elif isinstance(x,(int,float)): exigir(np.isfinite(x),'Número no finito')

def cargar(ruta,n):
    files=list(ruta.glob(f'{n:02d}_*.json'));exigir(len(files)==1,f'Archivo {n:02d} ausente o duplicado')
    return json.loads(files[0].read_text(encoding='utf-8'))

def validar_predicciones(d,ts,corte,modo):
    for n,nombres in [(5,CLAS+DL),(6,REG+DL)]:
        exigir([m['modelo'] for m in d[n]['modelos']]==nombres,f'Nombres {n}')
        exigir([m['familia'] for m in d[n]['modelos']]==['ML']*11+['DL']*7,f'Familias {n}')
        for m in d[n]['modelos']:
            if n==5:
                exigir(all(0<=m[k]<=1 for k in ['exactitud','precision','recall','f1','auc']),'Métricas binarias')
                exigir(sum(m['matriz_confusion'].values())==m['n_prueba']>0,'I-02 matriz')
            else: exigir(all(m[k]>=0 for k in ['mape_30d_pct','mae_relativo_pct','rmse_relativo_pct']),'Errores regresión')
    exigir(len(d[6]['fechas_pronostico'])==30 and d[6]['fechas_pronostico']==sorted(set(d[6]['fechas_pronostico'])) and min(d[6]['fechas_pronostico'])>corte,'Fechas pronóstico')
    literal=[]
    for i,t in enumerate(ts):
        c=np.array(d[2]['cierres'][t]);ohlc=d[3]['series'][t]
        p=d[5]['predicciones'][t];modelos=p['modelos'];exigir([m['modelo'] for m in modelos]==CLAS+DL,'I-02 nombres ticker')
        ps=[m['prob_sube'] for m in modelos];exigir(all(0<=v<=1 for v in ps),'Probabilidades')
        exigir(all(m['senal']==('SUBE' if m['prob_sube']>=0.5 else 'BAJA') for m in modelos),'I-02 señales')
        vs=sum(v>=0.5 for v in ps);exigir(p['votos_sube']==vs and p['votos_baja']==18-vs,'I-02 votos')
        exigir(abs(p['prob_media']-np.mean(ps))<=0.0015,'I-02 media');pm=p['prob_media']
        exigir(p['consenso']==('SUBE' if pm>=0.5 else 'BAJA'),'I-02 consenso')
        distancia=abs(Decimal(str(pm))-Decimal('0.5'));exigir(p['confianza']==('alta' if distancia>=Decimal('0.08') else 'media' if distancia>=Decimal('0.04') else 'baja'),'I-02 confianza')
        q=d[6]['predicciones'][t];exigir([m['modelo'] for m in q['modelos']]==REG+DL,'I-03 modelos')
        precios=np.array([m['precios'] for m in q['modelos']]);exigir(precios.shape==(18,30) and (precios>0).all(),'I-03 precios')
        med=np.array(q['ensamble_mediana']);exigir(np.allclose(med,np.median(precios,axis=0),atol=0.005+1e-9,rtol=0),'I-03 mediana')
        for nombre,pc in [('banda_p10',10),('banda_p90',90)]:exigir(np.allclose(q[nombre],np.percentile(precios,pc,axis=0),atol=0.005+1e-9,rtol=0),'I-03 percentiles')
        exigir(round((med[-1]/q['precio_ultimo']-1)*100,2)==q['retorno_proyectado_30d_pct'],'I-03b')
        if abs(med[-1]-q['precio_ultimo']*(1+q['retorno_proyectado_30d_pct']/100))>0.01:literal.append(t)
        ancla=next(v for k,v in d[1][i].items() if k.startswith('precio_ancla_'))
        exigir(max(abs(c[-1]-v) for v in [ancla,q['precio_ultimo'],d[10][i]['ultimo'],ohlc['c'][-1]])<1e-5,'I-07')
        for campo,signo in [('cono_volatilidad_inf',-1),('cono_volatilidad_sup',1)]:
            esperado=med*np.exp(signo*1.2816*d[1][i]['volatilidad_anual']/np.sqrt(252)*np.sqrt(np.arange(1,31)))
            exigir(np.allclose(q[campo],esperado,atol=0.03 if modo=='profesor' else 1e-4,rtol=0),'I-03 cono')
    return literal

def validar_carteras(d,ts,modo):
    esperados=[t for t in ts if d[5]['predicciones'][t]['consenso']=='SUBE' and d[6]['predicciones'][t]['retorno_proyectado_30d_pct']>0]
    if modo=='real' and len(esperados)<4:
        for t in sorted(ts,key=lambda t:-d[5]['predicciones'][t]['prob_media']):
            if len(esperados)>=4:break
            if t not in esperados:esperados.append(t)
        esperados=[t for t in ts if t in esperados]
        exigir('Se agregaron' in d[7]['nota'],'Aviso elegibles ampliados')
    exigir(d[7]['elegibles']==esperados,'I-04 elegibles')
    for clave,n in [('markowitz_universo_completo',35),('markowitz_elegibles',35),('nsga2_elegibles',40),('nsga3_elegibles',60)]:
        exigir(len(d[7][clave])==n,'Tamaño frontera')
        for j,p in enumerate(d[7][clave]):
            w=p['pesos'];exigir(set(w)<=set(ts if clave.endswith('completo') else esperados),'Pesos fuera del universo')
            exigir(0.98<=sum(w.values())<=1.02 and all(0<=v<=d[7]['tope_peso_por_activo']+1e-8 for v in w.values()),'I-04 pesos')
            exigir(abs(p['sharpe']-(p['retorno_esperado_anual_pct']-100*d[7]['tasa_libre_riesgo'])/p['volatilidad_anual_pct'])<=0.01,'I-04 Sharpe')
            if modo=='real':
                vector=np.array([w.get(t,0) for t in ts])
                exigir(abs(vector.sum()-1)<1e-8,'Presupuesto real exacto')
                cierres=np.array([d[2]['cierres'][t][-253:] for t in ts]).T
                perdidas=-((cierres[1:]/cierres[:-1]-1)@vector)
                cola=int(np.ceil(len(perdidas)*0.05))
                cvar=float(np.partition(perdidas,len(perdidas)-cola)[-cola:].mean()*100)
                exigir(abs(cvar-p['cvar95_diario_pct'])<1e-4,'CVaR real desde pesos y cierres')
                if 4 in d:
                    retorno=float(vector@np.array(d[4]['retorno_esperado_anual_simulado'])*100)
                    volatilidad=float(np.sqrt(vector@np.array(d[4]['covarianza_anual'])@vector)*100)
                    exigir(abs(retorno-p['retorno_esperado_anual_pct'])<1e-4,'Retorno real desde pesos y mu')
                    exigir(abs(volatilidad-p['volatilidad_anual_pct'])<1e-4,'Volatilidad real desde pesos y covarianza')
            if clave.startswith('nsga'):exigir(p['id']==f'N{2 if clave.startswith("nsga2") else 3}-{j+1:02d}','IDs NSGA')
    grupos={a['ticker']:a['grupo'] for a in cargar(ROOT/'data',1)}
    exigir([p['nivel'] for p in d[8]['niveles']]==['Conservador','Moderado','Agresivo'],'I-05 niveles')
    for p in d[8]['niveles']:
        id=re.search(r'N2-\d+',p['origen']).group();ref=next(a for a in d[7]['nsga2_elegibles'] if a['id']==id)
        exigir(all(p[k]==ref[k] for k in ref if k!='id'),'I-09 origen')
        if modo=='real':exigir({a['ticker'] for a in p['detalle_activos']}=={t for t,w in p['pesos'].items() if w>=0.01},'Detalle de pesos al menos 1 %')
        for a in p['detalle_activos']:
            if modo=='real':
                exigir(a['grupo']==grupos[a['ticker']],'Grupo del portafolio')
                exigir(abs(a['peso_pct']-p['pesos'][a['ticker']]*100)<1e-5,'Peso porcentual del detalle')
            t=a['ticker'];razon=f"{d[5]['predicciones'][t]['votos_sube']}/18 clasificadores = SUBE; proyeccion mediana 30 sesiones {d[6]['predicciones'][t]['retorno_proyectado_30d_pct']:+.2f} %"
            exigir(a['razon']==razon,'I-05 razón')

def validar_auditoria(a,fechas,corte):
    exigir(a['embargo_sesiones']==30 and a['fechas_prueba']==252 and a['n_prueba']==252*26,'Prueba temporal')
    ix={f:i for i,f in enumerate(fechas)}
    for clave in ['entrenamiento_inicio','entrenamiento_fin','ultima_etiqueta_entrenamiento','prueba_inicio','prueba_fin','ultima_etiqueta_prueba','reentrenamiento_fin']:
        exigir(a[clave] in ix and a[clave]<=corte,'Fecha de auditoría fuera del corte: '+clave)
    exigir(ix[a['ultima_etiqueta_entrenamiento']]-ix[a['entrenamiento_fin']]==30,'Horizonte entrenamiento')
    exigir(ix[a['prueba_inicio']]-ix[a['entrenamiento_fin']]-1==30,'Embargo de 30 sesiones efectivas')
    exigir(ix[a['prueba_fin']]-ix[a['prueba_inicio']]+1==252,'252 sesiones de prueba efectivas')
    exigir(ix[a['ultima_etiqueta_prueba']]-ix[a['prueba_fin']]==30,'Horizonte prueba')
    exigir(a['ultima_etiqueta_prueba']==corte and a['reentrenamiento_fin']==a['prueba_fin'],'Etiquetas disponibles al corte')
    exigir(a['entrenamiento_inicio']<=a['entrenamiento_fin']<a['ultima_etiqueta_entrenamiento']<a['prueba_inicio'],'Orden temporal')

def validar_cortes(ruta,ts,historico,meta):
    indice=json.loads((ruta/'cortes/index.json').read_text(encoding='utf-8'))
    cortes=indice['cortes'];corte=meta['fecha_corte']
    exigir(indice['ultimo']==corte and cortes==sorted(set(cortes)),'Índice de cortes')
    mensuales={f[:7]:f for f in historico['fechas'] if f[:7]<corte[:7]}
    esperados=list(mensuales.values())[-12:]
    exigir(all(f in mensuales.values() for f in cortes),'Corte no es última sesión de mes')
    if meta['metodologia']['modo'] in ['completo','cortes']:exigir(cortes==esperados,'Doce cierres mensuales previos')
    exigir(len(cortes)==meta['metodologia']['cortes_publicados'],'Número de cortes meta')
    exigir({p.name for p in (ruta/'cortes').iterdir() if p.is_dir()}==set(cortes),'Carpetas de cortes fuera del índice')
    for fecha in cortes:
        exigir(fecha<corte,'Corte futuro')
        destino=ruta/'cortes'/fecha
        d={n:cargar(destino,n) for n in [5,6,7,8]}
        for v in d.values():finitos(v)
        fechas=historico['fechas'];fin=fechas.index(fecha)+1
        precios={t:historico['cierres'][t][:fin] for t in ts}
        exigir(all(len(v)>=504 for v in precios.values()),'Historia del corte insuficiente')
        ultimos={t:v[-1] for t,v in precios.items()}
        # Campos auxiliares reconstruidos exclusivamente de cierres anteriores al corte.
        d[1]=[{'precio_ancla_corte':ultimos[t],'volatilidad_anual':float(np.std(np.diff(precios[t][-253:])/precios[t][-253:-1],ddof=0)*np.sqrt(252))} for t in ts]
        d[2]={'cierres':{t:v[-504:] for t,v in precios.items()}}
        d[3]={'series':{t:{'c':[ultimos[t]]} for t in ts}}
        d[10]=[{'ultimo':ultimos[t]} for t in ts]
        for n in [5,6]:
            exigir(list(d[n]['predicciones'])==ts,'Tickers del corte')
            validar_auditoria(d[n]['metodologia'],fechas[:fin],fecha)
            exigir(all(m['n_prueba']==252*26 for m in d[n]['modelos']),'n_prueba del corte')
        auditoria=json.loads((destino/'auditoria.json').read_text(encoding='utf-8'))
        validar_auditoria(auditoria,fechas[:fin],fecha)
        for n in [5,6]:exigir(all(d[n]['metodologia'].get(k)==v for k,v in auditoria.items() if k!='variables'),'Auditoría del corte incoherente')
        validar_predicciones(d,ts,fecha,'real')
        validar_carteras(d,ts,'real')
    return len(cortes)

def validar(ruta,modo='real'):
    ruta=Path(ruta);d={n:cargar(ruta,n) for n in range(1,14)}
    for n,v in d.items():
        finitos(v)
        profesor=cargar(ROOT/'data',n)
        exigir(isinstance(v,type(profesor)),f'Tipo raíz {n}')
        if isinstance(v,dict): exigir(set(profesor)<=set(v),f'Campos raíz {n}')
    ts=[a['ticker'] for a in d[1]];exigir(len(ts)==26 and len(set(ts))==26,'I-01 universo')
    exigir(ts==[a['ticker'] for a in cargar(ROOT/'data',1)],'Orden canónico')
    for contenido in [d[2]['cierres'],d[3]['series'],d[5]['predicciones'],d[6]['predicciones']]:exigir(list(contenido)==ts,'I-01 tickers/orden')
    exigir(d[4]['tickers']==ts and [a['ticker'] for a in d[10]]==ts and [a['ticker'] for a in d[13]['parametros_por_ticker']]==ts,'I-01 orden')
    for n,longitud in [(2,504),(3,120)]:
        f=d[n]['fechas'];exigir(len(f)==longitud and f==sorted(set(f)),'Fechas históricas')
    corte=d[13]['fecha_ancla_precios'];exigir(d[2]['fechas'][-1]==d[3]['fechas'][-1]==corte,'I-08/I-11')
    corr=np.array(d[4]['correlacion']);cov=np.array(d[4]['covarianza_anual'])
    exigir(corr.shape==cov.shape==(26,26),'I-01 matrices')
    exigir(np.allclose(cov,cov.T,atol=1e-8) and np.linalg.eigvalsh(cov).min()>-1e-7,'Covarianza no PSD')
    exigir(np.allclose(np.diag(corr),1,atol=1e-6) and np.abs(corr).max()<=1.000001,'Correlación')
    for i,t in enumerate(ts):
        c=np.array(d[2]['cierres'][t]);ohlc=d[3]['series'][t]
        exigir(c.shape==(504,) and (c>0).all(),'Cierres')
        exigir(all(len(ohlc[k])==120 for k in ['o','h','l','c','v']),'OHLCV')
        exigir(np.all(np.array(ohlc['h'])>=np.maximum(ohlc['o'],ohlc['c'])-1e-5),'High OHLCV')
        exigir(np.all(np.array(ohlc['l'])<=np.minimum(ohlc['o'],ohlc['c'])+1e-5),'Low OHLCV')
        exigir(np.all(np.array(ohlc['v'])>=0),'Volumen')
    literal=validar_predicciones(d,ts,corte,modo)
    validar_carteras(d,ts,modo)
    b=d[9];exigir(b['fechas'][0]=='inicio' and len(b['fechas'])==253 and b['base']==100,'I-06 fechas/base')
    exigir(b['fechas'][1:]==d[2]['fechas'][-252:],'I-06 fechas sesiones')
    for nombre,s in (b['carteras']|b['referencias']).items():
        c=np.array(s['curva']);m=s['metricas'];exigir(len(c)==253 and c[0]==100 and (c>0).all(),'I-06 curva')
        exigir(abs((c[-1]/100-1)*100-m['retorno_total_pct'])<=0.05,'R-BT-06')
        exigir(abs(m['sharpe']-(m['cagr_pct']-100*d[7]['tasa_libre_riesgo'])/m['volatilidad_anual_pct'])<=0.0011,'I-10 Sharpe')
        exigir(abs(m['calmar']-m['cagr_pct']/abs(m['max_drawdown_pct']))<=0.0021,'I-10 Calmar')
        if modo=='real':
            diario=c[1:]/c[:-1]-1;vol=float(np.std(diario,ddof=0)*np.sqrt(252)*100)
            exigir(abs(vol-m['volatilidad_anual_pct'])<1e-4,'Volatilidad real poblacional')
            dd=(c/np.maximum.accumulate(c)-1)*100
            exigir(abs(float(dd.min())-m['max_drawdown_pct'])<1e-4,'Drawdown real')
        if nombre in b['carteras']:
            exigir(len(s['rebalanceos'])==12 and len(s['drawdown'])==253 and max(s['drawdown'])<=0,'I-06 rebalanceos/dd')
            for j,reb in enumerate(s['rebalanceos']):
                exigir(reb['fecha']==d[2]['fechas'][-252+j*21],'Fecha rebalanceo')
                exigir(abs(sum(reb['pesos'].values())-1)<=0.02,'Pesos rebalanceo')
        else:
            precios=np.array([d[2]['cierres'][t][-253:] for t in ts]).T
            if nombre=='Igual ponderado (1/N)': esperado=100*np.r_[1,np.cumprod(1+(precios[1:]/precios[:-1]-1).mean(axis=1))]
            else: esperado=100*precios[:,ts.index(nombre)]/precios[0,ts.index(nombre)]
            exigir(np.allclose(c,esperado,atol=0.001,rtol=0),'I-10 referencia')
    if modo=='profesor':
        plan=(ROOT/'docs/contexto/PLAN_MAESTRO.md').read_text(encoding='utf-8')
        for sha,nombre in re.findall(r'(?m)^([0-9a-f]{64})  (\S+\.json)$',plan):exigir(hashlib.sha256((ruta/nombre).read_bytes()).hexdigest()==sha,'SHA profesor '+nombre)
    else:
        meta=json.loads((ruta/'meta.json').read_text(encoding='utf-8'))
        exigir(meta['fecha_corte']==corte and meta['version_contrato']=='1.0.0','Meta contrato/corte')
        exigir('Yahoo Finance' in meta['fuente'] and 'yfinance' in meta['fuente'],'Atribución')
        exigir('Yahoo Finance' in ' '.join(d[13]['fuentes_de_anclaje']) and 'yfinance' in ' '.join(d[13]['fuentes_de_anclaje']),'Atribución 13')
        historico=json.loads((ruta/'cierres_historicos.json').read_text(encoding='utf-8'))
        exigir(historico['fechas'][-1]==corte and list(historico['cierres'])==ts,'Cierres históricos')
        exigir(hashlib.sha256((ruta/'cierres_historicos.json').read_bytes()).hexdigest()==meta['metodologia']['cierres_sha256'],'Hash cierres históricos')
        for t in ts:
            exigir(len(historico['cierres'][t])==len(historico['fechas']),'Longitud histórica')
            individual=json.loads((ruta/'precios'/f'{t}.json').read_text(encoding='utf-8'))
            exigir(individual['fechas'][-1]==corte and all(len(individual[k])==len(individual['fechas']) for k in ['o','h','l','c','v']),'Precios individuales')
        demo=cargar(ROOT/'data',11)
        exigir(d[11]['watchlist_inicial']==demo['watchlist_inicial'],'Watchlist inicial')
        for a in d[11]['alertas']:
            if a['tipo'] in ['precio_sobre','precio_bajo']:
                ref=d[10][ts.index(a['ticker'])]['ultimo']*(1.05 if a['tipo']=='precio_sobre' else 0.95)
                exigir(abs(a['umbral']-ref)<1e-5,'Umbral real')
        for p in d[11]['portafolio_demo']['posiciones']:
            exigir(abs(p['costo']-d[2]['cierres'][p['ticker']][-64])<1e-5,'Costo demo')
        validar_auditoria(d[5]['metodologia'],historico['fechas'],corte)
        validar_auditoria(d[6]['metodologia'],historico['fechas'],corte)
        validar_cortes(ruta,ts,historico,meta)
        audit=d[5]['metodologia'];exigir(audit['ultima_etiqueta_entrenamiento']<audit['prueba_inicio'] and audit['ultima_etiqueta_prueba']<=corte,'Fuga temporal')
        exigir(audit['embargo_sesiones']==30 and audit['fechas_prueba']==252 and audit['n_prueba']==252*26,'Prueba temporal')
        exigir(all(m['n_prueba']==252*26 for m in d[5]['modelos']+d[6]['modelos']),'n_prueba real')
        exigir(all(a.get('ficticio') is True for a in d[12]),'Liga ficticia')
        exigir(sum(p.stat().st_size for p in ruta.rglob('*.json'))<=15_000_000,'Presupuesto 15 MB')
    return {'modo':modo,'tickers':26,'archivos':13,'corte':corte,'R_REG_09_literal_incumple':literal}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('ruta',type=Path);p.add_argument('--modo',choices=['real','profesor'],required=True);a=p.parse_args()
    print(json.dumps(validar(a.ruta,a.modo),ensure_ascii=False))
