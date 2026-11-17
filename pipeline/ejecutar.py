"""Pipeline reproducible: descarga, 36 modelos, optimización, backtest y publicación validada."""
import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import numpy as np
from .descarga import descargar
from .descarga_cierres import ROOT,CACHE,FUENTE,corte_cerrado
from .variables import construir
from .modelos import entrenar
from .mercado import ARCHIVOS,pronosticos,mercado,fechas,numeros
from .optimizador import ejecutar as optimizar,portafolios
from .backtesting import ejecutar as backtesting
from tools.validar_contrato import validar

def escribir(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n',encoding='utf-8',newline='\n')

def generar(universo,datos,panel,corte,epocas):
    p=panel.loc[:corte];d={t:df.loc[:corte] for t,df in datos.items()}
    x,y,nombres=construir(universo,d,p)
    resultado=entrenar(x,y,p.index,corte,epocas)
    vol=p.pct_change().iloc[-252:].std(ddof=0).to_numpy()*np.sqrt(252)
    c05,c06=pronosticos(p,resultado,vol)
    c07,c04=optimizar(p,universo,c05,c06)
    c08=portafolios(c07,c05,c06,universo,datetime.now(timezone.utc).date().isoformat())
    out=mercado(universo,d,p,c05,c06,c04)
    out.update({'07':c07,'08':c08,'09':backtesting(p)})
    return out,resultado['auditoria']|{'variables':nombres}

def publicar(staging,salida):
    salida=salida.resolve(); staging=staging.resolve()
    # Solo el árbol data_real del clon propio. Nunca data/ ni otro checkout.
    if salida!=(ROOT/'data_real').resolve() or CACHE.resolve() not in staging.parents:
        raise ValueError('Publicación fuera del destino permitido')
    backup=CACHE/('respaldo-'+datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f'))
    if salida.exists():os.replace(salida,backup)
    try:os.replace(staging,salida)
    except BaseException:
        if backup.exists():os.replace(backup,salida)
        raise
    print('PUBLICACIÓN VALIDADA: '+str(salida),flush=True)

def ejecutar(salida,corte=None,modo='completo',epocas=3):
    inicio=time.monotonic();u,datos,panel,rellenos=descargar(corte)
    corte=str(panel.index[-1].date());salida=Path(salida).resolve()
    staging=Path(tempfile.mkdtemp(prefix='publicacion-',dir=CACHE))
    out,audit=generar(u,datos,panel,corte,epocas)
    for n,obj in out.items():escribir(staging/ARCHIVOS[n],obj)
    for t in panel:
        df=datos[t]
        escribir(staging/'precios'/f'{t}.json',{'ticker':t,'desde':str(df.index[0].date()),'fechas':fechas(df.index),**{k:numeros(df[k],0 if k=='v' else 4) for k in ['o','h','l','c','v']}})
    escribir(staging/'cierres_historicos.json',{'fechas':fechas(panel.index),'cierres':{t:numeros(panel[t],8) for t in panel}})
    if (salida/'cortes').exists():shutil.copytree(salida/'cortes',staging/'cortes')
    cortes=[]
    if modo in ['completo','cortes']:
        mensuales=panel.groupby(panel.index.to_period('M')).tail(1).index
        cortes=[str(f.date()) for f in mensuales if f.to_period('M')<panel.index[-1].to_period('M')][-12:]
        # Cortes independientes; dos procesos CPU, cuatro hilos por modelo.
        with ProcessPoolExecutor(max_workers=2) as pool:
            trabajos={pool.submit(generar,u,datos,panel,fecha,epocas):fecha for fecha in cortes}
            for trabajo in as_completed(trabajos):
                fecha=trabajos[trabajo];hist,ha=trabajo.result()
                for n in ['05','06','07','08']:escribir(staging/'cortes'/fecha/ARCHIVOS[n],hist[n])
                escribir(staging/'cortes'/fecha/'auditoria.json',ha)
                print('CORTE HISTÓRICO LISTO '+fecha,flush=True)
    elif (staging/'cortes/index.json').exists():cortes=json.loads((staging/'cortes/index.json').read_text())['cortes']
    escribir(staging/'cortes/index.json',{'ultimo':corte,'cortes':cortes})
    reloj=datetime.now(timezone.utc)
    cal,ultimo=corte_cerrado(reloj)
    ahora=reloj.isoformat().replace('+00:00','Z')
    meta={'version_contrato':'1.0.0','generado_en':ahora,'fecha_corte':corte,'fuente':FUENTE,'tickers_ok':[t for t in panel if not rellenos[t]],'tickers_con_problemas':[t for t in panel if rellenos[t]],'stale':len(cal.sessions_in_range(corte,ultimo))-1>5,'duracion_s':round(time.monotonic()-inicio,3),'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'aviso':'Datos reales de Yahoo Finance obtenidos con yfinance (proyecto no afiliado a Yahoo). Modelos entrenados por el Equipo A con fines educativos; pueden tener errores. No es asesoría de inversión. Historia ajustada revisable, universo fijo.','metodologia':{'auto_adjust':True,'sesiones_rellenadas':rellenos,'cierres_sha256':hashlib.sha256((staging/'cierres_historicos.json').read_bytes()).hexdigest(),'evaluacion':audit,'modo':modo,'cortes_publicados':len(cortes),'epocas_max_dl':epocas,'diario':'Reentrenamiento DL reducido, no reutiliza pesos entrenados después de la prueba','ajustes_historicos':'Descarga actual ajustada por splits/dividendos; no es una base point-in-time de versiones históricas.'}}
    escribir(staging/'meta.json',meta)
    informe=validar(staging,'real')
    # Valida también la coherencia de cada snapshot con su propio corte y datos pasados.
    for fecha in cortes:
        histdir=staging/'cortes'/fecha
        for n in ['05','06','07','08']:
            contenido=json.loads((histdir/ARCHIVOS[n]).read_text(encoding='utf-8'))
            if n in ['05','06'] and contenido['metodologia']['ultima_etiqueta_prueba']>fecha:raise ValueError('Fuga corte histórico')
        aud=json.loads((histdir/'auditoria.json').read_text(encoding='utf-8'))
        if aud['ultima_etiqueta_entrenamiento']>=aud['prueba_inicio']:raise ValueError('Fuga corte histórico entrenamiento')
    print(json.dumps(informe,ensure_ascii=False),flush=True)
    publicar(staging,salida)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--salida',type=Path,default=ROOT/'data_real');p.add_argument('--corte');p.add_argument('--modo',choices=['diario','cortes','completo'],default='completo');p.add_argument('--epocas',type=int,default=3)
    a=p.parse_args()
    if not 1<=a.epocas<=15: p.error('Épocas entre 1 y 15')
    ejecutar(a.salida,a.corte,a.modo,a.epocas)
