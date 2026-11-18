"""36 modelos reales: evaluación temporal y reentrenamiento para el corte."""
import hashlib
import json
from pathlib import Path
import warnings
import numpy as np
from sklearn.base import clone
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.naive_bayes import GaussianNB
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, AdaBoostClassifier, HistGradientBoostingClassifier, RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, r2_score
from xgboost import XGBClassifier, XGBRegressor
from lightgbm import LGBMClassifier, LGBMRegressor
from threadpoolctl import threadpool_limits
from .variables import indices, filas
from .descarga_cierres import CACHE

CLAS=['Regresion logistica','SVC (kernel RBF)','k-vecinos (kNN)','Naive Bayes gaussiano','Arbol de decision','Random Forest','Extra Trees','AdaBoost','Gradient Boosting','XGBoost','LightGBM']
REG=['Regresion lineal','Ridge','Lasso','Elastic Net','SVR (RBF)','k-vecinos (kNN)','Arbol de decision','Random Forest','Gradient Boosting','XGBoost','LightGBM']
DL=['MLP (red densa)','RNN simple','LSTM','GRU','BiLSTM','CNN 1D','Transformer']
SEED=2026
H=[4,9,14,19,24,29]

def algoritmos(clas):
    if clas:
        return [LogisticRegression(max_iter=500), SVC(C=1,probability=True,random_state=SEED), KNeighborsClassifier(n_neighbors=50), GaussianNB(), DecisionTreeClassifier(max_depth=5,random_state=SEED), RandomForestClassifier(n_estimators=80,max_depth=6,n_jobs=4,random_state=SEED), ExtraTreesClassifier(n_estimators=80,max_depth=6,n_jobs=4,random_state=SEED), AdaBoostClassifier(n_estimators=50,random_state=SEED), HistGradientBoostingClassifier(max_iter=80,max_leaf_nodes=15,random_state=SEED), XGBClassifier(n_estimators=80,max_depth=4,n_jobs=4,random_state=SEED), LGBMClassifier(n_estimators=80,max_depth=5,num_leaves=15,n_jobs=4,verbosity=-1,random_state=SEED)]
    return [LinearRegression(),Ridge(alpha=1),Lasso(alpha=0.001,max_iter=2000),ElasticNet(alpha=0.001,l1_ratio=0.5,max_iter=2000),SVR(C=1,epsilon=0.01),KNeighborsRegressor(n_neighbors=50),DecisionTreeRegressor(max_depth=5,random_state=SEED),RandomForestRegressor(n_estimators=80,max_depth=6,n_jobs=4,random_state=SEED),HistGradientBoostingRegressor(max_iter=80,max_leaf_nodes=15,random_state=SEED),XGBRegressor(n_estimators=80,max_depth=4,n_jobs=4,random_state=SEED),LGBMRegressor(n_estimators=80,max_depth=5,num_leaves=15,n_jobs=4,verbosity=-1,random_state=SEED)]

def evaluar(y,p,clas):
    if not np.isfinite(p).all(): raise ValueError('Predicción no finita')
    if clas:
        y=(y[:,-1]>0).astype(int); etiquetas=p>=0.5
        vn,fp,fn,vp=confusion_matrix(y,etiquetas,labels=[0,1]).ravel()
        return dict(exactitud=float(accuracy_score(y,etiquetas)),precision=float(precision_score(y,etiquetas,zero_division=0)),recall=float(recall_score(y,etiquetas,zero_division=0)),f1=float(f1_score(y,etiquetas,zero_division=0)),auc=float(roc_auc_score(y,p)),matriz_confusion=dict(VP=int(vp),FP=int(fp),VN=int(vn),FN=int(fn)),n_prueba=len(y))
    real=np.expm1(y[:,-1]); pred=np.expm1(p[:,-1]); error=pred-real
    mae=np.mean(np.abs(error)); base=np.mean(np.abs(real))
    return dict(mape_30d_pct=float(np.mean(np.abs(error)/(1+real))*100),mae_relativo_pct=float(mae*100),rmse_relativo_pct=float(np.sqrt(np.mean(error**2))*100),r2_retornos_30d=float(r2_score(real,pred)),mejora_vs_persistencia_pct=float((1-mae/base)*100),n_prueba=len(y))

