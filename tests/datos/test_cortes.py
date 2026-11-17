"""D-03: doce cortes publicados y cada snapshot sometido al contrato."""
import json
from copy import deepcopy
from pathlib import Path
import shutil
import tempfile
import unittest
from tools.validar_contrato import ROOT,validar,validar_cortes

class Cortes(unittest.TestCase):
    def test_revision_de_precios_actuales_no_altera_la_version_del_snapshot(self):
        fuente=ROOT/'data_real'
        meta=json.loads((fuente/'meta.json').read_text(encoding='utf-8'))
        historia=json.loads((fuente/'cierres_historicos.json').read_text(encoding='utf-8'))
        revisada=deepcopy(historia)
        for t in revisada['cierres']:revisada['cierres'][t]=[p*1.01 for p in revisada['cierres'][t]]
        self.assertEqual(validar_cortes(fuente,list(historia['cierres']),revisada,meta),12)
        with tempfile.TemporaryDirectory() as tmp:
            destino=Path(tmp)/'publicacion';shutil.copytree(fuente,destino)
            indice=json.loads((destino/'cortes/index.json').read_text(encoding='utf-8'))
            archivo=destino/'cortes'/indice['cortes'][0]/'auditoria.json'
            audit=json.loads(archivo.read_text(encoding='utf-8'))
            audit['precios_validacion']['cierres']['AAPL'][-1]*=1.01
            archivo.write_text(json.dumps(audit),encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'Hash de precios'):validar_cortes(destino,list(historia['cierres']),historia,meta)
    def test_doce_meses_previos_y_rechazo_de_snapshot_corrupto(self):
        fuente=ROOT/'data_real'
        indice=json.loads((fuente/'cortes/index.json').read_text(encoding='utf-8'))
        historia=json.loads((fuente/'cierres_historicos.json').read_text(encoding='utf-8'))
        meses={f[:7]:f for f in historia['fechas'] if f[:7]<indice['ultimo'][:7]}
        self.assertEqual(indice['cortes'],list(meses.values())[-12:])
        self.assertEqual(len(indice['cortes']),12)
        for numero,alterar in [
            ('05',lambda d:d['predicciones']['AAPL']['modelos'][0].update(senal='NEUTRO')),
            ('06',lambda d:d['fechas_pronostico'].__setitem__(0,indice['cortes'][0])),
            ('07',lambda d:d['nsga2_elegibles'][0].update(pesos={'FUERA':1})),
            ('08',lambda d:d['niveles'][0].update(nivel='Alto')),
        ]:
            with self.subTest(archivo=numero),tempfile.TemporaryDirectory() as tmp:
                destino=Path(tmp)/'publicacion'
                shutil.copytree(fuente,destino)
                archivo=next((destino/'cortes'/indice['cortes'][0]).glob(numero+'_*.json'))
                datos=json.loads(archivo.read_text(encoding='utf-8'));alterar(datos)
                archivo.write_text(json.dumps(datos),encoding='utf-8')
                with self.assertRaises(ValueError):validar(destino,'real')

if __name__=='__main__':unittest.main()
