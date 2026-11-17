"""El archivo conserva candidatos evaluados sin cambiar la población."""
import unittest
from types import SimpleNamespace
import numpy as np
from pipeline.optimizador import ArchivoPareto

class Archivo(unittest.TestCase):
    def test_preserva_frente_historico_y_descarta_dominados_y_duplicados(self):
        archivo=ArchivoPareto()
        originales=[]
        for x,f in [([[0,1],[0.5,0.5],[1,0]],[[1,4],[3,3],[4,1]]),
                    ([[0.25,0.75],[0.75,0.25],[0,1]],[[2,2],[3,4],[1,4]])]:
            poblacion={'X':np.array(x),'F':np.array(f)}
            originales.append((poblacion,{k:v.copy() for k,v in poblacion.items()}))
            archivo.notify(SimpleNamespace(pop=poblacion))
        self.assertEqual(set(map(tuple,archivo.F)),{(1,4),(2,2),(4,1)})
        self.assertEqual(set(map(tuple,archivo.X)),{(0,1),(0.25,0.75),(1,0)})
        for real,copia in originales:
            for k in real:np.testing.assert_array_equal(real[k],copia[k])

if __name__=='__main__':unittest.main()
