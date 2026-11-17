import json
from copy import deepcopy
from pathlib import Path
import shutil
import tempfile
import unittest
from tools.validar_contrato import validar,validar_auditoria,validar_carteras,cargar,ROOT

class Contrato(unittest.TestCase):
    def test_profesor_y_discrepancia_literal(self):
        r=validar(ROOT/'data','profesor')
        self.assertEqual(r['R_REG_09_literal_incumple'],['MSFT','AMZN','META','TSLA','SPY'])
    def test_auditoria_verifica_sesiones_reales(self):
        r=ROOT/'data_real'
        fechas=json.loads((r/'cierres_historicos.json').read_text())['fechas']
        meta=json.loads((r/'meta.json').read_text())
        audit=meta['metodologia']['evaluacion']
        validar_auditoria(audit,fechas,meta['fecha_corte'])
        for campo in ['entrenamiento_fin','ultima_etiqueta_entrenamiento','prueba_inicio','prueba_fin','ultima_etiqueta_prueba','reentrenamiento_fin']:
            with self.subTest(campo=campo):
                corrupto=deepcopy(audit)
                corrupto[campo]=fechas[fechas.index(audit[campo])-1]
                with self.assertRaises(ValueError):validar_auditoria(corrupto,fechas,meta['fecha_corte'])
    def test_fronteras_reales_se_recalculan_desde_pesos_y_datos(self):
        d={n:cargar(ROOT/'data_real',n) for n in [1,2,4,5,6,7,8]}
        ts=[a['ticker'] for a in d[1]]
        validar_carteras(d,ts,'real')
        for campo in ['retorno_esperado_anual_pct','volatilidad_anual_pct','cvar95_diario_pct']:
            with self.subTest(campo=campo):
                corrupto=deepcopy(d)
                punto=corrupto[7]['markowitz_universo_completo'][0]
                punto[campo]+=1
                punto['sharpe']=(punto['retorno_esperado_anual_pct']-4)/punto['volatilidad_anual_pct']
                with self.assertRaises(ValueError):validar_carteras(corrupto,ts,'real')
    def test_rechaza_corrupcion_de_senal_mediana_y_pesos(self):
        for n,alterar in [
            ('05',lambda d:d['predicciones']['AAPL']['modelos'][0].update(senal='NEUTRO')),
            ('06',lambda d:d['predicciones']['AAPL']['ensamble_mediana'].__setitem__(0,1)),
            ('07',lambda d:d['markowitz_elegibles'][0]['pesos'].update(AAPL=0.9)),
        ]:
            with self.subTest(archivo=n),tempfile.TemporaryDirectory() as tmp:
                dest=Path(tmp)
                for p in (ROOT/'data').glob('*.json'):shutil.copyfile(p,dest/p.name)
                f=next(dest.glob(n+'_*.json'));d=json.loads(f.read_text());alterar(d);f.write_text(json.dumps(d))
                with self.assertRaises(ValueError):validar(dest,'profesor')

if __name__=='__main__':unittest.main()