def interpolar(p):
    return np.array([np.interp(np.arange(1,31),[0,5,10,15,20,25,30],np.r_[0,row]) for row in p])

def ajustar_ml(base,x,y,dias,destinos,clas,limite):
    fs=filas(dias,x.shape[1]); fs=fs[-12000:] if limite else fs
    xx=x[fs[:,0],fs[:,1]]; yy=y[fs[:,0],fs[:,1]]
    scaler=StandardScaler().fit(xx)
    modelo=clone(base) if clas else MultiOutputRegressor(clone(base),n_jobs=1)
    with threadpool_limits(limits=4):
        modelo.fit(scaler.transform(xx),(yy[:,-1]>0).astype(int) if clas else yy[:,H])
        resultados=[]
        for ds in destinos:
            f=filas(ds,x.shape[1]); z=scaler.transform(x[f[:,0],f[:,1]])
            if clas: resultados.append(modelo.predict_proba(z)[:,1])
            else: resultados.append(interpolar(modelo.predict(z)))
    return resultados

def entrenar(x,y,fechas,corte,epocas=3):
    from .modelos_dl import ajustar_dl
    train,test,all_days,actual=indices(x,y)
    f=filas(test,x.shape[1]); yt=y[f[:,0],f[:,1]]
    codigo=b''.join(p.read_bytes() for p in [Path(__file__).parent/n for n in ['modelos.py','modelos_dl.py','variables.py']])
    huella=hashlib.sha256(x.tobytes()+y.tobytes()+codigo+str(epocas).encode()).hexdigest()
    carpeta=CACHE/'modelos'/corte/huella[:16]; carpeta.mkdir(parents=True,exist_ok=True)
    resultados={}
    for clas in [True,False]:
        lista=[]
        nombres=(CLAS if clas else REG)+DL
        bases=algoritmos(clas)
        for i,nombre in enumerate(nombres):
            archivo=carpeta/f'{"c" if clas else "r"}-{i}.npz'
            if archivo.exists():
                guardado=np.load(archivo); ev=guardado['evaluacion']; live=guardado['actual']; extra=json.loads(str(guardado['extra']))
            elif i<11:
                limite=nombre in ['SVC (kernel RBF)','SVR (RBF)','k-vecinos (kNN)']
                ev=ajustar_ml(bases[i],x,y,train,[test],clas,limite)[0]
                live=ajustar_ml(bases[i],x,y,all_days,[actual],clas,limite)[0]
                extra={'max_filas':12000 if limite else None,'hiperparametros':bases[i].get_params()}
                np.savez_compressed(archivo,evaluacion=ev,actual=live,extra=json.dumps(extra,default=str))
            else:
                ev,live,extra=ajustar_dl(i-11,x,y,train,test,all_days,actual,clas,epocas,carpeta)
                np.savez_compressed(archivo,evaluacion=ev,actual=live,extra=json.dumps(extra))
            metricas=evaluar(yt,ev,clas)
            lista.append({'modelo':nombre,'familia':'ML' if i<11 else 'DL','metricas':metricas,'actual':live,'entrenamiento':extra})
            print(f'{corte} {"clasificador" if clas else "regresor"} {nombre}: medido y reentrenado',flush=True)
        resultados['clasificacion' if clas else 'regresion']=lista
    resultados['auditoria']={'huella':huella,'entrenamiento_inicio':str(fechas[train[0]].date()),'entrenamiento_fin':str(fechas[train[-1]].date()),'ultima_etiqueta_entrenamiento':str(fechas[train[-1]+30].date()),'prueba_inicio':str(fechas[test[0]].date()),'prueba_fin':str(fechas[test[-1]].date()),'ultima_etiqueta_prueba':str(fechas[test[-1]+30].date()),'embargo_sesiones':30,'n_prueba':len(test)*x.shape[1],'fechas_prueba':len(test),'tasa_base_sube':float((yt[:,-1]>0).mean()),'reentrenamiento_fin':str(fechas[all_days[-1]].date()),'epocas_max_dl':epocas,'panel':True}
    return resultados
