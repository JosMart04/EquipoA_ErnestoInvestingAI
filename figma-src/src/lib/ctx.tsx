import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Ruta =
  | "galeria" | "dashboard" | "watchlist" | "trading" | "leaderboard"
  | "clasificacion" | "regresion" | "optimizador" | "portafolios" | "backtesting";

export const MODULOS: { id: Ruta; es: string; en: string; nuevo?: boolean }[] = [
  { id: "dashboard", es: "Dashboard", en: "Dashboard" },
  { id: "watchlist", es: "Watchlist y alertas", en: "Watchlist & alerts" },
  { id: "trading", es: "Trading simulado", en: "Paper trading" },
  { id: "leaderboard", es: "Leaderboard", en: "Leaderboard" },
  { id: "clasificacion", es: "Clasificación", en: "Classification", nuevo: true },
  { id: "regresion", es: "Regresión 30 días", en: "30-day regression", nuevo: true },
  { id: "optimizador", es: "Optimizador", en: "Optimizer", nuevo: true },
  { id: "portafolios", es: "Portafolios", en: "Portfolios", nuevo: true },
  { id: "backtesting", es: "Backtesting", en: "Backtesting", nuevo: true },
];

type Idioma = "es-PE" | "en-US";
type Modo = "profesor" | "real";

interface Ctx {
  ruta: Ruta; ir: (r: Ruta, t?: string) => void; ticker: string | null;
  tema: "claro" | "oscuro"; setTema: (t: "claro" | "oscuro") => void;
  modo: Modo; setModo: (m: Modo) => void;
  idioma: Idioma; setIdioma: (i: Idioma) => void;
  a11yAbierto: boolean; setA11yAbierto: (v: boolean) => void;
  camara: "apagada" | "cabeza" | "manos"; setCamara: (c: "apagada" | "cabeza" | "manos") => void;
  t: (es: string, en: string) => string;
  fmt: { n: (x: number, d?: number) => string; pct: (x: number, d?: number, signo?: boolean) => string; usd: (x: number) => string; fecha: (iso: string) => string };
  colores: { ejes: string; rejilla: string; texto: string; serie: string[]; up: string; dn: string; ac: string };
}

const C = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(C);

function leerHash(): { ruta: Ruta; ticker: string | null } {
  const h = window.location.hash.replace(/^#\/?/, "");
  const [r, q] = h.split("?");
  const ruta = (["galeria", ...MODULOS.map((m) => m.id)].includes(r) ? r : "galeria") as Ruta;
  const t = new URLSearchParams(q || "").get("t");
  return { ruta, ticker: t };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const p = new URLSearchParams(window.location.search);
  const [{ ruta, ticker }, setNav] = useState(leerHash());
  const [tema, setTema] = useState<"claro" | "oscuro">(p.get("tema") === "oscuro" ? "oscuro" : "claro");
  const [modo, setModo] = useState<Modo>(p.get("modo") === "real" ? "real" : "profesor");
  const [idioma, setIdioma] = useState<Idioma>(p.get("lang") === "en" ? "en-US" : "es-PE");
  const [a11yAbierto, setA11yAbierto] = useState(false);
  const [camara, setCamara] = useState<"apagada" | "cabeza" | "manos">("apagada");

  useEffect(() => {
    const f = () => setNav(leerHash());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", tema === "oscuro"); }, [tema]);
  useEffect(() => { document.documentElement.lang = idioma === "es-PE" ? "es" : "en"; }, [idioma]);

  const valor = useMemo<Ctx>(() => {
    const nf = (d: number) => new Intl.NumberFormat(idioma, { minimumFractionDigits: d, maximumFractionDigits: d });
    const oscuro = tema === "oscuro";
    return {
      ruta, ticker,
      ir: (r, t) => { window.location.hash = "/" + r + (t ? "?t=" + t : ""); window.scrollTo(0, 0); },
      tema, setTema, modo, setModo, idioma, setIdioma, a11yAbierto, setA11yAbierto, camara, setCamara,
      t: (es, en) => (idioma === "es-PE" ? es : en),
      fmt: {
        n: (x, d = 2) => nf(d).format(x),
        pct: (x, d = 2, signo = false) => new Intl.NumberFormat(idioma, { style: "percent", minimumFractionDigits: d, maximumFractionDigits: d, signDisplay: signo ? "exceptZero" : "auto" }).format(x / 100),
        usd: (x) => new Intl.NumberFormat(idioma, { style: "currency", currency: "USD" }).format(x),
        fecha: (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Intl.DateTimeFormat(idioma, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso + "T12:00:00")) : iso === "inicio" ? (idioma === "es-PE" ? "Inicio" : "Start") : iso),
      },
      colores: {
        ejes: oscuro ? "#aab7c4" : "#4d5b6b", rejilla: oscuro ? "#2c3a49" : "#d3dce6", texto: oscuro ? "#e9eff5" : "#14202e",
        serie: oscuro ? ["#56B4E9", "#E69F00", "#2ECC9A", "#E08ABF", "#9ED0F0", "#FF8A4C"] : ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#56B4E9", "#D55E00"],
        up: oscuro ? "#52d18a" : "#0a7d3c", dn: oscuro ? "#ff8a80" : "#b3261e", ac: oscuro ? "#7db7ff" : "#0b4f9c",
      },
    };
  }, [ruta, ticker, tema, modo, idioma, a11yAbierto, camara]);

  return <C.Provider value={valor}>{children}</C.Provider>;
}

/** Nombre de grupo con tildes para mostrar (los datos vienen sin tildes; no se modifican) */
export const GRUPO: Record<string, [string, string]> = {
  "Magnificas 7": ["Magníficas 7", "Magnificent 7"],
  "Mineras con operaciones en Peru": ["Mineras con operaciones en Perú", "Miners operating in Peru"],
  "ETF sectoriales": ["ETF sectoriales", "Sector ETFs"],
  "ETF globales y Peru": ["ETF globales y Perú", "Global & Peru ETFs"],
};
export const MODELO_CORTO: Record<string, string> = {
  "Regresion logistica": "LogR", "SVC (kernel RBF)": "SVC", "k-vecinos (kNN)": "kNN", "Naive Bayes gaussiano": "NB",
  "Arbol de decision": "Árbol", "Random Forest": "RF", "Extra Trees": "ET", AdaBoost: "Ada", "Gradient Boosting": "GB",
  XGBoost: "XGB", LightGBM: "LGBM", "MLP (red densa)": "MLP", "RNN simple": "RNN", LSTM: "LSTM", GRU: "GRU",
  BiLSTM: "BiLSTM", "CNN 1D": "CNN", Transformer: "Trf", "Regresion lineal": "Lin", Ridge: "Ridge", Lasso: "Lasso",
  "Elastic Net": "EN", "SVR (RBF)": "SVR",
};
