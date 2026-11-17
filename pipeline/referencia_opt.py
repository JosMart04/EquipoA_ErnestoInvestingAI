"""Referencia independiente de Markowitz; no importa ni ejecuta JavaScript."""
import argparse
import hashlib
import json
from pathlib import Path

import cvxpy as cp
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def generar():
    fuente = ROOT / "data/04_matriz_correlacion_covarianza.json"
    datos = json.loads(fuente.read_text(encoding="utf-8"))
    params = json.loads((ROOT / "data/07_optimizador_markowitz_nsga.json").read_text(encoding="utf-8"))
    tickers = datos["tickers"]
    mu = np.array(datos["retorno_esperado_anual_simulado"])
    cov = np.array(datos["covarianza_anual"])
    tope, rf = params["tope_peso_por_activo"], params["tasa_libre_riesgo"]
    if not np.allclose(cov, cov.T) or np.linalg.eigvalsh(cov).min() < 0:
        raise ValueError("La covarianza no es simétrica semidefinida positiva")
    w = cp.Variable(len(tickers))
    constraints = [cp.sum(w) == 1, w >= 0, w <= tope]
    variance = cp.quad_form(w, cov)

    def resolver(problem):
        problem.solve(solver="CLARABEL", tol_gap_abs=1e-11, tol_gap_rel=1e-11, tol_feas=1e-11)
        if problem.status != cp.OPTIMAL:
            raise ValueError(f"Optimizador: {problem.status}")
        weights = np.array(w.value)
        if abs(weights.sum() - 1) > 1e-8 or weights.min() < -1e-8 or weights.max() > tope + 1e-8:
            raise ValueError("Solución no factible")
        return weights

    minimo = resolver(cp.Problem(cp.Minimize(variance), constraints))
    maximo = resolver(cp.Problem(cp.Maximize(mu @ w), constraints))
    objetivos = np.linspace(mu @ minimo, mu @ maximo, 35)
    frontera = []
    for objetivo in objetivos:
        weights = resolver(cp.Problem(cp.Minimize(variance), constraints + [mu @ w >= objetivo]))
        if mu @ weights < objetivo - 1e-8:
            raise ValueError("Objetivo incumplido")
        frontera.append({
            "retorno_esperado_anual_pct": float(mu @ weights * 100),
            "volatilidad_anual_pct": float(np.sqrt(weights @ cov @ weights) * 100),
            "pesos": {t: float(v) for t, v in zip(tickers, weights)},
        })
    return {
        "tickers": tickers, "mu": mu.tolist(), "cov": cov.tolist(), "tope": tope, "rf": rf,
        "frontera": frontera,
        "procedencia": {
            "generador": "python -m pipeline.referencia_opt",
            "cvxpy": cp.__version__, "solver": "CLARABEL",
            "entrada": "data/04_matriz_correlacion_covarianza.json",
            "entrada_sha256": hashlib.sha256(fuente.read_bytes()).hexdigest(),
            "metodo": "min w.T @ cov @ w; sum(w)=1; 0<=w<=tope; mu@w>=objetivo; 35 objetivos entre mínima varianza y máximo retorno",
        },
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--salida", type=Path, default=ROOT / "tests/fixtures/opt_referencia.json")
    args = parser.parse_args()
    result = generar()
    args.salida.parent.mkdir(parents=True, exist_ok=True)
    args.salida.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8", newline="\n")
    print(f"{args.salida}: {len(result['frontera'])} puntos calculados con cvxpy")
