"""Regresiones desde las reglas temporales y financieras de la especificación."""
import unittest
import numpy as np
import pandas as pd
from pipeline.variables import construir,indices
from pipeline.optimizador import proyectar
from pipeline.backtesting import ejecutar

class Causalidad(unittest.TestCase):
    def datos(self,n=1100):
        rng=np.random.default_rng(2026);fechas=pd.bdate_range('2020-01-01',periods=n)
        ts=['SPY','QQQ','EPU','A','B'];p=pd.DataFrame(100*np.exp(np.cumsum(rng.normal(0.0002,0.01,(n,5)),axis=0)),index=fechas,columns=ts)
        u=[{'ticker':t,'grupo':str(i%4)} for i,t in enumerate(ts)]
        datos={t:pd.DataFrame({'c':p[t],'v':rng.integers(100,10000,n)},index=fechas) for t in ts}
        datos['^VIX']=pd.DataFrame({'c':20+np.sin(np.arange(n)/7)},index=fechas)
        return u,datos,p
    def test_umbrales_publicados_y_sentinela_no_financiero(self):
        from pipeline.mercado import pronosticos
        p=pd.DataFrame({'A':[100.]},index=pd.to_datetime(['2026-11-16']))
        for prob,confianza in [(0.5,'baja'),(0.54,'media'),(0.58,'alta'),(0.42,'alta')]:
            with self.subTest(prob=prob):
                base={'modelo':'fixture unitario','familia':'ML','metricas':{},'entrenamiento':{'missing':float('nan')}}
                r={'auditoria':{'tasa_base_sube':0.5},'clasificacion':[dict(base,actual=np.array([prob])) for _ in range(18)],'regresion':[dict(base,actual=np.zeros((1,30))) for _ in range(18)]}
                c,_=pronosticos(p,r,np.array([0.2]));v=c['predicciones']['A']
                self.assertEqual(v['confianza'],confianza)
                self.assertEqual(v['consenso'],'SUBE' if prob>=0.5 else 'BAJA')
                self.assertEqual(c['modelos'][0]['hiperparametros']['missing'],'nan')
    def test_variables_no_cambian_al_alterar_el_futuro(self):
        u,d,p=self.datos();x,y,_=construir(u,d,p)
        corte=800;p2=p.copy();p2.iloc[corte:]*=5
        d2={t:f.copy() for t,f in d.items()}
        for f in d2.values():f.iloc[corte:]*=7
        otro,_,_=construir(u,d2,p2)
        np.testing.assert_allclose(x[:corte],otro[:corte],equal_nan=True)
        self.assertAlmostEqual(float(y[700,0,29]),np.log(p.iloc[730,0]/p.iloc[700,0]),places=6)
    def test_embargo_por_fecha_para_todos_los_tickers(self):
        u,d,p=self.datos();x,y,_=construir(u,d,p);train,test,all_days,actual=indices(x,y)
        self.assertEqual(len(test),252)
        self.assertEqual(test[0]-train[-1]-1,30)
        self.assertLess(train[-1]+30,test[0])
        self.assertEqual(test[-1]+30,len(p)-1)
        self.assertEqual(actual.tolist(),[len(p)-1])
    def test_proyeccion_respeta_tope_y_presupuesto(self):
        w=proyectar(np.array([[100,-20,2,3,4],[0,0,0,0,0]]))
        np.testing.assert_allclose(w.sum(axis=1),1,atol=1e-10)
        self.assertTrue(((w>=0)&(w<=0.25)).all())
        with self.assertRaises(ValueError):proyectar(np.ones(3))
    def test_backtest_decide_con_historia_y_fecha_siguiente(self):
        _,_,p=self.datos(600);a=ejecutar(p)
        cambio=p.copy();cambio.iloc[-100:]*=np.linspace(1,2,100)[:,None];b=ejecutar(cambio)
        for nombre in a['carteras']:
            ra=a['carteras'][nombre]['rebalanceos'];rb=b['carteras'][nombre]['rebalanceos']
            self.assertEqual(len(ra),12)
            for j in range(7):self.assertEqual(ra[j],rb[j])
            self.assertEqual(ra[0]['fecha'],p.index[-252].date().isoformat())
        c=a['referencias']['Igual ponderado (1/N)']['curva']
        r=p.pct_change().iloc[-252:].mean(axis=1)
        np.testing.assert_allclose(c,100*np.r_[1,np.cumprod(1+r)],atol=1e-6)

if __name__=='__main__':unittest.main()
