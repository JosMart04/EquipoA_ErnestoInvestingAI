import json
from pathlib import Path
import shutil
import tempfile
import unittest
from tools.validar_contrato import validar,ROOT

class Contrato(unittest.TestCase):
    def test_profesor_y_discrepancia_literal(self):
        r=validar(ROOT/'data','profesor')
        self.assertEqual(r['R_REG_09_literal_incumple'],['MSFT','AMZN','META','TSLA','SPY'])
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
