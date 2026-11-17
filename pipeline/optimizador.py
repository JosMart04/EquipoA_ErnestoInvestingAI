"""Markowitz exacto y NSGA-II/III con reparación al símplex acotado."""
import numpy as np
import cvxpy as cp
from pymoo.core.problem import Problem
from pymoo.core.repair import Repair
from pymoo.core.callback import Callback
from pymoo.util.nds.non_dominated_sorting import NonDominatedSorting
from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.algorithms.moo.nsga3 import NSGA3
from pymoo.util.ref_dirs import get_reference_directions
from pymoo.optimize import minimize
from sklearn.covariance import LedoitWolf

RF=0.04
TOPE=0.25

def proyectar(x,tope=TOPE):
    x=np.atleast_2d(x).astype(float)
    if x.shape[1]*tope<1-1e-12: raise ValueError('Tope no factible')
    lo=x.min(axis=1)-tope; hi=x.max(axis=1)
    for _ in range(60):
        mid=(lo+hi)/2; suma=np.clip(x-mid[:,None],0,tope).sum(axis=1)
        lo=np.where(suma>1,mid,lo); hi=np.where(suma>1,hi,mid)
    return np.clip(x-((lo+hi)/2)[:,None],0,tope)

def frontera(mu,cov,tope=TOPE,n=35):
    k=len(mu); w=cp.Variable(k)
    cons=[cp.sum(w)==1,w>=0,w<=tope]
    p=cp.Problem(cp.Minimize(cp.quad_form(w,cp.psd_wrap(cov))),cons)
    p.solve(solver='CLARABEL')
    if p.status not in ['optimal','optimal_inaccurate']: raise ValueError(p.status)
    minimo=float(mu@w.value)
    p=cp.Problem(cp.Maximize(mu@w),cons); p.solve(solver='CLARABEL')
    if p.status not in ['optimal','optimal_inaccurate']: raise ValueError(p.status)
    maximo=float(mu@w.value)
    out=[]
    for objetivo in np.linspace(minimo,maximo,n):
        p=cp.Problem(cp.Minimize(cp.quad_form(w,cp.psd_wrap(cov))),cons+[mu@w>=objetivo-1e-9]);p.solve(solver='CLARABEL')
        if p.status not in ['optimal','optimal_inaccurate']: raise ValueError(p.status)
        out.append(proyectar(w.value,tope)[0])
    return np.array(out)

def cvar(ret,w):
    perdidas=-(ret@w.T).T
    n=max(1,int(np.ceil(ret.shape[0]*0.05)))
    return np.sort(perdidas,axis=1)[:,-n:].mean(axis=1)

class Reparar(Repair):
    def _do(self,problem,X,**kwargs): return proyectar(X)

class ArchivoPareto(Callback):
    """Conserva soluciones realmente evaluadas; no modifica la evolución."""
    def __init__(self):
        super().__init__();self.X=None;self.F=None
    def notify(self,algorithm):
        x=algorithm.pop.get('X');f=algorithm.pop.get('F')
        if self.X is not None:x=np.vstack([self.X,x]);f=np.vstack([self.F,f])
        _,ids=np.unique(x.round(12),axis=0,return_index=True);x=x[ids];f=f[ids]
        ids=NonDominatedSorting().do(f,only_non_dominated_front=True)
        self.X=x[ids];self.F=f[ids]

class Carteras(Problem):
    def __init__(self,mu,cov,ret,nobj):
        super().__init__(n_var=len(mu),n_obj=nobj,xl=0,xu=TOPE)
        self.mu=mu;self.cov=cov;self.ret=ret
    def _evaluate(self,X,out,*args,**kwargs):
        columnas=[-(X@self.mu),np.sqrt(np.einsum('bi,ij,bj->b',X,self.cov,X))]
        if self.n_obj==3: columnas.append(cvar(self.ret,X))
        out['F']=np.column_stack(columnas)

def punto(w,tickers,mu,cov,ret):
    # Conservar pesos con 12 decimales; no recortar la composición al 1 %.
    w=np.round(w,12); retorno=float(w@mu); vol=float(np.sqrt(w@cov@w))
    return {'retorno_esperado_anual_pct':round(retorno*100,6),'volatilidad_anual_pct':round(vol*100,6),'sharpe':round((retorno-RF)/vol,6),'cvar95_diario_pct':round(float(cvar(ret,w[None,:])[0])*100,6),'pesos':{t:float(v) for t,v in zip(tickers,w) if v>0}}

def ejecutar(panel,universo,c05,c06):
    ts=list(panel);ret=panel.pct_change().iloc[-252:].to_numpy()
    cov=LedoitWolf().fit(ret).covariance_*252
    spy=ret[:,ts.index('SPY')]; beta=np.array([np.cov(ret[:,i],spy,ddof=0)[0,1]/np.var(spy) for i in range(len(ts))])
    r=np.array([c06['predicciones'][t]['retorno_proyectado_30d_pct']/100 for t in ts])
    mu=0.5*np.clip(np.expm1(np.log1p(r)*252/30),-0.5,0.8)+0.5*(RF+beta*0.05)
    eleg=[t for t in ts if c05['predicciones'][t]['consenso']=='SUBE' and c06['predicciones'][t]['retorno_proyectado_30d_pct']>0]
    agregados=[]
    for t in sorted(ts,key=lambda t:-c05['predicciones'][t]['prob_media']):
        if len(eleg)>=4: break
        if t not in eleg: eleg.append(t);agregados.append(t)
    eleg=[t for t in ts if t in eleg];ix=[ts.index(t) for t in eleg]
    m=mu[ix];s=cov[np.ix_(ix,ix)];rr=ret[:,ix]
    mw=frontera(mu,cov);me=frontera(m,s)
    resultado={'elegibles':eleg,'criterio_elegibilidad':'Consenso SUBE y proyeccion mediana positiva; completar hasta cuatro por probabilidad media si es necesario.','tope_peso_por_activo':TOPE,'tasa_libre_riesgo':RF,'markowitz_universo_completo':[punto(w,ts,mu,cov,ret) for w in mw],'markowitz_elegibles':[punto(w,eleg,m,s,rr) for w in me]}
    notas=[]
    for objetivos,cantidad,clave,prefijo in [(2,40,'nsga2_elegibles','N2'),(3,60,'nsga3_elegibles','N3')]:
        algoritmo=NSGA2(pop_size=100,repair=Reparar()) if objetivos==2 else NSGA3(ref_dirs=get_reference_directions('das-dennis',3,n_partitions=12),repair=Reparar())
        res=minimize(Carteras(m,s,rr,objetivos),algoritmo,('n_gen',200),seed=2026,callback=ArchivoPareto(),verbose=False)
        if res.X is None: raise ValueError('NSGA sin solución')
        pesos=res.X if objetivos==2 else res.algorithm.callback.X;vol=np.sqrt(np.einsum('bi,ij,bj->b',pesos,s,pesos));pesos=pesos[np.argsort(vol)]
        # Si el frente tiene menos puntos, no inventar soluciones: repetir y declararlo.
        ids=np.linspace(0,len(pesos)-1,cantidad).round().astype(int)
        resultado[clave]=[dict(id=f'{prefijo}-{j+1:02d}',**punto(pesos[k],eleg,m,s,rr)) for j,k in enumerate(ids)]
        procedencia='de la poblacion final' if objetivos==2 else 'archivadas de las 200 generaciones'
        notas.append(f'{prefijo}: {len(pesos)} soluciones no dominadas {procedencia}; {cantidad} puntos publicados ({len(set(ids))} distintos).')
    resultado['nota']='NSGA-II y NSGA-III ejecutados con pymoo, semilla 2026, 200 generaciones, NSGA-II desde el frente final y NSGA-III desde un archivo de soluciones no dominadas evaluadas (sin modificar la evolucion). Markowitz: cvxpy/CLARABEL. CVaR historico diario al 95 %. '+ ' '.join(notas)
    if agregados: resultado['nota']+=' Se agregaron '+', '.join(agregados)+' para poder respetar el tope de 25 %.'
    resultado['metodologia']={'mu':'0.5 * anualizacion de mediana recortada [-0.50,0.80] + 0.5 * (0.04 + beta * 0.05)','covarianza':'Ledoit-Wolf, ultimas 252 sesiones','elegibles_agregados':agregados}
    c04={'tickers':ts,'correlacion':np.corrcoef(ret,rowvar=False).round(10).tolist(),'covarianza_anual':cov.round(12).tolist(),'retorno_esperado_anual_simulado':mu.round(12).tolist()}
    return resultado,c04

def portafolios(c07,c05,c06,universo,fecha):
    frente=c07['nsga2_elegibles']; grupos={a['ticker']:a['grupo'] for a in universo}
    elegidos=[min(frente,key=lambda p:p['volatilidad_anual_pct']),max(frente,key=lambda p:p['sharpe']),max(frente,key=lambda p:p['retorno_esperado_anual_pct'])]
    niveles=[]
    for nivel,p in zip(['Conservador','Moderado','Agresivo'],elegidos):
        detalle=[{'ticker':t,'peso_pct':round(w*100,6),'grupo':grupos[t],'razon':f"{c05['predicciones'][t]['votos_sube']}/18 clasificadores = SUBE; proyeccion mediana 30 sesiones {c06['predicciones'][t]['retorno_proyectado_30d_pct']:+.2f} %"} for t,w in p['pesos'].items() if w>=0.01]
        niveles.append(dict(nivel=nivel,origen='NSGA-II '+p['id'],descripcion={'Conservador':'Menor volatilidad del frente','Moderado':'Mayor Sharpe del frente','Agresivo':'Mayor retorno esperado del frente'}[nivel],restricciones='Tope 25 % por activo; solo elegibles declarados',detalle_activos=detalle,**{k:v for k,v in p.items() if k!='id'}))
    return {'fecha':fecha,'niveles':niveles}
